// 生成全跑的各轮参数：按「种族·类别」把批次合成组，组内按 upKeys 连成升级线；跳过已完成的角色
import fs from 'node:fs';
const ROOT = '/Users/yseer/Code/midnight-cabinet/pcd';
const R = JSON.parse(fs.readFileSync(ROOT + '/roster.json', 'utf8')), B = JSON.parse(fs.readFileSync(ROOT + '/batches.json', 'utf8'));
const bs = Array.isArray(B) ? B : B.batches, byKey = Object.fromEntries(R.map((r) => [r.key, r]));
const done = new Set(fs.readdirSync(ROOT + '/accepted').concat(process.argv.slice(2)));   // 已通过 + 命令行额外排除
const groups = {};
for (const b of bs) for (const k of b.keys) { if (done.has(k)) continue; const g = groups[b.group] = groups[b.group] || { id: b.id, title: b.group, chars: [] }; const e = byKey[k]; g.chars.push({ key: e.key, kind: e.kind, n: e.n, race: e.race, voc: e.voc, vocDesc: e.vocDesc, quality: e.quality, ranged: e.ranged, range: e.range, desc: e.desc, traits: e.traits.map((t) => ({ n: t.n, d: t.d, card: t.card, fx: t.fx })), up: e.up, batch: b.id }); }
for (const g of Object.values(groups)) {
  const inG = new Set(g.chars.map((c) => c.key)), parent = {};
  for (const c of g.chars) for (const u of (byKey[c.key].upKeys || '').split(',').filter(Boolean)) if (inG.has(u)) parent[u] = c.key;
  const seen = new Set(); g.chains = [];
  for (const c of g.chars) if (!parent[c.key]) { const ch = []; const walk = (k) => { if (seen.has(k)) return; seen.add(k); ch.push(k); for (const u of (byKey[k].upKeys || '').split(',').filter(Boolean)) if (inG.has(u)) walk(u); }; walk(c.key); g.chains.push(ch); }
  for (const c of g.chars) if (!seen.has(c.key)) g.chains.push([c.key]);
}
const list = Object.values(groups);
console.log(JSON.stringify(list.map((g) => ({ title: g.title, n: g.chars.length, chains: g.chains.length }))));
fs.writeFileSync(new URL('./wave-groups.json', import.meta.url), JSON.stringify(list));
