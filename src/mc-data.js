// ==== mc-data.js ====
(function(){
// 午夜机台 — data, sprites, meta, run/shop helpers
// 颜色令牌 = Pixel Juice 调色板（docs/design.md §11.5）
const C = { ink:'#07060f', bg:'#0d0b1e', bone:'#f4efe0', dim:'#a9a3c9', candle:'#ffcf4a', blood:'#e8434f', gold:'#ffcf4a', silver:'#c4ccd9', bronze:'#c98f5a', purple:'#b86bff', teal:'#47d6c1', green:'#6fd46a', line:'#2b2461', blue:'#4f8fff', panel:'#1a1640' };

const SP = {
  nail:{face:'R',pal:{h:'#7d828c',d:'#454852',s:'#d9c3a0',e:'#e8e070',r:'#a0522d'},rows:["....hhhh....","...hhhhhh..r","...hhdddd..r","...hhdede..r","....ssss...r","...dddddd.rr","..dhhhhhhdr.","..dhhrrhhd..","...dddddd...","...dd..dd...","...dd..dd...","..ddd..ddd.."]},
  wick:{face:'R',pal:{y:'#fff2a0',f:'#ffb03a',F:'#ff6a2a',k:'#1a1418',w:'#efe4c8',W:'#c9bb98',p:'#5b3b6e',P:'#3a2548'},rows:[".....y......","....yfy.....","....fFf.....",".....k......","....wwww....","....wkwk....","....wwww....","...Wwwww....","...pppppp...","..pPppppPp..","..pPppppPpf.","...pppppp.W.","...PP..PP..."]},
  hound:{face:'R',pal:{b:'#7b6a58',B:'#4d4136',x:'#d9c3a0',e:'#e04040',t:'#eeeeee'},rows:["..........bb..",".........bbeb.","b.bbbbbbbbbbbb",".bbbxbxbxbbbbt",".bbbbbbbbbbbb.",".bb.bb...bb.bb",".B..B....B..B."]},
  doll:{face:'R',pal:{h:'#2b1d17',s:'#efe6da',e:'#111111',t:'#6fa8dc',d:'#a33a4a',D:'#6e2230'},rows:["...hhhhhh...","..hssssssh..","..hsessesh..","..hstsstsh..","..hhsssshh..","....dddd....","...ddDDdd...","..dddddddd..",".ddDddddDdd.",".dddddddddd.","...s....s...","...D....D..."]},
  dice:{face:'R',pal:{k:'#1b1b22',s:'#c9b08a',e:'#111',c:'#2f4a3f',C:'#1f3129',w:'#eeeeee',r:'#c2413a'},rows:["...kkkkkk...","..kkkkkkkkk.","....ssss....","....sese....","....ssss....","...cccccc...","..cCccccCc..","..cCccccCsww","..cCccccC.wr","...cccccc...","...CC..CC...","...CC..CC..."]},
  grave:{face:'R',pal:{h:'#3a3a44',H:'#24242c',f:'#9d9486',e:'#e8e070',s:'#8a8f99',w:'#6a4a2a'},rows:["....hhhh....","...hhhhhh...","..hhHffHhh.s","..hhfefehh.s","..hhffffhh.s","..hhhhhhhh.w",".hhhhhhhhhhw",".hhHhhhhHhhw",".hhHhhhhHh.w","..hhhhhhhh..","..hh....hh..",".HHH....HHH."]},
  lantern:{face:'R',pal:{r:'#b3372f',R:'#6a1f2b',y:'#ffcf4a',k:'#1a1418'},rows:[".....kk.....","....kkkk....","...rrrrrr...","..rryyyyrr..","..ryykkyyr..","..ryyyyyyr..","..ryykkyyr..","..rryyyyrr..","...rrrrrr...","....kkkk....",".....yy.....","......y....."]},
  rat:{face:'L',pal:{g:'#6a6070',G:'#433c48',c:'#ffcc33',e:'#e04040',p:'#d98a9a'},rows:["...c.c.c....","...ccccc....","..gggggg....",".ggeggegg...","pgggggggg...",".gggggggggg.","..gGgggggggg","..gggggggggp","..gg..gg...p","..G...G....."]},
  priest:{face:'R',pal:{w:'#e8dcc4',W:'#b8ab94',k:'#1b1b22',s:'#c9b08a',e:'#111',y:'#ffcf4a',g:'#caa84a'},rows:["....kkkk..y.","...kkkkkk.g.","...kssssk.g.","...ksesek.g.","....ssss..g.","...wwwwww.g.","..wWwwwwWwg.","..wWwggwWwg.","..wWwggwWw..","..wwwwwwww..","..wwwwwwww..","..WWW..WWW.."]},
  clock:{face:'R',pal:{c:'#b87333',C:'#7a4a22',f:'#e8dcc4',k:'#111'},rows:["...cccccc...","..cffffffc..","..cffkfffc..","..cffkfffc..","..cffkkkfc..","...cccccc...","..CccccccC..",".cCccccccCc.",".c.cccccc.c.","...cc..cc...","...cc..cc...","..CCC..CCC.."]},
  furnace:{face:'R',pal:{i:'#4a4e57',I:'#2a2c33',f:'#ff6a2a',y:'#ffcf4a',e:'#ffcf4a'},rows:["..iiiiiiii..",".iIIIIIIIIi.",".iIIIIIeIei.",".iIIIIIIIIi.","iiiiiiiiiiii","iiffyyyyffii","iifyyffyyfii","iiffyyyyffii","iiiiiiiiiiii",".iiiiiiiiii.",".II......II.","III......III"]},
  mirror:{face:'R',pal:{s:'#cfd8e3',S:'#8a95a3',b:'#3a4a66',e:'#ffffff',k:'#111'},rows:["..ssssssss..",".sbbbbbbbbs.",".sbbbbebbes.",".sbbbbbbbbs.",".sbbbbbkkbs.",".sbbbbbbbbs.","..ssssssss..","....SSSS....","...SSSSSS...","...SS..SS...","...SS..SS...","..SSS..SSS.."]},
  butcher:{face:'R',pal:{s:'#c9a08a',a:'#d8d0c4',r:'#8a2020',k:'#2a2020',m:'#8a8f99'},rows:["....kkkk....","...ssssss...","...sssese..m","...ssssss.mm","....ssss..mm","..ssaaaass.k",".ssaaraaass.",".s.araaraa..","...aaaraa...","...aaaaaa...","...kk..kk...","..kkk..kkk.."]},
  bride:{face:'R',pal:{r:'#c2413a',R:'#7a1f1a',w:'#efe6da',k:'#111',p:'#f0d8d0'},rows:["...wwwwww...","..wwppppww..","..wpkppkpw..","..wppppppw..","..wwpRRpww..","..w.rrrr.w..","...rrrrrr...","..rrRrrRrr..","..rrrrrrrr..",".rrrRrrRrrr.",".rrrrrrrrrr.","rrrrrrrrrrrr"]},
  ratling:{face:'L',pal:{g:'#6a6070',G:'#433c48',e:'#e04040',p:'#d98a9a'},rows:["..gg....",".geggg..","pgggggg.",".gggggggp",".G.G.G.."]},
  paper:{face:'R',pal:{w:'#efe6da',k:'#111',r:'#c2413a'},rows:["..ww..",".wkkw.","..ww..","wwwwww","..ww..",".wrrw.",".w..w.","w....w"]},
  imp:{face:'R',pal:{f:'#ff6a2a',y:'#ffcf4a',k:'#111'},rows:["...y....","..yfy...",".yfffy..","yfkfkfy.","yfffffy.",".yfffy..","..f.f..."]},
  ghost:{face:'R',pal:{w:'#cfe0f0',W:'#8fa8c0',k:'#111'},rows:["....wwww....","...wwwwww...","..wwkwwkww..","..wwkwwkww..","..wwwwwwww..","..wwwkkwww..",".wwwwwwwwww.",".wwwwwwwwww.","wwwwwwwwwwww","wwWwwWwwWwww","w.Ww.Ww.Ww.w","...W..W..W.."]},
  crawl:{face:'L',pal:{g:'#6b7d5a',G:'#3f4a35',e:'#e8e070',m:'#2a0f0f'},rows:["....gggg....","..gggggggg..",".geggegggggg","gmmmgggggggg","gggggggggggg","g.g.g..g.g.g","G.G.G..G.G.G"]},
  face:{face:'L',pal:{p:'#cfc6b8',P:'#9d9486',u:'#2a2a33',U:'#16161c'},rows:["....pppp....","...pppppp...","...Pppppp...","...pppppp...","....pppp....","....uuuu....","..uuuuuuuu..",".pUuuuuuuUp.",".p.uuuuuu.p.","...uu..uu...","...uu..uu...","..UUU..UUU.."]},
  spit:{face:'L',pal:{g:'#8aa04a',G:'#5a6a2a',e:'#ff4040',m:'#2a0f0f',y:'#d0e060'},rows:["...gggggg...","..gggggggg..",".gegggggegg.",".gggmmmmggg.",".ggmyyyymgg.",".gggmmmmggg.","..gggggggg..","..gGggggGg..","..g.g..g.g..","..G.G..G.G.."]},
  brute:{face:'L',pal:{p:'#b89080',P:'#8a6050',r:'#6a1f2b',k:'#111'},rows:["....pppppp....","...pppppppp...","...pkpppkpp...","...pppppppp...","...ppprrppp...",".pppppppppppp.","pppPPppppPPppp","pppPppppppPppp","ppppppppppppp.",".ppppppppppp..","..pppppppppp..","..pppp..pppp..","..PPP....PPP..",".PPPP....PPPP."]},
  elite:{face:'L',pal:{k:'#0f0d10',p:'#d8d0c4',e:'#111',m:'#1a0505',r:'#6a1f2b',R:'#3d1119'},rows:["....kkkk....","...kkkkkk...","...kpppkkk..","...kepekkk..","...kpppkkk..","...kpmpkkk..","....pp.kk...","...rrrrrrk..","..prrrrrrp..","..prrRRrrp..","..p.rrrr.p..","..p.rrrr.p..",".pp.rrrr.pp.",".p..rRRr..p.",".p.rrrrrr.p.","..rrrrrrrr..",".rrrrrrrrrr.",".RRRRRRRRRR."]},
  tv:{face:'L',pal:{t:'#5a5550',T:'#8a8580',s:'#6fb8a8',S:'#e0fff5',u:'#1c1a20',U:'#0e0d10',p:'#cfc6b8'},rows:["...T........T...","....T......T....","..tttttttttttt..","..tSsssSsssssst.","..tsssssSsssst..","..tsSssssssSst..","..tssssSssssst..","..tttttttttttt..","......uuuu......","...puuuuuuuup...","..p.uuuuuuuu.p..","..p.uuuuuuuu.p..",".pp..uuuuuu..pp.",".....uu..uu.....",".....uu..uu.....","....UUU..UUU...."]},
  dealer:{face:'L',pal:{k:'#111',K:'#2a2230',s:'#e8dcc4',r:'#c2413a',g:'#ffcc33',w:'#eee',t:'#1b1b22'},rows:["....kkkkkkkk....","....kkkkkkkk....","....kkrrrrkk....","..kkkkkkkkkkkk..","....ssssssss....","....sgsssgss....","....ssssssss....","....swwwwwws....","....skwkwkws....",".....ssssss.....","..KKKKKKKKKKKK..",".KKKrKKKKKKrKKK.","wKKKKKKggKKKKKw.","wrKKKKKggKKKKrw.","w.KKKKKKKKKKK.w.","...KKKK..KKKK...","...KKKK..KKKK...","..tttt....tttt.."]},
  flame:{pal:{y:'#fff2a0',F:'#ffb03a',f:'#ff6a2a'},rows:["..y.",".yF.","yFFy","FffF",".ff."]},
  flame2:{pal:{y:'#fff2a0',F:'#ffb03a',f:'#ff6a2a'},rows:[".y..",".Fy.","yFFy","FffF",".ff."]},
  cross:{pal:{c:'#6b6570'},rows:["..c..","ccccc","..c..","..c..","..c..",".ccc."]},
  bolt:{pal:{y:'#ffcc33'},rows:["....yy..","...yy...","..yy....",".yyyyyy.","....yy..","...yy...","..yy....",".y......"]},
  drop:{pal:{o:'#ff9a3c',O:'#ffe0a0'},rows:["...o....","...oo...","..oooo..",".oooOoo.",".ooooOo.",".oooooo.","..oooo.."]},
  die:{pal:{w:'#eeeeee',k:'#111'},rows:["wwwwwwww","wkkwwkkw","wkkwwkkw","wwwkkwww","wwwkkwww","wkkwwkkw","wkkwwkkw","wwwwwwww"]},
  candle:{pal:{y:'#fff2a0',F:'#ffb03a',k:'#1a1418',w:'#efe4c8',W:'#c9bb98'},rows:["..y..",".yFy.","..F..","..k..","wwwww","wwWww","wwwww","wwwwW","wwwww","WWWWW"]},
  frame:{pal:{g:'#8a6a3a',i:'#2a2530',f:'#9d9486'},rows:["gggggggg","giiiiiig","giiffiig","gifiifig","giiffiig","giffffig","giiiiiig","gggggggg"]},
  bell:{pal:{b:'#caa84a',k:'#5a4a2a'},rows:["...b...","..bbb..",".bbbbb.",".bbbbb.",".bbbbb.","bbbbbbb","...k..."]},
  skull:{pal:{w:'#e8dcc4',k:'#111'},rows:[".www.","wwwww","wkwkw","wwwww",".w.w."]},
  coin:{pal:{g:'#caa84a',G:'#fff0a0'},rows:[".ggg.","gGggg","gGggg","gGggg",".ggg."]},
  wheel:{pal:{p:'#b86bff',w:'#eee',k:'#111'},rows:["..pppp..",".pwwwwp.","pwkwwkwp","pwwppwwp","pwwppwwp","pwkwwkwp",".pwwwwp.","..pppp.."]},
  puddle:{pal:{b:'#3a5a7a',B:'#6fa8dc',f:'#3a2c22'},rows:["ffffffff","fbbbffff","bBbbbfff","fbbbbbff","fffbbBbf","ffffbbbf","ffffffff"]},
  moon:{pal:{m:'#e8dcc4',M:'#b8ab94'},rows:["..mmm...",".mmmmm..","mmMmmm..","mmmmm...","mmmmm...","mmMmmm..",".mmmmm..","..mmm..."]},
  tomb:{pal:{g:'#6b6570',G:'#3f3a44',k:'#111'},rows:["..gggg..",".gggggg.",".ggkkgg.",".gggggg.",".ggkkgg.",".gggggg.","GGGGGGGG"]},
  up:{pal:{g:'#9ccc6a'},rows:["...gg...","..gggg..",".gggggg.","gggggggg","...gg...","...gg...","...gg..."]},
};
SP.tv2 = { face:'L', pal:Object.assign({}, SP.tv.pal, { S:'#6fb8a8', s:'#e0fff5' }), rows:SP.tv.rows };
SP.redtv = { face:'L', pal:Object.assign({}, SP.tv.pal, { s:'#b3372f', S:'#ffb0a0', t:'#3a2020' }), rows:SP.tv.rows };
SP.mother = { face:'L', pal:Object.assign({}, SP.elite.pal, { r:'#4a2a6a', R:'#2a1540', p:'#e8e0f0' }), rows:SP.elite.rows };
SP.skel = { face:'R', pal:{ p:'#e8dcc4', P:'#b8ab94', u:'#cfc6b8', U:'#9d9486' }, rows:SP.face.rows };

function spriteDims(key) { const sp = SP[key]; if (!sp._d) sp._d = { w: Math.max.apply(null, sp.rows.map(r => r.length)), h: sp.rows.length }; return sp._d; }
const _cache = {};
function spriteCanvas(key, s, tint) {
  const k = key + '|' + s + '|' + (tint || '');
  if (_cache[k]) return _cache[k];
  const sp = SP[key], d = spriteDims(key);
  const c = document.createElement('canvas'); c.width = d.w * s; c.height = d.h * s;
  const x = c.getContext('2d');
  sp.rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch === '.') continue; x.fillStyle = tint || sp.pal[ch] || '#f0f'; x.fillRect(i * s, y * s, s, s); } });
  return (_cache[k] = c);
}
const _urls = {};
function spriteURL(key, s) { const k = key + '|' + s; return _urls[k] || (_urls[k] = spriteCanvas(key, s).toDataURL()); }

