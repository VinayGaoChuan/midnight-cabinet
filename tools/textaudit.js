// Text-density audit (dev tool). Load it in the page, then call window.__textAudit('label') on any screen:
// counts the visible characters on screen — DOM text plus words drawn on the canvases in the last frames — and
// lists the densest blocks, so every page can be checked against the "little text on screen" rule in docs/design.md.
(function () {
  const CJK = /[㐀-鿿豈-﫿]/g;
  const weight = (s) => { const c = (s.match(CJK) || []).length; const rest = s.replace(CJK, '').replace(/[\s·•|/()（）:：,，.。!！?？、\-—+×%=<>]+/g, ' ').trim(); return { cjk: c, words: rest ? rest.split(' ').filter(w => /[a-zA-Z]{2,}/.test(w)).length : 0, nums: rest ? rest.split(' ').filter(w => /^\d/.test(w)).length : 0 }; };
  // canvas words: remember what fillText drew recently (position-deduped)
  const cv = window.__cvText || (window.__cvText = new Map());
  if (!CanvasRenderingContext2D.prototype.__audited) {
    const o = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { if (this.canvas && this.canvas.isConnected && t && String(t).trim()) { const k = String(t) + '@' + Math.round(x / 8) + ',' + Math.round(y / 8); cv.set(k, performance.now()); } return o.apply(this, arguments); };
    CanvasRenderingContext2D.prototype.__audited = true;
  }
  const visible = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false; for (let e = el; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.08) return false; } return true; };
  const boxOf = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e), r = e.getBoundingClientRect(); if ((s.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor) || parseFloat(s.borderTopWidth) > 0) && r.width * r.height > 2500) return e; } return document.body; };
  window.__textAudit = function (label, o = {}) {
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const boxes = new Map(); let n, all = '';
    while ((n = tw.nextNode())) { const t = n.nodeValue.trim(); if (!t || !n.parentElement || n.parentElement.closest('#__mag,#__p16gal,script,style')) continue; if (!visible(n.parentElement)) continue; all += t + ' '; const b = boxOf(n.parentElement); const e = boxes.get(b) || { t: '', n: 0 }; e.t += t + ' '; boxes.set(b, e); }
    const now = performance.now(), cw = []; cv.forEach((at, k) => { if (now - at < (o.win || 700)) cw.push(k.slice(0, k.lastIndexOf('@'))); else cv.delete(k); });
    const dom = weight(all), can = weight(cw.join(' '));
    const blocks = [...boxes.entries()].map(([el, e]) => { const w = weight(e.t), r = el.getBoundingClientRect(); return { cjk: w.cjk, words: w.words, at: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], text: e.t.replace(/\s+/g, ' ').slice(0, o.cut || 160) }; }).filter(b => b.cjk + b.words > 0).sort((a, b) => b.cjk - a.cjk).slice(0, o.top || 8);
    const g = window.__mcg;
    return { label: label || '', screen: g && g.screen, panel: g && g.panel && g.panel.kind, domCJK: dom.cjk, domWords: dom.words, canvasCJK: can.cjk, canvasItems: cw.length, total: dom.cjk + can.cjk, blocks, canvasSample: cw.filter(s => CJK.test(s)).slice(0, 12) };
  };
})();
