// 斗篷人（NPC · 黑市小游戏 G023 MINI.market 的摊主）：瘦高、比一般人形高一头的兜帽商人——
//   高尖兜帽（帽尖往后折、会甩），兜帽里看不见脸，只有两只发黄光的眼睛和一口金牙（笑的时候露出来）；
//   深紫黑斗篷，下摆撕成一条条（长短交错），背后那层拖到地；灯笼在左后上方，剪影左沿一道橙色轮廓光（插画 e_market 的样子）；
//   细长的手（长手指 + 金戒指），腰间钱袋、钥匙串，左手横握一卷蓝色高级图纸（木轴 + 红蜡封）。
// 待机（4 秒一循环）：右手长手指在左手背上敲（三连敲一停），眨眼，斗篷下摆慢慢摆；后半段越敲越急，眼睛一瞬变红（不耐烦）。
// 移动：双手仍叠在身前，贴地滑步，下摆拖地、往后拽出几缕暗影。
// 攻击「亮货」：抽出图纸举到肩后 → 往前一甩一拍，图纸哗地展开、下轴连蜡封拍在地上（命中）→ 举着给你看（图纸线条发光、露一颗金牙）→ 卷回手里。
// 技能「金牙低笑」：弓背搓手、肩膀一抖一抖（蓄力，金光往嘴里聚）→ 猛地仰头大笑，一口金牙一闪、金币闪光炸开，一枚金币弹到对面人脸上（施放）→ 笑声收住（收招）。
// 受击：被砍价砍狠了——往后一缩、双眼瞪大、一只手举起来挡，钱袋里蹦出一枚金币。
// 死亡：往后一踉跄、卷轴掉地 → 欠身行礼 → 从下摆开始化进暗影 → 只剩两只黄眼挂在黑暗里，眨一下，灭掉。
// 设定卡见 .ai/npc/BlackMarketDealer/design.md。
PCD.define('BlackMarketDealer', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round;

  // ───── 元素：技能 = 金币（coin），攻击 = 图纸蓝（frost 色阶），死亡 = 暗影（shadow）─────
  const R_EL = FXI.coin, EL = FXR[R_EL], R_BP = FXI.frost, BP = FXR[R_BP], R_SH = FXI.shadow;

  // ───── 材质（全部取自共享色板）─────
  const M = parts.mats(E, {
    cloak: { r: [0, 52, 53, 54], band: 2 },                   // 深紫黑斗篷（大面积）
    hood: [0, 52, 53, 54],                                    // 兜帽（小块，band 1）
    face: [0, 0, 0, 52],                                      // 兜帽里的黑洞
    eye: { r: [0, 14, 47, 51], flat: 1 },                     // 黄眼（发光体）：2 暗金 · 3 黄 · 4 淡金白
    eyeR: { r: [0, 56, 57, 58], flat: 1 },                    // 一瞬变红
    teeth: { r: [20, 19, 14, 5], flat: 1 }, glint: { r: [22, 22, 21, 21], flat: 1 },
    tunic: [0, 8, 20, 19], leather: [20, 19, 32, 33], pouch: [0, 20, 19, 32], gold: [20, 19, 14, 5], steel: [27, 28, 29, 30],
    pants: [0, 8, 9, 10], boot: 'boot', skin: [20, 19, 16, 15],
    paper: [0, 39, 40, 41], ink: { r: [39, 40, 41, 23], flat: 1 }, inkLit: { r: [39, 23, 22, 21], flat: 1 }, rod: 'wood', seal: 'crimson',
  });
  const BODY = { body: 'slim', leg: 12, torso: 11, head: 6, headW: 6, sw: 3, arm: 12, lw: 2, stride: 3, limb: 0.9, fall: 'front' };
  const HX = 76, DUR = DEFAULT_DUR.slice(); DUR[IDLE] = 4.0;
  const NI = RD(DUR[IDLE] * 12);                               // 待机循环 48 帧
  const hero = new Sprite(64, 50, 30, 45);
  const LAMP = [-16, -40];                                    // 灯笼（左后上方，本地坐标）：只决定橙色轮廓光的颜色，不是发光体
  // 眼睛 / 金牙映到帽沿上的金光：发光体在剪影里面（rimAll），半径压小，只照到兜帽开口附近
  // 色阶从奶油色起步（不用纯白）：待机只是暗金一点，蓄力金，施放奶油
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 3, 6, 8], rimRamp: [5, 14, 61], flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['face', 'eye', 'eyeR', 'teeth', 'glint', 'skin', 'gold', 'steel', 'leather', 'pouch', 'paper', 'ink', 'inkLit', 'rod', 'seal', 'boot', 'pants']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  // 灯笼轮廓光只落在布料、靴子上（手、图纸、眼、金牙不吃）
  const LAMPLIT = new Uint8Array(256); for (const k of ['cloak', 'hood', 'tunic', 'pants', 'boot']) { LAMPLIT[M[k]] = 1; LAMPLIT[M[k + 'D']] = 1; }

  // ───── 姿势 ─────
  // hx hy = 前手（右手），bhx bhy = 后手（左手，平时握卷轴）；sc 图纸形态：0 卷着在左手 · 1 右手斜举 · 2 举到肩后 · 3 展开拍地 · 4 展开亮货 · 5 卷一半 · 6 卷着在右手
  // hm 前手：0 敲手背 · 1 握轴 · 2 张开 · 3 搓手 · 4 按胸口；fing 敲的手指（bit0 后指抬起、bit1 前指抬起）
  // eye：0 正常 · 1 半睁 · 2 闭 · 3 瞪大 · 4 变红 · 5 笑眯 · 6 熄灭 · 7 最亮；mouth：0 闭 · 1 露一颗金牙 · 2 咧嘴 · 3 仰头大笑
  // tip 帽尖：-1 往前甩 · 0 垂 · 1 往后 · 2 往后飞；nod 低头；tilt 仰头；drop 掉落的卷轴：0 在手里 · 1 下落 · 2 弹地 · 3 躺着；sh 从下摆往上化进暗影
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, nod: 0, tilt: 0, sc: 0, hm: 0, fing: 0,
    step: 0, wup: 0, walk: 0, sway: 0, tph: 0, tip: 0, eye: 0, mouth: 0, gem: 0, glint: 0, rim: 0, flash: 0, bx: 0, drop: 0, sh: 0, dq: 0, st: 0,
    beard: 0, lying: 0, lift: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(6, -14, 5, -12);                           // 左手横握卷轴在小腹前，右手手掌搭在左手背上、两根长手指往前敲卷轴
  const K_GRAB = K(6, -20, 3, -13);                           // 右手抽出卷轴，往前上方斜举
  const K_WIND = K(0, -31, 1, -13, -1, -1);                   // 举到肩后，身子后仰
  const K_SLAP = K(10, -15, 3, -13, 1, 1, 1);                 // 往前一拍：图纸展开，下轴拍在地上
  const K_SHOW = K(10, -16, 3, -14, 1, 0);                    // 举着亮货
  const K_ROLL = K(8, -15, 5, -13, 0, 0);                     // 卷回来
  const K_RUB = K(7, -12, 6, -11, 1, 1, 1);                   // 蓄力：弓背低头搓手
  const K_LAUGH = K(8, -25, 4, -12, -1, -1);                  // 施放：仰头大笑，右手往上一甩
  const K_HURT = K(5, -21, 2, -13, -1, -1);                   // 受击：往后缩，右手举起挡
  const K_BOW = K(3, -19, -3, -13, 2, 1, 2);                  // 死亡：欠身，右手按胸口，左手背到身后
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['nod', 0, 1], ['tilt', 0, 1], ['sc', 0, 7], ['hm', 0, 7], ['fing', 0, 3]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['tph', 0, 3], ['tip', -1, 2], ['eye', 0, 7], ['mouth', 0, 3], ['gem', 0, 3], ['glint', 0, 1],
    ['rim', 0, 3], ['flash', 0, 1], ['bx', -16, 15], ['drop', 0, 3], ['sh', 0, 48, 48], ['dq', 0, 48, 48], ['st', 0, 8], ['beard', -2, 2]]);
  const T_SLAP = 3 / 12, T_SHOW = 4 / 12, T_DROP = INCOMING + 0.25, T_OUT = INCOMING + 2.4;
  const CALM = [3, 1, 0, 0, 0, 0];                            // 三连敲一停：两指抬起 → 前指落 → 后指落 → 停

  function poseAt(st, t, T) {
    const tq = q12(t), fi = f12of(t);
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.tph = 0; P.tip = 0; P.eye = 0; P.mouth = 0; P.gem = 0; P.glint = 0; P.rim = 1;
    P.flash = 0; P.drop = 0; P.sh = 0; P.dq = 0; P.bob = 0; P.nod = 0; P.tilt = 0; P.sc = 0; P.hm = 0; P.fing = 0; P.flip = 0; P.mx = 0; P.beard = 0;
    const idle = (tt) => {                                    // 4 秒循环：呼吸 0.5 s 一翻、下摆 2 s 一摆；三连敲；眨眼；后半段不耐烦
      setK(K_IDLE, K_IDLE, 0); const i = ((f12of(tt) % NI) + NI) % NI, b = Math.floor(i / 6);
      P.bob = b & 1; P.sway = [0, 1, 0, -1][b & 3]; P.beard = [0, 1, 0, -1][(b + 1) & 3]; P.tip = ((b + 1) & 2) ? 1 : 0; P.tph = (b >> 1) & 3;
      P.fing = CALM[i % 6];
      if (i === 14 || i === 16) P.eye = 1; else if (i === 15) P.eye = 2;                        // 眨眼
      if (i === 28 || i === 29) P.glint = 1;                                                    // 戒指被灯照得一闪
      if (i >= 36 && i < 46) { P.fing = [3, 1, 0][(i - 36) % 3]; P.head = 1; }                  // 不耐烦：越敲越急，头往前探
      if (i === 40) P.eye = 1; else if (i === 41) P.eye = 4;                                    // 眼睛一眯、一瞬变红
    };
    if (st === IDLE) idle(t);
    else if (st === MOVE) {                                   // 贴地滑步：双手仍叠在身前，下摆往后拖
      setK(K_IDLE, K_IDLE, 0); const f = gait(tq); parts.gait(P, f);
      P.sway = f & 1 ? -2 : -1; P.tph = f; P.tip = f & 1 ? 2 : 1; P.beard = -P.beard;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                               // 亮货
      if (fi === 0) idle(0);
      else if (fi === 1) { setK(K_GRAB, K_GRAB, 0); P.sc = 1; P.hm = 1; P.tip = 1; P.sway = 1; }
      else if (fi === 2) { setK(K_WIND, K_WIND, 0); P.sc = 2; P.hm = 1; P.eye = 1; P.tip = 2; P.sway = 1; P.beard = 1; }
      else if (fi === 3) { setK(K_SLAP, K_SLAP, 0); P.sc = 3; P.hm = 1; P.eye = 7; P.tip = -1; P.sway = -2; P.beard = -2; P.gem = 1; }
      else if (fi <= 6) { setK(K_SLAP, K_SHOW, ease.out((fi - 3) / 3)); P.sc = 4; P.hm = 1; P.mouth = 1; P.tip = fi === 4 ? -1 : 0; P.sway = -1; P.gem = fi <= 5 ? 2 : 1; }
      else if (fi === 7) { setK(K_SHOW, K_ROLL, 0.5); P.sc = 5; P.hm = 1; P.mouth = 1; P.gem = 1; }
      else { setK(K_ROLL, K_ROLL, 0); P.sc = 6; P.hm = 1; P.sway = 1; }
    } else if (st === CHARGE) {                               // 弓背搓手，肩膀一抖一抖，金牙慢慢露出来
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_RUB, q);
      P.hm = q > 0.3 ? 3 : 0; P.fing = (fi >> 1) & 1; P.eye = 5; P.mouth = tq < 0.5 ? 0 : tq < 0.9 ? 1 : 2;
      P.bob = tq > 0.5 ? fi & 1 : 0; P.tip = tq > 0.5 ? fi & 1 : 0; P.sway = tq > 0.9 ? ((fi & 1) ? -1 : 0) : 0; P.tph = (fi >> 2) & 3;
      P.gem = tq < 0.45 ? 1 : ((fi & 1) ? 2 : 1); P.rim = 2; P.glint = P.mouth === 2 ? fi & 1 : 0;
    } else if (st === CAST) {                                 // 猛地仰头大笑：金牙一闪，右手往上一甩
      setK(K_RUB, K_LAUGH, fi === 0 ? 0.65 : 1); P.tilt = 1; P.hm = 2; P.eye = 5; P.mouth = (fi >> 1) & 1 ? 2 : 3; P.bob = fi & 1;
      P.tip = 2; P.sway = -1; P.beard = -2; P.tph = fi & 3; P.gem = 3; P.rim = 3; P.glint = 1;
    } else if (st === RECOVER) {                              // 笑声收住：头低回来，金牙 3 → 1 → 0
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_LAUGH, K_IDLE, q);
      P.tilt = q < 0.3 ? 1 : 0; P.hm = q < 0.5 ? 2 : 0; P.mouth = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.eye = q < 0.3 ? 5 : 0;
      P.bob = fi === 2 || fi === 5 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.tip = q < 0.5 ? 1 : 0; P.glint = q < 0.3 ? 1 : 0;
    } else if (st === HURT) {                                 // 被砍狠了：往后一缩、双眼瞪大、手举起来挡
      const h = tq - INCOMING;
      if (h < 0) idle(t);
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eye = 3; P.tip = -1; P.sway = 2; P.beard = 2; P.hm = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = P.flash ? 0 : 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eye = 3; P.sway = 1; P.beard = 1; P.hm = 2; }
      else { setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); P.eye = h < 0.42 ? 3 : 0; }
    } else if (st === DEATH) {                                // 踉跄 → 欠身 → 从下摆化进暗影 → 只剩两只眼 → 灭
      const d = tq - INCOMING;
      if (d < 0) idle(t);
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eye = 3; P.tip = -1; P.sway = 2; P.beard = 2; P.hm = 2; P.flash = d < 1 / 12 ? 1 : 0; P.rim = P.flash ? 0 : 1;
        P.crouch = d < 0.15 ? 0 : 1; P.drop = d < 0.1 ? 0 : d < 0.2 ? 1 : 2; }
      else if (d < 0.5) { setK(K_HURT, K_BOW, ease.inOut(clamp01((d - 0.3) / 0.2))); P.bx = -1; P.hm = 4; P.eye = 1; P.nod = d >= 0.42 ? 1 : 0; P.drop = 3; P.sway = 1; P.tip = 0; }
      else {
        setK(K_BOW, K_BOW, 0); P.bx = -1; P.hm = 4; P.nod = 1; P.drop = 3; P.tip = 1; P.eye = d < 1.1 ? 1 : 0;
        if (d >= 1.1) P.sh = clamp01((d - 1.1) / 0.9);
        if (d >= 2.08) P.eye = d < 2.17 ? 2 : d < 2.25 ? 7 : d < T_OUT - INCOMING ? 1 : 6;       // 只剩两只眼：眨一下、亮一下、半闭、熄灭
        P.rim = d < T_OUT - INCOMING ? 1 : 0;
      }
    } else if (st === REVIVE) {                               // 黑暗里先亮起两只眼，再从头往下显形
      idle(0); P.bob = 0;
      if (tq < 0.3) { P.sh = 1; P.eye = tq < 0.1 ? 6 : tq < 0.2 ? 1 : 0; }
      else if (tq < 0.85) P.sh = 1 - (tq - 0.3) / 0.55;
      else P.glint = 1;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.hm === 0) { P.hx = P.bhx + 1; P.hy = P.bhy - 2; }                                      // 敲：右手掌总是搭在左手背上
    else if (P.hm === 3) { P.hx = P.bhx + (P.fing & 1); P.hy = P.bhy - 2; }                      // 搓手：右手在左手背上来回 1 格
    P.hy += P.bob; P.bhy += P.bob;
    if (P.eye === 2 || P.eye === 6) P.rim = 0;                                                     // 闭眼 / 熄灭时帽沿上的金光也没了
    const R = parts.rig(P, BODY), H = headBox(R);
    if (P.sc === 3 || P.sc === 4) { P.gx = P.hx + 3 + P.bx; P.gy = P.hy + 7; }                   // 发光体挂点：亮货时 = 图纸中心
    else if (P.mouth || st === CHARGE || st === CAST) { P.gx = H.cx + 2 + P.bx; P.gy = H.ey + 2; }  // 笑的时候 = 金牙
    else { P.gx = H.cx + 2 + P.bx; P.gy = H.ey; }                                                // 平时 = 两眼中间
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画 ─────
  const headBox = (R) => ({ cx: R.hx + P.nod - P.tilt, T: R.htop + P.nod, hy: R.hy + P.nod, ey: R.ey + P.nod - P.tilt });
  let R = null;
  const X = (x, y, m, t) => parts.px(E, R, x, y, m, t);
  const RUN = (y, a, b, m, t) => parts.run(E, R, y, a, b, m, t);
  const STRIP = [4, 1, 3, 0, 5, 2, 3, 1];                    // 破条下摆：2 格一条，长短交错（相邻条至少差 2 格，剪影上看得出锯齿）
  function strips(x0, x1, y, m, scale) {
    for (let x = x0; x <= x1; x++) {
      const g = Math.floor((x - RD(P.sway) + P.tph * 2 + 64) / 2), len = RD(STRIP[g & 7] * scale);
      if (len === 0) { X(x, y, 0, 0); continue; }
      for (let k = 1; k <= len; k++) X(x, y + k, m, k === len ? 2 : 0);
    }
  }
  // 背后那层长披风：从肩后往后外扩，下摆破条拖到地
  function backCape() {
    E.part(); const top = R.yS - 1, bot = -5, n = bot - top, sw = P.sway; let L0 = 0, R0 = 0;
    for (let y = top; y <= bot; y++) {
      const t = (y - top) / n, e = parts.edges(R, Math.max(R.yS, Math.min(y, R.yHip)));
      const L = RD(e[0] - 1 - 6 * Math.pow(t, 1.15) + sw * t * t - (P.walk ? t * 1.5 : 0)), Rr = e[0] + 3;
      RUN(y, L, Rr, M.cloakD, 0); if (t > 0.3 && y < bot) { X(L + 2 + RD(t), y, M.cloakD, 2); if (t > 0.6) X(L + 5, y, M.cloakD, 2); }
      if (y === bot) { L0 = L; R0 = Rr; }
    }
    strips(L0, R0, bot, M.cloakD, 1);
  }
  // 身前的斗篷：往后外扩，两道竖褶；前襟开口露出内衣和皮带；下摆破条到小腿
  function bodyCloak() {
    E.part(); const yS = R.yS, hem = -6, n = hem - yS, sw = P.sway; let L0 = 0, R0 = 0;
    for (let y = yS; y <= hem; y++) {
      const t = (y - yS) / n, e = parts.edges(R, Math.min(y, R.yHip)), s = sw * t * t;
      const L = RD(e[0] - 1 - 2.5 * Math.pow(t, 1.1) + s), Rr = RD(e[1] + 1 + 1.2 * t + s * 0.5);
      RUN(y, L, Rr, M.cloak, 0);
      if (t > 0.45 && y < hem) { X(L + 2 + RD(t), y, M.cloak, 2); X(RD((L + Rr) / 2) + 1, y, M.cloak, 2); }
      if (y >= yS + 2 && y <= R.yHip) { X(Rr - 1, y, M.tunic, 0); X(Rr, y, M.tunic, 0); }
      if (y === R.yWaist) { X(Rr - 2, y, M.leather, 3); X(Rr - 1, y, M.leather, 4); X(Rr, y, M.gold, 3); }   // 皮带 + 铜扣
      if (y === hem) { L0 = L; R0 = Rr; }
    }
    strips(L0, R0, hem, M.cloak, 0.8);
  }
  // 后腰的皮钱袋：金色袋口绳，鼓成一团，随步子晃
  function purse(x, y) {
    E.part(); const b = RD(P.beard * 0.5);
    X(x, y, M.gold, 4); X(x + 1, y, M.gold, 2);
    RUN(y + 1, x + b, x + 1 + b, M.pouch, 0);
    RUN(y + 2, x - 1 + b, x + 2 + b, M.pouch, 0); RUN(y + 3, x - 1 + b, x + 2 + b, M.pouch, 0);
    RUN(y + 4, x + b, x + 1 + b, M.pouch, 2); X(x - 1 + b, y + 2, M.pouch, 4);
  }
  // 兜帽后层：高尖顶（往后倾、帽尖折下来会甩）+ 包住后脑 + 连着一圈披肩
  const CROWN = [[-1, -3, 2], [-2, -3, 1], [-3, -4, 0], [-4, -4, -1], [-5, -5, -2], [-6, -6, -4]];
  function hoodBack(H) {
    E.part(); const cx = H.cx, T = H.T, m = M.hood, bk = P.tilt;
    for (const [dy, a, b] of CROWN) { const s = dy <= -4 ? bk : 0; RUN(T + dy, cx + a - s, cx + b - s, m, 0); }
    const ty = T - 6, tx = cx - 6 - bk;
    if (P.tip < 0) { X(tx + 1, ty - 1, m, 0); X(tx + 2, ty - 1, m, 4); }                                  // 往前甩：帽尖翘起来
    else if (P.tip === 0) { X(tx - 1, ty, m, 0); X(tx - 1, ty + 1, m, 2); }                               // 软软地垂在脑后
    else if (P.tip === 1) { X(tx - 1, ty, m, 0); X(tx - 2, ty + 1, m, 2); }
    else { X(tx - 1, ty, m, 0); X(tx - 2, ty, m, 0); X(tx - 3, ty - 1, m, 2); }                          // 往后飞
    for (let y = T; y <= H.hy + 1; y++) RUN(y, cx - 4 - (y > H.ey ? 1 : 0), cx + 1, m, 0);
    X(cx - 1, T - 2, m, 2); X(cx - 2, T - 3, m, 2); X(cx - 3, T + 2, m, 2); X(cx - 3, T + 3, m, 2);         // 帽身折痕
    const y0 = R.yS;                                                                                       // 披肩
    for (let k = 0; k < 5; k++) { const y = y0 + k, e = parts.edges(R, y); RUN(y, e[0] - 2 - (k >= 2 ? 1 : 0), e[1] + (k < 3 ? 2 : 1), m, 0); }
    { const y = y0 + 5, e = parts.edges(R, y); for (let x = e[0] - 3; x <= e[1]; x++) if (((x - RD(P.sway)) & 1) === 0) X(x, y, m, 2); }
    X(parts.edges(R, y0 + 2)[0], y0 + 2, m, 2); X(parts.edges(R, y0 + 3)[0] - 1, y0 + 3, m, 2);
  }
  // 脸：一个黑洞，两只黄眼（近眼略暗、远眼更亮），金牙（和黑洞同一个部件，没有分界线）
  function headVoid(H) {
    E.part(); const cx = H.cx, ey = H.ey, bot = H.hy + (P.mouth === 3 ? 1 : 0);
    for (let y = H.T - P.tilt; y <= bot; y++) RUN(y, cx - 2, cx + 3, M.face, 0);
    const a = cx + 1, b = cx + 3, e = P.eye;
    if (e === 0) { X(a, ey, M.eye, 3); X(b, ey, M.eye, 4); }
    else if (e === 1) { X(a, ey, M.eye, 2); X(b, ey, M.eye, 2); }
    else if (e === 3) { X(a, ey - 1, M.eye, 4); X(a, ey, M.eye, 3); X(b, ey - 1, M.eye, 4); X(b, ey, M.eye, 4); }
    else if (e === 4) { X(a, ey, M.eyeR, 3); X(b, ey, M.eyeR, 4); }
    else if (e === 5) { X(a, ey, M.eye, 2); X(b, ey, M.eye, 3); X(b - 1, ey - 1, M.eye, 2); }
    else if (e === 7) { X(a, ey, M.eye, 4); X(b, ey, M.eye, 4); }
    const my = ey + 2, mo = P.mouth;
    if (mo === 1) X(cx + 3, my, M.teeth, 3);
    else if (mo >= 2) { X(cx + 1, my, M.teeth, 4); X(cx + 2, my, M.teeth, 3); X(cx + 3, my, M.teeth, 4); if (mo === 3) { X(cx, my, M.teeth, 3); X(cx + 2, my + 2, M.teeth, 3); X(cx + 3, my + 2, M.teeth, 2); } }
    if (P.glint && mo >= 2) X(cx + 3, my, M.glint, 4);
  }
  // 兜帽前层：鸟喙前檐、侧片（压出开口的折线）、远侧帽沿把脸框住
  function hoodFront(H) {
    E.part(); const cx = H.cx, T = H.T - P.tilt, m = M.hood;
    RUN(T, cx - 1, cx + 4, m, 0); X(cx + 4, T + 1, m, 0); X(cx + 5, T + 1, m, 3);
    for (let y = H.T + 1; y <= H.hy + 1; y++) RUN(y, cx - 2, cx - 1, m, 0);
    for (let y = T + 2; y <= H.hy - 1 + (P.mouth === 3 ? 1 : 0); y++) X(cx + 4, y, m, 0);
  }
  // 图纸：卷着（横 / 斜 / 肩后）或展开（8×12 蓝纸 + 上下木轴 + 蜡封；纸上画剑、齿环、小人、一行字）
  function rolledH(x0, y) {                                   // 横着的卷轴：x0 … x0+10，两行厚，两头木轴，蜡封在第 8 格
    E.part(); X(x0, y, M.rod, 3); X(x0, y + 1, M.rod, 2); X(x0 + 10, y, M.rod, 3); X(x0 + 10, y + 1, M.rod, 2);
    RUN(y, x0 + 1, x0 + 9, M.paper, 0); RUN(y + 1, x0 + 1, x0 + 9, M.paper, 0);
    X(x0 + 8, y, M.seal, 4); X(x0 + 8, y + 1, M.seal, 3); X(x0 + 8, y + 2, M.seal, 2);
  }
  function rolledD(hx, hy) {                                  // 斜着（45°，从右手往前上方伸出去）
    E.part();
    for (let k = -1; k <= 8; k++) { const cap = k === -1 || k === 8, m = cap ? M.rod : M.paper; X(hx + k, hy - k, m, cap ? 3 : 0); X(hx + k + 1, hy - k, m, cap ? 2 : 0); }
    X(hx + 5, hy - 5, M.seal, 4); X(hx + 6, hy - 5, M.seal, 3);
  }
  function rolledBack(hx, hy) {                               // 举在肩后：从右手往后横伸
    E.part(); X(hx - 9, hy, M.rod, 3); X(hx - 9, hy + 1, M.rod, 2); X(hx + 1, hy, M.rod, 3); X(hx + 1, hy + 1, M.rod, 2);
    RUN(hy, hx - 8, hx, M.paper, 0); RUN(hy + 1, hx - 8, hx, M.paper, 0); X(hx - 6, hy, M.seal, 4); X(hx - 6, hy + 1, M.seal, 3);
  }
  const GLYPH = [[2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [1, 6], [3, 6], [2, 9, 3],   // 剑
    [4, 2], [5, 2], [6, 2], [4, 3], [6, 3], [4, 4], [5, 4], [6, 4],                                // 齿环
    [5, 6, 4], [5, 7], [5, 8], [4, 7], [6, 7], [4, 9], [6, 9],                                    // 小人
    [1, 11], [3, 11], [4, 11], [6, 11]];                                                          // 一行字
  function sheet(hx, hy, L) {
    E.part(); const lit = P.sc === 4 && P.gem >= 2, g = lit ? M.inkLit : M.ink;
    RUN(hy, hx - 1, hx + 8, M.rod, 0); X(hx - 2, hy, M.rod, 3); X(hx + 9, hy, M.rod, 2);
    for (let y = hy + 1; y <= hy + L; y++) RUN(y, hx, hx + 7, M.paper, 0);
    for (const [c, r, tn] of GLYPH) if (r <= L) X(hx + c, hy + r, g, tn || (lit ? 3 : 4));
    const yb = hy + L + 1; RUN(yb, hx - 1, hx + 8, M.rod, 0); X(hx - 2, yb, M.rod, 3); X(hx + 9, yb, M.rod, 2);
    X(hx + 3, yb + 1, M.seal, 3); X(hx + 4, yb + 1, M.seal, 2); if (L >= 12) X(hx + 4, yb + 2, M.seal, 2);
  }
  function scroll() {
    if (P.drop) {                                             // 死亡：从手里掉下、弹一下、躺在地上（贴地坐标，不跟身体的 bx 走）
      const DX = [0, 3, 6, 7][P.drop] - P.bx, DY = [0, -8, -3, -1][P.drop]; rolledH(DX, DY); return;
    }
    const s = P.sc;
    if (s === 0) rolledH(P.bhx - 3, P.bhy);
    else if (s === 1) rolledD(P.hx, P.hy);
    else if (s === 2) rolledBack(P.hx, P.hy);
    else if (s === 3 || s === 4) sheet(P.hx, P.hy, 12);
    else if (s === 5) sheet(P.hx, P.hy, 5);
    else if (s === 6) rolledH(P.hx - 3, P.hy);
  }
  // 左手：握着卷轴（上下包住 + 戒指）· 空手（2×2 + 一根垂下的长指）· 欠身时背在身后（不画）
  function backHand() {
    const x = P.bhx, y = P.bhy;
    if (P.hm === 4) return;
    E.part();
    if (P.sc === 0 && !P.drop) { RUN(y - 1, x - 1, x, M.skin, 0); RUN(y, x - 1, x, M.skin, 0); RUN(y + 1, x - 1, x, M.skin, 2); X(x - 1, y - 1, M.skin, 4); X(x - 1, y, M.gold, P.glint ? 4 : 3); }
    else { RUN(y - 1, x - 1, x, M.skin, 0); RUN(y, x - 1, x, M.skin, 0); X(x - 1, y - 1, M.skin, 4); X(x + 1, y, M.skin, 0); X(x + 1, y + 1, M.skin, 2); }
  }
  // 右手：2×2 手掌 + 细长手指 + 戒指（x, y = 手掌右下角）
  function frontHand() {
    const x = P.hx, y = P.hy, m = M.skin, hm = P.hm; E.part();
    X(x - 1, y - 1, m, 4); X(x, y - 1, m, 0); X(x - 1, y, m, 0); X(x, y, m, 0);
    if (hm === 0 || hm === 3) {                               // 敲 / 搓：两根长手指像蜘蛛腿一样搭在卷轴上——一根直垂、一根斜着往前伸；抬起的那根离开 1 格
      const ua = hm === 0 ? P.fing & 1 : 0, ub = hm === 0 ? (P.fing >> 1) & 1 : 0;
      X(x + 1, y - 1, m, 0); X(x + 2, y - 1, m, 0);
      X(x + 1, y, m, 0); if (!ua) X(x + 1, y + 1, m, 2);
      X(x + 3, y, m, 0); X(x + 4, y + 1 - ub, m, ub ? 0 : 2);
      X(x + 1, y, M.gold, P.glint ? 4 : 3);                   // 戒指戴在直垂那根手指根上
    } else if (hm === 1) { X(x + 1, y - 1, m, 0); X(x + 1, y, m, 2); X(x, y - 1, M.gold, 3); }                                  // 握轴
    else if (hm === 2) {                                                                                                     // 张开：三根长指扇开
      X(x - 1, y - 2, m, 0); X(x - 1, y - 3, m, 4); X(x + 1, y - 2, m, 0); X(x + 2, y - 3, m, 4); X(x + 1, y, m, 0); X(x + 2, y + 1, m, 3); X(x + 1, y - 2, M.gold, 3);
    }
    else { X(x + 1, y - 1, m, 0); X(x + 1, y, m, 2); X(x, y - 1, M.gold, 3); }                                               // 按胸口
  }
  let headCX = 0;
  function drawHero() {
    E.begin(hero, P.bx, 0); R = parts.rig(P, BODY); const H = headBox(R);
    backCape();
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.cloakD, grip: 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD, bootH: 3 });
    bodyCloak();
    parts.pendant(E, R, P, { style: 'keys', mat: M.steel, trim: M.steel, x: parts.edges(R, R.yWaist)[1] - 3, y: R.yWaist + 1 });
    purse(parts.edges(R, R.yWaist)[0], R.yWaist + 1);
    hoodBack(H); headCX = H.cx; headVoid(H); hoodFront(H);
    scroll();
    backHand();
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.cloak, cuff: M.tunic, grip: 'none' });
    frontHand();
  }
  // 烘焙：引擎的明暗 / 分界线 / 勾线 / 眼睛映到帽沿的金光 → 灯笼橙色轮廓光（左沿）→ 从下摆往上化进暗影（眼睛最后留下）
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    const o = hero.out, Mt = hero.mat, w = hero.w, h = hero.h;
    if (!P.flash) {                                           // 灯笼轮廓光：只照外轮廓朝左（左边 3 格都是空的）的布料，和朝上、在头中线后面的帽顶
      const lx = LAMP[0] + hero.ox + P.bx, ly = LAMP[1] + hero.oy, cxb = headCX + hero.ox + P.bx - 1;
      for (let y = 1; y < h; y++) for (let x = 3; x < w; x++) {
        const i = y * w + x, m = Mt[i]; if (!m || !LAMPLIT[m] || o[i] === 255) continue;
        const left = !Mt[i - 1] && !Mt[i - 2] && !Mt[i - 3], up = !Mt[i - w] && !Mt[i - w - 1] && x < cxb;
        if (!left && !up) continue;
        const d = Math.hypot(x - lx, y - ly); if (d < 19) o[i] = 46; else if (d < 31) o[i] = 45;
      }
    }
    if (P.sh > 0) {                                           // 从下摆往上化进暗影：前沿先变成最暗的影子色再删掉；眼睛不删
      let top = h, bot = -1; for (let i = 0; i < w * h; i++) if (o[i] !== 255) { const y = (i / w) | 0; if (y < top) top = y; if (y > bot) bot = y; }
      const span = Math.max(1, bot - top), th = P.sh * 1.08;
      for (let y = top; y <= bot; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (o[i] === 255) continue; const m = Mt[i]; if (m === M.eye || m === M.eyeR) continue;
        const v = B8[(y & 7) * 8 + (x & 7)] * 0.3 + (bot - y) / span * 0.7;
        if (v < th) o[i] = 255; else if (v < th + 0.06) o[i] = 52;
      }
    }
  }

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, smokeAcc = 0, lastStep = 0;
  const wx = (x) => scrX(x);
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = HY + P.gy;
    releaseOrbit(40, 95, 0.3, 0.7); burst(gx, gy, 26, 60, 130, 0.25, 0.65, R_EL, 12); fx.cross(gx + 1, gy, 6, R_EL, 0.3); ring(gx, gy, 1, R_EL);
    for (let i = 0; i < 4; i++) spawnX(K_PHYS, gx, gy, (i - 1.5) * 18 + 10, -70 - i * 12, 0.9, R_EL, { g: 260, floor: HY - 1 });   // 四枚金币往上抛，落地
    shoot(2, gx + 2, gy, 120, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.12, 0.3] } });                                    // 一枚金币打着转弹向对面
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SLAP) {                       // 往前一拍：斩击弧 + 下轴拍地
      fx.slash(HX + 2, HY - 21, 12, -1.4, 2.1, R_BP, 0.17, 2, 2);
      const fx0 = HX + K_SLAP.hx + 3, fy = HY - 1;
      for (let i = 0; i < 6; i++) spawn(K_DUST, fx0 + (Math.random() - 0.5) * 10, fy, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.3 + Math.random() * 0.3, FXI.dust);
      burst(fx0 + 1, HY - 9, 10, 30, 80, 0.2, 0.45, R_BP, 10); hitDummy(0, 1);
      sfx('swing', { kind: 'smash', w: 0.3 }); sfx('hit', { mat: 'wood', w: 0.3 });
    }
    if (s === ATTACK && t === T_SHOW) fx.cross(HX + K_SHOW.hx + 4, HY + K_SHOW.hy + 6, 4, R_BP, 0.25);   // 亮货：图纸上闪一下
    if (s === HURT && t === INCOMING) spawnX(K_PHYS, wx(-2), HY - 12, -30, -60, 0.8, R_EL, { g: 260, floor: HY - 1 });   // 钱袋里蹦出一枚金币
    if (s === DEATH && t === T_DROP) { for (let i = 0; i < 4; i++) spawn(K_DUST, wx(8 + Math.random() * 6), HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); sfx('hit', { mat: 'wood', w: 0.2 }); }
    if (s === DEATH && t === T_OUT) { const R0 = parts.rig(P, BODY), H = headBox(R0); for (const ex of [1, 3]) spawn(K_RISE, wx(H.cx + ex + P.bx), HY + H.ey, (Math.random() - 0.5) * 4, -10 - Math.random() * 6, 0.7, FXI.fire); }   // 眼睛熄灭：两点火星往上飘
  }
  const EVENTS = [[], [], [T_SLAP, T_SHOW], [], [], [], [INCOMING], [T_DROP, T_OUT], []];
  function impactOn(k, x, y) {
    if (k !== 2) return;
    burst(x, y, 30, 50, 130, 0.3, 0.7, R_EL, 14); ring(x, y, 1, R_EL); fx.cross(x, y, 6, R_EL, 0.3);
    hitDummy(1, 1); dummyFx({ dur: 1.4, stun: 1 }); shake(0.12, 1); sfx('impact', { pal: 'coin', w: 0.6 });
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = HY + P.gy;
    if (state === CHARGE) { chargeAcc += dt * (20 + 30 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); } }
    if (state === MOVE) {
      if (P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.3 }); spawn(K_DUST, wx(P.step > 0 ? 3 : -3), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.25 + Math.random() * 0.15, FXI.dust); } lastStep = P.step; }
      smokeAcc += dt * 14; while (smokeAcc >= 1) { smokeAcc -= 1; spawnX(K_DUST, wx(-8 - Math.random() * 4), HY - 1 - Math.random() * 3, (P.flip ? 1 : -1) * (8 + Math.random() * 10), -2 - Math.random() * 3, 0.4 + Math.random() * 0.3, R_SH, { age0: 0.3 }); }
    }
    if (state === IDLE) { smokeAcc += dt * 1.6; while (smokeAcc >= 1) { smokeAcc -= 1; spawnX(K_DUST, wx(-9 + Math.random() * 12), HY - 1, (Math.random() - 0.5) * 6, -2 - Math.random() * 3, 0.6 + Math.random() * 0.4, R_SH, { age0: 0.35 }); } }
    if (state === RECOVER) { emberAcc += dt * 7; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + RD(Math.random() * 2 - 1), gy - 1, Math.random() * 8 - 4, -7 - Math.random() * 8, 0.5 + Math.random() * 0.5, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.1 && stT < INCOMING + 2.05) {   // 化进暗影：消散前沿冒暗影烟
      smokeAcc += dt * 34; const q = clamp01((stT - INCOMING - 1.1) / 0.9), fy = HY - 1 - q * 34;
      while (smokeAcc >= 1) { smokeAcc -= 1; spawn(K_RISE, wx(-8 + Math.random() * 16), fy + Math.random() * 3, (Math.random() - 0.5) * 6, -10 - Math.random() * 14, 0.6 + Math.random() * 0.6, R_SH); }
    }
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; smokeAcc = 0; lastStep = 0; }
  function fxBack(f12) {
    if (P.sh < 1 && P.rim >= 2) floorGlow(wx(P.gx), P.rim, EL, f12);
    if (P.sc === 4 && P.gem >= 2) floorGlow(wx(P.gx), 2, BP, f12);
    shotFloorGlow(f12);
  }
  function fxFront(f12) {
    if (P.sh >= 1 || P.mouth < 2 || P.gem < 2) return;       // 金牙闪光的十字星芒（蓄满闪、施放最大）
    const gx = wx(P.gx + 1), gy = HY + P.gy, L = P.gem === 3 ? 4 : 2 + (f12 & 1);
    for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
  }
  function drawShot(k, x, y, d, f12, Rr) {                    // 打着转的金币：正面 → 侧 → 立起来 → 侧
    if (k !== 2) return false;
    const ph = (f12 >> 1) & 3;
    if (ph === 0) { put(x, y - 1, Rr[1]); put(x - 1, y, Rr[1]); put(x, y, Rr[0]); put(x + 1, y, Rr[2]); put(x, y + 1, Rr[3]); put(x - 1, y - 1, Rr[2]); put(x + 1, y - 1, Rr[2]); put(x - 1, y + 1, Rr[2]); put(x + 1, y + 1, Rr[3]); }
    else if (ph === 2) { put(x, y - 1, Rr[1]); put(x, y, Rr[0]); put(x, y + 1, Rr[2]); }
    else { put(x, y - 1, Rr[1]); put(x, y, Rr[1]); put(x, y + 1, Rr[2]); put(x + d, y - 1, Rr[2]); put(x + d, y, Rr[2]); put(x + d, y + 1, Rr[3]); }
    if (f12 & 1) put(x - d, y - 2, Rr[0]);
    return true;
  }

  return {
    name: '斗篷人', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye, M.eyeR, M.glint, M.inkLit], HIT_POINT: [1, -18], EVENTS,
    SFX: { body: 'flesh', how: 'dissolve', pal: 'coin', style: 'coin', w: 0.5 },
    REVIVE: { dy: -26, ramp: R_SH },
    SHEET: [[IDLE, [0, 1 / 12, 2 / 12, 6 / 12, 14 / 12, 15 / 12, 28 / 12, 36 / 12, 37 / 12, 40 / 12, 41 / 12]], [MOVE, [0, 1 / 6, 2 / 6, 3 / 6]], [ATTACK, null], [CHARGE, 'step2'], [CAST, null], [RECOVER, 'step2'], [HURT, 'hurt'],
      [DEATH, [0.34, 0.45, 0.6, 0.9, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3, 2.42, 2.5, 2.6, 2.75]], [REVIVE, [0.05, 0.25, 0.45, 0.65, 0.9]]],
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
