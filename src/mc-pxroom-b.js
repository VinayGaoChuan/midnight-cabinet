// ==== mc-pxroom-b.js ====
(function () {
// Pixel rooms, batch b (written by the pixel-room workflow; see mc-pxroom-a.js for the pattern, docs/design.md §10.1)
// 训练场 training · 储藏室 storage · 监听室 lookout · 保险库 vault · 酒馆 tavern
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, FY, TX, worker, stroll, n1 } = X;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random;
const steps = (t, per) => ((t % per) + per) % per / per;   // 0…1 phase of a repeating cycle
const ease = (a) => { a = clamp(a, 0, 1); return a * a * (3 - 2 * a); };
const lerp = (a, b, k) => a + (b - a) * k;

// ───────── shared bits ─────────
// where a worker's front hand ends up for a pose (same rig as PXR.worker), so rooms can hang their own tools on it
function hand(x, y, p, dir) {
  const bob = Math.round(p.bob || 0), shY = y - 21 + bob, sx = x + Math.round((p.lean || 0) * 3 * dir), x0 = sx + dir, y0 = shY + 2, a1 = p.aF || 0, a2 = p.eF || 0;
  const ex = x0 + Math.sin(a1) * 5 * dir, ey = y0 + Math.cos(a1) * 5;
  return [Math.round(ex + Math.sin(a1 + a2) * 5 * dir), Math.round(ey + Math.cos(a1 + a2) * 5)];
}
// front-arm angles [aF, eF] that put a standing worker's hand (as hand() reports it) on tx, ty — two-link IK, elbow out
function armTo(x, y, lean, dir, tx, ty) {
  const sx = x + Math.round(lean * 3 * dir), x0 = sx + dir, y0 = y - 19, u = (tx - x0) * dir, v = ty - y0, d = Math.min(9.95, Math.hypot(u, v)), phi = Math.atan2(u, v), b = Math.acos(d / 10);
  return [phi + b, -2 * b];
}
// the back hand (the back arm has no hand pixels; rooms hang things on it)
function handB(x, y, p, dir) {
  const bob = Math.round(p.bob || 0), shY = y - 21 + bob, sx = x + Math.round((p.lean || 0) * 3 * dir), x0 = sx - 2 * dir, y0 = shY + 2, a1 = p.aB || 0, a2 = p.eB || 0;
  const ex = x0 + Math.sin(a1) * 5 * dir, ey = y0 + Math.cos(a1) * 5;
  return [Math.round(ex + Math.sin(a1 + a2) * 5 * dir), Math.round(ey + Math.cos(a1 + a2) * 5)];
}
// two-link IK for a standing worker's arm (back: true for the back arm), elbow hanging down: [angle, elbow] for tx, ty
function reach(x, y, lean, dir, tx, ty, back) {
  const sx = x + Math.round(lean * 3 * dir), x0 = back ? sx - 2 * dir : sx + dir, y0 = y - 19, u = (tx - x0) * dir, v = ty - y0, d = Math.min(9.95, Math.hypot(u, v)), phi = Math.atan2(u, v), b = Math.acos(d / 10), s = u >= 0 ? -1 : 1;
  return [phi + s * b, -2 * s * b];
}
// piecewise eased keyframes: keys [[q, a, b, …], …] sorted by q; holds the ends
function kf(q, keys) { if (q <= keys[0][0]) return keys[0].slice(1); for (let i = 1; i < keys.length; i++) if (q < keys[i][0]) { const A = keys[i - 1], B = keys[i], k = ease((q - A[0]) / (B[0] - A[0])); return A.slice(1).map((v, j) => lerp(v, B[j + 1], k)); } return keys[keys.length - 1].slice(1); }
// a small flame for torches, lanterns and candles (s px tall), flickering
function flame(D, x, y, s, t, ph) {
  const hh = Math.round(s * (0.8 + 0.25 * n1(t * 9 + ph))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.45)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, 'fire', clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); }
}
// wall torch: iron bracket and stick (static; the flame is animated at x, y − 1)
function torch(S, x, y) { S.beg(); S.box(x - 3, y + 6, 6, 3, 'iron', 5); S.line(x, y + 6, x, y, 'wood', 6, { w: 1 }); S.px(x - 1, y, 'wood', 4); S.px(x + 1, y, 'wood', 4); S.end(); }

// ───────── 训练场 training yard (medieval · train) ─────────
// a straw dummy with a spinning arm, a recruit drilling sword strokes at it, a lifter pressing a barbell, a weapon rack;
// every 8 s the recruit lands a spinning blow: the arm whirls, straw bursts, golden sparks of experience rise
const DUM = [52, 58];   // dummy post x, arm height
X.def('training', {
  amb: [0.3, 0.28],
  paint(S, sc) {
    X.shell(S, sc, 'medieval');
    sc.light({ x: 44, y: 33, z: 10, r: 78, i: 1.1, c: '#ff9a40', fl: 'fire', tint: 0.45 });                 // 0 torch left
    sc.light({ x: 118, y: 33, z: 10, r: 78, i: 1.1, c: '#ff9a40', fl: 'fire', ph: 3, tint: 0.45 });          // 1 torch right
    sc.light({ x: 68, y: 26, z: 22, r: 96, i: 0.75, c: '#ffd8a0', fl: 'candle', ph: 1.7, tint: 0.25 });      // 2 hanging oil lamp
    sc.light({ x: DUM[0], y: 54, z: 16, r: 58, i: 1.3, c: '#ffd050', tint: 0.6, bake: false });             // 3 the experience flare (off until the big blow)
    // floor: a chalk sparring ring around the dummy, scuffed
    S.lay('wall'); for (let k = 0; k < 90; k++) { const a = k / 90 * Math.PI * 2, x = DUM[0] + 6 + Math.cos(a) * 30, y = 96 + Math.sin(a) * 4.2; if ((k % 9) < 7) S.px(x, y, 'linen', 5.5); }
    S.hl(DUM[0] - 14, 99, 5, 'linen', 4.5); S.hl(DUM[0] + 18, 93, 4, 'linen', 4.5);
    // weapon rack: wooden practice swords hilt-up, two spears leaning by it, a painted shield above
    S.lay('back');
    S.beg(); S.box(5, 46, 3, 44, 'wood', 4); S.box(27, 46, 3, 44, 'wood', 4); S.box(4, 45, 27, 3, 'wood', 6, { top: 1 }); S.box(4, 80, 27, 3, 'wood', 5); for (let x = 10; x < 28; x += 6) S.px(x + 1, 45, 'wood', 2); S.end();
    [10, 16, 22].forEach((x, i) => { S.beg(); S.rect(x, 48, 3, 2, 'brass', 7); S.px(x + 1, 48, 'brass', 9); S.rect(x, 50, 3, 4, 'leather', 5 - i * 0.4); S.hl(x, 51, 3, 'leather', 3); S.rect(x - 2, 54, 7, 2, 'brass', 6); S.hl(x - 2, 54, 7, 'brass', 8);
      const bl = 22 - i * 2; S.rect(x, 56, 3, bl, 'wood', 7.5); S.vl(x, 56, bl, 'wood', 9); S.vl(x + 2, 56, bl, 'wood', 5.5); S.px(x + 1, 56 + bl, 'wood', 7); S.end(); });
    [[33, 16, 1], [37, 20, -1]].forEach(([x, y]) => { S.beg(); S.vl(x, y + 7, 89 - y - 7, 'wood', 6.5); S.vl(x + 1, y + 7, 89 - y - 7, 'wood', 4.5); S.poly([[x - 1.5, y + 7], [x + 1, y - 1], [x + 3.5, y + 7]], 'iron', 7.5); S.vl(x + 1, y + 1, 5, 'iron', 10); S.hl(x - 1, y + 7, 4, 'leather', 5); S.hl(x - 1, y + 8, 4, 'leather', 3); S.end(); });
    S.beg(); S.ell(17, 30, 8, 8, 'wood', 6, { dome: 1 }); S.poly([[17, 22], [25, 30], [17, 38], [9, 30]], 'crimson', 6.5); S.ell(17, 30, 8, 8, 'iron', 7, { ring: 1.2 }); S.ell(17, 30, 2.5, 2.5, 'brass', 8, { dome: 1 }); S.px(16, 29, 'brass', 10); S.end();
    // torches
    torch(S, 44, 34); torch(S, 118, 34);
    // banner of the yard: crossed swords over a shield, gold trim
    const bx = 88; S.beg(); S.hcyl(bx - 2, 11, 22, 2, 'wood', 6); S.vgrad(bx, 13, 18, 32, 'crimson', 5.5, 4.5); S.vl(bx, 13, 32, 'crimson', 6.5); S.vl(bx + 17, 13, 32, 'crimson', 3.5);
    for (let k = 0; k < 18; k += 3) { S.px(bx + k, 45, 'crimson', 4); S.px(bx + k + 1, 45, 'crimson', 4); S.px(bx + k + 1, 46, 'crimson', 3); }
    S.hl(bx, 14, 18, 'gold', 7); S.hl(bx, 43, 18, 'gold', 5);
    S.line(bx + 3, 20, bx + 14, 33, 'iron', 9); S.line(bx + 14, 20, bx + 3, 33, 'iron', 8); S.hl(bx + 3, 31, 3, 'gold', 7); S.hl(bx + 12, 31, 3, 'gold', 7); S.px(bx + 2, 34, 'gold', 6); S.px(bx + 15, 34, 'gold', 6);
    S.poly([[bx + 5, 24], [bx + 12, 24], [bx + 12, 29], [bx + 8.5, 33], [bx + 5, 29]], 'gold', 6); S.poly([[bx + 6, 25], [bx + 11, 25], [bx + 11, 28], [bx + 8.5, 31], [bx + 6, 28]], 'crimson', 7); S.end();
    // an archery butt: straw boss, painted rings, three arrows stuck in it
    S.beg(); S.ell(131, 29, 8, 8, 'sand', 6, { dome: 1 }); S.ell(131, 29, 6.2, 6.2, 'linen', 8.5); S.ell(131, 29, 4.4, 4.4, 'tile', 6); S.ell(131, 29, 2.6, 2.6, 'crimson', 7); S.ell(131, 29, 1, 1, 'gold', 9); S.ell(131, 29, 8, 8, 'sand', 4, { ring: 1 });
    S.line(126, 37, 123, 44, 'wood', 4); S.line(136, 37, 139, 44, 'wood', 4); S.end();
    [[129, 27, -1, -1], [134, 31, 1, -1], [132, 24, 1, -1]].forEach(([x, y, dx, dy]) => { S.beg(); S.line(x, y, x + dx * 6, y + dy * 5, 'wood', 7); S.px(x + dx * 6, y + dy * 5, 'linen', 9); S.px(x + dx * 7, y + dy * 5, 'crimson', 7); S.px(x + dx * 6, y + dy * 6, 'crimson', 6); S.end(); });
    // lifting corner: a plate tree (plates face-on on their pegs), a barbell resting on low stands
    S.beg(); S.cyl(136, 54, 3, 34, 'iron', 6, { rim: 1 }); S.box(129, 87, 17, 3, 'iron', 5, { top: 1 }); [58, 69, 80].forEach(y => S.hl(135, y, 5, 'iron', 8)); S.end();
    [[137.5, 60, 4.2, 7], [137.5, 71, 5.8, 6.5], [137.5, 81, 7, 6]].forEach(([x, y, r, tn]) => { S.beg(); S.ell(x, y, r, r, 'iron', tn, { dome: 1 }); S.ell(x, y, r, r, 'iron', tn + 1.5, { ring: 1 }); S.ell(x, y, r * 0.55, r * 0.55, 'iron', tn - 1.5, { ring: 1 }); S.rect(x - 1, y - 1, 2, 2, 'ink', 1); S.px(x - Math.round(r * 0.55), y - Math.round(r * 0.7), 'iron', 10); S.end(); });
    // the dummy (mid): cross foot, post, straw body bound with rope, a painted target; head and arm are animated
    S.lay('mid'); const dx = DUM[0];
    S.beg(); S.box(dx - 11, 86, 23, 4, 'wood', 5, { top: 1 }); S.box(dx - 2, 83, 5, 3, 'wood', 4); S.end();
    S.beg(); S.cyl(dx - 1, 50, 4, 34, 'wood', 5, { rim: 1.5 }); S.end();
    S.beg(); S.cyl(dx - 6, 52, 13, 21, 'sand', 6, { rim: 2.5 }); S.noise(dx - 6, 52, 13, 21, 1, 2, 5); S.ell(dx, 72.5, 6, 1.4, 'sand', 5);
    for (let k = 0; k < 13; k += 2) { S.px(dx - 6 + k, 73, 'sand', 7); S.px(dx - 6 + k + 1, 74, 'sand', 5); }
    [55, 63, 70].forEach(y => { S.hl(dx - 6, y, 13, 'leather', 4); S.px(dx - 6, y, 'leather', 2); });
    S.ell(dx + 1, 61, 3.5, 3.5, 'crimson', 6); S.ell(dx + 1, 61, 2, 2, 'linen', 8); S.px(dx + 1, 61, 'crimson', 7); S.end();
    // oil lamp on a chain from the beam, near the eye
    S.lay('front'); const lx = 68; S.beg(); for (let y = 9; y < 20; y += 2) { S.px(lx, y, 'iron', 5); S.px(lx, y + 1, 'iron', 3); } S.poly([[lx - 4, 20], [lx + 4, 20], [lx + 3, 23], [lx - 3, 23]], 'iron', 6); S.rect(lx - 3, 27, 7, 2, 'iron', 4); S.vl(lx - 3, 23, 4, 'iron', 5); S.vl(lx + 3, 23, 4, 'iron', 4); S.end();
    S.rect(lx - 2, 23, 5, 4, 'lamp', 9, { e: 3 }); S.px(lx, 24, 'lamp', 11, { e: 3 }); S.px(lx - 1, 25, 'lamp', 10, { e: 3 });
    // a water bucket and a towel on the floor, near the eye
    S.beg(); S.cyl(5, 81, 11, 9, 'wood', 5, { rim: 2 }); S.hcyl(5, 83, 11, 1, 'iron', 5); S.hcyl(5, 87, 11, 1, 'iron', 4); S.ell(10.5, 81, 5.5, 1.2, 'water', 4, { n: [0, -0.9] }); S.hl(8, 81, 3, 'water', 7); S.line(13, 81, 16, 74, 'wood', 6); S.rect(15, 72, 3, 2, 'wood', 5); S.end();
    S.beg(); S.poly([[17, 90], [27, 90], [26, 86], [19, 87]], 'linen', 8); S.hl(19, 88, 6, 'linen', 6); S.end();
    // a pair of dumbbells on the floor, near the eye
    [[119, 89], [128, 90]].forEach(([x, y]) => { S.beg(); S.hl(x + 2, y - 2, 5, 'iron', 7); S.box(x, y - 4, 3, 4, 'iron', 5); S.box(x + 7, y - 4, 3, 4, 'iron', 5); S.px(x, y - 4, 'iron', 9); S.px(x + 7, y - 4, 'iron', 9); S.end(); });
    sc.emit({ k: 'dust', x: 80, y: 40, w: 60, h: 30, rate: 1.2, sp: 2, life: 3.5 });
  },
  anim(D, t, rs) {
    const st = rs.st, dt = st.lt == null ? 0 : clamp(t - st.lt, 0, 0.1); st.lt = t; const dx = DUM[0];
    // the big blow every 8 s; ordinary strokes in between
    const bq = steps(t, 8), big = bq > 0.74 && bq < 0.86, bk = (bq - 0.74) / 0.12;
    const sp = steps(t, 1.25);
    // pose keys: [aF, eF, blade angle, lean]; guard → wind-up → cut → follow-through → guard
    const G = [0.5, 1.3, 2.4, 0.1], U = [2.9, 0.6, 3.6, -0.2], C = [1.45, 0, 1.45, 0.6], F = [0.95, 0, 0.9, 0.5];
    const mix = (A, B, k) => A.map((v, i) => lerp(v, B[i], k));
    let k4, lunge = 0, bob = 0;
    if (big) { const up = Math.sin(clamp(bk, 0, 1) * Math.PI); lunge = up; bob = -Math.round(3 * up);
      k4 = bk < 0.45 ? mix(G, [3.2, 0.7, 4, -0.4], ease(bk / 0.45)) : bk < 0.6 ? mix([3.2, 0.7, 4, -0.4], C, (bk - 0.45) / 0.15) : bk < 0.75 ? mix(C, F, (bk - 0.6) / 0.15) : mix(F, G, ease((bk - 0.75) / 0.25)); }
    else { const k = sp; k4 = k < 0.4 ? mix(G, U, ease(k / 0.4)) : k < 0.5 ? mix(U, C, (k - 0.4) / 0.1) : k < 0.58 ? mix(C, F, (k - 0.5) / 0.08) : mix(F, G, ease((k - 0.58) / 0.42)); lunge = k > 0.45 && k < 0.75 ? 0.5 : 0; }
    const pose = { aF: k4[0], eF: k4[1], aB: 0.3 + k4[3] * 0.6, eB: -0.5, lF: 0.35 + lunge * 0.4, kF: 0.1 - lunge * 0.2, lB: -0.35 - lunge * 0.3, kB: 0.2 + lunge * 0.4, lean: k4[3], bob };
    // hits: a normal stroke nudges the arm round; the big blow whirls it, bursts straw and lights the yard gold
    const hitNow = big ? (bk > 0.56 && !st.bh) : (sp > 0.47 && sp < 0.6 && !st.h);
    const npc = !X.noWorkers;   // a room still being built: no people, so nothing is swung, lifted or carried
    if (hitNow && npc) {
      if (big) { st.bh = 1; st.av = (st.av || 0) + 26; st.wob = 1; rs.burst('dust', dx + 2, 60, 18, { sp: 34, life: 1.4, w: 8, h: 14 }); rs.burst('glint', dx, 56, 7, { sp: 30, ang: 0, spread: 2.2, life: 0.9 }); rs.burst('ember', dx, 60, 8, { sp: 14, ang: 0, spread: 1.4, life: 1.8, w: 10 }); rs.flash(0, 0.3); rs.flash(1, 0.3); st.xp = 1; }
      else { st.h = 1; st.av = (st.av || 0) + 5; st.wob = 0.5; rs.burst('dust', dx + 5, 60, 3, { sp: 16, ang: 1.2, spread: 1.5, life: 0.9 }); }
    }
    if (sp > 0.8) st.h = 0; if (!big) st.bh = 0;
    st.av = (st.av || 0) * Math.exp(-dt * 1.6); st.ang = ((st.ang || 0) + st.av * dt) % (Math.PI * 2); st.wob = Math.max(0, (st.wob || 0) - dt * 2.5);
    st.xp = Math.max(0, (st.xp || 0) - dt * 1.1); rs.mul[3] = st.xp * st.xp;
    if (st.xp > 0.4 && R() < 0.5) rs.burst('glint', dx + (R() - 0.5) * 20, 50 + R() * 16, 1, { sp: 10, ang: 0, spread: 0.6, life: 0.8 });
    // the dummy's arm: a padded bar turning round the post (behind the body when it faces away)
    const ca = Math.cos(st.ang), sa = Math.sin(st.ang), L = 12, ay = DUM[1];
    D.lay(sa < 0 ? 'back' : 'mid'); D.beg(); const x1 = Math.round(dx + 1 + ca * L), x2 = Math.round(dx + 1 - ca * L);
    D.hcyl(Math.min(x1, x2), ay, Math.abs(x1 - x2) + 1, 2, 'wood', sa < 0 ? 4 : 6, { rim: 1 });
    [x1, x2].forEach(x => { D.rect(x - 1, ay - 1, 3, 4, 'leather', sa < 0 ? 4 : 6); D.px(x - 1, ay - 1, 'leather', 8); }); D.end();
    // the head bobs on its neck when struck
    D.lay('mid'); const hw = Math.round(Math.sin(t * 30) * st.wob * 1.5);
    D.beg(); D.ell(dx + 0.5 + hw, 45, 5, 5.5, 'sand', 6, { dome: 1 }); D.rect(dx - 2 + hw, 50, 6, 2, 'leather', 4); D.px(dx - 1 + hw, 39, 'sand', 8); D.px(dx + 3 + hw, 40, 'sand', 3);
    D.px(dx - 2 + hw, 44, 'ink', 1); D.px(dx - 1 + hw, 45, 'ink', 1); D.px(dx - 2 + hw, 46, 'ink', 1); D.px(dx - 1 + hw, 43, 'ink', 1);   // stitched eyes
    D.px(dx + 2 + hw, 44, 'ink', 1); D.px(dx + 3 + hw, 45, 'ink', 1); D.px(dx + 2 + hw, 46, 'ink', 1); D.px(dx + 3 + hw, 43, 'ink', 1);
    D.hl(dx - 1 + hw, 48, 4, 'leather', 3); D.end();
    // the recruit: faces the dummy, wooden sword
    const rx = 72, look = { skin: ['skin', 6], hair: ['hair', 4], top: ['crimson', 6], bot: ['leather', 4], boot: ['leather', 2], cap: ['iron', 8] };
    worker(D, rx, FY, look, pose, -1);
    const [hx, hy] = hand(rx, FY, pose, -1), a = k4[2], sdx = -Math.sin(a), sdy = Math.cos(a);
    if (npc) { D.beg(); D.line(hx + sdx * 2 + 1, hy + sdy * 2, hx + sdx * 13 + 1, hy + sdy * 13, 'wood', 5.5); D.line(hx + sdx * 2, hy + sdy * 2, hx + sdx * 13, hy + sdy * 13, 'wood', 9); D.px(Math.round(hx + sdx * 13), Math.round(hy + sdy * 13), 'wood', 6);
    D.line(hx + sdx * 2 - sdy * 2, hy + sdy * 2 + sdx * 2, hx + sdx * 2 + sdy * 2, hy + sdy * 2 - sdx * 2, 'wood', 4); D.end(); }
    // the lifter: push press, every 3 s; a bead of sweat at the top
    const lp = steps(t, 3.2); let pr, dip = 0;
    if (lp < 0.2) { pr = 0; dip = Math.sin(lp / 0.2 * Math.PI); } else if (lp < 0.35) pr = ease((lp - 0.2) / 0.15); else if (lp < 0.6) pr = 1; else if (lp < 0.8) pr = 1 - ease((lp - 0.6) / 0.2); else pr = 0;
    const lx = 110, lpose = { aF: lerp(1.2, 3.0, pr), eF: lerp(1.23, 0.05, pr), aB: lerp(1.1, 2.95, pr), eB: lerp(1.2, 0.1, pr), lF: 0.15 + dip * 0.4, kF: -dip * 0.1, lB: -0.15 + dip * 0.3, kB: dip * 0.5, bob: Math.round(dip * 2) };
    worker(D, lx, FY, { skin: ['skin', 5], hair: ['hair', 2], top: ['linen', 6], bot: ['leather', 3], boot: ['hair', 2], beard: ['hair', 3] }, lpose, -1);
    const [px, py] = hand(lx, FY, lpose, -1);
    if (npc) { D.beg(); const bc = lx - 1; D.hcyl(bc - 12, py, 25, 2, 'iron', 8, { rim: 1 }); [[-11, 12], [-9, 9], [8, 9], [10, 12]].forEach(([o, h]) => { D.box(bc + o, py + 1 - h / 2, 2, h, 'iron', 5); D.vl(bc + o, py + 2 - h / 2, h - 2, 'iron', 7); }); D.end(); }
    // torch flames and the lamp's flicker
    flame(D, 44, 33, 6, t, 0.4); flame(D, 118, 33, 6, t, 2.1);
  },
});

