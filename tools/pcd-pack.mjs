// pcd/（像素角色：共享引擎、部件库、角色模块）→ src/mc-pcd.js，游戏构建时和其他源码一起拼进 index.html。
// 改了 pcd/lib 或 pcd/chars 之后运行：node tools/pcd-pack.mjs
// 拼接时去掉注释（字体子集按源码里出现的字收，注释里的中文会把像素字体撑大）；
// 画法不受影响：只删注释和删完只剩空白的行，字符串、模板字符串、正则原样保留（用 --split 导出后逐帧核对过）。
// 不打包：下划线开头的演示 / 试做模块，和范式角色 star-wizard（名单里没有它）。
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PCD = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'pcd');
const OUT = path.join(ROOT, 'src', 'mc-pcd.js');

// 去注释：逐字扫描，认得 '…' "…" `…${…}…` /正则/ 和两种注释；注释删掉，只剩空白的行也删掉，其余原样保留
function strip(src) {
  let out = '', i = 0, prev = '';   // prev：上一个非空白的有效字符，用来判断 / 是除号还是正则开头
  const n = src.length, stack = [];   // 模板字符串 ${ … } 里的花括号深度
  const regexOk = () => !prev || '(,=:[!&|?{};+-*%<>~^'.includes(prev) || /(^|[^\w$])(return|typeof|case|do|else|in|of|void|yield|await|delete|throw)$/.test(out.trimEnd());
  const tmpl = (j) => {   // 从 ` 或结束 ${…} 的 } 开始，抄到模板结束或下一个 ${
    out += src[j++];
    while (j < n) {
      const ch = src[j];
      if (ch === '\\') { out += ch + src[j + 1]; j += 2; continue; }
      if (ch === '`') { out += ch; prev = '`'; return j + 1; }
      if (ch === '$' && src[j + 1] === '{') { out += '${'; stack.push(0); prev = '{'; return j + 2; }
      out += ch; j++;
    }
    return j;
  };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '`') { i = tmpl(i); continue; }
    if (c === '}' && stack.length && stack[stack.length - 1] === 0) { stack.pop(); i = tmpl(i); continue; }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const k = src.indexOf('*/', i + 2); i = k < 0 ? n : k + 2; out += ' '; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; } out += src.slice(i, j + 1); i = j + 1; prev = c; continue; }
    if (c === '/' && regexOk()) { let j = i + 1, cls = false; while (j < n && (src[j] !== '/' || cls)) { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; } j++; while (/[a-z]/i.test(src[j] || '')) j++; out += src.slice(i, j); i = j; prev = '/'; continue; }
    if (stack.length) { if (c === '{') stack[stack.length - 1]++; else if (c === '}') stack[stack.length - 1]--; }
    out += c; if (!/\s/.test(c)) prev = c; i++;
  }
  return out.split('\n').filter((l) => l.trim()).join('\n');
}

const files = [path.join(PCD, 'lib', 'pcd.js'), path.join(PCD, 'lib', 'parts.js'), path.join(PCD, 'lib', 'parts-beast.js')];
const chars = fs.readdirSync(path.join(PCD, 'chars')).filter((f) => f.endsWith('.js') && !f.startsWith('_') && f !== 'star-wizard.js').sort();
for (const f of chars) files.push(path.join(PCD, 'chars', f));
let body = '', raw = 0;
// 部件库里的 parts.README 是给人看的说明字符串，游戏用不上，里面的中文还会进字体子集：打包时去掉
const dropDocs = (s) => s.split('\n').filter((l) => !/^\s*parts\.README\s*=/.test(l)).join('\n');
for (const f of files) { const s = fs.readFileSync(f, 'utf8'); raw += s.length; body += '\n' + dropDocs(strip(s)) + '\n;\n'; }
const head = `// ==== mc-pcd.js ====\n// 生成文件，不要手改：node tools/pcd-pack.mjs（源在 pcd/lib 和 pcd/chars，${chars.length} 个角色模块）\n`;
fs.writeFileSync(OUT, head + body);
console.log(`${chars.length} 个角色 → src/mc-pcd.js  ${(raw / 1e6).toFixed(2)} MB → ${((head + body).length / 1e6).toFixed(2)} MB`);
if (process.argv.includes('--split')) {   // 核对用：把去注释后的文件按原目录结构写到 <输出目录>，好用查看页逐帧对比
  const dst = path.resolve(process.argv[process.argv.indexOf('--split') + 1]);
  for (const f of files.concat([path.join(PCD, 'view.html')])) { const rel = path.relative(PCD, f); fs.mkdirSync(path.dirname(path.join(dst, rel)), { recursive: true }); fs.writeFileSync(path.join(dst, rel), f.endsWith('.html') ? fs.readFileSync(f, 'utf8') : strip(fs.readFileSync(f, 'utf8'))); }
}
