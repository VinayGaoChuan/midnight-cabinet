// ==== mc-awaken.js ====
(function () {
// Units (user ruling 2026-09-24).
//  · A unit is shown as: name / vocation icon + vocation, power icon + power / one sentence. Nothing else, no Ctrl layer:
//    buying is "do I need this vocation, and which of those is strongest that I can afford".
//  · Units have no invented active skills. Each unit's own trait (passive) gets an awakening when the fight starts: the
//    trait's emblem bursts out of the body and settles over the head (the 巫毒信徒's skull), with a flourish of its kind;
//    the emblem stays up there and flares whenever the trait fires.
const M = window.MC, DB = M.DB, TDB = M.TDB, IC = M.IC, S = M.Sfx;
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (p) => 1 - Math.pow(1 - p, 3), eb = (p) => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

// ───────── every trait: [kind of awakening, one short clause (unit keys are replaced by names)] ─────────
const TR = {
  SummonDelicacyTrait: ['gold', '死亡时掉落积分'], SummonTreasureHuntTrait: ['gold', '开战时可能捡到积分'], SummonAcrobaticsSuperTrait: ['speed', '越打越快'],
  SummonDominionTrait: ['guard', '防御很高，但身边强力友军越多越弱'], SummonEntourageTrait: ['rage', '身边强力友军越多越强'], SummonChainHealTrait: ['heal', '蓄满法力后治疗一串友军'],
  SummonTreatmentChainTrait: ['heal', '开战时给最肉的友军加大量生命'], SummonChargeAttackNewTrait: ['leap', '开战时跳进敌群砸地'],
  SummonJuniorFishermanTrait: ['growth', '身边敌人死得越多，越快升级成RedCross'], SummonCommercialFishermanTrait: ['growth', '身边敌人死得越多，越快升级成EmperorOfFlame'],
  SummonEliteFishermanTrait: ['growth', '攒下的层数越多越强'], SummonAmbushTrait: ['stealth', '开战时隐身，偷袭敌方远程'], SummonShellShockTrait: ['fire', '蓄满法力后炮击一片敌人并减慢其攻速'],
  SummonResonanceAuraTrait: ['aura_heal', '让身边友军持续回血、防御提高'], SummonTribalWarfareTrait: ['speed', '每次攻击连打三下'], SummonInvigorateSuperTrait: ['rage', '蓄满法力后狂暴攻击并回血'],
  SummonBurstAttackTrait: ['arcane', '攻击附带按敌人最大生命算的伤害'], SummonEchostrikeTrait: ['arcane', '攻击附带按敌人最大生命算的伤害'], SummonIncubationTrait: ['growth', '活过两场战斗后孵化成GiantGodOfWar'],
  SummonAzuriteShellTrait: ['thorns', '反弹受到的伤害'], SummonEggsplosionTrait: ['skull', '死亡时爆炸', '#8fe0ff'], SummonHydralingsTrait: ['summon', '死亡时分裂出三只Golem'],
  SummonBoneRegenerationTrait: ['heal', '持续回血'], SummonMindWarpTrait: ['speed', '蓄满法力后让最强的友军加速'], SummonFlamingArrowsTrait: ['fire', '每箭附带火焰伤害'],
  SummonStoneskinTrait: ['guard', '受到的伤害减少'], SummonGraniteSkinTrait: ['guard', '受到的伤害大幅减少'], SummonHoundSummoningTrait: ['summon', '蓄满法力后召唤GrayWolf'],
  SummonHellhoundTrait: ['summon', '蓄满法力后召唤DireWolf'], SummonLeechTrait: ['aura_blood', '让身边友军攻击吸血'], SummonCannibalismTrait: ['aura_blood', '让身边友军攻击大量吸血'],
  SummonSkullStewTrait: ['heal', '蓄满法力后给一名友军回血'], SummonFatalityTrait: ['rage', '每次攻击都永久变强'], SummonDragonTrait: ['summon', '蓄满法力后召唤VengefulDragon'],
  SummonIntelligenceTrait: ['arcane', '击杀时回复法力'], SummonNecromancyTrait: ['skull', '身边敌人死亡时回复法力'], SummonThanatosTrait: ['summon', '蓄满法力后召唤BoneDragon'],
  SummonUnchainedRageTrait: ['rage', '残血时攻速翻倍'], SummonRangedDamageReductionTrait: ['guard', '受到的远程伤害减少'], SummonManaBlessingTrait: ['aura_mana', '持续给友军补法力'],
  SummonBlessingTrait: ['speed', '法力满时自身加速加防'], SummonManaMiracleTrait: ['aura_mana', '持续给友军补法力'], SummonMultishotTrait: ['blade', '每次攻击同时射中三个敌人'],
  SummonHypershotTrait: ['speed', '每次攻击连打四下'], SummonParticleWaveTrait: ['arcane', '盯住一个目标越打越痛'], SummonSolarFlareTrait: ['speed', '蓄满法力后攻速翻倍'],
  SummonPurificationBeamTrait: ['arcane', '盯住一个目标越打越痛'], SummonSolarFlareSuperTrait: ['speed', '蓄满法力后攻速翻倍'], SummonAegisTrait: ['blade', '法力满后，接下来的攻击都带范围伤害'],
  SummonManaScalingTrait: ['arcane', '法力越多，攻速和生命越高'], SummonFinalJudgmentTrait: ['arcane', '法力满后，接下来的攻击都带大范围伤害'],
  SummonAnaphylaxisTrait: ['skull', '死亡时会对击杀者施加毒素', '#9cff5a'], SummonParaphylaxisTrait: ['skull', '死亡时会对击杀者施加剧毒', '#9cff5a'],
  SummonAccuracyTrait: ['blade', '每次攻击附带额外伤害'], SummonPrecisionTrait: ['blade', '每次攻击附带额外伤害'], SummonMarkTargetTrait: ['curse', '攻击削弱目标防御'],
  SummonCellRegrowthTrait: ['heal', '半血上场，但持续回血'], SummonCellRegrowthSuperTrait: ['heal', '半血上场，但快速回血'], SummonFragranceTrait: ['venom', '散发芬芳，持续伤害身边的敌人', '#b8ff9a'],
  SummonNoxiousScentTrait: ['venom', '散发毒气，持续伤害身边的敌人'], SummonThickHideTrait: ['aura_guard', '让身边友军防御提高'], SummonProtectionAuraTrait: ['aura_guard', '让身边友军防御大幅提高'],
  SummonBarbsTrait: ['thorns', '反弹受到的伤害'], SummonThornsTrait: ['thorns', '反弹受到的伤害'], SummonGeneratorTrait: ['bolt', '越打越快'], SummonIonicForceTrait: ['bolt', '越打越快'],
  SummonWaterBounceTrait: ['blade', '攻击会弹射到旁边的敌人', '#8fd8ff'], SummonDelusionTrait: ['curse', '攻击削弱目标防御'], SummonCombustionTrait: ['fire', '每次攻击附带火焰伤害'],
  SummonLightningStrikeTrait: ['bolt', '蓄满法力后闪电连锁五个敌人'], SummonHardenTrait: ['guard', '开战时可能硬化，防御提高'], SummonWaterSpoutNewTrait: ['arcane', '蓄满法力后重击单个敌人'],
  SummonAmplifyMagicTrait: ['aura_mana', '让身边友军法力恢复更快'], SummonAsteroidTrait: ['arcane', '蓄满法力后召唤陨石砸单个敌人'], SummonEnergyRegenOnKillTrait: ['arcane', '击杀时回复法力'],
  SummonMoltenShieldTrait: ['guard', '用法力吸收受到的伤害', '#ff9a4a'], SummonEnergyAddSurgeTrait: ['rage', '法力越少伤害越高'], SummonPrismaticShieldTrait: ['guard', '用法力吸收大部分伤害'],
  SummonStimpackTrait: ['speed', '开战时可能打兴奋剂，攻速和射程暴涨'], SummonEnergySurgeTrait: ['arcane', '攻击攒法力，满了打出一记重击'], SummonSputteringTrait: ['fire', '每次攻击溅射周围敌人'],
  SummonMachineGunnerTrait: ['blade', '不停扫射附近的敌人'], SummonAerialCommandTrait: ['aura_atk', '让身边友军伤害提高'], SummonBombardierTrait: ['fire', '定时轰炸三个敌人'],
  SummonAttackSpeedAuraTrait: ['aura_speed', '让身边友军攻速提高'], SummonMythiumCoreTrait: ['aura_speed', '让身边友军攻速大幅提高'], SummonDuelistTrait: ['blade', '盯住一个目标越打越痛'],
  SummonExplosiveShellsTrait: ['fire', '击杀时引发爆炸'], SummonDartleTrait: ['blade', '每次攻击同时打中三个敌人', '#c8b0ff'], SummonTantrumTrait: ['rage', '开战时可能发脾气，攻速提高'],
  SummonSpiritOfferingTrait: ['growth', '身边敌人死亡时升级，越打越强'], SummonArmWithShurikenTrait: ['summon', '开战时放出自爆步兵'], SummonSpeedBoostTrait: ['revive', '死后很快复活，并且更快'],
  SummonWintryTouchTrait: ['aura_frost', '冻伤并减速周围的敌人'], SummonNimbleFeetTrait: ['speed', '常常闪避攻击'], SummonFrozenVeilTrait: ['aura_frost', '冻伤并大幅减速周围的敌人'],
  SummonDimensionalRiftTrait: ['summon', '蓄满法力后召唤MoonLeopard和Watchdog'], SummonDimensionalChasmTrait: ['summon', '蓄满法力后召唤MagicLeopard和EvilDog'],
  SummonRazorLeafTrait: ['blade', '每次攻击溅射周围敌人', '#b8ff60'], SummonEarlyHarvestTrait: ['gold', '死亡时掉落积分'], SummonBloomingTrait: ['growth', '每活过一场战斗就变强'],
  SummonMiniSlimeTrait: ['summon', '死亡时召唤WildManSpearman'], SummonSlimePropagationTrait: ['summon', '攻击攒法力，满了召唤两个WildManSpearman'], SummonLifeExchangeTrait: ['heal', '用自己的生命治疗友军'],
  SummonSoulTransferTrait: ['heal', '用自己的生命治疗友军'], SummonIronHailTrait: ['blade', '蓄满法力后砸伤一片敌人并削弱其伤害'], SummonSwordRainTrait: ['blade', '蓄满法力后降下剑雨，削弱敌人伤害'],
  SummonBladeStormTrait: ['blade', '蓄满法力后卷起剑刃风暴，大幅削弱敌人伤害'], SummonShadowBreederTrait: ['summon', '每攻击几次召唤一个影子随从'], SummonHatebreederTrait: ['summon', '每攻击几次召唤一个强力随从'],
  SummonWolfPackTrait: ['curse', '攻击削弱目标防御，可叠加'], SummonExuberanceTrait: ['growth', '刚招募时更强，之后慢慢变弱'], SummonDevotionTrait: ['heal', '持续治疗身边的友军'],
  SummonForbiddenFruitTrait: ['fire', '死亡或法力满时引爆，伤害周围敌人'], SummonAggressivePortfolioTrait: ['gold', '活过一场战斗就赚积分'], SummonShortSellingTrait: ['speed', '开战时可能加速'],
  SummonSecretStashTrait: ['gold', '活过一场战斗就赚积分'], SummonUnyieldingSpiritTrait: ['growth', '常常闪避，每次闪避都变强'], SummonSummonCrablingTrait: ['summon', '蓄满法力后召唤Crabling'],
  SummonSummonPincerTrait: ['summon', '蓄满法力后召唤Pincer'], SummonEMPTrait: ['bolt', '攻击削弱目标防御'], SummonGigaBoomstickTrait: ['fire', '每打几下或击杀后来一发重炮'],
  SummonPlasmaDecayTrait: ['aura_weak', '持续削弱周围敌人的伤害'], SummonArtilleryTrait: ['fire', '目标越远伤害越高'], SummonPoisonTippedPoleTrait: ['venom', '持续毒伤目标'],
  SummonFeastTrait: ['rage', '身边敌人死亡时回血、加速'], SummonSpiderSplitTrait: ['summon', '死亡时召唤Spiderling'], SummonBossTrait: ['guard', '防御更高'],
  SummonImpaleTrait: ['blade', '越打越痛'], SummonRapidFireTrait: ['speed', '攻击越来越快'], SummonBloodRushTrait: ['rage', '让一名友军加速'], SummonCleaveTrait: ['speed', '每次攻击连打两下'],
  SummonGhostWalkerTrait: ['stealth', '受到的普通攻击伤害减少'], SummonDeathStareTrait: ['curse', '盯住一个目标越打越痛'], SummonSummonFroggoTrait: ['summon', '召唤蛙人'],
  SummonPotOHoneyTrait: ['heal', '死亡时为身边友军回血'], SummonLeadershipAuraTrait: ['aura_atk', '让身边友军伤害提高，但更脆'], SummonSafetyAuraTrait: ['aura_guard', '让身边友军受到的伤害减少'],
  SummonPlunderTrait: ['gold', '击杀时抢积分'], SummonDiabolicDuoTrait: ['summon', '成对出现'], SummonHealingAuraTrait: ['aura_heal', '让身边友军持续回血'], SummonMaulTrait: ['curse', '攻击会减慢目标的攻速'],
  SummonSelfDestructInfantryTrait: ['fire', '冲上去自爆'], SummonRaiseImpTrait: ['summon', '召唤小鬼'], JadeBeastTrait: ['gold', '场上商人越多，倍率越高'],
};
M.TRAIT_AW = TR;
// what the no-trait units are for, by vocation
const VOC_LINE = { 先锋: '站在前排扛伤害', 守护者: '站在前排保护友军', 战士: '近战输出', 圣骑士: '站在前排给友军回血', 射手: '远程输出', 刺客: '爆发输出', 法师: '法术输出', 牧师: '给友军回血', 祭司: '支援友军', 召唤师: '召唤帮手', 商人: '能赚积分' };
const names = (s) => s.replace(/[A-Z][A-Za-z]+/g, (w) => (DB[w] ? DB[w].n : w));
// the one sentence: the unit's first two traits, or what its vocation does
M.unitLine = function (k) {
  const d = DB[k]; if (!d) return ''; const tr = (d.tr || []).filter(t => TR[t]);
  if (!tr.length) return (d.hp >= 2000 && d.voc === '先锋' ? '重装单位，非常耐打' : VOC_LINE[d.voc] || '普通单位') + '。';
  const parts = []; tr.forEach(t => { const s = names(TR[t][1]); if (parts.length < 2 && !parts.includes(s)) parts.push(s); });
  return parts.join('，') + '。';
};
// the trait a unit wears over its head
M.unitAw = function (k) { const d = DB[k]; if (!d) return null; const t = (d.tr || []).find(x => TR[x]); if (!t) return null; const a = TR[t]; return { key: t, cat: a[0], col: a[2] || null }; };

// ───────── the tooltip and the shop card ─────────
M.unitTip = function (k, u) {
  const d = DB[k]; if (!d) return null; const q = M.QUALITY[d.q] || M.QUALITY[0], vi = d.voc && M.tagIc('voc', d.voc);
  const row = []; if (vi) row.push({ img: vi.img, t: d.voc, c: vi.c, fs: 22, is: 28 }); row.push({ img: M.iconURL('u_star', 2), t: String(M.unitPower(k, u)), c: '#ffe08a', fs: 22, is: 26 });
  return { title: d.n, c: q.c, brief: [row], d: M.unitLine(k) };
};
// a race-count trait would be invisible now that cards show no race: 宝玉兽 counts merchants instead
if (TDB.JadeBeastTrait) Object.assign(TDB.JadeBeastTrait, { d: '场上存在2个商人单位时，倍率+0.1；存在3个商人单位时，倍率再+0.1', lines: null });
if (DB.JadeBeast) DB.JadeBeast.desc = '身上长着玉石的兽，同行越多越值钱。';
if (M.TRAIT_H && M.TRAIT_H.JadeBeast) M.TRAIT_H.JadeBeast.start = function (b, e) {
  const n = b.run.roster.filter(u => DB[u.type] && DB[u.type].voc === '商人').length; let m = 0; if (n >= 2) m += 0.1; if (n >= 3) m += 0.1;
  if (m) { b.addMult(m, e.x, e.y - 120, '玉石共鸣'); b.fxp({ k: 'rays', x: e.x, y: e.y - 40, col: '#7fffc0', life: 0.8 }); }
};
// a sprite that must stay inside its card: the inner image takes the element's max size
try { const st = document.createElement('style'); st.textContent = 'm-img[data-fit]>img{max-width:inherit;max-height:inherit;width:auto!important;height:auto!important}'; document.head.appendChild(st); } catch (e) {}
const G = M.Game.prototype, oView = G.view;
G.view = function () {
  const v = oView.call(this), run = this.run;
  if (v.s && run && run.shop) (v.s.units || []).forEach((su, i) => { const c = run.shop.units[i]; if (!c) return; const d = DB[c.type], vi = d.voc && M.tagIc('voc', d.voc);
    Object.assign(su, { hasR: false, hasV: false, vIc: vi ? vi.img : '', vn: d.voc || '', vc: vi ? vi.c : '#aaa', pwN: String(M.unitPower(c.type)), line: M.unitLine(c.type), tipOn: this.tipFn(() => M.unitTip(c.type)) }); });
  if (v.w && v.w.roster) v.w.roster.forEach(r => { r.hasR = false; });
  return v;
};

// ───────── emblems ─────────
const C = (x, c) => { x.fillStyle = c; }, circ = (x, a, b, r, c) => { C(x, c); x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); };
const poly = (x, p, c) => { C(x, c); x.beginPath(); p.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
const line = (x, a, b, c2, d, w, c) => { x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke(); };
const rect = (x, a, b, w, h, c) => { C(x, c); x.fillRect(a, b, w, h); };
IC.e_skull = (x) => { circ(x, 16, 13, 11, '#f0eadc'); rect(x, 9, 18, 14, 9, '#f0eadc'); circ(x, 11.5, 13, 3.4, '#1a1418'); circ(x, 20.5, 13, 3.4, '#1a1418'); poly(x, [[16, 17], [14, 21], [18, 21]], '#1a1418'); for (let i = 0; i < 4; i++) rect(x, 11 + i * 3, 24, 1.6, 4, '#1a1418'); };
IC.e_venom = (x) => { poly(x, [[16, 2], [25, 17], [24, 25], [16, 30], [8, 25], [7, 17]], '#6ad83a'); poly(x, [[16, 8], [21, 18], [16, 25], [11, 18]], '#b8ff7a'); circ(x, 13, 18, 1.8, '#1a3a10'); circ(x, 19, 18, 1.8, '#1a3a10'); };
IC.e_summon = (x) => { x.strokeStyle = '#c890ff'; x.lineWidth = 3; x.beginPath(); x.arc(16, 16, 12, 0, 7); x.stroke(); poly(x, [[16, 5], [19, 13], [27, 13], [21, 18], [23, 26], [16, 21], [9, 26], [11, 18], [5, 13], [13, 13]], '#e8d0ff'); circ(x, 16, 16, 3, '#8a3ad0'); };
IC.e_thorns = (x) => { circ(x, 16, 16, 8, '#c86a2a'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; poly(x, [[16 + Math.cos(a - 0.25) * 7, 16 + Math.sin(a - 0.25) * 7], [16 + Math.cos(a) * 15, 16 + Math.sin(a) * 15], [16 + Math.cos(a + 0.25) * 7, 16 + Math.sin(a + 0.25) * 7]], '#ffa040'); } circ(x, 16, 16, 4, '#ffe0a0'); };
IC.e_speed = (x) => { poly(x, [[14, 4], [26, 4], [18, 14], [26, 14], [10, 30], [15, 18], [7, 18]], '#ffe060'); line(x, 2, 10, 9, 10, 2.4, '#fff6c0'); line(x, 1, 22, 6, 22, 2.4, '#fff6c0'); };
IC.e_frost = (x) => { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; line(x, 16 - Math.cos(a) * 13, 16 - Math.sin(a) * 13, 16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13, 3, '#bfefff'); } for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; circ(x, 16 + Math.cos(a) * 12, 16 + Math.sin(a) * 12, 2.2, '#ffffff'); } circ(x, 16, 16, 3, '#ffffff'); };
IC.e_bolt = (x) => { poly(x, [[19, 2], [8, 18], [15, 18], [11, 30], [25, 12], [17, 12], [22, 2]], '#bfe8ff'); poly(x, [[18, 6], [12, 16], [16, 16]], '#ffffff'); };
IC.e_up = (x) => { poly(x, [[16, 3], [28, 16], [21, 16], [21, 29], [11, 29], [11, 16], [4, 16]], '#ffe08a'); poly(x, [[16, 7], [23, 15], [16, 15]], '#fff6d0'); };
IC.e_leap = (x) => { poly(x, [[6, 26], [14, 12], [22, 8], [28, 4], [24, 12], [16, 20], [10, 28]], '#ffb060'); line(x, 3, 30, 12, 30, 2.4, '#c8905a'); line(x, 16, 30, 26, 30, 2.4, '#c8905a'); };
IC.e_star = (x) => { poly(x, [[16, 1], [19.5, 12.5], [31, 16], [19.5, 19.5], [16, 31], [12.5, 19.5], [1, 16], [12.5, 12.5]], '#8fb8ff'); circ(x, 16, 16, 4, '#ffffff'); };
IC.e_curse = (x) => { poly(x, [[5, 6], [27, 6], [27, 17], [16, 29], [5, 17]], '#6a3a9a'); line(x, 12, 5, 20, 29, 3, '#1a0e24'); line(x, 20, 8, 13, 22, 2, '#1a0e24'); circ(x, 23, 11, 2.2, '#e8c0ff'); };
IC.e_soul = (x) => { poly(x, [[16, 2], [26, 14], [24, 26], [20, 22], [16, 30], [12, 22], [8, 26], [6, 14]], '#e8e0ff'); circ(x, 12.5, 14, 2, '#3a2a5a'); circ(x, 19.5, 14, 2, '#3a2a5a'); };
IC.e_mana = (x) => { poly(x, [[16, 2], [26, 16], [16, 30], [6, 16]], '#4a8aff'); poly(x, [[16, 6], [22, 16], [16, 26]], '#9fd0ff'); circ(x, 13, 13, 1.8, '#ffffff'); };
IC.e_fang = (x) => { poly(x, [[6, 6], [26, 6], [24, 10], [8, 10]], '#e8e0dc'); poly(x, [[9, 10], [14, 10], [11.5, 26]], '#ffffff'); poly(x, [[18, 10], [23, 10], [20.5, 26]], '#ffffff'); circ(x, 11.5, 27, 2.2, '#ff3a4a'); circ(x, 20.5, 27, 2.2, '#ff3a4a'); };
// every kind: its emblem, colour and flourish
const KIND = {
  skull: { ic: 'e_skull', col: '#c8a0ff' }, venom: { ic: 'e_venom', col: '#9cff5a' }, summon: { ic: 'e_summon', col: '#c890ff' }, heal: { ic: 't_heal', col: '#7fff9a' },
  guard: { ic: 't_shield', col: '#9fc8ff' }, thorns: { ic: 'e_thorns', col: '#ffa040' }, speed: { ic: 'e_speed', col: '#ffe060' }, frost: { ic: 'e_frost', col: '#bfefff' },
  fire: { ic: 't_flame', col: '#ff7a2a' }, bolt: { ic: 'e_bolt', col: '#bfe8ff' }, gold: { ic: 't_coin', col: '#ffcc33' }, growth: { ic: 'e_up', col: '#ffe08a' },
  stealth: { ic: 't_eye', col: '#a8b0e0' }, leap: { ic: 'e_leap', col: '#ffb060' }, blade: { ic: 't_sword', col: '#ff8a6a' }, arcane: { ic: 'e_star', col: '#8fb8ff' },
  rage: { ic: 't_rage', col: '#ff4a3a' }, curse: { ic: 'e_curse', col: '#b86bff' }, revive: { ic: 'e_soul', col: '#e8e0ff' },
  aura_heal: { ic: 't_heal', col: '#7fff9a', aura: 1 }, aura_guard: { ic: 't_shield', col: '#9fc8ff', aura: 1 }, aura_atk: { ic: 't_sword', col: '#ff8a6a', aura: 1 },
  aura_speed: { ic: 'e_speed', col: '#ffe060', aura: 1 }, aura_mana: { ic: 'e_mana', col: '#6fb8ff', aura: 1 }, aura_frost: { ic: 'e_frost', col: '#bfefff', aura: 1, fl: 'frost' },
  aura_weak: { ic: 'e_curse', col: '#b86bff', aura: 1, fl: 'curse' }, aura_blood: { ic: 'e_fang', col: '#ff4a5a', aura: 1, fl: 'rage' },
};
M.AW_KIND = KIND;
const icc = (k, s) => M.iconCanvas(k, s || 2);

