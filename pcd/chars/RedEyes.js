// 赤瞳（部队 · 兽人 · 先锋 · 神话）：巨型野猪长成的狂暴巨兽（同一只：同样的楔形、背鬃、獠牙、带刺面甲、臀上旧疤、耳朵同一处缺口）。
// 皮毛变成炭黑，背鬃烧成一条从额头一直长到尾根的赤红火焰长鬃；两对獠牙（大獠牙更长更弯 + 下面一对短牙）；更大的铁面甲上两根往前的铁刺；
// 前半身披垂到腹线的三排铁片重甲（两道横缝、铆钉、往后收的钢尖齿下摆）+ 圆铁胸护（盾心尖钉）；一双发红光的眼，眼后拖出红色光痕。
// 攻击：低头猛冲 7 格，獠牙上挑后接一记前蹄踏；技能「奔踏」（狂躁版）：赤瞳暴亮刨地 → 拖着三道暗红残影高跃 18 格 → 落地两段：砸出地裂，再一踏推出一圈赭土土刺。
// 身体用 parts-beast 的 quad（躯干、腿、头、卷尾）+ 马具部件（peytral 胸护、chamfron 面甲）拼；重甲自画（候选部件 lamellar）；本模块自画火焰长鬃、两对獠牙、面甲双刺、胸护尖钉、
// 侧倒时的腹线、伤疤、赤瞳、掉落翻滚的面甲和特效。
PCD.define('RedEyes', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, near, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_PHYS, K_STILL, K_TRAIL,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, copySprite, blitShape } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI, rnd = Math.random;

  // ───── 颜色、材质 ─────
  const INK = near('#0e0a0c'), HIDE_D = near('#241a1e'), HIDE = near('#3a2c30'), HIDE_L = near('#5a4448'), MUZ = near('#6a3a3e');
  const PALH = (i) => E.PAL[i];
  const R_EL = FXI.earth, EL = FXR[R_EL];                                                     // 奔踏 · 赭土（主，沿用巨型野猪）：5 → 62 → 61 → 19 → 20
  const R_EYE = FXI.blood, EYE = FXR[R_EYE];                                                  // 赤瞳：白 21 → 58 → 57 → 56 → 55（眼光拖痕、残影、鬃尖火星、轮廓光）
  const R_STEAM = fxRamp('boarSteam', [PALH(21), PALH(17), PALH(18), PALH(10), PALH(9)]);   // 鼻孔喷出的白气（同巨型野猪）
  const R_HIDE = fxRamp('redEyesHide', [PALH(58), PALH(HIDE_L), PALH(HIDE), PALH(HIDE_D), PALH(INK)]);   // 受击：炭黑毛屑夹一点红鬃
  const m = B.mats(E, {
    main: [INK, HIDE_D, HIDE, HIDE_L],                                                        // 炭黑鬃皮
    crest: 'blood', crestMid: [55, 55, 56, 13], crestAsh: [0, 9, 10, 18],                      // 赤红火焰长鬃；死亡时先褪成暗红、再褪成灰
    muz: [INK, HIDE_D, MUZ, 16], nose: [INK, 11, 12, 13], claw: 'iron', tusk: 'bone',
    eye: [0, 0, 57, 58], eyeHot: [58, 58, 21, 21], eyeOff: [0, 0, 55, 55],                     // 赤瞳（发光体）：平时 / 暴亮 / 熄灭
    plate: 'iron', rim: 'steel', rivet: 'steel', spike: 'steel', boss: 'steel', strap: 'boot', scar: [INK, 16, 15, 17], bellySkin: [INK, HIDE_D, MUZ, 16],   // bellySkin：侧倒时露出的腹线（暗粉 + 浅褐；不叫 belly，免得库的 body 在站姿也画腹线）
  });
  m.barding = E.defMat(E.RAMP.iron, 2);                                                       // 垂到腹线的铁片重甲：大块 band 2
  const SHAPE = { len: 17, chest: 6.5, rump: 4.5, waist: 0.35, hump: 3.5, leg: 6, lw: 3, thigh: 3, farDx: -2, stride: 4, lift: 2, foot: 'hoof',
    neck: 2, neckA: 0.05, neckW: 4.4, head: { type: 'boar', w: 7, h: 7, snout: 6, snH: 4.5, tip: 0.75, ear: 'point', earH: 3, tusk: 0 }, headA: 0.4,
    tail: 'thin', tailLen: 5, tailA: 0.3, tailCurl: 3, mane: 'none', fur: 1, lieLegs: 0 };
  const o = Q.shape(Object.assign({ m }, SHAPE));
  const ARMOR = { a: 0.5, b: 1.15, thick: 1, rows: 3, back: [0, 2, 4], tooth: [0, 2, 1, 1], lieTilt: 0.45 };   // 铁片重甲（lamellar 画）：肩到胸（前端压在胸护下面）、垂到腹线，三排；back 每排后沿往前收几格；tooth 下摆尖齿每 4 列的深度（尖往后偏 1 格）
  const CHEST = { shape: 'round', r: 3.5, fx: 0.62, dy: 1.5, face: 'rim', rim: 'plate', boss: 1, strap: 0 };
  const HELM = { from: -0.35, nose: 4.6, thick: 1.5, mat: 'plate', trim: 'rim', spike: 0 };
  const CREST = { step: 4, len: 5, min: 3, peak: 0.5, width: 0.55, lean: 0.6, fore: 2 };   // fore：鬃一直排到颈顶前几格（头后脑勺，额头那段被面甲压住）
  const TUSK = { u: 0.74, len: 6, curve: 0.95, bend: 1.3 }, TUSK2 = { u: 0.27, len: 2 };    // TUSK2 下面那对短牙：比原来往后 2 格，只露 2 格
  const DROP = { at: 0.66, dur: 0.33, dx: 13, hop: 4 };                                    // 面甲脱落：0.33 s 翻滚着滚出 13 格、弹起 4 格

  const HX = 58, DUR = DEFAULT_DUR.slice(), hero = new Sprite(100, 66, 44, 62);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EYE, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'eyeHot', 'eyeOff', 'ink', 'spec', 'glow', 'tusk']) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['brist', 0, 6], ['scr', -2, 0], ['leap', 0, 3], ['ash', 0, 3], ['spin', 0, 1], ['eye', 0, 3]]);   // 竖鬃档 · 近前蹄后刨 · 跃起腿姿 · 鬃褪色 · 面甲翻滚 · 赤瞳档（0 平时 · 1 亮 · 2 暴亮 · 3 熄灭）
  const P = {};
  function reset() { Q.reset(P); P.brist = 0; P.scr = 0; P.leap = 0; P.ash = 0; P.spin = 0; P.eye = 0; }
  reset();
  const HIT_POINT = Q.rig(P, o).hit;
  let rig = Q.rig(P, o);

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'paw', 'reach', 'brist', 'eye'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, paw: 0, reach: 0, brist: 0, eye: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -3, crouch: 1, head: 3, pitch: -1, ear: 1, tail: 1, brist: 3, eye: 1 });              // 预兆：低头压低、后坐
  const A_HIT = pose({ bx: 7, head: -2, pitch: 3, jaw: 1, ear: 1, tail: -2, mane: -1, brist: 6, eye: 2 });        // 出手：猛冲 7 格、獠牙上挑
  const A_REAR = pose({ bx: 7, head: -1, pitch: 3, paw: 3, jaw: 1, ear: 1, tail: -1, brist: 6, eye: 2 });         // 前半身再抬、近前蹄扬起
  const A_STOMP = pose({ bx: 8, head: 1, pitch: -1, crouch: 1, reach: 1, ear: 1, tail: 1, mane: 1, brist: 5, eye: 2 });   // 前蹄一踏
  const A_HOLD = pose({ bx: 6, head: 1, crouch: 1, ear: 1, brist: 3, eye: 1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_HIT, 'snap'], [0.25, A_HIT, 'lin'], [4 / 12, A_REAR, 'out'], [5 / 12, A_STOMP, 'snap'], [0.5, A_STOMP, 'lin'], [0.58, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ crouch: 3, head: 2, pitch: -2, ear: 1, tail: 1, mane: 1, jaw: 1 });   // 蓄势：压低、张嘴喘气
  // 施放（高跃 + 两段落地）逐帧：[lift, mx, pitch, leap, crouch, head, tail, mane, paw, reach]；leap 1 = 身体伸直 · 2 = 后腿蹬地 · 3 = 四蹄叉开砸地
  const LEAP = [[1, -3, 2, 2, 0, 1, 2, -1, 0, 0], [10, 3, 1, 1, 0, 0, 2, -1, 0, 0], [14, 9, -1, 1, 0, 1, 1, 1, 0, 0], [0, 14, -1, 3, 3, 2, -2, 1, 0, 0],
    [0, 14, 2, 0, 1, 0, -1, 0, 3, 0], [0, 15, -1, 0, 1, 1, 1, 1, 0, 1]];                    // 3 第 1 段砸地 · 4 前半身抬起、前蹄扬起 · 5 第 2 段前蹄一踏
  const T_HIT = 2 / 12, T_STOMP = 5 / 12, T_LAND = 3 / 12, T_STOMP2 = 5 / 12, T_PAW = [6 / 12, 9 / 12, 12 / 12, 15 / 12], T_FALL = 12 / 12;   // T_FALL：死亡倒地（第 12 帧离地 0，声音、尘土、震屏同一帧）
  const PERS = [[2, 0, 1, 0], [0, -2, 1, 1], [2, 0, 1, -1], [0, -2, 1, 1], [0, 0, 1, 0]];    // 待机个性「喷鼻刨地」逐帧：[paw, scr, eye, mane]
  const BACK = 4, JUMP = 14;                                                                   // 蓄力后坐 4 格，跃起横移 18 格（-4 → +14）

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)), s = PERS[k]; P.paw = s[0]; P.scr = s[1]; P.eye = s[2]; P.mane = s[3]; P.head = 1; }
  }
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { const f = Q.anim.walk(P, tq); P.pitch = [1, 0, -1, 0][f]; P.head = 1; P.mane = [1, 0, -1, 0][f]; const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }   // 蓄势冲刺步：低头、前后俯仰
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); }
    else if (st === CHARGE) {
      const q0 = ease.inOut(clamp01(tq / 0.5)); E.mix(tmp, REST, C_LOW, q0, F_ALL); apply(tmp); P.mx = -R(BACK * q0);
      P.eye = tq < 0.35 ? 0 : tq < 0.8 ? 1 : 2;                                                // 双眼赤光逐档亮到 2 档
      P.brist = tq < 0.2 ? 0 : Math.min(6, 1 + Math.floor((tq - 0.2) / 0.15 + 1e-6));         // 火焰鬃一节节竖起
      const f = f12of(tq);
      if (f >= 5) { const c = (f - 5) % 3; P.paw = [2, 0, 0][c]; P.scr = [0, -2, -1][c]; }    // 前蹄刨地 4 次
      if (tq > 1.1) P.bob = f & 1; P.jaw = f & 2 ? 1 : 0;
      P.rim = 2;
    } else if (st === CAST) {
      const s = LEAP[Math.min(5, f12of(tq))];
      P.lift = s[0]; P.mx = s[1]; P.pitch = s[2]; P.leap = s[3]; P.crouch = s[4]; P.head = s[5]; P.tail = s[6]; P.mane = s[7]; P.paw = s[8]; P.reach = s[9];
      P.brist = 6; P.ear = 1; P.eye = 2; P.rim = s[0] > 0 || f12of(tq) === 0 ? 3 : 2;   // 下颚只在蓄力和攻击里张开（张开时两对獠牙挤在一起）
    } else if (st === RECOVER) {
      const f = f12of(tq);                                                                     // 喘着气走回站位（转身、每 2 帧一步），眼光降到 1 档
      if (f <= 1) { P.mx = 15 - f; P.crouch = 1; P.head = 2; P.brist = 6; P.eye = 2; P.rim = 2; }
      else if (f <= 7) { P.flip = 1; P.mx = R(JUMP * (1 - (f - 1) / 6.5)); P.gf = (f >> 1) & 3; P.bob = P.gf & 1 ? 0 : 1; P.head = 1 + (f & 1); P.brist = Math.max(0, 7 - f); P.eye = 1; }   // 喘气：头随步子一点一点
      else { P.mx = 0; P.head = 1; P.eye = 1; }
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.eyes = 0; P.eye = h < 0.2 ? 2 : 0; if (h < 0.2) P.mane = -1; } }   // 受击反而眼光一亮（不闭眼）
    else if (st === DEATH) { const d = tq - INCOMING; if (d < 0) idle(tq, f12); else death(d, f12); }
    else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o); legPose(rig);
    P.gx = R(rig.eye[0]) + P.bx; P.gy = R(rig.eye[1]);
    B.key(P, SPEC);
  }
  // 死亡「轰然侧倒」：受击 → 踉跄往前冲两步 → 前膝跪下 → 重重侧倒（腿顺着地面伸直、背和赤鬃朝上）→ 面甲脱落滚开 → 红眼闪三下熄灭 → 赤鬃从红褪成灰 → 消散
  function death(d, f12) {
    P.ear = 1;
    if (d < 1 / 12) { P.bx = -2; P.flash = 1; P.eyes = 1; P.tail = 2; P.mane = -1; }
    else if (d < 0.3) { const k = f12of(d - 1 / 12); P.gf = k & 3; P.bx = -1 + k; P.head = 2; P.pitch = -1; P.tail = 1; P.eye = 2; }   // 踉跄往前冲两步
    else if (d < 0.5) { P.bx = 2; P.pitch = -3; P.crouch = 3; P.head = 3; P.reach = -1; P.tail = 1; P.eye = 1; }                   // 前膝跪下
    else { P.bx = 2; P.lie = 2; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.tail = d < 1.0 ? 2 : d < 1.1 ? 1 : 0; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }
    if (d >= 0.5) {                                                                            // 红眼闪三下熄灭；赤鬃从红褪成暗红、再褪成灰
      const k = f12of(d - 0.5); P.eye = d < 1.0 ? ((k & 1) ? 3 : 2) : 3;
      P.ash = d < 1.0 ? 0 : d < 1.2 ? 1 : d < 1.4 ? 2 : 3;
    }
    const dr = B.dropAt(d, DROP); P.drop = dr[0]; P.dsx = dr[1]; P.dsy = dr[2]; P.spin = dr[0] === 1 ? f12 & 1 : 0;
  }
  function legPose(r) {
    for (let i = 0; i < 4; i++) {
      const L = r.legs[i], T = L.T, fr = L.front; let fx = L.F[0], fy = L.F[1];
      if (P.leap === 1) { fx = T[0] + (fr ? 0.85 : -0.8) * L.L; fy = T[1] + (fr ? 0.42 : 0.5) * L.L; }
      else if (P.leap === 2) { if (fr) { fx = T[0] + 2.5; fy = T[1] + L.L * 0.55; } else { fx = T[0] - 4; fy = 0; } }
      else if (P.leap === 3) { fx = T[0] + (fr ? 3 : -3); fy = 0; }
      if (i === 3 && P.scr) fx += P.scr * 1.5;
      const dx = fx - T[0], dy = fy - T[1], dd = Math.hypot(dx, dy); if (dd > L.L) { fx = T[0] + dx * L.L / dd; fy = T[1] + dy * L.L / dd; }
      L.F = [fx, fy]; L.up = fy < -0.5;
    }
  }

  // ───── 画 ─────
  // 躯干 + 颈第 x 列的上沿（近似颈的 taper；只用来给鬃找根，根部埋进躯干 2 格，躯干后画会盖住）
  function topAt(r, x) {
    let t = 1e9; const s = Q.span(r, o, x); if (s) t = s[0];
    const NB = r.NB, NT = r.NT;
    for (let k = 0; k <= 4; k++) { const q = k / 4, cx = NB.x + (NT.x - NB.x) * q, cy = NB.y + (NT.y - NB.y) * q, rad = o.neckW * (1 - 0.2 * q), dx = x - cx; if (Math.abs(dx) <= rad) t = Math.min(t, Math.ceil(cy - Math.sqrt(rad * rad - dx * dx) - 0.35)); }
    return t < 1e8 ? t : null;
  }
  // 候选部件：flameCrest 火焰长鬃：从尾根沿背线、颈上沿一直排到头后的一串火焰舌（根 4 格宽压进背线 2 格 → 3 → 2 → 尖 1 格并往后卷），肩峰处最长、两头短、长短相间；
  //   间距 4，火舌上半截之间留 3 格缝，剪影里一根根分得开。画在躯干和披挂之后、头之前（从甲的脊缝里烧出来，头压住最前端）；侧躺时贴着背往后倒。
  //   c = { step 间距, len 最长, min 两头最短, peak 最长处（沿路径 0–1）, width 长短分布宽, lean 后倾（弧度）, fore 排到颈顶前几格 }，
  //   mat 材质下标（tone 2 根 · 3 火身 · 4 火尖）。读 P.brist（0–6：从肩往后逐束竖起，竖起的长 1 格、更直）· P.mane（摆）
  function crestPts(r) {
    const out = [], C2 = r.C2, x0 = C2.x - C2.r * 0.55, xEnd = r.NT.x + CREST.fore;
    for (let x = x0; x <= xEnd + 1e-6; x += CREST.step) { const y = topAt(r, R(x)); if (y != null) out.push([R(x), y]); }
    return out;
  }
  function flameCrest(r, mat) {
    E.part(); const pts = crestPts(r), n = pts.length, up = (P.brist | 0) / 6, sw = (P.mane | 0) * 0.15, lying = r.lie === 2;
    pts.forEach(([x, y], i) => {
      const s = i / Math.max(1, n - 1), erect = up > 0 && s >= 1 - up - 1e-6;
      const L = Math.max(2, R(CREST.min + (CREST.len - CREST.min) * Math.exp(-(((s - CREST.peak) / CREST.width) ** 2))) - (i & 1) + (erect ? 1 : 0));
      const lean = (erect ? 0.25 : CREST.lean) + sw + (i & 1 ? 0.12 : 0);
      for (let j = -2; j <= L; j++) {
        const jj = Math.max(0, j), curl = j >= L ? 1 : 0, w = j < 1 ? 4 : j < L * 0.45 ? 3 : j < L - 1 ? 2 : 1, tn = j >= L - 1 && j > 0 ? 4 : j >= L * 0.4 ? 3 : 2;
        const px = lying ? x - jj : x - R(Math.sin(lean) * jj) - curl, py = lying ? y - (jj > 1 ? 1 : jj) : y - R(Math.cos(lean) * jj);
        for (let k = 0; k < w; k++) U.dot(E, px - k, py, mat, k === 0 ? tn : k === w - 1 && w > 2 ? 2 : Math.max(2, tn - 1));
      }
    });
  }
  // 獠牙（同巨型野猪的候选部件 boarTusk；这里一次画一对：下面的短牙 + 大獠牙，同一个部件）。c = { u 沿吻部位置, len 伸出吻部上沿, curve 往回勾, bend 往外弯 }
  function tusk(r, c) {
    const F = Q.headFrame(r, o, P.jaw | 0), u0 = F.u0 + (F.uT - F.u0) * c.u, pr = F.prof(u0), vb = pr[1] + F.gap(u0) - 0.3, H = vb - (pr[0] - c.len), seen = new Set();
    for (let s = 0; s <= H + 1e-6; s += 0.4) {
      const q = s / H, du = c.bend * Math.sin(q * PI * 0.55) - c.curve * q * q * 2.4, p = F.at(u0 + du, vb - s), px = R(p[0]), py = R(p[1]), k = px * 1000 + py;
      if (seen.has(k)) continue; seen.add(k);
      U.dot(E, px, py, m.tusk, q > 0.72 ? 4 : q < 0.2 ? 2 : 3);
      if (q < 0.5 && c.len > 3) { const p2 = F.at(u0 + du + 0.8, vb - s); U.dot(E, p2[0], p2[1], m.tusk, 3); }
    }
  }
  // 下面那对短牙：从下颌往前上方只露 2 格（根 3 级、尖 4 级），和大獠牙前后错开 4 格，不再横穿吻部，也离眼睛远
  function shortTusk(r, c) {
    const F = Q.headFrame(r, o, P.jaw | 0), u = F.u0 + (F.uT - F.u0) * c.u, vb = F.prof(u)[1] + F.gap(u) - 0.4;
    const a = F.at(u, vb), x = R(a[0]), y = R(a[1]);
    for (let k = 0; k < c.len; k++) U.dot(E, x + (k ? 1 : 0), y - k, m.tusk, k === c.len - 1 ? 4 : 3);
  }
  function tusks(r) { E.part(); shortTusk(r, TUSK2); tusk(r, TUSK); }
  // 候选部件：lamellar 铁片重甲（压在肩胸上的三排甲片）。库的 Q.blanket 下摆 = 背线 + drop，在肩峰下缩上去，勾线压出竖缝，整块读成竖着的方箱子；这里自己画：
  //   上沿贴背线（盖过肩峰），下摆沿腹线（腹线往后收 → 下摆也往后收），两道横缝把甲分成三排：每排上 1 行亮（压在上一排下面的甲片边）、中间基色、
  //   缝是暗线；后沿每往下一排往前收 2 格（楔形往后收）；前端压在胸护下面（不留竖直的前沿）；下摆一行钢边 + 尖齿（每 4 列一齿，齿尖往后偏 1 格）；
  //   上两排铆钉每 3 格一颗、两排错开 1 格（不排成竖线，也不成对读成眼睛）。
  //   侧倒（lie 2）时横缝转斜（往前下斜 lieTilt），下摆收到腹线上 3 格，露出腹线（bellyLine）。c = ARMOR，材质 m.barding（甲）· m.rim（钢边、齿）· m.rivet
  function armorGeo(r) {
    const C1 = r.C1, C2 = r.C2, xa = R(C2.x + (C1.x - C2.x) * ARMOR.a), xb = R(C2.x + (C1.x - C2.x) * ARMOR.b), lying = r.lie === 2;
    const yc = (x) => C2.y + (C1.y - C2.y) * (x - C2.x) / (C1.x - C2.x), top0 = C1.y - C1.r * r.sq - 1.5, bot0 = C1.y + C1.r * r.sq - 1, xm = (xa + xb) / 2, tilt = lying ? ARMOR.lieTilt : 0;
    const seams = [1, 2].map((k) => (x) => R(yc(x) - C1.y + top0 + (bot0 - top0) * k / ARMOR.rows + tilt * (x - xm)));   // 两道横缝：甲的上沿到下摆三等分，跟着胸臀连线走（前高后低）
    return { xa, xb, lying, seams };
  }
  function lamellar(r) {
    E.part();
    const g = armorGeo(r), T = ARMOR.tooth, sw = P.mane | 0;
    for (let x = g.xa; x <= g.xb; x++) {
      const sp = Q.span(r, o, x); if (!sp) continue;
      const top = sp[0] - ARMOR.thick, s1 = g.seams[0](x), s2 = g.seams[1](x), k = (x - g.xa + sw + 40) & 3;
      const hem = g.lying ? sp[1] - 3 : sp[1] - 1, bot = hem + (g.lying ? (T[k] ? 1 : 0) : T[k]);
      const row = (y) => (y <= s1 ? 0 : y <= s2 ? 1 : 2);
      for (let y = top; y <= bot; y++) {
        const rw = row(y); if (x < g.xa + ARMOR.back[rw]) continue;                            // 后沿每排往前收 2 格
        if (y >= hem) { U.dot(E, x, y, m.rim, y > hem ? 4 : 3); continue; }                     // 下摆钢边 + 尖齿（齿尖最亮）
        const start = rw === 0 ? top : rw === 1 ? s1 + 1 : s2 + 1;
        U.dot(E, x, y, m.barding, y === s1 || y === s2 ? 2 : y === start ? 4 : x === g.xb ? 2 : 3);   // 缝 = 暗线，缝下 1 行亮，前端 1 列暗
        if (rw < 2 && y === start + 1 && (x - g.xa + rw + 30) % 3 === 1 && x > g.xa + ARMOR.back[rw] && x < g.xb) U.dot(E, x, y, m.rivet, 4);   // 铆钉
      }
    }
  }
  // 侧倒时露出的腹线（紧跟 body 画，同一个部件）：肚皮朝外翻，贴地上面 2 行浅色（上浅褐、下暗粉，每 3 格一道皮褶）
  function bellyLine(r) {
    if (r.lie !== 2) return;
    const x0 = R(r.C2.x - r.C2.r * 0.4), x1 = R(r.C1.x + r.C1.r * 0.4);
    for (let x = x0; x <= x1; x++) { const sp = Q.span(r, o, x); if (!sp || sp[1] - sp[0] < 5) continue; U.dot(E, x, sp[1] - 2, m.bellySkin, ((x - x0) % 3) === 2 ? 3 : 4); U.dot(E, x, sp[1] - 1, m.bellySkin, 3); }
  }
  // 胸护中心往前伸的尖钉（紧跟 peytral 画）
  function chestSpike(r) { const c = Q.peytralAt(r, o, CHEST), x = R(c[0]), y = R(c[1]); U.dot(E, x + 2, y, m.spike, 3); U.dot(E, x + 3, y, m.spike, 3); U.dot(E, x + 4, y, m.spike, 4); }
  // 面甲的两根铁刺 + 铆钉（紧跟 chamfron 画）：和巨型野猪那根独角刺同一个朝向（往前上方 2:1 斜伸、根 2 格宽），前面那根长 5、后面那根长 4（暗一级），
  //   两根相距 3 格；按世界坐标画，低头 / 抬头时都朝前上方
  function helmSpikes(r) {
    const F = Q.headFrame(r, o, 0);
    for (const [u, L, dark] of [[-F.W * 0.55, 4, 1], [F.W * 0.3, 5, 0]]) {
      const b = F.at(u, F.top(u)), x = R(b[0]), y = R(b[1]);
      for (let k = 0; k < L; k++) U.dot(E, x + k, y - 1 - (k >> 1), m.spike, k === L - 1 ? (dark ? 3 : 4) : k < 2 ? 2 : dark ? 2 : 3);
    }
    for (const u of [-2.2, 0.6, 3]) { const p = F.at(u, F.top(u) + 1); U.dot(E, p[0], p[1], m.rivet, 4); }
  }
  // 赤瞳（紧跟 head 画，同一个部件，压在头的眼睛那一格上）：P.eye 0 平时 · 1 亮 · 2 暴亮（白芯 + 后一格红）· 3 熄灭；闭眼（P.eyes）时不画
  function eyeGlow(r) {
    if (P.eyes && P.eye !== 3) return; const e = r.eye, x = R(e[0]), y = R(e[1]), lv = P.eye | 0;
    if (lv === 3) { U.dot(E, x, y, m.eyeOff, 3); return; }
    U.dot(E, x, y, lv === 2 ? m.eyeHot : m.eye, lv === 2 ? 3 : lv === 1 ? 4 : 3);
    if (lv >= 1) U.dot(E, x - 1, y, m.eye, lv === 2 ? 4 : 3);
  }
  // 臀上两道旧疤（和巨型野猪同一处）+ 肩前、颈上各一道新疤（紧跟 body 画）
  const SCARS = [[-0.35, -0.2, 3], [0.25, 0.3, 3], [0.2, 0.9, 2], [-0.9, 0.35, 2]];
  function scars(r) {
    SCARS.forEach(([ux, uy, n], i) => {
      const C = i < 2 ? r.C2 : r.C1, x0 = R(C.x + ux * C.r), y0 = R(C.y + uy * C.r * r.sq);
      for (let k = 0; k < n; k++) { const x = x0 + k, y = y0 - k, s = Q.span(r, o, x); if (!s || y < s[0] + 1 || y > s[1] - 1) continue; U.dot(E, x, y, m.scar, k === 1 ? 3 : 2); }
    });
  }
  function earNotch(r) { if (r.lie === 2) return; const F = Q.headFrame(r, o, 0), eb = F.at(-F.W * 0.35, -F.Hh + 0.3), xo = R(eb[0]) - R((P.ear | 0) ? 1 : 0.3); E.sp(xo, R(eb[1]) - 2, 0); }
  // 候选部件：chamfronDrop 掉落的面甲（同巨型野猪，大一号、两根刺）：spin 1 = 翻滚中竖着；flat 1 = 平躺
  function droppedPlate(x, y, flat, spin) {
    E.part(); x = R(x); y = R(y);
    if (flat) { for (let i = -4; i <= 4; i++) { U.dot(E, x + i, 0, m.plate, i === -4 ? 4 : 2); if (Math.abs(i) < 4) U.dot(E, x + i, -1, m.plate, i < 0 ? 4 : 3); } U.dot(E, x + 5, -1, m.spike, 3); U.dot(E, x + 6, -2, m.spike, 4); U.dot(E, x + 1, -2, m.spike, 3); U.dot(E, x + 2, -3, m.spike, 4); U.dot(E, x - 2, -1, m.rivet, 4); }
    else if (spin) { for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) if (Math.abs(i) + Math.abs(j) < 5) U.dot(E, x + i, y + j, m.plate, i < 0 || j < 0 ? 4 : 3); U.dot(E, x, y + 3, m.spike, 3); U.dot(E, x, y + 4, m.spike, 4); U.dot(E, x, y, m.rivet, 4); }
    else { for (let j = -3; j <= 3; j++) for (let i = -1; i <= 1; i++) U.dot(E, x + i, y + j, m.plate, i < 0 || j < 0 ? 4 : 3); U.dot(E, x + 2, y - 1, m.spike, 3); U.dot(E, x + 3, y - 2, m.spike, 4); U.dot(E, x + 2, y + 2, m.spike, 3); U.dot(E, x, y, m.rivet, 4); }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const crestMat = P.ash >= 2 ? m.crestAsh : P.ash === 1 ? m.crestMid : m.crest;
    Q.legs(E, rig, P, o, 1);
    Q.tail(E, rig, P, o);
    Q.body(E, rig, P, o); scars(rig); bellyLine(rig);
    Q.legs(E, rig, P, o, 0);
    lamellar(rig);
    if (rig.lie !== 2) { Q.peytral(E, rig, P, o, CHEST); chestSpike(rig); }
    flameCrest(rig, crestMat);                                                                 // 火焰长鬃压在背线和甲的上沿：从甲的脊缝里烧出来；头后画，盖住鬃的最前端
    Q.head(E, rig, P, o); eyeGlow(rig); earNotch(rig);
    if (!P.drop) { Q.chamfron(E, rig, P, o, HELM); helmSpikes(rig); }
    tusks(rig);
    if (P.drop) { const h = rig.head; droppedPlate(h.x + 3 + P.dsx, P.drop === 2 ? 0 : h.y - P.dsy, P.drop === 2 ? 1 : 0, P.spin); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ghosts = [0, 1, 2].map(() => new Sprite(hero.w, hero.h, hero.ox, hero.oy)), gX = [0, 0, 0], gT = [9, 9, 9], gF = [9, 9, 9];
  let chargeAcc = 0, steamAcc = 0, soulAcc = 0, emberAcc = 0, eyeAcc = 0, lastGf = -9, lastF = -9, lastPers = -9, landT = 9, landX = 0, spikeT = 9, spikeX = 0;
  const hoofScr = (i) => { const F = rig.legs[i].F; return [scrX(F[0] + P.bx), HY + R(F[1])]; };
  const snoutScr = () => [scrX(rig.mouth[0] + P.bx), HY + R(rig.mouth[1])];
  const eyeScr = () => [scrX(P.gx), HY + P.gy];
  function clods(x, y, n, vx0, vx1, vy0, vy1, big) {
    for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (rnd() - 0.5) * 3, y, vx0 + rnd() * (vx1 - vx0), vy0 + rnd() * (vy1 - vy0), 0.5 + rnd() * 0.5, R_EL, { g: 330, floor: FLOOR - (rnd() < 0.5 ? 1 : 0), sz: rnd() < big ? 2 : 1 });
  }
  function dust(x, y, n, spd, life) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (rnd() - 0.5) * 6, y, (rnd() - 0.5) * spd, -4 - rnd() * 10, life * (0.7 + rnd() * 0.6), FXI.dust); }
  function steam(n) { const [x, y] = snoutScr(), d = P.flip ? -1 : 1; for (let i = 0; i < n; i++) spawn(K_RISE, x + d, y + 1, d * (10 + rnd() * 14), -3 - rnd() * 6, 0.35 + rnd() * 0.3, R_STEAM); }
  function eyeTrail(n, spd) { const [x, y] = eyeScr(), d = P.flip ? 1 : -1; for (let i = 0; i < n; i++) spawn(K_TRAIL, x + d, y + R(rnd() - 0.5), d * (spd + rnd() * spd), (rnd() - 0.5) * 4, 0.2 + rnd() * 0.2, R_EYE); }
  function crestTip() { const pts = crestPts(rig); if (!pts.length) return null; const p = pts[Math.floor(rnd() * pts.length)]; return [scrX(p[0] + P.bx - 1), HY + R(p[1]) - 5]; }
  function onEnter(s) {
    if (s === CAST) {                                                                          // 起跳：土块外爆，震屏 2 格 + 闪白
      poseAt(CAST, 0, E.simT); const bx = hoofScr(2)[0];
      releaseOrbit(30, 80, 0.3, 0.6, { ramp: R_EYE });
      clods(bx, FLOOR - 1, 18, -100, 10, -130, -40, 0.35); dust(bx, HY, 12, 40, 0.6); ring(bx, HY - 1, 0, R_EL);
      shake(0.28, 2); flash(0.05); gT[0] = gT[1] = gT[2] = 9;
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                         // 獠牙上挑
      const hx = scrX(rig.head.x + P.bx), hy = HY + R(rig.head.y), tx = DUMMY_X - 4, ty = HY - 13;
      fx.slash(hx + 3, hy - 1, 9, 2.3, 0.3, R_EL, 0.17, 2, 2);
      burst(tx, ty, 18, 50, 120, 0.15, 0.45, FXI.impact, 14); burst(tx, ty + 2, 8, 30, 80, 0.2, 0.4, R_EYE, 18); hitDummy(1, 1);
      dust(scrX(8 + P.bx), HY, 5, 30, 0.4);
      sfx('swing', { kind: 'smash', w: 1.0 }); sfx('hit', { mat: 'flesh', w: 1.0 });
    }
    if (s === ATTACK && t === T_STOMP) {                                                       // 接一记前蹄踏：小地裂 + 尘土
      const [x] = hoofScr(3); fx.crack(x, FLOOR, 5, 1, R_EL, 0.7, 0); fx.crack(x - 1, FLOOR, 4, -1, R_EL, 0.7, 0); dust(x, HY, 6, 40, 0.5); ring(x, HY - 1, 0, R_EL); hitDummy(0, 1);
      sfx('hit', { mat: 'flesh', w: 0.7 });
    }
    if (s === CHARGE && T_PAW.includes(t)) {                                                   // 刨地：土块往后飞，地裂一次比一次长（2 → 6 格）
      const k = T_PAW.indexOf(t), [x] = hoofScr(3), L = 2 + R(k * 4 / 3);
      clods(x - 1, FLOOR - 1, 4, -95, -45, -85, -45, 0.4); dust(x, HY, 3, 20, 0.4);
      fx.crack(x + 1, FLOOR, L, 1, R_EL, 1.0, 0); fx.crack(x - 1, FLOOR, L, -1, R_EL, 1.0, 0);
      sfx('step', { w: 0.5 });
    }
    if (s === CAST && t === T_LAND) {                                                          // 第 1 段：大地裂 + 大冲击环 + 36 颗土块
      const x = scrX(o.len / 2 + 1); landX = x; landT = 0;
      fx.crack(x, FLOOR, 13, 1, R_EL, 1.3, 0); fx.crack(x - 1, FLOOR, 13, -1, R_EL, 1.3, 0);
      ring(x, HY - 3, 1, R_EL); burst(x, HY - 4, 10, 40, 110, 0.2, 0.4, R_EL, 30);
      clods(x, FLOOR - 1, 36, -120, 120, -160, -50, 0.35); dust(x, HY, 18, 60, 1.2);
      hitDummy(1, 1); shake(0.2, 2);
      sfx('impact', { pal: 'earth', w: 1.0 });
    }
    if (s === CAST && t === T_STOMP2) {                                                        // 第 2 段：前蹄一踏，左右推出一圈赭土土刺 + 第二个冲击环
      const x = hoofScr(3)[0] + 1; spikeX = x; spikeT = 0;
      fx.wave(x + 14, FLOOR - 1, 1, 16, 5, R_EL, 0.55, 2); fx.wave(x - 22, FLOOR - 1, -1, 16, 5, R_EL, 0.55, 1);
      ring(x, HY - 2, 0, R_EL); clods(x, FLOOR - 1, 12, -80, 80, -110, -40, 0.3); dust(x, HY, 8, 50, 0.8);
      hitDummy(1, 1); shake(0.12, 1);
      sfx('impact', { pal: 'earth', w: 0.8 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 10, 30, 90, 0.2, 0.45, R_HIDE, 12);
    if (s === DEATH && t === T_FALL) { dust(HX + 2, HY - 1, 20, 60, 0.8); shake(0.14, 1); sfx('fall', { w: 1.0 }); }
    if (s === DEATH && t === T_PLATE) sfx('hit', { mat: 'metal', w: 0.4 });
  }
  const T_PLATE = Math.ceil((INCOMING + DROP.at + DROP.dur) * 12 - 1e-6) / 12;
  const EVENTS = [[], [], [T_HIT, T_STOMP], T_PAW, [T_LAND, T_STOMP2], [], [INCOMING], [T_FALL, T_PLATE], []];
  function stepFX(dt, state, stT) {
    const f = f12of(stT), newF = f !== lastF; lastF = f;
    if (state === CHARGE) {
      const [ex, ey] = eyeScr();
      chargeAcc += dt * (8 + 20 * clamp01(stT / DUR[CHARGE]));                                  // 赤光往眼里螺旋汇聚
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + rnd() * 9, a = rnd() * 6.2832; spawn(K_SPIRAL, ex, ey, r / (0.3 + rnd() * 0.3), 0, 9, R_EYE, a, r, 4 + rnd() * 3); }
      if (P.eye >= 1) { eyeAcc += dt * (P.eye >= 2 ? 30 : 12); while (eyeAcc >= 1) { eyeAcc -= 1; eyeTrail(1, 22); } }   // 眼光往后拖出红痕
      if (P.brist >= 4) { emberAcc += dt * 16; while (emberAcc >= 1) { emberAcc -= 1; const p = crestTip(); if (p) spawn(K_EMBER, p[0], p[1], rnd() * 6 - 3, -8 - rnd() * 8, 0.35 + rnd() * 0.3, R_EYE); } }   // 鬃尖冒红光粒子
      steamAcc += dt * (stT > 0.7 ? 4 : 2.2); if (steamAcc >= 1) { steamAcc -= 1; steam(3); }
    }
    if (state === CAST || (state === RECOVER && stT < 0.2)) { eyeAcc += dt * 26; while (eyeAcc >= 1) { eyeAcc -= 1; eyeTrail(1, 30); } }
    if (state === RECOVER && newF && (f & 1)) steam(2);                                          // 收招喘气：闭着嘴，鼻孔每 2 帧喷一团白气
    if (state === CAST && newF && f <= 2) {                                                    // 残影：起跳和空中每帧存一张剪影，身后画三个递减的暗红剪影
      drawHero(); bakeHero(); hero.k1 = -1; copySprite(ghosts[f], hero); gX[f] = HX + P.mx; gT[f] = 0; gF[f] = f;
    }
    if (state === IDLE) {                                                                      // 待机：鼻孔喷白气；个性里前蹄刨两下（每下 2 颗尘土）
      const lp = stT % DUR[IDLE], k = lp >= 1.6 && lp < 2.0 ? Math.min(4, f12of(lp - 1.6)) : -1;
      if (k !== lastPers) { if (k === 1 || k === 3) { const [x] = hoofScr(3); dust(x, HY, 2, 16, 0.35); } lastPers = k; }
      if (newF && f12of(lp) % 10 === 0) steam(2);
    }
    if ((state === MOVE || (state === RECOVER && P.gf >= 0)) && P.gf !== lastGf) {            // 冲刺步：每次落蹄 4 颗尘土
      if (P.gf === 0 || P.gf === 2) { const [x] = hoofScr(P.gf === 0 ? 3 : 1); dust(x, HY, 4, 20, 0.45); if (state === MOVE) sfx('step', { w: 1.0 }); }
      lastGf = P.gf;
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 32; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + rnd() * 40, HY - 1 - rnd() * 8, (rnd() - 0.5) * 6, -14 - rnd() * 16, 0.8 + rnd() * 0.8, FXI.soul); } }
    for (let k = 0; k < 3; k++) gT[k] += dt;
    landT += dt; spikeT += dt;
  }
  function fxReset() { chargeAcc = 0; steamAcc = 0; soulAcc = 0; emberAcc = 0; eyeAcc = 0; lastGf = -9; lastF = -9; lastPers = -9; landT = 9; spikeT = 9; gT[0] = gT[1] = gT[2] = 9; }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.lie && !P.lift) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (landT < 0.9) { const q = landT / 0.9, w = R(7 + 11 * q); for (let x = -w; x <= w; x++) if (((x + f12) & 1) === 0 || q < 0.3) put(landX + x, FLOOR, q < 0.3 ? EL[1] : q < 0.6 ? EL[2] : EL[3]); }
  }
  function fxMid() {                                                                           // 高跃残影：赤瞳第 4 级（56）单色剪影，越旧越散（第 1 个起点 0.25，还看得出野猪剪影）；落地后 0.2 s 散完
    const inCast = E.state === CAST, cur = inCast ? f12of(E.stT) : 9;
    for (let k = 0; k < 3; k++) {
      if (gT[k] > 0.45 || (inCast && gF[k] >= cur)) continue;
      const age = inCast ? cur - gF[k] : 4, late = !inCast ? 1 : cur >= 3 ? (E.stT - 3 / 12) * 5 : 0;
      const dq = clamp01(0.25 + age * 0.14 + late); if (dq >= 0.95) continue;
      blitShape(ghosts[k], gX[k], HY, 0, EYE[3], dq);
    }
  }
  function fxFront(f12) {
    if (P.eye >= 1 && P.eye < 3 && !P.eyes && P.dq < 0.5) {                                  // 眼后拖出的红色光痕（2–3 格）
      const [x, y] = eyeScr(), d = P.flip ? 1 : -1, L = P.eye >= 2 ? 3 : 2;
      for (let k = 1; k <= L; k++) if (!(k === L && (f12 & 1))) put(x + d * (k + 1), y + (k >= 2 ? -1 : 0), k === 1 ? EYE[1] : k === 2 ? EYE[2] : EYE[3]);
    }
    if (spikeT < 0.6) {                                                                        // 第 2 段的赭土土刺：从踏点往左右一根接一根冒出、再沉下去
      for (let side = -1; side <= 1; side += 2) for (let k = 0; k < 5; k++) {
        const t = spikeT - k * 0.05; if (t < 0) continue; const h = R(5 * (t < 0.08 ? t / 0.08 : t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) / 0.2)) - (k & 1)); if (h <= 0) continue;
        const cx = spikeX + side * (6 + k * 4);
        for (let j = 0; j < h; j++) { const y = FLOOR - 1 - j, c = j === h - 1 ? EL[0] : j >= h - 2 ? EL[1] : j === 0 ? EL[3] : EL[2]; put(cx, y, c); if (j < h * 0.45) { put(cx - 1, y, EL[3]); put(cx + 1, y, c); } }
      }
    }
  }

  return {
    name: '赤瞳', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye, m.eyeHot], HIT_POINT, EVENTS, R_HURT: FXI.impact,
    SFX: { body: 'beast', how: 'topple', pal: 'earth', style: 'meteor', w: 1.0 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
