// ==== mc-titan.js ====
(function () {
// The final bosses' looks (user ruling 2026-09-26): twenty giants, each rising waist-deep out of its own arena, drawn by
// the 16-bit sprite engine (mc-px16.js: material buffer → two-tone shading → selective outline → rim light) at five
// times a unit's size. One rig — torso, head, two arms solved to where the fists must land, what grows on the back,
// what the near hand holds — dressed per boss: the demon's horns and bat wings, the druid's antlers and staff, the old
// tree's face in its bark, the queen's crescent crown … The moves are the same three for all (mc-bossfight.js); what
// they are called, what rains in the second phase and the arena they stand in are the boss's own.
// Rig space: art pixels, x forward (the boss faces right here and is mirrored on the field), y up is negative, the
// arena's surface at y = 0. Everything below the surface is hidden by the arena drawn over it.
const M = window.MC, P16 = M.P16; if (!P16) return;
const { Buf, bake } = P16, ART = P16.ART, RR = Math.round;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const PL = (M.PJ && M.PJ.PAL) || {};

// ───────── who looks like what ─────────
// mat: material slot → palette ramp (mc-px16.js RAMP). names: the three blows and the roar, in the boss's own words.
const L_ = (o) => o;
const LOOK = {
  FB_bell: L_({ body: 'robe', head: 'bell', back: 'bell', weapon: 'clapper', arena: 'ruins', rain: 'bell', mat: { skin: 'pale', skin2: 'bone', cloth: 'navy', cloth2: 'void', trim: 'brass', metal: 'brass', eye: 'holy', hair: 'shadow', band: 'cream' }, names: { slam: '钟锤', sweep: '拖钟', rain: '落钟', roar: '午夜钟声' } }),
  FB_grave: L_({ body: 'coat', head: 'hood', back: 'tombs', weapon: 'shovel', arena: 'grave', rain: 'hand', mat: { skin: 'zombie', skin2: 'bone', cloth: 'moss', cloth2: 'leather', trim: 'iron', metal: 'iron', eye: 'toxic', hair: 'shadow', wood: 'wood' }, names: { slam: '铲地', sweep: '横铲', rain: '坟中手', roar: '掘墓' } }),
  FB_druid: L_({ body: 'robe', head: 'antler', back: 'branches', weapon: 'staff', arena: 'thicket', rain: 'thorn', mat: { skin: 'moss', skin2: 'wood', cloth: 'green', cloth2: 'moss', trim: 'bone', metal: 'wood', eye: 'toxic', hair: 'moss', wood: 'wood', leaf: 'green', glow: 'toxic' }, names: { slam: '根须震地', sweep: '藤鞭', rain: '荆棘穿地', roar: '森林之怒' } }),
  FB_tree: L_({ body: 'bark', head: 'treeface', back: 'crown', arm: 'branch', arena: 'roots', rain: 'fruit', mat: { skin: 'wood', skin2: 'moss', cloth: 'wood', trim: 'moss', eye: 'holy', wood: 'wood', leaf: 'green', leaf2: 'moss' }, names: { slam: '古根砸地', sweep: '枝条横扫', rain: '知识之果', roar: '古树苏醒' } }),
  FB_queen: L_({ body: 'gown', head: 'crown', back: 'fairy', weapon: 'scepter', arm: 'hand', arena: 'moonpool', rain: 'star', mat: { skin: 'snow', skin2: 'pale', cloth: 'blue', cloth2: 'navy', trim: 'gold', metal: 'gold', eye: 'frost', hair: 'cream', wing: 'frost', glow: 'arcane' }, names: { slam: '月落', sweep: '月牙斩', rain: '星雨', roar: '三百年' } }),
  FB_doll: L_({ body: 'dress', head: 'doll', back: 'carousel', arm: 'hand', arena: 'carousel', rain: 'horse', mat: { skin: 'cream', skin2: 'pink', cloth: 'pink', cloth2: 'crimson', trim: 'gold', metal: 'gold', eye: 'blue', hair: 'gold', wood: 'crimson' }, names: { slam: '跺脚', sweep: '转圈', rain: '木马坠落', roar: '别走' } }),
  FB_clown: L_({ body: 'suit', head: 'clown', back: 'tent', weapon: 'mallet', arena: 'stage', rain: 'pin', mat: { skin: 'snow', skin2: 'red', cloth: 'purple', cloth2: 'orange', trim: 'gold', metal: 'wood', eye: 'blood', hair: 'red', band: 'cream' }, names: { slam: '大锤', sweep: '抡锤', rain: '飞瓶', roar: '哈哈哈' } }),
  FB_captain: L_({ body: 'coat', head: 'tricorn', back: 'mast', weapon: 'anchor', arena: 'sea', rain: 'cannon', mat: { skin: 'pale', skin2: 'teal', cloth: 'navy', cloth2: 'sea', trim: 'gold', metal: 'iron', eye: 'teal', hair: 'moss', wood: 'wood', band: 'cream' }, names: { slam: '沉锚', sweep: '甩锚', rain: '炮击', roar: '全速前进' } }),
  FB_maw: L_({ body: 'maw', head: 'none', back: 'tentacles', arm: 'tentacle', arena: 'deep', rain: 'spout', mat: { skin: 'sea', skin2: 'teal', cloth: 'navy', trim: 'bone', eye: 'holy', teeth: 'bone', glow: 'holy' }, names: { slam: '触手砸落', sweep: '触手横扫', rain: '水柱', roar: '深海之声' } }),
  FB_foreman: L_({ body: 'brute', head: 'welder', back: 'chimney', weapon: 'hammer', arena: 'molten', rain: 'drop', mat: { skin: 'orc', skin2: 'leather', cloth: 'leather', trim: 'iron', metal: 'iron', eye: 'fire', hair: 'shadow', band: 'orange' }, names: { slam: '打铁', sweep: '抡锤', rain: '铁水', roar: '加班' } }),
  FB_colossus: L_({ body: 'armor', head: 'visor', back: 'chimney', arm: 'piston', arena: 'gears', rain: 'beam', mat: { skin: 'brass', skin2: 'iron', cloth: 'iron', trim: 'copper', metal: 'brass', eye: 'fire', glow: 'fire' }, names: { slam: '活塞重拳', sweep: '齿轮臂', rain: '钢梁坠落', roar: '超压' } }),
  FB_nurse: L_({ body: 'uniform', head: 'nurse', back: 'drip', weapon: 'syringe', arm: 'hand', arena: 'blood', rain: 'needle', mat: { skin: 'pale', skin2: 'snow', cloth: 'snow', cloth2: 'pale', trim: 'red', metal: 'steel', eye: 'blood', hair: 'shadow', band: 'snow' }, names: { slam: '扎针', sweep: '推床', rain: '针雨', roar: '查房时间' } }),
  FB_surgeon: L_({ body: 'gown2', head: 'surgeon', back: 'arms', weapon: 'scalpel', arm: 'hand', arena: 'blood', rain: 'scalpel', mat: { skin: 'bone', skin2: 'teal', cloth: 'teal', cloth2: 'sea', trim: 'blood', metal: 'steel', eye: 'blood', band: 'snow' }, names: { slam: '开刀', sweep: '横切', rain: '手术刀', roar: '缝合' } }),
  FB_mech: L_({ body: 'armor', head: 'mono', back: 'cannons', arm: 'claw', arena: 'reactor', rain: 'laser', mat: { skin: 'steel', skin2: 'navy', cloth: 'navy', trim: 'teal', metal: 'steel', eye: 'blood', glow: 'teal' }, names: { slam: '重锤协议', sweep: '扫描切割', rain: '轨道打击', roar: '最后一分钟' } }),
  FB_xeno: L_({ body: 'chitin', head: 'xeno', back: 'eggs', arm: 'claw', arena: 'hive', rain: 'acid', mat: { skin: 'void', skin2: 'purple', cloth: 'purple', trim: 'toxic', eye: 'toxic', horn: 'purple', teeth: 'bone', glow: 'toxic' }, names: { slam: '刺穿', sweep: '尾扫', rain: '酸雨', roar: '孵化' } }),
  FB_jailer: L_({ body: 'brute', head: 'ironmask', back: 'chains', weapon: 'flail', arena: 'lava', rain: 'chain', mat: { skin: 'red', skin2: 'skinD', cloth: 'leather', trim: 'iron', metal: 'iron', eye: 'fire', horn: 'bone' }, names: { slam: '镣铐砸地', sweep: '甩链', rain: '锁链坠落', roar: '门开了' } }),
  FB_ferry: L_({ body: 'robe', head: 'skullhood', back: 'oar', weapon: 'lantern', arena: 'bloodriver', rain: 'skull', mat: { skin: 'bone', skin2: 'bone', cloth: 'shadow', cloth2: 'void', trim: 'crimson', metal: 'brass', eye: 'fire', wood: 'wood', glow: 'fire' }, names: { slam: '船桨', sweep: '划桨', rain: '骷髅灯', roar: '收船费' } }),
  FB_demon: L_({ body: 'brute', head: 'horned', back: 'batwings', arm: 'claw', arena: 'lava', rain: 'meteor', mat: { skin: 'crimson', skin2: 'red', cloth: 'shadow', trim: 'gold', eye: 'fire', horn: 'bone', wing: 'blood', glow: 'fire' }, names: { slam: '震击', sweep: '扫臂', rain: '陨石', roar: '深渊之怒' } }),
  FB_croupier: L_({ body: 'suit', head: 'visorcap', back: 'cards', weapon: 'cards', arm: 'hand', arena: 'felt', rain: 'card', mat: { skin: 'skin', skin2: 'snow', cloth: 'shadow', cloth2: 'crimson', trim: 'gold', metal: 'gold', eye: 'holy', hair: 'shadow', band: 'green' }, names: { slam: '拍桌', sweep: '洗牌', rain: '发牌', roar: '全押' } }),
  FB_dealer: L_({ body: 'suit', head: 'tophat', back: 'chips', weapon: 'cane', arm: 'hand', arena: 'gold', rain: 'coin', mat: { skin: 'snow', skin2: 'red', cloth: 'crimson', cloth2: 'shadow', trim: 'gold', metal: 'gold', eye: 'holy', hair: 'shadow', band: 'shadow', cream: 'cream' }, names: { slam: '庄家通吃', sweep: '收筹码', rain: '金币雨', roar: '最后一局' } }),
};
const ARENA_OF = {}; Object.keys(LOOK).forEach(k => { ARENA_OF[k] = LOOK[k].arena; });
M.TITAN = { LOOK, spec: (k) => LOOK[k] || LOOK.FB_demon };

// ───────── pose ─────────
// fists: where each hand ends up (rig space); lean: the upper body leans forward; jaw: mouth open; glow: eyes / rim
const POSES = {
  idle: [{ fl: [-40, -26], fr: [44, -14], lean: 0, bob: 0, wa: -1.3 }, { fl: [-40, -25], fr: [44, -13], lean: 0, bob: 1, wa: -1.3 }],
  windSlam: [{ fl: [-12, -126], fr: [16, -130], lean: -6, glow: 1, jaw: 0.4, wa: -1.9 }, { fl: [-12, -128], fr: [16, -132], lean: -7, glow: 2, jaw: 0.6, wa: -1.95 }],
  slam: [{ fl: [52, -10], fr: [94, 2], lean: 24, jaw: 1, glow: 2, wa: 0.35 }, { fl: [50, -8], fr: [92, 4], lean: 21, jaw: 0.6, glow: 1, wa: 0.3 }],
  windSweep: [{ fl: [34, -46], fr: [-66, -78], lean: -8, twist: -1, glow: 1, wa: -2.7 }, { fl: [34, -46], fr: [-70, -80], lean: -9, twist: -1, glow: 2, jaw: 0.3, wa: -2.8 }],
  sweep: [{ fl: [-30, -40], fr: [118, -70], lean: 14, jaw: 0.8, glow: 2, wa: -0.45 }, { fl: [-34, -40], fr: [122, -18], lean: 16, jaw: 1, glow: 1, wa: 0.1 }, { fl: [-36, -38], fr: [92, 26], lean: 12, jaw: 0.5, wa: 0.7 }],
  windRain: [{ fl: [-74, -112], fr: [80, -118], lean: -10, glow: 2, jaw: 1, up: 1, wa: -1.45 }, { fl: [-76, -116], fr: [82, -120], lean: -11, glow: 2, jaw: 1, up: 1, wa: -1.5 }],
  roar: [{ fl: [-86, -58], fr: [90, -62], lean: -10, jaw: 1, glow: 2, up: 1, wa: -1.1 }, { fl: [-88, -54], fr: [92, -58], lean: -12, jaw: 1, glow: 2, up: 1, wa: -1.15 }],
  hurt: [{ fl: [-42, -30], fr: [40, -34], lean: -6, jaw: 0.5, wa: -1.25 }],
};
M.TITAN.POSES = POSES;

// ───────── the rig ─────────
function ik(s, t, l1, l2, out) {
  let dx = t[0] - s[0], dy = t[1] - s[1], d = Math.hypot(dx, dy) || 1; const mx = l1 + l2 - 0.5;
  if (d > mx) { t = [s[0] + dx / d * mx, s[1] + dy / d * mx]; dx = t[0] - s[0]; dy = t[1] - s[1]; d = mx; }
  const a = Math.atan2(dy, dx), b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const e1 = [s[0] + Math.cos(a + b) * l1, s[1] + Math.sin(a + b) * l1], e2 = [s[0] + Math.cos(a - b) * l1, s[1] + Math.sin(a - b) * l1];
  // raised hands: the elbow goes out, away from the body; otherwise it hangs low
  const raised = t[1] < s[1] - 18, e = raised ? (Math.abs(e1[0]) * out > Math.abs(e2[0]) * out ? e1 : e2) : (e1[1] > e2[1] ? e1 : e2);
  return { e, h: t };
}
// thick tapered limb segment
function seg(B, a, b, w0, w1, mat, tone) { const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5)); for (let i = 0; i <= n; i++) { const q = i / n, w = w0 + (w1 - w0) * q; B.e(a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, w / 2, w / 2, mat, tone); } }
const EYE = (B, x, y, w, glow) => { B.r(x - 1, y, w + 2, 2, 'mouth'); B.r(x, y, w, 1, 'eye', glow >= 2 ? 5 : 4); if (glow >= 1) B.p(x + w - 1, y + 1, 'eye', 5); };

