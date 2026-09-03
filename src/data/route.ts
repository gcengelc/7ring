import type { ImageSourcePropType } from 'react-native';

/**
 * Hat şemasının görseli. Değiştirilecek tek yer burasıdır.
 *
 * İKİ SEÇENEK:
 *
 * 1) Kendi çiziminizi kullanın (önerilen).
 *    Çizimi `assets/route-map.png` olarak kaydedin ve aşağıdaki satırı açın:
 *
 *      export const ROUTE_IMAGE = require('../../assets/route-map.png');
 *
 *    Görsel, lacivert panele `resizeMode: contain` ile yerleşir. Şeffaf
 *    zeminli PNG en iyi sonucu verir; koyu zemin üzerinde açık renk çizgi
 *    kullanın. Önerilen ölçü: 1000×1000 (kare), en az 2x çözünürlük.
 *
 *    Sonra `src/data/stops.ts` içindeki her durağın `x`/`y` yüzdelerini
 *    çiziminizdeki konumlara göre güncelleyin: sol üst köşe (0,0),
 *    sağ alt köşe (100,100). Durak noktaları ve renkleri görselin
 *    üstüne uygulama tarafından çizilir — çiziminize nokta koymayın.
 *
 * 2) Görsel yoksa aşağıdaki SVG yolu çizilir (şu anki geçici şema).
 */
export const ROUTE_IMAGE: ImageSourcePropType | null = null;

/**
 * Geçici şemanın kapalı güzergâh çizgisi (viewBox "0 0 100 100").
 * ROUTE_IMAGE tanımlıysa kullanılmaz.
 */
export const ROUTE_PATH =
  'M18,8 L82,8 L82,34 L60,52 L82,70 L82,92 L18,92 L18,66 L38,48 L18,30 Z';
