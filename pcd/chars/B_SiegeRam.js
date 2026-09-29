// 破门锤（小首领，第五章「蒸汽铸造厂」熔炉区）：照 B_centaur.js 的小首领标准做。
// 依据：附录 G2「包铁的攻城锤车」；远程 · 怕近战、刺客；被动 厚木包铁（远程伤害 −60%）；撞门（冲进远程站的那一排，撞开一路）、连撞；半血 着火（身边一圈灼烧）。
// 设定卡 ——
//   剪影：一台会走的攻城锤车，长而不高（身体约 66 格高、110 格长）。烟熏黑的橡木车厢外面箍着铁条、满是铆钉，前面一块包铁的撞角板；
//         后面是一只大铁轮（8 根辐条、铁箍、铜轴帽），前面是两条铁的活塞腿、分瓣的铁蹄（它是「走」过来的，不是被推过来的）。
//         车厢后部蹲着一只小锅炉：两道黄铜箍、一扇圆炉门（铁栅缝里透出炉火）、一只压力表、一根烟囱一直冒黑烟，顶上一只铜汽笛。
//         车厢上面两根木柱撑着一片铁鳞顶棚，棚上、车厢上插着几支被挡下的箭（厚木包铁）。
//         顶棚下面用两根铁链吊着一根包铁的撞木，撞木前端是一只铸铁的公羊头（识别点）：两只青铜大角向后盘成圈、角上一圈圈棱，
//         前额是一块斜着的撞面，一双烧红的眼（识别点：黑铁羊头 + 两点红光），鼻孔里也透着火。
//   主色：烟熏橡木、发蓝的黑铸铁、青铜角、黄铜箍；光源是炉门、羊眼、蓄力时烧红→发白的羊额。
//   待机：车厢随锅炉「突突」起伏，撞木在链子上轻轻晃；个性：前蹄刨两下地，低头从鼻孔喷一口白汽。
//   移动：两条铁腿交替迈步、大铁轮滚动、撞木跟着晃，烟囱一拍一口烟。
//   普攻：撞木向后荡 → 向前猛撞，羊额撞出一蓬火星。
//   撞门（ramGate）：车身后坐，撞木拉到最后、链子绷直，前蹄刨地，炉门越烧越亮、羊额 暗红→橙→白，烟囱喷黑烟、整车发抖
//         → 冲出去：撞木顶到最前、羊头低下、铁腿狂奔、轮子飞转，出手一圈火环和铁花 → 收招撞木来回荡、锅炉放汽。
//   连撞（batter）：前腿撑地、撞木拉回一半 → 连撞三下，每下一蓬铁花 → 撞木荡回。
//   着火（roar，半血怒吼）：锅炉憋压、整车下蹲发抖 → 前身人立、羊嘴张开喷火、炉门崩开、汽笛长鸣、身边一圈火 → 重重落地，火浪往两边推。
//   死亡：挨最后一下 → 两条铁腿一软、车头砸地 → 前面那根链子断了，羊头一头扎进地里 → 锅炉放出最后一口汽、炉火和眼睛一盏盏熄灭 → 散掉。
PCD.define('B_SiegeRam', (E) => {
  const { defDeep, defMat, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING, DRAMP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, PI = Math.PI;

  // ───── 材质（11 级，暗 → 亮）：木和铁都压暗，炉火和羊眼才亮得出来 ─────
  const R_OAK = ['#080504', '#140c07', '#1f130b', '#2b1a0f', '#382213', '#462b18', '#55341d', '#653e23', '#77492a', '#8a5532', '#9f633b'];      // 烟熏橡木
  const R_IRON = ['#040508', '#0a0c11', '#11141a', '#181c24', '#20252f', '#29303b', '#333b48', '#3e4756', '#4b5566', '#5a6578', '#6d798d'];     // 发蓝的黑铸铁
  const R_BRONZE = ['#0b0603', '#190e05', '#271608', '#361e0b', '#46280f', '#573213', '#693d18', '#7c491d', '#905623', '#a5642a', '#bc7534'];   // 青铜羊角
  const WOOD = defDeep(R_OAK, { depth: 4, amb: 0.16 }), WOODD = defDeep(R_OAK, { depth: 3, dark: 3, amb: 0.1 });
  const IRON = defDeep(R_IRON, { depth: 5, amb: 0.16 }), IROND = defDeep(R_IRON, { depth: 4, dark: 3, amb: 0.1 });
  const HEAD = defDeep(R_IRON, { depth: 8, amb: 0.2 });
  const HORN = defDeep(R_BRONZE, { depth: 3, amb: 0.2 }), HORND = defDeep(R_BRONZE, { depth: 3, dark: 3, amb: 0.12 });
  const BRASS = defDeep('brass', { depth: 2, amb: 0.22 }), CHAIN = defDeep('bladesteel', { depth: 1, dark: 3, amb: 0.2 });
  const FACE = defDeep('ivory', { depth: 1, amb: 0.5 }), ROD = defDeep('bladesteel', { depth: 1, amb: 0.3 }), CHAIND = defDeep('bladesteel', { depth: 1, dark: 4, amb: 0.2 });
  const M = DRAMP.magma;
  const EYE = defMat([M[2], M[4], M[5], M[7]], 1, 1), FIRE = defMat([M[2], M[3], M[5], M[7]], 1, 1), HOT = defMat([M[1], M[2], M[3], M[5]], 1, 1), SPARK = defMat([M[8], M[8], M[9], M[9]], 1, 1);
  const SMOKE = fxRamp('srSmoke', ['#8c8680', '#6c6762', '#4f4b48', '#363432', '#211f1e']);                // 烟囱的黑烟：灰 → 煤黑
  const STEAM = fxRamp('srSteam', ['#ffffff', '#dfe6ea', '#b4bec6', '#86919a', '#59636b']);                // 锅炉放汽、鼻孔喷汽
  const FR = FXR[FXI.fire];
  const hero = new Sprite(176, 120, 84, 112);
  const DUR = [2.4, 4 / 3, 0.75, 1.3, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { ramGate: { 3: 1.3, 4: 0.5, 5: 0.7 }, batter: { 3: 0.7, 4: 0.6, 5: 0.5 }, roar: { 3: 0.6, 4: 0.6, 5: 0.7 } };
  let MV = 'ramGate';
  const HX = 60;
  const LRAMP = [M[7], M[5], M[3]];
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: LRAMP, k: 0.9 }, { x: 0, y: 0, r: 0, ramp: LRAMP, k: 1 }], LS = [];
  const RIM_R = [0, 10, 18, 26], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FR, flash: 0, dq: 0, lights: null, skip: new Uint8Array(256) };
  RIM.skip[EYE] = RIM.skip[FIRE] = RIM.skip[HOT] = RIM.skip[SPARK] = 1;

  // ───── 骨架（本地坐标，脚底 y = 0，面朝右）─────
  const HUB = [-38, -13];                                  // 后面的大铁轮
  const HIP = { nf: [16, -23], ff: [11, -23] }, FOOT = { nf: 21, ff: 16 };
  const CH = [-18, 6], CHY = -51, CHL = 13, BEAMY = -38;   // 两根吊链（顶棚下沿 → 撞木），撞木静止时在 y = -38
  const NECK = [29, -39];
  // 走路 8 帧：每条腿 [前后, 离地]（远侧腿错开 4 帧）
  const WALK = [[6, 0], [3, 0], [0, 0], [-3, 0], [-6, 1], [-4, 5], [1, 6], [5, 3]];
  const WBY = [0, 0, -1, 0, 0, 0, -1, 0], WSW = [0.12, 0.08, 0, -0.08, -0.12, -0.08, 0, 0.08];
  const SW_IDLE = [0, 0.05, 0.08, 0.05, 0, -0.05, -0.08, -0.05];

  const P = {};
  const FIELDS = ['st', 'pitch', 'pv', 'bx', 'by', 'nfx', 'nfy', 'ffx', 'ffy', 'sw', 'th', 'bt', 'hd', 'mouth', 'eyes', 'heat', 'fire', 'door', 'gauge', 'wh', 'chain', 'flash', 'dq', 'rim', 'glow', 'fl'];
  function base() {
    P.st = 0; P.pitch = 0; P.pv = 0; P.bx = 0; P.by = 0; P.nfx = 0; P.nfy = 0; P.ffx = 0; P.ffy = 0; P.sw = 0; P.th = 0; P.bt = 0; P.hd = 0;
    P.mouth = 0; P.eyes = 0; P.heat = 0; P.fire = 1; P.door = 0; P.gauge = 0; P.wh = 0; P.chain = 0; P.flash = 0; P.dq = 0; P.rim = 0; P.glow = 0; P.fl = 0; P.mx = 0; P.flip = 0;
  }
  const walk = (f, fast) => { f = ((f % 8) + 8) % 8; const a = WALK[f], b = WALK[(f + 4) % 8]; P.nfx = a[0]; P.nfy = a[1]; P.ffx = b[0]; P.ffy = b[1]; P.by = WBY[f]; P.sw = WSW[f] * (fast ? 0.5 : 1); };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = -b; P.gauge = b; P.sw = SW_IDLE[Math.floor(tt / 0.3) % 8];
      P.fire = (f12 % 5) < 2 ? 2 : 1; P.eyes = (f12 % 13) === 0 ? 2 : 0;
      const lp = tt % DUR[IDLE];
      if (lp >= 1.35 && lp < 2.1) { const k = Math.floor((lp - 1.35) * 12);                     // 待机个性：前蹄刨两下地，低头从鼻孔喷汽
        P.nfy = [2, 5, 3, 0, 3, 5, 2, 0, 0][k] || 0; P.nfx = [2, 5, 4, 1, 3, 5, 3, 1, 0][k] || 0; P.hd = k < 5 ? 0.12 : k < 7 ? -0.08 : 0.02; P.eyes = k >= 5 && k < 7 ? 2 : P.eyes; }
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 12); walk(f); const w = walkDemo(tq, 26, -1); P.mx = w.mx; P.flip = w.flip; P.wh = f * 0.25; P.hd = 0.06; P.fire = 1 + (f & 1); }
    else if (st === ATTACK) {
      if (tq < 0.17) { const q = ease.out(tq / 0.17); P.sw = -0.8 * q; P.hd = -0.1 * q; P.pitch = -0.03 * q; P.bx = -Math.round(q); P.glow = 1; P.heat = 1; P.fire = 2; }
      else if (tq < 0.25) { P.sw = -0.88; P.hd = -0.12; P.pitch = -0.035; P.bx = -1; P.glow = 2; P.heat = 1; P.rim = 1; P.fire = 2; P.nfx = 3; P.eyes = 2; }
      else if (tq < 0.42) { const q = ease.out((tq - 0.25) / 0.17); P.sw = 0.9 - 0.2 * q; P.th = 3; P.hd = 0.3; P.pv = 1; P.pitch = 0.035; P.bx = 3; P.mouth = 1; P.glow = 3; P.heat = 2; P.rim = 2; P.eyes = 2; P.fire = 2; P.nfx = 3; }
      else { const q = ease.inOut(clamp01((tq - 0.42) / 0.3)); P.sw = 0.7 * (1 - q) * Math.cos(q * PI * 1.5); P.th = Math.round(3 * (1 - q)); P.hd = 0.3 * (1 - q); P.bx = Math.round(3 * (1 - q)); P.pv = 1; P.pitch = 0.035 * (1 - q); P.glow = q < 0.5 ? 1 : 0; P.heat = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { P.pitch = -0.06; P.bx = -2; P.sw = -0.55; P.hd = -0.25; P.eyes = 1; P.mouth = 1; P.flash = h < 1 / 12 ? 1 : 0; P.nfy = 3; P.nfx = -2; P.fire = 3; }
      else if (h < 0.35) { P.pitch = -0.03; P.bx = -1; P.sw = 0.25; P.hd = -0.1; P.eyes = 1; P.fire = 2; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); P.sw = 0.25 * (1 - q) - 0.1 * q; P.hd = -0.1 * (1 - q); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    geo(); focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { ramGate: 0, batter: 1, roar: 2 };
  function skillPose(st, tq, f12) {
    const jud = (f12 & 1) ? 1 : 0;
    if (MV === 'ramGate') {
      if (st === CHARGE) {                   // 后坐、撞木拉到最后、刨地，羊额越烧越亮
        const q = ease.out(clamp01(tq / 0.45)), pk = Math.floor((tq % 0.3) * 12);
        P.pv = 0; P.pitch = -0.06 * q; P.bx = -Math.round(3 * q); P.sw = -0.95 * q; P.hd = 0.26 * q; P.gauge = tq > 0.6 ? 2 : 1;
        if (tq > 0.45) { P.nfy = [4, 6, 2, 0][pk] || 0; P.nfx = [2, 5, 4, 1][pk] || 0; }
        P.heat = tq < 0.35 ? 1 : tq < 0.8 ? 2 : 3; P.eyes = tq > 0.5 ? 2 : 0; P.fire = 2 + (f12 & 1); P.glow = P.heat; P.rim = tq < 0.5 ? 1 : 2;
        if (tq > 0.8) { P.bx += jud; P.by = jud ? 0 : -1; }
      } else if (st === CAST) {              // 冲出去：撞木顶到最前、羊头低下、狂奔
        const f = Math.floor(tq * 12); walk(f * 2, 1); P.pv = 1; P.pitch = 0.05; P.bx = 4; P.sw = 0.9; P.th = 4; P.hd = 0.32; P.wh = f * 0.7;
        P.heat = 3; P.eyes = 2; P.fire = 3; P.mouth = 1; P.glow = 3; P.rim = f < 1 ? 3 : 2; P.gauge = 2;
      } else {                               // 撞木来回荡，锅炉放汽，羊额冷下来
        const q = ease.inOut(clamp01(tq / 0.6)); P.sw = 0.9 * Math.cos(tq / 0.5 * PI * 2) * Math.exp(-tq * 3.4); P.th = Math.round(4 * (1 - q)); P.hd = 0.32 * (1 - q);
        P.pv = 1; P.pitch = 0.05 * (1 - q); P.bx = Math.round(4 * (1 - q)); P.heat = tq < 0.25 ? 2 : tq < 0.5 ? 1 : 0; P.eyes = tq < 0.3 ? 2 : 0; P.fire = 2; P.glow = P.heat; P.door = tq > 0.2 && tq < 0.5 ? 1 : 0;
      }
    } else if (MV === 'batter') {
      if (st === CHARGE) {                   // 前腿撑地、撞木拉回一半
        const q = ease.out(clamp01(tq / 0.3)); P.sw = -0.72 * q; P.hd = 0.2 * q; P.nfx = Math.round(5 * q); P.ffx = Math.round(3 * q); P.by = Math.round(q);
        P.pv = 1; P.pitch = 0.03 * q; P.heat = tq < 0.35 ? 1 : 2; P.eyes = tq > 0.35 ? 2 : 0; P.fire = 2 + (f12 & 1); P.glow = P.heat; P.rim = 1; P.gauge = 1;
        if (tq > 0.45) P.bx = jud;
      } else if (st === CAST) {              // 连撞三下（每 0.2 秒一下）
        const ph = (tq % 0.2) / 0.2, hit = ph < 0.45;
        P.nfx = 5; P.ffx = 3; P.by = 1; P.pv = 1; P.fire = 3; P.eyes = 2; P.gauge = 2;
        if (hit) { P.sw = 0.85; P.th = 3; P.hd = 0.34; P.bx = 2; P.pitch = 0.04; P.mouth = 1; P.rim = 2; P.heat = 3; P.glow = 3; }
        else { P.sw = -0.45; P.th = 0; P.hd = 0.16; P.bx = 0; P.pitch = 0.02; P.heat = 2; P.glow = 2; P.rim = 1; }
      } else {
        const q = ease.inOut(clamp01(tq / 0.45)); P.sw = -0.45 * Math.cos(q * PI * 1.5) * (1 - q); P.hd = 0.16 * (1 - q); P.nfx = Math.round(5 * (1 - q)); P.ffx = Math.round(3 * (1 - q)); P.by = q < 0.5 ? 1 : 0;
        P.heat = q < 0.5 ? 1 : 0; P.glow = P.heat; P.fire = 2; P.door = tq > 0.1 && tq < 0.35 ? 1 : 0;
      }
    } else {   // roar：着火（半血怒吼）
      if (st === CHARGE) {                   // 锅炉憋压：整车下蹲、羊头缩回、发抖
        const q = ease.out(clamp01(tq / 0.35)); P.by = Math.round(2 * q); P.nfx = -Math.round(2 * q); P.ffx = -Math.round(2 * q); P.hd = 0.2 * q; P.sw = -0.3 * q;
        P.fire = tq < 0.3 ? 2 : 3; P.gauge = 2; P.heat = 1; P.eyes = 2; P.glow = 2; P.rim = 1; if (tq > 0.25) P.bx = jud;
      } else if (st === CAST) {              // 人立、张嘴喷火、炉门崩开、汽笛长鸣
        const q = ease.out(clamp01(tq / 0.17)); P.pv = 0; P.pitch = -0.2 * q; P.nfy = Math.round(11 * q); P.nfx = Math.round(5 * q); P.ffy = Math.round(7 * q); P.ffx = Math.round(3 * q);
        P.hd = -0.38 * q; P.mouth = q > 0.3 ? 2 : 1; P.door = 1; P.fire = 3; P.sw = -0.55 * q; P.eyes = 2; P.heat = 3; P.glow = 3; P.rim = tq < 0.17 ? 3 : 2; P.fl = 1; P.gauge = 2;
        if (tq > 0.17) P.by = (f12 & 1) ? -1 : 0;
      } else {                               // 重重落地（0.25 秒），火浪推开，撞木被震得乱荡
        const q = ease.in(clamp01(tq / 0.25)), r = clamp01((tq - 0.25) / 0.45);
        P.pv = 0; P.pitch = -0.2 * (1 - q); P.nfy = Math.round(11 * (1 - q)); P.nfx = Math.round(5 * (1 - q)); P.ffy = Math.round(7 * (1 - q)); P.ffx = Math.round(3 * (1 - q));
        P.hd = -0.38 * (1 - q) + (tq >= 0.25 ? 0.12 * (1 - r) : 0); P.mouth = tq < 0.4 ? 1 : 0; P.door = tq < 0.5 ? 1 : 0; P.fire = tq < 0.4 ? 3 : 2; P.eyes = 2; P.heat = tq < 0.4 ? 2 : 1; P.glow = P.heat; P.fl = 1;
        P.sw = tq < 0.25 ? -0.55 * (1 - q) : 0.6 * Math.cos(r * PI * 2.2) * (1 - r); if (tq >= 0.25 && tq < 0.34) P.by = 2;
      }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.3) { P.pitch = -0.08; P.bx = -2; P.sw = -0.6; P.hd = -0.3; P.eyes = 2; P.mouth = 2; P.flash = d < 1 / 12 ? 1 : 0; P.fire = 3; P.door = 1; P.nfy = 3; P.nfx = -2; return; }
    const q1 = ease.in(clamp01((d - 0.3) / 0.45)), q2 = ease.in(clamp01((d - 0.8) / 0.25));
    P.pv = 0; P.pitch = 0.2 * q1; P.nfx = Math.round(7 * q1); P.ffx = Math.round(5 * q1); P.sw = -0.6 * (1 - q1) + 0.35 * q1 * (1 - q2); P.hd = -0.3 + 0.45 * q1 + 0.25 * q2;
    P.mouth = q1 < 0.5 ? 1 : 0; P.door = 1; P.eyes = q1 < 0.5 ? 2 : 1; P.fire = 3;
    if (d >= 0.8) { P.chain = 1; P.bt = 0.34 * q2; }
    if (d >= 1.1) { P.eyes = (f12 & 1) && d < 1.3 ? 1 : 3; P.fire = d < 1.35 ? 2 : d < 1.6 ? 1 : 0; }
    if (d > 1.9) P.dq = Math.round(clamp01((d - 1.9) / 0.65) * 48) / 48;
  }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(P.pv ? 18 : -38, 0, P.pitch); }
  function beamOff() { return [CHL * Math.sin(P.sw) + P.th, -CHL * (1 - Math.cos(P.sw))]; }
  function beamXf() { bodyXf(); const o = beamOff(); B.move(o[0], o[1]); if (P.bt) B.rot(CH[0], BEAMY, P.bt); }
  function headXf() { beamXf(); B.rot(NECK[0], NECK[1], P.hd); }
  function geo() {
    bodyXf();
    for (const k of ['nf', 'ff']) {
      const r = B.at(HIP[k][0], HIP[k][1]), tgt = [FOOT[k] + P.bx + P[k + 'x'], -4 - P[k + 'y']];
      const kn = B.ik(r, tgt, 12, 11, -1), dd = Math.hypot(tgt[0] - kn[0], tgt[1] - kn[1]) || 1;
      L[k] = { r, kn, a: [kn[0] + (tgt[0] - kn[0]) / dd * 11, kn[1] + (tgt[1] - kn[1]) / dd * 11] };
    }
    L.hub = [HUB[0] + P.bx, HUB[1]];
    L.door = B.at(-47, -40); L.stack = B.at(-50, -68); L.whistle = B.at(-40, -58);
    L.ca = [B.at(CH[0], CHY), B.at(CH[1], CHY)];
    beamXf(); L.cb = [B.at(CH[0], BEAMY - 3.5), B.at(CH[1], BEAMY - 3.5)];
    headXf(); L.brow = H.at(47, -43); L.eye = H.at(42, -42); L.nose = H.at(51, -36); L.head = H.at(38, -41); L.mouthP = H.at(49, -32);
  }
  function focus() { const d = MV === 'roar' && (P.st === CHARGE || P.st === CAST); P.fx = d ? L.door[0] : L.brow[0]; P.fy = d ? L.door[1] : L.brow[1]; P.gx = P.fx; P.gy = P.fy; }

  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  // 圆环（轮箍、轮圈）：世界坐标
  function annW(cx, cy, r0, r1, m, t) { const Z = B.Z(), X = Math.round(cx * Z), Y = Math.round(cy * Z), R = r1 * Z, Ri = r0 * Z, N = Math.ceil(R) + 1;
    for (let j = -N; j <= N; j++) for (let i = -N; i <= N; i++) { const d = Math.hypot(i, j); if (d <= R + 0.3 && d >= Ri - 0.3) E.sp(X + i, Y + j, m, t); } }
  // 链条：一节亮一节暗
  function chainW(a, b, m) { const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let k = 0; k <= n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n, s = k % 3; px(x, y, m, s === 0 ? 3 : s === 1 ? 8 : 6); if (s === 1) px(x + 1, y, m, 4); } }
  const arrow = (x, y, dx, dy) => { B.ln(E, x, y, x + dx, y + dy, WOOD, 9); B.px(E, x + dx, y + dy, FACE, 8); B.px(E, x + dx + 1, y + dy, FACE, 6); B.px(E, x + dx, y + dy - 1, FACE, 9); };   // 挡下来的箭

  function drawWheel(far) {
    const h = far ? [L.hub[0] + 5, L.hub[1] - 1] : L.hub, T = far ? IROND : IRON, W = far ? WOODD : WOOD, a0 = P.wh;
    part(); annW(h[0], h[1], 11, 13, T);
    part(); annW(h[0], h[1], 9, 10.9, W);
    part(); for (let i = 0; i < 8; i++) { const a = a0 + i * PI / 4, c = Math.cos(a), s = Math.sin(a); capW(h[0] + c * 3, h[1] + s * 3, h[0] + c * 9.5, h[1] + s * 9.5, 1.3, 0.9, W); }
    if (far) { part(); dot(h[0], h[1], 3, T); return; }
    for (let i = 0; i < 8; i++) { const a = a0 + i * PI / 4 + PI / 8; px(h[0] + Math.cos(a) * 12, h[1] + Math.sin(a) * 12, T, 9); }   // 箍上的铆钉（看得出轮子在转）
    for (let i = 0; i < 8; i++) { const a = a0 + i * PI / 4; px(h[0] + Math.cos(a) * 10, h[1] + Math.sin(a) * 10, W, 3); }
    part(); dot(h[0], h[1], 3.4, T); part(); dot(h[0] - 0.4, h[1] - 0.4, 1.7, BRASS); px(h[0] - 1, h[1] - 1, BRASS, 9);
  }
  function drawLeg(k, far) {
    const g = L[k], m = far ? IROND : IRON, st = far ? CHAIND : ROD, a = g.a, kn = g.kn;
    const sl = [kn[0] + (a[0] - kn[0]) * 0.5, kn[1] + (a[1] - kn[1]) * 0.5];
    part(); capW(kn[0], kn[1], a[0], a[1], 1.4, 1.4, st); if (!far) lnW(kn[0] - 0.5, kn[1], a[0] - 0.5, a[1], st, 8);   // 小腿：亮钢的活塞杆
    part(); capW(kn[0], kn[1], sl[0], sl[1], 2.5, 2.2, m, far ? 0 : 7);                                                  // 活塞套筒
    part(); capW(g.r[0], g.r[1], kn[0], kn[1], 3.6, 2.7, m, far ? 0 : 7); if (!far) { lnW(g.r[0] - 1.5, g.r[1] + 1, kn[0] - 1.5, kn[1] - 0.5, m, 7); }   // 大腿（铁板）
    part(); dot(kn[0], kn[1], 2.4, far ? IROND : BRASS); px(kn[0] - 1, kn[1] - 1, far ? IROND : BRASS, far ? 6 : 9);   // 黄铜膝盖球
    part(); const x = Math.round(a[0]), y = Math.round(a[1]);
    polyW([[x - 3, y], [x + 2, y], [x + 5, y + 4], [x - 3.5, y + 4]], m); lnW(x + 1, y + 1, x + 2, y + 3, m, 2); lnW(x - 3, y + 3, x + 4, y + 3, m, far ? 4 : 7); px(x - 2, y + 1, m, far ? 5 : 8);   // 分瓣的铁蹄
    part(); capW(x - 2.5, y - 0.5, x + 2, y - 0.5, 0.9, 0.9, far ? IROND : BRASS);                         // 蹄箍
    part(); dot(g.r[0], g.r[1], far ? 2.6 : 3.4, m); if (!far) { dot(g.r[0], g.r[1], 1.3, BRASS); }       // 胯上的转轴
  }
  function drawPosts(far) {
    part(); bodyXf(); const o = far ? 3 : 0, m = far ? WOODD : WOOD;
    for (const x of [-30 + o, 13 + o]) { B.cap(E, x, -31, x, -51, 1.8, 1.8, m); if (!far) { B.ln(E, x - 1, -49, x - 1, -33, m, 7); } }
    if (!far) { part(); for (const x of [-30, 13]) { B.poly(E, [[x - 2.5, -51], [x + 2.5, -51], [x + 2.5, -48], [x - 2.5, -48]], IRON); B.poly(E, [[x - 2.5, -34], [x + 2.5, -34], [x + 2.5, -31], [x - 2.5, -31]], IRON); B.px(E, x, -50, IRON, 9); B.px(E, x, -33, IRON, 9); } }
  }
  function drawChassis() {
    part(); bodyXf();
    B.poly(E, [[-62, -18], [20, -18], [26, -23], [24, -31], [-62, -31]], WOOD);
    B.ln(E, -62, -22.5, 22, -22.5, WOOD, 3); B.ln(E, -62, -26.5, 23, -26.5, WOOD, 3); B.ln(E, -62, -30.5, 23, -30.5, WOOD, 8);   // 木板缝、上沿
    for (let x = -60; x < 18; x += 5) { const j = (x * 7) & 3; B.px(E, x + j, -20 - (j & 1), WOOD, 7); B.px(E, x + 2 - j, -25 + (j >> 1), WOOD, 3); B.px(E, x + j + 1, -29, WOOD, 7); }   // 木纹
    arrow(-12, -26, 4, -5); arrow(-3, -21, 5, -4);
    part(); for (const x of [-60, -24, -8, 5]) { B.poly(E, [[x, -31.5], [x + 2.5, -31.5], [x + 2.5, -17.5], [x, -17.5]], IRON); B.px(E, x + 1, -29, IRON, 9); B.px(E, x + 1, -24, IRON, 9); B.px(E, x + 1, -20, IRON, 9); }   // 铁条 + 铆钉
    part(); B.poly(E, [[12, -32], [24, -32], [29, -25], [25, -17], [12, -17]], IRON, 4);                    // 包铁的撞角板
    B.ln(E, 13, -31, 24, -31, IRON, 8); B.ln(E, 24, -31, 28, -25, IRON, 7); for (const [x, y] of [[14, -29], [22, -29], [14, -19], [22, -19], [26, -24]]) B.px(E, x, y, IRON, 9);
    part(); B.ell(E, 19, -24, 2.4, 2.4, 0, BRASS); B.px(E, 18, -25, BRASS, 9);
    part(); const sag = B.bez([-22, -18], [-8, -10], [6, -18], 12); for (let i = 0; i < sag.length; i++) { const p = B.at(sag[i][0], sag[i][1]); px(p[0], p[1], CHAIN, i % 2 ? 8 : 4); }   // 车底挂着的一圈链子
  }
  function drawBoiler() {
    part(); bodyXf();
    B.poly(E, [[-59, -31], [-35, -31], [-35, -49], [-59, -49]], IRON); B.ell(E, -47, -49, 12, 4.5, 0, IRON);
    B.ln(E, -57, -48, -57, -33, IRON, 7); for (let y = -44; y <= -36; y += 4) { B.px(E, -56, y, IRON, 9); B.px(E, -37, y, IRON, 8); }
    part(); B.poly(E, [[-59.5, -35], [-34.5, -35], [-34.5, -33], [-59.5, -33]], BRASS); part(); B.poly(E, [[-59.5, -47], [-34.5, -47], [-34.5, -45], [-59.5, -45]], BRASS);
    for (let x = -58; x <= -36; x += 3) { B.px(E, x, -34, BRASS, 9); B.px(E, x, -46, BRASS, 9); }
    // 烟囱 + 冠口 + 汽笛
    part(); B.cap(E, -50, -52, -50, -64, 2.6, 2.9, IRON); B.ln(E, -51, -63, -51, -53, IRON, 7);
    part(); B.poly(E, [[-54.5, -64], [-45.5, -64], [-44.5, -68], [-55.5, -68]], IRON); B.ln(E, -55, -67, -45, -67, IRON, 7);
    part(); B.poly(E, [[-53, -60], [-47, -60], [-47, -58.5], [-53, -58.5]], BRASS);
    part(); B.poly(E, [[-41, -53], [-39, -53], [-39, -57], [-41, -57]], BRASS); B.poly(E, [[-42, -57], [-38, -57], [-38, -58], [-42, -58]], BRASS); B.px(E, -41, -56, BRASS, 9);
    // 压力表
    part(); B.ell(E, -38.5, -43, 2.2, 2.2, 0, BRASS, 7); B.px(E, -39.5, -44, BRASS, 9);
    const ga = [-2.2, -0.9, 0.7][P.gauge] || 0; B.ln(E, -38.5, -43, -38.5 + Math.sin(ga) * 1.6, -43 - Math.cos(ga) * 1.6, IRON, 10); if (P.gauge >= 2) B.px(E, -37, -44, EYE, 2);
    // 炉门：黄铜门框、铁栅、栅缝里的火
    part(); B.ell(E, -47, -40, 5.2, 5.2, 0, BRASS); B.px(E, -50, -44, BRASS, 9); B.px(E, -52, -40, BRASS, 8);
    part(); const fb = P.fire >= 3 ? 4 : P.fire >= 2 ? 3 : P.fire ? 2 : 1;
    B.ell(E, -47, -40, 3.8, 3.8, 0, P.fire ? FIRE : IRON, P.fire ? fb : 2); if (P.fire >= 2) { B.ell(E, -47, -39, 1.8, 1.4, 0, FIRE, 4); if (P.fire >= 3) B.px(E, -47, -39, SPARK); }
    if (!P.door) { part(); for (const x of [-49, -47, -45]) B.ln(E, x, -43, x, -37, IRON, 3); B.ln(E, -50, -40, -44, -40, IRON, 2); }
    else { part(); B.ell(E, -54, -40, 1.6, 4.6, 0, IRON); B.ln(E, -54, -43, -54, -37, IRON, 8); }            // 炉门崩开，挂在一边
  }
  function drawRoof() {
    part(); bodyXf();
    B.poly(E, [[-38, -50], [-35, -55], [-6, -60], [20, -56], [24, -50]], WOOD);                         // 木板顶棚
    B.ln(E, -34, -53, 21, -53, WOOD, 3); B.ln(E, -30, -56, 16, -56, WOOD, 3); B.ln(E, -18, -58.5, 6, -58.5, WOOD, 3);
    for (let x = -32; x <= 18; x += 6) { const j = (x * 5) & 3; B.px(E, x + j, -54.5, WOOD, 7); B.px(E, x + 3 - j, -57, WOOD, 7); B.px(E, x + j, -51.5, WOOD, 3); }
    part(); B.poly(E, [[-36, -55], [-6, -60.5], [20, -56.5], [21, -55], [-6, -58.5], [-35, -53.5]], IRON); B.ln(E, -34, -55, -6, -60, IRON, 8);   // 铁的屋脊
    part(); B.poly(E, [[-38.5, -52], [24, -52], [25, -49.5], [-38.5, -49.5]], IRON); for (let x = -36; x <= 22; x += 3) B.px(E, x, -51, IRON, 9);   // 包铁的檐口 + 铆钉
    part(); for (const x of CH) { B.ell(E, x, -49, 1.6, 1.4, 0, IRON); B.px(E, x, -49, IRON, 2); }
    part(); arrow(-16, -58, 3, -6); arrow(-3, -59, 5, -5); arrow(10, -57, 6, -3);
  }
  function drawChains() {
    part();
    if (P.chain) { chainW(L.ca[0], L.cb[0], CHAIN); chainW(L.ca[1], [L.ca[1][0] + 1, L.ca[1][1] + 5], CHAIN); chainW(L.cb[1], [L.cb[1][0] - 2, L.cb[1][1] - 4], CHAIN); }   // 前面那根断了
    else { chainW(L.ca[0], L.cb[0], CHAIN); chainW(L.ca[1], L.cb[1], CHAIN); }
  }
  function drawBeam() {
    part(); beamXf();
    B.cap(E, -26, BEAMY, 28, BEAMY, 3.8, 3.8, WOOD); B.ln(E, -24, BEAMY - 2, 26, BEAMY - 2, WOOD, 8); B.ln(E, -24, BEAMY + 1, 26, BEAMY + 1, WOOD, 3);
    for (let x = -22; x < 24; x += 6) B.px(E, x, BEAMY - 1 + (x & 1), WOOD, 3);
    B.ell(E, -26, BEAMY, 1.4, 3, 0, WOOD, 7);                                                              // 撞木后端的年轮
    part(); for (const x of [-21, -2, 13, 24]) { B.poly(E, [[x - 1, BEAMY - 4.3], [x + 1.5, BEAMY - 4.3], [x + 1.5, BEAMY + 4.3], [x - 1, BEAMY + 4.3]], IRON); B.px(E, x, BEAMY - 2, IRON, 9); B.px(E, x, BEAMY + 2, IRON, 8); }
    part(); for (const x of CH) { B.ell(E, x, BEAMY - 4, 1.5, 1.2, 0, IRON); B.px(E, x, BEAMY - 4, IRON, 2); }   // 吊环
    part(); B.ell(E, 28.5, BEAMY - 1, 2.2, 5, 0, BRASS); B.ln(E, 28, BEAMY - 5, 28, BEAMY + 3, BRASS, 8);          // 黄铜颈箍
  }
  const HK = 1.2, hs = (x, y) => [NECK[0] + (x - NECK[0]) * HK, NECK[1] + (y - NECK[1]) * HK];   // 羊头按颈点放大 1.2 倍
  const H = { poly: (pts, m, t) => B.poly(E, pts.map((p) => hs(p[0], p[1])), m, t), ln: (x0, y0, x1, y1, m, t) => { const a = hs(x0, y0), b = hs(x1, y1); B.ln(E, a[0], a[1], b[0], b[1], m, t); },
    px: (x, y, m, t) => { const a = hs(x, y); B.px(E, a[0], a[1], m, t); }, ell: (cx, cy, rx, ry, an, m, t) => { const a = hs(cx, cy); B.ell(E, a[0], a[1], rx * HK, ry * HK, an, m, t); },
    strand: (pts, r0, r1, m, t) => B.strand(E, pts.map((p) => hs(p[0], p[1])), r0 * HK, r1 * HK, m, t), at: (x, y) => { const a = hs(x, y); return B.at(a[0], a[1]); } };
  const HORN_PTS = [[37, -47], [33, -51], [27, -50.5], [22.5, -46], [21.5, -40], [23.5, -34.5], [28, -31.5], [33, -32.5], [35, -36], [33, -39]];
  function drawHorn(far) {
    part(); headXf(); const o = far ? [3.5, -1.5] : [0, 0], m = far ? HORND : HORN, pts = HORN_PTS.map((p) => [p[0] + o[0], p[1] + o[1]]);
    H.strand(pts, far ? 3.2 : 3.8, 1.2, m);
    if (far) return;
    for (let i = 1; i < pts.length - 2; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, r = 3.6 - i * 0.28;   // 角上一圈圈的棱
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; H.ln(mx - nx * r * 0.8, my - ny * r * 0.8, mx + nx * r * 0.8, my + ny * r * 0.8, m, 3); H.px(a[0] - nx * r * 0.6, a[1] - ny * r * 0.6, m, 8); }
    if (P.heat >= 2) { const t = pts[pts.length - 1]; H.px(t[0], t[1], HOT, P.heat >= 3 ? 4 : 3); }
  }
  function drawHead() {
    drawHorn(1);
    part(); headXf();
    H.poly([[30, -45], [35, -49], [42, -48.5], [47, -45], [51, -40], [53.5, -36.5], [53, -33.5], [48, -33], [41, -33.5], [34, -34], [30, -37]], HEAD);
    H.ln(38, -48, 44, -46.5, HEAD, 8); H.ln(44, -46.5, 49, -42, HEAD, 7); H.ln(49, -42, 52.5, -37, HEAD, 7);   // 前额撞面的高光
    H.ln(41, -46, 50, -37.5, HEAD, 6); for (const [x, y] of [[43, -44.5], [46, -41.5], [49, -38.5]]) H.px(x, y, HEAD, 9);   // 脸上一条铆着的铁板
    H.ell(38.5, -37.5, 3, 1.8, 0.2, HEAD, 3); H.ln(44, -35, 50, -35, HEAD, 3);                                 // 颧窝、鼻梁下
    H.ell(42, -42, 2.8, 1.9, -0.25, HEAD, 1);                                                                      // 眼窝
    H.ln(39, -44.5, 45, -44, HEAD, 9);                                                                             // 压着眼的眉骨
    // 眼：两点烧红的光
    const e = hs(42, -42), ep = (dx, dy, m, t) => B.px(E, Math.round(e[0]) + dx, Math.round(e[1]) + dy, m, t);
    if (P.eyes === 3) { ep(0, 0, HEAD, 10); ep(1, 0, HEAD, 10); ep(-1, 0, HEAD, 10); }
    else if (P.eyes === 1) { ep(-1, 0, EYE, 2); ep(0, 0, EYE, 2); ep(1, 0, EYE, 1); }
    else { ep(-2, 0, EYE, 2); ep(-1, 0, EYE, 3); ep(0, 0, EYE, 4); ep(1, 0, EYE, 3); ep(1, -1, EYE, 2); if (P.eyes === 2 || P.glow >= 2) { ep(0, -1, EYE, 3); ep(1, 0, EYE, 4); ep(2, -1, EYE, 3); ep(-1, 1, EYE, 2); } }
    // 鼻孔
    H.px(51, -36, P.glow >= 1 || P.eyes === 2 ? HOT : HEAD, P.glow >= 1 || P.eyes === 2 ? 4 : 1); H.px(52, -35, HEAD, 1);
    // 羊额烧红：暗红 → 橙 → 发白
    if (P.heat) { const c = P.heat >= 3 ? EYE : HOT, tn = P.heat >= 3 ? 4 : P.heat >= 2 ? 4 : 2;
      H.ln(44, -46, 48.5, -42, c, tn); H.ln(48.5, -42, 51.5, -37.5, c, tn);
      if (P.heat >= 2) { H.ln(43.5, -45, 47.5, -41.5, HOT, P.heat >= 3 ? 4 : 3); H.ln(47.5, -41.5, 50.5, -37.5, HOT, P.heat >= 3 ? 4 : 2); }
      if (P.heat >= 3) { H.px(47, -43, SPARK); H.px(50, -39, SPARK); } }
    // 嘴：张开时里面是炉火
    if (P.mouth) { part(); H.poly([[38, -34.5], [53, -34], [52, -30], [40, -31]], FIRE, P.mouth > 1 ? 4 : 3); H.ln(42, -32.5, 50, -32, FIRE, 4); }
    part(); const jr = hs(37, -33.5); B.save(); B.rot(jr[0], jr[1], P.mouth * 0.22);
    H.poly([[35, -34], [49, -33.5], [52.5, -33], [50, -30], [42, -29.5], [36, -31]], HEAD); H.ln(38, -30.5, 49, -30.5, HEAD, 3); H.px(51, -32.5, HEAD, 8);
    if (P.mouth) for (let x = 41; x <= 50; x += 3) H.px(x, -33.5, HEAD, 9);                                          // 下颌的铁牙
    B.restore();
    if (P.mouth) { H.px(44, -34.5, HEAD, 9); H.px(47, -34.5, HEAD, 9); H.px(50, -34.5, HEAD, 9); }            // 上颌的铁牙
    drawHorn(0);
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawWheel(1); drawLeg('ff', 1); drawPosts(1);
    drawChassis(); drawBoiler(); drawRoof(); drawChains(); drawBeam(); drawHead();
    drawPosts(0); drawLeg('nf', 0); drawWheel(0);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LS.length = 0;
    if (P.fire) { const l = LIGHT[0]; l.x = L.door[0] * z + spr.ox; l.y = L.door[1] * z + spr.oy; l.r = (4 + P.fire * 2.5 + (P.door ? 4 : 0)) * z; l.k = P.door ? 0.95 : 0.8; LS.push(l); }
    if (P.heat || P.eyes === 2) { const l = LIGHT[1]; l.x = L.brow[0] * z + spr.ox; l.y = L.brow[1] * z + spr.oy; l.r = (3 + P.heat * 2.5) * z; l.k = 0.6 + P.heat * 0.1; LS.push(l); }
    RIM.lights = LS.length ? LS : null;
    bake(spr, RIM);
  }
  // 立绘：撞门蓄满的那一刻（车身后坐、撞木拉到最后、羊额烧白、双眼通红），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;
  const headAt = (z) => { headXf(); const c = H.at(39, -41); B.reset(); return [c[0] * z + PSPR.ox, c[1] * z + PSPR.oy, 17 * z]; };
  function portrait() { const mv = MV; MV = 'ramGate'; poseAt(CHARGE, 1.0, 0); P.bx = -3; P.by = 0; P.heat = 3; P.eyes = 2; P.fire = 3; P.glow = 3; P.rim = 2; P.nfy = 0; P.nfx = 3; geo(); focus(); drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; PHEAD = headAt(2); return PSPR; }
  function headShot() { const mv = MV; MV = 'ramGate'; poseAt(IDLE, 0.4, 0); P.eyes = 2; P.glow = 1; P.heat = 1; P.rim = 1; P.fire = 2; geo(); focus(); drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; PHEAD = headAt(2); return PSPR; }

  // ───── 特效 ─────
  const T_STRIKE = 3 / 12;
  const sx = (v) => scrX(v), sy = (v) => HY + v;
  let crackT = 9, crackX = 0, lastF = -1;
  function clangFx(w) {
    const x = sx(L.brow[0] + 3), y = sy(L.brow[1] + 2);
    burst(x, y, 16 + 10 * w, 60, 170, 0.15, 0.45, FXI.impact, 30); burst(x, y, 8 + 6 * w, 30, 110, 0.25, 0.6, FXI.fire, 20);
    fx.cross(x, y, 6 + 3 * w, 'fire', 0.16); hitDummy(1, 1);
  }
  function ramFx() {
    const x = sx(L.brow[0] + 4), y = sy(L.brow[1] + 3);
    ring(x, y, 1, FXI.fire); fx.slash(sx(L.head[0] - 6), y, 22, 0.9, 2.3, 'fire', 0.2, 3, 2); clangFx(1.5);
    fx.wave(sx(L.nf.a[0]), HY, 1, 50, 9, 'fire', 0.5, 2); fx.crack(sx(L.nf.a[0]), HY, 20, 1, 'fire', 1.0); crackT = 0; crackX = L.nf.a[0];
    const st = L.stack; ring(sx(st[0]), sy(st[1]), 1, SMOKE); fx.cloud(sx(st[0] - 4), sy(st[1] - 6), 9, SMOKE, 0.8);
    burst(sx(L.door[0] - 10), sy(L.door[1]), 20, 50, 150, 0.25, 0.5, FXI.fire, 10);           // 锅炉后面喷出的火（往后推）
    shake(0.35, 3); flash(0.1);
  }
  function roarFx() {
    const x = sx(L.head[0]), y = HY - 2;
    ring(x - 30, y, 1, FXI.fire); ring(sx(L.door[0]), sy(L.door[1]), 1, FXI.fire); flash(0.12); shake(0.35, 3);
    fx.wave(x - 30, HY, 1, 70, 12, 'fire', 0.7, 2); fx.wave(x - 30, HY, -1, 70, 12, 'fire', 0.7, 2);
    fx.beam(sx(L.stack[0]), sy(L.stack[1]), sx(L.stack[0] - 3), sy(L.stack[1] - 30), 3, 'fire', 0.45, 2);   // 烟囱喷出的火柱
    const m = L.mouthP; for (let i = 0; i < 26; i++) { const a = -0.5 + Math.random() * 0.7, v = 60 + Math.random() * 120; spawn(K_BURST, sx(m[0]), sy(m[1]), Math.cos(a) * v, Math.sin(a) * v, 0.3 + Math.random() * 0.3, FXI.fire); }
    for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2; spawn(K_EMBER, x - 30 + Math.cos(a) * 60, HY - 1 + Math.sin(a) * 8, Math.cos(a) * 30, -20 - Math.random() * 20, 0.6, FXI.fire); }   // 身边一圈火
    const w = L.whistle; for (let i = 0; i < 10; i++) spawn(K_RISE, sx(w[0]) + (Math.random() - 0.5) * 3, sy(w[1]), (Math.random() - 0.5) * 20, -40 - Math.random() * 30, 0.6 + Math.random() * 0.4, STEAM);
  }
  function steamPuff(n, v) { const d = L.door; for (let i = 0; i < n; i++) spawn(K_RISE, sx(d[0] - 4 + (Math.random() - 0.5) * 16), sy(d[1] - 8 - Math.random() * 6), -v * Math.random(), -20 - Math.random() * 20, 0.6 + Math.random() * 0.5, STEAM); }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'ramGate') { ramFx(); sfx('boss', { k: 'srClang', w: 1 }); sfx('impact', { pal: 'fire', w: 1 }); sfx('boss', { k: 'slam', w: 0.8 }); }
      else if (MV === 'batter') { clangFx(1); shake(0.25, 2); flash(0.06); sfx('boss', { k: 'srClang', w: 0.9 }); sfx('hit', { mat: 'metal', w: 0.8 }); }
      else { roarFx(); sfx('boss', { k: 'srWhistle', w: 1 }); sfx('boss', { k: 'roar', w: 0.6 }); sfx('impact', { pal: 'fire', w: 0.8 }); }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
    if (s === CHARGE) { lastF = -1; if (MV === 'batter') sfx('boss', { k: 'srChug', w: 1 }); else sfx('boss', { k: 'srFurnace', w: MV === 'roar' ? 0.8 : 1 }); }
  }
  function onTime(s, t) {
    if (s === IDLE && t === 1.8) { const n = L.nose; for (let i = 0; i < 6; i++) spawn(K_RISE, sx(n[0] + 1), sy(n[1]), 20 + Math.random() * 25, -4 - Math.random() * 8, 0.4 + Math.random() * 0.3, STEAM); sfx('boss', { k: 'snort', w: 0.5 }); sfx('boss', { k: 'srHiss', w: 0.3 }); }
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'srChug', w: 0.7 });
    if (s === ATTACK && t === T_STRIKE) { clangFx(0.6); shake(0.15, 2); sfx('swing', { kind: 'smash', w: 0.95 }); sfx('hit', { mat: 'metal', w: 0.9 }); sfx('boss', { k: 'srClang', w: 0.6 }); }
    if (s === CHARGE && MV === 'ramGate' && (t === 0.5 || t === 0.8 || t === 1.1)) { const x = sx(L.nf.a[0]); burst(x, HY - 1, 10, 30, 90, 0.2, 0.5, FXI.dust, 14); burst(x, HY - 1, 5, 40, 100, 0.15, 0.3, FXI.impact, 20); fx.crack(x, HY, 6, 1, 'fire', 0.5); sfx('step', { w: 1 }); if (t === 0.8) sfx('boss', { k: 'srChug', w: 1 }); }
    if (s === CHARGE && MV === 'batter' && t === 0.3) sfx('boss', { k: 'srChug', w: 0.8 });
    if (s === CHARGE && MV === 'roar' && t === 0.3) { sfx('boss', { k: 'heartbeat', w: 0.9 }); steamPuff(6, 20); }
    if (s === CAST && MV === 'batter' && (t === 0.2 || t === 0.4)) { clangFx(t === 0.4 ? 1.3 : 1); shake(0.2 + t * 0.3, 2); sfx('boss', { k: 'srClang', w: 0.9 }); sfx('hit', { mat: 'metal', w: 0.8 }); if (t === 0.4) { fx.crack(sx(L.nf.a[0]), HY, 12, 1, 'fire', 0.8); crackT = 0; crackX = L.nf.a[0]; } }
    if (s === CAST && MV === 'ramGate' && t === 0.25) { for (let i = 0; i < 12; i++) spawn(K_DUST, sx(L.hub[0] + (Math.random() - 0.5) * 20), HY, -40 - Math.random() * 40, -6 - Math.random() * 12, 0.4 + Math.random() * 0.3, FXI.dust); sfx('step', { w: 1 }); }
    if (s === RECOVER && MV === 'ramGate' && t === 0.25) { steamPuff(10, 30); sfx('boss', { k: 'srHiss', w: 0.8 }); }
    if (s === RECOVER && MV === 'batter' && t === 0.25) { steamPuff(6, 20); sfx('boss', { k: 'srHiss', w: 0.5 }); }
    if (s === RECOVER && MV === 'roar' && t === 0.25) {
      const x = sx(L.nf.a[0]); fx.wave(x, HY, 1, 56, 10, 'fire', 0.6, 2); fx.wave(x, HY, -1, 56, 10, 'fire', 0.6, 2); fx.crack(x, HY, 16, 1, 'fire', 1); fx.crack(x, HY, 14, -1, 'fire', 1);
      burst(x, HY - 1, 24, 30, 120, 0.4, 0.8, FXI.dust, 16); ring(x, HY - 2, 1, FXI.fire); shake(0.3, 3); crackT = 0; crackX = L.nf.a[0];
      sfx('boss', { k: 'slam', w: 1 }); sfx('fall', { w: 0.8 });
    }
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'srGroan', w: 1 });
    if (s === DEATH && t === INCOMING + 0.75) { for (let i = 0; i < 16; i++) spawn(K_DUST, sx(L.nf.a[0] - 10 + Math.random() * 20), HY - 1, (Math.random() - 0.5) * 50, -6 - Math.random() * 10, 0.5 + Math.random() * 0.4, FXI.dust); shake(0.2, 2); sfx('boss', { k: 'thud', w: 0.8 }); sfx('hit', { mat: 'metal', w: 0.5 }); }
    if (s === DEATH && t === INCOMING + 1.05) { const x = sx(L.nose[0]); burst(x, HY - 2, 14, 40, 120, 0.2, 0.5, FXI.impact, 24); for (let i = 0; i < 22; i++) spawn(K_DUST, x - 20 + Math.random() * 40, HY - 1, (Math.random() - 0.5) * 60, -8 - Math.random() * 14, 0.5 + Math.random() * 0.5, FXI.dust); shake(0.25, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); sfx('boss', { k: 'srClang', w: 0.5 }); }
    if (s === DEATH && t === INCOMING + 1.3) { fx.cloud(sx(L.door[0]), sy(L.door[1] - 10), 14, STEAM, 1.2); steamPuff(18, 40); sfx('boss', { k: 'srHiss', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-60 + Math.random() * 100), HY - 4 - Math.random() * 40, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, i & 1 ? FXI.fire : SMOKE); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[1.8], [], [0.08, T_STRIKE], [0.3, 0.5, 0.8, 1.1], [0.2, 0.25, 0.4], [0.25], [], [INCOMING + 0.05, INCOMING + 0.75, INCOMING + 1.05, INCOMING + 1.3, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    crackT += dt;
    const st = L.stack, dead = state === DEATH && stT > INCOMING + 1.6;
    const rate = dead ? 0 : state === MOVE ? 0.3 : state === CHARGE ? (MV === 'ramGate' ? 0.65 : 0.4) : state === CAST ? 0.6 : 0.14;
    if (Math.random() < rate) spawn(K_RISE, sx(st[0]) + (Math.random() - 0.5) * 3, sy(st[1]), (Math.random() - 0.7) * 16, -14 - Math.random() * 16, 0.8 + Math.random() * 0.7, SMOKE);   // 烟囱的黑烟
    if (state === CHARGE && MV === 'ramGate' && stT > 0.6 && Math.random() < 0.3) spawn(K_EMBER, sx(st[0]), sy(st[1]), (Math.random() - 0.5) * 20, -30, 0.35, FXI.fire);
    if (P.fl && Math.random() < 0.7) spawn(K_EMBER, sx(-58 + Math.random() * 80), sy(-31 - Math.random() * 4), (Math.random() - 0.5) * 10, -18 - Math.random() * 18, 0.4 + Math.random() * 0.3, FXI.fire);   // 车身着火
    if (state === MOVE || (state === CAST && MV === 'ramGate')) {
      const f = Math.floor(stT * 12); if (f !== lastF) { lastF = f; const fr = state === MOVE ? f % 8 : (f * 2) % 8;
        const hit = fr === 0 ? 'nf' : fr === 4 ? 'ff' : null;
        if (hit) { const x = sx(L[hit].a[0] + 1); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust); if (Math.random() < 0.5) spawn(K_BURST, x, HY - 1, (Math.random() - 0.5) * 40, -30 - Math.random() * 30, 0.2, FXI.impact); sfx('step', { w: 0.9 }); if (fr === 0) sfx('boss', { k: 'srChug', w: 0.45 }); }
        if (state === CAST) { const x = sx(L.hub[0]); spawn(K_DUST, x, HY, -30 - Math.random() * 30, -6, 0.4, FXI.dust); spawn(K_EMBER, sx(L.head[0] - 60 - Math.random() * 30), sy(-36 + Math.random() * 20), -40, 0, 0.3, FXI.fire); } } }
    if (state === CHARGE && Math.random() < 0.45) {   // 蓄力：火星从四周卷向羊额（着火时卷向炉门）
      const a = Math.random() * 6.2832, r = 16 + Math.random() * 14, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, FXI.fire, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (P.door && Math.random() < 0.5) { const d = L.door; spawn(K_EMBER, sx(d[0]) + (Math.random() - 0.5) * 6, sy(d[1]), -10 - Math.random() * 20, -10 - Math.random() * 20, 0.35, FXI.fire); }
    if (crackT < 1.0 && Math.random() < 0.4) spawn(K_EMBER, sx(crackX) + (Math.random() - 0.5) * 36, HY - 1, 0, -12 - Math.random() * 10, 0.3, FXI.fire);   // 地上的裂纹还冒着火
  }
  function fxReset() { crackT = 9; lastF = -1; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(L.brow[0]); for (let dx = -10; dx <= 10; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, FR[Math.abs(dx) < 5 ? 2 : 3]); }   // 羊额映在地上的红光
    if (P.door || P.fl) { const x = sx(L.door[0]); for (let dx = -18; dx <= 18; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, FR[Math.abs(dx) < 8 ? 2 : 4]); }
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'ramGate'; return MVDUR[MV]; }

  const VOICES = {
    srChug: (s, t, w, p) => { s.nz(t, 0.12, 'lowpass', 600, 0.8, 0.12 * w, { src: 'brown', pan: p }); s.thud(t, 90, 48, 0.14, 0.14 * w, { pan: p }); s.nz(t + 0.02, 0.09, 'bandpass', 1500, 1, 0.04 * w, { pan: p });
      s.nz(t + 0.2, 0.1, 'lowpass', 520, 0.8, 0.07 * w, { src: 'brown', pan: p }); s.thud(t + 0.2, 80, 44, 0.12, 0.09 * w, { pan: p }); },
    srFurnace: (s, t, w, p) => { s.rumble(t, 1.1, 0.14 * w, { f: 220, pan: p }); s.riser(t, t + 1.0, 180, 1100, 0.04 * w, { pan: p }); s.crackle(t + 0.1, 1.0, 1800, 0.05 * w, { pan: p });
      s.tone(t, 'sawtooth', 55, 1.1, 0.04 * w, { to: 82, lp: 400, pan: p }); },
    srClang: (s, t, w, p) => { s.thud(t, 120, 38, 0.3, 0.28 * w, { pan: p }); s.ring(t, 310, 0.9, 0.07 * w, { parts: [[1, 1], [2.32, 0.6], [4.1, 0.35], [6.8, 0.2]], pan: p, rev: 0.4 });
      s.nz(t, 0.08, 'bandpass', 2600, 1.2, 0.14 * w, { pan: p }); s.crackle(t + 0.02, 0.25, 3000, 0.05 * w, { pan: p }); },
    srHiss: (s, t, w, p) => { s.nz(t, 0.8, 'highpass', 3500, 0.6, 0.09 * w, { a: 0.02, pan: p }); s.nz(t, 0.6, 'bandpass', 1800, 1, 0.04 * w, { to: 900, pan: p }); },
    srWhistle: (s, t, w, p) => {   // 工厂汽笛：两个音一起拉长，底下锅炉在吼
      s.tone(t, 'square', 370, 1.25, 0.03 * w, { to: 415, slide: 0.18, lp: 2400, vib: [5, 6, 0.3], pan: p, rev: 0.5 }); s.tone(t, 'square', 466, 1.25, 0.025 * w, { to: 523, slide: 0.18, lp: 2400, vib: [5, 6, 0.3], pan: p, rev: 0.5 });
      s.nz(t, 1.25, 'bandpass', 3200, 1.5, 0.06 * w, { pan: p }); s.rumble(t, 1.3, 0.16 * w, { f: 140, pan: p }); s.tone(t, 'sawtooth', 62, 1.2, 0.05 * w, { to: 44, lp: 500, pan: p }); },
    srGroan: (s, t, w, p) => { s.tone(t, 'sawtooth', 110, 1.4, 0.05 * w, { to: 52, vib: [3, 30, 0.2], lp: 800, pan: p, rev: 0.5 }); s.tone(t + 0.1, 'square', 220, 0.9, 0.02 * w, { to: 140, lp: 1200, pan: p });
      s.tone(t + 0.3, 'sine', 900, 1.1, 0.02 * w, { to: 280, pan: p, rev: 0.5 }); s.nz(t + 0.2, 1.0, 'bandpass', 1200, 2, 0.03 * w, { to: 400, pan: p }); },
  };

  return {
    name: '破门锤', HX, R_EL: FXI.fire, DUR, hero, P, GLOW_MATS: [EYE, FIRE, HOT, SPARK], HIT_POINT: [0, -36], EVENTS, MAX_H: 76, OWN_MAX: 60, SHEET_K: 3, VOICES,
    SFX: { body: 'armor', how: 'topple', pal: 'fire', style: 'fire', w: 1 },
    MOVES: ['ramGate', 'batter', 'roar'], MOVE_NAMES: { ramGate: '撞门', batter: '连撞', roar: '着火（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.5, 1.7, 1.8, 1.9]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0, 0.3, 0.6, 0.9, 1.25], 'ramGate'], [CAST, [0, 1 / 12, 3 / 12, 5 / 12], 'ramGate'], [RECOVER, [0.08, 0.17, 0.33, 0.6], 'ramGate'],
      [CHARGE, [0, 0.25, 0.5], 'batter'], [CAST, [0, 1 / 12, 2 / 12, 3 / 12, 5 / 12, 6 / 12], 'batter'], [RECOVER, [0.1, 0.35], 'batter'],
      [CHARGE, [0, 0.3, 0.55], 'roar'], [CAST, [0, 2 / 12, 5 / 12], 'roar'], [RECOVER, [0.17, 0.33, 0.6], 'roar'],
      [HURT, [INCOMING, INCOMING + 1 / 12, INCOMING + 0.25, INCOMING + 0.45]], [DEATH, [INCOMING + 0.1, INCOMING + 0.5, INCOMING + 0.8, INCOMING + 0.95, INCOMING + 1.1, INCOMING + 1.4, INCOMING + 2.0, INCOMING + 2.3]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