// ───────── 储藏室 storeroom (cartoon · store) ─────────
// shelves of the five support items (a jar of lightning, candles, an old frame, a bell, a dice cup), a tower of crates
// with a pink balloon tied on top, and a clerk packing the march pack; every third throw is a golden one
const ITEM5 = ['bolt', 'candle', 'frame', 'bell', 'die'];
// a support item, 5–7 px, centred on x, y (so it can be painted on a shelf, in a hand or in flight)
function itemPx(S, kind, x, y, gold) {
  x = Math.round(x); y = Math.round(y); const g = gold ? { e: 255 } : undefined;
  if (kind === 'bolt') { S.rect(x - 2, y - 2, 5, 5, 'glass', 4, g); S.hl(x - 2, y - 3, 5, 'brass', 7, g); S.px(x, y - 1, 'ice', 10, { e: 255 }); S.px(x - 1, y, 'ice', 9, { e: 255 }); S.px(x, y + 1, 'ice', 10, { e: 255 }); S.px(x - 2, y - 2, 'glass', 9, g); }
  else if (kind === 'candle') { S.rect(x - 1, y - 2, 3, 5, 'linen', 9, g); S.hl(x - 2, y + 3, 5, 'brass', 7, g); S.px(x, y - 3, 'fire', 10, { e: 255 }); S.px(x, y - 4, 'fire', 8, { e: 255 }); }
  else if (kind === 'frame') { S.rect(x - 3, y - 3, 7, 7, 'gold', 6, g); S.rect(x - 2, y - 2, 5, 5, 'lav', 3, g); S.px(x, y - 1, 'bone', 8, g); S.px(x, y, 'bone', 7, g); S.px(x - 3, y - 3, 'gold', 9, g); }
  else if (kind === 'bell') { S.poly([[x - 3, y + 3], [x + 4, y + 3], [x + 2, y - 2], [x - 1, y - 2]], 'brass', 7, g); S.hl(x - 1, y - 3, 3, 'brass', 8, g); S.px(x, y + 3, 'brass', 4, g); S.vl(x - 1, y - 1, 3, 'brass', 10, g); }
  else die5(S, x - 2, y - 2, 5, g);
}
// a 5×5 die, top-left at x, y: a lit top and left edge, a shaded right and bottom edge, ink pips for faces 2, 3, 5
const PIPS = { 2: [[1, 1], [3, 3]], 3: [[3, 1], [2, 2], [1, 3]], 5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]] };
function die5(S, x, y, face, g) {
  S.rect(x, y, 5, 5, 'linen', 9, g); S.hl(x, y, 5, 'linen', 10, g); S.vl(x + 4, y + 1, 4, 'linen', 7, g); S.hl(x, y + 4, 5, 'linen', 6.5, g);
  PIPS[face].forEach(([a, b]) => S.px(x + a, y + b, 'ink', 1));
}
// a cartoon crate: planks, a darker frame, a stencilled mark
function crate(S, x, y, w, h, tn, mark) {
  S.beg(); S.box(x, y, w, h, 'wood', tn, { top: 2 }); for (let k = 3; k < h - 2; k += 4) S.hl(x + 2, y + k, w - 4, 'wood', tn - 1.4);
  S.rect(x, y, 2, h, 'wood', tn - 1.8); S.rect(x + w - 2, y, 2, h, 'wood', tn - 2.2); S.hl(x, y, w, 'wood', tn + 1);
  const cx = x + Math.floor(w / 2), cy = y + Math.floor(h / 2);
  if (mark === 'star') { S.px(cx, cy - 2, 'candy', 8); S.hl(cx - 2, cy - 1, 5, 'candy', 8); S.hl(cx - 1, cy, 3, 'candy', 8); S.px(cx - 1, cy + 1, 'candy', 8); S.px(cx + 1, cy + 1, 'candy', 8); }
  else if (mark === 'up') { S.vl(cx, cy - 2, 5, 'linen', 8); S.hl(cx - 1, cy - 1, 3, 'linen', 8); S.px(cx - 2, cy, 'linen', 8); S.px(cx + 2, cy, 'linen', 8); }
  else if (mark === 'cross') { S.rect(cx - 1, cy - 2, 3, 5, 'red', 7); S.rect(cx - 2, cy - 1, 5, 3, 'red', 7); }
  else if (mark === 'glass') { S.poly([[cx - 2, cy - 2], [cx + 3, cy - 2], [cx + 1, cy + 1], [cx, cy + 1]], 'tile', 8); S.vl(cx, cy + 1, 2, 'tile', 8); S.hl(cx - 1, cy + 3, 3, 'tile', 8); }
  S.end();
}
const PACK = [126, 60], CHK = [80, 25];   // the march pack's mouth; the packing list's slate (top-left)
X.def('storage', {
  amb: [0.32, 0.3],
  paint(S, sc) {
    X.shell(S, sc, 'cartoon');
    S.lay('wall'); [93, 99].forEach(y => S.rect(0, y, 6, 3, 'lav', 5));   // the checker floor's odd rows start at x 6: close the gap at the left edge
    sc.light({ x: 108, y: 34, z: 24, r: 70, i: 1.0, c: '#ffc8dc', fl: 'candle', ph: 0.6, tint: 0.1 });            // 0 hanging lamp (its pool falls on the packing table)
    sc.light({ x: 128, y: 26, z: 8, r: 50, i: 0.75, c: '#ff70c8', fl: 'pulse', amp: 0.12, sp: 2.4, tint: 0.6 });   // 1 neon star
    sc.light({ x: 14, y: 25, z: 8, r: 34, i: 0.55, c: '#80d0ff', fl: 'buzz', ph: 2, tint: 0.3 });                  // 2 jar of lightning
    sc.light({ x: 15, y: 44, z: 8, r: 28, i: 0.5, c: '#ffb060', fl: 'candle', ph: 3, tint: 0.45 });                // 3 candles
    // fairy lights: a sagging string under the ceiling (bulbs are animated)
    S.lay('back'); for (let x = 5; x < 146; x++) { const u = ((x - 5) % 47) / 47, y = 9 + Math.round(Math.sin(u * Math.PI) * 5); S.px(x, y, 'ink', 2); }
    // shelving: three boards of support items
    S.beg(); S.box(5, 16, 3, 74, 'wood', 5); S.box(45, 16, 3, 74, 'wood', 4); [31, 51, 71].forEach(y => { S.box(5, y, 43, 3, 'wood', 6.5, { top: 1 }); }); S.box(5, 14, 43, 3, 'wood', 6); S.end();
    S.ao(8, 17, 37, 14, 't', 1.5); S.ao(8, 34, 37, 17, 't', 1.5); S.ao(8, 54, 37, 17, 't', 1.5);
    // top board: the jar of lightning, a bell, the dice cup with two dice
    S.beg(); S.rect(10, 20, 9, 11, 'glass', 3); S.rect(10, 20, 9, 1, 'glass', 8); S.vl(10, 21, 10, 'glass', 7); S.rect(9, 18, 11, 2, 'brass', 7); S.hl(9, 18, 11, 'brass', 9); S.px(17, 22, 'glass', 10); S.end();
    S.beg(); S.poly([[21, 30], [30, 30], [28, 23], [23, 23]], 'brass', 7); S.hl(23, 22, 5, 'brass', 8); S.px(25, 21, 'brass', 6); S.vl(23, 24, 5, 'brass', 10); S.hl(21, 30, 9, 'brass', 5); S.px(25, 31, 'brass', 4); S.end();
    // the dice cup turned over, one die on top of it and one in front (five pips and two, so they read as dice)
    S.beg(); S.poly([[37, 30], [44, 30], [43, 24], [38, 24]], 'crimson', 6); S.hl(38, 24, 5, 'crimson', 8); S.vl(38, 25, 5, 'crimson', 7.5); S.hl(37, 29, 7, 'gold', 6); S.end();
    S.beg(); die5(S, 31, 26, 5); S.end(); S.beg(); die5(S, 38, 19, 2); S.end();
    // middle board: three candles, the old frame (a pale face), rolled scrolls
    [[9, 42], [13, 40], [17, 43]].forEach(([x, y]) => { S.beg(); S.rect(x, y, 3, 51 - y, 'linen', 9); S.vl(x, y, 51 - y, 'linen', 10); S.vl(x + 2, y, 51 - y, 'linen', 7); S.px(x + 1, y - 1, 'hair', 2); S.end(); });
    S.beg(); S.box(22, 37, 13, 14, 'gold', 6); S.rect(24, 39, 9, 10, 'lav', 3); S.ell(28.5, 44, 2.5, 3, 'bone', 7); S.px(27, 43, 'ink', 1); S.px(30, 43, 'ink', 1); S.hl(24, 48, 9, 'lav', 4.5); S.end();
    S.beg(); for (let k = 0; k < 3; k++) { S.hcyl(36 + (k % 2), 46 - k * 3, 9, 3, 'paper', 8, { rim: 1 }); S.px(36 + (k % 2), 47 - k * 3, 'paper', 5); S.px(40 + (k % 2), 46 - k * 3, 'red', 7); } S.end();
    // bottom board: potions, a sack, a tin
    [[9, 'red'], [14, 'teal'], [19, 'pink']].forEach(([x, m], i) => { S.beg(); S.rect(x, 64 + (i % 2), 4, 7 - (i % 2), m, 7); S.hl(x, 64 + (i % 2), 4, m, 9); S.rect(x + 1, 61 + (i % 2), 2, 3, 'glass', 7); S.px(x + 1, 60 + (i % 2), 'wood', 6); S.px(x, 66, m, 10); S.end(); });
    S.beg(); S.ell(31, 66, 5, 5, 'sand', 7, { dome: 1 }); S.rect(29, 60, 5, 2, 'sand', 6); S.hl(29, 62, 5, 'leather', 4); S.end();
    S.beg(); S.cyl(38, 62, 6, 9, 'tile', 7, { rim: 1.5 }); S.hl(38, 62, 6, 'tile', 10); S.hl(38, 66, 6, 'linen', 9); S.end();
    // the neon star (glows with light 1) on a dark board
    S.beg(); S.box(115, 13, 27, 26, 'lav', 2); S.rect(116, 14, 25, 24, 'night', 2); S.end();
    const star = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 4.2 : 10; star.push([128 + Math.cos(a) * r, 26 + Math.sin(a) * r]); }
    for (let k = 0; k < 10; k++) { const a = star[k], b = star[(k + 1) % 10]; S.line(a[0], a[1], b[0], b[1], 'candy', 10, { e: 2 }); }
    S.px(128, 16, 'candy', 10, { e: 2 }); S.vl(120, 8, 5, 'iron', 4); S.vl(136, 8, 5, 'iron', 4);
    // lamp over the packing table
    S.beg(); S.vl(102, 7, 5, 'iron', 4); S.poly([[96, 12], [108, 12], [110, 17], [94, 17]], 'candy', 7); S.hl(96, 12, 12, 'candy', 9); S.hl(94, 16, 16, 'candy', 5); S.end(); S.rect(99, 17, 6, 1, 'lamp', 10, { e: 1 }); S.px(102, 18, 'lamp', 11, { e: 1 });
    // the packing list: a chalkboard with the five items chalked in their colours and a box for each (ticks are animated)
    S.beg(); S.box(CHK[0] - 2, CHK[1] - 2, 29, 30, 'wood', 6); S.rect(CHK[0], CHK[1], 25, 26, 'moss', 3); S.end();
    S.ao(CHK[0], CHK[1], 25, 5, 't', 1); [[-1, -1], [25, -1], [-1, 26], [25, 26]].forEach(([a, b]) => S.px(CHK[0] + a, CHK[1] + b, 'iron', 8));
    [1, 2, 4, 5, 6, 8, 9, 11, 12, 13].forEach(k => S.px(CHK[0] + 3 + k, CHK[1] + 2, 'linen', 7.5));   // a chalk heading
    { const ic = [['..#', '##.', '#..', 'ice', 9], ['.#.', '.#.', '.#.', 'linen', 9], ['###', '#.#', '###', 'gold', 7.5], ['.#.', '###', '###', 'brass', 8.5], ['###', '###', '###', 'linen', 8.5]], ln = [[6, 3], [4, 5], [8, 0], [3, 4], [5, 3]];
      ic.forEach((c, i) => { const y = CHK[1] + 6 + i * 4, x = CHK[0] + 3; for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) if (c[r][k] === '#') S.px(x + k, y - 1 + r, c[3], c[4]);
        if (i === 1) S.px(x + 1, y - 1, 'fire', 8); if (i === 4) S.px(x + 1, y, 'moss', 2);
        const [a, b] = ln[i]; S.hl(x + 5, y, a, 'linen', 6.5); if (b) S.hl(x + 6 + a, y, b, 'linen', 6);
        S.px(CHK[0] + 18, y - 1, 'linen', 7); S.px(CHK[0] + 19, y - 1, 'linen', 7); S.px(CHK[0] + 20, y - 1, 'linen', 7); S.px(CHK[0] + 18, y, 'linen', 6.5); S.px(CHK[0] + 20, y, 'linen', 6.5); S.px(CHK[0] + 18, y + 1, 'linen', 6); S.px(CHK[0] + 19, y + 1, 'linen', 6); S.px(CHK[0] + 20, y + 1, 'linen', 6); }); }
    S.beg(); S.box(CHK[0] - 3, CHK[1] + 27, 31, 2, 'wood', 6.5, { top: 1 }); S.end(); S.hl(CHK[0] + 17, CHK[1] + 25, 3, 'linen', 10); S.beg(); S.box(CHK[0] + 6, CHK[1] + 24, 6, 2, 'candy', 7); S.hl(CHK[0] + 6, CHK[1] + 25, 6, 'wood', 5); S.end();
    // the tower of crates (mid), a balloon tied to the top one (animated)
    S.lay('mid');
    crate(S, 49, 75, 19, 15, 6, 'up'); crate(S, 68, 77, 17, 13, 5.5, 'glass'); crate(S, 55, 61, 20, 14, 6.5, 'star'); crate(S, 76, 67, 10, 10, 5, 'cross'); crate(S, 60, 50, 12, 11, 6, null);
    S.beg(); S.rect(64, 49, 4, 1, 'crimson', 7); S.px(66, 48, 'crimson', 8); S.end();   // the knot of the balloon string
    // packing table, the march pack on it (open, flap back), a basket of items on the floor
    S.beg(); S.box(106, 70, 36, 4, 'wood', 6.5, { top: 2 }); S.box(108, 74, 3, 16, 'wood', 4.5); S.box(137, 74, 3, 16, 'wood', 4); S.hl(111, 80, 26, 'wood', 4); S.end();
    // the march pack: army-green canvas, an open drawstring mouth, a front pocket with a brass buckle, leather straps, a bedroll
    S.beg(); S.rect(117, 59, 19, 11, 'leaf', 5.5); S.ell(126.5, 59, 9.5, 5, 'leaf', 6, { dome: 1 }); S.vl(117, 59, 11, 'leaf', 7); S.vl(135, 59, 11, 'leaf', 4); S.hl(117, 69, 19, 'leaf', 3.5);
    S.ell(126.5, 55.5, 6.5, 1.6, 'ink', 1); S.hl(121, 54, 11, 'leaf', 8); S.px(120, 55, 'leather', 7); S.px(133, 55, 'leather', 7);
    S.box(121, 62, 11, 7, 'leaf', 6.8); S.hl(121, 62, 11, 'leaf', 8.5); S.rect(121, 62, 11, 2, 'leaf', 7.8); S.rect(125, 63, 3, 3, 'brass', 8); S.px(125, 63, 'brass', 10); S.px(126, 64, 'leaf', 4);
    S.vl(119, 57, 13, 'leather', 5); S.vl(133, 57, 13, 'leather', 4.5); S.end();
    S.beg(); S.hcyl(115, 66, 23, 4, 'crimson', 6, { rim: 1.5 }); S.vl(117, 66, 4, 'crimson', 4); S.vl(135, 66, 4, 'crimson', 4); S.hl(119, 67, 3, 'leather', 5); S.hl(131, 67, 3, 'leather', 5); S.end();
    S.beg(); S.poly([[84, 90], [97, 90], [98, 82], [83, 82]], 'sand', 6); for (let x = 85; x < 97; x += 2) { S.vl(x, 83, 7, 'sand', 4.5); } S.hl(83, 82, 16, 'sand', 8); S.end();
    itemPx(S, 'bell', 87, 80); itemPx(S, 'die', 92, 80); itemPx(S, 'bolt', 96, 79);
    // near the eye: a striped toy ball and a broom
    S.lay('front'); S.beg(); S.ell(140, 85, 5, 5, 'candy', 7, { dome: 1 }); for (let k = -4; k <= 4; k++) S.px(140 + k, 85 - Math.round(k * 0.3), 'linen', 9); S.px(138, 82, 'candy', 10); S.end();
    S.beg(); S.box(4, 80, 14, 3, 'candy', 7, { top: 1 }); S.box(5, 83, 2, 7, 'candy', 5); S.box(15, 83, 2, 7, 'candy', 4.5); S.hl(7, 86, 8, 'candy', 4); S.end();
  },
  anim(D, t, rs) {
    const st = rs.st;
    // fairy lights: bulbs along the string, each fading in and out on its own beat
    D.lay('back'); const cols = ['lamp', 'candy', 'teal', 'screen'];
    for (let i = 0; i < 18; i++) { const x = 8 + i * 8, u = ((x - 5) % 47) / 47, y = 10 + Math.round(Math.sin(u * Math.PI) * 5), on = Math.sin(t * 2.2 + i * 1.9) > -0.2;
      D.px(x, y, cols[i % 4], on ? 10 : 5, { e: 255 }); D.px(x, y + 1, cols[i % 4], on ? 8 : 4, { e: 255 }); }
    // lightning jar: a crooked arc re-drawn a few times a second, a bright flick now and then
    const bs = Math.floor(t * 9); let ax = 14, ay = 21; const r2 = X.rng(bs + 1);
    for (let k = 0; k < 9; k++) { ax = clamp(ax + Math.round((r2() - 0.5) * 3), 11, 17); D.px(ax, ay + k, 'ice', k % 3 ? 10 : 11, { e: 255 }); if (r2() < 0.25) D.px(ax + (r2() < 0.5 ? -1 : 1), ay + k, 'ice', 8, { e: 255 }); }
    if (r2() < 0.08 && st.jb !== bs) { st.jb = bs; rs.flash(2, 0.9); }
    // candle flames
    [[10, 41], [14, 39], [18, 42]].forEach(([x, y], i) => flame(D, x, y, 3, t, i * 2.1));
    // balloon: bobs on its string, jumps when a golden throw lands
    const kick = st.bk || 0; st.bk = Math.max(0, kick - 0.03);
    const bx = 66 + Math.round(Math.sin(t * 0.9) * 2 + Math.sin(t * 2.3) * 0.6 + kick * Math.sin(t * 14) * 2), by = 24 + Math.round(Math.sin(t * 1.3) * 1.5 - kick * 3);
    D.lay('mid'); for (let y = by + 8; y < 49; y++) { const k = (y - by - 8) / (49 - by - 8); D.px(Math.round(lerp(bx, 66, k) + Math.sin(k * Math.PI * 2 + t * 2) * 1.2 * (1 - k)), y, 'linen', 7); }
    D.beg(); D.ell(bx, by, 6, 7, 'candy', 7, { dome: 1 }); D.px(bx, by + 7, 'candy', 5); D.hl(bx - 1, by + 8, 3, 'candy', 6); D.end();
    D.rect(bx - 3, by - 4, 2, 3, 'candy', 10); D.px(bx - 2, by - 5, 'linen', 10); D.px(bx + 3, by + 3, 'candy', 9);
    // the clerk: stoops to the basket, straightens with an item, throws it into the pack; it lands with a bounce
    const cyc = 3.2, q = steps(t, cyc), n = Math.floor(t / cyc), kind = ITEM5[((n % 5) + 5) % 5], gold = ((n % 3) + 3) % 3 === 2;
    let pose, carry = null; const cx = 106, dir = q < 0.42 ? -1 : 1;
    if (q < 0.3) { const k = Math.sin(q / 0.3 * Math.PI); pose = { aF: lerp(0.3, 0.1, k), eF: 0, aB: 0.2, eB: -0.2, lean: k * 1.2, lF: 0.2, lB: -0.1, kB: k * 0.4, kF: k * 0.2, bob: Math.round(k * 2) }; if (q > 0.15) carry = 1; }
    else if (q < 0.5) { pose = { aF: 0.9, eF: -1.2, aB: 0.3, eB: -0.3, lF: 0.15, lB: -0.15 }; carry = 1; }
    else if (q < 0.6) { const k = (q - 0.5) / 0.1; pose = { aF: lerp(0.4, 2.6, k), eF: lerp(-0.6, 0, k), aB: lerp(0.8, -0.4, k), eB: -0.3, lF: 0.35, lB: -0.35, lean: lerp(-0.3, 0.5, k) }; carry = k < 0.7 ? 1 : null; }
    else { const k = ease((q - 0.6) / 0.4); pose = { aF: lerp(2.6, 0.3, k), eF: 0, aB: lerp(-0.4, 0.2, k), eB: -0.2, lF: 0.2, lB: -0.15, lean: lerp(0.5, 0, k) }; }
    const look = { skin: ['skin', 6], hair: ['hair', 5], top: ['sand', 7], bot: ['denim', 4], boot: ['leather', 3], apron: ['denim', 5], cap: ['candy', 7] };
    worker(D, cx, FY, look, pose, dir); const npc = !X.noWorkers;
    if (carry && npc) { const [hx, hy] = hand(cx, FY, pose, dir); itemPx(D, kind, hx + dir, hy - 2, gold); }
    // the throw: an arc from the hand to the pack's mouth, the item tumbling; a golden one trails glints and a light
    if (npc && q >= 0.57 && q < 0.8) { const k = (q - 0.57) / 0.23, x0 = cx + 7, y0 = 58, x = lerp(x0, PACK[0], k), y = lerp(y0, PACK[1], k) - Math.sin(k * Math.PI) * 18;
      D.lay('mid'); itemPx(D, kind, x, y, gold);
      if (gold) { rs.dl.push({ x, y, z: 16, r: 22, i: 0.9, rgb: [255, 210, 110], tint: 0.5 }); if (R() < 0.6) rs.burst('glint', x, y, 1, { sp: 4, life: 0.5 }); } }
    if (npc && q >= 0.8 && !st.land) { st.land = 1; st.sq = 1; rs.burst('dust', PACK[0], PACK[1], 5, { sp: 12, ang: 0, spread: 2, life: 0.8, w: 8 });
      if (gold) { rs.flash(1, 1.4); rs.flash(0, 0.4); rs.burst('glint', PACK[0], PACK[1] - 4, 8, { sp: 34, ang: 0, spread: 2.6, life: 0.8 }); st.bk = 1; } }
    if (q < 0.8) st.land = 0;
    // the packing list: a pink chalk tick for each item already in the pack; a full list gets a star, then a clean slate
    if (npc) { const nm = ((n % 5) + 5) % 5, done = nm === 0 && q < 0.25 ? 5 : nm + (q >= 0.8 ? 1 : 0); D.lay('back');
      for (let i = 0; i < done; i++) { const y = CHK[1] + 6 + i * 4, x = CHK[0] + 18; D.px(x, y, 'candy', 9); D.px(x + 1, y + 1, 'candy', 9); D.px(x + 2, y, 'candy', 9); D.px(x + 3, y - 1, 'candy', 9); D.px(x + 4, y - 2, 'candy', 8.5); }
      if (done === 5) { const x = CHK[0] + 21, y = CHK[1] + 2, g = Math.sin(t * 8) > 0 ? 10 : 8; D.px(x, y, 'candy', 10, { e: 255 }); [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b]) => D.px(x + a, y + b, 'candy', g, { e: 255 })); } }
    // the pack squashes when something lands in it
    st.sq = Math.max(0, (st.sq || 0) - 0.06); const sq = Math.round(Math.sin(st.sq * Math.PI) * 2);
    if (sq) { D.lay('mid'); D.beg(); D.rect(117 - sq, 57 + sq, 19 + 2 * sq, 9 - sq, 'leaf', 5.5); D.ell(126.5, 57 + sq, 9.5 + sq, 4, 'leaf', 6.5, { dome: 1 }); D.ell(126.5, 55 + sq, 6.5, 1.3, 'ink', 1); D.box(121, 62, 11, 5, 'leaf', 6.8); D.rect(125, 63, 3, 3, 'brass', 9); D.end(); }
  },
});

