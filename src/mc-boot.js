// ==== mc-boot.js ====
(function () {
// Last in the bundle: things that need every module loaded before the game is built.
// The save check (mc-save.js) knows every room, blueprint and relic only now.
const M = window.MC;
if (M && M.runSaveCheck) M.runSaveCheck();
})();
