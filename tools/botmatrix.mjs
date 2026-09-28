// The bot matrix (docs/design.md §15.4): whole games by the play bot, several at once in headless Chrome, each from a fresh
// save and a fixed random seed, per difficulty and play style; one JSON per game in the out folder, then a report against
// the target bands of §15.6 / §7.7 (node tools/botreport.mjs <out>).
// usage: node tools/botmatrix.mjs --out .ai/matrix/base --diffs 0,1,2,3 --games 3 --styles smart,novice --secs 3600 --par 8 --seed 1
//   env CHROME: the Chrome / Chromium to use (default: the usual install path for this system)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('out', path.join(ROOT, '.ai', 'matrix', 'run'))), DIFFS = arg('diffs', '0,1,2,3').split(',').map(Number), GAMES = +arg('games', 2);
const STYLES = arg('styles', 'smart').split(','), SECS = +arg('secs', 3600), PAR = +arg('par', Math.max(1, os.cpus().length - 2)), SEED0 = +arg('seed', 1), MAXDAY = +arg('maxday', 31);
const CHROME = process.env.CHROME || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const url = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:');
// the whole game, in the page: difficulty and style set, the bot plays until the game is over, day MAXDAY, or SECS
const GAME = (gd, style, secs) => `(async () => {
  const g = __mcg, M = MC, P = M.Game.prototype, over = [];
  const oNG = P.newGame; P.newGame = function () { M._nextGd = ${gd}; if (this.prof) this.prof.gdMax = 3; const r = oNG.apply(this, arguments); try { this.meta.gd = ${gd}; this.meta.core = M.GDIFF[${gd}].core; this.meta.portal.hp = M.portalMax(this.meta); } catch (e) {} return r; };
  const oGo = P.go; P.go = function (s) { try { if (s === 'over' && this.meta) over.push({ day: this.meta.day, core: this.meta.core, why: this.meta.portal && this.meta.portal.hp <= 0 ? 'portal' : 'core' }); } catch (e) {} return oGo.apply(this, arguments); };
  if (g.prof) g.prof.gdMax = 3; g.newGame();
  const stop = setInterval(() => { if (g.meta && g.meta.day > ${MAXDAY}) { g.screen = 'over'; } }, 1000);
  const t0 = performance.now(); let res;
  try { res = JSON.parse(await __prog(${secs}, { pick: 'smart', bot: { novice: ${style === 'novice' ? 1 : 0} } })); } finally { clearInterval(stop); }
  const m = g.meta;
  return JSON.stringify({ gd: ${gd}, style: '${style}', mins: +((performance.now() - t0) / 60000).toFixed(1), over, end: { day: m.day, core: m.core, goalDone: !!m.goalDone, pros: m.prosLv, gar: (m.garrison || []).length, sup: m.supplies, lv: m.heroes[0] && m.heroes[0].lv }, fights: res.fights, runs: res.runs, nights: res.nights, days: res.days, bot: res.bot, errs: (window.__mcErrs || []).slice(0, 5) });
})()`;
async function one(job, port) {
  const prof = path.join(os.tmpdir(), 'mc-matrix-' + port);
  fs.rmSync(prof, { recursive: true, force: true });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--user-data-dir=' + prof, '--remote-debugging-port=' + port, '--window-size=1280,720', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
  let ws, id = 0; const pend = new Map();
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr, to) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: to || 60000 }); if (r.exceptionDetails) return 'EXC ' + JSON.stringify(r.exceptionDetails).slice(0, 400); return r.result && r.result.value; };
  try {
    let tgt; for (let i = 0; i < 80 && !tgt; i++) { await wait(250); try { const l = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); tgt = l.find(t => t.type === 'page'); } catch (e) { /* not up yet */ } }
    ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
    ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d); pend.delete(d.id); } });
    await send('Page.enable'); await send('Runtime.enable');
    // a fixed seed: the same seed plays the same game until something changes (mulberry32)
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){ let a = ${job.seed} >>> 0; Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();` });
    await send('Page.navigate', { url });
    for (let i = 0; i < 240; i++) { await wait(500); if (await ev('!!(window.__mcg && window.MC && window.MC_ALL_READY)') === true) break; }
    for (const t of ['bot.js', 'prog.js']) await ev(fs.readFileSync(path.join(ROOT, 'tools', t), 'utf8') + ';true');
    const out = await ev(GAME(job.gd, job.style, SECS), (SECS + 120) * 1000);
    fs.writeFileSync(path.join(OUT, job.name + '.json'), typeof out === 'string' ? out : JSON.stringify(out));
    console.log(job.name, typeof out === 'string' ? out.slice(0, 160) : 'ok');
  } catch (e) { console.log(job.name, 'ERR', e && e.message); }
  finally { try { ws && ws.close(); } catch (e) { /* closed */ } chrome.kill('SIGKILL'); await wait(300); fs.rmSync(prof, { recursive: true, force: true }); }
}
const jobs = []; let s = SEED0;
for (const style of STYLES) for (const gd of DIFFS) for (let i = 0; i < GAMES; i++) jobs.push({ gd, style, seed: s++, name: style + '-d' + gd + '-' + i });
console.log(jobs.length, 'games,', PAR, 'at a time →', OUT);
let next = 0; const port0 = 9500;
await Promise.all(Array.from({ length: Math.min(PAR, jobs.length) }, (_, w) => (async () => { while (next < jobs.length) { const j = jobs[next++]; if (fs.existsSync(path.join(OUT, j.name + '.json'))) continue; await one(j, port0 + w); } })()));
console.log('done');
