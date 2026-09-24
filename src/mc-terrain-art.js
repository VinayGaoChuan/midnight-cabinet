// ==== mc-terrain-art.js ====
(function () {
// Special terrain is its own ground, not rock with a badge (user ruling 2026-09-24). Each of the 22 kinds has a look,
// painted at 100×70 and scaled ×3 into the 300×210 cell like the rest of the pixel base; a light layer animates it.
// A kind also has its own digging time (开垦), different from plain rock. Hovering the cell explains it.
const M = window.MC, CW = 300, CH = 210, S = 3, LW = CW / S, LH = CH / S;
const srand = (seed) => { let s = Math.abs(seed) % 2147483647 || 1; return () => (s = s * 16807 % 2147483647) / 2147483647; };
const hash = (k) => [...k].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 1000003, 7);
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// ───────── how long each kind takes to open up (plain rock: 1 day) ─────────
M.TILE_DIG = { mole: 1, clay: 1, spring: 1, wind: 1, fossil: 2, ruin: 2, amber: 2, ley: 2, rift: 2, bones: 2, hourglass: 2, dream: 2, geo: 2,
  crystal: 3, mint: 3, ore: 3, dragon: 3, heart: 3, star: 3, storm: 3, ygg: 3, crown: 3 };
M.digDays = (m, c, r) => { const x = M.cell(m, c, r); return x && x.tile && M.TILES[x.tile] ? (M.TILE_DIG[x.tile] || 2) : 1; };
const oSD = M.startDig;
M.startDig = function (m, c, r) { const ok = oSD.apply(this, arguments); const x = M.cell(m, c, r); if (ok && x && x.job && x.job.kind === 'dig') { const d = M.digDays(m, c, r); x.job.days = d; x.job.total = d; } return ok; };

// ───────── painting helpers (logical 100×70 space) ─────────
const Rr = (x, a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
const O = (x, cx, cy, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
const E = (x, cx, cy, rx, ry, c, a) => { x.fillStyle = c; x.beginPath(); x.ellipse(cx, cy, rx, ry, a || 0, 0, 7); x.fill(); };
const P = (x, pts, c) => { x.fillStyle = c; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
const L = (x, pts, w, c) => { x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); };
function ground(x, r, c0, c1, spk) {
  const g = x.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, c0); g.addColorStop(1, c1); x.fillStyle = g; x.fillRect(0, 0, LW, LH);
  for (let i = 0; i < 110; i++) { x.fillStyle = r() < 0.55 ? spk : 'rgba(0,0,0,0.28)'; x.fillRect(Math.floor(r() * LW), Math.floor(r() * LH), 1 + Math.floor(r() * 2), 1); }
}
function strata(x, r, cols, wob) { let y = 0; cols.forEach((c, i) => { const h = LH / cols.length; x.fillStyle = c; x.beginPath(); x.moveTo(0, y + h + 2); for (let a = 0; a <= LW; a += 5) x.lineTo(a, y + h + Math.sin(a * 0.12 + i * 2) * (wob || 2)); x.lineTo(LW, 0); x.lineTo(0, 0); x.closePath(); x.globalCompositeOperation = 'destination-over'; x.fill(); x.globalCompositeOperation = 'source-over'; y += h; }); }
const crack = (x, r, x0, y0, n, c, w) => { const pts = [[x0, y0]]; let a = x0, b = y0; for (let i = 0; i < n; i++) { a += 3 + r() * 9; b += (r() - 0.5) * 9; pts.push([a, b]); } L(x, pts, w || 1.5, c); return pts; };
const gem = (x, cx, cy, w, h, c, hi, a) => { x.save(); x.translate(cx, cy); x.rotate(a || 0); P(x, [[0, -h], [w / 2, -h * 0.55], [w / 2, 0], [0, h * 0.25], [-w / 2, 0], [-w / 2, -h * 0.55]], c); P(x, [[0, -h], [w / 2, -h * 0.55], [0, -h * 0.2]], hi); x.restore(); };
const skull = (x, cx, cy, s, c, d) => { E(x, cx, cy, 5 * s, 4.4 * s, c); Rr(x, cx - 3 * s, cy + 2 * s, 6 * s, 3 * s, c); O(x, cx - 1.8 * s, cy, 1.3 * s, d); O(x, cx + 1.8 * s, cy, 1.3 * s, d); };

const ART = {
  geo: (x, r) => { ground(x, r, '#3a2420', '#160b0a', '#4e3028'); for (let i = 0; i < 6; i++) { const p = crack(x, r, r() * 30, 8 + r() * 54, 8, '#8a1a0a', 3.4); L(x, p, 1.6, '#ff6a1a'); L(x, p, 0.6, '#ffe08a'); } for (let i = 0; i < 4; i++) { const cx = 14 + r() * 72, cy = 12 + r() * 46; E(x, cx, cy, 6, 3, '#ff6a1a'); E(x, cx, cy - 0.5, 3.6, 1.6, '#ffd060'); O(x, cx + 1, cy - 1, 0.8, '#fff6c0'); } },
  fossil: (x, r) => { strata(x, r, ['#c8b088', '#b09a70', '#98845e', '#7e6c4c'], 2.5); for (let i = 0; i < 40; i++) Rr(x, r() * LW, r() * LH, 1, 1, 'rgba(0,0,0,0.2)');
    const cx = 30, cy = 36; for (let k = 0; k < 4; k++) { x.strokeStyle = '#efe4c8'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 11 - k * 2.6, k * 1.2, k * 1.2 + 5.2); x.stroke(); } O(x, cx, cy, 1.4, '#efe4c8');
    L(x, [[56, 30], [88, 26]], 1.8, '#efe4c8'); for (let i = 0; i < 6; i++) L(x, [[60 + i * 5, 29 - i * 0.6], [58 + i * 5, 22 - i * 0.4]], 1.1, '#e0d4b4'), L(x, [[60 + i * 5, 29 - i * 0.6], [58 + i * 5, 35 - i * 0.6]], 1.1, '#e0d4b4'); P(x, [[88, 26], [95, 21], [95, 31]], '#e0d4b4'); O(x, 52, 30, 3.4, '#efe4c8'); O(x, 51, 29, 0.9, '#6a5a40'); },
  clay: (x, r) => { strata(x, r, ['#c87a50', '#b0643c', '#98522e', '#7a3e22', '#642e18'], 3.5); for (let i = 0; i < 5; i++) { const cx = 10 + r() * 80, cy = 10 + r() * 50, a = r() * 3; x.save(); x.translate(cx, cy); x.rotate(a); P(x, [[-6, -3], [5, -4], [7, 2], [-4, 4]], '#e8a070'); L(x, [[-5, -1], [5, -2]], 0.8, '#8a4a2a'); x.restore(); } },
  ruin: (x, r) => { ground(x, r, '#3a3430', '#1c1816', '#4a423a'); for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) { if (r() < 0.28) continue; const w = 14, h = 7, bx = col * w + (row % 2 ? 7 : 0) - 4, by = 30 + row * 8; Rr(x, bx, by, w - 1, h - 1, r() < 0.5 ? '#8a8070' : '#7a7062'); Rr(x, bx, by, w - 1, 1, '#a09682'); }
    Rr(x, 64, 6, 12, 40, '#9a9080'); Rr(x, 64, 6, 3, 40, '#b8ae9a'); Rr(x, 61, 4, 18, 4, '#aaa08c'); P(x, [[64, 46], [76, 46], [74, 40], [70, 44], [66, 39]], '#1c1816'); x.strokeStyle = '#8a8070'; x.lineWidth = 3; x.beginPath(); x.arc(24, 30, 14, Math.PI, Math.PI * 1.75); x.stroke(); },
  spring: (x, r) => { ground(x, r, '#23343a', '#0c1418', '#34484e'); for (let i = 0; i < 7; i++) { const sx = 6 + i * 14 + r() * 4; P(x, [[sx - 4, 0], [sx + 4, 0], [sx, 8 + r() * 10]], '#3e525a'); } E(x, 50, 58, 38, 9, '#1a5a8a'); E(x, 50, 56, 34, 6.5, '#2a8ad0'); E(x, 44, 55, 14, 2, '#8fd8ff'); E(x, 64, 57, 6, 1.2, '#bfefff'); for (let i = 0; i < 5; i++) O(x, 20 + r() * 60, 20 + r() * 20, 0.9, '#8fd8ff'); },
  mole: (x, r) => { ground(x, r, '#6e5034', '#3a2818', '#80603e'); for (let i = 0; i < 4; i++) { const pts = []; let a = r() * 20, b = 10 + r() * 50; for (let k = 0; k < 6; k++) { pts.push([a, b]); a += 8 + r() * 10; b += (r() - 0.5) * 12; } L(x, pts, 4.5, '#24180c'); L(x, pts, 2, '#1a1008'); } for (let i = 0; i < 12; i++) E(x, r() * LW, r() * LH, 1.6, 1.1, '#9a8a70'); E(x, 74, 40, 6, 5, '#5a4a44'); O(x, 72, 39, 0.8, '#000'); O(x, 76, 39, 0.8, '#000'); E(x, 74, 42, 1.6, 1, '#ff9aa8'); },
  crystal: (x, r) => { ground(x, r, '#23233a', '#0c0c18', '#34344e'); [[22, 58, 1], [52, 60, 1.3], [80, 56, 0.9]].forEach(([cx, cy, s], j) => { for (let k = 0; k < 5; k++) gem(x, cx + (k - 2) * 5 * s, cy, 7 * s, (16 + r() * 16) * s, k % 2 ? '#5ac8f0' : '#7fe0ff', '#e8fbff', (k - 2) * 0.28); }); for (let i = 0; i < 8; i++) Rr(x, r() * LW, r() * 30, 1, 1, '#bfefff'); },
  ley: (x, r) => { ground(x, r, '#231634', '#0c0814', '#30204a'); const vein = (x0, y0, n) => { const p = crack(x, r, x0, y0, n, '#4a1a7a', 4); L(x, p, 2, '#b86bff'); L(x, p, 0.7, '#f0d8ff'); return p; }; const p = vein(0, 34, 10); vein(p[4][0], p[4][1], 5); vein(10, 10, 6); vein(30, 62, 7); for (let i = 0; i < 6; i++) O(x, r() * LW, r() * LH, 1.2, '#d8a0ff'); },
  amber: (x, r) => { ground(x, r, '#4e3418', '#24160a', '#5e4020'); for (let i = 0; i < 4; i++) { const cx = 16 + i * 22 + r() * 6, cy = 20 + r() * 34, rx = 7 + r() * 4; E(x, cx, cy, rx + 1, rx * 0.8 + 1, '#8a5a10'); E(x, cx, cy, rx, rx * 0.8, '#e8962a'); E(x, cx - 1, cy - 1, rx * 0.65, rx * 0.5, '#ffc85a'); E(x, cx, cy, 2.2, 1.2, '#4a2a08'); L(x, [[cx - 2, cy], [cx - 4, cy - 2]], 0.6, '#4a2a08'); L(x, [[cx + 2, cy], [cx + 4, cy - 2]], 0.6, '#4a2a08'); O(x, cx - rx * 0.4, cy - rx * 0.35, 1, '#fff0c0'); } },
  mint: (x, r) => { ground(x, r, '#302a24', '#14100c', '#443a30'); for (let i = 0; i < 5; i++) { const p = crack(x, r, r() * 20, 6 + r() * 58, 9, '#8a6a10', 3); L(x, p, 1.5, '#ffd650'); } for (let i = 0; i < 7; i++) { const cx = r() * LW, cy = r() * LH; P(x, [[cx - 3, cy], [cx - 1, cy - 3], [cx + 3, cy - 2], [cx + 3, cy + 2], [cx, cy + 3]], '#ffcc33'); Rr(x, cx - 1, cy - 2, 2, 1, '#fff6c0'); } },
  rift: (x, r) => { ground(x, r, '#1e2418', '#0a0c08', '#2c3424'); const pts = [[0, 30]]; let a = 0, b = 30; while (a < LW) { a += 5 + r() * 7; b = cl(b + (r() - 0.5) * 14, 12, 58); pts.push([a, b]); } L(x, pts, 8, '#0a1406'); L(x, pts, 4.5, '#5ac83a'); L(x, pts, 2, '#9cff7a'); L(x, pts, 0.8, '#f0ffe0'); for (let i = 0; i < 8; i++) Rr(x, r() * LW, r() * LH, 1, 1, '#9cff7a'); },
  ore: (x, r) => { ground(x, r, '#3e3430', '#1a1412', '#50443e'); for (let i = 0; i < 7; i++) { const cx = 8 + r() * 84, cy = 8 + r() * 54, s = 3 + r() * 4; P(x, [[cx - s, cy], [cx - s * 0.3, cy - s], [cx + s, cy - s * 0.6], [cx + s * 0.8, cy + s * 0.7], [cx - s * 0.2, cy + s]], '#c0703a'); P(x, [[cx - s * 0.3, cy - s], [cx + s, cy - s * 0.6], [cx + s * 0.2, cy - s * 0.1]], '#ffb070'); P(x, [[cx + s * 0.8, cy + s * 0.7], [cx - s * 0.2, cy + s], [cx + s * 0.1, cy + s * 0.2]], '#6a3212'); } },
  wind: (x, r) => { ground(x, r, '#454c56', '#1e2228', '#5a626e'); E(x, 50, 36, 26, 17, '#141820'); E(x, 50, 37, 21, 13, '#0a0c10'); for (let i = 0; i < 5; i++) { const y = 22 + i * 7; x.strokeStyle = i % 2 ? '#bfefff' : '#8fd8ff'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(8 + i * 3, y); x.quadraticCurveTo(40, y - 6, 60 + i * 4, y + 2); x.stroke(); } },
  dragon: (x, r) => { ground(x, r, '#3e342a', '#1a1410', '#4e4234'); for (let i = 0; i < 6; i++) { x.strokeStyle = '#e0d6c6'; x.lineWidth = 2.2; x.beginPath(); x.arc(64 + i * 5, 58, 10 + i * 0.5, Math.PI * 1.05, Math.PI * 1.7); x.stroke(); } L(x, [[60, 48], [98, 50]], 2.6, '#e0d6c6');
    P(x, [[6, 44], [20, 22], [34, 18], [46, 26], [44, 34], [30, 36], [22, 46]], '#efe6da'); P(x, [[20, 22], [16, 8], [26, 20]], '#efe6da'); O(x, 32, 25, 2.6, '#1a1410'); O(x, 32, 25, 1, '#ff5a3a'); for (let i = 0; i < 5; i++) P(x, [[24 + i * 4, 36], [26 + i * 4, 36], [25 + i * 4, 40]], '#fff6ea'); P(x, [[6, 48], [30, 40], [28, 46], [8, 52]], '#c8b8a8'); },
  heart: (x, r) => { ground(x, r, '#34161c', '#12060a', '#4a2028'); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; L(x, [[50, 36], [50 + Math.cos(a) * 22, 36 + Math.sin(a) * 16], [50 + Math.cos(a + 0.3) * 44, 36 + Math.sin(a + 0.3) * 30]], 1.4, '#8a2a4a'); }
    x.fillStyle = '#ff6a8a'; x.beginPath(); x.moveTo(50, 50); x.bezierCurveTo(30, 38, 36, 20, 50, 29); x.bezierCurveTo(64, 20, 70, 38, 50, 50); x.fill(); x.fillStyle = '#ffb0c4'; x.beginPath(); x.ellipse(44, 30, 3, 2, -0.5, 0, 7); x.fill(); P(x, [[50, 31], [54, 37], [50, 45], [46, 37]], '#c83a5a'); },
  star: (x, r) => { ground(x, r, '#24243a', '#0c0c18', '#34344e'); E(x, 50, 44, 34, 14, '#3a3a56'); E(x, 50, 45, 28, 10, '#101020'); gem(x, 50, 46, 14, 16, '#7a9aff', '#e8f0ff', 0.1); O(x, 50, 38, 2, '#ffffff'); for (let i = 0; i < 12; i++) Rr(x, r() * LW, r() * 26, 1, 1, '#c8d8ff'); },
  storm: (x, r) => { ground(x, r, '#1a2234', '#080c14', '#26304a'); O(x, 50, 35, 20, '#2a3a5a'); O(x, 50, 35, 15, '#1a2a44'); O(x, 45, 30, 4, '#4a6a9a'); for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.4; P(x, [[50 + Math.cos(a) * 12, 35 + Math.sin(a) * 12], [50 + Math.cos(a) * 30 + 3, 35 + Math.sin(a) * 26], [50 + Math.cos(a + 0.12) * 24, 35 + Math.sin(a + 0.12) * 20], [50 + Math.cos(a) * 44, 35 + Math.sin(a) * 34]], '#8ff6ff'); } },
  bones: (x, r) => { ground(x, r, '#2c2832', '#100e14', '#3c3644'); for (let i = 0; i < 12; i++) { const cx = 10 + r() * 80, cy = 38 + r() * 26, a = r() * 3; x.save(); x.translate(cx, cy); x.rotate(a); Rr(x, -6, -1, 12, 2, '#e8e0ff'); O(x, -6, -1, 1.6, '#e8e0ff'); O(x, 6, 1, 1.6, '#e8e0ff'); x.restore(); } skull(x, 34, 40, 1.3, '#f5f0ff', '#3a2a5a'); skull(x, 64, 46, 1, '#e8e0ff', '#3a2a5a'); for (let i = 0; i < 4; i++) E(x, 20 + r() * 60, 12 + r() * 16, 2.4, 3.4, 'rgba(216,190,255,0.55)'); },
  hourglass: (x, r) => { const g = x.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#6a5028'); g.addColorStop(1, '#2a1e0e'); x.fillStyle = g; x.fillRect(0, 0, LW, LH); for (let k = 0; k < 4; k++) { x.fillStyle = ['#d8b060', '#c89e50', '#b08a40', '#98763a'][k]; x.beginPath(); x.moveTo(0, LH); for (let a = 0; a <= LW; a += 4) x.lineTo(a, 30 + k * 10 + Math.sin(a * 0.08 + k) * 4); x.lineTo(LW, LH); x.closePath(); x.fill(); }
    Rr(x, 42, 8, 16, 2, '#caa84a'); Rr(x, 42, 30, 16, 2, '#caa84a'); P(x, [[44, 10], [56, 10], [51, 20], [56, 30], [44, 30], [49, 20]], '#fff2c0'); P(x, [[46, 26], [54, 26], [55, 30], [45, 30]], '#ffcc33'); P(x, [[45, 12], [55, 12], [50, 18]], '#ffcc33'); },
  dream: (x, r) => { ground(x, r, '#200a22', '#0a040c', '#34143a'); for (let i = 0; i < 7; i++) E(x, 50 + (r() - 0.5) * 40, 35 + (r() - 0.5) * 24, 8 + r() * 14, 5 + r() * 7, ['rgba(255,58,160,0.55)', 'rgba(184,107,255,0.5)', 'rgba(255,208,240,0.45)'][i % 3], r() * 3); for (let i = 0; i < 16; i++) Rr(x, r() * LW, r() * LH, 1, 1, '#ffe0f4'); O(x, 50, 35, 3, '#fff0fa'); },
  ygg: (x, r) => { ground(x, r, '#302a1c', '#12100a', '#403826'); for (let i = 0; i < 5; i++) { const pts = []; let a = 30 + r() * 40, b = 0; for (let k = 0; k < 7; k++) { pts.push([a, b]); a += (r() - 0.5) * 22; b += 11; } L(x, pts, 5.5 - i * 0.6, '#5a3e22'); L(x, pts, 2, '#8a6a3a'); } for (let i = 0; i < 6; i++) { const cx = r() * LW, cy = r() * LH; O(x, cx, cy, 2, '#3ac05a'); O(x, cx, cy, 1, '#b8ffc8'); } },
  crown: (x, r) => { ground(x, r, '#3a3230', '#161212', '#4c4240'); for (let i = 0; i < 14; i++) P(x, (() => { const cx = r() * LW, cy = 40 + r() * 30, s = 2 + r() * 4; return [[cx - s, cy], [cx, cy - s], [cx + s, cy], [cx, cy + s * 0.6]]; })(), r() < 0.5 ? '#5a504c' : '#6a5e58');
    P(x, [[18, 56], [22, 16], [30, 10], [40, 16], [44, 40], [52, 56]], '#6a4a1a'); P(x, [[22, 18], [30, 12], [38, 18], [40, 38], [24, 38]], '#8a2a2a'); P(x, [[40, 16], [44, 40], [52, 56], [46, 56]], '#4a3010');
    P(x, [[58, 50], [62, 40], [67, 46], [72, 36], [77, 46], [82, 40], [86, 50]], '#ffcc33'); Rr(x, 58, 50, 28, 4, '#b08a20'); O(x, 72, 46, 1.8, '#ff4a6a'); O(x, 64, 51.5, 1, '#6fa8dc'); O(x, 80, 51.5, 1, '#6fa8dc'); },
};

