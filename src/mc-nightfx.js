// ==== mc-nightfx.js ====
(function () {
// The night's fight looks like an expedition's fight (user ruling 2026-09-28: 「在每一天防守的时候，现在的战斗效果也是不对的，需要对齐。」).
// The expedition is the standard; the night borrows its pieces instead of keeping its own:
// · pictures: the redrawn pixel cast at the expedition's fixed scale (4 logical px per art px, 8 for 强敌 / 首领), no fine-scaling,
//   the same idle / walk / hurt frames (M.PCDG);
// · actions: every blow plays the character's own attack (wind-up, strike, shot, keyframe sounds), a skill its own charge → cast →
//   recover, a death its own fall where it fell, a comeback its revive; the old white slash streak, square shots and the
//   generic skill ring / sound are off for these characters, as in an expedition;
// · hits: white flash, a step back in the hurt pose, three glowing sparks, numbers in the machine digits (every other plain blow);
// · deaths: a ring in the fallen one's colour, a shake by its quality, an elite slows the fight a moment, a 强敌 / 首领 holds it
//   (hitstop) and flashes the screen;
// · the 首领's 砸地: its own charge while the mark fills (the mark's edge closes in and blinks before it lands), then the cast,
//   a 9-frame hold, two shockwaves, cracks, dust and a white flash.
// The crowd (plain monsters, 40 and more a night) plays the same poses from the cached body frames shared by every monster of its
// kind (attack, fall) instead of an action stage each: a stage per monster cost 3 ms a frame on a PC (profiled 2026-09-28).
// Only the look and the sound change: who hits whom, when and for how much is the night's own (mc-siege.js / mc-night.js).
const M = window.MC, G = M.PCDG, NR = M.NightRaid;
if (!G || !NR || typeof document === 'undefined') return;
const S = M.Sfx || {}, DB = M.DB, ART = G.ART || 4, DOOR_X = M.BASE_GEO.DOOR_X, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const keyOf = (e) => e && e.hd && e.hd.key;
const bigOf = (e) => (e.champ ? 2 : 1);
const pan = (x) => cl((x - DOOR_X) / 1600, -0.8, 0.8);
const RCOL = M.RACES || {};
const FX_B = { float: 1, pt: 1, slash: 1, ring: 1, crack: 1 };   // drawn by the expedition's own painters
let uid = 1;
function mark(e) {
  e._nfx = 1; if (e.id == null) e.id = uid++;
  if (!e.hd) { const a = M.artOf ? M.artOf(e.sprite) : e.sprite, k = G.has(a) ? a : G.has(e.sprite) ? e.sprite : null; if (k) e.hd = { key: k }; }
  e._hp0 = e.hp; e._up = e.alive;
}
const isP = (e) => !!keyOf(e);
const full = (e) => e.side === 'A' || !!e.champ || !!e.elite;   // an action stage of its own; the crowd uses the shared frames
function swing(b, e, T, skip) {
  const bd = G.body(keyOf(e)), sp = speedOf(e);
  if (full(e)) act(b, e, 'attack', { tg: aimOf(e), speed: sp, skip: skip ? bd.strike : 0 });
  else e._nfAtk = { t0: T - (skip ? bd.strike / sp : 0), sp };
}
function act(b, e, kind, o) { const pa = G.startAction(b, e, kind, o); pa.big = bigOf(e); return pa; }
function speedOf(e) { const bd = G.body(keyOf(e)); return Math.max(1, (bd.dur[2] || 0.75) / Math.max(0.25, e.cd || 1)); }
function aimOf(e) { const t = e._nfTg; if (t && (t.alive || (t.hp > 0 && t.alive == null))) return t; return { x: e.x + (e.face || 1) * Math.max(40, e.range || 70) }; }

// the picture of a unit of the night (mc-base.js asks for it): an action on its stage, else its body frame
M.nightImg = function (e, T, b) {
  if (!b || !b._nfx || !isP(e) || !e.alive) return null;
  if (e._pa) { e._pa.big = bigOf(e); return G.stage(e._pa); }
  const key = keyOf(e), bd = G.body(key), tint = e.flash != null && T - e.flash < 0.08 ? '#ffffff' : '';
  const a = e._nfAtk; if (a) { const u = (T - a.t0) * a.sp; if (u >= 0 && u < (bd.dur[2] || 0.75)) return G.bodyFrame(key, 'attack', Math.floor(u * 12), tint, ART * bigOf(e)); e._nfAtk = null; }
  const [st, fi] = G.bodyState(e, T, bd);
  return G.bodyFrame(key, st, fi, tint, ART * bigOf(e));
};

M.NightRaid = class extends NR {
  constructor(meta) { super(meta); this._nfx = 1; this.hs = 0; this.slowT = 0; this.flashT = -9; this.nfDead = []; this.nfFall = []; this.nfN = 0; }
  step(dt) {
    let de = dt;
    if (dt > 0 && !this.over) { if (this.hs > 0) { this.hs -= dt; de = 0; } else if (this.slowT > 0) { this.slowT -= dt; de = dt * 0.3; } }
    for (const e of this.ents) if (!e._nfx) mark(e);
    // start the swing early so the character's own strike frame lands on the blow (as in an expedition), once it is fighting
    const T0 = this.t;
    if (de > 0) for (const e of this.ents) {
      if (!e.alive || !isP(e) || e.stun > 0 || e.lunge == null || T0 - e.lunge > (e.cd || 1) + 0.3) continue;
      const pa = e._pa; if ((pa && !(pa.kind === 'attack' && pa.g.done)) || (e._nfAtk && e._nfAtk.t0 > T0 - 0.2)) continue;
      const sp = speedOf(e), lead = G.body(keyOf(e)).strike / sp;
      if (e.t > 0 && e.t <= lead) swing(this, e, T0, false);
    }
    const r = super.step(de), T = this.t;
    if (de > 0) this.nfAfter(T);
    // actions and falls play on (a held frame holds them too)
    for (const e of this.ents) { const pa = e._pa; if (!pa) continue; if (!e.alive) { G.stopAction(e); continue; } pa.g.step(de, pa.speed); if (pa.g.done && !pa.g.busy()) G.stopAction(e); }
    { const T = this.t; this.nfFall = this.nfFall.filter(f => T - f.t0 < f.end + 0.3); }
    for (let i = this.nfDead.length - 1; i >= 0; i--) { const d = this.nfDead[i]; d.pa.g.step(de || (this.over ? dt : 0), 1); if (d.pa.g.done && !d.pa.g.busy()) { G.giveBack(d.pa.g); this.nfDead.splice(i, 1); } }
    return r;
  }
  // after the night's own step: who swung, who was hit, who fell or rose this step
  nfAfter(T) {
    for (const p of this.proj) if (!p._nf) { p._nf = 1; if (!p.k && p.src && isP(p.src)) { p.pcdHide = 1; p.src._nfTg = p.tg || p.bb || { x: p.tx }; } }
    const swung = [];
    for (const e of this.ents) {
      if (e.lunge === T && e.alive && isP(e)) {
        swung.push(e); const pa = e._pa;
        const a = e._nfAtk, going = a && (T - a.t0) * a.sp < (G.body(keyOf(e)).dur[2] || 0.75);
        if (!going && !(pa && ((pa.kind === 'attack' && pa.g.state === 'attack') || (pa.kind === 'skill' && pa.g.state !== 'recover' && !pa.g.done)))) swing(this, e, T, true);
      }
      if (e.alive && e._hp0 != null && e.hp < e._hp0 - 0.5) this.nfHurt(e, T);
      if (e._up && !e.alive) this.nfDie(e, T);
      else if (!e._up && e.alive) this.nfRise(e);
      e._hp0 = e.hp; e._up = e.alive;
    }
    // the module swings for these characters: their old slash streak goes
    if (swung.length) this.fx = this.fx.filter(f => !(f.k === 'slash' && f.t0 === T && swung.some(e => !e.ranged && Math.abs(e.x - f.x) <= (e.range || 70) + 60)));
    // numbers: every other plain blow, as in an expedition (big, coloured and skill numbers always)
    for (const f of this.fx) if (f.k === 'float' && f.t0 === T && !f._nf) { f._nf = 1; if (f.size <= 26 && /^[\d,.KMB]+$/.test(String(f.text)) && (this.nfN++ & 1)) f.life = 0; }
  }
  nfHurt(e, T) {
    e.kb = T; e.kbDir = -(e.face || 1);
    if (M.LOW_FX) return;
    const col = e.side === 'E' ? '#ffd080' : '#8fc8ff';
    for (let i = 0; i < 3; i++) { const a = (i * 2.1 + T * 7 + e.id) % (Math.PI * 2), v = 200 + ((i * 97 + e.id * 31) % 260); this.fx.push({ k: 'pt', x: e.x, y: e.y - 40, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, col, t0: T, life: 0.35 }); }
  }
  nfDie(e, T) {
    const d = DB[e.sprite] || {}, q = d.q || 0, col = RCOL[d.race] || '#ff9a6a';
    this.fx.push({ k: 'ring', x: e.x, y: e.y - 40, r0: 10, r1: 120 * bigOf(e), col, w: 8, t0: T, life: 0.3 });
    this.shake = Math.max(this.shake, 3 + q * 2);
    if (e.side === 'E') { if (e.champ) { this.hs = Math.max(this.hs, 0.15); this.slowT = 0.8; this.flashT = now(); this.shake = Math.max(this.shake, 30); S.impact && S.impact(); } else if (e.elite) { this.slowT = Math.max(this.slowT, 0.25); this.shake = Math.max(this.shake, 14); } }
    else S.allyDie && S.allyDie(pan(e.x));
    if (isP(e) && !full(e)) { e._nfAtk = null; if (this.nfFall.length < 60) this.nfFall.push({ key: keyOf(e), k: ART * bigOf(e), x: e.x, y: e.y, face: e.face || 1, t0: T, end: Math.min(2, (G.body(keyOf(e)).dur[7] || 2.6) - 0.3) }); }
    else if (isP(e) && this.nfDead.length < (M.LOW_FX ? 6 : 20)) { const pa = act(this, e, 'death', { dist: 40, skip: 0.3 }); e._pa = null; this.nfDead.push({ e, pa, x: e.x, y: e.y, face: e.face || 1 }); }
  }
  nfRise(e) {
    this.nfFall = this.nfFall.filter(f => !(f.x === e.x && f.y === e.y));
    for (let i = this.nfDead.length - 1; i >= 0; i--) if (this.nfDead[i].e === e) { G.giveBack(this.nfDead[i].pa.g); this.nfDead.splice(i, 1); }
    if (isP(e)) act(this, e, 'revive');
  }
  // skills: the character's own charge → cast → recover in place of the generic ring and sound
  nsBegin(e) {
    if (!isP(e)) return super.nsBegin(e);
    const n0 = this.fx.length, o = S.skillFx; S.skillFx = null; try { super.nsBegin(e); } finally { S.skillFx = o; }
    for (let i = this.fx.length - 1; i >= n0; i--) if (this.fx[i].k === 'nsring') this.fx.splice(i, 1);
    const c = e.nsCast, bd = G.body(keyOf(e)); if (c) act(this, e, 'skill', { tg: aimOf(e), skip: Math.max(0, (bd.dur[3] || 1.4) - (c.until - c.t0)) });
  }
  nsFire(e) {
    if (!isP(e)) return super.nsFire(e);
    const n0 = this.fx.length, o = S.skillFx; S.skillFx = null; let r; try { r = super.nsFire(e); } finally { S.skillFx = o; }
    for (let i = this.fx.length - 1; i >= n0; i--) if (this.fx[i].k === 'nsring') this.fx.splice(i, 1);
    const pa = e._pa; if (pa && pa.kind === 'skill' && pa.g.state === 'charge') pa.g.enter('cast');
    return r;
  }
  // the 首领's 砸地: its own charge while the mark fills; the landing holds, rings out and cracks the ground
  slamTick(e) {
    const w0 = e.wind; super.slamTick(e); const T = this.t, R = M.NIGHT.SLAM_R;
    if (!w0 && e.wind && isP(e)) { const bd = G.body(keyOf(e)); act(this, e, 'skill', { tg: { x: e.wind.x }, skip: Math.max(0, (bd.dur[3] || 1.4) - (e.wind.until - e.wind.t0)) }); }
    if (w0 && !e.wind) {
      const pa = e._pa; if (pa && pa.kind === 'skill' && pa.g.state === 'charge') pa.g.enter('cast');
      this.hs = Math.max(this.hs, 9 / 60); this.flashT = now();
      this.fx.push({ k: 'ring', x: w0.x, y: -10, r0: 20, r1: R * 1.1, col: '#ffffff', w: 10, t0: T, life: 0.35 });
      this.fx.push({ k: 'ring', x: w0.x, y: -10, r0: 40, r1: R * 1.5, col: '#ff5a4a', w: 8, t0: T + 0.06, life: 0.5 });
      this.fx.push({ k: 'crack', x: w0.x, y: -6, t0: T, life: 1.4 });
    }
  }
  draw(ctx, lights) {
    const T = this.t;
    // the mark's edge closes in on the landing and blinks white in its last moments (under the units)
    (this.zones || []).forEach(w => { const q = cl((T - w.t0) / (w.until - w.t0), 0, 1), R = M.NIGHT.SLAM_R, rr = R * (1 - q); ctx.save(); ctx.strokeStyle = q > 0.75 && Math.floor(T * 12) % 2 ? '#ffffff' : '#ffb0a0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(w.x, -6, Math.max(4, rr), Math.max(2, 26 * (1 - q)), 0, 0, 7); ctx.stroke(); ctx.restore(); });
    const fx = this.fx, proj = this.proj, mine = [];
    this.fx = fx.filter(f => { if (FX_B[f.k]) { mine.push(f); return false; } return true; }); this.proj = proj.filter(p => !p.pcdHide);
    let r; try { r = super.draw(ctx, lights); } finally { this.fx = fx; this.proj = proj; }
    // the crowd's falls: the shared death frames where it fell, then gone in three steps
    for (const f of this.nfFall) { const u = T - f.t0, cv = G.bodyFrame(f.key, 'death', Math.floor(Math.min(u, f.end) * 12) + 4, '', f.k); ctx.save(); if (u > f.end) ctx.globalAlpha = Math.ceil((1 - (u - f.end) / 0.3) * 3) / 3; ctx.translate(M.P16.snap(f.x), M.P16.snap(f.y)); if (f.face < 0) ctx.scale(-1, 1); ctx.drawImage(cv, -cv.cx, -cv.footY); ctx.restore(); }
    for (const d of this.nfDead) { const cv = G.stage(d.pa); ctx.save(); ctx.translate(M.P16.snap(d.x), M.P16.snap(d.y)); if (d.face < 0) ctx.scale(-1, 1); ctx.drawImage(cv, -cv.cx, -cv.footY); ctx.restore(); }
    for (const f of mine) { if (T < f.t0 || T - f.t0 >= f.life) continue; if (!(M.drawFxPx && M.drawFxPx(ctx, f, T, this)) && M._drawFx) M._drawFx(ctx, f, T); }
    return r;
  }
  drawHud(ctx, bv) {
    const r = super.drawHud(ctx, bv), a = 1 - (now() - this.flashT) / 120;
    if (a > 0 && !(M.PJ && M.PJ.reduced)) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = Math.ceil(a * 3) / 3 * 0.5; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore(); }
    return r;
  }
};
})();
