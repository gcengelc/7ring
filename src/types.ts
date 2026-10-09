/** Kampüs hattındaki tek bir durak. */
export interface Stop {
  id: string;
  name: string;
  /** Hat şemasındaki konum, yüzde (0-100). Gerçek koordinat değildir. */
  x: number;
  y: number;
  /**
   * Gerçek kampüs koordinatı. "Sadece yakın duraklar" ayarı ancak
   * tüm duraklar için doldurulduğunda etkinleşir — bkz. src/data/stops.ts.
   */
  coords: { latitude: number; longitude: number } | null;
}

/** Bir öğrencinin "ringi burada gördüm" bildirimi. */
export interface Sighting {
  id: string;
  stopId: string;
  /** Epoch ms. */
  at: number;
  /** Bildirimi atan öğrencinin kısa adı; kendi bildiriminde 'sen'. */
  by: string;
  /** Sunucudan gelmeyip henüz gönderilememiş bildirimler. */
  pending?: boolean;
}

/**
 * Bir durağa ringin tek bir uğrayışı. Art arda gelen bildirimler (bkz.
 * src/lib/visits.ts) tek ziyarette toplanır; ringler ayırt edilemediği için
 * "hangi ring" değil "ne zaman, kaç kişi" bilinir.
 */
export interface Visit {
  /** İlk ve son bildirimin zamanı, epoch ms. `end` en yenisidir. */
  start: number;
  end: number;
  /** Ziyareti bildiren farklı öğrenci sayısı. */
  reporters: number;
  /** Birden fazla farklı öğrenci bildirdiyse true. */
  confirmed: boolean;
}

export type FreshnessLevel = 'none' | 'now' | 'recent' | 'fading' | 'stale' | 'old';

export interface Freshness {
  level: FreshnessLevel;
  /** Nokta ve vurgu rengi. */
  color: string;
  /** Aynı tazelikteki metnin rengi. */
  textColor: string;
  /** "Şu anda burada", "Eskimiş bildirim" gibi durum etiketi. */
  state: string;
  /** Kısa süre: "3 dk", "2 sa", "şimdi". */
  ago: string;
  /** Cümle içinde kullanılan hâli: "3 dk önce". */
  phrase: string;
}

/** Bir durağın o anki özeti. */
export interface StopStatus {
  stop: Stop;
  sightings: Sighting[];
  /** Son bildirimin kaç dakika önce olduğu; hiç yoksa null. */
  minutesAgo: number | null;
  /** En son ziyaret (art arda bildirimler tek ziyaret); hiç yoksa null. */
  lastVisit: Visit | null;
  /**
   * Son 10 dakikada doğrulanmış, yani birden fazla öğrencinin bildirdiği
   * bir ziyaret var mı. Sıralamada tek bildirimin önüne geçer.
   */
  confirmedRecently: boolean;
  freshness: Freshness;
  /** Kullanıcının konumuna metre cinsinden uzaklık; hesaplanamıyorsa null. */
  distance: number | null;
}

export interface Session {
  email: string;
  token: string;
}

export interface Settings {
  /** Yeni ring bildirimlerinde push gönderilsin mi. */
  push: boolean;
  /** Yalnızca yakındaki durakların bildirimleri. */
  nearbyOnly: boolean;
  /** Bildirim sesi. */
  sound: boolean;
}
