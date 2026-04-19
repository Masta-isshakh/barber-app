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

export default function ServiceGrid({ services, onAdd, activeCategory, onCategoryChange }: Props) {
  const width = Dimensions.get('window').width;
  const isTabletLandscape = width >= 1024;
  const numColumns = isTabletLandscape ? 4 : width >= 700 ? 3 : 2;

  const filtered =
    activeCategory === 'ALL' ? services : services.filter((s) => s.category === activeCategory);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.sectionTitle}>Services</Text>
        <Text style={styles.sectionSub}>{filtered.length} active items</Text>
      </View>

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
              {cat === 'ALL' ? 'All' : `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
            </Text>
          </Pressable>
        )}
      />

      {/* Service tiles */}
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.rowWrap : undefined}
        contentContainerStyle={[styles.grid, isTabletLandscape && styles.gridTablet]}
        renderItem={({ item: service }) => (
          <Pressable
            onPress={() => onAdd(service)}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
          >
            <View style={styles.tileHeader}>
              <Text style={styles.tileIcon}>{CATEGORY_ICONS[service.category]}</Text>
              <Text style={styles.tileCategory}>{CATEGORY_LABELS[service.category]}</Text>
            </View>
            <Text style={styles.tileName} numberOfLines={2}>{service.name}</Text>
            <View style={styles.tileFooter}>
              <Text style={styles.tileDuration}>{service.durationMinutes} min</Text>
              <Text style={styles.tilePrice}>QR {service.price}</Text>
            </View>
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
  topBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.3 },
  sectionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  catRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.xs },
  catPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillActive: { backgroundColor: COLORS.accent },
  catPillText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  catPillTextActive: { color: COLORS.primary },
  grid: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, paddingTop: SPACING.xs },
  gridTablet: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  rowWrap: { gap: SPACING.sm },
  tile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    minHeight: 132,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EDEEF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  tilePressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  tileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  tileIcon: { fontSize: 18 },
  tileCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tileName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 20, marginBottom: SPACING.sm },
  tileFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  tilePrice: { fontSize: 18, fontWeight: '900', color: COLORS.accent },
  tileDuration: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { color: COLORS.textMuted },
});
