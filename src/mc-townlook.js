// ==== mc-townlook.js ====
(function () {
// How the 发展方向 dress the city on the surface (user ruling 2026-09-27: 「根据选的方向不同，基地会向不同风格的变化」;
// 「满满的要越来越像一个整体」). The deepest direction (M.dirTop) lays the ground of the whole city and raises the skyline
// behind it; the townsfolk's houses are built its way; every direction taken puts its things in the streets and on the
// roofs, more the deeper it goes, so a mixed city shows a mix. Taking a direction sends a wave out from the main base:
// the new ground and skyline sweep over the city and its things pop up as the wave passes. All art is code.
const M = window.MC, P = M.PJ.PAL, U = M.UI, DOOR_X = M.BASE_GEO.DOOR_X, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), RM = () => !!M.PJ.reduced;
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const kitOf = (x) => M.townKit(x);
const WAVE_V = 1100;   // how fast the wave runs out (world units a second)
const PH = 150, GY = 0, SKY_Y = -144;   // the city's ground: from the fighting line (y 0) back to y −150; the skyline stands on its far edge

// ───────── per direction: ground, skyline, houses, street things, roofs ─────────
// g: ground [fill, stones, street line] · sky: skyline [silhouette, rim, lights] · house(k, w, h, v) · props: [(k, s, t)] · roof(k, w, h, v, t)
const gable = (k, w, h, wall, roof, lit) => { k.Bk(-w / 2 + 4, -h + 34, w - 8, h - 34, wall); k.T([[-w / 2 - 2, -h + 36], [0, -h], [w / 2 + 2, -h + 36]], roof); for (let i = 0; i < Math.max(1, Math.floor((w - 24) / 30)); i++) k.Win(-w / 2 + 16 + i * 30, -h + 50, 14, 16, lit(i)); };
const LOOK = {
  none: { g: ['#4a3a30', '#5a4a3c', '#6a5848'], sky: null,
    house: (k, w, h, v) => gable(k, w, h, '#6a5a4a', '#4f2f22', (i) => rnd(v + i) < 0.4),
    props: [(k) => { k.Bk(-14, -24, 28, 24, P.brown); k.R(-14, -14, 28, 3, P.umber); }, (k) => { k.Bk(-10, -30, 20, 30, P.umber); k.R(-10, -22, 20, 3, P.ink); k.R(-10, -10, 20, 3, P.ink); }] },
  city: { g: ['#46435a', '#56536a', '#6a6780'], sky: ['#1a1734', '#2e2a52', '#ffcf6a'],
    house: (k, w, h, v) => { const hh = h + 30; k.Bk(-w / 2 + 6, -hh + 30, w - 12, hh - 30, v % 2 ? '#8a7a6a' : '#7a6a80'); k.T([[-w / 2, -hh + 32], [0, -hh], [w / 2, -hh + 32]], '#3d3a52'); k.Bk(w / 4 - 6, -hh + 4, 12, 26, '#5a5060');
      for (let j = 0; j < 3; j++) for (let i = 0; i < Math.max(1, Math.floor((w - 28) / 26)); i++) k.Win(-w / 2 + 18 + i * 26, -hh + 44 + j * 30, 12, 16, rnd(v * 7 + i + j * 5) < 0.65); k.Door(-9, -28, 18, 28); },
    props: [(k) => { k.R(-3, -110, 6, 110, P.ink); k.R(-2, -108, 4, 106, P.slate); k.Bk(-10, -126, 20, 18, P.slate); k.R(-7, -122, 14, 11, P.butter); }, (k) => { k.Bk(-26, -18, 52, 8, P.brown); k.R(-22, -10, 4, 10, P.umber); k.R(18, -10, 4, 10, P.umber); }],
    lit: [0], roof: (k, w, h) => { k.Bk(-w / 3, -h - 26, w * 2 / 3, 28, '#7a6a80'); k.Win(-w / 3 + 8, -h - 20, 10, 12, true); k.Win(w / 3 - 18, -h - 20, 10, 12, true); k.T([[-w / 3 - 4, -h - 24], [0, -h - 44], [w / 3 + 4, -h - 24]], '#3d3a52'); } },
  fort: { g: ['#554c46', '#645a52', '#766a60'], sky: ['#1a1830', '#3a3448', '#ffb060'],
    house: (k, w, h, v) => { k.Bk(-w / 2 + 6, -h + 16, w - 12, h - 16, '#7a7068'); for (let i = 0; i < Math.floor((w - 12) / 18); i++) if (i % 2 === 0) k.Bk(-w / 2 + 6 + i * 18, -h, 16, 18, '#7a7068'); k.R(-4, -h + 40, 8, 22, P.ink); k.R(-w / 4, -h + 70, 6, 18, P.ink); k.R(w / 4, -h + 70, 6, 18, P.ink); k.Door(-10, -30, 20, 30); },
    props: [(k, s, t) => { k.R(-2, -120, 4, 120, P.ink); const wv = RM() ? 0 : Math.sin(t * 4 + s) * 3; k.R(2, -118 + wv, 34, 22, P.red); k.R(2, -118 + wv, 34, 5, P.gold); }, (k, s, t) => { k.Bk(-12, -30, 24, 30, P.slate); const f = 0.7 + 0.3 * Math.sin(t * 12 + s); k.T([[-10, -30], [0, -30 - 26 * f], [10, -30]], P.amber, false); k.T([[-5, -30], [0, -30 - 16 * f], [5, -30]], P.butter, false); }],
    lit: [1], roof: (k, w, h) => { for (let i = 0; i < 5; i++) k.Bk(-w / 2 + 8 + i * (w - 26) / 4, -h - 12, 12, 14, '#8a8078'); k.R(w / 2 - 20, -h - 60, 3, 50, P.ink); k.T([[w / 2 - 17, -h - 60], [w / 2 + 12, -h - 52], [w / 2 - 17, -h - 44]], P.red); } },
  market: { g: ['#6a4234', '#7a5040', '#9a6a4a'], sky: ['#1c1530', '#3a2a40', '#ffb04a'],
    house: (k, w, h, v) => { const cs = [[P.red, P.cream], [P.teal, P.cream], [P.gold, P.brown]][v % 3]; gable(k, w, h, '#a0785a', '#6a3a2a', () => true); for (let i = 0; i < 6; i++) k.R(-w / 2 + i * w / 6, -h + 56 + 30, w / 6 + 1, 14, cs[i % 2]); k.R(-w / 2, -h + 100, w, 4, P.ink); },
    props: [(k, s) => { const cs = [[P.red, P.cream], [P.teal, P.cream], [P.gold, P.brown]][s % 3]; k.Bk(-34, -34, 68, 12, P.brown); k.R(-30, -22, 5, 22, P.umber); k.R(25, -22, 5, 22, P.umber); for (let i = 0; i < 5; i++) k.R(-38 + i * 16, -70, 16, 14, cs[i % 2]); k.R(-36, -58, 4, 26, P.umber); k.R(32, -58, 4, 26, P.umber); [[-20, P.lime], [0, P.gold], [18, P.red]].forEach(([a, c]) => k.R(a - 5, -44, 10, 10, c)); },
      (k, s, t) => { k.R(-44, -96, 4, 96, P.umber); k.R(40, -96, 4, 96, P.umber); for (let i = 0; i < 7; i++) { const a = -40 + i * 13, sag = Math.sin(i / 6 * Math.PI) * 14; k.R(a - 4, -92 + sag, 8, 8, (i + Math.floor(t * 2)) % 3 ? P.amber : P.gold); } }],
    lit: [1], roof: (k, w) => { const cs = [P.red, P.cream]; for (let i = 0; i < 4; i++) k.R(-w / 4 + i * w / 8, -44, w / 8 + 1, 12, cs[i % 2]); k.R(w / 4 + 6, -60, 2, 14, P.ink); k.Bk(w / 4, -48, 14, 14, P.amber); } },
  industry: { g: ['#3a3438', '#4a4448', '#8791a6'], sky: ['#171320', '#3a2c2a', '#ff7a3a'], rail: 1,
    house: (k, w, h, v) => { k.Bk(-w / 2 + 4, -h + 30, w - 8, h - 30, '#7a4a3a'); for (let i = 0; i < Math.floor(w / 30); i++) k.T([[-w / 2 + 4 + i * 30, -h + 30], [-w / 2 + 4 + i * 30, -h + 6], [-w / 2 + 34 + i * 30, -h + 30]], P.slate); k.Win(-w / 2 + 14, -h + 44, w - 28, 22, true); k.R(-w / 2 + 14, -h + 54, w - 28, 3, P.ink); k.Door(-10, -30, 20, 30); },
    props: [(k) => { k.Bk(-40, -22, 80, 14, P.steel); k.Bk(-10, -40, 20, 20, P.steel); k.Bk(-16, -46, 32, 8, P.red); }, (k) => { k.Bk(-22, -28, 26, 28, P.brown); k.R(-22, -16, 26, 3, P.umber); k.Bk(8, -34, 20, 34, '#5a5a6a'); k.R(8, -26, 20, 3, P.ink); k.R(8, -12, 20, 3, P.ink); }],
    lit: [1], smoke: 1, roof: (k, w, h) => { k.Bk(w / 4 - 8, -h - 50, 18, 56, '#6a3a2a'); k.R(w / 4 - 10, -h - 54, 22, 6, P.ink); k.Bk(-w / 3, -h - 12, w / 3, 8, P.steel); } },
  army: { g: ['#5a4a38', '#6a5842', '#7a6a50'], sky: ['#1a1628', '#3a3030', '#ffb060'],
    house: (k, w, h, v) => { const hh = h * 0.8; k.T([[-w / 2, 0], [0, -hh], [w / 2, 0]], v % 2 ? '#a89060' : '#8a7a50'); k.T([[-12, 0], [0, -hh * 0.45], [12, 0]], P.ink, false); k.R(-2, -hh - 26, 3, 28, P.ink); k.R(1, -hh - 26, 20, 12, P.red); },
    props: [(k) => { k.R(-3, -70, 6, 70, P.brown); k.R(-22, -58, 44, 6, P.brown); k.Bk(-12, -86, 24, 22, P.tan); k.Bk(-14, -56, 28, 30, P.tan); k.R(-4, -80, 3, 3, P.ink); }, (k) => { k.Bk(-26, -54, 52, 8, P.brown); k.R(-24, -46, 4, 46, P.umber); k.R(20, -46, 4, 46, P.umber); [-14, -2, 10].forEach(a => { k.R(a, -86, 3, 32, P.silver); k.R(a - 3, -58, 9, 3, P.brown); }); }],
    lit: [0], roof: (k, w, h, v, t) => { k.R(0, -h - 56, 3, 56, P.ink); const wv = RM() ? 0 : Math.sin(t * 5 + v) * 2; k.R(3, -h - 56 + wv, 28, 18, P.red); k.Bk(-w / 3, -h + 20, 22, 26, P.silver); k.R(-w / 3 + 8, -h + 24, 6, 18, P.red); } },
  pastoral: { g: ['#3a5a32', '#4a6a3a', '#7a6a42'], sky: ['#16241e', '#2a3a2a', '#ffe08a'],
    house: (k, w, h, v) => { k.Bk(-w / 2 + 8, -h + 44, w - 16, h - 44, '#e0d0b0'); k.T([[-w / 2 - 4, -h + 48], [0, -h], [w / 2 + 4, -h + 48]], '#c9a050'); for (let i = 0; i < 4; i++) k.R(-w / 2 + 10 + i * (w - 20) / 4, -h + 30 + i % 2 * 4, 3, 14, '#a88040'); k.Win(-w / 4 - 6, -h + 60, 14, 14, true); k.Door(w / 6 - 8, -30, 18, 30); k.R(-w / 4 - 10, -h + 76, 22, 6, P.brown); k.R(-w / 4 - 8, -h + 72, 4, 4, P.pink); k.R(-w / 4 + 2, -h + 72, 4, 4, P.gold); },
    props: [(k, s) => { k.R(-5, -50, 10, 50, P.brown); k.Dm(0, -40, 34 + s % 3 * 6, s % 2 ? P.greenDeep : '#3f8a44'); k.Dm(-14, -54, 18, P.green); }, (k) => { k.Bk(-24, -26, 48, 26, '#d8b060'); k.R(-24, -16, 48, 3, '#b89040'); }, (k) => { for (let i = 0; i < 4; i++) k.R(-36 + i * 24, -30, 5, 30, P.tan); k.R(-38, -24, 80, 4, P.tan); k.R(-38, -12, 80, 4, P.tan); }],
    lit: [0], roof: (k, w, h) => { for (let i = 0; i < 6; i++) k.R(-w / 2 + 14 + i * (w - 28) / 6, -h + 40 + (i % 3) * 5, 10, 8, i % 2 ? P.green : P.greenDeep); k.R(w / 5, -h + 24, 5, 5, P.pink); k.R(w / 5 + 8, -h + 28, 5, 5, P.gold); } },
  holy: { g: ['#7a746a', '#8a847a', '#ffcf4a'], sky: ['#1c1a34', '#4a4668', '#ffe08a'],
    house: (k, w, h, v) => { k.Bk(-w / 2 + 8, -h + 50, w - 16, h - 50, '#e8e0d0'); k.Dm(0, -h + 52, w / 3, '#f4efe0'); k.R(-3, -h + 52 - w / 3 - 30, 6, 30, P.gold); k.R(-9, -h + 52 - w / 3 - 20, 18, 4, P.gold); k.Win(-8, -h + 70, 16, 24, true); k.Door(-10, -32, 20, 32); },
    props: [(k) => { k.Bk(-18, -30, 36, 30, '#b8b0a0'); k.Bk(-10, -80, 20, 50, '#e8e0d0'); k.Bk(-8, -96, 16, 16, '#e8e0d0'); k.R(-12, -100, 24, 3, P.gold); }, (k, s, t) => { k.R(-2, -60, 4, 60, P.gold); k.Bk(-12, -64, 24, 6, P.gold); [-8, 0, 8].forEach((a, i) => { k.R(a - 1, -76, 3, 10, P.cream); const f = 0.8 + 0.2 * Math.sin(t * 9 + i + s); k.R(a - 1, -76 - 6 * f, 3, 5, P.butter); }); }],
    lit: [0], glow: '#ffe08a', roof: (k, w, h, v, t) => { k.R(-3, -h - 44, 6, 46, P.gold); k.T([[-9, -h - 44], [0, -h - 62], [9, -h - 44]], P.gold); k.R(-12, -h - 30, 24, 4, P.gold); } },
  arcane: { g: ['#34284c', '#42325e', '#b86bff'], sky: ['#160f2a', '#3a2a5a', '#d8a0ff'], rune: 1,
    house: (k, w, h, v) => { k.Bk(-w / 2 + 10, -h + 50, w - 20, h - 50, '#5a4a7a'); k.T([[-w / 2 + 2, -h + 52], [w / 8, -h - 10], [w / 2 - 2, -h + 52]], '#6a2fbf'); k.R(w / 8 - 3, -h - 22, 6, 12, P.gold); k.Win(-w / 4, -h + 64, 12, 18, true); k.Win(w / 8, -h + 64, 12, 18, true); k.Door(-10, -30, 20, 30); },
    props: [(k, s, t) => { const b = RM() ? 0 : Math.sin(t * 2 + s) * 6; k.Bk(-10, -22, 20, 22, P.slate); k.T([[0, -74 + b], [12, -54 + b], [0, -34 + b], [-12, -54 + b]], P.violet); k.R(-3, -60 + b, 6, 6, P.white); }, (k, s, t) => { k.Bk(-16, -44, 32, 44, '#4a4a5a'); const a = 0.5 + 0.5 * Math.sin(t * 2 + s); k.R(-6, -34, 12, 3, a > 0.5 ? P.violet : P.violetDeep); k.R(-2, -38, 4, 12, a > 0.5 ? P.violet : P.violetDeep); }],
    lit: [0], glow: '#d8a0ff', roof: (k, w, h, v, t) => { const b = RM() ? 0 : Math.sin(t * 1.6 + v) * 8; k.T([[0, -h - 80 + b], [14, -h - 58 + b], [0, -h - 36 + b], [-14, -h - 58 + b]], P.violet); k.R(-4, -h - 62 + b, 8, 8, P.white); } },
  future: { g: ['#262e3a', '#323c4a', '#4af0ff'], sky: ['#0e1426', '#223048', '#4af0ff'], neon: 1,
    house: (k, w, h, v) => { k.Bk(-w / 2 + 6, -h + 20, w - 12, h - 20, '#3a4658'); k.R(-w / 2 + 6, -h + 20, w - 12, 4, v % 2 ? P.teal : P.magenta); k.R(-w / 2 + 6, -h + 60, w - 12, 3, v % 2 ? P.magenta : P.teal); for (let i = 0; i < Math.max(1, Math.floor((w - 24) / 22)); i++) k.R(-w / 2 + 14 + i * 22, -h + 32, 14, 20, rnd(v + i) < 0.6 ? '#8ff6ff' : '#1a2230'); k.R(-3, -24, 20, 24, '#1a2230'); },
    props: [(k, s, t) => { k.R(-3, -100, 6, 100, '#3a4658'); const on = Math.floor(t * 2 + s) % 4 ? P.teal : P.magenta; k.R(-8, -110, 16, 10, on); k.R(-2, -90, 4, 80, on); }, (k, s, t) => { const b = RM() ? 0 : Math.sin(t * 3 + s) * 5; k.Bk(-16, -96 + b, 32, 10, P.steel); k.R(-22, -98 + b, 10, 3, P.silver); k.R(12, -98 + b, 10, 3, P.silver); k.R(-3, -86 + b, 6, 4, Math.floor(t * 3) % 2 ? P.red : P.teal); }],
    lit: [1], glow: '#4af0ff', roof: (k, w, h, v, t) => { k.R(w / 4, -h - 64, 3, 66, P.steel); k.R(w / 4 - 10, -h - 40, 23, 3, P.steel); k.R(w / 4 - 2, -h - 70, 7, 7, Math.floor(t * 1.5 + v) % 2 ? P.red : '#3a1a1a'); k.R(-w / 2 + 8, -h + 2, w - 16, 3, P.teal); } },
  fun: { g: ['#6a4a6a', '#7a5a7a', '#ff9aa8'], sky: ['#1e1432', '#4a3060', '#ffe07a'],
    house: (k, w, h, v) => { const c = [P.pink, P.teal, P.gold][v % 3]; k.Bk(-w / 2 + 8, -h + 40, w - 16, h - 40, P.cream); for (let i = 0; i < Math.floor((w - 16) / 20); i++) if (i % 2) k.R(-w / 2 + 8 + i * 20, -h + 40, 20, h - 44, c); k.Dm(0, -h + 42, w / 2 - 6, c); k.R(-2, -h + 42 - w / 2 - 10, 4, 14, P.ink); k.R(2, -h + 42 - w / 2 - 10, 14, 8, P.red); k.Door(-10, -30, 20, 30); },
    props: [(k, s, t) => { const b = RM() ? 0 : Math.sin(t * 2 + s) * 5; k.R(-1, -90, 2, 90, P.ink); [[-12, -104, P.red], [8, -110, P.gold], [-2, -122, P.teal]].forEach(([a, y, c]) => { k.Dm(a, y + 10 + b, 10, c); }); }, (k) => { k.Bk(-26, -40, 52, 40, P.cream); for (let i = 0; i < 4; i++) k.R(-26 + i * 13, -40, 7, 40, P.pink); k.T([[-32, -40], [0, -62], [32, -40]], P.red); }],
    lit: [1], roof: (k, w, h, v, t) => { for (let i = 0; i < 6; i++) k.T([[-w / 2 + 10 + i * (w - 20) / 6, -h + 30], [-w / 2 + 10 + (i + 0.5) * (w - 20) / 6, -h + 42], [-w / 2 + 10 + (i + 1) * (w - 20) / 6, -h + 30]], [P.red, P.gold, P.teal][i % 3], false); const b = RM() ? 0 : Math.sin(t * 2 + v) * 5; k.R(w / 3, -h - 36 + b, 2, 36, P.ink); k.Dm(w / 3, -h - 36 + b, 12, P.pink); } },
};
M.TOWN_LOOKS = LOOK;
const lookOf = (k) => LOOK[k] || LOOK.none;
const wonder = (key) => { const B = M.BUILDINGS[key]; return !B || B.statue || (M.townFoot(key).w >= 200 && (B.q || 0) >= 2); };

// ───────── which direction dresses what ─────────
const taken = (m) => M.DIR_ORDER ? M.DIR_ORDER.filter(k => M.dirLv(m, k) > 0) : [];
// a thing picks a direction among those taken, deeper ones more often; it shows up more the more has been taken
const dirFor = (m, seed) => { const ks = taken(m); if (!ks.length) return null; let tot = 0; ks.forEach(k => { tot += M.dirLv(m, k); }); let q = rnd(seed * 3 + 1) * tot; for (const k of ks) { q -= M.dirLv(m, k); if (q <= 0) return k; } return ks[ks.length - 1]; };
const density = (m) => Math.min(0.92, 0.3 + 0.12 * M.dirTaken(m));
// the wave: things of the new direction wait for it to pass
function revealed(T, x, k) { const F = T.lookFx; if (!F || k !== F.k) return 1; const R = F.t * WAVE_V; const d = Math.abs(x - DOOR_X); return d > R ? 0 : cl((R - d) / 220, 0, 1); }

// ───────── cached pictures ─────────
const cache = {};
function pic(key, w, h, paint, dk) {
  const ck = key + '|' + (dk || 0); if (cache[ck]) return cache[ck];
  const c = document.createElement('canvas'); c.width = Math.ceil(w + 80); c.height = Math.ceil(h + 120); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.translate(c.width / 2, c.height - 16);
  paint(kitOf(x), x);
  if (dk) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(16,14,36,' + (dk * 1.45).toFixed(2) + ')'; x.fillRect(0, 0, c.width, c.height); }
  c.ox = c.width / 2; c.oy = c.height - 16; cache[ck] = c; return c;
}

// ───────── the ground of the city and the skyline behind it ─────────
function plazaPic(dk, x0, x1) {
  const L = lookOf(dk), W = Math.ceil(x1 - x0), key = 'plaza|' + dk + '|' + Math.round(x0) + '|' + W; if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = W; c.height = PH; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
  // a trapezoid: the far edge a little shorter, the ends slope down into the grass; lighter towards the back (moonlit)
  const topAt = (e) => e < 140 ? PH - (PH - 14) * (e / 140) : 14;
  for (let px = 0; px < W; px += 2) { const e = Math.min(px, W - px), top = topAt(e); for (let yy = Math.floor(top / 2) * 2; yy < PH; yy += 2) R(px, yy, 2, 2, M.shade(L.g[0], 0.1 - 0.16 * (yy / PH))); if (e >= 140 || top < 60) R(px, top, 2, 2, M.shade(L.g[0], -0.35)); }
  // street by street, in front of each row of houses: lines of stones
  [[138, 12], [98, 12], [58, 10]].forEach(([y, h], j) => { for (let px = 0; px < W; px += 2) { const e = Math.min(px, W - px); if (topAt(e) > y) continue; for (let yy = y; yy < y + h; yy += 2) { const k = (px + (yy % 4 ? 6 : 0)) % 14; R(px, yy, 2, 2, k < 2 ? M.shade(L.g[1], -0.3) : ((px * 7 + yy * 3) % 11 < 2 ? L.g[2] : L.g[1])); } } });
  if (L.rail) [142, 146].forEach(y => R(0, y, W, 2, L.g[2]));
  for (let i = 0; i < W / 12; i++) { const a = rnd(i * 3 + 1) * W, b = 24 + rnd(i * 5 + 2) * (PH - 28); R(a, b, 4, 2, M.shade(L.g[0], rnd(i) < 0.5 ? 0.18 : -0.2)); }
  c.x0 = x0; cache[key] = c; return c;
}
function skyPic(dk, lv, x0, x1) {
  const L = lookOf(dk); if (!L.sky) return null; const W = Math.ceil(x1 - x0), H = 300, key = 'sky|' + dk + '|' + lv + '|' + Math.round(x0) + '|' + W; if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const [sil, rim, lit] = L.sky, R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
  const tri = (a, b, w, h, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(a, b); x.lineTo(a + w / 2, b - h); x.lineTo(a + w, b); x.fill(); };
  const dome = (cx, b, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(cx, b, r, Math.PI, 0); x.fill(); };
  const win = (a, b) => R(a, b, 4, 4, lit);
  const n = Math.round(W / (70 - lv * 12));
  for (let i = 0; i < n; i++) {
    const a = rnd(i * 7 + 3) * W, e = Math.min(a, W - a); if (e < 80) continue; const hh = (60 + rnd(i * 11) * 110) * (0.7 + lv * 0.15) * Math.min(1, e / 260), w = 40 + rnd(i * 13) * 60, b = H;
    if (dk === 'city') { R(a, b - hh, w, hh, sil); tri(a - 4, b - hh, w + 8, 24, sil); R(a + w * 0.7, b - hh - 30, 8, 22, sil); for (let j = 0; j < hh / 22; j++) if (rnd(i * 5 + j) < 0.45) win(a + 8 + (j * 13) % (w - 16), b - hh + 12 + j * 18); }
    else if (dk === 'fort') { R(a, b - hh * 0.6, w * 1.6, hh * 0.6, sil); for (let j = 0; j < w * 1.6 / 14; j += 2) R(a + j * 14, b - hh * 0.6 - 10, 10, 10, sil); if (i % 3 === 0) { R(a + w * 0.5, b - hh * 1.1, 34, hh * 1.1, sil); tri(a + w * 0.5 - 6, b - hh * 1.1, 46, 40, rim); win(a + w * 0.5 + 14, b - hh * 0.9); } }
    else if (dk === 'market') { tri(a, b - hh * 0.4, w, hh * 0.5, i % 2 ? rim : sil); R(a, b - hh * 0.4, w, hh * 0.4, sil); if (i % 2) for (let j = 0; j < 6; j++) win(a + j * w / 6, b - hh * 0.5 - Math.sin(j / 5 * Math.PI) * 10); if (i % 5 === 0) R(a + w / 2, b - hh * 1.3, 3, hh * 1.3, sil); }
    else if (dk === 'industry') { R(a, b - hh * 0.5, w, hh * 0.5, sil); if (i % 2 === 0) { R(a + w * 0.3, b - hh * 1.4, 14, hh * 1.4, sil); win(a + w * 0.3 + 5, b - hh * 1.4 + 6); } if (i % 5 === 1) { dome(a + w / 2, b - hh * 0.5, w / 2.2, rim); } for (let j = 0; j < 3; j++) R(a + 6 + j * 14, b - hh * 0.35, 8, 6, lit); }
    else if (dk === 'army') { tri(a, b, w, hh * 0.45, i % 2 ? rim : sil); if (i % 4 === 0) { R(a + w / 2, b - hh, 6, hh, sil); R(a + w / 2 - 12, b - hh, 30, 14, sil); win(a + w / 2 - 2, b - hh + 4); } }
    else if (dk === 'pastoral') { x.fillStyle = i % 2 ? sil : rim; x.beginPath(); x.ellipse(a, b, w * 1.6, hh * 0.35, 0, Math.PI, 0); x.fill(); if (i % 4 === 0) { R(a - 5, b - hh * 0.9, 10, hh * 0.6, sil); dome(a, b - hh * 0.9, 22, sil); } }
    else if (dk === 'holy') { R(a, b - hh * 0.6, w, hh * 0.6, sil); if (i % 2) { dome(a + w / 2, b - hh * 0.6, w / 2.4, sil); R(a + w / 2 - 1, b - hh * 0.6 - w / 2.4 - 16, 3, 16, lit); } else { tri(a + w / 2 - 12, b - hh * 0.6, 24, hh * 0.7, sil); R(a + w / 2 - 1, b - hh * 1.3 - 6, 3, 8, lit); } }
    else if (dk === 'arcane') { const fy = b - hh - 40; x.fillStyle = sil; x.beginPath(); x.moveTo(a, fy); x.lineTo(a + w, fy); x.lineTo(a + w / 2, fy + 40); x.fill(); R(a, fy - 10, w, 10, rim); tri(a + w * 0.3, fy - 10, 14, 26, lit); if (i % 3 === 0) { R(a + w / 2 - 8, b - hh * 0.8, 16, hh * 0.8, sil); tri(a + w / 2 - 14, b - hh * 0.8, 28, 44, rim); } }
    else if (dk === 'future') { R(a, b - hh, w * 0.6, hh, sil); R(a, b - hh, w * 0.6, 3, lit); R(a + w * 0.3, b - hh - 40, 3, 40, sil); if (i % 2) dome(a + w * 0.9, b, w / 2.5, rim); for (let j = 0; j < hh / 24; j++) R(a + 6, b - hh + 14 + j * 22, w * 0.6 - 12, 2, j % 2 ? lit : rim); }
    else if (dk === 'fun') { if (i % 5 === 0) { x.strokeStyle = rim; x.lineWidth = 6; x.beginPath(); x.arc(a, b - 110, 90, 0, Math.PI * 2); x.stroke(); R(a - 3, b - 110, 6, 110, sil); } else { R(a, b - hh * 0.5, w, hh * 0.5, sil); for (let j = 0; j < 4; j++) R(a + j * w / 4, b - hh * 0.5, w / 8, hh * 0.5, rim); tri(a - 6, b - hh * 0.5, w + 12, 30, sil); } }
  }
  cache[key] = c; return c;
}
// the moving parts of a skyline: chimney smoke, blinking lights, the windmill, the ferris wheel, light beams
function skyLive(ctx, dk, lv, x0, x1, t, lights) {
  const W = x1 - x0, n = Math.round(W / (70 - lv * 12)), bY = SKY_Y;
  for (let i = 0; i < n; i++) {
    const a = x0 + rnd(i * 7 + 3) * W, e = Math.min(a - x0, x1 - a); if (e < 80) continue; const hh = (60 + rnd(i * 11) * 110) * (0.7 + lv * 0.15) * Math.min(1, e / 260), w = 40 + rnd(i * 13) * 60;
    if (dk === 'industry' && i % 2 === 0 && !RM()) for (let j = 0; j < 3; j++) { const q = (t * 0.25 + j / 3 + i * 0.13) % 1; ctx.globalAlpha = 0.35 * (1 - q); ctx.fillStyle = '#5a5058'; const s = 14 + q * 40; ctx.fillRect(a + w * 0.3 + 7 - s / 2 + q * 40, bY - hh * 1.4 - q * 120 - s / 2, s, s); ctx.globalAlpha = 1; }
    if (dk === 'future' && Math.floor(t * 1.5 + i) % 3 === 0) { ctx.fillStyle = P.red; ctx.fillRect(a + w * 0.3 - 2, bY - hh - 44, 7, 7); }
    if (dk === 'fun' && i % 5 === 0) { const r = 90; for (let j = 0; j < 8; j++) { const an = t * 0.4 + j * Math.PI / 4; ctx.fillStyle = [P.red, P.gold, P.teal, P.pink][j % 4]; ctx.fillRect(a + Math.cos(an) * r - 7, bY - 110 + Math.sin(an) * r - 7, 14, 14); } }
    if (dk === 'pastoral' && i % 4 === 0) { const cx = a, cy = bY - hh * 0.9; ctx.strokeStyle = '#2a3a2a'; ctx.lineWidth = 6; for (let j = 0; j < 4; j++) { const an = t * (RM() ? 0 : 0.8) + j * Math.PI / 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an) * 46, cy + Math.sin(an) * 46); ctx.stroke(); } }
    if (dk === 'holy' && i % 4 === 1 && !RM()) { ctx.globalAlpha = 0.08 + 0.05 * Math.sin(t + i); ctx.fillStyle = '#ffe08a'; ctx.fillRect(a + w / 2 - 12, bY - 520, 24, 520 - hh * 0.6); ctx.globalAlpha = 1; }
    if (dk === 'arcane' && i % 2 === 0) { const b = Math.sin(t * 1.2 + i) * 6; ctx.fillStyle = P.violet; ctx.fillRect(a + w * 0.3 + 3, bY - hh - 64 + b, 8, 8); if (lights) lights.push({ x: a + w * 0.3, y: bY - hh - 60, r: 90, c: '#d8a0ff', f: 0.6 }); }
  }
}

