// ==== mc-bossfight.js ====
(function () {
// Boss fights (user ruling 2026-09-26). A boss fights alone.
// Final boss — the end of a scene: the right of the field is its arena (lava, sea, roots … impassable), the boss rises
//   out of it, only its upper body showing, and never moves. Melee units fight it from the edge. It strikes rarely and
//   hard: every blow charges behind a red mark that fills up, shakes the screen and throws units.
//   · 震击 (slam): both fists come down in front of it — everything in the ring is thrown up, everyone else on the field
//     is knocked flat by the shockwave.
//   · 扫臂 (sweep): one arm swings across a wide fan in front of it — everything in the fan is thrown.
//   · below half its life it roars into its second phase and adds its own rain (demon: meteors; druid: thorns; …): a
//     string of red marks across the field, then whatever falls, falls on them.
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
// numbers (per target, × the boss's attack): tuned against the shown power (docs/design.md §8.3)
const FBK = M.FBK = { slam: 0.6, sweep: 0.35, rain: 0.45, windSlam: 1.45, windSweep: 1.55, windRain: 1.3, rest: 1.4, slamR: 250, sweepR: 820, sweepHalf: 1.08, rainN: 7, rainR: 118, downT: 0.6 };
const MBK = M.MBK = { crush: 1.6, cleave: 1.2, every: 6.5, wind: [1.1, 1.2], crushR: 170, cleaveR: 300, cleaveHalf: 0.9 };

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
function pickLane(b, e) {
  const us = b.ents.filter(u => b.active(u) && u.side === 'A'); let best = 0, bn = -1;
  [270, 390, 510].forEach(y => { const n = us.filter(u => inRing(u, SLAM_X, y, FBK.slamR)).length; if (n > bn || (n === bn && y === 390)) { bn = n; best = y - FB_Y; } });
  return best;
}
BP.fbBegin = function (e, k) {
  const A = e.ai, T = this.t, atk = e.atk; A.k = k; A.st = 'wind'; A.t0 = T; A.n++;
  const col = FOE;
  if (k === 'slam') { A.lane = pickLane(this, e); A.t = T + FBK.windSlam; A.om = this.omen({ shape: 'circle', x: SLAM_X, y: FB_Y + A.lane, r: FBK.slamR, t0: T, until: A.t, col, src: e, keep: 1 }); }
  else if (k === 'sweep') { A.t = T + FBK.windSweep; A.om = this.omen({ shape: 'sector', x: EDGE + 40, y: FB_Y, r: FBK.sweepR, half: FBK.sweepHalf, dir: -1, t0: T, until: A.t, col, src: e, keep: 1 }); }
  else if (k === 'rain') {
    const us = this.ents.filter(u => this.active(u) && u.side === 'A'), n = FBK.rainN;
    const y0 = us.length ? us[Math.floor(Math.random() * us.length)].y : FB_Y, y1 = 120 + Math.random() * 480, x0 = EDGE - 150, x1 = 320;
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
    this.ents.forEach(u => { if (!this.active(u) || u.side !== 'A') return; if (inRing(u, x, y, FBK.slamR)) hitU(u, FBK.slam, (u.x - x) * 0.8 - 120, (u.y - y) * 0.6, 1.3); else this.knockDown(u, FBK.downT); });
    this.shake = Math.max(this.shake, 30); this.hs = Math.max(this.hs || 0, 0.09); this.flash = Math.max(this.flash, 0.35); this.flashCol = '#fff2e0';
    this.fxp({ k: 'crack', x, y, life: 2.5 }); this.dust(x, y, 26); this.fxp({ k: 'fbwave', x, y, life: 0.7 }); this.ring(x, y - 10, 30, FBK.slamR * 1.1, '#ffd0a0', 14, 0.45);
    if (M.TITAN && M.TITAN.impact) M.TITAN.impact(this, e, 'slam', x, y);
    S.impact && S.impact(); S.boom && S.boom();
  } else if (k === 'sweep') {
    this.ents.forEach(u => { if (inFan(u, EDGE + 40, FB_Y, FBK.sweepR, FBK.sweepHalf)) hitU(u, FBK.sweep, -260 - Math.random() * 120, 180 + Math.random() * 60, 1.0); });
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
  if (A.phase === 1 && e.hp < e.maxHp * 0.5 && (A.st === 'idle' || A.st === 'recover')) {
    A.phase = 2; A.st = 'roar'; A.t0 = T; A.t = T + 1.5; this.shake = Math.max(this.shake, 22); this.flash = Math.max(this.flash, 0.4); this.flashCol = '#ff4a3a';
    this.fxp({ k: 'ctitle', ent: e, text: (e.fb.names || {}).roar || '狂暴', col: FOE, tier: 3, side: 'E', life: 1.9 }); if (this.arena) this.arena.heat = 1; S.impact && S.impact();
    if (M.TITAN && M.TITAN.impact) M.TITAN.impact(this, e, 'roar', e.x + FB_DX, FB_Y - 200);
    return;
  }
  if (A.st === 'roar') { if (T >= A.t) { A.st = 'idle'; A.t = T + 0.3; } else if (Math.random() < 0.25) this.shake = Math.max(this.shake, 10); return; }
  if (A.st === 'idle' && T >= A.t) {
    const seq = A.phase === 1 ? ['slam', 'sweep'] : ['slam', 'rain', 'sweep', 'rain'];
    this.fbBegin(e, seq[(A.phase === 1 ? A.n : A.n2 = (A.n2 || 0) + 1) % seq.length]); return;
  }
  if (A.st === 'wind') {
    if (A.k === 'rain') { this.fbRainTick(e); if (T >= A.t) { A.st = 'recover'; A.t = T + FBK.rest * 0.7; } return; }
    if (T >= A.t) this.fbStrike(e); return;
  }
  if (A.st === 'strike' && T >= A.t) { A.st = 'recover'; A.t = T + FBK.rest; return; }
  if (A.st === 'recover' && T >= A.t) { A.st = 'idle'; A.t = T + 0.15; }
};

// ───────── the small boss ─────────
BP.mbTick = function (e) {
  const A = e.mbAi, T = this.t; if (!A || !e.alive || this.opening || e.casting || T < A.next) return;
  const tg = e.target && e.target.alive ? e.target : this.nearestFoe(e, 2000); if (!tg || Math.hypot(tg.x - e.x, tg.y - e.y) > 420) { A.next = T + 0.5; return; }
  const k = A.n++ % 2 ? 'cleave' : 'crush', dur = MBK.wind[k === 'crush' ? 0 : 1];
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
  // what falls in the second phase, over the units
  (b.omens || []).forEach(o => { if (o.rain && M.TITAN && M.TITAN.drop) { const q = (T - (o.until - 0.42)) / 0.42; if (q > 0 && q <= 1) M.TITAN.drop(ctx, o.rain, o.x, o.y, q, T); } });
};
const oFx = M.drawFxPx;
M.drawFxPx = function (ctx, f, T, b) {
  if (f.k === 'fbwave') { const q = (T - f.t0) / f.life; if (q >= 1) return true; ctx.save(); ctx.globalAlpha = (1 - q) * 0.9; M.pxRing(ctx, f.x, f.y, 60 + q * 1500, (60 + q * 1500) / 1.2, PL.cream || '#f4efe0', { dense: 0.5, w: 3 }); M.pxRing(ctx, f.x, f.y, 40 + q * 1350, (40 + q * 1350) / 1.2, '#ff9a6a', { dense: 0.4, w: 2 }); ctx.restore(); return true; }
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
  e._hpLag = e._hpLag == null ? k : Math.max(k, e._hpLag - 0.35 * (1 / 60));
  U.text(ctx, e.nm || e.d.n, 960, Y - 22, fb ? 32 : 26, fb ? PL.butter : PL.pink, { drop: 3 });
  U.R(ctx, X - 4, Y - 4, W + 8, H + 8, PL.ink); U.R(ctx, X, Y, W, H, PL.abyss);
  U.R(ctx, X, Y, W * e._hpLag, H, PL.cream); U.R(ctx, X, Y, W * k, H, PL.red); U.R(ctx, X, Y, W * k, 4, PL.pink); U.R(ctx, X, Y + H - 6, W * k, 6, PL.wine);
  if (fb) { const A = e.ai; U.R(ctx, X + W * 0.5 - 2, Y - 6, 4, H + 12, A && A.phase === 2 ? PL.red : PL.gold); }
};

// ───────── first-look cards (mc-guide.js) ─────────
const fieldRect = (x0, y0, x1, y1) => ({ x: Math.max(10, x0), y: Math.max(10, y0 + 180), w: Math.min(1910, x1) - Math.max(10, x0), h: y1 - y0 });
if (M.GUIDE) M.GUIDE.push(
  { id: 'omen', cat: '战斗', icon: 't_sword', title: '警示圈', line: '技能要落下的地方，里面填满就放出来；红色是敌人的。', scr: 'battle', freeze: 1, at: (g) => { const b = g.battle, o = b && (b.omens || []).find(o => o.shape === 'circle' && b.t - o.t0 > 0.1); if (!o) return null; const x = o.ent ? o.ent.x : o.x, y = o.ent ? o.ent.y : o.y; return fieldRect(x - o.r, y - o.r / 1.2, x + o.r, y + o.r / 1.2); } },
  { id: 'elite', cat: '战斗', icon: 'u_star', title: '精英', line: '不朽的敌人，更强，打倒它积分更多。', scr: 'battle', freeze: 1, at: (g) => { const b = g.battle, e = b && b.ents.find(u => u.alive && u.elite && !u.boss && b.t > (u.entryT || 0) + 1); if (!e) return null; const h = 88 * e.sz; return fieldRect(e.x - 60, e.y - h - 80, e.x + 60, e.y + 10); } },
  { id: 'fboss', cat: '战斗', icon: 'e_skull', title: '最终首领', line: '场景尽头的首领，站在自己的地形里；血条过半进入第二阶段。', scr: 'battle', freeze: 1, at: (g) => { const b = g.battle, e = b && b.ents.find(u => u.fb && u.alive && u.ai && u.ai.st === 'idle'); return e ? fieldRect(EDGE, 60, 1910, 700) : null; } },
  { id: 'scene', cat: '出征', icon: 'e_path', title: '场景', line: '每个世界分几个场景，按故事一个接一个；打倒场景尽头的首领才算通关。', scr: 'base', at: (g) => M.STELE_AT && M.STELE_AT.scene && M.STELE_AT.scene(g) },
);
})();
