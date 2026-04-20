import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { client } from '../../lib/amplify';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import type { BarberProfile } from '../../types';
import { writeAuditLog } from '../../lib/audit';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: COLORS.success,
  INVITED: '#F59E0B',
  DISABLED: COLORS.textMuted,
};

export default function BarbersScreen() {
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BarberProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const result = await client.models.BarberProfile.list();
      const sorted = ((result.data ?? []) as unknown as BarberProfile[]).sort((a, b) => {
        const order = { INVITED: 0, ACTIVE: 1, DISABLED: 2 };
        return (order[a.status] ?? 1) - (order[b.status] ?? 1);
      });
      setBarbers(sorted);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load barbers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function changeStatus(barber: BarberProfile, newStatus: 'ACTIVE' | 'DISABLED') {
    const labels: Record<string, string> = { ACTIVE: 'Activate', DISABLED: 'Disable' };
    Alert.alert(
      `${labels[newStatus]} ${barber.fullName}?`,
      newStatus === 'ACTIVE' && barber.status === 'INVITED'
        ? 'This will grant the barber full workspace access.'
        : undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'DISABLED' ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              await client.models.BarberProfile.update({ id: barber.id, status: newStatus });
              await writeAuditLog({
                action: 'BARBER_STATUS_CHANGED',
                entityType: 'BarberProfile',
                entityId: barber.id,
                actorRole: 'ADMIN',
                message: `${barber.fullName} status changed to ${newStatus}`,
                metadata: { from: barber.status, to: newStatus },
              });
              fetchAll();
              setSelected(null);
            } catch (e: any) {
              Alert.alert('Error', e?.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  const activeCount = barbers.filter((b) => b.status === 'ACTIVE').length;
  const invitedCount = barbers.filter((b) => b.status === 'INVITED').length;

  const renderBarber = ({ item: b }: { item: BarberProfile }) => (
    <Pressable onPress={() => setSelected(b)} style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: b.avatarColor ?? COLORS.accent }]}>
        <Text style={styles.avatarText}>{b.fullName[0]}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{b.fullName}</Text>
        <Text style={styles.cardSpecialty}>{b.specialty ?? '—'}</Text>
        {b.status === 'INVITED' ? (
          <Text style={styles.invitedHint}>Awaiting first login</Text>
        ) : (
          <Text style={styles.cardShift}>{b.shiftLabel ?? '—'}</Text>
        )}
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[b.status] ?? COLORS.textMuted) + '22' }]}>
          <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[b.status] ?? COLORS.textMuted }]}>
            {b.status}
          </Text>
        </View>
        {b.commissionRate != null && (
          <Text style={styles.commission}>{b.commissionRate}% comm.</Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧔 Barbers</Text>
        <View style={styles.headerStats}>
          <Text style={styles.headerSub}>{activeCount} active</Text>
          {invitedCount > 0 && (
            <View style={styles.invitedBadge}>
              <Text style={styles.invitedBadgeText}>{invitedCount} pending</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={barbers}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          renderItem={renderBarber}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No barbers found. Use Admin → Invite Barber.</Text>
            </View>
          }
        />
      )}

      {/* Barber detail sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.sheetOverlay}>
            <ScrollView style={styles.sheet}>
              <View style={[styles.sheetAvatar, { backgroundColor: selected.avatarColor ?? COLORS.accent }]}>
                <Text style={styles.sheetAvatarText}>{selected.fullName[0]}</Text>
              </View>
              <Text style={styles.sheetName}>{selected.fullName}</Text>
              <Text style={styles.sheetUsername}>@{selected.username}</Text>

              <View style={styles.infoGrid}>
                {[
                  { label: 'Email', value: selected.email },
                  { label: 'Phone', value: selected.phone ?? '—' },
                  { label: 'Role', value: selected.role ?? '—' },
                  { label: 'Status', value: selected.status },
                  { label: 'Specialty', value: selected.specialty ?? '—' },
                  { label: 'Shift', value: selected.shiftLabel ?? '—' },
                  { label: 'Commission', value: selected.commissionRate != null ? `${selected.commissionRate}%` : '—' },
                  { label: 'Joined', value: selected.joinedOn ?? '—' },
                ].map(({ label, value }) => (
                  <View key={label} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={styles.infoValue}>{value}</Text>
                  </View>
                ))}
              </View>

              {selected.bio ? <Text style={styles.bio}>{selected.bio}</Text> : null}

              <View style={styles.sheetActions}>
                <Pressable onPress={() => setSelected(null)} style={styles.closeSheetBtn}>
                  <Text style={styles.closeSheetText}>Close</Text>
                </Pressable>
                {selected.status === 'INVITED' && (
                  <Pressable
                    onPress={() => changeStatus(selected, 'ACTIVE')}
                    disabled={actionLoading}
                    style={[styles.toggleBtn, { backgroundColor: COLORS.success }]}
                  >
                    <Text style={styles.toggleBtnText}>✓ Activate</Text>
                  </Pressable>
                )}
                {selected.status === 'ACTIVE' && (
                  <Pressable
                    onPress={() => changeStatus(selected, 'DISABLED')}
                    disabled={actionLoading}
                    style={[styles.toggleBtn, { backgroundColor: COLORS.error }]}
                  >
                    <Text style={styles.toggleBtnText}>Disable</Text>
                  </Pressable>
                )}
                {selected.status === 'DISABLED' && (
                  <Pressable
                    onPress={() => changeStatus(selected, 'ACTIVE')}
                    disabled={actionLoading}
                    style={[styles.toggleBtn, { backgroundColor: COLORS.success }]}
                  >
                    <Text style={styles.toggleBtnText}>Re-enable</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.accent },
  headerStats: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerSub: { fontSize: 12, color: COLORS.textMuted },
  invitedBadge: { backgroundColor: '#F59E0B22', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  invitedBadgeText: { fontSize: 10, fontWeight: '700', color: '#F59E0B' },
  list: { padding: SPACING.md, gap: SPACING.sm },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', gap: SPACING.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardSpecialty: { fontSize: 12, color: COLORS.textSecondary },
  cardShift: { fontSize: 11, color: COLORS.textMuted },
  invitedHint: { fontSize: 11, color: '#F59E0B', fontStyle: 'italic' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  commission: { fontSize: 11, color: COLORS.accent, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: SPACING.lg },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, maxHeight: '85%' },
  sheetAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SPACING.sm },
  sheetAvatarText: { fontSize: 36, fontWeight: '900', color: '#fff' },
  sheetName: { fontSize: 22, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  sheetUsername: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.md },
  infoGrid: { gap: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6 },
  infoLabel: { fontSize: 12, color: COLORS.textMuted },
  infoValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, maxWidth: '60%', textAlign: 'right' },
  bio: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.md, fontStyle: 'italic' },
  sheetActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl, marginBottom: SPACING.xl },
  closeSheetBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  closeSheetText: { fontWeight: '600', color: COLORS.textSecondary },
  toggleBtn: { flex: 2, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center' },
  toggleBtnText: { fontWeight: '800', color: '#fff', fontSize: 15 },
});
