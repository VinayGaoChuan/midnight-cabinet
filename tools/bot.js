// headless-ish play bot: drives the Game through menus, map, battles, shops, events, chests, settlement
// shopping like a plain player: keep a third of the army on the front line, otherwise the most power per coin;
// a banner that fits when money is left over (opts.buy === false: never buys, the old behaviour)
function botShop(g, M) {
  const run = g.run; if (!run || !run.shop || !run.shop.units) return; let n = 0;
  while (n++ < 12) {
    const def = run.roster.filter(u => M.isDefVoc && M.isDefVoc(M.DB[u.type].voc)).length, wantDef = def < Math.ceil((run.roster.length + 1) / 3);
    const c = run.shop.units.map((c, i) => ({ c, i })).filter(o => !o.c.sold && o.c.cost <= run.wallet && M.canAdd(run))
      .sort((a, b) => ((wantDef && M.isDefVoc(M.DB[b.c.type].voc) ? 1e6 : 0) + M.unitPower(b.c.type) / b.c.cost) - ((wantDef && M.isDefVoc(M.DB[a.c.type].voc) ? 1e6 : 0) + M.unitPower(a.c.type) / a.c.cost))[0];
    if (!c) {
      if (M.canAdd(run) || !run.roster.length) break;
      const weak = run.roster.slice().sort((a, b) => M.unitPower(a.type, a) - M.unitPower(b.type, b))[0], sv = M.sellValue(run, weak);
      const up = run.shop.units.map((c, i) => ({ c, i })).filter(o => !o.c.sold && o.c.cost <= run.wallet + sv && M.unitPower(o.c.type) > 1.6 * M.unitPower(weak.type, weak) && (!M.isDefVoc(M.DB[weak.type].voc) || M.isDefVoc(M.DB[o.c.type].voc)))
        .sort((a, b) => M.unitPower(b.c.type) - M.unitPower(a.c.type))[0];
      if (!up) break; g.sel = weak.uid; g.sellSel(); g.buy('units', up.i); continue;
    }
    g.buy('units', c.i);
  }
  (run.shop.banners || []).forEach((c, i) => { if (!c.sold && c.cost <= run.wallet * 0.6) g.buy('banners', i); });
  (run.shop.items || []).forEach((c, i) => { if (!c.sold && c.cost <= run.wallet * 0.5 && run.items.indexOf(null) >= 0) g.buy('items', i); });
}
window.__bot = async function (secs, opts = {}) {
  const g = window.__mcg, M = window.MC, log = [], T0 = performance.now(); const minis = {}; let guides = 0, games = 0, raids = 0, viewErrs = 0, steps = 0, battles = 0, shops = 0, events = 0, chests = 0, settles = 0, nodes = 0;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  while (performance.now() - T0 < secs * 1000) {
    steps++;
    for (let i = 0; i < 6; i++) g.tick(1 / 30);
    if (g.guide) { guides++; g.guideClose(); }   // first-time explanation cards: read and dismissed
    const s = g.screen;
    // the view is what the page renders every frame: a throw here means a broken screen for the player
    try { g.view(); } catch (e) { viewErrs++; if (viewErrs < 4) log.push('VIEW ' + s + ': ' + String(e.stack || e).slice(0, 200)); }
    try {
      if (s === 'intro') g.toMenu();
      else if (s === 'menu') g.startGame();
      else if (s === 'room') { if (g.prof.pending) { games++; log.push('settle+' + g.prof.pending.total); g.collectSettle(); } else if (!g.roomTr) g.roomEnter(); for (let i = 0; i < 20; i++) g.tick(1 / 30); }
      else if (g.coreFx || g.tear) { for (let i = 0; i < 20; i++) g.tick(1 / 30); }
      else if (s === 'end') { g.endBack(); log.push('end'); }
      else if (s === 'over') { log.push('over'); break; }
      else if (s === 'base') {
        if (opts.stopAtBase && nodes > 2) break;
        if (g.homeQ || g.lvFx || g.dayFx) { for (let i = 0; i < 40; i++) g.tick(1 / 30); await sleep(40); continue; }   // the return home plays in order: let it
        if (!g.panel) { if (!g.portalOn || !g.portalOn()) g.openWorlds(); else if (!g.bv.drop) { const st = (g.bv.steles || [])[0]; if (st) g.steleDrop(st.k, st.wx, st.wy); else if (g.bv.sv > 0.9 || !g.bv.steles) g.pickWorld(M.worldsOpen(g.meta)[0]); } } else if (g.panel.kind === 'loadout') g.launch(); else if (g.panel.kind === 'raidPrep') { raids++; g.raidLaunch(); } else g.closePanel();
        await sleep(900);
      }
      else if (s === 'raid') { for (let i = 0; i < 60; i++) g.tick(1 / 30); }
      if (g.modal && g.modal.raidRes) g.modal.choices[0].fn();
      else if (s === 'shop') { shops++; if (opts.buy !== false) botShop(g, M); g.leaveShop(); }
      else if (s === 'world') {
        if (g.mini && !g.reel) { const mg = g.mini; mg.botN = (mg.botN || 0) + 1; minis[mg.kind] = (minis[mg.kind] || 0) + 1; const bs = (mg.D.btns ? mg.D.btns.call(g, mg) : []) || []; const play = bs.filter(b => !b.dis && !b.leave), lv = bs.find(b => b.leave && !b.dis);
          if (mg.botN > 60) g.miniFinish('bot', '#fff'); else if (play.length && mg.botN < 30 && Math.random() < 0.7) play[Math.floor(Math.random() * play.length)].fn(); else if (lv && mg.botN > 6) lv.fn(); else if (mg.D.down) { if (!mg.holding) g.miniDown(mg.mx || 960, mg.my || 540, 'ptr'); else g.miniUp('ptr'); } for (let i = 0; i < 12; i++) g.tick(1 / 30); }
        else if (g.chest) { chests++; g.chest.t = 9; g.chestClick(); }
        else if (g.reel) { g.reel.t = 99; }
        else if (g.modal) { events++; const ch = (g.modal.choices || []).find(c => !c.dis) || (g.modal.choices || [])[0]; if (ch) ch.fn(); else g.modal = null; }
        else { const w = g.walker; g.keys.up = g.keys.down = false; g.keys.right = true; if (w && !w.edge) { const outs = M.nodeAhead(g.run.map, w.node); if (outs.length && !outs.find(o => o.dir === 'right')) { g.keys.right = false; g.keys[outs[0].dir] = true; } } }
      }
      else if (s === 'battle') {
        const b = g.battle; if (b && !b.over) { battles += b.t < 0.1 ? 1 : 0; if (opts.skill !== false && b.canCast && b.canCast() && b.t > 2) g.castSkill(); for (let i = 0; i < 200 && !b.over; i++) b.step(1 / 30); if (opts.useItems) g.run.items.forEach((k, i) => k && g.useSlot(i)); }
        if (g.reel) g.reel.t = 99;
        if (g.settle) { g.settle.t = 9; g.settle.shown = g.settle.tiles.length; settles++; g.settleNext(); nodes++; }
      }
      Object.keys(g.keys).forEach(k => { if (g.screen !== 'world') g.keys[k] = false; });
    } catch (e) { log.push('ERR ' + s + ': ' + (e.stack || e).toString().slice(0, 300)); break; }
    await sleep(opts.sleep || 5);
  }
  return { guides, games, raids, viewErrs, tokens: g.prof && g.prof.tokens, minis, steps, battles, settles, shops, events, chests, screen: g.screen, day: g.meta.day, heroes: g.meta.heroes.length, errs: (window.__mcErrs || []).slice(0, 5), log: log.slice(0, 10) };
};
