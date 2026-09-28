// ==== mc-bosskit.js ====
(function () {
// Every boss its own fight (user ruling 2026-09-28: 「现在的大Boss有个问题，就是血特别厚，攻击力却比较低，群攻范围大。这就导致了，如果有几个血
// 特别厚的，就能把boss摩死，而远程单位会被大范围技能快速清理掉……不同boss应该擅长对付不同阵型……然后把现在的所有boss都重做。要根据各自的特点，
// 进行设计，例如马，可以冲锋，德鲁伊可以召唤」; the table was reviewed and approved the same day, docs/design.md §8.4 and appendix G).
// · The shared blows are gone (震击 / 天降 / 扫臂 for final bosses, 重击 / 横扫 for small ones). Each boss has its own kit: a passive,
//   two or three skills, and what changes below half its life (a final boss after its second-phase show, a small one with a roar).
// · Each kit is good against one kind of army and weak against another (KIT[k].good / .weak, shown on the map and the stele), so
//   no army answers every boss: the answer is building the army for the boss ahead.
// · Only bosses that punish crowds hit the whole field, and with the same number on everyone (a crowd feels it, a big unit does not);
//   the ones that punish slow armies heal, drain or rage.
// · What sits here: the states a boss puts on units (rooted, feared, poisoned, bleeding, swallowed / buried / lifted, chained,
//   in a zone that cuts or turns healing), the move scheduler, and the 41 kits. Final bosses keep their rise, arena and second-phase
//   show (mc-bossfight.js); small bosses walk and fight as before, with their own moves on top.
const M = window.MC, BP = M.Battle3 && M.Battle3.prototype; if (!BP) return;
const S = M.Sfx || {}, DB = M.DB, PL = (M.PJ && M.PJ.PAL) || {};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FOE = '#ff3a3a', EDGE = 1480, FB_X = EDGE + 60, FB_Y = 440, SLAM_X = EDGE - 140;   // the arena (mc-bossfight.js)
const FY0 = (M.FIELD_Y || [196, 690])[0], FY1 = (M.FIELD_Y || [196, 690])[1];
const LANES = [170, 270, 390, 510, 620];
const DEFENDER = new Set(['先锋', '守护者']);

// ───────── who stands where ─────────
const d2 = (u, x, y) => Math.hypot(u.x - x, (u.y - y) * 1.2);
const inRing = (u, x, y, r) => d2(u, x, y) < r;
const hidden = (u) => !!(u.bs && u.bs.hide);
const ours = (b) => b.ents.filter(u => b.active(u) && u.side === 'A' && !hidden(u));
const powOf = (u) => u.pw || Math.sqrt(Math.max(1, u.maxHp) * Math.max(1, u.atk) / Math.max(0.2, u.iv || 1));
const byPow = (b) => ours(b).sort((a, c) => powOf(c) - powOf(a));
const nearTo = (list, x, y) => list.slice().sort((a, c) => d2(a, x, y) - d2(c, x, y));
const farFrom = (list, x, y) => list.slice().sort((a, c) => d2(c, x, y) - d2(a, x, y));
const frontOf = (b) => ours(b).sort((a, c) => c.x - a.x);   // a final boss's front: whoever stands nearest its arena
function dense(list, r, k) {
  const out = [], pool = list.slice();
  for (let i = 0; i < k && pool.length; i++) {
    let best = null, bn = -1; pool.forEach(c => { const n = pool.filter(o => inRing(o, c.x, c.y, r)).length; if (n > bn) { bn = n; best = c; } });
    out.push({ x: best.x, y: best.y, n: bn }); for (let j = pool.length - 1; j >= 0; j--) if (inRing(pool[j], best.x, best.y, r * 1.3)) pool.splice(j, 1);
  }
  return out;
}
// the rank (a column of the formation) with the most units in it
function bigRank(list) {
  let best = null, bn = 0; list.forEach(c => { const g = list.filter(o => Math.abs(o.x - c.x) < 60); if (g.length > bn) { bn = g.length; best = g; } });
  return best || [];
}
const laneY = (b, r) => { const us = ours(b); let best = null, bn = 0; LANES.forEach(y => { const n = us.filter(u => inRing(u, SLAM_X, y, r)).length; if (n > bn || (n === bn && n > 0 && y === 390)) { bn = n; best = y; } }); return best; };
const segDist = (u, x0, y0, x1, y1) => { const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1, t = clamp(((u.x - x0) * dx + (u.y - y0) * dy) / L, 0, 1); return Math.hypot(u.x - (x0 + dx * t), u.y - (y0 + dy * t)); };
const onLine = (u, x0, y0, x1, y1, w) => segDist(u, x0, y0, x1, y1) < w / 2 + 18 * (u.sz || 1);
const inFan = (u, x, y, r, half, dir) => { const dx = (u.x - x) * dir, dy = (u.y - y) * 1.2, d = Math.hypot(dx, dy); return d < r && dx > -20 && Math.abs(Math.atan2(dy, Math.max(1, dx))) < half; };
const faceTo = (e, x) => (x < e.x ? -1 : 1);
// a line from (x0, y0) through (x, y), stretched along its own direction to the edge of the field (or to len)
const stretch = (x0, y0, x, y, len) => { const dx = x - x0, dy = y - y0, L = Math.hypot(dx, dy) || 1; let k = len ? len / L : Infinity; if (dx < 0) k = Math.min(k, (x0 - 180) / -dx); if (dx > 0) k = Math.min(k, (1880 - x0) / dx); if (dy < 0) k = Math.min(k, (y0 - FY0) / -dy); if (dy > 0) k = Math.min(k, (FY1 - y0) / dy); if (!isFinite(k)) k = 1; k = Math.max(k, Math.min(1, len ? len / L : 1)); return { x0, y0, x1: x0 + dx * k, y1: y0 + dy * k }; };
// a point on the field, kept on the ground (the feet band) and on the screen
const fieldPt = (x, y) => ({ x: clamp(x, 190, EDGE - 30), y: clamp(y, FY0 + 10, FY1 - 10) });

// ───────── what a boss does to units ─────────
const bs = (u) => u.bs || (u.bs = {});
BP.bkStun = function (u, s) { if (u && u.alive && !u.boss) u.stun = Math.max(u.stun || 0, s); };
BP.bkRoot = function (u, s) { if (u && u.alive && !u.boss) bs(u).root = Math.max(bs(u).root || 0, this.t + s); };
BP.bkFear = function (u, s, from) { if (!u || !u.alive || u.boss || u.isHero) return; bs(u).fear = this.t + s; bs(u).fearX = from.x; this.float(u.x, u.y - 90 * (u.sz || 1), '恐惧', '#c890ff', 24); };
BP.bkPoison = function (u, n, dps, src, o = {}) {
  if (!u || !u.alive || u.side !== 'A') return; const p = bs(u).psn || (bs(u).psn = { n: 0 });
  p.n = Math.min(o.max || 5, p.n + n); p.dps = Math.max(p.dps || 0, dps); p.src = src; p.until = o.life ? this.t + o.life : Infinity; p.cleanse = !!o.cleanse;
  if (Math.random() < 0.4) this.float(u.x, u.y - 80 * (u.sz || 1), '中毒 ×' + p.n, '#8fe04a', 20);
};
BP.bkSlow = function (u, s, k) { if (!u || !u.alive || u.boss) return; bs(u).slowT = this.t + s; bs(u).slowK = k; };
BP.bkBurn = function (u, s, dps, src) { if (!u || !u.alive || u.side !== 'A') return; bs(u).burn2 = { until: this.t + s, dps, src }; };
BP.bkBleed = function (u, s, dps, src) { if (!u || !u.alive || u.side !== 'A') return; bs(u).bleed = { until: this.t + s, dps, src }; };
// hidden for a while: swallowed, buried, cocooned (not drawn, not targeted, not acting); lifted is drawn up in the air
BP.bkHide = function (u, s, kind, o = {}) {
  if (!u || !u.alive) return; const h = bs(u).hide = Object.assign({ until: this.t + s, kind, x: u.x, y: u.y }, o);
  u.bench = true; u.target = null; if (kind === 'lift') { u.drawDY = -150; this.fxp({ k: 'bkBalloon', ent: u, life: s }); }
  this.ents.forEach(o2 => { if (o2.target === u) o2.target = null; });
  return h;
};
BP.bkUnhide = function (u) {
  const h = u && u.bs && u.bs.hide; if (!h) return; u.bs.hide = null; u.bench = false; if (h.kind === 'lift') u.drawDY = 0;
  if (!u.alive) return; const p = fieldPt(h.outX != null ? h.outX : u.x, h.outY != null ? h.outY : u.y); u.x = p.x; u.y = p.y;
  if (h.half) { u.hp = Math.max(1, u.hp * 0.5); this.float(u.x, u.y - 90 * (u.sz || 1), '爬出来了', '#b8c888', 24); }
  if (h.stunOut) this.bkStun(u, h.stunOut);
  if (h.onEnd) h.onEnd(this, u);
  this.dust(u.x, u.y, 8);
};
// chained / stitched together: what hits one is shared by all of them
BP.bkLink = function (list, s, col) { const g = { list, until: this.t + s, col: col || '#8a8698' }; list.forEach(u => { bs(u).link = g; }); for (let i = 1; i < list.length; i++) this.fxp({ k: 'bkLink', a: list[i - 1], b: list[i], col: g.col, life: s }); return g; };
// ground that stays: 铁水 (healing cut, burning), 血咒 (healing hurts), 墨汁 (half the blows miss), 毒雾, 熔岩
BP.bkZone = function (z) { (this.bkZones || (this.bkZones = [])).push(Object.assign({ t0: this.t }, z)); return z; };
const zoneAt = (z) => (z.ent ? { x: z.ent.x, y: z.ent.y } : { x: z.x, y: z.y });

// a hit from a boss: m × its attack (or an absolute amount), thrown / knocked flat / stunned as asked
BP.bkHit = function (e, u, m, o = {}) {
  if (!u || !u.alive || u.side === e.side || hidden(u)) return 0;
  const amt = o.abs != null ? o.abs : e.atk * m * (1 + ((e.bk && e.bk.atkK) || 0));
  const d = this.deal(e, u, amt, { skill: 1, big: o.small ? 0 : 1, small: o.small ? 1 : 0, noKb: 1, col: o.col || FOE, silent: o.silent });
  if (u.alive && o.launch) this.launch(u, o.launch[0], o.launch[1], o.launch[2] == null ? 1 : o.launch[2]);
  if (u.alive && o.flat) this.knockFlat(e, u, o.flat[0], o.flat[1], o.flat[2] || 1);
  if (u.alive && o.stun) this.bkStun(u, o.stun);
  return d;
};
const away = (e, u, k) => [(u.x < e.x ? -1 : 1) * (k || 360), (u.y - e.y) * 0.6];
const hitRing = (b, e, x, y, r, m, o = {}) => { let n = 0; ours(b).forEach(u => { if (inRing(u, x, y, r)) { n++; b.bkHit(e, u, m, Object.assign({}, o, o.launch === true ? { launch: [(u.x - x) * 1.2 - 60, (u.y - y) * 0.6, 1] } : {})); } }); return n; };
const boom = (b, x, y, r, col, big) => { b.fxp({ k: 'crack', x, y, life: 1.8 }); b.dust(x, y, big ? 18 : 10); b.ring(x, y - 8, 16, r, col || '#ffd0a0', big ? 12 : 8, 0.4); b.shake = Math.max(b.shake, big ? 22 : 12); try { S.boom && S.boom(); } catch (err) { /* sound */ } };

// ───────── every step: states in, the fight, states out ─────────
const oStep = BP.step;
BP.step = function (dt) {
  if (!this.bkOn) return oStep.apply(this, arguments);
  const T0 = this.t, saved = [];
  for (const u of this.ents) {
    if (!u.alive) continue; const s = u.bs, A = u.bk; let spd = null, noAtk = null;
    if (s) { if (s.root > T0 || s.fear > T0) spd = 0; if (s.fear > T0) noAtk = true; const sk = Math.max(s.slowMv || 0, s.slowT > T0 ? s.slowK || 0 : 0); if (sk > 0) spd = (spd == null ? u.spd : spd) * (1 - sk); }
    if (A && (A.ch || A.dash || A.stay)) { spd = 0; noAtk = true; }
    if (u.side === 'A' && !u.ranged && u.target && u.target.bkFly && !(u.target.bk && u.target.bk.grounded > T0)) u.target = null;
    if (spd != null || noAtk != null) { saved.push([u, u.spd, u.noAtk]); if (spd != null) u.spd = spd; if (noAtk != null) u.noAtk = noAtk; }
  }
  let r; try { r = oStep.apply(this, arguments); } finally { for (const [u, sp, na] of saved) { u.spd = sp; u.noAtk = na; } }
  const dtE = this.t - T0; if (dtE > 0) this.bkPost(dtE);
  return r;
};
BP.bkPost = function (dt) {
  const T = this.t;
  // zones: what they do to whoever stands in them this step (healing is read from these marks until the next step)
  const Z = this.bkZones || []; for (let i = Z.length - 1; i >= 0; i--) if (T > Z[i].until || (Z[i].ent && !Z[i].ent.alive)) Z.splice(i, 1);
  for (const u of this.ents) {
    if (!u.alive || u.side !== 'A') continue; const s = u.bs; if (!s && !Z.length) continue; const st = bs(u);
    st.healK = 1; st.curse = null; st.ink = 0; st.slowMv = 0;
    for (const z of Z) { const p = zoneAt(z); if (!inRing(u, p.x, p.y, z.r) || hidden(u)) continue;
      if (z.healK != null) st.healK = Math.min(st.healK, z.healK); if (z.curse) st.curse = z.src; if (z.ink) st.ink = 1; if (z.slow) st.slowMv = Math.max(st.slowMv, z.slow);
      if (z.dps) this.deal(z.src || u, u, z.dps * dt, { skill: 1, silent: 1 }); if (z.psn && Math.random() < dt) this.bkPoison(u, 1, z.psn, z.src, { cleanse: 1 }); }
    if (!u.alive) continue;
    if (st.psn) { const p = st.psn; if (T > p.until || p.n <= 0) st.psn = null; else this.deal(p.src || u, u, p.n * p.dps * dt, { skill: 1, silent: 1 }); }
    if (st.burn2) { const q = st.burn2; if (T > q.until) st.burn2 = null; else this.deal(q.src || u, u, q.dps * dt, { skill: 1, silent: 1 }); }
    if (st.bleed) { const q = st.bleed; if (T > q.until) st.bleed = null; else { this.deal(q.src || u, u, q.dps * dt, { skill: 1, silent: 1 }); st.healK = Math.min(st.healK, 0.5); } }
    if (st.fear > T) { const dir = u.x < (st.fearX || EDGE) ? -1 : 1; u.x = clamp(u.x + dir * (u.spd || 90) * 0.8 * dt, 170, EDGE - 20); u.walk = (u.walk || 0) + (u.spd || 90) * dt; }
    if (st.link && T > st.link.until) st.link = null;
    if (st.hide && (T >= st.hide.until || (st.hide.by && !st.hide.by.alive))) this.bkUnhide(u);
    else if (st.hide && st.hide.drain) { const h = st.hide; this.deal(h.by || u, u, u.maxHp * h.drain * dt, { skill: 1, silent: 1 }); if (h.feed && h.by && h.by.alive) h.by.hp = Math.min(h.by.maxHp, h.by.hp + u.maxHp * h.drain * dt * h.feed); if (!u.alive) { u.bench = false; st.hide = null; } }
  }
  (this.omens || []).forEach(o => { if (o.ent && o.rain) { o.x = o.ent.x; o.y = o.ent.y; } });
  for (const e of this.ents) {
    if (!e.alive || !e.kit || !e.bk) continue; const A = e.bk, K = e.kit;
    if (e.bs && e.bs.hide && T >= e.bs.hide.until) this.bkUnhide(e);
    if (A.dash) this.bkDashStep(e, dt);
    if (A.ch) { const C = A.ch; while (C && T >= C.next && T < C.until + 1e-6) { C.mv.chan.tick(this, e, C.P, C.k++); C.next += C.mv.chan.every; if (!e.alive) break; } if (T >= C.until) { if (C.mv.chan.end) C.mv.chan.end(this, e, C.P); A.ch = null; A.next = T + this.bkRest(e); } }
    if (K.tick) K.tick(this, e, dt, A);
  }
};
// a boss moving by itself (冲锋, 撞门, 飞扑, 俯冲): along a line, touching who it passes
BP.bkDashStep = function (e, dt) {
  const D = e.bk.dash, T = this.t, q = clamp((T - D.t0) / D.dur, 0, 1), ek = q * q * (3 - 2 * q);
  e.x = D.x0 + (D.x1 - D.x0) * ek; e.y = D.y0 + (D.y1 - D.y0) * ek; e.walk = (e.walk || 0) + 900 * dt;
  if (Math.random() < 0.5) this.dust(e.x, e.y, 2);
  for (const u of ours(this)) { if (D.hit.has(u) || d2(u, e.x, e.y) > (D.w || 90)) continue; D.hit.add(u); if (D.onHit) D.onHit(this, e, u, D); if (D.stop && D.stop(u)) { D.stopped = u; break; } }
  if (q >= 1 || D.stopped) { e.bk.dash = null; if (D.onEnd) D.onEnd(this, e, D); if (!e.bk.ch) e.bk.next = T + this.bkRest(e); }
};

// ───────── what hits a boss, what a boss hits, healing under its spells ─────────
const oDeal = BP.deal;
BP.deal = function (src, tg, amt, o = {}) {
  if (!this.bkOn || !tg || !tg.alive || !(amt > 0)) return oDeal.apply(this, arguments);
  const L = tg.bs && tg.bs.link;
  if (L && L.until > this.t && !o.linkPass) { const all = L.list.filter(u => u.alive); if (all.length > 1 && all.includes(tg)) { let tot = 0; const o2 = Object.assign({}, o, { linkPass: 1 }); all.forEach(u => { tot += oDealK.call(this, src, u, amt / all.length, o2); }); return tot; } }
  return oDealK.call(this, src, tg, amt, o);
};
function oDealK(src, tg, amt, o) {
  if (o.auto && src && src.bs && src.bs.ink && Math.random() < 0.5) { if (Math.random() < 0.3) this.float(tg.x, tg.y - 80 * (tg.sz || 1), '打空', '#8d8496', 20); return 0; }
  const K = tg.kit; if (K && K.hurt && !o.reflect) { amt = K.hurt(this, tg, src, amt, o); if (!(amt > 0)) return 0; }
  const KS = src && src.kit; if (KS && KS.hit && !o.reflect && tg.side !== src.side) amt = KS.hit(this, src, tg, amt, o);
  const d = oDeal.call(this, src, tg, amt, o);
  if (K && K.after && d > 0) K.after(this, tg, src, d, o);
  if (src && src.bkOnHit && d > 0 && tg.side !== src.side) src.bkOnHit(this, src, tg, d, o);
  return d;
}
// a boss that cuts all healing for the whole fight (熔炉工头's heat): this.bkHealK
const oHeal = BP.heal;
BP.heal = function (o, amt, col) {
  if (!this.bkOn || !o || !(amt > 0) || o.side !== 'A') return oHeal.apply(this, arguments); const s = o.bs || {};
  if (s.curse && s.curse.alive) { this.deal(s.curse, o, amt * 2, { skill: 1, col: '#ff3a5a', small: 1 }); if (Math.random() < 0.5) this.float(o.x, o.y - 90 * (o.sz || 1), '血咒', '#ff3a5a', 22); return; }
  if (s.psn && s.psn.cleanse && amt >= o.maxHp * 0.003) s.psn = null;
  return oHeal.call(this, o, amt * (s.healK == null ? 1 : s.healK) * (this.bkHealK || 1), col);
};
const oRegen = BP.regen;
BP.regen = function (o, amt, col) {
  if (!this.bkOn || !o || !(amt > 0) || o.side !== 'A') return oRegen.apply(this, arguments); const s = o.bs || {};
  if (s.curse && s.curse.alive) { this.deal(s.curse, o, amt * 2, { skill: 1, silent: 1 }); return; }
  return oRegen.call(this, o, amt * (s.healK == null ? 1 : s.healK) * (this.bkHealK || 1), col);
};
const oKill = BP.kill;
BP.kill = function (e, src) {
  if (!this.bkOn || !e || !e.alive) return oKill.apply(this, arguments);
  if (e.kit && e.kit.revive && !e.bk.revived) { e.bk.revived = 1; e.hp = e.maxHp * e.kit.revive; e.bk.ch = null; e.bk.dash = null; e.casting = null; this.bkPhase2(e, '复生'); this.flash = 0.5; this.flashCol = '#ff4a5a'; this.ring(e.x, e.y - 40, 20, 260, '#ff4a5a', 14, 0.6); return; }
  const r = oKill.apply(this, arguments);
  if (!e.alive) this.bkDied(e, src);
  return r;
};
BP.bkDied = function (e, src) {
  if (e.kit) {
    this.ents.forEach(u => { if (u.alive && u.bkOwner === e) oKill.call(this, u, null); });
    this.ents.forEach(u => { const h = u.bs && u.bs.hide; if (h && u !== e) this.bkUnhide(u); if (u.bs && u.bs.link) u.bs.link = null; });
    this.bkZones = (this.bkZones || []).filter(z => z.src !== e); if (e.kit.heat) this.bkHealK = null;
  }
  if (e.bkOnDie) e.bkOnDie(this, e, src);
  if (e.side === 'A' && !e.summon && !e.isHero) this.ents.forEach(k => { if (k.alive && k.kit && k.kit.allyDie) k.kit.allyDie(this, k, e); });
};
// hidden units are not drawn (they are in a mouth, a grave, a cocoon)
const oRender = BP.render;
BP.render = function () {
  if (!this.bkOn) return oRender.apply(this, arguments);
  const hid = this.ents.filter(u => u.alive && u.bs && u.bs.hide && u.bs.hide.kind !== 'lift'); hid.forEach(u => { u.alive = false; });
  try { return oRender.apply(this, arguments); } finally { hid.forEach(u => { u.alive = true; }); }
};
// who a unit may go for: a boss in the air is out of reach of melee; 军团卫士 stay by their lord; larvae run for the back
// installed at the first boss fight, over every other module's targeting (mc-vocplay.js picks for assassins after this file loads)
function wrapPick() { if (BP._bkPick) return; BP._bkPick = 1; const oPick = BP.pickTarget;
BP.pickTarget = function (e) {
  if (!this.bkOn) return oPick.apply(this, arguments);
  if (e.bkPick) { const t = e.bkPick(this, e); if (t !== undefined) return t; }
  const t = oPick.apply(this, arguments);
  if (t && !e.ranged && e.side === 'A' && t.bkFly && !(t.bk && t.bk.grounded > this.t)) { const alt = this.foes(e).filter(o => !(o.bkFly && !(o.bk && o.bk.grounded > this.t))); return nearTo(alt, e.x, e.y)[0] || null; }
  return t;
}; }

// ───────── the scheduler ─────────
const MV = M.BOSS_MV = {};
const KIT = M.BOSS_KIT = {};
BP.bkRest = function (e) { const A = e.bk, p2 = e.fb && A.phase === 2 ? (M.FBK ? M.FBK.p2As : 1.5) * (1 + (this.fbFast || 0)) : 1; return (e.kit.rest || (e.fb ? 1.5 : 1.1)) / p2 / (A.cdK || 1); };
BP.bkInit = function (e, K) {
  this.bkOn = true; wrapPick(); e.kit = K; const T = this.t;
  e.bk = { phase: 1, cd: {}, i: 0, next: T + (e.fb ? 2.9 : 2.2), cdK: 1, atkK: 0 };
  e.traits = e.traits.filter(t => (K.keepTr || []).includes(t.cls));
  (K.p1 || []).concat(K.p2 || []).forEach(id => { const mv = MV[id]; if (mv && mv.cd0 != null) e.bk.cd[id] = T + mv.cd0; });
  if (K.fly) e.bkFly = 1;
  if (K.heat) this.bkHealK = K.heat;
  if (K.init) K.init(this, e, e.bk);
};
BP.bkTick = function (e) {
  const K = e.kit, A = e.bk, T = this.t; if (!K || !A || !e.alive || this.opening || e.casting || A.ch || A.dash || T < A.next || hidden(e)) return;
  const list = (A.phase === 2 && K.p2) ? K.p2 : K.p1;
  for (let j = 0; j < list.length; j++) {
    const id = list[(A.i + j) % list.length], mv = MV[id]; if (!mv || T < (A.cd[id] || 0)) continue;
    const P = mv.plan(this, e, A); if (!P) continue;
    A.i = (A.i + j + 1) % list.length; A.idle = null; this.bkBegin(e, id, P); return;
  }
  if (e.fb) { if (A.idle == null) A.idle = T; else if (T - A.idle > 4) { const P = MV.poke.plan(this, e, A); if (P) { A.idle = null; this.bkBegin(e, 'poke', P); return; } } }
  A.next = T + 0.25;
};
BP.bkBegin = function (e, id, P) {
  const mv = MV[id], A = e.bk, T = this.t, p2 = e.fb && A.phase === 2 ? (M.FBK ? M.FBK.p2As : 1.5) : 1;
  const wind = (P.wind != null ? P.wind : mv.wind) / p2 * (A.slowCast || 1); P.id = id;
  P.oms = (P.omens || []).map(o => { const om = Object.assign({ shape: 'circle', t0: T, until: T + wind, col: FOE, keep: 1 }, o); if (!(om.shape === 'line' && om.x0 != null)) om.src = om.src || e; return this.omen(om); });
  e.casting = { t0: T, until: T + wind, bk: P, sp: { n: mv.n, col: FOE, tier: 2, q: 3 } };
  this.fxp({ k: 'ctitle', ent: e, text: mv.n, col: FOE, tier: 1, side: 'E', life: wind + 1 });
  try { S.skillFx && S.skillFx('charge', 'spiral', 'blood', e.fb ? 3 : 2, wind, S.panX ? S.panX(e.x) : 0); } catch (err) { /* sound */ }
  A.cd[id] = T + wind + mv.cd * (id === A.fastId ? 0.5 : 1) / (A.cdK || 1);
  if (mv.begin) mv.begin(this, e, P);
};
const oFire = BP.fireCast;
BP.fireCast = function (e) {
  const c = e.casting; if (!c || !c.bk) return oFire.apply(this, arguments);
  e.casting = null; e.castPose = this.t; const P = c.bk, mv = MV[P.id], A = e.bk; if (!mv) return;
  (P.oms || []).forEach(o => { o.fired = this.t; });
  mv.fire(this, e, P);
  if (mv.chan && e.alive) { A.ch = { mv, P, until: this.t + (P.chanDur || mv.chan.dur), next: this.t, k: 0 }; }
  else if (!A.dash) A.next = this.t + this.bkRest(e);
  if (e.fb) this.shake = Math.max(this.shake, 8);
};
BP.bkPhase2 = function (e, word) {
  const A = e.bk, K = e.kit; if (!A) return; A.phase = 2;
  if (!e.fb) { this.float(e.x, e.y - 150 * (e.sz || 1), word || K.roar || '暴怒', '#ff4a3a', 44); this.shake = Math.max(this.shake, 20); this.ring(e.x, e.y - 40, 20, 300, '#ff4a3a', 14, 0.5); try { S.impact && S.impact(); } catch (err) { /* sound */ } }
  if (K.onP2) K.onP2(this, e, A);
};
// a small boss: its own moves on top of walking and hitting; the roar at half its life
const oMb = BP.mbTick;
BP.mbTick = function (e) {
  if (!e.kit) return oMb.apply(this, arguments);
  if (e.bk.phase === 1 && e.hp < e.maxHp * 0.5 && !e.casting && !e.bk.ch && !e.bk.dash && !e.kit.revive) this.bkPhase2(e);
  this.bkTick(e);
};
// a final boss: the rise and the second-phase show stay (mc-bossfight.js); what it does between them is its kit
function riseY(e, T) { const A = e.ai; if (!A) return 0; if (A.st === 'rise') { const q = clamp((T - A.t0) / 2.2, 0, 1), k = 1 - Math.pow(1 - q, 3); return (1 - k) * 520; } if (A.st === 'dead') { const q = clamp((T - A.t0) / 2.4, 0, 1); return q * q * 560; } return 0; }
const oFb = BP.fbTick;
BP.fbTick = function (e) {
  if (!e.kit) return oFb.apply(this, arguments);
  const A = e.ai, T = this.t; if (!A) return;
  e.drawDY = riseY(e, T); e.clipY = e.drawDY > 0 ? -e.drawDY + 4 : null;
  if (A.st === 'dead') return;
  if (A.st === 'rise') { if (T >= A.t) { A.st = 'idle'; A.t = T + 0.6; } else if (Math.random() < 0.3) this.shake = Math.max(this.shake, 6); return; }
  if (this.opening || !e.alive) return;
  if (A.phase === 1 && !this.noP2 && e.hp < e.maxHp * 0.5 && !e.casting && !e.bk.ch) {
    A.phase = 2; A.st = 'roar'; A.t0 = T; A.t = Infinity; this.p2 = { e, t: 0, fired: {} }; if (this.arena) this.arena.heat = 1; this.bkPhase2(e); return;
  }
  if (A.st === 'roar') { if (T >= A.t) { A.st = 'idle'; A.t = T + 0.3; } else if (Math.random() < 0.25) this.shake = Math.max(this.shake, 10); return; }
  if (A.st === 'idle' || A.st === 'recover' || A.st === 'strike') this.bkTick(e);
};
// the kit comes with the boss (only the fights with a boss of their own: not the night)
const oSpawn = BP.spawnEnemy;
BP.spawnEnemy = function (s) {
  const e = oSpawn.apply(this, arguments); if (!e || !(e.fb || e.mbAi)) return e;
  const tut = this.run && this.run.region && this.run.region.tut, K = KIT[(tut ? 'tut:' : '') + s.type] || (tut ? null : KIT[s.type]);
  if (K) this.bkInit(e, K);
  return e;
};
// a boss's own helpers (树人, 老鼠, 幼虫, 触手, 茧, 卫士, 小哨兵, 僵尸): stats from the boss, gone with it
BP.bkSummon = function (e, key, x, y, o = {}) {
  if (!DB[key]) return null; const mine = this.ents.filter(u => u.alive && u.bkOwner === e && (!o.tag || u.bkTag === o.tag)).length; if (o.cap && mine >= o.cap) return null;
  const p = fieldPt(x, y), u = this.unitStats(key, 'E', p.x, p.y, { summon: 1 });
  u.hp = u.maxHp = Math.max(1, e.maxHp * (o.hp || 0.03)); u.atk = e.atk * (o.atk || 0.2); u.bkOwner = e; u.bkTag = o.tag; u.base = 0; u.summon = true; u.traits = [];
  if (o.nm) u.nm = o.nm; if (o.spd != null) u.spd = o.spd; if (o.noAtk) u.noAtk = true; if (o.sz) u.sz = o.sz; if (o.fly) u.bkFly = 1; if (o.ghost) u.ghost = 1;
  u.entryT = this.t; u.entry = o.entry || 'summon'; u.readyAt = this.t + 0.35; this.ring(u.x, u.y - 30, 10, 80, '#ff6a5a', 6, 0.4);
  try { S.summonIn && S.summonIn(S.panX ? S.panX(u.x) : 0); } catch (err) { /* sound */ }
  return u;
};

// ───────── drawing: zones on the ground, chains, balloons, beams, webs; a boss's meter under its bar ─────────
const snap = (v) => Math.round(v / 4) * 4;
const px = (ctx, x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(snap(x), snap(y), w, h); };
const oFloor = M.drawKbFloor;
M.drawKbFloor = function (ctx, b, T) {
  if (oFloor) oFloor.apply(this, arguments);
  (b.bkZones || []).forEach(z => {
    const p = zoneAt(z), q = clamp((T - z.t0) / 0.3, 0, 1) * clamp((z.until - T) / 0.4, 0, 1), pulse = 0.85 + 0.15 * Math.sin(T * 5 + z.t0);
    ctx.save(); ctx.globalAlpha = 0.22 * q * pulse; M.P16.ellipse(ctx, p.x, p.y, z.r, z.r / 1.2, z.col || '#ff6a2a', false);
    ctx.globalAlpha = 0.8 * q; M.P16.ellipse(ctx, p.x, p.y, z.r, z.r / 1.2, z.col || '#ff6a2a', true);
    if (z.bub) for (let i = 0; i < 6; i++) { const a = T * 0.8 + i * 1.05, rr = z.r * (0.3 + 0.5 * ((i * 37) % 10) / 10); px(ctx, p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr / 1.2 - ((T * 30 + i * 13) % 20), 8, 8, z.bub); }
    ctx.restore();
  });
};
const oFxK = M.drawFxPx;
M.drawFxPx = function (ctx, f, T, b) {
  const p = (T - f.t0) / f.life;
  if (f.k === 'bkLink') {
    if (p >= 1 || !f.a.alive || !f.b.alive) return true; const x0 = f.a.x, y0 = f.a.y - 40 * (f.a.sz || 1), x1 = f.b.x, y1 = f.b.y - 40 * (f.b.sz || 1), d = Math.hypot(x1 - x0, y1 - y0);
    ctx.save(); ctx.globalAlpha = Math.min(1, (1 - p) * 4); for (let k = 0; k < d; k += 16) { const u = k / d, sag = Math.sin(u * Math.PI) * 26; px(ctx, x0 + (x1 - x0) * u - 4, y0 + (y1 - y0) * u + sag - 4, 8, 8, (k / 16) % 2 ? '#5e5a6a' : (f.col || '#8a8698')); } ctx.restore(); return true;
  }
  if (f.k === 'bkBeam') {
    if (p >= 1 || !f.a.alive || !f.b.alive) return true; const x0 = f.a.x, y0 = f.a.y - 60 * (f.a.sz || 1), x1 = f.b.x, y1 = f.b.y - 40 * (f.b.sz || 1), w = (f.w || 10) * (0.8 + 0.2 * Math.sin(T * 30));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85; ctx.strokeStyle = f.col || '#ff4a4a'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w * 0.35; ctx.stroke(); ctx.restore(); return true;
  }
  if (f.k === 'bkBalloon') {
    const e = f.ent; if (p >= 1 || !e.alive) return true; const x = e.x, y = e.y - 150 - 88 * (e.sz || 1) - 60 + Math.sin(T * 3) * 6;
    ctx.save(); px(ctx, x - 2, y + 40, 4, 70, '#e8dcc4'); px(ctx, x - 26, y - 28, 52, 60, '#e8434f'); px(ctx, x - 18, y - 36, 36, 8, '#e8434f'); px(ctx, x - 18, y + 32, 36, 8, '#e8434f'); px(ctx, x - 16, y - 20, 12, 16, '#ff9aa6'); ctx.restore(); return true;
  }
  if (f.k === 'bkWeb') {
    const e = f.ent; if (p >= 1 || !e.alive) return true; const x = e.x, y = e.y - 40 * (e.sz || 1);
    ctx.save(); ctx.globalAlpha = Math.min(1, (1 - p) * 3) * 0.9; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; for (let k = 0; k < 56; k += 8) px(ctx, x + Math.cos(a) * k, y + Math.sin(a) * k * 0.8, 4, 4, '#e8e4f0'); } for (let r = 18; r < 56; r += 18) for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9; px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, 4, 4, '#b8b0c8'); } ctx.restore(); return true;
  }
  if (f.k === 'bkPot') {
    const e = f.ent; if (p >= 1 || !e.alive) return true; const x = e.x + 40 * (e.sz || 1), y = e.y - 70 * (e.sz || 1);
    ctx.save(); px(ctx, x - 20, y - 24, 40, 36, '#c8782a'); px(ctx, x - 14, y - 32, 28, 10, '#8a4a1a'); px(ctx, x - 12, y - 18, 10, 10, '#ffd060'); px(ctx, x - 20, y - 8, 40, 6, '#ffb020'); ctx.restore(); return true;
  }
  return oFxK ? oFxK.apply(this, arguments) : false;
};
const oHudK = M.drawBattleHudPx;
M.drawBattleHudPx = function (ctx, b, T) {
  if (oHudK) oHudK.apply(this, arguments);
  if (!b.bkOn || (M.uiScreen && !M.uiScreen())) return;
  const e = b.ents.find(x => x.alive && x.kit && x.kit.hud && x.bk); if (!e) return; const h = e.kit.hud(b, e, e.bk); if (!h) return;
  const U = M.bUI; if (!U) return; const W = 360, X = 960 - W / 2, Y = 92;
  if (h.v != null) { U.R(ctx, X - 4, Y - 4, W + 8, 18, PL.ink); U.R(ctx, X, Y, W, 10, PL.abyss || '#1a1426'); U.R(ctx, X, Y, W * clamp(h.v, 0, 1), 10, h.col || PL.gold); }
  if (h.t) U.text(ctx, h.t, 960, Y + (h.v != null ? 36 : 12), 24, h.col || PL.butter, { drop: 3 });
};
// a unit whose skills are sealed (扎针) keeps its mana bar but cannot cast
const oCan = BP.canSkill;
if (oCan) BP.canSkill = function (e) { if (e && e.bs && e.bs.sil > this.t) return false; return oCan.apply(this, arguments); };

