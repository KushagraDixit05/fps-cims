# Phase 2 — Mobile App: Core Screens & Navigation
**Farm Prosperity Solution · React Native**
**Duration: Week 6–9**

---

## Goal
Build the mobile app's core: navigation structure, login, home dashboard, and the two primary data-entry flows (Crop Monitoring + Mandi Arrivals). The app talks to the Django backend via API. No offline sync yet — that comes in Phase 3.

---

## 2.1 — Project Structure

Organize your React Native project clearly from the start:

```
mobile/FarmProsperity/
├── src/
│   ├── api/           ← API calls to Django backend
│   │   ├── client.ts  ← axios setup
│   │   ├── auth.ts
│   │   ├── crops.ts
│   │   └── mandi.ts
│   ├── components/    ← reusable UI pieces
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── ConditionBadge.tsx
│   │   └── FormInput.tsx
│   ├── navigation/    ← screen routing
│   │   ├── AppNavigator.tsx
│   │   └── types.ts
│   ├── screens/       ← one file per screen
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── CropListScreen.tsx
│   │   ├── CropEntryFormScreen.tsx
│   │   ├── CropDetailScreen.tsx
│   │   ├── MandiListScreen.tsx
│   │   ├── MandiEntryFormScreen.tsx
│   │   ├── MandiDetailScreen.tsx
│   │   ├── ReportsScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── store/         ← app state (auth, etc.)
│   │   └── authStore.ts
│   ├── types/         ← TypeScript types
│   │   └── index.ts
│   └── utils/
│       ├── colors.ts
│       └── helpers.ts
├── App.tsx            ← entry point
└── ...
```

---

## 2.2 — TypeScript Types

Define your data shapes first. Everything else uses these.

### src/types/index.ts
```typescript
export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'field_executive' | 'admin' | 'viewer';
  region: string;
}

export interface Village {
  id: number;
  name: string;
  taluka: string;
  district: string;
  state: string;
}

export interface Farmer {
  id: number;
  name: string;
  phone_number: string;
  village: number;
  village_name?: string;
}

export type CropCondition = 'good' | 'average' | 'poor';
export type CropStage =
  | 'seedling' | 'vegetative' | 'flowering'
  | 'fruiting' | 'harvesting' | 'post_harvest';

export interface CropEntry {
  id: string;
  farmer: number;
  farmer_name?: string;
  village_name?: string;
  district?: string;
  crop_name: string;
  area_this_year: number;
  area_last_year?: number;
  sowing_date?: string;
  crop_stage: CropStage;
  crop_condition: CropCondition;
  expected_yield?: number;
  buyer_interest?: boolean;
  problem_pest: boolean;
  problem_disease: boolean;
  problem_weather: boolean;
  problem_price_concern: boolean;
  problem_other: string;
  visit_date: string;
  latitude?: number;
  longitude?: number;
  local_id?: string;
  photos?: CropPhoto[];
}

export interface CropPhoto {
  id: number;
  photo: string;
  caption: string;
}

export interface Mandi {
  id: number;
  name: string;
  district: string;
  state: string;
}

export interface MandiArrival {
  id: string;
  mandi: number;
  mandi_name?: string;
  mandi_state?: string;
  commodity: string;
  date: string;
  arrival_quantity: number;
  avg_rate?: number;
  min_rate?: number;
  max_rate?: number;
  source: 'trader' | 'farmer' | 'official';
  remark: string;
  local_id?: string;
}

export interface DashboardSummary {
  total_entries: number;
  total_acreage: number;
  by_condition: { good: number; average: number; poor: number };
}
```

---

## 2.3 — API Client Setup

### src/api/client.ts
```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your computer's IP when testing on a real phone
// For emulator: 10.0.2.2 (Android) or localhost (iOS simulator)
export const BASE_URL = 'http://10.0.2.2:8000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request automatically
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiry — refresh automatically
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });
        await AsyncStorage.setItem('access_token', data.access);
        apiClient.defaults.headers.common.Authorization = `Bearer ${data.access}`;
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### src/api/auth.ts
```typescript
import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const login = async (username: string, password: string) => {
  const { data } = await apiClient.post('/auth/login/', { username, password });
  await AsyncStorage.setItem('access_token', data.access);
  await AsyncStorage.setItem('refresh_token', data.refresh);
  return data;
};

