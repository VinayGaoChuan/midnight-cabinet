// ==== mc-races.js ====
(function () {
// Races, back (user ruling 2026-09-27: 「每个部队增加种族（以前有，后来删了，现在恢复）」, the six below approved the same day).
// The 33 lines are sorted by what they look like into six races of 5–6 lines, two front lines each, so every race can make a
// team (docs/design.md §7.3). The race the art was drawn for stays in d.race0 (projectile looks, old head art); enemy-only
// units keep their own races (恶魔, 混沌, 僵尸 …). Loaded right after mc-lines.js, before anything that sorts units by race
// (the worlds' themed enemies, mc-game-h.js).
const M = window.MC, DB = M.DB;
const RACE_OF = {
  FootSoldier: '人类', HolyLightKnight: '人类', Ranger: '人类', Gladiator: '人类', MageApprentice: '人类',
  // 2026-09-27: three lines changed race so no race holds one vocation twice (a pool takes one line per race and vocation,
  // mc-pool.js; 亡灵 had two 守护者 and two 祭司, 自然 two 牧师, 深海 two 战士 — 亡灵 could never field the 5 lines of its top bond)
  BloodKnight: '亡灵', SlaveLord: '亡灵', Archer: '亡灵', Mage: '亡灵', SnakeGodMessenger: '亡灵',
  BigWildBoar: '野兽', LionHammer: '野兽', Summoner: '野兽', GreenDragon: '野兽', Chick: '野兽', JadeBeast: '野兽',
  VoodooBeliever: '自然', LifeTree: '自然', WildMage: '自然', DesertBeliever: '自然', DarkFang: '自然',
  Berserker: '深海', CursedSwordsman: '深海', WaterWarrior: '深海', CrabWarlock: '深海', VikingPirate: '深海', WarpWing: '深海',
  Skybot: '异界', YellowManeHorse: '异界', Bat: '异界', BlackSword: '异界', ShadowSwordsman: '异界', TimeMage: '异界',
};
M.RACE_OF = RACE_OF;
M.RACE6 = ['人类', '亡灵', '野兽', '自然', '深海', '异界'];
Object.keys(DB).forEach(k => { const d = DB[k]; if (!d || !d.line || !RACE_OF[d.line]) return; if (d.race0 == null) d.race0 = d.race; d.race = RACE_OF[d.line]; });
// the races' colours (人类, 野兽, 自然 keep theirs)
Object.assign(M.RACES, { 亡灵: '#bfe0f0', 深海: '#5fb8ff', 异界: '#c890ff' });
M.raceLines = (race) => Object.keys(RACE_OF).filter(l => RACE_OF[l] === race && DB[l + '_T1']);
})();
