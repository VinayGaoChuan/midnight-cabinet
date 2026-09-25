// ==== mc-soul.js ====
(function () {
// Soul shards are the high-end material now: epic / legendary rooms and fine-forged relics cost them.
// Recruiting a leader costs supplies. Fallen leaders are the main source of shards (a modest amount each),
// and base defence is where weak leaders are spent: whoever falls there is gone for good, and the night pays out by grade.
const M = window.MC, G = M.Game.prototype, Q = M.QUALITY, S = M.Sfx;
const now = () => performance.now();

// ───────── costs ─────────
M.RECRUIT_SUP = 120;
M.recruitCost = (m) => Math.max(40, M.RECRUIT_SUP + ((M.perks && M.perks().recruitCost) || 0));
M.buildShards = (B) => (B ? [0, 0, 30, 60][B.q] || 0 : 0);
M.FINE_SH = 40;
M.deathShards = function (h, m) {
  const md = M.heroMods(h, m), bm = m ? M.baseMods(m) : {};
  return Math.round((8 + 4 * h.lv + 6 * (h.rarity || 0)) * (1 + (md.deathShards || 0) + (bm.deathShards || 0)));
};
const expSpent = (h) => { let v = h.exp; for (let l = 1; l < h.lv; l++) v += M.expNeed(l); return v; };

// epic / legendary rooms also take shards
const oBO = M.buildOptions;
M.buildOptions = function (m, c, r) {
  const list = oBO.call(this, m, c, r);
  list.forEach(o => { o.sh = M.buildShards(o.B); if (!o.why && o.sh && m.shards < o.sh) o.why = '灵魂碎片不足'; });
  return list.sort((a, b) => (a.why ? 1 : 0) - (b.why ? 1 : 0) || b.B.q - a.B.q);
};
const oSB = M.startBuild;
M.startBuild = function (m, c, r, key) {
  const o = M.buildOptions(m, c, r).find(x => x.key === key), ok = oSB.call(this, m, c, r, key);
  if (ok && o && o.sh) m.shards -= o.sh;
  return ok;
};

// fine forging: shards buy a relic of at least epic quality
const oFO = G.forgeOf;
G.forgeOf = function (c, r) { const f = oFO.call(this, c, r); if (this._fine) f.minQ = 2; return f; };
const oCR = M.craftRelic3;
M.craftRelic3 = function (meta, key, forge) {
  const res = oCR.call(this, meta, key, forge), mq = forge && forge.minQ;
  if (mq && res && res.r && res.r.q < mq) { [res.r, res.twin].forEach(x => { if (x) { x.q = mq; x.lines = M.relicLines(key, mq); } }); res.landQ = Math.max(res.landQ, mq); }
  return res;
};
const oCraft = G.craft;
G.craft = function (key, c, r) {
  const m = this.meta; if (!this.fineOn) return oCraft.call(this, key, c, r);
  if (m.shards < M.FINE_SH) { this.toast('灵魂碎片不足：精铸要 ' + M.FINE_SH + ' 碎片', '#d0453c'); return; }
  const s0 = m.supplies; this._fine = 1; try { oCraft.call(this, key, c, r); } finally { this._fine = 0; }
  if (m.supplies < s0) { this.hold('msh', m.shards); m.shards -= M.FINE_SH; this.release('msh'); this.save(); }
};

// ───────── base defence ─────────
// a leader falling in base defence: gone for good, leaves shards and orbs; relics go back to the vault; the core is not hurt
M.raidFall = function (m, h) {
  const md = M.heroMods(h, m), sh = M.deathShards(h, m), orb = Math.round(expSpent(h) * 0.4 * (1 + (md.deathOrbs || 0)));
  m.heroes = m.heroes.filter(x => x !== h); m.graveyard.push({ name: h.name, cls: h.cls, lv: h.lv, day: m.day, raid: 1 });
  m.shards += sh; m.orbs += orb; return { h, sh, orb };
};
const oSR = G.startRaid;
G.startRaid = function () {
  const m = this.meta;
  if (!this.raidGo && m.heroes.length) {
    // pick the defenders first: weak (普通 / 稀有) leaders are ticked by default
    const low = m.heroes.filter(h => (h.rarity || 0) <= 1), sel = {}; (low.length ? low : m.heroes).forEach(h => { sel[h.id] = true; });
    this.raidPrep = { sel }; m.raidPending = m.day; this.save(); this.panel = null; this.openPanel({ kind: 'raidPrep' }); this.bv.focusDoor && this.bv.focusDoor(); M.Sfx.alarm();
    this.banner({ kind: 'win', text: '混沌来袭！', col: '#ff5a4a', col2: '#6a0a0a', sub: '选出今晚守城的领袖。', life: 1.8, y: 440 });
    return;
  }
  this.raidGo = false; const pr = this.raidPrep; this.raidPrep = null; m.raidPending = null;
  oSR.call(this); const R = this.raid; if (!R) return;
  if (pr) R.ents = R.ents.filter(e => !e.hero || pr.sel[e.hero.id]);
  R.portal0 = R.portal.hp; R.defenders = R.ents.filter(e => e.hero).length;
};
// setting off needs the loadout panel (the raid prep, or anything else, may have kept it from opening)
const oLaunch = G.launch;
G.launch = function () { if (!this.panel || this.panel.kind !== 'loadout') return; return oLaunch.apply(this, arguments); };
G.raidLaunch = function () { if (!this.raidPrep) return; M.Sfx.click(); this.raidGo = true; this.panel = null; this.startRaid(); };
G.raidToggle = function (id) { const pr = this.raidPrep; if (!pr) return; pr.sel[id] = !pr.sel[id]; M.Sfx.click(); };
// nothing else happens while the defenders are being chosen
const oOP = G.openPanel;
G.openPanel = function (p) { if (this.raidPrep && (!p || p.kind !== 'raidPrep')) { this.toast('混沌来袭：先选好守城的领袖', '#ff6a5a'); return; } return oOP.apply(this, arguments); };
const oCP = G.closePanel;
G.closePanel = function () { if (this.raidPrep && this.panel && this.panel.kind === 'raidPrep') { this.toast('混沌来袭躲不掉：选好领袖，点「开始守城」', '#ff6a5a'); return; } return oCP.apply(this, arguments); };
['passDay', 'restDay', 'toRoom'].forEach(k => { const o = G[k]; if (!o) return; G[k] = function () { if (this.raidPrep) { this.toast('混沌来袭：先选好守城的领袖', '#ff6a5a'); return; } return o.apply(this, arguments); }; });
// whatever cleared the base (a reset, a new game, a screen change) must not strand the choice: reopen it, or drop it once the raid is no longer today's
const oTick = G.tick;
G.tick = function () { const r = oTick.apply(this, arguments), m = this.meta; if (this.raidPrep && this.screen === 'base' && !this.raid && !this.panel && m) { if (m.raidPending !== m.day || !m.heroes.length) { this.raidPrep = null; this.raidGo = false; } else oOP.call(this, { kind: 'raidPrep' }); } return r; };
// a reload in the middle of choosing brings the choice back
const oTB = G.toBase;
G.toBase = function () { const r = oTB.apply(this, arguments), m = this.meta; if (m && m.raidPending === m.day && m.lastRaid !== m.day && !this.raid && !this.raidPrep) setTimeout(() => { if (this.screen === 'base' && !this.raid && !this.raidPrep) this.startRaid(); }, 900); return r; };

const GRADE = [{ g: 'S', c: '#ffcf4a', m: 1.6 }, { g: 'A', c: '#b86bff', m: 1.3 }, { g: 'B', c: '#47d6c1', m: 1 }, { g: 'C', c: '#c4ccd9', m: 0.7 }];
const bldBp = (m, bias, style) => { for (let i = 0; i < 10; i++) { const k = M.dropBp(bias, style); if (k.startsWith('bbp:')) return k; } return M.usefulBp ? M.usefulBp(m, null, style) : M.dropBp(bias); };
const relicBp = (m) => { const k = 'rbp:' + M.pick(Object.keys(M.RELICS)); return !M.bpUseful || M.bpUseful(m, k) ? k : bldBp(m, 0.5); };
G.raidEnd = function () {
  const r = this.raid, m = this.meta; r.done = true; m.st = m.st || {};
  const fallenH = [];
  r.ents.forEach(e => { if (!e.hero) return; if (e.alive) e.hero.hp = Math.max(1, Math.round(e.hp)); else fallenH.push(e.hero); });
  m.portal.hp = Math.max(0, Math.round(r.portal.hp)); m.lastRaid = m.day; m.raids++; m.raidPending = null;
  if (r.over === 'lose') { r.result = { grade: 'X', fallen: fallenH.length }; this.save(); this.banner({ kind: 'win', text: '传送门崩塌', col: '#ff4a4a', col2: '#3a0000', life: 2.5 }); M.Sfx.lose(); setTimeout(() => { this.raid = null; this.go('over'); }, 2200); return; }
  m.st.raidsWon = (m.st.raidsWon || 0) + 1;
  // the grade: how many monsters fell, and how much of the portal was kept
  const killR = r.total ? r.kills / r.total : 1, keep = r.portal0 ? Math.max(0, Math.min(1, r.portal.hp / r.portal0)) : 1, sc = 0.55 * killR + 0.45 * keep;
  const gi = sc >= 0.97 ? 0 : sc >= 0.85 ? 1 : sc >= 0.7 ? 2 : 3, GR = GRADE[gi];
  const sup = Math.round((80 + m.day * 12) * GR.m), orb = Math.round(r.kills * 4 * GR.m), bps = [];
  bps.push(M.oneBldBp(null));   // fixed: one random building blueprint for holding (user ruling 2026-09-25); the grade still scales supplies and exp
  const boss = r.ents.some(e => e.side === 'E' && e.boss && !e.alive);
  // pay out (the HUD numbers are held until the icons land)
  ['msup', 'msh', 'morb'].forEach((k, i) => this.hold(k, [m.supplies, m.shards, m.orbs][i]));
  const falls = fallenH.map(h => M.raidFall(m, h));
  m.supplies += sup; m.orbs += orb; bps.forEach(k => M.invAdd(m, k, 1));
  let spare = ''; if (!m.heroes.length) { m.heroes.push(M.newHero(m, null, 0)); spare = '招魂台自己亮了，送来了一名新领袖。'; }
  const shT = falls.reduce((a, f) => a + f.sh, 0), orbT = orb + falls.reduce((a, f) => a + f.orb, 0);
  r.result = { grade: GR.g, score: Math.round(sc * 100) / 100, defenders: r.defenders, fallen: falls.length, sup, orb: orbT, sh: shT, bp: bps.slice(), boss };
  this.save();
  this.banner({ kind: 'win', text: '守住了！', col: '#ffd970', life: 2.2, sub: '评价 ' + GR.g + ' · 击退 ' + r.kills + ' / ' + r.total }); M.Sfx.fanfare(); this.fx.confetti(160); this.fx.rays(960, 470, GR.c, 2);
  const lines = ['击退 ' + r.kills + ' / ' + r.total + ' · 传送门保住 ' + Math.round(keep * 100) + '%', '物资 +' + sup + ' · 经验球 +' + orb];
  if (bps.length) lines.push('图纸：' + bps.map(k => M.itemInfo(k).n).join('、'));
  if (falls.length) { lines.push(''); falls.forEach(f => lines.push('阵亡 · ' + M.heroN(f.h) + '（Lv ' + f.h.lv + '）→ 灵魂碎片 +' + f.sh + '，经验球 +' + f.orb)); } else lines.push('没有领袖阵亡。');
  if (spare) lines.push(spare);
  const collect = () => {
    if (!this.modal || !this.modal.raidRes) return; this.modal = null; M.Sfx.click();
    const from = { x: 960, y: 540 };
    this.fly('sack', from, 'msup', '#caa84a', () => this.release('msup'));
    this.fly('orb', from, 'morb', '#9cff7a', () => this.release('morb'), 0.15);
    if (shT) this.fly('shard', from, 'msh', '#b86bff', () => this.release('msh'), 0.3); else this.release('msh');
    bps.forEach((k, i) => this.fx.fly(M.spriteCanvas(M.itemInfo(k).icon, 8), from, this.corePos(), { col: M.itemInfo(k).c, delay: 0.3 + i * 0.15, s0: 1.2, s1: 0.4, dur: 0.8 }));
    setTimeout(() => this.achCheck && this.achCheck(), 1200);
  };
  setTimeout(() => {
    this.raid = null; this.go('base'); this.bv.home();
    this.modal = { raidRes: 1, at: now(), title: '守城评价 ' + GR.g, titleColor: GR.c, border: GR.c, img: bps.length ? 'scroll' : 'sack', text: lines.join('\n'), back: collect, choices: [{ t: '收下奖励', gold: 1, fn: collect }] };
  }, 2300);
};

// ───────── views ─────────
const oView = G.view;
G.view = function () {
  const v = oView.call(this), p = this.panel, m = this.meta, pn = v.pn;
  if (pn && p && p.kind === 'raidPrep' && this.raidPrep) {
    const sel = this.raidPrep.sel, n = m.heroes.filter(h => sel[h.id]).length;
    Object.assign(pn, { isRaidPrep: true, title: '今夜混沌来袭', titleColor: '#ff6a5a', sub: '第 ' + m.day + ' 天',
      rpTxt: '选守城的领袖。守城阵亡的领袖永久死亡，留下灵魂碎片。',
      rpHeroes: m.heroes.map(h => { const on = !!sel[h.id], mx = M.heroMaxHp(h, m), P = M.PSKILL && M.PSKILL[h.cls];
        return { img: M.spriteURL(M.HEROES[h.cls].sprite, 4), n: M.heroN(h), c: M.qc(h.rarity), sub: 'Lv ' + h.lv + ' · 生命 ' + Math.round(h.hp) + '/' + mx, sh: '阵亡留下 ' + M.deathShards(h, m) + ' 碎片',
          mark: on ? '守城' : '留守', markC: on ? '#ff6a5a' : '#6b6570', border: on ? '#ff6a5a' : '#3a3040', bg: on ? 'linear-gradient(90deg,#3a1418,#15111a)' : '#15111a', onClick: () => this.raidToggle(h.id), tipOn: this.tipFn(() => this.heroTip(h)) }; }),
      rpBtn: n ? '开始守城 · ' + n + ' 名领袖出战' : '开始守城 · 只靠防御房间', rpGo: () => this.raidLaunch() });
  }
  // recruit panel speaks supplies
  if (pn && pn.isRecruit) { const cost = M.recruitCost(m); const qUp = this.panel && M.BUILDINGS[this.panel.key] && M.BUILDINGS[this.panel.key].recruit && M.BUILDINGS[this.panel.key].recruit.qUp; pn.recBtn = '花 ' + cost + ' 物资，招募领袖' + (qUp ? '（至少稀有）' : ''); }
  // build options show the shard price of epic / legendary rooms
  if (pn && pn.isBuild && pn.opts && p) { const opts = M.buildOptions(m, p.c, p.r); pn.opts.forEach((o, i) => { const x = opts[i]; if (x && x.sh && o.meta) o.meta = o.meta.replace(' 物资', ' 物资 + ' + x.sh + ' 碎片'); }); }
  // forge: fine forging toggle
  if (pn && pn.isForge) { const on = !!this.fineOn; Object.assign(pn, { fineOn: true, fineMark: on ? '✔' : '☐', fineC: on ? '#d8a0ff' : '#6b6570', fineBorder: on ? '#b86bff' : '#3a3040', fineBg: on ? '#241830' : '#15111a', fineTxt: '精铸：+' + M.FINE_SH + ' 灵魂碎片，至少史诗', fineToggle: () => { this.fineOn = !this.fineOn; M.Sfx.click(); } }); }
  return v;
};
})();

;
