// ==== mc-data3.js ====
(function () {
const M = window.MC;
const { SP, UNITS, pick, wpick, nice, baseS, ENEMIES, TIERS, HEROES, TALENTS, STATS } = M;

// ───────── unified quality: 普通（白）/ 稀有（蓝）/ 史诗（紫）/ 传说（金）; names always show as 名字（品质） in the quality colour ─────────
const QUALITY = [ { n:'普通', c:'#c4ccd9', m:1 }, { n:'稀有', c:'#47d6c1', m:1.5 }, { n:'史诗', c:'#b86bff', m:2.2 }, { n:'传说', c:'#ffcf4a', m:3.2 } ];
TIERS.splice(0, TIERS.length, ...QUALITY.map(q => ({ n: q.n, c: q.c })));
const RARITY = [ { n:'普通', c:QUALITY[0].c, w:55, tiers:3, stat:1 }, { n:'稀有', c:QUALITY[1].c, w:30, tiers:3, stat:1.08 }, { n:'史诗', c:QUALITY[2].c, w:12, tiers:4, stat:1.18 }, { n:'传说', c:QUALITY[3].c, w:3, tiers:4, stat:1.3 } ];
Object.assign(STATS, {
  supplies:{ d:'获得物资 +{v}%', b:0.1, pct:1 }, exp:{ d:'获得经验 +{v}%', b:0.1, pct:1 }, eventLuck:{ d:'事件好结果 +{v}%', b:0.05, pct:1 }, chest:{ d:'宝箱积分 +{v}%', b:0.15, pct:1 },
  killHeal:{ d:'领袖击杀回复 {v}% 生命', b:0.02, pct:1 },
});

// ───────── sprites ─────────
Object.assign(SP, {
  scroll:{pal:{p:'#e8d8b0',P:'#b09a6a',k:'#5a4020',r:'#c03a3a'},rows:[".kkkkkkk.","kPppppppk",".pppppppk",".pkkkkppk",".pppppppk",".pkkkppp.",".pppppprk","kPppppprk",".kkkkkkk."]},
  gem:{pal:{w:'#ffffff',c:'#7fe0ff',C:'#2a8ab0'},rows:["..www..",".wcccw.","wcccccC","CcccccC",".CcccC.","..CCC..","...C..."]},
  orb:{pal:{w:'#ffffff',g:'#9cff7a',G:'#3a8a2a'},rows:["..ggg..",".gwggg.","gwggggG","gggggGG","ggggGGG",".gGGGG.","..GGG.."]},
  shard:{pal:{w:'#f0d8ff',p:'#b86bff',P:'#5a2a8a'},rows:["...w...","..wp...","..ppP..",".pppP..",".ppPP..","..pP...","..P...."]},
  sack:{pal:{b:'#8a6a3a',B:'#5a4020',k:'#3a2a10',y:'#ffcc33'},rows:["..kkk..","...k...",".bbbbb.","bbbybbb","bbyyybB","bbbybbB",".BBBBB."]},
  r_eye:{pal:{w:'#fff',g:'#ffcc33',r:'#d0453c',k:'#111'},rows:["..gggg..",".gwwwwg.","gwwrrwwg","gwrkkrwg","gwwrrwwg",".gwwwwg.","..gggg.."]},
  r_blade:{pal:{s:'#e8f0fa',S:'#8a95a3',g:'#ffcc33',b:'#6a3a1a'},rows:["......s",".....sS","....sS.","...sS..","g.sS...",".gS....","bgg....","b......"]},
  r_ring:{pal:{g:'#ffcc33',G:'#b08a20',r:'#ff4a6a'},rows:["..rr..",".rrrr.","gg..gg","g....G","g....G","gG..GG",".GGGG."]},
  r_dice:{pal:{w:'#f5ead4',W:'#b8a888',k:'#111'},rows:["wwwwwww","wkwwwkw","wwwwwwW","wwwkwwW","wwwwwwW","wkwwwkW","WWWWWWW"]},
  r_book:{pal:{p:'#5a2a8a',P:'#3a1a5a',w:'#f5ead4',g:'#ffcc33'},rows:["ppppppp","pgpppgw","ppgggpw","ppgpgpw","ppgggpw","pgpppgw","PPPPPPP"]},
  r_gear:{pal:{g:'#c7803a',G:'#7a4a1a',k:'#2a1a10'},rows:[".g.g.g.","ggggggg",".gGkGg.","ggkkkgg",".gGkGg.","ggggggg",".g.g.g."]},
  r_crown:{pal:{g:'#ffcc33',G:'#b08a20',r:'#d0453c',b:'#6fa8dc'},rows:["g..g..g","gg.g.gg","ggggggg","grgbgrg","ggggggg","GGGGGGG"]},
  r_heart:{pal:{r:'#e03a4a',R:'#8a1a2a',w:'#ffb0b8'},rows:[".rr.rr.","rwrrrrr","rrrrrrR","rrrrrRR",".rrrRR.","..rRR..","...R..."]},
  r_feather:{pal:{w:'#f5f0ff',c:'#9fe8ff',k:'#5a6a7a'},rows:["....ww.","...wcw.","..wcw..",".wcw...",".cw....","k......"]},
  r_skull:{pal:{w:'#efe6da',W:'#a89888',k:'#111'},rows:[".wwwww.","wwwwwww","wkkwkkw","wkkwkkw","wwwkwww",".wwwww.",".wkwkw."]},
  r_mask:{pal:{w:'#f5ead4',k:'#111',r:'#d0453c',g:'#ffcc33'},rows:["ggggggg","gwwwwwg","wkwwwkw","wwwwwww","wwrrrww",".wwwww.","..www.."]},
  r_bell:{pal:{g:'#caa84a',G:'#8a6a20',k:'#3a2a10'},rows:["...k...","..ggg..",".ggggg.",".ggggG.","gggggGG","GGGGGGG","...k..."]},
  r_lantern:{pal:{k:'#3a2a20',y:'#ffcf4a',o:'#ff8a3a'},rows:["..kkk..","...k...",".kkkkk.",".kyyyk.",".kyoyk.",".kyyyk.",".kkkkk."]},
  pine:{pal:{g:'#2a4a3a',G:'#1a3028',b:'#3a2a20'},rows:["....g....","...ggg...","..ggGgg..","...ggg...","..ggGgg..",".gggGggg.","..ggGgg..",".gggGggg.","gggGGGggg","....b....","....b...."]},
  shroom:{pal:{r:'#c04a6a',w:'#f5ead4',s:'#d8c8b0'},rows:[".rrrr.","rwrrwr","rrrrrr","..ss..","..ss..",".ssss."]},
  crystalS:{pal:{c:'#9fe8ff',C:'#4aa8d0',w:'#fff'},rows:["...w..","..cc..",".wcC.c","cccCcC","ccCCcC"]},
  anchor:{pal:{k:'#4a5a6a'},rows:["..kk..","..kk..","kkkkkk","..kk..","..kk..","k.kk.k","kkkkkk"]},
  pipe:{pal:{g:'#8a6a3a',G:'#5a4020',k:'#3a2a10'},rows:["gggggggg","GGGGGGGG","...kk...","...gg...","...gg...","...gg...","..kkkk.."]},
  console:{pal:{k:'#2a3040',c:'#7fe0ff',g:'#9cff7a',r:'#ff4a6a'},rows:["kkkkkkk","kcccccK","kcgcrck","kcccccK","kkkkkkk",".kk.kk."]},
  spike:{pal:{r:'#6a1a1a',o:'#ff6a2a',k:'#2a0a0a'},rows:["...o...","..rr...","..rro..",".rrrr..",".rrrro.","rrrrrrr","kkkkkkk"]},
});

// ───────── heroes: exactly one active skill each, cooldown counted in nodes ─────────
const SK = {
  watchman:{ nodeCd:3, v:(lv) => 2 + 0.25 * lv, d:(v) => '所有敌人停顿 ' + v.toFixed(1) + ' 秒' },
  widow:{ nodeCd:3, v:(lv) => 0.08 + 0.02 * lv, d:(v) => '8 秒内每次击杀，积分倍率 +' + v.toFixed(2) },
  nun:{ nodeCd:3, v:(lv) => 0.3 + 0.03 * lv, d:(v) => '全队回复 ' + Math.round(v * 100) + '% 生命' },
  butcherlord:{ nodeCd:4, v:(lv) => 0.8 + 0.15 * lv, d:(v) => '献祭生命最低的部队，积分倍率 +' + v.toFixed(2) },
  clockmaker:{ nodeCd:3, v:(lv) => 0.5 + 0.05 * lv, d:(v) => '部队攻速 +' + Math.round(v * 100) + '%，持续 6 秒' },
  cremator:{ nodeCd:3, v:(lv) => 0.5 + 0.08 * lv, d:(v) => '点燃所有敌人，每秒 ' + Math.round(v * 100) + '% 领袖攻击' },
};
Object.keys(HEROES).forEach(k => Object.assign(HEROES[k].skill, SK[k]));
M.skillVal = (h) => HEROES[h.cls].skill.v(h.lv);
M.skillDesc = (h) => HEROES[h.cls].skill.d(M.skillVal(h));
M.skillNodeCd = (h, meta) => Math.max(1, HEROES[h.cls].skill.nodeCd + (M.baseMods(meta).skillNodeCd || 0) + Math.round((M.heroMods(h, meta).skillCd || 0) * 3));

// ───────── treasures: each is concrete; quality stacks lines ─────────
const RELICS = {
  herakEye:{ n:'赫拉克之眼', icon:'r_eye', d:'一只不会闭上的眼睛。', lines:[{k:'crit',v:0.05},{k:'heroAtk',v:0.12},{k:'crit',v:0.08},{k:'baseScore',v:0.2}] },
  rustBlade:{ n:'守夜人的锈刀', icon:'r_blade', d:'刀口已经钝了，但它记得每一个夜晚。', lines:[{k:'heroAtk',v:0.15},{k:'unitAtk',v:0.06},{k:'killHeal',v:0.02},{k:'heroAtk',v:0.3}] },
  dealerRing:{ n:'庄家的戒指', icon:'r_ring', d:'戴上它的人，总能多赢一点。', lines:[{k:'startMult',v:0.15},{k:'shop',v:-0.08},{k:'startMult',v:0.25},{k:'baseScore',v:0.25}] },
  loadedDice:{ n:'灌铅骰子', icon:'r_dice', d:'永远是六。几乎。', lines:[{k:'tier',v:0.06},{k:'crit',v:0.05},{k:'tier',v:0.1},{k:'startMult',v:0.4}] },
  necroBook:{ n:'亡者名录', icon:'r_book', d:'书页上会自己多出名字。', lines:[{k:'exp',v:0.15},{k:'unitHp',v:0.08},{k:'exp',v:0.25},{k:'skillCd',v:-0.34}] },
  brassGear:{ n:'黄铜心轮', icon:'r_gear', d:'还在转，不知道为谁。', lines:[{k:'unitAtk',v:0.08},{k:'unitHp',v:0.08},{k:'unitAtk',v:0.12},{k:'shield',v:0.2}] },
  ashCrown:{ n:'灰烬王冠', icon:'r_crown', d:'前一个戴它的人烧成了灰。', lines:[{k:'heroHp',v:0.12},{k:'heroAtk',v:0.1},{k:'supplies',v:0.2},{k:'startMult',v:0.5}] },
  angelHeart:{ n:'天使心脏', icon:'r_heart', d:'每隔一会儿，它会跳一下。', lines:[{k:'heroHp',v:0.18},{k:'postHeal',v:0.04},{k:'heroHp',v:0.25},{k:'postHeal',v:0.08}] },
  gullFeather:{ n:'信天翁之羽', icon:'r_feather', d:'风会替你指路。', lines:[{k:'eventLuck',v:0.1},{k:'supplies',v:0.15},{k:'chest',v:0.3},{k:'eventLuck',v:0.2}] },
  saintSkull:{ n:'圣徒颅骨', icon:'r_skull', d:'它会替你挡下一次。', lines:[{k:'shield',v:0.1},{k:'heroHp',v:0.15},{k:'unitHp',v:0.15},{k:'shield',v:0.15}] },
  jesterMask:{ n:'弄臣面具', icon:'r_mask', d:'笑得越久，越难摘下。', lines:[{k:'baseScore',v:0.1},{k:'tier',v:0.05},{k:'baseScore',v:0.15},{k:'crit',v:0.15}] },
  vesperBell:{ n:'晚祷之钟', icon:'r_bell', d:'钟声一响，影子会停下。', lines:[{k:'skillCd',v:-0.1},{k:'unitHp',v:0.06},{k:'skillCd',v:-0.15},{k:'unitAtk',v:0.2}] },
  ghostLantern:{ n:'引魂灯', icon:'r_lantern', d:'它照亮的路，只有死人走过。', lines:[{k:'supplies',v:0.15},{k:'exp',v:0.1},{k:'chest',v:0.25},{k:'supplies',v:0.4}] },
};
M.relicLines = (key, q) => RELICS[key].lines.slice(0, q + 1).map(l => ({ k: l.k, v: l.v }));
M.relicText = (r) => r.lines.map(l => M.statText(l.k, l.v)).join('，');

// ───────── buildings (rooms). Generic rooms have no names of their own; wonders do ─────────
const STYLE = { core:'主基地', steam:'蒸汽', magic:'魔法', nature:'自然', water:'水域', fantasy:'玄幻', scifi:'科幻', medieval:'中世纪', cartoon:'卡通' };
const CAT = { core:'核心', power:'生产', forge:'锻造', med:'医疗', recruit:'招募', train:'训练', store:'后勤', defense:'防御', luck:'运势', misc:'特殊' };
const BUILDINGS = {
  core:{ n:'主基地', q:0, cat:'core', style:'core', pw:4, cost:0, days:0, fixed:1, d:'所有物资、图纸和宝物都在这里。' },
  generator:{ n:'蒸汽工坊', q:0, cat:'power', style:'steam', pw:0, cost:80, days:1, fx:{ supplyDaily:15 }, d:'每天产出 15 物资。' },
  smithy:{ n:'铁匠铺', q:0, cat:'forge', style:'medieval', pw:-1, cost:100, days:2, forge:{}, d:'用宝物图纸打造宝物，品质随机。' },
  hospital:{ n:'医院', q:0, cat:'med', style:'scifi', pw:-1, cost:100, days:2, fx:{ heal:0.35 }, d:'领袖每天回复 35% 生命。' },
  altar:{ n:'招魂台', q:0, cat:'recruit', style:'magic', pw:-1, cost:120, days:2, recruit:{}, d:'花物资招募新领袖。' },
  training:{ n:'训练场', q:0, cat:'train', style:'medieval', pw:-1, cost:90, days:1, train:{}, fx:{ orbMul:0.5 }, d:'升级少花三分之一经验球。' },
  storage:{ n:'储藏室', q:0, cat:'store', style:'cartoon', pw:0, cost:60, days:1, fx:{ startItem:1 }, d:'每次出征开局多带 1 个支援道具。' },
  farm:{ n:'水培农场', q:0, cat:'store', style:'nature', pw:-1, cost:80, days:1, fx:{ supplyDaily:15 }, d:'每天产出 15 物资。' },
  pool:{ n:'净水池', q:0, cat:'med', style:'water', pw:-1, cost:80, days:1, fx:{ heal:0.1 }, d:'医院回复额外 +10%。' },
  lookout:{ n:'监听室', q:0, cat:'misc', style:'scifi', pw:-1, cost:90, days:1, fx:{ tower:1 }, d:'出征时，所有节点的类型一开始就可见。' },
  vault:{ n:'保险库', q:0, cat:'misc', style:'steam', pw:-1, cost:110, days:2, fx:{ bank:1 }, d:'领袖死亡时，第一件宝物不会丢失。' },
  ballista:{ n:'弩炮室', q:0, cat:'defense', style:'medieval', pw:-1, cost:90, days:1, weapon:{ range:2, dmg:30, cd:1.1, kind:'bolt' }, d:'守城时向地面射击。' },
  cannon:{ n:'蒸汽加农炮', q:0, cat:'defense', style:'steam', pw:-2, cost:140, days:2, weapon:{ range:3, dmg:60, cd:2.2, kind:'shell', splash:110 }, d:'溅射伤害。' },
  tesla:{ n:'特斯拉线圈', q:0, cat:'defense', style:'scifi', pw:-3, cost:160, days:2, weapon:{ range:2, dmg:26, cd:0.9, kind:'chain', chain:3 }, d:'电弧会在敌人之间跳跃。' },
  spire:{ n:'奥术尖塔', q:0, cat:'defense', style:'magic', pw:-2, cost:150, days:2, weapon:{ range:3, dmg:22, cd:1.2, kind:'arcane', slow:0.5 }, d:'命中的敌人减速 50%。' },
  // ── wonders ──
  wolfsburg:{ n:'沃尔夫斯堡工厂', q:3, cat:'forge', style:'steam', pw:-3, cost:420, days:5, forge:{ qUp:1 }, d:'传说级锻造厂。打造出的宝物品质 +1。' },
  venice:{ n:'威尼斯兵工厂', q:2, cat:'forge', style:'medieval', pw:-2, cost:300, days:4, forge:{ twice:0.35 }, d:'打造时 35% 概率额外得到一件同名宝物。' },
  ruhr:{ n:'鲁尔区', q:2, cat:'power', style:'steam', pw:0, cost:280, days:4, fx:{ supplyDaily:45 }, d:'每天产出 45 物资。' },
  eiffel:{ n:'埃菲尔铁塔', q:3, cat:'power', style:'steam', pw:0, cost:400, days:5, fx:{ defDmg:0.3, shardDaily:4 }, d:'每天产出 4 灵魂碎片，所有武器房间伤害 +30%。' },
  machu:{ n:'马丘比丘', q:1, cat:'power', style:'nature', pw:0, cost:200, days:3, fx:{ supplyDaily:15, orbDaily:20 }, d:'每天产出 15 物资、20 经验球。' },
  pyramids:{ n:'金字塔', q:2, cat:'misc', style:'fantasy', pw:-1, cost:320, days:4, fx:{ buildDays:-1 }, d:'所有建造花费的探索日 -1（最少 1）。' },
  stonehenge:{ n:'巨石阵', q:1, cat:'recruit', style:'nature', pw:-1, cost:220, days:3, recruit:{ qUp:1 }, d:'招募的领袖至少为「稀有」。' },
  gardens:{ n:'空中花园', q:2, cat:'med', style:'nature', pw:-2, cost:300, days:4, fx:{ heal:0.45 }, d:'医院回复额外 +45%。' },
  artemis:{ n:'阿尔忒弥斯神庙', q:1, cat:'store', style:'nature', pw:-1, cost:220, days:3, fx:{ supplyDaily:30 }, d:'每天产出 30 物资。' },
  library:{ n:'亚历山大图书馆', q:2, cat:'train', style:'magic', pw:-2, cost:300, days:4, train:{}, fx:{ orbMul:1, newHeroLv:2 }, d:'升级少花一半经验球，新领袖从 3 级开始。' },
  colossus:{ n:'罗德岛巨像', q:2, cat:'defense', style:'water', pw:-3, cost:340, days:4, weapon:{ range:5, dmg:90, cd:2.4, kind:'colossus', splash:140 }, d:'巨像会砸向地面。' },
  terracotta:{ n:'兵马俑', q:3, cat:'defense', style:'fantasy', pw:-2, cost:420, days:5, fx:{ defArmy:4 }, d:'守城时，4 名陶俑士兵加入战斗。' },
  zeus:{ n:'奥林匹亚宙斯神像', q:2, cat:'defense', style:'fantasy', pw:-3, cost:360, days:4, weapon:{ range:4, dmg:70, cd:1.8, kind:'zeus', chain:4 }, d:'召唤落雷，连锁 4 个敌人。' },
  kotoku:{ n:'高德院', q:1, cat:'defense', style:'fantasy', pw:-1, cost:200, days:3, fx:{ defArmy:2 }, d:'守城时，2 名武僧加入战斗。' },
  hagia:{ n:'圣索菲亚大教堂', q:2, cat:'luck', style:'fantasy', pw:-2, cost:300, days:4, fx:{ startItemQ:1 }, d:'出征开局获得 1 个支援道具，第一次用至少转出「史诗」效果。' },
  forbidden:{ n:'紫禁城', q:3, cat:'misc', style:'medieval', pw:-2, cost:440, days:5, fx:{ relicSlot:1 }, d:'每名领袖出征可多带 1 件宝物。' },
  taj:{ n:'泰姬陵', q:2, cat:'misc', style:'fantasy', pw:-1, cost:280, days:4, fx:{ deathShards:1 }, d:'领袖死亡时，灵魂碎片 +100%。' },
  bigben:{ n:'大本钟', q:1, cat:'store', style:'steam', pw:-1, cost:220, days:3, fx:{ supplyDaily:15, craftCost:-0.3 }, d:'每天 +15 物资，打造费用 -30%。' },
  liberty:{ n:'自由女神像', q:2, cat:'luck', style:'water', pw:-1, cost:300, days:4, fx:{ tower:1, lootSup:0.3 }, d:'出征时地图全亮，物资收益 +30%。' },
  opera:{ n:'悉尼歌剧院', q:1, cat:'luck', style:'cartoon', pw:-1, cost:200, days:3, fx:{ startMult:0.3 }, d:'每场战斗初始积分倍率 +0.3。' },
  goldengate:{ n:'金门大桥', q:1, cat:'misc', style:'steam', pw:-1, cost:180, days:2, fx:{ digCost:-0.5 }, d:'挖掘费用 -50%。' },
  amundsen:{ n:'阿蒙森-斯科特科考站', q:3, cat:'misc', style:'scifi', pw:-3, cost:420, days:5, fx:{ tileX2:1 }, d:'所有特殊地格的加成翻倍。' },
  potala:{ n:'布达拉宫', q:2, cat:'luck', style:'magic', pw:-2, cost:300, days:4, fx:{ skillNodeCd:-1 }, d:'所有领袖技能冷却 -1 个节点。' },
  michel:{ n:'圣米歇尔山', q:2, cat:'defense', style:'water', pw:-1, cost:280, days:4, fx:{ portalHp:0.6 }, d:'传送门耐久 +60%。' },
  lighthouse:{ n:'亚历山大灯塔', q:1, cat:'luck', style:'water', pw:-1, cost:200, days:3, fx:{ lootSup:0.3 }, d:'出征获得的物资 +30%。' },
  angkor:{ n:'吴哥窟', q:1, cat:'recruit', style:'nature', pw:-1, cost:220, days:3, fx:{ heroCap:2 }, d:'领袖上限 +2。' },
  maracana:{ n:'马拉卡纳体育场', q:2, cat:'train', style:'cartoon', pw:-2, cost:300, days:4, fx:{ exp:0.4 }, d:'出征获得的经验 +40%。' },
};
const TILES = {
  geo:{ n:'地热', c:'#ff7a3a', d:'电力建筑 +3 电力；医疗建筑回复 +10%', mod:(B) => B.cat === 'power' ? { pw:3 } : B.cat === 'med' ? { heal:0.1 } : null },
  ore:{ n:'富矿脉', c:'#e0904a', d:'锻造建筑打造品质 +1 档概率 35%；武器房间伤害 +30%', mod:(B) => B.forge ? { forgeLuck:0.35 } : B.weapon ? { dmg:0.3 } : null },
  ley:{ n:'灵脉', c:'#b86bff', d:'魔法 / 玄幻风格建筑不耗电；科幻风格建筑多耗 1 电', mod:(B) => (B.style === 'magic' || B.style === 'fantasy') && B.pw < 0 ? { pw:-B.pw } : B.style === 'scifi' ? { pw:-1 } : null },
  spring:{ n:'地下泉', c:'#6fd0ff', d:'医疗 / 水域建筑效果 +50%；电力建筑 -2 电力', mod:(B) => B.cat === 'med' || B.style === 'water' ? { heal:0.15, range:B.weapon ? 1 : 0 } : B.cat === 'power' ? { pw:-2 } : null },
  ruin:{ n:'古遗迹', c:'#ffcc33', d:'奇观（有名字的建筑）建造日减半', mod:(B) => B.q > 0 ? { halfDays:1 } : null },
  rift:{ n:'裂隙', c:'#9cff7a', d:'武器房间射程 +1；其它建筑多耗 1 电', mod:(B) => B.weapon ? { range:1 } : B.pw < 0 ? { pw:-1 } : null },
  crystal:{ n:'晶簇', c:'#7fe0ff', d:'建在这里的建筑不耗电', mod:(B) => B.pw < 0 ? { pw:-B.pw } : null },
  fossil:{ n:'化石层', c:'#d8c8a0', d:'任何建筑每天额外产出 10 物资', mod:() => ({ supplyDaily:10 }) },
};
const BCOLS = 7, BROWS = 5, CORE = { c: 3, r: 0 };

// ───────── worlds ─────────
const WORLDS = {
  corridor:{ n:'旧公寓走廊', tut:1, diff:0, bg:'#16120f', road:'#3a2c20', tile:'#221a14', deco:['lamp','crate','fence'], amb:'motes', light:'#ffcf8a', grade:['#ffb070','#301830'], boss:'tvmini', desc:'一切开始的地方。' },
  town:{ n:'雾中小镇', diff:1, unlock:{ day:1 }, bg:'#111614', road:'#2c332a', tile:'#18201b', deco:['lamp','tree','fence','house','tomb'], amb:'motes', light:'#ffe0a0', grade:['#a0c0b0','#101820'], boss:'tv', desc:'起雾的小镇，路边的房子都没有亮灯。' },
  forest:{ n:'精灵之森', diff:1.6, unlock:{ day:4, after:'town' }, bg:'#0c1610', road:'#2a3a22', tile:'#122016', deco:['pine','shroom','pine','tree','crystalS'], amb:'fireflies', light:'#b8ff9a', grade:['#9cff9a','#102a20'], boss:'mother', desc:'树会跟着你走。萤火虫从来不落地。' },
  park:{ n:'废弃游乐园', diff:2, unlock:{ after:'town' }, bg:'#171018', road:'#3a2632', tile:'#201620', deco:['tent','horse','lamp','crate'], amb:'petals', light:'#ffb0d8', grade:['#ff90c0','#201030'], boss:'mother', desc:'旋转木马还在转，没有人上去。' },
  harbor:{ n:'沉没港口', diff:2.4, unlock:{ day:8 }, bg:'#08121a', road:'#1c3040', tile:'#0e1c28', deco:['anchor','crate','lamp','pipe'], amb:'bubbles', light:'#7fe0ff', grade:['#60c0ff','#081830'], boss:'redtv', desc:'涨潮的时候，街上会有船经过。' },
  foundry:{ n:'蒸汽铸造厂', diff:3, unlock:{ after:'park', day:12 }, bg:'#140e0a', road:'#3a2a1a', tile:'#1e150e', deco:['pipe','crate','lamp','slot'], amb:'embers', light:'#ffa050', grade:['#ffa050','#301008'], boss:'redtv', desc:'锅炉从来没有熄过，也没有人添过煤。' },
  ward:{ n:'深夜医院', diff:3.2, unlock:{ day:12 }, bg:'#0f1416', road:'#26323a', tile:'#141b1e', deco:['gurney','tomb','crate','lamp'], amb:'motes', light:'#c0e8ff', grade:['#a0e0ff','#0a1820'], boss:'redtv', desc:'走廊的灯一格一格往里灭。' },
  starship:{ n:'星舰残骸', diff:4, unlock:{ after:'foundry' }, bg:'#070a14', road:'#1a2440', tile:'#0c1224', deco:['console','crystalS','pipe','console'], amb:'sparks', light:'#8ff6ff', grade:['#80a0ff','#050818'], boss:'dealer', desc:'舰桥上的屏幕还在播放倒计时。' },
  hell:{ n:'地狱', diff:5, unlock:{ day:18, after:'ward' }, bg:'#1a0806', road:'#4a1a10', tile:'#260c08', deco:['spike','tomb','spike','lamp'], amb:'ash', light:'#ff5a2a', grade:['#ff5020','#300000'], boss:'dealer', desc:'热风从地底吹上来。' },
  casino:{ n:'地下赌场', diff:6, unlock:{ after:'hell' }, bg:'#140d0d', road:'#3a2020', tile:'#1b1111', deco:['slot','crate','lamp','horse'], amb:'motes', light:'#ffcc33', grade:['#ffcc60','#301010'], boss:'dealer', desc:'庄家在最里面等你。一切的尽头。', final:1 },
};
// a map's length is its number of bosses; mid = random columns before each segment's shop; elite = weights for 0 / 1 / 2 elites per segment
const LENGTH = [ { n:'短', boss:1, mid:[2, 3], elite:[3, 5, 2], w:30 }, { n:'中', boss:2, mid:[2, 3], elite:[3, 5, 3], w:35 }, { n:'长', boss:3, mid:[2, 3], elite:[2, 5, 4], w:25 }, { n:'极长', boss:4, mid:[2, 3], elite:[2, 4, 5], w:10 } ];
const RAID_EVERY = 5;
Object.assign(M, { QUALITY, RARITY, RELICS, BUILDINGS, TILES, STYLE, CAT, WORLDS, LENGTH, BCOLS, BROWS, CORE, RAID_EVERY });

// ───────── inventory ─────────
M.invAdd = (m, key, n) => { m.inv[key] = (m.inv[key] || 0) + (n == null ? 1 : n); if (m.inv[key] <= 0) delete m.inv[key]; };
M.invHas = (m, key) => (m.inv[key] || 0) > 0;
M.itemInfo = function (key) {
  const [kind, id] = key.split(':');
  if (kind === 'bbp') { const B = BUILDINGS[id]; return { n: B.n + '图纸', icon: 'scroll', c: QUALITY[B.q].c, q: B.q, kind: '建筑图纸', d: B.d, sub: QUALITY[B.q].n + ' · ' + STYLE[B.style] + ' · ' + CAT[B.cat] }; }
  if (kind === 'rbp') { const R = RELICS[id]; return { n: R.n + '图纸', icon: R.icon, c: '#e8d8b0', q: 0, kind: '宝物图纸', d: '在锻造建筑里打造「' + R.n + '」。打造时品质随机，消耗这张图纸。', sub: '宝物图纸', rel: id }; }
  if (kind === 'tile') { const T = TILES[id]; return { n: '地脉结晶·' + T.n, icon: 'gem', c: T.c, q: 1, kind: '地脉结晶', d: '带回基地后，改造一块没有建筑的地块（优先空房间），变成「' + T.n + '」：' + T.d }; }
  return { n: key, icon: 'question', c: '#fff', kind: '' };
};
M.invList = function (m) {
  const out = [ { key:'supplies', n:'物资', icon:'sack', c:'#caa84a', count:m.supplies, kind:'资源', d:'挖掘、建造、打造、招募领袖都需要物资。' }, { key:'shards', n:'灵魂碎片', icon:'shard', c:'#b86bff', count:m.shards, kind:'资源', d:'高端材料：建造史诗 / 传说建筑、精铸宝物时消耗。主要来自领袖阵亡。' }, { key:'orbs', n:'经验球', icon:'orb', c:'#9cff7a', count:m.orbs, kind:'资源', d:'在训练建筑里灌给领袖。' } ];
  Object.keys(m.inv).sort().forEach(k => { const I = M.itemInfo(k); out.push(Object.assign({ key: k, count: m.inv[k] }, I)); });
  m.relics.forEach(r => { const R = RELICS[r.key]; out.push({ key: 'relic:' + r.id, rid: r.id, n: R.n, icon: R.icon, c: QUALITY[r.q].c, q: r.q, count: 1, kind: '宝物 · ' + QUALITY[r.q].n, d: R.d, lines: M.relicText(r) }); });
  return out;
};

// ───────── base grid ─────────
M.newBase = function () {
  const cells = [];
  for (let r = 0; r < BROWS; r++) { cells[r] = []; for (let c = 0; c < BCOLS; c++) cells[r][c] = { dug: false, tile: null, b: null, job: null }; }
  cells[CORE.r][CORE.c] = { dug: true, tile: null, b: 'core', job: null };
  const keys = Object.keys(TILES), spots = [];
  for (let r = 0; r < BROWS; r++) for (let c = 0; c < BCOLS; c++) if (!(r === CORE.r && c === CORE.c)) spots.push([r, c]);
  spots.sort(() => Math.random() - 0.5).slice(0, 7).forEach(([r, c]) => cells[r][c].tile = pick(keys));
  return { cells };
};
M.cell = (m, c, r) => (m.base.cells[r] || [])[c];
M.canDig = function (m, c, r) {
  const x = M.cell(m, c, r); if (!x || x.dug || x.job) return false;
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => { const y = M.cell(m, c + dc, r + dr); return y && y.dug; });
};
M.tileMod = function (m, c, r, bkey) {
  const x = M.cell(m, c, r); if (!x || !x.tile) return {};
  const o = TILES[x.tile].mod(BUILDINGS[bkey]) || {}; const k = M.baseMods(m, true).tileX2 ? 2 : 1;
  const out = {}; Object.keys(o).forEach(key => out[key] = key === 'halfDays' ? o[key] : o[key] * k); return out;
};
M.eachBuilt = function (m, fn) { for (let r = 0; r < BROWS; r++) for (let c = 0; c < BCOLS; c++) { const x = m.base.cells[r][c]; if (x.b) fn(x.b, c, r, x); } };
M.hasBuilt = (m, pred) => { let f = null; M.eachBuilt(m, (b, c, r) => { if (!f && pred(BUILDINGS[b], b)) f = { key: b, c, r }; }); return f; };
M.baseMods = function (m, raw) {
  const o = {};
  M.eachBuilt(m, (b, c, r) => { const B = BUILDINGS[b]; if (B.fx) Object.keys(B.fx).forEach(k => o[k] = (o[k] || 0) + B.fx[k]); if (raw) return; const t = M.tileMod(m, c, r, b); ['heal', 'supplyDaily'].forEach(k => { if (t[k]) o[k] = (o[k] || 0) + t[k]; }); });
  return o;
};
M.roomPw = function (m, c, r, key) { const B = BUILDINGS[key]; return B.pw + (M.tileMod(m, c, r, key).pw || 0); };
M.power = function (m) {
  let made = 0, used = 0;
  for (let r = 0; r < BROWS; r++) for (let c = 0; c < BCOLS; c++) { const x = m.base.cells[r][c]; const k = x.b || (x.job && x.job.kind === 'build' ? x.job.key : null); if (!k) continue; const p = M.roomPw(m, c, r, k); if (x.b && p > 0) made += p; if (p < 0) used -= p; }
  return { made, used, free: made - used };
};
// special terrain costs more to break open (user ruling 2026-09-24): base × (1 + its 开垦 days), so it is a choice, not a must
M.digCost = (m, c, r) => { const x = c != null ? M.cell(m, c, r) : null, t = x && x.tile && !x.dug && !(M.tileHidden && M.tileHidden(m, c, r)) ? 1 + (M.digDays ? M.digDays(m, c, r) : 1) : 1; return Math.round(50 * t * (1 + (M.baseMods(m).digCost || 0))); };
M.buildDays = function (m, c, r, key) { const B = BUILDINGS[key]; let d = B.days + (M.baseMods(m).buildDays || 0); if (M.tileMod(m, c, r, key).halfDays) d = Math.ceil(d / 2); return Math.max(1, d); };
M.buildOptions = function (m, c, r) {
  const pw = M.power(m);
  return Object.keys(m.inv).filter(k => k.startsWith('bbp:')).map(k => {
    const key = k.slice(4), B = BUILDINGS[key], need = M.roomPw(m, c, r, key);
    let why = ''; if (m.supplies < B.cost) why = '物资不足';
    return { key, B, count: m.inv[k], cost: B.cost, days: M.buildDays(m, c, r, key), pw: need, tile: M.tileMod(m, c, r, key), why };
  }).sort((a, b) => (a.why ? 1 : 0) - (b.why ? 1 : 0) || b.B.q - a.B.q);
};
M.startDig = function (m, c, r) { const cost = M.digCost(m, c, r); if (m.supplies < cost || !M.canDig(m, c, r)) return false; m.supplies -= cost; M.cell(m, c, r).job = { kind: 'dig', days: 1, total: 1 }; return true; };
M.startBuild = function (m, c, r, key) {
  const o = M.buildOptions(m, c, r).find(x => x.key === key); if (!o || o.why) return false;
  m.supplies -= o.cost; M.invAdd(m, 'bbp:' + key, -1); M.cell(m, c, r).job = { kind: 'build', key, days: o.days, total: o.days }; return true;
};
M.weaponStats = function (m, c, r) {
  const x = M.cell(m, c, r); if (!x || !x.b) return null; const B = BUILDINGS[x.b]; if (!B.weapon) return null;
  const t = M.tileMod(m, c, r, x.b), bm = M.baseMods(m);
  return Object.assign({}, B.weapon, { range: B.weapon.range + (t.range || 0), dmg: B.weapon.dmg * (1 + (t.dmg || 0) + (bm.defDmg || 0)) });
};
// surface columns a weapon room covers: vertical distance counts
M.weaponReach = function (m, c, r) { const w = M.weaponStats(m, c, r); if (!w) return null; const h = w.range - (r + 1); return h < 0 ? null : { c0: Math.max(0, c - h), c1: Math.min(BCOLS - 1, c + h) }; };

// ───────── heroes ─────────
M.heroCap = (m) => 6 + (M.baseMods(m).heroCap || 0);
M.relicSlots = (h, m) => (h.lv >= 8 ? 3 : h.lv >= 4 ? 2 : 1) + (m ? (M.baseMods(m).relicSlot || 0) : 0);
M.newHero = function (meta, cls, rarity) {
  cls = cls || pick(Object.keys(HEROES));
  rarity = rarity == null ? RARITY.indexOf(wpick(RARITY, r => r.w)) : rarity;
  const R = RARITY[rarity], tree = {};
  Object.keys(TALENTS).forEach(b => { const pool = TALENTS[b].slice().sort(() => Math.random() - 0.5); tree[b] = pool.slice(0, R.tiers).map((t, i) => ({ n: t.n, d: t.d, m: t.m, big: rarity >= 2 && i === 3 })); });
  const h = { id: M.rid(), cls, name: HEROES[cls].n, rarity, lv: 1, exp: 0, points: 0, tree, taken: { atk: 0, def: 0, luck: 0 }, relics: [], status: null, hp: 0, runs: 0 };
  const lv = meta ? (M.baseMods(meta).newHeroLv || 0) : 0; for (let i = 0; i < lv; i++) { h.lv++; h.points++; }
  h.hp = M.heroMaxHp(h, meta);
  return h;
};

// ───────── meta ─────────
const KEY = 'midnight-cabinet-meta-v3';
M.defaultMeta3 = function () {
  const m = { v: 3, day: 1, supplies: 260, shards: 80, orbs: 0, inv: { 'bbp:generator': 2, 'bbp:smithy': 1, 'bbp:hospital': 1, 'bbp:altar': 1, 'bbp:training': 1, 'bbp:ballista': 2, 'rbp:rustBlade': 1, 'rbp:herakEye': 1 }, relics: [], heroes: [], graveyard: [], cleared: {}, seenWorlds: {}, runs: 0, tutDone: false, baseTut: 0, portal: { hp: 1000 }, raids: 0, log: [] };
  m.base = M.newBase();
  m.heroes.push(M.newHero(m, 'watchman', 1));
  return m;
};
M.loadMeta3 = function () { try { const m = JSON.parse(localStorage.getItem(KEY)); if (m && m.v === 3) return m; } catch (e) {} return M.defaultMeta3(); };
M.saveMeta3 = function (m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} };
M.resetMeta3 = function () { try { localStorage.removeItem(KEY); } catch (e) {} return M.defaultMeta3(); };
M.portalMax = (m) => Math.round(1000 * (1 + (M.baseMods(m).portalHp || 0)));
M.worldsOpen = function (m) {
  return Object.keys(WORLDS).filter(k => { const W = WORLDS[k]; if (W.tut || m.cleared[k]) return false; const u = W.unlock || {}; return (u.day && m.day >= u.day) || (u.after && m.cleared[u.after]); });
};
M.nextRaid = (m) => Math.ceil((m.day + 0.001) / RAID_EVERY) * RAID_EVERY;
M.hospitalRate = function (m) { const f = M.hasBuilt(m, B => B.cat === 'med' && B.fx && B.fx.heal >= 0.35); if (!f) return 0; return M.baseMods(m).heal || 0; };
M.advanceDay = function (m) {
  m.day++;
  const logs = [];
  for (let r = 0; r < BROWS; r++) for (let c = 0; c < BCOLS; c++) {
    const x = m.base.cells[r][c]; if (!x.job) continue;
    x.job.days--;
    if (x.job.days <= 0) { if (x.job.kind === 'dig') { x.dug = true; logs.push({ t: '挖掘完成', c, r }); } else { x.b = x.job.key; logs.push({ t: BUILDINGS[x.job.key].n + ' 建成', c, r, key: x.job.key }); } x.job = null; }
  }
  const sd = Math.round(M.baseMods(m).supplyDaily || 0); if (sd) { m.supplies += sd; logs.push({ t: '基地产出物资 +' + sd }); }
  const rate = M.hospitalRate(m);
  m.heroes.forEach(h => {
    const mx = M.heroMaxHp(h, m); if (rate && h.hp < mx) { h.hp = Math.min(mx, h.hp + mx * rate * (1 + (M.heroMods(h, m).hospital || 0))); if (h.hp >= mx) logs.push({ t: h.name + ' 伤好了' }); }
  });
  return logs;
};