function body(B, L, p, sx) {
  const k = L.body, top = -62 + p.bob;
  const X = (y) => sx(y);   // lean offset at height y
  const poly = (pts, mat, tone) => B.g(pts.map(([x, y]) => [X(y) + x, y]), mat, tone);
  if (k === 'bark') {
    poly([[-30, 26], [-28, 0], [-24, -40], [-26, -70], [26, -70], [24, -40], [30, 0], [32, 26]], 'skin');
    for (let i = -24; i <= 24; i += 6) B.l(X(-10) + i, 20, X(-60) + i + ((i / 6) % 2 ? 1 : -1), -66, 'skin', 1, 2);   // grooves
    [[-10, -30, 5, 4], [12, -14, 4, 5]].forEach(([x, y, a, b]) => { B.e(X(y) + x, y, a, b, 'skin', 2); B.e(X(y) + x, y, a - 2, b - 2, 'mouth'); });   // knots
    for (let i = 0; i < 26; i++) B.p(X(-20) - 26 + (i * 7) % 52, -8 - (i * 11) % 50, 'skin2', 4);   // moss
    for (let i = -34; i < 36; i += 5) B.l(X(20) + i, 10, X(20) + i * 1.6, 26, 'skin', 3, 2);          // roots
    return;
  }
  if (k === 'maw') {
    B.e(X(-40), -40, 58, 52, 'skin'); B.e(X(-40) - 4, -56, 44, 26, 'skin', 4); B.e(X(-40) + 6, -18, 46, 22, 'skin2', 2);
    return;
  }
  // torso silhouette: waist → chest → shoulders
  const wide = k === 'brute' || k === 'armor' || k === 'chitin' ? 1.12 : k === 'gown' || k === 'dress' ? 0.92 : 1;
  const W0 = 22 * wide, W1 = 36 * wide, W2 = 40 * wide;
  const mat = k === 'brute' ? 'skin' : 'cloth';
  poly([[-W0, 24], [-W0, 0], [-W1, -46], [-W2, top + 6], [-12, top - 2], [12, top - 2], [W2, top + 6], [W1, -46], [W0, 0], [W0, 24]], mat);
  if (k === 'brute') {
    // pecs, abs, deltoids — forced tones make the muscle read at this size
    [-1, 1].forEach(s => { B.e(X(-46) + s * 14, -46, 13, 9, 'skin', 4); B.e(X(-44) + s * 14, -42, 12, 5, 'skin', 3); B.l(X(-38) + s * 3, -37, X(-38) + s * 24, -38, 'skin', 1, 2); });
    for (let r = 0; r < 3; r++) { B.l(X(-30 + r * 9) - 8, -30 + r * 9, X(-30 + r * 9) + 8, -30 + r * 9, 'skin', 1, 2); } B.l(X(-20), -34, X(0), 2, 'skin', 1, 2);
    if (L.head === 'welder') { B.g([[X(-40) - 18, -44], [X(-40) + 18, -44], [X(0) + 16, 20], [X(0) - 16, 20]], 'cloth'); B.l(X(-44) - 16, -46, X(-60) - 26, top + 6, 'cloth', 3); B.l(X(-44) + 16, -46, X(-60) + 26, top + 6, 'cloth', 3); }
    if (L.head === 'ironmask') { for (let i = 0; i < 4; i++) B.l(X(-50) - 30, -52 + i * 12, X(-20) + 30, -30 + i * 12, 'metal', 2, 3); }
    if (L.head === 'horned') { B.e(X(-30), -22, 3, 3, 'glow', 5); for (let i = 0; i < 6; i++) B.p(X(-40) - 20 + i * 8, -52 + (i % 2) * 3, 'skin2', 2); }
  } else if (k === 'robe' || k === 'gown' || k === 'gown2' || k === 'dress' || k === 'uniform') {
    for (let i = -3; i <= 3; i++) B.l(X(-50) + i * 9, top + 10, X(10) + i * 11, 24, 'cloth', 1, i % 2 ? 2 : 4);   // folds
    B.g([[X(top) - 14, top], [X(top) + 14, top], [X(-40) + 4, -40], [X(-40) - 4, -40]], 'cloth2');             // the V at the neck
    B.r(X(-6) - W0, -8, W0 * 2, 4, 'trim'); B.r(X(-6) - 3, -9, 6, 6, 'metal', 4);                                // belt + clasp
    if (k === 'gown' || k === 'dress') { for (let i = -W1; i <= W1; i += 4) B.p(X(-46) + i, -46 + ((i / 4) % 2), 'trim', 4); B.l(X(top) - 22, top + 6, X(top) + 22, top + 6, 'trim', 2, 4); }
    if (k === 'uniform') { B.r(X(-46) - 5, -50, 10, 10, 'band'); B.r(X(-46) - 1, -48, 2, 6, 'trim', 4); B.r(X(-46) - 3, -46, 6, 2, 'trim', 4); }
    if (k === 'gown2') { B.g([[X(-40) - 26, -30], [X(-40) + 26, -30], [X(0) + 24, 24], [X(0) - 24, 24]], 'cloth2'); for (let i = 0; i < 5; i++) B.p(X(-20) - 12 + i * 6, -18 + (i % 2) * 4, 'trim', 3); }
  } else if (k === 'coat') {
    B.g([[X(top) - 10, top], [X(top) + 10, top], [X(-10) + 3, 0], [X(-10) - 3, 0]], L.head === 'hood' ? 'cloth2' : 'band');   // shirt showing
    B.l(X(top) - 10, top, X(-10) - 4, 0, 'trim', 2); B.l(X(top) + 10, top, X(-10) + 4, 0, 'trim', 2);                      // lapels
    for (let i = 0; i < 4; i++) { B.p(X(-50 + i * 13) - 9, -50 + i * 13, 'metal', 5); B.p(X(-50 + i * 13) + 9, -50 + i * 13, 'metal', 5); }
    [-1, 1].forEach(s => B.r(X(top + 6) + s * (W2 - 4) - 6, top + 4, 12, 5, 'trim', 4));                                     // epaulettes
  } else if (k === 'suit') {
    B.g([[X(top) - 12, top], [X(top) + 12, top], [X(-18), -18]], 'skin2'); B.g([[X(top) - 5, top + 2], [X(top) + 5, top + 2], [X(-30), -30]], 'band');
    B.l(X(top) - 12, top, X(-18), -18, 'cloth2', 2); B.l(X(top) + 12, top, X(-18), -18, 'cloth2', 2);
    B.g([[X(top) - 8, top + 1], [X(top), top + 5], [X(top) - 8, top + 9]], 'trim', 4); B.g([[X(top) + 8, top + 1], [X(top), top + 5], [X(top) + 8, top + 9]], 'trim', 4);   // bow tie
    for (let i = 0; i < 3; i++) B.p(X(-24 + i * 8), -12 - i * 8, 'trim', 5);
  } else if (k === 'armor') {
    B.g([[X(-50) - 30, -54], [X(-50) + 30, -54], [X(-20) + 24, -18], [X(-20) - 24, -18]], 'metal');
    for (let i = -24; i <= 24; i += 8) { B.p(X(-50) + i, -52, 'trim', 5); B.p(X(-20) + i * 0.8, -20, 'trim', 4); }
    B.e(X(-38), -38, 10, 10, 'skin2'); B.e(X(-38), -38, 7, 7, 'glow', 4); B.e(X(-38), -38, 3, 3, 'glow', 5);   // the core in its chest
    for (let r = 0; r < 3; r++) B.l(X(-12 + r * 6) - 22, -12 + r * 6, X(-12 + r * 6) + 22, -12 + r * 6, 'skin2', 2, 2);
  } else if (k === 'chitin') {
    for (let r = 0; r < 6; r++) { const y = -52 + r * 10; B.l(X(y) - W1 + r * 2, y, X(y) + W1 - r * 2, y, 'skin2', 2, r % 2 ? 2 : 3); }
    [-1, 1].forEach(s => { for (let i = 0; i < 5; i++) B.l(X(-50 + i * 12) + s * (W1 - 2), -50 + i * 12, X(-50 + i * 12) + s * (W1 + 8), -54 + i * 12, 'horn', 2, 3); });
    for (let i = 0; i < 5; i++) B.e(X(-30) - 10 + i * 5, -30 + (i % 2) * 6, 2, 2, 'glow', 5);
  }
  // shoulders
  if (k !== 'maw' && k !== 'bark') [-1, 1].forEach(s => { const sh = k === 'armor' ? 'metal' : k === 'brute' ? 'skin' : k === 'coat' || k === 'suit' ? 'cloth' : 'cloth'; B.e(X(top + 6) + s * (W2 - 4), top + 8, 11, 9, sh); B.e(X(top + 4) + s * (W2 - 5), top + 5, 8, 4, sh, 4); if (k === 'armor') B.l(X(top) + s * (W2 - 12), top - 2, X(top) + s * (W2 + 4), top - 2, 'trim', 2, 5); });
}

