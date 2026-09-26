// UX playtest (dev tool, 2026-09-27; user ruling: 「你来做机器人脚本，自己玩游戏，判断一下还有哪些是违反人类直觉，感受不好，
// 违反玩家期待的，发现问题你就直修，修好了再跑」). Plays with tools/bot.js and watches what a player would feel:
//   · words on screen that are broken (NaN, undefined, null, [object …]) in the page or drawn on the canvas
//   · text that does not fit its box, things outside the 1920×1080 stage
//   · stretches where the base takes no input (演出锁, day change, homecoming) — long ones feel stuck
//   · clicks the game refuses (deny) and why; toasts that repeat or run long
//   · supplies piling up while an empty room and a blueprint for it wait (idle riches); days with nothing to do
//   · fights that drag on or end at once; fights with no FEVER; a shop where nothing is affordable
//   · overlays on top of each other (the direction pick, a visitor, a modal, a guide card)
//   · raids lost, and raids against a town with no defence at all; the same chapter lost again and again
// Load tools/bot.js first, then: await __ux(secs, opts) → { issues: { key: { n, ex: [...] } }, stats }
(function () {
  window.__ux = async function (secs, o = {}) {
    const g = window.__mcg, M = window.MC, P = M.Game.prototype, U = M.UI, T0 = performance.now();
    const issues = {}, add = (k, ex) => { const it = issues[k] || (issues[k] = { n: 0, ex: [] }); it.n++; if (ex != null && it.ex.length < 5 && !it.ex.includes(ex)) it.ex.push(ex); };
    const st = { toasts: 0, denies: 0, battles: 0, fevers: 0, noFever: 0, longFights: 0, shortFights: 0, raids: 0, raidLost: 0, lockMax: 0, days: 0, idleDays: 0, dirs: 0 };
    const orig = { toast: P.toast, deny: P.deny, text: U && U.text, beginBattle: P.beginBattle, startSettle: P.startSettle, raidEnd: P.raidEnd, passDay: P.passDay, dirTake: P.dirTake, runFail: P.runFail };
    const bad = /NaN|undefined|null|\[object|Infinity/;
    // toasts and refusals
    let lastToast = {}; P.toast = function (t) { st.toasts++; const k = String(t); if (bad.test(k)) add('坏文字（提示）', k); if (lastToast[k] && performance.now() - lastToast[k] < 4000) add('同一句提示反复出现', k); lastToast[k] = performance.now(); if (k.length > 26) add('提示太长', k); return orig.toast.apply(this, arguments); };
    if (orig.deny) P.deny = function (t) { st.denies++; add('被拒绝的操作', String(t)); return orig.deny.apply(this, arguments); };
    // canvas words
    if (U && orig.text) U.text = function (ctx, s) { if (typeof s === 'string' && bad.test(s)) add('坏文字（画面）', s.slice(0, 40)); else if (typeof s === 'number' && !isFinite(s)) add('坏文字（画面）', String(s)); return orig.text.apply(this, arguments); };
    // fights: length, FEVER
    let fightAt = 0; P.beginBattle = function () { fightAt = 0; return orig.beginBattle.apply(this, arguments); };
    P.startSettle = function () { try { const b = this.battle; if (b) { st.battles++; const n = (b.fever && b.fever.n) || 0; st.fevers += n; if (!n && b.t > 20) st.noFever++; const fb = !!(this.node && this.node.fb), lim = fb ? 120 : 90; if (b.t > lim) { st.longFights++; add(fb ? '最终首领战太长（>120 秒）' : '战斗太长（>90 秒）', Math.round(b.t) + ' 秒 · ' + (this.run && this.run.regionKey) + ' · ' + (this.node && this.node.type)); } if (b.t < 4 && b.over === 'win') { st.shortFights++; } } } catch (e) {} return orig.startSettle.apply(this, arguments); };
    // raids
    P.raidEnd = function () { try { const r = this.raid, m = this.meta; if (r && !r.done) { st.raids++; const town = M.raidTown ? M.raidTown(m) : {}; if (r.over === 'lose') { st.raidLost++; add('守城失败', '第 ' + m.day + ' 天 · 墙' + town.wall + ' 塔' + town.tower + ' 兵营' + town.guard + ' 罩' + town.shield); } if (!town.wall && !town.tower && !town.guard) add('没有任何防御就遇到守城', '第 ' + m.day + ' 天'); } } catch (e) {} return orig.raidEnd.apply(this, arguments); };
    // days: idle riches, nothing to do
    P.passDay = function () {
      const m = this.meta; st.days++;
      try {
        let empty = 0, jobs = 0; for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (x.dug && !x.b && !x.job) empty++; if (x.job) jobs++; }
        const bps = Object.keys(m.inv || {}).filter(k => k.startsWith('bbp:') && m.inv[k] > 0 && M.BUILDINGS[k.slice(4)] && m.supplies >= M.BUILDINGS[k.slice(4)].cost);
        if (empty && bps.length && m.supplies > 300) add('物资和图纸都有，空房间却空着', '第 ' + m.day + ' 天 · 物资 ' + Math.round(m.supplies));
        if (!jobs && !empty && !bps.length) st.idleDays++;
      } catch (e) {}
      return orig.passDay.apply(this, arguments);
    };
    if (orig.dirTake) P.dirTake = function () { st.dirs++; return orig.dirTake.apply(this, arguments); };
    // chapters lost again and again
    const lost = {}; P.runFail = function () { try { const run = this.run; if (run && run.chap && !run.chap.farm) { const k = run.chap.w; lost[k] = (lost[k] || 0) + 1; if (lost[k] === 3) add('同一章连输 3 次', k + ' · 第 ' + this.meta.day + ' 天'); } } catch (e) {} return orig.runFail.apply(this, arguments); };
    const oWin = P.runWin; P.runWin = function () { try { const run = this.run; if (run && run.chap) lost[run.chap.w] = 0; } catch (e) {} return oWin.apply(this, arguments); };
    // sampling: locks, overlays, the page's words and boxes
    let lockFrom = 0, lastScan = 0; const stage = document.querySelector('#stage, .stage') || document.body;
    const busy = () => !!(g.screen === 'base' && (g.homeQ || g.lvFx || g.dayFx || g.tlFx || g.expand || g.coreFx || g.tear || g.rite || g.dirFx || g.saveFx || (g.baseBusy && g.baseBusy())));
    const why = {}; let lastT = performance.now();
    const iv = setInterval(() => {
      const t = performance.now(), dtS = (t - lastT) / 1000; lastT = t;
      if (busy()) ['homeQ', 'lvFx', 'dayFx', 'tlFx', 'expand', 'coreFx', 'tear', 'rite', 'dirFx', 'saveFx', 'visit', 'lvPick', 'dirPick', 'modal'].forEach(k => { if (g[k]) why[k] = +(((why[k] || 0) + dtS)).toFixed(2); });
      if (busy() && g.homeQ && g.homeQ.cur) { const c = g.homeQ.cur, k = 'step:' + (c.wait != null ? 'wait' + c.wait : 'until'); why[k] = +(((why[k] || 0) + dtS)).toFixed(2); }
      if (busy()) { if (!lockFrom) lockFrom = t; } else if (lockFrom) { const d = (t - lockFrom) / 1000; st.lockMax = Math.max(st.lockMax, d); if (d > 9) add('基地长时间点不动（>9 秒）', d.toFixed(1) + ' 秒 · 第 ' + (g.meta && g.meta.day) + ' 天'); lockFrom = 0; }
      const layers = ['dirPick', 'visit', 'modal', 'guide', 'lvPick', 'raidPrep'].filter(k => g[k]); if (layers.length > 1 && !(layers.length === 2 && layers.includes('guide') && layers.includes('modal'))) add('两层弹窗叠在一起', layers.join(' + '));
      if (g.guide && busy()) add('演出中弹出说明卡', g.guide.c && g.guide.c.id);
      if (g.mini && g.screen !== 'world') add('小游戏留在了别的画面上', g.screen + ' · ' + (g.mini.kind || ''));
      if (t - lastScan > 2500) { lastScan = t;
        try {
          const els = document.querySelectorAll('div, span'); let n = 0;
          for (const el of els) {
            if (!el.offsetParent || n > 4000) continue; n++;
            const own = [...el.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join('').trim(); if (!own) continue;
            if (bad.test(own)) add('坏文字（界面）', own.slice(0, 40));
            const cs = getComputedStyle(el); if ((cs.overflow === 'hidden' || cs.whiteSpace === 'nowrap' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 3 && el.clientWidth > 0) add('文字超出框', own.slice(0, 24) + ' · ' + g.screen);
          }
        } catch (e) {}
      }
    }, 250);
    let bot;
    try { bot = await window.__bot(secs, Object.assign({ fast: 1, extract: 1, useItems: 1 }, o)); }
    finally { clearInterval(iv); Object.keys(orig).forEach(k => { if (k === 'text') { if (U && orig.text) U.text = orig.text; } else if (orig[k]) P[k] = orig[k]; }); P.runWin = oWin; }
    return JSON.stringify({ secs: Math.round((performance.now() - T0) / 1000), stats: st, lockWhy: why, issues, bot: { day: bot.day, screen: bot.screen, errs: bot.errs, viewErrs: bot.viewErrs, log: bot.log } });
  };
})();
