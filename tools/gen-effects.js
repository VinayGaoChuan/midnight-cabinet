// Regenerates the data-driven parts of docs/effects.md (the effects inventory for polishing): every unit's active
// skill, every skill recipe, every mini game, every room scene and defence weapon, every support item, every sound.
// It loads the real game code (src/_order.txt) with a stub page, so the lists are exactly what the game has.
// Hand-written sections stay untouched; only the blocks between <!-- gen:NAME --> and <!-- /gen:NAME --> change.
// usage: node tools/gen-effects.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'src'), DOC = path.join(ROOT, 'docs', 'effects.md');

// ── the game, without a screen ──
const stub = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'length' ? 0 : k === Symbol.iterator ? function* () {} : stub, apply: () => stub, construct: () => stub, set: () => true });
const win = { MC: {}, document: stub, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, navigator: { userAgent: 'node', maxTouchPoints: 0 }, location: { hash: '', search: '', href: '' }, performance: { now: () => 0 }, requestAnimationFrame() {}, setTimeout() {}, clearTimeout() {}, setInterval() {}, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }), devicePixelRatio: 1, innerWidth: 1920, innerHeight: 1080, Image: function () { return stub; }, ImageData: function () { return stub; }, console, Math, JSON, Object, Array, Map, Set, Uint8Array, Float32Array, Uint8ClampedArray, Promise, Date };
['CanvasRenderingContext2D', 'HTMLCanvasElement', 'HTMLElement', 'Element', 'Node', 'OffscreenCanvas', 'Path2D', 'KeyboardEvent', 'MouseEvent', 'Event'].forEach(n => { win[n] = function () { return stub; }; win[n].prototype = {}; });
win.customElements = { define() {}, get() {} }; win.window = win; win.self = win; win.globalThis = win;
const ctx = vm.createContext(win);
fs.readFileSync(path.join(SRC, '_order.txt'), 'utf8').split(/\s+/).filter(f => /\.js$/.test(f)).forEach(f => vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f }));
const M = win.MC, DB = M.DB, TDB = M.TDB, FX = M.P16.FX;
if (!M.unitSkill) throw new Error('game code did not load');

const Q = ['普通', '稀有', '史诗', '传说'];
const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '／').replace(/\n/g, ' ');
const pad = (p, i) => p + String(i).padStart(3, '0');
const short = (t) => t.replace(/^Summon|Trait$/g, '');
const PAT = { spiral: '螺旋聚气', heal: '十字光点', fire: '火星', frost: '冰晶', bolt: '闪电', shield: '护罩', summon: '法阵', poison: '毒雾', blade: '落刃', buff: '光柱鼓舞', shadow: '暗影', beam: '光束', coin: '金币', nova: '环形冲击', meteor: '陨石' };
const recTxt = (r) => r ? PAT[r.ch] + ' → ' + PAT[r.cs] + '（' + r.ramp + '）' : '通用：螺旋聚气 → 爆散';
const SIG_KEY = {}; Object.keys(M.SIG).forEach(k => { SIG_KEY[M.SIG[k].n] = k; });
// what the game shows when this unit casts: its skill's recipe (the signature's, or the castable trait's)
const skillOf = (k) => {
  const s = M.unitSkill(k); if (!s) return null;
  if (s.sig) return { n: s.n, sig: 1, key: s.sig, rec: FX[s.sig] };
  const t = (DB[k].tr || []).find(x => (TDB[x] || {}).n === s.n); const key = t ? short(t) : '';
  // growth traits (渔夫、灵魂献祭) spend the bar on growing; in battle these units cast their vocation's signature skill
  if (/^(JuniorFisherman|EliteFisherman|SpiritOffering)$/.test(key) && M.sigOf(DB[k])) { const sg = M.sigOf(DB[k]); return { n: M.SIG[sg].n, sig: 1, key: sg, rec: FX[sg], grow: TDB[t].n }; }
  return { n: s.n, key, rec: FX[key] };
};

