// The bot matrix report (docs/design.md §15.6): every game in a folder from tools/botmatrix.mjs, by play style and difficulty,
// against the target bands. usage: node tools/botreport.mjs .ai/matrix/<run> [> report.md]
import fs from 'node:fs';
import path from 'node:path';
const DIR = process.argv[2]; if (!DIR) { console.log('usage: node tools/botreport.mjs <folder>'); process.exit(1); }
const games = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { return null; } }).filter(g => g && g.end);
const GN = ['普通', '困难', '噩梦', '地狱'], GOAL = [15, 20, 25, 30], CORE = [3, 3, 3, 2];
const med = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pct = (a, f) => (a.length ? Math.round(100 * a.filter(f).length / a.length) + '%' : '—');
const r2 = (v) => (v == null ? '—' : (+v).toFixed(2));
const out = ['# 机器人矩阵 · ' + path.basename(DIR), '', games.length + ' 局', ''];
const groups = {}; games.forEach(g => { const k = g.style + '|' + g.gd; (groups[k] = groups[k] || []).push(g); });
out.push('## 一局（§7.7、§15.6）', '', '| 打法 | 难度 | 局数 | 守过目标夜 | 第 10 天前输掉 | 倒下 / 停在第几天（中位） | 活到第 30 天 | 平均丢心 | 每局分钟 |', '|---|---|---|---|---|---|---|---|---|');
Object.keys(groups).sort().forEach(k => { const L = groups[k], gd = L[0].gd, endDay = (g) => (g.over.length ? g.over[0].day : g.end.day);
  out.push('| ' + L[0].style + ' | ' + GN[gd] + ' | ' + L.length + ' | ' + pct(L, g => g.end.goalDone || endDay(g) > GOAL[gd]) + ' | ' + pct(L, g => g.over.length && g.over[0].day < 10) + ' | ' + med(L.map(endDay)) + ' | ' + pct(L, g => endDay(g) >= 30 && !(g.over.length && g.over[0].day < 30)) + ' | ' + (L.reduce((a, g) => a + (CORE[gd] - Math.max(0, g.end.core || 0)), 0) / L.length).toFixed(1) + ' | ' + med(L.map(g => g.mins)) + ' |'); });
out.push('', '## 一趟出征：各种仗（显示比值中位、胜率、场数）', '', '| 打法 | 难度 | 普通仗 | 精英 | 小首领 | 最终首领 | 坚守 / 撤离 |', '|---|---|---|---|---|---|---|');
Object.keys(groups).sort().forEach(k => { const L = groups[k], F = L.flatMap(g => g.fights || []).filter(f => f.res), cell = (f) => { const a = F.filter(f); return a.length ? r2(med(a.map(x => x.r))) + ' · ' + pct(a, x => x.res !== 'dead' && x.res !== 'time') + ' · ' + a.length : '—'; };
  out.push('| ' + L[0].style + ' | ' + GN[L[0].gd] + ' | ' + cell(f => f.t === 'normal') + ' | ' + cell(f => f.t === 'elite') + ' | ' + cell(f => f.t === 'boss') + ' | ' + cell(f => f.t === 'boss*') + ' | ' + cell(f => f.t === 'hold' || f.t === 'extract') + ' |'); });
out.push('', '## 守夜', '', '| 打法 | 难度 | 夜数 | 守住 | 主基地剩余（中位） | 驻军（中位） |', '|---|---|---|---|---|---|');
Object.keys(groups).sort().forEach(k => { const L = groups[k], N = L.flatMap(g => g.nights || []).filter(n => n.res);
  out.push('| ' + L[0].style + ' | ' + GN[L[0].gd] + ' | ' + N.length + ' | ' + pct(N, n => n.res === 'clear') + ' | ' + r2(med(N.map(n => n.left != null ? n.left : n.portal))) + ' | ' + med(N.map(n => n.gar || 0)) + ' |'); });
out.push('', '## 繁荣度和物资（中位）', '', '| 打法 | 难度 | Lv 第 3 天 | 第 5 天 | 第 8 天 | 第 14 天 | 物资第 5 天 | 第 10 天 | 第 15 天 |', '|---|---|---|---|---|---|---|---|---|');
Object.keys(groups).sort().forEach(k => { const L = groups[k], at = (d, f) => med(L.map(g => (g.days || []).find(x => x.day === d)).filter(Boolean).map(f));
  out.push('| ' + L[0].style + ' | ' + GN[L[0].gd] + ' | ' + [3, 5, 8, 14].map(d => at(d, x => x.pros) ?? '—').join(' | ') + ' | ' + [5, 10, 15].map(d => at(d, x => x.sup) ?? '—').join(' | ') + ' |'); });
const errs = games.flatMap(g => (g.errs || []).concat((g.bot && g.bot.errs) || [])).filter(Boolean);
out.push('', '报错：' + (errs.length ? errs.slice(0, 8).join(' / ') : '无'));
console.log(out.join('\n'));
