// ==== mc-pxtown-look.js ====
(function () {
// The pixel town's streets (mc-townlook.js asks, only with the switch on): the townsfolk's houses on the building kit in
// the style of the city's 发展方向 (baked once each — there are dozens — they still have lit windows, smoke and trim);
// the things in the streets as small pixel pieces per direction (lamps, stalls, braziers, crystals, neon …, drawn live
// at ten frames a second); and the skyline, the long wall and the ground snapped onto the art grid (2 world units),
// their colours stepped on hard bands with a lit rim, instead of smooth shapes.
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.K || !PT.P) return;
const H = PT.H, K = PT.K, P = PT.P, cl = H.cl;
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// direction → the kit's style and a house's look
const DIR = { none: ['medieval', {}], city: ['medieval', { roofM: ['tile', 5] }], fort: ['medieval', { roof: 'flat' }], market: ['cartoon', {}], industry: ['steam', {}], army: ['medieval', { roofM: ['linen', 7] }],
  pastoral: ['nature', {}], holy: ['fantasy', {}], arcane: ['magic', {}], future: ['scifi', {}], fun: ['cartoon', { roofM: ['pink', 7] }] };
const HC = {};
// a house: w, h its footprint in world units at street scale 1 (as mc-townlook.js measures it); f: the fill slot
PT.housePic = function (dir, v, w, h, f, m) {
  if (!PT.on()) return null; const d = DIR[dir] || DIR.none, hq = Math.round(h / 10) * 10, key = '_h:' + (dir || 'none') + ':' + (v % 6) + ':' + w + ':' + hq;
  if (!PT.ART[key]) PT.spec(key, Object.assign({ style: d[0], house: 1, kind: 'trade', foot: { w, h: hq }, mw: 0.62 + (v % 3) * 0.08, wing: v % 2 ? 'l' : 'r', chimney: v % 3 !== 1,
    sig(S, sc, G, B) { if (B.st >= 1 && v % 2) K.pot(S, B.door.x + B.door.w + 2, B.gy); if (v % 3 === 0) K.crate(S, B.side[0], B.gy); if (v % 4 === 1) { S.lay('back'); S.beg(); S.line(B.side[0], B.gy - 10, B.side[1], B.gy - 9, 'ink', 3); for (let x = B.side[0] + 1; x < B.side[1]; x += 3) S.rect(x, B.gy - 9, 2, 3, ['linen', 'tile', 'crimson'][x % 3], 7); S.end(); } } }, d[1]));
  const st = dir && dir !== 'none' ? Math.min(PT.stageOf(m), v % 4 === 0 ? 2 : 1) : 0, id = PT.ensure(key, f.sc, f.dk || 0, st);
  if (HC[id]) return HC[id]; const G = PT.dims(id), cv = X.snapshot(id, 3 + (v % 5)); if (!cv) return null;
  cv.k = 2 / f.sc; cv.ox = G.cx * cv.k; cv.oy = G.gy * cv.k; return (HC[id] = cv);
};
// the things in the streets: (dir, i) → a small pixel piece; drawn live, throttled like the buildings
const PROP = {
  none: [(S, sc, G) => { K.crate(S, G.cx - 4, G.gy); K.crate(S, G.cx + 1, G.gy); K.crate(S, G.cx - 2, G.gy - 5); }, (S, sc, G) => { K.barrel(S, G.cx - 5, G.gy); K.barrel(S, G.cx, G.gy); }],
  city: [(S, sc, G) => { const h = Math.round(24 * G.k); S.lay('mid'); S.beg(); S.vl(G.cx, G.gy - h, h, 'iron', 6); S.hl(G.cx - 1, G.gy - 1, 3, 'iron', 5); S.hl(G.cx, G.gy - h, 3, 'iron', 7); S.end(); K.lantern(S, sc, G.cx + 2, G.gy - h + 2); },
    (S, sc, G) => { S.lay('mid'); S.beg(); S.box(G.cx - 6, G.gy - 4, 12, 2, 'wood', 6, { top: 1 }); S.box(G.cx - 6, G.gy - 8, 12, 2, 'wood', 5); S.vl(G.cx - 5, G.gy - 2, 2, 'iron', 4); S.vl(G.cx + 4, G.gy - 2, 2, 'iron', 4); S.end(); }],
  fort: [(S, sc, G) => K.flag(S, G, G.cx, G.gy, Math.round(22 * G.k), 'crimson'), (S, sc, G) => P.brazier(S, sc, G, G.cx, G.gy)],
  market: [(S, sc, G) => P.awningStall(S, G.cx - 5, G.gy, 10, ['red', 'tile', 'gold'][G.v % 3]), (S, sc, G) => { const h = Math.round(20 * G.k); S.lay('mid'); S.beg(); S.vl(G.cx, G.gy - h, h, 'wood', 5); S.hl(G.cx - 5, G.gy - h, 11, 'wood', 6); S.end(); [G.cx - 4, G.cx + 4].forEach(x => K.lantern(S, sc, x, G.gy - h + 2, { c: '#ff9a50' })); }],
  industry: [(S, sc, G) => { S.lay('mid'); S.beg(); S.hcyl(G.cx - 8, G.gy - 8, 16, 3, 'iron', 6, { rim: 1.5 }); S.vl(G.cx - 6, G.gy - 5, 5, 'iron', 5); S.vl(G.cx + 5, G.gy - 5, 5, 'iron', 5); S.ell(G.cx + 0.5, G.gy - 10, 2, 2, 'red', 7); S.end(); sc.emit({ k: 'steam', x: G.cx, y: G.gy - 12, rate: 1, sp: 6, ang: 0, spread: 0.5, life: 1.6 }); },
    (S, sc, G) => { K.crate(S, G.cx - 6, G.gy); K.crate(S, G.cx, G.gy); S.lay('back'); S.beg(); H.ICON.gear(S, G.cx - 2, G.gy - 8); S.end(); }],
  army: [(S, sc, G) => P.tent(S, G.cx - 6, G.gy, 12, Math.round(9 * G.k), G.v % 2 ? 'sand' : 'linen'), (S, sc, G) => P.rack(S, G.cx, G.gy)],
  pastoral: [(S, sc, G) => P.tree(S, G.cx, G.gy, Math.round(6 * G.k), G.v % 2 ? 'leaf' : 'moss'), (S, sc, G) => { S.lay('mid'); S.beg(); S.ell(G.cx + 0.5, G.gy - 3, 6, 4, 'sand', 7, { dome: 1 }); for (let x = -5; x < 6; x += 2) S.px(G.cx + x, G.gy - 4 - (x % 3 ? 0 : 1), 'sand', 9); S.end(); }],
  holy: [(S, sc, G) => { S.lay('mid'); S.beg(); S.box(G.cx - 3, G.gy - 9, 7, 9, 'bone', 8); S.rect(G.cx - 1, G.gy - 6, 3, 5, 'night', 2); S.poly([[G.cx - 4, G.gy - 9], [G.cx + 0.5, G.gy - 13], [G.cx + 5, G.gy - 9]], 'gold', 7); S.end(); const li = sc.light({ x: G.cx, y: G.gy - 4, z: 6, r: 12, i: 0.8, c: '#ffd070', fl: 'candle', tint: 0.5 }); S.beg(); S.px(G.cx, G.gy - 3, 'lamp', 11, { e: li + 1 }); S.end(); },
    (S, sc, G) => P.statue(S, G.cx, G.gy, Math.round(14 * G.k), 'bone')],
  arcane: [(S, sc, G) => { P.crystal(S, sc, G, G.cx, G.gy - 3 - Math.round(3 * G.k), Math.round(8 * G.k)); P.orbs(G, G.cx, G.gy - 6, 5, 2); }, (S, sc, G) => { const li = sc.light({ x: G.cx, y: G.gy - 6, z: 6, r: 14, i: 0.7, c: '#b89cff', fl: 'pulse', amp: 0.3, sp: 1.3, tint: 0.5 }); S.lay('mid'); S.beg(); S.poly([[G.cx - 3, G.gy], [G.cx - 2, G.gy - 11], [G.cx + 3, G.gy - 12], [G.cx + 4, G.gy]], 'stone', 5); S.vl(G.cx, G.gy - 9, 5, 'arcane', 10, { e: li + 1 }); S.hl(G.cx - 1, G.gy - 7, 3, 'arcane', 9, { e: li + 1 }); S.end(); }],
  future: [(S, sc, G) => { const h = Math.round(22 * G.k), li = sc.light({ x: G.cx, y: G.gy - h, z: 8, r: 16, i: 0.8, c: G.v % 2 ? '#ff5ad0' : '#4af0ff', fl: 'buzz', ph: G.v, tint: 0.5 }); S.lay('mid'); S.beg(); S.vl(G.cx, G.gy - h, h, 'scifi', 6); S.box(G.cx - 5, G.gy - h - 5, 11, 6, 'scifi', 3); S.rect(G.cx - 4, G.gy - h - 4, 9, 4, G.v % 2 ? 'pink' : 'teal', 10, { e: li + 1 }); S.end(); },
    (S, sc, G) => { const h = Math.round(20 * G.k); S.lay('mid'); S.beg(); S.vl(G.cx, G.gy - h, h, 'iron', 7); S.hl(G.cx - 2, G.gy - h + 4, 5, 'iron', 6); S.end(); G.beacon = { x: G.cx, y: G.gy - h - 1, li: sc.light({ x: G.cx, y: G.gy - h - 1, z: 8, r: 12, i: 0.1, c: '#ff4040', tint: 0.4 }) }; }],
  fun: [(S, sc, G) => { G.an.push((D, t) => { [['red', -3, 0], ['gold', 2, -2], ['teal', 0, -5], ['pink', 4, 2]].forEach(([m, dx, dy], i) => { const b = Math.round(Math.sin(t * 2 + i + G.v) * 1.2), x = G.cx + dx, y = G.gy - Math.round(18 * G.k) + dy + b; D.lay('mid'); D.line(G.cx, G.gy - 1, x, y + 2, 'ink', 3); D.ell(x + 0.5, y, 2, 2.4, m, 8, { dome: 1 }); D.px(x - 1, y - 1, m, 11); }); }); },
    (S, sc, G) => { S.lay('mid'); S.beg(); S.rect(G.cx - 5, G.gy - 9, 10, 9, 'linen', 8); for (let x = -5; x < 5; x += 2) S.vl(G.cx + x, G.gy - 9, 9, 'red', 7); S.poly([[G.cx - 6, G.gy - 9], [G.cx + 0.5, G.gy - 14], [G.cx + 6, G.gy - 9]], 'pink', 7); S.end(); K.flag(S, G, G.cx, G.gy - 14, 5, 'gold'); }],
};
PT.PROP = PROP;
PT.prop = function (ctx, dir, i, x, y, sc, dk, seed, t, lights) {
  if (!PT.on()) return false; const list = PROP[dir] || PROP.none, fn = list[i % list.length], key = '_p:' + (dir || 'none') + ':' + (i % list.length) + ':' + (seed % 3);
  if (!PT.ART[key]) PT.ART[key] = { foot: { w: 40, h: 60 }, kind: 'trade', col: '#ffd070', mat: 'wood',
    paint(S, sc2, G) { G.flags = []; G.signs = []; G.workers = []; G.an = []; G.P = { kind: 'trade' }; G.k = G.s / 0.84; G.v = seed % 3; fn(S, sc2, G); }, anim: K.anim };
  const id = PT.ensure(key, sc, dk || 0, 0), G = PT.dims(id), X0 = x - G.cx * 2, Y0 = y - G.gy * 2, sid = 'twp:' + key + ':' + Math.round(x), sl = X.slots[sid];
  if (sl && sl.key === id && sl.cv && t >= sl.lr && t - sl.lr < PT.EVERY * 1.5) { const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = (M._g && M._g.bv && M._g.bv.z || 0.6) < 0.9; ctx.drawImage(sl.cv, X0, Y0, G.W * 2, G.H * 2); ctx.imageSmoothingEnabled = sm; }
  else X.draw(ctx, X0, Y0, id, t, {}, sid, (M._g && M._g.bv && M._g.bv.z) || 0.6);
  return true;
};
// skyline / wall / ground: snap a smooth world-unit picture onto the 2-unit art grid, colours onto the look's ramps
// (each colour plus a lit and a shaded step), and light the top edge of every silhouette by one step
const hex = (h) => { h = String(h); const n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
PT.pixelize = function (c, cols) {
  if (!c || typeof document === 'undefined') return c; const W = c.width, Hh = c.height, w = Math.ceil(W / 2), h = Math.ceil(Hh / 2); if (!w || !h) return c;
  const src = c.getContext('2d').getImageData(0, 0, W, Hh).data, pal = []; (cols || []).forEach(col => { if (!col) return; const s = M.shade ? M.shade : (a) => a; [-0.22, 0, 0.16].forEach(k => pal.push(hex(k ? s(col, k) : col))); });
  const out = document.createElement('canvas'); out.width = W; out.height = Hh; const ox = out.getContext('2d'), img = ox.createImageData(w, h), d = img.data;
  const at = (x, y) => { const xx = Math.min(W - 1, x * 2 + 1), yy = Math.min(Hh - 1, y * 2 + 1), i = (yy * W + xx) * 4; return src[i + 3] > 110 ? i : -1; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = at(x, y); if (i < 0) continue; let r = src[i], g = src[i + 1], b = src[i + 2];
    if (pal.length) { let best = 0, bd = 1e9; for (let k = 0; k < pal.length; k++) { const p = pal[k], dd = (p[0] - r) ** 2 * 0.3 + (p[1] - g) ** 2 * 0.59 + (p[2] - b) ** 2 * 0.11; if (dd < bd) { bd = dd; best = k; } } let k = best; if (y > 0 && at(x, y - 1) < 0 && k % 3 < 2) k++; [r, g, b] = pal[k]; }
    const o = (y * w + x) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255; }
  const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; tmp.getContext('2d').putImageData(img, 0, 0); ox.imageSmoothingEnabled = false; ox.drawImage(tmp, 0, 0, w * 2, h * 2);
  Object.keys(c).forEach(k => { out[k] = c[k]; }); return out;
};
})();
