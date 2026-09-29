// 「挖出你的地下基地」一段（rec.mjs --play）：从基地开始，挖开一块岩层、在空房间里建一间房，休息一天：
// 房间建成、地面上升起建筑、日历翻页、入夜混沌来袭；之后交给机器人照常玩。
// 存档要停在基地白天，并且有能挖的岩层和一间空房间（store/录制存档 第 8 天的就是）。
window.__play = async function (secs, opts) {
  const g = window.__mcg, M = window.MC, sleep = (ms) => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 600 && g.screen !== 'base'; i++) { if (g.screen === 'intro') g.toMenu(); else if (g.screen === 'menu') g.startGame(); await sleep(100); }
  for (let i = 0; i < 300 && (g.homeQ || g.guide); i++) { if (g.guide) g.guideClose(); await sleep(100); }
  const m = g.meta, cells = [];
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) cells.push([c, r, M.cell(m, c, r)]);
  const dig = cells.find(([c, r, x]) => !x.dug && M.canDig(m, c, r) && M.digCost(m, c, r) <= m.supplies);
  const room = cells.map(([c, r, x]) => ({ c, r, x, o: x.dug && !x.b && !x.job ? M.buildOptions(m, c, r).filter(o => !o.why).sort((a, b) => a.days - b.days)[0] : null })).find(e => e.o);
  await sleep(2600);
  if (dig) { const [c, r] = dig; g.bv.focus(c, r); g.openPanel({ kind: 'dig', c, r }); await sleep(1800); g.doDig(c, r); await sleep(1800); }
  if (room) {
    g.bv.focus(room.c, room.r); g.openPanel({ kind: 'build', c: room.c, r: room.r }); await sleep(2200); g.doBuild(room.c, room.r, room.o.key); await sleep(1800);
    const j = M.cell(m, room.c, room.r).job; if (j) j.days = 1;   // the clip is short: the room finishes with tonight's day
  }
  if (g.panel) g.closePanel(); await sleep(1200);
  g.restDay();
  return window.__bot(secs, opts);
};