// the city's colours by direction: [dark, roofs and trims, light] (civil roofs, window light; mc-town.js artOf)
M.DIR_PAL = { city: ['#2a2638', '#4b4f78', '#ffcf6a'], fort: ['#2a2622', '#7a6a5e', '#ffb060'], market: ['#3a2018', '#c0503a', '#ffb04a'], industry: ['#2a1a14', '#8a4a34', '#ff8a3a'], army: ['#2a2418', '#8a7a50', '#ffb060'],
  pastoral: ['#1e2a14', '#c9a050', '#ffe08a'], holy: ['#2a2830', '#e8c060', '#ffe8a0'], arcane: ['#24163a', '#7a3fd0', '#d8a0ff'], future: ['#0e1628', '#2aa8b8', '#8ff6ff'], fun: ['#3a2a4a', '#ff7ab0', '#ffe07a'] };
// one long thing that runs through the whole city behind its last street: a rampart, a palisade, pipes, a hedge, a colonnade, a monorail …
function wallPic(dk, lv, x0, x1) {
  if (!dk || !lv) return null; const W = Math.ceil(x1 - x0), H = 120, key = 'wall|' + dk + '|' + lv + '|' + Math.round(x0) + '|' + W; if (key in cache) return cache[key];
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.translate(0, H); const k = kitOf(x), pal = M.DIR_PAL[dk];
  const span = (step, fn) => { for (let a = 150; a < W - 150; a += step) fn(a); };
  if (dk === 'fort') { k.Bk(140, -52, W - 280, 52, '#5a524c'); span(28, a => k.Bk(a, -66, 16, 14, '#5a524c')); span(420, a => { k.Bk(a, -100, 50, 100, '#6a625a'); k.T([[a - 6, -100], [a + 25, -130], [a + 56, -100]], '#4a3a3a'); k.R(a + 20, -80, 8, 16, P.ink); }); }
  else if (dk === 'army') { span(14, a => k.Bk(a, -44 - (a % 3) * 4, 10, 44 + (a % 3) * 4, '#6a4a2a')); span(360, a => { k.R(a, -110, 5, 110, P.ink); k.R(a + 5, -108, 34, 20, P.red); }); }
  else if (dk === 'industry') { k.Bk(140, -70, W - 280, 14, '#6a6a7a'); k.Bk(140, -44, W - 280, 10, '#7a5a4a'); span(180, a => { k.R(a, -70, 8, 70, '#4a4a5a'); k.Bk(a - 8, -80, 24, 10, P.red); }); }
  else if (dk === 'pastoral') { span(40, a => k.Dm(a, -4, 26 + (a % 5) * 3, a % 80 ? P.greenDeep : '#3f8a44')); span(300, a => { k.R(a - 4, -60, 8, 50, P.brown); k.Dm(a, -56, 36, P.green); }); }
  else if (dk === 'holy') { k.Bk(140, -12, W - 280, 12, '#b8b0a0'); span(46, a => k.Col(a, -70, 10, 58, '#e8e0d0')); k.Bk(140, -82, W - 280, 12, '#e8e0d0'); span(46 * 5, a => { k.Dm(a + 5, -82, 26, '#f4efe0'); k.R(a + 3, -118, 4, 12, P.gold); }); }
  else if (dk === 'arcane') { span(220, a => { k.Bk(a - 10, -50, 20, 50, '#4a4a5a'); k.R(a - 4, -40, 8, 3, P.violet); k.R(a - 2, -44, 4, 11, P.violet); }); }
  else if (dk === 'future') { k.Bk(140, -96, W - 280, 10, '#3a4658'); k.R(140, -88, W - 280, 3, P.teal); span(260, a => { k.Bk(a, -96, 14, 96, '#2a3440'); k.R(a + 5, -80, 4, 60, P.teal); }); }
  else if (dk === 'city') { span(160, a => { k.R(a - 2, -80, 4, 80, P.ink); k.R(a - 1, -78, 2, 76, P.slate); k.Bk(a - 8, -92, 16, 14, P.slate); k.R(a - 5, -89, 10, 8, P.butter); }); k.Bk(140, -16, W - 280, 16, '#3a3650'); }
  else if (dk === 'market') { span(130, a => { const cs = [[P.red, P.cream], [P.teal, P.cream], [P.gold, P.brown]][Math.floor(a / 130) % 3]; k.Bk(a - 40, -34, 80, 34, '#6a4a3a'); for (let i = 0; i < 5; i++) k.R(a - 44 + i * 18, -52, 18, 16, cs[i % 2]); }); }
  else if (dk === 'fun') { span(300, a => { k.R(a - 3, -120, 6, 120, P.ink); k.T([[a - 30, -120], [a, -150], [a + 30, -120]], P.pink); }); }
  cache[key] = c; return c;
}
// its moving parts: a monorail car, a pipe's steam, the pastoral fireflies, the arcane runes' glow
function wallLive(ctx, dk, lv, x0, x1, t, lights) {
  if (!dk || !lv || RM()) return; const W = x1 - x0;
  if (dk === 'future') { const q = (t * 0.12) % 1, a = x0 + 150 + q * (W - 300); ctx.fillStyle = '#c4ccd9'; ctx.fillRect(a - 60, -262, 120, 22); ctx.fillStyle = '#8ff6ff'; for (let i = 0; i < 5; i++) ctx.fillRect(a - 50 + i * 22, -258, 14, 8); if (lights) lights.push({ x: a, y: -250, r: 160, c: '#8ff6ff', f: 0.8 }); }
  if (dk === 'industry') for (let a = x0 + 150; a < x1 - 150; a += 540) { const q = (t * 0.4 + a * 0.01) % 1; ctx.globalAlpha = 0.4 * (1 - q); ctx.fillStyle = '#c4ccd9'; const s = 10 + q * 26; ctx.fillRect(a + 20 + q * 30 - s / 2, -228 - q * 70 - s / 2, s, s); ctx.globalAlpha = 1; }
  if (dk === 'arcane') for (let a = x0 + 150, i = 0; a < x1 - 150; a += 220, i++) { const b = Math.sin(t * 1.5 + i) * 8; ctx.globalAlpha = 0.6; ctx.fillStyle = P.violet; ctx.fillRect(a - 18, -220 + b, 36, 3); ctx.fillRect(a - 2, -236 + b, 4, 34); ctx.globalAlpha = 1; if (lights) lights.push({ x: a, y: -210, r: 110, c: '#d8a0ff', f: 0.6 }); }
  if (dk === 'pastoral') for (let i = 0; i < 16; i++) { const a = x0 + 150 + ((i * 263 + t * 20) % (W - 300)), b = -170 + Math.sin(t * 2 + i) * 30; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + i); ctx.fillStyle = '#e8ff9a'; ctx.fillRect(a, b, 4, 4); ctx.globalAlpha = 1; }
}
// strings over the near street, pole to pole across the city: lanterns (市场化), bunting (乐园化), prayer flags (圣城化)
const STRING = { market: [P.amber, P.gold, P.red], fun: [P.red, P.gold, P.teal, P.pink], holy: [P.gold, P.cream], army: [P.red, P.cream] };
function strings(ctx, T, m, t, lights, dk, lv) {
  const cs = STRING[dk]; if (!cs) return; const L = T.L, x0 = L.edge.L + 120, x1 = L.edge.R - 120, step = 260 - lv * 30;
  for (let a = x0, j = 0; a + step <= x1; a += step, j++) { if (Math.abs(a + step / 2 - DOOR_X) < 340) continue; const y0 = -210 - (j % 2) * 26;
    for (let i = 0; i <= 10; i++) { const q = i / 10, x = a + q * step, y = y0 + Math.sin(q * Math.PI) * 38; const c = cs[(i + j) % cs.length], lit = dk === 'market' && (i + Math.floor(t * 2)) % 3 === 0;
      ctx.fillStyle = P.ink; ctx.fillRect(x - 1, y - 2, 3, 3); if (i % 2) { if (dk === 'market') { ctx.fillStyle = P.ink; ctx.fillRect(x - 6, y, 12, 14); ctx.fillStyle = lit ? P.butter : c; ctx.fillRect(x - 4, y + 2, 8, 10); if (lights && i === 5) lights.push({ x, y: y + 6, r: 90, c: '#ffb04a', f: 0.8 }); } else { ctx.fillStyle = P.ink; ctx.beginPath(); ctx.moveTo(x - 9, y - 1); ctx.lineTo(x + 9, y - 1); ctx.lineTo(x, y + 17); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 6, y + 1); ctx.lineTo(x + 6, y + 1); ctx.lineTo(x, y + 12); ctx.fill(); } } }
    ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 10; i++) { const q = i / 10, x = a + q * step, y = y0 + Math.sin(q * Math.PI) * 38; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
}
// ───────── the look's parts, used by mc-town.js ─────────
const TL = M.TOWN_LOOK = {};
TL.back = function (ctx, T, m, t, lights, bv) {
  const L = T.L; if (!L || !L.edge) return; const x0 = L.edge.L - 60, x1 = L.edge.R + 60, F = T.lookFx;
  const top = M.dirTop ? M.dirTop(m) : null, lv = top ? M.dirLv(m, top) : 0;
  const draw = (dk, dl) => { const sk = skyPic(dk || 'none', dl, x0, x1); if (sk) { ctx.drawImage(sk, x0, SKY_Y - sk.height); skyLive(ctx, dk, dl, x0, x1, t, lights); } const pl = plazaPic(dk || 'none', x0, x1); ctx.drawImage(pl, x0, GY - PH); const wl = wallPic(dk, dl, x0, x1); if (wl) ctx.drawImage(wl, x0, -148 - wl.height); wallLive(ctx, dk, dl, x0, x1, t, lights); };
  if (F && F.from !== top) {
    draw(F.from, F.from ? M.dirLv(m, F.from) : 0);
    const R = F.t * WAVE_V; ctx.save(); ctx.beginPath(); ctx.rect(DOOR_X - R, -1200, R * 2, 1200); ctx.clip(); draw(top, lv); ctx.restore();
  } else draw(top, lv);
};
TL.over = function (ctx, T, m, t, lights) { if (!T.L || !T.L.edge) return; taken(m).forEach(k => { if (STRING[k] && revealed(T, DOOR_X + 400, k) > 0) strings(ctx, T, m, t, lights, k, M.dirLv(m, k)); }); };
// a townsfolk's house of the city's direction (a quarter of them from another direction taken)
TL.filler = function (ctx, T, f, m, t, lights) {
  const top = M.dirTop ? M.dirTop(m) : null, alt = rnd(f.seed + 5) < 0.25 ? dirFor(m, f.seed) : null, dk = alt || top || 'none', v = f.seed % 97, F = T.lookFx;
  const h = 70 + rnd(f.seed + 9) * 60, w = Math.round(f.w / 8) * 8, house = (d) => { const L = lookOf(d); return pic('h|' + d + '|' + v % 6 + '|' + w + '|' + Math.round(h / 10), w, h + 60, (k) => L.house(k, w, h, v), f.dk); };
  const born = f.bornT != null ? cl((T.t - f.bornT) / 0.6, 0, 1) : 1, rv = revealed(T, f.x, dk), L = lookOf(dk); if (born <= 0) return;
  const put = (im, sy) => { ctx.save(); ctx.translate(Math.round(f.x), f.y); ctx.scale(f.sc, f.sc * sy); ctx.drawImage(im, -im.ox, -im.oy); ctx.restore(); };
  if (rv < 1) put(house(F.from && !alt ? F.from : 'none'), 1);   // the old house until the wave comes, then the new one grows over it
  if (rv > 0) put(house(dk), (born < 1 ? 1 - Math.pow(1 - born, 3) : 1) * (rv < 1 ? rv : 1));
  if (lights && L.lit && f.depth < 2 && rnd(f.seed + 2) < 0.5) lights.push({ x: f.x, y: f.y - h * f.sc * 0.5, r: 90 * f.sc, c: (L.sky || [0, 0, '#ffb060'])[2], f: 0.5 });
};
// the things in the streets: a direction taken puts its own there, more the more has been taken
TL.prop = function (ctx, T, p, m, t, lights) {
  const dk = dirFor(m, p.seed); if (!dk) { if (rnd(p.seed) > 0.28) return; } else if (rnd(p.seed + 7) > density(m)) return;
  const L = lookOf(dk), i = Math.floor(rnd(p.seed + 11) * L.props.length), rv = revealed(T, p.x, dk); if (rv <= 0) return;
  const s = p.seed % 13, sc = p.sc * (rv < 1 ? 0.3 + 0.7 * rv : 1) * (p.side < 0 ? -1 : 1);
  ctx.save(); ctx.translate(Math.round(p.x), p.y); ctx.scale(sc, Math.abs(sc)); if (p.far) ctx.globalAlpha = 0.85; L.props[i](kitOf(ctx), s, t); ctx.restore();
  if (lights && (L.glow || L.lit) && rnd(p.seed + 3) < 0.6) lights.push({ x: p.x, y: p.y - 60 * p.sc, r: 110 * p.sc, c: L.glow || (L.sky || [0, 0, '#ffb060'])[2], f: 0.55 + 0.1 * Math.sin(t * 3 + s) });
};
// a civil building's roof, dressed by a direction taken (the deeper, the more of them)
TL.roof = function (ctx, v, m, t, T) {
  if (wonder(v.key)) return; const seed = M.townHash(v.key) + v.c * 13 + v.r * 7, dk = dirFor(m, seed); if (!dk) return;
  const L = lookOf(dk); if (!L.roof || rnd(seed + 5) > 0.35 + 0.22 * M.dirLv(m, dk)) return; const rv = T ? revealed(T, v.x, dk) : 1; if (rv <= 0) return;
  ctx.save(); if (rv < 1) { ctx.translate(0, -v.h); ctx.scale(1, rv); ctx.translate(0, v.h); } if (v.dk) ctx.globalAlpha = 1 - v.dk; L.roof(kitOf(ctx), v.w, v.h, seed % 17, t); ctx.restore();
};
// the wave after a direction is taken: a bright line runs out both ways over the city, sparks behind it
TL.wave = function (ctx, T, m, t, lights) {
  const F = T.lookFx; if (!F || !M.DIRS || !M.DIRS[F.k]) return; const R = F.t * WAVE_V, c = M.DIRS[F.k].c, L = T.L; if (!L || !L.edge) return;
  const a = cl(1 - (F.t - 2.2) / 1, 0, 1); ctx.save(); ctx.globalAlpha = a;
  [-1, 1].forEach(s => { const x = DOOR_X + s * R, e = s < 0 ? L.edge.L : L.edge.R; if ((x - e) * s > 200) return;
    ctx.fillStyle = c; ctx.fillRect(x - 6, -380, 12, 380); ctx.globalAlpha = a * 0.35; ctx.fillRect(x - s * 60 - 30, -380, 60, 380); ctx.globalAlpha = a;
    for (let i = 0; i < 8; i++) { const q = rnd(i * 5 + Math.floor(t * 20)); ctx.fillStyle = i % 2 ? P.white : c; ctx.fillRect(x - s * q * 120, -40 - rnd(i * 3 + Math.floor(t * 15)) * 300, 6, 6); }
    if (lights) lights.push({ x, y: -150, r: 360, c, f: a }); });
  ctx.restore();
  // the direction's name over the main base
  if (U && F.t < 2.8) { const q = cl(F.t / 0.3, 0, 1), fade = cl((2.8 - F.t) / 0.5, 0, 1), lv = M.dirLv(m, F.k); ctx.save(); ctx.globalAlpha = fade; U.text(ctx, M.dirName(F.k, lv), DOOR_X, -560 + (1 - q) * 40, 96 * (0.6 + 0.4 * q), c, { outline: true }); ctx.restore(); }
};

