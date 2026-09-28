// ==== mc-pxtown-w.js ====
(function () {
// The pixel town's wonders (far behind the last street, 1.4 times their size, in the evening haze; mc-wonders.js places
// them): each its own silhouette, grown by stage (more tiers, bronze and gold, more light), its own show and sound.
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.H) return;
const { TX, n1 } = X, H = PT.H, { fireSim, drawFire, flame, plinth, win, door, cl, steps } = H, once = PT.once, SN = PT.SND;
const horn = SN.horn, chime = SN.chime;

// 亚历山大灯塔: three stacked tiers of pale stone (square, octagonal, round), a fire bowl at the top with a bronze mirror,
// the beam sweeping the night. 0: two tiers, the fire on the second. 1: the round top tier and the mirror. 2: a gold statue
PT.ART.lighthouse = {
  mat: 'bone', icon: 'sun', padt: 30,
  paint(S, sc, G) {
    const { cx, gy, w, h, st } = G, t1 = gy - Math.round(h * 0.42), t2 = gy - Math.round(h * 0.7), t3 = gy - Math.round(h * 0.84);
    plinth(S, G, 'stone'); S.lay('wall');
    const w1 = Math.round(w * 0.78), w2 = Math.round(w * 0.5), w3 = Math.round(w * 0.32);
    S.beg(); TX.ashlar(S, cx - (w1 >> 1), t1, w1, gy - t1, 'bone', 7, { bh: 6 }); S.box(cx - (w1 >> 1) - 2, t1 - 2, w1 + 4, 3, 'bone', 8, { top: 1 }); S.end();
    for (let y = t1 + 7; y < gy - 18; y += 15) [cx - Math.round(w1 * 0.28), cx + Math.round(w1 * 0.28) - 2].forEach(x => win(S, sc, x, y, 3, 6, { i: 0.4, sill: false, fm: 'bone', ft: 4 }));
    door(S, cx - 4, gy - 14, 8, 14);
    S.beg(); for (let x = cx - (w1 >> 1) - 2; x < cx + (w1 >> 1) + 2; x += 4) S.box(x, t1 - 5, 2, 3, 'bone', 8); S.end(); S.beg(); S.hl(cx - (w1 >> 1), t1 + 3, w1, 'gold', 6); S.end();
    const top2 = st >= 1 ? t2 : t2, w2b = w2; S.beg(); for (let y = top2; y < t1 - 2; y++) { S.rect(cx - (w2b >> 1), y, 3, 1, 'bone', 6, { n: [-0.6, 0] }); S.rect(cx - (w2b >> 1) + 3, y, w2b - 6, 1, 'bone', 7.5); S.rect(cx + (w2b >> 1) - 3, y, 3, 1, 'bone', 5, { n: [0.6, 0] }); } S.noise(cx - (w2b >> 1), top2, w2b, t1 - top2, 1, 3, 5); S.box(cx - (w2b >> 1) - 2, top2 - 2, w2b + 4, 3, 'bone', 8, { top: 1 }); S.end();
    for (let y = top2 + 8; y < t1 - 8; y += 16) win(S, sc, cx - 1, y, 3, 6, { i: 0.45, sill: false, fm: 'bone', ft: 4 });
    let fy = top2 - 3;
    if (st >= 1) { S.beg(); S.cyl(cx - (w3 >> 1), t3, w3, top2 - t3 - 2, 'bone', 7, { rim: 2 }); S.box(cx - (w3 >> 1) - 2, t3 - 2, w3 + 4, 3, 'bone', 8, { top: 1 }); S.end(); fy = t3 - 3; }
    // the fire bowl and (1+) the bronze mirror behind it
    G.lf = sc.light({ x: cx, y: fy - 5, z: 14, r: 44, i: 1.5, c: '#ffb050', fl: 'fire', tint: 0.6 });
    S.lay('mid'); S.beg(); S.poly([[cx - 6, fy - 3], [cx + 7, fy - 3], [cx + 4, fy + 1], [cx - 3, fy + 1]], 'brass', 7); S.hl(cx - 6, fy - 3, 13, 'brass', 10); S.end(); G.fire = { x: cx, y: fy - 4 };
    if (st >= 1) { S.lay('back'); S.beg(); S.ell(cx + 0.5, fy - 9, 6, 7, 'brass', 8, { dome: 1 }); S.ell(cx + 0.5, fy - 9, 4, 5, 'gold', 9); S.end(); }
    if (st >= 2) { const sy = fy - 18; S.lay('back'); S.beg(); S.rect(cx - 1, sy - 12, 3, 10, 'gold', 7); S.px(cx, sy - 14, 'gold', 9); S.rect(cx - 1, sy - 13, 3, 2, 'gold', 8); S.line(cx + 1, sy - 11, cx + 4, sy - 15, 'gold', 8); S.vl(cx + 4, sy - 18, 8, 'gold', 9); S.hl(cx + 3, sy - 18, 3, 'gold', 10); S.end(); }
    G.lamp = { x: cx, y: fy - 6 };
  },
  anim(D, t, s, o, G) {
    const st = s.st, f = fireSim(st, 13, 13, t, 0.95 + (st.roar || 0) * 0.4, 0.4); D.lay('mid'); drawFire(D, f, 13, 13, G.fire.x - 6, G.fire.y - 12);
    st.roar = Math.max(0, (st.roar || 0) - 0.015);
  },
  show(s, o, G) {
    const q = o.show.q; if (once(s, o, 'i', 0)) { s.st.roar = 1.5; s.flash(G.lf, 2.5); s.burst('ember', G.fire.x, G.fire.y - 4, 16 + q * 6, { sp: 30, ang: 0, spread: 1.2, life: 1.8, w: 8 }); }
  },
  beam: true,
  sfx: (d, q) => { horn(d, 1.4); [784, 988, 1175].forEach((f, i) => chime(f, d + 0.35 + i * 0.14, 0.05)); },
  col: '#ffd06a',
};
})();
