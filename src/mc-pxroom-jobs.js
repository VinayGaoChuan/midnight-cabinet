// ==== mc-pxroom-jobs.js ====
(function () {
// Work in progress, as pixel scenes over the cell (see-through canvases, no frame):
// _scaffold — a room being built: timber scaffolding, a carpenter hammering on the top plank (sparks and a flash),
//             a worker sawing below, a swinging work lamp, dust sifting down. Drawn over the ghost of the room-to-be.
// _dig      — rock being dug: the tunnel eats in from the left as o.q grows, timbers go up behind the face, a drill
//             bit spins against the rock throwing sparks and chips, a miner swings a pick.
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, FY, TX, worker, n1 } = X;
const R = Math.random, steps = (t, per) => ((t % per) + per) % per / per;

X.def('_scaffold', {
  clear: 1, noFrame: 1, amb: [0.36, 0.3],
  paint(S, sc) {
    sc.light({ x: 60, y: 30, z: 14, r: 40, i: 1, c: '#fff0b0', tint: 0.5, bake: false });     // 0 hammer flash (dark until a blow kicks it; the swinging work lamp is a moving light)
    S.lay('mid');
    // poles, ledgers, planks, braces, a ladder
    [10, 73, 136].forEach(x => { S.beg(); S.box(x, 8, 4, FY - 8, 'wood', 5); S.end(); });
    [[40, 'wood'], [66, 'wood']].forEach(([y]) => { S.beg(); S.box(8, y, 134, 4, 'wood', 6, { top: 1 }); for (let x = 12; x < 140; x += 14) S.vl(x, y + 1, 2, 'wood', 3.5); S.end(); });
    S.beg(); S.line(14, 66, 73, 42, 'wood', 4, { w: 1 }); S.line(77, 66, 136, 42, 'wood', 4, { w: 1 }); S.end();
    S.beg(); S.vl(120, 44, FY - 44, 'wood', 6); S.vl(128, 44, FY - 44, 'wood', 5); for (let y = 48; y < FY; y += 6) S.hl(120, y, 9, 'wood', 6); S.end();
    // materials on the floor: bricks on a pallet, a stack of planks, a bucket
    S.lay('front'); S.beg(); S.box(22, FY - 3, 22, 3, 'wood', 4); for (let k = 0; k < 3; k++) for (let j = 0; j < 4 - k; j++) S.box(24 + j * 5 + k * 2, FY - 6 - k * 3, 5, 3, 'brick', 6); S.end();
    S.beg(); for (let k = 0; k < 4; k++) S.box(92 + k, FY - 2 - k * 2, 24, 2, 'wood', 6 - k * 0.3); S.end();
    S.beg(); S.poly([[56, FY], [63, FY], [64, FY - 7], [55, FY - 7]], 'iron', 5); S.hl(55, FY - 7, 10, 'iron', 8); S.ell(59.5, FY - 7, 3.5, 1, 'stone', 3); S.end();
  },
  anim(D, t, rs) {
    const st = rs.st; rs.mul[0] = 0;
    // work lamp on a cord from the top ledger, swinging; its light follows (bake: false, placed each frame)
    const a = Math.sin(t * 1.3) * 0.25, lx = 90 + Math.sin(a) * 14, ly = 40 + 3 + Math.cos(a) * 14;
    D.lay('mid'); D.line(90, 44, lx, ly - 2, 'hair', 3); D.rect(Math.round(lx) - 2, Math.round(ly) - 2, 5, 2, 'iron', 6); D.rect(Math.round(lx) - 1, Math.round(ly), 3, 2, 'lamp', 10, { e: 255 });
    rs.dl.push({ x: lx, y: ly + 1, z: 18, r: 100, i: 0.95, rgb: [255, 208, 138], tint: 0.3 });
    // carpenter on the top plank: hammer blows, sparks, a flash
    const hp = steps(t, 0.9), aF = hp < 0.55 ? 0.9 + hp / 0.55 * 1.8 : hp < 0.62 ? 2.7 - (hp - 0.55) / 0.07 * 1.9 : 0.8;
    worker(D, 50, 40, 'worker', { aF, eF: -0.2, aB: 0.6, eB: 0.8, lF: 0.25, lB: -0.2, tool: 'hammer', ta: 0.4, lean: 0.3 }, 1);
    if (hp > 0.6 && hp < 0.66 && !st.hit) { st.hit = 1; rs.burst('spark', 61, 30, 6, { sp: 30, ang: 0, spread: 2.2, life: 0.5, floor: 40 }); rs.flash(0, 1.4); rs.burst('dust', 60 + R() * 20, 44, 2, { life: 2, sp: 3 }); } if (hp > 0.8) st.hit = 0;
    // a worker below saws a plank on trestles
    const sw = Math.sin(t * 9) * 3; D.beg(); D.rect(95, FY - 10, 2, 10, 'wood', 4); D.rect(113, FY - 10, 2, 10, 'wood', 4); D.box(90, FY - 12, 30, 2, 'wood', 7); D.end();
    worker(D, 106, FY, 'worker', { aF: 1.5 + sw * 0.05, eF: -0.9, aB: 1.3, eB: -0.9, lean: 0.35, lF: 0.2, lB: -0.15 }, -1);
    D.line(98 + sw, FY - 13, 104 + sw, FY - 16, 'iron', 8); if (R() < 0.4) rs.burst('dust', 99 + sw, FY - 12, 1, { sp: 6, life: 0.8, ang: Math.PI, spread: 1.5 });
    if (R() < 0.05) rs.burst('dust', 10 + R() * 130, 10, 1, { life: 3, sp: 2 });
  },
});

X.def('_dig', {
  clear: 1, noFrame: 1, noFloor: 1, amb: [0.3, 0.26],
  paint() {},   // the work light moves with the face: it is a moving light (rs.dl)
  anim(D, t, rs, o) {
    const q = Math.min(1, 0.32 + (o.q || 0) * 0.62), face = Math.round(8 + q * 118), st = rs.st;
    // the tunnel: dark hollow with a ragged face, a floor of rubble, timbers every 22 px behind the face
    D.lay('wall');
    for (let y = 8; y < 97; y++) { const edge = face + Math.round(Math.sin(y * 0.7 + 1.3) * 2 + n1(y * 0.37) * 2); for (let x = 4; x < edge; x++) { const top = y < 14 + Math.round(n1(x * 0.21) * 2); if (top) continue; D.px(x, y, 'rock', y > 86 ? 3 + ((x * 7 + y) % 5 === 0 ? 2 : 0) : 1 + (x > edge - 3 ? 1.5 : 0) + ((x + y * 3) % 11 === 0 ? 1 : 0)); } D.px(edge, y, 'rock', 6); }
    for (let x = 12; x < face - 8; x += 22) { D.beg(); D.box(x, 16, 4, 72, 'wood', 5); D.box(x - 3, 13, 10, 3, 'wood', 6); D.end(); }
    D.lay('mid'); D.beg(); D.box(8, 13, Math.max(4, face - 14), 3, 'wood', 5.5); D.end();
    // work light hanging at the face
    const lx = Math.max(20, face - 20); D.line(lx, 16, lx, 26, 'hair', 3); D.rect(lx - 1, 26, 3, 2, 'lamp', 10, { e: 255 }); rs.dl.push({ x: lx, y: 28, z: 16, r: 100, i: 1, rgb: [255, 208, 112], tint: 0.35 });
    // drill against the face: housing, a spinning bit, sparks and chips
    const dy = 52, bx = face - 16; D.beg(); D.box(bx - 20, dy - 7, 20, 14, 'brass', 5); D.box(bx - 26, dy + 5, 26, 5, 'iron', 4); D.ell(bx - 22, dy + 11, 3, 3, 'iron', 3, { ring: 1 }); D.ell(bx - 6, dy + 11, 3, 3, 'iron', 3, { ring: 1 }); D.end();
    const sp = t * 26; for (let k = 0; k < 14; k++) { const w = Math.max(0, 6 - k * 0.42), off = Math.sin(sp + k * 0.9) * w * 0.5; D.vl(bx + k, Math.round(dy - w / 2 + off * 0.2), Math.max(1, Math.round(w)), 'iron', 6 + ((k + Math.floor(sp)) % 3 === 0 ? 3 : 0)); }
    if (R() < 0.6) rs.burst('spark', face - 2, dy + (R() - 0.5) * 6, 1, { sp: 34, ang: -Math.PI / 2, spread: 1.8, life: 0.45, floor: 90 });
    if (R() < 0.2) rs.burst('dust', face - 3, dy + (R() - 0.5) * 20, 1, { sp: 8, ang: -Math.PI / 2, spread: 1.2, life: 1.2 });
    // miner with a pick on the rubble
    const hp = steps(t, 1.1), aF = hp < 0.5 ? 0.8 + hp / 0.5 * 2 : hp < 0.58 ? 2.8 - (hp - 0.5) / 0.08 * 2.2 : 0.6;
    const mx = Math.max(24, face - 44); worker(D, mx, 88, 'worker', { aF, eF: -0.2, aB: 0.8, eB: 0.6, lF: 0.25, lB: -0.2, tool: 'hammer', ta: 0.9, lean: 0.25 }, 1);
    if (hp > 0.57 && hp < 0.63 && !st.hit) { st.hit = 1; rs.burst('dust', mx + 12, 80, 4, { sp: 16, life: 0.9, ang: 0, spread: 2 }); } if (hp > 0.8) st.hit = 0;
  },
});
})();
