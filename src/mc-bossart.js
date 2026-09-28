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
const artOf = (k) => { const a = MINI[k] || FINAL[k]; return a && PCD.has(a) ? a : null; };
M.BOSSART = { MINI, FINAL, artOf };

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
  const sh = o.bust ? Math.round(src.height * o.bust) : src.height, s = Math.max(1, Math.floor(Math.min(w ? w / src.width : 9, h ? h / sh : 9)));
  const cv = document.createElement('canvas'); cv.width = src.width * s; cv.height = sh * s; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, src.width, sh, 0, 0, src.width * s, sh * s); return cv;
};
const purl = {};
M.bossPortraitURL = function (k, w, h, o) { const key = k + '|' + w + '|' + h + '|' + ((o && o.bust) || 0); if (purl[key] !== undefined) return purl[key]; const c = M.bossPortrait(k, w, h, o); return (purl[key] = c ? c.toDataURL('image/png') : null); };

// ───────── small boss in battle ─────────
const BP = M.Battle3 && M.Battle3.prototype;
if (BP) {
  const oSpawn = BP.spawnEnemy;
  BP.spawnEnemy = function (s) {
    const e = oSpawn.apply(this, arguments);
    const a = e && e.mbAi && MINI[s.type] && artOf(s.type);
    if (a) { e.hd = Object.assign({}, e.hd, { key: a }); e.pxBig = 1; e.pxBoss = a; }
    return e;
  };
  // a kit move starts charging: the module's own move, its charge cut to the game's so the release lands on the hit
  const oBegin = BP.bkBegin;
  if (oBegin) BP.bkBegin = function (e, id, P) {
    const r = oBegin.apply(this, arguments);
    const mv = e.pxBoss && MOVES[e.pxBoss] && MOVES[e.pxBoss][id];
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
        if (Pz && dt > 0) for (let i = 0; i < 3; i++) Pz.add(1, e.x + (Math.random() - 0.5) * 60, e.y - Math.random() * 12, (Math.random() - 0.5) * 80, -40 - Math.random() * 90, 0.3 + Math.random() * 0.3, i ? 'cream' : 'frost', { sz: i ? 3 : 2 });
        if (Math.random() < 0.35) this.fxp && this.fxp({ k: 'bkBolt', x: e.x, y: e.y - 30 - Math.random() * 60, life: 0.16, s: Math.random() });
      } else if (e._pxDash) G.startAction(this, e, 'skill', { move: 'charge', at: 'recover', dist: 60 });
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
})();
