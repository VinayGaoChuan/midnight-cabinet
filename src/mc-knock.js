// ==== mc-knock.js ====
(function () {
// Knockback and launches (user ruling 2026-09-26; after Hero's Hour). How far a hit throws a unit depends on how much
// of its life the hit took, how heavy the attacker is and how heavy the target is — so a strong unit throws a weak one
// across the field, a weak unit barely moves a strong one, and quality and power show without any extra rule.
//   push = force(attacker) × (share of max life taken)^0.7 ÷ √mass(target)
//   · tiny: a flinch · medium: slides back with dust and a skid mark, staggered for a moment · big: launched — spins in
//     the air with afterimages, lands with a bounce and a ring of dust, then gets up · a killing blow flings the body
//     (no effect on the fight, all spectacle).
// Melee pushes along the blow, shots push a little, skills and crits harder, explosions push outwards from the blast.
// A thrown unit that crashes into its own side knocks it along (bowling); the edge of the field bounces it back.
// Leaders and bosses are never moved; every attack a leader or a boss makes shakes the screen.
const M = window.MC, S = M.Sfx, PL = (M.PJ && M.PJ.PAL) || {}, RM = () => !!(M.PJ && M.PJ.reduced);
const BP = M.Battle3.prototype, QS = M.QSIZE || [1, 1.14, 1.3, 1.5];
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const G = 2600, FRIC = 2300;
M.KB = { K: 1.25, slide: 0.13, launch: 0.38 };
const immune = (e) => !!(e.isHero || e.boss || e.bench || e.leap);
const qOf = (e) => (e.d && e.d.q) || 0;
const mass = (e) => (e.sz || 1) * (e.sz || 1) * (1 + 0.35 * qOf(e)) * (e.elite ? 1.4 : 1) * (e.summon ? 0.7 : 1);
const force = (e) => !e ? 1 : e.isHero ? 2.2 : e.boss ? 2.4 : (e.sz || 1) * (1 + 0.25 * qOf(e)) * (e.elite ? 1.2 : 1);

// ───────── the impulse ─────────
BP.knock = function (src, tg, dealt, o, from) {
  if (M.KB.off || !tg || immune(tg) || !(dealt > 0) || o.silent || o.reflect || o.noKb) return;
  const T = this.t, killed = !tg.alive;
  const fx = from ? from.x : src ? src.x : tg.x - (tg.side === 'A' ? -1 : 1), fy = from ? from.y : src ? src.y : tg.y;
  let dx = tg.x - fx, dy = (tg.y - fy) * 0.5; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
  if (!from && Math.abs(dx) < 0.3) { dx = tg.side === 'A' ? -1 : 1; dy = 0; }
  const share = cl(dealt / Math.max(1, tg.maxHp), 0, 1), kind = from ? 1.2 : o.ranged ? 0.55 : 1, heavy = (o.skill ? 1.4 : 1) * (o.crit ? 1.5 : 1) * (o.big ? 1.2 : 1);
  let I = M.KB.K * force(src) * kind * heavy * Math.pow(share, 0.7) / Math.sqrt(mass(tg));
  if (killed) {
    // the body flies: always, and far for a big blow
    const Ik = Math.max(I, 0.35) * 1.6, vz = Math.min(1300, 420 + Ik * 900), vx = Math.min(1000, 220 + Ik * 700);
    tg.fling = true; tg.air = { z: 0, vz, vx: dx * vx, vy: dy * vx * 0.4, rot: 0, vr: (dx >= 0 ? 1 : -1) * (6 + Ik * 8), bounced: 0 };
    tg.trail = []; if (Ik > 0.9) { this.hs = Math.max(this.hs || 0, 0.05); this.shake = Math.max(this.shake, 8); }
    return;
  }
  if (tg.casting) I *= 0.4;                                    // a unit mid-cast only sways
  if (tg.air) { const a = tg.air; a.vz = Math.max(a.vz, 0) + Math.min(420, I * 600); a.vx += dx * Math.min(160, I * 240); tg.kbLock = Math.max(tg.kbLock || 0, T + 0.2); return; }   // juggled
  if (I < M.KB.slide) return;
  if (I < M.KB.launch) {
    const v0 = 230 + I * 900; tg.slide = { vx: dx * v0, vy: dy * v0 * 0.6, t0: T }; tg.kbLock = Math.max(tg.kbLock || 0, T + 0.06 + I * 0.3);
    this.skid(tg.x, tg.y, dx); return;
  }
  const vz = Math.min(950, 420 + (I - M.KB.launch) * 900), vx = Math.min(340, 110 + I * 240);   // up high, down close: the drama is the height
  tg.air = { z: 0, vz, vx: dx * vx, vy: dy * vx * 0.4, rot: 0, vr: (dx >= 0 ? 1 : -1) * (5 + I * 6), bounced: 0 }; tg.trail = []; tg.slide = null;
  tg.kbLock = Math.max(tg.kbLock || 0, T + 2);
  this.hs = Math.max(this.hs || 0, 0.035 + Math.min(0.04, I * 0.02)); this.shake = Math.max(this.shake, 4 + Math.min(10, I * 6));
  this.fxp({ k: 'kbpop', x: tg.x, y: tg.y - 40 * (tg.sz || 1), life: 0.18 });
  S.whoosh && S.whoosh(0.15);
};
BP.skid = function (x, y, dx) { this.fxp({ k: 'skid', x0: x, y, dx, life: 1.4, len: 0 }); };

// ───────── motion ─────────
BP.kbStep = function (dt) {
  const T = this.t;
  this.ents.forEach(e => {
    if (e.slide) {
      const s = e.slide, v = Math.hypot(s.vx, s.vy); if (v < 30) { e.slide = null; return; }
      const nv = Math.max(0, v - FRIC * dt), k = nv / v; s.vx *= k; s.vy *= k; e.x += s.vx * dt; e.y += s.vy * dt;
      const sk = this.fx.find(f => f.k === 'skid' && f.x0 != null && Math.abs(f.y - e.y) < 40 && T - f.t0 < 0.5 && !f.done && Math.abs(f.x0 - e.x) < 220); if (sk) { sk.len = e.x - sk.x0; sk.y = e.y; }
      if (Math.random() < dt * 30) this.dust(e.x, e.y, 1);
      this.kbBump(e, s);
    }
    if (e.air) {
      const a = e.air; a.vz -= G * dt; a.z += a.vz * dt; e.x += a.vx * dt; e.y += a.vy * dt; a.rot += a.vr * dt;
      if (!RM() && (e.trail.length === 0 || Math.hypot(e.x - e.trail[0][0], e.y - a.z - e.trail[0][1]) > 26)) { e.trail.unshift([e.x, e.y - a.z, a.rot, T]); if (e.trail.length > 3) e.trail.pop(); }
      if (e.alive) this.kbBump(e, a);
      // the edge of the field bounces it back
      if ((e.x < 172 && a.vx < 0) || (e.x > 2048 && a.vx > 0)) { a.vx *= -0.35; this.shake = Math.max(this.shake, 4); this.dust(e.x, e.y, 6); S.hit && S.hit(); }
      if (a.z <= 0) {
        a.z = 0;
        if (a.vz < -260 && a.bounced < 1) { a.vz = -a.vz * 0.3; a.vx *= 0.45; a.bounced++; this.kbLand(e, 0.6); }
        else { this.kbLand(e, 1); e.air = null; e.trail = null; if (e.alive) { e.down = { rot: Math.round(a.rot / (Math.PI / 2)) * (Math.PI / 2) * 0 + (a.vr > 0 ? 0.5 : -0.5), t: T }; e.kbLock = T + 0.22; } else e.landT = T; }
      }
    }
    if (e.down && T - e.down.t > 0.22) e.down = null;
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
    const pass = 0.45 * Math.sqrt(mass(e) / mass(o)); o.slide = { vx: v.vx * pass, vy: v.vy * pass * 0.5, t0: T }; o.kbLock = Math.max(o.kbLock || 0, T + 0.12);
    v.vx *= 0.7; v.vy *= 0.7; this.dust(o.x, o.y, 3); this.skid(o.x, o.y, Math.sign(v.vx) || 1); S.hit && S.hit();
  });
};
M.kbCorpseA = (e, T) => e.landT ? cl(1 - (T - e.landT - 0.5) / 0.6, 0, 1) : 1;

// ───────── hooks ─────────
const oStep = BP.step;
BP.step = function (dt) { if (dt > 0 && !(this.hs > 0)) this.kbStep(this.slow > 0 ? dt * 0.2 : dt); return oStep.apply(this, arguments); };
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

// ───────── drawing ─────────
// skid marks on the floor (under the units), landing rings and the pop of a launch (on top)
M.drawKbFloor = function (ctx, b, T) {
  b.fx.forEach(f => {
    if (f.k !== 'skid' || !f.len) return; const q = (T - f.t0) / f.life; if (q >= 1) return;
    ctx.save(); ctx.globalAlpha = 0.35 * (1 - q); ctx.fillStyle = PL.ink; const x0 = Math.min(f.x0, f.x0 + f.len), w = Math.abs(f.len);
    ctx.fillRect(Math.round(x0), Math.round(f.y - 6), Math.round(w), 4); ctx.fillRect(Math.round(x0), Math.round(f.y + 4), Math.round(w * 0.8), 3); ctx.restore();
  });
};
M.drawKbTrail = function (ctx, e, img, T) {
  e.trail.forEach(([x, y, rot, t0], i) => {
    const a = (0.32 - i * 0.1) * cl(1 - (T - t0) / 0.3, 0, 1); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(Math.round(x), Math.round(y)); ctx.translate(0, -44 * (e.sz || 1)); ctx.rotate(rot); ctx.translate(0, 44 * (e.sz || 1)); if (e.side === 'E') ctx.scale(-1, 1);
    ctx.drawImage(img, -(img.cx || img.width / 2), -(img.footY || img.height)); ctx.restore();
  });
};
const oFx = M.drawFxPx;
M.drawFxPx = function (ctx, f, T, b) {
  if (f.k === 'kbland') { const q = (T - f.t0) / f.life; if (q >= 1) return true; ctx.save(); ctx.globalAlpha = 1 - q; if (M.pxRing) M.pxRing(ctx, f.x, f.y, f.r * (0.4 + q), f.r * 0.3 * (0.4 + q), PL.cream || '#f4efe0', { dense: 1.1, w: 3 }); ctx.restore(); return true; }
  if (f.k === 'kbpop') { const q = (T - f.t0) / f.life; if (q >= 1) return true; ctx.save(); ctx.globalAlpha = 1 - q; const r = 18 + q * 40; ctx.fillStyle = PL.white || '#fff'; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.fillRect(Math.round(f.x + Math.cos(a) * r) - 4, Math.round(f.y + Math.sin(a) * r) - 4, i % 2 ? 6 : 10, i % 2 ? 6 : 10); } ctx.restore(); return true; }
  if (f.k === 'skid') return true;
  return oFx ? oFx.apply(this, arguments) : false;
};
})();

;
