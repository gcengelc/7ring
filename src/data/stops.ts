import type { Stop } from '@/types';

/**
 * Yeditepe kampüs ringinin tek hattı, ring yönünde sıralı.
 *
 * `x`/`y` hat şemasındaki yüzde konumdur — kroki çizimi için, coğrafi değil.
 *
 * `coords` gerçek enlem/boylamdır ve bilerek boş bırakıldı: uydurulmuş
 * koordinat, "en yakın durak" özelliğini sessizce yanlış çalıştırır.
 * Durak koordinatlarını ölçüp buraya girdiğinizde "Sadece yakın duraklar"
 * ayarı kendiliğinden etkinleşir (bkz. hasCoordinates).
 */
export const STOPS: Stop[] = [
  { id: 'ust', name: 'Üst Kapı', x: 18, y: 8, coords: null },
  { id: 'meydan', name: 'Meydan', x: 50, y: 8, coords: null },
  { id: 'rekt', name: 'Rektörlük', x: 82, y: 8, coords: null },
  { id: 'gsf', name: 'GSF Arka Kapı', x: 82, y: 34, coords: null },
  { id: 'sosyal', name: 'Sosyal Tesis', x: 82, y: 70, coords: null },
  { id: 'alt', name: 'Alt Kapı', x: 82, y: 92, coords: null },
  { id: 'festival', name: 'Festival Alanı', x: 50, y: 92, coords: null },
  { id: 'yurt', name: 'Erkek/Kız Yurdu', x: 18, y: 92, coords: null },
  { id: 'kuzey', name: 'Kuzey Kız Yurdu', x: 18, y: 30, coords: null },
];

export const stopById = (id: string): Stop | undefined => STOPS.find((s) => s.id === id);

/** Konuma dayalı özellikler ancak her durağın koordinatı girildiğinde açılır. */
export const hasCoordinates = STOPS.every((s) => s.coords !== null);

/** Öğrenci e-postası alan adı. */
export const MAIL_DOMAIN = '@std.yeditepe.edu.tr';
