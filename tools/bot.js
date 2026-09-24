// headless-ish play bot: drives the Game through menus, map, battles, shops, events, chests, settlement
window.__bot = async function (secs, opts = {}) {
  const g = window.__mcg, M = window.MC, log = [], T0 = performance.now(); const minis = {}; let games = 0, raids = 0, steps = 0, battles = 0, shops = 0, events = 0, chests = 0, settles = 0, nodes = 0;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  while (performance.now() - T0 < secs * 1000) {
    steps++;
    for (let i = 0; i < 6; i++) g.tick(1 / 30);
    const s = g.screen;
    try {
      if (s === 'intro') g.toMenu();
      else if (s === 'menu') g.startGame();
      else if (s === 'room') { if (g.prof.pending) { games++; log.push('settle+' + g.prof.pending.total); g.collectSettle(); } else if (!g.roomTr) g.roomEnter(); for (let i = 0; i < 20; i++) g.tick(1 / 30); }
      else if (g.coreFx || g.tear) { for (let i = 0; i < 20; i++) g.tick(1 / 30); }
      else if (s === 'end') { g.endBack(); log.push('end'); }
      else if (s === 'over') { log.push('over'); break; }
      else if (s === 'base') {
        if (opts.stopAtBase && nodes > 2) break;
        if (!g.panel) { g.openWorlds(); } else if (g.panel.kind === 'worlds') { const w = M.worldsOpen(g.meta)[0]; g.pickWorld(w); } else if (g.panel.kind === 'loadout') g.launch(); else if (g.panel.kind === 'raidPrep') { raids++; g.raidLaunch(); } else g.closePanel();
        await sleep(900);
      }
      else if (s === 'raid') { for (let i = 0; i < 60; i++) g.tick(1 / 30); }
      if (g.modal && g.modal.raidRes) g.modal.choices[0].fn();
      else if (s === 'shop') { shops++; g.leaveShop(); }
      else if (s === 'world') {
        if (g.mini && !g.reel) { const mg = g.mini; mg.botN = (mg.botN || 0) + 1; minis[mg.kind] = (minis[mg.kind] || 0) + 1; const bs = (mg.D.btns ? mg.D.btns.call(g, mg) : []) || []; const play = bs.filter(b => !b.dis && !b.leave), lv = bs.find(b => b.leave && !b.dis);
          if (mg.botN > 60) g.miniFinish('bot', '#fff'); else if (play.length && mg.botN < 30 && Math.random() < 0.7) play[Math.floor(Math.random() * play.length)].fn(); else if (lv && mg.botN > 6) lv.fn(); else if (mg.D.down) { if (!mg.holding) g.miniDown(mg.mx || 960, mg.my || 540, 'ptr'); else g.miniUp('ptr'); } for (let i = 0; i < 12; i++) g.tick(1 / 30); }
        else if (g.chest) { chests++; g.chest.t = 9; g.chestClick(); }
        else if (g.reel) { g.reel.t = 99; }
        else if (g.modal) { events++; const ch = (g.modal.choices || []).find(c => !c.dis) || (g.modal.choices || [])[0]; if (ch) ch.fn(); else g.modal = null; }
        else { const w = g.walker; g.keys.up = g.keys.down = false; g.keys.right = true; if (w && !w.edge) { const outs = M.nodeAhead(g.run.map, w.node); if (outs.length && !outs.find(o => o.dir === 'right')) { g.keys.right = false; g.keys[outs[0].dir] = true; } } }
      }
      else if (s === 'battle') {
        const b = g.battle; if (b && !b.over) { battles += b.t < 0.1 ? 1 : 0; for (let i = 0; i < 200 && !b.over; i++) b.step(1 / 30); if (opts.useItems) g.run.items.forEach((k, i) => k && g.useSlot(i)); }
        if (g.reel) g.reel.t = 99;
        if (g.settle) { g.settle.t = 9; g.settle.shown = g.settle.tiles.length; settles++; g.settleNext(); nodes++; }
      }
      Object.keys(g.keys).forEach(k => { if (g.screen !== 'world') g.keys[k] = false; });
    } catch (e) { log.push('ERR ' + s + ': ' + (e.stack || e).toString().slice(0, 300)); break; }
    await sleep(opts.sleep || 5);
  }
  return { games, raids, tokens: g.prof && g.prof.tokens, minis, steps, battles, settles, shops, events, chests, screen: g.screen, day: g.meta.day, heroes: g.meta.heroes.length, errs: (window.__mcErrs || []).slice(0, 5), log: log.slice(0, 10) };
};
