/* pcd 角色查看页的音效（view.html?sfx=1 时加载）：运行时读游戏的音效库 src/mc-audio.js，
   把角色关键帧事件（PCD.sfxOut）接到 SFX.charFx。音效那边维护，改动请告诉音效会话。 */
(function () {
  const PCD = window.PCD = window.PCD || {};
  // 角色的专属声音签名（按 design.md 的「音色」一行填，覆盖默认映射）：key → { 事件: 参数 }
  PCD.sfxSig = PCD.sfxSig || {};
  PCD.sfxOut = function (ev, e) {
    const S = window.SFX; if (!S || !S.ready()) return;
    const sig = PCD.sfxSig[e.key], o = sig && sig[ev] ? Object.assign({}, e, sig[ev]) : e;
    S.charFx(ev, o);
  };
  // 浏览器要求先有一次交互才能出声：第一次点击 / 按键时启动音频
  const unlock = () => { if (window.SFX && window.SFX.init()) { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); } };
  window.addEventListener('pointerdown', unlock, { passive: true }); window.addEventListener('keydown', unlock);
  const here = (document.currentScript && document.currentScript.src) || location.href;
  const s = document.createElement('script'); s.src = new URL('../../src/mc-audio.js', here).href;
  s.onerror = () => console.warn('音效库没加载到：', s.src);
  document.head.appendChild(s);
})();
