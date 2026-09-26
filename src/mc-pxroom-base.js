// ==== mc-pxroom-base.js ====
(function () {
// The main base on the surface (user ruling 2026-09-25: it must be the finest piece in the game). A night storehouse
// hall — brick lower storey with barn doors, half-timbered upper storey with lit windows, red tile roofs, dormers,
// chimneys — around a stone gate tower whose pointed arch is the portal, with a midnight clock on top. Drawn by the pixel
// room engine (mc-pxroom.js) on a see-through 380×210 canvas: world x DOOR_X−380…DOOR_X+380, y −340…80 (so the shaft
// down to the underground is part of it). o: po (portal open 0…1), hp (portal durability 0…1), hovDoor, hovWing, par.
const M = window.MC, X = M.PXR; if (!X) return;
const { TX, worker, stroll, n1 } = X;
const AW = 380, AH = 210, GY = 166, CX = 190;       // canvas; ground top (plaza); centre = the portal
const R = Math.random, clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const steps = (t, per) => ((t % per) + per) % per / per;

// portal opening: pointed arch, x 166…214, apex y 62, springing y 88, threshold y 156
const AX0 = 166, AX1 = 214, AAP = 62, ASP = 88, ATH = 156;
const inArch = (x, y, pad) => { pad = pad || 0; const hx = (AX1 - AX0) / 2 + pad, dx = Math.abs(x + 0.5 - CX); if (dx > hx || y > ATH || y < AAP - pad) return false; if (y >= ASP) return true;
  // two circle arcs meeting at the apex (a lancet)
  const r = (AX1 - AX0) * 0.95 + pad, cxL = CX - hx + r, cxR = CX + hx - r, cy = ASP; const dL = Math.hypot(x + 0.5 - cxL, y + 0.5 - cy), dR = Math.hypot(x + 0.5 - cxR, y + 0.5 - cy);
  return (x + 0.5 <= CX ? dL <= r : dR <= r) && y + 0.5 >= AAP - pad; };

// two different wings: the warehouse (left, loading bay and hoist) and the counting house (right, oriel, balcony, shop sign)
const WIN = [[36, 82], [110, 82], [228, 82], [322, 82]];   // plain upper windows (x, top y), 16×18
const LANT = [[34, 80], [146, 78], [234, 78], [346, 80]];  // eave lanterns (x, hook y)
const LI = { portal: 0, clock: 1, win: 2, oriel: 6, arch: 7, brzL: 8, brzR: 9, bay: 10, moon: 11, dormer: 12, door: 13, lant: 14, alarm: 18, postL: 19, postR: 20 };
const PLZ0 = GY, PLZ1 = 177;                                 // plaza rows; the shaft starts under it

X.def('_mainbase', {
  size: [AW, AH], fy: GY, clear: 1, noFrame: 1, noFloor: 1, amb: [0.34, 0.3],
  paint(S, sc) {
    const r = S.r;
    // ── lights ──
    sc.light({ x: CX, y: 112, z: 24, r: 175, i: 0.95, c: '#5fd0c0', fl: 'pulse', amp: 0.1, sp: 1.6, tint: 0.55 });
    sc.light({ x: CX, y: 36, z: 12, r: 44, i: 0.55, c: '#fff0c0', tint: 0.3 });
    WIN.forEach(([x, y], i) => sc.light({ x: x + 8, y: y + 9, z: 12, r: 46, i: 0.62, c: '#ffb060', fl: 'candle', ph: i * 1.7, tint: 0.5 }));
    sc.light({ x: 281, y: 92, z: 18, r: 52, i: 0.75, c: '#ffc070', fl: 'candle', ph: 7, tint: 0.5 });          // oriel
    sc.light({ x: 262, y: 128, z: 12, r: 50, i: 0.6, c: '#ffb060', fl: 'candle', ph: 8, tint: 0.5 });          // arched windows
    sc.light({ x: 141, y: 138, z: 22, r: 74, i: 1.05, c: '#ff9a40', fl: 'fire', tint: 0.55 });
    sc.light({ x: 239, y: 138, z: 22, r: 74, i: 1.05, c: '#ff9a40', fl: 'fire', ph: 2.3, tint: 0.55 });
    sc.light({ x: 74, y: 138, z: 16, r: 78, i: 0.9, c: '#ffc070', fl: 'candle', ph: 4, tint: 0.5 });           // loading bay
    sc.light({ x: 470, y: -120, z: 140, r: 760, i: 0.3, c: '#b8c4ff', tint: 0.25 });
    sc.light({ x: 290, y: 60, z: 10, r: 30, i: 0.5, c: '#ffb060', fl: 'candle', ph: 6, tint: 0.45 });          // dormer
    sc.light({ x: 322, y: 120, z: 14, r: 40, i: 0.7, c: '#ffc070', fl: 'candle', ph: 9, tint: 0.5 });          // door lamp
    LANT.forEach(([x, y], i) => sc.light({ x, y: y + 9, z: 16, r: 30, i: 0.55, c: '#ffc070', fl: 'candle', ph: i * 2.1, tint: 0.45 }));
    sc.light({ x: CX, y: 104, z: 22, r: 130, i: 0.9, c: '#ff4040', fl: 'buzz', ph: 3, tint: 0.6, bake: false });
    sc.light({ x: 22, y: 136, z: 26, r: 64, i: 0.8, c: '#ffd08a', fl: 'candle', ph: 10, tint: 0.4 });           // lamp posts
    sc.light({ x: 358, y: 136, z: 26, r: 64, i: 0.8, c: '#ffd08a', fl: 'candle', ph: 11, tint: 0.4 });

    S.lay('wall');
    // ── roofs: staggered tile courses (each tile lit top-left, jointed, a dark course line), half-round ridge caps,
    //    moss near the eaves, two slipped tiles; moonlight from the right warms nothing, it only lifts the right half ──
    const roof = (x0, x1, top, bot, inset, seed) => {
      const rr = X.rng(seed);
      for (let y = top; y <= bot; y++) { const k = (y - top) / (bot - top), a = Math.round(x0 + inset * (1 - k)), b = Math.round(x1 - inset * (1 - k)), row = y - top, course = Math.floor(row / 4), ry = row % 4;
        for (let x = a; x < b; x++) { const tx = x + (course % 2) * 3, tile = Math.floor(tx / 6), tp = tx % 6, jit = (X.vnoise(tile * 0.9, course * 1.7, seed) - 0.5) * 1.2;
          let tn = 4.6 - k * 1.2 + jit + (x - a) / Math.max(1, b - a) * 0.6;
          if (ry === 3) tn -= 1.8; else if (tp === 5 && ry > 0) tn -= 1.1; else if (tp === 0 && ry === 0) tn += 1.2; else if (ry === 0) tn += 0.5;
          S.px(x, y, 'crimson', tn, { n: [0, -0.55] }); } }
      // hips: a ridge line down each sloped end
      for (let y = top; y <= bot; y++) { const k = (y - top) / (bot - top); [Math.round(x0 + inset * (1 - k)), Math.round(x1 - inset * (1 - k)) - 1].forEach(x => { S.px(x, y, 'crimson', 6.5, { n: [0, -0.8] }); }); }
      // ridge caps
      for (let x = x0 + inset; x < x1 - inset; x += 3) { S.px(x, top - 2, 'crimson', 5.5); S.px(x + 1, top - 2, 'crimson', 7); S.px(x + 1, top - 3, 'crimson', 6.2); S.px(x + 2, top - 2, 'crimson', 4); } S.hl(x0 + inset, top - 1, x1 - x0 - inset * 2, 'crimson', 3);
      [x0 + inset - 1, x1 - inset].forEach(x => { S.px(x, top - 3, 'gold', 9); S.px(x, top - 4, 'gold', 7); S.px(x, top - 5, 'gold', 9); });
      // moss and slipped tiles
      for (let i = 0; i < 6; i++) { const mx = x0 + 10 + Math.floor(rr() * (x1 - x0 - 20)), my = bot - 2 - Math.floor(rr() * 12); for (let k = 0; k < 5; k++) S.px(mx + Math.floor(rr() * 4), my + Math.floor(rr() * 2), 'moss', 4 + rr() * 3); }
      for (let i = 0; i < 2; i++) { const mx = x0 + inset + 12 + Math.floor(rr() * (x1 - x0 - inset * 2 - 24)), my = top + 6 + Math.floor(rr() * 20); S.rect(mx, my, 5, 3, 'wood', 1.5); S.hl(mx + 1, my + 3, 5, 'crimson', 3.5); }
      S.rect(x0 - 1, bot + 1, x1 - x0 + 2, 2, 'wood', 3); S.hl(x0 - 1, bot + 1, x1 - x0 + 2, 'wood', 5);
      for (let x = x0 + 2; x < x1 - 1; x += 6) S.px(x, bot + 3, 'wood', 2);
    };
    // chimneys: a big brick stack with a pot on the warehouse, an iron stovepipe on the counting house
    S.beg(); TX.bricks(S, 48, 26, 14, 26, 'brick', 4, { bw: 6, bh: 4, v: 1, pits: 0 }); S.box(46, 23, 18, 3, 'stone', 6, { top: 1 }); S.cyl(52, 17, 6, 6, 'brick', 5, { rim: 1.5 }); S.rect(53, 17, 4, 1, 'ink', 1); S.end();
    S.beg(); S.cyl(324, 30, 5, 22, 'iron', 4, { rim: 1.5 }); S.hcyl(322, 28, 9, 2, 'iron', 6); S.poly([[321, 26], [331, 26], [326, 22]], 'iron', 5); S.end();
    roof(18, 164, 42, 78, 24, 11); roof(216, 362, 42, 78, 24, 23);
    // skylights on the warehouse roof, a dormer on the counting house
    [[62, 54], [86, 50], [110, 54]].forEach(([x, y]) => { S.beg(); S.box(x, y, 11, 8, 'wood', 3); S.rect(x + 1, y + 1, 9, 6, 'glass', 4); S.px(x + 7, y + 2, 'glass', 10); S.px(x + 8, y + 3, 'glass', 8); S.vl(x + 5, y + 1, 6, 'wood', 3); S.end(); });
    S.beg(); const dx = 280, dy = 48; S.poly([[dx - 3, dy + 8], [dx + 10, dy - 4], [dx + 23, dy + 8]], 'crimson', 5); S.rect(dx, dy + 8, 20, 14, 'linen', 5); S.box(dx + 4, dy + 10, 12, 11, 'wood', 3); S.rect(dx + 5, dy + 11, 10, 9, 'lamp', 7, { e: LI.dormer + 1 }); S.vl(dx + 10, dy + 11, 9, 'wood', 3); S.hl(dx + 5, dy + 15, 10, 'wood', 3); S.hl(dx - 3, dy + 8, 26, 'gold', 6); S.end();

    // ── the warehouse wing (left): brick below with a loading bay, timber above with a hayloft door ──
    TX.bricks(S, 28, 108, 130, 38, 'brick', 4.5, { bw: 9, bh: 4, v: 1.1, chip: 0.15, pits: 1 }); S.noise(28, 108, 130, 38, 1, 5, 31);
    [28, 152].forEach(x => { for (let y = 108; y < 146; y += 6) S.box(x, y, (y / 6) % 2 ? 6 : 5, 6, 'stone', 6); });
    S.rect(28, 78, 130, 30, 'linen', 4.6); S.noise(28, 78, 130, 30, 1, 4, 37);
    for (let x = 28; x <= 155; x += 18) { S.beg(); S.rect(Math.min(x, 155), 78, 3, 30, 'wood', 3.2); S.vl(Math.min(x, 155), 78, 30, 'wood', 4.4, { n: [-0.6, 0] }); S.end(); }
    [78, 92, 105].forEach(y => { S.beg(); S.rect(28, y, 130, 3, 'wood', 3.4); S.hl(28, y, 130, 'wood', 4.8, { n: [0, -0.7] }); S.end(); });
    [31, 103, 139].forEach(x => S.line(x, 104, x + 15, 95, 'wood', 3.2, { w: 2 }));
    S.rect(28, 108, 130, 2, 'wood', 1.8); S.ao(28, 110, 130, 5, 't', 1.4);                         // the jetty's shadow on the brick
    // loading bay: a corrugated shutter half up, warm crates inside, a timber lintel, a crate sign over it
    S.beg(); S.box(44, 111, 62, 4, 'wood', 4.5); S.end();
    S.rect(48, 115, 54, 31, 'lamp', 4.2); S.vgrad(48, 128, 54, 18, 'lamp', 6.2, 4.4, { e: LI.bay + 1 });
    S.beg(); [[52, 146, 12, 10], [64, 146, 10, 8], [53, 136, 9, 8], [80, 146, 14, 12], [94, 146, 7, 6]].forEach(([x, y, w, h]) => { S.box(x, y - h, w, h, 'wood', 3.6, { top: 1 }); S.hl(x + 1, y - Math.round(h / 2), w - 2, 'wood', 2.4); }); S.end();
    for (let x = 48; x < 102; x++) for (let y = 115; y < 128; y++) S.px(x, y, 'iron', ((x - 48) % 3 === 0 ? 3.2 : (x - 48) % 3 === 1 ? 5.4 : 4.4) - (y - 115) * 0.05, { n: [(x - 48) % 3 === 1 ? -0.4 : 0.3, 0] });
    S.beg(); S.box(47, 127, 56, 2, 'iron', 6.5); S.px(74, 129, 'iron', 7); S.px(75, 130, 'iron', 5); S.end();
    S.beg(); S.box(64, 100, 22, 0, 'wood', 4); S.end();
    S.beg(); S.box(66, 111 - 10, 18, 9, 'wood', 5.5); S.box(71, 103, 8, 6, 'wood', 7); S.hl(71, 106, 8, 'wood', 5); S.line(71, 103, 78, 108, 'wood', 5); S.end();
    // loading dock in front of the bay: planks on the plinth, rubber bumpers
    S.beg(); TX.planks(S, 42, 146, 66, 4, 'wood', 5, { ph: 2, pw: 16, nails: false }); [46, 102].forEach(x => S.rect(x, 147, 3, 5, 'hair', 2)); S.end();
    // upper: two lit windows, the hayloft doors (one open, dark inside), a hoist beam over them
    const window = (x, y, li) => { S.beg(); S.box(x - 1, y - 1, 18, 20, 'wood', 3); S.rect(x + 1, y + 1, 14, 16, 'lamp', 7.6, { e: li + 1 }); for (let k = 0; k < 3; k++) S.px(x + 2 + k * 4, y + 2, 'lamp', 10, { e: li + 1 });
      S.vl(x + 8, y + 1, 16, 'wood', 2.5); S.hl(x + 1, y + 8, 14, 'wood', 2.5); S.rect(x - 5, y, 4, 18, 'leaf', 3.5); S.rect(x + 17, y, 4, 18, 'leaf', 3.5); S.hl(x - 5, y + 6, 4, 'leaf', 2); S.hl(x + 17, y + 11, 4, 'leaf', 2);
      S.box(x - 2, y + 19, 20, 3, 'stone', 6); S.ao(x - 2, y + 22, 20, 3, 't', 1.6); S.end(); };
    WIN.forEach(([x, y], i) => window(x, y, LI.win + i));
    S.beg(); S.box(64, 81, 22, 25, 'wood', 3); S.rect(66, 83, 18, 22, 'ink', 1.5); TX.vplanks(S, 66, 83, 9, 22, 'wood', 4.2, { pw: 3 }); S.rect(66, 91, 9, 1, 'iron', 4); S.px(74, 93, 'iron', 7);
    S.rect(76, 96, 6, 9, 'sand', 3.5); S.px(78, 95, 'sand', 5); S.end();                                    // a sack inside the loft
    S.beg(); S.box(72, 76, 26, 3, 'wood', 5); S.rect(71, 75, 3, 5, 'wood', 3); S.ell(95.5, 80, 1.6, 1.6, 'iron', 6); S.end();
    // drainpipes with brackets
    [[27, 80, 146], [353, 80, 146]].forEach(([x, y0, y1]) => { S.beg(); S.cyl(x, y0, 3, y1 - y0, 'copper', 5, { rim: 1 }); for (let y = y0 + 6; y < y1; y += 16) S.hl(x - 1, y, 5, 'iron', 4); S.rect(x - 1, y1 - 2, 5, 2, 'copper', 6); S.end(); });

    // ── the counting house wing (right): dressed warm stone below, timber above with an oriel and a balcony ──
    TX.ashlar(S, 222, 108, 130, 38, 'mstone', 6, { bh: 7, bw: 14, crack: 0.1 }); S.noise(222, 108, 130, 38, 1, 5, 41);
    S.rect(222, 78, 130, 30, 'linen', 4.8); S.noise(222, 78, 130, 30, 1, 4, 43);
    for (let x = 222; x <= 349; x += 18) { S.beg(); S.rect(Math.min(x, 349), 78, 3, 30, 'wood', 3.2); S.vl(Math.min(x, 349), 78, 30, 'wood', 4.4, { n: [-0.6, 0] }); S.end(); }
    [78, 92, 105].forEach(y => { S.beg(); S.rect(222, y, 130, 3, 'wood', 3.4); S.hl(222, y, 130, 'wood', 4.8, { n: [0, -0.7] }); S.end(); });
    [225, 333].forEach(x => S.line(x, 104, x + 15, 95, 'wood', 3.2, { w: 2 }));
    S.rect(222, 108, 130, 2, 'wood', 1.8); S.ao(222, 110, 130, 5, 't', 1.4);
    // two tall arched windows with iron grilles and flower boxes
    [[240, 116], [270, 116]].forEach(([x, y]) => { S.beg(); for (let k = 0; k < 7; k++) { const a = Math.PI * (1 - k / 6); S.box(x + 7 + Math.round(Math.cos(a) * 9) - 2, y + 2 - Math.round(Math.sin(a) * 5) - 2, 4, 3, 'stone', 7.5); }
      for (let yy = y; yy < y + 22; yy++) for (let xx = x; xx < x + 14; xx++) { const u = (xx + 0.5 - x - 7) / 7, top = y + 4 - Math.round(4 * Math.sqrt(Math.max(0, 1 - u * u))); if (yy >= top) S.px(xx, yy, 'lamp', 7.2 + (yy < y + 6 ? 1 : 0), { e: LI.arch + 1 }); }
      for (let k = 1; k < 4; k++) S.vl(x + k * 3.5, y + 1, 21, 'iron', 3); S.hl(x, y + 11, 14, 'iron', 3);
      S.box(x - 2, y + 22, 18, 3, 'wood', 4); for (let k = 0; k < 6; k++) S.px(x - 1 + k * 3, y + 21 - (k % 2), k % 3 ? 'pink' : 'red', 7 + (k % 2)); S.end(); });
    // front door: studded, arched, a lamp beside, a striped awning over it, two steps
    S.beg(); for (let k = 0; k < 7; k++) { const a = Math.PI * (1 - k / 6); S.box(309 + Math.round(Math.cos(a) * 12) - 2, 120 - Math.round(Math.sin(a) * 7) - 2, 5, 4, 'stone', 7.5); }
    TX.vplanks(S, 299, 120, 20, 26, 'wood', 4, { pw: 5 }); for (let y = 124; y < 146; y += 5) for (let x = 301; x < 318; x += 5) S.px(x, y, 'iron', 7); S.px(315, 133, 'brass', 9); S.end();
    S.beg(); S.box(296, 146, 26, 3, 'stone', 6.5, { top: 1 }); S.end();
    S.beg(); S.box(323, 116, 2, 8, 'iron', 5); S.rect(322, 118, 5, 6, 'lamp', 8, { e: LI.door + 1 }); S.hl(322, 117, 5, 'iron', 6); S.end();
    // oriel: a bay window standing out on corbels, its own little tiled roof, three lit panes
    S.beg(); for (let x = 263; x < 300; x++) { const k = (x - 263) / 37; S.px(x, 76 - Math.round(4 * (1 - Math.abs(k * 2 - 1))), 'crimson', 6); } S.poly([[260, 80], [303, 80], [298, 75], [265, 75]], 'crimson', 5);
    for (let x = 262; x < 302; x += 3) S.px(x, 80, 'crimson', 3);
    S.box(262, 81, 40, 24, 'wood', 4, { side: 2 }); [266, 279, 292].forEach((x, i) => { S.rect(x, 84, 9, 15, 'lamp', 7.8, { e: LI.oriel + 1 }); S.px(x + 1, 85, 'lamp', 10, { e: LI.oriel + 1 }); S.hl(x, 91, 9, 'wood', 2.5); });
    S.box(261, 105, 42, 3, 'wood', 5); [264, 280, 296].forEach(x => S.poly([[x, 108], [x + 4, 108], [x + 2, 113]], 'wood', 4)); S.end();
    // balcony with an iron railing and pots, the balcony door lit
    S.beg(); S.box(310, 104, 38, 3, 'stone', 6.5, { top: 1 }); for (let x = 311; x < 347; x += 3) S.vl(x, 96, 8, 'iron', 4); S.hl(310, 95, 38, 'iron', 6); S.hl(310, 101, 38, 'iron', 3);
    [[314, 'red'], [330, 'pink'], [342, 'leaf']].forEach(([x, m]) => { S.box(x, 99, 5, 5, 'brick', 5); S.px(x + 1, 97, m, 8); S.px(x + 3, 96, m, 7); S.px(x + 2, 97, 'leaf', 6); }); S.end();
    // ivy up the warehouse's left corner
    for (let i = 0; i < 70; i++) { const y = 146 - Math.floor(r() * 60), x = 29 + Math.floor(r() * (8 + (146 - y) * 0.1)); S.px(x, y, 'leaf', 3 + r() * 4); }

    // ── gate tower: dressed stone, a spire roof with a finial, a midnight clock ──
    TX.ashlar(S, 150, 22, 80, 124, 'stone', 5.8, { bh: 8, bw: 14, crack: 0.12 }); S.noise(150, 22, 80, 124, 1, 6, 57);
    [150, 226].forEach(x => { for (let y = 26; y < 146; y += 7) S.box(x, y, 4 + ((y / 7) % 2), 7, 'stone', 7.2); });
    S.beg(); for (let y = 2; y <= 24; y++) { const k = (y - 2) / 22, hw = Math.round(4 + k * 40); for (let x = CX - hw; x < CX + hw; x++) { const row = y - 2, tx = x + (Math.floor(row / 3) % 2) * 2, tn = 5.5 - k * 1.6 + (row % 3 === 2 ? -1.4 : 0) + (tx % 4 === 0 && row % 3 !== 2 ? -0.7 : 0) + (x < CX ? 0.6 : -0.3); S.px(x, y, 'crimson', tn, { n: [x < CX ? -0.5 : 0.5, -0.5] }); } }
    S.hl(CX - 44, 24, 88, 'gold', 7); S.end();
    S.beg(); S.vl(CX, -1, 4, 'gold', 8); S.ell(CX + 0.5, 3, 1.6, 1.6, 'gold', 9, { dome: 1 }); S.end();
    S.beg(); S.box(152, 25, 76, 3, 'stone', 7.5, { top: 1 }); S.box(152, 52, 76, 3, 'stone', 7.5, { top: 1 }); S.hl(152, 55, 76, 'gold', 5.5); for (let x = 155; x < 226; x += 5) S.px(x, 56, 'stone', 4); S.end();
    S.beg(); S.ell(CX + 0.5, 39.5, 12.5, 12.5, 'brass', 6, { ring: 2, dome: 1 }); S.ell(CX + 0.5, 39.5, 10.5, 10.5, 'paper', 8.6, { e: 2 });
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, rr = k % 3 ? 8.6 : 8; S.px(CX + Math.sin(a) * rr, 39 - Math.cos(a) * rr, 'ink', k % 3 ? 2 : 1, { e: 255 }); if (!(k % 3)) S.px(CX + Math.sin(a) * (rr - 1), 39 - Math.cos(a) * (rr - 1), 'ink', 2, { e: 255 }); }
    S.end();
    // portal recess: dark stone the tunnel fills; its inner lip glows with the portal
    for (let y = AAP - 4; y <= ATH; y++) for (let x = AX0 - 4; x <= AX1 + 4; x++) if (inArch(x, y, 4)) S.px(x, y, 'stone', inArch(x, y) ? 1 : 3);
    for (let y = AAP - 1; y <= ATH; y++) for (let x = AX0 - 1; x <= AX1 + 1; x++) if (inArch(x, y, 1) && !inArch(x, y)) S.px(x, y, 'teal', 6.5, { e: 1 });
    // plinth
    S.beg(); TX.ashlar(S, 24, 146, 332, 20, 'stone', 4.6, { bh: 7, bw: 22, crack: 0.1 }); S.box(22, 144, 336, 3, 'stone', 6.5, { top: 1 }); S.end();
    // plaza: cobbles in rows that grow toward the eye, grass at the ragged ends, two puddles
    const rowsH = [1, 1, 2, 2, 2, 3];
    for (let y = PLZ0, ri = 0; y < PLZ1; ri++) { const h = rowsH[Math.min(ri, rowsH.length - 1)], w = 3 + h * 2, off = (ri % 2) * Math.round(w / 2), inset = Math.max(0, 8 - ri * 2);
      for (let x = 14 + inset; x < 366 - inset; x++) { const cx0 = x + off, cell = Math.floor(cx0 / w), cxp = cx0 % w; for (let k = 0; k < h && y + k < PLZ1; k++) { const edge = cxp === 0 || k === h - 1; S.px(x, y + k, 'stone', edge ? 2.4 : 4.4 + (X.vnoise(cell, ri * 3, 7) - 0.5) * 1.6 + (k === 0 && cxp === 1 ? 1 : 0)); } }
      y += h; }
    for (let x = 6; x < 20; x++) for (let y = PLZ0 + 2; y < PLZ1; y++) if (r() < 0.6) S.px(x, y, 'leaf', 2 + r() * 2); for (let x = 360; x < 374; x++) for (let y = PLZ0 + 2; y < PLZ1; y++) if (r() < 0.6) S.px(x, y, 'leaf', 2 + r() * 2);
    S.floor(GY);
    // ── the shaft down to the underground (behind the plaza) ──
    S.lay('back'); S.rect(171, PLZ1, 38, AH - PLZ1, 'ink', 1); for (let y = PLZ1; y < AH; y += 8) S.box(169, y, 42, 3, 'wood', 4); S.box(167, PLZ1, 4, AH - PLZ1, 'wood', 5); S.box(209, PLZ1, 4, AH - PLZ1, 'wood', 5);
    for (let y = PLZ1; y < AH; y++) { S.px(183, y, 'iron', 5); S.px(197, y, 'iron', 5); }
    // ── columns, the voussoir ring with runes, the steps, braziers ──
    S.lay('mid');
    [154, 218].forEach(x => { S.beg(); S.box(x - 1, 146, 10, 4, 'stone', 6.5, { top: 1 }); S.cyl(x, 70, 8, 76, 'stone', 7, { rim: 2 }); for (let y = 74; y < 142; y += 9) S.hl(x + 1, y, 6, 'stone', 5.6); S.box(x - 1, 64, 10, 6, 'brass', 6, { top: 1 }); S.hl(x - 1, 67, 10, 'brass', 4); S.end(); });
    S.beg();
    for (let y = AAP - 7; y <= ATH; y++) for (let x = AX0 - 7; x <= AX1 + 7; x++) { if (!inArch(x, y, 6) || inArch(x, y, 1)) continue; const ang = Math.atan2(y - ASP, x + 0.5 - CX), seg = Math.floor((ang + Math.PI) / (Math.PI / 9)), side = y >= ASP;
      const joint = side ? (y - ASP) % 9 === 0 : Math.abs(Math.sin((ang + Math.PI) * 9 / 2)) < 0.12; S.px(x, y, 'stone', joint ? 3.5 : 7.4 - (inArch(x, y, 3) ? 0.9 : 0) + ((seg + (side ? Math.floor(y / 9) : 0)) % 2) * 0.5, { n: [x < CX ? 0.4 : -0.4, -0.3] }); }
    S.end();
    const RUNE = ['101', '010', '111'], RUNE2 = ['110', '011', '010'], RUNE3 = ['111', '100', '110'];
    [[164, 132], [164, 116], [164, 100], [168, 82], [178, 67], [216, 132], [216, 116], [216, 100], [212, 82], [202, 67]].forEach(([x, y], i) => { const g = [RUNE, RUNE2, RUNE3][i % 3]; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (g[b][a] === '1') S.px(x - 1 + a, y - 1 + b, 'teal', 7.5, { e: 1 }); });
    S.beg(); S.poly([[CX - 5, AAP - 8], [CX + 5, AAP - 8], [CX + 4, AAP + 1], [CX - 4, AAP + 1]], 'stone', 8); S.ell(CX + 0.5, AAP - 3.5, 2.2, 2.6, 'teal', 9, { e: 1 }); S.px(CX, AAP - 5, 'teal', 11, { e: 1 }); S.end();
    [[150, 160, 80, 6], [156, 155, 68, 5], [162, 151, 56, 4]].forEach(([x, y, w, h]) => { S.beg(); S.box(x, y, w, h, 'stone', 6.2, { top: 2, tt: 1.8 }); S.end(); });
    [141, 239].forEach(x => { S.beg(); S.line(x - 5, 156, x - 1, 142, 'iron', 4); S.line(x + 5, 156, x + 1, 142, 'iron', 4); S.vl(x, 144, 12, 'iron', 5); S.poly([[x - 7, 138], [x + 7, 138], [x + 4, 143], [x - 4, 143]], 'iron', 5); S.hl(x - 7, 138, 14, 'iron', 8); for (let k = -5; k <= 5; k += 2) S.px(x + k, 137, 'fire', 6 + (k & 2), { e: (x > CX ? LI.brzR : LI.brzL) + 1 }); S.end(); });
    // shop sign bracket (the sign swings in anim)
    S.beg(); S.hl(326, 108, 14, 'iron', 6); S.line(326, 112, 336, 108, 'iron', 4); S.end();
    // ── near the eye: crates, barrels, a cart, lamp posts ──
    S.lay('front');
    const crate = (x, y, w, h, tn) => { S.beg(); S.box(x, y - h, w, h, 'wood', tn, { top: 2 }); S.hl(x + 1, y - Math.round(h / 2), w - 2, 'wood', tn - 2); S.line(x + 1, y - h + 1, x + w - 2, y - 2, 'wood', tn - 1.5); S.end(); };
    crate(30, 171, 14, 12, 5.5); crate(44, 171, 11, 9, 4.8); crate(34, 159, 11, 9, 6);
    [[112, 173], [120, 173]].forEach(([x, y]) => { S.beg(); S.cyl(x - 4, y - 11, 8, 11, 'wood', 5, { rim: 2 }); S.hcyl(x - 4, y - 9, 8, 1, 'iron', 5); S.hcyl(x - 4, y - 3, 8, 1, 'iron', 4); S.ell(x, y - 11, 4, 1, 'wood', 7); S.end(); });
    crate(330, 173, 14, 11, 5); crate(318, 173, 10, 7, 6);
    S.beg(); S.hl(262, 169, 20, 'wood', 5); S.line(262, 169, 258, 163, 'wood', 5); S.ell(266, 171, 3, 3, 'wood', 3, { ring: 1 }); S.ell(278, 171, 3, 3, 'wood', 3, { ring: 1 }); S.box(260, 161, 20, 7, 'wood', 5.5); S.rect(263, 158, 6, 3, 'sand', 5); S.end();
    [[22, 1], [358, -1]].forEach(([x], i) => { S.beg(); S.rect(x - 1, 138, 3, 36, 'iron', 3.5); S.rect(x - 2, 172, 5, 2, 'iron', 5); S.poly([[x - 4, 130], [x + 4, 130], [x + 3, 137], [x - 3, 137]], 'iron', 4); S.rect(x - 2, 131, 5, 5, 'lamp', 9, { e: (i ? LI.postR : LI.postL) + 1 }); S.px(x, 132, 'lamp', 11, { e: (i ? LI.postR : LI.postL) + 1 }); S.hl(x - 5, 129, 11, 'iron', 6); S.px(x, 128, 'iron', 7); S.end(); });
    sc.emit({ k: 'steam', x: 55, y: 16, rate: 0.9, sp: 5, ang: 0.35, spread: 0.5, life: 3.2 });
    sc.emit({ k: 'steam', x: 326, y: 21, rate: 0.6, sp: 4, ang: 0.35, spread: 0.4, life: 2.6 });
    sc.emit({ k: 'ember', x: 141, y: 134, w: 8, rate: 3, sp: 7, ang: 0, spread: 0.6, life: 1.8 });
    sc.emit({ k: 'ember', x: 239, y: 134, w: 8, rate: 3, sp: 7, ang: 0, spread: 0.6, life: 1.8 });
  },
  anim(D, t, rs, o) {
    const st = rs.st, po = clamp(o.po || 0, 0, 1), hp = o.hp == null ? 1 : o.hp, low = hp < 0.35;
    rs.mul[0] = 1 + po * 1.3 + (o.hovDoor ? 0.25 : 0); if (low) rs.mul[0] *= 0.75 + 0.25 * (Math.sin(t * 23) > 0.3 ? 1 : 0.2);
    rs.mul[LI.alarm] = low ? 0.55 + 0.45 * Math.max(0, Math.sin(t * 4.2)) : 0;
    if (o.hovWing) { rs.mul[LI.bay] = 1.3; rs.mul[LI.oriel] = 1.3; } else { rs.mul[LI.bay] = 1; rs.mul[LI.oriel] = 1; }
    // ── the portal: a tunnel. Rings rush outward from a bright far end, two spiral arms turn through them ──
    D.lay('back'); const sp = 0.45 + po * 2.6, cy = 110, ringV = 0.35 + po * 1.6;
    for (let y = AAP; y <= ATH; y++) for (let x = AX0; x <= AX1; x++) { if (!inArch(x, y)) continue; const dx = x + 0.5 - CX, dy = (y + 0.5 - cy) * 0.62, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const depth = Math.max(0, 1 - d / 36), rings = ((Math.log(d + 2) * 3.2 - t * ringV * 3) % 1 + 1) % 1, arm = Math.sin(a * 2 - d * 0.28 + t * sp * 2.2) * 0.5 + 0.5;
      let tn = 1.2 + depth * depth * (3.2 + po * 5) + arm * (1.3 + po * 2.2) * (0.4 + depth * 0.6) + (rings < 0.14 ? 0.9 + po : 0);
      if (low && ((x * 7 + y * 3 + Math.floor(t * 12)) % 29 === 0)) tn += 3;
      D.px(x, y, depth > 0.86 && po > 0.3 ? 'ice' : 'teal', Math.min(11, tn), { e: 255 }); }
    if (!st.stars) st.stars = []; const sa = st.stars;
    if (sa.length < 14 + po * 20 && R() < 0.3 + po) sa.push({ a: R() * Math.PI * 2, d: 26 + R() * 8, v: 6 + R() * 8 });
    for (let i = sa.length - 1; i >= 0; i--) { const q = sa[i]; q.d -= q.v * (0.03 + po * 0.05); q.a += (0.04 + po * 0.1); if (q.d < 2) { sa.splice(i, 1); continue; } const x = Math.round(CX + Math.cos(q.a) * q.d), y = Math.round(cy + Math.sin(q.a) * q.d / 0.62); if (inArch(x, y)) D.px(x, y, 'ice', 10, { e: 255 }); }
    // the portal in the puddle at the foot of the steps: a flipped, darker, rippling copy
    D.lay('wall'); for (let y = 167; y < 176; y++) { const k = (y - 167) / 9, hw = Math.round(20 - k * 4); for (let x = CX - hw; x <= CX + hw; x++) { const sy = 158 - (y - 167) * 3 + Math.round(Math.sin(x * 0.5 + t * 3 + y) * 1.2), dx2 = x + 0.5 - CX, dd = Math.hypot(dx2, (sy - cy) * 0.62), dp = Math.max(0, 1 - dd / 36), arm = Math.sin(Math.atan2((sy - cy) * 0.62, dx2) * 2 - dd * 0.28 + t * sp * 2.2) * 0.5 + 0.5;
      if (Math.abs(dx2) > hw - 1 && (x + y) % 2) continue; D.px(x, y, 'teal', Math.min(8, 1 + dp * dp * (2 + po * 3) + arm * (0.8 + po)) - k * 0.8, { e: 255 }); } }
    if (low) { D.lay('mid'); [[161, 92, 1, 16], [218, 116, -1, 14], [183, 55, 1, 9], [196, 57, -1, 8], [162, 136, 1, 10]].forEach(([x, y, d, n], i) => { let cx = x, yy = y; for (let k = 0; k < n; k++) { D.px(cx, yy, 'ink', 1); D.px(cx + 1, yy, 'stone', 9); yy++; if ((k + i) % 3 === 0) cx += d; } });
      if (R() < 0.04) rs.burst('spark', 170 + R() * 40, 70 + R() * 70, 4, { sp: 30, life: 0.6, floor: GY }); }
    // ── clock hands: near midnight; the minute hand ticks each second ──
    D.lay('wall'); const mn = (55 + Math.floor(t) / 60 * 5) % 60, ha = (11 + mn / 60) / 12 * Math.PI * 2, ma = mn / 60 * Math.PI * 2;
    D.line(CX, 39, CX + Math.sin(ha) * 5, 39 - Math.cos(ha) * 5, 'ink', 1, { e: 255 }); D.line(CX, 39, CX + Math.sin(ma) * 8, 39 - Math.cos(ma) * 8, 'ink', 2, { e: 255 }); D.px(CX, 39, 'brass', 9, { e: 255 });
    // a figure passes behind the oriel now and then
    const wp = steps(t, 17); if (wp < 0.4) { const fx = 262 + Math.round(wp / 0.4 * 44); for (let y = 0; y < 13; y++) for (let x = 0; x < 6; x++) { const X0 = fx + x, Y0 = 88 + y; if (y < 4 && (x === 0 || x === 5)) continue; if ((X0 >= 266 && X0 < 275) || (X0 >= 279 && X0 < 288) || (X0 >= 292 && X0 < 301)) D.px(X0, Y0, 'lamp', 3.2, { e: 255 }); } }
    // ── banners on the tower flanks ──
    D.lay('mid'); [[134, 1], [240, -1]].forEach(([x, dir], j) => { D.beg(); D.hl(x - 1, 84, 14, 'gold', 7); for (let y = 86; y < 118; y++) { const w = Math.round(Math.sin(t * 2.2 + y * 0.2 + j) * (y - 86) / 32 * 1.5); for (let k = 0; k < 12; k++) D.px(x + k + w, y, 'teal', (k === 0 ? 3.5 : k === 11 ? 2.4 : 4.6) + (y < 90 ? 0.6 : 0)); }
      for (let k = 0; k < 12; k += 2) D.px(x + k + Math.round(Math.sin(t * 2.2 + 6.4 + j) * 1.5), 118 + (k % 4 ? 1 : 0), 'teal', 3.5);
      const bx = x + 6 + Math.round(Math.sin(t * 2.2 + 20 + j) * 0.7); D.poly([[bx - 3, 101], [bx, 96], [bx + 3, 101], [bx, 106]], 'gold', 7.5); D.px(bx, 101, 'teal', 9, { e: 1 }); D.end(); });
    // ── eave lanterns ──
    LANT.forEach(([x, y], i) => { const a = Math.sin(t * 1.4 + i * 1.3) * 0.18, lx = Math.round(x + Math.sin(a) * 6), ly = y + 6, e = LI.lant + i + 1; D.line(x, y, lx, ly - 1, 'iron', 3); D.beg(); D.rect(lx - 2, ly, 5, 1, 'iron', 5); D.rect(lx - 2, ly + 1, 5, 6, 'lamp', 8, { e }); D.px(lx, ly + 3, 'lamp', 11, { e }); D.vl(lx - 2, ly + 1, 6, 'iron', 4); D.vl(lx + 2, ly + 1, 6, 'iron', 4); D.rect(lx - 1, ly + 7, 3, 1, 'iron', 5); D.end({ none: 1 }); });
    // ── brazier flames ──
    [141, 239].forEach((x, i) => { for (let k = -4; k <= 4; k++) { const hh = Math.round(4 + 3 * Math.sin(t * 9 + k * 1.7 + i) + (4 - Math.abs(k)) * 0.9); for (let y = 0; y < hh; y++) D.px(x + k + (y > 2 ? Math.round(n1(t * 5 + k + i * 3)) : 0), 136 - y, 'fire', clamp(11 - y * 1.6 - Math.abs(k) * 0.5, 3, 11), { e: 255 }); } });
    // ── the warehouse hoist: rope and a sack that sways, lowered to the dock and pulled up again ──
    const cq = steps(t, 22), drop = cq < 0.2 ? cq / 0.2 : cq < 0.55 ? 1 : cq < 0.75 ? 1 - (cq - 0.55) / 0.2 : 0, ry = Math.round(84 + drop * 50), sw = Math.round(Math.sin(t * 1.1) * 1.2);
    D.line(95, 81, 95 + sw, ry, 'hair', 3); D.beg(); D.rect(92 + sw, ry, 7, 8, 'sand', 5.5); D.hl(93 + sw, ry + 1, 5, 'sand', 7); D.px(95 + sw, ry - 1, 'sand', 4); D.hl(92 + sw, ry + 7, 7, 'sand', 3.5); D.end();
    // ── the shop sign swings on its bracket; the weathervane turns a little with the wind ──
    const sa2 = Math.sin(t * 1.3) * 0.12, sgx = 333 + Math.round(Math.sin(sa2) * 3); D.line(329, 108, sgx - 3, 112, 'iron', 4); D.line(337, 108, sgx + 3, 112, 'iron', 4);
    D.beg(); D.box(sgx - 6, 112, 13, 11, 'wood', 5); D.ell(sgx + 0.5, 117.5, 3.5, 3.5, 'gold', 8, { dome: 1 }); D.px(sgx, 117, 'gold', 5); D.px(sgx + 1, 117, 'gold', 5); D.end();
    const va = Math.sin(t * 0.37) * 0.8 + n1(t * 0.9) * 0.3, vx = 296; D.beg(); D.vl(vx, 34, 12, 'iron', 5); D.ell(vx + 0.5, 34, 1.5, 1.5, 'gold', 8);
    const vw = Math.round(Math.cos(va) * 7); D.line(vx - vw, 32, vx + vw, 32, 'iron', 6); D.poly([[vx + vw, 32], [vx + vw - Math.sign(vw || 1) * 3, 29], [vx + vw - Math.sign(vw || 1) * 4, 32]], 'iron', 6); D.px(vx - vw, 31, 'iron', 7); D.px(vx - vw, 33, 'iron', 7); D.end();
    // ── a black cat walks the warehouse ridge every 26 s, sits, flicks its tail ──
    const kq = steps(t, 26); if (kq < 0.55) { const kx = Math.round(44 + Math.min(1, kq / 0.4) * 60), sit = kq > 0.4, ky = 39;
      const body = sit ? ['  ##', '  ##', ' ###', '####'] : ['#  #', '####', '### ', '#  #'];
      D.beg(); body.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') D.px(kx + i, ky - 4 + j + (sit ? 0 : 1), 'ink', 1); }); D.px(kx + 3, ky - 5, 'ink', 1); D.px(kx + 4, ky - 4, 'ink', 1); D.px(kx + 3, ky - 4, 'screen', 8, { e: 255 });
      const tl = Math.round(Math.sin(t * (sit ? 3 : 8)) * 1.5); D.px(kx - 1, ky - 3 + tl, 'ink', 1); D.px(kx - 2, ky - 4 + tl, 'ink', 1); D.end({ none: 1 }); }
    // ── a porter carries sacks from the dock to the cart; a clerk steps out of the counting house now and then ──
    const w = stroll(t, 60, 256, 12, 0.3, 2); worker(D, w.x, GY + 4, 'worker', Object.assign(w.pose, w.dir > 0 ? { aF: 1.2, eF: -1.2, aB: 1, eB: -1, tool: 'box' } : {}), w.dir);
    const cq2 = steps(t, 19); if (cq2 > 0.1 && cq2 < 0.6) { const k = (cq2 - 0.1) / 0.5, x = Math.round(308 + Math.sin(k * Math.PI) * 18); worker(D, x, 149, { skin: ['skin', 6], hair: ['hair', 2], top: ['crimson', 5], bot: ['hair', 3], boot: ['hair', 2], hat: ['hair', 3] }, { aF: 1.3, eF: -1.3, tool: 'board', bob: Math.round(Math.abs(Math.sin(t * 8)) * -0.6) }, k < 0.5 ? 1 : -1); }
    // ── moths round the lanterns, fireflies over the plaza ──
    D.lay('front'); LANT.forEach(([x, y], i) => { const a = t * 3.3 + i * 2, mx = x + Math.cos(a) * 5, my = y + 10 + Math.sin(a * 1.4) * 3; D.px(mx, my, 'paper', Math.sin(t * 30 + i) > 0 ? 8 : 5); });
    for (let i = 0; i < 7; i++) { const a = Math.sin(t * (0.9 + i * 0.13) + i * 5), fx = 40 + ((i * 53 + t * 6 * (i % 2 ? 1 : -1)) % 300 + 300) % 300, fy = 150 + Math.sin(t * 1.3 + i * 2) * 8; if (a > 0.2) D.px(fx, fy, 'leaf', 10 + (a > 0.7 ? 1 : 0), { e: 255 }); }
  },
});

// drawn by drawBase in place of the old flat main base and portal door
M.PXR.mainBase = function (ctx, bv, t, meta) {
  const G = M.BASE_GEO, po = bv.po || 0, hp = meta && meta.portal ? meta.portal.hp / (M.portalMax ? M.portalMax(meta) : 1) : 1, h = bv.hover || {};
  X.draw(ctx, G.DOOR_X - AW, -340, '_mainbase', t, { po, hp, hovDoor: !!(h.door && !h.wing), hovWing: !!h.wing, hov: !!h.door, par: clamp((G.DOOR_X - bv.x) / 900, -1, 1) }, 'mainbase', bv.z);
};

// ───────── the surface around it: pixel sky, moon, stars, parallax mountains and forest, ground, soil ─────────
// Everything on the art grid (1 art px = 2 world units). Far layers are baked once and slide with the camera by their
// parallax factor; stars twinkle, clouds drift, a shooting star now and then. Called by drawBase in world space.
const SX0 = -1500, SXW = 5100, AWD = SXW / 2;             // baked wide layers cover world x −1500…3600
const col = (m, k) => X.col32(m, k), hexOf = (c) => 'rgb(' + (c & 255) + ',' + ((c >> 8) & 255) + ',' + ((c >> 16) & 255) + ')';
const h1 = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function canvasOf(w, h, paint) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), im = x.createImageData(w, h), u = new Uint32Array(im.data.buffer); paint(u, w, h); x.putImageData(im, 0, 0); return c; }
let SURF = null;
function bakeSurface() {
  const r = X.rng(4242), S = {};
  // far mountains (bottom at world y −16): ridge with jags, moonlit right-hand slopes, snow on the high peaks, village lights
  S.mtn = canvasOf(AWD, 170, (u, w, h) => { const top = []; for (let x = 0; x < w; x++) { const wx = SX0 + x * 2, hh = 100 + 120 * Math.abs(Math.sin(wx * 0.0019 + 0.6)) + 36 * Math.sin(wx * 0.0061 + 1.3) + 10 * Math.sin(wx * 0.023) + (h1(x) < 0.25 ? 2 : 0); top.push(h - Math.round(hh / 2) + 8); }
    for (let x = 0; x < w; x++) { const y0 = top[x], slopeR = x + 1 < w && top[x + 1] > y0, peak = h - y0 > 104; for (let y = Math.max(0, y0); y < h; y++) { const d = y - y0; let c = col('night', 2 - Math.min(0.9, (y - y0) / 60) + 0.3); if (d < 2 && slopeR) c = col('night', 4); if (peak && d < 5 - (x % 3 === 0 ? 1 : 0)) c = col('ice', slopeR ? 6 : 4); u[y * w + x] = c; } }
    for (let i = 0; i < 9; i++) { const vx = Math.floor(r() * w), vy = h - 6 - Math.floor(r() * 10); for (let k = 0; k < 4 + Math.floor(r() * 5); k++) { const x = vx + Math.floor(r() * 14), y = vy + Math.floor(r() * 4); if (u[y * w + x]) u[y * w + x] = col('lamp', 7 + Math.floor(r() * 3)); } } });
  // forest (bottom at world y −10): pines in tiers, rim-lit on the moon side; a clearing around the base
  S.trees = canvasOf(AWD, 70, (u, w, h) => { for (let i = 0; i < 520; i++) { const x0 = Math.floor(r() * w), wx = SX0 + x0 * 2; if (Math.abs(wx - 1050) < 470) continue; const th = 14 + Math.floor(r() * 30), tone = r() < 0.5 ? 1 : 1.5;
      for (let k = 0; k < th; k++) { const y = h - 2 - k, tier = (k % 7), half = Math.max(0, Math.round((th - k) * 0.28 + (tier < 2 ? 1 : 0) - 1)); for (let dx = -half; dx <= half; dx++) { const x = x0 + dx; if (x < 0 || x >= w) continue; u[y * w + x] = col('night', dx === half && tier > 2 ? tone + 1.5 : tone); } }
      for (let k = 0; k < 3; k++) { const y = h - 1 - k; if (x0 >= 0 && x0 < w) u[y * w + x0] = col('wood', 1); } }
    for (let x = 0; x < w; x++) for (let y = h - 3; y < h; y++) if (!u[y * w + x]) u[y * w + x] = col('night', 1); });
  // ground band (world y −24…24): grass lip, tufts, dirt with pebbles, a cobbled path either side of the plaza
  S.ground = canvasOf(AWD, 24, (u, w, h) => { for (let x = 0; x < w; x++) { const wx = SX0 + x * 2, path = Math.abs(wx - 1050) < 470 && Math.abs(wx - 1050) > 330;
      for (let y = 0; y < h; y++) { let c; if (y < 4) c = y < 1 ? (h1(x * 3) < 0.45 ? 0 : col('leaf', 3 + h1(x) * 2)) : col('leaf', 2 + (y === 1 ? 1.5 : 0.5) + (h1(x + y * 7) < 0.2 ? 1 : 0)); else c = col('earth', 3.5 - (y - 4) / 20 * 1.5 + (h1(x * 13 + y * 7) < 0.08 ? 2 : 0) + (h1(x * 5 + y) < 0.06 ? -1 : 0));
        if (path && y >= 4 && y < 8) c = col('stone', ((x + (y % 2) * 2) % 5 === 0 ? 2.5 : 4.2) + (h1(x + y) < 0.2 ? 0.8 : 0)); u[y * w + x] = c; }
      if (h1(x * 7 + 1) < 0.18) { const tall = 1 + Math.floor(h1(x) * 3); for (let k = 1; k <= tall; k++) if (k < 4) u[(4 - k) * w + x] = col('leaf', 3 + k * 0.5); }
      if (h1(x * 11 + 3) < 0.012) { u[2 * w + x] = col('pink', 8); u[1 * w + x] = col('pink', 9); } } });
  // soil tile (world 300×200): layered earth, pebbles, a few roots
  S.soil = canvasOf(150, 100, (u, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = X.vnoise(x / 9, y / 5, 31) * 0.7 + X.vnoise(x / 3, y / 2, 32) * 0.3; u[y * w + x] = col('earth', 1.6 + Math.round(n * 2.4 - 0.4) + (Math.sin(y * 0.4 + X.vnoise(x / 20, 0, 5) * 3) > 0.92 ? -1 : 0)); }
    for (let i = 0; i < 40; i++) { const x = Math.floor(r() * (w - 3)), y = Math.floor(r() * (h - 2)); u[y * w + x] = col('rock', 7); u[y * w + x + 1] = col('rock', 6); u[(y + 1) * w + x] = col('rock', 4); u[(y + 1) * w + x + 1] = col('rock', 3); } });
  // moon: shaded disc, craters, a lit rim, three halo bands
  S.moon = canvasOf(110, 110, (u, w, h) => { const cx = 55, cy = 55, R0 = 33; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= R0) { const lx = (x - cx) / R0, ly = (y - cy) / R0, sh = 0.55 + 0.45 * (-lx * 0.5 - ly * 0.6 + Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly)) * 0.7); u[y * w + x] = col('bone', 5.5 + sh * 4.6 + (X.vnoise(x / 5, y / 5, 9) < 0.35 ? -1.2 : 0)); }
      else if (d <= R0 + 5) u[y * w + x] = col('night', 5); else if (d <= R0 + 11) u[y * w + x] = col('night', 4); else if (d <= R0 + 18) u[y * w + x] = col('night', 3.1); }
    [[-12, -6, 6], [9, 10, 5], [4, -15, 4], [-4, 14, 3], [15, -4, 3]].forEach(([a, b, rr]) => { for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) { const d = Math.hypot(x, y); if (d > rr) continue; const p = (cy + b + y) * w + cx + a + x; u[p] = col('bone', d > rr - 1 && x + y > 0 ? 9.6 : 5.2); } }); });
  // clouds
  S.clouds = [0, 1, 2].map(k => canvasOf(70, 18, (u, w, h) => { const blobs = [[16, 11, 10, 6], [32, 8, 13, 8], [50, 11, 11, 6], [26, 13, 16, 5]]; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let inside = false, topEdge = false; blobs.forEach(([bx, by, rx, ry]) => { const v = ((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2; if (v <= 1) { inside = true; if (((x - bx) / rx) ** 2 + ((y - 1 - by) / ry) ** 2 > 1) topEdge = true; } });
      if (!inside) continue; const bottomDither = y > 12 && ((x + y) & 1); if (bottomDither) continue; u[y * w + x] = col('night', topEdge ? 5 : 3.4 + (y < 9 ? 0.6 : 0)); } }));
  // stars: a field plus the milky way (a diagonal band of dim ones)
  S.stars = []; for (let i = 0; i < 260; i++) { const band = i < 120; let x = r() * SXW + SX0, y = -980 + r() * 760; if (band) { const k = r(); x = SX0 + 600 + k * 3400 + (r() - 0.5) * 260; y = -950 + k * 520 + (r() - 0.5) * 160; } S.stars.push({ x: Math.round(x / 2) * 2, y: Math.round(y / 2) * 2, b: band ? r() * 0.5 : r(), p: r() * 7, s: 1 + r() * 2.5, band }); }
  return S;
}
const SKY = [[-1000, 0.4], [-900, 0.8], [-790, 1.2], [-690, 1.6], [-590, 2], [-480, 2.4], [-380, 2.8], [-290, 3.3], [-200, 3.8], [-120, 4.3], [-60, 4.8]];   // [from world y, night tone] bands
M.PXR.surface = function (ctx, bv, t) {
  if (!SURF) SURF = bakeSurface(); const S = SURF, sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  const cx = bv.x - 1050, cy = bv.y - 380, sn = (v) => Math.round(v / 2) * 2;
  // sky bands (hard steps, like a pixel sky), then the far things by their parallax
  SKY.forEach(([y0, tn], i) => { const y1 = i + 1 < SKY.length ? SKY[i + 1][0] : -16; ctx.fillStyle = hexOf(col('night', tn)); ctx.fillRect(SX0 - 2000, y0, SXW + 4000, y1 - y0); });
  ctx.fillStyle = hexOf(col('night', 0.4)); ctx.fillRect(SX0 - 2000, -3000, SXW + 4000, 2000);
  const kS = 0.8; S.stars.forEach(s => { const a = s.band ? s.b : 0.35 + 0.65 * Math.abs(Math.sin(t * (0.4 + s.s * 0.3) + s.p)); if (a < 0.3) return; const x = sn(s.x + cx * kS), y = sn(s.y + cy * kS * 0.5);
    ctx.fillStyle = hexOf(s.band ? col(s.b > 0.3 ? 'lav' : 'night', s.b > 0.3 ? 7 : 5.5) : col('linen', 6 + a * 4)); ctx.fillRect(x, y, 2, 2);
    if (!s.band && a > 0.93 && s.s > 2.6) { ctx.fillStyle = hexOf(col('linen', 7)); ctx.fillRect(x - 2, y, 2, 2); ctx.fillRect(x + 2, y, 2, 2); ctx.fillRect(x, y - 2, 2, 2); ctx.fillRect(x, y + 2, 2, 2); } });
  // a shooting star every 12–19 s
  const bucket = Math.floor(t / 15), sq = t - bucket * 15 - h1(bucket) * 4; if (sq > 0 && sq < 0.7) { const x0 = SX0 + 1500 + h1(bucket + 9) * 2600 + cx * kS, y0 = -960 + h1(bucket + 3) * 300; for (let k = 0; k < 12; k++) { const q = sq / 0.7 - k * 0.018; if (q < 0 || q > 1) continue; ctx.fillStyle = hexOf(col('linen', 10 - k * 0.8)); ctx.fillRect(sn(x0 - q * 420), sn(y0 + q * 210), 2, 2); } }
  ctx.drawImage(S.moon, sn(1750 - 110 + cx * 0.85), sn(-560 - 110 + cy * 0.45), 220, 220);
  S.clouds.forEach((c, i) => { const x = ((i * 1900 + t * (4 + i * 2)) % SXW) + SX0 + cx * 0.55, y = -640 + i * 110 + cy * 0.3; ctx.drawImage(c, sn(x), sn(y), 140, 36); });
  ctx.drawImage(S.mtn, sn(SX0 + cx * 0.35), sn(-16 - 340 + cy * 0.2), SXW, 340);
  ctx.drawImage(S.trees, sn(SX0 + cx * 0.12), sn(-10 - 140 + cy * 0.08), SXW, 140);
  ctx.drawImage(S.ground, SX0, -24, SXW, 48);
  // soil below the ground (the grid cells are drawn over it)
  const L = bv.toWorld(0, 0), Rr = bv.toWorld(1920, 1080), tx0 = Math.floor((Math.max(L.x, SX0) - SX0) / 300) * 300 + SX0, ty0 = 24;
  for (let y = ty0; y < Math.min(Rr.y, 1600); y += 200) { if (y + 200 < L.y) continue; for (let x = tx0; x < Math.min(Rr.x, SX0 + SXW); x += 300) ctx.drawImage(S.soil, x, y, 300, 200); }
  ctx.imageSmoothingEnabled = sm;
};

