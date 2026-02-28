import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const GREEN     = '#00875A';
const SCREEN_W  = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_W - 40 - 12) / 7);

const FULL_MONTHS  = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEK_DAYS    = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function pad(n) { return String(n).padStart(2, '0'); }

function buildCells(year, month) {
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, type: 'prev' });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, type: 'cur' });
  const rem = 42 - cells.length;
  for (let d = 1; d <= rem; d++)
    cells.push({ day: d, type: 'next' });
  return cells;
}

// Returns the real Date for any cell regardless of type
function getCellDate(cell, viewYear, viewMonth) {
  if (cell.type === 'prev') {
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    return new Date(y, m, cell.day);
  }
  if (cell.type === 'next') {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    return new Date(y, m, cell.day);
  }
  return new Date(viewYear, viewMonth, cell.day);
}

// ── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({ value, label, onInc, onDec, theme, disableDec }) {
  return (
    <View style={s.stepperWrap}>
      <Text style={[s.stepperLabel, { color: theme.textMuted }]}>{label}</Text>
      <TouchableOpacity
        style={[s.stepBtn, { backgroundColor: theme.inputBg }]}
        onPress={onInc} activeOpacity={0.7}
      >
        <Text style={[s.stepArrow, { color: theme.text }]}>▲</Text>
      </TouchableOpacity>
      <View style={[s.stepValueBox, { backgroundColor: GREEN + '15', borderColor: GREEN + '40' }]}>
        <Text style={[s.stepValue, { color: GREEN }]}>{pad(value)}</Text>
      </View>
      <TouchableOpacity
        style={[s.stepBtn, { backgroundColor: theme.inputBg, opacity: disableDec ? 0.35 : 1 }]}
        onPress={disableDec ? undefined : onDec}
        activeOpacity={disableDec ? 1 : 0.7}
      >
        <Text style={[s.stepArrow, { color: theme.text }]}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function DatePickerModal({ visible, value, onConfirm, onClear, onClose }) {
  const insets    = useSafeAreaInsets();
  const { theme } = useTheme();

  // Refresh `now` each time modal opens so it's accurate
  const [now] = useState(() => new Date());
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const initial = value ? new Date(value) : new Date(now.getTime() + 3_600_000);

  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [selDay,    setSelDay]    = useState(initial.getDate());
  const [selMonth,  setSelMonth]  = useState(initial.getMonth());
  const [selYear,   setSelYear]   = useState(initial.getFullYear());
  const [hour,      setHour]      = useState(initial.getHours());
  const [min,       setMin]       = useState(initial.getMinutes());

  // Reset state when modal opens
  useEffect(() => {
    const freshNow = new Date();
    const d = value ? new Date(value) : new Date(freshNow.getTime() + 3_600_000);
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
    setSelDay(d.getDate());
    setSelMonth(d.getMonth());
    setSelYear(d.getFullYear());
    setHour(d.getHours());
    setMin(d.getMinutes());
  }, [value, visible]);

  // Auto-correct time when selected date changes to today
  useEffect(() => {
    const freshNow = new Date();
    const isSelToday =
      selYear  === freshNow.getFullYear() &&
      selMonth === freshNow.getMonth()    &&
      selDay   === freshNow.getDate();

    if (!isSelToday) return;

    // If current time is in the past, snap forward to now + 5 min
    const isPastTime = hour < freshNow.getHours() ||
      (hour === freshNow.getHours() && min <= freshNow.getMinutes());

    if (isPastTime) {
      let newMin  = freshNow.getMinutes() + 5;
      let newHour = freshNow.getHours();
      if (newMin >= 60) { newMin -= 60; newHour += 1; }
      if (newHour >= 24) { newHour = 23; newMin = 59; }
      setHour(newHour);
      setMin(newMin);
    }
  }, [selDay, selMonth, selYear]);

  const cells = buildCells(viewYear, viewMonth);

  // Is the selected date today?
  const freshNow = new Date();
  const isSelToday =
    selYear  === freshNow.getFullYear() &&
    selMonth === freshNow.getMonth()    &&
    selDay   === freshNow.getDate();

  // Min allowed hour/min when on today
  const minHour = isSelToday ? freshNow.getHours() : 0;
  const minMin  = (isSelToday && hour === freshNow.getHours()) ? freshNow.getMinutes() + 1 : 0;

  const prevMonth = () => {
    // Don't navigate to a month fully in the past
    const targetMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const targetYear  = viewMonth === 0 ? viewYear - 1 : viewYear;
    const lastDayOfTarget = new Date(targetYear, targetMonth + 1, 0);
    if (lastDayOfTarget < todayStart) return;
    setViewMonth(targetMonth);
    setViewYear(targetYear);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const pickDay = (cell) => {
    const cellDate = getCellDate(cell, viewYear, viewMonth);
    if (cellDate < todayStart) return; // block past dates

    if (cell.type === 'prev') {
      const nm = viewMonth === 0 ? 11 : viewMonth - 1;
      const ny = viewMonth === 0 ? viewYear - 1 : viewYear;
      setSelDay(cell.day); setSelMonth(nm); setSelYear(ny);
      setViewMonth(nm); setViewYear(ny);
    } else if (cell.type === 'next') {
      const nm = viewMonth === 11 ? 0 : viewMonth + 1;
      const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
      setSelDay(cell.day); setSelMonth(nm); setSelYear(ny);
      setViewMonth(nm); setViewYear(ny);
    } else {
      setSelDay(cell.day); setSelMonth(viewMonth); setSelYear(viewYear);
    }
  };

  const changeHour = (delta) => {
    setHour(h => {
      const next = (h + delta + 24) % 24;
      return next < minHour ? minHour : next;
    });
  };

  const changeMin = (delta) => {
    setMin(m => {
      const next = (m + delta + 60) % 60;
      return next < minMin ? minMin : next;
    });
  };

  const isSel   = (cell) => cell.type === 'cur' && cell.day === selDay && viewMonth === selMonth && viewYear === selYear;
  const isTodayCell = (cell) => cell.type === 'cur' && cell.day === freshNow.getDate() && viewMonth === freshNow.getMonth() && viewYear === freshNow.getFullYear();
  const isPast  = (cell) => getCellDate(cell, viewYear, viewMonth) < todayStart;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={[s.sheet, { backgroundColor: theme.card, borderColor: theme.cardBorder, paddingBottom: insets.bottom + 16 }]}>

        <View style={[s.handle, { backgroundColor: theme.cardBorder }]} />

        {/* ── Month navigation ── */}
        <View style={s.navRow}>
          <TouchableOpacity
            style={[s.navBtn, { backgroundColor: theme.inputBg }]}
            onPress={prevMonth} activeOpacity={0.7}
          >
            <Text style={[s.navArrow, { color: theme.text }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[s.navTitle, { color: theme.text }]}>
            {FULL_MONTHS[viewMonth]}  {viewYear}
          </Text>
          <TouchableOpacity
            style={[s.navBtn, { backgroundColor: theme.inputBg }]}
            onPress={nextMonth} activeOpacity={0.7}
          >
            <Text style={[s.navArrow, { color: theme.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Week day headers ── */}
        <View style={s.weekRow}>
          {WEEK_DAYS.map(d => (
            <Text key={d} style={[s.weekDay, { color: theme.textMuted, width: CELL_SIZE }]}>{d}</Text>
          ))}
        </View>

        {/* ── Calendar grid ── */}
        <View style={s.grid}>
          {cells.map((cell, i) => {
            const sel      = isSel(cell);
            const today    = isTodayCell(cell);
            const past     = isPast(cell);
            const otherMon = cell.type !== 'cur';
            return (
              <TouchableOpacity
                key={i}
                style={[
                  s.cell,
                  { width: CELL_SIZE, height: CELL_SIZE },
                  sel  && { backgroundColor: GREEN, borderRadius: CELL_SIZE / 2 },
                  today && !sel && { borderWidth: 1.5, borderColor: GREEN, borderRadius: CELL_SIZE / 2 },
                ]}
                onPress={() => pickDay(cell)}
                activeOpacity={past ? 1 : 0.7}
                disabled={past}
              >
                <Text style={[
                  s.cellText,
                  { color: past || otherMon ? theme.textMuted + '33' : theme.text },
                  sel   && { color: '#fff', fontWeight: '800' },
                  today && !sel && { color: GREEN, fontWeight: '700' },
                ]}>
                  {cell.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Divider ── */}
        <View style={[s.divider, { backgroundColor: theme.cardBorder }]} />

        {/* ── Time picker ── */}
        <View style={s.timeRow}>
          <Text style={[s.timeLabel, { color: theme.textMuted }]}>Set Time</Text>
          <View style={s.steppers}>
            <Stepper
              label="Hour" value={hour} theme={theme}
              onInc={() => changeHour(1)}
              onDec={() => changeHour(-1)}
              disableDec={hour <= minHour}
            />
            <Text style={[s.colon, { color: theme.text }]}>:</Text>
            <Stepper
              label="Min" value={min} theme={theme}
              onInc={() => changeMin(1)}
              onDec={() => changeMin(-1)}
              disableDec={min <= minMin}
            />
          </View>
        </View>

        {/* ── Preview ── */}
        <View style={[s.preview, { backgroundColor: GREEN + '12', borderColor: GREEN + '35', borderWidth: 1 }]}>
          <Text style={[s.previewText, { color: GREEN }]}>
            📅  {SHORT_MONTHS[selMonth]} {pad(selDay)}, {selYear}   ·   {pad(hour)}:{pad(min)}
          </Text>
        </View>

        {/* ── Buttons ── */}
        <View style={s.btnRow}>
          {onClear && (
            <TouchableOpacity style={s.clearBtn} onPress={onClear}>
              <Text style={s.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.cancelBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
            onPress={onClose}
          >
            <Text style={[s.cancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.confirmBtn}
            onPress={() => onConfirm(new Date(selYear, selMonth, selDay, hour, min, 0))}
          >
            <Text style={s.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000088' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },

  navRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 22, fontWeight: '600', marginTop: -2 },
  navTitle: { fontSize: 16, fontWeight: '700' },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  weekDay: { textAlign: 'center', fontSize: 11, fontWeight: '700' },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4 },
  cell:     { alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cellText: { fontSize: 13, fontWeight: '500' },

  divider: { height: 1, marginVertical: 14 },

  timeRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  timeLabel: { fontSize: 13, fontWeight: '700' },
  steppers:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colon:     { fontSize: 22, fontWeight: '700', marginBottom: 4 },

  stepperWrap:  { alignItems: 'center', gap: 4 },
  stepperLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  stepBtn:      { width: 36, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepArrow:    { fontSize: 11, fontWeight: '700' },
  stepValueBox: { width: 52, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue:    { fontSize: 20, fontWeight: '800' },

  preview:     { borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginBottom: 14 },
  previewText: { fontSize: 14, fontWeight: '700' },

  btnRow:         { flexDirection: 'row', gap: 8 },
  clearBtn:       { flex: 1, backgroundColor: '#ff4d4d18', borderRadius: 12, borderWidth: 1, borderColor: '#ff4d4d66', paddingVertical: 13, alignItems: 'center' },
  clearBtnText:   { color: '#ff4d4d', fontSize: 13, fontWeight: '700' },
  cancelBtn:      { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText:  { fontSize: 14, fontWeight: '600' },
  confirmBtn:     { flex: 2, backgroundColor: GREEN, borderRadius: 12, paddingVertical: 13, alignItems: 'center', shadowColor: GREEN, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