// ───────── the moves ─────────
// A move: n (its name, shown as it charges), cd (seconds from when it starts charging), cd0 (the first time it may go), wind (the
// charge), plan(b, e, A) → what it aims at and its marks (null: nothing worth aiming at), fire(b, e, P); chan: a move that goes on
// for a while after it fires (the boss stands still). Numbers are × the boss's attack.
const TI = (b, e, what, x, y) => { if (M.TITAN && M.TITAN.impact && e.fb) M.TITAN.impact(b, e, what, x, y); };
const pts = (list) => list.map(u => ({ x: u.x, y: u.y, u }));
// final bosses: a ring where the army stands at the edge; a fan out of the arena; things falling on chosen units
const fbSlam = (n, m, r, o = {}) => ({ n, cd: o.cd || 5, cd0: o.cd0, wind: o.wind || 1.3,
  plan(b) { const y = laneY(b, r); return y == null ? null : { x: SLAM_X, y, r, omens: [{ x: SLAM_X, y, r }] }; },
  fire(b, e, P) { hitRing(b, e, P.x, P.y, P.r, m, { launch: true }); boom(b, P.x, P.y, P.r, o.col, 1); b.fxp({ k: 'fbwave', x: P.x, y: P.y, r: P.r, life: 0.5 }); TI(b, e, 'slam', P.x, P.y); try { S.impact && S.impact(); } catch (err) { /* sound */ } } });
