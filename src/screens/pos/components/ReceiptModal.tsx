import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Print from 'expo-print';
import { COLORS, RADIUS, SPACING } from '../../../constants/colors';
import type { CartItem, PaymentMethod, BarberProfile } from '../../../types';

type Props = {
  visible: boolean;
  receiptNumber: string;
  barber: BarberProfile | null;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  changeGiven?: number;
  paidAt: string;
  onClose: () => void;
  onNewSale: () => void;
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card (VPOS)',
  QR: 'QR Pay',
  SPLIT: 'Split Payment',
};

export default function ReceiptModal({
  visible,
  receiptNumber,
  barber,
  items,
  subtotal,
  discountAmount,
  total,
  paymentMethod,
  cashReceived,
  changeGiven,
  paidAt,
  onClose,
  onNewSale,
}: Props) {
  const dateStr = new Date(paidAt).toLocaleString('en-QA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  function buildTextReceipt() {
    const lines = [
      '============================',
      '       WHITE BEARD          ',
      '    Premium Barbershop      ',
      '         Doha, Qatar        ',
      '============================',
      `Receipt: ${receiptNumber}`,
      `Date: ${dateStr}`,
      `Barber: ${barber?.fullName ?? '-'}`,
      '----------------------------',
      ...items.map((i) => `${i.service.name} x${i.quantity}  QR ${i.service.price * i.quantity}`),
      '----------------------------',
      `Subtotal: QR ${subtotal}`,
      discountAmount > 0 ? `Discount: -QR ${discountAmount}` : '',
      `TOTAL: QR ${total}`,
      `Payment: ${METHOD_LABELS[paymentMethod]}`,
      cashReceived != null ? `Cash: QR ${cashReceived}` : '',
      changeGiven != null && changeGiven > 0 ? `Change: QR ${changeGiven.toFixed(2)}` : '',
      '============================',
      '   Thank you! Come again!   ',
      '============================',
    ].filter(Boolean);
    return lines.join('\n');
  }

  async function handleShare() {
    await Share.share({ message: buildTextReceipt(), title: `Receipt ${receiptNumber}` });
  }

  function buildHtmlReceipt() {
    const itemsHtml = items
      .map(
        (i) => `<tr>
          <td>${i.service.name}</td>
          <td style="text-align:center;">x${i.quantity}</td>
          <td style="text-align:right;">QR ${i.service.price * i.quantity}</td>
        </tr>`,
      )
      .join('');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 12px; color: #111; }
            .title { text-align: center; font-size: 20px; font-weight: 700; }
            .sub { text-align: center; font-size: 12px; color: #555; margin-bottom: 12px; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            td { padding: 4px 0; font-size: 12px; border-bottom: 1px dashed #ddd; }
            .total { font-size: 18px; font-weight: 800; margin-top: 10px; }
            .muted { color: #555; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="title">WHITE BEARD</div>
          <div class="sub">Premium Barbershop · Doha, Qatar</div>
          <div class="row"><span>Receipt</span><strong>${receiptNumber}</strong></div>
          <div class="row"><span>Date</span><strong>${dateStr}</strong></div>
          <div class="row"><span>Barber</span><strong>${barber?.fullName ?? '-'}</strong></div>

          <table>
            ${itemsHtml}
          </table>

          <div class="row"><span>Subtotal</span><strong>QR ${subtotal}</strong></div>
          ${discountAmount > 0 ? `<div class="row"><span>Discount</span><strong>-QR ${discountAmount}</strong></div>` : ''}
          <div class="row total"><span>TOTAL</span><span>QR ${total}</span></div>
          <div class="row"><span>Payment</span><strong>${METHOD_LABELS[paymentMethod]}</strong></div>
          ${cashReceived != null ? `<div class="row"><span>Cash</span><strong>QR ${cashReceived}</strong></div>` : ''}
          ${changeGiven != null && changeGiven > 0 ? `<div class="row"><span>Change</span><strong>QR ${changeGiven.toFixed(2)}</strong></div>` : ''}
          <p class="muted" style="text-align:center; margin-top: 14px;">Thank you! Come again.</p>
        </body>
      </html>
    `;
  }

  async function handlePrintReceipt() {
    await Print.printAsync({ html: buildHtmlReceipt() });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.receipt}>
          {/* Header */}
          <Text style={styles.shopName}>WHITE BEARD</Text>
          <Text style={styles.shopSub}>Premium Barbershop · Doha, Qatar</Text>
          <View style={styles.divider} />

          {/* Meta */}
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Receipt</Text>
            <Text style={styles.metaValue}>{receiptNumber}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Date</Text>
            <Text style={styles.metaValue}>{dateStr}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Barber</Text>
            <Text style={styles.metaValue}>{barber?.fullName ?? '—'}</Text>
          </View>
          <View style={styles.divider} />

          {/* Items */}
          <ScrollView style={styles.itemsScroll}>
            {items.map((i) => (
              <View key={i.service.id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>{i.service.name}</Text>
                <Text style={styles.itemQty}>×{i.quantity}</Text>
                <Text style={styles.itemTotal}>QR {i.service.price * i.quantity}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          {/* Totals */}
          {discountAmount > 0 && (
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Subtotal</Text>
              <Text style={styles.metaValue}>QR {subtotal}</Text>
            </View>
          )}
          {discountAmount > 0 && (
            <View style={styles.metaRow}>
              <Text style={[styles.metaKey, { color: COLORS.success }]}>Discount</Text>
              <Text style={[styles.metaValue, { color: COLORS.success }]}>-QR {discountAmount}</Text>
            </View>
          )}
          <View style={[styles.metaRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>QR {total}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Payment</Text>
            <Text style={styles.metaValue}>{METHOD_LABELS[paymentMethod]}</Text>
          </View>
          {cashReceived != null && (
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Cash</Text>
              <Text style={styles.metaValue}>QR {cashReceived}</Text>
            </View>
          )}
          {changeGiven != null && changeGiven > 0 && (
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Change</Text>
              <Text style={[styles.metaValue, { color: COLORS.success }]}>QR {changeGiven.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.divider} />
          <Text style={styles.thankYou}>Thank you! Come again 🙌</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable onPress={handlePrintReceipt} style={styles.printBtn}>
              <Text style={styles.printBtnText}>🖨 Print</Text>
            </Pressable>
            <Pressable onPress={handleShare} style={styles.shareBtn}>
              <Text style={styles.shareBtnText}>📤 Share</Text>
            </Pressable>
            <Pressable onPress={onNewSale} style={styles.newSaleBtn}>
              <Text style={styles.newSaleBtnText}>New Sale</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  receipt: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 360,
  },
  shopName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    letterSpacing: 2,
  },
  shopSub: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.sm },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metaKey: { fontSize: 12, color: COLORS.textSecondary },
  metaValue: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  itemsScroll: { maxHeight: 180 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  itemName: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  itemQty: { fontSize: 12, color: COLORS.textMuted, marginHorizontal: SPACING.xs },
  itemTotal: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, minWidth: 60, textAlign: 'right' },
  totalRow: { marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  totalValue: { fontSize: 18, fontWeight: '900', color: COLORS.accent },
  thankYou: { textAlign: 'center', fontSize: 13, color: COLORS.textMuted, marginVertical: SPACING.sm },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  printBtn: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  printBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  shareBtn: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  shareBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  newSaleBtn: {
    flex: 2,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  newSaleBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
});
