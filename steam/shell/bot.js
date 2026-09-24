'use strict';
// 试玩机器人：在打包后的真实游戏里自己点按钮、点战场、按键，检查会不会报错、卡死、崩溃、原地不动。
// 只在打包工具的试跑模式里运行（需要本次构建的试跑钥匙），玩家的游戏里不会启动。
// 能证明的：游戏能被持续操作、画面在推进、没有报错和卡死；不能证明：好不好玩、数值是否平衡。

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve('__timeout__'), ms))]);
}

// 找出画面上能点的东西：按钮、链接、鼠标指针为「手」的元素，且确实在最上层可见
const PROBE = `(() => {
  const vw = innerWidth, vh = innerHeight, out = [];
  const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_ELEMENT);
  let n = 0;
  for (let el = walker.currentNode; el && n < 6000; el = walker.nextNode(), n += 1) {
    if (el.id === '__wgp_mark') continue;
    const tag = el.tagName;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none' || Number(cs.opacity) < 0.05) continue;
    if (cs.cursor !== 'pointer' && tag !== 'BUTTON' && tag !== 'A' && el.getAttribute('role') !== 'button') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 10 || r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) continue;
    const x = Math.min(vw - 2, Math.max(1, r.left + r.width / 2)), y = Math.min(vh - 2, Math.max(1, r.top + r.height / 2));
    const top = document.elementFromPoint(x, y);
    if (!top || !(top === el || el.contains(top))) continue;
    const label = (el.innerText || el.getAttribute('aria-label') || el.title || '').replace(/\\s+/g, ' ').trim().slice(0, 30);
    if (r.width * r.height > vw * vh * 0.6 && !label) continue;
    out.push({ x: Math.round(x), y: Math.round(y), label, area: Math.round(r.width * r.height) });
  }
  const text = ((document.body && document.body.innerText) || '').replace(/\\s+/g, ' ').trim();
  const canvases = [...document.querySelectorAll('canvas')].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 200 && r.height > 150);
  const big = canvases.sort((a, b) => b.width * b.height - a.width * a.height)[0];
  const stage = big ? { x: big.left, y: big.top, w: big.width, h: big.height } : { x: vw * 0.1, y: vh * 0.15, w: vw * 0.8, h: vh * 0.7 };
  const heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  return { targets: out.slice(0, 80), text: text.slice(0, 300), sig: text.slice(0, 2000), stage, heap };
})()`;

const FPS = `new Promise((resolve) => { let f = 0; const s = performance.now();
  const tick = () => { f += 1; const t = performance.now() - s; if (t < 1000) requestAnimationFrame(tick); else resolve(Math.round(f * 1000 / t)); };
  requestAnimationFrame(tick); })`;

const KEYS = ['Space', 'Enter', 'Escape', '1', '2', '3', 'Left', 'Right', 'Up', 'Down'];
// 卡住时优先尝试的「推进类」按键
const PROGRESS_KEYS = ['Right', 'Enter', 'Space', 'Up', 'Down'];
const ARROW_KEYS = new Set(['Left', 'Right', 'Up', 'Down']);
// 只有符号没有文字的推进按钮（标签很短时才算，避免把「按 → 键前进」这类提示当成按钮）
const ARROWS = /[→➜➔▶►›»]/;
const isArrowButton = (label) => label.length <= 3 && ARROWS.test(label);