const fbFan = (n, m, r0, half, o = {}) => { const r = r0 + 160; return { n, cd: o.cd || 6, cd0: o.cd0, wind: o.wind || 1.4,
  plan(b) { const X = EDGE + 200; return ours(b).some(u => inFan(u, X, FB_Y, r, half, -1)) ? { x: X, y: FB_Y, r, half, omens: [{ shape: 'sector', x: X, y: FB_Y, r, half, dir: -1 }] } : null; },
  fire(b, e, P) { ours(b).forEach(u => { if (inFan(u, P.x, P.y, P.r, P.half, -1)) b.bkHit(e, u, m * (o.mul ? o.mul(u) : 1), { flat: [-420 - Math.random() * 120, (Math.random() - 0.5) * 120, 1] }); }); b.fxp({ k: 'fbsweep', x: P.x, y: P.y, r: P.r, half: P.half, life: 0.45 }); b.shake = Math.max(b.shake, 20); TI(b, e, 'sweep', EDGE - 300, FB_Y); try { S.whoosh && S.whoosh(0.6); } catch (err) { /* sound */ } } }; };
const fbDrop = (n, m, r, pick, o = {}) => ({ n, cd: o.cd || 7, cd0: o.cd0, wind: o.wind || 1.4,
  plan(b, e, A) { const ps = pick(b, e, A); if (!ps || !ps.length) return null; return { ps, omens: ps.map((p, i) => ({ x: p.x, y: p.y, ent: o.follow ? p.u : null, r, rain: o.rain, tether: o.tether ? 1 : 0, t0: b.t + i * 0.06 })) }; },
  fire(b, e, P) { (P.oms || []).forEach(om => { const x = om.ent ? om.ent.x : om.x, y = om.ent ? om.ent.y : om.y; ours(b).forEach(u => { if (inRing(u, x, y, r)) { b.bkHit(e, u, m, o.hit ? o.hit(b, e, u) : { launch: [(u.x - x) * 1.2, (u.y - y) * 0.8, 0.8] }); if (o.each && u.alive) o.each(b, e, u); } }); boom(b, x, y, r, o.col); TI(b, e, 'rain', x, y); if (o.at) o.at(b, e, x, y); }); } });
const rnd = (list, n) => list.slice().sort(() => Math.random() - 0.5).slice(0, n);
const vocOf = (u) => (u.d && u.d.voc) || (u.isHero ? '领袖' : '');

// whoever stands nearest the arena, when nothing else has anything to aim at (a final boss is never stuck)
MV.poke = { n: '重击', cd: 0, wind: 1.2, plan: (b) => { const u = frontOf(b)[0]; return u ? { u, omens: [{ ent: u, r: 110, tether: 1 }] } : null; }, fire(b, e, P) { const x = P.u.x, y = P.u.y; hitRing(b, e, x, y, 110, 1.2, { launch: true }); boom(b, x, y, 110, null, 1); TI(b, e, 'slam', x, y); } };
// 守钟人 — the crowd: the midnight bell hurts everyone the same
MV.bellHammer = fbDrop('钟锤', 1.6, 130, (b) => pts(frontOf(b).slice(0, 1)), { cd: 5, wind: 1.2, follow: 1, tether: 1 });
MV.midnight = { n: '午夜钟声', cd: 10, cd0: 4, wind: 1.6, plan: (b) => (ours(b).length ? { omens: [] } : null),
  begin(b) { b.fxp({ k: 'clock', x: 960, y: 330, life: 1.8 }); },
  fire(b, e) { ours(b).forEach(u => b.bkHit(e, u, 0.45, { small: 1, col: '#ffd060' })); for (let i = 0; i < 3; i++) b.ring(FB_X, FB_Y - 200, 40, 900 + i * 200, '#ffd060', 10 - i * 3, 0.6 + i * 0.15); b.shake = Math.max(b.shake, 18); try { S.introToll && S.introToll(); } catch (err) { /* sound */ } } };
MV.bellDrop = fbDrop('落钟', 1.35, 150, (b) => dense(ours(b), 150, 1), { cd: 9, wind: 1.5, rain: 'bell' });
// 守墓人 — the slow fight: the weakest is buried and comes back with half of what it had; later the fallen rise for it
MV.shovel = fbSlam('铲地', 1.4, 150, { cd: 4.5 });
MV.bury = { n: '掘墓', cd: 7, cd0: 4, wind: 1.2,
  plan(b) { const u = ours(b).filter(x => !x.isHero).sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0]; return u ? { u, omens: [{ ent: u, r: 70, tether: 1 }] } : null; },
  fire(b, e, P) { const u = P.u; if (!u.alive || hidden(u)) return; b.fxp({ k: 'fberupt', kind: 'hand', x: u.x, y: u.y, life: 0.7 }); b.fxp({ k: 'tomb', x: u.x, y: u.y, life: 5 }); b.float(u.x, u.y - 100, '被埋了', '#b8c888', 28); b.bkHide(u, 5, 'bury', { half: 1 }); } };
// 德鲁伊 — the army that cannot hit hard enough: treants in front of it, and they heal it later
MV.treants = { n: '召唤树人', cd: 14, cd0: 1.5, wind: 1.0,
  plan(b, e) { return b.ents.filter(u => u.alive && u.bkOwner === e && u.bkTag === 'tree').length < 6 ? { omens: [{ x: EDGE - 110, y: 300, r: 70 }, { x: EDGE - 110, y: 560, r: 70 }] } : null; },
  fire(b, e, P) { P.oms.forEach(o => { for (let i = 0; i < 2; i++) b.bkSummon(e, 'LifeTree', o.x - i * 60, o.y + (i ? 40 : 0), { hp: 0.015, atk: 0.2, tag: 'tree', cap: 6, nm: '树人', spd: 40, entry: 'emerge' }); }); } };
MV.thorns = fbDrop('荆棘穿地', 0.5, 80, (b) => pts(farFrom(ours(b).filter(u => u.ranged), FB_X, FB_Y).slice(0, 3)), { cd: 7, wind: 1.2, rain: 'thorn', hit: () => ({}), each: (b, e, u) => b.bkRoot(u, 2) });
MV.druidSlam = fbSlam('根须震地', 0.8, 170, { cd: 6 });
// 知识古树 — one vocation: it learns whoever hits it most
MV.rootSlam = fbSlam('古根砸地', 0.7, 180);
MV.branch = fbFan('枝条横扫', 0.35, 480, 0.9, { cd: 7 });
MV.fruit = fbDrop('知识之果', 0.8, 110, (b) => { const us = ours(b), cnt = {}; us.forEach(u => { cnt[vocOf(u)] = (cnt[vocOf(u)] || 0) + 1; }); const top = Object.keys(cnt).sort((a, c) => cnt[c] - cnt[a])[0]; return pts(us.filter(u => vocOf(u) === top).slice(0, 5)); }, { cd: 7, wind: 1.4, rain: 'fruit' });
// 精灵女王 — the back rows: her crescent reaches the farthest; melee crowding her slow her down and she throws them off
const crescentLine = (b, u) => stretch(EDGE + 20, FB_Y - 20, u.x, u.y);
MV.crescent = { n: '月牙斩', cd: 4, wind: 1.1,
  plan(b) { const rg = ours(b).filter(x => x.ranged), pool = rg.length ? rg : ours(b); let u = null, bn = -1; pool.forEach(c => { const L0 = crescentLine(b, c), n = rg.filter(x => onLine(x, L0.x0, L0.y0, L0.x1, L0.y1, 80)).length; if (n > bn) { bn = n; u = c; } }); if (!u) return null; const L = crescentLine(b, u); return Object.assign(L, { omens: [{ shape: 'line', x0: L.x0, y0: L.y0, x: L.x1, y: L.y1, w: 80, r: 40 }] }); },
  fire(b, e, P) { ours(b).forEach(u => { if (onLine(u, P.x0, P.y0, P.x1, P.y1, 80)) b.bkHit(e, u, 2.8); }); b.fxp({ k: 'beam2', x1: P.x0, y1: P.y0 - 60, x2: P.x1, y2: P.y1 - 40, col: '#b8e0ff', w: 26, life: 0.35 }); try { S.whoosh && S.whoosh(0.8); } catch (err) { /* sound */ } } };
MV.starfall = fbDrop('星雨', 1.0, 90, (b) => pts(ours(b).filter(u => u.ranged).slice(0, 4)), { cd: 8, wind: 1.4, rain: 'star' });
MV.starfall2 = fbDrop('满月', 1.3, 90, (b) => pts(ours(b).filter(u => u.ranged)), { cd: 9, wind: 1.5, rain: 'star' });
// 木马公主 — melee at her feet: the carousel turns under them
MV.stomp = fbSlam('跺脚', 0.8, 150);
MV.spin = { n: '转圈', cd: 8, cd0: 3, wind: 1.0,
  plan(b) { return ours(b).some(u => u.x > EDGE - 280) ? { x: EDGE, y: FB_Y, r: 330, omens: [{ x: EDGE, y: FB_Y, r: 330 }] } : null; },
  fire(b, e, P) { b.bkZone({ x: P.x, y: P.y, r: P.r, until: b.t + 3, col: '#ff8ab0', src: e }); },
  chan: { dur: 3, every: 0.5, tick(b, e, P) { ours(b).forEach(u => { if (inRing(u, P.x, P.y, P.r)) b.bkHit(e, u, 0.35, { small: 1, col: '#ff8ab0' }); }); b.ring(P.x, P.y - 8, 40, P.r, '#ff8ab0', 8, 0.3); },
    end(b, e, P) { ours(b).forEach(u => { if (inRing(u, P.x, P.y, P.r) && !u.ranged) b.launch(u, -700, (u.y - FB_Y) * 0.5, 1.3); }); b.shake = Math.max(b.shake, 16); } } };
MV.horses = fbDrop('木马坠落', 1.0, 120, (b) => dense(ours(b), 120, 3), { cd: 8, wind: 1.5, rain: 'horse' });
// 小丑王 — one carry: the mallet finds the strongest, the balloons carry the two strongest away
MV.mallet = fbDrop('大锤点名', 1.2, 80, (b) => pts(byPow(b).slice(0, 1)), { cd: 6, wind: 1.5, follow: 1, tether: 1, hit: () => ({ stun: 2.5 }), each: (b, e, u) => b.bkHit(e, u, 0, { abs: u.maxHp * 0.25 }) });
MV.swing = fbFan('抡锤', 0.6, 420, 0.9, { cd: 5 });
MV.balloons = { n: '气球', cd: 12, cd0: 2, wind: 1.2,
  plan(b) { const t = byPow(b).filter(u => !u.isHero).slice(0, 2); return t.length ? { t, omens: t.map(u => ({ ent: u, r: 70, tether: 1 })) } : null; },
  fire(b, e, P) { P.t.forEach(u => { if (u.alive && !hidden(u)) { b.bkHide(u, 5, 'lift'); b.float(u.x, u.y - 220, '飘走了', '#ff9aa6', 28); } }); try { S.boing && S.boing(); } catch (err) { /* sound */ } } };
