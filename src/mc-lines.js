// ==== mc-lines.js ====
(function () {
// Evolution lines (user ruling 2026-09-26: 「我以为3合1，合成更强的该系的角色，例如3个射手，合成后，是这个射手的进化型，不但还是
// 射手，而且特性也是在原有基础上的加强，甚至增加……每个职业的基础单位做3种就行了（机制要丰富，可以参考原部队的机制库）。进化：普通
// （白色）到稀有（蓝色），稀有到史诗（紫色），史诗到传说（金色），每一串4种单位，3次进化」).
// · 11 vocations × 3 lines × 6 tiers (普通 → 传说, and 神话 past it) = 198 units; these are the only units the shops sell. A line keeps its vocation, its
//   look (the base character's art, bigger every tier) and its skill: every tier strengthens the skill's numbers, the rare
//   tier adds a second skill and the legendary tier a third.
// · Price: common as set, then ×3.3 a tier, so three of a tier are worth a little less than the next one (the 10% extra
//   the old evolution paid); power = price as for every unit (mc-voc.js split, mc-power.js check).
// · Skills are the old units' mechanics (their handlers, keyed by cls): a tier's skill is a copy of an old trait with its
//   numbers replaced in order (the handler reads them in that order), or with a text of its own (a summon that changes kind).
// The old shop units stay in the DB (FEVER helpers, old saves), but no shop sells them.
const M = window.MC, DB = M.DB, TDB = M.TDB;
const nums = (s) => [...String(s).matchAll(/\d+(?:\.\d+)?/g)].map(m => +m[0]);
// a copy of trait `base` with its numbers replaced in order (or a whole new text)
let tn = 0;
function tr(base, vals, text) {
  const B = TDB[base]; if (!B) return null;
  let i = 0; const d = text || (vals ? B.d.replace(/\d+(?:\.\d+)?/g, (m) => (i < vals.length && vals[i] != null ? String(vals[i++]) : (i++, m))) : B.d);
  const k = base + '__L' + (++tn);
  TDB[k] = Object.assign({}, B, { d, v: nums(d), base });
  return k;
}
// one line: [vocation, art, cost, names ×4, skills] — a skill is [trait, values for tiers 1–4 (null: not yet)] or
// [trait, per-tier {k, v, d}] when the trait itself changes on the way
const S = (k, a, b, c, d) => [k, [a, b, c, d]];
const LINES = M.LINES = [
  // 先锋
  ['先锋', 'FootSoldier', 40, ['步卒', '盾兵', '铁壁卫士', '不破城壁'], [S('SummonStoneskinTrait', [20], [25], [30], [38]), S('SummonRangedDamageReductionTrait', null, [15], [20], [25]), S('SummonThornsTrait', null, null, null, [0.2, 15])]],
  ['先锋', 'VoodooBeliever', 35, ['巫毒信徒', '巫毒守卫', '巫毒祭主', '巫毒之王'], [S('SummonAnaphylaxisTrait', [600], [800], [1000], [1400]), S('SummonBoneRegenerationTrait', null, [2], [3], [4]), S('SummonSpeedBoostTrait', null, null, null, [1.5, 50])]],
  ['先锋', 'BigWildBoar', 45, ['小野猪', '獠牙野猪', '巨型野猪', '赤瞳猪王'], [S('SummonChargeAttackNewTrait', [2], [2.6], [3.3], [4.2]), S('SummonBarbsTrait', null, [0.4, 10], [0.5, 12], [0.6, 15]), S('SummonNimbleFeetTrait', null, null, null, [25])]],
  // 守护者
  ['守护者', 'YellowManeHorse', 40, ['黄鬃马', '战马', '汗血宝马', '天马'], [S('SummonThickHideTrait', [5], [7], [9], [12]), S('SummonBoneRegenerationTrait', null, [2], [3], [4]), S('SummonResonanceAuraTrait', null, null, null, [2.75, 10])]],
  ['守护者', 'BloodKnight', 45, ['血仆', '血骑士', '猩红骑士长', '血月领主'], [S('SummonLeechTrait', [10], [15], [20], [26]), S('SummonThickHideTrait', null, [4], [6], [8]), S('SummonSpeedBoostTrait', null, null, null, [1.5, 50])]],
  ['守护者', 'CursedSwordsman', 45, ['咒刃学徒', '诅咒剑士', '冥誓剑圣', '永咒剑魔'], [S('SummonIronHailTrait', [14, 60, 2, 2, 5, 10], [14, 80, 2, 3, 5, 10], [15, 100, 2, 4, 5, 10], [16, 125, 2, 6, 5, 10]), S('SummonThickHideTrait', null, [4], [6], [8]), S('SummonResonanceAuraTrait', null, null, null, [2.75, 10])]],
  // 战士
  ['战士', 'SlaveLord', 40, ['打手', '奴隶主', '角斗场主', '血斗之王'], [S('SummonUnchainedRageTrait', [50, 80], [50, 100], [55, 130], [60, 170]), S('SummonBoneRegenerationTrait', null, [2], [3], [4]), S('SummonDuelistTrait', null, null, null, [20, 20])]],
  ['战士', 'Berserker', 45, ['蛮兵', '狂战士', '狂暴战将', '战神化身'], [S('SummonTribalWarfareTrait', [1], [1], [2], [3]), S('SummonUnchainedRageTrait', null, [50, 50], [50, 70], [50, 100]), S('SummonDuelistTrait', null, null, null, [25, 20])]],
  ['战士', 'Skybot', 50, ['巡逻机器人', '战斗机器人', '天空机器人', '天穹战甲'], [S('SummonSputteringTrait', [35], [45], [60], [80]), S('SummonEMPTrait', null, [1, 3, 15], [1.5, 3, 15], [2, 3, 20]), S('SummonTribalWarfareTrait', null, null, null, [1])]],
  // 圣骑士
  ['圣骑士', 'HolyLightKnight', 45, ['见习骑士', '圣光骑士', '圣殿骑士', '光明圣者'], [S('SummonCellRegrowthSuperTrait', [60, 1], [65, 1.4], [70, 1.9], [75, 2.5]), S('SummonDevotionTrait', null, [3], [4], [5]), S('SummonResonanceAuraTrait', null, null, null, [2.75, 10])]],
  ['圣骑士', 'LifeTree', 45, ['生命之苗', '生命树', '古老生命树', '世界之树'], [S('SummonDevotionTrait', [4], [5.5], [7], [9]), S('SummonBoneRegenerationTrait', null, [2], [3], [4]), S('SummonResonanceAuraTrait', null, null, null, [3.5, 12])]],
  ['圣骑士', 'LionHammer', 45, ['锤卫', '狮锤', '金鬃狮锤', '狮王圣锤'], [S('SummonCannibalismTrait', [10], [15], [20], [28]), S('SummonSkullStewTrait', null, [13, 1, 8], [14, 1, 12], [15, 2, 15]), S('SummonSpeedBoostTrait', null, null, null, [1.5, 50])]],
  // 射手
  ['射手', 'Ranger', 35, ['游侠', '猎手', '神射手', '风暴游侠'], [S('SummonAccuracyTrait', [26], [34], [42], [52]), S('SummonWaterBounceTrait', null, [1], [1], [2]), S('SummonMultishotTrait', null, null, null, [2, 100])]],
  ['射手', 'Archer', 40, ['骸骨弓手', '骸骨射手', '骸骨神射', '死亡弓王'], [S('SummonFlamingArrowsTrait', [0.5, 120], [0.5, 150], [0.5, 190], [0.5, 240]), S('SummonBoneRegenerationTrait', null, [2], [3], [4]), S('SummonExplosiveShellsTrait', null, null, null, [80])]],
  ['射手', 'Bat', 40, ['蝙蝠枪手', '机枪蝠', '重炮蝠', '暴风炮蝠'], [S('SummonMachineGunnerTrait', [0.5, 1, 40], [0.5, 1, 50], [0.4, 1, 60], [0.3, 1, 70]), S('SummonAcrobaticsSuperTrait', null, [2, 3.4, 5], [2.5, 3.4, 5], [3, 3.4, 6]), S('SummonExplosiveShellsTrait', null, null, null, [80])]],
  // 刺客
  ['刺客', 'BlackSword', 40, ['黑剑', '暗刃', '夜刃', '影王之刃'], [S('SummonWolfPackTrait', [5, 3, 12], [6, 3, 12], [8, 3, 12], [10, 3, 15]), S('SummonNimbleFeetTrait', null, [15], [20], [25]), S('SummonAmbushTrait', null, null, null, [800])]],
  ['刺客', 'WaterWarrior', 45, ['水战士', '潮刃刺客', '深渊刺客', '海渊之影'], [S('SummonAmbushTrait', [600], [800], [1000], [1400]), S('SummonNimbleFeetTrait', null, [15], [20], [25]), S('SummonWolfPackTrait', null, null, null, [8, 3, 12])]],
  ['刺客', 'Gladiator', 45, ['角斗学徒', '角斗士', '冠军角斗士', '不败角斗王'], [S('SummonDuelistTrait', [15, 20], [20, 20], [25, 20], [32, 25]), S('SummonWolfPackTrait', null, [3, 3, 12], [4, 3, 12], [5, 3, 15]), S('SummonNimbleFeetTrait', null, null, null, [25])]],
  // 召唤师
  ['召唤师', 'Summoner', 45, ['驯兽师', '召唤师', '兽王', '百兽之主'], [['SummonHoundSummoningTrait', [{ v: [5, 40] }, { v: [6, 40] }, { k: 'SummonHellhoundTrait', v: [7, 40] }, { k: 'SummonHellhoundTrait', d: '每秒恢复8%法力值，法力值满后，召唤2只DireWolf，持续40秒' }]], S('SummonIntelligenceTrait', null, [5], [7], [9])]],
  ['召唤师', 'CrabWarlock', 45, ['小蟹巫', '蟹术士', '蟹巫', '蟹皇'], [['SummonSummonCrablingTrait', [{ v: [2.5, 40] }, { v: [3, 40] }, { v: [3.5, 40] }, { k: 'SummonSummonPincerTrait', v: [4, 40] }]], S('SummonIntelligenceTrait', null, [5], [7], [9]), S('SummonThickHideTrait', null, null, null, [8])]],
  ['召唤师', 'ShadowSwordsman', 45, ['影随从', '影剑士', '影骑士', '暗影君王'], [['SummonShadowBreederTrait', [{ v: [7, 40] }, { v: [6, 40] }, { v: [5, 40] }, { k: 'SummonHatebreederTrait', v: [4, 40] }]], S('SummonNimbleFeetTrait', null, [10], [15], [20])]],
  // 法师
  ['法师', 'MageApprentice', 40, ['见习法师', '法师', '雷法师', '风暴大法师'], [S('SummonLightningStrikeTrait', [18, 4, 90, 0.1], [18, 5, 109, 0.15], [20, 6, 125, 0.2], [22, 7, 150, 0.25]), S('SummonAmplifyMagicTrait', null, [15], [20], [25]), S('SummonTribalWarfareTrait', null, null, null, [1])]],
  ['法师', 'WildMage', 35, ['野法师', '叶刃法师', '森林法师', '翠影贤者'], [S('SummonRazorLeafTrait', [70], [85], [100], [125]), S('SummonExplosiveShellsTrait', null, [30], [45], [60]), S('SummonAmplifyMagicTrait', null, null, null, [25])]],
  ['法师', 'TimeMage', 45, ['时之学徒', '时间法师', '时光术士', '时间领主'], [S('SummonAsteroidTrait', [3, 450, 1], [3, 550, 1.5], [3.5, 686, 2], [4, 850, 2.5]), S('SummonAmplifyMagicTrait', null, [15], [20], [30]), S('SummonExplosiveShellsTrait', null, null, null, [80])]],
  // 牧师
  ['牧师', 'DesertBeliever', 40, ['沙漠信徒', '沙海祭司', '沙海先知', '圣沙使徒'], [S('SummonChainHealTrait', [10, 1, 160, 2], [10, 1, 200, 3], [11, 1, 240, 3], [12, 1, 300, 4]), S('SummonBoneRegenerationTrait', null, [2], [3], [4]), S('SummonResonanceAuraTrait', null, null, null, [2.75, 10])]],
  ['牧师', 'GreenDragon', 40, ['幼龙', '青龙', '翠羽龙', '天龙'], [['SummonLifeExchangeTrait', [{ v: [14, 243, 1, 200] }, { v: [14, 243, 1, 270] }, { k: 'SummonSoulTransferTrait', v: [18, 135, 1, 270] }, { k: 'SummonSoulTransferTrait', v: [20, 110, 1, 340] }]], S('SummonBoneRegenerationTrait', null, [2], [3], [4]), S('SummonDevotionTrait', null, null, null, [4])]],
  ['牧师', 'SnakeGodMessenger', 45, ['蛇信徒', '蛇神祭司', '蛇神使者', '蛇神化身'], [S('SummonTreatmentChainTrait', [200], [600], [1800], [5000]), S('SummonChainHealTrait', null, [8, 1, 120, 2], [9, 1, 150, 2], [10, 1, 190, 3]), S('SummonDevotionTrait', null, null, null, [4])]],
  // 祭司
  ['祭司', 'Mage', 40, ['骸骨术士', '骸骨法师', '骸骨巫师', '骸骨魔导'], [S('SummonAttackSpeedAuraTrait', [8], [10], [13], [17]), S('SummonBoneRegenerationTrait', null, [2], [3], [4]), S('SummonAerialCommandTrait', null, null, null, [12])]],
  ['祭司', 'DarkFang', 40, ['暗牙', '暗牙督军', '暗牙统帅', '暗牙王'], [S('SummonLeadershipAuraTrait', [10, 18], [15, 16], [20, 14], [28, 12]), S('SummonBoneRegenerationTrait', null, [2], [3], [4]), S('SummonAttackSpeedAuraTrait', null, null, null, [10])]],
  ['祭司', 'WarpWing', 45, ['翼虫', '曲速之翼', '虚空之翼', '虚空魔鬼鱼'], [S('SummonPlasmaDecayTrait', [3, 1.5, 20], [3, 2, 25], [2.5, 2.5, 25], [2, 3, 25]), S('SummonNimbleFeetTrait', null, [10], [15], [20]), S('SummonAerialCommandTrait', null, null, null, [12])]],
  // 商人
  ['商人', 'Chick', 20, ['雏鸡', '斗鸡', '金冠鸡', '聚宝金鸡'], [S('SummonDelicacyTrait', [1], [1.2], [1.5], [2]), S('SummonSecretStashTrait', null, [0.5], [0.8], [1.2]), S('SummonRangedDamageReductionTrait', null, null, null, [20])]],
  ['商人', 'VikingPirate', 35, ['海盗', '维京海盗', '海盗船长', '七海霸主'], [S('SummonSecretStashTrait', [0.8], [1], [1.3], [1.8]), S('SummonShortSellingTrait', null, [25, 10], [40, 12], [60, 15]), S('SummonDuelistTrait', null, null, null, [20, 20])]],
  ['商人', 'JadeBeast', 30, ['玉石虫', '宝玉兽', '翡翠玉兽', '玉麒麟'], [['JadeBeastTrait', [{ v: [15, 15], d: '场上存在2个商人单位时，击杀得到的积分+15%；存在3个商人单位时再+15%' }, { v: [20, 20], d: '场上存在2个商人单位时，击杀得到的积分+20%；存在3个商人单位时再+20%' }, { v: [25, 25], d: '场上存在2个商人单位时，击杀得到的积分+25%；存在3个商人单位时再+25%' }, { v: [30, 30], d: '场上存在2个商人单位时，击杀得到的积分+30%；存在3个商人单位时再+30%' }]], S('SummonDelicacyTrait', null, [1], [1.3], [1.6]), S('SummonShortSellingTrait', null, null, null, [50, 15])]],
];
// 2026-09-26 (six qualities: 普通 / 优质 / 稀有 / 史诗 / 传说 / 神话): a line runs 普通 → 传说 in five tiers; its vocation's
// evolution building lets a 传说 evolve once more, to 神话 (「超限进化」, mc-evo.js). The four tiers above are spread over the
// six: 优质 sits halfway between 普通 and 稀有, 神话 goes past 传说 as far again and wears its vocation's own skill on top.
const QN = ['普通', '优质', '稀有', '史诗', '传说', '神话'], TIER_K = 3.3, TIERS = 6;
const NAMES2 = {   // [优质, 神话] for every line
  FootSoldier: ['老兵', '神铸城壁'], VoodooBeliever: ['巫毒侍从', '巫毒神'], BigWildBoar: ['野猪', '撼地猪神'],
  YellowManeHorse: ['骏马', '神驹'], BloodKnight: ['血卫', '血神'], CursedSwordsman: ['咒刃剑客', '咒神'],
  SlaveLord: ['恶棍', '不灭斗神'], Berserker: ['蛮勇战士', '战神'], Skybot: ['改装机器人', '神机'],
  HolyLightKnight: ['骑士', '光之神使'], LifeTree: ['生命之枝', '生命之神'], LionHammer: ['重锤卫', '狮神'],
  Ranger: ['林间游侠', '风神射手'], Archer: ['骸骨猎手', '冥神弓'], Bat: ['蝙蝠射手', '雷神蝠'],
  BlackSword: ['黑刃', '影神之刃'], WaterWarrior: ['浪刃', '海神之影'], Gladiator: ['角斗新星', '角斗之神'],
  Summoner: ['驯兽大师', '兽神'], CrabWarlock: ['蟹巫学徒', '蟹神'], ShadowSwordsman: ['影卫', '暗影神'],
  MageApprentice: ['法师学徒', '雷神'], WildMage: ['林法师', '森之神'], TimeMage: ['时之术士', '时间之神'],
  DesertBeliever: ['沙漠行者', '圣沙之神'], GreenDragon: ['小青龙', '龙神'], SnakeGodMessenger: ['蛇侍', '蛇神'],
  Mage: ['骸骨学徒', '骸骨之神'], DarkFang: ['暗牙卫士', '暗牙神'], WarpWing: ['翼兽', '虚空之神'],
  Chick: ['小公鸡', '财神鸡'], VikingPirate: ['水手', '海神'], JadeBeast: ['玉石兽', '玉神麒麟'],
};
// the 神话 tier of a skill that changes kind on the way (summons, the healer dragon, the jade count)
const MYTH_OBJ = {
  Summoner: { k: 'SummonHellhoundTrait', d: '每秒恢复10%法力值，法力值满后，召唤2只VengefulDragon，持续40秒' },
  CrabWarlock: { k: 'SummonSummonPincerTrait', d: '每秒恢复5%法力值，法力值满后，召唤2只Pincer，持续40秒' },
  ShadowSwordsman: { k: 'SummonHatebreederTrait', v: [3, 40] },
  GreenDragon: { k: 'SummonSoulTransferTrait', v: [22, 90, 1, 420] },
  JadeBeast: { v: [40, 40], d: '场上存在2个商人单位时，击杀得到的积分+40%；存在3个商人单位时再+40%' },
};
// every vocation's own skill, worn by its 神话 tier (not again if the line has it already)
const MYTH_TR = { 先锋: ['SummonPrismaticShieldTrait', [6, 10, 85]], 守护者: ['SummonProtectionAuraTrait', [15]], 战士: ['SummonFinalJudgmentTrait', [5, 0.3, 25, 35]], 圣骑士: ['SummonSpeedBoostTrait', [1, 80]],
  射手: ['SummonHypershotTrait', [3]], 刺客: ['SummonHypershotTrait', [2]], 法师: ['SummonAsteroidTrait', [4, 900, 3]], 牧师: ['SummonTreatmentChainTrait', [3000]], 祭司: ['SummonLeadershipAuraTrait', [30, 10]],
  召唤师: ['SummonDimensionalChasmTrait', null], 商人: ['SummonSecretStashTrait', [2]] };
const isInt = (x) => Number.isInteger(x);
const mid = (a, b) => (a == null || b == null ? a : a.map((x, i) => { const y = b[i] == null ? x : b[i], m = (x + y) / 2; return isInt(x) && isInt(y) ? Math.round(m) : Math.round(m * 100) / 100; }));
const ext = (c, d) => (d == null ? null : d.map((y, i) => { const x = c && c[i] != null ? c[i] : y, v = c ? y + (y - x) * 1.2 : y * 1.3; const r = isInt(x) && isInt(y) ? Math.round(v) : Math.round(v * 100) / 100; return y > 0 && r <= 0 ? y : r; }));
// four specs (普通 / 稀有 / 史诗 / 传说) → six tiers
function six(art, per) {
  const [a, b, c, d] = per;
  if ([a, b, c, d].some(x => x && !Array.isArray(x))) {   // per-tier objects
    const mo = (x, y) => (x == null ? null : y && x.v && y.v ? Object.assign({}, x, { v: mid(x.v, y.v) }) : x);
    return [a, mo(a, b), b, c, d, MYTH_OBJ[art] || d];
  }
  return [a, mid(a, b), b, c, d, ext(c, d)];
}
const round5 = (x) => Math.max(5, Math.round(x / 5) * 5);
M.lineKey = (art, t) => art + '_T' + t;
const made = [];
LINES.forEach(([voc, art, cost1, names4, skills], li) => {
  const A = DB[art]; if (!A) return;
  const n2 = NAMES2[art] || [names4[0] + '·优', names4[3] + '·神'], names = [names4[0], n2[0], names4[1], names4[2], names4[3], n2[1]];
  const specs = skills.map(([base, per]) => [base, six(art, per)]);
  const mt = MYTH_TR[voc]; if (mt && TDB[mt[0]] && !specs.some(([b]) => b === mt[0])) specs.push([mt[0], [null, null, null, null, null, mt[1] || true]]);
  let cost = cost1;
  for (let t = 1; t <= TIERS; t++) {
    const key = M.lineKey(art, t), trs = [];
    specs.forEach(([base, per]) => {
      const x = per[t - 1]; if (x == null) return;
      const k = x === true ? tr(base) : Array.isArray(x) ? tr(base, x) : tr(x.k || base, x.v || null, x.d || null);
      if (k) trs.push(k);
    });
    const d = DB[key] = { n: names[t - 1], q: t - 1, g: QN[t - 1], voc, race: A.race, type: 'Summon', cost, as: A.as || 100, spd: A.spd || 280, ranged: voc === '射手' ? 1 : A.ranged === 2 ? 0 : A.ranged, rad: A.rad || 256, tr: trs, desc: A.desc || '', art, line: art, lineI: li, tier: t, prev: t > 1 ? M.lineKey(art, t - 1) : null, next: t < TIERS ? M.lineKey(art, t + 1) : null, myth: t === TIERS, _voc: 1 };
    // life and damage as every unit's: power = price, split by the vocation (mc-voc.js)
    const V = M.VOC[voc], P = M.vocPowerOf(cost), hp = Math.max(40, Math.round(P * Math.sqrt(V.r) / 10) * 10);
    d.hp = hp; d.atk = Math.round(P * P / hp * 100 / d.as * 100) / 100;
    if (M.UNITS) M.UNITS[key] = { name: d.n, tags: [d.race, d.voc].filter(Boolean), tier: t, hp: d.hp, atk: d.atk, desc: d.desc, q: d.q };
    made.push(key);
    cost = round5(cost * TIER_K);
  }
});
M.LINE_UNITS = made;
M.lineOf = (k) => (DB[k] && DB[k].line) || null;
M.linesOfVoc = (v) => LINES.filter(L => L[0] === v && DB[M.lineKey(L[1], 1)]).map(L => L[1]);
M.lineTiers = (art) => [1, 2, 3, 4, 5, 6].map(t => M.lineKey(art, t)).filter(k => DB[k]);
M.LINE_TIERS = TIERS;
// only the lines are sold (the old units stay for helpers and old saves)
M.SHOP_POOL = made.slice();
})();

;
