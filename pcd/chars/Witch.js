// 女巫（敌人 · 野兽 · 稀有 · 远程 680）：蟾蜍头的沼泽女巫——拖地的墨绿长袍盖住脚、宽扁蟾蜍头 + 鼓起的淡黄喉囊、
//   一顶歪折的紫色高尖帽（帽尖折向后下垂，上面蹲着一只小青蛙）、右手一根长柄木汤勺当法杖，勺里盛一团发光的荧绿蛙卵。
// 攻击 = 长勺一舀一甩，把一团蛙卵甩成抛物线砸向目标；技能 = 特性「召唤蛙人」：长勺插地搅动，身前泥沼法阵冒泡，蛙卵一颗颗飞进法阵，
//   喉囊胀到最大后一收「呱」——法阵中心泥浆外爆，一只小蛙人（Froggo 同款紫帽 + 荧绿帽带）从泥里跳出来落地。
// 死亡 = 融化成沼：长袍塌进一滩绿色泥沼，尖帽掉下来立在沼上，帽尖小青蛙跳走，泥沼冒泡蒸发。
// 骨架用 parts.rig（tall 改：头 5 高 7 宽、腿藏在袍里），手臂用 parts.arm / hand；袍、蟾蜍头、喉囊、歪尖帽、帽尖青蛙、蛙卵长勺是本模块的部件。
PCD.define('Witch', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_PHYS, K_SPIRAL,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, sfx, hitDummy, dummyFx, put, scrX, floorGlow, bayer } = E;
  const RD = Math.round, px = (T, x, y, m, t) => parts.px(E, T, x, y, m, t), run = (T, y, a, b, m, t) => parts.run(E, T, y, a, b, m, t);
  const FREE = parts.FREE;

  // ───── 元素：召唤 · 沼泽毒绿（FXI.poison：21 白 → 50 淡黄绿 → 49 黄绿 → 48 绿 → 34 墨绿）─────
  const R_EL = FXI.poison, EL = FXR[R_EL];
  const R_MUD = E.fxRamp('witchMud', [38, 36, 35, 34, 0]);                                       // 泥点 / 泥泡

  // ───── 材质 ─────
  const M = parts.mats(E, {
    robe: { r: 'moss', band: 2 }, skin: [48, 36, 37, 38], wart: { r: [48, 49, 50, 38], flat: 1 }, sac: 'sand',
    hat: 'purple', band: [48, 49, 50, 38], wood: 'wood', rope: 'sand', cuff: 'purple', patch: 'leather', pouch: 'leather',
    eye: { r: [20, 19, 14, 5], flat: 1 }, ink: { r: 'ink', flat: 1 }, mouth: 'pink',
    egg: { r: [48, 50, 38, 21], flat: 1 },                                                     // 发光蛙卵：暗 50 · 亮 38 · 最亮 21
  });
  const BODY = { body: 'tall', leg: 9, torso: 8, head: 5, headW: 7, sw: 3, arm: 9, fall: 'back' };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(76, 50, 36, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 15], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['skin', 'wart', 'sac', 'wood', 'rope', 'egg', 'eye', 'ink', 'mouth', 'cuff', 'patch']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 握长勺（勺朝向 a：0 朝上、顺时针为正），后手垂在身后 ─────
  const P = { hx: 0, hy: 0, a: 0, lean: 0, head: 0, crouch: 0, bob: 0, sway: 0, wave: 0, walk: 0, step: 0, wup: 0, sac: 0, jaw: 0, eyes: 0, glow: 0, eggs: 1, rim: 0, flash: 0, bx: 0,
    sink: 0, pud: 0, hatOff: 0, hatY: 0, frog: 0, fx: 0, fy: 0, bend: 0, dq: 0, bub: 0, st: 0, lying: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head, crouch) => ({ hx, hy, a, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(6, -13, 2.2);                                                                // 勺斜向前下，勺头伸出身前
  const K_WIND = K(2, -11, 3.7, -1, 0);                                                         // 一舀：勺头甩到身后下方
  const K_FLING = K(8, -18, 0.85, 1, 1);                                                        // 一甩：勺头扬到前上方
  const K_HOLD = K(8, -16, 1.25, 1, 0);
  const K_PLANT = K(9, -10, 2.75, 1, 0, 1);                                                     // 蓄力：长勺插地搅动
  const K_CROAK = K(7, -12, 2.4, -1, -1);                                                       // 施放：后仰「呱」
  const K_HURT = K(4, -12, 1.9, -1, -1);
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -16, 31], ['hy', -40, 7], ['a', -32, 64, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 1], ['bob', 0, 1], ['crouch', 0, 3], ['sway', -2, 2], ['wave', 0, 3], ['sac', 0, 3], ['jaw', 0, 1]]);
  const KEY2 = parts.keyer([['eyes', 0, 1], ['glow', 0, 4], ['eggs', 0, 1], ['rim', 0, 3], ['flash', 0, 1], ['bx', -16, 15], ['sink', 0, 31], ['pud', 0, 4], ['hatOff', 0, 1], ['hatY', -40, 0],
    ['frog', 0, 2], ['fx', -8, 24], ['fy', 0, 8], ['bend', -1, 2], ['dq', 0, 48, 48], ['bub', 0, 3], ['st', 0, 8]]);
  const STIR = [[0, 0, 0], [1, -1, 1], [2, 0, 0], [1, 1, -1]];                                  // 待机搅锅：手绕小圈 [dx, dy, 勺角档]
  const T_FLING = 2 / 12, T_POP = 0.3, T_LAND_D = 0.66;
  // 待机个性（1.6–2.0 s，5 帧）：喉囊一鼓一鼓，最后张嘴「呱」、眨眼
  const CROAK = [[2, 0, 0], [3, 0, 0], [2, 0, 0], [0, 1, 0], [1, 0, 1]];                        // [sac, jaw, eyes]

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bob = 0; P.sway = 0; P.wave = 0; P.walk = 0; P.step = 0; P.wup = 0; P.sac = 0; P.jaw = 0; P.eyes = 0; P.glow = 0; P.eggs = 1; P.rim = 1; P.flash = 0; P.bx = 0;
    P.sink = 0; P.pud = 0; P.hatOff = 0; P.hatY = 0; P.frog = 0; P.fx = 0; P.fy = 0; P.bend = 0; P.dq = 0; P.bub = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6), s = STIR[Math.floor(TT / 0.3 + 1e-6) & 3];
      P.bob = b & 1; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3]; P.bend = (b & 1) ? 1 : 0; P.sac = 1;
      P.hx += s[0]; P.hy += s[1]; P.a += s[2] * ASTEP * 2;
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 - 1e-6 && lp < 2.0 - 1e-6) { const c = CROAK[Math.min(4, f12of(lp - 1.6))]; P.sac = c[0]; P.jaw = c[1]; P.eyes = c[2]; P.glow = c[1] ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                                     // 拖袍滑步：袍下不见脚，下摆波纹前移，身体微起伏
      setK(K_IDLE, K_IDLE, 0); const f = gait(tq);
      P.walk = 1; P.wave = f; P.bob = [1, 0, 1, 0][f]; P.sway = [-1, 0, 1, 0][f]; P.bend = [0, 1, 0, -1][f]; P.hx += [0, 1, 0, -1][f]; P.a += [1, 0, -1, 0][f] * ASTEP;
      const w = walkDemo(tq, 12, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.glow = 1; P.sway = 1; }
      else if (tq < 0.2) { setK(K_FLING, K_FLING, 0); P.glow = 2; P.rim = 2; P.sway = -2; P.bend = 2; P.eggs = 0; }
      else if (tq < 0.45) { setK(K_FLING, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.eggs = 0; P.sway = -1; P.bend = 1; }
      else { setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.eggs = tq >= 0.6 ? 1 : 0; }
    } else if (st === CHARGE) {                                                                 // 长勺插地搅动，喉囊越胀越大
      const q = ease.inOut(clamp01(tq / 0.5)); setK(K_IDLE, K_PLANT, q);
      if (tq >= 0.4) { const s = f12 & 3; P.hx += [0, 1, 0, -1][s]; P.a += [0, 1, 0, -1][s] * ASTEP * 2; }
      P.sac = tq < 0.5 ? 0 : tq < 0.9 ? 1 : tq < 1.2 ? 2 : 3; P.sway = tq > 1.1 ? ((f12 & 1) ? 1 : -1) : 0; P.bend = -1;
      P.glow = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                                                   // 喉囊一收「呱」
      setK(K_PLANT, K_CROAK, ease.out(clamp01(tq / 0.12))); P.sac = tq < 1 / 12 ? 2 : 0; P.jaw = tq < 0.3 ? 1 : 0; P.eyes = tq >= 1 / 12 && tq < 0.25 ? 1 : 0;
      P.glow = 3; P.rim = 3; P.sway = (f12 & 1) ? 1 : -1; P.bend = 2;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CROAK, K_IDLE, q); P.glow = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
      P.fy = tq >= 0.2 && tq < 0.4 ? (tq < 0.3 ? 3 : 1) : 0;                                     // 帽尖小青蛙跳一下
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 2; P.bend = 2; P.sac = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.sway = -1; P.bend = -1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                                                  // 融化成沼
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 2; P.bend = 2; P.sac = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.glow = (f12 & 1) ? 1 : 4; }
      else {
        setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sac = 0; P.glow = 4; P.eggs = 0; P.bend = 2;
        const s = clamp01((d - 0.3) / (T_LAND_D - 0.3)); P.sink = Math.min(31, RD(28 * ease.in(s))); P.sway = RD(2 - 3 * s);
        P.pud = d < 0.4 ? 1 : d < 0.5 ? 2 : d < 0.62 ? 3 : 4;
        if (d >= 0.45 - 1e-6) {                                                                 // 帽子脱开：自己落到泥沼上，弹一下立住
          P.hatOff = 1; const h = clamp01((d - 0.45) / (T_LAND_D - 0.45));
          P.hatY = d < T_LAND_D ? RD(-16 + 14 * ease.in(h)) : d < 0.75 ? -3 : -2;
        }
        if (d >= 0.8 - 1e-6) {                                                                  // 帽尖小青蛙三跳跳走
          const k = Math.floor((d - 0.8) / 0.18 + 1e-6), p = ((d - 0.8) - k * 0.18) / 0.18;
          if (k >= 3) P.frog = 2; else { P.frog = 1; P.fx = RD(k * 6 + p * 6); P.fy = RD(Math.sin(p * Math.PI) * 5); }
        }
        if (d >= 0.7) P.bub = Math.floor(TT * 6 + 1e-6) & 3;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.glow = tq > 0.85 ? 2 : 0;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.a = RD(P.a / ASTEP) * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const b = bowlAt(); P.gx = b[0] + P.bx; P.gy = b[1] - 1 + P.sink;
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 几何 ─────
  const LB = 8, LH = 5;                                                                         // 勺杆：手到勺头 / 手到杆尾
  const dirOf = (a) => [Math.sin(a), -Math.cos(a)];
  function bowlAt() { const [dx, dy] = dirOf(P.a); return [RD(P.hx + dx * (LB + 0.5)), RD(P.hy + dy * (LB + 0.5))]; }

  // ───── 画（部件从后往前）─────
  function robeEdge(R, y) {
    const yT = R.yS, t = clamp01((y - yT) / (0 - yT)), sw = P.sway, l = R.lean * (1 - t);
    return [RD(-3 - 4.2 * Math.pow(t, 1.3) + sw * t * t + l), RD(2 + 3.2 * Math.pow(t, 1.2) + sw * t * t * 0.6 + l)];
  }
  // 候选部件：dragRobe —— 拖地长袍（盖住脚）：肩下起逐行外扩，下摆拖地成波浪（wave 0–3 相位前移 = 滑步），后摆多拖 1–2 格；
  //   两道褶、麻绳腰带 + 绳结垂头、腰间小皮袋、背后补丁（同一个部件，材质之间是明暗边）
  function dragRobe(R) {
    E.part(); const yT = R.yS;
    for (let y = yT; y <= -1; y++) { let [L, Rr] = robeEdge(R, y); if (y === yT) { L += 1; Rr -= 1; } run(R, y, L, Rr, M.robe, 0); }
    const [L0, R0] = robeEdge(R, 0), trail = P.sway < 0 ? 2 : 1;
    for (let x = L0 - trail; x <= R0; x++) if (((x - P.wave + 40) & 3) !== 3 || x < L0) px(R, x, 0, M.robe, x < L0 ? 2 : ((x + P.wave) & 1) ? 0 : 1);
    for (let y = R.yWaist + 2; y <= -1; y++) {                                                 // 褶：后褶长、前褶短，下端随波纹摆
      const [L, Rr] = robeEdge(R, y), sh = y > -3 ? ((P.wave & 1) ? 1 : 0) : 0;
      px(R, L + 3 + sh, y, M.robe, 2); if (y > R.yWaist + 4) px(R, Rr - 2 - sh, y, M.robe, 2);
    }
    const yb = R.yWaist, [Lb, Rb] = robeEdge(R, yb);                                           // 麻绳腰带 + 绳结 + 垂头
    run(R, yb, Lb, Rb, M.rope, 0); px(R, Rb - 1, yb, M.rope, 4);
    const sw = P.sway > 0 ? 1 : 0; px(R, Rb - 1, yb + 1, M.rope, 2); px(R, Rb - 1 + sw, yb + 2, M.rope, 3); px(R, Rb - 2, yb + 1, M.rope, 3);
    rectP(R, Lb + 1, yb + 1, 2, 3, M.pouch); px(R, Lb + 1, yb + 1, M.pouch, 4);                  // 腰后小皮袋
    const pY = -6; rectP(R, robeEdge(R, pY)[0] + 2, pY, 3, 2, M.patch); px(R, robeEdge(R, pY)[0] + 2, pY - 1, M.patch, 1);   // 背后补丁 + 缝线
  }
  function rectP(R, x, y, w, h, m, t) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(R, x + i, y + j, m, t || 0); }
  // 候选部件：toadHead —— 宽扁蟾蜍头（7 宽 5 高、平顶、吻前突 1 格）：头顶前方鼓出一只金色大眼（横瞳）、后面一只远眼鼓包，
  //   通宽大嘴线、鼻孔、背上疣点；jaw 1 = 张嘴（下颚掉 1 行、露出粉色口腔）
  function toadHead(R) {
    E.part(); const x = R.hx, top = R.htop, hy = R.hy;
    run(R, top, x - 2, x + 1, M.skin, 0); run(R, top + 1, x - 3, x + 3, M.skin, 0); run(R, top + 2, x - 3, x + 4, M.skin, 0); run(R, top + 3, x - 3, x + 4, M.skin, 0); run(R, hy, x - 2, x + 3, M.skin, 0);
    run(R, top - 1, x - 2, x - 1, M.skin, 2);                                                   // 远眼鼓包
    run(R, top - 1, x, x + 2, M.skin, 0); px(R, x + 1, top - 1, M.skin, 4);                    // 近眼眼睑
    if (P.eyes) run(R, top, x, x + 2, M.skin, 1);
    else { px(R, x, top, M.eye, 3); px(R, x + 1, top, M.ink, 1); px(R, x + 2, top, M.eye, 4); }
    px(R, x + 4, top + 2, M.skin, 1);                                                           // 鼻孔
    if (P.jaw) { run(R, top + 3, x, x + 4, M.ink, 1); run(R, hy, x, x + 3, M.mouth, 0); run(R, hy + 1, x - 1, x + 3, M.skin, 0); }
    else { run(R, top + 3, x - 1, x + 4, M.skin, 1); px(R, x - 2, hy, M.skin, 1); }             // 通宽大嘴线，嘴角下弯
    px(R, x - 2, top + 1, M.wart, 3); px(R, x - 1, top + 2, M.wart, 4); px(R, x + 2, top + 1, M.wart, 3); px(R, x - 3, top + 3, M.wart, 3);   // 疣点
  }
  // 候选部件：throatSac —— 下巴下的淡黄喉囊：size 0 小鼓包 → 3 胀到最大（比平时多鼓出 2 格），左上 1 格高光
  const SAC = [[[0, 2], [1, 2]], [[-1, 3], [0, 3], [1, 2]], [[-1, 4], [-1, 4], [0, 4], [1, 3]], [[-1, 4], [-1, 5], [-1, 5], [0, 4], [1, 3]]];
  function throatSac(R) {
    E.part(); const x = R.hx, y0 = R.hy + 1 + (P.jaw ? 1 : 0), rows = SAC[P.sac];
    rows.forEach(([a, b], j) => run(R, y0 + j, x + a, x + b, M.sac, 0));
    px(R, x + rows[0][0] + (P.sac ? 1 : 0), y0, M.sac, 4);
  }
  // 候选部件：crookedHat —— 歪折的高尖帽：宽帽檐 + 荧绿帽带，帽身逐行收窄后倾、中段折一下（歪），帽尖折向后下垂（bend −1..2 甩动），
  //   返回帽尖折角的位置（小青蛙蹲在那）。T = rig（戴着）或 FREE（掉在地上）
  function crookedHat(T, cx, by) {
    E.part();
    run(T, by, cx - 5, cx + 3, M.hat, 0); px(T, cx + 3, by, M.hat, 4); px(T, cx - 5, by + (P.bend > 1 ? 1 : 0), M.hat, 2);
    run(T, by - 1, cx - 3, cx + 2, M.band, 0); px(T, cx - 2, by - 1, M.band, 4); px(T, cx + 1, by - 1, M.band, 4);
    let tx = cx, ty = by - 2;
    for (let k = 0; k <= 6; k++) {
      const w = Math.max(1, RD(5 - k * 0.72)), c = cx - 0.5 - k * 0.45 - (k >= 3 ? 1 : 0) + (k >= 5 ? 1 : 0), x0 = RD(c - w / 2);
      run(T, by - 2 - k, x0, x0 + w - 1, M.hat, 0); if (k === 1 || k === 4) px(T, x0 + 1, by - 2 - k, M.hat, 2); tx = x0; ty = by - 2 - k;
    }
    const b = P.bend;                                                                           // 帽尖往后下垂
    px(T, tx - 1, ty, M.hat, 0); px(T, tx - 2, ty + (b >= 1 ? 1 : 0), M.hat, 0); px(T, tx - 3, ty + 1 + (b >= 1 ? 1 : 0) - (b < 0 ? 1 : 0), M.hat, 3);
    if (b >= 2) px(T, tx - 3, ty + 3, M.hat, 3);
    return [tx - 1, ty - 1];
  }
  // 候选部件：hatFrog —— 帽尖上的小青蛙（4×2：拱背 + 金眼 + 前爪），fy 跳起格数
  function hatFrog(T, x, y) {
    E.part();
    run(T, y, x - 1, x + 1, M.skin, 0); px(T, x + 2, y, M.skin, 4); px(T, x - 2, y, M.skin, 2);
    px(T, x - 1, y - 1, M.skin, 0); px(T, x + 1, y - 1, M.eye, 4);
  }
  // 候选部件：eggLadle —— 长柄木汤勺：1 格木杆穿过握点，勺头 4×2 小木碗（始终碗口朝上），碗里一团荧绿蛙卵（发光体，同一个部件，glow 0–4 档）
  const EGG = [[2, 3, 2], [3, 4, 3], [4, 4, 4], [4, 4, 4], [1, 1, 1]];
  function eggLadle(R) {
    E.part(); const [dx, dy] = dirOf(P.a), x0 = P.hx - dx * LH, y0 = P.hy - dy * LH, x1 = P.hx + dx * (LB - 1), y1 = P.hy + dy * (LB - 1);
    parts.line(E, R, x0, y0, x1, y1, M.wood, 0); px(R, x0, y0, M.wood, 3);
    const [bx, by] = bowlAt();
    px(R, bx - 2, by, M.wood, 3); px(R, bx + 1, by, M.wood, 2); run(R, by + 1, bx - 2, bx + 1, M.wood, 0); px(R, bx - 1, by + 1, M.wood, 4);
    if (P.eggs) { const g = EGG[P.glow]; px(R, bx - 1, by, M.egg, g[0]); px(R, bx, by, M.egg, g[1]); px(R, bx, by - 1, M.egg, g[2]); if (P.glow === 3) px(R, bx - 1, by - 1, M.egg, 4); }
    else { px(R, bx - 1, by, M.wood, 1); px(R, bx, by, M.wood, 1); }
  }
  // 融化后的泥沼（FREE，贴地）：pud 1–4 半宽 5 → 12，冒泡 bub 相位
  const PUD = [0, 5, 8, 10, 12];
  function swamp(cx) {
    E.part(); const w = PUD[P.pud];
    run(FREE, 0, cx - w, cx + w, M.robe, 0); run(FREE, -1, cx - w + 2, cx + w - 1, M.robe, 0); if (P.pud >= 3) run(FREE, -2, cx - w + 5, cx + w - 4, M.robe, 0);
    for (let x = cx - w + 1; x < cx + w; x += 3) px(FREE, x, 0, M.robe, 2);
    if (P.pud >= 2) { const b = P.bub; px(FREE, cx - 4 + b * 2, -1, M.egg, b & 1 ? 3 : 2); px(FREE, cx + 5 - b, -1, M.egg, 2); if (b === 2) px(FREE, cx + 1, -2, M.egg, 3); px(FREE, cx - 6, 0, M.wart, 3); px(FREE, cx + 7, 0, M.wart, 3); }
  }
  function drawHero() {
    E.begin(hero, P.bx, 0);
    const R = parts.rig(P, BODY); R.oy = P.sink;                                               // 融化：整具身体往地下沉（parts 落笔自动截掉地面以下）
    const melted = P.sink >= 28;
    if (!melted) {
      parts.arm(E, R, P, { side: 'B', sleeve: 'bell', mat: M.robeD, cuff: M.cuffD, hand: M.skinD, grip: 'fist', at: [R.sBx, R.sBy + 8] });
      dragRobe(R);
      toadHead(R);
    }
    let fp = null;
    const hatX = R.hx - 2;
    if (!P.hatOff) fp = crookedHat(R, hatX, R.htop - 2);
    if (!melted) {
      eggLadle(R);
      parts.arm(E, R, P, { side: 'F', sleeve: 'bell', mat: M.robe, cuff: M.cuff, grip: 'none' });
      throatSac(R);
      parts.hand(E, R, P, { hand: M.skin, grip: 'fist' });
    }
    if (P.pud) swamp(0);
    if (P.hatOff) fp = crookedHat(FREE, hatX, P.hatY);
    if (P.frog < 2) {
      if (P.frog === 1) hatFrog(FREE, fp[0] + P.fx, fp[1] - P.fy + (P.hatOff ? 0 : 0));
      else hatFrog(P.hatOff ? FREE : R, fp[0], fp[1] - P.fy);
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const CX = HX + 27, CY = FLOOR;                                                                // 泥沼法阵中心
  let chargeAcc = 0, soulAcc = 0, eggAcc = 0, lastWave = -1, circT = 9, recT = 9, frogT = 9, shotT = 9, shX = 0, shY = 0, shTX = 0, smT = 9, smA0 = 0, smA1 = 0, smX = 0, smY = 0;
  const bowlScr = () => { const b = bowlAt(); return [scrX(b[0] + P.bx), HY + b[1] + P.sink]; };
  const ARC = 12;                                                                                // 蛙卵弹道抛高
  function onEnter(s) {
    if (s === CHARGE) { circT = 0; recT = 9; frogT = 9; }
    if (s === CAST) {
      releaseOrbit(30, 70, 0.3, 0.55, { pts: 1 }); burst(CX, CY - 2, 24, 40, 110, 0.3, 0.7, R_EL, 22); burst(CX, CY - 1, 14, 30, 80, 0.3, 0.6, R_MUD, 26);
      ring(CX, CY - 2, 1, R_EL); frogT = 0; shake(0.28, 2); flash(0.05);
      const [gx, gy] = bowlScr(); burst(gx, gy, 8, 20, 50, 0.2, 0.4, R_EL, 6);
    }
    if (s === RECOVER) recT = 0;
    if (s === IDLE || s === MOVE || s === ATTACK || s === HURT || s === DEATH) { circT = 9; frogT = 9; recT = 9; }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLING) {                                                        // 甩出一团蛙卵：抛物线
      const [gx, gy] = bowlScr(); shX = gx; shY = gy; shTX = DUMMY_X - 4; shotT = 0;
      shoot(1, gx + 1, gy, 130, shTX, R_EL, (HY - 18 - gy) * 130 / (shTX - gx - 1), { trail: false, glow: -1 });
      smT = 0; smA0 = K_WIND.a; smA1 = K_FLING.a; smX = HX + K_FLING.hx; smY = HY + K_FLING.hy;
      burst(gx, gy, 5, 20, 50, 0.15, 0.3, R_EL, 4); sfx('swing', { kind: 'throw', w: 0.3 }); sfx('shoot', { proj: 'water' });
    }
    if (s === CAST && t === T_POP) {                                                            // 蛙人落地
      const lx = CX + 9;
      for (let i = 0; i < 16; i++) spawnX(K_PHYS, lx + (Math.random() - 0.5) * 6, CY - 2, (Math.random() - 0.5) * 70, -30 - Math.random() * 50, 0.6 + Math.random() * 0.3, R_MUD, { g: 220, floor: CY - 1 });
      for (let i = 0; i < 5; i++) spawn(K_DUST, lx + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 16, -3 - Math.random() * 4, 0.3 + Math.random() * 0.2, FXI.dust);
      shake(0.12, 1); sfx('impact', { pal: 'poison', w: 0.5 });
    }
    if (s === DEATH && t === INCOMING + T_LAND_D) {                                             // 帽子落到泥沼上
      for (let i = 0; i < 10; i++) spawnX(K_PHYS, HX - 2 + (Math.random() - 0.5) * 16, HY - 1, (Math.random() - 0.5) * 40, -20 - Math.random() * 30, 0.5, R_MUD, { g: 200, floor: HY });
      shake(0.1, 1); sfx('fall', { w: 0.25 });
    }
  }
  const EVENTS = [[], [], [T_FLING], [], [T_POP], [], [], [INCOMING + T_LAND_D], []];
  const arcY = (x) => { const p = clamp01((x - shX) / Math.max(1, shTX - shX)); return -ARC * 4 * p * (1 - p); };
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 12, 40, 90, 0.2, 0.45, R_EL, 10); for (let i = 0; i < 6; i++) spawnX(K_PHYS, x, y, (Math.random() - 0.8) * 50, -20 - Math.random() * 30, 0.5, R_MUD, { g: 220, floor: HY }); hitDummy(0, 1); sfx('hit', { mat: 'flesh', w: 0.3 }); }
  }
  function stepFX(dt, state, stT) {
    const [gx, gy] = bowlScr();
    if (state === CHARGE && stT > 0.3 && stT < 1.35) {                                         // 蛙卵一颗颗从勺里飞进法阵中心
      eggAcc += dt * 7; while (eggAcc >= 1) { eggAcc -= 1; const T = 0.32, g = 200, vx = (CX - gx) / T, vy = (CY - 3 - gy) / T - 0.5 * g * T; spawnX(K_PHYS, gx, gy - 1, vx, vy, T + 0.12, R_EL, { g, floor: CY - 2, sz: 2 }); }
    }
    if ((state === CHARGE || state === CAST) && Math.random() < dt * 14) spawn(K_RISE, CX + (Math.random() - 0.5) * 14, CY - 1, (Math.random() - 0.5) * 4, -6 - Math.random() * 8, 0.35 + Math.random() * 0.3, R_EL);   // 泥泡
    if (state === CHARGE) { chargeAcc += dt * 10; while (chargeAcc >= 1) { chargeAcc -= 1; const r = 8 + Math.random() * 5; spawnX(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a: Math.random() * 6.28, r, w: 5 }); } }
    if (state === MOVE && P.wave !== lastWave) { if (P.wave === 0 || P.wave === 2) { spawn(K_DUST, scrX(-7), HY, -6 - Math.random() * 6, -2 - Math.random() * 3, 0.3, R_MUD); sfx('step', { w: 0.15 }); } lastWave = P.wave; }
    if (state === IDLE && Math.random() < dt * 1.6) spawn(K_EMBER, gx + RD(Math.random() * 2 - 1), gy - 2, Math.random() * 4 - 2, -5 - Math.random() * 5, 0.6 + Math.random() * 0.5, R_EL);
    if (shotT < 1) { const x = shX + 130 * shotT, dy = arcY(x); if (x < shTX && Math.random() < 0.7) spawn(K_TRAIL, x - 2, shY + (HY - 18 - shY) * (x - shX) / Math.max(1, shTX - shX) + dy, -10, 4, 0.2, R_EL); }
    if (state === DEATH && stT > INCOMING + 0.75 && stT < INCOMING + 2.4) {                   // 泥沼冒泡蒸发
      soulAcc += dt * (stT > INCOMING + 1.6 ? 26 : 8);
      while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 2 + (Math.random() - 0.5) * 20, HY - 1 - Math.random() * 2, (Math.random() - 0.5) * 6, -10 - Math.random() * 14, 0.7 + Math.random() * 0.7, stT > INCOMING + 1.6 && Math.random() < 0.5 ? FXI.soul : R_EL); }
    }
    circT += dt; recT += dt; frogT += dt; shotT += dt; smT += dt;
  }
  const K_TRAIL = E.K_TRAIL;
  function fxReset() { chargeAcc = 0; soulAcc = 0; eggAcc = 0; lastWave = -1; circT = 9; recT = 9; frogT = 9; shotT = 9; smT = 9; }
  // 泥沼法阵：外圈 / 中圈 / 内圈三层椭圆点阵 + 冒泡；收招时由外往里逐点熄灭
  function swampCircle(f12) {
    const st = E.state; if (!(st === CHARGE || st === CAST || st === RECOVER) || circT > 4) return;
    const grow = Math.min(1, circT / 0.3), RINGS = [[10, 2.6], [6.5, 1.7], [3, 0.8]];
    RINGS.forEach(([rx, ry], i) => {
      const n = Math.ceil(rx * 4), off = st === RECOVER ? clamp01((recT - i * 0.16) / 0.2) : 0;
      for (let k = 0; k < n; k++) {
        if (k / n < off) continue; if (i === 0 && ((k + f12) % 5) === 0) continue;
        const a = k / n * 6.2832 + (i & 1 ? -1 : 1) * circT * 1.4, x = RD(CX + Math.cos(a) * rx * grow), y = RD(CY + Math.sin(a) * ry * grow);
        put(x, y, i === 0 ? EL[2] : i === 1 ? EL[3] : EL[1]);
      }
    });
    if (st !== RECOVER || recT < 0.5) for (let k = 0; k < 3; k++) { const h = E.hash(k, (f12 >> 1) + k * 7); if (h < 0.5) put(RD(CX - 6 + h * 24), CY - (h < 0.2 ? 1 : 0), h < 0.15 ? EL[0] : EL[1]); }
  }
  function fxBack(f12) { swampCircle(f12); if (!P.sink) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  // 召唤出的小蛙人剪影（Froggo 同款：紫尖帽 + 荧绿帽带、嫩绿蛙皮带疣点、奶白肚、金眼）：9 × 11，脚底在最下一行
  const FROG = [
    '....h....',
    '...hH....',
    '...hHh...',
    '..hHHhh..',
    '.bbbbbbb.',
    '.gGGgeeo.',
    'ogGggepgo',
    'ogwggggoo',
    '.ogssso..',
    'oggsssgo.',
    'ogo.oggo.',
  ];
  const FC = { h: 42, H: 24, b: 50, g: 37, G: 38, w: 49, e: 14, p: 0, s: 62, o: 48 };
  function drawFrog(x, y, fade, f12) {
    for (let j = 0; j < FROG.length; j++) for (let i = 0; i < 9; i++) {
      const c = FROG[j][i]; if (c === '.') continue; if (fade > 0 && bayer(x + i, y + j) < fade) continue;
      put(x + i - 4, y + j - FROG.length + 1, FC[c]);
    }
  }
  function fxFront(f12) {
    const st = E.state;
    if (frogT < 4 && (st === CAST || st === RECOVER)) {                                        // 蛙人从泥里跳出 → 落地蹲着 → 收招末尾淡出
      const p = clamp01(frogT / T_POP), x = RD(CX + 9 * p), y = RD(CY - 1 - 16 * 4 * p * (1 - p) + (p < 0.15 ? 6 * (1 - p / 0.15) : 0));
      const fade = st === RECOVER ? clamp01((recT - 0.35) / 0.3) : 0; if (fade < 1) drawFrog(x, Math.min(CY - 1, y), fade, f12);
    }
    if (smT < 2 / 12) {                                                                         // 甩勺的拖影弧
      const c = smT < 1 / 12 ? EL[1] : EL[2];
      for (let k = 1; k < 10; k++) { if ((k & 1) && smT >= 1 / 12) continue; const a = smA1 + (smA0 - smA1) * k / 10, r = LB + 0.5; put(RD(smX + Math.sin(a) * r), RD(smY - Math.cos(a) * r), c); }
    }
    if (st === CHARGE && P.glow >= 2 && !P.sink) { const [gx, gy] = bowlScr(); for (let r = 2; r <= 3; r++) { put(gx + r, gy - 1, EL[1]); put(gx - r, gy - 1, EL[2]); put(gx, gy - 1 - r, EL[1]); } }
  }
  function drawShot(k, x, y, d, f12, Rr) {                                                       // 一团蛙卵：3×3 荧绿卵团 + 白芯，按抛物线抬高
    if (k !== 1) return false; const yy = y + RD(arcY(x));
    put(x, yy, 21); put(x - 1, yy, Rr[1]); put(x + 1, yy, Rr[1]); put(x, yy - 1, Rr[1]); put(x, yy + 1, Rr[2]); put(x - 1, yy - 1, Rr[2]); put(x + 1, yy + 1, Rr[3]); put(x - 1, yy + 1, Rr[3]);
    if (f12 & 1) put(x + 1, yy - 1, Rr[0]); return true;
  }

  return {
    name: '女巫', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.egg], HIT_POINT: [0, -13], EVENTS,
    SFX: { body: 'flesh', how: 'dissolve', pal: 'poison', style: 'summon', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
