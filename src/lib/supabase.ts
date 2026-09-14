import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** İkisi de tanımlıysa uygulama gerçek veriyle çalışır; değilse demo moduna düşer. */
export const supabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/**
 * Oturum kasası.
 *
 * Jeton Keychain/Keystore'da durmalı (projenin geri kalanı da öyle yapıyor),
 * ama SecureStore'un değer sınırı ~2 KB ve Supabase oturumu (access + refresh
 * jetonu, kullanıcı nesnesi) bunu aşabiliyor. Bu yüzden değer parçalara
 * bölünüp `<key>.0`, `<key>.1` ... olarak yazılır; `<key>` parça sayısını
 * tutar. Okurken parçalar birleştirilir.
 *
 * Web'de böyle bir kasa yok, orada AsyncStorage'a düşeriz — web zaten
 * desteklenen bir mağaza hedefi değil (bkz. store/persistence.ts).
 */
const CHUNK = 1536;
const secureAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

const chunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const head = await SecureStore.getItemAsync(key);
    if (head === null) return null;
    const count = Number(head);
    if (!Number.isInteger(count) || count < 1) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      // Parçalardan biri kayıpsa oturum okunamaz sayılır; kullanıcı tekrar girer.
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    await chunkedSecureStore.removeItem(key);
    const count = Math.max(1, Math.ceil(value.length / CHUNK));
    for (let i = 0; i < count; i += 1) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    await SecureStore.setItemAsync(key, String(count));
  },

  async removeItem(key: string): Promise<void> {
    const head = await SecureStore.getItemAsync(key);
    const count = Number(head);
    if (Number.isInteger(count) && count > 0) {
      for (let i = 0; i < count; i += 1) {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      }
    }
    await SecureStore.deleteItemAsync(key);
  },
};

const storage = secureAvailable ? chunkedSecureStore : AsyncStorage;

/**
 * Tek Supabase istemcisi. Yapılandırma yoksa oluşturulmaz — çağıran taraf
 * `supabaseConfigured` ile kontrol eder (src/api/index.ts).
 */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        // Derin bağlantıyla gelen oturum yok; giriş tek kullanımlık kodla.
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Jeton tazeleme yalnızca uygulama önplandayken çalışsın; arkaplanda
 * zamanlayıcı tutmak pil yakar ve Supabase bunu önermiyor.
 */
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
  if (AppState.currentState === 'active') void supabase.auth.startAutoRefresh();
}
