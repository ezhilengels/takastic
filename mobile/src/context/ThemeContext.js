import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@taskastic/theme_v1';

// ── Brand palette ──────────────────────────────────────────────────────────
export const GREEN = '#00875A';   // primary  – completed / active / brand
export const AMBER = '#FFAB00';   // accent   – pending / important

// ── Light theme ────────────────────────────────────────────────────────────
export const lightTheme = {
  mode:        'light',
  bg:          '#FFFFFF',
  card:        '#F4F5F7',
  cardBorder:  '#DFE1E6',
  inputBg:     '#FFFFFF',
  text:        '#172B4D',
  textMuted:   '#6B778C',
  accent:      GREEN,
  accentLight: GREEN,
  statusBar:   'dark-content',
  // Secondary button (Cancel) — dark, clearly tappable in light mode
  secondaryBg:     '#D6DAE4',
  secondaryBorder: '#6B778C',
  secondaryText:   '#172B4D',
  checkboxBorder:  '#ADB5C7',
};

// ── Dark theme ─────────────────────────────────────────────────────────────
export const darkTheme = {
  mode:        'dark',
  bg:          '#0c1410',
  card:        '#111f17',
  cardBorder:  '#b3dcc6ff',
  inputBg:     '#162019',
  text:        '#E3F5ED',
  textMuted:   '#6B8C7A',
  accent:      GREEN,
  accentLight: '#57D9A3',
  statusBar:   'light-content',
  // Secondary button (Cancel) — bright/near-white, clearly tappable in dark mode
  secondaryBg:     '#2C4A38',
  secondaryBorder: '#7EC8A0',
  secondaryText:   '#E8F5EE',
  checkboxBorder:  '#b3dcc6ff',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false); // light by default; AsyncStorage overrides on mount

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === 'dark')  setIsDark(true);
      if (val === 'light') setIsDark(false);
    }).catch(() => {});
  }, []);

  // useCallback with [] so this function reference is stable across renders
  const toggleTheme = useCallback(() => {
    setIsDark((d) => {
      const next = !d;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  const theme = isDark ? darkTheme : lightTheme;

  // All three deps are stable: theme changes only with isDark, toggleTheme is stable
  const value = useMemo(() => ({ theme, toggleTheme, isDark }), [theme, toggleTheme, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
