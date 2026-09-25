// ==== mc-town.js ====
(function () {
// The town on the surface (user ruling 2026-09-26). Every room dug and built underground has a building on the surface
// that rises out of the ground when the room is finished, so the more the base grows, the more the surface thrives.
// The town lays itself out: the main base in the middle; homes and workshops (civil) in the back row, the finest ones
// nearest the gate; towers in the front row, the strongest shooters innermost, spread evenly over the town; barracks
// beyond the towers; walls outermost of all, the strongest wall on the very outside. A new building rises and the
// others slide to their new places. People live in it: workers go out to gather and come back with a sack, smiths and
// trainers work at their doors, the rest wander; when a 混沌来袭 starts everyone runs inside and the tower crews show up
// on their towers. The leader stands on the roof of the main base. Buildings broken in a raid lie in ruins until their
// room is repaired; any room can be demolished (a day and 50 supplies; the blueprint comes back, the terrain stays).
const M = window.MC, G = M.Game.prototype, S = M.Sfx, U = M.UI, P = M.PJ.PAL, B_ = M.BUILDINGS, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (q) => 1 - Math.pow(1 - q, 3), RM = () => !!M.PJ.reduced;
const GEO = M.BASE_GEO, DOOR_X = GEO.DOOR_X, MB = M.MAIN_BASE, SP = M.STYLE_PAL, CW = GEO.CW, CH = GEO.CH, TOP = GEO.TOP;
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ───────── footprints ─────────
const WONDER_FOOT = { eiffel: [150, 330], bigben: [110, 300], liberty: [120, 290], lighthouse: [110, 300], colossus: [170, 300], zeus: [170, 250], pyramids: [260, 200], taj: [250, 230],
  hagia: [250, 230], forbidden: [250, 200], potala: [250, 220], colosseum: [260, 170], maracana: [260, 150], stonehenge: [230, 130], angkor: [240, 210], machu: [250, 190], gardens: [230, 200],
  artemis: [230, 170], library: [230, 190], opera: [250, 170], goldengate: [260, 200], amundsen: [220, 170], wolfsburg: [250, 190], venice: [230, 200], ruhr: [230, 230], michel: [132, 240],
  terracotta: [210, 140], kotoku: [190, 200], shaolin: [230, 190] };
M.townFoot = function (key) {
  const B = B_[key], role = M.townRole(key), q = B.q || 0, wf = WONDER_FOOT[key];
  if (wf) return { w: wf[0], h: wf[1] };
  if (role === 'wall') return { w: 66, h: 150 };
  if (role === 'guard') return { w: 160, h: 170 };
  if (role === 'tower') { const k = B.weapon.kind; return k === 'shell' ? { w: 130, h: 110 } : k === 'chain' ? { w: 100, h: 200 } : k === 'arcane' ? { w: 100, h: 240 } : { w: 110, h: 190 }; }
  return q >= 1 ? { w: 200, h: 180 } : { w: 150, h: 130 };
};

// ───────── the layout ─────────
// inner → outer on each side: back row civil (best first), front row towers (highest damage per second first) spread
// over the town, barracks, then walls (weakest first, so the strongest is outermost). Each role is dealt to the two
// sides in turn, so the town stays balanced; the result is the same for the same rooms.
M.townLayout = function (m) {
  const items = [];
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) {
    const x = m.base.cells[r][c], key = x.b || (x.job && x.job.kind === 'build' ? x.job.key : null); if (!key || key === 'core' || !B_[key]) continue;
    const role = M.townRole(key); if (!role) continue; const f = M.townFoot(key);
    items.push({ k: c + ',' + r, c, r, key, role, B: B_[key], site: !x.b, ruin: !!x.ruin, demo: !!(x.job && x.job.kind === 'demolish'), fix: !!(x.job && x.job.kind === 'repair'), w: f.w, h: f.h });
  }
  const val = (o) => o.role === 'tower' ? o.B.weapon.dmg / o.B.weapon.cd : o.role === 'wall' ? M.townHp(o.key) : o.role === 'guard' ? (o.B.fx.defArmy || 1) : (o.B.q || 0) * 1000 + (o.B.cost || 0);
  const sorted = (role, desc) => items.filter(o => o.role === role).sort((a, b) => ((desc ? val(b) - val(a) : val(a) - val(b)) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) || (a.k < b.k ? -1 : 1)));
  const sides = { L: { civ: [], tow: [], grd: [], wal: [] }, R: { civ: [], tow: [], grd: [], wal: [] } };
  const deal = (list, slot) => { let nl = 0, nr = 0, wl = 0, wr = 0; list.forEach(o => { const goL = nl < nr || (nl === nr && wl <= wr); if (goL) { sides.L[slot].push(o); nl++; wl += o.w; } else { sides.R[slot].push(o); nr++; wr += o.w; } }); };
  deal(sorted('civil', true), 'civ'); deal(sorted('tower', true), 'tow'); deal(sorted('guard', true), 'grd'); deal(sorted('wall', false), 'wal');
  const out = { items, edge: {}, guard: {}, span: MB.w };
  const E0 = MB.w / 2 + 34, GB = 18, GF = 30, SC = 0.86;
  ['L', 'R'].forEach(sd => {
    const s = sd === 'L' ? -1 : 1, Sd = sides[sd];
    let cur = E0; Sd.civ.forEach(o => { o.side = s; o.row = 0; o.sc = SC; o.tx = DOOR_X + s * (cur + o.w * SC / 2); cur += o.w * SC + GB; });
    // barracks stand at the inner end of the front row (their soldiers march out anyway), so the outermost tower sits right
    // behind the walls and every wall front is inside its reach
    let gcur = E0; Sd.grd.forEach(o => { o.side = s; o.row = 1; o.sc = 1; o.tx = DOOR_X + s * (gcur + o.w / 2); gcur += o.w + GF; });
    const T0 = gcur, backEnd = Sd.civ.length ? cur : E0, need = Sd.tow.reduce((a, o) => a + o.w + GF, 0);
    const span = Math.max(need, backEnd - T0), slot = Sd.tow.length ? span / Sd.tow.length : 0;
    // evenly over the town, the outermost one right by the walls so the wall fronts are always in reach
    Sd.tow.forEach((o, i) => { o.side = s; o.row = 1; o.sc = 1; o.tx = DOOR_X + s * (T0 + slot * (i + 1) - o.w / 2); });
    const fcur = Sd.tow.length ? T0 + span : gcur;
    // walls close ranks: a double or triple wall, the strongest outermost
    let wcur = Math.max(fcur, backEnd) + 24;
    Sd.wal.forEach(o => { o.side = s; o.row = 1; o.sc = 1; o.tx = DOOR_X + s * (wcur + o.w / 2); wcur += o.w + 12; });
    out.edge[sd] = DOOR_X + s * wcur; out.guard[sd] = DOOR_X + s * (wcur + 24);   // soldiers hold right in front of the outer wall, inside the towers' reach
  });
  out.span = out.edge.R - out.edge.L;
  return out;
};

