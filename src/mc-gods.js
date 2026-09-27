// ==== mc-gods.js ====
(function () {
// The religion becomes a patron god (user ruling 2026-09-26: 「宗教也是这个情况，给个强化……宗教还给重新设计一下，别让宗教跟繁荣度
// 一样了」, plan confirmed the same day). 繁荣度 is breadth — two random wonders every level; the religion is depth — one god,
// chosen once, and a fixed road of five blessings walked with the faith.
// · 神龛 (a cabinet part, mc-parts.js) lets the faith rooms drop; the day the first one stands, three gods (of five) are
//   offered, each card with all five blessings. The choice holds for the whole game.
// · Faith fills the next blessing on its own (20 / 40 / 60 / 90 / 120): a ceremony, no card to pick. Before the main base
//   the god's statue grows with every level: small and grey at first, bronze and glowing at the end.
// · The old doctrines (n choose 1 from each faith room) are gone; faith already spent on them comes back.
const M = window.MC, G = M.Game.prototype, BP = M.Battle3.prototype, S = M.Sfx, U = M.UI, P = M.PJ.PAL, DB = M.DB, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = Math.random;
const L_ = (t, base, run, fx) => ({ t, base: base || null, run: run || null, fx: fx || null });
const GODS = M.GODS = {
  war:     { n: '战神', c: '#ff5a4a', icon: 'Berserker_T6', mat: 'bronze', d: '部队越打越凶。', lv: [
    L_('部队攻击 +8%。', null, { unitAtk: 0.08 }), L_('精英战和首领战开局，部队攻速 +50%，持续 8 秒。', null, null, 'haste'), L_('部队攻击再 +8%。', null, { unitAtk: 0.08 }),
    L_('驻军攻击 +20%。', { defDmg: 0.2 }), L_('部队暴击率 +15%。', null, { crit: 0.15 })] },
  moon:    { n: '月神', c: '#9fc8ff', icon: 'DarkFang_T6', mat: 'stone', d: '夜里守得更稳。', lv: [
    L_('驻军生命 +10%。', { garHp: 0.1 }), L_('领袖屋顶的箭 +30%。', null, null, 'roof'), L_('驻军攻击 +15%。', { defDmg: 0.15 }),
    L_('主基地耐久 +25%。', { portalHp: 0.25 }), L_('夜里倒下的驻军，一半会在月光下站起来再打。', null, null, 'rise')] },
  death:   { n: '冥神', c: '#b86bff', icon: 'Mage_T6', mat: 'stone', d: '倒下不是结束。', lv: [
    L_('部队倒下时有 20% 化成幽灵，再打 6 秒。', null, null, 'ghost'), L_('出征失败时经验全部留下。', { failExp: 0.5 }), L_('化成幽灵的概率变成 40%。', null, null, 'ghost'),
    L_('首领战开场，首领停顿 3 秒。', { bossStun: 3 }), L_('每局一次：出征失败不扣基地核心的心。', null, null, 'save')] },
  fate:    { n: '命运神', c: '#ffcf4a', icon: 'JadeBeast_T6', mat: 'bronze', part: 'fever', d: 'FEVER 来得更多、更狠。', lv: [
    L_('FEVER 槽涨得快 15%。', null, { feverRate: 0.15 }), L_('每场开局 FEVER 槽已经有 20%。', null, { feverStart: 0.2 }), L_('FEVER 槽再涨得快 15%。', null, { feverRate: 0.15 }),
    L_('每场开局 FEVER 槽再多 20%。', null, { feverStart: 0.2 }), L_('FEVER 的闪电伤害翻倍。', null, null, 'bolt')] },
  harvest: { n: '丰收神', c: '#9cff7a', icon: 'LifeTree_T6', mat: 'bronze', d: '基地越来越富。', lv: [
    L_('每天多产 15 物资。', { supplyDaily: 15 }), L_('出征带回的物资 +25%。', { lootSup: 0.25 }), L_('挖掘费用 -30%。', { digCost: -0.3 }),
    L_('每天多产 25 物资。', { supplyDaily: 25 }), L_('每守住一晚，繁荣度多涨一截。', null, null, 'pros')] },
};
M.GOD_NEED = [20, 40, 60, 90, 120];
const godOf = M.godOf = (m) => (m && m.god && GODS[m.god]) || null;
const lvOf = M.godLv = (m) => (m && m.god ? cl(m.godLv | 0, 0, 5) : 0);
const has = (m, fx) => { const g = godOf(m); if (!g) return 0; let n = 0; for (let i = 0; i < lvOf(m); i++) if (g.lv[i].fx === fx) n++; return n; };
M.godHas = has;
const cur = () => (M._g && M._g.meta) || null;
// the old religion's numbers: a level costs what the next blessing costs; its doctrines are gone
M.REL_NEED = (lv) => M.GOD_NEED[Math.min(4, lv || 0)] || 999;
M.relDoc = () => null;
const godFix = (m) => {
  if (!m || m.godV === 1) return; const R = M.relOf ? M.relOf(m) : { lv: 0, picks: [] };
  let back = 0; for (let i = 0; i < (R.lv || 0); i++) back += 20 + 10 * i; if (back) m.faith = (m.faith || 0) + back;
  m.rel = { lv: 0, picks: [] }; m.godV = 1;
};

// ───────── what the blessings do ─────────
const addM = (o, x) => { if (x) Object.keys(x).forEach(k => { o[k] = (o[k] || 0) + x[k]; }); };
const oBM = M.baseMods;
M.baseMods = function (m) { const o = oBM.apply(this, arguments), g = godOf(m); if (g) for (let i = 0; i < lvOf(m); i++) addM(o, g.lv[i].base); if (o.digCost) o.digCost = Math.max(-0.8, o.digCost); return o; };
const oNR = M.newRun3;
M.newRun3 = function (meta) { const run = oNR.apply(this, arguments), g = godOf(meta); if (run && g && !(run.region && run.region.tut)) for (let i = 0; i < lvOf(meta); i++) addM(run.mods, g.lv[i].run); return run; };
// 战神 · haste at the start of an elite or boss fight
const oInit = BP.init;
BP.init = function (run, cfg) {
  const r = oInit.apply(this, arguments), m = run && run.M;
  if (m && has(m, 'haste') && cfg && (cfg.type === 'elite' || cfg.type === 'boss')) this.later((this.fightT0 || 0) + 0.1, () => { this.ents.forEach(e => { if (e.alive && e.side === 'A' && !e.isHero && e.buffs) e.buffs.push({ as: 0.5, until: this.t + 8, col: '#ff5a4a' }); }); this.float(960, 150, '战神 · 狂热', '#ff5a4a', 44); });
  return r;
};
// 冥神 · the fallen come back as ghosts for a little while
const oKill = BP.kill;
BP.kill = function (e, src) {
  const was = e && e.alive, r = oKill.apply(this, arguments), m = this.run && this.run.M, n = m ? has(m, 'ghost') : 0;
  if (n && was && !e.alive && e.side === 'A' && !e.isHero && !e.summon && !e.ghost && rnd() < (n >= 2 ? 0.4 : 0.2) && this.summon) {
    const k = e.kind || e.key, gh = k && this.summon(k, 'A', e.x, e.y, 6); if (gh) { gh.ghost = 1; gh.hp = gh.maxHp = Math.max(1, e.maxHp * 0.6); gh.atk = e.atk; gh.tint = '#b86bff'; this.float(e.x, e.y - 110, '冥神 · 幽灵', '#b86bff', 26); }
  }
  return r;
};
// 冥神 · one lost expedition a game costs no heart (mc-revive.js asks)
M.godSave = (m) => !!(m && has(m, 'save') && !m.godSaved);
// 命运神 · the lightning hits twice as hard (mc-feverstage.js asks M.feverPow)
const oFP = M.feverPow; M.feverPow = (b) => (oFP ? oFP(b) : 1) * (b && b.run && b.run.M && has(b.run.M, 'bolt') ? 2 : 1);
// 月神 · the roof's arrows, and the fallen garrison standing up again
const NR = M.NightRaid;
if (NR) {
  M.NightRaid = class extends NR {
    constructor(meta) { super(meta); if (this.roof && has(meta, 'roof')) this.roof.dmg *= 1.3; this.godRise = has(meta, 'rise') > 0; }
    damage(e, d, col) { const alive = e && e.alive, r = super.damage(e, d, col); if (this.godRise && alive && !e.alive && e.side === 'A' && e.gar && !e.risen && rnd() < 0.5) { e.risen = 1; this.pendRise = (this.pendRise || []).concat([{ e, at: this.t + 2.5 }]); } return r; }
    step(dt) { super.step(dt); if (this.pendRise && this.pendRise.length && !this.over) this.pendRise = this.pendRise.filter(p => { if (this.t < p.at) return true; p.e.alive = true; p.e.hp = p.e.max * 0.5; this.float(p.e.x, p.e.y - 110, '月神 · 站起来', '#9fc8ff', 28); return false; }); }
  };
}
// 丰收神 · every night held counts for more 繁荣度
const oPros = M.prosperity;
M.prosperity = function (m) { const p = oPros.apply(this, arguments); return p + (m && has(m, 'pros') ? ((m.st && m.st.raidsWon) || 0) * 12 : 0); };

// ───────── choosing the god, and its road ─────────
const offer = (m) => { const pool = Object.keys(GODS).filter(k => !GODS[k].part || !M.hasPart || M.hasPart(GODS[k].part)), out = []; while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]); return out; };
G.relOpen = function () {
  const m = this.meta; godFix(m);
  if (!m.god) { this.relPick = { god: 1, ks: offer(m), at: now() }; S.fanfare && S.fanfare(); this.bump(); return; }
  this.godUp();
};
G.relTake = function (i) {
  const m = this.meta, P = this.relPick; if (!P || now() - P.at < 500) return;
  if (P.god) { const k = P.ks[i]; if (!GODS[k]) return; m.god = k; m.godLv = 0; if (M.relOf) M.relOf(m).lv = 0; this.relPick = null; this.save();
    this.banner && this.banner({ kind: 'win', text: '守护神 · ' + GODS[k].n, col: GODS[k].c, col2: '#1a1640', sub: GODS[k].d, life: 2.2, y: 440 }); S.up && S.up(3); this.bump(); return; }
};
// a blessing: the faith pays for it, the statue grows, the words come up
G.godUp = function () {
  const m = this.meta, g = godOf(m), lv = lvOf(m); if (!g || lv >= 5) return;
  const need = M.GOD_NEED[lv]; if ((m.faith || 0) < need) return;
  this.hold && this.hold('mfa', m.faith || 0); m.faith -= need; this.release && this.release('mfa');
  m.godLv = lv + 1; if (M.relOf) M.relOf(m).lv = m.godLv; this.save();
  const B = g.lv[lv]; this.banner && this.banner({ kind: 'win', text: g.n + ' Lv' + m.godLv, col: g.c, col2: '#1a1640', sub: B.t, life: 2.2, y: 440 });
  S.up && S.up(3); S.bell ? S.bell() : S.fanfare && S.fanfare(); this.godGlowT = now(); if (this.townSync) this.townSync(true); this.bump();
};
const busy = (g) => g.relPick || g.dirPick || g.dirFx || g.expand || g.modal || g.visit || g.raid || g.raidPrep || g.rite || g.tear || g.lvFx || g.lvPick || g.homeQ || g.night || g.evoFx || g.parade;
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), m = this.meta;
  if (m && this.screen === 'base' && !busy(this)) { godFix(m);
    if (M.faithOn && M.faithOn(m) && !m.god) this.relOpen();
    else if (godOf(m) && lvOf(m) < 5 && (m.faith || 0) >= M.GOD_NEED[lvOf(m)]) this.godUp(); }
  return r;
};
// the cards: the god's statue, its name, all five blessings
const statC = {};
const statuePic = (k, px) => {
  const g = GODS[k], ck = k + '|' + px; if (statC[ck]) return statC[ck]; let src = null;
  try { src = M.P16 && M.P16.spec && M.P16.spec(g.icon) ? M.P16.img(g.icon, 'idle', 0, null, 96) : M.spriteCanvas(g.icon, 4); } catch (e) { src = null; }
  if (!src) return null; const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.drawImage(src, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height), d = im.data, lo = g.mat === 'bronze' ? [74, 44, 20] : [52, 48, 64], hi = g.mat === 'bronze' ? [255, 216, 144] : [226, 222, 236];
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 40) continue; const L = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255, q = Math.round(Math.min(1, L * 1.3) * 4) / 4; for (let j = 0; j < 3; j++) d[i + j] = Math.round(lo[j] + (hi[j] - lo[j]) * q); }
  x.putImageData(im, 0, 0); c.cx = src.cx != null ? src.cx : c.width / 2; c.footY = src.footY != null ? src.footY : c.height; return (statC[ck] = c);
};
M.godStatue = statuePic;
const oView = G.view;
G.view = function () {
  // the old religion's card code would read a doctrine pick: it does not see the god pick
  const P = this.relPick, m = this.meta; this.relPick = null; let v; try { v = oView.call(this); } finally { this.relPick = P; }
  v.relOn = !!P && this.screen === 'base';
  if (v.relOn && P && P.god) { const ready = now() - P.at > 500;
    v.rp = { title: '选一位守护神', line: '选定后，这一局都跟着它', cards: P.ks.map((k, i) => { const g = GODS[k], im = statuePic(k); return { img: im ? im.toDataURL() : '', iw: 120, ih: 120, t: g.n, n: g.d, c: g.c, hasList: true, list: g.lv.map((b, j) => ({ t: 'Lv' + (j + 1) + '　' + b.t, c: j === 4 ? g.c : '#e8dcc4' })), op: ready ? 1 : 0.6, onPick: () => this.relTake(i) }; }) }; }
  if (v.b && v.b.res && m && godOf(m)) { const r = v.b.res.find(x => x.fx === 'mfa'); if (r) { r.hasSub = lvOf(m) < 5; r.sub = lvOf(m) < 5 ? '/' + M.GOD_NEED[lvOf(m)] : ''; } }
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) {
  const t = oTip.apply(this, arguments), m = this.meta, g = godOf(m);
  if (t && g && /faith|mfa|信仰/.test(key + (t.title || ''))) { t.title = g.n + ' Lv' + lvOf(m); t.c = g.c; t.d = g.d; t.lines = g.lv.map((b, j) => ({ t: 'Lv' + (j + 1) + ' ' + b.t, c: j < lvOf(m) ? '#e8dcc4' : '#6a6394' })); }
  return t;
};
// the statue before the main base: small and grey at Lv0, bigger and warmer with every blessing, glowing at Lv5
M.BASE_HOOKS && M.BASE_HOOKS.push(function (ctx, meta, bv, lights, phase) {
  if (phase !== 'surface' || !godOf(meta)) return; const k = meta.god, im = statuePic(k); if (!im) return;
  const lv = lvOf(meta), sc = 0.5 + 0.08 * lv, x = M.BASE_GEO.DOOR_X - M.MAIN_BASE.w / 2 - 46, y = -2, g = M._g, T = now() / 1000;
  ctx.save(); ctx.fillStyle = P.ink; ctx.fillRect(x - 40, y - 22, 80, 22); ctx.fillStyle = '#5b5260'; ctx.fillRect(x - 36, y - 20, 72, 18); ctx.fillStyle = '#a6a2b5'; ctx.fillRect(x - 36, y - 20, 72, 3);
  ctx.translate(Math.round(x), y - 20); ctx.scale(sc, sc); ctx.imageSmoothingEnabled = false; ctx.drawImage(im, -im.cx, -im.footY); ctx.restore();
  if (lv >= 4 || (g && g.godGlowT && now() - g.godGlowT < 1500)) lights && lights.push({ x, y: y - 60 * sc, r: 180 + 20 * Math.sin(T * 3), c: GODS[k].c, f: 1 });
});
if (M.GUIDE) { const i = M.GUIDE.findIndex(x => x && x.id === 'religion'); if (i >= 0) M.GUIDE.splice(i, 1); }
if (M.GUIDE) M.GUIDE.push({ id: 'god', cat: '基地', icon: 'u_star', title: '守护神', line: '有信仰以后选一位神，信仰值攒够就自动升一级。', scr: 'base', sel: '[data-fx="mfa"]', when: (g) => !!godOf(g.meta) });
})();
