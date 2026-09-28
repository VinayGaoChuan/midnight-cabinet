// ==== mc-tune.js ====
(function () {
// The numbers table (docs/design.md §15.4, step 0 of the tuning plan, 2026-09-28): every coefficient that shapes the game's
// difficulty and economy, by layer, with what it does and where it lives. The numbers stay where they are defined (each
// file owns its own); this is the one place that lists them, reads and sets them by name (the sims and the bot matrix use
// M.tuneSet to try a value without rebuilding) and prints the table (node tools/tune.js → .ai/tune.md).
const M = window.MC;
const T = M.TUNE = [
  // ── one fight ──
  ['一场仗', 'BAL.ENEMY_K', '出征敌人整体系数（乘在生命和攻击上）', 'mc-battle4.js'],
  ['一场仗', 'CHAPTER_EK', '每一章的敌人系数', 'mc-scenes.js'],
  ['一场仗', 'E_SHOW', '所有仗显示战斗力的系数（显示 1.0 ≈ 赢一半）', 'mc-power.js'],
  ['一场仗', 'MB_SHOW', '小首领显示战斗力的系数', 'mc-power.js'],
  ['一场仗', 'FB_SHOW', '最终首领显示战斗力的系数', 'mc-power.js'],
  ['一场仗', 'BAL.MANA_MUL', '我方部队法力回复倍数', 'mc-battle4.js'],
  ['一场仗', 'BAL.ALLY_FLOOR', '我方部队每秒至少回的法力', 'mc-battle4.js'],
  ['一场仗', 'MAGE_SPLASH', '法师普攻溅射（比例、半径）', 'mc-vocplay.js'],
  ['一场仗', 'POWER_K', '战斗力公式里的系数', 'mc-voc.js'],
  // ── bosses ──
  ['首领', 'ELITE_T', '精英战敌人倍数（检查点）', 'mc-power.js'],
  ['首领', 'BOSS_T0', '一趟第一个小首领 = 同站精英战 ×', 'mc-power.js'],
  ['首领', 'BOSS_TM', '后面的小首领 = 同站精英战 ×', 'mc-power.js'],
  ['首领', 'BOSS_TF', '最终首领 = 同站精英战 ×', 'mc-power.js'],
  ['首领', 'FBK.p2As', '最终首领第二阶段出手加快', 'mc-bossfight.js'],
  ['首领', 'BOSS_KIT', '每个首领的真实强度 tr 和血攻比 sk（标定表）', 'mc-bosskit.js'],
  // ── one expedition ──
  ['一趟出征', 'KILL_K', '击杀积分 = 敌人价格 ×', 'mc-battle4.js'],
  ['一趟出征', 'BOSS_SCORE', '首领积分 = 这一站预算 ×（再 × KILL_K）', 'mc-battle4.js'],
  ['一趟出征', 'SCORE_CAP', '一仗积分封顶（× 最高品质卡价）', 'mc-pool.js'],
  ['一趟出征', 'CHAPTER_GRANT', '路标补给：开局积分占预算的比例', 'mc-scenes.js'],
  ['一趟出征', 'STREAK', '连战首领的积分加成', 'mc-scenes.js'],
  ['一趟出征', 'ROSTER_BASE', '出征上场人数（起步）', 'mc-roster.js'],
  ['一趟出征', 'ROSTER_MAX', '出征上场人数（上限）', 'mc-roster.js'],
  ['一趟出征', 'EVO_NEED', '几支相同的合成一支', 'mc-evo.js'],
  ['一趟出征', 'POOL_COPIES', '部队池里每条链的份数', 'mc-evo.js'],
  ['一趟出征', 'FAIL_EXP', '失败时领袖经验的比例', 'mc-revive.js'],
  // ── one game ──
  ['一局', 'GDIFF', '四档难度：目标夜、夜晚强度、出征敌人、心、主基地、收获、代币', 'mc-gdiff.js'],
  ['一局', 'MOON_K', '血月：整夜强度倍数', 'mc-gdiff.js'],
  ['一局', 'PROS_LV', '繁荣度门槛', 'mc-rules26.js'],
  ['一局', 'PROS_Q', '房间按品质给的繁荣度', 'mc-q6.js'],
  ['一局', 'PROS_NIGHT', '每守住一夜给的繁荣度', 'mc-wonders.js'],
  ['一局', 'LAND_N', '每一级繁荣度累计开的地块', 'mc-rules26.js'],
  ['一局', 'PORTAL_BASE', '主基地耐久基数', 'mc-rules26.js'],
  ['一局', 'PORTAL_PROS', '每级繁荣度给主基地耐久', 'mc-rules26.js'],
  ['一局', 'DEMOLISH_COST', '拆除一座房间的物资', 'mc-rules26.js'],
  ['一局', 'RESPEC_K', '洗天赋的价钱系数', 'mc-talent.js'],
  ['一局', 'SUP_UP', '军需处：升档价 = 两档价差 ×', 'mc-bastion.js'],
  ['一局', 'RECRUIT_SUP', '在基地招募一支部队的物资', 'mc-soul.js'],
  // ── the night ──
  ['守夜', 'RAID_CROWD', '人海：开局数量、每天加多少、上限、纵深', 'mc-night.js'],
  ['守夜', 'RAID_CURVE', '按天的怪物强度倍数', 'mc-siege.js'],
  ['守夜', 'RAID_SIZE', '怪物体型', 'mc-bastion.js'],
  ['守夜', 'RAID_SHARD', '灵魂碎片掉落概率', 'mc-bastion.js'],
  ['守夜', 'NIGHT', '强敌 / 首领之夜的倍数、屋顶、砸地', 'mc-night.js'],
  ['守夜', 'MB_BOW', '主基地的两把弩', 'mc-siege.js'],
  ['守夜', 'DOME', '防御罩', 'mc-siege.js'],
  ['守夜', 'ELDER', '守望古树', 'mc-siege.js'],
  ['守夜', 'SIEGE_K', '怪物打建筑的倍数', 'mc-siege.js'],
  ['守夜', 'FORT', '加固：生命、伤害、价钱', 'mc-siege.js'],
  ['守夜', 'GAR', '驻军上限：起步、每级繁荣度、每档难度、封顶', 'mc-bastion.js'],
  ['守夜', 'GAR_UP', '驻军升档的灵魂碎片', 'mc-roster.js'],
];
const get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), M);
M.tuneGet = get;
M.tuneSet = function (path, v) { const ks = path.split('.'), last = ks.pop(), o = ks.reduce((a, k) => (a == null ? undefined : a[k]), M); if (o == null) return false; o[last] = v; if (path.indexOf('BAL.') === 0 && M.setBal) M.setBal({}); return true; };
const show = (v) => { if (v == null) return '—'; if (typeof v === 'number') return String(+v.toFixed(4)); try { const s = JSON.stringify(v, (k, x) => (typeof x === 'number' ? +x.toFixed(3) : typeof x === 'function' ? undefined : x)); return s.length > 160 ? s.slice(0, 157) + '…' : s; } catch (e) { return String(v); } };
M.tuneTable = function () {
  const out = ['| 层 | 名字 | 现在的值 | 管什么 | 在哪 |', '|---|---|---|---|---|'];
  T.forEach(([layer, path, what, where]) => { let v = get(path); if (path === 'BOSS_KIT' && v) v = Object.keys(v).length + ' 个首领'; if (path === 'GDIFF' && v) v = v.map(D => D.n + ' ' + D.goal + ' 夜 · 夜晚 ×' + D.night + ' · 出征 ×' + D.foe + ' · ' + D.core + ' 心').join('；'); out.push('| ' + layer + ' | `' + path + '` | ' + show(v).replace(/\|/g, '/') + ' | ' + what + ' | ' + where + ' |'); });
  return out.join('\n');
};
})();
