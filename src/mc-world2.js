// ==== mc-world2.js ====
(function () {
const M = window.MC;
const { SP, C, spriteCanvas, pick, wpick, NODE } = M;
const CNF = "'Noto Serif SC', serif";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const COLW = 520, ROWH = 270, Y0 = 700, STUB = 130;

M.genMap2 = function (run, meta) {
  const R = run.region, L = run.len, cols = L.cols, tut = R.tut;
  const nodes = [], byCol = [];
  const bossCols = [];
  if (!tut) { for (let i = 1; i < L.boss; i++) bossCols.push(Math.round(cols * i / L.boss) - 1); }
  for (let c = 0; c < cols; c++) {
    let rows;
    if (c === 0 || c === cols - 1 || bossCols.includes(c)) rows = [0];
    else if (tut) rows = c === 3 ? [-1, 1] : [0];
    else rows = wpick([[0], [-1, 1], [-1, 0], [0, 1], [-1, 0, 1]], x => x.length === 1 ? 2 : x.length === 2 ? 3 : 3);
    if (c === cols - 2 && !tut && rows.length > 2) rows = [-1, 1];
    byCol[c] = rows.map(r => { const n = { id: nodes.length, col: c, row: r, x: 300 + c * COLW, y: Y0 + r * ROWH, type: 'normal', done: false, seen: false, out: [] }; nodes.push(n); return n; });
  }
  const edges = [];
  const dirOf = (a, b) => b.row < a.row ? 'up' : b.row > a.row ? 'down' : 'right';
  const link = (a, b) => { const d = dirOf(a, b); if (a.out.some(e => edges[e].dir === d)) return false; const pts = d === 'right' ? [[a.x, a.y], [b.x, b.y]] : [[a.x, a.y], [a.x + STUB, a.y], [a.x + STUB, b.y], [b.x, b.y]]; let len = 0; for (let i = 1; i < pts.length; i++) len += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]); edges.push({ a: a.id, b: b.id, dir: d, pts, len }); a.out.push(edges.length - 1); return true; };
  for (let c = 0; c < cols - 1; c++) {
    const A = byCol[c], B = byCol[c + 1];
    B.forEach(b => { const cand = A.slice().sort((x, y) => Math.abs(x.row - b.row) - Math.abs(y.row - b.row)); for (const a of cand) if (link(a, b)) break; });
    A.forEach(a => { if (!a.out.length) { const cand = B.slice().sort((x, y) => Math.abs(x.row - a.row) - Math.abs(y.row - a.row)); for (const b of cand) if (link(a, b)) break; } });
    if (!tut && Math.random() < 0.45) { const a = pick(A), b = pick(B); link(a, b); }
  }
  // types
  nodes.forEach(n => {
    if (n.col === 0) { n.type = 'start'; n.done = true; return; }
    if (n.col === cols - 1) { n.type = 'boss'; n.final = true; return; }
    if (bossCols.includes(n.col)) { n.type = 'boss'; return; }
    if (tut) { n.type = ['start', 'normal', 'event', 'normal', 'shop', 'normal', 'elite', 'camp', 'shop', 'boss'][n.col] || 'normal'; if (n.col === 3) n.type = n.row < 0 ? 'normal' : 'chest'; if (n.col === 2) n.ev = 'musician'; return; }
    if (n.col === 1) { n.type = 'normal'; return; }
    if (bossCols.includes(n.col + 1)) { n.type = byCol[n.col].indexOf(n) === 0 ? 'camp' : 'shop'; return; }
    n.type = wpick(['normal', 'hold', 'shop', 'camp', 'chest', 'event', 'recruit'], t => ({ normal: 26, hold: 9, shop: 8, camp: 5, chest: 9, event: 16, recruit: 6 })[t]);
  });
  if (!tut) {
    const mids = nodes.filter(n => n.col >= 2 && n.col <= cols - 2 && n.type !== 'boss');
    const nEl = L.elite[0] + Math.floor(Math.random() * (L.elite[1] - L.elite[0] + 1));
    mids.filter(n => n.col >= 3).sort(() => Math.random() - 0.5).slice(0, nEl).forEach(n => n.type = 'elite');
    const exCols = [];
    for (let i = 0; i < L.ex; i++) {
      const cand = mids.filter(n => !exCols.includes(n.col) && n.type !== 'extract' && n.type !== 'elite' && byCol[n.col].length > 1 && n.col >= 3);
      const pool = cand.length ? cand : mids.filter(n => n.type !== 'extract' && !exCols.includes(n.col));
      if (!pool.length) break; const n = pick(pool); n.type = 'extract'; exCols.push(n.col);
    }
    if (!nodes.some(n => n.type === 'shop' && n.col < cols / 2)) { const c = nodes.filter(n => n.col === 2 || n.col === 3); if (c.length) c[0].type = 'shop'; }
  }
  nodes.forEach(n => { if (n.type === 'event' && !n.ev) n.ev = pick(Object.keys(M.EVENTS)); });
  const tower = !!M.baseMods(meta).tower;
  nodes.forEach(n => n.seen = tower || tut);
  nodes[0].seen = true; nodes[0].out.forEach(e => nodes[edges[e].b].seen = true);
  // decorations away from roads
  const deco = [], W = 300 + cols * COLW + 300, top = Y0 - ROWH * 2.3, bot = Y0 + ROWH * 2.3;
  const near = (x, y) => edges.some(e => { for (let i = 1; i < e.pts.length; i++) { const [x1, y1] = e.pts[i - 1], [x2, y2] = e.pts[i]; if (x >= Math.min(x1, x2) - 90 && x <= Math.max(x1, x2) + 90 && y >= Math.min(y1, y2) - 90 && y <= Math.max(y1, y2) + 90) return true; } return false; });
  for (let i = 0; i < cols * 18; i++) {
    const x = Math.random() * W, y = top + Math.random() * (bot - top);
    if (near(x, y) || nodes.some(n => Math.hypot(n.x - x, n.y - y) < 190)) continue;
    const k = pick(R.deco); deco.push({ x, y, k, s: k === 'house' || k === 'tent' ? 7 : k === 'pine' ? 8 : k === 'lamp' ? 6 : 5, flip: Math.random() < 0.5, ph: Math.random() * 7 });
  }
  deco.sort((a, b) => a.y - b.y);
  const grain = []; for (let i = 0; i < cols * 70; i++) grain.push({ x: Math.random() * W, y: top - 300 + Math.random() * (bot - top + 600), c: Math.random() < 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.03)', s: 6 + Math.floor(Math.random() * 3) * 6 });
  const fg = []; for (let i = 0; i < cols * 3; i++) fg.push({ x: Math.random() * W * 1.3, k: pick(R.deco), s: 16 + Math.floor(Math.random() * 6) });
  return { nodes, edges, deco, grain, fg, W, top, bot, cols };
};
M.nodeAhead = (map, id) => map.nodes[id].out.map(e => map.edges[e]);

M.Walker2 = class {
  constructor(map) { this.map = map; this.node = 0; this.edge = null; this.s = 0; this.v = 0; const n = map.nodes[0]; this.x = n.x; this.y = n.y; this.face = 1; this.walkT = 0; this.dust = []; this.camX = n.x + 200; this.camY = n.y; this.t = 0; this.idle = 0; }
  pickEdge(keys) {
    const outs = M.nodeAhead(this.map, this.node); if (!outs.length) return null;
    const want = keys.up ? 'up' : keys.down ? 'down' : keys.right ? 'right' : null; if (!want) return null;
    let e = outs.find(o => o.dir === want); if (!e && outs.length === 1 && (want === 'right')) e = outs[0];
    return e || null;
  }
  at(e, s) { let rem = s; for (let i = 1; i < e.pts.length; i++) { const [x1, y1] = e.pts[i - 1], [x2, y2] = e.pts[i]; const l = Math.abs(x2 - x1) + Math.abs(y2 - y1); if (rem <= l || i === e.pts.length - 1) { const q = l ? clamp(rem / l, 0, 1) : 1; return { x: x1 + (x2 - x1) * q, y: y1 + (y2 - y1) * q, dx: Math.sign(x2 - x1), dy: Math.sign(y2 - y1) }; } rem -= l; } return { x: e.pts[0][0], y: e.pts[0][1], dx: 1, dy: 0 }; }
  update(dt, keys, onArrive) {
    this.t += dt;
    if (!this.edge) { this.idle += dt; const e = this.pickEdge(keys); if (e) { this.edge = e; this.s = 0; this.v = 80; this.idle = 0; M.Sfx.whoosh(0.2); } else { this.follow(dt); return; } }
    const e = this.edge, VMAX = 620, A = 1700, rem = e.len - this.s, target = this.map.nodes[e.b];
    const stop = this.v * this.v / (2 * 2200);
    if (rem < stop + 6 && !target.done) this.v = Math.max(90, Math.sqrt(Math.max(0, 2 * 2200 * rem))); else this.v = Math.min(VMAX, this.v + A * dt);
    const prev = this.at(e, this.s);
    this.s += this.v * dt;
    if (Math.random() < 0.5) this.dust.push({ x: this.x - prev.dx * 20, y: this.y + 4, t0: this.t, vx: -prev.dx * 60 + (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 40 });
    if (this.s >= e.len) { this.node = e.b; this.edge = null; this.s = 0; this.x = target.x; this.y = target.y; this.v = 0; this.land = this.t; onArrive(target); }
    else { const p = this.at(e, this.s); this.x = p.x; this.y = p.y; if (p.dx) this.face = p.dx; this.walkT += this.v * dt; }
    this.follow(dt);
  }
  follow(dt) {
    const tx = this.x + 260 + (this.edge ? this.v * 0.25 : 0), ty = this.y;
    const k = 1 - Math.exp(-dt * 3.5);
    this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k;
    this.dust = this.dust.filter(d => this.t - d.t0 < 0.5);
  }
};

function nodeSprite(n) {
  if (n.type === 'event') return M.EVENTS[n.ev].sprite;
  if (['normal', 'hold'].includes(n.type)) return n.done ? 'cross' : n.type === 'hold' ? 'ChaosSoldier' : 'EvilEyeRed';
  if (n.type === 'elite') return n.done ? 'cross' : 'Centaur';
  if (n.type === 'boss') return n.done ? 'cross' : n.final ? 'EvilEyeKingNixon' : 'Kraken';
  return { start: 'flag', shop: 'stall', camp: 'fire', chest: 'chest', recruit: 'banner', extract: 'door' }[n.type];
}
M.nodeIcon = (n) => n.seen ? (n.type === 'boss' && !n.final ? 'elite' : NODE[n.type].icon) : 'question';
M.nodeLabel = (n) => n.seen ? (n.type === 'event' ? M.EVENTS[n.ev].n : n.type === 'boss' && !n.final ? '守关首领' : NODE[n.type].n) : '？？？';
M.nodeDesc = (n) => n.seen ? (n.type === 'event' ? M.EVENTS[n.ev].text : n.type === 'boss' && !n.final ? '击败它才能继续前进' : n.type === 'boss' ? '击败它就能通关这个世界' : NODE[n.type].d) : '走近才能看清';
const lightC = {};
function lightMap() { if (!lightC.c) { lightC.c = document.createElement('canvas'); lightC.c.width = 480; lightC.c.height = 270; } return lightC.c; }
const fgCache = {};
function blurred(key, s) { const k = key + s; if (!fgCache[k]) { const img = spriteCanvas(key, s), c = document.createElement('canvas'); c.width = img.width + 60; c.height = img.height + 60; const x = c.getContext('2d'); x.filter = 'blur(10px) brightness(0.25)'; x.drawImage(img, 30, 30); fgCache[k] = c; } return fgCache[k]; }

M.drawWorld2 = function (ctx, run, walker, opts = {}) {
  const map = run.map, R = run.region, T = walker.t, z = opts.zoom || 1;
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, 1080); sky.addColorStop(0, R.bg); sky.addColorStop(1, R.tile); ctx.fillStyle = sky; ctx.fillRect(0, 0, 1920, 1080);
  const toS = (x, y) => ({ x: 960 + (x - walker.camX) * z, y: 560 + (y - walker.camY) * z });
  ctx.setTransform(z, 0, 0, z, 960 - walker.camX * z, 560 - walker.camY * z);
  const vx0 = walker.camX - 1100 / z, vx1 = walker.camX + 1100 / z, vy0 = walker.camY - 700 / z, vy1 = walker.camY + 700 / z;
  ctx.fillStyle = R.tile; ctx.fillRect(vx0, map.top - 400, vx1 - vx0, map.bot - map.top + 800);
  for (let gx = Math.floor(vx0 / 120) * 120; gx < vx1; gx += 120) for (let gy = Math.floor(vy0 / 120) * 120; gy < vy1; gy += 120) { if (((gx / 120) + (gy / 120)) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.018)'; ctx.fillRect(gx, gy, 120, 120); } }
  map.grain.forEach(g => { if (g.x > vx0 && g.x < vx1 && g.y > vy0 && g.y < vy1) { ctx.fillStyle = g.c; ctx.fillRect(Math.floor(g.x / 6) * 6, Math.floor(g.y / 6) * 6, g.s, g.s); } });
  // roads
  const vis = (e) => map.nodes[e.a].seen || map.nodes[e.b].seen;
  const path = (e) => { ctx.beginPath(); ctx.moveTo(e.pts[0][0], e.pts[0][1]); for (let i = 1; i < e.pts.length; i++) ctx.lineTo(e.pts[i][0], e.pts[i][1]); };
  ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
  const taken = new Set(); if (walker.edge) taken.add(walker.edge);
  [[118, 'rgba(0,0,0,0.4)', 8], [96, R.road, 0], [96, 'rgba(255,255,255,0.04)', -4]].forEach(([w, c, oy]) => { ctx.strokeStyle = c; ctx.lineWidth = w; map.edges.forEach(e => { if (!vis(e)) return; ctx.save(); ctx.translate(0, oy); path(e); ctx.stroke(); ctx.restore(); }); });
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  map.edges.forEach(e => { if (!vis(e)) return; for (let i = 1; i < e.pts.length; i++) { const [x1, y1] = e.pts[i - 1], [x2, y2] = e.pts[i], l = Math.abs(x2 - x1) + Math.abs(y2 - y1); for (let s = 24; s < l; s += 48) { const q = s / l, x = x1 + (x2 - x1) * q, y = y1 + (y2 - y1) * q; ctx.fillRect(Math.floor(x / 6) * 6 - 18, Math.floor(y / 6) * 6 - 18, 36, 6); } } });
  // closed paths (behind you / not chosen) get dimmed
  const cur = walker.edge ? walker.edge.b : walker.node, curCol = map.nodes[cur].col;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  map.nodes.forEach(n => { if (n.col <= curCol && n.id !== cur && !(walker.edge && n.id === walker.edge.a)) { ctx.beginPath(); ctx.ellipse(n.x, n.y, 90, 50, 0, 0, Math.PI * 2); ctx.fill(); } });
  const lights = [];
  const items = [];
  map.deco.forEach(d => { if (d.x > vx0 - 150 && d.x < vx1 + 150 && d.y > vy0 - 150 && d.y < vy1 + 250) items.push({ y: d.y, draw: () => {
    const img = spriteCanvas(d.k, d.s); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(d.x + 20, d.y, img.width * 0.5, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(d.x, d.y); if (d.flip) ctx.scale(-1, 1); if (d.k === 'pine' || d.k === 'tree') ctx.transform(1, 0, Math.sin(T * 1.2 + d.ph) * 0.03, 1, 0, 0); ctx.drawImage(img, -img.width / 2, -img.height); ctx.restore();
    if (d.k === 'lamp') lights.push({ x: d.x, y: d.y - img.height + 8, r: 260, c: R.light, f: 0.85 + 0.15 * Math.sin(T * 9 + d.ph) });
    if (d.k !== 'lamp' && !(d.k === 'crystalS' || d.k === 'console' || d.k === 'shroom' || d.k === 'spike')) lights.push({ x: d.x, y: d.y - img.height * 0.6, r: 90, c: R.light, f: 0.55 }); if (d.k === 'crystalS' || d.k === 'console' || d.k === 'shroom' || d.k === 'spike') lights.push({ x: d.x, y: d.y - img.height / 2, r: 140, c: d.k === 'shroom' ? '#ff80b0' : d.k === 'spike' ? '#ff6a2a' : '#7fe0ff', f: 0.7 + 0.3 * Math.sin(T * 2 + d.ph) });
  } }); });
  map.nodes.forEach(n => {
    if (n.x < vx0 - 200 || n.x > vx1 + 200) return;
    items.push({ y: n.y - 10, draw: () => {
      const closed = n.col <= curCol && n.id !== cur;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(n.x, n.y + 4, 74, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = closed ? '#15121a' : '#2a2430'; ctx.fillRect(n.x - 60, n.y - 16, 120, 32); ctx.fillStyle = closed ? '#1c1822' : '#3a3242'; ctx.fillRect(n.x - 60, n.y - 16, 120, 8);
      if (!n.seen) { const img = spriteCanvas('question', 8); ctx.globalAlpha = 0.5 + 0.2 * Math.sin(T * 3 + n.id); ctx.drawImage(img, n.x - img.width / 2, n.y - 40 - img.height); ctx.globalAlpha = 1; return; }
      const key = nodeSprite(n), big = ['stall', 'house', 'tent'].includes(key) ? 7 : key === 'tv' ? 8 : 8;
      const img = spriteCanvas(key, big, closed && n.type !== 'shop' ? '#2a2632' : null);
      const bob = n.done || closed ? 0 : Math.round(Math.sin(T * 2.4 + n.id) * 5);
      ctx.drawImage(img, n.x - img.width / 2, n.y - 16 - img.height + bob);
      if (!closed && !n.done) {
        const col = n.type === 'extract' ? '#5fd0c0' : n.type === 'camp' ? '#ffb03a' : n.type === 'chest' ? '#ffcc33' : n.type === 'boss' || n.type === 'elite' ? '#ff4a4a' : n.type === 'shop' ? '#ffd970' : n.type === 'event' ? '#c890ff' : n.type === 'hold' ? '#5fd0c0' : n.type === 'recruit' ? '#6fa8dc' : '#ff9a6a';
        if (col) lights.push({ x: n.x, y: n.y - 50, r: n.type === 'boss' ? 300 : 220, c: col, f: 0.8 + 0.2 * Math.sin(T * 4 + n.id) });
      }
    } });
  });
  items.push({ y: walker.y + 1, draw: () => {
    walker.dust.forEach(d => { const a = (walker.t - d.t0) / 0.5; ctx.globalAlpha = 0.5 * (1 - a); ctx.fillStyle = '#9d94a6'; ctx.fillRect(d.x + d.vx * a * 0.5, d.y + d.vy * a * 0.5, 10, 10); });
    ctx.globalAlpha = 1;
    const hk = M.HEROES[run.hero.cls].sprite, moving = !!walker.edge, p16 = M.P16 && M.P16.spec(hk);
    const img = p16 ? M.P16.img(hk, moving ? 'walk' : 'idle', moving ? Math.floor((walker.walkT || 0) / 22) : Math.floor(T * 2.5), null, 72) : spriteCanvas(hk, 6);
    const bob = p16 ? 0 : moving ? Math.abs(Math.sin(walker.walkT / 38)) * 12 : Math.sin(T * 2) * 2;
    const land = walker.land != null && T - walker.land < 0.25 ? Math.sin((T - walker.land) / 0.25 * Math.PI) : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(walker.x, walker.y, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(walker.x, walker.y - bob); ctx.scale(1 + land * 0.15, 1 - land * 0.15); if (walker.face < 0) ctx.scale(-1, 1); if (p16) ctx.drawImage(img, -img.cx, -img.footY); else ctx.drawImage(img, -img.width / 2, -img.height); ctx.restore();
    lights.push({ x: walker.x, y: walker.y - 50, r: 420, c: '#ffe6b0', f: 1 });
  } });
  items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
  // lighting pass (quarter-res light map)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const lm = lightMap(), lx = lm.getContext('2d');
  lx.globalCompositeOperation = 'source-over'; lx.fillStyle = 'rgba(4,2,10,0.46)'; lx.fillRect(0, 0, 480, 270);
  lx.globalCompositeOperation = 'destination-out';
  lights.forEach(L => { const p = toS(L.x, L.y), r = L.r * z * L.f / 4; const g = lx.createRadialGradient(p.x / 4, p.y / 4, 0, p.x / 4, p.y / 4, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); lx.fillStyle = g; lx.fillRect(p.x / 4 - r, p.y / 4 - r, r * 2, r * 2); });
  ctx.imageSmoothingEnabled = true; ctx.drawImage(lm, 0, 0, 1920, 1080);
  lights.forEach(L => { const p = toS(L.x, L.y); M.glow(ctx, p.x, p.y, L.r * z * 0.55 * L.f, L.c, 0.22); });
  M.godRays(ctx, 1920, 1080, T, R.light, 4, 0.05);
  if (!run.amb) run.amb = new M.Ambient(R.amb || 'motes', 1920, 1080, 70);
  run.amb.update(opts.dt || 0.016); run.amb.draw(ctx, walker.camX, walker.camY);
  M.hd2d(ctx, 1920, 1080, { focus: 0.52, band: 0.2, bloom: 0.5, grade: R.grade, gradeA: 0.3, vig: 0.55 });
  // foreground silhouettes (heavy blur, fast parallax)
  map.fg.forEach(f => { const sx = ((f.x - walker.camX * 1.5) % (map.W * 1.3) + map.W * 1.3) % (map.W * 1.3) - 200; if (sx < -500 || sx > 2200) return; const img = blurred(f.k, f.s); ctx.drawImage(img, sx, 1080 - img.height * 0.55); });
  // labels (crisp, after post)
  ctx.textAlign = 'center';
  const ahead = map.nodes[cur].out.map(e => map.edges[e].b).concat(walker.edge ? [] : []);
  (walker.edge ? [walker.edge.b] : ahead).forEach(id => { const n = map.nodes[id]; const p = toS(n.x, n.y); const lab = M.nodeLabel(n); ctx.font = `32px ${CNF}`; const w = ctx.measureText(lab).width + 34; ctx.fillStyle = 'rgba(11,9,14,0.88)'; ctx.fillRect(p.x - w / 2, p.y + 34, w, 48); ctx.fillStyle = n.seen ? (n.type === 'extract' ? C.teal : n.type === 'boss' || n.type === 'elite' ? C.blood : C.bone) : C.dim; ctx.fillRect(p.x - w / 2, p.y + 34, 5, 48); ctx.fillText(lab, p.x, p.y + 68); });
  if (!walker.edge && !opts.noHints) {
    const outs = M.nodeAhead(map, walker.node), n = map.nodes[walker.node], pulse = 1 + 0.08 * Math.sin(T * 6);
    outs.forEach(e => {
      const k = e.dir === 'up' ? '↑' : e.dir === 'down' ? '↓' : '→';
      const hx = e.dir === 'right' ? n.x + 270 : n.x + STUB, hy = e.dir === 'right' ? n.y - 4 : n.y + (e.dir === 'up' ? -150 : 150);
      const p = toS(hx, hy), hot = walker.hot === e.dir;
      // hovered: ring the stop it leads to, and lift the arrow
      if (hot) { const tn = map.nodes[e.b], tq = toS(tn.x, tn.y); ctx.strokeStyle = 'rgba(255,240,180,' + (0.55 + 0.3 * Math.sin(T * 8)) + ')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(tq.x, tq.y - 30, 78, 0, 7); ctx.stroke(); }
      const sc = pulse * (hot ? 1.25 : 1); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(sc, sc);
      if (hot) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-40, -40, 80, 76); }
      ctx.fillStyle = '#0b090e'; ctx.fillRect(-34, -30, 68, 68); ctx.fillStyle = hot ? '#ffe08a' : '#f2c14e'; ctx.fillRect(-34, -34, 68, 64); ctx.fillStyle = '#0e0c12'; ctx.font = `44px ${CNF}`; ctx.textBaseline = 'middle'; ctx.fillText(k, 0, -2); ctx.restore(); ctx.textBaseline = 'alphabetic';
    });
  }
  if (opts.fade) { ctx.globalAlpha = opts.fade; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080); ctx.globalAlpha = 1; }
  if (!opts.noMini) M.drawMinimap2(ctx, run, walker);
};
M.worldPick = function (run, walker, sx, sy) {
  const map = run.map; let best = null, bd = 90;
  map.nodes.forEach(n => { const x = 960 + (n.x - walker.camX), y = 560 + (n.y - 60 - walker.camY); const d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; best = n; } });
  return best;
};
M.drawMinimap2 = function (ctx, run, walker) {
  const map = run.map, X = 1330, Y = 30, Wd = 560, Ht = 250;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(11,9,14,0.9)'; ctx.fillRect(X, Y, Wd, Ht); ctx.strokeStyle = '#3a3040'; ctx.lineWidth = 4; ctx.strokeRect(X + 2, Y + 2, Wd - 4, Ht - 4);
  const sx = (Wd - 70) / (map.W - 500), sy = (Ht - 90) / (ROWH * 2.4);
  const px = (x) => X + 35 + (x - 300) * sx, py = (y) => Y + 60 + (y - (Y0 - ROWH * 1.2)) * sy;
  const cur = walker.edge ? walker.edge.b : walker.node, curCol = map.nodes[cur].col;
  ctx.lineWidth = 3;
  map.edges.forEach(e => { ctx.strokeStyle = map.nodes[e.a].col < curCol ? '#231c2a' : '#4a4052'; ctx.beginPath(); e.pts.forEach((p, i) => i ? ctx.lineTo(px(p[0]), py(p[1])) : ctx.moveTo(px(p[0]), py(p[1]))); ctx.stroke(); });
  map.nodes.forEach(n => {
    const ic = M.nodeIcon(n), img = spriteCanvas(ic, ic === 'tv' || ic === 'elite' ? 1 : 2), cx = px(n.x), cy = py(n.y);
    ctx.fillStyle = n.col < curCol ? '#15121a' : '#2a2232'; ctx.fillRect(cx - 12, cy - 12, 24, 24);
    ctx.globalAlpha = n.col < curCol && n.id !== cur ? 0.3 : 1; ctx.drawImage(img, cx - img.width / 2, cy - img.height / 2); ctx.globalAlpha = 1;
    if (n.type === 'extract' && n.seen) { ctx.strokeStyle = C.teal; ctx.lineWidth = 2; ctx.strokeRect(cx - 13, cy - 13, 26, 26); }
    if (n.type === 'boss' && n.seen) { ctx.strokeStyle = C.blood; ctx.lineWidth = 2; ctx.strokeRect(cx - 13, cy - 13, 26, 26); }
  });
  const hx = px(walker.x), hy = py(walker.y);
  ctx.fillStyle = Math.floor(walker.t * 3) % 2 ? C.candle : '#fff'; ctx.fillRect(hx - 6, hy - 24, 12, 12);
  ctx.font = `24px ${CNF}`; ctx.textAlign = 'left'; ctx.fillStyle = C.dim; ctx.fillText(run.region.n + ' · ' + run.len.n + ' · 第 ' + (curCol + 1) + '/' + map.cols + ' 站', X + 16, Y + 34);
};
})();

;