// ───────── the awakening: gather → burst → the emblem rises and settles over the head ─────────
const AW_LEN = 1.55, RISE0 = 0.34, RISE1 = 1.05;
const where = (e, T) => { let x = e.x, y = e.y; if (e.leap) { const q = cl((T - e.leap.t0) / e.leap.dur, 0, 1); x = e.leap.x0 + (e.leap.x1 - e.leap.x0) * q; y = e.leap.y0 + (e.leap.y1 - e.leap.y0) * q - Math.sin(q * Math.PI) * 180; } return { x, y, chest: y - 44 * e.sz, head: y - 88 * e.sz - 40 }; };
const glow = (ctx, x, y, r, c, a) => { if (M.glow) M.glow(ctx, x, y, r, c, a); };
const add = (ctx, fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };
// flourishes, one per kind (0.3s … 1.45s after the awakening starts; q runs 0→1 over that span)
const FL = {
  skull: (ctx, a, q, P, T) => { add(ctx, () => { for (let i = 0; i < 5; i++) { const k = (q * 1.3 + i / 5) % 1, ang = i * 1.3 + q * 6; ctx.globalAlpha = (1 - k) * (1 - q) * 0.9; ctx.fillStyle = a.col; ctx.beginPath(); ctx.ellipse(P.x + Math.cos(ang) * 30 * (1 - k), P.y - k * 150, 9 * (1 - k * 0.5), 14, 0, 0, 7); ctx.fill(); } });
    ctx.save(); ctx.globalAlpha = (1 - q) * 0.55; ctx.fillStyle = '#140a18'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(P.x + Math.cos(i) * 40 * q, P.y - 10 - q * 30 * (i % 3), 18 + q * 20, 0, 7); ctx.fill(); } ctx.restore(); },
  venom: (ctx, a, q, P) => { add(ctx, () => { for (let i = 0; i < 14; i++) { const k = (q * 1.4 + (i * 0.37) % 1) % 1; ctx.globalAlpha = (1 - k) * (1 - q * 0.6); ctx.strokeStyle = a.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x + Math.sin(i * 2.1) * 50, P.y - 10 - k * 140, 4 + (i % 3) * 3, 0, 7); ctx.stroke(); } ctx.globalAlpha = (1 - q) * 0.5; ctx.fillStyle = a.col; ctx.beginPath(); ctx.ellipse(P.x, P.y, 90 * eo(q), 22 * eo(q), 0, 0, 7); ctx.fill(); }); },
  summon: (ctx, a, q, P, T) => { add(ctx, () => { ctx.save(); ctx.translate(P.x, P.y); ctx.scale(1, 0.34); const r = 40 + 80 * eo(q); ctx.globalAlpha = 1 - q * q; ctx.strokeStyle = a.col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, 7); ctx.stroke(); ctx.rotate(T * 2); for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(r * 0.7, 0); ctx.lineTo(r, 0); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fillRect(r * 0.84 - 3, -3, 6, 6); } ctx.restore();
    for (let i = 0; i < 10; i++) { const k = (q * 1.6 + i / 10) % 1; ctx.globalAlpha = (1 - k) * (1 - q); ctx.fillStyle = i % 2 ? '#ffffff' : a.col; ctx.fillRect(P.x + Math.cos(i * 2.4) * 70 * (1 - k * 0.3), P.y - k * 170, 5, 5); } }); },
  heal: (ctx, a, q, P) => { add(ctx, () => { ctx.globalAlpha = (1 - q) * 0.55; ctx.fillStyle = a.col; const s = 60 + 50 * eo(q); ctx.fillRect(P.x - s * 0.18, P.chest - s, s * 0.36, s * 2); ctx.fillRect(P.x - s, P.chest - s * 0.18, s * 2, s * 0.36);
    for (let i = 0; i < 9; i++) { const k = (q * 1.5 + i / 9) % 1, x = P.x + Math.sin(i * 1.9) * 60, y = P.y - 10 - k * 170; ctx.globalAlpha = (1 - k) * (1 - q * 0.5); ctx.fillStyle = i % 3 ? a.col : '#ffffff'; ctx.fillRect(x - 7, y - 2, 14, 4); ctx.fillRect(x - 2, y - 7, 4, 14); } }); },
  guard: (ctx, a, q, P, T) => { add(ctx, () => { const r = 70 + 20 * eo(q), h = 110; ctx.globalAlpha = (1 - q) * 0.9; ctx.strokeStyle = a.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(P.x, P.y - 4, r, h, 0, Math.PI, 0); ctx.stroke();
    ctx.lineWidth = 1.5; for (let row = 0; row < 4; row++) for (let col = -3; col <= 3; col++) { const hx = P.x + col * 22 + (row % 2) * 11, hy = P.y - 20 - row * 24; if (((hx - P.x) / r) ** 2 + ((hy - P.y) / h) ** 2 > 1) continue; ctx.beginPath(); for (let k = 0; k < 6; k++) { const an = k * Math.PI / 3; ctx.lineTo(hx + Math.cos(an) * 10, hy + Math.sin(an) * 10); } ctx.closePath(); ctx.stroke(); }
    ctx.globalAlpha = (1 - q) * 0.25; ctx.fillStyle = a.col; ctx.beginPath(); ctx.ellipse(P.x, P.y - 4, r, h, 0, Math.PI, 0); ctx.fill(); }); },
  thorns: (ctx, a, q, P) => { add(ctx, () => { const e = eo(Math.min(1, q * 2)); ctx.globalAlpha = 1 - q; ctx.fillStyle = a.col; for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6, r0 = 30, r1 = 30 + 80 * e; ctx.beginPath(); ctx.moveTo(P.x + Math.cos(an - 0.12) * r0, P.chest + Math.sin(an - 0.12) * r0); ctx.lineTo(P.x + Math.cos(an) * r1, P.chest + Math.sin(an) * r1); ctx.lineTo(P.x + Math.cos(an + 0.12) * r0, P.chest + Math.sin(an + 0.12) * r0); ctx.fill(); } }); },
  speed: (ctx, a, q, P) => { add(ctx, () => { for (let i = 0; i < 10; i++) { const k = (q * 2.2 + i / 10) % 1, y = P.y - 20 - i * 12, x0 = P.x + 160 - k * 360; ctx.globalAlpha = (1 - q) * 0.9; ctx.strokeStyle = i % 2 ? a.col : '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 70, y); ctx.stroke(); } }); },
  frost: (ctx, a, q, P) => { add(ctx, () => { const e = eo(q); for (let i = 0; i < 10; i++) { const an = i * 0.628 + 0.3, r = 20 + 110 * e; ctx.save(); ctx.translate(P.x + Math.cos(an) * r, P.chest + Math.sin(an) * r * 0.6); ctx.rotate(an); ctx.globalAlpha = 1 - q; ctx.fillStyle = i % 2 ? a.col : '#ffffff'; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(0, -5); ctx.lineTo(16, 0); ctx.lineTo(0, 5); ctx.fill(); ctx.restore(); }
    ctx.globalAlpha = (1 - q) * 0.4; ctx.fillStyle = '#dff8ff'; ctx.beginPath(); ctx.ellipse(P.x, P.y, 110 * e, 26 * e, 0, 0, 7); ctx.fill(); }); },
  fire: (ctx, a, q, P, T) => { add(ctx, () => { const r = 30 + 90 * eo(q); for (let i = 0; i < 16; i++) { const an = i * Math.PI / 8, x = P.x + Math.cos(an) * r, y = P.y + Math.sin(an) * r * 0.3, h = (26 + 20 * Math.abs(Math.sin(T * 9 + i))) * (1 - q); ctx.globalAlpha = 1 - q * 0.8; ctx.fillStyle = i % 2 ? '#ffd23a' : a.col; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x, y - h); ctx.lineTo(x + 8, y); ctx.fill(); } }); },
  bolt: (ctx, a, q, P, T) => { if (q < 0.35) add(ctx, () => { ctx.globalAlpha = 1 - q / 0.35; if (M.bolt) M.bolt(ctx, P.x + 30, -40, P.x, P.chest, a.col, 7, Math.floor(T * 30)); }); FL.speed(ctx, a, q, P); },
  gold: (ctx, a, q, P) => { for (let i = 0; i < 12; i++) { const an = -Math.PI / 2 + (i - 5.5) * 0.18, v = 380 + (i % 3) * 60, t = q * 1.1, x = P.x + Math.cos(an) * v * t, y = P.chest + Math.sin(an) * v * t + 520 * t * t; if (y > P.y + 10) continue; ctx.save(); ctx.globalAlpha = 1 - q * 0.6; ctx.fillStyle = '#e8a820'; ctx.beginPath(); ctx.ellipse(x, y, 8 * Math.abs(Math.cos(q * 12 + i)) + 1.5, 8, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff0a0'; ctx.fillRect(x - 1, y - 4, 2, 8); ctx.restore(); } },
  growth: (ctx, a, q, P) => { add(ctx, () => { for (let i = 0; i < 12; i++) { const k = (q * 1.4 + i / 12) % 1, x = P.x + (i - 5.5) * 12, y = P.y - k * 220; ctx.globalAlpha = (1 - k) * (1 - q * 0.5); ctx.fillStyle = i % 2 ? a.col : '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 6, y); ctx.lineTo(x - 6, y); ctx.fill(); } }); },
  stealth: (ctx, a, q, P) => { ctx.save(); for (let i = 0; i < 9; i++) { const an = i * 0.7, r = 20 + 70 * eo(q); ctx.globalAlpha = (1 - q) * 0.6; ctx.fillStyle = i % 2 ? '#3a3448' : '#5a5470'; ctx.beginPath(); ctx.arc(P.x + Math.cos(an) * r, P.y - 30 - Math.sin(an) * r * 0.4 - q * 30, 22 + 14 * q, 0, 7); ctx.fill(); } ctx.restore(); },
  leap: (ctx, a, q, P) => { add(ctx, () => { const e = eo(q); ctx.globalAlpha = 1 - q; ctx.strokeStyle = a.col; ctx.lineWidth = 5; for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + 0.2; ctx.beginPath(); ctx.moveTo(P.x + Math.cos(an) * 20, P.y + Math.sin(an) * 6); ctx.lineTo(P.x + Math.cos(an) * (40 + 90 * e), P.y + Math.sin(an) * (12 + 26 * e)); ctx.stroke(); } });
    ctx.save(); ctx.globalAlpha = (1 - q) * 0.5; ctx.fillStyle = '#8a7a60'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(P.x + (i - 3) * 26 * eo(q), P.y - 8 - Math.abs(i - 3) * 3, 14 + 8 * q, 0, 7); ctx.fill(); } ctx.restore(); },
  blade: (ctx, a, q, P) => { add(ctx, () => { const e = eo(Math.min(1, q * 2.5)); ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6 * (1 - q) + 1; ctx.beginPath(); ctx.moveTo(P.x - 80 * e, P.chest - 80 * e); ctx.lineTo(P.x + 80 * e, P.chest + 80 * e); ctx.moveTo(P.x + 80 * e, P.chest - 80 * e); ctx.lineTo(P.x - 80 * e, P.chest + 80 * e); ctx.stroke();
    ctx.strokeStyle = a.col; ctx.lineWidth = 14 * (1 - q); ctx.globalAlpha = (1 - q) * 0.5; ctx.stroke(); }); },
  arcane: (ctx, a, q, P, T) => { add(ctx, () => { for (let i = 0; i < 6; i++) { const an = T * 2.5 + i * Math.PI / 3, r = 40 + 60 * eo(q); const x = P.x + Math.cos(an) * r, y = P.chest + Math.sin(an) * r * 0.55; ctx.globalAlpha = 1 - q; ctx.fillStyle = i % 2 ? a.col : '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 3, y - 3); ctx.lineTo(x + 12, y); ctx.lineTo(x + 3, y + 3); ctx.lineTo(x, y + 12); ctx.lineTo(x - 3, y + 3); ctx.lineTo(x - 12, y); ctx.lineTo(x - 3, y - 3); ctx.fill(); } }); },
  rage: (ctx, a, q, P, T) => { add(ctx, () => { for (let i = 0; i < 12; i++) { const x = P.x + (i - 5.5) * 9, h = (60 + 50 * Math.abs(Math.sin(T * 11 + i * 1.7))) * (1 - q); ctx.globalAlpha = (1 - q) * 0.8; ctx.fillStyle = i % 2 ? a.col : '#ffb060'; ctx.beginPath(); ctx.moveTo(x - 7, P.y); ctx.lineTo(x, P.y - h); ctx.lineTo(x + 7, P.y); ctx.fill(); } }); },
  curse: (ctx, a, q, P, T) => { add(ctx, () => { for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(P.x, P.y); ctx.scale(1, 0.3); ctx.rotate(T * (i % 2 ? -2 : 2)); ctx.globalAlpha = (1 - q) * 0.9; ctx.strokeStyle = a.col; ctx.lineWidth = 5; ctx.setLineDash([18, 12]); ctx.beginPath(); ctx.arc(0, 0, 50 + i * 30 + 30 * eo(q), 0, 7); ctx.stroke(); ctx.restore(); } }); },
  revive: (ctx, a, q, P) => { add(ctx, () => { ctx.globalAlpha = (1 - q) * 0.8; const g = ctx.createLinearGradient(0, P.y, 0, P.y - 260); g.addColorStop(0, a.col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(P.x - 50 * (1 - q * 0.5), P.y - 260, 100 * (1 - q * 0.5), 260); }); FL.skull(ctx, a, q, P); },
};
// auras also reach out to every ally they cover
function auraLinks(ctx, a, q, P, b) { const e = a.e; if (!b) return; const allies = b.ents.filter(o => o.alive && o !== e && o.side === e.side && Math.hypot(o.x - e.x, o.y - e.y) < 330); add(ctx, () => { allies.forEach((o, i) => { const k = cl((q - i * 0.05) * 1.8, 0, 1); if (k <= 0) return; ctx.globalAlpha = (1 - q) * 0.9; ctx.strokeStyle = a.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(P.x, P.chest); ctx.lineTo(P.x + (o.x - P.x) * k, P.chest + (o.y - 44 * o.sz - P.chest) * k); ctx.stroke(); if (k >= 1) glow(ctx, o.x, o.y - 44 * o.sz, 50, a.col, 0.5 * (1 - q)); });
  for (let i = 0; i < 2; i++) { ctx.save(); ctx.translate(P.x, P.y); ctx.scale(1, 0.32); ctx.globalAlpha = (1 - q) * (i ? 0.5 : 0.9); ctx.strokeStyle = a.col; ctx.lineWidth = 6 - i * 2; ctx.beginPath(); ctx.arc(0, 0, 330 * eo(cl(q * 1.5 - i * 0.2, 0, 1)), 0, 7); ctx.stroke(); ctx.restore(); } }); }
function emblemAt(ctx, ic, x, y, s, col, a) { const cv = icc(ic, 2); if (!cv) return; ctx.save(); ctx.globalAlpha = a; glow(ctx, x, y, 34 * s, col, 0.55); ctx.imageSmoothingEnabled = false; const w = 30 * s; ctx.drawImage(cv, x - w / 2, y - w / 2, w, w); ctx.restore(); }
function drawAwake(ctx, a, T, b) {
  const e = a.e, d = T - a.t0; if (d < 0) return true; if (d > AW_LEN || !e.alive) return false;
  const P = where(e, T), big = a.big;
  // 1 · gather: streaks spiral into the chest
  if (d < RISE0) add(ctx, () => { const q = d / RISE0; for (let i = 0; i < 14; i++) { const an = i / 14 * 6.283 + a.seed + q * 2, r = (1 - q) * 130 * e.sz + 10, x = P.x + Math.cos(an) * r * 1.2, y = P.chest + Math.sin(an) * r * 0.7; ctx.globalAlpha = 0.3 + 0.7 * q; ctx.strokeStyle = i % 3 ? a.col : '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (P.x - x) * 0.25, y + (P.chest - y) * 0.25); ctx.stroke(); } glow(ctx, P.x, P.chest, 60 * q + 20, a.col, 0.6 * q); });
  // 2 · burst: ground shockwave, a pillar of light, sparks
  if (d >= RISE0 && !a.hit) { a.hit = 1; e.flash = Math.max(e.flash || 0, 0.14); try { const s = a.k === 'gold' ? S.coin : a.k === 'heal' || a.k === 'aura_heal' ? S.heal : a.k === 'bolt' ? S.bolt : S.sparkle; if (s && (!S.lim || S.lim('awake', 70))) s.call(S); } catch (err) {} }
  const q = cl((d - RISE0) / (AW_LEN - RISE0), 0, 1);
  if (d >= RISE0) add(ctx, () => {
    const qb = cl((d - RISE0) / 0.55, 0, 1);
    if (qb < 1) { ctx.save(); ctx.translate(P.x, P.y); ctx.scale(1, 0.3); ctx.globalAlpha = 1 - qb; ctx.strokeStyle = a.col; ctx.lineWidth = 12 * (1 - qb) + 2; ctx.beginPath(); ctx.arc(0, 0, (30 + 150 * eo(qb)) * e.sz, 0, 7); ctx.stroke(); ctx.restore();
      const pw = (big ? 70 : 44) * (1 - qb) * e.sz, g = ctx.createLinearGradient(0, P.y, 0, P.y - 420); g.addColorStop(0, a.col); g.addColorStop(0.6, a.col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = (1 - qb) * 0.75; ctx.fillStyle = g; ctx.fillRect(P.x - pw / 2, P.y - 420, pw, 420); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = (1 - qb) * 0.8; ctx.fillRect(P.x - pw / 6, P.y - 420, pw / 3, 420);
      for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283 + a.seed, r0 = 20, r1 = 30 + 130 * eo(qb); ctx.globalAlpha = 1 - qb; ctx.strokeStyle = i % 2 ? a.col : '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(P.x + Math.cos(an) * r0, P.chest + Math.sin(an) * r0 * 0.8); ctx.lineTo(P.x + Math.cos(an) * r1, P.chest + Math.sin(an) * r1 * 0.8); ctx.stroke(); } }
  });
  if (d >= RISE0) { const f = FL[a.fl] || FL.arcane; f(ctx, a, q, P, T); if (a.aura) auraLinks(ctx, a, q, P, b); }
  // 3 · the emblem bursts out of the chest, overshoots and settles over the head
  if (d >= RISE0 - 0.02) { const r = cl((d - RISE0) / (RISE1 - RISE0), 0, 1), y = P.chest + (P.head - P.chest) * eb(r), s = 0.3 + 1.2 * eb(r) - 0.35 * cl((d - RISE1 + 0.25) / 0.3, 0, 1);
    emblemAt(ctx, a.ic, P.x, y, s * (big ? 1.25 : 1), a.col, 1); if (r < 1) add(ctx, () => { ctx.globalAlpha = 1 - r; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, y, 22 + 40 * r, 0, 7); ctx.stroke(); }); }
  return true;
}
// the emblem stays over the head; it flares when the trait fires
function drawEmblem(ctx, e, T) {
  const E = e._emb; if (!E || T < E.t0 + RISE1 || !e.alive || e.bench) return; const P = where(e, T), p = E.pulse != null ? cl((T - E.pulse) / 0.5, 0, 1) : 1;
  const s = 0.9 + (p < 1 ? 0.6 * Math.sin(p * Math.PI) : 0), bob = Math.sin(T * 2.2 + e.id) * 3;
  emblemAt(ctx, E.ic, P.x, P.head + bob, s * (E.big ? 1.1 : 1), E.col, e.stealth ? 0.4 : 1);
  if (p < 1) add(ctx, () => { ctx.globalAlpha = 1 - p; ctx.strokeStyle = E.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(P.x, P.head + bob, 20 + 50 * p, 0, 7); ctx.stroke(); });
}
// a death trait's emblem leaves the body: to the killer (poison, curses) or up into a burst
function drawRelease(ctx, r, T) {
  const d = T - r.t0; if (d > 0.75) return false; const q = eo(cl(d / 0.55, 0, 1)), x = r.x0 + (r.x1 - r.x0) * q, y = r.y0 + (r.y1 - r.y0) * q - Math.sin(q * Math.PI) * 90;
  if (d < 0.55) { emblemAt(ctx, r.ic, x, y, 1.1, r.col, 1); add(ctx, () => { ctx.globalAlpha = 0.6; ctx.strokeStyle = r.col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(r.x0 + (r.x1 - r.x0) * q * 0.6, r.y0 + (r.y1 - r.y0) * q * 0.6); ctx.lineTo(x, y); ctx.stroke(); }); }
  else add(ctx, () => { const k = (d - 0.55) / 0.2; ctx.globalAlpha = 1 - k; ctx.fillStyle = r.col; for (let i = 0; i < 12; i++) { const an = i * 0.52; ctx.fillRect(r.x1 + Math.cos(an) * 60 * k - 4, r.y1 + Math.sin(an) * 60 * k - 4, 8, 8); } glow(ctx, r.x1, r.y1, 90, r.col, 0.8 * (1 - k)); });
  return true;
}

// ───────── battle hooks ─────────
const P = M.Battle3 && M.Battle3.prototype;
if (P) {
  const oCall = P.call;
  P.call = function (e, hook, x) {
    if (e && !e.isHero && e.d) {
      if (hook === 'start' && !e._aw) { const aw = M.unitAw(e.key || e.kind); if (aw) { e._aw = 1; const K = KIND[aw.cat] || KIND.arcane, ally = e.side === 'A', n = ally ? (this._awN = (this._awN || 0) + 1) - 1 : 0;
        const a = { e, k: aw.cat, ic: K.ic, col: aw.col || K.col, fl: K.fl || aw.cat.replace(/^aura_/, ''), aura: !!K.aura, big: (e.d.q || 0) >= 2 || e.boss, seed: Math.random() * 6, t0: this.t + (ally ? 0.05 + n * 0.13 : 0.55) };
        if (!FL[a.fl]) a.fl = { heal: 'heal', guard: 'guard', atk: 'blade', speed: 'speed', mana: 'arcane' }[a.fl] || 'arcane';
        (this.awk = this.awk || []).push(a); e._emb = { ic: a.ic, col: a.col, t0: a.t0, big: a.big, k: a.k }; } }
      else if (hook === 'death' && e._emb) { const P0 = where(e, this.t), k = x && x.alive && x !== e ? x : null; (this.awr = this.awr || []).push({ ic: e._emb.ic, col: e._emb.col, t0: this.t, x0: P0.x, y0: P0.head, x1: k ? k.x : P0.x, y1: k ? k.y - 60 * k.sz : P0.head - 120 }); }
      else if ((hook === 'full' || hook === 'kill') && e._emb && (e._emb.pulse == null || this.t - e._emb.pulse > 0.8)) e._emb.pulse = this.t;
    }
    return oCall.apply(this, arguments);
  };
}
const oHud = M.drawBattleHudPx;
M.drawBattleHudPx = function (ctx, b, T) {
  try {
    if (b.awk && b.awk.length) b.awk = b.awk.filter(a => drawAwake(ctx, a, T, b));
    for (const e of b.ents) if (e._emb) drawEmblem(ctx, e, T);
    if (b.awr && b.awr.length) b.awr = b.awr.filter(r => drawRelease(ctx, r, T));
  } catch (err) { (window.__mcErrs = window.__mcErrs || []).push('awaken: ' + (err && err.message)); }
  return oHud ? oHud.apply(this, arguments) : undefined;
};
})();

;
