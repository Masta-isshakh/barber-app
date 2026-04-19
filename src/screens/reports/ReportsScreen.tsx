import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTransactions } from '../../hooks/useTransactions';
import { useBarbers } from '../../hooks/useBarbers';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import type { Transaction } from '../../types';

type ReportTab = 'today' | 'week' | 'month' | 'all';

function dateRange(tab: ReportTab): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (tab === 'today') {
    const s = fmt(now);
    return { from: s + 'T00:00:00.000Z', to: s + 'T23:59:59.999Z' };
  }
  if (tab === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { from: fmt(start) + 'T00:00:00.000Z', to: fmt(now) + 'T23:59:59.999Z' };
  }
  if (tab === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start) + 'T00:00:00.000Z', to: fmt(now) + 'T23:59:59.999Z' };
  }
  return { from: '2020-01-01T00:00:00.000Z', to: '2099-01-01T00:00:00.000Z' };
}

function KPICard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={[kpi.card, color ? { borderLeftColor: color, borderLeftWidth: 3 } : {}]}>
      <Text style={kpi.value}>{value}</Text>
      <Text style={kpi.label}>{label}</Text>
      {sub && <Text style={kpi.sub}>{sub}</Text>}
    </View>
  );
}

const kpi = StyleSheet.create({
  card: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.sm, margin: SPACING.xs / 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  value: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  label: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  sub: { fontSize: 11, color: COLORS.accent, marginTop: 2, fontWeight: '600' },
});

export default function ReportsScreen() {
  const [tab, setTab] = useState<ReportTab>('today');
  const { from, to } = dateRange(tab);
  const { transactions, loading } = useTransactions(from, to);
  const { barbers } = useBarbers();

  const stats = useMemo(() => {
    const total = transactions.reduce((s, t) => s + t.total, 0);
    const byMethod: Record<string, number> = {};
    const byBarber: Record<string, { name: string; revenue: number; clients: number }> = {};

    transactions.forEach((t: Transaction) => {
      byMethod[t.paymentMethod] = (byMethod[t.paymentMethod] ?? 0) + t.total;
      if (!byBarber[t.barberId]) byBarber[t.barberId] = { name: t.barberName, revenue: 0, clients: 0 };
      byBarber[t.barberId].revenue += t.total;
      byBarber[t.barberId].clients += 1;
    });

    const barberList = Object.values(byBarber).sort((a, b) => b.revenue - a.revenue);
    const avgTicket = transactions.length > 0 ? Math.round(total / transactions.length) : 0;

    return { total, byMethod, barberList, avgTicket, count: transactions.length };
  }, [transactions]);

  const TABS: { key: ReportTab; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Reports</Text>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tabPill, tab === t.key && styles.tabPillActive]}
          >
            <Text style={[styles.tabPillText, tab === t.key && styles.tabPillTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* KPIs */}
          <View style={styles.kpiRow}>
            <KPICard label="Revenue" value={`QR ${stats.total}`} color={COLORS.accent} />
            <KPICard label="Clients" value={String(stats.count)} color={COLORS.info} />
          </View>
          <View style={styles.kpiRow}>
            <KPICard label="Avg Ticket" value={`QR ${stats.avgTicket}`} color={COLORS.success} />
            <KPICard label="Barbers Active" value={String(barbers.length)} color={COLORS.warning} />
          </View>

          {/* Payment breakdown */}
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <View style={styles.methodsCard}>
            {Object.entries(stats.byMethod).map(([method, amount]) => (
              <View key={method} style={styles.methodRow}>
                <Text style={styles.methodIcon}>
                  {method === 'CASH' ? '💵' : method === 'CARD' ? '💳' : method === 'QR' ? '📱' : '50/50'}
                </Text>
                <Text style={styles.methodName}>{method}</Text>
                <View style={styles.methodBarWrap}>
                  <View
                    style={[
                      styles.methodBar,
                      { width: `${stats.total > 0 ? (amount / stats.total) * 100 : 0}%` as any },
                    ]}
                  />
                </View>
                <Text style={styles.methodAmount}>QR {amount}</Text>
              </View>
            ))}
            {Object.keys(stats.byMethod).length === 0 && (
              <Text style={styles.emptyText}>No transactions yet</Text>
            )}
          </View>

          {/* Barber leaderboard */}
          <Text style={styles.sectionTitle}>Barber Performance</Text>
          {stats.barberList.map((b, idx) => (
            <View key={b.name} style={styles.barberRow}>
              <View style={[styles.rank, idx === 0 && { backgroundColor: COLORS.accent }]}>
                <Text style={[styles.rankText, idx === 0 && { color: COLORS.primary }]}>#{idx + 1}</Text>
              </View>
              <Text style={styles.barberName}>{b.name}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.barberRevenue}>QR {b.revenue}</Text>
                <Text style={styles.barberClients}>{b.clients} clients</Text>
              </View>
            </View>
          ))}

          {/* Recent transactions */}
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.slice(0, 20).map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txReceipt}>{tx.receiptNumber}</Text>
                <Text style={styles.txMeta}>{tx.barberName} · {tx.paymentMethod}</Text>
                <Text style={styles.txTime}>{tx.paidAt ? new Date(tx.paidAt).toLocaleString('en-QA', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</Text>
              </View>
              <Text style={styles.txTotal}>QR {tx.total}</Text>
            </View>
          ))}
          {transactions.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No transactions in this period</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.accent },
  tabBar: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.xs, backgroundColor: COLORS.card },
  tabPill: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  tabPillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tabPillText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  tabPillTextActive: { color: COLORS.primary },
  scroll: { padding: SPACING.md, paddingBottom: 40 },
  kpiRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  methodsCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  methodIcon: { fontSize: 16 },
  methodName: { width: 50, fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  methodBarWrap: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
  methodBar: { height: '100%', backgroundColor: COLORS.accent, borderRadius: RADIUS.full },
  methodAmount: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, minWidth: 60, textAlign: 'right' },
  barberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.xs, gap: SPACING.sm },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary },
  barberName: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  barberRevenue: { fontSize: 14, fontWeight: '800', color: COLORS.accent },
  barberClients: { fontSize: 11, color: COLORS.textMuted },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.xs },
  txReceipt: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  txMeta: { fontSize: 11, color: COLORS.textSecondary },
  txTime: { fontSize: 10, color: COLORS.textMuted },
  txTotal: { fontSize: 16, fontWeight: '800', color: COLORS.accent },
  empty: { alignItems: 'center', paddingTop: 20 },
  emptyText: { color: COLORS.textMuted, fontSize: 13 },
});
