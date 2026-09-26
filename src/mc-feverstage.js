// ==== mc-feverstage.js ====
(function () {
// The FEVER result on a stage (user ruling 2026-09-27: 「fever触发的时候，战斗停止，结算效果的时候，全屏幕压暗，然后fever结算的
// 效果自带光亮，例如招募那就直接飞到我放部队初始位置，并且自身是亮的……骰子结算效果是，倍率UI的部分照亮，然后每增加0.1，就有一个UI
// （自带光亮）飞向倍率，飞到后弹动并且数值变化。把所有fever结算效果都整理一遍，都要有类似的伟大的表演」).
// From the slam to the end of the effect the fight stands still (mc-fever.js). After the reel the whole screen — field and
// bar — goes dark and the effect plays in light: whatever it touches is lit through the dark, whatever it brings flies in
// glowing. Then the dark lifts and FEVER TIME runs (its +0.2 flies into the multiplier as two chips).
//   闪电风暴 · bolts fall one by one from the top of the screen; each struck enemy is lit and its damage pops
//   回魂烛 · a great candle; motes of light fly to every unit, each lights up with its heal; shields ring; the fallen rise
//   旧相框 · an old frame; what it calls flies out glowing to the ground the army started on, lands in a ring, stays lit
//   摄魂铃 (was 招魂铃, a name that promised a summoning) · a bell swings; three rings of sound sweep out, every enemy
//          they reach is lit and marked (stars: stopped; hearts: turned against its own)
//   骰盅 · the multiplier on the bar is lit; the cup shakes, two dice roll out; every +0.1 is a glowing chip that flies
//          into the multiplier, which jumps and counts up
const M = window.MC, G = M.Game.prototype, BP = M.Battle3 && M.Battle3.prototype, S = M.Sfx, U = M.UI, P = M.PJ.PAL, DB = M.DB, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (q) => 1 - Math.pow(1 - q, 3), RM = () => !!(M.PJ && M.PJ.reduced);
const eback = (q) => { const c = 1.7; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); };
const FIELD_Y = 180, DIM = 0.76, MULT_C = '#ff6bd6';

// ───────── the five effects, as the reel shows them (the words match what happens) ─────────
const FX = M.FEVER_FX = {
  bolt: { n: [2, 5, 8, 12], dmg: [0.6, 0.9, 1.4, 2.2] },
  heal: { pct: [0.25, 0.5, 1, 1] },
  frame: { list: [['GrayWolf'], ['GrayWolf', 'GrayWolf', 'DireWolf'], ['DireWolf', 'VengefulDragon'], ['BoneDragon', 'DireWolf', 'DireWolf', 'VengefulDragon']] },
  bell: { stun: [1, 2, 3.5], charm: 5 },
  cup: { add: [0.2, 0.3, 0.5, 0.8] },
};
const I = M.ITEMS, nm = (k) => (DB[k] && DB[k].n) || k;
if (I) {
  Object.assign(I.bolt, { tiers: ['2 道落雷', '5 道落雷，会连锁', '8 道粗雷 + 冲击波', '12 道紫雷，劈晕敌人'] });
  Object.assign(I.heal, { tiers: ['全队回复 25%', '全队回复 50%', '全队回满 + 护盾', '回满 + 护盾 + 复活倒下的部队'] });
  Object.assign(I.frame, { desc: '召来帮手，落到我方阵地上', tiers: FX.frame.list.map(L => { const c = {}; L.forEach(k => { c[k] = (c[k] || 0) + 1; }); return '召来 ' + Object.keys(c).map(k => c[k] + ' 只' + nm(k)).join(' + '); }) });
  Object.assign(I.bell, { name: '摄魂铃', desc: '定住敌人，有概率让敌人自相残杀', tiers: ['敌人定住 1 秒', '定住 2 秒', '定住 3.5 秒', '敌人互相攻击 5 秒'] });
  Object.assign(I.cup, { tiers: FX.cup.add.map(a => '积分倍率 +' + a) });
}
// where each ally stood when the fight began: the army's own ground (the called helpers land there)
if (BP) { const oInit = BP.init; BP.init = function () { const r = oInit.apply(this, arguments); this.ents.forEach(e => { if (e.side === 'A') { e.x0 = e.x; e.y0 = e.y; } }); return r; }; }

// ───────── positions: the field canvas sits 180 px down the stage, under the fight's camera ─────────
const scr = (g, x, y) => { const p = g.camField(x, y); return { x: p.x, y: p.y + FIELD_Y }; };
const zoom = (g) => (g.bcam && g.bcam.z) || 1;
const bodyAt = (g, e) => scr(g, e.x, e.y - 42 * (e.sz || 1));
const rectOf = (g, sel) => { const st = g.ui && g.ui.stage && g.ui.stage(); if (!st) return null; const el = st.querySelector('[data-fx="' + sel + '"]'); if (!el) return null; const a = st.getBoundingClientRect(), b = el.getBoundingClientRect(), s = g.ui.scale(); return { x: (b.left - a.left) / s, y: (b.top - a.top) / s, w: b.width / s, h: b.height / s }; };

// a glowing chip for the multiplier (drawn once)
let CHIP = null;
const chip = () => { if (CHIP) return CHIP; const c = document.createElement('canvas'); c.width = c.height = 44; const x = c.getContext('2d'), R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  R(8, 2, 28, 40, P.ink); R(2, 8, 40, 28, P.ink); R(6, 4, 32, 36, P.ink); R(8, 6, 28, 32, MULT_C); R(6, 10, 32, 24, MULT_C); R(10, 6, 16, 4, P.white); R(8, 10, 4, 8, P.white); R(12, 36, 22, 3, '#a02a7a');
  R(19, 13, 6, 18, P.white); R(13, 19, 18, 6, P.white); CHIP = c; return c; };
// the multiplier takes chips one by one: each lands with a jump and +0.1
G.multChips = function (n, from, delay) {
  const b = this.battle; if (!b || !(n > 0)) return; const to = this.fxPos('bmult') || { x: 1480, y: 1000 };
  for (let i = 0; i < n; i++) this.fx.fly(chip(), { x: from.x + (Math.random() - 0.5) * 60, y: from.y + (Math.random() - 0.5) * 30 }, to, { col: MULT_C, dur: 0.42, s0: 1.3, s1: 0.8, arc: 160 + Math.random() * 80, delay: (delay || 0) + i * 0.11,
    onLand: () => { if (this.battle !== b) return; b.mult = Math.round((b.mult + 0.1) * 10) / 10; this.punchSel('bmult', 1.2); this.wave && this.wave(to.x, to.y, 0.6, 200); S.tick && S.tick(Math.min(12, i)); } });
  S.mult && S.mult();
};

// ───────── the stage ─────────
G.fvStageStart = function (key, tier, b) {
  const st = this.fvStage = { key, tier, b, t: 0, last: now(), ev: [], holes: [], flyers: [], marks: [], bolts: [], arcs: [], pillars: [], waves: [], hit: new Set(), end: 1.4, prop: null, spot: null };
  const on = (t, fn) => st.ev.push({ t, fn });
  const Ix = I[key], tc = M.TIERS[tier].c;
  st.title = { n: Ix.name, sub: Ix.tiers[tier], c: tc, ic: Ix.icon };
  S.whoosh && S.whoosh(0.5); S.itemUse && S.itemUse(key === 'cup' ? 'dice' : key, tier);
  const g = this, foes = () => b.ents.filter(e => e.alive && e.side === 'E' && e.x < 1900 && (b.t >= (e.entryT || 0)));
  if (key === 'bolt') {
    const n = FX.bolt.n[tier], dmg = FX.bolt.dmg[tier] * Math.max(200, ((b.cfg && b.cfg.budget) || 100) * 2.4) * (b.ek || 1), gap = n > 8 ? 0.11 : n > 5 ? 0.15 : 0.24, struck = new Set();
    for (let i = 0; i < n; i++) on(0.5 + i * gap, () => {
      const F = foes(); if (!F.length) return; let list = F.filter(e => !struck.has(e.id)); if (!list.length) list = F; const tg = list[Math.floor(Math.random() * list.length)]; struck.add(tg.id);
      const p = bodyAt(g, tg); st.bolts.push({ x: p.x, y: p.y, t0: st.t, tier, seed: Math.random() * 1000 }); st.holes.push({ e: tg, r: 120, t0: st.t, life: 0.9 });
      b.deal(b.hero, tg, dmg, { skill: 1, col: '#e0e8ff', big: tier >= 2 }); g.fx.pop(p.x, p.y - 70, M.fmt(Math.round(dmg)), tier >= 3 ? P.violet : '#e0e8ff', 46 + tier * 6, { rise: 60 });
      if (!RM()) g.fx.kick(4 + tier * 4); g.fx.flash(tier >= 3 ? '#e0c0ff' : '#fff8d8', 0.12 + tier * 0.06); S.bolt && S.bolt(tier);
      if (tier === 1) { const o = F.filter(x => x !== tg).sort((a, c) => Math.hypot(a.x - tg.x, a.y - tg.y) - Math.hypot(c.x - tg.x, c.y - tg.y))[0]; if (o && Math.hypot(o.x - tg.x, o.y - tg.y) < 300) { const q = bodyAt(g, o); st.arcs.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, t0: st.t }); b.deal(b.hero, o, dmg * 0.5, { skill: 1, col: '#e0e8ff' }); st.holes.push({ e: o, r: 90, t0: st.t, life: 0.7 }); } }
      if (tier >= 2) { const r = tier === 3 ? 190 : 130; g.fx.ring(p.x, p.y + 30, 20, r * zoom(g), tier === 3 ? P.violet : P.gold, 10, 0.45);
        F.forEach(o => { if (o !== tg && Math.hypot(o.x - tg.x, o.y - tg.y) < r) { b.deal(b.hero, o, dmg * (tier === 3 ? 0.6 : 0.4), { skill: 1, col: '#e0e8ff' }); if (tier === 3) { o.stun = Math.max(o.stun || 0, 1); st.marks.push({ e: o, kind: 'stun', t0: st.t }); } st.holes.push({ e: o, r: 85, t0: st.t, life: 0.6 }); } }); }
    });
    st.end = 0.5 + (n - 1) * gap + 1.0;
  } else if (key === 'heal') {
    const pct = FX.heal.pct[tier], C = { x: 960, y: 330 }, A = b.ents.filter(e => e.alive && e.side === 'A' && !e.isHero).sort((a, c) => a.x - c.x);
    st.prop = { kind: 'candle', x: C.x, y: C.y, t0: 0 };
    A.forEach((o, i) => on(0.6 + i * 0.07, () => st.flyers.push({ kind: 'mote', from: C, e: o, t0: st.t, dur: 0.45, col: '#b8ffb0', land: () => {
      const h0 = o.hp; b.heal(o, o.maxHp * pct); if (tier >= 2) { o.shield = o.maxHp * 0.3; st.marks.push({ e: o, kind: 'shield', t0: st.t }); }
      st.holes.push({ e: o, r: 95, t0: st.t, life: 99 }); const q = bodyAt(g, o); g.fx.pop(q.x, q.y - 60, '+' + M.fmt(Math.round(Math.max(0, o.hp - h0))), '#9cff7a', 36, { rise: 50 }); S.heal && S.heal(); } })));
    let tEnd = 0.6 + A.length * 0.07 + 0.5;
    on(tEnd - 0.2, () => { if (b.hero && b.hero.alive) b.heal(b.hero, b.hero.maxHp * pct * 0.25); });
    if (tier === 3) { const dead = b.ents.filter(o => !o.alive && o.side === 'A' && !o.isHero && !o.summon && !o.evolved);
      dead.forEach((o, i) => on(tEnd + 0.15 + i * 0.28, () => { o.alive = true; o.hp = o.maxHp * 0.6; b.deadUids = (b.deadUids || []).filter(x => x !== o.uid); const q = bodyAt(g, o); st.pillars.push({ x: q.x, y: q.y, t0: st.t }); st.holes.push({ e: o, r: 120, t0: st.t, life: 99 }); g.fx.pop(q.x, q.y - 80, '复活！', '#7fff9a', 44); S.up && S.up(2); }));
      tEnd += 0.15 + dead.length * 0.28 + 0.3; }
    st.end = tEnd + 0.8;
  } else if (key === 'frame') {
    const list = FX.frame.list[tier], C = { x: 960, y: 320 }, home = b.ents.filter(e => e.side === 'A' && !e.isHero && e.x0 != null), H = home.length ? home : [{ x0: 560, y0: 360 }];
    const x0 = Math.min(...H.map(e => e.x0)), x1 = Math.max(...H.map(e => e.x0)), y0 = Math.min(...H.map(e => e.y0)), y1 = Math.max(...H.map(e => e.y0));
    st.prop = { kind: 'frame', x: C.x, y: C.y, t0: 0 };
    list.forEach((k, i) => on(0.55 + i * 0.4, () => {
      const x = cl(x0 + (x1 - x0) * (list.length > 1 ? i / (list.length - 1) : 0.5) + (Math.random() - 0.5) * 40, 200, 900), y = cl(y0 + (y1 - y0) * ((i * 0.618 + 0.2) % 1), 150, 600);
      const img = (M.P16 && M.P16.img && M.P16.img(k, 'idle', 0, null, 96)) || M.spriteCanvas(k, 6);
      st.flyers.push({ kind: 'unit', from: C, at: { x, y }, img, t0: st.t, dur: 0.6, col: '#d8a0ff', land: () => {
        const s = b.summon(k, 'A', x, y, 60); if (s) { s.maxHp *= 1 + (b.w || 0) * 0.3; s.hp = s.maxHp; s.atk *= 1 + (b.w || 0) * 0.3; st.holes.push({ e: s, r: 115, t0: st.t, life: 99 }); }
        const q = scr(g, x, y); g.fx.ring(q.x, q.y, 10, 130 * zoom(g), '#d8a0ff', 8, 0.5); g.fx.burst && g.fx.burst(q.x, q.y - 40, '#d8a0ff', 14, { v: 320 }); if (!RM()) g.fx.kick(8); S.summonIn && S.summonIn(0); } });
    }));
    st.end = 0.55 + (list.length - 1) * 0.4 + 0.6 + 1.0;
  } else if (key === 'bell') {
    st.prop = { kind: 'bell', x: 960, y: 250, t0: 0 };
    [0.45, 0.9, 1.35].forEach(t => on(t, () => { st.waves.push({ t0: st.t }); if (!RM()) g.fx.kick(5); S.itemUse && S.itemUse('bell', tier); }));
    st.bellOn = true; st.end = 2.5;
  } else if (key === 'cup') {
    const add = FX.cup.add[tier], n = Math.round(add * 10);
    st.spot = 'bmult'; st.prop = { kind: 'cup', x: 960, y: 360, t0: 0 };
    on(0.75, () => { st.dice = [{ a: -1, t0: st.t, v: 1 + Math.floor(Math.random() * 6) }, { a: 1, t0: st.t, v: 1 + Math.floor(Math.random() * 6) }]; S.itemUse && S.itemUse('dice', tier); });
    on(1.2, () => this.multChips(n, { x: 960, y: 450 }, 0));
    st.end = 1.2 + n * 0.11 + 0.42 + 0.7;
  }
  st.end += 0.3;
};
// real time: events in order, then the flyers; the stage lets go when it is done or the fight is gone
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), st = this.fvStage; if (!st) return r;
  const b = st.b; if (this.battle !== b || this.screen !== 'battle' || b.over) { this.fvStage = null; if (this.feverFx) this.feverFx.timeAt = now(); return r; }
  const t1 = now(), d = Math.min(0.05, (t1 - st.last) / 1000); st.last = t1; st.t += d;
  st.ev.sort((a, c) => a.t - c.t); while (st.ev.length && st.ev[0].t <= st.t) { const e = st.ev.shift(); try { e.fn(); } catch (err) { (window.__mcErrs = window.__mcErrs || []).push('fever stage: ' + err.message); } }
  st.flyers.forEach(f => { if (!f.done && st.t - f.t0 >= f.dur) { f.done = true; try { f.land(); } catch (err) { (window.__mcErrs = window.__mcErrs || []).push('fever stage: ' + err.message); } } });
  // the bell: every enemy the first ring reaches is caught
  if (st.bellOn) st.waves.forEach(w => { const R = (st.t - w.t0) * 1500; b.ents.forEach(e => { if (!e.alive || e.side !== 'E' || st.hit.has(e.id) || e.x >= 1900) return; const p = bodyAt(this, e); if (Math.hypot(p.x - 960, p.y - 250) > R) return; st.hit.add(e.id);
    if (st.tier === 3) { e.charm = FX.bell.charm; e.target = null; } else e.stun = Math.max(e.stun || 0, FX.bell.stun[st.tier]);
    st.marks.push({ e, kind: st.tier === 3 ? 'charm' : 'stun', t0: st.t }); st.holes.push({ e, r: 100, t0: st.t, life: 99 }); this.fx.pop(p.x, p.y - 70, st.tier === 3 ? '倒戈' : '定住', st.tier === 3 ? '#ff80c0' : P.gold, 30, { rise: 40 }); }); });
  if (st.t >= st.end) { this.fvStage = null; this.feverTimeStart(b); }
  return r;
};
// the pile of 5 long shows the player can hurry: the stage counts too
const oLS = G.longShow; if (oLS) G.longShow = function () { return !!this.fvStage || oLS.apply(this, arguments); };
// the fx layer goes over the bar while the stage plays, so the dark covers everything
const oView = G.view;
G.view = function () { const v = oView.call(this); if (this.fvStage && this.screen === 'battle') v.fxZ = 58; return v; };

