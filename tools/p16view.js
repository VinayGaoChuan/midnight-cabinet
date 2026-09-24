// dev viewer for the 16-bit sprites: window.__p16view(keys, states, { scale, cols }) draws a grid over the page
window.__p16view = function (keys, states, o = {}) {
  const M = window.MC, P = M.P16, sc = o.scale || 3, cols = o.cols || 8, cellW = o.cw || 150, cellH = o.ch || 150;
  states = states || [['idle', 0]];
  let cv = document.getElementById('__p16v'); if (!cv) { cv = document.createElement('canvas'); cv.id = '__p16v'; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#1a1424;image-rendering:pixelated'; document.body.appendChild(cv); cv.onclick = () => cv.remove(); }
  const n = keys.length * states.length, rows = Math.ceil(n / cols);
  cv.width = cols * cellW; cv.height = rows * cellH; cv.style.width = Math.min(innerWidth, cv.width) + 'px';
  const x = cv.getContext('2d'); x.fillStyle = '#1a1424'; x.fillRect(0, 0, cv.width, cv.height); x.imageSmoothingEnabled = false;
  let i = 0; const errs = [];
  keys.forEach(k => states.forEach(([st, f, rim]) => {
    const cx = (i % cols) * cellW, cy = Math.floor(i / cols) * cellH; i++;
    x.fillStyle = '#2a2034'; x.fillRect(cx + 2, cy + 2, cellW - 4, cellH - 4);
    try { const fr = P.frame(k, st, f || 0, { rim: rim || 0 }); if (!fr) { errs.push(k + ':nospec'); return; }
      const w = fr.artW * sc, h = fr.artH * sc; const bmp = fr; // bitmap is art-res
      x.save(); x.imageSmoothingEnabled = false; x.drawImage(bmp, cx + cellW / 2 - (fr.cx / P.ART) * sc, cy + cellH - 16 - (fr.footY / P.ART) * sc, w, h); x.restore();
      if (o.focus && fr.focus) { x.fillStyle = '#f0f'; x.fillRect(cx + cellW / 2 + fr.focus[0] / P.ART * sc - 1, cy + cellH - 16 + fr.focus[1] / P.ART * sc - 1, 3, 3); }
    } catch (e) { errs.push(k + ':' + e.message); }
    x.fillStyle = '#cfc6b8'; x.font = '11px sans-serif'; x.fillText(((M.DB && M.DB[k] && M.DB[k].n) || k) + ' ' + st + (f ? f : ''), cx + 6, cy + 14);
  }));
  return errs;
};
