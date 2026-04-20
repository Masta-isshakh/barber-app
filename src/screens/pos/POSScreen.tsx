import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from 'aws-amplify/auth';
import { client } from '../../lib/amplify';
import { useAuth } from '../../context/AuthContext';
import { useBarbers } from '../../hooks/useBarbers';
import { useServices } from '../../hooks/useServices';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import ServiceGrid from './components/ServiceGrid';
import CartPanel from './components/CartPanel';
import PaymentModal from './components/PaymentModal';
import ReceiptModal from './components/ReceiptModal';
import type {
  BarberProfile,
  CartItem,
  CartState,
  PaymentMethod,
  ServiceCategory,
  ServiceItem,
} from '../../types';

function generateReceiptNumber() {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `WB-${ymd}-${rand}`;
}

const INITIAL_CART: CartState = {
  items: [],
  selectedBarber: null,
  customer: null,
  discountPercent: 0,
};

export default function POSScreen() {
  const { width } = useWindowDimensions();
  const IS_WIDE = width >= 768;
  const { isAdmin, authUsername } = useAuth();

  const { barbers, loading: barbersLoading } = useBarbers();
  const { services, loading: servicesLoading } = useServices();

  const availableBarbers = useMemo(
    () => (isAdmin ? barbers : barbers.filter((b) => b.cognitoUsername === authUsername)),
    [barbers, isAdmin, authUsername],
  );

  const [cart, setCart] = useState<CartState>(INITIAL_CART);
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | 'ALL'>('ALL');
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Receipt data
  const [completedSale, setCompletedSale] = useState<{
    receiptNumber: string;
    paymentMethod: PaymentMethod;
    cashReceived?: number;
    changeGiven?: number;
    paidAt: string;
    barber: BarberProfile | null;
    items: CartItem[];
    subtotal: number;
    discountAmount: number;
    total: number;
  } | null>(null);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = useCallback((service: ServiceItem) => {
    setCart((prev) => {
      const existing = prev.items.find((i) => i.service.id === service.id);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.service.id === service.id ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return { ...prev, items: [...prev.items, { service, quantity: 1 }] };
    });
  }, []);

  const increment = useCallback((serviceId: string) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.service.id === serviceId ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    }));
  }, []);

  const decrement = useCallback((serviceId: string) => {
    setCart((prev) => {
      const item = prev.items.find((i) => i.service.id === serviceId);
      if (!item) return prev;
      if (item.quantity === 1) {
        return { ...prev, items: prev.items.filter((i) => i.service.id !== serviceId) };
      }
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.service.id === serviceId ? { ...i, quantity: i.quantity - 1 } : i,
        ),
      };
    });
  }, []);

  const remove = useCallback((serviceId: string) => {
    setCart((prev) => ({ ...prev, items: prev.items.filter((i) => i.service.id !== serviceId) }));
  }, []);

  const selectBarber = useCallback((b: BarberProfile) => {
    setCart((prev) => ({ ...prev, selectedBarber: b }));
  }, []);

  const setDiscount = useCallback((d: number) => {
    setCart((prev) => ({ ...prev, discountPercent: d }));
  }, []);

  useEffect(() => {
    if (isAdmin) {
      return;
    }
    if (availableBarbers.length !== 1) {
      return;
    }

    const mine = availableBarbers[0];
    setCart((prev) => {
      if (prev.selectedBarber?.id === mine.id) {
        return prev;
      }
      return { ...prev, selectedBarber: mine };
    });
  }, [availableBarbers, isAdmin]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = cart.items.reduce((s, i) => s + i.service.price * i.quantity, 0);
  const discountAmount = Math.round((subtotal * cart.discountPercent) / 100);
  const total = subtotal - discountAmount;

  // ── Payment ───────────────────────────────────────────────────────────────
  async function handlePaymentConfirm(method: PaymentMethod, cashReceived?: number) {
    if (!cart.selectedBarber) return;
    setPaymentVisible(false);
    setProcessingPayment(true);

    try {
      const { username } = await getCurrentUser();
      const receiptNumber = generateReceiptNumber();
      const now = new Date().toISOString();

      // Create Transaction
      const txResult = await client.models.Transaction.create({
        receiptNumber,
        barberId: cart.selectedBarber.id,
        barberName: cart.selectedBarber.fullName,
        subtotal,
        discountAmount,
        discountPercent: cart.discountPercent,
        total,
        paymentMethod: method,
        paymentStatus: 'PAID',
        cashReceived: cashReceived,
        changeGiven:
          method === 'CASH' && cashReceived != null ? cashReceived - total : undefined,
        createdByCognitoUsername: username,
        paidAt: now,
      });

      const transactionId = (txResult.data as any)?.id;

      // Create TransactionItems
      await Promise.all(
        cart.items.map((i) =>
          client.models.TransactionItem.create({
            transactionId,
            serviceId: i.service.id,
            serviceName: i.service.name,
            price: i.service.price,
            quantity: i.quantity,
            lineTotal: i.service.price * i.quantity,
          }),
        ),
      );

      // Also create a legacy RevenueEntry per barber for backward compat
      await Promise.all(
        cart.items.map((i) =>
          client.models.RevenueEntry.create({
            barberId: cart.selectedBarber!.id,
            cognitoUsername: cart.selectedBarber!.cognitoUsername,
            barberName: cart.selectedBarber!.fullName,
            amount: i.service.price * i.quantity,
            serviceLabel: i.service.name,
            paymentMethod: method === 'QR' ? 'TRANSFER' : method === 'SPLIT' ? 'CARD' : method,
            earnedAt: now,
          }),
        ),
      );

      // Notify the selected barber about the completed sale.
      await client.models.StaffNotification.create({
        recipientUsername: cart.selectedBarber.cognitoUsername,
        recipientBarberId: cart.selectedBarber.id,
        title: 'New sale completed',
        message: `Receipt ${receiptNumber} paid via ${method}. Total: QR ${total}.`,
        notificationType: 'REQUEST_APPROVAL',
        requiresApproval: true,
        approvalStatus: 'PENDING',
        respondedAt: undefined,
        relatedTransactionId: transactionId,
        receiptNumber,
        total,
        isRead: false,
        createdAt: now,
      });

      setCompletedSale({
        receiptNumber,
        paymentMethod: method,
        cashReceived,
        changeGiven:
          method === 'CASH' && cashReceived != null ? cashReceived - total : undefined,
        paidAt: now,
        barber: cart.selectedBarber,
        items: cart.items,
        subtotal,
        discountAmount,
        total,
      });
      setReceiptVisible(true);
    } catch (e: any) {
      Alert.alert('Payment Error', e?.message ?? 'Failed to record payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  }

  function handleNewSale() {
    setReceiptVisible(false);
    setCart(INITIAL_CART);
    setCompletedSale(null);
  }

  function handleChargePress() {
    if (cart.items.length === 0) {
      Alert.alert('Cart is empty', 'Add at least one service before charging.');
      return;
    }

    if (!cart.selectedBarber) {
      if (availableBarbers.length === 0) {
        Alert.alert('No active barbers', 'Activate a barber profile before processing sales.');
        return;
      }

      Alert.alert('Select a barber', 'Please choose a barber before proceeding to payment.');
      return;
    }

    setPaymentVisible(true);
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (barbersLoading || servicesLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading POS…</Text>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const subtotalForBar = cart.items.reduce((s, i) => s + i.service.price * i.quantity, 0);
  const discountForBar = Math.round((subtotalForBar * cart.discountPercent) / 100);
  const totalForBar = subtotalForBar - discountForBar;

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerKicker}>Cashier Workspace</Text>
          <Text style={styles.headerTitle}>White Beard POS</Text>
        </View>
        <View style={styles.headerRight}>
          {processingPayment ? (
            <ActivityIndicator color={COLORS.accent} />
          ) : (
            <View style={styles.headerBadge}>
              <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.accent} />
              <Text style={styles.headerBadgeText}>Live</Text>
            </View>
          )}
        </View>
      </View>

      {IS_WIDE ? (
        /* ── TABLET / WIDE: side-by-side ── */
        <View style={styles.bodyWide}>
          <View style={styles.servicesWide}>
            <ServiceGrid
              services={services}
              onAdd={addToCart}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          </View>
          <View style={styles.cartSidePanel}>
            <CartPanel
              cart={cart.items}
              selectedBarber={cart.selectedBarber}
              barbers={availableBarbers}
              onSelectBarber={selectBarber}
              onIncrement={increment}
              onDecrement={decrement}
              onRemove={remove}
              discountPercent={cart.discountPercent}
              onDiscountChange={setDiscount}
              onCharge={handleChargePress}
            />
          </View>
        </View>
      ) : (
        /* ── PHONE: services full height + sticky cart footer ── */
        <View style={styles.bodyPhone}>
          <View style={styles.servicesFull}>
            <ServiceGrid
              services={services}
              onAdd={addToCart}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          </View>

          {/* Sticky bottom cart bar */}
          <View style={styles.phoneCartBar}>
            {/* Barber quick-select */}
            {availableBarbers.length > 0 && (
              <View style={styles.phoneBarberRow}>
                {availableBarbers.slice(0, 5).map((b) => {
                  const isSel = cart.selectedBarber?.id === b.id;
                  return (
                    <Pressable
                      key={b.id}
                      onPress={() => selectBarber(b)}
                      style={[
                        styles.phoneBarberChip,
                        isSel && { backgroundColor: b.avatarColor ?? COLORS.accent, borderColor: b.avatarColor ?? COLORS.accent },
                      ]}
                    >
                      <Text style={[styles.phoneBarberInitial, isSel && { color: '#fff' }]}>
                        {b.fullName[0]}
                      </Text>
                      <Text style={[styles.phoneBarberName, isSel && { color: '#fff' }]} numberOfLines={1}>
                        {b.fullName.split(' ')[0]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Total + charge */}
            <View style={styles.phoneChargeRow}>
              <View style={styles.phoneCartInfo}>
                {cart.items.length === 0 ? (
                  <Text style={styles.phoneCartEmpty}>Tap a service to start</Text>
                ) : (
                  <>
                    <Text style={styles.phoneCartCount}>
                      {cart.items.reduce((s, i) => s + i.quantity, 0)} item{cart.items.reduce((s, i) => s + i.quantity, 0) > 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.phoneCartTotal}>QR {totalForBar}</Text>
                  </>
                )}
              </View>
              <Pressable
                onPress={handleChargePress}
                disabled={cart.items.length === 0}
                style={({ pressed }) => [
                  styles.phoneChargeBtn,
                  cart.items.length === 0 && styles.phoneChargeBtnDisabled,
                  cart.items.length > 0 && pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.phoneChargeBtnText}>
                  {cart.items.length === 0 ? 'Charge' : `Charge · QR ${totalForBar}`}
                </Text>
                {cart.items.length > 0 && (
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} style={{ marginLeft: 6 }} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Payment Modal */}
      <PaymentModal
        visible={paymentVisible}
        total={total}
        onConfirm={handlePaymentConfirm}
        onCancel={() => setPaymentVisible(false)}
      />

      {/* Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          visible={receiptVisible}
          receiptNumber={completedSale.receiptNumber}
          barber={completedSale.barber}
          items={completedSale.items}
          subtotal={completedSale.subtotal}
          discountAmount={completedSale.discountAmount}
          total={completedSale.total}
          paymentMethod={completedSale.paymentMethod}
          cashReceived={completedSale.cashReceived}
          changeGiven={completedSale.changeGiven}
          paidAt={completedSale.paidAt}
          onClose={() => setReceiptVisible(false)}
          onNewSale={handleNewSale}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ECEEF2' },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  loadingText: { color: COLORS.textSecondary, fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#252847',
  },
  headerKicker: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent + '1A',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
  },
  headerBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.accent },

  // Wide (tablet) layout
  bodyWide: {
    flex: 1,
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
    backgroundColor: '#ECEEF2',
  },
  servicesWide: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDE0E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cartSidePanel: {
    width: 360,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDE0E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // Phone layout
  bodyPhone: { flex: 1, flexDirection: 'column' },
  servicesFull: { flex: 1 },

  // Phone sticky cart footer
  phoneCartBar: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    gap: SPACING.sm,
  },
  phoneBarberRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  phoneBarberChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#DFE2E8',
    justifyContent: 'center',
  },
  phoneBarberInitial: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primary,
  },
  phoneBarberName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  phoneChargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  phoneCartInfo: { flex: 1 },
  phoneCartEmpty: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  phoneCartCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  phoneCartTotal: { fontSize: 20, fontWeight: '900', color: COLORS.accent },
  phoneChargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneChargeBtnDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  phoneChargeBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
});