// ───────── art (world units; origin = bottom centre of the footprint; cached per key and state) ─────────
const art = {};
function kit(x) {
  const R = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
  // a block: ink outline, light top-left, dark bottom-right
  const Bk = (a, b, w, h, c, hi, lo) => { R(a - 3, b - 3, w + 6, h + 6, P.ink); R(a, b, w, h, c); R(a, b, w, 3, hi || M.shade(c, 0.25)); R(a, b, 3, h, hi || M.shade(c, 0.25)); R(a, b + h - 4, w, 4, lo || M.shade(c, -0.35)); R(a + w - 3, b, 3, h, lo || M.shade(c, -0.35)); };
  const T = (pts, c, ol) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); if (ol !== false) { x.strokeStyle = P.ink; x.lineWidth = 6; x.lineJoin = 'miter'; x.stroke(); } x.fillStyle = c; x.fill(); };
  const Dm = (cx, cy, r, c) => { x.beginPath(); x.arc(cx, cy, r + 3, Math.PI, 0); x.fillStyle = P.ink; x.fill(); x.beginPath(); x.arc(cx, cy, r, Math.PI, 0); x.fillStyle = c; x.fill(); R(cx - r * 0.6, cy - r * 0.8, r * 0.3, r * 0.3, M.shade(c, 0.3)); };
  const Win = (a, b, w, h, lit) => { R(a - 3, b - 3, w + 6, h + 6, P.ink); R(a, b, w, h, lit ? P.amber : P.abyss); if (lit) R(a, b, w, Math.max(3, h * 0.3), P.gold); };
  const Col = (a, b, w, h, c) => { Bk(a, b, w, h, c); R(a - 4, b - 6, w + 8, 6, c); R(a - 4, b + h, w + 8, 6, c); };
  const Door = (a, b, w, h) => { R(a - 3, b - 3, w + 6, h + 3, P.ink); R(a, b, w, h, P.umber); R(a + w / 2 - 1, b, 3, h, P.ink); };
  const Flag = (a, b, c) => { R(a, b - 50, 4, 50, P.ink); R(a + 4, b - 50, 26, 16, c); R(a + 4, b - 50, 26, 4, M.shade(c, 0.3)); };
  return { R, Bk, T, Dm, Win, Col, Door, Flag };
}
const pal = (key) => { const B = B_[key]; return SP[B.style] || SP.medieval; };
// civil rooms by function; wonders by their own shapes
const CIVIL = {
  power(k, w, h, c) { k.Bk(-w / 2 + 8, -h + 40, w - 16, h - 40, c[0]); k.Bk(-w / 2 + 16, -h + 10, 22, 50, P.slate); k.R(-w / 2 + 8, -h + 40, w - 16, 10, c[1]); [0, 1, 2].forEach(i => k.Win(-w / 2 + 22 + i * 36, -h + 64, 20, 22, true)); k.Door(8, -44, 26, 44); },
  store(k, w, h, c) { k.Bk(-w / 2 + 10, -h + 50, w - 20, h - 50, P.brown); k.T([[-w / 2 + 2, -h + 52], [0, -h + 6], [w / 2 - 2, -h + 52]], c[1]); k.Door(-16, -52, 32, 52); k.Bk(w / 2 - 6, -30, 26, 26, P.tan); k.Bk(w / 2 + 2, -58, 22, 22, P.tan); },
  med(k, w, h, c) { k.Bk(-w / 2 + 10, -h + 34, w - 20, h - 34, P.cream); k.R(-w / 2 + 10, -h + 34, w - 20, 10, c[1]); k.Bk(-14, -h + 4, 28, 28, P.cream); k.R(-4, -h + 8, 8, 20, P.red); k.R(-10, -h + 14, 20, 8, P.red); k.Win(-w / 2 + 24, -h + 58, 20, 20, true); k.Win(w / 2 - 44, -h + 58, 20, 20, true); k.Door(-12, -40, 24, 40); },
  forge(k, w, h, c) { k.Bk(-w / 2 + 6, -h + 40, w - 12, h - 40, P.slate); k.Bk(w / 2 - 34, -h, 20, 50, P.umber); k.R(-w / 2 + 20, -h + 64, 48, 38, P.ink); k.R(-w / 2 + 24, -h + 70, 40, 32, P.amber); k.R(-w / 2 + 24, -h + 70, 40, 8, P.gold); k.Bk(w / 2 - 16, -26, 30, 10, P.steel); k.R(w / 2 - 8, -16, 12, 16, P.slate); },
  train(k, w, h, c) { k.Bk(-w / 2 + 8, -h + 50, 70, h - 50, P.brown); k.T([[-w / 2, -h + 52], [-w / 2 + 43, -h + 20], [-w / 2 + 86, -h + 52]], c[1]); for (let i = 0; i < 5; i++) k.R(-w / 2 + 88 + i * 12, -34, 5, 34, P.tan); k.R(-w / 2 + 86, -28, 60, 4, P.tan); k.Bk(w / 2 - 30, -70, 18, 50, P.tan); k.Bk(w / 2 - 36, -86, 30, 18, P.butter); k.R(w / 2 - 22, -80, 3, 3, P.ink); },
  luck(k, w, h, c) { k.Bk(-16, -h + 20, 32, h - 20, c[0]); k.T([[-24, -h + 22], [0, -h - 8], [24, -h + 22]], c[1]); k.R(-6, -h + 40, 12, 16, c[2]); [-1, 1].forEach(s => { k.R(s * 44 - 2, -60, 4, 60, P.ink); k.Bk(s * 44 - 9, -76, 18, 20, P.red); k.R(s * 44 - 4, -72, 8, 10, P.gold); }); },
  misc(k, w, h, c) { k.Bk(-w / 2 + 12, -h + 46, w - 24, h - 46, c[0]); k.Dm(0, -h + 48, 34, c[1]); k.R(-2, -h - 2, 4, 20, P.steel); k.R(-8, -h - 6, 16, 4, c[2]); k.Win(-w / 2 + 28, -h + 70, 18, 18, true); k.Win(w / 2 - 46, -h + 70, 18, 18, true); k.Door(-12, -40, 24, 40); },
  recruit(k, w, h, c) { CIVIL.misc(k, w, h, c); },
};
CIVIL.core = CIVIL.misc;
// towers by weapon: a platform at the top where the crew stands (TOWER_TOP)
const TOWER_TOP = { bolt: -150, shell: -78, chain: -168, arcane: -200, colossus: -300, zeus: -250 };
const TOWERS = {
  bolt(k, w, h, c) { [-40, 36].forEach(a => { k.R(a, -150, 8, 150, P.brown); }); k.R(-44, -96, 88, 6, P.brown); k.R(-40, -60, 80, 6, P.brown); k.Bk(-54, -160, 108, 14, P.tan); k.T([[-58, -206], [0, -236], [58, -206]], c[1]); k.R(-50, -206, 4, 46, P.brown); k.R(46, -206, 4, 46, P.brown); },
  shell(k, w, h, c) { k.Bk(-w / 2 + 6, -76, w - 12, 76, P.slate); k.R(-w / 2 + 6, -76, w - 12, 10, P.steel); for (let i = 0; i < 4; i++) k.R(-w / 2 + 10 + i * 30, -88, 18, 12, P.slate); k.Bk(10, -70, 60, 16, P.ink); k.R(66, -72, 8, 20, P.steel); },
  chain(k, w, h, c) { k.Bk(-14, -150, 28, 150, P.steel); [-40, -80, -120].forEach(y => k.Bk(-26, y, 52, 8, P.amber)); k.Bk(-22, -176, 44, 26, c[1]); k.R(-10, -186, 20, 10, c[2]); k.R(-30, -12, 60, 12, P.slate); },
  arcane(k, w, h, c) { k.Bk(-20, -196, 40, 196, P.slate); k.R(-20, -196, 40, 4, P.lavender); k.Bk(-34, -206, 68, 12, P.dusk); k.T([[-28, -206], [0, -270], [28, -206]], c[1]); k.R(-3, -284, 6, 14, c[2]); [-150, -100, -50].forEach(y => k.Win(-6, y, 12, 18, true)); k.Door(-10, -34, 20, 34); },
  colossus(k, w, h, c) { k.Bk(-60, -60, 120, 60, P.slate); k.Bk(-26, -210, 52, 150, '#b87333'); k.Bk(-20, -250, 40, 40, '#b87333'); k.Bk(-62, -200, 36, 20, '#b87333'); k.Bk(26, -240, 20, 70, '#b87333'); k.R(-12, -236, 8, 6, P.ink); k.R(4, -236, 8, 6, P.ink); [-20, -60].forEach(a => k.Bk(a, -60, 16, 1, '#b87333')); },
  zeus(k, w, h, c) { k.Bk(-70, -50, 140, 50, P.cream); k.Bk(-40, -110, 80, 60, P.silver); k.Bk(-30, -190, 60, 90, P.cream); k.Bk(-18, -228, 36, 38, P.cream); k.R(-18, -234, 36, 10, P.gold); k.Bk(30, -220, 10, 110, P.gold); k.T([[35, -236], [48, -220], [36, -216], [50, -196], [30, -214], [40, -218]], P.butter); },
};
// wonders with their own silhouettes (fallback: a big civil building with a gold trim and a flag)
const WONDERS = {
  eiffel(k, w, h, c) { k.T([[-70, 0], [-20, -200], [20, -200], [70, 0], [44, 0], [0, -110], [-44, 0]], '#7a5a4a'); k.Bk(-40, -120, 80, 10, '#8a6a5a'); k.T([[-22, -200], [-6, -310], [6, -310], [22, -200]], '#8a6a5a'); k.Bk(-26, -206, 52, 10, '#8a6a5a'); k.R(-2, -330, 4, 22, P.steel); },
  bigben(k, w, h, c) { k.Bk(-40, -230, 80, 230, '#c9a86a'); k.Bk(-46, -236, 92, 12, P.tan); k.Bk(-30, -210, 60, 60, P.cream); k.R(-2, -196, 4, 22, P.ink); k.R(-2, -182, 18, 4, P.ink); k.T([[-44, -236], [0, -300], [44, -236]], '#3d4a5a'); for (let i = 0; i < 4; i++) k.Win(-24 + i * 14, -120, 8, 40, false); },
  liberty(k, w, h, c) { k.Bk(-50, -70, 100, 70, P.slate); k.Bk(-24, -200, 48, 130, '#5fae9a'); k.Bk(-18, -236, 36, 36, '#5fae9a'); k.T([[-18, -236], [-26, -252], [-10, -244], [0, -262], [10, -244], [26, -252], [18, -236]], '#5fae9a'); k.Bk(18, -272, 12, 60, '#5fae9a'); k.R(14, -290, 20, 18, P.gold); k.R(18, -300, 12, 10, P.amber); },
  lighthouse(k, w, h, c) { k.T([[-40, 0], [-24, -230], [24, -230], [40, 0]], P.cream); [-60, -130, -190].forEach(y => k.R(-36 + (y + 230) / 230 * 0, y, 72, 16, P.red)); k.Bk(-30, -262, 60, 32, P.ink); k.R(-24, -256, 48, 22, P.butter); k.T([[-34, -262], [0, -296], [34, -262]], P.red); },
  pyramids(k, w, h, c) { k.T([[-130, 0], [0, -200], [130, 0]], '#d8b870'); k.T([[0, -200], [130, 0], [40, 0]], '#b89850', false); for (let i = 1; i < 6; i++) k.R(-130 + i * 22, -i * 33, 260 - i * 44, 3, '#a88840'); k.Door(-12, -36, 24, 36); },
  taj(k, w, h, c) { k.Bk(-90, -120, 180, 120, P.cream); k.Dm(0, -120, 60, P.white); k.R(-3, -196, 6, 18, P.gold); [-110, 110].forEach(a => { k.Bk(a - 9, -200, 18, 200, P.cream); k.Dm(a, -200, 12, P.white); }); k.Door(-20, -80, 40, 80); },
  hagia(k, w, h, c) { k.Bk(-90, -110, 180, 110, '#e0a080'); k.Dm(0, -110, 70, '#c08060'); k.R(-3, -196, 6, 16, P.gold); [-116, 116].forEach(a => { k.Bk(a - 8, -220, 16, 220, P.cream); k.T([[a - 10, -220], [a, -250], [a + 10, -220]], P.slate); }); },
  forbidden(k, w, h, c) { k.Bk(-110, -60, 220, 60, P.red); k.T([[-126, -60], [-100, -96], [100, -96], [126, -60]], P.gold); k.Bk(-70, -150, 140, 54, P.red); k.T([[-86, -150], [-60, -186], [60, -186], [86, -150]], P.gold); k.Door(-20, -54, 40, 54); },
  potala(k, w, h, c) { k.Bk(-120, -110, 240, 110, P.cream); k.Bk(-60, -200, 120, 90, '#8c1f3a'); k.R(-60, -210, 120, 10, P.gold); for (let i = 0; i < 6; i++) k.Win(-100 + i * 36, -80, 14, 20, true); for (let i = 0; i < 3; i++) k.Win(-40 + i * 34, -170, 12, 18, true); },
  colosseum(k, w, h, c) { k.Bk(-128, -160, 256, 160, '#c9a86a'); for (let j = 0; j < 3; j++) for (let i = 0; i < 7; i++) { const a = -118 + i * 34, b = -148 + j * 50; k.R(a, b, 24, 36, P.umber); k.R(a, b, 24, 8, M.shade('#c9a86a', 0.2)); } k.R(-128, -160, 70, 40, '#07060f'); },
  maracana(k, w, h, c) { k.T([[-130, 0], [-110, -110], [110, -110], [130, 0]], P.silver); k.R(-110, -120, 220, 12, P.steel); k.R(-90, -100, 180, 30, '#2f7a3d'); for (let i = 0; i < 6; i++) k.R(-120 + i * 46, -150, 4, 40, P.steel); },
  stonehenge(k, w, h, c) { [[-100, 110], [-50, 124], [0, 110], [50, 124], [96, 100]].forEach(([a, hh], i) => { k.Bk(a - 12, -hh, 24, hh, '#8a8a90'); if (i % 2 === 0 && i < 4) k.Bk(a - 14, -hh - 16, 70, 16, '#9a9aa0'); }); },
  angkor(k, w, h, c) { [[-80, 130], [0, 200], [80, 130]].forEach(([a, hh]) => { for (let i = 0; i < 5; i++) k.Bk(a - 36 + i * 7, -hh * (i + 1) / 5, 72 - i * 14, hh / 5, '#9a8a6a'); }); k.R(-120, -40, 240, 40, '#8a7a5a'); },
  machu(k, w, h, c) { k.T([[-125, 0], [-40, -180], [0, -150], [60, -190], [125, 0]], '#4a6a4a'); for (let i = 0; i < 4; i++) k.R(-110 + i * 20, -30 - i * 34, 200 - i * 40, 6, '#6aa84f'); [-40, 20].forEach(a => { k.Bk(a, -100, 30, 22, '#9a8a6a'); k.T([[a - 4, -100], [a + 15, -116], [a + 34, -100]], P.tan); }); },
  gardens(k, w, h, c) { [0, 1, 2].forEach(i => { k.Bk(-110 + i * 28, -60 - i * 60, 220 - i * 56, 60, '#c9a86a'); for (let j = 0; j < 6 - i * 2; j++) k.R(-100 + i * 28 + j * 34, -66 - i * 60, 20, 12, '#6aa84f'); }); },
  artemis(k, w, h, c) { k.Bk(-110, -20, 220, 20, P.cream); for (let i = 0; i < 7; i++) k.Col(-100 + i * 32, -140, 14, 120, P.cream); k.T([[-116, -140], [0, -176], [116, -140]], P.cream); },
  library(k, w, h, c) { k.Bk(-110, -20, 220, 20, P.cream); for (let i = 0; i < 6; i++) k.Col(-96 + i * 38, -130, 14, 110, P.cream); k.Bk(-110, -146, 220, 16, P.cream); k.Dm(0, -146, 50, c[1]); },
  opera(k, w, h, c) { k.Bk(-120, -40, 240, 40, '#c9a86a'); [[-90, 120], [-30, 160], [30, 140], [90, 100]].forEach(([a, hh]) => k.T([[a - 44, -40], [a + 10, -40 - hh], [a + 30, -40]], P.white)); },
  goldengate(k, w, h, c) { [-80, 80].forEach(a => { k.Bk(a - 12, -200, 24, 200, '#c0402a'); k.R(a - 18, -140, 36, 8, '#c0402a'); }); k.R(-130, -60, 260, 12, '#c0402a'); x0line(k); },
  amundsen(k, w, h, c) { k.Bk(-100, -60, 200, 60, P.silver); k.Dm(-30, -60, 50, P.white); k.R(50, -150, 6, 90, P.steel); k.T([[36, -150], [53, -170], [70, -150]], P.steel); k.Win(-80, -40, 16, 16, true); k.Win(70, -40, 16, 16, true); },
  wolfsburg(k, w, h, c) { k.Bk(-120, -110, 240, 110, P.slate); for (let i = 0; i < 4; i++) k.T([[-120 + i * 60, -110], [-120 + i * 60, -140], [-60 + i * 60, -110]], P.steel); [60, 90].forEach(a => k.Bk(a, -190, 18, 80, P.umber)); for (let i = 0; i < 5; i++) k.Win(-100 + i * 42, -80, 22, 24, true); },
  venice(k, w, h, c) { [-80, 80].forEach(a => { k.Bk(a - 24, -190, 48, 190, '#c07050'); k.R(a - 28, -196, 56, 10, '#c9a86a'); for (let i = 0; i < 3; i++) k.R(a - 24 + i * 18, -206, 10, 10, '#c07050'); }); k.Bk(-56, -110, 112, 110, '#c9a86a'); k.R(-30, -80, 60, 80, P.abyss); k.T([[-30, -80], [0, -104], [30, -80]], P.abyss); },
  ruhr(k, w, h, c) { k.Bk(-110, -90, 220, 90, P.umber); [-70, -20, 30, 80].forEach((a, i) => k.Bk(a - 10, -170 - i % 2 * 50, 20, 90 + i % 2 * 50, P.slate)); for (let i = 0; i < 4; i++) k.Win(-96 + i * 50, -60, 24, 22, true); },
  michel(k, w, h, c) { k.T([[-66, 0], [-50, -110], [50, -110], [66, 0]], '#6a6a78'); k.Bk(-40, -170, 80, 60, P.slate); k.T([[-8, -170], [0, -236], [8, -170]], P.slate); for (let i = 0; i < 5; i++) k.R(-62 + i * 28, -124, 18, 14, '#6a6a78'); },
  terracotta(k, w, h, c) { k.Bk(-100, -40, 200, 40, '#8a5a3c'); for (let j = 0; j < 2; j++) for (let i = 0; i < 5; i++) { const a = -80 + i * 40 + j * 20, b = -100 - j * 14; k.Bk(a - 8, b, 16, 50, '#c98f5a'); k.Bk(a - 7, b - 16, 14, 14, '#c98f5a'); } },
  kotoku(k, w, h, c) { k.Bk(-80, -40, 160, 40, P.slate); k.Bk(-56, -130, 112, 90, '#5f7a6a'); k.Dm(0, -130, 34, '#5f7a6a'); k.R(-4, -200, 8, 14, '#5f7a6a'); k.R(-30, -110, 60, 6, '#4a6a5a'); },
  shaolin(k, w, h, c) { k.Bk(-100, -90, 200, 90, '#c9a86a'); k.T([[-118, -90], [-90, -130], [90, -130], [118, -90]], '#8c1f3a'); k.Bk(-50, -160, 100, 30, '#c9a86a'); k.T([[-66, -160], [-40, -190], [40, -190], [66, -160]], '#8c1f3a'); k.Door(-16, -60, 32, 60); },
};
function x0line(k) { /* the bridge cables: drawn as steps */ for (let i = 0; i < 8; i++) { const a = -80 + i * 20, b = -200 + Math.abs(i - 3.5) * 0 + (i < 4 ? i * 20 : (7 - i) * 20); k.R(a, b + 40, 4, 100 - (i < 4 ? i * 20 : (7 - i) * 20), '#c0402a'); } }
function wallArt(k, key, w, h) {
  if (key === 'michel') return WONDERS.michel(k, w, h);
  k.Bk(-w / 2, -h + 18, w, h - 18, '#8a8078'); for (let i = 0; i < 3; i++) k.R(-w / 2 + 4 + i * 22, -h + 4, 14, 16, '#8a8078');
  for (let j = 0; j < 5; j++) k.R(-w / 2 + 3, -h + 40 + j * 24, w - 6, 3, '#6a6058'); k.R(-4, -h + 60, 8, 20, P.ink);
}
function guardArt(k, key, w, h, c) {
  if (WONDERS[key]) return WONDERS[key](k, w, h, c);
  k.Bk(-w / 2 + 10, -h + 50, w - 20, h - 50, P.slate); k.T([[-w / 2, -h + 52], [0, -h + 10], [w / 2, -h + 52]], c[1]); k.Door(-20, -60, 40, 60); k.Flag(w / 2 - 20, -h + 50, P.red);
}
// one picture per (key, look): 0 standing, 1 standing & darker (back row), 2 ruin, 3 building site
function artOf(key, look, prog) {
  const ck = key + '|' + look + '|' + (look === 3 ? Math.round((prog || 0) * 4) : 0); if (art[ck]) return art[ck];
  const f = M.townFoot(key), W = f.w + 90, H = f.h + 110, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.translate(W / 2, H - 20); const k = kit(x), B = B_[key], role = M.townRole(key), pl = pal(key), w = f.w, h = f.h;
  if (look === 2) {
    // rubble: stones, a broken beam, a leaning post
    for (let i = 0; i < 9; i++) k.Bk(-w / 2 + 8 + (i * 37) % (w - 20), -18 - (i % 3) * 12, 18 + (i % 4) * 6, 14, i % 2 ? '#6a6058' : '#4b5268');
    k.T([[-w / 2 + 20, -30], [w / 2 - 30, -70], [w / 2 - 22, -60], [-w / 2 + 26, -22]], P.brown); k.R(w / 2 - 50, -90, 8, 90, P.umber);
  } else if (look === 3) {
    // building site: a foundation, scaffold poles, and the frame rising with the work done
    const q = cl(prog || 0, 0, 1); k.Bk(-w / 2, -14, w, 14, P.slate); const hh = 40 + (h - 40) * q;
    for (let i = 0; i < 4; i++) k.R(-w / 2 + 6 + i * (w - 16) / 3, -hh, 5, hh, P.tan); for (let j = 1; j < 4; j++) k.R(-w / 2 + 4, -hh * j / 4, w - 8, 4, P.tan);
    k.R(w / 2 - 6, -h - 30, 5, h + 30, P.amber); k.R(-w / 2 + 20, -h - 30, w - 20, 5, P.amber); k.R(-w / 2 + 30, -h - 25, 2, 40, P.ink);
  } else {
    if (role === 'wall') wallArt(k, key, w, h);
    else if (role === 'tower') (WONDERS[key] && B.q ? WONDERS[key] : (TOWERS[B.weapon.kind] || TOWERS.bolt))(k, w, h, pl);
    else if (role === 'guard') guardArt(k, key, w, h, pl);
    else if (WONDERS[key]) { WONDERS[key](k, w, h, pl); k.Flag(w / 2 - 10, -h + 30, M.QUALITY[B.q].c); }
    else if (B.q) { (CIVIL[B.cat] || CIVIL.misc)(k, w, h, pl); k.R(-w / 2 + 6, -h + 30, w - 12, 5, P.gold); k.Flag(w / 2 - 14, -h + 30, M.QUALITY[B.q].c); }
    else (CIVIL[B.cat] || CIVIL.misc)(k, w, h, pl);
    if (look === 1) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(7,6,15,0.3)'; x.fillRect(-W / 2, -H, W * 2, H * 2); x.globalCompositeOperation = 'source-over'; }
  }
  c.ox = W / 2; c.oy = H - 20; art[ck] = c; return c;
}
M.townArt = artOf;

