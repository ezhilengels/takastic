import React, { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, Text, StyleSheet,
  Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import DatePickerModal from './DatePickerModal';
import { useTheme } from '../context/ThemeContext';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../constants/twoTone';

const GREEN = '#00875A';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function pad(n) { return String(n).padStart(2, '0'); }
function formatDueDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function getOption(options, value) {
  return options.find((o) => o.value === value) || options[0];
}

// ─── Radio-style picker modal ────────────────────────────────────────────────
function PickerModal({ visible, title, options, selected, onSelect, onClose, theme }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.pickerSheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.pickerSheetTitle, { color: theme.text }]}>{title}</Text>
        {options.map((opt) => {
          const isSelected = selected === opt.value;
          const color = opt.color || theme.textMuted;
          const bg    = opt.bg    || theme.inputBg;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.pickerOption,
                {
                  backgroundColor: isSelected ? bg : theme.inputBg,
                  borderColor: isSelected ? color : theme.cardBorder,
                  borderWidth: isSelected ? 2 : 1.5,
                },
              ]}
              onPress={() => { onSelect(opt.value); onClose(); }}
              activeOpacity={0.75}
            >
              <View style={[
                styles.radioOuter,
                {
                  borderColor: isSelected ? color : theme.cardBorder,
                  borderWidth: isSelected ? 2 : 1.5,
                  backgroundColor: isSelected ? color + '20' : 'transparent',
                },
              ]}>
                {isSelected && <View style={[styles.radioDot, { backgroundColor: color }]} />}
              </View>
              <Text style={[
                styles.pickerOptionText,
                { color: isSelected ? color : theme.text },
                isSelected && { fontWeight: '800' },
              ]}>
                {opt.label}
              </Text>
              {isSelected && <Text style={[styles.pickerCheck, { color }]}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>
  );
}

