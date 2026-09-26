// ==== mc-knock.js ====
(function () {
// Knockback, knockdown and launches (user rulings 2026-09-26; after Hero's Hour). How hard a hit throws a unit depends
// on how much of its life the hit took, how heavy the attacker is and how heavy the target is — a strong unit throws a
// weak one, a weak unit barely moves a strong one, so quality and power show without any extra rule.
//   push = force(attacker) × (share of max life taken)^0.7 ÷ √mass(target)
// Three looks, each its own (user: 「击退，击飞，击倒，不同情况，应该用不同表现」):
//   · 击退 (knockback): slides back on its feet, leaning away from the blow, dust and a skid mark.
//   · 击倒 (knockdown): thrown flat on its back where it stood (a short slide), lies there a moment, gets up.
//   · 击飞 (launch) = knocked down and flying: tips over backwards as it goes up — no somersaults — lands lying flat,
//     bounces once, lies there, gets up.
//   A hit that knocks down or launches lands with weight: a short freeze, a burst at the point of impact, the screen
//   shakes; a much stronger unit (two qualities above, an elite, a boss) adds a shock ring.
//   · Death: the body goes down (or flies, if the blow was big), flashes red, lets out a wisp of its soul and fades out
//     in dithered steps — no white silhouette.
// Melee pushes along the blow, shots push a little, skills and crits harder, explosions push outwards from the blast.
// A thrown unit that crashes into its own side knocks it along; the edge of the field bounces it back.
// Leaders and bosses are never moved; every attack a leader or a boss makes shakes the screen.
// Units face what they are fighting (user: 「角色战斗的时候朝向不对，应该朝向自己攻击的目标」).
const M = window.MC, S = M.Sfx, PL = (M.PJ && M.PJ.PAL) || {}, RM = () => !!(M.PJ && M.PJ.reduced);
const BP = M.Battle3.prototype;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const G = 2600, FRIC = 2300, LIE = 1.5, RISE = 0.22, FALL = 0.12;
M.KB = { K: 1.25, slide: 0.13, down: 0.28, launch: 0.42 };
const immune = (e) => !!(e.isHero || e.boss || e.bench || e.leap);
const qOf = (e) => (e.d && e.d.q) || 0;
const mass = (e) => (e.sz || 1) * (e.sz || 1) * (1 + 0.35 * qOf(e)) * (e.elite ? 1.4 : 1) * (e.summon ? 0.7 : 1);
const force = (e) => !e ? 1 : e.isHero ? 2.2 : e.boss ? 2.4 : (e.sz || 1) * (1 + 0.25 * qOf(e)) * (e.elite ? 1.2 : 1);
const gapOf = (src, tg) => (src ? qOf(src) + (src.elite ? 1 : 0) + (src.boss || src.isHero ? 2 : 0) : 0) - qOf(tg);
M.faceOf = (e) => (e.face || (e.side === 'E' ? -1 : 1));

// ───────── the impulse ─────────
BP.kbImpact = function (src, tg, I, level) {
  const big = level >= 2, gap = gapOf(src, tg), y = tg.y - 40 * (tg.sz || 1);
  this.hs = Math.max(this.hs || 0, Math.min(0.1, (big ? 0.05 : 0.03) + I * 0.04 + (gap >= 2 ? 0.02 : 0)));
  this.shake = Math.max(this.shake, Math.min(16, (big ? 6 : 4) + I * 8 + (gap >= 2 ? 3 : 0)));
  this.fxp({ k: 'kbhit', x: tg.x, y, r: 26 + I * 40 + (big ? 14 : 0), life: 0.22 });
  if (gap >= 2) this.fxp({ k: 'kbwave', x: tg.x, y: tg.y, r: 120 + I * 90, life: 0.35 });
  this.dust(tg.x, tg.y, big ? 8 : 5); S.hit && S.hit();
};
BP.knock = function (src, tg, dealt, o, from) {
  if (M.KB.off || !tg || immune(tg) || !(dealt > 0) || o.silent || o.reflect || o.noKb) return;
  const T = this.t, killed = !tg.alive;
  const fx = from ? from.x : src ? src.x : tg.x - M.faceOf(tg), fy = from ? from.y : src ? src.y : tg.y;
  let dx = tg.x - fx, dy = (tg.y - fy) * 0.5; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
  if (!from && Math.abs(dx) < 0.3) { dx = -M.faceOf(tg); dy = 0; }
  const share = cl(dealt / Math.max(1, tg.maxHp), 0, 1), kind = from ? 1.2 : o.ranged ? 0.55 : 1, heavy = (o.skill ? 1.4 : 1) * (o.crit ? 1.5 : 1) * (o.big ? 1.2 : 1);
  let I = M.KB.K * force(src) * kind * heavy * Math.pow(share, 0.7) / Math.sqrt(mass(tg));
  const dir = dx >= 0 ? 1 : -1;
  if (killed) {
    // a big killing blow throws the body; otherwise it went down where it stood (M.kbDie)
    if (I >= M.KB.down * 0.8) { const Ik = Math.max(I, 0.4), vz = Math.min(1050, 480 + Ik * 700), vx = Math.min(420, 160 + Ik * 320);
      tg.down = null; tg.air = { z: 0, vz, vx: dx * vx, vy: dy * vx * 0.4, rot: 0, tilt: dir * LIE, bounced: 0 }; tg.trail = []; tg.landT = null;
      if (Ik > 0.7) this.kbImpact(src, tg, Ik, 2); }
    return;
  }
  if (tg.casting) I *= 0.4;                                    // a unit mid-cast only sways
  if (tg.air) { const a = tg.air; a.vz = Math.max(a.vz, 0) + Math.min(420, I * 600); a.vx += dx * Math.min(160, I * 240); tg.kbLock = Math.max(tg.kbLock || 0, T + 0.2); return; }   // juggled
  if (I < M.KB.slide) return;
  if (I < M.KB.down) {   // 击退
    const v0 = 230 + I * 900; tg.slide = { vx: dx * v0, vy: dy * v0 * 0.6, t0: T, dir }; tg.kbLock = Math.max(tg.kbLock || 0, T + 0.06 + I * 0.3);
    this.skid(tg.x, tg.y, dx); if (I > 0.2) this.fxp({ k: 'kbhit', x: tg.x, y: tg.y - 40 * (tg.sz || 1), r: 18 + I * 30, life: 0.16 }); return;
  }
  if (I < M.KB.launch) {   // 击倒
    const v0 = 180 + I * 520, dur = 0.3 + I * 0.4; tg.slide = { vx: dx * v0, vy: dy * v0 * 0.5, t0: T, dir }; tg.down = { rot: dir * LIE, t: T, dur };
    tg.kbLock = Math.max(tg.kbLock || 0, T + dur + RISE); this.skid(tg.x, tg.y, dx); this.kbImpact(src, tg, I, 1); return;
  }
  // 击飞: knocked down and flying — up high, down close (the drama is the height)
  const vz = Math.min(950, 420 + (I - M.KB.launch) * 900), vx = Math.min(340, 110 + I * 240);
  tg.air = { z: 0, vz, vx: dx * vx, vy: dy * vx * 0.4, rot: 0, tilt: dir * LIE, bounced: 0 }; tg.trail = []; tg.slide = null; tg.down = null;
  tg.kbLock = Math.max(tg.kbLock || 0, T + 2); this.kbImpact(src, tg, I, 2);
  S.whoosh && S.whoosh(0.15);
};
BP.skid = function (x, y, dx) { this.fxp({ k: 'skid', x0: x, y, dx, life: 1.4, len: 0 }); };
// a death: the body goes down where it stood (knock() may throw it instead), flashes red, lets its soul out, fades
M.kbDie = function (b, e, src) {
  if (e.fb) return;   // a final boss sinks into its arena (mc-bossfight.js)
  const T = b.t, dir = src ? (e.x >= src.x ? 1 : -1) : -M.faceOf(e);
  e.fling = true; e.dieT = T; e.slide = null; e.down = { rot: dir * LIE, t: T, dur: 99 }; e.landT = T + FALL;
  const P16 = M.P16, Pz = P16 && P16.Pool && (b.p16 || (b.p16 = new P16.Pool())), ramp = P16 && P16.rampFor ? P16.rampFor((M.RACES || {})[e.d && e.d.race] || '#c890ff') : 'arcane';
  if (Pz) for (let i = 0; i < 6 + qOf(e) * 3; i++) Pz.add(3, e.x + (Math.random() - 0.5) * 30 * (e.sz || 1), e.y - 30 * (e.sz || 1) - Math.random() * 30, (Math.random() - 0.5) * 20, -70 - Math.random() * 60, 0.7 + Math.random() * 0.5, ramp, { sz: i % 3 ? 1 : 2 });
};

// ───────── motion ─────────
BP.kbStep = function (dt) {
  const T = this.t;
  this.ents.forEach(e => {
    if (e.slide) {
      const s = e.slide, v = Math.hypot(s.vx, s.vy); if (v < 30) { e.slide = null; return; }
      const nv = Math.max(0, v - FRIC * dt), k = nv / v; s.vx *= k; s.vy *= k; e.x += s.vx * dt; e.y += s.vy * dt;
      const sk = this.fx.find(f => f.k === 'skid' && f.x0 != null && Math.abs(f.y - e.y) < 40 && T - f.t0 < 0.5 && !f.done && Math.abs(f.x0 - e.x) < 220); if (sk) { sk.len = e.x - sk.x0; sk.y = e.y; }
      if (Math.random() < dt * 30) this.dust(e.x, e.y, 1);
      if (e.alive) this.kbBump(e, s);
    }
    if (e.air) {
      const a = e.air; a.vz -= G * dt; a.z += a.vz * dt; e.x += a.vx * dt; e.y += a.vy * dt; a.rot += (a.tilt - a.rot) * Math.min(1, dt * 5);   // tips over backwards on the way up
      if (!RM() && (e.trail.length === 0 || Math.hypot(e.x - e.trail[0][0], e.y - a.z - e.trail[0][1]) > 30)) { e.trail.unshift([e.x, e.y - a.z, a.rot, T]); if (e.trail.length > 2) e.trail.pop(); }
      if (e.alive) this.kbBump(e, a);
      if ((e.x < 172 && a.vx < 0) || (e.x > 2048 && a.vx > 0)) { a.vx *= -0.35; this.shake = Math.max(this.shake, 4); this.dust(e.x, e.y, 6); S.hit && S.hit(); }
      if (a.z <= 0) {
        a.z = 0;
        if (a.vz < -260 && a.bounced < 1) { a.vz = -a.vz * 0.25; a.vx *= 0.4; a.bounced++; this.kbLand(e, 0.6); }
        else { this.kbLand(e, 1); e.air = null; e.trail = null; e.down = { rot: a.tilt, t: T - FALL, dur: e.alive ? 0.35 : 99 }; if (e.alive) e.kbLock = Math.max(e.kbLock || 0, T + 0.35 + RISE); else e.landT = T; }
      }
    }
    if (e.down && e.alive && T - e.down.t > e.down.dur + RISE) e.down = null;
  });
};
BP.kbLand = function (e, k) {
  const m = mass(e); this.fxp({ k: 'kbland', x: e.x, y: e.y, r: 40 + 30 * Math.sqrt(m) * k, life: 0.45 }); this.dust(e.x, e.y, Math.round(6 * k));
  this.shake = Math.max(this.shake, Math.min(9, 2 + m * 2.5) * k); if (k >= 1) { S.land ? S.land() : S.hit && S.hit(); }
};
// a thrown unit crashing into its own side knocks it along
BP.kbBump = function (e, v) {
  const sp = Math.hypot(v.vx, v.vy); if (sp < 250) return;
  this.ents.forEach(o => {
    if (o === e || !o.alive || o.side !== e.side || immune(o) || o.air || !this.active(o)) return;
    if (Math.hypot(o.x - e.x, (o.y - e.y) * 1.2) > 42 * ((o.sz || 1) + (e.sz || 1)) / 2) return;
    const key = e.id + ':' + o.id, T = this.t; this._kbHit = this._kbHit || {}; if (this._kbHit[key] && T - this._kbHit[key] < 0.4) return; this._kbHit[key] = T;
    const pass = 0.45 * Math.sqrt(mass(e) / mass(o)); o.slide = { vx: v.vx * pass, vy: v.vy * pass * 0.5, t0: T, dir: v.vx >= 0 ? 1 : -1 }; o.kbLock = Math.max(o.kbLock || 0, T + 0.12);
    v.vx *= 0.7; v.vy *= 0.7; this.dust(o.x, o.y, 3); this.skid(o.x, o.y, Math.sign(v.vx) || 1); S.hit && S.hit();
  });
};
// a boss's blow: thrown up (击飞) or knocked flat (击倒) whatever the numbers say (mc-bossfight.js)
BP.launch = function (tg, vx, vy, lift) {
  if (!tg || !tg.alive || immune(tg)) return; const T = this.t;
  if (tg.air) { tg.air.vz = Math.max(tg.air.vz, 0) + 380 + lift * 200; tg.air.vx += vx * 0.5; tg.kbLock = Math.max(tg.kbLock || 0, T + 0.3); return; }
  tg.air = { z: 0, vz: Math.min(1150, 540 + lift * 420), vx, vy, rot: 0, tilt: (vx >= 0 ? 1 : -1) * LIE, bounced: 0 }; tg.trail = []; tg.slide = null; tg.down = null;
  tg.kbLock = Math.max(tg.kbLock || 0, T + 2); this.fxp({ k: 'kbhit', x: tg.x, y: tg.y - 40 * (tg.sz || 1), r: 60, life: 0.22 });
};
BP.knockDown = function (tg, dur) {
  if (!tg || !tg.alive || immune(tg) || tg.air) return; const T = this.t;
  tg.down = { rot: (Math.random() < 0.5 ? -1 : 1) * LIE, t: T, dur }; tg.kbLock = Math.max(tg.kbLock || 0, T + dur + RISE); tg.slide = null; this.dust(tg.x, tg.y, 3);
};
// how a unit stands right now: turned about its feet (lying, tipping over in the air, leaning back as it slides)
M.kbPose = function (e, T) {
  if (e.air) return { rot: e.air.rot, py: 0 };
  const d = e.down; if (d) { const age = T - d.t; let k = age < FALL ? Math.sin(Math.min(1, age / FALL) * Math.PI / 2) : age < d.dur ? 1 : 1 - Math.min(1, (age - d.dur) / RISE); if (!e.alive) k = Math.max(k, age < FALL ? k : 1); return { rot: d.rot * k, py: 0 }; }
  const s = e.slide; if (s && s.dir) { const f = cl(1 - (T - s.t0) / 0.35, 0, 1); return { rot: s.dir * 0.28 * f, py: 0 }; }
  return { rot: 0, py: 0 };
};
// a body fades out in four steps, half a second after it lies still
M.kbCorpseA = (e, T) => (e.landT ? Math.ceil(cl(1 - (T - e.landT - 0.5) / 0.6, 0, 1) * 4) / 4 : 1);

// ───────── hooks ─────────
const oStep = BP.step;
BP.step = function (dt) {
  if (dt > 0 && !(this.hs > 0)) this.kbStep(this.slow > 0 ? dt * 0.2 : dt);
  const r = oStep.apply(this, arguments);
  // face the target (a little dead zone so a unit does not flicker when its target is straight above or below)
  for (const e of this.ents) { if (!e.alive || e.fb || e.air || e.down) continue; if (e.isHero && e.bench) { e.face = 1; continue; } const tg = e.target; if (tg && tg.alive) { const dx = tg.x - e.x; if (Math.abs(dx) > 14) e.face = dx > 0 ? 1 : -1; } }
  return r;
};
const oDeal = BP.deal;
BP.deal = function (src, tg, amt, o = {}) {
  const was = tg && tg.alive, d = oDeal.call(this, src, tg, amt, o);
  if (was && d > 0) { try { this.knock(src, tg, d, o, this._kbFrom); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('knock: ' + e.message); } }
  return d;
};
// blasts push outwards from where they go off
['aoe', 'explode'].forEach(k => { const o = BP[k]; if (!o) return; BP[k] = function () { const a = arguments, from = k === 'aoe' ? { x: a[1], y: a[2] } : { x: a[0], y: a[1] }; const was = this._kbFrom; this._kbFrom = from; try { return o.apply(this, a); } finally { this._kbFrom = was; } }; });
// every attack by a leader or a boss shakes the screen
const oAtk = BP.attack;
BP.attack = function (e, tg) { const r = oAtk.apply(this, arguments); if (e && (e.isHero || e.boss)) this.shake = Math.max(this.shake, e.boss ? 11 : 7); return r; };
// on the ground or in the air a unit shows its hurt pose; a dead one its dead pose
if (M.P16 && M.P16.animOf) { const oA = M.P16.animOf; M.P16.animOf = function (e, T) { if (!e.alive && !e.fb) return { st: 'dead', f: 0, rim: 0 }; if (e.air || e.down) return { st: 'hurt', f: 0, rim: 0 }; return oA.apply(this, arguments); }; }

// ───────── drawing ─────────
// skid marks on the floor (under the units), landing rings, the burst of a heavy hit and the shock ring of a far stronger unit
M.drawKbFloor = function (ctx, b, T) {
  b.fx.forEach(f => {
    if (f.k !== 'skid' || !f.len) return; const q = (T - f.t0) / f.life; if (q >= 1) return;
    ctx.save(); ctx.globalAlpha = 0.35 * (1 - q); ctx.fillStyle = PL.ink; const x0 = Math.min(f.x0, f.x0 + f.len), w = Math.abs(f.len);
    ctx.fillRect(Math.round(x0), Math.round(f.y - 6), Math.round(w), 4); ctx.fillRect(Math.round(x0), Math.round(f.y + 4), Math.round(w * 0.8), 3); ctx.restore();
  });
};
M.drawKbTrail = function (ctx, e, img, T) {
  e.trail.forEach(([x, y, rot, t0], i) => {
    const a = (0.26 - i * 0.1) * cl(1 - (T - t0) / 0.25, 0, 1); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); if (M.faceOf(e) < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -(img.cx || img.width / 2), -(img.footY || img.height)); ctx.restore();
  });
};
const sqr = (ctx, x, y, s) => ctx.fillRect(Math.round(x / 4) * 4 - s / 2, Math.round(y / 4) * 4 - s / 2, s, s);
const oFx = M.drawFxPx;
M.drawFxPx = function (ctx, f, T, b) {
  if (f.k === 'kbland') { const q = (T - f.t0) / f.life; if (q >= 1) return true; ctx.save(); ctx.globalAlpha = 1 - q; if (M.pxRing) M.pxRing(ctx, f.x, f.y, f.r * (0.4 + q), f.r * 0.3 * (0.4 + q), PL.cream || '#f4efe0', { dense: 1.1, w: 3 }); ctx.restore(); return true; }
  if (f.k === 'kbhit') {
    const q = (T - f.t0) / f.life; if (q >= 1) return true; ctx.save(); ctx.globalAlpha = 1 - q * q;
    ctx.fillStyle = q < 0.3 ? (PL.white || '#fff') : (PL.butter || '#fff3b0'); const r0 = f.r * (0.35 + q), r1 = f.r * (0.8 + q * 0.9);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + (i % 2) * 0.2; for (let t = 0; t < 1; t += 0.25) sqr(ctx, f.x + Math.cos(a) * (r0 + (r1 - r0) * t), f.y + Math.sin(a) * (r0 + (r1 - r0) * t) * 0.8, i % 2 ? 4 : 8); }
    if (q < 0.2) { sqr(ctx, f.x, f.y, 16); } ctx.restore(); return true;
  }
  if (f.k === 'kbwave') { const q = (T - f.t0) / f.life; if (q >= 1) return true; ctx.save(); ctx.globalAlpha = (1 - q) * 0.9; if (M.pxRing) { M.pxRing(ctx, f.x, f.y, f.r * (0.3 + q), f.r * 0.32 * (0.3 + q), PL.white || '#fff', { dense: 0.9, w: 3 }); M.pxRing(ctx, f.x, f.y, f.r * (0.2 + q * 0.8), f.r * 0.26 * (0.2 + q * 0.8), PL.gold || '#ffcf4a', { dense: 0.7, w: 2 }); } ctx.restore(); return true; }
  if (f.k === 'kbpop') return true;
  if (f.k === 'skid') return true;
  return oFx ? oFx.apply(this, arguments) : false;
};
})();

;