function head(B, L, h, p) {
  const [x, y] = h, g = p.glow || 0, jaw = p.jaw || 0, k = L.head;
  const face = (rx, ry, mat) => { B.e(x, y, rx, ry, mat || 'skin'); B.e(x - 3, y - 4, rx - 4, ry - 6, mat || 'skin', 4); };
  const mouth = (w, h0, fangs) => { const mh = RR(1 + jaw * h0); B.r(x + 2 - w / 2, y + 7, w, mh, 'mouth'); if (fangs) { for (let i = 0; i < w; i += 3) { B.p(x + 2 - w / 2 + i, y + 7, 'teeth', 5); if (jaw > 0.3) B.p(x + 3 - w / 2 + i, y + 6 + mh, 'teeth', 4); } } };
  switch (k) {
    case 'horned': {
      face(12, 14); B.l(x - 8, y - 5, x + 12, y - 3, 'skin', 3, 2); EYE(B, x - 4, y - 3, 4, g); EYE(B, x + 5, y - 3, 4, g); mouth(12, 6, 1);
      [-1, 1].forEach(s => { let px = x + s * 9, py = y - 10; for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 - s * (0.5 + i * 0.12), w = 5 - i * 0.3; B.e(px, py, w / 2 + 0.5, w / 2 + 0.5, 'horn', i > 10 ? 5 : i > 5 ? 4 : 3); px += Math.cos(a) * 2.2 * -s * -1; py += Math.sin(a) * 2.2; } });
      break; }
    case 'antler': {
      face(11, 13, 'skin2'); B.e(x + 2, y + 10, 10, 8, 'hair'); for (let i = 0; i < 6; i++) B.l(x - 6 + i * 3, y + 12, x - 7 + i * 3, y + 22 + (i % 2) * 4, 'hair', 2, 3);
      EYE(B, x - 3, y - 3, 3, g); EYE(B, x + 5, y - 3, 3, g);
      [-1, 1].forEach(s => { const base = [x + s * 7, y - 12]; const tine = (a, b, n) => { B.l(a[0], a[1], b[0], b[1], 'wood', 2); if (n) for (let i = 0; i < 3; i++) B.p(b[0] + (i - 1), b[1] - 1 - (i % 2), 'leaf', 4); };
        const m1 = [base[0] + s * 10, base[1] - 16], m2 = [base[0] + s * 18, base[1] - 32]; tine(base, m1); tine(m1, m2, 1); tine(m1, [m1[0] - s * 2, m1[1] - 12], 1); tine(base, [base[0] + s * 16, base[1] - 4], 1); tine(m2, [m2[0] + s * 8, m2[1] - 4], 1); tine(m2, [m2[0] - s * 2, m2[1] - 12], 1); });
      break; }
    case 'treeface': {
      // the face is in the trunk: hollow eyes that light up, a mouth like a split in the wood
      const fy = -50; B.e(p.sx(fy) - 8, fy - 6, 5, 4, 'mouth'); B.e(p.sx(fy) + 8, fy - 6, 5, 4, 'mouth'); if (g) { B.e(p.sx(fy) - 8, fy - 6, 2, 1.5, 'eye', g > 1 ? 5 : 4); B.e(p.sx(fy) + 8, fy - 6, 2, 1.5, 'eye', g > 1 ? 5 : 4); }
      B.g([[p.sx(fy) - 10, fy + 8], [p.sx(fy) + 10, fy + 7], [p.sx(fy) + 6, fy + 10 + jaw * 10], [p.sx(fy) - 6, fy + 10 + jaw * 9]], 'mouth');
      B.l(p.sx(fy) - 14, fy - 12, p.sx(fy) - 3, fy - 10, 'skin', 2, 2); B.l(p.sx(fy) + 14, fy - 12, p.sx(fy) + 3, fy - 10, 'skin', 2, 2);
      break; }
    case 'crown': {
      B.g([[x - 14, y - 10], [x + 12, y - 12], [x + 18, y + 26], [x + 8, y + 40], [x - 18, y + 42], [x - 22, y + 20]], 'hair');   // long hair behind
      face(10, 12); EYE(B, x - 3, y - 2, 3, g); EYE(B, x + 5, y - 2, 3, g); B.r(x + 1, y + 7, 4, 1, 'skin2', 2);
      for (let i = 0; i < 9; i++) B.p(x - 12 + i * 3, y - 12 - Math.abs(4 - i) * -1 - (i % 2 ? 2 : 0), 'metal', 5);
      B.l(x - 12, y - 11, x + 12, y - 12, 'metal', 2, 4); B.e(x, y - 15, 3, 3, 'metal', 4); B.e(x + 1, y - 15, 2, 2, 'eye', 5);   // crescent crown
      break; }
    case 'hood': case 'skullhood': {
      B.g([[x - 16, y + 12], [x - 14, y - 10], [x - 4, y - 18], [x + 10, y - 16], [x + 16, y - 4], [x + 16, y + 14]], 'cloth');
      B.e(x + 3, y + 1, 10, 11, 'mouth');
      if (k === 'skullhood') { B.e(x + 4, y + 1, 8, 9, 'skin'); B.e(x + 1, y - 1, 3, 3, 'mouth'); B.e(x + 8, y - 1, 3, 3, 'mouth'); B.p(x + 1, y - 1, 'eye', 5); B.p(x + 8, y - 1, 'eye', 5); for (let i = 0; i < 4; i++) B.p(x + 2 + i * 2, y + 7, 'mouth'); }
      else { B.r(x - 1, y - 2, 3, 2, 'eye', g ? 5 : 4); B.r(x + 6, y - 2, 3, 2, 'eye', g ? 5 : 4); }
      break; }
    case 'bell': {
      face(12, 12); for (let i = 0; i < 4; i++) B.l(x - 12, y - 8 + i * 5, x + 12, y - 6 + i * 5 - (i % 2), 'band', 2, i % 2 ? 3 : 4);   // bandages
      B.r(x + 3, y - 4, 4, 2, 'mouth'); B.r(x + 4, y - 4, 2, 1, 'eye', g ? 5 : 4); mouth(8, 4, 0);
      break; }
    case 'doll': {
      B.e(x, y - 2, 15, 12, 'hair'); for (let i = 0; i < 5; i++) B.e(x - 14 + i * 7, y + 8 + (i % 2) * 3, 4, 6, 'hair');   // curls
      face(12, 12); B.e(x - 5, y - 1, 3.5, 3.5, 'snow'); B.e(x + 6, y - 1, 3.5, 3.5, 'snow'); B.e(x - 5, y - 1, 2, 2.5, 'eye', 4); B.e(x + 6, y - 1, 2, 2.5, 'eye', 4); B.p(x - 6, y - 2, 'snow', 5); B.p(x + 5, y - 2, 'snow', 5);
      B.e(x - 8, y + 5, 2, 1.5, 'skin2', 4); B.e(x + 9, y + 5, 2, 1.5, 'skin2', 4); B.r(x, y + 7, 3, 1 + RR(jaw * 3), 'cloth2');
      B.l(x + 4, y - 11, x - 1, y + 2, 'mouth'); B.l(x - 1, y + 2, x + 2, y + 9, 'mouth');   // the crack
      B.g([[x + 6, y - 14], [x + 14, y - 18], [x + 12, y - 10]], 'cloth', 4); B.g([[x + 6, y - 14], [x - 1, y - 19], [x + 1, y - 10]], 'cloth', 4); B.e(x + 6, y - 14, 2, 2, 'cloth2');
      break; }
    case 'clown': {
      [-1, 1].forEach(s => { B.e(x + s * 13, y - 4, 7, 9, 'hair'); B.e(x + s * 16, y - 8, 5, 5, 'hair', 4); });
      face(12, 13); B.g([[x - 6, y - 7], [x - 3, y - 4], [x - 6, y - 1], [x - 9, y - 4]], 'mouth'); B.g([[x + 6, y - 7], [x + 9, y - 4], [x + 6, y - 1], [x + 3, y - 4]], 'mouth');
      if (g) { B.p(x - 6, y - 4, 'eye', 5); B.p(x + 6, y - 4, 'eye', 5); }
      B.e(x + 2, y + 1, 3, 3, 'skin2', 4); B.g([[x - 10, y + 6], [x + 12, y + 5], [x + 8, y + 10 + jaw * 5], [x - 6, y + 11 + jaw * 5]], 'skin2'); B.r(x - 6, y + 7, 14, 1 + RR(jaw * 3), 'mouth'); for (let i = 0; i < 5; i++) B.p(x - 5 + i * 3, y + 7, 'band', 5);
      B.r(x - 4, y - 22, 10, 9, 'cloth'); B.r(x - 7, y - 14, 16, 2, 'cloth'); B.r(x - 4, y - 16, 10, 2, 'trim', 4);   // little top hat
      break; }
    case 'tricorn': {
      face(11, 13); B.e(x + 2, y + 10, 10, 6, 'hair'); for (let i = 0; i < 7; i++) B.l(x - 6 + i * 2.5, y + 12, x - 7 + i * 2.5, y + 22 + (i % 3) * 3, 'hair', 1, i % 2 ? 3 : 4);   // seaweed beard
      EYE(B, x - 3, y - 3, 3, g); EYE(B, x + 5, y - 3, 3, g); B.r(x - 1, y + 6, 8, 1 + RR(jaw * 3), 'mouth');
      B.g([[x - 20, y - 10], [x + 20, y - 12], [x + 12, y - 22], [x, y - 26], [x - 12, y - 22]], 'cloth'); B.l(x - 20, y - 10, x + 20, y - 12, 'trim', 2, 4); B.e(x, y - 18, 3, 3, 'band', 5);
      break; }
    case 'welder': {
      face(11, 13); B.g([[x - 12, y - 14], [x + 13, y - 14], [x + 14, y + 6], [x - 11, y + 7]], 'metal'); B.r(x - 8, y - 5, 18, 4, 'mouth'); B.r(x - 7, y - 4, 16, 2, 'eye', g ? 5 : 3);
      for (let i = 0; i < 4; i++) B.p(x - 10 + i * 7, y + 4, 'metal', 5); B.e(x + 2, y + 12, 10, 6, 'hair'); B.r(x - 2, y + 9, 8, 1 + RR(jaw * 3), 'mouth');
      break; }
    case 'visor': {
      B.r(x - 13, y - 13, 26, 24, 'metal'); B.r(x - 13, y - 13, 26, 3, 'metal', 5); B.r(x - 11, y - 4, 22, 5, 'mouth'); B.r(x - 10, y - 3, 20, 3, 'eye', g ? 5 : 4);
      for (let i = 0; i < 4; i++) B.p(x - 10 + i * 7, y + 7, 'trim', 5); B.r(x - 6, y + 5, 12, 3 + RR(jaw * 3), 'skin2'); B.l(x + 8, y - 13, x + 12, y - 24, 'metal', 2); B.e(x + 12, y - 25, 2, 2, 'glow', 5);
      break; }
    case 'nurse': {
      B.e(x - 4, y - 2, 13, 14, 'hair'); B.e(x - 12, y - 10, 6, 6, 'hair'); face(10, 12); B.r(x - 7, y + 1, 17, 9, 'band'); B.l(x - 7, y + 3, x + 10, y + 3, 'band', 1, 2);   // surgical mask
      EYE(B, x - 3, y - 4, 3, g); EYE(B, x + 5, y - 4, 3, g);
      B.g([[x - 10, y - 12], [x + 10, y - 13], [x + 8, y - 20], [x - 8, y - 20]], 'band'); B.r(x - 1, y - 19, 2, 6, 'trim', 4); B.r(x - 3, y - 17, 6, 2, 'trim', 4);
      break; }
    case 'surgeon': {
      face(11, 13); B.r(x - 7, y + 1, 17, 10, 'band'); EYE(B, x - 3, y - 4, 3, g); EYE(B, x + 5, y - 4, 3, g);
      B.l(x - 11, y - 9, x + 11, y - 10, 'skin2', 2); B.e(x + 1, y - 11, 5, 5, 'metal'); B.e(x + 1, y - 11, 3, 3, 'eye', 5);   // headlamp
      break; }
    case 'mono': {
      B.e(x, y, 14, 13, 'metal'); B.r(x - 14, y - 2, 28, 4, 'skin2'); B.e(x + 3, y - 1, 7, 7, 'mouth'); B.e(x + 3, y - 1, 5, 5, 'eye', g ? 5 : 4); B.e(x + 3, y - 1, 2, 2, 'eye', 5);
      [-1, 1].forEach(s => { B.l(x + s * 10, y - 10, x + s * 16, y - 26, 'metal', 2); B.p(x + s * 16, y - 27, 'glow', 5); });
      break; }
    case 'xeno': {
      B.g([[x - 10, y + 8], [x - 8, y - 10], [x - 30, y - 30], [x - 40, y - 24], [x - 26, y - 4]], 'skin'); B.e(x, y, 12, 11, 'skin'); B.e(x - 3, y - 4, 7, 5, 'skin', 4);
      B.r(x - 2, y + 4, 14, 3 + RR(jaw * 5), 'mouth'); for (let i = 0; i < 5; i++) { B.p(x - 1 + i * 3, y + 4, 'teeth', 5); B.p(x + i * 3, y + 6 + RR(jaw * 5), 'teeth', 4); }
      if (jaw > 0.5) B.r(x + 9, y + 5, 4, 3, 'teeth', 4);   // the inner jaw
      break; }
    case 'ironmask': {
      B.r(x - 12, y - 14, 24, 26, 'metal'); B.r(x - 12, y - 14, 24, 3, 'metal', 5); for (let i = 0; i < 5; i++) B.p(x - 10 + i * 5, y + 9, 'metal', 5);
      B.r(x - 8, y - 5, 5, 2, 'mouth'); B.r(x + 3, y - 5, 5, 2, 'mouth'); B.r(x - 7, y - 5, 3, 1, 'eye', 5); B.r(x + 4, y - 5, 3, 1, 'eye', 5); for (let i = 0; i < 4; i++) B.r(x - 6 + i * 4, y + 2, 2, 5, 'mouth');
      [-1, 1].forEach(s => { B.l(x + s * 10, y - 12, x + s * 18, y - 24, 'horn', 3); B.l(x + s * 18, y - 24, x + s * 16, y - 32, 'horn', 2, 5); });
      break; }
    case 'visorcap': {
      B.e(x - 2, y - 6, 13, 9, 'hair'); face(11, 12); EYE(B, x - 3, y - 2, 3, 1); EYE(B, x + 5, y - 2, 3, 1); B.l(x - 1, y + 5, x + 9, y + 4, 'hair', 1); B.r(x + 1, y + 8, 6, 1 + RR(jaw * 2), 'mouth');
      B.g([[x - 14, y - 9], [x + 12, y - 11], [x + 22, y - 6], [x + 10, y - 5]], 'band', 3); B.l(x - 12, y - 12, x + 10, y - 13, 'band', 2, 4);
      break; }
    case 'tophat': {
      face(11, 13, 'skin'); B.r(x - 8, y - 9, 18, 14, 'skin', 5); B.g([[x + 1, y - 7], [x + 5, y - 2], [x + 1, y + 3], [x - 3, y - 2]], 'skin2', 4);   // the card mask, a red diamond
      EYE(B, x - 5, y - 4, 2, g); EYE(B, x + 6, y - 4, 2, g); B.g([[x - 9, y + 7], [x + 11, y + 6], [x + 7, y + 11 + jaw * 3], [x - 5, y + 12 + jaw * 3]], 'mouth'); for (let i = 0; i < 6; i++) B.p(x - 6 + i * 3, y + 7, 'skin', 5);
      B.r(x - 10, y - 32, 20, 20, 'cloth2'); B.r(x - 16, y - 14, 32, 3, 'cloth2'); B.r(x - 10, y - 18, 20, 3, 'trim', 4);
      break; }
    case 'none': default: {
      if (L.body === 'maw') {
        // the whole body is a mouth: rows of teeth, the lure on its stalk
        const cx = p.sx(-40), cy = -36; B.g([[cx - 46, cy - 6], [cx + 50, cy - 10], [cx + 44, cy + 10 + jaw * 18], [cx - 40, cy + 14 + jaw * 16]], 'mouth');
        for (let i = 0; i < 16; i++) { const tx = cx - 42 + i * 6; B.g([[tx, cy - 6], [tx + 5, cy - 6], [tx + 2, cy + 2]], 'teeth', i % 2 ? 4 : 5); B.g([[tx + 1, cy + 12 + jaw * 16], [tx + 6, cy + 12 + jaw * 16], [tx + 3, cy + 5 + jaw * 16]], 'teeth', 4); }
        B.e(cx + 14, cy - 26, 5, 4, 'mouth'); B.e(cx + 14, cy - 26, 3, 2, 'eye', g ? 5 : 4); B.e(cx - 16, cy - 28, 4, 3, 'mouth'); B.e(cx - 16, cy - 28, 2, 2, 'eye', g ? 5 : 4);
        const st = [[cx + 4, cy - 44], [cx + 20, cy - 70], [cx + 42, cy - 84], [cx + 58, cy - 76]]; for (let i = 1; i < st.length; i++) B.l(st[i - 1][0], st[i - 1][1], st[i][0], st[i][1], 'skin', 2);
        B.e(st[3][0], st[3][1] + 6, 6, 6, 'glow', g ? 5 : 4); B.e(st[3][0], st[3][1] + 6, 3, 3, 'glow', 5);
      }
    }
  }
}

