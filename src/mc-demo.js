// ==== mc-demo.js ====
(function () {
// The Steam demo (2026-09-28: 「这是完整版steam游戏，我现在需要先上demo，攒愿望单」). Built by `python3 tools/mk.py --demo`, which
// sets window.MC_DEMO before the game's code; the full game never runs any of this.
// · 普通 only; the goal is night 10 (the full game's 普通 is 15): holding it ends the demo — thanks, and the wishlist.
// · The first two chapters (雾中小镇, 精灵之森); clearing the second says the rest is in the full game.
// · Two of the machine's parts come fitted — FEVER and the whole events wheel — the first hour's best moments.
// · No cabinet between games (portraits, figurines, cartridges, parts, achievements belong to the full game).
// · 「加入愿望单」 opens the full game's store page: in the desktop build through the Steam overlay (steam shell's openStore),
//   in a browser the store page.
const M = window.MC, DEMO = window.MC_DEMO; if (!M || !DEMO) return;
const G = M.Game.prototype, S = M.Sfx || {}, now = () => performance.now();
const D = M.DEMO = Object.assign({ goal: 10, chapters: ['town', 'forest'], parts: ['fever', 'events'], storeAppId: 0 }, DEMO);

// 普通 only, and its goal is the demo's
if (M.GDIFF && M.GDIFF[0]) M.GDIFF[0].goal = D.goal;
M.gdMax = () => 0;
if (M._g && M._g.meta) M._g.meta.gd = 0;

// the first two chapters
const oF = M.frontier;
M.frontier = (m) => { const w = oF(m); return w && D.chapters.includes(w) ? w : null; };

// the parts that come fitted
const oHP = M.hasPart;
if (oHP) M.hasPart = (k, p) => D.parts.includes(k) || oHP(k, p);

// no cabinet between games
M.unfolded = () => false;

// the store page of the full game
G.demoStore = function () {
  S.click && S.click();
  const nat = window.__wgpNative;
  if (nat && nat.openStore) { nat.openStore(); return; }
  if (D.storeAppId) window.open('https://store.steampowered.com/app/' + D.storeAppId + '/', '_blank');
  else this.toast && this.toast('正式版即将在 Steam 上线', '#ffcf4a');
};

if (M.GUIDE) M.GUIDE.push({ id: 'wishlist', cat: '房间', icon: 'u_star', title: '加入愿望单', line: '只在试玩版：打开正式版的 Steam 商店页，加进愿望单，上线时通知你。', scr: [] });

// the goal night held: the demo ends
const FULL = '正式版有 9 个章节、41 个首领和四档难度。';
const oNO = G.nightOver;
G.nightOver = function () {
  const m = this.meta;
  if (m && m.goalPend && m.portal && m.portal.hp > 0) {
    m.goalPend = 0; this.night = null;
    this.banner && this.banner({ kind: 'win', text: '试玩通关！', col: '#ffd970', col2: '#6a4a0a', sub: '守过了第 ' + D.goal + ' 夜', life: 2.6, y: 440 });
    S.fanfare && S.fanfare(); this.fx && this.fx.confetti && this.fx.confetti(160);
    setTimeout(() => {
      this.modal = { title: '试玩结束', titleColor: '#ffd970', text: '你守过了第 ' + D.goal + ' 夜，谢谢你玩到这里。\n' + FULL, img: 'u_star', border: '#ffd970', at: now(),
        choices: [{ t: '加入愿望单', sub: '上线时第一时间通知你', gold: true, fn: () => this.demoStore() }, { t: '再来一局', fn: () => { this.modal = null; this.gameOver('goal'); } }] };
      this.bump();
    }, 2200);
    this.bump(); return;
  }
  return oNO.apply(this, arguments);
};

// a lost game offers the wishlist too
const oGO = G.gameOver;
G.gameOver = function () {
  const r = oGO.apply(this, arguments), over = this.modal && this.modal.over ? this.modal : null;
  if (over && Array.isArray(over.choices) && !over.choices.some(c => c.t === '加入愿望单')) over.choices.push({ t: '加入愿望单', fn: () => this.demoStore() });
  return r;
};

// the second chapter cleared: the rest is in the full game
const oWin = G.runWin;
G.runWin = function (kind) {
  const r = oWin.apply(this, arguments), e = this.endInfo;
  if (kind === 'clear' && e && typeof e.sub === 'string') e.sub = e.sub.replace(/下一章：[^。]*。/, '后面的章节在正式版。');
  return r;
};

// the menu says it is the demo
const oView = G.view;
G.view = function () {
  const v = oView.call(this);
  if (v.isMenu && typeof v.menuSub === 'string' && v.menuSub.indexOf('试玩版') < 0) v.menuSub = '试玩版 · ' + v.menuSub;
  return v;
};
})();
