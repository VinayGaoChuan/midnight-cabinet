// ==== mc-px16-fx.js ====
(function () {
// Skill effects in the same 16-bit language: every skill (unit traits, signature skills, the leaders' legion and
// personal skills) has a recipe = a charge pattern + a cast pattern + a palette ramp. Patterns are pooled pixel
// particles: spiral / heal / fire / frost / bolt / shield / summon / poison / blade / buff / shadow / beam / coin /
// nova / meteor. The recipe table doubles as the skill prompts (see tools/gen-prompts.js).
const M = window.MC, P16 = M.P16, ART = P16.ART;
const Pool = P16.Pool.prototype;
// particle motion for every kind: 1 burst (drag + gravity), 2 spiral in, 3 straight, 4 orbit, 5 falls with gravity
// and lands (rain, meteors), 6 drifts and slows (clouds, smoke), 7 landed and fading
Pool.step = function (dt) {
  const n = this.life.length;
  for (let i = 0; i < n; i++) {
    if (this.life[i] <= 0 || this.age[i] >= this.life[i]) continue; this.age[i] += dt; const k = this.kind[i];
    if (k === 1) { this.vx[i] *= Math.pow(0.04, dt); this.vy[i] = this.vy[i] * Math.pow(0.04, dt) + 380 * dt; this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt; }
    else if (k === 2 || k === 4) { const q = this.age[i] / this.life[i]; this.ang[i] += (k === 2 ? 7 : 4) * dt; const r = k === 2 ? this.rad[i] * (1 - q) : this.rad[i]; this.x[i] = this.tx[i] + Math.cos(this.ang[i]) * r; this.y[i] = this.ty[i] + Math.sin(this.ang[i]) * r * 0.7; }
    else if (k === 5) { this.vy[i] += 1100 * dt; this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt; if (this.y[i] >= this.ty[i]) { this.y[i] = this.ty[i]; this.kind[i] = 7; this.age[i] = Math.max(this.age[i], this.life[i] * 0.7); } }
    else if (k === 6) { this.vx[i] *= Math.pow(0.3, dt); this.vy[i] *= Math.pow(0.3, dt); this.x[i] += this.vx[i] * dt + Math.sin(this.age[i] * 6 + i) * 8 * dt; this.y[i] += this.vy[i] * dt - 10 * dt; }
    else if (k === 7) { /* landed */ }
    else { this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt; }
  }
};

// ───────── recipes ─────────
// pat: charge pattern / cast pattern; ramp: palette. d: what it looks like (used in the skill prompts)
const R = (ch, cs, ramp, d) => ({ ch, cs, ramp, d });
const FX = {
  // unit traits that cast (mana skills) and notable passives
  ChainHeal: R('heal', 'heal', 'green', '翠绿十字光点从脚下升起，满蓄后化作一道治疗链跳向伤得最重的友军'),
  TreatmentChain: R('heal', 'shield', 'toxic', '大地之灵的绿色护盾在目标身上合拢'),
  ChargeAttackNew: R('spiral', 'nova', 'orange', '蹄下扬起橙色尘土，冲撞落地时一圈冲击波'),
  JuniorFisherman: R('spiral', 'beam', 'sea', '海蓝水珠向鱼线汇聚，甩出一道水光'),
  CommercialFisherman: R('spiral', 'beam', 'sea', '同初级渔夫，水光更粗'),
  EliteFisherman: R('buff', 'buff', 'sea', '海水涌起的喷泉包住自身'),
  Ambush: R('shadow', 'blade', 'shadow', '身影化为暗丝消失，在目标头顶落下一记影刃'),
  ShellShock: R('fire', 'meteor', 'orange', '炮口冒出火星，炮弹从天而降炸开'),
  ResonanceAura: R('heal', 'nova', 'holy', '金色光环向外扩散'),
  InvigorateSuper: R('fire', 'buff', 'fire', '火星从脚下升起，喷泉般的火焰鼓舞全身'),
  BurstAttack: R('spiral', 'nova', 'frost', '冰晶爆点'),
  Echostrike: R('spiral', 'nova', 'arcane', '紫色回声环'),
  Eggsplosion: R('spiral', 'nova', 'frost', '蛋壳炸裂，蓝色碎片四散'),
  Hydralings: R('summon', 'summon', 'holy', '金色法阵中升起魔像'),
  MindWarp: R('shadow', 'shadow', 'arcane', '紫色暗丝卷入法杖，再扭曲着爆开'),
  FlamingArrows: R('fire', 'beam', 'fire', '箭头燃起，火线射出'),
  HoundSummoning: R('summon', 'summon', 'iron', '地面浮现灰色法阵，灰狼从光柱里跃出'),
  Hellhound: R('summon', 'summon', 'fire', '血红法阵，地狱犬从火柱里跃出'),
  Leech: R('shadow', 'heal', 'blood', '血色细丝回流到身上'),
  Cannibalism: R('shadow', 'heal', 'blood', '更浓的血色回流'),
  SkullStew: R('poison', 'heal', 'toxic', '锅里冒泡，绿色回复光点飘向友军'),
  Dragon: R('summon', 'summon', 'arcane', '紫色法阵升起复仇之龙'),
  Necromancy: R('shadow', 'shadow', 'teal', '青色亡魂卷入'),
  Thanatos: R('summon', 'summon', 'teal', '青色法阵升起骨龙'),
  ManaBlessing: R('heal', 'buff', 'holy', '金色喷泉'),
  Blessing: R('heal', 'buff', 'holy', '金色喷泉'),
  ManaMiracle: R('heal', 'buff', 'holy', '更大的金色喷泉'),
  Multishot: R('spiral', 'beam', 'holy', '三道金色箭光'),
  ParticleWave: R('spiral', 'beam', 'holy', '白金粒子波'),
  SolarFlare: R('fire', 'buff', 'holy', '太阳耀斑喷泉'),
  PurificationBeam: R('spiral', 'beam', 'holy', '白金净化光束'),
  SolarFlareSuper: R('fire', 'buff', 'holy', '更炽烈的太阳耀斑'),
  Aegis: R('shield', 'shield', 'holy', '金色护盾罩'),
  FinalJudgment: R('spiral', 'meteor', 'arcane', '紫金审判之剑从天坠落'),
  Fragrance: R('poison', 'poison', 'toxic', '清香的绿雾'),
  NoxiousScent: R('poison', 'poison', 'toxic', '浓绿毒雾'),
  WaterBounce: R('spiral', 'beam', 'sea', '水弹弹射'),
  Combustion: R('fire', 'nova', 'fire', '燃烧爆点'),
  LightningStrike: R('bolt', 'bolt', 'frost', '电弧在龙角间噼啪作响，闪电锁链甩出'),
  WaterSpoutNew: R('spiral', 'beam', 'frost', '蓝色法力爆裂光束'),
  Asteroid: R('spiral', 'meteor', 'fire', '小行星从天而降'),
  MoltenShield: R('fire', 'shield', 'fire', '熔岩护盾合拢'),
  PrismaticShield: R('shield', 'shield', 'arcane', '棱光护盾合拢'),
  EnergySurge: R('bolt', 'beam', 'teal', '青色能量涌动光束'),
  Sputtering: R('fire', 'nova', 'fire', '火焰占卜的溅射火圈'),
  MachineGunner: R('spiral', 'beam', 'orange', '机枪火线'),
  Bombardier: R('spiral', 'meteor', 'orange', '炸弹从空中落下'),
  ExplosiveShells: R('fire', 'nova', 'fire', '炮弹爆炸火圈'),
  SpiritOffering: R('shadow', 'buff', 'arcane', '灵魂献祭的紫色喷泉'),
  DimensionalRift: R('summon', 'summon', 'arcane', '紫色次元裂隙法阵'),
  DimensionalChasm: R('summon', 'summon', 'fire', '血红次元裂隙法阵'),
  RazorLeaf: R('spiral', 'blade', 'green', '飞叶从上方旋落'),
  SlimePropagation: R('poison', 'summon', 'toxic', '史莱姆从绿泡里冒出'),
  LifeExchange: R('heal', 'heal', 'green', '生命交换的绿色光点'),
  SoulTransfer: R('heal', 'heal', 'frost', '灵魂转移的蓝色光点'),
  IronHail: R('spiral', 'blade', 'steel', '铁雹从天而降'),
  SwordRain: R('spiral', 'blade', 'steel', '剑雨从天而降'),
  BladeStorm: R('spiral', 'blade', 'fire', '燃着的剑刃风暴'),
  ForbiddenFruit: R('heal', 'buff', 'pink', '禁果的粉色喷泉'),
  SummonCrabling: R('summon', 'summon', 'sea', '海蓝法阵里爬出小螃蟹'),
  SummonPincer: R('summon', 'summon', 'sea', '海蓝法阵里伸出蟹钳'),
  GigaBoomstick: R('fire', 'beam', 'orange', '巨型爆能光束'),
  RapidFire: R('spiral', 'buff', 'orange', '急速射击的火星喷泉'),
  BloodRush: R('shadow', 'buff', 'blood', '嗜血红雾'),
  SummonFroggo: R('summon', 'summon', 'toxic', '绿色法阵里跳出蛙人'),
  RaiseImp: R('summon', 'summon', 'fire', '火红法阵里跳出小鬼'),
  // signature skills
  // leaders: legion skills (cast from the sidelines) and personal skills (on the field)
  'L:watchman': R('spiral', 'nova', 'holy', '灯笼光芒暴涨，所有敌人被照得停顿'),
  'L:widow': R('spiral', 'coin', 'gold', '梭哈：金币从天上倾泻'),
  'L:nun': R('heal', 'heal', 'holy', '圣咏：白羽与金色光点落在全队身上'),
  'L:butcherlord': R('shadow', 'nova', 'blood', '血祭：血雾炸开'),
  'L:clockmaker': R('spiral', 'shield', 'teal', '倒带：青色表盘光环'),
  'L:cremator': R('fire', 'fire', 'fire', '火葬：所有敌人脚下起火'),
  'P:watchman': R('spiral', 'nova', 'holy', '灯盾猛击：金色冲击波'),
  'P:widow': R('spiral', 'beam', 'gold', '致命一掷：金色牌光'),
  'P:nun': R('heal', 'heal', 'holy', '圣光祷言：全队光点'),
  'P:butcherlord': R('shadow', 'nova', 'blood', '剁骨旋风：血色环斩'),
  'P:clockmaker': R('spiral', 'shield', 'teal', '停摆：青色表盘'),
  'P:cremator': R('fire', 'fire', 'fire', '焚身：火浪'),
};
P16.FX = FX;
P16.fxFor = function (e) {
  const t = (e.traits || []).find(x => FX[(x.cls || '').replace(/^Summon|Trait$/g, '')]); if (t) return FX[t.cls.replace(/^Summon|Trait$/g, '')];
  return null;
};

// ───────── patterns ─────────
const rnd = Math.random;
const target = (b, e) => { const t = e.target && e.target.alive ? e.target : null; const fl = e.side === 'E' ? -1 : 1; return t ? [t.x, t.y - 40 * (t.sz || 1)] : [e.x + 320 * fl, e.y - 40]; };
const PAT = {
  spiral(P, e, x, y, ramp, n, dur) { for (let i = 0; i < n; i++) P.add(2, x, y, 0, 0, dur * (0.6 + rnd() * 0.4), ramp, { tx: x, ty: y, ang: rnd() * 7, rad: 60 + rnd() * 70 }); },
  heal(P, e, x, y, ramp, n, dur) { for (let i = 0; i < n; i++) { const px = e.x + (rnd() - 0.5) * 90, py = e.y - rnd() * 20, v = -60 - rnd() * 80, L = dur * (0.7 + rnd() * 0.5); [[0, 0], [ART, 0], [-ART, 0], [0, ART], [0, -ART]].forEach(([a, c]) => P.add(3, px + a, py + c, 0, v, L, ramp)); } },
  fire(P, e, x, y, ramp, n, dur) { for (let i = 0; i < n * 1.5; i++) P.add(3, e.x + (rnd() - 0.5) * 70, e.y - rnd() * 12, (rnd() - 0.5) * 20, -90 - rnd() * 140, dur * (0.4 + rnd() * 0.5), ramp, { sz: rnd() < 0.3 ? 2 : 1 }); },
  frost(P, e, x, y, ramp, n, dur) { for (let i = 0; i < n; i++) P.add(4, x, y, 0, 0, dur, ramp, { tx: x, ty: y, ang: i / n * 7, rad: 34 + (i % 3) * 10, sz: 2 }); },
  bolt(P, e, x, y, ramp, n, dur, b) { const [tx, ty] = target(b, e); for (let s = 0; s < 2; s++) { let px = x, py = y; for (let i = 1; i <= 10; i++) { const q = i / 10, nx = x + (tx - x) * q + (rnd() - 0.5) * 50, ny = y + (ty - y) * q + (rnd() - 0.5) * 50; for (let k = 0; k < 4; k++) P.add(3, px + (nx - px) * k / 4, py + (ny - py) * k / 4, 0, 0, 0.18 + s * 0.08, ramp); px = nx; py = ny; } } },
  shield(P, e, x, y, ramp, n, dur) { for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2; P.add(3, e.x + Math.cos(a) * 70, e.y - 40 + Math.sin(a) * 55, -Math.cos(a) * 40, -Math.sin(a) * 40, dur, ramp); } },
  summon(P, e, x, y, ramp, n, dur) { for (let i = 0; i < n * 2; i++) P.add(4, e.x, e.y - 4, 0, 0, dur, ramp, { tx: e.x, ty: e.y - 4, ang: i / (n * 2) * 7, rad: 58 }); for (let i = 0; i < n; i++) P.add(3, e.x + (rnd() - 0.5) * 60, e.y, 0, -160 - rnd() * 220, dur * 0.8, ramp, { sz: rnd() < 0.3 ? 2 : 1 }); },
  poison(P, e, x, y, ramp, n, dur) { for (let i = 0; i < n * 1.5; i++) P.add(6, e.x + (rnd() - 0.5) * 120, e.y - 20 - rnd() * 60, (rnd() - 0.5) * 60, -20 - rnd() * 30, dur * (0.8 + rnd() * 0.6), ramp, { sz: rnd() < 0.5 ? 2 : 1 }); },
  blade(P, e, x, y, ramp, n, dur, b) { const [tx, ty] = target(b, e); for (let i = 0; i < n * 1.5; i++) { const gx = tx + (rnd() - 0.5) * 180, gy = ty + 40 + (rnd() - 0.5) * 40; P.add(5, gx - 30, gy - 360 - rnd() * 200, 60, 200, 0.9 + rnd() * 0.3, ramp, { ty: gy, sz: 2 }); } },
  buff(P, e, x, y, ramp, n, dur) { for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 1.2, v = 280 + rnd() * 260; P.add(1, e.x, e.y - 30, Math.cos(a) * v, Math.sin(a) * v, 0.6 + rnd() * 0.4, ramp); } PAT.shield(P, e, x, y, ramp, n / 2, 0.4); },
  shadow(P, e, x, y, ramp, n, dur) { for (let i = 0; i < n; i++) { P.add(2, x, y, 0, 0, dur * (0.6 + rnd() * 0.4), 'shadow', { tx: x, ty: y, ang: rnd() * 7, rad: 80 + rnd() * 80, sz: 2 }); P.add(2, x, y, 0, 0, dur * (0.5 + rnd() * 0.4), ramp, { tx: x, ty: y, ang: rnd() * 7, rad: 50 + rnd() * 60 }); } },
  beam(P, e, x, y, ramp, n, dur, b) { const [tx, ty] = target(b, e), d = Math.hypot(tx - x, ty - y) || 1, steps = Math.max(8, Math.round(d / 14)); for (let i = 0; i < steps; i++) { const q = i / steps; P.add(3, x + (tx - x) * q, y + (ty - y) * q, (tx - x) / d * 40, (ty - y) / d * 40, 0.16 + q * 0.2, ramp, { sz: 2 }); } for (let i = 0; i < 8; i++) { const a = rnd() * 7, v = 120 + rnd() * 160; P.add(1, tx, ty, Math.cos(a) * v, Math.sin(a) * v, 0.35, ramp); } },
  coin(P, e, x, y, ramp, n, dur) { for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2, v = 260 + rnd() * 300; P.add(1, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.8 + rnd() * 0.4, 'gold', { sz: 2 }); } },
  nova(P, e, x, y, ramp, n, dur) { for (let i = 0; i < n * 3; i++) { const a = i / (n * 3) * Math.PI * 2, v = 360 + (i % 2) * 80; P.add(3, e.x, e.y - 30, Math.cos(a) * v, Math.sin(a) * v * 0.55, 0.32, ramp, { sz: i % 3 ? 1 : 2 }); } },
  meteor(P, e, x, y, ramp, n, dur, b) { const [tx, ty] = target(b, e); for (let i = 0; i < 3; i++) P.add(5, tx - 120 - i * 10, ty - 520 - i * 30, 260, 300, 1.1, ramp, { ty: ty + 30, sz: 3 - i }); for (let i = 0; i < n; i++) { const a = rnd() * 7, v = 200 + rnd() * 300; P.add(1, tx, ty, Math.cos(a) * v, Math.sin(a) * v - 200, 0.5 + rnd() * 0.3, ramp, { sz: rnd() < 0.3 ? 2 : 1 }); } },
};
P16.PAT = PAT;
P16.castFx = function (b, e, phase, rec, tier, dur) {
  const P = b.p16 || (b.p16 = new P16.Pool()), [x, y] = P16.focusOf(e), n = 10 + (tier || 0) * 6, pat = PAT[phase === 'charge' ? rec.ch : rec.cs] || PAT.spiral;
  pat(P, e, x, y, rec.ramp, n, dur || 0.6, b);
};