// ───────── the town state (not saved: it is the picture of the rooms) ─────────
const JOB = { power: 'gather', store: 'gather', med: 'wander', forge: 'work', train: 'work', luck: 'work', misc: 'wander', recruit: 'wander' };
const NPCK = { power: 'Landlord', store: 'VikingPirate', med: 'DesertBeliever', forge: 'IroncladWarrior', train: 'Gladiator', luck: 'SwordDancer', misc: 'Ranger', recruit: 'Ranger' };
const CREW = { bolt: 'EliteHunter', shell: 'Cannoneer', chain: 'Wizard', arcane: 'MageApprentice', colossus: 'Bishop', zeus: 'Bishop' };
M.TOWN_CREW = CREW; M.TOWER_TOP = TOWER_TOP;
const sigOf = (L) => L.items.map(o => o.k + ':' + o.key + (o.site ? 's' : '') + (o.ruin ? 'r' : '') + (o.demo ? 'd' : '')).sort().join('|');
G.townSync = function (force) {
  const m = this.meta; if (!m || !m.base) return null;
  let T = this.town; if (!T || T.m !== m) T = this.town = { m, vis: {}, sig: '', init: true, npcs: [], t: 0, gone: [] };
  const L = M.townLayout(m), sig = sigOf(L); if (!force && sig === T.sig && T.L) return T;
  const was = T.vis, vis = {};
  L.items.forEach(o => {
    const v = was[o.k] && was[o.k].key === o.key ? was[o.k] : null;
    const nv = Object.assign(v || { x: o.tx, bornT: T.init ? -9 : T.t }, o);
    if (v && v.site && !o.site && !T.init) nv.riseT = T.t;                         // the room was finished: the building rises
    if (!v && !o.site && !T.init) nv.riseT = T.t;
    if (!v && o.site && !T.init) nv.dropT = T.t;                                    // a new building site
    if (v && !v.ruin && o.ruin) nv.fallT = T.t;
    if (v && v.ruin && !o.ruin && !T.init) nv.riseT = T.t;                          // repaired
    vis[o.k] = nv;
  });
  Object.keys(was).forEach(k => { if (!vis[k] || vis[k].key !== was[k].key) { if (!T.init) T.gone.push(Object.assign({}, was[k], { goneT: T.t })); } });
  T.vis = vis; T.L = L; T.sig = sig; T.init = false; M.townSpan = L.span;
  // people: one per working building (two for a wonder), none for walls and barracks; the tower crew stands on top in a raid
  const keep = new Map(T.npcs.map(n => [n.home + '|' + n.i, n])); T.npcs = [];
  L.items.forEach(o => {
    if (o.site || o.ruin || o.demo || o.role === 'wall' || o.role === 'guard') return;
    const n = o.role === 'civil' && o.B.q ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const id = o.k + '|' + i, old = keep.get(id), kind = o.role === 'tower' ? 'crew' : JOB[o.B.cat] || 'wander';
      T.npcs.push(old || { home: o.k, i, key: o.role === 'tower' ? (CREW[o.B.weapon.kind] || 'EliteHunter') : (NPCK[o.B.cat] || 'Ranger'), kind, x: o.tx + (rnd(o.c * 3 + o.r + i) - 0.5) * 60, tx: null, wait: rnd(o.c + o.r * 7 + i) * 2, face: o.side || 1, walk: 0, st: 'idle', t0: 0, carry: false });
    }
  });
  return T;
};
// people: wait → walk to a spot → arrive. Gatherers go out, work, come back with a sack and drop it at the door;
// workers go to their spot by the door and swing; the rest wander about
function npcPlan(n, v, t, door) {
  if (n.kind === 'gather') { if (n.loaded) { n.loaded = false; n.carry = true; n.tx = door; } else n.tx = v.x + v.side * (180 + rnd(n.i * 9 + Math.floor(t)) * 260); }
  else if (n.kind === 'work') n.tx = v.x + v.side * (v.w * v.sc * 0.5 + 24);
  else n.tx = v.x + (rnd(n.i * 13 + Math.floor(t * 0.7)) - 0.5) * 460;
}
function npcArrive(n, v, t) {
  if (n.kind === 'gather') { if (n.carry) { n.carry = false; n.pop = t; n.st = 'idle'; n.wait = 1.2; } else { n.st = 'work'; n.wait = 1.8; n.face = -v.side; n.loaded = true; } }
  else if (n.kind === 'work') { if (n.st === 'work') { n.st = 'idle'; n.wait = 0.8 + rnd(n.i + t) * 1.2; } else { n.st = 'work'; n.face = -v.side; n.wait = 3 + rnd(n.i + t) * 3; } }
  else { n.st = 'idle'; n.wait = 1 + rnd(n.i * 5 + t) * 2.5; }
}
function npcStep(n, v, t, dt, door) {
  if (n.wait > 0) { n.wait -= dt; if (n.st === 'work') { const b = Math.floor((t + n.i * 0.37) / 0.9); if (b !== n.hit) { n.hit = b; n.swing = t; } } return; }
  if (n.tx == null) { if (n.kind === 'work' && n.st === 'idle' && n.worked) { n.tx = n.x; } else npcPlan(n, v, t, door); n.worked = n.kind === 'work'; }
  const dd = n.tx - n.x;
  if (Math.abs(dd) > 4) { const sp = 70 * dt; n.x += Math.sign(dd) * Math.min(Math.abs(dd), sp); n.face = Math.sign(dd) || n.face; n.walk += sp; n.st = 'walk'; return; }
  n.tx = null; npcArrive(n, v, t);
}
// every frame on the base: slide to the targets, keep the people busy
G.townTick = function (dt) {
  const T = this.townSync(); if (!T) return; T.t += dt; const raid = this.raid, t = T.t;
  Object.values(T.vis).forEach(v => {
    const d = v.tx - v.x; if (Math.abs(d) > 0.5) { const sp = Math.min(Math.abs(d), Math.max(60, Math.abs(d) * 2.2) * dt); v.x += Math.sign(d) * sp; v.moving = t; if (Math.random() < dt * 6 && this.bv) v.dust = t; } else v.x = v.tx;
  });
  T.gone = T.gone.filter(g => t - g.goneT < 1.4);
  T.npcs.forEach(n => {
    const v = T.vis[n.home]; if (!v) return;
    const door = v.x + (v.row === 0 ? 0 : v.side * 10);
    if (raid && !raid.over) {
      // run inside; the crews appear on their towers
      if (n.kind === 'crew') { n.st = 'post'; return; }
      if (!n.hidden) { const dd = door - n.x; if (Math.abs(dd) > 6) { n.x += Math.sign(dd) * Math.min(Math.abs(dd), 240 * dt); n.face = Math.sign(dd); n.walk += 240 * dt; n.st = 'run'; } else { n.hidden = true; } }
      return;
    }
    if (n.hidden || n.st === 'post') { n.hidden = false; n.st = 'idle'; n.x = door; n.tx = null; n.wait = 0.5 + rnd(n.i + t) * 1.5; }
    npcStep(n, v, t, dt, door);
  });
};