// floating motes over the base, as pixels: one art pixel (at the current zoom), a dimmer plus-shaped halo, three alpha steps
M.PXR.motes = function (ctx, bv) {
  const A = bv.amb; if (!A) return; const px = Math.max(2, Math.round(2 * bv.z)), core = hexOf(col('lamp', 10)), halo = hexOf(col('lamp', 7));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  A.p.forEach((p, i) => { const x = ((p.x - bv.x * p.z * 0.15) % A.W + A.W) % A.W, y = p.y - bv.y * p.z * 0.08; let a = 0.5 * p.z * (0.5 + 0.5 * Math.sin(p.ph * 1.2 + i)); a = a > 0.55 ? 1 : a > 0.3 ? 0.6 : a > 0.12 ? 0.3 : 0; if (!a) return;
    const X0 = Math.round(x / px) * px, Y0 = Math.round(y / px) * px; ctx.globalAlpha = a; ctx.fillStyle = core; ctx.fillRect(X0, Y0, px, px);
    if (a >= 0.6 && p.z > 0.9) { ctx.globalAlpha = a * 0.45; ctx.fillStyle = halo; ctx.fillRect(X0 - px, Y0, px, px); ctx.fillRect(X0 + px, Y0, px, px); ctx.fillRect(X0, Y0 - px, px, px); ctx.fillRect(X0, Y0 + px, px, px); } });
  ctx.restore();
};
})();
