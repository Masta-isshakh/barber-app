import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import POSScreen from '../screens/pos/POSScreen';
import AppointmentsScreen from '../screens/appointments/AppointmentsScreen';
import BarbersScreen from '../screens/barbers/BarbersScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import CustomersScreen from '../screens/customers/CustomersScreen';
import UsersScreen from '../screens/users/UsersScreen';
import AccountScreen from '../screens/account/AccountScreen';
import ServiceManagementScreen from '../screens/services/ServiceManagementScreen';
import ShiftScreen from '../screens/shifts/ShiftScreen';
import AuditLogsScreen from '../screens/audit/AuditLogsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

export type RootStackParamList = {
  AdminTabs: undefined;
};

export type AdminTabParamList = {
  POS: undefined;
  Appointments: undefined;
  Barbers: undefined;
  Reports: undefined;
  Customers: undefined;
  Services: undefined;
  Shifts: undefined;
  Notifications: undefined;
  Users: undefined;
  Audit: undefined;
  Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AdminTabParamList>();

function tabIconName(routeName: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    POS: 'card-outline',
    Appointments: 'calendar-outline',
    Barbers: 'people-outline',
    Reports: 'analytics-outline',
    Customers: 'person-circle-outline',
    Services: 'pricetags-outline',
    Shifts: 'time-outline',
    Notifications: 'notifications-outline',
    Users: 'person-add-outline',
    Audit: 'document-text-outline',
    Account: 'settings-outline',
  };
  return icons[routeName] ?? 'ellipse-outline';
}

function AdminTabs() {
  const { isAdmin } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.primary,
          borderTopColor: '#2a2a4a',
          paddingBottom: 4,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={tabIconName(route.name)} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="POS" component={POSScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
      {isAdmin ? <Tab.Screen name="Barbers" component={BarbersScreen} /> : null}
      <Tab.Screen name="Shifts" component={ShiftScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      {isAdmin ? <Tab.Screen name="Reports" component={ReportsScreen} /> : null}
      {isAdmin ? <Tab.Screen name="Customers" component={CustomersScreen} /> : null}
      {isAdmin ? <Tab.Screen name="Services" component={ServiceManagementScreen} /> : null}
      {isAdmin ? <Tab.Screen name="Users" component={UsersScreen} /> : null}
      {isAdmin ? <Tab.Screen name="Audit" component={AuditLogsScreen} /> : null}
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

type Props = {
  // Pass the navigation container a ref or just use as wrapper
};

export default function AppNavigator(_: Props) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
