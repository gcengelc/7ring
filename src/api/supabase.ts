import { supabase } from '@/lib/supabase';
import type { Sighting } from '@/types';
import { ApiError, type RingApi } from './types';

/** Uygulama yalnızca "bugünü" gösterir. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Supabase'in `sightings` görünümünden dönen satır. */
interface Row {
  id: string;
  stop_id: string;
  by_name: string;
  at: string;
}

const toSighting = (row: Row): Sighting => ({
  id: row.id,
  stopId: row.stop_id,
  at: Date.parse(row.at),
  by: row.by_name,
});

/**
 * Doğrudan Supabase'e konuşan istemci: Auth (e-posta tek kullanımlık kod),
 * Postgres (bildirimler, push jetonları) ve push için Edge Function.
 *
 * Arada kendi sunucumuz yok. Yazma işlemleri RLS'e ek olarak RPC'lerden geçer
 * (`report_sighting`, `register_push_token`): durak doğrulaması, bekleme
 * süresi ve kısa ad üretimi orada tek yerde durur — bkz. supabase/migrations.
 *
 * Oturum jetonu supabase-js'in kendi kasasında (bkz. lib/supabase.ts) tutulur
 * ve otomatik tazelenir; bu yüzden arayüzdeki `token` parametreleri burada
 * kullanılmaz, yalnızca RingApi imzasını korumak için durur.
 */
export class SupabaseApi implements RingApi {
  private get client() {
    if (!supabase) throw new ApiError('Supabase yapılandırılmamış.');
    return supabase;
  }

  async requestCode(email: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw authError(error.message, error.status);
  }

  async verifyCode(email: string, code: string): Promise<{ token: string }> {
    const { data, error } = await this.client.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    if (error) throw authError(error.message, error.status);
    const token = data.session?.access_token;
    if (!token) throw new ApiError('Oturum açılamadı. Tekrar dene.');
    return { token };
  }

  /** Açılışta: kasadaki oturum hâlâ geçerliyse kullanıcıyı tekrar sormadan içeri al. */
  async restoreSession(): Promise<{ email: string; token: string } | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error || !data.session?.user.email) return null;
    return { email: data.session.user.email, token: data.session.access_token };
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async fetchSightings(): Promise<Sighting[]> {
    const since = new Date(Date.now() - DAY_MS).toISOString();
    const { data, error } = await this.client
      .from('sightings')
      .select('id, stop_id, by_name, at')
      .gte('at', since)
      .order('at', { ascending: false });
    if (error) throw dataError(error, 'Bildirimler yenilenemedi.');
    return (data as Row[]).map(toSighting);
  }

  async report(_token: string, stopId: string): Promise<Sighting> {
    const { data, error } = await this.client
      .rpc('report_sighting', { p_stop_id: stopId })
      .single();
    if (error) throw dataError(error, 'Bildirim gönderilemedi.');
    return { ...toSighting(data as Row), by: 'sen' };
  }

  async registerPushToken(
    _token: string,
    pushToken: string,
    prefs: { nearbyOnly: boolean; sound: boolean }
  ): Promise<void> {
    const { error } = await this.client.rpc('register_push_token', {
      p_push_token: pushToken,
      p_nearby_only: prefs.nearbyOnly,
      p_sound: prefs.sound,
    });
    if (error) throw dataError(error, 'Bildirim ayarı kaydedilemedi.');
  }

  async unregisterPushToken(_token: string, pushToken: string): Promise<void> {
    const { error } = await this.client
      .from('push_tokens')
      .delete()
      .eq('push_token', pushToken);
    if (error) throw dataError(error, 'Bildirim ayarı kaydedilemedi.');
  }
}

/**
 * Supabase Auth hataları İngilizce ve teknik gelir; kullanıcıya kendi
 * dilimizde ve kısa göstermek için eşleştiriyoruz.
 */
function authError(message: string, status?: number): ApiError {
  const text = message.toLowerCase();
  if (text.includes('expired')) return new ApiError('Kodun süresi doldu. Yeni kod iste.', status);
  if (text.includes('invalid') && text.includes('token')) {
    return new ApiError('Kod hatalı.', status);
  }
  if (text.includes('rate limit') || status === 429) {
    return new ApiError('Çok sık denedin. Biraz bekle.', 429);
  }
  if (text.includes('not authorized') || text.includes('invalid email')) {
    return new ApiError('Geçerli bir öğrenci e-postası gir.', status);
  }
  return new ApiError('Kod gönderilemedi. Tekrar dene.', status);
}

/**
 * Veri hataları. RPC'lerin `raise exception` ile verdiği mesajlar zaten
 * Türkçe ve kullanıcıya gösterilebilir (SQLSTATE P0001); gerisi için
 * genel bir metin kullanırız.
 */
function dataError(
  error: { message: string; code?: string },
  fallback: string
): ApiError {
  if (error.code === 'P0001') return new ApiError(error.message);
  if (error.code === 'PGRST301' || error.code === '42501') {
    return new ApiError('Oturumun sona ermiş. Tekrar giriş yap.', 401);
  }
  return new ApiError(fallback);
}