// ───────── a picture of a city grown one way (the cards of the pick, mc-dirs.js) ─────────
const prev = {};
M.dirPreview = function (k, lv) {
  const ck = k + '|' + lv; if (prev[ck]) return prev[ck];
  const W = 600, H = 300, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d0b1e'); g.addColorStop(1, '#2b2461'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { x.fillStyle = i % 5 ? '#6a6394' : '#fff3b0'; x.fillRect(rnd(i) * W, rnd(i + 9) * 150, 2, 2); }
  x.save(); x.translate(0, H); x.scale(0.5, 0.5);
  const x0 = 0, x1 = W * 2, sk = skyPic(k, lv, x0 - 200, x1 + 200); if (sk) x.drawImage(sk, x0 - 200, -130 - sk.height);
  const pl = plazaPic(k, x0 - 200, x1 + 200); x.drawImage(pl, x0 - 200, -2 - PH); const wl = wallPic(k, lv, x0 - 200, x1 + 200); if (wl) x.drawImage(wl, x0 - 200, -150 - wl.height);
  const L = lookOf(k);
  [[130, -130, 0.58, 1], [420, -130, 0.58, 2], [700, -130, 0.58, 3], [960, -130, 0.58, 4], [260, -90, 0.7, 5], [560, -90, 0.7, 6], [850, -90, 0.7, 7], [110, -50, 0.84, 8], [400, -50, 0.84, 9], [700, -50, 0.84, 10], [1020, -50, 0.84, 11]].forEach(([a, b, sc, v], i) => {
    const w = 96 + (v % 3) * 16, h = 80 + (v % 4) * 14, im = pic('h|' + k + '|' + v % 6 + '|' + w + '|' + Math.round(h / 10), w, h + 60, (kk) => L.house(kk, w, h, v), sc < 0.65 ? 0.34 : sc < 0.8 ? 0.2 : 0.06);
    x.save(); x.translate(a, b); x.scale(sc, sc); x.drawImage(im, -im.ox, -im.oy); x.restore();
    if (i >= 7 && L.props.length) { x.save(); x.translate(a + 130, b + 14); x.scale(0.84, 0.84); L.props[i % L.props.length](kitOf(x), i, 0); x.restore(); }
  });
  x.restore();
  x.fillStyle = '#07060f'; x.fillRect(0, 0, W, 6); x.fillRect(0, H - 6, W, 6); x.fillRect(0, 0, 6, H); x.fillRect(W - 6, 0, 6, H);
  prev[ck] = c.toDataURL(); return prev[ck];
};
})();

;
