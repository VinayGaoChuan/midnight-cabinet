// ==== mc-meta-b.js ====
(function () {
// The room: the player sits in front of the cabinet. Furniture is bought here; the camera dives into the machine to play,
// and pulls back out when a game ends. Also: the base-core hit / base explosion ceremonies inside the machine.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, K = M.MK;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (p) => 1 - Math.pow(1 - cl(p, 0, 1), 3), eio = (p) => { p = cl(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const FLOOR = 820, SCREEN = { x: 995, y: 520 };
// clickable areas (logical 1920x1080)
const SLOT = {
  books: { x: 22, y: 300, w: 150, h: 520 }, window: { x: 205, y: 150, w: 300, h: 330 }, plant: { x: 520, y: 560, w: 100, h: 260 }, sofa: { x: 180, y: 590, w: 330, h: 230 },
  drink: { x: 640, y: 560, w: 150, h: 260 }, photo: { x: 560, y: 175, w: 170, h: 130 }, clock: { x: 770, y: 120, w: 90, h: 240 }, machine: { x: 880, y: 330, w: 240, h: 490 },
  rack: { x: 1135, y: 600, w: 100, h: 220 }, calendar: { x: 1150, y: 165, w: 130, h: 150 }, radio: { x: 1150, y: 380, w: 150, h: 100 }, cat: { x: 1240, y: 740, w: 90, h: 80 },
  cabinet: { x: 1340, y: 300, w: 220, h: 520 }, fridge: { x: 1580, y: 400, w: 150, h: 420 }, piggy: { x: 1605, y: 330, w: 100, h: 70 }, door: { x: 1750, y: 240, w: 160, h: 580 } };
const ORDER = ['piggy', 'radio', 'calendar', 'clock', 'photo', 'cat', 'rack', 'drink', 'plant', 'machine', 'sofa', 'books', 'window', 'cabinet', 'fridge', 'door'];
const hit = (x, y) => ORDER.find(k => { const s = SLOT[k]; return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h; });

// ═════════════════════ drawing ═════════════════════
const R = K.R, CI = K.CI, EL = K.EL, PL = K.PL, LN = K.LN, RR = K.RR, GL = K.GL;
function ghost(x, s, t) { x.save(); x.globalAlpha *= 0.55; RR(x, s.x + 4, s.y + 4, s.w - 8, s.h - 8, 10, 'rgba(255,255,255,0.035)'); x.setLineDash([10, 8]); x.lineDashOffset = -t * 20; RR(x, s.x + 4, s.y + 4, s.w - 8, s.h - 8, 10, null, 'rgba(255,224,138,0.5)', 3); x.setLineDash([]); x.restore(); }
function book(x, a, b, w, h, c) { R(x, a, b, w, h, c); R(x, a, b + 3, w, 2, 'rgba(255,255,255,0.25)'); R(x, a, b + h - 5, w, 2, 'rgba(0,0,0,0.3)'); }
const DRAW = {
  books(x, L, t) { const s = SLOT.books; if (!L) return ghost(x, s, t); const hgt = L === 1 ? 300 : 500, y0 = FLOOR - hgt; RR(x, s.x + 10, y0, 130, hgt, 4, '#3a2418'); R(x, s.x + 18, y0 + 8, 114, hgt - 16, '#1e120c');
    const rows = Math.floor((hgt - 20) / 90); for (let r = 0; r < rows; r++) { const yy = y0 + 20 + r * 90; R(x, s.x + 14, yy + 70, 122, 8, '#4a2e1c'); for (let i = 0; i < 9; i++) { if (L === 1 && i > 5 + (r % 2)) break; book(x, s.x + 20 + i * 12, yy + 14 + ((i + r) % 3) * 6, 10, 56 - ((i + r) % 3) * 6, ['#8a2a2a', '#2a4a7a', '#3a6a3a', '#7a5a2a', '#5a2a6a'][(i + r * 2) % 5]); } }
    if (L >= 3) { const bob = Math.sin(t * 2) * 6; GL(x, s.x + 75, y0 - 30 + bob, 70, '#c890ff', 0.7); RR(x, s.x + 45, y0 - 50 + bob, 60, 40, 4, '#6a2aa0', '#e0b8ff', 2); R(x, s.x + 74, y0 - 48 + bob, 2, 36, '#e0b8ff'); } },
  window(x, L, t, g) { const s = SLOT.window, moon = g.meta && g.meta.moon; RR(x, s.x - 12, s.y - 12, s.w + 24, s.h + 24, 6, '#3a2418'); const sky = moon === 'blood' ? ['#2a0808', '#4a1010'] : ['#0a1024', '#1a2440'];
    x.fillStyle = K.LG(x, 0, s.y, 0, s.y + s.h, [[0, sky[0]], [1, sky[1]]]); x.fillRect(s.x, s.y, s.w, s.h);
    for (let i = 0; i < 20; i++) R(x, s.x + (i * 53) % s.w, s.y + (i * 37) % (s.h * 0.6), 2, 2, 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(t * 2 + i)) + ')');
    const mx = s.x + 200, my = s.y + 90, mc = !L ? '#e8f0ff' : moon === 'blood' ? '#ff3a2a' : moon === 'new' ? '#3a4050' : '#fff6d8'; CI(x, mx, my, 42, mc); if (!L || moon !== 'full') CI(x, mx - 16, my - 8, 38, sky[0]); GL(x, mx, my, 150, mc, L ? 0.5 : 0.25);
    for (let i = 0; i < 30; i++) { const q = (t * 0.8 + i / 30) % 1; LN(x, s.x + (i * 37) % s.w, s.y + q * s.h, s.x + (i * 37) % s.w - 6, s.y + q * s.h + 22, 1.5, 'rgba(160,190,230,0.35)'); }
    R(x, s.x + s.w / 2 - 5, s.y, 10, s.h, '#3a2418'); R(x, s.x, s.y + s.h / 2 - 5, s.w, 10, '#3a2418');
    [[s.x - 50, 0], [s.x + s.w + 10, 1]].forEach(([cx0, k]) => { x.fillStyle = K.LG(x, cx0, 0, cx0 + 50, 0, [[0, '#4a1a2a'], [0.5, '#6a2a3a'], [1, '#4a1a2a']]); x.beginPath(); x.moveTo(cx0, s.y - 30); x.lineTo(cx0 + 50, s.y - 30); x.quadraticCurveTo(cx0 + 25 + Math.sin(t + k) * 6, s.y + s.h / 2, cx0 + 50, s.y + s.h + 60); x.lineTo(cx0, s.y + s.h + 60); x.fill(); });
    R(x, s.x - 60, s.y - 36, s.w + 120, 10, '#6a4a2a'); if (!L) ghost(x, { x: s.x + 60, y: s.y + 40, w: 180, h: 110 }, t); },
  plant(x, L, t) { const s = SLOT.plant; if (!L) return ghost(x, s, t); const cx0 = s.x + 50, sw = Math.sin(t * 1.3) * 3; PL(x, [[cx0 - 30, FLOOR], [cx0 + 30, FLOOR], [cx0 + 36, FLOOR - 60], [cx0 - 36, FLOOR - 60]], '#8a4a2a'); R(x, cx0 - 40, FLOOR - 66, 80, 10, '#a85a32');
    if (L === 1) { LN(x, cx0, FLOOR - 64, cx0 + sw, FLOOR - 110, 4, '#3a8a3a'); EL(x, cx0 - 12 + sw, FLOOR - 104, 14, 7, '#6ac04a', -0.5); EL(x, cx0 + 12 + sw, FLOOR - 112, 14, 7, '#5ab040', 0.5); return; }
    const h = L === 2 ? 150 : 200; LN(x, cx0, FLOOR - 64, cx0 + sw, FLOOR - h, 6, L === 3 ? '#6a4a2a' : '#3a7a3a');
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.36, rr = 40 + (i % 3) * 16; EL(x, cx0 + sw + Math.cos(a) * rr, FLOOR - h + 30 + Math.sin(a) * rr * 0.6, 22, 10, i % 2 ? '#3a9a4a' : '#5ac05a', a); }
    if (L === 3) { for (let i = 0; i < 4; i++) { const fx = cx0 + sw + Math.cos(i * 1.6) * 38, fy = FLOOR - h + 20 + Math.sin(i * 2.1) * 20; GL(x, fx, fy, 22, '#ffcc33', 0.6); CI(x, fx, fy, 6, '#ffcc33'); } GL(x, cx0, FLOOR - h + 20, 120, '#8fffb0', 0.3); } },
  sofa(x, L, t) { const s = SLOT.sofa; if (!L) { ghost(x, s, t); EL(x, s.x + 150, FLOOR - 8, 90, 18, '#4a2a3a'); EL(x, s.x + 150, FLOOR - 14, 80, 14, '#6a3a4a'); return; }
    if (L === 1) { RR(x, s.x + 10, FLOOR - 150, 310, 100, 16, '#6a4a3a'); RR(x, s.x, FLOOR - 110, 330, 90, 14, '#7a5a44'); RR(x, s.x - 6, FLOOR - 140, 50, 120, 14, '#6a4a3a'); RR(x, s.x + 290, FLOOR - 140, 50, 120, 14, '#6a4a3a'); R(x, s.x + 140, FLOOR - 104, 40, 24, '#8a6a4a'); R(x, s.x + 30, FLOOR - 20, 10, 20, '#2a1a10'); R(x, s.x + 290, FLOOR - 20, 10, 20, '#2a1a10'); }
    if (L === 2) { EL(x, s.x + 165, FLOOR - 60, 170, 70, '#5a2a8a'); EL(x, s.x + 140, FLOOR - 90, 110, 40, '#7a3aaa'); EL(x, s.x + 120, FLOOR - 100, 40, 14, 'rgba(255,255,255,0.18)'); }
    if (L === 3) { RR(x, s.x + 40, FLOOR - 220, 200, 200, 30, '#2a2a33'); RR(x, s.x + 20, FLOOR - 100, 280, 80, 20, '#3a3a44'); RR(x, s.x + 60, FLOOR - 200, 160, 110, 20, '#4a4a55'); for (let i = 0; i < 6; i++) CI(x, s.x + 80 + i * 24, FLOOR - 150, 5, (Math.floor(t * 4) + i) % 3 ? '#1a3a4a' : '#4af0ff'); GL(x, s.x + 140, FLOOR - 150, 120, '#4af0ff', 0.2); } },
  drink(x, L, t) { const s = SLOT.drink, ty = FLOOR - 110; if (!L) return ghost(x, s, t); RR(x, s.x + 5, ty, 140, 14, 4, '#5a3a22'); R(x, s.x + 15, ty + 14, 10, 96, '#3a2414'); R(x, s.x + 125, ty + 14, 10, 96, '#3a2414');
    const steam = (sx, sy) => { for (let i = 0; i < 4; i++) { const q = (t * 0.5 + i / 4) % 1; x.save(); x.globalAlpha *= 0.4 * (1 - q); CI(x, sx + Math.sin(q * 6 + i) * 8, sy - q * 70, 6 + q * 10, '#e8e0d8'); x.restore(); } };
    if (L === 1) { EL(x, s.x + 75, ty - 26, 34, 28, '#c8d0dc'); R(x, s.x + 50, ty - 8, 50, 8, '#8a94a4'); LN(x, s.x + 106, ty - 34, s.x + 124, ty - 50, 6, '#c8d0dc'); x.strokeStyle = '#2a2a33'; x.lineWidth = 5; x.beginPath(); x.arc(s.x + 75, ty - 52, 16, Math.PI, 0); x.stroke(); steam(s.x + 124, ty - 56); }
    if (L === 2) { RR(x, s.x + 30, ty - 110, 90, 110, 8, '#2a2a33'); R(x, s.x + 40, ty - 96, 70, 30, '#1a1a22'); CI(x, s.x + 55, ty - 81, 5, '#ff4a4a'); R(x, s.x + 64, ty - 60, 22, 30, '#5a3a22'); R(x, s.x + 70, ty - 64 + ((t * 20) % 16), 3, 5, '#3a1a0a'); R(x, s.x + 58, ty - 30, 34, 26, '#e8e0d0'); steam(s.x + 75, ty - 34); }
    if (L === 3) { RR(x, s.x + 15, ty - 170, 120, 170, 10, '#b02a3a'); R(x, s.x + 25, ty - 156, 100, 70, '#1a0a14'); for (let i = 0; i < 6; i++) RR(x, s.x + 30 + (i % 3) * 32, ty - 150 + Math.floor(i / 3) * 34, 24, 28, 4, ['#4ad07a', '#ffcc33', '#4a8aff', '#ff6a8a', '#e8e8f0', '#c890ff'][i]); R(x, s.x + 25, ty - 76, 100, 30, '#2a0a14'); for (let i = 0; i < 5; i++) CI(x, s.x + 35 + i * 20, ty - 30, 5, (Math.floor(t * 5) + i) % 2 ? '#fff2a0' : '#6a4a2a'); GL(x, s.x + 75, ty - 110, 130, '#ff6a8a', 0.25); } },
  photo(x, L, t) { const s = SLOT.photo; if (!L) return ghost(x, s, t); const fr = (a, b, w, h) => { RR(x, a, b, w, h, 3, '#caa84a'); R(x, a + 6, b + 6, w - 12, h - 12, '#2a2430'); CI(x, a + w / 2, b + h / 2 - 4, Math.min(w, h) * 0.18, '#5a5060'); R(x, a + w / 2 - w * 0.2, b + h / 2 + 4, w * 0.4, h * 0.2, '#5a5060'); };
    if (L === 1) fr(s.x + 50, s.y + 20, 70, 90); if (L >= 2) { fr(s.x, s.y + 10, 60, 70); fr(s.x + 66, s.y, 50, 60); fr(s.x + 120, s.y + 20, 50, 70); fr(s.x + 30, s.y + 86, 60, 44); fr(s.x + 96, s.y + 70, 60, 58); }
    if (L === 3) { const f = 0.8 + 0.2 * Math.sin(t * 10); R(x, s.x + 70, s.y + 150, 30, 40, '#e8dcc4'); GL(x, s.x + 85, s.y + 140, 60 * f, '#ffb060', 0.7); EL(x, s.x + 85, s.y + 142, 5 * f, 12 * f, '#ffcc33'); } },
  clock(x, L, t) { const s = SLOT.clock; if (!L) return ghost(x, s, t); const cx0 = s.x + 45, hy = s.y + 60;
    if (L < 3) { RR(x, s.x + 5, s.y, 80, L === 2 ? 230 : 180, 8, '#5a3a22'); CI(x, cx0, hy, 32, '#e8dcc4'); for (let i = 0; i < 12; i++) R(x, cx0 + Math.cos(i * 0.52) * 26 - 1, hy + Math.sin(i * 0.52) * 26 - 1, 3, 3, '#3a2a1a'); LN(x, cx0, hy, cx0 + Math.cos(t * 0.5) * 22, hy + Math.sin(t * 0.5) * 22, 2, '#1a1410'); LN(x, cx0, hy, cx0 + Math.cos(t * 0.04) * 14, hy + Math.sin(t * 0.04) * 14, 3, '#1a1410');
      R(x, s.x + 15, hy + 40, 60, (L === 2 ? 180 : 130) - 50, '#2a1a10'); const pa = Math.sin(t * 3) * 0.35; LN(x, cx0, hy + 44, cx0 + Math.sin(pa) * 60, hy + 44 + Math.cos(pa) * 60, 3, '#caa84a'); CI(x, cx0 + Math.sin(pa) * 64, hy + 44 + Math.cos(pa) * 64, 10, '#e8b830'); }
    else { RR(x, s.x + 10, s.y + 30, 70, 14, 4, '#caa84a'); RR(x, s.x + 10, s.y + 200, 70, 14, 4, '#caa84a'); PL(x, [[s.x + 20, s.y + 44], [s.x + 70, s.y + 44], [cx0, s.y + 122]], 'rgba(200,230,255,0.25)'); PL(x, [[cx0, s.y + 122], [s.x + 20, s.y + 200], [s.x + 70, s.y + 200]], 'rgba(200,230,255,0.25)'); const q = (t * 0.1) % 1; PL(x, [[s.x + 26 + q * 20, s.y + 50 + q * 60], [s.x + 64 - q * 20, s.y + 50 + q * 60], [cx0, s.y + 122]], '#ffcc33'); PL(x, [[cx0 - 6 - q * 18, s.y + 196], [cx0 + 6 + q * 18, s.y + 196], [cx0, s.y + 180 - q * 40]], '#ffcc33'); R(x, cx0 - 1, s.y + 122, 2, 70, '#ffe08a'); GL(x, cx0, s.y + 122, 90, '#ffcc33', 0.5); } },
  rack(x, L, t) { const s = SLOT.rack; if (!L) return ghost(x, s, t); const hgt = L === 1 ? 110 : L === 2 ? 200 : 220, y0 = FLOOR - hgt; RR(x, s.x + 5, y0, 90, hgt, 4, '#2a2a33'); const n = L === 1 ? 3 : 10;
    for (let i = 0; i < n; i++) { const r = Math.floor(i / 5), c = i % 5; RR(x, s.x + 12 + c * 16, y0 + 12 + r * 60, 13, 48, 2, ['#d0453c', '#2a6ad0', '#ffcc33', '#4ad07a', '#c890ff'][i % 5]); R(x, s.x + 14 + c * 16, y0 + 18 + r * 60, 9, 12, '#e8e0d0'); }
    if (L === 3) GL(x, s.x + 50, y0 + 60, 120, '#c890ff', 0.3 + 0.1 * Math.sin(t * 3)); },
  calendar(x, L, t, g) { const s = SLOT.calendar; if (!L) return ghost(x, s, t); RR(x, s.x + 10, s.y + 10, 110, 130, 4, L === 3 ? '#e8d8ff' : '#f5ead4'); R(x, s.x + 10, s.y + 10, 110, 30, L === 3 ? '#6a2aa0' : '#b02a2a'); CI(x, s.x + 40, s.y + 10, 5, '#3a3a44'); CI(x, s.x + 90, s.y + 10, 5, '#3a3a44');
    for (let i = 0; i < 20; i++) R(x, s.x + 18 + (i % 5) * 20, s.y + 50 + Math.floor(i / 5) * 20, 12, 12, '#c8b898'); if (L >= 2) { x.strokeStyle = '#d0202a'; x.lineWidth = 3; x.beginPath(); x.arc(s.x + 24 + 4 * 20, s.y + 56 + 2 * 20, 12, 0, 7); x.stroke(); }
    if (L === 3) GL(x, s.x + 65, s.y + 75, 110, '#c890ff', 0.4); },
  radio(x, L, t) { const s = SLOT.radio; R(x, s.x - 10, s.y + s.h - 10, s.w + 20, 12, '#5a3a22'); if (!L) return ghost(x, s, t);
    if (L === 1) { RR(x, s.x + 20, s.y + 20, 110, 70, 10, '#8a5a3a'); CI(x, s.x + 55, s.y + 55, 22, '#3a2418'); for (let i = 0; i < 5; i++) R(x, s.x + 88, s.y + 34 + i * 10, 34, 4, '#caa84a'); LN(x, s.x + 110, s.y + 20, s.x + 130, s.y - 20, 2, '#8a8a9a'); }
    if (L === 2) { RR(x, s.x + 10, s.y + 50, 130, 40, 6, '#5a3a22'); EL(x, s.x + 70, s.y + 50, 54, 14, '#1a1418'); x.save(); x.translate(s.x + 70, s.y + 50); x.rotate(t * 3); R(x, -2, -10, 4, 20, '#ffcc33'); x.restore(); LN(x, s.x + 124, s.y + 40, s.x + 90, s.y + 48, 3, '#c8d0dc'); }
    if (L === 3) { RR(x, s.x + 20, s.y + 10, 110, 80, 30, '#e8b830'); RR(x, s.x + 32, s.y + 24, 86, 40, 16, '#2a1a0a'); for (let i = 0; i < 6; i++) CI(x, s.x + 40 + i * 14, s.y + 76, 4, (Math.floor(t * 6) + i) % 2 ? '#ff6a8a' : '#4af0ff'); GL(x, s.x + 75, s.y + 44, 100, '#ffcc33', 0.3); }
    for (let i = 0; i < 3; i++) { const q = (t * 0.4 + i / 3) % 1; x.save(); x.globalAlpha *= (1 - q); K.IC(x, 'e_music', s.x + 120 + Math.sin(q * 6 + i) * 12, s.y - q * 80, 22); x.restore(); } },
  cat(x, L, t) { const s = SLOT.cat; if (!L) return ghost(x, s, t); EL(x, s.x + 45, FLOOR - 10, 40, 10, '#6a4a3a'); EL(x, s.x + 45, FLOOR - 14, 34, 8, '#e8e0d0');
    if (L >= 2) { const black = L === 3, c0 = black ? '#1a1418' : '#e89a4a'; EL(x, s.x + 45, FLOOR - 34, 42, 22, '#8a3a4a'); EL(x, s.x + 45, FLOOR - 40, 30, 16, c0); CI(x, s.x + 68, FLOOR - 48, 13, c0); PL(x, [[s.x + 60, FLOOR - 56], [s.x + 64, FLOOR - 68], [s.x + 70, FLOOR - 58]], c0); PL(x, [[s.x + 70, FLOOR - 58], [s.x + 76, FLOOR - 68], [s.x + 78, FLOOR - 54]], c0);
      if (black) { const bl = Math.floor(t * 0.7) % 5 === 0; CI(x, s.x + 64, FLOOR - 50, 3, bl ? c0 : '#ffcc33'); CI(x, s.x + 73, FLOOR - 50, 3, bl ? c0 : '#ffcc33'); GL(x, s.x + 68, FLOOR - 50, 20, '#ffcc33', 0.5); } else { LN(x, s.x + 62, FLOOR - 49, s.x + 66, FLOOR - 49, 1.5, '#3a2010'); LN(x, s.x + 71, FLOOR - 49, s.x + 75, FLOOR - 49, 1.5, '#3a2010'); }
      x.strokeStyle = c0; x.lineWidth = 7; x.beginPath(); x.moveTo(s.x + 18, FLOOR - 36); x.quadraticCurveTo(s.x - 4, FLOOR - 50 + Math.sin(t * 2) * 10, s.x + 4, FLOOR - 70 + Math.sin(t * 2.3) * 8); x.stroke(); } },
  cabinet(x, L, t, g) { const s = SLOT.cabinet; if (!L) return ghost(x, s, t); RR(x, s.x, s.y, s.w, s.h, 6, '#3a2418'); R(x, s.x + 12, s.y + 12, s.w - 24, s.h - 24, '#140e18'); const got = Object.keys(g.prof.ach || {}).length;
    for (let r = 0; r < 4; r++) { const yy = s.y + 20 + r * 122; R(x, s.x + 12, yy + 104, s.w - 24, 6, '#6a4a2a'); for (let i = 0; i < 4; i++) { const idx = r * 4 + i; if (idx >= M.ACH.length) break; const a = M.ACH[idx], on = !!g.prof.ach[a.k], cx0 = s.x + 40 + i * 48; if (on) { GL(x, cx0, yy + 80, 26, '#ffcc33', 0.5 + 0.2 * Math.sin(t * 2 + idx)); PL(x, [[cx0 - 12, yy + 104], [cx0 + 12, yy + 104], [cx0 + 8, yy + 90], [cx0 - 8, yy + 90]], '#caa84a'); CI(x, cx0, yy + 76, 12, '#ffcc33'); R(x, cx0 - 2, yy + 86, 4, 6, '#caa84a'); } else CI(x, cx0, yy + 88, 8, 'rgba(255,255,255,0.06)'); } }
    x.fillStyle = 'rgba(200,230,255,0.07)'; x.beginPath(); x.moveTo(s.x + 30, s.y + 12); x.lineTo(s.x + 80, s.y + 12); x.lineTo(s.x + 20, s.y + s.h - 12); x.lineTo(s.x + 12, s.y + s.h - 12); x.fill(); R(x, s.x + s.w / 2 - 2, s.y + 12, 4, s.h - 24, '#3a2418'); },
  fridge(x, L, t) { const s = SLOT.fridge; if (!L) return ghost(x, s, t); const col = L === 3 ? '#b8c8d8' : L === 2 ? '#e8e8ec' : '#d8d0b8'; RR(x, s.x, s.y + (L === 1 ? 80 : 0), s.w, s.h - (L === 1 ? 80 : 0), 10, col); const y0 = s.y + (L === 1 ? 80 : 0);
    if (L === 2) { R(x, s.x + s.w / 2 - 2, y0 + 10, 4, s.h - 20, '#a8a8b0'); R(x, s.x + s.w / 2 - 16, y0 + 140, 8, 60, '#8a8a9a'); R(x, s.x + s.w / 2 + 8, y0 + 140, 8, 60, '#8a8a9a'); } else { R(x, s.x + 6, y0 + 130, s.w - 12, 4, 'rgba(0,0,0,0.2)'); R(x, s.x + s.w - 24, y0 + 40, 8, 60, '#8a8a9a'); R(x, s.x + s.w - 24, y0 + 170, 8, 80, '#8a8a9a'); }
    [['#d0453c', 30, 60], ['#ffcc33', 60, 90], ['#4a8aff', 40, 200]].forEach(([c, a, b]) => CI(x, s.x + a, y0 + b, 8, c)); if (L === 3) { GL(x, s.x + s.w / 2, y0 + s.h / 2, 160, '#8fe0ff', 0.25); for (let i = 0; i < 6; i++) R(x, s.x + 10 + i * 22, y0 + 6, 12, 8, '#e8f8ff'); } },
  piggy(x, L, t) { const s = SLOT.piggy; if (!M.furnLv('fridge')) R(x, s.x - 10, s.y + s.h, s.w + 20, 10, '#5a3a22'); if (!L) return ghost(x, s, t); const cx0 = s.x + 50, cy0 = s.y + 40;
    if (L === 1) { EL(x, cx0, cy0, 36, 26, '#ff9ab0'); CI(x, cx0 + 30, cy0 - 4, 12, '#ff9ab0'); EL(x, cx0 + 38, cy0 - 2, 6, 5, '#ff6a8a'); R(x, cx0 - 20, cy0 + 20, 8, 12, '#ff8aa0'); R(x, cx0 + 10, cy0 + 20, 8, 12, '#ff8aa0'); R(x, cx0 - 6, cy0 - 26, 14, 4, '#3a1a20'); CI(x, cx0 + 24, cy0 - 8, 2.5, '#1a1418'); }
    else { RR(x, s.x + 10, s.y + 4, 80, 66, 6, L === 3 ? '#e8b830' : '#5a5a66'); CI(x, cx0, cy0 + 2, 18, L === 3 ? '#fff2a0' : '#8a8a9a'); x.save(); x.translate(cx0, cy0 + 2); x.rotate(t); R(x, -2, -14, 4, 28, '#2a2a33'); R(x, -14, -2, 28, 4, '#2a2a33'); x.restore(); if (L === 3) { R(x, s.x + 70, s.y + 10, 14, 14, '#d0202a'); R(x, s.x + 76, s.y + 12, 2, 10, '#fff'); R(x, s.x + 72, s.y + 16, 10, 2, '#fff'); GL(x, cx0, cy0, 80, '#ffcc33', 0.35); } } },
  door(x, L, t, g) { const s = SLOT.door, hard = L && g.prof.hard, open = hard ? 0.5 : L ? 0.12 : 0.03; RR(x, s.x - 10, s.y - 10, s.w + 20, s.h + 10, 4, '#3a2418'); R(x, s.x, s.y, s.w, s.h, '#050204');
    if (open > 0.05) { x.fillStyle = K.LG(x, s.x, 0, s.x + s.w * open, 0, [[0, 'rgba(255,40,30,0.55)'], [1, 'rgba(255,40,30,0)']]); x.fillRect(s.x, s.y, s.w * open + 60, s.h); }
    PL(x, [[s.x + s.w * open, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x + s.w * open, s.y + s.h]], '#2a1a14'); for (let i = 0; i < 3; i++) R(x, s.x + s.w * open + 16, s.y + 30 + i * 180, s.w * (1 - open) - 32, 150, 'rgba(0,0,0,0.25)'); CI(x, s.x + s.w * open + 24, s.y + s.h / 2, 7, '#caa84a');
    const bl = Math.floor(t * 0.5) % 7 === 0 && (t % 2) < 0.2; if (!bl) { const ex = s.x + Math.max(10, s.w * open * 0.5), ey = s.y + 250; R(x, ex - 8, ey, 6, 3, '#ff2a2a'); R(x, ex + 6, ey, 6, 3, '#ff2a2a'); GL(x, ex, ey, 24, '#ff2a2a', hard ? 0.9 : 0.5); } },
  machine(x, L, t, g) { const s = SLOT.machine, m = g.meta, active = g.prof.active;
    GL(x, s.x + s.w / 2, s.y + 200, 420, '#5fd0c0', 0.28 + 0.05 * Math.sin(t * 7) * Math.sin(t * 3));
    RR(x, s.x + 10, s.y + 40, s.w - 20, s.h - 40, 8, '#2a2233'); RR(x, s.x, s.y, s.w, 70, 8, '#3a1a3a'); for (let i = 0; i < 11; i++) CI(x, s.x + 20 + i * 20, s.y + 16, 4, (Math.floor(t * 4) + i) % 2 ? '#ffb0d0' : '#5a2a4a'); K.PT(x, 'MIDNIGHT', s.x + s.w / 2, s.y + 46, 30, '#ffb0d0');
    R(x, s.x + 30, s.y + 90, s.w - 60, 170, '#0c0a10'); const sx0 = s.x + 36, sy0 = s.y + 96, sw = s.w - 72, sh = 158; x.fillStyle = K.LG(x, 0, sy0, 0, sy0 + sh, [[0, '#10302c'], [1, '#081614']]); x.fillRect(sx0, sy0, sw, sh);
    K.PT(x, '午夜机台', sx0 + sw / 2, sy0 + 50, 34, '#ffe08a'); if (Math.floor(t * 2) % 2) K.PT(x, active ? '第 ' + m.day + ' 天' : '投币开始', sx0 + sw / 2, sy0 + 110, 22, '#e8dcc4');
    for (let i = 0; i < sh; i += 4) R(x, sx0, sy0 + i, sw, 1, 'rgba(0,0,0,0.25)');
    R(x, s.x + 30, s.y + 280, s.w - 60, 70, '#3a3048'); [['#d0453c', 60], ['#e0b030', 100], ['#3aa88a', 140]].forEach(([c, a]) => CI(x, s.x + a, s.y + 316, 12, c)); RR(x, s.x + 170, s.y + 296, 30, 40, 4, '#1a1418'); R(x, s.x + 182, s.y + 304, 6, 24, '#caa84a');
    R(x, s.x + 70, s.y + 380, 100, 30, '#1a1418'); R(x, s.x + 104, s.y + 390, 32, 8, Math.floor(t * 3) % 2 ? '#ffcc33' : '#6a4a1a'); LN(x, s.x + s.w - 10, s.y + 150, s.x + s.w + 20, s.y + 120, 6, '#8a8a9a'); CI(x, s.x + s.w + 22, s.y + 116, 12, '#b3372f'); },
};
// the player: slumped in front of the cabinet, face lit by the screen
function person(x, g, t) { const sofa = M.furnLv('sofa'), bx = sofa ? 350 : 330, by = sofa ? FLOOR - 110 : FLOOR - 24, br = Math.sin(t * 1.4) * 2;
  R(x, bx - 34, by - 96 + br, 62, 100, '#1a1622'); R(x, bx - 40, by - 30, 100, 26, '#141018'); R(x, bx + 30, by - 30, 60, 24, '#141018'); R(x, bx + 80, by - 20, 18, sofa ? 90 : 20, '#141018');
  CI(x, bx - 2, by - 120 + br, 28, '#1a1622'); R(x, bx + 18, by - 126 + br, 8, 18, '#e8c8a0'); GL(x, bx + 30, by - 118, 50, '#5fd0c0', 0.35);
  R(x, bx + 20, by - 64 + br, 50, 12, '#1a1622'); RR(x, bx + 62, by - 70 + br, 30, 20, 6, '#3a3a44'); CI(x, bx + 70, by - 62 + br, 3, '#d0453c'); CI(x, bx + 84, by - 62 + br, 3, '#4a8aff'); }
