import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import type { Customer } from '../../types';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await client.models.Customer.list();
      const data = (result.data ?? []) as unknown as Customer[];
      data.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setCustomers(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.fullName.trim()) { Alert.alert('Name is required'); return; }
    setSaving(true);
    try {
      await client.models.Customer.create({
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
        totalVisits: 0,
        totalSpent: 0,
      });
      setForm({ fullName: '', phone: '', email: '', notes: '' });
      setShowForm(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search),
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 Customers</Text>
        <Pressable onPress={() => setShowForm(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or phone…"
          placeholderTextColor={COLORS.textMuted}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: c }) => (
            <View style={styles.card}>
              <View style={styles.cardAvatar}>
                <Text style={styles.cardAvatarText}>{c.fullName[0].toUpperCase()}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{c.fullName}</Text>
                {c.phone ? <Text style={styles.cardPhone}>📞 {c.phone}</Text> : null}
                {c.email ? <Text style={styles.cardEmail}>✉️ {c.email}</Text> : null}
              </View>
              <View style={styles.cardStats}>
                <Text style={styles.cardVisits}>{c.totalVisits ?? 0} visits</Text>
                <Text style={styles.cardSpent}>QR {c.totalSpent ?? 0}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{search ? 'No matches' : 'No customers yet'}</Text>
            </View>
          }
        />
      )}

      {/* New customer form */}
      {showForm && (
        <View style={styles.formOverlay}>
          <View style={styles.formSheet}>
            <Text style={styles.formTitle}>New Customer</Text>
            {[
              { key: 'fullName', label: 'Full Name *', placeholder: 'Customer name', keyboard: 'default' },
              { key: 'phone', label: 'Phone', placeholder: '+974 xxxx xxxx', keyboard: 'phone-pad' },
              { key: 'email', label: 'Email', placeholder: 'email@example.com', keyboard: 'email-address' },
              { key: 'notes', label: 'Notes', placeholder: 'Allergies, preferences…', keyboard: 'default' },
            ].map(({ key, label, placeholder, keyboard }) => (
              <View key={key} style={{ marginBottom: SPACING.sm }}>
                <Text style={styles.formLabel}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                  placeholder={placeholder}
                  keyboardType={keyboard as any}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            ))}
            <View style={styles.formActions}>
              <Pressable onPress={() => setShowForm(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={save} disabled={saving} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </Pressable>
            </View>
          </View>
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
  searchRow: { backgroundColor: COLORS.card, padding: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInput: { backgroundColor: COLORS.bg, borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs + 2, fontSize: 14, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  list: { padding: SPACING.md, gap: SPACING.sm },
  card: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', gap: SPACING.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { fontSize: 18, fontWeight: '800', color: COLORS.accent },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardPhone: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardEmail: { fontSize: 12, color: COLORS.textSecondary },
  cardStats: { alignItems: 'flex-end' },
  cardVisits: { fontSize: 11, color: COLORS.textMuted },
  cardSpent: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: COLORS.textMuted },
  formOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  formSheet: { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg },
  formTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.md },
  formLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.sm, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.bg },
  formActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  cancelBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 2, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.accent, alignItems: 'center' },
  saveText: { fontWeight: '800', color: COLORS.primary },
});