// ───────── drawing (world space, on the surface; after the main base) ─────────
function drawNpc(ctx, n, t, lights, v) {
  if (n.hidden) return;
  let st = 'idle', f = Math.floor(t * 2.5 + n.i);
  if (n.st === 'walk' || n.st === 'carry' || n.st === 'run') { st = 'walk'; f = Math.floor(n.walk / 14); }
  else if (n.st === 'work') { const u = t - (n.swing || -9); st = u < 0.3 ? 'atk' : 'idle'; f = u < 0.3 ? Math.min(2, Math.floor(u / 0.1)) : f; }
  const im = M.P16 && M.P16.img(n.key, st, f, null, 64); if (!im) return;
  const y = -10;
  ctx.save(); ctx.globalAlpha *= 0.45; ctx.fillStyle = P.ink; ctx.beginPath(); ctx.ellipse(n.x, y + 2, 18, 5, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(Math.round(n.x), y); if ((n.face || 1) < 0) ctx.scale(-1, 1); ctx.drawImage(im, -im.cx, -im.footY); ctx.restore();
  if (n.carry) { const s = M.spriteCanvas('sack', 2); if (s) ctx.drawImage(s, n.x - 16, y - 100, 32, 32 * s.height / s.width); }
  if (n.st === 'work' && t - (n.swing || -9) < 0.2 && v && v.B.cat === 'forge') { for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? P.gold : P.amber; ctx.fillRect(n.x + n.face * 26 + (rnd(i + t * 30) - 0.5) * 30, y - 40 - rnd(i * 3 + t * 20) * 30, 5, 5); } if (lights) lights.push({ x: n.x + n.face * 26, y: y - 40, r: 120, c: '#ffb060', f: 1 }); }
  if (n.pop && t - n.pop < 0.8) { const q = (t - n.pop) / 0.8; ctx.save(); ctx.globalAlpha = 1 - q; U.text(ctx, '+', n.x, y - 110 - q * 30, 34, P.gold, { outline: true }); ctx.restore(); }
}
function drawBuilding(ctx, v, t, lights, raid) {
  const age = t - (v.riseT != null ? v.riseT : -9), rising = age >= 0 && age < 1.25, look = v.site ? 3 : v.ruin ? 2 : v.row === 0 ? 1 : 0;
  const x0 = raid && raid.bld && raid.bld[v.k], dead = x0 && x0.hp <= 0;
  const im = artOf(v.key, dead ? 2 : look, v.site ? v.prog : 0), y0 = v.row === 0 ? -14 : -8, sc = v.sc || 1;
  let rise = 0, jit = 0, hop = 0;
  if (rising) { const q = cl((age - 0.15) / 0.8, 0, 1); rise = (1 - eo(q)) * (v.h + 30); jit = q < 1 && !RM() ? (Math.random() - 0.5) * 6 : 0; }
  if (v.moving && t - v.moving < 0.05 && !RM()) hop = Math.abs(Math.sin(t * 14)) * 6;
  const fall = v.fallT != null && t - v.fallT < 0.6 ? (t - v.fallT) / 0.6 : 1;
  // hit flash in a raid
  const hitA = x0 && x0.hitT != null && raid.t - x0.hitT < 0.12;
  ctx.save(); ctx.translate(Math.round(v.x + jit), y0);
  if (rising) { ctx.beginPath(); ctx.rect(-v.w, -v.h - 200, v.w * 2, v.h + 200 + 6); ctx.clip(); }
  ctx.scale(sc, sc);
  ctx.drawImage(im, -im.ox, -im.oy + rise - hop);
  if (hitA) { ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 0.6; ctx.fillStyle = '#fff'; ctx.fillRect(-im.ox, -im.oy, im.width, im.height); }
  ctx.restore();
  if (fall < 1) { ctx.save(); ctx.globalAlpha = 1 - fall; ctx.fillStyle = P.slate; for (let i = 0; i < 8; i++) ctx.fillRect(v.x + (rnd(i) - 0.5) * v.w, -20 - fall * 80 * rnd(i + 3), 10, 10); ctx.restore(); }
  // the ground bursting where it rises
  if (rising && age < 1.0) { for (let i = 0; i < 10; i++) { const q = age / 1.0, a = rnd(i * 7) * Math.PI, sp = 60 + rnd(i) * 160; ctx.fillStyle = i % 3 ? '#6a5040' : P.tan; ctx.fillRect(v.x + Math.cos(a) * sp * q * (i % 2 ? 1 : -1) * 1.4, -12 - Math.sin(a) * sp * q + 300 * q * q, 8, 8); } if (lights) lights.push({ x: v.x, y: -40, r: 260, c: '#ffcf8a', f: 1 - age }); }
  // live bits: smoke from chimneys, lit windows, tower glow
  if (!v.site && !v.ruin && !dead) {
    const B = v.B, role = v.role;
    if (role === 'civil' && (B.cat === 'power' || B.cat === 'forge' || v.key === 'ruhr' || v.key === 'wolfsburg')) for (let i = 0; i < 3; i++) { const q = ((t * 0.5 + i / 3 + v.c * 0.1) % 1); ctx.save(); ctx.globalAlpha = 0.5 * (1 - q); ctx.fillStyle = B.cat === 'forge' ? '#3a3440' : '#8a8590'; const s = 10 + q * 22; ctx.fillRect(v.x - v.w * sc * 0.5 + 26 * sc + q * 20 - s / 2, y0 - v.h * sc - q * 90 - s / 2, s, s); ctx.restore(); }
    if (lights) lights.push({ x: v.x, y: y0 - v.h * sc * 0.45, r: (v.w + 60) * sc, c: role === 'tower' ? '#ffb070' : (SP[B.style] || SP.medieval)[2], f: 0.45 + 0.05 * Math.sin(t * 2 + v.c) });
    if (role === 'tower' && x0 && x0.fireT != null && raid.t - x0.fireT < 0.15 && lights) lights.push({ x: v.x, y: y0 + (TOWER_TOP[B.weapon.kind] || -150), r: 280, c: '#fff0b0', f: 1 });
  }
  if (v.demo && !dead) { ctx.save(); ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 6); ctx.strokeStyle = P.red; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(v.x - 30, y0 - v.h * sc * 0.6 - 30); ctx.lineTo(v.x + 30, y0 - v.h * sc * 0.6 + 30); ctx.moveTo(v.x + 30, y0 - v.h * sc * 0.6 - 30); ctx.lineTo(v.x - 30, y0 - v.h * sc * 0.6 + 30); ctx.stroke(); ctx.restore(); }
}
function drawCrew(ctx, v, n, t, raid) {
  // the crew on its tower: faces the enemy side, strikes when the tower fires
  const B = v.B, top = TOWER_TOP[B.weapon.kind] || -150, x0 = raid && raid.bld && raid.bld[v.k]; if (!x0 || x0.hp <= 0) return;
  if (B.weapon.kind === 'colossus' || B.weapon.kind === 'zeus') return;   // the statue itself strikes
  const u = x0.fireT != null ? raid.t - x0.fireT : 9, magic = B.weapon.kind === 'arcane' || B.weapon.kind === 'chain';
  const st = u < 0.3 ? (magic ? 'cast' : 'atk') : 'idle', f = u < 0.3 ? Math.min(magic ? 1 : 2, Math.floor(u / 0.1)) : Math.floor(t * 2.5);
  const im = M.P16 && M.P16.img(n.key, st, f, null, 60); if (!im) return;
  ctx.save(); ctx.translate(Math.round(v.x + v.side * 4), (v.row === 0 ? -14 : -8) + top + 6); if (v.side < 0) ctx.scale(-1, 1); ctx.drawImage(im, -im.cx, -im.footY); ctx.restore();
}
// the leader on the roof of the main base: watching; in a raid, commanding
function drawLeader(ctx, g, t, raid, lights) {
  const h = g.meta.heroes[0]; if (!h) return; const H = M.HEROES[h.cls]; if (!H) return;
  const cmd = raid && !raid.over, st = cmd ? (Math.floor(t * 1.25) % 3 === 0 ? 'cast' : 'charge') : 'idle', f = Math.floor(t * (cmd ? 6 : 2.5));
  const im = M.P16 && M.P16.img(H.sprite, st, f, null, 96); if (!im) return; const x = DOOR_X + 200, y = MB.top - 70;
  ctx.save(); ctx.translate(x, y); ctx.drawImage(im, -im.cx, -im.footY); ctx.restore();
  ctx.fillStyle = P.ink; ctx.fillRect(x + 40, y - 150, 5, 150); ctx.fillStyle = P.red; const wv = RM() ? 0 : Math.sin(t * 5) * 3; ctx.fillRect(x + 45, y - 150 + wv, 44, 26); ctx.fillStyle = P.gold; ctx.fillRect(x + 45, y - 150 + wv, 44, 5);
  if (lights) lights.push({ x, y: y - 50, r: 180, c: '#ffe6b0', f: 1 });
}
M.BASE_HOOKS.push(function (ctx, meta, bv, lights, phase, opts) {
  const g = M._g; if (!g || g.meta !== meta) return;
  if (phase === 'cells') return drawCells(ctx, meta, bv, lights);
  if (phase === 'top') return drawTopHud(ctx, meta, bv, opts);
  if (phase !== 'surface') return;
  const T = g.town || g.townSync(); if (!T) return; const t = T.t, raid = opts && opts.raid;
  const vs = Object.values(T.vis);
  // job progress for building sites
  vs.forEach(v => { if (v.site) { const x = M.cell(meta, v.c, v.r); v.prog = x && x.job ? 1 - x.job.days / x.job.total : 0; } });
  vs.filter(v => v.row === 0).sort((a, b) => Math.abs(b.x - DOOR_X) - Math.abs(a.x - DOOR_X)).forEach(v => drawBuilding(ctx, v, t, lights, raid));
  T.gone.forEach(gv => { const q = (t - gv.goneT) / 1.4; ctx.save(); ctx.beginPath(); ctx.rect(gv.x - gv.w, -gv.h - 60, gv.w * 2, gv.h + 62); ctx.clip(); const im = artOf(gv.key, gv.ruin ? 2 : gv.row === 0 ? 1 : 0); ctx.translate(gv.x + (RM() ? 0 : (Math.random() - 0.5) * 6), -10 + q * q * (gv.h + 40)); ctx.scale(gv.sc || 1, gv.sc || 1); ctx.drawImage(im, -im.ox, -im.oy); ctx.restore(); });
  T.npcs.forEach(n => drawNpc(ctx, n, t, lights, T.vis[n.home]));
  vs.filter(v => v.row === 1).sort((a, b) => Math.abs(b.x - DOOR_X) - Math.abs(a.x - DOOR_X)).forEach(v => drawBuilding(ctx, v, t, lights, raid));
  if (raid) T.npcs.forEach(n => { const v = T.vis[n.home]; if (n.kind === 'crew' && v && !v.site && !v.ruin) drawCrew(ctx, v, n, t, raid); });
  drawLeader(ctx, g, t, raid, lights);
  // a selected tower: its reach as a red band on the ground
  const sr = g.showReach && T.vis[g.showReach.c + ',' + g.showReach.r];
  if (sr && sr.role === 'tower' && !raid) { const w = M.weaponStats(meta, sr.c, sr.r); if (w) { const R0 = M.towerRange(w); ctx.save(); ctx.fillStyle = 'rgba(232,67,79,0.16)'; ctx.fillRect(sr.x - R0, -40, R0 * 2, 52); ctx.fillStyle = P.red; ctx.fillRect(sr.x - R0, -40, 6, 52); ctx.fillRect(sr.x + R0 - 6, -40, 6, 52); ctx.restore(); } }
  // hover: the surface building of the room under the pointer
  const hv = bv.hover && bv.hover.c != null && T.vis[bv.hover.c + ',' + bv.hover.r];
  if (hv) { const sc = hv.sc || 1, w = hv.w * sc + 16, h = hv.h * sc + 16, u = 1 / bv.z; ctx.strokeStyle = P.butter; ctx.lineWidth = 3 * u; ctx.strokeRect(hv.x - w / 2, (hv.row === 0 ? -14 : -8) - h + 8, w, h); }
});
// underground: broken rooms, repairs, demolitions
function drawCells(ctx, meta, bv, lights) {
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) {
    const x = M.cell(meta, c, r); if (!x || !x.b || M.lockedCell(meta, c, r)) continue; const X = c * CW, Y = TOP + r * CH;
    if (x.ruin && !(x.job && x.job.kind === 'repair')) { ctx.fillStyle = 'rgba(7,6,15,0.55)'; ctx.fillRect(X, Y, CW, CH); ctx.strokeStyle = P.red; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(X + 40, Y + 30); ctx.lineTo(X + 110, Y + 90); ctx.lineTo(X + 90, Y + 130); ctx.lineTo(X + 170, Y + 180); ctx.moveTo(X + 220, Y + 20); ctx.lineTo(X + 190, Y + 80); ctx.lineTo(X + 240, Y + 120); ctx.stroke(); }
    if (x.job && x.job.kind === 'repair') { ctx.strokeStyle = P.tan; ctx.lineWidth = 6; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(X + 20 + k * 80, Y + CH - 20); ctx.lineTo(X + 20 + k * 80, Y + 20); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(X + 20, Y + 70); ctx.lineTo(X + CW - 20, Y + 70); ctx.stroke(); }
    if (x.job && x.job.kind === 'demolish') { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = P.red; for (let k = -2; k < 8; k++) { ctx.beginPath(); ctx.moveTo(X + k * 50, Y); ctx.lineTo(X + k * 50 + 24, Y); ctx.lineTo(X + k * 50 - 60, Y + CH); ctx.lineTo(X + k * 50 - 84, Y + CH); ctx.fill(); } ctx.restore(); }
  }
}
function drawTopHud(ctx, meta, bv, opts) {
  // badges for broken rooms (screen space): a red cracked mark on the room and on its surface building
  const g = M._g, T = g && g.town; if (!T) return;
  Object.values(T.vis).forEach(v => { if (!v.ruin || v.fix) return; const p = bv.toScreen(v.x, -v.h * (v.sc || 1) - 40), s = Math.round(Math.max(26, 40 * bv.z)); ctx.fillStyle = P.ink; ctx.fillRect(p.x - s / 2 - 3, p.y - s / 2 - 3, s + 6, s + 6); ctx.fillStyle = P.wine; ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); const im = M.iconCanvas('u_hammer', 2); if (im) ctx.drawImage(im, p.x - s * 0.38, p.y - s * 0.38, s * 0.76, s * 0.76); });
}

