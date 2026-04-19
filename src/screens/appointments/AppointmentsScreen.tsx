import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { client } from '../../lib/amplify';
import { useBarbers } from '../../hooks/useBarbers';
import { useServices } from '../../hooks/useServices';
import { useAppointments } from '../../hooks/useAppointments';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import type { Appointment, AppointmentStatus } from '../../types';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: COLORS.info,
  IN_PROGRESS: COLORS.warning,
  COMPLETED: COLORS.success,
  CANCELLED: COLORS.textMuted,
  NO_SHOW: COLORS.error,
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function AppointmentsScreen() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const { appointments, loading, refetch } = useAppointments(selectedDate);
  const { barbers } = useBarbers();
  const { services } = useServices();

  // booking form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    barberId: '',
    barberName: '',
    customerName: '',
    customerPhone: '',
    scheduledAt: `${selectedDate}T10:00:00.000Z`,
    notes: '',
    selectedServiceIds: [] as string[],
    selectedServiceNames: [] as string[],
    totalAmount: 0,
    durationMinutes: 0,
  });
  const [saving, setSaving] = useState(false);

  function toggleService(svc: { id: string; name: string; price: number; durationMinutes: number }) {
    setForm((prev) => {
      const already = prev.selectedServiceIds.includes(svc.id);
      const ids = already
        ? prev.selectedServiceIds.filter((x) => x !== svc.id)
        : [...prev.selectedServiceIds, svc.id];
      const names = already
        ? prev.selectedServiceNames.filter((x) => x !== svc.name)
        : [...prev.selectedServiceNames, svc.name];
      const total = already ? prev.totalAmount - svc.price : prev.totalAmount + svc.price;
      const dur = already
        ? prev.durationMinutes - svc.durationMinutes
        : prev.durationMinutes + svc.durationMinutes;
      return { ...prev, selectedServiceIds: ids, selectedServiceNames: names, totalAmount: total, durationMinutes: dur };
    });
  }

  async function saveAppointment() {
    if (!form.barberId) { Alert.alert('Select a barber'); return; }
    if (!form.customerName) { Alert.alert('Enter customer name'); return; }
    if (form.selectedServiceIds.length === 0) { Alert.alert('Select at least one service'); return; }
    setSaving(true);
    try {
      await client.models.Appointment.create({
        barberId: form.barberId,
        barberName: form.barberName,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        scheduledAt: form.scheduledAt,
        status: 'SCHEDULED',
        serviceIds: form.selectedServiceIds,
        serviceNames: form.selectedServiceNames,
        totalAmount: form.totalAmount,
        durationMinutes: form.durationMinutes,
        notes: form.notes,
      });
      setShowForm(false);
      setForm({
        barberId: '', barberName: '', customerName: '', customerPhone: '',
        scheduledAt: `${selectedDate}T10:00:00.000Z`, notes: '',
        selectedServiceIds: [], selectedServiceNames: [], totalAmount: 0, durationMinutes: 0,
      });
      refetch();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(appt: Appointment, status: AppointmentStatus) {
    try {
      await client.models.Appointment.update({ id: appt.id, status });
      refetch();
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Appointments</Text>
        <Pressable onPress={() => setShowForm(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Book</Text>
        </Pressable>
      </View>

      {/* Date selector */}
      <View style={styles.dateRow}>
        {[-1, 0, 1, 2, 3].map((offset) => {
          const d = new Date();
          d.setDate(d.getDate() + offset);
          const str = d.toISOString().split('T')[0];
          const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-QA', { weekday: 'short', day: 'numeric' });
          return (
            <Pressable
              key={str}
              onPress={() => setSelectedDate(str)}
              style={[styles.datePill, selectedDate === str && styles.datePillActive]}
            >
              <Text style={[styles.datePillText, selectedDate === str && styles.datePillTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: appt }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardTime}>
                  {new Date(appt.scheduledAt).toLocaleTimeString('en-QA', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[appt.status] }]} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardCustomer}>{appt.customerName ?? 'Walk-in'}</Text>
                {appt.customerPhone ? (
                  <Text style={styles.cardPhone}>{appt.customerPhone}</Text>
                ) : null}
                <Text style={styles.cardServices}>{(appt.serviceNames ?? []).join(', ')}</Text>
                <Text style={styles.cardBarber}>🧔 {appt.barberName}</Text>
                {appt.totalAmount ? (
                  <Text style={styles.cardAmount}>QR {appt.totalAmount}</Text>
                ) : null}
              </View>
              <View style={styles.cardActions}>
                {appt.status === 'SCHEDULED' && (
                  <Pressable onPress={() => updateStatus(appt, 'IN_PROGRESS')} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>▶ Start</Text>
                  </Pressable>
                )}
                {appt.status === 'IN_PROGRESS' && (
                  <Pressable
                    onPress={() => updateStatus(appt, 'COMPLETED')}
                    style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                  >
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>✓ Done</Text>
                  </Pressable>
                )}
                {(appt.status === 'SCHEDULED' || appt.status === 'IN_PROGRESS') && (
                  <Pressable onPress={() => updateStatus(appt, 'CANCELLED')} style={[styles.actionBtn, { backgroundColor: COLORS.error + '22' }]}>
                    <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Cancel</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No appointments for this day</Text>
            </View>
          }
        />
      )}

      {/* Booking form */}
      {showForm && (
        <View style={styles.formOverlay}>
          <ScrollView style={styles.formSheet} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.formTitle}>New Appointment</Text>

            <Text style={styles.formLabel}>Barber *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
                {barbers.map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => setForm((p) => ({ ...p, barberId: b.id, barberName: b.fullName }))}
                    style={[styles.chipSelect, form.barberId === b.id && styles.chipSelectActive]}
                  >
                    <Text style={styles.chipSelectText}>{b.fullName.split(' ')[0]}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.formLabel}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              value={form.customerName}
              onChangeText={(v) => setForm((p) => ({ ...p, customerName: v }))}
              placeholder="Customer name"
            />

            <Text style={styles.formLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={form.customerPhone}
              onChangeText={(v) => setForm((p) => ({ ...p, customerPhone: v }))}
              placeholder="+974 xxxx xxxx"
              keyboardType="phone-pad"
            />

            <Text style={styles.formLabel}>Time (ISO)</Text>
            <TextInput
              style={styles.input}
              value={form.scheduledAt}
              onChangeText={(v) => setForm((p) => ({ ...p, scheduledAt: v }))}
            />

            <Text style={styles.formLabel}>Services *</Text>
            <View style={styles.servicesChipsWrap}>
              {services.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => toggleService(s)}
                  style={[styles.chipSelect, form.selectedServiceIds.includes(s.id) && styles.chipSelectActive]}
                >
                  <Text style={styles.chipSelectText}>{s.name} — QR {s.price}</Text>
                </Pressable>
              ))}
            </View>

            {form.totalAmount > 0 && (
              <Text style={styles.formTotalPreview}>
                Total: QR {form.totalAmount} · {form.durationMinutes} min
              </Text>
            )}

            <Text style={styles.formLabel}>Notes</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              value={form.notes}
              onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
              placeholder="Any notes..."
              multiline
            />

            <View style={styles.formActions}>
              <Pressable onPress={() => setShowForm(false)} style={styles.cancelFormBtn}>
                <Text style={styles.cancelFormText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveAppointment} disabled={saving} style={styles.saveFormBtn}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveFormText}>Book Appointment</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}
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
  addBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  addBtnText: { fontWeight: '700', color: COLORS.primary },
  dateRow: { flexDirection: 'row', gap: SPACING.xs, padding: SPACING.sm, backgroundColor: COLORS.card },
  datePill: { paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  datePillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  datePillText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  datePillTextActive: { color: COLORS.primary },
  list: { padding: SPACING.md, gap: SPACING.sm },
  card: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLeft: { width: 56, alignItems: 'center', justifyContent: 'flex-start', gap: 6, paddingTop: 4 },
  cardTime: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardBody: { flex: 1, paddingHorizontal: SPACING.xs },
  cardCustomer: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardPhone: { fontSize: 11, color: COLORS.textMuted },
  cardServices: { fontSize: 12, color: COLORS.info, marginTop: 2 },
  cardBarber: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  cardAmount: { fontSize: 13, fontWeight: '700', color: COLORS.accent, marginTop: 2 },
  cardActions: { gap: SPACING.xs, justifyContent: 'center' },
  actionBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm, backgroundColor: COLORS.info + '22' },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.info },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: COLORS.textMuted },
  formOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  formSheet: { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, maxHeight: '90%' },
  formTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.md },
  formLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginTop: SPACING.sm, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.sm, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.bg },
  chipSelect: { paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  chipSelectActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipSelectText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  servicesChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  formTotalPreview: { fontSize: 14, fontWeight: '700', color: COLORS.accent, marginTop: SPACING.xs },
  formActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelFormBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  cancelFormText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveFormBtn: { flex: 2, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.accent, alignItems: 'center' },
  saveFormText: { fontWeight: '800', color: COLORS.primary },
});
