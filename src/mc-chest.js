// ==== mc-chest.js ====
(function () {
// The map's treasure chest, opened (user ruling 2026-09-27: 「地图上领取宝箱的界面不行，要优化」; the gacha reference is the
// floor for how hard every beat hits, but the chest has its own show, not a card's — user ruling the same day: 「这个效果与
// 卡牌过于重复了」). The result is fixed before the show starts (docs/design.md §7.5.1); the show only picks how to serve it.
// A chest bound in chains with a padlock on the hasp, in a treasure cellar (mc-pxchest.js). Click it: the padlock springs
// and drops; then one chain a beat heats up in its colour and snaps, links flying, the lid jolting and spitting coins and
// light, the lanterns swinging, dust falling (3–7 chains: more chains, better loot; the colours climb to the result's
// tier). A frozen frame: the lid lifted a crack, a blade of light across the whole room, the chest a black silhouette.
// Then the lid flies open and a pillar of light goes up into the ceiling, coins erupt with it and rain on the floor, the
// braziers catch; the loot comes out worst first — the lesser pieces drop to the floor with their own drop beams and name
// plates, the best rises up the pillar and hangs in it. 收下 sends everything to its counter. A mimic breaks all its
// chains at once and bites — one beat.
// The shared feedback kit (M.SHOW, mc-show.js) does the timing, particles, rings, flashes, shake and camera.
const M = window.MC, G = M.Game && M.Game.prototype, S = M.Sfx, X = M.PXR, PX = M.PXCHEST, U = M.UI, P = (M.PJ && M.PJ.PAL) || {};
if (!G || !X || !PX) return;
const V = PX.V, AW = V.AW, AH = V.AH, K = 4;                  // one art cell = 4 logical px
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), rnd = Math.random, now = () => performance.now();
const eo = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3), eb = (t) => { t = clamp(t, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const RM = () => !!(M.PJ && M.PJ.reduced);
const SHW = () => M.SHOW;
// the game's qualities 0…5 (mc-q6.js) and 不朽 (mc-q7.js)
const QC = ['#c4ccd9', '#6fd46a', '#4f8fff', '#b86bff', '#ff9a3c', '#ff4a5a', '#c9a24a'];
// one chain per beat; the colour each chain glows before it snaps climbs to the result's tier
const LADDER = [[0, 0, 0], [0, 0, 1], [0, 1, 1, 2], [0, 1, 2, 2, 3], [0, 1, 2, 3, 3, 4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6]];
const Q4 = [0, 0, 1, 2, 3, 3, 3];                               // the kit's four steps (普通 / 稀有 / 史诗 / 传说) for its ambient
const snd = (ev, x) => { try { S.mini && S.mini('chest', ev, x); } catch (e) {} };
const spr = (x, tg, k, d) => ({ x, v: 0, tg, k: k || 0.18, d: d || 0.72 });
const step = (s, f) => { s.v += (s.tg - s.x) * s.k * f; s.v *= Math.pow(s.d, f); s.x += s.v * f; };
const HEAT = 0.26;                                              // a chain glows this long before it snaps

// ───────── what the chest holds: tier, loot kind, layout ─────────
function qOf(it) {
  if (it.q != null) return clamp(it.q | 0, 0, 6);
  const a = it.award || {};
  if (a.k === 'bp' && typeof a.key === 'string') {
    if (a.key.startsWith('bbp:')) { const B = M.BUILDINGS[a.key.slice(4)]; if (B) return B.boss ? 6 : clamp(B.q | 0, 0, 5); }
    if (a.key.startsWith('gift:')) return 2;   // a keepsake has no quality of its own: shown as 稀有 (§7.5.1 演出用的品质)
    const I = M.itemInfo && M.itemInfo(a.key); if (I && I.q != null) return clamp(I.q | 0, 0, 6);
  }
  const i = QC.indexOf(it.c); if (i >= 0) return i; const j = (M.QUALITY || []).findIndex(Q => Q.c === it.c); return j >= 0 ? j : 0;
}
function kindOf(it) {
  const a = it.award || {};
  if (a.k === 'wallet') return /\+/.test(it.n || '') ? 'pouch' : 'coins';
  if (a.k === 'rsup') return 'sup';
  if (a.k === 'bp') { const k = String(a.key || ''); if (k.startsWith('bbp:')) return 'bp'; if (it.n === '图纸三选一') return 'pick'; return 'gift'; }
  return 'gift';
}
// the best piece hangs in the pillar over the chest; the rest land on the floor either side, the worse ones further out
const FLOOR = [[116, 252], [364, 252], [48, 256], [432, 256]];
function layout(c) {
  const n = c.items.length, order = c.items.map((it, i) => i).sort((a, b) => c.items[a].sq - c.items[b].sq || a - b);
  const rest = order.slice(0, -1), slots = FLOOR.slice(0, rest.length).sort((a, b) => Math.abs(b[0] - V.CHX) - Math.abs(a[0] - V.CHX) || a[0] - b[0]);
  rest.forEach((ii, k) => { const it = c.items[ii]; it.ax = slots[k][0]; it.ay = slots[k][1] - PX.LH / 2; it.floor = 1; it.ord = k; });
  if (n) { const it = c.items[order[n - 1]]; it.ax = V.CHX; it.ay = 90; it.floor = 0; it.ord = n - 1; }
  c.order = order;
}
const mouthY = (c) => V.CHY - 44 - Math.max(0, c.lift.x);                 // art cells
const mouth = (c) => ({ x: V.CHX * K, y: mouthY(c) * K });               // logical px

// ───────── things that live in the vault: coins, chain links, dust (drawn into the scene, bounce on its floor) ─────────
function part(c, x, y, vx, vy, life, o) { if (c.pp.length > 500) c.pp.shift(); c.pp.push(Object.assign({ x, y, vx, vy, t: 0, life, drag: 0.99, g: 0 }, o)); }
function coinP(c, x, y, n, o) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * (o && o.spread || 1.9), s = (o && o.v || 110) * (0.5 + rnd()); const px = x + (rnd() - 0.5) * 20; part(c, px, y, Math.cos(a) * s, Math.sin(a) * s, (o && o.life) || 2 + rnd(), { coin: 1, g: 260, fl: 232 + rnd() * 34, ph: rnd() * 6, rest: 1 }); } }
function linkP(c, x0, y0, x1, y1, n, col) { for (let i = 0; i < n; i++) { const f = rnd(), x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f, a = Math.atan2(y - (V.CHY - 22), x - V.CHX) + (rnd() - 0.5) * 1.2, s = 40 + rnd() * 90; part(c, x, y, Math.cos(a) * s, Math.sin(a) * s - 50, 1.6 + rnd() * 0.8, { link: 1, g: 300, fl: 232 + rnd() * 30, ph: rnd() * 6, hot: col, rest: 1 }); } }
function dustP(c, n) { for (let i = 0; i < n; i++) part(c, 30 + rnd() * 420, 22 + rnd() * 3, (rnd() - 0.5) * 6, 10 + rnd() * 30, 2 + rnd(), { dust: 1, g: 24 }); }
function avalanche(c, n) { [44, 436].forEach(px => { for (let i = 0; i < n; i++) part(c, px + (rnd() - 0.5) * 30, 192 + rnd() * 6, (px < 240 ? 1 : -1) * (20 + rnd() * 40) * (rnd() < 0.5 ? 1 : -1), -10, 1.2 + rnd() * 0.6, { coin: 1, g: 200, fl: 212 + rnd() * 6, ph: rnd() * 6 }); }); }
function stepParts(c, dt) {
  const f = dt * 60;
  for (let i = c.pp.length - 1; i >= 0; i--) { const q = c.pp[i]; q.t += dt; if (q.t >= q.life) { c.pp.splice(i, 1); continue; }
    q.vx *= Math.pow(q.drag, f); q.vy *= Math.pow(q.drag, f); q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.fl && q.y > q.fl && q.vy > 0) { q.y = q.fl; q.vy *= -0.35; q.vx *= 0.55; if (Math.abs(q.vy) < 12) { q.vy = 0; q.vx *= 0.3; q.g = 0; if (q.rest && !q.rested) { q.rested = 1; q.life = Math.max(q.life, q.t + 3 + rnd() * 3); } } } }
}
const col32 = X.col32;
function partsOut(c) {
  const o = [];
  c.pp.forEach(q => { const k = q.t / q.life, x = Math.round(q.x), y = Math.round(q.y); if (k > 0.85 && ((q.t * 20) | 0) % 2) return;
    if (q.coin) { const flip = !q.rested && Math.abs(Math.sin(q.t * 11 + q.ph)) < 0.35, glint = q.rested && Math.sin(q.t * 3 + q.ph * 5) > 0.97;
      if (flip) o.push([x, y - 1, col32('gold', 9.6), 1], [x, y, col32('gold', 6.4), 1]); else o.push([x - 1, y, col32('gold', 8.4), 1], [x, y, col32('gold', glint ? 11 : 9.8), 1], [x + 1, y, col32('gold', 6.4), 1], [x, y + 1, col32('gold', 4.6), 1]); return; }
    if (q.link) { const hot = q.hot != null && q.t < 1, m = hot ? PX.QR[q.hot][0] : 'iron', t0 = hot ? PX.QR[q.hot][1] + 0.5 - q.t * 4 : 7, face = Math.sin(q.t * 9 + q.ph) > 0;
      if (face) o.push([x - 1, y - 1, col32(m, t0 + 1.4), 1], [x, y - 1, col32(m, t0 + 1), 1], [x + 1, y - 1, col32(m, t0), 1], [x - 1, y, col32(m, t0 + 0.4), 1], [x + 1, y, col32(m, t0 - 1.5), 1], [x - 1, y + 1, col32(m, t0 - 1), 1], [x, y + 1, col32(m, t0 - 2), 1], [x + 1, y + 1, col32(m, t0 - 2.4), 1]); else o.push([x, y - 1, col32(m, t0 + 1.5), 1], [x, y, col32(m, t0 + 0.6), 1], [x, y + 1, col32(m, t0 - 1), 1]); return; }
    if (q.dust) { o.push([x, y, col32('stone', 6.4 - k * 3), 1]); return; }
    o.push([x, y, col32('lamp', Math.max(2, 10 - k * 6)), 1]); });
  return o;
}
// a shockwave along the floor: flat rings and dust thrown both ways (the kit's shock, laid on the ground)
function floorShock(SH, c, col, r, y) { const x = V.CHX * K; y = y || (V.CHY + 2) * K; SH.ring(c, x, y, 16, r, col, { w: 3, life: 0.32, sq: 0.28 }); SH.ring(c, x, y, 16, r * 1.5, P.white, { w: 1, life: 0.55, delay: 0.04, sq: 0.28 });
  [0, Math.PI].forEach(a => SH.burst(c, x, y, 14, { ramp: [P.cream, P.lavender, P.haze, P.indigo], sp: [160, 380], ang: a, spread: 0.4, life: [0.3, 0.6], drag: 4, size: [1, 3] })); }

