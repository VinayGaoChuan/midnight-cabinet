// 重装战士（部队 · 人类 · 先锋 · 稀有 · 近战 272）：持盾卫士升级后的同一个人——同一面赭黄墨带鸢盾放大成 20 格高的塔鸢盾（铁包边、顶上两枚尖钉、5 支断箭、铜铆钉），
// 同一顶护鼻尖盔加了一块往前凸 5 格的猪嘴面甲（两排透气孔）和一撮赭黄短盔缨，棉甲换成黑铁板甲 + 赭黄纹章罩袍 + 三片叠层圆肩甲，锤换成单手链枷（短柄 + 钢链 + 刺球）。
// 攻击 = 甩砸：链枷在头顶抡一整圈，刺球从上往下砸在假人头顶、落地弹一下再收回；技能 = 特性「偏转」的升级版「铜墙」：塔盾插地、铆钉逐行亮起，
// 张开一堵竖直的青铜光墙，整排箭和一发大弩矢撞上去全被卸了力，直直掉在盾前堆成一堆，最后整堵墙推出一道贴地的青铜冲击波。死亡 = 人软下去，空甲往前塌平成一堆，盔、面甲、肩甲、链枷崩飞（死亡套件 parts）。
PCD.define('HeavilyArmedWarrior', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST, K_EMBER, K_STILL,
    spawn, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, sfx } = E;
  const RD = Math.round, px = parts.px, run = parts.run;

  // ───── 元素：偏转 · 青铜光（和持盾卫士同一色阶：白 21 → 奶油 5 → 铜黄 33 → 青铜 32 → 褐 19）；铁盾被打出的白火星用 steel 的第 1–2 级 ─────
  const R_EL = fxRamp('bronze', [21, 5, 33, 32, 19]), EL = FXR[R_EL], R_IMP = FXI.impact, R_STEEL = FXI.steel, EN = FXR[FXI.enemy];

  // ───── 材质（全部取自共享色板）─────
  const M = parts.mats(E, {
    plate: 'iron', arm: 'iron', coat: 'sand', greave: 'iron', boot: 'iron', belt: 'leather', copper: 'leather',
    skin: 'skin', sweat: { r: [27, 30, 31, 31], flat: 1 }, ink: { r: 'ink', flat: 1 }, helm: 'steel', visor: 'steel', crest: 'sand',
    face: 'sand', band: 'iron', rim: 'iron', srim: 'iron', spike: 'steel', fletch: 'white', shaft: 'wood', wood: 'wood', chain: 'steel', ball: 'iron',   // srim 盾的铁包边（单独一个材质：待机时不吃铜钉的轮廓光，保持铁色）
    boss: { r: [19, 32, 33, 5], flat: 1 }, bglow: { r: [5, 5, 21, 21], flat: 1 },
  });
  const BODY = { body: 'giant', leg: 9, torso: 12, sw: 6, head: 7, headW: 7, limb: 1.5, lw: 4, stride: 3, fall: 'front' };
  const BODY_LIE = Object.assign({}, BODY, { sw: 1 });                                // 散架那一瞬的空甲堆：整副塌平，胸背甲压扁成 2 行厚（sw 6 转 90° 后有 13 行高，像一块立着的门板）
  const R0 = parts.rig({}, BODY);
  const SH = { W: 5, H: 20, rc: 7 };                                                  // 塔鸢盾：半宽 5（11 格宽）× 20 行，盾心大铜钉在第 7 行
  // 盾面插箭（持盾卫士那 3 支 + 2 支；收招时再插上 1 支 = 6 支）：[x, 行, 方向, 长度, 断茬]
  const ARROWS = [[-1, 2, 3, 8, 0], [2, 5, 3, 6, 0], [-2, 9, 4, 9, 0], [1, 13, 3, 6, 1], [-3, 5, 2, 9, 0], [0, 16, 3, 6, 0]];
  const RIVET_ROWS = [2, 6, 10, 14];
  const HX = 72, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(100, 60, 44, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 8, 10], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['wood', 'skin', 'ink', 'fletch', 'shaft', 'boss', 'bglow', 'sweat', 'chain', 'crest']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 塔盾（盾上沿中点 = 手 + (1, −9)），后手 = 链枷（bhx bhy 握点、ba 柄的朝向、fdx fdy 刺球相对柄头的位置）─────
  // 额外字段：mask 盾上的箭（位）· lit 从下往上亮了几行铆钉 · visor 面甲（0 掀起 · 1 合上 · 2 半开）· sweat 满头汗 · shd 死亡时盾（0 在手上 · 1 往前倾 · 3 平拍在地）· ff 链枷画在身前（甩砸时）
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, fdx: 0, fdy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, mask: 31, lit: 0, visor: 1, sweat: 0, shd: 0, ff: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, ba, fdx, fdy, lean, head, crouch) => ({ hx, hy, bhx, bhy, ba, fdx, fdy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(9, -11, -8, -14, 3.0, 0, 7);                       // 塔盾立在身前（盾尖离地 1 格），链枷垂在身侧、刺球在膝旁
  const K_WIND1 = K(9, -11, -5, -27, -0.4, -7, 3, -1, -1, 1);         // 预兆 1：链枷抡到脑后
  const K_WIND2 = K(9, -11, -1, -31, 0.0, 1, -8, -1, 0, 0);           // 预兆 2：刺球转到头顶，链条拉直
  const K_STRIKE = K(9, -11, 8, -27, 1.3, 7, 1, 1, 1, 1);             // 出手：刺球从上往下砸在假人头顶
  const K_DROP = K(9, -11, 11, -14, 1.6, 3, 11, 1, 0, 1);             // 刺球落地
  const K_BOUNCE = K(9, -11, 11, -15, 1.6, 4, 7, 1, 0, 1);            // 弹一下
  const K_PLANT = K(10, -9, -7, -14, 3.0, -1, 7, 0, 0, 2);            // 技能：塔盾砸进地里、双脚分开下蹲
  const K_HURT = K(7, -12, -9, -13, 3.2, -3, 6, -1, -1);
  const K_KNEEL = K(10, -9, -6, -11, 2.7, 2, 6, 1, 1, 4);
  const K_SLUMP = K(10, -4, -6, -8, 2.9, 3, 6, 2, 1, 6);              // 散架前一帧：人软下去（前倾到底、头垂下、跪得更低）
  const K_HEAP = K(9, -8, -6, -8, 2.9, 3, 6, 0, 0, 0);                // 散架那一瞬：盔甲整副往前塌平（lying），离地 2 格；链枷、肩甲、盔还在上一帧的位置，被套件崩开
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'ba', 'fdx', 'fdy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['ba', -32, 32, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -16, 15], ['lying', 0, 1], ['lift', 0, 3]]);
  const KEY2 = parts.keyer([['fdx', -16, 16], ['fdy', -16, 16], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['dq', 0, 48, 48], ['st', 0, 8], ['mask', 0, 63], ['lit', 0, 4], ['visor', 0, 2], ['sweat', 0, 1], ['shd', 0, 3], ['ff', 0, 1], ['glint', 0, 1]]);
  const T_WHIRL = 1 / 12, T_STRIKE = 2 / 12, T_DROP = 3 / 12, T_REDROP = 5 / 12, T_PLANT = 0.25, T_SHUT = 0.35, T_OPEN = 0.4;
  const T_SHDOWN = INCOMING + 0.42, T_KIT = INCOMING + 0.7, D_SLUMP = 0.6;    // f9 盾倒地 · f11 人软下去 · f12（1.0 s）散架（死亡套件）
  const T_HIT = [0.06, 0.1, 0.14, 0.18, 0.22, 0.33];                   // 施放段：5 支箭 + 1 发大弩矢撞墙的时刻
  const HIT_Y = [-28, -21, -14, -24, -8, -18];                        // 撞墙的高度（本地 y）
  // 待机个性「掀面甲透气」（1.4–2.3 s）：面甲档 · 汗 · 头
  const VENT = [[2, 0, 0], [0, 1, -1], [0, 1, -1], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [2, 1, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0]];
  const VT0 = 1.4;

  function idle(tq, f12) {
    setK(K_IDLE, K_IDLE, 0); const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = [0, 1, 0, -1][(b + 1) & 3]; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
    P.fdx = [0, 1, 1, 0, -1, -1][Math.floor(TT * 5 + 1e-6) % 6];                // 刺球在身侧慢慢摆
    const lp = tq % DUR[IDLE];
    if (lp >= VT0 - 1e-6 && lp < VT0 + VENT.length / 12 - 1e-6) { const v = VENT[f12of(lp - VT0)]; P.visor = v[0]; P.sweat = v[1]; P.head = v[2]; P.glint = f12of(lp - VT0) === 8 ? 1 : 0; }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.mask = 31; P.lit = 0; P.visor = 1; P.sweat = 0; P.shd = 0; P.ff = 0;
    let plant = 0;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                          // 插盾推进：落脚那一帧盾尖往前杵进地里、身体顿一下；经过帧拔盾；刺球反向大荡
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f); P.bob = 0;
      if (f & 1) { P.hx += 1; P.hy -= 1; P.lean = 1; P.fdx = 0; P.fdy = 6; }
      else { P.hx += 2; P.hy += 2; P.crouch = 1; P.fdx = -3 * P.step; P.fdy = 6; plant = 1; }
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                      // 甩砸：两帧抡圈 → 砸在假人头顶（前冲 2 格）→ 刺球落地弹一下 → 收回
      P.ff = tq >= T_STRIKE - 1e-6 && tq < 0.5 ? 1 : 0;
      if (tq < T_WHIRL - 1e-6) { setK(K_WIND1, K_WIND1, 0); P.beard = 1; }
      else if (tq < T_STRIKE - 1e-6) { setK(K_WIND2, K_WIND2, 0); P.beard = 2; }
      else if (tq < T_DROP - 1e-6) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 2; P.beard = -2; P.sway = -1; }
      else if (tq < 4 / 12 - 1e-6) { setK(K_DROP, K_DROP, 0); P.bx = 2; P.beard = -1; }
      else if (tq < T_REDROP - 1e-6) { setK(K_BOUNCE, K_BOUNCE, 0); P.bx = 2; }
      else if (tq < 0.5) { setK(K_DROP, K_DROP, 0); P.bx = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.5) / 0.25)); setK(K_DROP, K_IDLE, q); P.bx = RD(2 * (1 - q)); }
    } else if (st === CHARGE) {                                      // 塔盾砸进地里 → 面甲合上 → 铆钉从下往上逐行亮
      if (tq < T_PLANT - 1e-6) { setK(K_IDLE, K_PLANT, ease.in(tq / T_PLANT)); P.hy -= RD(3 * Math.sin(tq / T_PLANT * Math.PI)); P.visor = 0; }
      else { setK(K_PLANT, K_PLANT, 0); P.visor = tq < T_SHUT - 1e-6 ? 0 : 1; plant = 1; }
      P.step = tq >= T_PLANT - 1e-6 ? 1 : 0; P.lit = Math.max(0, Math.min(4, Math.floor((tq - 0.45) / 0.2 + 1e-6) + 1)); if (tq < 0.45) P.lit = 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.7 ? 1 : 2; P.beard = -1;
    } else if (st === CAST) { setK(K_PLANT, K_PLANT, 0); P.lean = 1; P.step = 1; P.lit = 4; P.gem = 3; P.rim = 3; P.beard = tq < 2 / 12 ? -2 : -1; P.crouch = tq < 2 / 12 ? 3 : 2; P.sway = tq < 2 / 12 ? -1 : 0; plant = 1; }
    else if (st === RECOVER) {                                       // 拔出塔盾，面甲再掀开喘口气；盾上多了一支箭（6 支）
      const q = ease.inOut(clamp01((tq - 0.15) / 0.45)); setK(K_PLANT, K_IDLE, q); plant = q < 0.3 ? 1 : 0; P.step = q < 0.5 ? 1 : 0;
      P.lit = q < 0.2 ? 4 : q < 0.5 ? 2 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.mask = 63; P.visor = tq < T_OPEN - 1e-6 ? 1 : tq < T_OPEN + 1 / 12 ? 2 : 0; P.sweat = tq >= T_OPEN ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { P.visor = 1; P.sweat = 0; P.head = 0; P.glint = 0;
        if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.fdx = 3; }
        else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.fdx = 2; }
        else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); }
    } else if (st === DEATH) {                                       // 受击 → 单膝跪下、塔盾先轰然倒地 → 盔甲散架（死亡套件接管）
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(tq, f12); P.rim = 1; }
      else {
        P.visor = 1; P.sweat = 0; P.glint = 0;
        if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 2; P.gem = (f12 & 1) ? 1 : 0; P.fdx = 3; }
        else if (d < D_SLUMP - 1e-6) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -1; P.eyes = 1; P.beard = 1; P.shd = d < T_SHDOWN - INCOMING - 1e-6 ? 1 : 3; P.gem = d < 0.55 ? ((f12 & 1) ? 2 : 1) : 4; }
        else if (d < T_KIT - INCOMING - 1e-6) { setK(K_SLUMP, K_SLUMP, 0); P.bx = -1; P.eyes = 1; P.beard = 2; P.sway = -1; P.shd = 3; P.gem = 4; }
        else { setK(K_HEAP, K_HEAP, 0); P.lying = 1; P.lift = 2; P.eyes = 1; P.shd = 3; P.gem = 4; P.dq = 1; }   // 散架：精灵隐藏，由死亡套件画碎片（onTime 里先用这个姿势 dq 0 烤一帧当碎片）
      }
    } else if (st === REVIVE) {
      idle(0, 0); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + (plant ? Math.min(1, yo) : yo); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.ba = RD(P.ba / ASTEP) * ASTEP;
    P.fdx = RD(P.fdx); P.fdy = RD(P.fdy); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const g = bossAt(); P.gx = g[0] + P.bx; P.gy = g[1];              // 发光体 = 盾心青铜大钉
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 本角色的部件（通用的标「候选部件」）─────
  // 候选部件：kiteShield（和持盾卫士同一个部件，这里用到了 spikes / rivets / bossR）—— 参数说明见 ShieldDefender.js
  //   第 2 轮和持盾卫士一起改：上沿整宽、一圈铁包边、墨黑斜带从左上角 45° 一整条斜到右包边、盾面上沿 / 左沿受光右沿背光
  const KH = {};
  function kiteHalf(W, H) {
    const key = W * 100 + H; if (KH[key]) return KH[key];
    const a = [], kn = RD(H * 0.42);
    for (let r = 0; r < H; r++) a.push(r <= kn ? W : RD(W * (1 - Math.pow((r - kn) / (H - 1 - kn), 0.85))));
    return (KH[key] = a);
  }
  function kiteShield(T, cx, top, o) {
    const W = o.W, H = o.H, hw = kiteHalf(W, H), tl = o.tilt || 0, sh = (r) => RD(tl * (r - H / 2));
    E.part();
    for (let r = 0; r < H; r++) {
      const w = hw[r], y = top + r; if (o.clip != null && y > o.clip) continue;
      const s = sh(r), b0 = -W + r, up = r > 0 ? hw[r - 1] : -1, dn = r < H - 1 ? hw[r + 1] : -1;
      for (let x = -w; x <= w; x++) {
        const ax = Math.abs(x), rim = r === 0 || r === H - 1 || ax === w || ax > up || ax > dn;
        let m = o.face, t = 3;
        if (rim) { m = o.rim; t = (r === 2 || r === RD(H * 0.62)) && ax === w ? 4 : 0; }            // 一圈铁包边；两侧各两颗铆钉
        else if (o.band && (x === b0 || x === b0 + 1)) { m = o.band; t = x === b0 ? 3 : 2; }       // 墨黑斜带：一整条、2 格宽
        else if (r === 1 || x === -w + 1) t = 4;                                                    // 上沿下一行、左包边内一列受光
        else if (x === w - 1 || (x > 0 && x >= dn)) t = 2;                                          // 右包边内一列、右下收尖处背光
        px(E, T, cx + x + s, y, m, t);
      }
    }
    if (o.spikes) for (const sx of [-(W - 1), W - 1]) { px(E, T, cx + sx + sh(-1), top - 1, o.spikes, 0); px(E, T, cx + sx + sh(-2), top - 2, o.spikes, 4); }
    if (o.rivets) {
      const n = o.rivetRows.length;
      for (let i = 0; i < n; i++) {
        const r = o.rivetRows[i], w = hw[r] - 1, lit = n - i <= (o.lit || 0), newest = n - i === (o.lit || 0);
        for (const sx of [-w, w]) px(E, T, cx + sx + sh(r), top + r, lit ? (newest ? o.bglow : o.boss) : o.rivets, lit ? (newest ? 3 : 4) : 4);
      }
    }
    const lv = o.lv || 0, bx = cx + sh(o.rc), by = top + o.rc;
    const C = lv === 4 ? [o.boss, 1] : lv >= 2 ? [o.bglow, 3] : lv === 1 ? [o.boss, 4] : [o.boss, 3];
    const Rg = lv === 4 ? [o.boss, 1] : lv === 3 ? [o.bglow, 3] : lv === 2 ? [o.boss, 4] : lv === 1 ? [o.boss, 3] : [o.boss, 2];
    if (o.bossR) {                                                                              // 大钉：外圈待机是一道铁箍（蓄力时跟着亮成青铜），里面 3×3 铜面
      const Eg = lv === 4 ? [o.boss, 1] : lv === 3 ? [o.boss, 4] : lv === 2 ? [o.boss, 3] : lv === 1 ? [o.boss, 2] : [o.rim, 3], Ig = lv === 0 ? [o.boss, 3] : Rg;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (Math.abs(dx) + Math.abs(dy) > 3) continue; const e = Math.abs(dx) === 2 || Math.abs(dy) === 2, g = e ? Eg : Ig; px(E, T, bx + dx + (sh(o.rc + dy) - sh(o.rc)), by + dy, g[0], g[1]); }
      if (lv < 3 && lv !== 4) px(E, T, bx - 1, by - 1, o.boss, 4);
      if (lv === 0) px(E, T, bx + 1, by + 1, o.boss, 2);                                      // 右下背光：鼓起来的钉头
    } else for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(E, T, bx + dx, by + dy, Rg[0], Rg[1]);
    px(E, T, bx, by, C[0], C[1]);
    if (o.arrows) for (let i = 0; i < o.arrows.length; i++) {
      if (!((o.mask >> i) & 1)) continue;
      const [ax, ar, di, len, brk] = o.arrows[i];
      for (let k = 0; k <= len; k++) {
        const c = parts.cell(di, ax, ar, k), tail = k >= len - 1, wb = tail ? (o.wob || 0) : 0, X = cx + c[0] + sh(c[1]) + wb, Y = top + c[1];
        if (k === 0) px(E, T, X, Y, o.shaft, 1);
        else if (!tail || brk) px(E, T, X, Y, o.shaft, brk && k === len ? 4 : (k & 1) ? 3 : 4);
        else { px(E, T, X, Y, o.fletch, k === len ? 4 : 3); if (k === len - 1) px(E, T, X, Y - 1, o.fletch, 2); }
      }
    }
    return [bx, by];
  }
  // 候选部件：kiteFlat（同持盾卫士）—— 平拍在地上的鸢盾，侧看 2 行 + 盾心钉鼓出 1 格 + 顶钉 + 一截箭茬
  function kiteFlat(x0, len, lv) {
    E.part(); const T = parts.FREE, bi = RD(len * 0.35);
    for (let i = 0; i < len; i++) {
      const x = x0 + i, tip = i >= len - 2, band = i === RD(len * 0.55) || i === RD(len * 0.55) + 1;
      px(E, T, x, 0, M.srim, i === 0 ? 4 : 0);
      if (!tip) px(E, T, x, -1, i === 0 || i === len - 3 ? M.srim : band ? M.band : M.face, i === 0 ? 4 : band ? 2 : 3);
    }
    px(E, T, x0 - 1, -1, M.spike, 3); px(E, T, x0 - 2, -1, M.spike, 4);                     // 顶钉朝后
    px(E, T, x0 + bi, -1, lv === 4 ? M.boss : lv >= 2 ? M.bglow : M.boss, lv === 4 ? 1 : lv >= 2 ? 3 : 4); px(E, T, x0 + bi, -2, M.boss, lv === 4 ? 1 : 2); px(E, T, x0 + bi + 1, -2, M.boss, lv === 4 ? 1 : 2);
    for (const [ax, h] of [[3, 3], [9, 2], [13, 3]]) for (let k = 1; k <= h; k++) px(E, T, x0 + ax + (k >> 1), -1 - k, k === h ? M.fletch : M.shaft, k === h ? 4 : 3);   // 箭杆朝天
    return [x0 + bi, -1];
  }
  // 候选部件：tierPauldron —— 三片叠层圆肩甲：每片 2 行（上行甲面、下行一道暗边），一片比一片宽，最下一片往前多伸 1 格；最上一片一颗铜铆钉。o = { mat, rivet }
  function tierPauldron(R, x, y, m, rv, flat) {                                               // flat 1 = 散架时崩飞的那一片（不画圆顶，落地后只有 6 行高）
    E.part();
    const rows = [[-2, 2], [-3, 3], [-3, 4]];
    for (let i = 0; i < 3; i++) { const yy = y - 4 + i * 2, a = rows[i]; run(E, R, yy, x + a[0], x + a[1], m, i === 0 ? 4 : 0); run(E, R, yy + 1, x + a[0], x + a[1], m, 2); px(E, R, x + a[0], yy, m, 4); }
    if (!flat) { px(E, R, x - 1, y - 5, m, 4); px(E, R, x, y - 5, m, 0); px(E, R, x + 1, y - 5, m, 0); }   // 圆顶
    if (rv) { px(E, R, x, y - 4, rv, 4); px(E, R, x + 2, y - 2, rv, 3); }
  }
  // 候选部件：hounskull —— 护鼻尖盔上的猪嘴面甲：v 1 = 合上（盖住脸、往前凸 5 格的猪嘴、一道眼缝、两排透气孔、侧面铰钉）· 2 = 半开（斜着翻起）· 0 = 掀到额上（猪嘴朝天）。一个部件
  function hounskull(R, v, m) {
    E.part(); const c = R.hx, x1 = R.hx1, ey = R.ey;
    if (v === 1) {
      const x0 = R.hx0, rows = [[ey - 1, x0, x1], [ey, x0, x1 + 1], [ey + 1, x0, x1 + 3], [ey + 2, x0, x1 + 5], [ey + 3, x0, x1 + 4], [ey + 4, x0 + 1, x1 + 1]];
      for (const [y, a, b] of rows) run(E, R, y, a, b, m, y === ey - 1 ? 4 : 0);
      run(E, R, ey, c, x1, M.ink, 1);                                                             // 眼缝
      for (const [dx, dy] of [[1, 1], [2, 1], [3, 1], [3, 2], [4, 2], [5, 2]]) px(E, R, x1 + dx, ey + dy, m, 4);   // 猪嘴朝上的斜面受光（尖在 ey + 2，往前凸 5 格）
      for (const [dx, dy] of [[1, 3], [2, 3], [3, 3], [4, 3], [1, 4]]) px(E, R, x1 + dx, ey + dy, m, 2);   // 猪嘴下面背光
      px(E, R, x1 + 1, ey + 2, M.ink, 1); px(E, R, x1 + 2, ey + 3, M.ink, 1); px(E, R, x1, ey + 3, M.ink, 1);   // 两排透气孔
      px(E, R, x0 + 1, ey + 1, M.copper, 4); px(E, R, x0 + 1, ey + 3, m, 2); px(E, R, x0 + 2, ey + 3, m, 2);   // 侧面铜铰钉、腮边压纹
    } else if (v === 2) {
      const rows = [[ey - 3, c + 1, x1 + 3], [ey - 2, c, x1 + 2], [ey - 1, c - 1, x1 + 1], [ey, c - 1, x1 - 1]];
      for (const [y, a, b] of rows) run(E, R, y, a, b, m, 0);
      px(E, R, x1 + 3, ey - 3, m, 4); px(E, R, x1, ey - 2, M.ink, 1); px(E, R, c - 1, ey, M.copper, 4);
    } else {
      const rows = [[R.htop - 4, x1 - 1, x1 + 1], [R.htop - 3, x1 - 2, x1 + 1], [R.htop - 2, c, x1 + 1], [R.htop - 1, c - 1, x1]];
      for (const [y, a, b] of rows) run(E, R, y, a, b, m, 0);
      px(E, R, x1 + 1, R.htop - 4, m, 4); px(E, R, x1 - 1, R.htop - 2, M.ink, 1); px(E, R, c - 1, R.htop, M.copper, 4);
    }
  }
  // 候选部件：flail —— 单手链枷：木柄（铁箍）→ 钢链（横环 / 竖环逐节交替，直拉到刺球）→ 4×4 铁刺球（四边 + 四角 8 根钢刺）。
  //   (hx, hy) 握点，a 柄的朝向（0 朝上，顺时针为正），len 柄长，(dx, dy) 刺球中心相对柄头。三个部件：柄 → 链 → 球。返回刺球中心
  function flail(R, hx, hy, a, len, dx, dy) {
    const sx = Math.sin(a), sy = -Math.cos(a), tx = hx + sx * len, ty = hy + sy * len;
    E.part(); parts.line(E, R, hx - sx, hy - sy, tx, ty, M.wood, 3); px(E, R, tx, ty, M.chain, 4); px(E, R, hx - sx * 2, hy - sy * 2, M.chain, 2);
    const bx = RD(tx + dx), by = RD(ty + dy), n = Math.max(1, Math.ceil(Math.hypot(dx, dy)) - 2);
    E.part(); for (let k = 1; k <= n; k++) { const q = k / (n + 2), x = RD(tx + dx * q), y = RD(ty + dy * q); px(E, R, x, y, M.chain, (k & 1) ? 4 : 2); if (k & 1) px(E, R, x + 1, y, M.chain, 2); }
    E.part();
    for (let j = -2; j <= 1; j++) for (let i = -2; i <= 1; i++) { if ((j === -2 || j === 1) && (i === -2 || i === 1)) continue; px(E, R, bx + i, by + j, M.ball, i + j < -1 ? 4 : i + j > 0 ? 2 : 3); }
    for (const [i, j] of [[-1, -3], [0, 2], [-3, 0], [2, -1], [-3, -3], [2, -3], [-3, 2], [2, 2]]) px(E, R, bx + i, by + j, M.spike, j < 0 ? 4 : 3);
    return [bx, by];
  }
  function shieldGeo() { return { cx: P.hx + 1, top: P.hy - 9 }; }
  const FLAT_X0 = 7, FLAT_LEN = 20;
  function bossAt() {
    if (P.shd === 3) return [FLAT_X0 + RD(FLAT_LEN * 0.35), -1];
    if (P.shd === 1) return [13 + RD(-0.4 * (SH.rc - SH.H / 2)), -19 + SH.rc];
    const g = shieldGeo(); return [g.cx, g.top + SH.rc];
  }
  function flailTip() { return [P.bhx + Math.sin(P.ba) * 4, P.bhy - Math.cos(P.ba) * 4]; }

  // ───── 画（部件从后往前）─────
  // 赭黄纹章罩袍（和板甲同一部件）：胸前盖住前半身；腰带下是一片 7 格宽的前襟，垂过膝上，两侧露出黑铁腿甲裙。flat = 空甲堆里平铺在地上（前襟收成 3 格宽，躺倒后只有 3 行厚）
  function tabard(EE, R, tor, flat) {
    const [LL, RR] = tor.rows, y0 = tor.y0, hem = tor.hem, bl = tor.belt, bot = Math.min(0, hem + 3), hw = flat ? 1 : 3;
    const I = (y) => Math.min(LL.length - 1, y - y0);
    for (let y = y0 + 2; y < bl; y++) { const i = I(y); run(EE, R, y, LL[i] + 2, RR[i] - 1, M.coat, y === y0 + 2 ? 4 : 0); }
    for (let y = bl + 2; y <= bot; y++) {
      const i = I(y), c = RD((LL[i] + RR[i]) / 2), sw = y > hem ? RD(P.sway * 0.5) : 0, a = c - hw + sw, b = c + hw + sw;
      run(EE, R, y, a, b, M.coat, 0); px(EE, R, a, y, M.coat, 2);                                // 左沿一道褶影
      if (y === bot) for (let x = a; x <= b; x += 2) px(EE, R, x, y, M.coat, 2);                  // 下摆一跳一跳的布边
      if (y >= bot - 1) px(EE, R, c + sw, y, M.coat, 1);                                          // 下摆中间开衩
      const k = y - bl - 2; if (k >= 0 && k <= 2 * hw) { px(EE, R, a + k, y, M.band, 3); if (a + k + 1 <= b) px(EE, R, a + k + 1, y, M.band, 2); }   // 前襟上的墨黑斜带（和盾同一个纹章）
    }
    for (let y = y0 + 1; y < bl; y += 3) px(EE, R, LL[y - y0] + 1, y, M.copper, 4);             // 板甲后沿一列铜铆钉
  }
  const E1 = Object.assign({}, E, { part() {} });                                             // 不开新部件的画笔：空甲堆里几件东西并成一个部件
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, P.lying ? BODY_LIE : BODY);   // 离地 lift 由 rig 只加在身体上
    if (P.shd === 3) kiteFlat(FLAT_X0, FLAT_LEN, P.gem);
    if (R.lie) { drawHeap(R); return; }
    const drawFlail = () => { flail(R, P.bhx, P.bhy, P.ba, 4, P.fdx, P.fdy); parts.hand(E, R, P, { side: 'B', hand: M.arm, grip: 'big' }); };
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.armD, grip: 'none' });
    if (!P.ff) drawFlail();                                                                   // 链枷垂在身侧（远侧），刺球在膝旁
    tierPauldron(R, R.sBx, R.sBy + 3, M.armD, 0);
    parts.legs(E, R, P, { style: 'greave', mat: M.greave, matD: M.greaveD, boot: M.boot, bootD: M.bootD, w: 4 });
    tabard(E, R, parts.torso(E, R, P, { style: 'plate', mat: M.plate, belt: M.belt, buckle: M.copper }), 0);
    const hd = parts.head(E, R, P, { mat: M.skin, face: 'square', age: 'rugged', eye: M.ink, nose: 'big', mouth: 'line', ear: 'none' });
    if (P.sweat) { px(E, R, hd.x0 + 2, hd.top + 1, M.sweat, 3); px(E, R, hd.x1 - 1, hd.top + 2, M.sweat, 3); px(E, R, hd.x0 + 3, hd.ey + 2, M.sweat, 3); }   // 满头汗（和脸同一部件）
    helmSet(R);
    if (P.ff) drawFlail();                                                                    // 甩砸时链枷在身前
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.arm, hand: M.arm, grip: 'big' });
    tierPauldron(R, R.sFx - 1, R.sFy + 3, M.arm, M.copper);
    const SO = { W: SH.W, H: SH.H, rc: SH.rc, face: M.face, rim: M.srim, band: M.band, boss: M.boss, bglow: M.bglow, lv: P.gem, bossR: 1, spikes: M.spike,
      rivets: M.copper, rivetRows: RIVET_ROWS, lit: P.lit, arrows: ARROWS, mask: P.mask, shaft: M.shaft, fletch: M.fletch, wob: Math.max(-1, Math.min(1, -P.beard)) };
    if (!P.shd) { const g = shieldGeo(); kiteShield(R, g.cx, g.top, SO); }
    else if (P.shd === 1) kiteShield(parts.FREE, 13, -19, Object.assign(SO, { tilt: -0.4 }));
  }
  function helmSet(R, heap) {                                                                 // 护鼻尖盔 → 盔缨 → 猪嘴面甲（散架时盔 + 盔缨一块、面甲一块各自飞出）
    parts.helm(E, R, P, { style: 'nasal', mat: M.helm, trim: M.rim, nasal: P.visor === 1 ? 0 : 1 });
    { const EE = heap ? E1 : E, b = P.beard > 0 ? 1 : P.beard < 0 ? -1 : 0, y = R.htop - 5; EE.part();   // 盔尖一撮赭黄短盔缨（往后披、尖端会摆）
      px(EE, R, R.hx, y, M.crest, 0); px(EE, R, R.hx - 1, y, M.crest, 0); px(EE, R, R.hx - 1, y - 1, M.crest, 4); px(EE, R, R.hx - 2, y - 1, M.crest, 0); px(EE, R, R.hx - 3 - (b < 0 ? 1 : 0), y - 1 + (b > 0 ? 1 : 0), M.crest, 3); px(EE, R, R.hx - 2, y, M.crest, 2); }
    hounskull(R, P.visor, M.visor);
  }
  // 散架那一瞬的空甲堆（只烤这一帧交给死亡套件）：人已经没了（不画脸），整副盔甲往前塌平、离地 2 格。
  //   腿甲（两条并拢）、板甲 + 平铺的罩袍、臂甲并成一个大部件——碎片里是一整块不翻滚的扁堆（≤ 6 行）；
  //   链枷（柄 / 链 / 球）、两片叠层肩甲、盔、盔缨、猪嘴面甲各是一个部件，被套件崩开、各自落地弹跳
  function drawHeap(R) {
    const Rk = parts.rig(Object.assign({}, P, { lying: 0, lift: 0, crouch: K_SLUMP.crouch, lean: K_SLUMP.lean, head: K_SLUMP.head }), BODY);   // 上一帧（软下去）的骨架
    flail(Rk, P.bhx, P.bhy + 3, P.ba, 4, P.fdx, P.fdy);                                      // 链枷、肩甲、盔还在上一帧的位置（接得上），由套件从胸口往外崩开
    tierPauldron(Rk, Rk.sBx, Rk.sBy + 3, M.armD, 0, 1);
    tierPauldron(Rk, Rk.sFx - 1, Rk.sFy + 3, M.arm, M.copper, 1);
    helmSet(Rk, 1);
    E.part();
    const L = Object.assign({}, R, { hipFx: 0, hipBx: -1, legFx: 0, legBx: -1, footFx: 1, footBx: 0 });   // 两条腿甲并拢叠在一起（躺平后只有一条腿厚）
    parts.legs(E1, L, P, { style: 'greave', mat: M.greave, matD: M.greaveD, boot: M.boot, bootD: M.bootD, w: 3 });
    tabard(E1, R, parts.torso(E1, R, P, { style: 'plate', mat: M.plate, belt: M.belt, buckle: M.copper }), 1);
    parts.arm(E1, R, P, { sleeve: 'plate', mat: M.arm, hand: M.arm, grip: 'fist', at: [R.sFx, R.sFy + R.arm - 1] });   // 臂甲伸直压在身下（远侧那条被身体挡住，不画：肘甲会从背上拱起来）
  }
  function bakeHero() {                                              // 盾的铁包边：待机 / 移动（轮廓光 1 档）不吃铜钉的光，保持一圈铁色
    RIM.skip[M.srim] = RIM.skip[M.srimD] = P.rim <= 1 ? 1 : 0;
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
  }

  // ───── 特效 ─────
  // 技能里的箭（预分配 6 支）：st 1 飞来 · 2 撞墙停住闪白 · 3 竖直坠落 · 4 躺在盾前的箭堆里；big 1 = 大弩矢
  const AN = 6, aSt = new Uint8Array(AN), aX = new Float32Array(AN), aY = new Float32Array(AN), aVY = new Float32Array(AN), aT = new Float32Array(AN), aPile = new Int8Array(AN);
  // 铜墙：盾面前一堵竖直的半椭圆点阵墙（fx.dome 的半椭圆压扁、转成朝前鼓），底在盾尖、顶在盔缨上方；WALL_B 盾面前沿，WALL_R 最多往前鼓几格
  const WALL_B = 16, WALL_R = 3, WALL_H = 32, A_SPD = 330;
  const wallX = (v) => WALL_B + RD(WALL_R * Math.sqrt(Math.max(0, 1 - Math.pow((v - WALL_H / 2) / (WALL_H / 2), 2))));   // 第 v 行（离地）墙的前沿
  let whirlT = 9, wallT = 9, wallOff = -1, whT = new Float32Array(AN).fill(9), piled = 0, chargeAcc = 0, soulAcc = 0, lastStep = 0, lastVent = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s !== CAST) return;                                          // 铜墙：一下子全亮；整排箭和大弩矢从右边射来
    wallT = 0; wallOff = -1; piled = 0; whT.fill(9);
    for (let i = 0; i < AN; i++) { aSt[i] = 1; aT[i] = 0; aVY[i] = 0; aPile[i] = -1; aY[i] = wy(HIT_Y[i]); aX[i] = wx(wallX(-HIT_Y[i])) + 1 + A_SPD * T_HIT[i]; }
    const x = wx(WALL_B + WALL_R); burst(x, wy(-16), 16, 30, 90, 0.2, 0.5, R_EL, 6); fx.cross(wx(P.gx), wy(P.gy), 6, R_EL, 0.3); ring(wx(P.gx), wy(P.gy), 1, R_EL);
    shake(0.28, 2); flash(0.05);
  }
  function wallHit(i) {                                              // 第 i 支撞上铜墙：停住、闪白，然后竖直坠落
    const big = i === AN - 1, x = wx(wallX(-HIT_Y[i])) + 1, y = wy(HIT_Y[i]); aSt[i] = 2; aT[i] = 0; aX[i] = x; aY[i] = y; whT[i] = 0;
    burst(x, y, 6, 30, 80, 0.2, 0.45, R_EL, 6); burst(x, y, 3, 40, 90, 0.1, 0.25, R_STEEL, 4);
    if (big) { ring(x, y, 0, R_EL); fx.cross(x, y, 6, R_EL, 0.3); fx.wave(x - 2, HY, 1, DUMMY_X - x, 4, R_EL, 0.5, 2); hitDummy(0); }
    sfx('impact', { pal: 'metal', w: big ? 0.95 : 0.35 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_WHIRL) whirlT = 0;                   // 头顶抡一整圈：身后一道 270° 的拖尾弧（fxBack 里画）
    if (s === ATTACK && t === T_STRIKE) {                            // 刺球从上往下砸在假人头顶
      const tp = flailTip(), b = [RD(tp[0] + P.fdx), RD(tp[1] + P.fdy)], x = wx(b[0] + P.bx), y = wy(b[1]);
      fx.slash(wx(P.bhx + P.bx), wy(P.bhy), 11, -0.2, 1.9, R_IMP, 0.17, 2, 2);
      hitDummy(0); burst(x + 1, y, 14, 40, 110, 0.15, 0.4, R_IMP, 10); fx.cross(x + 1, y, 5, R_IMP, 0.2);
      sfx('swing', { kind: 'smash', w: 0.9 }); sfx('hit', { mat: 'wood', w: 0.9 });
    }
    if (s === ATTACK && (t === T_DROP || t === T_REDROP)) { const tp = flailTip(), x = wx(tp[0] + P.fdx + P.bx); for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 24, -6 - Math.random() * 8, 0.3 + Math.random() * 0.2, FXI.dust); }   // 刺球落地扬尘
    if (s === CHARGE && Math.abs(t - T_PLANT) < 1e-9) {              // 塔盾尖砸进地里：两道地裂 + 扬尘，闷「咚」
      const x = wx(P.hx + 1 + P.bx); fx.crack(x + 1, HY + 1, 12, 1, R_EL, 1.2); fx.crack(x - 1, HY + 1, 10, -1, R_EL, 1.2);
      for (let i = 0; i < 10; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 12, HY, (Math.random() - 0.5) * 40, -6 - Math.random() * 12, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.12, 1); sfx('impact', { pal: 'earth', w: 0.8 });
    }
    if (s === CHARGE && Math.abs(t - T_SHUT) < 1e-9) { const x = wx(R0.hx1 + 2), y = wy(R0.ey); fx.cross(x, y, 3, R_STEEL, 0.15); sfx('hit', { mat: 'metal', w: 0.3 }); }   // 面甲「咔嚓」合上
    if (s === CAST) for (let i = 0; i < AN; i++) if (Math.abs(t - T_HIT[i]) < 1e-9) wallHit(i);
    if (s === RECOVER && Math.abs(t - T_OPEN) < 1e-9) { fx.cloud(wx(R0.hx1 + 3), wy(R0.ey + 2), 3, R_STEEL, 0.6, 2); }   // 面甲掀开，呼出一团白气
    if (s === RECOVER && Math.abs(t - 0.02) < 1e-9) wallOff = 0;
    if (s === DEATH && Math.abs(t - T_SHDOWN) < 1e-9) {              // 塔盾先轰然倒地
      for (let i = 0; i < 14; i++) spawn(K_DUST, wx(FLAT_X0 + Math.random() * FLAT_LEN), HY - 1, (Math.random() - 0.5) * 36, -6 - Math.random() * 12, 0.4 + Math.random() * 0.3, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.7 });
    }
    if (s === DEATH && Math.abs(t - T_KIT) < 1e-9) {                 // 盔甲按部件崩开：猪嘴盔、肩甲、链枷、盾各自飞出，躯干塌成一堆空甲
      poseAt(DEATH, T_KIT, T_KIT); P.dq = 0; P.k1 = P.k2 = -2; drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;   // 碎片取自塌平的空甲堆（躯干压成 5 行、罩袍前襟平铺在地上），不是跪着的那一帧
      death.start('parts', { power: 0.85, fromX: 0, fromY: -18, fadeAt: 1.35, fadeDur: 0.5 });
      burst(wx(0), wy(-18), 10, 40, 100, 0.2, 0.5, R_STEEL, 10); shake(0.14, 1); sfx('fall', { w: 0.95 });
    }
  }
  const EVENTS = [[], [], [T_WHIRL, T_STRIKE, T_DROP, T_REDROP], [T_PLANT, T_SHUT], T_HIT.slice(), [0.02, T_OPEN], [], [T_SHDOWN, T_KIT], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.4) {                              // 青铜光从地面沿盾面逐行往上爬
      chargeAcc += dt * 22;
      while (chargeAcc >= 1) { chargeAcc -= 1; const g = shieldGeo(), side = Math.random() < 0.5 ? -1 : 1; spawn(K_RISE, wx(g.cx + P.bx + side * (3 + Math.random() * 3)), HY - Math.random() * 3, (Math.random() - 0.5) * 4, -18 - Math.random() * 16, 0.5 + Math.random() * 0.3, R_EL); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.95 }); const x = wx(P.hx + 1 + P.bx); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 20, -5 - Math.random() * 7, 0.35 + Math.random() * 0.25, FXI.dust); } lastStep = P.step; }
    if (state === IDLE) { const lp = q12(stT) % DUR[IDLE], k = lp >= VT0 - 1e-6 ? f12of(lp - VT0) : -1; if (k === 2 && lastVent !== 2) fx.cloud(wx(R0.hx1 + 3), wy(R0.ey + 2), 3, R_STEEL, 0.6, 2); lastVent = k; }   // 掀开面甲：一团白气
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.3) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 30, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < AN; i++) {
      if (!aSt[i]) continue; aT[i] += dt;
      if (aSt[i] === 1) aX[i] -= A_SPD * dt;
      else if (aSt[i] === 2 && aT[i] >= 2 / 12) { aSt[i] = 3; aVY[i] = 0; aT[i] = 0; }
      else if (aSt[i] === 3) { aVY[i] += 420 * dt; aY[i] += aVY[i] * dt; const floor = HY - Math.min(3, piled >> 1); if (aY[i] >= floor) { aY[i] = floor; aSt[i] = 4; aPile[i] = piled++; aX[i] = wx(WALL_B) - 1 + (hash(i, 3) - 0.5) * 5; spawn(K_DUST, aX[i], HY, (Math.random() - 0.5) * 10, -5, 0.3, FXI.dust); } }
      else if (aSt[i] === 4 && state !== CAST && state !== RECOVER) aSt[i] = 0;
    }
    whirlT += dt; wallT += dt; if (wallOff >= 0) wallOff += dt; for (let i = 0; i < AN; i++) whT[i] += dt;
  }
  function fxReset() { whirlT = 9; wallT = 9; wallOff = -1; whT.fill(9); piled = 0; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastVent = -1; aSt.fill(0); }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); if (whirlT < 0.16) whirl(); }
  // 链枷抡圈的拖尾：270° 的弧，头在刺球（正上方），尾巴沿逆时针往回拖到身前（上前方留一个缺口，不是一圈光环）。
  // 第 1 帧头部白、往尾巴按 impact 色阶逐级变暗、头部 2 格宽；第 2 帧整条降两级、隔点断开
  function whirl() {
    const IM = FXR[R_IMP], cx = wx(-1 + P.bx), cy = wy(-35), r = 9, n = Math.ceil(1.5 * Math.PI * r * 1.3), second = whirlT >= 1 / 12 - 1e-6;
    for (let k = 0; k <= n; k++) {
      const u = k / n, a = -u * 1.5 * Math.PI, lv = Math.min(4, (u < 0.15 ? 0 : u < 0.4 ? 1 : u < 0.7 ? 2 : 3) + (second ? 2 : 0));
      if ((u > 0.7 || second) && (k & 1)) continue;
      put(RD(cx + Math.sin(a) * r), RD(cy - Math.cos(a) * r), IM[lv]);
      if (u < 0.4 && !second) put(RD(cx + Math.sin(a) * (r - 1)), RD(cy - Math.cos(a) * (r - 1)), IM[Math.min(4, lv + 1)]);
    }
  }
  function drawArrow(x, y, big, white, vertical) {                 // 敌箭 / 大弩矢：横着飞（箭头朝左），坠落时竖着（箭头朝下），躺平时横着
    x = RD(x); y = RD(y); const L = big ? 8 : 5;
    for (let k = 0; k < L; k++) {
      const X = vertical ? x : x + k, Y = vertical ? y - k : y, c = white ? 21 : k === 0 ? EN[0] : k >= L - 1 ? EN[1] : big ? 28 : EN[2];
      put(X, Y, c); if (big) put(vertical ? X + 1 : X, vertical ? Y : Y + 1, white ? 21 : k === 0 ? EN[1] : k >= L - 2 ? EN[1] : 27);
    }
    if (!vertical) { put(x + L - 1, y - 1, white ? 21 : EN[1]); if (big) put(x + L - 1, y + 2, EN[1]); }
  }
  function fxFront(f12) {
    if (wallT < 1.3) {                                              // 铜墙：前沿 2 格厚（外沿奶油 · 里沿铜黄，亮点沿墙上下流动），里面隔点的铜黄 / 青铜格子；只有第 1 帧和撞击处是白（闪 2 帧、向外鼓 1 格）；收招时从上往下断续熄灭
      const off = wallOff < 0 ? 0 : clamp01(wallOff / 0.4), first = wallT < 1 / 12;
      for (let v = 0; v <= WALL_H; v++) {
        const q = v / WALL_H; if (off > 0 && q > 1 - off * 1.05 && hash(v, f12) < 0.8) continue;
        let f = wallX(v), hit = 0;
        for (let i = 0; i < AN; i++) if (whT[i] < 2 / 12 && Math.abs(-v - HIT_Y[i]) <= (i === AN - 1 ? 4 : 2)) hit = 1;
        if (hit) f += 1;
        const y = HY - v, white = first || hit, inner = white ? EL[0] : ((v + f12 * 2) % 6) === 0 ? EL[1] : EL[2];
        put(wx(f), y, white ? EL[0] : EL[1]); put(wx(f - 1), y, inner);                           // 前沿 2 格：外沿 2 级、里沿 3 级
        for (let x = WALL_B; x < f - 1; x++) if (((x + v) & 1) === 0 && (v % 3) !== 1) put(wx(x), y, first || hit ? EL[1] : x === f - 2 ? EL[2] : EL[3]);   // 墙里的点阵格子（3–4 级）
        if (v === WALL_H || wallX(v + 1) < f - (hit ? 1 : 0)) put(wx(f - 1), y - 1, first ? EL[0] : EL[1]);        // 顶上往回收的弧边
      }
    }
    for (let i = 0; i < AN; i++) {
      const s = aSt[i]; if (!s) continue; const big = i === AN - 1;
      if (s === 1) drawArrow(aX[i], aY[i], big, false, false);
      else if (s === 2) drawArrow(aX[i], aY[i], big, aT[i] < 1 / 12, false);
      else if (s === 3) drawArrow(aX[i], aY[i], big, false, true);
      else drawArrow(aX[i] - (big ? 2 : 0), aY[i], big, false, false);
    }
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) {                     // 大铜钉星芒
      const x = wx(P.gx), y = wy(P.gy), L = P.gem === 3 ? 6 : 3 + (f12 & 1);
      for (let r = 3; r <= L; r++) { const c = r <= 3 ? EL[0] : r <= 4 ? EL[1] : EL[2]; put(x + r, y, c); put(x - r, y, c); put(x, y - r, c); put(x, y + r, c); }
    }
  }
  function hurtFx(s) {                                               // 铁甲：火花更多、更白，另有 3 颗长寿命白火星
    const hx = HX + 11, hy = HY - 14; burst(hx, hy, s === DEATH ? 24 : 18, 60, 150, 0.25, 0.55, R_IMP, 20); burst(hx, hy, 3, 40, 90, 0.6, 0.9, R_STEEL, 16);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }

  return {
    name: '重装战士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.boss, M.bglow], HIT_POINT: [10, -14], EVENTS,
    deathKit: { mode: 'parts', at: T_KIT },
    SHEET: [[IDLE, [0, 0.4, 0.8, 1.4, 1.5, 1.6, 1.75, 1.9, 2.0, 2.1, 2.25]], [MOVE, [0, 1 / 6, 2 / 6, 3 / 6]], [ATTACK, null], [CHARGE, 'step2'], [CAST, null], [RECOVER, 'step2'], [HURT, 'hurt'],
      [DEATH, [0.34, 0.42, 0.6, 0.67, 0.75, 0.84, 0.92]], [REVIVE, [0.45, 0.55, 0.65, 0.75, 0.9]]],
    SFX: { body: 'armor', how: 'collapse', pal: 'metal', style: 'shield', w: 0.95 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
