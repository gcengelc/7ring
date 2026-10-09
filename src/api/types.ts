import type { Sighting } from '@/types';

/**
 * Uygulamanın sunucudan beklediği tek arayüz.
 *
 * Üç uygulaması var: `SupabaseApi` (supabase/ klasöründeki şema),
 * `HttpApi` (server/ klasöründeki servis) ve `LocalApi` (arka uç tanımlı
 * değilken cihaz üstünde çalışan demo). Ekranlar hangisinin aktif olduğunu
 * bilmez.
 */
export interface RingApi {
  /** E-postayla gelen doğrulama kodunun hane sayısı. */
  readonly codeLength: number;
  /** Öğrenci e-postasına doğrulama kodu gönderir. */
  requestCode(email: string): Promise<void>;
  /** Kodu doğrular, oturum jetonu döner. */
  verifyCode(email: string, code: string): Promise<{ token: string }>;
  /** Bugünün tüm bildirimleri. */
  fetchSightings(token: string): Promise<Sighting[]>;
  /** Yeni bildirim gönderir, sunucunun kaydettiği hâlini döner. */
  report(token: string, stopId: string): Promise<Sighting>;
  /** Başkasının bildirimini "yanlış" diye şikayet eder. */
  flagSighting(token: string, sightingId: string): Promise<void>;
  /** Hesabı ve tüm verisini kalıcı olarak siler. */
  deleteAccount(token: string): Promise<void>;
  /** Push jetonunu ve bildirim tercihlerini kaydeder. */
  registerPushToken(
    token: string,
    pushToken: string,
    prefs: { nearbyOnly: boolean; sound: boolean }
  ): Promise<void>;
  /** Push aboneliğini kaldırır. */
  unregisterPushToken(token: string, pushToken: string): Promise<void>;
  /** Bu cihazdaki oturumu sunucu tarafında da kapatır. */
  signOut(token: string): Promise<void>;
}

/** Kullanıcıya gösterilebilir hata — mesajı doğrudan arayüzde çıkar. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