// 溺亡船长 — a thin front: the anchor on whoever stands first, cannons down the front, then the ship itself
MV.anchor = fbDrop('沉锚', 2.6, 90, (b) => pts(frontOf(b).slice(0, 1)), { cd: 6, wind: 2.0, follow: 1, tether: 1, hit: () => ({ flat: [-300, 0, 1.2] }) });
MV.cannons = fbDrop('炮击', 0.7, 110, (b) => pts(frontOf(b).slice(0, 3)), { cd: 7, wind: 1.4, rain: 'cannon' });
MV.ram = { n: '全速前进', cd: 12, cd0: 1, wind: 1.8,
  plan(b) { const f = frontOf(b).slice(0, 6); if (!f.length) return null; const y = clamp(f.reduce((a, u) => a + u.y, 0) / f.length, FY0 + 60, FY1 - 60); return { y, omens: [{ shape: 'line', x0: EDGE, y0: y, x: EDGE - 820, y, w: 220, r: 60 }] }; },
  fire(b, e, P) { ours(b).forEach(u => { if (onLine(u, EDGE, P.y, EDGE - 820, P.y, 220)) b.bkHit(e, u, 1.2, { launch: [-720, (u.y - P.y) * 1.5, 1.2] }); }); b.fxp({ k: 'beam2', x1: EDGE, y1: P.y - 50, x2: EDGE - 820, y2: P.y - 50, col: '#8ab0c8', w: 70, life: 0.4 }); b.shake = Math.max(b.shake, 26); try { S.impact && S.impact(); } catch (err) { /* sound */ } } };
// 深海巨口 — a single tank: swallowed; hurting the mouth makes it spit it out
MV.swallow = { n: '吞噬', cd: 8, cd0: 3, wind: 1.2,
  plan(b) { const u = frontOf(b).filter(x => !x.isHero)[0]; return u ? { u, omens: [{ ent: u, r: 80, tether: 1 }] } : null; },
  fire(b, e, P) { const u = P.u; if (!u.alive || hidden(u)) return; e.bk.gulp = { u, dmg: 0 }; b.float(u.x, u.y - 100, '被吞下', '#8ae0f4', 30); b.bkHide(u, 7, 'swallow', { by: e, drain: 0.08, outX: EDGE - 60, outY: FB_Y + (Math.random() - 0.5) * 220, stunOut: e.bk.phase === 2 ? 2 : 0 }); boom(b, u.x, u.y, 90, '#8ae0f4'); } };
MV.tentSweep = fbFan('触手横扫', 0.7, 480, 0.8, { cd: 5, mul: (u) => (DEFENDER.has(vocOf(u)) ? 0.5 : 2.5) });
// 熔炉工头 — healing: molten iron cuts it; overtime burns everyone
MV.forge = fbSlam('打铁', 1.0, 160);
MV.molten = fbDrop('铁水', 0.6, 150, (b) => dense(ours(b), 150, 4), { cd: 7, wind: 1.2, rain: 'drop', at: (b, e, x, y) => b.bkZone({ x, y, r: 150, until: b.t + 8, col: '#ff7a1c', src: e, healK: 0.2, dps: e.atk * 0.12, bub: '#ffc040' }) });
// 蒸汽巨像 — many small blows: armour takes a fixed bite off each
MV.piston = fbSlam('活塞重拳', 1.4, 170);
MV.gear = fbFan('齿轮臂', 0.8, 420, 0.9, { cd: 6 });
// 护士长 — skills: the needle drains mana and seals it
MV.needle = fbDrop('扎针', 0.9, 70, (b) => pts(ours(b).filter(u => u.hasMana).sort((a, c) => c.mana - a.mana).slice(0, 4)), { cd: 5, wind: 1.1, follow: 1, tether: 1, hit: () => ({}),
  each: (b, e, u) => { u.mana = 0; bs(u).sil = b.t + 6; b.float(u.x, u.y - 100, '封印', '#9fe0ff', 24); } });
MV.needleRain = fbDrop('针雨', 0.7, 90, (b) => pts(rnd(ours(b), 6)), { cd: 7, wind: 1.4, rain: 'needle' });
// 院长 — the wounded: it finishes whoever is low; the stitch ties a weak unit to the one taking the blows
MV.operate = { n: '开刀', cd: 4.5, wind: 1.2,
  plan(b) { const u = ours(b).filter(x => x.hp < x.maxHp * 0.4).sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0]; return u ? { u, omens: [{ ent: u, r: 70, tether: 1 }] } : null; },
  fire(b, e, P) { const u = P.u; if (!u.alive || hidden(u)) return; if (u.hp < u.maxHp * 0.45) { b.bkHit(e, u, 0, { abs: u.maxHp * 3 + (u.shield || 0) }); b.float(u.x, u.y - 100, '开刀', '#ff4a5a', 32); } else b.bkHit(e, u, 1.8); b.fxp({ k: 'slash', x: u.x, y: u.y - 40, life: 0.2, big: 1, col: '#ff4a5a' }); } };
MV.cut = fbFan('横切', 1.5, 460, 0.85, { cd: 4.5 });
MV.stitch = { n: '缝合', cd: 12, cd0: 0, wind: 1.0,
  plan(b) { const f = frontOf(b).filter(u => !u.isHero)[0], w = f && ours(b).filter(u => u !== f && !u.isHero).sort((a, c) => a.maxHp - c.maxHp)[0]; return f && w ? { a: f, c: w, omens: [{ ent: f, r: 60 }, { ent: w, r: 60 }] } : null; },
  fire(b, e, P) { if (P.a.alive && P.c.alive) { b.bkLink([P.a, P.c], 8, '#e8dcc4'); b.float(P.c.x, P.c.y - 100, '缝在一起', '#e8dcc4', 26); } } };
// 防卫机甲 — shooters: its shield throws half of every shot back; the orbital strike finds the last row
MV.hammerProto = fbSlam('重锤协议', 1.0, 170);
MV.scan = fbFan('扫描切割', 0.8, 520, 0.6, { cd: 6 });
MV.orbital = fbDrop('轨道打击', 1.0, 100, (b) => pts(ours(b).sort((a, c) => a.x - c.x).slice(0, 3)), { cd: 8, wind: 1.5, rain: 'laser' });
// 异形母巢 — single-target armies: larvae every few seconds, running for the back rows
const acid = (b, l) => { const k = l.bkOwner; if (!k) return; ours(b).forEach(u => { if (!inRing(u, l.x, l.y, 110)) return; b.bkHit(k, u, 0.2, { small: 1, col: '#6ec820' }); const D = u.debuf.acid || (u.debuf.acid = { v: 0.15, n: 0 }); D.n = Math.min(3, D.n + 1); D.until = b.t + 6; }); b.fxp({ k: 'fberupt', kind: 'spout', x: l.x, y: l.y, life: 0.5 }); };
MV.hatch = { n: '孵化', cd: 4, cd0: 1, wind: 0.6,
  plan(b, e) { return b.ents.filter(u => u.alive && u.bkOwner === e && u.bkTag === 'larva').length < 20 ? { omens: [] } : null; },
  fire(b, e) { for (let i = 0; i < 4; i++) { const l = b.bkSummon(e, 'VerdantWormSoldier', EDGE - 40, FB_Y + (Math.random() - 0.5) * 320, { hp: 0.007, atk: 0.25, tag: 'larva', cap: 20, nm: '幼虫', spd: 150 }); if (!l) continue; l.bkPick = (bb) => farFrom(ours(bb), FB_X, FB_Y)[0] || null; if (e.bk.phase === 2) l.bkOnDie = acid; } } };
MV.impale = { n: '刺穿', cd: 6, wind: 1.3,
  plan(b) { const u = frontOf(b)[0]; if (!u) return null; const { x0, y0, x1, y1 } = stretch(EDGE + 20, FB_Y, u.x, u.y, 760); return { x0, y0, x1, y1, omens: [{ shape: 'line', x0, y0, x: x1, y: y1, w: 70, r: 36 }] }; },
  fire(b, e, P) { ours(b).forEach(u => { if (onLine(u, P.x0, P.y0, P.x1, P.y1, 70)) b.bkHit(e, u, 1.0); }); b.fxp({ k: 'beam2', x1: P.x0, y1: P.y0 - 40, x2: P.x1, y2: P.y1 - 40, col: '#b8f050', w: 22, life: 0.3 }); } };
// 狱卒 — one crowded rank: three chained together, rooted, sharing every blow; then the chains fall on them
MV.chains = { n: '锁链', cd: 10, cd0: 3, wind: 1.3,
  plan(b) { const us = ours(b).filter(u => !u.isHero); let best = null, bn = 0; us.forEach(c => { const n = us.filter(o => o !== c && d2(o, c.x, c.y) < 170).length; if (n > bn) { bn = n; best = c; } }); if (!best) return null; const g = [best].concat(nearTo(us.filter(o => o !== best && d2(o, best.x, best.y) < 220), best.x, best.y).slice(0, 3)); return { g, omens: g.map(u => ({ ent: u, r: 60 })) }; },
  fire(b, e, P) { const g = P.g.filter(u => u.alive && !hidden(u)); if (g.length < 2) return; b.bkLink(g, 8, '#8a8698'); g.forEach(u => { b.bkRoot(u, 8); bs(u).shackled = b.t + 8; }); b.float(g[0].x, g[0].y - 110, '锁住了', '#c8c4d4', 28); try { S.lever && S.lever(); } catch (err) { /* sound */ } } };
MV.shackle = fbSlam('镣铐砸地', 1.0, 170);
MV.gateOpen = fbDrop('门开了', 1.6, 90, (b) => { const c = ours(b).filter(u => u.bs && u.bs.link && u.bs.link.until > b.t); return c.length ? pts(c) : dense(ours(b), 90, 2); }, { cd: 8, wind: 1.4, rain: 'chain' });
// 血河摆渡人 — a slow army: the fare is taken every second from everyone, and it drinks it
MV.oar = fbSlam('船桨', 1.0, 160);
MV.row = fbFan('划桨', 0.6, 460, 0.85, { cd: 7 });
// 深渊魔王 — a slow army with one carry: meteors on the strongest, and after 90 s its rage
MV.meteor = fbDrop('陨石', 1.8, 110, (b) => pts(byPow(b).slice(0, 1)), { cd: 7, wind: 1.6, follow: 1, tether: 1, rain: 'meteor' });
MV.meteor2 = fbDrop('陨石雨', 1.6, 110, (b) => pts(byPow(b).slice(0, 2)), { cd: 7, wind: 1.5, follow: 1, tether: 1, rain: 'meteor' });
MV.dSlam = fbSlam('震击', 0.8, 250, { wind: 1.4 });
// 荷官 — an army that needs its rows: the shuffle swaps the front and the back
MV.shuffle = { n: '洗牌', cd: 8, cd0: 3, wind: 1.1,
  plan(b) { const us = ours(b).filter(u => !u.isHero).sort((a, c) => c.x - a.x); if (us.length < 4) return null; const n = Math.min(3, Math.floor(us.length / 2)), f = us.slice(0, n), r = us.slice(-n); return { f, r, omens: f.concat(r).map(u => ({ ent: u, r: 60 })) }; },
  fire(b, e, P) { for (let i = 0; i < P.f.length; i++) { const a = P.f[i], c = P.r[i]; if (!a || !c || !a.alive || !c.alive || hidden(a) || hidden(c)) continue; const ax = a.x, ay = a.y; a.x = c.x; a.y = c.y; c.x = ax; c.y = ay; a.target = null; c.target = null; [a, c].forEach(u => { b.fxp({ k: 'rays', x: u.x, y: u.y - 40, col: '#ffe08a', life: 0.5, r: 90 }); }); } b.float(960, 260, '洗牌', '#ffe08a', 44); } };
MV.dealCards = fbDrop('发牌', 0.9, 80, (b) => pts(ours(b).sort((a, c) => a.x - c.x).slice(0, 4)), { cd: 5, wind: 1.2, rain: 'card' });
MV.slapTable = fbDrop('拍桌', 1.6, 90, (b) => pts(frontOf(b).slice(0, 2)), { cd: 5, wind: 1.2, follow: 1, tether: 1 });
MV.allIn = { n: '全押', cd: 16, cd0: 2, wind: 1.6, plan: () => ({ omens: [] }),
  fire(b, e) { const win = Math.random() < 0.5; if (win) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.2); b.float(FB_X, 200, '全押 · 赢了', '#ff4a5a', 48); } else { e.hp = Math.max(1, e.hp - e.maxHp * 0.2); b.float(FB_X, 200, '全押 · 输了', '#b6f28a', 48); } b.flash = 0.4; b.flashCol = win ? '#ff4a5a' : '#ffe08a'; try { S.jackpot && S.jackpot(); } catch (err) { /* sound */ } } };
// 庄家 — the crowd first (coins on everyone), then the carry (the two strongest robbed and struck)
MV.coinRain = { n: '金币雨', cd: 7, cd0: 3, wind: 1.3,
  plan(b) { const us = ours(b); return us.length ? { omens: us.slice(0, 24).map(u => ({ ent: u, r: 50, rain: 'coin' })) } : null; },
  fire(b, e) { ours(b).forEach(u => b.bkHit(e, u, 0.6, { small: 1, col: '#ffd060' })); b.shake = Math.max(b.shake, 14); } };
MV.collect = { n: '收筹码', cd: 8, wind: 1.0,
  plan(b) { const t = ours(b).filter(u => u.shield > 0 || (u.buffs && u.buffs.length)).sort((a, c) => (c.shield + c.buffs.length * 100) - (a.shield + a.buffs.length * 100)).slice(0, 5); return t.length ? { t, omens: t.map(u => ({ ent: u, r: 60, tether: 1 })) } : null; },
  fire(b, e, P) { let got = 0; P.t.forEach(u => { if (!u.alive) return; got += u.shield || 0; u.shield = 0; u.buffs = []; b.orb(u, e, '#ffd060'); }); e.shield = (e.shield || 0) + got; b.float(FB_X, 220, '收筹码', '#ffd060', 36); } };
MV.takeAll = fbDrop('庄家通吃', 2.0, 80, (b) => pts(byPow(b).slice(0, 2)), { cd: 8, wind: 1.6, follow: 1, tether: 1,
  each: (b, e, u) => { e.shield = (e.shield || 0) + (u.shield || 0); u.shield = 0; u.buffs = []; } });

// small bosses: around itself, on a unit (the mark follows it), a fan or a line toward its target
const tgtOf = (b, e) => (e.target && e.target.alive && e.target.side !== e.side && !hidden(e.target) ? e.target : nearTo(ours(b), e.x, e.y)[0] || null);
const lineTo = (e, u, len) => stretch(e.x, e.y, u.x, u.y, len || Math.hypot(u.x - e.x, u.y - e.y));
const mbOn = (n, m, r, pick, o = {}) => ({ n, cd: o.cd || 6, cd0: o.cd0, wind: o.wind || 0.9,
  plan(b, e, A) { const u = pick(b, e, A); return u ? { u, omens: [{ ent: u, r, tether: 1, rain: o.rain }] } : null; },
  fire(b, e, P) { const x = P.u.x, y = P.u.y; ours(b).forEach(v => { if (inRing(v, x, y, r) || v === P.u) { b.bkHit(e, v, m * (o.mul ? o.mul(b, e, v) : 1), o.hit ? o.hit(b, e, v, P) : {}); if (o.each && v.alive) o.each(b, e, v, P); } }); boom(b, x, y, r, o.col); } });
const mbSelf = (n, m, r, o = {}) => ({ n, cd: o.cd || 7, cd0: o.cd0, wind: o.wind || 0.9,
  plan(b, e) { return ours(b).some(u => inRing(u, e.x, e.y, r)) ? { omens: [{ ent: e, r }] } : null; },
  fire(b, e) { ours(b).forEach(u => { if (inRing(u, e.x, e.y, r)) { b.bkHit(e, u, m, o.hit ? o.hit(b, e, u) : { launch: [...away(e, u, 420), 1] }); if (o.each && u.alive) o.each(b, e, u); } }); boom(b, e.x, e.y, r, o.col, 1); } });
