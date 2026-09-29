// ==== mc-bossfight.js ====
(function () {
// Boss fights (user ruling 2026-09-26). A boss fights alone.
// Final boss — the end of a scene: the right of the field is its arena (lava, sea, roots … impassable), the boss rises
//   out of it, only its upper body showing, and never moves. Melee units fight it from the edge. It strikes rarely and
//   hard: every blow charges behind a red mark that fills up, shakes the screen and throws units.
//   · 震击 (slam): both fists come down in front of it — everything in the ring is thrown up; nothing outside it is touched.
//   · 天降 (rain), first phase: a string of red marks across the field (demon: meteors; druid: thorns; …), then whatever
//     falls, falls on them.
//   · below half its life it roars into its second phase: the string stops, and one arm sweeps a wide fan in front of it
//     (扫臂) — everything in the fan is knocked flat (not thrown, 2026-09-27).
//   A blow is only begun when someone already stands where it would land (user ruling 2026-09-26: 「否则放空技能太傻了」).
//   Looks differ boss by boss (mc-titan.js); the moves are the same three, each dressed as that boss.
// Small boss — the middle of a scene: one giant unit that walks and fights, with two charged blows of its own
//   (重击 a ring on its target, 横扫 a fan in front of it), each behind a mark.
const M = window.MC, BP = M.Battle3 && M.Battle3.prototype; if (!BP) return;
const S = M.Sfx, PL = (M.PJ && M.PJ.PAL) || {}, DB = M.DB;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const EDGE = 1480, FB_X = EDGE + 60, FB_DX = 100, FB_Y = 440, SLAM_X = EDGE - 140;
const FOE = '#ff3a3a';
const inRing = (u, x, y, r) => Math.hypot(u.x - x, (u.y - y) * 1.2) < r;
const inFan = (u, x, y, r, half) => { const dx = x - u.x, dy = (u.y - y) * 1.2, d = Math.hypot(dx, dy); return d < r && dx > 0 && Math.abs(Math.atan2(dy, dx)) < half; };
// numbers (per target, × the boss's attack): tuned against the shown power (docs/design.md §8.3). 2026-09-26 (the slam
// only hits its ring, the string is the first phase's, the sweep the second's): .ai/sim-boss3.js 400 fights a variant
// p2As: the second phase's attack speed (2026-09-27: 「第2阶段后，Boss的攻速增加50%」): its wind-ups and rests are 1.5 times shorter
const FBK = M.FBK = { p2As: 1.5, slam: 0.7, sweep: 0.25, rain: 0.4, windSlam: 1.45, windSweep: 1.55, windRain: 1.3, rest: 1.4, slamR: 250, sweepR: 820, sweepHalf: 1.08, rainN: 7, rainR: 118 };
const MBK = M.MBK = { crush: 2.2, cleave: 1.65, every: 5.5, wind: [1.1, 1.2], crushR: 170, cleaveR: 300, cleaveHalf: 0.9 };

// ───────── set-up ─────────
const oSpawn = BP.spawnEnemy;
BP.spawnEnemy = function (s) {
  const e = oSpawn.apply(this, arguments);
  if (s.fb && M.isFinalBoss(s.type)) {
    const sp = (M.TITAN && M.TITAN.spec(s.type)) || {};
    e.fb = sp; e.x = FB_X; e.y = FB_Y; e.drawDX = FB_DX; e.sz = 3.2; e.wideY = 0.12; e.noAtk = true; e.hasMana = false; e.entry = 'fbrise'; e.readyAt = this.t + 2.2;
    e.ai = { st: 'rise', t0: this.t, t: this.t + 2.2, n: 0, phase: 1 };
    this.arena = { edge: EDGE, kind: sp.arena || 'lava', boss: e, heat: 0 };
    this.shake = Math.max(this.shake, 10); S.impact && S.impact();
  } else if (e.boss && this.cfg && this.cfg.mb) { e.sz *= 1.4; e.mbAi = { next: this.t + 3.2, n: 0 }; }
  return e;
};
// the rise: out of the terrain over 2.2 s, the arena boiling
function riseY(e, T) { const A = e.ai; if (!A) return 0; if (A.st === 'rise') { const q = clamp((T - A.t0) / 2.2, 0, 1), k = 1 - Math.pow(1 - q, 3); return (1 - k) * 520; } if (A.st === 'dead') { const q = clamp((T - A.t0) / 2.4, 0, 1); return q * q * 560; } return 0; }

// ───────── the final boss ─────────
// 2026-09-27 (a player stuck for minutes: one unit at the bottom of the arena's edge, the boss casting 天降 over and over,
// never hitting it): a melee unit walks to the edge at the height it started from, and the three lanes (270 / 390 / 510)
// and the string of marks (from x 1330 leftward) left the top and bottom of the edge where no blow could land. Five lanes
// now reach the whole edge, and the string starts under the unit it aims at.
const LANES = [170, 270, 390, 510, 620];
function pickLane(b, e) {
  const us = b.ents.filter(u => b.active(u) && u.side === 'A'); let best = 0, bn = -1;
  LANES.forEach(y => { const n = us.filter(u => inRing(u, SLAM_X, y, FBK.slamR)).length; if (n > bn || (n === bn && y === 390)) { bn = n; best = y - FB_Y; } });
  return bn > 0 ? best : null;
}
// who the string of marks runs through: the units standing on the field (not the ones still in the air)
const standing = (b) => b.ents.filter(u => b.active(u) && u.side === 'A' && !u.air);
const fanHas = (b) => b.ents.some(u => b.active(u) && u.side === 'A' && inFan(u, EDGE + 40, FB_Y, FBK.sweepR, FBK.sweepHalf));
BP.fbBegin = function (e, k) {
  const A = e.ai, T = this.t, atk = e.atk, sp = A.phase === 2 ? FBK.p2As : 1; A.k = k; A.st = 'wind'; A.t0 = T; A.n++;
  const col = FOE;
  if (k === 'slam') { A.lane = pickLane(this, e) || 0; A.t = T + FBK.windSlam / sp; A.om = this.omen({ shape: 'circle', x: SLAM_X, y: FB_Y + A.lane, r: FBK.slamR, t0: T, until: A.t, col, src: e, keep: 1 }); }
  else if (k === 'sweep') { A.t = T + FBK.windSweep / sp; A.om = this.omen({ shape: 'sector', x: EDGE + 40, y: FB_Y, r: FBK.sweepR, half: FBK.sweepHalf, dir: -1, t0: T, until: A.t, col, src: e, keep: 1 }); }
  else if (k === 'rain') {
    const us = standing(this), n = FBK.rainN;
    const tu = us.length ? us[Math.floor(Math.random() * us.length)] : null, y0 = tu ? tu.y : FB_Y, y1 = 120 + Math.random() * 480, x0 = tu ? clamp(tu.x, 420, EDGE - 20) : EDGE - 150, x1 = Math.min(320, x0 - 600);
    A.marks = []; for (let i = 0; i < n; i++) { const q = i / (n - 1), x = x0 + (x1 - x0) * q, y = clamp(y0 + (y1 - y0) * q + Math.sin(q * 9 + A.n) * 100, 110, 660); A.marks.push(this.omen({ shape: 'circle', x, y, r: FBK.rainR, t0: T + i * 0.1, until: T + FBK.windRain + i * 0.12, col, src: e, keep: 1, rain: e.fb.rain || 'meteor' })); }
    A.t = T + FBK.windRain + (n - 1) * 0.12 + 0.05; A.hit = 0;
  }
  if (S.bossWind) S.bossWind(k); else if (S.skillFx) S.skillFx('charge', 'spiral', 'blood', 3, A.t - T, S.panX ? S.panX(e.x) : 0);
  this.fxp({ k: 'ctitle', ent: e, text: (e.fb.names || {})[k] || { slam: '震击', sweep: '扫臂', rain: '天降' }[k], col: FOE, tier: 1, side: 'E', life: A.t - T + 0.9 });
};
BP.fbStrike = function (e) {
  const A = e.ai, T = this.t, k = A.k, dmg = (m) => e.atk * m * (e.atkDyn ? 1 + e.atkDyn : 1);
  const hitU = (u, m, vx, vy, lift) => { if (!this.active(u) || u.side !== 'A') return; this.deal(e, u, dmg(m), { skill: 1, big: 1, noKb: 1, col: FOE }); if (u.alive) this.launch(u, vx, vy, lift); };
  if (k === 'slam') {
    const x = SLAM_X, y = FB_Y + A.lane;
    this.ents.forEach(u => { if (!this.active(u) || u.side !== 'A') return; if (inRing(u, x, y, FBK.slamR)) hitU(u, FBK.slam, (u.x - x) * 0.8 - 120, (u.y - y) * 0.6, 1.3); });
    this.shake = Math.max(this.shake, 30); this.hs = Math.max(this.hs || 0, 0.09); this.flash = Math.max(this.flash, 0.35); this.flashCol = '#fff2e0';
    this.fxp({ k: 'crack', x, y, life: 2.5 }); this.dust(x, y, 26); this.fxp({ k: 'fbwave', x, y, r: FBK.slamR, life: 0.5 }); this.ring(x, y - 10, 30, FBK.slamR * 1.1, '#ffd0a0', 14, 0.45);
    if (M.TITAN && M.TITAN.impact) M.TITAN.impact(this, e, 'slam', x, y);
    S.impact && S.impact(); S.boom && S.boom();
  } else if (k === 'sweep') {
    // knocked flat, not thrown (2026-09-27: 「boss的扇形攻击只击倒，不击飞了」)
    this.ents.forEach(u => { if (!inFan(u, EDGE + 40, FB_Y, FBK.sweepR, FBK.sweepHalf) || !this.active(u) || u.side !== 'A') return; this.deal(e, u, dmg(FBK.sweep), { skill: 1, big: 1, noKb: 1, col: FOE }); if (u.alive) this.knockFlat(e, u, -420 - Math.random() * 120, (Math.random() - 0.5) * 120, 1.0); });
    this.shake = Math.max(this.shake, 24); this.hs = Math.max(this.hs || 0, 0.06); this.fxp({ k: 'fbsweep', x: EDGE + 40, y: FB_Y, r: FBK.sweepR, half: FBK.sweepHalf, life: 0.45 });
    if (M.TITAN && M.TITAN.impact) M.TITAN.impact(this, e, 'sweep', EDGE - 300, FB_Y);
    S.whoosh && S.whoosh(0.6); S.impact && S.impact();
  }
  A.st = 'strike'; A.t = T + 0.5;
};
BP.fbRainTick = function (e) {
  const A = e.ai, T = this.t;
  (A.marks || []).forEach(o => {
    if (o.done || T < o.until) return; o.done = 1;
    this.ents.forEach(u => { if (this.active(u) && u.side === 'A' && inRing(u, o.x, o.y, o.r)) { this.deal(e, u, e.atk * FBK.rain, { skill: 1, big: 1, noKb: 1, col: FOE }); if (u.alive) this.launch(u, (u.x - o.x) * 1.2, (u.y - o.y) * 0.8, 0.9); } });
    this.shake = Math.max(this.shake, 16); this.dust(o.x, o.y, 10); this.fxp({ k: 'crack', x: o.x, y: o.y, life: 1.6 }); this.ring(o.x, o.y - 8, 16, o.r, '#ffd0a0', 10, 0.35);
    if (M.TITAN && M.TITAN.impact) M.TITAN.impact(this, e, 'rain', o.x, o.y);
    S.boom && S.boom();
  });
};
BP.fbTick = function (e) {
  const A = e.ai, T = this.t; if (!A) return;
  e.drawDY = riseY(e, T); e.clipY = e.drawDY > 0 ? -e.drawDY + 4 : null;
  if (A.st === 'dead') return;
  if (A.st === 'rise') { if (T >= A.t) { A.st = 'idle'; A.t = T + 0.6; } else if (Math.random() < 0.3) this.shake = Math.max(this.shake, 6); return; }
  if (this.opening || !e.alive) return;
  if (A.phase === 1 && !this.noP2 && e.hp < e.maxHp * 0.5 && (A.st === 'idle' || A.st === 'recover')) {   // 普通 difficulty: one phase only (mc-gdiff.js)
    // the second phase begins with its own show (2026-09-27: 「boss进2阶段的时候，要有个伟大的仪式感，然后再继续战斗」): the fight stands
    // still while it plays (P2_LEN real seconds, drawn by the game over the field); then only 扫臂 and 震击 are left
    A.phase = 2; A.st = 'roar'; A.t0 = T; A.t = Infinity; this.p2 = { e, t: 0, fired: {} }; if (this.arena) this.arena.heat = 1;
    return;
  }
  if (A.st === 'roar') { if (T >= A.t) { A.st = 'idle'; A.t = T + 0.3; } else if (Math.random() < 0.25) this.shake = Math.max(this.shake, 10); return; }
  if (A.st === 'idle' && T >= A.t) {
    // first phase: 震击 and 天降 by turns; second: 震击 and 扫臂. A blow nobody stands under waits; the other one may go.
    const seq = A.phase === 1 ? ['slam', 'rain'] : ['sweep', 'slam'], i = A.phase === 1 ? A.n : (A.n2 || 0);
    const can = (k) => k === 'slam' ? pickLane(this, e) != null : k === 'sweep' ? fanHas(this) : standing(this).length > 0;
    const k = [seq[i % 2], seq[(i + 1) % 2]].find(can);
    if (!k) { A.t = T + 0.25; return; }
    if (A.phase === 2) A.n2 = i + (k === seq[i % 2] ? 1 : 2);
    this.fbBegin(e, k); if (A.phase === 1 && k !== seq[i % 2]) A.n++; return;
  }
  if (A.st === 'wind') {
    if (A.k === 'rain') { this.fbRainTick(e); if (T >= A.t) { A.st = 'recover'; A.t = T + FBK.rest * 0.7; } return; }
    if (T >= A.t) this.fbStrike(e); return;
  }
  if (A.st === 'strike' && T >= A.t) { A.st = 'recover'; A.t = T + FBK.rest * (A.phase === 2 ? (this.fbFast || 1) / FBK.p2As : 1); return; }
  if (A.st === 'recover' && T >= A.t) { A.st = 'idle'; A.t = T + 0.15; }
};

// ───────── the small boss ─────────
BP.mbTick = function (e) {
  const A = e.mbAi, T = this.t; if (!A || !e.alive || this.opening || e.casting || T < A.next) return;
  const tg = e.target && e.target.alive ? e.target : this.nearestFoe(e, 2000), d = tg ? Math.hypot(tg.x - e.x, tg.y - e.y) : 1e9; if (d > 420) { A.next = T + 0.3; return; }
  // 横扫 only when the target already stands in the fan's reach; otherwise 重击 on it, and 横扫 stays next
  let k = A.n % 2 ? 'cleave' : 'crush'; if (k === 'cleave' && d > MBK.cleaveR * 0.9) k = 'crush'; else A.n++;
  const dur = MBK.wind[k === 'crush' ? 0 : 1];
  const om = k === 'crush' ? this.omen({ shape: 'circle', ent: tg, r: MBK.crushR, t0: T, until: T + dur, col: FOE, src: e, tether: 1 })
    : this.omen({ shape: 'sector', x: e.x, y: e.y, r: MBK.cleaveR, half: MBK.cleaveHalf, dir: tg.x < e.x ? -1 : 1, t0: T, until: T + dur, col: FOE, src: e });
  e.casting = { t0: T, until: T + dur, sp: { n: k === 'crush' ? '重击' : '横扫', col: FOE, tier: 2, q: 3 }, mb: k, om, tg };
  this.fxp({ k: 'ctitle', ent: e, text: e.casting.sp.n, col: FOE, tier: 1, side: 'E', life: dur + 1 });
  S.skillFx && S.skillFx('charge', 'spiral', 'blood', 2, dur, S.panX ? S.panX(e.x) : 0);
  A.next = T + dur + MBK.every;
};
const oFire = BP.fireCast;
BP.fireCast = function (e) {
  const c = e.casting; if (!c || !c.mb) return oFire.apply(this, arguments);
  e.casting = null; e.castPose = this.t; const om = c.om, T = this.t;
  if (c.mb === 'crush') {
    const x = om.ent ? om.ent.x : om.x, y = om.ent ? om.ent.y : om.y;
    this.ents.forEach(u => { if (this.active(u) && u.side !== e.side && inRing(u, x, y, MBK.crushR)) { this.deal(e, u, e.atk * MBK.crush, { skill: 1, big: 1, noKb: 1, col: FOE }); if (u.alive) this.launch(u, (u.x - x) * 1.4 + (u.x < e.x ? -140 : 140), (u.y - y), 1.0); } });
    this.fxp({ k: 'crack', x, y, life: 2 }); this.dust(x, y, 16); this.ring(x, y - 8, 20, MBK.crushR, '#ffd0a0', 12, 0.4);
  } else {
    this.ents.forEach(u => { if (!this.active(u) || u.side === e.side) return; const dx = (u.x - e.x) * om.dir, dy = (u.y - e.y) * 1.2, d = Math.hypot(dx, dy); if (d < om.r && dx > 0 && Math.abs(Math.atan2(dy, dx)) < om.half) { this.deal(e, u, e.atk * MBK.cleave, { skill: 1, big: 1, noKb: 1, col: FOE }); if (u.alive) this.launch(u, om.dir * 280, (u.y - e.y) * 0.8, 0.8); } });
    this.fxp({ k: 'fbsweep', x: e.x, y: e.y, r: om.r, half: om.half, dir: om.dir, life: 0.35 });
  }
  this.shake = Math.max(this.shake, 18); this.hs = Math.max(this.hs || 0, 0.05); S.impact && S.impact();
};

// ───────── the loop ─────────
const oStep = BP.step;
BP.step = function (dt) {
  const r = oStep.apply(this, arguments); if (!(dt > 0)) return r;
  for (const e of this.ents) { if (e.fb) this.fbTick(e); else if (e.mbAi) this.mbTick(e); }
  const ar = this.arena; if (ar) { const lim = ar.edge - 14; this.ents.forEach(u => { if (u.side === 'A' && u.alive && !u.isHero && u.x > lim) { u.x = lim; if (u.air && u.air.vx > 0) u.air.vx = -u.air.vx * 0.3; } }); if (this.hero && this.hero.x > lim) this.hero.x = lim; ar.heat = Math.max(0, (ar.heat || 0) - dt * 0.4); }
  return r;
};
// the death: it sinks back into its arena, the field keeps going a moment longer so it is seen
const oKill = BP.kill;
BP.kill = function (e, src) {
  const was = e && e.alive, r = oKill.apply(this, arguments);
  if (was && e.fb && !e.alive) { e.ai.st = 'dead'; e.ai.t0 = this.t; e.fling = true; this.fbDeadT = this.t; this.omens = (this.omens || []).filter(o => o.src !== e); this.flash = 1; this.flashCol = '#ffffff'; this.shake = 34; if (M.TITAN && M.TITAN.impact) M.TITAN.impact(this, e, 'die', e.x + FB_DX, FB_Y - 180); }
  return r;
};
const oEnd = BP.end;
BP.end = function (res) {
  if (res === 'clear' && this.fbDeadT != null && this.t - this.fbDeadT < 2.2) { if (!this._fbEndQ) { this._fbEndQ = 1; this.later(2.2 - (this.t - this.fbDeadT), () => oEnd.call(this, res)); } return; }
  return oEnd.apply(this, arguments);
};

// ───────── drawing: the arena under everything, its near edge over the boss, the boss's bar on top ─────────
const oFloor = M.drawKbFloor;
M.drawKbFloor = function (ctx, b, T) { if (b.arena && M.TITAN && M.TITAN.arena) M.TITAN.arena(ctx, b, T); if (oFloor) oFloor.apply(this, arguments); };
const oAfter = M.drawAfterUnits;
M.drawAfterUnits = function (ctx, b, T) {
  if (oAfter) oAfter.apply(this, arguments);
  if (b.arena && M.TITAN && M.TITAN.lip) M.TITAN.lip(ctx, b, T);
  // what falls in the first phase (天降), over the units
  (b.omens || []).forEach(o => { if (o.rain && M.TITAN && M.TITAN.drop) { const q = (T - (o.until - 0.42)) / 0.42; if (q > 0 && q <= 1) M.TITAN.drop(ctx, o.rain, o.x, o.y, q, T); } });
};
const oFx = M.drawFxPx;
M.drawFxPx = function (ctx, f, T, b) {
  if (f.k === 'fbwave') { const q = (T - f.t0) / f.life, R = (f.r || 250) * (0.3 + 0.8 * q); if (q >= 1) return true; ctx.save(); ctx.globalAlpha = (1 - q) * 0.9; M.pxRing(ctx, f.x, f.y, R, R / 1.2, PL.cream || '#f4efe0', { dense: 0.5, w: 3 }); M.pxRing(ctx, f.x, f.y, R * 0.85, R * 0.85 / 1.2, '#ff9a6a', { dense: 0.4, w: 2 }); ctx.restore(); return true; }
  if (f.k === 'fbsweep') {
    const q = (T - f.t0) / f.life; if (q >= 1) return true; const dir = f.dir || -1, n = 26, a0 = -f.half + q * 2 * f.half;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 5; j++) { const a = a0 - j * 0.12; if (a < -f.half) break; ctx.globalAlpha = (1 - q) * (0.8 - j * 0.14); ctx.fillStyle = j ? '#ff9a6a' : '#fff2e0'; for (let i = 0; i < n; i++) { const rr = f.r * (0.25 + 0.75 * i / n), px = f.x + dir * Math.cos(a) * rr, py = f.y + Math.sin(a) * rr / 1.2; ctx.fillRect(Math.round(px / 4) * 4 - 4, Math.round(py / 4) * 4 - 4, 8, 8); } }
    ctx.restore(); return true;
  }
  return oFx ? oFx.apply(this, arguments) : false;
};
const oHud = M.drawBattleHudPx;
M.drawBattleHudPx = function (ctx, b, T) {
  if (oHud) oHud.apply(this, arguments);
  if (M.uiScreen && !M.uiScreen()) return;   // pinned to the screen: the screen pass only (mc-omen.js)
  const e = b.ents.find(x => x.boss && x.side === 'E' && (b.cfg.fb || b.cfg.mb)); if (!e || T < (e.entryT || 0) + 0.3) return;
  const U = M.bUI; if (!U) return;
  const W = 900, H = 22, X = 960 - W / 2, Y = 52, k = clamp(e.hp / e.maxHp, 0, 1), fb = !!e.fb;
  U.text(ctx, e.nm || e.d.n, 960, Y - 22, fb ? 32 : 26, fb ? PL.butter : PL.pink, { drop: 3 });
  U.R(ctx, X - 4, Y - 4, W + 8, H + 8, PL.ink);
  M.hpBar(ctx, X, Y, W, H, e, { hp: e.hp, max: e.maxHp, col: PL.red, hi: PL.pink, lo: PL.wine, T, frame: false });   // two layers and ticks (mc-hpbar.js)
  if (fb) { const A = e.ai; U.R(ctx, X + W * 0.5 - 2, Y - 6, 4, H + 12, A && A.phase === 2 ? PL.red : PL.gold); }
};

// ───────── first-look cards (mc-guide.js) ─────────
const fieldRect = (x0, y0, x1, y1) => ({ x: Math.max(10, x0), y: Math.max(10, y0 + 180), w: Math.min(1910, x1) - Math.max(10, x0), h: y1 - y0 });
if (M.GUIDE) M.GUIDE.push(
  { id: 'omen', cat: '战斗', icon: 't_sword', title: '警示圈', line: '技能要落下的地方，里面填满就放出来；红色是敌人的。', scr: 'battle', freeze: 1, at: (g) => { const b = g.battle, o = b && (b.omens || []).find(o => o.shape === 'circle' && b.t - o.t0 > 0.1); if (!o) return null; const x = o.ent ? o.ent.x : o.x, y = o.ent ? o.ent.y : o.y; return fieldRect(x - o.r, y - o.r / 1.2, x + o.r, y + o.r / 1.2); } },
  { id: 'elite', cat: '战斗', icon: 'u_star', title: '精英', line: '不朽的敌人，更强，打倒它积分更多。', scr: 'battle', freeze: 1, at: (g) => { const b = g.battle, e = b && b.ents.find(u => u.alive && u.elite && !u.boss && b.t > (u.entryT || 0) + 1); if (!e) return null; const h = 88 * e.sz; return fieldRect(e.x - 60, e.y - h - 80, e.x + 60, e.y + 10); } },
  { id: 'fboss', cat: '战斗', icon: 'e_skull', title: '最终首领', line: '区域尽头的首领，站在自己的地形里；血条过半进入第二阶段。', scr: 'battle', freeze: 1, at: (g) => { const b = g.battle, e = b && b.ents.find(u => u.fb && u.alive && u.ai && u.ai.st === 'idle'); return e ? fieldRect(EDGE, 60, 1910, 700) : null; } },
);

// ───────── 第二阶段的仪式 (real time, over the frozen fight) ─────────
// 0.0 the fight stops, the screen dims, red cracks run out of the boss, a heartbeat · 0.7 the roar: white-red flash, three
// shock rings, the army is shoved back, a hard shake · 0.9 「第二阶段」 drops in letter by letter, its roar name under it ·
// 2.6 the dim lifts and the fight goes on
const P2_LEN = 2.9;
BP.step = (function (o) { return function () { if (this.p2) return; return o.apply(this, arguments); }; })(BP.step);
const G = M.Game && M.Game.prototype;
if (G) {
  const FIELD_Y = 180, U = M.UI, now = () => performance.now();
  const at = (g, e) => { const p = g.camField ? g.camField(e.x + FB_DX, FB_Y - 170) : { x: e.x, y: e.y - 160 }; return { x: p.x, y: p.y + FIELD_Y }; };
  const once = (P, k, t, fn) => { if (P.t >= t && !P.fired[k]) { P.fired[k] = 1; try { fn(); } catch (err) {} } };
  const oTick = G.tick;
  G.tick = function (dt) {
    const r = oTick.apply(this, arguments), b = this.battle, P = b && b.p2; if (!P) return r;
    if (this.screen !== 'battle' || b.over || !P.e.alive) { b.p2 = null; if (P.e.ai) { P.e.ai.st = 'idle'; P.e.ai.t = b.t + 0.3; } return r; }
    const t1 = now(); P.t += Math.min(0.05, (t1 - (P.last || t1)) / 1000); P.last = t1;
    once(P, 'beat', 0.05, () => { S.heart ? S.heart() : S.tick && S.tick(6); this.fx.kick && this.fx.kick(6); });
    once(P, 'beat2', 0.4, () => { S.heart ? S.heart() : S.tick && S.tick(8); this.fx.kick && this.fx.kick(8); });
    once(P, 'roar', 0.7, () => { S.impact && S.impact(); S.boom && S.boom(); this.fx.kick && this.fx.kick(26); b.flash = 0.6; b.flashCol = '#ff4a3a';
      if (M.TITAN && M.TITAN.impact) M.TITAN.impact(b, P.e, 'roar', P.e.x + FB_DX, FB_Y - 200);
      b.ents.forEach(u => { if (u.alive && u.side !== P.e.side) { u.x = Math.max(170, u.x - 90); u.kb = b.t; u.kbDir = -1; } }); });
    once(P, 'title', 0.9, () => { S.stamp && S.stamp(); });
    const fc = this.ui && this.ui.cv && this.ui.cv('fx');
    if (fc) { const g = fc.getContext('2d'), c = at(this, P.e), T = P.t, fade = Math.min(1, T / 0.25) * Math.min(1, (P2_LEN - T) / 0.35);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 0.62 * fade; g.fillStyle = '#07060f'; g.fillRect(0, 0, 1920, 1080);
      // red glow and cracks out of the boss
      g.globalAlpha = fade; const gr = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, 420); gr.addColorStop(0, 'rgba(255,74,58,0.55)'); gr.addColorStop(1, 'rgba(255,74,58,0)'); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(c.x - 420, c.y - 420, 840, 840); g.globalCompositeOperation = 'source-over';
      const cr = Math.min(1, T / 0.7); g.strokeStyle = '#ff5a3a'; g.lineWidth = 6; for (let i = 0; i < 9; i++) { let a = i * 0.7 + 0.3, x = c.x, y = c.y; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6 * cr; k++) { a += (k % 2 ? 0.35 : -0.35); x += Math.cos(a) * 60; y += Math.sin(a) * 40; g.lineTo(x, y); } g.stroke(); }
      // the roar's rings
      if (T > 0.7) for (let k = 0; k < 3; k++) { const q = (T - 0.7 - k * 0.12) / 0.8; if (q <= 0 || q >= 1) continue; g.globalAlpha = fade * (1 - q); g.strokeStyle = k === 1 ? '#ffffff' : '#ff4a3a'; g.lineWidth = 14 - k * 3; g.beginPath(); g.ellipse(c.x, c.y, 40 + q * 1100, 30 + q * 620, 0, 0, 7); g.stroke(); }
      if (T > 0.7 && T < 0.9) { g.globalAlpha = (0.9 - T) / 0.2 * 0.7; g.fillStyle = '#ffe6d8'; g.fillRect(0, 0, 1920, 1080); }
      // 第二阶段, letter by letter, and the boss's own roar under it
      if (T > 0.9 && U) { const w = [...(M.tr ? M.tr('第二阶段') : '第二阶段')], n = w.length;
        // another language (src/mc-i18n.js): a CJK word still lands letter by letter; a word in letters lands whole
        if (n > 6) { const q = (T - 0.9) / 0.3, k = q < 1 ? 1 + 1.4 * (1 - q) : 1; g.globalAlpha = fade * Math.min(1, q * 2); g.save(); g.translate(960, 420); g.scale(k, k); U.text(g, w.join(''), 0, 0, Math.min(120, Math.floor(2600 / n)), '#ff4a3a', { outline: true }); g.restore(); }
        else for (let i = 0; i < n; i++) { const q = (T - 0.9 - i * 0.1) / 0.18; if (q <= 0) continue; const k = q < 1 ? 1 + 1.4 * (1 - q) : 1; g.globalAlpha = fade * Math.min(1, q * 2); g.save(); g.translate(960 + (i - (n - 1) / 2) * 130, 420); g.scale(k, k); U.text(g, w[i], 0, 0, 120, '#ff4a3a', { outline: true }); g.restore(); }
        if (T > 1.4) { g.globalAlpha = fade * Math.min(1, (T - 1.4) / 0.3); U.text(g, (P.e.fb && P.e.fb.names && P.e.fb.names.roar) || '狂暴', 960, 540, 44, '#ffe08a', { outline: true }); } }
      g.restore(); }
    if (P.t >= P2_LEN) { b.p2 = null; const A = P.e.ai; if (A) { A.st = 'idle'; A.t = b.t + 0.3; } }
    return r;
  };
  const oLS = G.longShow; if (oLS) G.longShow = function () { return !!(this.battle && this.battle.p2) || oLS.apply(this, arguments); };
}
})();
