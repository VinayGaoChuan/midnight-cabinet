// ==== mc-px16-hum.js ====
(function () {
// Humanoid rig: legs, torso and clothes, two arms, head with hair / beard / headgear, a held weapon and an off-hand
// shield, plus back pieces (cape, wings, tail, quiver). Everything is placed from a handful of pose numbers.
const M = window.MC, P16 = M.P16, R = Math.round;
const PI = Math.PI;
// arm angle: 0 = hanging down, + = swung forward (towards the facing side), π = straight up
const armPt = (sx, sy, a, L) => [sx + Math.sin(a) * L, sy + Math.cos(a) * L];
// weapon direction: 0 = up, + = tipping forward
const dir = (a) => [Math.sin(a), -Math.cos(a)];

// how each weapon family holds / swings: [arm, weapon] angles per pose
const GRIP = {
  melee:  { idle: [0.5, 0.55], raise: [2.7, -0.25], thrust: [1.45, 1.45], atk: [[2.5, -1.0], [1.3, 1.9], [0.7, 2.5]], hurt: [0.2, 0.3] },
  heavy:  { idle: [0.35, 0.35], raise: [2.8, -0.45], thrust: [1.4, 1.3], atk: [[2.7, -1.3], [1.4, 2.0], [0.8, 2.7]], hurt: [0.2, 0.2] },
  pole:   { idle: [0.25, 0.08], raise: [2.2, 0.35], thrust: [1.5, 1.52], atk: [[1.0, 1.5], [1.55, 1.56], [1.2, 1.45]], hurt: [0.15, 0.0] },
  staff:  { idle: [0.3, 0.05], raise: [2.6, 0.0], thrust: [1.5, 0.85], atk: [[0.9, -0.3], [1.5, 0.9], [0.9, 0.4]], hurt: [0.15, -0.1] },
  bow:    { idle: [0.8, 1.35], raise: [2.0, 0.75], thrust: [1.55, 1.57], atk: [[1.55, 1.57], [1.55, 1.57], [1.2, 1.3]], hurt: [0.4, 0.2] },
  gun:    { idle: [0.9, 1.3], raise: [2.0, 0.6], thrust: [1.55, 1.57], atk: [[1.5, 1.52], [1.35, 1.35], [1.5, 1.52]], hurt: [0.5, 1.0] },
  hand:   { idle: [0.5, 0.2], raise: [2.8, 0.0], thrust: [1.55, 1.57], atk: [[1.2, 0.4], [1.7, 1.2], [1.0, 0.6]], hurt: [0.2, 0.0] },
};
const FAM = { sword: 'melee', katana: 'melee', dagger: 'melee', axe: 'melee', mace: 'melee', sickle: 'melee', claws: 'hand', fist: 'hand', greatsword: 'heavy', hammer: 'heavy', flail: 'heavy', scythe: 'heavy', club: 'heavy', spear: 'pole', lance: 'pole', trident: 'pole', pike: 'pole', staff: 'staff', wand: 'staff', torch: 'staff', bow: 'bow', crossbow: 'gun', gun: 'gun', rifle: 'gun', cannon: 'gun', book: 'hand', orb: 'hand', bag: 'hand', shuriken: 'hand', fan: 'melee', banner: 'pole', none: 'hand' };
P16.FAM = FAM;

function weapon(B, w, hx, hy, a, S, pose, spec) {
  const [dx, dy] = dir(a), px = -dy, py = dx; // along blade / perpendicular
  const at = (t, s) => [hx + dx * t + px * (s || 0), hy + dy * t + py * (s || 0)];
  const glowT = pose.glow === 2 ? 5 : pose.glow === 1 ? 4 : 3;
  const L = (t0, t1, mat, th, tone) => { const a0 = at(t0), a1 = at(t1); B.l(a0[0], a0[1], a1[0], a1[1], mat, th, tone); };
  const tipGem = (t, r) => { const g = at(t); B.d(g[0], g[1], r, 'gem', glowT); B.p(g[0] - 0.5, g[1] - 0.5, 'gem', 5); B.focus = [g[0], g[1]]; };
  const len = (k) => Math.max(3, R(S * k));
  switch (w) {
    case 'sword': L(1, len(0.38), 'metal', 1); L(-1, 0, 'gold', 1); { const c = at(1); B.l(c[0] - px * 1.5, c[1] - py * 1.5, c[0] + px * 1.5, c[1] + py * 1.5, 'gold', 1); } B.focus = at(len(0.38)); break;
    case 'katana': L(1, len(0.44), 'metal', 1); { const t = at(len(0.44), -1); B.p(t[0], t[1], 'metal', 4); } L(-2, 0, 'cloth2', 1); B.focus = at(len(0.44)); break;
    case 'greatsword': L(1, len(0.52), 'metal', 2); { const c = at(1); B.l(c[0] - px * 2.5, c[1] - py * 2.5, c[0] + px * 2.5, c[1] + py * 2.5, 'gold', 1); } L(-2, 0, 'leather', 1); B.focus = at(len(0.52)); break;
    case 'dagger': L(0, len(0.2), 'metal', 1); B.focus = at(len(0.2)); break;
    case 'axe': { const T = len(0.42); L(-2, T, 'wood', 1); const h = at(T - 2); B.g([at(T - 4, 0), at(T - 5, 3.5), at(T, 3.5), at(T - 1, 0)], 'metal'); B.focus = at(T); break; }
    case 'mace': { const T = len(0.36); L(-1, T, 'wood', 1); const h = at(T); B.d(h[0], h[1], 2, 'metal'); B.p(h[0] + dx * 3, h[1] + dy * 3, 'metal'); B.p(h[0] + px * 3, h[1] + py * 3, 'metal'); B.p(h[0] - px * 3, h[1] - py * 3, 'metal'); B.focus = h; break; }
    case 'club': { const T = len(0.4); L(-1, T - 3, 'wood', 1); L(T - 4, T, 'wood', 3); B.focus = at(T); break; }
    case 'hammer': { const T = len(0.46); L(-2, T, 'wood', 1); B.g([at(T - 1, -3), at(T - 1, 3), at(T + 2, 3), at(T + 2, -3)], 'metal'); B.focus = at(T); break; }
    case 'flail': { const T = len(0.22); L(-1, T, 'wood', 1); const c = at(T), sw = pose.atk ? 4 : 1; const b = [c[0] + dx * 2 + px * sw, c[1] + 5]; B.l(c[0], c[1], b[0], b[1], 'iron', 1); B.d(b[0], b[1], 2, 'metal'); B.focus = b; break; }
    case 'scythe': { const T = len(0.7); L(-len(0.2), T, 'wood', 1); const t = at(T); B.g([t, at(T + 1, -1), at(T - 1, -8), at(T - 3, -7), at(T - 1, -2)], 'metal'); B.focus = t; break; }
    case 'sickle': { const T = len(0.18); L(-1, T, 'wood', 1); const t = at(T); B.g([t, at(T + 2, -1), at(T + 3, -4), at(T + 1, -3)], 'metal'); B.focus = t; break; }
    case 'spear': case 'pike': case 'lance': { const T = len(w === 'lance' ? 0.8 : 0.7); L(-len(0.22), T - 2, 'wood', 1); B.g([at(T - 3, -1.5), at(T + 2, 0), at(T - 3, 1.5)], 'metal'); if (w === 'lance') { B.g([at(0, -2), at(3, -2), at(3, 2), at(0, 2)], 'metal'); } B.focus = at(T + 2); break; }
    case 'trident': { const T = len(0.7); L(-len(0.2), T, 'gold', 1); L(T - 2, T + 3, 'gold', 1); const b = at(T - 2); B.l(b[0] - px * 2, b[1] - py * 2, b[0] + px * 2, b[1] + py * 2, 'gold', 1); L(T - 2, T + 2, 'gold', 1); { const l = at(T - 2, -2), l2 = at(T + 1, -2), r = at(T - 2, 2), r2 = at(T + 1, 2); B.l(l[0], l[1], l2[0], l2[1], 'gold'); B.l(r[0], r[1], r2[0], r2[1], 'gold'); } B.focus = at(T + 2); break; }
    case 'banner': { const T = len(0.8); L(-len(0.2), T, 'wood', 1); const t = at(T), sw = pose.sway ? 1 : 0; B.g([[t[0], t[1] + 1], [t[0] + 6, t[1] + 2 + sw], [t[0] + 5, t[1] + 5 + sw], [t[0], t[1] + 6]], 'trim'); B.focus = t; break; }
    case 'staff': { const T = len(0.62); L(-len(0.3), T, 'wood', 1); const t = at(T + 1); B.l(t[0] - px, t[1] - py, t[0] - px + dx * -1, t[1] - py - 1, 'wood'); tipGem(T + 2, 1.4); break; }
    case 'wand': { const T = len(0.24); L(0, T, 'wood', 1); tipGem(T + 1, 0.8); break; }
    case 'torch': { const T = len(0.26); L(-1, T, 'wood', 1); const t = at(T + 1); const f = pose.f % 2; B.d(t[0], t[1] - 1, 1.2, 'flame', 4); B.p(t[0], t[1] - 3 - f, 'flame', 5); B.p(t[0] + (f ? 1 : -1), t[1] - 2, 'flame', 3); B.focus = [t[0], t[1] - 2]; break; }
    case 'bow': { const H = len(0.3), c = at(0), up = [c[0] - dx * 0 + px * -H, c[1] + py * -H], dn = [c[0] + px * H, c[1] + py * H], mid = [c[0] + dx * 3, c[1] + dy * 3];
      B.l(up[0], up[1], mid[0] - px * H * 0.5, mid[1] - py * H * 0.5, 'wood'); B.l(mid[0] - px * H * 0.5, mid[1] - py * H * 0.5, mid[0] + px * H * 0.5, mid[1] + py * H * 0.5, 'wood'); B.l(mid[0] + px * H * 0.5, mid[1] + py * H * 0.5, dn[0], dn[1], 'wood');
      const pull = pose.st === 'atk' && pose.f === 0 || pose.st === 'charge' ? 4 : 0, sp = [c[0] - dx * pull, c[1] - dy * pull];
      B.l(up[0], up[1], sp[0], sp[1], 'string'); B.l(sp[0], sp[1], dn[0], dn[1], 'string');
      if (pull) { B.l(sp[0], sp[1], sp[0] + dx * 9, sp[1] + dy * 9, 'wood'); const tp = [sp[0] + dx * 10, sp[1] + dy * 10]; B.p(tp[0], tp[1], 'metal', 4); B.focus = tp; } else B.focus = mid; break; }
    case 'crossbow': { const T = len(0.3); L(-2, T, 'wood', 2); const f = at(T - 2); B.l(f[0] - px * 4, f[1] - py * 4 + 1, f[0] + px * 4, f[1] + py * 4 + 1, 'metal'); B.focus = at(T + 1); break; }
    case 'gun': case 'rifle': { const T = len(w === 'rifle' ? 0.5 : 0.3); L(-3, 0, 'wood', 2); L(0, T, 'iron', w === 'rifle' ? 1 : 2); if (pose.st === 'atk' && pose.f === 1) { const m = at(T + 2); B.d(m[0], m[1], 1.5, 'flame', 4); B.p(m[0] + dx * 2, m[1] + dy * 2, 'flame', 5); } B.focus = at(T + 1); break; }
    case 'cannon': { const T = len(0.42); L(-4, T, 'iron', 3); const m = at(T); B.d(m[0], m[1], 1.6, 'iron', 1); if (pose.st === 'atk' && pose.f === 1) { B.d(m[0] + dx * 3, m[1] + dy * 3, 2, 'flame', 4); } B.focus = at(T + 2); break; }
    case 'book': { const c = at(2); B.r(c[0] - 2, c[1] - 2, 5, 4, 'cloth2'); B.r(c[0] - 1, c[1] - 2, 3, 1, 'cream', 5); B.focus = [c[0], c[1] - 5 - (pose.glow ? 1 : 0)]; if (pose.glow) { const g = B.focus; B.p(g[0], g[1], 'gem', 5); B.p(g[0] - 1, g[1] + 1, 'gem', 4); B.p(g[0] + 1, g[1] + 1, 'gem', 4); } break; }
    case 'orb': { const c = [hx + 1, hy - 3 - (pose.bob ? 0 : 1)]; B.d(c[0], c[1], 1.6, 'gem', glowT); B.p(c[0] - 1, c[1] - 1, 'gem', 5); B.focus = c; break; }
    case 'bag': { B.d(hx + 1, hy + 2, 2, 'leather'); B.p(hx + 1, hy - 1, 'gold', 4); B.focus = [hx + 1, hy + 2]; break; }
    case 'shuriken': { B.p(hx + 1, hy, 'metal', 4); B.p(hx + 2, hy - 1, 'metal'); B.p(hx, hy - 1, 'metal'); B.p(hx + 2, hy + 1, 'metal'); B.p(hx, hy + 1, 'metal'); B.focus = [hx + 1, hy]; break; }
    case 'fan': { const c = at(2); B.g([c, at(5, -3), at(6, 0), at(5, 3)], 'trim'); B.focus = at(5); break; }
    case 'claws': { for (let k = -1; k <= 1; k++) { const s = at(0, k), e = at(3, k * 1.3); B.l(s[0], s[1], e[0], e[1], 'bone', 1, 4); } B.focus = at(3); break; }
    default: B.focus = [hx, hy];
  }
}
function shield(B, kind, x, y, S) {
  if (kind === 'round') { B.d(x, y, 3.5, 'metal'); B.d(x, y, 1.2, 'trim'); }
  else if (kind === 'buckler') { B.d(x, y, 2.2, 'metal'); B.p(x, y, 'trim', 4); }
  else if (kind === 'kite') { B.g([[x - 3, y - 4], [x + 3, y - 4], [x + 3, y + 1], [x, y + 5], [x - 3, y + 1]], 'metal'); B.l(x, y - 3, x, y + 3, 'trim'); B.l(x - 2, y - 1, x + 2, y - 1, 'trim'); }
  else if (kind === 'tower') { const h = R(S * 0.42); B.r(x - 3, y - h / 2, 7, h, 'metal'); B.r(x - 2, y - h / 2 + 1, 5, 1, 'trim'); B.r(x - 2, y + h / 2 - 2, 5, 1, 'trim'); B.p(x, y, 'trim', 4); }
  else if (kind === 'magic') { B.d(x, y, 3.5, 'gem', 3); B.d(x, y, 2, 'gem', 4); }
}

P16.RIGS.hum = function (B, s, pose) {
  const S = s.S, bd = s.build || 'norm';
  const hh = Math.max(6, Math.min(13, R(S * (s.bighead ? 0.38 : 0.31)))), legH = s.hover || s.noLegs ? 0 : R(S * (bd === 'short' ? 0.22 : 0.28)), tH = S - hh - legH;
  const tw = { slim: R(S * 0.25), norm: R(S * 0.3), heavy: R(S * 0.4), giant: R(S * 0.46), short: R(S * 0.36) }[bd] || R(S * 0.3), hw = hh - (bd === 'slim' ? 1 : 0) + (bd === 'giant' ? 1 : 0);
  const at = pose.st === 'atk', ch = pose.st === 'charge', cs = pose.st === 'cast' || pose.st === 'recover';
  const bob = (pose.bob || 0) + (s.hover ? (pose.f % 2) : 0), lean = pose.lean || 0, lift = s.hover ? 3 : 0;
  const hip = -legH - lift + bob, sh = hip - tH + 1, top = sh - 1 - hh + 1, cx = R(lean * 0.5), hx = cx + (lean > 0 ? 1 : lean < 0 ? -1 : 0);
  const lw = bd === 'heavy' || bd === 'giant' ? 3 : 2, aw = bd === 'heavy' || bd === 'giant' ? 3 : 2;
  const fam = GRIP[FAM[s.weapon || 'none'] || 'hand'];
  let g = fam.idle; if (at) g = fam.atk[pose.f] || fam.atk[1]; else if (ch) g = fam.raise; else if (cs) g = fam.thrust; else if (pose.st === 'hurt' || pose.st === 'dead') g = fam.hurt;
  if (pose.st === 'recover') g = [(fam.thrust[0] + fam.idle[0]) / 2, (fam.thrust[1] + fam.idle[1]) / 2];
  const armF = g[0] + (pose.st === 'walk' ? pose.step * 0.25 : 0), wAng = g[1];
  const armB = s.shield ? (at ? 1.1 : 0.9) : (FAM[s.weapon] === 'bow' && (at && pose.f === 0 || ch) ? 1.3 : (FAM[s.weapon] === 'heavy' || FAM[s.weapon] === 'pole') && s.twoHand !== false ? armF - 0.1 : (at ? -0.5 : 0.15 - (pose.st === 'walk' ? pose.step * 0.3 : 0)));
  const aL = Math.max(4, R(tH * 0.85) + 1), sway = pose.sway || 0;
  const cloth = 'cloth', skin = s.head === 'skull' || s.body === 'ribs' ? 'bone' : 'skin';
  // ── behind the body: wings, cape, tail, quiver, back weapon
  if (s.wings) wings(B, s.wings, cx, sh + 2, S, pose);
  if (s.cape) { const hem = hip + R(legH * 0.8) + 1 - bob; B.g([[cx - tw / 2, sh], [cx + tw / 2 - 2, sh], [cx - tw / 2 - 1 - sway, hem], [cx - tw / 2 - 4 - sway - (pose.st === 'walk' ? 1 : 0), hem - 1]], 'cape'); }
  if (s.tail) tail(B, s.tail, cx - tw / 2, hip - 1, pose);
  if (s.quiver) { B.r(cx - tw / 2 - 1, sh, 2, R(tH * 0.7), 'leather'); B.p(cx - tw / 2 - 1, sh - 1, 'trim', 4); B.p(cx - tw / 2, sh - 2, 'trim', 4); }
  if (s.pack) { B.r(cx - tw / 2 - 2, sh + 1, 3, R(tH * 0.6), 'leather'); B.p(cx - tw / 2 - 1, sh + 2, 'gold', 4); }
  // ── back arm (+ shield)
  const sbx = cx - R(tw / 2) + 1, sby = sh + 1, hb = armPt(sbx, sby, armB, aL);
  B.l(sbx, sby, hb[0], hb[1], s.body === 'ribs' ? 'bone' : s.sleeve || cloth, s.body === 'ribs' ? 1 : aw, 1); B.r(hb[0] - 0.5, hb[1] - 0.5, 2, 2, skin, 2);
  // ── legs
  if (s.noLegs) { /* upper body only (centaur riders) */ }
  else if (!s.hover) {
    const st = pose.st === 'walk' ? pose.step * (S >= 26 ? 1.5 : 1.2) : 0, leg = (x0, off, up) => { const fx = x0 + off, fy = -1 - (up ? 1 : 0); B.l(x0, hip, fx, fy - 1, s.body === 'ribs' ? 'bone' : 'pants', s.body === 'ribs' ? 1 : lw); B.r(fx - 1, fy - 1, lw + 1, 2, 'boot'); };
    const robe = s.body === 'robe' || s.body === 'priest' || s.body === 'dress';
    if (!robe || true) { leg(cx - 1, -st * 2, st > 0); leg(cx + 1, st * 2, st < 0); }
  } else {
    // wisps in place of legs
    const f = pose.f % 2; B.g([[cx - tw / 2, hip], [cx + tw / 2, hip], [cx + 1 + f, hip + 4], [cx - 1, hip + 3], [cx - 2 - f, hip + 5]], 'cloth');
  }
  // ── torso & clothes
  const tx = cx - R(tw / 2), body = s.body || 'tunic';
  if (body === 'robe' || body === 'priest' || body === 'dress') {
    const hem = -2 - lift, flare = body === 'dress' ? 3 : 2, sw = (pose.st === 'walk' ? pose.step : sway) * (body === 'dress' ? 1 : 1);
    B.g([[tx, sh], [tx + tw, sh], [tx + tw + flare + sw, hem], [tx - flare + sw, hem]], cloth);
    B.l(tx + 1, hip - 1, tx - flare + 1 + sw, hem - 1, cloth, 1, 2); // fold
    if (body === 'priest') { B.l(cx + 1, sh, cx + 1 + sw * 0.5, hem, 'trim'); }
    B.r(tx, hip - 1, tw, 1, 'trim', 3);
  } else if (body === 'armor' || body === 'heavyarmor') {
    B.r(tx, sh, tw, tH, 'metal'); B.r(tx, sh + R(tH * 0.45), tw, 1, 'metal', 1); B.r(tx, hip - 1, tw, 1, 'leather'); B.r(tx, hip, tw, 2, 'metal', 2);
    const pr = body === 'heavyarmor' ? 2.6 : 1.8; B.d(tx + 1, sh + 1, pr, 'metal'); B.d(tx + tw - 1, sh + 1, pr, 'metal'); if (s.trimArmor !== false) B.p(cx, sh + 2, 'trim', 4);
  } else if (body === 'bare') {
    B.r(tx, sh, tw, tH, skin); B.l(tx + 1, sh + 3, tx + tw - 2, sh + 3, skin, 1, 2); B.l(cx, sh + 3, cx, hip - 2, skin, 1, 2); B.p(tx + 1, sh + 1, skin, 4); B.r(tx, hip - 1, tw, 2, 'leather'); B.p(cx, hip - 1, 'gold', 4); B.r(tx, hip + 1, tw, 2, 'pants');
  } else if (body === 'ribs') {
    B.l(cx, sh, cx, hip, 'bone'); for (let y = sh + 1; y < hip - 1; y += 2) B.l(cx - R(tw / 2) + 1, y, cx + R(tw / 2) - 1, y, 'bone'); B.r(cx - 2, hip - 1, 5, 2, 'bone');
    if (s.rags) B.g([[tx, sh], [tx + tw, sh], [tx + tw, sh + 3], [tx, sh + 5]], cloth);
  } else if (body === 'coat') {
    B.g([[tx, sh], [tx + tw, sh], [tx + tw + 1, hip + R(legH * 0.6)], [tx - 1 + (sway ? -1 : 0), hip + R(legH * 0.6)]], cloth); B.l(cx + 1, sh + 1, cx + 1, hip + 2, 'trim', 1, 3); B.r(tx, hip - 1, tw, 1, 'leather');
  } else if (body === 'rags') {
    B.r(tx, sh, tw, tH, cloth); B.p(tx, hip, cloth); B.p(tx + 2, hip + 1, cloth); B.p(tx + tw - 1, hip, cloth); B.r(tx, hip - 2, tw, 1, 'leather');
  } else if (body === 'vest') {
    B.r(tx, sh, tw, tH, skin); B.r(tx, sh, 2, tH, cloth); B.r(tx + tw - 2, sh, 2, tH, cloth); B.r(tx, hip - 1, tw, 1, 'leather');
  } else { // tunic
    B.r(tx, sh, tw, tH, cloth); B.r(tx, hip - 1, tw, 1, s.belt || 'leather'); B.r(tx, hip, tw, 2, cloth, 1); if (s.trim) B.l(cx, sh, cx, hip - 2, 'trim');
  }
  if (s.scarf) { B.r(tx, sh, tw, 2, 'trim'); B.l(tx, sh + 1, tx - 2 - sway, sh + 4, 'trim'); }
  // ── head
  const hy = top, hx0 = hx - R(hw / 2), hd = s.head || 'human';
  const headMat = hd === 'skull' ? 'bone' : hd === 'robot' ? 'metal' : hd === 'ghost' ? 'cloth' : hd === 'stone' ? 'skin' : 'skin';
  if (hd === 'bird') { B.r(hx0, hy + 1, hw, hh - 1, 'skin'); B.r(hx0 + 1, hy, hw - 2, 1, 'skin'); B.g([[hx0 + hw, hy + 3], [hx0 + hw + 4, hy + 5], [hx0 + hw, hy + 6]], 'trim'); B.p(hx0 + hw - 2, hy + 3, 'eye', 5); }
  else if (hd === 'frog') { B.r(hx0, hy + 2, hw + 1, hh - 2, 'skin'); B.d(hx0 + 2, hy + 1, 1.3, 'skin'); B.d(hx0 + hw - 1, hy + 1, 1.3, 'skin'); B.p(hx0 + hw - 1, hy + 1, 'eye', 1); B.l(hx0 + 2, hy + hh - 2, hx0 + hw + 1, hy + hh - 2, 'skin', 1, 1); }
  else if (hd === 'lizard' || hd === 'wolf' || hd === 'pig' || hd === 'bear') {
    B.r(hx0, hy + 1, hw, hh - 1, 'skin'); B.r(hx0 + 1, hy, hw - 2, 1, 'skin'); const sn = hd === 'pig' ? 2 : 3; B.r(hx0 + hw, hy + R(hh * 0.45), sn, R(hh * 0.4), 'skin'); if (hd === 'pig') B.p(hx0 + hw + 1, hy + R(hh * 0.55), 'skin', 1);
    if (hd === 'wolf' || hd === 'bear') { B.p(hx0 + 1, hy - 1, 'skin'); B.p(hx0 + (hd === 'wolf' ? 2 : 1), hy - 2 + (hd === 'bear' ? 1 : 0), 'skin'); } B.p(hx0 + hw - 1, hy + R(hh * 0.35), 'eye', s.glowEyes ? 5 : 1);
    if (hd === 'lizard') { B.l(hx0 + 1, hy + 1, hx0 + 1, hy + hh - 2, 'skin', 1, 1); }
  } else if (hd === 'robot') {
    B.r(hx0, hy, hw, hh, 'metal'); B.r(hx0 + 1, hy + R(hh * 0.4), hw - 1, 2, 'visor', 4); B.p(hx0 + R(hw / 2), hy - 1, 'metal'); B.p(hx0 + R(hw / 2), hy - 2, 'gem', 4);
  } else {
    B.r(hx0 + 1, hy, hw - 2, hh, headMat); B.r(hx0, hy + 1, hw, hh - 2, headMat); B.r(hx0 + 1, hy + hh - 1, hw - 2, 1, headMat, 2);
    const ey = hy + R(hh * 0.45), ex = hx0 + hw - 2;
    if (hd === 'skull') { B.r(ex - 1, ey - 1, 2, 2, 'ink', 2); B.p(ex, ey - 1, 'eye', 5); B.p(hx0 + hw - 1, ey + 1, 'ink', 2); B.r(hx0 + 2, hy + hh - 2, hw - 2, 1, 'bone', 4); for (let k = hx0 + 2; k < hx0 + hw; k += 2) B.p(k, hy + hh - 2, 'ink', 2); }
    else {
      B.p(ex, ey, 'eye', s.glowEyes ? 5 : 1); if (hh >= 9) B.p(ex - 1, ey, 'eye', s.glowEyes ? 4 : 1); if (s.fourEyes) { B.p(ex - 2, ey, 'eye', 5); B.p(ex, ey + 2, 'eye', 5); B.p(ex - 2, ey + 2, 'eye', 5); }
      if (hd !== 'ghost') B.p(hx0 + hw, ey + 1, headMat); // nose
      if (hd === 'orc') { B.p(hx0 + hw - 1, hy + hh - 1, 'bone', 5); B.p(hx0 - 1, ey - 1, headMat); }
      if (hd === 'elf') { B.l(hx0, ey, hx0 - 2, ey - 3, headMat); }
      if (hd === 'demon' || s.fangs) { B.p(hx0 + hw - 1, hy + hh - 1, 'bone', 5); }
      if (hd === 'zombie') { B.l(hx0 + 1, hy + 2, hx0 + 3, hy + 2, 'ink', 1, 2); B.p(hx0 + hw - 2, hy + hh - 2, 'ink', 2); }
      if (hd === 'ghost') { B.r(hx0 + 1, ey - 1, hw - 1, 3, 'void', 1); B.p(ex, ey, 'eye', 5); B.p(ex - 2, ey, 'eye', 5); }
    }
  }
  if (body === 'bare' || body === 'vest') B.r(hx0 + 1, hy + hh, hw - 2, 1, skin, 1);
  // hair / beard
  const hair = s.hair || (hd === 'human' || hd === 'elf' || hd === 'zombie' ? 'short' : 'none');
  if (hair === 'short') { B.r(hx0, hy, hw, 2, 'hair'); B.r(hx0, hy, 2, R(hh * 0.6), 'hair'); }
  else if (hair === 'long') { B.r(hx0, hy, hw, 2, 'hair'); B.r(hx0 - 1, hy + 1, 3, hh + 3 - sway, 'hair'); }
  else if (hair === 'wild') { B.r(hx0, hy, hw, 2, 'hair'); for (let k = 0; k < hw; k += 2) B.p(hx0 + k, hy - 1, 'hair'); B.r(hx0 - 1, hy + 1, 2, hh - 2, 'hair'); }
  else if (hair === 'mohawk') { B.r(hx0 + 1, hy - 2, hw - 3, 2, 'hair'); }
  else if (hair === 'pony') { B.r(hx0, hy, hw, 2, 'hair'); B.l(hx0, hy + 2, hx0 - 3, hy + 5 + sway, 'hair', 2); }
  else if (hair === 'bun') { B.r(hx0, hy, hw, 2, 'hair'); B.d(hx0, hy, 1.5, 'hair'); }
  if (s.beard === 'long' || s.beard === 'viking') { const bx = hx0 + hw - 1, by = hy + hh - 2; B.g([[bx - 4, by], [bx + 1, by], [bx - 1 + sway, by + (s.beard === 'viking' ? 6 : 8)], [bx - 3 + sway, by + (s.beard === 'viking' ? 6 : 7)]], 'hair'); }
  else if (s.beard === 'short') { B.r(hx0 + hw - 4, hy + hh - 2, 4, 2, 'hair'); }
  // headgear
  hat(B, s.hat, hx0, hy, hw, hh, pose, s);
  // ── front arm, weapon, shield
  const sfx = cx + R(tw / 2) - 1, sfy = sh + 1, hf = armPt(sfx, sfy, armF, aL);
  const twoH = (FAM[s.weapon] === 'heavy' || FAM[s.weapon] === 'pole') && !s.shield;
  if (s.shield) shield(B, s.shield, hb[0] + 1, hb[1] - 1, S);
  if (FAM[s.weapon] === 'bow' || FAM[s.weapon] === 'gun') { /* weapon in front of the body, drawn after arm */ }
  B.l(sfx, sfy, hf[0], hf[1], s.body === 'ribs' ? 'bone' : s.sleeve || cloth, s.body === 'ribs' ? 1 : aw);
  weapon(B, s.weapon || 'none', hf[0], hf[1], wAng, S, pose, s);
  B.r(hf[0] - 0.5, hf[1] - 0.5, 2, 2, skin, 2);
  if (twoH) { const k = armPt(sfx - 1, sfy + 1, armF, aL - 2); B.r(k[0] - 0.5, k[1] - 0.5, 2, 2, skin, 2); }
  if (s.aura) { const f = pose.f % 2; B.p(cx - tw / 2 - 2, sh - 2 - f, 'gem', 4); B.p(cx + tw / 2 + 2, sh + 2 + f, 'gem', 4); }
  if (s.halo) { const y = hy - 3 - (pose.bob ? 0 : 1); B.l(hx0 + 1, y, hx0 + hw - 2, y, 'gold', 1, 5); }
  if (!B.focus || s.focusHead) B.focus = [hx0 + hw - 1, hy + 1];
};
function hat(B, kind, x, y, w, h, pose, s) {
  if (!kind || kind === 'none') return;
  const sw = pose.sway || 0;
  switch (kind) {
    case 'hood': B.r(x - 1, y - 1, w + 1, 3, 'hood'); B.r(x - 1, y + 1, 3, h, 'hood'); B.p(x + w - 1, y - 1, 'hood'); B.l(x - 1, y + h - 1, x - 3 - sw, y + h + 2, 'hood', 2); break;
    case 'wizard': { B.r(x - 2, y, w + 4, 2, 'hat'); B.g([[x, y + 1], [x + w, y + 1], [x + w * 0.5 + 1, y - h - 1], [x + w * 0.5 - 1, y - h - 1]], 'hat'); B.l(x + w * 0.5, y - h - 1, x + w * 0.5 - 3 - sw, y - h + 1, 'hat', 2); B.r(x + 1, y - 1, w - 1, 1, 'trim', 4); break; }
    case 'witch': { B.r(x - 3, y + 1, w + 6, 1, 'hat'); B.g([[x, y + 1], [x + w, y + 1], [x + w * 0.4, y - h]], 'hat'); B.l(x + w * 0.4, y - h, x - 2 - sw, y - h + 3, 'hat'); B.r(x + 1, y, w - 1, 1, 'trim', 4); break; }
    case 'helm': B.r(x - 1, y - 1, w + 2, R(h * 0.55) + 1, 'metal'); B.r(x + w - 3, y + R(h * 0.42), 3, 1, 'ink', 1); B.r(x - 1, y + R(h * 0.3), 2, R(h * 0.5), 'metal'); break;
    case 'greathelm': B.r(x - 1, y - 1, w + 2, h + 1, 'metal'); B.r(x + 2, y + R(h * 0.42), w - 2, 1, 'ink', 1); B.p(x + w - 2, y + R(h * 0.42), 'eye', 5); B.l(x + R(w / 2), y - 1, x + R(w / 2), y + h - 1, 'metal', 1, 4); break;
    case 'helmH': case 'viking': B.r(x - 1, y - 1, w + 2, R(h * 0.5), 'metal'); B.l(x, y, x - 2, y - 3, 'bone', 1, 4); B.l(x + w - 1, y, x + w + 1, y - 3, 'bone', 1, 4); B.p(x - 2, y - 4, 'bone', 4); B.p(x + w + 1, y - 4, 'bone', 4); break;
    case 'helmP': B.r(x - 1, y - 1, w + 2, R(h * 0.5), 'metal'); B.l(x + 1, y - 2, x - 3 - sw, y - 2, 'plume', 2); break;
    case 'crown': B.r(x, y - 2, w, 2, 'gold'); for (let k = 0; k < w; k += 2) B.p(x + k, y - 3, 'gold', 4); B.p(x + R(w / 2), y - 2, 'gem', 5); break;
    case 'straw': B.g([[x - 3, y + 1], [x + w + 3, y + 1], [x + w * 0.5, y - 3]], 'hat'); B.l(x - 3, y + 1, x + w + 3, y + 1, 'hat', 1, 1); break;
    case 'cap': B.r(x, y - 1, w, 2, 'hat'); B.r(x + w - 1, y + 1, 3, 1, 'hat'); break;
    case 'bandana': B.r(x, y, w, 2, 'trim'); B.l(x - 1, y + 1, x - 3 - sw, y + 3, 'trim'); break;
    case 'turban': B.r(x - 1, y - 2, w + 2, 3, 'hat'); B.p(x + w - 2, y - 1, 'gem', 5); break;
    case 'miter': B.g([[x, y + 1], [x + w, y + 1], [x + w - 1, y - 5], [x + w * 0.5, y - 7], [x + 1, y - 5]], 'hat'); B.l(x + R(w / 2), y - 5, x + R(w / 2), y, 'trim', 1, 4); break;
    case 'tophat': B.r(x - 2, y, w + 4, 1, 'hat'); B.r(x, y - 5, w, 5, 'hat'); B.r(x, y - 2, w, 1, 'trim'); break;
    case 'hornsD': B.l(x + 1, y + 1, x - 1, y - 3, 'horn', 2); B.l(x + w - 2, y, x + w, y - 4, 'horn', 2); B.p(x - 1, y - 4, 'horn', 4); B.p(x + w + 1, y - 5, 'horn', 4); break;
    case 'antlers': B.l(x + 1, y, x - 2, y - 4, 'horn'); B.l(x - 1, y - 2, x - 3, y - 3, 'horn'); B.l(x + w - 2, y, x + w + 1, y - 4, 'horn'); B.l(x + w, y - 2, x + w + 2, y - 3, 'horn'); break;
    case 'halo': break;
    case 'goggles': B.r(x, y + R(h * 0.35), w, 2, 'leather'); B.p(x + w - 2, y + R(h * 0.35), 'gem', 5); B.p(x + w - 4, y + R(h * 0.35), 'gem', 4); break;
    case 'feather': B.r(x - 1, y - 1, w + 2, 2, 'hat'); B.l(x + 1, y - 1, x - 2 - sw, y - 5, 'plume', 1, 4); break;
    case 'veil': B.r(x - 1, y - 1, w + 2, 2, 'hat'); B.r(x - 1, y + 1, 2, h + 2, 'hat'); B.r(x + w - 2, y + R(h * 0.55), 3, R(h * 0.5), 'hat'); break;
    case 'skullcap': B.r(x - 1, y - 1, w + 1, 3, 'bone'); B.p(x + w - 2, y, 'ink', 2); break;
    case 'mask': B.r(x + R(w / 2), y + R(h * 0.5), R(w / 2) + 1, R(h * 0.5), 'mask'); break;
    case 'plume': B.l(x + 1, y, x - 2 - sw, y - 4, 'plume', 2); break;
    case 'flame': { const f = pose.f % 2; B.p(x + 1, y - 1, 'flame', 4); B.p(x + 3, y - 2 - f, 'flame', 5); B.p(x + w - 2, y - 1 - (1 - f), 'flame', 4); B.p(x + 2, y - 3, 'flame', 3); break; }
  }
}
function wings(B, kind, x, y, S, pose) {
  const up = pose.st === 'charge' || pose.st === 'cast' || (pose.f % 2 === 1 && pose.st !== 'atk') ? 1 : 0, L = R(S * 0.45);
  if (kind === 'angel') { B.g([[x, y], [x - L, y - 4 - up * 3], [x - L - 1, y + 2 - up * 2], [x - 3, y + L * 0.7]], 'wing'); B.l(x - 2, y + 1, x - L + 1, y - 2 - up * 3, 'wing', 1, 4); }
  else if (kind === 'demon' || kind === 'bat') { B.g([[x, y], [x - L, y - 5 - up * 3], [x - L + 2, y], [x - L + 4, y + 2], [x - 3, y + 3]], 'wing'); B.l(x, y, x - L, y - 5 - up * 3, 'wing', 1, 1); }
  else if (kind === 'fairy') { B.e(x - 3, y - 3 - up, 3, 2, 'wing', 4); }
}
function tail(B, kind, x, y, pose) {
  const sw = pose.sway || 0;
  if (kind === 'demon') { B.l(x, y, x - 4, y + 2 + sw, 'skin'); B.g([[x - 4, y + 1 + sw], [x - 7, y + 2 + sw], [x - 5, y + 4 + sw]], 'skin'); }
  else if (kind === 'lizard') { B.l(x, y, x - 6, y + 3 + sw, 'skin', 2); }
  else if (kind === 'fox') { B.l(x, y, x - 5, y - 1 + sw, 'hair', 3); B.p(x - 6, y - 1 + sw, 'cream'); }
}
P16.hat = hat; P16.wings = wings; P16.tail = tail; P16.weapon = weapon; P16.shield = shield;
})();

;
