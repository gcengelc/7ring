/**
 * Tasarım jetonları — Claude Design kaynağından (Ring Nerede.dc.html) birebir.
 * Uygulamanın her rengi ve tipografisi buradan gelir; ekranlarda çıplak hex yazılmaz.
 */

export const colors = {
  /** Sahne / uygulama zemini */
  app: '#F6F3ED',
  /** Liste satırı, kart yüzeyi */
  card: '#FFFDF9',
  /** Ayırıcı çizgi ve liste arka planı */
  hairline: '#E4DFD5',
  /** Birincil marka rengi */
  navy: '#0E2A4F',
  /** Vurgu / eylem rengi */
  amber: '#F0A81E',
  /** Ana metin */
  ink: '#101E33',
  /** İkincil metin */
  muted: '#8C8578',
  /** Üçüncül işaretler (chevron vb.) */
  faint: '#B4ADA0',
  /** Pasif sekme */
  tabIdleBg: '#EAE5DB',
  tabIdleFg: '#6E6862',
  /** İkincil buton dolgusu */
  subtle: '#F1EDE5',
  /** Kapalı anahtar rayı */
  switchOff: '#DCD6CA',

  /** Lacivert zemin üzerindeki metin katmanları */
  onNavy: '#F6F3ED',
  onNavy75: 'rgba(246,243,237,0.75)',
  onNavy62: 'rgba(246,243,237,0.62)',
  onNavy55: 'rgba(246,243,237,0.55)',
  onNavy45: 'rgba(246,243,237,0.45)',
  onNavy35: 'rgba(246,243,237,0.35)',
  onNavy22: 'rgba(246,243,237,0.22)',
  onNavy14: 'rgba(246,243,237,0.14)',
  onNavy08: 'rgba(246,243,237,0.08)',

  scrim: 'rgba(16,30,51,0.42)',
} as const;

/**
 * Tazelik skalası: bildirim eskidikçe amberden griye soluyor.
 * Ana ekrandaki lejantın ("Renk soldukça bildirim eskiyor") karşılığı.
 */
export const freshnessScale = {
  now: '#F0A81E',
  recent: '#D69B32',
  fading: '#BFA05C',
  stale: '#B6AFA2',
  old: '#CFC9BC',
} as const;

export const freshnessText = {
  now: '#101E33',
  recent: '#101E33',
  fading: '#4A4640',
  stale: '#8C8578',
  old: '#A8A196',
} as const;

/** Instrument Sans aileleri — _layout.tsx içinde yüklenir. */
export const fonts = {
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
} as const;

export const radius = {
  row: 18,
  card: 20,
  panel: 26,
  sheet: 28,
  control: 14,
  action: 17,
  pill: 9,
} as const;

export const spacing = {
  screenX: 22,
  gutter: 16,
} as const;

/** Küçük etiketler: 12px, geniş harf aralığı, büyük harf. */
export const eyebrow = {
  fontFamily: fonts.regular,
  fontSize: 12,
  letterSpacing: 1.68,
  textTransform: 'uppercase' as const,
  color: colors.muted,
};