// ───────── open ─────────
// the view and key wrappers go on the outside of every other module's, the first time a chest opens
let wrapped = false;
function wrapOuter() {
  if (wrapped) return; wrapped = true;
  const oKey = G.handleKey;
  G.handleKey = function (ev) {
    const c = this.chest;
    if (c && ev && ev.type === 'keydown') { const k = ev.code || ev.key;
      if (/Enter|Space|NumpadEnter/.test(k) || (/Escape/.test(k) && (c.ph === 'claim' || c.ph === 'mwait'))) { ev.preventDefault && ev.preventDefault(); this.chestClick(null); }
      return; }
    return oKey ? oKey.apply(this, arguments) : undefined;
  };
  const oView = G.view;
  G.view = function () { const v = oView.call(this), c = this.chest; if (c) { v.fxZ = 70; v.coverOn = true; v.coverClick = (e) => this.chestClick(e); if (c.ph === 'claim' && this.tipData && v.tip) v.tipOn = true; } return v; };
}
// other modules wrap openChest to add loot (keepsakes, blueprints…); the show itself starts in chestOpen
G.openChest = function (items, col, onClose) { return this.chestOpen(items, col, onClose); };
// the mimic: the same chest in the same chains, the same wait; pressed, it breaks every chain at once and bites
G.openMimic = function (onFight) { return this.chestOpen([], '#e8434f', null, { mimic: true, onMimic: onFight }); };
G.chestOpen = function (items, col, onClose, o) {
  o = o || {}; wrapOuter(); const SH = SHW();
  const run = this.run, its = (items || []).map(it => Object.assign({}, it));
  its.forEach(it => { it.sq = qOf(it); it.kind = kindOf(it); if (it.kind === 'sup' && run && it.award) it.n = '物资 +' + Math.round(it.award.v * (run.lootMul || 1) * (1 + ((run.mods && run.mods.supplies) || 0)));
    if (it.sub && it.n && it.n.indexOf(it.sub) >= 0) it.sub = ''; });   // no second line that repeats the name (§11.1b)
  const q = its.reduce((a, it) => Math.max(a, it.sq), 0), lad = LADDER[o.mimic ? 0 : q];
  // chain beats: 0.45 s in, each gap 18 % shorter than the last
  const bt = []; let t = 0.45, iv = 0.5; for (let i = 0; i < lad.length; i++) { bt.push(t); iv *= 0.82; t += iv; }
  const shown = PX.CHAIN_SHOW.slice(0, lad.length), brk = PX.CHAIN_BREAK.filter(id => shown.includes(id));
  const c = this.chest = { t: 0, T: 0, ph: 'in', pt: 0, items: its, col: col || '#ffcc33', onClose, q, lad, bt, chT: t + 0.22, mimic: !!o.mimic, onMimic: o.onMimic,
    chains: shown.map(id => ({ id, on: true, heat: 0, col: 0 })), brk, lock: { on: true, a: 0 }, fallen: null,
    pp: [], rip: [], bi: 0, tier: 0, hov: false, hovI: -1, mx: 960, my: 540, rush: 0,
    lid: spr(0, 0, 0.2, 0.72), lift: spr(0, 0, 0.08, 0.8), push: 0,
    room: { q: 7, glow: 0, spot: 0, fire: 0, sway: 0, dark: 0, pillar: null, slit: null, beams: [], halo: { a: 0, r: 60 } }, leak: 0, tilt: { x: 0, y: 0 }, iris: 0 };
  brk.forEach((id, i) => { const ch = c.chains.find(x => x.id === id); ch.col = lad[i]; ch.at = bt[i]; });
  if (SH) SH.box(c, 0, 0, 1920, 1080);
  layout(c); snd('in'); this.bump();
};

