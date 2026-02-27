import React, { useState, useMemo, useEffect } from 'react';
import {
  SafeAreaView, View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
  StyleSheet, StatusBar, Switch, TextInput,
} from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { requestNotificationPermissions } from './src/components/NotificationService';
import AuthScreen from './src/screens/AuthScreen';
import { useTodos, isTaskDone } from './src/hooks/useTodos';
import AddTodoForm from './src/components/AddTodoForm';
import TodoItem from './src/components/TodoItem';
import FilterBar from './src/components/FilterBar';

const GREEN = '#00875A';

// ─── Settings modal ────────────────────────────────────────────────────────

function SettingsModal({ visible, onClose }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const { signOut } = useAuth();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.settingsBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.settingsSheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={[styles.handle, { backgroundColor: theme.cardBorder }]} />
        <Text style={[styles.settingsTitle, { color: theme.text }]}>Settings</Text>

        {/* Dark / Light toggle */}
        <View style={[styles.settingsRow, { borderBottomColor: theme.cardBorder }]}>
          <View style={styles.settingsRowLeft}>
            <Text style={styles.settingsRowIcon}>{isDark ? '🌙' : '☀️'}</Text>
            <View>
              <Text style={[styles.settingsRowLabel, { color: theme.text }]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
              <Text style={[styles.settingsRowSub, { color: theme.textMuted }]}>
                Switch app appearance
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#dddde8', true: GREEN }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.settingsRow, { borderBottomColor: 'transparent' }]}
          onPress={async () => { onClose(); await signOut(); }}
        >
          <View style={styles.settingsRowLeft}>
            <Text style={styles.settingsRowIcon}>🚪</Text>
            <Text style={[styles.settingsRowLabel, { color: '#E5484D' }]}>Sign Out</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: GREEN }]}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main app ──────────────────────────────────────────────────────────────

