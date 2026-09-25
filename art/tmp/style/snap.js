// Snap a chunky AI pixel-art picture (drawn on roughly an N x N grid) back to its real pixels.
// node snap.js in.png out_prefix --n 48 [--colors 48]
// Finds the cell size near width/N and the phase where colour edges line up, takes the median colour of each
// cell's middle, drops the flat background (flood from the border), merges near-duplicate colours, crops.
const PNG = require('/Users/yseer/Code/midnight-cabinet/tools/art/png.js');
const args = process.argv.slice(2), inFile = args[0], out = args[1];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? +args[i + 1] : d; };
const N = opt('n', 0), K = opt('colors', 48);
const { w, h, data } = PNG.read(inFile), n = w * h;
const lum = new Float32Array(n); for (let i = 0; i < n; i++) lum[i] = data[i * 4] * 0.3 + data[i * 4 + 1] * 0.59 + data[i * 4 + 2] * 0.11;
const med = (a) => { const s = a.slice().sort((p, q) => p - q); return s[s.length >> 1]; };

// grid: edge strength per column / row, best period within ±25% of w/N, best phase
function prof(vert) { const L = vert ? w : h, p = new Float64Array(L); for (let y = 1; y < h; y++) for (let x = 1; x < w; x++) { const i = y * w + x; p[vert ? x : y] += Math.abs(lum[i] - lum[vert ? i - 1 : i - w]); } return p; }
// the generator's grid is only roughly uniform, so each line may sit a pixel off: score the best of k-1..k+1
function grid(p) {
  const L = p.length, mean = p.reduce((a, b) => a + b, 0) / L, all = [];
  for (let per = 8; per <= 40; per += 0.02) { let b = { per, ph: 0, s: 0 };
    for (let ph = 0; ph < per; ph += 0.25) { let s = 0, c = 0; for (let x = ph; x < L; x += per) { const k = Math.round(x); if (k > 0 && k < L - 1) { s += Math.max(p[k - 1], p[k], p[k + 1]); c++; } } s /= c * mean; if (s > b.s) b = { per, ph, s }; }
    all.push(b); }
  const top = Math.max(...all.map(b => b.s));
  // whole multiples of the true cell score about as well: keep the smallest cell that is nearly the best
  return all.filter(b => b.s >= top * 0.9).sort((a, b) => a.per - b.per)[0];
}
const gx = N ? { per: w / N, ph: 0, s: 0 } : grid(prof(true)), gy = N ? { per: h / N, ph: 0, s: 0 } : grid(prof(false)), cell = (gx.per + gy.per) / 2;
const cw = Math.floor((w - gx.ph) / cell), ch = Math.floor((h - gy.ph) / cell);
// one colour per cell: median of the middle half
const cols = new Array(cw * ch);
for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
  const x0 = gx.ph + cx * cell, y0 = gy.ph + cy * cell, r = [], g = [], b = [];
  for (let y = Math.round(y0 + cell * 0.3); y < Math.round(y0 + cell * 0.7); y++) for (let x = Math.round(x0 + cell * 0.3); x < Math.round(x0 + cell * 0.7); x++) { if (x >= w || y >= h) continue; const i = (y * w + x) * 4; r.push(data[i]); g.push(data[i + 1]); b.push(data[i + 2]); }
  cols[cy * cw + cx] = r.length ? [med(r), med(g), med(b)] : [255, 255, 255];
}
// background: flood from the border cells through colours close to the border's
const bcells = []; for (let x = 0; x < cw; x++) bcells.push(x, (ch - 1) * cw + x); for (let y = 0; y < ch; y++) bcells.push(y * cw, y * cw + cw - 1);
const bg = [0, 1, 2].map(c => med(bcells.map(i => cols[i][c])));
const near = (c) => Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]) < 45;
const clear = new Uint8Array(cw * ch), q = []; bcells.forEach(i => { if (!clear[i] && near(cols[i])) { clear[i] = 1; q.push(i); } });
while (q.length) { const i = q.pop(), x = i % cw, y = (i / cw) | 0; [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([a, b]) => { if (a < 0 || b < 0 || a >= cw || b >= ch) return; const j = b * cw + a; if (!clear[j] && near(cols[j])) { clear[j] = 1; q.push(j); } }); }
// merge near-duplicate colours (the generator's blocks are rarely perfectly flat)
const d2 = (a, b) => (a[0] - b[0]) ** 2 * 0.3 + (a[1] - b[1]) ** 2 * 0.59 + (a[2] - b[2]) ** 2 * 0.11;
const fg = cols.filter((_, i) => !clear[i]);
let cen = fg.slice().sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2])).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / K)) === 0).slice(0, K).map(c => c.slice());
const nearest = (c) => { let bi = 0, bd = 1e12; cen.forEach((e, i) => { const d = d2(c, e); if (d < bd) { bd = d; bi = i; } }); return bi; };
for (let it = 0; it < 10; it++) { const acc = cen.map(() => [0, 0, 0, 0]); fg.forEach(c => { const a = acc[nearest(c)]; a[0] += c[0]; a[1] += c[1]; a[2] += c[2]; a[3]++; }); cen = cen.map((e, i) => acc[i][3] ? acc[i].slice(0, 3).map(v => v / acc[i][3]) : e); }
// crop + write
let X0 = cw, Y0 = ch, X1 = -1, Y1 = -1; for (let i = 0; i < cw * ch; i++) if (!clear[i]) { const x = i % cw, y = (i / cw) | 0; X0 = Math.min(X0, x); X1 = Math.max(X1, x); Y0 = Math.min(Y0, y); Y1 = Math.max(Y1, y); }
const W = X1 - X0 + 3, H = Y1 - Y0 + 3, small = new Uint8Array(W * H * 4), used = new Set();
for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const i = y * cw + x; if (clear[i]) continue; const k = nearest(cols[i]), e = cen[k], o = ((y - Y0 + 1) * W + x - X0 + 1) * 4; small[o] = e[0]; small[o + 1] = e[1]; small[o + 2] = e[2]; small[o + 3] = 255; used.add(k); }
PNG.write(out + '.png', { w: W, h: H, data: small });
const S = 8, big = new Uint8Array(W * S * H * S * 4);
for (let y = 0; y < H * S; y++) for (let x = 0; x < W * S; x++) { const s = (((y / S) | 0) * W + ((x / S) | 0)) * 4, o = (y * W * S + x) * 4; for (let c = 0; c < 4; c++) big[o + c] = small[s + c]; }
PNG.write(out + '_x8.png', { w: W * S, h: H * S, data: big });
console.log(JSON.stringify({ px: out + '.png', cell: +cell.toFixed(2), grid: [cw, ch], w: W, h: H, colors: used.size, score: [+gx.s.toFixed(2), +gy.s.toFixed(2)] }));
