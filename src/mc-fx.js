// ==== mc-fx.js ====
(function () {
const M = window.MC;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const eback = (t) => { t = clamp(t, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const eel = (t) => { t = clamp(t, 0, 1); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; };
M.ease = { eo, eback, eel, clamp };
// Unity 动画曲线（关键帧 [时间, 值, 入切线, 出切线]，Hermite 插值）：滚轮停轮、机箱跳一下、结果弹出都照卡皮的原始曲线走
const curve = (K, t) => {
  if (t <= K[0][0]) return K[0][1]; const z = K[K.length - 1]; if (t >= z[0]) return z[1];
  let i = 0; while (i < K.length - 2 && K[i + 1][0] <= t) i++;
  const a = K[i], b = K[i + 1], d = b[0] - a[0], s = (t - a[0]) / d, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * a[1] + (s3 - 2 * s2 + s) * a[3] * d + (-2 * s3 + 3 * s2) * b[1] + (s3 - s2) * b[2] * d;
};
M.curve = curve;
M.CURVE = {
  // 停轮：正好转到结果那格时猛地停住，往回弹一点（0.33 秒）
  stop: [[0, 0, 1.836, 1.836], [0.1667, -0.0146, 0, 0], [0.3333, 0, 0, 0]],
  // 再挪一格：先冲出去 38%，再慢慢挪到位、略过头一点再回来（1.33 秒，0 → 1）
  nudge: [[0, 0, 2.947, 2.947], [0.1667, 0.3821, 1.693, 1.693], [1.1667, 1.0098, 0, 0], [1.3333, 1, 0, 0]],
  // 机箱被拉杆带得往上跳两下（0.42 秒，单位 = 原图 1920 高的画布单位）
  jolt: [[0, 0, 0, 0], [0.1667, 20, 0, 0], [0.25, 0, 0, 0], [0.3333, 10, 0, 0], [0.4167, 0, 0, 0]],
  // 结果字弹出：0 → 1.1 → 0.96 → 1.02 → 0.99 → 1，每 0.1 秒一下
  pop: [[0, 0, 17.54, 17.54], [0.1, 1.1, 0, 0], [0.2, 0.96, 0, 0], [0.3, 1.02, 0, 0], [0.4, 0.99, 0, 0], [0.5, 1, 0, 0]],
  // 坏消息的字：从上面砸下来、略冲过头再站住（单位 px）
  drop: [[0, 0, 3419.7, 3419.7], [0.1333, 230, -0.43, -0.43], [0.3667, 218, 0, 0]],
};
// ───────── Pixel Juice 画布工具（docs/design.md §11.5）：调色板、按帧步进、字号阶梯 ─────────
const U = M.UI, P = (M.PJ && M.PJ.PAL) || {};
const PC = new Map(), palC = (c) => { if (typeof c !== 'string') return c; let r = PC.get(c); if (r === undefined) { r = U.pal(c); if (PC.size > 600) PC.clear(); PC.set(c, r); } return r; };
const RM = () => !!(M.PJ && M.PJ.reduced);
const stepT = (t) => t;                                                           // 动效连续（用户裁定 2026-09-24：不要一卡一卡）
const st4 = (v) => clamp(v, 0, 1);                                               // 透明度连续
const seq = (A, d, dt) => { if (RM() || d >= (A.length - 1) * dt) return A[A.length - 1]; if (d <= 0) return A[0]; const f = d / dt, i = Math.floor(f), k = f - i, e = k * k * (3 - 2 * k); return A[i] + (A[i + 1] - A[i]) * e; }; // 关键帧之间平滑插值
const POP = [1.45, 0.9, 1.06, 1], SLAM = [3.2, 2.2, 1.4, 0.92, 1.08, 1];
const TS = [18, 22, 26, 30, 32, 40, 52, 64], snapSz = (s) => Math.max(1, Math.round(s));   // 字号连续变化（放大缩小不再跳档）
const R = (x, a, b, w, h, c) => U.R(x, a, b, w, h, c);
// 压暗：和 U.dim 一样（墨色 + 6px 夜色棋盘网点），网点用一张 12px 图案一次铺满（U.dim 逐格画，一次要几毫秒）
let DP = null;
M.fxDim = function (x, al) {
  al = al == null ? 1 : al; if (!(al > 0)) return;
  if (!DP) { DP = document.createElement('canvas'); DP.width = DP.height = 12; const c = DP.getContext('2d'); c.fillStyle = P.night; c.fillRect(0, 0, 6, 6); c.fillRect(6, 6, 6, 6); }
  x.save(); x.imageSmoothingEnabled = false; x.globalAlpha = al * 0.82; R(x, 0, 0, 1920, 1080, P.ink); x.globalAlpha = al * 0.35; x.fillStyle = x.createPattern(DP, 'repeat'); x.fillRect(0, 0, 1920, 1080); x.restore();
};

// 音效：M.Sfx 的实现在 mc-audio.js

// ───────── HD-2D post processing ─────────
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const PP = {};
function pp(W, H) { const k = W + 'x' + H; if (!PP[k]) { const lw = Math.round(W / 4), lh = Math.round(H / 4); PP[k] = { lw, lh, low: mk(lw, lh), bl: mk(lw, lh), dof: mk(lw, lh), grain: null }; } return PP[k]; }
// The post-processing (depth-of-field blur, bloom blur with brightness / contrast, soft-light grade, vignette: two blurs and
// four full-screen blends every frame) is what made the game slow on Android (2026-09-27, measured on the emulator: the
// base 53 ms → 20 ms a frame with it off, battles 30 → 22 ms). Touch devices go without it; any device that cannot hold
// about 30 frames a second with it drops it by itself.
const TOUCH = (() => { try { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || !!window.Capacitor || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches); } catch (e) { return false; } })();
M.HD2D_LOW = TOUCH;
// the same goes for the other screen-wide light passes: the soft halo round every scene light (bloom-like), the map's
// light rays, the skill-focus vignette in battle (user ruling 2026-09-27: 「手机上就把景深模糊、泛光、调色、暗角这些类似的效果关掉」)
M.LOW_FX = TOUCH;
const slow = { last: 0, n: 0, sum: 0 };
function hdSlow() { const t = performance.now(), d = t - slow.last; slow.last = t; if (d > 250 || d <= 0) return false; slow.n++; slow.sum += d; if (slow.n >= 150) { const avg = slow.sum / slow.n; slow.n = 0; slow.sum = 0; if (avg > 33) { M.HD2D_LOW = true; M.LOW_FX = true; return true; } } return false; }
M.hd2d = function (ctx, W, H, o = {}) {
  if (M.HD2D_OFF || M.HD2D_LOW || hdSlow()) return;
  const P = pp(W, H), src = ctx.canvas;
  const lx = P.low.getContext('2d'), bx = P.bl.getContext('2d'), dx = P.dof.getContext('2d');
  lx.imageSmoothingEnabled = true; lx.setTransform(1, 0, 0, 1, 0, 0); lx.filter = 'none'; lx.clearRect(0, 0, P.lw, P.lh); lx.drawImage(src, 0, 0, W * (ctx._R || 1), H * (ctx._R || 1), 0, 0, P.lw, P.lh);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
  // tilt-shift depth of field
  if (o.dof !== 0) {
    dx.globalCompositeOperation = 'source-over'; dx.clearRect(0, 0, P.lw, P.lh); dx.filter = 'blur(' + (o.dofBlur || 2.2) + 'px)'; dx.drawImage(P.low, 0, 0); dx.filter = 'none';
    dx.globalCompositeOperation = 'destination-in';
    const f = (o.focus == null ? 0.55 : o.focus), band = o.band || 0.22, g = dx.createLinearGradient(0, 0, 0, P.lh);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(clamp(f - band - 0.18, 0, 1), 'rgba(0,0,0,0.85)'); g.addColorStop(clamp(f - band, 0, 1), 'rgba(0,0,0,0)'); g.addColorStop(clamp(f + band, 0, 1), 'rgba(0,0,0,0)'); g.addColorStop(clamp(f + band + 0.15, 0, 1), 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    dx.fillStyle = g; dx.fillRect(0, 0, P.lw, P.lh); dx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = o.dofA == null ? 1 : o.dofA; ctx.drawImage(P.dof, 0, 0, W, H);
  }
  // bloom
  bx.clearRect(0, 0, P.lw, P.lh); bx.filter = 'brightness(' + (o.bright || 0.9) + ') contrast(' + (o.contrast || 3.2) + ') saturate(1.4) blur(' + (o.bloomBlur || 5) + 'px)'; bx.drawImage(P.low, 0, 0); bx.filter = 'none';
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.bloom == null ? 0.55 : o.bloom; ctx.drawImage(P.bl, 0, 0, W, H);
  // color grade
  if (o.grade) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = o.gradeA || 0.35; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, o.grade[0]); g.addColorStop(1, o.grade[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  // vignette
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * 0.35, W / 2, H * 0.52, Math.max(W, H) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + (o.vig == null ? 0.6 : o.vig) + ')'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
};
M.glow = function (ctx, x, y, r, col, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a == null ? 0.5 : a;
  ctx.imageSmoothingEnabled = true; ctx.drawImage(M.radSprite('glow' + col, [[0, col], [0.35, col + '66'], [1, col + '00']], 128), x - r, y - r, r * 2, r * 2); ctx.restore();
};
M.godRays = function (ctx, W, H, t, col, n, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (n || 5); i++) {
    const x = W * (0.1 + 0.85 * ((i * 0.618 + 0.13) % 1)) + Math.sin(t * 0.3 + i) * 60, w = 90 + (i % 3) * 70, al = (a || 0.06) * (0.6 + 0.4 * Math.sin(t * 0.7 + i * 2));
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00');
    ctx.globalAlpha = al; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x + w, -20); ctx.lineTo(x + w * 2.4 + 300, H); ctx.lineTo(x + 300, H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
};

// ───────── ambient particles ─────────
M.Ambient = class {
  constructor(kind, W, H, n) { this.kind = kind; this.W = W; this.H = H; this.p = []; const k = Math.ceil((n || 60) * (M.LOW_FX ? 0.5 : 1)); for (let i = 0; i < k; i++) this.p.push(this.spawn(true)); }   /* phones: half the motes (2026-09-27) */
  spawn(init) {
    const k = this.kind, W = this.W, H = this.H;
    const p = { x: Math.random() * W, y: init ? Math.random() * H : (k === 'embers' || k === 'bubbles' ? H + 20 : k === 'snow' || k === 'ash' || k === 'petals' ? -20 : Math.random() * H), z: 0.4 + Math.random() * 1.2, ph: Math.random() * 7, life: 0 };
    return p;
  }
  update(dt) {
    const k = this.kind;
    this.p.forEach((p, i) => {
      p.life += dt; p.ph += dt;
      if (k === 'embers') { p.y -= (40 + 50 * p.z) * dt; p.x += Math.sin(p.ph * 1.5) * 30 * dt; }
      else if (k === 'snow' || k === 'ash') { p.y += (30 + 30 * p.z) * dt; p.x += Math.sin(p.ph) * 25 * dt; }
      else if (k === 'petals') { p.y += (40 + 20 * p.z) * dt; p.x += (40 + Math.sin(p.ph) * 40) * dt; }
      else if (k === 'bubbles') { p.y -= (30 + 40 * p.z) * dt; p.x += Math.sin(p.ph * 2) * 20 * dt; }
      else { p.x += Math.sin(p.ph * 0.5 + i) * 12 * dt; p.y += Math.cos(p.ph * 0.4 + i) * 10 * dt - 6 * dt; }
      if (p.y < -40 || p.y > this.H + 40 || p.x < -40 || p.x > this.W + 40) Object.assign(p, this.spawn(false));
    });
  }
  draw(ctx, ox, oy) {
    const k = this.kind, col = { motes: '#ffe6a8', embers: '#ff8a3a', fireflies: '#c8ff7a', snow: '#eef6ff', ash: '#9a8f9a', bubbles: '#9fe8ff', spores: '#d59bff', petals: '#ffb0d0', sparks: '#8ff6ff' }[k] || '#fff';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const spr = M.radSprite('amb' + col, [[0, col], [1, col + '00']], 32);
    this.p.forEach((p, i) => {
      const px = ((p.x - (ox || 0) * p.z * 0.15) % this.W + this.W) % this.W, py = p.y - (oy || 0) * p.z * 0.08;
      let a = 0.5 * p.z; if (k === 'fireflies' || k === 'motes' || k === 'spores' || k === 'sparks') a *= 0.5 + 0.5 * Math.sin(p.ph * (k === 'fireflies' ? 3 : 1.2) + i);
      const s = Math.round((k === 'snow' ? 3 : k === 'bubbles' ? 4 : 2.5) * p.z * 2);
      ctx.globalAlpha = clamp(a, 0, 1) * 0.35; ctx.drawImage(spr, px - s * 4, py - s * 4, s * 8, s * 8);
      ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = col;
      if (k === 'bubbles') { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(px - s, py - s, s * 2, s * 2); } else ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
    });
    ctx.restore();
  }
};

// ───────── UI fx layer (flyers, bursts, confetti, text pops) ─────────
// 发光 → 4 段硬边色带（叠加、低透明度）
function bglow(ctx, x, y, r, col, a) {
  const c = palC(col); if (!(a > 0) || !(r > 1) || typeof c !== 'string' || c[0] !== '#') return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = U.rg(ctx, x, y, 0, r, [[0, c], [0.35, c + '66'], [1, c + '00']], 4); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
// 光芒 → 纯色楔形，内外两段（叠加后内段更亮）；alt = 隔一道暗一点
function hardRays(ctx, x, y, n, r, hw, col, a, rot, alt) {
  if (!(a > 0)) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.rotate(rot || 0); ctx.fillStyle = palC(col);
  for (let i = 0; i < n; i++) { ctx.rotate(Math.PI * 2 / n); ctx.globalAlpha = a * (alt && i % 2 === 0 ? 0.6 : 1); [1, 0.5].forEach(k => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * k, -hw * k); ctx.lineTo(r * k, hw * k); ctx.closePath(); ctx.fill(); }); }
  ctx.restore();
}
M.FxLayer = class {
  constructor() { this.items = []; this.t = 0; this.shake = 0; this.trauma = 0; this.sx = 0; this.sy = 0; this.sr = 0; this.flashA = 0; this.flashC = P.white; this.freezeUntil = 0; }
  get busy() { return this.items.length > 0 || this.trauma > 0.01 || this.flashA > 0.01; }
  get frozen() { return performance.now() < this.freezeUntil; }
  freeze(ms) { this.freezeUntil = Math.max(this.freezeUntil, performance.now() + ms); }
  spark(x, y, col, n, o = {}) { for (let i = 0; i < n; i++) { const a = o.dir != null ? o.dir + (Math.random() - 0.5) * (o.spread || 1) : Math.random() * Math.PI * 2, v = (o.v || 900) * (0.3 + Math.random() * 0.9); this.add({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: Math.random() < 0.3 ? P.white : col, w: (o.w || 5) * (0.5 + Math.random()), life: (o.life || 0.45) * (0.5 + Math.random() * 0.8), g: o.g == null ? 600 : o.g, delay: o.delay }); } }
  shock(x, y, r, col, life, delay) { this.add({ k: 'shock', x, y, r: r || 400, col: col || P.white, life: life || 0.45, delay }); }
  flare(x, y, r, col, life, delay) { this.add({ k: 'flare', x, y, r: r || 200, col: col || P.white, life: life || 0.25, delay }); }
  explode(x, y, col, p = 1) { this.flare(x, y, 160 + 120 * p, P.white, 0.22 + 0.06 * p); this.flare(x, y, 260 + 200 * p, col, 0.4 + 0.1 * p); this.shock(x, y, 260 + 260 * p, col, 0.42 + 0.08 * p); this.shock(x, y, 180 + 200 * p, P.white, 0.32, 0.06); if (p >= 2) this.shock(x, y, 500 + 300 * p, col, 0.7, 0.12); this.spark(x, y, col, Math.round(26 * p), { v: 700 + 300 * p, w: 4 + p * 2 }); this.burst(x, y, col, Math.round(14 * p), { v: 420 + 120 * p, s: 10 + 4 * p }); this.kick(5 + 7 * p); this.flash(col, 0.12 + 0.12 * p); if (p >= 1.5) this.freeze(20 + 25 * p); }   // 卡帧只给大爆点：小的一停就像卡了
  clickBurst(x, y, col) { this.ring(x, y, 6, 56, col || P.gold, 4, 0.2); }   // 画布上的普通点击：一个小圈，不震屏（§11.6）
  coins(x, y, n, o = {}) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * (o.spread || 1.3), v = (o.v || 900) * (0.5 + Math.random() * 0.6); this.add({ k: 'coin', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ph: Math.random() * 6, life: 1.4 + Math.random() * 0.6, delay: (o.delay || 0) + Math.random() * (o.spreadT || 0.4) }); } }
  add(o) { o.t0 = this.t + (o.delay || 0); if (typeof o.col === 'string') o.col = palC(o.col); this.items.push(o); return o; } // 颜色一进来就贴到调色板
  fly(img, from, to, o = {}) {
    if (to && isFinite(to.x) && isFinite(to.y)) to = { x: Math.max(40, Math.min(1880, to.x)), y: Math.max(40, Math.min(1040, to.y)) };   // never off the screen (user ruling 2026-09-25)
    const cx = (from.x + to.x) / 2 + (o.curve == null ? (Math.random() - 0.5) * 300 : o.curve), cy = Math.min(from.y, to.y) - (o.arc == null ? 260 : o.arc);
    return this.add({ k: 'fly', img, from, to, cx, cy, life: o.dur || 0.75, s0: o.s0 || 1, s1: o.s1 == null ? 0.45 : o.s1, col: o.col || P.gold, onLand: o.onLand, delay: o.delay, landed: false, trail: [] });
  }
  burst(x, y, col, n, o = {}) { for (let i = 0; i < (n || 16); i++) { const a = Math.random() * Math.PI * 2, v = (o.v || 380) * (0.35 + Math.random() * 0.8); this.add({ k: 'pt', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 120), g: o.g == null ? 900 : o.g, col: i % 4 === 0 ? P.white : col, s: (o.s || 10) * (0.5 + Math.random()), life: (o.life || 0.7) * (0.6 + Math.random() * 0.6), delay: o.delay }); } }
  confetti(n, o = {}) { const cols = o.cols || [P.gold, P.red, P.teal, P.lime, P.white, P.violet]; for (let i = 0; i < n; i++) this.add({ k: 'conf', x: o.x == null ? Math.random() * 1920 : o.x + (Math.random() - 0.5) * 200, y: o.y == null ? -30 - Math.random() * 300 : o.y, vx: (Math.random() - 0.5) * (o.x == null ? 200 : 1400), vy: o.y == null ? 120 + Math.random() * 200 : -600 - Math.random() * 700, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, col: cols[i % cols.length], w: 10 + Math.random() * 10, h: 6 + Math.random() * 6, life: 2.6 + Math.random(), delay: (o.delay || 0) + Math.random() * 0.2 }); }
  ring(x, y, r0, r1, col, w, life, delay) { this.add({ k: 'ring', x, y, r0, r1, col, w, life: life || 0.5, delay }); }
  rays(x, y, col, life, o = {}) { return this.add({ k: 'rays', x, y, col, life: life || 1.5, n: o.n || 14, r: o.r || 520, delay: o.delay, spin: o.spin || 0.4 }); }
  pop(x, y, text, col, size, o = {}) { this.add({ k: 'pop', x, y, text, col, size: size || 60, life: o.life || 1.1, rise: o.rise == null ? 80 : o.rise, num: o.num, delay: o.delay, slam: o.slam }); }
  flash(col, a) { this.flashC = palC(col); this.flashA = Math.max(this.flashA, a); }
  kick(v) { this.trauma = Math.min(1, this.trauma + v / 34); }
  update(dt) {
    this.t += dt; this.trauma = Math.max(0, this.trauma - dt * 1.9); const tr = this.trauma * this.trauma, T = this.t; this.shake = tr * 30; this.sx = tr * 34 * (Math.sin(T * 61) * 0.6 + Math.sin(T * 97 + 1) * 0.4); this.sy = tr * 30 * (Math.sin(T * 71 + 2) * 0.6 + Math.sin(T * 113 + 3) * 0.4); this.sr = tr * 1.1 * Math.sin(T * 53 + 5); this.flashA = Math.max(0, this.flashA - dt * 3);
    this.items = this.items.filter(it => {
      const d = this.t - it.t0; if (d < 0) return true;
      if (it.k === 'fly') {
        const p = d / it.life;
        if (p >= 1 && !it.landed) { it.landed = true; this.burst(it.to.x, it.to.y, it.col, 12, { v: 300, s: 9, life: 0.5 }); this.spark(it.to.x, it.to.y, it.col, 10, { v: 520, w: 3, life: 0.3, g: 200 }); this.flare(it.to.x, it.to.y, 90, it.col, 0.2); this.ring(it.to.x, it.to.y, 10, 80, it.col, 6, 0.35); this.kick(1.2); M.Sfx.land(it.li || 0); it.onLand && it.onLand(); M.onFlyLand && M.onFlyLand(it.to); return false; }   // M.onFlyLand: the room it lands in bounces (mc-bastion.js)
        return true;
      }
      return d < it.life;
    });
  }
  pos(it, p) { const q = 1 - p; const e = p < 0.2 ? p * 0.6 : 0.12 + (p - 0.2) / 0.8 * 0.88; const u = eo(e) * 0.3 + e * 0.7; const a = 1 - u; return { x: a * a * it.from.x + 2 * a * u * it.cx + u * u * it.to.x, y: a * a * it.from.y + 2 * a * u * it.cy + u * u * it.to.y }; }
  draw(ctx, noClear) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); if (!noClear) ctx.clearRect(0, 0, 1920, 1080);
    for (const it of this.items) {
      const d = this.t - it.t0; if (d < 0) continue; const p = clamp(d / it.life, 0, 1);
      if (it.k === 'fly') {
        const Q = this.pos(it, p); it.trail.unshift(Q); if (it.trail.length > 10) it.trail.pop();
        // 拖尾：3px 网格上的方块
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = it.col;
        it.trail.forEach((q, i) => { ctx.globalAlpha = 0.35 * (1 - i / 10); const s = Math.max(3, Math.round(16 * (1 - i / 10))); ctx.fillRect(Math.round(q.x - s / 2), Math.round(q.y - s / 2), s, s); });
        ctx.restore();
        bglow(ctx, Q.x, Q.y, 70, it.col, 0.5);
        const pop = p < 0.18 ? eback(p / 0.18) : 1, sc = (it.s0 + (it.s1 - it.s0) * eo(p)) * pop * (p < 0.18 ? 1.15 : 1);
        if (it.img) { const w = it.img.width * sc, h = it.img.height * sc; ctx.imageSmoothingEnabled = false; ctx.save(); ctx.translate(Q.x, Q.y); ctx.rotate(Math.sin(p * 9) * 0.15 * (1 - p)); ctx.drawImage(it.img, -w / 2, -h / 2, w, h); ctx.restore(); }
        else if (it.text) U.text(ctx, it.text, Q.x, Q.y, snapSz(44 * sc), it.col);
      } else if (it.k === 'pt') {
        const x = it.x + it.vx * d, y = it.y + it.vy * d + 0.5 * it.g * d * d; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = st4(1 - p); ctx.fillStyle = it.col; const s = Math.max(3, Math.round(it.s * (1 - p * 0.5))); ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s); ctx.restore();
      } else if (it.k === 'conf') {
        const x = it.x + it.vx * d * (it.vy < 0 ? Math.max(0.2, 1 - d * 0.5) : 1), y = it.y + it.vy * d + (it.vy < 0 ? 700 * d * d : 0), r = it.rot + it.vr * d;
        ctx.save(); ctx.globalAlpha = p > 0.8 ? st4((1 - p) / 0.2) : 1; ctx.translate(x + Math.sin(d * 4 + it.rot) * 30, y); ctx.rotate(r); ctx.scale(1, Math.abs(Math.cos(d * 6 + it.rot))); ctx.fillStyle = it.col; ctx.fillRect(-it.w / 2, -it.h / 2, it.w, it.h); ctx.restore();
      } else if (it.k === 'ring') {
        // 硬边圈：6px → 3px，半径按 3px 取整，透明度分 4 档
        const r = Math.max(2, Math.round((it.r0 + (it.r1 - it.r0) * eo(p))));
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = st4(1 - p); ctx.strokeStyle = it.col; ctx.lineWidth = (it.w || 3) >= 5 && p < 0.5 ? 6 : 3; ctx.beginPath(); ctx.arc(it.x, it.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      } else if (it.k === 'rays') {
        const a = st4(p < 0.15 ? p / 0.15 : p > 0.8 ? (1 - p) / 0.2 : 1);
        hardRays(ctx, it.x, it.y, it.n, it.r, it.r * 0.12, it.col, a * 0.2, stepT(d, 8) * it.spin); bglow(ctx, it.x, it.y, it.r * 0.5, it.col, a * 0.5);
      } else if (it.k === 'spark') {
        const dd = d, dr = Math.exp(-dd * 3), x = it.x + it.vx * (1 - dr) / 3, y = it.y + it.vy * (1 - dr) / 3 + 0.5 * it.g * dd * dd, vx = it.vx * dr, vy = it.vy * dr + it.g * dd, L = 0.035;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = st4(1 - p); ctx.strokeStyle = it.col; ctx.lineCap = 'butt'; ctx.lineWidth = Math.max(3, Math.round(it.w * (1 - p * 0.7))); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx * L, y - vy * L); ctx.stroke(); ctx.restore();
      } else if (it.k === 'shock') {
        // 冲击波：外圈 3px 白 + 内圈 6px 本色，拖一道半透明 3px 余波
        const r = Math.round(it.r * eo(p)), w = Math.max(2, 70 * (1 - p)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = st4((1 - p) * 0.9);
        if (r > 9) { ctx.lineWidth = 6; ctx.strokeStyle = it.col; ctx.beginPath(); ctx.arc(it.x, it.y, r - 6, 0, Math.PI * 2); ctx.stroke(); }
        ctx.lineWidth = 3; ctx.strokeStyle = P.white; ctx.beginPath(); ctx.arc(it.x, it.y, Math.max(2, r), 0, Math.PI * 2); ctx.stroke();
        const r2 = r - Math.round(w * 0.6); if (w > 18 && r2 > 3) { ctx.globalAlpha *= 0.5; ctx.strokeStyle = it.col; ctx.beginPath(); ctx.arc(it.x, it.y, r2, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
      } else if (it.k === 'flare') {
        // 闪光：4 段硬边色带
        const r = it.r * (0.4 + 0.6 * eo(p)); if (r > 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = st4(Math.pow(1 - p, 1.5)); ctx.fillStyle = U.rg(ctx, it.x, it.y, 0, r, [[0, P.white], [0.25, it.col + 'ee'], [1, it.col + '00']], 4); ctx.beginPath(); ctx.arc(it.x, it.y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      } else if (it.k === 'coin') {
        // 金币：方块币（奶油左上亮边、琥珀右下暗边、3px 墨框），翻面时只剩窄条
        const x = it.x + it.vx * d, y = it.y + it.vy * d + 1100 * d * d, w = Math.max(6, Math.round((Math.abs(Math.cos(d * 12 + it.ph)) * 22 + 4) / 3) * 3), X = Math.round(x - w / 2), Y = Math.round(y - 12);
        ctx.save(); ctx.globalAlpha = p > 0.8 ? st4((1 - p) / 0.2) : 1; R(ctx, X - 3, Y - 3, w + 6, 30, P.ink); R(ctx, X, Y, w, 24, P.gold); R(ctx, X, Y + 18, w, 6, P.amber); R(ctx, X, Y, w, 3, P.butter);
        if (w > 9) { R(ctx, X + w - 3, Y, 3, 24, P.amber); R(ctx, X, Y, 3, 21, P.butter); } ctx.restore(); bglow(ctx, x, y, 30, P.gold, 0.3);
      } else if (it.k === 'pop') {
        // 飘字：像素字 + 3px 八向墨描边；弹 4 格（砸下来 6 格），上浮按 6px 一格
        const sc = seq(it.slam ? SLAM : POP, d, it.slam ? 0.04 : 0.06), y = it.y - Math.round(it.rise * eo(p));
        ctx.save(); ctx.globalAlpha = p > 0.75 ? st4((1 - p) / 0.25) : 1; ctx.translate(Math.round(it.x), Math.round(y)); ctx.scale(sc, sc);
        U.text(ctx, it.text, 0, 0, snapSz(it.size), it.col, { outline: true, num: !!it.num }); ctx.restore();
      }
    }
    if (this.flashA > 0) { const a = Math.round(this.flashA * 10) / 10; if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = this.flashC; ctx.fillRect(0, 0, 1920, 1080); ctx.globalAlpha = 1; } }
  }
};

// ───────── the great reel (slot cabinet) ─────────
// 照卡皮的老虎机：拉杆后全速转（约 10 格/秒，0.15 秒起速），正好转到结果那格时猛地停住、往回弹一点；
// 之后每升一档按「再挪一格」曲线走 0.5 秒
M.REEL_GO = 0.3; M.REEL_STOP = 1.95;
M.reelP = function (r) {
  const N = r.tiles.length, t = r.t, R = 0.15, D = M.REEL_STOP - M.REEL_GO, L0 = N * Math.max(2, Math.round((10 * (D - R / 2) - r.land) / N)) + r.land;
  const v = L0 / (D - R / 2), u = clamp(t - M.REEL_GO, 0, D);
  let p = t >= M.REEL_STOP ? L0 + 4 * curve(M.CURVE.stop, t - M.REEL_STOP) : u < R ? v * u * u / (2 * R) : v * (u - R / 2);
  for (let i = 0; i < r.ups; i++) { const at = 2.55 + i * 0.95; if (t >= at) p = L0 + i + curve(M.CURVE.nudge, (t - at) * 2.667); }
  if (r.tease) { const at = 2.55 + r.ups * 0.95; if (t >= at) { const q = clamp((t - at) / 0.75, 0, 1); p = L0 + r.ups + (q < 0.55 ? 0.47 * eo(q / 0.55) : 0.47 * (1 - eback((q - 0.55) / 0.45))); } }
  return p;
};
// 不升档也不「再上一格？」时，停轮那一下就是锁定
M.reelLock = (r) => (r.ups || r.tease ? 2.55 + r.ups * 0.95 + (r.tease ? 0.75 : 0) : M.REEL_STOP);
// 锁定后的余韵按结果分：普通 / 稀有 0.9 秒，史诗以上 1.5 秒（负面的快速过去）
M.reelDur = (r) => M.reelLock(r) + (r.itemMode && r.ups < 3 ? 0.9 : 1.5);   // six qualities: 史诗 and up linger
// 每一次往上冲（升品、最后的「再上一格？」）的时刻：冲之前 0.42 秒是蓄力
M.reelEv = (r) => [...Array(r.ups || 0)].map((_, i) => 2.55 + i * 0.95).concat(r.tease ? [2.55 + (r.ups || 0) * 0.95] : []);
M.REEL_CHG = 0.42;
function bolt(ctx, x1, y1, x2, y2, col, w, seed) { let s = seed; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); const n = 9; for (let i = 1; i < n; i++) { const t = i / n; ctx.lineTo(x1 + (x2 - x1) * t + (rnd() - 0.5) * 60, y1 + (y2 - y1) * t + (rnd() - 0.5) * 60); } ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = w * 0.35; ctx.stroke(); ctx.restore(); }
M.bolt = bolt;
// 四边框
const frame = (x, a, b, w, h, k, c) => { R(x, a, b, w, k, c); R(x, a, b + h - k, w, k, c); R(x, a, b, k, h, c); R(x, a + w - k, b, k, h, c); };
// 展示用的档位：锁定的那一格按四档演（打造 / 招魂 / 道具按品质；许愿井和赌博滚轮都按一档，「空」不演）
M.reelTierAt = (r, u) => { const n = r.tiles.length; if (!r.itemMode) { const tl = r.tiles[(r.land + (u | 0)) % n]; return tl.n === '空' ? -1 : 1; } u = u | 0; return n >= 6 ? (u <= 1 ? 0 : u === 2 ? 1 : u === 3 ? 2 : 3) : clamp(Math.round(u * 3 / Math.max(1, n - 1)), 0, 3); };
M.reelQ = (r) => M.reelTierAt(r, r.ups || 0);
// 机箱（像素引擎画，mc-minipx-a.js 的 _reel_cab）：820×640，滚筒上的品质名和属性是清晰的界面字，按同一个圆柱排
M.drawReel = function (ctx, r) {
  const t = r.t, N = r.tiles.length, p = M.reelP(r), lockT = M.reelLock(r), dur = M.reelDur(r), SH = M.SHOW, PX = M.PXR, CY = M.REEL_CYL;
  const vel = Math.abs(M.reelP(Object.assign({}, r, { t: t + 0.02 })) - p) / 0.02, locked = t >= lockT;
  const cur = r.tiles[((Math.round(p) % N) + N) % N], cc = palC(cur.c);
  const inA = eback(t / 0.35), outA = st4(clamp((dur - t) / 0.25, 0, 1)), W = 820, H = 640, hw = W / 2, hh = H / 2;
  const upIdx = r.ups ? [...Array(r.ups)].map((_, i) => 2.55 + i * 0.95).findIndex(a => t >= a && t < a + 0.45) : -1;
  const ant = t < lockT ? clamp((t - (lockT - 0.9)) / 0.9, 0, 1) : 0, punch = locked ? 1 + 0.16 * Math.exp(-(t - lockT) * 9) * Math.cos((t - lockT) * 30) : 1, upP = upIdx >= 0 ? 1 + 0.07 * (1 - clamp((t - (2.55 + upIdx * 0.95)) / 0.45, 0, 1)) : 1;
  // 蓄力：每次往上冲之前灯珠全灭、窗口透出下一档的颜色、机箱越抖越厉害
  let chg = 0; M.reelEv(r).forEach(E => { if (t < E && t > E - M.REEL_CHG) chg = (t - (E - M.REEL_CHG)) / M.REEL_CHG; });
  const nxt = r.tiles[((Math.round(p) + 1) % N + N) % N], nc = palC(nxt.c);
  const legend = r.itemMode && r.ups >= 4, black = legend && t > lockT - 0.18 && t < lockT ? 1 : 0;
  ctx.save();
  if (!r.fever) M.fxDim(ctx, 0.88 * st4(Math.min(1, t / 0.2)) * outA); ctx.globalAlpha = outA;
  if (ant > 0 && !r.fever) { ctx.globalAlpha = st4(0.35 * ant) * outA; R(ctx, 0, 0, 1920, 1080, P.ink); ctx.globalAlpha = outA; }
  if (SH && r.sh) SH.drawAll(ctx, r, 'back');   // the light fans out behind the cabinet
  const pz = SH && r.sh ? SH.push(r) : null, sn = (v) => Math.round(v / 4) * 4;
  const SC = inA * (0.85 + 0.15 * outA) * (1 + 0.08 * ant * ant + 0.04 * chg) * punch * upP * (pz ? pz.k : 1), jig = () => sn((Math.random() - 0.5) * (ant * 5 + chg * 10));
  ctx.translate(960 + jig() + (pz ? pz.sx : 0), 540 + jig() + (pz ? pz.sy : 0) - sn(curve(M.CURVE.jolt, t - 0.2) * 0.7)); ctx.scale(SC, SC);
  // the cabinet: body, drum and its quality tags, rails, bulbs, lever
  if (PX && PX.has('_reel_cab')) { PX.pixels('_reel_cab', t, { p, tiles: r.mats || (r.mats = r.tiles.map(tl => M.reelMat(tl.c))), chg, lock: locked ? Math.max(0, 1 - (t - lockT) / 0.6) * 2.4 : 0, tc: locked ? M.reelMat(cur.c) : null, rail: t > 1.2 ? M.reelMat(cur.c) : 'gold', lever: t < 0.45 ? Math.sin(t / 0.45 * Math.PI) : 0, fast: vel > 0.5 }, '_reel'); const s = PX.slots._reel; if (s && s.cx) { s.cx.putImageData(s.img, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(s.cv, -hw, -hh, W, H); } }
  if (locked) frame(ctx, -hw + 28, -hh + 36, 752, 592, 4, cc);   // a quality-coloured line round the body once it locks
  // 招牌灯箱压在机箱上沿，图标放在灯箱左头
  const tw = U.measure(ctx, r.title, 60) + 4 * ([...String(r.title)].length - 1), mq = U.marquee(ctx, r.title, 0, -hh + 40, { size: 60, t, minW: Math.max(560, tw + 180) });
  if (r.icon) { ctx.imageSmoothingEnabled = false; ctx.drawImage(r.icon, Math.round(mq.x + 18), -hh + 8, 64, 64); }
  // the words on the drum: quality name and its line, on the same cylinder as the drum's bands
  const WX = -hw + CY.x0 * 4, WY = -hh + CY.y0 * 4, WW = (CY.x1 - CY.x0) * 4, WH = (CY.y1 - CY.y0) * 4, cx = -hw + CY.cx * 4, cy = -hh + CY.cy * 4, RR = CY.R * 4;
  ctx.save(); ctx.beginPath(); ctx.rect(WX, WY, WW, WH); ctx.clip();
  const base = Math.floor(p), fr = p - base;
  for (let o = -2; o <= 2; o++) {
    const off = o - fr, ang = off * CY.step; if (Math.abs(ang) > 1.25) continue; const tile = r.tiles[(((base + o) % N) + N) % N], tc = palC(tile.c), y = cy + Math.sin(ang) * RR, sy = Math.cos(ang), br = sy * sy;
    // 全速转时换成拖影：本体竖着拉长，身后（下方）拖两道越来越淡的残影
    const blurN = vel > 3 ? 3 : 1, gap = Math.min(40, vel * 2.4);
    for (let b = blurN - 1; b >= 0; b--) { ctx.save(); ctx.globalAlpha = outA * (blurN > 1 ? [0.85, 0.35, 0.15][b] : 1) * br; ctx.translate(cx, y + b * gap); ctx.scale(1, sy * (blurN > 1 ? 1.17 : 1));
      const ghost = blurN > 1 && b > 0; U.text(ctx, tile.n, 0, tile.sub ? -16 : 0, 76, tc, ghost ? { shadow: false } : { outline: true }); if (tile.sub) U.text(ctx, tile.sub, 0, 42, 28, P.cream, { shadow: !ghost }); ctx.restore(); }
  }
  ctx.globalAlpha = outA;
  if (locked && t < lockT + 0.45) { ctx.globalAlpha = Math.round(st4(1 - (t - lockT) / 0.45) * 8) / 8; R(ctx, WX, WY, WW, WH, P.white); }
  if (chg > 0) { ctx.globalAlpha = outA * Math.round(chg * (0.2 + 0.14 * Math.sin(t * 34)) * 8) / 8; R(ctx, WX, WY, WW, WH, nc); }
  if (upIdx >= 0) { const q = (t - (2.55 + upIdx * 0.95)) / 0.45; ctx.globalAlpha = Math.round(st4((1 - q) * 0.7) * 8) / 8; R(ctx, WX, WY, WW, WH, cc); }
  ctx.restore(); ctx.globalAlpha = outA;
  // 信息屏：凹槽里的墨描边字，锁定时弹一下
  let msg = '', mc = P.lavender;
  if (t < 0.5) msg = '拉杆！'; else if (t < 1.9) msg = '滚动中……';
  else if (upIdx >= 0) { msg = '升品' + '！'.repeat(upIdx + 1); mc = cc; }
  else if (chg > 0) { msg = '……'; mc = nc; }
  else if (r.tease && t >= lockT - 0.75 && t < lockT) { msg = '还能再升……？'; mc = P.cream; }
  else if (locked) { msg = r.itemMode ? '锁定 · ' + cur.n : cur.n; mc = cc; }
  else { msg = cur.n + '……'; mc = cc; }
  if (black) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; R(ctx, 0, 0, 1920, 1080, P.ink); ctx.restore(); }
  const ms = locked ? seq(POP, t - lockT, 0.075) : upIdx >= 0 ? 1.2 : 1, MY = -hh + 137 * 4;
  ctx.save(); ctx.translate(-hw + 98 * 4, MY); ctx.scale(ms, ms); U.text(ctx, msg, 0, 0, 44, mc, { outline: true }); ctx.restore();
  ctx.restore();
  if (SH && r.sh) SH.drawAll(ctx, r, 'front');
};

// treasure chest: M.drawChest is in mc-chest.js (the vault, pixel room engine)

// ───────── big banners (announcements / skill cut-in) ─────────
// 通告横幅按意思分色：日常 = 酒红，好消息 = 金，撤离 = 青，危险 = 红（b.band 可以直接指定）
const BAND = { wine: [P.wine, P.red, P.umber], gold: [P.amber, P.gold, P.brown], teal: [P.tealDeep, P.teal, P.night], red: [P.red, P.pink, P.wine] };
const bandOf = (b) => { if (BAND[b.band]) return b.band; const c = palC(b.col || ''); return [P.red, P.pink, P.wine].includes(c) ? 'red' : [P.teal, P.tealDeep, P.ice].includes(c) ? 'teal' : [P.gold, P.amber, P.butter].includes(c) ? 'gold' : 'wine'; };
const SLAMB = [2.4, 1.7, 1.2, 0.92, 1.06, 1];
M.drawBanner = function (ctx, b) {
  const t = b.t, X = 960, Y = b.y || 470;
  ctx.save();
  if (b.kind === 'skill') {
    // 技能切入：技能色硬边斜带（墨边、上亮下暗）+ 6px 速度线 + 墨描边大字，分 3 格滑进来
    const inq = seq([0.35, 0.75, 1], t, 0.08), a = Math.min(inq, st4(clamp((b.life - t) / 0.25, 0, 1))), tq = stepT(t, 12) / b.life;
    M.fxDim(ctx, a * 0.7);
    const col = palC(b.col || P.gold), sh = M.PJ && M.PJ.shades && /^#[0-9a-f]{6}$/i.test(col) ? M.PJ.shades(col) : { hi: P.white, lo: P.ink };
    ctx.globalAlpha = a; ctx.save(); ctx.translate(0, Y); ctx.transform(1, -0.08, 0, 1, 0, 0);
    const bx = Math.round((-1920 * (1 - inq) + (1920 * 0.2) * tq));
    R(ctx, bx - 200, -138, 2400, 276, P.ink); R(ctx, bx - 200, -132, 2400, 264, col); R(ctx, bx - 200, -132, 2400, 6, sh.hi); R(ctx, bx - 200, 123, 2400, 9, sh.lo);
    const tl = stepT(t, 24); ctx.globalAlpha = a * 0.45; for (let i = 0; i < 14; i++) { const ly = -120 + ((i * 37) % 240), lx = Math.round((((tl * 3200 + i * 400) % 2600) - 300) / 6) * 6; R(ctx, lx, Math.round(ly), 200 + (i % 3) * 120, 6, i % 3 ? P.white : P.butter); }
    ctx.globalAlpha = a;
    if (b.img) { ctx.imageSmoothingEnabled = false; const s = 1.0 + 0.08 * tq; const iw = b.img.width * s, ih = b.img.height * s; ctx.drawImage(b.img, Math.round(300 + bx * 0.3), Math.round(110 - ih), iw, ih); }
    const w128 = U.measure(ctx, b.text, 128), size = w128 > 1040 ? Math.max(64, Math.floor(128 * 1040 / w128 / 4) * 4) : 128, tx = Math.round(760 - (1 - inq) * 600 + 60 * tq);
    U.text(ctx, b.text, tx, -10, size, P.white, { align: 'left', outline: true });
    if (b.sub) U.text(ctx, b.sub, tx + 10, 90, 40, P.butter, { align: 'left', outline: true });
    ctx.restore();
  } else {
    // 通告：整条色带 + 上下跑马灯 + 果汁色带大字（墨描边）；色带分 3 格张开，字分 6 格砸下来，站稳后逐字跳
    const kind = bandOf(b), C = BAND[kind], sub = !!b.sub, out = Math.ceil(clamp((b.life - t) / 0.3, 0, 1) * 3) / 3;
    const hk = Math.min(seq([0.25, 0.6, 1], t, 0.05), out); if (hk <= 0) { ctx.restore(); return; }
    if (b.dim) M.fxDim(ctx, b.dim * hk);   // a banner that must be seen dims what is under it (the goal, mc-gdiff.js)
    const h = Math.max(6, Math.round((sub ? 252 : 204) * hk)), top = Math.round(Y + (sub ? 2 : 0) - h / 2);
    R(ctx, 0, top - 6, 1920, h + 12, P.ink); R(ctx, 0, top, 1920, h, C[0]); R(ctx, 0, top, 1920, 6, C[1]); R(ctx, 0, top + h - 9, 1920, 9, C[2]);
    U.chase(ctx, 0, top - 18, 1920, t); U.chase(ctx, 0, top + h + 12, 1920, t, true);
    const w0 = U.measure(ctx, b.text, 128), size = w0 > 1680 ? Math.max(64, Math.floor(128 * 1680 / w0 / 4) * 4) : 128;
    const s = seq(SLAMB, t, 0.0733), flashW = t < 0.1 && !RM(), ramp = kind !== 'teal' && !flashW, settled = t > 0.44 && !RM();
    ctx.save(); ctx.globalAlpha = out; ctx.translate(X, sub ? Y - 26 : Y); ctx.scale(s, s);
    const chars = [...(M.tr ? M.tr(String(b.text)) : String(b.text))], cw = chars.map(ch => U.measure(ctx, ch, size)), tw = cw.reduce((q, c) => q + c, 0) + 4 * (chars.length - 1);
    let px = -tw / 2; chars.forEach((ch, i) => { const ph = (t * 1.25 + (chars.length - i) * 0.12) % 1, dy = settled ? (-6 * Math.sin(ph * Math.PI * 2) - 3 * Math.max(0, Math.sin(ph * Math.PI * 2))) : 0; U.text(ctx, ch, px + cw[i] / 2, dy, size, flashW ? P.white : P.gold, { ramp, outline: true }); px += cw[i] + 4; });
    ctx.restore();
    if (sub && t > 0.3) { ctx.globalAlpha = (t > 0.4 ? 1 : 0.5) * out; U.text(ctx, b.sub, X, Y + 80, 40, P.butter); }
  }
  ctx.restore();
};
})();

;
