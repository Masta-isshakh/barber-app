import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { client } from '../../lib/amplify';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  receiptNumber?: string | null;
  total?: number | null;
  requiresApproval?: boolean | null;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  notificationType?: 'INFO' | 'REQUEST_APPROVAL' | null;
};

const STATUS_COLORS = {
  PENDING: COLORS.warning,
  APPROVED: COLORS.success,
  REJECTED: COLORS.error,
};

export default function NotificationsScreen() {
  const { authUsername } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items],
  );

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (!authUsername) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await client.models.StaffNotification.list({
        filter: { recipientUsername: { eq: authUsername } },
      });
      setItems((result.data ?? []) as unknown as NotificationItem[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authUsername]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function handleMarkRead(item: NotificationItem) {
    setActingId(item.id);
    try {
      await client.models.StaffNotification.update({
        id: item.id,
        isRead: true,
        readAt: new Date().toISOString(),
      });
      await loadNotifications(true);
    } finally {
      setActingId(null);
    }
  }

  async function handleApproval(item: NotificationItem, status: 'APPROVED' | 'REJECTED') {
    setActingId(item.id);
    try {
      await client.models.StaffNotification.update({
        id: item.id,
        isRead: true,
        readAt: new Date().toISOString(),
        approvalStatus: status,
        respondedAt: new Date().toISOString(),
      });
      await loadNotifications(true);
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>My Notifications</Text>
        <Pressable onPress={() => loadNotifications(true)} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={16} color={COLORS.primary} />
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id}
        onRefresh={() => loadNotifications(true)}
        refreshing={refreshing}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
        renderItem={({ item }) => {
          const isPendingApproval =
            item.requiresApproval && (item.approvalStatus ?? 'PENDING') === 'PENDING';

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {!item.isRead ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.cardMessage}>{item.message}</Text>

              <View style={styles.metaRow}>
                {item.receiptNumber ? (
                  <Text style={styles.metaText}>Receipt: {item.receiptNumber}</Text>
                ) : null}
                {item.total != null ? <Text style={styles.metaText}>QR {item.total}</Text> : null}
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleString()}</Text>
                {item.approvalStatus ? (
                  <Text
                    style={[
                      styles.statusText,
                      { color: STATUS_COLORS[item.approvalStatus as keyof typeof STATUS_COLORS] ?? COLORS.textSecondary },
                    ]}
                  >
                    {item.approvalStatus}
                  </Text>
                ) : null}
              </View>

              {isPendingApproval ? (
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.actionBtn, styles.approveBtn]}
                    disabled={actingId === item.id}
                    onPress={() => handleApproval(item, 'APPROVED')}
                  >
                    <Text style={styles.approveText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.rejectBtn]}
                    disabled={actingId === item.id}
                    onPress={() => handleApproval(item, 'REJECTED')}
                  >
                    <Text style={styles.rejectText}>Reject</Text>
                  </Pressable>
                </View>
              ) : !item.isRead ? (
                <Pressable
                  style={styles.markReadBtn}
                  disabled={actingId === item.id}
                  onPress={() => handleMarkRead(item)}
                >
                  <Text style={styles.markReadText}>Mark as read</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  loadingText: { color: COLORS.textSecondary, fontWeight: '600' },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '900', color: COLORS.accent },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  refreshText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
  listContent: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    marginTop: SPACING.xl,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.warning,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary, flex: 1, marginRight: SPACING.sm },
  cardMessage: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  timeText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  statusText: { fontSize: 12, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  approveBtn: { backgroundColor: '#EAF9EF', borderWidth: 1, borderColor: COLORS.success },
  rejectBtn: { backgroundColor: '#FDECEC', borderWidth: 1, borderColor: COLORS.error },
  approveText: { color: COLORS.success, fontWeight: '800' },
  rejectText: { color: COLORS.error, fontWeight: '800' },
  markReadBtn: {
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#EEF2FF',
  },
  markReadText: { color: COLORS.info, fontWeight: '700', fontSize: 12 },
});