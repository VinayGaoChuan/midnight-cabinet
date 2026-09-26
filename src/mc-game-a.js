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
  // 被拒绝：按下的东西摇一下头、低低一声，缺的那样东西（按字猜：积分 / 物资 / 碎片 / 部队 / 道具）红着抖一下，再弹提示
  deny(text, c, cause) {
    if (cause == null) cause = /积分/.test(text) ? 'wallet' : /物资/.test(text) ? 'msup' : /碎片/.test(text) ? 'msh' : /部队|队伍/.test(text) ? 'roster' : /道具/.test(text) ? 'items' : null;
    this.juice('no', { cause }); this.toast(text, c || '#d0453c');
  }
  toast(text, c) { this.toastData = { text, c: c || '#f2c14e', until: now() + 2000, at: now() }; this.bump(); }
  coach(text, x, y, tx, ty) { this.coachData = { text, x, y, tx, ty, at: now() }; M.Sfx.sparkle(); this.bump(); }
  coachOnce(k, text, x, y, tx, ty) { if (this.coachFlags[k]) return; this.coachFlags[k] = 1; this.coach(text, x, y, tx, ty); }
  // ── positions of DOM targets (stage coords) ──
  fxPos(sel) {
    const st = this.ui.stage(); if (!st) return null; const el = st.querySelector('[data-fx="' + sel + '"]'); if (!el) return null;
    const a = st.getBoundingClientRect(), b = el.getBoundingClientRect(), s = this.ui.scale();
    return { x: (b.left + b.width / 2 - a.left) / s, y: (b.top + b.height / 2 - a.top) / s };
  }
  // where the core room will be once the camera has settled (things fly there while it is still moving)
  corePos() { const p = M.cellCenter(M.CORE.c, M.CORE.r), b = this.bv, x = b.tx != null ? b.tx : b.x, y = b.ty != null ? b.ty : b.y, z = b.tz != null ? b.tz : b.z; return { x: Math.max(80, Math.min(1840, (p.x - x) * z + 960)), y: Math.max(80, Math.min(1000, (p.y - y) * z + 540)) }; }
  cellPos(c, r) { const p = M.cellCenter(c, r); return this.bv.toScreen(p.x, p.y); }
  hold(k, v) { if (this.held[k] == null) this.held[k] = v; }
  // 计数器松开时：数字涨了才响到手的声音（按资源种类），花钱时不响（花钱的动作自己有声音）
  release(k) { const was = this.held[k]; delete this.held[k]; this.pulse[k] = now(); const m = this.meta || {}, r = this.run || {}, L = r.loot || {}, cur = { wallet: r.wallet, msup: m.supplies, rsup: L.supplies, rbp: L.bp && L.bp.length, rshard: L.shards, rexp: L.exp, msh: m.shards, morb: m.orbs }[k]; if (was == null || cur == null || cur > was) M.Sfx.loot({ msup: 'supplies', rsup: 'supplies', msh: 'shards', rshard: 'shards', rexp: 'exp', morb: 'exp', rbp: 'blueprint' }[k] || 'score', cur != null && was != null ? cur - was : null); }   // 涨得越多，金币声的音阶串越长
  fly(icon, from, sel, col, onLand, delay) {
    const to = (typeof sel === 'string' ? this.fxPos(sel) : sel) || { x: 960, y: 60 };
    const img = typeof icon === 'string' ? M.spriteCanvas(icon, 6) : icon;
    this.fx.fly(img, from, to, { col: col || '#ffe08a', onLand: () => { if (typeof sel === 'string') this.punchSel(sel, 1); this.wave(to.x, to.y, 0.8, 260); onLand && onLand(); }, delay: delay || 0, s0: 1.4, s1: 0.7 });
  }
  // ── 手感分档（docs/design.md §11.6）：爽点突出，普通点击就是普通点击，负面的一下就过去 ──
  // tap 普通 · back 关闭 / 返回 / 取消 · no 被拒绝 · good 小爽点 · big 大爽点
  // 按下只给 tap / back / no（结果还不知道）；good / big 由动作成功的那一刻调用 this.juice(...)
  jiggle(el, kf, dur, ease) { try { el.animate(kf, { duration: dur || 320, easing: ease || 'cubic-bezier(.2,.9,.25,1)', composite: 'add' }); } catch (e) {} }
  punch(el, p) { if (!el) return; p = p || 1; this.jiggle(el, [{ transform: 'scale(1)' }, { transform: 'scale(' + (1 - 0.1 * p) + ',' + (1 - 0.14 * p) + ')', offset: 0.18 }, { transform: 'scale(' + (1 + 0.1 * p) + ',' + (1 + 0.06 * p) + ')', offset: 0.5 }, { transform: 'scale(' + (1 - 0.03 * p) + ')', offset: 0.75 }, { transform: 'scale(1)' }], 300); }
  punchSel(sel, p) { const st = this.ui.stage(); if (!st) return; this.punch(st.querySelector('[data-fx="' + sel + '"]'), p); }
  // 大爽点才推开周围的按钮（要量一遍所有按钮的位置，不能每次点击都做）
  wave(x, y, p, R) {
    const st = this.ui.stage(); if (!st || now() - (this.waveT || 0) < 220) return; this.waveT = now(); const a = st.getBoundingClientRect(), s = this.ui.scale(); R = R || 340;
    const els = st.querySelectorAll('[data-fx],[style*="cursor: pointer"],[data-pj~=key]'); let n = 0;
    for (const el of els) { if (n > 16) break; const b = el.getBoundingClientRect(); if (!b.width) continue; const cx = (b.left + b.width / 2 - a.left) / s, cy = (b.top + b.height / 2 - a.top) / s, d = Math.hypot(cx - x, cy - y); if (d < 30 || d > R) continue; n++;
      const k = (1 - d / R) * 14 * p, dx = (cx - x) / d * k, dy = (cy - y) / d * k, dl = d / R * 70;
      this.jiggle(el, [{ transform: 'translate(0,0)' }, { transform: 'translate(0,0)', offset: dl / (dl + 300) }, { transform: 'translate(' + dx + 'px,' + dy + 'px)', offset: (dl + 70) / (dl + 300) }, { transform: 'translate(' + (-dx * 0.3) + 'px,' + (-dy * 0.3) + 'px)', offset: (dl + 170) / (dl + 300) }, { transform: 'translate(0,0)' }], dl + 300); }
  }
  pointerEl(t) { let el = t, best = null; for (let i = 0; el && i < 7; i++, el = el.parentElement) { if (!el.style || el.tagName === 'CANVAS' || el.offsetWidth * el.offsetHeight > 300000) continue; const fx = el.getAttribute && el.getAttribute('data-fx'); if (fx && /^card\d|^hero-|^tal-/.test(fx)) return el; if (!best && (el.style.cursor === 'pointer' || (el.hasAttribute && el.hasAttribute('data-j')) || /\b(key|opt|ring|close|lnk)\b/.test((el.getAttribute && el.getAttribute('data-pj')) || '') || (fx && fx !== 'heroes' && fx !== 'roster' && fx !== 'items' && fx !== 'legion') || (el.style.width && parseInt(el.style.width) <= 120 && el.style.border && /radial-gradient/.test(el.style.background || '')))) best = el; } return best; }
  // 按下时这个东西是哪一档：模板里写 data-j="back" / "tap"；失效键是 no；关闭、返回、取消类的字是 back
  pressTier(el) {
    for (let e = el, i = 0; e && i < 3; i++, e = e.parentElement) { const j = e.getAttribute && e.getAttribute('data-j'); if (j) return j === 'back' || j === 'no' ? j : 'tap'; }
    const pj = el.getAttribute('data-pj') || ''; if (/\bdis\b/.test(pj)) return 'no'; if (/\bclose\b/.test(pj)) return 'back';
    const tx = (el.textContent || '').trim(); if (tx.length <= 8 && /^[✕×✖←◀]|关闭|返回|算了|取消|离开|不了|先不|放弃|跳过|收起/.test(tx)) return 'back';
    return 'tap';
  }
  uiPress(t, x, y) {
    const el = this.pointerEl(t); if (!el) return;
    this.lastPress = { el, x, y, t: now() };
    this.juice(this.pressTier(el), { el, x, y });
  }
  // 一次反馈是一条分层的链，不是各演各的（§11.6）：
  //   ① 主体 0ms：按下的东西挤压 / 回弹（按下时的 tap 就是蓄力，松手的 good / big 是释放）
  //   ② 近场 0–40ms：触点闪一下、圈、火花
  //   ③ 场景 60–120ms：冲击波、周围的按钮被推开（离得远的晚一点）、镜头轻震
  //   ④ 落点：奖励飞向它的计数器，落下时计数器鼓一下、数字滚上去（fly / award）；被拒时，缺的那个东西（o.cause）红着抖一下
  // o: { el, x, y, col, p 强度 0~1, sfx:false 不出声（动作自己有声音）, to: 落点 data-fx, icon: 飞过去的精灵, cause: 被拒的原因 data-fx }
  juice(tier, o) {
    o = o || {}; const P = this.lastPress, fresh = P && now() - P.t < 800;
    const el = o.el !== undefined ? o.el : fresh ? P.el : null, x = o.x != null ? o.x : fresh ? P.x : null, y = o.y != null ? o.y : fresh ? P.y : null;
    const p = o.p == null ? 1 : o.p, col = o.col || (tier === 'big' ? '#ffcf4a' : '#fff3b0'), S = M.Sfx;
    // 失效键按下时已经摇过头，动作又拒绝一次：不再摇、不再响，只补上「缺什么」
    const dupNo = tier === 'no' && this.lastNo && now() - this.lastNo < 150; if (tier === 'no') this.lastNo = now();
    if (o.sfx !== false && S && !dupNo) { const cue = S.cue && S.cue('ui_' + tier, { power: p }); if (!cue) { if (tier === 'tap') S.tick(4); else if (tier === 'back') S.tick(-6); else if (tier === 'no') S.tick(-18); else if (tier === 'good') S.pop(); else if (tier === 'big') S.stamp(); } }
    const J = M.PJ; if (J && (!J.on || J.reduced)) return;
    const live = el && el.isConnected && el.offsetWidth < 900, key = live && /\bkey\b/.test(el.getAttribute('data-pj') || '');
    const has = x != null && y != null, later = (ms, f) => setTimeout(f, ms);
    // 普通：只有主体，干脆利落
    if (tier === 'tap') { if (live && !key) this.jiggle(el, [{ transform: 'scale(0.95)' }, { transform: 'scale(1)' }], 120, 'cubic-bezier(.2,.8,.3,1)'); return; }
    // 负面：一下就过去，不放粒子、不震屏
    if (tier === 'back') { if (live && !key) this.jiggle(el, [{ transform: 'scale(0.97)' }, { transform: 'scale(1)' }], 80, 'ease-out'); return; }
    if (tier === 'no') {
      if (live && !dupNo) this.jiggle(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)', offset: 0.2 }, { transform: 'translateX(7px)', offset: 0.45 }, { transform: 'translateX(-3px)', offset: 0.7 }, { transform: 'translateX(0)' }], 180, 'linear');
      const st = o.cause && this.ui.stage(), ce = st && st.querySelector('[data-fx="' + o.cause + '"]');
      if (ce) later(60, () => { this.jiggle(ce, [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)', offset: 0.25 }, { transform: 'translateX(5px)', offset: 0.55 }, { transform: 'translateX(0)' }], 200, 'linear'); try { ce.animate([{ filter: 'sepia(1) saturate(6) hue-rotate(-40deg) brightness(1.2)' }, { filter: 'none' }], { duration: 260, easing: 'ease-out' }); } catch (e) {} });
      return;
    }
    // 同一个东西刚爽过就不再叠一次（按下给了 big，结果又给一次）
    if (live && this.lastJuice && this.lastJuice.el === el && now() - this.lastJuice.t < 200 && this.lastJuice.big >= (tier === 'big')) return;
    this.lastJuice = { el, t: now(), big: tier === 'big' };
    const land = () => { if (!o.to) return; const from = has ? { x, y } : null, to = this.fxPos(o.to); if (!from || !to) { this.punchSel(o.to, 0.8 + 0.4 * p); return; } this.fly(o.icon || 'coin', from, o.to, col, null, 0.05); };
    if (tier === 'good') {
      if (live) this.jiggle(el, [{ transform: 'scale(1)' }, { transform: 'scale(' + (1 + 0.08 * p) + ',' + (1 - 0.1 * p) + ')', offset: 0.2 }, { transform: 'scale(' + (1 - 0.03 * p) + ',' + (1 + 0.04 * p) + ')', offset: 0.55 }, { transform: 'scale(1)' }], 260);
      if (has) { this.fx.flare(x, y, 70, '#ffffff', 0.12); this.fx.ring(x, y, 6, 60 + 40 * p, col, 5, 0.28); this.fx.spark(x, y, col, Math.round(6 + 6 * p), { v: 480, w: 3, life: 0.3, g: 300, delay: 0.03 }); }
      land(); return;
    }
    if (tier === 'big') {
      if (live) { this.jiggle(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.14,0.8) translateY(6px)', offset: 0.14 }, { transform: 'scale(0.92,1.12) translateY(-8px)', offset: 0.36 }, { transform: 'scale(1.04,0.97)', offset: 0.6 }, { transform: 'scale(1)' }], 400); try { el.animate([{ filter: 'brightness(2.2)' }, { filter: 'brightness(1)' }], { duration: 260, easing: 'ease-out' }); } catch (e) {} }
      if (has) {
        this.fx.flare(x, y, 150 + 60 * p, '#ffffff', 0.18); this.fx.ring(x, y, 8, 110 + 50 * p, col, 6, 0.3);
        this.fx.spark(x, y, col, Math.round(14 + 12 * p), { v: 820, w: 4, life: 0.42, g: 300, delay: 0.03 });
        this.fx.shock(x, y, 240 + 140 * p, col, 0.42, 0.06); this.fx.burst(x, y, col, Math.round(6 + 8 * p), { v: 420, s: 10, life: 0.6, delay: 0.07 });
        later(60, () => { this.fx.kick(2 + 3 * p); this.wave(x, y, 0.8 + 0.6 * p, 380); });
      }
      later(120, land);
    }
  }
  // 同一个元素换了内容（面板换成另一个）：等这一帧画完再把入场动画从头播一遍
  replayEnter() { setTimeout(() => { const st = this.ui.stage(); if (!st) return; st.querySelectorAll('[data-enter],[data-enter-rows]>*').forEach(el => { try { el.getAnimations().forEach(a => { if (/^pj(In|Row)/.test(a.animationName || '')) { a.cancel(); a.play(); } }); } catch (e) {} }); }, 0); }
  tiltMove(x, y) {
    if (this.tipData) this.tipMoved = true;
    const el = this.hovEl; if (!el || !this.tiltA) return; const st = this.ui.stage(); if (!st) return; const a = st.getBoundingClientRect(), s = this.ui.scale(), b = el.getBoundingClientRect();
    const nx = ((x * s + a.left) - (b.left + b.width / 2)) / (b.width / 2), ny = ((y * s + a.top) - (b.top + b.height / 2)) / (b.height / 2);
    const rx = Math.max(-1, Math.min(1, ny)) * -6, ry = Math.max(-1, Math.min(1, nx)) * 8;
    try { this.tiltA.effect.setKeyframes([{ transform: 'perspective(700px) rotateX(' + rx.toFixed(1) + 'deg) rotateY(' + ry.toFixed(1) + 'deg) scale(1.04)' }]); } catch (e) {}
  }
  // 悬停：按键 / 选项行交给 CSS（上浮 3px），卡片跟着鼠标轻轻倾斜，其余只轻轻放大一下；不放粒子、不加滤镜
  // 大块（整页的「点任意处继续」、整块面板，超过 300000 平方像素）不算悬停 / 按下的对象，不会跟着鼠标歪，按钮也就不会跑（用户裁定 2026-09-25）
  uiHover(t, x, y) {
    const el = this.pointerEl(t); if (el === this.hovEl) return;
    if (this.tiltA) { try { this.tiltA.cancel(); } catch (e) {} this.tiltA = null; if (this.hovEl && this.hovEl.isConnected) this.jiggle(this.hovEl, [{ transform: 'perspective(700px) scale(1.04)' }, { transform: 'perspective(700px) scale(1)' }], 140, 'ease-out'); }
    this.hovEl = el; if (!el) return;
    const pj = el.getAttribute('data-pj') || '', css = /\b(key|opt|ring|close|lnk)\b/.test(pj);
    if (!css) { const fx = el.getAttribute('data-fx') || '', card = /^card\d|^hero-|^tal-/.test(fx) || el.offsetWidth * el.offsetHeight > 60000;
      try { if (card) { this.tiltA = el.animate([{ transform: 'perspective(700px) scale(1.04)' }], { duration: 1, fill: 'forwards', composite: 'add' }); this.tiltMove(x, y); } else el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out', composite: 'add' }); } catch (e) {} }
    M.Sfx.hover();
  }
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
    // 蓄力：每次往上冲前两下心跳（越往上越急）
    M.reelEv(r).forEach((E, i) => [M.REEL_CHG, M.REEL_CHG / 2].forEach((d, k) => { const at = E - d; if (r.t >= at && r.t - dt < at) { S.mini && S.mini('_', 'heart', Math.min(1, 0.45 + i * 0.2 + k * 0.1)); this.fx.kick(1.5 + i); } }));
    // 每升一格都比上一格更响：炸得更大、闪得更亮、字更大，第二格起加光芒
    if (ups > r.upsDone) { r.upsDone = ups; S.reelUp(ups); S.shatter(); const tl = r.tiles[(r.land + ups) % r.tiles.length]; this.fx.explode(960, 520, tl.c, 1 + ups * 0.5); this.fx.flash(tl.c, 0.1 + ups * 0.08); this.fx.pop(960, 250, tl.n + '！'.repeat(ups), tl.c, 70 + ups * 18, { slam: 1, life: 0.8, rise: 0 }); if (ups >= 2) this.fx.rays(960, 520, tl.c, 0.9, { r: 500 + ups * 150, n: 12 + ups * 2 }); this.fx.spark(660, 520, tl.c, 14, { dir: Math.PI, spread: 1.2, v: 1100 }); this.fx.spark(1260, 520, tl.c, 14, { dir: 0, spread: 1.2, v: 1100 }); }
    // 停轮：猛地一顿（升档 / 「再上一格？」之前先停在起点那一格）
    if (r.t >= M.REEL_STOP && r.t - dt < M.REEL_STOP && M.reelLock(r) > M.REEL_STOP) { S.reelStop(); this.fx.kick(5); }
    const lk = M.reelLock(r); if (!r.locked && r.t > lk - 0.9 && Math.floor((r.t - (lk - 0.9)) / 0.3) !== r.hb) { r.hb = Math.floor((r.t - (lk - 0.9)) / 0.3); S.heart(); this.fx.kick(2); }
    if (!r.locked && r.t >= M.reelLock(r)) {
      r.locked = true; S.reelStop(); const tl = r.tiles[(r.land + r.ups) % r.tiles.length];
      const big = !r.itemMode || r.ups >= 3; if (big) S.fanfare(); else S.itemReveal(1);
      // 锁定按结果分档：普通一圈光、稀有小炸、史诗大炸 + 光芒 + 金币、传说（黑场之后）全屏金币雨和彩纸；「再上一格」没冲上去先一声「差一点」
      const tier = r.itemMode ? r.ups : 1.5; if (r.tease) S.mini && S.mini('_', 'near'); if (r.itemMode && r.ups >= 4) S.mini && S.mini('_', 'win4');
      if (tier < 1) { this.fx.ring(960, 520, 20, 320, tl.c, 6, 0.4); this.fx.spark(960, 520, tl.c, 16, { v: 700 }); this.fx.kick(4); }
      else { this.fx.explode(960, 520, tl.c, 1 + tier * 0.6); if (tier >= 1.5) this.fx.rays(960, 520, tl.c, 1.4, { r: 900, n: 18 }); if (tier >= 2) { this.fx.confetti(tier >= 3 ? 220 : 100, { x: 960, y: 520, cols: [tl.c, '#ffffff', '#ffe08a'] }); this.fx.coins(960, 600, tier >= 3 ? 90 : 30, { v: 1300, spread: tier >= 3 ? 1.9 : 1.3 }); } if (tier >= 3) { this.fx.flash('#ffffff', 0.7); this.fx.confetti(120); this.fx.kick(26); } }
      this.fx.pop(960, 250, tl.n + '！', tl.c, tier >= 3 ? 150 : tier >= 1 ? 120 : 90, { slam: 1, life: tier >= 2 ? 1.3 : 0.8, rise: 0 }); S.impact();
    }
    if (r.t >= M.reelDur(r)) { this.reel = null; r.onDone && r.onDone(); }
  }
  // ── chest ──
  openChest(items, col, onClose) { this.chest = { t: 0, items, col: col || '#ffcc33', onClose }; M.Sfx.creak(); this.bump(); }
  chestTick(dt) {
    const c = this.chest, p = c.t; c.t += dt;
    if (p < 0.5 && c.t >= 0.5) { M.Sfx.chestLand(); this.fx.kick(14); this.fx.burst(960, 600, '#6a5a40', 20, { up: 200 }); }
    if (c.t > 0.8 && c.t < 1.5) { if (Math.floor(p * 12) !== Math.floor(c.t * 12)) { M.Sfx.knock((c.t - 0.8) / 0.7); this.fx.kick(1 + (c.t - 0.8) * 4); } if (Math.random() < 0.6) this.fx.spark(960 + (Math.random() - 0.5) * 240, 470, c.col, 2, { dir: -Math.PI / 2, spread: 2, v: 500, w: 3, life: 0.35 }); }
    if (p < 1.45 && c.t >= 1.45) this.fx.freeze(110);
    if (p < 1.5 && c.t >= 1.5) { M.Sfx.chest(); this.fx.explode(960, 480, c.col, 3); this.fx.flash('#ffffff', 0.9); this.fx.confetti(160, { x: 960, y: 480 }); this.fx.coins(960, 520, 50, { v: 1400, spread: 1.6 }); this.fx.spark(960, 480, c.col, 60, { v: 1500, w: 6, life: 0.7 }); }
    const q = c.t - 1.5; c.items.forEach((it, i) => { if (!it.snd && q > 0.25 + i * 0.28 + 0.5) { it.snd = 1; M.Sfx.itemReveal(Math.max(0, M.QUALITY.findIndex(Q => Q.c === it.c))); const gold = it.c === M.QUALITY[5].c || it.c === M.QUALITY[4].c || it.c === M.QUALITY[3].c; this.fx.explode(it.x || 960, it.y || 380, it.c, gold ? 1.6 : 0.8); if (gold) this.fx.rays(it.x || 960, it.y || 380, it.c, 1.2, { r: 320 }); } });
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
    if (this.toastData && t0 > this.toastData.until) { this.toastData = null; this.bump(); }
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
    // 界面（DOM）只在它显示的东西在动时每帧重画：特效粒子、闪光、横幅、转盘、宝箱都画在特效画布上，不用重画整页
    // 震屏直接写到舞台上；悬浮说明跟着鼠标走时才重画（tipMoved）；提示条只在弹出的一瞬间
    const shaking = this.fx.trauma > 0.01 || this.shook; this.shook = this.fx.trauma > 0.01;
    if (shaking) { const st = this.ui.stage(); if (st) st.style.transform = 'translate(' + (Math.round(this.fx.sx * 10) / 10) + 'px,' + (Math.round(this.fx.sy * 10) / 10) + 'px) rotate(' + (Math.round(this.fx.sr * 1000) / 1000) + 'deg) scale(' + this.ui.scale() + ')'; }
    const busy = moving || pl || this.coachData || (this.toastData && t0 - this.toastData.at < 250) || this.tipMoved || this.settle || this.trans;
    this.tipMoved = false;
    this.acc += dt;
    if (busy || this.acc > (s === 'battle' ? 0.08 : 0.2)) { this.acc = 0; this.bump(); }
  }
  // ── title ──
  introClick() { M.Sfx.init(); if (!this.intro.started) { this.intro.started = true; M.Sfx.drone(true); } else this.toMenu(); this.bump(); }
  toMenu() { M.Sfx.cabinetOn(); this.run = null; this.battle = null; this.settle = null; this.reel = null; this.modal = null; this.panel = null; this.go('menu'); }
  startGame() { M.Sfx.init(); M.Sfx.click(); if (!this.meta.tutDone) this.startTutorial(); else this.toBase(); }
  toBase() { this.run = null; this.battle = null; this.walker = null; this.settle = null; this.modal = null; this.panel = null; this.bv.home(); this.save(); this.go('base'); this.baseTutStep(); }
  askReset() { this.modal = { title: '重置存档？', text: '所有领袖、宝物、建筑都会清空，新手教学不会再出现。', border: '#d0453c', img: 'skull', back: () => { this.modal = null; }, choices: [{ t: '确定重置', danger: 1, fn: () => { this.meta = M.resetMeta3(); this.meta.tutDone = true; this.modal = null; this.toast('存档已重置', '#d0453c'); } }, { t: '算了', fn: () => { this.modal = null; } }] }; this.bump(); }
}
M.Game = Game;
})();

;
