import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Sighting } from '@/types';
import { ApiError, type RingApi } from './types';

const SESSION_EXPIRED = 'Oturumun sona ermiş. Tekrar giriş yap.';

/**
 * Supabase'e konuşan istemci — şema supabase/migrations altında.
 *
 * Giriş Supabase Auth'un e-posta OTP akışıyla yapılır. Oturumu (erişim ve
 * yenileme jetonu) Supabase istemcisi kendisi saklar ve yeniler; bu yüzden
 * arayüzün taşıdığı `token` parametresi burada kullanılmaz, yalnızca
 * AppProvider'ın "oturum açık mı" işareti olarak kalır.
 *
 * Bildirim ekleme ve push kaydı doğrudan tabloya değil RPC'ye gider:
 * bekleme süresi, durak kontrolü ve alan adı kısıtı sunucuda uygulanır.
 */
export class SupabaseApi implements RingApi {
  private readonly client: SupabaseClient;

  constructor(
    url: string,
    anonKey: string,
    readonly codeLength: number
  ) {
    this.client = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    // React Native'de sekme görünürlüğü yok; jeton yenileme döngüsünü
    // uygulamanın ön planda olup olmamasına bağlarız.
    if (Platform.OS !== 'web') {
      if (AppState.currentState === 'active') void this.client.auth.startAutoRefresh();
      AppState.addEventListener('change', (state) => {
        if (state === 'active') void this.client.auth.startAutoRefresh();
        else void this.client.auth.stopAutoRefresh();
      });
    }
  }

  async requestCode(email: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (!error) return;
    if (error.status === 429) throw new ApiError('Yeni kod için bir dakika bekle.', 429);
    if (!error.status) throw new ApiError('Sunucuya ulaşılamadı. Bağlantını kontrol et.');
    throw new ApiError('Kod gönderilemedi. Tekrar dene.', error.status);
  }

  async verifyCode(email: string, code: string): Promise<{ token: string }> {
    const { data, error } = await this.client.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error || !data.session) {
      if (error?.status === 429) throw new ApiError('Çok fazla denedin. Yeni kod iste.', 429);
      if (error && !error.status) throw new ApiError('Sunucuya ulaşılamadı. Bağlantını kontrol et.');
      throw new ApiError('Kod hatalı ya da süresi dolmuş.', error?.status);
    }
    return { token: data.session.access_token };
  }

  async fetchSightings(): Promise<Sighting[]> {
    await this.requireSession();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.client
      .from('sightings')
      .select('id, stop_id, by_name, at')
      .gte('at', dayAgo)
      .order('at', { ascending: false });
    if (error) throw toApiError(error);
    return (data as SightingRow[]).map((r) => ({
      id: r.id,
      stopId: r.stop_id,
      at: Date.parse(r.at),
      by: r.by_name,
    }));
  }

  async report(_token: string, stopId: string): Promise<Sighting> {
    await this.requireSession();
    const { data, error } = await this.client.rpc('report_sighting', { p_stop_id: stopId });
    if (error) throw toApiError(error);
    const row = data as SightingRow;
    return { id: row.id, stopId: row.stop_id, at: Date.parse(row.at), by: 'sen' };
  }

  async registerPushToken(
    _token: string,
    pushToken: string,
    prefs: { nearbyOnly: boolean; sound: boolean }
  ): Promise<void> {
    await this.requireSession();
    const { error } = await this.client.rpc('register_push_token', {
      p_push_token: pushToken,
      p_nearby_only: prefs.nearbyOnly,
      p_sound: prefs.sound,
    });
    if (error) throw toApiError(error);
  }

  async unregisterPushToken(_token: string, pushToken: string): Promise<void> {
    await this.requireSession();
    const { error } = await this.client.rpc('unregister_push_token', { p_push_token: pushToken });
    if (error) throw toApiError(error);
  }

  async signOut(): Promise<void> {
    // Yalnızca bu cihazın oturumunu kapat; diğer cihazlar açık kalsın.
    await this.client.auth.signOut({ scope: 'local' });
  }

  private async requireSession(): Promise<void> {
    const { data } = await this.client.auth.getSession();
    if (!data.session) throw new ApiError(SESSION_EXPIRED, 401);
  }
}

interface SightingRow {
  id: string;
  stop_id: string;
  by_name: string;
  at: string;
}

/**
 * Veritabanı fonksiyonları kullanıcıya gösterilecek hataları `RN` ile
 * başlayan SQLSTATE koduyla atar (bkz. migration); onların mesajı olduğu
 * gibi gösterilir, geri kalanı genel bir metne çevrilir.
 */
function toApiError(error: PostgrestError): ApiError {
  if (error.code?.startsWith('RN')) return new ApiError(error.message);
  if (error.code === 'PGRST301' || error.code === 'PGRST303') {
    return new ApiError(SESSION_EXPIRED, 401);
  }
  if (!error.code) return new ApiError('Bağlantı kurulamadı. Daha sonra tekrar dene.');
  return new ApiError('Sunucuda bir sorun var. Birazdan tekrar dene.');
}
