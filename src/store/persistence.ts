import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Session, Settings } from '@/types';

const SESSION_KEY = 'ring.session';
const SETTINGS_KEY = 'ring.settings';

export const DEFAULT_SETTINGS: Settings = { push: true, nearbyOnly: false, sound: false };

/**
 * Oturum jetonu Keychain/Keystore'da tutulur (expo-secure-store).
 * Web'de böyle bir kasa yok; orada AsyncStorage'a düşeriz — bu yüzden
 * web hedefi mağaza sürümü için desteklenen bir platform değildir.
 */
const secureAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = secureAvailable
      ? await SecureStore.getItemAsync(SESSION_KEY)
      : await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  const raw = JSON.stringify(session);
  if (secureAvailable) await SecureStore.setItemAsync(SESSION_KEY, raw);
  else await AsyncStorage.setItem(SESSION_KEY, raw);
}

export async function clearSession(): Promise<void> {
  if (secureAvailable) await SecureStore.deleteItemAsync(SESSION_KEY);
  else await AsyncStorage.removeItem(SESSION_KEY);
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