const mbFan = (n, m, r, half, o = {}) => ({ n, cd: o.cd || 6, cd0: o.cd0, wind: o.wind || 1.0,
  plan(b, e) { const t = tgtOf(b, e); if (!t) return null; const dir = faceTo(e, t.x); return ours(b).some(u => inFan(u, e.x, e.y, r, half, dir)) ? { dir, omens: [{ shape: 'sector', x: e.x, y: e.y, r, half, dir }] } : null; },
  fire(b, e, P) { ours(b).forEach(u => { if (inFan(u, e.x, e.y, r, half, P.dir)) { b.bkHit(e, u, m, o.hit ? o.hit(b, e, u, P) : { launch: [P.dir * 420, (u.y - e.y) * 0.6, 0.9] }); if (o.each && u.alive) o.each(b, e, u); } }); b.fxp({ k: 'fbsweep', x: e.x, y: e.y, r, half, dir: P.dir, life: 0.35 }); b.shake = Math.max(b.shake, 14); } });
const mbLine = (n, m, w, len, o = {}) => ({ n, cd: o.cd || 7, cd0: o.cd0, wind: o.wind || 1.0,
  plan(b, e) { const t = o.pick ? o.pick(b, e) : tgtOf(b, e); if (!t) return null; const L = lineTo(e, t, len); return Object.assign(L, { omens: [{ shape: 'line', x0: L.x0, y0: L.y0, x: L.x1, y: L.y1, w, r: w / 2 }] }); },
  fire(b, e, P) { ours(b).forEach(u => { if (onLine(u, P.x0, P.y0, P.x1, P.y1, w)) { b.bkHit(e, u, m, o.hit ? o.hit(b, e, u) : {}); if (o.each && u.alive) o.each(b, e, u); } }); b.fxp({ k: 'beam2', x1: P.x0, y1: P.y0 - 50, x2: P.x1, y2: P.y1 - 40, col: o.col || '#ffb080', w: w * 0.35, life: 0.3 }); } });
// a run along a line, hitting who it passes
const dashTo = (b, e, x1, y1, o = {}) => { const p = fieldPt(x1, y1), d = Math.hypot(p.x - e.x, p.y - e.y); e.bk.dash = Object.assign({ x0: e.x, y0: e.y, x1: p.x, y1: p.y, t0: b.t, dur: Math.max(0.25, d / (o.speed || 1500)), w: o.w || 90, hit: new Set() }, o); };
const rearOf = (b) => ours(b).sort((a, c) => a.x - c.x);

// 更夫 — plain blows: they barely touch a ghost; the watch counts to the third hour and the lance goes through a whole row
MV.watchThrust = { n: '三更', cd: 0, wind: 1.2,
  plan(b, e, A) { if ((A.gen || 0) < 3) return null; const t = tgtOf(b, e); if (!t) return null; const dir = faceTo(e, t.x), x1 = dir < 0 ? 180 : 1880; return { y: t.y, x1, omens: [{ shape: 'line', x0: e.x, y0: t.y, x: x1, y: t.y, w: 100, r: 40 }] }; },
  fire(b, e, P) { ours(b).forEach(u => { if (onLine(u, e.x, P.y, P.x1, P.y, 100)) b.bkHit(e, u, 2.6, { flat: [(P.x1 < e.x ? -1 : 1) * 300, 0, 1] }); }); b.fxp({ k: 'beam2', x1: e.x, y1: P.y - 50, x2: P.x1, y2: P.y - 50, col: '#9fe8e0', w: 34, life: 0.35 }); e.bk.gen = 0; e.bk.watch = 0; b.shake = Math.max(b.shake, 18); } };
MV.lantern = mbFan('提灯', 0, 380, 0.7, { cd: 9, wind: 0.8, hit: () => ({ small: 1 }), each: (b, e, u) => { u.slowAS = 0.3; u.slowT = b.t + 5; b.float(u.x, u.y - 90 * (u.sz || 1), '昏暗', '#9fe8e0', 20); } });
// 鼠王 — no area damage: rats keep coming, and each one standing shields their king
MV.ratTide = { n: '鼠潮', cd: 5, cd0: 1, wind: 0.6, plan: (b, e) => (b.ents.filter(u => u.alive && u.bkOwner === e && u.bkTag === 'rat').length < 20 ? { omens: [] } : null), fire(b, e) { ratsOut(b, e, 6); } };
const ratsOut = (b, e, n) => { for (let i = 0; i < n; i++) { const r = b.bkSummon(e, 'DecayingCorpseRat', e.x + (Math.random() - 0.5) * 200, e.y + (Math.random() - 0.5) * 160, { hp: 0.015, atk: 0.2, tag: 'rat', cap: 20, nm: '老鼠', entry: 'emerge' }); if (r) r.bkOnHit = (bb, s, tg, d, o) => { if (o.auto) bb.bkPoison(tg, 1, e.atk * 0.05, e, { max: 5, life: 6 }); }; } };
MV.plagueBite = mbOn('瘟疫咬', 1.2, 70, tgtOf, { cd: 6, each: (b, e, u) => b.bkPoison(u, 3, e.atk * 0.05, e, { max: 5, life: 6 }) });
// 巨掌 — one tank: three blows, the third throws it back; the honey heals it unless hit hard enough to drop the jar
MV.paws = { n: '连环掌', cd: 5, cd0: 2, wind: 0.8, plan: (b, e) => { const u = tgtOf(b, e); return u ? { u, omens: [{ ent: u, r: 70, tether: 1 }] } : null; }, fire() {},
  chan: { dur: 0.9, every: 0.3, tick(b, e, P, k) { const u = P.u; if (!u.alive || hidden(u)) return; b.bkHit(e, u, 1.3, k >= 2 ? { launch: [...away(e, u, 620), 1.2], stun: 2.5 } : {}); b.fxp({ k: 'slash', x: u.x, y: u.y - 40, life: 0.14, big: 1, col: '#ffb020' }); } } };
MV.honey = { n: '偷蜜', cd: 14, cd0: 9, wind: 0.5, plan: (b, e) => (e.hp < e.maxHp * 0.9 ? { omens: [] } : null),
  fire(b, e, P) { e.bk.jar = { dmg: 0 }; P.pot = b.fxp({ k: 'bkPot', ent: e, life: 6 }); },
  chan: { dur: 6, every: 0.5, tick(b, e) { if (!e.bk.jar) return; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.01); b.fxp({ k: 'plus', x: e.x + (Math.random() - 0.5) * 40, y: e.y - 60, life: 0.6 }); }, end(b, e) { e.bk.jar = null; } } };
// 虫王 — no healer: its poison never wears off by itself; it burrows up under whoever carries the most
MV.burrow = { n: '钻地', cd: 9, cd0: 4, wind: 0.5,
  plan(b, e) { if (ours(b).filter(u => !u.ranged && inRing(u, e.x, e.y, 170)).length >= 3) return null; const us = ours(b); const u = us.sort((a, c) => ((c.bs && c.bs.psn && c.bs.psn.n) || 0) - ((a.bs && a.bs.psn && a.bs.psn.n) || 0) || d2(c, e.x, e.y) - d2(a, e.x, e.y))[0]; return u ? { u, omens: [{ ent: u, r: 150, until: b.t + 2.5 }] } : null; },
  fire(b, e, P) { b.dust(e.x, e.y, 16); b.bkHide(e, 2, 'burrow', { onEnd: (bb, me) => { const u = P.u, p = u.alive && !hidden(u) ? u : me; me.x = p.x + 30; me.y = p.y; hitRing(bb, me, me.x, me.y, 150, 1.0, { launch: true }); ours(bb).forEach(v => { if (inRing(v, me.x, me.y, 150)) bb.bkPoison(v, 3, me.atk * 0.07, me, { max: 10, cleanse: 1 }); }); boom(bb, me.x, me.y, 150, '#6ec820', 1); } }); } };
MV.tutBurrow = { n: '钻地', cd: 10, cd0: 5, wind: 0.6,
  plan(b, e) { const u = farFrom(ours(b), e.x, e.y)[0]; return u ? { u, omens: [{ ent: u, r: 140, until: b.t + 2.6 }] } : null; },
  fire(b, e, P) { b.dust(e.x, e.y, 16); b.bkHide(e, 2, 'burrow', { onEnd: (bb, me) => { const u = P.u, p = u.alive && !hidden(u) ? u : me; me.x = p.x + 30; me.y = p.y; hitRing(bb, me, me.x, me.y, 140, 0.8, { launch: true }); boom(bb, me.x, me.y, 140, '#6ec820', 1); } }); } };
MV.silk = mbLine('吐丝', 0.4, 70, 0, { cd: 8, wind: 0.9, pick: (b, e) => farFrom(ours(b), e.x, e.y)[0], col: '#e8e4f0', hit: () => ({ stun: 3, small: 1 }), each: (b, e, u) => b.fxp({ k: 'bkWeb', ent: u, life: 3 }) });
// 奔雷 — a thin front: the charge goes through the whole field unless a 先锋 or 守护者 stands in its way
const charge = (b, e, x1, y1, back) => { const dir = x1 < e.x ? -1 : 1; dashTo(b, e, x1, y1, { speed: 1500, w: 90, back,
  onHit(bb, me, u) { if (DEFENDER.has(vocOf(u))) { bb.bkHit(me, u, 0.4, { small: 1 }); return; } bb.bkHit(me, u, 2.2, { launch: [dir * 220, (u.y >= me.y ? 1 : -1) * 320, 0.9] }); },
  stop: (u) => DEFENDER.has(vocOf(u)),
  onEnd(bb, me, D) { if (D.stopped) { me.stun = Math.max(me.stun || 0, 3); bb.float(me.x, me.y - 140, '拦下了', '#9fe0ff', 32); bb.shake = Math.max(bb.shake, 20); return; } if (me.bk.phase === 2 && !D.back) charge(bb, me, D.x0, D.y0, true); } }); };
MV.charge = { n: '冲锋', cd: 7, cd0: 3, wind: 1.2,
  plan(b, e) { const t = tgtOf(b, e); if (!t) return null; const L = lineTo(e, t, 1600); return Object.assign(L, { omens: [{ shape: 'line', x0: e.x, y0: e.y, x: L.x1, y: L.y1, w: 110, r: 50 }] }); },
  fire(b, e, P) { charge(b, e, P.x1, P.y1, false); try { S.whoosh && S.whoosh(0.9); } catch (err) { /* sound */ } } };
MV.trample = mbSelf('践踏', 0.5, 170, { cd: 7, hit: () => ({ small: 1 }), each: (b, e, u) => b.bkSlow(u, 3, 0.5) });
// 惊喜盒 — a crowd of small units: it swallows the small ones whole and grows
MV.gulp = { n: '吞', cd: 6, cd0: 2, wind: 0.9,
  plan(b, e) { const near = ours(b).filter(u => d2(u, e.x, e.y) < 320 && !u.isHero).sort((a, c) => a.maxHp - c.maxHp); const u = near[0] || tgtOf(b, e); return u ? { u, omens: [{ ent: u, r: 70, tether: 1 }] } : null; },
  fire(b, e, P) { const u = P.u; if (!u.alive || hidden(u)) return; if (u.maxHp < e.maxHp * 0.05 && !u.isHero) { b.bkHit(e, u, 0, { abs: u.maxHp * 5 + (u.shield || 0) }); b.float(u.x, u.y - 100, '吞下了', '#ffcc33', 30); e.bk.eat = (e.bk.eat || 0) + 1; e.atk *= 1.1; e.sz = Math.min(e.sz * 1.06, 3.2); } else b.bkHit(e, u, 2.0); b.fxp({ k: 'slash', x: u.x, y: u.y - 40, life: 0.2, big: 1, col: '#ffcc33' }); } };
MV.chomp = mbFan('大嘴一合', 1.4, 300, 0.9, { cd: 5, hit: () => ({ small: 1 }) });
// 大力士 — the big units: it lifts the one with the most life and drops it
MV.heave = { n: '举重', cd: 7, cd0: 3, wind: 1.3,
  plan(b) { const u = ours(b).sort((a, c) => c.maxHp - a.maxHp)[0]; return u ? { u, omens: [{ ent: u, r: 110, tether: 1 }] } : null; },
  fire(b, e, P) { const u = P.u; if (!u.alive || hidden(u)) return; const tot = ours(b).reduce((a, x) => a + x.maxHp, 0) || u.maxHp, big = u.maxHp / tot >= 0.12; b.bkHit(e, u, 0, { abs: u.maxHp * (big ? 3 : 0.5), stun: 2, launch: [0, 0, 1.4] }); if (big) b.float(u.x, u.y - 170, '摔倒了', '#ff8a6a', 32); boom(b, u.x, u.y, 110, '#ffb080', 1); b.float(u.x, u.y - 140, '举起来了', '#ffb080', 28); } };
MV.club = mbOn('抡棒', 1.4, 60, (b, e) => ours(b).filter(u => d2(u, e.x, e.y) < 320).sort((a, c) => c.maxHp - a.maxHp)[0] || tgtOf(b, e), { cd: 5, wind: 0.8, hit: (b, e, u) => ({ launch: [...away(e, u, 420), 1] }), each: (b, e, u) => b.bkHit(e, u, 0, { abs: u.maxHp * 0.12 }) });
// 灯眼 — a slow army: four beams that burn hotter the longer they hold one unit
const beamPick = (b, e, P, B) => { const taken = new Set(P.beams.map(x => x.u)); return ours(b).filter(u => !taken.has(u)).sort((a, c) => c.maxHp - a.maxHp)[0] || null; };
MV.fourBeams = { n: '四道光', cd: 12, cd0: 3, wind: 0.8,
  plan(b, e) { const t = ours(b).sort((a, c) => c.maxHp - a.maxHp).slice(0, 4); return t.length ? { t, omens: t.map(u => ({ ent: u, r: 50, tether: 1 })) } : null; },
  fire(b, e, P) { P.beams = P.t.map(u => ({ u, n: 0 })); },
  chan: { dur: 5, every: 0.5, tick(b, e, P) { (P.beams || []).forEach(B => { if (!B.u || !B.u.alive || hidden(B.u)) { const nu = beamPick(b, e, P, B); if (!nu) return; B.u = nu; B.n = 0; } B.n++; b.bkHit(e, B.u, 0, { abs: e.atk * 0.1 * (1 + 0.4 * B.n) * (1 + (e.bk.atkK || 0)) + B.u.maxHp * 0.012 * B.n, small: 1, col: '#ff5aff' }); b.fxp({ k: 'bkBeam', a: e, b: B.u, col: '#ff5aff', w: 10, life: 0.52 }); }); } } };
MV.oneBeam = { n: '一道光', cd: 11, cd0: 1, wind: 0.8,
  plan(b, e) { const u = tgtOf(b, e); return u ? { u, omens: [{ ent: u, r: 60, tether: 1 }] } : null; }, fire(b, e, P) { P.n = 0; },
  chan: { dur: 6, every: 0.5, tick(b, e, P) { let u = P.u; if (!u || !u.alive || hidden(u)) { u = P.u = tgtOf(b, e); P.n = 0; if (!u) return; } P.n++; b.bkHit(e, u, 0.12 * (1 + 2 * P.n), { small: 1, col: '#ff5aff' }); b.fxp({ k: 'bkBeam', a: e, b: u, col: '#ff5aff', w: 18, life: 0.52 }); } } };
MV.sweepLight = { n: '灯塔扫射', cd: 8, cd0: 5, wind: 1.2,
  plan(b, e) { const us = ours(b).sort((a, c) => a.x - c.x); if (!us.length) return null; const t = [us[0], us[us.length >> 1], us[us.length - 1]]; return { t, omens: t.map(u => ({ shape: 'line', x: u.x, y: u.y, w: 70, r: 30 })) }; },
  fire(b, e, P) { const hit = new Set(); P.oms.forEach(om => ours(b).forEach(u => { if (!hit.has(u) && onLine(u, e.x, e.y, om.x, om.y, 70)) { hit.add(u); b.bkHit(e, u, 0.6); } })); P.oms.forEach(om => b.fxp({ k: 'beam2', x1: e.x, y1: e.y - 80, x2: om.x, y2: om.y - 40, col: '#ffe08a', w: 20, life: 0.3 })); } };
// 克拉肯 — a small army: four tentacles hold four units until cut
MV.grab = { n: '缠绕', cd: 10, cd0: 2, wind: 1.0,
  plan(b, e, A) { const t = rnd(ours(b).filter(u => !u.isHero), A.phase === 2 ? 7 : 5); return t.length ? { t, omens: t.map(u => ({ ent: u, r: 60 })) } : null; },
  fire(b, e, P) { P.t.forEach(u => { if (!u.alive || hidden(u)) return; const c = b.bkSummon(e, 'VerdantWormCommander', u.x + 34, u.y + 4, { hp: 0.08, atk: 0, tag: 'tent', noAtk: 1, spd: 0, nm: '触手', cap: 8, entry: 'emerge' }); if (!c) return; c.lifeEnd = b.t + 10; c.bkGrab = u; u.stun = Math.max(u.stun || 0, 10); b.fxp({ k: 'bkLink', a: c, b: u, col: '#3a6a8a', life: 10 }); c.bkOnDie = (bb, t) => { const v = t.bkGrab; if (v && v.alive) { v.stun = 0; bb.float(v.x, v.y - 90, '挣脱', '#9fe0ff', 24); } }; }); } };