function back(B, L, p, sx, top) {
  const k = L.back, sh = [sx(top), top + 4];
  switch (k) {
    case 'batwings': [-1, 1].forEach(s => { const root = [sh[0] + s * 18, sh[1] + 6], tips = [[s * 86, -126], [s * 104, -84], [s * 96, -44], [s * 72, -26]].map(([a, b]) => [sh[0] + a, b + (p.up ? -10 : 0)]);
      B.g([root].concat(tips).concat([[sh[0] + s * 30, -30]]), 'wing', 2); tips.forEach(t => B.l(root[0], root[1] - 6, t[0], t[1], 'horn', 2, 3)); B.l(root[0], root[1] - 6, sh[0] + s * 62, -138 + (p.up ? -10 : 0), 'horn', 3, 4); }); break;
    case 'fairy': [-1, 1].forEach(s => { for (let w = 0; w < 2; w++) { const a = [sh[0] + s * 12, sh[1] + 4 + w * 16], b = [sh[0] + s * (74 - w * 16), sh[1] - 50 + w * 64], c = [sh[0] + s * (54 - w * 10), sh[1] - 6 + w * 30];
      B.g([a, b, c], 'wing', 4); B.l(a[0], a[1], b[0], b[1], 'wing', 1, 5); for (let i = 0; i < 6; i++) B.p(a[0] + (b[0] - a[0]) * i / 6 + s * 3, a[1] + (b[1] - a[1]) * i / 6 + 4, 'glow', 5); } }); break;
    case 'branches': case 'crown': { const n = k === 'crown' ? 9 : 5, r0 = k === 'crown' ? 60 : 40;
      for (let i = 0; i < n; i++) { const a = -Math.PI * (0.12 + 0.76 * i / (n - 1)), len = r0 + (i % 3) * 14, bx = sx(top) + Math.cos(a) * 16, by = top + 4, ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
        B.l(bx, by, ex, ey, 'wood', k === 'crown' ? 5 : 3); B.l(ex, ey, ex + Math.cos(a + 0.6) * 18, ey + Math.sin(a + 0.6) * 18, 'wood', 2); B.l(ex, ey, ex + Math.cos(a - 0.6) * 16, ey + Math.sin(a - 0.6) * 16, 'wood', 2);
        const lc = k === 'crown' ? 26 : 12; for (let j = 0; j < lc; j++) { const lx = ex + Math.cos(j * 2.4) * (8 + (j % 5) * 3), ly = ey + Math.sin(j * 2.4) * (6 + (j % 4) * 3); B.e(lx, ly, 3, 2.5, j % 3 ? 'leaf' : 'leaf2' in (L.mat || {}) ? 'leaf2' : 'leaf', j % 4 ? 3 : 4); } } break; }
    case 'bell': B.e(sh[0] - 22, sh[1] - 18, 26, 24, 'metal'); B.r(sh[0] - 50, sh[1] - 2, 56, 7, 'metal'); B.e(sh[0] - 30, sh[1] - 26, 10, 8, 'metal', 4); B.l(sh[0] - 44, sh[1] - 36, sh[0] + 6, sh[1] + 6, 'band', 3); break;
    case 'tombs': for (let i = 0; i < 3; i++) { const x = sh[0] - 48 + i * 22, y = -64 + (i % 2) * 10; B.r(x, y, 14, 30, 'skin2', 3); B.e(x + 7, y, 7, 5, 'skin2', 3); B.r(x + 6, y + 6, 2, 10, 'mouth'); B.r(x + 3, y + 9, 8, 2, 'mouth'); } break;
    case 'carousel': { const cx = sh[0] - 6, cy = -130; B.g([[cx - 90, cy + 34], [cx, cy - 6], [cx + 90, cy + 34]], 'cloth'); for (let i = 0; i < 8; i++) B.g([[cx - 90 + i * 22.5, cy + 34], [cx, cy - 6], [cx - 90 + (i + 0.5) * 22.5, cy + 34]], 'band'); B.l(cx - 90, cy + 34, cx + 90, cy + 34, 'trim', 3, 4);
      for (let i = 0; i < 14; i++) B.p(cx - 86 + i * 13, cy + 37, 'trim', 5); [-70, 70].forEach(d => B.l(cx + d, cy + 36, cx + d, 20, 'trim', 2, 4)); break; }
    case 'tent': for (let i = 0; i < 6; i++) B.g([[sh[0] - 70 + i * 24, -20], [sh[0] - 6, -150], [sh[0] - 58 + i * 24, -20]], i % 2 ? 'cloth' : 'band', 3); [[-60, -120], [40, -140], [70, -110]].forEach(([a, b], i) => { B.e(sh[0] + a, b, 7, 9, i % 2 ? 'hair' : 'cloth2'); B.l(sh[0] + a, b + 9, sh[0] + a * 0.5, -60, 'band', 1); }); break;
    case 'mast': B.l(sh[0] - 40, 20, sh[0] - 30, -160, 'wood', 5); B.l(sh[0] - 70, -130, sh[0] + 10, -126, 'wood', 3); B.g([[sh[0] - 66, -126], [sh[0] + 6, -122], [sh[0] + 2, -70], [sh[0] - 20, -80], [sh[0] - 40, -64], [sh[0] - 60, -84]], 'band', 3); for (let i = 0; i < 5; i++) B.p(sh[0] - 50 + i * 10, -100 + (i % 2) * 6, 'mouth'); break;
    case 'tentacles': for (let s = 0; s < 5; s++) { let px = sx(-30) + (s - 2) * 22, py = -10, a = -Math.PI / 2 + (s - 2) * 0.5; for (let i = 0; i < 22; i++) { a += Math.sin(i * 0.5 + s) * 0.14; px += Math.cos(a) * 3.2; py += Math.sin(a) * 3.2; B.e(px, py, 4.2 - i * 0.16, 4.2 - i * 0.16, 'skin2', i % 4 === 0 ? 4 : 0); } } break;
    case 'chimney': [-1, 1].forEach(s => { const x = sh[0] + s * 26 - 5; B.r(x, top - 40, 10, 40, 'skin2'); B.r(x - 2, top - 44, 14, 5, 'skin2', 4); for (let i = 0; i < 3; i++) B.r(x + 2, top - 30 + i * 10, 6, 2, 'trim', 4); }); break;
    case 'drip': { const x = sh[0] - 44; B.l(x, 20, x, -140, 'metal', 2, 4); B.l(x - 12, -140, x + 12, -140, 'metal', 2, 4); B.r(x - 10, -136, 14, 20, 'band', 4); B.r(x - 8, -126, 10, 8, 'trim', 4); B.l(x - 3, -116, sh[0] - 20, -70, 'band', 1, 5); break; }
    case 'arms': [-1, 1].forEach(s => { const a = [sh[0] + s * 20, sh[1] + 12], b = [sh[0] + s * 52, -110], c = [sh[0] + s * 76, -130]; seg(B, a, b, 5, 4, 'skin'); seg(B, b, c, 4, 3, 'skin'); B.l(c[0], c[1], c[0] + s * 12, c[1] - 12, 'metal', 2, 5); }); break;
    case 'cannons': [-1, 1].forEach(s => { const x = sh[0] + s * 30; B.r(x - 8, top - 16, 16, 14, 'skin2'); B.r(x + (s > 0 ? 6 : -30), top - 12, 24, 6, 'metal'); B.r(x + (s > 0 ? 26 : -32), top - 13, 4, 8, 'glow', 4); }); break;
    case 'eggs': for (let i = 0; i < 12; i++) { const x = sh[0] - 50 + (i % 6) * 18 + (i > 5 ? 9 : 0), y = -90 - (i > 5 ? 22 : 0) - (i % 3) * 5; B.e(x, y, 7, 9, 'skin2'); B.e(x - 2, y - 3, 3, 4, 'glow', 4); } break;
    case 'chains': for (let c = 0; c < 4; c++) { const x0 = sh[0] - 40 + c * 26; for (let i = 0; i < 12; i++) B.e(x0 + Math.sin(i * 0.6 + c) * 4, -130 + i * 9, 2.5, 3.5, 'metal', i % 2 ? 3 : 4); } break;
    case 'oar': B.l(sh[0] - 50, 30, sh[0] + 20, -160, 'wood', 4); B.g([[sh[0] + 14, -150], [sh[0] + 30, -190], [sh[0] + 38, -186], [sh[0] + 24, -146]], 'wood'); break;
    case 'cards': for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.28, cx = sh[0] + Math.cos(a) * 80, cy = -70 + Math.sin(a) * 80; B.g([[cx - 12, cy - 16], [cx + 12, cy - 16], [cx + 12, cy + 16], [cx - 12, cy + 16]], 'skin2', 5); B.e(cx, cy, 4, 5, i % 2 ? 'cloth2' : 'mouth', i % 2 ? 4 : 0); } break;
    case 'chips': for (let i = 0; i < 5; i++) for (let j = 0; j < 6 - i; j++) { const x = sh[0] - 70 + j * 24 + i * 12, y = -20 - i * 12; B.e(x, y, 11, 4, j % 2 ? 'trim' : 'mouth', 3); B.e(x, y - 2, 11, 4, j % 2 ? 'trim' : 'cream'); } break;
  }
}

