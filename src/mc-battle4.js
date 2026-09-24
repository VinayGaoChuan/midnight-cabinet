// ==== mc-battle4.js ====
(function () {
// Skill ceremony layer on top of Battle3: signature skills, cast wind-ups, pixel VFX, stacked pixel numbers, pixel backdrops.
const M = window.MC, B3 = M.Battle3, P = B3.prototype, H = M.TRAIT_H, DB = M.DB, { Sfx, fmt, pick } = M;
const PX = M.PX, RCOL = M.RACES, FW = 1920, FH = 720;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const BAL = M.BAL = { MANA_MUL: 2.0, SIG_RATE: 9, SIG_HIT: 5, ALLY_FLOOR: 5, FOE_SIG_RATE: 5, ENEMY_K: 1.45 };
let { MANA_MUL, SIG_RATE, SIG_HIT, ALLY_FLOOR, FOE_SIG_RATE } = BAL;
M.setBal = (o) => { Object.assign(BAL, o); ({ MANA_MUL, SIG_RATE, SIG_HIT, ALLY_FLOOR, FOE_SIG_RATE } = BAL); };
// enemies hit harder now that the army casts far more often (the tutorial stays gentle)
const oldInit = P.init;
P.init = function (run, cfg) { oldInit.call(this, run, cfg); if (!run.region.tut) this.ek *= BAL.ENEMY_K; };

// ───────── signature skills for units without an active trait ─────────
const target = (b, e) => (e.target && e.target.alive && b.active(e.target) ? e.target : b.nearestFoe(e, 3000));
const SIG = {
  charge: { n: '冲锋盾击', col: '#9fc8ff', fn(b, e, pw) { const tg = target(b, e); if (!tg) return; const x1 = tg.x + (e.side === 'A' ? -64 : 64); e.leap = { x0: e.x, y0: e.y, x1, y1: tg.y, t0: b.t, dur: 0.32 }; Sfx.whoosh(0.3);
    b.later(0.32, () => { e.x = x1; e.y = tg.y; e.leap = null; b.aoe(e, tg.x, tg.y, 135, e.atk * 2.4 * pw, '#bfe0ff', o => { o.stun = Math.max(o.stun, 0.9); }); e.shield = Math.max(e.shield || 0, e.maxHp * 0.18 * pw); b.fxp({ k: 'pxboom', x: tg.x, y: tg.y - 16, col: '#9fc8ff', r: 135, life: 0.55 }); b.fxp({ k: 'dome', ent: e, col: '#9fc8ff', life: 0.6 }); b.dust(e.x, e.y, 14); b.shake = Math.max(b.shake, 12); Sfx.impact(); }); } },
  whirl: { n: '旋风斩', col: '#ffa070', fn(b, e, pw) { b.fxp({ k: 'whirl', ent: e, col: '#ffc090', r: 150 * e.sz, life: 0.72 }); for (let i = 0; i < 3; i++) b.later(i * 0.2, () => { if (!e.alive) return; b.aoe(e, e.x, e.y, 150 * e.sz, e.atk * 1.3 * pw, '#ffc090'); Sfx.hit(); b.shake = Math.max(b.shake, 5); }); } },
  volley: { n: '箭雨', col: '#ffd060', fn(b, e, pw) { const tg = target(b, e); if (!tg) return; const x = tg.x, y = tg.y; b.fxp({ k: 'arrowrain', x, y, r: 130, col: '#fff0b0', life: 1.0 }); for (let i = 0; i < 4; i++) b.later(0.3 + i * 0.13, () => { b.aoe(e, x, y, 130, e.atk * 0.9 * pw, '#ffe08a'); Sfx.shoot(); }); } },
  fireball: { n: '陨石术', col: '#ff8a3a', power: 1, fn(b, e, pw) { const tg = target(b, e); if (!tg) return; const x = tg.x, y = tg.y; b.fxp({ k: 'pxmeteor', x, y, col: '#ff8a3a', life: 0.55 }); Sfx.whoosh(0.4);
    b.later(0.52, () => { b.aoe(e, x, y, 165, e.atk * 3.6 * pw, '#ffb050', o => b.ignite(o, e.atk * 0.35 * pw, e)); b.fxp({ k: 'pxboom', x, y: y - 10, col: '#ff8a3a', r: 175, life: 0.7 }); b.fxp({ k: 'crack', x, y, life: 1.6, col: '#ff6a2a' }); b.shake = Math.max(b.shake, 16); Sfx.impact(); }); } },
  frost: { n: '霜冻新星', col: '#9fe8ff', fn(b, e, pw) { const tg = target(b, e); if (!tg) return; const x = tg.x, y = tg.y; b.fxp({ k: 'frost', x, y, r: 175, col: '#bff4ff', life: 0.95 });
    b.later(0.12, () => { b.aoe(e, x, y, 175, e.atk * 2.0 * pw, '#bff4ff', o => { o.slowAS = Math.max(o.slowAS, 0.5); o.slowT = b.t + 3; o.frostT = b.t + 3; }); Sfx.bolt(0); b.shake = Math.max(b.shake, 8); }); } },
  chain: { n: '闪电链', col: '#bfe8ff', fn(b, e, pw) { let prev = e; const done = new Set(); for (let i = 0; i < 4; i++) { const c = b.foes(e).filter(o => !done.has(o)).sort((a, x) => Math.hypot(a.x - prev.x, a.y - prev.y) - Math.hypot(x.x - prev.x, x.y - prev.y))[0]; if (!c) break; done.add(c); const p = prev; b.later(i * 0.08, () => { b.fxp({ k: 'arc', x1: p.x, y1: p.y - 40 * (p.sz || 1), x2: c.x, y2: c.y - 40 * c.sz, col: '#dff4ff', life: 0.32, w: 6 }); b.fxp({ k: 'pxboom', x: c.x, y: c.y - 30, col: '#bfe8ff', r: 60, life: 0.3 }); b.deal(e, c, e.atk * 1.8 * pw, { skill: 1, col: '#dff4ff' }); }); prev = c; } b.flash = Math.max(b.flash, 0.15); b.flashCol = '#d0e8ff'; Sfx.bolt(1); } },
  holy: { n: '圣光审判', col: '#fff2a0', fn(b, e, pw) { b.allies(e).forEach(o => b.heal(o, o.maxHp * 0.12 * pw, '#fff2a0')); const tg = b.foes(e).sort((a, x) => x.maxHp - a.maxHp)[0]; if (tg) { b.fxp({ k: 'pxpillar', x: tg.x, y: tg.y, col: '#fff2a0', w: 58, life: 0.95 }); b.later(0.22, () => b.deal(e, tg, e.atk * 3 * pw, { skill: 1, col: '#fff2a0', big: 1 })); } Sfx.heal(); } },
  gold: { n: '金币风暴', col: '#ffcc33', fn(b, e, pw) { const fs = b.foes(e).sort(() => Math.random() - 0.5).slice(0, 4); fs.forEach((o, i) => b.later(i * 0.09, () => b.shootP(e, o, { dmg: e.atk * 1.6 * pw, skill: 1, style: 'coin', col: '#ffcc33', speed: 1500, size: 14 }))); if (e.side === 'A') b.gainBase(Math.round(4 + b.w * 3 * pw), e, '金币'); b.coins(e.x, e.y - 50, 10); } },
  maul: { n: '猛扑', col: '#ff6a4a', fn(b, e, pw) { const tg = target(b, e); if (!tg) return; const x1 = tg.x + (e.side === 'A' ? -50 : 50); e.leap = { x0: e.x, y0: e.y, x1, y1: tg.y, t0: b.t, dur: 0.3 };
    b.later(0.3, () => { e.x = x1; e.y = tg.y; e.leap = null; if (!tg.alive) return; b.deal(e, tg, e.atk * 3.2 * pw, { skill: 1, col: '#ff8a6a', big: 1 }); tg.x += (e.side === 'A' ? 40 : -40); tg.stun = Math.max(tg.stun, 0.5); b.fxp({ k: 'xslash', x: tg.x, y: tg.y - 40, col: '#ff8a6a', life: 0.35 }); b.shake = Math.max(b.shake, 10); Sfx.crit(); }); } },
};
M.SIG = SIG;
function sigOf(d) {
  if (!d || d.ranged === 2 || !d.atk) return null;
  const v = d.voc, r = d.race;
  if (v === '先锋') return 'charge'; if (v === '战士') return 'whirl'; if (v === '射手') return 'volley'; if (v === '祭司') return 'holy'; if (v === '商人') return 'gold';
  if (v === '法师') return /恶魔|混沌|兽人|野兽/.test(r) ? 'fireball' : /不死|骷髅|僵尸|精灵|自然/.test(r) ? 'frost' : 'chain';
  return d.ranged === 1 ? (/科技|虚空/.test(r) ? 'chain' : 'volley') : 'maul';
}
M.sigOf = sigOf;
const hasFull = (e) => e.traits.some(t => H[t.cls] && H[t.cls].full);
const manaRes = (e) => e.traits.some(t => H[t.cls] && H[t.cls].noFull);
// growth traits spend a full bar on evolving / levelling — that is progression, not a castable skill
const GROWTH = new Set(['JuniorFisherman', 'EliteFisherman', 'SpiritOffering']);
const growth = (e) => e.traits.some(t => GROWTH.has(t.cls) && H[t.cls] && H[t.cls].full);
const BIGT = new Set(['WaterSpoutNew', 'LightningStrike', 'EnergySurge', 'DimensionalRift', 'FinalJudgment', 'ForbiddenFruit', 'JuniorFisherman', 'SpiritOffering']);
const SKCOL = { ChainHeal: '#7fff9a', ShellShock: '#ffa040', Invigorate: '#ff6a4a', Summon: '#c890ff', DimensionalRift: '#c890ff', SkullStew: '#b8ff80', MindWarp: '#c890ff', SolarFlare: '#ffd060', FinalJudgment: '#fff2a0', LightningStrike: '#bfe8ff', WaterSpoutNew: '#6fe0ff', EnergySurge: '#b0a0ff', LifeBindVow: '#ff7a9a', IronHail: '#d8e0ea', RapidFire: '#ffd060', ForbiddenFruit: '#ff5a6a', JuniorFisherman: '#ffcc33', SpiritOffering: '#c890ff', SummonFroggo: '#9cff7a' };
M.unitSkill = function (k) { const d = DB[k]; if (!d) return null; const T = M.traitsOf(k).find(t => { const h = H[t.cls.replace(/^Summon|Trait$/g, '')]; return h && h.full; }); if (T) return { n: T.n, d: T.d, own: 1 }; if (M.traitsOf(k).some(t => { const h = H[t.cls.replace(/^Summon|Trait$/g, '')]; return h && h.noFull; })) return null; const s = sigOf(d); return s ? { n: SIG[s].n, d: SIG_DESC[s], sig: s } : null; };
const SIG_DESC = { charge: '冲向最近的敌人，小范围 240% 攻击力伤害并眩晕 0.9 秒，自身获得 18% 生命的护盾', whirl: '原地旋转 3 次，每次对周围敌人造成 130% 攻击力伤害', volley: '向目标区域射出箭雨，4 轮各 90% 攻击力伤害', fireball: '召唤陨石砸向目标，中范围 360% 攻击力伤害并点燃', frost: '在目标处引爆霜冻新星，中范围 200% 攻击力伤害并减速 50% 3 秒', chain: '闪电在 4 个敌人之间弹射，每次 180% 攻击力伤害', holy: '治疗全体友军 12% 最大生命，并对生命最高的敌人降下 300% 攻击力的圣光', gold: '向 4 个敌人抛出金币，各 160% 攻击力伤害，并获得额外积分', maul: '扑向目标，造成 320% 攻击力伤害并击退、眩晕' };
M.SIG_DESC = SIG_DESC;

const oldStats = P.unitStats;
P.unitStats = function (key, side, x, y, o = {}) {
  const e = oldStats.call(this, key, side, x, y, o);
  if (!e.summon && (side === 'A' || e.elite || e.boss) && (!hasFull(e) || growth(e)) && !manaRes(e)) { e.sig = sigOf(e.d); if (e.sig && growth(e)) e.sigPool = 1; }
  if (e.sig || (side === 'A' && hasFull(e))) e.hasMana = true;
  return e;
};
P.canSkill = function (e) { return e.alive && !e.isHero && !e.bench && (!!e.sig || (hasFull(e) && !growth(e))); };
P.skillCharge = function (e) { return e.sigPool ? (e.smana || 0) : e.mana; };
P.growthFull = function (e) { if (!growth(e) || e.mana < 100) return false; e.mana = 0; this.call(e, 'full'); return !e.alive; };
P.sigTick = function (e, dt) {
  if (!e.alive || e.casting) return;
  const r = (e.side === 'A' ? SIG_RATE : FOE_SIG_RATE) * dt;
  if (e.sig && e.sigPool) e.smana = Math.min(100, (e.smana || 0) + r);
  else if (e.sig) e.mana = Math.min(100, e.mana + r);
  else if (e.side === 'A' && !e.isHero && hasFull(e) && !manaRes(e) && !growth(e)) e.mana = Math.min(100, e.mana + ALLY_FLOOR * dt);
};
const oldMana = P.mana;
P.mana = function (e, amt, perSec) { if (e && e.side === 'A' && !e.isHero) amt *= MANA_MUL; return oldMana.call(this, e, amt, perSec); };
const oldStrike = P.strike;
P.strike = function (e, tg, ranged) { oldStrike.call(this, e, tg, ranged); if (e.sig && e.alive && !e.casting) { const v = e.side === 'A' ? SIG_HIT * MANA_MUL : 2.5; if (e.sigPool) e.smana = Math.min(100, (e.smana || 0) + v); else e.mana = Math.min(100, e.mana + v); } };
P.skillSpec = function (e) {
  const T = e.traits.find(t => H[t.cls] && H[t.cls].full), S = e.sig ? SIG[e.sig] : null, q = e.d.q || 0;
  const n = S ? S.n : T ? T.n : '技能', big = S ? (S.power || 0) : T && BIGT.has(T.cls) ? 1 : 0;
  const tier = clamp(q + big + (e.boss ? 2 : e.elite ? 1 : 0), 0, 3);
  const col = S ? S.col : (T && SKCOL[T.cls]) || RCOL[e.d.race] || '#ffe08a';
  return { n, col: e.side === 'E' && !S ? '#ff6a5a' : col, q, tier, pw: [1, 1.25, 1.55, 2][q] * (e.side === 'E' ? 0.85 : 1) };
};
P.beginCast = function (e, o = {}) {
  const sp = this.skillSpec(e), dur = [0.34, 0.5, 0.72, 0.95][sp.tier];
  if (e.sigPool) e.smana = 0; else e.mana = 0; e.casting = { t0: this.t, until: this.t + dur, sp };
  this.fxp({ k: 'cast', ent: e, col: sp.col, tier: sp.tier, life: dur + 0.3 });
  // one headline banner at a time: only the newest big cast owns the top of the screen
  const ttl = this.fxp({ k: 'ctitle', ent: e, text: sp.n, col: sp.col, tier: sp.tier, side: e.side, life: dur + (sp.tier >= 2 ? 1.1 : 0.8) }); if (sp.tier >= 2) this._bigTitle = ttl;
  for (let i = 0; i < 6 + sp.tier * 6; i++) { const a = Math.random() * Math.PI * 2, r = (90 + Math.random() * 90) * (1 + sp.tier * 0.25); this.fxp({ k: 'charge', x: e.x + Math.cos(a) * r, y: e.y - 44 * e.sz + Math.sin(a) * r * 0.6, tx: e.x, ty: e.y - 44 * e.sz, col: sp.col, t0: this.t + Math.random() * dur * 0.5, life: dur * 0.7 }); }
  if (sp.tier >= 2) { this.slow = Math.max(this.slow || 0, 0.12 + sp.tier * 0.08); this.focus = { ent: e, t0: this.t, until: this.t + dur + 0.25, col: sp.col }; }
  Sfx.cast(); if (sp.tier >= 3) Sfx.whoosh(0.7);
};
P.fireCast = function (e) {
  const sp = e.casting.sp; e.casting = null; e.castPose = this.t;
  this.meter = { total: 0, t: this.t, last: this.t, col: sp.col, n: sp.n };
  if (e.sig) SIG[e.sig].fn(this, e, sp.pw); else this.call(e, 'full');
  this.shake = Math.max(this.shake, [4, 8, 14, 22][sp.tier]);
  this.ring(e.x, e.y - 30 * e.sz, 10, [80, 120, 170, 240][sp.tier] * e.sz, sp.col, 4 + sp.tier * 2, 0.35);
  this.fxp({ k: 'pxburst', x: e.x, y: e.y - 44 * e.sz, col: sp.col, n: 10 + sp.tier * 8, life: 0.55 });
  if (sp.tier >= 2) this.hs = 0.04 + sp.tier * 0.025;
  if (sp.tier >= 3) { this.flash = Math.max(this.flash, 0.3); this.flashCol = sp.col; Sfx.impact(); }
};
const oldDeal = P.deal;
P.deal = function (src, tg, amt, o = {}) {
  const d = oldDeal.call(this, src, tg, amt, o);
  if (d > 0 && o.skill && src && src.side === 'A' && this.meter && this.t - this.meter.last < 1.4) { this.meter.total += d; this.meter.last = this.t; }
  return d;
};
// stacked damage numbers: consecutive hits on the same spot climb in a column
const oldFloat = P.float;
P.float = function (x, y, text, col, size, num) {
  const T = this.t; this._fs = (this._fs || []).filter(s => T - s.t < 0.45);
  const near = this._fs.filter(s => Math.abs(s.x - x) < 46 && Math.abs(s.y - y) < 60).length;
  this._fs.push({ x, y, t: T });
  oldFloat.call(this, x, y - near * 22, text, col, size, num);
};

// ───────── pixel effects ─────────
const add = (ctx, fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };
const sq = (ctx, x, y, s, col) => { ctx.fillStyle = col; const z = Math.max(PX, Math.round(s / PX) * PX); ctx.fillRect(Math.round(x / PX) * PX - z / 2, Math.round(y / PX) * PX - z / 2, z, z); };
const lighten = (c, f) => M.shade(c.slice(0, 7), f);
// 字号阶梯（docs/design.md §11.5）：飘字按最近一阶取，等距取大
const TS = [18, 22, 26, 30, 32, 40, 52, 64], snapT = (v) => TS.reduce((a, b) => (Math.abs(b - v) <= Math.abs(a - v) ? b : a));
// 招牌字：果汁色带（白 → 奶油 → 金 → 琥珀 → 酒红，硬分段）填进像素字形，1 格墨描边；按字 + 字号缓存
const rcache = new Map();
function rampChar(ch, size) {
  const key = ch + '|' + size; let c = rcache.get(key); if (c) return c;
  const P = M.bUI.P, src = M.pxTextCanvas(ch, size, P.white, { ink: P.ink }), bw = src.bw, bh = src.bh, o = M.pxCanvas(bw, bh), x = o.getContext('2d');
  x.drawImage(src, 0, 0, bw, bh); const im = x.getImageData(0, 0, bw, bh), d = im.data, fill = (i) => d[i + 3] && d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255;
  let y0 = bh, y1 = -1; for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < bw; xx++) if (fill((yy * bw + xx) * 4)) { y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
  const RB = [[0.22, P.white], [0.4, P.butter], [0.58, P.gold], [0.78, P.amber], [2, P.wine]].map(([t, h]) => [t, M.hexRgb(h)]);
  for (let yy = y0; yy <= y1; yy++) { const c3 = RB.find(r => (yy - y0 + 0.5) / (y1 - y0 + 1) <= r[0])[1]; for (let xx = 0; xx < bw; xx++) { const i = (yy * bw + xx) * 4; if (fill(i)) { d[i] = c3[0]; d[i + 1] = c3[1]; d[i + 2] = c3[2]; } } }
  x.putImageData(im, 0, 0); c = M.asPx(o);
  if (rcache.size > 120) rcache.delete(rcache.keys().next().value);
  rcache.set(key, c); return c;
}
function drawTitle(ctx, f, T, p) {
  const e = f.ent, big = f.tier >= 2, U = M.bUI, PL = U.P, g2 = U.g2, still = M.PJ && M.PJ.reduced, a = p > 0.8 ? (1 - p) / 0.2 : 1;
  // 出场按 4 步弹一下（1.45 → 0.9 → 1.06 → 1），淡出也按阶
  const pop = p < 0.12 && !still ? [1.45, 0.9, 1.06, 1][Math.min(3, Math.floor(p / 0.03))] : 1, Tq = still ? 0 : Math.floor(T * 12) / 12;
  ctx.save(); ctx.globalAlpha *= Math.ceil(a * 4) / 4;
  if (big) {
    // 招牌横条：我方酒红（上沿红、下沿棕）、敌方红底（上沿粉、下沿酒红），4px 墨框，上下跑马灯；字逐个跳，我方果汁色带、敌方奶油色
    const y = 96, S = f.tier >= 3 ? 72 : 48, foe = f.side === 'E', size = g2(S * pop), chars = [...String(f.text)];
    const glyph = (ch, sz) => (foe ? M.pxTextCanvas(ch, sz, PL.butter, { ink: PL.ink }) : rampChar(ch, sz));
    const tw = chars.reduce((w, ch) => w + glyph(ch, S).width, 0), pw = g2((tw + S) * pop), ph = g2(S + 28), X = g2(960 - pw / 2), Y = g2(y - ph / 2);
    const [bg, hi, lo, rule] = foe ? [PL.red, PL.pink, PL.wine, PL.red] : [PL.wine, PL.red, PL.umber, PL.gold], sk = U.hx(f.col);
    M.pxGlow(ctx, 960, y, pw * 0.7, sk, 0.35 * a);
    const lw = 120 + f.tier * 30, gx = pw / 2 + 12;
    [-1, 1].forEach(sd => { const x0 = sd < 0 ? 960 - gx - lw : 960 + gx; U.box(ctx, x0, y - 3, lw, 6, rule); U.R(ctx, sd < 0 ? 960 - gx - lw * 0.4 : 960 + gx, y - 3, lw * 0.4, 6, sk); });
    U.box(ctx, X, Y, pw, ph, bg, 4); U.R(ctx, X, Y, pw, 6, hi); U.R(ctx, X, Y + ph - 6, pw, 6, lo);
    M.UI.chase(ctx, X + 8, Y - 16, pw - 16, Tq); M.UI.chase(ctx, X + 8, Y + ph + 10, pw - 16, Tq, true);
    let px = 960 - chars.reduce((w, ch) => w + glyph(ch, size).width, 0) / 2;
    chars.forEach((ch, i) => { const c = glyph(ch, size), ink = M.pxTextCanvas(ch, size, PL.ink, { ink: PL.ink }), ph2 = (Tq * 1.25 + (chars.length - i) * 0.12) % 1, dy = still ? 0 : [0, -0.14, 0, 0.05][Math.floor(ph2 * 4)] * size, cy = g2(y + dy - c.height / 2); ctx.drawImage(ink, g2(px), cy + 4, c.width, c.height); ctx.drawImage(c, g2(px), cy, c.width, c.height); px += c.width; });
    for (let i = 0; i < 6; i++) { const q = (Tq * 1.4 + i / 6) % 1, sx = 960 + (i % 2 ? 1 : -1) * (gx + lw * q), sy = y - 18 + Math.sin(i * 2 + Tq * 6) * 14; U.R(ctx, sx - 3, sy - 3, 6, 6, i % 2 ? PL.butter : sk); }
  } else if (e) {
    // 头顶小字：像素字 + 墨描边，调色板色
    const y = e.y - 88 * e.sz - 40 - p * 20;
    U.text(ctx, f.text, e.x, y, g2((f.tier >= 1 ? 30 : 26) * pop), lighten(f.col, 0.25));
  }
  ctx.restore();
}
function drawCast(ctx, f, T, b) {
  const e = f.ent; if (!e || !e.alive) return;
  const d = T - f.t0, p = clamp(d / f.life, 0, 1), grow = eo(Math.min(1, d / 0.25)), fade = p > 0.8 ? (1 - p) / 0.2 : 1;
  const rx = (46 + f.tier * 16) * e.sz * grow, ry = rx * 0.34, x = e.x, y = e.y + 2;
  ctx.save(); ctx.globalAlpha *= fade;
  M.pxGlow(ctx, x, y - 6, rx * 1.3, f.col, 0.55);
  add(ctx, () => {
    M.pxRing(ctx, x, y, rx, ry, f.col, { rot: T * 2, dense: 1.1 });
    M.pxRing(ctx, x, y, rx * 0.72, ry * 0.72, lighten(f.col, 0.35), { rot: -T * 3, gap: 3, dense: 1 });
    if (f.tier >= 1) M.pxRing(ctx, x, y, rx * 1.18, ry * 1.18, f.col, { rot: T, gap: 2, dense: 0.8 });
    const n = 4 + f.tier * 2; for (let i = 0; i < n; i++) { const a = T * 2.5 + i / n * Math.PI * 2; sq(ctx, x + Math.cos(a) * rx * 0.86, y + Math.sin(a) * ry * 0.86, 6, '#ffffff'); }
    for (let i = 0; i < 6 + f.tier * 4; i++) { const q = (d * 1.6 + rnd(i + e.id) ) % 1, px = x + (rnd(i * 3 + e.id) - 0.5) * rx * 1.6, py = y - q * (70 + f.tier * 30) * e.sz; sq(ctx, px, py, q < 0.5 ? 6 : 4, q < 0.3 ? '#ffffff' : f.col); }
    if (f.tier >= 2) { const hgt = 200 * e.sz; ctx.globalAlpha *= 0.35 + 0.2 * Math.sin(T * 30); ctx.fillStyle = f.col; ctx.fillRect(Math.round((x - 10) / PX) * PX, y - hgt, 20, hgt); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round((x - 2) / PX) * PX, y - hgt, 4, hgt); }
  });
  ctx.restore();
}
function drawBoom(ctx, f, T) {
  const d = T - f.t0, p = clamp(d / f.life, 0, 1), r = (f.r || 150), col = f.col || '#ff9a3a', a = 1 - p;
  M.pxGlow(ctx, f.x, f.y, r * (0.7 + 0.5 * eo(p)), col, 0.9 * a);
  add(ctx, () => {
    if (p < 0.25) { ctx.globalAlpha = 1 - p / 0.25; ctx.fillStyle = '#ffffff'; const rr = r * 0.45 * eo(p / 0.25); ctx.beginPath(); ctx.ellipse(f.x, f.y, rr, rr * 0.8, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    M.pxRing(ctx, f.x, f.y, r * eo(p), r * eo(p) * 0.55, col, { dense: 0.7, w: 2 });
    for (let i = 0; i < 16; i++) { const an = rnd(i + f.x) * Math.PI * 2, v = r * (0.6 + rnd(i * 7 + f.y) * 0.8), px = f.x + Math.cos(an) * v * eo(p), py = f.y + Math.sin(an) * v * 0.6 * eo(p) - 60 * Math.sin(p * Math.PI) * rnd(i + 3); sq(ctx, px, py, (1 - p) * 10 + 2, i % 3 ? col : '#fff2c0'); }
  });
  for (let i = 0; i < 5; i++) { const an = rnd(i * 5 + f.x) * Math.PI * 2, px = f.x + Math.cos(an) * r * 0.5 * eo(p), py = f.y - 20 - p * 60 + Math.sin(an) * 20; ctx.globalAlpha = 0.45 * a; sq(ctx, px, py, 18 + p * 20, '#3a3040'); } ctx.globalAlpha = 1;
}
function drawPillar(ctx, f, T) {
  const d = T - f.t0, p = clamp(d / f.life, 0, 1), a = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85, w = (f.w || 60) * (p < 0.15 ? 0.5 + p / 0.3 : 1), col = f.col || '#fff2a0', base = f.y || 640;
  M.pxGlow(ctx, f.x, base - 30, w * 2.2, col, 0.8 * a);
  add(ctx, () => {
    ctx.globalAlpha = a * 0.75; ctx.fillStyle = col; ctx.fillRect(Math.round((f.x - w / 2) / PX) * PX, 0, Math.round(w / PX) * PX, base);
    ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round((f.x - w / 6) / PX) * PX, 0, Math.max(PX * 2, Math.round(w / 3 / PX) * PX), base);
    for (let i = 0; i < 14; i++) { const q = (d * 2 + rnd(i + f.x)) % 1, px = f.x + (rnd(i * 5) - 0.5) * w * 1.8, py = base - q * base; sq(ctx, px, py, 4 + (i % 3) * 2, i % 2 ? '#ffffff' : col); }
    M.pxRing(ctx, f.x, base, w * 1.4 * (0.6 + p), w * 0.45 * (0.6 + p), col, { dense: 0.9, w: 2 });
  });
}
function drawMeteor(ctx, f, T) {
  const d = T - f.t0, p = clamp(d / f.life, 0, 1), q = p * p, x = f.x + 520 * (1 - q), y = f.y - 760 * (1 - q), col = f.col || '#ff8a3a';
  M.pxGlow(ctx, x, y - 20, 110, col, 0.9);
  add(ctx, () => {
    for (let i = 0; i < 14; i++) { const k = i / 14, tx = x + 520 * 0.06 * i * (1 - p * 0.3), ty = y - 20 - 760 * 0.06 * i * (1 - p * 0.3); sq(ctx, tx + (rnd(i + T * 60) - 0.5) * 12, ty, (1 - k) * 22 + 4, i < 3 ? '#fff2c0' : i < 7 ? col : '#8a2a10'); }
    sq(ctx, x, y - 20, 34, '#fff6d0'); sq(ctx, x, y - 20, 22, '#ffffff');
  });
  M.pxRing(ctx, f.x, f.y, 120 * (0.4 + p * 0.6), 40 * (0.4 + p * 0.6), '#ff5a2a', { dense: 0.7 });
}
function drawFrost(ctx, f, T) {
  const d = T - f.t0, p = clamp(d / f.life, 0, 1), r = f.r || 170, a = 1 - p;
  M.pxGlow(ctx, f.x, f.y - 10, r, '#9fe8ff', 0.7 * a);
  add(ctx, () => {
    M.pxRing(ctx, f.x, f.y, r * eo(p * 1.5), r * 0.4 * eo(p * 1.5), '#dff8ff', { dense: 0.9, w: 2 });
    for (let i = 0; i < 14; i++) { const an = i / 14 * Math.PI * 2, rr = r * 0.85 * eo(p * 1.4), px = f.x + Math.cos(an) * rr, py = f.y + Math.sin(an) * rr * 0.4, h = (18 + (i % 3) * 10) * (p < 0.6 ? 1 : a * 2.5); ctx.fillStyle = '#bff4ff'; ctx.fillRect(Math.round(px / PX) * PX - 3, py - h, 6, h); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(px / PX) * PX - 1, py - h, 2, h * 0.6); }
    for (let i = 0; i < 20; i++) { const q = (d * 0.8 + rnd(i)) % 1; sq(ctx, f.x + (rnd(i * 3) - 0.5) * r * 2, f.y - 160 + q * 170, 4, '#ffffff'); }
  });
}
function drawArrowRain(ctx, f, T) {
  const d = T - f.t0, p = clamp(d / f.life, 0, 1), r = f.r || 130;
  M.pxRing(ctx, f.x, f.y, r, r * 0.38, 'rgba(255,224,138,0.7)', { dense: 0.6, gap: 2 });
  add(ctx, () => { for (let i = 0; i < 16; i++) { const st = 0.1 + rnd(i) * 0.5, q = clamp((d - st) / 0.28, 0, 1); if (q <= 0 || q >= 1) continue; const x = f.x + (rnd(i * 7) - 0.5) * r * 1.8, y = f.y + (rnd(i * 11) - 0.5) * r * 0.6 - 380 * (1 - q); ctx.fillStyle = '#f5e6c0'; ctx.fillRect(Math.round(x / PX) * PX - 1, y - 30, 2, 30); ctx.fillStyle = f.col || '#ffe08a'; ctx.fillRect(Math.round(x / PX) * PX - 3, y - 2, 6, 6); } });
}
function drawWhirl(ctx, f, T) {
  const e = f.ent; if (!e) return; const d = T - f.t0, p = clamp(d / f.life, 0, 1), r = f.r || 150, a = 1 - p;
  add(ctx, () => { for (let k = 0; k < 3; k++) { const base = d * 14 + k * 2.1; for (let i = 0; i < 18; i++) { const an = base - i * 0.09, rr = r * (0.7 + k * 0.12); ctx.globalAlpha = a * (1 - i / 18); sq(ctx, e.x + Math.cos(an) * rr, e.y - 30 * e.sz + Math.sin(an) * rr * 0.42, 8 - i * 0.3, i < 3 ? '#ffffff' : f.col); } } });
}
function drawBurst(ctx, f, T) {
  const d = T - f.t0, p = clamp(d / f.life, 0, 1);
  add(ctx, () => { for (let i = 0; i < f.n; i++) { const an = rnd(i + f.x * 0.1) * Math.PI * 2, v = 90 + rnd(i * 3 + f.y) * 170, x = f.x + Math.cos(an) * v * eo(p), y = f.y + Math.sin(an) * v * eo(p) * 0.7 + 60 * p * p; ctx.globalAlpha = 1 - p; sq(ctx, x, y, 8 * (1 - p) + 2, i % 3 ? f.col : '#ffffff'); } });
}
function drawCrack(ctx, f, T) {
  const d = T - f.t0, p = clamp(d / f.life, 0, 1), a = p > 0.7 ? (1 - p) / 0.3 : 1;
  ctx.save(); ctx.globalAlpha *= 0.85 * a; ctx.fillStyle = '#0c0608';
  for (let k = 0; k < 7; k++) { let x = f.x, y = f.y; const an = k / 7 * Math.PI * 2 + rnd(k + f.x); for (let s = 0; s < 9; s++) { x += Math.cos(an + (rnd(s + k * 9) - 0.5)) * 14; y += Math.sin(an + (rnd(s * 3 + k)) - 0.5) * 5; ctx.fillRect(Math.round(x / PX) * PX, Math.round(y / PX) * PX, 4, 4); } }
  if (f.col) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * a * (0.6 + 0.4 * Math.sin(T * 10)); M.pxRing(ctx, f.x, f.y, 60, 20, f.col, { dense: 0.8 }); }
  ctx.restore();
}
function drawRift(ctx, f, T) {
  const d = T - f.t0, p = clamp(d / f.life, 0, 1), a = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8, s = 0.6 + 0.4 * Math.sin(T * 12);
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#12061e'; ctx.beginPath(); ctx.ellipse(f.x, f.y, 34 * s, 70, 0, 0, 7); ctx.fill();
  add(ctx, () => { M.pxRing(ctx, f.x, f.y, 36 * s + 4, 72, '#c890ff', { dense: 1.2, rot: T * 4 }); for (let i = 0; i < 8; i++) { const an = T * 5 + i; sq(ctx, f.x + Math.cos(an) * 46, f.y + Math.sin(an) * 84, 4, '#e0c0ff'); } });
  ctx.restore();
}
function drawRing(ctx, f, T) {
  const d = T - f.t0; if (d < 0) return; const p = clamp(d / f.life, 0, 1), r = f.r0 + (f.r1 - f.r0) * eo(p);
  ctx.save(); ctx.globalAlpha *= 1 - p; add(ctx, () => M.pxRing(ctx, f.x, f.y, r, r * 0.9, f.col && f.col.length >= 7 ? f.col : '#ffffff', { dense: 0.7, w: Math.max(1, Math.round((f.w || 6) / 5)) })); ctx.restore();
}
function drawFloat(ctx, f, T) {
  // 飘字：颜色落到调色板；数字用机台数码（顶两行亮一阶、墨描边），文字用像素字，字号吸附到字号阶梯
  const d = T - f.t0; if (d < 0) return; const p = clamp(d / f.life, 0, 1), y = f.y - 70 * eo(p), U = M.bUI;
  const col = f.col && f.col.length >= 7 ? f.col : '#ffffff';
  ctx.save(); ctx.globalAlpha *= p < 0.7 ? 1 : Math.ceil((1 - (p - 0.7) / 0.3) * 4) / 4;
  const isNum = f.num || /^[+\-]?[\d,.KMB%×]+$/.test(String(f.text));
  if (isNum) { const s = (f.size >= 46 ? 3 : f.size >= 30 ? 2 : 1) + (d < 0.1 ? 1 : 0); U.num(ctx, String(f.text), f.x, y, col, s); }
  else U.text(ctx, String(f.text), f.x, y, U.g2(snapT(f.size) * (d < 0.1 ? 1.25 : 1)), col);
  ctx.restore();
}
M.drawFxPx = function (ctx, f, T, b) {
  if (!M.pixelMode) return false;
  const d = T - f.t0; if (d < 0) return true;
  switch (f.k) {
    case 'cast': drawCast(ctx, f, T, b); return true;
    case 'ctitle': if (f.tier >= 2 && b && b._bigTitle && b._bigTitle !== f) return true; drawTitle(ctx, f, T, clamp(d / f.life, 0, 1)); return true;
    case 'pxboom': drawBoom(ctx, f, T); return true;
    case 'boom': drawBoom(ctx, { x: f.x, y: f.y, t0: f.t0, life: f.life, col: f.col || '#ff9a3a', r: 150 }, T); return true;
    case 'pxpillar': drawPillar(ctx, f, T); return true;
    case 'pillar': drawPillar(ctx, { x: f.x, t0: f.t0, life: f.life, col: f.col, w: f.w, y: 700 }, T); return true;
    case 'pxmeteor': drawMeteor(ctx, f, T); return true;
    case 'meteor': drawMeteor(ctx, { x: f.x, y: f.y, t0: f.t0, life: f.life * 0.6, col: '#ff8a3a' }, T); return true;
    case 'frost': drawFrost(ctx, f, T); return true;
    case 'arrowrain': drawArrowRain(ctx, f, T); return true;
    case 'whirl': drawWhirl(ctx, f, T); return true;
    case 'pxburst': drawBurst(ctx, f, T); return true;
    case 'crack': drawCrack(ctx, f, T); return true;
    case 'rift': drawRift(ctx, f, T); return true;
    case 'ring': drawRing(ctx, f, T); return true;
    case 'float': drawFloat(ctx, f, T); return true;
  }
  return false;
};
// HUD inside the field: skill focus vignette + running skill-damage counter (top right)
M.drawBattleHudPx = function (ctx, b, T) {
  if (!M.pixelMode) return;
  const U = M.bUI, PL = U.P;
  // 技能聚焦：墨色硬边色带暗角，按 3 阶渐入渐出
  const fo = b.focus; if (fo && T < fo.until && fo.ent.alive) { const e = fo.ent, k = Math.ceil(clamp(Math.min(T - fo.t0, fo.until - T) / 0.15, 0, 1) * 3) / 3; if (k > 0) { ctx.fillStyle = M.UI.rg(ctx, e.x, e.y - 50, 80, 900, [[0, 'rgba(7,6,15,0)'], [1, 'rgba(7,6,15,' + (0.55 * k).toFixed(2) + ')']], 5); ctx.fillRect(0, 0, FW, FH); } }
  // 技能伤害计：夜蓝机箱小面板（4px 墨框、斜面、8px 硬投影），红字机台数码，按阶淡出（不加文字标签，数字自己说明）
  const m = b.meter; if (m && m.total > 0 && T - m.last < 1.6) {
    const a = Math.ceil(clamp((1.6 - (T - m.last)) / 0.4, 0, 1) * 4) / 4, pop = T - m.last < 0.1 && !(M.PJ && M.PJ.reduced) ? 1 : 0, str = '+' + fmt(m.total);
    const dw = M.pxNumCanvas(str, PL.red, { ink: PL.ink, hl: PL.pink }).width * 3, W = U.g2(dw + 32), H = 76, X = 1888 - W, Y = 36;
    ctx.save(); ctx.globalAlpha *= a;
    U.R(ctx, X + 4, Y + 4, W + 8, H + 8, PL.ink); U.box(ctx, X, Y, W, H, PL.night, 4); U.R(ctx, X, Y, W, 2, PL.dusk); U.R(ctx, X, Y, 2, H, PL.dusk); U.R(ctx, X, Y + H - 4, W, 4, PL.abyss); U.R(ctx, X + W - 2, Y, 2, H, PL.abyss);
    U.num(ctx, str, 1872, Y + H / 2 + 6, PL.red, 3 + pop, { align: 'right', hl: PL.pink });
    ctx.restore(); }
};

