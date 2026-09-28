// ==== mc-nightskill.js ====
(function () {
// The garrison fights at night with everything it has (user ruling 2026-09-28: 「在守城阶段，部队的主动技能也是要能释放的，我看现在
// 守城阶段，好像不读蓝条了，也不知道技能能不能正常使用。总之，主动，被动，等等，都给是正常的」). The night's fight (M.NightRaid, a
// side-on fight along the town) never had traits, mana or skills: its units were life, attack, speed and reach. Now every unit of
// ours there carries its own traits, exactly the handlers the expeditions use (M.TRAIT_H):
// · the mana bar fills as in an expedition (every unit takes the field with its skill ready), and a full bar waits for the skill's
//   own trigger (mc-skilltrigger.js), charges and fires — its name over the unit, a ring, the same effect;
// · passives work: auras, what happens on each blow, on being hit, on a kill, on dying; summons join the garrison.
// This file gives the night's fight the calls those handlers make (deal, heal, mana, foes, aoe, summon …), mapped onto the night's
// own fight. Bonds stay off at night (2026-09-27, M.SYN_NIGHT in mc-synergy.js).
const M = window.MC, NRB = M.NightRaid; if (!NRB) return;
const DB = M.DB, TDB = M.TDB, H = M.TRAIT_H, S = M.Sfx || {}, BAL = M.BAL || { MANA_MUL: 2, ALLY_FLOOR: 5 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.2);
const GROWTH = new Set(['JuniorFisherman', 'EliteFisherman', 'SpiritOffering']);   // progression, not a fight: not at night
const clsOf = (t) => (TDB[t] ? TDB[t].cls.replace(/^Summon|Trait$/g, '') : '');
const AU0 = () => ({ def: 0, as: 0, dmg: 0, leech: 0, mreg: 0, taken: 0, flat: 0, hps: 0, regen: 0, slow: 0, frost: 0 });
const Q_WIND = [0.45, 0.6, 0.8, 1.0];   // the charge by quality (M.OMEN_DUR)
M.NIGHT_SKILLS = true;

// what the trait handlers read on a unit
function arm(b, e, key, unit) {
  const d = DB[key] || {}; e.key = key; e.d = d; e.unit = unit || null; if (unit && !e.uid) e.uid = unit.uid;
  if (!Object.getOwnPropertyDescriptor(e, 'maxHp')) Object.defineProperty(e, 'maxHp', { configurable: true, enumerable: false, get() { return this.max; }, set(v) { this.max = v; } });
  Object.assign(e, { buffs: [], debuf: {}, st: {}, au: AU0(), asB: 0, asDyn: 0, atkDyn: 0, defDyn: 0, def: 0, dodge: 0, shield: e.shield || 0, combo: 0, mana: 0, manaMul: 1, sz: 1, tags: [], slowAS: 0, slowT: 0, charm: 0, star: 1, cd0: e.cd, iv: e.cd, kills: 0 });
  e.pw = M.unitPower ? M.unitPower(key, unit) : 1; e.traits = [];
  if (e.side === 'A') {
    e.traits = (d.tr || []).filter(t => TDB[t] && !GROWTH.has(clsOf(t))).map(t => ({ key: t, n: TDB[t].n, d: TDB[t].d, v: TDB[t].v, cls: clsOf(t) }));
    const full = e.traits.find(t => H[t.cls] && H[t.cls].full && !H[t.cls].noFull);
    e.hasFull = !!full; e.skillN = full ? full.n : null; e.hasMana = e.hasFull || e.traits.some(t => /法力/.test(t.d)); e.mana = e.hasFull ? 100 : 0;
    b.call(e, 'init');
  }
}
const q3 = (e) => clamp((e.d && e.d.q) || 0, 0, 3);

const NS = class extends NRB {
  constructor(meta) {
    super(meta);
    this.nsOn = !!M.NIGHT_SKILLS; if (!this.nsOn) return;
    this.nsPend = []; this.cfg = this.cfg || { budget: 100 }; this.base = 0; this.scoreK = 0; this.w = this.w || 1;
    this.run = this.run || { mods: {}, M: meta, hero: meta.heroes && meta.heroes[0], region: {}, runBuff: {}, roster: [] };
    const gar = (M.garrisonOf ? M.garrisonOf(meta) : meta.garrison) || [], byId = {}; gar.forEach(u => { byId[u.uid] = u; });
    this.ents.forEach(e => { if (e.side === 'A') arm(this, e, e.sprite, byId[e.gar] || null); else arm(this, e, e.kind || e.sprite, null); });
  }
  spawn(s) { const n = this.ents.length; super.spawn(s); if (this.nsOn) for (let i = n; i < this.ents.length; i++) if (!this.ents[i].au) arm(this, this.ents[i], this.ents[i].kind || this.ents[i].sprite, null); }

  // ── the calls the trait handlers make (the same names as an expedition's fight, M.Battle3) ──
  call(e, hook, x) { let r; for (const t of e.traits || []) { const h = H[t.cls]; if (!h || !h[hook]) continue; let y; try { y = hook === 'tick' ? h.tick(this, e, t.v, x, t) : (hook === 'near' || hook === 'death' || hook === 'kill') ? h[hook](this, e, x, t.v, t) : h[hook](this, e, t.v, t); } catch (err) { (window.__mcErrs = window.__mcErrs || []).push('night ' + t.cls + '.' + hook + ': ' + err.message); } if (y !== undefined) r = y; } return r; }
  active(o) { return !!(o && o.alive && !o.bench); }
  foes(e) { return this.ents.filter(o => o !== e && o.alive && o.side !== e.side && !o.stealth); }
  allies(e) { return this.ents.filter(o => o.alive && o.side === e.side && o.au); }
  nearestFoe(e, r) { let best = null, bd = r || 1e9; for (const o of this.ents) { if (!o.alive || o.side === e.side || o.stealth) continue; const d = dist(o, e); if (d < bd) { bd = d; best = o; } } return best; }
  lowest(e) { return this.allies(e).filter(o => o.hp < o.max).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; }
  later(dt, fn) { this.nsPend.push({ t: this.t + dt, fn }); }
  mana(e, amt, perSec) { if (!e || !e.alive || !(amt > 0)) return; if (e.side === 'A') amt *= BAL.MANA_MUL || 1; e.mana = Math.min(100, (e.mana || 0) + amt * (perSec ? (e.manaMul || 1) * (1 + ((e.au && e.au.mreg) || 0)) : 1)); }
  heal(o, amt, col) { if (!o || !o.alive || !(amt > 0)) return; const a = Math.min(amt, o.max - o.hp); o.hp += a; if (a > 1) this.float(o.x + 16, o.y - 100, '+' + M.fmt(a), col || '#7fff9a', 22); }
  healE(o, amt) { this.heal(o, amt); }
  regen(o, amt) { if (!o || !o.alive || !(amt > 0)) return; o.hp = Math.min(o.max, o.hp + amt); }
  ignite(tg, dps, src) { if (tg && tg.alive && tg.side === 'E') tg.burn = { dps, until: this.t + 3, src }; }
  gainBase() {} coins(x, y, n) { this.burst(x, y, '#ffcc33', Math.min(8, n || 4)); } dust(x, y, n) { this.burst(x, y, '#8a7a6a', Math.min(8, n || 4)); }
  evolve() {} evolveU() {} levelUp() {} growLog() {}
  hit(src, tg, d, crit) { this.deal(src, tg, d, { skill: 1, crit }); }
  kill(e, src) { if (e && e.alive) this.deal(src, e, e.hp + (e.shield || 0) + 1, { skill: 1, silent: 1 }); }
  explode(x, y, dmg, src) { this.fxp({ k: 'boom', x, y, r: 150, life: 0.4 }); this.ents.forEach(o => { if (o.alive && o.side === 'E' && Math.abs(o.x - x) < 150) this.deal(src, o, dmg, { skill: 1 }); }); }
  aoe(src, x, y, r, dmg, col, fn, skip) {
    const side = src ? src.side : 'A'; this.fxp({ k: 'boom', x, y, r, life: 0.4 });
    this.ents.slice().forEach(o => { if (o === skip || !o.alive || o.side === side || Math.hypot(o.x - x, (o.y - y) * 1.2) > r) return; this.deal(src, o, dmg, { skill: 1, col }); if (fn && o.alive) fn(o); });
  }
  shootP(e, tg, o = {}) { if (!tg || !tg.alive) return; const from = o.from || e; this.fx.push({ k: 'nsline', x1: from.x, y1: from.y - 50, x2: tg.x, y2: tg.y - 40, col: o.col || '#ffe08a', w: 6, t0: this.t, life: 0.2 }); this.later(0.15, () => { if (tg.alive) { if (o.dmg != null) this.deal(e, tg, o.dmg, { skill: o.skill, ranged: 1 }); else this.strikeN(e, tg, true); } }); }
  shell(e, tg, fn) { if (!tg) return; this.fx.push({ k: 'nsline', x1: e.x, y1: e.y - 60, x2: tg.x, y2: tg.y - 30, col: '#ffa040', w: 10, t0: this.t, life: 0.3 }); this.later(0.5, fn); }
  summon(key, side, x, y, life, src) {
    const d = DB[key]; if (!d || this.ents.filter(o => o.alive && o.summon && o.side === side).length > 14) return null;
    const k = src && src.unit && src.unit.ek > 1 ? src.unit.ek : 1, hp = d.hp * k, px = clamp(x, (this.edgeL || 0) - 200, (this.edgeR || 4000) + 200);
    const e = { side, guard: 1, gar: 'sum' + Math.random(), sprite: key, s: 4, x: px, home: px, home0: px, y: -20 - Math.random() * 10, hp, max: hp, atk: d.atk * k, cd: 100 / Math.max(20, d.as || 100), range: d.ranged === 1 ? 320 : 70, spd: 170, ranged: d.ranged === 1, t: 0.3, alive: true, face: src ? src.face || 1 : 1, summon: true, lifeEnd: this.t + (life || 999) };
    this.ents.push(e); arm(this, e, key, null); this.call(e, 'start'); this.fx.push({ k: 'nsring', x: e.x, y: e.y - 30, r0: 10, r1: 80, col: '#c890ff', t0: this.t, life: 0.4 }); try { S.summonIn && S.summonIn(0); } catch (err) { /* sound */ }
    return e;
  }
  // the drawn marks of the expedition's fight, on the night's own layer
  fxp(o) {
    const T = this.t, k = o.k, at = o.ent || o, x = at.x != null ? at.x : o.x1, y = at.y != null ? at.y : o.y1;
    if (k === 'boom') this.fx.push({ k: 'boom', x: o.x, y: o.y != null ? o.y : -30, r: o.r || 120, t0: T, life: o.life || 0.4 });
    else if (k === 'arc' || k === 'beam2' || k === 'chain' || k === 'orb') this.fx.push({ k: 'nsline', x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2, col: o.col || '#ffe08a', w: o.w || 6, t0: T, life: o.life || 0.3 });
    else if (x != null && y != null && k !== 'float' && k !== 'ctitle' && k !== 'charge' && k !== 'pt') this.fx.push({ k: 'nsring', x, y: o.ent ? y - 40 : y, r0: 10, r1: Math.min(260, o.r || 90), col: o.col || '#ffe08a', t0: T, life: Math.min(1, o.life || 0.4) });
    return o;
  }
  ring(x, y, r0, r1, col, w, life) { this.fx.push({ k: 'nsring', x, y, r0, r1, col: col || '#ffe08a', t0: this.t, life: life || 0.4 }); }
  orb(a, b2, col) { if (a && b2) this.fx.push({ k: 'nsline', x1: a.x, y1: a.y - 50, x2: b2.x, y2: b2.y - 40, col: col || '#ffe08a', w: 8, t0: this.t, life: 0.35 }); }
  link(a, b2, col) { this.orb(a, b2, col); }
  soul(a, b2) { this.orb(a, b2, '#c890ff'); }

  // ── damage: blows of ours carry their traits; blows on ours meet their defences ──
  deal(src, tg, amt, o = {}) {
    if (!tg || !tg.alive || !(amt > 0)) return 0;
    if (!tg.au) { this._nsRaw = 1; try { super.damage(tg, amt, o.col, src); } finally { this._nsRaw = 0; } return amt; }
    if (o.auto && tg.dodge && Math.random() < tg.dodge) { this.float(tg.x, tg.y - 90, '闪避', '#b8f0ff', 24); for (const t of tg.traits) { const h = H[t.cls]; if (h && h.dodged) h.dodged(this, tg, t.v); } return 0; }
    let d = amt;
    if (src && src.dmgDown) d = Math.max(d * 0.2, d - src.dmgDown);
    if (src && src.dmgDownP) d *= Math.max(0.2, 1 - src.dmgDownP / 100);
    let def = (tg.def || 0) + (tg.defDyn || 0) + (tg.au.def || 0) + tg.buffs.reduce((a, b) => a + (b.def || 0), 0); Object.values(tg.debuf).forEach(D => { def -= D.v * D.n; });
    d *= 1 - clamp(def, -0.6, 0.85); d *= 1 + (tg.au.taken || 0);
    for (const t of tg.traits) { const h = H[t.cls]; if (h && h.hurt) { try { d = h.hurt(this, tg, src, d, t.v, Object.assign({ T: t }, o), t); } catch (err) { /* a handler never stops the night */ } } }
    if (tg.au.flat) d = Math.max(d * 0.3, d - tg.au.flat);
    if (tg.shield > 0) { const a = Math.min(tg.shield, d); tg.shield -= a; d -= a; }
    if (!(d > 0)) return 0;
    const hp0 = tg.hp; this._nsRaw = 1; try { super.damage(tg, d, o.col || (tg.side === 'E' ? (o.skill ? '#d890ff' : '#ffffff') : '#ff6a6a'), src); } finally { this._nsRaw = 0; }
    const dealt = Math.max(0, hp0 - Math.max(0, tg.hp));
    if (src && src.alive && src.au && src.au.leech && !o.reflect && src.side !== tg.side) src.hp = Math.min(src.max, src.hp + dealt * src.au.leech);
    if (hp0 > 0 && !tg.alive) this.nsDied(tg, src);
    return dealt;
  }
  strikeN(e, tg, ranged) {
    const c = { auto: 1, mul: 1, ranged };
    for (const t of e.traits) { const h = H[t.cls]; if (h && h.atk) { c.T = t; try { h.atk(this, e, tg, t.v, c, t); } catch (err) { /* a handler never stops the night */ } } }
    if (c.cancel) return 0;
    const d = e.atk * c.mul * (1 + Math.max(-0.7, e.atkDyn || 0)) * (1 + ((e.au && e.au.dmg) || 0));
    const dealt = this.deal(e, tg, d, { auto: !c.skill, skill: c.skill, ranged, big: c.ambush });
    for (const t of e.traits) { const h = H[t.cls]; if (h && h.dealt) { try { h.dealt(this, e, tg, dealt, t.v, { auto: !c.skill || c.ambush, ranged, T: t }, t); } catch (err) { /* a handler never stops the night */ } } }
    return dealt;
  }
  damage(e, d, col, src) {
    if (!this.nsOn || this._nsRaw) return super.damage(e, d, col, src);
    if (src && src.side === 'A' && src.traits && e && e.side === 'E') { const n = 1 + (src.combo || 0); let tot = this.strikeN(src, e, src.ranged); for (let i = 1; i < n; i++) this.later(i * 0.09, () => { if (e.alive && src.alive) this.strikeN(src, e, src.ranged); }); return tot; }
    if (e && e.side === 'A' && e.au) return this.deal(src, e, d, { auto: 1, ranged: !!(src && src.ranged), col });
    return super.damage(e, d, col, src);
  }
  nsDied(e, src) {
    if (e.side === 'E') { if (src && src.traits && src.alive) { src.kills = (src.kills || 0) + 1; this.call(src, 'kill', e); } this.ents.forEach(o => { if (o.alive && o.side === 'A' && o.traits && o.traits.length) this.call(o, 'near', e); }); }
    else if (e.traits && e.traits.length) this.call(e, 'death', src);
  }

  // ── each step: auras, what each trait does over time, mana and skills; then the night's own step ──
  step(dt) {
    if (!this.nsOn || this.over || !(dt > 0)) return super.step(dt);
    const T = this.t;
    if (!this.nsStarted) { this.nsStarted = 1; this.ents.forEach(e => { if (e.alive && e.side === 'A' && e.traits) this.call(e, 'start'); }); }
    const all = this.ents.filter(e => e.alive && e.au);
    all.forEach(e => { e.au = AU0(); e.asDyn = 0; e.atkDyn = 0; e.defDyn = 0; });
    all.forEach(e => (e.traits || []).forEach(t => { const h = H[t.cls]; if (!h || !h.aura) return; const A = h.aura; all.forEach(o => { if ((A.ally ? o.side === e.side : o.side !== e.side) && Math.hypot(o.x - e.x, (o.y - e.y) * 1.2) < A.r) { try { A.fn(this, e, o, t.v, dt); } catch (err) { /* a handler never stops the night */ } } }); }));
    for (const e of all) {
      if (e.lifeEnd && T > e.lifeEnd) { e.alive = false; this.burst(e.x, e.y - 30, '#8d8496', 6); continue; }
      e.buffs = e.buffs.filter(b => b.until > T); Object.keys(e.debuf).forEach(k => { if (e.debuf[k].until < T) delete e.debuf[k]; }); if (e.slowT < T) e.slowAS = 0;
      if (e.au.regen) this.regen(e, (e.max - e.hp) * e.au.regen * dt); if (e.au.hps) this.regen(e, e.au.hps * dt); e.buffs.forEach(b => { if (b.regen) this.regen(e, b.regen * dt); });
      if (e.burn) { if (e.burn.until < T) e.burn = null; else { this.deal(e.burn.src || e, e, e.burn.dps * dt, { skill: 1, silent: 1 }); if (!e.alive) continue; } }
      if (e.side === 'A' && e.traits.length) {
        this.call(e, 'tick', dt);
        if (!e.alive) continue;
        if (e.hasFull && !e.nsCast && !e.traits.some(t => H[t.cls] && H[t.cls].noFull)) e.mana = Math.min(100, e.mana + (BAL.ALLY_FLOOR || 5) * dt);
        if (e.nsCast) { if (T >= e.nsCast.until) this.nsFire(e); }
        else if (e.hasFull && e.mana >= 100 && !(e.stun > 0) && this.nsReady(e)) this.nsBegin(e);
      }
      // attack speed: the traits' and buffs' share, and slowing blows
      const as = 1 + (e.asB || 0) + (e.asDyn || 0) + e.au.as + e.buffs.reduce((a, b) => a + (b.as || 0), 0) - (e.slowAS || 0) - (e.au.slow || 0);
      e.cd = e.cd0 / Math.max(0.2, as);
    }
    const r = super.step(dt);
    for (let i = this.nsPend.length - 1; i >= 0; i--) if (this.nsPend[i].t <= this.t) { const p = this.nsPend.splice(i, 1)[0]; try { p.fn(); } catch (err) { (window.__mcErrs = window.__mcErrs || []).push('night later: ' + err.message); } }
    return r;
  }
  // a full bar fires when its trigger holds (the same triggers as an expedition, mc-skilltrigger.js)
  nsReady(e) { if (e._trT != null && this.t - e._trT < 0.15) return e._trV; e._trT = this.t; let v = true; try { v = !!(M.skillTrig ? M.skillTrig(e).test(this, e) : this.nearestFoe(e, 900)); } catch (err) { v = !!this.nearestFoe(e, 900); } e._trV = v; return v; }
  nsBegin(e) {
    const dur = Q_WIND[q3(e)]; e.mana = 0; e.nsCast = { t0: this.t, until: this.t + dur }; e.stun = Math.max(e.stun || 0, dur);
    this.float(e.x, e.y - 130, e.skillN || '技能', '#ffe08a', 26); this.fx.push({ k: 'nsring', x: e.x, y: e.y - 40, r0: 90, r1: 20, col: '#ffe08a', t0: this.t, life: dur });
    try { S.skillFx && S.skillFx('charge', 'spiral', 'holy', q3(e), dur, 0); } catch (err) { /* sound */ }
  }
  nsFire(e) {
    e.nsCast = null; e.lunge = this.t; this.call(e, 'full');
    this.fx.push({ k: 'nsring', x: e.x, y: e.y - 40, r0: 20, r1: 140 + q3(e) * 30, col: '#ffe08a', t0: this.t, life: 0.35 }); this.burst(e.x, e.y - 50, '#ffe08a', 8 + q3(e) * 3); this.shake = Math.max(this.shake, 3 + q3(e) * 2);
    try { S.skillFx && S.skillFx('cast', 'nova', 'holy', q3(e), 0, 0); } catch (err) { /* sound */ }
  }
  // the night's layer: lines and rings of the skills, and each skilled unit's mana bar under its life bar
  draw(ctx, lights) {
    const r = super.draw(ctx, lights); if (!this.nsOn) return r; const T = this.t;
    this.fx.forEach(f => {
      if (f.k !== 'nsline' && f.k !== 'nsring') return; const p = clamp((T - f.t0) / f.life, 0, 1); ctx.save(); ctx.globalAlpha = 1 - p;
      if (f.k === 'nsline') { ctx.strokeStyle = f.col; ctx.lineWidth = (f.w || 6) * (1 - p * 0.5); ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, (f.w || 6) * 0.3); ctx.stroke(); }
      else { const R = f.r0 + (f.r1 - f.r0) * p; ctx.strokeStyle = f.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(f.x, f.y, Math.max(2, R), Math.max(2, R * 0.55), 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore(); if (lights && f.k === 'nsring') lights.push({ x: f.x, y: f.y, r: 120, c: f.col.length === 7 ? f.col : '#ffe08a', f: 1 - p });
    });
    this.ents.forEach(e => {
      if (!e.alive || !e.hasFull || e.side !== 'A' || e._barTop == null) return;
      const w = e._barW, x = e._barX, y = e._barTop + 8; ctx.fillStyle = '#07060f'; ctx.fillRect(x - 1, y - 1, w + 2, 6); ctx.fillStyle = '#1a1840'; ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = e.nsCast ? '#ffe08a' : e.mana >= 100 ? (Math.floor(T * 4) % 2 ? '#8fd0ff' : '#c8e8ff') : '#5a9aff'; ctx.fillRect(x, y, w * clamp(e.mana / 100, 0, 1), 4);
    });
    return r;
  }
};
M.NightRaid = NS;
})();
