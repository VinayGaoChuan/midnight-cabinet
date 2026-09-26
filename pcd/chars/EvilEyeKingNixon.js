// 邪眼王尼克松（敌人 · 混沌 · 不朽首领 · 远程 1200）：悬浮巨眼球身体 + 歪戴的尖齿王冠 + 两侧垂下的破王袍 + 身下 5 条卷须；
// 攻击「凝视」瞳孔光束；技能「盛宴」吸食魂丝回血、连射 3 道越打越快的光束；常驻「首领单位」暗金点阵护壁；死亡坠地爆裂、王冠滚落。
// 从 batch-00-pilot/EvilEyeKingNixon/EvilEyeKingNixon.html（按技能模板写的单文件）转成共享引擎模块：画法、姿势、时间线、特效逻辑原样保留。
PCD.define('EvilEyeKingNixon', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, clamp01, q12, f12of, gait, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_ORBIT, K_BURST, K_TRAIL, K_EMBER, K_RISE, K_DUST, DT,
    spawn, burst, releaseOrbit, ring, shake, flash, hitDummy, put, scrX, shotFloorGlow, sfx } = E;
  const fl = (x) => Math.floor(x + 1e-6);                        // 姿势 / 画法里的取整都带容差（同 q12）
  const easeInOut = E.ease.inOut;

  // ───── 颜色：原版第 1 节末尾追加的 27–43 号，精确同色 ─────
  const XC = ['#3a2e10', '#7a6424', '#c2a848', '#eee08c',        // 27–30 病黄眼白（勾线 / 暗 / 基 / 亮）
    '#1a1020', '#33243d', '#4f3a5c', '#6e5580',                   // 31–34 紫灰腐肉（肉球、眼睑、触须）
    '#0c1410', '#1c2a22', '#2e4236',                              // 35–37 暗墨绿王袍（勾线 / 暗 / 基）
    '#8a5a1e', '#d8281a',                                         // 38 暗金（王冠、护壁）· 39 狂怒血丝红
    '#f4ffb0', '#c8e030', '#6a8a14', '#24300a'].map(E.color);     // 40–43 盛宴 · 胆汁酸绿（淡黄绿 → 酸黄绿 → 橄榄 → 墨绿）
  const oc = (i) => (i < 27 ? i : XC[i - 27]);                   // 原版色板下标 → 本页下标（0–26 与共享色板相同）
  const om = (a) => a.map(oc);
  const C_GOLD = oc(38);                                         // 护壁暗金点

  // ───── 材质、缓冲、姿势 ─────
  const M_SCL = defMat(om([27, 28, 29, 30]), 2), M_SMALL = defMat(om([27, 28, 29, 30]), 1);                                   // 病黄眼白：大眼（大面积 band 2）、小眼
  const M_FLESH = defMat(om([31, 32, 33, 34]), 2), M_LID = defMat(om([31, 32, 33, 34]), 1), M_TENT = defMat(om([31, 32, 33, 34]), 1);   // 紫灰腐肉：肉球、眼睑、触须
  const M_ROBE = defMat(om([35, 36, 37, 37]), 2), M_CROWN = defMat(om([0, 20, 38, 14]), 1);                                  // 暗墨绿王袍、暗金王冠
  const M_VEIN = defMat(om([12, 12, 13, 39]), 1, 1), M_SPEC = defMat([5, 5, 5, 5], 1, 1);                                    // 血丝（平时 13，狂怒 39）、眼白湿高光
  const M_IRIS = defMat(om([43, 42, 41, 40]), 1, 1), M_GLOW = defMat(om([40, 40, 21, 21]), 1, 1), M_INK = defMat([0, 0, 0, 0], 1, 1);   // 虹膜（发光体）、施放白芯、竖缝瞳孔
  const M_ACID = defMat(om([43, 42, 41, 40]), 1, 1);                                                                          // 眼球破裂后的酸液水洼
  // 特效色阶：盛宴 · 胆汁酸绿（本角色元素）、暗金（护壁碎片）
  const R_BILE = E.fxRamp('bile', om([21, 40, 41, 42, 43])), R_GOLD = E.fxRamp('wardGold', om([21, 5, 14, 38, 20]));
  const R_IMPACT = FXI.impact, R_DUST = FXI.dust;
  const R_EL = R_BILE, EL = FXR[R_EL];                           // 本角色的元素色阶：轮廓光、凝视光束、魂丝、粒子都用它
  const hero = new Sprite(80, 60, 38, 50);                       // 缓冲：脚底 = (38, 50)；放得下悬浮 + 王冠、蓄力伸出的触须、破裂皮囊 + 滚落的王冠
  const HERO_RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  HERO_RIM.skip[M_IRIS] = HERO_RIM.skip[M_GLOW] = HERO_RIM.skip[M_INK] = HERO_RIM.skip[M_VEIN] = HERO_RIM.skip[M_TENT] = HERO_RIM.skip[M_ACID] = HERO_RIM.skip[M_SPEC] = 1;
  const HX = 30, DUR = DEFAULT_DUR.slice();                      // 远程；体型大，站位往左让出空间
  // 姿势参数（全部取整；缓存键按此编码，超出会串位）：
  //   bx -16..15 · by -8..23（整体下移；13 = 眼球落地）· ix -4..4 · iy -7..4（虹膜相对眼白中心）· pw 0..3（瞳孔：细缝 / 竖缝 / 放大 / 圆）
  //   lid 0..4（上睑盖下的程度，4 = 闭眼）· vein 0..2（血丝变红）· gem 0..4（虹膜：待机 / 蓄力 1 / 蓄力 2 / 施放 / 熄灭）· rim 0..3
  //   tph 0..7（触须相位）· tmode 0..8（触须形态：垂 / 半卷 / 全卷 / 后拖 / 抽搐 / 瘫地 / 伸出 / 张开 / 前甩）· sway -2..2（袍摆）
  //   swell 0..1（眼球膨胀）· cg 0..2（王冠尖：常亮 / 中齿闪 / 全白）· flash / sq（触地压扁 0..2）/ cj（王冠跳起）/ glint / lying 0..1
  //   crX -40..23 · crY 0..31 · crR 0..4（掉落王冠：旋转 0–3，4 = 斜靠静止）· dq 0..1 · ddir 0..1
  const P = { bx: 0, by: 0, ix: 4, iy: 0, pw: 1, lid: 0, vein: 0, gem: 0, rim: 0, tph: 0, tmode: 0, sway: 0, swell: 0, cg: 0, flash: 0, sq: 0, cj: 0, glint: 0, lying: 0, crX: 0, crY: 0, crR: 0, dq: 0, ddir: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const SWAY_IDLE = [0, 1, 0, -1], FLOAT_BY = [0, -1, -2, -1], WALK_DIST = 14;              // 飘浮：接触 → 经过 → 高点 → 经过，上下 2 格
  const LOOK = [[0, 4, 0], [0.58, -2, -3], [0.92, 3, 3], [1.17, -3, 1], [1.42, 4, 0]];     // 待机个性：瞳孔乱瞟 [起点秒, ix, iy]
  const BLINK = [[1.58, 1], [1.67, 2], [1.75, 3], [1.83, 4], [1.92, 4], [2.0, 3], [2.08, 2], [2.17, 1], [2.25, 0]];   // 慢眨一次
  const GLOW_MATS = [M_IRIS, M_GLOW], HIT_POINT = [9, -25];     // 发光体材质（HD-2D 发光遮罩用）、受击点（本地坐标：眼球右缘）
  const T_FLICK = 2 / 12;
  const B_T = [0.1, 0.26, 0.36], B_Y = [16, 13, 15];            // 施放段内三道凝视光束：间隔 0.16 → 0.10（攻速越打越快）；命中高度
  const DEATH_BOUNCE = [[0.46, 13, 1], [0.54, 10, 0], [0.62, 9, 0], [0.70, 11, 0], [0.78, 13, 1]];   // 坠地回弹：[起点, by, 压扁]

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.bx = 0; P.by = 0; P.ix = 4; P.iy = 0; P.pw = 1; P.lid = 0; P.vein = 0; P.gem = 0; P.rim = 1; P.tph = 0; P.tmode = 0; P.sway = 0; P.swell = 0; P.cg = 0;
    P.flash = 0; P.sq = 0; P.cj = 0; P.glint = 0; P.lying = 0; P.crX = 0; P.crY = 0; P.crR = 0; P.dq = 0; P.ddir = 0; P.flip = 0; P.mx = 0;
    const idle = () => {                                          // 漂浮环视：瞳孔乱瞟、小眼跟着转、慢眨一次、触须卷起又放开
      P.by = fl(TT * 2.5) & 1; P.tph = fl(TT * 10 / 3) & 7; P.sway = SWAY_IDLE[fl(TT * 5 / 3) & 3];
      const lp = tq % DUR[IDLE];
      for (const [s, x, y] of LOOK) if (lp >= s) { P.ix = x; P.iy = y; }
      for (const [s, l] of BLINK) if (lp >= s) P.lid = l;
      P.tmode = lp >= 0.8 && lp < 0.95 ? 1 : lp >= 0.95 && lp < 1.25 ? 2 : lp >= 1.25 && lp < 1.4 ? 1 : 0;
      if (lp >= 0.3 && lp < 0.45) P.glint = 1;
      if (lp >= 2.25) P.cg = 1;
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                     // 飘浮：不落地，上下 2 格，触须和袍摆向后拖
      const f = gait(tq);
      P.by = FLOAT_BY[f]; P.tmode = 3; P.tph = f * 2; P.sway = -2 + (f & 1); P.ix = 4; P.iy = f === 2 ? -1 : 0;
      const half = DUR[MOVE] / 2; if (tq < half) P.mx = Math.round(WALK_DIST * tq / half); else { P.flip = 1; P.mx = Math.round(WALK_DIST * (1 - (tq - half) / half)); }
    }
    else if (st === ATTACK) {                                   // 后仰眯眼 → 瞳孔收缩 1 帧 → 前顶放光束 → 收回
      if (tq < T_FLICK) { P.bx = -1; P.by = -1; P.lid = 1; P.pw = tq < 1 / 12 ? 1 : 0; P.gem = 1; P.iy = 1; P.tmode = tq < 1 / 12 ? 1 : 2; P.sway = 1; P.tph = 1; }
      else if (tq < T_FLICK + 1 / 12) { P.bx = 1; P.lid = 0; P.pw = 0; P.gem = 3; P.rim = 2; P.iy = 1; P.tmode = 3; P.sway = -1; P.tph = 2; }
      else if (tq < 0.45) { P.gem = 1; P.pw = 0; P.iy = 1; P.tph = 3 + fl((tq - 0.25) * 12); P.sway = -1; }
      else { P.tph = fl(tq * 12) & 7; P.by = tq < 0.6 ? 0 : 1; }
    } else if (st === CHARGE) {                                 // 盛宴蓄力：魂丝吸向瞳孔，触须伸出去卷，瞳孔放大，血丝变红
      const q = easeInOut(clamp01(tq / 0.7));
      P.by = -Math.round(q); P.bx = -Math.round(q); P.ix = 3; P.iy = 1;
      P.pw = tq < 0.35 ? 1 : tq < 0.8 ? 2 : 3; P.vein = tq < 0.45 ? 0 : tq < 0.95 ? 1 : 2;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.tmode = tq < 0.25 ? 0 : 6; P.tph = f12 & 7;
      P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.cg = tq > 1.0 && (f12 & 1) ? 1 : 0;
    } else if (st === CAST) {                                   // 吞下：眼睑猛闭 1 帧、膨胀 1 格 → 睁眼、瞳孔收成细缝、连射三道
      P.by = -1; P.vein = 2; P.rim = 3; P.gem = 3; P.ix = 3; P.iy = 1; P.tph = f12 & 7;
      if (tq < 1 / 12) { P.lid = 4; P.swell = 1; P.pw = 3; P.tmode = 2; }
      else { P.pw = 0; P.swell = tq < 0.3 ? 1 : 0; P.cg = tq < 0.25 ? 2 : 1; P.tmode = tq < 0.25 ? 7 : 0; }
      for (const b of B_T) if (tq >= b && tq < b + 1 / 12) P.bx = -1;   // 每道光束的后坐
    } else if (st === RECOVER) {                                // 瞳孔回圆，血丝慢慢褪色
      const q = easeInOut(clamp01(tq / 0.6));
      P.by = -1 + Math.round(q); P.pw = q < 0.4 ? 0 : 1; P.vein = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
      P.ix = 3 + Math.round(q); P.iy = q < 0.5 ? 1 : 0; P.tph = f12 & 7; P.cg = q < 0.3 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { P.bx = -2; P.lid = 3; P.ix = 2; P.iy = -1; P.pw = 0; P.tmode = 8; P.tph = 2; P.sway = 2; P.cj = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { P.bx = -1; P.lid = 2; P.ix = 3; P.pw = 0; P.tmode = 8; P.tph = 5; P.sway = 1; P.rim = 0; }
      else { P.lid = 1; P.tph = 6; }
    } else if (st === DEATH) {                                  // 坠落爆裂：抽搐 → 瞳孔上翻 → 坠地 → 回弹 → 破裂 → 王冠滚落 → 静止 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.17) { P.bx = -2; P.lid = 3; P.pw = 0; P.flash = d < 1 / 12 ? 1 : 0; P.tmode = 4; P.tph = fl(d * 12) & 7; P.sway = 2; P.cj = 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.3) { P.bx = -2; P.by = 1; P.ix = 2; P.iy = -7; P.tmode = 4; P.tph = fl(d * 12) & 7; P.sway = 1; P.gem = (f12 & 1) ? 1 : 4; }   // 瞳孔上翻：上睑下只露出虹膜下沿
      else if (d < 0.46) { P.bx = -2; P.by = d < 0.38 ? 3 : 8; P.ix = 2; P.iy = -7; P.tmode = 2; P.sway = -2; P.gem = 4; }
      else if (d < 0.86) {
        P.bx = -2; P.ix = 2; P.iy = -7; P.tmode = 5; P.gem = 4; P.sway = 1;
        for (const [s, b, q] of DEATH_BOUNCE) if (d >= s) { P.by = b; P.sq = q; }
      } else {
        P.lying = 1; P.bx = -2; P.gem = d < 1.2 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        const q = clamp01((d - 0.86) / 0.36); P.crX = Math.round(-6 - 20 * q); P.crY = Math.round(21 * (1 - q) + 10 * Math.sin(Math.PI * q));
        P.crR = q < 0.25 ? 0 : q < 0.5 ? 3 : q < 0.72 ? 2 : q < 0.9 ? 1 : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.by = 0; P.ddir = 1; P.lid = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    if (P.lying) { P.gx = 7 + P.bx; P.gy = -4; }
    else { P.gx = 1 + P.ix + P.bx; P.gy = -25 + P.iy + P.by; }
    // 缓存键：任何一个取整后的参数变了才重画
    let k = P.bx + 16; k = k * 32 + P.by + 8; k = k * 9 + P.ix + 4; k = k * 12 + P.iy + 7; k = k * 4 + P.pw; k = k * 5 + P.lid; k = k * 3 + P.vein; k = k * 5 + P.gem; k = k * 4 + P.rim; P.k1 = k;
    k = P.tph; k = k * 9 + P.tmode; k = k * 5 + P.sway + 2; k = k * 2 + P.swell; k = k * 3 + P.cg; k = k * 2 + P.flash; k = k * 3 + P.sq; k = k * 2 + P.cj; k = k * 2 + P.glint; k = k * 2 + P.lying;
    k = k * 64 + P.crX + 40; k = k * 32 + P.crY; k = k * 5 + P.crR; k = k * 128 + Math.round(P.dq * 48) + P.ddir * 64; P.k2 = k;
  }

  // ───── 形状表 ─────
  const TENTS = [[-6, 9, 0.0, -1], [3, 10, 2.4, 1], [-3, 11, 1.2, -1], [1, 12, 3.6, 1], [6, 10, 4.8, 1]];   // 触须 [根 x, 长, 相位, 卷曲方向]；前两条在后
  const SMALL_EYES = [[-8, -6, 2], [-10, -1, 2], [-9, 5, 3]];                                            // 眼睑褶里的 3 只小眼 [x, y, 宽]（相对眼球中心）
  const VEINS0 = [[-8, -1], [-7, -1], [-6, -2], [-5, -2], [-4, -3], [-6, -5], [-5, -5], [-4, -4], [-7, 3], [-6, 3], [-5, 4], [-4, 4], [-1, 6], [-1, 5], [0, 4], [5, -5], [4, -4], [6, 5], [5, 5]];
  const VEINS1 = [[-3, -5], [-2, -5], [-8, 1], [-7, 2], [-6, 1], [2, 6], [3, 6], [3, 5], [-4, 6], [-3, 5], [-7, -3], [-7, -4], [6, -4], [7, -3], [-5, 0], [-4, 1]];
  const FOLDS = [[-10, -4, 2], [-10, 2, 2], [-4, 10, 7]];                                                 // 肉褶痕 [x, y, 长]
  const HEM_JAG = [0, 2, 3, 1, 0, 2, 1, 3, 0, 1], ROBE_HOLES = [[-15, -14], [-16, -13], [13, -14]];
  function robeHem(x) { return -17 + Math.round(6 * clamp01((Math.abs(x + 1) - 3) / 14)); }   // 下摆弧线：中间藏在眼球后，两角最低
  const IRIS_LV = [
    [M_IRIS, 2, M_IRIS, 3, M_IRIS, 3],   // 0 待机：外圈橄榄、内圈酸黄绿
    [M_IRIS, 2, M_IRIS, 3, M_IRIS, 4],   // 1 蓄力 1
    [M_IRIS, 3, M_IRIS, 4, M_IRIS, 4],   // 2 蓄力 2
    [M_IRIS, 3, M_IRIS, 4, M_GLOW, 3],   // 3 施放：白芯
    [M_IRIS, 1, M_IRIS, 2, M_IRIS, 2],   // 4 熄灭
  ];
  const PUPIL = [
    [[0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3]],                                                                    // 0 细缝
    [[0, -3], [0, -2], [-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [0, 2], [0, 3]],               // 1 竖缝（梭形）
    [[0, -3], [-1, -2], [0, -2], [1, -2], [-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [-1, 2], [0, 2], [1, 2], [0, 3]],   // 2 放大
    [],                                                                                                                              // 3 圆（下面生成）
  ];
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 6.6) PUPIL[3].push([x, y]);
  const CROWN_TEETH = [[0, 4], [3, 2], [6, 5], [9, 2], [12, 4]];   // [左列 u, 高]：每齿 2 格宽、尖 1 格；高矮相间，齿缝才透得出天空
  function inScl(x, y, cx, cy) { const u = (x - cx - 1) / 8.5, v = (y - cy) / 8; return u * u + v * v <= 1; }
  // 王冠：(X, Y) = 冠圈左下角；rot 整 90° 旋转次数；tilt 歪戴的斜度；gy 地面（不画进地下）
  function crownAt(X, Y, rot, tilt, gy) {
    const put2 = (u, v, m, t) => { let a = u, b = v + Math.round(-u * tilt); for (let r = 0; r < rot; r++) { const na = -b; b = a; a = na; } if (Y + b <= gy) sp(X + a, Y + b, m, t); };
    for (let u = 0; u <= 13; u++) for (let v = 0; v >= -2; v--) put2(u, v, M_CROWN, 0);   // 冠圈 3 行
    for (const [u, h] of CROWN_TEETH) for (let k = 1; k <= h; k++) { put2(u, -2 - k, M_CROWN, 0); if (k < h) put2(u + 1, -2 - k, M_CROWN, 0); }
    put2(3, -1, M_VEIN, 4); put2(10, -1, M_VEIN, 4); put2(6, -1, M_IRIS, 3); put2(7, -1, M_IRIS, 3);   // 红宝石 ×2 + 中间一颗酸绿石
    if (P.cg === 2) { for (const [u, h] of CROWN_TEETH) put2(u, -2 - h, M_GLOW, 3); } else if (P.cg === 1) put2(6, -7, M_SPEC, 3);
  }
  // 触须：从根部一格一格往下长；th = 与竖直向下的夹角（正 = 向前）；碰到地面就横着铺开
  function tent(x0, y0, L, ph, cd, gy, fwd) {
    const md = P.tmode, tp = P.tph * Math.PI / 4;
    let x = x0, y = y0, th = 0, amp = 0.16, bend = 0, curl = 0.42, len = L;
    if (md === 1) { curl = 0.8; len = L - 2; }                                             // 半卷
    else if (md === 2) { curl = 1.1; len = L - 3; bend = cd * 0.05; }                      // 全卷
    else if (md === 3) { bend = -0.07; amp = 0.1; th = -0.15; }                            // 后拖（移动）
    else if (md === 4) { amp = 0; th = (((P.tph + fwd) & 1) ? 0.4 : -0.4) * cd; bend = -th * 0.1; curl = 0.25; }   // 抽搐
    else if (md === 5) { amp = 0.04; th = cd * 0.5; curl = 0.5; }                          // 瘫地
    else if (md === 6) { if (fwd) { th = 0.55 + fwd * 0.22; bend = -0.03; amp = 0.07; len = L + 2; curl = -0.9; } else curl = 0.7; }   // 伸出去卷魂丝
    else if (md === 7) { th = cd * 0.55; bend = cd * 0.03; curl = 0.6; }                   // 施放：张开
    else if (md === 8) { th = 0.35; bend = 0.05; amp = 0.05; curl = 0.2; }                 // 受击：惯性甩向前
    for (let k = 0; k <= len; k++) {
      const thick = k < len * 0.45, X = Math.round(x), Y = Math.round(y);
      sp(X, Y, M_TENT, thick && k % 3 === 2 ? 4 : 0);
      if (thick) { if (Math.abs(Math.sin(th)) > 0.7) { if (Y + 1 <= gy) sp(X, Y + 1, M_TENT, 0); } else sp(X + 1, Y, M_TENT, 0); }
      th += bend + amp * Math.sin(tp + ph - k * 0.5) + (k > len - 4 ? cd * curl * 0.5 : 0);
      x += Math.sin(th); y += Math.cos(th);
      if (y > gy) { y = gy; th = md === 5 ? cd * 1.5 : th >= 0 ? 1.5 : -1.5; }
    }
  }
  // 站姿（悬浮）骨架：部件从后往前
  function drawStanding() {
    const R0 = 11.5 + P.swell, cx = 0, cy = -25 + P.sq, rx = R0 + P.sq, ry = R0 - P.sq, gy = -P.by;
    part();                                                     // 王袍披风：从王冠两端垂下，绕到眼球后面；下摆两角垂得最低、比身体宽，中间收到眼球后面，让触须露出来
    const yT = -34, yB = -12;
    for (let y = yT; y <= -8 && y <= gy; y++) {
      const t = clamp01((y - yT) / (yB - yT)), s = P.sway * t * t, os = Math.round(s), L = Math.round(-9 - 10 * Math.sqrt(t) + s), R = Math.round(7 + 8 * Math.sqrt(t) + s);
      for (let x = L; x <= R; x++) {
        const hb = robeHem(x - os); if (y > hb + HEM_JAG[(x - os + 30) % 10]) continue;
        if (y === hb - 1 && ((x - os + 30) % 7) !== 0) sp(x, y, M_CROWN, (x & 1) ? 3 : 2);   // 残缺的金边（沿下摆弧线）
        else sp(x, y, M_ROBE, (x === L + 2 && t > 0.3) || ((x === L + 6 || x === R - 2) && t > 0.62) ? 2 : 0);   // 三道褶
      }
    }
    for (const [hx, hy] of ROBE_HOLES) sp(hx + Math.round(P.sway * 0.8), hy, 0, 0);   // 破洞
    for (let i = 0; i < 5; i++) {                               // 触须：后两条先画
      part(); const [tx, L, ph, cd] = TENTS[i], y0 = cy + fl(Math.sqrt(Math.max(0, ry * ry - tx * tx))) - 2;
      tent(tx, y0, L, ph, cd, gy, i >= 2 ? i - 1 : 0);
    }
    part();                                                     // 肉球：厚重的眼睑褶，褶痕 + 轮廓缺口；闭眼时小眼也闭成一条缝
    for (let y = fl(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) for (let x = fl(-rx) - 1; x <= Math.ceil(rx) + 1; x++) { const u = x / rx, v = (y - cy) / ry; if (u * u + v * v <= 1.02) sp(x, y, M_FLESH, 0); }
    for (const [fx, fy, flen] of FOLDS) { for (let k = 0; k < flen; k++) sp(fx + k, cy + fy, M_FLESH, 2); sp(fx, cy + fy - 1, M_FLESH, 4); }
    sp(-12, cy - 4, 0, 0); sp(-12, cy + 2, 0, 0); sp(-6, cy - 10, M_FLESH, 4); sp(-5, cy - 10, M_FLESH, 4);
    if (P.lid >= 3) for (const [ex, ey, w] of SMALL_EYES) for (let i = 0; i < w; i++) sp(cx + ex + i, cy + ey + 1, M_FLESH, 1);
    part();                                                     // 眼白：暗面抖动、血丝、湿高光
    for (let y = cy - 8; y <= cy + 8; y++) for (let x = cx - 8; x <= cx + 10; x++) {
      if (!inScl(x, y, cx, cy)) continue; const u = (x - cx - 1) / 8.5, v = (y - cy) / 8;
      sp(x, y, M_SCL, u * 0.6 + v * 0.8 > 0.62 && ((x + y) & 1) ? 2 : 0);
    }
    for (let i = 0; i < VEINS0.length; i++) sp(cx + 1 + VEINS0[i][0], cy + VEINS0[i][1], M_VEIN, P.vein === 2 || (P.vein === 1 && (i & 1) === 0) ? 4 : 3);
    if (P.vein) for (const [vx, vy] of VEINS1) sp(cx + 1 + vx, cy + vy, M_VEIN, P.vein === 2 ? 4 : 3);
    sp(cx - 4, cy - 4, M_SPEC, 3); sp(cx - 3, cy - 4, M_SPEC, 3); sp(cx - 4, cy - 3, M_SPEC, 3);
    part();                                                     // 虹膜 + 竖缝瞳孔（发光体，限制在眼白里）
    const icx = cx + 1 + P.ix, icy = cy + P.iy, lv = IRIS_LV[P.gem];
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.hypot(x, y); if (d > 4.4 || !inScl(icx + x, icy + y, cx, cy)) continue; const r = d > 3.3 ? 0 : d > 2 ? 2 : 4; sp(icx + x, icy + y, lv[r], lv[r + 1]); }
    for (const [dx, dy] of PUPIL[P.pw]) if (inScl(icx + dx, icy + dy, cx, cy)) sp(icx + dx, icy + dy, M_INK, 1);
    if (P.gem < 4 && inScl(icx - 2, icy - 2, cx, cy)) sp(icx - 2, icy - 2, P.glint ? M_GLOW : M_IRIS, P.glint ? 3 : 4);
    part();                                                     // 眼睑：上睑厚褶 3 行（眨眼时往下盖）、下睑 2 行；闭眼时一道睫线
    const lt = P.lid / 4;
    for (let y = cy - 9; y <= cy + 9; y++) for (let x = cx - 9; x <= cx + 11; x++) {
      const u = (x - cx - 1) / 9.5, v = (y - cy) / 9; if (u * u + v * v > 1) continue;
      const bu = x / rx, bv = (y - cy) / ry; if (bu * bu + bv * bv > 1.02) continue;
      const uu = Math.min(1, Math.abs(x - cx - 1) / 8.5), cur = 1 - uu * uu, top = cy - 7 + cur * 0.9 + lt * 16, bot = cy + 7.6 - cur * 0.5;
      if (P.lid >= 4 || y < top || y > bot) sp(x, y, M_LID, 0);
    }
    if (P.lid >= 4) for (let x = cx - 6; x <= cx + 8; x++) sp(x, cy + 2 + (Math.abs(x - cx - 1) < 5 ? 1 : 0), M_LID, 1);
    if (P.lid < 3) for (const [ex, ey, w] of SMALL_EYES) {      // 3 只小眼：跟着大眼转
      part(); const X = cx + ex, Y = cy + ey;
      for (let i = 0; i < w; i++) { sp(X + i, Y, M_SMALL, i === 0 ? 4 : 3); sp(X + i, Y + 1, M_SMALL, i === w - 1 ? 2 : 3); }
      if (P.iy > -5) sp(X + Math.max(0, Math.min(w - 1, Math.round((w - 1) / 2 + P.ix / 3))), Y + (P.iy >= 2 ? 1 : 0), M_INK, 1);
    }
    part();                                                     // 王冠：往后歪戴，受击时跳起 1 格
    crownAt(cx - 7 + P.cj, cy - 9 - P.cj, 0, 0.18, 99);
  }
  // 最终姿：眼球破裂后的皮囊——撕开的破口、耷拉的眼白、熄灭的扁虹膜、瘫在地上的触须、塌下的王袍、酸液水洼；王冠滚到一边
  const TEAR = [0, 1, 2, 1, 3, 2, 0, 1, 2, 3, 1, 0, 2];
  const SPLAY = [[-10, -1, 8], [-6, -1, 6], [3, 1, 6], [7, 1, 9], [11, 1, 6]];
  function drawLying() {
    part(); for (let x = -21; x <= 19; x++) { const e = Math.abs(x + 1) / 20; sp(x, 0, M_ACID, e < 0.45 ? 3 : 2); if (e < 0.3 && (x & 1)) sp(x, -1, M_ACID, 2); }   // 溅开的酸液水洼
    part();                                                     // 塌下来的王袍 + 残缺金边
    for (let x = -19; x <= 8; x++) { const u = (x + 5) / 14.5, h = Math.round(5.5 * Math.sqrt(Math.max(0, 1 - u * u))) + (HEM_JAG[(x + 30) % 10] & 1); for (let y = -h; y <= -1; y++) sp(x, y, M_ROBE, 0); }
    for (let x = -17; x <= 6; x++) if (((x + 30) % 6) !== 0) sp(x, -2, M_CROWN, (x & 1) ? 3 : 2);
    sp(-15, -4, M_ROBE, 2); sp(-15, -3, M_ROBE, 2); sp(-11, -5, M_ROBE, 2); sp(-11, -4, M_ROBE, 2);
    for (const [x0, d, len] of SPLAY) { part(); for (let k = 0; k <= len; k++) { const x = x0 + d * k, y = k >= len - 1 ? -1 - (k - len + 2) : -1; sp(x, y, M_TENT, k % 3 === 2 && k < len * 0.5 ? 4 : 0); if (k < len * 0.5) sp(x, y + 1, M_TENT, 0); } }
    part();                                                     // 瘪下去的肉球：顶上撕开，露出暗色内壁；小眼全闭
    for (let y = -10; y <= 0; y++) for (let x = -14; x <= 13; x++) { const u = (x + 0.5) / 13.5, v = (y + 4.5) / 5.5; if (u * u + v * v <= 1.02) sp(x, y, M_FLESH, 0); }
    for (let x = -1; x <= 11; x++) { const tr = TEAR[(x + 1) % TEAR.length]; for (let y = -11; y <= -9 + tr; y++) sp(x, y, 0, 0); sp(x, -8 + tr, M_FLESH, 1); }
    for (const [x, y] of [[-10, -6], [-9, -6], [-12, -3], [-11, -3], [-7, -2], [-6, -2]]) sp(x, y, M_FLESH, 1);
    part();                                                     // 耷拉出来的眼白碎片，血丝褪成暗红
    for (let y = -6; y <= -1; y++) for (let x = 1; x <= 13; x++) { const u = (x - 7) / 6.5, v = (y + 3.5) / 2.6; if (u * u + v * v <= 1 && !(y === -6 && ((x + 1) % 3) === 0)) sp(x, y, M_SCL, 0); }
    for (const [x, y, t] of [[2, -4, 2], [3, -4, 3], [4, -3, 3], [11, -3, 2], [10, -2, 3], [9, -5, 2]]) sp(x, y, M_VEIN, t);
    part();                                                     // 熄灭的扁虹膜 + 瞳孔缝
    const lv = IRIS_LV[P.gem];
    for (let y = -5; y <= -2; y++) for (let x = 5; x <= 10; x++) { const u = (x - 7.5) / 2.8, v = (y + 3.5) / 1.7, d = u * u + v * v; if (d <= 1) sp(x, y, d > 0.5 ? lv[0] : lv[2], d > 0.5 ? lv[1] : lv[3]); }
    sp(7, -4, M_INK, 1); sp(7, -3, M_INK, 1); sp(8, -4, M_INK, 1);
    part(); crownAt(P.crX, -P.crY, P.crR === 4 ? 0 : P.crR, P.crR === 4 ? 0.34 : 0.18, 0);   // 翻滚落地的王冠，最后斜靠在袍堆上
  }
  function drawHero() { begin(hero, P.bx, P.lying ? 0 : P.by); if (P.lying) drawLying(); else drawStanding(); }
  function bakeHero() {
    // 发光体在眼球内部：轮廓光的光源放在瞳孔前方 7 格（邪眼光照亮眼球朝前的一侧）
    HERO_RIM.rim = P.rim; HERO_RIM.rx = P.gx + 7 + hero.ox; HERO_RIM.ry = P.gy + hero.oy; HERO_RIM.flash = P.flash; HERO_RIM.dq = P.dq;
    bake(hero, HERO_RIM);
  }

  // ───── 特效 ─────
  // 酸绿溅液：重力大（170）、只有横向阻力、落到地面线就贴住。引擎粒子池没有这种粒子（自定义重力 + 贴地），先在模块里单独管理，画在角色前面；
  // 引擎支持后改回 spawn。
  const SN = 64, slX = new Float32Array(SN), slY = new Float32Array(SN), slVX = new Float32Array(SN), slVY = new Float32Array(SN), slAge = new Float32Array(SN), slLife = new Float32Array(SN), slOn = new Uint8Array(SN);
  let slHead = 0;
  function splat(x, y, vx, vy, life) {
    let i = slHead; for (let n = 0; n < SN; n++) { const j = (slHead + n) % SN; if (!slOn[j]) { i = j; break; } }
    slHead = (i + 1) % SN; slOn[i] = 1; slX[i] = x; slY[i] = y; slVX[i] = vx; slVY[i] = vy; slAge[i] = 0; slLife[i] = life;
  }
  const DRAG = Math.exp(-3.4 * DT);
  function stepSplats(dt) {
    for (let i = 0; i < SN; i++) {
      if (!slOn[i]) continue; slAge[i] += dt; if (slAge[i] >= slLife[i]) { slOn[i] = 0; continue; }
      slVX[i] *= DRAG; slVY[i] += 170 * dt; if (slY[i] >= HY && slVY[i] > 0) { slY[i] = HY; slVY[i] = 0; slVX[i] *= 0.2; }
      slX[i] += slVX[i] * dt; slY[i] += slVY[i] * dt;
    }
  }
  function drawSplats() { for (let i = 0; i < SN; i++) if (slOn[i]) { const q = slAge[i] / slLife[i]; put(Math.round(slX[i]), Math.round(slY[i]), EL[q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4]); } }
  // 魂丝到达瞳孔后 1/3 转成绕瞳孔环绕（半径 6–7）：引擎的定点螺旋到点就消失，这里按到达时刻补一颗环绕粒子
  const QN = 96, qnT = new Int16Array(QN), qnA = new Float32Array(QN), qnR = new Uint8Array(QN);
  let thrN = 0;
  function queueOrbit(r, v, a, w) {                              // 螺旋在第 m 次引擎步到达（半径 ≤ 3.5）并消失，同一步补上环绕粒子，角度接着螺旋的角度走
    const m = Math.max(1, Math.ceil((r - 3.5) / (v * DT) - 1e-9)), an = a + w * DT * m - 8.5 * DT, rr = 6 + (thrN & 1);
    if (m === 1) { spawn(K_ORBIT, 0, 0, 0, 0, 9, R_EL, an, rr); return; }
    let i = 0; for (; i < QN && qnT[i] > 0; i++); if (i === QN) return;
    qnT[i] = m - 1; qnA[i] = an; qnR[i] = rr;
  }
  function stepOrbitQueue(state) { for (let i = 0; i < QN; i++) if (qnT[i] > 0 && --qnT[i] === 0 && state === CHARGE) spawn(K_ORBIT, 0, 0, 0, 0, 9, R_EL, qnA[i], qnR[i]); }
  // 凝视光束（最多 3 道同时存在）：w 0 = 攻击 1 格宽，1 = 技能 3 格宽，2 = 技能第 3 道 4 格宽 + 外沿
  const BN = 3, bmT = new Float32Array(BN).fill(9), bmX0 = new Int16Array(BN), bmY0 = new Int16Array(BN), bmX1 = new Int16Array(BN), bmY1 = new Int16Array(BN), bmW = new Uint8Array(BN);
  function beam(x0, y0, x1, y1, w) { let o = 0; for (let k = 1; k < BN; k++) if (bmT[k] > bmT[o]) o = k; bmT[o] = 0; bmX0[o] = Math.round(x0); bmY0[o] = Math.round(y0); bmX1[o] = Math.round(x1); bmY1[o] = Math.round(y1); bmW[o] = w; }
  let mzT = 9, mzX = 0, mzY = 0, wardHitT = 9, thrAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0;
  const THR = [[79, 77], [90, 75], [106, 77], [117, 74]];        // 四缕魂丝的源头：假人附近倒下的“死者”
  const PLUS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];      // + 字回血粒子（5 颗同速上升；只有纵向阻力 = 引擎的 K_TRAIL）
  const WRX = 19, WRY = 22, WN = 64;                              // 首领护壁：椭圆半径、点位数（每 2 格一点）
  const eyeX = () => scrX(P.bx), eyeY = () => HY - 25 + P.by, pupX = () => scrX(P.gx), pupY = () => HY + P.gy;
  function onEnter(s) {
    if (s === CHARGE) { thrAcc = 0; for (const [x, y] of THR) for (let i = 0; i < 6; i++) spawn(K_RISE, x + Math.random() * 3 - 1, y - Math.random() * 3, (Math.random() - 0.5) * 6, -8 - Math.random() * 12, 0.35 + Math.random() * 0.35, R_EL); }
    else if (s === CAST) {
      releaseOrbit(0, 0, 0, 0); qnT.fill(0);                     // 魂丝被一口吞下：环绕粒子当场消失
      const ex = eyeX(), ey = eyeY();
      burst(ex, ey, 30, 60, 130, 0.3, 0.7, R_EL, 6); ring(ex, ey, 1, R_EL);
      for (let c = 0; c < 6; c++) { const x = ex - 16 + c * 6 + Math.round(Math.random() * 2), y = ey + 6 - (c & 1) * 9 - Math.round(Math.random() * 4), vy = -18 - Math.random() * 10, life = 0.6 + Math.random() * 0.3; for (const [dx, dy] of PLUS) spawn(K_TRAIL, x + dx, y + dy, 0, vy, life, R_EL); }
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) {                        // 出手帧：瞳孔口光 + 凝视光束 + 命中
      const x0 = pupX(), y0 = pupY(), tx = DUMMY_X - 4, ty = HY - 15;
      beam(x0, y0, tx, ty, 0); mzT = 0; mzX = x0; mzY = y0; burst(tx, ty, 10, 40, 90, 0.15, 0.35, R_EL, 10); hitDummy(0);
      sfx('swing', { kind: 'staff', w: 0.6 }); sfx('shoot', { proj: 'orb' }); sfx('hit', { mat: 'magic', w: 0.5 });   // 凝视光束瞬间到达：发射与命中同一帧
    }
    if (s === CAST) for (let b = 0; b < 3; b++) if (t === B_T[b]) {   // 三连射：一发比一发快，第 3 道最大
      const x0 = pupX(), y0 = pupY(), tx = DUMMY_X - 4, ty = HY - B_Y[b];
      beam(x0, y0, tx, ty, b === 2 ? 2 : 1); mzT = 0; mzX = x0; mzY = y0;
      sfx('shoot', { proj: 'orb' }); sfx('impact', { pal: 'poison', w: b === 2 ? 0.9 : 0.5 + b * 0.1 });   // 每道光束命中一次 impact
      if (b < 2) { burst(tx, ty, 14 + b * 6, 50, 110, 0.2, 0.45, R_EL, 12); hitDummy(0); }
      else { burst(tx, ty, 36, 60, 150, 0.3, 0.7, R_EL, 16); ring(tx, ty, 1, R_EL); hitDummy(1); shake(0.12, 1); }
    }
    if ((s === HURT || s === DEATH) && t === INCOMING) {         // 引擎已放 impact 火花 + 震屏（死亡加闪白）；这里是护壁
      if (s === HURT) wardHitT = 0;
      else { const ex = eyeX(), ey = eyeY(); for (let i = 0; i < WN; i += 2) { const a = i / WN * 6.2832; spawn(K_BURST, ex + Math.cos(a) * WRX, ey + Math.sin(a) * WRY, Math.cos(a) * (15 + Math.random() * 25), Math.sin(a) * 18 - 8, 0.3 + Math.random() * 0.35, R_GOLD); } }   // 护壁碎裂
    }
    if (s === DEATH && t === INCOMING + 0.46) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 16 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, R_DUST); shake(0.1, 1); sfx('fall', { w: 0.9 }); }   // 坠地
    if (s === DEATH && t === INCOMING + 0.78) { for (let i = 0; i < 8; i++) spawn(K_DUST, HX - 14 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.3 + Math.random() * 0.3, R_DUST); sfx('fall', { w: 0.5 }); }   // 回弹后再落地
    if (s === DEATH && t === INCOMING + 0.86) {                 // 眼球破裂：酸绿溅液（重力大，落地贴住）
      const ex = HX - 2 + 3; for (let i = 0; i < 40; i++) { const a = -Math.PI * (0.06 + 0.88 * Math.random()), v = 45 + Math.random() * 95; splat(ex + (Math.random() - 0.5) * 10, HY - 6 - Math.random() * 4, Math.cos(a) * v, Math.sin(a) * v, 0.7 + Math.random() * 0.6); }
      shake(0.12, 1);
    }
  }
  const EVENTS = [[], [], [T_FLICK], [], B_T, [], [INCOMING], [INCOMING, INCOMING + 0.46, INCOMING + 0.78, INCOMING + 0.86], []];
  function stepFX(dt, state, stT) {
    const gx = pupX(), gy = pupY();
    stepOrbitQueue(state);
    if (state === CHARGE && stT >= 0.15 && stT < 0.8) {        // 四缕魂丝：从死者处螺旋定点吸向瞳孔（两两反向旋）
      thrAcc += dt * 40; while (thrAcc >= 1) { thrAcc -= 1; for (let j = 0; j < 4; j++) { const x0 = THR[j][0] + Math.round(Math.random() - 0.5), y0 = THR[j][1] - 1 - Math.round(Math.random()), dx = x0 - gx, dy = (y0 - gy) / 0.75, r = Math.hypot(dx, dy), v = r / (0.5 + j * 0.03), a = Math.atan2(dy, dx), w = (j & 1 ? 1 : -1) * 1.3; spawn(K_SPIRAL_PT, gx, gy, v, 0, 9, R_EL, a, r, w); if (++thrN % 3 === 0) queueOrbit(r, v, a, w); } }
    }
    if (state === MOVE && P.tph !== lastStep) { for (let i = 0; i < 2; i++) spawn(K_TRAIL, scrX(P.bx - 3 + Math.random() * 6), HY - 4 + P.by + Math.random() * 2, (P.flip ? 1 : -1) * (8 + Math.random() * 8), 3 + Math.random() * 4, 0.3 + Math.random() * 0.25, R_EL); lastStep = P.tph; }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 1.6 : 7); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + 3 + Math.round(Math.random() * 2), gy + Math.round(Math.random() * 2 - 1), 4 + Math.random() * 6, -6 - Math.random() * 7, 0.6 + Math.random() * 0.6, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 28, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }
    stepSplats(dt);
    mzT += dt; wardHitT += dt; for (let k = 0; k < BN; k++) bmT[k] += dt;
  }
  function fxReset() { bmT.fill(9); slOn.fill(0); qnT.fill(0); mzT = 9; wardHitT = 9; thrAcc = 0; thrN = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; }
  // 首领护壁：椭圆点阵（每 2 格一点），平时只亮一半、一颗亮点沿圈慢转；受击时被打中的右段变白 1 帧；施放时整圈亮；死亡时闪白后碎掉
  function drawWard(f12) {
    if (P.lying || P.dq > 0) return;
    const state = E.state, stT = E.stT; let mode = 0;
    if (state === DEATH && stT >= INCOMING) { if (stT >= INCOMING + 1 / 12) return; mode = 3; }
    if (state === REVIVE && stT < 0.85) return;
    if (state === CAST && stT < 0.25) mode = 2;
    const cx = eyeX(), cy = eyeY(), ph = f12 >> 1, hit = wardHitT < 1 / 12;
    for (let i = 0; i < WN; i++) {
      const a = i / WN * 6.2832, ca = Math.cos(a), x = Math.round(cx + ca * WRX), y = Math.round(cy + Math.sin(a) * WRY);
      let c = -1;
      if (mode === 3 || (hit && ca > 0.55)) c = 21;
      else if (mode === 2) c = (i & 1) ? C_GOLD : 14;
      else if (((i + ph) % 16) === 0) c = 14;
      else c = (i % 4) === 0 ? C_GOLD : 20;
      if (c >= 0 && y <= HY) put(x, y, c);
    }
  }
  function fxBack(f12) {        // 画在角色后面：悬浮投影、首领护壁、地面映光
    const cx = eyeX(), hw = P.lying ? 14 : 8 + (P.by >> 2);
    if (P.dq < 0.6) for (let x = cx - hw; x <= cx + hw; x++) { const d = Math.abs(x - cx); if (d < hw - 2 || (x & 1) === 0) put(x, FLOOR, 0); if (d < hw - 4 && (x & 1)) put(x, FLOOR + 1, 0); }
    drawWard(f12);
    if (P.rim >= 2 && !P.lying) { const gx = pupX(), span = P.rim === 3 ? 12 : 6; for (let x = gx - span; x <= gx + span; x++) { const d = Math.abs(x - gx); if (P.rim === 3 ? d < span : ((x + f12) & 1) === 0) put(x, FLOOR, P.rim === 3 && d < 5 ? EL[1] : d < span * 0.5 ? EL[2] : EL[3]); } }
    shotFloorGlow(f12);
  }
  // 凝视光束：第 1 帧亮（白芯），第 2 帧暗且断续
  function drawBeam(k, fr, f12) {
    let x = bmX0[k], y = bmY0[k]; const x1 = bmX1[k], y1 = bmY1[k], w = bmW[k];
    const dx = Math.abs(x1 - x), dy = -Math.abs(y1 - y), stx = x < x1 ? 1 : -1, sty = y < y1 ? 1 : -1; let e = dx + dy;
    for (let n = 0; n < 300; n++) {
      const gap = fr === 1 && ((n + f12) % 3) === 0;
      if (w === 0) { if (!gap) put(x, y, fr ? EL[2] : EL[0]); if (!fr && (n % 4) === 2) put(x, y + (((n >> 2) & 1) ? 1 : -1), EL[1]); }
      else if (w === 1) { if (!gap) put(x, y, fr ? EL[1] : EL[0]); if (!fr || (n & 1)) { put(x, y - 1, fr ? EL[2] : EL[1]); put(x, y + 1, fr ? EL[2] : EL[1]); } }
      else { if (!gap) { put(x, y, fr ? EL[1] : EL[0]); put(x, y + 1, fr ? EL[1] : EL[0]); } put(x, y - 1, fr ? EL[2] : EL[1]); put(x, y + 2, fr ? EL[2] : EL[1]); if (!fr && (n & 1)) { put(x, y - 2, EL[2]); put(x, y + 3, EL[2]); } }
      if (x === x1 && y === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x += stx; } if (e2 <= dx) { e += dx; y += sty; }
    }
    if (!fr) { put(x1 + 1, y1, EL[0]); put(x1, y1 - 1, EL[1]); put(x1, y1 + 1, EL[1]); put(x1 + 2, y1, EL[1]); }
  }
  function fxFront(f12) {       // 画在角色前面：凝视光束、瞳孔口光、施放时的竖直眼光、蓄力满时虹膜外沿闪点、酸绿溅液
    for (let k = 0; k < BN; k++) if (bmT[k] < 2 / 12) drawBeam(k, bmT[k] < 1 / 12 ? 0 : 1, f12);
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1], c2 = mzT < 1 / 12 ? EL[1] : EL[2]; put(mzX, mzY, EL[0]); for (let r = 1; r <= 2; r++) { const cc = r < 2 ? c : c2; put(mzX + r, mzY, cc); put(mzX, mzY - r, cc); put(mzX, mzY + r, cc); put(mzX - r, mzY, c2); } }
    if (E.state === CAST && E.stT >= 1 / 12 && E.stT < 0.25 && P.dq < 1) { const gx = pupX(), gy = pupY(); for (let r = 5; r <= 9; r++) { const c = r <= 6 ? EL[0] : r <= 8 ? EL[1] : EL[2]; put(gx, gy - r, c); put(gx, gy + r, c); } put(gx + 5, gy, EL[1]); put(gx + 6, gy, EL[2]); put(gx - 5, gy, EL[1]); put(gx - 6, gy, EL[2]); }
    if (P.gem === 2 && !P.lying) { const gx = pupX(), gy = pupY(), c = (f12 & 1) ? EL[1] : EL[2]; put(gx + 5, gy - 4, c); put(gx - 5, gy + 4, c); put(gx + 5, gy + 4, c); put(gx - 5, gy - 4, c); }
    drawSplats();
  }

  return {
    name: '邪眼王尼克松', HX, R_EL, DUR, hero, P, GLOW_MATS, HIT_POINT, EVENTS,
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
    SFX: { body: 'flesh', how: 'explode', pal: 'poison', style: 'beam', w: 0.85, hover: 1 },   // 腐肉巨眼、坠地爆裂、胆汁酸绿、凝视光束；悬浮不落脚
  };
});
