// 看门犬（衍生单位 · 恶魔 · 战士 · 普通 · 近战 240；desc「灵魂之门的近战召唤物」，召唤者 灵召塔）：
//   同组最敦实的犬——矮壮方头獒：头大颈粗、胸宽腿短、剪耳、短尾、黑面罩短吻；石灰蓝短毛。
//   颈上粗铁项圈挂一大串钥匙和一盏小门灯（门灯是发光体，魂光）；鼻上穿一只石质门环，垂出吻下；背脊一排门钉；额头灵门符文（与灵召塔同款）。
// 待机 = 坐姿警戒：坐在门口，一只耳朵一抽，钥匙串叮当晃。移动 = 巡逻快走：步子短而稳，每步 2 颗尘，钥匙串随步摆。
// 攻击 = 咬 × 甩：扑前 3 格一口咬住，甩头三下（门环跟着甩）。
// 技能（无特性，表现「看门」）：低伏蓄力，钥匙串浮起发光，身后浮现一扇半透明门框虚影 → 门影「砰」地合上（点阵框自两侧收拢、一帧全亮），
//   借势前冲 6 格一口死咬，甩头 3 下 + 锁形十字 + 魂光外爆。
// 死亡 = 趴倒：前腿一软跪伏、下巴贴地，门灯熄灭，钥匙串滑落散开，之后自上而下消散 + 魂光上升。
// 身体用 parts-beast 的 quad（canine 头改獒头）拼；项圈、钥匙串、门灯、门环、门钉、灵门符文是本模块的候选部件。设定卡见 pcd/batch-05/Watchdog/design.md。
PCD.define('Watchdog', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.soul, EL = FXR[R_EL];                                                       // 灵门 · 魂光：青 22 → 蓝 23 → 紫 24 → 深紫 25 → 夜 3（与灵召塔同色阶）
  const m = B.mats(E, {
    main: 'steel',                                                                            // 石灰蓝短毛 [27, 28, 29, 30]
    muz: [0, 27, 28, 28],                                                                     // 黑面罩短吻
    collar: 'iron', ring: [0, 9, 10, 18], key: 'gold',                                              // 铁项圈 · 石门环 · 金钥匙
    eye: [0, 0, 22, 22], glow: [25, 24, 22, 21], teeth: 'white', claw: 'bone',               // 魂光眼 · 门灯 / 符文（平涂 5 档）
  });
  m.body = E.defMat('steel', 2);
  const M_KGLOW = E.defMat([25, 24, 22, 21], 1, 1);                                           // 蓄力时浮起发光的钥匙
  const HEAD = { type: 'canine', w: 7, h: 6, snout: 3, snH: 3.5, tip: 0.9, ear: 'point', earH: 2, teeth: 1 };   // 獒头：颅宽 7、吻短 3、剪耳 2 格
  const SHAPE = { len: 9, chest: 5.5, rump: 4.2, waist: 0.15, hump: 0.4, leg: 5, lw: 2.5, thigh: 2.6, farDx: -2.5, stride: 2, lift: 2,
    neck: 2, neckA: 0.45, neckW: 3.4, head: HEAD, headA: 0.12, tail: 'stub', mane: 'none', foot: 'paw', fur: 1, m };
  const o = Q.shape(SHAPE);
  const oSit = Q.shape(Object.assign({}, SHAPE, { len: 5 }));                                  // 坐姿：臀收到胸下

  const HX = 74, DUR = DEFAULT_DUR.slice(), hero = new Sprite(84, 50, 40, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'teeth', 'key', 'collar']) RIM.skip[m[k]] = 1; RIM.skip[M_KGLOW] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['sit', 0, 1], ['kf', 0, 2], ['kj', -1, 1], ['rs', -1, 1]]);
  // sit 坐姿 · kf 钥匙串（0 垂着 · 1 浮起 · 2 浮起发光）· kj 钥匙串摆（-1 往后 · 1 往前）· rs 门环摆
  const P = {};
  function reset() { Q.reset(P); P.sit = 0; P.kf = 0; P.kj = 0; P.rs = 0; }
  reset();
  let rig = Q.rig(P, o);

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'reach', 'lift', 'kj', 'rs', 'kf'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, reach: 0, lift: 0, kj: 0, rs: 0, kf: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const apply = (src) => { for (const f of F_ALL) P[f] = R(src[f]); };
  const tmp = {};
  // 攻击（12 fps 逐帧）：起身 → 蓄势 → 扑前 3 格咬住 → 甩头三下 → 松口回位
  const ATK = [
    pose({ crouch: 1, kj: 1 }),
    pose({ bx: -1, crouch: 2, pitch: -1, head: 1, ear: 1, tail: 1, kj: 1 }),
    pose({ bx: 3, reach: 2, head: 1, jaw: 2, tail: -1, kj: -1, rs: -1 }),
    pose({ bx: 3, reach: 1, head: -1, jaw: 1, rs: 1, kj: -1, tail: 1 }),
    pose({ bx: 3, reach: 1, head: 1, jaw: 1, rs: -1, kj: 1, tail: -1 }),
    pose({ bx: 3, reach: 1, head: -1, jaw: 1, rs: 1, kj: -1, tail: 1 }),
    pose({ bx: 2, jaw: 2, rs: -1, kj: 1 }),
    pose({ bx: 1, kj: -1 }),
    pose({}),
  ];
  const T_BITE = 2 / 12, SHAKES = [3 / 12, 4 / 12, 5 / 12];
  const C_LOW = pose({ bx: -3, crouch: 3, pitch: -1, head: 1, ear: 1, tail: 1 });            // 低伏蓄力（后退 3 格）
  const CST = [
    pose({ bx: -3, crouch: 3, pitch: -1, head: 1, ear: 1, jaw: 1, kf: 2 }),                   // 门影合上
    pose({ bx: 0, crouch: 1, pitch: 1, reach: 3, jaw: 2, lift: 1, ear: 1, tail: -2, kj: -1 }),  // 借势前冲
    pose({ bx: 3, reach: 2, head: 1, jaw: 2, tail: -1, kj: -1, rs: -1 }),                      // 死咬
    pose({ bx: 3, reach: 1, head: -1, jaw: 1, rs: 1, kj: 1, tail: 1 }),
    pose({ bx: 3, reach: 1, head: 1, jaw: 1, rs: -1, kj: -1, tail: -1 }),
    pose({ bx: 3, reach: 1, head: -1, jaw: 1, rs: 1, kj: 1, tail: 1 }),
  ];
  const S_REL = pose({ bx: 3, jaw: 2, head: 0, kj: 1, rs: -1 });

  function idle(tq, f12) {                                                                     // 坐姿警戒：钥匙串随呼吸叮当晃；1.6–2.0 s 一只耳朵一抽、门灯一闪
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    P.sit = 1; P.crouch = 3; P.pitch = 3; P.head = -1; P.tail = 0;
    const b = Math.floor(f12 / 12 * 2.5 + 1e-6); P.kj = [0, 1, 0, -1][(b + 1) & 3];
    if (lp >= 1.6 - 1e-6 && lp < 2.0 - 1e-6) { const i = f12of(lp - 1.6); P.ear = [1, 0, 1, 0, 0][i]; P.kj = [1, -1, 1, -1, 0][i]; P.head = i === 1 ? 0 : -1; if (i === 2) P.gem = 1; }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                    // 巡逻快走：头稳、钥匙串随步摆
      const f = Q.anim.walk(P, tq); P.head = 0; P.kj = [1, 0, -1, 0][f]; P.rs = [-1, 0, 1, 0][f];
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) { apply(ATK[Math.min(8, f12of(tq))]); P.gem = tq >= T_BITE && tq < 0.5 ? 1 : 0; P.rim = tq >= T_BITE && tq < 0.34 ? 1 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_LOW, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_LOW);
      P.kf = tq < 0.35 ? 0 : tq < 0.8 ? 1 : 2;
      P.gem = tq < 0.3 ? 0 : tq < 0.45 ? 1 : tq < 1.0 ? ((f12 & 1) ? 2 : 1) : 2;
      P.glow = tq > 0.9 ? 2 : 0;
      if (tq > 1.1) { P.bob = (f12 & 1) ? -1 : 0; P.kj = (f12 & 1) ? 1 : -1; }
      P.rim = 2;
    } else if (st === CAST) { const i = Math.min(5, f12of(tq)); apply(CST[i]); P.gem = 3; P.glow = 2; P.rim = i < 3 ? 3 : 2; }
    else if (st === RECOVER) {
      if (tq < 1 / 12) apply(S_REL); else { E.mix(tmp, S_REL, REST, ease.inOut(clamp01((tq - 1 / 12) / 0.5)), F_ALL); apply(tmp); }
      P.gem = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0; P.rim = tq < 0.3 ? 2 : tq < 0.5 ? 1 : 0; P.glow = tq < 0.3 ? 2 : 0;
    } else if (st === HURT) {                                                                  // 坐着挨打：后仰、闭眼、钥匙串和门环往前甩
      const h = tq - INCOMING; idle(tq, f12);
      if (h >= 0 && h < 0.2) { P.bx = -2; P.eyes = 1; P.ear = 1; P.head = -2; P.pitch = 4; P.bob = 0; P.kj = 1; P.rs = 1; P.flash = h < 1 / 12 ? 1 : 0; P.gem = 2; }
      else if (h >= 0.2 && h < 0.35) { P.bx = -1; P.eyes = 1; P.kj = -1; P.rs = -1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { idle(tq, f12); P.bx = -2; P.eyes = 1; P.ear = 1; P.head = d < 0.15 ? -2 : 1; P.pitch = d < 0.15 ? 4 : 3; P.bob = 0; P.kj = 1; P.rs = 1; P.flash = d < 1 / 12 ? 1 : 0; P.gem = (f12 & 1) ? 2 : 0; }
      else if (d < T_DOWN) { P.bx = -2; P.crouch = d < 0.42 ? 2 : 3; P.pitch = -2; P.head = 2; P.eyes = 1; P.ear = 1; P.jaw = 1; P.kj = 1; P.tail = 1; P.gem = (f12 & 1) ? 1 : 0; }   // 前腿一软
      else {                                                                                   // 跪伏、下巴贴地
        P.bx = -2; P.lie = 1; P.head = 3; P.eyes = 1; P.ear = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.tail = d < 0.9 ? 1 : 0;
        P.gem = d < 0.66 ? 1 : d < 1.2 ? ((f12 & 1) ? 1 : 4) : 4;                              // 门灯闪两下熄灭
        const dp = B.dropAt(d, { at: 0.66, dur: 0.25, dx: 8, hop: 3 }); P.drop = dp[0]; P.dsx = dp[1]; P.dsy = dp[2];
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.gem = tq > 0.85 ? 2 : 0; }
    rig = Q.rig(P, P.sit ? oSit : o);
    const kp = keysAt(rig); P.gx = kp[0] + P.bx; P.gy = kp[1];
    B.key(P, SPEC);
  }
  const T_DOWN = 0.5;

  // ───── 画 ─────
  // 候选部件：collarBand —— 颈圈：在颈根 → 颈顶的 q 处横跨颈子画一条 2 格宽的带（沿颈轴），返回下沿挂点（钥匙、门灯、铃铛挂在这里）
  function collarGeo(rg, oo) {
    const NB = rg.NB, NT = rg.NT, L = Math.hypot(NT.x - NB.x, NT.y - NB.y) || 1, dx = (NT.x - NB.x) / L, dy = (NT.y - NB.y) / L;
    const cx = lerp(NB.x, NT.x, 0.5), cy = lerp(NB.y, NT.y, 0.5), r = oo.neckW * 0.9 + 0.6, nx = -dy, ny = dx;   // n：颈轴的法线，朝前下
    return { cx, cy, dx, dy, nx, ny, r, bot: [cx + nx * r, cy + ny * r] };
  }
  function collarBand(g) {
    E.part();
    for (let s = -g.r; s <= g.r; s += 0.5) for (let w = 0; w < 2; w++) {
      const x = g.cx + g.nx * s + g.dx * (w - 0.5), y = g.cy + g.ny * s + g.dy * (w - 0.5);
      U.dot(E, x, y, m.collar, w === 1 ? 4 : (Math.abs(s) > g.r - 1 ? 2 : 0));
    }
    const bx = g.cx + g.nx * (g.r - 1.5), by = g.cy + g.ny * (g.r - 1.5); U.dot(E, bx, by, m.key, 4);   // 项圈扣（金）
  }
  function keysAt(rg) { const g = collarGeo(rg, P.sit ? oSit : o), b = g.bot; return [R(b[0]) - 1, Math.min(R(b[1]) + 1, -7) - (P.kf ? P.kf * 2 + 1 : 0)]; }
  // 候选部件：keyRing —— 钥匙串：2×2 金环 + 3 把钥匙（1 格杆 + 末端 1 格齿），垂着 / 浮起两种；kj 摆动；浮起发光时换发光材质
  const KD = [[0, 1], [-1, -1], [0, -1], [1, -1], [1, 1], [-1, 1]];
  function keyOne(x, y, d, len, mat) {
    const [dx, dy] = KD[d]; for (let k = 0; k < len; k++) U.dot(E, x + dx * k, y + dy * k, mat, k === len - 1 ? 2 : 3);
    const tx = x + dx * (len - 1), ty = y + dy * (len - 1); U.dot(E, tx + (dy > 0 ? 1 : dy < 0 ? -1 : 0) * (dx === 0 ? 1 : 0), ty + (dx !== 0 && dy === 0 ? 1 : 0), mat, 2);
    if (dx !== 0) U.dot(E, tx + dx, ty, mat, 2);
  }
  function keyRing(x, y) {
    E.part(); const mat = P.kf === 2 ? M_KGLOW : m.key, j = P.kj | 0;
    U.dot(E, x, y, mat, 4); U.dot(E, x + 1, y, mat, 3); U.dot(E, x, y + 1, mat, 3); U.dot(E, x + 1, y + 1, mat, 2);
    if (!P.kf) { keyOne(x - 1 + j, y + 2, 5, 3, mat); keyOne(x + j, y + 2, 0, 4, mat); keyOne(x + 2 + j, y + 2, 4, 3, mat); }
    else { keyOne(x - 1, y - 1, 1, 3, mat); keyOne(x, y - 1, 2, 3 + (P.kf === 2 ? 1 : 0), mat); keyOne(x + 2, y - 1, 3, 3, mat); }
  }
  // 候选部件：doorLamp —— 挂在项圈下的小门灯：铁吊环 + 顶盖 + 2 格灯芯（发光体，5 档：暗 / 亮 / 很亮 / 爆闪 / 熄灭）+ 底座 + 坠
  const LAMP_T = [[2, 2], [3, 3], [4, 3], [4, 4]];
  function doorLamp(x, y, lv) {
    E.part();
    U.dot(E, x, y, m.collar, 3);
    U.dot(E, x - 1, y + 1, m.collar, 4); U.dot(E, x, y + 1, m.collar, 4); U.dot(E, x + 1, y + 1, m.collar, 2);
    for (let k = 0; k < 2; k++) {
      U.dot(E, x - 1, y + 2 + k, m.collar, 3); U.dot(E, x + 1, y + 2 + k, m.collar, 2);
      if (lv === 4) U.dot(E, x, y + 2 + k, m.ring, 1); else U.dot(E, x, y + 2 + k, m.glow, LAMP_T[lv][k]);
    }
    U.dot(E, x - 1, y + 4, m.collar, 3); U.dot(E, x, y + 4, m.collar, 3); U.dot(E, x + 1, y + 4, m.collar, 2); U.dot(E, x, y + 5, m.collar, 2);
  }
  // 候选部件：noseRing —— 穿鼻门环：鼻尖下挂一只 4×4 的浅石环（门上的门环），环心 2×2 空洞由勾线填成暗孔；rs 摆动
  function noseRing(F) {
    E.part(); const a = F.at(F.uT - 1.2, F.bot(F.uT - 1.2)), x = R(a[0]) + (P.rs | 0), y = R(a[1]) + 1;
    U.dot(E, x, y, m.ring, 4); U.dot(E, x + 1, y, m.ring, 3);
    for (let k = 1; k <= 2; k++) { U.dot(E, x - 1, y + k, m.ring, 4); U.dot(E, x + 2, y + k, m.ring, 2); }
    U.dot(E, x, y + 3, m.ring, 3); U.dot(E, x + 1, y + 3, m.ring, 2);
  }
  // 躯干细节（紧跟 Q.body，并进躯干部件）：背脊一排门钉（2 格高的铁钉头，伸出背线）+ 颈下两道厚皮褶
  function bodyDetail(rg, oo) {
    if (rg.lie) return;
    const C1 = rg.C1, C2 = rg.C2;
    for (let x = R(C2.x); x <= R(C1.x + 1); x += 3) { const s = Q.span(rg, oo, x); if (!s) continue; U.dot(E, x, s[0] - 1, m.collar, 4); U.dot(E, x + 1, s[0] - 1, m.collar, 2); U.dot(E, x, s[0] - 2, m.collar, 4); }
    const xs = R(C1.x + C1.r * 0.5), ss = Q.span(rg, oo, xs); if (ss) { U.dot(E, xs, ss[0] + 3, m.body, 2); U.dot(E, xs + 1, ss[0] + 4, m.body, 2); }
  }
  // 头部细节（紧跟 Q.head，并进头部件）：额头灵门符文（∩ 形 3 格，发光体）、下垂的厚唇（闭嘴时）
  const RUNE_T = [2, 3, 4, 4, 1];
  function headDetail(F) {
    const c = F.at(-F.W * 0.1, -F.Hh * 0.45), x = R(c[0]), y = R(c[1]), t = RUNE_T[P.gem | 0];
    U.dot(E, x - 1, y + 1, m.glow, t); U.dot(E, x, y, m.glow, t); U.dot(E, x + 1, y + 1, m.glow, t);
    if (!P.jaw && !P.lie) { const j = F.at(F.W * 0.9, F.bot(F.W * 0.9) + 1); U.dot(E, j[0], j[1], m.muz, 2); U.dot(E, j[0] + 1, j[1], m.muz, 2); }
  }
  function droppedKeys(x0) {                                                                  // 钥匙串滑落：飞行中是一团，落地散开成四样
    E.part();
    if (P.drop === 1) { const x = x0 + P.dsx, y = -2 - P.dsy; U.dot(E, x, y, m.key, 4); U.dot(E, x + 1, y, m.key, 3); keyOne(x - 1, y + 1, 5, 2, m.key); keyOne(x + 1, y + 1, 4, 2, m.key); return; }
    const x = x0 + P.dsx; U.dot(E, x, -1, m.key, 4); U.dot(E, x + 1, -1, m.key, 3);
    for (const [dx, len] of [[-5, 3], [3, 4], [8, 3]]) { for (let k = 0; k < len; k++) U.dot(E, x + dx + k, -1, m.key, k === 0 ? 4 : 3); U.dot(E, x + dx + len - 1, -2, m.key, 2); }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const oo = P.sit ? oSit : o, g = collarGeo(rig, oo);
    Q.legs(E, rig, P, oo, 1);
    Q.tail(E, rig, P, oo);
    Q.body(E, rig, P, oo); bodyDetail(rig, oo);
    Q.legs(E, rig, P, oo, 0);
    collarBand(g);
    Q.head(E, rig, P, oo); const F = Q.headFrame(rig, oo, P.jaw); headDetail(F);
    noseRing(F);
    const kp = keysAt(rig), lx = kp[0] + 2, ly = Math.min(R(g.bot[1]) + 1, -7);
    doorLamp(lx, ly, P.gem | 0);
    if (!P.drop) keyRing(kp[0] - 1, kp[1]); else droppedKeys(R(g.bot[0]));
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }
  const HIT_POINT = (() => { poseAt(IDLE, 0, 0); return [R(rig.C1.x - 1), R(rig.C1.y)]; })();

  // ───── 特效 ─────
  const T_LAND = Math.ceil((INCOMING + 0.66) * 12 - 1e-6) / 12;
  const BITE = [DUMMY_X - 5, HY - 12];
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, doorT = 9, lockT = 9, jawT = 9, jawBig = 0;
  const DOOR_W = 12, DOOR_H = 22;
  function doorX() { return HX - 2; }
  function onEnter(s) {
    if (s === CAST) {                                                                          // 门影「砰」地合上
      doorT = 0; const x = doorX();
      releaseOrbit(40, 90, 0.3, 0.6, { ramp: R_EL });
      for (let y = HY - DOOR_H - DOOR_W + 2; y <= HY - 1; y += 3) spawn(K_EMBER, x + (Math.random() - 0.5) * 2, y, (Math.random() - 0.5) * 30, -6 - Math.random() * 8, 0.3 + Math.random() * 0.3, R_EL);
      shake(0.28, 2); flash(0.05);
    }
    if (s === RECOVER) {                                                                       // 松口：魂光外爆
      burst(BITE[0], BITE[1], 26, 50, 130, 0.3, 0.7, R_EL, 12); ring(BITE[0], BITE[1], 1, R_EL);
      sfx('impact', { pal: 'arcane', w: 0.4 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_BITE) {
      burst(BITE[0], BITE[1], 10, 40, 100, 0.15, 0.35, FXI.impact, 8); hitDummy(0, 1); jawT = 0; jawBig = 0;
      sfx('swing', { kind: 'bite', w: 0.45 }); sfx('hit', { mat: 'flesh', w: 0.45 });
    }
    if ((s === ATTACK || s === CAST) && SHAKES.includes(t)) {                                // 甩头三下：目标三次小摇
      const k = SHAKES.indexOf(t); hitDummy(0, k & 1 ? -1 : 1);
      burst(BITE[0], BITE[1] + (k & 1 ? 2 : -2), s === CAST ? 6 : 3, 20, 60, 0.12, 0.3, s === CAST ? R_EL : FXI.impact, 6);
      if (s === CAST && k === 2) { ring(BITE[0], BITE[1], 0, R_EL); shake(0.1, 1); }
    }
    if (s === CAST && t === T_BITE) {                                                          // 死咬：锁形十字 + 魂光
      burst(BITE[0], BITE[1], 18, 40, 110, 0.25, 0.55, R_EL, 10); burst(BITE[0], BITE[1], 8, 30, 80, 0.15, 0.3, FXI.impact, 8);
      fx.cross(BITE[0], BITE[1], 7, R_EL, 0.4); hitDummy(1, 1); shake(0.12, 1); lockT = 0; jawT = 0; jawBig = 1;
      sfx('hit', { mat: 'flesh', w: 0.55 }); sfx('impact', { pal: 'arcane', w: 0.55 });
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 12 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.55 });
    }
  }
  const EVENTS = [[], [], [T_BITE].concat(SHAKES), [], [T_BITE].concat(SHAKES), [], [], [T_LAND], []];
  function hurtFx(s) {                                                                         // 短毛屑 + 撞击火花 + 两颗钥匙金星
    const hx = HX + HIT_POINT[0], hy = HY + HIT_POINT[1];
    burst(hx, hy, s === DEATH ? 20 : 12, 50, 120, 0.25, 0.55, FXI.impact, 18); burst(hx - 2, hy, s === DEATH ? 10 : 6, 40, 100, 0.2, 0.45, FXI.steel, 14);
    for (let i = 0; i < 2; i++) spawn(K_EMBER, hx + 3, hy + 4, 10 + Math.random() * 10, -18 - Math.random() * 10, 0.35, FXI.coin);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                                                    // 魂光绕钥匙串螺旋收拢
      chargeAcc += dt * (12 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 8 + Math.random() * 8; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE && P.gf !== lastGf) {                                                   // 每步 2 颗尘 + 一声
      if (P.gf === 0 || P.gf === 2) { for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(P.gf === 0 ? 7 : -5) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.3 + Math.random() * 0.15, FXI.dust); sfx('step', { w: 0.5 }); }
      lastGf = P.gf;
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 24, HY - 1 - Math.random() * 10, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, R_EL); } }
    if (state === RECOVER && stT < 0.4 && Math.random() < dt * 10) spawn(K_EMBER, gx, gy, (Math.random() - 0.5) * 6, -6 - Math.random() * 6, 0.5, R_EL);
    doorT += dt; lockT += dt; jawT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; doorT = 9; lockT = 9; jawT = 9; }
  // 门框虚影：两根门柱 + 半圆门楣，每 2 格一点，蓄力时从左下沿门框逐点亮起；两扇门板中缝一列暗点
  function doorPts(cb) {
    const x0 = doorX(), yb = HY - 1, yt = HY - DOOR_H;
    for (let y = yb; y >= yt; y -= 2) cb(x0 - DOOR_W, y, (yb - y) / (DOOR_H + DOOR_W * 3.2));
    for (let k = 0; k <= 12; k++) { const a = Math.PI + k / 12 * Math.PI; cb(R(x0 + Math.cos(a) * DOOR_W), R(yt + Math.sin(a) * DOOR_W * 0.9), (DOOR_H + k / 12 * DOOR_W * 3.2) / (DOOR_H * 2 + DOOR_W * 3.2)); }
    for (let y = yt; y <= yb; y += 2) cb(x0 + DOOR_W, y, (DOOR_H + DOOR_W * 3.2 + (y - yt)) / (DOOR_H * 2 + DOOR_W * 3.2));
  }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (E.state === CHARGE) {
      const lit = clamp01((E.stT - 0.15) / 0.8), late = E.stT > 1.0;
      doorPts((x, y, q) => { if (q > lit) return; put(x, y, q > lit - 0.08 ? EL[0] : late && ((x + y + f12) & 2) ? EL[1] : EL[2]); });
      if (E.stT > 0.6) for (let y = HY - 2; y >= HY - DOOR_H - DOOR_W + 3; y -= 3) if (((y + f12) & 3) !== 0) put(doorX(), y, EL[3]);   // 门缝
    }
    if (E.state === CAST && doorT < 3 / 12) {                                                 // 门影合上：两侧门柱向中间收拢 → 一帧全亮 → 散开
      const k = f12of(doorT), x0 = doorX(), top = HY - DOOR_H - DOOR_W;
      if (k === 0) for (let y = HY - 1; y >= top + 3; y -= 2) { put(x0 - 5, y, EL[0]); put(x0 + 5, y, EL[0]); put(x0 - 6, y + 1, EL[1]); put(x0 + 6, y + 1, EL[1]); }
      else if (k === 1) for (let y = HY - 1; y >= top; y--) { put(x0, y, 21); put(x0 - 1, y, EL[0]); put(x0 + 1, y, EL[0]); }
      else for (let y = HY - 1; y >= top; y -= 2) if (((y + f12) & 3) !== 3) put(x0, y, EL[2]);
    }
  }
  // 锁形印记：咬住的那一刻在目标身上扣一把魂光挂锁（锁梁 + 锁身 + 锁孔），第 1 帧白
  function lockGlyph(x, y, c1, c2, c3) {
    for (let i = -1; i <= 1; i++) put(x + i, y - 6, c1); put(x - 2, y - 5, c1); put(x + 2, y - 5, c1); put(x - 2, y - 4, c2); put(x + 2, y - 4, c2);
    for (let j = -3; j <= 0; j++) for (let i = -3; i <= 3; i++) put(x + i, y + j, (i === 0 && (j === -2 || j === -1)) ? c3 : (j === -3 ? c1 : c2));
  }
  function fxFront(f12) {
    if (jawT < 2 / 12) {                                                                       // 咬合拖影：上下两道弧往中间扣
      const first = jawT < 1 / 12, c = jawBig ? (first ? EL[0] : EL[2]) : (first ? 21 : FXR[FXI.impact][2]), r = jawBig ? 6 : 4;
      for (let k = -r; k <= r; k++) { if (!first && (k & 1)) continue; const dy = R(Math.abs(k) * 0.6); put(BITE[0] + k, BITE[1] - r + dy, c); put(BITE[0] + k, BITE[1] + r - dy, c); }
    }
    if (lockT < 0.8) { const q = lockT / 0.8; if (!(q > 0.6 && (f12 & 1))) { const w = lockT < 1 / 12; lockGlyph(BITE[0] - 1, BITE[1] - 6, w ? 21 : EL[0], w ? 21 : q < 0.4 ? EL[1] : EL[2], w ? EL[0] : EL[3]); } }
    if (P.kf === 2 && !P.lie) { const x = scrX(P.gx), y = HY + P.gy - 2, L = 1 + (f12 & 1); for (let r = 1; r <= L; r++) { put(x + r + 1, y, EL[0]); put(x - r - 1, y, EL[1]); put(x, y - r - 2, EL[1]); } }
  }

  return {
    name: '看门犬', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.eye, M_KGLOW], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'collapse', pal: 'arcane', style: 'shield', w: 0.55 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
