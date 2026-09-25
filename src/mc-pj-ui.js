// ==== mc-pj-ui.js ====
// 设计稿组件的画布版（docs/design.md §11.5）：机箱面板、标题牌、街机按键、血条、品质签、招牌灯箱、网点压暗。
// 坐标一律是 1920×1080 舞台像素；颜色只用 Pixel Juice 调色板；硬边、无圆角、无模糊。
(function () {
const M = window.MC, PJ = M.PJ || {}, P = PJ.PAL || {};
const FONT = "'Fusion Pixel 12px Proportional SC','Noto Serif SC',serif", NUMF = "'Silkscreen','Fusion Pixel 12px Proportional SC',monospace";
// 字号阶梯（舞台像素）：标签 18 · 说明 22 · 正文 26 · 条目 30 · 按键 32 · 标题 40 · 数字 52 · 招牌 64
const T = { tag: 18, cap: 22, body: 26, item: 30, btn: 32, title: 40, num: 52, hero: 64 };
// 品质：面色 / 亮边 / 暗边
const Q = [[P.silver, P.white, P.steel], [P.teal, P.ice, P.tealDeep], [P.violet, P.magenta, P.violetDeep], [P.gold, P.butter, P.amber]];
// 按键：底色 / 上高光 / 下暗阶 / 字色
const BTN = { gold: [P.gold, P.butter, P.amber, P.ink], teal: [P.teal, P.ice, P.tealDeep, P.ink], red: [P.red, P.pink, P.wine, P.ink], dark: [P.indigo, P.dusk, P.night, P.cream], violet: [P.violet, P.magenta, P.violetDeep, P.ink] };
const R = (x, a, b, w, h, c) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
const pal = (c) => (typeof c === 'string' && PJ.on !== false && PJ.mapOne ? PJ.mapOne(c) : c);

const U = M.UI = PJ.ui = { T, Q, BTN, FONT, NUMF, R, pal };
U.font = (size, num) => size + 'px ' + (num ? NUMF : FONT);
// 渐变 → 硬边色带：按 n 段取样，每段一种调色板颜色（保留透明度）
const rgba = (s) => (PJ.parseColor && typeof s === 'string' ? PJ.parseColor(s) : null) || [0, 0, 0, 0];
function colorAt(stops, t) {
  if (t <= stops[0][0]) return stops[0][1]; for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const [p0, c0] = stops[i - 1], [p1, c1] = stops[i], k = p1 > p0 ? (t - p0) / (p1 - p0) : 0; return c0.map((v, j) => v + (c1[j] - v) * k); }
  return stops[stops.length - 1][1];
}
function band(g, stops, n) {
  const S = stops.map(([p, c]) => [p, rgba(c)]).sort((a, b) => a[0] - b[0]);
  for (let k = 0; k < n; k++) {
    const c = colorAt(S, (k + 0.5) / n), h = PJ.palHex ? PJ.palHex(c[0], c[1], c[2]) : '#000000', col = c[3] >= 0.99 ? h : c[3] < 0.02 ? 'rgba(0,0,0,0)' : 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + c[3].toFixed(2) + ')';
    g.addColorStop(k / n, col); g.addColorStop(k === n - 1 ? 1 : (k + 1) / n - 0.0001, col);
  }
  return g;
}
U.lg = (x, x0, y0, x1, y1, stops, n) => band(x.createLinearGradient(x0, y0, x1, y1), stops, n || 5);
U.rg = (x, a, b, r0, r1, stops, n) => band(x.createRadialGradient(a, b, r0, a, b, r1), stops, n || 4);
U.measure = (x, s, size, num) => { x.save(); x.font = U.font(size, num); const w = x.measureText(String(s)).width; x.restore(); return w; };
// 3px 墨框的实心块
U.box = (x, a, b, w, h, fill, ink) => { R(x, a - 3, b - 3, w + 6, h + 6, ink || P.ink); R(x, a, b, w, h, fill); };
// 文字：默认右下 3px 墨影；o.outline = 八向墨描边（大标题）；o.ramp = 果汁色带
U.text = (x, s, a, b, size, col, o = {}) => {
  s = String(s); x.save(); x.font = U.font(size, o.num); x.textAlign = o.align || 'center'; x.textBaseline = o.base || 'middle';
  const u = o.u || 3;
  if (o.outline) { x.fillStyle = P.ink; for (const [dx, dy] of [[u, 0], [-u, 0], [0, u], [0, -u], [u, u], [-u, u], [u, -u], [-u, -u], [0, 2 * u], [u, 2 * u], [-u, 2 * u]]) x.fillText(s, a + dx, b + dy); }
  else if (o.shadow !== false) { x.fillStyle = P.ink; x.fillText(s, a + u, b + u); }
  if (o.ramp) { const top = b - size / 2, g = x.createLinearGradient(0, top, 0, top + size); [[0, P.white], [0.22, P.butter], [0.4, P.gold], [0.58, P.amber], [0.78, P.wine]].forEach(([p, c], i, A) => { g.addColorStop(p, c); if (A[i + 1]) g.addColorStop(A[i + 1][0] - 0.001, c); else g.addColorStop(1, c); }); x.fillStyle = g; }
  else x.fillStyle = pal(col || P.cream);
  x.fillText(s, a, b); const w = x.measureText(s).width; x.restore(); return w;
};
// 铆钉：9×9 钢色，左上亮、右下墨影
U.rivet = (x, a, b) => { R(x, a + 3, b + 3, 9, 9, P.ink); R(x, a, b, 9, 9, P.steel); R(x, a, b, 9, 3, P.silver); R(x, a, b, 3, 9, P.silver); };
// 机箱面板：墨框 + 斜面（上左亮、下右暗）+ 右下硬投影 + 四角铆钉；o.ring = 内圈品质色
U.plate = (x, a, b, w, h, o = {}) => {
  const s = o.shadow == null ? 12 : o.shadow;
  if (s) R(x, a + s - 3, b + s - 3, w + 6, h + 6, P.ink);
  U.box(x, a, b, w, h, o.fill || P.night);
  R(x, a, b, w, 3, o.hi || P.dusk); R(x, a, b, 3, h, o.hi || P.dusk); R(x, a, b + h - 6, w, 6, o.lo || P.abyss); R(x, a + w - 3, b, 3, h, o.lo || P.abyss);
  if (o.ring) { const r = pal(o.ring); R(x, a + 3, b + 3, w - 6, 3, r); R(x, a + 3, b + h - 9, w - 6, 3, r); R(x, a + 3, b + 3, 3, h - 12, r); R(x, a + w - 6, b + 3, 3, h - 12, r); }
  if (o.rivets !== false && w > 90 && h > 90) { U.rivet(x, a + 12, b + 12); U.rivet(x, a + w - 24, b + 12); U.rivet(x, a + 12, b + h - 27); U.rivet(x, a + w - 24, b + h - 27); }
};
// 标题牌（压在面板上沿）：wine 酒红招牌 / gold 金牌 / indigo 靛蓝小牌；返回宽高
U.tab = (x, s, a, b, o = {}) => {
  const size = o.size || T.title, kind = o.kind || 'wine', pad = o.pad || Math.round(size * 0.6), w = Math.ceil(U.measure(x, s, size)) + pad * 2 + (o.extra || 0), h = Math.round(size * 1.45);
  const C = { wine: [P.wine, P.red, P.umber, P.butter], gold: [P.gold, P.butter, P.amber, P.ink], indigo: [P.indigo, P.dusk, null, P.butter], teal: [P.teal, P.ice, P.tealDeep, P.ink] }[kind];
  const X = o.align === 'center' ? a - w / 2 : a;
  U.box(x, X, b, w, h, C[0]); R(x, X, b, w, 3, C[1]); if (C[2]) R(x, X, b + h - 6, w, 6, C[2]);
  U.text(x, s, X + pad, b + h / 2 - 1, size, C[3], { align: 'left', shadow: kind === 'wine' || kind === 'indigo' });
  return { x: X, w, h };
};
// 街机按键：kind gold/teal/red/dark/violet，state ''/hover/down/dis；按下陷进面板 9px
U.btn = (x, s, a, b, w, h, o = {}) => {
  const st = o.state || '', size = o.size || T.btn; let [f, hi, lo, tc] = BTN[o.kind || 'dark'];
  if (st === 'dis') { f = P.night; hi = P.indigo; lo = P.abyss; tc = P.haze; }
  if (st === 'hover' && (o.kind || 'dark') === 'dark') { f = P.dusk; hi = P.haze; lo = P.indigo; tc = P.butter; }
  const dy = st === 'down' ? 9 : st === 'hover' ? -3 : 0, Y = b + dy;
  if (st !== 'down') R(x, a - 3, Y + h + 3, w + 6, 9, P.ink);
  U.box(x, a, Y, w, h, st === 'down' ? P.night : f, st === 'hover' ? P.gold : P.ink);
  if (st === 'down') R(x, a, Y, w, 6, P.abyss); else { R(x, a, Y, w, (o.kind || 'dark') === 'dark' ? 3 : 6, hi); R(x, a, Y + h - 9, w, 9, lo); }
  U.text(x, s, a + w / 2, Y + h / 2 - 3, size, st === 'down' ? P.lavender : tc, { shadow: tc !== P.ink });
  if (o.sub) U.text(x, o.sub, a + w / 2, Y + h - 20, T.tag, tc === P.ink ? P.umber : P.lavender, { shadow: false });
};
// 键帽（Q W E / SPACE）
U.key = (x, s, a, b, o = {}) => { const size = o.size || 24, w = Math.max(size * 2, U.measure(x, s, size, true) + 24), h = o.h || size * 2; R(x, a - 3, b + h + 3, w + 6, 6, P.ink); U.box(x, a, b, w, h, P.cream); R(x, a, b + h - 9, w, 9, P.lavender); U.text(x, s, a + w / 2, b + h / 2 - 4, size, P.ink, { num: true, shadow: false }); return w; };
// 条：墨底 3px 框，填充带上下亮暗阶，o.seg = 每格宽度（血条按格切）
U.bar = (x, a, b, w, h, frac, o = {}) => {
  const col = pal(o.col || P.green), sh = PJ.shades ? PJ.shades(col) : { hi: P.white, lo: P.ink }, fw = Math.round(w * Math.max(0, Math.min(1, frac)));
  U.box(x, a, b, w, h, o.bg || P.ink);
  if (fw > 0) { R(x, a, b, fw, h, col); const e = h >= 18 ? 6 : 3; R(x, a, b, fw, e, o.hi || sh.hi); if (h >= 18) R(x, a, b + h - e, fw, e, o.lo || sh.lo); }
  if (o.seg) for (let k = a + o.seg; k < a + w - 2; k += o.seg) R(x, k - 3, b, 3, h, P.ink);
};
// 品质签 / 小标签
U.chip = (x, s, a, b, q, o = {}) => {
  const [f, , lo] = typeof q === 'number' ? Q[Math.max(0, Math.min(3, q))] : [pal(q), 0, P.ink], size = o.size || T.cap, w = Math.ceil(U.measure(x, s, size)) + 28, h = Math.round(size * 1.6);
  const X = o.align === 'center' ? a - w / 2 : o.align === 'right' ? a - w : a;
  U.box(x, X, b, w, h, f); R(x, X, b + h - 3, w, 3, lo); U.text(x, s, X + w / 2, b + h / 2 - 1, size, P.ink, { shadow: false }); return w;
};
// 领袖像素半身像（M.PJ.BUSTS，64×64）→ Image：没有 → false，还在解码 → null
const BI = {};
U.bust = (k) => { const u = PJ.on !== false && k && PJ.BUSTS && PJ.BUSTS[k]; if (!u || typeof Image === 'undefined') return false; let im = BI[k]; if (!im) { im = BI[k] = new Image(); im.src = u; } return im.complete && im.naturalWidth ? im : null; };
setTimeout(() => Object.keys(PJ.BUSTS || {}).forEach(U.bust), 0); // 先解码，免得第一次用时闪一下精灵
// 金币（像素方块）
U.coin = (x, a, b, s) => { s = s || 42; const e = Math.max(3, Math.round(s / 7)); R(x, a - 3, b - 3, s + 6, s + 6, P.ink); R(x, a, b, s, s, P.gold); R(x, a, b, s, e, P.butter); R(x, a, b, e, s, P.butter); R(x, a, b + s - e, s, e, P.amber); R(x, a + s - e, b, e, s, P.amber); };
// 网点：棋盘格铺成一张小贴图，重复平铺（一帧只画一次矩形）
const PATS = new Map();
function checker(x, c1, cell) {
  const k = c1 + '|' + cell; let t = PATS.get(k);
  if (!t) { t = document.createElement('canvas'); t.width = t.height = cell * 2; const c = t.getContext('2d'); c.fillStyle = c1; c.fillRect(0, 0, cell, cell); c.fillRect(cell, cell, cell, cell); PATS.set(k, t); }
  return x.createPattern(t, 'repeat');
}
U.dither = (x, a, b, w, h, c1, c2, cell) => { cell = cell || 6; R(x, a, b, w, h, c2 || P.abyss); x.save(); x.translate(a, b); x.fillStyle = checker(x, c1 || P.night, cell); x.fillRect(0, 0, w, h); x.restore(); };
// 压暗：墨色 + 稀疏网点（不用半透明模糊）
U.dim = (x, al) => { x.save(); x.globalAlpha = (al == null ? 1 : al) * 0.82; R(x, 0, 0, 1920, 1080, P.ink); x.globalAlpha = (al == null ? 1 : al) * 0.35; x.fillStyle = checker(x, P.night, 6); x.fillRect(0, 0, 1920, 1080); x.restore(); };
// 跑马灯灯珠（奶油 / 琥珀交替，随 t 流动）
U.chase = (x, a, b, w, t, rev) => { const off = Math.floor((t || 0) * 8) % 4 * 6 * (rev ? -1 : 1); for (let k = -24; k < w + 24; k += 24) { const p = k + off; if (p < 0 || p > w - 6) continue; R(x, a + p, b, 6, 6, P.butter); if (p + 12 <= w - 6) R(x, a + p + 12, b, 6, 6, P.amber); } };
// 招牌灯箱：酒红底 + 上下跑马灯 + 果汁色带大字（逐字跳）
U.marquee = (x, s, cx, cy, o = {}) => {
  const size = o.size || T.hero, t = o.t || 0, chars = [...String(s)], gap = 4, cw = chars.map(ch => U.measure(x, ch, size)), tw = cw.reduce((p, c) => p + c, 0) + gap * (chars.length - 1);
  const w = Math.max(o.minW || 0, tw + 68), h = Math.round(size * 1.3) + 12, X = cx - w / 2, Y = cy - h / 2;
  U.box(x, X, Y, w, h, P.wine); R(x, X, Y, w, 6, P.red); R(x, X, Y + h - 6, w, 6, P.umber);
  U.chase(x, X + 9, Y - 12, w - 18, t); U.chase(x, X + 9, Y + h + 6, w - 18, t, true);
  let px = cx - tw / 2;
  chars.forEach((ch, i) => { const ph = ((t * 1.25 + (chars.length - i) * 0.12) % 1), dy = PJ.reduced ? 0 : (-0.045 - 0.095 * Math.sin(ph * 2 * Math.PI)) * size; U.text(x, ch, px + cw[i] / 2, cy + dy, size, P.gold, { ramp: true, outline: true }); px += cw[i] + gap; });
  return { x: X, y: Y, w, h };
};
// 横幅（战斗通告、胜利、混沌来袭……）：整条酒红 / 金 / 青底带，中间大字
U.banner = (x, s, cy, o = {}) => {
  const size = o.size || T.hero, kind = o.kind || 'wine', h = Math.round(size * 1.7), C = { wine: [P.wine, P.red, P.umber], gold: [P.amber, P.gold, P.brown], teal: [P.tealDeep, P.teal, P.night], red: [P.red, P.pink, P.wine], dark: [P.night, P.dusk, P.abyss] }[kind];
  const Y = cy - h / 2; R(x, 0, Y - 6, 1920, h + 12, P.ink); R(x, 0, Y, 1920, h, C[0]); R(x, 0, Y, 1920, 6, C[1]); R(x, 0, Y + h - 9, 1920, 9, C[2]);
  if (o.lights !== false) { U.chase(x, 0, Y - 18, 1920, o.t || 0); U.chase(x, 0, Y + h + 12, 1920, o.t || 0, true); }
  U.text(x, s, 960, cy - (o.sub ? size * 0.18 : 0), size, P.gold, { ramp: kind !== 'teal', outline: true });
  if (o.sub) U.text(x, o.sub, 960, cy + size * 0.55, T.body, P.butter);
};
})();
