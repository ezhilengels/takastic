import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const GREEN   = '#00875A';
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const HOURS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);   // 0 – 59, full granularity

function range(s, e) { const a = []; for (let i = s; i <= e; i++) a.push(i); return a; }
function pad(n) { return String(n).padStart(2, '0'); }

export default function DatePickerModal({ visible, value, onConfirm, onClear, onClose }) {
  const { theme } = useTheme();
  const now     = new Date();
  const initial = value ? new Date(value) : new Date(now.getTime() + 3600000);

  const [month, setMonth] = useState(initial.getMonth());
  const [day,   setDay]   = useState(initial.getDate());
  const [year,  setYear]  = useState(initial.getFullYear());
  const [hour,  setHour]  = useState(initial.getHours());
  const [min,   setMin]   = useState(initial.getMinutes());   // exact minute

  useEffect(() => {
    const d = value ? new Date(value) : new Date(now.getTime() + 3600000);
    setMonth(d.getMonth());
    setDay(d.getDate());
    setYear(d.getFullYear());
    setHour(d.getHours());
    setMin(d.getMinutes());
  }, [value, visible]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const years = range(now.getFullYear(), now.getFullYear() + 5);

  const handleConfirm = () => {
    onConfirm(new Date(year, month, Math.min(day, daysInMonth), hour, min, 0));
  };

  function Col({ label, items, selected, onSelect, fmt }) {
    return (
      <View style={styles.col}>
        <Text style={[styles.colLabel, { color: theme.textMuted }]}>{label}</Text>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {items.map((item) => {
            const active = item === selected;
            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.colItem,
                  active && { backgroundColor: GREEN + '25', borderWidth: 1, borderColor: GREEN + '60' },
                ]}
                onPress={() => onSelect(item)}
              >
                <Text style={[
                  styles.colItemText,
                  { color: active ? GREEN : theme.textMuted },
                  active && { fontWeight: '800' },
                ]}>
                  {fmt ? fmt(item) : item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.title, { color: theme.textMuted }]}>Set Due Date & Time</Text>
        <View style={styles.picker}>
          <Col label="MON"  items={MONTHS.map((_,i) => i)} selected={month} onSelect={setMonth} fmt={(i) => MONTHS[i]} />
          <Col label="DAY"  items={range(1, daysInMonth)}  selected={day}   onSelect={setDay}   fmt={pad} />
          <Col label="YEAR" items={years}                  selected={year}  onSelect={setYear} />
          <Col label="HR"   items={HOURS}                  selected={hour}  onSelect={setHour}  fmt={pad} />
          <Col label="MIN"  items={MINUTES}                selected={min}   onSelect={setMin}   fmt={pad} />
        </View>
        <View style={[styles.preview, { backgroundColor: GREEN + '15', borderColor: GREEN + '30', borderWidth: 1 }]}>
          <Text style={[styles.previewText, { color: GREEN }]}>
            {MONTHS[month]} {pad(Math.min(day, daysInMonth))}, {year}  ·  {pad(hour)}:{pad(min)}
          </Text>
        </View>
        <View style={styles.btnRow}>
          {onClear && (
            <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]} onPress={onClose}>
            <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000088' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  title:       { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, textAlign: 'center' },
  picker:      { flexDirection: 'row', gap: 4, height: 180 },
  col:         { flex: 1, alignItems: 'center' },
  colLabel:    { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  scroll:      { flex: 1, width: '100%' },
  colItem:     { paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', marginBottom: 2 },
  colItemText: { fontSize: 13, fontWeight: '500' },
  preview:     { marginTop: 12, alignItems: 'center', borderRadius: 10, paddingVertical: 10 },
  previewText: { fontSize: 15, fontWeight: '700' },
  btnRow:      { flexDirection: 'row', gap: 8, marginTop: 14 },
  clearBtn:    { flex: 1, backgroundColor: '#ff4d4d18', borderRadius: 10, borderWidth: 1, borderColor: '#ff4d4d66', paddingVertical: 12, alignItems: 'center' },
  clearBtnText:   { color: '#ff4d4d', fontSize: 13, fontWeight: '700' },
  cancelBtn:      { flex: 1, borderRadius: 10, borderWidth: 1.5, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText:  { fontSize: 14, fontWeight: '600' },
  confirmBtn:     { flex: 2, backgroundColor: GREEN, borderRadius: 10, paddingVertical: 12, alignItems: 'center', shadowColor: GREEN, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