function arm(B, L, s, t, out, near, p) {
  const kind = L.arm || 'fist', long = kind === 'tentacle' || kind === 'branch' ? 1.12 : 1, l1 = 46 * long, l2 = 44 * long, { e, h } = ik(s, t, l1, l2, out);
  const mat = kind === 'branch' ? 'wood' : kind === 'tentacle' ? 'skin2' : L.body === 'brute' || kind === 'claw' || kind === 'piston' ? 'skin' : 'cloth';
  const w0 = kind === 'hand' ? 11 : 14, w1 = kind === 'hand' ? 8 : 11;
  if (kind === 'tentacle') { let px = s[0], py = s[1]; const n = 26; for (let i = 0; i <= n; i++) { const q = i / n, bx = s[0] + (e[0] - s[0]) * q * 2, by = s[1] + (e[1] - s[1]) * q * 2, fx = q < 0.5 ? bx : e[0] + (h[0] - e[0]) * (q - 0.5) * 2, fy = q < 0.5 ? by : e[1] + (h[1] - e[1]) * (q - 0.5) * 2; B.e(fx + Math.sin(q * 9) * 2, fy, 7 - q * 4, 7 - q * 4, mat, i % 5 === 0 ? 4 : 0); } for (let i = 0; i < 6; i++) B.p(e[0] + (h[0] - e[0]) * i / 6, e[1] + (h[1] - e[1]) * i / 6 + 3, 'skin', 5); return h; }
  seg(B, s, e, w0, w0 - 2, mat); seg(B, e, h, w0 - 2, w1, mat === 'cloth' ? 'skin' : mat);
  if (kind === 'branch') { for (let i = 0; i < 4; i++) { const a = -0.9 + i * 0.6, len = 12 + (i % 2) * 6; B.l(h[0], h[1], h[0] + Math.cos(a) * len, h[1] + Math.sin(a) * len, 'wood', 2); B.e(h[0] + Math.cos(a) * len, h[1] + Math.sin(a) * len, 3, 3, 'leaf', 3); } return h; }
  if (mat === 'cloth') B.e(e[0] + (h[0] - e[0]) * 0.8, e[1] + (h[1] - e[1]) * 0.8, 6, 6, 'trim');   // cuff
  if (kind === 'piston') { B.r(h[0] - 9, h[1] - 9, 18, 18, 'metal'); B.r(h[0] - 9, h[1] - 9, 18, 4, 'metal', 5); for (let i = 0; i < 3; i++) B.p(h[0] - 6 + i * 6, h[1] + 5, 'trim', 5); B.l(s[0], s[1], e[0], e[1], 'trim', 2, 4); return h; }
  if (kind === 'claw') { B.e(h[0], h[1], 9, 8, mat); for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.45 + Math.atan2(h[1] - e[1], h[0] - e[0]); B.l(h[0] + Math.cos(a) * 7, h[1] + Math.sin(a) * 7, h[0] + Math.cos(a) * 16, h[1] + Math.sin(a) * 16, 'horn', 2, i % 2 ? 4 : 5); } return h; }
  if (kind === 'hand') { B.e(h[0], h[1], 6, 6, 'skin'); B.e(h[0] - 1, h[1] - 2, 3, 2, 'skin', 4); return h; }
  B.e(h[0], h[1], 10, 9, mat === 'cloth' ? 'skin' : mat); B.e(h[0] - 2, h[1] - 3, 6, 3, mat === 'cloth' ? 'skin' : mat, 4); for (let i = 0; i < 4; i++) B.p(h[0] + 6, h[1] - 5 + i * 3, mat === 'cloth' ? 'skin' : mat, 2);
  return h;
}
function weapon(B, L, h, dir) {
  const k = L.weapon; if (!k) return; const [x, y] = h, a = Math.atan2(dir[1], dir[0]), up = [Math.cos(a - Math.PI / 2), Math.sin(a - Math.PI / 2)], fw = [Math.cos(a), Math.sin(a)];
  const P = (u, v) => [x + fw[0] * u + up[0] * v, y + fw[1] * u + up[1] * v];
  const shaft = (u0, u1, mat, w) => { const a0 = P(u0, 0), a1 = P(u1, 0); B.l(a0[0], a0[1], a1[0], a1[1], mat, w); };
  switch (k) {
    case 'hammer': shaft(-20, 50, 'wood', 3); { const c = P(56, 0); B.e(c[0], c[1], 13, 13, 'metal'); B.e(c[0] - 3, c[1] - 4, 7, 5, 'metal', 5); } break;
    case 'mallet': shaft(-20, 46, 'wood', 3); { const c = P(56, 0); B.e(c[0], c[1], 15, 12, 'metal'); B.e(c[0], c[1], 15, 4, 'band', 4); } break;
    case 'staff': shaft(-40, 70, 'wood', 3); { const c = P(76, 0); B.e(c[0], c[1], 7, 7, 'glow', 4); B.e(c[0], c[1], 3, 3, 'glow', 5); for (let i = 0; i < 4; i++) { const q = P(70, (i - 1.5) * 5); B.l(q[0], q[1], c[0] + (i - 1.5) * 4, c[1] - 8, 'wood', 1); } } break;
    case 'scepter': shaft(-10, 52, 'metal', 2); { const c = P(58, 0); B.e(c[0], c[1], 8, 8, 'metal', 4); B.e(c[0] + 2, c[1] - 2, 6, 6, 'mouth'); B.e(c[0] + 2, c[1] - 2, 2, 2, 'glow', 5); } break;
    case 'anchor': { shaft(-8, 60, 'metal', 4); const c = P(62, 0), l = P(50, 16), r = P(50, -16); B.l(l[0], l[1], r[0], r[1], 'metal', 3); B.l(c[0], c[1], P(54, 20)[0], P(54, 20)[1], 'metal', 4); B.l(c[0], c[1], P(54, -20)[0], P(54, -20)[1], 'metal', 4); B.e(P(-10, 0)[0], P(-10, 0)[1], 5, 5, 'metal', 4); break; }
    case 'shovel': { shaft(-24, 50, 'wood', 3); const c = P(60, 0); B.g([P(50, 8), P(50, -8), P(72, -9), P(76, 0), P(72, 9)], 'metal'); B.r(c[0] - 1, c[1] - 1, 3, 3, 'metal', 5); break; }
    case 'syringe': { const a0 = P(0, 0), a1 = P(56, 0); B.l(a0[0], a0[1], a1[0], a1[1], 'band', 9); B.l(P(8, 0)[0], P(8, 0)[1], P(48, 0)[0], P(48, 0)[1], 'eye', 5, 3); shaft(56, 84, 'metal', 1); shaft(-14, 0, 'metal', 3); break; }
    case 'scalpel': shaft(-6, 20, 'metal', 3); B.g([P(20, 3), P(20, -3), P(44, 0)], 'metal', 5); break;
    case 'lantern': { shaft(-40, 60, 'wood', 3); const c = P(64, -10); B.l(P(60, 0)[0], P(60, 0)[1], c[0], c[1], 'metal', 1); B.e(c[0], c[1] + 8, 7, 8, 'metal'); B.e(c[0], c[1] + 8, 4, 5, 'glow', 5); break; }
    case 'flail': { shaft(-6, 16, 'wood', 4); let px = P(16, 0)[0], py = P(16, 0)[1]; for (let i = 0; i < 8; i++) { py += 4; px += fw[0] * 3; B.e(px, py, 2, 2.5, 'metal', i % 2 ? 3 : 4); } B.e(px, py + 8, 9, 9, 'metal'); for (let i = 0; i < 6; i++) { const aa = i * 1.05; B.p(px + Math.cos(aa) * 11, py + 8 + Math.sin(aa) * 11, 'metal', 5); } break; }
    case 'clapper': { shaft(-10, 40, 'metal', 3); const c = P(48, 0); B.e(c[0], c[1], 10, 10, 'metal'); B.e(c[0] - 2, c[1] - 3, 4, 3, 'metal', 5); break; }
    case 'cards': for (let i = 0; i < 4; i++) { const c = P(6 + i * 3, 6 - i * 5); B.r(c[0] - 6, c[1] - 9, 12, 16, 'skin2', 5); B.e(c[0], c[1] - 1, 2, 3, i % 2 ? 'cloth2' : 'mouth', 4); } break;
    case 'cane': shaft(-30, 60, 'cloth2', 2); { const c = P(-34, 0); B.e(c[0], c[1], 5, 5, 'metal', 4); } break;
  }
}

