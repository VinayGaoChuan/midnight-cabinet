// ==== mc-base.js ====
(function () {
const M = window.MC;
const { spriteCanvas, BUILDINGS, TILES, QUALITY, BCOLS, BROWS, CORE, ENEMIES, HEROES, pick, wpick, fmt } = M;
const CNF = "'Noto Serif SC', serif", NUMF = "'Cinzel', 'Noto Serif SC', serif";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = M.ease.eo;
const CW = 300, CH = 210, TOP = 80, DOOR_X = CORE.c * CW + CW / 2;
M.BASE_GEO = { CW, CH, TOP, DOOR_X };
const PJ = M.PJ || {}, PP = PJ.PAL || {};   // 调色板（界面件只用这 32 色）
// 实心框：厚 th，画在矩形里面（选中 / 悬停框）
const frameIn = (x, X, Y, W, H, th, c) => { x.fillStyle = c; x.fillRect(X, Y, W, th); x.fillRect(X, Y + H - th, W, th); x.fillRect(X, Y + th, th, H - 2 * th); x.fillRect(X + W - th, Y + th, th, H - 2 * th); };
const PAL = {
  core:['#221c24', '#caa84a', '#ffe0a0'], steam:['#3a2618', '#b87333', '#ffb060'], magic:['#24163a', '#b86bff', '#d8a0ff'], nature:['#16301e', '#6aa84f', '#c8ff9a'],
  water:['#0e2438', '#4aa8d0', '#8fe0ff'], fantasy:['#3a1a1e', '#ffcc33', '#ffd98a'], scifi:['#0e1628', '#4af0ff', '#8ff6ff'], medieval:['#2a2622', '#8a8078', '#ffb060'], cartoon:['#3a2a4a', '#ff7ab0', '#ffe07a'],
};
M.STYLE_PAL = PAL;
const NPC = { core:['old'], power:['clockmaker'], forge:['butcherlord', 'cremator'], med:['nun'], recruit:['widow'], train:['watchman', 'child'], store:['old', 'child'], defense:['watchman'], luck:['musician'], misc:['child', 'musician'] };
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const cellX = (c) => c * CW, cellY = (r) => TOP + r * CH;
M.cellCenter = (c, r) => ({ x: cellX(c) + CW / 2, y: cellY(r) + CH / 2 });

// ───────── hi-res textures (logical CW×CH, bitmap TK× denser) ─────────
// pixel era: textures and rooms are painted at art resolution (one art pixel = 2 world units) and scaled up crisp
const TK = M.pixelMode ? 1 / M.PX : 3, shade = M.shade;
function texCanvas(W, H, K, paint) { const c = document.createElement('canvas'); c.width = Math.ceil(W * K); c.height = Math.ceil(H * K); const x = c.getContext('2d'); x.scale(K, K); paint(x, W, H); if (K < 1) c._px = 1; return M.hiRes(c, W, H, K); }
// a room rendered into its own art-resolution canvas each frame, then composited crisp (or smooth when zoomed far out)
const roomCv = {};
function drawRoomPx(ctx, X, Y, key, t, o, slot, zoom) {
  if (!M.pixelMode) return drawRoom(ctx, X, Y, CW, CH, key, t, o);
  const aw = Math.round(CW / M.PX), ah = Math.round(CH / M.PX); let c = roomCv[slot];
  if (!c) { c = roomCv[slot] = document.createElement('canvas'); c.width = aw; c.height = ah; }
  const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.clearRect(0, 0, aw, ah); x.imageSmoothingEnabled = false;
  drawRoom(x, 0, 0, aw, ah, key, t, o);
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = (zoom || 1) < 0.9; ctx.drawImage(c, 0, 0, aw, ah, X, Y, CW, CH); ctx.imageSmoothingEnabled = sm;
}
function rpath(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
// shaded solid block: vertical light falloff, lit top edge, dark bottom edge, thin ink outline
function box(x, X, Y, W, H, col, r) {
  r = r || 0; const g = x.createLinearGradient(0, Y, 0, Y + H); g.addColorStop(0, shade(col, 0.22)); g.addColorStop(1, shade(col, -0.32));
  x.fillStyle = g; if (r) { rpath(x, X, Y, W, H, r); x.fill(); } else x.fillRect(X, Y, W, H);
  x.fillStyle = 'rgba(255,240,215,0.26)'; x.fillRect(X + r, Y, W - 2 * r, Math.min(1.2, H));
  x.fillStyle = 'rgba(255,240,215,0.08)'; x.fillRect(X, Y + r, Math.min(1.2, W), H - 2 * r);
  x.fillStyle = 'rgba(0,0,0,0.38)'; x.fillRect(X + r, Y + H - 1.2, W - 2 * r, 1.2); x.fillRect(X + W - 1.2, Y + r, 1.2, H - 2 * r);
  x.strokeStyle = 'rgba(6,4,8,0.75)'; x.lineWidth = 0.9; if (r) { rpath(x, X + 0.45, Y + 0.45, W - 0.9, H - 0.9, r); x.stroke(); } else x.strokeRect(X + 0.45, Y + 0.45, W - 0.9, H - 0.9);
}
function rivets(x, pts, col) { pts.forEach(([a, b]) => { x.fillStyle = shade(col, -0.45); x.beginPath(); x.arc(a, b, 1.7, 0, 7); x.fill(); x.fillStyle = shade(col, 0.45); x.beginPath(); x.arc(a - 0.45, b - 0.45, 0.75, 0, 7); x.fill(); }); }
function shadowE(x, cx, cy, rw, rh, a) { x.fillStyle = 'rgba(0,0,0,' + (a || 0.4) + ')'; x.beginPath(); x.ellipse(cx, cy, rw, rh, 0, 0, 7); x.fill(); }
function glowC(x, cx, cy, r, col, a) { if (a <= 0) return; const A0 = x.globalAlpha, g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = A0 * a; x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); x.globalCompositeOperation = 'source-over'; x.globalAlpha = A0; }
function spark4(x, cx, cy, s, col) { x.fillStyle = col; x.beginPath(); x.moveTo(cx, cy - s); x.quadraticCurveTo(cx, cy, cx + s, cy); x.quadraticCurveTo(cx, cy, cx, cy + s); x.quadraticCurveTo(cx, cy, cx - s, cy); x.quadraticCurveTo(cx, cy, cx, cy - s); x.fill(); }
function gear(x, R, r, n, col) {
  x.fillStyle = shade(col, -0.15); for (let k = 0; k < n; k++) { x.save(); x.rotate(k * Math.PI * 2 / n); rpath(x, -6, -R, 12, 14, 2); x.fill(); x.fillStyle = 'rgba(255,240,215,0.25)'; x.fillRect(-5, -R, 10, 1.2); x.fillStyle = shade(col, -0.15); x.restore(); }
  const g = x.createRadialGradient(-r * 0.4, -r * 0.4, 2, 0, 0, r); g.addColorStop(0, shade(col, 0.4)); g.addColorStop(1, shade(col, -0.3)); x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill();
  x.strokeStyle = shade(col, -0.55); x.lineWidth = 1; x.stroke();
  x.strokeStyle = shade(col, -0.45); x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, r * 0.64, 0, 7); x.stroke();
  x.strokeStyle = shade(col, -0.35); x.lineWidth = 3.2; x.beginPath(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; x.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); x.lineTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62); } x.stroke();
  x.fillStyle = '#1a1620'; x.beginPath(); x.arc(0, 0, 7, 0, 7); x.fill(); x.fillStyle = shade(col, 0.45); x.beginPath(); x.arc(-1.6, -1.6, 2.6, 0, 7); x.fill();
}

const rockC = [];
function rock(v) {
  v = v || 0; if (rockC[v]) return rockC[v];
  const o = v * 977;
  return (rockC[v] = texCanvas(CW, CH, TK, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1e1814'); g.addColorStop(1, '#141011'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { // strata bands
      const y0 = i * 36 + rnd(o + i) * 12; x.fillStyle = i % 2 ? 'rgba(70,52,38,0.16)' : 'rgba(0,0,0,0.2)'; x.beginPath(); x.moveTo(0, y0);
      for (let xx = 0; xx <= w; xx += 25) x.lineTo(xx, y0 + Math.sin(xx * 0.03 + i + v) * 6); for (let xx = w; xx >= 0; xx -= 25) x.lineTo(xx, y0 + 14 + Math.sin(xx * 0.025 + i * 2 + v) * 5); x.fill();
    }
    for (let i = 0; i < 74; i++) { // embedded stones
      const cx = rnd(o + i + 3) * w, cy = rnd(o + i + 7) * h, r0 = 5 + rnd(o + i) * 15, n = 6 + Math.floor(rnd(o + i + 11) * 3), base = ['#2e251d', '#251e19', '#352b21', '#201a16', '#2b2521'][i % 5];
      x.beginPath(); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, r1 = r0 * (0.7 + rnd(o + i * 13 + k) * 0.45); x.lineTo(cx + Math.cos(a) * r1 * 1.25, cy + Math.sin(a) * r1 * 0.8); } x.closePath();
      const sg = x.createLinearGradient(cx - r0, cy - r0, cx + r0, cy + r0); sg.addColorStop(0, shade(base, 0.25)); sg.addColorStop(1, shade(base, -0.4)); x.fillStyle = sg; x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 0.8; x.stroke();
      x.save(); x.clip(); x.translate(0.9, 0.9); x.strokeStyle = 'rgba(255,232,200,0.14)'; x.lineWidth = 1.3; x.stroke(); x.restore();
    }
    x.strokeStyle = 'rgba(0,0,0,0.65)'; x.lineWidth = 0.7; // cracks
    for (let i = 0; i < 9; i++) { let px = rnd(o + i + 70) * w, py = rnd(o + i + 90) * h; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (rnd(o + i * 7 + k) - 0.5) * 30; py += rnd(o + i * 5 + k + 1) * 14; x.lineTo(px, py); } x.stroke(); }
    for (let i = 0; i < 460; i++) { const s = 0.5 + rnd(o + i + 200) * 1.4; x.fillStyle = i % 3 ? 'rgba(0,0,0,0.35)' : 'rgba(255,230,190,0.09)'; x.fillRect(rnd(o + i + 300) * w, rnd(o + i + 500) * h, s, s); }
    const vg = x.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); x.fillStyle = vg; x.fillRect(0, 0, w, h);
  }));
}

