import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

  const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 50];

  return (
    <View style={styles.container}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketTitle}>Current Ticket</Text>
        <Text style={styles.ticketSub}>{cart.length} lines</Text>
      </View>

      {/* Barber selector */}
      <Text style={styles.sectionLabel}>Barber</Text>
      <FlatList
        horizontal
        data={barbers}
        keyExtractor={(b) => b.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.barberRow}
        renderItem={({ item: b }) => {
          const isSelected = selectedBarber?.id === b.id;
          return (
            <Pressable
              onPress={() => onSelectBarber(b)}
              style={[styles.barberChip, isSelected && { backgroundColor: b.avatarColor ?? COLORS.accent }]}
            >
              <Text style={[styles.barberInitial, isSelected && { color: '#fff' }]}>
                {b.fullName[0]}
              </Text>
              <Text
                style={[styles.barberChipName, isSelected && { color: '#fff' }]}
                numberOfLines={1}
              >
                {b.fullName.split(' ')[0]}
              </Text>
              {isSelected ? <Text style={styles.selectedMark}>Selected</Text> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No active barbers</Text>}
      />

      {/* Cart items */}
      <Text style={styles.sectionLabel}>Cart</Text>
      {cart.length === 0 ? (
        <View style={styles.emptyCart}>
          <Text style={styles.emptyCartText}>Tap a service to add it</Text>
        </View>
      ) : (
        <FlatList
          data={cart}
          keyExtractor={(i) => i.service.id}
          style={styles.cartList}
          renderItem={({ item }) => (
            <View style={styles.cartRow}>
              <View style={styles.cartInfo}>
                <Text style={styles.cartName} numberOfLines={1}>{item.service.name}</Text>
                <Text style={styles.cartPrice}>QR {item.service.price} each</Text>
              </View>
              <View style={styles.qtyRow}>
                <Pressable onPress={() => onDecrement(item.service.id)} style={styles.qtyBtn}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </Pressable>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <Pressable onPress={() => onIncrement(item.service.id)} style={styles.qtyBtn}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </Pressable>
              </View>
              <Text style={styles.cartLineTotal}>QR {item.service.price * item.quantity}</Text>
              <Pressable onPress={() => onRemove(item.service.id)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>✕</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      {/* Discount */}
      {cart.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Discount</Text>
          <View style={styles.discountRow}>
            {DISCOUNT_OPTIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => onDiscountChange(d)}
                style={[styles.discountChip, discountPercent === d && styles.discountChipActive]}
              >
                <Text style={[styles.discountChipText, discountPercent === d && styles.discountChipTextActive]}>
                  {d === 0 ? 'None' : `${d}%`}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* Totals */}
      <View style={styles.totalsBox}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>QR {subtotal}</Text>
        </View>
        {discountAmount > 0 && (
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: COLORS.success }]}>Discount ({discountPercent}%)</Text>
            <Text style={[styles.totalValue, { color: COLORS.success }]}>- QR {discountAmount}</Text>
          </View>
        )}
        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>TOTAL</Text>
          <Text style={styles.grandTotalValue}>QR {total}</Text>
        </View>
      </View>

      {/* Charge button */}
      <Pressable
        onPress={onCharge}
        disabled={cart.length === 0}
        style={[styles.chargeBtn, cart.length === 0 && styles.chargeBtnDisabled, !selectedBarber && cart.length > 0 && styles.chargeBtnNeedsBarber]}
      >
        <Text style={styles.chargeBtnText}>
          {!selectedBarber ? 'Select a barber first' : `Proceed to payment · QR ${total}`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.card, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md },
  ticketHeader: { marginBottom: SPACING.xs },
  ticketTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.2 },
  ticketSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  barberRow: { gap: SPACING.xs, paddingBottom: SPACING.sm },
  barberChip: {
    alignItems: 'center',
    width: 84,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: '#FAFAFB',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  barberInitial: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  barberChipName: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontWeight: '700' },
  selectedMark: { marginTop: 4, fontSize: 9, color: '#fff', fontWeight: '800', textTransform: 'uppercase' },
  emptyText: { color: COLORS.textMuted, fontSize: 12 },
  emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  emptyCartText: { color: COLORS.textMuted, fontSize: 13 },
  cartList: { maxHeight: 220 },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  cartInfo: { flex: 1 },
  cartName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cartPrice: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qtyBtnText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '700' },
  qtyText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, minWidth: 16, textAlign: 'center' },
  cartLineTotal: { fontSize: 14, fontWeight: '800', color: COLORS.accent, minWidth: 56, textAlign: 'right' },
  removeBtn: { padding: 4 },
  removeBtnText: { color: COLORS.error, fontSize: 12, fontWeight: '700' },
  discountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm },
  discountChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  discountChipActive: { backgroundColor: COLORS.warning, borderColor: COLORS.warning },
  discountChipText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  discountChipTextActive: { color: '#fff' },
  totalsBox: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  totalValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '700' },
  grandTotalRow: { marginTop: SPACING.xs },
  grandTotalLabel: { fontSize: 17, fontWeight: '900', color: COLORS.primary },
  grandTotalValue: { fontSize: 22, fontWeight: '900', color: COLORS.accent },
  chargeBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  chargeBtnDisabled: { backgroundColor: COLORS.border },
  chargeBtnNeedsBarber: {
    backgroundColor: '#FFF6E6',
    borderWidth: 1.5,
    borderColor: COLORS.warning,
  },
  chargeBtnText: { fontSize: 15, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.2 },
});
