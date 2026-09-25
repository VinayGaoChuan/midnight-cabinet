// 非人形部件库演示（不是正式角色）：view.html?c=_beast-demo&v=0..13，用 parts-beast.js 的五种骨架拼出不同生物。
// 每个变体只写：形体参数 o、材质 mats、元素、攻击 / 技能的关键姿势、待机个性；六个状态的通用动作（呼吸、步态、受击、死亡）来自骨架的 anim。
// 技能都是简单示例（积木 + 少量专属画面），正式角色照这个结构写自己的技能。
PCD.define('_beast-demo', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_TRAIL,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow } = E;
  const B = E.parts.beast, R = Math.round;

  // ───── 变体：骨架 + 形体 + 材质 + 元素 + 攻击 / 技能关键姿势 ─────
  // pose：wind 预兆 · hit 出手（定格 1 帧）· hold 延续 · chg 蓄力 · cast 施放 · pers 待机个性（1.6–2.0 s）；没写的字段 = 站姿默认值
  // atk 攻击方式：melee 近身（命中在出手帧）| shot 弹道 | beam 光束；sk 技能（下面 skillCast 里的分支）
  const VARS = [
    { name: '灰狼', rig: 'quad', HX: 70, dir: -1, el: 'frost', atk: 'melee', sk: 'howl',
      o: { len: 12, chest: 4.5, rump: 3.8, waist: 0.35, leg: 7, lw: 2, thigh: 2.2, neck: 3, neckA: 0.55, neckW: 2.5, head: 'canine', headA: 0.12, tail: 'bushy', tailLen: 8, tailA: -0.9, tailW: 4, mane: 'ruff', maneLen: 1, foot: 'paw' },
      mats: { main: [27, 28, 59, 60], mane: [28, 59, 60, 17], tip: 'pale', eye: [0, 0, 22, 21] },
      pose: { wind: { crouch: 1, head: 1, ear: 1, tail: 1, bx: -1 }, hit: { bx: 5, reach: 2, jaw: 3, pitch: 1, tail: -2 }, hold: { bx: 4, reach: 1, jaw: 1 },
        chg: { head: -2, pitch: 2, jaw: 2, eyes: 1, tail: -1, mane: 1, glow: 1 }, cast: { head: -2, pitch: 3, jaw: 3, eyes: 1, mane: 1, glow: 2 }, pers: { head: -1, ear: 1, jaw: 1, tail: 2 } } },
    { name: '棕熊', rig: 'quad', HX: 68, dir: -1, el: 'earth', atk: 'melee', sk: 'slam',
      o: { len: 13, chest: 6, rump: 5.5, waist: 0.1, hump: 2, leg: 5, lw: 3, thigh: 3, stride: 2, neck: 2, neckA: 0.15, neckW: 3.5, head: 'bear', headA: 0.1, tail: 'stub', foot: 'pad' },
      mats: { main: 'leather', muz: 'sand', claw: 'bone' },
      pose: { wind: { pitch: 4, paw: 3, jaw: 1, head: -1 }, hit: { reach: 3, bx: 4, jaw: 2, head: 1 }, hold: { reach: 2, bx: 3, jaw: 1 },
        chg: { pitch: 6, paw: 2, jaw: 3, head: -2, glow: 1 }, cast: { pitch: -1, crouch: 2, reach: 3, bx: 3, jaw: 2, head: 2 }, pers: { head: 1, jaw: 1, ear: 1 } } },
    // 野猪：前重后轻的楔形（大肩峰 + 小臀 + 收腹 + 低头、吻部收尖），不要方块
    { name: '獠牙野猪', rig: 'quad', HX: 58, dir: -1, el: 'steel', atk: 'melee', sk: 'charge',
      o: { len: 11, chest: 5.5, rump: 3.6, waist: 0.3, hump: 2.5, leg: 4, lw: 2, thigh: 2, stride: 2, neck: 1.5, neckA: -0.05, neckW: 3.5, head: { type: 'boar', h: 5, snout: 5, tip: 0.75 }, headA: 0.5, tail: 'thin', tailLen: 4, tailA: 0.3, tailCurl: 3, mane: 'ridge', maneLen: 3, foot: 'hoof' },
      mats: { main: [0, 27, 28, 29], mane: [0, 7, 6, 5], nose: 'pink', claw: 'iron', eye: [0, 0, 57, 58] },
      pose: { wind: { head: 2, crouch: 1, bx: -2, ear: 1 }, hit: { head: 3, bx: 6, pitch: -1, jaw: 1, tail: 2 }, hold: { head: 2, bx: 5 },
        chg: { head: 3, crouch: 2, bx: -3, ear: 1, mane: 1, glow: 1 }, cast: { head: 3, crouch: 1, bx: 18, pitch: -1, jaw: 1, mane: 1, ear: 1 }, pers: { paw: 1, head: 2 } } },
    // 马：默认马头（够大加面部细节）自带蓬鬃 + 额鬃
    { name: '汗血马', rig: 'quad', HX: 66, dir: -1, el: 'holy', atk: 'melee', sk: 'stomp',
      o: { len: 13, chest: 4.5, rump: 4.5, waist: 0.3, leg: 11, lw: 2, thigh: 2.6, stride: 3, lift: 3, neck: 7, neckA: 1.0, neckW: 2.2, head: 'horse', headA: 0.7, tail: 'horse', tailLen: 9, tailA: -1.0, foot: 'hoof', fur: 0 },
      mats: { main: [11, 44, 45, 46], mane: 'boot', claw: 'iron' },
      pose: { wind: { pitch: 4, head: -2, jaw: 1, reach: 1, ear: 1 }, hit: { bx: 4, reach: 3, head: 1, tail: -2 }, hold: { bx: 3, reach: 1, head: 1 },
        chg: { pitch: 6, head: -2, jaw: 1, paw: 2, reach: 1, glow: 1, tail: 2, mane: 1 }, cast: { pitch: -1, crouch: 2, bx: 3, reach: 3, head: 2, mane: -1 }, pers: { head: 3, tail: -2, ear: 1 } } },
    { name: '赤龙', rig: 'quad', HX: 40, dir: 1, el: 'fire', atk: 'shot', sk: 'breath',
      o: { len: 13, chest: 5, rump: 4.5, waist: 0.2, hump: 1, leg: 6, lw: 2, thigh: 2.8, neck: 5, neckA: 0.75, neckW: 2.4, head: 'dragon', headA: 0.05, tail: 'long', tailLen: 12, tailA: -0.35, tailW: 3.5, tailCurl: 0.4, tailSpikes: 1, spade: 1, mane: 'ridge', maneLen: 1, foot: 'claw', fur: 0, pattern: 'scales', wing: { span: 14, chord: 6, type: 'membrane', fingers: 3 } },
      mats: { main: 'crimson', belly: 'sand', wing: 'blood', bone: 'crimson', mane: 'bone', eye: [0, 0, 47, 51], glow: 'fire' },
      pose: { wind: { head: -1, jaw: 1, wing: 4, pitch: 1, glow: 1 }, hit: { head: 1, jaw: 3, wing: 5, glow: 2, bx: 1 }, hold: { head: 1, jaw: 1, wing: 4 },
        chg: { head: -2, jaw: 1, wing: 5, pitch: 2, glow: 2 }, cast: { head: 1, jaw: 3, wing: 1, pitch: 1, glow: 3, bx: 1 }, pers: { wing: 4, head: -1 } } },
    { name: '雷鹰', rig: 'fly', HX: 60, dir: -1, el: 'bolt', atk: 'melee', sk: 'gust',
      o: { alt: 14, rx: 4.5, ry: 3, head: 'bird', hr: 2.5, beak: 3, beakH: 2, hook: 1, crest: 'tuft', tail: 'fan', tailLen: 5, wing: { span: 14, chord: 5, type: 'feather', fingers: 3 }, legLen: 3 },
      mats: { main: 'wood', head: 'white', crest: 'white', belly: 'leather', feather: 'wood', beak: 'gold', leg: 'gold', eye: [0, 0, 14, 51] },
      pose: { wind: { pitch: -2, wing: 1, lift: 3, legs: 1, head: -1 }, hit: { pitch: 3, wing: 3, bx: 11, legs: 2, jaw: 1 }, hold: { pitch: 2, wing: 4, bx: 10, legs: 2 },
        chg: { wing: 5, pitch: -1, lift: 4, head: -1, glow: 2, jaw: 1 }, cast: { wing: 3, pitch: 1, lift: 2, jaw: 2, glow: 3 }, pers: { wing: 5, head: -1 } } },
    // 蝙蝠：浅棕毛身 + 浅色胸腹 和 深酒红膜翼拉开明暗，翼根贴背短（chord 3），身体才读得出来
    { name: '吸血蝠', rig: 'fly', HX: 64, dir: -1, el: 'blood', atk: 'melee', sk: 'screech',
      o: { alt: 17, rx: 4.5, ry: 4, head: 'bat', hr: 3, earH: 5, tail: 'none', wing: { span: 16, chord: 3, type: 'membrane', fingers: 3 }, legLen: 2, talon: 1 },
      mats: { main: 'leather', belly: 'sand', wing: [52, 11, 12, 13], bone: [11, 12, 13, 26], inner: 'pink', eye: [0, 0, 57, 58], glow: 'blood' },
      pose: { wind: { wing: 1, pitch: -1, jaw: 1, lift: 2 }, hit: { wing: 3, pitch: 2, jaw: 2, bx: 9, legs: 2 }, hold: { wing: 4, bx: 8, jaw: 1 },
        chg: { wing: 0, glow: 2, lift: 3, head: 1 }, cast: { wing: 5, jaw: 2, glow: 3, lift: 1, pitch: -1 }, pers: { wing: 0, head: 1 } } },
    // 蜘蛛：腿全画在身体后（legsFront 0）、腿比腹亮一级（mats.limb）、fan 1 让腿分成前后两组拱，1 倍大小也读得出腹和腿
    { name: '魂蛛', rig: 'bug', HX: 72, dir: -1, el: 'magic', atk: 'melee', sk: 'web',
      o: { n: 4, rx: 3.5, ry: 2.8, under: 4, abd: { rx: 5.5, ry: 4.5, dx: -7, dy: -2 }, head: { rx: 2, ry: 1.8 }, span: 13, knee: 3, fan: 1, kneeOut: 0.55, farDx: 2, lw: 1, eyes: 4, fangs: 1, mark: 'hourglass', legsFront: 0 },
      mats: { main: [0, 53, 54, 43], limb: [0, 42, 24, 43], mark: [0, 0, 22, 21], eye: [0, 0, 57, 58], glow: 'blood', claw: 'bone' },
      pose: { wind: { pitch: 2, jaw: 2, bx: -1 }, hit: { bx: 5, crouch: 1 }, hold: { bx: 4, jaw: 1, crouch: 1 },
        chg: { pitch: 3, lift: 1, jaw: 2, glow: 2 }, cast: { pitch: 1, crouch: 2, jaw: 1, glow: 3, bx: -1 }, pers: { jaw: 2, pitch: 1 } } },
    { name: '钳蟹', rig: 'bug', HX: 70, dir: -1, el: 'water', atk: 'melee', sk: 'bubble',
      o: { n: 4, rx: 6, ry: 3.5, under: 3, abd: null, head: null, span: 10, knee: -1, lw: 1, eyes: 0, stalks: 3, fangs: 0, claws: { len: 6, size: 3 }, hair: 0, legsFront: 0 },
      mats: { main: 'fire', shell: 'fire', eye: [0, 0, 0, 0], glow: [0, 0, 22, 21] },
      pose: { wind: { claw: 3, pitch: 1, bx: -1 }, hit: { bx: 5, crouch: 1 }, hold: { claw: 1, bx: 4 },
        chg: { claw: 2, jaw: 2, pitch: 2, glow: 2 }, cast: { claw: 3, jaw: 2, pitch: 1, glow: 3 }, pers: { claw: 2 } } },
    { name: '毒尾蝎', rig: 'bug', HX: 70, dir: -1, el: 'poison', atk: 'melee', sk: 'venom',
      o: { n: 4, rx: 3.5, ry: 2.5, under: 2, abd: { rx: 5, ry: 2.8, dx: -6, dy: 0 }, head: null, span: 9, knee: 0, lw: 1, eyes: 2, fangs: 0, claws: { len: 5, size: 2.5 }, tail: { n: 6, seg: 2.3, r: 1.5 }, mark: 'bands', hair: 0, legsFront: 0 },
      mats: { main: 'sand', shell: 'sand', mark: [48, 49, 50, 38], glow: 'poison', eye: [0, 0, 0, 0] },
      pose: { wind: { tail: 1, crouch: 1, claw: 2, bx: -1 }, hit: { tail: 4, bx: 3, claw: 1 }, hold: { tail: 3, bx: 3, claw: 1 },
        chg: { tail: 1, crouch: 1, claw: 3, glow: 2, pitch: 1 }, cast: { tail: 4, bx: 4, claw: 2, glow: 3 }, pers: { tail: 1, claw: 1 } } },
    { name: '深渊之眼', rig: 'blob', HX: 36, dir: 1, el: 'curse', atk: 'beam', sk: 'curse',
      o: { r: 7, alt: 8, shape: 'orb', eye: { n: 1, r: 4.5 }, tent: { n: 5, len: 9 }, spikes: 3 },
      mats: { main: 'blue', sclera: 'white', iris: [52, 42, 24, 43], glow: [42, 43, 21, 21], horn: 'bone' },
      pose: { wind: { lid: 1, pup: 0, bx: -1, tmode: 2 }, hit: { pup: 0, glow: 3, bx: 1, tmode: 1 }, hold: { pup: 0, glow: 1 },
        chg: { pup: 2, tmode: 5, glow: 2, sq: -1, lift: 2 }, cast: { pup: 0, tmode: 5, glow: 3, sq: 1, bx: -1 }, pers: { lid: 4, ix: -2, iy: 2 } } },
    { name: '酸液蜗牛', rig: 'blob', HX: 36, dir: 1, el: 'nature', atk: 'shot', sk: 'wave',
      o: { r: 5, alt: 0, shape: 'slug', eye: { n: 1, r: 1 }, tent: null, shell: 5, stalk: 3 },
      mats: { main: 'green', shell: 'leather', eye: [0, 0, 14, 5], glow: 'poison' },
      pose: { wind: { sq: -2, bx: -1 }, hit: { sq: 2, bx: 1, glow: 1 }, hold: { sq: 1 }, chg: { sq: 2, glow: 2 }, cast: { sq: -2, glow: 3, bx: 1 }, pers: { sq: 1 } } },
    { name: '眼镜蛇', rig: 'serpent', HX: 66, dir: -1, el: 'poison', atk: 'melee', sk: 'spit',
      o: { n: 22, r: 2.2, rTail: 0.5, arch: 2, waves: 1.3, rise: 9, neck: 4, head: 'snake', hl: 6, hh: 3.5, hood: 3, scales: 1, belly: 1 },
      mats: { main: 'green', belly: 'sand', mark: [48, 49, 50, 38], tongue: [55, 57, 57, 58] },
      pose: { wind: { rise: 3, jaw: 1, hood: 2, bx: -1 }, hit: { rise: -3, strike: 6, jaw: 3, hood: 1, bx: 2 }, hold: { rise: -2, strike: 5, jaw: 1 },
        chg: { rise: 4, hood: 2, jaw: 1, glow: 2, tongue: 2 }, cast: { rise: 2, strike: 3, jaw: 3, hood: 2, glow: 3 }, pers: { hood: 2, tongue: 2 } } },
    { name: '赤蠕虫', rig: 'serpent', HX: 62, dir: -1, el: 'earth', atk: 'melee', sk: 'quake',
      o: { n: 26, r: 3.5, rTail: 1.2, arch: 3, waves: 1.2, rise: 5, neck: 3, head: 'worm', hl: 5, hh: 6, bands: 3, scales: 0, belly: 1 },
      mats: { main: 'blood', belly: 'pink', teeth: 'bone', glow: 'fire' },
      pose: { wind: { rise: 2, jaw: 1, bx: -1 }, hit: { rise: -2, strike: 6, jaw: 3, bx: 3 }, hold: { rise: -1, strike: 5, jaw: 1, bx: 3 },
        chg: { rise: 6, jaw: 3, glow: 2 }, cast: { rise: -6, strike: 3, jaw: 1, glow: 1, bx: 2 }, pers: { jaw: 2, rise: 1 } } },
  ];
  const vq = +(new URLSearchParams(location.search).get('v') || 0);
  const V = VARS[Math.max(0, Math.min(VARS.length - 1, vq | 0))];
  const K = B[V.rig], m = B.mats(E, V.mats), o = K.shape(Object.assign({ m }, V.o));
  const R_EL = FXI[V.el], EL = FXR[R_EL], HX = V.HX, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(104, 70, 52, 64);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'teeth', 'spec', 'iris', 'claw', 'horn', 'mark', 'beak', 'sclera', 'tongue', 'nose']) if (m[k] != null) RIM.skip[m[k]] = 1;
  const SPEC = K.KEYS.concat(B.COMMON);
  const P = {}; K.reset(P);
  const BASE = Object.assign({}, P), HIT_POINT = K.rig(P, o).hit;                        // 站姿默认值（关键姿势里没写的字段）
  const DISCRETE = { gf: 1, wing: 1, lie: 1, eyes: 1, ear: 1, tmode: 1, pup: 1, legs: 1, tongue: 1, glow: 1 };
  const FIELDS = [...new Set(Object.values(V.pose).flatMap((p) => Object.keys(p)))];
  const PS = {}; for (const k of Object.keys(V.pose)) PS[k] = Object.assign({}, BASE, V.pose[k]);
  const REST = Object.assign({}, BASE); if (V.rig === 'fly') REST.wing = -1;   // 飞行：回到站姿 = 继续扑翼（-1 在下面换成 gf）
  const T_HIT = 2 / 12, ALT = o.alt || 0, FLYER = V.rig === 'fly' || (V.rig === 'blob' && ALT > 0), GROUND = V.rig === 'blob' && !ALT;
  function mixPose(A, Bp, q) { for (const f of FIELDS) P[f] = DISCRETE[f] ? (q < 0.5 ? A[f] : Bp[f]) : R(A[f] + (Bp[f] - A[f]) * q); }
  let rig = null;

  function idle(tq, f12) {
    const lp = K.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.6 && lp < 2.0) { for (const f of Object.keys(V.pose.pers)) P[f] = V.pose.pers[f]; if (V.rig === 'fly' && V.pose.pers.wing != null) P.gf = -1; }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    K.reset(P);
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { K.anim.walk(P, tq, GROUND); const w = walkDemo(tq, 14, V.dir); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) {
      if (tq < 0.12) mixPose(REST, PS.wind, ease.out(tq / 0.12));
      else if (tq < 0.25) mixPose(PS.hit, PS.hit, 0);
      else if (tq < 0.45) mixPose(PS.hit, PS.hold, ease.out((tq - 0.25) / 0.2));
      else mixPose(PS.hold, REST, ease.inOut(clamp01((tq - 0.45) / 0.3)));
      if (tq >= 0.12 && tq < 0.25) P.rim = 1;
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); mixPose(REST, PS.chg, q); P.rim = 2;
      if (tq > 0.45 && (f12 & 1) && P.glow > 0) P.glow = Math.max(1, P.glow - 1);                   // 蓄满后发光体逐帧闪
      if (V.sk === 'charge' && tq > 0.7) { P.paw = (f12 >> 1) & 1; }                                   // 野猪刨地
      if (V.sk === 'stomp' && tq > 0.7) { P.paw = 1 + ((f12 >> 1) & 1); }                             // 马前蹄蹬空
    } else if (st === CAST) {
      mixPose(PS.chg, PS.cast, ease.out(clamp01(tq / 0.12))); P.rim = 3;
      if (V.sk === 'charge') P.gf = f12 & 3;                                                          // 冲撞：边跑边冲
    } else if (st === RECOVER) { const q = ease.inOut(clamp01(tq / 0.6)); mixPose(PS.cast, REST, q); P.rim = q < 0.5 ? 2 : q < 0.8 ? 1 : 0; if (P.glow > 0 && q > 0.5) P.glow = 0; }
    else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else K.anim.hurt(P, h); }
    else if (st === DEATH) { const d = tq - INCOMING; if (d < 0) idle(tq, f12); else if (V.rig === 'fly' || V.rig === 'blob') K.anim.death(P, d, f12, ALT); else K.anim.death(P, d, f12); }   // 飞行 / 漂浮多一个离地高参数（最后一个参数是掉落物钩子，这里没有掉落物）
    else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    if (V.rig === 'fly' && P.wing < 0) { P.wing = 0; P.gf = (f12 >> 1) & 3; }
    rig = K.rig(P, o);
    const fp = V.rig === 'blob' ? [rig.eye[0], rig.eye[1]] : V.sk === 'venom' && rig.tail ? [rig.tail.pts[rig.tail.pts.length - 2], rig.tail.pts[rig.tail.pts.length - 1]] : rig.mouth;
    P.gx = R(fp[0]) + P.bx; P.gy = R(fp[1]);
    B.key(P, SPEC);
  }
  function drawHero() { begin(hero, P.bx, 0); K.draw(E, rig, P, o); }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const T_CAST = [0.1, 0.2, 0.3];
  let chargeAcc = 0, trailAcc = 0, soulAcc = 0, lastGf = -9, smT = 9, smX = 0, smY = 0, breathT = 9;
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  const tx = DUMMY_X - 4, ty = HY - 15;
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = mouthScr();
      releaseOrbit(40, 90, 0.3, 0.6); burst(gx, gy, 18, 50, 120, 0.3, 0.6, R_EL, 8); ring(gx, gy, 1, R_EL); shake(0.28, 2); flash(0.05);
      if (V.sk === 'howl') { ring(gx, gy, 1, R_EL); }
      else if (V.sk === 'slam') { const x = scrX(o.len / 2 + 8); fx.crack(x, FLOOR, 22, 1, R_EL, 0.9); fx.wave(x, FLOOR - 1, 1, DUMMY_X - x, 6, R_EL, 0.5); for (let i = 0; i < 14; i++) spawn(K_DUST, x + Math.random() * 10, FLOOR - 1, (Math.random() - 0.3) * 50, -10 - Math.random() * 20, 0.4 + Math.random() * 0.3, FXI.dust); }
      else if (V.sk === 'stomp') { const x = scrX(o.len / 2 + 6); fx.wave(x, FLOOR - 1, 1, DUMMY_X - x, 7, R_EL, 0.55); fx.crack(x, FLOOR, 10, 1, R_EL, 0.7); }
      else if (V.sk === 'breath') { breathT = 0; fx.beam(gx + 2, gy, tx, ty, 2, R_EL, 0.45, 2); }
      else if (V.sk === 'gust') { for (let k = 0; k < 3; k++) shoot(2, gx + 2, gy - 4 + k * 4, 150 + k * 20, tx, R_EL); }
      else if (V.sk === 'screech') { ring(gx + 2, gy, 0, R_EL); }
      else if (V.sk === 'web') shoot(2, gx + 2, gy, 130, tx, R_EL);
      else if (V.sk === 'bubble') for (let k = 0; k < 3; k++) shoot(k === 1 ? 2 : 1, gx + 2, gy - k * 2, 90 + k * 25, tx, R_EL, -8 + k * 6);
      else if (V.sk === 'curse') fx.beam(gx + 3, gy, tx, ty, 2, R_EL, 0.4, 2);
      else if (V.sk === 'wave') { const x = scrX(8); fx.wave(x, FLOOR - 1, 1, DUMMY_X - x + 2, 6, R_EL, 0.6); }
      else if (V.sk === 'spit') shoot(2, gx + 2, gy, 150, tx, R_EL, -10);
      else if (V.sk === 'quake') { const x = scrX(14); fx.crack(x, FLOOR, 24, 1, R_EL, 1.0); fx.wave(x, FLOOR - 1, 1, DUMMY_X - x, 8, R_EL, 0.55); for (let i = 0; i < 16; i++) spawn(K_DUST, x + Math.random() * 12, FLOOR - 1, (Math.random() - 0.2) * 50, -10 - Math.random() * 24, 0.4 + Math.random() * 0.4, FXI.dust); }
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [gx, gy] = mouthScr();
      if (V.atk === 'melee') { smT = 0; smX = gx; smY = gy; burst(tx + 1, ty, 10, 40, 90, 0.15, 0.35, FXI.impact, 10); burst(tx, ty, 6, 30, 70, 0.2, 0.4, R_EL, 6); hitDummy(0, 1); }
      else if (V.atk === 'shot') { shoot(1, gx + 2, gy, 170, tx, R_EL); burst(gx, gy, 6, 30, 60, 0.15, 0.3, R_EL, 0); }
      else { fx.beam(gx + 2, gy, tx, ty, 1, R_EL, 0.17, 2); burst(tx, ty, 10, 40, 90, 0.15, 0.35, R_EL, 10); hitDummy(0, 1); }
    }
    if (s === CAST && t === T_CAST[0]) {
      const big = () => { burst(tx, ty, 30, 60, 140, 0.3, 0.7, R_EL, 14); ring(tx, ty, 1, R_EL); hitDummy(1, 1); shake(0.12, 1); };
      if (V.sk === 'howl') { big(); dummyFx({ dur: 1.3, tint: R_EL, slow: 0.5 }); }
      else if (V.sk === 'slam' || V.sk === 'stomp' || V.sk === 'quake') { big(); if (V.sk === 'stomp') fx.pillar(DUMMY_X, HY - 44, HY, 3, R_EL, 0.5, 2); dummyFx({ dur: 1.0, sink: V.sk === 'quake' ? 2 : 1, stun: V.sk === 'slam' ? 1 : 0 }); }
      else if (V.sk === 'charge') { big(); burst(tx, ty, 16, 50, 110, 0.2, 0.4, FXI.impact, 12); dummyFx({ dur: 0.9, stun: 1 }); }
      else if (V.sk === 'breath') { big(); dummyFx({ dur: 1.4, tint: R_EL }); }
      else if (V.sk === 'screech') { ring(scrX(P.gx) + 3, HY + P.gy, 1, R_EL); fx.cloud(tx, ty, 8, R_EL, 1.0, 2); hitDummy(1, 1); dummyFx({ dur: 1.2, tint: R_EL, slow: 0.6 }); for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, r = 3 + Math.random() * 6; spawn(K_SPIRAL_PT, scrX(P.gx), HY + P.gy, 60 + Math.random() * 30, 0, 9, R_EL, a, 30 + r, 2); } }
      else if (V.sk === 'venom') { big(); fx.cloud(tx, ty + 2, 9, R_EL, 1.2, 2); dummyFx({ dur: 1.4, tint: R_EL }); }
      else if (V.sk === 'curse') { big(); fx.cloud(tx, ty - 2, 8, R_EL, 1.1, 2); dummyFx({ dur: 1.4, tint: R_EL, slow: 0.5 }); }
      else if (V.sk === 'wave') { hitDummy(1, 1); dummyFx({ dur: 1.2, tint: R_EL, slow: 0.5 }); burst(tx, HY - 4, 20, 40, 100, 0.3, 0.6, R_EL, 20); }
    }
    if (s === CAST && t === T_CAST[1] && V.sk === 'howl') ring(mouthScr()[0], mouthScr()[1], 0, R_EL);
    if (s === DEATH && t === INCOMING + 0.66) { const n = FLYER ? 12 : 16; for (let i = 0; i < n; i++) spawn(K_DUST, HX - 16 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); }
  }
  const EVENTS = [[], [], [T_HIT], [], T_CAST, [], [], [INCOMING + 0.66], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 10, 40, 90, 0.15, 0.35, R_EL, 10); hitDummy(0, 1); }
    else if (k === 2) {
      burst(x, y, 24, 50, 130, 0.3, 0.6, R_EL, 12); ring(x, y, 1, R_EL); hitDummy(1, 1); shake(0.12, 1);
      if (V.sk === 'web') { dummyFx({ dur: 1.5, slow: 0.3 }); for (const [a, b] of [[-8, -24], [8, -6], [-8, -6], [8, -24]]) fx.link(DUMMY_X + a, HY + b, DUMMY_X - a, HY + b + (b < -10 ? 14 : -14), R_EL, 1.2, 2); }
      else if (V.sk === 'spit') { fx.cloud(x, y, 8, R_EL, 1.1, 2); dummyFx({ dur: 1.4, tint: R_EL }); }
      else if (V.sk === 'gust') dummyFx({ dur: 0.8, slow: 0.5 });
    }
  }
  function stepFX(dt, state, stT) {
    const [gx, gy] = mouthScr();
    if (state === CHARGE) {
      if (V.sk === 'charge' || V.sk === 'slam' || V.sk === 'quake') { trailAcc += dt * 14; while (trailAcc >= 1) { trailAcc -= 1; spawn(K_DUST, scrX(o.len ? o.len / 2 : 4) + (Math.random() - 0.5) * 10, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust); } }
      chargeAcc += dt * (14 + 24 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === CAST && V.sk === 'breath' && stT < 0.4) { trailAcc += dt * 70; while (trailAcc >= 1) { trailAcc -= 1; const v = 110 + Math.random() * 60, a = Math.atan2(ty - gy, tx - gx) + (Math.random() - 0.5) * 0.35; spawn(K_TRAIL, gx + 2, gy, Math.cos(a) * v, Math.sin(a) * v, 0.3 + Math.random() * 0.2, R_EL); } }
    if (state === MOVE) {
      if (FLYER) { trailAcc += dt * 10; while (trailAcc >= 1) { trailAcc -= 1; spawn(K_TRAIL, scrX(-3) + (Math.random() - 0.5) * 4, HY + (rig ? rig.hit[1] : -12) + 3, (P.flip ? 1 : -1) * (8 + Math.random() * 8), 3 + Math.random() * 4, 0.3 + Math.random() * 0.25, R_EL); } }
      else if (P.gf !== lastGf) { if (P.gf === 0 || P.gf === 2) for (let i = 0; i < (V.rig === 'quad' && o.leg < 6 ? 3 : 2); i++) spawn(K_DUST, scrX(P.gf === 0 ? 6 : -4) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); lastGf = P.gf; }
    }
    if ((state === IDLE || state === RECOVER) && P.glow > 0) { chargeAcc += dt * 5; while (chargeAcc >= 1) { chargeAcc -= 1; spawn(K_EMBER, gx, gy - 1, Math.random() * 8 - 4, -7 - Math.random() * 6, 0.5 + Math.random() * 0.4, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 30, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    smT += dt; breathT += dt;
  }
  function fxReset() { chargeAcc = 0; trailAcc = 0; soulAcc = 0; lastGf = -9; smT = 9; breathT = 9; }
  function fxBack(f12) {
    if (FLYER && rig && P.dq < 0.6) { const alt = -rig.hit[1]; B.util.shadow(E, scrX(0), Math.max(3, R((rig.C.rx || 4) + 3 - alt / 8))); }
    if (P.rim >= 2 && P.lie === 0) floorGlow(scrX(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12);
  }
  function fxFront(f12) {
    if (smT < 2 / 12) {                                        // 近身出手的咬合 / 爪击拖影：两道短弧
      const c = smT < 1 / 12 ? EL[0] : EL[2];
      for (let k = -3; k <= 3; k++) { if (smT >= 1 / 12 && (k & 1)) continue; put(smX + 2 + Math.round(Math.abs(k) * 0.4), smY + k, c); if (smT < 1 / 12) put(smX + 3 + Math.round(Math.abs(k) * 0.4), smY + k, EL[1]); }
    }
    if (E.state === CHARGE && P.glow >= 2) { const [gx, gy] = mouthScr(), L = 2 + (f12 & 1); for (let r = 2; r <= L; r++) { put(gx + r, gy, EL[1]); put(gx - r, gy, EL[2]); put(gx, gy - r, EL[2]); put(gx, gy + r, EL[2]); } }
  }
  function drawShot(k, x, y, d, f12, Rr) {
    if (V.sk === 'web' && k === 2) { for (let r = -3; r <= 3; r++) { put(x + r, y, Rr[1]); put(x, y + r, Rr[1]); put(x + r, y + r, Rr[2]); put(x + r, y - r, Rr[2]); } put(x, y, Rr[0]); return true; }
    if (V.sk === 'bubble') { const r = k === 2 ? 2 : 1; for (let a = 0; a < 8; a++) put(Math.round(x + Math.cos(a * 0.785) * r), Math.round(y + Math.sin(a * 0.785) * r), Rr[1]); put(x - 1, y - 1, Rr[0]); return true; }
    return false;
  }

  return {
    name: V.name, HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.eye, m.iris].filter((x) => x != null), HIT_POINT, EVENTS,
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
