import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { client } from '../../lib/amplify';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';

type InviteForm = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  specialty: string;
  shiftLabel: string;
  commissionRate: string;
  bio: string;
};

const emptyInviteForm = (): InviteForm => ({
  fullName: '',
  username: '',
  email: '',
  phone: '',
  specialty: '',
  shiftLabel: '',
  commissionRate: '40',
  bio: '',
});

export default function UsersScreen() {
  const [inviteForm, setInviteForm] = useState<InviteForm>(emptyInviteForm());
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<{ username: string; email: string; inviteLink: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleInviteBarber() {
    if (!inviteForm.fullName.trim() || !inviteForm.username.trim() || !inviteForm.email.trim() || !inviteForm.specialty.trim()) {
      setMessage('Full name, username, email, and specialty are required.');
      return;
    }

    setSaving(true);
    setMessage('');
    setPreview(null);

    try {
      const result = await client.mutations.inviteBarber({
        fullName: inviteForm.fullName.trim(),
        username: inviteForm.username.trim().toLowerCase(),
        email: inviteForm.email.trim().toLowerCase(),
        phone: inviteForm.phone.trim() || undefined,
        specialty: inviteForm.specialty.trim(),
        shiftLabel: inviteForm.shiftLabel.trim() || undefined,
        commissionRate: Number.parseFloat(inviteForm.commissionRate) || 40,
        bio: inviteForm.bio.trim() || undefined,
        avatarColor: '#0F766E',
      });

      if (result.errors?.length) {
        setMessage(result.errors[0].message ?? 'Invitation failed.');
        return;
      }

      if (!result.data) {
        setMessage('Invitation failed: no response from backend.');
        return;
      }

      const profileResult = await client.models.BarberProfile.create({
        cognitoUsername: result.data.username,
        fullName: inviteForm.fullName.trim(),
        username: result.data.username,
        email: result.data.email,
        phone: inviteForm.phone.trim() || undefined,
        role: 'BARBER',
        status: 'INVITED',
        specialty: inviteForm.specialty.trim(),
        shiftLabel: inviteForm.shiftLabel.trim() || 'Flexible shift',
        commissionRate: Number.parseFloat(inviteForm.commissionRate) || 40,
        bio: inviteForm.bio.trim() || 'New team member ready to start taking appointments.',
        joinedOn: new Date().toISOString().slice(0, 10),
        avatarColor: '#0F766E',
        invitationSentAt: new Date().toISOString(),
      });

      if (profileResult.errors?.length) {
        setMessage(profileResult.errors[0].message ?? 'Invitation sent but profile creation failed.');
        return;
      }

      setPreview({
        username: result.data.username,
        email: result.data.email,
        inviteLink: result.data.inviteLink,
      });
      setMessage('Invitation sent successfully.');
      setInviteForm(emptyInviteForm());
    } catch (error: any) {
      setMessage(error?.message ?? 'Invitation failed.');
    } finally {
      setSaving(false);
    }
  }

  function copyHint() {
    Alert.alert('Invite Link', 'Copy the invite link from the card and send it to the barber on WhatsApp.');
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Invitations</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={inviteForm.fullName}
          onChangeText={(value) => setInviteForm((current) => ({ ...current, fullName: value }))}
          placeholder="Barber full name"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={inviteForm.username}
          onChangeText={(value) => setInviteForm((current) => ({ ...current, username: value }))}
          placeholder="barber.username"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={inviteForm.email}
          onChangeText={(value) => setInviteForm((current) => ({ ...current, email: value }))}
          placeholder="barber@email.com"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={inviteForm.phone}
          onChangeText={(value) => setInviteForm((current) => ({ ...current, phone: value }))}
          placeholder="+974 xxxx xxxx"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Specialty</Text>
        <TextInput
          style={styles.input}
          value={inviteForm.specialty}
          onChangeText={(value) => setInviteForm((current) => ({ ...current, specialty: value }))}
          placeholder="Fade, Beard, Kids..."
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>Shift Label</Text>
        <TextInput
          style={styles.input}
          value={inviteForm.shiftLabel}
          onChangeText={(value) => setInviteForm((current) => ({ ...current, shiftLabel: value }))}
          placeholder="Morning Shift"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>Commission Rate (%)</Text>
        <TextInput
          style={styles.input}
          value={inviteForm.commissionRate}
          onChangeText={(value) => setInviteForm((current) => ({ ...current, commissionRate: value }))}
          placeholder="40"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={inviteForm.bio}
          onChangeText={(value) => setInviteForm((current) => ({ ...current, bio: value }))}
          placeholder="Short barber profile"
          placeholderTextColor={COLORS.textMuted}
          multiline
        />

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleInviteBarber} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.primaryButtonText}>Send Invitation</Text>}
        </Pressable>

        {preview ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Invitation Sent</Text>
            <Text style={styles.previewText}>Email: {preview.email}</Text>
            <Text style={styles.previewText}>Username: {preview.username}</Text>
            <Text style={styles.previewText}>Invite Link:</Text>
            <Text selectable style={styles.previewLink}>{preview.inviteLink}</Text>
            <Pressable style={styles.secondaryButton} onPress={copyHint}>
              <Text style={styles.secondaryButtonText}>How to share</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.accent },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.xs },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  message: { marginTop: SPACING.sm, color: COLORS.textSecondary, fontSize: 13 },
  primaryButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  primaryButtonText: { color: COLORS.primary, fontWeight: '800', fontSize: 15 },
  previewCard: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  previewTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  previewText: { color: COLORS.textSecondary, fontSize: 13 },
  previewLink: { color: COLORS.info, fontSize: 13 },
  secondaryButton: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  secondaryButtonText: { color: COLORS.textPrimary, fontWeight: '700' },
});
