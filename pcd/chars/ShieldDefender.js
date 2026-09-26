// 持盾卫士（部队 · 人类 · 先锋 · 普通 · 近战 240）：矮壮的重装步兵，缩在一面竖长的赭黄墨带鸢盾后面——盾面斜插着 3 支断箭（「受到的远程伤害减少」），
// 护鼻尖顶盔 + 锁子护颈（斜肩），赭黄菱格绗缝棉甲（比盾面暗一档），后手一柄翼片钉头锤（扛在后肩，锤头在尖盔左上方）。
// 攻击 = 砸：锤从肩上竖到脑后、越过盾上沿短促下砸，前冲 2 格，盾不离身；技能 = 特性「偏转」生效：缩到盾后斜举鸢盾，盾前亮起一道 45° 的青铜偏转面，
// 三支敌箭连射过来被改道——一支向下插进地里、一支向上翻着弹飞（收招时掉回来插在盾上）、一支擦过头顶飞走。
// 升级成「重装战士」（HeavilyArmedWarrior.js）：同一个人——赭黄墨带鸢盾、盾上断箭、尖顶盔、赭黄棉甲 / 罩袍、青铜偏转光都保留，体量和装备升一级。
PCD.define('ShieldDefender', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT, K_STILL, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, px = parts.px, HALF = Math.PI / 2;

  // ───── 元素：偏转 · 青铜光（白 21 → 奶油 5 → 铜黄 33 → 青铜 32 → 褐 19）。来袭的箭用 enemy 色阶；断箭碎屑用 splinter ─────
  const R_EL = fxRamp('bronze', [21, 5, 33, 32, 19]), EL = FXR[R_EL], R_IMP = FXI.impact, EN = FXR[FXI.enemy];
  const R_SPL = fxRamp('splinter', [17, 33, 19, 20, 20]);

  // ───── 材质（全部取自共享色板，没有新增颜色）─────
  const M = parts.mats(E, {
    gamb: { r: [20, 61, 61, 62], band: 2 },                                            // 棉甲压暗一档（基色 61）：盾面基色 62 + 亮 5，比棉甲亮一级，两块赭黄分得开
    sleeve: [20, 61, 61, 62], pants: 'stone',                                             // 棉甲袖同棉甲（盾左边那截前臂不会亮成第二块盾色）
    boot: 'boot', belt: 'leather', buckle: 'iron',
    skin: 'skin', ink: { r: 'ink', flat: 1 }, mail: 'steel', helm: 'steel', iron: 'iron', wood: 'wood', hair: [20, 19, 16, 33],
    face: 'sand', srim: 'iron', band: 'iron', fletch: 'white', shaft: 'wood',             // srim 盾的铁包边（单独一个材质：待机时不吃铜钉的轮廓光，保持铁色）
    boss: { r: [19, 32, 33, 5], flat: 1 }, bglow: { r: [5, 5, 21, 21], flat: 1 },     // 盾心青铜钉（发光体，和盾同一部件）
  });
  const BODY = { body: 'stocky', leg: 6, torso: 9, sw: 5, head: 6, limb: 1.2, stride: 2, fall: 'front' };
  const BODY_LIE = Object.assign({}, BODY, { sw: 3 });                                 // 趴在地上：侧看的身体厚度收成 7 行（sw 5 转 90° 后有 11 行，像一只立着的箱子）
  const R0 = parts.rig({}, BODY);
  const MACE = { head: 'mace', hand: 'B', metal: M.iron, wood: M.wood, trim: M.iron, len: 7, back: 3 };
  const SH = { W: 4, H: 14, rc: 6 };                                                  // 鸢盾：半宽 4（上沿 9 格宽）× 14 行（下巴下空一行 → 脚踝），盾心在第 6 行
  // 盾面插箭：[x, 行, 方向（parts 的 16 向下标）, 长度, 断茬]（盾本地坐标：x 相对中线）。第 0 支是待机个性里拔掉、技能里被震掉又插回来的那支
  const ARROWS = [[-2, 2, 2, 6, 0], [1, 5, 3, 6, 0], [-1, 10, 3, 6, 1]];
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(78, 48, 34, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 4, 7, 10], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['wood', 'skin', 'ink', 'fletch', 'shaft', 'boss', 'bglow', 'hair', 'mail']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 盾（hx hy，盾上沿中点 = 手 + (2, −6)），后手 = 锤（bhx bhy ba）─────
  // 额外字段：mask 盾上的箭（位）· tilt 斜举档（正 = 上沿往后仰，每档每行 0.22 格）· pk 待机拔箭帧（0 = 没有，1–12）· mfree 锤靠在肩上、手不握（拔箭时）
  //           · mrest 锤扛在后肩上（画在身体后面，后手藏在背后；只有攻击的出手段画在身前）· shd 死亡时盾（0 在手上 · 1 往前倾 · 2 快倒平 · 3 平拍在地）
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, st: 0, mask: 7, tilt: 0, pk: 0, mfree: 0, mrest: 0, shd: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, ba, lean, head, crouch) => ({ hx, hy, bhx, bhy, ba, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const REST = [-4, -14, -0.6];                                  // 锤扛在后肩：握点藏在护颈后面，柄斜过背，翼片锤头在尖盔左上方、离后脑 1 格
  const K_IDLE = K(7, -8, REST[0], REST[1], REST[2]);           // 盾从下巴下一行挡到脚踝
  const K_WIND = K(6, -9, -3, -20, -0.2, -1, 0, 1);             // 预兆：锤从肩上竖起来举到脑后（仍在头后面）
  const K_STRIKE = K(8, -8, 6, -18, 1.9, 1, 1);                 // 越过盾上沿短促下砸
  const K_HOLD = K(8, -8, 6, -15, 2.2, 1);
  const K_BRACE = K(8, -14, REST[0], REST[1], REST[2], 0, 0, 2);   // 蓄力：矮身缩到盾后，盾抬到齐眼（锤仍扛在肩上）
  const K_PUSH = K(9, -14, REST[0], REST[1], REST[2], 1, 0, 2);    // 施放：盾往前推 1 格
  const K_HURT = K(5, -9, -5, -14, -0.85, -1, -1);              // 受击：锤在肩上往后甩
  const K_STAG = K(8, -7, 4, -9, 0.4, 1, 1, 2);                 // 死亡：踉跄前倾，盾脱手
  const K_TOPPLE = K(10, -6, 6, -7, 0.8, 2, 1, 4);              // 死亡：往前栽（上身前倾到底、膝盖软下去），下一帧扑倒
  const K_DOWN = K(3, -22, -2, -12, 0, 0, 0, 0);                // 扑倒：前手往前伸（倒地时转到头前）
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'ba', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['ba', -32, 32, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -16, 15]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', 0, 15], ['hatY', 0, 7], ['dq', 0, 48, 48], ['st', 0, 8], ['mask', 0, 7], ['tilt', -3, 3], ['pk', 0, 12], ['mfree', 0, 1], ['mrest', 0, 1], ['shd', 0, 3]]);
  // 死亡按 12 fps 帧排：f7 踉跄、盾往前倾 · f8 盾快倒平 · f9 盾平拍在地（扬尘）+ 人往前栽 · f10–f12 扑倒离地 3 → 1 → 0（f12 = 1.0 s 着地）
  const T_STRIKE = 2 / 12, T_SHD = INCOMING + 0.45, T_LAND = INCOMING + 0.7, T_PUFF = 0.3;
  const D_STAG = 0.25, D_TOPPLE = 0.45, D_DOWN = 0.5, D_LAND = 0.7;          // 死亡各段（相对命中）
  const T_HIT = [0.04, 0.15, 0.27];                              // 施放段里三支箭撞上偏转面的时刻（间隔约 1.5 帧，施放末尾三道拖尾都还在）
  // 待机个性「拔箭」（1.4–2.4 s，每 1/12 s 一格）：[后手 x, y, 盾上的箭, 手里箭的方向（-1 没有）, 头]
  // 后手从背后越过头顶伸到盾上沿 → 拔箭 → 举到眼前（离鼻尖 3 格）→ 往身后一扔 → 回到肩上握锤
  const PLUCK = [[8, -20, 7, -1, 0], [12, -17, 7, -1, 0], [12, -20, 6, 2, 0], [8, -21, 6, 4, 1], [8, -21, 6, 4, 1], [2, -25, 6, 14, -1],
    [-3, -24, 6, -1, -1], [-6, -21, 6, -1, 0], [-5, -17, 6, -1, 0], [REST[0], REST[1], 6, -1, 0], [REST[0], REST[1], 6, -1, 0], [REST[0], REST[1], 6, -1, 0]];
  const FLY = { 6: [-6, -28, 13], 7: [-11, -29, 12], 8: [-15, -24, 10], 9: [-17, -14, 9], 10: [-18, 0, 9], 11: [-18, 0, 9] };   // 扔出去的断箭：[箭头 x, y, 方向]，越过锤头，第 10 格插进地里
  const PK0 = 1.4;

  function idle(tq, f12) {
    setK(K_IDLE, K_IDLE, 0); P.mrest = 1; const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = [0, 1, 0, -1][(b + 1) & 3]; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
    const lp = tq % DUR[IDLE];
    if (lp >= PK0 - 1e-6) { const k = Math.min(11, f12of(lp - PK0)), p = PLUCK[k]; P.pk = k + 1; P.mfree = k <= 8 ? 1 : 0; P.bhx = p[0]; P.bhy = p[1]; P.mask = p[2]; P.head = p[4]; if (k >= 1 && k <= 5) P.beard = 0; }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.mask = 7; P.tilt = 0; P.pk = 0; P.mfree = 0; P.mrest = 1; P.shd = 0;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                          // 侧身盾步：小步拖行，身体不起伏，只在落脚时往前一顿，盾跟着前后晃 1 格
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f); P.bob = 0;
      const c = (f & 1) ? 0 : 1; P.lean = c; P.hx += c; P.bhx += c;
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                      // 锤从肩上竖到脑后（头后面）→ 越过盾上沿砸下（身前）→ 收回举到脑后 → 放回肩上
      P.mrest = tq < 0.12 || tq >= 0.55 ? 1 : 0;
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; }
      else if (tq < 0.2) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 2; P.beard = -2; P.sway = -1; }
      else if (tq < 0.45) { setK(K_STRIKE, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.bx = 2; P.beard = -1; }
      else if (tq < 0.6) setK(K_HOLD, K_WIND, ease.inOut(clamp01((tq - 0.45) / 0.15)));
      else setK(K_WIND, K_IDLE, ease.out(clamp01((tq - 0.6) / 0.1)));
      if (tq >= 0.45) P.bx = RD(2 * (1 - ease.inOut(clamp01((tq - 0.45) / 0.3))));
    } else if (st === CHARGE) {                                      // 矮身缩到盾后，盾抬到齐眼、斜举；铜钉 1 → 1/2 档逐帧闪
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_BRACE, q); P.tilt = RD(q * 2);
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0);
    } else if (st === CAST) {                                        // 盾往前推 1 格，最上面那支旧断箭被震掉
      setK(K_BRACE, K_PUSH, ease.out(clamp01(tq / 0.12))); P.tilt = 2; P.gem = 3; P.rim = 3; P.beard = -2; P.mask = 6;
    } else if (st === RECOVER) {                                     // 盾放下；弹飞的那支箭掉回来「噗」地插在盾上（又是 3 支）
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_PUSH, K_IDLE, q); P.tilt = RD(2 * (1 - q));
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.mask = tq < T_PUFF - 1e-6 ? 6 : 7; P.beard = tq >= T_PUFF - 1e-6 && tq < T_PUFF + 0.15 ? 2 : -RD(1 - q);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.pk = 0; P.mask = 7; P.mfree = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
      if (h >= 0) { P.pk = 0; P.mask = 7; P.mfree = 0; }
    } else if (st === DEATH) {                                       // 受击 → 踉跄、盾脱手往前倒平 → 往前栽 → 人扑在盾上 → 尖盔滚出去 → 铜钉闪两下熄灭 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(tq, f12); P.rim = 1; }
      else {
        P.pk = 0; P.mfree = 0; P.mask = 7;
        if (d < D_STAG - 1e-6) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
        else if (d < D_DOWN - 1e-6) {                                // f7 踉跄（盾往前倾）· f8 盾快倒平 · f9 盾拍地、人往前栽（前倾到底、膝盖软下去）
          const top = d >= D_TOPPLE - 1e-6; setK(top ? K_TOPPLE : K_STAG, top ? K_TOPPLE : K_STAG, 0); P.eyes = 1; P.beard = top ? -2 : 1; P.sway = top ? -1 : 0; P.bx = top ? 1 : 0;
          P.shd = d < 0.33 ? 1 : d < T_SHD - INCOMING - 1e-6 ? 2 : 3; P.mask = P.shd === 3 ? 4 : 7; P.gem = (f12 & 1) ? 1 : 0;
        } else {                                                     // 扑倒：离地 3 → 1 → 0（只抬身体，平拍的盾、掉下的锤和盔都贴着地）
          setK(K_DOWN, K_DOWN, 0); P.lying = 1; P.eyes = 1; P.shd = 3; P.mask = 4; P.lift = d < 0.58 ? 3 : d < D_LAND - 1e-6 ? 1 : 0;
          const hq = clamp01((d - D_LAND) / 0.3); P.hatX = RD(9 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 4);
          const e = d - D_LAND; P.gem = e < 0 ? 1 : e < 0.08 ? 2 : e < 0.16 ? 4 : e < 0.24 ? 2 : 4;
          if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
        }
      }
    } else if (st === REVIVE) {
      idle(0, 0); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + (P.pk && P.pk < 10 ? 0 : yo); P.ba = RD(P.ba / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const g = bossAt(); P.gx = g[0] + P.bx; P.gy = g[1];              // 发光体 = 盾心青铜钉
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 本角色的部件（通用的标「候选部件」）─────
  // 候选部件：kiteShield —— 可调尺寸的鸢盾（上沿整 2W+1 格宽、上宽下尖，尖端 2 行单格），盾面朝镜头挂在前臂上。
  //   四边一圈 1 格铁包边（贴着身体的那一侧也有，和棉甲之间压出两格深色）；盾面基色 + 上沿下一行 / 左包边内一列亮色、右包边内一列暗色（鼓起来的板面）。
  //   o = { W 半宽, H 高, rc 盾心行, face 盾面, rim 铁包边, band 斜带材质（从左上角 45° 一路斜到右包边，2 格宽，和盾面同一部件）, boss / bglow 盾心钉（flat，按 lv 5 档亮：0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭）,
  //         bossR 0 = 十字钉头（3×3 缺角）· 1 = 大钉（5×5 缺角）, tilt 斜举（每行 x 偏移 round(tilt × (行 − H/2))，正 = 上沿往后仰）, clip 这一行以下不画（插进地里）,
  //         spikes 顶钉材质（上沿两角各一根 2 格尖钉）, rivets 铆钉材质 + rivetRows 行号 + lit 从下往上已亮的行数（亮了用 boss 的第 4 级，最新一行用 bglow）,
  //         arrows 插箭表 [[x, 行, 方向, 长度, 断茬], …] + mask 画哪几支（位）+ shaft / fletch 材质 + wob 箭尾摆 −1..1 }
  //   一个部件（箭杆、钉、铆钉都和盾同一部件，不压分界线）。T 是落笔变换（rig 或 parts.FREE）；(cx, top) = 上沿中点。返回盾心 [x, y]（T 坐标）
  const KH = {};
  function kiteHalf(W, H) {
    const key = W * 100 + H; if (KH[key]) return KH[key];
    const a = [], kn = RD(H * 0.42);
    for (let r = 0; r < H; r++) a.push(r <= kn ? W : RD(W * (1 - Math.pow((r - kn) / (H - 1 - kn), 0.85))));   // 上沿整宽（9 格），第 kn 行以下收尖
    return (KH[key] = a);
  }
  function kiteShield(T, cx, top, o) {
    const W = o.W, H = o.H, hw = kiteHalf(W, H), tl = o.tilt || 0, sh = (r) => RD(tl * (r - H / 2));
    E.part();
    for (let r = 0; r < H; r++) {
      const w = hw[r], y = top + r; if (o.clip != null && y > o.clip) continue;
      const s = sh(r), b0 = -W + r, up = r > 0 ? hw[r - 1] : -1, dn = r < H - 1 ? hw[r + 1] : -1;   // 斜带：第 r 行占 x = b0、b0 + 1（从左上角一路 45° 斜到右包边）
      for (let x = -w; x <= w; x++) {
        const ax = Math.abs(x), rim = r === 0 || r === H - 1 || ax === w || ax > up || ax > dn;
        let m = o.face, t = 3;
        if (rim) { m = o.rim; t = (r === 2 || r === RD(H * 0.62)) && ax === w ? 4 : 0; }            // 一圈铁包边（自动明暗）；两侧各两颗铆钉
        else if (o.band && (x === b0 || x === b0 + 1)) { m = o.band; t = x === b0 ? 3 : 2; }       // 墨黑斜带：一整条、2 格宽
        else if (r === 1 || x === -w + 1) t = 4;                                                    // 上沿下一行、左包边内一列受光
        else if (x === w - 1 || (x > 0 && x >= dn)) t = 2;                                          // 右包边内一列、右下收尖处背光
        px(E, T, cx + x + s, y, m, t);
      }
    }
    if (o.spikes) for (const sx of [-(W - 1), W - 1]) { px(E, T, cx + sx + sh(-1), top - 1, o.spikes, 0); px(E, T, cx + sx + sh(-2), top - 2, o.spikes, 4); }
    if (o.rivets) {
      const n = o.rivetRows.length;
      for (let i = 0; i < n; i++) {
        const r = o.rivetRows[i], w = hw[r] - 1, lit = n - i <= (o.lit || 0), newest = n - i === (o.lit || 0);
        for (const sx of [-w, w]) px(E, T, cx + sx + sh(r), top + r, lit ? (newest ? o.bglow : o.boss) : o.rivets, lit ? (newest ? 3 : 4) : 4);
      }
    }
    const lv = o.lv || 0, bx = cx + sh(o.rc), by = top + o.rc;
    const C = lv === 4 ? [o.boss, 1] : lv >= 2 ? [o.bglow, 3] : lv === 1 ? [o.boss, 4] : [o.boss, 3];
    const Rg = lv === 4 ? [o.boss, 1] : lv === 3 ? [o.bglow, 3] : lv === 2 ? [o.boss, 4] : lv === 1 ? [o.boss, 3] : [o.boss, 2];
    if (o.bossR) {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (Math.abs(dx) + Math.abs(dy) > 3) continue; const e = Math.abs(dx) === 2 || Math.abs(dy) === 2; px(E, T, bx + dx + (sh(o.rc + dy) - sh(o.rc)), by + dy, e ? (lv === 4 ? o.boss : o.rivets || o.boss) : Rg[0], e ? (lv === 3 ? 4 : 2) : Rg[1]); }
      if (lv < 3 && lv !== 4) px(E, T, bx - 1, by - 1, o.boss, 4);
    } else for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(E, T, bx + dx, by + dy, Rg[0], Rg[1]);
    px(E, T, bx, by, C[0], C[1]);
    if (o.arrows) for (let i = 0; i < o.arrows.length; i++) {
      if (!((o.mask >> i) & 1)) continue;
      const [ax, ar, di, len, brk] = o.arrows[i];
      for (let k = 0; k <= len; k++) {
        const c = parts.cell(di, ax, ar, k), tail = k >= len - 1, wb = tail ? (o.wob || 0) : 0, X = cx + c[0] + sh(c[1]) + wb, Y = top + c[1];
        if (k === 0) px(E, T, X, Y, o.shaft, 1);                                             // 箭头扎进盾面的地方（一格深色）
        else if (!tail || brk) px(E, T, X, Y, o.shaft, brk && k === len ? 4 : (k & 1) ? 3 : 4);   // 箭杆；断茬的最后一格是白生生的木茬
        else { px(E, T, X, Y, o.fletch, k === len ? 4 : 3); if (k === len - 1) px(E, T, X, Y - 1, o.fletch, 2); }   // 白羽（两格 + 一片侧羽）
      }
    }
    return [bx, by];
  }
  // 候选部件：kiteFlat —— 平拍在地上的鸢盾（往前倒的：尖端留在身前 x0，盾顶宽的一端落在远处 x0 + len − 1）：侧看 2 行（铁包边 + 漆面），尖端只剩 1 行；
  //   盾心钉鼓出 1 格（按 lv 亮 / 熄灭），一截断箭茬朝上。返回盾心 [x, y]
  function kiteFlat(x0, len, lv) {
    E.part(); const T = parts.FREE, bi = RD(len * 0.4), top = x0 + len - 1;
    for (let i = 0; i < len; i++) {
      const j = len - 1 - i, x = x0 + i, tip = j >= len - 2, band = j === RD(len * 0.55) || j === RD(len * 0.55) + 1;   // j = 离盾顶几格
      px(E, T, x, 0, M.srim, j === 0 ? 4 : 0);
      if (!tip) px(E, T, x, -1, j === 0 || j === len - 3 ? M.srim : band ? M.band : M.face, j === 0 ? 4 : band ? 2 : 3);
    }
    px(E, T, top - bi, -1, lv === 4 ? M.boss : lv >= 2 ? M.bglow : M.boss, lv === 4 ? 1 : lv >= 2 ? 3 : 4); px(E, T, top - bi, -2, M.boss, lv === 4 ? 1 : 2);
    px(E, T, top - 3, -2, M.shaft, 3); px(E, T, top - 2, -3, M.shaft, 4);                   // 没折断的那截箭茬
    return [top - bi, -1];
  }
  // 手里 / 飞在空中的断箭：(x, y) 握点 / 中心，沿 di 往箭尾伸 n 格（白羽），往反方向伸 2 格（箭头）。clip 1 = 不画地面以下
  function looseArrow(x, y, di, n, clip) {
    E.part(); const T = parts.FREE, bk = (di + 8) & 15;
    for (let k = -2; k <= n; k++) {
      const c = k < 0 ? parts.cell(bk, x, y, -k) : parts.cell(di, x, y, k); if (clip && c[1] > 0) continue;
      if (k === -2) px(E, T, c[0], c[1], M.iron, 3); else if (k >= n - 1) px(E, T, c[0], c[1], M.fletch, k === n ? 4 : 3); else px(E, T, c[0], c[1], M.shaft, (k & 1) ? 3 : 4);
    }
  }
  function shieldGeo() { return { cx: P.hx + 2, top: P.hy - 6, tilt: P.tilt * 0.22 }; }
  function bossAt() {
    if (P.shd === 3) return [FLAT_X0 + FLAT_LEN - 1 - RD(FLAT_LEN * 0.4), -1];
    if (P.shd) { const s = dropGeo(); return [s.cx + RD(s.tilt * (s.rc - s.H / 2)), s.top + s.rc]; }
    const g = shieldGeo(); return [g.cx + RD(g.tilt * (SH.rc - SH.H / 2)), g.top + SH.rc];
  }
  const FLAT_X0 = 12, FLAT_LEN = 14;                                                  // 平拍的盾：尖端 x 12、盾顶 x 26（人趴在尖端那半截上，盾心钉露在伸出去的手前面）
  function dropGeo() { return P.shd === 1 ? { cx: 12, top: -14, tilt: -0.45, H: SH.H, rc: SH.rc } : { cx: 15, top: -7, tilt: -0.9, H: 8, rc: 3 }; }   // 盾往前倒：1 = 尖着地、上沿前倾 · 2 = 快拍平（压扁成 8 行）

  // 只给已经画成材质 m 的格子改色调（绗缝线、锁子环纹这种「在同一部件里补纹理」用，不会在部件外面多出像素）
  function retone(R, x, y, m, t) { const s = parts.toSprite(R, x, y), X = s[0] + P.bx + hero.ox, Y = s[1] + hero.oy; if (X < 0 || Y < 0 || X >= hero.w || Y >= hero.h) return; if (hero.mat[Y * hero.w + X] === m) px(E, R, x, y, m, t); }

  // ───── 画（部件从后往前）─────
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, P.lying ? BODY_LIE : BODY), dead = P.st === DEATH;   // 离地 lift 由 rig 只加在身体上
    if (P.shd === 3) kiteFlat(FLAT_X0, FLAT_LEN, P.gem);                                      // 盾平拍在地上（人扑在上面，所以先画）
    const mace = !dead || (!P.shd && !R.lie);                                                   // 锤还在手上 / 肩上
    if (dead && (P.shd || R.lie)) parts.hammer(E, R, P, Object.assign({}, MACE, { free: 1, at: [-7, -1], a: -HALF }));   // 锤掉在身后地上
    else if (mace && P.mfree) parts.hammer(E, R, P, Object.assign({}, MACE, { at: [REST[0], REST[1] + P.bob], a: REST[2] }));   // 锤自己靠在后肩上，手去拔箭
    else if (mace && P.mrest) parts.hammer(E, R, P, MACE);                                      // 锤扛在后肩：画在身体最后面，柄斜过背，锤头在尖盔左上方
    const armAt = R.lie || (P.mrest && !P.mfree && mace) ? [R.sBx + 2, R.yWaist] : null;                // 扛锤时后臂垂在身体后面（握点藏在护颈后，不伸出背后）
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.sleeveD, cuff: M.beltD, cuffStyle: 'bracer', grip: 'none', at: armAt });
    parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD });
    const tor = parts.torso(E, R, P, { style: 'tunic', mat: M.gamb, belt: M.belt, buckle: M.buckle });
    { const [LL, RR] = tor.rows; for (let i = 2; i < LL.length - 1; i++) { const y = tor.y0 + i; for (let x = LL[i] + 1; x < RR[i]; x++) if ((y & 1) === 0 && ((((x + y) % 6) + 6) % 6 === 0 || (((x - y) % 6) + 6) % 6 === 0)) retone(R, x, y, M.gamb, 1); } }   // 菱格绗缝（和棉甲同一部件）：两组 45° 缝线、每 2 格一个深色针脚
    parts.mantle(E, R, P, { style: 'plain', mat: M.mail, len: 3 });                           // 锁子护颈：垂到肩上（画在头之前：下巴下面压出一道阴影线，脸不被压黑）
    for (let y = R.yS; y < R.yS + 3; y++) for (let x = R.hx0 - 4; x <= R.hx1 + 4; x++) if ((((x + 2 * y) % 4) + 4) % 4 === 1) retone(R, x, y, M.mail, 2);   // 锁子环纹（只改已经是锁子的格子）
    parts.head(E, R, P, { mat: M.skin, face: 'square', eye: M.ink, nose: 'big', mouth: 'line', ear: 'none' });
    { E.part(); const x0 = R.hx0; for (let y = R.ey - 1; y < R.yS; y++) { px(E, R, x0 - 1, y, M.mail, (y & 1) ? 2 : 0); if (y > R.ey) px(E, R, x0, y, M.mail, (y & 1) ? 0 : 2); } }   // 盔檐垂下来的后脑锁子
    const helm = { style: 'nasal', mat: M.helm, trim: M.iron };
    if (R.lie) parts.helm(E, R, P, Object.assign({ at: [19 + RD(P.hatX * 1.9), -2 - P.hatY], rot: (P.hatX >> 2) & 3 }, helm));   // 尖盔从头上滚出去，越过盾顶落在前面
    else parts.helm(E, R, P, Object.assign({ at: [R.hx, R.htop - 2] }, helm));                  // 盔往上提 1 行：盔檐压在眉上，眼睛那一行不被压成勾线色
    if (mace) {
      if (!P.mrest && !P.mfree) parts.hammer(E, R, P, MACE);                                   // 砸：锤越过盾上沿（画在头前面、盾后面）
      if (P.pk && P.pk <= 6) { const p = PLUCK[P.pk - 1]; if (p[3] >= 0) looseArrow(P.bhx + (p[3] === 4 ? 1 : 0), P.bhy, p[3], 3); }
      if (!P.mrest || P.mfree) parts.hand(E, R, P, { side: 'B', hand: M.skin });              // 扛锤时后手藏在背后
    }
    if (P.pk >= 7) { const f = FLY[P.pk - 1]; if (f) looseArrow(f[0], f[1], (f[2] + 8) & 15, 3, P.pk >= 11); }   // 扔到身后的断箭：翻着飞、最后插进地里
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.sleeve, cuff: M.belt, cuffStyle: 'bracer', hand: M.skin, at: R.lie ? [R.hx1 + 1, R.htop - 1] : null });
    const SO = { W: SH.W, H: SH.H, rc: SH.rc, face: M.face, rim: M.srim, band: M.band, boss: M.boss, bglow: M.bglow, lv: P.gem, arrows: ARROWS, mask: P.mask, shaft: M.shaft, fletch: M.fletch, wob: Math.max(-1, Math.min(1, -P.beard)) };
    if (!P.shd) { const g = shieldGeo(); kiteShield(R, g.cx, g.top, Object.assign(SO, { tilt: g.tilt })); }
    else if (P.shd < 3) { const s = dropGeo(); kiteShield(parts.FREE, s.cx, s.top, Object.assign(SO, { H: s.H, rc: s.rc, tilt: s.tilt, arrows: s.H === SH.H ? ARROWS : null })); }
  }
  function bakeHero() {                                              // 盾的铁包边：待机 / 移动（轮廓光 1 档）不吃铜钉的光，保持一圈铁色；蓄力起才亮成青铜
    RIM.skip[M.srim] = RIM.skip[M.srimD] = P.rim <= 1 ? 1 : 0;
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
  }

  // ───── 特效 ─────
  // 技能里的箭（最多 6 支，预分配）：st 1 飞来 · 2 被偏转（按速度 + 重力飞）· 3 插在地上 · 4 震掉的旧箭（翻滚落地）· 5 躺在地上；spin 1 = 翻着飞；trail 剩余的青铜拖尾秒数
  const AN = 6, aSt = new Uint8Array(AN), aX = new Float32Array(AN), aY = new Float32Array(AN), aVX = new Float32Array(AN), aVY = new Float32Array(AN), aG = new Float32Array(AN);
  const aT = new Float32Array(AN), aSpin = new Uint8Array(AN), aDi = new Uint8Array(AN), aTr = new Float32Array(AN), aFloor = new Float32Array(AN);
  const PL = [2, -31], PLN = 14, HITK = [12, 8, 4];              // 偏转面：盾面前上方，从 (3, −30) 斜到 (15, −18)（45°），三支箭依次撞在第 10、6、2 格
  const A_SPD = 300, A_DIR = [-2 / Math.sqrt(5), 1 / Math.sqrt(5)];
  let plT = 9, plWhite = 9, hitT = [9, 9, 9], chargeAcc = 0, soulAcc = 0, lastStep = 0, lastPk = 0, strikeT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const dirOf = (vx, vy) => parts.snapDir(Math.atan2(vx, -vy));
  function arrowOn(i, x, y, vx, vy, g, st) { aSt[i] = st; aX[i] = x; aY[i] = y; aVX[i] = vx; aVY[i] = vy; aG[i] = g; aT[i] = 0; aSpin[i] = 0; aTr[i] = 0; aFloor[i] = 0; aDi[i] = dirOf(vx, vy); }
  function onEnter(s) {
    if (s !== CAST) return;
    plT = 0; plWhite = 9; hitT[0] = hitT[1] = hitT[2] = 9;
    for (let i = 0; i < 3; i++) { const hx = wx(PL[0] + HITK[i]), hy = wy(PL[1] + HITK[i]), d = A_SPD * T_HIT[i]; arrowOn(i, hx - A_DIR[0] * d, hy - A_DIR[1] * d, A_DIR[0] * A_SPD, A_DIR[1] * A_SPD, 0, 1); }
    const g = shieldGeo(), c = parts.cell(ARROWS[0][2], ARROWS[0][0], ARROWS[0][1], 3);     // 盾往前一推：最上面那支旧断箭被震掉
    arrowOn(3, wx(g.cx + c[0] + P.bx), wy(g.top + c[1]), 25, -40, 420, 4); aSpin[3] = 1; aFloor[3] = HY;
    releaseOrbit(40, 90, 0.25, 0.5, { pts: 1, ramp: R_EL });
    const bx = wx(P.gx), by = wy(P.gy); burst(bx, by, 8, 40, 100, 0.2, 0.45, R_EL, 10); fx.cross(bx, by, 5, R_EL, 0.3);
    shake(0.28, 2); flash(0.05);
  }
  function deflect(i) {                                            // 第 i 支箭撞上偏转面：改道 + 火花 + 青铜外爆 + 星芒
    const x = wx(PL[0] + HITK[i]), y = wy(PL[1] + HITK[i]); hitT[i] = 0; aX[i] = x; aY[i] = y; aSt[i] = 2; aT[i] = 0; aTr[i] = i === 0 ? 0.22 : 0.5;   // 弹飞的两支拖一道长的青铜弧（0.5 s），三个方向分得开
    if (i === 0) { aVX[i] = 40; aVY[i] = 230; aG[i] = 0; aFloor[i] = HY + 1; }               // 向下插进地里
    else if (i === 1) {                                                                         // 向上翻着弹飞，收招时掉回来插在盾上
      const g = restGeo(), c = [g.cx + ARROWS[0][0], g.top + ARROWS[0][1]], T = DUR[CAST] - T_HIT[1] + T_PUFF, tx = wx(c[0]), ty = wy(c[1]);
      aG[i] = 520; aVX[i] = (tx - x) / T; aVY[i] = (ty - y - 0.5 * aG[i] * T * T) / T; aSpin[i] = 1; aTr[i] = 0.6;
    } else { aVX[i] = -300; aVY[i] = -95; aG[i] = 0; }                                          // 擦过头顶往左上飞走（比往上弹的那支平、快，两道拖尾分得开）
    burst(x, y, 6, 40, 90, 0.12, 0.3, R_IMP, 6); burst(x, y, 8, 30, 80, 0.2, 0.45, R_EL, 8); fx.cross(x, y, 4, R_EL, 0.22);
    if (i === 2) { plWhite = 0; ring(x, y, 0, R_EL); }
    sfx('impact', { pal: 'metal', w: 0.4 + i * 0.08, n: i + 1 });
  }
  function restGeo() { const keep = P.st, t = E.stT; poseAt(RECOVER, T_PUFF, T_PUFF); const g = shieldGeo(); poseAt(keep, t, E.simT); return g; }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {                            // 砸：锤头越过盾上沿落在假人身上
      strikeT = 0;
      const f = parts.hammer.focus(P, MACE), hx = wx(f[0] + P.bx), hy = wy(f[1]);
      fx.slash(wx(0 + P.bx), wy(-16), 11, K_WIND.ba + 0.2, K_STRIKE.ba + 0.2, R_IMP, 0.17, 2, 2);
      hitDummy(0); burst(hx + 1, hy, 12, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(hx + 1, hy, 4, R_IMP, 0.2);
      for (let i = 0; i < 2; i++) spawn(K_DUST, wx(5) + Math.random() * 3, HY, -20 - Math.random() * 20, -5 - Math.random() * 5, 0.3, FXI.dust);
      sfx('swing', { kind: 'smash', w: 0.55 }); sfx('hit', { mat: 'wood', w: 0.55 });
    }
    if (s === CAST) for (let i = 0; i < 3; i++) if (Math.abs(t - T_HIT[i]) < 1e-9) deflect(i);
    if (s === RECOVER && Math.abs(t - T_PUFF) < 1e-9) {              // 「噗」：弹回来的断箭插回盾上
      aSt[1] = 0; const g = shieldGeo(), x = wx(g.cx + ARROWS[0][0] + P.bx), y = wy(g.top + ARROWS[0][1]);
      burst(x, y, 5, 20, 50, 0.15, 0.3, R_SPL, 4); fx.cross(x, y, 3, R_EL, 0.15); sfx('hit', { mat: 'wood', w: 0.2 });
    }
    if (s === DEATH && Math.abs(t - T_SHD) < 1e-9) {                 // 盾平拍在地上：扬尘，两支断箭折断弹起
      for (let i = 0; i < 10; i++) spawn(K_DUST, wx(FLAT_X0 + Math.random() * FLAT_LEN), HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
      for (let i = 0; i < 6; i++) spawnX(K_PHYS, wx(FLAT_X0 + 5 + i * 1.6), HY - 3, (Math.random() - 0.3) * 40, -60 - Math.random() * 40, 0.7 + Math.random() * 0.3, R_SPL, { g: 260, floor: HY });
      sfx('fall', { w: 0.35 });
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 8 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.55 }); }
  }
  const EVENTS = [[], [], [T_STRIKE], [], T_HIT.slice(), [T_PUFF], [], [T_SHD, T_LAND], []];
  function stepFX(dt, state, stT) {
    const bx = wx(P.gx), by = wy(P.gy);
    if (state === CHARGE) {                                          // 青铜光点从盾沿四周汇聚到盾心铜钉
      chargeAcc += dt * (18 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 11 + Math.random() * 7; spawn(K_SPIRAL_PT, bx, by, r / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, (Math.random() - 0.5) * 2); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.55 }); spawn(K_DUST, wx(P.step > 0 ? 5 : -4) + (Math.random() - 0.5) * 2, HY, (Math.random() - 0.5) * 14, -4 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); } lastStep = P.step; }
    if (state === IDLE) { if (P.pk === 11 && lastPk !== 11) spawn(K_DUST, wx(-18), HY, (Math.random() - 0.5) * 10, -6, 0.35, FXI.dust); lastPk = P.pk; }   // 扔掉的断箭落地：1 颗尘
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 4 + Math.random() * 26, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < AN; i++) {
      if (!aSt[i]) continue; aT[i] += dt;
      if (aSt[i] === 3 || aSt[i] === 5) { if (state !== CAST && state !== RECOVER) aSt[i] = 0; continue; }
      aVY[i] += aG[i] * dt; aX[i] += aVX[i] * dt; aY[i] += aVY[i] * dt;
      if (aTr[i] > 0) { aTr[i] -= dt; const n = Math.max(1, Math.ceil(Math.hypot(aVX[i], aVY[i]) * dt / 1.5)); for (let k = 0; k < n; k++) { const q = k / n; spawn(K_STILL, aX[i] - aVX[i] * dt * q, aY[i] - aVY[i] * dt * q, 0, 0, i === 0 ? 0.25 : 0.45, R_EL); } }   // 连成一道不断的弧（按速度补点）
      if (!aSpin[i]) aDi[i] = dirOf(aVX[i], aVY[i]); else if (i === 1 && aVY[i] > 60) { aSpin[i] = 0; aDi[i] = 10; } else aDi[i] = (2 * f12of(aT[i]) + 2) & 15;   // 翻着飞；掉回来的那支最后箭头朝下左扎向盾面
      if (aFloor[i] && aY[i] >= aFloor[i]) { aY[i] = aFloor[i]; if (aSt[i] === 2) { aSt[i] = 3; spawn(K_DUST, aX[i], HY, 0, -6, 0.3, FXI.dust); } else { aSt[i] = 5; aDi[i] = 4; spawn(K_DUST, aX[i], HY, 0, -5, 0.3, FXI.dust); } }
      if (aX[i] < -12 || aX[i] > 150 || aY[i] < -30) { if (aSt[i] !== 1) aSt[i] = 0; }
    }
    plT += dt; plWhite += dt; for (let i = 0; i < 3; i++) hitT[i] += dt; strikeT += dt;
  }
  function fxReset() { plT = 9; plWhite = 9; hitT[0] = hitT[1] = hitT[2] = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastPk = 0; strikeT = 9; aSt.fill(0); }
  function fxBack(f12) { if (P.dq < 1 && !P.lying) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function drawArrow(x, y, di) {                                  // 敌箭：(x, y) = 箭头，箭杆沿反方向 4 格；插在地上时不画地面以下
    x = RD(x); y = RD(y); const bk = (di + 8) & 15;
    if (y <= HY) put(x, y, EN[0]);
    for (let k = 1; k <= 4; k++) { const c = parts.cell(bk, x, y, k); if (c[1] > HY) continue; put(c[0], c[1], k === 4 ? EN[1] : EN[2]); if (k === 4) { const s = parts.cell(bk, x, y - 1, 4); if (s[1] <= HY) put(s[0], s[1], EN[1]); } }
  }
  function fxFront(f12) {
    if (plT < 1.1) {                                               // 偏转面：45° 斜的青铜点阵，每 2 格一点、逐点亮起；撞击处闪白 2 帧，最后一下整片闪白，收招时断续熄灭
      const lit = clamp01(plT / 0.06), gone = clamp01((plT - 0.55) / 0.5);
      for (let k = 0; k <= PLN; k++) {
        if (k / PLN > lit + 1e-6 || hash(k, 5) < gone) continue;
        const dot = (k & 1) === 0; let c = !dot ? EL[3] : ((k >> 1) + f12) % 3 === 0 ? EL[0] : EL[1];
        for (let i = 0; i < 3; i++) if (hitT[i] < 2 / 12 && Math.abs(k - HITK[i]) <= 2) c = EL[0];
        if (plWhite < 2 / 12) c = EL[0];
        const x = wx(PL[0] + k), y = wy(PL[1] + k); put(x, y, c); if (dot) put(x + 1, y, gone > 0 ? EL[3] : EL[2]); if (k / PLN > lit - 0.12) put(x, y - 1, EL[0]);
      }
    }
    for (let i = 0; i < AN; i++) if (aSt[i]) drawArrow(aX[i], aY[i], aSt[i] === 5 ? 12 : aDi[i]);
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.lying) {        // 铜钉星芒
      const x = wx(P.gx), y = wy(P.gy), L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(x + r, y, c); put(x - r, y, c); put(x, y - r, c); put(x, y + r, c); }
    }
  }
  function hurtFx(s) {                                               // 挨打的是盾：火花里夹着铜屑
    const hx = HX + 9, hy = HY - 11; burst(hx, hy, s === DEATH ? 22 : 14, 50, 130, 0.25, 0.55, R_IMP, 20); burst(hx, hy, 6, 30, 80, 0.2, 0.4, R_EL, 10);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }

  return {
    name: '持盾卫士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.boss, M.bglow], HIT_POINT: [8, -11], EVENTS,
    SHEET: [[IDLE, [0, 0.4, 0.8, 1.4, 1.5, 1.6, 1.75, 1.9, 2.0, 2.1, 2.25]], [MOVE, [0, 1 / 6, 2 / 6, 3 / 6]], [ATTACK, null], [CHARGE, 'step2'], [CAST, null], [RECOVER, 'step2'], [HURT, 'hurt'],
      [DEATH, [0.34, 0.42, 0.6, 0.7, 0.78, 0.9, 1.0, 1.1, 1.3, 1.95, 2.15, 2.35]], [REVIVE, [0.45, 0.55, 0.65, 0.75, 0.9]]],
    SFX: { body: 'armor', how: 'topple', pal: 'metal', style: 'shield', w: 0.55 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
