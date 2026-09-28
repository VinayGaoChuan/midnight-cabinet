// The numbers table (docs/design.md §15.4): every tuned coefficient, its value now, what it does, where it lives.
// usage: node tools/tune.js [out.md]   (default .ai/tune.md)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'gen-effects.js'), 'utf8');
const head = src.slice(0, src.indexOf('if (!M.unitSkill)'));
const M = new Function('require', '__dirname', head + '; return win.MC;')(require, __dirname);
const out = process.argv[2] || path.join(ROOT, '.ai', 'tune.md');
const kits = Object.keys(M.BOSS_KIT || {}).filter(k => !/^tut:/.test(k)).map(k => '| ' + ((M.DB[k] && M.DB[k].n) || k) + ' | ' + M.BOSS_KIT[k].tr + ' | ' + M.BOSS_KIT[k].sk + ' | ' + (M.BOSS_KIT[k].good || '') + ' |');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, '# 数值总表（' + new Date().toISOString().slice(0, 10) + '，node tools/tune.js）\n\n' + M.tuneTable() + '\n\n## 首领标定（真实强度 tr、血攻比 sk）\n\n| 首领 | tr | sk | 擅长对付 |\n|---|---|---|---|\n' + kits.join('\n') + '\n', 'utf8');
console.log('wrote', out, M.TUNE.length, 'coefficients,', kits.length, 'bosses');
