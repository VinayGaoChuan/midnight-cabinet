// ==== mc-pxtown-s.js ====
(function () {
// The pixel town's boss statues (mc-bossbld.js): the boss's own pixel figure (M.statueGrid, its battle frame turned into
// ramp tones) at the town's art size — one art px = 2 world units like everything else, no more 3× blown-up pixels —
// on a plinth that grows by stage: 0 a stone block, 1 steps, braziers and a plaque with the boss's banner either side,
// 2 the figure turns gold, a halo behind its head, lanterns and a flag. Stone statues get a cold light, bronze a warm one.
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.K || !PT.P) return;
const H = PT.H, K = PT.K, P = PT.P;
function statue(key) {
  const Bd = M.BUILDINGS[key]; if (!Bd || !Bd.statue) return null; const kind = K.kindOf(key);
  return (PT.ART[key] = { statue: 1, kind, col: Bd.mat === 'bronze' ? '#ffd890' : '#dfe8ff', mat: 'mstone', icon: 'skull',
    paint(S, sc, G) {
      const st = G.st, gy = G.gy, cx = G.cx, w = G.w, h = G.h, bronze = Bd.mat === 'bronze', mat = st === 2 ? 'gold' : bronze ? 'brass' : 'stone';
      G.flags = []; G.signs = []; G.workers = []; G.an = []; G.P = { kind, look: 'keeper' };
      H.plinth(S, G, 'stone');
      const pw = Math.round(w * (0.5 + st * 0.12)), ph = Math.round(h * (0.12 + st * 0.04));
      S.lay('wall'); K.wall(S, cx - (pw >> 1), gy - ph, pw, ph, ['mstone', 6, 'ashlar']); S.beg(); S.box(cx - (pw >> 1) - 1, gy - ph - 2, pw + 2, 2, st === 2 ? 'gold' : 'mstone', st === 2 ? 8 : 7, { top: 1 }); S.end();
      if (st >= 1) { S.beg(); S.box(cx - (pw >> 1) - 4, gy - 3, pw + 8, 3, 'stone', 6, { top: 1 }); S.end(); S.beg(); S.box(cx - 4, gy - ph + 2, 9, 5, st === 2 ? 'gold' : 'brass', 6); H.ICON.skull(S, cx, gy - ph + 4); S.end(); }
      const top = gy - ph - 2, g = M.statueGrid(Bd.statue, Math.round(w * 0.8), Math.round(h - ph - 14));
      sc.light({ x: cx, y: top - h * 0.8, z: 40, r: h * 1.3, i: 0.95, c: st === 2 ? '#ffe8a0' : bronze ? '#ffd890' : '#dfe8ff', tint: 0.35 });
      if (g) { const x0 = Math.round(cx - g.w / 2), y0 = top - g.h;
        if (st === 2) { const lh = sc.light({ x: cx, y: y0 + 4, z: 4, r: 24, i: 0.9, c: '#ffe070', fl: 'pulse', amp: 0.15, sp: 1.2, tint: 0.5 }); S.lay('back'); S.beg(); S.ell(cx + 0.5, y0 + 4, Math.max(5, g.w * 0.35), Math.max(5, g.w * 0.35), 'gold', 9, { ring: 1, e: lh + 1 }); S.end(); }
        S.lay('mid'); S.beg(); for (let p = 0; p < g.w * g.h; p++) { const t = g.tone[p]; if (t >= 0) S.px(x0 + p % g.w, y0 + ((p / g.w) | 0), mat, t + (st === 2 ? 1 : 0)); } S.end(); G.fx = { x: cx, y: y0 + 2 }; }
      else G.fx = { x: cx, y: top - 10 };
      if (st >= 1) { P.brazier(S, sc, G, cx - (pw >> 1) - 3, gy - 3); P.brazier(S, sc, G, cx + (pw >> 1) + 3, gy - 3); if (G.fx) { const f = G.fx; G.fx = f; } K.bannerV(S, G.L - 2, gy - ph - 14, 12, 'crimson', 'skull'); K.bannerV(S, G.R - 2, gy - ph - 14, 12, 'crimson', 'skull'); }
      if (st === 2) { K.lantern(S, sc, G.L + 3, gy - 8); K.lantern(S, sc, G.R - 3, gy - 8); K.flag(S, G, G.R + 4, gy, 22, 'gold'); }
      G.pillar = 0; const Gp = G; sc.shaft({ x: G.fx.x, y0: 0, y1: G.fx.y, w0: 2, w1: 6, i: 0.9, haze: 0.8, c: '#fff0c0', f: () => Gp.pillar });
    },
    anim: K.anim, show: (s, o, G) => { K.SHOW.holy(s, o, G, o.show.q); if (kind !== 'holy') K.SHOW[kind](s, o, G, o.show.q); }, sfx: (d, q) => { K.SFX[kind](d, q); PT.SND.drum(d, 1.2); } });
}
PT.auto = (key) => PT.ART[key] || statue(key);
})();
