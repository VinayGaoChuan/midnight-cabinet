// 戴高帽的影子（tophat，小游戏 G009 骰子对决的庄家）：坐在椭圆绿绒桌后的正面半身像。墨一样的瘦高影子、歪戴的破高帽（帽带里斜插一张扑克牌、
// 帽檐撕了个口子）、血红的眼、两条往外拱的橡皮管胳膊和一对雪白大手套；笑的时候咧开一排骨白牙。
// 六个状态在小游戏里的用法：待机 = 一只手敲桌、另一只手让硬币在指节上翻、眼睛跟着硬币；移动 = 往前探身飘着看；攻击 = 摇两下盅扣下（墨色冲击环）+ 咧嘴笑；
// 技能 = 越摇越快（烟越卷越快）→ 扣下（墨色爆开、桌面一震）→ 掀盅、咧嘴笑；受击 = 你赢了，往后一缩、帽子弹起落回；
// 死亡 = 三局全输 / 你离开：抬帽致意 → 从桌边往上化成烟 → 帽子掉在桌边转两圈，只剩帽子。
// 骰盅由舞台画（mb_dice_fg），这里只摆手势；P.gx / gy（游戏里 bodyFrame 的 focus）= 骰盅该在的位置（见 pcd/batch-mini-b/tophat/design.md）。
// 锚点 = 桌子远边那条线的中点（舞台 art (150, 62)）；桌子前景盖住锚点以上 9 行，露出来的是 y ≤ −10 的部分。
PCD.define('tophat', (E) => {
  const { defMat, Sprite, begin, part, sp, run, bake, ease, clamp01, q12, f12of, keyer, fxRamp, FXI, FXR, HY, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_SPIRAL_PT, K_RISE, K_DUST, K_EMBER, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, put, scrX, sfx } = E;

  // ───── 材质（全部取自共享 64 色板）─────
  const M_BODY = defMat([0, 0, 52, 53], 2);             // 墨身：几乎纯黑的墨紫
  const M_WISP = defMat([0, 53, 42, 54], 1);            // 烟缕：比身子亮两级，看得出在卷
  const M_HAT = defMat([0, 8, 9, 10], 1);               // 旧黑毡（褪色）
  const M_BAND = defMat('crimson', 1);                  // 暗红帽带
  const M_CARD = defMat('bone', 1);                     // 扑克牌
  const M_PIP = defMat([55, 56, 57, 57], 1, 1);         // 红桃点
  const M_GLOVE = defMat('white', 1), M_CUFF = defMat('white', 1);
  const M_GLOVE2 = defMat('white', 1), M_CUFF2 = defMat('white', 1);   // 镜头左那只手套（他的右手）：死亡时捏着帽子，化烟时最后才散
  const M_EYE = defMat([55, 56, 57, 58], 1, 1);         // 血红眼（发光体，手工色调）
  const M_EYEHOT = defMat([57, 58, 21, 21], 1, 1);      // 施放时眼心白热
  const M_TEETH = defMat([8, 7, 6, 17], 1, 1);          // 骨白牙
  const M_COIN = defMat('gold', 1);
  const R_EL = fxRamp('inkshade', [43, 24, 25, 2, 0]), EL = FXR[R_EL];   // 墨影：淡紫 → 亮紫 → 深靛紫 → 夜蓝 → 墨
  const RIMR = [43, 24, 42, 25, 0];                                        // 轮廓光：1 档 42 · 2 档 24 · 3 档 43
  const HX = 64, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(72, 60, 36, 52);
  const RIM = { rim: 1, rx: 0, ry: 0, rimR: [0, 30, 12, 18], rimRamp: RIMR, flash: 0, dq: 0, rimAll: 0, skip: new Uint8Array(64) };
  for (const m of [M_GLOVE, M_CUFF, M_GLOVE2, M_CUFF2, M_EYE, M_EYEHOT, M_TEETH, M_CARD, M_PIP, M_COIN]) RIM.skip[m] = 1;
  const KEEP = new Uint8Array(64); for (const m of [M_HAT, M_BAND, M_CARD, M_PIP, M_EYE, M_EYEHOT]) KEEP[m] = 1;   // 自下而上化烟时不吃掉的材质
  const SNAP = new Uint8Array(64); for (const m of [M_GLOVE, M_CUFF, M_GLOVE2, M_CUFF2, M_TEETH, M_COIN]) SNAP[m] = 1;   // 小块白东西：消散线一到就整块没，不留棋盘格

  // ───── 姿势 ─────
  // by / bx 身子整体上下 / 左右；lean 往前探（头下沉、帽身缩短、帽顶多露）；hd 头左右；lx ly / rx ry 左 / 右手套中心（镜头左 = 他的右手）；
  // lg rg 手型（0 平放 · 1 侧握 · 2 按下 · 3 张开 · 4 举拳 · 5 捏帽檐）；lb rb 胳膊往外拱的量（负 = 往下拱）；drum 敲桌的手指 1–4；coin 硬币 1–8；
  // eyes 眼型（0 平常 · 1 亮 · 2 白热 · 3 瞪圆 · 4 笑弯 · 5 闭 · 6 暗 · 7 更暗 · 8 灭 · 9 半眯）；ex ey 眼睛看向；grin 1 = 咧嘴；
  // hatX hatY 帽子偏移（hatOff 1 = 掉在桌边：hatX 是桌边上的 x，hatY 是离桌面的高度）；hatT 歪；hatS 转（1–8 两圈）；hatSq 压扁；
  // wisp 烟缕相位 0–15，wm 烟的样子（0 待机 · 1 快 · 2 狂 · 3 化烟）；dq 自下而上化烟 0–1
  const P = { by: 0, bx: 0, lean: 0, hd: 0, lx: -19, ly: -12, rx: 19, ry: -12, lg: 0, rg: 0, lb: 4, rb: 4, drum: 0, coin: 0,
    eyes: 0, ex: 0, ey: 0, grin: 0, hatX: 0, hatY: 0, hatT: 1, hatS: 0, hatSq: 0, hatOff: 0, wisp: 0, wm: 0, dq: 0, flash: 0, rim: 1, cup: 0, st: 0,
    gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['by', -6, 4], ['bx', -3, 3], ['lean', 0, 3], ['hd', -2, 2], ['lx', -32, 8], ['ly', -44, 4], ['rx', -8, 32], ['ry', -44, 4],
    ['lg', 0, 5], ['rg', 0, 5], ['lb', -8, 8], ['rb', -8, 8], ['drum', 0, 4], ['coin', 0, 8],
    ['eyes', 0, 9], ['ex', -1, 1], ['ey', -3, 1], ['grin', 0, 1], ['hatX', -16, 16], ['hatY', -2, 30], ['hatT', -1, 1], ['hatS', 0, 8], ['hatSq', 0, 1], ['hatOff', 0, 1],
    ['wisp', 0, 15], ['wm', 0, 3], ['dq', 0, 48, 48], ['flash', 0, 1], ['rim', 0, 3], ['cup', 0, 1], ['st', 0, 8]]);
  const FIELDS = ['by', 'bx', 'lean', 'hd', 'lx', 'ly', 'rx', 'ry', 'lb', 'rb', 'hatX', 'hatY'];
  const K_IDLE = { by: 0, bx: 0, lean: 0, hd: 0, lx: -19, ly: -12, rx: 19, ry: -12, lb: 4, rb: 4, hatX: 0, hatY: 0 };
  const K_COIN = { ...K_IDLE, lx: -15, ly: -21, lb: 2 };                                              // 举拳翻硬币
  const K_LEAN = { ...K_IDLE, lean: 2, lx: -13, ly: -12, rx: 13, ry: -12, lb: 7, rb: 7 };             // 往前探：两手往里收、手肘高高拱起，像趴在桌边
  // 骰盅（舞台画）：摇的时候中心在 F0，双手握在两侧；扣下时两只手掌按在盅顶，盅顶在桌边（−10 行），盅口在桌面上 +11；
  // P.gx / gy = 骰盅口中心该在的位置（舞台 cup 的 x，y − 26·lift）
  const F0 = [-12, -17], MOUTH = (x, y) => [x, y + 9], SLAM_AT = [-13, 11];
  const K_GRIP = { ...K_IDLE, by: -1, lx: F0[0] - 12, ly: F0[1], rx: F0[0] + 12, ry: F0[1], lb: 3, rb: -5 };
  const K_SLAM = { ...K_IDLE, by: 1, lean: 2, lx: -18, ly: -12, rx: -8, ry: -12, lb: 5, rb: -3 };
  const K_LIFT = { ...K_IDLE, by: -1, lx: -13, ly: -20, rx: 19, ry: -12, lb: 3, rb: 4 };
  const K_BACK = { ...K_IDLE, by: -1, hd: 1 };
  const K_RECOIL = { ...K_IDLE, by: -2, bx: 1, lx: -23, ly: -27, rx: 23, ry: -27, lb: 5, rb: 5 };
  const K_SLUMP = { ...K_IDLE, by: 1, lean: 1, lx: -17, ly: -12, rx: 17, ry: -12, lb: 5, rb: 5 };
  const K_TIP = { ...K_SLUMP, lean: 1, hd: -1, lx: -12, ly: -36, lb: 5, hatY: 4, hatX: -1 };
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const track = (tq, tr) => E.keys(tq, tr, P, FIELDS);
  const T_SLAM = 4 / 12;                                                   // 攻击扣盅那一帧
  const SHAKE = [[0, 0], [-2, -2], [0, -1], [2, 1], [0, 1]];               // 摇盅偏移（循环 1–4）

  function poseAt(st, t, T) {
    const tq = q12(t), f = f12of(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.lg = 0; P.rg = 0; P.drum = 0; P.coin = 0; P.eyes = 0; P.ex = 0; P.ey = 0; P.grin = 0; P.hatT = 1; P.hatS = 0; P.hatSq = 0; P.hatOff = 0;
    P.wm = 0; P.dq = 0; P.flash = 0; P.rim = 1; P.mx = 0; P.flip = 0;
    P.wisp = Math.floor(TT * 6) & 15;
    let fx0 = null;                                                        // 骰盅中心（握着的时候）
    const breathe = () => { P.by += (Math.floor(TT * 2.5) & 1) ? -1 : 0; };
    const idle = (lp) => {
      setK(K_IDLE, K_IDLE, 0); breathe();
      // 待机个性：0–0.67 s 右手（镜头右）四指轮流敲桌两遍；0.9–2.2 s 左手举拳，硬币在指节上翻过去再跳回来，眼睛跟着；2.1 s 眨眼
      if (lp < 0.67) P.drum = 1 + (f12of(lp) & 3);
      if (lp >= 0.83 && lp < 2.25) {
        const q = lp < 1.0 ? ease.out((lp - 0.83) / 0.17) : lp > 2.08 ? 1 - ease.inOut((lp - 2.08) / 0.17) : 1;
        setK(K_IDLE, K_COIN, q); breathe(); P.lg = q > 0.5 ? 4 : 0;
        if (lp >= 1.0 && lp < 2.08) { P.coin = 1 + Math.min(7, f12of(lp - 1.0)); P.ex = P.coin <= 5 ? -1 : 0; P.ey = -1; }
      }
      if (lp >= 2.08 && lp < 2.17) P.eyes = 5;
    };
    if (st === IDLE) idle(tq % DUR[IDLE]);
    else if (st === MOVE) {
      // 不走路：往前探着飘。4 帧浮动（0 → 上 1 → 上 2 → 上 1），烟缕往后流
      const g = E.gait(tq); setK(K_LEAN, K_LEAN, 0); P.by = [0, -1, -2, -1][g]; P.ly += [0, 0, -1, 0][g]; P.ry += [0, -1, 0, 0][g]; P.lb = 7 - (g & 1); P.rb = 6 + (g & 1);
      P.eyes = 9; P.ey = 1; P.wisp = (g * 3 + Math.floor(tq * 2)) & 15; P.wm = 1; P.hatT = 0;
    } else if (st === ATTACK) {
      if (f === 0) { setK(K_IDLE, K_GRIP, 0.45); P.eyes = 9; }
      else if (f === 1) { setK(K_GRIP, K_GRIP, 0); P.lg = 1; P.rg = 1; fx0 = MOUTH(F0[0], F0[1]); }
      else if (f === 2 || f === 3) { const s = SHAKE[f === 2 ? 1 : 3]; setK(K_GRIP, K_GRIP, 0); P.lx += s[0]; P.rx += s[0]; P.ly += s[1]; P.ry += s[1]; P.bx = s[0] > 0 ? 1 : 0; P.lg = 1; P.rg = 1; fx0 = MOUTH(F0[0] + s[0], F0[1] + s[1]); P.eyes = 1; P.wm = 1; }
      else if (f === 4) { setK(K_SLAM, K_SLAM, 0); P.lg = 2; P.rg = 2; P.eyes = 2; P.hatY = 1; P.rim = 2; fx0 = SLAM_AT; }
      else if (f === 5) { setK(K_SLAM, K_SLAM, 0); P.lean = 1; P.lg = 2; P.rg = 2; P.eyes = 1; fx0 = SLAM_AT; }
      else { const q = ease.out(clamp01((tq - 0.5) / 0.17)); setK(K_SLAM, K_BACK, q); P.lg = q < 0.5 ? 2 : 0; P.rg = P.lg; P.grin = 1; P.eyes = 4; P.by += f === 7 ? -1 : 0; P.hatY = f === 7 ? 1 : 0; }
    } else if (st === CHARGE) {
      // 双手把盅举到右肩前：越摇越快（4 帧一摇 → 2 帧一摇 → 每帧一摇），烟越卷越快
      const q = ease.inOut(clamp01(tq / 0.33)); setK(K_IDLE, K_GRIP, q); P.lg = q > 0.4 ? 1 : 0; P.rg = P.lg; P.rim = 2; P.eyes = 9;
      if (f >= 4) {
        const k = f < 8 ? (f >> 0) % 4 + 1 : f < 12 ? ((f & 1) ? 1 : 3) : ((f & 1) ? 1 : 3), amp = f < 12 ? 1 : 1.5, s = SHAKE[k];
        P.lx += s[0] * amp; P.rx += s[0] * amp; P.ly += s[1] * amp; P.ry += s[1] * amp; P.bx = s[0] > 0 ? 1 : s[0] < 0 ? -1 : 0;
        fx0 = MOUTH(F0[0] + s[0] * amp, F0[1] + s[1] * amp);
        P.eyes = f < 8 ? 9 : (f12 & 1) ? 1 : 9; if (f >= 12) { P.eyes = (f12 & 1) ? 1 : 0; P.hatY = (f & 1); P.hatT = (f & 1) ? 0 : 1; }
        P.wm = f < 8 ? 1 : 2; P.wisp = (f * (f < 8 ? 2 : f < 12 ? 3 : 4)) & 15;
      } else fx0 = q > 0.4 ? MOUTH(F0[0], F0[1]) : null;
    } else if (st === CAST) {
      // 一扣：双手按下定格 2 帧，身子前沉、帽子惯性跳起；然后按着
      setK(K_SLAM, K_SLAM, 0); P.lg = 2; P.rg = 2; fx0 = SLAM_AT; P.rim = 3; P.wm = 2;
      if (f <= 1) { P.lean = 3; P.by = 2; P.eyes = 2; P.hatY = f === 0 ? 2 : 3; P.hatT = 0; }
      else { P.lean = f < 4 ? 2 : 1; P.by = 1; P.eyes = 1; P.hatY = f === 2 ? 1 : 0; P.rim = 2; }
    } else if (st === RECOVER) {
      // 按着 → 抓住盅顶掀起来（亮出骰子）→ 往后一靠咧嘴笑，肩膀一耸一耸
      // 盅顶在 −10 行时盅口在 +11；手抓着盅顶往上提 h 格，盅口跟着上去 h 格
      if (f <= 1) { setK(K_SLAM, K_SLAM, 0); P.lean = 1; P.lg = 2; P.rg = 2; P.eyes = 1; fx0 = SLAM_AT; P.rim = 2; }
      else if (f === 2) { setK(K_SLAM, K_LIFT, 0); P.lx = -13; P.ly = -13; P.rx = 15; P.lean = 1; P.lg = 0; P.rg = 0; P.eyes = 9; P.ey = 1; fx0 = SLAM_AT; }
      else if (f === 3) { setK(K_LIFT, K_LIFT, 0); P.ly = -18; P.eyes = 0; P.ey = 1; fx0 = [-13, 11 - 5]; }
      else { const up = (f & 1) ? 0 : 1; setK(K_LIFT, K_LIFT, 0); P.ly -= up; P.grin = 1; P.eyes = 4; P.hd = 1; P.by -= up; P.hatY = up; fx0 = [-13, 11 - 7 - up]; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq % DUR[IDLE]);
      else if (h < 1 / 12) { setK(K_RECOIL, K_RECOIL, 0); P.lg = 3; P.rg = 3; P.eyes = 3; P.flash = 1; P.hatY = 3; P.hatT = 0; P.rim = 0; P.wm = 2; }
      else if (h < 2 / 12) { setK(K_RECOIL, K_RECOIL, 0); P.lg = 3; P.rg = 3; P.eyes = 3; P.hatY = 6; P.hatT = -1; P.rim = 0; P.wm = 2; }
      else if (h < 3 / 12) { setK(K_RECOIL, K_IDLE, 0.4); P.lg = 3; P.rg = 3; P.eyes = 3; P.hatY = 3; P.hatT = 0; P.wm = 1; }
      else if (h < 4 / 12) { setK(K_RECOIL, K_IDLE, 0.7); P.eyes = 3; P.hatY = 0; P.hatSq = 1; P.hatT = 1; }
      else { setK(K_RECOIL, K_IDLE, 0.7 + 0.3 * ease.out(clamp01((h - 4 / 12) / 0.12))); P.eyes = h < 5 / 12 ? 5 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq % DUR[IDLE]);
      else if (d < 2 / 12) { setK(K_RECOIL, K_RECOIL, 0); P.lg = 3; P.rg = 3; P.eyes = 3; P.flash = d < 1 / 12 ? 1 : 0; P.hatY = d < 1 / 12 ? 2 : 3; P.hatT = 0; P.rim = 0; P.wm = 2; }
      else if (d < 3 / 12) { setK(K_RECOIL, K_SLUMP, 0.6); P.eyes = 6; P.hatY = 0; P.hatSq = 1; }
      else if (d < 4 / 12) { setK(K_SLUMP, K_SLUMP, 0); P.eyes = 5; P.hatT = 0; }
      else if (d < 7 / 12) {                                                   // 抬帽致意：捏住帽檐抬起来、闭眼点头
        const q = ease.out(clamp01((d - 4 / 12) / (2 / 12))); setK(K_SLUMP, K_TIP, q); P.lg = 5; P.eyes = 5; P.hatT = -1; if (d >= 6 / 12) P.lean = 2;
      } else {
        // 从桌边往上化成烟；捏帽的手散掉以后帽子掉在桌边，转两圈
        setK(K_TIP, K_TIP, 0); P.lg = 5; P.hatT = -1; P.wm = 3;
        const dd = d - 7 / 12; P.dq = clamp01(dd / 0.75); P.by = -Math.round(P.dq * 3); P.rim = 0;
        P.eyes = dd < 0.55 ? 0 : dd < 0.72 ? 6 : dd < 0.8 ? 7 : 8; P.ey = -Math.min(3, Math.round(dd * 4));   // 两只红眼在烟里多悬一会儿，往上飘着暗下去
        const tFall = 0.5;                                                     // 手散掉、帽子落下
        if (dd >= tFall) {
          P.hatOff = 1; P.hatX = -7; P.hatT = 0; const fall = dd - tFall;
          if (fall < 2 / 12) P.hatY = fall < 1 / 12 ? 16 : 7;                  // 两帧下落
          else { P.hatY = 0; const sp2 = f12of(fall - 2 / 12); P.hatS = sp2 < 8 ? sp2 + 1 : 0; P.hatSq = sp2 === 0 ? 1 : 0; P.hatT = sp2 < 8 ? [0, 1, 0, -1, 0, 1, 0, -1][sp2] : 0; }
        }
      }
    } else if (st === REVIVE) {
      // 查看页循环用：烟从桌边聚回来，自下而上显形，帽子跳回头上
      setK(K_IDLE, K_IDLE, 0); P.dq = tq < 0.3 ? 1 : clamp01(1 - (tq - 0.3) / 0.45); P.wm = 3; P.eyes = tq < 0.55 ? 8 : 0;
      if (tq < 0.7) { P.hatOff = 1; P.hatX = -7; P.hatY = tq < 0.6 ? 0 : 6; } else if (tq < 0.8) { P.hatY = 3; P.hatT = 0; }
    }
    // 取整
    for (const k of FIELDS) P[k] = Math.round(P[k]);
    P.lean = Math.max(0, Math.min(3, P.lean));
    P.cup = fx0 ? 1 : 0; if (P.cup < 1 && P.rim >= 2) P.rim = 1;
    if (fx0) { P.gx = Math.round(fx0[0]); P.gy = Math.round(fx0[1]); } else { P.gx = P.bx + P.hd; P.gy = -23 + P.by + P.lean; }   // 没握盅时：眼睛（发光体）
    KEY(P);
  }

  // ───── 画 ─────
  const GLOVES = {   // 镜头左的那只（他的右手）；右边那只左右翻转。C/c 袖口（亮 / 自动）· g 自动 · G 亮 · s 缝线 / 分指（暗）· k 指节（亮）；o = 中心
    0: { w: ['..CCCC..', '.cccccc.', '.gGgggg.', 'gGgsgsgg', 'ggsgsgsg', 'gggggggg', 'g.g.g.g.'], o: [3, 4] },           // 平放在桌边（手指朝镜头，拇指朝里）
    1: { w: ['.c.gg...', 'CcgGggg.', 'Ccgkgkgg', 'Ccgsgsgg', 'Ccgggggg', '.c.ggg..'], o: [3, 3] },                     // 侧握（手指朝右包住盅）
    2: { w: ['...CCC...', '..ccccc..', '.ggGgggg.', 'gGgsgsggg', 'gggggggggg'.slice(0, 9), 'g.g.g.g.g'], o: [4, 3] },  // 按下（手指张开）
    3: { w: ['.g.g.g..', '.g.g.g.g', 'gggggggg', 'gGgggggg', '.gsgsgg.', '.cccccc.', '..CCCC..'], o: [4, 3] },          // 张开（掌心朝外）
    4: { w: ['.kgkgkg.', 'gGgggggg', 'gsgsgsgg', 'gggggggg', '.gggggg.', '..cccc..', '..CCCC..'], o: [4, 2] },          // 举拳（指节朝上）
    5: { w: ['..gGg...', '.gkgkg..', 'Cgsgsgg.', 'Ccggggg.', '.ccgg...'], o: [3, 2] },                                   // 捏帽檐
  };
  const FINGERS = [0, 2, 4, 6];   // 平放手型的四根手指（列）
  function drawGlove(cx, cy, type, side, drum) {
    const G = GLOVES[type], rows = G.w, W = rows[0].length, o = G.o;
    const at = (c, r) => [side < 0 ? cx + (c - o[0]) : cx - (c - o[0]), cy + (r - o[1])];
    part();
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < W; c++) { const ch = rows[r][c]; if (ch !== 'C' && ch !== 'c') continue; const [x, y] = at(c, r); sp(x, y, side < 0 ? M_CUFF2 : M_CUFF, ch === 'C' ? 4 : 0); }
    part();
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < W; c++) {
      const ch = rows[r][c]; if (ch === '.' || ch === 'C' || ch === 'c') continue;
      let tone = ch === 'G' || ch === 'k' ? 4 : ch === 's' ? 2 : 0;
      if (type === 0 && drum && c === FINGERS[drum - 1]) { if (r === rows.length - 1) continue; if (r === rows.length - 2) tone = 4; }
      const [x, y] = at(c, r); sp(x, y, side < 0 ? M_GLOVE2 : M_GLOVE, tone);
    }
  }
  // 手套的腕口（胳膊接进来的点）：按手型
  function wristOf(type, cx, cy, side) {
    const o = type === 1 || type === 5 ? [-4, 0] : type === 3 || type === 4 ? [0, 4] : [-1, -4];
    return [cx + (side < 0 ? o[0] : -o[0]), cy + o[1]];
  }
  // 橡皮管胳膊：肩 → 腕的二次贝塞尔，bend 往外上方拱（负 = 往下拱）；2×2 的笔，粗细一致
  function drawArm(sx, sy, wx, wy, bend, side) {
    const dx = wx - sx, dy = wy - sy, l = Math.hypot(dx, dy) || 1;
    let nx = dy / l, ny = -dx / l; if (side < 0 ? nx + ny > 0 : nx - ny < 0) { nx = -nx; ny = -ny; }
    const cx = (sx + wx) / 2 + nx * bend, cy = (sy + wy) / 2 + ny * bend;
    part();
    const N = Math.max(10, Math.ceil(l * 1.6));
    for (let i = 0; i <= N; i++) { const t = i / N, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t, x = Math.round(a * sx + b * cx + c * wx - 0.5), y = Math.round(a * sy + b * cy + c * wy - 0.5);
      sp(x, y, M_BODY, 0); sp(x + 1, y, M_BODY, 0); sp(x, y + 1, M_BODY, 0); sp(x + 1, y + 1, M_BODY, 0); }
  }
  // 烟缕：从 (x, y) 往上、往 side 那边飘的一缕烟，根部 2 格、梢 1 格，末端往里打个小卷
  function drawWisp(x0, y0, side, len, ph, amp) {
    let px = x0, py = y0;
    for (let k = 0; k <= len; k++) {
      px = Math.round(x0 + side * (k * 0.45 + amp * Math.sin(k * 0.8 - ph))); py = y0 - k;
      sp(px, py, M_WISP, 0); if (k < len * 0.6) sp(px + side, py, M_WISP, 0);
    }
    sp(px - side, py - 1, M_WISP, 0); sp(px - side * 2, py, M_WISP, 0);
  }
  // 身子（头 + 脖子 + 肩 + 身，一个部件）：圆头、细脖子、溜肩、往下收的烟身；整块墨黑，只靠左上的深紫轮廓光和身边的烟缕
  const TORSO = [5, 7, 8, 8, 7, 7, 7, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5];   // 肩（−17）往下每行的半宽
  function drawBody(bx, by, lean, hd, ph, wm) {
    part();
    const hcx = bx + hd, hcy = -23 + by + lean;
    for (let y = hcy - 6; y <= hcy + 4; y++) { const q = (y - hcy + 0.5) / 5.5, w = Math.round(4.9 * Math.sqrt(Math.max(0, 1 - q * q))); if (w > 0) run(y, hcx - w, hcx + w, M_BODY, 0); }
    run(hcy + 5, bx - 2, bx + 2, M_BODY, 0);                                          // 脖子
    const yS = -17 + by;
    for (let y = hcy + 6; y < yS; y++) run(y, bx - 2, bx + 2, M_BODY, 0);
    for (let y = yS; y <= 0; y++) {
      const k = y - yS, base = TORSO[Math.min(TORSO.length - 1, k)];
      const wob = y > -11 ? Math.round(Math.sin(y * 0.9 + ph * 0.8)) : wm >= 2 ? Math.round(Math.sin(y * 0.9 + ph * 0.8) * 0.8) : 0;
      run(y, bx - base + Math.min(0, wob), bx + base + Math.max(0, wob), M_BODY, 0);
    }
    return { hcx, hcy };
  }
  // 高帽（手画的图，按行错位来歪）：cx, cy = 帽檐中心行；t 歪（+ = 顶往镜头右偏、帽檐右端低）；spin 0 或 1–8（两圈：牌和破口绕帽身走）；sq 压扁 1 行；lean 往前探时帽身短 1 行
  // 字符：T 帽顶面（亮）· t 帽顶后沿 · d 凹坑 · h 帽身（自动明暗）· s 毡面反光 · k 折痕 · B 帽带亮 · b 帽带
  const CROWN = [
    '..ttttttttt..',   // −12  帽顶后沿
    '.TTTTTddTTTT.',   // −11  帽顶面（中间一个凹坑）
    '.hhhhhkhhhhh.',   // −10  帽顶往外翻 1 格
    '..hshhkhhhh..',   // −9
    '..hshhkhhhh..',   // −8
    '..hshhhhhhh..',   // −7
    '..hshhhhhhh..',   // −6
    '..hhhhhhhhh..',   // −5
    '..hhhhhhhhh..',   // −4
    '..BBBBBBBBB..',   // −3   帽带
    '..bbbbbbbbb..',   // −2
  ];
  const CROWN_X0 = -6;   // 第 0 列的 x
  function drawHat(cx, cy, t, spin, sq, lean) {
    const sh = (dy) => Math.round(t * -dy / 4), bdy = (x) => Math.round(t * x / 11);
    const ph = spin ? (spin - 1) & 3 : 0;                                       // 0 正面 · 1 右侧 · 2 背面 · 3 左侧
    const narrow = spin && (ph === 1 || ph === 3), wB = sq ? 11 : 10;
    const rows = CROWN.slice(sq || lean ? 1 : 0);                                 // 压扁 / 往前探：帽身少 1 行
    const ytop = -2 - (rows.length - 1);
    // 帽檐后半（两端往上卷）
    part();
    for (let x = -wB + 1; x <= wB - 1; x++) sp(cx + x, cy - 1 + bdy(x), M_HAT, 3);
    for (const s of [-1, 1]) { sp(cx + s * wB, cy - 1 + bdy(s * wB), M_HAT, s < 0 ? 4 : 3); sp(cx + s * wB, cy - 2 + bdy(s * wB), M_HAT, s < 0 ? 4 : 2); }
    // 帽身 + 帽顶
    part();
    for (let r = 0; r < rows.length; r++) {
      const y = ytop + r, row = rows[r], dy = y;                               // dy：离帽檐的行数（负）
      for (let c = 0; c < row.length; c++) {
        const ch = row[c]; if (ch === '.' || ch === 'B' || ch === 'b') continue;
        let x = CROWN_X0 + c; if (narrow && (x <= -4 || x >= 4) && ch !== 'T' && ch !== 't') continue;
        const tone = ch === 'T' ? 4 : ch === 't' ? 3 : ch === 'd' || ch === 'k' ? 2 : ch === 's' ? (narrow ? 0 : 4) : 0;
        sp(cx + x + sh(dy), cy + dy, M_HAT, tone);
      }
    }
    // 帽带
    part();
    for (let r = rows.length - 2; r < rows.length; r++) { const y = ytop + r, row = rows[r]; for (let c = 0; c < row.length; c++) { const ch = row[c]; if (ch !== 'B' && ch !== 'b') continue; const x = CROWN_X0 + c; if (narrow && (x <= -4 || x >= 4)) continue; sp(cx + x + sh(y), cy + y, M_BAND, ch === 'B' ? 4 : 0); } }
    // 扑克牌：斜插在帽带里、1:2 往外歪，伸出帽身轮廓（转帽子时绕着走，转到背面看不见）
    if (ph !== 2) {
      const pos = ph === 0 ? -1 : ph === 1 ? 1 : 0;
      part();
      for (let j = 0; j < 7; j++) {
        const y = -3 - j, lean2 = pos === 0 ? 0 : pos * (j >> 1), x0 = cx + sh(y) + (pos < 0 ? -4 : pos > 0 ? 2 : -1) + lean2 - (pos < 0 && j > 0 ? 0 : 0);
        for (let i = 0; i < 3; i++) sp(x0 + i, cy + y, M_CARD, j === 6 ? 4 : i === 0 ? 4 : 0);
        if (j === 3 || j === 4) sp(x0 + 1, cy + y, M_PIP, j === 3 ? 3 : 2);
      }
    }
    // 帽檐前半：上面亮、前沿暗；前沿右边撕了个口子、垂下一小片（转帽子时口子跟着走）
    part();
    const tear = ph === 0 ? 4 : ph === 1 ? 8 : ph === 3 ? -3 : 99;
    for (let x = -wB + 1; x <= wB - 1; x++) sp(cx + x, cy + bdy(x), M_HAT, x < -wB + 3 ? 4 : 3);
    for (let x = -wB + 2; x <= wB - 2; x++) { if (x === tear || x === tear + 1) continue; sp(cx + x, cy + 1 + bdy(x), M_HAT, 2); }
    if (tear < 99 && tear + 1 <= wB - 2) { sp(cx + tear, cy + 2 + bdy(tear), M_HAT, 2); }
  }
  const EYE = {   // 镜头左那只眼（3×3：行 -1..1，列 0..2 = 从外往里）；数字 = 色调，0 = 空，9 = 白热
    0: [[0, 0, 0], [2, 3, 0], [0, 4, 3]],   // 平常：斜着往里压的细缝
    1: [[0, 0, 0], [3, 4, 0], [0, 4, 4]],   // 亮
    2: [[0, 3, 0], [3, 9, 4], [0, 4, 9]],   // 白热
    3: [[2, 3, 2], [3, 4, 3], [2, 3, 2]],   // 瞪圆
    4: [[0, 0, 0], [0, 3, 0], [3, 0, 3]],   // 笑弯 ^
    5: [[0, 0, 0], [0, 0, 0], [2, 2, 2]],   // 闭
    6: [[0, 0, 0], [0, 0, 0], [0, 3, 2]],   // 暗
    7: [[0, 0, 0], [0, 0, 0], [0, 2, 0]],   // 更暗
    8: null,                                // 灭
    9: [[0, 0, 0], [0, 0, 0], [2, 4, 3]],   // 半眯
  };
  function drawEyes(hcx, hcy, id, ex, ey) {
    const m = EYE[id]; if (!m) return; part();
    for (const side of [-1, 1]) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const v = m[r][c]; if (!v) continue; const x = hcx + ex + side * (4 - c), y = hcy - 2 + r + ey;
      if (v === 9) sp(x, y, M_EYEHOT, 3); else sp(x, y, M_EYE, v);
    }
  }
  function drawGrin(hcx, hcy) {
    part();
    const y = hcy + 2;
    for (let x = -4; x <= 4; x++) sp(hcx + x, y, M_TEETH, (x & 1) ? 3 : 4);
    for (let x = -3; x <= 3; x++) sp(hcx + x, y + 1, M_TEETH, (x & 1) ? 2 : 3);
    sp(hcx - 5, y - 1, M_EYE, 2); sp(hcx + 5, y - 1, M_EYE, 2);
  }
  const COIN = [null, [-3, -1, 1], [-1, -1, 0], [1, -1, 1], [3, -1, 0], [3, -2, 1], [1, -4, 0], [-1, -5, 1], [-3, -3, 0]];   // [dx, dy, 面 1 / 侧 0]（相对举拳手套中心的顶上）
  function drawCoin(cx, cy, k) {
    const c = COIN[k]; if (!c) return; part();
    const x = cx + c[0], y = cy - 3 + c[1];
    if (c[2]) { run(y, x - 1, x + 1, M_COIN, 0); run(y + 1, x - 1, x + 1, M_COIN, 0); sp(x - 1, y, M_COIN, 4); }
    else { sp(x, y, M_COIN, 4); sp(x, y + 1, M_COIN, 2); }
  }
  function drawHero() {
    begin(hero, 0, 0);
    const ph = P.wisp * 0.785, bx = P.bx, by = P.by;
    if (!P.hatOff || P.dq < 1) {
      // 身后的烟缕（肩头往外上方卷）
      part();
      const L = P.wm >= 2 ? 6 : P.wm === 1 ? 5 : 4, A = P.wm >= 2 ? 1.5 : 1;
      drawWisp(bx - 9, -15 + by, -1, L, ph, A); drawWisp(bx + 9, -15 + by, 1, L - 1, ph + 2.1, A);
      if (P.wm >= 1) { drawWisp(bx - 4, -19 + by + P.lean, -1, L - 1, ph + 1.3, A); drawWisp(bx + 4, -19 + by + P.lean, 1, L - 2, ph + 3.4, A); }
      if (P.wm >= 2) { drawWisp(bx - 5, -6 + by, -1, 4, ph + 1, 1.3); drawWisp(bx + 5, -6 + by, 1, 4, ph + 3, 1.3); }
      if (P.wm === 3) { for (let i = 0; i < 3; i++) drawWisp(bx - 6 + i * 6, -14 + by - i * 2 - Math.round(P.dq * 10), i === 1 ? 1 : -1, 5, ph + i * 1.7, 1.4); }
      const H = drawBody(bx, by, P.lean, P.hd, P.wisp, P.wm);
      if (!P.hatOff) drawHat(H.hcx + P.hatX, H.hcy - 5 - P.hatY, P.hatT, P.hatS, P.hatSq, P.lean >= 2 ? 1 : 0);
      drawEyes(H.hcx, H.hcy, P.eyes, P.ex, P.ey);
      if (P.grin) drawGrin(H.hcx, H.hcy);
      const lw = wristOf(P.lg, P.lx, P.ly, -1), rw = wristOf(P.rg, P.rx, P.ry, 1);
      drawArm(bx - 6, -16 + by, lw[0], lw[1], P.lb, -1);
      drawArm(bx + 6, -16 + by, rw[0], rw[1], P.rb, 1);
      if (!(P.st === DEATH && P.hatOff)) drawGlove(P.lx, P.ly, P.lg, -1, 0);
      drawGlove(P.rx, P.ry, P.rg, 1, P.drum);
      if (P.coin) drawCoin(P.lx, P.ly, P.coin);
    } else drawEyes(bx, -23 + by, P.eyes, P.ex, P.ey);
    if (P.hatOff) drawHat(P.hatX, -11 - P.hatY, P.hatT, P.hatS, P.hatSq, 0);
  }
  // 自下而上化成烟：抖动阈值 × 0.45 + 离桌面的高度 × 0.55，和 dq 比；帽子、眼睛不吃
  function dissolve(q) {
    const holdL = P.st === DEATH && !P.hatOff && P.lg === 5;
    const s = hero, w = s.w, h = s.h, M = s.mat, out = s.out, top = s.oy - 36, span = 36;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (out[i] === 255) continue;
      let m = M[i]; if (!m) m = (y + 1 < h && M[i + w]) || (x + 1 < w && M[i + 1]) || (x > 0 && M[i - 1]) || (y > 0 && M[i - w]) || 0;
      if (KEEP[m] || (holdL && (m === M_GLOVE2 || m === M_CUFF2))) continue;
      const up = 1 - clamp01((y - top) / span);
      if (SNAP[m] ? up * 0.92 + B8[(y & 7) * 8 + (x & 7)] * 0.08 < q * 1.05 - 0.12 : B8[(y & 7) * 8 + (x & 7)] * 0.45 + up * 0.55 < q * 1.05) out[i] = 255;
    }
  }
  function bakeHero() {
    // 平时：左上方的环境深紫光（只照到帽子左边、头左边、左肩）；蓄力 / 施放：光从骰盅那团打转的烟来（半径内外沿全亮）
    const cup = P.rim >= 2 && P.cup;
    RIM.rim = P.rim; RIM.rimAll = cup ? 1 : 0; RIM.rx = cup ? hero.ox + P.gx : hero.ox - 22; RIM.ry = cup ? hero.oy + P.gy - 9 : hero.oy - 42;
    RIM.flash = P.flash; bake(hero, RIM);
    if (P.dq > 0) dissolve(P.dq);
  }

  // ───── 特效（都在角色附近，不出精灵缓冲的范围）─────
  let chargeAcc = 0, smokeAcc = 0, lastSpin = 0, trailT = 9, trailX = 0, trailY = 0, jolt = 0;
  const SLAM_X = -13, SLAM_Y = -10;                                                 // 扣盅那一点（本地坐标：桌边）
  function inkSplash(n, big) {
    const x = scrX(SLAM_X), y = HY + SLAM_Y;
    for (let i = 0; i < n; i++) { const s = i & 1 ? 1 : -1, v = (big ? 50 : 30) + Math.random() * (big ? 70 : 40); spawnX(K_PHYS, x + s * (2 + Math.random() * 6), y - 1, s * v, -(20 + Math.random() * (big ? 40 : 20)), 0.3 + Math.random() * 0.35, R_EL, { g: 160, floor: y, dragX: 0.2 }); }
  }
  function onEnter(s) {
    const x = scrX(SLAM_X), y = HY + SLAM_Y;
    if (s === CAST) {
      releaseOrbit(40, 90, 0.35, 0.7, { up: 8, pts: 1 }); burst(x, y - 3, 30, 60, 130, 0.3, 0.7, R_EL, 14); inkSplash(12, 1);
      ring(x, y - 1, 1, R_EL); fx.cloud(x, y - 5, 7, R_EL, 0.6, 2); shake(0.28, 2); flash(0.05);
      trailT = 0; trailX = scrX(P.bx); trailY = HY - 26;
      sfx('impact', { pal: 'shadow', w: 0.5 });
    }
    if (s === RECOVER) jolt = 0;
  }
  function onTime(s, t) {
    const x = scrX(SLAM_X), y = HY + SLAM_Y;
    if (s === ATTACK && Math.abs(t - T_SLAM) < 1e-6) { ring(x, y - 1, 0, R_EL); burst(x, y - 2, 10, 30, 70, 0.2, 0.4, R_EL, 6); inkSplash(6, 0); shake(0.1, 1); sfx('swing', { kind: 'smash', w: 0.4 }); sfx('hit', { mat: 'wood', w: 0.4 }); }
    if (s === ATTACK && (Math.abs(t - 2 / 12) < 1e-6 || Math.abs(t - 3 / 12) < 1e-6)) sfx('rattle', { rate: 1 });
    if (s === ATTACK && Math.abs(t - 6 / 12) < 1e-6) sfx('laugh', { n: 2, voice: 'bassoon' });
    if (s === CHARGE && [4 / 12, 8 / 12, 12 / 12].some((v) => Math.abs(t - v) < 1e-6)) sfx('rattle', { rate: t < 0.5 ? 1 : t < 0.9 ? 2 : 3 });
    if (s === CAST && Math.abs(t - 1 / 12) < 1e-6) { shake(0.12, 1); jolt = 0.12; for (let i = 0; i < 6; i++) spawn(K_DUST, x - 8 + Math.random() * 16, y, (Math.random() - 0.5) * 20, -6 - Math.random() * 8, 0.3 + Math.random() * 0.2, FXI.dust); }
    if (s === RECOVER && Math.abs(t - 4 / 12) < 1e-6) sfx('laugh', { n: 2, voice: 'bassoon' });
    if (s === DEATH && Math.abs(t - T_LETGO) < 1e-6) burst(scrX(-12), HY - 35, 14, 20, 50, 0.3, 0.6, R_EL, 10);   // 捏帽的手套化成一团烟，帽子落下
    if (s === DEATH && Math.abs(t - T_HATLAND) < 1e-6) {
      const hx = scrX(-7), hy = HY - 10; for (let i = 0; i < 6; i++) spawn(K_DUST, hx - 6 + Math.random() * 12, hy, (Math.random() - 0.5) * 24, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); shake(0.08, 1); sfx('fall', { w: 0.15 });
    }
  }
  const T_LETGO = INCOMING + 7 / 12 + 0.5, T_HATLAND = T_LETGO + 2 / 12;
  const EVENTS = [[], [], [2 / 12, 3 / 12, T_SLAM, 6 / 12], [4 / 12, 8 / 12, 12 / 12], [1 / 12], [4 / 12], [], [T_LETGO, T_HATLAND], []];
  // 受击 / 死亡命中：一撮墨烟往上喷 + 眼光红尾（代替撞击火花）
  function hurtFx(s) {
    const x = scrX(P.bx), y = HY - 20;
    burst(x, y, s === DEATH ? 22 : 14, 30, 80, 0.3, 0.6, R_EL, 22); burst(x, y - 6, 4, 20, 50, 0.15, 0.3, FXI.blood, 8);
    trailT = 0; trailX = scrX(0); trailY = HY - 24; shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {   // 烟绕着骰盅转，越卷越快
      const q = clamp01(stT / DUR[CHARGE]); chargeAcc += dt * (14 + 46 * q);
      const cx = scrX(F0[0]), cy = HY + F0[1];   // 骰盅中心
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 9, a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, cx, cy, (r - 3.5) / (0.9 - 0.45 * q + Math.random() * 0.3), 0, 1.6, R_EL, { a, r, w: 5 + 10 * q, tx: cx, ty: cy, squash: 0.7 }); }
    }
    if (state === IDLE || state === MOVE || state === RECOVER) {   // 肩头往上飘的烟
      smokeAcc += dt * (state === RECOVER ? 6 : 1.6);
      while (smokeAcc >= 1) { smokeAcc -= 1; const s = Math.random() < 0.5 ? -1 : 1; spawnX(K_EMBER, scrX(P.bx + s * (8 + Math.random() * 3)), HY - 20 + P.by, s * 3, -6 - Math.random() * 5, 0.9 + Math.random() * 0.6, R_EL, { age0: 0.36 }); }
      if (state === RECOVER && stT < 0.5 && Math.random() < dt * 12) spawnX(K_EMBER, scrX(SLAM_X - 4 + Math.random() * 8), HY + SLAM_Y - 2, 0, -8 - Math.random() * 6, 0.8, R_EL, { age0: 0.3 });
    }
    if (state === DEATH) {   // 化烟：消散线上冒出往上飘的墨烟
      const d = stT - INCOMING - 7 / 12;
      if (d > 0 && d < 0.85) { smokeAcc += dt * 50; const yF = HY - 10 - Math.round(clamp01(d / 0.75) * 26); while (smokeAcc >= 1) { smokeAcc -= 1; spawnX(K_RISE, scrX(P.bx - 9 + Math.random() * 18), yF - Math.random() * 3, (Math.random() - 0.5) * 8, -10 - Math.random() * 14, 0.7 + Math.random() * 0.7, R_EL, { age0: 0.18 }); } }
    }
    if (state === DEATH && P.hatS !== lastSpin) { if (P.hatS && (P.hatS & 1) === 1) { spawn(K_DUST, scrX(-7 + (Math.random() < 0.5 ? -9 : 9)), HY - 10, (Math.random() - 0.5) * 10, -3, 0.25, FXI.dust); } lastSpin = P.hatS; }
    trailT += dt; if (jolt > 0) jolt -= dt;
  }
  function fxReset() { chargeAcc = 0; smokeAcc = 0; lastSpin = 0; trailT = 9; jolt = 0; }
  function fxFront(f12) {
    // 眼光红尾：头猛地一动时，旧的眼睛位置留两道红线（2 帧）
    if (trailT < 2 / 12) { const c = trailT < 1 / 12 ? 57 : 56; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) put(trailX + s * (3 + k), trailY + 2 + k, c); }
    // 查看页里的桌边（游戏里桌子是舞台画的，这里只是方便看构图：盖住锚点以上 9 行，和舞台一样）
    if (!E.game) {
      const y0 = HY - 9 + (jolt > 0 ? 1 : 0);
      for (let x = 0; x < E.W; x++) {
        put(x, y0, 33); put(x, y0 + 1, 32); put(x, y0 + 2, 19); put(x, y0 + 3, 19); put(x, y0 + 4, 20); if ((x & 7) === 3) put(x, y0 + 2, 14);
        for (let y = y0 + 5; y < E.H; y++) put(x, y, ((x + y) & 3) === 0 ? 34 : 35);
      }
    }
  }

  return {
    name: '戴高帽的影子', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_EYE, M_EYEHOT], HIT_POINT: [0, -22], EVENTS,
    SFX: { body: 'ghost', how: 'dissolve', pal: 'shadow', style: 'shadow', w: 0.4, hover: 1, voice: 'bassoon heh-heh + dice rattling in a leather cup' },
    SHEET: [[IDLE, [0, 0.25, 0.42, 0.5, 1.0, 1.17, 1.33, 1.5, 1.67, 1.83, 2.0, 2.17]], [MOVE, [0, 1 / 6, 2 / 6, 3 / 6]], [ATTACK, null], [CHARGE, null], [CAST, null], [RECOVER, null], [HURT, 'hurt'],
      [DEATH, [0.34, 0.42, 0.5, 0.67, 0.75, 0.83, 1.0, 1.17, 1.33, 1.42, 1.5, 1.58, 1.67, 1.75, 1.83, 2.0, 2.5]], [REVIVE, [0.3, 0.5, 0.7, 0.9]]],
    poseAt, drawHero, bakeHero, onEnter, onTime, hurtFx, stepFX, fxReset, fxFront,
  };
});
