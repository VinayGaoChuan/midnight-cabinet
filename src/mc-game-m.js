// ==== mc-game-m.js ====
(function () {
// A new day arrives like a calendar page in a stylish heist game (red/black slashes, slammed numbers, raid countdown);
// raids and battles get a director camera that follows the fight and pulls back to keep everyone in frame.
const M = window.MC, G = M.Game.prototype, S = M.Sfx;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (p) => 1 - Math.pow(1 - cl(p, 0, 1), 3), eb = (p) => M.ease.eback(cl(p, 0, 1));
// Pixel Juice（docs/design.md §11.5）：红 / 墨 / 奶油三色勒索信，像素字，动作按 12 帧一格一格走
const U = M.UI, P = M.PJ.PAL, RED = P.red, INK = P.ink, PAPER = P.cream, WINE = P.wine;
const RM = () => !!M.PJ.reduced, stepT = (t) => t;

// ═════════════════════ day ceremony ═════════════════════
const DAY_LEN = 2.9, RAID_LEN = 3.6;
// jagged ransom-note letters: every glyph in its own tilted box (3px ink edge, pixel font)
function ransom(x, s, cx, cy, size, seed, o) {
  o = o || {};
  const chars = [...s], ws = chars.map((ch, i) => Math.round(size * (0.86 + ((i * 37 + seed) % 7) * 0.05))), gap = size * 0.08, tot = ws.reduce((a, b) => a + b * 0.92 + gap, 0);
  let px = cx - tot / 2; chars.forEach((ch, i) => { const w = ws[i], k = (i * 13 + seed) % 3, rot = (((i * 29 + seed) % 9) - 4) * 0.035, bg = o.pal ? o.pal[k] : [INK, PAPER, RED][k], fg = bg === PAPER ? INK : PAPER, jy = (((i * 17 + seed) % 5) - 2) * size * 0.05;
    x.save(); x.translate(Math.round(px + w / 2), Math.round(cy + jy)); x.rotate(rot); if (ch !== ' ') { x.fillStyle = INK; x.fillRect(-w / 2 - 3, -w / 2 - 3, w + 6, w + 6); x.fillStyle = bg; x.fillRect(-w / 2, -w / 2, w, w); x.font = U.font(Math.round(w * 0.78)); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fg; x.fillText(ch, 0, Math.round(w * 0.04)); } x.restore(); px += w * 0.92 + gap; });
}
// 网点 → 6px 棋盘格（墨色，低透明度）
let HT = null;
function halftone(x, a, b, w, h, al) { if (!HT) { HT = document.createElement('canvas'); HT.width = HT.height = 12; const c = HT.getContext('2d'); c.fillStyle = INK; c.fillRect(0, 0, 6, 6); c.fillRect(6, 6, 6, 6); } x.save(); x.imageSmoothingEnabled = false; x.globalAlpha *= al; x.fillStyle = x.createPattern(HT, 'repeat'); x.fillRect(a, b, w, h); x.restore(); }
// 像素箭头（朝下）：一行一行缩短，3px 墨边
function downArrow(x, cx, top, col) { const Wd = [60, 42, 24, 6]; Wd.forEach((w, i) => { x.fillStyle = INK; x.fillRect(cx - w / 2 - 3, top + i * 12 - 3, w + 6, 18); }); Wd.forEach((w, i) => { x.fillStyle = col; x.fillRect(cx - w / 2, top + i * 12, w, 12); }); }
M.drawDayFx = function (ctx, g) {
  const D = g.dayFx; if (!D) return; const t = D.t, ts = stepT(t, 12), L = D.raid ? RAID_LEN : DAY_LEN, out = cl((ts - (L - 0.45)) / 0.45, 0, 1), inQ = eo(ts / 0.22), ox = Math.round(out * out * 2400);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  M.fxDim(ctx, 0.76 * cl(ts / 0.15, 0, 1) * (1 - out));
  ctx.translate(ox, 0);
  // red slash band (wine hard shadow, 6px dither), ink shards
  const pulse = D.raid && t > 1.3 ? 0.5 + 0.5 * Math.sin(t * 18) : 0;
  const band = () => { ctx.beginPath(); ctx.moveTo(0, 300); ctx.lineTo(1920, 120); ctx.lineTo(1920, 700); ctx.lineTo(0, 900); ctx.closePath(); };
  ctx.save(); ctx.translate(Math.round(-1920 * (1 - inQ)), 0);
  ctx.save(); ctx.translate(0, 12); ctx.fillStyle = WINE; band(); ctx.fill(); ctx.restore();
  ctx.fillStyle = RED; band(); ctx.fill();
  ctx.save(); ctx.clip(); halftone(ctx, 0, 120, 1920, 780, 0.22); ctx.restore();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(0, 860); ctx.lineTo(1920, 640); ctx.lineTo(1920, 760); ctx.lineTo(0, 1000); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 250); ctx.lineTo(900, 140); ctx.lineTo(0, 200); ctx.fill(); ctx.restore();
  // star burst behind the number
  const nx = 660, ny = 500, sq = eb((ts - 0.15) / 0.35); if (sq > 0) { ctx.save(); ctx.translate(nx, ny); ctx.rotate(ts * 0.4); ctx.scale(sq, sq); ctx.fillStyle = INK; ctx.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 230 : 330 + (i % 4) * 20; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.fillStyle = PAPER; ctx.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 200 : 290 + (i % 4) * 16; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.restore(); }
  // calendar number (Silkscreen, red hard offset): old day slides away, new day slams down
  const flip = 0.72, slam = cl((ts - flip) / 0.22, 0, 1), nw = U.measure(ctx, String(Math.max(D.from, D.to)), 288, true), NS = nw > 400 ? Math.max(120, Math.floor(288 * 400 / nw / 8) * 8) : 288;
  ctx.save(); ctx.translate(nx, ny); ctx.rotate(-0.08);
  ctx.font = U.font(NS, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (t < flip + 0.2) { const u = cl((ts - flip) / 0.2, 0, 1); ctx.save(); ctx.globalAlpha = 1 - u; ctx.translate(-u * 120, -u * 260); ctx.rotate(-u * 0.5); ctx.fillStyle = RED; ctx.fillText(String(D.from), 12, 12); ctx.fillStyle = INK; ctx.fillText(String(D.from), 0, 0); ctx.restore(); }
  if (t >= flip) { const s = 1 + (1 - eo(slam)) * 0.9, dy = -(1 - eo(slam)) * 300; ctx.save(); ctx.translate(0, dy); ctx.scale(s, s); ctx.fillStyle = RED; ctx.fillText(String(D.to), 12, 12); ctx.fillStyle = INK; ctx.fillText(String(D.to), 0, 0); ctx.restore(); }
  ctx.restore();
  ransom(ctx, '第', nx - 250, ny - 150, 70, 3); ransom(ctx, '天', nx + 250, ny + 150, 70, 7);
  // raid countdown on the right: one key cap per day of the cycle (used days are pressed in)
  const rx = 1330, ry = 380, E = M.RAID_EVERY, st = cl((ts - 0.45) / 0.3, 0, 1);
  if (st > 0) { ctx.save(); ctx.globalAlpha = st; ctx.translate(Math.round((1 - eo(st)) * 300), 0);
    ransom(ctx, D.raid ? '今晚·混沌来袭' : '混沌来袭倒计时', rx, ry - 120, D.raid ? 76 : 52, 11, D.raid ? { pal: [INK, RED, INK] } : null);
    const pos0 = ((D.from - 1) % E + E) % E, pos1 = ((D.to - 1) % E + E) % E, wrap = pos1 < pos0, arrive = eo((ts - (wrap ? 1.3 : 1.0)) / (wrap ? 0.45 : 0.4)), mk = pos0 + (pos1 - pos0) * arrive;
    for (let i = 0; i < E; i++) { const sx = rx - (E - 1) * 70 + i * 140, last = i === E - 1;
      // a new cycle: the used slots flip over one by one and come back lit
      const rl = wrap ? eo((ts - 1.0 - i * 0.07) / 0.18) : 1, dark = wrap ? (rl < 0.5 ? i <= pos0 : i <= pos1 && arrive > 0.95) : i <= mk, fs = wrap ? Math.max(0.08, Math.abs(1 - 2 * rl)) : 1;
      ctx.save(); ctx.translate(sx, ry + 40); ctx.rotate(-0.08 + (i % 2) * 0.05); ctx.scale(1, fs);
      // 键帽：3px 墨框 + 6px 墨投影；混沌来袭夜 = 红键；用过的天 = 按下去的暗键（陷下 6px、没有投影）
      const k = last ? 'red' : dark ? 'dn' : 'cap', F = { red: [RED, P.pink, WINE], cap: [PAPER, null, P.lavender], dn: [P.night, null, null] }[k], oy = k === 'dn' ? 6 : 0;
      ctx.fillStyle = INK; if (k !== 'dn') ctx.fillRect(-53, -47, 106, 106); ctx.fillRect(-53, -53 + oy, 106, 106);
      ctx.fillStyle = F[0]; ctx.fillRect(-50, -50 + oy, 100, 100);
      if (F[1]) { ctx.fillStyle = F[1]; ctx.fillRect(-50, -50, 100, 6); }
      if (F[2]) { ctx.fillStyle = F[2]; ctx.fillRect(-50, 41, 100, 9); }
      if (k === 'dn') { ctx.fillStyle = P.abyss; ctx.fillRect(-50, -44, 100, 6); }
      if (last) { const ic = M.iconCanvas('r_skel', 3); if (ic) { ctx.imageSmoothingEnabled = false; ctx.drawImage(ic, -38, -42, 76, 76); } } else U.text(ctx, String(i + 1), 0, oy - 4, 52, k === 'dn' ? P.haze : INK, { num: true, shadow: false });
      ctx.restore(); }
    const mxp = Math.round((rx - (E - 1) * 70 + mk * 140)); downArrow(ctx, mxp, ry - 60, PAPER); ctx.strokeStyle = PAPER; ctx.lineWidth = 6; ctx.strokeRect(mxp - 58, ry - 18, 116, 116);
    const left = D.raidIn; ransom(ctx, D.raid ? '准备迎战' : left === 1 ? '明晚来袭' : '还有' + left + '天', rx, ry + 180, 60, 19, D.raid ? { pal: [RED, INK, RED] } : null);
    ctx.restore(); }
  if (D.raid && t > 1.3 && pulse > 0.5) { ctx.globalAlpha = 0.2; ctx.fillStyle = RED; ctx.fillRect(-ox, 0, 1920, 1080); ctx.globalAlpha = 1; }
  ctx.restore();
};
const oldPass = G.passDay;
G.passDay = function () {
  const m = this.meta, from = m.day, len = (m.day + 1) % M.RAID_EVERY === 0 && m.heroes.length ? RAID_LEN : DAY_LEN;
  // the day's news (finished buildings, coach tips) waits until the calendar has turned
  const st = window.setTimeout; let logs; window.setTimeout = (f, ms, ...a) => st(f, (ms || 0) + len * 1000, ...a);
  try { logs = oldPass.call(this); } finally { window.setTimeout = st; }
  this.banners = this.banners.filter(b => !(b.text && /^第 \d+ 天$/.test(b.text)));
  const raid = m.day % M.RAID_EVERY === 0 && m.lastRaid !== m.day && m.heroes.length > 0, raidIn = raid ? 0 : M.RAID_EVERY - (m.day % M.RAID_EVERY);
  this.dayFx = { t: 0, from, to: m.day, raidIn, raid, logs: logs || [] }; this.closePanel && this.closePanel(); this.tipData = null;
  S.whoosh(0.6); S.stamp(); return logs;
};
const oldCheck = G.checkRaid;
G.checkRaid = function () { const D = this.dayFx; if (D) { const L = D.raid ? RAID_LEN : DAY_LEN; setTimeout(() => this.checkRaid(), Math.max(0, L - D.t) * 1000 + 120); return false; } return oldCheck.call(this); };
G.dayTick = function (dt) {
  const D = this.dayFx; if (!D) return; const prev = D.t; D.t += dt; const L = D.raid ? RAID_LEN : DAY_LEN, x = (a) => prev < a && D.t >= a;
  if (x(0.72 + 0.2)) { S.stamp(); S.impact(); this.fx.kick(22); this.fx.flash('#ffffff', 0.25); }
  if (x(0.45)) S.whoosh(0.3);
  if (x(1.0)) { for (let i = 0; i < 3; i++) S.tick(i * 3); }
  if (((D.to - 1) % M.RAID_EVERY) < ((D.from - 1) % M.RAID_EVERY)) for (let i = 0; i < M.RAID_EVERY; i++) if (x(1.09 + i * 0.07)) S.tick(i);
  if (D.raid && x(1.3)) { S.alarm(); this.fx.kick(30); }
  if (D.raid && D.t > 1.3 && Math.floor(D.t * 3) !== Math.floor(prev * 3)) S.heart();
  if (x(L - 0.45)) S.whoosh(0.4);
  if (D.t >= L) this.dayFx = null; this.bump();
};

// ═════════════════════ raid director camera ═════════════════════
const { DOOR_X } = M.BASE_GEO;
G.raidDirector = function (dt) {
  const r = this.raid, bv = this.bv; if (!r || r.done) { this._rc = null; return; }
  const pts = r.ents.filter(e => e.alive); let x0 = DOOR_X - 260, x1 = DOOR_X + 260, y0 = -300, y1 = -10;
  pts.forEach(e => { x0 = Math.min(x0, e.x); x1 = Math.max(x1, e.x); y0 = Math.min(y0, e.y - 160); y1 = Math.max(y1, e.y + 20); });
  // shots from the rooms below pull the frame down a little so the defence is visible too
  const shots = (r.proj || []).filter(p => p.y > 0); if (shots.length) y1 = Math.max(y1, Math.min(420, Math.max(...shots.map(p => p.y))));
  const w = x1 - x0 + 520, h = y1 - y0 + 360; let z = cl(Math.min(1920 / w, 1080 / h), 0.5, 1.3);
  const T = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 + 40, z };
  if (r.over) { T.x = DOOR_X; T.y = -140; T.z = 1.05; }
  const c = this._rc || (this._rc = { x: bv.x, y: bv.y, z: bv.z }), k = 1 - Math.exp(-dt * 2.2);
  c.x += (T.x - c.x) * k; c.y += (T.y - c.y) * k; c.z += (T.z - c.z) * k;
  bv.tx = c.x; bv.ty = c.y; bv.tz = c.z; bv.sel = null; bv.free = null;
};
const oldBT = G.baseTick;
G.baseTick = function (dt) { if (this.raid) this.raidDirector(dt); return oldBT.call(this, dt); };

// ═════════════════════ battle director camera ═════════════════════
const FW = 1920, FH = 720;
const oFx = M.drawFxPx;
M.drawFxPx = function (ctx, f, T, b) { if (M._camPass === 'world' && f.k === 'ctitle' && f.tier >= 2) { M._hudFx.push([f, T, b]); return true; } return oFx.apply(this, arguments); };
G.camStep = function (b, dt) {
  const cam = this.bcam && this.bcam.b === b ? this.bcam : (this.bcam = { x: FW / 2, y: FH / 2, z: 1, b });
  let tx = FW / 2, ty = FH / 2, tz = 1; const T = b.t;
  const list = b.ents.filter(e => e.alive && (!e.isHero || e.enterT != null) && T >= (e.entryT || 0));
  if (!b.over && T > 1.4 && list.length) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; list.forEach(e => { const s = e.sz || 1; x0 = Math.min(x0, e.x - 40 * s); x1 = Math.max(x1, e.x + 40 * s); y0 = Math.min(y0, e.y - 150 * s); y1 = Math.max(y1, e.y + 20); });
    const w = x1 - x0 + 300, h = y1 - y0 + 160; tz = cl(Math.min(FW / w, FH / h), 1, 1.4); tx = (x0 + x1) / 2; ty = (y0 + y1) / 2;
    const fo = b.focus && T < b.focus.until && b.focus.ent && b.focus.ent.alive ? b.focus.ent : null;
    if (fo) { tz = Math.max(tz, 1.32); tx = tx * 0.35 + fo.x * 0.65; ty = ty * 0.5 + (fo.y - 70) * 0.5; }
  }
  const k = 1 - Math.exp(-dt * (b.focus && T < b.focus.until ? 4 : 2.4)); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k;
  const hw = FW / 2 / cam.z, hh = FH / 2 / cam.z; cam.x = cl(cam.x, hw, FW - hw); cam.y = cl(cam.y, hh, FH - hh);
  return cam;
};
G.camField = function (x, y) { const c = this.bcam || { x: FW / 2, y: FH / 2, z: 1 }; return { x: (x - c.x) * c.z + FW / 2, y: (y - c.y) * c.z + FH / 2 }; };
G.battleTick = function (dt) {
  const b = this.battle; if (!b) return;
  // everyone is in place: hold the fight until the intro announcement has faded
  // (the clock stops just short of the moment the first opening skill is due)
  if (this.introBanner && !this.banners.includes(this.introBanner)) this.introBanner = null;
  let bd = dt * this.speed * (this.reel ? 0.03 : 1); if (this.introBanner) bd = Math.max(0, Math.min(bd, b.entryEnd - 0.005 - b.t));
  if (!this.paused && !this.settle && bd > 0) b.step(bd);
  if (b.cutin && b.cutin !== this.lastCut) { this.lastCut = b.cutin; this.banner({ kind: 'skill', text: b.cutin.text, sub: b.cutin.sub, col: b.cutin.col, img: M.spriteCanvas(b.cutin.sprite, 22), life: 1.25, y: 470 }); }
  if (this.settle) this.settleTick(dt); else if (b.over && b.overT > 1.0) this.startSettle();
  const c = this.ui.cv('field'); if (!c) return;
  const cam = this.camStep(b, this.paused ? 0 : dt);
  if (!M.pixelMode) return M.pxRender(c, FW, FH, (x) => b.render(x, { slow: this.reel ? 1 : 0 }), 'field');
  const L = M.pxLayer('field', FW, FH), lx = L.getContext('2d'); lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalAlpha = 1; lx.globalCompositeOperation = 'source-over'; lx.filter = 'none';
  M._camPass = 'world'; M._hudFx = []; const meter = b.meter; b.meter = null;
  try { b.render(lx, { slow: this.reel ? 1 : 0 }); } finally { b.meter = meter; M._camPass = null; }
  const t = c.getContext('2d'); t.save(); t.setTransform(1, 0, 0, 1, 0, 0); t.globalAlpha = 1; t.globalCompositeOperation = 'copy'; t.imageSmoothingEnabled = false;
  const sw = L.width / cam.z, sh = L.height / cam.z, sx = cam.x / FW * L.width - sw / 2, sy = cam.y / FH * L.height - sh / 2;
  t.drawImage(L, sx, sy, sw, sh, 0, 0, FW, FH); t.restore();
  // screen-anchored layer: big skill titles and the damage meter never leave the frame
  const Hl = M.pxLayer('fieldHud', FW, FH), hx = Hl.getContext('2d'); hx.setTransform(1, 0, 0, 1, 0, 0); hx.globalAlpha = 1; hx.globalCompositeOperation = 'source-over'; hx.clearRect(0, 0, FW, FH);
  const focus = b.focus; b.focus = null; M._camPass = 'hud';
  try { M._hudFx.forEach(([f, T, bb]) => oFx(hx, f, T, bb)); if (M.drawBattleHudPx) M.drawBattleHudPx(hx, b, b.t); } finally { b.focus = focus; M._camPass = null; }
  t.save(); t.setTransform(1, 0, 0, 1, 0, 0); t.imageSmoothingEnabled = false; t.drawImage(Hl, 0, 0, Hl.width, Hl.height, 0, 0, FW, FH); t.restore();
};
// rewards that fly out of the field start where the unit is actually shown
const oldGo = G.beginBattle;
G.beginBattle = function (n) { oldGo.call(this, n); const b = this.battle; if (!b) return; this.bcam = null; const og = b.onGain; if (og) b.onGain = (x, y, g) => { const p = this.camField(x, y); og(p.x, p.y, g); }; };

// ───────── hooks ─────────
const oldTick = G.tick;
G.tick = function (dt) { oldTick.call(this, dt); if (this.dayFx) this.dayTick(Math.min(dt, 0.05)); };
const FLP = M.FxLayer.prototype, oD = FLP.draw;
FLP.draw = function (ctx, noClear) { const g = M._g; if (g && this === g.fx && g.dayFx) { ctx.save(); try { ctx.setTransform(1, 0, 0, 1, 0, 0); M.drawDayFx(ctx, g); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('dayfx: ' + e.message); g.dayFx = null; } ctx.restore(); } return oD.call(this, ctx, noClear); };
const oldView = G.view;
G.view = function () { const v = oldView.call(this); if (this.dayFx) { v.coverOn = true; v.tipOn = false; v.pnOn = false; } v.fxZ = (this.mini && !this.reel) || this.tear || this.dayFx ? 45 : 'auto'; return v; };
})();

;
