import { freshnessScale, freshnessText } from '@/theme';
import type { Freshness } from '@/types';

/**
 * Bildirim yaşını renge ve metne çevirir.
 *
 * Eşikler ürün kararıdır: ring turu ortalama 10 dakika sürdüğü için
 * 10 dakikadan taze bildirim "hâlâ yakalanabilir" sayılır; 25 dakikadan
 * sonrası artık yer değil, geçmiş bilgisidir.
 */
export function freshness(minutes: number | null): Freshness {
  if (minutes == null) {
    return {
      level: 'none',
      color: freshnessScale.old,
      textColor: freshnessText.old,
      state: 'Bugün bildirim yok',
      ago: '—',
      phrase: 'bugün bildirim yok',
    };
  }
  if (minutes < 1) {
    return {
      level: 'now',
      color: freshnessScale.now,
      textColor: freshnessText.now,
      state: 'Şu anda burada',
      ago: 'şimdi',
      phrase: 'şimdi',
    };
  }
  if (minutes < 4) {
    return {
      level: 'now',
      color: freshnessScale.now,
      textColor: freshnessText.now,
      state: 'Şu anda burada',
      ago: `${minutes} dk`,
      phrase: `${minutes} dk önce`,
    };
  }
  if (minutes < 10) {
    return {
      level: 'recent',
      color: freshnessScale.recent,
      textColor: freshnessText.recent,
      state: 'Az önce görüldü',
      ago: `${minutes} dk`,
      phrase: `${minutes} dk önce`,
    };
  }
  if (minutes < 25) {
    return {
      level: 'fading',
      color: freshnessScale.fading,
      textColor: freshnessText.fading,
      state: 'Bir süre önce',
      ago: `${minutes} dk`,
      phrase: `${minutes} dk önce`,
    };
  }
  if (minutes < 60) {
    return {
      level: 'stale',
      color: freshnessScale.stale,
      textColor: freshnessText.stale,
      state: 'Eskimiş bildirim',
      ago: `${minutes} dk`,
      phrase: `${minutes} dk önce`,
    };
  }
  const hours = Math.round(minutes / 60);
  return {
    level: 'old',
    color: freshnessScale.old,
    textColor: freshnessText.old,
    state: 'Eski bildirim',
    ago: `${hours} sa`,
    phrase: `${hours} sa önce`,
  };
}

/** Bir bildirimin "taze" sayıldığı pencere — sıralamada da bu kullanılır. */
export const RECENT_WINDOW_MIN = 10;

export const minutesSince = (at: number, now: number): number =>
  Math.max(0, Math.round((now - at) / 60000));
