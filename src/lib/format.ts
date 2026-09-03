import { MAIL_DOMAIN } from '@/data/stops';

/** 24 saatlik yerel saat: "14:05". */
export const formatTime = (at: number): string =>
  new Date(at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

/** Metre cinsinden mesafeyi okunur hâle getirir: "180 m", "1,2 km". */
export function formatDistance(meters: number): string {
  if (meters < 950) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Kullanıcı adı kısmı geçerli mi (e-postanın @ öncesi). */
export const isValidLocalPart = (value: string): boolean =>
  /^[a-zA-Z0-9._-]{3,}$/.test(value);

/** Yazılan her şeyi tek biçime indirger: boşluk yok, alan adı tek. */
export const normalizeLocalPart = (value: string): string =>
  value.trim().replace(/\s/g, '').replace(/@.*$/, '').toLocaleLowerCase('tr-TR');

export const toEmail = (localPart: string): string => `${localPart}${MAIL_DOMAIN}`;

/** İki koordinat arası metre — haversine. */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