// ───────── tick ─────────
G.chestTick = function (dtRaw) {
  const c = this.chest; if (!c) return; const SH = SHW(), rm = RM();
  const rush = c.rush > now() ? 3 : 1;
  if (SH) { SH.tick(this, c, dtRaw * rush); if (SH.frozen(c)) return; }               // hitstop: nothing moves
  const dt = dtRaw * rush * (SH ? SH.slowK(c) : 1), f = dt * 60; c.t += dt; c.T += dt; c.pt += dt;
  const R = c.room, ob = SH ? SH.obj(c, 'chest') : null;
  step(c.lid, f); step(c.lift, f); R.sway *= Math.pow(0.97, f);
  c.rip.forEach(w => { w.r += dt * (w.sp || 160); w.a -= dt * (w.fade || 1.6); }); c.rip = c.rip.filter(w => w.a > 0.02);
  stepParts(c, dt);
  // the fallen padlock: a little physics of its own, then it lies on the dais step
  const L = c.fallen; if (L && !L.rest) { L.vy += 420 * dt; L.x += L.vx * dt; L.y += L.vy * dt; if (L.y >= L.fl) { L.y = L.fl; if (Math.abs(L.vy) > 40) { L.vy *= -0.3; L.vx *= 0.5; snd('lockfall', L.b = (L.b || 0) + 1); } else { L.vy = 0; L.rest = 1; } } }
  const ph = c.ph, pt = c.pt, M0 = mouth(c);
  if (ph === 'in') {
    // the cellar comes up out of the dark (the iris opens on the dais), the key light comes on; the chest falls into it,
    // lands (thud, dust, a shock along the floor, the chains rattle), then lifts a little off the dais
    c.iris = eo(pt / 0.35); R.spot = clamp((pt - 0.18) / 0.12, 0, 1);
    if (pt >= 0.2 && pt - dt < 0.2) snd('spot');
    if (!c.fell) { c.lift.x = 300; c.lift.v = 0; }
    if (pt >= 0.3 && !c.fell) { c.fell = 1; c.lift.tg = 0; c.lift.k = 0; c.fallV = 700; }
    if (c.fell && !c.landed) { c.fallV += 900 * dt; c.lift.x = Math.max(0, c.lift.x - c.fallV * dt); c.lift.v = 0;
      if (c.lift.x <= 0) { c.landed = 1; if (ob) { ob.k = 0.84; ob.kv = 0; } snd('land'); R.sway = 0.6;
        if (SH) { floorShock(SH, c, '#a9a3c9', 300); SH.shake(c, 8); } if (!rm) { this.fx.kick(4); dustP(c, 14); }
        c.rip.push({ x: V.CHX, y: V.CHY - 4, r: 10, a: 0.8, w: 6, sp: 220 }); c.liftAt = c.T + 0.12; } }
    if (c.liftAt && c.T >= c.liftAt) { c.liftAt = 0; c.lift.tg = 3; c.lift.k = 0.08; snd('lift'); }
    if (c.landed && pt > 0.95) { c.ph = 'idle'; c.pt = 0; }
  } else if (ph === 'idle' || ph === 'mwait') {
    // it strains against its chains: a slow heave, the padlock swinging, a warm glow in the seam; hover tilts it toward
    // the pointer (the kit brightens and grows it)
    const id = SH ? SH.idle(c.T, 0) : { dy: 0 };
    c.lift.tg = 3 - id.dy / K; R.spot = 1 + (c.hov ? 0.25 : 0);
    c.lock.a = 0.12 * Math.sin(c.T * 2.1) + (c.hov ? 0.18 * Math.sin(c.T * 7) : 0);
    if (ph === 'idle') c.leak = 0.12 + 0.08 * (Math.sin(c.T * 2.2) * 0.5 + 0.5) + (c.hov ? 0.12 : 0);
    if (!rm && ph === 'idle' && rnd() < dt * 3) part(c, V.CHX + (rnd() - 0.5) * 70, mouthY(c) + 2, (rnd() - 0.5) * 6, -8 - rnd() * 8, 1.4, {});
  } else if (ph === 'charge') {
    const ch = clamp(pt / c.chT, 0, 1), tail = c.bi >= c.lad.length;
    // the next chain heats in its colour, then snaps on its beat
    c.chains.forEach(k => { if (k.on && k.at != null) k.heat = clamp(1 - (k.at - pt) / HEAT, 0, 1); });
    while (c.bi < c.lad.length && pt >= c.bt[c.bi]) this.chestSnap(c.bi++);
    c.lift.tg = 3 + ch * 10; c.push = ch * 0.06 + (tail ? 0.03 : 0);
    R.dark = tail ? 0.85 : ch * 0.4; R.spot = 1 - ch * 0.6; R.glow = 0.2 + ch * 0.6; R.halo.a = ch * 0.6 * (0.85 + 0.15 * Math.sin(c.T * 20)); R.halo.r = 50 + ch * 26;
    c.leak = clamp(0.3 + ch * 0.7 + 0.15 * Math.sin(c.T * 30), 0, 1);
    c.jit = rm ? 0 : (ch * ch * 3 * (1 + c.tier * 0.3));
    if (!rm && tail && rnd() < dt * 30) part(c, V.CHX + (rnd() - 0.5) * 90, mouthY(c) + 2, (rnd() - 0.5) * 30, -20 - rnd() * 30, 0.6, {});
    if (pt >= c.chT) { c.ph = 'stop'; c.pt = 0; this.chestFreeze(); }
  } else if (ph === 'burst' || ph === 'loot' || ph === 'claim') {
    c.lift.tg = ph === 'burst' ? 8 : 4 + Math.sin(c.T * 1.6); c.push = Math.max(0, c.push - dt * 0.4);
    R.dark = Math.max(0, R.dark - dt * 3); R.halo.a = 0.7 + 0.2 * Math.sin(c.T * 2.4); R.glow = (1.2 + c.q * 0.08) * (0.9 + 0.1 * Math.sin(c.T * 3));
    const pl = R.pillar; if (pl) { pl.top = Math.max(0, pl.top - dt * 1600); pl.w += ((20 + c.q * 3) - pl.w) * Math.min(1, dt * 6); pl.a += ((ph === 'claim' ? 0.75 : 1.05) + 0.1 * Math.sin(c.T * 5) - pl.a) * Math.min(1, dt * 5); }
    R.beams.forEach(b => { b.a += (0.9 + 0.1 * Math.sin(c.T * 4 + b.x) - b.a) * Math.min(1, dt * 8); b.h += (b.H - b.h) * Math.min(1, dt * 10); });
    if (!rm && rnd() < dt * 6) part(c, V.CHX + (rnd() - 0.5) * 14, mouthY(c), (rnd() - 0.5) * 4, -60 - rnd() * 60, 1.6, {});   // motes riding up the pillar
    if (ph === 'burst' && pt > 0.3) { c.ph = 'loot'; c.pt = 0; }
    if (c.ph === 'loot') { const Lb = c.items.length ? c.items[c.order[c.order.length - 1]] : null; if (!Lb || (Lb.land != null && c.T - Lb.land > 0.3)) { c.ph = 'claim'; c.pt = 0; c.btnAt = c.T; if (SH) SH.ambient(c, Q4[c.q]); } }
  } else if (ph === 'mimic') {
    if (pt > 0.36) { c.ph = 'mwait'; c.pt = 0; c.btnAt = c.T; }
  } else if (ph === 'out') {
    c.iris = 1 - eo((pt - 0.12) / 0.33); R.halo.a *= Math.pow(0.85, f); R.glow *= Math.pow(0.9, f);
    if (R.pillar) { R.pillar.top += dt * 1400; R.pillar.a *= Math.pow(0.9, f); } R.beams.forEach(b => { b.h *= Math.pow(0.8, f); b.a *= Math.pow(0.88, f); });
    if (pt > 0.46) { this.chest = null; c.onClose && c.onClose(); this.bump(); return; }
  }
  // loot: the floor pieces arc out and drop; the best rises up the pillar; then each pops into place
  c.items.forEach(it => { if (it.go == null) return; it.fq = clamp((c.T - it.go) / (it.floor ? 0.46 : 0.6), 0, 1); if (it.fq >= 1 && it.land == null) this.chestLand(it); });
  c.items.forEach((it, i) => { const on = i === c.hovI && c.ph === 'claim'; it.hv = clamp((it.hv || 0) + (on ? dt * 8 : -dt * 6), 0, 1); });
  // hover tilt: the oblique view follows the pointer
  const tx = c.hov && ph === 'idle' ? clamp((c.mx - 960) / 300, -1, 1) : 0, ty = c.hov && ph === 'idle' ? clamp((c.my - 700) / 200, -1, 1) : 0;
  c.tilt.x += (tx - c.tilt.x) * Math.min(1, dt * 8); c.tilt.y += (ty - c.tilt.y) * Math.min(1, dt * 8);
};

