/**
 * Mağaza görsellerini üretir: icon, adaptive-icon, splash, notification-icon.
 *
 * Bağımlılık yok — PNG'leri doğrudan zlib ile yazıyoruz. Marka işareti,
 * uygulamanın kendi göstergesi: lacivert zemin üzerinde amber bir konum
 * noktası ve etrafında genişleyen iki halka ("ring burada").
 *
 * Çalıştır: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

const NAVY = [0x0e, 0x2a, 0x4f];
const AMBER = [0xf0, 0xa8, 0x1e];
const CREAM = [0xf6, 0xf3, 0xed];

/** RGBA piksel tamponunu PNG dosyasına çevirir. */
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filtre: none
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
  ihdr[8] = 8; // bit derinliği
  ihdr[9] = 6; // renk tipi: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

/**
 * İşareti çizer. Kenar yumuşatma için her pikselde 3x3 örnekleme yapılır.
 * @param {number} size kenar uzunluğu
 * @param {object} opts
 */
function drawMark(size, { background, dotColor, ringColor, scale = 1, alphaBg = 255 }) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const unit = (size / 2) * scale;

  const dotR = unit * 0.155;
  const rings = [
    { r: unit * 0.38, w: unit * 0.032, a: 0.62 },
    { r: unit * 0.60, w: unit * 0.026, a: 0.34 },
  ];

  const SS = 3; // örnekleme ızgarası
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const d = Math.hypot(px - cx, py - cy);

          let color = background;
          let alpha = alphaBg;

          for (const ring of rings) {
            if (Math.abs(d - ring.r) <= ring.w) {
              color = mix(color, ringColor, ring.a, alpha === 0);
              alpha = Math.max(alpha, Math.round(255 * ring.a));
            }
          }
          if (d <= dotR) {
            color = dotColor;
            alpha = 255;
          }

          r += color[0];
          g += color[1];
          b += color[2];
          a += alpha;
        }
      }

      const n = SS * SS;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = Math.round(a / n);
    }
  }
  return rgba;
}

/** Şeffaf zeminde halkalar kendi rengini korur; dolu zeminde harmanlanır. */
function mix(base, over, amount, transparentBase) {
  if (transparentBase) return over;
  return [
    Math.round(base[0] + (over[0] - base[0]) * amount),
    Math.round(base[1] + (over[1] - base[1]) * amount),
    Math.round(base[2] + (over[2] - base[2]) * amount),
  ];
}

function write(name, size, opts) {
  const png = encodePng(size, size, drawMark(size, opts));
  writeFileSync(join(ASSETS, name), png);
  console.log(`${name.padEnd(24)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} KB`);
}

mkdirSync(ASSETS, { recursive: true });

// App Store / Play Store ikonu — köşeler platform tarafından yuvarlanır.
write('icon.png', 1024, { background: NAVY, dotColor: AMBER, ringColor: CREAM, scale: 0.92 });

// Android uyarlanabilir ikon: ön plan katmanı, güvenli alan için %62 ölçek.
write('adaptive-icon.png', 1024, {
  background: NAVY,
  dotColor: AMBER,
  ringColor: CREAM,
  scale: 0.62,
  alphaBg: 0,
});

// Açılış ekranı işareti — zemin rengi app.json'dan gelir.
write('splash.png', 512, { background: NAVY, dotColor: AMBER, ringColor: CREAM, alphaBg: 0 });

// Android bildirim ikonu: siluet, sistem tarafından tek renge indirilir.
write('notification-icon.png', 192, {
  background: NAVY,
  dotColor: CREAM,
  ringColor: CREAM,
  scale: 0.8,
  alphaBg: 0,
});

// Play Store liste görseli olarak da kullanılabilecek 512'lik kopya.
write('play-store-icon.png', 512, { background: NAVY, dotColor: AMBER, ringColor: CREAM, scale: 0.92 });
