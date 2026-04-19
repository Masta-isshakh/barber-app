import React from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

export default function AccountScreen() {
  const { authDisplayName, authUsername, isAdmin, onLogout } = useAuth();

  function confirmLogout() {
    Alert.alert('Sign out', 'Do you want to sign out now?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: onLogout },
    ]);
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{authDisplayName ?? authUsername ?? 'Unknown user'}</Text>

        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{isAdmin ? 'Admin' : 'Barber'}</Text>

        <Pressable style={styles.signOutButton} onPress={confirmLogout}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  signOutButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