export const logout = async () => {
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
};
```

### src/api/crops.ts
```typescript
import apiClient from './client';
import { CropEntry, DashboardSummary } from '../types';

export const getCropEntries = async () => {
  const { data } = await apiClient.get<CropEntry[]>('/crops/');
  return data;
};

export const createCropEntry = async (entry: Partial<CropEntry>) => {
  const { data } = await apiClient.post<CropEntry>('/crops/', entry);
  return data;
};

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const { data } = await apiClient.get('/crops/summary/');
  return data;
};

export const getVillages = async (search?: string) => {
  const { data } = await apiClient.get('/villages/', {
    params: search ? { search } : {},
  });
  return data;
};
```

### src/api/mandi.ts
```typescript
import apiClient from './client';
import { Mandi, MandiArrival } from '../types';

export const getMandis = async () => {
  const { data } = await apiClient.get<Mandi[]>('/mandis/');
  return data;
};

export const getMandiArrivals = async (mandiId?: number) => {
  const { data } = await apiClient.get<MandiArrival[]>('/mandi-arrivals/', {
    params: mandiId ? { mandi: mandiId } : {},
  });
  return data;
};

export const createMandiArrival = async (arrival: Partial<MandiArrival>) => {
  const { data } = await apiClient.post<MandiArrival>('/mandi-arrivals/', arrival);
  return data;
};

