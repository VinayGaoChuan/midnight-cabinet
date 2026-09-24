// ==== mc-rooms.js ====
(function () {
// One bespoke, animated scene per building so the room always shows what its name says.
// Space: 300 x 210, floor top at y = 180. Painters return 'sky' for outdoor landmarks (no style clutter).
const M = window.MC, K = () => M._roomKit;
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const R = (x, a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
const CI = (x, a, b, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); };
const EL = (x, a, b, rx, ry, c, rot) => { x.fillStyle = c; x.beginPath(); x.ellipse(a, b, rx, ry, rot || 0, 0, 7); x.fill(); };
const PL = (x, pts, c) => { x.fillStyle = c; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
const LN = (x, a, b, c, d, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
const G = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([p, c]) => g.addColorStop(p, c)); return g; };
// outdoor window: sky, stars, optional moon/sun, distant ground
function sky(x, S, t, top, bot, o = {}) {
  x.fillStyle = G(x, 0, 6, 0, S.fy, [[0, top], [1, bot]]); x.fillRect(6, 6, S.w - 12, S.fy - 6);
  for (let i = 0; i < (o.stars == null ? 26 : o.stars); i++) { x.globalAlpha = S.A0 * (0.35 + 0.55 * Math.abs(Math.sin(t * 0.9 + i * 1.7))); R(x, 8 + rnd(i) * (S.w - 16), 8 + rnd(i + 30) * S.fy * 0.55, i % 7 ? 1.4 : 2.2, i % 7 ? 1.4 : 2.2, '#ffffff'); } x.globalAlpha = S.A0;
  if (o.moon) { CI(x, o.moon[0], o.moon[1], 13, '#f5e8c0'); CI(x, o.moon[0] - 5, o.moon[1] - 3, 11, top); K().glowC(x, o.moon[0], o.moon[1], 36, '#f5e8c0', 0.25); }
  if (o.sun) { K().glowC(x, o.sun[0], o.sun[1], 70, o.sunCol || '#ffb060', 0.55); CI(x, o.sun[0], o.sun[1], 22, o.sunCol || '#ffc070'); }
}
function ground(x, S, c1, c2) { x.fillStyle = G(x, 0, S.fy - 4, 0, S.h, [[0, c1], [1, c2]]); x.fillRect(6, S.fy - 4, S.w - 12, S.h - S.fy); }
function water(x, S, t, c1, c2, y0) { y0 = y0 || S.fy - 6; x.fillStyle = G(x, 0, y0, 0, S.h, [[0, c1], [1, c2]]); x.fillRect(6, y0, S.w - 12, S.h - y0); x.globalAlpha = S.A0 * 0.5; for (let i = 0; i < 9; i++) { const yy = y0 + 4 + (i % 3) * 8, xx = (i * 47 + t * 26) % (S.w - 30) + 10; R(x, xx, yy, 14 + (i % 4) * 4, 1.4, '#ffffff'); } x.globalAlpha = S.A0; }
function flame(x, a, b, s, t, ph) { const f = 0.75 + 0.25 * Math.sin(t * 13 + (ph || 0)); x.fillStyle = G(x, 0, b - s * 1.8 * f, 0, b, [[0, '#fff2a0'], [0.5, '#ffb030'], [1, '#ff5a1a']]); x.beginPath(); x.moveTo(a - s * 0.6, b); x.quadraticCurveTo(a - s * 0.7, b - s, a + Math.sin(t * 9 + (ph || 0)) * s * 0.2, b - s * 1.8 * f); x.quadraticCurveTo(a + s * 0.7, b - s, a + s * 0.6, b); x.fill(); K().glowC(x, a, b - s, s * 3, '#ffb030', 0.55 * f); }
function lantern(x, a, b, t, col, ph) { LN(x, a, 6, a, b - 8, 1, '#3a3036'); K().box(x, a - 6, b - 8, 12, 14, col || '#b3372f', 2); const f = 0.8 + 0.2 * Math.sin(t * 7 + (ph || 0)); R(x, a - 3, b - 4, 6, 6, '#ffe08a'); K().glowC(x, a, b, 26, '#ffc060', 0.5 * f); }
function book(x, a, b, w, h, c) { R(x, a, b, w, h, c); R(x, a, b + 2, w, 1, 'rgba(255,255,255,0.35)'); R(x, a, b + h - 3, w, 1, 'rgba(0,0,0,0.3)'); }
function barrel(x, a, b, r, t) { const { box } = K(); box(x, a - r, b - r * 1.2, r * 2, r * 2.4, '#8a5a30', r * 0.6); R(x, a - r, b - r * 0.7, r * 2, 2.4, '#3a3036'); R(x, a - r, b + r * 0.5, r * 2, 2.4, '#3a3036'); EL(x, a, b - r * 1.2 + 2, r * 0.9, 3, '#a8743a'); }
function person(x, a, b, s, body, head) { R(x, a - s * 0.35, b - s * 1.2, s * 0.7, s * 0.9, body); CI(x, a, b - s * 1.45, s * 0.3, head || '#e8c8a0'); R(x, a - s * 0.3, b - s * 0.35, s * 0.2, s * 0.35, body); R(x, a + s * 0.1, b - s * 0.35, s * 0.2, s * 0.35, body); }

const ROOMS = {};
// ───────── recruiting & training ─────────
ROOMS.tavern = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  box(x, 16, 32, 150, 5, '#5a3a22'); box(x, 16, 66, 150, 5, '#5a3a22');
  for (let i = 0; i < 9; i++) { const bx = 22 + i * 15, c = ['#7a2a3a', '#2a6a4a', '#9a7a2a', '#3a4a8a'][i % 4]; R(x, bx, 16, 8, 16, c); R(x, bx + 2, 11, 4, 6, c); R(x, bx + 1, 18, 2, 10, 'rgba(255,255,255,0.3)'); }
  for (let i = 0; i < 7; i++) { const bx = 22 + i * 20; box(x, bx, 52, 12, 14, '#caa870', 2); x.strokeStyle = '#a8864e'; x.lineWidth = 2; x.beginPath(); x.arc(bx + 13, 59, 4, -1.2, 1.2); x.stroke(); }
  barrel(x, 218, 158, 19, t); barrel(x, 262, 158, 19, t); barrel(x, 240, 112, 19, t); R(x, 234, 112, 6, 3, '#caa84a');
  box(x, 12, fy - 58, 178, 14, '#8a5430', 3); box(x, 18, fy - 44, 166, 44, '#5a3418');
  for (let i = 0; i < 5; i++) R(x, 28 + i * 32, fy - 38, 2, 34, 'rgba(0,0,0,0.3)');
  [[40, 0], [96, 1], [150, 2]].forEach(([mx, k]) => { box(x, mx, fy - 76, 16, 18, '#e8d8a8', 2); const fo = Math.sin(t * 3 + k) * 1.5; EL(x, mx + 8, fy - 77 + fo * 0.3, 9, 5, '#fffbe8'); CI(x, mx + 4, fy - 80 + fo, 2.4, '#ffffff'); x.strokeStyle = '#c8b888'; x.lineWidth = 2.4; x.beginPath(); x.arc(mx + 17, fy - 67, 5, -1.3, 1.3); x.stroke(); });
  box(x, 70, fy - 70, 4, 12, '#caa84a'); box(x, 78, fy - 70, 4, 12, '#caa84a'); lantern(x, 150, 34, t, '#b3372f'); lantern(x, 60, 26, t, '#8a5a30', 2);
};
// ───────── food & supplies ─────────
ROOMS.farm = (x, t, P, o, S) => { const { box, glowC } = K();
  for (let r = 0; r < 3; r++) { const y = 46 + r * 44; box(x, 24, y, 250, 6, '#5a6a60'); box(x, 28, y - 10, 242, 10, '#2a3a30');
    const lg = 0.6 + 0.4 * Math.sin(t * 2 + r); R(x, 28, y - 38, 242, 3, '#ff7ad8'); glowC(x, 150, y - 34, 90, '#ff7ad8', 0.18 * lg);
    for (let i = 0; i < 16; i++) { const px = 36 + i * 15, sw = Math.sin(t * 1.6 + i + r) * 2, hgt = 10 + (i * 7 + r * 3) % 9; x.strokeStyle = '#3a8a3a'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(px, y - 10); x.lineTo(px + sw, y - 10 - hgt); x.stroke(); EL(x, px + sw - 3, y - 12 - hgt, 4, 2, '#7ad050', -0.5); EL(x, px + sw + 3, y - 8 - hgt, 4, 2, '#5ab040', 0.5); if ((i + r) % 4 === 0) CI(x, px + sw, y - 14 - hgt, 2.4, '#ff5a4a'); } }
  box(x, 278, 20, 8, 160, '#6a7a8a'); for (let i = 0; i < 3; i++) { const q = (t * 0.8 + i / 3) % 1; CI(x, 282, 30 + q * 140, 2, '#8fe0ff'); }
};
ROOMS.pool = (x, t, P, o, S) => { const { box, glowC, rivets } = K(), fy = S.fy;
  box(x, 36, fy - 44, 228, 44, '#8a98a8', 3); x.fillStyle = G(x, 0, fy - 38, 0, fy - 4, [[0, '#3a9ad0'], [1, '#12466e']]); x.fillRect(42, fy - 38, 216, 34);
  x.strokeStyle = 'rgba(200,240,255,0.7)'; x.lineWidth = 1.4; for (let k = 0; k < 3; k++) { x.beginPath(); for (let xx = 42; xx <= 258; xx += 6) { const yy = fy - 34 + k * 9 + Math.sin(xx * 0.08 + t * 2.4 + k) * 2; xx === 42 ? x.moveTo(xx, yy) : x.lineTo(xx, yy); } x.stroke(); }
  for (let i = 0; i < 7; i++) { const q = (t * 0.6 + i / 7) % 1; x.globalAlpha = S.A0 * (1 - q); x.strokeStyle = '#dff8ff'; x.beginPath(); x.arc(60 + i * 30, fy - 8 - q * 26, 2.4, 0, 7); x.stroke(); } x.globalAlpha = S.A0;
  box(x, 22, 40, 44, 90, '#6a8aa0', 8); rivets(x, [[30, 50], [58, 50], [30, 120], [58, 120]], '#8aa0b8'); R(x, 32, 70, 24, 26, '#12466e'); R(x, 34, 72 + Math.sin(t * 2) * 3, 20, 3, '#8fe0ff'); box(x, 60, 118, 36, 8, '#7a8a98'); box(x, 90, 118, 8, 30, '#7a8a98');
  x.strokeStyle = '#c8d0dc'; x.lineWidth = 3; x.beginPath(); x.moveTo(236, fy - 44); x.lineTo(236, fy - 72); x.lineTo(252, fy - 72); x.lineTo(252, fy - 44); x.stroke(); glowC(x, 150, fy - 20, 120, '#6fd0ff', 0.25);
};
ROOMS.bigben = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#0e1430', '#3a3050', { moon: [250, 36] }); ground(x, S, '#2a2830', '#141218');
  box(x, 30, 110, 70, 70, '#7a6a50'); for (let i = 0; i < 4; i++) R(x, 36 + i * 16, 124, 8, 14, '#ffd060'); box(x, 200, 120, 80, 60, '#7a6a50'); for (let i = 0; i < 4; i++) R(x, 206 + i * 18, 134, 8, 14, '#ffd060');
  box(x, 124, 40, 52, 140, '#a08860'); PL(x, [[120, 42], [150, 8], [180, 42]], '#5a6a50'); R(x, 148, 0, 4, 10, '#caa84a');
  for (let i = 0; i < 5; i++) R(x, 130 + i * 10, 104, 4, 70, 'rgba(0,0,0,0.25)');
  CI(x, 150, 70, 20, '#e8d8a8'); CI(x, 150, 70, 17, '#fff6d8'); glowC(x, 150, 70, 34, '#ffe8a0', 0.4);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; R(x, 150 + Math.cos(a) * 14 - 1, 70 + Math.sin(a) * 14 - 1, 2, 2, '#3a2a1a'); }
  const hm = t * 0.6, hh = t * 0.05; LN(x, 150, 70, 150 + Math.cos(hm - 1.57) * 13, 70 + Math.sin(hm - 1.57) * 13, 1.6, '#1a1410'); LN(x, 150, 70, 150 + Math.cos(hh - 1.57) * 8, 70 + Math.sin(hh - 1.57) * 8, 2.4, '#1a1410'); CI(x, 150, 70, 2, '#caa84a');
  return 'sky';
};
ROOMS.artemis = (x, t, P, o, S) => { const { box, shadowE } = K(), fy = S.fy;
  sky(x, S, t, '#12203a', '#5a4a5a', { moon: [40, 32] }); ground(x, S, '#6a6048', '#3a3428');
  box(x, 40, fy - 16, 220, 8, '#d8d0c0'); box(x, 48, fy - 22, 204, 7, '#e8e0d0');
  for (let i = 0; i < 6; i++) { const cx = 62 + i * 35; box(x, cx - 7, 62, 14, fy - 84, '#f0e8d8'); R(x, cx - 3, 64, 1.4, fy - 88, 'rgba(0,0,0,0.18)'); R(x, cx + 2, 64, 1.4, fy - 88, 'rgba(0,0,0,0.18)'); box(x, cx - 10, 58, 20, 6, '#e8e0d0'); }
  box(x, 46, 48, 208, 12, '#e8e0d0'); PL(x, [[44, 48], [150, 14], [256, 48]], '#f0e8d8'); PL(x, [[62, 44], [150, 22], [238, 44]], '#caa870');
  [[90, 0], [210, 1]].forEach(([bx, k]) => { box(x, bx - 14, fy - 38, 28, 16, '#a8743a', 3); CI(x, bx - 6, fy - 40, 5, '#ff7a3a'); CI(x, bx + 4, fy - 41, 5, '#ffcc33'); CI(x, bx - 1, fy - 44, 5, '#9ccc6a'); });
  flame(x, 150, fy - 30, 7, t);
  return 'sky';
};
// ───────── medicine ─────────
ROOMS.sanitarium = (x, t, P, o, S) => { const { box, glowC, shadowE } = K(), fy = S.fy;
  box(x, 90, 22, 120, 90, '#5a4a38', 6); x.fillStyle = G(x, 0, 28, 0, 106, [[0, '#101a3a'], [1, '#3a3060']]); x.fillRect(96, 28, 108, 78); CI(x, 176, 50, 10, '#f5e8c0'); CI(x, 172, 47, 9, '#1a2448'); for (let i = 0; i < 8; i++) R(x, 100 + rnd(i) * 100, 32 + rnd(i + 9) * 60, 1.4, 1.4, '#ffffff'); R(x, 148, 28, 4, 78, '#5a4a38'); R(x, 96, 64, 108, 4, '#5a4a38');
  shadowE(x, 150, fy, 50, 4); box(x, 112, fy - 34, 76, 26, '#7a3a4a', 6); box(x, 104, fy - 60, 16, 52, '#6a2a3a', 5); box(x, 180, fy - 60, 16, 52, '#6a2a3a', 5); box(x, 118, fy - 64, 64, 32, '#8a4a5a', 8); box(x, 126, fy - 30, 50, 10, '#b8d0a0', 3);
  [[48, 1], [252, -1]].forEach(([px, d]) => { box(x, px - 14, fy - 26, 28, 26, '#8a5a3a', 3); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.4 + Math.sin(t * 1.2 + i) * 0.05; EL(x, px + Math.cos(a) * 18, fy - 34 + Math.sin(a) * 26, 12, 4.5, i % 2 ? '#4a9a3a' : '#6ab04a', a); } });
  box(x, 222, fy - 70, 4, 70, '#3a3036'); PL(x, [[210, fy - 70], [238, fy - 70], [232, fy - 88], [216, fy - 88]], '#e8c870'); glowC(x, 224, fy - 70, 60, '#ffd890', 0.45);
  box(x, 64, fy - 40, 20, 14, '#e8e0d0', 3); for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3) % 1; x.globalAlpha = S.A0 * 0.5 * (1 - q); CI(x, 72 + Math.sin(q * 6 + i) * 3, fy - 44 - q * 20, 3 + q * 3, '#ffffff'); } x.globalAlpha = S.A0;
};
ROOMS.gardens = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#1a2a4a', '#6a5a4a', { sun: [250, 40], sunCol: '#ffb870' }); ground(x, S, '#8a7a50', '#4a4028');
  [[30, 120, 240], [60, 80, 180], [95, 44, 110]].forEach(([a, b, wd], k) => { box(x, a, b, wd, fy - b, '#c8b080'); R(x, a, b, wd, 5, '#6ab04a');
    for (let i = 0; i < wd / 14; i++) { const vx = a + 6 + i * 14, len = 16 + (i * 13 + k * 7) % 22; x.strokeStyle = '#3a8a3a'; x.lineWidth = 2; x.beginPath(); x.moveTo(vx, b + 4); x.quadraticCurveTo(vx + Math.sin(t * 1.3 + i) * 4, b + len / 2, vx + Math.sin(t * 1.3 + i + 1) * 5, b + len); x.stroke(); EL(x, vx + Math.sin(t * 1.3 + i + 1) * 5, b + len, 3.4, 2, i % 3 ? '#7ad050' : '#ff7ab0'); } });
  [[150, 50, 80], [96, 86, 120]].forEach(([wx, y0, y1], k) => { x.fillStyle = G(x, wx - 4, 0, wx + 4, 0, [[0, 'rgba(111,208,255,0.2)'], [0.5, '#bff4ff'], [1, 'rgba(111,208,255,0.2)']]); x.fillRect(wx - 4, y0, 8, y1 - y0); for (let i = 0; i < 4; i++) R(x, wx - 3 + (i % 2) * 3, y0 + ((t * 80 + i * 17 + k * 9) % (y1 - y0)), 2, 5, '#ffffff'); });
  box(x, 262, 90, 6, 90, '#8a6a3a'); for (let i = 0; i < 6; i++) { const a = -Math.PI + i * 0.6 + Math.sin(t) * 0.05; EL(x, 265 + Math.cos(a) * 18, 88 + Math.sin(a) * 8 + 6, 16, 4, '#4a9a3a', a); }
  return 'sky';
};
// ───────── research / training ─────────
ROOMS.library = (x, t, P, o, S) => { const { box, glowC, spark4 } = K(), fy = S.fy;
  [[14, 0], [232, 1]].forEach(([sx, k]) => { box(x, sx, 14, 54, fy - 14, '#4a2e1c'); for (let r = 0; r < 5; r++) { const y = 20 + r * 32; R(x, sx + 3, y + 26, 48, 3, '#2a1a10'); for (let i = 0; i < 7; i++) book(x, sx + 4 + i * 7, y + 6 + ((i + r + k) % 3) * 2, 6, 20 - ((i + r + k) % 3) * 2, ['#8a2a2a', '#2a4a7a', '#3a6a3a', '#7a5a2a', '#5a2a6a'][(i + r * 2 + k) % 5]); } });
  box(x, 90, 24, 120, 90, '#5a3a24'); for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { box(x, 94 + c * 19, 28 + r * 21, 18, 20, '#3a2414'); CI(x, 103 + c * 19, 38 + r * 21, 5.5, '#e8d8a8'); CI(x, 103 + c * 19, 38 + r * 21, 2.4, '#b89a60'); }
  box(x, 112, fy - 36, 76, 10, '#7a5030'); box(x, 118, fy - 26, 8, 26, '#5a3a20'); box(x, 174, fy - 26, 8, 26, '#5a3a20'); PL(x, [[124, fy - 38], [150, fy - 44], [176, fy - 38], [150, fy - 36]], '#f5ead4'); LN(x, 150, fy - 44, 150, fy - 36, 1, '#a89878');
  for (let i = 0; i < 4; i++) { const a = t * 0.9 + i * 1.57, bx = 150 + Math.cos(a) * 60, by = 80 + Math.sin(a) * 14, fl = Math.sin(t * 8 + i) * 3; PL(x, [[bx - 9, by], [bx, by - 4 - fl], [bx + 9, by], [bx, by + 3]], ['#e8d8ff', '#fff2c0', '#d8ffe8', '#ffe0e0'][i]); glowC(x, bx, by, 20, '#c890ff', 0.5); }
  spark4(x, 150, fy - 52, 5, '#ffe8a0'); glowC(x, 150, fy - 44, 50, '#ffd890', 0.35);
};
ROOMS.maracana = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#0a1024', '#1a2440', { stars: 10 }); x.fillStyle = G(x, 0, fy - 40, 0, S.h, [[0, '#2a8a3a'], [1, '#1a5a24']]); x.fillRect(6, fy - 40, S.w - 12, S.h - fy + 40);
  R(x, 6, fy - 40, S.w - 12, 1.6, '#ffffff'); R(x, 148, fy - 40, 1.6, 40, 'rgba(255,255,255,0.6)'); x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = 1.4; x.beginPath(); x.ellipse(150, fy - 20, 22, 8, 0, 0, 7); x.stroke();
  for (let r = 0; r < 4; r++) { const y = 60 + r * 20; box(x, 6, y, S.w - 12, 20, ['#3a3a4a', '#4a4a5a', '#3a3a4a', '#4a4a5a'][r]); for (let i = 0; i < 40; i++) { const jump = Math.max(0, Math.sin(t * 5 - i * 0.35 + r)) * 3; R(x, 10 + i * 7.2, y + 6 - jump, 4, 6, ['#ffcc33', '#2a8ad0', '#ffffff', '#d0453c', '#9ccc6a'][(i + r * 3) % 5]); } }
  [[24, 0], [276, 1]].forEach(([lx, k]) => { box(x, lx - 3, 12, 6, 48, '#8a8a9a'); box(x, lx - 12, 8, 24, 8, '#dfe6f0'); glowC(x, lx, 12, 70, '#e8f4ff', 0.5); });
  box(x, 262, fy - 36, 4, 28, '#ffffff'); box(x, 262, fy - 36, 22, 4, '#ffffff'); x.strokeStyle = 'rgba(255,255,255,0.4)'; x.lineWidth = 1; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(266 + i * 4, fy - 32); x.lineTo(266 + i * 4, fy - 8); x.stroke(); }
  const q = (t * 0.6) % 1, bx = 60 + q * 190, by = fy - 12 - Math.abs(Math.sin(q * Math.PI * 3)) * 40; CI(x, bx, by, 5, '#ffffff'); R(x, bx - 2, by - 2, 3, 3, '#1a1418');
  return 'sky';
};
// ───────── misc & defences ─────────
ROOMS.lookout = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  box(x, 20, fy - 54, 200, 54, '#2a3240', 3); box(x, 30, 26, 150, 100, '#1a2030', 4);
  CI(x, 80, 76, 40, '#06180e'); x.strokeStyle = 'rgba(111,255,160,0.35)'; x.lineWidth = 1; [14, 27, 40].forEach(r => { x.beginPath(); x.arc(80, 76, r, 0, 7); x.stroke(); });
  const a = t * 2; x.save(); x.beginPath(); x.moveTo(80, 76); x.arc(80, 76, 40, a - 0.6, a); x.closePath(); x.fillStyle = 'rgba(111,255,160,0.3)'; x.fill(); x.restore(); LN(x, 80, 76, 80 + Math.cos(a) * 40, 76 + Math.sin(a) * 40, 2, '#9cffb8');
  for (let i = 0; i < 5; i++) { const ba = i * 1.3 + 0.4, br = 12 + i * 6, age = ((a - ba) % 6.283 + 6.283) % 6.283; if (age < 3) { x.globalAlpha = S.A0 * (1 - age / 3); CI(x, 80 + Math.cos(ba) * br, 76 + Math.sin(ba) * br, 2.6, '#c8ffd8'); } } x.globalAlpha = S.A0;
  R(x, 130, 40, 42, 70, '#06180e'); x.strokeStyle = '#6fffa0'; x.lineWidth = 1.2; x.beginPath(); for (let i = 0; i < 40; i++) { const yy = 75 + Math.sin(i * 0.7 + t * 6) * 10 * Math.sin(i * 0.15); i ? x.lineTo(132 + i, yy) : x.moveTo(132, yy); } x.stroke();
  for (let i = 0; i < 8; i++) CI(x, 36 + i * 10, fy - 44, 2.4, (Math.floor(t * 4) + i) % 3 ? '#1a3a2a' : ['#ff4a6a', '#4af0ff', '#ffcc33'][i % 3]);
  box(x, 246, 60, 5, fy - 60, '#6a7486'); x.save(); x.translate(248, 58); x.rotate(Math.sin(t * 0.7) * 0.4); EL(x, 0, 0, 26, 10, '#c8d0dc', -0.3); EL(x, 0, 0, 20, 7, '#8a94a4', -0.3); LN(x, 0, 0, 12, -18, 1.6, '#c8d0dc'); CI(x, 12, -18, 2.4, '#ff4a6a'); x.restore();
  PL(x, [[196, fy - 58], [214, fy - 58], [214, fy - 50], [196, fy - 50]], '#1a1a22'); x.strokeStyle = '#1a1a22'; x.lineWidth = 3; x.beginPath(); x.arc(205, fy - 58, 9, Math.PI, 0); x.stroke();
};
ROOMS.vault = (x, t, P, o, S) => { const { box, glowC, rivets, spark4 } = K(), fy = S.fy;
  CI(x, 110, 96, 70, '#4a4e57'); CI(x, 110, 96, 62, '#8a92a0'); CI(x, 110, 96, 54, '#6a7280'); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; CI(x, 110 + Math.cos(a) * 58, 96 + Math.sin(a) * 58, 2.6, '#c8d0dc'); }
  x.save(); x.translate(110, 96); x.rotate(t * 0.4); for (let i = 0; i < 6; i++) { x.rotate(Math.PI / 3); R(x, -2.5, 0, 5, 36, '#c8a060'); CI(x, 0, 36, 5, '#e8c070'); } CI(x, 0, 0, 12, '#e8c070'); CI(x, 0, 0, 5, '#6a5a3a'); x.restore();
  box(x, 176, 70, 14, 52, '#8a92a0', 3);
  const bars = [[206, 0], [236, 0], [266, 0], [221, 1], [251, 1], [236, 2]]; bars.forEach(([bx, r]) => { PL(x, [[bx - 14, fy - r * 12], [bx + 14, fy - r * 12], [bx + 10, fy - r * 12 - 11], [bx - 10, fy - r * 12 - 11]], '#e8b830'); R(x, bx - 9, fy - r * 12 - 10, 18, 2, '#fff2a0'); });
  const sp = (t * 1.2) % 1; spark4(x, 220 + sp * 40, fy - 30, 6 * Math.sin(sp * Math.PI), '#ffffff'); glowC(x, 236, fy - 16, 60, '#ffcc33', 0.3);
};
ROOMS.ballista = (x, t, P, o, S) => { const { box, shadowE } = K(), fy = S.fy;
  R(x, 186, 0, 50, 10, '#0b090e'); for (let i = 0; i < 12; i++) R(x, 30 + (i % 3) * 8, 40 + Math.floor(i / 3) * 10, 30, 2, '#8a6a3a'); box(x, 26, 36, 40, 44, 'rgba(0,0,0,0)'); for (let i = 0; i < 3; i++) { R(x, 22 + i * 18, 92, 3, 50, '#6a4a2a'); PL(x, [[23.5 + i * 18, 86], [20 + i * 18, 94], [27 + i * 18, 94]], '#9aa0aa'); }
  shadowE(x, 170, fy, 70, 4); box(x, 120, fy - 30, 100, 16, '#7a5230', 2); CI(x, 132, fy - 10, 10, '#4a3220'); CI(x, 208, fy - 10, 10, '#4a3220'); CI(x, 132, fy - 10, 3, '#9aa0aa'); CI(x, 208, fy - 10, 3, '#9aa0aa');
  x.save(); x.translate(170, fy - 40); x.rotate(-0.9); box(x, -8, -8, 110, 16, '#8a5a30', 2); x.strokeStyle = '#6a4a2a'; x.lineWidth = 6; x.beginPath(); x.arc(40, 0, 50, -1.4, 1.4); x.stroke(); const pull = 6 + Math.sin(t * 2) * 4; LN(x, 40 + Math.cos(-1.4) * 50, Math.sin(-1.4) * 50, 40 - pull, 0, 1.4, '#f5ecd8'); LN(x, 40 + Math.cos(1.4) * 50, Math.sin(1.4) * 50, 40 - pull, 0, 1.4, '#f5ecd8'); R(x, 40 - pull, -2, 70, 4, '#a07040'); PL(x, [[110 - pull, -6], [124 - pull, 0], [110 - pull, 6]], '#c8d0dc'); x.restore();
  x.save(); x.translate(150, fy - 30); x.rotate(t * 2); for (let i = 0; i < 4; i++) { x.rotate(Math.PI / 2); R(x, -2, 0, 4, 12, '#5a3a20'); } x.restore();
};
ROOMS.cannon = (x, t, P, o, S) => { const { box, rivets, glowC, gear } = K(), fy = S.fy;
  box(x, 20, 50, 70, fy - 50, '#b87333', 30); rivets(x, [[30, 70], [80, 70], [30, 160], [80, 160]], '#e0a060'); CI(x, 55, 96, 16, '#e8dcc4'); CI(x, 55, 96, 13, '#1a1410'); const nd = -2.2 + (Math.sin(t * 1.3) * 0.5 + 0.5) * 2.4; LN(x, 55, 96, 55 + Math.cos(nd) * 10, 96 + Math.sin(nd) * 10, 1.6, '#ff4a4a');
  box(x, 90, 110, 70, 8, '#8a5a30'); box(x, 160, 60, 8, 58, '#8a5a30');
  box(x, 150, fy - 36, 90, 26, '#5a4030', 3); CI(x, 166, fy - 8, 11, '#3a2a1a'); CI(x, 226, fy - 8, 11, '#3a2a1a');
  x.save(); x.translate(196, fy - 40); x.rotate(-1.0 + Math.sin(t * 0.6) * 0.08); x.fillStyle = G(x, 0, -14, 0, 14, [[0, '#6a6a78'], [0.4, '#b8b8c8'], [1, '#2a2a33']]); x.fillRect(-10, -14, 110, 28); R(x, 96, -17, 10, 34, '#4a4a55'); for (let i = 0; i < 3; i++) R(x, 14 + i * 26, -15, 4, 30, '#b87333'); x.restore();
  [[250, 0], [264, 0], [278, 0], [257, 1], [271, 1], [264, 2]].forEach(([bx, r]) => { CI(x, bx, fy - 6 - r * 12, 6.5, '#2a2a33'); CI(x, bx - 2, fy - 8 - r * 12, 2, '#6a6a78'); });
  for (let i = 0; i < 3; i++) { const q = (t * 0.6 + i / 3) % 1; x.globalAlpha = S.A0 * 0.4 * (1 - q); CI(x, 55 + Math.sin(q * 5) * 4, 44 - q * 40, 6 + q * 12, '#e8dcc4'); } x.globalAlpha = S.A0;
};
ROOMS.tesla = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  box(x, 120, fy - 24, 60, 24, '#3a4250', 3); box(x, 138, 70, 24, 86, '#5a6474');
  for (let i = 0; i < 16; i++) R(x, 136, 74 + i * 5, 28, 2.4, i % 2 ? '#e0904a' : '#b86a2a');
  EL(x, 150, 56, 34, 10, '#9aa4b4'); CI(x, 150, 44, 18, '#c8d0dc'); CI(x, 144, 38, 6, '#ffffff'); glowC(x, 150, 44, 60, '#8ff6ff', 0.55 + 0.25 * Math.sin(t * 20));
  const seed = Math.floor(t * 14); for (let k = 0; k < 3; k++) { let px = 150, py = 44; const tx = 150 + (rnd(seed + k) - 0.5) * 260, ty = 20 + rnd(seed + k * 7) * 140; x.strokeStyle = '#dff8ff'; x.lineWidth = 2; x.globalAlpha = S.A0 * 0.9; x.beginPath(); x.moveTo(px, py); for (let s = 1; s <= 6; s++) { px = 150 + (tx - 150) * s / 6 + (rnd(seed + k + s * 3) - 0.5) * 22; py = 44 + (ty - 44) * s / 6 + (rnd(seed * 2 + s + k) - 0.5) * 22; x.lineTo(px, py); } x.stroke(); glowC(x, tx, ty, 16, '#8ff6ff', 0.8); } x.globalAlpha = S.A0;
  box(x, 30, fy - 60, 50, 60, '#2a3240', 3); for (let i = 0; i < 3; i++) { box(x, 38, fy - 52 + i * 16, 34, 8, '#1a1e28'); R(x, 40, fy - 50 + i * 16, (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i))) * 30, 4, '#4af0ff'); }
};
ROOMS.spire = (x, t, P, o, S) => { const { box, glowC, spark4 } = K(), fy = S.fy;
  box(x, 110, fy - 22, 80, 22, '#3a2a50', 3); for (let i = 0; i < 5; i++) { x.globalAlpha = S.A0 * (0.5 + 0.5 * Math.sin(t * 3 + i)); spark4(x, 122 + i * 14, fy - 11, 4, '#d8a0ff'); } x.globalAlpha = S.A0;
  const by = 90 + Math.sin(t * 1.6) * 8; x.save(); x.translate(150, by); x.rotate(Math.sin(t * 0.8) * 0.06);
  PL(x, [[0, -70], [18, -10], [0, 50], [-18, -10]], '#9a5ad0'); PL(x, [[0, -70], [18, -10], [0, -4]], '#e0b8ff'); PL(x, [[-18, -10], [0, -4], [0, 50]], '#6a2aa0'); x.restore();
  glowC(x, 150, by - 10, 90, '#c890ff', 0.5);
  for (let k = 0; k < 2; k++) { x.strokeStyle = k ? '#e0b8ff' : '#b86bff'; x.lineWidth = 1.4; x.beginPath(); x.ellipse(150, by - 10 + k * 20, 56 - k * 12, 12, 0, 0, 7); x.stroke(); for (let i = 0; i < 6; i++) { const a = t * (k ? -1.4 : 1.1) + i * 1.05; R(x, 150 + Math.cos(a) * (56 - k * 12) - 2, by - 10 + k * 20 + Math.sin(a) * 12 - 2, 4, 4, '#ffffff'); } }
  x.globalAlpha = S.A0 * (0.3 + 0.2 * Math.sin(t * 4)); x.fillStyle = G(x, 140, 0, 160, 0, [[0, 'rgba(200,144,255,0)'], [0.5, '#e0c0ff'], [1, 'rgba(200,144,255,0)']]); x.fillRect(140, 6, 20, by - 70); x.globalAlpha = S.A0;
};
// ───────── industry ─────────
ROOMS.wolfsburg = (x, t, P, o, S) => { const { box, glowC, rivets } = K(), fy = S.fy;
  box(x, 6, 20, S.w - 12, 8, '#5a5a66'); for (let i = 0; i < 8; i++) LN(x, 14 + i * 38, 28, 32 + i * 38, 20, 2, '#3a3a44');
  box(x, 10, fy - 28, 280, 14, '#2a2a33'); for (let i = 0; i < 18; i++) { const rx = 18 + i * 16; CI(x, rx, fy - 21, 5, '#6a6a78'); CI(x, rx, fy - 21, 2, '#2a2a33'); } for (let i = 0; i < 20; i++) R(x, 10 + ((i * 16 + t * 40) % 280), fy - 30, 8, 2, '#8a8a9a');
  for (let i = 0; i < 3; i++) { const cx = (t * 40 + i * 110) % 340 - 30; box(x, cx - 26, fy - 50, 52, 20, ['#d0453c', '#2a6ad0', '#e8e0d0'][i], 4); box(x, cx - 16, fy - 62, 30, 14, ['#b0302a', '#1a4ab0', '#c8c0b0'][i], 4); R(x, cx - 12, fy - 60, 22, 8, '#8fd0ff'); CI(x, cx - 16, fy - 30, 6, '#1a1a22'); CI(x, cx + 16, fy - 30, 6, '#1a1a22'); }
  const ax = 150, ay = 34, a1 = 1.2 + Math.sin(t * 2) * 0.3, a2 = 0.9 + Math.sin(t * 2 + 1) * 0.4; const ex = ax + Math.cos(a1) * 50, ey = ay + Math.sin(a1) * 50, hx = ex + Math.cos(a1 + a2) * 44, hy = ey + Math.sin(a1 + a2) * 44;
  box(x, ax - 14, 28, 28, 12, '#ffcc33', 2); LN(x, ax, ay, ex, ey, 10, '#ff9a2a'); LN(x, ex, ey, hx, hy, 8, '#ffb040'); CI(x, ex, ey, 7, '#4a4a55'); CI(x, hx, hy, 5, '#dfe6f0');
  if (Math.floor(t * 8) % 2) { for (let i = 0; i < 6; i++) R(x, hx + (rnd(i + Math.floor(t * 20)) - 0.5) * 30, hy + rnd(i * 3 + Math.floor(t * 20)) * 20, 2.4, 2.4, '#fff2a0'); glowC(x, hx, hy, 30, '#ffe08a', 0.8); }
};
ROOMS.venice = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  water(x, S, t, '#1a4a6a', '#0a1a2a', fy - 30); box(x, 6, fy - 34, 60, 8, '#6a4a2a'); for (let i = 0; i < 3; i++) R(x, 12 + i * 20, fy - 26, 5, 26, '#4a3220');
  const bob = Math.sin(t * 1.4) * 2; x.save(); x.translate(0, bob); PL(x, [[80, fy - 50], [250, fy - 50], [236, fy - 22], [96, fy - 22]], '#7a4a24'); PL(x, [[80, fy - 50], [250, fy - 50], [246, fy - 44], [84, fy - 44]], '#a8743a');
  for (let i = 0; i < 8; i++) LN(x, 100 + i * 18, fy - 50, 104 + i * 17, fy - 24, 1.6, '#5a3418'); for (let i = 0; i < 6; i++) CI(x, 110 + i * 22, fy - 34, 2.4, '#1a1008');
  box(x, 160, 30, 5, fy - 80, '#6a4a2a'); PL(x, [[166, 38], [218, 60], [166, 96]], '#e8dcc4'); x.restore();
  box(x, 262, 14, 6, fy - 44, '#6a4a2a'); LN(x, 265, 18, 206, 30, 3, '#6a4a2a'); const sw = Math.sin(t * 1.2) * 6; LN(x, 210, 30, 210 + sw, 76, 1, '#c8b888'); box(x, 200 + sw, 76, 20, 16, '#8a6a3a', 2); lantern(x, 40, 60, t, '#b3372f');
  return 'sky';
};
ROOMS.ruhr = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  x.fillStyle = G(x, 200, 60, 300, 180, [[0, 'rgba(255,120,40,0.35)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(180, 40, 110, 140);
  box(x, 214, 60, 60, 120, '#3a2a24'); R(x, 226, 80, 36, 50, '#ff7a2a'); R(x, 232, 90, 24, 30, '#ffd060'); glowC(x, 244, 105, 60, '#ff8a3a', 0.6 + 0.2 * Math.sin(t * 9));
  LN(x, 30, fy - 10, 70, 40, 5, '#4a4a55'); LN(x, 110, fy - 10, 70, 40, 5, '#4a4a55'); for (let i = 0; i < 5; i++) { LN(x, 36 + i * 7, fy - 20 - i * 26, 104 - i * 7, fy - 20 - i * 26, 2, '#5a5a66'); LN(x, 36 + i * 7, fy - 20 - i * 26, 98 - i * 7, fy - 46 - i * 26, 1.4, '#5a5a66'); }
  x.save(); x.translate(70, 36); x.rotate(t * 2.5); x.strokeStyle = '#8a8a9a'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 14, 0, 7); x.stroke(); for (let i = 0; i < 4; i++) { x.rotate(Math.PI / 4); R(x, -1, -14, 2, 28, '#8a8a9a'); } x.restore(); LN(x, 70, 50, 70, 120 + Math.sin(t * 2.5) * 20, 1, '#c8c8d0');
  R(x, 6, fy - 6, S.w - 12, 3, '#6a5a50'); for (let i = 0; i < 18; i++) R(x, 10 + i * 16, fy - 4, 8, 4, '#4a3a30');
  const cx = 130 + Math.sin(t * 0.8) * 40; box(x, cx - 24, fy - 30, 48, 22, '#5a5a66', 3); for (let i = 0; i < 6; i++) CI(x, cx - 16 + i * 6.4, fy - 32 - (i % 2) * 3, 5, '#1a1a1e'); CI(x, cx - 14, fy - 7, 5, '#2a2a33'); CI(x, cx + 14, fy - 7, 5, '#2a2a33');
  for (let i = 0; i < 3; i++) { const q = (t * 0.4 + i / 3) % 1; x.globalAlpha = S.A0 * 0.4 * (1 - q); CI(x, 244 + Math.sin(q * 4) * 6, 56 - q * 50, 8 + q * 14, '#5a5058'); } x.globalAlpha = S.A0;
};
// ───────── landmarks (outdoor windows) ─────────
ROOMS.eiffel = (x, t, P, o, S) => { const { glowC, spark4 } = K(), fy = S.fy;
  sky(x, S, t, '#10122e', '#4a2a48', { moon: [252, 34] }); ground(x, S, '#2a2430', '#141018');
  const leg = (s) => { x.strokeStyle = '#8a6a3a'; x.lineWidth = 5; x.beginPath(); x.moveTo(150 + s * 70, fy); x.quadraticCurveTo(150 + s * 30, 110, 150 + s * 8, 30); x.stroke(); }; leg(-1); leg(1);
  [[134, 8, 88], [96, 20, 64], [60, 30, 40]].forEach(([y, th, wd]) => { R(x, 150 - wd / 2 - 8, y, wd + 16, th * 0.4, '#a07840'); });
  x.strokeStyle = 'rgba(160,120,64,0.8)'; x.lineWidth = 1.2; for (let i = 0; i < 10; i++) { const y0 = fy - i * 15, w0 = 70 - i * 6.2, w1 = 70 - (i + 1) * 6.2; x.beginPath(); x.moveTo(150 - w0, y0); x.lineTo(150 + w1, y0 - 15); x.moveTo(150 + w0, y0); x.lineTo(150 - w1, y0 - 15); x.stroke(); }
  R(x, 148, 10, 4, 22, '#a07840'); PL(x, [[150, 2], [153, 12], [147, 12]], '#caa84a');
  for (let i = 0; i < 18; i++) { const on = Math.sin(t * 6 + i * 2.3) > 0.3, yy = fy - 10 - rnd(i) * 150, wd = Math.max(4, 66 * (1 - (fy - yy) / 170)); if (on) { spark4(x, 150 + (rnd(i + 5) - 0.5) * wd * 2, yy, 3, '#fff6c0'); } }
  const a = Math.sin(t * 0.8) * 0.9; x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = S.A0 * 0.18; x.fillStyle = '#fff2c0'; x.beginPath(); x.moveTo(150, 14); x.lineTo(150 + Math.cos(a - 1.57 - 0.12) * 300, 14 + Math.sin(a - 1.57 - 0.12) * 300); x.lineTo(150 + Math.cos(a - 1.57 + 0.12) * 300, 14 + Math.sin(a - 1.57 + 0.12) * 300); x.fill(); x.restore(); glowC(x, 150, 14, 24, '#fff2c0', 0.7);
  return 'sky';
};
ROOMS.machu = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#1a2a4a', '#8a6a6a', { stars: 10, sun: [60, 50], sunCol: '#ffa870' });
  PL(x, [[150, 180], [226, 30], [248, 22], [290, 180]], '#3a5a3a'); PL(x, [[226, 30], [248, 22], [256, 50], [236, 60]], '#5a7a4a'); PL(x, [[6, 180], [60, 110], [110, 180]], '#2a4a3a');
  for (let r = 0; r < 5; r++) { const y = fy - 16 - r * 18, x0 = 20 + r * 16, x1 = 250 - r * 22; box(x, x0, y, x1 - x0, 18, '#8a8070'); R(x, x0, y, x1 - x0, 5, '#6ab04a'); }
  [[70, 1], [120, 2], [170, 1]].forEach(([hx, r]) => { const y = fy - 16 - r * 18; box(x, hx, y - 20, 24, 20, '#a89878'); PL(x, [[hx - 3, y - 20], [hx + 12, y - 32], [hx + 27, y - 20]], '#8a7a3a'); R(x, hx + 9, y - 12, 6, 12, '#2a2018'); });
  x.strokeStyle = '#6fd0ff'; x.lineWidth = 3; x.beginPath(); x.moveTo(238, fy - 90); x.lineTo(238, fy - 16); x.stroke(); x.save(); x.translate(238, fy - 22); x.rotate(t * 2); for (let i = 0; i < 6; i++) { x.rotate(Math.PI / 3); R(x, -1.5, 0, 3, 14, '#a8743a'); } x.restore(); CI(x, 238, fy - 22, 4, '#6a4a2a'); glowC(x, 238, fy - 22, 30, '#ffe08a', 0.4 + 0.3 * Math.sin(t * 6));
  return 'sky';
};
ROOMS.pyramids = (x, t, P, o, S) => { const { glowC } = K(), fy = S.fy;
  sky(x, S, t, '#2a1a3a', '#e08a4a', { stars: 8, sun: [238, 70], sunCol: '#ffcf70' }); ground(x, S, '#d8a860', '#8a6030');
  PL(x, [[40, fy], [140, 40], [240, fy]], '#d8b070'); PL(x, [[140, 40], [240, fy], [170, fy]], '#a87a40'); for (let i = 1; i < 10; i++) { const y = 40 + i * 14; R(x, 140 - (y - 40) * 1.0, y, (y - 40) * 2.0, 1, 'rgba(90,60,20,0.35)'); }
  PL(x, [[196, fy], [240, 116], [284, fy]], '#c8a060'); PL(x, [[240, 116], [284, fy], [256, fy]], '#9a7038');
  R(x, 20, 90, 10, 90, '#b89060'); PL(x, [[20, 90], [25, 78], [30, 90]], '#caa84a'); for (let i = 0; i < 5; i++) R(x, 22, 100 + i * 14, 6, 2, '#6a4a20');
  x.globalAlpha = S.A0 * 0.25; for (let i = 0; i < 4; i++) R(x, 6, fy - 12 + i * 6 + Math.sin(t * 3 + i) * 1.5, S.w - 12, 1, '#fff2c0'); x.globalAlpha = S.A0;
  return 'sky';
};
ROOMS.stonehenge = (x, t, P, o, S) => { const { box, glowC, spark4 } = K(), fy = S.fy;
  sky(x, S, t, '#0a1024', '#2a3050', { moon: [150, 30] }); ground(x, S, '#3a5a3a', '#1a2a1a');
  [[40, 0.8], [96, 1], [204, 1], [260, 0.8]].forEach(([sx, k]) => { const hgt = 90 * k; box(x, sx - 14 * k, fy - hgt, 12 * k, hgt, '#8a8a90'); box(x, sx + 2 * k, fy - hgt, 12 * k, hgt, '#7a7a80'); box(x, sx - 18 * k, fy - hgt - 10 * k, 36 * k, 10 * k, '#9a9aa0'); });
  box(x, 130, fy - 110, 14, 110, '#8a8a90'); box(x, 156, fy - 110, 14, 110, '#7a7a80'); box(x, 122, fy - 122, 56, 12, '#9a9aa0');
  const pu = 0.5 + 0.5 * Math.sin(t * 2); box(x, 126, fy - 16, 48, 12, '#6a6a70', 3); glowC(x, 150, fy - 16, 70, '#7fb0ff', 0.45 * pu); for (let i = 0; i < 5; i++) { x.globalAlpha = S.A0 * pu; spark4(x, 134 + i * 8, fy - 10, 3, '#bfe0ff'); } x.globalAlpha = S.A0;
  for (let i = 0; i < 5; i++) { const q = (t * 0.5 + i / 5) % 1; x.globalAlpha = S.A0 * (1 - q); R(x, 140 + Math.sin(i * 2 + q * 4) * 12, fy - 20 - q * 90, 2.4, 2.4, '#bfe0ff'); } x.globalAlpha = S.A0;
  return 'sky';
};
ROOMS.colossus = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#12203a', '#4a5a7a', { moon: [40, 30] }); water(x, S, t, '#1a4a70', '#0a1a30', fy - 20);
  box(x, 36, fy - 44, 44, 44, '#a89878'); box(x, 220, fy - 44, 44, 44, '#a89878');
  const bz = '#b87a3a', bzd = '#8a5a2a';
  LN(x, 62, fy - 44, 128, 112, 16, bzd); LN(x, 238, fy - 44, 172, 112, 16, bz); LN(x, 62, fy - 44, 76, fy - 60, 18, bzd); LN(x, 238, fy - 44, 224, fy - 60, 18, bz);
  PL(x, [[122, 100], [178, 100], [184, 124], [116, 124]], '#8a5a2a'); box(x, 128, 52, 44, 56, bz, 10); R(x, 132, 70, 36, 3, 'rgba(0,0,0,0.25)'); R(x, 148, 56, 3, 44, 'rgba(0,0,0,0.2)');
  CI(x, 150, 40, 12, bz); R(x, 144, 38, 3, 2, '#3a2010'); R(x, 153, 38, 3, 2, '#3a2010'); for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6; LN(x, 150 + Math.cos(a) * 11, 40 + Math.sin(a) * 11, 150 + Math.cos(a) * 21, 40 + Math.sin(a) * 21, 2.4, '#e8b050'); }
  LN(x, 168, 58, 192, 22, 9, bz); box(x, 186, 14, 12, 10, '#caa84a', 2); flame(x, 192, 14, 7, t); LN(x, 132, 58, 116, 100, 8, bzd); glowC(x, 150, 70, 60, '#ffcf70', 0.18);
  const bx = (t * 30) % 360 - 30; PL(x, [[bx - 16, fy - 16], [bx + 16, fy - 16], [bx + 10, fy - 8], [bx - 10, fy - 8]], '#6a4a2a'); R(x, bx - 1, fy - 40, 2, 24, '#5a3a20'); PL(x, [[bx + 1, fy - 38], [bx + 16, fy - 22], [bx + 1, fy - 20]], '#e8dcc4');
  return 'sky';
};
ROOMS.terracotta = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  x.fillStyle = G(x, 0, 6, 0, fy, [[0, '#5a3a24'], [1, '#3a2418']]); x.fillRect(6, 6, S.w - 12, fy - 6); for (let i = 0; i < 40; i++) R(x, rnd(i) * 290, rnd(i + 40) * 170, 6, 2, 'rgba(0,0,0,0.25)');
  for (let r = 0; r < 3; r++) { const y = 80 + r * 40, s = 22 + r * 5; for (let i = 0; i < 6 - r; i++) { const px = 38 + r * 20 + i * (230 - r * 30) / (5 - r); person(x, px, y + s * 0.4, s, '#b8744a', '#c8845a'); R(x, px - s * 0.35, y - s * 0.6, s * 0.7, 3, '#8a4a2a'); LN(x, px + s * 0.45, y - s * 1.4, px + s * 0.45, y + s * 0.3, 1.6, '#6a4a2a'); PL(x, [[px + s * 0.45, y - s * 1.7], [px + s * 0.55, y - s * 1.4], [px + s * 0.35, y - s * 1.4]], '#9aa0aa'); } }
  for (let i = 0; i < 6; i++) { const q = (t * 0.1 + i / 6) % 1; x.globalAlpha = S.A0 * 0.5 * Math.sin(q * Math.PI); R(x, 20 + rnd(i) * 260, 30 + q * 120, 2, 2, '#e8c8a0'); } x.globalAlpha = S.A0; glowC(x, 150, 40, 120, '#ffc080', 0.2);
};
ROOMS.zeus = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  [[30, 0], [252, 1]].forEach(([cx]) => { box(x, cx, 20, 18, fy - 20, '#d8d0c0'); for (let i = 1; i < 4; i++) R(x, cx + i * 4.5, 24, 1, fy - 28, 'rgba(0,0,0,0.2)'); });
  box(x, 90, fy - 30, 120, 30, '#caa84a', 3); box(x, 100, 40, 100, 110, '#b8902a', 6); box(x, 108, 48, 84, 94, '#6a2a3a', 4);
  box(x, 120, 90, 60, 60, '#e8b830', 8); CI(x, 150, 70, 16, '#f0dcc0'); EL(x, 150, 86, 14, 12, '#e8e0d0'); PL(x, [[134, 62], [150, 50], [166, 62]], '#caa84a');
  LN(x, 176, 100, 206, 70, 7, '#f0dcc0'); const fl = Math.sin(t * 16) > 0.2; PL(x, [[212, 38], [202, 66], [212, 64], [200, 96], [220, 60], [210, 62], [220, 38]], fl ? '#fff6a0' : '#ffcc33'); glowC(x, 210, 66, 50, '#fff2a0', fl ? 0.8 : 0.4);
  if (Math.floor(t * 3) % 4 === 0) { LN(x, 212, 38, 240, 8, 2, '#ffffff'); LN(x, 212, 38, 180, 12, 1.4, '#fff6c0'); }
};
ROOMS.kotoku = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#1a2440', '#5a4a5a', { stars: 14 }); ground(x, S, '#5a5040', '#2a2418');
  CI(x, 150, 58, 40, 'rgba(255,220,140,0.18)'); box(x, 96, fy - 20, 108, 20, '#6a8078', 4); EL(x, 150, fy - 36, 58, 20, '#4a7068'); EL(x, 150, 120, 40, 42, '#5a8078'); EL(x, 150, fy - 40, 36, 12, '#6a9088');
  CI(x, 150, 66, 22, '#5a8078'); for (let i = 0; i < 12; i++) CI(x, 134 + (i % 6) * 6.4, 50 + Math.floor(i / 6) * 5, 3, '#4a7068'); R(x, 138, 66, 8, 2, '#2a4a44'); R(x, 154, 66, 8, 2, '#2a4a44'); EL(x, 150, 38, 5, 6, '#4a7068');
  box(x, 232, fy - 30, 22, 30, '#6a5040', 2); for (let i = 0; i < 4; i++) { const q = (t * 0.35 + i / 4) % 1; x.globalAlpha = S.A0 * 0.35 * (1 - q); CI(x, 243 + Math.sin(q * 6 + i) * 8, fy - 36 - q * 90, 4 + q * 10, '#e8e0d8'); } x.globalAlpha = S.A0;
  box(x, 30, 90, 8, 90, '#5a4030'); for (let i = 0; i < 4; i++) EL(x, 34, 70 + i * 16, 28 - i * 5, 9, '#2a5a3a');
  return 'sky';
};
ROOMS.hagia = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#1a1a3a', '#c07050', { stars: 10, sun: [60, 110], sunCol: '#ff9a60' }); ground(x, S, '#8a6a50', '#4a3428');
  box(x, 60, 100, 180, fy - 100, '#d8a888'); EL(x, 150, 100, 64, 52, '#c89878'); R(x, 86, 100, 128, 10, '#d8a888'); EL(x, 150, 96, 60, 46, '#b88868'); x.fillStyle = '#c89878'; x.beginPath(); x.arc(150, 100, 58, Math.PI, 0); x.fill(); R(x, 148, 34, 4, 12, '#caa84a');
  [[80, 124], [220, 124]].forEach(([dx, dy]) => { x.beginPath(); x.fillStyle = '#c89878'; x.arc(dx, dy, 22, Math.PI, 0); x.fill(); });
  [[28, 1], [270, 1], [48, 0.8], [250, 0.8]].forEach(([mx, k]) => { box(x, mx - 5 * k, 50 / k, 10 * k, fy - 50 / k, '#e8c8a8'); PL(x, [[mx - 6 * k, 50 / k], [mx, 30 / k], [mx + 6 * k, 50 / k]], '#8a6a5a'); R(x, mx - 7 * k, 80, 14 * k, 3, '#b88868'); });
  for (let i = 0; i < 7; i++) { const lit = (Math.sin(t * 2 + i) + 1) / 2; x.fillStyle = 'rgba(255,210,120,' + (0.4 + 0.5 * lit) + ')'; x.beginPath(); x.arc(92 + i * 19, 140, 6, Math.PI, 0); x.fill(); R(x, 86 + i * 19, 140, 12, 14, 'rgba(255,210,120,' + (0.4 + 0.5 * lit) + ')'); }
  glowC(x, 150, 140, 90, '#ffd890', 0.3);
  return 'sky';
};
ROOMS.forbidden = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#1a1030', '#5a2a3a', { moon: [258, 30] }); ground(x, S, '#8a8070', '#4a4438');
  box(x, 40, fy - 22, 220, 10, '#e8e0d0'); box(x, 56, fy - 32, 188, 10, '#f0e8d8'); for (let i = 0; i < 6; i++) R(x, 130 + i * 7, fy - 12, 5, 12, '#d8d0c0');
  box(x, 70, 96, 160, 52, '#b02a2a'); for (let i = 0; i < 8; i++) R(x, 76 + i * 20, 96, 6, 52, '#8a1a1a'); for (let i = 0; i < 7; i++) R(x, 84 + i * 20, 106, 12, 30, '#d8a040');
  PL(x, [[40, 100], [260, 100], [236, 80], [64, 80]], '#e8b830'); PL(x, [[40, 100], [30, 94], [46, 96]], '#e8b830'); PL(x, [[260, 100], [270, 94], [254, 96]], '#e8b830');
  PL(x, [[70, 72], [230, 72], [210, 52], [90, 52]], '#f0c040'); PL(x, [[70, 72], [60, 66], [76, 68]], '#f0c040'); PL(x, [[230, 72], [240, 66], [224, 68]], '#f0c040'); R(x, 80, 72, 140, 8, '#6a1a1a'); for (let i = 0; i < 12; i++) R(x, 70 + i * 14, 84, 2, 14, 'rgba(0,0,0,0.25)');
  [[56, 0], [244, 1.5]].forEach(([lx, ph]) => { const sw = Math.sin(t * 1.5 + ph) * 3; LN(x, lx, 100, lx + sw, 118, 1, '#3a2020'); EL(x, lx + sw, 126, 8, 10, '#e0303a'); R(x, lx + sw - 6, 116, 12, 2, '#caa84a'); glowC(x, lx + sw, 126, 26, '#ff6040', 0.5); });
  return 'sky';
};
ROOMS.taj = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#0e1430', '#3a3a6a', { moon: [60, 28] });
  const draw = (sy, a) => { x.save(); x.globalAlpha = S.A0 * a; x.translate(0, sy); box(x, 90, 80, 120, 64, '#f0ece4'); x.fillStyle = '#e8e4dc'; x.beginPath(); x.ellipse(150, 70, 32, 34, 0, Math.PI, 0); x.fill(); EL(x, 150, 58, 30, 30, '#f5f2ea'); PL(x, [[148, 26], [150, 16], [152, 26]], '#caa84a'); R(x, 130, 100, 40, 44, '#c8c4bc'); x.beginPath(); x.fillStyle = '#1a2040'; x.ellipse(150, 110, 12, 14, 0, Math.PI, 0); x.fill(); R(x, 138, 110, 24, 34, '#1a2040');
    [[70, 0], [230, 0]].forEach(([mx]) => { box(x, mx - 5, 60, 10, 84, '#f0ece4'); EL(x, mx, 58, 7, 7, '#f5f2ea'); R(x, mx - 7, 90, 14, 3, '#d8d4cc'); }); [[118, 0], [182, 0]].forEach(([dx]) => EL(x, dx, 82, 10, 10, '#f5f2ea')); x.restore(); };
  draw(0, 1); x.fillStyle = G(x, 0, 150, 0, S.h, [[0, '#2a3a6a'], [1, '#0a1020']]); x.fillRect(6, 150, S.w - 12, S.h - 150);
  x.save(); x.beginPath(); x.rect(6, 150, S.w - 12, S.h - 150); x.clip(); x.translate(0, 300); x.scale(1, -1); draw(0, 0.35); x.restore();
  for (let i = 0; i < 6; i++) R(x, 60 + ((i * 37 + t * 12) % 180), 160 + (i % 3) * 10, 18, 1, 'rgba(255,255,255,0.3)');
  [[36, 0], [264, 0]].forEach(([tx]) => { EL(x, tx, 130, 8, 22, '#1a3a2a'); R(x, tx - 1, 150, 2, 6, '#3a2a1a'); });
  return 'sky';
};
ROOMS.liberty = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#10183a', '#4a4a6a', { stars: 20 }); water(x, S, t, '#1a3a5a', '#0a1426', fy - 18);
  PL(x, [[100, fy - 16], [200, fy - 16], [188, fy - 50], [112, fy - 50]], '#a89878'); box(x, 124, fy - 90, 52, 42, '#b8a888');
  const gc = '#5ab098', gd = '#3a8a78'; PL(x, [[128, fy - 90], [172, fy - 90], [166, 70], [134, 70]], gc); for (let i = 0; i < 4; i++) LN(x, 138 + i * 7, 76, 134 + i * 9, fy - 92, 1.4, gd);
  CI(x, 150, 58, 11, gc); for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6; PL(x, [[150 + Math.cos(a - 0.12) * 11, 58 + Math.sin(a - 0.12) * 11], [150 + Math.cos(a) * 22, 58 + Math.sin(a) * 22], [150 + Math.cos(a + 0.12) * 11, 58 + Math.sin(a + 0.12) * 11]], gc); }
  LN(x, 164, 74, 178, 30, 7, gc); box(x, 173, 22, 10, 10, '#caa84a', 2); flame(x, 178, 22, 7, t); box(x, 126, 88, 12, 18, gd, 2);
  return 'sky';
};
ROOMS.opera = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#0a1030', '#3a2a5a', { stars: 24 }); water(x, S, t, '#1a2a5a', '#080c1c', fy - 22);
  box(x, 40, fy - 36, 220, 14, '#c8b8a0');
  [[70, 90, 1], [120, 60, 1.25], [176, 70, 1.15], [226, 100, 0.9]].forEach(([sx, top, k]) => { x.fillStyle = '#f5f2ea'; x.beginPath(); x.moveTo(sx - 30 * k, fy - 36); x.quadraticCurveTo(sx - 26 * k, top - 10, sx + 20 * k, top); x.quadraticCurveTo(sx + 6 * k, top + 30, sx + 22 * k, fy - 36); x.fill(); x.strokeStyle = 'rgba(160,150,140,0.7)'; x.lineWidth = 1; for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(sx - 30 * k + i * 12 * k, fy - 36); x.lineTo(sx + 20 * k - i * 3 * k, top + i * 8); x.stroke(); } });
  const cols = ['#ff7ab0', '#ffe07a', '#7fe0ff']; for (let i = 0; i < 3; i++) glowC(x, 90 + i * 60, fy - 40, 50, cols[(i + Math.floor(t)) % 3], 0.35);
  for (let i = 0; i < 5; i++) { const q = (t * 0.3 + i / 5) % 1, nx = 60 + i * 44 + Math.sin(q * 6 + i) * 10, ny = fy - 50 - q * 120; x.globalAlpha = S.A0 * Math.sin(q * Math.PI); CI(x, nx, ny, 4, '#ffffff'); R(x, nx + 3, ny - 14, 1.6, 14, '#ffffff'); R(x, nx + 3, ny - 14, 7, 1.6, '#ffffff'); } x.globalAlpha = S.A0;
  return 'sky';
};
ROOMS.goldengate = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#1a2440', '#7a6a7a', { stars: 12 }); water(x, S, t, '#2a4a6a', '#0e1a2a', fy - 14);
  const red = '#d0503a'; [[80], [220]].forEach(([tx]) => { box(x, tx - 10, 30, 7, fy - 30, red); box(x, tx + 3, 30, 7, fy - 30, red); for (let i = 0; i < 4; i++) R(x, tx - 10, 40 + i * 30, 20, 5, red); });
  const deck = fy - 50; box(x, 6, deck, S.w - 12, 8, '#b04030');
  x.strokeStyle = red; x.lineWidth = 2.4; x.beginPath(); x.moveTo(6, deck - 60); x.quadraticCurveTo(40, deck - 20, 80, 32); x.quadraticCurveTo(150, deck + 10, 220, 32); x.quadraticCurveTo(260, deck - 20, 294, deck - 60); x.stroke();
  x.lineWidth = 1; for (let i = 0; i < 26; i++) { const sx = 10 + i * 11, cy = sx < 80 ? deck - 60 + (sx - 6) * 0.9 : sx < 220 ? 32 + Math.pow((sx - 150) / 70, 2) * (deck - 32 - 6) * 0.9 : deck - 60 + (294 - sx) * 0.9; x.beginPath(); x.moveTo(sx, Math.min(cy, deck)); x.lineTo(sx, deck); x.stroke(); }
  for (let i = 0; i < 4; i++) { const cx = (t * 60 + i * 80) % 320 - 10; box(x, cx - 8, deck - 6, 16, 6, ['#2a6ad0', '#e8e0d0', '#ffcc33', '#3a3a44'][i], 1); R(x, cx + 7, deck - 4, 3, 2, '#fff2a0'); }
  x.globalAlpha = S.A0 * 0.35; for (let i = 0; i < 3; i++) EL(x, (t * 14 + i * 120) % 360 - 30, deck + 20 + i * 8, 60, 6, '#e8e8f0'); x.globalAlpha = S.A0;
  return 'sky';
};
ROOMS.amundsen = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#06101e', '#1a2a40', { stars: 18 });
  for (let k = 0; k < 3; k++) { x.strokeStyle = k === 1 ? 'rgba(200,120,255,0.35)' : 'rgba(111,255,180,0.4)'; x.lineWidth = 8 - k * 2; x.beginPath(); for (let xx = 6; xx <= 294; xx += 8) { const yy = 40 + k * 14 + Math.sin(xx * 0.03 + t * 0.8 + k) * 12; xx === 6 ? x.moveTo(xx, yy) : x.lineTo(xx, yy); } x.stroke(); }
  ground(x, S, '#e8f0f8', '#b8c8d8'); PL(x, [[6, fy - 6], [80, fy - 20], [150, fy - 8], [230, fy - 22], [294, fy - 6], [294, fy], [6, fy]], '#dfe8f2');
  box(x, 150, fy - 70, 110, 40, '#c8ccd4', 3); for (let i = 0; i < 5; i++) R(x, 158 + i * 20, fy - 60, 10, 8, '#ffe08a'); for (let i = 0; i < 4; i++) box(x, 158 + i * 30, fy - 30, 6, 26, '#6a7486');
  x.fillStyle = '#d8dce4'; x.beginPath(); x.arc(90, fy - 10, 36, Math.PI, 0); x.fill(); x.strokeStyle = 'rgba(100,110,130,0.6)'; x.lineWidth = 1; for (let i = 1; i < 4; i++) { x.beginPath(); x.arc(90, fy - 10, i * 12, Math.PI, 0); x.stroke(); } for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(90, fy - 46); x.lineTo(54 + i * 18, fy - 10); x.stroke(); }
  box(x, 272, 40, 4, fy - 40, '#8a94a4'); CI(x, 274, 38, 3, Math.floor(t * 2) % 2 ? '#ff4a4a' : '#5a1a1a');
  for (let i = 0; i < 30; i++) { const q = (t * 0.2 + rnd(i)) % 1; R(x, 6 + ((rnd(i + 9) * 290 + t * 8 * (i % 3)) % 288), 6 + q * 170, 2, 2, '#ffffff'); }
  return 'sky';
};
ROOMS.potala = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#1a2a50', '#6a7aa0', { stars: 10 }); PL(x, [[6, 120], [60, 60], [110, 110], [170, 40], [230, 100], [294, 70], [294, 180], [6, 180]], '#e8eef8'); PL(x, [[6, 180], [40, 130], [150, 110], [260, 130], [294, 180]], '#6a5a48');
  box(x, 50, 100, 200, 60, '#f0ece4'); for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) R(x, 58 + i * 16, 108 + r * 16, 6, 8, '#3a2a20');
  box(x, 110, 66, 80, 40, '#a02a2a'); for (let i = 0; i < 6; i++) R(x, 116 + i * 12, 74, 6, 8, '#3a1a1a'); PL(x, [[104, 66], [196, 66], [186, 56], [114, 56]], '#e8b830'); PL(x, [[134, 56], [166, 56], [158, 46], [142, 46]], '#f0c040');
  for (let s = 0; s < 2; s++) { const y0 = 40 + s * 20; x.strokeStyle = '#8a8a90'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(20, y0); x.quadraticCurveTo(150, y0 + 30, 280, y0); x.stroke(); for (let i = 0; i < 14; i++) { const px = 30 + i * 18, py = y0 + 30 * (1 - Math.pow((px - 150) / 130, 2)) * 0.5 + 2, fl = Math.sin(t * 5 + i + s) * 1.5; R(x, px - 3 + fl, py, 7, 7, ['#2a6ad0', '#ffffff', '#d0453c', '#2a9a4a', '#ffcc33'][i % 5]); } }
  return 'sky';
};
ROOMS.michel = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#1a2040', '#8a7aa0', { moon: [260, 32] }); water(x, S, t, '#4a5a7a', '#1a2030', fy - 26);
  PL(x, [[50, fy - 20], [100, 110], [150, 90], [200, 110], [250, fy - 20]], '#6a6058'); box(x, 60, fy - 44, 180, 24, '#a89888'); for (let i = 0; i < 9; i++) R(x, 64 + i * 20, fy - 50, 10, 6, '#a89888');
  [[90, 120, 24], [120, 100, 30], [178, 104, 28], [204, 124, 22]].forEach(([hx, hy, hw]) => { box(x, hx - hw / 2, hy, hw, fy - 44 - hy, '#b8a898'); PL(x, [[hx - hw / 2 - 2, hy], [hx, hy - 12], [hx + hw / 2 + 2, hy]], '#5a5a66'); });
  box(x, 132, 60, 36, 44, '#c8b8a8'); PL(x, [[130, 60], [150, 44], [170, 60]], '#5a5a66'); PL(x, [[146, 44], [150, 10], [154, 44]], '#6a6a76'); CI(x, 150, 8, 3, '#ffcc33'); glowC(x, 150, 8, 18, '#ffcc33', 0.6); for (let i = 0; i < 3; i++) R(x, 140 + i * 8, 70, 4, 10, '#ffe08a');
  return 'sky';
};
ROOMS.lighthouse = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#0a1026', '#2a3050', { stars: 24 }); water(x, S, t, '#1a3050', '#080e1c', fy - 16);
  box(x, 110, fy - 60, 80, 50, '#d8c8a0'); box(x, 122, fy - 110, 56, 50, '#e0d0a8'); box(x, 132, 44, 36, 26, '#e8d8b0'); PL(x, [[128, 44], [150, 28], [172, 44]], '#caa84a');
  for (let i = 0; i < 4; i++) R(x, 116 + i * 20, fy - 50, 6, 10, '#2a2018');
  const a = t * 1.4, sweep = Math.cos(a); x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = S.A0 * 0.28 * (0.4 + 0.6 * Math.abs(sweep)); x.fillStyle = '#fff2c0'; x.beginPath(); x.moveTo(150, 56); x.lineTo(150 + sweep * 150, 30); x.lineTo(150 + sweep * 150, 84); x.fill(); x.restore();
  flame(x, 150, 64, 8, t); glowC(x, 150, 56, 60, '#ffe08a', 0.7);
  return 'sky';
};
ROOMS.angkor = (x, t, P, o, S) => { const { box, glowC } = K(), fy = S.fy;
  sky(x, S, t, '#1a2440', '#c07a5a', { stars: 8, sun: [60, 60], sunCol: '#ffb070' }); x.fillStyle = G(x, 0, fy - 24, 0, S.h, [[0, '#3a5a6a'], [1, '#1a2a30']]); x.fillRect(6, fy - 24, S.w - 12, S.h - fy + 24);
  box(x, 40, fy - 70, 220, 46, '#8a7a60'); for (let i = 0; i < 10; i++) R(x, 48 + i * 21, fy - 60, 8, 20, '#3a3024');
  const tower = (tx, hgt, wd) => { for (let k = 0; k < 5; k++) { const y = fy - 70 - k * hgt / 5, ww = wd * (1 - k * 0.16); box(x, tx - ww / 2, y - hgt / 5, ww, hgt / 5, '#9a8a6a'); } PL(x, [[tx - wd * 0.2, fy - 70 - hgt], [tx, fy - 70 - hgt - 18], [tx + wd * 0.2, fy - 70 - hgt]], '#8a7a5a'); };
  tower(72, 50, 34); tower(228, 50, 34); tower(110, 70, 40); tower(190, 70, 40); tower(150, 96, 48);
  for (let i = 0; i < 5; i++) { EL(x, 50 + i * 50, fy - 10, 9, 3, '#3a7a4a'); CI(x, 50 + i * 50, fy - 13, 3.4, '#ff9ac0'); }
  x.strokeStyle = '#2a5a2a'; x.lineWidth = 3; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(20 + i * 12, 10); x.quadraticCurveTo(30 + i * 10 + Math.sin(t + i) * 4, 70, 18 + i * 14, 130); x.stroke(); }
  return 'sky';
};
M.ROOMS = ROOMS;
// the headquarters is the best building there is; the tavern the humblest
M.BUILDINGS.core.q = 3;
})();

;
