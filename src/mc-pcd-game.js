// ==== mc-pcd-game.js ====
(function () {
// The redrawn pixel cast in the game (source in pcd/, packed into mc-pcd.js by node tools/pcd-pack.mjs). Every character with a
// new module is drawn by it; everything else (NPCs) still goes through px16.
// - Body: one "body engine" per character draws and caches frames by state: idle, move and hurt in battle, plus every UI
//   picture (cards, rosters, map walker, raids, night-market cards).
// - Actions: attack, skill, death, revive and the leader's off-field skill borrow an "action engine" for that unit and load the
//   module with the dummy placed at the real target distance, so the module's own poses, shots, effects and death pieces land
//   on the real target. They are drawn on a transparent stage anchored at the unit's feet (mirrored for enemies); keyframe
//   sounds go to M.Sfx.charFx.
// - Old visuals are switched off for these characters: px16 cast particles and skill sounds, vector shot sprites, melee slash
//   streaks, the white death silhouette and the generic attack sound. Gameplay (timing, damage, shot flight) is unchanged.
const M = window.MC, PCD = window.PCD, P16 = M.P16;
if (!PCD || !PCD.createEngine || !P16) return;
const ART = P16.ART || 4;
const has = (k) => !!k && PCD.has(k);
const keyOf = (e) => e && e.hd && e.hd.key;
const isP = (e) => has(keyOf(e));
const HAS_DOM = typeof document !== 'undefined' && !!document.createElement;
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const TINT = { '#ffffff': 0xffffffff, '#ff4a4a': 0xff4a4aff, '#ff4a3a': 0xff3a4aff, '#3a2c48': 0xff482c3a, '#2a2632': 0xff32262a };
const tintVal = (t) => { if (!t) return 0; if (TINT[t]) return TINT[t]; const n = parseInt(t.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0; };

// ───────── body: one engine per character, cached frames ─────────
const bodies = new Map();
function body(key) {
  let b = bodies.get(key); if (b) return b;
  // the strike time comes from the module's own swing / shoot / hit event: simulate the attack once (cheap: 0.75 s at 60 Hz)
  let strike = null;
  const eng = PCD.createEngine({ game: true, out: { sfx: (ev, x) => { if (strike == null && (ev === 'swing' || ev === 'shoot' || ev === 'hit')) strike = x.t; } } });
  eng.load(key);
  b = { key, eng, HX: eng.HX, dur: eng.dur.slice(), cache: new Map(), strike: 2 / 12, top: 24, w: 20 };
  try { eng.enter('attack'); eng.skip(b.dur[2] || 0.75); if (strike != null) b.strike = Math.max(1 / 12, strike); } catch (err) { /* keep the default strike frame */ }
  eng.load(key);
  const h = eng.pose('idle', 0), bb = bboxOf(h.out, h.w, h.h); if (bb) { b.top = h.oy - bb.y0 + 1; b.w = bb.x1 - bb.x0 + 1; }
  b.nIdle = Math.max(1, Math.ceil(b.dur[0] * 12 - 1e-6)); b.nHurt = Math.max(1, Math.ceil(b.dur[6] * 12 - 1e-6));
  bodies.set(key, b); return b;
}
function bboxOf(o, w, h) { let x0 = w, y0 = h, x1 = -1, y1 = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (o[y * w + x] !== 255) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return x1 < 0 ? null : { x0, y0, x1, y1 }; }
// palette-index buffer -> canvas (1 art px = 1 px); tint fills the whole silhouette (hit flash, rage, fallen in a raid, closed map node)
function paint(o, w, h, lut, tint, x0, y0, x1, y1) {
  x0 = x0 || 0; y0 = y0 || 0; x1 = x1 == null ? w - 1 : x1; y1 = y1 == null ? h - 1 : y1;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, cv = mkCanvas(cw, ch), cx = cv.getContext('2d'), im = cx.createImageData(cw, ch), px = new Uint32Array(im.data.buffer), tv = tintVal(tint);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const c = o[(y + y0) * w + x + x0]; if (c !== 255) px[y * cw + x] = tv || lut[c]; }
  cx.putImageData(im, 0, 0); cv._img = im; return cv;
}
// frame fi (12 fps) of a body state; scale = logical px per art px (4 in battle, 8 for giant bosses)
function bodyFrame(key, st, fi, tint, scale) {
  const b = body(key), k = scale || ART, ck = st + '|' + fi + '|' + (tint || '') + '|' + k;
  let c = b.cache.get(ck); if (c) return c;
  const h = b.eng.pose(st, fi / 12), P = b.eng.C.P;
  c = M.asPx(paint(h.out, h.w, h.h, b.eng.lut, tint), k);
  c.cx = h.ox * k; c.footY = h.oy * k; c.focus = [P.gx * k, P.gy * k]; c.S = b.top * k; c.artW = h.w; c.artH = h.h;
  if (b.cache.size > 400) b.cache.clear();
  b.cache.set(ck, c); return c;
}
// old px16 state + frame number -> new state + 12 fps frame (UI, raids and cards still ask with the old slow frame clocks)
function mapPose(b, st, f) {
  f = f || 0;
  if (st === 'walk') return ['move', ((f % 4) + 4) % 4 * 2];
  if (st === 'atk') return ['attack', f <= 0 ? 0 : f === 1 ? Math.round(b.strike * 12) : Math.round(b.strike * 12) + 3];
  if (st === 'charge') return ['charge', 8 + (f & 1) * 3];
  if (st === 'cast') return ['cast', f ? 3 : 1];
  if (st === 'recover') return ['recover', 2];
  if (st === 'hurt') return ['hurt', 5];
  if (st === 'dead') return ['hurt', 6];
  return ['idle', ((f * 5) % b.nIdle + b.nIdle) % b.nIdle];
}

// UI picture at any height H: integer upscale, cropped to the drawn pixels plus 1; same fields as px16's P16.img
const oImg = P16.img, ui = new Map();
P16.img = function (key, st, f, tint, H) {
  if (!has(key) || !HAS_DOM) return oImg.apply(this, arguments);
  const b = body(key), k = Math.max(1, Math.round((H || b.top * 3) / b.top)), [s2, fi] = mapPose(b, st, f), ck = key + '|' + s2 + '|' + fi + '|' + (tint || '') + '|' + k;
  let c = ui.get(ck); if (c) return c;
  const h = b.eng.pose(s2, fi / 12), P = b.eng.C.P, bb = bboxOf(h.out, h.w, h.h) || { x0: 0, y0: 0, x1: h.w - 1, y1: h.h - 1 };
  const x0 = Math.max(0, bb.x0 - 1), y0 = Math.max(0, bb.y0 - 1), x1 = Math.min(h.w - 1, bb.x1 + 1), y1 = Math.min(h.h - 1, bb.y1 + 1);
  c = M.asPx(paint(h.out, h.w, h.h, b.eng.lut, tint, x0, y0, x1, y1), k);
  c.footY = (h.oy - y0) * k; c.cx = (h.ox - x0) * k; c.S = b.top * k; c.focus = [P.gx * k, P.gy * k];
  if (ui.size > 3000) ui.clear(); ui.set(ck, c); return c;
};
const oFrame = P16.frame;
P16.frame = function (key, st, f, o) {
  if (!has(key) || !HAS_DOM) return oFrame.apply(this, arguments);
  const b = body(key), [s2, fi] = mapPose(b, st, f); return bodyFrame(key, s2, fi, o && o.tint);
};

// ───────── actions: borrow an engine, load the module at the real target distance ─────────
const pool = [];
const STAGE_W = 400;
function borrow() {
  let g = pool.pop(); if (g) return g;
  const c = {};
  g = PCD.createEngine({ game: true, W: STAGE_W, out: { sfx: (ev, x) => onSfx(c, ev, x), shake: (t, a) => onShake(c, t, a), allies: () => alliesOf(c) } });
  g._c = c; g._cv = {}; return g;
}
function giveBack(g) { g._c.b = g._c.e = null; if (pool.length < 48) pool.push(g); }
function startAction(b, e, kind, o) {
  o = o || {}; const key = keyOf(e), bd = body(key);
  stopAction(e);
  const g = borrow(), c = g._c; c.b = b; c.e = e; c.kind = kind;
  const tg = o.tg || (e.target && e.target.alive ? e.target : null);
  const dist = tg ? Math.abs(tg.x - e.x) / ART : o.dist != null ? o.dist : 64;
  g.load(key, { dummyX: bd.HX + Math.max(8, Math.min(STAGE_W - bd.HX - 40, Math.round(dist))) });
  g.enter(kind === 'skill' ? 'charge' : kind);
  if (o.skip) g.skip(o.skip);
  e._pa = { g, kind, speed: o.speed || 1, big: (e.sz || 1) >= 1.6 ? 2 : 1 };
  return e._pa;
}
function stopAction(e) { if (e && e._pa) { giveBack(e._pa.g); e._pa = null; } }
// stage -> canvas: only the used width (dummy x + 40) is converted; each engine keeps one canvas per scale
function stageCanvas(pa) {
  const g = pa.g, fb = g.render(), W = g.W, H = g.H, k = ART * pa.big, xMax = Math.min(W, g.DUMMY_X + 40);
  let s = g._cv[k];
  if (!s) { const cv = mkCanvas(W, H), cx = cv.getContext('2d'), im = cx.createImageData(W, H); s = g._cv[k] = { cv: M.asPx(cv, k), cx, im, px: new Uint32Array(im.data.buffer) }; }
  const lut = g.lut, px = s.px; px.fill(0);
  for (let y = 0; y < H; y++) { const r = y * W; for (let x = 0; x < xMax; x++) { const v = fb[r + x]; if (v !== 255) px[r + x] = lut[v]; } }
  s.cx.putImageData(s.im, 0, 0);
  const cv = s.cv, P = g.C.P; cv.cx = g.HX * k; cv.footY = g.HY * k; cv.focus = [(P.gx + (P.mx || 0)) * k, P.gy * k]; cv.S = body(g.C.key).top * k;
  return cv;
}

// sound: the action engine's keyframe events -> M.Sfx.charFx (hit and hurt sounds stay with the game so nothing doubles)
const SFX_PASS = { swing: 1, shoot: 1, charge: 1, release: 1, impact: 1, fall: 1 };
function onSfx(c, ev, x) {
  const S = M.Sfx; if (!S || !S.charFx || !c.e) return;
  if (!SFX_PASS[ev] && !(ev === 'step' && c.e.isHero)) return;
  try { S.charFx(ev, Object.assign({}, x, { pan: S.panX ? S.panX(c.e.x) : 0 })); } catch (err) { /* a sound error never breaks the picture */ }
}
// screen shake only for skills and the leader's off-field skill (plain attacks would shake all the time)
function onShake(c, t, a) { if (c.b && (c.kind === 'skill' || c.kind === 'off')) c.b.shake = Math.max(c.b.shake || 0, a * 4); }
// allies in stage coordinates (targets of aura links, heals, shield marks); an enemy's stage is mirrored
function alliesOf(c) {
  const b = c.b, e = c.e; if (!b || !e) return [];
  const dir = e.side === 'E' ? -1 : 1, HX = c.e._pa ? c.e._pa.g.HX : 34, HY = 79;
  return b.ents.filter((o) => o !== e && o.alive && o.side === e.side && !o.bench).map((o) => ({ o, d: Math.hypot(o.x - e.x, o.y - e.y) })).filter((a) => a.d < 520).sort((a, b2) => a.d - b2.d).slice(0, 3)
    .map(({ o }) => { const x = Math.round(HX + (o.x - e.x) / ART * dir), y = Math.round(HY + (o.y - e.y) / ART), t = has(keyOf(o)) ? body(keyOf(o)).top : Math.round(22 * (o.sz || 1)); return { x, y, top: y - t, mid: y - Math.round(t / 2) }; });
}

// ───────── battle ─────────
function bodyState(e, T, b) {
  if (e.casting) return ['charge', 8 + (Math.floor(T * 6) & 1) * 3];
  if (!e.alive) return ['hurt', 6];
  if (e.stun > 0 || (e.kbLock && e.kbLock > T)) return ['hurt', 5];
  if (e.kb != null && T - e.kb < 0.4) return ['hurt', Math.min(b.nHurt - 1, Math.floor((0.3 + T - e.kb) * 12 + 1e-6))];
  const moving = e.walk && e._pw !== e.walk; e._pw = e.walk;
  if (moving) e._pwT = T;
  if (e._pwT && T - e._pwT < 0.12) return ['move', (Math.floor((e.walk || 0) / 12) % 4) * 2];
  return ['idle', Math.floor((T + (e.id || 0) * 0.37) * 12) % b.nIdle];
}
const oEnt = P16.entImg;
P16.entImg = function (e, T) {
  const key = keyOf(e); if (!has(key) || !HAS_DOM) return oEnt.apply(this, arguments);
  const big = (e.sz || 1) >= 1.6 ? 2 : 1;
  let c;
  if (e._pa && e.alive) c = stageCanvas(e._pa);
  else { const b = body(key), [st, fi] = bodyState(e, T, b); c = bodyFrame(key, st, fi, e.flash > 0 ? '#ffffff' : e.raging && Math.floor(T * 8) % 2 ? '#ff4a4a' : '', ART * big); }
  e._fr = c; e._pH = c.S;
  return c;
};

if (BP()) {
  const B = BP();
  // attacks: start the swing early from the game's attack countdown so the character's own strike frame lands on the damage;
  // when attacks come faster than the animation, play it faster
  const oStep = B.step;
  B.step = function (dt) {
    let de = dt; if (this.hs > 0) de = 0; else if (this.slow > 0) de = dt * 0.2;
    const T = this.t;
    for (const e of this.ents) {
      if (!e.alive || !isP(e) || e.casting || e.stun > 0 || e.noAtk || e.leap || (e.kbLock && e.kbLock > T) || this.opening) continue;
      const pa = e._pa; if (pa && (pa.kind === 'skill' ? pa.g.state !== 'recover' : pa.kind !== 'attack')) continue;
      const tg = e.target; if (!tg || !tg.alive) continue;
      const d = Math.hypot(tg.x - e.x, (tg.y - e.y) * (tg.wideY || 1)), reach = e.range + ((tg.sz || 1) - 1) * 30; if (d > reach) continue;
      const bd = body(keyOf(e)), speed = Math.max(1, (bd.dur[2] || 0.75) / Math.max(0.25, e.iv || 1)), lead = bd.strike / speed;
      if (e.t <= lead && e.t > 0 && !(pa && pa.kind === 'attack' && !pa.g.done && pa.g.state === 'attack')) startAction(this, e, 'attack', { tg, speed });
    }
    const r = oStep.apply(this, arguments);
    for (const e of this.ents) {
      // the trait's awakening at the start of the fight: the character plays its own skill (the last 0.5 s of the charge, so the
      // release lands with the awakening's burst); units with a mana skill show theirs when they cast instead
      if (e._pAw != null && this.t >= e._pAw) { e._pAw = null; if (e.alive && !e.casting && isP(e) && HAS_DOM) { const bd = body(keyOf(e)); startAction(this, e, 'skill', { skip: Math.max(0, (bd.dur[3] || 1.4) - 0.5) }); } }
      if (e.alive && e._pDead) { e._pDead = false; if (isP(e)) { dropDeath(this, e); startAction(this, e, 'revive'); } }   // revived (revive trait, top-tier heal item)
      const pa = e._pa; if (!pa) continue;
      if (!e.alive) { stopAction(e); continue; }
      pa.g.step(de, pa.speed);
      if (pa.g.done && !pa.g.busy()) stopAction(e);
    }
    const dead = this._pDead; if (dead) for (let i = dead.length - 1; i >= 0; i--) { const r2 = dead[i]; r2.pa.g.step(de, 1); if (r2.pa.g.done && !r2.pa.g.busy()) { giveBack(r2.pa.g); dead.splice(i, 1); } }
    return r;
  };
  // an attack the pre-start missed (just came into range, target changed): play from the strike frame; hide the old slash and sound
  const oAtk = B.attack;
  B.attack = function (e, tg) {
    if (!isP(e)) return oAtk.apply(this, arguments);
    const pa = e._pa;
    // a skill still charging or releasing is not cut off by a normal attack (the hit still happens); from its recover on it is
    if (pa && pa.kind === 'skill' && pa.g.state !== 'recover' && !pa.g.done) { this._pAtk = e; M._pcdMuteAtk = 1; try { return oAtk.apply(this, arguments); } finally { this._pAtk = null; M._pcdMuteAtk = 0; } }
    if (!(pa && pa.kind === 'attack' && pa.g.state === 'attack')) { const bd = body(keyOf(e)), speed = Math.max(1, (bd.dur[2] || 0.75) / Math.max(0.25, e.iv || 1)); startAction(this, e, 'attack', { tg, speed, skip: bd.strike }); }
    this._pAtk = e; M._pcdMuteAtk = 1;
    try { return oAtk.apply(this, arguments); } finally { this._pAtk = null; M._pcdMuteAtk = 0; }
  };
  const oFxp = B.fxp;
  if (oFxp) B.fxp = function (f) { if (this._pAtk && f && f.k === 'slash') return; return oFxp.apply(this, arguments); };
  const oShoot = B.shootP;
  B.shootP = function (e) { const r = oShoot.apply(this, arguments); if (isP(e) && this.proj.length) this.proj[this.proj.length - 1].pcdHide = 1; return r; };   // the shot still flies (same damage timing); the module draws its look
  // skills: play only the last <game cast time> of the charge (the earlier gathering is fast-forwarded, particles already in flight);
  // switch to the cast when the game fires, then let the recover play out
  const oBegin = B.beginCast;
  B.beginCast = function (e) {
    const r = oBegin.apply(this, arguments);
    if (e.casting && isP(e)) { const bd = body(keyOf(e)), dur = Math.max(0.2, e.casting.until - e.casting.t0); startAction(this, e, 'skill', { skip: Math.max(0, (bd.dur[3] || 1.4) - dur) }); }
    return r;
  };
  const oMb = B.mbTick;
  if (oMb) B.mbTick = function (e) {
    const was = e.casting, r = oMb.apply(this, arguments);
    if (!was && e.casting && e.casting.mb && isP(e)) { const bd = body(keyOf(e)), dur = Math.max(0.2, e.casting.until - e.casting.t0); startAction(this, e, 'skill', { tg: e.casting.tg, skip: Math.max(0, (bd.dur[3] || 1.4) - dur) }); }
    return r;
  };
  // mark who awakens (mc-awaken.js schedules the awakening on the 'start' hook); the skill starts at the awakening's time
  const oCall = B.call;
  if (oCall) B.call = function (e, hook) {
    const had = e && e._emb, r = oCall.apply(this, arguments);
    if (hook === 'start' && e && !had && e._emb && isP(e) && !(M.unitSkill && M.unitSkill(keyOf(e)))) e._pAw = e._emb.t0;
    return r;
  };
  const oFire = B.fireCast;
  B.fireCast = function (e) { const r = oFire.apply(this, arguments); const pa = e._pa; if (pa && pa.kind === 'skill' && pa.g.state === 'charge') pa.g.enter('cast'); return r; };
  // death: drop the white silhouette and play the character's own death (fall, shatter, ashes...) where it fell
  const oKill = B.kill;
  B.kill = function (e) {
    const was = e.alive, n0 = this.fx.length; const r = oKill.apply(this, arguments);
    if (was && !e.alive && isP(e) && HAS_DOM) {
      for (let i = this.fx.length - 1; i >= n0; i--) if (this.fx[i].k === 'death') this.fx.splice(i, 1);
      stopAction(e); e._pDead = true;
      if (!e.fling) { const pa = startAction(this, e, 'death', { dist: 40, skip: 0.3 }); e._pa = null; (this._pDead = this._pDead || []).push({ e, pa, x: e.x, y: e.y, side: e.side }); }
    }
    return r;
  };
  function dropDeath(b, e) { const d = b._pDead; if (!d) return; for (let i = d.length - 1; i >= 0; i--) if (d[i].e === e) { giveBack(d[i].pa.g); d.splice(i, 1); } }
  // render: the module draws these characters' shots, so the game's vector shots are hidden for them
  const oRender = B.render;
  B.render = function () { const all = this.proj; this.proj = all.filter((p) => !p.pcdHide); try { return oRender.apply(this, arguments); } finally { this.proj = all; } };
  // bodies: drawn after all units
  const oAfter = M.drawAfterUnits;
  M.drawAfterUnits = function (ctx, b, T) {
    if (oAfter) oAfter.apply(this, arguments);
    const d = b._pDead; if (!d || !d.length) return;
    for (const r of d) { const cv = stageCanvas(r.pa); ctx.save(); ctx.translate(P16.snap(r.x), P16.snap(r.y)); if (r.side === 'E') ctx.scale(-1, 1); ctx.drawImage(cv, -cv.cx, -cv.footY); ctx.restore(); }
  };
}
// old cast particles and skill sounds are off for new characters (their modules draw the skill)
const PCD_REC = { ch: 'spiral', cs: 'nova', ramp: 'arcane', d: 'pcd' };
const oFor = P16.fxFor;
P16.fxFor = function (e) { return isP(e) ? PCD_REC : oFor ? oFor.apply(this, arguments) : null; };
const oCastFx = P16.castFx;
P16.castFx = function (b, e) { if (isP(e)) return; return oCastFx.apply(this, arguments); };
// the generic attack sound: new characters sound their swing from the module instead
if (M.Sfx && M.Sfx.atk) { const oA = M.Sfx.atk; M.Sfx.atk = function () { if (M._pcdMuteAtk) return; return oA.apply(this, arguments); }; }
// the leader's legion skill (space, from the sidelines): play the leader's own off-field effect
if (M.Battle2 && M.Battle2.prototype.castSkill) {
  const B2 = M.Battle2.prototype, oCast = B2.castSkill;
  B2.castSkill = function () { const ok = oCast.apply(this, arguments); const h = this.hero; if (ok && h && isP(h) && this instanceof M.Battle3 && HAS_DOM) startAction(this, h, 'off', { dist: 200 }); return ok; };
}
// night-market card: new characters play idle at 12 fps and the attack at the end of every 3.2 s
try { if (HAS_DOM && window.customElements && customElements.get('mc-anim')) {
  const A = customElements.get('mc-anim').prototype, oDraw = A.draw;
  A.draw = function (t) {
    if (!has(this.k)) return oDraw.apply(this, arguments);
    const b = body(this.k), tt = t + (this.seed || 0), cyc = tt % 3.2, atkT = (b.dur[2] || 0.75), atk = cyc > 3.2 - atkT;
    const st = atk ? 'attack' : 'idle', fi = atk ? Math.floor((cyc - (3.2 - atkT)) * 12) : Math.floor(tt * 12) % b.nIdle, fk = st + fi; if (fk === this._f) return; this._f = fk;
    const fr = bodyFrame(this.k, st, fi, '', 1), W = this.clientWidth || 200, H = this.clientHeight || 180;
    if (!this.sc) { const h = b.eng.pose('idle', 0), bb = bboxOf(h.out, h.w, h.h) || { x0: 0, y0: 0, x1: h.w - 1, y1: h.h - 1 }; this.bb = { x: bb.x0, y: bb.y0, w: bb.x1 - bb.x0 + 1, h: bb.y1 - bb.y0 + 1 }; this.sc = Math.max(1, Math.min(8, Math.floor(Math.min(W * 0.92 / this.bb.w, H * 0.9 / this.bb.h)))); this.cv.width = Math.floor(W / this.sc); this.cv.height = Math.floor(H / this.sc); this.cv.style.width = this.cv.width * this.sc + 'px'; this.cv.style.height = this.cv.height * this.sc + 'px'; }
    const x = this.cv.getContext('2d'), cw = this.cv.width, ch = this.cv.height, bb = this.bb; x.imageSmoothingEnabled = false; x.clearRect(0, 0, cw, ch);
    const dx = Math.round(cw / 2 - (bb.x + bb.w / 2)), dy = Math.round(ch - 2 - (bb.y + bb.h));
    x.fillStyle = 'rgba(7,6,15,0.55)'; x.fillRect(Math.round(cw / 2 - bb.w * 0.4), ch - 3, Math.round(bb.w * 0.8), 2);
    x.drawImage(fr, dx, dy, fr.artW, fr.artH);
  };
} } catch (err) { /* no mc-anim element (tool stubs): leave it */ }
// leader busts (M.PJ.BUSTS, 64×64): the painted busts show the old designs, so each is replaced by the new idle sprite cropped
// from the top of its silhouette at ×2 (an interim picture until the busts are redrawn)
function bustOf(key) {
  const b = body(key), h = b.eng.pose('idle', 0), bb = bboxOf(h.out, h.w, h.h); if (!bb) return null;
  const S = 32, x0 = Math.round((bb.x0 + bb.x1 + 1) / 2) - S / 2, y0 = bb.y0 - 1, cv = mkCanvas(S * 2, S * 2), g = cv.getContext('2d');
  g.imageSmoothingEnabled = false; g.drawImage(paint(h.out, h.w, h.h, b.eng.lut), x0, y0, S, S, 0, 0, S * 2, S * 2);
  return cv.toDataURL('image/png');
}
try { if (HAS_DOM && M.PJ && M.PJ.BUSTS) for (const k of Object.keys(M.PJ.BUSTS)) if (has(k)) { const u = bustOf(k); if (u) M.PJ.BUSTS[k] = u; } } catch (err) { /* keep the painted busts */ }
// character gallery (#gallery): every redrawn character loops idle → move → attack → skill, each drawn by its own module with
// its own effects (the px16 gallery only borrowed their bodies and threw generic particles over them); 32 per page
const GSEQ = [['idle', 1.2], ['move', 1.0], ['attack', 0], ['skill', 0]];   // seconds; 0 = until the action and its effects are over
P16.gallery = function () {
  if (!HAS_DOM || document.getElementById('__p16gal')) return;
  const seen = new Set(), keys = ['watchman', 'widow', 'nun', 'butcherlord', 'clockmaker', 'cremator'].concat(Object.keys(M.DB || {}), ['militia']).filter((k) => has(k) && !seen.has(k) && seen.add(k));
  const cv = mkCanvas(1, 1); cv.id = '__p16gal'; cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:100000;background:#120c1a;image-rendering:pixelated;cursor:pointer';
  document.body.appendChild(cv); const x = cv.getContext('2d');
  const cells = [];
  let page = 0, pages = 1, raf = 0, last = performance.now();
  const turn = (d) => { page = (page + d + pages) % pages; };
  const close = () => { cancelAnimationFrame(raf); cv.remove(); window.removeEventListener('keydown', key); cells.length = 0; };
  const key = (e) => { if (e.code === 'ArrowRight' || e.code === 'KeyD') turn(1); else if (e.code === 'ArrowLeft' || e.code === 'KeyA') turn(-1); else if (e.code === 'Escape') close(); };
  window.addEventListener('keydown', key); cv.addEventListener('contextmenu', (e) => { e.preventDefault(); close(); });
  cv.addEventListener('wheel', (e) => turn(e.deltaY > 0 ? 1 : -1));
  cv.addEventListener('click', (e) => { const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width; if (px > 0.85) turn(1); else if (px < 0.15) turn(-1); });
  // one silent engine per slot, reloaded when the page shows another character there
  const slot = (i) => cells[i] || (cells[i] = { g: PCD.createEngine({ game: true, W: 160 }), key: null, s: 0, t: 0, cv: null });
  const draw = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const W = cv.width = Math.floor(innerWidth * devicePixelRatio / 2), H = cv.height = Math.floor(innerHeight * devicePixelRatio / 2);
    x.imageSmoothingEnabled = false; x.fillStyle = '#120c1a'; x.fillRect(0, 0, W, H);
    // about 32 cells, columns follow the window's shape (8 × 4 on a wide screen, 6 × 5 in a narrow pane)
    const cols = Math.max(3, Math.min(8, Math.round(Math.sqrt(32 * W / Math.max(1, H - 18))))), rows = Math.max(2, Math.round(32 / cols)), per = cols * rows;
    pages = Math.max(1, Math.ceil(keys.length / per)); if (page >= pages) page = pages - 1;
    const cw = Math.floor(W / cols), chh = Math.floor((H - 18) / rows);
    x.fillStyle = '#e6dcc4'; x.font = '10px sans-serif'; x.fillText('午夜机台 · 角色一览  第 ' + (page + 1) + ' / ' + pages + ' 页   ←/→ 翻页 · Esc 关闭', 8, 12);
    let loads = 0;
    keys.slice(page * per, page * per + per).forEach((k, i) => {
      const x0 = (i % cols) * cw, y0 = 18 + Math.floor(i / cols) * chh, c = slot(i), g = c.g;
      x.fillStyle = '#1a1424'; x.fillRect(x0 + 1, y0 + 1, cw - 2, chh - 2); x.fillStyle = '#2e2236'; x.fillRect(x0 + 1, y0 + chh - 14, cw - 2, 1);
      if (c.key !== k) {   // at most 3 module loads per frame so turning a page never freezes the view
        if (loads++ >= 3) return;
        g.load(k, { dummyX: body(k).HX + 36 }); g.enter('idle'); c.key = k; c.s = 0; c.t = -(i % cols) * 0.13;
        const cc = mkCanvas(g.W, g.H), cx = cc.getContext('2d'), im = cx.createImageData(g.W, g.H); c.cv = { cc, cx, im, px: new Uint32Array(im.data.buffer) };
      }
      c.t += dt; g.step(dt, 1);
      const [st, len] = GSEQ[c.s];
      if (len ? c.t >= len : g.done && !g.busy()) { c.s = (c.s + 1) % GSEQ.length; c.t = 0; const n = GSEQ[c.s][0]; g.enter(n === 'skill' ? 'charge' : n); }
      else if (len && g.done) g.enter(st);   // idle / move are timed here; keep them looping
      const fb = g.render(), lut = g.lut, px = c.cv.px; px.fill(0);
      for (let j = 0; j < fb.length; j++) if (fb[j] !== 255) px[j] = lut[fb[j]];
      c.cv.cx.putImageData(c.cv.im, 0, 0);
      const bk = body(k), sc = Math.max(1, Math.min(2, Math.floor((chh - 24) / bk.top), Math.floor(cw * 0.8 / bk.w))), fx = x0 + Math.floor(cw * 0.22), fy = y0 + chh - 15;
      x.save(); x.beginPath(); x.rect(x0 + 1, y0 + 1, cw - 2, chh - 16); x.clip();
      x.drawImage(c.cv.cc, fx - g.HX * sc, fy - g.HY * sc, g.W * sc, g.H * sc); x.restore();
      const d = M.DB && M.DB[k]; x.fillStyle = '#cfc6b8'; x.font = '9px sans-serif'; x.textAlign = 'center';
      x.fillText((d ? d.n : ({ watchman: '守夜人', widow: '赌徒寡妇', nun: '驱魔修女', butcherlord: '屠宰场主', clockmaker: '钟表匠', cremator: '焚尸人', militia: '民兵' })[k] || k) + ' · ' + st, x0 + cw / 2, y0 + chh - 4); x.textAlign = 'left';
    });
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
};
M.PCDG = { body, bodyFrame, startAction, stopAction, has };
function BP() { return M.Battle3 && M.Battle3.prototype; }
})();

;