// a head is drawn at 1.45 × its sketch size, around its chin: giants read better with a bigger head
const HEADK = 1.45;
function scaled(B, cx, cy, k) {
  const X = (x) => cx + (x - cx) * k, Y = (y) => cy + (y - cy) * k;
  const o = { p: (x, y, m, t) => B.e(X(x), Y(y), k / 2, k / 2, m, t), r: (x, y, w, h, m, t) => B.r(X(x), Y(y), w * k, h * k, m, t), l: (x0, y0, x1, y1, m, th, t) => B.l(X(x0), Y(y0), X(x1), Y(y1), m, Math.max(1, RR((th || 1) * k)), t),
    e: (x, y, rx, ry, m, t) => B.e(X(x), Y(y), rx * k, ry * k, m, t), d: (x, y, r, m, t) => B.e(X(x), Y(y), r * k, r * k, m, t), g: (pts, m, t) => B.g(pts.map(([a, b]) => [X(a), Y(b)]), m, t) };
  o.raw = B.raw || B; o.k = (B.k || 1) * k; o.X = (x) => (B.X ? B.X(X(x)) : X(x)); o.Y = (y) => (B.Y ? B.Y(Y(y)) : Y(y)); return o;
}
// the whole giant is drawn at 0.8 of its sketch: it has to fit the field with its wings and horns
const TK = 0.8;
// light from the front and above: the back of the body a step darker, the front a step lighter, the base in shadow
function shadeBody(B, cx, w, y0, y1) {
  const skip = new Set(['mouth', 'eye', 'glow', 'teeth', 'metal', 'trim', 'band']);
  for (let y = y0; y <= y1; y++) for (let x = RR(cx - w); x <= RR(cx + w); x++) {
    const X = x + B.ox, Y = y + B.oy; if (X < 0 || Y < 0 || X >= B.w || Y >= B.h) continue; const i = Y * B.w + X, id = B.m[i]; if (!id || B.t[i]) continue; if (skip.has(B.list[id].n)) continue;
    const u = (x - cx) / w; B.t[i] = y > -10 ? 2 : u < -0.42 ? 2 : u > 0.45 ? 4 : 0;
  }
}
function titan(B, L, p) {
  const lean = p.lean || 0, bob = p.bob || 0, top = -62 + bob;
  const sx = (y) => lean * (-y) / 64;   // how far the body at height y leans forward
  p.sx = sx;
  const neck = [sx(top) + 2, top - 2], hp = L.head === 'treeface' || L.head === 'none' ? [sx(-50), -50] : [sx(-80) + 4 + (p.up ? -2 : 0), -80 + bob + (p.up ? -3 : 0)];
  const shL = [sx(top + 4) - 30, top + 6], shR = [sx(top + 4) + 30, top + 6];
  back(B, L, p, sx, top);
  // far arm first (behind the body), then the body, head, near arm and what it holds
  if (L.body !== 'maw' || L.arm === 'tentacle') arm(B, L, shL, p.fl, -1, false, p);
  body(B, L, p, sx);
  if (L.body !== 'maw') { const k = B.k || 1; shadeBody(B.raw || B, sx(-30) * k, (L.body === 'bark' ? 34 : 44) * k, (top - 4) * k, 24 * k); }
  if (hp && L.head !== 'treeface' && L.head !== 'none') { B.r(neck[0] - 7, neck[1] - 6, 14, 10, L.body === 'brute' ? 'skin' : L.head === 'visor' || L.head === 'mono' ? 'skin2' : 'skin'); }
  head(L.head === 'treeface' || L.head === 'none' ? B : scaled(B, hp[0], hp[1] + 10, HEADK), L, hp, p);
  const hR = arm(B, L, shR, p.fr, 1, true, p);
  weapon(B, L, hR, [Math.cos(p.wa == null ? -1.3 : p.wa), Math.sin(p.wa == null ? -1.3 : p.wa)]);
  B.focus = L.head === 'treeface' || L.head === 'none' ? [sx(-50), -56] : [hp[0] + 2, hp[1] - 2];
  if (p.st === 'windSlam') B.focus = [(p.fl[0] + p.fr[0]) / 2, (p.fl[1] + p.fr[1]) / 2];
}

