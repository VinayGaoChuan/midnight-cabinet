// ==== mc-power.js ====
(function () {
// Power (user ruling 2026-09-24): one number that says who is likely to win.
//   a side's power = √(total life × total damage per second), as the battle builds it (banners, talents, relics, the
//   day's enemy scaling, elites …). Calibrated on 3 000 headless battles (tools/sim-power.js):
//   ours ÷ theirs ≥ 1.25 wins ~99 %, 1.1–1.25 ~90 %, 1.0–1.1 ~65 %, below 0.9 mostly loses.
// The map shows every visible fight's power over it, coloured by that ratio, and ours over the leader.
const M = window.MC, G = M.Game.prototype, DB = M.DB, sq = Math.sqrt;
const PK = () => M.POWER_K || 1;   // power is counted in price units (mc-voc.js)
M.unitPower = (k, u) => { const d = DB[k]; if (!d) return 0; return Math.round(sq((d.hp + (u ? u.bHp || 0 : 0)) * (d.atk + (u ? u.bAtk || 0 : 0)) * (d.as || 100) / 100) / PK() * ((u && u.ek) || 1)); };   // u.ek: an evolved unit's life and attack (mc-evo.js)
M.heroPower = (h, m) => h && M.HEROES[h.cls] ? Math.round(sq(M.heroMaxHp(h, m) * M.heroAtk(h, m) / (M.HEROES[h.cls].cd || 1)) / PK()) : 0;
// every unit's power is its price, including the few units tuned after mc-voc.js (玉石兽 …)
Object.keys(DB).forEach(k => { const d = DB[k]; if (d.type !== 'Summon' || !(d.cost > 0) || !(d.atk > 0) || !d.hp) return; const p = sq(d.hp * d.atk * (d.as || 100) / 100) / PK(); if (Math.abs(p - d.cost) > 0.5) d.atk = Math.round(d.atk * Math.pow(d.cost / p, 2) * 100) / 100; });
M.powerOf = (s) => Math.round(sq(Math.max(0, s.hp) * Math.max(0, s.dps)) / PK());
// our side: every unit as the battle will build it, and the leader with the life it has now
M.sideA = function (run) {
  let hp = 0, dps = 0; const md = run.mods || {}, rb = run.runBuff || {};
  (run.roster || []).forEach(u => { const d = DB[u.type]; if (!d) return; const L = M.legionMods(run, d), V = M.vocMods(md, d), ek = u.ek || 1;
    hp += (d.hp + (u.bHp || 0)) * ek * (1 + L.hp + V.hp + (md.unitHp || 0)) * (1 + (L.shield || 0) + (md.shield || 0));
    dps += (d.atk + (u.bAtk || 0)) * ek * (1 + L.atk + V.atk + (md.unitAtk || 0) + (rb.unitAtk || 0)) * (d.as || 100) / 100 * (1 + (L.as || 0) + V.as); });
  const h = run.hero; if (h && M.HEROES[h.cls]) { hp += Math.max(1, h.hp); dps += M.heroAtk(h, run.M) * (1 + (rb.heroAtk || 0)) / (M.HEROES[h.cls].cd || 1); }
  return { hp, dps };
};
M.runPower = (run) => M.powerOf(M.sideA(run));
// their side: the fight's enemy list with the day's scaling
M.sideE = function (run, cfg) {
  const ek0 = (run.region.tut ? 0.75 : 1) * (1 + ((run.M ? run.M.day : 1) - 1) * 0.02) * (run.region.tut ? 1 : M.BAL.ENEMY_K); let hp = 0, dps = 0;
  cfg.list.forEach(s => { const d = DB[s.type]; if (!d) return; const ek = ek0 * (s.elite ? 1.15 : 1); hp += d.hp * ek * (s.hpMul || 1) * ((d.tr || []).includes('SummonBossTrait') ? 1.3 : 1); dps += d.atk * ek * (s.atkMul || 1) * (d.as || 100) / 100; });
  return { hp, dps };
};
// bosses are measured against the elite fight at the same step: the first segment's boss 1.0× that, later mid-map bosses 1.3×, the final one 1.45×
// (before this an early boss was three times the fights around it — the wall players kept dying at). Only the boss
// itself is scaled (hpMul / atkMul, read by spawnEnemy).
const oCfg = M.makeBattleCfg;
function tuneBoss(run, node, cfg) {
  const bs = cfg.list.filter(s => s.boss); if (!bs.length || run.region.tut) return cfg;
  let el = 0; for (let i = 0; i < 4; i++) el += M.powerOf(M.sideE(run, oCfg.call(M, run, { col: node.col, type: 'elite' }))); el /= 4;
  // the first segment's boss meets an army of ~5 bought at one shop: it is only as strong as an elite there
  const first = (node.seg || 0) === (run.startSeg || 0), target = el * (node.fb || (node.final && !run.chap) ? M.BOSS_TF : first ? M.BOSS_T0 : M.BOSS_TM); let lo = 0.02, hi = 40;   /* the first boss of a run meets an army of one shop */   // a boss fights alone (2026-09-26): its scale can run far from its table values
  for (let k = 0; k < 18; k++) { const f = (lo + hi) / 2; bs.forEach(s => { s.hpMul = f; s.atkMul = f; }); if (M.powerOf(M.sideE(run, cfg)) > target) hi = f; else lo = f; }
  const f = +((lo + hi) / 2).toFixed(3), fb = !!(node.fb || (node.final && !run.chap)), k = fb ? M.FB_SKEW : 1;
  bs.forEach(s => { s.hpMul = +(f * k).toFixed(3); s.atkMul = +(f / k).toFixed(3); }); return cfg;
}
const rollCfg = (run, node) => { const cfg = oCfg.call(M, run, node); return node && node.type === 'boss' ? tuneBoss(run, node, cfg) : cfg; };
// a fight on the map is rolled once, the first time anything looks at it: the number shown is the fight you get
M.makeBattleCfg = function (run, node) {
  if (node && node.id != null && run && run.map && run.map.nodes && run.map.nodes[node.id] === node) { if (!node._cfg) node._cfg = rollCfg(run, node); return JSON.parse(JSON.stringify(node._cfg)); }
  return rollCfg(run, node);
};
const FIGHT = { normal: 1, elite: 1, boss: 1, hold: 1, extract: 1 };
// survive-the-clock fights (坚守 / 撤离) only need holding out: their waves count 0.7 (they were won at a raw 0.93)
// shown boss power is calibrated against elites on 300 headless fights each (.ai/sim-boss2.js): with the leader
// starting on the field it was 0.75; since the leader waits on the bench in boss fights too (2026-09-25) a boss plays
// like an elite of 1.05× its raw power
M.BOSS_SHOW = 1.05;
// a boss fights alone since 2026-09-26 (.ai/sim-boss3.js, 400 fights each): a small boss with its two charged blows plays
// like 1.26× its raw power, a final boss in its arena like 0.92× (its blows are slow; the army fights it along the whole edge)
M.MB_SHOW = 1.26; M.FB_SHOW = 0.92;
// how strong a boss is, against the elite fight at the same stop (2026-09-26 growth sims, tools/prog.js): the first small
// boss 0.75× (the army has seen one shop), later small bosses 1.0×, the final boss 1.15×
M.BOSS_T0 = 0.75; M.BOSS_TM = 1.0; M.BOSS_TF = 1.25;
// a final boss had too much life for what it hits (2026-09-27 playtest: median 62 s, a third over 90 s, up to 4 minutes,
// and still won almost every time): the same power, less life and harder blows (power = √(life × damage) is kept)
M.FB_SKEW = 0.45;
// every fight shows 15% stronger since the leader lost its field skill and units throw each other (2026-09-26,
// .ai/sim-kb.js: a shown 1.0–1.15 had dropped to ~40% wins; ×1.15 brings the colours back to their promise)
M.E_SHOW = 1.15;
M.nodePower = function (run, n) { if (!FIGHT[n.type] || run.region.tut) return 0; if (n._pw == null) n._pw = Math.round(M.powerOf(M.sideE(run, M.makeBattleCfg(run, n))) * (n.type === 'hold' || n.type === 'extract' ? 0.7 : n.type === 'boss' ? (n.fb ? M.FB_SHOW : M.MB_SHOW) : 1) * (M.E_SHOW || 1)); return n._pw; };
M.oddsCol = (mine, theirs) => { const r = mine / Math.max(1, theirs); return r >= 1.25 ? '#b6f28a' : r >= 1 ? '#ffcf4a' : '#e8434f'; };
M.oddsWord = (mine, theirs) => { const r = mine / Math.max(1, theirs); return r >= 1.25 ? '稳赢' : r >= 1 ? '有风险' : '很危险'; };

// ───────── the map: badges over the fights and over the leader ─────────
// 地图画在半分辨率层：尺寸取偶数（4px 墨框、24px 字），夜色小牌 + 顶边胜算色条 + 6px 硬投影
function badge(ctx, x, y, ic, txt, col) {
  const U = M.UI, P = M.PJ.PAL, e = (v) => Math.round(v); ctx.save(); ctx.font = U.font(24, true);
  const w = e(ctx.measureText(txt).width + 48), h = 36, X = e(x - w / 2), Y = e(y - h / 2);
  U.R(ctx, X + 2, Y + 6, w + 4, h + 4, P.ink); U.R(ctx, X - 4, Y - 4, w + 8, h + 8, P.ink); U.R(ctx, X, Y, w, h, P.night); U.R(ctx, X, Y, w, 4, col); U.R(ctx, X, Y + h - 4, w, 4, P.abyss);
  const cv = M.iconCanvas(ic, 2); if (cv) { ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, X + 6, e(y - 12), 24, 24); }
  U.text(ctx, txt, X + 36, e(y + 2), 24, col, { align: 'left', num: true, u: 2 }); ctx.restore();
}
const oDraw = M.drawWorld2;
M.drawWorld2 = function (ctx, run, walker, opts = {}) {
  const r = oDraw.apply(this, arguments);
  try {
    if (run && run.map && walker && !run.region.tut) {
      const z = opts.zoom || 1, toS = (x, y) => ({ x: 960 + (x - walker.camX) * z, y: 560 + (y - walker.camY) * z }), mine = M.runPower(run), map = run.map;
      const cur = walker.edge ? walker.edge.b : walker.node, curCol = map.nodes[cur] ? map.nodes[cur].col : 0;
      map.nodes.forEach(n => { if (!n.seen || n.done || !FIGHT[n.type] || (n.col <= curCol && n.id !== cur)) return; const p = toS(n.x, n.y - 128); if (p.x < -100 || p.x > 2020 || p.y < -60 || p.y > 1140) return; const pw = M.nodePower(run, n); badge(ctx, p.x, p.y, 't_sword', String(pw), M.oddsCol(mine, pw)); });
      const w = toS(walker.x, walker.y - 104); badge(ctx, w.x, w.y, 'u_star', String(mine), '#ffcf4a');
    }
  } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('power badge: ' + (e && e.message)); }
  return r;
};
// node tooltips add the odds
const oND = M.nodeDesc; M.nodeDesc = function (n) { M._tipNode = n; return oND.apply(this, arguments); };
const oWM = G.worldMove;
G.worldMove = function (sx, sy) {
  M._tipNode = null; const r = oWM.apply(this, arguments); const n = M._tipNode, run = this.run;
  if (n && run && this.tipData && n.seen && FIGHT[n.type] && !run.region.tut) { const pw = M.nodePower(run, n), mine = M.runPower(run); this.tipData = Object.assign({}, this.tipData, { lines: (this.tipData.lines || []).concat([{ t: '敌方战斗力 ' + pw + ' · 我方 ' + mine + ' · ' + M.oddsWord(mine, pw), c: M.oddsCol(mine, pw) }]) }); }
  return r;
};
// the world HUD: our power next to the other numbers
const oView = G.view;
G.view = function () { const v = oView.call(this); if (v.w && this.run) { v.w.pw = String(M.runPower(this.run)); v.w.pwIc = M.iconURL('u_star', 2); } return v; };
const oTF = G.tipFor;
G.tipFor = function (key) {
  if (key === 'w-power' && this.run) { const s = M.sideA(this.run); return { title: '我方战斗力 ' + M.powerOf(s), c: '#ffe08a', d: '部队和领袖加在一起。和敌人头上的数字比：高出四分之一以上基本稳赢，低于它就很危险。' }; }
  return oTF.call(this, key);
};

