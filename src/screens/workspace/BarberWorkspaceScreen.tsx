import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

type TabNav = BottomTabNavigationProp<{
  Workspace: undefined;
  POS: undefined;
  Appointments: undefined;
  Shifts: undefined;
  Notifications: undefined;
  Account: undefined;
}>;

export default function BarberWorkspaceScreen() {
  const navigation = useNavigation<TabNav>();
  const { authDisplayName, authUsername } = useAuth();

  const firstName = useMemo(() => {
    const value = authDisplayName ?? authUsername ?? 'Barber';
    return value.split(' ')[0] ?? value;
  }, [authDisplayName, authUsername]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Barber Workspace</Text>
        <Text style={styles.title}>Welcome, {firstName}</Text>
        <Text style={styles.subtitle}>
          Manage your day with clean focus: check requests, run POS, and update appointments.
        </Text>
      </View>

      <View style={styles.grid}>
        <Pressable style={styles.card} onPress={() => navigation.navigate('Notifications')}>
          <View style={styles.cardIconWrap}><Ionicons name="notifications-outline" size={20} color={COLORS.primary} /></View>
          <Text style={styles.cardTitle}>Requests & Notifications</Text>
          <Text style={styles.cardBody}>Approve new requests and track important updates.</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => navigation.navigate('POS')}>
          <View style={styles.cardIconWrap}><Ionicons name="card-outline" size={20} color={COLORS.primary} /></View>
          <Text style={styles.cardTitle}>Start POS</Text>
          <Text style={styles.cardBody}>Create tickets, complete payments, and issue receipts.</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => navigation.navigate('Appointments')}>
          <View style={styles.cardIconWrap}><Ionicons name="calendar-outline" size={20} color={COLORS.primary} /></View>
          <Text style={styles.cardTitle}>My Appointments</Text>
          <Text style={styles.cardBody}>View and update only your own booking schedule.</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => navigation.navigate('Shifts')}>
          <View style={styles.cardIconWrap}><Ionicons name="time-outline" size={20} color={COLORS.primary} /></View>
          <Text style={styles.cardTitle}>My Shift</Text>
          <Text style={styles.cardBody}>Open or close your shift and track daily status.</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EEF1F6', padding: SPACING.md, gap: SPACING.md },
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#2A2F4E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  kicker: { color: '#94A3B8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '900', marginTop: 6 },
  subtitle: { color: '#CBD5E1', fontSize: 14, lineHeight: 20, marginTop: SPACING.xs, maxWidth: 520 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  card: {
    minWidth: 220,
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.accent + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: COLORS.primary, fontWeight: '800', fontSize: 15 },
  cardBody: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
});
