// ==== mc-px16-rigs.js ====
(function () {
// Non-humanoid rigs: four-legged beasts, birds, dragons, flyers, copters, bugs and crawlers, floating eyes, bots,
// siege engines, towers, the egg stone, trees, mimics and centaurs. Same pose numbers as the humanoid rig.
const M = window.MC, P16 = M.P16, RIG = P16.RIGS, R = Math.round;
const glowT = (p) => (p.glow === 2 ? 5 : p.glow === 1 ? 4 : p.st === 'charge' ? 4 : 3);

// ───────── four-legged beasts ─────────
// kind: wolf dog bear boar pig horse rat leopard lion cerberus. Chibi 16-bit proportions: short deep body, chest bigger
// than the hips, a big head held highest, thick legs, ears up.
RIG.beast = function (B, s, p) {
  const S = s.S, k = s.kind || 'wolf';
  // [body length, body height, leg length, head size, neck lift] as fractions of S
  const T = { wolf: [0.95, 0.42, 0.3, 0.46, 0.35], dog: [0.85, 0.42, 0.28, 0.46, 0.3], bear: [1.05, 0.56, 0.24, 0.46, 0.15], boar: [1.0, 0.54, 0.22, 0.46, 0.1], pig: [0.9, 0.52, 0.2, 0.44, 0.1], horse: [1.05, 0.42, 0.42, 0.4, 0.62], rat: [0.95, 0.4, 0.16, 0.42, 0.1], leopard: [1.1, 0.38, 0.3, 0.42, 0.14], lion: [1.05, 0.46, 0.3, 0.52, 0.35], cerberus: [1.0, 0.46, 0.3, 0.44, 0.35] }[k] || [0.95, 0.42, 0.3, 0.46, 0.35];
  const BL = R(S * T[0]), BH = Math.max(5, R(S * T[1])), LL = Math.max(3, R(S * T[2])), HS = Math.max(6, R(S * T[3])), NL = R(S * T[4]);
  const atk = p.st === 'atk', ch = p.st === 'charge', cs = p.st === 'cast';
  const lunge = atk ? [0, 3, 1][p.f] : cs ? 1 : 0, crouch = atk && p.f === 0 ? 1 : 0, bob = (p.bob || 0) + crouch;
  const by = -LL - R(BH / 2) + bob, bx = lunge - (p.hurt ? 1 : 0), st = p.st === 'walk' ? p.step * 2 : 0;
  const thick = k === 'bear' || k === 'boar' || k === 'lion' ? 4 : k === 'rat' || k === 'pig' ? 2 : 3;
  const chest = [bx + R(BL * 0.18), by - 1], hip = [bx - R(BL * 0.22), by + 1];
  const leg = (x, o, near) => { const top = by + 1; B.l(x, top, x + o, -2, near ? 'fur' : 'fur2', thick, near ? undefined : 2); B.r(x + o - 1, -2, thick + 1, 2, 'claw', near ? undefined : 2); };
  // far legs
  leg(hip[0] - 1, -st, false); leg(chest[0] + 1, st, false);
  // tail
  const tx = hip[0] - R(BL * 0.3), ty = by - R(BH * 0.25), sw = p.sway || (p.st === 'walk' ? p.f % 2 : 0);
  if (k === 'rat') B.l(tx + 1, ty + 3, tx - R(S * 0.5), ty + 1 + sw, 'tail');
  else if (k === 'horse' || k === 'lion') { B.l(tx + 1, ty, tx - 3, ty + 6 + sw, 'hair', 3); if (k === 'lion') B.d(tx - 3, ty + 7 + sw, 1.2, 'hair'); }
  else if (k === 'pig' || k === 'boar') { B.p(tx + 1, ty, 'fur'); B.p(tx, ty - 1 + sw, 'fur'); B.p(tx - 1, ty - 1, 'fur'); }
  else if (k === 'bear') B.d(tx + 2, ty, 1.6, 'fur');
  else if (k === 'leopard') { B.l(tx + 1, ty, tx - R(S * 0.22), ty + 3 + sw, 'fur', 2); B.l(tx - R(S * 0.22), ty + 3 + sw, tx - R(S * 0.32), ty - 2 + sw, 'fur', 2); }
  else B.g([[tx + 2, ty - 1], [tx + 2, ty + 3], [tx - R(S * 0.28), ty - 3 + sw], [tx - R(S * 0.3), ty - 6 + sw], [tx - R(S * 0.1), ty - 4]], 'fur');
  // body: hips + chest, belly light underneath
  B.e(hip[0], hip[1], R(BL * 0.3), R(BH * 0.46), 'fur'); B.e(chest[0], chest[1], R(BL * 0.36), R(BH * 0.54), 'fur');
  B.e(bx, by + R(BH * 0.3), R(BL * 0.34), Math.max(1, R(BH * 0.16)), 'belly');
  if (s.spots) for (let i = 0; i < 6; i++) B.p(bx - BL * 0.35 + i * BL * 0.13, by - BH * 0.2 + (i % 2) * 2, 'fur2', 1);
  if (s.stripes) for (let i = 0; i < 4; i++) B.l(bx - BL * 0.3 + i * BL * 0.18, by - BH * 0.45, bx - BL * 0.3 + i * BL * 0.18 - 1, by, 'fur2', 1, 1);
  if (s.bristle || k === 'boar') for (let i = 0; i < BL * 0.7; i += 2) B.p(bx - BL * 0.35 + i, by - R(BH * 0.5) - 1 - (i % 4 ? 0 : 1), 'fur2');
  if (s.saddle) { B.r(bx - 3, by - R(BH / 2) - 1, 7, 3, 'cloth'); B.r(bx - 3, by - R(BH / 2) + 2, 7, 1, 'trim'); }
  if (s.armor) { B.g([[bx - BL * 0.35, by - BH * 0.5], [bx + BL * 0.2, by - BH * 0.55], [bx + BL * 0.2, by - BH * 0.2], [bx - BL * 0.35, by - BH * 0.15]], 'metal'); }
  if (s.spikes) for (let i = 0; i < 5; i++) B.l(bx - BL * 0.3 + i * BL * 0.15, by - BH * 0.5, bx - BL * 0.36 + i * BL * 0.15, by - BH * 0.5 - 3 - (i % 2), 'claw', 1, 4);
  // near legs
  leg(hip[0] + 1, st, true); leg(chest[0] + 2, -st, true);
  // neck + head(s)
  const heads = k === 'cerberus' ? [[-3, -3, 1], [3, 2, 1], [0, 0, 0]] : [[0, 0, 0]];
  heads.forEach(([ox, oy, side]) => {
    const hs = side ? HS - 1 : HS, up = ch ? -3 : 0;
    const hx = chest[0] + R(BL * 0.28) + ox + (atk && p.f >= 1 ? 2 : 0), hy = by - R(BH * 0.4) - NL + oy + up + (atk && p.f === 1 ? 2 : 0) + (k === 'bear' || k === 'boar' || k === 'pig' ? 2 : 0);
    B.l(chest[0] + 1, by - 1, hx, hy + R(hs * 0.5), 'fur', Math.max(3, R(hs * 0.55)));
    if (k === 'lion' || s.mane) B.d(hx - 2, hy + R(hs * 0.45), R(hs * 0.72), 'hair');
    if (k === 'horse' && !side) { for (let i = 0; i < NL; i += 2) B.p(chest[0] - 1 + i * 0.4, by - 2 - i, 'hair'); }
    // skull, snout, jaw
    B.e(hx, hy + R(hs * 0.45), R(hs * 0.48), R(hs * 0.45), 'fur');
    const sn = k === 'horse' ? R(hs * 0.7) : k === 'bear' || k === 'pig' || k === 'rat' || k === 'boar' ? R(hs * 0.42) : R(hs * 0.55), open = atk && p.f === 1 || cs ? 2 : 0;
    const sy = hy + R(hs * 0.45);
    B.r(hx + R(hs * 0.3), sy - 1, sn, R(hs * 0.32), 'fur'); B.r(hx + R(hs * 0.3), sy - 1 + R(hs * 0.32) + open, sn - 1, 2, 'fur', 1);
    if (open) { B.r(hx + R(hs * 0.3), sy - 1 + R(hs * 0.32), sn - 1, open, 'blood', 2); B.p(hx + R(hs * 0.3) + sn - 2, sy - 1 + R(hs * 0.32), 'bone', 5); B.p(hx + R(hs * 0.3) + 1, sy - 1 + R(hs * 0.32), 'bone', 5); }
    B.p(hx + R(hs * 0.3) + sn - 1, sy - 1, 'ink', 2);
    if (k === 'pig' || k === 'boar') { B.r(hx + R(hs * 0.3) + sn - 1, sy - 1, 2, R(hs * 0.32), 'belly'); B.p(hx + R(hs * 0.3) + sn, sy, 'ink', 1); }
    if (k === 'boar' || s.tusks) { B.l(hx + R(hs * 0.3) + 1, sy + R(hs * 0.3), hx + R(hs * 0.3) + 2, sy - 2, 'bone', 1, 5); }
    B.p(hx + R(hs * 0.18), hy + R(hs * 0.3), 'eye', s.glowEyes ? 5 : 1); if (hs >= 9) B.p(hx + R(hs * 0.18) - 1, hy + R(hs * 0.3), 'eye', s.glowEyes ? 4 : 1);
    // ears
    const ex = hx - R(hs * 0.2), ey = hy + 1;
    if (k === 'wolf' || k === 'dog' || k === 'cerberus' || k === 'leopard' || k === 'lion') B.g([[ex - 2, ey], [ex + 1, ey], [ex - 1, ey - (k === 'dog' || k === 'lion' ? 2 : 4)]], 'fur');
    else if (k === 'horse') B.g([[ex, ey], [ex + 2, ey], [ex + 1, ey - 3]], 'fur');
    else if (k === 'bear' || k === 'rat') B.d(ex, ey, k === 'rat' ? 1.8 : 1.4, 'fur');
    else if (k === 'pig' || k === 'boar') B.g([[ex - 1, ey + 1], [ex + 2, ey], [ex + 1, ey + 3]], 'fur2');
    if (s.horns) { B.l(ex, ey, ex - 3, ey - 5, 'horn', 1, 4); B.l(ex + 2, ey, ex + 1, ey - 5, 'horn', 1, 4); }
    if (s.crown && !side) { B.r(hx - 3, hy - 2, 6, 2, 'gold'); B.p(hx - 3, hy - 3, 'gold', 4); B.p(hx - 1, hy - 3, 'gold', 4); B.p(hx + 1, hy - 3, 'gold', 4); B.p(hx - 1, hy - 1, 'gem', 5); }
    if (!side) B.focus = [hx + R(hs * 0.3) + sn, sy + R(hs * 0.2)];
  });
  if (s.flameMane) { const f = p.f % 2; B.p(chest[0], by - R(BH / 2) - 2 - f, 'flame', 5); B.p(bx - 2, by - R(BH / 2) - 1 + f, 'flame', 4); B.p(bx + 2, by - R(BH / 2) - 3, 'flame', 4); B.p(hip[0], by - R(BH / 2) - 1, 'flame', 3); }
  if (s.aura) { const f = p.f % 2; B.p(bx - BL * 0.4, by - BH - f, 'gem', 4); B.p(bx + BL * 0.3, by - BH - 1 + f, 'gem', 4); }
};

// ───────── upright dinosaur / big biped beasts ─────────
RIG.dino = function (B, s, p) {
  const S = s.S, atk = p.st === 'atk', bob = p.bob || 0, st = p.st === 'walk' ? p.step * 2 : 0, lg = R(S * 0.3), by = -lg - R(S * 0.18) + bob;
  B.g([[-2, by - 2], [-2, by + 4], [-R(S * 0.8), by + 5 + (p.sway || 0)]], 'fur');
  B.l(-1, by + 3, -2 - st, -2, 'fur2', 3); B.r(-3 - st, -2, 4, 2, 'claw');
  B.e(0, by, R(S * 0.28), R(S * 0.22), 'fur'); B.e(1, by + 2, R(S * 0.18), R(S * 0.1), 'belly');
  B.l(2, by + 3, 2 + st, -2, 'fur', 3); B.r(1 + st, -2, 5, 2, 'claw');
  const hx = R(S * 0.28) + (atk && p.f >= 1 ? 2 : 0), hy = by - R(S * 0.32) + (p.st === 'charge' ? -2 : 0), open = atk && p.f === 1 || p.st === 'cast' ? 2 : 0;
  B.l(2, by - 2, hx - 2, hy + 4, 'fur', 4);
  B.r(hx - 3, hy, R(S * 0.34), 4, 'fur'); B.r(hx - 3, hy + 4 + open, R(S * 0.3), 2, 'fur'); if (open) B.r(hx - 1, hy + 4, R(S * 0.28), open, 'blood', 2);
  for (let i = 0; i < R(S * 0.28); i += 2) B.p(hx - 1 + i, hy + 4, 'bone', 5);
  B.p(hx, hy + 1, 'eye', s.glowEyes ? 5 : 1); B.l(R(S * 0.1), by - 1, R(S * 0.2), by + 3, 'claw');
  if (s.spikes) for (let i = 0; i < 4; i++) B.p(-4 + i * 2, by - R(S * 0.22) - 1, 'claw', 4);
  B.focus = [hx + R(S * 0.3), hy + 4];
};

// ───────── birds ─────────
// kind: chick rooster turkey eagle
RIG.bird = function (B, s, p) {
  const S = s.S, k = s.kind || 'chick', fly = k === 'eagle' && s.fly, atk = p.st === 'atk', st = p.st === 'walk' ? p.step : 0;
  const lift = fly ? 6 + (p.f % 2) : 0, by = -R(S * 0.35) - lift + (p.bob || 0), bw = R(S * (k === 'turkey' ? 0.42 : k === 'eagle' ? 0.34 : 0.3)), bh = R(S * (k === 'chick' ? 0.32 : 0.3));
  if (k === 'turkey') for (let i = -3; i <= 3; i++) B.l(-bw + 1, by - 1, -bw - 3 + Math.abs(i) * 0.5, by - bh - 2 + Math.abs(i) * 1.2, i % 2 ? 'trim' : 'fur2', 2);
  if (!fly) { B.l(-1, by + bh - 1, -1 - st, -1, 'claw'); B.l(2, by + bh - 1, 2 + st, -1, 'claw'); B.r(-2 - st, -1, 3, 1, 'claw'); B.r(1 + st, -1, 3, 1, 'claw'); }
  B.e(0, by, bw, bh, 'fur'); B.e(1, by + 1, bw - 2, bh - 2, 'belly');
  const flap = p.st === 'charge' || p.st === 'cast' || fly ? (p.f % 2 ? -4 : 2) : 0;
  if (fly || k === 'eagle') B.g([[-2, by - 1], [-bw - 4, by - 5 + flap], [-bw - 2, by + 1 + flap / 2], [0, by + 2]], 'wing'); else B.e(-1, by + 1, R(bw * 0.6), R(bh * 0.5), 'wing');
  const hx = R(bw * 0.6) + (atk && p.f === 1 ? 2 : 0), hy = by - bh - (k === 'chick' ? 0 : 2);
  B.d(hx, hy, R(S * (k === 'chick' ? 0.18 : 0.16)), 'fur');
  B.g([[hx + 2, hy - 1], [hx + 5 + (k === 'eagle' ? 1 : 0), hy + (k === 'eagle' ? 1 : 0)], [hx + 2, hy + 2]], 'beak'); if (k === 'eagle') B.p(hx + 5, hy + 2, 'beak', 1);
  B.p(hx + 1, hy - 1, 'eye', 1);
  if (k === 'rooster') { B.p(hx - 1, hy - 3, 'comb'); B.p(hx, hy - 4, 'comb'); B.p(hx + 1, hy - 3, 'comb'); B.p(hx + 2, hy + 3, 'comb'); B.l(-bw, by - 2, -bw - 3, by - 6, 'trim', 2); }
  if (k === 'turkey') { B.l(hx + 2, hy + 2, hx + 2, hy + 4, 'comb'); }
  if (s.gear) { B.r(-2, by - bh, 4, 2, 'metal'); }
  B.focus = [hx + 5, hy];
};

// ───────── dragons: compact body, S-curved neck held high, big raised wings, curled tail ─────────
RIG.dragon = function (B, s, p) {
  const S = s.S, atk = p.st === 'atk', cs = p.st === 'cast', ch = p.st === 'charge', fly = s.fly !== false, flap = p.f % 2;
  if (s.eastern) return RIG.serpent(B, s, p);
  const lift = fly ? 4 + flap : 0, BL = R(S * 0.62), BH = R(S * 0.34), LL = fly ? 0 : R(S * 0.22), by = -LL - R(BH / 2) - lift + (p.bob || 0), bx = atk ? [0, 2, 1][p.f] : 0;
  const up = ch || cs ? -3 : flap ? -4 : 1, wl = R(S * 0.72);
  // far wing (darker), tail
  const wx = bx - 2, wy = by - R(BH * 0.4);
  if (!s.noWings) B.g([[wx, wy], [wx - R(wl * 0.3), wy - R(wl * 0.8) + up], [wx - wl, wy - R(wl * 0.45) + up], [wx - R(wl * 0.55), wy - 2], [wx - R(wl * 0.3), wy + 2]], 'wing', 2);
  const sw = p.sway || 0, tx = bx - R(BL * 0.45);
  B.l(tx, by, tx - R(S * 0.3), by + 4 + sw, 'fur', 3); B.l(tx - R(S * 0.3), by + 4 + sw, tx - R(S * 0.46), by - 1 + sw, 'fur', 2); B.g([[tx - R(S * 0.46), by - 1 + sw], [tx - R(S * 0.56), by - 3 + sw], [tx - R(S * 0.46), by + 2 + sw]], 'horn');
  // legs
  const legs = (near) => [[bx - R(BL * 0.25)], [bx + R(BL * 0.22)]].forEach(([x0]) => { const x = x0 + (near ? 1 : -1); if (fly) { B.l(x, by + R(BH * 0.3), x - 2, by + R(BH * 0.3) + 4, near ? 'fur' : 'fur2', 2, near ? undefined : 2); B.r(x - 3, by + R(BH * 0.3) + 4, 3, 1, 'claw'); } else { B.l(x, by + 1, x, -2, near ? 'fur' : 'fur2', 3, near ? undefined : 2); B.r(x - 1, -2, 4, 2, 'claw'); } });
  legs(false);
  B.e(bx, by, R(BL / 2), R(BH / 2), 'fur'); B.e(bx + 1, by + R(BH * 0.22), R(BL / 2) - 2, Math.max(1, R(BH * 0.2)), 'belly');
  if (s.bones) for (let i = -1; i <= 1; i++) B.l(bx + i * 3, by - R(BH / 2) + 1, bx + i * 3, by + R(BH / 2) - 1, 'ink', 1, 2);
  for (let i = 0; i < 4; i++) B.p(bx - R(BL * 0.3) + i * R(BL * 0.18), by - R(BH / 2) - 1, 'horn', 4);
  legs(true);
  // S-curved neck up to the head
  const hs = Math.max(6, R(S * 0.3)), hx = bx + R(BL * 0.45) + (atk && p.f >= 1 ? 3 : 0), hy = by - R(S * (s.noWings ? 0.34 : 0.5)) + (ch ? -2 : 0) + (atk && p.f === 1 ? 3 : 0), nk = Math.max(3, R(S * 0.13)), open = atk && p.f === 1 || cs ? 2 : 0;
  const n0 = [bx + R(BL * 0.35), by - 2], n1 = [bx + R(BL * 0.55), by - R(S * 0.22)], n2 = [hx - 1, hy + R(hs * 0.6)];
  B.l(n0[0], n0[1], n1[0], n1[1], 'fur', nk + 1); B.l(n1[0], n1[1], n2[0], n2[1], 'fur', nk); B.l(n1[0] + 1, n1[1] + 1, n2[0] + 1, n2[1] + 1, 'belly', 1);
  B.e(hx, hy + R(hs * 0.45), R(hs * 0.5), R(hs * 0.42), 'fur');
  B.r(hx + R(hs * 0.3), hy + R(hs * 0.3), R(hs * 0.62), R(hs * 0.3), 'fur'); B.r(hx + R(hs * 0.3), hy + R(hs * 0.6) + open, R(hs * 0.55), 2, 'fur', 1);
  if (open) B.r(hx + R(hs * 0.3), hy + R(hs * 0.6), R(hs * 0.55), open, 'glow', 4);
  B.p(hx + R(hs * 0.3) + R(hs * 0.62) - 1, hy + R(hs * 0.3), 'ink', 2);
  B.p(hx + 1, hy + R(hs * 0.3), 'eye', 5); B.l(hx - 1, hy + 1, hx - 5, hy - 3, 'horn', 1, 4); B.l(hx + 1, hy, hx - 1, hy - 5, 'horn', 1, 4);
  // near wing (with arm bones)
  if (!s.noWings) { B.g([[wx + 2, wy], [wx - R(wl * 0.15), wy - R(wl * 0.9) + up], [wx - R(wl * 0.8), wy - R(wl * 0.5) + up], [wx - R(wl * 0.4), wy - 1], [wx - R(wl * 0.15), wy + 3]], 'wing'); B.l(wx + 2, wy, wx - R(wl * 0.15), wy - R(wl * 0.9) + up, 'fur', 1, 1); B.l(wx - R(wl * 0.15), wy - R(wl * 0.9) + up, wx - R(wl * 0.8), wy - R(wl * 0.5) + up, 'fur', 1, 1); }
  B.focus = [hx + R(hs * 0.3) + R(hs * 0.62), hy + R(hs * 0.55)];
};
// eastern dragon: a floating serpent with whiskers and small legs
RIG.serpent = function (B, s, p) {
  const S = s.S, f = p.f, atk = p.st === 'atk', ch = p.st === 'charge', n = 12, r = Math.max(2, R(S * 0.1));
  const pts = []; for (let i = 0; i < n; i++) { const t = i / (n - 1), x = -R(S * 0.55) + t * R(S * 0.95), y = -R(S * 0.45) - Math.sin(t * Math.PI * 1.5 + f * 0.8) * R(S * 0.14) - t * R(S * 0.1) + (p.bob || 0); pts.push([x, y]); }
  pts.forEach((q, i) => { B.d(q[0], q[1], r - (i < 3 ? 1 : 0), 'fur'); if (i % 2) B.p(q[0], q[1] + r - 1, 'belly', 4); });
  for (let i = 1; i < n - 1; i += 2) B.p(pts[i][0], pts[i][1] - r, 'horn', 4);
  [[3], [8]].forEach(([i]) => { const q = pts[i]; B.l(q[0], q[1] + r, q[0] + 1, q[1] + r + 3, 'fur2', 1); B.p(q[0] + 2, q[1] + r + 3, 'claw'); });
  const h = pts[n - 1], hx = h[0] + 2 + (atk && p.f >= 1 ? 3 : 0), hy = h[1] - 2 - (ch ? 2 : 0), hs = Math.max(5, R(S * 0.22));
  B.e(hx, hy, R(hs * 0.55), R(hs * 0.45), 'fur'); B.r(hx + 2, hy, R(hs * 0.6), R(hs * 0.35), 'fur'); B.p(hx + 1, hy - 1, 'eye', 5);
  B.l(hx + 2, hy + 2, hx + 6, hy + 5 + (f % 2), 'hair', 1, 4); B.l(hx - 1, hy - 2, hx - 4, hy - 5, 'horn', 1, 4); B.l(hx + 1, hy - 2, hx, hy - 6, 'horn', 1, 4);
  if (atk && p.f === 1 || p.st === 'cast') B.p(hx + R(hs * 0.6) + 2, hy + 1, 'glow', 5);
  B.focus = [hx + R(hs * 0.6) + 2, hy + 1];
};

// ───────── flyers: bat, manta, warp craft ─────────
RIG.fly = function (B, s, p) {
  const S = s.S, k = s.kind || 'bat', f = p.f % 2, by = -R(S * 0.6) - f + (p.bob || 0), atk = p.st === 'atk';
  if (k === 'bat') {
    const wu = p.st === 'walk' || p.st === 'idle' ? (f ? -5 : 1) : p.st === 'charge' ? -6 : -2, W = R(S * 0.55);
    B.g([[0, by], [-W, by - 3 + wu], [-W + 2, by + 3], [-W + 4, by + 1], [-2, by + 3]], 'wing', 2);
    B.e(0, by + 1, R(S * 0.16), R(S * 0.2), 'fur'); B.p(-1, by - 3, 'fur'); B.p(2, by - 3, 'fur'); B.p(2, by, 'eye', 5); B.p(3, by + 2, 'bone', 5);
    B.g([[0, by], [W, by - 3 + wu], [W - 2, by + 3], [W - 4, by + 1], [2, by + 3]], 'wing');
    if (s.gun) { B.l(2, by + 4, 8, by + 4, 'iron', 2); if (atk && p.f === 1) B.p(9, by + 4, 'flame', 5); B.focus = [9, by + 4]; } else B.focus = [3, by + 2];
  } else if (k === 'manta') {
    const wv = f ? -3 : 3, W = R(S * 0.6), T = Math.max(4, R(S * 0.22));
    B.g([[-W + 2, by + wv], [-2, by - T], [W, by], [-2, by + T]], 'fur'); B.g([[-W + 4, by + wv + 1], [-2, by + 1], [W - 3, by + 1], [-2, by + T - 1]], 'belly'); B.e(W - 5, by, 3, 2, 'fur'); B.l(-W + 2, by + wv, -W - 5, by + wv + 2 + f, 'fur2'); B.p(W - 4, by - 1, 'eye', 5); B.p(W - 6, by - 1, 'eye', 5);
    B.focus = [W, by + 1];
  } else if (k === 'warp') {
    const W = R(S * 0.6), T = Math.max(4, R(S * 0.26)); B.g([[-W, by - T], [W, by], [-W, by + T], [-W + 5, by]], 'metal'); B.g([[-W + 5, by - 2], [W - 4, by], [-W + 5, by + 2]], 'iron'); B.l(-W + 4, by, W - 2, by, 'gem', 1, 4); B.p(-W - 1 - f, by - 2, 'flame', 4); B.p(-W - 1 - f, by + 2, 'flame', 4); B.focus = [W, by];
  }
};
RIG.copter = function (B, s, p) {
  const S = s.S, f = p.f % 2, by = -R(S * 0.55) + (p.bob || 0) - f;
  const bw = R(S * 0.34), bh = R(S * 0.24);
  B.l(-bw, by, -bw - R(S * 0.35), by - 2, 'metal', 2); B.l(-bw - R(S * 0.35), by - 4, -bw - R(S * 0.35), by + 1, 'iron', 1);
  B.e(0, by, bw, bh, 'metal'); B.e(bw - 3, by - 1, R(bw * 0.4), R(bh * 0.55), 'glass', 4);
  B.l(0, by - bh, 0, by - bh - 2, 'iron'); const rw = R(S * 0.6); if (f) B.l(-rw, by - bh - 3, rw, by - bh - 3, 'iron', 1, 4); else { B.l(-rw * 0.5, by - bh - 3, rw * 0.5, by - bh - 3, 'iron'); B.p(-rw, by - bh - 3, 'iron', 1); B.p(rw, by - bh - 3, 'iron', 1); }
  B.l(-bw + 2, by + bh, -bw + 2, by + bh + 2, 'iron'); B.l(bw - 2, by + bh, bw - 2, by + bh + 2, 'iron'); B.l(-bw, by + bh + 2, bw, by + bh + 2, 'iron');
  if (s.pilot) { B.d(bw - 3, by - 2, 1.5, 'skin'); B.p(bw - 2, by - 2, 'eye', 1); }
  B.l(bw - 1, by + 2, bw + 4, by + 2, 'iron', 2); if (p.st === 'atk' && p.f === 1) B.d(bw + 6, by + 2, 1.5, 'flame', 4);
  B.focus = [bw + 5, by + 2];
};

// ───────── crawlers ─────────
RIG.spider = function (B, s, p) {
  const S = s.S, f = p.f % 2, st = p.st === 'walk' ? p.step : 0, by = -R(S * 0.32) + (p.bob || 0), atk = p.st === 'atk';
  for (let i = 0; i < 4; i++) { const x = -4 + i * 3, o = (i % 2 ? st : -st); B.l(x, by, x - 3 + o, by - 4, 'fur2', 1, 2); B.l(x - 3 + o, by - 4, x - 5 + o, -1, 'fur2', 1, 2); }
  B.e(-R(S * 0.22), by - 1, R(S * 0.3), R(S * 0.25), 'fur'); if (s.mark) { B.p(-R(S * 0.22), by - 2, 'glow', 5); B.p(-R(S * 0.22), by, 'glow', 4); }
  B.e(R(S * 0.14), by + 1, R(S * 0.16), R(S * 0.14), 'fur');
  for (let i = 0; i < 4; i++) { const x = -2 + i * 3, o = (i % 2 ? -st : st); B.l(x, by + 1, x + 3 + o, by - 3, 'fur', 1); B.l(x + 3 + o, by - 3, x + 5 + o, -1, 'fur', 1); }
  const ex = R(S * 0.22); B.p(ex, by, 'eye', 5); B.p(ex - 2, by, 'eye', 5); B.p(ex - 1, by - 1, 'eye', 4); if (atk && p.f === 1) { B.p(ex + 2, by + 2, 'bone', 5); B.p(ex + 2, by + 3, 'bone', 5); }
  if (s.crown) { B.r(-R(S * 0.3), by - R(S * 0.25) - 2, 6, 2, 'gold'); }
  B.focus = [ex + 2, by + 2];
};
RIG.crab = function (B, s, p) {
  const S = s.S, st = p.st === 'walk' ? p.step : 0, by = -R(S * 0.35) + (p.bob || 0), atk = p.st === 'atk', W = R(S * 0.4);
  for (let i = 0; i < 3; i++) { const x = -W + 3 + i * 3; B.l(x, by + 2, x - 2 + (i % 2 ? st : -st), -1, 'fur2', 1); B.l(x + 1, by + 2, x + 3 + (i % 2 ? -st : st), -1, 'fur', 1); }
  B.e(0, by, W, R(S * 0.24), 'shell'); B.l(-W + 2, by - 2, W - 2, by - 2, 'shell', 1, 4);
  const cl = atk && p.f === 1 ? 3 : 0, cy = by - 3 - (p.st === 'charge' ? 3 : 0); B.l(W - 2, by, W + 2 + cl, cy, 'shell', 2); B.d(W + 3 + cl, cy - 1, s.bigClaw ? 3 : 2, 'shell'); B.p(W + 5 + cl, cy - 1, 'ink', 1);
  B.l(-W + 2, by, -W - 1, cy + 1, 'shell', 2); B.d(-W - 2, cy, 1.5, 'shell');
  B.l(2, by - R(S * 0.24), 2, by - R(S * 0.24) - 3, 'shell'); B.l(5, by - R(S * 0.24), 6, by - R(S * 0.24) - 3, 'shell'); B.p(2, by - R(S * 0.24) - 4, 'eye', 5); B.p(6, by - R(S * 0.24) - 4, 'eye', 5);
  if (s.hat) { B.r(0, by - R(S * 0.24) - 7, 7, 2, 'hat'); B.g([[1, by - R(S * 0.24) - 7], [6, by - R(S * 0.24) - 7], [3, by - R(S * 0.24) - 12]], 'hat'); B.p(3, by - R(S * 0.24) - 9, 'gem', 5); }
  B.focus = [W + 4 + cl, cy - 1];
};
RIG.worm = function (B, s, p) {
  const S = s.S, n = s.seg || 6, f = p.f, atk = p.st === 'atk', rise = p.st === 'charge' ? 4 : atk && p.f === 1 ? 2 : 0, r = Math.max(2, R(S * 0.14));
  for (let i = 0; i < n; i++) { const x = -n * r + i * r * 1.6 + (atk ? i * 0.3 : 0), y = -r - 1 - Math.max(0, Math.sin((i + f) * 1.2) * 1.5) - (i === n - 1 ? rise : i === n - 2 ? rise / 2 : 0); B.d(x, y, r + (i === n - 1 ? 1 : 0), i % 2 ? 'fur2' : 'fur'); }
  const hx = -n * r + (n - 1) * r * 1.6 + (atk ? (n - 1) * 0.3 : 0), hy = -r - 1 - rise;
  B.p(hx + 1, hy - 1, 'eye', 5); if (s.sickle) { B.l(hx, hy - r, hx + 2, hy - r - 4, 'claw', 1, 4); B.l(hx + 2, hy - r - 4, hx + 5, hy - r - 3, 'claw', 1, 4); }
  if (s.crown) { B.r(hx - 2, hy - r - 3, 5, 2, 'gold'); B.p(hx - 2, hy - r - 4, 'gold', 4); B.p(hx + 2, hy - r - 4, 'gold', 4); }
  if (atk && p.f === 1) { B.p(hx + r + 1, hy, 'bone', 5); B.p(hx + r + 1, hy + 1, 'bone', 5); }
  B.focus = [hx + r + 1, hy];
};
RIG.snail = function (B, s, p) {
  const S = s.S, by = -2, f = p.f % 2, W = R(S * 0.5);
  B.g([[-W, by], [W, by], [W + 2, by - 3], [W - 2, by - 2], [-W + 2, by - 3]], 'fur');
  B.l(W - 1, by - 2, W + 1, by - R(S * 0.3), 'fur', 2); B.l(W + 1, by - R(S * 0.3), W + 2 + f, by - R(S * 0.45), 'fur'); B.l(W, by - R(S * 0.3), W - 1, by - R(S * 0.42), 'fur'); B.p(W + 2 + f, by - R(S * 0.45) - 1, 'eye', 5);
  const sr = R(S * 0.34); B.d(-2, by - sr - 1, sr, 'shell'); B.d(-1, by - sr - 1, R(sr * 0.6), 'shell', 4); B.d(-1, by - sr - 1, R(sr * 0.3), 'shell', 2);
  if (s.spikes) for (let i = 0; i < 5; i++) { const a = -2.6 + i * 0.5; B.p(-2 + Math.cos(a) * (sr + 1), by - sr - 1 + Math.sin(a) * (sr + 1), 'claw', 4); }
  B.focus = [W + 2, by - R(S * 0.3)];
};
RIG.turtle = function (B, s, p) {
  const S = s.S, st = p.st === 'walk' ? p.step : 0, by = -R(S * 0.28) + (p.bob || 0), W = R(S * 0.46), atk = p.st === 'atk';
  B.r(-W + 2 - st, -3, 3, 3, 'fur2'); B.r(W - 5 + st, -3, 3, 3, 'fur2');
  B.e(0, by, W, R(S * 0.26), 'shell'); for (let i = -1; i <= 1; i++) B.d(i * R(W * 0.55), by - 1, 1.6, 'shell', 4);
  B.r(-W + 1 + st, -3, 3, 3, 'fur'); B.r(W - 4 - st, -3, 3, 3, 'fur');
  const hx = W + 1 + (atk && p.f >= 1 ? 2 : 0), hy = by - 1 - (p.st === 'charge' ? 2 : 0); B.l(W - 2, by + 1, hx, hy, 'fur', 3); B.d(hx + 1, hy - 1, 2.2, 'fur'); B.p(hx + 2, hy - 2, 'eye', 1);
  if (s.dragon) { B.l(hx, hy - 3, hx - 2, hy - 6, 'horn', 1, 4); for (let i = 0; i < 4; i++) B.p(-W + 3 + i * 4, by - R(S * 0.26) - 1, 'horn', 4); }
  B.focus = [hx + 3, hy];
};
RIG.mole = function (B, s, p) {
  const S = s.S, by = -R(S * 0.3) + (p.bob || 0), atk = p.st === 'atk';
  B.e(0, by, R(S * 0.38), R(S * 0.3), 'fur'); B.e(2, by + 2, R(S * 0.25), R(S * 0.16), 'belly');
  B.r(R(S * 0.3), by, 3, 2, 'skin'); B.p(R(S * 0.3) + 2, by, 'nose', 4); B.p(R(S * 0.18), by - 2, 'eye', 1);
  const cl = atk && p.f === 1 ? 2 : 0; B.l(R(S * 0.2), by + 3, R(S * 0.35) + cl, by + 6, 'claw', 2); B.l(-R(S * 0.1), -1, R(S * 0.02), -1, 'claw', 2);
  if (s.hat) { B.r(-3, by - R(S * 0.3) - 2, 8, 3, 'hat'); B.r(-4, by - R(S * 0.3), 10, 1, 'hat'); B.p(1, by - R(S * 0.3) - 1, 'gem', 5); }
  if (s.quills) for (let i = 0; i < 7; i++) { const a = -2.8 + i * 0.38; B.l(-2 + Math.cos(a) * R(S * 0.3), by + Math.sin(a) * R(S * 0.24), -2 + Math.cos(a) * (R(S * 0.3) + 4), by + Math.sin(a) * (R(S * 0.24) + 4), 'claw', 1, 4); }
  B.focus = [R(S * 0.3) + 3, by];
};
RIG.lizard = function (B, s, p) {
  const S = s.S, st = p.st === 'walk' ? p.step * 2 : 0, by = -R(S * 0.22) + (p.bob || 0), L = R(S * 0.5), atk = p.st === 'atk';
  B.g([[-L + 2, by - 1], [-L + 2, by + 2], [-L - R(S * 0.5), by + 3 + (p.sway || 0)]], 'fur');
  B.l(-L * 0.5, by + 1, -L * 0.5 - st, -1, 'fur2', 2); B.l(L * 0.4, by + 1, L * 0.4 + st, -1, 'fur2', 2);
  B.e(0, by, L, R(S * 0.14), 'fur'); B.e(1, by + 1, L - 2, 1, 'belly');
  B.l(-L * 0.5 + 1, by + 1, -L * 0.5 + 1 + st, -1, 'fur', 2); B.l(L * 0.4 + 1, by + 1, L * 0.4 + 1 - st, -1, 'fur', 2);
  const hx = L + 1 + (atk && p.f >= 1 ? 2 : 0), hy = by - 2 - (p.st === 'charge' ? 2 : 0); B.r(hx - 2, hy, 6, 3, 'fur'); B.p(hx, hy, 'eye', s.glowEyes ? 5 : 1);
  if (s.gems) for (let i = 0; i < 4; i++) B.p(-L + 3 + i * 3, by - R(S * 0.14) - 1, 'gem', 5);
  if (atk && p.f === 1) B.l(hx + 4, hy + 2, hx + 7, hy + 2, 'blood', 1, 4);
  B.focus = [hx + 4, hy + 1];
};
RIG.snake = function (B, s, p) {
  const S = s.S, f = p.f, rise = p.st === 'charge' ? 3 : 0, atk = p.st === 'atk';
  for (let i = 0; i < 9; i++) { const x = -10 + i * 2, y = -2 - Math.sin((i + f) * 0.9) * 1.5 * (i < 6 ? 1 : 0); B.d(x, y, 1.6, i % 2 ? 'fur2' : 'fur'); }
  const hx = 8 + (atk && p.f === 1 ? 3 : 0), hy = -R(S * 0.4) - rise; B.l(6, -3, hx - 1, hy + 2, 'fur', 3); B.r(hx - 2, hy - 1, 5, 3, 'fur'); B.p(hx, hy - 1, 'eye', 5); if (atk && p.f === 1) B.l(hx + 3, hy + 1, hx + 5, hy + 1, 'blood', 1, 4);
  if (s.hood) B.e(hx - 2, hy + 2, 2, 4, 'fur2');
  B.focus = [hx + 3, hy];
};

// ───────── floating eyes and the kraken ─────────
RIG.eye = function (B, s, p) {
  const S = s.S, f = p.f % 2, by = -R(S * 0.55) - f + (p.bob || 0), r = R(S * 0.3), atk = p.st === 'atk';
  for (let i = 0; i < (s.tentacles || 4); i++) { const x = -r + 2 + i * (2 * r - 4) / Math.max(1, (s.tentacles || 4) - 1); B.l(x, by + r - 1, x + (i % 2 ? 1 : -1) * (1 + f), by + r + 5 + (i % 2), 'fur2', 1); }
  if (s.wings) { B.g([[-r + 1, by], [-r - 6, by - 5 + f * 3], [-r - 3, by + 2]], 'wing'); B.g([[r - 1, by], [r + 6, by - 5 + f * 3], [r + 3, by + 2]], 'wing'); }
  B.d(0, by, r, 'fur'); B.d(1, by, R(r * 0.62), 'sclera', 4);
  const look = atk ? 2 : p.st === 'charge' ? 0 : 1; B.d(1 + look, by, R(r * 0.35), 'iris', p.st === 'charge' || p.st === 'cast' ? 5 : 3); B.p(1 + look, by, 'ink', 1);
  B.l(-R(r * 0.5), by - 1, -R(r * 0.2), by, 'blood', 1, 3); B.l(1, by + R(r * 0.5), 2, by + R(r * 0.25), 'blood', 1, 3);
  if (s.crown) { B.r(-3, by - r - 2, 7, 2, 'gold'); for (let i = -3; i <= 3; i += 2) B.p(i, by - r - 3, 'gold', 4); }
  if (s.spikes) for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.44; B.l(Math.cos(a) * r, by + Math.sin(a) * r, Math.cos(a) * (r + 3), by + Math.sin(a) * (r + 3), 'claw', 1, 4); }
  B.focus = [1 + look + R(r * 0.35), by];
};
RIG.kraken = function (B, s, p) {
  const S = s.S, f = p.f % 2, hy = -R(S * 0.7) + (p.bob || 0), r = R(S * 0.26), atk = p.st === 'atk';
  for (let i = 0; i < 6; i++) { const x0 = -r + 2 + i * 2, sw = (i % 2 ? 1 : -1) * (f + 1), reach = atk && p.f === 1 && i > 3 ? 6 : 0; B.l(x0, hy + r - 2, x0 + sw * 2 + reach, hy + r + 5, 'fur', 2); B.l(x0 + sw * 2 + reach, hy + r + 5, x0 - sw + reach * 1.5, -1, 'fur', 1); }
  B.e(0, hy, r, R(r * 1.25), 'fur'); B.e(-2, hy - R(r * 0.5), R(r * 0.5), R(r * 0.4), 'fur', 4);
  B.p(R(r * 0.4), hy + 1, 'eye', 5); B.p(R(r * 0.4) - 3, hy + 1, 'eye', 5);
  B.focus = [R(r * 0.4) + 6, hy + r];
};

// ───────── machines ─────────
RIG.bot = function (B, s, p) {
  const S = s.S, f = p.f % 2, by = -R(S * 0.5) + (p.bob || 0) - f, r = R(S * 0.26);
  B.d(0, by, r, 'metal'); B.r(-r + 1, by - 1, 2 * r - 1, 2, 'iron'); B.d(R(r * 0.4), by, R(r * 0.35), 'visor', p.st === 'charge' || p.st === 'cast' ? 5 : 4);
  B.l(0, by - r, 0, by - r - 3, 'iron'); B.p(0, by - r - 4, 'gem', 5 - f);
  if (s.wingsB) { B.l(-r, by, -r - 5, by - 3 + f, 'metal', 2); B.l(r, by, r + 5, by - 3 + f, 'metal', 2); }
  B.p(-2, by + r + 1, 'flame', 4); B.p(2, by + r + 1, 'flame', 4); B.p(0, by + r + 2 + f, 'flame', 5);
  B.focus = [R(r * 0.4), by];
};
RIG.mechwalker = function (B, s, p) {
  const S = s.S, st = p.st === 'walk' ? p.step * 2 : 0, by = -R(S * 0.45) + (p.bob || 0), W = R(S * 0.36), atk = p.st === 'atk';
  B.l(-3, by + 3, -4 - st, -2, 'iron', 2); B.r(-6 - st, -2, 5, 2, 'metal');
  B.r(-W, by - R(S * 0.2), 2 * W, R(S * 0.34), 'metal'); B.r(-W + 1, by - R(S * 0.2) + 2, 2 * W - 2, 1, 'trim', 4); B.r(W - 4, by - R(S * 0.1), 3, 2, 'visor', 5);
  B.l(3, by + 3, 3 + st, -2, 'metal', 2); B.r(1 + st, -2, 5, 2, 'metal');
  const rec = atk && p.f === 1 ? -1 : 0, g = s.gun || 'laser'; B.r(W - 2 + rec, by - R(S * 0.14), R(S * 0.45), g === 'cannon' ? 4 : 2, 'iron'); if (atk && p.f === 1) B.d(W + R(S * 0.45), by - R(S * 0.1), 2, 'glow', 4);
  B.focus = [W + R(S * 0.45) + 1, by - R(S * 0.12)];
};
RIG.siege = function (B, s, p) {
  const S = s.S, k = s.kind || 'catapult', f = p.f % 2, atk = p.st === 'atk', W = R(S * 0.55), bh = -R(S * 0.22);
  if (s.legs) { for (let i = 0; i < 3; i++) { const x = -W + 3 + i * W * 0.8, o = p.st === 'walk' ? (i % 2 ? p.step : -p.step) : 0; B.l(x, bh + 2, x - 2 + o, -1, 'wood', 2); } }
  else { B.d(-W + 3, -3, 2.6, 'wood'); B.d(W - 3, -3, 2.6, 'wood'); B.p(-W + 3, -3, 'iron', 1); B.p(W - 3, -3, 'iron', 1); }
  B.r(-W, bh - 2, 2 * W, 4, 'wood'); B.r(-W, bh - 2, 2 * W, 1, 'iron');
  if (k === 'ram') { B.g([[-W + 2, bh - 3], [W - 2, bh - 3], [W - 4, bh - 10], [-W + 4, bh - 10]], 'cloth'); B.r(-W - 1 + (atk && p.f === 1 ? 4 : 0), bh - 7, 2 * W + 3, 3, 'wood'); B.r(W + 1 + (atk && p.f === 1 ? 4 : 0), bh - 8, 3, 5, 'metal'); B.focus = [W + 4, bh - 6]; return; }
  const arm = atk ? [-0.4, 1.3, 0.9][p.f] : p.st === 'charge' ? -0.5 : 0.4, L = R(S * (k === 'trebuchet' ? 0.46 : 0.36));
  B.l(-2, bh - 2, 1, bh - R(S * 0.25), 'wood', 2); const pv = [0, bh - R(S * 0.25)];
  const tip = [pv[0] - Math.cos(arm) * L, pv[1] - Math.sin(arm) * L]; B.l(pv[0], pv[1], tip[0], tip[1], 'wood', 2); B.l(pv[0], pv[1], pv[0] + Math.cos(arm) * 4, pv[1] + Math.sin(arm) * 4, 'wood', 2);
  if (!(atk && p.f >= 1)) B.d(tip[0], tip[1] - 1, 2, 'stone');
  if (k === 'trebuchet') B.r(pv[0] + Math.cos(arm) * 4 - 2, pv[1] + Math.sin(arm) * 4, 4, 4, 'iron');
  B.focus = [tip[0], tip[1] - 1];
};
RIG.tower = function (B, s, p) {
  const S = s.S, f = p.f % 2, W = R(S * 0.28), top = -S + 4, k = s.kind || 'crystal', lit = p.st === 'charge' || p.st === 'cast' || p.st === 'atk';
  B.g([[-W - 3, -1], [W + 3, -1], [W + 1, -4], [-W - 1, -4]], 'stone');
  B.r(-W, top + 4, 2 * W, -top - 7, 'stone'); for (let y = top + 7; y < -5; y += 4) B.l(-W, y, W - 1, y, 'stone', 1, 2);
  B.r(-2, top + R(S * 0.35), 4, 5, 'ink', 1); B.p(0, top + R(S * 0.35) + 1, 'glow', lit ? 5 : 3);
  B.r(-W - 1, top + 2, 2 * W + 2, 3, 'trim'); for (let x = -W - 1; x <= W; x += 3) B.r(x, top, 2, 2, 'trim');
  if (s.vines) for (let i = 0; i < 4; i++) B.l(-W + i * 2, -4, -W + i * 2 + (i % 2 ? 2 : -1), top + 8 + i * 3, 'leaf', 1);
  const gy = top - 3 - f;
  if (k === 'crystal') { B.g([[-2, gy + 2], [0, gy - 5], [2, gy + 2], [0, gy + 4]], 'gem', lit ? 5 : 4); }
  else if (k === 'flame') { B.d(0, gy + 1, 2.5, 'flame', 4); B.p(0, gy - 3 - f, 'flame', 5); B.p(-2, gy - 1, 'flame', 3); B.p(2, gy - 2 + f, 'flame', 4); }
  else if (k === 'orb') { B.d(0, gy, 2.5, 'gem', lit ? 5 : 4); B.p(-1, gy - 1, 'gem', 5); }
  else if (k === 'storm') { B.e(0, gy - 1, 5, 2.5, 'cloud'); if (lit || f) B.l(1, gy + 1, -1, gy + 5, 'glow', 1, 5); }
  else if (k === 'portal') { B.e(0, gy, 3, 4, 'gem', 3); B.e(0, gy, 1.5, 2.5, 'void', 1); }
  B.focus = [0, gy];
};
RIG.egg = function (B, s, p) {
  const S = s.S, f = p.f % 2, lit = p.st === 'charge' || p.st === 'cast';
  B.e(0, -R(S * 0.42), R(S * 0.3), R(S * 0.42), 'stone'); B.e(-2, -R(S * 0.6), R(S * 0.1), R(S * 0.14), 'stone', 4);
  const c = lit ? 5 : f ? 4 : 3; B.l(-2, -R(S * 0.7), 1, -R(S * 0.45), 'glow', 1, c); B.l(1, -R(S * 0.45), -1, -R(S * 0.28), 'glow', 1, c); B.l(1, -R(S * 0.45), 4, -R(S * 0.4), 'glow', 1, c);
  B.focus = [0, -R(S * 0.45)];
};
RIG.tree = function (B, s, p) {
  const S = s.S, f = p.f % 2, sw = p.sway || 0;
  B.l(-2, -1, -4, -3, 'bark', 2); B.l(2, -1, 4, -3, 'bark', 2);
  B.r(-2, -R(S * 0.55), 5, R(S * 0.55), 'bark'); B.l(0, -R(S * 0.3), 0, -R(S * 0.1), 'bark', 1, 1);
  B.p(-1, -R(S * 0.4), 'eye', 5); B.p(2, -R(S * 0.4), 'eye', 5);
  const cy = -R(S * 0.72); B.e(sw, cy, R(S * 0.38), R(S * 0.28), 'leaf'); B.e(-3 + sw, cy - 3, R(S * 0.2), R(S * 0.14), 'leaf', 4);
  for (let i = 0; i < 4; i++) B.p(-R(S * 0.25) + i * R(S * 0.16) + sw, cy + (i % 2 ? 1 : -2), 'fruit', 4 + (i + f) % 2);
  B.focus = [sw, cy];
};
RIG.mimic = function (B, s, p) {
  const S = s.S, atk = p.st === 'atk', open = atk ? [2, 6, 4][p.f] : p.st === 'charge' || p.st === 'cast' ? 5 : (p.f % 2), W = R(S * 0.45), H = R(S * 0.36);
  B.l(-W + 2, -2, -W + 1 - (p.step || 0), -1, 'fur', 2); B.l(W - 2, -2, W - 1 + (p.step || 0), -1, 'fur', 2);
  B.r(-W, -H - 1, 2 * W, H, 'wood'); B.r(-W, -H - 1, 2 * W, 1, 'gold'); B.r(-1, -H + 1, 3, 3, 'gold', 4);
  B.g([[-W, -H - 1], [W, -H - 1], [W, -H - 3 - open], [-W, -H - 5 - open]], 'wood'); B.r(-W, -H - 2 - open, 2 * W, 1, 'gold');
  if (open > 1) { B.r(-W + 1, -H - 1 - open + 1, 2 * W - 2, open - 1, 'blood', 1); for (let x = -W + 1; x < W; x += 2) { B.p(x, -H - 1, 'bone', 5); B.p(x + 1, -H - open, 'bone', 5); } B.l(0, -H - 1, 3, -H - 1 + open, 'tongue', 2); }
  B.p(W - 3, -H - 3 - open, 'eye', 5);
  B.focus = [W, -H - 2];
};
RIG.centaur = function (B, s, p) {
  const s2 = Object.assign({}, s, { kind: 'horse', S: R(s.S * 0.78) }); RIG.beast(B, s2, p);
  const S = s.S, by = -R(s2.S * 0.44) - R(s2.S * 0.21) + (p.bob || 0), cx = R(s2.S * 0.55);
  // human torso rising out of the horse's chest: draw a humanoid upper body on a raised origin
  const up = { S: R(S * 0.62), build: 'norm', body: s.body || 'armor', hat: s.hat, weapon: s.weapon, shield: s.shield, head: s.head || 'human', hair: s.hair, beard: s.beard, noLegs: 1, cape: s.cape };
  const ox = B.ox, oy = B.oy; B.ox = ox + cx; B.oy = oy + by + 2; P16.RIGS.hum(B, up, p); B.ox = ox; B.oy = oy;
  if (B.focus) B.focus = [B.focus[0] + cx, B.focus[1] + by + 2];
};
})();

;
