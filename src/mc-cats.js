// ==== mc-cats.js ====
(function () {
// Buildings by what they do (user ruling 2026-09-26: 「应该按照……信仰类，工坊类，治疗类，等等这种大类去显示建筑的功能，
// 把建筑和地形等的功能都捋一遍」「风格……如果确实没用，那就把风格隐藏，未来有用的时候再开」).
// · Nine categories, each one job: 生产 supplies · 仓储 what an expedition sets out with and brings back · 工坊 crafting
//   relics (and only with one do relic blueprints drop at all) · 信仰 faith (the resource exists only once one stands,
//   mc-faith.js) · 医疗 the leader's life · 训练 the leader and the army · 防御 the raids · 侦察 the expedition map ·
//   工程 digging, building and the rock.
// · Two rooms doing the same thing was a bug: 水培农场 (= 蒸汽工坊) now heals, 亚历山大灯塔 (= 自由女神像) now scouts,
//   马拉卡纳 (= 图书馆) now toughens the army; 大本钟 and 埃菲尔铁塔 keep one job each.
// · Styles stay only in the room art: no badge, no word, no rule (terrain fits and world drops go by category).
// Loaded after mc-solo.js (which rewrote rooms for the one leader) and before mc-save.js.
const M = window.MC, B = M.BUILDINGS, T_ = M.TILES, IC = M.IC;

// ───────── the nine categories ─────────
const ORDER = M.CAT_ORDER = ['power', 'store', 'forge', 'faith', 'med', 'train', 'defense', 'scout', 'eng'];
Object.assign(M.CAT, { power: '生产', store: '仓储', forge: '工坊', faith: '信仰', med: '医疗', train: '训练', defense: '防御', scout: '侦察', eng: '工程' });
delete M.CAT.luck; delete M.CAT.misc;
Object.assign(M.CAT_COL, { power: '#ffd23a', store: '#c8a060', forge: '#b8c0cc', faith: '#ffe6a0', med: '#ff6a6a', train: '#ffa060', defense: '#ff6a5a', scout: '#7fe0ff', eng: '#d0a0ff' });
// what each is for, one sentence (the tag's tooltip)
M.CAT_D = {
  power: '每天产出物资。', store: '出征的补给：开局道具、积分倍率和带回的物资。', forge: '打造宝物；有了它，出征才会掉宝物图纸。',
  faith: '每天产出信仰值；有了它，才有信仰值。', med: '让领袖回复生命。', train: '让领袖和出征部队更强。',
  defense: '守住混沌来袭。', scout: '看清出征的地图。', eng: '挖掘、建造和地格。',
};
const star = (x, cx, cy, r1, r2, n, col) => { x.fillStyle = col; x.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r2 : r1; x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.fill(); };
const rect = (x, a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
const circ = (x, cx, cy, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
// 信仰: a candle in a halo · 侦察: a spyglass · 工程: a pick over a gear
IC.f_faith = (x) => { x.strokeStyle = '#ffe6a0'; x.lineWidth = 3; x.beginPath(); x.arc(16, 13, 10, 0, 7); x.stroke(); rect(x, 12, 14, 8, 15, '#f4efe0'); rect(x, 12, 14, 8, 2, '#c8b890'); x.fillStyle = '#ffb030'; x.beginPath(); x.moveTo(16, 3); x.quadraticCurveTo(22, 10, 16, 13); x.quadraticCurveTo(10, 10, 16, 3); x.fill(); circ(x, 16, 10, 1.6, '#fff6c0'); };
IC.f_scout = (x) => { x.save(); x.translate(16, 16); x.rotate(-0.6); rect(x, -13, -3, 10, 6, '#8a5a30'); rect(x, -4, -4, 9, 8, '#c8a060'); rect(x, 5, -5, 8, 10, '#8a92a0'); rect(x, 12, -4, 2, 8, '#7fe0ff'); x.restore(); circ(x, 25, 8, 2, '#ffffff'); };
IC.f_eng = (x) => { star(x, 18, 19, 11, 7, 8, '#8a92a0'); circ(x, 18, 19, 3.5, '#3a3440'); x.strokeStyle = '#8a5a30'; x.lineWidth = 3; x.beginPath(); x.moveTo(5, 28); x.lineTo(17, 8); x.stroke(); x.fillStyle = '#c8d0dc'; x.beginPath(); x.moveTo(8, 6); x.quadraticCurveTo(17, 2, 26, 9); x.lineTo(24, 11); x.quadraticCurveTo(17, 6, 9, 9); x.fill(); };
Object.assign(M.TAG_IC.CAT_IC, { faith: 'f_faith', scout: 'f_scout', eng: 'f_eng' });
['luck', 'misc'].forEach(k => delete M.TAG_IC.CAT_IC[k]);
// the category tag says what the category is for
const oCatTag = M.TAG.cat;
M.TAG.cat = (k) => { const t = oCatTag(k); if (t) { t.n = M.CAT[k]; t.d = M.CAT_D[k] || t.d; } return t; };
const oTagTip = M.tagTip;
M.tagTip = (t) => (t && t.kind === 'cat' && M.CAT_D[t.k] ? { title: t.n, c: t.c, icon: t.icon, lines: [{ t: M.CAT_D[t.k], c: '#e8dcc4' }] } : oTagTip(t));
// words in rich text: races, vocations and the nine categories (styles are no longer words of the game)
const RACE_IC = M.TAG_IC.RACE_IC, VOC_IC = M.TAG_IC.VOC_IC;
let WORDS = null;
const words = () => WORDS || (WORDS = Object.keys(RACE_IC).filter(n => n !== '英雄').map(n => ['race', n]).concat(Object.keys(VOC_IC).map(n => ['voc', n]), ORDER.map(k => ['cat', M.CAT[k], k])).sort((a, b) => b[1].length - a[1].length));
M.tagWord = function (s, i, ctx) {
  const hits = words().filter(([k, w]) => s.startsWith(w, i) && !(k === 'cat' && s[i + w.length] === '值')); if (!hits.length) return null;   // 信仰值 is the resource, not the category
  const pref = ctx === 'bld' ? ['cat', 'race', 'voc'] : ['race', 'voc', 'cat'];
  hits.sort((a, b) => b[1].length - a[1].length || pref.indexOf(a[0]) - pref.indexOf(b[0]));
  const h = hits[0], t = h[0] === 'race' ? M.TAG.race(h[1]) : h[0] === 'voc' ? M.TAG.voc(h[1]) : M.TAG.cat(h[2]);
  return t ? { t, len: h[1].length } : null;
};
if (M.GUIDE) M.GUIDE.push({ id: 'bcat', cat: '基地', icon: 'f_eng', title: '建筑大类', line: '建筑按用途分九类：生产、仓储、工坊、信仰、医疗、训练、防御、侦察、工程。房间右下角的图标就是它的大类。', scr: 'base', sel: '[data-g="nothing"]' },
  { id: 'forgeon', cat: '房间', icon: 'f_forge', title: '工坊与宝物图纸', line: '建了工坊类建筑，出征才会掉宝物图纸。', scr: 'base', sel: '[data-g="nothing"]' });
M.STYLE_SHOWN = false;
// 工坊 unlocks relic blueprints: without a workshop none drops, none is sold, none is given (mc-bp.js keeps the drops honest)
M.forgeOn = (m) => !!(m && M.hasBuilt && M.hasBuilt(m, X => !!X.forge));   // 「未来有用的时候再开」: the style badges come back by turning this on (and their template slots)

// ───────── every room in its category, one job each ─────────
const set = (k, o) => { if (!B[k]) return; Object.assign(B[k], o); };
const put = (cat, ks) => ks.forEach(k => set(k, { cat }));
put('power', ['generator', 'ruhr', 'machu']);
put('store', ['storage', 'vault', 'opera']);
put('forge', ['smithy', 'venice', 'wolfsburg']);
put('med', ['hospital', 'pool', 'gardens']);
put('train', ['training', 'armory', 'library', 'shaolin', 'colosseum']);
put('defense', ['wall', 'ballista', 'cannon', 'tesla', 'spire', 'kotoku', 'colossus', 'zeus', 'michel', 'terracotta']);
put('scout', ['lookout', 'stonehenge', 'liberty']);
put('eng', ['goldengate', 'pyramids', 'amundsen']);
// 工坊: every workshop can craft
set('bigben', { cat: 'forge', forge: {}, fx: { craftCost: -0.3 }, d: '打造宝物，打造费用 -30%。' });
set('forbidden', { cat: 'forge', forge: {}, d: '打造宝物；出征可以多带 1 件宝物。' });
set('smithy', { d: '打造宝物。' });
// 信仰: faith every day (the wonders keep their own gift on top)
set('meditation', { cat: 'faith', fx: { faithDaily: 2 }, d: '每天产出 2 信仰值。' });
set('artemis', { cat: 'faith', fx: { faithDaily: 4 }, d: '每天产出 4 信仰值。' });
set('angkor', { cat: 'faith', fx: { faithDaily: 5 }, d: '每天产出 5 信仰值。' });
set('hagia', { cat: 'faith', fx: { faithDaily: 3, startItemQ: 1 }, d: '每天产出 3 信仰值；出征开局多带 1 个支援道具，第一次用至少转出「史诗」效果。' });
set('potala', { cat: 'faith', fx: { faithDaily: 3, skillNodeCd: -1 }, d: '每天产出 3 信仰值；领袖技能冷却少 1 个节点。' });
set('taj', { cat: 'faith', fx: { faithDaily: 3, shardDaily: 3 }, d: '每天产出 3 信仰值和 3 灵魂碎片。' });
// the twins, parted
set('farm', { cat: 'med', fx: { healAll: 0.15 }, d: '领袖每天回复 15% 生命。' });
set('lighthouse', { cat: 'scout', fx: { vision: 1, seeElite: 1 }, d: '出征视野 +1，精英和首领一开始就能看到。' });
set('maracana', { cat: 'train', fx: { unitHp: 0.1 }, d: '出征部队生命 +10%。' });
set('eiffel', { cat: 'defense', fx: { defDmg: 0.3 }, d: '所有防御塔伤害 +30%。' });
set('generator', { d: '每天产出 15 物资。' });
// anything left in a retired category goes where it belongs by what it does
Object.keys(B).forEach(k => { const b = B[k]; if (b.gone || k === 'core' || ORDER.includes(b.cat)) return; b.cat = b.weapon || b.wall ? 'defense' : b.forge ? 'forge' : 'eng'; });

// ───────── terrain: what fits is a category ─────────
// Each category has two or three veins that fit it; the "any room" half of every vein is unchanged.
const isCat = (...c) => (Bd) => !!Bd && c.includes(Bd.cat);
const reT = (k, o) => { const T = T_[k]; if (!T) return; Object.assign(T, o); T.d = '任何房间：' + T.anyD + '。契合「' + T.fitN + '」：' + T.fitD + '。';
  T.mod = (Bd) => { const r = Object.assign({}, T.any); if (T.fit(Bd)) { const f = T.fitFx(Bd); Object.keys(f).forEach(x => { r[x] = (r[x] || 0) + f[x]; }); } return r; }; };
reT('geo',       { fitN: '生产', fit: isCat('power'), fitD: '这个房间自己的产出 ×2', fitFx: () => ({ prodMul: 1 }) });
reT('ygg',       { fitN: '生产', fit: (Bd) => isCat('power')(Bd) && !!Bd.fx, fitD: '这个房间自己的产出 ×2', fitFx: () => ({ prodMul: 1 }) });
reT('fossil',    { fitN: '仓储', fit: (Bd) => isCat('store')(Bd) && !!Bd.fx, fitD: '这个房间自己的效果 ×2', fitFx: () => ({ prodMul: 1 }) });
reT('mint',      { fitN: '仓储', fit: isCat('store'), fitD: '物资再 +30%，每场战斗初始积分倍率 +0.2', fitFx: () => ({ lootSup: 0.3, startMult: 0.2 }) });
reT('ore',       { fitN: '工坊 / 防御塔', fit: (Bd) => !!Bd && (Bd.cat === 'forge' || !!Bd.weapon), fitD: '工坊：60% 概率打造品质 +1；防御塔：伤害 +50%', fitFx: (Bd) => (Bd.weapon ? { dmg: 0.5 } : { forgeLuck: 0.6 }) });
reT('star',      { fitN: '工坊', fit: isCat('forge'), fitD: '打造的宝物品质必定 +1', fitFx: () => ({ forgeQUp: 1 }) });
reT('dream',     { fitN: '工坊', fit: isCat('forge'), fitD: '打造时 40% 概率多得一件', fitFx: () => ({ forgeTwice: 0.4 }) });
reT('ley',       { fitN: '信仰', fit: isCat('faith'), fitD: '这个房间每天再多产 3 信仰值', fitFx: () => ({ faithDaily: 3 }) });
reT('hourglass', { fitN: '信仰', fit: isCat('faith'), fitD: '出发前祈福只花一半信仰值', fitFx: () => ({ blessCost: -0.5 }) });
reT('spring',    { fitN: '医疗', fit: isCat('med'), fitD: '医院回复 +30%', fitFx: () => ({ heal: 0.3 }) });
reT('heart',     { fitN: '医疗', fit: isCat('med'), fitD: '医院回复 +30%，领袖每天再回 10%', fitFx: () => ({ heal: 0.3, healAll: 0.1 }) });
reT('amber',     { fitN: '训练', fit: isCat('train'), fitD: '领袖出征得到的经验 +30%', fitFx: () => ({ exp: 0.3 }) });
reT('dragon',    { fitN: '训练', fit: isCat('train'), fitD: '出征部队攻击再 +10%', fitFx: () => ({ unitAtk: 0.1 }) });
reT('bones',     { fitN: '训练', fit: isCat('train'), fitD: '领袖攻击 +15%', fitFx: () => ({ heroAtk: 0.15 }) });
reT('clay',      { fitN: '防御', fit: isCat('defense'), fitD: '守城时 3 名陶土守卫加入战斗', fitFx: () => ({ defArmy: 3 }) });
reT('rift',      { fitN: '防御', fit: isCat('defense'), fitD: '防御塔：射程 +1，攻速 +50%；其它：守城时 2 名守卫加入', fitFx: (Bd) => (Bd.weapon ? { range: 1, wcd: 0.5 } : { defArmy: 2 }) });
reT('storm',     { fitN: '防御', fit: isCat('defense'), fitD: '防御塔：伤害 +20%，每次攻击放出连锁闪电；其它：主基地耐久 +20%', fitFx: (Bd) => (Bd.weapon ? { xChain: 3, dmg: 0.2 } : { portalHp: 0.2 }) });
reT('crown',     { fitN: '防御', fit: isCat('defense'), fitD: '防御塔：伤害 +40%，命中溅射并减速；其它：再多 3 名守卫', fitFx: (Bd) => (Bd.weapon ? { dmg: 0.4, xSplash: 130, xSlow: 1 } : { defArmy: 3 }) });
reT('wind',      { fitN: '侦察', fit: isCat('scout'), fitD: '出征地图一开始就全亮，积分倍率再 +0.1', fitFx: () => ({ tower: 1, startMult: 0.1 }) });
reT('crystal',   { fitN: '侦察', fit: isCat('scout'), fitD: '视野再 +1，精英和首领一开始就能看到', fitFx: () => ({ vision: 1, seeElite: 1 }) });
reT('ruin',      { fitN: '工程', fit: isCat('eng'), fitD: '返还提高到 80%', fitFx: () => ({ refund: 0.5 }) });
reT('mole',      { fitN: '工程', fit: isCat('eng'), fitD: '所有建造少花 1 天', fitFx: () => ({ buildDays: -1 }) });

// ───────── worlds: what their blueprints lean to, by category ─────────
M.WORLD_CATS = { town: ['defense', 'store'], forest: ['med', 'faith'], park: ['store', 'scout'], harbor: ['scout', 'power'], foundry: ['forge', 'power'],
  ward: ['med', 'train'], starship: ['eng', 'scout'], hell: ['defense', 'faith'], casino: ['store', 'forge'] };
const WT = M.WTHEME || {};
Object.keys(WT).forEach(k => { WT[k].style = 'w:' + k; });   // the old style lean (mc-game-h.js) finds no room of that "style" and steps aside
if (WT.foundry) WT.foundry.lootD = '经常掉落宝物图纸，建筑图纸偏向工坊和生产。';
const oDrop = M.dropBp;
M.dropBp = function (bias, style, qUp) {
  const w = typeof style === 'string' && style.startsWith('w:') ? style.slice(2) : null, cats = w && M.WORLD_CATS[w], m = M._g && M._g.meta;
  if (cats && Math.random() < 0.45) {
    const ks = Object.keys(B).filter(k => !B[k].fixed && !B[k].gone && !B[k].boss && cats.includes(B[k].cat) && (!m || !M.bpUseful || M.bpUseful(m, 'bbp:' + k)));
    if (ks.length) {
      const wq = M.bpWeights ? M.bpWeights(bias, qUp) : [60, 25, 11, 4], q = M.wpick([0, 1, 2, 3], i => (ks.some(k => B[k].q === i) ? wq[i] : 0));
      const at = ks.filter(k => B[k].q === q); if (at.length) return 'bbp:' + M.pick(at);
    }
  }
  return oDrop.apply(this, arguments);
};
})();
