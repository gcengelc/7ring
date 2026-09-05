import type { Stop } from '@/types';

/**
 * Yeditepe kampüs ringinin tek hattı.
 *
 * Dizi sırası Duraklar sekmesindeki listeleme sırasıdır. Krokideki konumlar
 * elle eşleştirildiği için bu sıra artık güzergâh sırasını yansıtmıyor;
 * ring yönü belliyse satırları o sıraya dizmek yeterli.
 *
 * `x`/`y` krokideki yüzde konumdur (sol üst 0,0 — sağ alt 100,100), coğrafi
 * değil. Değerler kampüs krokisindeki pinlerden çıkarıldı:
 * `node scripts/prepare-route-map.mjs <kroki>` her pin için bunları basar.
 *
 * Krokide isim yazmadığı için pin → durak eşleşmesi elle yapıldı. Bir durağı
 * başka bir pine taşımak için yalnızca o satırın x/y değerlerini değiştirin;
 * id'ler sunucuyla paylaşıldığı için sabit kalmalı (server/src/index.js).
 *
 * `coords` gerçek enlem/boylamdır ve bilerek boş bırakıldı: uydurulmuş
 * koordinat, "en yakın durak" özelliğini sessizce yanlış çalıştırır.
 * Durak koordinatlarını ölçüp buraya girdiğinizde "Sadece yakın duraklar"
 * ayarı kendiliğinden etkinleşir (bkz. hasCoordinates).
 */
export const STOPS: Stop[] = [
  { id: 'ust', name: 'Üst Kapı', x: 89.6, y: 12.4, coords: null },
  { id: 'meydan', name: 'Meydan', x: 48.0, y: 26.6, coords: null },
  { id: 'rekt', name: 'Rektörlük', x: 52.9, y: 35.0, coords: null },
  { id: 'gsf', name: 'GSF Arka Kapı', x: 73.7, y: 76.7, coords: null },
  { id: 'sosyal', name: 'Sosyal Tesis', x: 70.6, y: 49.8, coords: null },
  { id: 'alt', name: 'Alt Kapı', x: 24.1, y: 37.0, coords: null },
  { id: 'festival', name: 'Festival Alanı', x: 46.9, y: 62.6, coords: null },
  { id: 'yurt', name: 'Erkek/Kız Yurdu', x: 33.3, y: 29.8, coords: null },
  { id: 'kuzey', name: 'Kuzey Kız Yurdu', x: 75.2, y: 89.4, coords: null },
];

/**
 * Krokide 10 pin var, listede 9 durak. Bu pin hiçbir durağa atanmadı;
 * eksik bir durak varsa konumu burada hazır duruyor.
 */
export const UNASSIGNED_PIN = { x: 76.7, y: 62.6 };

export const stopById = (id: string): Stop | undefined => STOPS.find((s) => s.id === id);

/** Konuma dayalı özellikler ancak her durağın koordinatı girildiğinde açılır. */
export const hasCoordinates = STOPS.every((s) => s.coords !== null);

/** Öğrenci e-postası alan adı. */
export const MAIL_DOMAIN = '@std.yeditepe.edu.tr';
