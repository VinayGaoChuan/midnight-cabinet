// 给转换核对用的「基准导出」：打开原版单文件角色页（按技能模板写的），用修好的取帧方式重新导出逐帧数据：
// 帧时间取 i / 12（不累加），并在导出期间给 Math.floor 加 1e-6 的容差（等同于模块里用 q12 / gait），
// 这样原版里因浮点误差丢掉的帧会回来，和模块版应当逐帧一致。
// 用法：node pcd/tools/refexport.mjs <原版 角色.html> <输出 ref.json>
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const [html, out] = process.argv.slice(2);
const port = 9400 + Math.floor(Math.random() * 400), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'refexp-'));
// 模板代码在闭包里：复制一份页面，在 window.__pc 前面插一行把导出要用的内部名字挂到 window.__int 上
const src = fs.readFileSync(html, 'utf8'), hook = 'window.__pc = {';
if (!src.includes(hook)) { console.error('页面里没有 window.__pc，不是按技能模板写的'); process.exit(1); }
const tmpHtml = path.join(prof, 'page.html');
fs.writeFileSync(tmpHtml, src.replace(hook, 'window.__int = { PAL, hero, AUDIT, REVIVE, DUR, NAMES, poseAt, drawHero, bakeHero, P };\n' + hook));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let ws, id = 0; const pend = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
let code = 0;
try {
  let url; for (let i = 0; i < 80 && !url; i++) { try { const j = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); url = j.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!url) await sleep(250); }
  ws = new WebSocket(url); await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'file://' + tmpHtml }); await sleep(1500);
  const expr = `(() => { const { PAL, hero, AUDIT, REVIVE, DUR, NAMES, poseAt, drawHero, bakeHero, P } = window.__int; const f0 = Math.floor; Math.floor = (x) => f0(x + 1e-6);
    try { const out = { name: document.title, palette: PAL, w: hero.w, h: hero.h, ox: hero.ox, oy: hero.oy, states: {} };
      const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
      for (const [st] of AUDIT.concat([[REVIVE, 0]])) { const frames = [];
        for (let i = 0; i / 12 < DUR[st] - 1e-6; i++) { const t = i / 12; poseAt(st, t, t); drawHero(); bakeHero(); frames.push({ t: +t.toFixed(3), px: b64(hero.out), mx: P.mx, flip: P.flip }); }
        out.states[NAMES[st]] = { dur: DUR[st], frames }; }
      return JSON.stringify(out); } finally { Math.floor = f0; } })()`;
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) { console.error('导出失败：' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); code = 1; }
  else { fs.writeFileSync(out, r.result.value); console.log('wrote ' + out); }
} catch (e) { console.error(e.message); code = 1; }
chrome.kill(); await sleep(300); try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
process.exit(code);
