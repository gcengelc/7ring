/**
 * Kampüs krokisini uygulamanın hat şeması için hazırlar.
 *
 *   node scripts/prepare-route-map.mjs <kroki.pdf|kroki.png>
 *
 * Yaptıkları:
 *   1. PDF verilmişse `sips` ile 2000px PNG'ye çevirir.
 *   2. Çizimdeki beyaz durak pinlerini bulur, konumlarını raporlar ve
 *      görselden siler — durak noktalarını uygulama kendisi çizer, çünkü
 *      noktanın rengi bildirimin tazeliğini anlatır (bkz. lib/freshness.ts).
 *   3. Lacivert zemini şeffaflaştırır; zemini uygulamadaki panel sağlar.
 *   4. Çizime kırpar, kareye tamamlar, `assets/route-map.png` olarak yazar.
 *   5. Her pin için `src/data/stops.ts` içine girilecek x/y yüzdesini basar.
 *
 * Bağımlılık yok: PNG okuma/yazma node:zlib ile yapılır.
 */
import { deflateSync, inflateSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'route-map.png');

/** Krokinin zemin rengi; bu tona yakın pikseller şeffaflaştırılır. */
const BACKGROUND = [23, 39, 75];
const BACKGROUND_TOLERANCE = 26;
/** Pin beyazı bu eşiğin üstünde sayılır. */
const WHITE_MIN = 235;
/** Bu boyuttan küçük beyaz lekeler pin değil, çizim ayrıntısıdır. */
const MIN_PIN_PIXELS = 200;
/** Çevresinde bırakılan boşluk (kırpma sonrası, piksel). */
const PADDING = 24;

/* ── PNG ──────────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

function readPng(path) {
  const buf = readFileSync(path);
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    pos += 12 + len;
  }

  if (bitDepth !== 8) throw new Error(`Yalnızca 8-bit PNG destekleniyor (bulunan: ${bitDepth}).`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`Desteklenmeyen PNG renk tipi: ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rgba = Buffer.alloc(width * height * 4);
  const line = Buffer.alloc(stride);
  let prev = Buffer.alloc(stride);
  let p = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    raw.copy(line, 0, p, p + stride);
    p += stride;

    // Satır filtrelerini geri al (PNG spec, 9.2).
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = v & 0xff;
    }
    prev = Buffer.from(line);

    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      if (channels <= 2) {
        rgba[d] = rgba[d + 1] = rgba[d + 2] = line[s];
        rgba[d + 3] = channels === 2 ? line[s + 1] : 255;
      } else {
        rgba[d] = line[s];
        rgba[d + 1] = line[s + 1];
        rgba[d + 2] = line[s + 2];
        rgba[d + 3] = channels === 4 ? line[s + 3] : 255;
      }
    }
  }
  return { width, height, rgba };
}

function writePng(path, width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ])
  );
}

/* ── görüntü işleme ───────────────────────────────────────────────── */

const isBackground = (rgba, i) =>
  rgba[i * 4 + 3] < 128 ||
  (Math.abs(rgba[i * 4] - BACKGROUND[0]) <= BACKGROUND_TOLERANCE &&
    Math.abs(rgba[i * 4 + 1] - BACKGROUND[1]) <= BACKGROUND_TOLERANCE &&
    Math.abs(rgba[i * 4 + 2] - BACKGROUND[2]) <= BACKGROUND_TOLERANCE);

/** Beyaz pinleri bağlı bileşen taramasıyla bulur. */
function findPins(width, height, rgba) {
  const isWhite = (i) =>
    rgba[i * 4 + 3] > 128 &&
    rgba[i * 4] >= WHITE_MIN &&
    rgba[i * 4 + 1] >= WHITE_MIN &&
    rgba[i * 4 + 2] >= WHITE_MIN;

  const seen = new Uint8Array(width * height);
  const pins = [];

  for (let start = 0; start < width * height; start++) {
    if (seen[start] || !isWhite(start)) continue;
    const stack = [start];
    seen[start] = 1;
    let count = 0;
    let x0 = width;
    let y0 = height;
    let x1 = -1;
    let y1 = -1;

    while (stack.length) {
      const j = stack.pop();
      count++;
      const x = j % width;
      const y = (j / width) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x > 0 && !seen[j - 1] && isWhite(j - 1)) { seen[j - 1] = 1; stack.push(j - 1); }
      if (x < width - 1 && !seen[j + 1] && isWhite(j + 1)) { seen[j + 1] = 1; stack.push(j + 1); }
      if (y > 0 && !seen[j - width] && isWhite(j - width)) { seen[j - width] = 1; stack.push(j - width); }
      if (y < height - 1 && !seen[j + width] && isWhite(j + width)) { seen[j + width] = 1; stack.push(j + width); }
    }

    if (count < MIN_PIN_PIXELS) continue;
    // Pin damla biçiminde: durağın gerçek yeri sivri ucu, yani en alt nokta.
    pins.push({ x0, y0, x1, y1, tipX: Math.round((x0 + x1) / 2), tipY: y1 });
  }

  // Yukarıdan aşağıya sırala — raporda okunması kolay olsun.
  pins.sort((a, b) => a.tipY - b.tipY || a.tipX - b.tipX);
  return pins;
}

