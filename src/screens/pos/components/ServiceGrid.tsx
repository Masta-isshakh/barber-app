import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../../constants/colors';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../../constants/services';
import type { ServiceCategory, ServiceItem } from '../../../types';

type Props = {
  services: ServiceItem[];
  onAdd: (service: ServiceItem) => void;
  activeCategory: ServiceCategory | 'ALL';
  onCategoryChange: (cat: ServiceCategory | 'ALL') => void;
};

const CATEGORIES: (ServiceCategory | 'ALL')[] = [
  'ALL', 'HAIRCUT', 'BEARD', 'COMBO', 'KIDS', 'TREATMENT', 'OTHER',
];

export default function ServiceGrid({ services, onAdd, activeCategory, onCategoryChange }: Props) {
  const filtered =
    activeCategory === 'ALL' ? services : services.filter((s) => s.category === activeCategory);

  return (
    <View style={styles.container}>
      {/* Category pills */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
        renderItem={({ item: cat }) => (
          <Pressable
            onPress={() => onCategoryChange(cat)}
            style={[styles.catPill, activeCategory === cat && styles.catPillActive]}
          >
            <Text style={[styles.catPillText, activeCategory === cat && styles.catPillTextActive]}>
              {cat === 'ALL' ? '🔠 All' : `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
            </Text>
          </Pressable>
        )}
      />

      {/* Service tiles */}
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item: service }) => (
          <Pressable
            onPress={() => onAdd(service)}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
          >
            <Text style={styles.tileIcon}>{CATEGORY_ICONS[service.category]}</Text>
            <Text style={styles.tileName} numberOfLines={2}>{service.name}</Text>
            <Text style={styles.tilePrice}>QR {service.price}</Text>
            <Text style={styles.tileDuration}>{service.durationMinutes} min</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No services found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  catRow: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.xs },
  catPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
  },
  catPillActive: { backgroundColor: COLORS.accent },
  catPillText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  catPillTextActive: { color: COLORS.primary },
  grid: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl, gap: SPACING.sm },
  tile: {
    flex: 1,
    margin: SPACING.xs,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tilePressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  tileIcon: { fontSize: 24, marginBottom: 4 },
  tileName: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  tilePrice: { fontSize: 13, fontWeight: '800', color: COLORS.accent, marginTop: 2 },
  tileDuration: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { color: COLORS.textMuted },
});