// ───────── room walls & floors (static, cached per style) ─────────
function bricks(x, w, h, col, bh, bw0) {
  x.fillStyle = shade(col, -0.55); x.fillRect(0, 0, w, h);
  for (let row = 0, y = 0; y < h; row++, y += bh) {
    let xx = row % 2 ? -bw0 / 2 : 0;
    while (xx < w) { const bw = bw0 * (0.75 + rnd(row * 31 + xx) * 0.5), c = shade(col, 0.08 + (rnd(row * 7 + xx * 3) - 0.5) * 0.22);
      const g = x.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, shade(c, 0.12)); g.addColorStop(1, shade(c, -0.18)); x.fillStyle = g; x.fillRect(xx + 0.8, y + 0.8, bw - 1.6, bh - 1.6);
      x.fillStyle = 'rgba(255,236,210,0.1)'; x.fillRect(xx + 0.8, y + 0.8, bw - 1.6, 0.7);
      for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(xx + rnd(row + k * 9 + xx) * bw, y + 2 + rnd(row * 3 + k + xx) * (bh - 4), 1, 1); }
      xx += bw; }
  }
}
const WALL = {
  core: (x, w, h, P) => bricks(x, w, h, '#3a3040', 14, 30),
  medieval: (x, w, h, P) => bricks(x, w, h, '#4a4038', 15, 34),
  steam: (x, w, h, P) => {
    for (let yy = 0; yy < h; yy += 38) for (let xx = 0; xx < w; xx += 50) { const c = shade('#4a3222', (rnd(xx + yy * 3) - 0.5) * 0.18); box(x, xx, yy, 50, 38, c); rivets(x, [[xx + 5, yy + 5], [xx + 45, yy + 5], [xx + 5, yy + 33], [xx + 45, yy + 33]], '#8a6040'); }
    const pipe = (X, Y, W, H) => { const hz = W > H, g = hz ? x.createLinearGradient(0, Y, 0, Y + H) : x.createLinearGradient(X, 0, X + W, 0); g.addColorStop(0, shade(P[1], -0.3)); g.addColorStop(0.35, shade(P[1], 0.45)); g.addColorStop(1, shade(P[1], -0.55)); x.fillStyle = g; x.fillRect(X, Y, W, H); };
    pipe(0, 14, w, 8); pipe(40, 14, 8, 60); pipe(w - 60, 14, 8, 80);
    [[36, 12, 16, 12], [w - 64, 12, 16, 12], [36, 64, 16, 6], [w - 64, 86, 16, 6]].forEach(([a, b, c, d]) => box(x, a, b, c, d, shade(P[1], -0.2), 1));
  },
  scifi: (x, w, h, P) => {
    for (let xx = 0; xx < w; xx += 40) { box(x, xx, 0, 40, h, shade('#1a2236', (rnd(xx) - 0.5) * 0.12)); x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 0.8; x.strokeRect(xx + 5, 10, 30, h - 30);
      for (let k = 0; k < 4; k++) { x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(xx + 10, 24 + k * 5, 20, 1.6); } x.fillStyle = shade(P[1], -0.2); x.globalAlpha = 0.5; x.fillRect(xx + 19, 10, 2, h - 50); x.globalAlpha = 1; }
  },
  magic: (x, w, h, P) => {
    bricks(x, w, h, '#2e2044', 30, 44);
    x.strokeStyle = P[1]; x.globalAlpha = 0.18; x.lineWidth = 1; for (let i = 0; i < 4; i++) { const cx = 38 + i * 74, cy = 50 + (i % 2) * 40; x.beginPath(); x.arc(cx, cy, 13, 0, 7); x.stroke(); x.beginPath(); for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 3; x.lineTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10); } x.closePath(); x.stroke(); } x.globalAlpha = 1;
  },
  nature: (x, w, h, P) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a2418'); g.addColorStop(1, '#1a1610'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,0.25)' : 'rgba(120,100,60,0.12)'; x.beginPath(); x.ellipse(rnd(i + 3) * w, rnd(i + 5) * h, 1 + rnd(i) * 4, 0.8 + rnd(i + 1) * 2, 0, 0, 7); x.fill(); }
    x.strokeStyle = '#3a2a18'; x.lineCap = 'round'; for (let i = 0; i < 5; i++) { x.lineWidth = 2.4 - i * 0.3; x.beginPath(); let px = rnd(i + 40) * w, py = 0; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (rnd(i * 5 + k) - 0.5) * 34; py += h / 8; x.lineTo(px, py); } x.stroke(); }
    for (let i = 0; i < 16; i++) { x.fillStyle = shade(P[1], -0.3 + rnd(i) * 0.3); x.globalAlpha = 0.35; x.beginPath(); x.ellipse(rnd(i + 60) * w, rnd(i + 80) * h * 0.4, 8 + rnd(i) * 14, 4 + rnd(i + 2) * 6, 0, 0, 7); x.fill(); } x.globalAlpha = 1;
  },
  water: (x, w, h, P) => {
    x.fillStyle = '#081a28'; x.fillRect(0, 0, w, h);
    for (let yy = 0; yy < h; yy += 15) for (let xx = 0; xx < w; xx += 15) { const c = shade('#1d4a66', (rnd(xx * 3 + yy) - 0.5) * 0.3); const g = x.createLinearGradient(xx, yy, xx + 14, yy + 14); g.addColorStop(0, shade(c, 0.2)); g.addColorStop(1, shade(c, -0.2)); x.fillStyle = g; x.fillRect(xx + 0.7, yy + 0.7, 13.6, 13.6); x.fillStyle = 'rgba(255,255,255,0.1)'; x.fillRect(xx + 1, yy + 1, 12, 0.6); }
  },
  fantasy: (x, w, h, P) => {
    x.fillStyle = '#3a1418'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,204,51,0.14)'; for (let yy = 0; yy < h; yy += 20) for (let xx = (yy / 20 % 2) * 12; xx < w; xx += 24) { x.beginPath(); x.moveTo(xx, yy - 6); x.lineTo(xx + 5, yy); x.lineTo(xx, yy + 6); x.lineTo(xx - 5, yy); x.fill(); x.beginPath(); x.arc(xx, yy, 1.2, 0, 7); x.fill(); }
    [18, w - 32].forEach(px => { box(x, px, 0, 14, h, shade(P[1], -0.15)); x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 0.8; for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(px + k * 3.5, 6); x.lineTo(px + k * 3.5, h - 4); x.stroke(); } box(x, px - 3, 0, 20, 6, P[1]); box(x, px - 3, h - 8, 20, 8, P[1]); });
  },
  cartoon: (x, w, h, P) => {
    for (let xx = 0; xx < w; xx += 20) { x.fillStyle = (xx / 20) % 2 ? '#3a2a4a' : '#43305a'; x.fillRect(xx, 0, 20, h); }
    x.fillStyle = 'rgba(255,224,122,0.2)'; for (let yy = 12; yy < h; yy += 22) for (let xx = 10; xx < w; xx += 20) { x.beginPath(); x.arc(xx, yy + ((xx / 20) % 2) * 11, 2.2, 0, 7); x.fill(); }
    box(x, 0, h - 26, w, 26, '#5a3a66'); x.fillStyle = 'rgba(0,0,0,0.25)'; for (let xx = 0; xx < w; xx += 30) x.fillRect(xx, h - 24, 1, 22);
  },
};
function floor(x, w, h, style, P) {
  const y0 = h - 30;
  if (style === 'scifi' || style === 'steam') {
    box(x, 0, y0, w, 30, style === 'scifi' ? '#1a1e28' : '#24201c');
    x.fillStyle = 'rgba(255,255,255,0.07)'; for (let yy = y0 + 5; yy < h - 2; yy += 6) for (let xx = (yy % 12 ? 3 : 0); xx < w; xx += 6) { x.save(); x.translate(xx, yy); x.rotate(0.6); x.fillRect(-2, -0.5, 4, 1); x.restore(); }
  } else if (style === 'magic' || style === 'water' || style === 'nature') {
    const base = style === 'magic' ? '#2a2236' : style === 'water' ? '#1a2a36' : '#2a2a1e';
    for (let xx = 0, i = 0; xx < w; xx += 30, i++) box(x, xx, y0, 30, 30, shade(base, (rnd(i + 17) - 0.5) * 0.2));
  } else {
    const base = style === 'cartoon' ? '#4a2e1e' : style === 'fantasy' ? '#3a2014' : '#2e2218';
    for (let xx = -20, i = 0; xx < w; i++) { const pw = 44 + rnd(i + 3) * 30; box(x, xx, y0, pw, 15, shade(base, (rnd(i) - 0.5) * 0.25)); xx += pw; }
    for (let xx = 0, i = 0; xx < w; i++) { const pw = 44 + rnd(i + 9) * 30; box(x, xx, y0 + 15, pw, 15, shade(base, (rnd(i + 5) - 0.5) * 0.25)); xx += pw; }
    x.strokeStyle = 'rgba(0,0,0,0.2)'; x.lineWidth = 0.6; for (let i = 0; i < 18; i++) { const yy = y0 + 3 + rnd(i + 40) * 24, xx = rnd(i + 50) * w; x.beginPath(); x.moveTo(xx, yy); x.quadraticCurveTo(xx + 12, yy + 1.5, xx + 26, yy); x.stroke(); }
  }
  x.fillStyle = P[1]; x.globalAlpha = 0.55; x.fillRect(0, y0, w, 2.5); x.globalAlpha = 0.25; x.fillStyle = '#fff'; x.fillRect(0, y0, w, 0.7); x.globalAlpha = 1;
}
const bgC = {};
function roomBg(style) {
  if (bgC[style]) return bgC[style];
  const P = PAL[style];
  return (bgC[style] = texCanvas(CW, CH, TK, (x, w, h) => {
    const fy = h - 30;
    x.save(); x.beginPath(); x.rect(0, 0, w, fy); x.clip(); (WALL[style] || WALL.medieval)(x, w, fy, P); x.restore();
    const tint = x.createLinearGradient(0, 0, 0, fy); tint.addColorStop(0, P[0] + '55'); tint.addColorStop(1, 'rgba(6,4,8,0.55)'); x.fillStyle = tint; x.fillRect(0, 0, w, fy);
    floor(x, w, h, style, P);
    let g = x.createLinearGradient(0, 0, 0, 28); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, 28);
    g = x.createLinearGradient(0, fy - 26, 0, fy); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.4)'); x.fillStyle = g; x.fillRect(0, fy - 26, w, 26);
    [[0, 22], [w, w - 22]].forEach(([a, b]) => { const s = x.createLinearGradient(a, 0, b, 0); s.addColorStop(0, 'rgba(0,0,0,0.45)'); s.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = s; x.fillRect(Math.min(a, b), 0, 22, h); });
  }));
}
let emptyC = null;
function emptyRoom() {
  if (emptyC) return emptyC;
  return (emptyC = texCanvas(CW, CH, TK, (x, w, h) => {
    x.drawImage(roomBg('medieval'), 0, 0, w, h); x.fillStyle = 'rgba(10,8,14,0.5)'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const cx = 14 + rnd(i + 900) * (w - 28), s = 2 + rnd(i + 950) * 6, c = ['#3a3230', '#2a2422', '#4a403a'][i % 3]; x.fillStyle = shade(c, 0.1); x.beginPath(); x.ellipse(cx, h - 30 - s * 0.4, s, s * 0.6, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,240,215,0.12)'; x.beginPath(); x.ellipse(cx - s * 0.3, h - 30 - s * 0.7, s * 0.4, s * 0.2, 0, 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(220,220,230,0.18)'; x.lineWidth = 0.5; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(6, 6 + k * 7); x.quadraticCurveTo(14 + k * 3, 14 + k * 3, 6 + k * 7, 6); x.stroke(); } x.beginPath(); x.moveTo(6, 6); x.lineTo(36, 36); x.stroke();
  }));
}