// ───────── difficulty ─────────
M.levelAt = (run, node) => run.lvl0 + node.col * run.lvlStep + (node.type === 'elite' ? 1.5 : 0) + (node.type === 'boss' && !run.region.tut ? (node.final ? 2.2 : 1.4) : 0);
M.makeBattleCfg = function (run, node) {
  const w = M.levelAt(run, node), t = node.type, tut = run.region.tut;
  const mode = t === 'extract' ? 'hold' : t === 'elite' || t === 'boss' ? 'normal' : t;
  const pool = ['crawl', 'face'].concat(w >= 2.5 ? ['spit'] : []).concat(w >= 3.5 ? ['brute'] : []);
  const pw = (x) => x === 'brute' ? 1 : x === 'spit' ? 1.5 : 3;
  const bs = baseS(w), cfg = { mode, w, type: t, list: [], dur: 0 };
  if (mode === 'hold' || mode === 'holdScore') {
    cfg.dur = Math.round((t === 'extract' ? 45 : 36) * (1 + (run.mods.hold || 0)));
    const rate = Math.max(0.5, 1.35 - w * 0.05); let tt = 1.6, i = 0;
    while (tt < cfg.dur + 1.6) { cfg.list.push({ type: (i % 9 === 8 && w >= 3) ? 'elite' : wpick(pool, pw), spawn: tt, y: 70 + Math.random() * 580 }); tt += rate * (0.6 + Math.random() * 0.8); i++; }
  } else {
    const n = tut ? (t === 'boss' ? 3 : 3 + Math.floor(w)) : 4 + Math.floor(w * 0.9) + (t === 'elite' ? 2 : 0);
    const elites = tut ? 0 : Math.floor(w / 3) + (t === 'elite' ? 2 : 0) + (run.field === 'moon' ? 2 : 0);
    for (let i = 0; i < n; i++) cfg.list.push({ type: wpick(pool, pw), spawn: 1.6 + i * 0.5 + Math.random() * 0.4 });
    for (let i = 0; i < elites; i++) cfg.list.push({ type: 'elite', spawn: 3.5 + i * 2.2 + Math.random() });
    if (t === 'boss') cfg.list.push({ type: tut ? 'tvmini' : node.final ? run.region.boss : (w > 5 ? 'mother' : 'tv'), spawn: 5 });
    cfg.list.forEach(e => e.y = 70 + Math.random() * 580);
  }
  cfg.list.sort((a, b) => a.spawn - b.spawn);
  let base = 0, mult = 1; cfg.list.forEach(e => { base += ENEMIES[e.type].base * bs; mult += ENEMIES[e.type].mult || 0; });
  if (mode === 'hold' || mode === 'holdScore') base *= 0.75;
  cfg.S0 = base * mult;
  cfg.target = (mode === 'score' || mode === 'holdScore') ? nice(cfg.S0 * (tut ? 0.4 : 0.55) * Math.pow(1.1, w - 1)) : 0;
  cfg.P = Math.max(0.5, cfg.S0 * 0.02);
  return cfg;
};
M.rollTier2 = function (run, minQ) { const luck = run.mods.tier || 0; const ch = [0.55 + luck, 0.4 + luck, 0.22 + luck]; let t = 0; while (t < 3 && Math.random() < ch[t]) t++; return Math.max(t, minQ || 0); };
M.newRun3 = function (meta, hero, worldKey, relicIds) {
  const region = WORLDS[worldKey], bm = M.baseMods(meta);
  hero.relics = (relicIds || []).slice();
  const mods = M.heroMods(hero, meta);
  ['exp'].forEach(k => { if (bm[k]) mods[k] = (mods[k] || 0) + bm[k]; });
  const len = region.tut ? { n:'教学', cols:7, ex:0, elite:[0, 0], boss:1 } : wpick(LENGTH, l => l.w);
  const run = { meta: { unlocked: M.unitPool3(meta), perks: {} }, M: meta, hero, mods, regionKey: worldKey, region, len, wave: 1, wallet: 0, roster: [], items: [null, null, null], itemQ: [0, 0, 0], legion: {}, field: null,
    startMult: (mods.startMult || 0) + (bm.startMult || 0), shop: [], lastP: 1, loot: { supplies: 0, bp: [], exp: 0 }, runBuff: {}, kills: 0, battles: 0, skillCd: 0, steps: 0,
    lvl0: region.tut ? 0.5 : region.diff * 0.75 + (meta.day - 1) * 0.12, lvlStep: region.tut ? 0.12 : 0.18 + region.diff * 0.05, lootMul: 1 + (region.diff || 0) * 0.35 + (bm.lootSup || 0) };
  run.region.loot = run.lootMul;
  const t1 = run.meta.unlocked.filter(k => UNITS[k].tier === 1).sort(() => Math.random() - 0.5);
  M.addUnit(run, t1[0]); M.addUnit(run, t1[1]); M.addUnit(run, t1[2] || t1[0]);
  let si = 0;
  for (let i = 0; i < (bm.startItem || 0) && si < 3; i++) { run.items[si] = pick(Object.keys(M.ITEMS)); run.itemQ[si++] = 0; }
  if (bm.startItemQ && si < 3) { run.items[si] = pick(Object.keys(M.ITEMS)); run.itemQ[si++] = 2; }
  run.map = M.genMap2(run, meta);
  return run;
};
M.unitPool3 = (m) => { const n = Object.keys(m.cleared).length; const tiers = ['nail','wick','hound','dice','doll','grave','lantern','rat']; if (n >= 1 || m.day >= 6) tiers.push('clock', 'mirror'); if (n >= 2 || m.day >= 12) tiers.push('priest', 'furnace'); if (n >= 3 || m.day >= 18) tiers.push('butcher', 'bride'); return tiers; };
M.dropBp = function (bias) {
  if (Math.random() < 0.5) return 'rbp:' + pick(Object.keys(RELICS));
  const ks = Object.keys(BUILDINGS).filter(k => !BUILDINGS[k].fixed);
  const w = [60, 25, 11, 4].map((x, i) => i === 0 ? x : x * (1 + (bias || 0)));
  const q = wpick([0, 1, 2, 3], i => w[i]);
  return 'bbp:' + pick(ks.filter(k => BUILDINGS[k].q === q));
};
M.craftRelic3 = function (meta, key, forge) {
  const f = forge || {};
  let q = wpick([0, 1, 2, 3], i => [52, 30, 14, 4][i]);
  if (f.luck && Math.random() < f.luck) q++;
  q = Math.min(3, q + (f.qUp || 0));
  const r = { id: M.rid(), key, q, name: RELICS[key].n, lines: M.relicLines(key, q) };
  meta.relics.push(r);
  let twin = null;
  if (f.twice && Math.random() < f.twice) { twin = { id: M.rid(), key, q, name: RELICS[key].n, lines: M.relicLines(key, q) }; meta.relics.push(twin); }
  return { r, twin, landQ: Math.min(3, q) };
};
M.relicFree = (m) => m.relics;
})();

;
