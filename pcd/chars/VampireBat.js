// 吸血蝠（部队 · 科技 · 祭司 · 史诗 · 远程 760）：机枪蝠升级成的巨型扑翼轰炸机——黑铁身体比机枪蝠大一倍半、更长更低，
// 5 根黄铜翼骨撑开酒红帆布膜翼（翼尾剪成燕尾），雷达耳加大、两耳之间立起一只朝前的黄铜扩音喇叭（喇叭口是发光体），吻前一对下弯的钢獠牙撞角；
// 腹下的吊舱换成装甲弹舱，舱底挂 3 枚带红尾翼的炸弹；弹舱前端伸出一截站台，戴大檐帽的指挥官（原来的机枪手）站在机头前方，高举一面红信号旗（旗尖高出机背 4 格）。
// 攻击 = 喇叭向目标吼出一道声波（3 层同心红弧）；技能 = 投弹手（主）+ 空中指挥光环：喇叭连放 3 圈红光环、弹舱门打开、炸弹下垂尾翼抖动、
// 指挥官举旗 → 一个小俯冲再拉起，三枚炸弹依次抛出三条抛物线落在目标和两侧 → 三处依次爆炸（火球 + 小蘑菇烟、地面三连震），同时身边友军被增伤光环照亮。
// 死亡 = 坠落：弹舱中弹冒黑烟 → 打着螺旋往下栽 → 坠地时剩余炸弹殉爆一小下，翼骨崩飞 → 残骸（精灵画在地上：趴地的机身、摊开的翼、侧翻的弹舱、摔掉的喇叭和大檐帽）冒烟后消散。
// 由机枪蝠（Bat.js）升级：保留铆钉膜翼、雷达耳、腹下吊舱。身体用 parts-beast 的 B.fly；雷达耳、扩音喇叭、獠牙撞角、弹舱、炸弹、指挥官是本模块自画的部件。
PCD.define('VampireBat', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_TRAIL,
    K_PHYS, spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, groundShadow, sfx, allyPoints, allyFx } = E;
  const B = E.parts.beast, F = B.fly, U = B.util, R = Math.round;

  // ───── 材质 ─────
  // 翼膜 酒红帆布（blood，band 2，面积最大）；身体 黑铁（iron 暗段，band 2 两色明暗），机头亮一级；獠牙 亮钢（比黑铁机头亮两级才看得见）；翼骨 / 喇叭 / 弹舱镶边 黄铜（gold）；雷达碟 苍白钢（承接机枪蝠）；獠牙 steel；
  // 炸弹 钢灰弹体 + crimson 尾翼与红弹带 + 白弹头；指挥官 皮夹克（承接机枪手）+ 金肩章 + 墨色大檐帽 + 金帽徽
  const m = B.mats(E, { main: [0, 27, 28, 29], head: [0, 28, 29, 30], belly: [0, 28, 29, 30], wing: 'blood', bone: 'gold', claw: 'gold', eye: [0, 0, 57, 58], nose: 'steel' });
  // 更长更低：身体半长 9（机枪蝠 5）、离地 12
  const o = F.shape({ alt: 12, rx: 9, ry: 4.5, head: 'bat', hr: 3.5, earH: 0, tail: 'none', wing: { span: 19, chord: 6, type: 'membrane', fingers: 5 }, legLen: 0, talon: 0, m });
  const M_GOLD = defMat('gold', 1), M_GOLDF = defMat('gold', 1, 0, 1), M_BAY = defMat('iron', 1), M_FANG = defMat([27, 29, 30, 31], 1), M_FANGF = defMat([27, 28, 29, 30], 1),
    M_BOMB = defMat([27, 28, 29, 30], 1), M_FIN = defMat('crimson', 1), M_NOSE = defMat('white', 1), M_SKIN = defMat('skin', 1), M_UNI = defMat('leather', 1), M_CAP = defMat([0, 27, 28, 30], 1), M_FLAG = defMat('crimson', 1),
    M_POLE = defMat('wood', 1), M_INK = defMat('ink', 1, 1), M_HORN = defMat([12, 13, 26, 21], 1, 1), M_CORE = defMat([12, 13, 26, 21], 1, 1), M_BOOT = defMat('boot', 1), M_BADGE = defMat('gold', 1),
    M_DISH = defMat('pale', 1), M_DISHF = defMat('pale', 1, 0, 1), M_MAST = defMat('steel', 1);
  const R_EL = FXI.fire, EL = FXR[R_EL], AURA = FXI.enemy, AU = FXR[AURA], HX = 34, DUR = DEFAULT_DUR.slice();
  const SOOT = E.fxRamp('soot', [10, 9, 8, 52, 0]);                           // 弹舱黑烟 / 残骸烟：暖灰 → 石 → 深石 → 墨紫 → 墨（色板内）
  const hero = new Sprite(104, 66, 52, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 19], rimRamp: AU, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of [M_HORN, M_CORE, M_SKIN, M_INK, M_FLAG, M_CAP, M_UNI, M_POLE, M_BOOT, M_BADGE, m.eye, m.ink]) RIM.skip[k] = 1;   // 指挥官整个人不吃喇叭的红轮廓光（否则帽子被染红）

  // ───── 姿势 ─────
  // 骨架字段（B.fly）：gf 扑翼帧 · wing 翼姿 · bob · lift · pitch · lie（2 = 坠地残骸）· head（抬头 -）· eyes
  // 本角色：rad 雷达朝向 · eg 雷达耳心 · gem 喇叭口亮度 0–4 · door 弹舱门 0 关 / 1 半开 / 2 全开 · nb 还挂着的炸弹数 · drop 炸弹下垂 · fin 尾翼抖
  //         flag 信号旗 0 放下 / 1 竖直高举 / 2 往前挥（指向目标）· duck 指挥官缩头 · sw 弹舱横摆（滞后）· wv 旗面飘（每 2 帧换一次）
  const P = {}; F.reset(P);
  Object.assign(P, { rad: 0, eg: 0, gem: 0, door: 0, nb: 3, drop: 0, fin: 0, flag: 1, duck: 0, sw: 0, wv: 0, st: 0, gx: 0, gy: 0, k1: 0, k2: 0, dq48: 0 });
  const KEY = keyer([['gf', -1, 3], ['wing', 0, 6], ['bob', -2, 2], ['lift', 0, 15], ['pitch', -2, 3], ['lie', 0, 2], ['head', -1, 2], ['eyes', 0, 1], ['flash', 0, 1], ['bx', -8, 8],
    ['dq48', 0, 48], ['rim', 0, 3], ['rad', 0, 2], ['eg', 0, 2], ['gem', 0, 4], ['door', 0, 2], ['nb', 0, 3], ['drop', 0, 1], ['fin', 0, 1], ['flag', 0, 2], ['duck', 0, 1], ['sw', -1, 1], ['wv', 0, 1]]);
  const G_WING = [1, 3, 2, 2], G_BOB = [0, -1, -1, 0], G_SW = [0, -1, -1, 0];              // 滑翔：扑一下 → 下压 → 展平滑行 2 帧（第 2 帧身体下沉）
  const T_ATK = 2 / 12, T_BOMB = [0.1, 0.2], T_CRING = [0.15, 0.55, 0.95], T_IRING = [0.3, 1.5], T_RRING = 0.1;
  const T_SMOKE = INCOMING + 0.05, T_CRASH = INCOMING + 0.75;
  const CMD_X = 16;                                                                        // 指挥官站的列：机头獠牙前面空 1 列，整个人在机身轮廓外
  let rig = null;

  function reset() { F.reset(P); P.rad = 0; P.eg = 0; P.gem = 0; P.door = 0; P.nb = 3; P.drop = 0; P.fin = 0; P.flag = 1; P.duck = 0; P.sw = 0; P.rim = 1; P.legs = 0; }
  function flapSlow(f12) { const f = Math.floor(f12 / 3 + 1e-6) & 3; P.gf = f; P.bob = B.FLAP_BOB[f]; P.sw = f === 1 ? 1 : 0; }   // 慢而沉的扑翼：每 3 帧换一次翼姿
  function idle(tq, f12) {
    flapSlow(f12); const lp = tq % DUR[IDLE];
    P.rad = lp < 0.6 ? 0 : lp < 1.2 ? 1 : lp < 1.6 ? 2 : lp < 2.0 ? 1 : 0;                 // 雷达耳来回转着扫描
    if ((lp >= 0.3 && lp < 0.45) || (lp >= 1.5 && lp < 1.65)) P.gem = 1;                   // 喇叭放一圈淡红脉冲时口亮一下
    if (lp >= 1.6 && lp < 2.0) P.flag = (f12of(lp - 1.6) >> 1) & 1 ? 1 : 2;                // 待机个性：指挥官挥旗（竖直 ↔ 往前，每 2 帧换一次角度）
  }
  const bayAt = () => { const C = rig.C; return [R(C.x) + P.sw, R(C.y + o.ry) + 1]; };      // 弹舱上沿（站台）那一行，紧贴机腹
  const hornAt = (h) => { const top = R(h.y - h.r * 0.9); return [R(h.x) - 1, top - 3]; };   // 喇叭根部 x、中线 y（口沿和信号旗之间空 1 列）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), f = f12of(t); reset(); P.st = st; P.wv = (f12 >> 1) & 1;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {
      const g = gait(tq); P.wing = G_WING[g]; P.bob = G_BOB[g]; P.sw = G_SW[g]; P.pitch = 1; P.fin = g & 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                             // 抬头吸气、指挥官举旗 → 喇叭吼出声波（身体后坐 1 格）、旗往前一挥 → 回位
      flapSlow(f12); P.rad = 0;
      if (f < 2) { P.head = -1; P.pitch = -1; P.gem = 1; P.flag = 1; }
      else if (f === 2) { P.gem = 3; P.bx = -1; P.rim = 2; P.flag = 2; }
      else if (tq < 0.45) { P.gem = 2; P.flag = 2; P.bx = f === 3 ? -1 : 0; }
      else P.gem = tq < 0.6 ? 1 : 0;
    } else if (st === CHARGE) {                                             // 喇叭连放 3 圈红环、弹舱门打开、炸弹下垂尾翼抖动、指挥官举旗
      flapSlow(f12); const q = ease.inOut(clamp01(tq / 0.7));
      P.lift = R(2 * q); P.rad = 0; P.eg = tq < 0.45 ? 1 : 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      P.door = tq < 0.3 ? 0 : tq < 0.55 ? 1 : 2; P.drop = tq >= 0.55 ? 1 : 0; P.fin = tq >= 0.7 ? (f12 & 1) : 0; P.flag = 1;
    } else if (st === CAST) {                                               // 小俯冲再拉起，三枚炸弹依次抛出，旗往前一挥（投弹信号）
      if (tq < 2 / 12) { P.gf = -1; P.wing = 5; P.bob = 2; P.pitch = 2; }
      else { P.gf = -1; P.wing = tq < 0.25 ? 1 : 3; P.bob = -1; P.pitch = -1; P.lift = 2; }
      P.door = 2; P.nb = tq < T_BOMB[0] ? 2 : tq < T_BOMB[1] ? 1 : 0; P.drop = 1; P.gem = 3; P.eg = 2; P.flag = 2; P.rad = 0; P.rim = 3;
    } else if (st === RECOVER) {                                            // 弹舱门合上，重新挂弹
      flapSlow(f12); const q = ease.inOut(clamp01(tq / 0.6));
      P.lift = R(2 * (1 - q)); P.door = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0; P.nb = tq < 0.5 ? 0 : 3; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.flag = tq < 0.4 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.35) { F.anim.hurt(P, h); P.duck = 1; P.flag = 0; P.sw = 1; P.rad = 2; P.rim = 0; P.legs = 0; }
      else idle(tq, f12);
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(tq, f12); P.rim = 1; }
      else if (d < 0.25) { F.anim.hurt(P, Math.min(d, 0.19)); P.duck = 1; P.flag = 0; P.sw = 1; P.rad = 2; P.gem = (f12 & 1) ? 1 : 4; P.legs = 0; }
      else if (tq < T_CRASH) {                                              // 打着螺旋往下栽（每 2 帧翻一次面）
        const q = clamp01((d - 0.25) / (T_CRASH - INCOMING - 0.25 - 1 / 12));
        P.lie = 1; P.lift = R(12 * (1 - ease.in(q))); P.pitch = 3; P.gf = -1; P.wing = [1, 4, 6, 4][f12 & 3]; P.flip = (f12 >> 1) & 1; P.bx = -2;
        P.eyes = 1; P.duck = 1; P.flag = 0; P.gem = 4; P.door = 1; P.sw = (f12 & 1) ? 1 : -1;
      } else {                                                              // 坠地残骸（精灵）：趴地的机身、摊开的翼、侧翻的弹舱、摔掉的喇叭和帽子 → 冒烟 → 消散
        P.lie = 2; P.gf = -1; P.wing = 6; P.bx = -2; P.eyes = 1; P.gem = 4; P.door = 1; P.nb = 0; P.flag = 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = F.rig(P, o);
    if (P.lie === 2) { P.gx = 14 + P.bx; P.gy = -2; } else { const [hx, hy] = hornAt(rig.head); P.gx = hx + 5 + P.bx; P.gy = hy; }
    P.dq48 = R(P.dq * 48); KEY(P);
  }

  // ───── 画 ─────
  // 候选部件：radarEar 碟形雷达耳（同 Bat.js 的苍白钢碟 + 钢支杆，h 4 = 大号：4 格高的碟 + 上下碟沿前翘）
  function radarEar(x, y, dir, lv, mat, h) {
    part(); h = h || 3;
    const core = (cx, cy) => { if (lv) sp(cx, cy, M_CORE, lv + 2); else sp(cx, cy, mat, 2); };
    sp(x, y, M_MAST, 0); sp(x, y + 1, M_MAST, 2); if (h > 3) sp(x, y - 1, M_MAST, 4);
    const b = y - (h > 3 ? 2 : 1);
    if (dir === 1) { for (let j = 0; j < h; j++) for (let i = -1; i <= 1; i++) sp(x + i, b - j, mat, (i === -1 || j === h - 1) ? 4 : 0); core(x, b - ((h - 1) >> 1)); return; }
    const s = dir === 0 ? 1 : -1;
    for (let j = 0; j < h; j++) sp(x - s, b - j, mat, j === h - 1 ? 4 : 2);
    sp(x, b, mat, 0); sp(x, b - h + 1, mat, 4); if (h > 3) { sp(x + s, b, mat, 2); sp(x + s, b - h + 1, mat, 4); }
    core(x + s, b - ((h - 1) >> 1));
  }
  // 候选部件：megaphone 扩音喇叭——黄铜喇叭筒从根部往前逐列张开（半高 0,0,1,1,2,2），喇叭口 5 格高、上沿高光；口内是发光体（lv 0 暗 / 1–3 亮 / 4 熄）；
  //           一根支柱立在头顶（stand < cy 时不画支柱：摔在地上）。x0 根部列、cy 中线行
  const HORN_HH = [0, 0, 1, 1, 2, 2];
  function megaphone(x0, cy, lv, stand) {
    part();
    for (let y = cy + 1; y <= stand; y++) sp(x0 + 1, y, M_GOLD, 2);                       // 支柱
    HORN_HH.forEach((hh, k) => { for (let j = -hh; j <= hh; j++) sp(x0 + k, cy + j, M_GOLD, j === -hh ? 4 : j === hh ? 2 : 0); });
    const x = x0 + 5;
    for (let j = -1; j <= 1; j++) { if (lv >= 1 && lv <= 3) sp(x, cy + j, M_HORN, j === 0 ? Math.min(4, lv + 2) : lv + 1); else sp(x, cy + j, M_INK, 0); }   // 喇叭口
    sp(x0 + 6, cy - 2, M_GOLD, 4); sp(x0 + 6, cy + 2, M_GOLD, 2);                           // 口沿外翻
  }
  // 候选部件：fangRam 獠牙撞角——吻前一对下弯的钢獠牙（先往前 2 格再往下勾 3 格），远侧那只暗一级、错后 1 格
  function fang(x, y, mat) { part(); sp(x, y, mat, 4); sp(x + 1, y, mat, 0); sp(x + 2, y + 1, mat, 0); sp(x + 2, y + 2, mat, 0); sp(x + 2, y + 3, mat, 4); }
  // 候选部件：bombBay 装甲弹舱——上沿黄铜镶边（往前一直伸成指挥官站的站台，到 deckTo 列，站台底下一根斜撑）、两行铁甲板 + 铆钉、底门（door 0 关 / 1 半开斜挂 / 2 全开垂下）
  function bombBay(bx, by, door, deckTo) {
    part();
    for (let x = bx - 9; x <= deckTo; x++) sp(x, by, M_GOLD, x === bx - 9 ? 4 : x > bx + 6 ? 2 : 0);
    for (let j = 1; j <= 2; j++) for (let x = bx - 9; x <= bx + 6; x++) sp(x, by + j, M_BAY, 0);
    for (const x of [bx - 7, bx - 3, bx + 1, bx + 5]) sp(x, by + 1, M_BAY, 4);
    sp(bx + 6, by + 2, M_BAY, 2);
    for (let x = bx + 7, k = 0; x < deckTo - 1 && k < 2; x += 2, k++) sp(x, by + 1, M_BAY, 2);   // 站台斜撑
    if (door === 0) for (let x = bx - 8; x <= bx + 5; x++) sp(x, by + 3, M_BAY, x === bx - 2 || x === bx - 1 ? 2 : 0);
    else if (door === 1) { sp(bx - 8, by + 3, M_BAY, 0); sp(bx - 9, by + 4, M_BAY, 0); sp(bx + 5, by + 3, M_BAY, 0); sp(bx + 6, by + 4, M_BAY, 0); }
    else { for (let j = 3; j <= 4; j++) { sp(bx - 9, by + j, M_BAY, 0); sp(bx + 6, by + j, M_BAY, 0); } }
  }
  // 候选部件：bomb 带尾翼的航弹（2 格宽：一行 4 格宽的红尾翼 → 两行钢灰弹体（左列高光）→ 一道红弹带 → 白弹头；fin 1 = 两侧尾翼翘起抖动）
  const BOMB_X = [3, -2, -7];                                                              // 从前往后；技能按这个顺序投下
  function bombs(bx, by, n, drop, fin) {
    for (let i = 3 - n; i < 3; i++) {
      part(); const x = bx + BOMB_X[i], y = by + 4 + drop;
      sp(x, y, M_FIN, 0); sp(x + 1, y, M_FIN, 2);
      if (fin) { sp(x - 1, y - 1, M_FIN, 4); sp(x + 2, y - 1, M_FIN, 2); } else { sp(x - 1, y, M_FIN, 4); sp(x + 2, y, M_FIN, 2); }
      sp(x, y + 1, M_BOMB, 4); sp(x + 1, y + 1, M_BOMB, 0); sp(x, y + 2, M_BOMB, 4); sp(x + 1, y + 2, M_BOMB, 2);
      sp(x, y + 3, M_FIN, 0); sp(x + 1, y + 3, M_FIN, 2);                                  // 红弹带
      sp(x, y + 4, M_NOSE, 4); sp(x + 1, y + 4, M_NOSE, 2);                                // 白弹头
      if (drop) sp(x, y - 1, M_BAY, 3);                                                     // 下垂时露出挂钩
    }
  }
  // 候选部件：commander 站立的指挥官（原来的机枪手）——皮靴一行、皮夹克 3 行 + 金肩章 + 纽扣、3×3 脸（眼 + 探出 1 格的鼻）、
  //           大檐帽：帽顶 4 格 + 1 格金帽徽、帽檐一行 5 格（往前多伸 1 格）。cx 身体中列，y0 站台那一行（脚底 = y0 - 1）
  function commander(cx, y0) {
    part(); const d = P.duck;
    sp(cx - 1, y0 - 1, M_BOOT, 0); sp(cx + 1, y0 - 1, M_BOOT, 0);                           // 两只靴
    for (let y = y0 - 4 + d; y <= y0 - 2; y++) for (let x = cx - 1; x <= cx + 1; x++) sp(x, y, M_UNI, x === cx - 1 && y === y0 - 4 + d ? 4 : 0);
    sp(cx - 1, y0 - 4 + d, M_BADGE, 4); sp(cx, y0 - 3 + d, M_BADGE, 3);                       // 肩章 + 纽扣（整个人是一个部件：帽、脸、夹克之间不压分界线，靠颜色分开，3 行脸才不被吃掉）
    const hy = y0 - 7 + d;                                                                  // 脸的第一行
    for (let y = hy; y <= hy + 2; y++) for (let x = cx - 1; x <= cx + 1; x++) sp(x, y, M_SKIN, x === cx - 1 ? 2 : 0);
    sp(cx + 1, hy + 1, P.eyes ? M_SKIN : M_INK, P.eyes ? 2 : 0); sp(cx + 2, hy + 1, M_SKIN, 0);   // 眼 + 鼻
    sp(cx, hy + 2, M_SKIN, 2);                                                              // 下巴阴影
    for (let x = cx - 2; x <= cx + 2; x++) sp(x, hy - 1, M_CAP, x === cx + 2 ? 3 : 2);      // 帽檐（墨色，前伸 1 格，檐口亮一格）
    for (let x = cx - 2; x <= cx + 1; x++) sp(x, hy - 2, M_CAP, x <= cx - 1 ? 4 : 3);       // 帽顶（上沿受光）
    sp(cx, hy - 2, M_BADGE, 4);                                                             // 金帽徽
  }
  // 举旗的前臂 + 旗：flag 0 放下（旗杆斜靠肩上）/ 1 竖直高举（5 格木杆，旗面 3×4 往后飘）/ 2 往前挥（旗杆前倾，旗面在杆前上方）
  function flagArm(cx, y0, flag) {                                                        // 手臂紧跟 commander() 画（同一个部件），旗杆 + 旗面另起部件
    const d = P.duck, sy = y0 - 4 + d, wv = P.wv;
    if (flag === 0) {
      sp(cx + 2, sy + 1, M_UNI, 0); sp(cx + 2, sy + 2, M_SKIN, 0);
      part(); for (let k = 1; k <= 4; k++) sp(cx + 2 - k, sy + 2 - k, M_POLE, 0);
      part(); for (let k = 0; k < 3; k++) { sp(cx - 3 - k, sy - 1 - k, M_FLAG, 0); sp(cx - 3 - k, sy - k, M_FLAG, 2); }
      return;
    }
    if (flag === 1) {
      const hx = cx + 3, hy = sy - 4;                                                      // 手举到帽檐高度，旗杆竖直
      sp(cx + 2, sy, M_UNI, 0); for (let y = sy - 1; y > hy; y--) sp(hx, y, M_UNI, y === sy - 1 ? 0 : 4);
      sp(hx, hy, M_SKIN, 0);
      part(); for (let y = hy - 1; y >= hy - 5; y--) sp(hx, y, M_POLE, 0);                // 5 格木杆
      sp(hx, hy - 6, M_BADGE, 4);                                                           // 杆顶金球 = 旗尖
      part();
      for (let i = 1; i <= 4; i++) for (let j = 0; j < 4; j++) {                            // 旗面 4 宽 × 4 高朝前飘（在帽子前上方，不压在头顶），末列缺一角、随风上下错 1 格
        if (j === 3 && i === 4) continue;
        sp(hx + i, hy - 5 + j + (i === 4 && wv ? 1 : 0), M_FLAG, j === 0 ? 4 : j === 3 ? 2 : 0);
      }
      return;
    }
    const hx = cx + 3, hy = sy - 3;                                                        // 往前挥：手在肩前上方，杆前倾约 60°
    sp(cx + 2, sy, M_UNI, 0); sp(cx + 3, sy - 1, M_UNI, 0); sp(cx + 3, sy - 2, M_UNI, 4); sp(hx, hy, M_SKIN, 0);
    part(); for (let k = 1; k <= 5; k++) sp(hx + (k >> 1), hy - k, M_POLE, 0);
    const tx = hx + 3, ty = hy - 6; sp(tx, ty, M_BADGE, 4);
    part();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) sp(tx + 1 + i, ty + 1 + j + (i >> 1) + (i === 3 && wv ? 1 : 0), M_FLAG, j === 0 ? 4 : j === 2 ? 2 : 0);   // 旗面从杆顶往前下方甩出去（4 × 3）
  }
  // 候选部件：notchedWing 深扇贝膜翼（同 Bat.js）：翼骨一直伸到指尖、两指之间的膜边往腕部凹进去；WINGS_V 翼姿表把上扬帧压低（剪影总高不超过 36 格）
  const lerp = (a, b, q) => a + (b - a) * q;
  const WINGS_V = B.WINGS.map((w) => w.slice()); WINGS_V[1] = [1.05, -0.15, 0.15]; WINGS_V[2] = [0.3, -0.95, 0.1]; WINGS_V[3] = [-1.05, 0.4, 0.1];   // 平展 / 下压帧把 5 根翼骨扇开，膜才露得出来
  function notchedWing(x, y, pose, far, nq) {
    part(); nq = nq == null ? 0.3 : nq;
    const w = o.wing, W = WINGS_V[pose | 0] || WINGS_V[0], a0 = W[0], aT = W[1], fold = W[2], span = w.span, nf = w.fingers;
    const arm = span * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm, tips = [];
    for (let k = 0; k < nf; k++) { const q = k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = span * (0.62 - 0.12 * q) * (1 - 0.55 * fold); tips.push(wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl); }
    const bx = x - w.chord * (1 - 0.3 * fold), by = y + 1, mem = far ? m.wingFar : m.wing, bone = far ? m.boneFar : m.bone, p = [x, y, wx, wy];
    for (let k = 0; k < nf; k++) {
      p.push(tips[2 * k], tips[2 * k + 1]);
      const nx = k < nf - 1 ? tips[2 * k + 2] : bx, ny = k < nf - 1 ? tips[2 * k + 3] : by, dq = k < nf - 1 ? nq : 0.3;
      p.push(lerp((tips[2 * k] + nx) / 2, wx, dq), lerp((tips[2 * k + 1] + ny) / 2, wy, dq));
    }
    p.push(bx, by);
    U.poly(E, p, mem, 0);
    U.seg(E, x, y, wx, wy, pose === 3 ? 1 : 2, bone, 0);                                    // 臂骨（下压帧翼骨挤在一起，臂骨收成 1 格，免得挤成一块金）
    for (let k = 0; k < nf; k++) U.seg(E, lerp(wx, tips[2 * k], k ? 0.3 : 0), lerp(wy, tips[2 * k + 1], k ? 0.3 : 0), tips[2 * k], tips[2 * k + 1], 1, bone, k === 0 ? 4 : 3);
    U.dot(E, wx + (a0 > 0 ? 0 : 1), wy - 1, m.claw, 3);                                    // 腕部铰链
    swallowTail(x, y, W, far);
  }
  // 翼尾剪成燕尾（紧跟翼面画进同一个部件）：在翼后根往后伸出两个 3 格的尖
  function swallowTail(x, y, W, far) {
    const bx = R(x - o.wing.chord * (1 - 0.3 * W[2])), by = R(y + 1), mt = far ? m.wingFar : m.wing;
    sp(bx - 1, by, mt, 0); sp(bx - 2, by - 1, mt, 0); sp(bx - 3, by - 1, mt, 2);
    sp(bx - 1, by + 1, mt, 0); sp(bx - 2, by + 2, mt, 0); sp(bx - 3, by + 3, mt, 2);
  }
  function rivets(C) {
    const inBody = (x, y) => { const u = (x - C.x) / (o.rx + 0.35), v = (y - C.y) / (rig.ry + 0.35); return u * u + v * v < 0.62; };
    for (let y = R(C.y) - 3; y <= R(C.y) + 3; y++) for (const dx of [-4, 3]) if (inBody(R(C.x) + dx, y)) sp(R(C.x) + dx, y, m.body, 2);
    for (const [dx, dy] of [[-7, 0], [-5, -2], [-2, 1], [1, -3], [5, 0], [1, 2], [-6, 2]]) { const x = R(C.x) + dx, y = R(C.y) + dy; if (inBody(x, y)) sp(x, y, m.body, 4); }
  }
  // 候选部件：pylon 吊架——弹舱和机身之间的铁挂架（后半段机腹往上收，挂架跟着加高），中间一列铆钉
  function pylon(bx, by) {
    part(); const C = rig.C;
    for (let x = bx - 8; x <= bx + 4; x++) {
      const u = (x - C.x) / (o.rx + 0.35), bot = u * u < 1 ? Math.floor(C.y + (rig.ry + 0.35) * Math.sqrt(1 - u * u)) : by;
      for (let y = bot; y < by; y++) sp(x, y, M_BAY, x === bx - 8 ? 4 : ((x - bx) & 3) === 0 ? 2 : 0);
    }
  }
  function drawWreck() {                                                                   // 坠地残骸：趴地机身 + 摊开的翼 + 侧翻的弹舱 + 摔掉的喇叭 / 大檐帽
    const h = rig.head;
    notchedWing(rig.wing.x + 3, rig.wing.y - 1, 6, 1);
    part(); for (let x = -22; x <= -13; x++) { sp(x, -3, M_BAY, 0); sp(x, -2, M_BAY, x & 1 ? 2 : 0); sp(x, -1, M_BAY, 0); } for (let x = -22; x <= -13; x++) sp(x, -4, M_GOLD, x === -22 ? 4 : 0); sp(-17, -2, M_BAY, 4);
    F.body(E, rig, P, o); rivets(rig.C);
    notchedWing(rig.wing.x, rig.wing.y, 6, 0);
    const mx = R(rig.mouth[0]), my = R(rig.mouth[1]);
    fang(mx - 1, my - 1, M_FANGF); F.head(E, rig, P, o); fang(mx, my - 1, M_FANG);
    radarEar(R(h.x) - 2, R(h.y - h.r) - 1, 2, 0, M_DISH, 4);
    megaphone(13, -2, 4, -9);                                                               // 喇叭摔在机头前
    part(); for (let x = 21; x <= 24; x++) sp(x, -1, M_CAP, x === 24 ? 3 : 0); sp(22, -2, M_CAP, 0); sp(23, -2, M_GOLD, 4); sp(21, -2, M_CAP, 4);   // 大檐帽
    part(); sp(-11, -1, M_FIN, 0); sp(-10, -1, M_FIN, 2); sp(19, -1, M_POLE, 0); sp(18, -1, M_POLE, 0); sp(17, -1, M_FLAG, 0); sp(16, -1, M_FLAG, 2);   // 散落的尾翼、断旗
  }
  function drawHero() {
    begin(hero, P.bx, 0, 0);                                                                 // 贴地截断：弹舱不画进地面以下
    if (rig.lie === 2) { drawWreck(); return; }
    const C = rig.C, h = rig.head, wp = P.gf >= 0 && !rig.lie ? B.FLAP[P.gf] : P.wing, [bx, by] = bayAt(), [hx, hy] = hornAt(h), top = R(h.y - h.r * 0.9);
    const mx = R(rig.mouth[0]), my = R(rig.mouth[1]) + 1, spin = rig.lie === 1;
    const cx = spin ? bx + 8 : CMD_X, deck = spin ? bx + 10 : CMD_X + 2;                     // 坠落时指挥官缩在舱口
    notchedWing(rig.wing.x + 2, rig.wing.y - 1, wp, 1);                                     // 远翼
    radarEar(R(h.x - 5), top - 2, P.rad, P.eg, M_DISHF, 4);                                 // 远侧雷达耳
    pylon(bx, by);
    F.body(E, rig, P, o); rivets(C);
    bombBay(bx, by, P.door, deck);
    if (P.nb) bombs(bx, by, P.nb, P.drop, P.fin);
    commander(cx, by); flagArm(cx, by, P.flag);
    notchedWing(rig.wing.x, rig.wing.y, wp, 0);                                             // 近翼
    fang(mx - 1, my, M_FANGF);
    F.head(E, rig, P, o);
    fang(mx, my, M_FANG);
    radarEar(R(h.x - 3), top - 2, P.rad, P.eg, M_DISH, 4);
    megaphone(hx, hy, P.gem, top);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 喇叭脉冲环（光环读法）：预分配 5 个，从喇叭口往外扩的点阵椭圆，按 enemy 色阶变暗
  const RN = 5, rT = new Float32Array(RN).fill(9), rL = new Float32Array(RN), rMax = new Float32Array(RN), rC0 = new Uint8Array(RN);
  function pulse(max, life, c0) { let k = 0; for (let i = 1; i < RN; i++) if (rT[i] > rT[k]) k = i; rT[k] = 0; rL[k] = life; rMax[k] = max; rC0[k] = c0; }
  // 炸弹：3 枚，各自一条抛物线，落地爆炸
  const BN = 3, bT = new Float32Array(BN).fill(9), bX0 = new Float32Array(BN), bY0 = new Float32Array(BN), bX1 = new Float32Array(BN), bOn = new Uint8Array(BN);
  const B_FLY = 0.4, B_TX = [DUMMY_X, DUMMY_X + 9, DUMMY_X - 10];
  // 爆炸：每处一团外爆火球（直径 5 → 9 格，白芯 → 淡黄 → 橙 → 红边）+ 一朵蘑菇烟（烟柱 2 格宽往上长到 11 格，顶上 9×4 的烟帽，按 dust 色阶变暗）
  const eT = new Float32Array(BN).fill(9), eX = new Float32Array(BN), E_FB = 0.2, E_MUSH = 1.0;
  let chargeAcc = 0, trailAcc = 0, smokeAcc = 0, soulAcc = 0, wreckT = 9;
  const hornScr = () => [scrX(P.gx), HY + P.gy];
  function dropBomb(i) {
    const [bx, by] = bayAt(); bOn[i] = 1; bT[i] = 0; bX0[i] = scrX(bx + BOMB_X[i] + P.bx); bY0[i] = HY + by + 6; bX1[i] = B_TX[i];
    spawn(K_TRAIL, bX0[i], bY0[i] - 1, -6, -4, 0.2, R_EL);
  }
  function explode(i) {
    const x = bX1[i], y = HY - 3;
    burst(x, y, 20, 40, 110, 0.25, 0.55, R_EL, 18); ring(x, y - 1, 0, R_EL); fx.cross(x, y - 2, 4, R_EL, 0.2);
    eT[i] = 0; eX[i] = x;                                                                   // 火球 + 蘑菇烟（fxFront 里画）
    for (let k = 0; k < 5; k++) spawn(K_RISE, x + (Math.random() - 0.5) * 2, y - k * 1.5, (Math.random() - 0.5) * 3, -10 - Math.random() * 6, 0.5 + Math.random() * 0.3, FXI.dust);
    for (let k = 0; k < 6; k++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY - 1, (Math.random() - 0.5) * 40, -6 - Math.random() * 10, 0.35 + Math.random() * 0.25, FXI.dust);
    hitDummy(i === 0 ? 1 : 0, 1); if (i === 0) dummyFx({ dur: 1.0, tint: 'fire' });
    shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.6 });
  }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = hornScr();
      releaseOrbit(40, 90, 0.25, 0.5); burst(gx, gy, 12, 40, 100, 0.2, 0.45, AURA, 6); shake(0.28, 2); flash(0.05);
      pulse(26, 0.45, 0);                                                                   // 增伤光环：一大圈红环扫过身边友军
      allyFx({ dur: 1.5, outline: AURA }); for (const a of allyPoints()) fx.link(gx, gy, a.x, a.top + 2, AURA, 1.0, 1);
      dropBomb(0);
    }
  }
  function onTime(s, t) {
    if (s === IDLE && T_IRING.includes(t)) pulse(8, 0.5, 2);
    if (s === CHARGE) { const i = T_CRING.indexOf(t); if (i >= 0) pulse(8 + i * 5, 0.4 + i * 0.05, 1); }
    if (s === CAST) { const i = T_BOMB.indexOf(t); if (i >= 0) dropBomb(i + 1); }
    if (s === RECOVER && t === T_RRING) pulse(12, 0.7, 2);
    if (s === ATTACK && t === T_ATK) {
      const [gx, gy] = hornScr(), tx = DUMMY_X - 4, ty = HY - 16;
      shoot(1, gx + 1, gy, 150, tx, AURA, (ty - gy) * 150 / Math.max(1, tx - gx), { trail: false, glow: 2 }); pulse(4, 0.2, 0);
      sfx('swing', { kind: 'staff', w: 0.4 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === DEATH && t === T_SMOKE) { const [bx, by] = bayAt(); fx.cloud(scrX(bx), HY + by + 2, 4, SOOT, 0.6, 2); }
    if (s === DEATH && Math.abs(t - T_CRASH) < 1e-9) {                                    // 坠地：剩余炸弹殉爆一小下，翼骨崩飞，残骸留在地上
      const x = HX - 2;
      for (let i = 0; i < 6; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 10, HY - 6, (Math.random() - 0.5) * 90, -50 - Math.random() * 50, 0.9, FXI.holy, { g: 320, floor: HY });   // 崩飞的黄铜翼骨碎片
      burst(x, HY - 4, 22, 40, 110, 0.25, 0.55, R_EL, 20); ring(x, HY - 4, 0, R_EL); fx.cloud(x, HY - 8, 6, SOOT, 1.4, 2);
      for (let i = 0; i < 16; i++) spawn(K_DUST, x - 14 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.16, 2); flash(0.04); wreckT = 0; sfx('fall', { w: 0.75 });
    }
  }
  const EVENTS = [T_IRING, [], [T_ATK], T_CRING, T_BOMB, [T_RRING], [], [T_SMOKE, T_CRASH], []];
  function impactOn(k, x, y) { if (k === 1) { burst(x, y, 10, 30, 80, 0.15, 0.35, AURA, 6); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.35 }); } }
  function stepFX(dt, state, stT) {
    const [gx, gy] = hornScr();
    if (state === CHARGE) { chargeAcc += dt * (14 + 22 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, AURA, a, r, 4 + Math.random() * 3); } }
    if (state === MOVE) { trailAcc += dt * 9; while (trailAcc >= 1) { trailAcc -= 1; spawn(K_TRAIL, scrX(-6) + (Math.random() - 0.5) * 3, HY + R(rig.C.y) + 3, (P.flip ? 1 : -1) * (8 + Math.random() * 8), 3 + Math.random() * 4, 0.3 + Math.random() * 0.25, AURA); } }
    if (state === DEATH && stT > INCOMING && stT < T_CRASH) { smokeAcc += dt * 34; while (smokeAcc >= 1) { smokeAcc -= 1; const [bx, by] = bayAt(); spawn(K_RISE, scrX(bx) + (Math.random() - 0.5) * 6, HY + by + 2, (Math.random() - 0.5) * 8, -6 - Math.random() * 10, 0.6 + Math.random() * 0.4, SOOT); } }
    if (wreckT < 1.6) { smokeAcc += dt * 12; while (smokeAcc >= 1) { smokeAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 12, HY - 3, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.7 + Math.random() * 0.5, SOOT); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 30, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < BN; i++) {
      if (!bOn[i]) continue; bT[i] += dt;
      if (bT[i] >= B_FLY) { bOn[i] = 0; explode(i); continue; }
      const [x, y] = bombPos(i); spawn(K_TRAIL, x - 2 + Math.random(), y - 2 + Math.random() * 2, -10 - Math.random() * 6, -6 - Math.random() * 6, 0.18 + Math.random() * 0.12, R_EL);   // 尾焰：每步一颗火星
      if (((bT[i] * 60) | 0) % 4 === 0) spawn(K_RISE, x - 2, y - 2, -4, -6, 0.35, FXI.dust);
    }
    for (let k = 0; k < RN; k++) rT[k] += dt;
    for (let i = 0; i < BN; i++) eT[i] += dt;
    wreckT += dt;
  }
  function bombPos(i) { const q = clamp01(bT[i] / B_FLY), y1 = HY - 2; return [R(bX0[i] + (bX1[i] - bX0[i]) * q), R(bY0[i] - 10 * q + (y1 - bY0[i] + 10) * q * q)]; }
  function fxReset() { rT.fill(9); bOn.fill(0); bT.fill(9); eT.fill(9); chargeAcc = 0; trailAcc = 0; smokeAcc = 0; soulAcc = 0; wreckT = 9; }
  function fxBack(f12) {
    if (P.dq < 0.6 && P.lie < 2) { const a = P.lie ? P.lift : o.alt + P.lift, sx = scrX(0); groundShadow(sx, 13, a); for (let dx = -4; dx <= 4; dx++) put(sx + dx, E.FLOOR, 0); }
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, AU, f12);
    shotFloorGlow(f12);
  }
  function fxFront(f12) {
    const [gx, gy] = hornScr();
    for (let k = 0; k < RN; k++) {                                                          // 脉冲环
      if (rT[k] >= rL[k]) continue; const q = rT[k] / rL[k], r = 2 + rMax[k] * ease.out(q), c = AU[Math.min(4, rC0[k] + (q < 0.35 ? 1 : q < 0.7 ? 2 : 3))], n = Math.ceil(r * 5);
      for (let i = 0; i < n; i++) { if (((i + f12) & 1) && (q > 0.5 || rC0[k] >= 2)) continue; const a = i / n * 6.2832; put(R(gx + 1 + Math.cos(a) * r), R(gy + Math.sin(a) * r * 0.7), c); }
    }
    if (E.state === CHARGE && P.gem >= 2) { put(gx + 2, gy, AU[1]); put(gx + 3, gy, AU[2]); put(gx + 1, gy - 2, AU[2]); put(gx + 1, gy + 2, AU[2]); }
    if (E.state === ATTACK && P.gem === 3) { for (let j = -2; j <= 2; j++) put(gx + 2, gy + j, j === 0 ? AU[0] : AU[1]); put(gx + 3, gy, AU[1]); }
    for (let i = 0; i < BN; i++) {                                                          // 飞行中的炸弹（3×4：红尾翼 → 钢灰弹体 → 白弹头）：前半段横着飞、后半段弹头朝下
      if (!bOn[i]) continue; const [x, y] = bombPos(i), q = bT[i] / B_FLY;
      if (q < 0.45) { put(x - 3, y - 1, 26); put(x - 3, y + 1, 13); put(x - 2, y, 13); for (let k = -1; k <= 1; k++) { put(x + k, y - 1, 30); put(x + k, y, 29); put(x + k, y + 1, 28); } put(x - 1, y - 1, 13); put(x - 1, y, 13); put(x - 1, y + 1, 12); put(x + 2, y, 17); put(x + 2, y - 1, 21); put(x + 2, y + 1, 18); }
      else { put(x - 1, y - 4, 26); put(x + 1, y - 4, 13); put(x, y - 3, 13); for (let k = -2; k <= 0; k++) { put(x - 1, y + k, 30); put(x, y + k, 29); put(x + 1, y + k, 28); } put(x - 1, y - 2, 13); put(x, y - 2, 13); put(x + 1, y - 2, 12); put(x, y + 1, 17); put(x - 1, y + 1, 21); put(x + 1, y + 1, 18); }
    }
    const DU = FXR[FXI.dust];
    for (let i = 0; i < BN; i++) {                                                          // 爆炸火球 + 蘑菇烟
      const t = eT[i]; if (t >= E_MUSH) continue; const x = R(eX[i]), gy = HY - 1;
      if (t < E_FB) {                                                                       // 火球：外爆，外圈红、里圈橙黄、芯白（前 1/3 最亮）
        const q = t / E_FB, r = 2.5 + 2 * ease.out(q), cy = gy - R(r) - 1;
        for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) { const dd = Math.sqrt(dx * dx + dy * dy * 1.2); if (dd > r) continue; const lv = dd < r * 0.35 ? (q < 0.4 ? 0 : 1) : dd < r * 0.65 ? (q < 0.6 ? 1 : 2) : dd < r * 0.85 ? 2 : 3; put(x + dx, cy + dy, EL[lv]); }
      }
      if (t > 0.08) {                                                                       // 蘑菇烟：烟柱往上长，烟帽跟着升，越来越暗、最后隔点散掉
        const q = clamp01((t - 0.08) / (E_MUSH - 0.08)), hgt = R(4 + 7 * ease.out(Math.min(1, q * 1.6))), c = DU[Math.min(4, 1 + ((q * 4) | 0))], top = gy - hgt, sparse = q > 0.7;
        for (let y = gy - 1; y > top; y--) for (let dx = -1; dx <= 0; dx++) { if (sparse && ((x + dx + y) & 1)) continue; put(x + dx, y, c); }
        const cw = 3 + R(1.5 * Math.min(1, q * 2));
        for (let dy = -3; dy <= 0; dy++) { const w = dy === -3 ? cw - 2 : dy === 0 ? cw - 1 : cw; for (let dx = -w; dx <= w - 1; dx++) { if (sparse && ((x + dx + dy) & 1)) continue; put(x + dx, top + dy, dy === -3 || dx === -w ? DU[Math.max(0, Math.min(4, 1 + ((q * 4) | 0)) - 1)] : c); } }
      }
    }
  }
  function drawShot(k, x, y, d, f12) {                                                      // 声波弹：3 层同心红弧（前亮后暗）
    if (k !== 1) return false;
    for (let j = 0; j < 3; j++) { const cx = x - d * j * 2, rr = 1 + j, c = AU[1 + j]; for (let a = -3; a <= 3; a++) { const an = a * 0.4; put(R(cx + d * rr * Math.cos(an)), R(y + rr * Math.sin(an) * 1.3), c); } }
    put(x + d, y, AU[0]);
    return true;
  }

  return {
    name: '吸血蝠', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_HORN, M_CORE], HIT_POINT: [0, -19], EVENTS, ALLIES: 'skill',
    SFX: { body: 'machine', how: 'explode', pal: 'fire', style: 'meteor', w: 0.75, hover: 1 },
    REVIVE: { dy: -16 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