// one chain snaps — the kit's beat (a white hit, a punch, a shake a notch harder, the camera a notch closer, a ring and a
// burst; on a tier-up a whole-screen tint and a white ring) in that chain's colour, plus the chest's own: links fly and
// clatter on the floor, the lid jolts up and spits coins and light, the lanterns swing, dust falls, coins slide off the heaps
G.chestSnap = function (i) {
  const c = this.chest, R = c.room, SH = SHW(), rm = RM(), id = c.brk[i], ch = c.chains.find(k => k.id === id), tier = c.lad[i], up = tier > c.tier, col = QC[tier];
  c.tier = tier; R.q = tier; if (ch) { ch.on = false; ch.heat = 0; }
  const I = X.slots._chest && X.slots._chest.info, m = PX.chainMid(id, I) || { x: V.CHX, y: V.CHY - 24, x0: V.CHX - 40, y0: V.CHY - 30, x1: V.CHX + 40, y1: V.CHY - 10 };
  if (SH) { const b = SH.obj(c, 'chest'); b.k = 1.12; b.kv = 0; b.w = 0.7;
    SH.shake(c, 3 + i * 2 + (up ? 8 : 0)); SH.zoom(c, 0.012 + (up ? 0.02 : 0), m.x * K, m.y * K);
    SH.ring(c, m.x * K, m.y * K, 10, 80 + i * 14, col, { life: 0.4 }); SH.burst(c, m.x * K, m.y * K, 14 + i * 3, { col, sp: [160, 420], life: [0.2, 0.5], g: 300 });
    if (up) { SH.flash(c, col, 0.3); SH.ring(c, m.x * K, m.y * K, 12, 220, P.white, { life: 0.5, delay: 0.05, w: 2 }); floorShock(SH, c, col, 220 + i * 20); } }
  if (!rm) { this.fx.kick(1 + i * 0.6 + (up ? 2 : 0)); linkP(c, m.x0, m.y0, m.x1, m.y1, 14 + i * 2, tier); coinP(c, V.CHX, mouthY(c) + 2, 2 + i, { v: 70, spread: 1.2, life: 2.5 }); dustP(c, 6 + i * 3); if (i >= 2) avalanche(c, 2 + i); }
  c.lid.x = 0.16 + i * 0.035; c.lid.v = 0; c.lid.tg = 0; R.sway = Math.min(1.6, R.sway + 0.5);
  c.rip.push({ x: m.x, y: m.y, r: 8, a: 0.5 + i * 0.05, w: 6, sp: 240 });
  snd('snap', { i, tier, up });
};
// all chains gone: the lid lifts a crack and freezes there — a blade of light across the room, the chest a black shape
G.chestFreeze = function () {
  const c = this.chest, R = c.room, SH = SHW(), M0 = mouth(c);
  c.lid.x = 0.22; c.lid.v = 0; c.lid.tg = 0.22; R.dark = 0.95; R.slit = { a: 1, y: mouthY(c) + 1 }; c.dark = 1;
  snd('slit');
  if (SH) SH.hitstop(c, 0.15, M0.x, M0.y, () => this.chestBurst()); else this.chestBurst();
};
// the lid flies open: white, slow motion, shake and a camera punch by tier, a pillar of light up into the ceiling (the
// tier's colour; rainbow bands for 传说 and up), a shock along the floor, the room lit, braziers catch, coins erupt with the
// light and rain down all over the floor, dust shaken off the ceiling
G.chestBurst = function () {
  const c = this.chest; if (!c) return; const R = c.room, q = c.q, SH = SHW(), rm = RM(), M0 = mouth(c), col = QC[q], rp = SH ? SH.ramp(col) : null, q4 = Q4[q];
  c.ph = 'burst'; c.pt = 0; c.tier = q; R.q = q; c.dark = 0; R.slit = null;
  c.lid.tg = 1.95; c.lid.v = 0.35;
  if (SH) { const b = SH.obj(c, 'chest'); b.k = 0.8; b.kv = 5; b.w = 1;
    SH.white(c, 0.9); if (!rm) SH.slowmo(c, 0.3, 0.23); SH.shake(c, 10 + q4 * 5); SH.zoom(c, 0.07 + q4 * 0.03, M0.x, M0.y - 120);
    SH.ring(c, M0.x, M0.y, 10, 180, P.white, { w: 2, life: 0.45, sq: 0.5 }); SH.ring(c, M0.x, 0, 20, 260, col, { w: 2, life: 0.5, sq: 0.35, delay: 0.08 });
    floorShock(SH, c, col, 260 + q4 * 70);
    SH.burst(c, M0.x, M0.y, 50 + q * 16, { col, rainbow: q >= 4, sp: [300, 900], ang: -Math.PI / 2, spread: 0.5, life: [0.5, 1.1], g: 300, drag: 1.2, size: [1, 3] });
    SH.burst(c, M0.x, M0.y, 24, { col, sp: [60, 200], life: [0.8, 1.6], g: -40, drag: 0.8 });
    SH.flash(c, col, 0.22 + q4 * 0.08); }
  if (!rm) { this.fx.kick(8 + q4 * 5); coinP(c, V.CHX, mouthY(c), 26 + q * 12, { v: 260, spread: 0.9, life: 3 }); dustP(c, 30); avalanche(c, 6); }
  R.dark = 0.2; R.spot = 0.55; R.glow = 1.3; R.halo.a = 1; R.halo.r = 60 + q * 5; R.sway = 1.6;
  R.pillar = { a: 1.4, w: 6, top: mouthY(c), rb: q >= 4 ? 1 : 0 };
  c.leak = 1;
  c.rip.push({ x: V.CHX, y: mouthY(c), r: 10, a: 1.2, w: 9, sp: 300, fade: 1.2 });
  const later = (dt, fn) => (SH ? SH.later(c, dt, fn) : fn());
  later(0.12, () => { R.fire = 1; snd('fire'); });
  // 神话 and up: a second surge up the pillar
  if (q >= 5 && SH) later(0.55, () => { SH.white(c, 0.6); SH.shake(c, 14); SH.zoom(c, 0.05, M0.x, M0.y - 120); if (R.pillar) { R.pillar.w += 18; R.pillar.a = 1.6; } SH.burst(c, M0.x, M0.y, 70, { rainbow: 1, sp: [300, 800], ang: -Math.PI / 2, spread: 0.7, life: [0.6, 1.2], g: 200 }); SH.flash(c, P.gold, 0.35); const b = SH.obj(c, 'chest'); b.k = 1.15; b.kv = 0; if (!rm) coinP(c, V.CHX, mouthY(c), 30, { v: 280, spread: 1, life: 3 }); snd('wave2'); });
  snd('boom', q);
  // the loot, one by one, worst first; the best last, up the pillar
  c.order.forEach((ii, k) => later(0.42 + k * 0.26, () => { const it = c.items[ii]; it.go = c.T; it.fx0 = V.CHX + (it.floor ? (it.ax < V.CHX ? -12 : 12) : 0); it.fy0 = mouthY(c); snd('pop'); }));
  if (!c.items.length) later(0.5, () => { c.ph = 'claim'; c.pt = 0; c.btnAt = c.T; });
};
// an item arrives: a floor piece thuds down (dust, its own drop beam, a glow on the floor); the best settles in the pillar;
// each pops with a ring and a burst in its quality; the last one (the best) adds a gold flash, a shake and a gold ring
G.chestLand = function (it) {
  const c = this.chest, SH = SHW(), R = c.room, last = it.ord === c.items.length - 1, x = it.ax * K, y = it.ay * K, col = QC[it.sq]; it.land = c.T;
  if (SH) { SH.pop(c, 'it' + it.ord, { k0: it.floor ? 0.7 : 1.5 }); SH.ring(c, x, it.floor ? (it.ay + PX.LH / 2) * K : y, 10, 90 + it.sq * 16, col, { life: 0.4, sq: it.floor ? 0.3 : 0.9 }); SH.burst(c, x, it.floor ? (it.ay + PX.LH / 2) * K : y, 12 + it.sq * 3, { col, sp: [120, 300], life: [0.25, 0.5], ang: it.floor ? -Math.PI / 2 : undefined, spread: it.floor ? 2.4 : undefined }); SH.shake(c, it.floor ? 4 : 3);
    if (last) { SH.flash(c, P.gold, 0.2); SH.shake(c, 6); SH.ring(c, x, y, 10, 160, P.gold, { life: 0.4 }); } }
  if (it.floor) { R.beams.push({ x: it.ax, y: it.ay + PX.LH / 2, h: 4, H: 130 + it.sq * 20, q: it.sq, a: 0 }); if (!RM()) for (let k = 0; k < 6; k++) part(c, it.ax + (rnd() - 0.5) * 30, it.ay + PX.LH / 2, (rnd() - 0.5) * 40, -10 - rnd() * 20, 0.6, { dust: 1, g: 60 }); }
  snd('drop', { q: it.sq, i: it.ord, floor: it.floor ? 1 : 0 }); if (last && it.sq >= 2) snd('last');
  if (it.kind === 'coins' || it.kind === 'pouch') { it.roll = c.T; it.rv = (it.award && it.award.v) || 0; }
};

