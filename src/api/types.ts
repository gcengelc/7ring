import type { Sighting } from '@/types';

/**
 * Uygulamanın sunucudan beklediği tek arayüz.
 *
 * İki uygulaması var: `HttpApi` (server/ klasöründeki gerçek servis) ve
 * `LocalApi` (sunucu adresi tanımlı değilken cihaz üstünde çalışan demo).
 * Ekranlar hangisinin aktif olduğunu bilmez.
 */
export interface RingApi {
  /** Öğrenci e-postasına doğrulama kodu gönderir. */
  requestCode(email: string): Promise<void>;
  /** Kodu doğrular, oturum jetonu döner. */
  verifyCode(email: string, code: string): Promise<{ token: string }>;
  /** Bugünün tüm bildirimleri. */
  fetchSightings(token: string): Promise<Sighting[]>;
  /** Yeni bildirim gönderir, sunucunun kaydettiği hâlini döner. */
  report(token: string, stopId: string): Promise<Sighting>;
  /** Push jetonunu ve bildirim tercihlerini kaydeder. */
  registerPushToken(
    token: string,
    pushToken: string,
    prefs: { nearbyOnly: boolean; sound: boolean }
  ): Promise<void>;
  /** Push aboneliğini kaldırır. */
  unregisterPushToken(token: string, pushToken: string): Promise<void>;
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
