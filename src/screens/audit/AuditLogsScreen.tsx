import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { client } from '../../lib/amplify';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';

type Severity = 'INFO' | 'WARNING' | 'ERROR';
type LogStatus = 'SUCCESS' | 'FAILED';

type AuditLog = {
  id: string;
  actorUsername: string;
  actorDisplayName?: string | null;
  actorRole?: 'ADMIN' | 'BARBER' | 'SYSTEM' | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  severity?: Severity | null;
  status?: LogStatus | null;
  message?: string | null;
  metadataJson?: string | null;
  occurredAt: string;
};

const statusOptions: Array<'ALL' | LogStatus> = ['ALL', 'SUCCESS', 'FAILED'];
const severityOptions: Array<'ALL' | Severity> = ['ALL', 'INFO', 'WARNING', 'ERROR'];

export default function AuditLogsScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LogStatus>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');

  async function fetchLogs() {
    setLoading(true);
    try {
      const result = await client.models.AuditLog.list();
      const rows = (result.data ?? []) as unknown as AuditLog[];
      rows.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      setLogs(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        (log.actorUsername ?? '').toLowerCase().includes(q) ||
        (log.message ?? '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || (log.status ?? 'SUCCESS') === statusFilter;
      const matchesSeverity =
        severityFilter === 'ALL' || (log.severity ?? 'INFO') === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [logs, search, statusFilter, severityFilter]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Audit Logs</Text>
        <Pressable style={styles.refreshBtn} onPress={fetchLogs}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search action, entity, actor, message..."
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      <View style={styles.filtersWrap}>
        <View style={styles.filterGroup}>
          {statusOptions.map((opt) => (
            <Pressable
              key={opt}
              style={[styles.filterChip, statusFilter === opt && styles.filterChipActive]}
              onPress={() => setStatusFilter(opt)}
            >
              <Text style={[styles.filterChipText, statusFilter === opt && styles.filterChipTextActive]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.filterGroup}>
          {severityOptions.map((opt) => (
            <Pressable
              key={opt}
              style={[styles.filterChip, severityFilter === opt && styles.filterChipActive]}
              onPress={() => setSeverityFilter(opt)}
            >
              <Text style={[styles.filterChipText, severityFilter === opt && styles.filterChipTextActive]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <Text style={styles.action}>{item.action}</Text>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        (item.status ?? 'SUCCESS') === 'FAILED' ? COLORS.error + '22' : COLORS.success + '22',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          (item.status ?? 'SUCCESS') === 'FAILED' ? COLORS.error : COLORS.success,
                      },
                    ]}
                  >
                    {item.status ?? 'SUCCESS'}
                  </Text>
                </View>
              </View>

              <Text style={styles.meta}>
                {item.entityType}
                {item.entityId ? ` · ${item.entityId}` : ''}
              </Text>
              <Text style={styles.meta}>
                {(item.actorDisplayName || item.actorUsername) ?? 'Unknown actor'}
                {item.actorRole ? ` · ${item.actorRole}` : ''}
              </Text>
              <Text style={styles.time}>
                {new Date(item.occurredAt).toLocaleString('en-QA', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </Text>
              {!!item.message && <Text style={styles.message}>{item.message}</Text>}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No logs match your filters.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: COLORS.accent, fontSize: 18, fontWeight: '800' },
  refreshBtn: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  refreshBtnText: { color: COLORS.accent, fontWeight: '700' },
  searchWrap: { padding: SPACING.sm, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border },
  searchInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 9,
    color: COLORS.textPrimary,
  },
  filtersWrap: { paddingHorizontal: SPACING.sm, paddingBottom: SPACING.xs, backgroundColor: COLORS.card },
  filterGroup: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs },
  filterChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    backgroundColor: COLORS.bg,
  },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterChipText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700' },
  filterChipTextActive: { color: COLORS.primary },
  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 4,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm },
  action: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 13, flex: 1 },
  badge: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  meta: { color: COLORS.textSecondary, fontSize: 12 },
  time: { color: COLORS.textMuted, fontSize: 11 },
  message: { color: COLORS.textPrimary, fontSize: 12, marginTop: 2 },
  emptyWrap: { marginTop: 24, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted },
});
