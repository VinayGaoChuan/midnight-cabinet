// 转换核对：原版角色页和模块版导出的 sprite.json 按真实颜色逐帧比较（色板下标可以不同，颜色必须一样）。
// 用法：node pcd/tools/same.mjs <原版 sprite.json> <模块版 sprite.json>
// 原版一律先用 tools/refexport.mjs 重新导出（修好了取帧），不要拿原版页面自己的 exportData 比：那份有丢帧。
// 任何一帧不同都算差异，必须为 0（或逐条说明原因）。退出码：0 一致 · 2 有差异。
import fs from 'node:fs';
const [fa, fb] = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const rgbFrame = (j, fr) => { const px = Buffer.from(fr.px, 'base64'), out = new Array(j.w * j.h); for (let y = 0; y < j.h; y++) for (let x = 0; x < j.w; x++) { const c = px[y * j.w + x]; if (c !== 255) out.push((x - j.ox) + ',' + (y - j.oy) + ':' + j.palette[c].toLowerCase()); } return out.filter(Boolean).sort().join('|') + '|mx' + (fr.mx || 0) + 'f' + (fr.flip || 0); };
const report = { states: [], real: 0 };
for (const st of Object.keys(fa.states)) {
  const A = fa.states[st].frames.map((f) => rgbFrame(fa, f)), Bst = fb.states[st];
  if (!Bst) { report.states.push({ state: st, missing: true }); report.real++; continue; }
  const B = Bst.frames.map((f) => rgbFrame(fb, f)), real = [];
  for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) real.push(i);
  report.real += real.length;
  report.states.push({ state: st, frames: [A.length, B.length], diff: real.join(',') });
}
report.ok = report.real === 0;
console.log(JSON.stringify(report, null, 1));
process.exit(report.ok ? 0 : 2);
