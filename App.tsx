import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { confirmSignIn, fetchAuthSession, getCurrentUser, signIn, signOut } from 'aws-amplify/auth';
import { client } from './src/lib/amplify';

type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';
type AdminTab = 'overview' | 'barbers' | 'reports' | 'users';
type ReportTab = 'daily' | 'monthly';

type BarberProfile = {
  id: string;
  cognitoUsername: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'BARBER';
  status: 'INVITED' | 'ACTIVE' | 'DISABLED';
  specialty: string;
  shiftLabel: string;
  commissionRate: number;
  bio: string;
  joinedOn: string;
  avatarColor: string;
};

type RevenueEntry = {
  id: string;
  barberId: string;
  cognitoUsername: string;
  barberName: string;
  amount: number;
  serviceLabel: string;
  paymentMethod: PaymentMethod;
  notes: string;
  earnedAt: string;
};

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

type RevenueForm = {
  amount: string;
  serviceLabel: string;
  paymentMethod: PaymentMethod;
  notes: string;
};

const BRAND_NAME = 'White Beard';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

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

const emptyRevenueForm = (): RevenueForm => ({
  amount: '',
  serviceLabel: '',
  paymentMethod: 'CASH',
  notes: '',
});

const parseInvite = (url: string | null): { identifier: string; password: string } | null => {
  if (!url || !url.includes('?')) {
    return null;
  }

  const query = url.split('?')[1] ?? '';
  const params = query.split('&').reduce<Record<string, string>>((acc, pair) => {
    const [key, value] = pair.split('=');
    if (!key) {
      return acc;
    }
    acc[key] = decodeURIComponent(value ?? '');
    return acc;
  }, {});

  const identifier = params.email ?? params.username;

  if (!identifier || !params.password) {
    return null;
  }

  return {
    identifier,
    password: params.password,
  };
};

const sum = (rows: RevenueEntry[]) => rows.reduce((acc, row) => acc + row.amount, 0);

const isSameDay = (left: string, right: Date) => {
  const date = new Date(left);
  return (
    date.getFullYear() === right.getFullYear() &&
    date.getMonth() === right.getMonth() &&
    date.getDate() === right.getDate()
  );
};

