// 像素美术：把生图结果（白底）压成像素画（透明底 + 墨色外描边），并重新打包 src/mc-pj-art.js。
//   node tools/pj-bust.js <id> <生图.png> [--crop x0,y0,边长]   领袖半身像 → art/busts/<id>.png（64×64、18 色）
//   node tools/pj-bust.js --event <key> <生图.png>               奇遇插画   → art/events/<key>.png（96×120、24 色，按主体外框自动取景）
//   node tools/pj-bust.js --pack                                 只按 art/busts、art/events 重新生成 src/mc-pj-art.js
// 半身像的裁切框用原图宽度的比例表示；默认值是按现有守夜人半身像量出来的取景（几乎整张图）。
const fs = require('fs'), path = require('path'), PNG = require('./pj-png.js');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'src/mc-pj-art.js'), INK = [7, 6, 15];
const KIND = { bust: { dir: 'art/busts', nx: 64, ny: 64, k: 18 }, event: { dir: 'art/events', nx: 96, ny: 120, k: 24 } };

// 白底 → 背景：从四边往里灌，灌过接近纯白的像素
function background({ w, h, data }) {
  const bg = new Uint8Array(w * h), q = [], white = (i) => 765 - data[i * 4] - data[i * 4 + 1] - data[i * 4 + 2] < 48;
  const seed = (i) => { if (!bg[i] && white(i)) { bg[i] = 1; q.push(i); } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); } for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (q.length) { const i = q.pop(), x = i % w, y = (i / w) | 0; if (x) seed(i - 1); if (x < w - 1) seed(i + 1); if (y) seed(i - w); if (y < h - 1) seed(i + w); }
  // 被主体圈住的大块纯白（轮辐之间、手臂和身体之间）也是背景；小块白色高光保留
  const pure = (i) => data[i * 4] > 244 && data[i * 4 + 1] > 244 && data[i * 4 + 2] > 244, seen = new Uint8Array(w * h), big = w * h * 0.0015;
  for (let s = 0; s < w * h; s++) {
    if (bg[s] || seen[s] || !pure(s)) continue;
    const comp = [s]; seen[s] = 1;
    for (let k = 0; k < comp.length; k++) { const i = comp[k], x = i % w, y = (i / w) | 0; for (const j of [x ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && !seen[j] && !bg[j] && pure(j)) { seen[j] = 1; comp.push(j); } }
    if (comp.length > big) comp.forEach((i) => { bg[i] = 1; });
  }
  return bg;
}
// 主体外框 → 同比例的取景框（留 5% 边，居中，超出原图的部分当背景）
function frameOf(img, bg, nx, ny) {
  let x0 = img.w, y0 = img.h, x1 = 0, y1 = 0;
  for (let i = 0; i < img.w * img.h; i++) if (!bg[i]) { const x = i % img.w, y = (i / img.w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const bw = (x1 - x0) * 1.1, bh = (y1 - y0) * 1.1, cell = Math.max(bw / nx, bh / ny);
  return { X0: (x0 + x1) / 2 - cell * nx / 2, Y0: (y0 + y1) / 2 - cell * ny / 2, cell };
}
// 按面积平均缩到 nx×ny：覆盖率过半的格子算前景，颜色只取前景像素
function shrink(img, bg, { X0, Y0, cell }, nx, ny) {
  const { w, data } = img, out = [];
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    let r = 0, g = 0, b = 0, n = 0, t = 0;
    for (let yy = Math.floor(Y0 + y * cell); yy < Math.floor(Y0 + (y + 1) * cell); yy++) for (let xx = Math.floor(X0 + x * cell); xx < Math.floor(X0 + (x + 1) * cell); xx++) {
      t++; if (xx < 0 || yy < 0 || xx >= w || yy >= img.h) continue; const i = yy * w + xx; if (bg[i]) continue;
      r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2]; n++;
    }
    out.push(n * 2 >= t && n ? [r / n, g / n, b / n] : null);
  }
  return out;
}
const d2 = (a, b) => (a[0] - b[0]) ** 2 * 0.3 + (a[1] - b[1]) ** 2 * 0.59 + (a[2] - b[2]) ** 2 * 0.11;
function quantize(cells, K) {
  const fg = cells.filter(Boolean), lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  const sorted = fg.slice().sort((a, b) => lum(a) - lum(b));
  let cen = Array.from({ length: K }, (_, i) => sorted[Math.floor((i + 0.5) * sorted.length / K)].slice());
  const near = (c) => { let bi = 0, bd = Infinity; cen.forEach((e, i) => { const d = d2(c, e); if (d < bd) { bd = d; bi = i; } }); return bi; };
  for (let it = 0; it < 16; it++) { const acc = cen.map(() => [0, 0, 0, 0]); fg.forEach((c) => { const a = acc[near(c)]; a[0] += c[0]; a[1] += c[1]; a[2] += c[2]; a[3]++; }); cen = cen.map((e, i) => (acc[i][3] ? acc[i].slice(0, 3).map((v) => v / acc[i][3]) : e)); }
  return cells.map((c) => (c ? cen[near(c)].map(Math.round) : null));
}
function pixelate(src, kind, crop) {
  const { nx, ny, k } = KIND[kind], img = PNG.read(src), bg = background(img);
  const fr = crop ? { X0: crop[0] * img.w, Y0: crop[1] * img.w, cell: crop[2] * img.w / nx } : frameOf(img, bg, nx, ny);
  const px = quantize(shrink(img, bg, fr, nx, ny), k), data = new Uint8Array(nx * ny * 4);
  for (let i = 0; i < nx * ny; i++) {
    let c = px[i]; const x = i % nx, y = (i / nx) | 0;
    // 墨色外描边：贴着主体的透明格
    if (!c && [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([a, b]) => a >= 0 && b >= 0 && a < nx && b < ny && px[b * nx + a])) c = INK;
    if (c) { data.set(c, i * 4); data[i * 4 + 3] = 255; }
  }
  return { w: nx, h: ny, data };
}
function x8(img) {
  const S = 8, big = new Uint8Array(img.w * S * img.h * S * 4);
  for (let y = 0; y < img.h * S; y++) for (let x = 0; x < img.w * S; x++) { const s = (((y / S) | 0) * img.w + ((x / S) | 0)) * 4; big.set(img.data.subarray(s, s + 4), (y * img.w * S + x) * 4); }
  return { w: img.w * S, h: img.h * S, data: big };
}
function pack() {
  const read = (dir) => { const o = {}, d = path.join(ROOT, dir); if (fs.existsSync(d)) fs.readdirSync(d).filter((f) => /^[a-z0-9_]+\.png$/.test(f) && !/_x8\.png$/.test(f)).sort().forEach((f) => { o[f.slice(0, -4)] = 'data:image/png;base64,' + fs.readFileSync(path.join(d, f)).toString('base64'); }); return o; };
  const busts = read(KIND.bust.dir), events = read(KIND.event.dir);
  fs.writeFileSync(OUT, '// 像素美术（由 art/busts、art/events 生成：node tools/pj-bust.js --pack）：领袖半身像 64×64，奇遇插画 96×120\n(function(){const M=window.MC=window.MC||{};M.PJ=M.PJ||{};M.PJ.BUSTS=Object.assign(M.PJ.BUSTS||{},' + JSON.stringify(busts) + ');M.PJ.EVART=Object.assign(M.PJ.EVART||{},' + JSON.stringify(events) + ');})();\n');
  return Object.keys(busts).length + ' busts, ' + Object.keys(events).length + ' event pictures';
}
module.exports = { pixelate, background, frameOf, shrink, quantize };
if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] !== '--pack') {
    const kind = a[0] === '--event' ? 'event' : 'bust', [id, src] = kind === 'event' ? a.slice(1) : a, ci = a.indexOf('--crop');
    const crop = ci >= 0 ? a[ci + 1].split(',').map(Number) : kind === 'bust' ? [0.0075, 0.0125, 0.98] : null;
    if (!id || !src) { console.error('usage: node tools/pj-bust.js <id> <src.png> [--crop x0,y0,size] | --event <key> <src.png> | --pack'); process.exit(1); }
    const dir = path.join(ROOT, KIND[kind].dir); fs.mkdirSync(dir, { recursive: true });
    const img = pixelate(src, kind, crop); PNG.write(path.join(dir, id + '.png'), img); PNG.write(path.join(dir, id + '_x8.png'), x8(img));
    console.log('wrote ' + KIND[kind].dir + '/' + id + '.png');
  }
  console.log('packed', pack(), '→ src/mc-pj-art.js');
}