// ───────── 监听室 listening post (scifi · misc) ─────────
// a radar scope with a turning sweep and fading blips, an operator in headphones in a swivel chair, a waveform screen,
// the route map (nodes within reach light up as a ping rings out), a tracking dish that swivels; every 9 s a contact:
// the blip flares red, the alert lamp pulses, the operator leans in with a hand to the headset
const RAD = [31, 43, 16];   // radar centre x, y, radius
const BLIPS = [[0.7, 0.55], [2.1, 0.8], [3.3, 0.35], [4.4, 0.7], [5.5, 0.9]];   // angle, distance (×radius)
const NODES = [[0, 0], [-8, -5], [7, -5], [-12, -10], [0, -10], [11, -11], [-6, -15], [6, -16], [-12, -19]];   // route map, "you" first
const NLINK = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7], [6, 8]];
X.def('lookout', {
  amb: [0.34, 0.32],
  paint(S, sc) {
    X.shell(S, sc, 'scifi');
    sc.light({ x: RAD[0], y: RAD[1], z: 10, r: 56, i: 0.85, c: '#70ff90', fl: 'screen', tint: 0.55 });             // 1 radar glow
    sc.light({ x: 92, y: 42, z: 10, r: 46, i: 0.7, c: '#60e8ff', fl: 'screen', ph: 2, tint: 0.5 });               // 2 wave + map screens
    sc.light({ x: 70, y: 30, z: 34, r: 150, i: 0.9, c: '#ff4040', tint: 0.6, bake: false });                    // 3 alert beacon (off until a contact)
    sc.light({ x: 59, y: 64, z: 12, r: 34, i: 0.8, c: '#ffd29a', fl: 'candle', ph: 1, tint: 0.4 });              // 4 desk lamp
    sc.light({ x: 130, y: 14, z: 20, r: 78, i: 0.75, c: '#d0e4ff', fl: 'buzz', ph: 7, tint: 0.15 });           // 5 downlight over the dish
    S.lay('back');
    // radar cabinet: a heavy bezel, the scope with range rings and a cross, dials under it
    S.beg(); S.box(8, 20, 47, 52, 'scifi', 5); S.rect(10, 22, 43, 2, 'scifi', 7); for (let y = 64; y < 70; y += 2) S.hl(12, y, 18, 'scifi', 2.5);
    S.ell(RAD[0], RAD[1], RAD[2] + 2, RAD[2] + 2, 'scifi', 3); S.ell(RAD[0], RAD[1], RAD[2] + 2, RAD[2] + 2, 'scifi', 7, { ring: 1 });
    S.ell(RAD[0], RAD[1], RAD[2], RAD[2], 'screen', 1.4, { e: 255 });
    [5.5, 10.5, 15.5].forEach(r => S.ell(RAD[0], RAD[1], r, r, 'screen', 3, { ring: 1, e: 255 })); S.hl(RAD[0] - 15, RAD[1], 31, 'screen', 3, { e: 255 }); S.vl(RAD[0], RAD[1] - 15, 31, 'screen', 3, { e: 255 });
    S.ell(RAD[0] - 6, RAD[1] - 7, 3, 2, 'screen', 2.4, { e: 255 });
    [[40, 66, 'lamp'], [46, 66, 'teal']].forEach(([x, y, m]) => { S.ell(x, y, 2.4, 2.4, 'iron', 7, { ring: 1 }); S.px(x, y, m, 8, { e: 255 }); });
    S.end();
    // console desk: sloped top with a row of keys (lamps are animated), a cabinet with vents to the floor
    S.beg(); S.poly([[5, 79], [62, 79], [60, 73], [9, 73]], 'scifi', 7); S.hl(9, 73, 51, 'scifi', 9); S.box(6, 79, 55, 11, 'scifi', 4.5); for (let y = 82; y < 89; y += 2) S.hl(10, y, 16, 'scifi', 2.5); S.rect(40, 81, 16, 7, 'scifi', 3); S.hl(40, 81, 16, 'scifi', 6);
    for (let x = 12; x < 34; x += 3) S.rect(x, 76, 2, 1, 'scifi', 3); S.end();
    // desk lamp (gooseneck) and a mug
    S.beg(); S.rect(52, 72, 5, 1, 'iron', 5); S.line(54, 71, 55, 66, 'iron', 7); S.line(55, 66, 57, 62, 'iron', 7); S.poly([[55, 60], [61, 59], [63, 63], [57, 64]], 'teal', 6); S.hl(56, 60, 5, 'teal', 8); S.end(); S.hl(58, 64, 4, 'lamp', 10, { e: 255 }); S.px(60, 63, 'lamp', 11, { e: 255 });
    S.beg(); S.cyl(45, 69, 5, 4, 'linen', 8, { rim: 1 }); S.hl(45, 69, 5, 'hair', 2); S.px(50, 70, 'linen', 7); S.px(50, 71, 'linen', 6); S.end();
    // waveform screen and the route map, in one wall unit
    S.beg(); S.box(74, 18, 38, 52, 'scifi', 5); S.rect(77, 21, 32, 17, 'teal', 1, { e: 255 }); for (let x = 77; x < 109; x += 4) S.vl(x, 21, 17, 'teal', 1.7, { e: 255 }); S.hl(77, 29, 32, 'teal', 2.3, { e: 255 });
    S.rect(77, 42, 32, 24, 'glass', 1, { e: 255 }); for (let x = 79; x < 109; x += 5) S.vl(x, 42, 24, 'glass', 1.7, { e: 255 }); for (let y = 44; y < 66; y += 5) S.hl(77, y, 32, 'glass', 1.7, { e: 255 });
    S.rect(77, 39, 32, 2, 'scifi', 3); [80, 85, 90].forEach(x => S.px(x, 39, 'teal', 7, { e: 255 })); S.end();
    const mp = (i) => [93 + NODES[i][0], 62 + NODES[i][1]];
    NLINK.forEach(([a, b]) => { const A = mp(a), B = mp(b); S.line(A[0], A[1], B[0], B[1], 'glass', 4.5, { e: 255 }); });
    // the alert beacon on the ceiling (glows with light 3) and the downlight over the dish
    S.beg(); S.box(61, 8, 11, 2, 'scifi', 6); S.ell(66.5, 12, 4, 3, 'red', 5, { e: 4, dome: 1 }); S.px(65, 11, 'red', 9, { e: 4 }); S.hl(62, 14, 10, 'scifi', 5); S.end();
    S.beg(); S.box(122, 8, 17, 3, 'scifi', 7); S.hl(124, 11, 13, 'linen', 10, { e: 6 }); S.end({ none: 1 });
    // a tape cabinet under the screens: two reel windows, a row of lamps (reels and lamps are animated)
    S.beg(); S.box(82, 72, 28, 18, 'scifi', 5.5, { top: 1 }); [89, 103].forEach(x => { S.ell(x, 79, 5.5, 5.5, 'scifi', 2); S.ell(x, 79, 5.5, 5.5, 'scifi', 7, { ring: 1 }); }); S.rect(84, 86, 24, 2, 'scifi', 3); S.end();
    // the tracking dish's pedestal (the dish swivels in anim), cable to the desk
    S.lay('mid'); S.beg(); S.box(119, 84, 23, 6, 'scifi', 5, { top: 2 }); S.cyl(128, 52, 5, 32, 'scifi', 6, { rim: 1.5 }); S.box(125, 60, 11, 4, 'scifi', 7); S.rect(126, 70, 9, 6, 'scifi', 4); S.px(127, 71, 'screen', 8, { e: 255 }); S.px(129, 71, 'lamp', 8, { e: 255 }); S.end();
    // the swivel chair
    S.beg(); S.rect(66, 84, 11, 2, 'iron', 6); S.hl(66, 84, 11, 'iron', 8); S.box(75, 70, 3, 15, 'iron', 5); S.vl(70, 86, 3, 'iron', 5); S.hl(65, 89, 11, 'iron', 4); S.px(65, 89, 'ink', 1); S.px(75, 89, 'ink', 1); S.end();
    // near the eye: cables sagging from the ceiling, a cable bundle along the floor
    S.lay('front'); S.beg(); for (let x = 3; x < 44; x++) { const u = (x - 3) / 41; S.px(x, 4 + Math.round(Math.sin(u * Math.PI) * 9), 'iron', 4); S.px(x, 5 + Math.round(Math.sin(u * Math.PI) * 6), 'scifi', 3); } S.end();
    S.beg(); for (let x = 62; x < 132; x++) { const y = 98 + Math.round(Math.sin(x * 0.09) * 1.5); S.px(x, y, 'iron', 4); S.px(x, y + 1, 'iron', 2); S.px(x, y - 1, 'teal', 4); } S.box(58, 96, 5, 4, 'scifi', 6); S.box(130, 96, 5, 4, 'scifi', 6); S.end();
  },
  anim(D, t, rs) {
    const st = rs.st, cq = steps(t, 9), alert = cq > 0.62 && cq < 0.86 ? 1 - (cq - 0.62) / 0.24 : 0;
    rs.mul[3] = alert > 0 ? (Math.sin(t * 13) > 0 ? 1 : 0.15) * Math.min(1, alert * 2.5) : 0;
    // radar sweep: a bright arm, a fading wedge behind it; blips glow as it passes and fade; the contact blip flares red
    const sa = t * 2.1, [cx, cy, rr] = RAD; D.lay('back');
    for (let k = 0; k < 7; k++) { const a = sa - k * 0.09, tn = k === 0 ? 10 : 7 - k * 0.7; for (let r = 2; r < rr; r += 1) D.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 'screen', tn, { e: 255 }); }
    BLIPS.forEach(([ba, bd], i) => { const age = (((sa - ba) % 6.283) + 6.283) % 6.283; if (age > 3.5) return; const x = cx + Math.cos(ba) * bd * rr, y = cy + Math.sin(ba) * bd * rr, k = 1 - age / 3.5;
      D.px(x, y, 'screen', 5 + k * 5, { e: 255 }); if (k > 0.6) { D.px(x + 1, y, 'screen', 7 + k * 2, { e: 255 }); D.px(x, y + 1, 'screen', 6, { e: 255 }); } });
    const ca = 5.9, cd = 0.62, qx = cx + Math.cos(ca) * cd * rr, qy = cy + Math.sin(ca) * cd * rr;
    if (cq > 0.58) { const on = cq < 0.9, pul = Math.sin(t * 13) > 0; if (on) { D.rect(qx - 1, qy - 1, 3, 3, 'red', pul ? 9 : 7, { e: 255 }); D.px(qx, qy, 'red', 10, { e: 255 }); if (alert > 0.3) D.ell(qx, qy, 4, 4, 'red', 7, { ring: 1, e: 255 }); } }
    if (cq > 0.62 && !st.c) { st.c = 1; rs.burst('glint', qx, qy, 4, { sp: 16, life: 0.6 }); rs.flash(1, 0.6); } if (cq < 0.5) st.c = 0;
    // waveform: a travelling signal that spikes during a contact
    let py = null; for (let x = 0; x < 32; x++) { const amp = 3 + alert * 4, y = clamp(29 + Math.round(Math.sin(x * 0.55 - t * 7) * amp * Math.sin(x * 0.1 + t * 0.8) + (alert > 0 ? Math.sin(x * 2.3 + t * 30) * alert * 3 : 0)), 22, 37);
      const m = alert > 0 ? 'red' : 'teal'; for (let yy = Math.min(y, py == null ? y : py); yy <= Math.max(y, py == null ? y : py); yy++) D.px(77 + x, yy, m, yy === y ? 10 : 8, { e: 255 }); py = y; }
    // route map: a ping rings out from "you" and lights the nodes within reach (three steps)
    const pg = steps(t, 3), prr = pg * 22; for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2, x = 93 + Math.cos(a) * prr, y = 62 + Math.sin(a) * prr * 0.8; if (y > 42 && y < 66 && x > 77 && x < 109) D.px(x, y, 'ice', 8 - pg * 4, { e: 255 }); }
    NODES.forEach(([nx, ny], i) => { const d = Math.hypot(nx, ny / 0.8), lit = i === 0 || prr > d, fade = lit ? clamp(1 - (prr - d) / 30, 0.4, 1) : 0, x = 93 + nx, y = 62 + ny;
      D.rect(x - 1, y - 1, 3, 3, i === 0 ? 'lamp' : lit ? 'ice' : 'glass', i === 0 ? 9 : lit ? 6 + fade * 4 : 3, { e: 255 }); if (i === 0 || (lit && fade > 0.8)) D.px(x, y, i === 0 ? 'lamp' : 'ice', 11, { e: 255 }); });
    // tape reels turn (fast while a contact is being recorded), the lamp row counts
    [89, 103].forEach((x, j) => { const a = t * (alert > 0 ? 9 : 2.4) * (j ? 1 : 1.3); D.ell(x, 79, 4, 4, 'iron', 6); for (let k = 0; k < 3; k++) { const b = a + k * 2.094; D.px(x + Math.round(Math.cos(b) * 3), 79 + Math.round(Math.sin(b) * 3), 'iron', 2); } D.px(x, 79, 'iron', 9); });
    for (let i = 0; i < 8; i++) D.px(85 + i * 3, 86, i < Math.floor(steps(t, alert > 0 ? 0.6 : 2.2) * 9) ? (alert > 0 ? 'red' : 'teal') : 'scifi', i < Math.floor(steps(t, alert > 0 ? 0.6 : 2.2) * 9) ? 9 : 3, { e: 255 });
    // desk keys blink
    for (let i = 0; i < 8; i++) { const on = Math.sin(t * (1.7 + i * 0.37) + i * 2) > 0.3; D.rect(12 + i * 3, 76, 2, 1, ['teal', 'lamp', 'red', 'screen'][i % 4], on ? 9 : 4, { e: 255 }); }
    // tracking dish: swivels slowly, the tip blinks; turns toward the contact when it comes
    // the dish is a bowl: its painted back shows on the far side as it turns, the inside is dark under the upper-left lip
    // and lit toward the lower right, the rim catches the ceiling light; the feed horn stands out past the rim on struts
    const tg = alert > 0 ? 0.9 : Math.sin(t * 0.45) * 0.9, sv = st.sv = st.sv == null ? tg : lerp(st.sv, tg, 0.05), sn = Math.sin(sv), rx = Math.max(3, Math.round(12 * Math.abs(Math.cos(sv)))), side = sn >= 0 ? 1 : -1, fx = Math.round(sn * 14), bk = Math.round(Math.abs(sn) * 5);
    const DX = 130, DY = 37, RY = 13;
    D.lay('mid'); D.beg(); D.rect(126, 49, 9, 4, 'scifi', 6); D.hl(126, 49, 9, 'scifi', 8);
    if (bk) { D.ell(DX - side * bk, DY, Math.max(2, rx - 1), RY - 1, 'scifi', 6, { dome: 1 }); D.ell(DX - side * (bk + 1), DY, 1, RY - 5, 'scifi', 4); }
    D.ell(DX, DY, rx, RY, 'linen', 5);
    D.ell(DX, DY, Math.max(1, rx - 1), RY - 1, 'linen', 1.6);                                   // shadowed inside (shows as the upper-left crescent)
    D.ell(DX + 1.2, DY + 1.8, Math.max(1, rx - 1.6), RY - 1.8, 'linen', 6.2);                     // lit inside (shows as the lower-right crescent)
    D.ell(DX + 0.6, DY + 0.8, Math.max(1, rx - 3), RY - 3.8, 'linen', 4.3);                       // the deep middle
    for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2, c = Math.cos(a - 3.93); D.px(DX + Math.cos(a) * (rx - 0.2), DY + Math.sin(a) * (RY - 0.2), 'linen', c > 0.2 ? 9.2 : c > -0.4 ? 7 : 5); }
    D.end();
    const fxx = DX + fx, sx0 = DX - Math.round(side * rx * 0.3);
    D.line(sx0, DY - RY + 1, fxx, DY - 1, 'iron', 6.5); D.line(sx0, DY + RY - 1, fxx, DY + 1, 'iron', 5.5);   // thin struts, no outline
    D.beg(); D.rect(fxx - 1, DY - 1, 3, 3, 'iron', 7); D.px(fxx - side, DY, 'ink', 1); D.px(fxx, DY - 1, 'iron', 10); D.end();
    D.px(fxx + side, DY - 2, 'red', Math.sin(t * 4) > 0 ? 10 : 5, { e: 255 });
    // the operator: taps the keys; on a contact he leans in and presses the headset
    const lean = alert > 0 ? 0.45 : 0, tap = Math.sin(t * 9) > 0.6 ? 0.2 : 0, ox = 71, oy = FY + 6;
    const pose = { lF: Math.PI / 2, kF: -Math.PI / 2, lB: Math.PI / 2 - 0.15, kB: -Math.PI / 2 + 0.1, aF: 1.1 + tap, eF: 0.1 - tap, aB: alert > 0 ? 2.8 : 1.2, eB: alert > 0 ? 1.6 : 0.3, lean };
    worker(D, ox, oy, { skin: ['skin', 6], hair: ['hair', 3], top: ['tile', 6], bot: ['scifi', 5], boot: ['iron', 3] }, pose, -1);
    const hx = ox - Math.round(lean * 3), sy = oy - 21;
    if (!X.noWorkers) { D.beg(); D.hl(hx - 2, sy - 7, 5, 'iron', 4); D.px(hx - 3, sy - 6, 'iron', 4); D.px(hx + 3, sy - 6, 'iron', 4); D.rect(hx, sy - 5, 2, 3, 'iron', 3); D.px(hx + 1, sy - 4, 'teal', 9, { e: 255 }); D.line(hx, sy - 2, hx - 3, sy - 1, 'iron', 6); D.end({ none: 1 }); }
    // chair back rest
    D.beg(); D.box(76, 66, 3, 10, 'iron', 6); D.end();
    // steam off the mug: two thin wisps that sway, rise and thin out (hand-drawn, one pixel wide — no puffs)
    D.lay('back'); for (let i = 0; i < 2; i++) { const p = steps(t + i * 1.1, 2.2), rise = Math.round(p * 4);
      for (let k = 0; k < 6; k++) { const tn = 8 - k * 0.35 - p * 2.2; if (tn < 5.6 || (k + rise + i) % 5 === 4) continue;
        D.px(46 + i * 2 + Math.round(Math.sin(t * 2.3 + k * 0.8 + i * 2.6) * (0.3 + k * 0.22)), 67 - k - rise, 'linen', tn); } }
  },
});