/**
 * Pinleri siler. Pin kutusunu zeminle doldurmak yerine, kutunun kenarındaki
 * gerçek renkleri içeri doğru yayıyoruz; böylece pinin altından geçen yol
 * veya bina kenarı kabaca sürdürülür.
 */
function erasePins(width, height, rgba, pins) {
  const mask = new Uint8Array(width * height);
  for (const pin of pins) {
    const pad = 3;
    for (let y = Math.max(0, pin.y0 - pad); y <= Math.min(height - 1, pin.y1 + pad); y++) {
      for (let x = Math.max(0, pin.x0 - pad); x <= Math.min(width - 1, pin.x1 + pad); x++) {
        mask[y * width + x] = 1;
      }
    }
  }

  // Maske dışındaki komşuların ortalamasını maskeye doğru yay; her geçişte
  // kenar bir piksel içeri ilerler.
  let remaining = mask.reduce((n, v) => n + v, 0);
  const next = new Uint8Array(mask);
  let guard = 0;

  while (remaining > 0 && guard++ < 400) {
    let filled = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (!mask[i]) continue;
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const k = ny * width + nx;
          if (mask[k]) continue;
          r += rgba[k * 4]; g += rgba[k * 4 + 1]; b += rgba[k * 4 + 2]; a += rgba[k * 4 + 3];
          n++;
        }
        if (n === 0) continue;
        rgba[i * 4] = Math.round(r / n);
        rgba[i * 4 + 1] = Math.round(g / n);
        rgba[i * 4 + 2] = Math.round(b / n);
        rgba[i * 4 + 3] = Math.round(a / n);
        next[i] = 0;
        filled++;
      }
    }
    if (filled === 0) break;
    mask.set(next);
    remaining -= filled;
  }
}

/** Çizimin sınırlarını bulur (zemin ve şeffaf alan dışındaki her şey). */
function contentBounds(width, height, rgba) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isBackground(rgba, y * width + x)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { x0, y0, x1, y1 };
}

/* ── akış ─────────────────────────────────────────────────────────── */

const input = process.argv[2];
if (!input) {
  console.error('Kullanım: node scripts/prepare-route-map.mjs <kroki.pdf|kroki.png>');
  process.exit(1);
}

let pngPath = input;
if (input.toLowerCase().endsWith('.pdf')) {
  pngPath = join(ROOT, 'assets', '.route-map-source.png');
  execFileSync('sips', ['-s', 'format', 'png', '-Z', '2000', input, '--out', pngPath]);
  console.log(`PDF rasterleştirildi → ${pngPath}`);
}

const { width, height, rgba } = readPng(pngPath);
console.log(`Kaynak: ${width}×${height}`);

const pins = findPins(width, height, rgba);
console.log(`${pins.length} pin bulundu.`);

erasePins(width, height, rgba, pins);

const bounds = contentBounds(width, height, rgba);
// Kareye tamamla: uygulama görseli kare panele "contain" ile yerleştirir,
// kare olmayan kırpma pinlerin yüzde konumlarını kaydırırdı.
const cw = bounds.x1 - bounds.x0 + 1;
const ch = bounds.y1 - bounds.y0 + 1;
const side = Math.max(cw, ch) + PADDING * 2;
const offsetX = bounds.x0 - Math.round((side - cw) / 2);
const offsetY = bounds.y0 - Math.round((side - ch) / 2);

const out = Buffer.alloc(side * side * 4); // şeffaf
for (let y = 0; y < side; y++) {
  for (let x = 0; x < side; x++) {
    const sx = offsetX + x;
    const sy = offsetY + y;
    if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
    const s = sy * width + sx;
    if (isBackground(rgba, s)) continue; // zemin şeffaf kalır
    const d = (y * side + x) * 4;
    out[d] = rgba[s * 4];
    out[d + 1] = rgba[s * 4 + 1];
    out[d + 2] = rgba[s * 4 + 2];
    out[d + 3] = rgba[s * 4 + 3];
  }
}

writePng(OUT, side, side, out);
console.log(`Yazıldı: assets/route-map.png (${side}×${side})`);

console.log('\nsrc/data/stops.ts için pin konumları (yukarıdan aşağıya):');
pins.forEach((pin, i) => {
  const x = ((pin.tipX - offsetX) / side) * 100;
  const y = ((pin.tipY - offsetY) / side) * 100;
  console.log(`  ${String(i + 1).padStart(2)}. x: ${x.toFixed(1)}, y: ${y.toFixed(1)}`);
});
