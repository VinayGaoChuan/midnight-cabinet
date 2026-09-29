// 灯眼（小首领，灯塔区域）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js。
// 依据：附录 G2「四只眼的施法者」；被动 盯视（同一个目标打得越久越疼）+ 灯光（开战后普攻每秒 +6%，最多 ×4）；
//       招式 fourBeams 四道光（盯住生命最多的四个 5 秒）、sweepLight 灯塔扫射（三道光扫过前、中、后排）；半血 一道光（oneBeam：四道合成一道）。
// 设定卡 ——
//   剪影：一座长了腿脚的旧灯塔：红白相间的石砌塔身（越往上越细），底座是两只长满藤壶的石墩脚；塔顶是铁栏杆的瞭望廊，
//         廊上是玻璃灯室当脑袋，铜绿圆顶 + 通风球，球上蹲着一只海鸥。塔肩上披着一件破旧的守塔人油布雨披，
//         雨披下伸出两条黄油布袖子和一双泡白的溺水人的大手。廊沿垂着海带。身体约 67 格高（海鸥到 74）。
//   脸（识别点）：灯室玻璃里 2×2 四只黄铜镶边的透镜眼（暖白→金黄的灯光，竖缝瞳孔一起看向前方）；塔身上的拱门是嘴（怒吼时砰地打开、里面是灯光）。
//   主色：压暗的海风白石 + 褪色砖红 + 锈黑铁 + 铜绿；光：灯室的暖白金光（烘焙光 + 轮廓光），盯视时透镜芯变成品红（对上游戏里光束的颜色）。
//   招式（setMove）：
//     fourBeams 四道光：张开双臂、灯室后仰，四只透镜按顺时针一只只点亮（芯变品红）→ 四道光束呈扇形射出 → 慢慢暗回去。
//     sweepLight 灯塔扫射：双手抱住灯室往后上方拧（透镜转到背后、越来越亮、发抖）→ 一口气从远往近扫下来（三道光落在后、中、前排，大弧光、地面灼痕）→ 松手。
//     oneBeam 一道光（过半后替换四道光）：双手捧住灯室往里挤，四只眼挤成一只大眼 → 一道粗光束射出 → 眼睛再分回四只。
//     roar 一道光（半血怒吼）：海鸥吓飞，抱头弯腰、四眼乱闪 → 猛地后仰张臂，四眼合成一只直冲天空的光柱，门嘴大开喷出灯光，汽笛一样的长鸣。
//   待机：两档呼吸、海带摆；个性动作是灯室里的透镜鼓转一圈（眼睛从右边滑出、左边转回来，光扫过去），海鸥在顶上跳一下。移动：沉重的石墩步，海鸥跟着颠。
//   死亡：挨打晃一下 → 四只眼按 2-4-1-3 一只只闪两下熄灭、身子塌下去 → 整座塔往后栽倒，灯室玻璃摔碎，最后一只眼回光一闪 → 海鸥飞走，化成暗下去的光点。
PCD.define('B_FourEyes', (E) => {
  const { defDeep, defMat, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（11 级，暗 → 亮）：石、砖、铁都压暗，灯光才亮得出来 ─────
  const R_WHT = ['#08090d', '#13161c', '#1f232b', '#2c313a', '#3b414b', '#4b525d', '#5c6470', '#6e7783', '#828b97', '#97a0ab', '#adb5bf'];   // 海风吹旧的白石
  const R_RED = ['#0c0406', '#1a080a', '#2a0c0f', '#3b1114', '#4d161a', '#601c1f', '#732225', '#862a2b', '#983432', '#aa403b', '#bb4f46'];   // 褪色的灯塔红
  const R_CU = ['#050c0b', '#0a1614', '#10211e', '#162c28', '#1d3833', '#25453f', '#2e524b', '#386058', '#436e65', '#4f7c72', '#5d8b80'];    // 铜绿圆顶
  const R_GLASS = ['#03070a', '#081218', '#0e1e27', '#152b36', '#1c3845', '#244654', '#2e5464', '#386274', '#447284'];  // 灯室的海青玻璃
  const R_WEED = ['#050702', '#0e1505', '#18240a', '#23330e', '#2e4313', '#3b5419', '#4a6620'];   // 海带
  const WHT = defDeep(R_WHT, { depth: 9, amb: 0.24 }), RED = defDeep(R_RED, { depth: 9, amb: 0.14 });
  const STONE = defDeep(R_WHT, { depth: 4, dark: 2, amb: 0.12 }), STONED = defDeep(R_WHT, { depth: 4, dark: 4, amb: 0.08 });
  const IRON = defDeep('bladesteel', { depth: 3, dark: 3, amb: 0.2 }), CU = defDeep(R_CU, { depth: 5, amb: 0.2 }), GLASS = defDeep(R_GLASS, { depth: 6, amb: 0.25 });
  const OIL = defDeep('stormcoat', { depth: 6, dark: 2, amb: 0.14 }), OILD = defDeep('stormcoat', { depth: 5, dark: 4, amb: 0.1 });   // 守塔人的藏青油布雨披
  const HAND = defDeep(R_WHT, { depth: 4, amb: 0.34 }), HANDD = defDeep(R_WHT, { depth: 4, dark: 3, amb: 0.2 });   // 泡白的溺水人手
  const WEED = defDeep(R_WEED, { depth: 2, amb: 0.2 }), WOOD = defDeep('hide', { depth: 3, dark: 1, amb: 0.14 });
  const BRASS = defDeep('brass', { depth: 2, amb: 0.25 }), BARN = defDeep('ivory', { depth: 1, dark: 1, amb: 0.3 });
  // 灯光（白 → 淡金 → 金 → 琥珀 → 暗）、盯视的品红（游戏里四道光 / 一道光的光束色）
  const LAMP = fxRamp('lampEye', ['#ffffff', '#fff2c0', '#ffd264', '#d4862a', '#5a2e0e']), LR = FXR[LAMP];
  const STARE = fxRamp('lampStare', ['#ffffff', '#ffd2f6', '#ff5aff', '#a42a9c', '#3a0c38']), SR = FXR[STARE];
  const LENS = defMat([LR[3], LR[2], LR[1], LR[0]], 1, 1), PINK = defMat([SR[3], SR[2], SR[1], SR[0]], 1, 1), WIN = defMat([LR[4], LR[3], LR[3], LR[2]], 1, 1);
  const GULL = defMat(E.ramp([R_WHT[0], R_WHT[6], R_WHT[9], '#ffffff'])), BEAK = WIN;
  const hero = new Sprite(168, 124, 84, 114);
  const DUR = [3.0, 4 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { fourBeams: { 3: 0.8, 4: 0.5, 5: 0.6 }, sweepLight: { 3: 1.2, 4: 0.45, 5: 0.6 }, oneBeam: { 3: 0.8, 4: 0.5, 5: 0.6 }, roar: { 3: 0.6, 4: 0.6, 5: 0.7 } };
  const MVI = { fourBeams: 0, sweepLight: 1, oneBeam: 2, roar: 3 };
  let MV = 'fourBeams';
  const HX = 64;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [LR[1], LR[2], LR[3]], k: 0.6 }, { x: 0, y: 0, r: 0, ramp: [LR[1], LR[2], LR[3]], k: 0.8 }];
  const RIM_R = [0, 12, 20, 30], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: LR, flash: 0, dq: 0, lights: null, skip: new Uint8Array(64) };
  RIM.skip[LENS] = RIM.skip[PINK] = RIM.skip[WIN] = 1;

  // ───── 骨架（本地坐标，脚底 y = 0，面朝右）─────
  const NECK = [1, -39], SHN = [11, -32], SHF = [-10, -32];
  const LENSP = [[-2.5, -52.8], [5.5, -52.8], [-2.5, -45.6], [5.5, -45.6]], MC = [1.5, -49.2], ORD = [0, 1, 3, 2];
  // 手相对肩的位置 [近手 x, y, 远手 x, y]
  const G = { idle: [5, 15, -5, 16], aim: [2, -14, -4, 17], point: [18, -3, -7, 15], spread: [15, -13, -15, -12], fling: [18, -7, -14, -16],
    hurt: [3, -12, -7, 13], droop: [5, 19, -5, 19], flail: [10, -12, -8, -10], limp: [-6, 18, -6, 14], roarUp: [14, -13, -14, -12], wide: [18, -1, -12, -6] };
  // 沉重的石墩步：8 帧一圈（12 fps），近脚 [前后, 离地]；远脚错开 4 帧
  const WALK = [[5, 0], [3, 0], [0, 0], [-3, 0], [-5, 2], [-2, 5], [2, 5], [5, 2]], WBY = [1, 0, -1, 0, 1, 0, -1, 0];
  const SWAY = [0, 1, 1, 0, -1, -1];

  const P = {};
  const FIELDS = ['st', 'pitch', 'bx', 'by', 'hd', 'rot', 'l0', 'l1', 'l2', 'l3', 'stare', 'merge', 'look', 'blink', 'hnx', 'hny', 'hfx', 'hfy', 'grab',
    'nlx', 'nly', 'flx', 'fly', 'sw', 'glow', 'rim', 'flash', 'dq', 'mouth', 'gull', 'gy2', 'fall', 'shard', 'cape'];
  function base() {
    P.st = 0; P.pitch = 0; P.bx = 0; P.by = 0; P.hd = 0; P.rot = 0; P.l0 = P.l1 = P.l2 = P.l3 = 1; P.stare = 0; P.merge = 0; P.look = 1; P.blink = 0;
    P.grab = 0; P.nlx = 1; P.nly = 0; P.flx = -1; P.fly = 0; P.sw = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.mouth = 0; P.gull = 1; P.gy2 = 0;
    P.fall = 0; P.shard = 0; P.cape = 0; P.mx = 0; P.flip = 0;
    arms(G.idle);
  }
  const arms = (g) => { P.hnx = g[0]; P.hny = g[1]; P.hfx = g[2]; P.hfy = g[3]; };
  const mixA = (a, b, q) => { P.hnx = a[0] + (b[0] - a[0]) * q; P.hny = a[1] + (b[1] - a[1]) * q; P.hfx = a[2] + (b[2] - a[2]) * q; P.hfy = a[3] + (b[3] - a[3]) * q; };
  const lit = (v) => { P.l0 = P.l1 = P.l2 = P.l3 = v; };
  const walk = (f) => { f = ((f % 8) + 8) % 8; const n = WALK[f], m = WALK[(f + 4) % 8]; P.nlx = n[0] + 1; P.nly = n[1]; P.flx = m[0] - 1; P.fly = m[1]; P.by = WBY[f]; P.pitch = f < 4 ? 0.015 : -0.015;
    P.hnx = 5 - n[0] * 0.7; P.hfx = -5 - m[0] * 0.7; P.hny = 15 + P.by; P.hfy = 16 + P.by; P.sw = f < 4 ? -2 : 1; P.gy2 = WBY[f] < 0 ? 1 : 0; P.cape = f & 1; };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = -b; P.hny += b; P.hfy += b; P.cape = b; P.sw = SWAY[Math.floor(TT * 3) % 6];
      const lp = tt % DUR[IDLE];
      if (lp >= 1.4 && lp < 2.6) { P.rot = Math.round((lp - 1.4) / 1.2 * 16); lit(2); P.glow = 1; P.hd = -0.04; }   // 待机个性：透镜鼓转一圈
      if (lp >= 0.6 && lp < 0.75) P.gy2 = 2;                                                                    // 海鸥跳一下
      if (lp >= 0.95 && lp < 1.1) P.blink = 1;                                                                  // 百叶一合：眨眼
      if (f12 % 23 === 5) P.l1 = 0; if (f12 % 31 === 11) P.l2 = 2; if (f12 % 17 === 3) P.l3 = 2;                 // 灯芯闪
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 22, -1); P.mx = w.mx; P.flip = w.flip; if ((Math.floor(tq * 12) % 8) === 5) P.l2 = 2; }
    else if (st === ATTACK) {
      if (tq < 0.17) { const q = ease.out(tq / 0.17); mixA(G.idle, G.aim, q); P.pitch = -0.05 * q; P.hd = -0.1 * q; lit(2); P.glow = 1; }
      else if (tq < 0.25) { arms(G.aim); P.pitch = -0.06; P.hd = -0.12; lit(3); P.glow = 2; P.rim = 1; P.bx = (f12 & 1) ? 0 : -1; }
      else if (tq < 0.42) { const q = ease.out((tq - 0.25) / 0.17); mixA(G.aim, G.point, q); P.pitch = 0.07; P.bx = 2; P.hd = 0.14; lit(3); P.glow = 3; P.rim = 2; P.mouth = 1; P.gy2 = 1; P.sw = -2; }
      else { const q = ease.inOut(clamp01((tq - 0.42) / 0.3)); mixA(G.point, G.idle, q); P.pitch = 0.07 * (1 - q); P.bx = Math.round(2 * (1 - q)); P.hd = 0.14 * (1 - q); lit(q < 0.5 ? 2 : 1); P.glow = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { arms(G.hurt); P.pitch = -0.1; P.bx = -2; P.hd = -0.25; P.blink = h < 0.17 ? 1 : 0; P.mouth = 1; P.flash = h < 1 / 12 ? 1 : 0; P.sw = 2; P.gy2 = 3; P.cape = 1; lit(2); }
      else if (h < 0.35) { mixA(G.hurt, G.idle, 0.5); P.pitch = -0.05; P.bx = -1; P.hd = -0.12; P.sw = 1; P.gy2 = 1; lit(2); }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); mixA(G.hurt, G.idle, 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  function skillPose(st, tq, f12) {
    const shiver = (on) => { if (on) P.bx += (f12 & 1) ? 1 : 0; };
    if (MV === 'fourBeams') {
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.6)), n = Math.min(4, Math.floor(tq / 0.16) + 1);
        mixA(G.idle, G.spread, q); P.pitch = -0.07 * q; P.hd = -0.14 * q; P.nlx = 1 + Math.round(2 * q); P.flx = -1 - Math.round(2 * q); P.cape = 1; P.sw = -1;
        for (let k = 0; k < 4; k++) P['l' + ORD[k]] = k < n ? 3 : 0;
        P.stare = tq >= 0.56 ? 1 : 0; P.glow = 1 + Math.min(2, n >> 1); P.rim = n >= 4 ? 2 : 1; P.gy2 = 1; shiver(tq > 0.5);
      } else if (st === CAST) { arms(G.fling); P.pitch = 0.07; P.hd = 0.1; P.bx = -1; lit(3); P.stare = 1; P.glow = 3; P.rim = tq < 2 / 12 ? 3 : 2; P.mouth = 1; P.nlx = 3; P.flx = -3; P.gy2 = 3; P.sw = -2; P.cape = 1; }
      else { const q = ease.inOut(clamp01(tq / 0.5)); mixA(G.fling, G.idle, q); P.pitch = 0.07 * (1 - q); P.hd = 0.1 * (1 - q); lit(q < 0.4 ? 3 : q < 0.8 ? 2 : 1); P.stare = q < 0.5 ? 1 : 0; P.glow = q < 0.5 ? 2 : 1; P.nlx = 1 + Math.round(2 * (1 - q)); P.flx = -1 - Math.round(2 * (1 - q)); }
    } else if (MV === 'sweepLight') {
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.5));
        P.grab = q; P.hd = -0.32 * q; P.pitch = -0.08 * q; P.rot = -Math.round(5 * q); P.look = -1; P.by = Math.round(q); P.nlx = 1 + Math.round(3 * q); P.flx = -1 - Math.round(3 * q);
        lit(tq < 0.4 ? 2 : (f12 % 3 === 0 ? 2 : 3)); P.glow = tq < 0.4 ? 1 : 2 + (f12 & 1); P.rim = tq < 0.6 ? 1 : 2; P.cape = 1; P.sw = 2; shiver(tq > 0.8);
      } else if (st === CAST) {
        const k = ease.out(clamp01(tq / (3 / 12)));
        P.grab = 1; P.hd = -0.32 + 0.62 * k; P.rot = Math.round(-5 + 8 * k); P.look = 1; P.pitch = -0.08 + 0.18 * k; P.bx = Math.round(2 * k); P.nlx = 4; P.flx = -4;
        lit(3); P.glow = 3; P.rim = tq < 2 / 12 ? 3 : 2; P.mouth = 1; P.sw = -2; P.gy2 = 2; P.cape = 1;
      } else { const q = ease.inOut(clamp01(tq / 0.5)); P.grab = 1 - q; P.hd = 0.3 * (1 - q); P.rot = Math.round(3 * (1 - q)); P.pitch = 0.1 * (1 - q); P.bx = Math.round(2 * (1 - q)); lit(q < 0.5 ? 2 : 1); P.glow = q < 0.5 ? 2 : 0; P.nlx = 1 + Math.round(3 * (1 - q)); P.flx = -1 - Math.round(3 * (1 - q)); }
    } else if (MV === 'oneBeam') {
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.3)); P.grab = q; P.merge = ease.inOut(clamp01((tq - 0.12) / 0.5)); P.pitch = 0.04 * q; P.hd = -0.06 * q; P.by = Math.round(q);
        lit(3); P.stare = 1; P.glow = P.merge > 0.8 ? 3 : 2; P.rim = P.merge > 0.8 ? 2 : 1; P.cape = 1; shiver(tq > 0.45);
      } else if (st === CAST) { P.merge = 1; arms(G.wide); P.pitch = 0.07; P.hd = 0.13; P.bx = -1; lit(3); P.stare = 1; P.glow = 3; P.rim = tq < 2 / 12 ? 3 : 2; P.mouth = 1; P.gy2 = 3; P.sw = -2; P.nlx = 3; P.flx = -3; }
      else { const q = ease.inOut(clamp01(tq / 0.5)); P.merge = 1 - ease.inOut(clamp01((tq - 0.15) / 0.35)); mixA(G.wide, G.idle, q); P.pitch = 0.07 * (1 - q); P.hd = 0.13 * (1 - q); lit(q < 0.5 ? 3 : 2); P.stare = q < 0.5 ? 1 : 0; P.glow = q < 0.5 ? 2 : 1; }
    } else {   // roar：半血「一道光」
      P.gull = 0;
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.35)); P.grab = q; P.hd = 0.22 * q; P.pitch = 0.08 * q; P.by = Math.round(2 * q); P.mouth = 1; P.cape = 1; P.sw = 2;
        for (let i = 0; i < 4; i++) P['l' + i] = ((f12 + i * 2) % 3 === 0) ? 0 : 2 + (((f12 + i) & 1)); P.glow = 1 + (f12 & 1); P.rim = 1; shiver(tq > 0.25);
      } else if (st === CAST) {
        arms(G.roarUp); P.hny += (f12 & 1); P.pitch = -0.12; P.by = -1; P.hd = -0.38; P.merge = 1; lit(3); P.mouth = 2; P.glow = 3; P.rim = tq < 2 / 12 ? 3 : 2; P.sw = -2; P.cape = 1; P.nlx = 3; P.flx = -3; shiver(1);
      } else { const q = ease.inOut(clamp01(tq / 0.6)); P.pitch = -0.12 * (1 - q); P.hd = -0.38 * (1 - q); mixA(G.roarUp, G.idle, q); P.merge = q < 0.5 ? 1 : 1 - (q - 0.5) * 2; P.mouth = q < 0.4 ? 2 : q < 0.7 ? 1 : 0; lit(q < 0.5 ? 3 : 2); P.glow = q < 0.5 ? 3 : 1; P.rim = q < 0.3 ? 2 : 0; }
    }
  }
  const OUT = [1, 3, 0, 2], OUTT = [0.45, 0.6, 0.75, 0.9];
  function deathPose(d, f12) {
    if (d < 0) return;
    P.gull = d < 0.2 ? 1 : 0; P.gy2 = 4;
    if (d < 0.3) { arms(G.hurt); P.pitch = -0.12; P.bx = -2; P.hd = -0.28; P.blink = d < 0.17 ? 1 : 0; P.mouth = 1; P.flash = d < 1 / 12 ? 1 : 0; P.sw = 2; P.cape = 1; lit(2); return; }
    const q1 = ease.inOut(clamp01((d - 0.3) / 0.6));
    mixA(G.hurt, G.droop, q1); P.pitch = -0.12 + 0.18 * q1; P.hd = -0.28 + 0.5 * q1; P.by = Math.round(2 * q1); P.mouth = 1; P.sw = 2;
    for (let k = 0; k < 4; k++) { const e = d - OUTT[k]; P['l' + OUT[k]] = e < 0 ? 2 : e < 1 / 12 ? 3 : e < 2 / 12 ? 0 : e < 3 / 12 ? 2 : 0; }   // 一只只闪两下熄灭
    if (d >= 1.0) { const q2 = ease.in(clamp01((d - 1.0) / 0.45)); P.fall = -1.6 * q2; P.pitch = 0.06 * (1 - q2); P.hd = 0.22 + 0.1 * q2; mixA(G.droop, G.flail, Math.sin(q2 * Math.PI)); P.nly = Math.round(3 * q2); P.sw = -2; P.cape = 1; }
    if (d >= 1.45) {
      const b = d - 1.45; P.fall = -1.6 + (b < 0.17 ? 0.07 * Math.sin(b / 0.17 * Math.PI) : 0); P.shard = 1; P.pitch = 0; P.hd = 0.32; mixA(G.flail, G.limp, clamp01(b / 0.17)); P.nly = 3; P.sw = 1;
      if (b < 1 / 12) P.l1 = 3;   // 最后一只眼回光一闪
    }
    if (d > 2.0) P.dq = Math.round(clamp01((d - 2.0) / 0.6) * 48) / 48;
  }
  function focus() { geo(); P.fx = L.eye[0]; P.fy = L.eye[1]; P.gx = P.fx; P.gy = P.fy; }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); if (P.fall) B.rot(-10, 0, P.fall); B.move(P.bx, P.by); B.rot(0, -8, P.pitch); }
  function headXf() { bodyXf(); B.rot(NECK[0], NECK[1], P.hd); }
  const fallAt = (x, y) => { if (!P.fall) return [x, y]; const c = Math.cos(P.fall), s = Math.sin(P.fall), dx = x + 10; return [-10 + c * dx - s * y, s * dx + c * y]; };
  function geo() {
    bodyXf();
    for (const k of ['n', 'f']) {
      const rx = k === 'n' ? 5 : -5, r = B.at(rx, -8), ft = fallAt(P.bx + rx + P[k + 'lx'], -P[k + 'ly']);
      L[k] = { r, ft, kn: B.ik(r, [ft[0], ft[1] - 2], 5, 5, -1) };
    }
    L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.door = B.at(6, -13);
    headXf(); L.eye = B.at(MC[0], MC[1]); L.gripN = B.at(12.5, -47); L.gripF = B.at(-10.5, -48); L.top = B.at(1, -70); L.lens = LENSP.map((p) => B.at(p[0], p[1]));
    const g = P.grab, sq = P.merge * 1.5;
    L.hN = [L.shN[0] + P.hnx + (L.gripN[0] - sq - L.shN[0] - P.hnx) * g, L.shN[1] + P.hny + (L.gripN[1] - L.shN[1] - P.hny) * g];
    L.hF = [L.shF[0] + P.hfx + (L.gripF[0] + sq - L.shF[0] - P.hfx) * g, L.shF[1] + P.hfy + (L.gripF[1] - L.shF[1] - P.hfy) * g];
    B.reset();
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t);
  const hw = (y) => (y >= -12 ? 14 + (y + 12) * 0.2 : 14 - (-12 - y) * (4 / 23));   // 塔身半宽（越往上越细）
  const sag = (x, y) => 1.2 * (1 - (x / hw(y)) * (x / hw(y)));                       // 圆柱上的横纹往下弯
  function bandPts(y0, y1) {   // y0 在下、y1 在上
    const pts = []; for (let k = 0; k <= 8; k++) { const x = -hw(y1) + 2 * hw(y1) * k / 8; pts.push([x, y1 + sag(x, y1)]); }
    for (let k = 8; k >= 0; k--) { const x = -hw(y0) + 2 * hw(y0) * k / 8; pts.push([x, y0 + sag(x, y0)]); }
    return pts.reverse();
  }

  function drawLeg(k) {
    const g = L[k], far = k === 'f', m = far ? STONED : STONE;
    part(); capW(g.r[0], g.r[1], g.kn[0], g.kn[1], 4.4, 3.9, m); capW(g.kn[0], g.kn[1], g.ft[0], g.ft[1] - 2, 3.9, 3.5, m);
    part(); B.save(); B.reset();
    B.ell(E, g.ft[0] + 1, g.ft[1] - 2.2, 6.2, 2.8, P.fall, m); B.ell(E, g.ft[0] + 5, g.ft[1] - 1.2, 2, 1.6, P.fall, m);   // 石墩脚 + 脚尖一块石
    if (!far) { px(g.ft[0] - 2, g.ft[1] - 4, BARN, 8); px(g.ft[0] - 1, g.ft[1] - 4, BARN, 4); px(g.ft[0] + 3, g.ft[1] - 3, BARN, 7); px(g.ft[0] - 4, g.ft[1] - 2, WEED, 6); px(g.ft[0] + 1, g.ft[1] - 1, m, 2); }
    B.restore();
  }
  function drawTower() {
    part(); bodyXf();
    B.poly(E, [[-15, -7], [15, -7], [14, -12], [10, -35], [11, -37], [-11, -37], [-10, -35], [-14, -12]], WHT);
    for (const [y0, y1] of [[-12, -18.5], [-24.5, -30.5]]) B.poly(E, bandPts(y0, y1), RED);
    B.poly(E, bandPts(-7, -10), WHT, 3);                                                                   // 底座的深色石
    for (const y of [-14.5, -16.5, -26.5, -28.5]) B.ln(E, -hw(y) + 1, y + 0.8, hw(y) - 1, y + 0.8, RED, 4);  // 砖缝
    for (const y of [-20.5, -22.5, -32.5, -34.5]) B.ln(E, -hw(y) + 1, y + 0.8, hw(y) - 1, y + 0.8, WHT, 4);
    for (const [x, y] of [[-7, -15], [3, -17], [-2, -21], [8, -23], [-8, -27], [2, -29], [-4, -33], [6, -34]]) B.px(E, x, y, x & 2 ? RED : WHT, 3);
    B.ln(E, -9, -27, -7, -23, WHT, 2); B.ln(E, -7, -23, -8, -20, WHT, 2); B.ln(E, -8, -20, -6, -17, RED, 2);    // 裂缝
    for (const x of [-6, 3, 9]) B.ln(E, x, -36, x, -32 + (x & 3), WHT, 3);                                    // 廊下的锈迹
    B.ln(E, -12, -9, -10, -9, WEED, 6); for (let x = -14; x <= 14; x += 2) B.px(E, x, -8 - ((x * 7) & 1), WEED, 5);   // 潮线上的海藻
    for (const [x, y] of [[-12, -10], [-11, -12], [-9, -10], [10, -11], [12, -10], [-4, -9], [13, -13]]) { B.px(E, x, y, BARN, 8); B.px(E, x + 1, y + 1, BARN, 3); }   // 藤壶
    B.ln(E, -12, -33, -10, -24, WHT, 7); B.ln(E, -13, -21, -12, -13, RED, 7);                                  // 左上受光的边
    B.ln(E, 4, -27, 4, -30, WIN, P.glow ? 3 : 2); B.px(E, 4, -31, WHT, 10); B.px(E, 5, -30, WHT, 3);            // 小窗
    B.ln(E, -5, -31, -5, -33, WIN, 1);
    for (let x = -10; x <= 10; x += 4) B.px(E, x, -36, IRON, 5);                                               // 廊下的托架
  }
  function drawDoor() {   // 门是嘴
    part(); bodyXf(); const arch = [[2.5, -7.5], [9.5, -7.5], [9.5, -16], [8.5, -18.6], [6, -19.8], [3.5, -18.6], [2.5, -16]];
    B.poly(E, arch, WHT, 3); B.px(E, 6, -20.5, WHT, 7);
    part(); const inner = [[3.5, -8], [8.5, -8], [8.5, -16], [7.5, -17.8], [6, -18.6], [4.5, -17.8], [3.5, -16]];
    if (P.mouth === 0) {
      B.poly(E, inner, WOOD); B.ln(E, 5, -9, 5, -17, WOOD, 3); B.ln(E, 7, -9, 7, -17, WOOD, 3); B.ln(E, 4, -10, 8, -10, IRON, 5); B.ln(E, 4, -15, 8, -15, IRON, 5);
      B.px(E, 6, -16.8, WIN, P.glow ? 3 : 2); B.px(E, 8, -12, BRASS, 8);
    } else if (P.mouth === 1) {
      B.poly(E, inner, LENS, 1); B.px(E, 6, -12, LENS, 2); B.poly(E, [[3.5, -8], [6, -8], [6, -18.4], [4.5, -17.8], [3.5, -16]], WOOD); B.ln(E, 5, -9, 5, -17, WOOD, 3);
    } else {
      B.poly(E, inner, LENS, 3); B.ell(E, 6, -13, 1.8, 3, 0, LENS, 4); B.ln(E, 4, -9, 8, -9, LENS, 2); B.ln(E, 4, -11, 7, -11, LENS, 2);   // 门里是灯光（台阶的剪影）
      part(); B.poly(E, [[9.5, -8], [12, -9], [12, -18], [9.5, -17]], WOOD); B.ln(E, 11, -10, 11, -16, WOOD, 7);   // 门扇甩开
    }
    part(); B.poly(E, [[1.5, -7], [10.5, -7], [10.5, -8], [1.5, -8]], STONE);   // 门前台阶
  }
  function drawCape() {
    part(); bodyXf(); const c = P.cape;
    B.poly(E, [[-12, -38], [12, -38], [14, -35], [13, -32 + c], [10, -33], [7, -31 + c], [3, -32.5], [-1, -31 + c], [-5, -32.5], [-9, -31 + c], [-12.5, -32.5], [-14, -35]], OIL);
    for (const x of [-9, -3, 3, 9]) B.ln(E, x * 0.8, -37, x, -33, OIL, 3);
    B.ln(E, -11, -36.5, -5, -36.5, OIL, 8); B.ln(E, -13, -34, -11, -36, OIL, 7);
    B.px(E, 7, -35, BRASS, 8); B.px(E, 7, -34, BRASS, 3); B.px(E, 12, -33 + c, OIL, 2);
  }
  function drawWeed() {
    bodyXf(); const s = P.sw;
    for (const [x0, len, r] of [[-13.5, 12, 1.5], [-9, 7, 1.2], [11.5, 9, 1.3], [14.5, 13, 1.5]]) {
      part(); const pts = B.bez([x0, -36], [x0 + s * 0.4, -36 + len * 0.5], [x0 + s, -36 + len], 6);
      B.strand(E, pts, r, 0.5, WEED); B.px(E, pts[2][0], pts[2][1], WEED, 7); B.px(E, pts[4][0] + 0.5, pts[4][1], WEED, 3);
    }
  }
  function drawGallery() {
    part(); bodyXf(); B.ell(E, 0, -37.3, 16, 1.9, 0, IRON); B.ln(E, -14, -38, 12, -38, IRON, 7); B.ln(E, -13, -36, 13, -36, IRON, 2);
    for (let x = -12; x <= 12; x += 4) B.px(E, x, -37, BRASS, 6);
  }
  function drawRailing() {
    part(); bodyXf();
    for (const x of [-15, -10, -5, 0, 5, 10, 15]) B.ln(E, x, -38, x, -41.5, IRON, 5);
    B.ln(E, -15.5, -41.8, 15.5, -41.8, IRON, 7); B.ln(E, -15, -39.8, 15, -39.8, IRON, 4);
    B.px(E, -15, -42, BRASS, 8); B.px(E, 15, -42, BRASS, 8);
  }
  function drawLantern() {
    headXf();
    part(); B.poly(E, [[-9.5, -38], [11.5, -38], [11, -41.5], [-9, -41.5]], IRON); B.ln(E, -8, -39.5, 10, -39.5, IRON, 7);
    part(); B.poly(E, [[-9, -41], [11, -41], [11, -57], [-9, -57]], GLASS);
    for (const x of [-4.5, 1, 6.5]) B.ln(E, x, -41, x, -57, IRON, 4);
    B.ln(E, -9, -48.8, 11, -48.8, IRON, 4); B.ln(E, -9, -41, -9, -57, IRON, 6); B.ln(E, 11, -41, 11, -57, IRON, 3);
    B.ln(E, -7.5, -55.5, -5.5, -51.5, GLASS, 9); B.ln(E, -6.5, -56, -5, -53, GLASS, 8);                      // 玻璃反光
    if (P.shard) { for (const [x, y] of [[-8, -46], [-7, -46], [-7, -45], [-6, -44], [-8, -44], [9, -54], [10, -55], [10, -53], [9, -52], [3, -56], [4, -56], [3, -55]]) B.px(E, x, y, 0); }
  }
  function disc(x, y, r, m, t, clip) {
    if (!clip) { B.ell(E, x, y, r, r, 0, m, t); return; }
    for (let j = Math.floor(y - r - 1); j <= Math.ceil(y + r + 1); j++) for (let i = Math.floor(x - r - 1); i <= Math.ceil(x + r + 1); i++)
      if ((i - x) * (i - x) + (j - y) * (j - y) <= r * r + 0.3 && i >= -8 && i <= 10) B.px(E, i, j, m, t);
  }
  function lens(i, x, y, r, clip) {
    const l = P['l' + i], M = P.stare ? PINK : LENS, vis = !clip || (x > -7 && x < 9);
    part(); disc(x, y, r + 1.1, BRASS, 3, clip); if (vis) { B.px(E, x - r * 0.7, y - r * 0.8, BRASS, 9); B.px(E, x + r * 0.8, y + r * 0.7, BRASS, 2); }   // 黄铜镶边
    if (!l || P.blink) {
      disc(x, y, r, GLASS, 5, clip);
      if (P.blink) { B.ln(E, x - r + 0.5, y - 1, x + r - 0.5, y - 1, IRON, 7); B.ln(E, x - r + 0.5, y, x + r - 0.5, y, IRON, 3); B.ln(E, x - r + 0.5, y + 1, x + r - 0.5, y + 1, IRON, 6); }   // 百叶合上
      else if (vis) { B.ln(E, x + 0.6 * P.look, y - 1, x + 0.6 * P.look, y + 1, IRON, 10); B.px(E, x - 1, y - 1, GLASS, 9); }
      return;
    }
    disc(x, y, r, M, l >= 3 ? 2 : 1, clip); disc(x - 0.3, y - 0.3, r * 0.72, M, l >= 3 ? 3 : 2, clip); if (l >= 2) disc(x - 0.5, y - 0.5, r * 0.4, M, l >= 3 ? 4 : 3, clip);
    if (l < 3 && vis) { const xs = x + 0.9 * P.look; B.ln(E, xs, y - 1.6, xs, y + 1.6, IRON, 10); B.ln(E, xs + P.look, y - 0.8, xs + P.look, y + 0.8, IRON, 10); B.px(E, x - 1.3, y - 1.4, M, 4); }   // 竖缝瞳孔 + 高光
  }
  function drawLenses() {
    headXf(); const m = P.merge, M = P.stare ? PINK : LENS;
    if (m >= 0.85) {   // 四只合成一只大眼
      const r = 3 + 2.6 * m, x = MC[0] + 0.5, y = MC[1], l = Math.max(P.l0, P.l1, P.l2, P.l3);
      part(); B.ell(E, x, y, r + 1.2, r + 1.2, 0, BRASS); B.ell(E, x, y, r, r, 0, M, 2); B.ell(E, x, y, r * 0.78, r * 0.78, 0, M, 1);
      B.ell(E, x, y, r * 0.66, r * 0.66, 0, M, 3); B.ell(E, x, y, r * 0.36, r * 0.36, 0, M, 4);
      if (l < 3) B.ln(E, x + 1, y - 2.5, x + 1, y + 2.5, IRON, 10);
      for (let a = 0; a < 8; a++) B.px(E, x + Math.cos(a * 0.785) * (r + 0.6), y + Math.sin(a * 0.785) * (r + 0.6), BRASS, a & 1 ? 3 : 8);   // 铆钉
      return;
    }
    if (P.rot) {   // 透镜鼓转动：两列眼睛往右滑、从左边转回来，贴着玻璃边缘截断
      for (let i = 0; i < 4; i++) for (const w of [-16, 0, 16]) {
        const x = LENSP[i][0] + P.rot + w; if (x < -12 || x > 14) continue; const f = (x - 1) / 10;
        lens(i, x, LENSP[i][1], Math.max(1.2, 2.7 * (1 - 0.45 * f * f)), true);
      }
      return;
    }
    for (let i = 0; i < 4; i++) lens(i, LENSP[i][0] + (MC[0] - LENSP[i][0]) * m, LENSP[i][1] + (MC[1] - LENSP[i][1]) * m, 2.7 - m * 0.4, false);
  }
  function drawDome() {
    headXf();
    part(); B.poly(E, [[-11, -56.5], [13, -56.5], [12.5, -58.8], [-10.5, -58.8]], IRON); B.ln(E, -10, -57.5, 12, -57.5, IRON, 7);
    part(); const pts = []; for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12; pts.push([1 + 10.5 * Math.cos(a), -58.6 - 6.8 * Math.sin(a)]); } B.poly(E, pts, CU);
    for (const a of [0.55, 1.15, 1.95, 2.55]) B.ln(E, 1 + 9.6 * Math.cos(a), -59.2, 1 + 3.2 * Math.cos(a), -64.6, CU, 3);   // 铜皮的接缝
    B.ln(E, -6, -62, -2, -64.5, CU, 8); for (let x = -8; x <= 10; x += 3) B.px(E, x, -59.4, CU, 8);
    part(); B.ell(E, 1, -65.8, 1.3, 1, 0, CU); B.ell(E, 1, -67.6, 2.3, 2.1, 0, CU); B.px(E, 0, -68.4, CU, 8); B.ln(E, -1, -67.6, 3, -67.6, CU, 3);   // 通风球
    if (!P.gull) { part(); B.ln(E, 1, -70, 1, -73, IRON, 6); B.px(E, 1, -73.5, BRASS, 8); }
  }
  function drawGull() {
    if (!P.gull) return;
    part(); headXf(); const y = -71.3 - P.gy2, up = P.gy2 >= 2;
    B.ell(E, 0.5, y, 2.8, 1.5, 0, GULL); B.ell(E, 3.2, y - 1.6, 1.4, 1.2, 0, GULL); B.px(E, -2.8, y - 0.3, GULL, 2);
    if (up) { B.ln(E, -1, y - 1, -3, y - 4, GULL, 2); B.ln(E, 1, y - 1, 3, y - 4, GULL, 2); B.px(E, -3, y - 4, GULL, 1); }   // 惊得张开翅膀
    else { B.ln(E, -2, y - 0.5, 2, y - 0.5, GULL, 2); B.px(E, -2.5, y - 0.5, GULL, 1); }
    B.px(E, 4.8, y - 1.5, BEAK); B.px(E, 3.6, y - 2, IRON, 10); if (P.gy2 === 0) { B.px(E, 0, y + 1.8, BEAK); B.px(E, 1.5, y + 1.8, BEAK); }
  }
  function drawArm(far) {
    const sh = far ? L.shF : L.shN, hd = far ? L.hF : L.hN, m = far ? OILD : OIL, hm = far ? HANDD : HAND;
    const el = B.ik(sh, hd, 10, 10, far ? 1 : -1);
    part(); capW(sh[0], sh[1], el[0], el[1], 2.9, 2.4, m); capW(el[0], el[1], hd[0], hd[1], 2.4, 2.0, m);
    if (!far) { px((sh[0] + el[0]) / 2 - 1, (sh[1] + el[1]) / 2 - 1, m, 8); px(el[0], el[1], m, 3); }
    const dx = hd[0] - el[0], dy = hd[1] - el[1], dl = Math.hypot(dx, dy) || 1, d = [dx / dl, dy / dl], p = [-d[1], d[0]];
    part(); const cf = [hd[0] - d[0] * 2.5, hd[1] - d[1] * 2.5]; capW(cf[0] - d[0], cf[1] - d[1], cf[0] + d[0], cf[1] + d[1], 2.6, 2.6, m, 3);   // 袖口
    part(); dot(hd[0], hd[1], 2.6, hm); const fl = P.grab > 0.5 ? 3.2 : 4.8;
    for (const o of [-1.5, 0, 1.5]) capW(hd[0] + d[0] * 1.5 + p[0] * o, hd[1] + d[1] * 1.5 + p[1] * o, hd[0] + d[0] * fl + p[0] * o * 1.2, hd[1] + d[1] * fl + p[1] * o * 1.2, 1.1, 0.8, hm);
    capW(hd[0] - p[0] * 1.8, hd[1] - p[1] * 1.8, hd[0] - p[0] * 3.2 + d[0] * 1.8, hd[1] - p[1] * 3.2 + d[1] * 1.8, 1, 0.7, hm);
    if (!far) { px(hd[0] - 1, hd[1] - 1, hm, 7); px(hd[0] + p[0], hd[1] + p[1], BARN, 7); }
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawArm(1); drawLeg('f'); drawLeg('n'); drawTower(); drawDoor(); drawCape(); drawWeed(); drawGallery();
    drawLantern(); drawLenses(); drawDome(); drawRailing(); drawGull(); drawArm(0);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    RIM.rimRamp = P.stare ? SR : LR; LIGHT[0].ramp = P.stare ? [SR[1], SR[2], SR[3]] : [LR[1], LR[2], LR[3]];
    const any = P.glow || P.mouth === 2;
    if (any) { LIGHT[0].x = L.eye[0] * z + spr.ox; LIGHT[0].y = L.eye[1] * z + spr.oy; LIGHT[0].r = P.glow ? (7 + P.glow * 4) * z : 0;
      LIGHT[1].x = L.door[0] * z + spr.ox; LIGHT[1].y = L.door[1] * z + spr.oy; LIGHT[1].r = P.mouth === 2 ? 16 * z : 0; RIM.lights = LIGHT; } else RIM.lights = null;
    bake(spr, RIM);
  }
  // 立绘：四道光蓄满那一刻（张臂、四眼全亮、海鸥还蹲在顶上），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;
  const headCrop = () => { headXf(); const c = B.at(1.5, -53); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; };
  function portrait() { const mv = MV; MV = 'fourBeams'; poseAt(CHARGE, 0.66, 0); P.stare = 0; P.gull = 1; P.gy2 = 0; P.bx = 0; P.glow = 2; P.rim = 2; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headCrop(); return PSPR; }
  function headShot() { const mv = MV; MV = 'fourBeams'; poseAt(IDLE, 0.4, 0); lit(2); P.glow = 2; P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headCrop(); return PSPR; }

  // ───── 特效 ─────
  const T_STRIKE = 3 / 12;
  const sx = (v) => scrX(v), sy = (v) => HY + v, dir = () => (P.flip ? -1 : 1);
  let scorchT = 9, scorch = [], lastStep = -1;
  function strikeFx() {
    const x = sx(L.eye[0] + 3), y = sy(L.eye[1]), tx = x + dir() * 72, ty = HY - 12;
    fx.beam(x, y, tx, ty, 2, LAMP, 0.22, 2); fx.beam(x, y, tx, ty, 1, LAMP, 0.3, 2); fx.cross(x, y, 8, LAMP, 0.2, 2); fx.cross(tx, ty, 6, LAMP, 0.2, 2);
    burst(tx, ty, 16, 40, 120, 0.2, 0.45, LAMP, 20); burst(x, y, 8, 20, 60, 0.15, 0.3, LAMP, 6); hitDummy(1, 1); shake(0.15, 2);
  }
  function fourFx() {
    for (let i = 0; i < 4; i++) { const p = L.lens[i], x = sx(p[0]), y = sy(p[1]), tx = x + dir() * (44 + i * 20), ty = HY - 4 - (i & 1) * 7;
      fx.beam(x, y, tx, ty, 1, STARE, 0.4, 2); fx.cross(x, y, 5, LAMP, 0.2, 2); burst(tx, ty, 8, 30, 90, 0.2, 0.45, STARE, 14); fx.crack(tx, HY, 6, dir(), STARE, 0.6); }
    ring(sx(L.eye[0]), sy(L.eye[1]), 0, STARE); burst(sx(L.eye[0]), sy(L.eye[1]), 20, 40, 130, 0.25, 0.5, STARE, 16); shake(0.3, 3); flash(0.08); hitDummy(1, 1);
  }
  function sweepFx(k) {   // k = 0 后排、1 中排、2 前排：光从远往近扫下来
    const x = sx(L.eye[0] + 3), y = sy(L.eye[1]), tx = x + dir() * [118, 84, 52][k], ty = HY - 1;
    fx.beam(x, y, tx, ty, 2, LAMP, 0.32, 2); fx.beam(x, y, tx, ty, 1, LAMP, 0.4, 2); fx.crack(tx, HY, 12, dir(), LAMP, 1.0); fx.crack(tx, HY, 9, -dir(), LAMP, 0.8);
    burst(tx, ty, 18, 40, 130, 0.25, 0.55, LAMP, 26); burst(tx, ty, 10, 20, 70, 0.3, 0.6, FXI.dust, 10); scorch.push(tx); scorchT = 0;
    if (k === 0) { fx.slash(x, y, 64, dir() * 0.9, dir() * 2.35, LAMP, 0.35, 3, 2); fx.slash(x, y, 48, dir() * 1.0, dir() * 2.3, LAMP, 0.3, 2, 2); flash(0.1); }
    shake(0.3 - k * 0.05, 3); hitDummy(k === 2 ? 1 : 0, 1);
  }
  function oneFx() {
    const x = sx(L.eye[0] + 4), y = sy(L.eye[1]), tx = x + dir() * 110, ty = HY - 14;
    fx.beam(x, y, tx, ty, 3, STARE, 0.5, 2); fx.beam(x, y, tx, ty, 1, LAMP, 0.55, 2); fx.cross(x, y, 12, LAMP, 0.3, 2);
    ring(x, y, 1, STARE); burst(x, y, 26, 50, 160, 0.25, 0.55, STARE, 20); burst(tx, ty, 18, 40, 130, 0.2, 0.5, STARE, 20); shake(0.35, 3); flash(0.1); hitDummy(1, 1);
  }
  function roarFx() {
    const x = sx(L.eye[0]), y = sy(L.eye[1]), d = sx(L.door[0]), dy = sy(L.door[1]);
    fx.beam(x, y, x - dir() * 10, y - 110, 3, LAMP, 0.7, 0); fx.beam(x, y, x - dir() * 10, y - 110, 1, LAMP, 0.8, 2); fx.cross(x, y, 14, LAMP, 0.4, 2);
    ring(x, y, 1, LAMP); ring(d, dy, 1, LAMP); burst(d, dy, 24, 40, 140, 0.3, 0.6, LAMP, 10); burst(x, y, 30, 50, 170, 0.3, 0.7, LAMP, 30);
    for (let i = 0; i < 3; i++) fx.beam(x, y, x + dir() * (40 + i * 25), y - 30 + i * 22, 1, LAMP, 0.35, 0);
    flash(0.12); shake(0.4, 3);
  }
  function gullAway() { const x = sx(L.top[0]), y = sy(L.top[1]); for (let i = 0; i < 10; i++) spawn(K_RISE, x + (Math.random() - 0.5) * 6, y - Math.random() * 4, (Math.random() - 0.3) * 30, -30 - Math.random() * 30, 0.5 + Math.random() * 0.4, FXI.dust); }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'fourBeams') { fourFx(); sfx('boss', { k: 'leBeam', w: 1 }); sfx('impact', { pal: 'holy', w: 0.8 }); }
      else if (MV === 'sweepLight') { sweepFx(0); sfx('boss', { k: 'leBeam', w: 1 }); sfx('swing', { kind: 'smash', w: 0.9 }); sfx('impact', { pal: 'holy', w: 0.8 }); }
      else if (MV === 'oneBeam') { oneFx(); sfx('boss', { k: 'leBeam', w: 1 }); sfx('boss', { k: 'bolt', w: 0.6 }); sfx('impact', { pal: 'holy', w: 1 }); }
      else { roarFx(); sfx('boss', { k: 'leHorn', w: 1 }); sfx('impact', { pal: 'holy', w: 0.9 }); }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
    if (s === CHARGE) {
      if (MV === 'roar') { gullAway(); sfx('boss', { k: 'leGull', w: 1 }); sfx('boss', { k: 'growl', w: 0.6 }); }
      else if (MV === 'sweepLight') { sfx('boss', { k: 'leGrind', w: 0.9 }); }
      else sfx('boss', { k: 'leHum', w: 0.8 });
    }
    if (s === DEATH) lastStep = -1;
  }
  function onTime(s, t) {
    if (s === IDLE && t === 1.4) sfx('boss', { k: 'leGrind', w: 0.3 });
    if (s === IDLE && t === 0.6) sfx('boss', { k: 'leGull', w: 0.3 });
    if (s === IDLE && (t === 1.9 || t === 2.3)) { const x = sx(L.eye[0]), y = sy(L.eye[1]); fx.beam(x, y, x + dir() * (t === 1.9 ? 46 : -30), y - 10, 1, LAMP, 0.15, 0); }   // 转过来的光扫过去
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'leHum', w: 0.4 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('boss', { k: 'leBeam', w: 0.6 }); sfx('impact', { pal: 'holy', w: 0.6 }); }
    if (s === CHARGE && MV === 'fourBeams') { sfx('boss', { k: 'leClick', w: 0.8 }); const n = Math.min(3, Math.round(t / 0.16)), p = L.lens[ORD[n]]; if (p) fx.cross(sx(p[0]), sy(p[1]), 4, STARE, 0.15, 2); }
    if (s === CHARGE && MV === 'sweepLight' && t === 0.48) sfx('boss', { k: 'leHum', w: 1 });
    if (s === CHARGE && MV === 'oneBeam' && (t === 0.16 || t === 0.48)) sfx('boss', { k: 'leCreak', w: 0.8 });
    if (s === CAST && MV === 'sweepLight') { sweepFx(t === 1 / 12 ? 1 : 2); sfx('boss', { k: 'leBeam', w: 0.7 }); sfx('impact', { pal: 'holy', w: 0.6 }); }
    if (s === HURT && t === INCOMING) sfx('boss', { k: 'leClick', w: 0.5 });
    if (s === DEATH) {
      const d = +(t - INCOMING).toFixed(3);
      if (d === 0.45 || d === 0.6 || d === 0.75 || d === 0.9) { const k = OUTT.indexOf(d), p = L.lens[OUT[k]]; if (p) burst(sx(p[0]), sy(p[1]), 6, 10, 40, 0.2, 0.4, LAMP, 4); sfx('boss', { k: 'leClick', w: 0.4 }); if (d === 0.45) sfx('boss', { k: 'leDie', w: 1 }); }
      if (d === 1.0) sfx('boss', { k: 'leCreak', w: 1 });
      if (d === 1.45) { const x = sx(-45); for (let i = 0; i < 28; i++) spawn(K_DUST, sx(-80 + Math.random() * 70), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust);
        for (let i = 0; i < 14; i++) spawnX(K_PHYS, sx(-60) + (Math.random() - 0.5) * 12, HY - 8, (Math.random() - 0.5) * 90, -40 - Math.random() * 50, 0.8, FXI.frost, { g: 260, floor: HY });   // 灯室的碎玻璃
        for (let i = 0; i < 10; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 50, HY - 2, (Math.random() - 0.5) * 60, -30 - Math.random() * 30, 0.6, FXI.water, { g: 240, floor: HY });   // 溅起的海水
        gullAway(); shake(0.35, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); sfx('boss', { k: 'leGlass', w: 1 }); }
      if (d === 2.0) { for (let i = 0; i < 26; i++) spawn(K_RISE, sx(-78 + Math.random() * 74), HY - 4 - Math.random() * 26, 0, -12 - Math.random() * 18, 0.8 + Math.random() * 0.8, LAMP); sfx('boss', { k: 'fade', w: 0.8 }); }
    }
  }
  const EVENTS = [[0.6, 1.4, 1.9, 2.3], [], [0.08, T_STRIKE], [0.16, 0.32, 0.48], [1 / 12, 2 / 12], [], [INCOMING],
    [INCOMING + 0.45, INCOMING + 0.6, INCOMING + 0.75, INCOMING + 0.9, INCOMING + 1.0, INCOMING + 1.45, INCOMING + 2.0], []];
  function stepFX(dt, state, stT) {
    scorchT += dt;
    if (state === MOVE) {
      const f = Math.floor(stT * 12) % 8; if (f !== lastStep) { lastStep = f; const k = f === 0 ? 'n' : f === 4 ? 'f' : null;
        if (k) { const x = sx(L[k].ft[0]); for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 24, -4 - Math.random() * 8, 0.4 + Math.random() * 0.3, FXI.dust);
          for (let i = 0; i < 3; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, HY - 1, (Math.random() - 0.5) * 40, -24 - Math.random() * 20, 0.5, FXI.water, { g: 220, floor: HY });
          sfx('step', { w: 1 }); if (k === 'n') sfx('boss', { k: 'thud', w: 0.3 }); } }
    } else lastStep = -1;
    if (state === CHARGE && Math.random() < 0.5) {   // 蓄力：光点汇向灯室（四道光汇向各只透镜）
      const src = MV === 'fourBeams' ? L.lens[(Math.random() * 4) | 0] : L.eye, gx = sx(src[0]), gy = sy(src[1]), a = Math.random() * 6.2832, r = 14 + Math.random() * 16;
      const RP = (MV === 'fourBeams' || MV === 'oneBeam') && stT > 0.4 ? STARE : LAMP;
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, RP, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
      if (MV === 'roar' && Math.random() < 0.3) spawnX(K_PHYS, sx(-14 + Math.random() * 28), HY - 34, (Math.random() - 0.5) * 20, -10, 0.6, FXI.water, { g: 200, floor: HY });
    }
    if ((state === IDLE || state === MOVE) && Math.random() < 0.05) {   // 海带尖上滴水
      const x = sx([-13.5, 11.5, 14.5][(Math.random() * 3) | 0] + P.sw), y = sy(-25 + P.by);
      spawnX(K_PHYS, x, y, 0, 0, 0.8, FXI.water, { g: 180, floor: HY });
    }
    if (state === IDLE && Math.random() < 0.06) spawn(K_EMBER, sx(L.eye[0] + (Math.random() - 0.5) * 18), sy(L.eye[1] + (Math.random() - 0.5) * 14), (Math.random() - 0.5) * 6, -6, 0.4, LAMP);
    if (scorchT < 1.2 && Math.random() < 0.5) { const x = scorch[(Math.random() * scorch.length) | 0]; if (x != null) spawn(K_EMBER, x + (Math.random() - 0.5) * 16, HY - 1, 0, -10 - Math.random() * 10, 0.3, LAMP); }
    if (scorchT > 1.2 && scorch.length) scorch = [];
  }
  function fxReset() { scorchT = 9; scorch = []; lastStep = -1; }
  function fxBack(f12) {
    if (P.glow >= 2 && !P.fall) { const x = sx(P.fx) + dir() * 14; for (let dx = -12; dx <= 12; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, (P.stare ? SR : LR)[Math.abs(dx) < 5 ? 1 : 3]); }   // 地面上的灯光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'fourBeams'; return MVDUR[MV]; }

  const VOICES = {
    leHum: (s, t, w, p) => { s.tone(t, 'sine', 180, 0.8, 0.04 + 0.03 * w, { to: 520, vib: [9, 25, 0.2], pan: p }); s.tone(t, 'triangle', 90, 0.8, 0.03 * w, { to: 260, pan: p }); s.nz(t, 0.8, 'bandpass', 900, 3, 0.02 * w, { to: 3200, pan: p }); },
    leClick: (s, t, w, p) => { s.ring(t, 1320, 0.35, 0.04 * w, { pan: p }); s.nz(t, 0.04, 'highpass', 3000, 0.7, 0.05 * w, { pan: p }); s.thud(t, 180, 90, 0.06, 0.05 * w, { pan: p }); },
    leBeam: (s, t, w, p) => { s.tone(t, 'sawtooth', 880, 0.5, 0.035 + 0.02 * w, { to: 660, lp: 3200, vib: [30, 20, 0.02], pan: p, rev: 0.3 }); s.tone(t, 'sine', 1760, 0.45, 0.03 * w, { to: 1320, pan: p, rev: 0.4 });
      s.nz(t, 0.35, 'highpass', 2600, 0.7, 0.05 * w, { to: 1400, pan: p }); s.thud(t, 140, 60, 0.18, 0.1 * w, { pan: p }); },
    leGrind: (s, t, w, p) => { for (let i = 0; i < 5; i++) { s.nz(t + i * 0.09, 0.07, 'bandpass', 500 + (i & 1) * 260, 4, 0.05 * w, { pan: p }); s.ring(t + i * 0.09, 210 + i * 7, 0.12, 0.012 * w, { pan: p }); } },
    leHorn: (s, t, w, p) => { s.tone(t, 'sawtooth', 65, 1.4, 0.08 + 0.04 * w, { lp: 480, vib: [3, 12, 0.4], pan: p, rev: 0.6 }); s.tone(t + 0.02, 'square', 97.5, 1.3, 0.035 * w, { lp: 420, pan: p, rev: 0.6 });
      s.brass(t, 36, 1.2, 0.06 * w, { pan: p }); s.rumble(t, 1.3, 0.1 + 0.06 * w, { f: 120, pan: p }); },
    leGull: (s, t, w, p) => { for (let i = 0; i < 3; i++) s.tone(t + i * 0.13, 'sawtooth', 1500 - i * 80, 0.11, 0.02 + 0.012 * w, { to: 980, lp: 3600, pan: p }); },
    leGlass: (s, t, w, p) => { for (let i = 0; i < 7; i++) s.ring(t + i * 0.03 + s.rnd(0, 0.02), s.rnd(2400, 5200), 0.3, 0.02 * w, { pan: p }); s.nz(t, 0.4, 'highpass', 4200, 0.7, 0.07 * w, { pan: p }); },
    leCreak: (s, t, w, p) => { s.tone(t, 'sawtooth', 110, 0.5, 0.03 * w, { to: 70, lp: 700, vib: [18, 40, 0.05], pan: p }); s.nz(t, 0.45, 'bandpass', 350, 5, 0.05 * w, { to: 220, pan: p }); },
    leDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 70, 1.8, 0.07 + 0.03 * w, { to: 38, lp: 420, vib: [3, 18, 0.5], pan: p, rev: 0.7 }); s.brass(t, 34, 1.4, 0.05 * w, { pan: p }); },
  };

  return {
    name: '灯眼', HX, R_EL: LAMP, DUR, hero, P, GLOW_MATS: [LENS, PINK, WIN], HIT_POINT: [0, -34], EVENTS, MAX_H: 84, OWN_MAX: 60, SHEET_K: 3, VOICES,
    SFX: { body: 'stone', how: 'topple', pal: 'holy', style: 'bolt', w: 1 },
    MOVES: ['fourBeams', 'sweepLight', 'oneBeam', 'roar'], MOVE_NAMES: { fourBeams: '四道光', sweepLight: '灯塔扫射', oneBeam: '一道光', roar: '一道光（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 0.62, 1.0, 1.6, 1.9, 2.2, 2.45]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0, 0.17, 0.34, 0.5, 0.67], 'fourBeams'], [CAST, [0, 2 / 12], 'fourBeams'], [RECOVER, [0.17, 0.42], 'fourBeams'],
      [CHARGE, [0.1, 0.42, 0.75, 1.0], 'sweepLight'], [CAST, [0, 1 / 12, 2 / 12, 4 / 12], 'sweepLight'], [RECOVER, [0.17, 0.42], 'sweepLight'],
      [CHARGE, [0.08, 0.3, 0.5, 0.67], 'oneBeam'], [CAST, [0, 2 / 12], 'oneBeam'], [RECOVER, [0.25, 0.5], 'oneBeam'],
      [CHARGE, [0.08, 0.42], 'roar'], [CAST, [0, 3 / 12], 'roar'], [RECOVER, [0.3, 0.6], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.75, 0.95, 1.2, 1.4, 1.5, 1.75, 1.85, 2.4, 2.7]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