async function runBot(win, opts) {
  const { seconds = 60, seed = 1, prefer = [], avoid = [], outDir, log, errorCount } = opts;
  const random = rng(seed);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const preferRe = prefer.length ? new RegExp(prefer.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i') : null;
  const avoidRe = avoid.length ? new RegExp(avoid.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i') : null;
  const wc = win.webContents;
  const stats = {
    seconds, seed, actions: 0, clicks: 0, keys: 0, hangs: 0, stalls: 0, crashed: false,
    screens: 0, timeline: [], recent: [], fps: [], heapStart: null, heapEnd: null, shots: [], errorsBefore: errorCount(),
  };
  const seen = new Set();
  wc.focus();
  const start = Date.now();
  const until = start + seconds * 1000;
  let nextFps = start + 5000;
  let nextShot = start + Math.max(10, Math.floor(seconds / 5)) * 1000;
  let lastImageHash = null;
  let sameImageSince = Date.now();
  let lastSig = null;
  let lastText = '';
  let sinceNewScreen = 0;
  const labels = new Set();
  const clickCounts = new Map();
  // 点得越多的按钮越不容易再被选中，避免在同一个地方原地打转
  const weightedPick = (list) => {
    const weights = list.map((t) => 1 / (1 + (clickCounts.get(`${t.label}@${Math.round(t.x / 40)},${Math.round(t.y / 40)}`) || 0)) ** 2);
    let roll = random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i += 1) { roll -= weights[i]; if (roll <= 0) return list[i]; }
    return list[list.length - 1];
  };
  // 很多游戏的移动是「按住才走」：方向键按住一段时间再松开，其他键短按
  const pressKey = async (key, holdMs) => {
    // 键盘事件只会送到有焦点的页面
    if (!wc.isFocused()) wc.focus();
    const hold = holdMs || (ARROW_KEYS.has(key) ? 400 + Math.floor(random() * 1600) : 80);
    wc.sendInputEvent({ type: 'keyDown', keyCode: key });
    if (key.length === 1) wc.sendInputEvent({ type: 'char', keyCode: key });
    await sleep(hold);
    wc.sendInputEvent({ type: 'keyUp', keyCode: key });
    stats.keys += 1;
    remember(`按键 ${key}${hold > 200 ? `（按住 ${(hold / 1000).toFixed(1)} 秒）` : ''}`);
  };

  const click = async (x, y) => {
    wc.sendInputEvent({ type: 'mouseMove', x, y });
    wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
    await sleep(50);
    wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
  };
  const remember = (what) => {
    stats.recent.push(`${((Date.now() - start) / 1000).toFixed(1)}s ${what}`);
    if (stats.recent.length > 40) stats.recent.shift();
  };

  while (Date.now() < until) {
    if (wc.isCrashed()) { stats.crashed = true; break; }
    const probe = await withTimeout(wc.executeJavaScript(PROBE), 5000).catch(() => null);
    if (probe === '__timeout__' || !probe) {
      stats.hangs += 1;
      log.warn('bot', '页面 5 秒没有响应');
      await sleep(1000);
      continue;
    }
    if (stats.heapStart === null) stats.heapStart = probe.heap;
    stats.heapEnd = probe.heap;
    const sigHash = crypto.createHash('sha1').update(probe.sig).digest('hex');
    if (sigHash !== lastSig) {
      lastSig = sigHash;
      if (!seen.has(sigHash)) {
        seen.add(sigHash);
        sinceNewScreen = 0;
        // 时间线只记和上一个画面不同的那段文字
        let i = 0;
        while (i < probe.sig.length && probe.sig[i] === lastText[i]) i += 1;
        if (stats.timeline.length < 30) stats.timeline.push({ t: Math.round((Date.now() - start) / 1000), text: probe.sig.slice(Math.max(0, i - 10), i + 50) });
      }
      lastText = probe.sig;
    }
    sinceNewScreen += 1;
    // 连续 10 次操作都没出现过新画面（只在几个见过的画面之间来回）＝卡住，改为多试推进类按键
    const stuck = sinceNewScreen > 10;
    for (const t of probe.targets) if (labels.size < 60) labels.add(t.label || '（无文字）');

    const targets = probe.targets.filter((t) => !(avoidRe && avoidRe.test(t.label)));
    const preferred = targets.filter((t) => (preferRe && preferRe.test(t.label)) || isArrowButton(t.label));
    const clickTarget = async (t) => {
      const key = `${t.label}@${Math.round(t.x / 40)},${Math.round(t.y / 40)}`;
      clickCounts.set(key, (clickCounts.get(key) || 0) + 1);
      await click(t.x, t.y);
      stats.clicks += 1;
      remember(`点${t.label ? `「${t.label}」` : '按钮'}(${t.x},${t.y})`);
    };
    const r = random();
    if (stuck && r < 0.4) {
      // 找出路：10 次操作没出现新画面，多试推进类按键（方向键按住更久）
      const key = pick(PROGRESS_KEYS);
      await pressKey(key, ARROW_KEYS.has(key) ? 1500 + Math.floor(random() * 1500) : 0);
    } else if (preferred.length && r < 0.5) {
      await clickTarget(weightedPick(preferred));
    } else if (targets.length && r < 0.78) {
      await clickTarget(weightedPick(targets));
    } else if (r < 0.93) {
      const x = Math.round(probe.stage.x + probe.stage.w * (0.1 + random() * 0.8));
      const y = Math.round(probe.stage.y + probe.stage.h * (0.1 + random() * 0.8));
      await click(x, y);
      stats.clicks += 1;
      remember(`点画面(${x},${y})`);
    } else {
      await pressKey(pick(KEYS));
    }
    stats.actions += 1;
    await sleep(250 + Math.floor(random() * 650));

    if (Date.now() >= nextFps) {
      nextFps += 5000;
      const fps = await withTimeout(wc.executeJavaScript(FPS), 4000).catch(() => null);
      if (typeof fps === 'number') stats.fps.push(fps);
      // 画面 30 秒完全不变 = 可能卡住（机器人一直在操作）
      // 截图等的是下一帧；页面不重绘时可能一直等下去，所以限时
      const image = await withTimeout(wc.capturePage(), 4000).catch(() => '__timeout__');
      const hash = image === '__timeout__' ? `timeout-${Date.now()}` : crypto.createHash('sha1').update(image.toBitmap()).digest('hex');
      if (hash !== lastImageHash) { lastImageHash = hash; sameImageSince = Date.now(); }
      else if (Date.now() - sameImageSince > 30000) {
        stats.stalls += 1;
        sameImageSince = Date.now();
        log.warn('bot', '画面 30 秒没有任何变化');
      }
    }
    if (Date.now() >= nextShot && stats.shots.length < 6) {
      nextShot += Math.max(10, Math.floor(seconds / 5)) * 1000;
      const image = await withTimeout(wc.capturePage(), 4000).catch(() => '__timeout__');
      if (image !== '__timeout__') {
        const file = `机器人-${stats.shots.length + 1}.png`;
        fs.writeFileSync(path.join(outDir, file), image.toPNG());
        stats.shots.push({ file, t: Math.round((Date.now() - start) / 1000) });
      } else {
        log.warn('bot', '截图 4 秒没有完成（页面可能没有重绘）');
      }
    }
  }
  stats.screens = seen.size;
  stats.labels = [...labels];
  stats.elapsed = Math.round((Date.now() - start) / 1000);
  stats.errors = errorCount() - stats.errorsBefore;
  log.info('bot', '机器人试玩结束', { actions: stats.actions, screens: stats.screens, hangs: stats.hangs, stalls: stats.stalls, errors: stats.errors });
  return stats;
}

module.exports = { runBot };