MV.ink = { n: '墨汁', cd: 9, cd0: 6, wind: 1.0,
  plan(b) { const c = dense(ours(b), 200, 1)[0]; return c ? { x: c.x, y: c.y, omens: [{ x: c.x, y: c.y, r: 200 }] } : null; },
  fire(b, e, P) { b.bkZone({ x: P.x, y: P.y, r: 200, until: b.t + 6, ink: 1, col: '#3a2a5a', src: e, bub: '#1a1426' }); } };
// 破门锤 — shooters: arrows barely scratch it; it rams through to where they stand
MV.ramGate = { n: '撞门', cd: 9, cd0: 3, wind: 1.3,
  plan(b, e) { const rg = ours(b).filter(u => u.ranged), list = rg.length ? rg : ours(b); if (!list.length) return null; const x = list.reduce((a, u) => a + u.x, 0) / list.length, y = list.reduce((a, u) => a + u.y, 0) / list.length; return { x, y, omens: [{ shape: 'line', x: x, y, w: 120, r: 60 }] }; },
  fire(b, e, P) { const dir = P.x < e.x ? -1 : 1; dashTo(b, e, P.x + dir * 80, P.y, { speed: 1300, w: 100, onHit(bb, me, u) { bb.bkHit(me, u, 1.6, { launch: [dir * 380, (u.y - me.y) * 1.2, 1] }); } }); try { S.impact && S.impact(); } catch (err) { /* sound */ } } };
MV.batter = { n: '连撞', cd: 6, cd0: 5, wind: 0.7, plan: (b, e) => { const u = tgtOf(b, e); return u && d2(u, e.x, e.y) < 260 ? { u, omens: [{ ent: u, r: 70, tether: 1 }] } : null; }, fire() {},
  chan: { dur: 0.6, every: 0.2, tick(b, e, P) { if (P.u.alive && !hidden(P.u)) b.bkHit(e, P.u, 0.8, { small: 1 }); b.shake = Math.max(b.shake, 10); } } };
// 铁龙 — melee: the heat of its body, a fan of fire, a tail that throws them off
MV.flame = { n: '喷火', cd: 8, cd0: 3, wind: 0.8,
  plan(b, e) { const t = tgtOf(b, e); if (!t) return null; const dir = faceTo(e, t.x); return { dir, omens: [{ shape: 'sector', x: e.x, y: e.y, r: 340, half: 0.6, dir }] }; }, fire() {},
  chan: { dur: 3, every: 0.3, tick(b, e, P) { ours(b).forEach(u => { if (inFan(u, e.x, e.y, 340, 0.6, P.dir)) b.bkHit(e, u, 0.25, { small: 1, col: '#ff7a1c' }); }); for (let i = 0; i < 6; i++) { const a = (Math.random() - 0.5) * 1.2, v = 500 + Math.random() * 400; b.fxp({ k: 'pt', x: e.x + P.dir * 40, y: e.y - 60, vx: P.dir * Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, col: i % 2 ? '#ffc040' : '#ff5a1c', life: 0.5 }); } } } };
MV.tail = mbSelf('甩尾', 0.6, 190, { cd: 7 });
// 针婆 — shields and blessings: its needles go through shields first and pull every blessing out
const buffy = (u) => (u.shield || 0) + ((u.buffs && u.buffs.length) || 0) * 50;
const strip = (b, u) => { if (u.shield > 0 || (u.buffs && u.buffs.length)) b.float(u.x, u.y - 100, '拔掉了', '#d4dbe6', 22); u.shield = 0; u.buffs = []; };
MV.volley = { n: '连射', cd: 7, cd0: 2, wind: 0.8,
  plan(b, e) { const u = ours(b).sort((a, c) => buffy(c) - buffy(a))[0]; const t = u && buffy(u) > 0 ? u : tgtOf(b, e); return t ? { u: t, omens: [{ ent: t, r: 60, tether: 1 }] } : null; }, fire() {},
  chan: { dur: 1.2, every: 0.2, tick(b, e, P) { const u = P.u; if (!u.alive || hidden(u)) return; b.orb(e, u, '#d4dbe6'); b.bkHit(e, u, 0.35, { small: 1, col: '#d4dbe6' }); } } };
MV.pluck = mbOn('拔针', 0.8, 150, (b, e) => { const c = dense(ours(b).filter(u => buffy(u) > 0), 150, 1)[0]; return c ? c.u || nearTo(ours(b), c.x, c.y)[0] : tgtOf(b, e); }, { cd: 7, wind: 1.0, hit: () => ({ small: 1, stun: 1 }), each: (b, e, u) => strip(b, u) });
MV.needleRain2 = fbDrop('针雨', 0.6, 70, (b) => { const t = ours(b).filter(u => buffy(u) > 0).slice(0, 8); return t.length ? pts(t) : dense(ours(b), 90, 3); }, { cd: 10, wind: 1.2, rain: 'needle', hit: () => ({ small: 1 }), each: (b, e, u) => strip(b, u) });
// 屠夫 — shooters in the back: the hook drags the first unit on its line to the butcher (a 先锋 or 守护者 in the way takes it)
const hookOne = (b, e, far) => { const L = lineTo(e, far, Math.max(200, d2(far, e.x, e.y))); const on = ours(b).filter(u => onLine(u, L.x0, L.y0, L.x1, L.y1, 60)).sort((a, c) => d2(a, e.x, e.y) - d2(c, e.x, e.y))[0]; b.fxp({ k: 'beam2', x1: e.x, y1: e.y - 60, x2: L.x1, y2: L.y1 - 40, col: '#8a8698', w: 8, life: 0.3 }); if (!on) return; if (DEFENDER.has(vocOf(on))) { b.bkHit(e, on, 0.3, { small: 1 }); b.float(on.x, on.y - 100, '挡下了', '#9fe0ff', 26); return; } const dir = on.x < e.x ? -1 : 1; b.fxp({ k: 'orb', x1: on.x, y1: on.y - 40, x2: e.x + dir * 70, y2: e.y - 40, col: '#ff4a5a', life: 0.3 }); const p = fieldPt(e.x + dir * 70, e.y + (Math.random() - 0.5) * 40); on.x = p.x; on.y = p.y; on.target = e; bs(on).hooked = b.t + 4; b.bkHit(e, on, 1.2); b.float(on.x, on.y - 100, '钩过来了', '#ff4a5a', 26); };
MV.hook = { n: '钩子', cd: 6, cd0: 2, wind: 1.0,
  plan(b, e, A) { const f = farFrom(ours(b), e.x, e.y).slice(0, A.phase === 2 ? 2 : 1); return f.length ? { f, omens: f.map(u => { const L = lineTo(e, u, Math.max(200, d2(u, e.x, e.y))); return { shape: 'line', x: L.x1, y: L.y1, w: 60, r: 30 }; }) } : null; },
  fire(b, e, P) { P.f.forEach(u => { if (u.alive) hookOne(b, e, u); }); try { S.whoosh && S.whoosh(0.7); } catch (err) { /* sound */ } } };
MV.chop = mbOn('剁肉', 1.6, 70, (b, e) => ours(b).find(u => u.bs && u.bs.hooked > b.t && d2(u, e.x, e.y) < 300) || tgtOf(b, e), { cd: 6, wind: 0.8, mul: (b, e, u) => (u.bs && u.bs.hooked > b.t ? 2 : 1) });
// 哨眼 — melee: it floats out of reach, burns the strongest with its beam, dives, and only then can swords reach it
MV.lock = { n: '锁定', cd: 9, cd0: 3, wind: 0.6,
  plan(b) { const u = byPow(b)[0]; return u ? { u, omens: [{ ent: u, r: 60, tether: 1 }] } : null; }, fire() {},
  chan: { dur: 3, every: 0.25, tick(b, e, P, k) { const u = P.u; if (!u.alive || hidden(u)) return; b.bkHit(e, u, 0.1 * (1 + 0.25 * k), { small: 1, col: '#c890ff' }); b.fxp({ k: 'bkBeam', a: e, b: u, col: '#c890ff', w: 12, life: 0.27 }); },
    end(b, e, P) { const u = P.u; if (!u.alive || hidden(u)) return; dashTo(b, e, u.x + (e.x > u.x ? 60 : -60), u.y, { speed: 1600, w: 70, onHit(bb, me, v) { if (v === u) bb.bkHit(me, v, 1.0, { launch: [...away(me, v, 360), 1] }); }, onEnd(bb, me) { me.bk.grounded = bb.t + 3; bb.float(me.x, me.y - 130, '落地', '#ffe08a', 30); bb.dust(me.x, me.y, 14); } }); } } };
// 蛛皇 — one crowded rank: the net takes all of it; later the netted are spun into cocoons that feed it
MV.bigNet = { n: '大网', cd: 6, cd0: 2, wind: 1.0,
  plan(b) { const rk = bigRank(ours(b).filter(u => !u.isHero)); return rk.length >= 2 ? { rk, omens: rk.map(u => ({ ent: u, r: 60 })) } : null; },
  fire(b, e, P) { const x = P.rk.reduce((a, u) => a + u.x, 0) / P.rk.length; ours(b).forEach(u => { if (Math.abs(u.x - x) < 70) { b.bkHit(e, u, 0.8, { small: 1, stun: 5.5 }); b.fxp({ k: 'bkWeb', ent: u, life: 5.5 }); } }); try { S.rip && S.rip(); } catch (err) { /* sound */ } } };
MV.headSpike = mbLine('头刺', 1.1, 70, 700, { cd: 6, col: '#e8dcc4' });
MV.cocoon = { n: '结茧', cd: 12, cd0: 1, wind: 0.8,
  plan(b, e) { const u = ours(b).filter(x => !x.isHero && x.stun > 0.5)[0] || rnd(ours(b).filter(x => !x.isHero), 1)[0]; return u ? { u, omens: [{ ent: u, r: 60, tether: 1 }] } : null; },
  fire(b, e, P) { const u = P.u; if (!u.alive || hidden(u)) return; const c = b.bkSummon(e, 'Spiderling', u.x + 10, u.y + 6, { hp: 0.035, atk: 0, noAtk: 1, spd: 0, tag: 'cocoon', nm: '茧', cap: 3, sz: 1.6 }); if (!c) return; c.lifeEnd = b.t + 12; c.bkGrab = u; u.stun = Math.max(u.stun || 0, 12); b.fxp({ k: 'bkWeb', ent: u, life: 12 }); c.bkOnDie = (bb, t) => { const v = t.bkGrab; if (v && v.alive) { v.stun = 0; bb.float(v.x, v.y - 90, '破茧', '#e8e4f0', 24); } }; } };
// 三头犬 — one carry: three heads on it at once (fire, ice, poison); its bite goes through armour
MV.tripleBite = { n: '三头齐咬', cd: 7, cd0: 2, wind: 1.0,
  plan(b, e, A) { const t = byPow(b).slice(0, A.phase === 2 ? 3 : 1); return t.length ? { t, omens: t.map(u => ({ ent: u, r: 70, tether: 1 })) } : null; }, fire() {},
  chan: { dur: 0.6, every: 0.2, tick(b, e, P, k) { const u = P.t.length > 1 ? P.t[k % P.t.length] : P.t[0]; if (!u || !u.alive || hidden(u)) return; const m = P.t.length > 1 ? 0.8 : 0.5; b.bkHit(e, u, 0, { abs: e.atk * m + u.maxHp * 0.08 }); b.bkHit(e, u, 0, k === 1 ? { stun: 1, col: '#9fe0ff' } : { col: k === 0 ? '#ff7a1c' : '#8fe04a' }); if (k === 0) b.bkBurn(u, 3, e.atk * 0.1, e); if (k === 2) b.bkPoison(u, 2, e.atk * 0.05, e, { life: 6 }); b.fxp({ k: 'slash', x: u.x, y: u.y - 40, life: 0.14, big: 1, col: ['#ff7a1c', '#9fe0ff', '#8fe04a'][k % 3] }); } } };
MV.hellRoar = mbSelf('地狱咆哮', 0.3, 220, { cd: 10, hit: () => ({ small: 1 }), each: (b, e, u) => b.bkFear(u, 1.5, e) });
// 血巫 — healers: under the blood curse every heal hurts; the bleeding halves it
MV.curse = { n: '血咒', cd: 8, cd0: 2, wind: 1.1,
  plan(b, e, A) { const r = A.phase === 2 ? 700 : 480, c = dense(ours(b), r, 1)[0]; return c ? { x: c.x, y: c.y, r, omens: [{ x: c.x, y: c.y, r }] } : null; },
  fire(b, e, P) { b.bkZone({ x: P.x, y: P.y, r: P.r, until: b.t + 6, curse: 1, src: e, col: '#ff3a5a', bub: '#8a1020' }); b.float(P.x, P.y - 120, '血咒', '#ff3a5a', 34); } };
MV.bloodlet = mbLine('放血', 0.6, 60, 700, { cd: 6, wind: 0.8, col: '#ff3a5a', each: (b, e, u) => b.bkBleed(u, 6, e.atk * 0.05, e) });
// 黑卡托斯 — melee: its thorns throw every sword blow back; its legion guards stand in front of it
MV.chaosCleave = mbFan('混沌斩', 1.2, 360, 1.0, { cd: 7, cd0: 2, wind: 1.2 });
MV.command = { n: '号令', cd: 20, cd0: 6, wind: 1.0, plan: (b, e) => (b.ents.filter(u => u.alive && u.bkOwner === e && u.bkTag === 'guard').length < 4 ? { omens: [] } : null),
  fire(b, e) { for (let i = 0; i < 2; i++) { const g = b.bkSummon(e, 'ChaosSoldier', e.x + (e.x > 960 ? -90 : 90), e.y + (i ? 90 : -90), { hp: 0.06, atk: 0.3, tag: 'guard', cap: 4, nm: '军团卫士', entry: 'rift' }); if (g) g.bkPick = (bb, me) => (d2(me, e.x, e.y) > 170 && e.alive ? nearTo(ours(bb), e.x, e.y)[0] || null : undefined); } b.float(e.x, e.y - 160, '号令', '#ff4a5a', 34); } };
// 豹帝 — slow heavy blows: anything big it sidesteps; it leaps on the weakest in the back
MV.pounce = { n: '飞扑', cd: 8, cd0: 3, wind: 0.7,
  plan(b) { const rear = rearOf(b); const half = rear.slice(0, Math.max(1, Math.ceil(rear.length / 2))); const u = half.sort((a, c) => a.hp - c.hp)[0]; return u ? { u, omens: [{ ent: u, r: 70, tether: 1 }] } : null; },
  fire(b, e, P) { const u = P.u; if (!u.alive || hidden(u)) return; dashTo(b, e, u.x + (e.x > u.x ? 50 : -50), u.y, { speed: 1800, w: 60, onHit(bb, me, v) { if (v === u) bb.bkHit(me, v, 1.3); } }); } };
MV.claws = { n: '连爪', cd: 6, cd0: 5, wind: 0.6, plan: (b, e) => { const u = tgtOf(b, e); return u && d2(u, e.x, e.y) < 260 ? { u, omens: [{ ent: u, r: 60, tether: 1 }] } : null; }, fire() {},
  chan: { dur: 0.8, every: 0.16, tick(b, e, P) { if (P.u.alive && !hidden(P.u)) { b.bkHit(e, P.u, 0.4, { small: 1 }); b.fxp({ k: 'slash', x: P.u.x, y: P.u.y - 40, life: 0.12, big: 1, col: '#ffe08a' }); } } } };
// 金甲卫 — shooters: its shield wall takes shots from the front; spear and shield for the rest
MV.spearLine = mbLine('枪阵', 1.5, 70, 520, { cd: 6, cd0: 2 });
MV.shieldBash = mbOn('盾击', 0.6, 90, tgtOf, { cd: 8, wind: 0.7, hit: () => ({ stun: 1.5 }) });
MV.shieldPush = mbFan('举盾', 0.4, 300, 1.0, { cd: 10, hit: (b, e, u, P) => ({ launch: [P.dir * 520, (u.y - e.y) * 0.4, 0.7], small: 1 }) });
// 地龙王 — skills: its scales halve them and every skill that lands feeds its rage; full rage shakes the whole field
MV.breath = mbLine('龙息', 1.0, 90, 700, { cd: 7, cd0: 2, wind: 1.1, col: '#ff7a1c', each: (b, e, u) => b.bkBurn(u, 3, e.atk * 0.08, e) });
MV.quake = { n: '大地震', cd: 0, wind: 1.8,
  plan(b, e, A) { return (A.rage || 0) >= 100 ? { omens: [{ ent: e, r: 1400 }] } : null; },
  fire(b, e) { ours(b).forEach(u => { const k = Math.max(0.3, 1 - d2(u, e.x, e.y) / 1400); b.bkHit(e, u, 1.6 * k); if (u.alive) b.knockDown(u, 1); }); e.bk.rage = 0; b.shake = Math.max(b.shake, 34); b.flash = 0.4; b.flashCol = '#ff9a3a'; try { S.boom && S.boom(); S.impact && S.impact(); } catch (err) { /* sound */ } } };