// ───────── frames ─────────
const W = 340, H = 220, OX = 150, OY = 186, cache = new Map();
M.TITAN.frame = function (key, st, f, o = {}) {
  const L = LOOK[key] || LOOK.FB_demon, P = POSES[st] || POSES.idle, fi = ((f % P.length) + P.length) % P.length;
  const lane = o.lane || 0, tint = o.tint || '', ck = key + '|' + st + '|' + fi + '|' + lane + '|' + tint + '|' + (o.hot ? 1 : 0); let c = cache.get(ck); if (c) return c;
  const pose = Object.assign({ st, lean: 0, bob: 0, jaw: 0, glow: 0 }, P[fi]); pose.fl = pose.fl.slice(); pose.fr = pose.fr.slice();
  if (o.hot) pose.glow = Math.max(pose.glow, 1);   // second phase: the eyes and the edge stay lit
  if (st === 'slam') { pose.fl[1] += lane / ART / TK; pose.fr[1] += lane / ART / TK; }
  const B = new Buf(W, H, OX, OY, Object.assign({ mouth: 'ink', teeth: 'bone', glow: 'fire', leaf: 'green', leaf2: 'moss', wing: 'shadow', horn: 'bone', band: 'cream', hair: 'shadow', wood: 'wood', eye: 'fire', trim: 'gold', metal: 'iron', skin2: 'bone', cloth2: 'void' }, L.mat));
  const RB = scaled(B, 0, 0, TK); titan(RB, L, pose); if (RB.focus) B.focus = [RB.focus[0] * TK, RB.focus[1] * TK];
  const img = bake(B, { rim: pose.glow >= 2 ? 2 : pose.glow >= 1 ? 1 : 0, rimRamp: L.mat.glow || L.mat.eye || 'fire', tint, shiny: { metal: 1, trim: 1, horn: 1, teeth: 1 } });
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').putImageData(img, 0, 0);
  c = M.asPx(cv, ART); c.cx = OX * ART; c.footY = OY * ART; c.S = 100 * ART; c.focus = B.focus ? [B.focus[0] * ART, B.focus[1] * ART] : [0, -300];
  if (cache.size > 400) cache.clear(); cache.set(ck, c); return c;
};
// what the boss is doing right now → a frame
M.TITAN.poseOf = function (e, T) {
  const A = e.ai || {}; let st = 'idle', f = Math.floor(T * 1.6 + e.id);
  if (A.st === 'wind') { st = A.k === 'slam' ? 'windSlam' : A.k === 'sweep' ? 'windSweep' : 'windRain'; f = Math.floor(T * 8); }
  else if (A.st === 'strike') { const q = clamp((T - (A.t - 0.5)) / 0.5, 0, 0.999); st = A.k === 'sweep' ? 'sweep' : 'slam'; f = A.k === 'sweep' ? Math.floor(q * 3) : (q < 0.4 ? 0 : 1); }
  else if (A.st === 'roar' || A.st === 'rise' || A.st === 'dead') { st = 'roar'; f = Math.floor(T * 6); }
  else if (e.kb != null && T - e.kb < 0.1) st = 'hurt';
  return { st, f, lane: A.k === 'slam' ? A.lane || 0 : 0 };
};
const oEnt = P16.entImg;
P16.entImg = function (e, T) {
  if (!e.fb) return oEnt.apply(this, arguments);
  const key = e.key || e.kind, a = M.TITAN.poseOf(e, T), tint = '';   // no white hit-flash on a giant: eight units hitting it would keep it white; numbers and sparks show the hits
  const fr = M.TITAN.frame(key, a.st, a.f, { lane: a.lane, tint, hot: e.ai && e.ai.phase === 2 }); e._fr = fr; return fr;
};
// ───────── the arenas: what the right of the field is made of ─────────
// Each arena is baked once at art resolution (one art pixel = 4 field pixels): a surface with a lit rim along the shore;
// what moves (bubbles, waves, glints, embers, turning gears) is drawn on top each frame. In the second phase the arena
// flares (heat). The near part of the arena is drawn again over the boss's waist, so it stands in it, not on it.
const TOPY = 164, BOTY = 744, AR = ART;
const h2 = (x, y, s) => { let n = (x * 374761393 + y * 668265263 + (s || 0) * 144665) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s), sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
const shore = (edge, y) => edge + 12 + 10 * Math.sin(y * 0.031) + 6 * Math.sin(y * 0.077 + 1.3);
// kind → { base(n, v, far, x, y) colour of one art pixel (n: noise 0..1, v: a second noise, far: 0 near … 1 at the horizon), rim: shore colours (outer → inner), glow }
const PAL_ = (a) => a;
const ARENAS = {
  lava:     { rim: ['#ffe070', '#ff9a2a', '#c8401a'], glow: '#ff6a1a', base: (n, v, far) => (Math.abs(n - 0.5) < 0.035 ? (far > 0.6 ? '#c84a18' : '#ffb03a') : Math.abs(n - 0.5) < 0.07 ? '#b8300e' : v > 0.62 ? '#3a120a' : v > 0.3 ? '#2a0c08' : '#1c0806') },
  molten:   { rim: ['#8a94a8', '#5a6680', '#323a4e'], glow: '#ffa040', base: (n, v, far) => (v > 0.7 ? '#fff0a0' : v > 0.52 ? '#ffc040' : v > 0.3 ? '#f47a1c' : '#c83a10') },
  sea:      { rim: ['#e8fbff', '#8ae0f4', '#34a0c4'], glow: '#5ad0ff', base: (n, v, far, x, y) => ((Math.sin(y * 0.18 + n * 6) > 0.86) ? '#34a0c4' : v > 0.6 ? '#16688e' : v > 0.3 ? '#0c3a5a' : '#082a44') },
  deep:     { rim: ['#8ae0f4', '#34a0c4', '#16688e'], glow: '#3ab0e0', base: (n, v, far, x, y) => ((Math.sin(y * 0.16 + n * 5) > 0.9) ? '#16688e' : v > 0.55 ? '#0c3a5a' : '#061a2a') },
  moonpool: { rim: ['#ffffff', '#b8d8ff', '#6a8ae0'], glow: '#a8c8ff', base: (n, v, far, x, y) => ((Math.sin(y * 0.2 + n * 5) > 0.88) ? '#98ccff' : v > 0.58 ? '#2a4aa0' : v > 0.28 ? '#18265e' : '#0e1848') },
  blood:    { rim: ['#e8e4dc', '#9aa4b0', '#5a6270'], glow: '#ff4a4a', base: (n, v, far, x, y) => ((Math.sin(y * 0.2 + n * 5) > 0.9) ? '#c01a24' : v > 0.55 ? '#720a14' : '#300408') },
  bloodriver: { rim: ['#ff8e6c', '#c01a24', '#720a14'], glow: '#ff3a3a', base: (n, v, far, x, y) => ((Math.sin(x * 0.05 + y * 0.12 + n * 4) > 0.8) ? '#dc4234' : v > 0.5 ? '#9a2026' : '#5c101a') },
  hive:     { rim: ['#b8f050', '#6ec820', '#3a7a10'], glow: '#9cff3a', base: (n, v) => (Math.abs(n - 0.5) < 0.05 ? '#6ec820' : v > 0.66 ? '#582a92' : v > 0.3 ? '#321458' : '#16082a') },
  reactor:  { rim: ['#ffcf4a', '#1a1a1a', '#ffcf4a'], glow: '#36e0d0', base: (n, v, far, x, y) => ((Math.round(x / 4) % 12 === 0 || Math.round(y / 4) % 8 === 0) ? (v > 0.5 ? '#36bca6' : '#187e74') : v > 0.5 ? '#141a2a' : '#0c101c') },
  roots:    { rim: ['#96a864', '#627c3e', '#40582a'], glow: '#d8ff70', base: (n, v) => (Math.abs(n - 0.5) < 0.06 ? '#6e4428' : Math.abs(n - 0.5) < 0.1 ? '#46291a' : v > 0.7 ? '#40582a' : '#1a1210') },
  thicket:  { rim: ['#a2e46c', '#56aa3c', '#2e7026'], glow: '#b8ff90', base: (n, v) => (Math.abs(n - 0.5) < 0.05 ? '#56aa3c' : Math.abs(n - 0.5) < 0.09 ? '#2e7026' : v > 0.72 ? '#c8f080' : '#0e1c0c') },
  grave:    { rim: ['#948a70', '#56503e', '#3a2a1e'], glow: '#b8f050', base: (n, v) => (v > 0.8 ? '#2e2418' : v > 0.4 ? '#1e160e' : '#140e08') },
  ruins:    { rim: ['#a6a2b5', '#6b6380', '#453e58'], glow: '#c8c0e0', base: (n, v) => (Math.abs(n - 0.5) < 0.04 ? '#1a1628' : v > 0.66 ? '#564e69' : v > 0.35 ? '#373149' : '#2b263b') },
  carousel: { rim: ['#fff2a8', '#f0c040', '#b8841e'], glow: '#ffcf4a', base: (n, v, far, x, y) => (Math.floor((x * 0.02 + y * 0.01)) % 2 ? '#b82248' : '#ece4cc') },
  stage:    { rim: ['#ffffff', '#dc4234', '#9a2026'], glow: '#ffd060', base: (n, v) => (v > 0.7 ? '#6e4428' : v > 0.35 ? '#46291a' : '#221408') },
  gears:    { rim: ['#ffcf4a', '#1a1a1a', '#ffcf4a'], glow: '#ffa040', base: (n, v, far, x, y) => (((Math.round(x / 4) + Math.round(y / 4)) % 6 === 0) ? '#3e3a48' : v > 0.5 ? '#26222e' : '#161320') },
  felt:     { rim: ['#fff2a8', '#b8841e', '#6e4210'], glow: '#ffe08a', base: (n, v) => (v > 0.75 ? '#2e7026' : v > 0.3 ? '#1a5a20' : '#12441a') },
  gold:     { rim: ['#fff2a8', '#f0c040', '#b8841e'], glow: '#ffcf4a', base: (n, v) => (v > 0.8 ? '#fff2a8' : v > 0.55 ? '#f0c040' : v > 0.25 ? '#b8841e' : '#6e4210') },
};
M.TITAN.ARENAS = ARENAS;
const acache = {};
function arenaBase(kind, edge) {
  const key = kind + ':' + edge; if (acache[key]) return acache[key];
  const A = ARENAS[kind] || ARENAS.lava, x0 = edge - 24, cw = Math.ceil((1980 - x0) / AR), ch = Math.ceil((BOTY - TOPY) / AR);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
  for (let j = 0; j < ch; j++) {
    const y = TOPY + j * AR, far = clamp(1 - (y - TOPY) / 300, 0, 1), sh = shore(edge, y);
    for (let i = 0; i < cw; i++) {
      const x = x0 + i * AR, d = (x - sh) / AR; if (d < 0) continue;
      const n = vn(x * 0.012, y * 0.02, 3), v = vn(x * 0.03 + 7, y * 0.05, 9) * 0.7 + h2(i, j, 5) * 0.3;
      g.fillStyle = d < 1 ? A.rim[0] : d < 2 ? A.rim[1] : d < 3.2 ? A.rim[2] : A.base(n, v, far, x, y); g.fillRect(i, j, 1, 1);
      if (far > 0 && d >= 3.2 && h2(i, j, 11) < far * 0.55) { g.fillStyle = 'rgba(12,8,24,0.55)'; g.fillRect(i, j, 1, 1); }   // haze towards the horizon
    }
  }
  // solid arenas: what sticks out of them
  const R2 = (i, j, w, h, col) => { g.fillStyle = col; g.fillRect(i, j, w, h); };
  const put = (fn) => { for (let k = 0; k < 18; k++) { const j = 6 + Math.floor(h2(k, 3, kind.length) * (ch - 12)), y = TOPY + j * AR, i0 = Math.ceil((shore(edge, y) - x0) / AR) + 6, i = i0 + Math.floor(h2(k, 7, kind.length) * (cw - i0 - 8)); if (i < cw - 4) fn(i, j, k); } };
  if (kind === 'grave') put((i, j, k) => { R2(i, j - 7, 5, 8, '#56503e'); R2(i, j - 7, 5, 1, '#948a70'); R2(i + 2, j - 6, 1, 4, '#1e160e'); R2(i + 1, j - 5, 3, 1, '#1e160e'); });
  if (kind === 'ruins') put((i, j, k) => { R2(i, j - 3, 6, 4, '#6b6380'); R2(i, j - 3, 6, 1, '#a6a2b5'); R2(i + 7, j - 1, 3, 2, '#564e69'); });
  if (kind === 'roots' || kind === 'thicket') for (let k = 0; k < 7; k++) { let px = 8 + h2(k, 1, 2) * (cw - 10), py = h2(k, 2, 2) * ch; const col = kind === 'roots' ? '#6e4428' : '#2e7026', hi = kind === 'roots' ? '#986436' : '#56aa3c'; for (let s2 = 0; s2 < 60; s2++) { px += Math.cos(k + s2 * 0.2) * 1.2; py += 0.9; if (py > ch) break; R2(Math.round(px), Math.round(py), 3, 2, col); R2(Math.round(px), Math.round(py), 3, 1, hi); if (kind === 'thicket' && s2 % 5 === 0) R2(Math.round(px) + 3, Math.round(py) - 1, 2, 1, '#c8f080'); } }
  if (kind === 'felt') put((i, j, k) => { if (k % 2) { for (let z = 0; z < 3; z++) { R2(i, j - z * 2, 5, 2, ['#ece4cc', '#b82248', '#f0c040'][k % 3]); R2(i, j - z * 2, 5, 1, '#ffffff'); } } else { R2(i, j - 6, 5, 7, '#ece4cc'); R2(i + 2, j - 4, 1, 2, '#b82248'); } });
  if (kind === 'gold') put((i, j, k) => { R2(i, j, 3, 1, '#ffffff'); R2(i + 1, j - 1, 1, 3, '#ffffff'); if (k % 4 === 0) { R2(i + 4, j + 1, 2, 2, ['#ff4a8a', '#4af0ff', '#9cff7a'][k % 3]); } });
  if (kind === 'stage') { for (let j = 0; j < ch; j++) { const y = TOPY + j * AR, i = Math.ceil((shore(edge, y) - x0) / AR); R2(i, j, 3, 1, Math.floor(j / 4) % 2 ? '#dc4234' : '#ffffff'); } }
  if (kind === 'reactor' || kind === 'gears') { for (let j = 0; j < ch; j++) { const y = TOPY + j * AR, i = Math.ceil((shore(edge, y) - x0) / AR); R2(i, j, 3, 1, Math.floor((j + i) / 3) % 2 ? '#ffcf4a' : '#1a1a1a'); } }
  const o = M.asPx ? M.asPx(c, AR) : c; o.x0 = x0; o.cw = cw; o.ch = ch; return (acache[key] = o);
}
// what moves on it, each frame
function arenaAnim(ctx, kind, edge, T, heat, yMin) {
  const A = ARENAS[kind] || ARENAS.lava, P = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x / AR) * AR, Math.round(y / AR) * AR, w, h); };
  const liquid = /lava|molten|sea|deep|moonpool|blood|bloodriver|hive/.test(kind);
  if (liquid) for (let k = 0; k < 26; k++) {
    const per = 1.6 + h2(k, 1, 4) * 2.2, ph = ((T + h2(k, 2, 4) * per) % per) / per, j = TOPY + 30 + h2(k, 3, Math.floor((T + h2(k, 2, 4) * per) / per)) * (BOTY - TOPY - 40), x = shore(edge, j) + 30 + h2(k, 4, Math.floor((T + h2(k, 2, 4) * per) / per)) * (1920 - edge - 20);
    if (j < (yMin || 0)) continue;
    if (/lava|molten|hive|blood/.test(kind)) { const r = ph < 0.8 ? 2 + ph * 6 : 6 * (1 - (ph - 0.8) / 0.2) + 2; ctx.globalAlpha = 1; P(x - r * 2, j - r, r * 4, r * 2, ph < 0.8 ? A.rim[1] : A.rim[0]); if (ph > 0.85) { P(x - 12, j - 16, 4, 4, A.rim[0]); P(x + 8, j - 20, 4, 4, A.rim[0]); } }
    else { ctx.globalAlpha = Math.sin(ph * Math.PI); P(x - 20, j, 40, AR, A.rim[1]); P(x - 8, j, 16, AR, A.rim[0]); ctx.globalAlpha = 1; }
  }
  if (kind === 'reactor') for (let k = 0; k < 8; k++) { const y = TOPY + 40 + k * 64, q = (T * 0.6 + k * 0.13) % 1; if (y < (yMin || 0)) continue; ctx.globalAlpha = 1 - q; P(shore(edge, y) + 20 + q * 380, y, 24, AR, '#98f6e0'); ctx.globalAlpha = 1; }
  if (kind === 'gears') for (let k = 0; k < 5; k++) { const cx = edge + 110 + (k % 3) * 150, cy = TOPY + 90 + k * 110, r = 44 + (k % 2) * 18; if (cy < (yMin || 0)) continue; const a0 = T * (k % 2 ? 0.8 : -0.8); for (let i = 0; i < 10; i++) { const a = a0 + i / 10 * Math.PI * 2; P(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.45, 12, 8, '#5e5a6a'); } ctx.fillStyle = '#3e3a48'; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; P(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8) * 0.45, 8, 4, '#3e3a48'); } }
  if (kind === 'carousel') for (let k = 0; k < 16; k++) { const a = T * 0.7 + k / 16 * Math.PI * 2, x = edge + 260 + Math.cos(a) * 220, y = 400 + Math.sin(a) * 200; if (y < (yMin || 0)) continue; P(x, y, 8, 8, Math.floor(T * 4 + k) % 2 ? '#fff2a8' : '#f0c040'); }
  if (kind === 'moonpool') { for (let j = TOPY + 20; j < BOTY; j += 8) { if (j < (yMin || 0)) continue; const w = 8 + Math.sin(j * 0.1 + T * 2) * 6; ctx.globalAlpha = 0.5; P(edge + 300 + Math.sin(j * 0.07 + T) * 10 - w, j, w * 2, AR, '#d8e8ff'); ctx.globalAlpha = 1; } }
  if (/grave|ruins/.test(kind)) for (let k = 0; k < 6; k++) { const q = (T * 0.08 + k / 6) % 1, x = edge + 20 + q * 460, y = TOPY + 60 + k * 90; if (y < (yMin || 0)) continue; ctx.globalAlpha = 0.18 * Math.sin(q * Math.PI); P(x, y, 120, 12, '#c8c0e0'); P(x + 30, y - 8, 80, 8, '#c8c0e0'); ctx.globalAlpha = 1; }
  if (heat > 0.01) { ctx.save(); ctx.globalAlpha = Math.min(0.35, heat * 0.35); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = A.glow; ctx.fillRect(edge, Math.max(TOPY, yMin || 0), 1920 - edge, BOTY - Math.max(TOPY, yMin || 0)); ctx.restore(); }
}
M.TITAN.arena = function (ctx, b, T) {
  const ar = b.arena, base = arenaBase(ar.kind, ar.edge); ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, base.x0, TOPY, base.cw * AR, base.ch * AR);
  const e = ar.boss, ph2 = e && e.ai && e.ai.phase === 2 ? 0.25 + 0.1 * Math.sin(T * 5) : 0;
  arenaAnim(ctx, ar.kind, ar.edge, T, Math.max(ar.heat || 0, ph2), 0);
  // a glow the boss throws on its arena
  if (e && M.pxGlow) M.pxGlow(ctx, e.x + (e.drawDX || 0), e.y, 260, (ARENAS[ar.kind] || ARENAS.lava).glow, 0.18 + ph2);
  ctx.restore();
};
// the near part again, over the boss's waist, with a ring where it stands in it
M.TITAN.lip = function (ctx, b, T) {
  const ar = b.arena, e = ar.boss; if (!e) return; const base = arenaBase(ar.kind, ar.edge), cx = e.x + (e.drawDX || 0), y0 = e.y + 2, x0 = cx - 260, x1 = cx + 300;
  const sy = Math.max(0, Math.floor((y0 - TOPY) / AR)), sx = Math.max(0, Math.floor((x0 - base.x0) / AR)), sw = Math.min(base.cw - sx, Math.ceil((x1 - x0) / AR)), sh2 = base.ch - sy; if (sw <= 0 || sh2 <= 0) return;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, BOTY - y0); ctx.clip();
  ctx.drawImage(base, sx, sy, sw, sh2, base.x0 + sx * AR, TOPY + sy * AR, sw * AR, sh2 * AR);
  arenaAnim(ctx, ar.kind, ar.edge, T, ar.heat || 0, y0);
  const A = ARENAS[ar.kind] || ARENAS.lava, dy = e.drawDY || 0, ring = (rx, ry, col) => M.P16.ellipse(ctx, cx, y0 + 4, rx, ry, col, true);
  if (dy < 300) { const w = 1 + 0.06 * Math.sin(T * 3); ctx.globalAlpha = 0.9; ring(150 * w, 20 * w, A.rim[0]); ctx.globalAlpha = 0.6; ring(170 * w, 26 * w, A.rim[1]); ctx.globalAlpha = 0.35; ring(196 + 10 * Math.sin(T * 2), 32, A.rim[1]); }
  ctx.restore();
};

