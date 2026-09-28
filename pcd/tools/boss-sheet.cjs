// node pcd/tools/boss-sheet.cjs <key> <out.png> [k] [portrait]  → the module's SHEET frames (or its portrait) as one PNG
const fs = require('fs'), vm = require('vm'), zlib = require('zlib');
const ctx = { console, Math, Uint8Array, Uint32Array, Float32Array, Int16Array, Int32Array, Uint8ClampedArray, Set, Map, Object, Array, JSON, Error, performance: { now: () => 0 }, matchMedia: () => ({ matches: false }), addEventListener() {} };
ctx.window = ctx; vm.createContext(ctx);
const key = process.argv[2], out = process.argv[3], k = +(process.argv[4] || 2), por = process.argv[5] === 'portrait';
for (const f of ['pcd/lib/pcd.js', 'pcd/lib/parts.js', 'pcd/lib/parts-beast.js', 'pcd/lib/parts-boss.js', 'pcd/chars/' + key + '.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const mt = ctx.PCD.meta(key) || {}, g = ctx.PCD.createEngine({ game: true, W: mt.W, H: mt.H }); g.load(key);
const NAMES = ['idle', 'move', 'attack', 'charge', 'cast', 'recover', 'hurt', 'death'];
const frames = [];
const snap = (s) => ({ w: s.w, h: s.h, oy: s.oy, px: Uint8Array.from(s.out) });
if (por) frames.push(snap(g.portrait()));
else for (const [st, ts, mv] of (process.env.ONLY?JSON.parse(process.env.ONLY):g.C.SHEET)) { g.move(mv || null); for (const t of ts) frames.push(snap(g.pose(NAMES[st], t))); }
g.move(null);
const lut = g.lut, cols = Math.min(frames.length, +(process.env.COLS || 6)), fw = frames[0].w, fh = frames[0].h, rows = Math.ceil(frames.length / cols);
const W = cols * fw * k, H = rows * fh * k, img = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { img[i * 3] = 18; img[i * 3 + 1] = 19; img[i * 3 + 2] = 46; }
frames.forEach((f, n) => { const ox = (n % cols) * fw * k, oy = Math.floor(n / cols) * fh * k;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const c = f.px[y * f.w + x]; let r, gg, b; if (c === 255) { if (y !== f.oy + 1 || por) continue; r = 58; gg = 63; b = 120; } else { const v = lut[c]; r = v & 255; gg = (v >> 8) & 255; b = (v >> 16) & 255; }
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) { const q = ((oy + y * k + j) * W + ox + x * k + i) * 3; img[q] = r; img[q + 1] = gg; img[q + 2] = b; } } });
const raw = Buffer.alloc((W * 3 + 1) * H); for (let y = 0; y < H; y++) img.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
const T = []; for (let n = 0; n < 256; n++) { let c = n; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
const crc = (b) => { let r = 0xffffffff; for (const x of b) r = T[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
const cs = new Set(); frames.forEach((f) => f.px.forEach((c) => c !== 255 && cs.add(c)));
console.log(out, W, H, frames.length, 'frames', cs.size, 'colors');