// ───────── hooks ─────────
const oTick = G.tick;
G.tick = function (dt) { oTick.call(this, dt); if (this.meta && (this.screen === 'base' || this.screen === 'raid')) this.townTick(Math.min(dt || 0, 0.05)); };
// the surface buildings answer the pointer like their rooms
const BVP = M.BaseView.prototype, oPick = BVP.pick;
BVP.pick = function (sx, sy) {
  const g = M._g, T = g && g.town; if (T && !(g.raid)) { const p = this.toWorld(sx, sy); const hit = Object.values(T.vis).filter(v => { const sc = v.sc || 1; return Math.abs(p.x - v.x) < v.w * sc / 2 && p.y < 0 && p.y > -v.h * sc - 20; }).sort((a, b) => b.row - a.row)[0]; if (hit && !(Math.abs(p.x - DOOR_X) < MB.w / 2)) return { c: hit.c, r: hit.r, town: 1 }; }
  return oPick.apply(this, arguments);
};
// the resting view widens with the town so both ends stay on screen
const oHome = BVP.home;
BVP.home = function () { oHome.apply(this, arguments); if (!this.sel && !this.free && M.townSpan) { const z = cl(1920 / (M.townSpan + 500), 0.5, 0.64); if (z < this.tz) { this.tz = z; this.ty = 380 + (0.64 - z) * 300; } } };
const oNG = G.newGame;
if (oNG) G.newGame = function () { this.town = null; return oNG.apply(this, arguments); };

