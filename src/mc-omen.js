// ==== mc-omen.js ====
(function () {
// Charge and warning marks (user ruling 2026-09-26). Every skill of every unit — ours, the enemy's, elites, bosses —
// charges first and marks the ground where it lands: the outer line is the reach, an inner fill grows from the centre,
// and the skill goes off the moment the fill is full. The charge time and the mark grow with the caster's quality
// (common 0.45 s, rare 0.6, epic 0.8, legendary 1.0; elites +0.2; bosses their own), so one look says who is casting,
// where it lands and how much it will hurt. Units never dodge (this is an auto-battler), so the mark is a cue to look,
// not a chance to move: charges stay short.
// A mark: { shape: 'circle' | 'sector' | 'line', x, y (or ent: follows a unit), r, t0, until, col, src }
//   sector: a sweep in front of a boss — centre x, y, radius r, facing dir (−1 left), half-angle half
//   line: from the caster to (x2, y2), width w
// The hit test of a circle is hypot(dx, dy × 1.2) < r, so a mark is an ellipse r × r/1.2: it shows exactly what gets hit.
const M = window.MC, BP = M.Battle3 && M.Battle3.prototype, H = M.TRAIT_H; if (!BP) return;
const PL = (M.PJ && M.PJ.PAL) || {}, ART = 4;
const RS = 125, RM = 195;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const snap = (v) => Math.round(v / ART) * ART;
const FOE = '#ff3a3a';
M.OMEN_DUR = [0.45, 0.6, 0.8, 1.0];

// ───────── charge time by quality ─────────
const oSpec = BP.skillSpec;
BP.skillSpec = function (e) {
  const sp = oSpec.apply(this, arguments), q = clamp((e.d && e.d.q) || 0, 0, 3);
  sp.dur = M.OMEN_DUR[q] + (e.elite ? 0.2 : 0) + (e.boss ? 0.45 : 0);
  return sp;
};

// ───────── the list of marks ─────────
BP.omen = function (o) { (this.omens || (this.omens = [])).push(o); return o; };
const oStep = BP.step;
BP.step = function (dt) {
  const r = oStep.apply(this, arguments);
  if (this.omens && this.omens.length) { const T = this.t; this.omens = this.omens.filter(o => T < o.until + (o.linger || 0.25) && !(o.src && !o.src.alive && !o.keep)); }
  return r;
};

// ───────── what a unit's skill marks ─────────
const skillT = (e) => e.traits.find(t => H[t.cls] && H[t.cls].full);
function plan(b, e) {
  const T = skillT(e), q = (e.d && e.d.q) || 0, self = { ent: e, r: 70 + q * 12, good: 1 };
  if (!T) return self;
  const foe = () => (e.target && b.active(e.target) && e.target.side !== e.side ? e.target : b.nearestFoe(e, 1200));
  const lowest = () => b.lowest(e);
  switch (T.cls) {
    case 'ShellShock': case 'IronHail': { const t = foe(); return t ? { ent: t, lock: t, r: RS, tether: 1 } : null; }
    case 'WaterSpoutNew': { const t = foe(); return t ? { ent: t, lock: t, r: 90, tether: 1 } : null; }
    case 'EnergySurge': { const t = e.target && e.target.alive ? e.target : foe(); return t ? { ent: t, lock: t, r: 80, shape: 'line', w: 36 } : null; }
    case 'LightningStrike': {
      const n = (T.v && T.v[1]) || 3, done = new Set(), list = []; let prev = e;
      for (let i = 0; i < n; i++) { const c = b.foes(e).filter(o => !done.has(o)).sort((a, x) => Math.hypot(a.x - prev.x, (a.y - prev.y) * 1.2) - Math.hypot(x.x - prev.x, (x.y - prev.y) * 1.2))[0]; if (!c) break; done.add(c); list.push(c); prev = c; }
      return list.length ? { ent: list[0], multi: list, r: 72, chain: 1 } : null;
    }
    case 'ForbiddenFruit': return { ent: e, r: RM };
    case 'DimensionalRift': return { x: e.x + 80, y: e.y, r: 92, summon: 1 };
    case 'Summon': return { x: e.x + 70, y: e.y + 6, r: 80, summon: 1 };
    case 'ChainHeal': case 'SkullStew': { const t = lowest(); return t ? { ent: t, lock: t, ally: 1, r: 80, good: 1, tether: 1 } : self; }
    case 'LifeBindVow': { const t = b.allies(e).filter(o => o !== e && o.hp < o.maxHp).sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0]; return t ? { ent: t, r: 76, good: 1, tether: 1 } : self; }
    case 'MindWarp': { const t = b.allies(e).filter(o => o !== e).sort((a, c) => c.atk - a.atk)[0]; return t ? { ent: t, r: 70, good: 1, tether: 1 } : self; }
    default: return self;
  }
}
const oBegin = BP.beginCast;
BP.beginCast = function (e, o) {
  const r = oBegin.apply(this, arguments); if (!e.casting || e.casting.omen) return r;
  try {
    const m = plan(this, e); if (m) { const sp = e.casting.sp || {}; e.casting.omen = this.omen(Object.assign({ shape: 'circle', t0: e.casting.t0, until: e.casting.until, src: e, col: e.side === 'E' ? FOE : sp.col || PL.gold, q: (e.d && e.d.q) || 0 }, m)); }
  } catch (err) { (window.__mcErrs = window.__mcErrs || []).push('omen: ' + err.message); }
  return r;
};
// the skill goes where it was marked: the marked foe, or the marked ally for a heal
const oFire = BP.fireCast;
BP.fireCast = function (e) {
  const om = e.casting && e.casting.omen; let own = false;
  if (om) { om.fired = this.t; if (om.lock && om.lock.alive) { if (om.ally) { const L = BP.lowest, tg = om.lock; this.lowest = function (x) { return x === e && tg.alive && tg.hp < tg.maxHp ? tg : L.call(this, x); }; own = true; } else e.target = om.lock; } }
  try { return oFire.apply(this, arguments); } finally { if (own) delete this.lowest; }
};

// ───────── drawing (on the floor, under the units) ─────────
const hexA = (c) => (c && c.length >= 7 ? c.slice(0, 7) : '#ffffff');
function ellRows(ctx, cx, cy, rx, ry, col) { if (rx < 2 || ry < 2) return; M.P16.ellipse(ctx, cx, cy, rx, ry, col, false); }
function ellRing(ctx, cx, cy, rx, ry, col) { if (rx < 2 || ry < 2) return; M.P16.ellipse(ctx, cx, cy, rx, ry, col, true); }
// a sector facing dir (−1 = left): rows on the art grid, radius r, half-angle half; k scales the radius (the fill)
function sectorRows(ctx, cx, cy, r, half, dir, k, col, edgeOnly) {
  const R = r * k, tn = Math.tan(half); if (R < 4) return; ctx.fillStyle = col; cx = snap(cx); cy = snap(cy);
  for (let yy = -Math.floor(R / 1.2 / ART) * ART; yy <= R / 1.2; yy += ART) {
    const gy = Math.abs(yy * 1.2); if (gy > R) continue; const xmax = Math.sqrt(R * R - gy * gy), xmin = tn > 0.01 ? gy / tn : 0; if (xmin >= xmax) continue;
    const a = snap(xmin), w = snap(xmax) - a; if (w <= 0) continue;
    if (edgeOnly) { ctx.fillRect(dir < 0 ? cx - a - w : cx + a + w - ART, cy + yy, ART, ART); ctx.fillRect(dir < 0 ? cx - a - ART : cx + a, cy + yy, ART, ART); }
    else ctx.fillRect(dir < 0 ? cx - a - w : cx + a, cy + yy, w, ART);
  }
}
function drawOne(ctx, b, o, T) {
  if (T < o.t0) return;
  const dur = Math.max(0.05, o.until - o.t0), q = clamp((T - o.t0) / dur, 0, 1), after = T - o.until, fade = after > 0 ? clamp(1 - after / (o.linger || 0.25), 0, 1) : 1; if (fade <= 0) return;
  const col = hexA(o.col), hi = M.shade ? M.shade(col, 0.45) : '#ffffff', blink = q > 0.7 ? 0.75 + 0.25 * Math.sin(T * 40) : 1;
  ctx.save();
  const at = (ent) => (ent ? [ent.x, ent.y] : [o.x, o.y]);
  if (o.shape === 'sector') {
    ctx.globalAlpha = 0.14 * fade; sectorRows(ctx, o.x, o.y, o.r, o.half, o.dir || -1, 1, col);
    ctx.globalAlpha = 0.34 * fade; sectorRows(ctx, o.x, o.y, o.r, o.half, o.dir || -1, q, col);
    ctx.globalAlpha = 0.95 * fade * blink; sectorRows(ctx, o.x, o.y, o.r, o.half, o.dir || -1, 1, col, true);
    const arc = (k, c2) => { ctx.fillStyle = c2; const n = Math.max(12, Math.round(o.r * k * o.half / 6)); for (let i = 0; i <= n; i++) { const a = -o.half + (i / n) * 2 * o.half, px = o.x + (o.dir || -1) * Math.cos(a) * o.r * k, py = o.y + Math.sin(a) * o.r * k / 1.2; ctx.fillRect(snap(px) - ART / 2, snap(py) - ART / 2, ART, ART); } };
    arc(1, col); if (q < 1) { ctx.globalAlpha = 0.9 * fade; arc(Math.max(0.05, q), hi); }
  } else if (o.shape === 'line') {
    const s = o.src, x0 = s ? s.x : o.x0, y0 = s ? s.y : o.y0, [x1, y1] = at(o.ent), d = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / d, ny = (x1 - x0) / d, w = o.w || 36;
    for (let i = 0, n = Math.ceil(d / ART); i <= n; i++) { const k = i / n, px = x0 + (x1 - x0) * k, py = y0 + (y1 - y0) * k; ctx.globalAlpha = (k <= q ? 0.34 : 0.14) * fade; ctx.fillStyle = col; ctx.fillRect(snap(px - nx * w / 2) - ART / 2, snap(py - ny * w / 2 * 0.5), ART, Math.max(ART, snap(w * 0.5))); }
    ctx.globalAlpha = 0.95 * fade * blink; ellRing(ctx, x1, y1, o.r, o.r / 1.2, col);
  } else {
    const list = o.multi ? o.multi.filter(u => u.alive) : [o.ent || null];
    list.forEach((ent, i) => {
      const [x, y] = ent ? at(ent) : at(null), r = o.r * (o.multi && i ? 0.8 : 1), ry = r / 1.2;
      ctx.globalAlpha = 0.14 * fade; ellRows(ctx, x, y, r, ry, col);
      ctx.globalAlpha = 0.36 * fade; ellRows(ctx, x, y, r * q, ry * q, col);
      ctx.globalAlpha = 0.95 * fade * blink; ellRing(ctx, x, y, r, ry, col);
      if (q < 1) { ctx.globalAlpha = 0.8 * fade; ellRing(ctx, x, y, r * q, ry * q, hi); }
      if (o.chain && i > 0) { const p = list[i - 1]; ctx.globalAlpha = 0.6 * fade; ctx.fillStyle = col; const dd = Math.hypot(x - p.x, y - p.y); for (let k = 0; k < dd; k += 16) ctx.fillRect(snap(p.x + (x - p.x) * k / dd) - 2, snap(p.y + (y - p.y) * k / dd) - 2, ART, ART); }
    });
  }
  // the thread from the caster to its mark: who is casting, and at what
  if (o.tether && o.src && o.src.alive && (o.ent || o.x != null)) {
    const s = o.src, [x1, y1] = at(o.ent), x0 = s.x, y0 = s.y - 40 * (s.sz || 1), d = Math.hypot(x1 - x0, y1 - y0); if (d > 60) {
      ctx.globalAlpha = 0.55 * fade; ctx.fillStyle = col; const off = (T * 90) % 18;
      for (let k = off; k < d; k += 18) { const u = k / d, px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * Math.min(80, d * 0.18); ctx.fillRect(snap(px) - ART / 2, snap(py) - ART / 2, ART, ART); }
    }
  }
  // the moment it is full: a bright ring kicks out
  if (after > 0 && after < 0.18) { const k = after / 0.18, [x, y] = o.shape === 'sector' ? [o.x, o.y] : at(o.ent); ctx.globalAlpha = (1 - k) * 0.9; if (o.shape === 'sector') { ctx.fillStyle = hi; sectorRows(ctx, o.x, o.y, o.r * (1 + k * 0.08), o.half, o.dir || -1, 1, hi, true); } else ellRing(ctx, x, y, o.r * (1 + k * 0.25), o.r / 1.2 * (1 + k * 0.25), hi); }
  ctx.restore();
}
M.drawOmens = function (ctx, b, T) { if (!b.omens) return; for (const o of b.omens) drawOne(ctx, b, o, T); };
const oFloor = M.drawKbFloor;
M.drawKbFloor = function (ctx, b, T) { if (oFloor) oFloor.apply(this, arguments); M.drawOmens(ctx, b, T); };

// ───────── 精英: two words over every elite, so it is clear which one it is (user ruling 2026-09-26) ─────────
// The field is drawn in two passes (mc-game-m.js battleTick): the world pass (zoomed with the battle camera) and the
// screen pass (fixed on the screen). M.drawBattleHudPx runs in both. Anything that sits on a unit belongs to the world
// pass only (M.uiWorld()), anything pinned to the screen to the screen pass only (M.uiScreen()) — drawing in both is
// what made every new battle label show twice, the second one small and out of place.
M.uiWorld = () => M._camPass !== 'hud';
M.uiScreen = () => M._camPass !== 'world';
const oHud = M.drawBattleHudPx;
M.drawBattleHudPx = function (ctx, b, T) {
  if (oHud) oHud.apply(this, arguments);
  const U = M.bUI; if (!U || !M.uiWorld()) return;
  b.ents.forEach(e => {
    if (!e.alive || !e.elite || e.boss || T < (e.entryT || 0) + 0.5) return;
    const H0 = 88 * e.sz, y = U.g2(Math.max(4, e.y - H0 - 66 - (e.air ? e.air.z : 0))), x = e.x;
    const c = M.pxTextCanvas('精英', 24, PL.butter, { ink: PL.ink }), w = U.g2(c.width + 16), h = 30, X = U.g2(x - w / 2);
    U.R(ctx, X - 2, y - 2, w + 4, h + 4, PL.ink); U.R(ctx, X, y, w, h, PL.amber); U.R(ctx, X, y, w, 4, PL.gold); U.R(ctx, X, y + h - 4, w, 4, PL.wine);
    ctx.drawImage(c, U.g2(x - c.width / 2), U.g2(y + h / 2 - c.height / 2));
  });
  // a small boss wears its own name over its head (user ruling 2026-09-26), so players can say which one they reached
  b.ents.forEach(e => {
    if (!e.alive || !e.boss || !e.nm || e.fb || T < (e.entryT || 0) + 0.5) return;
    const H0 = 88 * e.sz, kp = M.kbPose ? M.kbPose(e, T) : { rot: 0 }, y = U.g2(Math.max(4, e.y - H0 - 58 - (e.air ? e.air.z : 0) + Math.abs(Math.sin(kp.rot)) * H0 * 0.6)), x = e.x;
    const c = M.pxTextCanvas(e.nm, 32, PL.butter, { ink: PL.ink }), w = U.g2(c.width + 20), h = 40, X = U.g2(x - w / 2);
    U.R(ctx, X - 2, y - 2, w + 4, h + 4, PL.ink); U.R(ctx, X, y, w, h, PL.wine); U.R(ctx, X, y, w, 4, PL.red); U.R(ctx, X, y + h - 4, w, 4, PL.abyss || PL.ink);
    ctx.drawImage(c, U.g2(x - c.width / 2), U.g2(y + h / 2 - c.height / 2));
  });
};
})();
