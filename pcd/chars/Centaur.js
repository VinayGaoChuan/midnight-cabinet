// 半人马（敌人 · 野兽 · 史诗 · batch-13）：栗色长腿马身 + 古铜赤膊人上身（苔绿战纹），黑莫西干鬃冠一路连到马背，编辫马尾系两根白羽；
// 双持新月弯斧（骨柄、钢刃、刃口一线冰蓝寒光）。攻击：双斧先后交叉劈砍两下；技能「顺劈」（连击 +1）：交叉蓄力 → 冲刺 8 格两刀十字冰弧 + 马身残影。
// 身体：parts-beast 的 quad 马身（不画马头马颈）+ parts.js heroic 骨架与头（人形的胯挂在 rig.NB 上当腰）；倒梯形上身 vTorso、肌肉赤臂 muscleArm、
// 莫西干鬃带 mohawkCrest、新月弯斧 crescentAxe、编辫马尾 braidTail 是本模块的候选部件。
PCD.define('Centaur', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_TRAIL,
    spawn, burst, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, blitShape, copySprite, parts } = E;
  const B = parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 材质 ─────
  const HIDE = [0, E.color('#4a2014'), E.color('#7a3a1e'), E.color('#a8603a')];                       // 栗色马皮（wood 偏红）
  const m = B.mats(E, { main: HIDE, claw: 'iron' });
  const M = parts.mats(E, {
    skin: 'skinDark', moss: 'moss', hair: [0, 0, 27, 28], leather: 'leather', gold: 'gold', steel: 'steel', iron: 'iron', bone: 'bone', white: 'white',
    ice: { r: [39, 23, 22, 21], flat: 1 }, ink: { r: [0, 0, 0, 0], flat: 1 },
  });
  const R_EL = FXI.frost, EL = FXR[R_EL];                                                            // 寒风冰刃：白 → 冰青 → 青 → 钢蓝 → 深蓝
  const o = Q.shape({ len: 14, chest: 4.8, rump: 4.6, waist: 0.25, hump: 0, leg: 11, lw: 2, thigh: 2.7, farDx: -2, stride: 3, lift: 2, foot: 'hoof',
    neck: 1, neckA: 1.2, neckW: 2, head: 'horse', headA: 0.5, tail: 'none', mane: 'none', forelock: null, fur: 1, lieLegs: 0, m });   // 侧倒：四腿朝前后水平伸出（不朝天）
  const HB = { body: 'heroic', fall: 'front', neck: 1 };                                              // 人上身：英武档（宽肩、粗臂）

  const HX = 70, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 64, 46, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of [M.ice, M.bone, M.boneD, M.white, M.ink, M.hair]) RIM.skip[k] = 1;
  const P = {}; Q.reset(P);
  const NOKEY = { wing: 1, jaw: 1, glow: 1, head: 1, ear: 1, gem: 1 };
  const SPEC = Q.KEYS.filter((f) => !NOKEY[f[0]]).concat(B.COMMON.filter((f) => f[0] !== 'drop' && f[0] !== 'dsx' && f[0] !== 'dsy'), [
    ['gem', 0, 4], ['hx', -12, 16], ['hy', -30, 0], ['ai', -40, 40], ['bhx', -14, 14], ['bhy', -30, 0], ['bai', -40, 40],
    ['lean', -1, 2], ['hd', -1, 1], ['hlie', 0, 1], ['spin', 0, 3], ['bmir', 0, 1], ['dth', 0, 40], ['blow', 0, 1]]);
  let rig = null, Rh = null;
  const HP = {};                                                                                     // 人上身读的姿势（和马身的 head / bob / crouch 分开）

  // ───── 候选部件：crescentAxe 新月弯斧（单手短斧） ─────
  // 骨柄 1 格（柄尾包铁）+ 钢刃新月：7 格高，上下两只角往回勾、只在中间三行连柄（刃背和柄之间留空），刃口一线 7 格弧形发光体
  // （5 档：0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭）。刃头伸出柄 5 格。
  // T = parts 的落笔变换（人形 rig 或 parts.FREE），(gx, gy) 握点，a 柄方向（0 朝上、顺时针 +），mir 1 = 刃朝后。宽刃头只按 90° 换朝向。两个部件：柄 → 刃
  const AXE = ['H..G..', 'M..EG.', 'M.EEMG', 'MMMMMG', 'M.MMmG', 'M..mG.', 'm..G..', 'T.....'], AXE_LEN = 5, AXE_R = AXE.length - 1;
  const qd = (a) => ((R(a / (PI / 2)) % 4) + 4) % 4;
  const orient = (q, u, v) => (q === 0 ? [u, v] : q === 1 ? [-v, u] : q === 2 ? [-u, -v] : [v, -u]);
  function crescentAxe(T, gx, gy, a, mir, lv) {
    const dx = Math.sin(a), dy = -Math.cos(a), sx = R(gx + dx * AXE_LEN), sy = R(gy + dy * AXE_LEN), q = qd(a);
    E.part(); parts.line(E, T, gx - dx * 1.5, gy - dy * 1.5, sx, sy, M.bone, 3); parts.px(E, T, R(gx - dx * 1.5), R(gy - dy * 1.5), M.iron, 3);
    E.part();
    for (let r = 0; r < AXE.length; r++) for (let c = 0; c < AXE[r].length; c++) {
      const ch = AXE[r][c]; if (ch === '.') continue;
      const d = orient(q, (mir ? -1 : 1) * c, r - AXE_R); let mt = M.steel, t = 0;
      if (ch === 'm') t = 2; else if (ch === 'H') { mt = M.iron; t = 4; } else if (ch === 'E') t = 4; else if (ch === 'T') { mt = M.leather; t = 3; }
      else if (ch === 'G') { const mid = r >= 2 && r <= 4; if (lv === 4) t = 1; else { mt = M.ice; t = lv === 3 ? 4 : lv === 2 ? (mid ? 4 : 3) : lv === 1 ? 3 : (r & 1) ? 2 : 3; } }
      parts.px(E, T, sx + d[0], sy + d[1], mt, t);
    }
  }
  function axeCenter(gx, gy, a, mir) { const sx = R(gx + Math.sin(a) * AXE_LEN), sy = R(gy - Math.cos(a) * AXE_LEN), d = orient(qd(a), (mir ? -1 : 1) * 4, -4); return [sx + d[0], sy + d[1]]; }
  const angF = () => P.ai * ASTEP + P.spin * PI / 2, angB = () => P.bai * ASTEP - P.spin * PI / 2;

  // ───── 姿势 ─────
  // 人上身字段（人形 rig 本地坐标：胯在 (0, -10)，肩约 y −21）：hx hy ai 前手与前斧角（ASTEP 档）· bhx bhy bai 后手与后斧 · lean 前倾 · hd 转头；马身字段见 quad
  const HF = ['hx', 'hy', 'ai', 'bhx', 'bhy', 'bai', 'lean', 'hd'], QF = ['bx', 'crouch', 'pitch', 'paw', 'reach', 'tail', 'mane', 'gem', 'blow'], ALLF = HF.concat(QF);
  const REST = { hx: 10, hy: -14, ai: 5, bhx: -10, bhy: -14, bai: -6, lean: 0, hd: 0, bx: 0, crouch: 0, pitch: 0, paw: 0, reach: 0, tail: 0, mane: 0, gem: 0, blow: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ hx: 5, hy: -26, ai: -5, bhx: -3, bhy: -26, bai: -9, lean: -1, bx: -1, crouch: 1, pitch: 1, mane: 1, gem: 1 });
  const A_S1 = pose({ hx: 11, hy: -13, ai: 22, bhx: -2, bhy: -26, bai: -4, lean: 2, hd: 1, bx: 6, pitch: -1, mane: 1, tail: -1, gem: 2, blow: 1 });
  const A_S2 = pose({ hx: 10, hy: -10, ai: 24, bhx: 9, bhy: -21, bai: 11, lean: 1, bx: 6, mane: -1, tail: 1, gem: 2, blow: 1 });
  const A_HOLD = pose({ hx: 10, hy: -11, ai: 22, bhx: 9, bhy: -19, bai: 12, lean: 1, bx: 4, gem: 1 });
  const T_S1 = 2 / 12, T_S2 = 4 / 12;
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_S1, A_S1, 'snap'], [3 / 12, A_S1, 'lin'], [T_S2, A_S2, 'snap'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_POSE = pose({ hx: 8, hy: -16, ai: -7, bhx: 7, bhy: -16, bai: 7, lean: 1, hd: 1, bx: -2, crouch: 2, pitch: -1, mane: 1, tail: 1, gem: 1 });   // 后腿蹲、身前倾、双斧交叉胸前
  const C_S1 = pose({ hx: 12, hy: -12, ai: 22, bhx: 3, bhy: -25, bai: -4, lean: 2, hd: 1, bx: 8, pitch: -1, mane: 1, tail: -1, gem: 3, blow: 1 });
  const C_S2 = pose({ hx: 11, hy: -10, ai: 25, bhx: 10, bhy: -23, bai: 11, lean: 1, bx: 8, mane: -1, tail: 1, gem: 3, blow: 1 });
  const C_HOLD = pose({ hx: 10, hy: -11, ai: 23, bhx: 10, bhy: -21, bai: 12, lean: 1, bx: 8, gem: 3, blow: 1 });
  const T_C1 = 1 / 12, T_C2 = 3 / 12;
  const CST = [[0, C_POSE], [T_C1, C_S1, 'snap'], [2 / 12, C_S1, 'lin'], [T_C2, C_S2, 'snap'], [0.5, C_HOLD, 'out']];
  const REAR = pose({ hx: 8, hy: -19, ai: 3, bhx: -6, bhy: -19, bai: -3, lean: -1, hd: -1, bx: 4, pitch: 3, paw: 2, mane: 1, tail: 1, gem: 2 });   // 收招：半人立
  const HURTP = { hx: 5, hy: -15, ai: 1, bhx: -8, bhy: -16, bai: -9, lean: -1, hd: -1 };
  const KNEEL = { hx: 9, hy: -9, ai: 20, bhx: 5, bhy: -10, bai: 14, lean: 2, hd: 1 };
  const LIEH = { hx: 2, hy: -11, ai: 0, bhx: -1, bhy: -12, bai: 0, lean: 0, hd: 0 };
  // 死亡掉落：两把斧脱手（死亡内第 f0 帧起飞，nf 帧落地），起点 = 跪倒时的手位（精灵本地坐标）
  const DROPS = [{ f0: 4, nf: 4, x0: 16, y0: -17, dx: 17, hop: 6, spin: 1, a0: 1.2 }, { f0: 5, nf: 4, x0: 4, y0: -20, dx: -17, hop: 5, spin: -1, a0: -0.8 }];
  const tmp = {};
  function apply(src, fields) { for (const f of fields || ALLF) P[f] = R(src[f]); }
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.rim = 1;
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)); P.spin = [1, 2, 3, 0, 0][k]; P.paw = [2, 0, 2, 0, 0][k]; P.gem = k < 3 ? 1 : 0; P.hd = k < 2 ? 1 : 0; if (k < 3) { P.bhx = REST.bhx - 2; P.bhy = REST.bhy + 1; } }   // 待机个性：转斧刨蹄
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    Q.reset(P); P.spin = 0; P.hlie = 0; P.dth = 0; P.bmir = 1; apply(REST);
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {
      const f = Q.anim.walk(P, tq), w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; P.rim = 1;
      const s = f === 0 ? 1 : f === 2 ? -1 : 0; P.ai = REST.ai + s * 2; P.bai = REST.bai + s * 2; P.lean = 0; P.blow = 1;   // 小跑：鬃冠、尾辫往后飘
    } else if (st === ATTACK) { keys(tq, ATK, tmp, ALLF); apply(tmp); P.bmir = 0; P.rim = P.gem >= 2 ? 2 : 1; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_POSE, ease.inOut(tq / 0.7), ALLF); apply(tmp); } else { apply(C_POSE); if (tq > 1.1) { P.mane = (f12 & 1) ? 1 : -1; P.blow = 1; } }
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.bmir = 0;
    } else if (st === CAST) { keys(tq, CST, tmp, ALLF); apply(tmp); P.gem = 3; P.rim = 3; P.bmir = 0; }
    else if (st === RECOVER) {
      if (tq < 0.25) E.mix(tmp, C_HOLD, REAR, ease.out(tq / 0.25), ALLF); else E.mix(tmp, REAR, REST, ease.inOut(clamp01((tq - 0.25) / 0.4)), ALLF);
      apply(tmp); P.gem = tq < 0.2 ? 2 : tq < 0.45 ? 1 : 0; P.rim = tq < 0.35 ? 2 : 1; P.bmir = tq < 0.4 ? 0 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { Q.anim.hurt(P, h); if (h < 0.2) apply(HURTP, HF); else if (h < 0.35) { E.mix(tmp, HURTP, REST, 0.5, HF); apply(tmp, HF); } P.rim = h < 0.35 ? 0 : 1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        P.dth = Math.min(40, Math.max(0, R(d * 12)));
        if (d < 0.3) { P.bx = -2; P.eyes = 1; P.tail = 2; P.mane = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; apply(HURTP, HF); P.gem = f12 & 1; }
        else if (d < 0.5) { P.bx = -3; P.pitch = -3; P.crouch = 3; P.reach = -1; P.eyes = 1; P.tail = 1; P.mane = -1; apply(KNEEL, HF); P.gem = 1; }   // 前腿先跪、人上身前扑
        else {
          P.bx = -3; P.lie = 2; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.eyes = 1; P.tail = d < 0.9 ? 2 : d < 1.0 ? 1 : 0; P.hlie = 1; apply(LIEH, HF); P.gem = 4;
          if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
        }
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    finish();
  }
  function humanRig() {
    HP.lean = P.lean; HP.head = P.hd; HP.bob = 0; HP.crouch = 0; HP.step = 0; HP.wup = 0; HP.walk = 0; HP.lying = P.hlie; HP.lift = 0;
    HP.hx = P.hx; HP.hy = P.hy; HP.bhx = P.bhx; HP.bhy = P.bhy; HP.eyes = P.eyes; HP.beard = P.mane; HP.sway = 0; HP.bend = 0;
    const H = parts.rig(HP, HB), nx = R(rig.NB.x), ny = R(rig.NB.y);
    if (!P.hlie) { H.ox = nx - 1; H.oy = ny + 2 - H.yHip; }
    else { const p = parts.toSprite(H, 0, H.yHip); H.ox += nx + 3 - p[0]; }                            // 前扑：人上身趴在马身前面的地上
    return H;
  }
  function dropPos(k) {                                                                              // 掉落的斧：[握点 x, y, 角度, 刃朝后, 落地]
    const c = DROPS[k], f = P.dth - c.f0; if (f < 0) return null; const q = clamp01(f / c.nf), landed = q >= 1;
    const x = c.x0 + c.dx * q, y = c.y0 + (-1 - c.y0) * q - Math.sin(q * PI) * c.hop;
    return [R(x), R(y), landed ? (k ? -PI / 2 : PI / 2) : c.a0 + c.spin * f * PI / 2, landed ? (k ? 0 : 1) : 0, landed];
  }
  function finish() {
    rig = Q.rig(P, o); Rh = humanRig();
    const dF = dropPos(0), dB = dropPos(1);
    if (dF) { const c = axeCenter(dF[0], dF[1], dF[2], dF[3]); P.gx = c[0] + P.bx; P.gy = c[1]; }
    else { const c = axeCenter(P.hx, P.hy, angF(), 0), s = parts.toSprite(Rh, c[0], c[1]); P.gx = s[0] + P.bx; P.gy = s[1]; }
    if (dB) { const c = axeCenter(dB[0], dB[1], dB[2], dB[3]); P.g2x = c[0] + P.bx; P.g2y = c[1]; }
    else { const c = axeCenter(P.bhx, P.bhy, angB(), P.bmir), s = parts.toSprite(Rh, c[0], c[1]); P.g2x = s[0] + P.bx; P.g2y = s[1]; }
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：braidTail 编辫马尾——2 格粗、辫纹逐格亮暗交替、每 3 格一个皮环，随 P.tail 甩；辫梢两根白羽（单独一个部件）会摆
  function braidTail() {
    E.part(); const lie = rig.lie === 2, sw = (P.tail | 0) * 0.1; let x = rig.tail.x + 0.5, y = rig.tail.y, a = lie ? 0.1 : 0.32 - sw;
    for (let k = 0; k <= 9; k++) {
      const ring = k % 3 === 2 && k > 0, mt = ring ? M.leather : M.hair;
      U.dot(E, x, y, mt, ring ? 3 : (k & 1) ? 4 : 3); U.dot(E, x, y + 1, mt, ring ? 2 : (k & 1) ? 2 : 3);
      if (k < 2) U.dot(E, x + 1, y + 1, M.hair, 2);
      a -= (lie ? 0.03 : 0.13) + sw * 0.4; x -= Math.cos(a); y -= Math.sin(a); if (y > -2) { y = -2; a = 0; }
    }
    E.part(); const tx = R(x), ty = R(y) + 1, s = (P.tail | 0) > 0 ? 1 : (P.tail | 0) < 0 ? -1 : 0;   // 白羽
    U.dot(E, tx - 1, ty + 1, M.white, 4); U.dot(E, tx - 1 - (s > 0 ? 1 : 0), ty + 2, M.white, 3); U.dot(E, tx - 2 - (s > 0 ? 1 : 0), ty + 3, M.white, 2);
    U.dot(E, tx + 1, ty + 1, M.white, 3); U.dot(E, tx + 1 + (s < 0 ? 1 : 0), ty + 2, M.white, 3); U.dot(E, tx + 1 + (s < 0 ? 1 : 0), ty + 3, M.white, 2);
  }
  // 候选部件：vTorso 倒梯形赤膊人上身——肩宽 10、往下收到腰宽 6（接马身处最窄）；skinDark 基色，胸肌分界 1 格、胸肌下沿、腹线 2 道手工暗色，
  //   锁骨一道 1 格苔绿锯齿战纹；腰带压在人马交界。tEdges(y) = 第 y 行的 [后沿, 前沿]（人形 rig 本地坐标，前倾只推上半身）
  function tEdges(y) {
    const yS = Rh.yS, t = clamp01((y - yS) / Math.max(1, Rh.yHip - yS)), k = clamp01((t - 0.15) / 0.7), sh = R(Rh.lean * (1 - t)), n = R(2 * k);
    let L = -5 + n + sh, Rr = 4 - n + sh; if (y <= yS) { L += 1; Rr -= 1; } return [L, Rr];
  }
  function vTorso() {
    const T = Rh, yS = Rh.yS, yH = Rh.yHip, sk = M.skin, mid = (y) => { const e = tEdges(y); return R((e[0] + e[1]) / 2); }, fr = (y) => tEdges(y)[1];
    E.part();
    parts.run(E, T, yS - 1, Rh.hx - 1, Rh.hx + 1, sk, 0);                                            // 脖子
    for (let y = yS; y <= yH; y++) { const e = tEdges(y); parts.run(E, T, y, e[0], e[1], sk, 0); }
    const cy = yS + 4;
    for (let y = yS + 2; y < cy; y++) parts.px(E, T, mid(y), y, sk, 2);                              // 胸肌分界
    parts.run(E, T, cy, mid(cy), fr(cy) - 1, sk, 2); parts.px(E, T, fr(cy - 1), cy - 1, sk, 2);         // 胸肌下沿
    parts.px(E, T, mid(yS + 2) + 1, yS + 2, sk, 4); parts.px(E, T, mid(yS + 2) + 2, yS + 2, sk, 4);    // 胸肌高光
    for (const y of [yS + 6, yS + 8]) parts.run(E, T, y, mid(y), mid(y) + 1, sk, 2);                  // 腹线两道
    parts.px(E, T, mid(yS + 7) + 1, yS + 7, sk, 4); parts.px(E, T, mid(yS + 5) + 1, yS + 5, sk, 4);
    for (let x = Rh.hx - 1, i = 0; x <= fr(yS + 1) - 1; x++, i++) parts.px(E, T, x, yS + (i & 1), M.moss, (i & 1) ? 2 : 3);   // 锁骨锯齿战纹
    for (const y of [yH - 1, yH]) { const e = tEdges(y); parts.run(E, T, y, e[0], e[1], M.leather, y === yH ? 2 : 0); }   // 腰带
    const bx = fr(yH) - 2; parts.px(E, T, bx, yH - 1, M.gold, 4); parts.px(E, T, bx + 1, yH - 1, M.gold, 3); parts.px(E, T, bx, yH, M.gold, 3); parts.px(E, T, bx + 1, yH, M.gold, 2);
  }
  // 候选部件：muscleArm 肌肉赤臂——3 格宽的肩头（三角肌）+ 鼓起的二头肌 + 2 格前臂；上臂两道 1 格斜战纹；护腕、拳各一个部件。
  //   back = 远侧后臂（暗一级材质）。肩头长在躯干最宽那一行的前 / 后角上（鼓出躯干 1 格，肩线就比腰宽一截）；肘的弯向同 parts.arm；手在臂长之外时肩点沿手臂方向前送
  function muscleArm(back) {
    const T = Rh, e1 = tEdges(Rh.yS + 1), sx0 = back ? e1[0] : e1[1], sy0 = Rh.yS + 1, hx = R(back ? P.bhx : P.hx), hy = R(back ? P.bhy : P.hy);
    const sk = back ? M.skinD : M.skin, arm = Rh.arm; let sx = sx0, sy = sy0;
    { const qx = hx - sx0, qy = hy - sy0, q = Math.hypot(qx, qy), reach = arm - 0.5; if (q > reach) { const k = (q - reach) / q; sx += qx * k; sy += qy * k; } }
    const L1 = arm * 0.5, dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1; let ex = sx + dx / 2, ey = sy + dy / 2;
    if (d < arm - 0.5) { const h = Math.sqrt(Math.max(0, L1 * L1 - d * d / 4)), nx = -dy / d, ny = dx / d, s = (-nx + ny * 0.8) >= 0 ? 1 : -1; ex += nx * s * h; ey += ny * s * h; }
    const ul = Math.hypot(ex - sx, ey - sy) || 1, ux = (ex - sx) / ul, uy = (ey - sy) / ul, fl = Math.hypot(hx - ex, hy - ey) || 1, wx = hx - (hx - ex) / fl * 1.4, wy = hy - (hy - ey) / fl * 1.4;
    E.part();
    parts.brush(E, T, sx0, sy0, 1.6, sk, 0); parts.sweep(E, T, sx, sy, ex, ey, 1.5, 1.1, sk, 0);                 // 肩头 + 上臂
    const bn = (-uy * 0.8 + ux) >= 0 ? 1 : -1; parts.brush(E, T, sx + (ex - sx) * 0.5 - uy * bn, sy + (ey - sy) * 0.5 + ux * bn, 1.0, sk, 0);   // 二头肌鼓起
    const n2 = Math.max(1, Math.ceil(fl * 1.5)); for (let k = 0; k <= n2; k++) { const q = k / n2; parts.rect(E, T, R(ex + (wx - ex) * q - 0.5), R(ey + (wy - ey) * q - 0.5), 2, 2, sk, 0); }   // 前臂 2 格
    parts.px(E, T, sx0 - 1, sy0 - 1, sk, 4);                                                           // 肩头高光
    for (const q of [0.35, 0.7]) { const px0 = sx + (ex - sx) * q, py0 = sy + (ey - sy) * q; parts.px(E, T, px0 - uy, py0 + ux, M.moss, back ? 2 : 3); parts.px(E, T, px0 + ux, py0 + uy, M.moss, back ? 2 : 3); }   // 上臂斜战纹
    E.part(); const cx = R(wx - (hx - ex) / fl * 1.2), cy2 = R(wy - (hy - ey) / fl * 1.2); parts.line(E, T, cx, cy2, R(wx), R(wy), back ? M.leatherD : M.leather, 0); parts.line(E, T, cx + 1, cy2, R(wx) + 1, R(wy), back ? M.leatherD : M.leather, 0);   // 护腕
    E.part(); parts.rect(E, T, hx - 1, hy - 1, 2, 2, sk, 0); parts.px(E, T, hx - 1, hy - 1, sk, 4);    // 拳
  }
  // 候选部件：mohawkCrest 莫西干鬃冠——头顶一排往后斜的鬃束（最高处高出头顶 4 格），沿后脑、后颈、人背连成一条 ink 锯齿鬃带，一直接到马背鬃（约 10 列）；
  //   鬃尖三相错开（P.mane 换相位），P.blow = 1 往后飘（鬃束更斜、背上的齿更长）。一个部件
  function mohawkCrest() {
    E.part(); const T = Rh, top = Rh.htop, x0 = Rh.hx0, ph = ((P.mane | 0) + 3) % 3, bl = P.blow | 0, mt = M.hair, sl = 0.5 + bl * 0.35;
    const LEN = [2, 3, 4, 5, 5, 4, 3], BY = [0, 0, 0, 0, 1, 2, 3];
    for (let i = 0; i < LEN.length; i++) {                                                          // 头顶鬃束：前低后高，往后斜
      const bx = x0 + 4 - i, by = top + BY[i], L = LEN[i] + ((i + ph) % 3 === 0 ? 1 : 0) - (i > 3 ? 0 : 0);
      for (let k = 0; k <= L; k++) { const tip = k === L; parts.px(E, T, R(bx - k * sl) - (tip && (i + ph) % 3 === 1 ? 1 : 0), by - k + (BY[i] ? R(k * 0.2) : 0), mt, tip ? 4 : (k === 0 ? 2 : 0)); }
    }
    const pts = [];                                                                                  // 后脑 → 后颈 → 人背：鬃带根部贴着后沿
    for (let y = top + 4; y <= Rh.yHip; y++) { const bx = y <= Rh.hy ? x0 - 1 : y < Rh.yS ? Rh.hx - 3 : tEdges(y)[0] - 1; pts.push([bx, y]); }
    for (let j = 0; j < pts.length; j++) {
      const [x, y] = pts[j], prev = j ? pts[j - 1][0] : x; for (let xx = Math.min(x, prev); xx <= Math.max(x, prev); xx++) parts.px(E, T, xx, y, mt, 0);
      const L = [2, 1, 0][(j + ph) % 3] + (bl && (j + ph) % 3 === 0 ? 1 : 0); for (let k = 1; k <= L; k++) parts.px(E, T, x - k, y + (k > 1 ? 1 : 0), mt, k === L ? 4 : 0);
    }
    if (rig.lie) return;                                                                            // 马背段：沿马的鬐甲往后，锯齿往上
    const end = parts.toSprite(Rh, pts[pts.length - 1][0], Rh.yHip); let lastY = end[1];
    for (let x = end[0], i = 0; i < 11; x--, i++) {
      const s = Q.span(rig, o, x); if (!s) continue; const y = s[0] - 1;
      for (let yy = Math.min(y, lastY); yy <= Math.max(y, lastY); yy++) U.dot(E, x, yy, mt, 0); lastY = y;
      const L = (i > 8 ? 1 : 2) - [0, 1, 2][(i + ph) % 3] + (bl && (i + ph) % 3 === 0 ? 1 : 0); for (let k = 1; k <= L; k++) U.dot(E, x - (bl && k === L ? 1 : 0), y - k, mt, k === L ? 4 : 0);
    }
  }
  function facePaint() { parts.px(E, Rh, Rh.hx1 - 2, Rh.ey + 1, M.moss, 3); parts.px(E, Rh, Rh.hx1 - 3, Rh.ey + 2, M.moss, 2); parts.px(E, Rh, Rh.hx1 - 4, Rh.ey + 1, M.moss, 3); }
  function drawHero() {
    begin(hero, P.bx, 0);
    const dF = dropPos(0), dB = dropPos(1);
    Q.legs(E, rig, P, o, 1);
    braidTail();
    Q.body(E, rig, P, o);
    Q.legs(E, rig, P, o, 0);
    if (!dB) crescentAxe(Rh, P.bhx, P.bhy, angB(), P.bmir, P.gem);
    muscleArm(1);
    vTorso();
    parts.head(E, Rh, HP, { mat: M.skin, face: 'square', age: 'rugged', eye: M.ink, brow: M.hair, browStyle: 2, nose: 'big', mouth: 'line', ear: 'dot' }); facePaint();
    mohawkCrest();
    if (!dF) crescentAxe(Rh, P.hx, P.hy, angF(), 0, P.gem);
    muscleArm(0);
    if (dB) crescentAxe(parts.FREE, dB[0], dB[1], dB[2], dB[3], dB[4] ? 4 : 1);
    if (dF) crescentAxe(parts.FREE, dF[0], dF[1], dF[2], dF[3], dF[4] ? 4 : 1);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ghost = [new Sprite(hero.w, hero.h, hero.ox, hero.oy), new Sprite(hero.w, hero.h, hero.ox, hero.oy)];
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastGf = -9, lastPaw = 0, aiT = 9;
  const shoulder = () => { const s = parts.toSprite(Rh, Rh.sFx, Rh.sFy); return [scrX(s[0] + P.bx), HY + s[1]]; };
  function strikeFx(big, up) {                                                                        // 一刀：冰蓝斩弧 + 命中（big = 技能那两刀）
    const [cx, cy] = shoulder(), hx = DUMMY_X - 3, hy = HY - 17;
    if (up) fx.slash(cx - 1, cy + 3, big ? 12 : 10, 3.7, 0.7, R_EL, big ? 0.24 : 0.18, big ? 2 : 1, 2);   // 左下反撩
    else fx.slash(cx, cy, big ? 12 : 10, -0.5, 2.5, R_EL, big ? 0.24 : 0.18, big ? 2 : 1, 2);             // 右上劈下
    if (big) { fx.cross(hx, hy + (up ? -3 : 2), 6, R_EL, 0.3, 2); burst(hx, hy, 18, 40, 120, 0.2, 0.55, R_EL, 10); hitDummy(1); }
    else { burst(hx, hy, 10, 30, 90, 0.15, 0.4, R_EL, 8); burst(hx, hy, 5, 30, 70, 0.1, 0.3, FXI.impact, 8); hitDummy(0); }
  }
  function snap(dst, bx) { poseAt(CAST, T_C1, E.simT); P.bx = bx; drawHero(); bakeHero(); copySprite(dst, hero); }
  function onEnter(s) {
    if (s === CAST) {
      snap(ghost[0], -4); snap(ghost[1], 2); hero.k1 = hero.k2 = -1; poseAt(CAST, 0, E.simT); aiT = 0;
      for (let i = 0; i < 10; i++) spawn(K_DUST, scrX(-8) + Math.random() * 12, HY, -20 - Math.random() * 30, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_S1) { strikeFx(0, 0); sfx('swing', { kind: 'slash', w: 0.6 }); sfx('hit', { mat: 'flesh', w: 0.6 }); }
    if (s === ATTACK && t === T_S2) { strikeFx(0, 1); sfx('swing', { kind: 'slash', w: 0.55 }); sfx('hit', { mat: 'flesh', w: 0.55 }); }
    if (s === CAST && t === T_C1) { strikeFx(1, 0); sfx('swing', { kind: 'slash', w: 0.7 }); sfx('impact', { pal: 'frost', w: 0.8 }); }
    if (s === CAST && t === T_C2) { strikeFx(1, 1); shake(0.12, 1); sfx('swing', { kind: 'slash', w: 0.7 }); sfx('impact', { pal: 'frost', w: 0.7 }); }
    if (s === DEATH && t === T_FALL) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 18 + Math.random() * 40, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.8 }); }
    if (s === DEATH && t === T_AXE) { sfx('hit', { mat: 'metal', w: 0.3 }); for (let i = 0; i < 4; i++) spawn(K_DUST, HX - 16 + Math.random() * 4, HY - 1, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3, FXI.dust); }
  }
  const T_FALL = INCOMING + 0.66, T_AXE = INCOMING + 0.75;
  const EVENTS = [[], [], [T_S1, T_S2], [], [T_C1, T_C2], [], [], [T_FALL, T_AXE], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy, g2x = scrX(P.g2x), g2y = HY + P.g2y;
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { const L = rig.legs[P.gf === 0 ? 3 : 2]; for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(L.F[0] + P.bx) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); sfx('step', { w: 0.6 }); }
      lastGf = P.gf;
    }
    if (state === IDLE && P.paw !== lastPaw) { if (P.paw === 0 && lastPaw > 0) for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(rig.legs[3].F[0] + P.bx) + 1, HY, 4 + Math.random() * 10, -3 - Math.random() * 4, 0.3, FXI.dust); lastPaw = P.paw; }
    if (state === CHARGE) {                                                                           // 冰屑沿两把斧刃向外螺旋甩出
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const k = Math.random() < 0.5, x = k ? gx : g2x, y = k ? gy : g2y, a = Math.random() * 6.2832, v = 16 + Math.random() * 18;
        spawn(K_TRAIL, x + Math.cos(a) * 2, y + Math.sin(a) * 2, Math.cos(a) * v * 0.6 - Math.sin(a) * v, Math.sin(a) * v * 0.5 + Math.cos(a) * v * 0.8, 0.3 + Math.random() * 0.3, R_EL); }
    }
    if ((state === IDLE && P.gem > 0) || state === RECOVER) { emberAcc += dt * (state === IDLE ? 5 : 8); while (emberAcc >= 1) { emberAcc -= 1; const k = Math.random() < 0.5; spawn(K_EMBER, (k ? gx : g2x) + R(Math.random() * 2 - 1), (k ? gy : g2y) - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 40, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    aiT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastGf = -9; lastPaw = 0; aiT = 9; }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (E.state === CHARGE) {                                                                        // 身后地面两道风纹，越蓄越长、往后流
      const q = clamp01(E.stT / DUR[CHARGE]), L = R(4 + 18 * q), x0 = scrX(-16 + P.bx);
      for (let j = 0; j < 2; j++) { const y = HY - 1 - j * 3; for (let k = 0; k < L - j * 3; k++) { if (((k + f12 * 2 + j * 2) % 6) >= 4) continue; put(x0 - k, y, k < L * 0.3 ? EL[1] : k < L * 0.7 ? EL[2] : EL[3]); } }
    }
  }
  function fxMid() {                                                                                 // 冲刺时身后两个马身残影（冰青 / 钢蓝，逐渐抖动消散）
    if (aiT < 0.36) { const q = aiT / 0.36; blitShape(ghost[0], HX + P.mx, HY, P.flip, EL[3], Math.min(1, q * 1.3 + 0.2)); blitShape(ghost[1], HX + P.mx, HY, P.flip, EL[2], Math.min(1, q * 1.1)); }
  }
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && !P.lie && P.dq < 1 && E.state !== ATTACK) {                   // 刃口寒光星芒
      const gx = scrX(P.gx), gy = HY + P.gy, L = P.gem === 3 ? 4 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); }
    }
  }

  return {
    name: '半人马', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.ice], HIT_POINT: [8, -20], EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'frost', style: 'blade', w: 0.7 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
