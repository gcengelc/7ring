import AsyncStorage from '@react-native-async-storage/async-storage';

import { STOPS } from '@/data/stops';
import { isValidLocalPart, normalizeLocalPart } from '@/lib/format';
import type { Sighting } from '@/types';
import { ApiError, CODE_LENGTH, type RingApi } from './types';

const KEY = 'ring.local.sightings';

/**
 * Supabase anahtarları tanımlı değilken devreye giren cihaz-içi uygulama.
 *
 * Mağaza sürümünde EXPO_PUBLIC_SUPABASE_* doludur ve bu sınıf hiç
 * kullanılmaz; amacı, backend hazır olmadan da uygulamanın eksiksiz
 * denenebilmesi. Bildirimler yalnızca o cihazda görünür.
 */
export class LocalApi implements RingApi {
  /** Demo verisi: uygulama ilk açıldığında hattın makul bir anlık görüntüsü. */
  private static readonly SEED: { stopId: string; min: number; by: string }[] = [
    { stopId: 'meydan', min: 2, by: 'e.kaya' },
    { stopId: 'meydan', min: 3, by: 'm.demir' },
    { stopId: 'meydan', min: 3, by: 's.yıldız' },
    { stopId: 'meydan', min: 4, by: 'b.arslan' },
    { stopId: 'ust', min: 7, by: 'z.çelik' },
    { stopId: 'ust', min: 8, by: 'o.güneş' },
    { stopId: 'rekt', min: 13, by: 'a.polat' },
    { stopId: 'alt', min: 21, by: 'k.öztürk' },
    { stopId: 'alt', min: 22, by: 'n.şahin' },
    { stopId: 'sosyal', min: 36, by: 'i.aydın' },
    { stopId: 'festival', min: 52, by: 'd.koç' },
    { stopId: 'kuzey', min: 74, by: 'h.erdem' },
  ];

  async requestCode(email: string): Promise<void> {
    if (!isValidLocalPart(normalizeLocalPart(email))) {
      throw new ApiError('Geçerli bir öğrenci e-postası gir.');
    }
  }

  async verifyCode(_email: string, code: string): Promise<{ token: string }> {
    if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code)) {
      throw new ApiError(`Kod ${CODE_LENGTH} haneli olmalı.`);
    }
    return { token: 'local-demo-token' };
  }

  async fetchSightings(): Promise<Sighting[]> {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Sighting[];
      // Demo verisi bayatlamasın: kayıt bugüne ait değilse tohumu tazele.
      const newest = stored.reduce((max, s) => Math.max(max, s.at), 0);
      if (Date.now() - newest < 6 * 60 * 60 * 1000) return stored;
    }
    const seeded = this.seed();
    await AsyncStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  }

  async report(_token: string, stopId: string): Promise<Sighting> {
    if (!STOPS.some((s) => s.id === stopId)) throw new ApiError('Böyle bir durak yok.');
    const sighting: Sighting = {
      id: `r${Date.now()}`,
      stopId,
      at: Date.now(),
      by: 'sen',
    };
    const raw = await AsyncStorage.getItem(KEY);
    const current = raw ? (JSON.parse(raw) as Sighting[]) : [];
    await AsyncStorage.setItem(KEY, JSON.stringify([sighting, ...current]));
    return sighting;
  }

  async registerPushToken(): Promise<void> {
    // Cihaz-içi modda push gönderecek bir backend yok.
  }

  async unregisterPushToken(): Promise<void> {}

  private seed(): Sighting[] {
    const t0 = Date.now();
    return LocalApi.SEED.map((r, i) => ({
      id: `s${i}`,
      stopId: r.stopId,
      at: t0 - r.min * 60000,
      by: r.by,
    }));
  }
}
