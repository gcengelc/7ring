import type { Sighting, Visit } from '@/types';

/**
 * Aynı durakta art arda gelen bildirimler arasındaki en büyük boşluk (dk).
 * Ring durakta yaklaşık bir dakika bekler; bundan uzun sessizlik sonrası gelen
 * bildirim yeni bir geçiştir. Okulda aynı anda iki ring döndüğü ve ikisi
 * birbirinden ayırt edilemediği için ringi değil, durağa her uğrayışı
 * ("ziyaret") sayarız.
 */
export const VISIT_GAP_MIN = 2;

/** Bir ziyaretin "doğrulandı" sayılması için gereken farklı öğrenci sayısı. */
export const CONFIRM_MIN_REPORTERS = 2;

/**
 * Tek bir durağın bildirimlerini ziyaretlere böler, en yeni ziyaret başta.
 *
 * Güven, ziyarete katkı veren **farklı** öğrenci sayısıdır: aynı kişinin
 * tekrar basması ya da iki kez bildirmesi onay sayılmaz. `reporterOf`,
 * aynı kişinin farklı adlarla gelebildiği durumları (gönderim cevabında
 * 'sen', listede e-posta adı) tek kimliğe indirger.
 */
export function groupVisits(
  sightings: Sighting[],
  reporterOf: (s: Sighting) => string = (s) => s.by
): Visit[] {
  const sorted = [...sightings].sort((a, b) => b.at - a.at);
  const gap = VISIT_GAP_MIN * 60000;
  const visits: Visit[] = [];
  let names = new Set<string>();

  for (const s of sorted) {
    const current = visits[visits.length - 1];
    if (current && current.start - s.at <= gap) {
      current.start = s.at;
    } else {
      names = new Set<string>();
      visits.push({ start: s.at, end: s.at, reporters: 0, confirmed: false });
    }
    const visit = visits[visits.length - 1] as Visit;
    names.add(reporterOf(s));
    visit.reporters = names.size;
    visit.confirmed = names.size >= CONFIRM_MIN_REPORTERS;
  }
  return visits;
}
