// What the game actually shows, for the translators (tools/i18n.py merge): headless Chrome plays the game with the bot (tools/bot.js)
// while src/mc-i18n.js records every Chinese string that reaches the screen — React children, canvas text — as its key, then opens
// the panels a bot never opens (settings, 玩法说明 with every card, the language list).
//   node tools/i18n-harvest.mjs [minutes] [name] [save.json]   → .ai/i18n/harvest-<name>.json, .ai/i18n/doc-only.json
//   LANG_CODE=en node tools/i18n-harvest.mjs …                  → .ai/i18n/miss-en-<name>.json: what still shows in Chinese
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIN = +(process.argv[2] || 10), NAME = process.argv[3] || 'bot', SAVE = process.argv[4] ? JSON.parse(fs.readFileSync(process.argv[4], 'utf8')) : null;
const PORT = 9660 + Math.floor(Math.random() * 30), OUT = path.join(ROOT, '.ai', 'i18n');
const CHROME = process.env.CHROME || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : process.platform === 'win32' ? path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe') : 'google-chrome');
const prof = path.join(os.tmpdir(), 'mc-i18n-' + PORT); fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn(CHROME, ['--headless=new', '--mute-audio', '--user-data-dir=' + prof, '--remote-debugging-port=' + PORT, '--window-size=1920,1080', '--allow-file-access-from-files', '--lang=zh-CN', 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
const send = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true, timeout: 600000 }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600)); return r.result.value; };
try {
  let t; for (let i = 0; i < 60 && !t; i++) { await wait(200); try { t = (await (await fetch('http://127.0.0.1:' + PORT + '/json')).json()).find(x => x.type === 'page'); } catch (e) {} }
  ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d); pend.delete(d.id); } });
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false }); await send('Page.enable');
  // Chinese on, recording from the very first frame; the save (if any) in before the game reads it
  // LANG=en (any language but Chinese): play in that language and record what still shows up in Chinese — the misses
  const LANG = process.env.LANG_CODE || 'zh-CN';
  let pre = `try { localStorage.clear(); localStorage.setItem('midnight-cabinet-settings-v1', JSON.stringify({ lang: ${JSON.stringify(LANG)} })); } catch (e) {}\n`;
  if (SAVE) pre += `try { const S = ${JSON.stringify(SAVE)}; for (const k in S) if (k !== 'midnight-cabinet-settings-v1') localStorage.setItem(k, S[k]); } catch (e) {}\n`;
  if (LANG === 'zh-CN') pre += `(function h() { if (window.__i18nHarvest) window.__i18nHarvest(true); else setTimeout(h, 5); })();\n`;
  await send('Page.addScriptToEvaluateOnNewDocument', { source: pre });
  await send('Page.navigate', { url: pathToFileURL(path.join(ROOT, 'index.html')).href });
  for (let i = 0; i < 240; i++) { await wait(500); try { if (await ev('!!(window.__mcg && window.MC_ALL_READY)')) break; } catch (e) {} }
  await ev(fs.readFileSync(path.join(ROOT, 'tools', 'bot.js'), 'utf8') + ';true');
  // the panels a bot never opens
  const DATA = `(() => { const M = MC, g = __mcg, n0 = __i18nDump().length, err = {};
  const walk = (v, d) => { if (d > 6 || v == null) return; if (typeof v === 'string') { M.tr(v); return; } if (Array.isArray(v)) { v.forEach(x => walk(x, d + 1)); return; } if (typeof v === 'object') for (const k in v) { if (k === 'img' || k === 'c' || k === 'bg') continue; walk(v[k], d + 1); } };
  const call = (name, f) => { try { walk(f(), 0); } catch (e) { err[name] = (err[name] || 0) + 1; } };
  const keys = (o) => Object.keys(o || {});
  keys(M.DB).forEach(t => { call('unitTip', () => M.unitTip(t)); call('gUnitTip', () => g.unitTip(t)); call('skillDesc', () => M.skillDesc && M.skillDesc(t)); call('db', () => [M.DB[t].n, M.DB[t].d, M.DB[t].skill && M.DB[t].skill.n, M.DB[t].skill && M.DB[t].skill.d]); });
  keys(M.BUILDINGS).forEach(k => { call('bldTip', () => g.bldTip(k)); call('bld', () => [M.BUILDINGS[k].n, M.BUILDINGS[k].d]); });
  keys(M.RELICS).forEach(k => { for (let q = 0; q < 6; q++) { call('relicLines', () => M.relicLines(k, q)); call('relicText', () => M.relicText && M.relicText({ key: k, q, lines: M.relicLines(k, q) })); } call('relic', () => M.RELICS[k]); });
  keys(M.TILES).forEach(k => { call('tileTip', () => M.tileTip(k)); call('tile', () => M.TILES[k]); });
  keys(M.WONDERS).forEach(k => call('wonder', () => M.WONDERS[k]));
  keys(M.VOC).forEach(k => { call('voc', () => [k, M.VOC[k].d]); call('tagVoc', () => M.TAG && M.TAG.voc(k)); });
  (M.RACE6 || []).forEach(r => { call('race', () => M.raceLines && M.raceLines(r)); call('tagRace', () => M.TAG && M.TAG.race(r)); });
  keys(M.HEROES).forEach(k => call('hero', () => M.HEROES[k]));
  keys(M.TALENTS || M.TAL || {}).forEach(k => call('tal', () => [M.TALENTS ? M.TALENTS[k] : null, M.talDesc && M.talDesc(k, 1)]));
  keys(M.WORLDS).forEach(k => call('world', () => M.WORLDS[k]));
  keys(M.BOSSKIT || M.KIT || {}).forEach(k => call('boss', () => M.bossLines && M.bossLines(k)));
  (M.GUIDE || []).forEach(c => call('guide', () => [c.title, c.line]));
  keys(M.ACTION_N).forEach(k => call('action', () => M.ACTION_N[k]));
  return { added: __i18nDump().length - n0, err };
})()`;
const tour = `(async () => { const g = __mcg, w = (ms) => new Promise(r => setTimeout(r, ms));
    try { g.openSettings(); await w(400); g.langPick = true; g.bump(); await w(400); g.closeSettings(); } catch (e) {}
    try { if (g.openRules) { g.openRules(); await w(400); } else { g.rulesOpen = true; g.bump(); await w(400); } g.rulesOpen = false; g.bump(); } catch (e) {}
    try { for (const k of Object.keys(MC.GUIDE || [])) { const c = MC.GUIDE[k]; if (c) { MC.tr(c.title); MC.tr(c.line); } } } catch (e) {}
    // every base panel the save has (rock to dig, an empty room, a job, each room): what its buttons and lines say
    try { const M = MC, m = g.meta, sc = g.screen, seen = new Set();
      const walk = (v, d) => { if (d > 7 || v == null || seen.has(v)) return; if (typeof v === 'string') { M.tr(v); return; } if (typeof v !== 'object') return; seen.add(v); if (Array.isArray(v)) v.forEach(x => walk(x, d + 1)); else for (const k in v) if (k !== 'img' && k !== 'thumb') walk(v[k], d + 1); };
      g.screen = 'base';
      for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = M.cell(m, c, r), kind = x.b ? 'room' : x.job ? 'job' : x.dug ? 'build' : M.canDig(m, c, r) ? 'dig' : null; if (!kind) continue; g.panel = { kind, c, r, key: x.b, at: 0 }; try { walk(g.view(), 0); } catch (e) {} }
      g.panel = null; g.screen = sc; } catch (e) {}
    return true; })()`;
  await ev(tour);
  // every description the game can write, whether or not the bot gets to see it: units, skills, buildings, relics, tiles, tags,
  // races, bosses, talents, leaders — each generator called over its whole table, every string it returns recorded as a key
  console.log('data', JSON.stringify(await ev(DATA)));
  await ev(`window.__botStop = false; window.__hvRes = null; window.__bot(${MIN * 60}, { fast: true, buy: true, extract: true }).then(r => window.__hvRes = r, e => window.__hvRes = { err: String(e) }); true`);
  const T0 = Date.now(); let last = 0;
  while (Date.now() - T0 < MIN * 60e3 + 30e3) {
    await wait(10000);
    const st = await ev(`({ n: __i18nDump().length, day: __mcg.meta.day, s: __mcg.screen, res: !!window.__hvRes })`);
    if (st.n !== last) { console.log(Math.round((Date.now() - T0) / 1000) + 's', 'keys', st.n, 'day', st.day, st.s); last = st.n; }
    if (st.res) break;
    // a lost game starts a new one: the bot carries on
  }
  await ev(tour);
  const dump = await ev('__i18nDump()'); fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, (LANG === 'zh-CN' ? 'harvest-' : 'miss-' + LANG + '-') + NAME + '.json'), JSON.stringify(dump, null, 0));
  // the words only the docs read (M.ROOM_D: docs/effects.md): never translated
  const doc = await ev(`(() => { const o = []; const walk = (v) => { if (typeof v === 'string') o.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); }; walk(MC.ROOM_D || {}); return o; })()`);
  fs.writeFileSync(path.join(OUT, 'doc-only.json'), JSON.stringify(doc, null, 0));
  console.log('harvest', NAME, dump.length, 'keys · doc-only', doc.length, '· bot', JSON.stringify(await ev('window.__hvRes')).slice(0, 300));
} catch (e) { console.log('ERR', e.stack || e); }
finally { try { ws && ws.close(); } catch (e) {} chrome.kill('SIGKILL'); await wait(300); fs.rmSync(prof, { recursive: true, force: true }); process.exit(0); }
