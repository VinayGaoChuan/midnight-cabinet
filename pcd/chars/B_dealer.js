// 庄家（最终首领，第 9 关「地下赌场」最里面的金库，混沌路线的最后一个首领）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「戴高礼帽的庄家，面具是一张牌」「庄家在最里面等你。一切从这里开始，也在这里结束」；金币堆；
// 金币雨（全场每人同样的固定伤害）、收筹码（偷走护盾和增益，变成它的护盾）→ 第二阶段 庄家通吃（点名战斗力前二，重击并偷走增益）。
// 设定卡 ——
//   剪影：从一座金币山里升起的上半身（原点 = 金币堆表面）。最高处是一顶又高又直的黑丝绒大礼帽（红帽带、金边、帽带上插两张牌、正中一枚金币徽章），
//         帽檐下面整张脸就是一张白色的黑桃 A 纸牌面具：金边、左上角红色的 A、额头一个小黑桃、画上去的斜眉、
//         一只眼洞里亮着金光（另一只是黑洞里一点红），下面一道画上去的红色小丑笑（识别点：高礼帽 + 白牌脸 + 一只金眼 + 红笑）。
//         肩后一件歌剧斗篷：外黑里红，高高立起的领子像两片尖尖的红牌把白脸框在中间，下摆张开成金字塔形。
//   身上：黑燕尾服、金色翻领、金流苏肩章、白衬衫配金扣、红色领巾和金别针、胸袋里插一张红心 A；白手套；
//         近手拄一根黑手杖，杖头是一颗金骰子（五点，中间一点是红的）；远手的掌心里一直有一枚金币，时不时弹起来再接住。
//   主色：黑、金、白、牌红。主体压暗，光源是：金眼、骰子杖头、帽子里聚起来的金光、脚下金币堆往上的金光；第二阶段笑口里也亮着金光。
//   招式（setMove）：coinRain 金币雨 · collect 收筹码 · takeAll 庄家通吃（第二阶段）· poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 常亮。
//     金币雨：远手把礼帽摘下来、倒过来高高举起，帽子里金光越聚越亮、手杖指天 → 一甩帽子，金币从帽子里喷泉一样喷上天（落下来由游戏画）。
//     收筹码：双臂张开、掌心朝上、斗篷全开，一圈金光从远处被吸过来 → 两手猛地收回胸前握拳，身上罩一层金色护盾。
//     庄家通吃：双手把手杖举过头顶、骰子杖头朝后、越来越亮地转 → 像法槌一样砸下去，金币浪从两边翻开。
//     重击：手杖横着收到腰后 → 骰子杖头往前一刺。普攻：手杖反手一抡。
//     升起：扒着金币山爬出来 → 挺直、双臂张开「欢迎光临」、斗篷全开。
//     第二阶段：远手按住面具一拧、两声心跳 → 张开双臂仰头大笑：面具的笑裂到两颊、两只眼洞都亮起金光、笑口里透出金光，
//                四个牌花（♠♥♦♣）绕着礼帽转，帽带发光（hot1 之后一直这样）。
//     死亡：双手抱住面具、面具裂开一道金缝 → 礼帽掉下来滚到一边、整个人瘫下去 → 化成金币沉回金币山。
PCD.define('B_dealer', (E) => {
  const { defDeep, defMat, ramp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING, DRAMP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, BR = DRAMP.brass, SINK = 24;   // 战斗里下沉 SINK 格（最高点 − SINK ≤ 70），比它低的部分藏在金币堆里

  // ───── 材质（暗 → 亮）：黑衣压到最暗，白牌脸、金和光才跳得出来 ─────
  // 色板有上限：燕尾服 / 斗篷用共用的 obsidian，礼帽 stormcoat（发蓝的黑丝绒），红用 hellhide，金用 brass，手杖 bladesteel；只有白牌（面具、手套、衬衫）是自己的一条
  const R_CARD = ['#0e0c12', '#24202a', '#3a3440', '#544e5a', '#6e6874', '#8a8490', '#a6a2ac', '#c2bec6', '#dad8de', '#eeedf0', '#ffffff'];
  const COAT = defDeep('obsidian', { depth: 8, dark: 3, amb: 0.05 }), COATD = defDeep('obsidian', { depth: 5, dark: 4, amb: 0.04 });
  const CAPE = defDeep('obsidian', { depth: 4, dark: 4, amb: 0.04 }), LINING = defDeep('hellhide', { depth: 6, dark: 2, amb: 0.1 });
  const HAT = defDeep('stormcoat', { depth: 5, dark: 4, amb: 0.03 });
  const RED = defDeep('hellhide', { depth: 3, amb: 0.34 }), GOLD = defDeep('brass', { depth: 4, amb: 0.24 }), GOLDD = defDeep('brass', { depth: 3, dark: 2, amb: 0.14 });
  const CARD = defDeep(R_CARD, { depth: 3, amb: 0.62 }), GLOVE = defDeep(R_CARD, { depth: 3, amb: 0.4 }), GLOVED = defDeep(R_CARD, { depth: 3, dark: 2, amb: 0.3 }), SHIRT = defDeep(R_CARD, { depth: 4, dark: 1, amb: 0.3 });
  const CANE = defDeep('bladesteel', { depth: 2, dark: 4, amb: 0.2 }), VOIDM = defDeep('obsidian', { depth: 2, dark: 5, amb: 0.02 });
  const G1 = defMat(ramp(['#3a2208', '#7c4e12', '#c48624', '#e0a838']), 1, 1), G2 = defMat(ramp(['#7c4e12', '#e0a838', '#f4cc60', '#fff0a0']), 1, 1), G3 = defMat(ramp(['#e0a838', '#f4cc60', '#fff0a0', '#ffffff']), 1, 1);
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { coinRain: { 3: 1.3, 4: 0.5, 5: 0.7 }, collect: { 3: 1.0, 4: 0.5, 5: 0.7 }, takeAll: { 3: 1.6, 4: 0.5, 5: 0.7 },
    poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'coinRain', HOT = 0;   // HOT：第二阶段，面具笑裂、两眼金光、牌花绕帽
  const GOLDL = [BR[8], BR[7], BR[5]], PILEL = [BR[6], BR[5], BR[3]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: GOLDL, k: 0.9 }, { x: 0, y: 0, r: 60, ramp: PILEL, k: 0.42 }, { x: 0, y: 0, r: 0, ramp: GOLDL, k: 0.95 }, { x: 0, y: 0, r: 0, ramp: GOLDL, k: 0.7 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.coin], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[G1] = RIM.skip[G2] = RIM.skip[G3] = RIM.skip[VOIDM] = 1;

  // 姿势：身体升降 / 前倾、转头、两只手、手杖角度（ca：从竖直向上顺时针）、斗篷张开（cape）、礼帽（hat 0 戴着 / 1 远手倒拿 / 2 掉了）、面具的笑（grin）
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'nx', 'ny', 'fx2', 'fy2', 'ca', 'cape', 'cw', 'hat', 'hta', 'ht', 'hx', 'hy', 'ha', 'grin', 'glow', 'eyes', 'orb', 'coin', 'cn', 'fist',
    'flash', 'dq', 'hot', 'drip', 'breath', 'crack', 'shield', 'suits'];
  const K = {
    idle: { nx: 30, ny: -28, fx2: -28, fy2: -30, lean: 0, hd: 0, ca: 0.42, cape: 0.3 },
    rainW: { nx: 34, ny: -40, fx2: -30, fy2: -64, lean: -0.12, hd: -0.2, ca: 0.35, cape: 0.7 },      // 金币雨：摘帽倒举，手杖指天
    rainB: { nx: 36, ny: -46, fx2: -36, fy2: -70, lean: -0.18, hd: -0.28, ca: 0.5, cape: 0.9 },
    rain: { nx: 30, ny: -54, fx2: -26, fy2: -80, lean: -0.06, hd: -0.32, ca: 0.2, cape: 1 },           // 一甩：帽口朝前上方
    collW: { nx: 50, ny: -42, fx2: -46, fy2: -42, lean: -0.1, hd: -0.14, ca: 1.2, cape: 1 },         // 收筹码：双臂张开、掌心朝上
    coll: { nx: 14, ny: -26, fx2: -6, fy2: -28, lean: 0.14, hd: 0.12, ca: 0.1, cape: 0.1 },          // 收回胸前握拳
    takeW: { nx: 34, ny: -56, fx2: 24, fy2: -54, lean: -0.16, hd: -0.14, ca: 0.1, cape: 0.8 },        // 通吃：手杖举过头顶
    takeW2: { nx: 30, ny: -64, fx2: 20, fy2: -62, lean: -0.28, hd: -0.24, ca: -0.55, cape: 0.9 },
    take: { nx: 44, ny: -32, fx2: 34, fy2: -33, lean: 0.36, hd: 0.28, ca: 2.0, cape: 0.4 },          // 像法槌一样砸下
    pokeW: { nx: 6, ny: -30, fx2: -26, fy2: -20, lean: -0.1, hd: 0.05, ca: 1.57, cape: 0.4 },       // 重击：手杖横收 → 往前刺
    poke: { nx: 56, ny: -28, fx2: -28, fy2: -18, lean: 0.3, hd: 0.14, ca: 1.57, cape: 0.5 },
    swipeW: { nx: -4, ny: -44, fx2: -26, fy2: -20, lean: -0.1, hd: -0.08, ca: -0.7, cape: 0.5 },     // 普攻：手杖反手一抡
    swipe: { nx: 50, ny: -26, fx2: -26, fy2: -20, lean: 0.24, hd: 0.1, ca: 2.0, cape: 0.4 },
    climbA: { nx: 36, ny: -30, fx2: -30, fy2: -24, lean: 0.3, hd: 0.28, ca: 0.6, cape: 0.2 },
    climbB: { nx: 32, ny: -24, fx2: -32, fy2: -30, lean: 0.3, hd: 0.28, ca: 0.4, cape: 0.2 },
    wide: { nx: 48, ny: -54, fx2: -46, fy2: -56, lean: -0.14, hd: -0.2, ca: 0.5, cape: 1 },
    hunch: { nx: 24, ny: -28, fx2: 4, fy2: -48, lean: 0.25, hd: 0.32, ca: 0.1, cape: 0.1 },          // 第二阶段：远手按住面具
    agony: { nx: 12, ny: -50, fx2: -4, fy2: -52, lean: -0.2, hd: -0.34, ca: 0.2, cape: 0.8 },
    limp: { nx: 26, ny: 4, fx2: -20, fy2: 4, lean: 0.45, hd: 0.5, ca: 1.2, cape: 0.2 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'ca', 'cape'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.grin = HOT ? 1 : 0; P.suits = HOT; P.mx = 0; P.flip = 0; }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.cw = [0, 1, 2, 1][Math.floor(tt / 0.3) % 4]; P.glow = 1 + ((f12 >> 2) & 1); P.drip = f12 % 6;
      P.eyes = (f12 % 7 === 0 || f12 % 11 === 0) ? 1 : 2; P.cn = 1;   // 金眼一闪一闪，掌心一枚金币
      const lp = tt % DUR[IDLE];
      if (lp >= 0.3 && lp < 0.6) P.ny -= lp < 0.45 ? 3 : 0;   // 手杖提起来，在金币上点一下
      if (lp >= 1.1 && lp < 2.0) { const u = (lp - 1.1) / 0.9; P.coin = Math.round(Math.sin(Math.PI * u) * 18); P.fy2 -= u < 0.15 ? 3 : 0; P.hd = -Math.round(Math.sin(Math.PI * u) * 3) / 30; P.eyes = 2; }   // 待机个性：拇指把金币弹上天、抬头看着它落回掌心
      if (lp >= 2.0 && lp < 2.2) { P.fist = 1; P.grin = Math.max(P.grin, 1); } };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.glow = 1; P.drip = f12 % 6; P.ht = 0.08; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.swipeW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.swipeW, K.swipeW); P.glow = 2; P.orb = 1; }
      else if (tq < 0.42) { pose(K.swipe, K.swipe); P.grin = 2; P.glow = 3; P.eyes = 2; }
      else pose(K.swipe, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.25; P.lean = -0.1; P.grin = 2; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; P.ht = 0.28; P.nx -= 4; P.cape = 0.6; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.25 * (1 - q); P.lean = -0.1 * (1 - q); P.ht = 0.28 * (1 - q); P.grin = q < 0.5 ? 1 : P.grin; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.grin = 3; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.crack = d < 0.35 ? 1 : 2; P.cw = f12 & 1 ? 2 : 0; }
      else if (d < 1.5) { const q = ease.in(clamp01((d - 0.7) / 0.6)); pose(K.agony, K.limp, q); P.grin = d < 1.0 ? 3 : 1; P.glow = d < 1.1 ? 3 : 2 - ((f12 >> 1) & 1); P.eyes = d < 1.2 ? 2 : 1; P.crack = 2;
        const u = clamp01((d - 0.7) / 0.6); P.hat = 2; P.hx = 3 - 36 * u; P.hy = -64 + 58 * u * u; P.ha = -1.7 * u; }   // 礼帽掉下来滚到一边
      else { pose(K.limp, K.limp); P.grin = 1; P.glow = d < 2 ? 1 : 0; P.eyes = 0; P.crack = 2; P.hat = 2; P.hx = -33; P.hy = -6; P.ha = -1.7; P.dq = d > 2.0 ? Math.round(clamp01((d - 2.0) / 0.55) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    if (P.hot && P.eyes < 2 && st !== DEATH && st !== HURT) P.eyes = 2;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { coinRain: 0, collect: 1, takeAll: 2, poke: 3, rise: 4, p2: 5 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D);
    if (MV === 'coinRain') {
      if (st === CHARGE) {
        if (q < 0.3) { pose(K.idle, K.rainW, ease.out(q / 0.3)); P.hat = q < 0.12 ? 0 : 1; P.ht = q < 0.12 ? -0.3 * q / 0.12 : 0; }   // 先把帽子一掀，再倒过来举高
        else { pose(K.rainW, K.rainB, ease.inOut(clamp01((q - 0.3) / 0.5))); P.hat = 1; P.orb = 1 + Math.min(3, Math.floor((q - 0.3) / 0.18)); if (q > 0.75) { P.fx2 += (f12 & 1) ? 1 : -1; P.by += f12 & 1; } }
        P.by -= Math.round(5 * clamp01(q / 0.4)); P.glow = q < 0.4 ? 2 : 3; P.eyes = 2; P.grin = q > 0.6 ? 2 : 1;
      } else if (st === CAST) { pose(K.rain, K.rain); P.hat = 1; P.hta = 1.0; P.orb = tq < 2 / 12 ? 4 : 2; P.grin = 3; P.glow = 3; P.eyes = 2; P.by = -4; }
      else { const u = clamp01(tq / 0.55); pose(K.rain, K.idle, ease.inOut(u)); P.hat = u < 0.6 ? 1 : 0; P.hta = 1.0 * (1 - u); P.grin = 1; }
    } else if (MV === 'collect') {
      if (st === CHARGE) { pose(K.idle, K.collW, ease.out(clamp01(q / 0.4))); P.by = -Math.round(4 * clamp01(q / 0.4)); if (q > 0.55) { P.nx += (f12 & 1) ? 1 : -1; P.fx2 -= (f12 & 1) ? 1 : -1; } P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.grin = 1; P.cw = f12 & 1 ? 2 : 1; }
      else if (st === CAST) { pose(K.coll, K.coll); P.fist = 1; P.glow = 3; P.eyes = 2; P.grin = 2; P.shield = tq < 2 / 12 ? 2 : 1; }
      else { pose(K.coll, K.idle, ease.inOut(clamp01(tq / 0.55))); P.shield = tq < 0.3 ? 1 : 0; P.fist = tq < 0.2 ? 1 : 0; }
    } else if (MV === 'takeAll') {
      if (st === CHARGE) {
        if (q < 0.35) pose(K.idle, K.takeW, ease.out(q / 0.35));
        else { pose(K.takeW, K.takeW2, ease.inOut(clamp01((q - 0.35) / 0.4))); if (q > 0.7) { P.nx += (f12 & 1) ? 1 : -1; P.by += f12 & 1; } }
        P.orb = Math.min(4, 1 + Math.floor(q * 4)); P.by -= Math.round(4 * clamp01(q / 0.35)); P.glow = q < 0.3 ? 2 : 3; P.eyes = 2; P.grin = q > 0.5 ? 2 : 1; P.fist = 1;
      } else if (st === CAST) { pose(K.take, K.take); P.by = 4; P.orb = tq < 2 / 12 ? 4 : 0; P.grin = 3; P.glow = 3; P.eyes = 2; P.fist = 1; P.ht = 0.12; }
      else { pose(K.take, K.idle, ease.inOut(clamp01(tq / 0.55))); P.by = Math.round(4 * (1 - clamp01(tq / 0.55))); P.grin = 1; }
    } else if (MV === 'poke') {
      if (st === CHARGE) { pose(K.idle, K.pokeW, ease.out(clamp01(q / 0.5))); P.by = -Math.round(3 * ease.out(clamp01(q / 0.5))); if (q > 0.5) { P.nx += (f12 & 1) ? 1 : -1; } P.orb = q > 0.5 ? 1 + (f12 & 1) : 0; P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.fist = 1; }
      else if (st === CAST) { pose(K.poke, K.poke); P.orb = 2; P.grin = 2; P.glow = 3; P.eyes = 2; P.fist = 1; }
      else pose(K.poke, K.idle, ease.inOut(clamp01(tq / 0.5)));
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f] + Math.round((1 - q) * 6); P.glow = 1 + (f12 & 1); P.drip = f12 % 6; P.eyes = q > 0.6 ? 2 : 1; P.ht = 0.08; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.grin = 3; P.glow = 3; P.eyes = 2; P.ht = -0.12; P.cw = 2; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2：远手按住面具一拧 → 两声心跳 → 张开双臂仰头大笑，面具的笑裂到两颊，牌花绕帽
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.hot = hb ? 1 : HOT; P.grin = hb ? 2 : 1; P.by = hb ? 1 : 0; P.hd += hb ? 0.06 : 0; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.grin = 3; P.glow = 3; P.eyes = 2; P.hot = 1; P.suits = 1; P.ht = -0.16; P.hd -= 0.12; P.cw = 2; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.grin = hold ? 3 - ((f12 >> 1) & 1) : 1; P.glow = 3; P.eyes = 2; P.hot = 1; P.suits = 1; if (hold) P.hd -= 0.12; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [18, -34], SHF = [-16, -34], NECK = [2, -38];
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.5 - P.lean * 0.5); }
  const elbow = (sh, h, side) => { const a = B.ik(sh, h, 13, 14, 1), b = B.ik(sh, h, 13, 14, -1); return (a[1] + side * a[0] * 0.3) >= (b[1] + side * b[0] * 0.3) ? a : b; };   // 肘往下、往外
  const caneDir = () => [Math.sin(P.ca), -Math.cos(P.ca)];
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.core = B.at(2, -26);
    headXf(); L.eye = B.at(8, -53); L.eyeF = B.at(-1, -53); L.mouth = B.at(3.5, -46); L.head = B.at(3, -56); L.brim = B.at(3, -61.5); L.hAng = B.ang() + P.ht; L.hatTop = B.at(3, -86);
    L.hN = [P.nx, P.ny + P.by]; L.hF = [P.fx2, P.fy2 + P.by];
    L.elN = elbow(L.shN, L.hN, 1); L.elF = elbow(L.shF, L.hF, -1);
    const d = caneDir(); L.die = [L.hN[0] + d[0] * 11, L.hN[1] + d[1] * 11]; L.tip = [L.hN[0] - d[0] * 34, L.hN[1] - d[1] * 34];
    L.hatC = P.hat === 1 ? [L.hF[0], L.hF[1] - 2] : P.hat === 2 ? [P.hx, P.hy] : L.brim;   // 帽口
    L.coin = [L.hF[0] + 1, L.hF[1] - 4 - P.coin];
    L.orb = MV === 'coinRain' && P.hat === 1 ? [L.hatC[0] + Math.sin(P.hta) * 3, L.hatC[1] - 3] : L.die;
    P.fcx = P.orb ? L.orb[0] : L.core[0]; P.fcy = P.orb ? L.orb[1] : L.core[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  // 5×5 的牌花（第二阶段绕着礼帽转）
  const SUIT = { s: ['..#..', '.###.', '#####', '..#..', '.###.'], h: ['.#.#.', '#####', '#####', '.###.', '..#..'], d: ['..#..', '.###.', '#####', '.###.', '..#..'], c: ['.###.', '#.#.#', '#####', '#.#.#', '..#..'] };
  const glyph = (g, x, y, m, t) => { for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (g[j][i] === '#') px(x + i - 2, y + j - 2, m, t); };

  // 斗篷：立起来的高领（外黑里红）把白脸框在中间，下摆张开成金字塔；正面看见的是红里子，外沿翻出黑边
  function cape() {
    part(); torsoXf(); const s = P.cape, w = [0, 1, 2, 1][P.cw | 0] || 0, cw = P.cw | 0;
    const bx = 30 + 16 * s, out = [[-12, -39], [-22, -35], [-28 - 6 * s, -20], [-bx - 2, 3], [bx + 2, 3], [30 + 6 * s, -20], [24, -35], [14, -39]];
    B.poly(E, out.map(([x, y], i) => [x + (i === 3 ? -cw : i === 4 ? cw : 0), y]), CAPE);
    part(); torsoXf();
    B.poly(E, [[-11, -38], [-20, -34], [-25 - 6 * s, -20], [-bx + 2 - cw, 4], [bx - 2 + cw, 4], [27 + 6 * s, -20], [22, -34], [13, -38]], LINING);
    for (const [x0, x1] of [[-14, -22 - 10 * s], [-6, -10 - 6 * s], [10, 14 + 6 * s], [18, 26 + 10 * s]]) { B.ln(E, x0, -32, x1 - w * 0.5, 2, LINING, 3); B.ln(E, x0 + 1, -32, x1 + 1.5 - w * 0.5, 2, LINING, 7); }   // 褶
    // 立领：两片尖领从肩后竖起来，尖儿往外翻
    for (const side of [-1, 1]) {
      part(); torsoXf(); const o = side < 0 ? -9 : 13, tip = [o + side * 16, -66 - (side > 0 ? 1 : 0)];
      B.poly(E, [[o - side * 1, -36], [o + side * 11, -40], tip, [o + side * 9, -58], [o + side * 3, -46]], CAPE);
      B.poly(E, [[o + side * 1, -38], [o + side * 9, -41], [tip[0] - side * 2, tip[1] + 4], [o + side * 7, -56], [o + side * 3, -47]], LINING);
      B.ln(E, o + side * 3, -44, tip[0] - side * 3, tip[1] + 6, LINING, 7); B.px(E, tip[0], tip[1], GOLD, 7);   // 领尖一点金
    }
  }
  function arm(side) {   // 黑燕尾服的袖子、白袖口和金袖扣、白手套
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? COATD : COAT, gl = far ? GLOVED : GLOVE;
    part(); capW(sh[0], sh[1], el[0], el[1], 5.2, 4.6, m); capW(el[0], el[1], h[0], h[1], 4.6, 4.2, m);
    lnW(sh[0], sh[1] + 2, el[0], el[1] + 2, m, 3); const mid = [(el[0] + h[0]) / 2, (el[1] + h[1]) / 2]; dot(mid[0] - 1, mid[1] - 1.5, 1.6, m, 7);
    const dir = Math.atan2(h[1] - el[1], h[0] - el[0]), cx = h[0] - Math.cos(dir) * 4, cy = h[1] - Math.sin(dir) * 4;
    part(); dot(cx, cy, 3.4, far ? SHIRT : GLOVE); px(cx + Math.cos(dir + 1.57) * 2, cy + Math.sin(dir + 1.57) * 2, GOLD, 8);   // 袖口、金袖扣
    part(); dot(h[0], h[1], 3.4, gl);
    const open = far && !P.fist;
    for (let i = 0; i < 4; i++) { const a = dir + (i - 1.5) * (open ? 0.42 : 0.26) - (far ? 0.2 : 0), r0 = [h[0] + Math.cos(a) * 2.8, h[1] + Math.sin(a) * 2.8], ln = open ? 4 : 2.2, tip = [r0[0] + Math.cos(a - side * 0.3) * ln, r0[1] + Math.sin(a - side * 0.3) * ln];
      capW(r0[0], r0[1], tip[0], tip[1], 1.2, 0.9, gl, i === 0 ? 7 : 5); }
    lnW(h[0] - Math.cos(dir) * 2, h[1] - Math.sin(dir) * 2 - 2, h[0] + Math.cos(dir) * 2, h[1] + Math.sin(dir) * 2 - 2, gl, 7);   // 手背的缝线高光
  }
  function torso() {
    part(); torsoXf();
    B.poly(E, [[-15, 3], [15, 3], [16, -10], [18, -26], [19, -32], [11, -38], [-9, -38], [-17, -32], [-16, -26], [-15, -10]], COAT); B.ell(E, 1, -27, 16, 9, 0, COAT);
    B.ln(E, -12, -24, -8, -14, COAT, 3); B.ln(E, 15, -24, 11, -14, COAT, 3); B.ell(E, -10, -29, 4, 3, 0.3, COAT, 7); B.ell(E, 13, -29, 4, 3, -0.3, COAT, 7);
    part(); torsoXf(); B.poly(E, [[-3, -38], [7, -38], [2.5, -15]], SHIRT);                                           // 白衬衫的 V
    B.ln(E, 2, -36, 2.5, -17, SHIRT, 3); for (const y of [-33, -28, -23]) B.px(E, 2 + (y + 38) * 0.02, y, GOLD, 8);    // 金扣
    part(); torsoXf(); B.poly(E, [[6, -38], [12, -37], [12, -31], [9, -27], [11, -25], [3.5, -12], [3, -16]], GOLD);   // 金翻领（近）
    B.ln(E, 11, -36, 11, -31, GOLD, 8); B.ln(E, 9, -27, 4, -14, GOLD, 3);
    part(); torsoXf(); B.poly(E, [[-2, -38], [-8, -37], [-8, -31], [-5, -27], [-7, -25], [1, -12], [1.5, -16]], GOLDD); B.ln(E, -7, -36, -7, -31, GOLDD, 7);   // 远翻领
    part(); torsoXf(); B.poly(E, [[-13, -28], [-9, -29], [-8.5, -24], [-12.5, -23]], CARD, 7); B.px(E, -11, -27, RED, 7); B.px(E, -10.5, -26, RED, 5);   // 胸袋里插着一张红心 A
    B.ln(E, -14, -24, -8, -25, COAT, 3);
    B.px(E, -6, -14, GOLD, 7); B.px(E, 9, -14, GOLD, 7);                                                               // 燕尾服的金扣
  }
  function collar() {   // 白色硬领、红领巾、金别针
    part(); torsoXf(); B.poly(E, [[-3, -38], [0, -42], [1.5, -38]], SHIRT, 7); B.poly(E, [[7, -38], [4, -42], [2.5, -38]], SHIRT, 7);
    part(); torsoXf(); B.poly(E, [[-1.5, -39], [5.5, -39], [4.5, -34], [3, -29], [2, -29], [0, -34]], RED); B.ln(E, 2.5, -37, 2.5, -31, RED, 3); B.ln(E, 0, -38, 5, -38, RED, 7);
    dot(...B.at(2.5, -35), 1.1, GOLD); px(...B.at(2, -36), GOLD, 9);
  }
  function epaulette(side) {   // 金流苏肩章
    part(); torsoXf(); const far = side < 0, c = far ? [-17, -35] : [19, -35], m = far ? GOLDD : GOLD;
    B.ell(E, c[0], c[1], 6, 3, side * 0.25, m); B.ln(E, c[0] - 4, c[1] - 1, c[0] + 3, c[1] - 2, m, 8);
    for (let i = -2; i <= 2; i++) B.ln(E, c[0] + i * 2.2, c[1] + 2, c[0] + i * 2.4 + side * 0.5, c[1] + 6 + (i & 1), m, i & 1 ? 4 : 6);
  }
  function head() {   // 面具：一张白色的黑桃 A，金边；斜眉、一只金眼、一只黑洞里一点红、红色小丑笑
    part(); headXf(); B.ell(E, 3, -62, 10, 3.5, 0, VOIDM);                        // 帽子底下油亮的黑发（摘帽时看得见）
    B.ln(E, -4, -62, 10, -63, VOIDM, 8);
    part(); headXf(); B.poly(E, [[-8, -62], [14, -62], [14.5, -40], [-8.5, -40]], GOLD);                              // 金边
    part(); headXf(); B.poly(E, [[-7, -61], [13, -61], [13.5, -41], [-7.5, -41]], CARD);                              // 白牌
    B.ln(E, -6.5, -42, 13, -42, CARD, 3); B.ln(E, -6.5, -60, -6.5, -43, CARD, 7);
    const hot = P.hot, J = Math.round(P.grin);
    // 角标：红 A + 小黑桃（左上），右下一个倒着的小黑桃
    for (const [x, y] of [[-5, -58], [-6, -57], [-4, -57], [-6, -56], [-5, -56], [-4, -56], [-6, -55], [-4, -55]]) B.px(E, x, y, RED, 5);
    for (const [x, y] of [[-5, -53], [-6, -52], [-5, -52], [-4, -52], [-5, -51]]) B.px(E, x, y, CARD, 10);
    for (const [x, y] of [[12, -43], [11, -44], [12, -44], [13, -44], [12, -45]]) B.px(E, x, y, CARD, 10);
    for (const [x, y] of [[3, -60], [2, -59], [3, -59], [4, -59], [1, -58], [2, -58], [3, -58], [4, -58], [5, -58], [3, -57]]) B.px(E, x, y, hot ? RED : CARD, hot ? 8 : 10);   // 额头的黑桃（第二阶段变红）
    // 画上去的斜眉
    B.ln(E, 5, -56, 10, -57.5, CARD, 10); B.ln(E, -3, -57, 1, -55.5, CARD, 10);
    // 眼洞：近眼金光，远眼黑洞里一点红（第二阶段也亮金光）
    const e1 = P.eyes >= 2 ? G3 : P.eyes === 1 ? G2 : VOIDM;
    B.poly(E, [[5.5, -54.5], [10.5, -55], [10, -52], [6, -52]], VOIDM); B.px(E, 7, -53, e1); B.px(E, 8, -53, e1); B.px(E, 9, -53.5, P.eyes ? G2 : VOIDM); B.px(E, 8, -52.5, P.eyes ? G1 : VOIDM);
    B.poly(E, [[-3.5, -54.5], [1, -54], [0.5, -52], [-3, -52]], VOIDM);
    if (hot && P.eyes) { B.px(E, -1, -53, e1); B.px(E, -2, -53, G2); } else if (P.eyes) B.px(E, -1, -53, RED, 9);
    if (P.eyes >= 2) { B.px(E, 11, -56, G3); B.px(E, 12, -55, G2); if (hot) B.px(E, -4, -56, G2); }                    // 眼角的一点闪光
    // 红色的笑：嘴角一直翘到颊上（第二阶段裂到两颊、口里透金光）
    const lo = -45.5 + J * 0.9, ck = hot || J >= 3 ? 2.5 : 1;
    B.poly(E, [[-3, -48.5], [3.5, -46.5], [10, -48.5], [9, lo - 0.5], [3.5, lo + 0.8], [-2, lo - 0.5]], VOIDM);
    if (J >= 2) B.poly(E, [[1, -46.5], [3.5, -46], [6, -46.5], [5.5, lo - 0.5], [3.5, lo], [1.5, lo - 0.5]], J >= 3 || hot ? G3 : G2);
    B.ln(E, -3, -48.5, 3.5, -46.8, RED, 7); B.ln(E, 3.5, -46.8, 10, -48.5, RED, 7);                                        // 上唇
    B.ln(E, -2, lo - 0.5, 3.5, lo + 1, RED); B.ln(E, 3.5, lo + 1, 9, lo - 0.5, RED); B.ln(E, -1, lo + 0.5, 3.5, lo + 2, RED, 4); B.ln(E, 3.5, lo + 2, 8, lo + 0.5, RED, 4);                                         // 下唇
    B.ln(E, -3, -48.5, -3.5 - ck, -49.5 - ck, RED, 6); B.ln(E, 10, -48.5, 10.5 + ck, -49.5 - ck, RED, 6); B.ln(E, -2.5, -48, -3 - ck, -49 - ck, RED, 4); B.ln(E, 9.5, -48, 10 + ck, -49 - ck, RED, 4);                  // 嘴角翘到颊上
    for (const x of [-1, 1, 3, 5, 7]) B.px(E, x + 0.5, -47 - (x === 3 ? -0.5 : 0) + (Math.abs(x - 3) > 3 ? -0.5 : 0), CARD, 9);   // 一排牙
    if (J) for (const x of [0.5, 3.5, 6.5]) B.px(E, x, lo - 0.3, CARD, 8);
    if (P.crack) { B.ln(E, 7, -61, 5, -54, CARD, 10); B.ln(E, 5, -54, 8, -49, CARD, 10); B.ln(E, 8, -49, 6, -42, CARD, 10);  // 面具裂开一道缝，缝里透金光
      if (P.crack >= 2) { B.ln(E, 7.5, -60, 5.5, -54, G2); B.ln(E, 5.5, -54, 8.5, -49, G3); } }
  }
  // 礼帽（本地坐标：帽檐中心为原点，朝上为负）；on = 戴在头上 / 远手倒拿 / 掉在地上
  function hat() {
    const c = L.hatC, a = P.hat === 1 ? Math.PI + P.hta : P.hat === 2 ? P.ha : L.hAng, glow = P.hot ? (P.glow >= 3 ? G3 : G2) : 0;
    const X = () => { B.reset(); B.move(c[0], c[1]); B.rot(0, 0, a); };
    part(); X(); B.poly(E, [[-9, -1], [9, -1], [10.5, -25], [-10.5, -25]], HAT); B.ell(E, 0, -25, 10.5, 1.8, 0, HAT, 6);   // 帽筒，顶微微外扩
    B.ln(E, -5, -7, -5.6, -23, HAT, 8); B.ln(E, -4, -7, -4.5, -23, HAT, 7); B.ln(E, 7, -7, 7.7, -23, HAT, 3); B.ln(E, -9.5, -24, 9.5, -24, HAT, 7);            // 丝绒的高光和暗边
    part(); X(); B.poly(E, [[-9, -1], [9, -1], [9.3, -5.5], [-9.3, -5.5]], RED); B.ln(E, -9.3, -6, 9.3, -6, glow || GOLD, glow ? 4 : 7); B.ln(E, -9, -1, 9, -1, glow || GOLD, glow ? 3 : 5);   // 红帽带 + 金边
    part(); X(); B.ell(E, 0, -3.3, 2.3, 2.3, 0, GOLD); B.px(E, -0.6, -4, GOLD, 9); B.px(E, 0.5, -3, GOLD, 3);              // 帽带正中的金币徽章
    for (const [x, r, pip] of [[5.5, 0.28, 1], [7.5, 0.5, 0]]) {   // 帽带上插的两张牌
      part(); X(); B.save(); B.rot(x, -4, r); B.poly(E, [[x - 2, -4], [x + 2, -4], [x + 2, -12], [x - 2, -12]], CARD, 6); B.px(E, x - 1, -11, pip ? RED : CARD, pip ? 7 : 10); B.px(E, x, -9, pip ? RED : CARD, pip ? 6 : 10); B.restore(); }
    part(); X(); B.ell(E, 0, 0, 15.5, 2.4, 0, HAT); B.cap(E, -14, -0.5, -16.5, -2.5, 1.4, 0.8, HAT); B.cap(E, 14, -0.5, 16.5, -2.5, 1.4, 0.8, HAT);   // 两边上卷的帽檐
    B.ln(E, -13, -1.5, 13, -1.5, HAT, 7); B.ln(E, -12, 1.5, 12, 1.5, HAT, 3);
    if (P.hat === 1 && P.orb) { part(); X(); B.ell(E, 0, -0.5, 8, 1.4, 0, P.orb >= 3 ? G3 : G2); }                        // 倒着的帽口里聚起来的金光
  }
  function caneBack() {   // 手杖在近手后面的那一截 + 骰子杖头
    const d = caneDir(), h = L.hN, die = L.die, n = [-d[1], d[0]];
    part(); capW(L.tip[0], L.tip[1], h[0] + d[0] * 5, h[1] + d[1] * 5, 1.1, 1.3, CANE); lnW(L.tip[0] + n[0] * 0.6, L.tip[1] + n[1] * 0.6, h[0] + n[0] * 0.6, h[1] + n[1] * 0.6, CANE, 8);
    capW(h[0] + d[0] * 4, h[1] + d[1] * 4, h[0] + d[0] * 7, h[1] + d[1] * 7, 1.6, 1.6, GOLD);   // 金箍
  }
  function caneHead() {   // 骰子杖头画在手前面：五点，中间一点红
    const die = L.die;
    const rain = MV === 'coinRain' && P.hat === 1;
    part(); const lit = P.orb ? (P.orb >= 3 && !rain ? G3 : G2) : 0, m = lit || GOLD, s = 3.6, cs = [[-s, -s], [s, -s], [s, s], [-s, s]].map(([u, v]) => [die[0] + u * Math.cos(P.ca) - v * Math.sin(P.ca), die[1] + u * Math.sin(P.ca) + v * Math.cos(P.ca)]);
    polyW(cs, m); if (!lit) { lnW(cs[0][0], cs[0][1], cs[1][0], cs[1][1], GOLD, 8); lnW(cs[1][0], cs[1][1], cs[2][0], cs[2][1], GOLD, 3); }
    const pip = (u, v, mm, t) => px(die[0] + u * Math.cos(P.ca) - v * Math.sin(P.ca) - 0.5, die[1] + u * Math.sin(P.ca) + v * Math.cos(P.ca) - 0.5, mm, t);
    for (const [u, v] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) pip(u, v, lit ? G1 : GOLD, lit ? 1 : 10); pip(0, 0, RED, lit ? 9 : 6);   // 五点，中间一点红
    if (P.orb >= 2 && !rain) { part(); dot(die[0], die[1], 5.5 + P.orb * 0.6, G1); dot(die[0], die[1], 4.4, P.orb >= 3 ? G3 : G2); pip(0, 0, RED, 9); }
  }
  function coin() {   // 掌心的金币（弹起来时一转一转）
    if (!P.cn) return; part(); const c = L.coin, f = P.coin ? (P.k1 >> 3) & 3 : 0, rx = [2.2, 1.4, 0.6, 1.4][f];
    B.reset(); B.ell(E, c[0], c[1], rx, 2.2, 0, P.coin ? G2 : GOLD); if (rx > 1) px(c[0] - 0.5, c[1] - 1, P.coin ? G3 : GOLD, P.coin ? 4 : 9);
  }
  function suits() {   // 第二阶段：四个牌花绕着礼帽转
    if (!P.suits) return; const c = L.hatTop, ph = ((P.k2 >> 2) & 7) / 8 * 6.2832;
    [['s', G3], ['h', RED], ['d', G2], ['c', G3]].forEach(([k, m], i) => { const a = ph + i * 1.5708, x = c[0] + Math.cos(a) * 21, y = c[1] + 10 + Math.sin(a) * 5; if (Math.abs(Math.cos(a)) < 0.6) return; part(); glyph(SUIT[k], x, y, m, m === RED ? 8 : 4); });
  }
  function shield() {   // 收筹码之后身上罩一层金色护盾（一圈点）
    if (!P.shield) return; part(); for (let i = 0; i < 28; i++) { const a = -Math.PI + i / 27 * Math.PI, x = Math.cos(a) * 42, y = -30 + Math.sin(a) * 60; if (y > 0) continue; px(x + 2, y, (i + (P.k1 & 3)) % 3 ? G2 : G3); if (P.shield >= 2) px(x * 0.9 + 2, y * 0.9 - 3, G1); }
  }
  function drips() {   // 从手上、衣襟上滑回金币堆的金币
    if (!P.drip && P.st !== IDLE) return; part(); const k = P.drip;
    for (const [x, y, ph] of [[L.hF[0] - 1, L.hF[1] + 3, 0], [-14, -20 + P.by, 2], [16, -18 + P.by, 4]]) { const d = (k + ph) % 6; if (y + d * 2 > -SINK + 2) continue; px(x, y + d * 2, d < 2 ? G2 : GOLD, d < 2 ? 4 : 6); }
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    cape(); arm(-1); if (P.hat === 1) { hat(); B.reset(); part(); dot(L.hF[0], L.hF[1], 3.4, GLOVED); }
    coin(); torso(); collar(); epaulette(-1); head(); if (P.hat !== 1) hat();
    epaulette(1); caneBack(); arm(1); caneHead(); suits(); shield(); drips();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = L.core[0] * z + spr.ox; RIM.ry = L.core[1] * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = L.eye[0] * z + spr.ox; LIGHTS[0].y = L.eye[1] * z + spr.oy; LIGHTS[0].r = (P.eyes >= 2 ? 6 : P.eyes ? 4 : 0) * z;
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 18 * z; LIGHTS[1].r = 58 * z; LIGHTS[1].k = P.hot ? 0.56 : 0.42;                    // 金币堆从下面照上来
    LIGHTS[2].x = L.orb[0] * z + spr.ox; LIGHTS[2].y = L.orb[1] * z + spr.oy; LIGHTS[2].r = (P.orb ? 8 + P.orb * 4 : 0) * z;
    LIGHTS[3].x = L.mouth[0] * z + spr.ox; LIGHTS[3].y = L.mouth[1] * z + spr.oy; LIGHTS[3].r = (P.grin >= 2 ? 6 + P.grin * 2 : P.hot ? 5 : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：正面、双臂半张、手杖斜握，面具的笑裂开、两眼金光、牌花绕帽（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.wide, 0.35); P.hd = 0.04; P.grin = 2; P.eyes = 2; P.glow = 3; P.hot = 1; P.suits = 1; P.cape = 1; P.cw = 1; P.by = 0; P.breath = 0; P.drip = 2; P.cn = 1; P.coin = 6; P.ca = 0.3;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = B.at(3, -64); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 34 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连礼帽）

  // ───── 特效（舞台坐标；游戏里只画身边的，砸在部队身上的由游戏画）─────
  const GY = HY - SINK;   // 看得见的金币堆表面
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0;
  const coinSpray = (x, y, n, vx0, vx1, vy0, vy1, life) => { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, y, vx0 + Math.random() * (vx1 - vx0), vy0 + Math.random() * (vy1 - vy0), (life || 0.9) + Math.random() * 0.5, FXI.coin, { g: 300, floor: GY + 4 }); };
  const spiral = (c, r0, r1, n) => { const a = Math.random() * 6.2832, r = r0 + Math.random() * (r1 - r0); spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, n, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); };
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'coinRain') { const c = L.orb; ring(sx(c[0]), sy(c[1]), 1, FXI.coin); fx.pillar(sx(c[0]), 0, sy(c[1]), 6, 'coin', 0.35); coinSpray(sx(c[0]), sy(c[1]), 44, -120, 160, -330, -180, 0.8);
        burst(sx(c[0]), sy(c[1]), 18, 40, 140, 0.25, 0.5, FXI.coin, 60); shake(0.35, 3); flash(0.08); sfx('boss', { k: 'dealerRain', w: 1 }); sfx('boss', { k: 'dealerLaugh', w: 0.5 }); }
      else if (MV === 'collect') { const c = L.core; fx.dome(sx(2), GY, 44, 50, 'coin', 0.6); ring(sx(c[0]), sy(c[1]), 1, FXI.coin); burst(sx(c[0]), sy(c[1]), 20, 20, 60, 0.3, 0.5, FXI.coin, 0);
        shake(0.3, 3); flash(0.06); sfx('boss', { k: 'dealerCollect', w: 1 }); }
      else if (MV === 'takeAll') { const x = sx(L.die[0]), y = GY; fx.wave(x, y, 1, 46, 9, 'coin', 0.5, 2); fx.wave(x, y, -1, 36, 7, 'coin', 0.45, 2); fx.crack(x, y, 20, 1, 'coin', 1.2); fx.cross(sx(L.die[0]), sy(L.die[1]), 18, 'coin', 0.3, 2);
        ring(x, GY - 2, 1, FXI.coin); ring(sx(L.die[0]), sy(L.die[1]), 0, FXI.blood); coinSpray(x, y - 3, 30, -170, 170, -240, -90); burst(x, y - 2, 24, 60, 180, 0.35, 0.8, FXI.coin, 50);
        shake(0.45, 3); flash(0.12); sfx('boss', { k: 'slam', w: 1 }); sfx('boss', { k: 'dealerJackpot', w: 1 }); sfx('impact', { pal: 'coin', w: 1 }); }
      else if (MV === 'poke') { const t = L.die; fx.beam(sx(L.hN[0]), sy(L.hN[1]), sx(t[0] + 18), sy(t[1]), 2, 'coin', 0.18); burst(sx(t[0] + 4), sy(t[1]), 16, 50, 150, 0.2, 0.4, FXI.coin, 0); ring(sx(t[0] + 4), sy(t[1]), 0, FXI.coin);
        shake(0.25, 3); flash(0.05); sfx('boss', { k: 'dealerDice', w: 0.6 }); sfx('hit', { mat: 'metal', w: 0.9 }); }
      else if (MV === 'rise' || MV === 'p2') { const e = L.head; ring(sx(e[0]), sy(e[1]), 1, FXI.coin); ring(sx(2), sy(-30), 1, MV === 'p2' ? FXI.blood : FXI.coin); flash(0.12); shake(0.4, 3);
        fx.cross(sx(L.eye[0]), sy(L.eye[1]), 14, 'coin', 0.35, 2); coinSpray(sx(2), sy(-30), 36, -180, 180, -260, -80);
        sfx('boss', { k: 'dealerLaugh', w: 1 }); sfx('boss', { k: 'roar', w: 0.5 }); if (MV === 'p2') sfx('boss', { k: 'dealerJackpot', w: 0.8 }); }
    }
    if (s === CHARGE) {
      if (MV === 'coinRain') sfx('boss', { k: 'dealerCoins', w: 1, dur: E.DUR[CHARGE] });
      else if (MV === 'collect') { sfx('boss', { k: 'dealerCoins', w: 0.6, dur: E.DUR[CHARGE] }); sfx('boss', { k: 'lavaGather', w: 0.4, dur: E.DUR[CHARGE] }); }
      else if (MV === 'takeAll') { sfx('boss', { k: 'dealerDice', w: 1 }); sfx('boss', { k: 'dealerLaugh', w: 0.5 }); }
      else if (MV === 'poke') sfx('boss', { k: 'dealerDice', w: 0.5 });
      else if (MV === 'rise') { sfx('boss', { k: 'lavaRise', w: 0.6 }); sfx('boss', { k: 'dealerCoins', w: 0.8 }); }
      else if (MV === 'p2') sfx('boss', { k: 'heartbeat', w: 1 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 1 / 12) sfx('swing', { kind: 'blunt', w: 0.8 });
    if (s === ATTACK && t === 3 / 12) { const d = L.die; fx.slash(sx(L.shN[0]), sy(L.shN[1]), 36, -0.6, 2.2, 'coin', 0.22, 3, 2); burst(sx(d[0]), sy(d[1]), 16, 50, 140, 0.25, 0.5, FXI.coin, 20); hitDummy(1, 1); shake(0.15, 2);
      sfx('hit', { mat: 'metal', w: 0.8 }); sfx('boss', { k: 'dealerDice', w: 0.4 }); }
    if (s === HURT && t === INCOMING) sfx('boss', { k: 'dealerCoins', w: 0.3 });
    if (s === RECOVER && t === 0.25 && MV === 'collect') ring(sx(L.core[0]), sy(L.core[1]), 0, FXI.coin);
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'dealerDie', w: 1 });
    if (s === DEATH && t === INCOMING + 0.35) { const e = L.head; fx.cross(sx(e[0]), sy(e[1]), 12, 'coin', 0.3, 2); burst(sx(e[0]), sy(e[1]), 16, 30, 100, 0.3, 0.6, FXI.coin, 10); sfx('hit', { mat: 'metal', w: 0.6 }); }
    if (s === DEATH && t === INCOMING + 1.1) { const x = sx(-2); ring(x, GY - 2, 1, FXI.coin); coinSpray(x, GY - 6, 40, -160, 160, -200, -60); shake(0.35, 3); flash(0.08); sfx('fall', { w: 1 }); sfx('boss', { k: 'dealerCoins', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 44; i++) spawn(K_RISE, sx(-40 + Math.random() * 80), sy(-4 - Math.random() * 50), 0, -14 - Math.random() * 22, 0.9 + Math.random() * 0.8, i % 3 ? FXI.coin : FXI.shadow); sfx('boss', { k: 'sink', w: 1 }); sfx('boss', { k: 'fade', w: 0.6 }); }
  }
  const EVENTS = [[], [], [1 / 12, 3 / 12], [], [], [0.25], [INCOMING], [INCOMING + 0.05, INCOMING + 0.35, INCOMING + 1.1, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    emT += dt;
    if (emT > (P.hot ? 0.06 : 0.13)) { emT = 0;   // 金币堆上一直闪的金光；第二阶段更密，还从牌花上掉金屑
      if (P.hot && Math.random() < 0.4) spawn(K_EMBER, sx(L.hatTop[0] - 22 + Math.random() * 44), sy(L.hatTop[1] + 4 + Math.random() * 14), (Math.random() - 0.5) * 10, -8 - Math.random() * 10, 0.6 + Math.random() * 0.5, FXI.coin);
      else spawn(K_RISE, sx(-44 + Math.random() * 88), GY - 2 - Math.random() * 8, (Math.random() - 0.5) * 8, -6 - Math.random() * 8, 0.8 + Math.random() * 0.8, FXI.coin); }
    if (state === IDLE && P.coin > 4 && Math.random() < 0.3) spawn(K_EMBER, sx(L.coin[0]), sy(L.coin[1]), 0, 6, 0.3, FXI.coin);
    if (state === CHARGE && P.orb && Math.random() < 0.65) spiral(L.orb, 10, 22, FXI.coin);
    if (state === CHARGE && MV === 'coinRain' && P.hat === 1 && Math.random() < 0.35) spawnX(K_PHYS, sx(L.hatC[0]), sy(L.hatC[1] - 2), (Math.random() - 0.5) * 40, -60 - Math.random() * 50, 0.5, FXI.coin, { g: 260, floor: GY + 4 });
    if (state === CHARGE && MV === 'collect' && Math.random() < 0.8) spiral(L.core, 34, 60, FXI.coin);
    if (state === CHARGE && MV === 'p2' && Math.random() < 0.4) spiral(L.head, 14, 26, FXI.blood);
    if ((state === CHARGE && MV === 'rise') || state === MOVE) { if (Math.random() < 0.55) spawnX(K_PHYS, sx(-34 + Math.random() * 72), GY - 2, (Math.random() - 0.5) * 70, -50 - Math.random() * 70, 0.7, FXI.coin, { g: 260, floor: GY + 4 }); }
  }
  function fxReset() { emT = 0; }
  function fxBack(f12) { const x0 = sx(-50), x1 = sx(50); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (((x * 7 + (f12 >> 1)) % 5) === 0) E.put(x, GY + 1, FXR[FXI.coin][P.hot ? 1 : 2]); }   // 脚下金币堆一闪一闪
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'coinRain'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const VOICES = {
    dealerCoins: (s, t, w, p) => { s.coins(t, 6 + Math.round(10 * w), 0.04 + 0.04 * w, { pan: p, gap: 0.05 }); s.riser(t, t + 0.9, 600, 2600, 0.025 * w, { pan: p }); },
    dealerRain: (s, t, w, p) => { s.coins(t, 18 + Math.round(12 * w), 0.07 + 0.04 * w, { pan: p, gap: 0.025 }); s.nz(t, 0.9, 'highpass', 4200, 0.8, 0.05 * w, { pan: p }); s.whoosh(t, 0.4, 500, 3000, 0.08 * w, { pan: p }); s.thud(t, 90, 40, 0.3, 0.2 * w, { pan: p }); },
    dealerDice: (s, t, w, p) => { for (let i = 0; i < 7; i++) s.nz(t + i * 0.055 + (i & 1) * 0.012, 0.02, 'bandpass', 1500 + (i % 3) * 700, 3, 0.07 + 0.05 * w, { pan: p }); s.thud(t + 0.4, 180, 80, 0.12, 0.12 * w, { pan: p }); },
    dealerCollect: (s, t, w, p) => { s.riser(t, t + 0.35, 2400, 500, 0.05 * w, { pan: p }); s.bell(t + 0.3, 76, 1.2, 0.08 + 0.05 * w, { pan: p }); s.coins(t + 0.3, 8, 0.07 * w, { pan: p, gap: 0.03 }); s.thud(t + 0.3, 110, 50, 0.25, 0.18 * w, { pan: p }); },
    dealerJackpot: (s, t, w, p) => { s.brass(t, 55, 0.9, 0.08 * w, { pan: p }); s.brass(t, 62, 0.9, 0.06 * w, { pan: p }); [79, 83, 86, 91].forEach((m, i) => s.bell(t + 0.08 * i, m, 0.8, 0.05 * w, { pan: p })); s.coins(t + 0.2, 14, 0.06 * w, { pan: p, gap: 0.03 }); },
    dealerLaugh: (s, t, w, p) => { for (let i = 0; i < 5; i++) s.tone(t + i * 0.16, 'sawtooth', 130 - i * 8, 0.13, 0.05 + 0.05 * w, { to: 100 - i * 8, lp: 900, vib: [6, 10, 0.02], pan: p, rev: 0.5 }); s.choir(t, [38, 45, 50], 1.0, 0.03 * w, { dark: 1, pan: p }); },
    dealerDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 180, 1.6, 0.06 + 0.04 * w, { to: 45, vib: [5, 30, 0.1], lp: 900, pan: p, rev: 0.6 }); s.coins(t + 0.4, 24, 0.07, { pan: p, gap: 0.05 }); s.choir(t + 0.2, [33, 40], 1.8, 0.05, { dark: 1, pan: p }); s.bell(t + 1.2, 45, 2.0, 0.06, { pan: p }); },
  };

  return {
    name: '庄家', HX, R_EL: FXI.coin, DUR, hero, P, GLOW_MATS: [G1, G2, G3], HIT_POINT: [0, -34], EVENTS, MAX_H: 110, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'flesh', how: 'dissolve', pal: 'coin', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['coinRain', 'collect', 'takeAll', 'poke', 'rise', 'p2'], MOVE_NAMES: { coinRain: '金币雨', collect: '收筹码', takeAll: '庄家通吃（第二阶段）', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.3, 1.55, 2.1]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 4 / 12, 8 / 12]],
      [CHARGE, [0.1, 0.5, 1.0, 1.25], 'coinRain'], [CAST, [0, 3 / 12], 'coinRain'], [RECOVER, [0.3], 'coinRain'],
      [CHARGE, [0.3, 0.9], 'collect'], [CAST, [0, 3 / 12], 'collect'], [RECOVER, [0.3], 'collect'],
      [CHARGE, [0.4, 1.0, 1.5], 'takeAll'], [CAST, [0, 3 / 12], 'takeAll'], [RECOVER, [0.3], 'takeAll'], [CHARGE, [0.9], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 0.4, 1.9], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.6, 0.9, 1.2, 1.6, 2.0, 2.3, 2.6]]],
    SINK, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
