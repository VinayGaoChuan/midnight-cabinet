// 邪犬（衍生单位 · 恶魔 · 战士 · 普通 · 近战；地狱召唤塔的近战召唤物，与灵门的看门犬对应）：骨瘦长腿地狱犬，约 28×22 格。
//   腿长腰细、肋骨凸出、头低前探；焦赤色的皮下透出熔岩裂纹；背脊一排向前弯的骨棘；头顶一对前弯短角；嘴一直裂到耳根，熔岩涎从嘴角往下滴；
//   脖子上一只铁项圈，挂着从地狱召唤塔上绷断的锁链，断链从喉下垂到地上、在身后拖出 6 格。
// 攻击「撕」：前扑人立，两只前爪左右交替往下撕扯两下（近侧爪 → 远侧爪），目标身上两道爪痕、血色碎屑。
// 技能（无特性，表现全力扑杀）：刨地三下、熔涎滴地冒烟、背上骨棘从后往前一根根燃起（轮廓光 2 档）；
//   施放时拖着断链前冲 8 格，身后贴地一道火痕 + 1 层残影、震屏 2 格；人立双爪 X 形撕开目标（两段血色斩击弧交叉），断链甩出缠住目标并把它点燃。
// 死亡「燃尽」：失衡 → 四腿一软趴倒 → 项圈崩开、断链落地弹一下 → 从尾巴开始一路烧向头（火线后面化成灰烬飘升）→ 只剩断链，最后消散。
// 身体用 parts-beast 的 quad（canine、长腿、深收腹）拼骨架 / 头 / 腿 / 细尾；骨棘、断链项圈、裂口、前弯短角、熔岩纹与肋骨、双爪抬起、燃尽是本模块的候选部件。
PCD.define('EvilDog', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST, K_STILL, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, blitShape } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;
  const near = (a, b) => Math.abs(a - b) < 1e-6;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.blood, EL = FXR[R_EL];                                                     // 地狱 · 熔血：白 21 → 淡粉 58 → 红 57 → 暗红 56 → 酒红 55（与地狱召唤塔同色阶）
  const R_FIRE = FXI.fire;                                                                    // 熔涎 / 火痕点缀：白 21 → 淡黄 47 → 橙 46 → 红 45 → 深红 44
  const R_ASH = fxRamp('evilDogAsh', [46, 7, 10, 9, 8]);                                      // 燃尽的灰烬：余火 → 暖灰 → 石灰 → 墨灰
  const R_SMOKE = fxRamp('evilDogSmoke', [18, 10, 9, 8, 0]);                                  // 熔涎落地冒的烟
  const R_CHAIN = fxRamp('evilDogChain', [30, 29, 57, 56, 55]);                               // 甩出的断链：铁亮 → 铁 → 血红 → 暗红（iron → blood）
  const m = B.mats(E, {
    main: [0, 11, 12, 13],                                                                   // 焦赤皮（crimson 色阶压暗一级：墨勾线、深酒红暗部），躯干 band 2
    bone: 'bone', chain: 'iron', flame: 'fire', claw: 'bone', teeth: 'bone',
    eye: [0, 0, 47, 47], glow: [45, 46, 47, 47],
  });
  const LAVA = [44, 45, 46, 47].map((c) => E.defMat([c, c, c, c], 1, 1));                      // 熔岩纹 4 档亮度（平涂：暗红 → 红 → 橙 → 黄）
  const HEAD = { type: 'canine', w: 6, h: 5, snout: 5, snH: 3, tip: 0.5, ear: 'point', earH: 4, teeth: 2 };   // 吻长、尖耳
  const SHAPE = { len: 13, chest: 4, rump: 3.2, waist: 0.8, hump: 0.4, leg: 8, lw: 1.6, thigh: 2, farDx: -2, stride: 4, lift: 3, foot: 'claw',
    neck: 3.5, neckA: 0.5, neckW: 2.2, head: HEAD, headA: 0.15, tail: 'thin', tailLen: 7, tailA: -0.2, tailCurl: 0.15, mane: 'none', fur: 0, m };
  const o = Q.shape(SHAPE);

  const HX = 64, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 56, 50, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 15, 21], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'glow', 'ink', 'teeth', 'spec', 'flame', 'bone', 'boneFar', 'chain', 'claw']) RIM.skip[m[k]] = 1;
  for (const l of LAVA) RIM.skip[l] = 1;
  // 本角色的姿势字段：lava 熔岩纹亮度 0–3 · ign 燃起的骨棘数 0–5 · npaw / fpaw 近 / 远侧前爪抬起档 0–3（3 高举 · 2 半落 · 1 撕下伸直）
  //   clk 断链相位 0–3 · chain 0 拖地 / 1 甩出 / 2 项圈崩开落地 · drip 嘴角熔涎长度 0–2 · burn 燃尽的火线位置 0–44 · fl 骨棘火苗相位 0–1
  const EXTRA = [['lava', 0, 3], ['ign', 0, 5], ['npaw', 0, 3], ['fpaw', 0, 3], ['clk', 0, 3], ['chain', 0, 2], ['drip', 0, 2], ['burn', 0, 44], ['fl', 0, 1]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.lava = 1; P.ign = 0; P.npaw = 0; P.fpaw = 0; P.clk = 0; P.chain = 0; P.drip = 0; P.burn = 0; P.fl = 0; }
  reset();
  let rig = Q.rig(P, o), corner = [0, 0];
  const HIT_POINT = rig.hit;
  const COL_Q = 0.45;
  const colAt = (rg) => { const NB = rg.NB, NT = rg.NT, L = Math.hypot(NT.x - NB.x, NT.y - NB.y) || 1, vx = (NT.x - NB.x) / L, vy = (NT.y - NB.y) / L;
    return { cx: lerp(NB.x, NT.x, COL_Q), cy: lerp(NB.y, NT.y, COL_Q), vx, vy, nx: -vy, ny: vx, r: o.neckW + 0.4 }; };
  const C0 = colAt(rig), COL0 = [R(C0.cx), R(C0.cy)];                                          // 站姿的项圈位置：崩开掉落的起点

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'paw', 'reach', 'glow', 'npaw', 'fpaw'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, paw: 0, reach: 0, glow: 0, npaw: 0, fpaw: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_H1 = 2 / 12, T_H2 = 4 / 12;
  const A_WIND = pose({ bx: -1, crouch: 2, pitch: -1, head: 2, jaw: 2, ear: 1, tail: 1 });                          // 蓄势压低
  const A_NEAR = pose({ bx: 6, pitch: 4, head: 0, jaw: 3, npaw: 1, fpaw: 3, tail: -2, ear: 1, glow: 2 });            // 人立：近侧爪往下撕，远侧爪举起
  const A_FAR = pose({ bx: 6, pitch: 4, head: 1, jaw: 3, npaw: 3, fpaw: 1, tail: -2, ear: 1, glow: 2 });             // 换爪：远侧爪往下撕，近侧爪收起
  const A_HOLD = pose({ bx: 4, pitch: 2, head: 1, jaw: 2, npaw: 2, fpaw: 0, tail: -1, ear: 1 });
  const ATK = [[0, REST], [1 / 12, A_WIND, 'out'], [T_H1, A_NEAR, 'snap'], [3 / 12, A_NEAR, 'lin'], [T_H2, A_FAR, 'snap'], [5 / 12, A_FAR, 'lin'], [0.5, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ crouch: 2, pitch: -1, head: 2, jaw: 2, ear: 1, tail: 1, glow: 2 });                            // 压低、刨地
  const S_DASH = pose({ crouch: 1, pitch: -1, head: 1, jaw: 3, reach: 2, tail: -2, ear: 1, glow: 3 });
  const S_REAR = pose({ bx: 1, pitch: 5, head: 0, jaw: 3, npaw: 1, fpaw: 1, tail: -2, ear: 1, glow: 3 });            // 人立，双爪同时撕下（X）
  const S_PULL = pose({ bx: -1, crouch: 1, pitch: 0, head: 1, jaw: 2, reach: -1, tail: -1, ear: 1, glow: 2 });       // 落地后往回拽锁链
  const DASH = 8, T_CHIT = 3 / 12;
  const T_FALL = INCOMING + 0.66, T_BURN0 = INCOMING + 0.9, T_BURN1 = INCOMING + 2.2, BURN_X0 = -19, BURN_N = 44;
  const DROP = { at: 0.66, dur: 0.25, dx: 9, hop: 4 };

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]), fi = f12of(lp);
    P.head = 0; P.glow = 0; P.lava = 1; P.jaw = P.bob ? 1 : 0;                                                           // 低头喘气：一起一伏张合嘴
    const c = fi % 10; if (c < 2) { P.paw = 1; P.reach = 1; } else if (c < 4) P.reach = -1;                               // 一只前爪不停刨地：抬起往前 → 往后刨
    const d = fi % 14; P.drip = d < 5 ? 0 : d < 10 ? 1 : 2;                                                              // 嘴角熔涎越挂越长，滴落
    if (fi >= 19 && fi < 24) { P.head = 2; P.jaw = 2; P.glow = 1; P.crouch = 1; P.ear = 1; P.drip = 2; P.lava = fi & 1 ? 2 : 1; }   // 待机个性：头压得更低，一大口熔涎涌出
    return lp;
  }
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  // 候选部件：pawRaise —— 四足前爪抬起 / 撕下（quad 的 paw 只管近侧、够不到肩上）：按肩点给脚的位置，lvl 3 高举过肩 · 2 半落 · 1 往前下撕到底；超过腿长按腿长收
  function pawRaise(L, lvl) {
    if (!lvl) return; const T = L.T, tg = lvl === 3 ? [T[0] + 5.5, T[1] - 2.5] : lvl === 2 ? [T[0] + 6, T[1] - 1] : [T[0] + 7, T[1] + 4.5];
    const dx = tg[0] - T[0], dy = tg[1] - T[1], d = Math.hypot(dx, dy); if (d > L.L) { tg[0] = T[0] + dx * L.L / d; tg[1] = T[1] + dy * L.L / d; }
    if (tg[1] > 0) tg[1] = 0; L.F = tg; L.up = tg[1] < -0.5;
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), fi = f12of(tq);
    reset(); P.fl = (f12 >> 1) & 1;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                                              // 狂奔：四腿大跨步、前后起伏、耳朵贴后、断链哗啦拖
      Q.anim.walk(P, tq); P.pitch = [1, 0, -1, 0][P.gf]; P.jaw = 2; P.ear = 1; P.clk = P.gf; P.head += 1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.lava = tq >= 1 / 12 && tq < 0.5 ? 2 : 1; P.clk = tq >= T_H1 && tq < 0.5 ? (fi & 1) + 1 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_LOW, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_LOW);
      if (fi >= 2 && fi < 14) { if ((fi - 2) % 4 < 2) { P.paw = 2; P.reach = 1; } else { P.paw = 0; P.reach = -2; } }       // 刨地三下
      P.ign = Math.max(0, Math.min(5, (fi - 2) >> 1)); P.lava = 1 + (fi >= 6 ? 1 : 0) + (fi >= 11 ? 1 : 0); P.rim = fi >= 4 ? 2 : 1;
      P.drip = fi % 6 < 3 ? 1 : 2; if (tq > 0.45) P.glow = (f12 & 1) ? 3 : 2;
      if (tq > 1.1) { P.bob = (f12 & 1) ? -1 : 0; P.tail = (f12 & 1) ? 2 : 0; }
    } else if (st === CAST) {                                                                                            // 拖链前冲 8 格 → 人立双爪 X 撕 → 落地拽链
      if (tq < T_CHIT - 1e-6) { apply(S_DASH); P.gf = fi & 1 ? 2 : 0; P.mx = R(DASH * (fi + 1) / 3); }
      else if (tq < 5 / 12 - 1e-6) { apply(S_REAR); P.mx = DASH; P.chain = 1; }
      else { apply(S_PULL); P.mx = DASH; P.chain = 1; }
      P.ign = 5; P.lava = 3; P.rim = tq < 5 / 12 ? 3 : 2; P.clk = fi & 3;
    } else if (st === RECOVER) {                                                                                         // 往后跳回原位，火苗一根根熄
      const q = clamp01(tq / 0.45), e = ease.inOut(q);
      if (tq < 0.45) { apply(S_PULL); P.mx = R(DASH * (1 - e)); P.pitch = q < 0.5 ? 1 : 0; P.reach = 0; P.bob = q > 0.3 && q < 0.7 ? -1 : 0; P.chain = tq < 2 / 12 ? 1 : 0; }
      else { const q2 = ease.inOut(clamp01((tq - 0.45) / 0.2)); E.mix(tmp, pose({ crouch: 1 }), REST, q2, F_ALL); apply(tmp); }
      P.ign = Math.max(0, 5 - (fi >> 1)); P.lava = tq < 0.3 ? 2 : 1; P.rim = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.jaw = 2; P.clk = h < 0.2 ? 2 : 1; P.lava = h < 0.1 ? 3 : 1; P.glow = 1; } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { Q.anim.death(P, d, f12); P.lava = 2 + (f12 & 1); P.clk = 2; P.glow = 1; }
      else if (d < 0.5) { P.bx = -2; P.crouch = 4; P.pitch = -2; P.head = 2; P.eyes = 1; P.ear = 1; P.tail = 1; P.jaw = 1; P.lava = 2; P.clk = 1; }   // 四腿一软
      else {                                                                                                             // 趴倒（离地 2 → 1 → 0）→ 项圈崩开 → 燃尽
        P.bx = -2; P.lie = 1; P.head = 3; P.eyes = 1; P.ear = 1; P.jaw = 1; P.tail = d < 0.9 ? 2 : 0; P.lift = d < 0.58 ? 2 : d < 0.66 ? 1 : 0;
        P.lava = d < 0.9 ? 2 : d < 1.2 ? 1 : 0; P.glow = d < 1.0 ? 1 : 0;
        const c = B.dropAt(d, DROP); P.drop = c[0]; P.dsx = c[1]; P.dsy = c[2]; if (P.drop) P.chain = 2;
        if (tq >= T_BURN0) P.burn = Math.min(BURN_N, R(BURN_N * clamp01((tq - T_BURN0) / (T_BURN1 - T_BURN0))));
        if (tq >= T_BURN1 + 0.05) P.dq = clamp01((tq - T_BURN1 - 0.05) / 0.35);                                            // 只剩断链：消散
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o);
    if (!rig.lie) { pawRaise(rig.legs[3], P.npaw); pawRaise(rig.legs[1], P.fpaw); }
    corner = mawCorner(rig, P.jaw);
    P.gx = R(rig.mouth[0]) + P.bx; P.gy = R(rig.mouth[1]);
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：boneRidge —— 背脊一排向前弯的骨棘（画在躯干之前，只露出背线以上）：臀后到肩前每 3 格一根，肩上最高；
  //   根部 2 格宽、往上收成 1 格，最上两格往前（+x）弯出钩尖。lit = 从后往前已燃起的根数：燃起的棘尖上一簇 1–3 格火苗（fl 相位参差）
  const SPK_H = [3, 4, 5, 5, 4];
  function spikes(rg) { const out = [], xs = [-5.5, -2.5, 0.5, 3.5, 6]; for (let i = 0; i < xs.length; i++) { const x = R(rg.C2.x + 6.5 + xs[i]), s = Q.span(rg, o, x); if (s) out.push([x, s[0], SPK_H[i]]); } return out; }
  function boneRidge(rg, lit) {
    if (rg.lie === 2) return; E.part();
    spikes(rg).forEach(([x, top, H], i) => {
      for (let k = 0; k <= H; k++) {
        const y = top + 1 - k, xo = k >= H ? 2 : k >= H - 1 ? 1 : 0;
        U.dot(E, x + xo, y, m.bone, k === H ? 4 : k === 0 ? 2 : 0); if (k < 2) U.dot(E, x + 1, y, m.bone, 2);
      }
      if (i < lit) {                                                                                                      // 燃起的火苗
        const tx = x + 2, ty = top + 1 - H, big = (i + P.fl) & 1;
        U.dot(E, tx, ty - 1, m.flame, 3); U.dot(E, tx - 1, ty - 1, m.flame, 2); U.dot(E, tx - 1 + big, ty - 2, m.flame, 4); if (big || lit >= 5) U.dot(E, tx - 1, ty - 3, m.flame, 4);
      }
    });
  }
  // 候选部件：lavaHide —— 焦皮上的熔岩纹 + 凸出的肋骨（紧跟 quad.body 画，同一个部件）：胸后 4 根往后斜的肋骨（亮一行 + 暗一行），
  //   肩、臀、腰三道折线裂纹（平涂熔岩色，lava 0–3 档亮度）
  const CRACKS = [[2, [[-1, -2], [0, -1], [0, 0], [1, 1], [2, 1], [2, 2]]], [1, [[-2, -2], [-1, -1], [-1, 0], [0, 1], [1, 1]]], [0, [[0, -1], [1, 0], [2, 0], [3, 1]]]];
  function lavaHide(rg) {
    if (rg.lie === 2) return; const C1 = rg.C1, C2 = rg.C2, lv = LAVA[P.lava];
    for (let i = 0; i < 4; i++) {
      const x = R(C1.x - 1.5 - i * 2), s = Q.span(rg, o, x); if (!s || s[1] - s[0] < 4) continue;
      for (let j = 2; j <= s[1] - s[0] - 1; j++) { const xx = x - Math.floor(j / 3); U.dot(E, xx, s[0] + j, m.body, 4); U.dot(E, xx + 1, s[0] + j, m.body, 2); }
    }
    const cen = [[C1.x - 0.5, C1.y + 0.5], [C2.x, C2.y], [lerp(C2.x, C1.x, 0.45), lerp(C2.y, C1.y, 0.45) - 1.5]];
    for (const [ci, pts] of CRACKS) { const [cx, cy] = cen[ci]; for (const [dx, dy] of pts) { const x = R(cx + dx), y = R(cy + dy), s = Q.span(rg, o, x); if (s && y > s[0] && y < s[1]) U.dot(E, x, y, lv, 0); } }
  }
  // 候选部件：brokenChain —— 断链项圈 + 拖地断链（一个部件）：铁项圈沿颈轴 2 格宽横穿颈部（铆钉亮点），
  //   喉下垂一条锁链到地面，沿地面往后拖到臀后 6 格；竖环 1 格 / 横环 2 格高交替，clk 相位让链节一跳一跳（哗啦拖），末端一只张开的断环。
  //   mode 0 拖地 · 1 甩出（只留喉下 2 节往前绷，其余交给 fx.link）· at = [x, y]：崩开落地的一圈项圈 + 一小堆链（flat 1 落地）
  function brokenChain(rg, mode, at, flat) {
    E.part(); const mt = m.chain;
    if (at) {
      const [x, y] = at;
      if (flat) { for (let i = -3; i <= 3; i++) U.dot(E, x + i, y, mt, (i & 1) ? 2 : 4); for (let i = -2; i <= 2; i++) if (i & 1) U.dot(E, x + i, y - 1, mt, 3); for (let k = 0; k < 6; k++) U.dot(E, x - 4 - k, y, mt, (k % 2) ? 2 : 4); U.dot(E, x - 10, y - 1, mt, 4); }
      else { [[-2, 0], [-2, -1], [-1, -2], [0, -2], [1, -2], [2, -1], [2, 0], [1, 1], [0, 1], [-1, 1]].forEach(([dx, dy], i) => U.dot(E, x + dx, y + dy, mt, i < 5 ? 4 : 2)); for (let k = 0; k < 4; k++) U.dot(E, x - 3 - k, y + 1 + (k >> 1), mt, k & 1 ? 2 : 4); }
      return;
    }
    const c = colAt(rg);
    for (let s = -c.r, i = 0; s <= c.r + 0.01; s += 1, i++) for (let t = 0; t <= 1; t++) U.dot(E, c.cx + c.nx * s + c.vx * t, c.cy + c.ny * s + c.vy * t, mt, t === 0 ? (i % 3 === 1 ? 4 : 3) : 2);
    const tx = R(c.cx + c.nx * (c.r + 0.8)), ty = R(c.cy + c.ny * (c.r + 0.8));
    U.dot(E, tx, ty, mt, 4); U.dot(E, tx - 1, ty, mt, 2);                                                               // 喉下的挂环
    if (mode === 1) { for (let k = 1; k <= 3; k++) U.dot(E, tx + k, ty + (k >> 1), mt, k & 1 ? 3 : 4); return; }
    const gx = tx - 2, clk = P.clk | 0;
    for (let y = ty + 1, k = 0; y <= 0; y++, k++) { const x = R(tx - (y - ty) / Math.max(1, -ty) * 2); if ((k + clk) & 1) U.dot(E, x, y, mt, 3); else { U.dot(E, x, y, mt, 4); U.dot(E, x + 1, y, mt, 2); } }
    const xEnd = R(rg.C2.x - rg.C2.r - 6);
    for (let x = gx - 1, k = 0; x >= xEnd; x--, k++) {
      const hop = clk && ((k + clk * 2) % 5 === 0) ? 1 : 0;
      if (((k + clk) & 1) === 0) { U.dot(E, x, -hop, mt, 2); U.dot(E, x, -1 - hop, mt, 4); } else U.dot(E, x, -hop, mt, 3);
    }
    U.dot(E, xEnd - 1, -1, mt, 4); U.dot(E, xEnd - 2, -2, mt, 4); U.dot(E, xEnd - 2, 0, mt, 2);                           // 张开的断环
  }
  // 候选部件：hookHorns —— 一对前弯短角（远侧一只单独一个部件画在头之前，近侧一只画在头之后）：根 2×2、往上收、尖端往前钩 2 格
  const HORN = [[0, 0, 2], [1, 0, 2], [0, -1, 4], [1, -1, 3], [1, -2, 4], [2, -3, 4], [3, -3, 4]];
  function hookHorn(rg, far) {
    if (rg.lie === 2) return; E.part(); const F = Q.headFrame(rg, o, P.jaw), b = F.at(F.W * 0.5 - (far ? 1.4 : 0), -F.Hh + 0.7), x = R(b[0]), y = R(b[1]) - (far ? 1 : 0);
    for (const [dx, dy, tn] of HORN) U.dot(E, x + dx, y + dy, far ? m.boneFar : m.bone, far ? 0 : tn);
  }
  // 候选部件：splitMaw —— 裂到耳根的嘴（紧跟 quad.head 画，同一个部件）：嘴线从吻尖一路往后、微微上挑到耳根下，
  //   合嘴时下沿一排骨白尖牙；嘴角一格熔岩色，熔涎从嘴角往下挂 drip 格
  function mawCorner(rg, jaw) { const F = Q.headFrame(rg, o, jaw), u = -F.W * 0.45, v = F.prof(F.u0)[2] + (u - F.u0) * 0.35 + 0.5, p = F.at(u, v); return [R(p[0]), R(p[1])]; }
  function splitMaw(rg) {
    if (rg.lie === 2) return; const F = Q.headFrame(rg, o, P.jaw), uEnd = -F.W * 0.45, u0 = P.jaw ? F.uc + 0.3 : F.uT - 0.6;
    for (let u = u0; u >= uEnd - 0.01; u -= 0.5) { const v = F.prof(Math.max(u, F.u0))[2] + (u < F.u0 ? (u - F.u0) * 0.35 : 0) + 0.5, p = F.at(u, v); U.dot(E, p[0], p[1], m.ink, 0); }
    if (!P.jaw) for (const du of [1.3, 2.6, 3.9]) { const u = F.uT - du, p = F.at(u, F.prof(u)[2] + 1.5); U.dot(E, p[0], p[1], m.teeth, 4); }
    const c = mawCorner(rg, P.jaw); U.dot(E, c[0], c[1], LAVA[Math.max(2, P.lava)], 0);
    for (let k = 1; k <= P.drip; k++) U.dot(E, c[0], c[1] + k, m.glow, k === P.drip ? 3 : 2);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    if (P.chain === 2 && P.burn >= BURN_N) { brokenChain(rig, 0, dropPos(), P.drop === 2 && P.dsy === 0 ? 1 : 0); return; }
    Q.legs(E, rig, P, o, 1);
    Q.tail(E, rig, P, o);
    boneRidge(rig, P.ign);
    Q.body(E, rig, P, o); lavaHide(rig);
    if (P.chain !== 2) brokenChain(rig, P.chain, null, 0);
    Q.legs(E, rig, P, o, 0);
    hookHorn(rig, 1);
    Q.head(E, rig, P, o); splitMaw(rig);
    hookHorn(rig, 0);
    if (P.chain === 2) brokenChain(rig, 0, dropPos(), P.drop === 2 && P.dsy === 0 ? 1 : 0);
  }
  const dropPos = () => [COL0[0] + P.dsx, -P.dsy - (P.drop === 2 ? 0 : 2)];
  // 候选部件：burnAway —— 燃尽（烘焙后按列处理像素）：火线从尾端（本地 x = BURN_X0）往头推进 burn 格，
  //   火线后面删掉；火线处 1 格灰烬（暖灰 / 石灰交替）→ 1 格亮火 → 1–2 格暗火 → 1–2 格焦边；断链不烧
  function isChain(M, i, x, y, w, h) {
    const c = m.chain; if (M[i]) return M[i] === c;
    return (x + 1 < w && M[i + 1] === c) || (x > 0 && M[i - 1] === c) || (y + 1 < h && M[i + w] === c) || (y > 0 && M[i - w] === c);
  }
  function burnAway() {
    const s = hero, w = s.w, h = s.h, out = s.out, M = s.mat, fr = BURN_X0 + P.burn;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (out[i] === 255 || isChain(M, i, x, y, w, h)) continue;
      const d = x - s.ox - P.bx - fr + (B8[(y & 7) * 8 + (x & 7)] - 0.5) * 2.5;
      if (d < -2.5) out[i] = 255; else if (d < -1) out[i] = (x + y) & 1 ? 10 : 7; else if (d < 0) out[i] = 47; else if (d < 1.5) out[i] = 45; else if (d < 3 && M[i]) out[i] = 11;
    }
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.flash = P.flash; RIM.dq = P.dq;
    if (P.ign) { const sp = spikes(rig), a = sp[Math.max(0, Math.min(sp.length - 1, P.ign - 2))]; RIM.rx = a[0] + 2 + P.bx + hero.ox; RIM.ry = a[1] - a[2] - 1 + hero.oy; }
    else { RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; }
    bake(hero, RIM);
    if (P.burn > 0 && P.burn < BURN_N) burnAway();
  }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, ashAcc = 0, emberAcc = 0, lastGf = -9, lastIgn = 0, swT = 9, swK = 0, wrapT = 9;
  const DRIPS = new Float32Array(6), DRX = new Float32Array(6); let dripN = 0;
  const loc2scr = (x, y) => [scrX(x + P.bx), HY + y];
  const spikeTip = (i) => { const sp = spikes(rig), a = sp[Math.max(0, Math.min(sp.length - 1, i))]; return loc2scr(a[0] + 2, a[1] - a[2]); };
  const throatScr = () => { const c = colAt(rig); return loc2scr(R(c.cx + c.nx * (c.r + 0.8)), R(c.cy + c.ny * (c.r + 0.8))); };
  function drool(n) {                                                                                                 // 熔涎滴落：带重力落地，落地冒烟
    const [cx, cy] = loc2scr(corner[0], corner[1] + 1);
    for (let k = 0; k < n; k++) {
      spawnX(K_PHYS, cx + (k ? (Math.random() - 0.5) * 2 : 0), cy, (Math.random() - 0.5) * 6, 4 + k * 6, 0.9, R_FIRE, { g: 220, floor: HY, age0: 0.12 });
      if (dripN < DRIPS.length) { const dy = Math.max(1, HY - cy); DRIPS[dripN] = Math.sqrt(2 * dy / 220); DRX[dripN] = cx; dripN++; }
    }
  }
  function scrape(big) { const [px] = loc2scr(R(rig.legs[3].F[0]), 0); for (let i = 0; i < (big ? 6 : 3); i++) spawn(K_DUST, px - 1, HY, -12 - Math.random() * 26, -4 - Math.random() * 8, 0.3 + Math.random() * 0.25, FXI.dust); if (big) for (let i = 0; i < 4; i++) spawn(K_BURST, px - 1, HY - 1, -20 - Math.random() * 40, -16 - Math.random() * 30, 0.25 + Math.random() * 0.2, R_FIRE); }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT);
      releaseOrbit(40, 100, 0.3, 0.6);
      fx.wave(scrX(-4), HY, 1, DASH + 10, 3, R_FIRE, 0.7, 0);                                                         // 身后贴地一道火痕
      for (let i = 0; i < 8; i++) spawn(K_DUST, scrX(-8) + (Math.random() - 0.5) * 10, HY, -14 - Math.random() * 30, -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.28, 2); flash(0.05);
    }
  }
  const T_SCR = [2 / 12, 1, 22 / 12], T_DRIP = [14 / 12, 28 / 12], T_GUSH = 20 / 12, T_CSCR = [4 / 12, 8 / 12, 12 / 12], T_CDRIP = [7 / 12, 13 / 12];
  function onTime(s, t) {
    if (s === IDLE) { if (T_SCR.some((v) => near(v, t))) scrape(0); if (T_DRIP.some((v) => near(v, t))) drool(1); if (near(t, T_GUSH)) drool(3); }
    if (s === ATTACK && (near(t, T_H1) || near(t, T_H2))) {                                                        // 双爪交替撕：爪痕 + 血屑 + 火星
      const first = near(t, T_H1); swT = 0; swK = first ? 0 : 1;
      burst(DUMMY_X - 4, HY - (first ? 15 : 11), 10, 40, 110, 0.15, 0.4, FXI.impact, 8); burst(DUMMY_X - 4, HY - (first ? 15 : 11), 8, 30, 90, 0.2, 0.5, R_EL, 12);
      for (let i = 0; i < 3; i++) spawn(K_EMBER, DUMMY_X - 6 + Math.random() * 4, HY - 12 - Math.random() * 6, -6 + Math.random() * 12, -8 - Math.random() * 8, 0.4, R_FIRE);
      hitDummy(first ? 0 : 1, 1);
      if (first) sfx('swing', { kind: 'claw', w: 0.6 }); sfx('hit', { mat: 'flesh', w: first ? 0.55 : 0.65 });
    }
    if (s === CHARGE) { if (T_CSCR.some((v) => near(v, t))) { scrape(1); sfx('step', { w: 0.4 }); } if (T_CDRIP.some((v) => near(v, t))) drool(2); }
    if (s === CAST && near(t, T_CHIT)) {                                                                             // X 撕 + 断链甩出缠住 + 点燃
      const cx = DUMMY_X - 1, cy = HY - 14;
      fx.slash(DUMMY_X + 7, HY - 20, 13, -1.6, -2.9, R_EL, 0.35, 2, 2); fx.slash(DUMMY_X + 7, HY - 8, 13, -1.57, -0.25, R_EL, 0.35, 2, 2);
      fx.cross(cx, cy, 6, R_EL, 0.25, 2);
      const [tx, ty] = throatScr(); fx.link(tx + 2, ty, DUMMY_X - 4, HY - 13, R_CHAIN, 0.8, 1); wrapT = 0;
      burst(cx, cy, 26, 50, 140, 0.3, 0.7, R_EL, 14); burst(cx, cy, 10, 30, 90, 0.3, 0.6, FXI.impact, 10); ring(cx, cy, 1, R_EL);
      hitDummy(1, 1); dummyFx({ dur: 1.5, tint: 'fire' }); shake(0.14, 1);
      sfx('swing', { kind: 'claw', w: 0.7 }); sfx('impact', { pal: 'blood', w: 0.65 });
    }
    if (s === HURT && near(t, INCOMING)) { burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 80, 0.2, 0.45, R_ASH, 12); burst(HX + HIT_POINT[0], HY + HIT_POINT[1] - 3, 5, 20, 60, 0.3, 0.5, R_FIRE, 16); }
    if (s === DEATH && near(t, T_FALL)) {                                                                            // 趴倒落地：尘土 + 项圈崩开
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 12 + Math.random() * 26, HY, (Math.random() - 0.5) * 30, -4 - Math.random() * 10, 0.35 + Math.random() * 0.35, FXI.dust);
      const [tx, ty] = throatScr(); burst(tx, ty, 6, 20, 60, 0.2, 0.4, FXI.steel, 10);
      shake(0.12, 1); sfx('fall', { w: 0.55 });
    }
    if (s === DEATH && near(t, T_CLANK)) { const x = HX + COL0[0] + DROP.dx - 2; sfx('hit', { mat: 'metal', w: 0.2 }); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 4, 0.3, FXI.dust); }
    if (s === DEATH && near(t, T_BURN0)) { const [x] = loc2scr(BURN_X0 + 4, 0); burst(x, HY - 3, 10, 20, 60, 0.3, 0.6, R_FIRE, 16); sfx('impact', { pal: 'fire', w: 0.3 }); }
  }
  const T_CLANK = Math.ceil((INCOMING + DROP.at + DROP.dur) * 12 - 1e-6) / 12;
  const EVENTS = [[2 / 12, 1, 14 / 12, T_GUSH, 22 / 12, 28 / 12], [], [T_H1, T_H2], [4 / 12, 7 / 12, 8 / 12, 1, 13 / 12], [T_CHIT], [], [INCOMING], [T_FALL, T_CLANK, T_BURN0], []];
  function stepFX(dt, state, stT) {
    for (let k = 0; k < dripN; k++) {                                                                                // 熔涎落地冒烟
      DRIPS[k] -= dt;
      if (DRIPS[k] <= 0) { for (let j = 0; j < 3; j++) spawn(K_RISE, DRX[k] + (Math.random() - 0.5) * 3, HY - 1, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.5 + Math.random() * 0.4, R_SMOKE); spawn(K_STILL, DRX[k], HY, 0, 0, 0.4, R_FIRE); DRIPS[k] = DRIPS[dripN - 1]; DRX[k] = DRX[dripN - 1]; dripN--; k--; }
    }
    if (state === CHARGE) {
      const [cx, cy] = spikeTip(2);
      chargeAcc += dt * (10 + 22 * clamp01(stT / DUR[CHARGE]));                                                     // 熔血颗粒螺旋汇聚到背上
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 12 + Math.random() * 9; spawn(K_SPIRAL, cx, cy + 2, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (P.ign > lastIgn && (state === CHARGE || state === CAST)) { for (let i = lastIgn; i < P.ign; i++) { const [x, y] = spikeTip(i); burst(x, y, 5, 15, 45, 0.2, 0.4, R_FIRE, 20); } }
    lastIgn = P.ign;
    if (P.ign && Math.random() < dt * 6 * P.ign) { const [x, y] = spikeTip(Math.floor(Math.random() * P.ign)); spawn(K_EMBER, x, y - 1, (Math.random() - 0.5) * 6 - (state === CAST ? 12 : 0), -8 - Math.random() * 8, 0.4 + Math.random() * 0.2, R_FIRE); }
    if (state === CAST && stT < T_CHIT) { emberAcc += dt * 50; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_STILL, scrX(-4 - Math.random() * 12), HY, 0, 0, 0.3 + Math.random() * 0.3, R_FIRE); } }
    if (state === MOVE && P.gf !== lastGf) {                                                                         // 狂奔：每步身后 1 格熔岩余烬，断链末端扬 1–2 颗尘
      if (P.gf === 0 || P.gf === 2) {
        const [fx0] = loc2scr(P.gf === 0 ? -8 : -10, 0); spawn(K_STILL, fx0, HY, 0, 0, 0.45, R_FIRE); spawn(K_EMBER, fx0, HY - 1, (Math.random() - 0.5) * 6, -5 - Math.random() * 5, 0.35, R_FIRE);
        const [cx] = loc2scr(R(rig.C2.x - rig.C2.r - 6), 0); spawn(K_DUST, cx, HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.25, FXI.dust);
        sfx('step', { w: 0.45 });
      }
      lastGf = P.gf;
    }
    if ((state === IDLE || state === MOVE) && Math.random() < dt * 3) { const c = rig.C2; const [x, y] = loc2scr(R(c.x) + Math.round(Math.random() * 8), R(c.y) - 2); spawn(K_EMBER, x, y, (Math.random() - 0.5) * 6, -6 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_FIRE); }   // 熔岩纹飘出的火星
    if (state === DEATH && stT >= T_BURN0 && stT < T_BURN1) {                                                         // 火线处化灰飘升
      ashAcc += dt * 34; while (ashAcc >= 1) { ashAcc -= 1; const [x] = loc2scr(BURN_X0 + P.burn - 1, 0); spawn(K_RISE, x + (Math.random() - 0.5) * 3, HY - 1 - Math.random() * 9, (Math.random() - 0.5) * 8, -12 - Math.random() * 14, 0.7 + Math.random() * 0.6, Math.random() < 0.35 ? R_FIRE : R_ASH); }
    }
    if (state === DEATH && stT >= T_BURN1 - 0.4 && stT < DUR[DEATH]) { soulAcc += dt * 14; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, scrX(8 + Math.random() * 12), HY - 2 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.6, FXI.soul); } }
    swT += dt; wrapT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; ashAcc = 0; emberAcc = 0; lastGf = -9; lastIgn = 0; swT = 9; wrapT = 9; dripN = 0; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(R(rig.C1.x) + P.bx - 2), P.rim, EL, f12); }
  function fxMid() {                                                                                                  // 冲锋残影 1 层（暗血色剪影，落后 6 格）
    if (E.state === CAST && E.stT < T_CHIT) blitShape(hero, scrX(-6), HY, P.flip, EL[3], 0.35);
  }
  function fxFront(f12) {
    if (swT < 3 / 12) {                                                                                               // 爪痕：3 道平行斜线（第 1 帧亮，之后断续变暗）；第二爪低一截、往另一边斜
      const first = swT < 1 / 12, c = first ? EL[0] : swT < 2 / 12 ? EL[2] : EL[3], x0 = DUMMY_X - 8, y0 = HY - (swK ? 16 : 22), dir = swK ? -1 : 1;
      for (let k = 0; k < 3; k++) for (let j = 0; j <= 6; j++) { if (!first && ((j + k + f12) & 1)) continue; put(x0 + k * 3 + (dir > 0 ? (j >> 1) : 3 - (j >> 1)), y0 + j + k, j < 2 ? EL[1] : c); }
    }
    if (wrapT < 0.75) {                                                                                               // 断链缠住目标：两圈斜绕的链节（铁 → 血红，最后断续消散）
      const R_ = FXR[R_CHAIN], lv = wrapT < 0.1 ? 0 : wrapT < 0.3 ? 1 : wrapT < 0.55 ? 2 : 3;
      for (const [y0, sl] of [[HY - 16, 1], [HY - 10, -1]]) for (let dx = -5; dx <= 5; dx++) {
        if (lv === 3 && ((dx + f12) & 1)) continue; const y = y0 + R(dx * 0.3 * sl);
        put(DUMMY_X + dx, y, (dx & 1) ? R_[Math.min(4, lv + 1)] : R_[lv]); if (!(dx & 1)) put(DUMMY_X + dx, y + 1, R_[Math.min(4, lv + 2)]);
      }
    }
  }

  return {
    name: '邪犬', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.eye, m.flame].concat(LAVA), HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'collapse', pal: 'blood', style: 'fire', w: 0.65 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
