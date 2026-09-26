// 灵魂战士（部队 · 恶魔 · 先锋 · 传说）：先祖战士（AncestorWarrior.js）的最终级——同一个先祖从坟里长成披甲英雄：
// 赤血色板甲 + 金甲缘、赤甲面盔两侧一对向后掠的骨白王角、面盔后垂下同款白辫；左手（远侧）一面赤甲镶边的碑形塔盾（碑面青绿魂火符文），
// 右手（近侧）传说之剑——剑根还是那截锈断剑，上半截由墓火魂刃接续；肩甲缝里窜出两条魂火飘带向后飞。
// 攻击 = 劈（塔盾护身，单手把传说之剑举过头顶竖直下劈）；技能 = 特性「浅坟」升级版：剑插进地里，魂火沿剑身往上爬、赤甲甲片浮起散开 →
// 墓火光柱从天而降落在剑上、甲片磁吸回身 → 拔剑十字墓火斩 + 前方地裂。死亡 = 散架空甲（面盔、肩甲、塔盾、剑各自飞出），空甲里一团墓火升起后熄灭。
PCD.define('SoulWarrior', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_EMBER, K_SPIRAL_PT,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, sfx } = E;
  const RD = Math.round, PI = Math.PI, px = parts.px;

  // ───── 元素：墓火 · 青绿（升级线共用）─────
  const R_EL = fxRamp('grave', [21, '#d4f6e4', '#62d0a4', '#2a7462', '#10302a']), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    plate: { r: 'blood', band: 2 }, gold: 'gold', horn: 'bone', braid: 'white', bead: 'bone',
    stone: 'stone', rim: 'blood', iron: 'iron', rust: 'leather', wrap: [20, 7, 6, 5], belt: 'boot',
    glow: { r: ['#10302a', '#2a7462', '#62d0a4', '#d4f6e4'], flat: 1 },     // 墓火（魂刃、碑纹、甲缝、飘带、盔缝眼光；发光体）
  });
  const BODY = { body: 'heroic', stride: 4, fall: 'back' };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 62, 42, 56);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 15, 21], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['glow', 'wrap', 'horn', 'braid', 'bead', 'rust']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手（近侧）= 传说之剑；后手（远侧）= 碑形塔盾（盾底 = 后手 y + TG）─────
  const TG = 7;
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, glyph: 0, plates: 0, pfl: 0, climb: 0, seam: 1, noSh: 0,
    tipx: 0, tipy: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(4, -14, -1.18, 9, -7);                // 剑扛在肩上（魂刃向后上方伸出），塔盾立在身前
  const K_WIND = K(2, -29, -0.2, 9, -9, -1, -1);         // 单手把剑举过头顶
  const K_STRIKE = K(12, -19, 2.36, 9, -8, 1, 1, 1);     // 竖直下劈到前下方
  const K_HOLD = K(12, -15, 2.75, 9, -8, 1, 0, 1);
  const K_PLANT = K(11, -12, PI, 1, -8, 1, 1, 2);        // 技能：剑插进塔盾前方的地里，手按剑柄；塔盾收到身前
  const K_RAISE = K(3, -30, -0.1, 9, -9, -1, -1);        // 拔剑举起
  const K_CUT = K(12, -15, 2.1, 9, -8, 1, 1, 1);
  const K_HURT = K(2, -13, -1.0, 7, -8, -1, -1);
  const K_KNEEL = K(8, -8, PI, 8, -7, 1, 1, 4);          // 死亡：单膝跪地，剑拄着地
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -64, 64, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1],
    ['flash', 0, 1], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['glyph', 0, 7], ['plates', 0, 5], ['pfl', 0, 2], ['climb', 0, 12], ['seam', 0, 2], ['noSh', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_STRIKE = 2 / 12, T_CUT = 3 / 12, T_SNAP = 1 / 12, T_KNEE = INCOMING + 0.42, T_BREAK = INCOMING + 0.7, T_CLANG = INCOMING + 1.05;
  const SW_N = 12;                                                         // 剑：柄 −2..0 · 护手 1 · 锈剑根 2..5 · 魂刃 6..11 · 剑尖 12

  function swordGeo(gx, gy, a) {
    const di = parts.snapDir(a), c8 = parts.cell(di, 0, 0, 8), x0 = c8[0] < 0 ? gx - 1 : gx, y0 = c8[1] < 0 ? gy - 1 : gy;
    return { di, x0, y0, tip: parts.cell(di, x0, y0, SW_N), mid: parts.cell(di, x0, y0, 8) };
  }

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.glyph = 0; P.plates = 0; P.pfl = 0; P.climb = 0; P.seam = 1; P.noSh = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      P.seam = P.bob ? 0 : 1;                                           // 甲缝魂火跟着呼吸明灭
      const lp = tq % DUR[IDLE];                                        // 待机个性：挺胸，剑在肩上一颠，甲缝魂火一齐烧旺、飘带扬起
      if (lp >= 1.4 && lp < 1.9) { const k = Math.floor((lp - 1.4) * 12 + 1e-6); P.lean = -1; P.hy -= k === 1 || k === 2 ? 1 : 0; P.seam = 2; P.beard = -2; P.sway = -1; P.glint = k === 2 ? 1 : 0; P.gem = 1; P.glyph = 7; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                             // 行军正步：大步幅，接触帧身子一沉、剑在肩上一颠
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq));
      P.hy += P.step !== 0 ? 1 : 0; P.bhy += P.wup ? -1 : 0; P.seam = P.step !== 0 ? 2 : 1; P.beard = P.step !== 0 ? -1 : 1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 1; P.sway = 1; }
      else if (tq < 0.2) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 4; P.gem = 2; P.beard = -2; P.sway = -1; P.bend = 1; P.seam = 2; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_STRIKE, K_HOLD, q); P.bx = RD(4 - q); P.gem = 1; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                         // 剑插进地里 → 魂火沿剑身一格格往上爬 → 甲片一片片浮起散开
      const q = ease.inOut(clamp01(tq / 0.4)); setK(K_IDLE, K_PLANT, q);
      P.climb = Math.min(12, Math.max(0, Math.floor((tq - 0.35) / 0.07)));
      P.plates = Math.min(5, Math.max(0, Math.floor((tq - 0.6) / 0.12) + 1)); P.pfl = P.plates ? (tq > 1.05 ? 1 + (f12 & 1) : 1) : 0;
      P.glyph = Math.min(7, Math.max(0, Math.floor((tq - 0.5) / 0.1))); P.seam = 2;
      P.beard = -RD(q * 2) + (tq > 1.1 && (f12 & 1) ? 1 : 0); P.sway = -RD(q); P.bend = RD(q * 2);
      P.gem = tq < 0.5 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                           // 光柱落在剑上、甲片磁吸回身 → 拔剑举起 → 十字墓火斩
      if (tq < T_SNAP) { setK(K_PLANT, K_PLANT, 0); P.climb = 12; P.plates = 5; P.pfl = 1; }
      else if (tq < T_CUT) { setK(K_RAISE, K_RAISE, 0); P.beard = 2; P.sway = 1; P.glint = 1; }
      else { const q = ease.out(clamp01((tq - T_CUT) / 0.2)); setK(K_CUT, K_HOLD, q); P.bx = 5; P.beard = -2; P.sway = -1; P.bend = 2; }
      P.gem = 3; P.rim = 3; P.glyph = 7; P.seam = 2;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_HOLD, K_IDLE, q); P.bx = RD(5 * (1 - q)); P.beard = -RD(1 - q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.glyph = q < 0.5 ? 7 : 0; P.seam = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.bend = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.seam = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; P.seam = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                          // 受击 → 踉跄 → 拄剑单膝跪 → 散架（死亡套件 parts）
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; P.seam = f12 & 1; }
      else if (d < 0.42) { setK(K_HURT, K_KNEEL, 0.5); P.crouch = 2; P.bx = -1; P.eyes = 1; P.beard = 2; P.gem = 1; P.seam = 0; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.eyes = 1; P.beard = d < 0.6 ? 1 : 0; P.seam = (f12 & 1) ? 1 : 0;
        P.gem = d < 0.55 ? 1 : ((f12 & 1) ? 1 : 4);
        if (d >= T_BREAK - INCOMING) P.dq = 1;                          // 之后由死亡套件（散架）接管
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0; P.seam = 2;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.a = RD(P.a / ASTEP) * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const g = swordGeo(P.hx, P.hy, P.a); P.tipx = g.tip[0] + P.bx; P.tipy = g.tip[1];
    P.gx = g.mid[0] + P.bx; P.gy = g.mid[1];                            // 发光体 = 魂刃中段
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：魂火飘带（从肩甲缝窜出、向后飞的火焰缎带；根部 2 格、梢 1 格，按 beard / sway 波动，梢端最亮后渐暗）
  function ribbon(T, x0, y0, len, ph, lv) {
    E.part(); const b = P.beard, s = P.sway;
    for (let k = 0; k <= len; k++) {
      const q = k / len, y = y0 - RD(q * 4 + Math.sin(q * 4.2 + ph + b * 0.5) * 1.2 * q - b * q * q * 0.8 - s * q * 0.5), x = x0 - k;
      const tn = lv === 4 ? 1 : k < 2 ? 4 : q < 0.6 ? 3 : 2;
      px(E, T, x, y, M.glow, tn); if (q < 0.3) px(E, T, x, y + 1, M.glow, lv === 4 ? 1 : 2);
    }
  }
  // 候选部件：碑形塔盾（圆顶碑 9×16：赤甲镶边 + 金铆钉、灰石碑面，中央一列青绿魂火符文——和先祖战士的墓碑盾同纹，发光体、和盾同一部件；lit 从下往上点亮行数档 0–7，lv 5 档）
  const TW = [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
  const RUNE = [[0, 2], [-1, 3], [1, 3], [0, 4], [0, 5], [-1, 6], [1, 6], [-2, 7], [2, 7], [0, 7], [0, 8], [0, 9], [-1, 10], [1, 10], [-2, 11], [2, 11], [0, 11], [0, 12], [-1, 13], [1, 13]];
  function towerTomb(T, cx, by, lit, lv) {
    E.part(); const top = by - 15;
    for (let r = 0; r < 16; r++) {
      const w = TW[r], y = top + r;
      for (let x = -w; x <= w; x++) {
        const edge = Math.abs(x) === w || r === 0 || r === 15 || (r === 1 && Math.abs(x) >= 2);
        px(E, T, cx + x, y, edge ? M.rim : M.stone, 0);
      }
    }
    px(E, T, cx - 1, top, M.gold, 4); px(E, T, cx, top, M.gold, 3); px(E, T, cx + 1, top, M.gold, 2);            // 碑顶金冠
    for (const [x, r] of [[-4, 4], [4, 4], [-4, 12], [4, 12]]) px(E, T, cx + x, top + r, M.gold, 4);             // 金铆钉
    px(E, T, cx - 2, top + 2, M.stone, 4); px(E, T, cx - 3, top + 3, M.stone, 4);
    for (const [x, r] of RUNE) {
      const on = r >= 14 - lit * 2, tn = lv === 4 ? 1 : !on ? 2 : lv >= 3 ? 4 : lv === 2 ? ((r & 1) ? 4 : 3) : 3;
      px(E, T, cx + x, top + r, M.glow, tn);
    }
  }
  // 候选部件：传说之剑（吸附斜率的单手剑：锈剑根 + 墓火魂刃接续；魂刃是发光体、和剑同一部件；climb = 魂火从剑尖往剑根爬了几格）
  function legendSword(T, g, lv, climb) {
    const { di, x0, y0 } = g; E.part();
    parts.bar(di, x0, y0, -2, -2, 1, (k, j, X, Y) => px(E, T, X, Y, M.gold, 4));
    parts.bar(di, x0, y0, -1, 0, 1, (k, j, X, Y) => px(E, T, X, Y, M.wrap, 2));
    { const c = parts.cell(di, x0, y0, 1), pd = (di + 4) % 16; parts.bar(pd, c[0], c[1], -1, 1, 1, (k, j, X, Y) => px(E, T, X, Y, M.gold, k === -1 ? 4 : k === 1 ? 2 : 3)); }
    parts.bar(di, x0, y0, 2, SW_N, 2, (k, j, X, Y) => {
      if (k === SW_N && j === 1) return;
      const lit = SW_N - k < climb;
      if (k <= 5 && !lit) { const rust = hash(k * 3 + j, 23) < 0.35 || k === 5; px(E, T, X, Y, rust ? M.rust : M.iron, rust ? 3 : j === 0 ? 4 : 2); return; }
      let tn = lv === 4 ? (j === 0 ? 2 : 1) : j === 0 ? 4 : 3;
      if (lv >= 3 || (lv === 2 && (k & 1))) tn = j === 0 ? 4 : 4;
      if (k <= 5 && lit) tn = j === 0 ? 4 : 3;
      if (k === 6 && lv !== 4) tn = 4;                                     // 接缝一道白
      px(E, T, X, Y, M.glow, tn);
    });
  }
  // 候选部件：长辫（同先祖战士：每 2 行一道辫纹，辫梢一颗骨珠，梢会摆）
  function braid(T, x, y0, len, mat, sw) {
    E.part();
    for (let k = 0; k < len; k++) { const q = k / len, xx = x + RD(sw * q * q * 1.5); px(E, T, xx, y0 + k, mat, (k & 1) ? 2 : 3); }
    const tx = x + RD(sw * 1.5); px(E, T, tx, y0 + len, M.bead, 4); px(E, T, tx, y0 + len + 1, M.bead, 2);
  }
  // 浮起的甲片（技能蓄力：甲片脱离身体 1–2 格）：[挂点, 方向]
  function plateChip(T, x, y, w, h) { E.part(); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(E, T, x + i, y + j, j === 0 ? M.gold : M.plate, j === 0 ? (i === 0 ? 4 : 3) : 0); }
  function drawHero() {
    const clip = P.st === CHARGE || P.st === CAST || P.st === DEATH ? 0 : undefined;
    E.begin(hero, P.bx, 0, clip); const R = parts.rig(P, BODY), gl = P.gem;
    ribbon(R, R.sBx - 1, R.sBy - 1, 8, 0, gl === 4 ? 4 : 0); ribbon(R, R.sBx - 1, R.sBy + 1, 6, 1.7, gl === 4 ? 4 : 0);   // 两条魂火飘带
    braid(R, R.hx0 - 1, R.htop + 2, 9, M.braid, RD(P.beard * 0.8));                                              // 面盔后垂下的白辫
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.plateD, pauldron: M.plateD, hand: M.plateD, grip: 'fist' });
    parts.legs(E, R, P, { style: 'greave', mat: M.plate, matD: M.plateD, boot: M.iron, bootD: M.ironD });
    const tor = parts.torso(E, R, P, { style: 'plate', mat: M.plate, trim: M.gold, belt: M.belt, buckle: M.gold, emblem: M.gold, emblemStyle: 'diamond' });
    { const tn = P.seam === 0 || gl === 4 ? 1 : P.seam === 2 ? 4 : 3, y1 = R.yS + 3, y2 = R.yWaist - 1, e1 = parts.edges(R, y1), e2 = parts.edges(R, y2);   // 甲缝魂火（同一部件）
      px(E, R, e1[1] - 2, y1, M.glow, tn); px(E, R, e1[1] - 3, y1, M.glow, tn === 4 ? 3 : tn); px(E, R, e2[0] + 2, y2, M.glow, tn); px(E, R, e2[1] - 1, y2 + 2, M.glow, tn); }
    parts.head(E, R, P, { mat: M.plate, face: 'square', nose: 'none', mouth: 'none', ear: 'none' });
    parts.helm(E, R, P, { style: 'great', mat: M.plate, trim: M.gold, eye: M.glow });
    parts.horns(E, R, P, { mat: M.horn, band: M.gold, size: 7, curve: 'back', y: 1 });
    if (!P.noSh) towerTomb(R, P.bhx, P.bhy + TG, P.glyph, gl);
    legendSword(R, swordGeo(P.hx, P.hy, P.a), gl, P.climb);
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.plate, pauldron: M.plate, trim: M.gold, hand: M.plate, grip: 'fist' });
    if (P.plates) {                                                     // 甲片浮起散开
      const f = P.pfl, e = parts.edges(R, R.yS + 4);
      const C = [[R.sFx - 2, R.sFy - 2 - f, 3, 2], [R.hx - 1, R.htop - 3 - f, 3, 1], [e[1] + 1 + f, R.yS + 4, 2, 3], [R.hipFx + 1 + f, R.yHip - 1, 2, 3], [e[0] - 2 - f, R.yWaist, 2, 3]];
      for (let i = 0; i < P.plates; i++) plateChip(R, C[i][0], C[i][1], C[i][2], C[i][3]);
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0, wispT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const R0 = parts.rig({}, BODY);
  const PLANT_X = K_PLANT.hx;
  function dust(x, n, spd) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * spd, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }
  function onEnter(s) {
    if (s !== CAST) return;                                             // 墓火光柱从天而降落在剑上，甲片磁吸回身
    const x = wx(PLANT_X);
    fx.pillar(x, 0, HY, 3, R_EL, 0.45, 2);
    releaseOrbit(40, 90, 0.3, 0.6, { pts: 1, up: 20 });
    burst(x, HY - 3, 30, 50, 130, 0.25, 0.6, R_EL, 30); ring(x, HY - 6, 1, R_EL); fx.cross(x, HY - 12, 7, R_EL, 0.3);
    for (const [dx, dy] of [[-8, -24], [6, -18], [-10, -12], [7, -9], [0, -30]]) burst(wx(dx), wy(dy), 3, 10, 30, 0.1, 0.2, R_EL, 0);   // 甲片吸回时的火星
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'blood', w: 0.75 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {                               // 竖劈：举过头顶 → 劈到前下方
      const cx = wx(R0.sFx + 3), cy = wy(R0.sFy);
      fx.slash(cx, cy, 13, -0.2, 2.4, R_IMP, 0.17, 2, 2);
      hitDummy(0); burst(DUMMY_X - 4, HY - 12, 12, 40, 110, 0.15, 0.35, R_IMP, 16); fx.cross(DUMMY_X - 4, HY - 12, 3, R_IMP, 0.18);
      sfx('swing', { kind: 'slash', w: 0.75 }); sfx('hit', { mat: 'flesh', w: 0.7 });
    }
    if (s === CAST && t === T_CUT) {                                    // 十字墓火斩 + 前方地裂
      const cx = DUMMY_X - 4, cy = HY - 14;
      fx.slash(cx - 2, cy + 2, 12, -0.6, 2.2, R_EL, 0.3, 3, 2); fx.slash(cx - 2, cy + 2, 12, 0.6, -2.2, R_EL, 0.3, 3, 2);
      fx.crack(wx(12), HY + 1, 18, 1, R_EL, 0.8);
      hitDummy(1); burst(cx, cy, 28, 50, 140, 0.2, 0.55, R_EL, 24); fx.cross(cx, cy, 6, R_EL, 0.3); ring(cx, cy, 0, R_EL); shake(0.12, 1);
      sfx('impact', { pal: 'blood', w: 0.6 });
    }
    if (s === DEATH && t === T_KNEE) { dust(HX + 2, 10, 30); shake(0.1, 1); sfx('fall', { w: 0.7 }); }
    if (s === DEATH && t === T_BREAK) {                                 // 散架：先画好跪姿，再交给死亡套件
      poseAt(DEATH, T_BREAK - 1 / 12, T_BREAK - 1 / 12); P.gem = 4; P.seam = 0; P.k1 = KEY1(P); P.k2 = KEY2(P); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('parts', { power: 0.8, fromX: 1, fromY: -14, push: -8, fadeAt: 1.3, fadeDur: 0.5 });
      burst(HX + 1, HY - 16, 14, 30, 90, 0.2, 0.5, R_EL, 20); shake(0.14, 1); wispT = 0; sfx('hit', { mat: 'metal', w: 0.6 });
    }
    if (s === DEATH && t === T_CLANG) { dust(HX - 6, 6, 30); dust(HX + 10, 6, 30); sfx('fall', { w: 0.8 }); }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_CUT], [], [], [T_KNEE, T_BREAK, T_CLANG], []];
  function hurtFx(s) {                                                  // 赤甲：更多火花 + 几颗墓火星
    const hx = HX + 2, hy = HY - 18; burst(hx, hy, s === DEATH ? 26 : 22, 60, 150, 0.2, 0.5, R_IMP, 20); burst(hx, hy, 4, 50, 110, 0.5, 0.8, R_EL, 30);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.35) {                               // 魂火从地面各处汇聚到插地的剑上
      chargeAcc += dt * (16 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 14 + Math.random() * 10; spawn(K_SPIRAL_PT, wx(PLANT_X) + Math.cos(a) * r, HY - 2 - Math.random() * 16, r / (0.45 + Math.random() * 0.3), 0, 9, R_EL, a, r, 3 + Math.random() * 3); }
      if (Math.random() < dt * 16) spawn(K_EMBER, wx(PLANT_X - 1 + Math.random() * 3), HY - 1 - Math.random() * 10, (Math.random() - 0.5) * 6, -14 - Math.random() * 10, 0.4 + Math.random() * 0.3, R_EL);
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.75 }); dust(wx(P.step > 0 ? 5 : -4), 2, 16); } lastStep = P.step; }
    if (state === IDLE || state === MOVE || state === RECOVER) {        // 飘带梢与魂刃的余烬
      emberAcc += dt * (state === RECOVER ? 6 : 2); while (emberAcc >= 1) { emberAcc -= 1; const back = Math.random() < 0.5; spawn(K_EMBER, back ? wx(R0.sBx - 8) : wx(P.gx), back ? wy(R0.sBy + 1) : wy(P.gy), Math.random() * 6 - 3, -8 - Math.random() * 6, 0.5 + Math.random() * 0.4, R_EL); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 24, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, Math.random() < 0.5 ? R_EL : FXI.soul); } }
    wispT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; wispT = 9; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  // 空甲里升起的一团墓火（散架后）：火苗 5 行，0.9 s 升 10 格，最后 0.3 s 逐帧闪灭
  const WISP = [[0, 0, 0], [-1, 1, 1], [-1, 2, 1], [-2, 3, 2], [-1, 4, 3]];
  function fxFront(f12) {
    if (E.state === DEATH && wispT < 1.2) {
      const q = wispT / 1.2, x = wx(1), y = wy(-12) - RD(q * 10); if (q > 0.75 && (f12 & 1)) return;
      for (const [x0, r, lv] of WISP) for (let k = x0; k <= -x0; k++) { if (q > 0.5 && r === 4 && k !== 0) continue; put(x + k + (r < 2 ? ((f12 >> 1) & 1) : 0), y + r, EL[Math.min(4, lv + (q > 0.6 ? 1 : 0) + (Math.abs(k) === -x0 && x0 ? 1 : 0))]); }
    }
    if (P.st === CHARGE && P.climb >= 12 && (f12 & 1)) { const x = wx(PLANT_X), y = wy(-12); put(x, y - 1, EL[0]); put(x - 1, y - 1, EL[1]); put(x + 1, y - 1, EL[1]); put(x, y - 2, EL[1]); put(x, y, EL[1]); }
  }

  return {
    name: '灵魂战士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glow], HIT_POINT: [2, -16], EVENTS,
    REVIVE: { ramp: R_EL, big: 1 }, deathKit: { mode: 'parts', at: T_BREAK },
    SFX: { body: 'armor', how: 'collapse', pal: 'blood', style: 'beam', w: 0.75 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid: () => {}, fxFront, hurtFx,
  };
});
