// 金龙（部队 · 科技 · 射手 · 史诗）：一台整块黄铜铸造的发条机械龙——方正厚重的四足身躯、短粗颈，张开的下颌里伸出一截黄铜口炮（炮口扩口伸出吻前 3 格），
// 腹侧一扇圆形锅炉门（铁栅格里透出炉火光，发光体），背上一排 3 根短烟囱，一对齿轮骨翼（黄铜连杆翼骨 + 翼根 9 格大齿轮 + 铆钉红铜翼片）。
// 攻击：伏低后仰头，口炮「嘭」地射出一颗黄铜炮弹（微微抛物线），炮口冒一团白汽。
// 技能「爆炸炮弹」（特性：击杀目标时对附近敌人造成技能伤害）：锅炉门透亮、三根烟囱同时喷长汽、翼齿轮高速转、口炮多伸出 2 格、炮口映出橙光 →
// 一颗大号黄铜炮弹射出（下颌后坐、身体退 1 格）→ 目标被击杀式炸开：中心火球 + 一圈金色弹片，弹片落点在两侧各引爆一个小火球 → 炮管缩回、烟囱吐一圈黑烟。
// 死亡：侧卧散件——锅炉门「砰」地弹开 → 侧倒四脚朝天 → 小齿轮和铆钉从腹里滚出散落，炉火熄灭，烟囱冒最后一缕烟后消散。
// 身体用 parts-beast 的 quad（dragon 头型）+ B.wing 膜翼拼；口炮、锅炉门、烟囱、翼根齿轮、铆钉甲片是本模块的自画部件。升级 → 魔龙（口炮 → 轨道炮颚、锅炉 → 魔晶反应堆、齿轮骨翼 → 符文导管大翼）。
PCD.define('GoldenDragon', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_PHYS, K_BURST, K_TRAIL,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.fire, EL = FXR[R_EL];                                            // 爆炸炮弹 · 金焰：白 → 淡黄 → 橙 → 红 → 深红
  const R_COIN = FXI.coin, CN = FXR[R_COIN];                                        // 金色弹片
  const R_STEAM = fxRamp('boilerSteam', [21, 17, 31, 30, 29]);                      // 锅炉白汽
  const R_SMOKE = fxRamp('coalSmoke', [30, 29, 28, 27, 0]);                         // 收招 / 熄火的黑烟
  const m = B.mats(E, {
    main: 'gold',                                                                   // 鎏金黄铜装甲（身体 band 2）
    iron: 'iron', claw: 'iron', horn: 'iron',                                       // 铁关节、铁爪、铁短角
    wing: [0, 16, 16, 33], bone: 'gold',                                            // 红铜翼片（只用 16 / 33：不借黄铜的暗色 19，和金色身体、齿轮拉开色相）；翼骨是浅色黄铜连杆
    eye: [0, 13, 26, 21], glow: [44, 45, 46, 47],                                   // 猩红眼（熄灭时暗酒红 13）；张嘴 / 蓄力时口里的炉火光
  });
  m.fire = E.defMat([44, 45, 46, 47], 1, 1);                                        // 锅炉火（平涂，按档位手工取色调）
  m.hot = E.defMat([47, 47, 21, 21], 1, 1);                                         // 炉火透亮 / 炮口白热
  const WING = { span: 18, chord: 3, fingers: 3 };                                  // 后根距 3：翼后缘几乎竖直地立在肩上，腰背段留给烟囱
  // 本角色的翼姿表（格式同 B.WINGS：[臂角, 翼尖扇到的角, 收拢]）：1 竖帆（待机）· 2 半张（竖帆和张开之间，攻击 / 收招的过渡）· 5 张开 · 6 垂落
  const WP = [B.WINGS[0], [1.62, 0.4, 0.05], [1.28, 0.3, 0.03], B.WINGS[3], B.WINGS[4], B.WINGS[5], B.WINGS[6]];
  const WDX = 3;                                                                    // 翼根比库里的挂点前移 3 格（落在肩上），翼根齿轮跟着走
  const o = Q.shape({ len: 15, chest: 6.4, rump: 5.4, waist: 0, hump: 0.8, leg: 5, lw: 2, thigh: 2.6, farDx: -2, stride: 3, lift: 2, foot: 'claw',
    neck: 3, neckA: 0.5, neckW: 3.4, head: { type: 'dragon', w: 7, h: 6, snout: 5.5, snH: 4.8, tip: 0.85, horn: '', teeth: 0 }, headA: 0.1,
    tail: 'long', tailLen: 9, tailA: -0.05, tailW: 3.8, tailCurl: 0.3, mane: 'none', fur: 0, pattern: null, lieLegs: 1, m });

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(100, 56, 48, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 17], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'spec', 'claw', 'iron', 'fire', 'hot', 'glow', 'horn', 'bone', 'boneFar']) RIM.skip[m[k]] = 1;
  // 自己的姿势字段：gear 翼根齿轮相位 0–3 · fire 炉火 0 暗 / 1 常 / 2 亮 / 3 透亮 / 4 熄灭 · gun 口炮多伸出 0–2 · door 锅炉门 0 关 / 1 弹开 · puff 第几根烟囱掀盖 0–3
  const SPEC = Q.KEYS.concat(B.COMMON, [['gear', 0, 3], ['fire', 0, 4], ['gun', 0, 2], ['door', 0, 1], ['puff', 0, 3]]);
  const P = {};
  function reset() { Q.reset(P); P.gear = 0; P.fire = 1; P.gun = 0; P.door = 0; P.puff = 0; P.jaw = 2; P.wing = 1; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  // 翼姿不进插值，按帧手排（WING_ATK 等），用本角色自己的翼姿表 WP：竖帆 1 → 半张 2 → 张开 5，翼顶高度 18 → 16.6 → 13.6 格（离翼根），相邻姿势差 ≤ 3 行
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'tail', 'gun'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 2, tail: 0, gun: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ crouch: 2, pitch: 1, head: -1, jaw: 1, tail: 1 });            // 伏低、仰头、下颌咬住炮管
  const A_FIRE = pose({ bx: -2, crouch: 1, pitch: 1, head: -1, jaw: 3, tail: -1, gun: 1 });   // 「嘭」：后坐 2 格、下颌张到最大
  const A_HOLD = pose({ bx: -1, tail: -1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_FIRE, 'snap'], [0.25, A_FIRE, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  // 攻击翼姿（12 fps 逐帧）：竖帆 → 预兆半张 → 出手帧（第 2 帧）张开 → 张 → 半张 → 半张 → 竖帆（翼顶单调回到待机高度）
  const WING_ATK = [1, 2, 5, 5, 2, 2, 1, 1, 1, 1];
  const C_BRACE = pose({ crouch: 2, head: 1, tail: 1, gun: 2 });                        // 四爪扒地、低头瞄准（翼另排：张开稳住）
  const S_SHOT = pose({ bx: -1, crouch: 1, pitch: 1, head: 0, jaw: 3, tail: -2, gun: 2 });   // 施放：下颌后坐
  const T_FIRE = 2 / 12, T_SMOKE = 0.2, T_DOOR = INCOMING + 0.15, T_FALL = INCOMING + 0.66, T_LAST = INCOMING + 1.2;
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.jaw = 2; P.wing = 1; P.fire = f12 % 7 === 3 ? 2 : 1;   // 炉火偶尔一跳
    if (lp >= 1.4 - 1e-6 && lp < 2.25) {                                              // 待机个性「锅炉喷汽」：三根烟囱轮流掀盖吐汽 → 下颌咔哒两下，翼根齿轮空转一圈
      const k = Math.min(9, f12of(lp - 1.4)); P.gear = k & 3;
      if (k < 6) P.puff = 1 + (k >> 1); else P.jaw = k & 1 ? 2 : 0;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                           // 四足爬行：对角步态、金属爪落地顿挫 1 格，翼齿轮随步转
      const f = Q.anim.walk(P, tq); P.gear = f; P.jaw = 2; P.head = f & 1 ? 0 : 1; P.tail = [-1, 0, 1, 0][f];
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp); P.wing = WING_ATK[Math.min(WING_ATK.length - 1, R(tq * 12))];
      if (tq >= 0.12 - 1e-6 && tq < 0.34) { P.glow = 1; P.fire = 2; P.rim = 1; }
    } else if (st === CHARGE) {                                                       // 锅炉门透亮、烟囱喷长汽、齿轮高速转、口炮伸出、炮口映橙光
      E.mix(tmp, REST, C_BRACE, ease.inOut(clamp01(tq / 0.7)), F_ALL); apply(tmp); P.wing = tq < 0.17 ? 1 : tq < 0.34 ? 2 : 5;
      P.gun = tq < 0.35 ? 0 : tq < 0.6 ? 1 : 2; P.fire = tq < 0.45 ? 1 : tq < 0.9 ? 2 : ((f12 & 1) ? 3 : 2);
      P.gear = f12 & 3; P.glow = tq < 0.5 ? 1 : 2; P.rim = 2; P.puff = 1 + (f12 % 3);
      if (tq > 1.1) P.bob = f12 & 1;                                                  // 蓄满：机身震颤
    } else if (st === CAST) {
      E.mix(tmp, C_BRACE, S_SHOT, ease.out(clamp01(tq / 0.12)), F_ALL); apply(tmp); P.wing = 5;
      P.fire = 3; P.gear = f12 & 3; P.glow = 2; P.rim = 3;
    } else if (st === RECOVER) {                                                      // 炮管缩回、炉火回落、烟囱吐一圈黑烟
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_SHOT, REST, q, F_ALL); apply(tmp); P.wing = tq < 0.25 ? 5 : tq < 0.42 ? 2 : 1;
      P.gun = tq < 0.2 ? 2 : tq < 0.35 ? 1 : 0; P.fire = tq < 0.25 ? 2 : 1; P.glow = tq < 0.3 ? 1 : 0; P.rim = tq < 0.3 ? 2 : tq < 0.5 ? 1 : 0;
      P.gear = tq < 0.4 ? (f12 >> 1) & 3 : 0; if (tq >= T_SMOKE - 1e-6 && tq < 0.45) P.puff = 1 + (f12 % 3);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { Q.anim.hurt(P, h); if (h < 0.35) { P.wing = 1; P.fire = (f12 & 1) ? 2 : 0; P.puff = 2; P.jaw = 2; } }
    } else if (st === DEATH) {                                                        // 锅炉门弹开 → 侧倒四脚朝天 → 炉火熄灭
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        Q.anim.death(P, d, f12); P.door = d >= 0.15 - 1e-6 ? 1 : 0; P.wing = d < 0.3 ? 1 : 6; P.jaw = d < 0.5 ? 2 : 1;
        P.fire = d < 0.66 ? ((f12 & 1) ? 3 : 1) : d < 1.1 ? ((f12 & 1) ? 1 : 4) : 4;
        P.eyes = d < 0.3 ? 1 : d < 1.1 ? (f12 & 1) : 1;                                // 眼跟着炉火：先一闭，倒地后随炉火闪几下，熄火后灭
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o);
    const g = muzzle(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]);
    B.key(P, SPEC);
  }

  // ───── 自画部件 ─────
  // 候选部件：mouthCannon 口炮（插在张开 2 格的上下颌之间的一根黄铜炮管，屏幕上吸附到 0 / 1:2 斜率：
  //   管身 2 格粗——上排亮黄铜、下排基色；两道铁箍（口沿、炮口后）比管身暗一截；炮口扩口 4 格高、伸出吻尖 3 格（gun 再多伸）；炮膛 1 格墨色，蓄力时映炉火）
  const GUN_V = -0.1;                                                                 // 管身上排离嘴线的格数：压住上颌最下一行，管下留 1 行墨色口腔，下颌完整露出
  function gunGeom() {
    const F = Q.headFrame(rig, o, P.jaw), v = F.prof(F.uT)[2] + GUN_V;
    const p0 = F.at(F.uc + 0.5, v), pE = F.at(F.uT - 1, v), p1 = F.at(F.uT + 3.5 + (P.gun | 0), v);
    const t = (p1[1] - p0[1]) / Math.max(1, p1[0] - p0[0]), s = Math.abs(t) < 0.4 ? 0 : Math.sign(t) * 0.5;
    const xE = R(pE[0]), yE = R(pE[1]), yAt = (x) => yE + Math.floor((x - xE) * s + 0.5);   // 以吻尖处对齐（头微低时炮管不会掉到下颌上）
    const x1 = R(p1[0]);
    return { x0: R(p0[0]), x1, y1: yAt(x1), s, yAt };
  }
  function muzzle() { const G = gunGeom(); return [G.x1 + 1, G.y1]; }
  function mouthCannon() {
    part(); const G = gunGeom(), glowLv = P.glow | 0;
    for (let x = G.x0; x <= G.x1; x++) {
      const y = G.yAt(x), k = G.x1 - x;                                               // k：离炮口几列
      if (k <= 1) {                                                                   // 扩口：4 格高（上沿亮、下沿暗）
        U.dot(E, x, y - 1, m.limb, k ? 3 : 4); U.dot(E, x, y + 2, m.limb, 2);
        if (k) { U.dot(E, x, y, m.limb, 4); U.dot(E, x, y + 1, m.limb, 3); }
        else { U.dot(E, x, y, glowLv ? m.fire : m.ink, glowLv >= 2 ? 4 : glowLv ? 3 : 0); U.dot(E, x, y + 1, m.limb, 2); }   // 炮膛 1 格
        continue;
      }
      const band = k === 2 || k === 6;                                                 // 铁箍：炮口后一道、嘴里一道
      U.dot(E, x, y, band ? m.iron : m.limb, band ? 3 : 4); U.dot(E, x, y + 1, band ? m.iron : m.limb, band ? 2 : 3);
    }
  }
  // 候选部件：boilerDoor 锅炉门（腹侧圆门：铁框 + 两根竖栅，栅间透出炉火 5 档；door 1 = 门向后弹开成一块竖铁板、炉口敞着）
  function doorAt() {
    const cx = R(lerp(rig.C2.x, rig.C1.x, 0.52)), s = Q.span(rig, o, cx);
    return [cx, s ? (rig.lie === 2 ? s[0] + 3 : R(lerp(s[0], s[1], 0.62))) : R(rig.C1.y)];
  }
  function fireDot(x, y, e) {                                                         // e：离炉心的远近 0 中 / 1 边
    const lv = P.fire | 0;
    if (lv === 4) { U.dot(E, x, y, m.ink, 0); return; }
    if (lv === 3) { U.dot(E, x, y, e ? m.fire : m.hot, e ? 4 : 3); return; }
    U.dot(E, x, y, m.fire, e ? lv + 1 : lv + 2);
  }
  function boilerDoor() {                                                              // 不另起部件：嵌在躯干里，铁框本身就是暗色，不再压一圈勾线
    const [cx, cy] = doorAt();
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.hypot(dx, dy); if (d > 3.2) continue;
      if (d > 2.1) { U.dot(E, cx + dx, cy + dy, m.iron, dx + dy < -2 ? 4 : 0); continue; }                   // 铁框
      if (!P.door && (dx === -1 || dx === 1)) { U.dot(E, cx + dx, cy + dy, m.iron, 2); continue; }           // 竖栅
      fireDot(cx + dx, cy + dy, d > 1.2 ? 1 : 0);
    }
    if (!P.door) U.dot(E, cx + 3, cy, m.iron, 4);                                                           // 门闩
    else for (let dy = -3; dy <= 3; dy++) { U.dot(E, cx - 5, cy + dy, m.iron, dy === -3 ? 4 : 0); if (Math.abs(dy) < 3) U.dot(E, cx - 4, cy + dy, m.iron, 2); }   // 弹开的门板
  }
  // 候选部件：chimneys 背烟囱（腰背段一排短烟囱：2 格铁筒 + 3 格黄铜帽檐（向后翻的风帽，前沿和筒齐平），
  //   高度从后往前 2 / 3 / 4 格；相邻两根帽檐之间隔 3 格（勾线 + 1 格空 + 勾线），纯黑剪影里是 3 个独立的小凸起；puff = k 时第 k 根的帽掀起 1 格）
  const CHIM = [[-8.5, 4], [-14.5, 3], [-20.5, 2]];                                   // [筒左列离胸心的 x, 高出背线格数]（前 → 后）：筒在 x −1 / −7 / −13
  function chimBase(x) {                                                            // 背线取两列里高的那一列（臀坡上也立得稳）；[背线 y, 左列背线, 右列背线]
    const a = Q.span(rig, o, x), b = Q.span(rig, o, x + 1); if (!a && !b) return null;
    const ya = a ? a[0] : b[0], yb = b ? b[0] : ya; return [Math.min(ya, yb), ya, yb];
  }
  function chimTop(i) { const x = R(rig.C1.x + CHIM[i][0]), b = chimBase(x); return [x, (b ? b[0] : R(rig.C1.y - 6)) - CHIM[i][1] - 1]; }
  function chimneys() {
    part();
    for (let i = 0; i < CHIM.length; i++) {
      const x = R(rig.C1.x + CHIM[i][0]), b = chimBase(x); if (!b) continue; const top = b[0] - CHIM[i][1], lid = P.puff === i + 1 ? 1 : 0;
      for (let y = b[1] - 1; y > top; y--) U.dot(E, x, y, m.iron, 4);                                     // 铁筒：左列亮、右列暗（逐格一深一浅像铆接的筒节），一直插到各自那一列的背线
      for (let y = b[2] - 1; y > top; y--) U.dot(E, x + 1, y, m.iron, (y & 1) ? 2 : 3);
      for (let k = -1; k <= 1; k++) U.dot(E, x + k, top - lid, m.limb, k < 1 ? 4 : 3);                 // 黄铜帽檐 3 格
      if (lid) { U.dot(E, x, top, m.ink, 0); U.dot(E, x + 1, top, m.ink, 0); }
    }
  }
  // 候选部件：plateWing 铆钉铜片翼（膜翼画法同 B.wing，但吃自己的翼姿表 WP，好插一个「半张」过渡姿：
  //   红铜翼片（只用 16 / 33）+ 浅色黄铜连杆翼骨（臂骨 2 格、3 根翼指 1 格，全长连续的 05 亮线）+ 每片翼膜中线上两颗亮铆钉 + 腕部铁销）
  function plateWing(x, y, pose, far) {
    part();
    const W = WP[pose | 0] || WP[1], a0 = W[0], aT = W[1], fold = W[2], S = WING.span, nf = WING.fingers;
    const arm = S * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm, T = [];
    for (let k = 0; k < nf; k++) { const q = k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = S * (0.62 - 0.12 * q) * (1 - 0.55 * fold); T.push([wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl]); }
    const bx = x - WING.chord * (1 - 0.3 * fold), by = y + 1, mem = far ? m.wingFar : m.wing, bone = far ? m.boneFar : m.bone;
    const p = [x, y, wx, wy];
    for (let k = 0; k < nf; k++) {                                                   // 两指之间的膜边往腕部凹（扇贝边），最后一段凹得最深
      const n = k < nf - 1 ? T[k + 1] : [bx, by], dq = k < nf - 1 ? 0.12 : 0.4;
      p.push(T[k][0], T[k][1], lerp((T[k][0] + n[0]) / 2, wx, dq), lerp((T[k][1] + n[1]) / 2, wy, dq));
    }
    p.push(bx, by); U.poly(E, p, mem, 0);
    U.seg(E, x, y, wx, wy, 2, bone, far ? 0 : 4);                                    // 臂骨（连杆）
    for (let k = 0; k < nf; k++) U.seg(E, wx, wy, T[k][0], T[k][1], 1, bone, far ? 0 : 4);   // 翼指（连杆）：全长画满，近翼是连续的浅色斜线
    if (far) return;
    const pts = [T[0], T[1], T[2], [bx, by]];
    for (let k = 0; k < 3; k++) { const mx = (pts[k][0] + pts[k + 1][0]) / 2, my = (pts[k][1] + pts[k + 1][1]) / 2; for (const q of [0.45, 0.72]) U.dot(E, lerp(wx, mx, q), lerp(wy, my, q), m.wing, 4); }
    U.dot(E, wx, wy, m.iron, 3);                                                     // 腕部铁销：连杆在这里铰接
  }
  function wingRoot() { return [R(rig.wing.x) + WDX, rig.wing.y]; }
  function cogAt() {                                                                // 齿轮中心：翼根那一列、背线往上 2 格
    const [x] = wingRoot(), s = Q.span(rig, o, x); return [x, s ? s[0] - 2 : R(rig.wing.y) - 2];
  }
  // 候选部件：cog 齿轮（9 × 9，单独一个部件：5 × 5 凹下去的暗盘面（tone 2）+ 一圈 1 格亮轮缘（tone 4）+ 半径 4 上 8 个 1 格亮齿
  //   （相邻两齿之间空 2 格，压上一圈勾线）+ 盘面里一根 3 格亮辐条随 gear 转 45° + 1 格铁轴心；齿每档转 22.5°（两套齿位交替）。翼根、关节都能用）
  function cog(cx, cy, ph) {
    part(); cx = R(cx); cy = R(cy); const g = ph & 3;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d2 = dx * dx + dy * dy; if (d2 > 10) continue;
      U.dot(E, cx + dx, cy + dy, m.limb, d2 > 5 ? 4 : 2);                                                    // 亮轮缘 / 暗盘面
    }
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + (g & 1) * Math.PI / 8; U.dot(E, cx + R(Math.cos(a) * 4), cy + R(Math.sin(a) * 4), m.limb, 4); }   // 8 个亮齿
    const sa = g * Math.PI / 4;                                                                              // 辐条：穿过轴心，每档转 45°
    for (const r of [-1, 1]) U.dot(E, cx + R(Math.cos(sa) * r), cy + R(Math.sin(sa) * r), m.limb, 3);
    U.dot(E, cx, cy, m.iron, 3);                                                                             // 铁轴心
  }
  // 躯干 + 铆钉甲片（紧跟 Q.body，并进躯干部件）：腰线一道接缝、上半身每 9 列一道竖缝、缝头一颗亮铆钉、腹底一条铁龙骨
  function platedBody() {
    Q.body(E, rig, P, o);
    const x0 = Math.floor(rig.C2.x - rig.C2.r) + 1, x1 = Math.ceil(rig.C1.x + rig.C1.r) - 1, bx0 = R(rig.C2.x), lie = rig.lie === 2;
    for (let x = x0 + 1; x < x1; x++) {
      const s = Q.span(rig, o, x); if (!s || s[1] - s[0] < 5) continue; const ym = R(lerp(s[0], s[1], lie ? 0.4 : 0.5));
      U.dot(E, x, ym, m.body, 2);
      if (((x - bx0 + 45) % 9) === 4) { for (let y = s[0] + 3; y < ym; y++) U.dot(E, x, y, m.body, 2); U.dot(E, x + 1, s[0] + 3, m.body, 4); }   // 甲片竖缝（每 9 列一道，缝头一颗亮铆钉）
      if (!lie) U.dot(E, x, s[1], m.iron, (x & 1) ? 2 : 3);
    }
    const NB = rig.NB, NT = rig.NT;                                                   // 颈上两道铁箍
    for (const q of [0.3, 0.75]) { const cx = lerp(NB.x, NT.x, q), cy = lerp(NB.y, NT.y, q); for (let k = -2; k <= 2; k++) U.dot(E, cx + k * 0.35, cy + k, m.iron, k === -2 ? 4 : 2); }
  }
  // 腿 + 关节螺栓（紧跟 Q.leg，并进腿部件）
  function boltLeg(i) {
    Q.leg(E, rig, P, o, i); const L = rig.legs[i]; if (rig.lie === 2) return;
    U.dot(E, lerp(L.T[0], L.F[0], 0.5) + (L.front ? 0 : 1), lerp(L.T[1], L.F[1], 0.5), m.iron, L.far ? 2 : 3);
  }
  // 尾 + 分节（紧跟 Q.tail，并进尾部件）：每 3 节一道节缝
  function segTail() {
    Q.tail(E, rig, P, o);
    const n = o.tailLen, sw = (P.tail | 0) * 0.2; let x = rig.tail.x, y = rig.tail.y, a = rig.lie === 2 ? -0.05 : o.tailA;
    for (let k = 0; k < n; k++) {
      const q = k / n, r = lerp(o.tailW * 0.5, 0.5, q);
      if (k % 3 === 2 && k < n - 1 && r >= 1) for (let j = -R(r); j <= R(r) - 1; j++) U.dot(E, x, y + j, m.limb, j === -R(r) ? 4 : 2);
      a += (o.tailCurl * q * 0.35) + sw * (0.25 + q) * 0.35; x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) { y = -0.5; a = 0; }
    }
  }
  // 头 + 铁颌铰 + 吻背甲缝 + 眼（紧跟 Q.head，并进头部件）：甲缝从眼前 2 格才起，眼和眉骨最后画，谁也盖不住
  function plateHead() {
    Q.head(E, rig, P, o); const F = Q.headFrame(rig, o, P.jaw);
    const h = F.at(F.uc - 0.5, F.vc + 0.8); U.dot(E, h[0], h[1], m.iron, 3);
    for (let u = F.W * 0.4 + 2.2; u < F.uT - 1; u += 1) { const p = F.at(u, F.top(u) + 1.2); U.dot(E, p[0], p[1], m.limb, 2); }
    const ex = R(rig.eye[0]), ey = R(rig.eye[1]), lit = P.eyes ? 2 : 3;               // 2 格猩红眼（闭眼 / 熄火 = 暗酒红）+ 1 格眉骨亮边
    U.dot(E, ex, ey, m.eye, lit); U.dot(E, ex - 1, ey, m.eye, lit); U.dot(E, ex - 1, ey - 1, m.limb, 4); U.dot(E, ex, ey - 1, m.limb, 4);
  }
  function drawHero() {
    begin(hero, P.bx, 0); const lie = rig.lie === 2, [wx, wy] = wingRoot(), [gx, gy] = cogAt();
    plateWing(wx + 2, wy - 1, P.wing, 1);                                          // 远翼
    if (!lie) { boltLeg(0); boltLeg(1); }                                            // 远侧后、前腿
    segTail(); platedBody(); boilerDoor();
    if (!lie) { boltLeg(2); boltLeg(3); }                                            // 近侧后、前腿
    plateWing(wx, wy, P.wing, 0);                                                   // 近翼
    if (!lie) chimneys();                                                            // 腰背段 3 根烟囱（翼后缘之后）
    plateHead(); Q.horn(E, rig, P, o);
    cog(gx, gy, P.gear);                                                             // 翼根大齿轮：单独一个部件，压在翼骨、烟囱前面（近侧翼根比颈根离镜头近，也压住后脑一角，右下齿才露得全）
    mouthCannon();
    if (lie) { boltLeg(0); boltLeg(1); boltLeg(2); boltLeg(3); }                     // 侧躺伸腿：腿在最前
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, steamAcc = 0, emberAcc = 0, soulAcc = 0, lastGf = -9, lastPuff = 0, mzT = 9, mzX = 0, mzY = 0, secT = 9, secX = 0, lastT = 9, lastX = 0, lastY = 0, gearT = 9;
  const DX = DUMMY_X, DY = HY - 14;
  const muzScr = () => [scrX(P.gx), HY + P.gy];
  const chimScr = (i) => { const c = chimTop(i); return [scrX(c[0] + P.bx) + (P.flip ? -1 : 1) * 0.5, HY + c[1]]; };
  const doorScr = () => { const d = doorAt(); return [scrX(d[0] + P.bx), HY + d[1]]; };
  // 炮弹抛物线：弹道本身直线飞，画的时候按进度往上抬（k 1 攻击小弹 / 2 技能大弹）
  const SH = { x0: [0, 0, 0], tx: [0, 0, 0], arc: [0, 5, 3], t: [9, 9, 9], vx: [0, 150, 170], vy: [0, 0, 0], y0: [0, 0, 0] };
  const arcY = (k, x) => { const p = clamp01((x - SH.x0[k]) / Math.max(1, SH.tx[k] - SH.x0[k])); return -R(SH.arc[k] * 4 * p * (1 - p)); };
  function fire(k, x, y, tx) { SH.x0[k] = x; SH.tx[k] = tx; SH.t[k] = 0; SH.y0[k] = y; SH.vy[k] = (DY - 2 - y) * SH.vx[k] / Math.max(1, tx - x); shoot(k, x, y, SH.vx[k], tx, R_EL, SH.vy[k], { trail: false, glow: k === 2 ? 1 : 2 }); }
  // 爆炸火球（最多 3 个）与金色弹片（12 片 2×1）：预分配
  const FB = { x: new Float32Array(3), y: new Float32Array(3), t: new Float32Array(3).fill(9), r: new Float32Array(3) };
  function fireball(x, y, r) { let i = 0; for (let k = 1; k < 3; k++) if (FB.t[k] > FB.t[i]) i = k; FB.x[i] = x; FB.y[i] = y; FB.t[i] = 0; FB.r[i] = r; }
  const NSH = 12, SHR = { x: new Float32Array(NSH), y: new Float32Array(NSH), vx: new Float32Array(NSH), vy: new Float32Array(NSH), t: 9 };
  function shrapnel(x, y) { SHR.t = 0; for (let i = 0; i < NSH; i++) { const a = -Math.PI * (0.05 + 0.9 * i / (NSH - 1)), v = 55 + (i % 3) * 20; SHR.x[i] = x; SHR.y[i] = y; SHR.vx[i] = Math.cos(a) * v; SHR.vy[i] = Math.sin(a) * v * 0.9; } }
  // 散落的齿轮 / 铆钉（死亡）：[横速, 大小 0 小 / 1 大]
  const GEARS = [[-40, 1], [-22, 0], [26, 1], [42, 0], [14, 0]];
  function smallBlast(x, y) { fireball(x, y, 4); burst(x, y, 12, 25, 70, 0.2, 0.45, R_EL, 8); ring(x, y, 0, R_EL); shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.4 }); }
  function onEnter(s) {
    if (s === CAST) {                                                                 // 大号黄铜炮弹出膛
      poseAt(CAST, 0, E.simT); const [mx, my] = muzScr();
      releaseOrbit(20, 50, 0.2, 0.45, { up: 4 });
      fire(2, mx + 2, my, DX - 2); mzT = 0; mzX = mx; mzY = my;
      fx.cross(mx + 2, my, 6, R_EL, 0.2); burst(mx + 1, my, 10, 25, 70, 0.2, 0.45, R_EL, 4); burst(mx, my - 1, 12, 10, 30, 0.4, 0.8, R_STEAM, 6); ring(mx + 2, my, 0, R_STEAM);
      shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'fire' });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) {                                               // 「嘭」：口炮射出黄铜炮弹，炮口冒一团白汽
      poseAt(ATTACK, t, E.simT); const [mx, my] = muzScr(); mzT = 0; mzX = mx; mzY = my;
      fire(1, mx + 1, my, DX - 4); burst(mx + 1, my, 5, 20, 50, 0.12, 0.3, R_EL, 2);
      for (let i = 0; i < 7; i++) spawnX(K_RISE, mx + 1 + Math.random() * 3, my - Math.random() * 2, 6 + Math.random() * 10, -6 - Math.random() * 8, 0.5 + Math.random() * 0.4, R_STEAM, { age0: 0.1 });
      sfx('swing', { kind: 'gun', w: 0.6 }); sfx('shoot', { proj: 'bullet' });
    }
    if (s === RECOVER && t === T_SMOKE) {                                             // 烟囱吐出一圈黑烟
      for (let i = 0; i < 3; i++) { const [cx, cy] = chimScr(i); burst(cx, cy - 1, 6, 8, 18, 0.5, 0.9, R_SMOKE, 10); }
    }
    if (s === HURT && t === INCOMING) {                                               // 金属受击：火星更多更快 + 两颗长寿命白火星
      burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 10, 40, 100, 0.15, 0.4, FXI.steel, 14);
      for (let i = 0; i < 2; i++) spawnX(K_PHYS, HX + HIT_POINT[0], HY + HIT_POINT[1], -20 - Math.random() * 30, -30 - Math.random() * 20, 0.8, FXI.impact, { g: 160, floor: FLOOR - 1 });
    }
    if (s === DEATH && t === T_DOOR) {                                                // 锅炉门「砰」地弹开：一口炉火喷出来
      poseAt(DEATH, t, E.simT); const [dx, dy] = doorScr();
      burst(dx, dy, 12, 30, 80, 0.2, 0.5, R_EL, 6); burst(dx, dy, 6, 40, 90, 0.2, 0.4, FXI.steel, 10);
    }
    if (s === DEATH && t === T_FALL) {                                                // 侧倒落地：尘土 + 齿轮 / 铆钉滚出
      poseAt(DEATH, t, E.simT);
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 18 + Math.random() * 36, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust);
      const [dx, dy] = doorScr(); gearT = 0;
      for (let i = 0; i < 5; i++) spawnX(K_PHYS, dx + (Math.random() - 0.5) * 3, dy, (Math.random() - 0.5) * 60, -30 - Math.random() * 30, 1.6, R_COIN, { g: 200, floor: FLOOR - 1, age0: 0.2 });
      shake(0.12, 1); sfx('fall', { w: 0.8 });
    }
    if (s === DEATH && t === T_LAST) { poseAt(DEATH, t, E.simT); lastT = 0; lastX = scrX(R(rig.C2.x) + P.bx); lastY = HY + R(rig.C2.y - rig.C2.r * 0.7); }
  }
  const EVENTS = [[], [], [T_FIRE], [], [], [T_SMOKE], [INCOMING], [T_DOOR, T_FALL, T_LAST], []];
  function impactOn(k, x, y) {
    const yy = y + arcY(k, x);
    if (k === 1) { fireball(x, yy, 3); burst(x, yy, 10, 30, 80, 0.15, 0.4, R_EL, 6); hitDummy(0, 1); sfx('hit', { mat: 'flesh', w: 0.5 }); }
    if (k === 2) {                                                                    // 击杀式爆开：中心火球 + 金色弹片环
      fireball(x, yy, 7); burst(x, yy, 36, 40, 110, 0.3, 0.7, R_EL, 10); burst(x, yy, 10, 60, 120, 0.2, 0.5, R_COIN, 6);
      ring(x, yy, 1, R_EL); fx.cross(x, yy, 7, R_EL, 0.25); shrapnel(x, yy); secT = 0; secX = x;
      hitDummy(1, 1); dummyFx({ dur: 0.8, tint: R_EL }); shake(0.12, 1);
      sfx('hit', { mat: 'flesh', w: 0.8 }); sfx('impact', { pal: 'fire', w: 0.8 });
    }
  }
  function stepFX(dt, state, stT) {
    const [mx, my] = muzScr();
    for (let k = 1; k <= 2; k++) if (SH.t[k] < 2) {                                   // 炮弹拖尾（跟着抛物线）
      const x = SH.x0[k] + SH.vx[k] * SH.t[k];
      if (x < SH.tx[k] && Math.random() < (k === 2 ? 1 : 0.6)) spawn(K_TRAIL, x - 3, SH.y0[k] + SH.vy[k] * SH.t[k] + arcY(k, x) + (Math.random() < 0.5 ? 0 : 1), -15 - Math.random() * 20, Math.random() * 6 - 3, 0.15 + Math.random() * (k === 2 ? 0.3 : 0.15), R_EL);
      SH.t[k] += dt;
    }
    if (secT < 9) {                                                                   // 弹片落点：两侧各引爆一个小火球
      const was = secT; secT += dt;
      if (was < 0.16 && secT >= 0.16) { smallBlast(secX - 16, FLOOR - 4); smallBlast(secX + 16, FLOOR - 4); secT = 9; }
    }
    if (state === IDLE) {
      if (P.puff && P.puff !== lastPuff) { const [cx, cy] = chimScr(P.puff - 1); for (let i = 0; i < 5; i++) spawnX(K_RISE, cx + Math.random() * 2, cy - 1, -3 + Math.random() * 4, -10 - Math.random() * 10, 0.6 + Math.random() * 0.4, R_STEAM, { age0: 0.1 }); }
      emberAcc += dt * 1.4; while (emberAcc >= 1) { emberAcc -= 1; const [dx, dy] = doorScr(); spawn(K_EMBER, dx + R(Math.random() * 3 - 1), dy + 2, Math.random() * 4 - 2, -4 - Math.random() * 4, 0.4 + Math.random() * 0.3, R_EL); }
    }
    lastPuff = P.puff;
    if (state === MOVE && P.gf !== lastGf) {                                          // 金属爪落地「咣」：每步 2 颗尘土
      if (P.gf === 0 || P.gf === 2) {
        const feet = P.gf === 0 ? [3, 0] : [1, 2];
        for (const i of feet) { const F = rig.legs[i].F; spawn(K_DUST, scrX(R(F[0]) + P.bx), HY, (Math.random() - 0.5) * 16, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); }
        const [cx, cy] = chimScr(0); spawnX(K_RISE, cx, cy - 1, (P.flip ? 1 : -1) * 6, -8, 0.5, R_STEAM, { age0: 0.15 });
        sfx('step', { w: 0.8 });
      }
      lastGf = P.gf;
    }
    if (state === CHARGE) {                                                           // 三根烟囱同时喷长汽 + 炉火星螺旋吸进炮口
      steamAcc += dt * (12 + 30 * clamp01(stT / DUR[CHARGE]));
      while (steamAcc >= 1) { steamAcc -= 1; const [cx, cy] = chimScr((Math.random() * 3) | 0); spawnX(K_RISE, cx + Math.random() * 2, cy - 1, (P.flip ? 1 : -1) * (2 + Math.random() * 6), -22 - Math.random() * 16, 0.6 + Math.random() * 0.4, R_STEAM, { age0: 0.05 }); }
      chargeAcc += dt * (10 + 18 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + Math.random() * 7, a = Math.random() * 6.2832; spawn(K_SPIRAL, mx, my, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === RECOVER && stT < 0.4) { emberAcc += dt * 12; while (emberAcc >= 1) { emberAcc -= 1; spawnX(K_RISE, mx + Math.random() * 2, my - 1, 2 + Math.random() * 4, -8 - Math.random() * 6, 0.5 + Math.random() * 0.3, R_SMOKE, { age0: 0.1 }); } }
    if (state === DEATH && lastT < 1.2) { soulAcc += dt * 10; while (soulAcc >= 1) { soulAcc -= 1; spawnX(K_RISE, lastX + Math.random() * 3, lastY - Math.random() * 2, -2 + Math.random() * 4, -10 - Math.random() * 8, 0.8 + Math.random() * 0.5, R_SMOKE, { age0: 0.05 }); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { emberAcc += dt * 18; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 30, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.6 + Math.random() * 0.6, R_EL); } }
    for (let i = 0; i < 3; i++) FB.t[i] += dt;
    mzT += dt; SHR.t += dt; lastT += dt; gearT += dt;
  }
  function fxReset() {
    chargeAcc = 0; steamAcc = 0; emberAcc = 0; soulAcc = 0; lastGf = -9; lastPuff = 0; mzT = 9; secT = 9; lastT = 9; gearT = 9; SHR.t = 9;
    for (let k = 0; k < 3; k++) { SH.t[k] = 9; FB.t[k] = 9; }
  }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12);
  }
  function drawFireballs(f12) {
    for (let i = 0; i < 3; i++) {
      const t = FB.t[i]; if (t >= 0.42) continue; const r = FB.r[i] * ease.out(Math.min(1, t / 0.12)), cx = R(FB.x[i]), cy = R(FB.y[i]), rr = Math.ceil(r);
      for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
        const d = Math.hypot(dx, dy * 1.15) / Math.max(1, r); if (d > 1) continue;
        if (t > 0.18 && B8[((cy + dy) & 7) * 8 + ((cx + dx) & 7)] < (t - 0.18) / 0.24 + d * 0.3) continue;
        put(cx + dx, cy + dy, t < 0.05 ? 21 : d < 0.4 ? EL[t < 0.2 ? 1 : 2] : d < 0.75 ? EL[t < 0.2 ? 2 : 3] : EL[t < 0.2 ? 3 : 4]);
      }
    }
  }
  function drawShrapnel() {
    if (SHR.t >= 0.6) return; const t = SHR.t, q = t / 0.6, c = q < 0.15 ? CN[0] : q < 0.35 ? CN[1] : q < 0.6 ? CN[2] : q < 0.82 ? CN[3] : CN[4];
    for (let i = 0; i < NSH; i++) { const x = R(SHR.x[i] + SHR.vx[i] * t), y = Math.min(FLOOR - 1, R(SHR.y[i] + SHR.vy[i] * t + 70 * t * t)); put(x, y, c); put(x + (SHR.vx[i] > 0 ? -1 : 1), y, q < 0.5 ? CN[2] : CN[3]); }
  }
  // 滚出的铁齿轮：大 5×5（盘 + 4 齿，每滚一格换 + / × 齿形）· 小 3×3；最后按抖动消散
  function drawGears() {
    if (E.state !== DEATH || gearT > 2.4) return; const [dx0] = doorScr(), dq = clamp01((gearT - 0.94) / 0.8);
    for (let i = 0; i < GEARS.length; i++) {
      const [v, big] = GEARS[i], tt = Math.min(gearT, 0.9), x = R(dx0 + v * (1 - Math.exp(-tt * 3)) / 3 * 3.6), hop = gearT < 0.32 ? R(5 * 4 * (gearT / 0.32) * (1 - gearT / 0.32)) : 0;
      const r = big ? 2 : 1, cy = FLOOR - 1 - r - hop, roll = (R(x) >> 1) & 1;
      for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
        const d2 = xx * xx + yy * yy, tooth = big ? (roll ? (xx === 0 || yy === 0) : Math.abs(xx) === Math.abs(yy)) : (roll ? (xx === 0 || yy === 0) : true);
        if (big && d2 > 4.5) continue; if (big && d2 > 2 && !tooth) continue; if (!big && d2 === 2 && !roll) continue;
        if (dq && B8[((cy + yy) & 7) * 8 + ((x + xx) & 7)] < dq) continue;
        put(x + xx, cy + yy, d2 === 0 ? 0 : xx + yy < 0 ? 30 : xx + yy > 0 ? 28 : 29);   // 铁齿轮（和黄铜身体拉开）
      }
    }
  }
  function fxFront(f12) {
    if (mzT < 2 / 12) {                                                               // 炮口焰：十字 + 往前喷的火舌
      const c = mzT < 1 / 12 ? 21 : EL[1];
      for (let r = 1; r <= 4; r++) put(mzX + r, mzY, r < 3 ? c : EL[2]);
      put(mzX + 1, mzY - 1, EL[1]); put(mzX + 1, mzY + 1, EL[1]); put(mzX + 2, mzY - 2, EL[2]); put(mzX + 2, mzY + 2, EL[2]);
    }
    drawFireballs(f12); drawShrapnel(); drawGears();
  }
  function drawShot(k, x, y, d, f12, Rr) {
    const yy = y + arcY(k, x);
    if (k === 1) {                                                                    // 黄铜小炮弹：3×2 弹体 + 尖头 + 火尾
      put(x - d, yy, 19); put(x, yy, 14); put(x + d, yy, 5); put(x - d, yy - 1, 14); put(x, yy - 1, 5); put(x + 2 * d, yy, 21);
      put(x - 2 * d, yy, Rr[1]); put(x - 3 * d, yy - (f12 & 1), Rr[2]); put(x - 2 * d, yy - 1, Rr[3]); return true;
    }
    if (k === 2) {                                                                    // 大号黄铜炮弹：7 格宽菱形 + 旋转高光 + 火尾
      for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) {
        const e = Math.abs(i) + Math.abs(j) * 1.5; if (e > 3.2) continue;
        put(x + i * d, yy + j, e > 2.4 ? 20 : i * d + j < -1 ? 5 : i * d + j > 1 ? 19 : 14);
      }
      const h = [[-1, -1], [1, -1], [1, 1], [-1, 1]][f12 & 3]; put(x + h[0], yy + h[1], 21);
      for (let r = 4; r <= 7; r++) put(x - r * d, yy + (r === 6 ? (f12 & 1) - 1 : 0), Rr[Math.min(4, r - 3)]);
      put(x - 5 * d, yy - 1, Rr[2]); put(x - 5 * d, yy + 1, Rr[3]);
      return true;
    }
    return false;
  }

  return {
    name: '金龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.fire, m.hot, m.glow, m.eye], HIT_POINT, EVENTS,
    SFX: { body: 'machine', how: 'topple', pal: 'fire', style: 'meteor', w: 0.8 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