// ───────── post-process: keep pixels crisp ─────────
const oh = M.hd2d;
M.hd2d = function (ctx, W, H, o = {}) { if (M.pixelMode) o = Object.assign({}, o, { dof: 0, bloom: (o.bloom == null ? 0.55 : o.bloom) * 0.5, vig: (o.vig == null ? 0.6 : o.vig) * 0.75, gradeA: (o.gradeA || 0.3) * 0.7 }); return oh(ctx, W, H, o); };

// ───────── pixel backdrops per world (art resolution, cached) ─────────
const bcache = {};
function backdrop(R) {
  const key = R.n; if (bcache[key]) return bcache[key];
  const AW = Math.round((FW + 80) / PX), AH = Math.round((FH + 80) / PX), c = M.pxCanvas(AW, AH), x = c.getContext('2d');
  const sky = 104, hz = sky; const sh = M.shade, bg = R.bg, tile = R.tile, light = R.light, road = R.road || R.tile;
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  // sky: dithered bands from deep night to a lit horizon
  const top = sh(bg, -0.35), mid = sh(bg, 0.25), hor = sh(light, -0.55);
  for (let yy = 0; yy < sky; yy++) { const t = yy / sky; for (let xx = 0; xx < AW; xx++) { const th = BAY[(yy % 4) * 4 + (xx % 4)] / 16, v = t * 3 + th * 0.9, band = Math.min(2, Math.floor(v)); x.fillStyle = band === 0 ? top : band === 1 ? mid : hor; x.fillRect(xx, yy, 1, 1); } }
  for (let i = 0; i < 140; i++) { const sx = Math.floor(rnd(i) * AW), sy = Math.floor(rnd(i + 50) * sky * 0.8); x.fillStyle = i % 9 === 0 ? '#ffffff' : i % 3 ? 'rgba(255,255,255,0.55)' : sh(light, 0.3); x.fillRect(sx, sy, i % 17 === 0 ? 2 : 1, i % 17 === 0 ? 2 : 1); }
  // moon
  const mx = 760 + Math.floor(rnd(R.n.length) * 120), my = 22, mr = 13;
  for (let yy = -mr; yy <= mr; yy++) for (let xx = -mr; xx <= mr; xx++) { const dd = Math.hypot(xx, yy); if (dd > mr) continue; x.fillStyle = dd > mr - 1.5 ? '#c8b890' : (xx + yy * 0.6 > 4 ? '#e0d0a0' : '#f5e8c0'); x.fillRect(mx + xx, my + yy, 1, 1); }
  [[-4, -3, 3], [5, 2, 2], [-2, 6, 2], [4, -6, 1.5]].forEach(([a, b2, r]) => { x.fillStyle = '#d0bf92'; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (Math.hypot(xx, yy) <= r) x.fillRect(mx + a + xx, my + b2 + yy, 1, 1); });
  for (let r = mr + 2; r < mr + 20; r += 2) { x.fillStyle = 'rgba(245,232,192,' + (0.07 * (1 - (r - mr) / 20)) + ')'; x.beginPath(); x.arc(mx, my, r, 0, 7); x.fill(); }
  // far mountains, then world silhouettes
  const ridge = (base, amp, fr, col, ph) => { x.fillStyle = col; for (let xx = 0; xx < AW; xx++) { const h = base - Math.abs(Math.sin(xx * fr + ph)) * amp - Math.sin(xx * fr * 3.1 + ph * 2) * amp * 0.25; x.fillRect(xx, Math.round(h), 1, sky - Math.round(h) + 2); } };
  ridge(sky - 18, 26, 0.011, sh(bg, 0.12), 1.3); ridge(sky - 8, 16, 0.019, sh(bg, -0.05), 4.1);
  const far = sh(bg, -0.25), glow = sh(light, -0.2), n = R.n;
  const rect = (a, b2, w, h) => x.fillRect(a, b2, w, h);
  x.fillStyle = far;
  if (/小镇|走廊/.test(n)) { for (let i = 0; i < 22; i++) { const bx = i * 46 + Math.floor(rnd(i) * 20), bw = 22 + Math.floor(rnd(i + 3) * 18), bh = 18 + Math.floor(rnd(i + 5) * 26); rect(bx, sky - bh, bw, bh); for (let k = 0; k < bw / 2; k++) rect(bx + k, sky - bh - k * 0.8, bw - 2 * k, 1); x.fillStyle = rnd(i + 9) < 0.35 ? glow : far; rect(bx + 5, sky - bh + 6, 3, 4); x.fillStyle = far; } }
  if (/森/.test(n)) { for (let i = 0; i < 70; i++) { const tx = i * 15 + Math.floor(rnd(i) * 8), th = 26 + Math.floor(rnd(i + 2) * 30); for (let k = 0; k < th; k++) rect(tx - Math.floor(k * 0.3) + 6, sky - k, Math.floor(k * 0.6) + 1, 1); rect(tx + 5, sky - 2, 2, 4); } }
  if (/游乐园/.test(n)) { const fx = 320, fy = sky - 40; for (let a = 0; a < 64; a++) { const an = a / 64 * Math.PI * 2; rect(Math.round(fx + Math.cos(an) * 34), Math.round(fy + Math.sin(an) * 34), 2, 2); } for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2; for (let s = 0; s < 34; s += 2) rect(Math.round(fx + Math.cos(an) * s), Math.round(fy + Math.sin(an) * s), 1, 1); } rect(fx - 1, fy, 3, 42); for (let i = 0; i < 9; i++) { const tx = 520 + i * 48, th = 18 + (i % 3) * 8; for (let k = 0; k < th; k++) rect(tx - k, sky - th + k, k * 2 + 1, 1); } }
  if (/港口/.test(n)) { for (let i = 0; i < 8; i++) { const mx2 = 60 + i * 120 + Math.floor(rnd(i) * 40); rect(mx2, sky - 60, 2, 60); rect(mx2 - 16, sky - 50, 34, 2); rect(mx2 - 10, sky - 38, 22, 2); rect(mx2 - 30, sky - 8, 62, 8); } }
  if (/铸造/.test(n)) { for (let i = 0; i < 12; i++) { const cx = i * 84 + 20, ch = 40 + Math.floor(rnd(i) * 30); rect(cx, sky - ch, 10, ch); rect(cx - 30, sky - 26, 70, 26); x.fillStyle = glow; rect(cx - 20, sky - 18, 5, 4); rect(cx + 14, sky - 18, 5, 4); x.fillStyle = far; } }
  if (/医院/.test(n)) { for (let i = 0; i < 9; i++) { const bx = i * 110, bh = 40 + Math.floor(rnd(i) * 26); rect(bx, sky - bh, 90, bh); for (let wy = sky - bh + 5; wy < sky - 6; wy += 8) for (let wx = bx + 6; wx < bx + 84; wx += 10) { x.fillStyle = rnd(wx + wy) < 0.18 ? '#c0e8ff' : sh(bg, -0.12); rect(wx, wy, 4, 4); } x.fillStyle = far; } }
  if (/星舰/.test(n)) { x.beginPath(); x.moveTo(200, sky); x.lineTo(380, sky - 70); x.lineTo(560, sky - 60); x.lineTo(700, sky); x.fill(); for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#8ff6ff' : far; rect(300 + i * 30, sky - 40 + (i % 3) * 6, 4, 3); } }
  if (/地狱/.test(n)) { x.fillStyle = far; x.beginPath(); x.moveTo(420, sky); x.lineTo(500, sky - 70); x.lineTo(540, sky - 70); x.lineTo(620, sky); x.fill(); for (let i = 0; i < 40; i++) { const sx = i * 25 + Math.floor(rnd(i) * 10), h = 10 + Math.floor(rnd(i + 1) * 22); for (let k = 0; k < h; k++) rect(sx + Math.floor(k / 3), sky - h + k, Math.max(1, Math.floor(k / 1.5)), 1); } x.fillStyle = '#ff5a2a'; for (let i = 0; i < 30; i++) rect(500 + Math.floor(rnd(i) * 40), sky - 70 + Math.floor(rnd(i + 4) * 8), 2, 2); }
  if (/赌场/.test(n)) { for (let i = 0; i < 14; i++) { const bx = i * 70, bh = 30 + Math.floor(rnd(i) * 40); rect(bx, sky - bh, 60, bh); x.fillStyle = ['#ffcc33', '#ff4a8a', '#4af0ff'][i % 3]; rect(bx + 8, sky - bh + 6, 44, 3); x.fillStyle = far; } }
  // ground: tiles with dithered noise and a lit horizon seam
  for (let yy = hz; yy < AH; yy++) for (let xx = 0; xx < AW; xx++) { const th = BAY[(yy % 4) * 4 + (xx % 4)] / 16, n2 = rnd(xx * 0.37 + yy * 91.7), t = (yy - hz) / (AH - hz), v = n2 * 0.55 + th * 0.45; x.fillStyle = v > 0.82 ? sh(tile, 0.14) : v < 0.12 ? sh(tile, -0.22) : t < 0.08 ? sh(road, 0.1) : tile; x.fillRect(xx, yy, 1, 1); }
  x.fillStyle = sh(light, -0.35); x.fillRect(0, hz, AW, 1); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, hz + 1, AW, 3);
  x.fillStyle = sh(tile, -0.28); for (let yy = hz + 22; yy < AH; yy += 26) { x.fillRect(0, yy, AW, 1); for (let xx = (yy / 26 % 2) * 26; xx < AW; xx += 52) x.fillRect(xx, yy - 25, 1, 25); }
  for (let i = 0; i < 90; i++) { const gx = Math.floor(rnd(i + 200) * AW), gy = hz + 6 + Math.floor(rnd(i + 300) * (AH - hz - 8)); x.fillStyle = i % 4 ? sh(tile, 0.22) : sh(light, -0.3); x.fillRect(gx, gy, 2, 1); x.fillRect(gx + (i % 2 ? 1 : 0), gy - 1, 1, 1); }
  const g = x.createRadialGradient(AW / 2, AH * 0.6, AH * 0.2, AW / 2, AH * 0.6, AW * 0.62); g.addColorStop(0, 'rgba(255,230,190,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.4)'); x.fillStyle = g; x.fillRect(0, hz, AW, AH - hz);
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, hz, 100, AH - hz);
  return (bcache[key] = M.asPx(c));
}
M.pxBackdrop = backdrop;
const oldFloor = M._drawFloor;
M._drawFloor = function (ctx, region) { if (!M.pixelMode) return oldFloor(ctx, region); ctx.drawImage(backdrop(region), -40, -40); };
})();

;