// ───────── the kits ─────────
// good: the army it is good against (shown on the map and the stele) · weak: what beats it · sk: life over attack (a final boss's
// fight is long, a glass one hits harder) · tr: how much harder it fights than its power says (calibrated, .ai/sim-kit.js) ·
// p1 / p2: its moves before / after half its life · roar: the second phase's name
const K = (k, o) => { KIT[k] = Object.assign({ sk: 1.2, tr: 1 }, o); };
const hurtMul = (b, e, amt, k, col) => { if (col && Math.random() < 0.2) b.fxp({ k: 'dome', ent: e, col, life: 0.2 }); return amt * k; };
const fromUs = (src) => src && src.side === 'A';
const secs = (v) => Math.max(0, Math.ceil(v));
// final bosses
K('FB_bell', { good: '人海、召唤物、低血的单位', weak: '少而精的厚血阵容', sk: 1.4, p1: ['bellHammer', 'midnight'], p2: ['bellHammer', 'midnight', 'bellDrop'], roar: '落钟' });
K('FB_grave', { good: '拖得久、倒下多的阵容', weak: '速战速决，治疗和护盾', sk: 1.7, p1: ['shovel', 'bury'], p2: ['shovel', 'bury'], roar: '亡者起身',
  tick(b, e, dt, A) { A.ft = (A.ft || 0) + dt; A.atkK = Math.max(0, Math.min(2, (A.ft - 30) * 0.04)); },
  hud: (b, e, A) => (A.ft > 30 ? { t: '夜深了 · 伤害 ×' + (1 + A.atkK).toFixed(1), v: A.atkK / 2, col: '#b8c888' } : { t: '夜深 · ' + secs(30 - (A.ft || 0)) + ' 秒', v: (A.ft || 0) / 30, col: '#b8c888' }),
  allyDie(b, k, u) { if (k.bk.phase !== 2 || !u.key) return; b.later(3, () => { if (!k.alive) return; const z = b.bkSummon(k, u.key, u.x, u.y, { tag: 'zombie', cap: 6, ghost: 1, entry: 'emerge', nm: '僵尸' }); if (z) { z.hp = z.maxHp = Math.max(1, u.maxHp * 0.5); z.atk = u.atk * 0.6; b.float(z.x, z.y - 110, '亡者起身', '#b8c888', 26); } }); } });
K('FB_druid', { good: '输出不足的阵容', weak: '高输出、群伤', sk: 1.4, p1: ['treants', 'thorns', 'druidSlam'], p2: ['treants', 'thorns', 'druidSlam'], roar: '森林之怒',
  onP2(b, e, A) { A.fastId = 'treants'; }, tick(b, e, dt, A) { const n = b.ents.filter(u => u.alive && u.bkOwner === e && u.bkTag === 'tree').length; if (n) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * (A.phase === 2 ? 0.004 : 0.0025) * n * dt); if (Math.random() < dt * 3) b.fxp({ k: 'plus', x: FB_X + (Math.random() - 0.5) * 120, y: FB_Y - 200, life: 0.7 }); } },
  hud: (b, e, A) => ({ t: (A.phase === 2 ? '森林之怒 · ' : '') + '树人 ×' + b.ents.filter(u => u.alive && u.bkOwner === e && u.bkTag === 'tree').length + ' · 在给它回血', col: '#8fe04a' }) });
K('FB_tree', { good: '单一职业', weak: '职业混编', sk: 1.7, p1: ['rootSlam', 'branch'], p2: ['rootSlam', 'branch', 'fruit'], roar: '知识之果',
  init(b, e, A) { A.mem = {}; A.lv = {}; },
  hurt(b, e, src, amt, o) { if (!fromUs(src)) return amt; const v = vocOf(src) || '领袖', A = e.bk; if (!o.silent) { A.mem[v] = (A.mem[v] || 0) + 1; const lv = Math.min(6, Math.floor(A.mem[v] / 10)); if (lv > (A.lv[v] || 0)) { A.lv[v] = lv; b.float(FB_X, FB_Y - 300, '记住了' + v, '#ffe08a', 32); } } return amt * (1 - 0.14 * (A.lv[v] || 0)); },
  hud: (b, e, A) => { const v = Object.keys(A.lv).sort((a, c) => A.lv[c] - A.lv[a])[0]; return v && A.lv[v] ? { t: '记住了' + v + ' · 伤害 −' + A.lv[v] * 14 + '%', col: '#ffe08a' } : null; } });
K('FB_queen', { good: '远程', weak: '近战贴身', sk: 1.4, p1: ['crescent', 'starfall'], p2: ['crescent', 'starfall', 'starfall2'], roar: '满月',
  hurt: (b, e, src, amt, o) => (o.ranged ? hurtMul(b, e, amt, 0.5, '#b8e0ff') : src && src.side === 'A' && !src.ranged && o.auto ? amt * 1.3 : amt), hud: (b, e, A) => ({ t: (A.slowCast > 1 ? '被近战围住 · 蓄力变慢 · ' : '') + '月光 · 远程伤害 −50%', col: '#b8e0ff' }),
  tick(b, e, dt, A) { const n = ours(b).filter(u => !u.ranged && u.x > EDGE - 220).length; A.crowdT = n >= 3 ? (A.crowdT || 0) + dt : 0; A.slowCast = n >= 3 ? 2 : 1; } });
K('FB_doll', { good: '近战扎堆', weak: '远程', sk: 1.4, p1: ['spin', 'stomp'], p2: ['spin', 'stomp', 'horses'], roar: '木马坠落' });
K('FB_clown', { good: '一个主力扛全队', weak: '人多、战斗力平均', sk: 1.4, p1: ['mallet', 'swing', 'balloons'], p2: ['mallet', 'balloons', 'swing'], roar: '双气球', onP2(b, e, A) { A.fastId = 'balloons'; } });
K('FB_captain', { good: '前排薄', weak: '厚前排、守护者、护盾', sk: 1.5, p1: ['anchor', 'cannons'], p2: ['anchor', 'cannons', 'ram'], roar: '全速前进' });
K('FB_maw', { good: '只有一个肉盾', weak: '两三个前排轮换', sk: 2.0, p1: ['swallow', 'tentSweep'], p2: ['swallow', 'tentSweep'], roar: '深海之声',
  onP2(b, e, A) { A.fastId = 'swallow'; },
  after(b, e, src, d) { const g = e.bk.gulp; if (!g) return; if (!g.u.alive || !hidden(g.u)) { e.bk.gulp = null; return; } g.dmg += d; if (g.dmg >= e.maxHp * 0.08) { b.bkUnhide(g.u); b.float(FB_X - 100, FB_Y - 200, '吐出来了', '#8ae0f4', 32); e.bk.gulp = null; } } });
K('FB_foreman', { good: '靠治疗续航', weak: '爆发、护盾、速战', sk: 1.6, p1: ['forge', 'molten'], p2: ['forge', 'molten'], roar: '加班', heat: 0.4,
  onP2(b, e, A) { A.ot = 3; },
  tick(b, e, dt, A) { A.ft = (A.ft || 0) + dt; if (!A.hot && A.ft >= 60) { A.hot = 1; A.atkK = 1; b.float(FB_X, FB_Y - 300, '炉温过高', '#ff4a3a', 44); b.flash = 0.4; b.flashCol = '#ff7a1c'; } if (A.phase !== 2) return; A.ot -= dt; if (A.ot > 0) return; A.ot = 20; ours(b).forEach(u => b.bkHit(e, u, 0, { abs: u.maxHp * 0.05, small: 1, col: '#ff7a1c' })); b.float(960, 250, '加班', '#ff7a1c', 44); b.flash = 0.3; b.flashCol = '#ff7a1c'; },
  hud: (b, e, A) => (A.phase === 2 ? { t: '加班 · ' + secs(A.ot) + ' 秒 · 治疗 −60%', v: 1 - A.ot / 20, col: '#ff7a1c' } : (A.hot ? { t: '炉温过高 · 伤害翻倍 · 治疗 −60%', col: '#ff4a3a' } : { t: '高温 · 治疗 −60% · 过热 ' + secs(60 - (A.ft || 0)) + ' 秒', v: (A.ft || 0) / 60, col: '#ff7a1c' })) });
K('FB_colossus', { good: '攻速快、单下低', weak: '慢而重的大伤害', sk: 1.7, p1: ['piston', 'gear'], p2: ['piston', 'gear'], roar: '超压',
  onP2(b, e, A) { A.heat = 12; },
  hurt(b, e, src, amt, o) { const A = e.bk; if (A.armor == null) A.armor = e.atk * 0.1; const F = A.armor * (A.phase === 2 ? (A.hot ? 0 : 2) : 1); if (A.hot) return amt * 1.25; if (!F) return amt; if (Math.random() < 0.15) b.fxp({ k: 'dome', ent: e, col: '#c8a060', life: 0.2 }); return Math.max(amt * 0.25, amt - F * (o.silent ? 0.05 : 1)); },
  tick(b, e, dt, A) { if (A.phase !== 2) return; A.heat -= dt; if (A.hot && A.heat <= 0) { A.hot = false; A.heat = 12; } else if (!A.hot && A.heat <= 0) { A.hot = true; A.heat = 3; b.float(FB_X, FB_Y - 280, '过热', '#ff4a3a', 40); } },
  hud: (b, e, A) => (A.phase === 2 ? (A.hot ? { t: '过热 · 装甲失效', col: '#ff4a3a' } : { t: '超压 · 装甲加倍', col: '#c8a060' }) : { t: '装甲', col: '#c8a060' }) });
K('FB_nurse', { good: '靠技能的部队', weak: '普攻型', sk: 1.6, p1: ['needle', 'needleRain'], p2: ['needle', 'needleRain'], roar: '查房时间',
  onP2(b, e, A) { A.rt = 0; },
  tick(b, e, dt, A) { if (A.phase !== 2) return; A.rt = (A.rt || 0) + dt; A.rounds = A.rt % 14 < 8; },
  hurt(b, e, src, amt, o) { return o.skill && !o.auto ? amt * (e.bk.rounds ? 0.3 : 0.65) : amt; },
  hud: (b, e, A) => ({ t: A.phase === 2 && A.rounds ? '查房时间 · 技能伤害 −70%' : '无菌服 · 技能伤害 −35%', col: '#9fe0ff' }) });
K('FB_surgeon', { good: '残血、脆皮、没治疗', weak: '治疗、护盾、全员血厚', sk: 1.5, p1: ['operate', 'cut'], p2: ['operate', 'cut', 'stitch'], roar: '缝合',
  hit: (b, e, tg, amt) => amt * (1.9 - clamp(tg.hp / tg.maxHp, 0, 1) * 1.2) });
K('FB_mech', { good: '远程', weak: '近战', sk: 1.8, p1: ['hammerProto', 'scan'], p2: ['hammerProto', 'scan', 'orbital'], roar: '轨道打击',
  hurt(b, e, src, amt, o) { if (!o.ranged || !fromUs(src) || !src.alive) return amt; b.deal(e, src, amt * 0.5, { reflect: 1, skill: 1, small: 1, col: '#9fe0ff' }); if (Math.random() < 0.2) b.fxp({ k: 'dome', ent: e, col: '#9fe0ff', life: 0.2 }); return amt * 0.5; } });
K('FB_xeno', { good: '只会打单体的阵容', weak: '群伤、溅射', sk: 1.4, p1: ['hatch', 'impale'], p2: ['hatch', 'impale'], roar: '酸雨',
  hurt(b, e, src, amt) { const n = b.ents.filter(u => u.alive && u.bkOwner === e && u.bkTag === 'larva').length; return n >= 4 ? hurtMul(b, e, amt, 0.2, '#6ec820') : amt; },
  hud: (b, e) => { const n = b.ents.filter(u => u.alive && u.bkOwner === e && u.bkTag === 'larva').length; return { t: '幼虫 ×' + n + (n >= 4 ? ' · 母巢受伤 −80%' : ''), col: '#6ec820' }; },
  onP2(b, e) { b.ents.forEach(u => { if (u.alive && u.bkOwner === e && u.bkTag === 'larva') u.bkOnDie = acid; }); } });
K('FB_jailer', { good: '同类职业扎堆', weak: '职业分散', sk: 1.6, p1: ['chains', 'shackle'], p2: ['chains', 'shackle', 'gateOpen'], roar: '门开了',
  hit: (b, e, tg, amt) => (tg.bs && tg.bs.shackled > b.t ? amt * 1.6 : amt) });
K('FB_ferry', { good: '肉多输出少', weak: '高输出、速战速决', sk: 1.8, p1: ['oar', 'row'], p2: ['oar', 'row'], roar: '骷髅灯',
  tick(b, e, dt, A) { A.toll = (A.toll || 0) + dt; if (A.toll < 1) return; A.toll -= 1; const rate = A.phase === 2 ? 0.014 : 0.007; let tot = 0; ours(b).forEach((u, i) => { tot += b.bkHit(e, u, 0, { abs: u.maxHp * rate, silent: 1 }); if (i < 4) b.soul(u, e); }); e.hp = Math.min(e.maxHp, e.hp + Math.min(tot, e.maxHp * (A.phase === 2 ? 0.02 : 0.01))); },
  hud: (b, e, A) => ({ t: A.phase === 2 ? '骷髅灯 · 船费翻倍' : '收船费', col: '#ff9a3a' }) });
K('FB_demon', { good: '输出慢、单个主力', weak: '高输出、打得快', sk: 2.0, p1: ['meteor', 'dSlam'], p2: ['meteor2', 'dSlam'], roar: '陨石雨',
  tick(b, e, dt, A) { A.ft = (A.ft || 0) + dt; if (!A.rage && A.ft >= 60) { A.rage = 1; A.atkK = 1.5; A.cdK = 1.6; b.float(FB_X, FB_Y - 300, '深渊之怒', '#ff4a3a', 48); b.flash = 0.5; b.flashCol = '#ff4a3a'; b.shake = Math.max(b.shake, 30); } },
  hud: (b, e, A) => (A.rage ? { t: '深渊之怒', col: '#ff4a3a' } : { t: '深渊之怒 · ' + secs(60 - (A.ft || 0)) + ' 秒', v: (A.ft || 0) / 60, col: '#ff4a3a' }) });
K('FB_croupier', { good: '靠前后排站位', weak: '人人能打能扛', sk: 1.4, p1: ['shuffle', 'dealCards', 'slapTable'], p2: ['shuffle', 'dealCards', 'allIn'], roar: '全押' });
K('FB_dealer', { good: '人海；第二阶段是单个主力', weak: '均衡的阵容', sk: 2.2, p1: ['coinRain', 'collect'], p2: ['takeAll', 'collect'], roar: '庄家通吃' });
// small bosses
K('GhostKnight', { good: '只会普攻的阵容', weak: '法师、祭司、召唤师', sk: 1.2, p1: ['watchThrust', 'lantern'], roar: '灯灭',
  init(b, e, A) { A.gen = 0; A.watch = 0; },
  hurt: (b, e, src, amt, o) => (o.auto ? hurtMul(b, e, amt, 0.12, '#9fe8e0') : fromUs(src) ? amt * 1.3 : amt),
  onP2(b, e, A) { A.fade = b.t; },
  tick(b, e, dt, A) { if (!e.casting && (A.gen || 0) < 3) { A.watch += dt; if (A.watch >= 6) { A.watch = 0; A.gen++; b.float(e.x, e.y - 150 * (e.sz || 1), ['一更', '二更', '三更'][A.gen - 1], '#9fe8e0', 34); try { S.tick && S.tick(8); } catch (err) { /* sound */ } } }
    if (A.fade != null) { const k = (b.t - A.fade) % 15; const on = k < 4; if (on !== !!e.stealth) { e.stealth = on; if (on) b.float(e.x, e.y - 150, '灯灭', '#9fe8e0', 32); } } },
  hud: (b, e, A) => ({ t: '报更 · ' + (['还没打更', '一更', '二更', '三更'][A.gen || 0]), v: (A.gen || 0) / 3 + (A.watch || 0) / 18, col: '#9fe8e0' }) });
