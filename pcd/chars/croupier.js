// 荷官（croupier · 小游戏「午夜转盘」的 NPC）：高得不自然的瘦长荷官——9 格高的烟囱礼帽（酒红帽带）、瓷白无五官的蛋形脸（额头斜下一道裂纹）、
// 窄肩长身的墨蓝燕尾服（缎面驳领、白衬衫前襟、酒红领结、金表链、垂到膝下的长燕尾）、白手套的三根蜘蛛长指。画出来 55 行（含勾线 57），腰线离脚底 21 格。
// 待机：戴手套的三根手指在桌沿依次敲落，隔一会儿把脸转向镜头、歪一下头（像在看你）；移动：冰面上的滑步，身体不起伏，燕尾向后扬。
// 攻击「发球」：手腕后引、指尖捏出象牙小球 → 一甩，小球划一道弧弹出去（骨白短拖影），命中一点小火花。
// 技能「拨轮」：前倾、伸手扣住身前转盘外沿（金光点汇聚、轮沿一格格亮起）→ 手臂横扫一拨（身体帧里的运动模糊 + 整条手臂金色残影 + 身前一道弧形金扫光，
//             转盘飞转）→ 甩出一圈滚动的金色轮光，命中炸开并让目标转晕 → 收手、理一下领结。
// 受击「输钱一抖」：僵直一抖、礼帽被震得跳起、瓷脸裂纹闪一下。
// 死亡「大奖」：裂纹沿瓷面蔓延 → 脸转向镜头、裂开一道黑色咧嘴笑（里面透出冷光）→ 礼帽弹飞、双臂像提线木偶一样抬起、往后仰（游戏停在第 14 帧）
//             → 仰面倒地 → 碎成瓷片（死亡套件 chunks）+ 冷光升起。设定卡：pcd/batch-mini/croupier/design.md
PCD.define('croupier', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, fxRamp,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_EMBER, K_TRAIL, K_DUST, K_PHYS, K_BURST,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, death, copySprite, blitShape, sfx } = E;
  const RD = Math.round, PX = parts.px;

  // ───── 元素：发球 = 象牙骨白（全是共享色）· 拨轮 = 金（coin）· 死亡冷光 = frost ─────
  const R_IV = fxRamp('ivory', ['#ffffff', '#ebe9e1', '#cdc5a3', '#8d8670', '#524b6a']), IV = FXR[R_IV];
  const R_EL = FXI.coin, EL = FXR[R_EL], FR = FXR[FXI.frost];

  // ───── 材质 ─────
  const NV = ['#0e0e1a', '#1a1b2c', '#30375a'];                       // 墨蓝燕尾服三级（模块专属色）
  const M = parts.mats(E, {
    coat: [0, NV[0], NV[1], NV[2]], lapel: [0, NV[1], NV[2], '#4b5684'], sleeve: [0, NV[1], NV[2], '#4b5684'],   // 近侧袖亮一级，横在身前也看得出
    pants: [0, NV[0], NV[0], NV[1]], shoe: [0, NV[0], NV[1], 59], hat: [0, NV[0], NV[1], NV[2]],
    band: 'crimson', tie: 'crimson', gold: 'gold', shirt: [8, 18, 17, 21], face: [9, 18, 17, 21], glove: [8, 17, 21, 21], ivory: [7, 6, 17, 21],
    void: { r: 'ink', flat: 1 }, glow: { r: [23, 22, 22, 21], flat: 1 },
  });

  // ───── 骨架：瘦高到不自然（腿 19、躯干 16、脖子 2、头 9）；腰线（燕尾服前摆裁口）= 胯上 2 格 = y −21 ─────
  const BODY = { body: 'slim', leg: 19, torso: 16, head: 9, headW: 6, sw: 3, arm: 17, lw: 2, stride: 3, neck: 2, lift: 1, fall: 'back' };
  const HX = 50, DUR = DEFAULT_DUR.slice(); DUR[DEATH] = 3.4;
  const hero = new Sprite(84, 72, 51, 68), ghA = new Sprite(84, 72, 51, 68), ghB = new Sprite(84, 72, 51, 68);
  const WAIST = -21, WCX = 14, WCY = -24, WRX = 7, WRY = 2;             // 腰线；桌上转盘外沿（扁椭圆，本地坐标）
  const HIT_POINT = [2, -30];
  const SKIP = new Uint8Array(256), SKIP_D = new Uint8Array(256);
  for (const k of ['face', 'glove', 'ivory', 'void', 'glow', 'shirt', 'tie', 'gold', 'pants', 'shoe']) { SKIP[M[k]] = 1; SKIP[M[k + 'D']] = 1; }
  for (const k of ['face', 'glove', 'ivory', 'void', 'glow', 'gold', 'pants', 'shoe']) { SKIP_D[M[k]] = 1; SKIP_D[M[k + 'D']] = 1; }   // 死亡：瓷脸不吃光（冷光只照在领口、驳领、肩上）
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 20], rimRamp: IV, rimAll: 0, flash: 0, dq: 0, skip: SKIP };
  const RR = [0, 6, 10, 14], RR_D = [0, 7, 9, 11];

  // ───── 姿势 ─────
  // hm / bm 手型：0 搭桌（按 tap 敲）· 1 捏球 · 2 甩开 · 3 扣轮沿 · 4 下垂 · 5 捏领结 · 6 惊张 · 7 放松
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, step: 0, wup: 0, walk: 0, sway: 0, bend: 0,
    look: 0, tilt: 0, tap: 0, hm: 0, bm: 0, crack: 0, grin: 0, glow: 0, ball: 0, tie: 0, smear: 0, glint: 0,
    hatM: 0, hatX: 0, hatY: 0, hatR: 0, hatJ: 0, rim: 0, rimK: 0, flash: 0, lying: 0, lift: 0, dq: 0, dqk: 0, bx: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0 });
  const K_IDLE = K(14, -24, 14, -24);                                // 前手搭在桌沿（桌面 = 腰线 −21），后手叠在它后面
  const K_WIND = K(5, -29, 14, -24, -1);                                // 发球后引：手腕收到胸前
  const K_FLICK = K(14, -28, 14, -24, 1);                               // 甩腕
  const K_FOLLOW = K(16, -28, 14, -24, 1);
  const K_REACH = K(18, -26, -1, -22, 2, 1);                         // 后手收到身后                            // 前倾、扣住转盘外沿（右端）
  const K_SWEEP = K(11, -24, -1, -22, 2, 1);                            // 横扫到轮沿近侧
  const K_SWEPT = K(4, -26, -1, -22, 1);                                // 扫到身前左侧
  const K_SETTLE = K(5, -26, -1, -22, 1);
  const K_TIE = K(6, -36, 14, -24);                                   // 前手理领结，后手放回桌上
  const K_HURT = K(11, -27, 6, -26, -1);
  const K_STIFF = K(10, -28, 6, -27);
  const K_RAPT = K(11, -32, -10, -31, -2);                               // 大奖：双臂像提线木偶一样抬起
  const K_ARCH = K(11, -35, -13, -36, -3);
  const K_LIE = K(12, -31, 3, -19);                                    // 仰面倒地：前臂僵直地伸向天空，后手贴着身侧
  const K_GLIDE = K(3, -17, -2, -17, 1);                               // 滑步：双臂僵直垂到大腿
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  // 待机循环（2.4 s = 29 帧）：8–15 帧三指敲桌两轮，18–26 帧脸转向镜头、歪头，4–5 帧袖扣闪
  const TAP = []; for (let i = 0; i < 30; i++) TAP.push(0); TAP[8] = 1; TAP[9] = 2; TAP[10] = 3; TAP[12] = 1; TAP[13] = 2; TAP[14] = 3;
  const SWAY_IDLE = [0, 1, 0, -1];
  const T_FLICK = 2 / 12, T_REL = 1 / 12, T_ROLL = 2 / 12;
  const D_GRIN = 0.42, D_POP = 0.5, D_FALL = 0.95, D_LAND = 1.2, D_SHAT = 1.95;
  const KEY = E.keyer([['hx', -40, 30], ['hy', -60, 4], ['bhx', -40, 30], ['bhy', -60, 4], ['lean', -3, 3], ['head', -1, 1], ['bob', 0, 1], ['look', 0, 1], ['tilt', -1, 1],
    ['tap', 0, 3], ['hm', 0, 7], ['bm', 0, 7], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['bend', 0, 3], ['crack', 0, 4], ['grin', 0, 3], ['glow', 0, 2],
    ['ball', 0, 1], ['tie', 0, 1], ['smear', 0, 2], ['hatM', 0, 1], ['hatX', -55, 30], ['hatY', -70, 4], ['hatR', 0, 3], ['hatJ', 0, 3], ['rim', 0, 3], ['rimK', 0, 3],
    ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 4], ['dqk', 0, 48], ['bx', -4, 4]]);

  // 礼帽飞行：D_POP 从头顶弹起，向上向后抛物线，过顶点后下落更快（翻滚），落在头后方的地上
  const HAT_VX1 = -20, HAT_VX2 = -40, HAT_VY = -50, HAT_G1 = 125, HAT_G2 = 260;
  const HAT_T1 = -HAT_VY / HAT_G1;                                    // 到顶点 0.4 s
  const HAT_TL = HAT_T1 + Math.sqrt(2 * (-HAT0Y() - HAT_VY * HAT_T1 - 0.5 * HAT_G1 * HAT_T1 * HAT_T1) / HAT_G2);   // 落地时刻（相对弹起）
  function HAT0Y() { return -46; }
  function hatAt(d, x0, y0) {
    const s = Math.min(d - D_POP, HAT_TL); if (s <= HAT_T1) return [x0 + HAT_VX1 * s, y0 + HAT_VY * s + 0.5 * HAT_G1 * s * s, s];
    const yA = y0 + HAT_VY * HAT_T1 + 0.5 * HAT_G1 * HAT_T1 * HAT_T1, u = s - HAT_T1; return [x0 + HAT_VX1 * HAT_T1 + HAT_VX2 * u, yA + 0.5 * HAT_G2 * u * u, s];
  }
  const HAT0 = [0, -46];                                              // 头顶（K_STIFF 时的帽檐底）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    P.bx = 0; P.crouch = 0; P.bob = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.bend = 0; P.look = 0; P.tilt = 0; P.tap = 0; P.hm = 0; P.bm = 0;
    P.crack = 0; P.grin = 0; P.glow = 0; P.ball = 0; P.tie = 0; P.smear = 0; P.glint = 0; P.hatM = 0; P.hatX = 0; P.hatY = 0; P.hatR = 0; P.hatJ = 0;
    P.rim = 0; P.rimK = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.dq = 0; P.flip = 0; P.mx = 0;
    let focusFace = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const lp = tq % DUR[IDLE], fi = f12of(lp);
      P.bob = Math.floor(lp * 2.5 + 1e-6) & 1; P.sway = SWAY_IDLE[(Math.floor(lp * 1.25 + 1e-6) + 1) & 3];
      P.tap = TAP[fi] || 0;
      if (fi >= 18 && fi <= 26) { P.look = 1; P.tilt = fi >= 19 && fi <= 25 ? 1 : 0; }
      if (fi === 4 || fi === 5) P.glint = 1;
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 冰面滑步：腿几乎伸直、经过帧只抬 1 格、身体不起伏，燕尾向后扬
      setK(K_GLIDE, K_GLIDE, 0); const f = gait(tq);
      P.walk = 1; P.step = [1, 0, -1, 0][f]; P.wup = [0, 2, 0, 1][f]; P.bend = 2; P.sway = [0, -1, 0, 1][f]; P.hm = 4; P.bm = 4;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.hm = 1; P.ball = 1; P.rim = 1; P.rimK = 1; P.sway = 1; }
      else if (tq < 0.2) { setK(K_FLICK, K_FLICK, 0); P.hm = 2; P.rim = 2; P.rimK = 1; P.sway = -1; P.bend = 1; }
      else if (tq < 0.45) { setK(K_FLICK, K_FOLLOW, ease.out((tq - 0.2) / 0.25)); P.hm = 7; P.rim = 1; P.rimK = 1; P.sway = -1; }
      else { setK(K_FOLLOW, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.hm = tq < 0.6 ? 7 : 0; }
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_REACH, q);
      P.hm = q > 0.8 ? 3 : 7; P.bm = q > 0.5 ? 4 : 0; P.bend = RD(q * 2); P.sway = q > 0.9 ? ((f12 & 1) ? -1 : 0) : 0;   // bm 4：后手收到身后（垂着，藏在身体后面）
      P.rim = tq < 0.35 ? 1 : 2; P.rimK = 2;
    } else if (st === CAST) {                                          // 第 0 帧扣着轮沿 → 第 1 帧横扫到近侧（运动模糊）→ 第 2 帧扫到身前 → 定住
      P.bm = 4; if (tq < T_REL) { setK(K_REACH, K_REACH, 0); P.hm = 3; P.rim = 2; P.rimK = 2; P.bend = 2; }
      else if (tq < 2 / 12) { setK(K_SWEEP, K_SWEEP, 0); P.hm = 3; P.smear = 1; P.rim = 3; P.rimK = 2; P.bend = 3; P.sway = -2; }
      else if (tq < 3 / 12) { setK(K_SWEPT, K_SWEPT, 0); P.hm = 7; P.smear = 2; P.rim = 3; P.rimK = 2; P.bend = 3; P.sway = -1; }
      else { setK(K_SWEPT, K_SETTLE, ease.out(clamp01((tq - 0.25) / 0.2))); P.hm = 7; P.rim = 2; P.rimK = 2; P.bend = 2; }
    } else if (st === RECOVER) {                                       // 收手 → 捏住领结扯一下 → 放回桌面
      if (tq < 0.2) { setK(K_SETTLE, K_TIE, ease.inOut(tq / 0.2)); P.hm = 7; P.bm = tq < 0.1 ? 4 : 0; P.rim = 1; P.rimK = 2; P.bend = 1; }
      else if (tq < 0.45) { setK(K_TIE, K_TIE, 0); P.hm = 5; P.tie = tq >= 0.25 && tq < 0.34 ? 1 : 0; P.hx += P.tie; }
      else { setK(K_TIE, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.25))); P.hm = tq < 0.62 ? 7 : 0; }
    } else if (st === HURT) {                                          // 输钱一抖
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.25) { const j = f12of(h); setK(K_HURT, K_HURT, 0); P.bx = [-2, -1, -2][j]; P.hm = 6; P.bm = 6; P.flash = j === 0 ? 1 : 0; P.crack = j < 2 ? 1 : 0; P.hatJ = [1, 3, 2][j]; P.sway = 1; }
      else if (h < 0.38) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.hm = 7; P.bm = 7; P.sway = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.38) / 0.12)));
    } else if (st === DEATH) {                                         // 大奖：裂纹蔓延 → 咧嘴 → 礼帽弹飞、后仰 → 仰面倒地 → 碎成瓷片
      const d = tq - INCOMING;
      if (d < 0) idle();
      else {
        focusFace = 1; P.hm = 6; P.bm = 6;
        if (d < 1 / 12) { setK(K_STIFF, K_STIFF, 0); P.bx = -2; P.flash = 1; P.crack = 1; P.hatJ = 1; }
        else if (d < 0.25) { setK(K_STIFF, K_STIFF, 0); P.bx = (f12 & 1) ? -1 : -2; P.crack = 2; P.hatJ = (f12 & 1) ? 1 : 0; P.sway = 1; }
        else if (d < D_GRIN) { setK(K_STIFF, K_RAPT, 0.3); P.bx = -1; P.crack = 3; P.look = d >= 0.33 ? 1 : 0; }
        else if (d < D_FALL) {
          const q = clamp01((d - D_GRIN) / 0.33); setK(K_STIFF, K_RAPT, 0.3 + 0.7 * ease.out(q)); if (d >= 0.75) setK(K_ARCH, K_ARCH, 0);
          P.bx = -1; P.look = 1; P.crack = d < 0.6 ? 3 : 4; P.grin = d < D_POP ? 1 : d < 0.6 ? 2 : 3; P.glow = d < D_POP ? 1 : d < 0.6 ? ((f12 & 1) ? 2 : 1) : 2;
          P.tilt = d >= 0.66 ? 1 : 0; P.bend = 1; P.sway = -1; if (d >= 0.6) { P.rim = 1; P.rimK = 3; }   // 大咧嘴时冷光照亮领口和肩（瓷脸自己不吃光）
        } else {
          setK(K_LIE, K_LIE, 0); P.lying = 1; P.crack = 4; P.grin = 3; P.hm = 6; P.bm = 4;
          P.lift = d < 1.05 ? 2 : d < D_LAND ? 1 : 0;   // rig 和 begin 各抬一次：离地 4 → 2 → 0
          P.glow = d < 1.35 ? 2 : d < 1.5 ? ((f12 % 3) ? 1 : 0) : 0;
          if (d >= D_SHAT) P.dq = 1;
        }
        if (d >= D_POP) {                                              // 礼帽：弹起 → 扶正 / 往后歪 / 横着 / 倒扣翻滚 → 横着落地
          const h = hatAt(d, HAT0[0] - 1, HAT0[1]); P.hatM = 1; P.hatX = RD(h[0]); P.hatY = Math.min(0, RD(h[1]));
          P.hatR = h[2] < 0.12 ? 0 : h[2] < 0.45 ? 1 : h[2] < 0.7 ? 2 : 3;
          if (P.hatY >= -1) { P.hatY = 0; P.hatR = 2; }
        }
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy); P.lean = RD(P.lean); P.head = RD(P.head);
    P.dqk = RD(P.dq * 48);
    const R = parts.rig(P, BODY);
    if (focusFace) { const f = parts.toSprite(R, R.hx, R.ey + 2); P.gx = f[0] + P.bx; P.gy = f[1] - P.lift; }
    else if (st === CHARGE || st === CAST) { P.gx = P.hx + 5 + P.bx; P.gy = P.hy + 1; }
    else { P.gx = P.hx + 3 + P.bx; P.gy = P.hy - 1; }
    KEY(P);
  }

  // ───── 画 ─────
  // 手套形状（面朝右；o = 挂点，就是手臂瞄准的那一格）。p 手掌 · 0/1/2 三根手指（2 最远、先画；0 最近、最后画）· b 象牙小球
  function grid(rows) {
    let ox = 0, oy = 0; rows.forEach((r, j) => { const i = r.indexOf('o'); if (i >= 0) { ox = i; oy = j; } });
    const o = []; rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = r[i] === 'o' ? 'p' : r[i]; if (c !== '.') o.push([i - ox, j - oy, c]); } }); return o;
  }
  // 搭桌：手背拱起、三根细长的指头像蜘蛛腿一样竖着点在桌面上（指间 1 格缝），手掌根也着桌；桌面接触行 = 挂点下 2 行
  const SHAPES = [
    grid(['..ppp....', '.pppppppp', '.op.0.1.2', '.pp.0.1.2', '.pp.0.1.2']),                 // 0 搭桌（tap 抬起的指头少最下 1 格）
    grid(['.1bb2', '.1bb2', 'ppp.2', 'pop00', 'ppp..']),                                      // 1 捏球
    grid(['......2', '.....2.', '.pp.2..', 'pop11111', 'ppp.0..', '.....0.', '......0']),     // 2 甩开
    grid(['..ppp....', '.pppppppp', '.op.0.1.2', '....0.1.2', '....0.1..']),                 // 3 扣轮沿
    grid(['ppp..', 'pop..', 'pppp.', '2.1.0', '2.1.0', '2.1..', '..1..']),                    // 4 下垂
    grid(['.11pp', '..pop', '.00pp']),                                                        // 5 捏领结
    grid(['.2....', '.2.1..', '.2.1.0', '.pp.0.', 'ppp0..', 'pop...']),                       // 6 惊张
    grid(['..ppp....', '.pppppppp', '.op.0.1.2', '....0.1.2']),                               // 7 放松（指头垂下 2 格、悬着）
  ];
  const TAPUP = [[0, 0, 0], [1, 1, 1], [0, 1, 1], [0, 0, 1]];         // tap 0 全落 · 1 全抬 · 2 第一根落 · 3 前两根落
  function glove(R, hx, hy, mode, far, tap) {
    const gm = far ? M.gloveD : M.glove, fm = [gm, gm, M.gloveD], S = SHAPES[mode] || SHAPES[7], up = mode === 0 ? TAPUP[tap || 0] : [0, 0, 0];
    E.part(); for (const [x, y, c] of S) if (c === 'p') PX(E, R, hx + x, hy + y, gm, 0);
    for (const k of ['2', '1', '0']) { E.part(); for (const [x, y, c] of S) if (c === k && !(up[+k] && y === 2)) PX(E, R, hx + x, hy + y, fm[+k], 0); }
    if (P.ball && !far && mode === 1) { E.part(); let n = 0; for (const [x, y, c] of S) if (c === 'b') { PX(E, R, hx + x, hy + y, M.ivory, n === 0 ? 4 : n === 3 ? 2 : 3); n++; } }
  }

  // 燕尾（远侧那片先画、暗一级、错后 1 格、短 1 行）
  function tailRows(R, far, cb) {
    const bend = RD(P.bend), sway = RD(P.sway), y0 = WAIST, y1 = -8 - (far ? 1 : 0), n = y1 - y0;
    for (let y = y0; y <= y1; y++) {
      const t = (y - y0) / n, e = parts.edges(R, Math.min(y, R.yHip));
      const back = e[0] + 1 - (far ? 1 : 0) - RD(bend * t * t * 1.6) + RD(sway * t * t), w = Math.max(1, RD(4 - 3 * t));
      cb(y, back, back + w - 1, t);
    }
  }
  function coat(R) {
    const yS = R.yS;
    E.part();
    for (let y = yS; y <= WAIST; y++) {
      const e = parts.edges(R, y); let L = e[0], Rr = e[1];
      if (y === yS) { L = e[0] - 1; }                                  // 方肩
      if (y >= yS + 2 && y <= yS + 8) Rr += 1;                         // 胸
      if (y >= WAIST - 4) L += 1;                                      // 收腰
      for (let x = L; x <= Rr; x++) PX(E, R, x, y, M.coat, 0);
      if (y > yS && y <= WAIST - 2) PX(E, R, Rr + 1, y, M.shirt, y === yS + 1 ? 4 : 0);   // 白衬衫前襟（侧面看是一条白线）
      if (y <= yS + 7) { PX(E, R, Rr, y, M.lapel, y <= yS + 2 ? 4 : 0); if (y <= yS + 2) PX(E, R, Rr - 1, y, M.lapel, 0); }   // 缎面尖驳领
      if (y === yS + 3) PX(E, R, Rr - 1, y, M.coat, 1);               // 驳领缺口
      if (y >= yS + 3 && y <= WAIST - 1) PX(E, R, L + 1, y, M.coat, 2); // 后背褶线
    }
    { const e = parts.edges(R, WAIST - 1), Rr = e[1];                  // 腰前一截白马甲尖 + 金表链（腰线以上）
      PX(E, R, Rr + 1, WAIST - 1, M.shirt, 0); PX(E, R, Rr, WAIST - 1, M.shirt, 0);
      PX(E, R, Rr, WAIST - 3, M.gold, 4); PX(E, R, Rr - 1, WAIST - 2, M.gold, 3); PX(E, R, Rr - 2, WAIST - 2, M.gold, 3); PX(E, R, Rr - 3, WAIST - 3, M.gold, 2); PX(E, R, Rr - 3, WAIST - 4, M.gold, 4); }
    for (let y = WAIST + 1; y <= R.yHip; y++) { const e = parts.edges(R, y); for (let x = e[0] + 1; x <= e[1]; x++) PX(E, R, x, y, M.pants, 0); }   // 裤腰
    tailRows(R, 0, (y, a, b, t) => { for (let x = a; x <= b; x++) PX(E, R, x, y, M.coat, x === b && t > 0.1 ? 2 : 0); });   // 近侧燕尾（和身体同一个部件）
  }
  function neckCollar(R) {                                             // 白翼领直接托住下巴（脖子藏在领子里），领尖向前翘
    E.part();
    for (let y = R.hy + 1; y <= R.yS; y++) for (let x = R.hx - 1; x <= R.hx + 1; x++) PX(E, R, x, y, M.shirt, 0);
    PX(E, R, R.hx + 2, R.hy + 1, M.shirt, 4);
  }
  function bowTie(R) {                                                 // 酒红领结（侧面：上下两翼 + 中间的结）；tie = 1 被扯歪
    E.part(); const x = R.hx + 2, y = R.yS - 1, s = P.tie;
    PX(E, R, x + s, y, M.tie, 4); PX(E, R, x + 1 + s, y, M.tie, 3); PX(E, R, x, y + 1, M.tie, 2); PX(E, R, x, y + 2, M.tie, 3); PX(E, R, x + 1 - s, y + 2, M.tie, 2);
  }
  // 瓷脸：侧脸 6 宽（前沿在眼到嘴那几行外凸 1 格，没有鼻子），正脸 7 宽；裂纹、咧嘴和脸同一个部件
  // 裂纹（dx 相对脸前沿 x1 / 正脸中线 c，dy 相对头顶）：[0] 额头斜下的那一道；受击闪白；死亡时分叉、加深，一路裂到嘴角
  const CR_P = [[[0, 3], [-1, 4], [-1, 5]], [[-1, 4], [-2, 3], [-3, 3]], [[0, 3], [0, 2], [-1, 1]], [[-3, 3], [-4, 2], [-4, 1]]];
  const CR_F = [[[2, 2], [1, 3], [1, 4], [0, 5]], [[1, 4], [2, 5]], [[2, 2], [2, 1], [1, 0]]];   // 正脸只往右半边、头顶和嘴角裂，左右不对称（不裂出「眼窝」）
  // 咧嘴（黑 V + 冷光 G）：1 细缝 · 2 张开 · 3 月牙大咧嘴（嘴角翘到眼睛那一行）
  const GRIN_F = [null,
    [[-3, 1, 'V'], [3, 1, 'V'], [-2, 2, 'V'], [-1, 2, 'V'], [0, 2, 'V'], [1, 2, 'V'], [2, 2, 'V']],
    [[-3, 1, 'V'], [3, 1, 'V'], [-2, 2, 'V'], [-1, 2, 'V'], [0, 2, 'G'], [1, 2, 'V'], [2, 2, 'V'], [-1, 3, 'V'], [0, 3, 'V'], [1, 3, 'V']],
    [[-3, 0, 'V'], [3, 0, 'V'], [-3, 1, 'V'], [-2, 1, 'V'], [2, 1, 'V'], [3, 1, 'V'], [-2, 2, 'V'], [-1, 2, 'G'], [0, 2, 'C'], [1, 2, 'G'], [2, 2, 'V'], [-1, 3, 'V'], [0, 3, 'V'], [1, 3, 'V']]];
  const GRIN_P = [null,
    [[1, 2, 'V'], [0, 2, 'V'], [-1, 2, 'V'], [-2, 1, 'V'], [-3, 1, 'V']],
    [[1, 2, 'V'], [0, 2, 'G'], [-1, 2, 'V'], [-2, 1, 'V'], [-3, 1, 'V'], [0, 3, 'V'], [1, 3, 'V']],
    [[-4, 0, 'V'], [-3, 1, 'V'], [-2, 1, 'V'], [-2, 2, 'V'], [-1, 2, 'G'], [0, 2, 'C'], [1, 2, 'V'], [-1, 3, 'V'], [0, 3, 'V'], [1, 3, 'V']]];
  function head(R) {
    E.part();
    const top = R.htop, bot = R.hy, ey = R.ey, tl = R.lie ? 0 : P.tilt, fr = P.look && !R.lie, y0 = P.hatM ? top : top + 2 - (P.hatJ || 0);   // 帽子戴着时，帽檐下面才画脸（帽子先画，脸不被压黑）
    const F = (x, y, m, t) => { if (y >= y0) PX(E, R, x + (tl && y < ey ? -tl : 0), y, m, t); };
    const cm = P.crack === 1 ? M.glow : M.face, ct = P.crack === 1 ? 4 : P.crack >= 2 ? 1 : 2, nCr = P.crack <= 1 ? 1 : P.crack === 2 ? 2 : fr ? 3 : 4;
    const mouth = (G, ox) => { if (!P.grin) return; for (const [dx, dy, k] of G[P.grin]) { const x = ox + dx, y = ey + dy; if (k === 'V' || !P.glow) F(x, y, M.void, 0); else F(x, y, M.glow, k === 'C' && P.glow === 2 ? 4 : 3); } };
    if (!fr) {                                                          // 侧脸：6 宽，前沿在眼到嘴那几行外凸 1 格（没有鼻子）
      const x0 = R.hx0, x1 = R.hx1;
      for (let y = top; y <= bot; y++) {
        let a = x0, b = x1;
        if (y === top) { a++; b--; }
        if (y >= ey - 1 && y <= ey + 2) b++;
        if (y === bot - 1) a++;
        if (y === bot) a += 2;
        for (let x = a; x <= b; x++) F(x, y, M.face, 0);
      }
      F(x1, ey - 2, M.face, 4);
      for (let i = 0; i < nCr; i++) for (const [dx, dy] of CR_P[i]) F(x1 + dx, top + dy, cm, ct);
      mouth(GRIN_P, x1);
    } else {                                                            // 正脸：7 宽对称蛋形
      const c = R.hx;
      for (let y = top; y <= bot; y++) {
        let a = c - 3, b = c + 3;
        if (y === top || y === bot - 1) { a++; b--; }
        if (y === bot) { a += 2; b -= 2; }
        for (let x = a; x <= b; x++) F(x, y, M.face, 0);
      }
      F(c - 2, top + 2, M.face, 4); F(c - 2, top + 3, M.face, 4);
      for (let i = 0; i < nCr; i++) for (const [dx, dy] of CR_F[i]) F(c + dx, top + dy, cm, ct);
      mouth(GRIN_F, c);
    }
  }
  // 礼帽（帽子本地坐标：u = 0 帽冠中线，v = 0 帽檐行，向上为负）；sh = 帽顶往后歪的格数（逐行错位）
  function hat(T, sh) {
    E.part();
    const hp = (u, v, m, t) => PX(E, T, u - (sh ? Math.floor(-v * sh / 9 + 0.5) : 0), v, m, t);
    for (let u = -4; u <= 5; u++) hp(u, 0, M.hat, 0);
    hp(-5, -1, M.hat, 4); hp(6, -1, M.hat, 3);                         // 两头上卷的帽檐
    for (let v = -1; v >= -9; v--) {
      const fl = v <= -8 ? 1 : 0;
      for (let u = -2 - fl; u <= 3 + fl; u++) hp(u, v, v >= -2 ? M.band : M.hat, v === -9 ? 4 : 0);
      if (v <= -3 && v >= -8) hp(-1, v, M.hat, 4);                    // 帽身左侧一条缎面高光
    }
  }
  function hatOnHead(R) {
    const T = { r0: 0, tx: R.hx, ty: R.htop + 1 - (P.hatJ || 0), rot: R.rot, ox: R.ox, oy: R.oy };
    hat(T, R.lie ? 0 : P.tilt);
  }
  function hatFree() {
    const r = P.hatR, T = { r0: r === 2 ? 3 : r === 3 ? 2 : 0, tx: P.hatX - P.bx, ty: P.hatY + P.lift + (r === 2 ? -5 : r === 3 ? -9 : 0), rot: 0, ox: 0, oy: 0 };   // 不跟身体的 bx / lift 走
    hat(T, r === 1 ? 3 : 0);
  }
  // 拨轮的运动模糊（画在身体帧里，游戏只取身体帧也看得出横扫）：沿轮沿近侧一道袖子亮面 + 金边
  function smear(R) {
    E.part(); const a0 = P.smear === 1 ? 0 : Math.PI * 0.5, a1 = P.smear === 1 ? Math.PI * 0.5 : Math.PI;
    for (let k = 0; k <= 12; k++) {
      const a = a0 + (a1 - a0) * k / 12, x = WCX + Math.cos(a) * WRX, y = WCY - 1 + Math.sin(a) * (WRY + 1);
      if (P.smear === 2 && (k & 1)) continue;
      PX(E, R, x, y, M.sleeve, 4); PX(E, R, x, y + 1, M.gold, P.smear === 1 ? 4 : 3);
      if (P.smear === 1) PX(E, R, x, y - 1, M.sleeve, 4);
    }
  }
  let cuffF = [0, 0], armOnly = 0;                                     // armOnly：只画前臂和手（拨轮残影用）
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    const R = parts.rig(P, BODY);
    if (armOnly) { parts.arm(E, R, P, { side: 'F', sleeve: 'tight', mat: M.sleeve, cuff: M.shirt, grip: 'none' }); glove(R, P.hx, P.hy, P.hm, 0, 0); return; }
    E.part(); tailRows(R, 1, (y, a, b) => { for (let x = a; x <= b; x++) PX(E, R, x, y, M.coatD, 0); });
    const aB = parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.sleeveD, cuff: M.shirtD, grip: 'none' });
    if (!(P.bhx === P.hx && P.bhy === P.hy)) glove(R, P.bhx, P.bhy, P.bm, 1, 0);   // 后手和前手叠在同一处时不画（前手敲桌抬起的指尖下面才是空的）
    parts.legs(E, R, P, { style: 'shoe', mat: M.pants, matD: M.pantsD, boot: M.shoe, bootD: M.shoeD, w: 2, bootH: 2 });
    coat(R);
    neckCollar(R);
    if (!P.hatM) hatOnHead(R);
    head(R);
    bowTie(R);
    if (P.smear) smear(R);
    const aF = parts.arm(E, R, P, { side: 'F', sleeve: 'tight', mat: M.sleeve, cuff: M.shirt, grip: 'none' });
    PX(E, R, aF.wx, aF.wy, M.gold, 4); cuffF = [aF.wx, aF.wy];          // 金袖扣（和袖口同一个部件）
    glove(R, P.hx, P.hy, P.hm, 0, P.tap);
    if (P.hatM) hatFree();
    return aB;
  }
  function bakeHero() {
    const k = P.rimK; RIM.rim = P.rim; RIM.rimRamp = k === 1 ? IV : k === 2 ? EL : FR; RIM.rimAll = k === 3 ? 1 : 0; RIM.rimR = k === 3 ? RR_D : RR; RIM.skip = k === 3 ? SKIP_D : SKIP;
    RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
  }

  // ───── 特效 ─────
  let flT = 9, flX = 0, flY = 0, arcT = 9;                            // 甩腕：指尖小星、手走过的弧
  let bOn = 0, bX = 0, bY = 0, bVX = 0, bVY = 0, bTX = 0;             // 象牙小球（自己模拟抛物线）
  const B_G = 240;
  let swT = 9, ghT = 9, spin = 0, spinV = 0, chargeAcc = 0, emberAcc = 0, coldAcc = 0, soulAcc = 0, lastStep = 0;
  function snap(dst, st, t) { armOnly = 1; poseAt(st, t, t); drawHero(); bakeHero(); armOnly = 0; copySprite(dst, hero); hero.k1 = hero.k2 = -1; }
  const wheelX = (a, rx) => scrX(WCX + Math.cos(a) * (rx || WRX)), wheelY = (a, ry) => HY + WCY + Math.sin(a) * (ry || WRY);
  function onEnter(s) {
    if (s === CAST) { snap(ghA, CHARGE, DUR[CHARGE] - 0.01); snap(ghB, CAST, 1.5 / 12); poseAt(CAST, 0, E.simT); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) {
      flT = 0; arcT = 0; flX = scrX(P.hx + 8 + P.bx); flY = HY + P.hy;
      const x0 = flX, y0 = flY, ty = HY - 17; bTX = DUMMY_X - 3; const T = Math.max(0.2, (bTX - x0) / 150);
      bVX = (bTX - x0) / T; bVY = (ty - y0) / T - 0.5 * B_G * T; bOn = 1; bX = x0; bY = y0;
      burst(x0, y0, 5, 20, 50, 0.1, 0.22, R_IV, 4);
      sfx('swing', { kind: 'throw', w: 0.2 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === CAST && t === T_REL) {                                   // 横扫：汇聚的光点外爆、金火花、震屏、天空闪白、轮沿飞转
      const gx = wheelX(0), gy = wheelY(0);
      releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 }); burst(wheelX(Math.PI / 2), wheelY(Math.PI / 2), 20, 50, 120, 0.25, 0.6, R_EL, 8);
      swT = 0; ghT = 0; spinV = 36; shake(0.28, 2); flash(0.05); void gx; void gy;
    }
    if (s === CAST && t === T_ROLL) {                                  // 甩出滚动的金色轮光
      const x = wheelX(0) + 3, y = wheelY(0);
      shoot(2, x, y, 150, DUMMY_X - 5, R_EL, (HY - 16 - y) * 150 / Math.max(10, DUMMY_X - 5 - x), { trail: { every: 2, life: [0.12, 0.25], back: [10, 25] } });
      for (let i = 0; i < 6; i++) spawn(K_BURST, x, y + (Math.random() * 4 - 2), 60 + Math.random() * 60, -10 - Math.random() * 30, 0.2 + Math.random() * 0.2, R_EL);
    }
    if (s === DEATH) {
      const fx0 = scrX(P.gx), fy0 = HY + P.gy;
      if (t === INCOMING + D_GRIN) { burst(fx0 - 4, fy0 - 1, 5, 20, 50, 0.2, 0.45, FXI.frost, 8); burst(fx0 + 4, fy0 - 1, 5, 20, 50, 0.2, 0.45, FXI.frost, 8); }
      if (t === INCOMING + D_POP) burst(scrX(HAT0[0] - 1), HY + HAT0[1], 8, 30, 70, 0.15, 0.35, R_IV, 10);
      if (t === INCOMING + D_LAND) {
        for (let i = 0; i < 16; i++) { const x = HX - 34 + Math.random() * 50; spawn(K_DUST, x, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); }
        shake(0.1, 1); sfx('fall', { w: 0.3 });
      }
      if (t === INCOMING + D_SHAT) {                                   // 碎成瓷片
        poseAt(DEATH, INCOMING + D_SHAT - 0.02, E.simT); drawHero(); bakeHero();
        death.start('chunks', { chunk: 3, power: 0.55, fromX: -12, fromY: 2, fadeAt: 0.6, fadeDur: 0.5 });
        hero.k1 = hero.k2 = -1;
        for (let i = 0; i < 22; i++) { const x = HX - 32 + Math.random() * 44; spawnX(K_PHYS, x, HY - 2 - Math.random() * 5, (Math.random() - 0.5) * 70, -40 - Math.random() * 70, 0.8 + Math.random() * 0.6, R_IV, { g: 300, floor: HY - 1 }); }
        for (let i = 0; i < 14; i++) spawn(K_RISE, HX - 30 + Math.random() * 40, HY - 2 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.frost);
        shake(0.1, 1); sfx('hit', { mat: 'stone', w: 0.5 });
      }
    }
  }
  const EVENTS = [[], [], [T_FLICK], [], [T_REL, T_ROLL], [], [], [INCOMING + D_GRIN, INCOMING + D_POP, INCOMING + D_LAND, INCOMING + D_SHAT], []];
  function impactOn(k, x, y) {
    if (k === 2) {
      burst(x, y, 36, 60, 150, 0.3, 0.7, R_EL, 16); ring(x, y, 1, R_EL); fx.cross(x, y, 7, R_EL, 0.3);
      hitDummy(1, 1); shake(0.12, 1); E.dummyFx({ stun: 1, dur: 1.4 }); sfx('impact', { pal: 'coin', w: 0.3 });
    }
  }
  function hurtFx(s) {
    const hx = HX + HIT_POINT[0] - 1, hy = HY + HIT_POINT[1], fx0 = HX + 3, fy0 = HY - 42;
    burst(hx, hy, s === DEATH ? 14 : 10, 50, 120, 0.2, 0.45, FXI.impact, 18);
    for (let i = 0; i < (s === DEATH ? 8 : 4); i++) spawnX(K_PHYS, fx0 + Math.random() * 2, fy0 + Math.random() * 3, 20 + Math.random() * 40, -40 - Math.random() * 40, 0.7 + Math.random() * 0.4, R_IV, { g: 260, floor: HY - 1 });
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04);
    return true;
  }
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) sfx('step', { w: 0.1 }); lastStep = P.step; }
    if (state === CHARGE && stT > 0.25) {                              // 金光点螺旋汇聚到扣手处
      const gx = wheelX(0), gy = wheelY(0);
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 9; spawn(K_SPIRAL_PT, gx, gy, (r - 2) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, Math.random() * 6.2832, r, 4 + Math.random() * 3); }
    }
    if (state === RECOVER && stT < 0.5) { emberAcc += dt * 12; while (emberAcc >= 1) { emberAcc -= 1; const a = Math.random() * 6.2832; spawn(K_EMBER, wheelX(a), wheelY(a), Math.random() * 6 - 3, -6 - Math.random() * 8, 0.5 + Math.random() * 0.5, R_EL); } }
    if (state === DEATH && stT > INCOMING + D_GRIN && stT < INCOMING + 1.5) { coldAcc += dt * 7; while (coldAcc >= 1) { coldAcc -= 1; const sd = Math.random() < 0.5 ? -1 : 1; spawn(K_EMBER, scrX(P.gx + sd * 4), HY + P.gy - 2, sd * (4 + Math.random() * 6), -8 - Math.random() * 8, 0.4 + Math.random() * 0.4, FXI.frost); } }   // 冷光从两边嘴角往外上方冒
    if (state === DEATH && stT > INCOMING + D_SHAT && stT < INCOMING + 2.8) { soulAcc += dt * 18; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 30 + Math.random() * 40, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, FXI.frost); } }
    if (bOn) {                                                         // 小球：抛物线 + 骨白短拖尾
      bVY += B_G * dt; bX += bVX * dt; bY += bVY * dt;
      spawn(K_TRAIL, bX - 1, bY + (Math.random() - 0.5), -bVX * 0.12, -bVY * 0.12, 0.07 + Math.random() * 0.07, R_IV);
      if (bX >= bTX) {
        bOn = 0; burst(bX, bY, 7, 30, 70, 0.1, 0.25, R_IV, 8); fx.cross(bX, bY, 3, R_IV, 0.12); hitDummy(0, 1); sfx('hit', { mat: 'stone', w: 0.2 });
        spawnX(K_PHYS, bX - 1, bY, -35, -70, 0.9, R_IV, { g: 300, floor: HY - 1, sz: 2 });
      }
    }
    flT += dt; arcT += dt; swT += dt; ghT += dt; spin += spinV * dt; spinV *= Math.pow(0.25, dt);
  }
  function fxReset() { flT = 9; arcT = 9; bOn = 0; swT = 9; ghT = 9; spin = 0; spinV = 0; chargeAcc = 0; emberAcc = 0; coldAcc = 0; soulAcc = 0; lastStep = 0; }
  // 转盘外沿：32 个刻点；蓄力时从扣手处逐格亮起，施放后 3 颗白亮点绕圈追（飞转），收招时变暗停下。back = 画远半圈（角色后面）
  function wheel(back, f12) {
    const st = E.state, t = E.stT; if (st !== CHARGE && st !== CAST && st !== RECOVER) return;
    const N = 32, lit = st === CHARGE ? Math.floor(clamp01((t - 0.2) / 1.0) * N) : N, fade = st === RECOVER ? clamp01((t - 0.2) / 0.45) : 0;
    if (fade >= 1) return;
    for (let k = 0; k < N; k++) {
      const a = -k / N * 6.2832, s = Math.sin(a); if (back ? s >= 0 : s < 0) continue;
      const x = RD(wheelX(a)), y = RD(wheelY(a));
      let c = -1;
      if (st === CHARGE) { if (k < lit) c = k >= lit - 2 ? ((f12 & 1) ? EL[0] : EL[1]) : EL[2]; else if (t > 0.12) c = EL[4]; }   // 没亮的轮沿是一圈暗金底线
      else { c = fade > 0.5 ? ((k + f12) & 1 ? -1 : EL[4]) : fade > 0.2 ? EL[3] : EL[2]; const ph = (((k / N * 6.2832 - spin) % 2.0944) + 2.0944) % 2.0944; if (ph < 0.4 && fade < 0.6) c = st === CAST ? EL[0] : EL[1]; }
      if (c >= 0) put(x, y, c);
    }
  }
  function fxBack(f12) {
    const st = E.state;
    if ((st === CHARGE || st === CAST) && P.rim >= 2) floorGlow(RD(wheelX(0)) - 4, P.rim, EL, f12);
    wheel(1, f12); shotFloorGlow(f12);
  }
  function fxMid(f12) {                                                // 整条手臂的金色残影（蓄力姿 + 扫到一半），0.3 s 抖动消散
    if (ghT < 0.3) { const q = ghT / 0.3; blitShape(ghA, HX + P.mx, HY, P.flip, EL[3], 0.15 + q * 0.85); if (ghT > 1 / 12) blitShape(ghB, HX + P.mx, HY, P.flip, EL[2], 0.1 + q * 0.9); }
  }
  function fxFront(f12) {
    wheel(0, f12);
    if (swT < 0.4) {                                                   // 身前一道弧形金扫光（沿轮沿近侧的半圈）
      const q = swT, a1 = q < 1 / 12 ? Math.PI * 0.5 : Math.PI, c0 = q < 1 / 12 ? EL[0] : q < 2 / 12 ? EL[1] : q < 0.25 ? EL[2] : EL[3];
      const n = 26; for (let k = 0; k <= n; k++) { const a = a1 * k / n; if (q > 0.25 && (k & 1)) continue; const x = RD(wheelX(a, WRX + 2)), y = RD(wheelY(a, WRY + 2)); put(x, y, c0); if (q < 2 / 12) put(x, y + 1, q < 1 / 12 ? EL[1] : EL[2]); }
    }
    if (arcT < 2 / 12) {                                               // 甩腕：手走过的象牙色弧
      const c = arcT < 1 / 12 ? IV[1] : IV[2];
      for (let k = 0; k <= 10; k++) { if (arcT >= 1 / 12 && (k & 1)) continue; const s = k / 10, x = RD(scrX(K_WIND.hx + 1 + (K_FLICK.hx + 6 - K_WIND.hx) * s)), y = RD(HY + K_WIND.hy - 4 + (K_FLICK.hy + 4 - K_WIND.hy) * s - Math.sin(s * Math.PI) * 4); put(x, y, c); }
    }
    if (flT < 2 / 12) { const c = flT < 1 / 12 ? IV[0] : IV[1]; put(flX, flY, IV[0]); for (let r = 1; r <= 2; r++) { const cc = r === 1 ? c : IV[2]; put(flX + r, flY, cc); put(flX - r, flY, cc); put(flX, flY - r, cc); put(flX, flY + r, cc); } }
    if (bOn) { const x = RD(bX), y = RD(bY); put(x, y, IV[0]); put(x + 1, y, IV[1]); put(x, y + 1, IV[1]); put(x + 1, y + 1, IV[2]); }
    if (P.glint && !P.lying) { const x = scrX(cuffF[0] + P.bx), y = HY + cuffF[1]; put(x, y - 1, EL[0]); put(x, y - 2, EL[1]); put(x - 1, y - 1, EL[1]); put(x + 1, y - 1, EL[1]); put(x, y - 3, EL[2]); }
  }
  // 滚动的金色轮光：金圈 + 两根转动的辐条 + 白芯（4 个朝向，每帧换一档）
  const SPOKE = [[1, 0], [1, 1], [0, 1], [-1, 1]];
  function drawShot(k, x, y, d, f12, R) {
    if (k !== 2) return false;
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832; put(RD(x + Math.cos(a) * 3.4), RD(y + Math.sin(a) * 3.4), (i + f12) % 4 === 0 ? R[1] : R[2]); }
    const s = SPOKE[f12 & 3]; for (let r = 1; r <= 2; r++) { put(x + s[0] * r, y + s[1] * r, R[1]); put(x - s[0] * r, y - s[1] * r, R[1]); }
    put(x, y, R[0]); return true;
  }

  return {
    name: '荷官', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glow], HIT_POINT, EVENTS, MAX_H: 60,
    deathKit: { mode: 'chunks', at: INCOMING + D_SHAT },
    SFX: { body: 'stone', how: 'shatter', pal: 'coin', style: 'coin', w: 0.3 },
    SHEET: [[IDLE, [0, 0.4, 0.67, 0.75, 0.83, 0.92, 1.0, 1.5, 1.6, 2.2]], [MOVE, [0, 1 / 6, 2 / 6, 3 / 6]], [ATTACK, null], [CHARGE, 'step2'], [CAST, null], [RECOVER, null], [HURT, 'hurt'],
      [DEATH, [0.3, 0.38, 0.58, 0.67, 0.75, 0.83, 0.92, 1.0, 1.08, 1.17, 1.25, 1.33, 1.5, 1.8, 2.2]], [REVIVE, [0.45, 0.55, 0.65, 0.75, 0.9]]],
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, hurtFx, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