// ───────── worlds: danger from the first fights, with the boss as the goal ─────────
const AVG = (() => { let hp = 0, dps = 0, n = 0; M.SHOP_POOL.filter(k => DB[k].q === 0 && DB[k].cost >= 15 && DB[k].cost <= 60 && DB[k].ranged !== 2).forEach(k => { hp += DB[k].hp; dps += DB[k].atk * (DB[k].as || 100) / 100; n++; }); return n ? { hp: hp / n, dps: dps / n } : { hp: 300, dps: 20 }; })();
const wcache = new Map();
M.worldOdds = function (m, k) {
  const b = M.bestLeader(m), key = [k, m.day, b ? b.id + ':' + b.lv + ':' + Math.round(b.hp) : '-'].join('|'); if (wcache.has(key)) return wcache.get(key);
  const W = M.WORLDS[k], df = W.diff || 0, run = { region: W, regionKey: k, M: m, mods: {}, field: null, lvl0: 0.5 + df * 0.2 + Math.min(0.8, (m.day - 1) * 0.03), lvlStep: 0.45, map: null };
  const avg = (type, col) => { let s = 0; for (let i = 0; i < 6; i++) s += M.powerOf(M.sideE(run, M.makeBattleCfg(run, { col, type }))); return Math.round(s / 6); };
  let mine = 0; if (b) { const H = M.HEROES[b.cls]; mine = M.powerOf({ hp: 3 * AVG.hp + b.hp, dps: 3 * AVG.dps + M.heroAtk(b, m) / (H.cd || 1) }); }
  const first = avg('normal', 1), boss = avg('boss', 9), r = mine / Math.max(1, first), lv = r >= 1.6 ? 0 : r >= 1.15 ? 1 : 2;
  const o = { lv, n: ['低', '中', '高'][lv], c: ['#9cff7a', '#ffb040', '#ff4a4a'][lv], mine, first, boss, par: first };
  wcache.set(key, o); if (wcache.size > 60) wcache.delete(wcache.keys().next().value); return o;
};
M.worldDanger = M.worldOdds;
})();

;
