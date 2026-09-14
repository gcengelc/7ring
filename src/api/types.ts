import type { Sighting } from '@/types';

/**
 * Doğrulama kodunun hane sayısı. Supabase Auth'un e-posta kodu 6 hanelidir
 * (panelden 6-10 arası ayarlanabilir); demo modu da aynı uzunluğu bekler ki
 * giriş ekranı iki modda aynı görünsün.
 */
export const CODE_LENGTH = 6;

/**
 * Uygulamanın veri katmanından beklediği tek arayüz.
 *
 * İki uygulaması var: `SupabaseApi` (gerçek veri) ve `LocalApi` (Supabase
 * yapılandırılmamışken cihaz üstünde çalışan demo). Ekranlar hangisinin
 * aktif olduğunu bilmez.
 */
export interface RingApi {
  /** Öğrenci e-postasına doğrulama kodu gönderir. */
  requestCode(email: string): Promise<void>;
  /** Kodu doğrular, oturum jetonu döner. */
  verifyCode(email: string, code: string): Promise<{ token: string }>;
  /** Bugünün tüm bildirimleri. */
  fetchSightings(token: string): Promise<Sighting[]>;
  /** Yeni bildirim gönderir, kaydedilmiş hâlini döner. */
  report(token: string, stopId: string): Promise<Sighting>;
  /** Push jetonunu ve bildirim tercihlerini kaydeder. */
  registerPushToken(
    token: string,
    pushToken: string,
    prefs: { nearbyOnly: boolean; sound: boolean }
  ): Promise<void>;
  /** Push aboneliğini kaldırır. */
  unregisterPushToken(token: string, pushToken: string): Promise<void>;
  /**
   * Açılışta geçerli oturumu döner. Jetonu kendi tazeleyen uygulamalar
   * (Supabase) bunu verir; vermeyenlerde cihazda saklanan oturum kullanılır.
   */
  restoreSession?(): Promise<{ email: string; token: string } | null>;
  /** Varsa veri katmanının kendi oturumunu da kapatır. */
  signOut?(): Promise<void>;
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