// ───────── game design data ─────────
const TAGS = {
  '火': { color:'#ff9a3c', th:[2,3], desc:['燃烧伤害 ×2', '燃烧中死亡的敌人会爆炸'] },
  '铁': { color:'#a8b0bc', th:[2,4], desc:['【铁】生命 +40%', '【铁】受到伤害 -40%'] },
  '兽': { color:'#e06a50', th:[2,3], desc:['【兽】攻速 +30%', '【兽】击杀后回复 20% 生命'] },
  '诅咒': { color:'#8fc8ff', th:[2,4], desc:['敌人生命 -15%', '部队阵亡时，倍率额外 +0.5'] },
  '赌': { color:'#ffcc33', th:[2,3], desc:['全队 10% 暴击（2 倍伤害）', '暴击击杀时，倍率 +0.05'] },
  '灵': { color:'#b86bff', th:[2,4], desc:['召唤物属性 +50%', '每波开始召唤 2 只怨灵'] },
};
const UNITS = {
  nail:{ name:'锈钉兵', tags:['铁'], tier:1, hp:130, atk:12, cd:0.9, range:55, spd:95, desc:'击杀后攻击 +2（本局永久）' },
  wick:{ name:'烛芯术士', tags:['火'], tier:1, hp:60, atk:8, cd:1.1, range:420, spd:70, ranged:1, desc:'攻击会点燃敌人' },
  hound:{ name:'缝合犬', tags:['兽'], tier:1, hp:85, atk:10, cd:0.6, range:50, spd:170, desc:'专咬血量最低的敌人' },
  dice:{ name:'骨牌赌徒', tags:['赌'], tier:1, hp:60, atk:9, cd:1.0, range:400, spd:70, ranged:1, desc:'每次攻击 1/6 概率造成 6 倍伤害' },
  doll:{ name:'哭泣人偶', tags:['诅咒'], tier:2, hp:70, atk:5, cd:1.2, range:360, spd:60, ranged:1, desc:'队友阵亡时，倍率 +0.5（按星级翻倍）' },
  grave:{ name:'守墓人', tags:['铁','诅咒'], tier:2, hp:240, atk:8, cd:1.2, range:55, spd:70, desc:'嘲讽：敌人优先攻击它' },
  lantern:{ name:'灯笼鬼', tags:['灵','火'], tier:2, hp:55, atk:7, cd:0.8, range:380, spd:80, ranged:1, desc:'每击杀 2 个敌人，召唤一只火小鬼' },
  rat:{ name:'鼠王', tags:['兽'], tier:2, hp:110, atk:9, cd:0.8, range:50, spd:120, desc:'开战召唤老鼠（2 / 3 / 5 只）' },
  priest:{ name:'白烛祭司', tags:['诅咒','灵'], tier:3, hp:80, atk:4, cd:1.5, range:380, spd:60, ranged:1, desc:'每 3 秒治疗最虚弱的队友', locked:1 },
  clock:{ name:'发条兵', tags:['铁','赌'], tier:2, hp:150, atk:11, cd:0.8, range:55, spd:90, desc:'每第 3 次攻击造成 4 倍伤害', locked:1 },
  furnace:{ name:'焚化炉', tags:['火','铁'], tier:3, hp:300, atk:10, cd:1.3, range:65, spd:60, desc:'持续点燃身边所有敌人', locked:1 },
  mirror:{ name:'镜中人', tags:['灵','赌'], tier:3, hp:70, atk:14, cd:1.2, range:450, spd:70, ranged:1, desc:'击杀精英或首领时，倍率额外 +1', locked:1 },
  butcher:{ name:'屠夫', tags:['兽','诅咒'], tier:3, hp:200, atk:20, cd:1.3, range:60, spd:100, desc:'亲手击杀的敌人，基础积分 ×2', locked:1 },
  bride:{ name:'纸新娘', tags:['诅咒','灵'], tier:3, hp:90, atk:9, cd:1.0, range:380, spd:70, ranged:1, desc:'阵亡时倍率 +2，并留下 3 个纸人', locked:1 },
};
const BASE_UNITS = Object.keys(UNITS).filter(k => !UNITS[k].locked);
const SUMMONS = {
  imp:{ name:'火小鬼', sprite:'imp', s:6, hp:30, atk:6, cd:0.7, range:300, spd:120, ranged:1, fire:1 },
  rat:{ name:'老鼠', sprite:'ratling', s:6, hp:35, atk:5, cd:0.6, range:40, spd:160 },
  paper:{ name:'纸人', sprite:'paper', s:7, hp:40, atk:5, cd:0.8, range:45, spd:110 },
  ghost:{ name:'巨型怨灵', sprite:'ghost', s:8, hp:260, atk:22, cd:1.0, range:70, spd:110 },
  wraith:{ name:'怨灵', sprite:'ghost', s:5, hp:90, atk:9, cd:0.9, range:50, spd:120 },
  skel:{ name:'骷髅', sprite:'skel', s:6, hp:60, atk:8, cd:0.9, range:45, spd:100 },
};
const ENEMIES = {
  crawl:{ name:'爬行者', sprite:'crawl', s:6, hp:40, atk:6, cd:0.8, range:45, spd:150, base:1 },
  face:{ name:'无面人', sprite:'face', s:6, hp:75, atk:8, cd:1.0, range:50, spd:95, base:1 },
  spit:{ name:'吐酸者', sprite:'spit', s:6, hp:55, atk:7, cd:1.5, range:380, spd:80, base:1.2, ranged:1 },
  brute:{ name:'肉山', sprite:'brute', s:6, hp:240, atk:14, cd:1.6, range:60, spd:55, base:2 },
  elite:{ name:'长手妇人', sprite:'elite', s:6, hp:380, atk:16, cd:1.1, range:75, spd:85, base:3, mult:0.5, elite:1 },
  tv:{ name:'电视头', sprite:'tv', s:10, hp:1400, atk:26, cd:1.3, range:90, spd:45, base:10, mult:2, boss:1 },
  mother:{ name:'长手母亲', sprite:'mother', s:9, hp:2000, atk:30, cd:1.1, range:100, spd:60, base:12, mult:2, boss:1 },
  redtv:{ name:'红屏', sprite:'redtv', s:11, hp:2600, atk:34, cd:1.0, range:90, spd:50, base:14, mult:2, boss:1 },
  dealer:{ name:'庄家', sprite:'dealer', s:10, hp:3600, atk:30, cd:0.9, range:420, spd:40, base:20, mult:3, boss:1, ranged:1 },
};
const BOSS_AT = { 5:'tv', 10:'mother', 15:'redtv', 20:'dealer' };
const MAX_WAVE = 20;
const LEGION = {
  oil:{ name:'烛油', desc:'燃烧伤害 +50%', icon:'drop' },
  steel:{ name:'钢钉', desc:'【铁】部队攻击 +40%', icon:'up' },
  rabies:{ name:'狂犬病', desc:'【兽】部队攻速 +30%', icon:'up' },
  greed:{ name:'贪婪', desc:'击杀获得的基础积分 +25%', icon:'coin' },
  bloodpact:{ name:'血契', desc:'精英和首领给的倍率 +50%', icon:'up' },
  fullhouse:{ name:'满堂红', desc:'每波开始时倍率 +0.3', icon:'die' },
  bone:{ name:'骨甲', desc:'全队生命 +30%', icon:'up' },
  haste:{ name:'急躁', desc:'全队攻速 +20%', icon:'up' },
  wake:{ name:'守灵夜', desc:'部队阵亡时，倍率额外 +0.3', icon:'candle' },
};
const FIELDS = {
  wet:{ name:'潮湿地板', desc:'敌人移速 -30%，但火焰伤害减半', icon:'puddle' },
  kerosene:{ name:'煤油地板', desc:'燃烧伤害 ×2，我方生命 -15%', icon:'drop' },
  moon:{ name:'满月', desc:'每波多出 2 名精英（更多倍率）', icon:'moon' },
  chime:{ name:'午夜钟声', desc:'战斗中每 8 秒，倍率 +0.2', icon:'bell' },
  cemetery:{ name:'墓地', desc:'敌人死亡时 20% 爬起为你作战的骷髅', icon:'tomb' },
};
const TIERS = [
  { n:'青铜', c:'#c98f5a' }, { n:'白银', c:'#c4ccd9' }, { n:'黄金', c:'#ffcf4a' }, { n:'传说', c:'#b86bff' },
];
const ITEMS = {
  bolt:{ name:'闪电风暴', icon:'bolt', desc:'召唤落雷，劈向敌人', tiers:['2 道细雷','5 道分叉连锁','8 道粗雷 + 冲击波','12 道紫色雷暴'] },
  heal:{ name:'回魂烛', icon:'candle', desc:'治疗全队', tiers:['回复 20%','回复 50%','回满 + 护盾','回满 + 护盾 + 复活 1 名'] },
  frame:{ name:'旧相框', icon:'frame', desc:'从相框里召唤帮手', tiers:['1 只火小鬼','3 只火小鬼','1 只巨型怨灵','2 只怨灵 + 3 只小鬼'] },
  bell:{ name:'招魂铃', icon:'bell', desc:'震慑敌人', tiers:['敌人停顿 1 秒','停顿 2 秒','停顿 3.5 秒','敌人互相攻击 5 秒'] },
  cup:{ name:'骰盅', icon:'die', desc:'直接加倍率', tiers:['倍率 +0.2','倍率 +0.5','倍率 +1','倍率 +2.5'] },
};
const WHEEL = [
  { n:'什么都没有', c:'#6b6570', w:22 }, { n:'返还 ×2', c:'#ffcc33', w:24 }, { n:'随机部队', c:'#6fa8dc', w:20 },
  { n:'倍率 +0.3', c:'#ff9a3c', w:16 }, { n:'随机道具', c:'#b86bff', w:18 },
];
const PERKS = {
  wallet:{ name:'旧钱包', desc:'每次结算，积分收入 +10%', max:5, icon:'coin' },
  redstring:{ name:'红绳', desc:'初始倍率 +0.1', max:5, icon:'up' },
  coin:{ name:'旧硬币', desc:'商店刷新费用 -20%', max:3, icon:'coin' },
  drawer:{ name:'多一格抽屉', desc:'商店多一个格子', max:1, icon:'frame' },
  photo:{ name:'全家福', desc:'部队上限 +1', max:2, icon:'frame' },
  pocket:{ name:'口袋', desc:'开局获得 1 个随机支援道具', max:1, icon:'candle' },
  rabbit:{ name:'兔脚', desc:'支援道具升品概率 +5%', max:3, icon:'die' },
};

