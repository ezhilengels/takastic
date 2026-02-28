import React, { memo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const GREEN = '#00875A';

const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'not-started', label: 'Not Started' },
  { key: 'active',      label: 'Active' },
  { key: 'completed',   label: 'Completed' },
];

function FilterBar({ filter, onFilter }) {
  const { theme } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.wrapper}
    >
      {FILTERS.map((f) => {
        const isActive = filter === f.key;
        return (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.btn,
              {
                backgroundColor: theme.card,
                borderColor:     theme.secondaryBorder,
              },
              isActive && { backgroundColor: GREEN, borderColor: GREEN },
            ]}
            onPress={() => onFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.label,
              { color: theme.secondaryText },
              isActive && { color: '#fff', fontWeight: '700' },
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:  { marginBottom: 14 },
  wrapper: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  btn: {
    paddingVertical: 9, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1.5, alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '600' },
});

export default memo(FilterBar);