// ───────── room painter ─────────
function drawRoom(ctx, X, Y, W, H, key, t, o = {}) {
  const B = BUILDINGS[key], P = PAL[B.style], s = W / CW;
  ctx.save(); ctx.translate(X, Y); ctx.scale(s, s);
  const w = CW, h = CH, A0 = ctx.globalAlpha, al = (a) => { ctx.globalAlpha = A0 * a; };
  ctx.drawImage(roomBg(B.style), 0, 0, w, h);
  // living wall details
  if (B.style === 'nature') { for (let i = 0; i < 8; i++) { const xx = 10 + i * 38; for (let k = 0; k < 6; k++) { al(0.45); ctx.fillStyle = k % 2 ? P[1] : shade(P[1], -0.25); ctx.beginPath(); ctx.ellipse(xx + 3 + Math.sin(t * 1.5 + i + k) * 3, k * 14 + 5, 4.5, 2.2, 0.6 * (k % 2 ? 1 : -1), 0, 7); ctx.fill(); } } al(1); }
  if (B.style === 'water') { ctx.strokeStyle = P[2]; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { al(0.22); const yy = 30 + i * 26 + Math.sin(t * 2 + i) * 4; ctx.beginPath(); ctx.moveTo(0, yy); for (let xx = 0; xx <= w; xx += 20) ctx.quadraticCurveTo(xx + 5, yy + (xx / 20 % 2 ? 3 : -3), xx + 10, yy); ctx.stroke(); } al(1); }
  if (B.style === 'magic') { for (let i = 0; i < 6; i++) { al(0.25 + 0.3 * Math.sin(t * 2 + i)); spark4(ctx, 27 + i * 48, 37 + (i % 2) * 30, 5, P[2]); } al(1); }
  const fx = w / 2, fy = h - 30;
  // category props (animated)
  // bespoke scenes (mc-rooms) override the generic category props; 'bare' also drops the style flourishes
  const cat = B.cat, PB = M.ROOMS && M.ROOMS[key], look = PB ? PB(ctx, t, P, o, { w, h, fx, fy, A0, al, B }) : null;
  if (PB) {}
  else if (cat === 'core') {
    for (let i = 0; i < 3; i++) {
      const sy = 40 + i * 44;
      for (let k = 0; k < 3; k++) { const cx = 22 + k * 28, cy = 18 + i * 44; box(ctx, cx, cy, 22, 22, ['#6a4a2a', '#8a6a3a', '#4a3a2a'][(i + k) % 3]); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + 3, cy + 3); ctx.lineTo(cx + 19, cy + 19); ctx.moveTo(cx + 19, cy + 3); ctx.lineTo(cx + 3, cy + 19); ctx.stroke(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(cx, cy + 10, 22, 1.5); }
      box(ctx, 14, sy, 94, 6, '#4a3a2a'); ctx.fillStyle = '#1e1812'; ctx.fillRect(18, sy + 6, 3, 6); ctx.fillRect(101, sy + 6, 3, 6);
    }
    box(ctx, w - 110, 0, 80, h - 30, '#2a2430'); ctx.fillStyle = '#0b090e'; ctx.fillRect(w - 102, 0, 64, h - 30);
    ctx.fillStyle = '#3a3440'; ctx.fillRect(w - 100, 0, 3, h - 30); ctx.fillRect(w - 43, 0, 3, h - 30); ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let yy = 8; yy < h - 34; yy += 16) ctx.fillRect(w - 102, yy, 64, 1);
    const ey = (Math.sin(t * 0.8) * 0.5 + 0.5) * (h - 90);
    ctx.strokeStyle = '#caa84a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(w - 76, 0); ctx.lineTo(w - 76, ey); ctx.moveTo(w - 64, 0); ctx.lineTo(w - 64, ey); ctx.stroke();
    box(ctx, w - 100, ey, 60, 56, '#caa84a', 3);
    const wg = ctx.createLinearGradient(0, ey + 8, 0, ey + 48); wg.addColorStop(0, '#2e2840'); wg.addColorStop(1, '#0e0c14'); ctx.fillStyle = wg; ctx.fillRect(w - 94, ey + 8, 48, 40);
    ctx.fillStyle = '#8a6a2a'; ctx.fillRect(w - 71, ey + 8, 2, 40); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w - 90, ey + 44); ctx.lineTo(w - 78, ey + 12); ctx.stroke();
    glowC(ctx, w - 70, ey + 3, 12, '#ffe0a0', 0.9);
  } else if (cat === 'power') {
    const pu = 0.6 + 0.4 * Math.sin(t * 4);
    for (let i = 0; i < 2; i++) box(ctx, fx + (i ? 86 : -94), fy - 60, 8, 60, '#3a3a44');
    shadowE(ctx, fx, fy, 60, 4);
    box(ctx, fx - 50, fy - 110, 100, 110, '#2e2e38', 3); box(ctx, fx - 50, fy - 110, 100, 8, P[1]);
    rivets(ctx, [[fx - 44, fy - 96], [fx + 44, fy - 96], [fx - 44, fy - 8], [fx + 44, fy - 8]], '#7a7a88');
    ctx.fillStyle = '#0c0a10'; rpath(ctx, fx - 29, fy - 93, 58, 76, 7); ctx.fill();
    al(pu); const tg = ctx.createLinearGradient(fx - 26, 0, fx + 26, 0); tg.addColorStop(0, shade(P[2], -0.35)); tg.addColorStop(0.5, '#ffffff'); tg.addColorStop(1, shade(P[2], -0.35)); ctx.fillStyle = tg; rpath(ctx, fx - 26, fy - 90, 52, 70, 6); ctx.fill(); al(1);
    ctx.save(); rpath(ctx, fx - 26, fy - 90, 52, 70, 6); ctx.clip(); ctx.strokeStyle = shade(P[1], -0.2); ctx.lineWidth = 1.3; for (let k = 0; k < 6; k++) { const yy = fy - 92 + k * 14 + (t * 30 % 14); ctx.beginPath(); ctx.moveTo(fx - 26, yy); ctx.quadraticCurveTo(fx, yy - 5, fx + 26, yy); ctx.stroke(); } ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(fx - 19, fy - 86, 2, 60);
    glowC(ctx, fx, fy - 55, 80, P[2], 0.3 * pu);
    for (let i = 0; i < 2; i++) { ctx.save(); ctx.translate(fx + (i ? 90 : -90), fy - 60); ctx.rotate(t * (i ? 2 : -2)); gear(ctx, 34, 24, 8, P[1]); ctx.restore(); }
    if (Math.floor(t * 6) % 5 === 0) { ctx.strokeStyle = P[2]; ctx.lineWidth = 4; al(0.4); const bolt = () => { ctx.beginPath(); ctx.moveTo(fx - 20, fy - 110); ctx.lineTo(fx - 4, fy - 130); ctx.lineTo(fx - 12, fy - 140); ctx.lineTo(fx + 10, fy - 165); ctx.stroke(); }; bolt(); al(1); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; bolt(); glowC(ctx, fx - 5, fy - 140, 40, P[2], 0.6); }
  } else if (cat === 'forge') {
    const fire = 0.7 + 0.3 * Math.sin(t * 12);
    ctx.fillStyle = '#1e1614'; ctx.beginPath(); ctx.moveTo(24, fy - 110); ctx.lineTo(106, fy - 110); ctx.lineTo(90, fy - 126); ctx.lineTo(40, fy - 126); ctx.fill(); box(ctx, 50, 0, 30, fy - 126, '#2a201e');
    box(ctx, 20, fy - 110, 90, 110, '#4a3430', 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8; for (let k = 1; k < 11; k++) { const yy = fy - 110 + k * 10; ctx.beginPath(); ctx.moveTo(20, yy); ctx.lineTo(110, yy); ctx.stroke(); for (let xx = 20 + (k % 2) * 11; xx < 110; xx += 22) { ctx.beginPath(); ctx.moveTo(xx, yy - 10); ctx.lineTo(xx, yy); ctx.stroke(); } }
    ctx.fillStyle = '#120a08'; ctx.beginPath(); ctx.moveTo(32, fy - 16); ctx.lineTo(32, fy - 56); ctx.arc(65, fy - 56, 33, Math.PI, 0); ctx.lineTo(98, fy - 16); ctx.fill();
    const fg = ctx.createRadialGradient(65, fy - 26, 4, 65, fy - 34, 38); fg.addColorStop(0, '#fff6c8'); fg.addColorStop(0.35, '#ffcf4a'); fg.addColorStop(0.7, '#ff6a2a'); fg.addColorStop(1, 'rgba(255,60,20,0)'); al(fire); ctx.fillStyle = fg; ctx.fillRect(32, fy - 88, 66, 72);
    for (let k = 0; k < 4; k++) { const fxx = 44 + k * 14, fh = 26 + 14 * Math.sin(t * 9 + k * 1.7); ctx.fillStyle = k % 2 ? '#ffb030' : '#ffe08a'; ctx.beginPath(); ctx.moveTo(fxx - 7, fy - 18); ctx.quadraticCurveTo(fxx - 6, fy - 18 - fh * 0.6, fxx + Math.sin(t * 7 + k) * 3, fy - 18 - fh); ctx.quadraticCurveTo(fxx + 6, fy - 18 - fh * 0.6, fxx + 7, fy - 18); ctx.fill(); } al(1);
    for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? '#6a1a10' : '#c0401a'; ctx.beginPath(); ctx.arc(38 + k * 9, fy - 17, 4, 0, 7); ctx.fill(); }
    glowC(ctx, 65, fy - 45, 100, '#ff7a30', 0.4 * fire);
    const hit = (t * 1.6) % 1, ang = hit < 0.3 ? -1.2 + hit / 0.3 * 1.4 : 0.2 - (hit - 0.3) / 0.7 * 1.4;
    shadowE(ctx, fx + 35, fy, 36, 3.5);
    ctx.beginPath(); ctx.moveTo(fx - 26, fy - 42); ctx.quadraticCurveTo(fx - 12, fy - 46, fx - 6, fy - 46); ctx.lineTo(fx + 80, fy - 46); ctx.lineTo(fx + 80, fy - 34); ctx.lineTo(fx + 56, fy - 30); ctx.lineTo(fx + 50, fy - 16); ctx.lineTo(fx + 62, fy - 8); ctx.lineTo(fx + 62, fy); ctx.lineTo(fx + 8, fy); ctx.lineTo(fx + 8, fy - 8); ctx.lineTo(fx + 20, fy - 16); ctx.lineTo(fx + 14, fy - 30); ctx.lineTo(fx - 4, fy - 34); ctx.quadraticCurveTo(fx - 16, fy - 36, fx - 26, fy - 42); ctx.closePath();
    const ag = ctx.createLinearGradient(0, fy - 46, 0, fy); ag.addColorStop(0, '#8a929e'); ag.addColorStop(0.3, '#4e545e'); ag.addColorStop(1, '#23262c'); ctx.fillStyle = ag; ctx.fill(); ctx.strokeStyle = 'rgba(6,4,8,0.8)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(fx - 4, fy - 46, 84, 0.8);
    const hot = hit > 0.25 && hit < 0.6 ? 1 : 0.6; ctx.fillStyle = hot > 0.9 ? '#fff0a0' : '#ff8a3a'; ctx.fillRect(fx + 22, fy - 50, 26, 4); glowC(ctx, fx + 35, fy - 48, 22, '#ff9a3a', 0.6 * hot);
    ctx.save(); ctx.translate(fx + 70, fy - 90); ctx.rotate(ang);
    const hg = ctx.createLinearGradient(-3, 0, 3, 0); hg.addColorStop(0, '#8a6a3a'); hg.addColorStop(1, '#4a3218'); ctx.fillStyle = hg; ctx.fillRect(-2.5, 0, 5, 50); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.8; ctx.strokeRect(-2.5, 0, 5, 50);
    box(ctx, -14, 44, 28, 16, '#6a707c', 2); ctx.restore();
    if (hit > 0.28 && hit < 0.4) for (let i = 0; i < 7; i++) { const px = fx + 30 + Math.cos(i) * 30 * (hit - 0.28) * 20, py = fy - 50 - Math.abs(Math.sin(i * 2)) * 40 * (hit - 0.28) * 10; ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 7); ctx.fill(); glowC(ctx, px, py, 7, '#ffb040', 0.8); }
    ctx.strokeStyle = '#5a5e66'; ctx.lineWidth = 1.6; [[128, 30], [138, 34]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(a, 24); ctx.lineTo(a - 3, 24 + b); ctx.moveTo(a, 24); ctx.lineTo(a + 3, 24 + b); ctx.stroke(); }); ctx.fillStyle = '#3a3036'; ctx.fillRect(120, 20, 26, 4);
  } else if (cat === 'med') {
    for (let i = 0; i < 2; i++) { const bx = 24 + i * 150;
      shadowE(ctx, bx + 50, fy, 54, 3.5);
      box(ctx, bx - 2, fy - 46, 6, 46, '#8a95a3', 1); box(ctx, bx, fy - 14, 6, 14, '#8a95a3'); box(ctx, bx + 94, fy - 14, 6, 14, '#8a95a3');
      box(ctx, bx, fy - 30, 100, 16, '#cfd8e3', 2);
      box(ctx, bx + 34, fy - 33, 64, 14, shade(P[1], -0.35), 3); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(bx + 40, fy - 27); ctx.lineTo(bx + 92, fy - 27); ctx.stroke();
      const pg = ctx.createLinearGradient(0, fy - 42, 0, fy - 28); pg.addColorStop(0, '#fff6ea'); pg.addColorStop(1, '#bfb4a2'); ctx.fillStyle = pg; rpath(ctx, bx + 4, fy - 41, 28, 12, 5); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8; ctx.stroke(); }
    box(ctx, w - 84, 22, 68, 52, '#2a3038', 3); ctx.fillStyle = '#06120d'; ctx.fillRect(w - 80, 26, 60, 44);
    ctx.fillStyle = 'rgba(156,255,122,0.08)'; for (let k = 0; k < 8; k++) { ctx.fillRect(w - 80 + k * 8, 26, 0.6, 44); ctx.fillRect(w - 80, 26 + k * 6, 60, 0.6); }
    const ecg = () => { ctx.beginPath(); for (let k = 0; k < 56; k++) { const ph = (k / 56 + t * 0.8) % 1, yy = ph > 0.45 && ph < 0.55 ? Math.sin((ph - 0.45) * 60) * 16 : 0; k ? ctx.lineTo(w - 78 + k, 48 - yy) : ctx.moveTo(w - 78, 48); } ctx.stroke(); };
    ctx.strokeStyle = 'rgba(156,255,122,0.3)'; ctx.lineWidth = 4; ecg(); ctx.strokeStyle = '#c8ffb0'; ctx.lineWidth = 1.2; ecg();
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.moveTo(w - 80, 26); ctx.lineTo(w - 50, 26); ctx.lineTo(w - 80, 56); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(fx - 8, 18, 16, 40); ctx.fillRect(fx - 20, 30, 40, 16);
    ctx.fillStyle = '#d0453c'; ctx.fillRect(fx - 6, 20, 12, 36); ctx.fillRect(fx - 18, 32, 36, 12); glowC(ctx, fx, 38, 34, '#ff5040', 0.35);
  } else if (cat === 'recruit') {
    const pa = 0.5 + 0.3 * Math.sin(t * 2), pg = ctx.createLinearGradient(fx - 32, 0, fx + 32, 0);
    pg.addColorStop(0, 'rgba(0,0,0,0)'); pg.addColorStop(0.5, P[2]); pg.addColorStop(1, 'rgba(0,0,0,0)'); al(pa); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = pg; ctx.fillRect(fx - 32, 12, 64, fy - 12); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(fx - 1.5, 12, 3, fy - 12); ctx.globalCompositeOperation = 'source-over'; al(1);
    box(ctx, fx - 24, fy - 14, 48, 14, '#2a2230'); box(ctx, fx - 30, fy - 18, 60, 5, '#3a3040');
    ctx.save(); ctx.translate(fx, fy - 8); ctx.scale(1, 0.3); ctx.rotate(t * 0.8);
    al(0.7 + 0.3 * Math.sin(t * 3)); ctx.strokeStyle = P[2]; ctx.lineWidth = 7; ctx.globalAlpha *= 0.35; ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.stroke(); al(0.7 + 0.3 * Math.sin(t * 3));
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k <= 5; k++) { const a = k * Math.PI * 0.8; k ? ctx.lineTo(Math.cos(a) * 80, Math.sin(a) * 80) : ctx.moveTo(80, 0); } ctx.stroke();
    ctx.fillStyle = P[2]; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; ctx.fillRect(Math.cos(a) * 86 - 1.5, Math.sin(a) * 86 - 1.5, 3, 3); } ctx.restore(); al(1);
    glowC(ctx, fx, fy - 8, 90, P[2], 0.35);
    for (let k = 0; k < 7; k++) { const px = fx - 40 + ((k * 23 + t * 30) % 80), py = fy - ((t * 60 + k * 30) % (fy - 20)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, 7); ctx.fill(); glowC(ctx, px, py, 8, P[2], 0.9); }
  } else if (cat === 'train') {
    shadowE(ctx, fx + 55, fy, 30, 3); box(ctx, fx + 38, fy - 6, 34, 6, '#5a3a1a'); box(ctx, fx + 50, fy - 90, 10, 90, '#6a4a2a');
    ctx.save(); ctx.translate(fx + 55, fy - 90); ctx.rotate(Math.sin(t * 5) * 0.2);
    const sg = ctx.createLinearGradient(-26, 0, 26, 0); sg.addColorStop(0, '#e0c890'); sg.addColorStop(1, '#8a6a34'); ctx.fillStyle = sg; rpath(ctx, -26, -20, 52, 60, 10); ctx.fill(); ctx.strokeStyle = 'rgba(40,24,8,0.7)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(90,60,20,0.5)'; ctx.lineWidth = 0.7; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.moveTo(-22 + k * 5, -16); ctx.lineTo(-24 + k * 5.4, 36); ctx.stroke(); }
    ctx.fillStyle = '#4a2e14'; ctx.fillRect(-26, -6, 52, 3); ctx.fillRect(-26, 26, 52, 3);
    [[10, '#d0453c'], [6.5, '#f0e8d8'], [3.2, '#d0453c']].forEach(([r, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 10, r, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#c8aa70'; ctx.beginPath(); ctx.arc(0, -32, 12, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(40,24,8,0.7)'; ctx.lineWidth = 1; ctx.stroke(); ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.4; [[-5, -34], [4, -34]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(a - 2, b - 2); ctx.lineTo(a + 2, b + 2); ctx.moveTo(a + 2, b - 2); ctx.lineTo(a - 2, b + 2); ctx.stroke(); }); ctx.restore();
    shadowE(ctx, 70, fy, 46, 3);
    const bg = ctx.createLinearGradient(0, fy - 20, 0, fy - 14); bg.addColorStop(0, '#d0d6de'); bg.addColorStop(1, '#5a606a'); ctx.fillStyle = bg; ctx.fillRect(30, fy - 19, 80, 5);
    [26, 100].forEach(px => { box(ctx, px, fy - 30, 14, 28, '#2a2430', 3); ctx.fillStyle = '#6a6a78'; ctx.beginPath(); ctx.arc(px + 7, fy - 16.5, 3, 0, 7); ctx.fill(); });
  } else if (cat === 'store') {
    for (let i = 0; i < 5; i++) { const bb = i === 2 ? Math.abs(Math.sin(t * 3)) * 16 : 0, X0 = 20 + i * 52, Y0 = fy - 40 - (i % 2) * 40 - bb;
      if (i % 2) { box(ctx, X0 - 3, fy - 40, 50, 4, '#4a3a2a'); ctx.fillStyle = '#2a2018'; ctx.fillRect(X0 + 2, fy - 36, 3, 36); ctx.fillRect(X0 + 39, fy - 36, 3, 36); } else shadowE(ctx, X0 + 22, fy, 24 - bb * 0.4, 3);
      box(ctx, X0, Y0, 44, 40, ['#8a6a3a', '#6a4a2a', '#caa84a', '#5a4020', '#7a5a30'][i]);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(X0, Y0 + 13, 44, 1); ctx.fillRect(X0, Y0 + 26, 44, 1);
      ctx.fillStyle = '#9aa0aa'; [[0, 0], [38, 0], [0, 34], [38, 34]].forEach(([a, b]) => ctx.fillRect(X0 + a + 0.5, Y0 + b + 0.5, 5, 5));
      if (i === 3) { ctx.fillStyle = '#e8dcc4'; ctx.fillRect(X0 + 14, Y0 + 15, 16, 9); ctx.fillStyle = '#6a5a4a'; ctx.fillRect(X0 + 16, Y0 + 18, 12, 1); ctx.fillRect(X0 + 16, Y0 + 21, 8, 1); } }
    if (B.style === 'nature') for (let i = 0; i < 6; i++) { const hh = 30 + 10 * Math.sin(t * 2 + i), sx0 = 34 + i * 42, top = fy - hh - 50;
      ctx.strokeStyle = shade(P[1], -0.25); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(sx0, fy - 50); ctx.quadraticCurveTo(sx0 - 4, top + hh * 0.5, sx0, top); ctx.stroke();
      ctx.fillStyle = P[1]; [[-1, 0.35], [1, 0.6]].forEach(([d, q]) => { ctx.beginPath(); ctx.ellipse(sx0 + d * 6, top + hh * q, 6, 2.6, d * 0.5, 0, 7); ctx.fill(); });
      const fg = ctx.createRadialGradient(sx0 - 2, top - 6, 1, sx0, top - 4, 8); fg.addColorStop(0, '#fff'); fg.addColorStop(0.4, P[2]); fg.addColorStop(1, shade(P[2], -0.4)); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(sx0, top - 4, 7, 0, 7); ctx.fill(); }
  } else if (cat === 'defense') {
    const fire = o.fireT != null ? clamp(1 - (t - o.fireT) / 0.25, 0, 1) : 0;
    ctx.fillStyle = '#0b090e'; ctx.fillRect(fx - 30, 0, 60, 10); ctx.save(); ctx.beginPath(); ctx.rect(fx - 30, 6, 60, 4); ctx.clip(); for (let k = -1; k < 8; k++) { ctx.fillStyle = k % 2 ? '#1a1418' : '#caa84a'; ctx.beginPath(); ctx.moveTo(fx - 30 + k * 9, 10); ctx.lineTo(fx - 26 + k * 9, 6); ctx.lineTo(fx - 21 + k * 9, 6); ctx.lineTo(fx - 25 + k * 9, 10); ctx.fill(); } ctx.restore();
    shadowE(ctx, fx, fy, 66, 4);
    box(ctx, fx - 60, fy - 60, 120, 60, '#2e2e38', 3); box(ctx, fx - 60, fy - 60, 120, 8, P[1]);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; for (let k = 0; k < 5; k++) ctx.fillRect(fx - 40 + k * 18, fy - 40, 10, 2); rivets(ctx, [[fx - 54, fy - 46], [fx + 54, fy - 46], [fx - 54, fy - 8], [fx + 54, fy - 8]], '#7a7a88');
    ctx.save(); ctx.translate(fx, fy - 60); ctx.rotate(Math.sin(t * 0.7) * 0.25);
    const bgc = ctx.createLinearGradient(-14, 0, 14, 0); bgc.addColorStop(0, '#2a2a33'); bgc.addColorStop(0.35, '#9a9aa8'); bgc.addColorStop(1, '#1e1e26'); ctx.fillStyle = bgc; ctx.fillRect(-14, -120 + fire * 20, 28, 120);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 0.9; ctx.strokeRect(-14, -120 + fire * 20, 28, 120); ctx.fillStyle = 'rgba(0,0,0,0.45)'; [30, 60, 90].forEach(k => ctx.fillRect(-14, -k + fire * 20, 28, 3));
    box(ctx, -10, -126 + fire * 20, 20, 10, P[2], 2);
    const pv = ctx.createRadialGradient(-6, -6, 2, 0, 0, 18); pv.addColorStop(0, '#9a9aa8'); pv.addColorStop(1, '#22222a'); ctx.fillStyle = pv; ctx.beginPath(); ctx.arc(0, 0, 17, Math.PI, 0); ctx.fill();
    if (fire > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#fff2a0'; ctx.globalAlpha = A0 * fire; ctx.beginPath(); ctx.arc(0, -130, 26 * fire + 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = A0; ctx.globalCompositeOperation = 'source-over'; glowC(ctx, 0, -130, 60, '#ffd060', fire); } ctx.restore();
  } else if (cat === 'luck') {
    shadowE(ctx, fx, fy, 58, 4);
    box(ctx, fx - 50, fy - 110, 100, 110, '#7a1e30', 4); box(ctx, fx - 50, fy - 110, 7, 110, '#cfd8e3'); box(ctx, fx + 43, fy - 110, 7, 110, '#cfd8e3');
    box(ctx, fx - 46, fy - 112, 92, 12, '#3a0e16', 3);
    for (let k = 0; k < 8; k++) { const on = (Math.floor(t * 6) + k) % 2, bx0 = fx - 42 + k * 12; ctx.fillStyle = on ? '#fff6c0' : '#5a3a18'; ctx.beginPath(); ctx.arc(bx0, fy - 106, 3, 0, 7); ctx.fill(); if (on) glowC(ctx, bx0, fy - 106, 9, '#ffd060', 0.8); }
    box(ctx, fx - 40, fy - 92, 80, 44, '#cfd8e3', 3); ctx.fillStyle = '#0b090e'; ctx.fillRect(fx - 37, fy - 89, 74, 38);
    for (let k = 0; k < 3; k++) { const rx = fx - 32 + k * 24, rg2 = ctx.createLinearGradient(0, fy - 86, 0, fy - 54); rg2.addColorStop(0, '#6a6258'); rg2.addColorStop(0.5, '#f4ecdc'); rg2.addColorStop(1, '#6a6258'); ctx.fillStyle = rg2; ctx.fillRect(rx, fy - 86, 18, 32);
      const sc = ['#ffcc33', '#d0453c', '#9ccc6a', '#6fa8dc'][Math.floor(t * 8 + k * 1.3) % 4], sg = ctx.createRadialGradient(rx + 7, fy - 73, 1, rx + 9, fy - 70, 7); sg.addColorStop(0, '#fff'); sg.addColorStop(0.35, sc); sg.addColorStop(1, shade(sc, -0.45)); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(rx + 9, fy - 70, 6.5, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(fx - 37, fy - 89, 74, 6);
    box(ctx, fx - 30, fy - 30, 60, 10, '#3a0e16', 2); ctx.fillStyle = '#caa84a'; ctx.fillRect(fx - 8, fy - 42, 16, 3);
    const lv = Math.max(0, Math.sin(t * 1.3)) * 0.5; ctx.save(); ctx.translate(fx + 52, fy - 64); ctx.rotate(lv); ctx.strokeStyle = '#cfd8e3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -34); ctx.stroke(); const lb = ctx.createRadialGradient(6, -38, 1, 8, -36, 6); lb.addColorStop(0, '#ffb0a0'); lb.addColorStop(1, '#a01a1a'); ctx.fillStyle = lb; ctx.beginPath(); ctx.arc(8, -36, 5.5, 0, 7); ctx.fill(); ctx.restore();
  } else {
    shadowE(ctx, fx, fy, 48, 4);
    const pc = shade(P[1], -0.5); box(ctx, fx - 40, fy - 20, 80, 20, pc); box(ctx, fx - 24, fy - 120, 48, 100, pc); box(ctx, fx - 30, fy - 126, 60, 8, shade(P[1], -0.3)); ctx.fillStyle = P[1]; ctx.globalAlpha = A0 * 0.6; ctx.fillRect(fx - 24, fy - 124, 48, 1.5); ctx.fillRect(fx - 40, fy - 20, 80, 1.2); al(1);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(fx - 24 + k * 9.6, fy - 116); ctx.lineTo(fx - 24 + k * 9.6, fy - 22); ctx.stroke(); }
    const cy = fy - 150 + Math.sin(t * 2) * 6 + 12, ca = 0.6 + 0.4 * Math.sin(t * 2);
    glowC(ctx, fx, cy, 50, P[2], 0.45 * ca); al(ca);
    ctx.fillStyle = shade(P[2], -0.25); ctx.beginPath(); ctx.moveTo(fx, cy - 18); ctx.lineTo(fx - 12, cy); ctx.lineTo(fx, cy + 18); ctx.fill();
    ctx.fillStyle = shade(P[2], 0.3); ctx.beginPath(); ctx.moveTo(fx, cy - 18); ctx.lineTo(fx + 12, cy); ctx.lineTo(fx, cy + 18); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.globalAlpha *= 0.6; ctx.beginPath(); ctx.moveTo(fx, cy - 18); ctx.lineTo(fx + 5, cy - 6); ctx.lineTo(fx, cy - 2); ctx.fill(); al(1);
  }
  // style flourishes
  if (look !== 'bare' && look !== 'sky') {
  if (B.style === 'steam') for (let i = 0; i < 3; i++) { const q = ((t * 0.5 + i / 3) % 1), px = 42 + q * 20, py = 80 - q * 60, r = 8 + q * 16, sg = ctx.createRadialGradient(px, py, 0, px, py, r); sg.addColorStop(0, 'rgba(232,220,196,' + (0.35 * (1 - q)) + ')'); sg.addColorStop(1, 'rgba(232,220,196,0)'); ctx.fillStyle = sg; ctx.fillRect(px - r, py - r, r * 2, r * 2); }
  if (B.style === 'water') for (let i = 0; i < 6; i++) { const q = ((t * 0.4 + i / 6) % 1), px = 34 + i * 45 + Math.sin(t * 3 + i) * 5, py = fy - q * (fy - 10), r = 2.5 + (i % 3); al(0.7 * (1 - q)); ctx.strokeStyle = '#8fe0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.stroke(); ctx.fillStyle = '#e0fbff'; ctx.beginPath(); ctx.arc(px - r * 0.35, py - r * 0.35, r * 0.3, 0, 7); ctx.fill(); al(1); }
  if (B.style === 'magic' || B.style === 'fantasy') for (let i = 0; i < 4; i++) { const a = t * 1.2 + i * 1.57, px = fx + Math.cos(a) * 110, py = 63 + Math.sin(a) * 20; spark4(ctx, px, py, 5, P[2]); glowC(ctx, px, py, 12, P[2], 0.7); }
  if (B.style === 'scifi') { const on = Math.floor(t * 3) % 2 ? '#ff4a6a' : '#4af0ff'; ctx.fillStyle = '#0b0e16'; ctx.fillRect(w - 22, 10, 12, 12); ctx.fillStyle = on; ctx.beginPath(); ctx.arc(w - 16, 16, 3.5, 0, 7); ctx.fill(); glowC(ctx, w - 16, 16, 14, on, 0.8); const sy = (t * 60) % h, sl = ctx.createLinearGradient(0, sy, 0, sy + 8); sl.addColorStop(0, 'rgba(79,240,255,0)'); sl.addColorStop(0.5, 'rgba(79,240,255,0.1)'); sl.addColorStop(1, 'rgba(79,240,255,0)'); ctx.fillStyle = sl; ctx.fillRect(0, sy, w, 8); }
  if (B.style === 'medieval') { const f = 0.7 + 0.3 * Math.sin(t * 14); box(ctx, w - 40, 40, 6, 30, '#6a4a2a'); box(ctx, w - 44, 38, 14, 5, '#3a3036'); const tg2 = ctx.createLinearGradient(0, 38 - 18 * f, 0, 38); tg2.addColorStop(0, '#fff2a0'); tg2.addColorStop(0.5, '#ffb030'); tg2.addColorStop(1, '#ff6a2a'); ctx.fillStyle = tg2; ctx.beginPath(); ctx.moveTo(w - 43, 38); ctx.quadraticCurveTo(w - 44, 30, w - 37 + Math.sin(t * 11) * 1.5, 38 - 18 * f); ctx.quadraticCurveTo(w - 30, 30, w - 31, 38); ctx.fill(); glowC(ctx, w - 37, 30, 30, '#ffb030', 0.6 * f); }
  if (B.style === 'cartoon') { const bb = Math.abs(Math.sin(t * 4)) * 50; shadowE(ctx, w - 40, fy, 11 - bb * 0.1, 2.5, 0.3); const bg2 = ctx.createRadialGradient(w - 44, fy - 16 - bb, 2, w - 40, fy - 12 - bb, 12); bg2.addColorStop(0, '#ffe0f0'); bg2.addColorStop(0.4, '#ff7ab0'); bg2.addColorStop(1, '#a03a6a'); ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(w - 40, fy - 12 - bb, 12, 0, Math.PI * 2); ctx.fill(); }
  }
  // NPCs
  if (!o.noNpc && look !== 'bare') (NPC[cat] || ['child']).forEach((sp, i) => {
    const img = spriteCanvas(HEROES[sp] ? HEROES[sp].sprite : sp, 3.4); const sp2 = 18 + i * 9, span = w - 80;
    const ph = ((t * sp2 / span + i * 0.37 + (o.seed || 0)) % 2), dir = ph < 1 ? 1 : -1, xx = 40 + (ph < 1 ? ph : 2 - ph) * span, bob = Math.abs(Math.sin(t * 8 + i)) * 3;
    shadowE(ctx, xx, fy - 0.5, 9 - bob * 0.6, 2.2, 0.45);
    ctx.save(); ctx.translate(xx, fy - bob); if (dir < 0) ctx.scale(-1, 1); ctx.drawImage(img, -img.width / 2, -img.height); ctx.restore();
  });
  // frame
  ctx.fillStyle = PP.ink || '#07060f'; ctx.fillRect(0, 0, w, 6); ctx.fillRect(0, h - 4, w, 4); ctx.fillRect(0, 0, 6, h); ctx.fillRect(w - 6, 0, 6, h);
  ctx.fillStyle = 'rgba(255,240,215,0.07)'; ctx.fillRect(6, 6, w - 12, 1); ctx.fillRect(6, 6, 1, h - 10);
  // quality frame: every building has one; rare ones glow inward only (never into the neighbours) — 3 条硬色带，明暗分 4 档步进
  const qc = QUALITY[B.q].c, qa = PJ.reduced ? 0.9 : [0.75, 0.9, 1, 0.9][Math.floor(t * 1.4 + (o.seed || 0) * 9) % 4];
  if (B.q >= 2) { const gw = B.q >= 3 ? 34 : 24; [[0, 0, w, gw, 0, 0, 0, gw], [0, h - gw, w, gw, 0, h, 0, h - gw], [0, 0, gw, h, 0, 0, gw, 0], [w - gw, 0, gw, h, w, 0, w - gw, 0]].forEach(([a, b, c, d, x0, y0, x1, y1]) => { let g; if (M.UI) g = M.UI.lg(ctx, x0, y0, x1, y1, [[0, qc], [1, 'rgba(0,0,0,0)']], 3); else { g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, qc); g.addColorStop(1, 'rgba(0,0,0,0)'); } al(0.32 * qa); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(a, b, c, d); ctx.globalCompositeOperation = 'source-over'; }); al(1);
    if (B.q >= 3) for (let i = 0; i < 6; i++) { const q = (t * 0.35 + i / 6) % 1, per = 2 * (w + h), d0 = q * per, px = d0 < w ? d0 : d0 < w + h ? w - 7 : d0 < 2 * w + h ? w - (d0 - w - h) : 7, py = d0 < w ? 7 : d0 < w + h ? d0 - w : d0 < 2 * w + h ? h - 7 : h - (d0 - 2 * w - h); spark4(ctx, px, py, 6, '#ffffff'); glowC(ctx, px, py, 14, qc, 0.8); } }
  ctx.strokeStyle = B.q ? qc : shade(qc, -0.35); al(B.q ? qa : 0.85); ctx.lineWidth = 6; ctx.strokeRect(3, 3, w - 6, h - 6); al(1);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(3, 3, w - 6, 1.5); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(3, h - 4.5, w - 6, 1.5);
  ctx.restore();
}
M._roomKit = { box, rivets, shadowE, glowC, spark4, gear, rpath, shade };
const thumbs = {};
M.roomThumb = function (key) { if (!thumbs[key]) { const a = document.createElement('canvas'); a.width = 150; a.height = 105; const ax = a.getContext('2d'); ax.imageSmoothingEnabled = false; drawRoom(ax, 0, 0, 150, 105, key, 1.3, { noNpc: false, seed: 0.2 }); const c = document.createElement('canvas'); c.width = 450; c.height = 315; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(a, 0, 0, 450, 315); thumbs[key] = c.toDataURL(); } return thumbs[key]; };

// ───────── base view / camera ─────────
M.BaseView = class {
  constructor() { this.t = 0; this.x = 1050; this.y = 470; this.z = 0.72; this.tx = this.x; this.ty = this.y; this.tz = this.z; this.sel = null; this.hover = null; this.pulse = {}; this.free = null; this.amb = new M.Ambient('motes', 1920, 1080, 50); this.stars = [...Array(90)].map((_, i) => ({ x: rnd(i) * 2400 - 150, y: -700 + rnd(i + 40) * 560, s: rnd(i + 9) < 0.2 ? 6 : 3, p: rnd(i + 3) * 7 })); }
  keepFree() { if (!this.sel && !this.free) this.free = { x: this.tx, y: this.ty, z: this.tz }; }
  focus(c, r) { this.keepFree(); const p = M.cellCenter(c, r); this.sel = { c, r }; this.tx = p.x + 190; this.ty = p.y; this.tz = 1.7; }
  focusDoor() { this.keepFree(); this.sel = { door: 1 }; this.tx = DOOR_X + 200; this.ty = -140; this.tz = 1.25; }
  home() { const f = this.free; this.sel = null; this.free = null; if (f) { this.tx = f.x; this.ty = f.y; this.tz = f.z; } else { this.tx = 1050; this.ty = 470; this.tz = 0.72; } }
  raidCam() { this.sel = null; this.free = null; this.tx = 1050; this.ty = -30; this.tz = 1.0; }
  // keep the view over the base; a camera already outside the box is never yanked back
  lim(x, y, z) {
    const hw = 960 / z, hh = 540 / z, X0 = -450, X1 = BCOLS * CW + 450, Y0 = -820, Y1 = TOP + BROWS * CH + 260;
    const f = (v, a, b, cur) => a > b ? (a + b) / 2 : clamp(v, Math.min(a, cur), Math.max(b, cur));
    return { x: f(x, X0 + hw, X1 - hw, this.x), y: f(y, Y0 + hh, Y1 - hh, this.y) };
  }
  pan(x, y) { const p = this.lim(x, y, this.z); this.x = this.tx = p.x; this.y = this.ty = p.y; }
  zoomAt(sx, sy, z, now) {
    z = clamp(z, 0.55, 2.6); const wx = (sx - 960) / this.tz + this.tx, wy = (sy - 540) / this.tz + this.ty, p = this.lim(wx - (sx - 960) / z, wy - (sy - 540) / z, z);
    this.tz = z; this.tx = p.x; this.ty = p.y; if (now) { this.z = z; this.x = p.x; this.y = p.y; }
  }
  update(dt) { this.t += dt; const k = 1 - Math.exp(-dt * 5); this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.z += (this.tz - this.z) * k; this.amb.update(dt); }
  toWorld(sx, sy) { return { x: (sx - 960) / this.z + this.x, y: (sy - 540) / this.z + this.y }; }
  toScreen(x, y) { return { x: (x - this.x) * this.z + 960, y: (y - this.y) * this.z + 540 }; }
  pick(sx, sy) {
    const p = this.toWorld(sx, sy);
    if (Math.abs(p.x - DOOR_X) < 110 && p.y > -260 && p.y < 10) return { door: 1 };
    const c = Math.floor(p.x / CW), r = Math.floor((p.y - TOP) / CH);
    if (c >= 0 && c < BCOLS && r >= 0 && r < BROWS) return { c, r };
    return null;
  }
};
M.drawBase = function (ctx, meta, bv, opts = {}) {
  const t = bv.t; ctx.imageSmoothingEnabled = false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, 1080); sky.addColorStop(0, '#0a0c1e'); sky.addColorStop(1, '#0a0608'); ctx.fillStyle = sky; ctx.fillRect(0, 0, 1920, 1080);
  ctx.setTransform(bv.z, 0, 0, bv.z, 960 - bv.x * bv.z, 540 - bv.y * bv.z);
  // sky & surface
  const sg = ctx.createLinearGradient(0, -900, 0, 0); sg.addColorStop(0, '#070918'); sg.addColorStop(0.7, '#1a1430'); sg.addColorStop(1, '#3a2030'); ctx.fillStyle = sg; ctx.fillRect(-800, -1000, 3700, 1000);
  bv.stars.forEach(s => { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + s.p)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.s, s.s); }); ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff4d0'; ctx.beginPath(); ctx.arc(1750, -560, 70, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1a1430'; ctx.beginPath(); ctx.arc(1725, -575, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#120e1c'; ctx.beginPath(); ctx.moveTo(-800, 0); for (let x = -800; x <= 2900; x += 100) ctx.lineTo(x, -120 - 90 * Math.abs(Math.sin(x * 0.004)) - 40 * Math.sin(x * 0.013)); ctx.lineTo(2900, 0); ctx.fill();
  ctx.fillStyle = '#0d0a12'; for (let i = 0; i < 16; i++) { const x = -600 + i * 230 + (i % 3) * 40; if (Math.abs(x - DOOR_X) < 260) continue; const hh = 60 + (i % 4) * 30; ctx.fillRect(x, -hh, 24, hh); ctx.beginPath(); ctx.moveTo(x - 50, -hh + 30); ctx.lineTo(x + 12, -hh - 70); ctx.lineTo(x + 74, -hh + 30); ctx.fill(); }
  ctx.fillStyle = '#2a2018'; ctx.fillRect(-800, -12, 3700, 30); ctx.fillStyle = '#3a4a2a'; ctx.fillRect(-800, -16, 3700, 8);
  // soil band + bedrock surround
  ctx.fillStyle = '#15100d'; ctx.fillRect(-800, 18, 3700, 2000);
  for (let i = 0; i < 260; i++) { ctx.fillStyle = i % 2 ? '#1c1511' : '#100c0a'; ctx.fillRect(-800 + rnd(i) * 3700, 18 + rnd(i + 5) * 1400, 18 + rnd(i + 2) * 30, 10); }
  // shaft from door to core
  const cc = M.cellCenter(CORE.c, CORE.r);
  ctx.fillStyle = '#0b090e'; ctx.fillRect(DOOR_X - 40, -10, 80, TOP + 10); ctx.fillStyle = '#caa84a'; ctx.fillRect(DOOR_X - 40, -10, 4, TOP + 10); ctx.fillRect(DOOR_X + 36, -10, 4, TOP + 10);
  const lights = [];
  // cells
  for (let r = 0; r < BROWS; r++) for (let c = 0; c < BCOLS; c++) {
    const x = M.cell(meta, c, r), X = cellX(c), Y = cellY(r);
    if (x.b) { drawRoomPx(ctx, X, Y, x.b, t, { seed: c * 0.31 + r * 0.17, fireT: opts.fire && opts.fire[c + ',' + r] }, c + ',' + r, bv.z); if (x.tile && M.drawTerrainFloor) M.drawTerrainFloor(ctx, x.tile, X, Y, t); const B = BUILDINGS[x.b]; lights.push({ x: X + CW / 2, y: Y + CH / 2, r: (M.LIGHT_R(meta, x) + 0.6) * CW, c: PAL[B.style][2], f: 0.95 + 0.05 * Math.sin(t * 3 + c), cell: 1 }); if (x.tile && TILES[x.tile]) lights.push({ x: X + 60, y: Y + CH - 40, r: 150, c: TILES[x.tile].c, f: 0.7 + 0.3 * Math.sin(t * 2 + c + r) }); }
    else if (x.dug) {
      ctx.drawImage(emptyRoom(), X, Y); if (x.tile && M.drawTerrainFloor) M.drawTerrainFloor(ctx, x.tile, X, Y, t);
      if (x.job && x.job.kind === 'build') {
        const B = BUILDINGS[x.job.key], P = PAL[B.style], q = 1 - x.job.days / x.job.total;
        ctx.globalAlpha = 0.35; drawRoomPx(ctx, X, Y, x.job.key, t, { noNpc: true }, c + ',' + r, bv.z); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 6; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(X + 20 + k * 80, Y + CH - 30); ctx.lineTo(X + 20 + k * 80, Y + 20); ctx.stroke(); } for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(X + 20, Y + 50 + k * 50); ctx.lineTo(X + CW - 20, Y + 50 + k * 50); ctx.stroke(); }
        if (Math.floor(t * 5 + c) % 3 === 0) for (let k = 0; k < 5; k++) { ctx.fillStyle = '#ffd060'; ctx.fillRect(X + 150 + Math.cos(t * 20 + k) * 30, Y + 100 + Math.sin(t * 20 + k) * 20, 5, 5); }
        const img = spriteCanvas('old', 3), bx = X + 60 + ((t * 30) % 180); ctx.drawImage(img, bx, Y + CH - 30 - img.height - Math.abs(Math.sin(t * 8)) * 3);
        lights.push({ x: X + CW / 2, y: Y + CH / 2, r: 1.6 * CW, c: '#ffd060', f: 0.9, cell: 1 });
        if (M.UI) M.UI.bar(ctx, X + 33, Y + 19, CW - 66, 8, q, { col: P[2] }); else { ctx.fillStyle = '#0b090e'; ctx.fillRect(X + 30, Y + 16, CW - 60, 14); ctx.fillStyle = P[2]; ctx.fillRect(X + 32, Y + 18, (CW - 64) * q, 10); }
      } else lights.push({ x: X + CW / 2, y: Y + CH / 2, r: 1.6 * CW, c: '#e8d8b8', f: 0.95, cell: 1 });
    } else {
      // special terrain is its own ground (mc-terrain-art.js); an unidentified deep vein is rock with a strange light
      const hidV = !!(x.tile && M.tileHidden && M.tileHidden(meta, c, r));
      if (x.tile && TILES[x.tile] && !hidV && M.drawTerrainCell) M.drawTerrainCell(ctx, x.tile, X, Y, t, lights);
      else { ctx.drawImage(rock((c * 5 + r * 3) % 3), X, Y); if (hidV && M.drawHiddenVein) M.drawHiddenVein(ctx, X, Y, t, c * 7 + r * 13, lights); }
      if (x.job && x.job.kind === 'dig') {
        const q = 1 - x.job.days / x.job.total; ctx.fillStyle = '#0b090e'; ctx.fillRect(X + 20, Y + 20, CW * 0.4, CH - 40);
        ctx.save(); ctx.translate(X + 20 + CW * 0.4, Y + CH / 2); ctx.fillStyle = '#b0b8c4'; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(40 + Math.sin(t * 40) * 3, 0); ctx.lineTo(0, 24); ctx.fill(); ctx.restore();
        for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#ffd060' : '#6a5a40'; ctx.fillRect(X + 20 + CW * 0.4 + 30 + Math.cos(t * 30 + k) * 30, Y + CH / 2 + Math.sin(t * 25 + k * 2) * 30, 6, 6); }
        lights.push({ x: X + CW * 0.5, y: Y + CH / 2, r: 180, c: '#ffd060', f: 0.8 + 0.2 * Math.sin(t * 30) });
      } else if (M.canDig(meta, c, r)) { // 能挖：金色方块虚线，每档走 6 格、明暗 4 档步进
        const st = PJ.reduced ? 0 : Math.floor(t * 8) % 4; ctx.save(); ctx.strokeStyle = 'rgba(255,207,74,' + (PJ.reduced ? 0.45 : [0.3, 0.45, 0.6, 0.45][Math.floor(t * 3) % 4]) + ')'; ctx.lineWidth = 4; ctx.lineCap = 'butt'; ctx.setLineDash([12, 12]); ctx.lineDashOffset = -st * 6; ctx.strokeRect(X + 10, Y + 10, CW - 20, CH - 20); ctx.restore(); }
    }
  }
  // grid seams
  ctx.fillStyle = PP.ink || '#060508'; for (let c = 0; c <= BCOLS; c++) ctx.fillRect(cellX(c) - 3, TOP, 6, BROWS * CH); for (let r = 0; r <= BROWS; r++) ctx.fillRect(0, cellY(r) - 3, BCOLS * CW, 6);
  // weapon reach overlay
  if (opts.showReach) { for (let r = 0; r < BROWS; r++) for (let c = 0; c < BCOLS; c++) { const rc = M.weaponReach(meta, c, r); if (!rc) continue; const hl = opts.showReach === true || (opts.showReach.c === c && opts.showReach.r === r); if (!hl) continue; ctx.fillStyle = 'rgba(232,67,79,0.12)'; ctx.fillRect(rc.c0 * CW, -300, (rc.c1 - rc.c0 + 1) * CW, 300); ctx.strokeStyle = PP.red || '#e8434f'; ctx.lineWidth = 3; ctx.strokeRect(rc.c0 * CW, -300, (rc.c1 - rc.c0 + 1) * CW, 300); } }
  // selection / hover（设计稿 1b）：选中 = 外金 6px + 内墨 6px 硬框；悬停 = 3px 奶黄框；厚度按屏幕像素算，不随缩放变粗
  const hs = (s, sel) => { if (!s || s.door) return; const u = 1 / bv.z, X = cellX(s.c) + 3, Y = cellY(s.r) + 3, W = CW - 6, H = CH - 6;
    if (sel) { frameIn(ctx, X, Y, W, H, 6 * u, PP.gold); frameIn(ctx, X + 6 * u, Y + 6 * u, W - 12 * u, H - 12 * u, 6 * u, PP.ink); } else frameIn(ctx, X, Y, W, H, 3 * u, PP.butter); };
  hs(bv.hover, false); hs(bv.sel, true);
  // portal door：硬边斜面石柱 + 门楣（墨框、上左暮紫亮边、下右深渊暗边），金色门楣条，钢铆钉
  const pH = meta.portal.hp / M.portalMax(meta), U = M.UI, stone = { fill: PP.night, hi: PP.dusk, lo: PP.abyss, shadow: 0, rivets: false };
  if (U) {
    U.plate(ctx, DOOR_X - 100, -250, 30, 240, stone); U.plate(ctx, DOOR_X + 70, -250, 30, 240, stone); ctx.fillStyle = PP.abyss; for (let k = 1; k < 8; k++) { ctx.fillRect(DOOR_X - 97, -250 + k * 30, 24, 3); ctx.fillRect(DOOR_X + 73, -250 + k * 30, 24, 3); }
    U.plate(ctx, DOOR_X - 120, -280, 240, 40, stone); U.R(ctx, DOOR_X - 120, -280, 240, 8, PP.gold); U.R(ctx, DOOR_X - 120, -280, 240, 3, PP.butter); U.R(ctx, DOOR_X - 120, -275, 240, 3, PP.amber);
    [DOOR_X - 108, DOOR_X - 60, DOOR_X, DOOR_X + 60, DOOR_X + 108].forEach(rx => U.rivet(ctx, rx - 5, -263));
  } else {
    box(ctx, DOOR_X - 100, -250, 30, 240, '#34303c'); box(ctx, DOOR_X + 70, -250, 30, 240, '#34303c');
    box(ctx, DOOR_X - 120, -280, 240, 40, '#34303c', 3); box(ctx, DOOR_X - 120, -280, 240, 8, '#caa84a', 2); rivets(ctx, [[DOOR_X - 108, -258], [DOOR_X - 60, -258], [DOOR_X, -258], [DOOR_X + 60, -258], [DOOR_X + 108, -258]], '#8a8090');
  }
  // closed: a dark arch; clicked open (mc-portal.js): the swirl spins up and the world steles rise
  const po = bv.po || 0; ctx.fillStyle = U ? U.lg(ctx, 0, -240, 0, -10, [[0, PP.abyss], [1, PP.ink]], 3) : '#0a0910'; ctx.fillRect(DOOR_X - 70, -240, 140, 230);
  ctx.fillStyle = PP.tealDeep || '#1f8f8a'; ctx.fillRect(DOOR_X - 70, -240, 140, 3); ctx.fillRect(DOOR_X - 70, -240, 3, 230); ctx.fillRect(DOOR_X + 67, -240, 3, 230);
  if (po > 0.01) {
    // 漩涡：冰 → 青 → 深青 → 夜色，5 圈硬色带
    ctx.save(); ctx.globalAlpha = po; ctx.fillStyle = U ? U.rg(ctx, DOOR_X, -130, 10, 110, [[0, PP.ice], [0.4, PP.teal], [0.75, PP.tealDeep], [1, PP.night]], 5) : '#1f8f8a'; ctx.fillRect(DOOR_X - 70, -240, 140, 230);
    ctx.beginPath(); ctx.rect(DOOR_X - 70, -240, 140, 230); ctx.clip(); ctx.translate(DOOR_X, -125); ctx.scale(0.4 + 0.6 * po, 0.4 + 0.6 * po); for (let k = 0; k < 3; k++) { ctx.rotate(t * (0.6 + k * 0.3)); ctx.strokeStyle = 'rgba(191,247,240,0.35)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 40 + k * 30, 0, Math.PI * 1.3); ctx.stroke(); } ctx.restore();
  }
  lights.push({ x: DOOR_X, y: -130, r: 140 + 240 * po, c: '#5fd0c0', f: (0.5 + 0.35 * po) + 0.15 * Math.sin(t * 2) });
  if (M.drawSteles) M.drawSteles(ctx, meta, bv, lights, 'body');
  if (bv.hover && bv.hover.door) frameIn(ctx, DOOR_X - 128, -288, 256, 284, 3 / bv.z, PP.butter);
  // raid entities
  if (opts.raid) opts.raid.draw(ctx, lights);
  // lighting
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const lm = M._blm || (M._blm = (() => { const c = document.createElement('canvas'); c.width = 480; c.height = 270; return c; })()), lx = lm.getContext('2d');
  lx.globalCompositeOperation = 'source-over'; lx.fillStyle = 'rgba(3,2,8,0.9)'; lx.fillRect(0, 0, 480, 270);
  const sur = bv.toScreen(0, 0).y; lx.fillStyle = 'rgba(0,0,0,1)'; lx.globalCompositeOperation = 'destination-out'; lx.globalAlpha = 0.85; lx.fillRect(0, 0, 480, Math.max(0, sur / 4)); lx.globalAlpha = 1;
  lights.forEach(L => { const p = bv.toScreen(L.x, L.y), r = L.r * bv.z * L.f / 4; const g = lx.createRadialGradient(p.x / 4, p.y / 4, 0, p.x / 4, p.y / 4, r); if (L.cell) { g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.62, 'rgba(0,0,0,0.92)'); g.addColorStop(1, 'rgba(0,0,0,0)'); } else { g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); } lx.fillStyle = g; lx.fillRect(p.x / 4 - r, p.y / 4 - r, r * 2, r * 2); });
  ctx.imageSmoothingEnabled = true; ctx.drawImage(lm, 0, 0, 1920, 1080);
  lights.forEach(L => { const p = bv.toScreen(L.x, L.y); M.glow(ctx, p.x, p.y, (L.cell ? CW * 0.9 : L.r * 0.5) * bv.z, L.c, 0.14); });
  bv.amb.draw(ctx, bv.x, bv.y);
  const fy = bv.sel && !bv.sel.door ? bv.toScreen(0, M.cellCenter(bv.sel.c, bv.sel.r).y).y / 1080 : 0.5;
  M.hd2d(ctx, 1920, 1080, { focus: clamp(fy, 0.2, 0.8), band: bv.z > 1.2 ? 0.14 : 0.3, dofBlur: bv.z > 1.2 ? 3 : 1.6, bloom: 0.5, grade: ['#ffb070', '#102040'], gradeA: 0.25, vig: 0.6 });
  // crisp tag badges on top (no names: style top-left, function bottom-right; hover explains each)
  const icons = bv.icons = [], S = Math.round(clamp(40 * bv.z * 1.25, 30, 72)), pad = Math.round(S * 0.22);
  // 标签徽章：深渊底 + 3px 墨框（悬停金框、两档步进放大）+ 3px 标签色内圈
  const badge = (ic, x0, y0, col, tip, hot) => {
    const pu = hot && !PJ.reduced ? 1.04 + 0.04 * Math.sin(t * 4 * Math.PI) : 1, s = Math.round(S * pu), xx = Math.round(x0 - (s - S) / 2), yy = Math.round(y0 - (s - S) / 2);
    ctx.fillStyle = hot ? PP.gold : PP.ink; ctx.fillRect(xx - 3, yy - 3, s + 6, s + 6); ctx.fillStyle = PP.abyss; ctx.fillRect(xx, yy, s, s);
    ctx.fillStyle = U ? U.pal(col) : col; ctx.fillRect(xx, yy, s, 3); ctx.fillRect(xx, yy + s - 3, s, 3); ctx.fillRect(xx, yy, 3, s); ctx.fillRect(xx + s - 3, yy, 3, s);
    const im = M.iconCanvas(ic, 2); if (im) ctx.drawImage(im, xx + s * 0.12, yy + s * 0.12, s * 0.76, s * 0.76);
    icons.push({ x: xx, y: yy, w: s, h: s, tip });
  };
  for (let r = 0; r < BROWS; r++) for (let c = 0; c < BCOLS; c++) {
    const x = M.cell(meta, c, r), a = bv.toScreen(cellX(c), cellY(r)), b = bv.toScreen(cellX(c) + CW, cellY(r) + CH);
    if (b.x < -80 || a.x > 2000 || b.y < -80 || a.y > 1160) continue;
    const hot = bv.hoverIc && bv.hoverIc.c === c && bv.hoverIc.r === r ? bv.hoverIc.k : null;
    if (x.b) { const B = BUILDINGS[x.b], st = M.TAG.style(B.style), ct = M.TAG.cat(B.cat);
      badge(st.icon, a.x + pad, a.y + pad, st.c, { tag: st, key: x.b, c, r }, hot === 's'); badge(ct.icon, b.x - pad - S, b.y - pad - S, ct.c, { tag: ct, key: x.b, c, r }, hot === 'f'); }
    else if (x.job) { const cx = (a.x + b.x) / 2; badge(x.job.kind === 'dig' ? 'u_pick' : 'u_hammer', cx - S - 4, b.y - pad - S, PP.gold, { job: 1, c, r }, hot === 'j');
      // 剩余天数：墨框深渊小窗 + 金色机台数码
      ctx.fillStyle = PP.ink; ctx.fillRect(cx + 1, b.y - pad - S - 3, S * 1.3 + 4, S + 6); ctx.fillStyle = PP.abyss; ctx.fillRect(cx + 4, b.y - pad - S, S * 1.3 - 2, S); M.pxNum(ctx, String(x.job.days), cx + 3 + S * 0.65, b.y - pad - S / 2, PP.gold, S / 26); }
  }
  // 传送门耐久：分格硬边条（低于 35% 变红）
  const dp = bv.toScreen(DOOR_X, -300);
  const bw = 200 * bv.z; if (U) U.bar(ctx, dp.x - bw / 2, dp.y + 15, bw, 10, pH, { col: pH < 0.35 ? PP.red : PP.teal, seg: 36 }); else { ctx.fillStyle = '#000'; ctx.fillRect(dp.x - bw / 2 - 3, dp.y + 12, bw + 6, 16); ctx.fillStyle = pH < 0.35 ? '#d0453c' : '#5fd0c0'; ctx.fillRect(dp.x - bw / 2, dp.y + 15, bw * clamp(pH, 0, 1), 10); }
  if (M.drawSteles) M.drawSteles(ctx, meta, bv, null, 'top');
  if (opts.raid) opts.raid.drawHud(ctx, bv);
};