// ───────── what rains in the second phase ─────────
// falling things come from the sky slightly behind (towards the boss); rising things (thorns, hands, water) crack the
// ground first and burst out on the hit
const ERUPT = new Set(['thorn', 'hand', 'spout']);
M.TITAN.drop = function (ctx, kind, x, y, q, T) {
  const P = (px, py, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(px / AR) * AR, Math.round(py / AR) * AR, w, h); };
  if (ERUPT.has(kind)) { const n = Math.floor(q * 6); ctx.globalAlpha = 0.9; for (let i = 0; i < n; i++) { const a = i * 1.05 + 0.3; P(x + Math.cos(a) * (10 + q * 50), y + Math.sin(a) * (6 + q * 24), 8, 4, kind === 'spout' ? '#8ae0f4' : kind === 'thorn' ? '#56aa3c' : '#b8c888'); } ctx.globalAlpha = 1; return; }
  const k = 1 - q, fx = x + k * 220, fy = y - k * 760, trail = (col, n, w) => { for (let i = 1; i <= n; i++) { ctx.globalAlpha = 0.7 - i * (0.6 / n); P(fx + i * 12 * 0.29, fy - i * 12, w, w, col); } ctx.globalAlpha = 1; };
  switch (kind) {
    case 'meteor': trail('#ff9a2a', 10, 16); P(fx - 18, fy - 18, 36, 36, '#5a1406'); P(fx - 14, fy - 14, 28, 28, '#c83a10'); P(fx - 10, fy - 14, 16, 12, '#ffc040'); P(fx - 6, fy - 12, 8, 6, '#fff6b0'); break;
    case 'bell': P(fx - 20, fy - 30, 40, 8, '#946224'); P(fx - 26, fy - 22, 52, 26, '#c89640'); P(fx - 30, fy + 4, 60, 8, '#946224'); P(fx - 18, fy - 18, 12, 14, '#ecd08a'); P(fx - 4, fy + 12, 8, 8, '#5a3a14'); break;
    case 'fruit': trail('#fff098', 6, 8); P(fx - 14, fy - 12, 28, 26, '#f0cc40'); P(fx - 10, fy - 10, 10, 8, '#fff098'); P(fx - 2, fy - 20, 4, 8, '#46291a'); P(fx + 2, fy - 20, 10, 6, '#56aa3c'); break;
    case 'star': for (let i = 0; i < 8; i++) P(fx - 4 + i * 3, fy - 60 - i * 26, 8, 26, i ? '#98ccff' : '#ffffff'); P(fx - 10, fy - 10, 20, 20, '#ffffff'); break;
    case 'horse': P(fx - 2, fy - 90, 6, 110, '#f0c040'); P(fx - 30, fy - 30, 50, 22, '#ece4cc'); P(fx + 14, fy - 48, 16, 26, '#ece4cc'); P(fx - 24, fy - 8, 6, 22, '#ece4cc'); P(fx + 8, fy - 8, 6, 22, '#ece4cc'); P(fx - 26, fy - 26, 40, 6, '#b82248'); break;
    case 'pin': { const a = T * 18; ctx.save(); ctx.translate(fx, fy); ctx.rotate(a); P(-6, -30, 12, 44, '#ffffff'); P(-8, 8, 16, 14, '#dc4234'); P(-4, -30, 8, 8, '#dc4234'); ctx.restore(); break; }
    case 'cannon': trail('#8a8698', 8, 12); P(fx - 18, fy - 18, 36, 36, '#150d1e'); P(fx - 12, fy - 14, 10, 8, '#5e5a6a'); break;
    case 'drop': trail('#ffc040', 6, 10); P(fx - 12, fy - 10, 24, 26, '#f47a1c'); P(fx - 6, fy - 26, 12, 16, '#ffc040'); P(fx - 6, fy - 6, 8, 8, '#fff6b0'); break;
    case 'beam': { ctx.save(); ctx.translate(fx, fy); ctx.rotate(0.3 + T * 2); P(-80, -10, 160, 20, '#5a6680'); P(-80, -10, 160, 4, '#909cb4'); P(-80, -14, 12, 28, '#323a4e'); P(68, -14, 12, 28, '#323a4e'); ctx.restore(); break; }
    case 'needle': case 'scalpel': P(fx - 3, fy - 120, 6, 110, kind === 'needle' ? '#d4dbe6' : '#909cb4'); P(fx - 10, fy - 150, 20, 34, kind === 'needle' ? '#ff4a4a' : '#40324f'); P(fx - 1, fy - 12, 2, 12, '#ffffff'); break;
    case 'laser': { const w = 6 + q * 30; ctx.globalAlpha = 0.5 + q * 0.5; P(x - w / 2, TOPY - 200, w, y - TOPY + 200, '#ff4a4a'); P(x - w / 6, TOPY - 200, w / 3, y - TOPY + 200, '#ffffff'); ctx.globalAlpha = 1; break; }
    case 'acid': trail('#6ec820', 6, 10); P(fx - 16, fy - 14, 32, 28, '#3a7a10'); P(fx - 10, fy - 10, 14, 10, '#b8f050'); P(fx + 6, fy + 12, 6, 10, '#6ec820'); break;
    case 'chain': for (let i = 0; i < 10; i++) P(fx - 6 + (i % 2) * 2, fy - 20 - i * 18, 12, 16, i % 2 ? '#5e5a6a' : '#8a8698'); P(fx - 16, fy - 14, 32, 22, '#3e3a48'); break;
    case 'skull': trail('#ff9a2a', 8, 12); P(fx - 16, fy - 18, 32, 28, '#cfc4a2'); P(fx - 10, fy - 10, 8, 8, '#150d1e'); P(fx + 2, fy - 10, 8, 8, '#150d1e'); P(fx - 8, fy - 8, 4, 4, '#ffc040'); P(fx + 4, fy - 8, 4, 4, '#ffc040'); break;
    case 'card': { ctx.save(); ctx.translate(fx, fy); ctx.rotate(T * 10); P(-18, -26, 36, 52, '#ffffff'); P(-6, -8, 12, 14, '#dc4234'); ctx.restore(); break; }
    case 'coin': { const w = Math.abs(Math.cos(T * 14)) * 30 + 6; trail('#fff2a8', 5, 8); P(fx - w / 2, fy - 16, w, 32, '#f0c040'); P(fx - w / 2, fy - 16, w, 6, '#fff2a8'); break; }
    default: trail('#ffc040', 8, 12); P(fx - 14, fy - 14, 28, 28, '#c83a10');
  }
};
// the hit: bursts in the boss's colours; rising things burst out of the ground
M.TITAN.impact = function (b, e, what, x, y) {
  const L = e.fb || {}, Pz = b.p16 || (M.P16.Pool && (b.p16 = new M.P16.Pool())), ramp = { lava: 'fire', molten: 'orange', sea: 'sea', deep: 'sea', moonpool: 'frost', blood: 'blood', bloodriver: 'blood', hive: 'toxic', reactor: 'teal', roots: 'wood', thicket: 'green', grave: 'bone', ruins: 'cream', carousel: 'gold', stage: 'red', gears: 'brass', felt: 'gold', gold: 'gold' }[L.arena] || 'fire';
  if (!Pz) return;
  const n = what === 'die' ? 90 : what === 'slam' ? 60 : what === 'roar' ? 50 : 28;
  for (let i = 0; i < n; i++) { const a = -Math.PI * Math.random(), v = 260 + Math.random() * (what === 'die' ? 900 : 620); Pz.add(1, x + (Math.random() - 0.5) * 60, y - 10, Math.cos(a) * v, Math.sin(a) * v, 0.5 + Math.random() * 0.6, ramp, { sz: Math.random() < 0.3 ? 3 : 2 }); }
  if (what === 'rain' && ERUPT.has(L.rain)) b.fxp({ k: 'fberupt', kind: L.rain, x, y, life: 0.7 });
  if (what === 'die') for (let i = 0; i < 6; i++) b.later(0.2 + i * 0.3, () => { b.fxp({ k: 'boom', x: x + (Math.random() - 0.5) * 300, y: y + (Math.random() - 0.5) * 200, life: 0.5, col: (ARENAS[L.arena] || ARENAS.lava).glow }); b.shake = Math.max(b.shake, 20); M.Sfx.boom && M.Sfx.boom(); });
};
const oFxT = M.drawFxPx;
M.drawFxPx = function (ctx, f, T, b) {
  if (f.k === 'fberupt') {
    const q = (T - f.t0) / f.life; if (q >= 1) return true; const h = Math.sin(Math.min(1, q * 2.2) * Math.PI / 2) * (1 - Math.max(0, q - 0.6) / 0.4), P = (px, py, w, hh, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(px / AR) * AR, Math.round(py / AR) * AR, w, hh); };
    for (let i = 0; i < 7; i++) { const ox = (i - 3) * 26, ht = (120 + (i % 3) * 40) * h, x = f.x + ox, y = f.y + (i % 2) * 10;
      if (f.kind === 'thorn') { for (let k = 0; k < ht; k += 8) P(x - Math.max(2, 10 - k / 14), y - k, Math.max(4, 20 - k / 7), 8, k > ht - 16 ? '#a2e46c' : '#2e7026'); }
      else if (f.kind === 'hand') { P(x - 6, y - ht, 12, ht, '#56683a'); P(x - 12, y - ht - 14, 24, 16, '#849a5a'); for (let k = 0; k < 4; k++) P(x - 12 + k * 7, y - ht - 26, 4, 12, '#849a5a'); }
      else { ctx.globalAlpha = 0.85; P(x - 12, y - ht * 1.4, 24, ht * 1.4, '#8ae0f4'); P(x - 4, y - ht * 1.4, 8, ht * 1.4, '#ffffff'); ctx.globalAlpha = 1; } }
    return true;
  }
  return oFxT ? oFxT.apply(this, arguments) : false;
};
})();
