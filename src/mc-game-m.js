// ==== mc-game-m.js ====
(function () {
// Raids and battles get a director camera that follows the fight and pulls back to keep everyone in frame.
const M = window.MC, G = M.Game.prototype;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

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
const oldView = G.view;
G.view = function () { const v = oldView.call(this); v.fxZ = (this.mini && !this.reel) || this.tear ? 45 : 'auto'; return v; };
})();

;