function MainApp() {
  const { theme } = useTheme();
  const [filter, setFilter]             = useState('all');
  const [search, setSearch]             = useState('');
  const [modalMode, setModalMode]       = useState(null); // null | 'add' | 'edit'
  const [editingTodo, setEditingTodo]   = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving]         = useState(false);

  const {
    todos, loading, error,
    isOnline, pendingCount,
    addTodo, toggleTodo, updateTodo, deleteTodo, clearCompleted,
  } = useTodos();

  useEffect(() => { requestNotificationPermissions(); }, []);

  const now = new Date();

  const filtered = useMemo(() => {
    let result = todos;

    if (filter === 'not-started') result = result.filter((t) => !isTaskDone(t) && (t.status || 'not-started') === 'not-started');
    else if (filter === 'active')    result = result.filter((t) => !isTaskDone(t) && t.status === 'active');
    else if (filter === 'completed') result = result.filter((t) => isTaskDone(t));

    const q = search.trim().toLowerCase();
    if (q) result = result.filter((t) => t.text.toLowerCase().includes(q));

    return result;
  }, [todos, filter, search]);

  // Use isTaskDone() everywhere so both the boolean AND the status field are respected
  const activeCount    = todos.filter((t) => !isTaskDone(t)).length;
  const completedCount = todos.filter((t) =>  isTaskDone(t)).length;
  // Overdue = incomplete tasks whose due date has ACTUALLY passed
  const overdueCount   = todos.filter((t) => t.due_date && !isTaskDone(t) && new Date(t.due_date) < now).length;

  const openAdd    = () => { setEditingTodo(null); setModalMode('add'); };
  const openEdit   = (todo) => { setEditingTodo(todo); setModalMode('edit'); };
  const closeModal = () => { setModalMode(null); setEditingTodo(null); };

  const handleAdd = async (text, priority, status, dueDate) => {
    setIsSaving(true);
    try {
      await addTodo(text, priority, status, dueDate);
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };
  const handleUpdate = async (text, priority, status, dueDate) => {
    setIsSaving(true);
    try {
      await updateTodo(editingTodo.id, {
        text, priority, status,
        due_date: dueDate ? dueDate.toISOString() : null,
      });
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const isEdit = modalMode === 'edit';
  const FILTER_LABELS = { all: 'All', 'not-started': 'Not Started', active: 'Active', completed: 'Completed' };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={[styles.title, { color: GREEN }]}>◈ Taskastic</Text>
                  <Text style={[styles.subtitle, { color: theme.textMuted }]}>Stay focused. Get things done.</Text>
                </View>
                <TouchableOpacity
                  style={[styles.settingsBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                  onPress={() => setShowSettings(true)}
                >
                  <Text>⚙️</Text>
                </TouchableOpacity>
              </View>

              {/* Offline banner */}
              {!isOnline && (
                <View style={styles.offlineBar}>
                  <Text style={styles.offlineText}>
                    ☁️  You're offline — changes will sync when reconnected
                    {pendingCount > 0 ? ` (${pendingCount} pending)` : ''}
                  </Text>
                </View>
              )}

              {/* Pending-sync badge when back online but queue not yet flushed */}
              {isOnline && pendingCount > 0 && (
                <View style={styles.syncBar}>
                  <ActivityIndicator size="small" color={GREEN} style={{ marginRight: 6 }} />
                  <Text style={styles.syncText}>
                    Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}…
                  </Text>
                </View>
              )}

              {/* Overdue banner — only shows when tasks are actually past their due date */}
              {overdueCount > 0 && (
                <View style={styles.overdueBar}>
                  <Text style={styles.overdueText}>
                    ⚠️  {overdueCount} task{overdueCount !== 1 ? 's' : ''} past due
                  </Text>
                </View>
              )}
            </View>

            {/* Search bar */}
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.searchIcon, { color: theme.textMuted }]}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search tasks..."
                placeholderTextColor={theme.textMuted}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.searchClear, { color: theme.textMuted }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Filter tabs */}
            <FilterBar filter={filter} onFilter={setFilter} />

            {/* Stats row */}
            <View style={styles.stats}>
              <Text style={[styles.statsText, { color: theme.textMuted }]}>
                {activeCount} task{activeCount !== 1 ? 's' : ''} left
              </Text>
              {completedCount > 0 && (
                <TouchableOpacity onPress={clearCompleted}>
                  <Text style={[styles.clearBtn, { color: GREEN }]}>
                    Clear completed ({completedCount})
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}
            {loading && (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={GREEN} />
                <Text style={[styles.mutedText, { color: theme.textMuted }]}>Loading tasks...</Text>
              </View>
            )}
            {!loading && filtered.length === 0 && (
              <View style={styles.center}>
                <Text style={[styles.emptyIcon, { color: theme.textMuted }]}>✦</Text>
                <Text style={[styles.mutedText, { color: theme.textMuted }]}>
                  {search ? `No tasks matching "${search}"` :
                   filter === 'all' ? 'Tap + Add Task to get started!' :
                   `No ${FILTER_LABELS[filter]} tasks.`}
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <TodoItem todo={item} onToggle={toggleTodo} onDelete={deleteTodo} onEdit={openEdit} />
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>Add Task</Text>
      </TouchableOpacity>

      {/* Add / Edit modal — keyboard pushes sheet up */}
      <Modal visible={modalMode !== null} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: '#00000088' }} activeOpacity={1} onPress={closeModal} />
          <View style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.handle, { backgroundColor: theme.cardBorder }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {isEdit ? 'Edit Task' : 'New Task'}
            </Text>
            <AddTodoForm
              key={editingTodo?.id || 'new'}
              initialValues={isEdit ? editingTodo : null}
              submitLabel={isEdit ? 'Save Changes' : 'Add Task'}
              isEditMode={isEdit}
              onSubmit={isEdit ? handleUpdate : handleAdd}
              onClose={closeModal}
            />

            {/* Saving overlay — plain View so it shares the Modal's lifecycle (no nested Modal!) */}
            {isSaving && (
              <View style={styles.savingOverlay}>
                <View style={[styles.savingCard, { backgroundColor: theme.card }]}>
                  <ActivityIndicator size="large" color={GREEN} />
                  <Text style={[styles.savingText, { color: theme.textMuted }]}>Saving…</Text>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings */}
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
    </SafeAreaView>
  );
}

// ─── Root navigator ────────────────────────────────────────────────────────

function RootNavigator() {
  const { theme } = useTheme();
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
        <View style={styles.splashCenter}>
          <Text style={{ fontSize: 56, color: GREEN }}>◈</Text>
          <Text style={[styles.splashTitle, { color: GREEN }]}>Taskastic</Text>
          <ActivityIndicator color={GREEN} style={{ marginTop: 32 }} />
        </View>
      </SafeAreaView>
    );
  }
  return session ? <MainApp /> : <AuthScreen />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  list:    { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },

  header:    { marginBottom: 16, marginTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title:     { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle:  { fontSize: 13, marginTop: 3, fontWeight: '300', letterSpacing: 0.5 },

  settingsBtn: { padding: 10, borderRadius: 12, borderWidth: 1 },

  overdueBar:  { marginTop: 10, backgroundColor: '#E5484D18', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5484D44' },
  overdueText: { color: '#E5484D', fontSize: 13, fontWeight: '600' },

  offlineBar:  { marginTop: 10, backgroundColor: '#FF8B0018', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#FF8B0055' },
  offlineText: { color: '#CC6D00', fontSize: 13, fontWeight: '600' },

  syncBar:     { marginTop: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: GREEN + '14', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: GREEN + '44' },
  syncText:    { color: GREEN, fontSize: 13, fontWeight: '600' },

  // Search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 14,
  },
  searchIcon:  { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  searchClear: { fontSize: 14, fontWeight: '600' },

  stats:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 2 },
  statsText:{ fontSize: 13 },
  clearBtn: { fontSize: 13, fontWeight: '600' },

  errorBox:  { backgroundColor: '#E5484D18', borderWidth: 1, borderColor: '#E5484D44', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { color: '#E5484D', fontSize: 14 },
  center:    { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyIcon: { fontSize: 40, opacity: 0.3 },
  mutedText: { fontSize: 14 },

  fab: {
    position: 'absolute', bottom: 28, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GREEN, paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 50, shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
  },
  fabIcon: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 24 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    overflow: 'hidden',   // clips savingOverlay to rounded corners
  },

  // Saving overlay — absoluteFill inside modalSheet, not a separate Modal
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000055',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  savingCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 130,
  },
  savingText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },

  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },

  // Settings modal
  settingsBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000088' },
  settingsSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, gap: 4,
  },
  settingsTitle:    { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  settingsRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  settingsRowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsRowIcon:  { fontSize: 22 },
  settingsRowLabel: { fontSize: 15, fontWeight: '600' },
  settingsRowSub:   { fontSize: 12, marginTop: 2 },
  doneBtn:          { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  doneBtnText:      { fontSize: 15, fontWeight: '700', color: '#fff' },

  splashCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashTitle:  { fontSize: 36, fontWeight: '800', marginTop: 12, letterSpacing: -0.5 },
});
