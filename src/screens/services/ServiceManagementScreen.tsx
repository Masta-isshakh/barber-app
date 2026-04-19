import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { client } from '../../lib/amplify';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import { CATEGORY_LABELS } from '../../constants/services';
import type { ServiceCategory, ServiceItem } from '../../types';
import { writeAuditLog } from '../../lib/audit';

const categories: ServiceCategory[] = ['HAIRCUT', 'BEARD', 'COMBO', 'KIDS', 'TREATMENT', 'OTHER'];

type ServiceForm = {
  id?: string;
  name: string;
  nameAr: string;
  price: string;
  durationMinutes: string;
  category: ServiceCategory;
  sortOrder: string;
};

const emptyForm = (): ServiceForm => ({
  name: '',
  nameAr: '',
  price: '',
  durationMinutes: '30',
  category: 'HAIRCUT',
  sortOrder: '99',
});

export default function ServiceManagementScreen() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ServiceForm>(emptyForm());

  async function fetchServices() {
    setLoading(true);
    try {
      const result = await client.models.ServiceItem.list();
      const rows = ((result.data ?? []) as unknown as ServiceItem[]).sort(
        (a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99),
      );
      setServices(rows);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServices();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.nameAr ?? '').toLowerCase().includes(q),
    );
  }, [services, query]);

  function openCreate() {
    setForm(emptyForm());
    setModalVisible(true);
  }

  function openEdit(service: ServiceItem) {
    setForm({
      id: service.id,
      name: service.name,
      nameAr: service.nameAr ?? '',
      price: String(service.price),
      durationMinutes: String(service.durationMinutes),
      category: service.category,
      sortOrder: String(service.sortOrder ?? 99),
    });
    setModalVisible(true);
  }

  async function saveService() {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Service name is required.');
      return;
    }
    const price = Number.parseFloat(form.price);
    const duration = Number.parseInt(form.durationMinutes, 10);
    const sortOrder = Number.parseInt(form.sortOrder, 10);

    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert('Validation', 'Price must be greater than 0.');
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      Alert.alert('Validation', 'Duration must be greater than 0 minutes.');
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await client.models.ServiceItem.update({
          id: form.id,
          name: form.name.trim(),
          nameAr: form.nameAr.trim() || undefined,
          price,
          durationMinutes: duration,
          category: form.category,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : 99,
        });
        await writeAuditLog({
          action: 'SERVICE_UPDATED',
          entityType: 'ServiceItem',
          entityId: form.id,
          actorRole: 'ADMIN',
          message: `Updated service ${form.name}`,
          metadata: { category: form.category, price, duration },
        });
      } else {
        const created = await client.models.ServiceItem.create({
          name: form.name.trim(),
          nameAr: form.nameAr.trim() || undefined,
          price,
          durationMinutes: duration,
          category: form.category,
          isActive: true,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : 99,
        });
        await writeAuditLog({
          action: 'SERVICE_CREATED',
          entityType: 'ServiceItem',
          entityId: (created.data as any)?.id,
          actorRole: 'ADMIN',
          message: `Created service ${form.name}`,
          metadata: { category: form.category, price, duration },
        });
      }

      setModalVisible(false);
      setForm(emptyForm());
      fetchServices();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save service');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(service: ServiceItem) {
    const next = !service.isActive;
    try {
      await client.models.ServiceItem.update({ id: service.id, isActive: next });
      await writeAuditLog({
        action: 'SERVICE_STATUS_CHANGED',
        entityType: 'ServiceItem',
        entityId: service.id,
        actorRole: 'ADMIN',
        message: `${service.name} is now ${next ? 'ACTIVE' : 'INACTIVE'}`,
        metadata: { from: service.isActive, to: next },
      });
      fetchServices();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update status');
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Management</Text>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search services..."
          placeholderTextColor={COLORS.textMuted}
        />
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
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                {!!item.nameAr && <Text style={styles.sub}>{item.nameAr}</Text>}
                <Text style={styles.sub}>{CATEGORY_LABELS[item.category]} · {item.durationMinutes} min</Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.price}>QR {item.price}</Text>
                <View style={[styles.badge, { backgroundColor: item.isActive ? COLORS.success + '22' : COLORS.error + '22' }]}>
                  <Text style={[styles.badgeText, { color: item.isActive ? COLORS.success : COLORS.error }]}>
                    {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable style={styles.smallBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.smallBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.smallBtn, { backgroundColor: item.isActive ? COLORS.error : COLORS.success }]}
                    onPress={() => toggleActive(item)}
                  >
                    <Text style={[styles.smallBtnText, { color: '#fff' }]}>{item.isActive ? 'Disable' : 'Enable'}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{form.id ? 'Edit Service' : 'New Service'}</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />

            <Text style={styles.label}>Arabic Name (optional)</Text>
            <TextInput style={styles.input} value={form.nameAr} onChangeText={(v) => setForm((p) => ({ ...p, nameAr: v }))} />

            <Text style={styles.label}>Category</Text>
            <View style={styles.catWrap}>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.catChip, form.category === cat && styles.catChipActive]}
                  onPress={() => setForm((p) => ({ ...p, category: cat }))}
                >
                  <Text style={[styles.catChipText, form.category === cat && styles.catChipTextActive]}>{CATEGORY_LABELS[cat]}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Price (QAR)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={form.price}
              onChangeText={(v) => setForm((p) => ({ ...p, price: v }))}
            />

            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={form.durationMinutes}
              onChangeText={(v) => setForm((p) => ({ ...p, durationMinutes: v }))}
            />

            <Text style={styles.label}>Sort Order</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={form.sortOrder}
              onChangeText={(v) => setForm((p) => ({ ...p, sortOrder: v }))}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={saveService} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.accent },
  addBtn: { backgroundColor: COLORS.accent, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.md },
  addBtnText: { color: COLORS.primary, fontWeight: '800' },
  searchWrap: { padding: SPACING.sm, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border },
  searchInput: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: 8, color: COLORS.textPrimary },
  list: { padding: SPACING.md, gap: SPACING.sm },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, flexDirection: 'row', gap: SPACING.sm },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  price: { fontSize: 14, fontWeight: '900', color: COLORS.accent },
  badge: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: SPACING.xs },
  smallBtn: { backgroundColor: COLORS.border, paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.sm },
  smallBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.sm },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginTop: SPACING.sm, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: 10, color: COLORS.textPrimary, backgroundColor: COLORS.bg },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  catChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 6, backgroundColor: COLORS.bg },
  catChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  catChipText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700' },
  catChipTextActive: { color: COLORS.primary },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: SPACING.sm },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  saveBtn: { flex: 2, backgroundColor: COLORS.accent, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: SPACING.sm },
  saveText: { color: COLORS.primary, fontWeight: '800' },
});
