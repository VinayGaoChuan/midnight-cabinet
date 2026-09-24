// ==== mc-data2.js ====
(function () {
const M = window.MC;
const { SP, UNITS, pick, wpick, nice, baseS, ENEMIES } = M;

// ───────── new sprites ─────────
Object.assign(SP, {
  watchman:{face:'R',pal:{k:'#1b1b22',s:'#d9c3a0',e:'#111',g:'#3a5a44',G:'#24382c',y:'#ffcf4a'},rows:["....kkkk....","...kkkkkk...","..kkkkkkkk..","....ssss....","....sese....","....ssss....","...gggggg.y.","..gGggggGgyy","..gGggggGgy.","..gGggggG...","...gggggg...","...gg..gg...","...gg..gg...","..kkk..kkk.."]},
  widow:{face:'R',pal:{k:'#111',p:'#e8dcc4',r:'#8a2030',R:'#4a1018',w:'#eeeeee'},rows:["...kkkkkk...","..kkkkkkkk..","..kkppppkk..","..kkpkpkkk..","..kkppppkk..","...kkkkkk...","....rrrr..w.","...rrrrrr.wr","..rrRrrRrrw.","..r.rrrr.r..","...rrrrrr...","..rrrrrrrr..",".rrrrrrrrrr.",".RRRRRRRRRR."]},
  nun:{face:'R',pal:{k:'#1b1b22',K:'#0e0d12',w:'#efe6da',s:'#e0c8a8',e:'#111',g:'#ffcc33'},rows:["...kkkkkk...","..kwwwwwwk..","..kwsssswk..","..kwsesewk..","..kwsssswk..","..kkkkkkkk..","..kkkggkkk..","..kkggggkk..","..kkkggkkk..","..kkkggkkk..","..kkkkkkkk..",".kkkkkkkkkk.",".kkkkkkkkkk.",".KKKKKKKKKK."]},
  butcherlord:{face:'R',pal:{k:'#2a2020',s:'#c9a08a',e:'#111',r:'#6a3030',a:'#d8d0c4',R:'#8a2020',m:'#8a8f99'},rows:["....kkkk....","...kkkkkk...","...ssssss...","...sesses..m","...ssssss..m","..rrssssrr.m",".rrraaaarrrm",".rr.aRaa.rr.",".ss.aaRa.ss.","....aaaa....","...aaaaaa...","...kk..kk...","...kk..kk...","..kkk..kkk.."]},
  clockmaker:{face:'R',pal:{k:'#2a2020',s:'#d9c3a0',g:'#b87333',G:'#9fd8c8',b:'#6a4a2a',B:'#4a3018',c:'#caa84a',C:'#7a5a20'},rows:["...kkkkkk...","..kkkkkkkk..","...ssssss...","...gGssGg...","...ssssss...","....ssss....","...bbbbbb...","..bBbccbBb..","..bBbccbBbc.","..bBbbbbBcCc","...bbbbbb.c.","...bb..bb...","...bb..bb...","..kkk..kkk.."]},
  cremator:{face:'R',pal:{k:'#1b1418',e:'#ff6a2a',o:'#6a3a1a',O:'#3a1a0a',y:'#fff2a0',f:'#ff6a2a',w:'#6a4a2a'},rows:["....kkkk..y.","...kkkkkk.f.","..kkkkkkkkf.","..kkeekeekw.","..kkkkkkkkw.","...kkkkkk.w.","...oooooo.w.","..oOooooOow.","..oOooooOo..","..oOooooOo..","...oooooo...","...kk..kk...","...kk..kk...","..kkk..kkk.."]},
  house:{pal:{r:'#4a2030',w:'#3a3440',y:'#ffcf4a',d:'#1a1418',G:'#1a1418'},rows:[".......rr.......","......rrrr......",".....rrrrrr.....","....rrrrrrrr....","...rrrrrrrrrr...","..rrrrrrrrrrrr..",".rrrrrrrrrrrrrr.","..wwwwwwwwwwww..","..wyywwwwwwyyw..","..wyywwddwwyyw..","..wwwwwddwwwww..","..wwwwwddwwwww..","..wwwwwddwwwww..","GGGGGGGGGGGGGGGG"]},
  stall:{pal:{r:'#8a2030',w:'#e8dcc4',p:'#4a3018',b:'#6a4a2a',c:'#caa84a',g:'#9ccc6a'},rows:["rwrwrwrwrwrwrw","rwrwrwrwrwrwrw",".rwrwrwrwrwrw.",".p..........p.",".p..........p.",".p..cc..gg..p.",".pbbbbbbbbbbp.",".pbbbbbbbbbbp.",".pbbbbbbbbbbp.",".p..........p."]},
  fire:{pal:{y:'#fff2a0',F:'#ffb03a',f:'#ff6a2a',b:'#6a4a2a'},rows:["....y.....","...yFy....","..yFfFy...","..FfffF...",".bFfffFb..","bbbbbbbbb.",".b.b.b.b.."]},
  chest:{pal:{b:'#3a2410',B:'#6a4a2a',g:'#caa84a',y:'#fff0a0'},rows:[".bbbbbbbb.","bBBBBBBBBb","bggggggggb","bBBBgBBBBb","bBBByBBBBb","bBBBBBBBBb","bbbbbbbbbb"]},
  door:{pal:{c:'#3a3a44',b:'#5fd0c0',B:'#1f5a60',w:'#e0fff5'},rows:["..cccccc..",".cbbbbbbc.","cbBBBBBBbc","cbBwBBBBbc","cbBBBBBBbc","cbBBBBwBbc","cbBBBBBBbc","cbBBBBBBbc","cbBBwBBBbc","cbBBBBBBbc","cbBBBBBBbc","cbbbbbbbbc","cccccccccc"]},
  well:{pal:{k:'#4a3018',g:'#6b6570',G:'#4a4450',b:'#2a4a6a'},rows:[".kkkkkkkk.",".k......k.",".k......k.","gggggggggg","gGGGGGGGGg","gGbbbbbbGg","gGGGGGGGGg","gggggggggg"]},
  old:{pal:{k:'#3a3440',s:'#d9c3a0',e:'#111',p:'#5a4a6a',P:'#3a2a4a'},rows:["..kkkk..",".kkkkkk.",".kssssk.",".ksesek.","..ssss..",".pppppp.","pppppppp","pPppppPp",".pppppp.",".pppppp.",".pp..pp.",".kk..kk."]},
  musician:{pal:{k:'#1b1b22',s:'#c9b08a',e:'#111',g:'#3a4a66',b:'#8a5a2a'},rows:["..kkkk..","..ssss..","..sese..","..ssss.b",".gggggbb","gggggbb.","g.ggg...",".gggg...",".g..g...",".g..g...",".k..k...","kk..kk.."]},
  child:{pal:{k:'#2b1d17',s:'#efe6da',e:'#111',r:'#c2413a'},rows:[".kkkk.",".ssss.",".sese.",".ssss.","rrrrrr",".rrrr.",".rrrr.",".s..s.",".k..k."]},
  lamp:{pal:{y:'#ffcf4a',k:'#2a2a33'},rows:[".yy.","ykky",".kk.","..k.","..k.","..k.","..k.","..k.","..k.","..k.",".kkk"]},
  tree:{pal:{k:'#2a2020'},rows:["k.....k.....",".k...k...k..","..k.k...k...","...kk..k....","....k.k.....","....kk......","....kk......","....kk......","....kk......","...kkkk.....","..kk..kk...."]},
  fence:{pal:{k:'#3a2a20'},rows:["k..k..k..k..","kkkkkkkkkkkk","k..k..k..k..","kkkkkkkkkkkk","k..k..k..k.."]},
  tent:{pal:{y:'#ffcc33',r:'#8a2030',w:'#e8dcc4',k:'#111'},rows:["......y.......","......r.......",".....rwr......","....rwrwr.....","...rwrwrwr....","..rwrwrwrwr...",".rwrwrwrwrwr..","rwrwrwrwrwrwr.",".w.........w..",".w...kkk...w..",".w...kkk...w.."]},
  horse:{pal:{w:'#e8dcc4',k:'#111',p:'#caa84a'},rows:["..wwww....",".wwkwwww..","wwwwwwwww.","....wwwwww","....wwwwww","....w..w..","....w..w..","...pppppp."]},
  gurney:{pal:{w:'#cfd8e3',W:'#8a95a3',m:'#6b6570',o:'#111'},rows:["wwwwwwwwwwwwww","wWWWWWWWWWWWWw","..m........m..","..m........m..","..mmmmmmmmmm..","..m........m..",".o..........o."]},
  slot:{pal:{r:'#6a1a2a',y:'#ffcc33',k:'#111',w:'#e0fff5',b:'#2a2430',g:'#9ccc6a'},rows:[".rrrrrrrr.","rryyyyyyrr","rkkkkkkkkr","rkwkkwkkwr","rkkkkkkkkr","rrrrrrrrrr","rbbbbbbbbr","rbggbbrrbr","rbbbbbbbbr","rrrrrrrrrr","r........r"]},
  crate:{pal:{b:'#4a3018',B:'#6a4a2a'},rows:["bbbbbbbb","bBBBBBBb","bBbBBbBb","bBBbbBBb","bBBbbBBb","bBbBBbBb","bBBBBBBb","bbbbbbbb"]},
  swords:{pal:{k:'#cfd8e3',b:'#8a5a2a'},rows:["k......k",".k....k.","..k..k..","...kk...","...kk...","..k..k..",".b....b.","b......b"]},
  hourglass:{pal:{g:'#caa84a',y:'#e8dcc4'},rows:["ggggggg",".y...y.","..yyy..","...y...","..y.y..",".yyyyy.","ggggggg"]},
  question:{pal:{w:'#8d8496'},rows:[".www..","w...w.","....w.","...w..","..w...","......","..w..."]},
  banner:{pal:{k:'#4a3018',r:'#3a5a8a',w:'#e8dcc4'},rows:["k.......","krrrrr..","krwrwr..","krrrrr..","krrrr...","k.......","k.......","k.......","k.......","kk......"]},
  anvil:{pal:{k:'#8a8f99'},rows:["kkkkkkk.",".kkkkkkk","...kkk..","...kkk..","..kkkkk."]},
  redcross:{pal:{r:'#d0453c'},rows:["..r..","..r..","rrrrr","..r..","..r.."]},
  flag:{pal:{k:'#4a3018',r:'#d0453c'},rows:["krrrr","krrr.","krrrr","k....","k....","k...."]},
});
const tint = (key, pal) => ({ pal: Object.assign({}, SP.house.pal, pal), rows: SP.house.rows });
SP.b_hall = tint('house', { r:'#5a4a2a', w:'#3a3440' });
SP.b_altar = tint('house', { r:'#3a2a5a', w:'#2a2430', y:'#b86bff' });
SP.b_hospital = tint('house', { r:'#7a2020', w:'#cfd8e3', y:'#8fc8ff' });
SP.b_smithy = tint('house', { r:'#3a3a44', w:'#4a3018', y:'#ff6a2a' });
SP.b_bank = tint('house', { r:'#6a5a20', w:'#3a3440', y:'#ffcc33' });
SP.b_training = tint('house', { r:'#4a3018', w:'#6a4a2a', y:'#ffcf4a' });
SP.b_shrine = tint('house', { r:'#1b1b22', w:'#2a2430', y:'#fff2a0' });
SP.b_barracks = tint('house', { r:'#3a4a2a', w:'#3a3440', y:'#ffcf4a' });
SP.b_tower = tint('house', { r:'#2a3a5a', w:'#3a3440', y:'#e0fff5' });
SP.b_tavern = tint('house', { r:'#6a3a1a', w:'#4a3018', y:'#ffb03a' });
SP.b_fortune = tint('house', { r:'#5a1a4a', w:'#2a2430', y:'#ff90c8' });
SP.b_warehouse = tint('house', { r:'#4a4a4a', w:'#3a3440', y:'#caa84a' });
SP.b_chapel = tint('house', { r:'#8a2030', w:'#3a3440', y:'#ffcc33' });
SP.b_empty = { pal:{ g:'#2a2230', G:'#1a1620' }, rows:["................","................","................","................","................","................","................","................","..g..g..g..g..g.","................","..g..g..g..g..g.","................","..g..g..g..g..g.","GGGGGGGGGGGGGGGG"] };

// ───────── heroes ─────────
const HEROES = {
  watchman:{ n:'守夜人', sprite:'watchman', hp:420, atk:26, cd:0.9, range:60, spd:110, skill:{ n:'照夜', d:'所有敌人停顿 2.5 秒', cd:18 } },
  widow:{ n:'赌徒寡妇', sprite:'widow', hp:300, atk:30, cd:0.8, range:380, ranged:1, spd:100, skill:{ n:'梭哈', d:'8 秒内每次击杀，倍率 +0.1', cd:24 } },
  nun:{ n:'驱魔修女', sprite:'nun', hp:340, atk:22, cd:1.0, range:360, ranged:1, spd:100, skill:{ n:'圣咏', d:'全队回复 35% 生命', cd:20 } },
  butcherlord:{ n:'屠宰场主', sprite:'butcherlord', hp:480, atk:36, cd:1.2, range:65, spd:95, skill:{ n:'血祭', d:'献祭生命最低的部队，倍率 +1', cd:22 } },
  clockmaker:{ n:'钟表匠', sprite:'clockmaker', hp:320, atk:24, cd:0.7, range:340, ranged:1, spd:100, skill:{ n:'倒带', d:'部队攻速 +60%，持续 6 秒', cd:22 } },
  cremator:{ n:'焚尸人', sprite:'cremator', hp:380, atk:28, cd:1.0, range:70, spd:105, skill:{ n:'火葬', d:'点燃所有敌人', cd:20 } },
};
const RARITY = [ { n:'普通', c:'#cfd8e3', w:65, tiers:3, stat:1 }, { n:'稀有', c:'#6fa8dc', w:28, tiers:4, stat:1.1 }, { n:'传说', c:'#ffcc33', w:7, tiers:4, stat:1.25 } ];
const TALENTS = {
  atk: [
    { n:'利刃', d:'领袖攻击 +25%', m:{ heroAtk:0.25 } }, { n:'号令', d:'部队攻击 +12%', m:{ unitAtk:0.12 } }, { n:'致命', d:'全队暴击 +8%', m:{ crit:0.08 } },
    { n:'迅捷咏唱', d:'领袖技能冷却 -20%', m:{ skillCd:-0.2 } }, { n:'暴走', d:'领袖上场后 6 秒内攻击翻倍', m:{ rage:1 } }, { n:'箭雨', d:'射手部队攻击 +25%', m:{ rngAtk:0.25 } },
    { n:'狂战', d:'战士部队攻速 +20%', m:{ warAs:0.2 } }, { n:'秘法', d:'法师部队法力回复 +30%', m:{ magMana:0.3 } }, { n:'处刑', d:'击杀精英或首领时，领袖回复 5% 生命', m:{ eliteHeal:0.05 } } ],
  def: [
    { n:'厚皮', d:'领袖生命 +25%', m:{ heroHp:0.25 } }, { n:'坚阵', d:'部队生命 +12%', m:{ unitHp:0.12 } }, { n:'喘息', d:'每场战斗后回复 6% 生命', m:{ postHeal:0.06 } },
    { n:'铁壁', d:'先锋部队生命 +25%', m:{ vanHp:0.25 } }, { n:'祷言', d:'祭司部队生命 +25%', m:{ priHp:0.25 } }, { n:'保险柜', d:'死亡不掉落的宝物格 +1', m:{ bank:1 } }, { n:'好体质', d:'医院疗养速度 +50%', m:{ hospital:0.5 } },
    { n:'护盾', d:'部队开局获得 15% 护盾', m:{ shield:0.15 } }, { n:'耐心', d:'坚守时间 -20%', m:{ hold:-0.2 } } ],
  luck: [
    { n:'红运', d:'初始倍率 +0.2', m:{ startMult:0.2 } }, { n:'砍价', d:'商店价格 -12%', m:{ shop:-0.12 } }, { n:'赌性', d:'道具升品概率 +8%', m:{ tier:0.08 } },
    { n:'殉道', d:'死亡时灵魂碎片 +60%', m:{ deathShards:0.6 } }, { n:'传承', d:'死亡时经验球 +60%', m:{ deathOrbs:0.6 } }, { n:'寻宝', d:'宝箱积分 +40%', m:{ chest:0.4 } },
    { n:'直觉', d:'事件好结果概率 +15%', m:{ eventLuck:0.15 } }, { n:'拾荒', d:'获得物资 +25%', m:{ supplies:0.25 } } ],
};
const BRANCH = { atk:{ n:'杀伐', c:'#d0453c' }, def:{ n:'坚忍', c:'#6fa8dc' }, luck:{ n:'运数', c:'#ffcc33' } };
const RELIC_BP = {
  weapon:{ n:'武器图纸', c:'#d0453c', stats:['heroAtk','unitAtk','crit','skillCd'], names:['锈刀','骨匕','银钉','诅咒之刃'] },
  charm:{ n:'护符图纸', c:'#6fa8dc', stats:['heroHp','unitHp','postHeal','shield'], names:['布偶','护身符','圣骨匣','天使泪'] },
  dice:{ n:'赌具图纸', c:'#ffcc33', stats:['startMult','baseScore','tier','shop'], names:['旧骰子','作弊骰','幸运币','庄家的戒指'] },
};
const STATS = {
  heroAtk:{ d:'领袖攻击 +{v}%', b:0.15, pct:1 }, unitAtk:{ d:'部队攻击 +{v}%', b:0.08, pct:1 }, crit:{ d:'暴击 +{v}%', b:0.05, pct:1 },
  skillCd:{ d:'技能冷却 -{v}%', b:-0.12, pct:1 }, heroHp:{ d:'领袖生命 +{v}%', b:0.15, pct:1 }, unitHp:{ d:'部队生命 +{v}%', b:0.08, pct:1 },
  postHeal:{ d:'战后回复 {v}% 生命', b:0.04, pct:1 }, shield:{ d:'部队开局护盾 {v}%', b:0.08, pct:1 },
  startMult:{ d:'初始倍率 +{v}', b:0.15 }, baseScore:{ d:'基础积分 +{v}%', b:0.1, pct:1 }, tier:{ d:'道具升品 +{v}%', b:0.05, pct:1 }, shop:{ d:'商店价格 -{v}%', b:-0.08, pct:1 },
};
const QUALITY = [ { n:'普通', c:'#cfd8e3', m:1 }, { n:'精良', c:'#9ccc6a', m:1.5 }, { n:'稀有', c:'#6fa8dc', m:2.2 }, { n:'传说', c:'#ffcc33', m:3.2 } ];
const BUILDINGS = {
  hall:{ n:'主楼', d:'升级基地：解锁新区域和更多建造空地', fixed:1 },
  altar:{ n:'招魂台', d:'招募新领袖，把经验球灌给领袖', fixed:1 },
  hospital:{ n:'医院', d:'领袖在这里疗养，每天回复生命', fixed:1 },
  smithy:{ n:'铁匠铺', d:'用图纸打造宝物，品质随机，不会失败', fixed:1 },
  bank:{ n:'银行', d:'领袖死亡时，第一格宝物不会丢失' },
  training:{ n:'训练场', d:'经验球效率 +50%，新领袖从 2 级开始' },
  shrine:{ n:'灵堂', d:'领袖死亡时，灵魂碎片 +50%' },
  barracks:{ n:'兵营', d:'每次出征多带 1 支随机部队' },
  tower:{ n:'瞭望塔', d:'出征时，小地图上所有事件一开始就可见' },
  tavern:{ n:'酒馆', d:'招募领袖的费用 -30%' },
  fortune:{ n:'占卜屋', d:'出征中获得图纸的概率 +50%' },
  warehouse:{ n:'仓库', d:'每次出征开局带 150 积分' },
  chapel:{ n:'祭坛', d:'每次出征开局获得 1 个随机支援道具' },
};
const BLD_BP = Object.keys(BUILDINGS).filter(k => !BUILDINGS[k].fixed);
const HALL_COST = [null, { s:300, sh:40 }, { s:700, sh:100 }, { s:1400, sh:220 }, { s:2500, sh:400 }];
const REGIONS = {
  corridor:{ n:'旧公寓走廊', lv:1, cols:7, w0:1, dw:0.25, ex:[0, 0], tut:1, bg:'#16120f', road:'#2b211a', tile:'#1d1713', deco:['lamp','crate','fence'], npcs:['old','child'], desc:'教学关。路短，没有撤离点，基本都能走完。', loot:1 },
  town:{ n:'雾中小镇', lv:1, cols:11, w0:2, dw:0.7, ex:[1, 2], bg:'#111614', road:'#242822', tile:'#161c19', deco:['lamp','tree','fence','house','tomb'], npcs:['old','musician','child'], desc:'起雾的小镇，路边的房子都没有亮灯。', loot:1.3 },
  park:{ n:'废弃游乐园', lv:2, cols:13, w0:4, dw:0.8, ex:[2, 2], bg:'#171018', road:'#2a1e26', tile:'#1d141d', deco:['tent','horse','lamp','crate'], npcs:['musician','child'], desc:'旋转木马还在转，没有人上去。', loot:1.7 },
  ward:{ n:'深夜医院', lv:3, cols:15, w0:6, dw:0.9, ex:[2, 3], bg:'#0f1416', road:'#1f272a', tile:'#141b1e', deco:['gurney','tomb','crate','lamp'], npcs:['old','child'], desc:'走廊的灯一格一格往里灭。', loot:2.2 },
  casino:{ n:'地下赌场', lv:4, cols:17, w0:8, dw:1.0, ex:[3, 4], bg:'#140d0d', road:'#2a1a1a', tile:'#1b1111', deco:['slot','crate','lamp','horse'], npcs:['musician','old'], desc:'庄家在最里面等你。', loot:2.8 },
};
const UNIT_UNLOCK = { 1:['nail','wick','hound','dice','doll','grave','lantern','rat'], 2:['clock','mirror'], 3:['priest','furnace'], 4:['butcher','bride'] };
const NODE = {
  start:{ n:'起点', icon:'flag' },
  normal:{ n:'普通战', icon:'swords', d:'全灭敌人即可', battle:1 },
  score:{ n:'积分战', icon:'coin', d:'积分不够，领袖掉血', battle:1 },
  hold:{ n:'坚守战', icon:'hourglass', d:'撑过限定时间，敌人不断出现', battle:1 },
  holdScore:{ n:'坚守积分战', icon:'hourglass', d:'撑住，并且积分达标', battle:1 },
  elite:{ n:'精英战', icon:'elite', d:'更强的敌人，更好的战利品', battle:1 },
  boss:{ n:'首领', icon:'tv', d:'击败它就能通关', battle:1 },
  shop:{ n:'商店', icon:'stall', d:'用积分买部队、强化和道具' },
  camp:{ n:'营火', icon:'fire', d:'休息或整备' },
  chest:{ n:'宝箱', icon:'chest', d:'可能有好东西' },
  event:{ n:'奇遇', icon:'question', d:'路边有人' },
  recruit:{ n:'招募旗', icon:'banner', d:'免费招一支部队' },
  extract:{ n:'撤离点', icon:'door', d:'坚守后撤离，带走所有收获' },
};
const EVENTS = {
  musician:{ n:'流浪乐师', sprite:'musician', text:'一个没有脸的乐师在路边拉琴。琴盒里躺着几枚旧硬币。' },
  granny:{ n:'裁缝老太', sprite:'old', text:'她说可以把你的一名部队缝进你的影子里，让你的伤口合上。' },
  well:{ n:'许愿井', sprite:'well', text:'井底有东西在回应你的脚步声。' },
  child:{ n:'迷路的孩子', sprite:'child', text:'她站在路中间，问你能不能带她回家。' },
  grave:{ n:'无名墓碑', sprite:'tomb', text:'墓碑上没有名字，土是新翻的。' },
  clinic:{ n:'废弃医务室', sprite:'gurney', text:'担架上还留着体温。柜子里有药，也有别的东西。' },
  mirror:{ n:'落地镜', sprite:'mirror', text:'镜子里的你慢了半拍才眨眼。' },
  altar:{ n:'血祭坛', sprite:'candle', text:'祭坛上的蜡烛一直没灭。旁边写着：一滴血，一分运。' },
  peddler:{ n:'货郎', sprite:'stall', text:'货郎掀开布，里面是一排会动的小瓶子。' },
};
ENEMIES.tvmini = { name:'小电视头', sprite:'tv', s:8, hp:360, atk:12, cd:1.4, range:90, spd:45, base:6, mult:1, boss:1 };
Object.assign(M, { HEROES, RARITY, TALENTS, BRANCH, RELIC_BP, STATS, QUALITY, BUILDINGS, BLD_BP, HALL_COST, REGIONS, UNIT_UNLOCK, NODE, EVENTS });

// ───────── helpers ─────────
M.rid = () => Math.random().toString(36).slice(2, 9);
// a leader is known by its class: the class decides both skills, so there are no personal names
M.heroN = (h) => ((HEROES[h && h.cls] || {}).n || '');
M.expNeed = (lv) => Math.round(100 * Math.pow(lv, 1.5));
M.relicSlots = (h) => h.lv >= 8 ? 3 : h.lv >= 4 ? 2 : 1;
M.statText = (k, v) => STATS[k].d.replace('{v}', STATS[k].pct ? Math.round(Math.abs(v) * 100) : (Math.round(v * 100) / 100));
M.newHero = function (meta, cls, rarity) {
  cls = cls || pick(Object.keys(HEROES));
  rarity = rarity == null ? RARITY.indexOf(wpick(RARITY, r => r.w)) : rarity;
  const R = RARITY[rarity];
  const tree = {};
  Object.keys(TALENTS).forEach(b => {
    const pool = TALENTS[b].slice().sort(() => Math.random() - 0.5);
    tree[b] = pool.slice(0, R.tiers).map((t, i) => ({ n: t.n, d: t.d, m: t.m, big: rarity === 2 && i === 3 }));
  });
  const h = { id: M.rid(), cls, name: HEROES[cls].n, rarity, lv: 1, exp: 0, points: 0, tree, taken: { atk: 0, def: 0, luck: 0 }, relics: [], status: null, hp: 0, runs: 0 };
  if (meta && meta.buildings.includes('training')) { h.lv = 2; h.points = 1; }
  h.hp = M.heroMaxHp(h, meta);
  return h;
};
M.heroMods = function (h, meta) {
  const m = {};
  const add = (o, k) => Object.keys(o).forEach(x => { m[x] = (m[x] || 0) + o[x] * (k || 1); });
  Object.keys(h.tree).forEach(b => h.tree[b].slice(0, h.taken[b]).forEach(t => add(t.m, t.big ? 2 : 1)));
  if (meta) h.relics.forEach(id => { const r = meta.relics.find(x => x.id === id); if (r) r.lines.forEach(l => { m[l.k] = (m[l.k] || 0) + l.v; }); });
  return m;
};
// the live rarity table is M.RARITY (4 tiers, set up in mc-data3); the local 3-tier table here is only the fallback
const rarStat = (h) => ((M.RARITY || RARITY)[h.rarity] || RARITY[RARITY.length - 1]).stat;
M.heroMaxHp = (h, meta) => { const H = HEROES[h.cls], m = M.heroMods(h, meta); return Math.round(H.hp * rarStat(h) * (1 + 0.1 * (h.lv - 1)) * (1 + (m.heroHp || 0))); };
M.heroAtk = (h, meta) => { const H = HEROES[h.cls], m = M.heroMods(h, meta); return H.atk * rarStat(h) * (1 + 0.12 * (h.lv - 1)) * (1 + (m.heroAtk || 0)); };
M.addExp = function (h, amt) {
  let ups = 0;
  h.exp += Math.round(amt);
  while (h.lv < 10 && h.exp >= M.expNeed(h.lv)) { h.exp -= M.expNeed(h.lv); h.lv++; h.points++; ups++; }
  if (h.lv >= 10) h.exp = Math.min(h.exp, M.expNeed(10));
  return ups;
};
M.canTake = (h, b) => h.points > 0 && h.taken[b] < h.tree[b].length;
M.craftRelic = function (meta, bp) {
  const B = RELIC_BP[bp];
  const q = wpick([0, 1, 2, 3], i => [50, 30, 15, 5][i]);
  const ks = B.stats.slice().sort(() => Math.random() - 0.5).slice(0, q === 3 ? 2 : 1);
  const lines = ks.map(k => ({ k, v: Math.round(STATS[k].b * QUALITY[q].m * (0.85 + Math.random() * 0.3) * 100) / 100 }));
  const r = { id: M.rid(), bp, q, name: B.names[q], lines };
  meta.relics.push(r);
  return r;
};
M.relicText = (r) => r.lines.map(l => M.statText(l.k, l.v)).join('，');

// ───────── meta ─────────
const KEY = 'midnight-cabinet-meta-v2';
M.defaultMeta2 = function () {
  const meta = { v: 2, day: 1, baseLv: 1, supplies: 200, shards: 120, orbs: 0, relicBp: { weapon: 1, charm: 0, dice: 0 }, bldBp: ['bank'], buildings: ['hall', 'altar', 'hospital', 'smithy'], heroes: [], relics: [], graveyard: [], cleared: {}, offers: [], runs: 0 };
  meta.heroes.push(M.newHero(meta, 'watchman', 0));
  M.rollOffers(meta);
  return meta;
};
M.loadMeta2 = function () { try { const m = JSON.parse(localStorage.getItem(KEY)); if (m && m.v === 2) return m; } catch (e) {} return M.defaultMeta2(); };
M.saveMeta2 = function (m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} };
M.resetMeta2 = function () { try { localStorage.removeItem(KEY); } catch (e) {} return M.defaultMeta2(); };
M.slotsFor = (meta) => 2 + meta.baseLv;
M.unitPool = (meta) => { let p = []; for (let l = 1; l <= meta.baseLv; l++) p = p.concat(UNIT_UNLOCK[l] || []); return p; };
M.regionsUnlocked = (meta) => Object.keys(REGIONS).filter(k => REGIONS[k].lv <= meta.baseLv);
M.rollOffers = function (meta) {
  const un = M.regionsUnlocked(meta);
  const out = [];
  if (!meta.cleared.corridor) out.push('corridor');
  const rest = un.filter(k => k !== 'corridor').sort(() => Math.random() - 0.5);
  rest.slice(0, Math.max(1, Math.min(3, rest.length - (Math.random() < 0.3 ? 1 : 0)))).forEach(k => out.push(k));
  if (meta.cleared.corridor && !out.length) out.push('corridor');
  if (!out.includes('corridor') && meta.cleared.corridor && Math.random() < 0.3) out.push('corridor');
  meta.offers = out;
};
M.advanceDay = function (meta) {
  meta.day++;
  const logs = [];
  meta.heroes.forEach(h => {
    if (!h.status) return;
    h.status.days--;
    if (h.status.kind === 'hospital') { const mx = M.heroMaxHp(h, meta); h.hp = Math.min(mx, h.hp + mx * 0.35 * (1 + (M.heroMods(h, meta).hospital || 0))); if (h.status.days <= 0 || h.hp >= mx) { h.hp = mx; h.status = null; logs.push(h.name + ' 出院了'); } }
  });
  M.rollOffers(meta);
  return logs;
};
M.hospitalDays = (h, meta) => { const mx = M.heroMaxHp(h, meta); return Math.max(1, Math.ceil((1 - h.hp / mx) / (0.35 * (1 + (M.heroMods(h, meta).hospital || 0))))); };

// ───────── battle config ─────────
M.levelAt = (run, node) => run.region.w0 + node.col * run.region.dw + (node.type === 'elite' ? 1.5 : 0) + (node.type === 'boss' && !run.region.tut ? 2 : 0);
M.makeBattleCfg = function (run, node) {
  const w = M.levelAt(run, node), t = node.type;
  const mode = t === 'extract' ? 'hold' : t === 'elite' || t === 'boss' ? 'normal' : t;
  const pool = ['crawl', 'face'].concat(w >= 3 ? ['spit'] : []).concat(w >= 4 ? ['brute'] : []);
  const pw = (x) => x === 'brute' ? 1 : x === 'spit' ? 1.5 : 3;
  const bs = baseS(w);
  const cfg = { mode, w, type: t, list: [], dur: 0 };
  if (mode === 'hold' || mode === 'holdScore') {
    cfg.dur = Math.round((t === 'extract' ? 50 : 40) * (1 + (run.mods.hold || 0)));
    const rate = Math.max(0.55, 1.3 - w * 0.04);
    let tt = 1.6, i = 0;
    while (tt < cfg.dur + 1.6) { cfg.list.push({ type: (i % 9 === 8 && w >= 3) ? 'elite' : wpick(pool, pw), spawn: tt, y: 70 + Math.random() * 580 }); tt += rate * (0.6 + Math.random() * 0.8); i++; }
  } else {
    const tut = run.region.tut;
    const n = tut ? (t === 'boss' ? 3 : 3 + Math.floor(w)) : 4 + Math.floor(w * 0.9) + (t === 'elite' ? 2 : 0);
    const elites = tut ? 0 : Math.floor(w / 3) + (t === 'elite' ? 2 : 0) + (run.field === 'moon' ? 2 : 0);
    for (let i = 0; i < n; i++) cfg.list.push({ type: wpick(pool, pw), spawn: 1.6 + i * 0.5 + Math.random() * 0.4 });
    for (let i = 0; i < elites; i++) cfg.list.push({ type: 'elite', spawn: 3.5 + i * 2.2 + Math.random() });
    if (t === 'boss') cfg.list.push({ type: tut ? 'tvmini' : run.region.lv >= 4 ? 'dealer' : run.region.lv >= 3 ? 'redtv' : run.region.lv >= 2 ? 'mother' : 'tv', spawn: 5 });
    cfg.list.forEach(e => e.y = 70 + Math.random() * 580);
  }
  cfg.list.sort((a, b) => a.spawn - b.spawn);
  let base = 0, mult = 1;
  cfg.list.forEach(e => { base += ENEMIES[e.type].base * bs; mult += ENEMIES[e.type].mult || 0; });
  if (mode === 'hold' || mode === 'holdScore') base *= 0.75;
  cfg.S0 = base * mult;
  cfg.target = (mode === 'score' || mode === 'holdScore') ? nice(cfg.S0 * 0.55 * Math.pow(1.1, w - 1)) : 0;
  cfg.P = Math.max(0.5, cfg.S0 * 0.02);
  cfg.counts = {}; cfg.list.forEach(e => cfg.counts[e.type] = (cfg.counts[e.type] || 0) + 1);
  return cfg;
};
M.rollTier2 = function (run) {
  const luck = run.mods.tier || 0;
  const ch = [0.55 + luck, 0.4 + luck, 0.22 + luck];
  let t = 0; while (t < 3 && Math.random() < ch[t]) t++;
  return t;
};
M.newRun2 = function (meta, hero, regionKey) {
  const region = REGIONS[regionKey];
  const mods = M.heroMods(hero, meta);
  const run = { meta: { unlocked: M.unitPool(meta), perks: {} }, M: meta, hero, mods, regionKey, region, wave: 1, wallet: 0, roster: [], items: [null, null, null], legion: {}, field: null,
    startMult: mods.startMult || 0, shop: [], lastP: 1, loot: { supplies: 0, relicBp: [], bldBp: [], exp: 0 }, runBuff: {}, kills: 0, battles: 0 };
  const t1 = run.meta.unlocked.filter(k => UNITS[k].tier === 1).sort(() => Math.random() - 0.5);
  M.addUnit(run, t1[0]); M.addUnit(run, t1[1]);
  if (meta.buildings.includes('barracks')) M.addUnit(run, pick(run.meta.unlocked.filter(k => UNITS[k].tier <= 2)));
  if (meta.buildings.includes('warehouse')) run.wallet += 150;
  if (meta.buildings.includes('chapel')) run.items[0] = pick(Object.keys(M.ITEMS));
  run.map = window.MC.genMap(run, meta);
  return run;
};
M.priceMul = (run) => Math.max(0.4, 1 + (run.mods.shop || 0));
})();

;