// ───────── input ─────────
function unCam(c, x, y) { const pu = c.cam; if (!pu) return { x, y }; return { x: (x - pu.sx - pu.x) / pu.k + pu.x, y: (y - pu.sy - pu.y) / pu.k + pu.y }; }
function onChest(c, x, y) { const s = X.slots._chest, I = s && s.info; if (!I) return false; const p = unCam(c, x, y), ax = p.x / K, ay = p.y / K; return ax >= I.x0 - 2 && ax <= I.x1 + 2 && ay >= I.y1 - (I.top + 18) && ay <= I.y1 + 2; }
function itemAt(c, x, y) { const p = unCam(c, x, y), ax = p.x / K, ay = p.y / K; return c.items.findIndex(it => it.land != null && Math.abs(ax - it.ax) < PX.LW / 2 && Math.abs(ay - it.ay) < PX.LH / 2 + 4); }
const BTN = { x: 960 - 140, y: 948, w: 280, h: 76 };
const onBtn = (x, y) => x >= BTN.x && x <= BTN.x + BTN.w && y >= BTN.y - 6 && y <= BTN.y + BTN.h + 9;
G.chestClick = function (e) {
  const c = this.chest; if (!c) return; const SH = SHW();
  const p = e && e.clientX != null && this.miniPt ? this.miniPt(e.clientX, e.clientY) : null, x = p ? p.x : null, y = p ? p.y : null;
  if (c.ph === 'idle') { if (!p || onChest(c, x, y)) return this.chestPress(x, y); return this.chestTap(x, y); }
  if (c.ph === 'mwait') { if (!p || onBtn(x, y)) return this.chestFight(); return this.chestTap(x, y); }
  if (c.ph === 'claim') { if (!p || onBtn(x, y)) return this.chestClaim(); const i = itemAt(c, x, y);
    if (i >= 0) { const it = c.items[i]; if (SH) SH.press(this, c, 'it' + it.ord, x, y, QC[it.sq]); snd('itemTap', it.sq); return; }
    return this.chestTap(x, y); }
  // anything still playing: a click hurries it (never past the result)
  if (c.ph !== 'out') { if (!(c.rush > now())) snd('rush'); c.rush = now() + 1200; if (p && SH) SH.tap(this, c, x, y); }
};
// a tap on nothing: the kit's ripple, burst and click; the chest heaves, the chains rattle
G.chestTap = function (x, y) { const c = this.chest, SH = SHW(); if (!c || x == null) return; if (SH) SH.tap(this, c, x, y); c.lift.v += 0.8; c.room.sway = Math.min(1.6, c.room.sway + 0.2); const a = unCam(c, x, y); c.rip.push({ x: a.x / K, y: a.y / K, r: 3, a: 0.6, w: 5, sp: 140 }); };
// the press: the padlock springs open and drops off the hasp; the chest recoils; then the chains start going
G.chestPress = function (x, y) {
  const c = this.chest, SH = SHW(); if (!c || c.ph !== 'idle') return; const rm = RM(); c.hov = false;
  if (SH) { SH.hover(this, c, 'chest', false); SH.press(this, c, 'chest', x != null ? x : 960, y != null ? y : 820, P.gold); } if (!rm) this.fx.kick(2);
  const I = X.slots._chest && X.slots._chest.info, lx = I ? I.x0 + I.W / 2 : V.CHX, ly = I ? I.y1 - I.top + 20 : V.CHY - 20;
  c.lock.on = false; c.fallen = { x: lx, y: ly, vx: (rnd() < 0.5 ? -1 : 1) * (30 + rnd() * 20), vy: -90, fl: 238 + rnd() * 4 };
  if (SH) SH.burst(c, lx * K, (ly - 10) * K, 12, { col: P.gold, sp: [120, 320], life: [0.2, 0.4], size: [1, 2] });
  snd('unlock');
  if (c.mimic) { c.ph = 'mimic'; c.pt = 0; if (SH) SH.later(c, 0.07, () => this.chestMimic()); else this.chestMimic(); return; }
  c.ph = 'charge'; c.pt = 0; c.bi = 0; snd('riser', c.chT);
};
// the mimic: every chain bursts at once, the lid snaps open on teeth, red flash, a lunge, a growl — over in one beat
G.chestMimic = function () {
  const c = this.chest; if (!c) return; const R = c.room, SH = SHW(), M0 = mouth(c), rm = RM(), I = X.slots._chest && X.slots._chest.info;
  c.chains.forEach(k => { if (!k.on) return; k.on = false; const m = PX.chainMid(k.id, I); if (m && !rm) linkP(c, m.x0, m.y0, m.x1, m.y1, 14, 5); });
  c.lid.x = 0.95; c.lid.tg = 0.95; c.lid.v = 0; c.mim = 1; R.q = 5; R.glow = 1.1; R.dark = 0.45; R.spot = 0.4; R.sway = 1.6; c.leak = 0;
  if (SH) { const b = SH.obj(c, 'chest'); b.k = 1.18; b.kv = 0; b.w = 0.6; SH.flash(c, '#e8434f', 0.45); SH.shake(c, 12); SH.zoom(c, 0.07, M0.x, M0.y); SH.ring(c, M0.x, M0.y, 10, 260, '#e8434f', { w: 2, life: 0.35 }); SH.burst(c, M0.x, M0.y, 26, { col: '#e8434f', sp: [150, 420], life: [0.2, 0.4] }); SH.stamp(c, '宝箱怪！', 960, 170, '#e8434f', 110, 1e4); }
  if (!rm) dustP(c, 20);
  c.rip.push({ x: V.CHX, y: V.CHY - 40, r: 10, a: 0.9, w: 8, sp: 300 });
  snd('mimic');
};
G.chestFight = function () { const c = this.chest; if (!c) return; snd('fight'); this.chest = null; c.onMimic && c.onMimic(); this.bump(); };
G.chestClaim = function () {
  const c = this.chest; if (!c || c.ph !== 'claim') return; const SH = SHW(); c.ph = 'out'; c.pt = 0; c.btnDown = now(); this.tipData = null; if (SH) SH.ambient(c, null);
  c.lid.tg = 0; c.lid.k = 0.3; if (SH) SH.later(c, 0.1, () => { snd('close'); const b = SH.obj(c, 'chest'); b.k = 0.86; b.kv = 0; SH.shake(c, 4); });
  // each item flies from where it lies to its counter (the counter bumps when it lands)
  c.items.forEach((it, i) => { if (!it.award) return; const pu = c.cam || { x: 0, y: 0, k: 1, sx: 0, sy: 0 }, sx = (it.ax * K - pu.x) * pu.k + pu.x + pu.sx, sy = (it.ay * K - pu.y) * pu.k + pu.y + pu.sy; it.gone = c.T; const go = () => this.award([it.award], { x: sx, y: sy }); if (SH) SH.later(c, 0.04 * i, go); else go(); });
  snd('claim');
};
// the hover card for a piece of loot: its name in its colour, what kind of thing it is, one line on what it does
function tipOf(it) {
  const a = it.award || {}, I = a.k === 'bp' && M.itemInfo ? M.itemInfo(a.key) : null, c = it.kind === 'coins' || it.kind === 'pouch' ? '#ffcf4a' : it.kind === 'sup' ? '#f4efe0' : QC[it.sq];
  const d = a.k === 'wallet' ? '这一局的钱，在夜市和奇遇里花。' : a.k === 'rsup' ? '撤离或通关后带回基地，建造和挖掘要用。' : (I && I.d) || '';
  return { title: it.n, c, kind: it.sub || (I && I.kind) || '', d };
}
G.chestHover = function (e) {
  const c = this.chest, SH = SHW(); if (!c || !e || e.clientX == null || !this.miniPt) return; const p = this.miniPt(e.clientX, e.clientY); c.mx = p.x; c.my = p.y;
  if (c.ph === 'idle') { const h = onChest(c, p.x, p.y); if (h && !c.hov) snd('rattle'); c.hov = h; if (SH) SH.hover(this, c, 'chest', c.hov); }
  if (c.ph === 'claim') { const i = itemAt(c, p.x, p.y); if (SH && i !== c.hovI) { if (c.hovI >= 0) SH.hover(this, c, 'it' + c.items[c.hovI].ord, false); if (i >= 0) SH.hover(this, c, 'it' + c.items[i].ord, true); }
    if (i !== c.hovI) { this.tipData = i >= 0 ? tipOf(c.items[i]) : null; this.bump(); } else if (i >= 0) this.tipMoved = true; c.hovI = i; c.btnHov = onBtn(p.x, p.y); }
  if (c.ph === 'mwait') c.btnHov = onBtn(p.x, p.y);
};
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pointermove', (e) => { const g = M._g || window.__mcg; if (g && g.chest) g.chestHover(e); }, true);

