window.__sim = function (opts) {
  const M = window.MC, DB = M.DB, meta = M.defaultMeta3(); meta.day = opts.day || 1;
  const hero = meta.heroes[0], out = [];
  const pool = (q) => M.SHOP_POOL.filter(k => DB[k].q === q && DB[k].ranged !== 2);
  let seed = opts.seed || 7; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const oldR = Math.random; Math.random = rand;
  try {
    for (let i = 0; i < opts.n; i++) {
      const run = M.newRun3(meta, hero, opts.world, []);
      run.roster = []; const qs = opts.qs; qs.forEach(q => { const p = pool(q); M.addUnit(run, p[Math.floor(rand() * p.length)]); });
      const node = { col: opts.col, type: opts.type || 'normal' };
      const cfg = M.makeBattleCfg(run, node);
      const b = new M.Battle3(run, cfg); let casts = 0; const ob = b.beginCast; if (ob) b.beginCast = function (e, o) { casts++; return ob.call(this, e, o); };
      let guard = 0; while (!b.over && b.t < 150 && guard++ < 20000) b.step(1 / 30);
      const al = b.ents.filter(e => e.side === 'A' && !e.isHero && !e.summon);
      out.push({ over: b.over, t: +b.t.toFixed(1), alive: al.filter(e => e.alive).length + '/' + al.length, hero: Math.round(100 * Math.max(0, b.hero.hp) / b.hero.maxHp), casts, score: b.score });
    }
  } finally { Math.random = oldR; }
  const win = out.filter(o => o.over === 'clear' || o.over === 'survived').length;
  const avg = (k) => +(out.reduce((a, o) => a + (typeof o[k] === 'number' ? o[k] : 0), 0) / out.length).toFixed(1);
  return { win: win + '/' + out.length, t: avg('t'), hero: avg('hero'), casts: avg('casts'), score: Math.round(avg('score')), dead: out.filter(o => o.over === 'dead').length };
};
