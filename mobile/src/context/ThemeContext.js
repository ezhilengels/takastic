import React, { createContext, useContext, useState } from 'react';

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
};

// ── Dark theme ─────────────────────────────────────────────────────────────
export const darkTheme = {
  mode:        'dark',
  bg:          '#0c1410',
  card:        '#111f17',
  cardBorder:  '#1e3328',
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
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false); // light by default (bg: #FFFFFF)
  const theme = isDark ? darkTheme : lightTheme;
  const toggleTheme = () => setIsDark((d) => !d);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
