import * as Location from 'expo-location';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { ApiError, api, isDemoMode } from '@/api';
import { STOPS, hasCoordinates, stopById } from '@/data/stops';
import { RECENT_WINDOW_MIN, freshness, minutesSince } from '@/lib/freshness';
import { distanceMeters, normalizeLocalPart, toEmail } from '@/lib/format';
import { registerForPush } from '@/lib/push';
import {
  DEFAULT_SETTINGS,
  clearSession,
  loadSession,
  loadSettings,
  saveSession,
  saveSettings,
} from '@/store/persistence';
import type { Session, Settings, Sighting, StopStatus } from '@/types';

/** Saat ve "x dk önce" değerleri bu aralıkta tazelenir. */
const TICK_MS = 10_000;
/** Bildirimleri yeniden çekme aralığı. */
const POLL_MS = 30_000;

interface AppValue {
  /** Oturum yüklenene kadar true — açılış ekranı bu sırada durur. */
  booting: boolean;
  session: Session | null;
  settings: Settings;
  /** Her durağın anlık durumu, durak sırasına göre. */
  statuses: StopStatus[];
  /** Ringin şu an olduğu tahmin edilen durak. */
  top: StopStatus;
  /** Bugün en az bir bildirim almış duraklar, en tazeden eskiye. */
  seen: StopStatus[];
  /** Kullanıcının bugün attığı bildirim sayısı. */
  myReports: number;
  /** Bu bildirim kullanıcının kendi bildirimi mi? */
  isMine(sighting: Sighting): boolean;
  /** "x dk önce" hesabında kullanılan an. */
  now: number;
  /** Son yenileme hatası; arayüzde ince bir uyarı olarak gösterilir. */
  syncError: string | null;
  refreshing: boolean;
  statusFor(stopId: string): StopStatus | undefined;
  requestCode(localPart: string): Promise<void>;
  verifyCode(code: string): Promise<void>;
  signOut(): Promise<void>;
  report(stopId: string): Promise<void>;
  refresh(): Promise<void>;
  setSetting(key: keyof Settings, value: boolean): Promise<void>;
}

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [syncError, setSyncError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [position, setPosition] = useState<Location.LocationObjectCoords | null>(null);

  /** Doğrulama kodu bekleyen e-posta — giriş akışının ikinci adımı. */
  const pendingEmail = useRef<string | null>(null);
  const pushToken = useRef<string | null>(null);

  /* ── Açılış: kayıtlı oturum ve ayarlar ─────────────────────────── */
  useEffect(() => {
    let alive = true;
    (async () => {
      const [saved, savedSettings] = await Promise.all([loadSession(), loadSettings()]);
      if (!alive) return;
      setSettings(savedSettings);

      // Supabase jetonu kendi kasasında tutar ve tazeler; orada geçerli bir
      // oturum yoksa cihazda duran kaydı da kullanmayız — yoksa kullanıcı
      // girmiş görünür ama her istek 401 döner.
      const live = api.restoreSession ? await api.restoreSession() : saved;
      if (!alive) return;
      if (live) {
        setSession(live);
        if (!saved || saved.token !== live.token) await saveSession(live);
      } else {
        setSession(null);
        if (saved) await clearSession();
      }
      if (alive) setBooting(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ── Saat: "3 dk" değerleri ekranda dururken de eskisin ────────── */
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    setRefreshing(true);
    try {
      const data = await api.fetchSightings(session.token);
      setSightings(data);
      setSyncError(null);
    } catch (err) {
      // Ağ koptuğunda elimizdeki veriyi silmeyiz; sadece uyarı gösteririz.
      setSyncError(err instanceof ApiError ? err.message : 'Bildirimler yenilenemedi.');
    } finally {
      setRefreshing(false);
      setNow(Date.now());
    }
  }, [session]);

  /* ── Bildirimleri periyodik çek; uygulama öne gelince hemen ────── */
  useEffect(() => {
    if (!session) return;
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [session, refresh]);

  /* ── Push kaydı: ayar açıkken jetonu kaydet ────────────────────── */
  useEffect(() => {
    if (!session) return;
    let alive = true;
    (async () => {
      if (settings.push) {
        const token = pushToken.current ?? (await registerForPush());
        if (!alive || !token) return;
        pushToken.current = token;
        await api
          .registerPushToken(session.token, token, {
            nearbyOnly: settings.nearbyOnly,
            sound: settings.sound,
          })
          .catch(() => undefined);
      } else if (pushToken.current) {
        await api.unregisterPushToken(session.token, pushToken.current).catch(() => undefined);
      }
    })();
    return () => {
      alive = false;
    };
  }, [session, settings.push, settings.nearbyOnly, settings.sound]);

  /* ── Konum: yalnızca "yakın duraklar" açıkken ve koordinat varsa ─ */
  useEffect(() => {
    if (!settings.nearbyOnly || !hasCoordinates) {
      setPosition(null);
      return;
    }
    let alive = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!alive || status !== 'granted') return;
      const current = await Location.getLastKnownPositionAsync().catch(() => null);
      if (alive && current) setPosition(current.coords);
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);
      if (alive && fresh) setPosition(fresh.coords);
    })();
    return () => {
      alive = false;
    };
  }, [settings.nearbyOnly]);

  /* ── Türetilmiş durum ──────────────────────────────────────────── */
  const statuses = useMemo<StopStatus[]>(() => {
    return STOPS.map((stop) => {
      const own = sightings
        .filter((s) => s.stopId === stop.id)
        .sort((a, b) => b.at - a.at);
      const newest = own[0];
      const minutesAgo = newest ? minutesSince(newest.at, now) : null;
      const recentCount = own.filter((s) => minutesSince(s.at, now) < RECENT_WINDOW_MIN).length;
      const distance =
        position && stop.coords ? distanceMeters(position, stop.coords) : null;
      return {
        stop,
        sightings: own,
        minutesAgo,
        recentCount,
        freshness: freshness(minutesAgo),
        distance,
      };
    });
  }, [sightings, now, position]);

  const statusMap = useMemo(() => {
    const map = new Map<string, StopStatus>();
    statuses.forEach((s) => map.set(s.stop.id, s));
    return map;
  }, [statuses]);

  /**
   * Ringin nerede olduğu tahmini: önce son 10 dakikadaki bildirim sayısı
   * (kalabalık onay tek bildirimden güvenilir), eşitlikte en taze bildirim.
   */
  const top = useMemo<StopStatus>(() => {
    const ranked = [...statuses].sort((a, b) => {
      if (b.recentCount !== a.recentCount) return b.recentCount - a.recentCount;
      return (a.minutesAgo ?? Infinity) - (b.minutesAgo ?? Infinity);
    });
    return ranked[0] as StopStatus;
  }, [statuses]);

  /**
   * Kendi bildirimlerimiz iki adla gelebilir: gönderim cevabında 'sen',
   * listede ise e-postanın kısa adı. İkisi de bize aittir.
   */
  const isMine = useCallback(
    (sighting: Sighting) => {
      if (sighting.by === 'sen') return true;
      if (!session) return false;
      return sighting.by === session.email.slice(0, session.email.indexOf('@'));
    },
    [session]
  );

  // Sayaç bellekte tutulmaz; listeden türetilir, böylece uygulama
  // kapanıp açıldığında da doğru kalır.
  const myReports = useMemo(
    () => sightings.filter(isMine).length,
    [sightings, isMine]
  );

  const seen = useMemo(
    () =>
      statuses
        .filter((s) => s.minutesAgo != null)
        .sort((a, b) => (a.minutesAgo as number) - (b.minutesAgo as number)),
    [statuses]
  );

  /* ── Eylemler ──────────────────────────────────────────────────── */
  const requestCode = useCallback(async (localPart: string) => {
    const email = toEmail(normalizeLocalPart(localPart));
    await api.requestCode(email);
    pendingEmail.current = email;
  }, []);

  const verifyCode = useCallback(async (code: string) => {
    const email = pendingEmail.current;
    if (!email) throw new ApiError('Önce e-posta adresini gir.');
    const { token } = await api.verifyCode(email, code);
    const next: Session = { email, token };
    await saveSession(next);
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    if (session && pushToken.current) {
      await api.unregisterPushToken(session.token, pushToken.current).catch(() => undefined);
    }
    await api.signOut?.().catch(() => undefined);
    await clearSession();
    pendingEmail.current = null;
    pushToken.current = null;
    setSession(null);
    setSightings([]);
    setSyncError(null);
  }, [session]);

  const report = useCallback(
    async (stopId: string) => {
      if (!session) throw new ApiError('Bildirim için giriş yapmalısın.');
      if (!stopById(stopId)) throw new ApiError('Böyle bir durak yok.');

      // İyimser ekleme: bildirim listede anında görünür, sonra kaydedilenle
      // değiştirilir. Gönderim başarısızsa geri alınır.
      const optimistic: Sighting = {
        id: `pending-${Date.now()}`,
        stopId,
        at: Date.now(),
        by: 'sen',
        pending: true,
      };
      setSightings((prev) => [optimistic, ...prev]);
      setNow(Date.now());

      try {
        const saved = await api.report(session.token, stopId);
        setSightings((prev) => [saved, ...prev.filter((s) => s.id !== optimistic.id)]);
      } catch (err) {
        setSightings((prev) => prev.filter((s) => s.id !== optimistic.id));
        throw err;
      }
    },
    [session]
  );

  const setSetting = useCallback(async (key: keyof Settings, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      void saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo<AppValue>(
    () => ({
      booting,
      session,
      settings,
      statuses,
      top,
      seen,
      myReports,
      isMine,
      now,
      syncError,
      refreshing,
      statusFor: (stopId: string) => statusMap.get(stopId),
      requestCode,
      verifyCode,
      signOut,
      report,
      refresh,
      setSetting,
    }),
    [
      booting,
      session,
      settings,
      statuses,
      top,
      seen,
      myReports,
      isMine,
      now,
      syncError,
      refreshing,
      statusMap,
      requestCode,
      verifyCode,
      signOut,
      report,
      refresh,
      setSetting,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp yalnızca AppProvider içinde kullanılabilir.');
  return ctx;
}

export { isDemoMode };
