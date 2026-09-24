// Headless battles: does "our power / their power" (mc-power.js) predict who wins? Random armies, leaders, worlds and
// fights; writes one row per battle. usage: node tools/sim-power.js 3000 .ai/sim-rows.json
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tools', 'gen-effects.js'), 'utf8');
const head = src.slice(0, src.indexOf("if (!M.unitSkill)"));
const M = new Function('require', '__dirname', head.replace("const ROOT = path.join(__dirname, '..')", "const ROOT = path.join(__dirname, '..', '..')") + '; return win.MC;')(require, path.join(ROOT, 'tools', 'x'));
const DB = M.DB, TDB = M.TDB;
const N = +(process.argv[2] || 400), OUT = process.argv[3];
const meta = M.defaultMeta3(); meta.day = 1; const hero = meta.heroes[0];
const WORLDS = ['town', 'forest', 'park', 'harbor', 'foundry', 'ward', 'starship', 'hell'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const POOL = [0, 1, 2, 3].map(q => M.SHOP_POOL.filter(k => DB[k].q === q && DB[k].ranged !== 2));
// raw stats as the battle builds them
const allyStats = (run, u) => { const d = DB[u.type], L = M.legionMods(run, d), md = run.mods || {}; return { hp: (d.hp + (u.bHp || 0)) * (1 + L.hp + (md.unitHp || 0)), dps: (d.atk + (u.bAtk || 0)) * (1 + L.atk + (md.unitAtk || 0)) * (d.as || 100) / 100 * (1 + L.as), ranged: d.ranged === 1 }; };
const foeStats = (run, s, day) => { const d = DB[s.type]; const ek = (run.region.tut ? 0.75 : 1) * (1 + (day - 1) * 0.02) * (run.region.tut ? 1 : M.BAL.ENEMY_K) * (s.elite ? 1.15 : 1); const def = (d.tr || []).includes('SummonBossTrait') ? 1.3 : 1; return { hp: d.hp * ek * def, dps: d.atk * ek * (d.as || 100) / 100, ranged: d.ranged === 1 }; };
const heroStats = (run) => ({ hp: M.heroMaxHp(run.hero, run.M), dps: M.heroAtk(run.hero, run.M) / (M.HEROES[run.hero.cls].cd || 1) });
const rows = [];
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const world = pick(WORLDS); hero.lv = 1 + Math.floor(Math.random() * 8); hero.cls = pick(Object.keys(M.HEROES)); meta.day = 1 + Math.floor(Math.random() * 20);
  const run = M.newRun3(meta, hero, world, []); hero.hp = M.heroMaxHp(hero, meta);
  const stage = Math.random(), n = 2 + Math.floor(Math.random() * 9);
  run.roster.length = 0;
  for (let k = 0; k < n; k++) { const r = Math.random(), q = r < 0.55 - stage * 0.35 ? 0 : r < 0.85 - stage * 0.25 ? 1 : r < 0.97 - stage * 0.1 ? 2 : 3; M.addUnit(run, pick(POOL[q])); }
  const type = pick(['normal', 'normal', 'normal', 'elite', 'boss', 'extract']), col = Math.floor(Math.random() * (run.len.cols || 10));
  const node = { col, type, final: type === 'boss' && Math.random() < 0.3 };
  const cfg = M.makeBattleCfg(run, node);
  const A = run.roster.map(u => allyStats(run, u)), E = cfg.list.map(s => foeStats(run, s, meta.day)), Hs = heroStats(run);
  const b = new M.Battle3(run, cfg); let st = 0; while (!b.over && st < 30 * 170) { b.step(1 / 30); st++; }
  rows.push({ world, day: meta.day, lv: hero.lv, cls: hero.cls, n, type, L: +cfg.w.toFixed(2), A, E, H: Hs, win: b.over === 'clear' || b.over === 'survived' ? 1 : 0, over: b.over, t: +b.t.toFixed(1), mode: cfg.mode });
}
console.log(N, 'battles in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
if (OUT) fs.writeFileSync(OUT, JSON.stringify(rows));
