// ==== mc-bossart.js ====
(function () {
// Bosses redrawn to the pixel-character standard (pcd/run/boss-standard.md, docs/design.md §8.3). Pilots: 奔雷 (small boss,
// module B_centaur) and 深渊魔王 (final boss, module B_demon); every other boss keeps its old picture until it is redrawn.
// · Small boss: the module takes over the unit (e.hd.key) and is drawn at unit pixel size (e.pxBig = 1, not the old ×2 blow-up).
//   Each kit move plays the module's own move (setMove), its charge cut to the game's charge, so the release frame is the hit.
//   The charge across the field is a fast gallop with a lightning trail; the roar at half life is the module's roar.
// · Final boss: one engine of its own, driven by its state (rise, moves, the second-phase show, death), drawn over the arena.
// · Portraits (立绘): the module drawn at twice the resolution in its portrait pose (M.bossPortrait) for the map, the stele,
//   the boss-plan board, the fight intro and the defeat board.
const M = window.MC, PCD = window.PCD, G = M && M.PCDG; if (!PCD || !G) return;
const HAS_DOM = typeof document !== 'undefined' && !!document.createElement;
const MINI = { Centaur: 'B_centaur' }, FINAL = { FB_demon: 'B_demon' };
const MOVES = { B_centaur: { charge: 'charge', trample: 'trample' } };
// a final boss FB_x is redrawn as soon as its module B_x exists (pcd/chars/B_x.js); small bosses are listed in MINI
const OFF = {};   // OFF[k] = 1: show the old picture (before / after shots)
// a small boss (unit key K) as soon as B_K exists
const artOf = (k) => { if (OFF[k] || !k) return null; const a = MINI[k] || FINAL[k] || (/^FB_/.test(k) ? 'B_' + k.slice(3) : 'B_' + k); return a && PCD.has(a) ? a : null; };
const mcache = {};
const modMoves = (a) => { if (mcache[a]) return mcache[a]; let l = []; try { const g = PCD.createEngine({ game: true, W: (PCD.meta(a) || {}).W, H: (PCD.meta(a) || {}).H }); g.load(a); l = g.C.MOVES || []; } catch (err) { /* none */ } return (mcache[a] = l); };
// a module's own voices go to the synth (charFx('boss', { k }))
const voiced = {};
function voices(a) { if (voiced[a]) return; voiced[a] = 1; const S = M.Sfx; try { const g = PCD.createEngine({ game: true, W: (PCD.meta(a) || {}).W, H: (PCD.meta(a) || {}).H }); g.load(a); const V = g.C.VOICES; if (V && S && S.bossVoice) for (const k in V) S.bossVoice(k, V[k]); } catch (err) { /* no voices */ } }
M.BOSSART = { MINI, FINAL, OFF, artOf };

// ───────── portraits ─────────
const pcache = {};
function portraitCanvas(k) {
  const a = artOf(k); if (!a || !HAS_DOM) return null; if (pcache[a]) return pcache[a];
  const mt = PCD.meta(a) || {}, g = PCD.createEngine({ game: true, W: mt.W, H: mt.H }); g.load(a);
  const s = g.portrait(); if (!s) return null;
  let x0 = s.w, y0 = s.h, x1 = -1, y1 = -1; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.out[y * s.w + x] !== 255) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const w = x1 - x0 + 3, h = y1 - y0 + 3, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d'), im = cx.createImageData(w, h), px = new Uint32Array(im.data.buffer), lut = g.lut;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = s.out[y * s.w + x]; if (c !== 255) px[(y - y0 + 1) * w + x - x0 + 1] = lut[c]; }
  cx.putImageData(im, 0, 0); pcache[a] = cv; return cv;
}
// the portrait scaled by a whole number to fit w × h (0 = no limit); bust: only the top part (small slots)
M.bossPortrait = function (k, w, h, o) {
  o = o || {}; const src = portraitCanvas(k); if (!src) return null;
  const sh = o.bust ? Math.round(src.height * o.bust) : src.height, f = Math.min(w ? w / src.width : 9, h ? h / sh : 9), s = f >= 1 ? Math.floor(f) : 1 / Math.ceil(1 / f);   // whole multiples up, whole fractions down (½, ⅓): pixels stay square
  const cv = document.createElement('canvas'); cv.width = Math.round(src.width * s); cv.height = Math.round(sh * s); const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, src.width, sh, 0, 0, cv.width, cv.height); return cv;
};
const purl = {};
// { src, w, h } for the DOM (tooltips, boards)
const pinfo = {};
M.bossPortraitInfo = function (k, w, h) { const key = k + '|' + w + '|' + h; if (pinfo[key] !== undefined) return pinfo[key]; const c = M.bossPortrait(k, w, h); return (pinfo[key] = c ? { src: c.toDataURL('image/png'), w: c.width, h: c.height } : null); };
// the head out of the portrait (the module says where: portraitHead() → [x, y, r] in the portrait's buffer), sized like the rest
const hcache = {};
M.bossHead = function (k, size) {
  const key = k + '|' + size; if (hcache[key] !== undefined) return hcache[key];
  const a = artOf(k); if (!a || !HAS_DOM) return (hcache[key] = null);
  const mt = PCD.meta(a) || {}, g = PCD.createEngine({ game: true, W: mt.W, H: mt.H }); g.load(a);
  const s = g.C.headShot ? g.C.headShot() : g.portrait(), hd = s && g.C.portraitHead && g.C.portraitHead(); if (!hd) return (hcache[key] = null);   // a module may draw its head shot in another pose than its portrait
  const r = Math.round(hd[2]), x0 = Math.round(hd[0] - r), y0 = Math.round(hd[1] - r), n = r * 2, lut = g.lut;
  const src = document.createElement('canvas'); src.width = n; src.height = n; const sx = src.getContext('2d'), im = sx.createImageData(n, n), px = new Uint32Array(im.data.buffer);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const X = x0 + x, Y = y0 + y; if (X < 0 || Y < 0 || X >= s.w || Y >= s.h) continue; const c = s.out[Y * s.w + X]; if (c !== 255) px[y * n + x] = lut[c]; }
  sx.putImageData(im, 0, 0);
  const f = size / n, sc = f >= 1 ? Math.floor(f) : 1 / Math.ceil(1 / f), cv = document.createElement('canvas'); cv.width = Math.round(n * sc); cv.height = Math.round(n * sc);
  const c2 = cv.getContext('2d'); c2.imageSmoothingEnabled = false; c2.drawImage(src, 0, 0, cv.width, cv.height); return (hcache[key] = cv);
};
// the map's boss node: the boss's own head; a boss not redrawn yet shows its own picture (a final boss: the top of its old
// titan, a small boss: its unit sprite) instead of the stand-in
const ncache = {};
M.bossNodeImg = function (run, n) {
  if (!n || !n.seen || n.type !== 'boss' || !HAS_DOM) return null;
  const k = typeof n.fb === 'string' ? n.fb : ((M.miniOf && M.miniOf(run, n)) || {}).k; if (!k) return null;
  if (ncache[k] !== undefined) return ncache[k];
  let c = M.bossHead(k, 140);
  if (!c && /^FB_/.test(k) && M.TITAN && M.TITAN.frame) { try { const F = M.TITAN.frame(k, 'idle', 0), w = F.bw || F.width, h = F.bh || F.height, g = F.getContext && F.getContext('2d'); if (g) { const d = g.getImageData(0, 0, w, h).data; let y0 = h, x0 = w, x1 = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { if (y < y0) y0 = y; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    const side = Math.min(h - y0, Math.round((x1 - x0) * 0.62)), cx = Math.round((x0 + x1) / 2), sc2 = Math.max(1, Math.floor(128 / side)); const t = document.createElement('canvas'); t.width = side; t.height = side; t.getContext('2d').putImageData(g.getImageData(Math.round(cx - side / 2), y0, side, side), 0, 0);   // (a px canvas reports its scaled size: copy its pixels, not drawImage)
    c = document.createElement('canvas'); c.width = side * sc2; c.height = side * sc2; const g2 = c.getContext('2d'); g2.imageSmoothingEnabled = false; g2.drawImage(t, 0, 0, c.width, c.height); } } catch (err) { c = null; } }
  if (!c && M.spriteCanvas && M.PX16 !== false) { try { c = M.spriteCanvas(k, 8); } catch (err) { c = null; } }
  return (ncache[k] = c || null);
};
M.bossPortraitURL = function (k, w, h, o) { const key = k + '|' + w + '|' + h + '|' + ((o && o.bust) || 0); if (purl[key] !== undefined) return purl[key]; const c = M.bossPortrait(k, w, h, o); return (purl[key] = c ? c.toDataURL('image/png') : null); };

// ───────── small boss in battle ─────────
const BP = M.Battle3 && M.Battle3.prototype;
if (BP) {
  const oSpawn = BP.spawnEnemy;
  BP.spawnEnemy = function (s) {
    const e = oSpawn.apply(this, arguments);
    const a = e && e.mbAi && artOf(s.type);
    if (a) { e.hd = Object.assign({}, e.hd, { key: a }); e.pxBig = 1; e.pxBoss = a; if (HAS_DOM) voices(a); }
    return e;
  };
  // a kit move starts charging: the module's own move, its charge cut to the game's so the release lands on the hit
  const oBegin = BP.bkBegin;
  if (oBegin) BP.bkBegin = function (e, id, P) {
    const r = oBegin.apply(this, arguments);
    const mv = e.pxBoss && !e.fb && ((MOVES[e.pxBoss] && MOVES[e.pxBoss][id]) || (modMoves(e.pxBoss).includes(id) ? id : null));   // the module names its moves after the kit's
    if (mv && e.casting && HAS_DOM) G.startAction(this, e, 'skill', { move: mv, wind: e.casting.until - e.casting.t0, dist: 60 });
    return r;
  };
  // the roar at half life (small bosses only; a final boss has its second-phase show)
  const oP2 = BP.bkPhase2;
  if (oP2) BP.bkPhase2 = function (e) {
    const r = oP2.apply(this, arguments);
    if (e.pxBoss && !e.fb && e.alive && HAS_DOM && !(e.bk && e.bk.dash)) { e.bk.next = Math.max(e.bk.next || 0, this.t + 1.0); G.startAction(this, e, 'skill', { move: 'roar', at: 'cast', dist: 60 }); }   // the next move waits out the roar
    return r;
  };
  // the charge across the field: the launch plays out, then a fast gallop with a lightning trail; at the far end it skids to a stop
  const oStep = BP.step;
  BP.step = function (dt) {
    const r = oStep.apply(this, arguments);
    for (const e of this.ents) {
      if (!e.pxBoss || !e.alive || !e.bk) continue;
      const dash = !!e.bk.dash;
      if (dash) {
        if (e._pa && e._pa.kind === 'skill' && e._pa.g.state === 'recover') G.stopAction(e);
        const Pz = M.P16 && M.P16.Pool && (this.p16 || (this.p16 = new M.P16.Pool()));
        if (Pz && dt > 0) for (let i = 0; i < 3; i++) Pz.add(1, e.x + (Math.random() - 0.5) * 60, e.y - Math.random() * 12, (Math.random() - 0.5) * 80, -40 - Math.random() * 90, 0.3 + Math.random() * 0.3, i ? 'cream' : (e.pxBoss === 'B_centaur' ? 'frost' : 'cream'), { sz: i ? 3 : 2 });
        if (e.pxBoss === 'B_centaur' && Math.random() < 0.35) this.fxp && this.fxp({ k: 'bkBolt', x: e.x, y: e.y - 30 - Math.random() * 60, life: 0.16, s: Math.random() });
      } else if (e._pxDash && modMoves(e.pxBoss).includes('charge')) G.startAction(this, e, 'skill', { move: 'charge', at: 'recover', dist: 60 });
      e._pxDash = dash;
    }
    return r;
  };
  // death: the module's own (kneel, collapse), where it stood; not the game's generic body tip-over (mc-knock.js)
  const oDie = M.kbDie;
  if (oDie) M.kbDie = function (b, e) { if (e && e.pxBoss && !e.fb) { b.shake = Math.max(b.shake || 0, 14); return; } return oDie.apply(this, arguments); };
  // a short jagged bolt left along the charge's path
  const oFx = M.drawFxPx;
  M.drawFxPx = function (ctx, f, T, b) {
    if (f.k === 'bkBolt') {
      const q = (T - f.t0) / f.life; if (q >= 1) return true; const A = 4;
      ctx.save(); ctx.globalAlpha = 1 - q * 0.6; let x = f.x, y = f.y;
      for (let i = 0; i < 7; i++) { const nx = x - 14 - ((f.s * 97 + i * 31) % 10), ny = y + (((f.s * 53 + i * 17) % 3) - 1) * 8; ctx.fillStyle = i < 2 ? '#ffffff' : '#86f5ff'; for (let k = 0; k <= 4; k++) ctx.fillRect(Math.round((x + (nx - x) * k / 4) / A) * A, Math.round((y + (ny - y) * k / 4) / A) * A, A, A); x = nx; y = ny; }
      ctx.restore(); return true;
    }
    return oFx ? oFx.apply(this, arguments) : false;
  };
}

// ───────── final boss in battle ─────────
// One engine per boss, driven by its state; drawn one step bigger than units (1 art pixel = 6 field pixels). The rise plays the
// module's climb out of the lava, each kit move its own charge (cut to the game's) → release on the hit, the second-phase show
// its transformation (heartbeat, hunch, roar with wings spread; drawn over the dimmed screen), death its agony and sinking.
const KF = 6, FMV = { meteor: 'meteor', meteor2: 'meteor2', dSlam: 'dSlam', poke: 'poke' }, NOSFX = { step: 1, hurt: 1 };
function fbEng(b, e, a) {
  const mt = PCD.meta(a) || {}, c = { b, e };
  const g = PCD.createEngine({ game: true, W: mt.W, H: mt.H, out: {
    sfx: (ev, x) => { const S = M.Sfx; if (NOSFX[ev] || !S || !S.charFx) return; try { S.charFx(ev, Object.assign({}, x, { pan: S.panX ? S.panX(e.x) : 0 })); } catch (err) { /* sound */ } },
    shake: (t, amp) => { if (c.b) c.b.shake = Math.max(c.b.shake || 0, amp * 5); } } });
  g.load(a); g.enter('idle'); voices(a);
  const cv = document.createElement('canvas'); cv.width = g.W; cv.height = g.H; const cx = cv.getContext('2d'), im = cx.createImageData(g.W, g.H);
  return { g, c, cv: M.asPx(cv, KF), cx, im, px: new Uint32Array(im.data.buffer), cur: 'idle', t: null, p2t: 0, hurt: -9 };
}
function fbDrive(b, e, f) {
  const A = e.ai || {}, g = f.g, T = b.t, P2 = b.p2 && b.p2.e === e ? b.p2 : null;
  let dt; if (P2) { dt = P2.t - f.p2t; f.p2t = P2.t; } else { f.p2t = 0; dt = f.t == null ? 0 : T - f.t; } f.t = T; dt = Math.max(0, Math.min(0.1, dt));
  const go = (cur, mv, st, skip) => { f.cur = cur; if (mv) g.move(mv); g.enter(st); if (skip > 0) g.skip(skip); };
  if ((e.bk && e.bk.rage) || A.phase === 2) g.move('hot1');
  if (A.st === 'dead' || !e.alive) { if (f.cur !== 'dead') go('dead', null, 'death', 0.3); }
  else if (A.st === 'rise') { if (f.cur !== 'rise') go('rise', 'rise', 'charge', Math.max(0, T - (A.t0 || T))); }
  else if (A.st === 'roar' || P2) { if (f.cur !== 'p2') go('p2', 'p2', 'charge', 0); }
  else if (e.casting && e.casting.bk) {
    if (f.cast !== e.casting) { f.cast = e.casting; const wind = e.casting.until - e.casting.t0, id = e.casting.bk.id, mvs = g.C.MOVES || []; g.move(mvs.includes(id) ? id : FMV[id] || 'poke'); /* the module names its moves after the kit's */ go('mv', null, 'charge', Math.max(0, g.dur[3] - wind) + Math.max(0, T - e.casting.t0)); }
  } else if (f.cur === 'mv' && g.state === 'charge') g.enter('cast');   // the game fired: the release frame is the hit
  else if (f.cur === 'idle' && e.kb != null && T - e.kb < 0.06 && T - f.hurt > 3) { f.hurt = T; go('hurt', null, 'hurt', 0); }
  if (f.cur !== 'idle' && f.cur !== 'dead' && g.done) go('idle', null, 'idle', 0);
  if (dt > 0) g.step(dt, 1);
}
function fbCanvas(f) {
  const g = f.g, fb = g.render(), lut = g.lut, px = f.px, n = g.W * g.H; px.fill(0);
  for (let i = 0; i < n; i++) { const v = fb[i]; if (v !== 255) px[i] = lut[v]; }
  f.cx.putImageData(f.im, 0, 0);
  const cv = f.cv, P = g.C.P; cv.cx = g.HX * KF; cv.footY = g.HY * KF; cv.focus = [(P.gx || 0) * KF, (P.gy || -40) * KF]; cv.S = 70 * KF; return cv;
}
if (BP && HAS_DOM) {
  const oSp2 = BP.spawnEnemy;
  BP.spawnEnemy = function (s) {
    const e = oSp2.apply(this, arguments), a = e && e.fb && artOf(s.type);
    if (a) { e._fg = fbEng(this, e, a); e._fgB = this; e.pxBoss = a; }
    return e;
  };
  // it stands deeper in its arena than the old picture (the head and horns stay clear of the top of the field): drawn SINK
  // field pixels lower, clipped at the arena's surface
  const SINK = 18 * KF, oFbT = BP.fbTick;
  if (oFbT) BP.fbTick = function (e) { const r = oFbT.apply(this, arguments); if (e && e._fg) { e.drawDY = (e.drawDY || 0) + (e._fg.g.C.SINK != null ? e._fg.g.C.SINK * KF : SINK); e.clipY = -e.drawDY + 4; } return r; };
  const P16 = M.P16, oEnt = P16 && P16.entImg;
  if (oEnt) P16.entImg = function (e, T) {
    const f = e && e._fg; if (!f || !e._fgB) return oEnt.apply(this, arguments);
    fbDrive(e._fgB, e, f); const c = fbCanvas(f); e._fr = c; return c;
  };
  // the second-phase show dims the screen: the boss is drawn again over the dim, so its transformation is seen
  const GP = M.Game && M.Game.prototype, oTick = GP && GP.tick;
  if (oTick) GP.tick = function () {
    const r = oTick.apply(this, arguments), b = this.battle, P = b && b.p2, e = P && P.e;
    if (!e || !e._fg || !e._fr || this.screen !== 'battle' || !this.camField) return r;
    const fc = this.ui && this.ui.cv && this.ui.cv('fx'); if (!fc) return r;
    const g = fc.getContext('2d'), z = (this.bcam && this.bcam.z) || 1, p = this.camField(e.x + (e.drawDX || 0), e.y + (e.drawDY || 0)), img = e._fr, face = M.faceOf ? M.faceOf(e) : -1;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.globalAlpha = Math.min(1, P.t / 0.2) * Math.min(1, Math.max(0, (2.9 - P.t) / 0.35));
    g.translate(Math.round(p.x), Math.round(p.y + 180)); g.scale(z * (face < 0 ? -1 : 1), z); if (e.clipY != null) { g.beginPath(); g.rect(-4000, -4000, 8000, 4000 + e.clipY); g.clip(); } g.drawImage(img, -img.cx, -img.footY); g.restore();
    return r;
  };
}

// ───────── portraits where the map shows a boss ─────────
// the boss node's tooltip, the stele's tooltip (each redrawn boss of that world), the board of bosses still ahead, the fight's
// announcement (slides in beside 首领战), the story shows (mc-story.js) and the defeat board (mc-bosskit.js)
const GM = M.Game && M.Game.prototype;
if (GM && HAS_DOM) {
  const bossKeyOf = (run, n) => { if (!n || n.type !== 'boss') return null; if (typeof n.fb === 'string') return n.fb; const mb = M.miniOf && M.miniOf(run, n); return mb ? mb.k : null; };
  const oWM = GM.worldMove;
  if (oWM) GM.worldMove = function () {
    const r = oWM.apply(this, arguments), n = M._tipNode, run = this.run;
    if (n && run && this.tipData && n.seen && !(run.region && run.region.tut)) { const k = bossKeyOf(run, n), pi = k && artOf(k) && M.bossPortraitInfo(k, 420, 240); if (pi && !this.tipData.ports) this.tipData = Object.assign({}, this.tipData, { ports: [pi] }); }
    return r;
  };
  const oST = GM.steleTip;
  if (oST) GM.steleTip = function (k) {
    const t = oST.apply(this, arguments); if (!t) return t;
    const segs = (M.segsOf && M.segsOf(k)) || [], sc = M.sceneOf && this.meta ? M.sceneOf(this.meta, k) : null;
    const ports = segs.slice(sc ? sc.start || 0 : 0).map(s => s.fb || (s.mb && s.mb.k)).filter(b => b && artOf(b)).map(b => M.bossPortraitInfo(b, 300, 170)).filter(Boolean);
    if (ports.length) t.ports = ports; return t;
  };
  const oView = GM.view;
  GM.view = function () {
    const v = oView.apply(this, arguments), tip = this.tipData;
    if (v.tip) { const ps = tip && tip.ports; v.tip.hasPort = !!(ps && ps.length); v.tip.ports = ps || []; }
    if (v.bkp && v.bkp.rows) v.bkp.rows.forEach(br => { const pi = br && br.k && artOf(br.k) && M.bossPortraitInfo(br.k, v.bkp.w - 40, 110); br.hasImg = !!pi; br.img = pi ? pi.src : ''; br.iw = pi ? pi.w : 0; br.ih = pi ? pi.h : 0; });
    return v;
  };
  const oBB = GM.beginBattle;
  GM.beginBattle = function (n) {
    const r = oBB.apply(this, arguments), B = this.introBanner, cfg = this.cfg;
    if (B && n && n.type === 'boss' && cfg) { const b = cfg.list && cfg.list.find(x => x.boss), k = cfg.fb || (b && b.type); if (k && artOf(k)) B.bk = k; }
    return r;
  };
  const oDB = M.drawBanner;
  if (oDB) M.drawBanner = function (ctx, b) {
    const r = oDB.apply(this, arguments);
    if (b && b.kind === 'intro' && b.bk) { const img = M.bossPortrait(b.bk, 720, 520); if (img) {
      const t = b.t, q = Math.min(1, t / 0.22), out = Math.max(0, Math.min(1, (b.life - t) / 0.35)), x = Math.round(1560 + (1 - q * q) * 520 - img.width / 2), y = Math.round((b.y || 520) + 150 - img.height);
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = out; ctx.drawImage(img, x, y);
      if (t < 0.3) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = out * (1 - t / 0.3) * 0.8; ctx.drawImage(img, x, y); }   // a white-hot flash as it lands
      ctx.restore(); } }
    return r;
  };
}
})();