// ───────── hook the casts: recipes replace the generic spiral / burst of mc-px16-game.js ─────────
if (!M.Battle3) return;
const BP = M.Battle3.prototype, B2P = M.Battle2.prototype;
const oBegin = BP.beginCast;
BP.beginCast = function (e, o) {
  const rec = P16.fxFor(e); if (!rec) return oBegin.apply(this, arguments);
  // run the base cast (and skip the generic sparks): mark so the generic hook knows a recipe will draw
  e._fxRec = rec; const r = oBegin.apply(this, arguments);
  if (e.casting) P16.castFx(this, e, 'charge', rec, e.casting.sp ? e.casting.sp.tier : 0, Math.max(0.3, e.casting.until - e.casting.t0));
  return r;
};
const oFire = BP.fireCast;
BP.fireCast = function (e) {
  const rec = e._fxRec || P16.fxFor(e), tier = e.casting && e.casting.sp ? e.casting.sp.tier : 0; const r = oFire.apply(this, arguments);
  if (rec) P16.castFx(this, e, 'cast', rec, tier, 0.6);
  e._fxRec = null; return r;
};
// leaders: the legion skill from the sidelines, the personal skill on the field
const oCast = B2P.castSkill;
B2P.castSkill = function (free) {
  const ok = oCast.apply(this, arguments); if (ok && this.hero && this.run) { const rec = FX['L:' + this.run.hero.cls]; if (rec && this instanceof M.Battle3) { const h = this.hero; if (!h._fr) h._magic = rec.ramp; P16.castFx(this, h, 'charge', rec, 2, 0.45); this.later(0.45, () => { if (!this.over) P16.castFx(this, h, 'cast', rec, 2, 0.6); }); } }
  return ok;
};
if (BP.psCast) { const oPs = BP.psCast; BP.psCast = function () { const r = oPs.apply(this, arguments); const rec = this.run && FX['P:' + this.run.hero.cls]; if (rec) P16.castFx(this, this.hero, 'cast', rec, 2, 0.6); return r; }; }
})();

;
