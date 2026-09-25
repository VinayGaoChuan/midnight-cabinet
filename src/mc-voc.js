// ==== mc-voc.js ====
(function () {
// Vocations (user ruling 2026-09-24): a unit's vocation says in one sentence what it is good at, and its numbers and its
// skill agree with that sentence. Building a team is choosing vocations. At least a third of all unit kinds are
// defensive (先锋 / 守护者) so a front line comes up often in the shop.
//   numbers: a unit's power (√(life × damage per second)) follows its price — cost curve × how strong its own skill made
//   it before (squeezed into 0.7–1.3) × the vocation's factor — and the vocation splits that power into life and damage
//   (r = life ÷ damage per second: a 先锋 has ~50, an 刺客 ~7).
const M = window.MC, DB = M.DB, TDB = M.TDB;
const VOC = {
  先锋:   { d: '该职业擅长防御。', c: '#7fb0ff', r: 50, f: 1.0, def: 1, ic: 'v_vanguard' },
  守护者: { d: '该职业擅长防御，并保护身边的友军。', c: '#9ad0ff', r: 42, f: 0.95, def: 1, ic: 'v_guardian' },
  战士:   { d: '该职业擅长近战输出，和简单防御。', c: '#ff8a6a', r: 22, f: 1.05, ic: 'v_warrior' },
  圣骑士: { d: '该职业擅长恢复，和简单防御。', c: '#ffe08a', r: 32, f: 0.95, ic: 'v_paladin' },
  射手:   { d: '该职业擅长输出，但很脆弱。', c: '#ffd060', r: 9, f: 1.0, ic: 'v_archer' },
  刺客:   { d: '该职业擅长爆发攻击，但很脆弱。', c: '#ff5a8a', r: 7, f: 1.05, ic: 'v_assassin' },
  法师:   { d: '该职业擅长技能攻击，但很脆弱。', c: '#c890ff', r: 10, f: 0.9, ic: 'v_mage' },
  牧师:   { d: '该职业擅长恢复，但很脆弱。', c: '#9cffb0', r: 12, f: 0.85, ic: 'v_cleric' },
  祭司:   { d: '该职业擅长强化和削弱，但很脆弱。', c: '#ffb0f0', r: 13, f: 0.85, ic: 'v_priest' },
  召唤师: { d: '该职业擅长召唤帮手，但很脆弱。', c: '#b8a0ff', r: 13, f: 0.8, ic: 'v_summoner' },
  商人:   { d: '该职业擅长赚钱，但不擅长战斗。', c: '#ffcc33', r: 14, f: 0.85, ic: 'v_merchant' },
};
M.VOC = VOC;
M.isDefVoc = (v) => !!(VOC[v] && VOC[v].def);
// every shop unit's vocation, chosen from what its skill does
const ASSIGN = {
  先锋: 'Deserter Guard ShieldDefender Pikeman VikingWarrior Troll SickleWorm VoodooBeliever FootSoldier Warrior RedGuard AncestorWarrior IroncladWarrior VoodooGuard PolarBear EmeraldDragon Ogre Rooster ChainmailPikeman ChurchGuard HeavilyArmedWarrior WhiteWolf MagicShieldSoldier GreenDemon BigWildBoar RedDragon JadeVineFortress Stone BlackBear GuardCommander YellowDemon Pulsebot SteelWarlord SoulWarrior AntiMagicGuardian SnowWolfKing RedEyes StormFortress BlackDragon PoisonDragon GiantGodOfWar',
  守护者: 'YellowManeHorse BloodKnight CursedSwordsman BlackIronGuard AgonyShieldDefender DemonKingsGuard SweatBloodHorse VerdantShield BrownBear Commander',
  战士: 'Spider SlaveLord RedCross EmperorOfFlame Berserker MarshalOrfa Skybot',
  圣骑士: 'HolyLightKnight LifeTree LionHammer',
  射手: 'Lizard DesertArcher Ronin EagleBeakedArcher Ranger Archer GemLizard FantasyShooter Bat Whirlybird EliteHunter BlazingShooter AngelArcher MageHero MadMonarch PunishingCleric CrawlingCatapult GoldenDragon Annihilator CatapultArcher DeathShooter NightArcher Bishop MagicDragon WanderingTrebuchet GigaAnnihilator',
  刺客: 'BlackSword WaterWarrior ImmortalBlueDemon Gladiator ShadowGrimReaper PhantomDancer',
  法师: 'WildMage MageApprentice CelestialMage IceAndSnowMage MoonlightApostle BlueDragon FlameMage Archmage TimeMage',
  牧师: 'GreenDragon DesertBeliever SkyDragon SnakeGodMessenger',
  祭司: 'Mage WarpWing Wizard DarkFang VampireBat Supervisor VoidManta',
  召唤师: 'WildManPriest FirePig Summoner CrabWarlock WildManKing CandyGirl WhiteFang ShadowSwordsman SpiritSummonTower Necromancer Crabomancer GrimReaper HellSummonTower ShadowKnight',
  商人: 'RedWorm Chick GoblinCopter VikingPirate FlyingEagle Turkey CannonFodderMage JadeBeast Landlord SwordDancer GoldenHand ChargeTower FireGodTower',
};
const VOC_OF = {}; Object.keys(ASSIGN).forEach(v => ASSIGN[v].split(/\s+/).filter(Boolean).forEach(k => { VOC_OF[k] = v; }));
// front-liners whose skill did not defend take a defensive one (merchants' coin skills, pikemen's stimulant, a robot's
// splash, horses that only fed mana)
const SWAP = { VikingWarrior: 'SummonStoneskinTrait', Troll: 'SummonBoneRegenerationTrait', SickleWorm: 'SummonBarbsTrait', Ogre: 'SummonHardenTrait', Rooster: 'SummonRangedDamageReductionTrait',
  Pikeman: 'SummonRangedDamageReductionTrait', ChainmailPikeman: 'SummonHardenTrait', Pulsebot: 'SummonGraniteSkinTrait', YellowManeHorse: 'SummonThickHideTrait', SweatBloodHorse: 'SummonThickHideTrait' };
const curve = (cost) => 1.44 * Math.pow(Math.max(5, cost), 1.068);
M.vocPowerOf = curve;
M.applyVocations = function () {
  Object.keys(VOC_OF).forEach(k => {
    const d = DB[k]; if (!d || d._voc) return; const v = VOC_OF[k], V = VOC[v];
    if (SWAP[k] && TDB[SWAP[k]]) d.tr = [SWAP[k]];
    d.voc = v; d._voc = 1;
    if (!d.as || !d.atk || !d.cost) return;                         // eggs and towers that never attack keep their body
    const pw0 = Math.sqrt(d.hp * d.atk * d.as / 100), c = curve(d.cost), own = Math.min(1.3, Math.max(0.7, Math.sqrt(pw0 / c)));
    const P = c * own * V.f, hp = P * Math.sqrt(V.r), dps = P / Math.sqrt(V.r);
    d.hp = Math.max(40, Math.round(hp / 10) * 10); d.atk = Math.max(1, Math.round(dps * 100 / d.as));
    if (v === '射手') d.ranged = 1;
  });
};
M.applyVocations();
})();

;
