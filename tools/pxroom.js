// Pixel room viewer (dev tool): load in the running game, then
//   __rooms(['smithy', 'generator'], { scale: 4 })   live, lit, at integer scale over the page (click to close)
//   __rooms()                                        every pixel room, small
// Keys 1–9 poke room i ('sel' flash); B replays 'built'; H toggles hover.
(function () {
  let cv, raf, hov = false;
  window.__roomsOff = function () { if (raf) cancelAnimationFrame(raf); if (cv) cv.remove(); cv = null; document.removeEventListener('keydown', key); };
  function key(e) { const X = window.MC.PXR, ks = cv && cv._keys; if (!ks) return; const i = +e.key - 1; if (i >= 0 && i < ks.length) X.poke('_view_' + ks[i], 'sel'); if (e.key === 'b') ks.forEach(k => X.poke('_view_' + k, 'built')); if (e.key === 'h') hov = !hov; }
  window.__rooms = function (keys, o) {
    o = o || {}; const X = window.MC.PXR; keys = keys || Object.keys(X.defs).filter(k => k[0] !== '_'); window.__roomsOff();
    const n = keys.length, cols = o.cols || Math.ceil(Math.sqrt(n * 1.4)), rows = Math.ceil(n / cols), sc = o.scale || Math.max(1, Math.floor(Math.min(innerWidth / (cols * 152), innerHeight / (rows * 107))));
    cv = document.createElement('canvas'); cv._keys = keys; cv.width = cols * 152 * sc; cv.height = rows * 107 * sc; Object.assign(cv.style, { position: 'fixed', left: '0', top: '0', zIndex: 99999, background: '#05040a', imageRendering: 'pixelated', cursor: 'pointer' });
    document.body.appendChild(cv); cv.onclick = window.__roomsOff; document.addEventListener('keydown', key);
    const x = cv.getContext('2d'), t0 = performance.now();
    const loop = () => { const t = (performance.now() - t0) / 1000 + (o.t || 0); x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#05040a'; x.fillRect(0, 0, cv.width, cv.height);
      keys.forEach((k, i) => { const cx = (i % cols) * 152 * sc, cy = Math.floor(i / cols) * 107 * sc; x.setTransform(sc / 2, 0, 0, sc / 2, cx + sc, cy + sc); X.draw(x, 0, 0, k, t, { hov, par: o.par || 0 }, '_view_' + k, 9); });
      raf = requestAnimationFrame(loop); };
    loop(); return { cols, rows, scale: sc };
  };
})();
