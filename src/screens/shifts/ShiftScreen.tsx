import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { client } from '../../lib/amplify';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useBarbers } from '../../hooks/useBarbers';
import { useTransactions } from '../../hooks/useTransactions';
import type { Shift, Transaction } from '../../types';
import { writeAuditLog } from '../../lib/audit';

function startOfDayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDayIso() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export default function ShiftScreen() {
  const { authUsername, isAdmin } = useAuth();
  const { barbers } = useBarbers();
  const { transactions, loading: txLoading, refetch: refetchTx } = useTransactions(startOfDayIso(), endOfDayIso());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function fetchShifts() {
    setLoading(true);
    try {
      const result = await client.models.Shift.list();
      const rows = (result.data ?? []) as unknown as Shift[];
      const today = new Date().toISOString().slice(0, 10);
      const filtered = rows
        .filter((s) => s.startedAt.startsWith(today))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      setShifts(filtered);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchShifts();
  }, []);

  const meBarber = useMemo(
    () => barbers.find((b) => b.cognitoUsername === authUsername) ?? null,
    [barbers, authUsername],
  );

  const myOpenShift = useMemo(
    () => shifts.find((s) => s.cognitoUsername === authUsername && s.status === 'OPEN') ?? null,
    [shifts, authUsername],
  );

  const todaySummary = useMemo(() => {
    const byMethod: Record<string, number> = { CASH: 0, CARD: 0, QR: 0, SPLIT: 0 };
    let total = 0;

    transactions.forEach((t: Transaction) => {
      total += t.total;
      byMethod[t.paymentMethod] = (byMethod[t.paymentMethod] ?? 0) + t.total;
    });

    return {
      total,
      byMethod,
      count: transactions.length,
      expectedCash: byMethod.CASH,
    };
  }, [transactions]);

  async function openShift() {
    if (!meBarber) {
      Alert.alert('Profile missing', 'No active barber profile found for this user.');
      return;
    }
    if (myOpenShift) {
      Alert.alert('Shift already open', 'Close current shift before opening a new one.');
      return;
    }

    setSaving(true);
    try {
      const created = await client.models.Shift.create({
        barberId: meBarber.id,
        barberName: meBarber.fullName,
        cognitoUsername: meBarber.cognitoUsername,
        startedAt: new Date().toISOString(),
        status: 'OPEN',
        totalRevenue: 0,
        totalClients: 0,
      });

      await writeAuditLog({
        action: 'SHIFT_OPENED',
        entityType: 'Shift',
        entityId: (created.data as any)?.id,
        actorRole: isAdmin ? 'ADMIN' : 'BARBER',
        message: `${meBarber.fullName} opened a shift`,
      });

      fetchShifts();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to open shift');
    } finally {
      setSaving(false);
    }
  }

  function transactionsForShift(shift: Shift): Transaction[] {
    const start = shift.startedAt;
    const end = shift.endedAt ?? new Date().toISOString();
    return transactions.filter(
      (t) =>
        t.barberId === shift.barberId &&
        (t.paidAt ?? t.createdAt ?? '') >= start &&
        (t.paidAt ?? t.createdAt ?? '') <= end,
    );
  }

  async function closeShift() {
    if (!myOpenShift) {
      Alert.alert('No open shift', 'Open a shift first.');
      return;
    }

    setSaving(true);
    try {
      const rows = transactionsForShift(myOpenShift);
      const totalRevenue = rows.reduce((sum, t) => sum + t.total, 0);
      const totalClients = rows.length;

      await client.models.Shift.update({
        id: myOpenShift.id,
        endedAt: new Date().toISOString(),
        status: 'CLOSED',
        totalRevenue,
        totalClients,
      });

      await writeAuditLog({
        action: 'SHIFT_CLOSED',
        entityType: 'Shift',
        entityId: myOpenShift.id,
        actorRole: isAdmin ? 'ADMIN' : 'BARBER',
        message: `${myOpenShift.barberName} closed shift`,
        metadata: { totalRevenue, totalClients },
      });

      fetchShifts();
      refetchTx();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to close shift');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shifts & Reconciliation</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>End-of-day reconciliation</Text>
        <Text style={styles.summaryTotal}>QR {todaySummary.total}</Text>
        <Text style={styles.summarySub}>{todaySummary.count} transactions</Text>
        <View style={styles.methodRow}><Text style={styles.methodKey}>Cash</Text><Text style={styles.methodValue}>QR {todaySummary.byMethod.CASH}</Text></View>
        <View style={styles.methodRow}><Text style={styles.methodKey}>Card</Text><Text style={styles.methodValue}>QR {todaySummary.byMethod.CARD}</Text></View>
        <View style={styles.methodRow}><Text style={styles.methodKey}>QR</Text><Text style={styles.methodValue}>QR {todaySummary.byMethod.QR}</Text></View>
        <View style={styles.methodRow}><Text style={styles.methodKey}>Split</Text><Text style={styles.methodValue}>QR {todaySummary.byMethod.SPLIT}</Text></View>
        <View style={[styles.methodRow, { marginTop: SPACING.xs }]}>
          <Text style={styles.expectedKey}>Expected cash in drawer</Text>
          <Text style={styles.expectedVal}>QR {todaySummary.expectedCash}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={openShift} disabled={saving || !!myOpenShift}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Open Shift</Text>}
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: COLORS.error }]} onPress={closeShift} disabled={saving || !myOpenShift}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Close Shift</Text>}
        </Pressable>
      </View>

      {(loading || txLoading) ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={isAdmin ? shifts : shifts.filter((s) => s.cognitoUsername === authUsername)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.shiftCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shiftName}>{item.barberName}</Text>
                <Text style={styles.shiftMeta}>Start: {new Date(item.startedAt).toLocaleTimeString('en-QA', { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={styles.shiftMeta}>End: {item.endedAt ? new Date(item.endedAt).toLocaleTimeString('en-QA', { hour: '2-digit', minute: '2-digit' }) : 'OPEN'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'OPEN' ? COLORS.warning + '22' : COLORS.success + '22' }]}>
                  <Text style={[styles.statusBadgeText, { color: item.status === 'OPEN' ? COLORS.warning : COLORS.success }]}>{item.status}</Text>
                </View>
                <Text style={styles.shiftTotal}>QR {item.totalRevenue ?? 0}</Text>
                <Text style={styles.shiftClients}>{item.totalClients ?? 0} clients</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No shifts for today</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  headerTitle: { color: COLORS.accent, fontSize: 18, fontWeight: '800' },
  summaryCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  summaryTitle: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryTotal: { marginTop: 4, fontSize: 28, fontWeight: '900', color: COLORS.accent },
  summarySub: { color: COLORS.textMuted, marginBottom: SPACING.sm },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  methodKey: { color: COLORS.textSecondary, fontSize: 13 },
  methodValue: { color: COLORS.textPrimary, fontWeight: '700' },
  expectedKey: { color: COLORS.primary, fontWeight: '800' },
  expectedVal: { color: COLORS.success, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md },
  actionBtn: { flex: 1, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: SPACING.sm },
  actionText: { color: '#fff', fontWeight: '800' },
  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  shiftCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, flexDirection: 'row' },
  shiftName: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 15 },
  shiftMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  statusBadge: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  shiftTotal: { marginTop: 8, color: COLORS.accent, fontWeight: '900', fontSize: 15 },
  shiftClients: { color: COLORS.textMuted, fontSize: 11 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 20 },
});