// ───────── drawing ─────────
let DC = null;
const dimCanvas = () => { if (!DC) { DC = document.createElement('canvas'); DC.width = 1920; DC.height = 1080; } return DC; };
function drawDim(ctx, g, st) {
  const a = cl(st.t / 0.25, 0, 1) * cl((st.end - st.t) / 0.3, 0, 1) * DIM; if (a <= 0) return;
  const c = dimCanvas(), x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, 1920, 1080); x.fillStyle = 'rgba(7,6,15,1)'; x.fillRect(0, 0, 1920, 1080);
  x.globalCompositeOperation = 'destination-out';
  st.holes.forEach(h => { const age = st.t - h.t0; if (age < 0 || age > h.life) return; const e = h.e; if (e && !e.alive) return; const p = e ? bodyAt(g, e) : h; const f = cl(age / 0.12, 0, 1) * cl((h.life - age) / 0.3, 0, 1), r = h.r * zoom(g) * (e && e.sz ? Math.sqrt(e.sz) : 1);
    const gr = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); gr.addColorStop(0, 'rgba(0,0,0,' + f + ')'); gr.addColorStop(0.6, 'rgba(0,0,0,' + (f * 0.85) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(p.x - r, p.y - r, r * 2, r * 2); });
  if (st.spot) { const R = rectOf(g, st.spot); if (R) { x.fillStyle = 'rgba(0,0,0,1)'; x.fillRect(R.x - 14, R.y - 10, R.w + 28, R.h + 20); st.spotR = R; } }
  x.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.drawImage(c, 0, 0); ctx.restore();
}
function jag(ctx, x0, y0, x1, y1, seed, w, col) {
  let s = seed; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const n = 9, pts = [[x0, y0]]; for (let i = 1; i < n; i++) { const q = i / n; pts.push([x0 + (x1 - x0) * q + (rnd() - 0.5) * 70, y0 + (y1 - y0) * q]); } pts.push([x1, y1]);
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'miter'; ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke();
}
function drawStage(ctx, g, st) {
  const T = st.t, fade = cl((st.end - T) / 0.3, 0, 1), still = RM();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  // the lit multiplier: a gold frame that breathes
  if (st.spotR) { const R = st.spotR, pu = still ? 0 : Math.sin(T * 8) * 3; ctx.globalAlpha = fade; ctx.strokeStyle = P.gold; ctx.lineWidth = 6; ctx.strokeRect(R.x - 14 - pu, R.y - 10 - pu, R.w + 28 + pu * 2, R.h + 20 + pu * 2); M.glow(ctx, R.x + R.w / 2, R.y + R.h / 2, 220, MULT_C, 0.35 * fade); ctx.globalAlpha = 1; }
  // the prop in the middle: candle, frame, bell or cup, rising in with a glow
  const pr = st.prop; if (pr) {
    const q = cl(T / 0.35, 0, 1), sc = still ? 1 : eback(q), ic = st.title.ic, im = M.spriteCanvas(ic, 18), col = pr.kind === 'candle' ? '#ffe08a' : pr.kind === 'frame' ? '#d8a0ff' : pr.kind === 'bell' ? P.gold : MULT_C;
    let rot = 0, dx = 0; if (!still && pr.kind === 'bell') rot = Math.sin(T * 9) * 0.35 * cl(1 - (T - 1.6) / 0.8, 0, 1); if (!still && pr.kind === 'cup' && T > 0.3 && T < 0.8) dx = Math.sin(T * 60) * 12; if (!still && pr.kind === 'frame') rot = Math.sin(T * 3) * 0.05;
    ctx.globalAlpha = fade; M.glow(ctx, pr.x, pr.y, 260, col, 0.55); M.glow(ctx, pr.x, pr.y, 110, '#ffffff', 0.35);
    if (pr.kind === 'candle') for (let i = 0; i < 6; i++) { const a = T * 1.4 + i; U.R(ctx, pr.x + Math.cos(a) * 120, pr.y - 40 + Math.sin(a * 1.3) * 60, 6, 6, i % 2 ? P.butter : '#b8ffb0'); }
    if (im) { ctx.save(); ctx.translate(pr.x + dx, pr.y - (pr.kind === 'bell' ? 0 : 0)); ctx.rotate(rot); ctx.scale(sc, sc); ctx.drawImage(im, -im.width / 2, pr.kind === 'bell' ? 0 : -im.height / 2); ctx.restore(); }
    ctx.globalAlpha = 1;
  }
  // the dice tumble out of the cup and land showing their faces
  if (st.dice) st.dice.forEach(dc => { const q = cl((T - dc.t0) / 0.45, 0, 1), x = 960 + dc.a * (40 + 90 * eo(q)), y = 380 + 70 * eo(q) - Math.sin(q * Math.PI) * 90, r = still ? 0 : (1 - q) * 6 * dc.a, s = 56;
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(x, y); ctx.rotate(r); U.R(ctx, -s / 2 - 4, -s / 2 - 4, s + 8, s + 8, P.ink); U.R(ctx, -s / 2, -s / 2, s, s, P.cream); U.R(ctx, -s / 2, -s / 2, s, 6, P.white);
    const PIP = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[q < 1 ? 1 + Math.floor(T * 20) % 6 : dc.v];
    PIP.forEach(([a, b]) => U.R(ctx, a * 16 - 5, b * 16 - 5, 10, 10, dc.v === 1 && q >= 1 ? P.red : P.ink)); ctx.restore(); M.glow(ctx, x, y, 90, MULT_C, 0.3 * fade); });
  // bell rings
  st.waves.forEach(w => { const q = (T - w.t0) / 0.9; if (q < 0 || q > 1) return; ctx.save(); ctx.globalAlpha = (1 - q) * fade; ctx.strokeStyle = st.tier === 3 ? '#ff80c0' : P.gold; ctx.lineWidth = 10 * (1 - q) + 3; ctx.beginPath(); ctx.ellipse(960, 250, q * 1350, q * 900, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); });
  // bolts from the top of the screen, a chain arc, pillars of light for the risen
  st.bolts.forEach(bo => { const q = (T - bo.t0) / 0.3; if (q < 0 || q > 1) return; const w = [8, 10, 14, 18][bo.tier]; ctx.save(); ctx.globalAlpha = 1 - q; jag(ctx, bo.x + ((bo.seed % 200) - 100), 0, bo.x, bo.y, bo.seed, w + 10, bo.tier >= 3 ? P.violet : '#8fb8ff'); jag(ctx, bo.x + ((bo.seed % 200) - 100), 0, bo.x, bo.y, bo.seed, w * 0.45, P.white); ctx.restore(); M.glow(ctx, bo.x, bo.y, 180, bo.tier >= 3 ? P.violet : '#e0e8ff', 0.7 * (1 - q)); });
  st.arcs.forEach(a => { const q = (T - a.t0) / 0.3; if (q < 0 || q > 1) return; ctx.save(); ctx.globalAlpha = 1 - q; jag(ctx, a.x1, a.y1, a.x2, a.y2, a.t0 * 1000, 6, '#8ff6ff'); ctx.restore(); });
  st.pillars.forEach(pl => { const q = (T - pl.t0) / 0.8; if (q < 0 || q > 1) return; ctx.save(); ctx.globalAlpha = (1 - q) * 0.8; U.R(ctx, pl.x - 34 * (1 - q * 0.5), 0, 68 * (1 - q * 0.5), pl.y + 40, '#b8ffb0'); U.R(ctx, pl.x - 10, 0, 20, pl.y + 40, P.white); ctx.restore(); M.glow(ctx, pl.x, pl.y, 200, '#b8ffb0', 0.6 * (1 - q)); });
  // flyers: motes of light to the army, the called helpers flying to their ground
  st.flyers.forEach(f => { const q = cl((T - f.t0) / f.dur, 0, 1); if (f.done && T - f.t0 > f.dur + 0.05) return;
    const to = f.e ? bodyAt(g, f.e) : scr(g, f.at.x, f.at.y), cx = (f.from.x + to.x) / 2, cy = Math.min(f.from.y, to.y) - 180, k = eo(q), x = (1 - k) * (1 - k) * f.from.x + 2 * (1 - k) * k * cx + k * k * to.x, y = (1 - k) * (1 - k) * f.from.y + 2 * (1 - k) * k * cy + k * k * to.y;
    if (f.kind === 'mote') { M.glow(ctx, x, y, 60, f.col, 0.8); U.R(ctx, x - 5, y - 5, 10, 10, P.white); }
    else { M.glow(ctx, x, y - 30, 120, f.col, 0.75); const im = f.img, z = zoom(g) * (0.6 + 0.4 * k); if (im) { ctx.save(); ctx.translate(x, y); ctx.scale(z, z); ctx.drawImage(im, -(im.cx || im.width / 2), -(im.footY || im.height)); ctx.restore(); } } });
  // marks over the caught enemies and the shielded units
  st.marks.forEach(mk => { const e = mk.e; if (!e.alive) return; const p = bodyAt(g, e), a = cl((T - mk.t0) / 0.15, 0, 1) * fade, y = p.y - 70 * (e.sz || 1) - (still ? 0 : Math.sin(T * 6 + e.id) * 4);
    ctx.save(); ctx.globalAlpha = a;
    if (mk.kind === 'stun') for (let i = 0; i < 3; i++) { const an = T * 4 + i * 2.1, sx = p.x + Math.cos(an) * 26, sy = y + Math.sin(an) * 8; U.R(ctx, sx - 5, sy - 5, 10, 10, P.ink); U.R(ctx, sx - 3, sy - 3, 6, 6, P.gold); }
    else if (mk.kind === 'charm') { U.R(ctx, p.x - 12, y - 8, 10, 10, '#ff80c0'); U.R(ctx, p.x + 2, y - 8, 10, 10, '#ff80c0'); U.R(ctx, p.x - 8, y, 16, 8, '#ff80c0'); U.R(ctx, p.x - 4, y + 8, 8, 4, '#ff80c0'); }
    else if (mk.kind === 'shield') { ctx.strokeStyle = P.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(p.x, p.y, 48 * zoom(g), 56 * zoom(g), 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore(); });
  // the title: the effect and what it does, in the tier's colour
  const tq = cl(T / 0.25, 0, 1); ctx.globalAlpha = fade; const ty = 96 - (1 - eo(tq)) * 40;
  U.text(ctx, st.title.n, 960, ty, 64, st.title.c, { outline: true }); U.text(ctx, st.title.sub, 960, ty + 60, 32, P.cream, { outline: true });
  ctx.restore();
}
const FLP = M.FxLayer.prototype, oD = FLP.draw;
FLP.draw = function (ctx, noClear) {
  const g = M._g, st = g && this === g.fx && g.screen === 'battle' ? g.fvStage : null; if (!st) return oD.call(this, ctx, noClear);
  if (!noClear) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore(); }
  try { drawDim(ctx, g, st); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('fever dim: ' + e.message); }
  const r = oD.call(this, ctx, true);
  try { drawStage(ctx, g, st); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('fever stage draw: ' + e.message); g.fvStage = null; if (g.feverFx) g.feverFx.timeAt = now(); }
  return r;
};
const oNG = G.newGame; if (oNG) G.newGame = function () { this.fvStage = null; return oNG.apply(this, arguments); };
})();

;
