import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../../../constants/colors';
import type { PaymentMethod } from '../../../types';

type Props = {
  visible: boolean;
  total: number;
  onConfirm: (method: PaymentMethod, cashReceived?: number) => void;
  onCancel: () => void;
};

const METHODS: { key: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { key: 'CASH', label: 'Cash', icon: 'cash-outline', desc: 'Physical banknotes' },
  { key: 'CARD', label: 'Card', icon: 'card-outline', desc: 'VPOS / SoftPOS terminal' },
  { key: 'QR', label: 'QR Pay', icon: 'qr-code-outline', desc: 'NAPS / Apple/Google Pay' },
  { key: 'SPLIT', label: 'Split', icon: 'git-compare-outline', desc: 'Cash + Card' },
];

export default function PaymentModal({ visible, total, onConfirm, onCancel }: Props) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState('');

  const cashChange = parseFloat(cashReceived || '0') - total;

  function handleConfirm() {
    if (selectedMethod === 'CASH') {
      const received = parseFloat(cashReceived || String(total));
      onConfirm('CASH', received);
    } else {
      onConfirm(selectedMethod);
    }
    setCashReceived('');
  }

  const canConfirm =
    selectedMethod !== 'CASH' ||
    cashReceived === '' ||
    parseFloat(cashReceived) >= total;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Payment</Text>
          <Text style={styles.totalDisplay}>QR {total}</Text>

          {/* Method selector */}
          <View style={styles.methodsGrid}>
            {METHODS.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => setSelectedMethod(m.key)}
                style={[styles.methodCard, selectedMethod === m.key && styles.methodCardActive]}
              >
                  <Ionicons
                    name={m.icon}
                    size={22}
                    color={selectedMethod === m.key ? COLORS.accent : COLORS.textSecondary}
                    style={styles.methodIcon}
                  />
                <Text style={[styles.methodLabel, selectedMethod === m.key && styles.methodLabelActive]}>
                  {m.label}
                </Text>
                <Text style={styles.methodDesc}>{m.desc}</Text>
              </Pressable>
            ))}
          </View>

          {/* Cash input */}
          {selectedMethod === 'CASH' && (
            <View style={styles.cashBox}>
              <Text style={styles.cashLabel}>Cash Received (QR)</Text>
              <TextInput
                style={styles.cashInput}
                keyboardType="numeric"
                placeholder={String(total)}
                placeholderTextColor={COLORS.textMuted}
                value={cashReceived}
                onChangeText={setCashReceived}
                autoFocus
              />
              {cashReceived !== '' && (
                <Text style={[styles.changeText, cashChange < 0 && { color: COLORS.error }]}>
                  {cashChange >= 0
                    ? `Change: QR ${cashChange.toFixed(2)}`
                    : `Short by QR ${Math.abs(cashChange).toFixed(2)}`}
                </Text>
              )}
            </View>
          )}

          {selectedMethod === 'CARD' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                Process QR {total} on the VPOS / SoftPOS terminal, then tap Confirm.
              </Text>
            </View>
          )}

          {selectedMethod === 'QR' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                Show QR code on the payment terminal or ask customer to scan via banking app.
              </Text>
            </View>
          )}

          {selectedMethod === 'SPLIT' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                Split payment: enter card amount on terminal, then collect cash for the remainder.
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={!canConfirm}
              style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
            >
              <Text style={styles.confirmText}>Confirm Payment</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  totalDisplay: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  methodCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#FAFAFB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  methodCardActive: { borderColor: COLORS.accent, backgroundColor: '#FFF9EA', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  methodIcon: { marginBottom: 6 },
  methodLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  methodLabelActive: { color: COLORS.accent },
  methodDesc: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
  cashBox: { marginBottom: SPACING.md },
  cashLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  cashInput: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  changeText: {
    textAlign: 'center',
    marginTop: SPACING.xs,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  infoBox: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  infoBoxText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  cancelBtn: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  confirmBtn: {
    flex: 2,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: COLORS.border },
  confirmText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
});
