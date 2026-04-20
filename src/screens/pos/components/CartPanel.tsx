import React from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../../../constants/colors';
import type { BarberProfile, CartItem } from '../../../types';

type Props = {
  cart: CartItem[];
  selectedBarber: BarberProfile | null;
  barbers: BarberProfile[];
  onSelectBarber: (b: BarberProfile) => void;
  onIncrement: (serviceId: string) => void;
  onDecrement: (serviceId: string) => void;
  onRemove: (serviceId: string) => void;
  discountPercent: number;
  onDiscountChange: (d: number) => void;
  onCharge: () => void;
};

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 50];

export default function CartPanel({
  cart,
  selectedBarber,
  barbers,
  onSelectBarber,
  onIncrement,
  onDecrement,
  onRemove,
  discountPercent,
  onDiscountChange,
  onCharge,
}: Props) {
  const subtotal = cart.reduce((s, i) => s + i.service.price * i.quantity, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const total = subtotal - discountAmount;

  const hasCart = cart.length > 0;
  const canCharge = hasCart;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Current Ticket</Text>
          <Text style={styles.headerSub}>
            {cart.length === 0 ? 'No items yet' : `${cart.length} line${cart.length > 1 ? 's' : ''}`}
          </Text>
        </View>
        {cart.length > 0 && (
          <View style={styles.totalPill}>
            <Text style={styles.totalPillText}>QR {total}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Barber selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Barber</Text>
          {barbers.length === 0 ? (
            <View style={styles.emptyBarbers}>
              <Ionicons name="alert-circle-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.emptyTextSmall}>No active barbers</Text>
            </View>
          ) : (
            <FlatList
              horizontal
              data={barbers}
              keyExtractor={(b) => b.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.barberRow}
              scrollEnabled={barbers.length > 3}
              renderItem={({ item: b }) => {
                const isSelected = selectedBarber?.id === b.id;
                const color = b.avatarColor ?? COLORS.accent;
                return (
                  <Pressable
                    onPress={() => onSelectBarber(b)}
                    style={[
                      styles.barberChip,
                      isSelected && { backgroundColor: color, borderColor: color },
                    ]}
                  >
                    <View
                      style={[
                        styles.barberAvatar,
                        { backgroundColor: isSelected ? '#fff3' : color + '22' },
                      ]}
                    >
                      <Text style={[styles.barberInitial, { color: isSelected ? '#fff' : color }]}>
                        {b.fullName[0]}
                      </Text>
                    </View>
                    <Text
                      style={[styles.barberChipName, isSelected && { color: '#fff' }]}
                      numberOfLines={1}
                    >
                      {b.fullName.split(' ')[0]}
                    </Text>
                    {isSelected && <View style={styles.selectedDot} />}
                  </Pressable>
                );
              }}
            />
          )}
        </View>

        {/* Cart items */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Items</Text>
          {!hasCart ? (
            <View style={styles.emptyCart}>
              <Ionicons name="add-circle-outline" size={32} color={COLORS.border} />
              <Text style={styles.emptyCartText}>Tap a service to add</Text>
            </View>
          ) : (
            <View>
              {cart.map((item) => (
                <View key={item.service.id} style={styles.cartRow}>
                  <View style={styles.cartInfo}>
                    <Text style={styles.cartName} numberOfLines={1}>{item.service.name}</Text>
                    <Text style={styles.cartUnit}>QR {item.service.price} each</Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <Pressable
                      onPress={() => onDecrement(item.service.id)}
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="remove" size={14} color={COLORS.textPrimary} />
                    </Pressable>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <Pressable
                      onPress={() => onIncrement(item.service.id)}
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="add" size={14} color={COLORS.textPrimary} />
                    </Pressable>
                  </View>
                  <Text style={styles.cartLineTotal}>QR {item.service.price * item.quantity}</Text>
                  <Pressable
                    onPress={() => onRemove(item.service.id)}
                    style={styles.removeBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Discount */}
        {hasCart && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Discount</Text>
            <View style={styles.discountRow}>
              {DISCOUNT_OPTIONS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => onDiscountChange(d)}
                  style={[
                    styles.discountChip,
                    discountPercent === d && styles.discountChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.discountChipText,
                      discountPercent === d && styles.discountChipTextActive,
                    ]}
                  >
                    {d === 0 ? 'None' : `${d}%`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>QR {subtotal}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: COLORS.success }]}>
                Discount ({discountPercent}%)
              </Text>
              <Text style={[styles.totalValue, { color: COLORS.success }]}>- QR {discountAmount}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>TOTAL</Text>
            <Text style={styles.grandValue}>QR {total}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Charge button */}
      <View style={styles.chargeWrap}>
        {!selectedBarber && hasCart && (
          <View style={styles.barberWarning}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.warning} />
            <Text style={styles.barberWarningText}>No barber selected — first one will be used</Text>
          </View>
        )}
        <Pressable
          onPress={onCharge}
          disabled={!canCharge}
          style={({ pressed }) => [
            styles.chargeBtn,
            !canCharge && styles.chargeBtnDisabled,
            canCharge && pressed && { opacity: 0.88 },
          ]}
        >
          <View style={styles.chargeBtnInner}>
            <View>
              <Text style={styles.chargeBtnLabel}>
                {!hasCart ? 'Cart is empty' : 'Proceed to Payment'}
              </Text>
              {hasCart && <Text style={styles.chargeBtnAmount}>QR {total}</Text>}
            </View>
            {hasCart && (
              <View style={styles.chargeBtnArrow}>
                <Ionicons name="arrow-forward" size={20} color={COLORS.primary} />
              </View>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.card,
    flexDirection: 'column',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: '600' },
  totalPill: {
    backgroundColor: COLORS.accent + '22',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
  },
  totalPillText: { fontSize: 14, fontWeight: '900', color: COLORS.accent },

  scroll: { flex: 1 },

  // Section
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },

  // Barbers
  barberRow: { gap: SPACING.xs },
  emptyBarbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  emptyTextSmall: { fontSize: 13, color: COLORS.textMuted },
  barberChip: {
    alignItems: 'center',
    width: 76,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8F9FB',
    borderWidth: 1.5,
    borderColor: '#DFE2E8',
    gap: 4,
  },
  barberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barberInitial: { fontSize: 18, fontWeight: '900' },
  barberChipName: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    opacity: 0.9,
  },

  // Cart items
  emptyCart: { alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.lg },
  emptyCartText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: SPACING.xs,
  },
  cartInfo: { flex: 1 },
  cartName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cartUnit: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.sm,
    padding: 2,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.sm - 2,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minWidth: 22,
    textAlign: 'center',
  },
  cartLineTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accent,
    minWidth: 54,
    textAlign: 'right',
  },
  removeBtn: { padding: 2 },

  // Discount
  discountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  discountChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  discountChipActive: { backgroundColor: '#FFF3CD', borderColor: COLORS.warning },
  discountChipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  discountChipTextActive: { color: '#92400E', fontWeight: '800' },

  // Totals
  totalsBox: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    backgroundColor: '#F8F9FB',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    gap: 6,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  totalValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  grandValue: { fontSize: 26, fontWeight: '900', color: COLORS.accent },

  // Charge button
  chargeWrap: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.xs,
  },
  barberWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  barberWarningText: { fontSize: 11, color: COLORS.warning, fontWeight: '600', flex: 1 },
  chargeBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  chargeBtnDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  chargeBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chargeBtnLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  chargeBtnAmount: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 2,
  },
  chargeBtnArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
