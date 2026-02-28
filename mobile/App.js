import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  SafeAreaView, View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
  StyleSheet, StatusBar, Switch, TextInput, Animated, Easing,
  LayoutAnimation, UIManager, Dimensions, BackHandler, Keyboard,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { requestNotificationPermissions } from './src/components/NotificationService';
import AuthScreen from './src/screens/AuthScreen';
import { useTodos, isTaskDone } from './src/hooks/useTodos';
import AddTodoForm from './src/components/AddTodoForm';
import TodoItem from './src/components/TodoItem';
import FilterBar from './src/components/FilterBar';

const GREEN = '#00875A';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Smooth spinner ────────────────────────────────────────────────────────

function SmoothSpinner() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <View style={bannerStyles.spinnerRing} />
    </Animated.View>
  );
}

// ─── Header banner ─────────────────────────────────────────────────────────

function HeaderBanner({ activeCount, completedCount, overdueCount, onSettings, session, showPills }) {
  const { theme } = useTheme();
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good Morning', emoji: '🌤️' };
    if (h < 17) return { text: 'Good Afternoon', emoji: '☀️' };
    return { text: 'Good Evening', emoji: '🌙' };
  };
  const greeting = getGreeting();
  const name = session?.user?.user_metadata?.full_name?.split(' ')[0]
    || session?.user?.email?.split('@')[0]
    || 'there';

  return (
    <View style={bannerStyles.banner}>
      {/* Decorative overlay circles */}
      <View style={bannerStyles.circle1} />
      <View style={bannerStyles.circle2} />
      <View style={bannerStyles.circle3} />

      {/* Top row: greeting + settings */}
      <View style={bannerStyles.topRow}>
        <View>
          <Text style={bannerStyles.greeting}>{greeting.emoji}  {greeting.text}, {name}!</Text>
          <Text style={bannerStyles.appName}>◈ Taskastic</Text>
        </View>
        <TouchableOpacity
          style={[bannerStyles.settingsBtn, { backgroundColor: '#ffffff', borderColor: '#ffffff' }]}
          onPress={onSettings}
        >
          <Text style={{ fontSize: 18 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Stats pills — hidden when user scrolls down */}
      {showPills && (
        <View style={bannerStyles.pillsRow}>
          <View style={bannerStyles.pill}>
            <Text style={bannerStyles.pillNum}>{activeCount}</Text>
            <Text style={bannerStyles.pillLabel}>Pending</Text>
          </View>
          <View style={bannerStyles.pill}>
            <Text style={bannerStyles.pillNum}>{completedCount}</Text>
            <Text style={bannerStyles.pillLabel}>Done</Text>
          </View>
          {overdueCount > 0 ? (
            <View style={[bannerStyles.pill, bannerStyles.overduePill]}>
              <Text style={[bannerStyles.pillNum, { color: '#FFD6D6' }]}>{overdueCount}</Text>
              <Text style={[bannerStyles.pillLabel, { color: '#FFD6D6' }]}>Overdue</Text>
            </View>
          ) : (activeCount + completedCount > 0) ? (
            <View style={[bannerStyles.pill, bannerStyles.allDonePill]}>
              <Text style={[bannerStyles.pillNum, { color: '#C8FFE8' }]}>✓</Text>
              <Text style={[bannerStyles.pillLabel, { color: '#C8FFE8' }]}>On track</Text>
            </View>
          ) : (
            <View style={[bannerStyles.pill, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={[bannerStyles.pillNum, { color: 'rgba(255,255,255,0.55)' }]}>—</Text>
              <Text style={[bannerStyles.pillLabel, { color: 'rgba(255,255,255,0.55)' }]}>No tasks</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  banner: {
    backgroundColor: GREEN,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  // Decorative background circles
  circle1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -50, right: -40,
  },
  circle2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -30, left: 20,
  },
  circle3: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: 10, right: 90,
  },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 18,
  },
  greeting: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  appName:  { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  settingsBtn: {
    padding: 9, borderRadius: 12, borderWidth: 1,
  },
  pillsRow: { flexDirection: 'row', gap: 10 },
  pill: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  overduePill: { backgroundColor: 'rgba(229,72,77,0.25)', borderColor: 'rgba(255,100,100,0.4)' },
  allDonePill: { backgroundColor: 'rgba(0,200,100,0.2)', borderColor: 'rgba(100,255,180,0.35)' },
  pillNum:   { color: '#fff', fontSize: 18, fontWeight: '800' },
  pillLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Smooth spinner ring
  spinnerRing: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 3.5,
    borderColor: GREEN,
    borderTopColor: 'transparent',
  },
});

// ─── Settings modal ────────────────────────────────────────────────────────

function SettingsModal({ visible, onClose }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" hardwareAccelerated onRequestClose={onClose}>
      <TouchableOpacity style={styles.settingsBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.settingsSheet, { backgroundColor: theme.card, borderColor: theme.cardBorder, paddingBottom: insets.bottom + 20 }]}>
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
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [filter, setFilter]             = useState('all');
  const [search, setSearch]             = useState('');
  const [modalMode, setModalMode]       = useState(null); // null | 'add' | 'edit'
  const [editingTodo, setEditingTodo]   = useState(null);
  const [addFormInstance, setAddFormInstance] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [showPills, setShowPills] = useState(true);
  const pillsShown = useRef(true);

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

  const SHEET_OFFSET  = Dimensions.get('window').height;
  const slideAnim     = useRef(new Animated.Value(SHEET_OFFSET)).current;
  const keyboardAnim  = useRef(new Animated.Value(0)).current;

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, SHEET_OFFSET],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Slide sheet up when modal opens
  useEffect(() => {
    if (modalMode !== null) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [modalMode]);

  // Keyboard listeners — move sheet up/down as keyboard appears
  useEffect(() => {
    if (modalMode === null) return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardAnim, {
        toValue: -e.endCoordinates.height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [modalMode]);

  // Android back button closes sheet
  useEffect(() => {
    if (modalMode === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeModal();
      return true;
    });
    return () => sub.remove();
  }, [modalMode]);

  const openAdd  = () => {
    setEditingTodo(null);
    setAddFormInstance((n) => n + 1);
    setModalMode('add');
  };
  const openEdit = (todo) => { setEditingTodo(todo); setModalMode('edit'); };
  const closeModal = () => {
    Keyboard.dismiss();
    keyboardAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: SHEET_OFFSET,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setModalMode(null);
      setEditingTodo(null);
    });
  };

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
      <StatusBar barStyle={theme.statusBar} translucent backgroundColor="transparent" />

      {/* ── Fixed header area — never scrolls ── */}
      <View style={styles.fixedHeader}>
        <HeaderBanner
          activeCount={activeCount}
          completedCount={completedCount}
          overdueCount={overdueCount}
          onSettings={() => setShowSettings(true)}
          session={session}
          showPills={showPills}
        />

        {/* Offline banner */}
        {!isOnline && (
          <View style={styles.offlineBar}>
            <Text style={styles.offlineText}>
              ☁️  You're offline — changes will sync when reconnected
              {pendingCount > 0 ? ` (${pendingCount} pending)` : ''}
            </Text>
          </View>
        )}

        {/* Pending-sync badge */}
        {isOnline && pendingCount > 0 && (
          <View style={[styles.syncBar, { marginBottom: 12 }]}>
            <ActivityIndicator size="small" color={GREEN} style={{ marginRight: 6 }} />
            <Text style={styles.syncText}>
              Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}…
            </Text>
          </View>
        )}

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
          {(activeCount + completedCount > 0) && (
            <Text style={[styles.statsText, { color: theme.textMuted }]}>
              {activeCount} task{activeCount !== 1 ? 's' : ''} left
            </Text>
          )}
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
      </View>

      {/* ── Scrollable task list only ── */}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.taskContent}
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => {
          const shouldShow = e.nativeEvent.contentOffset.y < 50;
          if (shouldShow !== pillsShown.current) {
            pillsShown.current = shouldShow;
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowPills(shouldShow);
          }
        }}
        scrollEventThrottle={16}
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={GREEN} />
              <Text style={[styles.mutedText, { color: theme.textMuted }]}>Loading tasks...</Text>
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={[styles.emptyIcon, { color: theme.textMuted }]}>✦</Text>
              <Text style={[styles.mutedText, { color: theme.textMuted }]}>
                {search ? `No tasks matching "${search}"` :
                 filter === 'all' ? 'Tap + Add Task to get started!' :
                 `No ${FILTER_LABELS[filter]} tasks.`}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TodoItem todo={item} onToggle={toggleTodo} onDelete={deleteTodo} onEdit={openEdit} />
        )}
      />

      {/* Fixed footer */}
      <View style={[styles.footer, { backgroundColor: 'transparent', borderTopColor: 'transparent', paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.footerBtn} onPress={openAdd} activeOpacity={0.85}>
          <Text style={styles.fabIcon}>+</Text>
          <Text style={styles.fabText}>Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Backdrop — fades in with the sheet, non-interactive when hidden */}
      <Animated.View
        style={[styles.modalBackdrop, { opacity: backdropOpacity }]}
        pointerEvents={modalMode !== null ? 'auto' : 'none'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeModal} />
      </Animated.View>

      {/* Sheet — always mounted and off-screen, slides up on open + moves up with keyboard */}
      <Animated.View
        style={[styles.slideSheet, { transform: [{ translateY: Animated.add(slideAnim, keyboardAnim) }] }]}
        pointerEvents={modalMode !== null ? 'box-none' : 'none'}
      >
        <View style={styles.modalKAV}>
          <View style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.cardBorder, paddingBottom: insets.bottom + 20 }]}>
            <View style={[styles.handle, { backgroundColor: theme.cardBorder }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {isEdit ? 'Edit Task' : 'New Task'}
            </Text>
            <AddTodoForm
              key={isEdit ? `edit-${editingTodo?.id}` : `new-${addFormInstance}`}
              initialValues={isEdit ? editingTodo : null}
              submitLabel={isEdit ? 'Save Changes' : 'Add Task'}
              isEditMode={isEdit}
              onSubmit={isEdit ? handleUpdate : handleAdd}
              onClose={closeModal}
              autoFocus={modalMode !== null}
            />

            {/* Saving overlay */}
            {isSaving && (
              <View style={styles.savingOverlay}>
                <View style={[styles.savingCard, { backgroundColor: theme.card }]}>
                  <SmoothSpinner />
                  <Text style={[styles.savingText, { color: theme.textMuted }]}>Saving…</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

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
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0 },
  fixedHeader: { paddingHorizontal: 20, paddingTop: 20 },
  list:        { flex: 1 },
  taskContent: { paddingHorizontal: 20, paddingBottom: 24 },


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

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 0,
  },
  footerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GREEN, paddingTop: 14, paddingBottom: 11,
    borderRadius: 14,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  fabIcon: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 24 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  // Backdrop: absolute fill, opacity animated by slideAnim
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000088',
  },
  // Always-mounted sheet pinned to the bottom, slides via translateY
  slideSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  // KAV only wraps the sheet — justifyContent pushes it to the bottom
  modalKAV: {
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1,
    padding: 20,
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
    padding: 20, gap: 4,
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