// ───────── draw ─────────
const TC = document.createElement('canvas'); TC.width = AW; TC.height = AH;
const LC = {}; const lootCv = (k) => { if (!LC[k]) { LC[k] = document.createElement('canvas'); LC[k].width = PX.LW; LC[k].height = PX.LH; } return LC[k]; };
const blit = (cv, px, w, h) => { cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px.buffer, px.byteOffset, w * h * 4), w, h), 0, 0); };
// a name plate in the loot's quality: an ink plate with a coloured top edge, the name, and what it is under it
function plate(ctx, x, y, name, sub, col) {
  const w1 = U.measure ? U.measure(ctx, name, 28) : name.length * 28, w2 = sub ? (U.measure ? U.measure(ctx, sub, 20) : sub.length * 20) : 0, w = Math.round(Math.max(w1, w2) + 28), h = sub ? 70 : 44, X0 = Math.round(x - w / 2), Y0 = Math.round(y);
  ctx.save(); ctx.globalAlpha *= 0.86; ctx.fillStyle = U.pal ? U.pal(P.ink) : '#07060f'; ctx.fillRect(X0, Y0, w, h); ctx.restore();
  ctx.fillStyle = U.pal ? U.pal(col) : col; ctx.fillRect(X0, Y0, w, 4); ctx.fillStyle = U.pal ? U.pal(P.night || '#1a1640') : '#1a1640'; ctx.fillRect(X0, Y0 + h - 4, w, 4);
  U.text(ctx, name, Math.round(x), Y0 + 24, 28, col, { shadow: true }); if (sub) U.text(ctx, sub, Math.round(x), Y0 + 52, 20, P.lavender || '#a9a3c9', { shadow: false });
}
M.drawChest = function (ctx, c) {
  if (!c) return; const R = c.room, rm = RM(), SH = SHW(), s = SH ? SH.state(c) : null, hit = !!(s && s.hit > 0);
  const xf = SH ? SH.xf(c, 'chest') : { k: 1, white: 0 }, k = xf.k;
  const sx = 0.3 + c.tilt.x * 0.16, ky = 0.33 - c.tilt.y * 0.06, jit = c.ph === 'charge' && c.jit ? Math.round((rnd() - 0.5) * c.jit) : 0;
  const ch = { lid: Math.max(0, c.lid.x), w: 1 + (1 - k) * 0.6, h: k, sx, ky, q: c.ph === 'idle' || c.ph === 'in' ? 7 : c.tier, leak: c.leak, wt: Math.min(1, xf.white), dark: hit && c.dark, heap: 1, mimic: c.mim || 0, lift: Math.max(0, c.lift.x) + (jit ? rnd() - 0.5 : 0), chains: c.chains, lock: c.lock.on ? c.lock : null };
  // the vault redraws every frame while things move fast; at rest (waiting, the loot on show) and on touch devices every
  // other frame (the pixel art keeps its look at 30 Hz; the camera, shake and the kit's effects stay at full rate)
  const calm = c.ph === 'idle' || c.ph === 'claim' || c.ph === 'mwait' || M.LOW_FX; c.fr = (c.fr || 0) + 1;
  if (!calm || c.fr % 2 || !c.drawn || hit) { const px = X.pixels('_chest_vault', c.T, { ch, room: Object.assign({}, R, { rip: c.rip }), pp: partsOut(c), lock: c.fallen }, '_chest'); blit(TC, px, AW, AH); c.drawn = 1; }
  ctx.save(); ctx.imageSmoothingEnabled = false;
  // on the way in the map fades to black and the cellar opens out of it; on the way out the circle closes on the chest over the map
  if (c.ph === 'in') { ctx.fillStyle = P.ink; ctx.globalAlpha = clamp(c.pt / 0.12, 0, 1); ctx.fillRect(0, 0, 1920, 1080); ctx.globalAlpha = 1; }
  // camera: the kit's push (beats, burst punch, shake on the 4-px grid) and the charge's slow lean toward the chest
  const M0 = mouth(c), pu = (SH && SH.push(c)) || { x: M0.x, y: M0.y, k: 1, sx: 0, sy: 0 }; pu.k *= rm ? 1 : 1 + c.push; c.cam = pu;
  ctx.save();
  if (c.iris < 0.999) { ctx.beginPath(); ctx.arc(V.CHX * K, (V.CHY - 30) * K, Math.max(0, c.iris) * 1300, 0, Math.PI * 2); ctx.clip(); }
  ctx.translate(pu.x + pu.sx + jit * K, pu.y + pu.sy); ctx.scale(pu.k, pu.k); ctx.translate(-pu.x, -pu.y);
  ctx.drawImage(TC, 0, 0, AW * K, AH * K);
  // the loot: floor pieces arc out and drop, the best rises straight up the pillar
  c.items.forEach((it, i) => {
    if (it.go == null) return; const fq = it.fq || 0, ld = it.land != null ? c.T - it.land : -1, ix = SH ? SH.xf(c, 'it' + it.ord) : { k: 1, white: 0 };
    let x, y, sc;
    if (it.floor) { const e = fq; x = it.fx0 + (it.ax - it.fx0) * e; y = it.fy0 + (it.ay - it.fy0) * e - Math.sin(e * Math.PI) * (70 + Math.abs(it.ax - V.CHX) * 0.25); sc = fq < 1 ? 0.55 + 0.45 * e : ix.k; }
    else { const e = eo(fq); x = it.ax; y = it.fy0 + (it.ay - it.fy0) * e; sc = fq < 1 ? 0.5 + 0.5 * e : ix.k; if (ld > 0.5 && !rm) y += Math.round(Math.sin(c.T * 2) * 1.5); }
    y -= (it.hv || 0) * 2;
    ctx.globalAlpha = c.ph === 'out' && it.gone != null ? 1 - clamp((c.T - it.gone) / 0.12, 0, 1) : 1;
    const cv = lootCv(it.kind + i), lp = X.pixels('_loot_' + it.kind, c.T + i, { q: it.sq, glow: 1, wt: Math.max(ix.white, ld >= 0 && ld < 0.12 ? 1 - ld / 0.12 : 0) }, '_loot' + i); blit(cv, lp, PX.LW, PX.LH);
    const w = PX.LW * K * sc, h = PX.LH * K * sc; ctx.drawImage(cv, Math.round(x * K - w / 2), Math.round(y * K - (it.floor ? h - PX.LH * K / 2 : h / 2)), Math.round(w), Math.round(h));
    // the name plate (积分 rolls up)
    if (ld >= 0) { ctx.globalAlpha *= clamp(ld / 0.12, 0, 1);
      let name = it.n; if (it.roll != null) { const p = clamp((c.T - it.roll) / 0.8, 0, 1), v = Math.round(it.rv * (1 - Math.pow(1 - p, 2.2))); name = (it.kind === 'pouch' ? '积分 +' : '积分 ') + (M.fmt ? M.fmt(v) : v); const tk = (c.T * 30) | 0; if (p < 1 && tk !== it.rt) { it.rt = tk; if (tk % 2) snd('roll', p); } }
      const nc = it.kind === 'coins' || it.kind === 'pouch' ? '#ffcf4a' : it.kind === 'sup' ? '#f4efe0' : QC[it.sq];
      plate(ctx, it.ax * K, it.floor ? (it.ay - PX.LH / 2 - 2) * K - (it.sub ? 70 : 44) : (it.ay + PX.LH / 2 + 3) * K, name, it.sub, nc); }
    ctx.globalAlpha = 1;
  });
  // the kit's layer: particles, rings, shocks, flashes, stamps (its hitstop look is the chest's own: the blade of light)
  if (s) { const h0 = s.hit; s.hit = 0; SH.drawAll(ctx, c); s.hit = h0; }
  ctx.restore();
  // the idle pointer: a gold arrow bobbing over the chest, and the key that also opens it
  if (c.ph === 'idle' && c.pt > 0.9 && !c.hov) { const b = rm ? 0 : Math.round(Math.abs(Math.sin(c.T * 4)) * 3) * K, ax = 960, ay = (V.CHY - 74 - c.lift.x) * K - b;
    ctx.fillStyle = P.ink; ctx.beginPath(); ctx.moveTo(ax - 28, ay - 28); ctx.lineTo(ax + 28, ay - 28); ctx.lineTo(ax, ay + 4); ctx.fill(); ctx.fillStyle = P.gold; ctx.beginPath(); ctx.moveTo(ax - 20, ay - 20); ctx.lineTo(ax + 20, ay - 20); ctx.lineTo(ax, ay - 4); ctx.fill(); ctx.fillStyle = P.butter; ctx.fillRect(ax - 16, ay - 20, 12, 4);
    U.key && U.key(ctx, '空格', ax + 44, ay - 44, { size: 22 }); }
  // the claim key (收下) / the fight key (迎战)
  if ((c.ph === 'claim' || c.ph === 'mwait' || (c.ph === 'out' && now() - c.btnDown < 180)) && c.btnAt != null) {
    const a = clamp((c.T - c.btnAt) / 0.18, 0, 1), dy = Math.round((1 - eb(a)) * 15) * K, fight = c.ph === 'mwait';
    ctx.globalAlpha = a; U.btn(ctx, fight ? '迎战' : '收下', BTN.x, BTN.y + dy, BTN.w, BTN.h, { kind: fight ? 'red' : 'gold', size: 38, state: c.ph === 'out' ? 'down' : c.btnHov ? 'hover' : '' }); ctx.globalAlpha = 1;
    U.key && U.key(ctx, '空格', BTN.x + BTN.w + 24, BTN.y + 14 + dy, { size: 22 }); }
  ctx.restore();
};

