// node pcd/tools/boss-drive.mjs <steps.mjs>  —— steps.mjs 导出 async (api) => {}；api: ev(js), shot(file, {x,y,w,h,scale}), wait(ms), log
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawn } from 'node:child_process';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', port = 9400 + Math.floor(Math.random() * 400);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const prof = path.join(os.tmpdir(), 'mc-boss-' + port);
const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--mute-audio', '--user-data-dir=' + prof, '--remote-debugging-port=' + port, '--window-size=1920,1080', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pend = new Map(), logs = [];
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr, to) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: to || 120000 }); if (r.exceptionDetails) return 'EXC ' + JSON.stringify(r.exceptionDetails).slice(0, 600); return r.result && r.result.value; };
const shot = async (file, c) => { const p = { format: 'png' }; if (c) p.clip = { x: c.x || 0, y: c.y || 0, width: c.w || 1920, height: c.h || 1080, scale: c.scale || 1 }; const r = await send('Page.captureScreenshot', p); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); return file; };
try {
  let tgt; for (let i = 0; i < 80 && !tgt; i++) { await wait(250); try { const l = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); tgt = l.find((t) => t.type === 'page'); } catch (e) { /* not up */ } }
  ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d); pend.delete(d.id); } if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(d.params.exceptionDetails).slice(0, 300)); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') logs.push('ERR ' + JSON.stringify(d.params.args).slice(0, 300)); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file://' + path.join(ROOT, 'index.html') });
  for (let i = 0; i < 240; i++) { await wait(500); if (await ev('!!(window.__mcg && window.MC && window.MC_ALL_READY)') === true) break; }
  const steps = (await import(path.resolve(process.argv[2]))).default;
  await steps({ ev, shot, wait, log: (...a) => console.log(...a), ROOT });
} catch (e) { console.log('ERR', e && e.stack); }
finally { if (logs.length) console.log('PAGE LOGS:\n' + logs.slice(0, 12).join('\n')); try { ws && ws.close(); } catch (e) { /* */ } chrome.kill('SIGKILL'); await wait(300); fs.rmSync(prof, { recursive: true, force: true }); process.exit(0); }
