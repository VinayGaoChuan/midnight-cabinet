// 火鸡（部队 · 不死 · 商人 · 优质 · 远程 640）：雏鸡进化成的横宽圆桶飞禽——烟熏乌铜羽的大椭圆身体、细长颈小头，
// 背后竖着一面开屏扇尾（12 根只剩骨质羽轴的秃尾羽，末端挂破羽片，羽尖一颗铜色眼斑），
// 喙上垂下长长的红肉瘤（从雏鸡呆毛的位置长出来），两条腿套着白色纸花腿套，脖子上挂一串 5 枚方孔铜钱，
// 肚皮十字麻绳缝线更粗、还插着一根木签，空眼窝里是铜橙色魂火。
// 攻击：扇尾向前一甩，一根骨羽越过头顶抛射出去；技能「美味 · 开屏撒铜钱」：扇尾全开、眼斑逐根点亮 → 5 根铜尖骨羽扇形齐射 → 插在假人周围炸成铜币。
// 死亡：坠地后翻成肚皮朝天的「烤火鸡摆盘」、两条纸花腿朝天，铜钱串断开、铜币滚开，自上而下消散。由雏鸡升级。
// 身体用 parts-beast 的 fly 骨架（rig、身体、羽翼）；开屏扇尾、肉瘤、纸花腿、铜钱串、缝线木签、倒地姿是本模块的部件。
PCD.define('Turkey', (E) => {
  const { Sprite, begin, part, sp, bake, ease, clamp01, keys, mix, q12, f12of, gait, walkDemo, near, color, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_TRAIL, K_EMBER,
    spawn, spawnX, burst, clearOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, groundShadow } = E;
  const B = E.parts.beast, F = B.fly, U = B.util, R = Math.round, D2R = Math.PI / 180;

  // ───── 颜色、材质 ─────
  const B0 = color('#140f0c'), B1 = color('#2e2420'), B2 = color('#4e3c30'), B3 = color('#7a5c40'), C_EDGE = color('#c87a3a');   // 烟熏乌铜羽 + 铜色羽缘
  const C_AP = near('#ffd8b0'), C_OR = near('#e8904a'), C_RC = near('#a0501e'), C_BR = near('#4a200c');
  const C_SN = near('#b83a44'), C_SL = near('#e0707a');
  const R_EL = fxRamp('roastCopper', [21, C_AP, C_OR, C_RC, C_BR]), EL = FXR[R_EL];          // 美味 · 烤铜：21 白 → 淡杏 → 铜橙 → 赤铜 → 焦褐
  const COP = [C_BR, C_RC, C_OR, C_AP];
  const m = B.mats(E, { main: [B0, B1, B2, B3], feather: [B0, B1, B2, B3], vane: [B0, B1, B2, C_EDGE], bone: 'bone', skin: 'pale', snood: [55, 56, C_SN, C_SL],
    paper: 'white', string: 'crimson', coin: COP, twine: 'sand', wood: 'wood', beak: 'sand', edge: [B0, C_RC, C_EDGE, C_OR],
    eye: COP, spot: COP, glow: [C_AP, C_AP, 21, 21] });                                      // eye / spot 平涂：tone 1 熄 · 2 赤铜 · 3 铜橙 · 4 淡杏
  m.spot = E.defMat(COP, 1, 1);                                                             // 眼斑平涂（不压分界线）
  const o = F.shape({ alt: 5, rx: 8, ry: 6, head: 'bird', hr: 2.5, tail: 'none', wing: { span: 9, chord: 4, type: 'feather', fingers: 3 }, m });
  const LIFT0 = 4;                                                                           // alt 5 + 4 = 身体离地 9、纸花腿离地 2–3 格（悬停，读得出在飞）
  const FAN = [[25, 100, 9], [-5, 140, 12], [-12, 150, 13], [-18, 158, 14]];                  // 扇尾开合：[起角, 止角, 半径]（角度从正后方量，90 = 竖直向上）；待机半径 12 ≈ 直径 18 格的半圆扇

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(76, 56, 38, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 16, 20], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['body', 'limb', 'far', 'feather', 'featherFar', 'vane', 'skin', 'snood', 'paper', 'string', 'coin', 'twine', 'wood', 'beak', 'edge', 'eye', 'spot', 'glow', 'ink']) RIM.skip[m[k]] = 1;
  const SPEC = F.KEYS.concat(B.COMMON, [['fan', 0, 3], ['ftilt', -1, 1], ['fshake', 0, 1], ['lit', 0, 12], ['miss', 0, 1], ['snood', -1, 1], ['slen', 0, 2], ['hdx', -1, 2], ['eyeLv', 0, 4]]);
  const P = {};
  function reset() { F.reset(P); P.fan = 1; P.ftilt = 0; P.fshake = 0; P.lit = 0; P.miss = 0; P.snood = 0; P.slen = 0; P.hdx = 0; P.eyeLv = 1; P.lift = LIFT0; P.legs = 1; }
  reset();
  let rig = F.rig(P, o);
  const hd = { x: 0, y: 0, r: 2.5 };
  function build() { rig = F.rig(P, o); const C = rig.C; hd.x = C.x + 10 + P.hdx; hd.y = C.y - 9 + P.head; }
  build();
  const HIT_POINT = [0, R(rig.C.y)];
  const eyeAt = () => [R(hd.x + 0.5), R(hd.y - 0.5)];
  const fanC = () => { const C = rig.C; return [C.x - 3, C.y - 4 - (P.fshake ? 1 : 0)]; };    // 扇尾根（藏在身体后上方，羽轴汇聚处被身体挡住）
  const qLen = (r, k) => r - (k & 1 ? 2 : 0);                                              // 长短羽轴交替：剪影上是一圈锯齿
  function fanTip(k, n) { const f = FAN[P.fan], c = fanC(), a = (f[0] + (f[1] - f[0]) * k / (n - 1) + P.ftilt * 15) * D2R, r = qLen(f[2], k); return [c[0] - Math.cos(a) * r, c[1] - Math.sin(a) * r]; }

  // ───── 姿势 ─────
  const F_ALL = ['lift', 'pitch', 'head', 'hdx', 'jaw', 'bx', 'ftilt', 'snood'];
  const REST = { lift: LIFT0, pitch: 0, head: 0, hdx: 0, jaw: 0, bx: 0, ftilt: 0, snood: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ pitch: -1, head: -1, hdx: -1, ftilt: -1, snood: 1, bx: -1 });                        // 扇尾后拉
  const A_FLICK = pose({ pitch: 1, head: 1, hdx: 1, ftilt: 1, snood: -1, jaw: 1 });                         // 扇尾向前一甩
  const A_HOLD = pose({ pitch: 0, hdx: 1, ftilt: 1, snood: 1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_FLICK, 'snap'], [0.25, A_FLICK, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_SPREAD = pose({ lift: 1, pitch: -1, head: -1, hdx: -1, snood: 1 });                                // 挺胸开屏
  const S_GOBBLE = pose({ lift: 2, pitch: 1, head: 2, hdx: 2, jaw: 2, ftilt: 1, snood: -1 });                // 「咕噜」猛甩头
  const S_AFTER = pose({ lift: 2, pitch: 0, head: 0, hdx: 0, ftilt: 0, snood: 1 });
  const RATTLE = [[2, 0, 1, 1], [2, 1, -1, -1], [2, 0, 1, 1], [3, 1, -1, 0], [1, 0, 0, 0]];                  // 待机个性「咯咯抖屏」：[fan, fshake, hdx, snood]
  const T_HIT = 2 / 12, T_FALL = INCOMING + 0.66;
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  function flap(f12) { const f = (f12 >> 1) & 3; P.gf = f; P.bob = B.FLAP_BOB[f]; }
  function idle(tq, f12) {
    flap(f12); P.snood = P.gf === 1 ? 1 : P.gf === 3 ? -1 : 0;
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const s = RATTLE[Math.min(4, f12of(lp - 1.6))]; P.fan = s[0]; P.fshake = s[1]; P.hdx = s[2]; P.snood = s[3]; P.jaw = s[1]; }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                 // 滑翔：扑一下滑两拍，身体前后晃（显得肥），扇尾半收
      const f = gait(tq); P.gf = -1; P.wing = [1, 3, 2, 2][f]; P.bob = [0, -1, 0, 1][f]; P.pitch = [0, 1, 0, -1][f]; P.fan = 0; P.legs = 0; P.snood = [1, -1, 0, 1][f]; P.ftilt = f === 3 ? 1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp); P.miss = tq >= T_HIT && tq < 0.55 ? 1 : 0;
      if (tq < 0.25) { P.gf = -1; P.wing = tq < 0.12 ? 4 : 5; } else flap(f12);
      if (tq >= 0.12 && tq < 0.25) { P.rim = 1; P.eyeLv = 2; }
    } else if (st === CHARGE) {                                                             // 扇尾完全展开，12 个眼斑从下往上逐根点亮，肉瘤充血变长
      const q = ease.inOut(clamp01(tq / 0.7)); mix(tmp, REST, C_SPREAD, q, F_ALL); apply(tmp);
      P.fan = q < 0.3 ? 1 : q < 0.7 ? 2 : 3; P.lit = Math.min(12, Math.max(0, Math.floor((tq - 0.35) / 0.075))); P.slen = tq < 0.5 ? 0 : tq < 0.9 ? 1 : 2;
      P.gf = -1; P.wing = 4; P.eyeLv = tq < 0.45 ? 1 : ((f12 & 1) ? 3 : 2); P.rim = 2;
      if (tq > 1.1) { P.fshake = f12 & 1; P.snood = (f12 & 1) ? 1 : -1; }
    } else if (st === CAST) {
      if (tq < T_HIT) { apply(S_GOBBLE); P.fshake = f12 & 1; } else { mix(tmp, S_GOBBLE, S_AFTER, ease.out(clamp01((tq - T_HIT) / 0.2)), F_ALL); apply(tmp); }
      P.fan = 3; P.lit = tq < T_HIT ? 12 : 7; P.slen = 2; P.gf = -1; P.wing = 5; P.eyeLv = 3; P.rim = 3;
    } else if (st === RECOVER) {                                                            // 扇尾慢慢合拢，羽尖逐根熄灭
      const q = ease.inOut(clamp01(tq / 0.6)); mix(tmp, S_AFTER, REST, q, F_ALL); apply(tmp); flap(f12);
      P.fan = q < 0.3 ? 3 : q < 0.65 ? 2 : 1; P.lit = Math.max(0, 7 - Math.floor(tq / 0.08)); P.slen = q < 0.5 ? 1 : 0;
      P.eyeLv = q < 0.4 ? 2 : 1; P.rim = q < 0.4 ? 2 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0 || h >= 0.35) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.eyes = 1; P.eyeLv = 0; P.gf = -1; P.wing = 1; P.pitch = -1; P.head = -1; P.hdx = -1; P.ftilt = -1; P.snood = 1; P.fshake = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else { P.bx = -1; P.eyes = 1; P.eyeLv = 0; P.gf = -1; P.wing = 4; P.snood = -1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.eyeLv = (f12 & 1) ? 2 : 0; P.gf = -1; P.wing = 1; P.pitch = -1; P.head = -1; P.ftilt = -1; P.snood = 1; P.fshake = 1; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < 0.66) {                                                                  // 失去浮力坠地：翅膀乱扑、扇尾收拢
        const q = (d - 0.3) / 0.36; P.lie = 1; P.lift = Math.max(0, R((o.alt + LIFT0) * (1 - q * q))); P.bx = -2; P.gf = -1; P.wing = [1, 4, 6, 1, 4, 6, 6][Math.floor(q * 6)] || 6;
        P.pitch = 1; P.eyes = 1; P.eyeLv = 0; P.fan = 0; P.head = 1; P.snood = (f12 & 1) ? 1 : -1;
      } else {                                                                              // 肚皮朝天的「烤火鸡摆盘」
        P.lie = 2; P.bx = -2; P.eyes = 1; P.lift = d < 0.74 ? 1 : 0;
        P.eyeLv = d < 0.9 ? ((f12 & 1) ? 2 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    build();
    if (P.lie === 2) { P.gx = 12 + P.bx; P.gy = -3; }
    else if (st === CHARGE || st === CAST || (st === RECOVER && tq < 0.3)) { const c = fanC(); P.gx = R(c[0]) + P.bx; P.gy = R(c[1]); }
    else { const e = eyeAt(); P.gx = e[0] + P.bx; P.gy = e[1]; }
    B.key(P, SPEC);
  }

  // ───── 画：部件 ─────
  // 候选部件：fanTail 开屏扇尾——以 (cx, cy) 为根的一面半圆扇：n 根 1 格骨质羽轴从根放射，长短交替（短的少 2 格，剪影外沿成锯齿），
  //   羽轴末端 3 格挂破羽片（按根号错开、缺口随机，铜色羽缘），羽尖一颗眼斑（平时铜橙，lit 根亮成淡杏）；根部一块半圆覆羽。
  //   a0 / a1 角度从正后方量（90 = 向上）；skip 第几根不画（射出去了）。一个部件。
  function fanTail(cx, cy, a0, a1, r, n, lit, skip) {
    part();
    for (let k = 0; k < n; k++) {
      if (k === skip) continue;
      const a = (a0 + (a1 - a0) * k / (n - 1)) * D2R, dx = -Math.cos(a), dy = -Math.sin(a), px = -dy, py = dx, rk = qLen(r, k);
      const mid = (rk + 4) / 2;
      U.seg(E, cx + dx * 4, cy + dy * 4, cx + dx * mid, cy + dy * mid, 1, m.bone, 2); U.seg(E, cx + dx * mid, cy + dy * mid, cx + dx * (rk - 1), cy + dy * (rk - 1), 1, m.bone, 0);   // 羽轴：根部暗一级，往外变亮
      for (let s = rk - 4; s <= rk - 2; s++) {                                              // 破羽片：羽轴一侧 1–2 格，有缺口
        if (U.hash(k, s) < 0.28) continue; const w = U.hash(s, k + 7) < 0.5 ? 1 : 2;
        for (let j = 1; j <= w; j++) U.dot(E, cx + dx * s + px * j * (k & 1 ? 1 : -1), cy + dy * s + py * j * (k & 1 ? 1 : -1), m.vane, j === w ? 2 : 0);
      }
      U.dot(E, cx + dx * rk, cy + dy * rk, m.spot, k < lit ? 4 : 3);                        // 眼斑：铜橙 → 点亮成淡杏
      U.dot(E, cx + dx * (rk - 1), cy + dy * (rk - 1), m.spot, k < lit ? 3 : 2);
    }
    for (let a = a0 - 10; a <= a1 + 10; a += 12) { const q = a * D2R; U.disc(E, cx - Math.cos(q) * 2, cy - Math.sin(q) * 2, 1.6, m.body, 0); }   // 根部覆羽
  }
  // 候选部件：frillLeg 纸花腿——细胫 + 三趾，胫上端套一圈白色纸花（锯齿 5 格宽、伸出腿轮廓 2 格）；up = 1 倒过来朝天（烤火鸡摆盘）。一个部件。
  function frillLeg(x, y, len, step, far, up) {
    part();
    const sgn = up ? -1 : 1, ax = x + step, ay = y + sgn * len;
    U.seg(E, x, y, ax, ay, 1, m.skin, far ? 2 : 0);
    if (up) { U.dot(E, ax, ay - 1, m.bone, 4); for (const i of [-2, 0, 2]) U.dot(E, ax + i, ay - 2, m.paper, 4); for (let i = -2; i <= 2; i++) U.dot(E, ax + i, ay - 1 + (i & 1), m.paper, (i & 1) ? 2 : 3); }   // 骨头端 + 纸花
    else {
      U.dot(E, ax + 1, ay, m.skin, 3); U.dot(E, ax + 2, ay, m.skin, 4); U.dot(E, ax - 1, ay, m.skin, 2);   // 趾
      const fy = y + 1; for (let i = -2; i <= 2; i++) U.dot(E, x + i, fy, m.paper, 0); for (const i of [-2, 0, 2]) U.dot(E, x + i, fy + 1, m.paper, 3);   // 纸花：一圈 + 锯齿下沿
    }
  }
  function speckle() {                                                                      // 铜色羽缘：身体上逐排错开的鳞纹（紧跟身体画）
    const C = rig.C;
    for (let v = -4; v <= 2; v += 3) for (let u = -6 + (v === -1 ? 2 : 0); u <= 5; u += 4) { const q = (u / rig.rx) ** 2 + (v / rig.ry) ** 2; if (q > 0.62) continue; const p = U.toW(C.x, C.y, C.a, u, v); U.dot(E, p[0], p[1], m.edge, v < 0 ? 3 : 2); }
  }
  function belly() {                                                                        // 粗十字麻绳缝线 + 插着的木签（紧跟身体画）
    const C = rig.C, v = rig.ry * 0.62;
    for (let u = -5; u <= 5; u++) { const p = U.toW(C.x, C.y, C.a, u, v); U.dot(E, p[0], p[1], m.body, 1); }
    for (const u of [-4, 0, 4]) { for (const [du, dv] of [[-1, -1], [1, 1], [1, -1], [-1, 1]]) { const p = U.toW(C.x, C.y, C.a, u + du, v + dv); U.dot(E, p[0], p[1], m.twine, dv < 0 ? 3 : 2); } }
    const s0 = U.toW(C.x, C.y, C.a, 2, v - 1.5), s1 = U.toW(C.x, C.y, C.a, 7, v + 3.5); U.seg(E, s0[0], s0[1], s1[0], s1[1], 1, m.wood, 3); U.dot(E, s1[0], s1[1], m.wood, 4);   // 木签斜着戳出肚皮
  }
  const BEADS = [[4, -4.5], [4, -1.5], [5, 1.5], [7.5, 3], [10, 2], [11, -1], [9.5, -3.5]];   // 红绳从颈后兜过胸前回到颈前，5 枚铜钱串在上面（相对身体中心）
  function coinString() {                                                                   // 颈下一串 5 枚铜钱：每枚 2×2（左上亮、右下暗），红绳从中间穿过
    part(); const C = rig.C, sw = P.snood * 0.5, bx = (i) => C.x + BEADS[i][0] + P.hdx * 0.3 + sw * Math.min(i, 5) / 5, by = (i) => C.y + BEADS[i][1];
    for (let i = 0; i < BEADS.length - 1; i++) U.seg(E, bx(i), by(i), bx(i + 1), by(i + 1), 1, m.string, 2);
    for (let i = 1; i <= 5; i++) { const x = R(bx(i) - 0.5), y = R(by(i) - 0.5); U.dot(E, x, y, m.coin, i === 3 ? 4 : 3); U.dot(E, x + 1, y, m.coin, 3); U.dot(E, x, y + 1, m.coin, 2); U.dot(E, x + 1, y + 1, m.coin, 2); }
  }
  function headNeck() {
    part(); const C = rig.C, nb = U.toW(C.x, C.y, C.a, rig.rx * 0.72, -rig.ry * 0.45);
    U.taper(E, nb[0], nb[1], hd.x - 1, hd.y + 1.5, 1.6, 1.1, m.skin, 0);                     // 细长颈（秃皮）
    for (let k = 1; k <= 3; k++) { const x = nb[0] + (hd.x - 1 - nb[0]) * k / 4, y = nb[1] + (hd.y + 1.5 - nb[1]) * k / 4; U.dot(E, x + 1, y, m.skin, 2); }   // 颈上的皱
    U.oval(E, hd.x, hd.y, hd.r, hd.r * 0.9, m.skin, 0);
    const xe = R(hd.x + hd.r), by = R(hd.y), jaw = P.jaw | 0;                               // 短喙
    sp(xe, by, m.beak, 4); sp(xe + 1, by, m.beak, 3); if (jaw) { sp(xe, by + 1, m.ink, 0); sp(xe, by + 1 + jaw, m.beak, 2); sp(xe + 1, by + 1 + jaw, m.beak, 2); } else sp(xe, by + 1, m.beak, 2);
    const [ex, ey] = eyeAt(); sp(ex, ey, m.ink, 0); sp(ex + 1, ey, m.ink, 0); sp(ex - 1, ey - 1, m.skin, 4);   // 空眼窝 + 铜橙魂火
    const lv = P.eyes ? 0 : P.eyeLv;
    if (lv === 0) sp(ex, ey, m.eye, 1); else if (lv === 1) sp(ex, ey, m.eye, 3); else if (lv === 2) { sp(ex, ey, m.eye, 3); sp(ex + 1, ey, m.eye, 2); } else if (lv === 3) { sp(ex, ey, m.eye, 4); sp(ex + 1, ey, m.eye, 3); sp(ex, ey - 1, m.eye, 3); }
  }
  function snoodWattle() {                                                                  // 肉瘤：从额头（雏鸡呆毛的位置）搭过喙、垂下 3 格，会甩；喉下肉垂
    part(); const x0 = R(hd.x + 1), y0 = R(hd.y - hd.r + 0.5), L = 3 + P.slen, sw = P.snood | 0;
    U.dot(E, x0, y0, m.snood, 4); U.dot(E, x0 + 1, y0, m.snood, 3); U.dot(E, x0 + 2, y0 + 1, m.snood, 3);
    for (let k = 0; k < L; k++) U.dot(E, x0 + 3 + (k >= L - 2 ? sw : 0), y0 + 2 + k, m.snood, k === L - 1 ? 2 : 3);
    const wx = R(hd.x), wy = R(hd.y + hd.r); U.dot(E, wx, wy, m.snood, 3); U.dot(E, wx - 1, wy, m.snood, 2); U.dot(E, wx, wy + 1, m.snood, 2); U.dot(E, wx - 1 - sw * 0, wy + 1, m.snood, 1); U.dot(E, wx + (sw < 0 ? -1 : 0), wy + 2, m.snood, 2);
  }
  function wingEdge(x, y, pose) {                                                          // 近翼的铜色羽缘：初级飞羽尖 + 前缘中点各 1 格（紧跟 B.wing 画，并进翼的部件）
    const W = B.WINGS[pose | 0] || B.WINGS[0], w = o.wing, a0 = W[0], aT = W[1], fold = W[2], arm = w.span * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm;
    for (let k = 0; k < w.fingers; k++) { const q = k / (w.fingers - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = w.span * (0.62 - 0.12 * q) * (1 - 0.55 * fold); U.dot(E, wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl, m.edge, k === 0 ? 3 : 2); }
    U.dot(E, (x + wx) / 2, (y + wy) / 2 - 1, m.edge, 3);
  }
  function drawStanding() {
    const C = rig.C, f = FAN[P.fan], c = fanC(), wp = P.gf >= 0 ? B.FLAP[P.gf] : P.wing, wr = rig.wing;
    fanTail(c[0], c[1], f[0] + P.ftilt * 15, f[1] + P.ftilt * 15, f[2], 12, P.lit, P.miss ? 7 : -1);
    B.wing(E, wr.x + 2.5, wr.y - 1.5, wp, o.wing, o.m, 1);
    if (P.legs) { const h = U.toW(C.x, C.y, C.a, 0, rig.ry * 0.85); frillLeg(h[0] + 2, h[1], 5, 0, 1, 0); frillLeg(h[0] - 1, h[1] + 0.5, 5, P.lie === 1 ? 1 : 0, 0, 0); }
    else { const h = U.toW(C.x, C.y, C.a, 0, rig.ry * 0.85); frillLeg(h[0] + 1, h[1], 2, -2, 1, 0); frillLeg(h[0] - 2, h[1] + 0.5, 2, -2, 0, 0); }   // 滑翔时腿往后收
    F.body(E, rig, P, o); speckle(); belly();
    coinString();
    B.wing(E, wr.x, wr.y, wp, o.wing, o.m, 0); wingEdge(wr.x, wr.y, wp);
    headNeck(); snoodWattle();
  }
  function drawLying() {                                                                    // 烤火鸡摆盘：扇尾摊在身后地上，肚皮朝天，两条纸花腿直直朝天，头颈瘫在地上
    fanTail(-8, -2, -5, 60, 9, 12, 0, -1);
    frillLeg(3, -8, 6, 0, 1, 1); frillLeg(-4, -8, 6, -1, 0, 1);
    part(); U.oval(E, 0, -5, 8.5, 5, m.body, 0);
    for (let x = -6; x <= 5; x += 3) U.dot(E, x, -2, m.edge, 2);
    for (let x = -4; x <= 3; x++) U.dot(E, x, -9, m.body, 1); for (const x of [-4, -1, 2]) { U.dot(E, x, -10, m.twine, 3); U.dot(E, x + 1, -8, m.twine, 2); }   // 肚皮缝线朝上
    U.seg(E, 3, -9, 6, -13, 1, m.wood, 3); U.dot(E, 6, -13, m.wood, 4);
    B.wing(E, -1, -5, 6, o.wing, o.m, 0);
    part(); U.taper(E, 7, -4, 12, -2, 1.4, 1.1, m.skin, 0); U.oval(E, 13.5, -2.2, 2.3, 2.1, m.skin, 0);
    sp(16, -2, m.beak, 3); sp(16, -1, m.beak, 2); sp(13, -3, m.ink, 0); sp(14, -3, m.ink, 0);
    const lv = P.eyeLv; if (lv < 4) sp(13, -3, m.eye, lv === 0 ? 1 : lv >= 2 ? 3 : 2);
    part(); U.dot(E, 15, -4, m.snood, 3); U.dot(E, 16, -4, m.snood, 3); U.dot(E, 17, -3, m.snood, 3); U.dot(E, 18, -2, m.snood, 2); U.dot(E, 18, -1, m.snood, 2);
  }
  function drawHero() { begin(hero, P.bx, -(P.lie === 2 ? P.lift : 0)); if (P.lie === 2) drawLying(); else drawStanding(); }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效：骨羽弹道、钉地骨羽、会翻面弹跳的铜币 ─────
  const K_QUILL = 1, K_STUCK = 2, K_COIN = 3, NO = 40;
  const OB = Array.from({ length: NO }, () => ({ k: 0, x: 0, y: 0, vx: 0, vy: 0, g: 0, age: 0, life: 0, fl: 0, tx: 0, ty: 0, bn: 0, rest: 0, big: 0, s: 0 }));
  function obj(k, x, y, vx, vy, g, life) { for (const b of OB) if (!b.k) { b.k = k; b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.g = g; b.age = 0; b.life = life; b.fl = 0; b.bn = 0; b.rest = 0; b.big = 0; b.s = Math.random(); return b; } return null; }
  function aim(b, tx, ty, T) { b.tx = tx; b.ty = ty; b.fl = T; b.age = 0; b.vx = (tx - b.x) / T; b.vy = (ty - b.y - 0.5 * b.g * T * T) / T; }
  let chargeAcc = 0, soulAcc = 0, trailAcc = 0, lastLit = 0, mzT = 9, mzX = 0, mzY = 0, landN = 0, lastRattle = -1;
  function fanTopScr() { const t = fanTip(7, 12); return [scrX(t[0] + P.bx), HY + t[1]]; }
  function coinPop(x, y, vx, vy, big) { const b = obj(K_COIN, x, y, vx, vy, 400, 0.7 + Math.random() * 0.3); if (b) b.big = big ? 1 : 0; return b; }
  function onEnter(s) {
    if (s === CAST) {                                                                       // 5 根铜尖骨羽扇形齐射（扇面 30°，抛物线）
      poseAt(CAST, 0, E.simT); const [x, y] = fanTopScr(); clearOrbit(); landN = 0;
      for (let i = 0; i < 5; i++) { const b = obj(K_QUILL, x + (i - 2) * 0.5, y + Math.abs(i - 2) * 0.5, 0, 0, 500, 3); if (b) { b.big = 1; aim(b, DUMMY_X - 12 + i * 6, HY, 0.3 + i * 0.05); } }   // 越远的飞得越高：出手时张成约 30° 的扇面
      mzT = 0; mzX = x; mzY = y - 1; burst(x, y, 20, 40, 110, 0.25, 0.55, R_EL, 14); ring(x, y, 0, R_EL); shake(0.28, 2); flash(0.05);
      sfx('shoot', { proj: 'arrow' });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                      // 一根骨羽从背后越过头顶抛射出去
      const [x, y] = fanTopScr(), b = obj(K_QUILL, x, y, 0, 0, 380, 3); if (b) aim(b, DUMMY_X - 3, HY - 12, 0.4);
      mzT = 0; mzX = x; mzY = y - 1; burst(x, y, 5, 20, 50, 0.12, 0.25, R_EL, 6);
      sfx('swing', { kind: 'throw', w: 0.3 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === DEATH && t === T_FALL) {                                                      // 砸在地上：铜钱串断开，6–8 枚铜币弹出滚开
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 14 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      for (let i = 0; i < 7; i++) { const b = coinPop(HX + 4 + Math.random() * 4, HY - 6, -30 + i * 14 + Math.random() * 8, -60 - Math.random() * 50, 0); if (b) b.life = 1.3 + Math.random() * 0.4; }
      shake(0.12, 1); sfx('fall', { w: 0.45 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [], [], [], [T_FALL], []];
  function stepObj(dt) {
    for (const b of OB) {
      if (!b.k) continue; b.age += dt;
      if (b.k === K_QUILL) {
        b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if ((E.stepN & 1) === 0) spawn(K_TRAIL, b.x - 2, b.y, -12, (Math.random() - 0.5) * 6, 0.2 + Math.random() * 0.1, R_EL);
        if (b.age >= b.fl) {
          b.x = b.tx; b.y = b.ty;
          if (!b.big) {                                                                     // 攻击：打中假人，骨羽掉在假人脚边插进地里
            burst(b.x, b.y, 8, 40, 90, 0.15, 0.35, R_EL, 10); hitDummy(0, 1); sfx('hit', { mat: 'wood', w: 0.3 });
            b.k = K_STUCK; b.x = DUMMY_X - 6; b.y = HY; b.age = 0; b.life = 0.6;
          } else {                                                                          // 技能：插在假人周围，「啪」地炸成一枚旋转铜币
            b.k = 0; burst(b.x, HY - 2, 8, 30, 70, 0.15, 0.35, R_EL, 12); fx.cross(b.x, HY - 3, 3, R_EL, 0.2, 2);
            coinPop(b.x, HY - 2, (Math.random() - 0.5) * 30, -95 - Math.random() * 30, 1);
            if (landN++ === 0) { hitDummy(1, 1); ring(DUMMY_X, HY - 14, 1, R_EL); shake(0.12, 1); sfx('impact', { pal: 'coin', w: 0.45 }); }
          }
        }
      } else if (b.k === K_STUCK) { if (b.age >= b.life) b.k = 0; }
      else if (b.k === K_COIN) {
        if (!b.rest) {
          b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.y >= HY) { b.y = HY; if (b.bn < 1 && Math.abs(b.vy) > 30) { b.vy = -Math.abs(b.vy) * 0.4; b.vx *= 0.7; b.bn++; } else if (Math.abs(b.vx) > 4) { b.vy = 0; b.vx *= Math.pow(0.08, dt); } else { b.rest = 1; b.age = 0; } }   // 落地弹一下再滚开
        } else if (b.age >= b.life) b.k = 0;
      }
    }
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && P.lit !== lastLit && P.lit > 0) { const t = fanTip(P.lit - 1, 12); burst(scrX(t[0] + P.bx), HY + t[1], 3, 10, 30, 0.15, 0.3, R_EL, 4); }   // 眼斑一根根点亮
    if (state === CHARGE) {
      chargeAcc += dt * (10 + 20 * clamp01(stT / DUR[CHARGE]));
      const c = fanC(), tx = scrX(c[0] + P.bx), ty = HY + c[1];
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.PI * (1.1 + Math.random() * 0.8), r = 14 + Math.random() * 6; spawnX(K_SPIRAL_PT, tx, ty, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: -2 - Math.random() * 2, tx, ty }); }
    }
    lastLit = P.lit;
    if (state === MOVE) { trailAcc += dt * 6; while (trailAcc >= 1) { trailAcc -= 1; spawn(K_TRAIL, scrX(-2 + P.bx), HY + rig.C.y + rig.ry + 1, (P.flip ? 1 : -1) * (6 + Math.random() * 6), 3 + Math.random() * 3, 0.35 + Math.random() * 0.2, R_EL); } }   // 身下拖一颗铜色粒子
    if (state === IDLE) {                                                                   // 抖屏：羽轴咔啦啦，羽尖掉两粒铜屑
      const lp = q12(stT) % DUR[IDLE], k = lp >= 1.6 - 1e-6 && lp < 2.0 ? f12of(lp - 1.6) : -1;
      if (k !== lastRattle) { if (k === 0 || k === 2) { const t = fanTip(3 + k * 2, 12); spawn(K_EMBER, scrX(t[0]), HY + t[1], (Math.random() - 0.5) * 10, -6 - Math.random() * 6, 0.4, R_EL); } lastRattle = k; }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 30, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    stepObj(dt); mzT += dt;
  }
  function fxReset() { for (const b of OB) b.k = 0; chargeAcc = 0; soulAcc = 0; trailAcc = 0; lastLit = 0; mzT = 9; landN = 0; lastRattle = -1; }
  function fxBack(f12) {
    if (P.dq < 0.6 && P.lie !== 2) groundShadow(scrX(P.bx), 8, -rig.C.y - rig.ry);
    floorGlow(scrX(P.gx), P.rim, EL, f12);
  }
  function quill(x, y, vx, vy) {                                                            // 骨羽 2×4：白骨羽轴 + 铜尖，方向吸附到 0 / 45° / 90°
    const a = Math.atan2(vy, vx), s = Math.round(a / (Math.PI / 4)), dx = Math.round(Math.cos(s * Math.PI / 4)), dy = Math.round(Math.sin(s * Math.PI / 4));
    put(x, y, EL[1]); put(x - dx, y - dy, EL[2]);
    for (let k = 2; k <= 4; k++) { put(x - dx * k, y - dy * k, k === 4 ? 18 : 17); put(x - dx * k - dy, y - dy * k + dx, k >= 3 ? 7 : 18); }
  }
  function fxMid() { for (const b of OB) if (b.k === K_STUCK) { const x = R(b.x); put(x, HY, EL[2]); put(x - 1, HY - 1, 17); put(x - 2, HY - 2, 17); put(x - 3, HY - 3, 18); put(x - 3, HY - 2, 7); } }   // 插进地里的骨羽
  function fxFront(f12) {
    for (const b of OB) {
      if (!b.k) continue; const x = R(b.x), y = R(b.y);
      if (b.k === K_QUILL) quill(x, y, b.vx, b.vy);
      else if (b.k === K_COIN) {                                                            // 铜币：空中 2 帧翻面（3 格宽 ↔ 1 格宽），落地后走完色阶
        const q = b.rest ? b.age / b.life : 0; if (b.rest && q > 0.7 && (f12 & 1)) continue;
        const flip = !b.rest && ((f12 + R(b.s * 3)) & 1), c = b.rest ? EL[q < 0.5 ? 2 : 3] : EL[2];
        if (b.big) { if (flip) { put(x, y, EL[1]); put(x, y - 1, c); put(x, y + 1 > HY ? y : y + 1, EL[3]); } else { put(x - 1, y, c); put(x + 1, y, c); put(x, y - 1, EL[1]); put(x, y + 1 > HY ? y : y + 1, EL[3]); put(x, y, EL[4]); } }
        else { put(x, y, c); if (!flip) put(x + 1, y, EL[3]); }
      }
    }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX - r, mzY, r < 2 ? c : EL[2]); put(mzX, mzY - r, r < 3 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
  }

  return {
    name: '火鸡', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye, m.spot], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'coin', style: 'nova', w: 0.45, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
