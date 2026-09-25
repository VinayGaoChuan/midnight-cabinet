// ==== mc-game-a.js ====
(function () {
const M = window.MC;
const now = () => performance.now();
class Game {
  constructor(ui) {
    this.ui = ui; this.E = M; this.meta = M.loadMeta3(); this.fx = new M.FxLayer(); this.bv = new M.BaseView();
    this.screen = 'intro'; this.intro = { started: false, t: 0.8 }; this.keys = {}; this.tw = {}; this.twT = {}; this.held = {}; this.pulse = {};
    this.hideU = new Set(); this.hideI = new Set(); this.banners = []; this.speed = ui.defaultSpeed || 2; this.paused = false; this.acc = 0; this.coachFlags = {};
  }
  bump() { this.ui.bump(); }
  save() { M.saveMeta3(this.meta); }
  go(s) { this.keys = {}; this.tipData = null; this.coachData = null; this.screen = s; this.bump(); }
  toast(text, c) { this.toastData = { text, c: c || '#f2c14e', until: now() + 2000, at: now() }; this.bump(); }
  coach(text, x, y, tx, ty) { this.coachData = { text, x, y, tx, ty, at: now() }; M.Sfx.sparkle(); this.bump(); }
  coachOnce(k, text, x, y, tx, ty) { if (this.coachFlags[k]) return; this.coachFlags[k] = 1; this.coach(text, x, y, tx, ty); }
  // ── positions of DOM targets (stage coords) ──
  fxPos(sel) {
    const st = this.ui.stage(); if (!st) return null; const el = st.querySelector('[data-fx="' + sel + '"]'); if (!el) return null;
    const a = st.getBoundingClientRect(), b = el.getBoundingClientRect(), s = this.ui.scale();
    return { x: (b.left + b.width / 2 - a.left) / s, y: (b.top + b.height / 2 - a.top) / s };
  }
  corePos() { const p = M.cellCenter(M.CORE.c, M.CORE.r); return this.bv.toScreen(p.x, p.y); }
  cellPos(c, r) { const p = M.cellCenter(c, r); return this.bv.toScreen(p.x, p.y); }
  hold(k, v) { if (this.held[k] == null) this.held[k] = v; }
  release(k) { delete this.held[k]; this.pulse[k] = now(); M.Sfx.coin(); }
  fly(icon, from, sel, col, onLand, delay) {
    const to = (typeof sel === 'string' ? this.fxPos(sel) : sel) || { x: 960, y: 60 };
    const img = typeof icon === 'string' ? M.spriteCanvas(icon, 6) : icon;
    this.fx.fly(img, from, to, { col: col || '#ffe08a', onLand: () => { if (typeof sel === 'string') this.punchSel(sel, 1); this.wave(to.x, to.y, 0.8, 260); onLand && onLand(); }, delay: delay || 0, s0: 1.4, s1: 0.7 });
  }
  // ── DOM juice: punch pressed element, push neighbours, sparks ──
  jiggle(el, kf, dur) { try { el.animate(kf, { duration: dur || 320, easing: 'cubic-bezier(.2,.9,.25,1)', composite: 'add' }); } catch (e) {} }
  punch(el, p) { if (!el) return; p = p || 1; this.jiggle(el, [{ transform: 'scale(1)' }, { transform: 'scale(' + (1 - 0.1 * p) + ',' + (1 - 0.14 * p) + ')', offset: 0.18 }, { transform: 'scale(' + (1 + 0.1 * p) + ',' + (1 + 0.06 * p) + ')', offset: 0.5 }, { transform: 'scale(' + (1 - 0.03 * p) + ')', offset: 0.75 }, { transform: 'scale(1)' }], 360); try { el.animate([{ filter: 'brightness(2.2) saturate(1.4)' }, { filter: 'brightness(1)' }], { duration: 260, easing: 'ease-out' }); } catch (e) {} }
  punchSel(sel, p) { const st = this.ui.stage(); if (!st) return; this.punch(st.querySelector('[data-fx="' + sel + '"]'), p); }
  wave(x, y, p, R) {
    const st = this.ui.stage(); if (!st) return; const a = st.getBoundingClientRect(), s = this.ui.scale(); R = R || 340;
    const els = st.querySelectorAll('[data-fx],[style*="cursor: pointer"]'); let n = 0;
    for (const el of els) { if (n > 28) break; const b = el.getBoundingClientRect(); if (!b.width) continue; const cx = (b.left + b.width / 2 - a.left) / s, cy = (b.top + b.height / 2 - a.top) / s, d = Math.hypot(cx - x, cy - y); if (d < 30 || d > R) continue; n++;
      const k = (1 - d / R) * 16 * p, dx = (cx - x) / d * k, dy = (cy - y) / d * k, dl = d / R * 90;
      this.jiggle(el, [{ transform: 'translate(0,0)' }, { transform: 'translate(0,0)', offset: dl / (dl + 380) }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 0.25) + 'deg)', offset: (dl + 90) / (dl + 380) }, { transform: 'translate(' + (-dx * 0.35) + 'px,' + (-dy * 0.35) + 'px)', offset: (dl + 210) / (dl + 380) }, { transform: 'translate(0,0)' }], dl + 380); }
  }
  pointerEl(t) { let el = t, best = null; for (let i = 0; el && i < 7; i++, el = el.parentElement) { if (!el.style || el.tagName === 'CANVAS') continue; const fx = el.getAttribute && el.getAttribute('data-fx'); if (fx && /^card\d|^hero-|^tal-/.test(fx)) return el; if (!best && (el.style.cursor === 'pointer' || (fx && fx !== 'heroes' && fx !== 'roster' && fx !== 'items' && fx !== 'legion') || (el.style.width && parseInt(el.style.width) <= 120 && el.style.border && /radial-gradient/.test(el.style.background || '')))) best = el; } return best; }
  btnKind(el) { const bg = (el.style.background || '') + (el.style.backgroundImage || ''); if (/255, 224, 138|ffe08a|184, 255, 240|b8fff0|216, 160, 255|d8a0ff/i.test(bg)) return 'heavy'; if (/224, 90, 74|e05a4a/i.test(bg)) return 'danger'; const w = el.offsetWidth, h = el.offsetHeight; if (w * h > 60000) return 'card'; return 'light'; }
  uiPress(t, x, y) {
    const el = this.pointerEl(t); if (!el) return; const k = this.btnKind(el);
    if (k === 'heavy') { this.jiggle(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.12,0.78) translateY(6px)', offset: 0.14 }, { transform: 'scale(0.92,1.12) translateY(-8px)', offset: 0.36 }, { transform: 'scale(1.04,0.97)', offset: 0.6 }, { transform: 'scale(1)' }], 420); try { el.animate([{ filter: 'brightness(2.6) saturate(1.5)' }, { filter: 'brightness(1)' }], { duration: 320, easing: 'ease-out' }); } catch (e) {} this.fx.flare(x, y, 160, '#ffe08a', 0.22); this.fx.shock(x, y, 220, '#ffe08a', 0.35); this.fx.spark(x, y, '#ffe08a', 18, { v: 800, w: 4, life: 0.35, g: 300 }); this.fx.kick(5); this.fx.freeze(35); this.wave(x, y, 1.6, 420); M.Sfx.stamp(); }
    else if (k === 'danger') { this.jiggle(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-10px) rotate(-2deg)', offset: 0.2 }, { transform: 'translateX(9px) rotate(2deg)', offset: 0.45 }, { transform: 'translateX(-4px)', offset: 0.7 }, { transform: 'translateX(0)' }], 360); this.fx.flare(x, y, 140, '#ff5a4a', 0.2); this.fx.spark(x, y, '#ff6a4a', 14, { v: 700, w: 4, life: 0.3 }); this.fx.kick(4); M.Sfx.hit(); }
    else if (k === 'card') { this.jiggle(el, [{ transform: 'perspective(700px) rotateX(0) scale(1)' }, { transform: 'perspective(700px) rotateX(10deg) scale(0.95)', offset: 0.25 }, { transform: 'perspective(700px) rotateX(-4deg) scale(1.03)', offset: 0.6 }, { transform: 'perspective(700px) rotateX(0) scale(1)' }], 380); this.fx.clickBurst(x, y, '#ffe08a'); this.wave(x, y, 1, 360); }
    else { this.jiggle(el, [{ transform: 'scale(1)' }, { transform: 'scale(0.9)', offset: 0.25 }, { transform: 'scale(1.06)', offset: 0.6 }, { transform: 'scale(1)' }], 240); this.fx.clickBurst(x, y, '#e8dcc4'); this.wave(x, y, 0.6, 240); M.Sfx.tick(5); }
  }
  tiltMove(x, y) {
    const el = this.hovEl; if (!el || !this.tiltA) return; const st = this.ui.stage(); if (!st) return; const a = st.getBoundingClientRect(), s = this.ui.scale(), b = el.getBoundingClientRect();
    const nx = ((x * s + a.left) - (b.left + b.width / 2)) / (b.width / 2), ny = ((y * s + a.top) - (b.top + b.height / 2)) / (b.height / 2), big = b.width * b.height / (s * s) > 60000;
    const rx = Math.max(-1, Math.min(1, ny)) * (big ? -7 : -14), ry = Math.max(-1, Math.min(1, nx)) * (big ? 9 : 16), sc = big ? 1.05 : 1.1;
    try { this.tiltA.effect.setKeyframes([{ transform: 'perspective(600px) rotateX(' + rx.toFixed(1) + 'deg) rotateY(' + ry.toFixed(1) + 'deg) scale(' + sc + ') translateZ(0)', filter: 'brightness(1.18) drop-shadow(0 12px 18px rgba(0,0,0,0.55)) drop-shadow(0 0 14px rgba(255,210,120,0.35))' }]); } catch (e) {}
  }
  uiHover(t, x, y) { const el = this.pointerEl(t); if (el === this.hovEl) return; if (this.tiltA) { const old = this.tiltA; try { old.cancel(); } catch (e) {} this.tiltA = null; } if (this.hovEl && this.hovEl.isConnected) this.jiggle(this.hovEl, [{ transform: 'perspective(600px) scale(1.06)' }, { transform: 'perspective(600px) scale(1)' }], 200); this.hovEl = el; if (!el) return; try { el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.16)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.25,1)', composite: 'add' }); this.tiltA = el.animate([{ transform: 'perspective(600px) scale(1.1)' }], { duration: 1, fill: 'forwards', composite: 'add' }); } catch (e) {} this.tiltMove(x, y); const b = el.getBoundingClientRect(), st = this.ui.stage().getBoundingClientRect(), s = this.ui.scale(); this.fx.spark((b.left + b.width / 2 - st.left) / s, (b.top - st.top) / s, '#ffe08a', 6, { dir: -Math.PI / 2, spread: 2, v: 320, w: 2, life: 0.3, g: 200 }); M.Sfx.hover(); }
  // ── rewards with flight animation ──
  award(list, from) {
    const run = this.run, out = [];
    from = from || { x: 960, y: 470 };
    list.forEach((g, i) => {
      const d = 0.1 + i * 0.14;
      if (g.k === 'wallet') { this.hold('wallet', run.wallet); run.wallet += g.v; this.fly('coin', from, 'wallet', '#ffcc33', () => this.release('wallet'), d); for (let j = 0; j < 4; j++) this.fly('coin', { x: from.x + (Math.random() - 0.5) * 120, y: from.y + (Math.random() - 0.5) * 60 }, 'wallet', '#ffcc33', null, d + 0.05 + j * 0.05); out.push('积分 +' + M.fmt(g.v)); }
      if (g.k === 'rsup') { const v = Math.round(g.v * run.lootMul * (1 + (run.mods.supplies || 0))); this.hold('rsup', run.loot.supplies); run.loot.supplies += v; this.fly('sack', from, 'rsup', '#caa84a', () => this.release('rsup'), d); out.push('物资 +' + v); }
      if (g.k === 'bp') { this.hold('rbp', run.loot.bp.length); run.loot.bp.push(g.key); const I = M.itemInfo(g.key); this.fly(I.icon === 'scroll' || I.icon === 'gem' ? I.icon : 'scroll', from, 'rbp', I.c, () => this.release('rbp'), d); out.push(I.n); }
      if (g.k === 'unit') { if (!M.canAdd(run, g.type)) { out.push('队伍已满'); return; } const before = new Set(run.roster.map(u => u.uid)); const mg = M.addUnit(run, g.type); const nu = run.roster.filter(u => !before.has(u.uid)); nu.forEach(u => this.hideU.add(u.uid)); this.fly(g.type, from, 'roster', '#6fa8dc', () => { nu.forEach(u => this.hideU.delete(u.uid)); this.pulse.roster = now(); if (mg) { const p = this.fxPos('roster') || { x: 300, y: 980 }; this.fx.pop(p.x, p.y - 80, '升星！' + '★'.repeat(mg.star), '#ffcc33', 54); this.fx.burst(p.x, p.y, '#ffcc33', 30); M.Sfx.up(2); } }, d); out.push(M.DB[g.type].n + ' 加入'); }
      if (g.k === 'item') { const s = run.items.indexOf(null); if (s < 0) { out.push('道具已满'); return; } run.items[s] = g.key; run.itemQ[s] = g.floor || 0; this.hideI.add(s); this.fly(M.ITEMS[g.key].icon, from, 'items', M.QUALITY[g.q || 0].c, () => { this.hideI.delete(s); this.pulse.items = now(); }, d); out.push(M.ITEMS[g.key].name); }
    });
    return out;
  }
  // ── reel ──
  startReel(o) { this.reel = Object.assign({ t: 0, lastIdx: -1, upsDone: 0, locked: false }, o); if (o.iconKey) this.reel.icon = M.spriteCanvas(o.iconKey, 8); M.Sfx.lever(); this.bump(); }
  reelTick(dt) {
    const r = this.reel, S = M.Sfx; r.t += dt;
    const p = M.reelP(r), idx = Math.round(p); if (idx !== r.lastIdx) { r.lastIdx = idx; S.tick(idx % 8); }
    const ups = r.ups ? [...Array(r.ups)].filter((_, i) => r.t >= 2.55 + i * 0.95).length : 0;
    if (ups > r.upsDone) { r.upsDone = ups; S.up(ups); S.shatter(); const tl = r.tiles[(r.land + ups) % r.tiles.length]; this.fx.explode(960, 520, tl.c, 1 + ups * 0.4); this.fx.spark(660, 520, tl.c, 14, { dir: Math.PI, spread: 1.2, v: 1100 }); this.fx.spark(1260, 520, tl.c, 14, { dir: 0, spread: 1.2, v: 1100 }); }
    const lk = M.reelLock(r); if (!r.locked && r.t > lk - 0.9 && Math.floor((r.t - (lk - 0.9)) / 0.3) !== r.hb) { r.hb = Math.floor((r.t - (lk - 0.9)) / 0.3); S.heart(); this.fx.kick(2); }
    if (!r.locked && r.t >= M.reelLock(r)) {
      r.locked = true; S.reelStop(); const tl = r.tiles[(r.land + r.ups) % r.tiles.length];
      const big = !r.itemMode || r.ups >= 2; if (big) S.fanfare(); else S.coin();
      const tier = r.itemMode ? r.ups : 1.5; this.fx.explode(960, 520, tl.c, 1.4 + tier * 0.55); this.fx.confetti(big ? 160 : 60, { x: 960, y: 520, cols: [tl.c, '#ffffff', '#ffe08a'] }); this.fx.rays(960, 520, tl.c, 1.4, { r: 900, n: 18 }); if (tier >= 2) this.fx.coins(960, 600, tier >= 3 ? 70 : 30, { v: 1300 }); this.fx.pop(960, 250, tl.n + '！', tl.c, 120, { slam: 1, life: 1.3, rise: 0 }); S.impact();
    }
    if (r.t >= M.reelDur(r)) { this.reel = null; r.onDone && r.onDone(); }
  }
  // ── chest ──
  openChest(items, col, onClose) { this.chest = { t: 0, items, col: col || '#ffcc33', onClose }; M.Sfx.creak(); this.bump(); }
  chestTick(dt) {
    const c = this.chest, p = c.t; c.t += dt;
    if (p < 0.5 && c.t >= 0.5) { M.Sfx.stamp(); this.fx.kick(14); this.fx.burst(960, 600, '#6a5a40', 20, { up: 200 }); }
    if (c.t > 0.8 && c.t < 1.5) { if (Math.floor(p * 12) !== Math.floor(c.t * 12)) { M.Sfx.tick(Math.floor(c.t * 12) % 8); this.fx.kick(1 + (c.t - 0.8) * 4); } if (Math.random() < 0.6) this.fx.spark(960 + (Math.random() - 0.5) * 240, 470, c.col, 2, { dir: -Math.PI / 2, spread: 2, v: 500, w: 3, life: 0.35 }); }
    if (p < 1.45 && c.t >= 1.45) this.fx.freeze(110);
    if (p < 1.5 && c.t >= 1.5) { M.Sfx.chest(); M.Sfx.shatter(); this.fx.explode(960, 480, c.col, 3); this.fx.flash('#ffffff', 0.9); this.fx.confetti(160, { x: 960, y: 480 }); this.fx.coins(960, 520, 50, { v: 1400, spread: 1.6 }); this.fx.spark(960, 480, c.col, 60, { v: 1500, w: 6, life: 0.7 }); }
    const q = c.t - 1.5; c.items.forEach((it, i) => { if (!it.snd && q > 0.25 + i * 0.28 + 0.5) { it.snd = 1; M.Sfx.land(i); M.Sfx.pop(); const gold = it.c === M.QUALITY[3].c || it.c === M.QUALITY[2].c; this.fx.explode(it.x || 960, it.y || 380, it.c, gold ? 1.6 : 0.8); if (gold) this.fx.rays(it.x || 960, it.y || 380, it.c, 1.2, { r: 320 }); } });
  }
  chestClick() {
    const c = this.chest; if (!c) return; if (c.t < 1.5 + 0.6 + c.items.length * 0.28) { if (c.t < 1.4) c.t = 1.4; return; }
    this.chest = null; const list = [], froms = [];
    c.items.forEach(it => { if (it.award) { list.push(it.award); froms.push({ x: it.x, y: it.y }); } });
    list.forEach((g, i) => { this.award([g], froms[i]); this.fx.explode(froms[i].x, froms[i].y, '#ffe08a', 0.6); }); M.Sfx.whoosh(0.5);
    c.onClose && c.onClose();
  }
  // ── banners ──
  banner(o) { this.banners.push(Object.assign({ t: 0, life: 1.8, col: '#ffd970' }, o)); }
  // ── main tick ──
  tick(dt) {
    const s = this.screen, t0 = now();
    if (!this.fx.frozen) this.fx.update(dt);
    if (this.toastData && t0 > this.toastData.until) this.toastData = null;
    if (this.coachData && t0 - this.coachData.at > 14000) this.coachData = null;
    if (s === 'intro') { if (this.intro.started) this.intro.t += dt; const c = this.ui.cv('intro'); if (c) M.drawIntro(c.getContext('2d'), this.intro.t); if (this.intro.t >= M.INTRO_LEN) this.toMenu(); return; }
    const frozen = this.fx.frozen;
    if (this.reel && !frozen) this.reelTick(dt);
    if (this.chest && !frozen) this.chestTick(dt);
    this.banners.forEach(b => { b.t += dt; if (b.hold && b.hold()) b.t = Math.min(b.t, b.life - 0.3); }); this.banners = this.banners.filter(b => b.t < b.life);
    let moving = false;
    Object.keys(this.twT).forEach(k => { const c = this.tw[k], g = this.twT[k]; if (c == null) { this.tw[k] = g; return; } if (Math.abs(g - c) > 0.5) { let n = c + (g - c) * Math.min(1, dt * 7) + Math.sign(g - c) * 0.4; if (Math.sign(g - n) !== Math.sign(g - c)) n = g; this.tw[k] = n; moving = true; } else this.tw[k] = g; });
    if (s === 'base' || s === 'raid') this.baseTick(dt);
    if (s === 'world') this.worldTick(dt);
    if (s === 'battle') this.battleTick(frozen ? 0 : dt);
    const fc = this.ui.cv('fx');
    if (fc) { const ctx = fc.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1920, 1080); this.banners.forEach(b => M.drawBanner(ctx, b)); if (this.reel) M.drawReel(ctx, this.reel); if (this.chest) M.drawChest(ctx, this.chest); this.fx.draw(ctx, true); }
    const pl = Object.values(this.pulse).some(p => t0 - p < 700);
    const busy = this.fx.busy || this.reel || this.chest || this.banners.length || moving || pl || (this.panel && t0 - this.panel.at < 450) || (this.coachData) || (this.toastData) || this.tipData || this.settle || this.trans;
    this.acc += dt;
    if (busy || this.acc > (s === 'battle' ? 0.08 : 0.2)) { this.acc = 0; this.bump(); }
  }
  // ── title ──
  introClick() { M.Sfx.init(); if (!this.intro.started) { this.intro.started = true; M.Sfx.drone(true); } else this.toMenu(); this.bump(); }
  toMenu() { this.run = null; this.battle = null; this.settle = null; this.reel = null; this.modal = null; this.panel = null; this.go('menu'); }
  startGame() { M.Sfx.init(); M.Sfx.click(); if (!this.meta.tutDone) this.startTutorial(); else this.toBase(); }
  toBase() { this.run = null; this.battle = null; this.walker = null; this.settle = null; this.modal = null; this.panel = null; this.bv.home(); this.save(); this.go('base'); this.baseTutStep(); }
  askReset() { this.modal = { title: '重置存档？', text: '所有领袖、宝物、建筑都会清空，新手教学不会再出现。', border: '#d0453c', img: 'skull', back: () => { this.modal = null; }, choices: [{ t: '确定重置', danger: 1, fn: () => { this.meta = M.resetMeta3(); this.meta.tutDone = true; this.modal = null; this.toast('存档已重置', '#d0453c'); } }, { t: '算了', fn: () => { this.modal = null; } }] }; this.bump(); }
}
M.Game = Game;
})();

;