export const getYoYComparison = async (mandiId: number) => {
  const { data } = await apiClient.get('/mandi-arrivals/yoy_comparison/', {
    params: { mandi_id: mandiId },
  });
  return data;
};
```

---

## 2.4 — Design Tokens

### src/utils/colors.ts
```typescript
export const colors = {
  // Brand
  primary: '#1A4A2E',       // dark green
  primaryLight: '#E1F2E8',
  primaryMid: '#2A6A44',

  // Status
  good: '#1A8A3A',
  goodBg: '#E1F2E8',
  average: '#C8900A',
  averageBg: '#FEF3DA',
  poor: '#D63333',
  poorBg: '#FCEBEB',

  // Neutrals
  background: '#F8F6F1',
  surface: '#FFFFFF',
  border: '#E0DDD5',
  borderLight: '#F0EDE6',
  textPrimary: '#1A3A25',
  textSecondary: '#6A7A6A',
  textMuted: '#8A8A7A',

  // Info
  info: '#185FA5',
  infoBg: '#E6F1FB',
};
```

---

## 2.5 — Navigation Setup

### src/navigation/AppNavigator.tsx
```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../utils/colors';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CropListScreen from '../screens/CropListScreen';
import CropEntryFormScreen from '../screens/CropEntryFormScreen';
import CropDetailScreen from '../screens/CropDetailScreen';
import MandiListScreen from '../screens/MandiListScreen';
import MandiEntryFormScreen from '../screens/MandiEntryFormScreen';
import MandiDetailScreen from '../screens/MandiDetailScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom tab navigator (main app)
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        height: 60,
      },
      headerShown: false,
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{ tabBarIcon: ({ color, size }) =>
        <Icon name="home-outline" color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Crops"
      component={CropListScreen}
      options={{ tabBarIcon: ({ color, size }) =>
        <Icon name="leaf-outline" color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Mandi"
      component={MandiListScreen}
      options={{ tabBarIcon: ({ color, size }) =>
        <Icon name="storefront-outline" color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Reports"
      component={ReportsScreen}
      options={{ tabBarIcon: ({ color, size }) =>
        <Icon name="bar-chart-outline" color={color} size={size} /> }}
    />
  </Tab.Navigator>
);

// Root stack (login + main app)
const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="CropEntryForm" component={CropEntryFormScreen}
        options={{ headerShown: true, title: 'Add Crop Entry', headerTintColor: 'white',
          headerStyle: { backgroundColor: colors.primary } }} />
      <Stack.Screen name="CropDetail" component={CropDetailScreen}
        options={{ headerShown: true, title: 'Crop Detail', headerTintColor: 'white',
          headerStyle: { backgroundColor: colors.primary } }} />
      <Stack.Screen name="MandiEntryForm" component={MandiEntryFormScreen}
        options={{ headerShown: true, title: 'Add Mandi Entry', headerTintColor: 'white',
          headerStyle: { backgroundColor: colors.primary } }} />
      <Stack.Screen name="MandiDetail" component={MandiDetailScreen}
        options={{ headerShown: true, title: 'Mandi Detail', headerTintColor: 'white',
          headerStyle: { backgroundColor: colors.primary } }} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
```

---

## 2.6 — Key Screens

### src/screens/LoginScreen.tsx
```typescript
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView
} from 'react-native';
import { login } from '../api/auth';
import { colors } from '../utils/colors';

const LoginScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      navigation.replace('Main');  // Go to main app
    } catch (err: any) {
      Alert.alert('Login failed', 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.logoSection}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🌱</Text>
        </View>
        <Text style={styles.brandName}>Farm Prosperity Solution</Text>
        <Text style={styles.brandSub}>Crop Intelligence Platform</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="Enter username"
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter password"
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.buttonText}>Login →</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  logoSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoCircle: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  logoEmoji: { fontSize: 32 },
  brandName: { fontSize: 20, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  brandSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  form: { paddingBottom: 40 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, fontWeight: '500' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    padding: 14, fontSize: 15, backgroundColor: colors.surface, color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});

export default LoginScreen;
```

### src/screens/HomeScreen.tsx
```typescript
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl
} from 'react-native';
import { getDashboardSummary } from '../api/crops';
import { DashboardSummary } from '../types';
import { colors } from '../utils/colors';

const HomeScreen = ({ navigation }: any) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (e) { /* handle offline later */ }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const menuItems = [
    { title: 'Crop Monitoring', subtitle: 'Chili · Field data', emoji: '🌶️',
      screen: 'Crops', color: colors.primaryLight },
    { title: 'Mandi Arrivals', subtitle: 'Prices · Trends', emoji: '📦',
      screen: 'Mandi', color: '#FEF3DA', badge: 'Live' },
    { title: 'My Visits', subtitle: 'History · Map', emoji: '🗺️',
      screen: 'Reports', color: colors.infoBg },
    { title: 'Reports', subtitle: 'Analytics · YoY', emoji: '📊',
      screen: 'Reports', color: '#F3E8FF' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, Ramesh 👋</Text>
          <Text style={styles.role}>Field Executive</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {summary?.total_acreage?.toFixed(0) ?? '—'}
          </Text>
          <Text style={styles.statLabel}>Acres tracked</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{summary?.total_entries ?? '—'}</Text>
          <Text style={styles.statLabel}>Entries</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.good }]}>
            {summary?.by_condition.good ?? '—'}
          </Text>
          <Text style={styles.statLabel}>Good fields</Text>
        </View>
      </View>

      {/* Menu Grid */}
      <View style={styles.grid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={[styles.menuCard, { backgroundColor: item.color }]}
            onPress={() => navigation.navigate(item.screen)}
          >
            {item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
            <Text style={styles.menuEmoji}>{item.emoji}</Text>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuSub}>{item.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary, padding: 20, paddingTop: 50,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  role: { color: 'white', fontSize: 17, fontWeight: '600' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statBox: {
    flex: 1, backgroundColor: colors.primaryLight,
    borderRadius: 12, padding: 12,
    borderWidth: 0.5, borderColor: '#C8E4D4',
  },
  statValue: { fontSize: 20, fontWeight: '600', color: colors.primary },
  statLabel: { fontSize: 11, color: '#4A7A5A', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  menuCard: {
    width: '47%', borderRadius: 16, padding: 16,
    borderWidth: 0.5, borderColor: colors.border,
    minHeight: 110, position: 'relative',
  },
  badge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { color: 'white', fontSize: 9, fontWeight: '600' },
  menuEmoji: { fontSize: 26, marginBottom: 8 },
  menuTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, lineHeight: 18 },
  menuSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});

export default HomeScreen;
```

---

## 2.7 — Crop Entry Form (Multi-step)

### src/screens/CropEntryFormScreen.tsx

This is a 4-step form. Key implementation pattern:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Geolocation from 'react-native-geolocation-service';
import { createCropEntry, getVillages } from '../api/crops';
import { colors } from '../utils/colors';
import { CropEntry } from '../types';

const STEPS = ['Basic Details', 'Crop Details', 'Issues', 'Photo & Submit'];

const CropEntryFormScreen = ({ navigation }: any) => {
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<CropEntry>();

  // Get GPS location when screen loads
  useEffect(() => {
    Geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('Location error:', err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      await createCropEntry({
        ...data,
        latitude: location?.lat,
        longitude: location?.lng,
        visit_date: new Date().toISOString().split('T')[0],
      });
      Alert.alert('Success', 'Crop entry submitted!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Could not submit. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Progress dots
  const ProgressBar = () => (
    <View style={styles.progressRow}>
      {STEPS.map((s, i) => (
        <View key={s} style={[styles.dot, i === step && styles.dotActive,
          i < step && styles.dotDone]} />
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProgressBar />
      <ScrollView style={styles.scroll}>
        {/* Step 0: Basic Details */}
        {step === 0 && (
          <View>
            <Text style={styles.sectionTitle}>Basic details</Text>
            <Controller
              control={control} name="farmer" rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} placeholder="Farmer name *"
                  onChangeText={onChange} value={value?.toString()} />
              )}
            />
            {/* ... more fields ... */}
          </View>
        )}

        {/* Step 1: Crop Details */}
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Crop details</Text>
            <Controller
              control={control} name="area_this_year" rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} placeholder="Area (Acre) *"
                  keyboardType="decimal-pad" onChangeText={onChange}
                  value={value?.toString()} />
              )}
            />
            {/* Condition buttons: Good / Average / Poor */}
            <Controller
              control={control} name="crop_condition" rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.condRow}>
                  {(['good', 'average', 'poor'] as const).map((c) => (
                    <TouchableOpacity key={c}
                      style={[styles.condBtn, value === c && styles[`cond_${c}`]]}
                      onPress={() => onChange(c)}
                    >
                      <Text style={styles.condText}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>
        )}

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.secBtn} onPress={() => setStep(s => s - 1)}>
              <Text style={styles.secBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          {step < STEPS.length - 1 ? (
            <TouchableOpacity style={styles.btn} onPress={() => setStep(s => s + 1)}>
              <Text style={styles.btnText}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit(onSubmit)} disabled={submitting}
            >
              <Text style={styles.btnText}>Submit ✓</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, padding: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, padding: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C8DDD0' },
  dotActive: { width: 20, borderRadius: 3, backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.primary },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    padding: 14, fontSize: 14, backgroundColor: colors.surface,
    marginBottom: 12, color: colors.textPrimary },
  condRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  condBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surface },
  cond_good: { backgroundColor: colors.goodBg, borderColor: colors.good },
  cond_average: { backgroundColor: colors.averageBg, borderColor: colors.average },
  cond_poor: { backgroundColor: colors.poorBg, borderColor: colors.poor },
  condText: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 32 },
  btn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12,
    padding: 14, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 15, fontWeight: '600' },
  secBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 12,
    padding: 14, alignItems: 'center', backgroundColor: colors.surface },
  secBtnText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
});

export default CropEntryFormScreen;
```

---

## 2.8 — App.tsx Entry Point

```typescript
import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/utils/colors';

const App = () => (
  <>
    <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
    <AppNavigator />
  </>
);

export default App;
```

---

## 2.9 — Phase 2 Checklist

- [ ] Login screen works — JWT token stored on successful login
- [ ] Home screen loads dashboard summary from API
- [ ] Bottom tab navigation works (Home, Crops, Mandi, Reports)
- [ ] Crop list screen fetches and displays crop entries
- [ ] Crop entry form submits to backend (multi-step, all fields)
- [ ] GPS location captured automatically on form
- [ ] Mandi list screen shows arrivals with YoY color coding
- [ ] Mandi entry form submits to backend
- [ ] App tested on Android emulator
- [ ] (Mac only) App tested on iOS simulator
- [ ] Error handling: shows alert if API is unreachable

---

## What's Next
**Phase 3** — Offline-first with WatermelonDB: the app works even with no internet, and syncs when connectivity returns. This is the most technically complex phase.
