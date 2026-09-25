// Pixel Juice 皮肤：32 色调色板、像素字体、机台数码 <mc-num>、界面打击感（按压形变 + 像素迸发）。
// 放在 _order.txt 第二行（_pre0.js 之后），必须早于所有画布代码加载。关掉：MC.PJ.on = false（刷新后生效）。
(function () {
'use strict';
const W = typeof window !== 'undefined' ? window : globalThis;
const M = W.MC = W.MC || {};
if (M.PJ && M.PJ.__loaded) { M.PJ.__evals = (M.PJ.__evals || 1) + 1; return; }
const PAL = {
  ink: '#07060f', white: '#ffffff', cream: '#f4efe0', green: '#6fd46a', greenDeep: '#2b7a3d', lime: '#b6f28a',
  red: '#e8434f', wine: '#8c1f3a', pink: '#ff9aa8', brown: '#8a5a3c', tan: '#c98f5a', umber: '#4f2f22',
  silver: '#c4ccd9', steel: '#8791a6', slate: '#4b5268', teal: '#47d6c1', tealDeep: '#1f8f8a', ice: '#bff7f0',
  violet: '#b86bff', violetDeep: '#6a2fbf', magenta: '#ff6bd6', gold: '#ffcf4a', amber: '#e0781f', butter: '#fff3b0',
  blue: '#4f8fff', blueDeep: '#22408c', abyss: '#0d0b1e', night: '#1a1640', indigo: '#2b2461', dusk: '#3d3a8c',
  lavender: '#a9a3c9', haze: '#6a6394'
};
const P = PAL;
// 旧界面色 → 调色板（界面框架统一到靛蓝夜色，强调色统一到金）
const FIX = {
  '#000000': P.ink, '#0a080c': P.ink, '#08060a': P.ink, '#07050a': P.ink, '#050307': P.ink, '#060404': P.ink, '#050000': P.ink,
  '#1a0e08': P.ink, '#140c10': P.ink, '#140a1a': P.ink, '#06201c': P.ink, '#062420': P.ink, '#1a0806': P.ink, '#140810': P.ink, '#0c0508': P.ink,
  '#0e0c12': P.abyss, '#0c0910': P.abyss, '#15111a': P.abyss, '#120e16': P.abyss, '#120e18': P.abyss, '#100c12': P.abyss, '#1c1424': P.abyss,
  '#1a1420': P.indigo, '#221a26': P.indigo, '#221a2a': P.indigo, '#2e2436': P.indigo, '#3a2c40': P.indigo,
  '#3a3040': P.dusk, '#4a3a2a': P.dusk, '#2a2030': P.dusk, '#4a3620': P.dusk, '#6a4a28': P.dusk,
  '#5a4428': P.indigo, '#6a5030': P.dusk, '#8a6a3a': P.dusk,
  '#c8a060': P.gold, '#caa84a': P.gold, '#d9a53a': P.gold, '#ffe08a': P.gold, '#ffcc33': P.gold, '#f2c14e': P.gold, '#ffd970': P.gold,
  '#fff3c4': P.butter, '#fff0a0': P.butter, '#d4982e': P.amber, '#6a4410': P.umber, '#e8c86a': P.tan, '#a89060': P.tan,
  '#f5ead4': P.cream, '#e8dcc4': P.cream, '#ffe8b0': P.cream, '#cfc6b8': P.silver, '#a89ca8': P.lavender, '#8d8496': P.lavender,
  '#6b6570': P.haze, '#5a5460': P.haze,
  '#9cff7a': P.lime, '#b8ff9a': P.lime, '#9ccc6a': P.green, '#4a7a3a': P.greenDeep,
  '#ff6a5a': P.red, '#ff4a4a': P.red, '#ff2a2a': P.red, '#ff8a6a': P.pink, '#ff9a9a': P.pink, '#ff9ab0': P.pink,
  '#d8a0ff': P.violet, '#e07ab0': P.magenta, '#c0407a': P.magenta, '#ffb070': P.amber, '#ff9a3c': P.amber,
  '#8fffe8': P.teal, '#b8fff0': P.teal, '#2a9a8a': P.tealDeep, '#3aa89a': P.tealDeep, '#e8fff8': P.ice, '#e0fff5': P.ice
};
const LIST = Object.values(PAL).map(h => [h, parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const hex2 = (n) => ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2);
const rgbHex = (r, g, b) => '#' + hex2(r) + hex2(g) + hex2(b);
const DARKS = LIST.filter(([h]) => [P.ink, P.abyss, P.night, P.indigo, P.dusk].includes(h));
function nearest(r, g, b) {
  const set = (0.3 * r + 0.59 * g + 0.11 * b) < 64 ? DARKS : LIST;
  let best = set[0][0], bd = 1e9;
  for (const [h, R, G, B] of set) { const d = 2 * (r - R) ** 2 + 4 * (g - G) ** 2 + 3 * (b - B) ** 2; if (d < bd) { bd = d; best = h; } }
  return best;
}
const INPAL = new Set(Object.values(PAL));
// 已经是调色板色就原样返回（棕、深蓝这类暗色不能被「暗色就近」规则改走）
function palHex(r, g, b) { const h = rgbHex(r, g, b); return FIX[h] || (INPAL.has(h) ? h : nearest(r, g, b)); }
function parseColor(s) {
  s = s.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3})$/); if (m) { const t = m[1]; return [parseInt(t[0] + t[0], 16), parseInt(t[1] + t[1], 16), parseInt(t[2] + t[2], 16), 1]; }
  m = s.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/); if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), m[2] ? parseInt(m[2], 16) / 255 : 1];
  m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/); if (m) return [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]];
  return null;
}
function mapOne(s) {
  const c = parseColor(s); if (!c) return s;
  const h = palHex(c[0], c[1], c[2]);
  if (c[3] >= 0.999) return h;
  if (c[3] <= 0.001) return 'transparent';
  return 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + (+c[3].toFixed(2)) + ')';
}
const COLOR_RE = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)/g;
// 只换 {{ }} 之外的颜色
function mapCss(s) { return String(s).split(/(\{\{[^}]*\}\})/).map((seg, i) => (i % 2 ? seg : seg.replace(COLOR_RE, mapOne))).join(''); }
function splitTop(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur); return out; }
// 阴影部件：[{inset, lens:[x,y,blur,spread], color}]
function parseShadow(part) {
  const t = part.replace(/(\{\{[^}]*\}\}|rgba?\([^)]*\)|#[0-9a-fA-F]+)/g, ' $1 ').trim().split(/\s+/);
  const lens = [], o = { inset: false, color: '' };
  for (const k of t) { if (k === 'inset') o.inset = true; else if (/^-?[\d.]+(px)?$/.test(k)) lens.push(parseFloat(k)); else o.color = k; }
  o.lens = lens; return o;
}
const blurOf = (o) => (o.lens[2] || 0);
function colorsIn(s) { return (String(s).match(COLOR_RE) || []).map(parseColor).filter(Boolean); }
function flatGradient(s) {
  const cs = colorsIn(s); if (!cs.length) return s;
  const c = cs.find(c => c[3] > 0.3) || cs[0];
  return mapOne('rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + c[3] + ')');
}
// 模板阴影：丢掉所有模糊层；JS 发光：改成 3px 硬边光圈
function pixelBoxShadow(v, glowToRing) {
  const parts = splitTop(v).map(p => p.trim()).filter(Boolean), keep = [];
  for (const p of parts) {
    const o = parseShadow(p);
    if (blurOf(o) > 0) { if (glowToRing && !o.inset && o.color && !keep.length) keep.push('0 0 0 3px ' + mapCss(o.color)); continue; }
    keep.push(mapCss(p));
  }
  return keep.join(',');
}
function pixelTextShadow(v) {
  return splitTop(v).map(p => p.trim()).filter(p => p && blurOf(parseShadow(p)) === 0).map(mapCss).join(',');
}
function outlineShadow(u, col) {
  col = col || P.ink; const a = [];
  for (const [x, y] of [[u, 0], [-u, 0], [0, u], [0, -u], [u, u], [-u, u], [u, -u], [-u, -u]]) a.push(x + 'px ' + y + 'px 0 ' + col);
  a.push('0 ' + 2 * u + 'px 0 ' + col, u + 'px ' + 2 * u + 'px 0 ' + col, -u + 'px ' + 2 * u + 'px 0 ' + col);
  return a.join(',');
}
const RAMP = 'linear-gradient(180deg,#ffffff 0 22%,#fff3b0 22% 40%,#ffcf4a 40% 58%,#e0781f 58% 78%,#8c1f3a 78% 100%)';
const inkFilter = (u) => `drop-shadow(${u}px 0 0 #07060f) drop-shadow(-${u}px 0 0 #07060f) drop-shadow(0 -${u}px 0 #07060f) drop-shadow(0 ${2 * u}px 0 #07060f)`;
const FONT_PX = "'Fusion Pixel 12px Proportional SC'", FONT_NUM = "'Silkscreen'";
function mapFontFamily(v) {
  return v.replace(/(['"]?)Cinzel\1\s*,\s*(['"]?)Noto Serif SC\2\s*,\s*serif|(['"]?)Cinzel\3\s*,\s*serif|(['"]?)Cinzel\4/g, FONT_NUM + ',' + FONT_PX + ',monospace')
    .replace(/(^|,\s*|px\s+)(['"]?)Noto Serif SC\2/, '$1' + FONT_PX + ",'Noto Serif SC'");
}

const PJ = M.PJ = { __loaded: true, on: true, PAL, FIX, mapCss, mapOne, palHex, parseColor, pixelBoxShadow, pixelTextShadow, outlineShadow, flatGradient, mapFontFamily, RAMP, inkFilter, FONT_PX, FONT_NUM, noBlur: true };
try { if (W.localStorage && W.localStorage.getItem('mc-pj-off') === '1') PJ.on = false; } catch (e) {}

// ───────── JS 视图里的颜色（稀有度、按钮底色、发光）也过一遍调色板 ─────────
const cache = new Map(), NOGLOW = '0 0 0 0 transparent';
function mapVal(key, v) {
  const ck = (/glow/i.test(key) ? 'g|' : '') + v; let r = cache.get(ck); if (r !== undefined) return r;
  r = v;
  // 发光值会拼在别的阴影后面（模板里「墨框,{{glow}}」），空值要换成合法的透明阴影
  if (/glow/i.test(key) && (v === 'none' || !v.trim())) { cache.set(ck, NOGLOW); return NOGLOW; }
  if (/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(v)) {
    if (/^\s*(linear|radial|conic)-gradient\(/.test(v) && v.indexOf('{{') < 0) r = flatGradient(v);
    else if (/\d+px/.test(v) && /(^|,)\s*(inset\s+)?-?\d/.test(v)) r = pixelBoxShadow(v, /glow/i.test(key)) || (/glow/i.test(key) ? NOGLOW : 'none');
    else r = mapCss(v);
  }
  if (cache.size > 8000) cache.clear(); cache.set(ck, r); return r;
}
let budget = 0;
function walk(o, depth) {
  if (depth > 6 || o == null || --budget < 0) return o;
  if (Array.isArray(o)) { let ch = false; const a = o.map(x => { const y = walk(x, depth + 1); if (y !== x) ch = true; return y; }); return ch ? a : o; }
  if (typeof o !== 'object' || o.$$typeof || o.current !== undefined || o instanceof (W.Node || function () {}) || Object.getPrototypeOf(o) !== Object.prototype) return o;
  let out = null;
  for (const k in o) {
    const v = o[k]; let nv = v;
    if (typeof v === 'string') nv = mapVal(k, v);
    else if (v && typeof v === 'object') nv = walk(v, depth + 1);
    if (nv !== v) { if (!out) out = Object.assign({}, o); out[k] = nv; }
  }
  return out || o;
}
const CRT = { '#ffcf4a': '#47d6c1', '#f4efe0': '#bff7f0', '#a9a3c9': '#47d6c1', '#fff3b0': '#bff7f0', '#3d3a8c': '#1f8f8a' };
function crtWalk(o, d) {
  if (d > 5 || o == null || --budget < 0) return o;
  if (typeof o === 'string') return o.replace(/#[0-9a-f]{6}\b/gi, (h) => CRT[h.toLowerCase()] || h);
  if (Array.isArray(o)) return o.map(x => crtWalk(x, d + 1));
  if (typeof o !== 'object' || Object.getPrototypeOf(o) !== Object.prototype) return o;
  const out = {}; for (const k in o) out[k] = typeof o[k] === 'function' ? o[k] : crtWalk(o[k], d + 1); return out;
}
function hookView() {
  const G = M.Game; if (!G || !G.prototype.view || G.prototype.view.__pj) return false;
  const orig = G.prototype.view;
  const v = function () { const r = orig.apply(this, arguments); budget = 6000; if (!PJ.on) return r; const o = walk(r, 0); if (o && o.set) { budget = 3000; o.set = crtWalk(o.set, 0); } return o; };
  v.__pj = true; G.prototype.view = v; return true;
}
if (W.setInterval) { const iv = W.setInterval(() => { if (hookView()) W.clearInterval(iv); }, 50); }

if (typeof document === 'undefined') return;

// ───────── 字体 ─────────
function addLink(href) { if (document.querySelector('link[href="' + href + '"]')) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); }
addLink('https://cdn.jsdelivr.net/npm/@fontsource/fusion-pixel-12px-proportional-sc@5/index.css');
addLink('https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap');
if (document.fonts && document.fonts.load) setTimeout(() => { document.fonts.load('24px ' + FONT_PX, '午夜机台第天代币生命技能开始0123456789').catch(() => {}); document.fonts.load('24px ' + FONT_NUM, '0123456789').catch(() => {}); }, 0);

// ───────── 画布：字体换成像素字，去掉模糊发光 ─────────
const CP = W.CanvasRenderingContext2D && W.CanvasRenderingContext2D.prototype;
if (CP && PJ.on) {
  const fd = Object.getOwnPropertyDescriptor(CP, 'font');
  if (fd && fd.set) Object.defineProperty(CP, 'font', { configurable: true, get() { return fd.get.call(this); },
    set(v) { fd.set.call(this, typeof v === 'string' && v.indexOf('Fusion') < 0 ? mapFontFamily(v).replace(/\b(bold|[6-9]00)\b/g, '400') : v); } });
  const bd = Object.getOwnPropertyDescriptor(CP, 'shadowBlur');
  if (bd && bd.set) Object.defineProperty(CP, 'shadowBlur', { configurable: true, get() { return bd.get.call(this); }, set(v) { bd.set.call(this, PJ.noBlur ? 0 : v); } });
}

// ───────── 机台数码：手绘 5×7 点阵数字 <mc-num v="1234"> ─────────
const GL = {
  '0': ['.###.', '##.##', '##.##', '##.##', '##.##', '##.##', '.###.'],
  '1': ['.##.', '###.', '.##.', '.##.', '.##.', '.##.', '####'],
  '2': ['.###.', '##.##', '...##', '..##.', '.##..', '##...', '#####'],
  '3': ['####.', '...##', '...##', '.###.', '...##', '...##', '####.'],
  '4': ['...##', '..###', '.#.##', '#..##', '#####', '...##', '...##'],
  '5': ['#####', '##...', '####.', '...##', '...##', '##.##', '.###.'],
  '6': ['.###.', '##...', '##...', '####.', '##.##', '##.##', '.###.'],
  '7': ['#####', '...##', '..##.', '..##.', '.##..', '.##..', '.##..'],
  '8': ['.###.', '##.##', '##.##', '.###.', '##.##', '##.##', '.###.'],
  '9': ['.###.', '##.##', '##.##', '.####', '...##', '...##', '.###.'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '-': ['....', '....', '....', '####', '....', '....', '....'],
  '×': ['.....', '##.##', '.###.', '..#..', '.###.', '##.##', '.....'],
  '=': ['....', '....', '####', '....', '####', '....', '....'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
  '.': ['..', '..', '..', '..', '..', '##', '##'],
  ',': ['..', '..', '..', '..', '..', '##', '#.'],
  ':': ['..', '##', '##', '..', '##', '##', '..'],
  '/': ['...#', '...#', '..#.', '.##.', '.#..', '#...', '#...'],
  'k': ['##..', '##..', '##.#', '####', '###.', '##.#', '##.#'],
  'm': ['.......', '.......', '###.##.', '##.#.##', '##.#.##', '##.#.##', '##.#.##'],
  'v': ['.....', '.....', '##.##', '##.##', '##.##', '.###.', '..#..'],
  ' ': ['..', '..', '..', '..', '..', '..', '..']
};
GL.x = GL['×']; GL.K = GL.k; GL['*'] = GL['×']; GL['−'] = GL['-'];
PJ.GLYPHS = GL;
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function shades(hex) {
  const c = hexRgb(hex);
  let hi = palHex(...mix(c, [255, 255, 255], 0.45)), lo = palHex(...mix(c, [7, 6, 15], 0.4));
  if (hi === hex) hi = rgbHex(...mix(c, [255, 255, 255], 0.45));
  if (lo === hex) lo = rgbHex(...mix(c, [7, 6, 15], 0.4));
  return { face: hex, hi, lo };
}
PJ.shades = shades;
// 画进 canvas：1 格 = 1 画布像素，CSS 放大 u 倍（image-rendering:pixelated）
function drawNum(cv, text, hex, u, flash) {
  const gs = [...text].map(ch => GL[ch]); if (gs.some(g => !g)) return false;
  let w = 2; gs.forEach((g, i) => { w += g[0].length + (i ? 1 : 0); });
  const h = 7 + 3;
  cv.width = w; cv.height = h; cv.style.width = w * u + 'px'; cv.style.height = h * u + 'px';
  const x = cv.getContext('2d'); x.clearRect(0, 0, w, h);
  const on = new Uint8Array(w * h); let ox = 1;
  gs.forEach((g, i) => { if (i) ox++; g.forEach((row, y) => { for (let k = 0; k < row.length; k++) if (row[k] === '#') on[(y + 1) * w + ox + k] = 1; }); ox += g[0].length; });
  const S = flash ? { face: '#ffffff', hi: '#ffffff', lo: P.butter } : shades(hex);
  x.fillStyle = P.ink;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
    let hit = false;
    for (let dy = -1; dy <= 2 && !hit; dy++) for (let dx = -1; dx <= 1 && !hit; dx++) { const yy = y - dy, xx = i - dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w && on[yy * w + xx] && !(dy === 2 && dx !== 0)) hit = true; }
    if (hit) x.fillRect(i, y, 1, 1);
  }
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) if (on[y * w + i]) { x.fillStyle = y <= 1 ? S.hi : y >= 6 ? S.lo : S.face; x.fillRect(i, y, 1, 1); }
  return true;
}
PJ.drawNum = drawNum;
if (W.customElements && !W.customElements.get('mc-num')) {
  class McNum extends HTMLElement {
    static get observedAttributes() { return ['v', 'style']; }
    connectedCallback() {
      if (!this.cv) { this.cv = document.createElement('canvas'); this.cv.style.cssText = 'display:block;image-rendering:pixelated;image-rendering:crisp-edges'; this.tx = document.createElement('span'); }
      if (!this.style.display) this.style.display = 'inline-block';
      this.style.lineHeight = '0'; this.render(true);
    }
    attributeChangedCallback(n, a, b) { if (this.isConnected && a !== b && !this.busy) this.render(n === 'style'); }
    render(quiet) { this.busy = true; try { this.render1(quiet); } finally { this.busy = false; } }
    render1(quiet) {
      const v = (this.getAttribute('v') || '').trim(), cs = getComputedStyle(this);
      const fs = parseFloat(cs.fontSize) || 24, u = Math.max(1, Math.round(fs / 10));
      const c = parseColor(cs.color) || [244, 239, 224, 1], hex = PJ.on ? palHex(c[0], c[1], c[2]) : rgbHex(c[0], c[1], c[2]);
      const changed = this.last !== undefined && v !== this.last && !quiet;
      const ok = PJ.on && drawNum(this.cv, v, hex, u, changed);
      if (ok) { if (this.tx.parentNode) this.tx.remove(); if (this.cv.parentNode !== this) this.appendChild(this.cv); this.style.lineHeight = '0'; }
      else { if (this.cv.parentNode) this.cv.remove(); this.tx.textContent = v; this.tx.style.cssText = 'line-height:1.1;text-shadow:3px 3px 0 #07060f'; if (this.tx.parentNode !== this) this.appendChild(this.tx); this.style.lineHeight = ''; }
      const key = v + '|' + hex + '|' + u + '|' + ok; if (key === this.key && !changed) { this.last = v; return; } this.key = key;
      if (changed && ok) {
        const now = performance.now();
        if (!this.popT || now - this.popT > 140) {
          this.popT = now;
          if (this.animate && !PJ.reduced) this.animate([{ transform: 'scale(1.45) translateY(-2px)' }, { transform: 'scale(0.9)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1)' });
        }
        clearTimeout(this.fT); this.fT = setTimeout(() => drawNum(this.cv, v, hex, u, false), 70);
      }
      this.last = v;
    }
  }
  W.customElements.define('mc-num', McNum);
}

// ───────── 界面打击感：按下形变 + 像素迸发 + 硬边冲击框 ─────────
PJ.reduced = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
const stageEl = () => document.querySelector('[data-pj-stage]');
// 舞台是 overflow:hidden，但 scrollIntoView / 焦点仍会把它卷走一截：有位移就归零
document.addEventListener('scroll', (ev) => { const st = ev.target; if (st && st.nodeType === 1 && st.hasAttribute && st.hasAttribute('data-pj-stage') && (st.scrollLeft || st.scrollTop)) st.scrollTo(0, 0); }, true);
let layer = null;
function fxLayer(st) {
  if (layer && layer.parentNode === st) return layer;
  layer = document.createElement('div'); layer.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;pointer-events:none;z-index:2000;overflow:hidden';
  st.appendChild(layer); return layer;
}
const BURST = [P.gold, P.butter, P.cream, P.white, P.amber];
function burst(st, x, y, accent) {
  const L = fxLayer(st), parts = [], n = 12;
  const ring = document.createElement('div');
  ring.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0;box-shadow:0 0 0 6px ${P.white},0 0 0 12px ${P.ink}`;
  L.appendChild(ring);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div'), s = [9, 12, 15][i % 3], a = (i / n) * Math.PI * 2 + Math.random() * 0.5, sp = 380 + Math.random() * 520;
    const col = i % 4 === 0 && accent ? accent : BURST[i % BURST.length];
    d.style.cssText = `position:absolute;left:0;top:0;width:${s}px;height:${s}px;background:${col};box-shadow:0 0 0 3px ${P.ink}`;
    L.appendChild(d); parts.push({ d, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 260, x, y });
  }
  const t0 = performance.now();
  const step = (t) => {
    const e = (t - t0) / 1000;
    if (e > 0.5) { parts.forEach(p => p.d.remove()); ring.remove(); return; }
    const r = Math.round((e * 260 + 12)), ra = e < 0.16;
    ring.style.display = ra ? 'block' : 'none';
    ring.style.left = x - r + 'px'; ring.style.top = y - r + 'px'; ring.style.width = ring.style.height = 2 * r + 'px';
    ring.style.boxShadow = `inset 0 0 0 6px ${e < 0.05 ? P.white : P.gold},0 0 0 3px ${P.ink}`;
    for (const p of parts) {
      const px = p.x + p.vx * e, py = p.y + p.vy * e + 1400 * e * e;
      p.d.style.transform = `translate(${Math.round(px)}px,${Math.round(py)}px)`;
      p.d.style.opacity = e > 0.36 ? (Math.floor((0.5 - e) / 0.035) % 2 ? '1' : '0') : '1';
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function pressable(t, st) {
  for (let el = t; el && el !== st; el = el.parentElement) {
    if (el.tagName === 'CANVAS') return null;
    if (el.nodeType === 1 && getComputedStyle(el).cursor === 'pointer') return el;
  }
  return null;
}
PJ.burst = burst;

// ───────── 设计稿落地：机箱面板、扫光按键、跑马灯、逐字跳标题、动画部队、像素战旗、领袖半身像 ─────────
const CSS = `
@keyframes pjWave{0%,100%{transform:translateY(0)}25%{transform:translateY(-0.14em)}50%{transform:translateY(0)}75%{transform:translateY(0.05em)}}
@keyframes pjChase{from{background-position:0 0}to{background-position:24px 0}}
@keyframes pjShine{0%{left:-40px}60%,100%{left:110%}}
@keyframes pjBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes pjHop{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}
@keyframes pjLamp{0%,100%{background:#ffcf4a}50%{background:#e0781f}}
@keyframes pjScan{from{background-position:0 0}to{background-position:0 12px}}
@keyframes pjBlink{0%,100%{opacity:1}50%{opacity:.25}}
[data-pj~=plate]{position:relative}
[data-pj~=plate]::before,[data-pj~=plate]::after{content:'';position:absolute;left:12px;right:12px;height:9px;pointer-events:none;z-index:1;background:linear-gradient(90deg,#c4ccd9 0 3px,#8791a6 3px 9px,transparent 9px calc(100% - 9px),#c4ccd9 calc(100% - 9px) calc(100% - 6px),#8791a6 calc(100% - 6px))}
[data-pj~=plate]::before{top:12px}[data-pj~=plate]::after{bottom:15px}
[data-pj~=cta]{position:relative;overflow:hidden}
[data-pj~=cta]::after{content:'';position:absolute;top:0;bottom:0;left:-40px;width:24px;background:#ffffff;opacity:.55;transform:skewX(-20deg);animation:pjShine 2.4s ease-in-out infinite;pointer-events:none}
[data-pj~=marquee]{position:relative}
[data-pj~=marquee]::before,[data-pj~=marquee]::after{content:'';position:absolute;left:9px;right:9px;height:6px;pointer-events:none;background:repeating-linear-gradient(90deg,#fff3b0 0 6px,transparent 6px 12px,#e0781f 12px 18px,transparent 18px 24px);animation:pjChase .5s linear infinite}
[data-pj~=marquee]::before{top:-12px}[data-pj~=marquee]::after{bottom:-12px;animation-direction:reverse}
[data-pj~=crt]{position:relative}
[data-pj~=crt]::after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(7,6,15,.4) 0 3px,transparent 3px 6px);animation:pjScan .4s linear infinite}
[data-pj~=ticket]{position:relative}
[data-pj~=ticket]::after{content:'';position:absolute;left:0;right:0;bottom:-18px;height:18px;pointer-events:none;background:repeating-linear-gradient(135deg,#f4efe0 0 9px,transparent 9px 18px),repeating-linear-gradient(45deg,#f4efe0 0 9px,transparent 9px 18px)}
[data-pj~=choice]:hover::before{content:'\\25B6';color:#ffcf4a;display:inline-block;animation:pjHop .6s ease-in-out infinite}
[data-pj~=bob]{animation:pjBob 1s ease-in-out infinite}
@keyframes pjPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}
@keyframes pjPop{0%{transform:scale(0.4) rotate(-14deg)}40%{transform:scale(1.3) rotate(-10deg)}70%{transform:scale(0.92) rotate(-12deg)}100%{transform:scale(1) rotate(-12deg)}}
@keyframes pjRise{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-60px);opacity:0}}
/* —— 设计稿组件（docs/design.md §11.5）：只管外观，位置和大小留在各自的 style 里 —— */
[data-pj~=panel]{background:#1a1640!important;border:0!important;border-radius:0!important;box-shadow:0 -3px 0 0 #07060f,0 3px 0 0 #07060f,-3px 0 0 0 #07060f,3px 0 0 0 #07060f,inset 0 3px 0 0 #3d3a8c,inset 3px 0 0 0 #3d3a8c,inset 0 -6px 0 0 #0d0b1e,inset -3px 0 0 0 #0d0b1e,12px 12px 0 0 #07060f!important}
[data-pj~=card]{border:0!important;box-shadow:0 -3px 0 0 #07060f,0 3px 0 0 #07060f,-3px 0 0 0 #07060f,3px 0 0 0 #07060f,inset 0 0 0 3px var(--q,#3d3a8c),9px 9px 0 0 #07060f!important}
[data-pj~=tab]{position:absolute;left:36px;top:-27px;z-index:2;display:flex;align-items:center;gap:14px;padding:8px 24px 10px;background:#8c1f3a;color:#fff3b0;box-shadow:0 -3px 0 0 #07060f,0 3px 0 0 #07060f,-3px 0 0 0 #07060f,3px 0 0 0 #07060f,inset 0 3px 0 0 #e8434f,inset 0 -6px 0 0 #4f2f22;text-shadow:3px 3px 0 #07060f;white-space:nowrap}
[data-pj~=subtab]{position:absolute;left:24px;top:-21px;z-index:2;padding:6px 18px;font-size:28px;color:#fff3b0;background:#2b2461;box-shadow:0 0 0 3px #07060f,inset 0 3px 0 0 #3d3a8c;text-shadow:3px 3px 0 #07060f;white-space:nowrap}
[data-pj~=chip]{padding:2px 10px;font-size:20px;color:#07060f!important;text-shadow:none!important;border:0!important;box-shadow:0 -3px 0 0 #07060f,0 3px 0 0 #07060f,-3px 0 0 0 #07060f,3px 0 0 0 #07060f,inset 0 -3px 0 0 rgba(7,6,15,.35)}
[data-pj~=close]{width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#a9a3c9;background:#2b2461;box-shadow:0 0 0 3px #07060f;cursor:pointer}
[data-pj~=close]:hover{color:#fff3b0;background:#3d3a8c;box-shadow:0 0 0 3px #ffcf4a}
[data-pj~=well]{background:#0d0b1e!important;border:0!important;box-shadow:0 0 0 3px var(--q,#3d3a8c),inset 0 -9px 0 0 #07060f!important}
[data-pj~=ink]{background:#07060f!important;border:0!important;box-shadow:0 0 0 3px var(--q,#3d3a8c)!important}
[data-pj~=opt]{background:#0d0b1e!important;border:0!important;box-shadow:0 0 0 3px var(--q,#3d3a8c)!important;cursor:pointer}
[data-pj~=opt]:hover,[data-pj~=opt][data-on=true]{background:#2b2461!important;box-shadow:0 0 0 3px #ffcf4a,6px 6px 0 3px #07060f!important;translate:-3px -3px;filter:none!important}
[data-pj~=ring]{border:0!important;box-shadow:0 0 0 3px var(--q,#3d3a8c)!important;cursor:pointer}
[data-pj~=ring]:hover{box-shadow:0 0 0 3px #ffcf4a,6px 6px 0 3px #07060f!important;translate:-3px -3px}
[data-pj~=div]{height:3px!important;background:repeating-linear-gradient(90deg,#3d3a8c 0 6px,transparent 6px 12px)!important;border:0!important}
[data-pj~=key]{position:relative;overflow:hidden;cursor:pointer;border:0!important;text-shadow:none!important;background:var(--kf)!important;color:var(--kt,#07060f)!important;box-shadow:0 -3px 0 0 #07060f,0 3px 0 0 #07060f,-3px 0 0 0 #07060f,3px 0 0 0 #07060f,inset 0 6px 0 0 var(--kh),inset 0 -9px 0 0 var(--kl),0 9px 0 0 #07060f!important;transition:none!important}
[data-pj~=key]:hover{translate:0 -3px;filter:none!important}
[data-pj~=key]:active{translate:0 9px;box-shadow:0 -3px 0 0 #07060f,0 3px 0 0 #07060f,-3px 0 0 0 #07060f,3px 0 0 0 #07060f,inset 0 6px 0 0 rgba(7,6,15,.45)!important}
[data-pj~=gold]{--kf:#ffcf4a;--kh:#fff3b0;--kl:#e0781f;--kt:#07060f}
[data-pj~=teal]{--kf:#47d6c1;--kh:#bff7f0;--kl:#1f8f8a;--kt:#07060f}
[data-pj~=red]{--kf:#e8434f;--kh:#ff9aa8;--kl:#8c1f3a;--kt:#07060f}
[data-pj~=violet]{--kf:#b86bff;--kh:#ff6bd6;--kl:#6a2fbf;--kt:#07060f}
[data-pj~=dark]{--kf:#2b2461;--kh:#3d3a8c;--kl:#1a1640;--kt:#f4efe0}
[data-pj~=dis]{--kf:#1a1640;--kh:#2b2461;--kl:#0d0b1e;--kt:#6a6394}
[data-pj~=dark][data-pj~=key]{box-shadow:0 -3px 0 0 #07060f,0 3px 0 0 #07060f,-3px 0 0 0 #07060f,3px 0 0 0 #07060f,inset 0 3px 0 0 #3d3a8c,inset 0 -9px 0 0 #1a1640,0 9px 0 0 #07060f!important;text-shadow:3px 3px 0 #07060f!important}
[data-pj~=dark][data-pj~=key]:hover{--kf:#3d3a8c;--kt:#fff3b0;box-shadow:0 -3px 0 0 #ffcf4a,0 3px 0 0 #ffcf4a,-3px 0 0 0 #ffcf4a,3px 0 0 0 #ffcf4a,inset 0 3px 0 0 #6a6394,inset 0 -9px 0 0 #2b2461,0 9px 0 0 #07060f!important}
[data-pj~=key]:active{--kf:#1a1640;--kt:#a9a3c9}
[data-pj~=pulse]{animation:pjPulse 1s ease-in-out infinite}
[data-pj~=coin]{display:inline-block;flex:none;width:var(--s,30px);height:var(--s,30px);background:#ffcf4a;box-shadow:inset 6px 6px 0 0 #fff3b0,inset -6px -6px 0 0 #e0781f,0 0 0 3px #07060f}
[data-pj~=hop]{display:inline-block;animation:pjHop .6s ease-in-out infinite}
[data-pj~=blink]{animation:pjBlink 1s ease-in-out infinite}
[data-pj~=pop]{animation:pjPop .5s ease-in-out both}
[data-pj~=dither]{background:repeating-conic-gradient(#1a1640 0 25%,#0d0b1e 0 50%) 0 0/6px 6px!important}
[data-pj~=paper]{background:#f4efe0!important;color:#07060f;box-shadow:inset 6px 0 0 0 #a9a3c9,12px 12px 0 0 #07060f!important;border:0!important}
[data-pj~=opt]:hover [data-pj~=cur],[data-pj~=opt][data-on=true] [data-pj~=cur]{color:#ffcf4a!important;text-shadow:3px 3px 0 #07060f!important;animation:pjHop .6s ease-in-out infinite}
[data-pj~=cur]{display:inline-block;color:transparent;text-shadow:none!important}
[data-pj~=lnk]{cursor:pointer}[data-pj~=lnk]:hover{color:#fff3b0!important}[data-pj~=lnk]:hover [data-pj~=cur]{color:#ffcf4a!important;text-shadow:3px 3px 0 #07060f!important;animation:pjHop .6s ease-in-out infinite}
`;
if (PJ.on) { const st = document.createElement('style'); st.id = 'pj-css'; st.textContent = PJ.reduced ? CSS.replace(/animation:[^;}]+/g, 'animation:none') : CSS; (document.head || document.documentElement).appendChild(st); }

// spriteURL 反查：data URL → 精灵 key
const URL2KEY = new Map();
function wrapSprite(o) { if (!o || o.__pj) return o; const f = function (k, s) { const u = o.apply(this, arguments); if (!URL2KEY.has(u)) URL2KEY.set(u, k); return u; }; f.__pj = true; return f; }
{ let cur = M.spriteURL ? wrapSprite(M.spriteURL) : undefined; Object.defineProperty(M, 'spriteURL', { configurable: true, enumerable: true, get() { return cur; }, set(v) { cur = wrapSprite(v); } }); }
PJ.keyOf = (u) => URL2KEY.get(u);

const RAMP_STOPS = PJ.RAMP;
function defineEl(name, cls) { if (!customElements.get(name)) customElements.define(name, cls); }

// 逐字跳标题 <mc-wave t="…" ramp="1">
defineEl('mc-wave', class extends HTMLElement {
  static get observedAttributes() { return ['t']; }
  connectedCallback() { this.style.display = 'inline-flex'; this.style.whiteSpace = 'pre'; this.render(); }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  render() {
    const t = this.getAttribute('t') || ''; if (t === this._t) return; this._t = t; this.textContent = '';
    const ramp = this.getAttribute('ramp') === '1', chars = [...t];
    chars.forEach((ch, i) => {
      const s = document.createElement('span'); s.textContent = ch;
      s.style.cssText = 'display:inline-block;' + (ch.trim() && PJ.on && !PJ.reduced ? `animation:pjWave 1.2s ease-in-out infinite;animation-delay:${-(chars.length - i) * 0.12}s;` : '') + (ramp ? `background:${RAMP_STOPS};-webkit-background-clip:text;background-clip:text;color:transparent;` : '');
      this.appendChild(s);
    });
  }
});

// 动画部队 <mc-anim src="{{spriteURL}}">：有 px16 骨骼就播放待机 + 偶尔攻击，没有就显示原图
const ANIMS = new Set();
let animRaf = 0;
function animTick(now) {
  animRaf = 0;
  for (const el of ANIMS) el.draw(now / 1000);
  if (ANIMS.size) animRaf = requestAnimationFrame(animTick);
}
defineEl('mc-anim', class extends HTMLElement {
  static get observedAttributes() { return ['src']; }
  connectedCallback() { if (!this.style.display) this.style.display = 'flex'; this.style.alignItems = 'flex-end'; this.style.justifyContent = 'center'; this.seed = Math.random() * 3; this.setup(); }
  disconnectedCallback() { ANIMS.delete(this); }
  attributeChangedCallback() { if (this.isConnected) this.setup(); }
  setup() {
    const src = this.getAttribute('src') || ''; if (src === this._s) return; this._s = src; this.textContent = ''; ANIMS.delete(this);
    if (!src || src.indexOf('{{') >= 0) return;
    const k = URL2KEY.get(src), P16 = M.P16;
    if (PJ.on && k && P16 && P16.spec && P16.spec(k) && P16.frame) {
      this.k = k; this.cv = document.createElement('canvas'); this.cv.style.cssText = 'display:block;image-rendering:pixelated;max-width:100%;max-height:100%';
      this.appendChild(this.cv); ANIMS.add(this); if (!animRaf) animRaf = requestAnimationFrame(animTick);
    } else { const im = document.createElement('img'); im.src = src; im.draggable = false; im.style.cssText = 'display:block;max-width:100%;max-height:100%;image-rendering:pixelated'; this.appendChild(im); }
  }
  draw(t) {
    const P16 = M.P16, ART = P16.ART || 1; t += this.seed;
    const cyc = t % 3.2, atk = cyc > 2.4, st = atk ? 'atk' : 'idle', f = atk ? Math.floor((cyc - 2.4) * 6.7) : Math.floor(t * 2.5) % 4;
    const key = st + f; if (key === this._f) return; this._f = key;
    const fr = P16.frame(this.k, st, f, { rim: atk ? 1 : 0 }); if (!fr) return;
    const W = this.clientWidth || 200, H = this.clientHeight || 180;
    if (!this.sc) {
      const bb = artBox(this.k, fr, ART);
      this.sc = Math.max(1, Math.min(8, Math.floor(Math.min(W * 0.92 / bb.w, H * 0.9 / bb.h))));
      this.cv.width = Math.floor(W / this.sc); this.cv.height = Math.floor(H / this.sc); this.cv.style.width = this.cv.width * this.sc + 'px'; this.cv.style.height = this.cv.height * this.sc + 'px'; this.bb = bb;
    }
    const x = this.cv.getContext('2d'), cw = this.cv.width, ch = this.cv.height; x.imageSmoothingEnabled = false; x.clearRect(0, 0, cw, ch);
    const bb = this.bb, dx = Math.round(cw / 2 - (bb.x + bb.w / 2)), dy = Math.round(ch - 2 - (bb.y + bb.h));
    x.fillStyle = 'rgba(7,6,15,0.55)'; x.fillRect(Math.round(cw / 2 - bb.w * 0.4), ch - 3, Math.round(bb.w * 0.8), 2);
    x.drawImage(fr, dx, dy, fr.artW, fr.artH);
  }
});
const BOX = {};
function artBox(k, fr, ART) {
  if (BOX[k]) return BOX[k];
  const w = fr.artW, h = fr.artH, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(fr, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) if (d[(y * w + i) * 4 + 3] > 40) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { x: 0, y: 0, w, h };
  return (BOX[k] = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
}
if (false) defineEl('mc-x', class extends HTMLElement {
  draw() {
  }
});

// 像素战旗 <mc-flag n="战旗名">：32×44，8 帧。旗面挂在横杆上，整幅随风摆，左右两边和两条燕尾各自飘
// 图案对应 M.LEGION 里的实际战旗：职业旗沿用职业图标的形状和颜色，其余按效果画。# 墨线，o 主色，+ 点缀色
const EMB = {
  vanguard: ['###########', '#oooo+oooo#', '#oooo+oooo#', '#oooo+oooo#', '#+++++++++#', '#oooo+oooo#', '.#ooo+ooo#.', '.#ooo+ooo#.', '..#oo+oo#..', '...#o+o#...', '....###....'],
  warrior: ['.....#.....', '....#o#....', '....#o#....', '....#o#....', '....#o#....', '....#o#....', '.#########.', '.#+++++++#.', '.####+####.', '....#+#....', '....###....'],
  archer: ['..##.......', '..#o#......', '..#.o#.....', '..#..o#....', '#.#...o#.#.', '###########', '#.#...o#.#.', '..#..o#....', '..#.o#.....', '..#o#......', '..##.......'],
  mage: ['......###..', '..+..#ooo#.', '.+++.#o+o#.', '..+..#ooo#.', '......###..', '.....##....', '....##.....', '...##......', '..##.......', '.##........', '##.........'],
  priest: ['...#####...', '..#ooooo#..', '.#ooo#ooo#.', '#oooo#oooo#', '#oo#####oo#', '#oooo#oooo#', '#oooo#oooo#', '#oooo#oooo#', '.#ooo#ooo#.', '..#ooooo#..', '...#####...'],
  merchant: ['..#######..', '...#ooo#...', '....###....', '...#ooo#...', '..#ooooo#..', '.#oo###oo#.', '#oo#+++#oo#', '#oo#+++#oo#', '#oo#+++#oo#', '.#oo###oo#.', '..#######..'],
  zeal: ['##.......##', '#o#.....#o#', '.#o#...#o#.', '..#o#.#o#..', '...#o#o#...', '....#o#....', '...#o#o#...', '..#o#.#o#..', '.#o#...#o#.', '#o#.....#o#', '##.......##'],
  bounty: ['...........', '...#####...', '..#ooooo#..', '.#ooooooo#.', '.#o##o##o#.', '.#o##o##o#.', '.#ooo#ooo#.', '..#ooooo#..', '...#o#o#...', '...#####...', '...........'],
  bulwark: ['###.###.###', '#o#.#o#.#o#', '#o###o###o#', '#ooooooooo#', '#ooooooooo#', '#ooo###ooo#', '#oo#####oo#', '#oo#####oo#', '#oo#####oo#', '#oo#####oo#', '###########'],
  fury: ['.....#.....', '....#o#....', '....#o#....', '...#ooo#...', '..#ooooo#..', '.#ooooooo#.', '.#o+ooooo#.', '.#o+ooooo#.', '.#oo+oooo#.', '..#ooooo#..', '...#####...'],
  crown: ['...........', '#....#....#', '##..#o#..##', '#o#.#o#.#o#', '#oo#ooo#oo#', '#ooooooooo#', '#ooooooooo#', '###########', '#o+ooooo+o#', '###########', '...........']
};
// [旗面, 暗面, 亮边, o, +, 饰带]；没有对应战旗时用素旗
const FLAGS = {
  vanguard: [P.blue, P.blueDeep, P.ice, P.silver, P.blueDeep, P.gold],
  warrior: [P.red, P.wine, P.pink, P.silver, P.gold, P.gold],
  archer: [P.gold, P.amber, P.butter, P.brown, P.butter, P.amber],
  mage: [P.violet, P.violetDeep, P.magenta, P.ice, P.butter, P.gold],
  priest: [P.green, P.greenDeep, P.lime, P.butter, P.gold, P.gold],
  merchant: [P.amber, P.brown, P.gold, P.butter, P.gold, P.butter],
  zeal: [P.magenta, P.violetDeep, P.pink, P.butter, P.gold, P.gold],
  bounty: [P.cream, P.tan, P.white, P.white, P.red, P.red],
  bulwark: [P.steel, P.slate, P.silver, P.silver, P.ice, P.gold],
  fury: [P.wine, P.umber, P.red, P.red, P.pink, P.gold],
  crown: [P.teal, P.tealDeep, P.ice, P.gold, P.red, P.gold]
};
const FLAG_PLAIN = [P.dusk, P.indigo, P.lavender, P.cream, P.cream, P.gold];
const FLAG_N = 8, FW = 32, FH = 44;
// 夜市卡上的名字带品质后缀，如「法师战旗（稀有）」
const legionKey = (n) => { const L = W.MC && W.MC.LEGION, s = n.replace(/[（(].*$/, '').replace('战旗', '').trim(); if (L) for (const k in L) if (L[k].name.replace('战旗', '') === s) return k; return ''; };
const flagCache = {};
function flagSheet(n) {
  if (flagCache[n]) return flagCache[n];
  const k = legionKey(n), [cloth, shade, hi, cO, cP, band] = FLAGS[k] || FLAG_PLAIN, em = EMB[k];
  // 旗面贴图 tex[v][u]（燕尾缺口处为 null）；plain 标记可以被褶皱压暗的素面
  const CW = 17, CH = 31, cu = (CW - 1) / 2, TAU = Math.PI * 2;
  const bottom = (u) => { const dm = Math.abs(u - cu); return CH - 1 - (dm < 3.5 ? Math.round(6 - dm * 1.6) : 0); };
  const tex = [], plain = [];
  for (let v = 0; v < CH; v++) {
    const tr = [], pr = [];
    for (let u = 0; u < CW; u++) {
      const b = bottom(u); let c = null, p = false;
      if (v <= b) {
        c = cloth; p = true;
        if (u === 0 || v === 0) { c = hi; p = false; }
        if (u >= CW - 2 || v >= b - 1) { c = shade; p = false; }
        if ((v === 2 || v === 21) && u > 0 && u < CW - 1) { c = band; p = false; }
      }
      tr.push(c); pr.push(p);
    }
    tex.push(tr); plain.push(pr);
  }
  if (em) em.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch !== '.') { tex[6 + y][3 + x] = ch === '#' ? P.ink : ch === 'o' ? cO : cP; plain[6 + y][3 + x] = false; } } });
  const o = document.createElement('canvas'); o.width = FW * FLAG_N; o.height = FH; const x = o.getContext('2d');
  const L0 = 10, T0 = 7;
  for (let f = 0; f < FLAG_N; f++) {
    const ph = f / FLAG_N * TAU, g = [], m = [];
    for (let y = 0; y < FH; y++) { g.push(new Array(FW).fill(null)); m.push(new Array(FW).fill(false)); }
    const put = (px, py, c) => { if (px >= 0 && px < FW && py >= 0 && py < FH) g[py][px] = c; };
    // 旗杆 + 横杆
    for (let y = 2; y < FH; y++) { put(4, y, P.ink); put(5, y, P.brown); put(6, y, P.ink); }
    put(4, 0, P.ink); put(5, 0, P.gold); put(6, 0, P.ink); put(3, 1, P.ink); put(4, 1, P.gold); put(5, 1, P.butter); put(6, 1, P.gold); put(7, 1, P.ink);
    for (let xx = 3; xx < 30; xx++) { put(xx, 4, P.ink); put(xx, 5, P.tan); put(xx, 6, P.ink); } put(29, 5, P.gold); put(30, 5, P.ink);
    // 两条燕尾轮流上扬 1 格
    const liftL = Math.sin(ph * 2 + 0.5) > 0.35 ? 1 : 0, liftR = Math.sin(ph * 2 + 2.9) > 0.35 ? 1 : 0;
    for (let v = 0; v < CH; v++) {
      // 图案那几行整块一起动，不被逐行错开
      const vw = v >= 6 && v <= 16 ? 11 : v, t = vw / (CH - 1), amp = 2 * Math.pow(t, 1.3), wv = TAU * vw / 18 - ph;
      const dx = Math.round(amp * Math.sin(wv)), fold = amp * Math.cos(wv) < -1;
      // 左右两边各有自己的波纹：向外鼓出（复制边色）或向里收
      const te = v / (CH - 1), eL = Math.round(1.1 * te * Math.sin(TAU * v / 15 - ph * 2 + 1)), eR = Math.round(1.1 * te * Math.sin(TAU * v / 17 - ph * 2 + 2.6));
      const x0 = L0 + dx;
      for (let px = x0 - eL; px <= x0 + CW - 1 + eR; px++) {
        const u = Math.max(0, Math.min(CW - 1, px - x0)), vs = v > CH - 10 ? Math.min(CH - 1, v + (u < cu ? liftL : u > cu ? liftR : 0)) : v;
        let c = tex[vs][u]; if (!c) continue;
        if (fold && plain[vs][u]) c = shade;
        put(px, T0 + v, c); if (px >= 0 && px < FW) m[T0 + v][px] = true;
      }
    }
    // 墨色描边
    for (let y = T0; y < FH; y++) for (let xx = 0; xx < FW; xx++) {
      if (m[y][xx] || g[y][xx]) continue;
      if ((y > 0 && m[y - 1][xx]) || (y < FH - 1 && m[y + 1][xx]) || (xx > 0 && m[y][xx - 1]) || (xx < FW - 1 && m[y][xx + 1])) g[y][xx] = P.ink;
    }
    const ox = f * FW;
    for (let y = 0; y < FH; y++) for (let xx = 0; xx < FW; xx++) if (g[y][xx]) { x.fillStyle = g[y][xx]; x.fillRect(ox + xx, y, 1, 1); }
  }
  return (flagCache[n] = o.toDataURL());
}
PJ.flagSheet = flagSheet;
defineEl('mc-flag', class extends HTMLElement {
  static get observedAttributes() { return ['n']; }
  connectedCallback() { if (!this.style.display) this.style.display = 'block'; this.render(); }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  render() {
    const n = this.getAttribute('n') || ''; if (!n || n.indexOf('{{') >= 0 || n === this._n) return; this._n = n;
    const w = parseFloat(this.style.width) || 96, h = parseFloat(this.style.height) || 132;
    this.style.backgroundImage = 'url(' + flagSheet(n) + ')'; this.style.backgroundSize = (w * FLAG_N) + 'px ' + h + 'px'; this.style.imageRendering = 'pixelated';
    if (this.animate && !PJ.reduced) { if (this._a) this._a.cancel(); this._a = this.animate([{ backgroundPosition: '0 0' }, { backgroundPosition: -(w * FLAG_N) + 'px 0' }], { duration: FLAG_N * 110, iterations: Infinity, easing: 'steps(' + FLAG_N + ', end)', delay: -Math.random() * FLAG_N * 110 }); }
  }
});

// 领袖半身像 <mc-bust src="{{spriteURL}}">：有像素半身像就用，没有就用原精灵
defineEl('mc-bust', class extends HTMLElement {
  static get observedAttributes() { return ['src']; }
  connectedCallback() { if (!this.style.display) this.style.display = 'block'; this.style.overflow = 'hidden'; this.render(); }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  render() {
    const src = this.getAttribute('src') || ''; if (!src || src.indexOf('{{') >= 0 || src === this._s) return; this._s = src;
    const k = URL2KEY.get(src), BU = (W.MC && W.MC.PJ && W.MC.PJ.BUSTS) || PJ.BUSTS, bust = PJ.on && k && BU && BU[k];
    this.textContent = ''; const im = document.createElement('img'); im.draggable = false; im.src = bust || src;
    im.style.cssText = bust ? 'display:block;width:100%;height:100%;object-fit:cover;object-position:50% 20%;image-rendering:pixelated' : 'display:block;max-width:100%;max-height:100%;margin:auto;image-rendering:pixelated';
    this.appendChild(im);
  }
});
document.addEventListener('pointerdown', (ev) => {
  if (!PJ.on || PJ.reduced || ev.button > 0) return;
  const st = stageEl(); if (!st || !st.contains(ev.target)) return;
  const el = pressable(ev.target, st); if (!el) return;
  const r = st.getBoundingClientRect(), sc = r.width / 1920 || 1;
  const x = (ev.clientX - r.left) / sc, y = (ev.clientY - r.top) / sc;
  const cs = getComputedStyle(el), bc = parseColor(cs.backgroundColor), acc = bc && bc[3] > 0.5 ? palHex(bc[0], bc[1], bc[2]) : null;
  burst(st, x, y, acc);
  const base = cs.transform && cs.transform !== 'none' ? cs.transform + ' ' : '';
  if (el.animate && el.offsetWidth < 900) el.animate([{ transform: base + 'scale(1.06,0.88)' }, { transform: base + 'scale(0.96,1.06)' }, { transform: base + 'scale(1,1)' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1)' });
}, true);
})();
