// Growth sim (dev tool, 2026-09-26): the play bot on fast forward through a whole game, logging every fight, run, raid
// and the leader's growth. Load tools/bot.js first, then: await __prog(secs, { pick: 'smart' | 'low' | 'mid' | 'high' })
// → JSON { fights: [...], runs: [...], raids: [...], days: [...] }  (summarise with a script of your own; see docs/design.md §8.2)
(function () {
  window.__prog = async function (secs, o = {}) {
    const g = window.__mcg, M = window.MC, P = M.Game.prototype, fights = [], runs = [], raids = [], days = [];
    const oBegin = P.beginBattle, oWin = P.runWin, oFail = P.runFail, oRE = P.raidEnd, oPass = P.passDay, oSettle = P.startSettle;
    const hp0 = () => { const h = g.meta.heroes[0]; return h ? { lv: h.lv, hp: Math.round(M.heroMaxHp(h, g.meta)), pw: M.heroPower(h, g.meta) } : {}; };
    P.beginBattle = function (n) { const r = oBegin.apply(this, arguments); try { const run = this.run; if (run && !run.region.tut) { const mine = M.runPower(run), theirs = M.nodePower(run, n) || 1; this._fi = fights.length; fights.push({ day: this.meta.day, w: run.regionKey, sc: run.scene ? run.scene.i : 0, tier: run.danger || 0, t: n.type + (n.final ? '*' : ''), col: n.col, mine, theirs, r: +(mine / theirs).toFixed(2), army: run.roster.length, lv: run.hero.lv }); } } catch (e) {} return r; };
    P.startSettle = function () { try { const b = this.battle; if (this._fi != null && fights[this._fi]) { fights[this._fi].res = b.over; fights[this._fi].secs = Math.round(b.t); } this._fi = null; } catch (e) {} return oSettle.apply(this, arguments); };
    P.runWin = function (kind) { const run = this.run; if (run && !run.region.tut) runs.push({ end: kind, w: run.regionKey, sc: run.scene ? run.scene.n : '', tier: run.danger || 0, day: this.meta.day, lv: run.hero.lv }); return oWin.apply(this, arguments); };
    P.runFail = function () { const run = this.run; if (run && !run.region.tut) runs.push({ end: 'dead', w: run.regionKey, sc: run.scene ? run.scene.n : '', tier: run.danger || 0, day: this.meta.day, at: this.node && this.node.type, lv: run.hero.lv }); return oFail.apply(this, arguments); };
    P.raidEnd = function () { const r = this.raid, m = this.meta; try { if (r && !r.done) raids.push({ day: m.day, over: r.over, portal: +(r.portal.hp / r.portal.max).toFixed(2) }); } catch (e) {} return oRE.apply(this, arguments); };
    if (oPass) P.passDay = function () { const m = this.meta; days.push(Object.assign({ day: m.day, core: m.core, sup: m.supplies, pros: m.prosLv, scn: Object.assign({}, m.scn || {}) }, hp0())); return oPass.apply(this, arguments); };
    const TIER = { low: 0, mid: 1, high: 2 };
    const pickSt = (gg, list) => {
      if (!list.length) return null; const m = gg.meta;
      if (o.pick in TIER) return list.find(s => M.tierOf(m, s.k) === TIER[o.pick]) || list[0];
      // smart: the hardest stele whose boss is within reach of the army a shop or two will add (1.6× what you start with);
      // otherwise the one with the weakest boss
      const opt = list.map(s => ({ s, t: M.tierOf(m, s.k), D: M.worldDanger(m, s.k) })).sort((a, b) => b.t - a.t);
      return (opt.find(x => x.D.boss <= x.D.mine * 1.6) || opt.slice().sort((a, b) => a.D.boss - b.D.boss)[0]).s;
    };
    try { const bot = await window.__bot(secs, { fast: 1, extract: 1, pickSt }); return JSON.stringify({ fights, runs, raids, days, bot: { day: bot.day, core: bot.core, errs: bot.errs, viewErrs: bot.viewErrs, screen: bot.screen, games: bot.games } }); }
    finally { P.beginBattle = oBegin; P.runWin = oWin; P.runFail = oFail; P.raidEnd = oRE; P.startSettle = oSettle; if (oPass) P.passDay = oPass; }
  };
})();