// ───────── 保险库 vault (steam · store) ─────────
// a round vault door in a riveted collar, a gold-bar pyramid, coins trickling down a chute onto a heap, gauges;
// every 12 s the keeper pulls the lever: the beacon turns, the wheel spins, the bolts draw back, the door swings open
// on its hinge and gold light pours out, then it swings shut with a thud and the bolts slam home
const VD = [48, 51, 25], VPER = 12, LEV = [64, 76];   // door centre x, y, radius; cycle; the lever handle's top (locked) and bottom (pulled) y
function vaultState(t) {   // 0…1 door open, 0…1 bolts drawn, wheel spin, beacon on
  const q = steps(t, VPER); let open = 0, bolt = 0, spin = 0, beacon = q > 0.47 && q < 0.93;
  if (q > 0.52 && q < 0.6) { bolt = (q - 0.52) / 0.08; spin = (q - 0.52) / 0.08; } else if (q >= 0.6 && q < 0.92) { bolt = 1; spin = 1; } else if (q >= 0.92 && q < 0.95) { bolt = 1 - (q - 0.92) / 0.03; spin = 1; }
  if (q >= 0.6 && q < 0.7) open = ease((q - 0.6) / 0.1); else if (q >= 0.7 && q < 0.84) open = 1; else if (q >= 0.84 && q < 0.92) open = 1 - ease((q - 0.84) / 0.08);
  return { q, open, bolt, spin, beacon };
}
function goldBar(S, x, y, tn, o) { S.poly([[x, y + 3], [x + 9, y + 3], [x + 8, y], [x + 1, y]], 'gold', tn, o); S.hl(x + 1, y, 7, 'gold', tn + 2, o); S.hl(x, y + 3, 9, 'gold', tn - 2, o); S.px(x + 2, y + 1, 'gold', tn + 3, o); }
// the door leaf as it swings out on its left hinge (th 0 = shut): the same face as the painted one (steel dome, brass rings,
// engraved rings, 12 rivets), squeezed to cos th, with its dark edge showing on the free side
function vaultLeaf(th) { const [cx, , R0] = VD, c = Math.cos(th), rx = Math.max(2, Math.round(R0 * c)); return { c, rx, dcx: cx - R0 + rx, thick: Math.round(6 * Math.sin(th)) }; }
function vaultWheel(D, x, y, wa, c) {   // three spokes with knobbed handles; c squeezes it with the leaf
  D.beg();
  for (let k = 0; k < 3; k++) { const a = wa + k * Math.PI / 3; D.line(x - Math.cos(a) * 10 * c, y - Math.sin(a) * 10, x + Math.cos(a) * 10 * c, y + Math.sin(a) * 10, 'brass', 7, { w: 2 });
    [1, -1].forEach(sg => { const hx = x + Math.cos(a) * 11 * sg * c, hy = y + Math.sin(a) * 11 * sg; D.rect(hx - 1, hy - 1, 3, 3, 'brass', 8.5); D.px(hx - 1, hy - 1, 'brass', 10); }); }
  D.ell(x, y, Math.max(1, 4 * c), 4, 'brass', 7, { dome: 1 }); D.px(x - 1, y - 1, 'brass', 10); D.end();
}
X.def('vault', {
  amb: [0.28, 0.26],
  paint(S, sc) {
    X.shell(S, sc, 'steam');
    const [cx, cy, R0] = VD;
    sc.light({ x: 112, y: 19, z: 18, r: 96, i: 1.0, c: '#ffe0a0', fl: 'candle', ph: 2.5, tint: 0.3 });           // 0 pendant over the gold
    sc.light({ x: cx + 6, y: cy + 10, z: 22, r: 88, i: 1.5, c: '#ffc850', tint: 0.3, bake: false });              // 1 gold light from inside the vault
    sc.light({ x: cx - 16, y: 16, z: 14, r: 96, i: 0.9, c: '#ffa030', tint: 0.55, bake: false });              // 2 beacon, left beam
    sc.light({ x: cx + 16, y: 16, z: 14, r: 96, i: 0.9, c: '#ffa030', tint: 0.55, bake: false });              // 3 beacon, right beam
    sc.light({ x: 84, y: 34, z: 8, r: 22, i: 0.5, c: '#70ff90', fl: 'pulse', amp: 0.3, sp: 2, tint: 0.5 });     // 4 gauge lamp
    // the recess and the riveted collar
    S.lay('wall'); S.ell(cx, cy, R0 + 6, R0 + 6, 'iron', 1.5); S.ao(cx - R0 - 8, cy + R0 - 4, 2 * R0 + 16, 12, 'b', 1);
    S.lay('back');
    S.beg(); S.ell(cx, cy, R0 + 5, R0 + 5, 'iron', 6, { ring: 4, dome: 1 }); S.ell(cx, cy, R0 + 5, R0 + 5, 'iron', 8, { ring: 1 });
    for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; TX.rivet(S, cx + Math.cos(a) * (R0 + 3) - 0.5, cy + Math.sin(a) * (R0 + 3) - 0.5, 'iron', 6); }
    S.end();
    // bolt sockets in the collar (the bolts are animated)
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; S.rect(cx + Math.cos(a) * (R0 + 2) - 1, cy + Math.sin(a) * (R0 + 2) - 1, 3, 3, 'ink', 1); }
    // hinge blocks and the hydraulic rams on the left
    [cy - 14, cy + 11].forEach(y => { S.beg(); S.box(cx - R0 - 9, y, 9, 7, 'iron', 7); S.hl(cx - R0 - 9, y + 3, 9, 'iron', 4); S.cyl(cx - R0 - 6, y - 2, 3, 11, 'iron', 8); S.end(); });
    [[8, 20], [8, 76]].forEach(([x, y]) => { S.beg(); S.box(x, y, 4, 6, 'iron', 5); S.end(); });
    // the threshold under the door
    S.beg(); S.box(cx - R0 - 4, 80, 2 * R0 + 8, 10, 'iron', 5, { top: 2 }); S.hl(cx - R0 - 2, 84, 2 * R0 + 4, 'iron', 3); TX.grate(S, cx - R0 - 2, 85, 2 * R0 + 4, 4, 'iron', 5); S.end();
    // the closed door face (anim covers it when it opens): steel dome, a brass ring, engraved rings, spoke plates
    S.beg(); S.ell(cx, cy, R0, R0, 'iron', 5.5, { dome: 1 }); S.ell(cx, cy, R0 - 3, R0 - 3, 'brass', 6, { ring: 2 }); S.ell(cx, cy, R0 - 2.4, R0 - 2.4, 'brass', 8.5, { ring: 0.6 });
    S.ell(cx, cy, R0 * 0.55, R0 * 0.55, 'iron', 7, { ring: 1 }); S.ell(cx, cy, R0 * 0.55 - 1, R0 * 0.55 - 1, 'iron', 3, { ring: 0.8 });
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; S.px(cx + Math.cos(a) * (R0 - 7), cy + Math.sin(a) * (R0 - 7), 'iron', 8.5); }
    S.ell(cx, cy, 3.5, 3.5, 'brass', 7, { dome: 1 }); S.end();
    // wall gauges and the lever box (lever arm is animated)
    S.beg(); S.ell(84, 28, 5.5, 5.5, 'brass', 7, { ring: 1.3 }); S.ell(84, 28, 4.2, 4.2, 'linen', 9); S.px(87, 26, 'red', 7); S.px(87, 27, 'red', 7); for (let k = 0; k < 5; k++) { const a = Math.PI * (0.8 + k * 0.35); S.px(84 + Math.cos(a) * 3.3, 28 + Math.sin(a) * 3.3, 'ink', 1); } S.end();
    S.beg(); S.ell(84, 42, 4, 4, 'brass', 7, { ring: 1.2 }); S.ell(84, 42, 2.8, 2.8, 'linen', 8.5); S.end(); S.px(84, 35, 'screen', 9, { e: 5 }); S.px(83, 35, 'screen', 7, { e: 5 });
    // the lever box: a hazard plate over it, a long slot the handle slides down, a lamp at each end of the slot
    S.beg(); S.box(79, 51, 11, 6, 'brass', 7); for (let y = 52; y < 56; y++) for (let x = 80; x < 89; x++) if ((x + y) % 4 < 2) S.px(x, y, 'hair', 1); S.end();
    S.beg(); S.box(79, LEV[0] - 4, 11, LEV[1] - LEV[0] + 9, 'iron', 6); S.rect(83, LEV[0] - 1, 3, LEV[1] - LEV[0] + 3, 'ink', 1); S.hl(80, LEV[0] - 3, 9, 'brass', 7); S.hl(80, LEV[1] + 3, 9, 'crimson', 6);
    [LEV[0], LEV[1]].forEach(y => { S.rect(80, y - 1, 2, 3, 'iron', 3); }); S.end();
    S.beg(); S.hcyl(74, 64, 6, 3, 'brass', 6, { rim: 1 }); S.end();   // pipe from the lever to the door's rams
    // a green-shaded pendant over the gold
    S.beg(); S.vl(112, 10, 3, 'iron', 4); S.poly([[106, 16], [118, 16], [115, 12], [109, 12]], 'leaf', 6); S.hl(109, 12, 6, 'leaf', 8); S.hl(106, 15, 12, 'leaf', 4); S.end(); S.hl(109, 16, 6, 'lamp', 10, { e: 1 }); S.px(112, 17, 'lamp', 11, { e: 1 });
    // beacon above the door
    S.beg(); S.box(cx - 4, 11, 9, 3, 'iron', 6); S.ell(cx + 0.5, 16, 4, 3, 'fire', 4, { dome: 1 }); S.hl(cx - 3, 19, 8, 'iron', 5); S.end();
    // coin chute from the ceiling pipe, the heap under it, sacks
    S.beg(); S.box(135, 8, 7, 44, 'brass', 5); S.vl(136, 9, 42, 'brass', 7); S.poly([[133, 52], [144, 52], [141, 58], [136, 58]], 'brass', 6); for (let y = 14; y < 50; y += 9) S.hl(135, y, 7, 'brass', 8); S.end();
    S.lay('mid');
    S.beg(); S.ell(138, 91, 9, 8, 'gold', 6, { dome: 1 }); { const r = X.rng(5); for (let i = 0; i < 22; i++) { const a = r() * Math.PI, rr = r() * 7.5; const x = Math.round(138 + Math.cos(a) * rr), y = Math.round(90 - Math.sin(a) * rr * 0.95); S.hl(x - 1, y, 3, 'gold', 8.5); S.px(x - 1, y + 1, 'gold', 5); } } S.px(138, 83, 'gold', 11); S.end();
    [[126, 84, 5]].forEach(([x, y, r]) => { S.beg(); S.ell(x, y + 1, r, r + 0.5, 'sand', 6.5, { dome: 1 }); S.rect(x - 1, y - r - 1, 3, 2, 'sand', 5); S.hl(x - 2, y - r + 1, 5, 'leather', 5); S.ell(x, y + 2, 1.6, 1.6, 'gold', 8); S.end(); });
    // the gold-bar pyramid
    S.beg(); for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row; i++) goldBar(S, 94 + row * 5 + i * 10, 86 - row * 4, 7 - row * 0.2 + ((i + row) % 2) * 0.5); S.end();
    // near the eye: brass stanchions with a velvet rope in front of the vault
    S.lay('front'); [8, 74].forEach(x => { S.beg(); S.cyl(x - 1, 74, 3, 16, 'brass', 7, { rim: 1.5 }); S.ell(x, 73, 2.2, 2.2, 'brass', 9, { dome: 1 }); S.ell(x, 89, 3.5, 1.5, 'brass', 6); S.end(); });
    S.beg(); for (let x = 9; x < 74; x++) { const u = (x - 9) / 64, y = 75 + Math.round(Math.sin(u * Math.PI) * 6); S.px(x, y, 'crimson', 6); S.px(x, y + 1, 'crimson', 4); } S.end();
    sc.emit({ k: 'steam', x: 60, y: 8, rate: 0.35, sp: 3, ang: 0.4, spread: 0.6, life: 1.4 });
  },
  // the light pouring out of the open door: a haze in hard alpha steps over the finished frame (no noise, no dither)
  post(out, t) {
    const o = vaultState(t).open; if (o < 0.05) return; const [cx, cy, R0] = VD, c = [255, 150, 40], L = vaultLeaf(o * 1.3);   // added, not blended: gold light, never a grey veil
    for (let y = cy + 6; y < H - 3; y++) { const k = (y - cy - 6) / (H - 3 - cy - 6), hw = lerp(13, 26, k), x0 = cx + 2 + k * 6, v2 = ((y + 0.5 - cy) / R0) ** 2;
      for (let x = Math.max(3, Math.floor(x0 - hw)); x <= Math.min(W - 4, Math.ceil(x0 + hw)); x++) { const u = Math.abs(x + 0.5 - x0) / hw; if (u >= 1) continue;
        if (v2 < 1 && x + 0.5 < L.dcx + L.thick + L.rx && (((x + 0.5 - L.dcx) / L.rx) ** 2 + v2 < 1 || ((x + 0.5 - L.dcx - L.thick) / L.rx) ** 2 + v2 < 1)) continue;   // the leaf's face is turned away from the glow
        const a = Math.floor(o * (1 - u * u) * (1 - k * 0.45) * 0.5 * 6) / 6; if (a <= 0) continue; const p = y * W + x, v = out[p], lum = (v & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + ((v >> 16) & 255) * 0.11; if (lum < 150) X.addPx(out, p, c, a * (lum < 90 ? 0.7 : 0.25)); } }   // bright gold keeps its detail
  },
  anim(D, t, rs) {
    const st = rs.st, V = vaultState(t), [cx, cy, R0] = VD;
    rs.mul[1] = V.open * (0.85 + 0.15 * Math.sin(t * 5));
    const bp = Math.sin(t * 9); rs.mul[2] = V.beacon ? Math.max(0, bp) : 0; rs.mul[3] = V.beacon ? Math.max(0, -bp) : 0;
    // beacon glass: a bright stripe running round it while on
    D.lay('back'); if (V.beacon) { const sx = Math.round(Math.sin(t * 9) * 3); D.ell(cx + 0.5, 16, 4, 3, 'fire', 7, { e: 255 }); D.vl(cx + sx, 13, 6, 'fire', 11, { e: 255 }); D.vl(cx + sx + 1, 14, 4, 'fire', 9, { e: 255 }); }
    // bolts: slide into the door as it unlocks
    // (only the stub across the door gap shows: locked, they reach into the collar's sockets; unlocking, they sink into the door)
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8, r1 = R0 + 3 - V.bolt * 4; if (V.open >= 0.05 || r1 < R0) continue;
      const x0 = cx + Math.cos(a) * (R0 - 1), y0 = cy + Math.sin(a) * (R0 - 1), x1 = cx + Math.cos(a) * r1, y1 = cy + Math.sin(a) * r1; D.line(x0, y0, x1, y1, 'brass', 8, { w: 2 }); D.px(x1, y1, 'brass', 10); }
    // the wheel: turning while it unlocks, spun back as the bolts slam home
    const wa = 0.3 + V.spin * Math.PI * 3 + (V.q > 0.92 ? -(V.q - 0.92) * 40 : 0);
    if (V.open < 0.05) vaultWheel(D, cx, cy, wa, 1);
    else {
      // open: the vault's inside (shelves of gold in golden light), the door swung out on its left hinge
      const th = V.open * 1.3, { c, rx, dcx, thick } = vaultLeaf(th);
      const G = { e: 2 };   // the inside glows with the gold light (cheap: no per-pixel lighting), brightening as the door opens
      D.ell(cx, cy, R0 + 0.5, R0 + 0.5, 'brass', 4.5, G); D.ell(cx, cy, R0 - 5, R0 - 5, 'brass', 6.5, { ring: 2, e: 2 }); D.ell(cx, cy + 3, R0 - 10, R0 - 12, 'brass', 7, G); D.ell(cx, cy + 1, R0 - 17, R0 - 18, 'brass', 8, G);
      [cy - 9, cy + 5].forEach((y, j) => { D.hl(cx - 20, y + 5, 41, 'brass', 3.5, G); for (let i = 0; i < 5 - j; i++) goldBar(D, cx - 20 + j * 4 + i * 8, y + 1, 9, G); });
      for (let i = 0; i < 8; i++) goldBar(D, cx - 18 + (i % 4) * 9 + Math.floor(i / 4) * 4, cy + 18 - Math.floor(i / 4) * 4, 9.5, G);
      // the door leaf: the painted face under ordinary light, squeezed as it turns; only its edge takes the vault's glow
      D.beg(); if (thick) D.ell(dcx + thick, cy, rx, R0, 'iron', 2.5, G);
      D.ell(dcx, cy, rx, R0, 'iron', 5.5, { dome: 1 }); D.ell(dcx, cy, Math.max(1, rx - 3), R0 - 3, 'brass', 6, { ring: 2 }); D.ell(dcx, cy, Math.max(1, rx - 2.4), R0 - 2.4, 'brass', 8.5, { ring: 0.6 });
      D.ell(dcx, cy, rx * 0.55, R0 * 0.55, 'iron', 7, { ring: 1 }); D.ell(dcx, cy, Math.max(0.5, rx * 0.55 - 1), R0 * 0.55 - 1, 'iron', 3, { ring: 0.8 });
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; D.px(dcx + Math.cos(a) * (R0 - 7) * c, cy + Math.sin(a) * (R0 - 7), 'iron', 8.5); }
      D.end();
      vaultWheel(D, dcx - Math.round(3 * Math.sin(th)), cy, wa, c);   // the wheel stands off the leaf on its shaft, so it slides toward the hinge as the leaf turns
      if (R() < 0.25) rs.burst('glint', cx + (R() - 0.5) * 36, cy + (R() - 0.3) * 30, 1, { sp: 6, life: 0.7 });
      if (R() < 0.3 * V.open) rs.burst('dust', cx + (R() - 0.5) * 30, cy + 10, 1, { sp: 8, ang: 0, spread: 1, life: 2 });
    }
    // rams: rods extend with the door
    D.beg(); [[12, 23, cy - 12], [12, 79, cy + 13]].forEach(([x, y, ty]) => { const ex = x + 6 + Math.round(V.open * 6); D.line(x + 2, y, ex, ty, 'iron', 8); D.px(ex, ty, 'brass', 8); }); D.end();
    // events: unlock hiss, door open flash, shut thud
    if (V.q > 0.52 && V.q < 0.6 && R() < 0.4) rs.burst('steam', cx - R0 - 4, cy + (R() < 0.5 ? -12 : 14), 1, { sp: 14, ang: -1.3, spread: 0.5, life: 1 });
    if (V.q > 0.6 && !st.op) { st.op = 1; rs.flash(1, 0.9); rs.burst('glint', cx, cy, 10, { sp: 36, life: 0.9 }); }
    if (V.q > 0.92 && !st.sh) { st.sh = 1; rs.flash(0, 0.6); rs.burst('dust', cx, cy + R0, 12, { sp: 22, ang: 0, spread: 2.4, life: 1.2, w: 40 }); rs.burst('steam', cx - R0 - 4, cy, 6, { sp: 18, ang: -1.4, spread: 0.8, life: 1.3 }); }
    if (V.q < 0.5) { st.op = 0; st.sh = 0; }
    // gauges: needles creep, jump while the door works
    const g1 = Math.PI * (0.9 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.7)) + (V.beacon ? 0.5 : 0)) + n1(t * 14) * 0.08; D.line(84, 28, 84 + Math.cos(g1) * 3.4, 28 + Math.sin(g1) * 3.4, 'red', 6); D.px(84, 28, 'iron', 3);
    const g2 = Math.PI * (1.2 + (V.bolt * 0.6)) + n1(t * 10) * 0.06; D.line(84, 42, 84 + Math.cos(g2) * 2.4, 42 + Math.sin(g2) * 2.4, 'ink', 1);
    // coins tumbling down the chute onto the heap, a glint where they land
    for (let i = 0; i < 3; i++) { const ph = steps(t + i * 0.47, 1.4), y = 58 + ph * ph * 24; if (ph < 0.95) { const sp = Math.floor(t * 12 + i) % 2; D.rect(138 + (i % 2) - (sp ? 0 : 1), y, sp ? 1 : 3, 2, 'gold', 9, { e: 255 }); } }
    if (!st.cn || t - st.cn > 0.45) { st.cn = t; rs.burst('glint', 136 + R() * 5, 82, 1, { sp: 5, life: 0.4 }); }
    // the lever: a T-handle that slides down its slot when the keeper pulls it, stays down while the door is open and
    // springs back up once the door has shut; the lamps beside the slot say locked (red, top) or open (green, bottom)
    const pl = V.q > 0.47 && V.q < 0.52 ? ease((V.q - 0.47) / 0.05) : V.q >= 0.52 && V.q < 0.93 ? 1 : V.q >= 0.93 && V.q < 0.96 ? 1 - ease((V.q - 0.93) / 0.03) : 0;
    const gy = Math.round(lerp(LEV[0], LEV[1], pl)), hub = (LEV[0] + LEV[1]) >> 1;
    D.lay('back'); D.vl(84, Math.min(hub, gy), Math.abs(gy - hub) + 1, 'iron', 8.5); D.rect(83, hub - 1, 3, 3, 'iron', 5); D.px(83, hub - 1, 'iron', 8);
    D.beg(); D.rect(82, gy - 1, 5, 3, 'crimson', 7); D.hl(82, gy - 1, 5, 'crimson', 9); D.hl(82, gy + 1, 5, 'crimson', 5); D.px(82, gy - 1, 'crimson', 10); D.end();
    D.rect(80, LEV[0], 2, 1, 'red', pl < 0.5 ? 9 : 3, { e: 255 }); D.rect(80, LEV[1], 2, 1, 'screen', pl >= 0.5 ? 9 : 3, { e: 255 });
    if (pl >= 1 && V.q < 0.6 && !st.lv) { st.lv = 1; rs.burst('glint', 84, gy + 1, 3, { sp: 12, life: 0.45 }); rs.flash(4, 0.5); }
    if (V.q < 0.47) st.lv = 0;
    // the keeper: counts the gold with a clipboard; walks to the lever, reaches up, pulls it all the way down, lets go
    // and watches the door, then walks back (his hand is placed on the handle, so it rides the lever down)
    const look = { skin: ['skin', 6], hair: ['hair', 4], top: ['linen', 8], bot: ['iron', 4], boot: ['hair', 2], apron: ['crimson', 5], cap: ['leaf', 7] }, qa = V.q, KX = 90, REST = [84, 78];
    const tAt = (qq) => t - (qa - qq) * VPER, walkPose = (tt) => { const ph = tt * 1.6 * Math.PI, sn = Math.sin(ph); return { lF: sn * 0.55, kF: Math.max(0, -sn) * 0.6, lB: -sn * 0.55, kB: Math.max(0, sn) * 0.6, aF: 1.2, eF: -1.2, aB: sn * 0.4, eB: -0.3, bob: -Math.abs(Math.cos(ph)) + 0.4, tool: 'board' }; };
    D.lay('mid');
    if (qa < 0.37) { const w = stroll(t, 98, 122, 7, 0.2, 2.2); worker(D, w.x, FY, look, Object.assign(w.pose, { aF: 1.2, eF: -1.2, tool: 'board' }), w.dir); }
    else if (qa < 0.45) { const x0 = stroll(tAt(0.37), 98, 122, 7, 0.2, 2.2).x, x = Math.round(lerp(x0, KX, (qa - 0.37) / 0.08)); worker(D, x, FY, look, walkPose(t), -1); }
    else if (qa < 0.58) {
      const lean = qa < 0.47 ? 0.1 : qa < 0.55 ? lerp(0.1, 0.5, ease((qa - 0.47) / 0.05)) : lerp(0.5, 0, ease((qa - 0.55) / 0.03));
      let tx = 84, ty = gy - 1;
      if (qa < 0.47) { const k = ease((qa - 0.45) / 0.02); tx = lerp(REST[0], 84, k); ty = lerp(REST[1], LEV[0] - 1, k); }
      else if (qa >= 0.55) { const k = ease((qa - 0.55) / 0.03); tx = lerp(84, REST[0], k); ty = lerp(gy - 1, REST[1], k); }
      const [aF, eF] = armTo(KX, FY, lean, -1, Math.round(tx), Math.round(ty));
      worker(D, KX, FY, look, { aF, eF, aB: 0.3 + lean * 0.6, eB: -0.3, lean, lF: 0.15 + lean * 0.3, lB: -0.2 - lean * 0.4, kB: lean * 0.4 }, -1);
    }
    else if (qa < 0.93) worker(D, KX, FY, look, { aF: 1.2, eF: -1.2, aB: 0.2, eB: -0.3, tool: 'board', hx: 0 }, -1);
    else { const x1 = stroll(tAt(1), 98, 122, 7, 0.2, 2.2).x, x = Math.round(lerp(KX, x1, (qa - 0.93) / 0.07)); worker(D, x, FY, look, walkPose(t), 1); }
  },
});

