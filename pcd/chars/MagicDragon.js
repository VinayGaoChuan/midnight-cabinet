// 魔龙（部队 · 科技 · 射手 · 神话）：金龙进化成的巨型悬浮机械龙——紫黑钢装甲 + 鎏金镶边，四只脚底换成喷口、离地 4 格悬浮，前高后低昂首。
// 承接金龙的三个识别特征：口炮 → 上下两片平行的轨道炮颚（中间夹一根魔晶导轨，颚尖伸出吻前 6 格）；锅炉门 → 胸口魔晶反应堆（紫晶被三道黄铜环绕着转）；
// 3 根烟囱 → 3 根尖顶散热鳍塔；齿轮骨翼 → 大翼（黄铜翼骨 + 翼根大齿轮，紫黑钢片翼膜上沿翼骨嵌一排发光符文导管）。
// 攻击：昂头张颚，两片炮颚之间射出一道 2 格宽的紫焰光束直达目标。
// 技能「爆炸炮弹（魔晶版）」：三道黄铜环收紧越转越快、魔晶 1→3 档、翼上导管从翼梢往翼根逐节点亮、导轨上跑紫白光点、喷口火舌加大 →
// 一道 3 格宽的紫芯火边巨型光束横贯到目标（后坐退 2 格）→ 目标炸成紫焰冲击环 + 火焰外爆，两侧依次连锁三个小爆点 → 环慢下来、导管从根到梢熄灭、颚合拢冒一缕紫烟。
// 死亡：融化——反应堆过载闪紫白 → 喷口熄火坠地 → 外壳烧红、按列熔成一滩（死亡套件 melt），魔晶最后裂成碎片熄灭，蒸汽上升后消散。
// 身体用 parts-beast 的 quad（dragon 头型）+ B.wing 膜翼；轨道炮颚、反应堆、散热鳍塔、喷口、翼上导管、翼根齿轮是本模块的自画部件。
PCD.define('MagicDragon', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_PHYS, K_BURST,
    spawn, spawnX, burst, releaseOrbit, clearOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, groundShadow, death } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = fxRamp('violetFire', [21, 43, 24, 45, 44]), EL = FXR[R_EL];         // 魔焰 · 紫芯火：白 → 淡紫 → 紫 → 红橙 → 深红
  const R_FIRE = FXI.fire, FI = FXR[R_FIRE];                                        // 爆炸火球
  const R_MAG = FXI.magic;                                                          // 导管 / 导轨的青紫光点
  const R_SHARD = fxRamp('crystalShard', [21, 43, 24, 42, 25]);                     // 魔晶碎片
  const R_STEAM = fxRamp('meltSteam', [21, 17, 60, 59, 8]);                         // 熔化蒸汽
  const SPEC0 = { main: [0, 53, 42, 54], gold: 'gold', iron: 'iron', wing: [0, 52, 53, 54], bone: 'gold', claw: 'gold', horn: 'gold',
    eye: [0, 0, 43, 21], glow: [24, 24, 43, 43] };
  const m = B.mats(E, SPEC0);                                                       // 紫黑钢装甲（亮面偏紫）、鎏金连杆 / 翼骨 / 角、紫黑钢片翼膜
  m.crys = E.defMat([25, 42, 24, 43], 1, 1); m.crysHot = E.defMat([43, 43, 21, 21], 1, 1);   // 魔晶（平涂，按档位取色调）
  m.cond = E.defMat([25, 24, 23, 22], 1, 1);                                        // 符文导管 / 魔晶导轨（magic 青紫）
  m.jet = E.defMat([44, 45, 46, 47], 1, 1); m.jetHot = E.defMat([47, 47, 21, 21], 1, 1);   // 喷口火
  const mh = Object.assign({}, m, { body: E.defMat([44, 55, 45, 46], 2), limb: E.defMat([44, 55, 45, 46], 1), far: E.defMat([44, 55, 55, 45], 1),
    wing: E.defMat([44, 55, 56, 45], 2), wingFar: E.defMat([44, 55, 55, 56], 1), gold: E.defMat([44, 45, 46, 47], 1) });   // 熔化前烧红的外壳
  const WING = { span: 20, chord: 9, type: 'membrane', fingers: 4 };
  const SHAPE = { len: 18, chest: 8, rump: 6, waist: 0.2, hump: 1.2, leg: 6, lw: 2, thigh: 3, farDx: -2, stride: 3, lift: 2, foot: 'claw',
    neck: 5, neckA: 0.85, neckW: 3.4, head: { type: 'dragon', w: 8, h: 6.4, snout: 6.5, snH: 4.2, tip: 0.8, horn: 'back', hornLen: 7, teeth: 0 }, headA: 0.15,
    tail: 'long', tailLen: 11, tailA: -0.1, tailW: 4.6, tailCurl: 0.35, mane: 'none', fur: 0, pattern: null, lieLegs: 1 };
  const o = Q.shape(Object.assign({}, SHAPE, { m })), oHot = Q.shape(Object.assign({}, SHAPE, { m: mh }));
  const shp = () => (P.hot ? oHot : o), M = () => (P.hot ? mh : m);

  const HX = 34, HOVER = 4, DUR = DEFAULT_DUR.slice(), hero = new Sprite(116, 72, 56, 66);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'spec', 'claw', 'iron', 'glow', 'crys', 'crysHot', 'cond', 'jet', 'jetHot', 'horn', 'bone', 'boneFar', 'gold']) RIM.skip[m[k]] = 1;
  // 自己的姿势字段：rph 反应堆环相位 0–7 · rt 环收紧 0–2 · crys 魔晶 0 暗 / 1 常 / 2 亮 / 3 过载 / 4 裂灭 · cmask 翼导管 4 节点亮灭（位 0 翼根 … 位 3 翼梢）
  //   chot 导管白热 · jet 喷口火舌 0–3 · hot 外壳烧红 · rail 导轨光点 0 无 / 1–3 位置
  const SPEC = Q.KEYS.concat(B.COMMON, [['rph', 0, 7], ['rt', 0, 2], ['crys', 0, 4], ['cmask', 0, 15], ['chot', 0, 1], ['jet', 0, 3], ['hot', 0, 1], ['rail', 0, 3]]);
  const P = {};
  function reset() { Q.reset(P); P.rph = 0; P.rt = 0; P.crys = 1; P.cmask = 0; P.chot = 0; P.jet = 1; P.hot = 0; P.rail = 0; P.lift = HOVER; P.pitch = 1; P.wing = 1; P.jaw = 1; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = [R(rig.C1.x - 1), R(rig.C1.y)];

  // ───── 姿势 ─────
  const T_BEAM = 2 / 12, T_HIT = 1 / 12, T_CHAIN = [0.18, 0.3, 0.42], T_SLAM = INCOMING + 0.5, T_MELT = INCOMING + 0.66, T_SHATTER = INCOMING + 1.3;
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.rph = (f12 >> 1) & 7; P.jet = 1 + (f12 & 1); P.crys = f12 % 9 === 4 ? 2 : 1;
    if (lp >= 1.4 - 1e-6 && lp < 2.1) { const k = Math.min(5, f12of(lp - 1.4)); P.cmask = k < 4 ? 1 << k : k === 4 ? 15 : 0; if (k === 4) P.crys = 2; }   // 待机个性：翼导管从根到梢依次亮一遍
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                           // 喷射悬浮：四足喷口火舌、身体上下飘 1 格、垂着的四足对角划动
      const f = Math.floor(tq * 6 + 1e-6) & 3; P.gf = f; P.bob = [0, -1, 0, 1][f]; P.tail = [-1, 0, 1, 0][f]; P.jet = f & 1 ? 2 : 3; P.rph = f12 & 7;
      P.wing = [1, 1, 4, 4][f]; P.head = f & 1 ? 0 : -1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                       // 昂头张颚 → 颚间射出紫焰光束
      if (tq < 0.12) { P.head = -2; P.jaw = 2; P.rail = 1 + (f12 % 3); P.rim = 1; P.crys = 2; }
      else if (tq < 0.34) { P.head = -1; P.jaw = 3; P.rail = 3; P.bx = -1; P.rim = 2; P.crys = 2; P.jet = 3; }
      else if (tq < 0.5) { P.head = -1; P.jaw = 2; P.bx = -1; P.rim = 1; }
      else idle(tq, f12);
    } else if (st === CHARGE) {                                                       // 环收紧越转越快、魔晶 1→3、导管从翼梢往翼根逐节点亮、导轨跑光点
      const q = clamp01(tq / 0.7); P.head = q > 0.4 ? -1 : 0; P.jaw = q < 0.3 ? 1 : q < 0.6 ? 2 : 3; P.pitch = 2; P.wing = q < 0.4 ? 1 : 5; P.bx = q > 0.3 ? -1 : 0; P.tail = 1;
      P.rt = tq < 0.4 ? 0 : tq < 0.9 ? 1 : 2; P.rph = Math.floor(tq * tq * 14 + tq * 6 + 1e-6) & 7;
      P.crys = tq < 0.45 ? 1 : tq < 0.9 ? 2 : ((f12 & 1) ? 3 : 2);
      const n = Math.max(0, Math.min(4, Math.floor((tq - 0.15) / 0.22 + 1e-6))); P.cmask = (15 << (4 - n)) & 15;
      P.rail = 1 + (f12 % 3); P.jet = tq < 0.5 ? 2 : 3; P.rim = tq < 1.1 ? 2 : 3;
      if (tq > 1.1) P.bob = f12 & 1;
    } else if (st === CAST) {                                                         // 巨型光束：后坐退 2 格
      const k = f12of(tq); P.head = 0; P.jaw = 3; P.pitch = 2; P.wing = 5; P.tail = -2; P.bx = k === 0 ? -1 : -2;
      P.rt = 2; P.rph = f12 & 7; P.crys = 3; P.cmask = 15; P.chot = k < 3 ? 1 : 0; P.rail = 3; P.jet = 3; P.rim = 3;
    } else if (st === RECOVER) {                                                      // 环慢下来、导管从根到梢熄灭、颚合拢
      const q = ease.inOut(clamp01(tq / 0.6)); P.bx = q < 0.4 ? -1 : 0; P.jaw = q < 0.3 ? 3 : q < 0.6 ? 2 : 1; P.wing = q < 0.5 ? 5 : 1; P.pitch = q < 0.5 ? 2 : 1;
      P.rt = q < 0.3 ? 2 : q < 0.6 ? 1 : 0; P.rph = (f12 >> 1) & 7; P.crys = q < 0.3 ? 2 : 1;
      const k = Math.min(4, Math.floor(tq / 0.12 + 1e-6)); P.cmask = (15 << k) & 15; P.rim = q < 0.4 ? 2 : q < 0.7 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { Q.anim.hurt(P, h); P.lift = HOVER; P.pitch = 1; if (h < 0.35) { P.wing = 1; P.crys = (f12 & 1) ? 3 : 0; P.jet = (f12 & 1) ? 3 : 0; P.jaw = 2; } else { P.wing = 1; P.jaw = 1; } }
    } else if (st === DEATH) {                                                        // 反应堆过载 → 喷口熄火坠地 → 外壳烧红 → 融化（死亡套件接管）
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { Q.anim.hurt(P, Math.min(d, 0.19)); P.lift = HOVER; P.pitch = 1; P.wing = 1; P.jaw = 2; P.crys = 3; P.chot = f12 & 1; P.cmask = (f12 & 1) ? 15 : 0; P.rim = (f12 & 1) ? 3 : 1; P.jet = (f12 & 1) ? 3 : 1; P.rph = f12 & 7; }
      else if (d < 0.5) { const k = Math.min(2, f12of(d - 0.3)); P.lift = [3, 1, 0][k]; P.pitch = -1; P.head = 2; P.jaw = 1; P.wing = 6; P.eyes = 1; P.jet = 0; P.crys = (f12 & 1) ? 3 : 4; P.bx = -2; }
      else { P.lift = 0; P.crouch = 3; P.pitch = -2; P.head = 3; P.jaw = 1; P.wing = 6; P.eyes = 1; P.jet = 0; P.crys = 4; P.bx = -2; P.hot = d >= 0.58 - 1e-6 ? 1 : 0; if (d >= 0.66 - 1e-6) P.dq = 1; }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, shp());
    const g = railTip(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]);
    B.key(P, SPEC);
  }

  // ───── 自画部件 ─────
  // 候选部件：railJaw 轨道炮颚（上下两片平行的金属颚板沿头部方向伸出吻前 ext 格，中间一根发光导轨；张嘴时下颚板跟着下颚张开，rail 为导轨上跑动的光点位置）
  const EXT = 6;
  function railFrame() { return Q.headFrame(rig, shp(), P.jaw); }
  const railV = (F, u) => F.prof(Math.min(u, F.uT))[2] + F.gap(u) * 0.5 + 0.5;
  function railTip() { const F = railFrame(), u = F.uT + EXT; return F.at(u + 0.5, railV(F, u)); }
  function railJaw() {
    part(); const F = railFrame(), mm = M(), u0 = F.uc + 0.5, uE = F.uT + EXT, hot = P.rail;
    Q.scanHead(F, uE + 4, (x, y, u, v) => {
      if (u < u0 || u > uE + 0.5) return; const uu = Math.min(u, F.uT), vm = F.prof(uu)[2], g = F.gap(u), top = u > F.uT ? vm - 1.6 : F.prof(uu)[0] - 0.2;
      if (v >= vm - 1.6 && v <= vm - 0.1 && (u > F.uT - 1 || v >= top)) { U.dot(E, x, y, mm.gold, v < vm - 1 ? 4 : 0); return; }                 // 上颚板
      if (v >= vm + g + 0.6 && v <= vm + g + 2.1) { U.dot(E, x, y, mm.gold, v > vm + g + 1.5 ? 2 : 0); return; }                               // 下颚板
      if (g > 0.8 && u > F.uc + 1.5 && u < uE - 0.5 && Math.abs(v - railV(F, u)) < 0.5) {                                                     // 魔晶导轨
        const lit = hot && ((R(u) + hot * 2) % 5 === 0); U.dot(E, x, y, lit ? m.crysHot : m.cond, lit ? 3 : P.rim >= 2 ? 4 : 2);
      }
    });
  }
  // 候选部件：reactor 胸口魔晶反应堆（一颗菱形晶体 + 三道黄铜环错相转动：环的后半圈画在晶体后、前半圈画在晶体前；rt 收紧、rph 相位、crys 5 档）
  function reactorAt() { const C = rig.C1; return rig.lie === 2 ? [C.x, C.y - 2] : [C.x + 1.5, C.y + 0.5]; }
  function crysDot(x, y, e) {
    const lv = P.crys | 0;
    if (lv === 4) { U.dot(E, x, y, m.crys, e ? 1 : 2); return; }
    if (lv >= 2) { U.dot(E, x, y, e ? (lv === 3 ? m.crysHot : m.crys) : m.crysHot, e ? (lv === 3 ? 3 : 4) : 3); return; }
    U.dot(E, x, y, m.crys, e ? lv + 2 : lv + 3);
  }
  function ringPts(cx, cy, k, back, fn) {
    const rx = 5.2 - P.rt * 0.8, ph = P.rph * Math.PI / 8 + k * Math.PI / 3, ry = Math.max(0.6, rx * Math.abs(Math.cos(ph))), th = k * Math.PI / 3, c = Math.cos(th), s = Math.sin(th);
    for (let i = 0; i < 28; i++) { const a = i / 28 * 2 * Math.PI, sb = Math.sin(a) < 0; if (sb !== back) continue; const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry; fn(cx + ex * c - ey * s, cy + ex * s + ey * c, Math.cos(a)); }
  }
  function reactor() {
    part(); const [cx, cy] = reactorAt(), mm = M();
    for (let k = 0; k < 3; k++) ringPts(cx, cy, k, true, (x, y) => U.dot(E, x, y, mm.gold, 2));
    for (let dy = -4; dy <= 4; dy++) for (let dx = -3; dx <= 3; dx++) { const e = Math.abs(dx) * 1.3 + Math.abs(dy); if (e > 4.1) continue; crysDot(cx + dx, cy + dy, e > 2 ? 1 : 0); }
    if ((P.crys | 0) === 4) { U.dot(E, cx, cy - 1, m.ink, 0); U.dot(E, cx + 1, cy, m.ink, 0); }                                              // 裂纹
    for (let k = 0; k < 3; k++) ringPts(cx, cy, k, false, (x, y, ca) => U.dot(E, x, y, mm.gold, ca < -0.3 ? 4 : 0));
  }
  // 候选部件：finTowers 尖顶散热鳍塔（沿背线一排 3 格宽的塔：每 2 行一道鳍缝、顶上 1 格尖；承接金龙的烟囱）
  const TOW = [[-6, 6], [-10, 5], [-14, 4]];
  function towTop(i) { const x = R(rig.C1.x + TOW[i][0]), s = Q.span(rig, shp(), x); return [x, (s ? s[0] : R(rig.C1.y - 7)) - TOW[i][1] - 1]; }
  function finTowers() {
    part(); const mm = M();
    for (let i = 0; i < TOW.length; i++) {
      const x = R(rig.C1.x + TOW[i][0]), s = Q.span(rig, shp(), x); if (!s) continue; const top = s[0] - TOW[i][1];
      for (let y = s[0] + 1; y > top; y--) for (let k = -1; k <= 1; k++) U.dot(E, x + k, y, (s[0] - y) % 2 === 1 ? m.iron : mm.gold, k === -1 ? 4 : k === 1 ? 2 : 0);
      U.dot(E, x, top, mm.gold, 4); U.dot(E, x, top - 1, mm.gold, 4);                                                                        // 尖顶
      if (P.chot || P.rim >= 3) U.dot(E, x, top + 2, m.crysHot, 3);
    }
  }
  // 翼几何（和 B.wing 同一套）
  function wingGeom(x, y, pose) {
    const W = B.WINGS[pose | 0], a0 = W[0], aT = W[1], fold = W[2], S = WING.span, nf = WING.fingers;
    const arm = S * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm, T = [];
    for (let k = 0; k < nf; k++) { const q = k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = S * (0.62 - 0.12 * q) * (1 - 0.55 * fold); T.push([wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl]); }
    return { wx, wy, T };
  }
  // 候选部件：conduitWing 符文导管翼（B.wing 膜翼 + 紧跟着画的导管节点：臂骨中点、腕、每根翼指 0.5 / 0.85 处各一个发光节点，cmask 位 0 翼根 … 位 3 翼梢）
  function conduitWing(x, y, pose, far) {
    B.wing(E, x, y, pose, WING, M(), far); if (far || rig.lie === 2) return;
    const g = wingGeom(x, y, pose), on = (b) => (P.cmask >> b) & 1, node = (px, py, b) => U.dot(E, px, py, on(b) && P.chot ? m.crysHot : m.cond, on(b) ? (P.chot ? 3 : 4) : 1);
    node(lerp(x, g.wx, 0.5), lerp(y, g.wy, 0.5), 0); node(g.wx, g.wy, 1);
    for (const T of g.T) { node(lerp(g.wx, T[0], 0.45), lerp(g.wy, T[1], 0.45), 2); node(lerp(g.wx, T[0], 0.78), lerp(g.wy, T[1], 0.78), 3); }
  }
  // 候选部件：cog 齿轮（同金龙：实心盘 + 8 齿按相位转 + 轴心）
  function cog(cx, cy, r, ph) {
    part(); cx = R(cx); cy = R(cy); const mm = M();
    for (let dy = -R(r); dy <= R(r); dy++) for (let dx = -R(r); dx <= R(r); dx++) if (dx * dx + dy * dy <= r * r + 0.3) U.dot(E, cx + dx, cy + dy, mm.gold, 0);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + ph * Math.PI / 16; U.dot(E, cx + Math.cos(a) * (r + 1), cy + Math.sin(a) * (r + 1), mm.gold, (k & 3) === 3 ? 4 : 0); }
    U.dot(E, cx, cy, m.cond, P.rim >= 2 ? 4 : 2);
  }
  // 躯干 + 鎏金镶边（紧跟 Q.body，并进躯干部件）：背线一道金边、每 5 列一道金色甲缝、腹底金龙骨
  function trimBody() {
    const oo = shp(), mm = M(); Q.body(E, rig, P, oo);
    const x0 = Math.floor(rig.C2.x - rig.C2.r) + 1, x1 = Math.ceil(rig.C1.x + rig.C1.r) - 1, bx0 = R(rig.C2.x), lie = rig.lie === 2;
    for (let x = x0 + 1; x < x1; x++) {
      const s = Q.span(rig, oo, x); if (!s || s[1] - s[0] < 5) continue;
      U.dot(E, x, s[0] + 1, mm.gold, (x & 1) ? 0 : 4);
      if (((x - bx0 + 40) % 5) === 0) for (let y = s[0] + 2; y < R(lerp(s[0], s[1], 0.7)); y++) U.dot(E, x, y, mm.gold, 2);
      if (!lie) U.dot(E, x, s[1], mm.gold, 2);
    }
    const NB = rig.NB, NT = rig.NT;                                                   // 颈上三道金箍
    for (const q of [0.2, 0.5, 0.8]) { const cx = lerp(NB.x, NT.x, q), cy = lerp(NB.y, NT.y, q); for (let k = -2; k <= 2; k++) U.dot(E, cx + k * 0.5, cy + k * 0.8, mm.gold, k === -2 ? 4 : 0); }
  }
  // 候选部件：jetLeg 喷口腿（Q.leg + 紧跟着画的脚底喷口：3 格铁喷嘴 + jet 档火舌）
  function jetLeg(i) {
    Q.leg(E, rig, P, shp(), i); const L = rig.legs[i]; if (rig.lie === 2) return;
    const fx = R(L.F[0]), fy = R(L.F[1]);
    for (let k = -1; k <= 1; k++) { U.dot(E, fx + k, fy, m.iron, k === -1 ? 4 : 2); U.dot(E, fx + k, fy + 1, m.iron, 1); }
    const n = P.jet | 0;
    for (let j = 0; j < n; j++) { U.dot(E, fx, fy + 2 + j, j === 0 && n >= 3 ? m.jetHot : m.jet, j === 0 ? 4 : j === n - 1 ? 2 : 3); if (j < n - 1 && n >= 2) { U.dot(E, fx - 1, fy + 2 + j, m.jet, 2); U.dot(E, fx + 1, fy + 2 + j, m.jet, 2); } }
  }
  function goldHead() {
    const oo = shp(), mm = M(); Q.head(E, rig, P, oo); const F = Q.headFrame(rig, oo, P.jaw);
    for (let u = -F.W * 0.6; u < F.uT - 1; u += 1) { const p = F.at(u, F.top(u) + 1); U.dot(E, p[0], p[1], mm.gold, u < 0 ? 4 : 0); }         // 额顶到吻背的金色甲脊
  }
  function drawHero() {
    begin(hero, P.bx, -0); const lie = rig.lie === 2, oo = shp();
    conduitWing(rig.wing.x + 2, rig.wing.y - 1, P.wing, 1);
    if (!lie) { jetLeg(0); jetLeg(1); }
    Q.tail(E, rig, P, oo); trimBody(); reactor();
    if (!lie) { jetLeg(2); jetLeg(3); }
    conduitWing(rig.wing.x, rig.wing.y, P.wing, 0);
    cog(rig.wing.x, rig.wing.y, 2.5, P.rph & 3);
    if (!lie) finTowers();
    goldHead(); Q.horn(E, rig, P, oo); railJaw();
    if (lie) { jetLeg(0); jetLeg(1); jetLeg(2); jetLeg(3); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, steamAcc = 0, lastGf = -9, bmT = 9, bmBig = 0, bmX = 0, bmY = 0, meltT = 9, mX = 0, mY = 0;
  const DX = DUMMY_X, DY = HY - 14;
  const tipScr = () => [scrX(P.gx), HY + P.gy];
  const coreScr = () => { const c = reactorAt(); return [scrX(R(c[0]) + P.bx), HY + R(c[1])]; };
  const FB = { x: new Float32Array(4), y: new Float32Array(4), t: new Float32Array(4).fill(9), r: new Float32Array(4) };
  function fireball(x, y, r) { let i = 0; for (let k = 1; k < 4; k++) if (FB.t[k] > FB.t[i]) i = k; FB.x[i] = x; FB.y[i] = y; FB.t[i] = 0; FB.r[i] = r; }
  const CHAIN = [[-12, 2], [13, -3], [-22, 5]];                                      // 连锁小爆点：[相对目标 x, 相对 y]
  function onEnter(s) {
    if (s === CAST) {                                                                 // 巨型光束出颚
      poseAt(CAST, 0, E.simT); const [tx, ty] = tipScr(); bmT = 0; bmBig = 1; bmX = tx; bmY = ty;
      releaseOrbit(30, 70, 0.2, 0.4, { to: [DX, DY, 5] }); fx.cross(tx + 1, ty, 7, R_EL, 0.25); burst(tx, ty, 12, 30, 80, 0.2, 0.4, R_EL, 4);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_BEAM) {                                               // 紫焰细光束
      poseAt(ATTACK, t, E.simT); const [tx, ty] = tipScr(); bmT = 0; bmBig = 0; bmX = tx; bmY = ty;
      burst(DX - 3, DY, 10, 30, 80, 0.15, 0.4, R_EL, 6); ring(DX - 3, DY, 0, R_EL); hitDummy(0, 1);
      sfx('swing', { kind: 'gun', w: 0.7 }); sfx('hit', { mat: 'flesh', w: 0.6 });
    }
    if (s === CAST && t === T_HIT) {                                                  // 目标炸成紫焰冲击环 + 火焰外爆
      fireball(DX, DY, 8); burst(DX, DY, 36, 40, 120, 0.3, 0.7, R_FIRE, 10); burst(DX, DY, 16, 50, 110, 0.2, 0.5, R_EL, 8);
      ring(DX, DY, 1, R_EL); ring(DX, DY, 0, R_FIRE); hitDummy(1, 1); dummyFx({ dur: 0.9, tint: R_EL }); shake(0.12, 1);
      sfx('impact', { pal: 'fire', w: 1.0 });
    }
    if (s === CAST && T_CHAIN.includes(t)) {                                          // 两侧中范围依次连锁爆开
      const c = CHAIN[T_CHAIN.indexOf(t)], x = DX + c[0], y = DY + 6 + c[1];
      fireball(x, y, 4); burst(x, y, 12, 30, 80, 0.2, 0.45, R_EL, 8); burst(x, y, 6, 20, 50, 0.2, 0.4, R_FIRE, 4); shake(0.1, 1);
      sfx('impact', { pal: 'arcane', w: 0.45 });
    }
    if (s === HURT && t === INCOMING) {
      burst(HX + HIT_POINT[0], HY + HIT_POINT[1] - HOVER, 10, 40, 100, 0.15, 0.4, FXI.steel, 14);
      for (let i = 0; i < 3; i++) spawnX(K_PHYS, HX + HIT_POINT[0], HY + HIT_POINT[1] - HOVER, -20 - Math.random() * 30, -30 - Math.random() * 20, 0.8, R_SHARD, { g: 160, floor: FLOOR - 1 });
    }
    if (s === DEATH && t === T_SLAM) {                                                // 坠地
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 20 + Math.random() * 40, HY - 1, (Math.random() - 0.5) * 34, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.14, 1); sfx('fall', { w: 1.0 });
    }
    if (s === DEATH && t === T_MELT) {                                                // 烧红的外壳交给死亡套件：按列熔成一滩
      poseAt(DEATH, T_MELT - 1 / 12, T_MELT - 1 / 12); const [cx, cy] = coreScr(); mX = cx; mY = cy;
      drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('melt', { fadeAt: 1.3, fadeDur: 0.6 }); meltT = 0;
    }
    if (s === DEATH && t === T_SHATTER) {                                             // 魔晶裂成碎片熄灭
      for (let i = 0; i < 14; i++) spawnX(K_PHYS, mX, HY - 3, (Math.random() - 0.5) * 60, -30 - Math.random() * 40, 0.7 + Math.random() * 0.4, R_SHARD, { g: 200, floor: FLOOR - 1 });
      ring(mX, HY - 3, 0, R_SHARD); sfx('impact', { pal: 'arcane', w: 0.3 });
    }
  }
  const EVENTS = [[], [], [T_BEAM], [], [T_HIT].concat(T_CHAIN), [], [INCOMING], [T_SLAM, T_MELT, T_SHATTER], []];
  function stepFX(dt, state, stT) {
    const [tx, ty] = tipScr(), [cx, cy] = coreScr();
    if (state === IDLE || state === MOVE || state === ATTACK || state === HURT) {      // 喷口下掉紫焰余烬
      emberAcc += dt * (state === MOVE ? 7 : 3);
      while (emberAcc >= 1) { emberAcc -= 1; const L = rig.legs[(Math.random() * 4) | 0]; spawnX(K_PHYS, scrX(R(L.F[0]) + P.bx), HY + R(L.F[1]) + 2 + (P.jet | 0), (Math.random() - 0.5) * 8, 10 + Math.random() * 10, 0.35 + Math.random() * 0.2, R_EL, { g: 20, floor: FLOOR - 1, age0: 0.3 }); }
    }
    if (state === MOVE && P.gf !== lastGf) { if (P.gf === 0 || P.gf === 2) sfx('step', { w: 0.3 }); lastGf = P.gf; }
    if (state === CHARGE) {                                                           // 紫火粒子从翼梢一路螺旋汇进胸口反应堆
      chargeAcc += dt * (14 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 9, a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, cx, cy, (r - 2) / (0.35 + Math.random() * 0.3), 0, 9, (chargeAcc * 7 | 0) & 1 ? R_MAG : R_EL, { a, r, w: 5 + Math.random() * 3, tx: cx, ty: cy }); }
      if (Math.random() < dt * 14) spawn(K_EMBER, tx + Math.random() * 2, ty, 4 + Math.random() * 6, -4 - Math.random() * 4, 0.3 + Math.random() * 0.2, R_EL);
    }
    if (state === RECOVER && stT > 0.25 && stT < 0.6) { steamAcc += dt * 14; while (steamAcc >= 1) { steamAcc -= 1; spawnX(K_RISE, tx - 1 + Math.random() * 2, ty - 1, 2 + Math.random() * 4, -8 - Math.random() * 6, 0.6 + Math.random() * 0.4, R_EL, { age0: 0.35 }); } }
    if (state === DEATH && meltT < 2.2) {                                             // 熔滩边缘冒泡 + 蒸汽上升
      steamAcc += dt * (meltT < 1.3 ? 22 : 10);
      while (steamAcc >= 1) { steamAcc -= 1; const bub = Math.random() < 0.5 && meltT < 1.3; spawnX(K_RISE, HX - 22 + Math.random() * 42, HY - 1 - Math.random() * 3, (Math.random() - 0.5) * 5, -8 - Math.random() * (bub ? 6 : 16), bub ? 0.3 + Math.random() * 0.2 : 0.8 + Math.random() * 0.6, bub ? R_FIRE : R_STEAM, { age0: bub ? 0.3 : 0.1 }); }
    }
    bmT += dt; meltT += dt; for (let i = 0; i < 4; i++) FB.t[i] += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; steamAcc = 0; lastGf = -9; bmT = 9; meltT = 9; for (let i = 0; i < 4; i++) FB.t[i] = 9; }
  function fxBack(f12) {
    if (P.dq < 1 && !P.lie && P.lift > 0) groundShadow(scrX(R((rig.C1.x + rig.C2.x) / 2)), 13, P.lift + 5);
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12);
  }
  // 光束：细束 2 行（3 帧），巨型光束 3 行（第 1 帧全白，第 2–3 帧芯紫外沿橙红，之后断续变暗）
  function drawBeam(f12) {
    const life = bmBig ? 0.34 : 0.25; if (bmT >= life) return;
    const k = Math.floor(bmT * 12 + 1e-6), x0 = bmX + 1, y0 = bmY, x1 = DX - 3, y1 = DY, n = Math.max(1, Math.abs(x1 - x0)), rows = bmBig ? [-1, 0, 1] : [0, 1];
    for (let i = 0; i <= n; i++) {
      const x = R(x0 + (x1 - x0) * i / n), y = R(y0 + (y1 - y0) * i / n);
      for (const r of rows) {
        if (k >= 2 && ((i + r + f12) & 1) && Math.abs(r) === 1) continue; if (k >= 3 && ((i + f12) % 3) === 0) continue;
        let c; if (k === 0) c = 21; else if (bmBig) c = r === 0 ? (k === 1 ? EL[1] : EL[2]) : (k === 1 ? FI[2] : FI[3]); else c = r === 0 ? EL[1] : EL[2];
        put(x, y + r, c);
      }
    }
    if (k < 2) { put(x0 - 1, y0 - 2, EL[1]); put(x0 - 1, y0 + 2, EL[1]); put(x1, y1 - 2, EL[0]); put(x1, y1 + 2, EL[0]); }
  }
  function drawFireballs() {
    for (let i = 0; i < 4; i++) {
      const t = FB.t[i]; if (t >= 0.42) continue; const r = FB.r[i] * ease.out(Math.min(1, t / 0.12)), cx = R(FB.x[i]), cy = R(FB.y[i]), rr = Math.ceil(r);
      for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
        const d = Math.hypot(dx, dy * 1.15) / Math.max(1, r); if (d > 1) continue;
        if (t > 0.18 && B8[((cy + dy) & 7) * 8 + ((cx + dx) & 7)] < (t - 0.18) / 0.24 + d * 0.3) continue;
        put(cx + dx, cy + dy, t < 0.05 ? 21 : d < 0.35 ? EL[1] : d < 0.7 ? FI[t < 0.2 ? 2 : 3] : FI[t < 0.2 ? 3 : 4]);
      }
    }
  }
  function fxFront(f12) {
    drawBeam(f12); drawFireballs();
    if (E.state === DEATH && meltT < 0.64 && !(meltT > 0.4 && (f12 & 1))) {          // 熔滩上残留的魔晶，闪几下后裂开
      const c = meltT < 0.3 ? 43 : 24; for (const [dx, dy] of [[0, -1], [-1, 0], [0, 0], [1, 0], [0, -2]]) put(mX + dx, HY - 2 + dy, dx === 0 && dy === -1 ? 21 : c);
    }
  }

  return {
    name: '魔龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.crys, m.crysHot, m.cond, m.jet, m.jetHot, m.glow, m.eye], HIT_POINT, EVENTS, deathKit: { mode: 'melt', at: T_MELT },
    REVIVE: { dy: -18, ramp: R_EL },
    SFX: { body: 'machine', how: 'dissolve', pal: 'arcane', style: 'beam', w: 1.0, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