// ───────── the room panel: repair a broken room, demolish any room ─────────
const oPV = G.panelView;
G.panelView = function () {
  const v = oPV.apply(this, arguments), p = this.panel, m = this.meta, pn = v && v.pn; if (!pn || !p) return v;
  if (p.kind === 'room' && p.key !== 'core') {
    const x = M.cell(m, p.c, p.r), B = B_[p.key];
    if (x && x.ruin) { const cost = M.repairCost(p.key), ok = m.supplies >= cost; Object.assign(pn, { ruinOn: true, ruinTxt: '地面上的建筑被毁了，修好之前不起作用。', repairBtn: '修复 · ' + cost + ' 物资 · 1 天', repairOp: ok ? 1 : 0.45, onRepair: () => { if (!ok) { this.toast('物资不足', '#ff8a8a'); return; } if (M.startRepair(m, p.c, p.r)) { M.Sfx.build && M.Sfx.build(); this.save(); this.closePanel(); this.toast(B.n + '：明天修好', '#ffe08a'); } } }); }
    const arm = this.demoArm && this.demoArm.k === p.c + ',' + p.r && now() - this.demoArm.at < 4000;
    if (M.canDemolish(m, p.c, p.r)) Object.assign(pn, { demoOn: true, demoBtn: arm ? '确认拆除（图纸收回，地形保留）' : '拆除 · ' + M.DEMOLISH_COST + ' 物资 · 1 天', demoC: arm ? '#ff5a4a' : '#ff9aa8',
      onDemo: () => { if (!arm) { this.demoArm = { k: p.c + ',' + p.r, at: now() }; M.Sfx.click(); this.bump(); return; } if (m.supplies < M.DEMOLISH_COST) { this.toast('物资不足', '#ff8a8a'); return; } this.demoArm = null; if (M.startDemolish(m, p.c, p.r)) { M.Sfx.dig && M.Sfx.dig(); this.save(); this.closePanel(); this.toast(B.n + '：明天拆完', '#ff9aa8'); } } });
  }
  if (p.kind === 'job') { const x = M.cell(m, p.c, p.r), j = x && x.job; if (j && (j.kind === 'repair' || j.kind === 'demolish')) { pn.title = B_[j.key].n; pn.sub = (j.kind === 'repair' ? '修复中' : '拆除中') + ' · 还需 ' + j.days + ' 天'; } }
  return v;
};
// a job on a standing room opens the job panel, not the room
const oBC = G.baseClick;
G.baseClick = function (sx, sy) {
  const p = !this.raid && this.bv && this.bv.pick(sx, sy), m = this.meta, x = p && p.c != null && !p.door && M.cell(m, p.c, p.r);
  if (x && x.b && x.job && (x.job.kind === 'repair' || x.job.kind === 'demolish')) { M.Sfx.click(); this.bv.focus(p.c, p.r); this.openPanel({ kind: 'job', c: p.c, r: p.r }); return; }
  return oBC.apply(this, arguments);
};
const oCT = G.cellTip;
G.cellTip = function (p) {
  const t = oCT.apply(this, arguments), m = this.meta, x = p && p.c != null && !p.door && M.cell(m, p.c, p.r); if (!t || !x || !x.b) return t;
  if (x.job && x.job.kind === 'repair') return Object.assign({}, t, { title: t.title + '（修复中）', d: '还需 ' + x.job.days + ' 天。' });
  if (x.job && x.job.kind === 'demolish') return Object.assign({}, t, { title: t.title + '（拆除中）', d: '还需 ' + x.job.days + ' 天。' });
  if (x.ruin) return Object.assign({}, t, { title: t.title + '（已损毁）', d: '修好之前不起作用。' });
  return t;
};
})();

;