// ───────── cache and draw ─────────
const cache = {};
function art(key) {
  if (cache[key]) return cache[key];
  const lo = document.createElement('canvas'); lo.width = LW; lo.height = LH; const x = lo.getContext('2d'); x.imageSmoothingEnabled = false;
  (ART[key] || ART.ruin)(x, srand(hash(key)));
  // a dark frame so the cell reads as ground cut by the grid
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 0, LW, 1); x.fillRect(0, LH - 1, LW, 1); x.fillRect(0, 0, 1, LH); x.fillRect(LW - 1, 0, 1, LH);
  const hi = document.createElement('canvas'); hi.width = CW; hi.height = CH; const h = hi.getContext('2d'); h.imageSmoothingEnabled = false; h.drawImage(lo, 0, 0, CW, CH);
  return (cache[key] = hi);
}
M.terrainArt = art;
// the ground itself, with a light layer that breathes in the terrain's colour
M.drawTerrainCell = function (ctx, key, X, Y, t, lights) {
  const T = M.TILES[key]; if (!T) return; ctx.drawImage(art(key), X, Y);
  const r = srand(hash(key) + 17), pu = 0.5 + 0.5 * Math.sin(t * 2 + X * 0.01);
  for (let i = 0; i < 7; i++) { const gx = X + 20 + r() * (CW - 40), gy = Y + 20 + r() * (CH - 40), ph = r() * 6.28, a = 0.5 + 0.5 * Math.sin(t * 3 + ph); ctx.globalAlpha = a * 0.9; ctx.fillStyle = '#ffffff'; ctx.fillRect(gx, gy, 3, 3); ctx.globalAlpha = a * 0.5; ctx.fillStyle = T.c; ctx.fillRect(gx - 3, gy + 1, 9, 1); ctx.fillRect(gx + 1, gy - 3, 1, 9); }
  ctx.globalAlpha = 1;
  if (key === 'spring') for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; ctx.fillStyle = '#8fd8ff'; ctx.fillRect(X + 60 + i * 80, Y + 20 + k * 130, 3, 6); }
  if (key === 'storm' && Math.sin(t * 7) * Math.sin(t * 2.3) > 0.85) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#dffcff'; ctx.fillRect(X, Y, CW, CH); ctx.globalAlpha = 1; }
  if (lights) lights.push({ x: X + CW / 2, y: Y + CH / 2, r: 170 + 30 * pu, c: T.c, f: 0.55 + 0.25 * pu });
};
// an unidentified deep vein: rock with a strange light seeping out
M.drawHiddenVein = function (ctx, X, Y, t, seed, lights) {
  const r = srand(seed * 97 + 5);
  for (let i = 0; i < 6; i++) { const gx = X + 30 + r() * (CW - 60), gy = Y + 30 + r() * (CH - 60), a = 0.35 + 0.35 * Math.sin(t * 2.4 + r() * 6); ctx.globalAlpha = a; ctx.fillStyle = '#e8e0ff'; ctx.fillRect(gx, gy, 4, 10); ctx.fillRect(gx - 3, gy + 3, 10, 4); }
  ctx.globalAlpha = 1; if (lights) lights.push({ x: X + CW / 2, y: Y + CH / 2, r: 140, c: '#cfc6ff', f: 0.45 + 0.15 * Math.sin(t * 2) });
};
// a dug room keeps a seam of its terrain along the floor
M.drawTerrainFloor = function (ctx, key, X, Y, t) {
  const T = M.TILES[key]; if (!T) return; ctx.drawImage(art(key), 0, 120, CW, 36, X + 3, Y + CH - 19, CW - 6, 16);
  ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + X * 0.01); ctx.fillStyle = T.c; ctx.fillRect(X + 3, Y + CH - 20, CW - 6, 2); ctx.globalAlpha = 1;
};
// where the guide card points: the first identified terrain on screen
M.terrainAt = function (g) {
  const m = g.meta, bv = g.bv; if (!m || !bv || g.screen !== 'base') return null; const G_ = M.BASE_GEO;
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = M.cell(m, c, r); if (!x.tile || x.dug || M.tileHidden(m, c, r)) continue; const a = bv.toScreen(c * G_.CW, G_.TOP + r * G_.CH), b = bv.toScreen((c + 1) * G_.CW, G_.TOP + (r + 1) * G_.CH); if (b.x < 0 || a.x > 1920 || b.y < 90 || a.y > 1080) continue; return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }; }
  return null;
};
})();

;