// ───────── 酒馆 tavern (medieval · recruit) ─────────
// a wall of bottles over the bar, tankards on hooks, a barrel rack with a tap, posters of adventurers wanted, two
// lanterns; the barkeep polishes a tankard; every 9 s he pulls a pint and slides it down the bar, the hooded
// adventurer at the end catches it, raises it in a toast (foam flies, the lanterns flare) and flips a coin onto the bar
const BARY = 78, TPER = 9;   // bar top y, cycle
function tankard(S, x, y, foam) {   // 5×6 tankard standing on y
  S.beg(); S.rect(x, y - 6, 5, 6, 'wood', 6); S.vl(x, y - 6, 6, 'wood', 7.5); S.vl(x + 4, y - 6, 6, 'wood', 4.5); S.hl(x, y - 5, 5, 'iron', 7); S.hl(x, y - 2, 5, 'iron', 6);
  S.vl(x + 5, y - 5, 3, 'iron', 6); S.px(x + 6, y - 4, 'iron', 5); S.vl(x + 6, y - 5, 3, 'iron', 5); if (foam) { S.hl(x, y - 7, 5, 'linen', 10); S.px(x + 1, y - 8, 'linen', 9); S.px(x + 3, y - 8, 'linen', 10); } S.end();
}
function pint(D, x, y, lvl) {   // the glass beer mug (5×6, handle on the right) with beer at lvl 0…1: a head of foam when full, a foam line when part drunk, clean glass when empty
  x = Math.round(x); y = Math.round(y); const h = Math.round(clamp(lvl, 0, 1) * 5);
  D.beg(); D.rect(x, y, 5, 6, 'glass', h ? 6 : 4.5); if (h) D.rect(x + 1, y + 6 - h, 3, h, 'gold', 7);
  D.vl(x, y, 6, 'glass', 9); D.vl(x + 5, y + 1, 3, 'glass', 7); if (!h) { D.px(x + 2, y + 1, 'glass', 8); D.hl(x + 1, y + 5, 3, 'glass', 7); }
  if (lvl > 0.85) { D.hl(x, y - 1, 5, 'linen', 10); D.px(x + 2, y - 2, 'linen', 10); } else if (h) D.hl(x + 1, y + 6 - h, 3, 'linen', 9);
  D.end();
}
function barrelEnd(S, x, y, r) {   // a barrel lying on its side, seen end-on
  S.beg(); S.ell(x, y, r, r, 'wood', 5.5, { dome: 1 }); S.ell(x, y, r, r, 'iron', 6, { ring: 1.2 }); S.ell(x, y, r - 3, r - 3, 'wood', 4, { ring: 0.8 }); for (let k = -r + 2; k < r - 1; k += 3) S.vl(x + k, y - Math.round(Math.sqrt(Math.max(0, r * r - k * k)) * 0.85), Math.round(Math.sqrt(Math.max(0, r * r - k * k)) * 1.7), 'wood', 4.2);
  S.rect(x - 1, y + 1, 3, 3, 'brass', 7); S.px(x - 1, y + 1, 'brass', 9); S.vl(x, y + 4, 2, 'brass', 6); S.end();
}
X.def('tavern', {
  amb: [0.26, 0.24],
  paint(S, sc) {
    X.shell(S, sc, 'medieval');
    sc.light({ x: 52, y: 18, z: 22, r: 90, i: 1.05, c: '#ffb050', fl: 'candle', tint: 0.45 });               // 0 lantern over the bar
    sc.light({ x: 98, y: 22, z: 22, r: 80, i: 1.0, c: '#ffb050', fl: 'candle', ph: 2.3, tint: 0.45 });       // 1 lantern over the end of the bar
    sc.light({ x: 80, y: BARY - 7, z: 14, r: 32, i: 0.7, c: '#ffc070', fl: 'candle', ph: 4, tint: 0.5 });     // 2 candle on the bar
    sc.light({ x: 128, y: 60, z: 16, r: 40, i: 0.45, c: '#ff9a50', fl: 'fire', ph: 1, tint: 0.4 });           // 3 warm spill on the barrels
    S.lay('back');
    // bottle wall: three shelves of bottles in wine, green, amber, blue and clear glass; tankards on hooks under them
    S.beg(); [31, 43, 55].forEach(y => { S.box(16, y, 72, 3, 'wood', 6, { top: 1 }); S.px(18, y + 3, 'wood', 3); S.px(85, y + 3, 'wood', 3); }); S.end();
    const bc = [['crimson', 6], ['leaf', 6], ['gold', 6], ['tile', 6], ['linen', 6], ['crimson', 5], ['leaf', 5], ['gold', 7]];
    { const r = X.rng(21); [31, 43, 55].forEach((y, row) => { for (let x = 18; x < 86;) { const [m, tn] = bc[Math.floor(r() * bc.length)], h = 6 + Math.floor(r() * 4), w = r() < 0.2 ? 4 : 3;
      S.beg(); S.rect(x, y - h + 2, w, h - 2, m, tn); S.vl(x, y - h + 2, h - 2, m, tn + 2); S.vl(x + w - 1, y - h + 2, h - 2, m, tn - 1.5); S.rect(x + 1, y - h, 1, 2, m, tn + 1); S.px(x + 1, y - h - 1, 'wood', 5); if (r() < 0.5) S.hl(x, y - Math.round(h / 2), w, 'paper', 8);
      S.px(x, y - h + 3, 'linen', 10); S.end(); x += w + 1 + (r() < 0.25 ? 2 : 0); } }); }
    [20, 29, 38, 64, 73, 82].forEach((x, i) => { S.px(x + 2, 58, 'iron', 6); S.beg(); S.rect(x, 59, 5, 6, 'wood', 5.5 + (i % 2) * 0.5); S.vl(x, 59, 6, 'wood', 7); S.hl(x, 60, 5, 'iron', 7); S.hl(x, 63, 5, 'iron', 6); S.vl(x + 5, 60, 3, 'iron', 6); S.end(); });
    // posters of adventurers wanted on a board over the barrels
    S.beg(); S.box(108, 14, 36, 26, 'wood', 4); S.rect(110, 16, 32, 22, 'leather', 4); S.noise(110, 16, 32, 22, 1, 2, 9); S.end();
    [[111, 18, 0], [122, 17, 1], [132, 19, 2]].forEach(([x, y, i]) => { S.beg(); S.rect(x, y, 9, 13 - (i === 1 ? 0 : 1), 'paper', 8.5 - i * 0.4); S.hl(x, y, 9, 'paper', 9.5); S.vl(x + 8, y + 1, 11, 'paper', 6.5);
      S.ell(x + 4.5, y + 5, 2, 2, 'hair', 2); S.rect(x + 2, y + 7, 5, 3, 'hair', 2); if (i === 1) { S.rect(x + 3, y + 3, 3, 1, 'hair', 3); } S.hl(x + 1, y + 11, 7, 'hair', 4); S.px(x + 4, y, 'crimson', 7); S.end(); });
    S.beg(); S.ell(127, 35, 1.5, 1.5, 'gold', 8); S.ell(137, 35, 1.5, 1.5, 'gold', 8); S.end();
    // barrel rack: two barrels on a cradle, one on top, the lower right one tapped
    S.beg(); S.box(108, 87, 38, 3, 'wood', 4.5, { top: 1 }); S.end();
    barrelEnd(S, 118, 77, 9); barrelEnd(S, 136, 77, 9); barrelEnd(S, 127, 60, 8.5);
    // lantern brackets (lanterns hang in front), the stool rail
    // bar counter: a heavy top, panelled front, a brass foot rail, the tap with its handle (animated)
    S.lay('mid');
    S.beg(); S.box(10, BARY, 90, 3, 'wood', 7, { top: 2 }); S.hl(10, BARY - 2, 90, 'wood', 9); for (let x = 12; x < 98; x += 14) { S.box(x, BARY + 4, 12, FY - BARY - 5, 'wood', 4.5); S.rect(x + 2, BARY + 6, 8, FY - BARY - 9, 'wood', 3.8); } S.rect(10, BARY + 3, 90, 1, 'wood', 3); S.end();
    S.beg(); S.hcyl(10, 88, 90, 2, 'brass', 7, { rim: 1 }); S.end();
    S.beg(); S.rect(28, BARY - 9, 3, 7, 'brass', 7); S.vl(28, BARY - 9, 7, 'brass', 9); S.rect(26, BARY - 9, 7, 2, 'brass', 8); S.px(31, BARY - 4, 'brass', 6); S.rect(31, BARY - 5, 2, 1, 'brass', 7); S.end();
    // two tankards and a candle on the back edge of the bar top (back layer: the slid pint passes in front of them)
    S.lay('back'); tankard(S, 58, BARY - 2, 1); tankard(S, 66, BARY - 2, 0);
    S.beg(); S.rect(79, BARY - 8, 3, 5, 'linen', 9); S.hl(78, BARY - 3, 5, 'brass', 7); S.vl(79, BARY - 8, 5, 'linen', 10); S.end();   // the candle on the bar
    // the tip jar: a squat jar with a flared lip, heaped with coins (the adventurer's coin drops in here)
    S.beg(); S.rect(84, BARY - 7, 4, 5, 'glass', 3.5); S.hl(83, BARY - 8, 6, 'glass', 7.5); S.vl(84, BARY - 7, 5, 'glass', 8); S.vl(87, BARY - 7, 5, 'glass', 4.5);
    S.rect(85, BARY - 5, 2, 3, 'gold', 6.5); S.hl(85, BARY - 5, 2, 'gold', 8.5); S.px(86, BARY - 6, 'gold', 9.5); S.px(85, BARY - 5, 'gold', 10); S.px(86, BARY - 3, 'gold', 5); S.end(); S.lay('mid');
    // near the eye: two lanterns on chains, a bar stool
    S.lay('front');
    [[52, 12], [98, 16]].forEach(([x, y]) => { S.beg(); for (let k = 9; k < y; k += 2) { S.px(x, k, 'iron', 5); S.px(x, k + 1, 'iron', 3); } S.poly([[x - 4, y], [x + 4, y], [x + 3, y - 2], [x - 3, y - 2]], 'iron', 6); S.rect(x - 4, y, 1, 10, 'iron', 6); S.rect(x + 4, y, 1, 10, 'iron', 4); S.rect(x - 4, y + 10, 9, 2, 'iron', 5); S.px(x, y + 12, 'iron', 4); S.end(); });
    S.beg(); S.ell(62, 83, 6, 1.5, 'wood', 8.5, { n: [0, -0.8] }); S.hl(58, 82, 8, 'wood', 9.5, { n: [0, -0.8] }); S.hl(57, 84, 11, 'wood', 5); S.line(58, 85, 56, 90, 'wood', 5); S.line(66, 85, 68, 90, 'wood', 4); S.hl(58, 88, 9, 'wood', 5); S.end();
    sc.emit({ k: 'dust', x: 78, y: 36, w: 90, h: 30, rate: 0.8, sp: 2, life: 3.5 });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, TPER);
    // lantern glass, the middle bar, and the flame burning in front of it
    [[52, 12, 0.3], [98, 16, 1.7]].forEach(([x, y, ph]) => { D.lay('front'); D.rect(x - 3, y, 7, 10, 'lamp', 7, { e: ph < 1 ? 1 : 2 }); D.vl(x - 3, y + 1, 8, 'lamp', 8.5, { e: ph < 1 ? 1 : 2 }); D.vl(x, y, 10, 'iron', 4); flame(D, x, y + 8, 6, t, ph); });
    D.lay('back'); flame(D, 80, BARY - 9, 3, t, 4.1);
    // the tavern cat asleep on the top barrel: breathing, the tail swishing; it looks up when the pint lands
    if (!X.noWorkers) { const cx = 125, cy = 52, br = Math.round(Math.sin(t * 2) * 0.5 + 0.5), up = q > 0.74 && q < 0.86 ? 1 : 0; D.lay('back'); D.beg();
      D.rect(cx - 5, cy - 3 - br, 10, 3 + br, 'copper', 6.5); D.hl(cx - 5, cy - 3 - br, 10, 'copper', 8.5); [cx - 3, cx, cx + 3].forEach(x => D.vl(x, cy - 2 - br, 2 + br, 'copper', 5)); D.hl(cx - 4, cy - 1, 8, 'linen', 8);
      const hy = cy - 5 - up * 2; D.rect(cx + 4, hy, 4, 4, 'copper', 7); D.hl(cx + 4, hy, 4, 'copper', 8.5); D.px(cx + 4, hy - 1, 'copper', 7); D.px(cx + 7, hy - 1, 'copper', 7); D.px(cx + 7, hy + 2, 'linen', 9);
      if (up) { D.px(cx + 5, hy + 1, 'gold', 10, { e: 255 }); D.px(cx + 7, hy + 1, 'gold', 10, { e: 255 }); } else D.hl(cx + 5, hy + 2, 2, 'copper', 3);
      const tw = Math.sin(t * 1.6) * 3; for (let k = 0; k < 7; k++) D.px(cx - 6 - k, cy - 1 - Math.round(Math.sin(k / 6 * Math.PI) * tw * 0.6 + k * 0.2), 'copper', k > 4 ? 8 : 6); D.end(); }
    // ── one glass does the rounds every 9 s, always on screen: the adventurer drains it and slides it back up the bar, the
    // barkeep stops it, polishes it, carries it to the tap and fills it, then slides it down; the adventurer catches it,
    // raises it in a toast, drinks, and flicks a coin into the tip jar
    const npc = !X.noWorkers, qq = q < 0.5 ? q + 1 : q, lerp2 = (A, B, k) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k)];   // qq: the adventurer's turn with the glass runs 0.75 → 1.13, across the loop
    const BAR = [90, BARY - 6], BACK = [52, BARY - 6], TAP = [31, BARY - 8];   // glass top-left: at the adventurer's end, stopped by the barkeep, under the tap
    const lvl = q < 0.05 ? 0.55 : q < 0.1 ? lerp(0.55, 0, (q - 0.05) / 0.05) : q < 0.53 ? 0 : q < 0.62 ? (q - 0.53) / 0.09 : q < 0.86 ? 1 : q < 0.92 ? lerp(1, 0.55, (q - 0.86) / 0.06) : 0.55;
    // the adventurer's turn: [qq, glass x, y, his lean] — caught on the bar → raised in a toast → a long drink → back on the bar;
    // next loop a last pull empties it, he sets it down and leans in to push it back up the bar
    const AK = [[0.75, BAR[0], BAR[1], 0.25], [0.78, 91, 60, -0.2], [0.83, 91, 60, -0.2], [0.86, 93, 65, -0.15], [0.92, 93, 65, -0.15], [0.95, BAR[0], BAR[1], 0.25], [1.02, BAR[0], BAR[1], 0.25],
      [1.05, 93, 65, -0.15], [1.1, 93, 65, -0.15], [1.13, BAR[0], BAR[1], 0.25], [1.16, BAR[0], BAR[1], 0.45], [1.22, BAR[0], BAR[1], 0.25]];
    let gx = BAR[0], gy = BAR[1];
    if (qq >= 0.75 && qq < 1.13) [gx, gy] = kf(qq, AK);
    else if (q >= 0.13 && q < 0.22) { const k = (q - 0.13) / 0.09; gx = lerp(BAR[0], BACK[0], 1 - (1 - k) * (1 - k)); gy = BAR[1]; if (k < 0.8 && R() < 0.2) D.px(gx + 7 + Math.floor(R() * 4), BARY - 1, 'gold', 7); }
    else if (q >= 0.22 && q < 0.25) [gx, gy] = BACK;
    else if (q >= 0.52 && q < 0.62) [gx, gy] = TAP;
    // (from under the tap to the front edge of the bar top as it goes, so it slides in front of the tankards, the candle and the jar)
    else if (q >= 0.62 && q < 0.75) { const k = (q - 0.62) / 0.13; gx = lerp(TAP[0], BAR[0], 1 - (1 - k) * (1 - k)); gy = TAP[1] + Math.round(clamp(k / 0.12, 0, 1) * 2); if (k > 0.1 && k < 0.8 && R() < 0.25) D.px(gx - 2 - Math.floor(R() * 4), BARY - 1, 'gold', 8); }
    // the barkeep: wipes the bar (rag in his back hand, the other hand on the counter), stops the returned glass, polishes it,
    // carries it to the tap, pulls the pint (his back hand steadies the glass), slides it down the bar and walks back
    const look = { skin: ['skin', 6], hair: ['hair', 3], top: ['leaf', 5], bot: ['leather', 3], boot: ['hair', 2], apron: ['linen', 9], beard: ['hair', 4] }, BY = FY - 3;
    const walk = (ph) => { const s = Math.sin(ph); return { lF: s * 0.5, kF: Math.max(0, -s) * 0.5, lB: -s * 0.5, kB: Math.max(0, s) * 0.5, aB: -s * 0.4, eB: -0.3, bob: -Math.abs(Math.cos(ph)) + 0.4 }; };
    let bx = 46, bdir = 1, blean = 0.15, bF = null, bB = null, bp = {}, polish = false, knob = [0, 0];
    const pull = ease((q - 0.53) / 0.02) - ease((q - 0.595) / 0.02), kx = Math.round(-3 * pull), ky = Math.round(2 * pull);   // the tap handle, pulled down while the pint pours
    const wipe = () => [bx + 1 + Math.round(Math.sin(t * 4.5) * 3), BARY - 4], onBar = [bx + 7, BARY - 4], STOP = [BACK[0] - 1, BARY - 4], GRIP = [BACK[0] + 2, BACK[1] + 4];
    if (q >= 0.8 || q < 0.25) {
      bB = wipe(); bF = q >= 0.8 || q < 0.17 ? onBar : q < 0.22 ? lerp2(onBar, STOP, ease((q - 0.17) / 0.04)) : lerp2(STOP, GRIP, ease((q - 0.22) / 0.03));
      if (q >= 0.8 && q < 0.84) { const k = ease((q - 0.8) / 0.04), p0 = { aF: 0.4, eF: -0.4, aB: 0, eB: -0.3, lean: blean }; bF = lerp2(hand(bx, BY, p0, 1), bF, k); bB = lerp2(handB(bx, BY, p0, 1), bB, k); }
    } else if (q < 0.42) {   // lifts it to his chest and polishes it, the rag going round and round
      const k = ease((q - 0.25) / 0.04); [gx, gy] = lerp2(BACK, [bx + 4, 65 + Math.round(Math.sin(t * 3) * 0.6)], k); bF = [gx + 2, gy + 4];
      const rag = [gx + 2 + Math.round(Math.cos(t * 10) * 1.4), gy + 2 + Math.round(Math.sin(t * 10) * 1.6)]; bB = lerp2(wipe(), rag, k); polish = q >= 0.27;
    } else if (q < 0.52) {   // turns with it held to his chest and carries it to the tap
      if (q < 0.445) { const k = ease((q - 0.42) / 0.025); [gx, gy] = lerp2([bx + 4, 65], [bx - 1, 68], k); bB = lerp2([gx + 2, gy + 2], [bx - 2, BY - 9], k); polish = q < 0.43; }
      else { bdir = -1; bx = q < 0.45 ? 46 : Math.round(lerp(46, 36, (q - 0.45) / 0.07)); [gx, gy] = lerp2([bx - 3, 68], [bx - 5, 70], ease((q - 0.445) / 0.03)); if (q >= 0.45) bp = walk(t * 5); }
      bF = [gx + 2, gy + 4];
    } else if (q < 0.62) { bx = 36; bdir = -1; knob = [29 + kx, BARY - 16 + ky]; const k = ease((q - 0.52) / 0.015); bF = lerp2([TAP[0] + 2, TAP[1] + 4], knob, k); bp = { aB: lerp(0.2, 1.2, k), eB: lerp(-0.3, -1.2, k) }; }
    else if (q < 0.66) { bx = 36; const k = (q - 0.62) / 0.04; blean = lerp(0, 0.6, k); bp = { aF: lerp(1.2, 1.9, k), eF: 0, aB: 0.3 }; }   // the push
    else if (q < 0.7) { bx = 36; const k = ease((q - 0.66) / 0.04); blean = lerp(0.6, 0.15, k); bp = { aF: lerp(1.9, 0.4, k), eF: lerp(0, -0.4, k), aB: 0.2 }; }
    else { bx = Math.round(lerp(36, 46, (q - 0.7) / 0.1)); bp = Object.assign(walk(t * 5), { aF: 0.4, eF: -0.4 }); }
    const bpose = Object.assign({ aF: 0.4, eF: -0.4, aB: 0.2, eB: -0.3 }, bp, { lean: blean });
    if (bF) [bpose.aF, bpose.eF] = reach(bx, BY, blean, bdir, bF[0], bF[1]);
    if (bB) [bpose.aB, bpose.eB] = reach(bx, BY, blean, bdir, bB[0], bB[1], true);
    D.lay('back'); worker(D, bx, BY, look, bpose, bdir);
    const [rx, ry] = handB(bx, BY, bpose, bdir);
    if (npc && !polish) { D.hl(rx - 1, ry, 3, 'red', 6.5); D.hl(rx - 1, ry + 1, 3, 'linen', 8.5); D.px(rx, ry + 2, 'red', 5); }   // the striped rag in his back hand
    // the tap handle
    D.lay('mid'); D.beg(); D.line(29, BARY - 9, 29 + kx, BARY - 15 + ky, 'wood', 4, { w: 1 }); D.rect(28 + kx, BARY - 16 + ky, 3, 2, 'crimson', 6); D.end();
    // the adventurer at the end of the bar: hooded, a sword on his back; his hand holds the glass by its handle whenever he has it
    const ax = 101, alook = { skin: ['skin', 5], hair: ['hair', 2], top: ['leather', 4.5], bot: ['denim', 3], boot: ['leather', 2], hood: ['crimson', 4] }, REST = [97, BARY - 3], HOLD = [BAR[0] + 6, BAR[1] + 2];
    const alean = kf(qq, AK)[2]; let aT;
    if (qq >= 0.75 && qq < 1.13 && !(qq >= 0.95 && qq < 1.02)) aT = [gx + 6, gy + 2];
    else if (qq >= 0.95 && qq < 1.02) { const f = q >= 0.95 ? Math.sin(clamp((q - 0.95) / 0.035, 0, 1) * Math.PI) : 0; aT = [HOLD[0] + Math.round(f), HOLD[1] - Math.round(f * 2)]; }   // the coin flick
    else if (q >= 0.13 && q < 0.22) aT = q < 0.16 ? [Math.max(gx + 6, 91), HOLD[1]] : lerp2([91, HOLD[1]], REST, ease((q - 0.16) / 0.06));   // the push back up the bar
    else if (q >= 0.73 && q < 0.75) aT = lerp2(REST, HOLD, ease((q - 0.73) / 0.02));   // reaching for the pint as it slides in
    else aT = [REST[0], REST[1] - (q > 0.3 && q < 0.66 && Math.floor(t * 7) % 4 === 0 ? 1 : 0)];   // fingers drumming on the bar
    const [aF, eF] = reach(ax, FY, alean, -1, aT[0], aT[1]), toast = q > 0.76 && q < 0.84, apose = { aF, eF, aB: toast ? 0.7 : 0.3, eB: -0.2, lF: 0.1, lB: -0.25, lean: alean };
    D.lay('mid');
    if (npc) { D.beg(); D.line(ax + 3, FY - 26, ax + 7, FY - 11, 'iron', 8); D.line(ax + 2, FY - 27, ax + 3, FY - 25, 'leather', 4); D.hl(ax + 1, FY - 24, 4, 'brass', 7); D.end(); }   // sword on the back
    worker(D, ax, FY, alook, apose, -1);
    // the glass, then the barkeep's polishing rag on it
    if (npc) { pint(D, gx, gy, lvl); if (polish) { D.hl(rx - 1, ry, 3, 'red', 6.5); D.hl(rx - 1, ry + 1, 3, 'linen', 8.5); } }
    if (npc && toast && !st.toast) { st.toast = 1; rs.burst('steam', gx + 2, gy - 5, 3, { sp: 16, ang: 0, spread: 1.4, life: 0.55 }); rs.burst('glint', gx + 2, gy - 4, 6, { sp: 26, ang: 0, spread: 2.4, life: 0.6 }); rs.flash(0, 0.5); rs.flash(1, 0.7); rs.flash(2, 0.6); }
    if (npc && polish && R() < 0.06) rs.burst('glint', gx + 1 + R() * 3, gy + 1 + R() * 3, 1, { sp: 3, life: 0.4 });   // the glass squeaks clean
    // the coin: flicked from his fingers into the tip jar, spinning, a glint as it drops in
    if (npc && q > 0.955 && q < 0.99) { const k = (q - 0.955) / 0.035, cx2 = lerp(HOLD[0] + 1, 85.5, k), cy2 = lerp(HOLD[1] - 2, BARY - 9, k) - Math.sin(k * Math.PI) * 9, face = Math.floor(t * 20) % 2; D.rect(cx2 - (face ? 1 : 0), cy2, face ? 3 : 1, 2, 'gold', 9, { e: 255 }); }
    if (npc && q >= 0.99 && !st.coin) { st.coin = 1; rs.burst('glint', 86, BARY - 9, 3, { sp: 12, life: 0.5 }); }
    if (q < 0.5) { st.toast = 0; st.coin = 0; }
  },
});