// ─── Main form ───────────────────────────────────────────────────────────────
export default function AddTodoForm({
  onSubmit, onClose, initialValues, submitLabel = 'Add Task', isEditMode = false, autoFocus = false,
}) {
  const { theme } = useTheme();

  const [text, setText]         = useState(initialValues?.text || '');
  const [priority, setPriority] = useState(initialValues?.priority || 'medium');
  const [status, setStatus]     = useState(initialValues?.status || 'not-started');
  const [dueDate, setDueDate]   = useState(
    initialValues?.due_date ? new Date(initialValues.due_date) : null,
  );

  const [textError, setTextError]                   = useState('');
  const [submitError, setSubmitError]               = useState('');
  const [isSubmitting, setIsSubmitting]             = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker]     = useState(false);
  const [showDatePicker, setShowDatePicker]         = useState(false);

  const selPriority = getOption(PRIORITY_OPTIONS, priority);
  const selStatus   = getOption(STATUS_OPTIONS, status);

  const pColor = selPriority.color || theme.textMuted;
  const pBg    = selPriority.bg    || theme.inputBg;
  const sColor = selStatus.color   || theme.textMuted;
  const sBg    = selStatus.bg      || theme.inputBg;

  const isCompletedStatus = status === 'completed';

  const handleSubmit = async () => {
    if (!text.trim()) { setTextError('Task name is required.'); return; }
    setTextError('');
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await onSubmit(text.trim(), priority, status, dueDate);
    } catch (err) {
      setSubmitError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dueDateActive    = !!dueDate && !isCompletedStatus;
  const dueDateBorderC   = dueDateActive ? GREEN : theme.cardBorder;
  const dueDateBg        = dueDateActive ? GREEN + '15' : theme.inputBg;
  const dueDateTextColor = dueDate
    ? (isCompletedStatus ? theme.textMuted : GREEN)
    : theme.textMuted;

  // No wrapper View — return ScrollView directly so the parent (modalSheet)
  // can size it naturally. No flex:1 that collapses inside content-wrapping parents.
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.form}
    >
      {/* API error banner */}
      {!!submitError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>⚠️  {submitError}</Text>
          <TouchableOpacity
            onPress={() => setSubmitError('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.errorBoxDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Task name */}
      <View>
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.inputBg,
            borderColor: textError ? '#E5484D' : theme.cardBorder,
            color: theme.text,
          }]}
          value={text}
          onChangeText={(v) => { setText(v); if (v.trim()) setTextError(''); }}
          placeholder="What needs to be done?"
          placeholderTextColor={theme.textMuted}
          returnKeyType="done"
          autoFocus={autoFocus}
          editable={!isSubmitting}
        />
        {!!textError && <Text style={styles.fieldError}>⚠️ {textError}</Text>}
      </View>

      {/* Priority + Status row */}
      <View style={styles.row}>
        <View style={styles.selectorGroup}>
          <Text style={[styles.selectorLabel, { color: theme.textMuted }]}>PRIORITY</Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: pBg, borderColor: pColor, borderWidth: 1.5 }]}
            onPress={() => setShowPriorityPicker(true)}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            <Text style={[styles.selectorText, { color: pColor }]}>{selPriority.label}</Text>
            <Text style={[styles.chevron, { color: pColor }]}>▾</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.selectorGroup}>
          <Text style={[styles.selectorLabel, { color: theme.textMuted }]}>STATUS</Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: sBg, borderColor: sColor, borderWidth: 1.5 }]}
            onPress={() => setShowStatusPicker(true)}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            <Text style={[styles.selectorText, { color: sColor }]}>{selStatus.label}</Text>
            <Text style={[styles.chevron, { color: sColor }]}>▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Due date */}
      <View>
        <Text style={[styles.selectorLabel, { color: theme.textMuted }]}>
          {isCompletedStatus ? 'DUE DATE  (not applicable for completed)' : 'DUE DATE & REMINDER  (optional)'}
        </Text>
        <TouchableOpacity
          style={[styles.selector, {
            backgroundColor: dueDateBg,
            borderColor: dueDateBorderC,
            borderWidth: 1.5,
            opacity: isCompletedStatus ? 0.45 : 1,
          }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={isCompletedStatus ? 1 : 0.8}
          disabled={isSubmitting || isCompletedStatus}
        >
          <Text style={[styles.selectorText, { color: dueDateTextColor }]}>
            {dueDate ? `🔔  ${formatDueDate(dueDate)}` : '📅  Set a reminder date…'}
          </Text>
          <Text style={[styles.chevron, { color: dueDateTextColor }]}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* ── Buttons — stacked so submit is always full-width in both add & edit ── */}
      {/* Submit: identical green button whether "Add Task" or "Save Changes"    */}
      <TouchableOpacity
        style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
        onPress={handleSubmit}
        activeOpacity={0.85}
        disabled={isSubmitting}
      >
        {isSubmitting
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.submitBtnText}>{submitLabel}</Text>
        }
      </TouchableOpacity>

      {/* Cancel — only shown in add mode; edit mode uses backdrop tap */}
      {!isEditMode && onClose && (
        <TouchableOpacity
          style={[
            styles.cancelBtn,
            {
              backgroundColor: theme.secondaryBg,
              borderColor:     theme.secondaryBorder,
            },
          ]}
          onPress={onClose}
          activeOpacity={0.75}
          disabled={isSubmitting}
        >
          <Text style={[styles.cancelBtnText, { color: theme.secondaryText }]}>Cancel</Text>
        </TouchableOpacity>
      )}

      {/* Pickers */}
      <PickerModal
        visible={showPriorityPicker} title="Select Priority"
        options={PRIORITY_OPTIONS} selected={priority}
        onSelect={setPriority} onClose={() => setShowPriorityPicker(false)} theme={theme}
      />
      <PickerModal
        visible={showStatusPicker} title="Select Status"
        options={STATUS_OPTIONS} selected={status}
        onSelect={setStatus} onClose={() => setShowStatusPicker(false)} theme={theme}
      />
      <DatePickerModal
        visible={showDatePicker} value={dueDate}
        onConfirm={(d) => { setDueDate(d); setShowDatePicker(false); }}
        onClear={() => { setDueDate(null); setShowDatePicker(false); }}
        onClose={() => setShowDatePicker(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form:       { gap: 14, paddingBottom: 8 },
  fieldError: { color: '#E5484D', fontSize: 12, marginTop: 4, marginLeft: 2 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#E5484D12', borderWidth: 1.5, borderColor: '#E5484D66',
    borderRadius: 10, padding: 12, gap: 10,
  },
  errorBoxText:    { color: '#E5484D', fontSize: 13, fontWeight: '600', flex: 1 },
  errorBoxDismiss: { color: '#E5484D', fontSize: 16, fontWeight: '700' },

  input: {
    borderWidth: 1.5, borderRadius: 10, fontSize: 16,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  row:           { flexDirection: 'row', gap: 10 },
  selectorGroup: { flex: 1, gap: 6 },
  selectorLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10,
  },
  selectorText: { fontSize: 13, fontWeight: '700', flex: 1 },
  chevron:      { fontSize: 14, marginLeft: 4 },

  // ── Submit — full width, same look in both add & edit mode ─────────────────
  submitBtn: {
    borderRadius: 12, paddingVertical: 15, alignItems: 'center',
    backgroundColor: GREEN,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  // ── Cancel — below submit, add mode only ───────────────────────────────────
  cancelBtn: {
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    borderWidth: 1.5,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },

  // ── Picker modal ─────────────────────────────────────────────────────────────
  pickerBackdrop: { flex: 1, backgroundColor: '#00000088' },
  pickerSheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1,
    padding: 20, paddingBottom: 36, gap: 10,
  },
  pickerSheetTitle: {
    fontSize: 13, fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: 1.2, marginBottom: 4,
  },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, gap: 12,
  },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot:         { width: 10, height: 10, borderRadius: 5 },
  pickerOptionText: { fontSize: 15, fontWeight: '600', flex: 1 },
  pickerCheck:      { fontSize: 16, fontWeight: '900' },
});
