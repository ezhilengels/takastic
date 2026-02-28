import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '../constants/twoTone';

const GREEN = '#00875A';
const AMBER = '#FFAB00';
const RED   = '#E5484D';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function pad(n) { return String(n).padStart(2, '0'); }

function formatDueDate(iso) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDueDateStatus(iso) {
  const diff = new Date(iso) - new Date();
  if (diff < 0)        return 'overdue';   // current time has passed due time → RED
  if (diff < 3600000)  return 'imminent';  // < 1 hr left → AMBER (not yet overdue)
  if (diff < 86400000) return 'today';     // < 24 hrs left → AMBER
  return 'upcoming';                       // future → GREEN
}

function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  const { theme } = useTheme();

  const rawP = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
  const rawS = STATUS_CONFIG[todo.status || 'not-started'];
  const p = { ...rawP, color: rawP.color || theme.textMuted, bg: rawP.bg || theme.inputBg };
  const s = { ...rawS, color: rawS.color || theme.textMuted, bg: rawS.bg || theme.inputBg };

  // A task is done if EITHER the boolean OR the status field says so.
  // This guards against them being out of sync (e.g. legacy data or a partial write).
  const isCompleted = !!todo.completed || todo.status === 'completed';
  const hasDueDate  = !!todo.due_date;

  // Due-date status is ONLY evaluated for incomplete tasks.
  // Completed tasks never show overdue/imminent/today — their due date is irrelevant.
  const dueStatus = hasDueDate && !isCompleted ? getDueDateStatus(todo.due_date) : null;

  // Red ONLY after due time is crossed. Imminent/today → amber warning.
  const dueBadgeColor =
    dueStatus === 'overdue'  ? RED   :
    dueStatus === 'imminent' ? AMBER :
    dueStatus === 'today'    ? AMBER :
    GREEN;

  // ── Completed tasks use View (zero edit affordance), active tasks use TouchableOpacity ──
  const CardContainer   = isCompleted ? View : TouchableOpacity;
  const cardExtraProps  = isCompleted
    ? {}
    : { onPress: () => onEdit(todo), activeOpacity: 0.82 };

  // ── Card visual style ──────────────────────────────────────────────────────
  // Completed  → pleasant green tint, green border, no red regardless of due date
  // Overdue    → red-tinted border (only on incomplete tasks)
  // Normal     → default card/border from theme
  const cardStyle = isCompleted
    ? [styles.item, styles.itemDone, { borderColor: GREEN + '55' }]
    : [
        styles.item,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
        dueStatus === 'overdue' && styles.itemOverdue,
      ];

  return (
    <CardContainer style={cardStyle} {...cardExtraProps}>

      {/* Checkbox ─ always tappable to toggle completion */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          { borderColor: isCompleted ? GREEN : theme.checkboxBorder, borderWidth: 2 },
          isCompleted && styles.checkboxDone,
        ]}
        onPress={() => onToggle(todo.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {isCompleted && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      {/* Body */}
      <View style={styles.body}>
        <Text style={[
          styles.todoText,
          { color: isCompleted ? theme.textMuted : theme.text },
          isCompleted && styles.todoTextDone,
        ]}>
          {todo.text}
        </Text>

        {/* Priority / Status badges */}
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: p.bg, borderColor: p.color, borderWidth: 1 }]}>
            <Text style={[styles.badgeText, { color: p.color }]}>{p.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.color, borderWidth: 1 }]}>
            <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
          </View>
        </View>

        {/* Due-date badge — HIDDEN once task is completed */}
        {hasDueDate && !isCompleted && (
          <View style={[
            styles.dueBadge,
            {
              backgroundColor: dueBadgeColor + '18',
              borderColor: dueBadgeColor,
              borderWidth: dueStatus === 'overdue' ? 1.5 : 1,
            },
          ]}>
            <Text style={[styles.dueText, { color: dueBadgeColor }]}>
              {dueStatus === 'overdue'  ? '⚠️  Overdue · '  :
               dueStatus === 'imminent' ? '🔔  Due soon · ' :
               dueStatus === 'today'    ? '🔔  Today · '    :
               '📅  '}
              {formatDueDate(todo.due_date)}
            </Text>
          </View>
        )}

        {/* "Completed" label shown in place of due-date badge */}
        {isCompleted && (
          <View style={styles.doneLabel}>
            <Text style={styles.doneLabelText}>✓  Done</Text>
          </View>
        )}
      </View>

      {/* Delete — always accessible */}
      <TouchableOpacity
        style={[
          styles.deleteBtn,
          { backgroundColor: isCompleted ? GREEN + '15' : theme.inputBg },
        ]}
        onPress={() => onDelete(todo.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>

    </CardContainer>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 14, borderWidth: 1, padding: 14, gap: 12, marginBottom: 8,
  },

  // ── Completed card: soft green tint, no red border ever ───────────────────
  itemDone: {
    backgroundColor: GREEN + '0C',   // very subtle green wash
    borderWidth: 1.5,
  },

  // ── Overdue card: red border accent (incomplete tasks only) ───────────────
  itemOverdue: {
    borderColor: RED + '77',
    borderWidth: 1.5,
  },

  // ── Checkbox ──────────────────────────────────────────────────────────────
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // ── Body ──────────────────────────────────────────────────────────────────
  body:     { flex: 1, gap: 8 },
  todoText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  todoTextDone: { textDecorationLine: 'line-through' },

  badges:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge:     { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  // Due-date row (incomplete tasks)
  dueBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  dueText:  { fontSize: 12, fontWeight: '600' },

  // "Done" label shown on completed tasks instead of due-date badge
  doneLabel: {
    alignSelf: 'flex-start',
    backgroundColor: GREEN + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: GREEN + '44',
  },
  doneLabelText: { fontSize: 11, fontWeight: '700', color: GREEN, letterSpacing: 0.3 },

  // ── Delete button ─────────────────────────────────────────────────────────
  deleteBtn:  { padding: 8, borderRadius: 8, marginTop: 1 },
  deleteIcon: { fontSize: 15 },
});

export default memo(TodoItem);