// what each pixel room shows, in words (M.ROOM_D; docs/effects.md §R is generated from it)
const D_ = {
  tavern: '吧台后是一整墙五颜六色的酒瓶，架下挂着木酒杯，右边酒桶架上方贴着招募冒险者的告示，桶上趴着一只甩尾巴的橘猫；两盏提灯里烛火摇曳；酒保拿条纹抹布擦吧台；戴兜帽的冒险者靠在吧台尽头，喝干一杯就把空杯顺着吧台推回去，酒保接住擦亮，端去酒头接满，再顺着吧台滑过去；冒险者一把接住举杯，泡沫飞溅、灯火一亮、橘猫抬头，喝上一大口，再弹一枚金币进小费罐',
  vault: '铆钉铁墙上嵌着巨大的圆形金库门；金条堆成金字塔，金币顺着铜滑槽一枚枚滚进金币堆；每隔一阵管理员把拉杆顺着槽一拉到底：黄色警灯旋转、转轮飞转、门栓收回，门向外转开，金光从库里涌出、洒满地面，再轰地关上、门栓弹回、喷一团汽',
  lookout: '圆形雷达屏上扫描线转圈，亮点被扫到就亮一下再慢慢暗；戴耳机的监听员坐在转椅上敲键；波形屏上信号流动，路线图上一圈信号扩散、点亮 3 步以内的节点；磁带机的卷盘转着，天线碟慢慢转；每隔一阵出现目标：红点闪、红色警灯把屋子照红、波形乱跳、卷盘飞转，监听员按住耳机凑近，天线转过去对准',
  storage: '架子上摆着五种支援道具：装着闪电的玻璃罐、蜡烛、旧相框、铃和骰盅边的两颗骰子；木箱堆成小塔，顶上系着粉色气球轻轻晃；墙上挂着打包清单小黑板；店员从筐里拿道具扔进行军包，每装进一件清单上就打一个勾，五件装齐画一颗星；每三次扔一个金光闪闪的，霓虹星星一亮、气球一跳；彩灯串一闪一闪',
  training: '石墙上挂着盾牌、军旗和插着箭的箭靶，墙下是木剑和长矛架；新兵对着草人木桩一刀刀劈砍，木桩的横杆被打得转圈；每隔一阵他跃起一记重斩，草屑飞散、金光一亮；角落里的大汉举着杠铃，火把和油灯摇晃',
};
if (M.ROOM_D) Object.assign(M.ROOM_D, D_);
})();