const isSameMonth = (left: string, right: Date) => {
  const date = new Date(left);
  return date.getFullYear() === right.getFullYear() && date.getMonth() === right.getMonth();
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [authUsername, setAuthUsername] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authDisplayName, setAuthDisplayName] = useState<string | null>(null);
  const [groups, setGroups] = useState<string[]>([]);

  const [profiles, setProfiles] = useState<BarberProfile[]>([]);
  const [entries, setEntries] = useState<RevenueEntry[]>([]);

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [needPasswordReset, setNeedPasswordReset] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [reportTab, setReportTab] = useState<ReportTab>('daily');
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [inviteForm, setInviteForm] = useState<InviteForm>(emptyInviteForm());
  const [inviteMessage, setInviteMessage] = useState('');
  const [invitePreview, setInvitePreview] = useState<{
    username: string;
    email: string;
    inviteLink: string;
  } | null>(null);

  const [revenueForm, setRevenueForm] = useState<RevenueForm>(emptyRevenueForm());
  const [revenueMessage, setRevenueMessage] = useState('');

  const syncAuthState = async () => {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    const accessPayload = session.tokens?.accessToken.payload ?? {};
    const idPayload = session.tokens?.idToken?.payload ?? {};
    const value = (accessPayload['cognito:groups'] as string[] | undefined) ?? [];
    const email = typeof idPayload.email === 'string' ? idPayload.email : null;
    const name = typeof idPayload.name === 'string' ? idPayload.name : null;

    setAuthUsername(user.username);
    setAuthEmail(email);
    setAuthDisplayName(name ?? email ?? user.username);
    setGroups(value);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await syncAuthState();
      } catch {
        setAuthUsername(null);
        setAuthEmail(null);
        setAuthDisplayName(null);
        setGroups([]);
      } finally {
        setReady(true);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const syncInvite = (url: string | null) => {
      const invite = parseInvite(url);
      if (!invite) {
        return;
      }

      setLoginIdentifier(invite.identifier);
      setLoginPassword(invite.password);
      setLoginError('');
    };

    Linking.getInitialURL().then(syncInvite);
    const listener = Linking.addEventListener('url', (event) => syncInvite(event.url));
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (!authUsername) {
      setProfiles([]);
      setEntries([]);
      return;
    }

    const profilesSub = client.models.BarberProfile.observeQuery().subscribe({
      next: ({ items }) => {
        const mapped = items.map((item) => ({
          id: item.id,
          cognitoUsername: item.cognitoUsername,
          fullName: item.fullName,
          username: item.username,
          email: item.email,
          phone: item.phone ?? '',
          role: (item.role ?? 'BARBER') as BarberProfile['role'],
          status: (item.status ?? 'INVITED') as BarberProfile['status'],
          specialty: item.specialty ?? '',
          shiftLabel: item.shiftLabel ?? '',
          commissionRate: item.commissionRate ?? 0,
          bio: item.bio ?? '',
          joinedOn: item.joinedOn ?? '',
          avatarColor: item.avatarColor ?? '#0F766E',
        }));
        setProfiles(mapped);
        if (!selectedBarberId && mapped.length > 0) {
          setSelectedBarberId(mapped[0].id);
        }
      },
    });

    const entriesSub = client.models.RevenueEntry.observeQuery().subscribe({
      next: ({ items }) => {
        setEntries(
          items.map((item) => ({
            id: item.id,
            barberId: item.barberId,
            cognitoUsername: item.cognitoUsername,
            barberName: item.barberName,
            amount: item.amount,
            serviceLabel: item.serviceLabel,
            paymentMethod: (item.paymentMethod ?? 'CASH') as PaymentMethod,
            notes: item.notes ?? '',
            earnedAt: item.earnedAt,
          })),
        );
      },
    });

    return () => {
      profilesSub.unsubscribe();
      entriesSub.unsubscribe();
    };
  }, [authUsername, selectedBarberId]);

  const isAdmin = groups.includes('admins');
  const me = profiles.find((profile) => profile.cognitoUsername === authUsername) ?? null;
  const effectiveMe =
    me ??
    (isAdmin && authUsername
      ? {
          id: 'admin-bootstrap',
          cognitoUsername: authUsername,
          fullName: authDisplayName ?? authEmail ?? authUsername,
          username: authEmail ?? authUsername,
          email: authEmail ?? '',
          phone: '',
          role: 'ADMIN' as const,
          status: 'ACTIVE' as const,
          specialty: '',
          shiftLabel: '',
          commissionRate: 0,
          bio: '',
          joinedOn: '',
          avatarColor: '#111827',
        }
      : null);
  const barbers = profiles.filter((profile) => profile.role === 'BARBER');
  const selectedBarber = barbers.find((barber) => barber.id === selectedBarberId) ?? barbers[0] ?? null;

  const today = new Date();
  const todayEntries = entries.filter((entry) => isSameDay(entry.earnedAt, today));
  const monthEntries = entries.filter((entry) => isSameMonth(entry.earnedAt, today));

  const topPerformer = useMemo(() => {
    return barbers
      .map((barber) => ({
        barber,
        total: sum(entries.filter((entry) => entry.barberId === barber.id && isSameMonth(entry.earnedAt, today))),
      }))
      .sort((a, b) => b.total - a.total)[0];
  }, [barbers, entries, today]);

  const refreshSession = async () => {
    await syncAuthState();
  };

  const handleLogin = async () => {
    try {
      const result = await signIn({ username: loginIdentifier.trim().toLowerCase(), password: loginPassword });
      if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setNeedPasswordReset(true);
        setLoginError('Set a new password to continue.');
        return;
      }
      if (result.nextStep.signInStep !== 'DONE') {
        setLoginError(`Sign in requires extra step: ${result.nextStep.signInStep}`);
        return;
      }
      setNeedPasswordReset(false);
      setLoginError('');
      await refreshSession();
    } catch (error: any) {
      const message = error?.message ?? 'Login failed.';
      if (/incorrect username or password/i.test(message)) {
        setLoginError('Incorrect email or password. Admin users must sign in with their Cognito email address. If this user was just created in Cognito, set a permanent password first or complete the first-login password change.');
        return;
      }
      setLoginError(message);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      setLoginError('New password is required.');
      return;
    }

    try {
      const result = await confirmSignIn({ challengeResponse: newPassword });
      if (result.nextStep.signInStep !== 'DONE') {
        setLoginError(`Additional step required: ${result.nextStep.signInStep}`);
        return;
      }
      setNeedPasswordReset(false);
      setNewPassword('');
      setLoginError('');
      await refreshSession();
    } catch (error: any) {
      setLoginError(error?.message ?? 'Unable to set new password.');
    }
  };

  const handleLogout = async () => {
    await signOut();
    setAuthUsername(null);
    setAuthEmail(null);
    setAuthDisplayName(null);
    setGroups([]);
  };

  const handleInviteBarber = async () => {
    if (!inviteForm.fullName.trim() || !inviteForm.username.trim() || !inviteForm.email.trim() || !inviteForm.specialty.trim()) {
      setInviteMessage('Full name, username, email, and specialty are required.');
      return;
    }

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
        setInviteMessage(result.errors[0].message ?? 'Invitation failed.');
        return;
      }

      if (result.data) {
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
          setInviteMessage(profileResult.errors[0].message ?? 'Invitation sent but profile creation failed.');
          return;
        }

        setInvitePreview({
          username: result.data.username,
          email: result.data.email,
          inviteLink: result.data.inviteLink,
        });
      }

      setInviteForm(emptyInviteForm());
      setInviteMessage('Invitation email sent successfully.');
    } catch (error: any) {
      setInviteMessage(error?.message ?? 'Invitation failed.');
    }
  };

  const handleLogRevenue = async () => {
    if (!effectiveMe) {
      return;
    }

    const amount = Number.parseFloat(revenueForm.amount);
    if (!amount || amount <= 0 || !revenueForm.serviceLabel.trim()) {
      setRevenueMessage('Amount and service name are required.');
      return;
    }

    const result = await client.models.RevenueEntry.create({
      barberId: effectiveMe.id,
      cognitoUsername: effectiveMe.cognitoUsername,
      barberName: effectiveMe.fullName,
      amount,
      serviceLabel: revenueForm.serviceLabel.trim(),
      paymentMethod: revenueForm.paymentMethod,
      notes: revenueForm.notes.trim() || undefined,
      earnedAt: new Date().toISOString(),
    });

    if (result.errors?.length) {
      setRevenueMessage(result.errors[0].message ?? 'Failed to save revenue.');
      return;
    }

    setRevenueForm(emptyRevenueForm());
    setRevenueMessage('Revenue saved.');
  };

  if (!ready) {
    return (
      <View style={styles.centered}>
        <StatusBar style="light" />
        <Text style={styles.title}>Loading {BRAND_NAME}...</Text>
      </View>
    );
  }

  if (!authUsername) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.kicker}>Staff Login</Text>
          <Text style={styles.heading}>{BRAND_NAME} Access</Text>
          <Text style={styles.body}>Admins are created manually in Cognito and sign in with their email address. Barbers can access the system only after being invited by an admin.</Text>

          <TextInput style={styles.input} value={loginIdentifier} onChangeText={(value) => setLoginIdentifier(value.trim().toLowerCase())} placeholder="Email address" placeholderTextColor="#8a8f98" autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
          {!needPasswordReset ? (
            <TextInput style={styles.input} value={loginPassword} onChangeText={setLoginPassword} placeholder="Password" placeholderTextColor="#8a8f98" autoCapitalize="none" secureTextEntry />
          ) : (
            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Set new password" placeholderTextColor="#8a8f98" autoCapitalize="none" secureTextEntry />
          )}

          {loginError ? <Text style={styles.error}>{loginError}</Text> : null}

          {!needPasswordReset ? (
            <Pressable style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>Log in</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryButton} onPress={handleResetPassword}>
              <Text style={styles.primaryButtonText}>Save New Password</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!effectiveMe) {
    return (
      <View style={styles.centered}>
        <StatusBar style="light" />
        <Text style={styles.title}>Profile Sync In Progress</Text>
        <Text style={styles.body}>Your account exists in Auth. Admin users can continue without a profile. Barber users should ask an admin to complete the invitation flow if this persists.</Text>
      </View>
    );
  }

  if (isAdmin) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.kicker}>Admin Dashboard</Text>
              <Text style={styles.heading}>{BRAND_NAME} Admin Console</Text>
              <Text style={styles.body}>Welcome {effectiveMe.fullName.split(' ')[0]}. Admin accounts are created manually in Cognito and must be members of the admins group.</Text>
            </View>
            <Pressable style={styles.ghostButton} onPress={handleLogout}>
              <Text style={styles.ghostButtonText}>Logout</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {(['overview', 'barbers', 'reports', 'users'] as AdminTab[]).map((tab) => (
              <Pressable key={tab} style={[styles.tab, adminTab === tab && styles.tabActive]} onPress={() => setAdminTab(tab)}>
                <Text style={[styles.tabText, adminTab === tab && styles.tabTextActive]}>{tab.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          {adminTab === 'overview' ? (
            <>
              <View style={styles.grid}>
                <View style={styles.card}><Text style={styles.cardLabel}>Today</Text><Text style={styles.cardValue}>{formatCurrency(sum(todayEntries))}</Text></View>
                <View style={styles.card}><Text style={styles.cardLabel}>This Month</Text><Text style={styles.cardValue}>{formatCurrency(sum(monthEntries))}</Text></View>
                <View style={styles.card}><Text style={styles.cardLabel}>Services Today</Text><Text style={styles.cardValue}>{todayEntries.length}</Text></View>
                <View style={styles.card}><Text style={styles.cardLabel}>Top Performer</Text><Text style={styles.cardValue}>{topPerformer?.barber.fullName ?? 'N/A'}</Text></View>
              </View>
            </>
          ) : null}

          {adminTab === 'barbers' ? (
            <>
              {barbers.map((barber) => {
                const barberEntries = entries.filter((entry) => entry.barberId === barber.id);
                const barberMonth = barberEntries.filter((entry) => isSameMonth(entry.earnedAt, today));
                return (
                  <Pressable key={barber.id} style={styles.listRow} onPress={() => setSelectedBarberId(barber.id)}>
                    <View>
                      <Text style={styles.listTitle}>{barber.fullName}</Text>
                      <Text style={styles.listMeta}>{barber.specialty} · {barber.shiftLabel}</Text>
                    </View>
                    <Text style={styles.listValue}>{formatCurrency(sum(barberMonth))}</Text>
                  </Pressable>
                );
              })}

              {selectedBarber ? (
                <View style={styles.cardBlock}>
                  <Text style={styles.cardLabel}>Selected Barber Profile</Text>
                  <Text style={styles.listTitle}>{selectedBarber.fullName}</Text>
                  <Text style={styles.listMeta}>Username: {selectedBarber.username}</Text>
                  <Text style={styles.listMeta}>Email: {selectedBarber.email}</Text>
                  <Text style={styles.listMeta}>Phone: {selectedBarber.phone || '-'}</Text>
                  <Text style={styles.listMeta}>Commission: {selectedBarber.commissionRate}%</Text>
                  <Text style={styles.listMeta}>Status: {selectedBarber.status}</Text>
                </View>
              ) : null}
            </>
          ) : null}

          {adminTab === 'reports' ? (
            <>
              <View style={styles.tabs}>
                {(['daily', 'monthly'] as ReportTab[]).map((tab) => (
                  <Pressable key={tab} style={[styles.tab, reportTab === tab && styles.tabActive]} onPress={() => setReportTab(tab)}>
                    <Text style={[styles.tabText, reportTab === tab && styles.tabTextActive]}>{tab.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>

              {reportTab === 'daily'
                ? [...new Set(entries.map((entry) => entry.earnedAt.slice(0, 10)))].sort().reverse().map((day) => {
                    const dayEntries = entries.filter((entry) => entry.earnedAt.startsWith(day));
                    return (
                      <View key={day} style={styles.cardBlock}>
                        <Text style={styles.listTitle}>{day}</Text>
                        <Text style={styles.listValue}>{formatCurrency(sum(dayEntries))}</Text>
                        <Text style={styles.listMeta}>{dayEntries.length} services</Text>
                      </View>
                    );
                  })
                : [...new Set(entries.map((entry) => entry.earnedAt.slice(0, 7)))].sort().reverse().map((month) => {
                    const monthRows = entries.filter((entry) => entry.earnedAt.startsWith(month));
                    return (
                      <View key={month} style={styles.cardBlock}>
                        <Text style={styles.listTitle}>{month}</Text>
                        <Text style={styles.listValue}>{formatCurrency(sum(monthRows))}</Text>
                        <Text style={styles.listMeta}>{monthRows.length} services</Text>
                      </View>
                    );
                  })}
            </>
          ) : null}

          {adminTab === 'users' ? (
            <>
              <Text style={styles.cardLabel}>Invite Barber</Text>
              <TextInput style={styles.input} value={inviteForm.fullName} onChangeText={(value) => setInviteForm((current) => ({ ...current, fullName: value }))} placeholder="Full name" placeholderTextColor="#8a8f98" />
              <TextInput style={styles.input} value={inviteForm.username} onChangeText={(value) => setInviteForm((current) => ({ ...current, username: value }))} placeholder="Username" placeholderTextColor="#8a8f98" autoCapitalize="none" />
              <TextInput style={styles.input} value={inviteForm.email} onChangeText={(value) => setInviteForm((current) => ({ ...current, email: value }))} placeholder="Email" placeholderTextColor="#8a8f98" autoCapitalize="none" />
              <TextInput style={styles.input} value={inviteForm.phone} onChangeText={(value) => setInviteForm((current) => ({ ...current, phone: value }))} placeholder="Phone" placeholderTextColor="#8a8f98" />
              <TextInput style={styles.input} value={inviteForm.specialty} onChangeText={(value) => setInviteForm((current) => ({ ...current, specialty: value }))} placeholder="Specialty" placeholderTextColor="#8a8f98" />
              <TextInput style={styles.input} value={inviteForm.shiftLabel} onChangeText={(value) => setInviteForm((current) => ({ ...current, shiftLabel: value }))} placeholder="Shift label" placeholderTextColor="#8a8f98" />
              <TextInput style={styles.input} value={inviteForm.commissionRate} onChangeText={(value) => setInviteForm((current) => ({ ...current, commissionRate: value }))} placeholder="Commission %" placeholderTextColor="#8a8f98" keyboardType="numeric" />
              <TextInput style={[styles.input, styles.multiline]} value={inviteForm.bio} onChangeText={(value) => setInviteForm((current) => ({ ...current, bio: value }))} placeholder="Bio" placeholderTextColor="#8a8f98" multiline />

              {inviteMessage ? <Text style={styles.success}>{inviteMessage}</Text> : null}

              <Pressable style={styles.primaryButton} onPress={handleInviteBarber}>
                <Text style={styles.primaryButtonText}>Send Invitation</Text>
              </Pressable>

              {invitePreview ? (
                <View style={styles.cardBlock}>
                  <Text style={styles.listTitle}>Invitation Sent</Text>
                  <Text style={styles.listMeta}>Email: {invitePreview.email}</Text>
                  <Text style={styles.listMeta}>Username: {invitePreview.username}</Text>
                  <Text style={styles.listMeta}>Login Link: {invitePreview.inviteLink}</Text>
                </View>
              ) : null}

              <Text style={styles.body}>Admins are not invited here. Create admin users directly in Cognito and add them to the admins group.</Text>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const myEntries = entries.filter((entry) => entry.cognitoUsername === effectiveMe.cognitoUsername);
  const myToday = myEntries.filter((entry) => isSameDay(entry.earnedAt, today));
  const myMonth = myEntries.filter((entry) => isSameMonth(entry.earnedAt, today));

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.kicker}>{BRAND_NAME} Barber Workspace</Text>
            <Text style={styles.heading}>{effectiveMe.fullName}</Text>
          </View>
          <Pressable style={styles.ghostButton} onPress={handleLogout}>
            <Text style={styles.ghostButtonText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}><Text style={styles.cardLabel}>Today</Text><Text style={styles.cardValue}>{formatCurrency(sum(myToday))}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>This Month</Text><Text style={styles.cardValue}>{formatCurrency(sum(myMonth))}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>Today Services</Text><Text style={styles.cardValue}>{myToday.length}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>Month Services</Text><Text style={styles.cardValue}>{myMonth.length}</Text></View>
        </View>

        <Text style={styles.cardLabel}>Log Revenue After Each Haircut</Text>
        <TextInput style={styles.input} value={revenueForm.amount} onChangeText={(value) => setRevenueForm((current) => ({ ...current, amount: value }))} placeholder="Amount" placeholderTextColor="#8a8f98" keyboardType="decimal-pad" />
        <TextInput style={styles.input} value={revenueForm.serviceLabel} onChangeText={(value) => setRevenueForm((current) => ({ ...current, serviceLabel: value }))} placeholder="Service name" placeholderTextColor="#8a8f98" />
        <View style={styles.tabs}>
          {(['CASH', 'CARD', 'TRANSFER'] as PaymentMethod[]).map((method) => (
            <Pressable key={method} style={[styles.tab, revenueForm.paymentMethod === method && styles.tabActive]} onPress={() => setRevenueForm((current) => ({ ...current, paymentMethod: method }))}>
              <Text style={[styles.tabText, revenueForm.paymentMethod === method && styles.tabTextActive]}>{method}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={[styles.input, styles.multiline]} value={revenueForm.notes} onChangeText={(value) => setRevenueForm((current) => ({ ...current, notes: value }))} placeholder="Notes" placeholderTextColor="#8a8f98" multiline />

        {revenueMessage ? <Text style={styles.success}>{revenueMessage}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleLogRevenue}>
          <Text style={styles.primaryButtonText}>Save Revenue</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1220',
    padding: 24,
  },
  content: {
    padding: 18,
    gap: 12,
  },
  kicker: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heading: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 6,
  },
  body: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d7cabb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 14,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#f8fafc',
    fontWeight: '800',
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ghostButtonText: {
    color: '#cbd5e1',
    fontWeight: '700',
  },
  error: {
    color: '#fecaca',
    fontSize: 13,
  },
  success: {
    color: '#a7f3d0',
    fontSize: 13,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tab: {
    backgroundColor: 'rgba(248,250,252,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: '#f8fafc',
  },
  tabText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#111827',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    minWidth: 150,
    flexGrow: 1,
    backgroundColor: '#f8f4ec',
    borderRadius: 16,
    padding: 12,
  },
  cardLabel: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardValue: {
    marginTop: 6,
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f4ec',
    borderRadius: 14,
    padding: 12,
  },
  listTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  listMeta: {
    color: '#475569',
    fontSize: 13,
    marginTop: 2,
  },
  listValue: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '900',
  },
  cardBlock: {
    backgroundColor: '#f8f4ec',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
});
