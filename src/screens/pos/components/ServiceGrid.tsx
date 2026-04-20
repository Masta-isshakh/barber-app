import React from 'react';
import {
  Dimensions,
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

// Per-category accent colours
const CAT_COLORS: Record<string, string> = {
  HAIRCUT: '#6366F1',
  BEARD: '#14B8A6',
  COMBO: '#F97316',
  KIDS: '#EC4899',
  TREATMENT: '#22C55E',
  OTHER: '#8B5CF6',
};

export default function ServiceGrid({ services, onAdd, activeCategory, onCategoryChange }: Props) {
  const { width } = Dimensions.get('window');
  const numColumns = width >= 1100 ? 4 : width >= 768 ? 3 : 2;

  const filtered =
    activeCategory === 'ALL' ? services : services.filter((s) => s.category === activeCategory);

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{filtered.length}</Text>
        </View>
      </View>

      {/* Category selector — square icon cards */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
        renderItem={({ item: cat }) => {
          const isActive = activeCategory === cat;
          const accent = cat === 'ALL' ? COLORS.accent : (CAT_COLORS[cat] ?? COLORS.accent);
          return (
            <Pressable
              onPress={() => onCategoryChange(cat)}
              style={[
                styles.catCard,
                isActive && { backgroundColor: accent, borderColor: accent },
              ]}
            >
              <Text style={styles.catCardIcon}>
                {cat === 'ALL' ? '★' : CATEGORY_ICONS[cat]}
              </Text>
              <Text style={[styles.catCardLabel, isActive && styles.catCardLabelActive]}>
                {cat === 'ALL' ? 'All' : CATEGORY_LABELS[cat]}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Service tiles */}
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        numColumns={numColumns}
        key={String(numColumns)}
        columnWrapperStyle={numColumns > 1 ? styles.rowWrap : undefined}
        contentContainerStyle={styles.grid}
        renderItem={({ item: service }) => {
          const accent = CAT_COLORS[service.category] ?? COLORS.accent;
          return (
            <Pressable
              onPress={() => onAdd(service)}
              style={({ pressed }) => [
                styles.tile,
                { borderLeftColor: accent },
                pressed && styles.tilePressed,
              ]}
            >
              {/* Header row */}
              <View style={styles.tileHead}>
                <Text style={styles.tileIcon}>{CATEGORY_ICONS[service.category]}</Text>
                <View style={[styles.catBadge, { backgroundColor: accent + '1A' }]}>
                  <Text style={[styles.catBadgeText, { color: accent }]}>
                    {CATEGORY_LABELS[service.category]}
                  </Text>
                </View>
              </View>

              {/* Name */}
              <View style={styles.tileMiddle}>
                <Text style={styles.tileName} numberOfLines={2}>{service.name}</Text>
                {service.nameAr ? (
                  <Text style={styles.tileNameAr} numberOfLines={1}>{service.nameAr}</Text>
                ) : null}
              </View>

              {/* Footer */}
              <View style={styles.tileFooter}>
                <View style={styles.durationPill}>
                  <Text style={styles.durationText}>{service.durationMinutes} min</Text>
                </View>
                <Text style={styles.tilePrice}>QR {service.price}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✂️</Text>
            <Text style={styles.emptyTitle}>No services here</Text>
            <Text style={styles.emptyText}>Add services from the Services tab.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F8' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.2 },
  countBadge: {
    backgroundColor: COLORS.accent + '22',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.accent },

  // Category cards
  catRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  catCard: {
    width: 66,
    height: 70,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8F9FB',
    borderWidth: 1.5,
    borderColor: '#DFE2E8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  catCardIcon: { fontSize: 24, lineHeight: 28 },
  catCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  catCardLabelActive: { color: '#fff' },

  // Grid
  grid: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  rowWrap: { gap: SPACING.sm, marginBottom: SPACING.sm },

  // Tile
  tile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    minHeight: 136,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E8EAF0',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    gap: SPACING.xs,
  },
  tilePressed: { opacity: 0.88, transform: [{ scale: 0.968 }] },
  tileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileIcon: { fontSize: 20 },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  catBadgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  tileMiddle: { flex: 1, justifyContent: 'center' },
  tileName: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 21 },
  tileNameAr: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500', marginTop: 2, textAlign: 'right' },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  durationPill: {
    backgroundColor: '#F1F3F6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  durationText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700' },
  tilePrice: { fontSize: 18, fontWeight: '900', color: COLORS.accent },

  // Empty
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  emptyText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
});