// ───────── base defense ─────────
M.Raid = class {
  constructor(meta) {
    this.meta = meta; this.t = 0; this.ents = []; this.fx = []; this.proj = []; this.over = null; this.overT = 0; this.fire = {}; this.shake = 0; this.kills = 0;
    const d = meta.day; this.w = 1 + d * 0.22 + meta.raids * 0.3;
    this.portal = { x: DOOR_X, hp: meta.portal.hp, max: M.portalMax(meta) };
    meta.heroes.forEach((h, i) => { const H = HEROES[h.cls]; this.ents.push({ side: 'A', hero: h, sprite: H.sprite, s: 5, x: DOOR_X + (i % 2 ? 1 : -1) * (70 + Math.floor(i / 2) * 60), y: -20 - (i % 3) * 16, hp: h.hp, max: M.heroMaxHp(h, meta), atk: M.heroAtk(h, meta), cd: H.cd, range: H.ranged ? 360 : 60, spd: H.spd, ranged: H.ranged, t: 0, alive: h.hp > 0, face: 1 }); });
    const army = M.baseMods(meta).defArmy || 0; for (let i = 0; i < army; i++) this.ents.push({ side: 'A', sprite: 'militia', s: 5, tint: null, x: DOOR_X + (i % 2 ? 1 : -1) * (180 + i * 30), y: -24, hp: 160 * (1 + d * 0.1), max: 160 * (1 + d * 0.1), atk: 14 * (1 + d * 0.08), cd: 0.9, range: 55, spd: 90, t: 0, alive: true, face: 1 });
    this.turrets = [];
    for (let r = 0; r < BROWS; r++) for (let c = 0; c < BCOLS; c++) { const w = M.weaponStats(meta, c, r), rc = M.weaponReach(meta, c, r); if (w && rc) this.turrets.push({ c, r, w, x0: rc.c0 * CW, x1: (rc.c1 + 1) * CW, px: cellX(c) + CW / 2, py: cellY(r) + 20, t: Math.random() }); }
    const n = 10 + Math.round(d * 1.4); this.list = [];
    for (let i = 0; i < n; i++) { const type = i % 7 === 6 ? 'elite' : wpick(['crawl', 'face', 'spit', 'brute'], x => x === 'brute' ? (d > 6 ? 1.5 : 0.3) : x === 'spit' ? 1.5 : 3); this.list.push({ t: 2 + i * (1.1 - Math.min(0.5, d * 0.02)) + Math.random() * 0.5, type, side: Math.random() < 0.5 ? -1 : 1 }); }
    if (d >= 10) this.list.push({ t: this.list[this.list.length - 1].t + 2, type: d >= 20 ? 'redtv' : 'tv', side: 1 });
    this.spawnI = 0; this.total = this.list.length;
  }
  spawn(s) { const E = ENEMIES[s.type], hs = 0.8 * Math.pow(1.13, this.w - 1), as = 0.6 * Math.pow(1.08, this.w - 1); this.ents.push({ side: 'E', kind: s.type, sprite: (M.DB && M.DB[RAID_HD[s.type]]) ? RAID_HD[s.type] : E.sprite, s: E.boss ? 7 : 5, x: s.side < 0 ? -350 : BCOLS * CW + 350, y: -18 - Math.random() * 30, hp: E.hp * hs, max: E.hp * hs, atk: E.atk * as, cd: E.cd, range: E.ranged ? 300 : E.range, spd: E.spd * 0.8, ranged: E.ranged, t: 0, alive: true, face: -s.side, boss: E.boss, elite: E.elite, slow: 0 }); }
  float(x, y, text, col, size) { this.fx.push({ k: 'float', x, y, text, col, size: size || 30, t0: this.t, life: 1 }); }
  burst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 100 + Math.random() * 260; this.fx.push({ k: 'pt', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 150, col: i % 3 ? col : '#fff', t0: this.t, life: 0.6 }); } }
  damage(e, d, col) { if (!e.alive) return; e.hp -= d; e.flash = this.t; this.float(e.x, e.y - 90, fmt(d), col || '#fff', 26); if (e.hp <= 0) { e.alive = false; if (e.side === 'E') { this.kills++; this.burst(e.x, e.y - 30, '#6a1f2b', 12); M.Sfx.kill(); } else { this.float(e.x, e.y - 120, e.hero ? e.hero.name + ' 倒下了' : '倒下了', '#d0453c', 34); M.Sfx.die(); } } }
  step(dt) {
    if (this.over) { this.overT += dt; return; }
    this.t += dt; const T = this.t;
    while (this.spawnI < this.list.length && this.list[this.spawnI].t <= T) this.spawn(this.list[this.spawnI++]);
    const foes = this.ents.filter(e => e.alive && e.side === 'E'), allies = this.ents.filter(e => e.alive && e.side === 'A');
    for (const e of this.ents) {
      if (!e.alive) continue;
      if (e.slow > 0) e.slow -= dt;
      const list = e.side === 'E' ? allies : foes;
      let tg = null, bd = e.side === 'E' ? 260 : 900;
      list.forEach(o => { const d = Math.abs(o.x - e.x); if (d < bd) { bd = d; tg = o; } });
      let tx = tg ? tg.x : (e.side === 'E' ? this.portal.x : e.home || e.x); if (e.side === 'A' && !tg) { e.home = e.home || e.x; tx = e.home; }
      const d = Math.abs(tx - e.x), reach = tg ? e.range : (e.side === 'E' ? 90 : 4);
      if (d > reach) { const sp = e.spd * (e.slow > 0 ? 0.5 : 1) * dt; e.x += Math.sign(tx - e.x) * Math.min(sp, d - reach + 1); e.face = Math.sign(tx - e.x) || e.face; e.walk = (e.walk || 0) + sp; }
      else if (tg || e.side === 'E') { e.t -= dt; e.face = Math.sign(tx - e.x) || e.face; if (e.t <= 0) { e.t = e.cd; e.lunge = T;
        if (e.ranged) this.proj.push({ x: e.x, y: e.y - 40, tg: tg || null, tx: tx, dmg: e.atk, col: e.side === 'E' ? '#b0d040' : '#ffe08a', src: e });
        else if (tg) { this.damage(tg, e.atk, e.side === 'E' ? '#ff6a6a' : '#fff'); this.fx.push({ k: 'slash', x: tg.x, y: tg.y - 40, t0: T, life: 0.14 }); M.Sfx.hit(); }
        else { this.portal.hp -= e.atk; this.portal.hit = T; this.shake = Math.max(this.shake, 6); this.float(this.portal.x + (Math.random() - 0.5) * 80, -260, '-' + fmt(e.atk), '#ff6a6a', 30); M.Sfx.hit(); }
      } }
    }
    for (let i = this.proj.length - 1; i >= 0; i--) { const p = this.proj[i]; const tx = p.tg ? p.tg.x : p.tx, ty = p.tg ? p.tg.y - 40 : -130; const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), v = 900 * dt; if (d <= v + 6 || (p.tg && !p.tg.alive)) { this.proj.splice(i, 1); if (p.tg && p.tg.alive) this.damage(p.tg, p.dmg, p.src.side === 'E' ? '#ff6a6a' : '#fff'); else if (!p.tg) { this.portal.hp -= p.dmg; this.portal.hit = T; } } else { p.x += dx / d * v; p.y += dy / d * v; } }
    // turrets
    this.turrets.forEach(tu => {
      tu.t -= dt; if (tu.t > 0) return;
      const inR = this.ents.filter(e => e.alive && e.side === 'E' && e.x >= tu.x0 && e.x <= tu.x1).sort((a, b) => Math.abs(a.x - this.portal.x) - Math.abs(b.x - this.portal.x));
      if (!inR.length) return; tu.t = tu.w.cd; const tg = inR[0], k = tu.w.kind; this.fire[tu.c + ',' + tu.r] = M.__bvT || 0;
      this.fx.push({ k: 'beam', x1: tu.px, y1: tu.py, x2: tg.x, y2: tg.y - 40, col: k === 'arcane' ? '#d8a0ff' : k === 'chain' || k === 'zeus' ? '#8ff6ff' : k === 'colossus' ? '#8fe0ff' : '#ffe08a', w: k === 'colossus' ? 30 : k === 'shell' ? 16 : 8, t0: T, life: 0.25 });
      this.fx.push({ k: 'muzzle', x: tu.px, y: 10, t0: T, life: 0.3 });
      if (k === 'shell' || k === 'colossus') { this.fx.push({ k: 'boom', x: tg.x, y: tg.y - 20, r: tu.w.splash, t0: T, life: 0.45 }); this.ents.forEach(o => { if (o.alive && o.side === 'E' && Math.abs(o.x - tg.x) < tu.w.splash) this.damage(o, tu.w.dmg * (o === tg ? 1 : 0.6), '#ffcc33'); }); this.shake = Math.max(this.shake, k === 'colossus' ? 16 : 8); M.Sfx.boom(); }
      else if (k === 'chain' || k === 'zeus') { let cur = tg, hit = new Set(); for (let i = 0; i < (tu.w.chain || 3) && cur; i++) { hit.add(cur); this.damage(cur, tu.w.dmg * Math.pow(0.8, i), '#8ff6ff'); const nx = this.ents.filter(o => o.alive && o.side === 'E' && !hit.has(o) && Math.abs(o.x - cur.x) < 260).sort((a, b) => Math.abs(a.x - cur.x) - Math.abs(b.x - cur.x))[0]; if (nx) this.fx.push({ k: 'chain', x1: cur.x, y1: cur.y - 40, x2: nx.x, y2: nx.y - 40, t0: T, life: 0.25 }); cur = nx; } if (k === 'zeus') { this.fx.push({ k: 'sky', x: tg.x, t0: T, life: 0.35 }); this.shake = Math.max(this.shake, 10); } M.Sfx.bolt(k === 'zeus' ? 2 : 0); }
      else { this.damage(tg, tu.w.dmg, '#ffe08a'); if (k === 'arcane') tg.slow = 2; M.Sfx.shoot(); }
      // abilities granted by the vein under the room
      if (tu.w.xChain && k !== 'chain' && k !== 'zeus') { let cur = tg; const hit = new Set([tg]); for (let i = 0; i < tu.w.xChain; i++) { const nx = this.ents.filter(o => o.alive && o.side === 'E' && !hit.has(o) && Math.abs(o.x - cur.x) < 260).sort((a, b) => Math.abs(a.x - cur.x) - Math.abs(b.x - cur.x))[0]; if (!nx) break; hit.add(nx); this.fx.push({ k: 'chain', x1: cur.x, y1: cur.y - 40, x2: nx.x, y2: nx.y - 40, t0: T, life: 0.25 }); this.damage(nx, tu.w.dmg * 0.5 * Math.pow(0.8, i), '#8ff6ff'); cur = nx; } M.Sfx.bolt(0); }
      if (tu.w.xSplash && k !== 'shell' && k !== 'colossus') { this.fx.push({ k: 'boom', x: tg.x, y: tg.y - 20, r: tu.w.xSplash, t0: T, life: 0.4 }); this.ents.forEach(o => { if (o !== tg && o.alive && o.side === 'E' && Math.abs(o.x - tg.x) < tu.w.xSplash) this.damage(o, tu.w.dmg * 0.5, '#ffcc33'); }); }
      if (tu.w.xSlow) this.ents.forEach(o => { if (o.alive && o.side === 'E' && Math.abs(o.x - tg.x) < (tu.w.xSplash || tu.w.splash || 60)) o.slow = Math.max(o.slow || 0, 2); });
    });
    this.shake = Math.max(0, this.shake - dt * 50);
    this.fx = this.fx.filter(f => T - f.t0 < f.life);
    if (this.portal.hp <= 0) { this.portal.hp = 0; this.over = 'lose'; this.overT = 0; }
    else if (this.spawnI >= this.list.length && !this.ents.some(e => e.alive && e.side === 'E')) { this.over = 'win'; this.overT = 0; }
  }
  draw(ctx, lights) {
    const T = this.t;
    if (this.portal.hit && T - this.portal.hit < 0.15) { ctx.fillStyle = 'rgba(232,67,79,0.4)'; ctx.fillRect(DOOR_X - 70, -240, 140, 230); }
    this.ents.filter(e => e.alive || e.hero).sort((a, b) => a.y - b.y).forEach(e => {
      // 16-bit sprites walk / swing / fall with their own frames; old sprites keep the bob
      const ps = M.P16 && M.P16.spec(e.sprite) ? M.P16.raidState(e, T) : null;
      const img = ps ? M.P16.img(e.sprite, ps[0], ps[1], e.flash && T - e.flash < 0.08 ? '#ffffff' : !e.alive ? '#3a2c48' : null, e.s * 13 * 0.8) : spriteCanvas(e.sprite, e.s, e.flash && T - e.flash < 0.08 ? '#ffffff' : !e.alive ? '#3a3440' : null);
      let x = e.x; if (e.lunge != null && T - e.lunge < 0.15) x += e.face * 14 * Math.sin((T - e.lunge) / 0.15 * Math.PI);
      const bob = ps ? 0 : e.alive ? Math.abs(Math.sin((e.walk || 0) / 30)) * 5 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(e.x, e.y - 1, img.S ? img.S * 0.42 : img.width * 0.35, 5, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(x, e.y - bob); if (ps) { if ((e.face || 1) < 0) ctx.scale(-1, 1); ctx.drawImage(img, -img.cx, -img.footY); } else { if (!e.alive) ctx.rotate(-Math.PI / 2 * (e.face || 1)); const need = (SPF(e.sprite) === 'R') !== (e.face > 0); if (need) ctx.scale(-1, 1); ctx.drawImage(img, -img.width / 2, -img.height); } ctx.restore();
      // 血条：墨框硬边小条（领袖金、民兵绿、敌人红）
      if (e.alive) { const bw = Math.max(40, img.S ? img.S * 0.9 : img.width * 0.7), top = e.y - (img.S ? img.S * 1.25 : img.height) - 14, hc = e.side === 'A' ? (e.hero ? PP.gold : PP.green) : PP.red; if (M.UI) M.UI.bar(ctx, x - bw / 2, top, bw, 6, e.hp / e.max, { col: hc }); else { ctx.fillStyle = '#000'; ctx.fillRect(x - bw / 2 - 2, top - 2, bw + 4, 10); ctx.fillStyle = hc; ctx.fillRect(x - bw / 2, top, bw * clamp(e.hp / e.max, 0, 1), 6); } }
      if (e.hero && e.alive) lights.push({ x: e.x, y: e.y - 40, r: 160, c: '#ffe6b0', f: 1 });
    });
    this.proj.forEach(p => { ctx.fillStyle = p.col; ctx.fillRect(p.x - 7, p.y - 7, 14, 14); lights.push({ x: p.x, y: p.y, r: 60, c: p.col.length === 7 ? p.col : '#ffffff', f: 1 }); });
    this.fx.forEach(f => {
      const d = T - f.t0, p = d / f.life;
      if (f.k === 'pt') { ctx.globalAlpha = 1 - p; ctx.fillStyle = f.col; ctx.fillRect(f.x + f.vx * d, f.y + f.vy * d + 400 * d * d, 10, 10); ctx.globalAlpha = 1; }
      else if (f.k === 'float') { // 飘字：像素数码 + 八向墨描边，分 6 档往上跳，最后两档变淡
        const up = PJ.reduced ? 0 : Math.floor(eo(p) * 6) / 6 * 60; ctx.globalAlpha = p < 0.7 ? 1 : p < 0.85 ? 0.6 : 0.3;
        if (M.UI) M.UI.text(ctx, f.text, Math.round(f.x), Math.round(f.y - up), f.size, f.col, { num: true, outline: true }); else { ctx.font = `${f.size}px ${NUMF}`; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(f.text, f.x + 3, f.y - up + 3); ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, f.y - up); }
        ctx.globalAlpha = 1; }
      else if (f.k === 'slash') { ctx.globalAlpha = 1 - p; ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(-0.6); ctx.fillRect(-40, -4, 80, 8); ctx.restore(); ctx.globalAlpha = 1; }
      else if (f.k === 'beam') { ctx.globalAlpha = 1 - p; ctx.strokeStyle = f.col; ctx.lineWidth = f.w * (1 - p) + 2; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x1, 10); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1; lights.push({ x: f.x2, y: f.y2, r: 200, c: f.col, f: 1 - p }); }
      else if (f.k === 'muzzle') { ctx.globalAlpha = 1 - p; ctx.fillStyle = '#fff2a0'; ctx.beginPath(); ctx.arc(f.x, f.y, 30 * (1 - p) + 10, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; lights.push({ x: f.x, y: f.y, r: 180, c: '#ffe08a', f: 1 - p }); }
      else if (f.k === 'boom') { ctx.globalAlpha = (1 - p) * 0.5; ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * eo(p), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffd060'; ctx.lineWidth = 10 * (1 - p) + 2; ctx.stroke(); ctx.globalAlpha = 1; lights.push({ x: f.x, y: f.y, r: 320, c: '#ffa040', f: 1 - p }); }
      else if (f.k === 'chain') { ctx.globalAlpha = 1 - p; M.bolt(ctx, f.x1, f.y1, f.x2, f.y2, '#8ff6ff', 6, Math.floor(T * 40)); ctx.globalAlpha = 1; }
      else if (f.k === 'sky') { ctx.globalAlpha = 1 - p; M.bolt(ctx, f.x + 40, -700, f.x, -30, '#e0f0ff', 14, Math.floor(T * 30)); ctx.globalAlpha = 1; lights.push({ x: f.x, y: -200, r: 500, c: '#e0f0ff', f: 1 - p }); }
    });
  }
  drawHud(ctx, bv) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const left = this.total - this.spawnI + this.ents.filter(e => e.alive && e.side === 'E').length, U = M.UI;
    const stat = '剩余敌人 ' + left + '　·　传送门 ' + Math.max(0, Math.round(this.portal.hp)) + '/' + this.portal.max + '　·　武器房间 ' + this.turrets.length;
    if (!U) { ctx.fillStyle = 'rgba(8,6,10,0.85)'; ctx.fillRect(560, 110, 800, 110); ctx.strokeStyle = '#d0453c'; ctx.lineWidth = 4; ctx.strokeRect(562, 112, 796, 106); ctx.textAlign = 'center'; ctx.font = `46px ${CNF}`; ctx.fillStyle = '#ff6a5a'; ctx.fillText('混沌来袭 · 守住传送门', 960, 162); ctx.font = `28px ${CNF}`; ctx.fillStyle = '#e8dcc4'; ctx.fillText(stat, 960, 202); return; }
    // 混沌来袭面板：机箱面板 + 红色内圈，两侧红色警灯 1 秒一闪；标题红字墨描边，下面一行战况
    U.plate(ctx, 560, 110, 800, 110, { ring: PP.red });
    const glow = PJ.reduced ? 1 : 0.5 + 0.5 * Math.cos(this.t * 2 * Math.PI);
    [606, 1296].forEach(lx => { U.box(ctx, lx, 139, 18, 18, PP.wine); ctx.save(); ctx.globalAlpha *= glow; U.box(ctx, lx, 139, 18, 18, PP.red); U.R(ctx, lx, 139, 6, 6, PP.pink); U.R(ctx, lx + 12, 151, 6, 6, PP.wine); ctx.restore(); });
    U.text(ctx, '混沌来袭 · 守住传送门', 960, 148, U.T.title, PP.red, { outline: true });
    U.text(ctx, stat, 960, 194, U.T.body, PP.cream);
  }
};
const SPF = (k) => (M.SP[k] && M.SP[k].face) || 'R';
const RAID_HD = { crawl: 'VerdantWormSoldier', face: 'ChaosSoldier', spit: 'EvilEyeRed', brute: 'Brute', elite: 'Witch', tv: 'Robo', redtv: 'EvilEyeKingNixon' };
})();

;
