#!/usr/bin/env node
'use strict';
/*
 * Generatore icone PWA per BFT CALC.
 * Disegna il marchio: quadrato arrotondato giallo (#F4C400) con la lettera "B"
 * nera (#17181A), poi codifica PNG (RGBA) senza dipendenze esterne.
 * La stessa geometria è usata anche per icon.svg, così PNG e SVG coincidono.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const YELLOW = [0xF4, 0xC4, 0x00];
const INK = [0x17, 0x18, 0x1A];

// --- geometria del glifo "B" in un box locale 0..1 (x→destra, y→giù) ---
const G = {
  stemL: 0.14, stemR: 0.38,
  top: 0.05, bot: 0.95, mid: 0.50,
  ubowlR: 0.70, lbowlR: 0.78,
};
// rettangoli arrotondati: [x0,y0,x1,y1,r]
const U_BOWL = [G.stemL, G.top, G.ubowlR, G.mid + 0.02, 0.235];
const L_BOWL = [G.stemL, G.mid - 0.02, G.lbowlR, G.bot, 0.235];
const STEM   = [G.stemL, G.top, G.stemR, G.bot, 0.0];
const U_CNT  = [G.stemR, G.top + 0.14, G.ubowlR - 0.10, G.mid - 0.06, 0.06];
const L_CNT  = [G.stemR, G.mid + 0.06, G.lbowlR - 0.10, G.bot - 0.14, 0.06];

function inRoundRect(x, y, r) {
  const [x0, y0, x1, y1, rad] = r;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  if (rad <= 0) return true;
  const cx = Math.min(Math.max(x, x0 + rad), x1 - rad);
  const cy = Math.min(Math.max(y, y0 + rad), y1 - rad);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= rad * rad;
}

function render(size, opts) {
  const ss = 4;                 // supersampling per anti-aliasing
  const N = ss * ss;
  const g = opts.glyph;         // [gx0,gy0,gx1,gy1] area canvas per il glifo
  const bg = opts.bg;           // null => full bleed, oppure roundRect
  const buf = Buffer.alloc(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let sr = 0, sg = 0, sb = 0, cov = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = (i + (sx + 0.5) / ss) / size;
          const y = (j + (sy + 0.5) / ss) / size;
          const inBg = bg ? inRoundRect(x, y, bg) : true;
          if (!inBg) continue;
          const gu = (x - g[0]) / (g[2] - g[0]);
          const gv = (y - g[1]) / (g[3] - g[1]);
          let ink = false;
          if (gu >= 0 && gu <= 1 && gv >= 0 && gv <= 1) {
            const body = inRoundRect(gu, gv, STEM) ||
                         inRoundRect(gu, gv, U_BOWL) ||
                         inRoundRect(gu, gv, L_BOWL);
            const cnt = inRoundRect(gu, gv, U_CNT) || inRoundRect(gu, gv, L_CNT);
            ink = body && !cnt;
          }
          const c = ink ? INK : YELLOW;
          sr += c[0]; sg += c[1]; sb += c[2]; cov++;
        }
      }
      const o = (j * size + i) * 4;
      if (cov > 0) {
        buf[o] = Math.round(sr / cov);
        buf[o + 1] = Math.round(sg / cov);
        buf[o + 2] = Math.round(sb / cov);
        buf[o + 3] = Math.round((cov / N) * 255);
      }
    }
  }
  return buf;
}

// --- encoder PNG (RGBA, color type 6) ---
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, 'ascii');
  const body = Buffer.concat([tb, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtro None
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function svgIcon(opts) {
  const px = (v) => +(v * 512).toFixed(1);
  const g = opts.glyph;
  const mapX = (u) => px(g[0] + u * (g[2] - g[0]));
  const mapY = (v) => px(g[1] + v * (g[3] - g[1]));
  const sx = (g[2] - g[0]); const sy = (g[3] - g[1]);
  const rr = (r, fill) => `<rect x="${mapX(r[0])}" y="${mapY(r[1])}" width="${px((r[2]-r[0])*sx)}" height="${px((r[3]-r[1])*sy)}" rx="${px(r[4]*Math.min(sx,sy))}" fill="${fill}"/>`;
  const yellow = '#F4C400', ink = '#17181A';
  const bgEl = opts.bg
    ? `<rect x="${px(opts.bg[0])}" y="${px(opts.bg[1])}" width="${px(opts.bg[2]-opts.bg[0])}" height="${px(opts.bg[3]-opts.bg[1])}" rx="${px(opts.bg[4])}" fill="${yellow}"/>`
    : `<rect width="512" height="512" fill="${yellow}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
${bgEl}
<g fill="${ink}">${rr(STEM, ink)}${rr(U_BOWL, ink)}${rr(L_BOWL, ink)}</g>
<g fill="${yellow}">${rr(U_CNT, yellow)}${rr(L_CNT, yellow)}</g>
</svg>
`;
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const NORMAL = { glyph: [0.20, 0.09, 0.84, 0.91], bg: [0.02, 0.02, 0.98, 0.98, 0.20] };
const MASKABLE = { glyph: [0.28, 0.20, 0.72, 0.80], bg: null };

function writePNG(name, size, opts) {
  const data = encodePNG(size, render(size, opts));
  fs.writeFileSync(path.join(outDir, name), data);
  console.log('  ', name, size + 'x' + size, (data.length / 1024).toFixed(1) + ' KB');
}

console.log('Generazione icone in /icons:');
writePNG('icon-192.png', 192, NORMAL);
writePNG('icon-512.png', 512, NORMAL);
writePNG('icon-maskable-512.png', 512, MASKABLE);
writePNG('apple-touch-icon.png', 180, { glyph: [0.18, 0.10, 0.82, 0.90], bg: null });
writePNG('favicon-32.png', 32, NORMAL);
writePNG('favicon-16.png', 16, NORMAL);
fs.writeFileSync(path.join(outDir, 'icon.svg'), svgIcon(NORMAL));
console.log('   icon.svg');
console.log('Fatto.');
