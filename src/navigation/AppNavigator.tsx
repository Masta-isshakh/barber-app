import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import POSScreen from '../screens/pos/POSScreen';
import AppointmentsScreen from '../screens/appointments/AppointmentsScreen';
import BarbersScreen from '../screens/barbers/BarbersScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import CustomersScreen from '../screens/customers/CustomersScreen';
import { COLORS } from '../constants/colors';

export type RootStackParamList = {
  AdminTabs: undefined;
};

export type AdminTabParamList = {
  POS: undefined;
  Appointments: undefined;
  Barbers: undefined;
  Reports: undefined;
  Customers: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AdminTabParamList>();

function tabIcon(routeName: string, focused: boolean): string {
  const icons: Record<string, [string, string]> = {
    POS: ['💈', '💈'],
    Appointments: ['📅', '📅'],
    Barbers: ['🧔', '🧔'],
    Reports: ['📊', '📊'],
    Customers: ['👥', '👥'],
  };
  return icons[routeName]?.[focused ? 0 : 1] ?? '•';
}

function AdminTabs() {
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
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20 }}>{tabIcon(route.name, focused)}</Text>
        ),
      })}
    >
      <Tab.Screen name="POS" component={POSScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
      <Tab.Screen name="Barbers" component={BarbersScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
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
