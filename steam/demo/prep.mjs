// 试玩版打包前的准备：按仓库最新源码构建试玩版游戏包（tools/mk.py --demo），把正式版的 App ID（配置.jsonc 的 steam.storeAppId）
// 写进去，「加入愿望单」就打开它的商店页。Windows / macOS 都用：node prep.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const mk = path.join(REPO, 'tools', 'mk.py');
if (!fs.existsSync(mk)) { console.log('没有找到 tools/mk.py：直接用「放游戏包」里现有的游戏包'); process.exit(0); }
const text = fs.readFileSync(path.join(HERE, '配置.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
const store = Number((JSON.parse(text).steam || {}).storeAppId) || 0;
const inbox = path.join(HERE, '放游戏包');
fs.mkdirSync(inbox, { recursive: true });
for (const f of fs.readdirSync(inbox)) if (f.endsWith('.html')) fs.rmSync(path.join(inbox, f));
const out = path.join(inbox, '午夜机台-试玩版.html');
const args = [mk, '--demo', `--store-app=${store}`, out];
const tries = process.platform === 'win32' ? [['py', ['-3']], ['python', []], ['python3', []]] : [['python3', []], ['python', []]];
for (const [cmd, pre] of tries) {
  const r = spawnSync(cmd, pre.concat(args), { stdio: 'inherit', cwd: REPO });
  if (r.error && r.error.code === 'ENOENT') continue;
  if (r.status !== 0) { console.log('构建试玩版游戏包失败'); process.exit(1); }
  console.log(`试玩版游戏包：${out}（正式版 App ID：${store || '未填'}）`);
  process.exit(0);
}
console.log('没有找到 Python 3：请安装 Python 3，或手动把试玩版游戏包放进「放游戏包」');
process.exit(1);
