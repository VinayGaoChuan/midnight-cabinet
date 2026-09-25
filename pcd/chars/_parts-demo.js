// 部件库演示（不是正式角色）：同一个模块按 ?v=0..14 只用 parts.* 拼出 15 个不同的人——体型档、头饰、服装、武器、握法、步态、死亡方式、配色都不同。
// 每个变体只写三样东西：材质表、draw()（部件按从后往前的顺序拼起来）、姿势类型；姿势时间线、缓存键、特效由下面的通用框架按类型给出。
PCD.define('_parts-demo', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, fall, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, death } = E;
  const HALF = Math.PI / 2, RD = Math.round;

  // ───── 姿势类型：手的关键帧（相对 rig 的肩，单位 = 臂长 / 9），[前手 dx, dy, 武器角] · bh 后手 · 其余是身体 ─────
  const K = (h, a, bh, ba, lean, head, crouch, pull) => ({ h, a, bh, ba: ba || 0, lean: lean || 0, head: head || 0, crouch: crouch || 0, pull: pull || 0 });
  const CLS = {
    staff:  { IDLE: K([4, 1], 0.12, [-1, 6]), WIND: K([2, -4], -0.45, [-2, 5], 0, -1), STRIKE: K([8, -1], 0.85, [-3, 4], 0, 1, 1), HOLD: K([7, 0], 0.62, [-2, 5], 0, 1),
              CHARGE: K([3, -6], -0.14, [0, 3], 0, -1, -1), CAST: K([8, -2], 1.05, [-4, 3], 0, 1, 1), HURT: K([2, 2], -0.32, [-3, 4], 0, -1, -1), KNEEL: K([3, 6], 0.85, [0, 7], 0, 1, 1) },
    blade:  { IDLE: K([2, 6], 0.55, [-1, 6]), WIND: K([-1, -3], -0.9, [1, 5], 0, -1, 0, 1), STRIKE: K([8, 1], 2.0, [-3, 3], 0, 1, 1), HOLD: K([8, 2], 2.3, [-2, 4], 0, 1),
              CHARGE: K([1, -7], 0.05, [1, 3], 0, -1, -1), CAST: K([8, 2], 2.4, [-4, 2], 0, 1, 1, 1), HURT: K([0, 4], -0.25, [-3, 4], 0, -1, -1), KNEEL: K([4, 7], 1.6, [0, 7], 0, 1, 1) },
    shield: { IDLE: K([4, 2], 0, [9, -1], 0.12), WIND: K([3, 2], 0, [2, -7], -1.05, -1, 0, 1), STRIKE: K([5, 2], 0, [11, 3], 1.95, 1, 1), HOLD: K([5, 2], 0, [11, 4], 2.1, 1),
              CHARGE: K([3, 2], 0, [7, -11], -0.05, -1, -1), CAST: K([5, 3], 0, [10, 6], 2.25, 1, 1, 1), HURT: K([2, 1], 0, [7, 0], -0.3, -1, -1), KNEEL: K([4, 5], 0, [9, 9], 1.35, 1, 1) },
    heavy:  { IDLE: K([2, 3], -0.75), WIND: K([0, -6], -0.35, 0, 0, -1), STRIKE: K([8, 3], 2.05, 0, 0, 1, 1, 1), HOLD: K([8, 5], 2.4, 0, 0, 1, 0, 1),
              CHARGE: K([1, -8], 0.1, 0, 0, -1, -1), CAST: K([8, 6], 2.7, 0, 0, 1, 1, 2), HURT: K([1, 3], -1.0, 0, 0, -1, -1), KNEEL: K([5, 8], 1.9, 0, 0, 1, 1) },
    pole:   { IDLE: K([3, 5], 0.1), WIND: K([-1, 4], HALF, 0, 0, -1), STRIKE: K([8, 3], HALF, 0, 0, 1, 1), HOLD: K([7, 3], HALF, 0, 0, 1),
              CHARGE: K([2, 0], -0.5, 0, 0, -1, -1), CAST: K([8, 3], 1.9, 0, 0, 1, 1, 1), HURT: K([1, 5], -0.3, 0, 0, -1, -1), KNEEL: K([4, 7], 1.2, 0, 0, 1, 1) },
    bow:    { IDLE: K([3, 5], 0, [-1, 6]), WIND: K([8, 0], 0, [-7, 0], 0, 0, 0, 0, 2), STRIKE: K([8, 0], 0, [-4, -1], 0, -1), HOLD: K([8, 0], 0, [-6, -1]),
              CHARGE: K([7, -3], 0, [-8, -1], 0, -1, -1, 0, 3), CAST: K([7, -3], 0, [-6, -2], 0, -1), HURT: K([2, 4], 0, [-3, 4], 0, -1, -1), KNEEL: K([4, 6], 0, [0, 7], 0, 1, 1) },
    gun:    { IDLE: K([2, 4], 0.45), WIND: K([3, 1], HALF), STRIKE: K([2, 1], 1.37, 0, 0, -1), HOLD: K([3, 1], 1.47),
              CHARGE: K([3, 0], HALF, 0, 0, 0, 0, 1), CAST: K([1, 0], 1.27, 0, 0, -1, -1), HURT: K([1, 4], 0.2, 0, 0, -1, -1), KNEEL: K([4, 5], 1.2, 0, 0, 1, 1) },
    throw:  { IDLE: K([3, 5], 0.9, [-1, 5], 0, 0, 0, 0, 1), WIND: K([-2, -1], -0.4, [1, 4], 0, -1, 0, 0, 2), STRIKE: K([8, -1], 1.5, [-2, 4], 0, 1, 1), HOLD: K([7, 0], 1.6, [-2, 4], 0, 1),
              CHARGE: K([3, -5], 0.1, [2, 2], 0, -1, -1, 0, 3), CAST: K([8, -2], 1.3, [-3, 3], 0, 1, 1, 0, 3), HURT: K([2, 3], 0.3, [-3, 4], 0, -1, -1), KNEEL: K([3, 6], 1.2, [0, 7], 0, 1, 1) },
    holy:   { IDLE: K([4, 4], 0, [-1, 6]), WIND: K([4, 2], 0, [-1, 5]), STRIKE: K([7, 0], 0, [-2, 5], 0, 1), HOLD: K([7, 1], 0, [-1, 5], 0, 1),
              CHARGE: K([4, -3], 0, [2, 1], 0, -1, -1), CAST: K([6, -5], 0, [3, -2], 0, 0, -1), HURT: K([2, 3], 0, [-3, 4], 0, -1), KNEEL: K([4, 6], 0, [1, 6], 0, 1, 1) },
    dual:   { IDLE: K([4, 5], 1.25, [0, 6], -2.5), WIND: K([0, -1], -0.25, [3, 5], 2.6, -1, 0, 1), STRIKE: K([8, 3], 2.1, [10, 0], 1.0, 1, 1), HOLD: K([8, 4], 2.3, [9, 1], 1.2, 1),
              CHARGE: K([2, -2], -0.3, [-1, -1], -0.6, -1, 0, 1), CAST: K([9, 2], 1.6, [10, -2], 0.8, 1, 1, 1), HURT: K([1, 4], 0.4, [-3, 4], -2.2, -1), KNEEL: K([4, 7], 1.6, [0, 7], -2.5, 1, 1) },
  };

  // ───── 15 个变体：材质表 + 部件拼装（从后往前）+ 武器挂点。M = parts.mats 的结果（名字D = 暗一级，远侧腿 / 后臂用）─────
  const INK = { r: 'ink', flat: 1 }, GLOWW = { r: 'glow', flat: 1 };
  const CAST_LIST = [
    { name: '部件演示 · 骑士', body: { body: 'heroic', fall: 'front' }, cls: 'shield', melee: 1, el: 'holy', death: 'front', skill: 'pillar', idle: 'heft',
      mats: { plate: 'steel', tab: 'blue', gold: 'gold', cape: { r: 'blue', band: 2 }, plume: 'white', wood: 'wood', eye: { r: [5, 5, 5, 5], flat: 1 }, rune: { r: [20, 14, 51, 5], flat: 1 }, glow: { r: [51, 5, 21, 21], flat: 1 }, face: 'crimson' },
      weapon: (M) => ['sword', { style: 'long', hand: 'B', metal: M.plate, trim: M.gold, wood: M.wood, glow: M.glow, len: 11 }],
      glow: ['glow', 'rune'], skip: ['wood', 'eye', 'glow', 'rune'],
      draw(R, P, M, W) {
        parts.cape(E, R, P, { mat: M.cape, trim: M.gold });
        parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.plateD, pauldron: M.plateD, grip: 'none' });
        parts.legs(E, R, P, { style: 'greave', mat: M.plate, matD: M.plateD });
        parts.torso(E, R, P, { style: 'plate', mat: M.plate, tabard: M.tab, emblem: M.gold, emblemStyle: 'cross', belt: M.wood, buckle: M.gold });
        parts.helm(E, R, P, { style: 'great', mat: M.plate, trim: M.gold, eye: M.eye, crest: M.plume });
        if (R.lie) { parts.sword(E, R, P, Object.assign({}, W, { free: 1, at: [20 + P.hatX, -1 - P.hatY], a: HALF })); parts.shield(E, R, P, { style: 'kite', free: 1, at: [-20, -4], face: M.tab, rim: M.plate, emblem: M.gold, clip: 0 }); }
        else { parts.sword(E, R, P, W); parts.hand(E, R, P, { side: 'B', hand: M.plate, grip: 'big' }); }
        parts.arm(E, R, P, { sleeve: 'plate', mat: M.plate, pauldron: M.plate, trim: M.gold, hand: M.plate, grip: R.lie ? 'big' : 'none' });
        if (!R.lie) parts.shield(E, R, P, { style: 'kite', face: M.tab, rim: M.plate, emblem: M.gold });
      } },
    { name: '部件演示 · 冰法师', body: { body: 'tall', fall: 'back' }, cls: 'staff', melee: 0, el: 'frost', death: 'back', skill: 'bolt', idle: 'look',
      mats: { robe: { r: 'sky', band: 2 }, hat: 'sky', trim: 'white', skin: 'skin', beard: 'white', wood: 'wood', boot: 'boot', ink: INK, gem: { r: 'gem', flat: 1 }, glow: GLOWW, silver: 'pale' },
      weapon: (M) => ['staff', { style: 'orb', wood: M.wood, trim: M.silver, gem: M.gem, glow: M.glow, len: 14 }],
      glow: ['gem', 'glow'], skip: ['wood', 'gem', 'glow', 'skin', 'ink'],
      draw(R, P, M, W) {
        parts.arm(E, R, P, { side: 'B', sleeve: 'bell', mat: M.robeD, cuff: M.trimD, hand: M.skinD });
        parts.legs(E, R, P, { style: 'shoe', mat: M.boot, matD: M.bootD });
        parts.torso(E, R, P, { style: 'robe', mat: M.robe, trim: M.trim, belt: M.silver, buckle: M.trim, tassel: M.trim, collar: M.trim });
        parts.head(E, R, P, { mat: M.skin, face: 'long', age: 'old', eye: M.ink, brow: M.beard, browStyle: 2, nose: 'big', mouth: 'none' });
        parts.hair(E, R, P, { style: 'long', mat: M.beard, len: 3 });
        parts.beard(E, R, P, { style: 'long', mat: M.beard, len: 8 });
        if (R.lie) { parts.hat(E, R, P, { style: 'pointed', mat: M.hat, band: M.trim, badge: M.silver, at: [-15 + P.hatX, -P.hatY], rot: 0 }); parts.staff(E, R, P, Object.assign({}, W, { free: 1, at: [8, -1], a: HALF })); }
        else { parts.hat(E, R, P, { style: 'pointed', mat: M.hat, band: M.trim, badge: M.silver }); parts.staff(E, R, P, W); }
        parts.arm(E, R, P, { sleeve: 'bell', mat: M.robe, cuff: M.trim, hand: M.skin });
      } },
    { name: '部件演示 · 游侠', body: { body: 'slim' }, cls: 'bow', melee: 0, el: 'nature', death: 'kneel', skill: 'rain', idle: 'check',
      mats: { tunic: { r: 'green', band: 2 }, hair: 'sand', pants: 'leather', boot: 'wood', leather: 'wood', skin: 'skin', ink: INK, wood: 'wood', string: 'white', steel: 'steel', fletch: 'crimson', gold: 'gold' },
      weapon: (M) => ['bow', { wood: M.wood, string: M.string, arrow: M.wood, head: M.steel, fletch: M.fletch, len: 8 }],
      glow: [], skip: ['wood', 'skin', 'ink', 'string'],
      draw(R, P, M, W) {
        parts.pack(E, R, P, { style: 'quiver', mat: M.leather, trim: M.gold, fletch: M.fletch });
        parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.tunicD, grip: 'none' });
        parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD });
        parts.torso(E, R, P, { style: 'leather', mat: M.tunic, belt: M.leather, buckle: M.gold, strap: M.leather });
        parts.head(E, R, P, { mat: M.skin, face: 'gaunt', age: 'young', eye: M.ink, eyeStyle: 'narrow', brow: M.hair, nose: 'small', ear: 'pointy' });
        parts.hair(E, R, P, { style: 'ponytail', mat: M.hair, tie: M.leather, len: 7 });
        parts.arm(E, R, P, { sleeve: 'tight', mat: M.tunic, cuff: M.leather, cuffStyle: 'bracer', hand: M.skin });
        parts.bow(E, R, P, W);
        parts.hand(E, R, P, { side: 'B', hand: M.skin });
      } },
    { name: '部件演示 · 蛮族', body: { body: 'giant' }, cls: 'heavy', melee: 1, el: 'earth', death: 'parts', skill: 'quake', idle: 'shoulder', kf: { IDLE: K([3, 6], 0.45), HURT: K([1, 4], 0.1, 0, 0, -1, -1) },
      mats: { skin: 'skin', fur: 'sand', pants: 'leather', leather: 'wood', iron: 'iron', bone: 'bone', hair: 'fire', ink: INK, wood: 'wood', steel: 'steel', cloth: 'blood' },
      weapon: (M) => ['axe', { head: 'battle', wood: M.wood, metal: M.iron, edge: M.steel, glow: M.fur }],
      glow: [], skip: ['wood', 'ink'],
      draw(R, P, M, W) {
        parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, cuff: M.leatherD, cuffStyle: 'bracer', grip: 'none' });
        parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.fur, bootD: M.furD });
        parts.torso(E, R, P, { style: 'bare', mat: M.skin, belt: M.leather, buckle: M.iron, cloth: M.cloth });
        parts.mantle(E, R, P, { style: 'fur', mat: M.fur, len: 3 });
        parts.hair(E, R, P, { style: 'long', mat: M.hair, len: 4 });                                // 戴盔：头发画在 head 之前，只露出脑后的长发，脸上不压分界线
        parts.head(E, R, P, { mat: M.skin, face: 'square', age: 'rugged', eye: M.ink, browStyle: 2, brow: M.hair, nose: 'big' });
        parts.beard(E, R, P, { style: 'full', mat: M.hair });
        parts.helm(E, R, P, { style: 'horned', mat: M.iron, trim: M.iron, horn: M.bone, hornSize: 5 });
        parts.axe(E, R, P, W);
        parts.hand(E, R, P, { side: 'B', hand: M.skin, grip: 'big' });
        parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, cuff: M.leather, cuffStyle: 'bracer', hand: M.skin, grip: 'big' });
      } },
    { name: '部件演示 · 修女', body: { body: 'child', fall: 'back' }, cls: 'holy', melee: 0, el: 'water', death: 'back', skill: 'dome', idle: 'pray',
      mats: { habit: { r: 'stone', band: 2 }, linen: 'white', skin: 'skin', ink: INK, gold: 'gold', shoe: 'boot', cover: 'crimson', page: 'white', glow: GLOWW, pink: 'pink' },
      weapon: (M) => ['book', { cover: M.cover, page: M.page, trim: M.gold, glow: M.glow }],
      glow: ['glow'], skip: ['skin', 'ink', 'glow', 'page', 'linen'],
      draw(R, P, M, W) {
        parts.hood(E, R, P, { style: 'wimple', mat: M.habit, layer: 'back' });
        parts.arm(E, R, P, { side: 'B', sleeve: 'bell', mat: M.habitD, cuff: M.linenD, cuffStyle: 'lace', hand: M.skinD });
        parts.legs(E, R, P, { style: 'shoe', mat: M.shoe, matD: M.shoeD });
        parts.torso(E, R, P, { style: 'habit', mat: M.habit, collar: M.linen, emblem: M.gold, emblemStyle: 'cross', belt: M.linen, hem: -2 });   // 下摆提到 −2：走路时两只鞋在剪影里分得开
        parts.head(E, R, P, { mat: M.skin, face: 'round', age: 'young', eye: M.ink, blush: M.pink, nose: 'small', mouth: 'line', wimple: M.linen, ear: 'none' });
        parts.arm(E, R, P, { sleeve: 'bell', mat: M.habit, cuff: M.linen, cuffStyle: 'lace', hand: M.skin });
        if (R.lie) parts.book(E, R, P, Object.assign({}, W, { free: 1, at: [12 + P.hatX, -P.hatY], open: 0, rot: 1 }));
        else parts.book(E, R, P, W);
      } },
    { name: '部件演示 · 火枪手', body: { body: 'standard', fall: 'back' }, cls: 'gun', melee: 0, el: 'fire', death: 'back', skill: 'beam', idle: 'aim',
      mats: { coat: { r: 'blue', band: 2 }, cape: { r: 'crimson', band: 2 }, gold: 'gold', pants: 'sand', boot: 'boot', skin: 'skin', hair: 'wood', hat: 'stone', ink: INK, lace: 'white', wood: 'wood', iron: 'iron', leather: 'leather' },
      weapon: (M) => ['gun', { style: 'musket', wood: M.wood, metal: M.iron, trim: M.gold, len: 11 }],
      glow: [], skip: ['wood', 'skin', 'ink'],
      draw(R, P, M, W) {
        parts.cape(E, R, P, { mat: M.cape, len: 'short', flare: 3.5, trim: M.gold });
        parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.coatD, grip: 'none' });
        parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD });
        parts.torso(E, R, P, { style: 'coat', mat: M.coat, collar: M.gold, buttons: M.gold, belt: M.leather, buckle: M.gold });
        parts.head(E, R, P, { mat: M.skin, face: 'square', age: 'rugged', eye: M.ink, brow: M.hair, nose: 'hook', mouth: 'none' });
        parts.beard(E, R, P, { style: 'mustache', mat: M.hair });
        parts.hair(E, R, P, { style: 'short', mat: M.hair });
        if (R.lie) { parts.hat(E, R, P, { style: 'tricorn', mat: M.hat, band: M.gold, badge: M.lace, at: [-16 + P.hatX, -P.hatY] }); parts.gun(E, R, P, Object.assign({}, W, { free: 1, at: [6, -1], a: HALF })); }
        else { parts.hat(E, R, P, { style: 'tricorn', mat: M.hat, band: M.gold, badge: M.lace }); parts.gun(E, R, P, W); parts.hand(E, R, P, { side: 'B', hand: M.skin }); }
        parts.arm(E, R, P, { sleeve: 'loose', mat: M.coat, cuff: M.lace, cuffStyle: 'lace', hand: M.skin });
      } },
    { name: '部件演示 · 屠夫', body: { body: 'fat', fall: 'front' }, cls: 'blade', melee: 1, el: 'blood', death: 'front', skill: 'cleave', idle: 'wipe',
      mats: { skin: 'skin', apron: { r: 'leather', band: 2 }, strap: 'wood', stain: { r: 'blood', flat: 1 }, pants: 'stone', boot: 'boot', hair: 'wood', stub: 'skinDark', ink: INK, steel: 'steel', wood: 'wood', glow: { r: 'blood', flat: 1 } },
      weapon: (M) => ['cleaver', { wood: M.wood, metal: M.steel, trim: M.strap, glow: M.glow }],
      glow: ['glow'], skip: ['wood', 'ink', 'glow', 'stain'],
      draw(R, P, M, W) {
        parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, hand: M.skinD, grip: 'big' });
        parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD, bootH: 2 });
        parts.torso(E, R, P, { style: 'bare', mat: M.skin, belt: M.strap });
        parts.apron(E, R, P, { mat: M.apron, strap: M.strap, stain: M.stain });
        parts.head(E, R, P, { mat: M.skin, face: 'square', age: 'rugged', eye: M.ink, browStyle: 2, nose: 'big', mouth: 'wide', stubble: M.stub, bald: 1 });
        parts.hair(E, R, P, { style: 'fringe', mat: M.hair });
        if (R.lie) parts.cleaver(E, R, P, Object.assign({}, W, { free: 1, at: [22 + P.hatX, -2 - P.hatY], a: Math.PI })); else parts.cleaver(E, R, P, W);
        parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, hand: M.skin, grip: 'big' });
      } },
    { name: '部件演示 · 掘墓人', body: { body: 'hunched' }, cls: 'heavy', melee: 1, el: 'poison', death: 'melt', skill: 'grave', idle: 'tap', kf: { IDLE: K([4, -1], 2.75), HURT: K([2, 1], 2.5, 0, 0, -1, -1) },
      focus: (P) => { const R = parts.rig(P, { body: 'hunched' }), e = parts.edges(R, R.yWaist); return [e[1], R.yWaist + 5]; },
      mats: { vest: { r: 'leather', band: 2 }, shirt: 'bone', sack: 'boot', pants: 'shadow', boot: 'boot', skin: 'skinDark', hair: 'white', hat: 'stone', band: 'crimson', ink: INK, wood: 'wood', iron: 'iron', gold: 'gold', glass: { r: 'poison', flat: 1 }, glow: { r: [49, 50, 38, 21], flat: 1 } },
      weapon: (M) => ['shovel', { wood: M.wood, metal: M.iron, len: 12 }],
      glow: ['glass', 'glow'], skip: ['wood', 'ink', 'glass', 'glow'],
      draw(R, P, M, W) {
        parts.pack(E, R, P, { style: 'sack', mat: M.sack, trim: M.wood });
        parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.shirtD, grip: 'none' });
        parts.legs(E, R, P, { style: 'shoe', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD });
        parts.torso(E, R, P, { style: 'vest', mat: M.vest, shirt: M.shirt, buttons: M.gold, collar: M.shirt });
        parts.lantern(E, R, P, { at: [parts.edges(R, R.yWaist)[1], R.yWaist], metal: M.iron, glass: M.glass, glow: M.glow });
        parts.head(E, R, P, { mat: M.skin, face: 'gaunt', age: 'old', eye: M.ink, brow: M.hair, browStyle: 2, nose: 'hook' });
        parts.hair(E, R, P, { style: 'fringe', mat: M.hair });
        parts.hat(E, R, P, { style: 'top', mat: M.hat, band: M.band });
        parts.shovel(E, R, P, W);
        parts.hand(E, R, P, { side: 'B', hand: M.skin });
        parts.arm(E, R, P, { sleeve: 'loose', mat: M.shirt, hand: M.skin });
      } },
    { name: '部件演示 · 贵妇', body: { body: 'slim', waist: 1 }, cls: 'throw', melee: 0, el: 'coin', death: 'ash', skill: 'cards', idle: 'fan',
      mats: { dress: { r: 'pink', band: 2 }, lace: 'white', skin: 'skin', lips: 'crimson', hair: 'sand', gold: 'gold', gem: 'crimson', veil: { r: [0, 0, 8, 8], flat: 1 }, ink: INK, card: 'white', pip: 'crimson', lit: { r: [5, 5, 21, 21], flat: 1 }, shoe: 'crimson' },
      weapon: (M) => ['card', { n: 3, card: M.card, trim: M.gold, pip: M.pip, lit: M.lit }],
      glow: ['lit'], skip: ['skin', 'ink', 'veil', 'card', 'lit'],
      draw(R, P, M, W) {
        parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.dressD, cuff: M.laceD, cuffStyle: 'lace', hand: M.skinD });
        parts.legs(E, R, P, { style: 'shoe', mat: M.shoe, matD: M.shoeD });
        parts.torso(E, R, P, { style: 'dress', mat: M.dress, trim: M.lace, collar: M.lace, emblem: M.gold, emblemStyle: 'hourglass' });
        parts.hair(E, R, P, { style: 'bun', mat: M.hair, tie: M.gold });
        parts.head(E, R, P, { mat: M.skin, face: 'round', eye: M.ink, lips: M.lips, nose: 'none', veil: M.veil });
        parts.crown(E, R, P, { mat: M.gold, gem: M.gem });
        parts.card(E, R, P, Object.assign({}, W, { n: 1 + (P.pull || 0), spread: 0.3 }));
        parts.arm(E, R, P, { sleeve: 'tight', mat: M.dress, cuff: M.lace, cuffStyle: 'lace', hand: M.skin });
      } },
    { name: '部件演示 · 戟兵', body: { body: 'stocky', fall: 'front' }, cls: 'pole', melee: 1, el: 'steel', death: 'front', skill: 'sweep', idle: 'plant',
      mats: { tunic: { r: 'sand', band: 2 }, iron: 'iron', leather: 'leather', pants: 'crimson', boot: 'iron', skin: 'skin', hair: 'wood', ink: INK, wood: 'wood', steel: 'steel', face: 'crimson', gold: 'gold' },
      weapon: (M) => ['halberd', { wood: M.wood, metal: M.steel, trim: M.iron, len: 12, back: 9 }],
      glow: [], skip: ['wood', 'ink'],
      draw(R, P, M, W) {
        parts.pack(E, R, P, { style: 'shield', shape: 'round', emblemStyle: 'boss', face: M.face, rim: M.iron, emblem: M.gold });   // 背盾：倒地（前扑）时压扁成一条压在背上
        parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.tunicD, grip: 'none' });
        parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD });
        parts.torso(E, R, P, { style: 'leather', mat: M.tunic, studs: M.iron, belt: M.leather, buckle: M.iron });
        parts.head(E, R, P, { mat: M.skin, face: 'square', age: 'rugged', eye: M.ink, browStyle: 2, brow: M.hair, nose: 'big' });
        parts.beard(E, R, P, { style: 'goatee', mat: M.hair });
        parts.hair(E, R, P, { style: 'short', mat: M.hair });
        parts.helm(E, R, P, { style: 'kettle', mat: M.iron, trim: M.iron });
        if (R.lie) parts.halberd(E, R, P, Object.assign({}, W, { free: 1, at: [2 + P.hatX, -1], a: -HALF }));
        else { parts.halberd(E, R, P, W); parts.hand(E, R, P, { side: 'B', hand: M.leather }); }
        parts.arm(E, R, P, { sleeve: 'loose', mat: M.tunic, cuff: M.leather, cuffStyle: 'bracer', hand: M.leather });
      } },
    { name: '部件演示 · 刺客', body: { body: 'slim', leg: 11, torso: 7 }, cls: 'dual', melee: 1, el: 'shadow', death: 'burst', skill: 'shadow', idle: 'spin',
      mats: { cloth: { r: 'shadow', band: 2 }, hood: 'shadow', scarf: 'blood', pants: 'stone', boot: 'leather', leather: 'wood', skin: 'skin', ink: INK, steel: 'steel', iron: 'iron', edge: { r: [52, 42, 43, 21], flat: 1 } },
      weapon: (M) => ['dagger', { metal: M.steel, trim: M.iron, wood: M.leather, glow: M.edge, len: 6 }],
      glow: ['edge'], skip: ['steel', 'edge', 'ink'],
      draw(R, P, M, W) {
        parts.scarf(E, R, P, { mat: M.scarf, layer: 'tail' });
        parts.dagger(E, R, P, Object.assign({}, W, { hand: 'B', glowLv: P.gem >= 2 ? 1 : 0 }));
        parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.clothD, cuff: M.leatherD, cuffStyle: 'bracer', hand: M.skinD });
        parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD });
        parts.torso(E, R, P, { style: 'tunic', mat: M.cloth, belt: M.scarf, buckle: M.steel });
        parts.hood(E, R, P, { style: 'cowl', mat: M.hood, layer: 'back' });
        parts.head(E, R, P, { mat: M.skin, face: 'gaunt', eye: M.ink, eyeStyle: 'narrow', nose: 'small', mouth: 'none' });
        parts.hood(E, R, P, { style: 'cowl', mat: M.hood, layer: 'front' });
        parts.scarf(E, R, P, { mat: M.scarf, layer: 'wrap' });
        parts.dagger(E, R, P, W);
        parts.arm(E, R, P, { sleeve: 'tight', mat: M.cloth, cuff: M.leather, cuffStyle: 'bracer', hand: M.skin });
      } },
    { name: '部件演示 · 弩手', body: { body: 'standard', leg: 8, belly: 1, fall: 'front' }, cls: 'gun', melee: 0, el: 'bolt', death: 'front', skill: 'volley', idle: 'reload',
      mats: { tunic: { r: 'crimson', band: 2 }, box: 'wood', iron: 'iron', gold: 'gold', pants: 'blue', boot: 'wood', skin: 'skinDark', hair: 'white', ink: INK, wood: 'wood', steel: 'steel', string: 'white', leather: 'leather' },
      weapon: (M) => ['crossbow', { wood: M.wood, metal: M.iron, string: M.string, bolt: M.wood, head: M.steel }],
      glow: [], skip: ['wood', 'ink', 'string'],
      draw(R, P, M, W) {
        parts.pack(E, R, P, { style: 'box', mat: M.box, trim: M.iron });
        parts.arm(E, R, P, { side: 'B', sleeve: 'puff', mat: M.tunicD, grip: 'none' });
        parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD });
        parts.torso(E, R, P, { style: 'tunic', mat: M.tunic, studs: M.gold, belt: M.leather, buckle: M.gold, trim: M.gold });
        parts.pendant(E, R, P, { style: 'pouch', mat: M.leather, trim: M.gold });
        parts.head(E, R, P, { mat: M.skin, face: 'round', age: 'old', eye: M.ink, brow: M.hair, nose: 'big' });
        parts.beard(E, R, P, { style: 'full', mat: M.hair });
        parts.helm(E, R, P, R.lie ? { style: 'nasal', mat: M.steel, trim: M.gold, at: [-12 + P.hatX, -P.hatY - 2] } : { style: 'nasal', mat: M.steel, trim: M.gold });
        if (R.lie) parts.crossbow(E, R, P, Object.assign({}, W, { free: 1, at: [16 + P.hatX, -2], a: HALF }));
        else { parts.crossbow(E, R, P, W); parts.hand(E, R, P, { side: 'B', hand: M.skin }); }
        parts.arm(E, R, P, { sleeve: 'puff', mat: M.tunic, cuff: M.leather, cuffStyle: 'band', hand: M.skin });
      } },
    { name: '部件演示 · 灯商', body: { body: 'standard', belly: 2, fall: 'back' }, cls: 'shield', melee: 1, el: 'magic', death: 'back', skill: 'wave', idle: 'lamp',
      mats: { vest: { r: 'purple', band: 2 }, shirt: 'white', gold: 'gold', pants: 'sand', sandal: 'wood', skin: 'skinDark', hair: 'stone', turban: 'white', gem: 'crimson', plume: 'gold', ink: INK, steel: 'steel', glass: { r: 'gem', flat: 1 }, glow: GLOWW, leather: 'leather' },
      weapon: (M) => ['sword', { style: 'saber', hand: 'B', metal: M.steel, trim: M.gold, wood: M.leather, len: 9 }],
      kf: { IDLE: K([5, 2], 0, [8, 1], 0.5) },
      focus: (P) => parts.lantern.focus(P, {}),
      glow: ['glass', 'glow'], skip: ['glass', 'glow', 'ink', 'skin'],
      draw(R, P, M, W) {
        parts.arm(E, R, P, { side: 'B', sleeve: 'puff', mat: M.shirtD, cuff: M.goldD, grip: 'none' });
        parts.legs(E, R, P, { style: 'sandal', mat: M.skin, matD: M.skinD, boot: M.sandal, bootD: M.sandalD });
        parts.torso(E, R, P, { style: 'vest', mat: M.vest, shirt: M.shirt, buttons: M.gold, belt: M.gold, buckle: M.gem });
        parts.pendant(E, R, P, { style: 'keys', mat: M.gold, trim: M.gold });
        parts.head(E, R, P, { mat: M.skin, face: 'round', eye: M.ink, brow: M.hair, nose: 'hook', mouth: 'none' });
        parts.beard(E, R, P, { style: 'goatee', mat: M.hair });
        if (R.lie) parts.turban(E, R, P, { mat: M.turban, gem: M.gem, plume: M.plume, at: [-16 + P.hatX, -1 - P.hatY] }); else parts.turban(E, R, P, { mat: M.turban, gem: M.gem, plume: M.plume });
        if (R.lie) { parts.sword(E, R, P, Object.assign({}, W, { free: 1, at: [16 + P.hatX, -1], a: HALF })); parts.lantern(E, R, P, { free: 1, at: [22, -9], metal: M.gold, glass: M.glass, glow: M.glow }); }
        else { parts.sword(E, R, P, W); parts.hand(E, R, P, { side: 'B', hand: M.skin }); }
        parts.arm(E, R, P, { sleeve: 'puff', mat: M.shirt, cuff: M.gold, hand: M.skin });
        if (!R.lie) parts.lantern(E, R, P, { metal: M.gold, glass: M.glass, glow: M.glow });
      } },
    { name: '部件演示 · 铁匠', body: { body: 'stocky', leg: 7, sw: 6, belly: 0 }, cls: 'shield', melee: 1, el: 'fire', death: 'chunks', skill: 'forge', idle: 'heft', kf: { IDLE: K([4, 2], 0, [3, 1], -1.3), HURT: K([2, 1], 0, [2, 2], -1.6, -1, -1) },
      mats: { shirt: { r: 'bone', band: 2 }, apron: { r: 'boot', band: 2 }, skin: 'skin', hair: 'shadow', pants: 'stone', boot: 'wood', leather: 'leather', iron: 'iron', wood: 'wood', ink: INK, hot: { r: 'fire', flat: 1 }, stain: { r: [0, 8, 9, 10], flat: 1 } },
      weapon: (M) => ['hammer', { hand: 'B', head: 'hammer', wood: M.wood, metal: M.iron, trim: M.leather, glow: M.hot, len: 7, back: 3 }],
      glow: ['hot'], skip: ['wood', 'ink', 'hot'],
      draw(R, P, M, W) {
        parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, cuff: M.leatherD, cuffStyle: 'bracer', grip: 'none' });
        parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD, bootH: 3 });
        parts.torso(E, R, P, { style: 'tunic', mat: M.shirt, belt: M.leather, buckle: M.iron });
        parts.apron(E, R, P, { mat: M.apron, strap: M.leather, stain: M.stain, hem: -2 });
        parts.pendant(E, R, P, { style: 'tools', mat: M.iron, trim: M.wood, x: parts.edges(R, R.yWaist)[0] + 1 });
        parts.head(E, R, P, { mat: M.skin, face: 'square', age: 'rugged', eye: M.ink, brow: M.hair, browStyle: 2, nose: 'big' });
        parts.beard(E, R, P, { style: 'mustache', mat: M.hair });
        parts.hair(E, R, P, { style: 'spiky', mat: M.hair });
        if (R.lie) parts.hammer(E, R, P, Object.assign({}, W, { free: 1, at: [16 + P.hatX, -2], a: HALF }));
        else { parts.hammer(E, R, P, W); parts.hand(E, R, P, { side: 'B', hand: M.leather, grip: 'big' }); }
        parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, cuff: M.leather, cuffStyle: 'bracer', hand: M.leather, grip: 'none' });
        if (!R.lie) parts.shield(E, R, P, { style: 'buckler', face: M.iron, rim: M.wood, emblem: M.iron, emblemStyle: 'boss' });
      } },
    { name: '部件演示 · 朝圣枪兵', body: { body: 'tall', sw: 3, fall: 'front' }, cls: 'shield', melee: 1, el: 'soul', death: 'front', skill: 'lunge', idle: 'plant',
      kf: { IDLE: K([4, 2], 0, [8, 0], 0.1), WIND: K([3, 2], 0, [2, 1], HALF, -1, 0, 1), STRIKE: K([5, 2], 0, [12, 1], HALF, 1, 1), HOLD: K([5, 2], 0, [11, 1], HALF, 1),
            CHARGE: K([3, 2], 0, [6, -5], 0.3, -1, -1), CAST: K([5, 3], 0, [12, 2], 1.75, 1, 1, 1), HURT: K([2, 1], 0, [6, 1], -0.2, -1, -1), KNEEL: K([4, 5], 0, [8, 7], 1.2, 1, 1) },
      mats: { coat: { r: 'pale', band: 2 }, cape: { r: 'blood', band: 2 }, straw: 'sand', band: 'blood', skin: 'skin', hair: 'white', ink: INK, wood: 'wood', steel: 'steel', tassel: 'crimson', face: 'pale', rim: 'wood', gold: 'gold', sandal: 'leather', mantle: 'sand' },
      weapon: (M) => ['spear', { hand: 'B', style: 'leaf', wood: M.wood, metal: M.steel, trim: M.gold, tassel: M.tassel, len: 11, back: 9 }],
      glow: [], skip: ['wood', 'ink'],
      draw(R, P, M, W) {
        parts.cape(E, R, P, { style: 'tattered', mat: M.cape, flare: 5 });
        parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.coatD, grip: 'none' });
        parts.legs(E, R, P, { style: 'sandal', mat: M.skin, matD: M.skinD, boot: M.sandal, bootD: M.sandalD });
        parts.torso(E, R, P, { style: 'coat', mat: M.coat, belt: M.band, buckle: M.gold, strap: M.wood });
        parts.head(E, R, P, { mat: M.skin, face: 'long', age: 'old', eye: M.ink, brow: M.hair, nose: 'long', shade: 1 });
        parts.hair(E, R, P, { style: 'long', mat: M.hair, len: 3 });
        parts.mantle(E, R, P, { mat: M.mantle, len: 3 });
        if (R.lie) { parts.hat(E, R, P, { style: 'wide', mat: M.straw, band: M.band, at: [-11 + P.hatX, -P.hatY - 3], rot: 2 }); parts.spear(E, R, P, Object.assign({}, W, { free: 1, at: [4 + P.hatX, -1], a: HALF })); }
        else { parts.hat(E, R, P, { style: 'wide', mat: M.straw, band: M.band }); parts.spear(E, R, P, W); parts.hand(E, R, P, { side: 'B', hand: M.skin }); }
        parts.arm(E, R, P, { sleeve: 'loose', mat: M.coat, hand: M.skin, grip: 'none' });
        if (R.lie) parts.shield(E, R, P, { style: 'heater', free: 1, at: [-14, -3], rot: 1, face: M.face, rim: M.rim, emblem: M.band, emblemStyle: 'chevron' });
        else parts.shield(E, R, P, { style: 'heater', face: M.face, rim: M.rim, emblem: M.band, emblemStyle: 'chevron' });
      } },
  ];
  const V = Math.max(0, Math.floor(+new URLSearchParams(location.search).get('v') || 0)) % CAST_LIST.length, C = CAST_LIST[V], CL = Object.assign({}, CLS[C.cls], C.kf || {});
  const M = parts.mats(E, C.mats), WPN = C.weapon(M), W = WPN[1], WF = parts[WPN[0]].focus;
  const R_EL = FXI[C.el], EL = FXR[R_EL], HX = C.melee ? 76 : 34, DUR = DEFAULT_DUR.slice(), TWO = C.cls === 'heavy' || C.cls === 'pole' || C.cls === 'gun';
  const hero = new Sprite(72, 66, C.melee ? 28 : 36, 60);        // 近战往前留空间（前冲 + 挥砍），远程往后留空间（仰倒时头在左）；上方留到 −60、前方留到 +43（巨型体抡月牙大斧）
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of C.skip) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 关键帧换算成绝对坐标（按本变体的体型）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0, gem: 0, glint: 0, rim: 0,
    eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, pull: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const R0 = parts.rig({}, C.body), s = R0.arm / 9, KF = {};
  for (const n of Object.keys(CL)) { const k = CL[n]; KF[n] = { hx: R0.sFx + k.h[0] * s, hy: R0.sFy + k.h[1] * s, a: k.a, bhx: k.bh ? R0.sBx + k.bh[0] * s : 0, bhy: k.bh ? R0.sBy + k.bh[1] * s : 0, ba: k.ba, lean: k.lean, head: k.head, crouch: k.crouch, pull: k.pull }; }
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'ba', 'lean', 'head', 'crouch', 'pull'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['ba', -32, 32, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['pull', 0, 3], ['bx', -16, 15]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], T_STRIKE = 2 / 12, KIT = { parts: 1, chunks: 1, burst: 1, melt: 1, ash: 1 }[C.death] ? C.death : null, T_KIT = INCOMING + 0.3;
  const wrap = (a) => (a > Math.PI ? a - 2 * Math.PI : a < -Math.PI ? a + 2 * Math.PI : a);
  function personality(lp) {                                     // 待机个性：落在 1.6–2.0 s（每个变体一种）
    if (lp < 1.6 || lp >= 2.0) return; const f = Math.floor((lp - 1.6) * 12 + 1e-6);
    switch (C.idle) {
      case 'look': P.head = -1; P.beard = 1; P.glint = f === 2 ? 1 : 0; break;
      case 'heft': P.bhy -= [2, 3, 1, 0, 0][f]; P.ba -= [2, 3, 1, 0, 0][f] * 0.07; P.glint = f === 3 ? 1 : 0; break;
      case 'shoulder': P.hy -= [1, 2, 1, 0, 0][f]; P.a -= [1, 2, 1, 0, 0][f] * 0.1; break;
      case 'check': P.head = -1; P.pull = f < 3 ? 1 : 0; P.bhx = P.hx - 3; P.bhy = P.hy; break;
      case 'pray': P.head = 1; P.eyes = 1; P.hy -= 1; break;
      case 'aim': P.a = f < 4 ? HALF : P.a; P.hy -= f < 4 ? 2 : 0; break;
      case 'wipe': P.hx += [0, 1, 2, 1, 0][f]; P.a += 0.1 * [0, 1, 2, 1, 0][f]; P.glint = f === 2 ? 1 : 0; break;
      case 'tap': P.hy += [1, 0, 1, 0, 0][f]; break;
      case 'fan': P.pull = [2, 3, 3, 2, 1][f]; P.glint = f === 2 ? 1 : 0; break;
      case 'plant': P.hy += [1, 2, 0, 0, 0][f]; P.head = f < 3 ? -1 : 0; break;
      case 'spin': P.a = wrap(P.a + [HALF, Math.PI, -HALF, 0, 0][f]); P.glint = f === 3 ? 1 : 0; break;
      case 'reload': P.pull = f < 2 ? 0 : 1; P.head = f < 3 ? 1 : 0; break;
      case 'lamp': P.hy -= [1, 2, 2, 1, 0][f]; P.glint = f === 2 ? 1 : 0; P.gem = f >= 1 && f <= 3 ? 1 : 0; break;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 1; P.gem = 0; P.glint = 0; P.rim = C.glow.length ? 1 : 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => { setK(KF.IDLE, KF.IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; personality(tq % DUR[IDLE]); };
    const lunge = C.melee ? 5 : 0;
    if (st === IDLE) idle();
    else if (st === MOVE) {
      setK(KF.IDLE, KF.IDLE, 0); parts.gait(P, E.gait(tq)); const sw = P.step;
      P.hx += sw * 0.6 * s; P.a += sw * 0.08; P.bhx -= sw * 0.8 * s;
      const w = walkDemo(tq, 14, C.melee ? -1 : 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(KF.IDLE, KF.WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(KF.STRIKE, KF.STRIKE, 0); P.bx = lunge; P.gem = 2; P.rim = C.glow.length ? 2 : 0; P.beard = -2; P.sway = -1; P.bend = 3; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(KF.STRIKE, KF.HOLD, q); P.bx = RD(lunge * (1 - q * 0.2)); P.gem = 1; P.beard = -1; P.bend = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(KF.HOLD, KF.IDLE, q); P.bx = RD(lunge * 0.8 * (1 - q)); }
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); setK(KF.IDLE, KF.CHARGE, q);
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.bend = 1 + RD(q * 2); P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = C.glow.length ? 2 : 0;
    } else if (st === CAST) { setK(KF.CHARGE, KF.CAST, ease.out(clamp01(tq / 0.12))); P.bx = RD(lunge * 0.8); P.beard = -2; P.sway = -1; P.bend = 3; P.gem = 3; P.rim = C.glow.length ? 3 : 0; }
    else if (st === RECOVER) { const q = ease.inOut(clamp01(tq / 0.6)); setK(KF.CAST, KF.IDLE, q); P.bx = RD(lunge * 0.8 * (1 - q)); P.beard = -RD(1 - q); P.bend = 1 + RD(2 * (1 - q)); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = C.glow.length ? (q < 0.5 ? 2 : 1) : 0; }
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(KF.HURT, KF.HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(KF.HURT, KF.IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(KF.HURT, KF.IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = C.glow.length ? 1 : 0; }
      else if (d < 0.3 || (KIT && d < 0.3 + 1 / 12)) { setK(KF.HURT, KF.HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (KIT) { setK(KF.HURT, KF.HURT, 0); P.bx = -2; P.dq = 1; }
      else if (d < 0.5 || C.death === 'kneel') {
        setK(KF.KNEEL, KF.KNEEL, 0); P.bx = -2; P.crouch = 4; P.eyes = 1; P.beard = 1; P.head = C.death === 'kneel' ? 1 : P.head; P.lean = 1;
        if (C.death === 'kneel') { P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : 4; P.sway = d < 0.7 ? 1 : 0; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }
      } else {
        P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.beard = 0; P.sway = 0; P.bend = 0; P.crouch = 0; P.lean = 0; P.head = 0; P.pull = 0;
        P.hx = R0.sFx + 3; P.hy = R0.yWaist; P.a = HALF; P.bhx = R0.sBx; P.bhy = R0.yWaist + 2; P.ba = 0;
        const hq = clamp01((d - 0.66) / 0.25); P.hatX = RD(-5 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 4);
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.a = RD(P.a / ASTEP) * ASTEP; P.ba = RD(P.ba / ASTEP) * ASTEP; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.pull = RD(P.pull);
    if (TWO && !P.lying) {                                        // 双手武器：后手握在柄上
      const b = C.cls === 'gun' ? parts.along(P, W, 4) : parts.onShaft(P, W, C.cls === 'pole' ? -7 : -5); P.bhx = b[0]; P.bhy = b[1]; P.ba = P.a;
    }
    if (C.cls === 'bow' && P.pull) { const k = CL.WIND.bh; P.bhx = P.hx - (P.pull >= 3 ? 8 : 7); P.bhy = P.hy + (P.pull >= 3 ? 1 : 0); }
    const f = focusLocal(); P.gx = f[0] + P.bx; P.gy = f[1] - P.lift;
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }
  function focusLocal() {                                        // 发光体 / 武器尖的本地坐标（倒地时是掉在地上的武器）
    if (P.lying) return [C.melee ? 18 : 10, -2];
    if (C.focus) return C.focus(P, R0);
    if (C.cls === 'holy') return parts.book.focus(P, W);
    return WF(P, W);
  }

  // ───── 画 ─────
  function drawHero() { E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, C.body); C.draw(R, P, M, W); }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效：攻击（近战挥砍弧 / 远程弹道）、技能（蓄力汇聚 + 施放爆发 + 本变体的招牌积木）、死亡 ─────
  let smT = 9, mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy);
    releaseOrbit(45, 100, 0.35, 0.75); burst(gx, gy, 26, 60, 130, 0.3, 0.7, R_EL, 10); ring(gx, gy, 1, R_EL); shake(0.28, 2); flash(0.05);
    const dy = HY - 14;
    switch (C.skill) {
      case 'pillar': fx.pillar(DUMMY_X, 0, HY, 2, R_EL, 0.7, 2); fx.circle(DUMMY_X, HY + 1, 12, 3, R_EL, 1.0, 1, 0); hitDummy(1); dummyFx({ dur: 1.0, tint: C.el }); break;
      case 'bolt': shoot(2, gx + 2, gy, 130, DUMMY_X - 4, R_EL); break;
      case 'rain': for (let i = 0; i < 9; i++) fall(DUMMY_X - 12 + i * 3, -6 - i * 7, (i & 1) ? 6 : -6, 90, HY, R_EL, i % 3 === 0 ? 2 : 1); hitDummy(1); dummyFx({ dur: 1.1, slow: 0.4, tint: C.el }); break;
      case 'quake': fx.crack(gx, HY + 1, DUMMY_X - gx + 6, 1, R_EL, 0.9); fx.wave(gx, HY, 1, DUMMY_X - gx + 4, 6, R_EL, 0.6, 2); hitDummy(1); dummyFx({ dur: 1.0, sink: 2, stun: 1 }); shake(0.4, 2); break;
      case 'dome': fx.dome(HX + P.mx, HY, 13, 19, R_EL, 1.0, 2); fx.circle(HX + P.mx, HY + 1, 13, 3, R_EL, 1.1, -1, 0); fx.cross(gx, gy, 8, R_EL, 0.4); shoot(2, gx + 2, gy, 120, DUMMY_X - 4, R_EL); break;
      case 'beam': fx.beam(gx, gy, DUMMY_X + 2, gy, 2, R_EL, 0.35, 2); burst(DUMMY_X, gy, 24, 50, 120, 0.3, 0.6, R_EL, 20); hitDummy(1); dummyFx({ dur: 1.2, tint: C.el }); break;
      case 'cleave': fx.slash(wx(R0.sFx + P.bx), wy(R0.sFy), 17, -1.0, 2.6, R_EL, 0.3, 3, 2); burst(DUMMY_X - 2, dy, 28, 50, 120, 0.3, 0.6, R_EL, 10); hitDummy(1); dummyFx({ dur: 1.0, tint: C.el, slow: 0.5 }); break;
      case 'grave': fx.circle(DUMMY_X, HY + 1, 12, 3, R_EL, 1.1, 1, 0); for (let i = 0; i < 18; i++) spawn(K_RISE, DUMMY_X - 9 + Math.random() * 18, HY - Math.random() * 3, (Math.random() - 0.5) * 6, -18 - Math.random() * 20, 0.6 + Math.random() * 0.6, R_EL); hitDummy(1); dummyFx({ dur: 1.2, sink: 3, tint: C.el }); break;
      case 'cards': for (let i = 0; i < 3; i++) shoot(1, gx + 2, gy - 2 + i * 2, 150 + i * 15, DUMMY_X - 3, R_EL, (i - 1) * 12); fx.cross(gx, gy, 6, R_EL, 0.3); break;
      case 'sweep': fx.slash(wx(R0.sFx + P.bx), wy(R0.sFy), 21, -0.3, 3.0, R_EL, 0.3, 3, 2); hitDummy(1); dummyFx({ dur: 1.0, stun: 1 }); break;
      case 'shadow': fx.cloud(HX + P.mx + 4, HY - 10, 8, R_EL, 0.6, 1); fx.slash(DUMMY_X, dy, 10, -2.2, 0.9, R_EL, 0.25, 2, 2); fx.slash(DUMMY_X, dy, 10, 2.2, -0.9, R_EL, 0.25, 2, 2); hitDummy(1); dummyFx({ dur: 1.0, tint: 'curse' }); break;
      case 'wave': fx.wave(gx, HY, 1, DUMMY_X - gx + 6, 7, R_EL, 0.7, 1); fx.cross(gx, gy, 7, R_EL, 0.35); hitDummy(1); dummyFx({ dur: 1.0, tint: C.el, slow: 0.5 }); break;
      case 'forge': fx.crack(wx(P.gx), HY + 1, DUMMY_X - wx(P.gx) + 4, 1, R_EL, 0.8); burst(wx(P.gx), HY - 1, 30, 60, 140, 0.3, 0.7, R_EL, 40); hitDummy(1); dummyFx({ dur: 1.1, tint: C.el }); shake(0.35, 2); break;
      case 'lunge': fx.beam(wx(P.gx) - 10, gy, DUMMY_X + 6, gy, 1, R_EL, 0.3, 1); for (let i = 0; i < 12; i++) spawn(K_RISE, DUMMY_X - 6 + Math.random() * 12, HY - 4 - Math.random() * 20, (Math.random() - 0.5) * 8, -12 - Math.random() * 14, 0.6 + Math.random() * 0.5, R_EL); hitDummy(1); dummyFx({ dur: 1.0, tint: 'soul', stun: 1 }); break;
      case 'volley': for (let i = 0; i < 3; i++) shoot(1, gx + 1, gy, 170 - i * 20, DUMMY_X - 3, R_EL, (i - 1) * 8); mzT = 0; mzX = gx; mzY = gy; break;
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {
      const gx = wx(P.gx), gy = wy(P.gy);
      if (C.melee) { const r = Math.max(9, Math.hypot(P.gx - R0.sFx - P.bx, P.gy - R0.sFy)); fx.slash(wx(R0.sFx + P.bx), wy(R0.sFy + 1), r, -0.7, 2.3, R_EL, 0.17, 2, 2); hitDummy(0); burst(DUMMY_X - 3, HY - 14, 10, 40, 90, 0.15, 0.35, FXI.impact, 10); }
      else { shoot(1, gx + 2, gy, 170, DUMMY_X - 3, R_EL); mzT = 0; mzX = gx; mzY = gy; burst(gx, gy, 6, 30, 60, 0.15, 0.3, R_EL, 0); }
    }
    if (s === DEATH && KIT && t === T_KIT) {
      poseAt(DEATH, INCOMING + 0.25, INCOMING + 0.25); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start(KIT, { power: KIT === 'burst' ? 1.2 : 1, fadeAt: KIT === 'melt' ? 1.1 : 1.0, ramp: KIT === 'ash' ? R_EL : FXI.soul, chunk: 4 }); shake(0.15, 1);
    }
    if (s === DEATH && !KIT && C.death !== 'kneel' && t === INCOMING + 0.66) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 18 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [], [], [], KIT ? [T_KIT] : [INCOMING + 0.66], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 40, 90, 0.15, 0.35, R_EL, 10); hitDummy(0); }
    else if (k === 2) { burst(x, y, 36, 60, 150, 0.3, 0.7, R_EL, 16); ring(x, y, 1, R_EL); hitDummy(1); shake(0.12, 1); dummyFx({ dur: 1.2, tint: C.el, slow: 0.4 }); }
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) { chargeAcc += dt * (26 + 34 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); } }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0 && (C.body.body === 'giant' || C.body.body === 'fat' || C.body.body === 'stocky' || C.cls === 'heavy')) for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(P.step > 0 ? 4 : -3) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); lastStep = P.step; }
    if ((state === IDLE || state === RECOVER) && C.glow.length) { emberAcc += dt * (state === IDLE ? 2.2 : 7); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + RD(Math.random() * 2 - 1), gy - 1, Math.random() * 8 - 4, -7 - Math.random() * 8, 0.7 + Math.random() * 0.7, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 22, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    smT += dt; mzT += dt;
  }
  function fxReset() { smT = 9; mzT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (!P.lying && C.glow.length) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (C.glow.length && P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) { const L = P.gem === 3 ? 6 : 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
  }

  return {
    name: C.name, HX, R_EL, DUR, hero, P, GLOW_MATS: C.glow.map((k) => M[k]), HIT_POINT: [2, RD((R0.yS + R0.yHip) / 2)], EVENTS,
    deathKit: KIT ? { mode: KIT, at: T_KIT } : undefined,
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront,
  };
});
