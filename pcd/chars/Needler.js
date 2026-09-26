// 针刺者（敌人 · 野兽 · 史诗 · 远程雇佣兵）：低伏弓背的四足刺鼠，背上一整扇骨白黑尖长针（射击时整扇前倾像一排炮管），
// 尖吻上推着一副黄铜单片瞄准镜，额前红巾两根飘带往后飞，胸前斜挎一条插满备用针的弹带。
// 攻击：弓背、刺扇前倾，从背上射出一根长针。技能「急速射击」（每次攻击叠加攻速）：背刺从尾到头逐根充电、瞄准镜闪 3 次、
// 身下浮出 3 个叠层小环 → 刺扇前倾，0.5 s 内射出 6 根电针、间隔越来越短 → 最后一针十字星芒 → 余电逐根熄灭。
// 死亡：蜷成刺球往后滚半圈侧倒，瞄准镜弹开，背刺一根根脱落，刺球化灰。
PCD.define('Needler', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, defMat, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shoot, copySprite, blitShape, death } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.bolt, EL = FXR[R_EL], R_NEEDLE = FXI.steel;                                // 急速射击 · 电黄疾光；普通针用钢色
  const R_QUILL = E.fxRamp('needlerQuill', [21, 17, 6, 7, 8]);                                 // 脱落的针屑：骨白 → 暖灰
  // 身体沙褐往暗一段调（[20, 19, 61, 62]），把亮色留给骨白刺、刺尖和镜片
  const m = B.mats(E, { main: [20, 19, 61, 62], belly: 'bone', claw: 'bone', nose: [0, 0, 0, 0], quill: 'bone', band: 'crimson', strap: [0, 20, 20, 32] });
  m.quillFar = defMat([8, 8, 7, 6], 1);                                                        // 后层刺：暗一级
  m.brass = defMat([0, 28, 14, 5], 1); m.iron = defMat([0, 27, 28, 29], 1);                    // 镜筒：黄铜 + 铁箍，勾线用墨色
  m.lens = defMat([0, 19, 51, 21], 1, 1); m.qlit = defMat([23, 22, 51, 21], 1, 1);
  const o = Q.shape({ len: 11, chest: 4, rump: 5, waist: 0.2, hump: 2, leg: 4, lw: 2, thigh: 2.4, farDx: -2, stride: 2, lift: 2, foot: 'claw',
    neck: 2.4, neckA: 0.75, neckW: 2.5, head: { type: 'rat', w: 7, h: 6, snout: 4, snH: 3.5, tip: 0.45, earH: 2 }, headA: 0.1,
    tail: 'stub', mane: 'none', fur: 0, m });

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(64, 46, 30, 42), ghost = new Sprite(64, 46, 30, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'lens', 'qlit', 'spec', 'claw', 'nose', 'brass', 'iron', 'band']) RIM.skip[m[k]] = 1;

  // 本角色的姿势字段：ql 背刺倾角档 0 后伏 … 5 前倾 45° · qn 充电的刺数（前层，从尾到头）· qt 刺抖 · lens 镜片 0 暗 / 1 常亮 / 2 闪 / 3 爆闪
  //   ball 0 站 / 1 蜷身 / 2 刺球 / 3 侧倒刺球 · roll 滚动 45° 档 · qk 刺球上剩几根刺 · ra / rb 红巾两根飘带（-1..1 摆，2 往前甩）
  const NF = 8, NBK = 7, NBALL = 16;                                                           // 前层 8 根 + 后层 7 根；刺球 16 根
  const EXTRA = [['ql', 0, 5], ['qn', 0, NF], ['qt', 0, 1], ['lens', 0, 3], ['ball', 0, 3], ['roll', 0, 4], ['qk', 0, NBALL], ['ra', -1, 2], ['rb', -1, 2]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.ql = 2; P.qn = 0; P.qt = 0; P.lens = 1; P.ball = 0; P.roll = 0; P.qk = NBALL; P.ra = 0; P.rb = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 背刺几何：两层，从肩后一直铺到尾根 ─────
  const LEAN = [-0.35, -0.15, 0, 0.3, 0.55, 0.85];                                             // 倾角档 → 整扇绕刺根转（+ 往前倾）
  const QB = new Float32Array(NF * 2), QT = new Float32Array(NF * 2), QL = new Uint8Array(NF);     // 前层
  const KB = new Float32Array(NBK * 2), KT = new Float32Array(NBK * 2), KL = new Uint8Array(NBK);  // 后层（错开半根）
  let XA = 0, XB = 0;
  // 放射扇：每根刺沿「肩前下方的扇心 → 刺根」方向长出（尾端几乎平伏、肩后接近竖直），刺尖比刺根散得开，一根根分得清
  function oneQuill(rg, x, len, th, cx, cy, B0, T0, L0, i) {
    const s = Q.span(rg, o, R(x)), bx = R(x), by = (s ? s[0] : -10) + 1;
    let dx = bx - cx, dy = by - cy; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const c = Math.cos(th), sn = Math.sin(th), ux = dx * c - dy * sn, uy = dx * sn + dy * c;
    B0[i * 2] = bx; B0[i * 2 + 1] = by; T0[i * 2] = bx + ux * len; T0[i * 2 + 1] = by + uy * len; L0[i] = len;
  }
  function quillGeom(rg) {
    XA = rg.C2.x - rg.C2.r * 0.75; XB = rg.C1.x + 0.3; const st = (XB - XA) / (NF - 1);
    const cx = XB + 2, cy = 8;
    for (let i = 0; i < NF; i++) {
      const L = 9 + R(3 * Math.sin(Math.PI * (i + 0.3) / NF)) - (i & 1);                      // 8–12 格，长短相间
      const th = LEAN[P.ql] - (P.qt && (i & 1) ? 0.2 : 0);
      oneQuill(rg, XA + st * i, L, th, cx, cy, QB, QT, QL, i);
    }
    for (let i = 0; i < NBK; i++) {
      const L = 7 + R(3 * Math.sin(Math.PI * (i + 0.5) / NBK));                               // 7–10 格
      const th = LEAN[P.ql] - 0.1 - (P.qt && !(i & 1) ? 0.2 : 0);
      oneQuill(rg, XA + st * (i + 0.5), L, th, cx, cy, KB, KT, KL, i);
    }
  }

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'paw', 'reach', 'ql'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, paw: 0, reach: 0, ql: 2 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ crouch: 1, pitch: -1, head: 1, ql: 3, mane: 1, tail: 1 });
  const A_FIRE = pose({ bx: -1, crouch: 1, pitch: -1, ql: 4, mane: -1, tail: -1, jaw: 1 });
  const A_HOLD = pose({ crouch: 1, ql: 3, mane: -1 });
  const A_SET = pose({ ql: 2, mane: 1, tail: 1, head: -1 });                                  // 收回缓入：刺伏回、抬头看一眼
  const A_EASE = pose({ ql: 2, tail: 1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_FIRE, 'snap'], [0.25, A_FIRE, 'lin'], [0.42, A_HOLD, 'out'], [0.5, A_SET, 'inOut'], [0.66, A_EASE, 'inOut'], [0.75, REST, 'inOut']];
  const SW = [0, 1, 0, -1];
  const rib = (ph) => { P.ra = SW[ph & 3]; P.rb = SW[(ph + 1) & 3]; };                       // 两根飘带错开 1/4 相位
  const C_POSE = pose({ crouch: 1, pitch: -1, head: 1, ql: 3, mane: 1, tail: 1 });
  const S_POSE = pose({ crouch: 1, pitch: -1, ql: 5, mane: -1, tail: -1, jaw: 1 });
  const T_FIRE = 2 / 12, NT = [0, 0.15, 0.27, 0.36, 0.43, 0.48], T_ASH = INCOMING + 1.45;
  const tmp = {};
  const apply = (src) => { for (const f of F_ALL) P[f] = R(src[f]); };

  function idle(tq, f12) {
    apply(REST); const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); rib(Math.floor(f12 / 12 * 2.5 + 1e-6) + 1);
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                                        // 待机个性：抖身（刺哗地竖起）→ 抬前爪擦瞄准镜
      const k = Math.min(4, f12of(lp - 1.6));
      P.ql = k === 0 ? 4 : k === 1 ? 3 : 2; P.qt = k === 1 ? 1 : 0; if (k < 2) { P.ra = k ? -1 : 1; P.rb = k ? 1 : -1; } P.mane = k & 1 ? 1 : -1; P.bob = k === 0 ? 1 : 0;
      if (k >= 2) { P.paw = k === 3 ? 3 : 2; P.head = 1; P.eyes = 1; } if (k === 4) P.lens = 2;
    }
  }
  function deathPose(d, f12) {
    P.eyes = 1; P.ear = 1; P.lens = 0;
    if (d < 0.42) { apply(pose({ bx: -2, crouch: 4, pitch: -2, head: 3, tail: 2, ql: 4, mane: 1 })); P.ball = 1; P.jaw = 0; return; }
    P.ball = d < 0.66 ? 2 : 3; P.roll = Math.min(4, Math.floor((d - 0.42) * 18 + 1e-6)); P.bx = -2 - P.roll;
    P.lift = d < 0.5 ? 2 : d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
    P.qk = d < 0.7 ? NBALL : Math.max(5, NBALL - Math.floor((d - 0.7) * 16 + 1e-6));
    const dp = B.dropAt(d, { at: 0.66, dur: 0.3, dx: 10, hop: 5 }); P.drop = dp[0]; P.dsx = dp[1]; P.dsy = dp[2];
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { apply(REST); Q.anim.walk(P, tq); P.head = 0; P.bob = 0; P.qt = P.gf === 0 || P.gf === 2 ? 1 : 0; rib(P.gf); const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.lens = tq >= 0.04 && tq < 0.25 ? 2 : 1; rib(Math.floor(tq * 6 + 1e-6)); }
    else if (st === CHARGE) {
      E.mix(tmp, REST, C_POSE, ease.inOut(clamp01(tq / 0.7)), F_ALL); apply(tmp);
      P.qn = Math.min(NF, Math.floor(tq / 0.2 + 1e-6)); P.rim = 2; rib(Math.floor(tq * 4 + 1e-6));
      P.lens = [0.4, 0.8, 1.2].some((x) => tq >= x - 1e-6 && tq < x + 0.08) ? 3 : 1;
      if (tq >= 1.1) P.qt = f12 & 1;
    } else if (st === CAST) {
      E.mix(tmp, C_POSE, S_POSE, ease.out(clamp01(tq / 0.12)), F_ALL); apply(tmp); P.qn = NF; P.rim = 3; P.lens = 2; rib(Math.floor(tq * 12 + 1e-6));
      if (NT.some((x) => tq >= x - 1e-6 && tq < x + 1 / 12 - 1e-6)) { P.bx = -1; P.lens = 3; }
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_POSE, REST, q, F_ALL); apply(tmp);
      P.qn = Math.max(0, NF - Math.floor(tq / 0.09 + 1e-6)); rib(Math.floor(tq * 4 + 1e-6)); P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { apply(REST); Q.anim.hurt(P, h); rib(Math.floor(tq * 4 + 1e-6)); if (h < 0.35) { P.ql = h < 0.2 ? 4 : 3; P.lens = 0; P.ra = 2; P.rb = h < 0.2 ? 2 : 1; } }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { apply(REST); Q.anim.death(P, d, f12); P.lie = 0; P.pitch = 0; P.ql = 4; P.lens = f12 & 1; P.ra = 2; P.rb = 2; }
      else deathPose(d, f12);
      if (t >= T_ASH - 1e-6) P.dq = 1;                                                          // 化灰之后由死亡套件画
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o); quillGeom(rig);
    if (P.ball) { P.gx = -3 + P.bx; P.gy = -7 - P.lift; } else { P.gx = R(QT[(NF - 1) * 2]) + P.bx; P.gy = R(QT[(NF - 1) * 2 + 1]); }
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：quill（一根长针：下半 2 格粗、骨白身、1–2 格黑尖，ring 多一道黑环；alt 隔根暗一档好分出一根根；lit 刺尖换电黄平涂）
  function quill(bx0, by0, tx, ty, L, mat, lit, ringed, alt) {
    const ux = (tx - bx0) / L, uy = (ty - by0) / L, band = R(L * 0.5), steep = Math.abs(uy) >= Math.abs(ux);
    for (let k = 0; k <= L; k++) {
      const x = bx0 + ux * k, y = by0 + uy * k;
      let mm = mat, t = k > L * 0.6 ? 4 : 3;
      if (k === L) { mm = lit ? m.qlit : m.ink; t = lit ? 4 : 1; }
      else if (ringed && k === band && !lit) { mm = m.ink; t = 1; }
      else if (lit && k >= L - 3) { mm = m.qlit; t = 3; }
      U.dot(E, x, y, mm, t);
      if (k <= (alt ? 1 : L * 0.35)) U.dot(E, steep ? x + 1 : x, steep ? y : y + 1, mm === m.ink ? m.ink : mat, mm === m.ink ? 1 : 2);
    }
  }
  // 候选部件：quillFan（背刺扇两层 + 刺皮，一个部件：后层 7 根暗一级、错开半根、1 格细 → 刺皮盖住刺根 → 前层 8 根，下半 2 格粗 / 隔根只有根部粗）
  function quillsBack() { for (let i = 0; i < NBK; i++) quill(KB[i * 2], KB[i * 2 + 1], KT[i * 2], KT[i * 2 + 1], KL[i], m.quillFar, false, false, 1); }
  function quillsFront() { for (let i = 0; i < NF; i++) quill(QB[i * 2], QB[i * 2 + 1], QT[i * 2], QT[i * 2 + 1], QL[i], m.quill, i < P.qn, i % 3 === 1, i & 1); }
  // 候选部件：quillCoat（刺皮：沿背线把躯干上缘 3–4 格盖成往后倒伏的短刺，下沿锯齿、隔两列一道暗纹）
  function quillCoat() {
    for (let x = Math.floor(XA) - 2; x <= Math.ceil(XB) + 1; x++) {
      const s = Q.span(rig, o, x); if (!s) continue;
      const t = (x - XA) / (XB - XA), dep = t < -0.05 || t > 1.05 ? 2 : t < 0.12 || t > 0.9 ? 3 : 4;
      for (let r = 0; r < dep && s[0] + r <= s[1]; r++) {
        const y = s[0] + r, last = r === dep - 1;
        if (last && ((x + 40) & 1)) continue;                                                   // 下沿锯齿
        const t2 = r === 0 ? 4 : ((x - r + 40) % 3 === 0 ? 2 : 3);
        U.dot(E, x, y, last && ((x + 40) % 4 === 0) ? m.ink : m.quill, last && ((x + 40) % 4 === 0) ? 1 : t2);
      }
    }
  }
  // 候选部件：bandolier（斜挎弹带：近侧肩头斜到两前腿之间，2 格宽深棕带、3 根横插的骨白备用针，尾端垂在两前腿之间晃）
  function bandolier() {
    E.part(); const C1 = rig.C1, x0 = C1.x + C1.r * 0.55, y0 = C1.y - C1.r + 1.5, x1 = C1.x - 1, y1 = C1.y + C1.r - 0.5;
    const n = Math.ceil(Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) { const x = R(x0 + (x1 - x0) * k / n), y = R(y0 + (y1 - y0) * k / n); U.dot(E, x - 1, y, m.strap, 4); U.dot(E, x, y, m.strap, 3); U.dot(E, x + 1, y, m.strap, 3); U.dot(E, x + 2, y, m.strap, 4); }   // 深棕带芯 2 格 + 两侧浅皮边
    U.dot(E, x0, y0, m.brass, 4); U.dot(E, x0 + 1, y0, m.brass, 3); U.dot(E, x0, y0 + 1, m.brass, 2); U.dot(E, x0 + 1, y0 + 1, m.brass, 2);   // 肩头铜扣
    const sw = P.gf >= 0 ? [0, 1, 0, -1][P.gf] : Math.max(-1, Math.min(1, P.rb | 0));
    const hx = R(x1), hy = R(y1);
    U.dot(E, hx, hy + 1, m.strap, 3); U.dot(E, hx + 1, hy + 1, m.strap, 4); U.dot(E, hx + (sw > 0 ? 1 : 0), hy + 2, m.strap, 3); U.dot(E, hx + sw, hy + 3, m.strap, 4); U.dot(E, hx + sw, hy + 4, m.quill, 4);
    for (const q of [0.2, 0.45, 0.7]) {                                                        // 备用针：横穿弹带，两头露出，前端黑尖
      const x = R(x0 + (x1 - x0) * q), y = R(y0 + (y1 - y0) * q);
      U.dot(E, x - 1, y, m.quill, 3); U.dot(E, x, y, m.quill, 4); U.dot(E, x + 1, y, m.quill, 4); U.dot(E, x + 2, y, m.quill, 3); U.dot(E, x + 3, y, m.ink, 1);
    }
  }
  // 候选部件：bandana（额带：眼睛上方两行横过额头，脑后打结，两根飘带往后伸出头部轮廓 3–4 格；ra / rb 错相位摆，2 = 往前甩）
  function ribbon(kx, ky, r, lower) {
    for (let j = 1; j <= 4; j++) {
      let dx, dy;
      if (r === 2) { dx = lower ? j - 2 : j - 1; dy = -j - (lower ? 0 : 1); }                  // 受击：往上往前甩过头顶
      else { dx = -j; dy = lower ? R(0.3 * j + r * (j - 1) * 0.4) : R(-0.5 * j + r * (j - 1) * 0.4); }
      U.dot(E, kx + dx, ky + dy, m.band, j === 4 ? 4 : lower ? 2 : 3);
    }
  }
  function bandana(F) {
    E.part();
    const vE = -F.Hh * 0.35;
    Q.scanHead(F, F.W + 2, (x, y, u, v) => { if (u >= -F.W - 0.3 && u <= F.W * 0.55 && v >= vE - 2.6 && v <= vE - 0.7 && (F.skull(u, v) || v >= F.top(u) - 0.5) && v <= F.bot(u)) U.dot(E, x, y, m.band, 0); });
    const k = F.at(-F.W - 0.2, vE - 1.6), kx = R(k[0]), ky = R(k[1]);
    U.dot(E, kx, ky, m.band, 4); U.dot(E, kx, ky + 1, m.band, 2); U.dot(E, kx - 1, ky, m.band, 3);
    ribbon(kx - 1, ky, P.ra | 0, false); ribbon(kx - 1, ky + 1, P.rb | 0, true);
  }
  // 候选部件：scopeMonocle（单片瞄准镜：眼上的目镜 + 沿吻部上方前伸的 2 格高黄铜横筒（两道铁箍）+ 伸出吻尖 2 格的 2×2 发光镜片，镜片 4 档）
  const LENS_T = [2, 3, 4, 4];
  function scope(F) {
    E.part();
    const ex = R(rig.eye[0]), ey = R(rig.eye[1]), tip = F.at(F.uT, F.vc), xe = R(tip[0]), tn = Math.tan(Math.max(-0.2, Math.min(0.8, F.a)));
    const yo = (x) => R((x - ex) * tn);
    U.dot(E, ex - 1, ey, m.brass, 2); U.dot(E, ex, ey - 1, m.brass, 4); U.dot(E, ex + 1, ey, m.brass, 2);
    U.dot(E, ex, ey, m.lens, P.eyes ? 2 : LENS_T[P.lens]);                                      // 目镜罩住眼
    for (let x = ex + 1; x <= xe; x++) {                                                         // 横筒：眼上一格起，2 格高，吻部上方留出一行空
      const y = ey - 1 + yo(x), iron = x === ex + 2 || x === xe - 1;
      U.dot(E, x, y - 1, iron ? m.iron : m.brass, iron ? 3 : ((x - ex) % 3 === 1 ? 4 : 3)); U.dot(E, x, y, iron ? m.iron : m.brass, 2);
    }
    const ly = ey - 1 + yo(xe + 1), lt = LENS_T[P.lens];
    U.dot(E, xe + 1, ly - 1, m.lens, lt); U.dot(E, xe + 1, ly, m.lens, lt); U.dot(E, xe + 2, ly, m.lens, lt);
    U.dot(E, xe + 2, ly - 1, m.lens, P.lens ? 4 : 2);                                           // 前端 1 格最亮
    if (P.lens === 3) { U.dot(E, xe + 3, ly - 1, m.lens, 4); U.dot(E, xe + 2, ly - 2, m.lens, 4); }
  }
  function droppedScope(x, y) { E.part(); for (let k = 0; k < 5; k++) { U.dot(E, x + k, y - 2, k === 1 || k === 3 ? m.iron : m.brass, k === 0 ? 4 : 3); U.dot(E, x + k, y - 1, k === 1 || k === 3 ? m.iron : m.brass, 2); } U.dot(E, x + 5, y - 2, m.lens, 2); U.dot(E, x + 5, y - 1, m.lens, 2); }
  // 候选部件：quillBall（蜷成的刺球：外圈是骨白刺皮、16 根放射状长刺（骨白身 + 黑尖），roll 按 45° 转；侧倒时压扁、朝地的刺不画）
  function ball() {
    const side = P.ball === 3, rx = side ? 7 : 6, ry = side ? 5.5 : 6, cx = -3, cy = side ? -5.5 : -6.5 - P.lift, a0 = P.roll * Math.PI / 4;
    const an = Math.PI * 0.3 + a0;
    for (let j = 0; j < NBALL; j++) {
      if (j >= P.qk) continue; const a = j * Math.PI * 2 / NBALL + a0 + 0.2, ca = Math.cos(a), sa = Math.sin(a); if (side && sa > 0.45) continue;
      const da = Math.abs(Math.atan2(Math.sin(a - an), Math.cos(a - an))); if (da < 0.45) continue;   // 脸那一侧不长刺
      E.part(); const L = (j & 1) ? 4 : 5;
      for (let k = 0; k <= L; k++) U.dot(E, cx + ca * (rx - 1 + k), cy + sa * (ry - 1 + k), k === L ? m.ink : m.quill, k === L ? 1 : k > 1 ? 4 : 3);
    }
    E.part();
    const X0 = Math.floor(cx - rx - 1), X1 = Math.ceil(cx + rx + 1), Y0 = Math.floor(cy - ry - 1), Y1 = Math.ceil(cy + ry + 1);
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      const u = (x - cx) / (rx + 0.35), v = (y - cy) / (ry + 0.35), r2 = u * u + v * v; if (r2 > 1) continue;
      const a = Math.atan2(v * ry, u * rx), da = Math.abs(Math.atan2(Math.sin(a - an), Math.cos(a - an)));
      if (r2 > 0.1 && da > 0.75) U.dot(E, x, y, m.quill, ((x + y + 40) % 3 === 0) ? 2 : r2 > 0.7 && v < 0 ? 4 : 3);   // 刺皮
      else U.dot(E, x, y, m.body, 0);
    }
    const nx = cx + Math.cos(an) * (rx - 0.5), ny = cy + Math.sin(an) * (ry - 0.5);
    U.dot(E, nx, ny, m.nose, 1); U.dot(E, nx - Math.cos(an), ny - Math.sin(an), m.limb, 3);
    const ae = an - 0.7, exx = cx + Math.cos(ae) * (rx - 2), eyy = cy + Math.sin(ae) * (ry - 2); U.dot(E, exx, eyy, m.ink, 1); U.dot(E, exx + 1, eyy, m.ink, 1);
    const ab = an - 1.1; for (let k = 0; k < 3; k++) U.dot(E, cx + Math.cos(ab + k * 0.2) * (rx - 1), cy + Math.sin(ab + k * 0.2) * (ry - 1), m.band, 0);
    if (!P.drop) { const as = an + 0.35, sx = cx + Math.cos(as) * (rx + 0.5), sy = cy + Math.sin(as) * (ry + 0.5); E.part(); U.dot(E, sx, sy, m.brass, 4); U.dot(E, sx + 1, sy, m.brass, 3); U.dot(E, sx + 2, sy, m.lens, 2); }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    if (P.ball >= 2) { ball(); if (P.drop) droppedScope(4 + P.dsx - P.bx, -P.dsy); return; }
    Q.legs(E, rig, P, o, 1); Q.tail(E, rig, P, o);
    Q.body(E, rig, P, o);
    E.part(); quillsBack(); quillCoat(); quillsFront();
    Q.legs(E, rig, P, o, 0);
    bandolier();
    Q.head(E, rig, P, o);
    const F = Q.headFrame(rig, o, P.jaw); bandana(F); scope(F);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, sparkAcc = 0, soulAcc = 0, lastGf = -9, lastQk = NBALL, mzT = 9, mzX = 0, mzY = 0, ghT = 9, nHit = 0;
  const muzzle = () => [scrX(R(QT[(NF - 1) * 2]) + P.bx) + 1, HY + R(QT[(NF - 1) * 2 + 1])];
  function fireNeedle(k) {
    const [x, y] = muzzle(), tx = DUMMY_X - 3, ty = HY - 14, spd = 260, vy = (ty - y) / ((tx - x) / spd);
    shoot(k, x + 1, y, spd, tx, k === 1 ? R_NEEDLE : R_EL, vy, { trail: k === 1 ? { every: 2, life: [0.08, 0.14] } : { every: 1, life: [0.06, 0.12] } });
    mzT = 0; mzX = x; mzY = y; burst(x, y, 4, 20, 50, 0.1, 0.2, k === 1 ? R_NEEDLE : R_EL, 0); sfx('shoot', { proj: 'arrow' });
  }
  function onEnter(s) {
    if (s === CHARGE) nHit = 0;
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const gx = scrX(P.gx), gy = HY + P.gy;
      releaseOrbit(40, 90, 0.25, 0.5); ring(gx, gy, 0, R_EL); fx.cross(gx, gy, 5, R_EL, 0.2, 2); shake(0.28, 2); flash(0.05);
      fireNeedle(2);
    }
  }
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 6, 30, 70, 0.12, 0.3, R_NEEDLE, 6); hitDummy(0); sfx('hit', { mat: 'wood', w: 0.3 }); return; }
    nHit++;
    if (nHit < 6) { burst(x, y, 6, 30, 80, 0.12, 0.3, R_EL, 6); hitDummy(0); sfx('impact', { pal: 'bolt', w: 0.35 }); }
    else { burst(x, y, 14, 50, 120, 0.2, 0.45, R_EL, 10); fx.cross(x, y, 6, R_EL, 0.3, 2); ring(x, y, 0, R_EL); hitDummy(1, 1); shake(0.12, 1); sfx('impact', { pal: 'bolt', w: 0.6 }); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) { fireNeedle(1); sfx('swing', { kind: 'bow', w: 0.3 }); }
    if (s === CAST && t > 0) {
      fireNeedle(2);
      if (t === NT[2]) { poseAt(CAST, t, E.simT); drawHero(); bakeHero(); copySprite(ghost, hero); hero.k1 = -1; ghT = 0; }   // 速度线残影
    }
    if (s === DEATH && t === INCOMING + 0.66) {                                                // 刺球侧倒落地
      for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 12 + Math.random() * 16, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.35 });
    }
    if (s === DEATH && t === T_ASH) {                                                           // 刺球化灰：先画好这一帧，再交给死亡套件
      poseAt(DEATH, T_ASH - 1e-3, E.simT); drawHero(); bakeHero();
      death.start('ash', { ramp: FXI.dust }); poseAt(DEATH, T_ASH, E.simT);
    }
  }
  const EVENTS = [[], [], [T_FIRE], [], NT.slice(1), [], [], [INCOMING + 0.66, T_ASH], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                                                    // 电光向刺扇汇聚 + 充电的刺尖跳火花
      chargeAcc += dt * (12 + 16 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if ((state === CHARGE || state === RECOVER || state === CAST) && P.qn > 0) {
      sparkAcc += dt * (state === RECOVER ? 10 : 18);
      while (sparkAcc >= 1) { sparkAcc -= 1; const i = Math.floor(Math.random() * P.qn); spawn(K_BURST, scrX(R(QT[i * 2]) + P.bx), HY + R(QT[i * 2 + 1]) - 1, (Math.random() - 0.5) * 30, -10 - Math.random() * 20, 0.12 + Math.random() * 0.12, R_EL); }
    }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { spawn(K_DUST, scrX(P.gf === 0 ? 7 : -5), HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 4, 0.25, FXI.dust); sfx('step', { w: 0.2 }); }
      lastGf = P.gf;
    }
    if (state === DEATH) {
      if (P.qk < lastQk && P.ball) { for (let n = P.qk; n < lastQk; n++) { const a = n * Math.PI * 2 / NBALL + P.roll * Math.PI / 4 + 0.2; spawnX(K_PHYS, scrX(R(-3 + Math.cos(a) * 9) + P.bx), HY - 5 + R(Math.sin(a) * 7), Math.cos(a) * 30, -30 - Math.random() * 20, 0.6, R_QUILL, { g: 260, floor: HY }); } }
      lastQk = P.qk;
      if (stT > INCOMING + 1.9 && stT < INCOMING + 2.5) { soulAcc += dt * 16; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 12, HY - 2 - Math.random() * 5, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.7 + Math.random() * 0.6, FXI.soul); } }
    } else lastQk = NBALL;
    mzT += dt; ghT += dt;
  }
  function fxReset() { chargeAcc = 0; sparkAcc = 0; soulAcc = 0; lastGf = -9; lastQk = NBALL; mzT = 9; ghT = 9; nHit = 0; }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.ball && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12);
    const st = E.state, t = E.stT;                                                             // 叠层小环：蓄力时一个个浮出，收招时一个个消失
    const n = st === CHARGE ? [0.35, 0.75, 1.1].filter((x) => t >= x).length : st === CAST ? 3 : st === RECOVER ? Math.max(0, 3 - Math.floor(t / 0.2 + 1e-6)) : 0;
    for (let k = 0; k < n; k++) {
      const rx = 8 + 3 * k, ry = 1.5 + k * 0.5, N = Math.ceil(rx * 3), cx = HX + P.mx - 1, newest = st === CHARGE && k === n - 1 && (f12 & 2);
      for (let j = 0; j < N; j++) { if ((j + k) & 1) continue; const a = j / N * 6.2832, x = R(cx + Math.cos(a) * rx), y = R(FLOOR + Math.sin(a) * ry); put(x, y, newest ? EL[0] : ((j >> 1) + f12) & 1 ? EL[1] : EL[2]); }
    }
  }
  function fxMid(f12) {
    if (ghT < 2 / 12) {                                                                        // 速度线残影 2 帧
      blitShape(ghost, HX + P.mx - 5, HY, 0, EL[3], ghT < 1 / 12 ? 0 : 0.5);
      for (const [dy, l] of [[-18, 10], [-13, 7], [-8, 9]]) for (let k = 0; k < l; k++) if (ghT < 1 / 12 || (k & 1)) put(HX + P.mx - 12 - k, HY + dy, k < 3 ? EL[1] : EL[2]);
    }
  }
  function fxFront(f12) {
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? 0 : 1; put(mzX, mzY, EL[c]); put(mzX + 1, mzY, EL[c + 1]); put(mzX + 2, mzY, EL[2]); put(mzX, mzY - 1, EL[c + 1]); put(mzX, mzY + 1, EL[c + 1]); }
  }
  function drawShot(k, x, y, d, f12, Rr) {                                                      // 长针：白尖 + 骨白身 + 棕尾；电针多一格电黄拖尾
    if (k > 2) return false;
    put(x + d, y, 21); put(x, y, 17); put(x - d, y, 17); put(x - 2 * d, y, 6); put(x - 3 * d, y, 7);
    if (k === 2) { put(x - 4 * d, y, EL[1]); put(x - (f12 & 1 ? 2 : 1) * d, y + (f12 & 1 ? -1 : 1), EL[0]); }
    return true;
  }

  return {
    name: '针刺者', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.lens, m.qlit], HIT_POINT, EVENTS,
    deathKit: { mode: 'ash', at: T_ASH },
    SFX: { body: 'beast', how: 'collapse', pal: 'bolt', style: 'bolt', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
