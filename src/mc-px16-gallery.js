// ==== mc-px16-gallery.js ====
(function () {
// The cast on parade: open the game with #gallery (or call MC.P16.gallery()) to see every character loop through
// IDLE → WALK → ATTACK → CHARGE → CAST → RECOVER with its own skill particles, like the pixel-wizard demo.
// ← / → (or the buttons, or the wheel) change page; Esc or right click closes.
const M = window.MC, P16 = M.P16, ART = P16.ART;
const STEPS = [['idle', 1.1, 2.5], ['walk', 0.8, 10], ['atk', 0.45, 6.7], ['charge', 0.8, 8], ['cast', 0.28, 7], ['recover', 0.3, 1]];
const LOOP = STEPS.reduce((a, s) => a + s[1], 0);
const HEROES = ['watchman', 'widow', 'nun', 'butcherlord', 'clockmaker', 'cremator'];
P16.gallery = function () {
  if (document.getElementById('__p16gal')) return;
  const keys = HEROES.concat(Object.keys(M.DB || {}), ['militia']);
  const cv = document.createElement('canvas'); cv.id = '__p16gal'; cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:100000;background:#120c1a;image-rendering:pixelated;cursor:pointer';
  document.body.appendChild(cv); const x = cv.getContext('2d');
  let page = 0, raf = 0, t0 = performance.now(), last = t0; const cols = 8, rows = 4, per = cols * rows, pages = Math.ceil(keys.length / per);
  const pools = {}, fake = {};
  const close = () => { cancelAnimationFrame(raf); cv.remove(); window.removeEventListener('keydown', key); };
  const key = (e) => { if (e.code === 'ArrowRight') page = (page + 1) % pages; else if (e.code === 'ArrowLeft') page = (page + pages - 1) % pages; else if (e.code === 'Escape') close(); };
  window.addEventListener('keydown', key); cv.addEventListener('contextmenu', (e) => { e.preventDefault(); close(); });
  cv.addEventListener('wheel', (e) => { page = (page + (e.deltaY > 0 ? 1 : pages - 1)) % pages; });
  cv.addEventListener('click', (e) => { const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width; if (px > 0.85) page = (page + 1) % pages; else if (px < 0.15) page = (page + pages - 1) % pages; });
  const recOf = (k) => { const d = M.DB && M.DB[k]; if (HEROES.includes(k)) return P16.FX['P:' + k]; const tr = d && d.tr || []; for (const t of tr) { const c = t.replace(/^Summon|Trait$/g, ''); if (P16.FX[c]) return P16.FX[c]; } return null; };
  const draw = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = (now - t0) / 1000;
    const W = cv.width = Math.floor(innerWidth * devicePixelRatio / 2), H = cv.height = Math.floor(innerHeight * devicePixelRatio / 2);
    x.imageSmoothingEnabled = false; x.fillStyle = '#120c1a'; x.fillRect(0, 0, W, H);
    // night sky, stars, floor lines
    for (let i = 0; i < 60; i++) { const sx = (i * 97) % W, sy = (i * 53) % Math.floor(H * 0.9); if ((Math.floor(t * 2) + i) % 7) { x.fillStyle = i % 5 ? '#3a2c48' : '#8e8674'; x.fillRect(sx, sy, 1, 1); } }
    x.fillStyle = '#e6dcc4'; x.font = '10px sans-serif'; x.fillText('午夜机台 · 角色一览  第 ' + (page + 1) + ' / ' + pages + ' 页   ←/→ 翻页 · Esc 关闭', 8, 12);
    const cw = Math.floor(W / cols), chh = Math.floor((H - 18) / rows), q = t % LOOP;
    let st = STEPS[0], acc = 0; for (const s of STEPS) { if (q < acc + s[1]) { st = s; break; } acc += s[1]; } const lt = q - acc;
    keys.slice(page * per, page * per + per).forEach((k, i) => {
      const cx = (i % cols) * cw, cy = 18 + Math.floor(i / cols) * chh, spec = P16.spec(k); if (!spec) return;
      x.fillStyle = '#1a1424'; x.fillRect(cx + 1, cy + 1, cw - 2, chh - 2); x.fillStyle = '#2e2236'; x.fillRect(cx + 1, cy + chh - 14, cw - 2, 1);
      const phase = (t + i * 0.13) % LOOP; let s2 = STEPS[0], a2 = 0; for (const s of STEPS) { if (phase < a2 + s[1]) { s2 = s; break; } a2 += s[1]; }
      const f = Math.floor((phase - a2) * s2[2]), rim = s2[0] === 'charge' ? ((phase - a2) > s2[1] / 2 ? 2 : 1) : s2[0] === 'cast' ? 2 : s2[0] === 'recover' ? 1 : 0;
      const fr = P16.frame(k, s2[0], f, { rim }); if (!fr) return;
      const sc = Math.max(1, Math.min(3, Math.floor((chh - 26) / fr.artH * 1.35))), fx = cx + Math.floor(cw / 2), fy = cy + chh - 15;
      x.drawImage(fr, fx - fr.cx / ART * sc, fy - fr.footY / ART * sc, fr.artW * sc, fr.artH * sc);
      // skill particles at the art scale of the cell
      const P = pools[k] || (pools[k] = new P16.Pool()), rec = recOf(k), ramp = (rec && rec.ramp) || spec.magic || 'arcane';
      const e = fake[k] || (fake[k] = { x: 0, y: 0, sz: 1, side: 'A', traits: [] }); e._fr = fr; e.x = 0; e.y = 0;
      const was = P._st; P._st = s2[0];
      if (was !== s2[0] && (s2[0] === 'charge' || s2[0] === 'cast')) { const pat = P16.PAT[(rec ? (s2[0] === 'charge' ? rec.ch : rec.cs) : s2[0] === 'charge' ? 'spiral' : 'nova')] || P16.PAT.spiral; pat(P, e, fr.focus[0], fr.focus[1], ramp, 10, s2[1], { t: 0 }); }
      P.step(dt); x.save(); x.translate(fx, fy); x.scale(sc / ART, sc / ART); P.draw(x); x.restore();
      x.fillStyle = spec.magic ? P16.RAMP[spec.magic][3] : '#cfc6b8'; x.font = '9px sans-serif'; x.textAlign = 'center';
      const d = M.DB && M.DB[k]; x.fillText((d ? d.n : ({ watchman: '守夜人', widow: '赌徒寡妇', nun: '驱魔修女', butcherlord: '屠宰场主', clockmaker: '钟表匠', cremator: '焚尸人', militia: '民兵' })[k] || k) + ' · ' + s2[0], fx, cy + chh - 4); x.textAlign = 'left';
    });
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
};
if (/^#gallery$/.test(location.hash || '')) setTimeout(() => P16.gallery(), 1200);
window.addEventListener('hashchange', () => { if (location.hash === '#gallery') P16.gallery(); });
})();

;