const put = (doc, name, body) => { const a = '<!-- gen:' + name + ' -->', b = '<!-- /gen:' + name + ' -->', i = doc.indexOf(a), j = doc.indexOf(b); if (i < 0 || j < i) throw new Error('marker missing: ' + name); return doc.slice(0, i + a.length) + '\n' + body + '\n' + doc.slice(j); };
let doc = fs.readFileSync(DOC, 'utf8');
const count = {};

// ── units ──
{
  let out = '', n = 0;
  [['Summon', '我方部队'], ['Enemy', '敌人'], ['Derivant', '召唤物 / 衍生单位']].forEach(([type, title]) => {
    const keys = Object.keys(DB).filter(k => DB[k].type === type).sort((a, b) => (DB[a].q || 0) - (DB[b].q || 0) || DB[a].race.localeCompare(DB[b].race) || a.localeCompare(b));
    out += '\n#### ' + title + '（' + keys.length + '）\n\n| 编号 | 单位 | 种族 · 职业 · 品质 | 主动技能 | 触发条件 | 蓄力 → 施放（色板） | 其他特性 |\n|---|---|---|---|---|---|---|\n';
    keys.forEach(k => {
      const d = DB[k], s = skillOf(k), tr = s && M.unitTrigger(k), others = (d.tr || []).filter(t => !s || (TDB[t] || {}).n !== s.n).map(t => ((TDB[t] || {}).n || short(t)) + (FX[short(t)] ? '✦' : ''));
      out += '| ' + pad('U', ++n) + ' | ' + esc(d.n) + '<br>`' + k + '` | ' + d.race + ' · ' + (d.voc || '无职业') + ' · ' + Q[d.q || 0] + ' | ' + (s ? esc(s.n) + (s.sig ? '（职业招牌）' : '') : '无（只有普攻）') + ' | ' + (tr ? esc(tr.d) : '—') + ' | ' + (s ? recTxt(s.rec) : '—') + ' | ' + esc(others.join('、') || '—') + ' |\n';
    });
  });
  out += '\n- 我方部队开战时技能就绪（法力满），满足触发条件才放（`src/mc-skilltrigger.js`）；敌人从 0 开始攒法力，用同样的触发条件。\n- 敌人里只有精英和首领会放职业招牌技能，普通敌人只放自己的特性技能。\n- 「其他特性」里带 ✦ 的：不是攒满法力才放的主动技能，但触发时有自己的特效（配方见 S）。\n';
  doc = put(doc, 'units', out); count.units = n;
}

// ── skill recipes ──
{
  const HERO = {}; Object.keys(M.HEROES).forEach(k => { HERO[k] = M.HEROES[k].n; });
  const users = (key) => Object.keys(DB).filter(k => { const s = skillOf(k); return s && s.key === key; }).map(k => DB[k].n);
  const trig = (key) => Object.keys(DB).filter(k => (DB[k].tr || []).some(t => short(t) === key)).map(k => DB[k].n);
  let out = '\n| 编号 | 技能 | 类别 | 谁会放 | 蓄力 → 施放（色板） | 画面描述 |\n|---|---|---|---|---|---|\n', r = 0;
  Object.keys(FX).filter(i => TDB['Summon' + i + 'Trait']).forEach(i => { const u = users(i), all = u.length ? u : trig(i); out += '| ' + pad('S', ++r) + ' | ' + esc(TDB['Summon' + i + 'Trait'].n) + ' | ' + (u.length ? '主动特性' : '特性触发') + ' | ' + esc(all.slice(0, 5).join('、') + (all.length > 5 ? ' 等 ' + all.length + ' 个' : '')) + ' | ' + recTxt(FX[i]) + ' | ' + esc(FX[i].d) + ' |\n'; });
  Object.keys(M.SIG).forEach(i => { out += '| ' + pad('S', ++r) + ' | ' + M.SIG[i].n + ' | 职业招牌 | ' + (users(i).length ? users(i).length + ' 个单位' : '暂无单位使用（预留）') + ' | ' + recTxt(FX[i]) + ' | ' + esc(FX[i] ? FX[i].d : '') + ' |\n'; });
  Object.keys(FX).filter(i => /^[LP]:/.test(i)).forEach(i => { const h = M.HEROES[i.slice(2)], sk = i[0] === 'L' ? h.skill.n : (M.PSKILL[i.slice(2)] || {}).n; out += '| ' + pad('S', ++r) + ' | ' + (i[0] === 'L' ? '军团技能「' : '个人技能「') + sk + '」 | 领袖 | ' + HERO[i.slice(2)] + ' | ' + recTxt(FX[i]) + ' | ' + esc(FX[i].d) + ' |\n'; });
  doc = put(doc, 'recipes', out); count.recipes = r;
}

