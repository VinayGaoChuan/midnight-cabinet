// Growth sim (dev tool, 2026-09-26): the play bot on fast forward through a whole game, logging every fight, run, raid
// and the leader's growth. Load tools/bot.js first, then: await __prog(secs, { pick: 'smart' | 'low' | 'mid' | 'high' })
// → JSON { fights: [...], runs: [...], raids: [...], days: [...] }  (summarise with a script of your own; see docs/design.md §8.2)
(function () {
  window.__prog = async function (secs, o = {}) {
    const g = window.__mcg, M = window.MC, P = M.Game.prototype, fights = [], runs = [], raids = [], days = [];
    const oBegin = P.beginBattle, oWin = P.runWin, oFail = P.runFail, oRE = P.raidEnd, oPass = P.passDay, oSettle = P.startSettle;
    const hp0 = () => { const h = g.meta.heroes[0]; return h ? { lv: h.lv, hp: Math.round(M.heroMaxHp(h, g.meta)), pw: M.heroPower(h, g.meta) } : {}; };
    P.beginBattle = function (n) { const r = oBegin.apply(this, arguments); try { const run = this.run; if (run && !run.region.tut) { const mine = M.runPower(run), theirs = M.nodePower(run, n) || 1; this._fi = fights.length; fights.push({ day: this.meta.day, w: run.regionKey, sc: run.scene ? run.scene.i : 0, tier: run.danger || 0, t: n.type + (n.fb ? '*' : ''), col: n.col, seg: n.seg, from: run.chap ? run.chap.from : 0, farm: run.chap && run.chap.farm ? 1 : 0, diff: this.meta.diff || 0, mine, theirs, r: +(mine / theirs).toFixed(2), army: run.roster.length, lv: run.hero.lv }); } } catch (e) {} return r; };
    P.startSettle = function () { try { const b = this.battle; if (this._fi != null && fights[this._fi]) { fights[this._fi].res = b.over; fights[this._fi].secs = Math.round(b.t); } this._fi = null; } catch (e) {} return oSettle.apply(this, arguments); };
    P.runWin = function (kind) { const run = this.run; if (run && !run.region.tut) runs.push({ end: kind, w: run.regionKey, sc: run.scene ? run.scene.n : '', tier: run.danger || 0, day: this.meta.day, lv: run.hero.lv, from: run.chap ? run.chap.from : 0, farm: run.chap && run.chap.farm ? 1 : 0, bosses: run.bossN || 0, grant: run.grant || 0, stops: this.node ? this.node.col + 1 : 0, uniq: (run.loot.bp || []).filter(x => /^uniq:/.test(x)).length }); return oWin.apply(this, arguments); };
    P.runFail = function () { const run = this.run; if (run && !run.region.tut) runs.push({ end: 'dead', w: run.regionKey, sc: run.scene ? run.scene.n : '', tier: run.danger || 0, day: this.meta.day, at: this.node && this.node.type, lv: run.hero.lv, from: run.chap ? run.chap.from : 0, farm: run.chap && run.chap.farm ? 1 : 0, bosses: run.bossN || 0, grant: run.grant || 0, stops: this.node ? this.node.col + 1 : 0 }); return oFail.apply(this, arguments); };
    P.raidEnd = function () { const r = this.raid, m = this.meta; try { if (r && !r.done) raids.push({ day: m.day, over: r.over, portal: +(r.portal.hp / r.portal.max).toFixed(2) }); } catch (e) {} return oRE.apply(this, arguments); };
    if (oPass) P.passDay = function () { const m = this.meta; days.push(Object.assign({ day: m.day, core: m.core, sup: m.supplies, pros: m.prosLv, prog: JSON.parse(JSON.stringify(m.prog || {})), relics: (m.relics || []).length, bb: Object.keys(M.BOSS_BLD || {}).filter(k => M.bbOwned(m, M.BOSS_BLD[k])).length, faith: m.faith || 0 }, hp0())); return oPass.apply(this, arguments); };
    const TIER = { low: 0, mid: 1, high: 2 }; let lastFail = null;
    const oF2 = P.runFail; P.runFail = function () { const run = this.run; if (run && run.chap && !run.chap.farm) lastFail = run.chap.w + ':' + M.wpOf(this.meta, run.chap.w); else lastFail = null; return oF2.apply(this, arguments); };
    const pickSt = (gg, list) => {
      if (!list.length) return null; const m = gg.meta;
      if (o.pick in TIER) return list.find(s => M.tierOf(m, s.k) === TIER[o.pick]) || list[0];
      // smart: push the story (the first stele is the frontier chapter); after losing at the frontier, farm once if a
      // cleared chapter is on offer
      const front = list.find(s => !(m.offers && m.offers.farm && m.offers.farm[m.offers.list.indexOf(s.k)]));
      const farmS = list.filter(s => s !== front);
      if (front && !(lastFail && lastFail === front.k + ':' + M.wpOf(m, front.k) && farmS.length)) return front;
      lastFail = null;   // farm once, then back to the story (the bot used to farm forever after one loss)
      return farmS[Math.floor(Math.random() * farmS.length)] || list[0];
    };
    try { const bot = await window.__bot(secs, { fast: 1, extract: 1, pickSt }); return JSON.stringify({ fights, runs, raids, days, bot: { day: bot.day, core: bot.core, errs: bot.errs, viewErrs: bot.viewErrs, screen: bot.screen, games: bot.games } }); }
    finally { P.beginBattle = oBegin; P.runWin = oWin; P.runFail = oFail; /* oF2 wraps the recorder's runFail and goes with it */ P.raidEnd = oRE; P.startSettle = oSettle; if (oPass) P.passDay = oPass; }
  };
})();