M.drawRoomScene = function (x, g, t) {
  x.fillStyle = K.LG(x, 0, 0, 0, FLOOR, [[0, '#140e18'], [1, '#221824']]); x.fillRect(0, 0, 1920, FLOOR);
  for (let i = 0; i < 32; i++) R(x, i * 60 + 20, 0, 18, 620, 'rgba(255,220,200,0.025)');
  R(x, 0, 620, 1920, 200, '#1e1418'); for (let i = 0; i < 16; i++) RR(x, i * 120 + 12, 640, 96, 150, 4, null, 'rgba(0,0,0,0.35)', 3); R(x, 0, 612, 1920, 10, '#3a2418'); R(x, 0, 806, 1920, 16, '#2a1a10');
  x.fillStyle = K.LG(x, 0, FLOOR, 0, 1080, [[0, '#2a1c14'], [1, '#140c08']]); x.fillRect(0, FLOOR, 1920, 260); for (let i = 0; i < 9; i++) R(x, 0, FLOOR + 20 + i * 28, 1920, 2, 'rgba(0,0,0,0.3)'); for (let i = 0; i < 30; i++) R(x, (i * 173) % 1920, FLOOR + 22 + (i % 9) * 28, 2, 26, 'rgba(0,0,0,0.3)');
  EL(x, 780, FLOOR + 90, 560, 70, '#3a1a2a'); EL(x, 780, FLOOR + 86, 520, 58, '#4a2436');
  const L = (k) => g.prof.furn[k] || 0;
  ['window', 'books', 'photo', 'clock', 'calendar', 'radio', 'door', 'cabinet', 'fridge', 'piggy', 'plant', 'sofa', 'drink', 'rack', 'machine', 'cat'].forEach(k => { try {
    const lv = k === 'machine' ? 1 : L(k);
    if (lv || k === 'window' || k === 'door') { DRAW[k](x, lv, t, g); return; }
    // not bought yet: a grey hologram of what could stand here
    if (k === 'sofa') { EL(x, SLOT.sofa.x + 150, FLOOR - 8, 90, 18, '#4a2a3a'); EL(x, SLOT.sofa.x + 150, FLOOR - 14, 80, 14, '#6a3a4a'); }
    x.save(); x.globalAlpha = 0.26 + 0.06 * Math.sin(t * 2 + k.length); x.filter = 'grayscale(1) brightness(0.75)'; DRAW[k](x, 1, t, g); x.restore();
    const sl = SLOT[k]; x.save(); x.setLineDash([8, 8]); x.lineDashOffset = -t * 16; RR(x, sl.x + 2, sl.y + 2, sl.w - 4, sl.h - 4, 8, null, 'rgba(255,224,138,0.22)', 2); x.setLineDash([]); x.restore();
  } catch (e) {} });
  person(x, g, t);
  // hover highlight
  const hv = g.roomHov; if (hv && SLOT[hv] && !g.roomTr) { const s = SLOT[hv]; x.save(); x.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6); RR(x, s.x - 4, s.y - 4, s.w + 8, s.h + 8, 10, null, '#ffe08a', 4); x.restore(); }
  // darkness: the room is lit by the cabinet and the moon
  const lm = x.createRadialGradient(SCREEN.x, SCREEN.y, 120, SCREEN.x, SCREEN.y, 1300); lm.addColorStop(0, 'rgba(0,0,0,0)'); lm.addColorStop(1, 'rgba(4,2,8,0.62)'); x.fillStyle = lm; x.fillRect(0, 0, 1920, 1080);
};
// crisp labels on top of the pixel room (names + prices for locked pieces, level pips for owned ones)
function roomLabels(x, g, t, cam) {
  const map = (px, py) => ({ x: (px - cam.x) * cam.z + 960, y: (py - cam.y) * cam.z + 540 });
  M.FURN.forEach(f => { const s = SLOT[f.k], L = g.prof.furn[f.k] || 0, p = map(s.x + s.w / 2, s.y + s.h + 4); if (L >= f.lv.length && g.roomHov !== f.k) return;
    const nxt = L < f.lv.length ? f.cost[L] : 0, txt = L < f.lv.length ? (L ? '升级 ' : '') + nxt : '满级', can = g.prof.tokens >= nxt && L < f.lv.length;
    if (!L && g.roomHov !== f.k) { const ic2 = M.iconCanvas('e_coin', 2); x.fillStyle = 'rgba(8,6,10,0.8)'; x.fillRect(p.x - 44, p.y + 2, 88, 30); x.fillStyle = can ? '#ffe08a' : '#6b6570'; x.fillRect(p.x - 44, p.y + 2, 88, 2); if (ic2) x.drawImage(ic2, p.x - 38, p.y + 7, 20, 20); x.font = "700 20px 'Cinzel', serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = can ? '#ffcc33' : '#8d8496'; x.fillText(String(nxt), p.x + 10, p.y + 18); return; }
    if (!L || g.roomHov === f.k) { x.font = "700 22px 'Noto Serif SC', serif"; const nm = (f.names[Math.min(L, f.names.length - 1)]), w = Math.max(x.measureText(nm).width, 60) + 60; x.fillStyle = 'rgba(8,6,10,0.82)'; x.fillRect(p.x - w / 2, p.y - 2, w, 58); x.fillStyle = can ? '#ffe08a' : '#8d8496'; x.fillRect(p.x - w / 2, p.y - 2, w, 3);
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#e8dcc4'; x.fillText(nm, p.x, p.y + 16); const ic = M.iconCanvas('e_coin', 2); if (ic && L < f.lv.length) x.drawImage(ic, p.x - 36, p.y + 30, 20, 20); x.fillStyle = can ? '#ffcc33' : '#a89ca8'; x.font = "700 20px 'Cinzel', serif"; x.fillText(txt, p.x + 6, p.y + 40); }
    else { for (let i = 0; i < f.lv.length; i++) { x.fillStyle = i < L ? '#ffcc33' : 'rgba(255,255,255,0.15)'; x.fillRect(p.x - f.lv.length * 9 + i * 18, p.y + 4, 12, 6); } } });
}

// ═════════════════════ screen: room ═════════════════════
G.toRoom = function (o) {
  o = o || {}; this._goingRoom = true; this.run = null; this.battle = null; this.walker = null; this.settle = null; this.modal = null; this.panel = null; this.mini = null; this.reel = null;
  this.roomPanel = null; this.roomHov = null; this.tipData = null; const from = this.screen;
  this.go('room'); this._goingRoom = false;
  if (from !== 'intro' && from !== 'room') { this.roomTr = { kind: 'exit', t: 0 }; S.whoosh(0.6); }
  if (o.settle || this.prof.pending) { const P = this.prof.pending; if (P) { P.shownAt = null; this.hold('tokens', this.prof.tokens - (P.total || 0)); } }
  M.Sfx.drone && M.Sfx.drone(true); this.bump();
};
G.roomEnter = function () { if (this.roomTr) return; this.roomPanel = null; this.tipData = null; this.roomTr = { kind: 'enter', t: 0 }; S.whoosh(0.8); S.portal && S.portal(); };
const ENTER = 1.5, EXIT = 1.3;
G.roomCam = function () { const tr = this.roomTr; let z = 1, q = 0; if (tr) { q = tr.kind === 'enter' ? eio(tr.t / ENTER) : 1 - eo(tr.t / EXIT); z = 1 + q * q * 8; } const p = q; return { x: 960 + (SCREEN.x - 960) * Math.min(1, p * 1.4), y: 540 + (SCREEN.y - 540) * Math.min(1, p * 1.4), z, q }; };
G.roomTick = function (dt) {
  this.roomT = (this.roomT || 0) + dt; const tr = this.roomTr;
  if (tr) { tr.t += dt; if (tr.kind === 'enter' && tr.t >= ENTER) { this.roomTr = null; const kits = (this.kitSel || []).slice(); this.kitSel = []; this.startGame(kits); return; } if (tr.kind === 'exit' && tr.t >= EXIT) this.roomTr = null; }
  const c = this.ui.cv('room'); if (!c) return; const cam = this.roomCam();
  const Lr = M.pxLayer('room', 1920, 1080), lx = Lr.getContext('2d'); lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalAlpha = 1; lx.globalCompositeOperation = 'source-over';
  M.drawRoomScene(lx, this, this.roomT);
  const t = c.getContext('2d'); t.save(); t.setTransform(1, 0, 0, 1, 0, 0); t.globalAlpha = 1; t.globalCompositeOperation = 'copy'; t.imageSmoothingEnabled = false;
  const sw = Lr.width / cam.z, sh = Lr.height / cam.z, sx = cam.x / 1920 * Lr.width - sw / 2, sy = cam.y / 1080 * Lr.height - sh / 2;
  t.drawImage(Lr, sx, sy, sw, sh, 0, 0, 1920, 1080); t.restore();
  t.save(); t.setTransform(1, 0, 0, 1, 0, 0); if (!tr) roomLabels(t, this, this.roomT, cam);
  if (this.roomFadeIn) { this.roomFadeIn = Math.max(0, this.roomFadeIn - dt / 1.2); t.globalAlpha = this.roomFadeIn; t.fillStyle = '#000'; t.fillRect(0, 0, 1920, 1080); t.globalAlpha = 1; }
  if (cam.q > 0.55) { t.globalAlpha = cl((cam.q - 0.55) / 0.45, 0, 1); t.fillStyle = '#e8fff8'; t.fillRect(0, 0, 1920, 1080); }
  t.restore();
};
G.roomHover = function (x, y) { this.mx = x; this.my = y; if (this.roomTr || this.prof.pending) return; const k = hit(x, y); if (k !== this.roomHov) { this.roomHov = k; if (k) S.hover(); } this.tipData = k ? this.roomTip(k) : null; };
G.roomTip = function (k) {
  if (k === 'machine') { const p = this.prof, m = this.meta; return { title: '午夜机台', c: '#5fd0c0', kind: p.active ? '第 ' + (m.gameNo || p.stats.games + 1) + ' 局 · 第 ' + m.day + ' 天' : '投币开始新的一局', d: '点击坐到机台前。里面的地下基地和异世界探索，才是真正的一局。', icon: 'u_star' }; }
  if (k === 'window' && !M.FURN_BY.window) return null;
  const f = M.FURN_BY[k]; if (!f) return null; const L = this.prof.furn[k] || 0, lines = [];
  if (L) lines.push({ t: '现在：' + f.lv[L - 1].d, c: '#9cff7a' }); if (L < f.lv.length) lines.push({ t: (L ? '升级为「' + f.names[L] + '」：' : '解锁：') + f.lv[L].d, c: '#ffe08a' }, { t: '需要 ' + f.cost[L] + ' 机台代币（现有 ' + this.prof.tokens + '）', c: this.prof.tokens >= f.cost[L] ? '#ffcc33' : '#ff8a8a' }); else lines.push({ t: '已满级', c: '#a89ca8' });
  return { title: f.names[Math.max(0, Math.min(L, f.names.length - 1) - (L ? 1 : 0))] || f.names[0], c: '#ffe08a', kind: L ? 'Lv ' + L + ' / ' + f.lv.length : '未解锁', d: f.what, lines, icon: f.icon };
};
G.roomClick = function (x, y) { if (this.roomTr) return; if (this.prof.pending) return; const k = hit(x, y); if (!k) { this.roomPanel = null; this.bump(); return; } S.click(); this.roomPanel = k; this.roomPanelAt = now(); this.tipData = null; this.bump(); };
G.buyFurn = function (k) {
  const f = M.FURN_BY[k], p = this.prof, L = p.furn[k] || 0; if (!f || L >= f.lv.length) return; const cost = f.cost[L]; if (p.tokens < cost) { this.toast('机台代币不够', '#d0453c'); return; }
  this.hold('tokens', p.tokens); p.tokens -= cost; this.release('tokens'); p.furn[k] = L + 1; if (k === 'cabinet') { p.achOn = true; } this.saveProfile(); if (k === 'cabinet') setTimeout(() => this.achCheck(), 300);
  const s = SLOT[k]; S.build && S.build(); S.up(2); this.fx.rays(s.x + s.w / 2, s.y + s.h / 2, '#ffe08a', 1.4, { r: 320 }); this.fx.explode(s.x + s.w / 2, s.y + s.h / 2, '#ffcc33', 1.2); this.fx.pop(s.x + s.w / 2, s.y - 30, (L ? '升级：' : '解锁：') + f.names[Math.min(L, f.names.length - 1)], '#ffe08a', 44); this.fx.kick(8); this.bump();
};
G.collectSettle = function () { const P = this.prof.pending; if (!P) return; const from = { x: 960, y: 760 }; for (let i = 0; i < 8; i++) this.fly('e_coin', { x: from.x + (Math.random() - 0.5) * 300, y: from.y + (Math.random() - 0.5) * 80 }, 'tokens', '#ffcc33', i === 7 ? () => this.release('tokens') : null, i * 0.06); setTimeout(() => { if (this.held.tokens != null) this.release('tokens'); }, 2500); this.prof.pending = null; this.saveProfile(); S.fanfare(); this.bump(); };

// ═════════════════════ views ═════════════════════
const ic = (k, s) => (M.IC && M.IC[k]) ? M.iconURL(k, s || 2) : M.spriteURL(k, 4);
const oldView = G.view;
G.view = function () {
  const v = oldView.call(this), p = this.prof, t0 = now();
  v.isRoom = this.screen === 'room'; v.isMenu = false;
  if (!v.isRoom) return v;
  const self = this;
  v.roomMove = (e) => { const q = self.miniPt(e.clientX, e.clientY); self.roomHover(q.x, q.y); };
  v.roomClick = (e) => { M.Sfx.init(); const q = self.miniPt(e.clientX, e.clientY); self.roomClick(q.x, q.y); };
  v.roomLeave = () => { self.roomHov = null; self.tipData = null; };
  const busy = !!this.roomTr;
  v.rm = { ui: !busy, cursor: this.roomHov ? 'pointer' : 'default', tokens: this.tv('tokens', p.tokens), tokSc: this.ps ? this.ps('tokens') : 1, coin: ic('e_coin', 3), games: p.stats.games || 0, best: p.stats.bestDay || 0, pnOn: !!this.roomPanel && !p.pending, stOn: !!p.pending && !busy };
  // furniture / machine / cabinet panel
  const k = this.roomPanel; if (v.rm.pnOn) {
    const q = cl((t0 - (this.roomPanelAt || t0)) / 260, 0, 1), pn = v.rm.pn = { dx: Math.round((1 - M.ease.eback(q)) * 80), op: q, isMachine: k === 'machine', isFurn: k !== 'machine', isCab: false, close: () => { S.click(); this.roomPanel = null; this.bump(); } };
    if (k === 'machine') { const m = this.meta, P = M.perks(), active = p.active; Object.assign(pn, { title: '午夜机台', col: '#5fd0c0', img: ic('u_star', 3), sub: active ? '第 ' + (m.gameNo || (p.stats.games + 1)) + ' 局进行中' : '没有进行中的局', what: '坐下，投币。地下基地和异世界探索共同构成一局：基地核心碎掉或传送门崩塌，这一局就结束，回到这个房间结算。',
      goTxt: active ? '继续 · 第 ' + m.day + ' 天' : '投币 · 开始新的一局', goSub: active ? '基地核心 ' + (m.core == null ? 3 : m.core) + ' / 3 · 领袖 ' + m.heroes.length + ' 名' : (P.moon ? '月相会在投币时决定' : '之前的家具效果都会生效'), onGo: () => { S.click(); this.roomEnter(); },
      stats: [{ k: '已玩局数', v: String(p.stats.games || 0) }, { k: '最长存活', v: (p.stats.bestDay || 0) + ' 天' }, { k: '通关世界（累计）', v: String(p.stats.clears || 0) }, { k: '累计代币', v: String(p.stats.tokensAll || 0) }] });
      const nk = Math.min(P.kits || 0, M.KITS.length), slots = P.kitSlots || 1; this.kitSel = (this.kitSel || []).filter(x => M.KITS.slice(0, nk).some(kk => kk.k === x));
      pn.hasKits = !active && nk > 0; pn.kitNote = '开局卡带（最多 ' + slots + ' 盘）'; pn.kits = M.KITS.slice(0, nk).map(kk => { const on = this.kitSel.includes(kk.k); return { n: kk.n, d: kk.d, img: ic(kk.ic, 2), border: on ? '#ffcc33' : '#3a3040', bg: on ? '#3a2c18' : '#15111a', onClick: () => { S.click(); if (on) this.kitSel = this.kitSel.filter(x => x !== kk.k); else { this.kitSel.push(kk.k); while (this.kitSel.length > slots) this.kitSel.shift(); } this.bump(); } }; });
      pn.hasHard = !active && !!P.hard; pn.hardTxt = p.hard ? '噩梦模式：开' : '噩梦模式：关'; pn.hardC = p.hard ? '#ff4a4a' : '#8d8496'; pn.onHard = () => { S.click(); p.hard = !p.hard; this.saveProfile(); this.bump(); };
      pn.hist = (p.hist || []).slice(0, 5).map(h => ({ t: '第 ' + h.day + ' 天 · ' + (h.reason === 'core' ? '基地爆炸' : '传送门崩塌') + ' · +' + h.tokens + ' 代币' })); pn.hasHist = pn.hist.length > 0; }
    else { const f = M.FURN_BY[k], L = p.furn[k] || 0, max = L >= f.lv.length, cost = max ? 0 : f.cost[L];
      Object.assign(pn, { title: f.names[Math.max(0, Math.min(L, f.names.length) - 1)] || f.names[0], col: '#ffe08a', img: ic(f.icon, 3), sub: L ? 'Lv ' + L + ' / ' + f.lv.length : '未解锁', what: f.what,
        pips: f.lv.map((_, i) => ({ c: i < L ? '#ffcc33' : '#3a3040' })), hasCur: !!L, cur: L ? f.lv[L - 1].d : '', hasNext: !max, nextName: max ? '' : (L ? '升级为「' + f.names[L] + '」' : '解锁「' + f.names[0] + '」'), next: max ? '' : f.lv[L].d,
        buyTxt: max ? '已满级' : (L ? '升级' : '解锁') + ' · ' + cost + ' 代币', buyOk: !max && p.tokens >= cost, buyBg: !max && p.tokens >= cost ? 'linear-gradient(180deg,#ffe08a,#d4982e)' : '#15111a', buyC: !max && p.tokens >= cost ? '#1a0e08' : '#6b6570', onBuy: () => { if (max) return; if (p.tokens < cost) { this.toast('机台代币不够', '#d0453c'); return; } this.buyFurn(k); } });
      if (k === 'cabinet' && L) { pn.isCab = true; pn.achN = Object.keys(p.ach).length + ' / ' + M.ACH.length; pn.ach = M.ACH.map(a => { const on = !!p.ach[a.k]; return { img: ic(on ? 'u_star' : 'u_mask', 2), n: a.n, c: on ? '#ffcc33' : '#6b6570', op: on ? 1 : 0.55, tipOn: this.tipFn({ title: a.n + (on ? ' ✓' : ''), c: on ? '#ffcc33' : '#a89ca8', kind: on ? '已达成' : '未达成', d: a.d, lines: [{ t: '奖励：' + a.r, c: '#9cff7a' }] }) }; }); } } }
  // end-of-game settlement
  if (v.rm.stOn) { const P = p.pending; if (!P.shownAt) P.shownAt = t0; const e = (t0 - P.shownAt) / 1000, rows = P.rows || [];
    v.rm.st = { title: P.reason === 'core' ? '基地爆炸' : '传送门崩塌', col: '#ff5a4a', sub: '这一局撑到了第 ' + P.day + ' 天。机台吐出了一把代币。', rows: rows.map((r, i) => { const q = cl((e - 0.4 - i * 0.22) / 0.3, 0, 1); return { img: ic(r.ic, 2), n: r.n, v: '×' + r.v, t: '+' + Math.round(r.t * q), op: q, dy: Math.round((1 - q) * 20), dim: r.v ? 1 : 0.5 }; }),
      mulTxt: [P.hard ? '噩梦 ×1.6' : '', P.moon === 'blood' ? '血月 ×1.3' : ''].filter(Boolean).join(' · '), hasMul: !!(P.hard || P.moon === 'blood'), total: Math.round(P.total * cl((e - 0.6 - rows.length * 0.22) / 0.8, 0, 1)),
      achs: (P.ach || []).map(k2 => ({ n: M.ACH_BY[k2].n, r: M.ACH_BY[k2].r })), hasAch: (P.ach || []).length > 0, carryTxt: P.carry ? '存钱罐：下一局带入 ' + (P.carry.sup || 0) + ' 物资、' + (P.carry.sh || 0) + ' 灵魂碎片' + (P.carry.relic ? '，和「' + (P.carry.relic.name || '宝物') + '」' : '') : '', hasCarry: !!P.carry,
      btnOn: e > 0.8 + rows.length * 0.22, onCollect: () => { S.click(); this.collectSettle(); } };
    if (Math.floor(e * 10) !== this._stTick && e < 0.8 + rows.length * 0.22 + 0.8) { this._stTick = Math.floor(e * 10); if (e > 0.4) S.tick(this._stTick % 8); } }
  return v;
};
const oTipFor = G.tipFor;
G.tipFor = function (key) {
  if (key === 'b-core') { const m = this.meta, c = m.core == null ? 3 : m.core; return { title: '基地核心 ' + c + ' / 3', c: '#ff8ab0', kind: '整局只有 3 点', d: '领袖每阵亡一次，核心 -1。核心归零，基地爆炸，这一局结束，回到房间结算。每通关一个世界恢复 1 点，上限不会增加。', icon: 't_heart' }; }
  if (key === 'r-tokens') return { title: '机台代币 ' + this.prof.tokens, c: '#ffcc33', d: '一局结束时按表现结算。用来解锁和升级房间里的家具，每件家具都会改变机台里的规则。', icon: 'e_coin' };
  return oTipFor.call(this, key);
};

// ═════════════════════ core hit & base explosion (inside the machine) ═════════════════════
const oEB = G.endBack;
G.endBack = function () {
  const info = this.endInfo || {}, m = this.meta;
  if (info.coreHit) { const pd = this.pendingDay; this.pendingDay = false; oEB.call(this); this.coreQueue = { pd, hp: m.core == null ? 3 : m.core }; return; }
  oEB.call(this);
  if (info.coreHeal) setTimeout(() => { const p = this.fxPos('core') || this.corePos(); this.fx.rays(p.x, p.y, '#9cff7a', 1.4, { r: 200 }); this.fx.pop(p.x, p.y + 60, '基地核心 +1', '#9cff7a', 44); S.heal(); this.pulse.core = now(); }, 1200);
};
G.coreTick = function (dt) {
  if (this.coreQueue && !this.tear && this.screen === 'base') { const q = this.coreQueue; this.coreQueue = null; this.coreFx = { t: 0, hp: q.hp, pd: q.pd, hit: false, boom: false }; const cc = M.cellCenter(M.CORE.c, M.CORE.r); this.bv.keepFree(); this.bv.tx = cc.x; this.bv.ty = cc.y - 40; this.bv.tz = 1.25; }
  const F = this.coreFx; if (!F) return; F.t += dt; const cp = this.corePos();
  if (!F.hit && F.t > 0.7) { F.hit = true; S.impact(); S.shatter(); this.fx.kick(30); this.fx.flash('#ff2a4a', 0.4); this.fx.explode(cp.x, cp.y, '#ff4a6a', 1.6); this.fx.pop(cp.x, cp.y - 120, '基地核心 -1', '#ff4a6a', 64, { slam: 1 }); this.pulse.core = now(); }
  if (F.hp > 0 && F.t > 2.4) { this.coreFx = null; this.bv.home(); this.toast(F.hp === 1 ? '基地核心只剩最后 1 点了' : '基地核心还剩 ' + F.hp + ' 点', F.hp === 1 ? '#ff4a4a' : '#ff8ab0'); if (F.pd) setTimeout(() => { this.passDay(); setTimeout(() => this.checkRaid(), 1600); }, 300); return; }
  if (F.hp <= 0) {
    if (!F.boom && F.t > 1.6) { F.boom = true; S.alarm(); this.bv.tx = 1050; this.bv.ty = 470; this.bv.tz = 0.62; const m = this.meta, cells = []; for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (x.dug || x.b) cells.push([c, r, Math.hypot(c - M.CORE.c, r - M.CORE.r)]); } cells.sort((a, b) => a[2] - b[2]); F.cells = cells; }
    if (F.boom) { const i = Math.floor((F.t - 1.8) / 0.12); (F.cells || []).forEach((cc, k) => { if (k === i && !cc[3]) { cc[3] = 1; const p = this.cellPos(cc[0], cc[1]); this.fx.explode(p.x, p.y, k % 2 ? '#ff7a2a' : '#ffcc33', 1.3); S.boom(); this.fx.kick(18); const cell = M.cell(this.meta, cc[0], cc[1]); if (cell) { cell.b = null; cell.job = null; cell.dug = true; } } }); }
    if (F.t > 1.8 + (F.cells || []).length * 0.12 + 0.6 && !F.white) { F.white = true; this.fx.flash('#ffffff', 1); S.impact(); this.banner({ kind: 'win', text: '基地爆炸', col: '#ff4a4a', col2: '#3a0000', sub: '核心碎了。这一局结束了。', life: 2.4, y: 440 }); }
    if (F.white && F.t > 1.8 + (F.cells || []).length * 0.12 + 3.0) { this.coreFx = null; this.gameOver('core'); }
  }
  this.bump();
};
// base top bar: three core pips
const oldView2 = G.view;
G.view = function () { const v = oldView2.call(this); if (v.b) { const m = this.meta, c = m.core == null ? 3 : m.core, hurt = this.coreFx && this.coreFx.hit && this.coreFx.t < 1.4; v.b.cores = [0, 1, 2].map(i => ({ img: ic(i < c ? 't_heart' : 'r_skel', 2), op: i < c ? 1 : 0.35 })); v.b.coreSc = this.ps ? this.ps('core') : 1; v.b.coreC = c <= 1 ? '#ff4a4a' : '#ff8ab0'; } if (this.coreFx) { v.coverOn = true; v.tipOn = false; v.pnOn = false; } return v; };

// ═════════════════════ intro → room; ticks ═════════════════════
const oTick = G.tick;
G.tick = function (dt) {
  if (this.screen === 'intro' && this.intro && this.intro.started && this.intro.t >= 3.5) { this.toRoom({}); }
  oTick.call(this, dt);
  if (this.screen === 'room') this.roomTick(Math.min(dt, 0.05));
  if (this.screen === 'base') this.coreTick(Math.min(dt, 0.05));
};
const oIC = G.introClick; G.introClick = function () { M.Sfx.init(); if (this.intro) this.intro.started = true; this.roomT = 0; this.toRoom({}); this.roomFadeIn = 1; };
const oTM = G.toMenu; G.toMenu = function () { this.toRoom({}); };
})();

;
