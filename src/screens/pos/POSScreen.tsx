import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getCurrentUser } from 'aws-amplify/auth';
import { client } from '../../lib/amplify';
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

const { width } = Dimensions.get('window');
const IS_WIDE = width >= 768;

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
  const { barbers, loading: barbersLoading } = useBarbers();
  const { services, loading: servicesLoading } = useServices();

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
      if (barbers.length === 0) {
        Alert.alert('No active barbers', 'Activate a barber profile before processing sales.');
        return;
      }

      const fallbackBarber = barbers[0];
      setCart((prev) => ({ ...prev, selectedBarber: fallbackBarber }));
      Alert.alert('Barber selected', `${fallbackBarber.fullName} selected. Tap charge again to continue.`);
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
  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerKicker}>Cashier Workspace</Text>
          <Text style={styles.headerTitle}>White Beard POS</Text>
        </View>
        {processingPayment && <ActivityIndicator color={COLORS.accent} />}
      </View>

      <View style={[styles.body, IS_WIDE && styles.bodyWide]}>
        {/* Left: services */}
        <View style={IS_WIDE ? styles.servicesWide : styles.servicesFull}>
          <ServiceGrid
            services={services}
            onAdd={addToCart}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </View>

        {/* Right: cart (on wide screens shown as side panel; on narrow shown below) */}
        {IS_WIDE ? (
          <View style={styles.cartSidePanel}>
            <CartPanel
              cart={cart.items}
              selectedBarber={cart.selectedBarber}
              barbers={barbers}
              onSelectBarber={selectBarber}
              onIncrement={increment}
              onDecrement={decrement}
              onRemove={remove}
              discountPercent={cart.discountPercent}
              onDiscountChange={setDiscount}
              onCharge={handleChargePress}
            />
          </View>
        ) : (
          // On phone: cart as bottom collapsible – show just the charge button row
          <View style={styles.cartBottomBar}>
            <CartPanel
              cart={cart.items}
              selectedBarber={cart.selectedBarber}
              barbers={barbers}
              onSelectBarber={selectBarber}
              onIncrement={increment}
              onDecrement={decrement}
              onRemove={remove}
              discountPercent={cart.discountPercent}
              onDiscountChange={setDiscount}
              onCharge={handleChargePress}
            />
          </View>
        )}
      </View>

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
  root: { flex: 1, backgroundColor: '#EEF0F3' },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  loadingText: { color: COLORS.textSecondary, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F4E',
  },
  headerKicker: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.accent, letterSpacing: 0.6, marginTop: 2 },
  body: { flex: 1 },
  bodyWide: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.md },
  servicesWide: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  servicesFull: { flex: 1 },
  cartSidePanel: {
    width: 360,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  cartBottomBar: { maxHeight: 420, borderTopWidth: 1, borderTopColor: COLORS.border },
});