// ── mini games ──
{
  let out = '\n| 编号 | 小游戏 | 规则（游戏内文案） | 代码 |\n|---|---|---|---|\n', n = 0;
  const where = {}; fs.readdirSync(SRC).filter(f => /^mc-mini-.\.js$/.test(f)).forEach(f => { const s = fs.readFileSync(path.join(SRC, f), 'utf8'); (s.match(/MINI\.([a-z]+) = \{/g) || []).forEach(x => { where[/MINI\.([a-z]+)/.exec(x)[1]] = f; }); });
  Object.keys(M.MINI).forEach(k => { const D = M.MINI[k]; out += '| ' + pad('G', ++n) + ' | ' + D.title + ' | ' + esc(typeof D.text === 'string' ? D.text : '') + ' | `' + (where[k] || '?') + '` MINI.' + k + ' |\n'; });
  doc = put(doc, 'minis', out); count.minis = n;
}

// ── rooms: every building has an animated scene; defence rooms fire in base defence ──
{
  const B = M.BUILDINGS; let out = '\n| 编号 | 建筑 | 品质 | 房间场景 | 守城武器 |\n|---|---|---|---|---|\n', n = 0;
  Object.keys(B).forEach(k => { const b = B[k], w = b.weapon; out += '| ' + pad('R', ++n) + ' | ' + b.n + ' | ' + Q[b.q || 0] + ' | ' + esc((M.ROOM_D || {})[k] || '（缺描述）') + ' | ' + (w ? w.kind + ' · 射程 ' + w.range + (w.splash ? ' · 溅射' : '') + (w.chain ? ' · 连锁 ' + w.chain : '') + (w.slow ? ' · 减速' : '') : (b.defend || /参战|守卫|陶俑|武僧/.test(b.d || '') ? '守城时召唤援军' : '—')) + ' |\n'; });
  doc = put(doc, 'rooms', out); count.rooms = n;
}

// ── support items ──
{
  let out = '\n| 编号 | 道具 | 效果 | 品质越高 |\n|---|---|---|---|\n', n = 0;
  Object.keys(M.ITEMS).forEach(k => { const it = M.ITEMS[k]; out += '| ' + pad('I', ++n) + ' | ' + it.name + ' | ' + esc(it.desc || it.d || '') + ' | 转盘决定品质：普通 → 传说，特效逐级加大 |\n'; });
  doc = put(doc, 'items', out); count.items = n;
}

// ── sounds (all synthesised, src/mc-fx.js) ──
{
  const src = fs.readFileSync(path.join(SRC, 'mc-fx.js'), 'utf8');
  const names = [...new Set((src.match(/^ {2}([a-zA-Z]+)\(/gm) || []).map(x => x.trim().replace('(', '')))].filter(k => typeof M.Sfx[k] === 'function' && !/^(init|env|setMuted|lim)$/.test(k));
  const all = fs.readdirSync(SRC).filter(f => /\.js$/.test(f)).map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
  const users = (k) => all.split('Sfx.' + k + '(').length - 1 + all.split('S.' + k + '(').length - 1; const hasBuild = true;
  let out = '\n| 编号 | 音效 | 调用次数 |\n|---|---|---|\n', n = 0;
  names.forEach(k => { out += '| ' + pad('V', ++n) + ' | `Sfx.' + k + '` | ' + (hasBuild ? users(k) : '—') + ' |\n'; });
  doc = put(doc, 'sounds', out); count.sounds = n;
}

// ── the character table: every leader and unit on one sheet (docs/characters.csv; .ai/characters.json feeds the web view) ──
{
  const TYPE = { Summon: '部队', Enemy: '敌人', Derivant: '召唤物' }, RANGED = ['近战', '远程', '不动（建筑 / 塔）'];
  const trait = (t) => { const x = TDB[t] || {}; return (x.n || short(t)) + '：' + (x.d || ''); };
  const rows = [];
  Object.keys(M.HEROES).forEach((k, i) => {
    const h = M.HEROES[k], ps = M.PSKILL[k] || {}, tr = (M.PS_TRIG || {})[k];
    let ld = ''; try { ld = typeof h.skill.d === 'function' ? h.skill.d(1, {}) : h.skill.d; } catch (e) {}
    rows.push({ id: 'L' + String(i + 1).padStart(2, '0'), n: h.n, key: k, type: '领袖', race: '英雄', voc: '', q: '随招募', hp: h.hp, atk: h.atk, as: Math.round(100 / (h.cd || 1)), spd: h.spd, range: h.range, ranged: h.range > 200 ? '远程' : '近战', cost: '', power: '',
      skill: '军团「' + h.skill.n + '」：' + ld + '（1 级数值，冷却按走过的站数算）', trig: '玩家按空格（领袖在场外指挥时）',
      skill2: '个人「' + ps.n + '」（' + (ps.resN || '') + '）：' + (ps.d || ''), trig2: tr ? tr.d : '', fx: '', traits: '', up: '', desc: '' });
  });
  let i = 0;
  ['Summon', 'Enemy', 'Derivant'].forEach(type => Object.keys(DB).filter(k => DB[k].type === type).sort((a, b) => (DB[a].q || 0) - (DB[b].q || 0) || DB[a].race.localeCompare(DB[b].race) || a.localeCompare(b)).forEach(k => {
    const d = DB[k], s = skillOf(k), tr = s && M.unitTrigger(k), skillT = s ? (s.sig ? { n: s.n, d: M.SIG_DESC[s.key] } : M.unitSkill(k)) : null;
    rows.push({ id: pad('U', ++i), n: d.n, key: k, type: TYPE[type] || type, race: d.race, voc: d.voc || '', q: Q[d.q || 0], hp: d.hp, atk: d.atk, as: d.as, spd: d.spd, range: d.rad, ranged: RANGED[d.ranged || 0], cost: d.cost, power: M.unitPower ? M.unitPower(k) : '',
      skill: skillT ? skillT.n + (s.sig ? '（职业招牌）' : '') + '：' + (skillT.d || '') : '', trig: tr ? tr.d : '', skill2: '', trig2: '', fx: s ? recTxt(s.rec) : '',
      traits: (d.tr || []).map(trait).join('\n'), up: d.up ? (DB[d.up] ? DB[d.up].n + '（' + d.up + '）' : d.up) : '', desc: d.desc || '' });
  }));
  const COLS = [['id', '编号'], ['n', '名字'], ['key', '代码名'], ['type', '类型'], ['race', '种族'], ['voc', '职业'], ['q', '品质'], ['hp', '生命'], ['atk', '攻击'], ['as', '攻速（100=标准）'], ['spd', '移速'], ['range', '射程'], ['ranged', '攻击方式'], ['cost', '招募费用'], ['power', '战力'], ['skill', '主动技能'], ['trig', '触发条件'], ['skill2', '个人技能（领袖）'], ['trig2', '个人技能触发'], ['fx', '技能特效（蓄力 → 施放）'], ['traits', '全部特性'], ['up', '进化为'], ['desc', '简介']];
  const cell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = '﻿' + [COLS.map(c => c[1]).join(',')].concat(rows.map(r => COLS.map(c => cell(r[c[0]])).join(','))).join('\r\n') + '\r\n';
  fs.writeFileSync(path.join(ROOT, 'docs', 'characters.csv'), csv, 'utf8');
  fs.mkdirSync(path.join(ROOT, '.ai'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.ai', 'characters.json'), JSON.stringify({ cols: COLS, rows }), 'utf8');
  count.characters = rows.length;
}

fs.writeFileSync(DOC, doc);
console.log(Object.entries(count).map(([k, v]) => k + ' ' + v).join(' · '), '->', path.relative(ROOT, DOC));
