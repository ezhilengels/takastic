/**
 * Two-tone color system — Minimalist & Calm (Green / Amber)
 *
 * GREEN (#00875A) = brand primary — active, completed, in-progress
 * AMBER (#FFAB00) = warm accent  — high priority, pending, attention
 * null entries   → component uses theme neutral colors
 */

export const GREEN = '#00875A';
export const AMBER = '#FFAB00';

export const PRIORITY_CONFIG = {
  high:   { color: AMBER, bg: AMBER + '25', label: '▲  High' },
  medium: { color: GREEN, bg: GREEN + '25', label: '●  Medium' },
  low:    { color: null,  bg: null,          label: '▽  Low' },
};

export const STATUS_CONFIG = {
  'not-started': { color: null,  bg: null,          label: '○  Not Started' },
  'active':      { color: AMBER, bg: AMBER + '25',  label: '●  Active' },
  'completed':   { color: GREEN, bg: GREEN + '25',  label: '✓  Completed' },
};

export const PRIORITY_OPTIONS = [
  { value: 'high',   label: '▲  High',   color: AMBER, bg: AMBER + '25' },
  { value: 'medium', label: '●  Medium', color: GREEN, bg: GREEN + '25' },
  { value: 'low',    label: '▽  Low',    color: null,  bg: null },
];

export const STATUS_OPTIONS = [
  { value: 'not-started', label: '○  Not Started', color: null,  bg: null },
  { value: 'active',      label: '●  Active',      color: AMBER, bg: AMBER + '25' },
  { value: 'completed',   label: '✓  Completed',   color: GREEN, bg: GREEN + '25' },
];
