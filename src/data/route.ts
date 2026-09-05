import type { ImageSourcePropType } from 'react-native';

/**
 * Hat şemasının görseli. Değiştirilecek tek yer burasıdır.
 *
 * Şu an kullanılan görsel `assets/route-map.png`: kampüs krokisinden
 * üretildi. Krokiyi güncellemek için yeni çizimi şu komuta verin —
 * pinleri siler, zemini şeffaflaştırır, kareye kırpar ve her pin için
 * `stops.ts` içine girilecek x/y yüzdesini basar:
 *
 *     node scripts/prepare-route-map.mjs <yeni-kroki.pdf|png>
 *
 * Durak noktaları ve renkleri görselin ÜSTÜNE uygulama tarafından çizilir
 * (renk = bildirim tazeliği), bu yüzden görselde pin bulunmaz.
 *
 * ROUTE_IMAGE null yapılırsa aşağıdaki SVG yolu çizilir.
 */
export const ROUTE_IMAGE: ImageSourcePropType | null = require('../../assets/route-map.png');

/**
 * Krokinin en-boy oranı (genişlik / yükseklik).
 *
 * Görsel panele `contain` ile yerleşir, yani panel oranı farklıysa kenarlarda
 * boşluk kalır. Durak noktaları panele değil çizimin gerçek kutusuna göre
 * konumlanmalı; bu oran o kutuyu hesaplamak için gerekli. Krokiyi
 * değiştirdiğinizde `scripts/prepare-route-map.mjs` yeni değeri basar.
 */
export const ROUTE_IMAGE_ASPECT = 0.5639;

/**
 * Geçici şemanın kapalı güzergâh çizgisi (viewBox "0 0 100 100").
 * ROUTE_IMAGE tanımlıysa kullanılmaz.
 */
export const ROUTE_PATH =
  'M18,8 L82,8 L82,34 L60,52 L82,70 L82,92 L18,92 L18,66 L38,48 L18,30 Z';