K('DecayingChampionRat', { good: '没有群伤', weak: '法师、会溅射的单位', sk: 1.2, p1: ['ratTide', 'plagueBite'], roar: '钻洞',
  hurt(b, e, src, amt) { const n = b.ents.filter(u => u.alive && u.bkOwner === e && u.bkTag === 'rat').length; return n ? hurtMul(b, e, amt, 1 - Math.min(0.8, 0.08 * n), '#8fe04a') : amt; },
  onP2(b, e) { b.bkHide(e, 3, 'burrow', { onEnd: (bb, me) => ratsOut(bb, me, 8) }); b.dust(e.x, e.y, 20); },
  hud: (b, e) => { const n = b.ents.filter(u => u.alive && u.bkOwner === e && u.bkTag === 'rat').length; return { t: '老鼠 ×' + n + ' · 鼠王受伤 −' + Math.round(Math.min(0.8, 0.08 * n) * 100) + '%', col: '#8fe04a' }; } });
K('HoneyBear', { good: '前排只有一两个人', weak: '两三个先锋、守护者轮着挨打；爆发', sk: 1.2, p1: ['paws', 'honey'], roar: '暴躁',
  hit: (b, e, tg, amt, o) => (o.auto && !DEFENDER.has(vocOf(tg)) ? amt * 1.6 : amt),
  onP2(b, e) { e.asB += 0.4; },
  after(b, e, src, d) { const J = e.bk.jar; if (!J || !e.bk.ch) return; J.dmg += d; if (J.dmg >= e.maxHp * 0.05) { e.bk.jar = null; e.bk.ch = null; e.bk.next = b.t + 2; e.stun = Math.max(e.stun || 0, 2); b.float(e.x, e.y - 150, '蜜罐打翻了', '#ffb020', 32); b.fx.forEach(f => { if (f.k === 'bkPot' && f.ent === e) f.life = 0; }); } } });
K('VerdantWormKing', { good: '没有治疗', weak: '牧师、祭司；速战', sk: 1.2, p1: ['burrow', 'silk'], roar: '毒雾',
  init(b, e) { e.bkOnHit = (bb, s, tg, d, o) => { if (o.auto) bb.bkPoison(tg, 2, s.atk * 0.15, s, { max: 10, cleanse: 1 }); }; },
  onP2(b, e) { b.bkZone({ ent: e, r: 200, until: Infinity, col: '#6ec820', psn: e.atk * 0.04, src: e, bub: '#b8f050' }); } });
K('tut:VerdantWormKing', { good: '', weak: '', sk: 1, p1: ['tutBurrow'], roar: '' });
K('Centaur', { good: '血薄、前面没人挡', weak: '先锋、守护者', sk: 1.2, p1: ['charge', 'trample'], roar: '连冲',
  hit(b, e, tg, amt, o) { if (o.auto && !o.cleaved) ours(b).filter(u => u !== tg && inRing(u, tg.x, tg.y, 110)).slice(0, 2).forEach(u => b.deal(e, u, amt * 0.6, { auto: 1, cleaved: 1, small: 1 })); return amt; } });
K('Mimic', { good: '人海、召唤物、小单位', weak: '少而精、血厚的单位', sk: 1.2, p1: ['gulp', 'chomp'], roar: '饿了',
  onP2(b, e, A) { A.fastId = 'gulp'; }, hud: (b, e, A) => (A.eat ? { t: '吞下 ×' + A.eat, col: '#ffcc33' } : null) });
K('OgreEnemy', { good: '靠一两个大块头扛', weak: '人多、单位小、输出高', sk: 1.2, p1: ['heave', 'club'], roar: '较劲',
  onP2(b, e, A) { A.fastId = 'heave'; },
  hit(b, e, tg, amt, o) { if (!o.auto) return amt; const tot = ours(b).reduce((a, u) => a + u.maxHp, 0) || tg.maxHp; return amt * clamp(1 + 15 * (tg.maxHp / tot - 0.1), 1, 3); } });
K('FourEyes', { good: '肉多输出少', weak: '刺客、高输出、召唤物', sk: 1.1, p1: ['fourBeams', 'sweepLight'], p2: ['oneBeam', 'sweepLight'], roar: '一道光', keepTr: ['DeathStare'],
  tick(b, e, dt, A) { A.ft = (A.ft || 0) + dt; A.atkK = Math.min(3, 0.06 * A.ft); },
  hit: (b, e, tg, amt, o) => (o.auto ? amt * (1 + (e.bk.atkK || 0)) : amt),
  hud: (b, e, A) => ({ t: '灯光 ×' + (1 + (A.atkK || 0)).toFixed(1), v: (A.atkK || 0) / 3, col: '#ff5aff' }) });
K('Kraken', { good: '人少', weak: '人多', sk: 1.5, p1: ['grab', 'ink'], p2: ['grab', 'ink'], roar: '六条触手',
  tick(b, e, dt) { b.ents.forEach(c => { if (c.alive && c.bkOwner === e && c.bkGrab && c.bkGrab.alive) b.bkHit(e, c.bkGrab, 0, { abs: e.atk * 0.15 * dt, silent: 1 }); }); } });
K('SiegeRam', { good: '远程', weak: '近战、刺客', sk: 1.3, p1: ['ramGate', 'batter'], roar: '着火',
  hurt: (b, e, src, amt, o) => (o.ranged ? hurtMul(b, e, amt, 0.4, '#9fc8ff') : amt),
  onP2(b, e) { b.bkZone({ ent: e, r: 170, until: Infinity, col: '#ff7a1c', dps: e.atk * 0.12, src: e, bub: '#ffc040' }); } });
K('EarthDragonIron', { good: '近战扎堆', weak: '射手、法师', sk: 1.2, p1: ['flame', 'tail'], roar: '熔岩',
  init(b, e, A) { A.aura = b.bkZone({ ent: e, r: 190, until: Infinity, col: '#ff7a1c', dps: e.atk * 0.35, src: e }); },
  onP2(b, e, A) { if (A.aura) { A.aura.r = 240; A.aura.dps = e.atk * 0.5; A.aura.bub = '#ffc040'; } } });
K('Needler', { good: '靠护盾和增益', weak: '朴素的厚血和普攻', sk: 1.2, p1: ['volley', 'pluck'], p2: ['volley', 'pluck', 'needleRain2'], roar: '针雨',
  hit: (b, e, tg, amt) => (buffy(tg) > 0 ? amt * 3 : amt) + Math.min(tg.shield || 0, amt) });
K('ChaosButcher', { good: '躲在后面的远程脆皮', weak: '先锋、守护者挡在钩子路上', sk: 1.3, p1: ['hook', 'chop'], p2: ['hook', 'chop'], roar: '复生', revive: 0.3,
  hit: (b, e, tg, amt, o) => (o.auto && tg.bs && tg.bs.hooked > b.t ? amt * 2 : amt) });
K('EvilEyeDark', { good: '纯近战', weak: '射手、法师', sk: 1.2, fly: 1, p1: ['lock'], p2: ['lock'], roar: '警报',
  onP2(b, e) { for (let i = 0; i < 2; i++) { const s = b.bkSummon(e, 'EvilEyeRed', e.x + (i ? 80 : -80), e.y - 40, { hp: 0.03, atk: 0.2, tag: 'sentry', cap: 4, nm: '小哨兵', fly: 1 }); if (s) s.drawDY = -40; } },
  tick(b, e, dt, A) { e.drawDY = A.grounded > b.t ? 0 : -50; },
  hud: (b, e, A) => (A.grounded > b.t ? { t: '落地 · 近战能打了', col: '#ffe08a' } : { t: '悬空 · 近战够不着', col: '#c890ff' }) });
K('SpiderEmperorAnazos', { good: '同类职业扎堆', weak: '职业分散', sk: 1.3, p1: ['bigNet', 'headSpike'], p2: ['bigNet', 'headSpike', 'cocoon'], roar: '结茧',
  tick(b, e, dt) { b.ents.forEach(c => { if (c.alive && c.bkOwner === e && c.bkTag === 'cocoon' && c.bkGrab && c.bkGrab.alive) { const v = c.bkGrab, d = b.bkHit(e, v, 0, { abs: v.maxHp * 0.04 * dt, silent: 1 }); e.hp = Math.min(e.maxHp, e.hp + d); } }); } });
K('Cerberus', { good: '一个主力扛全队', weak: '战斗力平均、人多', sk: 1.2, p1: ['tripleBite', 'hellRoar'], p2: ['tripleBite', 'hellRoar'], roar: '三头分咬',
  hit(b, e, tg, amt) { let def = (tg.def || 0) + (tg.defDyn || 0) + ((tg.au && tg.au.def) || 0) + (tg.buffs || []).reduce((a, x) => a + (x.def || 0), 0); Object.values(tg.debuf || {}).forEach(D => { def -= D.v * D.n; }); return def > 0 ? amt / Math.max(0.15, 1 - clamp(def, 0, 0.85)) : amt; } });
K('Shaman', { good: '靠治疗续航', weak: '爆发、没治疗的速战', sk: 1.1, p1: ['curse', 'bloodlet'], p2: ['curse', 'bloodlet'], roar: '血咒蔓延',
  init(b, e, A) { A.as0 = e.asB || 0; }, tick(b, e, dt, A) { e.asB = A.as0 + 0.1 * Math.floor((1 - e.hp / e.maxHp) * 10); } });
K('ChaosGuardBlackKatos', { good: '近战', weak: '射手、法师', sk: 1.4, p1: ['chaosCleave', 'command'], p2: ['chaosCleave', 'command'], roar: '反伤加倍',
  after(b, e, src, d, o) { if (o.auto && fromUs(src) && !src.ranged && src.alive) b.deal(e, src, d * (e.bk.phase === 2 ? 0.8 : 0.6), { reflect: 1, skill: 1, small: 1, col: '#ff6a5a' }); },
  hud: (b, e, A) => ({ t: '荆棘甲 · 近战反伤 ' + (A.phase === 2 ? 80 : 60) + '%', col: '#ff6a5a' }) });
K('LeopardEmperorSavalon', { good: '慢而重的大伤害', weak: '攻速快、多段的普攻', sk: 1.2, p1: ['pounce', 'claws'], p2: ['pounce', 'claws'], roar: '闪身',
  hurt(b, e, src, amt, o) { if (amt > e.maxHp * 0.03 && Math.random() < (e.bk.phase === 2 ? 0.6 : 0.4)) { b.float(e.x, e.y - 130, '闪身', '#b8f0ff', 28); return 0; } return amt; } });
K('ChaosSoldier', { good: '远程', weak: '近战、绕后的刺客', sk: 1.2, p1: ['spearLine', 'shieldBash'], p2: ['spearLine', 'shieldBash', 'shieldPush'], roar: '举盾',
  hurt(b, e, src, amt, o) { if (!o.ranged || !src) return amt; const face = e.target ? faceTo(e, e.target.x) : -1; return Math.sign(src.x - e.x) === face ? hurtMul(b, e, amt, 0.2, '#ffe08a') : amt; } });
K('EarthDragonKingGargon', { good: '靠技能的部队', weak: '普攻型（射手、战士）', sk: 1.3, p1: ['quake', 'breath'], p2: ['quake', 'breath'], roar: '怒气翻倍',
  init(b, e, A) { A.rage = 0; },
  hurt(b, e, src, amt, o) { if (!o.skill || o.auto) return amt; if (!o.silent && fromUs(src)) e.bk.rage = Math.min(100, (e.bk.rage || 0) + (e.bk.phase === 2 ? 8 : 4)); return amt * 0.5; },
  hud: (b, e, A) => ({ t: '怒气', v: (A.rage || 0) / 100, col: '#ff7a1c' }) });

// a final boss shows its own second-phase name in the show (mc-bossfight.js reads fb.names.roar)
const oInit = BP.bkInit;
BP.bkInit = function (e, Kt) { oInit.apply(this, arguments); if (e.fb && Kt.roar) e.fb = Object.assign({}, e.fb, { names: Object.assign({}, e.fb.names, { roar: Kt.roar }) }); };

// ───────── outside the fight: what it is good against, its life over attack, how hard it truly fights ─────────
M.bossKit = (k) => KIT[k] || null;
M.bossSkew = (k, fb) => (KIT[k] ? KIT[k].sk : fb ? M.FB_SKEW || 1.8 : 1);
M.bossTrue = (k) => (KIT[k] ? KIT[k].tr : (M.BOSS_TRUE && M.BOSS_TRUE[k]) || 1);
// the map: a boss's node says what it is good against and what beats it
const G = M.Game && M.Game.prototype;
if (G && G.worldMove) { const oWM = G.worldMove; G.worldMove = function () { const r = oWM.apply(this, arguments), n = M._tipNode, run = this.run;
  if (n && run && this.tipData && n.seen && n.type === 'boss' && !(run.region && run.region.tut)) { const mb = M.miniOf && M.miniOf(run, n), k = n.fb || (mb && mb.k), L = M.bossLines(k); if (L.length) this.tipData = Object.assign({}, this.tipData, { lines: (this.tipData.lines || []).concat(L) }); }
  return r; }; }
// first-look cards (mc-guide.js): what a boss is good against, and the line under its bar
if (M.GUIDE) M.GUIDE.push(
  { id: 'bosskit', cat: '战斗', icon: 'e_skull', title: '克制', line: '每个首领擅长对付一种阵容，也怕另一种；悬停地图上的首领就能看到。', scr: 'world', at: () => null },
  { id: 'bossmeter', cat: '战斗', icon: 'e_skull', title: '首领计量', line: '首领血条下面的一行：它的怒气、倒计时或者正在做的事。', scr: 'battle', freeze: 1, at: (g) => { const b = g.battle, e = b && b.bkOn && b.ents.find(x => x.alive && x.kit && x.kit.hud); return e && e.kit.hud(b, e, e.bk) ? { x: 760, y: 262, w: 400, h: 56 } : null; } });
M.bossLines = (k) => { const K2 = KIT[k]; return K2 && K2.good ? [{ t: '擅长对付：' + K2.good, c: '#ff8a7a' }, { t: '怕：' + K2.weak, c: '#b6f28a' }] : []; };

// ───────── calibration: [tr, sk] per boss (.ai/sim-kit.js + .ai/kit-fit.py, random armies at shown ratios 0.5–1.8) ─────────
// tr: the shown ratio an army needs to win half the time, folded in so that a shown 1.0 wins about half; sk: life over attack so a
// final boss takes about 90 s and a small boss about 40 s. @CAL (rewritten by .ai/kit-cal.py)
const CAL = { Centaur: [1.002, 0.84], Cerberus: [1.235, 1.27], ChaosButcher: [0.737, 0.94], ChaosGuardBlackKatos: [0.755, 0.8], ChaosSoldier: [0.797, 0.93], DecayingChampionRat: [1.526, 1.17], EarthDragonIron: [1.258, 1.13], EarthDragonKingGargon: [0.967, 0.85], EvilEyeDark: [0.793, 0.8], FB_bell: [1.357, 2.4], FB_captain: [1.648, 1.62], FB_clown: [2.022, 1.28], FB_colossus: [1.575, 1.08], FB_croupier: [1.504, 1.79], FB_dealer: [1.106, 1.54], FB_demon: [1.9, 2.49], FB_doll: [1.91, 0.8], FB_druid: [1.629, 0.96], FB_ferry: [1.712, 1.39], FB_foreman: [1.976, 2.36], FB_grave: [1.579, 2.26], FB_jailer: [1.355, 1.46], FB_maw: [1.615, 1.71], FB_mech: [1.586, 1.15], FB_nurse: [1.064, 1.01], FB_queen: [1.657, 2.6], FB_surgeon: [1.503, 1.63], FB_tree: [1.394, 0.8], FB_xeno: [2.113, 1.75], FourEyes: [4.137, 2.6], GhostKnight: [1.653, 0.8], HoneyBear: [0.803, 1.19], Kraken: [1.456, 0.8], LeopardEmperorSavalon: [0.606, 0.94], Mimic: [0.987, 1.8], Needler: [0.962, 1.34], OgreEnemy: [2.788, 2.6], Shaman: [0.895, 1.32], SiegeRam: [1.116, 1.46], SpiderEmperorAnazos: [0.769, 0.8], VerdantWormKing: [1.149, 1.0] };
Object.keys(CAL).forEach(k => { if (KIT[k]) { KIT[k].tr = CAL[k][0]; KIT[k].sk = CAL[k][1]; } });
})();
