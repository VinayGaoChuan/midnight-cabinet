(function () {
  if (customElements.get('m-img')) return;
  class MImg extends HTMLElement {
    static get observedAttributes() { return ['src']; }
    connectedCallback() { if (!this.style.display) this.style.display = 'block'; this.sync(); }
    attributeChangedCallback() { this.sync(); }
    sync() {
      const s = this.getAttribute('src') || '';
      const imgs = this.querySelectorAll(':scope > img'); if (!this.im && imgs.length) this.im = imgs[0]; imgs.forEach(x => { if (x !== this.im) x.remove(); });
      if (!s || s.indexOf('{{') >= 0) { if (this.im) { this.im.remove(); this.im = null; } return; }
      if (!this.im) { this.im = document.createElement('img'); this.im.style.cssText = 'display:block;width:inherit;height:inherit;image-rendering:auto'; this.im.draggable = false; this.appendChild(this.im); }
      if (this.im._s !== s) { this.im._s = s; const m = /#x([\d.]+)(p?)$/.exec(s); this.im.style.imageRendering = m && m[2] ? 'pixelated' : 'auto'; if (m) { this.im.removeAttribute('src'); this.im.setAttribute('srcset', s.slice(0, m.index) + ' ' + m[1] + 'x'); } else { this.im.removeAttribute('srcset'); this.im.setAttribute('src', s); } }
    }
  }
  customElements.define('m-img', MImg);
})();