// ───────── sound: every beat on the audio clock, F major (docs/design.md §10.2 宝箱) ─────────
// the kit plays press / hover / hit / tap; these are the chest's: a low thud and a clink of chains on landing, the padlock
// springing and clanking down, each chain a metal snap with the wood of the chest knocking and links pattering on the
// stone (climbing, brighter on a tier-up), a high blade of sound on the frozen frame, the pillar as a swell with the
// six-note harp run landing on a glockenspiel chord (bigger by tier), each piece of loot a thud and one note up the chord
(function sounds() {
  const A = S && S._p, IN = S && S.inst; if (!A || !IN || !S.MINI) return;
  const { tone, nz, thud, ring, riser, whoosh, deg, mtof, duck, grp, cut, choir, brass, timp, coins } = A;
  let rg = null; const F = (i) => deg(i);
  const clinks = (t, n, spread, pk) => { for (let k = 0; k < n; k++) ring(t + Math.random() * spread, 2400 + Math.random() * 1800, .08, pk * (0.6 + Math.random() * 0.4), { parts: [[1, 1], [2.7, .4]] }); };
  S.MINI.chest = {
    in: (t) => { whoosh(t, .45, 140, 700, .05); nz(t, .7, 'lowpass', 160, .7, .14, { a: .08 }); },
    spot: (t) => { thud(t, 90, 60, .08, .12); nz(t, .05, 'bandpass', 1800, 2, .05); },
    land: (t) => { thud(t, 120, 52, .24, .34); nz(t, .09, 'lowpass', 650, .8, .18); clinks(t + .03, 6, .25, .03); },
    lift: (t) => { clinks(t, 3, .15, .02); nz(t, .3, 'bandpass', 500, 3, .03, { to: 800 }); },
    rattle: (t) => clinks(t, 4, .12, .025),
    unlock: (t) => { ring(t, 1900, .12, .06, { parts: [[1, 1], [2.4, .5], [4.1, .2]] }); thud(t + .02, 200, 90, .06, .12); nz(t, .04, 'highpass', 3000, .7, .1); },
    lockfall: (t, b) => { const k = 1 / (b || 1); thud(t, 180 * (0.8 + k * 0.2), 80, .06, .16 * k); ring(t, 1400, .1, .05 * k, { parts: [[1, 1], [2.9, .5]] }); },
    riser: (t, d) => { cut(rg, t); rg = grp(); const g = rg, dd = d || 1.5; riser(t, t + dd, 180, 2600, .05, { dest: g }); tone(t, 'triangle', 55, dd, .12, { to: 330, dest: g, a: .05 }); },
    snap: (t, o) => { o = o || {}; const i = o.i | 0, tier = o.tier | 0; nz(t, .05, 'highpass', 2800, .7, .22); ring(t, 1300 + i * 120, .18, .07, { parts: [[1, 1], [2.3, .6], [3.9, .3]] }); thud(t, 170, 45, .16, .38); nz(t, .12, 'lowpass', 420, .8, .3);
      clinks(t + .12, 5 + i, .45, .03); IN.harp(t + .02, F(7 + tier * 2 + i), .4, .5);
      if (o.up) { for (let k = 0; k < 6; k++) IN.glock(t + .06 + k * .035, F(10 + tier * 2 + k), .3, .4); nz(t, .3, 'highpass', 6000, .7, .1); } },
    slit: (t) => { cut(rg, t, .01); rg = null; ring(t, 3800, .3, .05, { parts: [[1, 1], [1.5, .4]] }); nz(t, .15, 'highpass', 7000, .7, .08); },
    boom: (t, q) => { q = q | 0; duck(t, .45, 1.6 + q * .2); nz(t, 1.1, 'lowpass', 700, .7, .5); riser(t, t + .5, 300, 5000, .06); tone(t, 'triangle', 260, .6, .4, { to: 28 }); if (coins) coins(t + .1, 10 + q * 2, .03, { gap: .03 });
      [0, 2, 3, 5, 7, 10].map(k => F(5 + k)).forEach((m, i) => IN.harp(t + .08 + i * .06, m, .8, .7));
      const e = t + .08 + 6 * .06, top = F(15); IN.glock(e, top, 1.2, .8); IN.glock(e, top - 12, 1.2, .5); IN.glock(e + .01, F(12), 1.2, .5);
      if (q >= 2) [F(10), F(12), F(14)].forEach(m => IN.vibes(e, m, 1.4, .5));
      if (q >= 3) choir(e, [F(5), F(7), F(10)], 1.6, .06);
      if (q >= 4) { [F(10), F(12), F(15)].forEach((m, k) => IN.trumpet(e + .02 + k * .09, m, .5, .45)); IN.churchBell(e + .3, F(0), 2.5, .4); }
      if (q >= 5) { timp(e, F(-5), .35); if (IN.choirOo) IN.choirOo(e + .2, [F(10), F(12), F(15)], 1.8, .5); }
      if (q >= 6 && IN.supersaw) IN.supersaw(e + .1, [F(10), F(12), F(15)], 1.2, .35); },
    fire: (t) => { whoosh(t, .35, 300, 2400, .06); nz(t + .05, .8, 'highpass', 1500, .7, .05, { src: 'crk', a: .1 }); },
    pop: (t) => whoosh(t, .14, 600, 3000, .04),
    drop: (t, o) => { o = o || {}; const q = o.q | 0, m = F(9 + 2 * (o.i | 0)); if (o.floor) { thud(t, 150, 60, .1, .22); nz(t, .06, 'lowpass', 900, .8, .12); }
      [() => IN.marimba(t, m, .5, .8), () => IN.marimba(t, m, .5, .9), () => IN.vibes(t, m, .8, .75), () => IN.glock(t, m + 12, .8, .7), () => { IN.glock(t, m + 12, 1, .75); IN.churchBell(t, m - 12, 2.5, .35); }, () => { IN.glock(t, m + 12, 1, .8); IN.churchBell(t, m - 12, 2.5, .4); IN.vibes(t, m, 1, .5); }, () => { IN.glock(t, m + 12, 1, .8); IN.churchBell(t, m - 12, 3, .45); brass(t + .05, m, .6, .05); }][Math.min(6, q)](); },
    last: (t) => { const f = mtof(F(17)); ring(t + .05, f, .5, .05); ring(t + .1, f * 1.5, .6, .035); },
    roll: (t, p) => tone(t, 'p25', mtof(F(10 + Math.round((p || 0) * 9))), .04, .03, { crush: 1 }),
    wave2: (t) => { [F(15), F(17), F(19), F(20), F(22)].forEach((m, i) => IN.glock(t + i * .05, m, .4, .5)); nz(t, .4, 'lowpass', 800, .7, .3); },
    itemTap: (t, q) => IN.glock(t, F(12 + (q | 0)), .3, .4),
    rush: (t) => whoosh(t, .12, 900, 3000, .03),
    claim: (t) => whoosh(t, .25, 300, 2400, .06),
    close: (t) => { thud(t, 130, 55, .18, .3); nz(t, .06, 'bandpass', 900, 1.4, .14); },
    mimic: (t) => { duck(t, .5, .8); clinks(t, 12, .3, .04); thud(t, 110, 40, .25, .45); nz(t, .12, 'highpass', 2500, .7, .22); tone(t + .04, 'sawtooth', 92, .55, .09, { to: 70, lp: 700, vib: [23, 60, .02] }); brass(t + .05, F(-3), .4, .05); brass(t + .05, F(-3) + 1, .4, .045); },
    fight: (t) => { timp(t, F(-5), .3); brass(t, F(0), .35, .05); },
  };
})();
// the cellar takes ~0.25 s to prepare the first time: do it while the map is up, not when the chest opens
let warm = false;
const oEW = G.enterWorld;
if (oEW) G.enterWorld = function () { if (!warm) { warm = true; setTimeout(() => { try { X.pixels('_chest_vault', 0, {}, '_chest_warm'); } catch (e) {} }, 1500); } return oEW.apply(this, arguments); };
M.CHEST_SHOW = { qOf, kindOf, LADDER, QC };
})();
