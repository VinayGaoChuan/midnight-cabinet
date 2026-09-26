// ==== mc-portal.js ====
(function () {
// The portal (user ruling 2026-09-24). There is no world page. Closed, the portal is a dark stone arch; clicking it opens
// it (the swirl spins up) and one stele per world open today rises above it. A stele carries two things only: the danger
// (低 / 中 / 高, measured against the strongest leader who can go) and the world's specialty icons. Hovering a stele
// explains it; clicking it picks that world and the loadout panel follows.
const M = window.MC, G = M.Game.prototype;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (p) => 1 - Math.pow(1 - p, 3), eb = (p) => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const DX = () => M.BASE_GEO.DOOR_X;
const SW = 170, SH = 224, GAP = 250, TOPY = -612;   // stele size and where the row floats (base-world pixels)
const PJ = M.PJ || {}, P = PJ.PAL || {};   // 调色板（界面件只用这 32 色）

// ───────── danger: the strongest leader who can go vs. a plain leader of the level this world expects ─────────
M.bestLeader = (m) => m.heroes.filter(h => h.hp > 0).reduce((b, h) => (!b || M.heroPower(h, m) > M.heroPower(b, m) ? h : b), null);
M.parPower = function (m, k, cls) {
  const W = M.WORLDS[k], lv = cl(Math.round(1 + (W.diff - 1) * 1.8 + Math.min(0.8, (m.day - 1) * 0.03) * 2), 1, 10);
  return M.heroPower({ cls: cls || 'watchman', rarity: 0, lv, tree: [], taken: [], relics: [] }, m);
};
M.worldDanger = function (m, k) {
  const b = M.bestLeader(m), mine = b ? M.heroPower(b, m) : 0, par = M.parPower(m, k, b && b.cls), r = mine / Math.max(1, par);
  const lv = r >= 1.1 ? 0 : r >= 0.85 ? 1 : 2;
  return { lv, n: ['低', '中', '高'][lv], c: [P.teal, P.gold, P.red][lv], mine, par };
};

// ───────── specialty: what a world gives more of ─────────
const LOOT = {
  sup: (v) => ({ ic: 'sack', t: '物资 ×' + v }), exp: (v) => ({ ic: 'orb', t: '经验 ×' + v }), wallet: (v) => ({ ic: 'coin', t: '积分 ×' + v }),
  item: () => ({ ic: 'bell', t: '战后常掉支援道具' }), tile: () => ({ ic: 'gem', t: '会掉地脉结晶' }), rbp: () => ({ ic: 'g_scroll', t: '常掉宝物图纸' }),
  heal: (v) => ({ ic: 't_heal', t: '每场战斗后领袖回复 ' + Math.round(v * 100) + '% 生命' }), bpq: () => ({ ic: 'u_star', t: '图纸品质更高' }), shards: () => ({ ic: 'shard', t: '每场战斗得灵魂碎片' }),
};
M.worldLoot = function (k) {
  const th = M.WTHEME && M.WTHEME[k]; if (!th) return [];
  const out = Object.keys(th.loot || {}).filter(x => LOOT[x]).map(x => LOOT[x](th.loot[x]));
  const st = M.TAG && M.TAG.style(th.style); if (st) out.push({ ic: st.icon, t: '建筑图纸偏向「' + st.n + '」', c: st.c });
  return out;
};
const icCanvas = (k) => (M.IC && M.IC[k] && !(M.SP && M.SP[k])) ? M.iconCanvas(k, 2) : M.spriteCanvas(k, 4);
const icURL = (k) => (M.IC && M.IC[k] && !(M.SP && M.SP[k])) ? M.iconURL(k, 2) : M.spriteURL(k, 4);

// ───────── state ─────────
// It lives on the base view, which the drawing code gets directly: portalOpen · pickW (the chosen world while the
// loadout panel is up) · drop (the chosen stele falling in) · shards · theme (the portal's look for the chosen world)
const CAM = (bv) => { bv.sel = { door: 1 }; bv.tx = DX() + 120; bv.ty = -370; bv.tz = 1.2; };
const themeOut = (bv) => { if (bv.theme && bv.theme.out == null) bv.theme.out = bv.t; };
G.portalOn = function () { return !!(this.bv && this.bv.portalOpen) && this.screen === 'base' && !this.raid; };
G.openWorlds = function () {
  if (this.portalOn()) return this.closePortal();
  if (this.panel) this.closePanel();
  const bv = this.bv; bv.portalOpen = true; bv.pickW = null; bv.drop = null; bv.theme = null; bv.keepFree(); CAM(bv);
  M.Sfx.portalOpen(); M.worldsOpen(this.meta).forEach((k, i) => setTimeout(() => { if (this.portalOn()) M.Sfx.steleRise(i); }, 200 + i * 90));   // 门开，世界碑一块块升起，一块比一块高
  if (this.meta.baseTut === 4 || this.meta.baseTut === 5) { this.meta.baseTut = 99; this.coachData = null; this.save(); }
  this.bump();
};
G.closePortal = function () { const bv = this.bv; if (!bv || !bv.portalOpen) return; bv.portalOpen = false; bv.pickW = null; bv.drop = null; themeOut(bv); if (this.panel && this.panel.kind === 'loadout') this.panel = null; bv.home(); this.bump(); };
// the loadout panel closes back onto the open portal (the steles rise again); with nothing open, Esc / a click elsewhere shuts it
const oClose = G.closePanel;
G.closePanel = function () {
  const was = this.panel;
  if (!was) { if (this.portalOn()) this.closePortal(); return; }
  const r = oClose.apply(this, arguments);
  if (was.kind === 'loadout' && this.portalOn()) { const bv = this.bv; bv.pickW = null; bv.drop = null; themeOut(bv); CAM(bv); }
  return r;
};
// clicking anything else leaves the portal first (user ruling 2026-09-25): opening a leader card, a room or any
// other panel closes the open portal instead of stacking on top of it
const oOpen = G.openPanel;
G.openPanel = function (p) { if (p && p.kind !== 'loadout' && p.kind !== 'raidPrep' && this.portalOn()) this.closePortal(); return oOpen.apply(this, arguments); };
const oPick = G.pickWorld;
G.pickWorld = function (k) { const r = oPick.apply(this, arguments); if (this.panel && this.panel.kind === 'loadout') { this.bv.pickW = k; CAM(this.bv); } else if (this.bv) { this.bv.pickW = null; themeOut(this.bv); } return r; };
// choosing a stele: it lifts, drops into the portal and shatters; the portal opens onto that world; then the loadout panel
const DROP = 0.46;
G.steleDrop = function (k, x, y) {
  const m = this.meta; if (!m.heroes.some(h => h.hp > 0)) { this.deny('没有能出征的领袖', '#d0453c'); return; }
  const bv = this.bv, W = M.WORLDS[k]; bv.pickW = k; bv.drop = { k, x, y, t0: bv.t }; bv.hoverSt = null; this.tipData = null;
  M.Sfx.steleLift();
  bv.onImpact = () => { M.Sfx.steleHit(); const th = M.WTHEME && M.WTHEME[k]; if (th) setTimeout(() => M.Sfx.worldTheme(th.k), 120); this.fx.kick(18); this.fx.flash && this.fx.flash(W.light, 0.35); this.bump(); };
  setTimeout(() => { if (bv.pickW === k && this.portalOn() && !(this.panel && this.panel.kind === 'loadout')) this.pickWorld(k); }, 1000);
  this.bump();
};

// ───────── the portal's look for each world ─────────
const RN = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const DOOR = (X) => [X - 70, -240, 140, 230];
// inside the arch, revealed as a widening circle
function inner(ctx, X, q, fn) { ctx.save(); ctx.beginPath(); ctx.rect(...DOOR(X)); ctx.clip(); ctx.beginPath(); ctx.arc(X, -125, 8 + 200 * q, 0, 7); ctx.clip(); fn(); ctx.restore(); }
function radial(ctx, X, stops) { const g = ctx.createRadialGradient(X, -125, 6, X, -125, 150); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(...DOOR(X)); }
function gearD(ctx, x, y, r, a, col) { if (r < 2) return; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = col; for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.fillRect(-r * 0.14, -r * 1.2, r * 0.28, r * 0.4); } ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, 7); ctx.fill(); ctx.restore(); }
function swirl(ctx, X, t, col, w, dir) { ctx.save(); ctx.translate(X, -125); for (let k = 0; k < 3; k++) { ctx.rotate(t * (0.7 + k * 0.35) * (dir || 1)); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(0, 0, 32 + k * 30, 0, Math.PI * 1.2); ctx.stroke(); } ctx.restore(); }
const THEME = {
  // 绿意盎然: a green whirl of leaves, vines climbing the pillars, fireflies
  forest: (ctx, t, q, X, L) => {
    inner(ctx, X, q, () => { radial(ctx, X, [[0, '#f0ffd0'], [0.35, '#7ad04a'], [1, '#0e2a14']]);
      for (let i = 0; i < 28; i++) { const a = t * 0.9 + i * 2.4, rr = 110 * ((i * 0.37 + t * 0.25) % 1); ctx.save(); ctx.translate(X + Math.cos(a) * rr, -125 + Math.sin(a) * rr * 1.3); ctx.rotate(a); ctx.fillStyle = i % 3 ? '#3a9a2a' : '#c8ff8a'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.5, 0, 0, 7); ctx.fill(); ctx.restore(); } });
    [-88, 88].forEach((dx, s) => { const top = -10 - 262 * q, vx = (y) => X + dx + Math.sin(y * 0.06 + s * 2) * 10;
      ctx.strokeStyle = '#2e6a22'; ctx.lineWidth = 6; ctx.beginPath(); for (let y = -10; y >= top; y -= 6) (y === -10 ? ctx.moveTo(vx(y), y) : ctx.lineTo(vx(y), y)); ctx.stroke();
      for (let y = -28, j = 0; y >= top; y -= 24, j++) { ctx.fillStyle = j % 3 ? '#5ab83a' : '#9ce86a'; ctx.beginPath(); ctx.ellipse(vx(y) + (j % 2 ? 10 : -10), y, 10, 4.5, j % 2 ? 0.5 : -0.5, 0, 7); ctx.fill(); }
      if (q > 0.9) { ctx.fillStyle = '#ff9ad0'; ctx.beginPath(); ctx.arc(vx(top), top, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#fff0a0'; ctx.fillRect(vx(top) - 2, top - 2, 4, 4); } });
    for (let i = 0; i < 14; i++) { const x = X + Math.sin(t * 0.7 + i * 1.7) * 160, y = -140 + Math.cos(t * 0.9 + i * 2.3) * 130; ctx.globalAlpha = q * (0.5 + 0.5 * Math.sin(t * 5 + i)); ctx.fillStyle = '#eaff8a'; ctx.fillRect(x - 2, y - 2, 5, 5); }
    ctx.globalAlpha = q; L.push({ x: X, y: -130, r: 480, c: '#9cff7a', f: 0.95 * q });
  },
  // 鬼哭狼嚎: pale wisps with screaming faces spiralling out, mist on the ground, a flickering light
  ward: (ctx, t, q, X, L) => {
    inner(ctx, X, q, () => { radial(ctx, X, [[0, '#e8fbff'], [0.3, '#5a98a8'], [1, '#040810']]); swirl(ctx, X, t, 'rgba(230,255,255,0.25)', 5, -1);
      for (let i = 0; i < 7; i++) { const k = (t * 0.3 + i / 7) % 1, a = i * 2.2 + t * 0.8, x = X + Math.sin(a) * 42 * (1 - k), y = -20 - k * 220, s = 9 + 15 * k, fl = RN(i + Math.floor(t * 12)) < 0.1 ? 0.3 : 1;
        ctx.globalAlpha = q * 0.8 * Math.sin(k * Math.PI) * fl; ctx.fillStyle = '#eaffff'; ctx.beginPath(); ctx.ellipse(x, y, s, s * 1.5, Math.sin(t * 2 + i) * 0.2, 0, 7); ctx.fill();
        ctx.fillStyle = '#081014'; ctx.fillRect(x - s * 0.45, y - s * 0.45, s * 0.3, s * 0.4); ctx.fillRect(x + s * 0.15, y - s * 0.45, s * 0.3, s * 0.4); ctx.beginPath(); ctx.ellipse(x, y + s * 0.5, s * 0.22, s * 0.5 * (0.6 + 0.4 * Math.sin(t * 9 + i)), 0, 0, 7); ctx.fill(); } });
    for (let i = 0; i < 7; i++) { ctx.globalAlpha = q * 0.28; ctx.fillStyle = '#cfefff'; ctx.beginPath(); ctx.ellipse(X + (i - 3) * 52 * q + Math.sin(t + i) * 14, -12, 64, 16, 0, 0, 7); ctx.fill(); }
    ctx.globalAlpha = q; L.push({ x: X, y: -130, r: 440, c: '#c0f0ff', f: (0.65 + 0.3 * Math.sin(t * 13) * Math.sin(t * 7)) * q });
  },
  // 鲜血地狱: a blood whirl, fire at the threshold, blood running down the lintel, embers
  hell: (ctx, t, q, X, L) => {
    inner(ctx, X, q, () => { radial(ctx, X, [[0, '#fff0a0'], [0.3, '#ff4a1a'], [0.7, '#8a0a0a'], [1, '#200000']]); swirl(ctx, X, t, 'rgba(80,0,0,0.6)', 10, -1.3);
      for (let i = 0; i < 9; i++) { const x = X - 70 + i * 17.5, h = 34 + 24 * Math.abs(Math.sin(t * 7 + i * 1.3)); ctx.fillStyle = i % 2 ? '#ff6a1a' : '#ffd23a'; ctx.beginPath(); ctx.moveTo(x - 11, -10); ctx.lineTo(x, -10 - h); ctx.lineTo(x + 11, -10); ctx.fill(); } });
    for (let i = 0; i < 8; i++) { const x = X - 116 + i * 32 + (i % 2) * 6, len = (18 + 70 * RN(i)) * q + 8 * Math.sin(t * 1.5 + i); ctx.fillStyle = '#8a0a10'; ctx.fillRect(x, -242, 7, len); ctx.beginPath(); ctx.arc(x + 3.5, -242 + len, 5, 0, 7); ctx.fill(); }
    for (let i = 0; i < 16; i++) { const k = (t * 0.5 + RN(i + 9)) % 1; ctx.globalAlpha = q * (1 - k); ctx.fillStyle = '#ffb04a'; ctx.fillRect(X + (RN(i) - 0.5) * 280 + Math.sin(t * 2 + i) * 10, -20 - k * 340, 4, 4); }
    ctx.globalAlpha = q; L.push({ x: X, y: -110, r: 500, c: '#ff4a2a', f: 0.95 * q });
  },
  // 机械变形: gears turning inside and on the pillars, steam from the sides
  foundry: (ctx, t, q, X, L) => {
    inner(ctx, X, q, () => { radial(ctx, X, [[0, '#ffe0a0'], [0.35, '#c8641a'], [1, '#1a0c04']]); gearD(ctx, X - 26, -168, 36, t * 1.2, '#5a4a3a'); gearD(ctx, X + 30, -98, 42, -t * 1.03, '#6a5438'); gearD(ctx, X - 22, -38, 26, t * 1.6, '#4a3a2a'); });
    gearD(ctx, X - 102, -64, 26 * q, -t * 2, '#8a7a60'); gearD(ctx, X + 102, -204, 26 * q, t * 2, '#8a7a60'); gearD(ctx, X + 100, -60, 18 * q, -t * 2.8, '#6a5a44'); gearD(ctx, X - 100, -206, 16 * q, t * 3, '#6a5a44');
    for (let i = 0; i < 8; i++) { const k = (t * 0.6 + i / 8) % 1, sd = i % 2 ? 1 : -1; ctx.globalAlpha = q * 0.45 * (1 - k); ctx.fillStyle = '#eee8dc'; ctx.beginPath(); ctx.arc(X + sd * (96 + k * 60), -150 - k * 150, 10 + k * 24, 0, 7); ctx.fill(); }
    ctx.globalAlpha = q; L.push({ x: X, y: -130, r: 460, c: '#ffa050', f: 0.9 * q });
  },
  // the sea: rings, bubbles, water spilling over the threshold
  harbor: (ctx, t, q, X, L) => {
    inner(ctx, X, q, () => { radial(ctx, X, [[0, '#d8f8ff'], [0.35, '#2a8ad0'], [1, '#02142a']]);
      for (let i = 0; i < 4; i++) { const k = (t * 0.4 + i / 4) % 1; ctx.strokeStyle = 'rgba(200,240,255,' + (0.55 * (1 - k)).toFixed(2) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(X, -125, 10 + k * 90, (10 + k * 90) * 1.25, 0, 0, 7); ctx.stroke(); }
      for (let i = 0; i < 16; i++) { const k = (t * 0.45 + RN(i)) % 1; ctx.strokeStyle = 'rgba(220,250,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X + (RN(i + 3) - 0.5) * 120 + Math.sin(t * 3 + i) * 5, -10 - k * 230, 3 + RN(i + 7) * 4, 0, 7); ctx.stroke(); } });
    ctx.fillStyle = '#2a7ac0'; ctx.beginPath(); ctx.moveTo(X - 140 * q, -4); for (let x = -140; x <= 140; x += 10) ctx.lineTo(X + x * q, -14 - 5 * Math.sin(t * 4 + x * 0.1)); ctx.lineTo(X + 140 * q, -4); ctx.fill();
    L.push({ x: X, y: -130, r: 460, c: '#60c0ff', f: 0.9 * q });
  },
  // fog: grey-green bands drifting through, one lamp far away
  town: (ctx, t, q, X, L) => {
    inner(ctx, X, q, () => { radial(ctx, X, [[0, '#f0f4e0'], [0.4, '#7a907a'], [1, '#0c140e']]);
      ctx.fillStyle = '#ffe0a0'; ctx.beginPath(); ctx.arc(X + 14, -140, 5, 0, 7); ctx.fill();
      for (let i = 0; i < 7; i++) { const x = X - 90 + ((t * (14 + i * 5) + RN(i) * 200) % 180); ctx.globalAlpha = q * 0.4; ctx.fillStyle = '#dde8dc'; ctx.beginPath(); ctx.ellipse(x, -220 + i * 32, 60, 10, 0, 0, 7); ctx.fill(); } });
    for (let i = 0; i < 8; i++) { ctx.globalAlpha = q * 0.25; ctx.fillStyle = '#dde8dc'; ctx.beginPath(); ctx.ellipse(X + (i - 3.5) * 60 * q + Math.sin(t * 0.8 + i) * 18, -14, 70, 18, 0, 0, 7); ctx.fill(); }
    ctx.globalAlpha = q; L.push({ x: X, y: -130, r: 420, c: '#d8e8c8', f: 0.8 * q });
  },
  // the fair: a hypnotic spiral, bulbs round the arch, confetti
  park: (ctx, t, q, X, L) => {
    inner(ctx, X, q, () => { ctx.fillStyle = '#2a0a2a'; ctx.fillRect(...DOOR(X)); for (let k = 0; k < 12; k++) { const a = t * 1.5 + k * Math.PI / 6; ctx.fillStyle = k % 2 ? '#ff7ab8' : '#ffe0f0'; ctx.beginPath(); ctx.moveTo(X, -125); ctx.arc(X, -125, 200, a, a + Math.PI / 6); ctx.fill(); } ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(X, -125, 16, 0, 7); ctx.fill(); });
    const bulbs = []; for (let y = -20; y > -250; y -= 26) bulbs.push([X - 85, y], [X + 85, y]); for (let x = -110; x <= 110; x += 27) bulbs.push([X + x, -262]);
    bulbs.forEach(([x, y], i) => { if (i / bulbs.length > q) return; ctx.fillStyle = (Math.floor(t * 6) + i) % 2 ? '#ffe070' : '#ff5a9a'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); });
    for (let i = 0; i < 18; i++) { const k = (t * 0.35 + RN(i)) % 1; ctx.fillStyle = ['#ff5a9a', '#ffe070', '#7ad0ff', '#9cff7a'][i % 4]; ctx.save(); ctx.translate(X + (RN(i + 5) - 0.5) * 300, -300 + k * 300); ctx.rotate(t * 4 + i); ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
    L.push({ x: X, y: -130, r: 460, c: '#ff90c0', f: 0.9 * q });
  },
  // warp: stars streaking out of the centre, a cyan ring scanning the frame
  starship: (ctx, t, q, X, L) => {
    inner(ctx, X, q, () => { ctx.fillStyle = '#02040c'; ctx.fillRect(...DOOR(X)); const g = ctx.createRadialGradient(X, -125, 2, X, -125, 60); g.addColorStop(0, 'rgba(180,240,255,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(...DOOR(X));
      for (let i = 0; i < 44; i++) { const a = RN(i) * 6.283, k = (t * 0.8 + RN(i + 1)) % 1, r0 = k * k * 150, r1 = r0 + 6 + k * 34; ctx.strokeStyle = i % 5 ? 'rgba(200,240,255,' + k.toFixed(2) + ')' : 'rgba(143,246,255,' + k.toFixed(2) + ')'; ctx.lineWidth = 1 + k * 2; ctx.beginPath(); ctx.moveTo(X + Math.cos(a) * r0, -125 + Math.sin(a) * r0); ctx.lineTo(X + Math.cos(a) * r1, -125 + Math.sin(a) * r1); ctx.stroke(); } });
    const sy = -10 - ((t * 120) % 240); ctx.fillStyle = 'rgba(143,246,255,0.8)'; ctx.fillRect(X - 100, sy, 30 * q, 3); ctx.fillRect(X + 70, sy, 30 * q, 3);
    L.push({ x: X, y: -130, r: 440, c: '#8ff6ff', f: 0.9 * q });
  },
  // the house: a roulette wheel, gold raining
  casino: (ctx, t, q, X, L) => {
    inner(ctx, X, q, () => { radial(ctx, X, [[0, '#fff0a0'], [0.35, '#8a1a1a'], [1, '#1a0505']]); ctx.save(); ctx.translate(X, -125); ctx.rotate(t * 1.4);
      for (let k = 0; k < 16; k++) { ctx.fillStyle = k === 0 ? '#1a8a3a' : k % 2 ? '#b01a1a' : '#101010'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 58, k * Math.PI / 8, (k + 1) * Math.PI / 8); ctx.fill(); }
      ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 60, 0, 7); ctx.stroke(); ctx.fillStyle = '#ffcc33'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill(); ctx.rotate(-t * 4.2); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(46, 0, 5, 0, 7); ctx.fill(); ctx.restore(); });
    for (let i = 0; i < 16; i++) { const k = (t * 0.5 + RN(i)) % 1, x = X + (RN(i + 4) - 0.5) * 300, y = -300 + k * 300; ctx.fillStyle = '#e8a820'; ctx.beginPath(); ctx.ellipse(x, y, 7 * Math.abs(Math.cos(t * 5 + i)) + 1, 7, 0, 0, 7); ctx.fill(); }
    L.push({ x: X, y: -130, r: 460, c: '#ffcc33', f: 0.9 * q });
  },
};

// ───────── drawing (called from M.drawBase) ─────────
// 碑身：阶梯拱顶（每 10 格一级台阶，像素硬边，不画圆弧）
function slab(ctx, x, y, w, h) {
  const r = w / 2, st = 10; ctx.beginPath(); ctx.moveTo(x - r, y + h);
  for (let a = x - r; a < x + r - 0.01; a += st) { const b = Math.min(a + st, x + r), m = Math.abs((a + b) / 2 - x), top = y + r - Math.sqrt(Math.max(0, r * r - m * m)); ctx.lineTo(a, top); ctx.lineTo(b, top); }
  ctx.lineTo(x + r, y + h); ctx.closePath();
}
function stele(ctx, x, y, W, t, i, hov, sel) {
  const U = M.UI, wl = U ? U.pal(W.light) : W.light; ctx.lineJoin = 'miter';
  // 底座：墨框 + 深渊底 + 靛蓝顶边
  ctx.fillStyle = P.ink; ctx.fillRect(x - SW / 2 - 17, y + SH - 7, SW + 34, 32); ctx.fillStyle = P.abyss; ctx.fillRect(x - SW / 2 - 14, y + SH - 4, SW + 28, 26); ctx.fillStyle = P.indigo; ctx.fillRect(x - SW / 2 - 14, y + SH - 4, SW + 28, 5);
  // 石面：石板灰 → 深渊，5 条硬色带；外框墨色，悬停白、选中金
  ctx.fillStyle = U ? U.lg(ctx, 0, y, 0, y + SH, [[0, P.slate], [1, P.abyss]], 5) : P.slate; slab(ctx, x, y, SW, SH); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = sel ? P.gold : hov ? P.white : P.ink; slab(ctx, x, y, SW, SH); ctx.stroke();
  ctx.fillStyle = 'rgba(7,6,15,0.55)'; slab(ctx, x, y + 14, SW - 28, SH - 26); ctx.fill();
  // 内圈：世界色 3px 硬线，两档明暗步进
  const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * (PJ.reduced ? 0.6 : 0.575 + 0.125 * Math.sin((t * 2 + i) * Math.PI)); ctx.lineWidth = 3; ctx.strokeStyle = wl; slab(ctx, x, y + 14, SW - 28, SH - 26); ctx.stroke(); ctx.globalAlpha = a0;
  ctx.strokeStyle = 'rgba(7,6,15,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - SW / 2 + 6, y + 120); ctx.lineTo(x - SW / 2 + 22, y + 138); ctx.lineTo(x - SW / 2 + 16, y + 160); ctx.moveTo(x + SW / 2 - 8, y + 70); ctx.lineTo(x + SW / 2 - 20, y + 84); ctx.stroke();
  // 顶上的宝石：墨框方块 + 世界色 + 左上白高光
  ctx.fillStyle = P.ink; ctx.fillRect(x - 14, y + 8, 28, 28); ctx.fillStyle = wl; ctx.fillRect(x - 10, y + 12, 20, 20); ctx.fillStyle = P.white; ctx.fillRect(x - 8, y + 14, 6, 6);
}
M.drawSteles = function (ctx, meta, bv, lights, layer) {
  const t = bv.t, on = !!bv.portalOpen, dtf = layer === 'body' ? Math.max(0, Math.min(0.05, t - (bv._dtp || t))) : 0;
  if (layer === 'body') { bv._dtp = t; bv.po = (bv.po || 0) + ((on ? 1 : 0) - (bv.po || 0)) * Math.min(1, dtf * 5); const sv = on && !bv.pickW ? 1 : 0; bv.sv = (bv.sv || 0) + (sv - (bv.sv || 0)) * Math.min(1, dtf * (sv ? 5 : 7)); bv.steles = []; }
  const po = bv.po || 0, sv = bv.sv || 0, X = DX();
  // the chosen world's portal
  const th = bv.theme;
  if (th && layer === 'body') {
    const qi = cl((t - th.t0) / 0.8, 0, 1), q = th.out != null ? qi * (1 - cl((t - th.out) / 0.45, 0, 1)) : qi;
    if (th.out != null && q <= 0) bv.theme = null; else if (THEME[th.k]) { ctx.save(); ctx.globalAlpha = Math.min(1, q * 1.6); THEME[th.k](ctx, t, eo(q), X, lights || []); ctx.restore(); }
  }
  // the chosen stele: lift, fall into the arch, shatter
  const D = bv.drop;
  if (D && layer === 'body') {
    const e = t - D.t0, W = M.WORLDS[D.k];
    if (e < DROP) {
      const lift = e < 0.14 ? Math.sin(e / 0.14 * Math.PI / 2) * 36 : 36 * (1 - cl((e - 0.14) / 0.1, 0, 1)), f = cl((e - 0.14) / (DROP - 0.14), 0, 1), ff = f * f;
      const x = D.x + (X - D.x) * ff, y = D.y - lift + (-125 - SH * 0.3 - D.y) * ff, s = 1 - 0.35 * ff;
      ctx.save(); ctx.translate(x, y + SH / 2); ctx.rotate(Math.sin(e * 18) * 0.04 * (1 - f) + ff * 0.12); ctx.scale(s, s); ctx.translate(-x, -(y + SH / 2)); stele(ctx, x, y, W, t, 0, false, true); ctx.restore();
      if (lights) lights.push({ x, y: y + SH / 2, r: 260, c: W.light, f: 0.9 });
    } else if (!D.hit) {
      D.hit = true; bv.theme = { k: D.k, t0: t };
      bv.shards = []; for (let i = 0; i < 44; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 3.4, v = 260 + Math.random() * 560; bv.shards.push({ x: X + (Math.random() - 0.5) * 90, y: -140 + (Math.random() - 0.5) * 90, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, r: Math.random() * 6, vr: (Math.random() - 0.5) * 14, s: 6 + Math.random() * 16, c: i % 5 === 0 ? W.light : i % 2 ? P.slate : P.indigo, life: 1.1 + Math.random() * 0.6, age: 0 }); }
      bv.boom = t; bv.onImpact && bv.onImpact();
    }
  }
  if (layer === 'body' && bv.boom != null) {
    const e = t - bv.boom; if (e > 0.6) bv.boom = null; else { const W = M.WORLDS[(bv.theme || bv.drop || {}).k] || { light: '#5fd0c0' }; ctx.save(); ctx.globalAlpha = 1 - e / 0.6; ctx.strokeStyle = W.light; ctx.lineWidth = 12 * (1 - e / 0.6) + 2; ctx.beginPath(); ctx.ellipse(X, -125, 40 + e * 700, 30 + e * 380, 0, 0, 7); ctx.stroke(); ctx.restore(); if (lights) lights.push({ x: X, y: -125, r: 900, c: W.light, f: 1.6 * (1 - e / 0.6) }); }
  }
  if (layer === 'body' && bv.shards && bv.shards.length) {
    bv.shards = bv.shards.filter(p => (p.age += dtf) < p.life);
    bv.shards.forEach(p => { p.vy += 1100 * dtf; p.x += p.vx * dtf; p.y += p.vy * dtf; p.r += p.vr * dtf; ctx.save(); ctx.globalAlpha = cl(1 - p.age / p.life, 0, 1); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.beginPath(); ctx.moveTo(-p.s / 2, -p.s / 3); ctx.lineTo(p.s / 2, -p.s / 2); ctx.lineTo(p.s / 3, p.s / 2); ctx.lineTo(-p.s / 2, p.s / 3); ctx.closePath(); ctx.fill(); ctx.restore(); });
  }
  if (po < 0.01 || sv < 0.01) return;
  const list = M.worldsOpen(meta), n = list.length;
  list.forEach((k, i) => {
    if (D && D.k === k) return;
    const W = M.WORLDS[k], rise = cl((sv * po - i * 0.12) / 0.7, 0, 1); if (rise <= 0) return;
    const x = X + (i - (n - 1) / 2) * GAP, y = -250 + (TOPY + 250) * eb(rise) + Math.sin(t * 1.6 + i * 1.3) * 6;
    const hov = bv.hoverSt === k, al = cl(rise * 1.4, 0, 1);
    if (layer === 'body') {
      ctx.save(); ctx.globalAlpha = al;
      // 碑下的光柱：青色 4 级硬色带，越往下越淡
      ctx.fillStyle = M.UI ? M.UI.lg(ctx, 0, y + SH, 0, -240, [[0, 'rgba(71,214,193,0.35)'], [1, 'rgba(71,214,193,0)']], 4) : 'rgba(71,214,193,0.2)'; ctx.fillRect(x - 3, y + SH, 6, Math.max(0, -240 - y - SH));
      stele(ctx, x, y, W, t, i, hov, false); ctx.restore();
      if (lights) lights.push({ x, y: y + SH / 2, r: 240, c: W.light, f: (0.55 + (hov ? 0.3 : 0)) * rise });
      if (sv > 0.95) { const a = bv.toScreen(x - SW / 2 - 14, y), b = bv.toScreen(x + SW / 2 + 14, y + SH + 22); bv.steles.push({ k, x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y, wx: x, wy: y }); }
      return;
    }
    // crisp layer (screen space): the danger word and the specialty icons
    const z = bv.z, c = bv.toScreen(x, y), Dg = M.worldDanger(meta, k), L = M.worldLoot(k);
    ctx.save(); ctx.globalAlpha = al;
    // 危险字：像素字（字号取 12 的倍数，随镜头一档一档变）+ 八向 3px 墨描边
    const U = M.UI, sk = M.spriteCanvas('skull', 4), ss = 34 * z, fs = Math.max(24, Math.round(46 * z / 12) * 12), dy = Math.round(c.y + 92 * z);
    const tw = U.measure(ctx, Dg.n, fs), x0 = Math.round(c.x - (ss + 8 * z + tw) / 2);
    if (sk) ctx.drawImage(sk, x0, dy - ss / 2, ss, ss);
    U.text(ctx, Dg.n, Math.round(x0 + ss + 8 * z + tw / 2), dy, fs, Dg.c, { outline: true });
    const sc = M.sceneOf && M.sceneOf(meta, k); if (sc) U.text(ctx, sc.n, Math.round(c.x), Math.round(c.y + 42 * z), Math.max(24, Math.round(34 * z / 12) * 12), sc.replay ? '#a89ca8' : '#f4efe0', { outline: true });   // the scene this stele leads to (mc-scenes.js)
    const is = 38 * z, gap = 10 * z, wT = L.length * is + (L.length - 1) * gap; let lx = c.x - wT / 2; const ly = c.y + 150 * z;
    L.forEach(l => { const cv = icCanvas(l.ic); if (cv) { const s = Math.min(is / cv.width, is / cv.height); ctx.drawImage(cv, lx + (is - cv.width * s) / 2, ly + (is - cv.height * s) / 2, cv.width * s, cv.height * s); } lx += is + gap; });
    ctx.restore();
  });
};

// ───────── pointer: hover explains a stele, click picks its world ─────────
const hitS = (g, sx, sy) => (g.portalOn() && g.bv && (g.bv.steles || []).find(o => sx >= o.x && sx <= o.x + o.w && sy >= o.y && sy <= o.y + o.h)) || null;
const hitSt = (g, sx, sy) => { const s = hitS(g, sx, sy); return s ? s.k : null; };
G.steleTip = function (k) {
  const m = this.meta, W = M.WORLDS[k], th = M.WTHEME && M.WTHEME[k], D = M.worldDanger(m, k);
  const brief = [[{ img: M.spriteURL('skull', 4), t: '危险 ' + D.n, c: D.c }]].concat(M.worldLoot(k).map(l => [{ img: icURL(l.ic), t: l.t, c: l.c || '#e8dcc4' }]));
  const lines = [{ t: '开局的仗约 ' + D.first + '，首领约 ' + D.boss, c: '#cfc6b8' }, { t: '你出发时约 ' + D.mine + '（最强领袖 + 开局部队）', c: '#a89ca8' }];
  if (th) lines.push({ t: '敌人：' + th.races.join('、'), c: '#a89ca8' });
  if (m.cleared[k]) lines.push({ t: '已通关', c: '#9cff7a' }); else if (W.final) lines.push({ t: '最终之地', c: '#ffcc33' });
  return { title: W.n, c: W.light, brief, lines };
};
const oMove = G.baseMove;
G.baseMove = function (sx, sy) {
  oMove.apply(this, arguments); const k = hitSt(this, sx, sy), bv = this.bv; if (!bv) return;
  if (k !== bv.hoverSt) { bv.hoverSt = k; if (k) M.Sfx.hover(); }
  if (k) { bv.hover = null; bv.hoverIc = null; this.tipData = this.steleTip(k); }
};
const oLeave = G.baseLeave; G.baseLeave = function () { if (this.bv) this.bv.hoverSt = null; return oLeave.apply(this, arguments); };
const oClick = G.baseClick;
G.baseClick = function (sx, sy) {
  if (!this.raid && !this.reel && this.portalOn()) {
    const st = hitS(this, sx, sy); if (st) { M.Sfx.init(); M.Sfx.click(); this.fx.clickBurst(sx, sy, M.WORLDS[st.k].light); return this.steleDrop(st.k, st.wx, st.wy); }
    // the chosen stele is still falling; if its world never opened (something else took over), let go of it
    if (this.bv.drop && !(this.panel && this.panel.kind === 'loadout')) { if (this.bv.t - this.bv.drop.t0 < 1.6) return; this.bv.drop = null; this.bv.pickW = null; }
    const p = this.bv.pick(sx, sy); if (!p || !p.door) { this.closePortal(); if (!p) return; }
  }
  return oClick.apply(this, arguments);
};
// the portal shuts when the base is left (expedition, raid)
const oGo = G.go; G.go = function (s) { if (s !== 'base' && this.bv) { this.bv.portalOpen = false; this.bv.pickW = null; } return oGo.apply(this, arguments); };

// ───────── guide anchors ─────────
const stAt = (g, f) => { if (!g.portalOn || !g.portalOn() || !g.bv || !g.bv.steles || !g.bv.steles.length) return null; const s = g.bv.steles[0]; return f(s); };
M.STELE_AT = { scene: (g) => stAt(g, s => ({ x: s.x, y: s.y + s.h * 0.08, w: s.w, h: s.h * 0.2 })), danger: (g) => stAt(g, s => ({ x: s.x, y: s.y + s.h * 0.3, w: s.w, h: s.h * 0.25 })), loot: (g) => stAt(g, s => ({ x: s.x, y: s.y + s.h * 0.58, w: s.w, h: s.h * 0.25 })) };
})();

;
