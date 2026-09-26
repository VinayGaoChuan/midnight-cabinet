// 铁地龙（敌人 · 混沌 · 稀有 · 短程）：矮墩的铁盔章鱼。深靛墨色的外套膜贴地圆顶，头顶扣一只锅形铆钉铁盔（圆顶、一圈外翻的盔沿伸出身体两侧各 2 格、顶上一根短尖），
// 两只紫眼从盔沿下露出来；身体侧前方伸出一根粗虹吸管，管口套铁箍，像一门短炮向前伸 5 格；6 条短粗触腕在身下摊开撑地，尖端卷起。
// 攻击：身体一鼓，虹吸管喷出一颗墨汁弹，直线飞出。
// 技能「墨潮」（没有特性，按描述「从腔处射出魔法墨汁」做）：身体鼓胀两圈，地上的墨汁倒流回来、定点汇进虹吸管口，盔沿亮起轮廓光 →
// 虹吸管后坐 2 格，喷出一颗 8 格大墨团 + 管口十字光 → 墨团炸成一团墨云，假人被染黑、变慢，地上留一滩墨迹。
// 死亡：铁盔弹开滚走，身体塌下去融成一滩墨，只剩管口的铁箍躺在墨滩边，最后消散。
PCD.define('EarthDragonIron', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, gait, walkDemo, defMat, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, shoot } = E;
  const B = E.parts.beast, L = B.blob, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.shadow, EL = FXR[R_EL];                                                    // 魔法墨汁 · 暗影墨紫：淡紫 → 灰紫 → 暗紫 → 墨紫 → 墨
  const RIMR = [21, 43, 43, 54, 53];                                                          // 轮廓光：墨色太暗，打在深色肉上看不见，改用淡紫一段
  const m = B.mats(E, { main: [0, 25, 42, 54], sclera: 'pale', iris: [0, 53, 43, 21], sucker: [0, 11, 12, 63],
    helm: [0, 27, 28, 30], rivet: [28, 29, 30, 31], hoop: 'iron' });
  m.brim1 = defMat([0, 54, 43, 43], 1, 1); m.brim2 = defMat([43, 43, 21, 21], 1, 1);            // 蓄力时亮起的盔沿（发光体）
  const SH = [9, 10, 11].map((r) => L.shape({ r, shape: 'dome', eye: { n: 2, r: 3 }, tent: null, mouth: null, m }));   // 鼓胀三档

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(64, 46, 32, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 20], rimRamp: RIMR, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'sclera', 'iris', 'spec', 'sucker', 'rivet', 'hoop', 'brim1', 'brim2']) RIM.skip[m[k]] = 1;

  // 本角色的姿势字段：puff 鼓胀档 0–2 · sr 虹吸管伸缩（-2 后坐 … 1 前吐）· reach / freach 近 / 远侧触腕伸缩 · grip 触腕抓地收紧 · limp 触腕摊软
  //   brim 盔沿亮 0–2 · hat 铁盔被震起 1 格 · hrot 掉落铁盔的朝向（90° 档）· pw 墨滩往两侧摊开的档 0–4
  const SPEC = L.KEYS.concat(B.COMMON, [['puff', 0, 2], ['sr', -2, 1], ['reach', -3, 3], ['freach', -3, 3], ['grip', 0, 1], ['limp', 0, 1],
    ['brim', 0, 2], ['hat', 0, 1], ['hrot', 0, 3], ['hy', 0, 24], ['pw', 0, 4]]);
  const P = {};
  function reset() { L.reset(P); P.puff = 0; P.sr = 0; P.reach = 0; P.freach = 0; P.grip = 0; P.limp = 0; P.brim = 0; P.hat = 0; P.hrot = 0; P.hy = 0; P.pw = 0; }
  reset();
  const curO = () => SH[P.puff];
  let rig = L.rig(P, SH[0]);
  const HIT_POINT = rig.hit;

  // ───── 几何：盔沿行、管口 ─────
  const brimY = (C) => R(C.y - C.ry * 0.42);
  function mouthAt(C) {                                                                        // 虹吸管口（铁箍中心），本地坐标
    if (P.lie === 1) return [R(C.x + C.rx + 3), -2];
    return [R(C.x + C.rx + 6 + P.sr), R(C.y - C.ry * 0.05)];
  }

  // ───── 姿势 ─────
  const T_FIRE = 2 / 12, T_BUB = [1.6 + 1 / 12, 1.6 + 3 / 12, 1.6 + 5 / 12];
  function idle(tq, f12) {
    const lp = L.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                                        // 待机个性：虹吸管口吐出一个个小墨泡，眼睛跟着往上看
      const k = Math.min(4, f12of(lp - 1.6)); P.sr = k & 1 ? 1 : 0; P.iy = -1; P.ix = k >= 3 ? 0 : 1; if (k === 4) P.lid = 2;
    }
  }
  function deathPose(d, f12) {
    P.lid = 4; P.pup = 0; P.bx = -2; P.limp = 1;
    if (d < 0.45) { P.sq = 2; P.limp = 0; P.grip = 1; }
    else if (d < 0.6) P.lie = 1;
    else if (d < 0.75) { P.lie = 1; P.pw = 1; }
    else { P.lie = 2; P.pw = d < 1.0 ? 2 : d < 1.3 ? 3 : 4; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }
    const dp = B.dropAt(d, { at: 0.3, dur: 0.4, dx: -12, hop: 9 }); P.drop = dp[0]; P.dsx = dp[1]; P.dsy = dp[2];   // 铁盔弹开
    P.hy = P.dsy + R(10 * (1 - clamp01((d - 0.3) / 0.4)));                                        // 从戴在头上的高度（盔底离地约 10 格）抛起再落地
    if (P.drop === 1) P.hrot = Math.floor((d - 0.3) * 12 + 1e-6) & 3;
    else if (P.drop === 2) { const k = Math.min(5, Math.floor((d - 0.7) * 24 + 1e-6)); P.dsx = -12 - k; P.hrot = k >= 5 ? 1 : (k + 1) & 3; }   // 落地后再滚几格，侧着停下
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                    // 触腕交替吸地挪动，身体一耸一耸
      const f = gait(tq); P.gf = f;
      P.sq = [1, -1, 1, -1][f]; P.reach = [2, 0, -2, 0][f]; P.freach = [-2, 0, 2, 0][f]; P.tph = f * 2; P.bob = f & 1 ? -1 : 0; P.grip = f & 1 ? 0 : 1;
      const w = walkDemo(tq, 10, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 1 / 12 - 1e-6) idle(tq, f12);
      else if (tq < T_FIRE - 1e-6) { P.sq = -1; P.puff = 1; P.sr = 1; P.grip = 1; }            // 身体一鼓
      else if (tq < 0.25) { P.sq = 1; P.sr = -1; P.bx = -1; P.grip = 1; }                      // 喷出，后坐
      else if (tq < 0.42) { P.sq = 1; P.grip = 1; }
      else if (tq < 0.6) { P.sq = 0; P.tph = 3; }
      else P.tph = 1;
    } else if (st === CHARGE) {
      P.puff = tq < 0.35 ? 0 : tq < 0.7 ? 1 : 2; P.sq = tq < 0.35 ? 0 : -1; P.grip = 1; P.lid = 1; P.rim = 2; P.tph = f12 & 7;
      P.brim = tq < 0.5 ? 0 : tq < 1.0 ? 1 : (f12 & 1) + 1; P.sr = tq >= 1.1 ? 1 : 0;
    } else if (st === CAST) {
      P.sq = 1; P.sr = tq < 2 / 12 ? -2 : tq < 0.3 ? -1 : 0; P.bx = tq < 1 / 12 ? -1 : 0; P.brim = 2; P.rim = 3; P.grip = 1; P.pup = 2;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); P.sq = q < 0.3 ? 1 : 0; P.brim = q < 0.4 ? 1 : 0; P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0; P.tph = (f12 >> 1) & 7;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { L.anim.hurt(P, h); if (h < 0.2) { P.hat = 1; P.grip = 1; } }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { L.anim.death(P, d, f12, 0); P.hat = f12 & 1; P.grip = 1; P.lie = 0; P.lift = 0; }
      else deathPose(d, f12);
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = L.rig(P, curO());
    const mo = mouthAt(rig.C); P.gx = mo[0] + 1 + P.bx; P.gy = mo[1];
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：stubTentacle（短粗触腕：根粗梢细、贴地横铺、尖端往上卷；近侧的贴地一侧一排吸盘）
  const TENTS = [   // [根 x（按 r 9 写）, 根 y, 方向, 长, 根半径, 远侧, 类型 f 前 / m 中 / b 后]
    [-4, -3, -1, 7, 1.8, 1, 'b'], [2, -3, 1, 6, 1.7, 1, 'm'], [5, -3, 1, 7, 1.8, 1, 'f'],
    [-7, -2, -1, 8, 2.3, 0, 'b'], [-1, -2, -1, 5, 2.0, 0, 'm'], [6, -2, 1, 8, 2.3, 0, 'f'],
  ];
  const CURL = [0, 1, 2, 1, 0, -1, -2, -1];
  function tentacle(i, C) {
    const [xr, y0, dir, len0, r0, far, kind] = TENTS[i], mat = far ? m.far : m.limb, x0 = C.x + xr * C.rx / 9;
    let len = len0, th = -0.9, curl = 0.45 + 0.1 * CURL[(P.tph + i * 3) & 7], amp = 0.05;
    const rch = far ? P.freach : P.reach;
    if (kind === 'f') len += rch; else if (kind === 'b') len -= rch;
    if (P.grip) { curl += 0.2; len -= 1; }
    if (P.limp) { len += 1; th = -0.2; curl = 0.08; amp = 0; }
    E.part();
    let x = x0, y = y0; const pts = [];
    for (let k = 0; k <= len; k++) {
      const q = k / len, r = r0 + (0.6 - r0) * q;
      U.disc(E, x, y, r, mat, 0); pts.push(x, y, r);
      if (k < len - 3) th += (-0.02 - th) * 0.45 + amp * Math.sin(k * 0.9 + P.tph); else th += curl;
      x += dir * Math.cos(th); y -= Math.sin(th);
      if (y > -r) { y = -r; if (th < 0) th = 0; }
    }
    if (!far) for (let k = 2; k < len - 1; k += 2) { const px = pts[k * 3], py = pts[k * 3 + 1], r = pts[k * 3 + 2]; U.dot(E, px, py + r, m.sucker, k % 4 ? 3 : 4); }
  }
  // 候选部件：siphonCannon（虹吸管炮口：从身体侧前方伸出的 3 格粗软管，每 2 格一道环纹；管口套 2 格宽铁箍，箍上一颗铆钉，正中一格墨色管孔）
  function siphon(C) {
    if (P.lie === 2) { hoopAt(R(C.x + C.rx + 1 + P.pw * 2), -2, 1); return; }                 // 融化后只剩铁箍躺在墨滩边
    E.part();
    const [mx, my] = mouthAt(C), x0 = R(C.x + C.rx * 0.45), y0 = R(C.y + C.ry * 0.15);
    const n = Math.max(1, mx - 1 - x0);
    for (let k = 0; k <= n; k++) {
      const x = x0 + k, y = y0 + (my - y0) * k / n, r = 1.6 - 0.2 * k / n;
      U.disc(E, x, y, r, m.limb, 0);
      if (k > 2 && (k & 1) === 0) { U.dot(E, x, R(y) - 1, m.limb, 2); U.dot(E, x, R(y) + 1, m.limb, 1); }   // 环纹
    }
    hoopAt(mx, my, 0);
  }
  function hoopAt(x, y, flat) {
    E.part();
    if (flat) { for (let k = -2; k <= 2; k++) { U.dot(E, x + k, y + 1, m.hoop, k === -2 ? 4 : 3); U.dot(E, x + k, y + 2, m.hoop, 2); } U.dot(E, x, y + 1, m.rivet, 4); return; }
    for (let j = -2; j <= 2; j++) { U.dot(E, x - 1, y + j, m.hoop, j === -2 ? 4 : 3); U.dot(E, x, y + j, m.hoop, j === 2 ? 2 : 3); }
    U.dot(E, x, y, m.ink, 1); U.dot(E, x - 1, y - 1, m.rivet, 4);
  }
  // 候选部件：potHelm（锅形铆钉铁盔：半椭圆盔顶 + 前缝 + 顶上短尖，盔顶下一圈铆钉箍，盔沿两行、两端往下翻，比身体宽 2 格；按 90° 档旋转 = 掉在地上）
  function helmPix(W, H) {
    const a = [];   // [dx, dy, 材质键, tone]
    for (let x = -(W + 2); x <= W + 2; x++) a.push([x, 0, 'brim', x < -W ? 4 : Math.abs(x) >= W + 1 ? 3 : 3]);
    for (const s of [-1, 1]) { a.push([s * (W + 2), 1, 'brim', 2]); a.push([s * (W + 1), 1, 'brim', 2]); }
    for (let x = -(W - 1); x <= W - 1; x++) a.push([x, -1, (x + 40) % 3 === 1 ? 'rivet' : 'helm', (x + 40) % 3 === 1 ? 4 : 2]);
    for (let y = 2; y <= H; y++) {
      const hw = Math.floor((W - 1) * Math.sqrt(Math.max(0, 1 - ((y - 1.5) / (H + 0.5)) ** 2)) + 0.35);
      for (let x = -hw; x <= hw; x++) a.push([x, -y, 'helm', x === 2 ? 2 : (x < -hw + 2 && y > 2) || y === H ? 4 : 0]);
    }
    a.push([0, -H - 1, 'helm', 4], [1, -H - 1, 'helm', 3], [0, -H - 2, 'helm', 4], [0, -H - 3, 'rivet', 4]);   // 顶上短尖
    return a;
  }
  const HELM = helmPix(8, 6);
  const HBOT = [0, 1, 2, 3].map((r) => { let b = -99; for (const [dx, dy] of HELM) { const v = r === 0 ? dy : r === 1 ? dx : r === 2 ? -dy : -dx; if (v > b) b = v; } return b; });
  function helmet(ax, ay, rot) {
    E.part();
    const bm = P.brim === 2 ? m.brim2 : P.brim === 1 ? m.brim1 : m.helm;
    for (const [dx, dy, k, t] of HELM) {
      const x = rot === 0 ? dx : rot === 1 ? -dy : rot === 2 ? -dx : dy, y = rot === 0 ? dy : rot === 1 ? dx : rot === 2 ? -dy : -dx;
      const mat = k === 'brim' ? bm : m[k];
      U.dot(E, ax + x, ay + y, mat, k === 'brim' && P.brim ? (t === 4 ? 3 : t) : t);
    }
  }
  // 候选部件：inkPool（墨滩：身体融化后往两侧摊开的 1–2 行墨，边上几颗墨珠，和身体同一个部件）
  function inkPool(C) {
    if (!P.pw) return;
    const half = C.rx + P.pw * 2;
    for (let x = R(C.x - half); x <= R(C.x + half); x++) {
      const e = Math.abs(x - C.x) > half - 1.5; U.dot(E, x, 0, m.body, e ? 2 : 3);
      if (Math.abs(x - C.x) < half - 2) U.dot(E, x, -1, m.body, ((x + 40) % 5) === 0 ? 4 : 3);
    }
    for (const s of [-1, 1]) U.dot(E, C.x + s * (half + 2), 0, m.body, 2);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const oo = curO(), C = rig.C;
    if (P.lie < 2) for (let i = 0; i < 3; i++) tentacle(i, C);
    L.body(E, rig, P, oo); inkPool(C);
    if (P.lie < 2) {
      const yb = brimY(C); rig.eye[1] = yb + 3; rig.eye[0] = C.x + C.rx * 0.28;                 // 眼睛放在盔沿下面
      L.eye(E, rig, P, oo);
      if (!P.drop) helmet(R(C.x - 0.5), yb - P.hat, 0);
    }
    siphon(C);
    if (P.lie < 2) for (let i = 3; i < 6; i++) tentacle(i, C);
    if (P.drop) { const r = P.hrot; helmet(-1 + P.dsx, -HBOT[r] - P.hy, r); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const NBU = 4, buX = new Float32Array(NBU), buY = new Float32Array(NBU), buT = new Float32Array(NBU).fill(9);   // 待机小墨泡
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, mzT = 9, mzX = 0, mzY = 0, poolT = 9;
  const mouthScr = () => [scrX(P.gx) + 1, HY + P.gy];
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [x, y] = mouthScr();
      releaseOrbit(40, 90, 0.2, 0.45, { pts: 1 }); ring(x, y, 0, R_EL); fx.cross(x + 1, y, 6, R_EL, 0.25, 2); burst(x, y, 14, 40, 110, 0.15, 0.4, R_EL, 6);
      shake(0.28, 2); flash(0.05); mzT = 0; mzX = x; mzY = y;
      shoot(2, x + 3, y, 170, DUMMY_X - 2, R_EL, ((HY - 13) - y) / ((DUMMY_X - 2 - x - 3) / 170), { trail: { every: 1, life: [0.12, 0.3], back: [8, 24] }, glow: 3 });
      sfx('shoot', { proj: 'water' });
    }
    if (s === CHARGE || s === IDLE || s === MOVE) poolT = 9;
  }
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 10, 30, 80, 0.15, 0.35, R_EL, 6); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.4 }); return; }
    fx.cloud(x, y, 9, R_EL, 1.0, 2); burst(x, y, 22, 40, 120, 0.2, 0.5, R_EL, 12); ring(x, y, 1, R_EL);
    for (let i = 0; i < 10; i++) spawnX(K_PHYS, x, y, (Math.random() - 0.5) * 80, -30 - Math.random() * 50, 0.8, R_EL, { g: 260, floor: HY });
    dummyFx({ dur: 1.6, tint: 'shadow', slow: 0.4 }); hitDummy(1, 1); shake(0.12, 1); poolT = 0;
    sfx('impact', { pal: 'shadow', w: 0.6 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) {
      const [x, y] = mouthScr(); mzT = 0; mzX = x; mzY = y;
      shoot(1, x + 2, y, 150, DUMMY_X - 3, R_EL, ((HY - 14) - y) / ((DUMMY_X - 5 - x) / 150), { trail: { every: 2, life: [0.1, 0.22] } });
      burst(x, y, 5, 20, 50, 0.1, 0.2, R_EL, 4); sfx('swing', { kind: 'gun', w: 0.4 }); sfx('shoot', { proj: 'water' });
    }
    if (s === IDLE && T_BUB.includes(t)) { const [x, y] = mouthScr(); let i = 0; for (; i < NBU - 1 && buT[i] < 0.5; i++); buX[i] = x + 1; buY[i] = y - 1; buT[i] = 0; }
    if (s === DEATH && t === INCOMING + 0.3) { sfx('hit', { mat: 'metal', w: 0.5 }); burst(scrX(-4 + P.bx), HY - 18, 8, 30, 80, 0.12, 0.3, FXI.impact, 20); }   // 铁盔弹开
    if (s === DEATH && t === INCOMING + 0.6) {                                                  // 身体塌下
      for (let i = 0; i < 8; i++) spawnX(K_PHYS, HX - 8 + Math.random() * 16, HY - 4, (Math.random() - 0.5) * 60, -30 - Math.random() * 30, 0.6, R_EL, { g: 240, floor: HY });
      shake(0.1, 1); sfx('fall', { w: 0.6 });
    }
    if (s === DEATH && t === INCOMING + 0.72) { for (let i = 0; i < 6; i++) spawn(K_DUST, scrX(-16) + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3, FXI.dust); sfx('hit', { mat: 'metal', w: 0.35 }); }
  }
  const EVENTS = [T_BUB, [], [T_FIRE], [], [], [], [], [INCOMING + 0.3, INCOMING + 0.6, INCOMING + 0.72], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                                                    // 墨汁从地面倒流回来，定点螺旋汇进管口
      const [tx, ty] = mouthScr(); chargeAcc += dt * (16 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 14 + Math.random() * 10, a = 0.15 + Math.random() * (Math.PI - 0.3); spawnX(K_SPIRAL_PT, tx, ty, (r - 3.5) / (0.35 + Math.random() * 0.35), 0, 9, R_EL, { a, r, w: 4 + Math.random() * 3, tx, ty, squash: 0.45 }); }
    }
    if (state === MOVE) {
      const f = gait(q12(stT));
      if (f !== lastGf) { if (f === 0 || f === 2) { const x = scrX(f === 0 ? 12 : -10); spawn(K_DUST, x, HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 4, 0.25, FXI.dust); spawnX(K_PHYS, x, HY - 2, (Math.random() - 0.5) * 20, -20, 0.4, R_EL, { g: 200, floor: HY }); sfx('step', { w: 0.5 }); } lastGf = f; }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {
      soulAcc += dt * 14; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 24, HY - 1 - Math.random() * 3, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.7 + Math.random() * 0.6, Math.random() < 0.5 ? FXI.soul : R_EL); }
    }
    for (let i = 0; i < NBU; i++) {
      if (buT[i] >= 0.5) continue; buT[i] += dt; buX[i] += 5 * dt; buY[i] -= 16 * dt;
      if (buT[i] >= 0.5) burst(buX[i], buY[i], 4, 10, 25, 0.1, 0.2, R_EL, 2);                  // 破掉
    }
    mzT += dt; poolT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; mzT = 9; poolT = 9; buT.fill(9); }
  function fxBack(f12) {
    if (P.rim >= 2 && P.dq < 1) floorGlow(scrX(P.gx), P.rim, RIMR, f12);
    if (E.state === CHARGE) {                                                                  // 地上两道墨迹往回缩
      const q = clamp01(E.stT / 1.2), [mx] = mouthScr();
      for (let x = R(mx - 30 + 22 * q); x < mx - 8; x++) if ((x + f12) % 3) put(x, FLOOR, EL[(x & 1) + 2]);
      for (let x = R(mx + 2); x < R(mx + 34 - 26 * q); x++) if ((x + f12) % 3) put(x, FLOOR, EL[(x & 1) + 2]);
    }
    if (poolT < 1.6) {                                                                         // 假人脚下留一滩墨迹
      const w = R(poolT < 0.2 ? 4 + poolT * 40 : poolT > 1.2 ? 12 * (1.6 - poolT) / 0.4 : 12);
      for (let x = DUMMY_X - w; x <= DUMMY_X + w; x++) { if (poolT > 1.2 && ((x + f12) & 1)) continue; put(x, FLOOR, Math.abs(x - DUMMY_X) > w - 2 ? EL[3] : EL[4]); if (Math.abs(x - DUMMY_X) < w - 3) put(x, FLOOR + 1, EL[3]); }
      put(DUMMY_X - 4, FLOOR, EL[1]); put(DUMMY_X + 3, FLOOR, EL[1]);
    }
  }
  function fxFront(f12) {
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? 0 : 1; put(mzX + 1, mzY, EL[c]); put(mzX + 2, mzY, EL[c]); put(mzX + 3, mzY, EL[c + 1]); put(mzX + 1, mzY - 1, EL[c + 1]); put(mzX + 1, mzY + 1, EL[c + 1]); }
    for (let i = 0; i < NBU; i++) {                                                            // 小墨泡：3×3 空心圈 + 一格高光
      if (buT[i] >= 0.5) continue; const x = R(buX[i]), y = R(buY[i]);
      put(x, y - 1, 54); put(x - 1, y, 54); put(x + 1, y, 53); put(x, y + 1, 53); put(x - 1, y - 1, 43);
    }
  }
  function drawShot(k, x, y, d, f12) {                                                          // 墨汁弹：墨色团 + 淡紫高光；大墨团是 8 格菱形，边缘一抖一抖
    if (k === 1) { put(x, y, 53); put(x - d, y, 52); put(x + d, y, 52); put(x, y - 1, 54); put(x, y + 1, 52); put(x - (f12 & 1 ? 1 : 0) * d, y - 1, 43); put(x - 2 * d, y + (f12 & 1), 53); return true; }
    if (k === 2) {
      const r = 4;
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        const q = Math.abs(i) + Math.abs(j); if (q > r) continue;
        let c = q === r ? 0 : q >= r - 1 ? 52 : 53; if (q === r && ((i + j + f12) & 1)) c = 52;
        if (i <= -1 && j <= -1 && q <= 2) c = 54; if (i === -1 && j === -2) c = 43;
        put(x + i * d, y + j, c);
      }
      put(x - 5 * d, y + (f12 & 1 ? 1 : -1), 53); put(x - 6 * d, y, 52);
      return true;
    }
    return false;
  }

  return {
    name: '铁地龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.brim1, m.brim2], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'dissolve', pal: 'shadow', style: 'shadow', w: 0.6 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