// ───────── helpers ─────────
function nice(x) { if (x < 10) return Math.max(1, Math.round(x)); const p = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; }
function fmt(n) { n = Math.round(n); if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'; if (n >= 1e7) return (n / 1e6).toFixed(1) + 'M'; return n.toLocaleString('en-US'); }
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function wpick(list, wf) { const ws = list.map(wf), s = ws.reduce((a, b) => a + b, 0); let r = Math.random() * s; for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; }
const hpS = (w) => 0.8 * Math.pow(1.14, w - 1);
const atkS = (w) => 0.6 * Math.pow(1.09, w - 1);
const baseS = (w) => 10 * Math.pow(1.3, w - 1);

// ───────── meta ─────────
const META_KEY = 'midnight-cabinet-meta-v1';
function defaultMeta() { return { shards: 300, unlocked: BASE_UNITS.slice(), perks: {}, best: 0, runs: 0, wins: 0 }; }
function loadMeta() { try { const m = JSON.parse(localStorage.getItem(META_KEY)); if (m) return Object.assign(defaultMeta(), m); } catch (e) {} return defaultMeta(); }
function saveMeta(m) { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {} }
const perk = (meta, k) => meta.perks[k] || 0;
const GACHA_COST = 100;
function gachaPool(meta) {
  const pool = [];
  Object.keys(UNITS).forEach(k => { if (!meta.unlocked.includes(k)) pool.push({ kind:'unit', key:k, n:UNITS[k].name, sub:'解锁新部队', c:'#6fa8dc', w:3 }); });
  Object.keys(PERKS).forEach(k => { if (perk(meta, k) < PERKS[k].max) pool.push({ kind:'perk', key:k, n:PERKS[k].name, sub:PERKS[k].desc, c:'#ffcc33', w:2 }); });
  return pool;
}
function gachaPull(meta) {
  if (meta.shards < GACHA_COST) return null;
  meta.shards -= GACHA_COST;
  const pool = gachaPool(meta);
  let res;
  if (!pool.length) { res = { kind:'refund', n:'碎片返还', sub:'+50 灵魂碎片', c:'#8d8496' }; meta.shards += 50; }
  else { res = wpick(pool, p => p.w); if (res.kind === 'unit') meta.unlocked.push(res.key); else meta.perks[res.key] = perk(meta, res.key) + 1; }
  saveMeta(meta);
  return { res, tiles: pool.length ? pool : [res] };
}

// ───────── run ─────────
const GRID = { cols: 5, rows: 5, x0: 150, dx: 140, y0: 150, dy: 118 };
const cellXY = (c, r) => ({ x: GRID.x0 + c * GRID.dx, y: GRID.y0 + r * GRID.dy });
let _uid = 1;
function unitCap(run) { return 8 + perk(run.meta, 'photo'); }
function freeCell(run, type) {
  const used = new Set(run.roster.map(u => u.cell.join(',')));
  const U = UNITS[type], cols = U.ranged ? [1, 0, 2, 3, 4] : [4, 3, 2, 1, 0];
  const rows = [2, 1, 3, 0, 4];
  for (const c of cols) for (const r of rows) if (!used.has(c + ',' + r)) return [c, r];
  return [0, 0];
}
function wouldMerge(run, type) { return run.roster.filter(u => u.type === type && u.star === 1).length >= 2; }
function canAdd(run, type) { return run.roster.length < unitCap(run) || wouldMerge(run, type); }
function addUnit(run, type) {
  run.roster.push({ uid: _uid++, type, star: 1, cell: freeCell(run, type), bonusAtk: 0 });
  let merged = null;
  for (let st = 1; st <= 2; st++) {
    const g = {};
    run.roster.forEach(u => { if (u.star === st) (g[u.type] = g[u.type] || []).push(u); });
    Object.keys(g).forEach(t => { if (g[t].length >= 3) {
      const [a, b, c] = g[t];
      run.roster = run.roster.filter(u => u !== b && u !== c);
      a.star = st + 1; a.bonusAtk += b.bonusAtk + c.bonusAtk; merged = a;
    } });
  }
  return merged;
}
function newRun(meta) {
  const run = { meta, wave: 1, wallet: 0, roster: [], items: [null, null, null], legion: {}, field: null, startMult: 0, shop: [], totalScore: 0, bestWave: 0, lastP: 1 };
  const t1 = meta.unlocked.filter(k => UNITS[k].tier === 1);
  const pool = t1.slice().sort(() => Math.random() - 0.5);
  pool.slice(0, 3).forEach(k => addUnit(run, k));
  if (perk(meta, 'pocket')) run.items[0] = pick(Object.keys(ITEMS));
  run.comp = makeWave(run);
  return run;
}
function synergies(roster) {
  const types = new Set(roster.map(u => u.type));
  const cnt = {}; Object.keys(TAGS).forEach(t => cnt[t] = 0);
  types.forEach(k => UNITS[k].tags.forEach(t => cnt[t]++));
  const lvl = {}; Object.keys(TAGS).forEach(t => { lvl[t] = TAGS[t].th.filter(x => cnt[t] >= x).length; });
  return { cnt, lvl };
}
function makeWave(run) {
  const w = run.wave;
  const n = 5 + Math.floor(w * 0.9);
  const elites = Math.floor(w / 3) + (run.field === 'moon' ? 2 : 0);
  const pool = ['crawl', 'face'].concat(w >= 3 ? ['spit'] : []).concat(w >= 4 ? ['brute'] : []);
  const list = [];
  for (let i = 0; i < n; i++) list.push({ type: wpick(pool, t => t === 'brute' ? 1 : t === 'spit' ? 1.5 : 3), spawn: i * 0.5 + Math.random() * 0.4 });
  for (let i = 0; i < elites; i++) list.push({ type: 'elite', spawn: 2 + i * 2.2 + Math.random() });
  const boss = BOSS_AT[w];
  if (boss) list.push({ type: boss, spawn: 4 });
  list.forEach(e => e.y = 70 + Math.random() * 580);
  list.sort((a, b) => a.spawn - b.spawn);
  const bs = baseS(w);
  let base = 0, mult = 1;
  list.forEach(e => { base += ENEMIES[e.type].base * bs; mult += ENEMIES[e.type].mult || 0; });
  const S0 = base * mult;
  const target = nice(S0 * 0.55 * Math.pow(1.1, w - 1));
  const counts = {};
  list.forEach(e => counts[e.type] = (counts[e.type] || 0) + 1);
  return { list, target, S0, P: S0 * 0.02, boss, counts };
}
const COSTK = { t1: 15, t2: 25, t3: 40, legion: 25, field: 20, item: 15, wheel: 10 };
function refreshCost(run) { return nice(5 * run.lastP * (1 - 0.2 * perk(run.meta, 'coin'))); }
function sellValue(run, u) { return nice(COSTK['t' + UNITS[u.type].tier] * Math.pow(3, u.star - 1) * 0.5 * run.lastP); }
function rollCard(run) {
  const w = run.wave, meta = run.meta;
  const kinds = [{ k:'unit', w:55 }, { k:'legion', w:12 }, { k:'field', w:9 }, { k:'item', w:14 }, { k:'wheel', w:10 }];
  const kind = wpick(kinds, x => x.w).k;
  if (kind === 'unit') {
    const tier = wpick([1, 2, 3], t => t === 1 ? Math.max(12, 70 - 3 * w) : t === 2 ? 25 + w : Math.max(0, 2 * w - 3));
    let opts = meta.unlocked.filter(k => UNITS[k].tier === tier);
    if (!opts.length) opts = meta.unlocked.filter(k => UNITS[k].tier === 1);
    const type = pick(opts);
    return { kind, type, cost: nice(COSTK['t' + UNITS[type].tier] * run.lastP) };
  }
  if (kind === 'legion') { const opts = Object.keys(LEGION).filter(k => !run.legion[k]); if (!opts.length) return rollCard(run); return { kind, key: pick(opts), cost: nice(COSTK.legion * run.lastP) }; }
  if (kind === 'field') { const opts = Object.keys(FIELDS).filter(k => k !== run.field); return { kind, key: pick(opts), cost: nice(COSTK.field * run.lastP) }; }
  if (kind === 'item') return { kind, key: pick(Object.keys(ITEMS)), cost: nice(COSTK.item * run.lastP) };
  return { kind: 'wheel', cost: nice(COSTK.wheel * run.lastP) };
}
function rollShop(run, keepLocked) {
  const n = 5 + perk(run.meta, 'drawer');
  const out = [];
  for (let i = 0; i < n; i++) {
    const old = run.shop[i];
    if (keepLocked && old && old.locked && !old.sold) out.push(old);
    else out.push(Object.assign(rollCard(run), { id: Math.random().toString(36).slice(2), locked: false, sold: false }));
  }
  run.shop = out;
}
function cardInfo(card) {
  if (card.kind === 'unit') { const U = UNITS[card.type]; return { cat:'新部队', cc:'#6fa8dc', icon:card.type, name:U.name, desc:U.desc, tags:U.tags, tier:U.tier }; }
  if (card.kind === 'legion') { const L = LEGION[card.key]; return { cat:'军团强化', cc:'#ff9a3c', icon:L.icon, name:L.name, desc:L.desc, tags:[] }; }
  if (card.kind === 'field') { const F = FIELDS[card.key]; return { cat:'场地效果', cc:'#9ccc6a', icon:F.icon, name:F.name, desc:F.desc + '（替换当前场地）', tags:[] }; }
  if (card.kind === 'item') { const I = ITEMS[card.key]; return { cat:'支援道具', cc:'#ffcc33', icon:I.icon, name:I.name, desc:I.desc, tags:[] }; }
  return { cat:'赌博滚轮', cc:'#b86bff', icon:'wheel', name:'转一次', desc:'空 / 返还双倍 / 随机部队 / 永久倍率 / 随机道具', tags:[] };
}
function rollTier(meta) {
  const luck = 0.05 * perk(meta, 'rabbit');
  const ch = [0.55 + luck, 0.4 + luck, 0.22 + luck];
  let t = 0; while (t < 3 && Math.random() < ch[t]) t++;
  return t;
}

window.MC=Object.assign(window.MC||{},{C,SP,spriteDims,spriteCanvas,spriteURL,TAGS,UNITS,BASE_UNITS,SUMMONS,ENEMIES,BOSS_AT,MAX_WAVE,LEGION,FIELDS,TIERS,ITEMS,WHEEL,PERKS,nice,fmt,pick,wpick,hpS,atkS,baseS,defaultMeta,loadMeta,saveMeta,perk,GACHA_COST,gachaPool,gachaPull,GRID,cellXY,unitCap,wouldMerge,canAdd,addUnit,newRun,synergies,makeWave,refreshCost,sellValue,rollShop,cardInfo,rollTier});
})();

;
