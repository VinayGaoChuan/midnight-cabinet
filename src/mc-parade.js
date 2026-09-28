// ==== mc-parade.js ====
(function () {
// The homecoming (user rulings 2026-09-26: 「每局结束时会带回部队，这个带回部队要有伟大仪式感」, then 「每次凯旋只能带回一只部队……
// 带回来的那只部队应该是战斗力最高的3个里面玩家自己选1个」). After the haul, before the garrison evolves: 凯旋！ comes down, and
// the three strongest units of the army step onto the stage as cards, one by one, the best last — the higher its quality
// the longer the beat, the bigger the light and the sound. Each card: the unit, its name in its quality's colour, quality
// and vocation, its power. Then the player picks one (click, or ← → and Enter): the other two fade away, the chosen one
// flies into the garrison on the bar. A click before all three are up brings them in at once.
const M = window.MC, G = M.Game.prototype, DB = M.DB, S = M.Sfx, U = M.UI, P = M.PJ.PAL, Q = M.QUALITY, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (t) => 1 - Math.pow(1 - cl(t, 0, 1), 3), RM = () => !!(M.PJ && M.PJ.reduced);
const eb = (t) => { t = cl(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const imgOf = (k, s) => { try { return M.spriteCanvas(k, s); } catch (e) { return null; } };
const outC = new Map();
function outlined(img, col, w) {
  if (!img) return null; const k = col + w; let m = outC.get(img); if (!m) outC.set(img, m = {}); if (m[k]) return m[k];
  const s = document.createElement('canvas'); s.width = img.width; s.height = img.height; const sx = s.getContext('2d'); sx.drawImage(img, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = col; sx.fillRect(0, 0, s.width, s.height);
  const c = document.createElement('canvas'); c.width = img.width + w * 2; c.height = img.height + w * 2; const x = c.getContext('2d');
  for (const [dx, dy] of [[-w, 0], [w, 0], [0, -w], [0, w], [-w, -w], [w, -w], [-w, w], [w, w]]) x.drawImage(s, w + dx, w + dy); x.drawImage(img, w, w); return (m[k] = c);
}
M.PARADE_N = 3;   // how many of the strongest the player chooses from
// the beat: the title, then one card every STEP seconds (a 史诗 or better holds the stage longer)
const T_TITLE = 0.9, STEP = 0.5, BIG = 0.85, FLY = 0.6, FADE = 0.35, CW = 320, CH = 500, GAP = 50, CY = 580;
const pw = (u) => M.unitPower(u.type, u);
G.paradeStart = function (gi) {
  const list = (gi.units || []).filter(u => u && DB[u.type]); if (!list.length) return false;
  const top = list.slice().sort((a, b) => pw(b) - pw(a)).slice(0, M.PARADE_N), units = top.slice().sort((a, b) => DB[a.type].q - DB[b.type].q || pw(a) - pw(b));
  const n = units.length; let at = T_TITLE;
  const cards = units.map((u, i) => { const q = DB[u.type].q, c = { u, q, x: 960 + (i - (n - 1) / 2) * (CW + GAP), y: CY, at, img: imgOf(u.type, 6), s: 0 }; at += q >= 3 ? BIG : STEP; return c; });
  this.parade = { t: 0, cards, n, allAt: at + 0.3, hov: n - 1, chosen: null, flyT: null, picks: Math.min(n, M.paradePicks ? M.paradePicks(this.meta) : 1) };   // 空中花园: two (mc-wonders.js)
  S.whoosh && S.whoosh(0.6); this.bump(); return true;
};
// what the garrison already holds of this unit's vocation; a frontline card says so when the garrison has none
const FRONT = { 先锋: 1, 守护者: 1 };
function garHint(g, d) {
  const m = g && g.meta, gar = m && M.garrisonOf ? M.garrisonOf(m) : null; if (!gar || !d.voc) return null;
  const n = gar.filter(x => DB[x.type] && DB[x.type].voc === d.voc).length, front = gar.some(x => DB[x.type] && FRONT[DB[x.type].voc]);
  if (FRONT[d.voc] && !front) return { t: '驻军缺前排', c: P.lime };
  return n ? { t: '驻军里已有 ' + n + ' 支' + d.voc, c: P.lavender } : { t: '驻军里还没有' + d.voc, c: P.lime };
}
function wrap(ctx, s, max, size) { ctx.save(); ctx.font = U.font(size); const out = []; let line = ''; for (const ch of String(s)) { if (ctx.measureText(line + ch).width > max && line) { out.push(line); line = ch; } else line += ch; } if (line) out.push(line); ctx.restore(); return out; }
function card(ctx, c, i, T, F, g) {
  const d = DB[c.u.type], qc = Q[c.q].c, u = c.u, age = T - c.at, still = RM(), open = F.chosen == null && T >= F.allAt, hov = open && F.hov === i;
  let x = c.x, y = c.y, k = (still ? 1 : eb(age / 0.4)) * (hov ? 1.07 : 1), a = 1;
  if (F.chosen != null && F.chosen !== i) { const f = cl((T - F.pickT) / FADE, 0, 1); if (f >= 1) return; a = 1 - f; y += 80 * f * f; }
  if (F.chosen === i && F.flyT != null) { const f = cl((T - F.flyT) / FLY, 0, 1), e = eo(f), to = F.dest; if (f >= 1) return; x += (to.x - x) * e; y += (to.y - y) * e - Math.sin(e * Math.PI) * 140; k *= 1 - 0.85 * e; }
  if (hov && !still) y -= 14 + 4 * Math.sin(T * 5);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(k, k);
  // a 史诗 or better (and the one under the pointer): turning rays behind it
  if ((c.q >= 3 || hov) && F.flyT == null) { ctx.save(); ctx.rotate(still ? 0 : T * 0.6); ctx.globalAlpha = a * (hov ? 0.4 : 0.26) * cl(age / 0.3, 0, 1); for (let j = 0; j < 12; j++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = j % 2 ? qc : P.butter; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-44, -380); ctx.lineTo(44, -380); ctx.fill(); } ctx.restore(); }
  M.glow(ctx, 0, 0, 230 + c.q * 30 + (hov ? 60 : 0), qc, 0.3 + c.q * 0.05 + (hov ? 0.15 : 0));
  U.R(ctx, -CW / 2 + 8, -CH / 2 + 8, CW, CH, P.ink); U.box(ctx, -CW / 2, -CH / 2, CW, CH, P.night);
  ctx.globalAlpha = a * 0.3; U.R(ctx, -CW / 2, -CH / 2, CW, CH * 0.55, qc); ctx.globalAlpha = a;
  const bw = hov || F.chosen === i ? 8 : 5;
  [[-CW / 2 + 5, -CH / 2 + 5, CW - 10, bw], [-CW / 2 + 5, CH / 2 - 5 - bw, CW - 10, bw], [-CW / 2 + 5, -CH / 2 + 5, bw, CH - 10], [CW / 2 - 5 - bw, -CH / 2 + 5, bw, CH - 10]].forEach(r => U.R(ctx, r[0], r[1], r[2], r[3], hov ? P.butter : qc));
  const im = c.img; if (im) { const f = Math.min(230 / im.width, 200 / im.height, 3.4), w = Math.max(2, Math.round(3 / f)), o = c.q > 0 ? outlined(im, qc, w) : im; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(0, -120); ctx.scale(f, f); ctx.drawImage(o, -o.width / 2, -o.height / 2); ctx.restore(); }
  U.text(ctx, d.n, 0, 36, 36, qc, { outline: true });
  // vocation icon + vocation in its colour, then ★ power in the tooltip's gold — no quality word, the colours say it
  // (2026-09-27: 「不要加普通……这些名词，因为通过颜色就能看出来了。而且职业前面要加icon……战斗力的颜色，要跟局内鼠标悬浮到部队上面后，
  // 信息显示中的战斗力一个颜色」)
  { const vt = d.voc && M.TAG && M.TAG.voc(d.voc), vc = (vt && vt.c) || (M.VOCS && M.VOCS[d.voc]) || P.cream, ps = String(pw(u)), FS = 26, IZ = 30, GP = 8, SEP = 26;
    const w1 = vt ? IZ + GP + U.measure(ctx, d.voc, FS) : 0, w2 = IZ + GP + U.measure(ctx, ps, FS); let x0 = -(w1 + (w1 ? SEP : 0) + w2) / 2;
    const ico = (key, x) => { const cv = M.iconCanvas && M.iconCanvas(key, 2); if (cv) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, Math.round(x), 80 - IZ / 2, IZ, IZ); ctx.restore(); } };
    if (vt) { ico(vt.icon, x0); U.text(ctx, d.voc, x0 + IZ + GP, 80, FS, vc, { align: 'left' }); x0 += w1 + SEP; }
    ico('u_star', x0); U.text(ctx, ps, x0 + IZ + GP, 80, FS, '#ffe08a', { align: 'left' }); }
  // what it does, and what the garrison already has of its kind (2026-09-27 feedback: 「别让选择只剩比战力……旁边展示基地已有
  // 阵容、缺什么职业，以及候选单位的技能」)
  wrap(ctx, M.unitLine ? M.unitLine(u.type) : '', CW - 44, 22).slice(0, 2).forEach((ln, j) => U.text(ctx, ln, 0, 124 + j * 30, 22, P.cream));
  const hint = garHint(g, d); if (hint) { U.R(ctx, -CW / 2 + 14, CH / 2 - 62, CW - 28, 44, P.ink); U.text(ctx, hint.t, 0, CH / 2 - 40, 22, hint.c); }
  // the card's landing: a white flash over it
  if (age < 0.18 && !still) { ctx.globalAlpha = a * 0.8 * (1 - age / 0.18); U.R(ctx, -CW / 2, -CH / 2, CW, CH, P.white); }
  ctx.restore();
}
function draw(ctx, g, F) {
  const T = F.t; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fade = F.flyT != null ? 1 - cl((T - F.flyT - FLY + 0.3) / 0.3, 0, 1) : cl(T / 0.3, 0, 1);
  U.dim(ctx, 0.85 * fade);
  // 凯旋！ drops in; once all are up, what to do
  const ti = eb((T - 0.1) / 0.5), ta = cl((T - 0.1) / 0.2, 0, 1) * fade; ctx.globalAlpha = ta;
  U.text(ctx, '凯旋！', 960, 120 + (1 - ti) * -80, 96, P.gold, { outline: true, ramp: true });
  U.text(ctx, F.cards.length > 1 ? (F.picks > 1 ? '选两支带回基地' : '选一支带回基地') : '带回基地', 960, 214, 40, P.cream, { outline: true }); ctx.globalAlpha = 1;
  F.cards.forEach((c, i) => { if (T >= c.at) card(ctx, c, i, T, F, g); });
  if (F.chosen == null && T >= F.allAt) { ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(T * 3)); U.text(ctx, '点一张', 960, 1000, 30, P.cream, { outline: true }); ctx.globalAlpha = 1; }
  ctx.restore();
}
// the chosen one joins the garrison (the weakest leaves when it is full)
function join(g, u) {
  const m = g.meta; if (!m || !M.garrisonOf) return; const gar = M.garrisonOf(m);
  gar.push(Object.assign({}, u, { uid: M.rid(), mana: 0 }));
  // past the cap (by prosperity, difficulty and rooms, mc-bastion.js) nobody is sent away by itself any more (2026-09-27: 「如果超过上限，
  // 不能直接替换，而是应该玩家自己选择，替换哪个」): one has to leave, the player picks (mc-garswap.js); a garrison already past the cap
  // (an old save, a pulled-down 营房) keeps its size
  const cap = M.garCap ? M.garCap(m) : M.GARRISON_CAP, nu = gar[gar.length - 1];
  if (gar.length > cap) { m.garOut = (m.garOut || 0) + 1; (m.garNewIds = m.garNewIds || []).push(nu.uid); }
  g.save && g.save();
}
function finish(g, F) {
  const c = F.cards[F.chosen]; g.parade = null; g.pulse.mgar = now(); const p = g.fxPos('mgar') || { x: 700, y: 50 };
  g.fx.pop && g.fx.pop(p.x, p.y + 70, '驻军 +1 · ' + (c ? DB[c.u.type].n : ''), c ? Q[c.q].c : '#ffcf4a', 36, { rise: 40 }); g.fx.burst && g.fx.burst(p.x, p.y, c ? Q[c.q].c : '#ffcf4a', 16); S.up && S.up(2); g.bump();
}
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), F = this.parade; if (!F) return r;
  if (this.screen !== 'base') { if (F.chosen == null) this.paradePick(this.paradeBest()); if (this.parade && F.chosen != null) { join(this, F.cards[F.chosen].u); this.parade = null; } return r; }
  const t0 = F.t; F.t += dt || 0;
  // a card lands: its sound by quality, sparks in its colour; the best ones shake the screen
  F.cards.forEach((c, i) => { if (F.t >= c.at && !c.s) { c.s = 1; if (F.quick) return; if (c.q >= 2) S.reveal ? S.reveal(c.q) : S.stamp && S.stamp(); else S.land && S.land(i); if (this.fx) { this.fx.burst && this.fx.burst(c.x, c.y, Q[c.q].c, 8 + c.q * 5, { v: 300 + c.q * 80 }); if (c.q >= 3) { this.fx.kick && this.fx.kick(8 + c.q * 3); this.fx.rays && this.fx.rays(c.x, c.y, Q[c.q].c, 1, { r: 260 }); } } } });
  if (t0 < F.allAt && F.t >= F.allAt && !F.quick) S.fanfare && S.fanfare();
  if (F.chosen != null && F.flyT == null && F.t >= F.pickT + FADE) { F.flyT = F.t; F.dest = this.fxPos('mgar') || { x: 700, y: 50 }; S.whoosh && S.whoosh(0.5); }
  if (F.flyT != null && t0 < F.flyT + FLY && F.t >= F.flyT + FLY) { join(this, F.cards[F.chosen].u); S.land && S.land(3);
    // one more to take: the chosen card leaves the stage, the rest come back
    if (F.picks > 1 && F.cards.length > 1) { F.picks--; const got = F.cards.splice(F.chosen, 1)[0]; F.took = (F.took || []).concat([got]); F.chosen = null; F.flyT = null; F.pickT = null; F.hov = Math.min(F.hov, F.cards.length - 1); const n = F.cards.length; F.cards.forEach((c, i) => { c.x = 960 + (i - (n - 1) / 2) * (CW + GAP); }); this.pulse.mgar = now(); return r; } }
  if (F.flyT != null && F.t >= F.flyT + FLY + 0.1) { finish(this, F); return r; }
  const fc = this.ui && this.ui.cv && this.ui.cv('fx'); if (fc) { try { draw(fc.getContext('2d'), this, F); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('parade: ' + e.message); if (F.chosen == null) { F.chosen = this.paradeBest(); } join(this, F.cards[F.chosen].u); this.parade = null; } }
  return r;
};
G.paradeBest = function () { const F = this.parade; if (!F) return 0; let b = 0; F.cards.forEach((c, i) => { if (pw(c.u) > pw(F.cards[b].u)) b = i; }); return b; };
G.paradePick = function (i) {
  const F = this.parade; if (!F || F.chosen != null || !F.cards[i]) return;
  if (F.t < F.allAt) { F.t = F.allAt; F.cards.forEach(c => { c.at = Math.min(c.at, F.t - 0.4); c.s = 1; }); }
  F.chosen = i; F.pickT = F.t; S.stamp && S.stamp(); this.fx && this.fx.burst && this.fx.burst(F.cards[i].x, F.cards[i].y, Q[F.cards[i].q].c, 24, { v: 500 }); this.bump();
};
// which card is under a point of the stage
const hit = (F, x, y) => F.cards.findIndex(c => Math.abs(x - c.x) < CW / 2 + 10 && Math.abs(y - c.y) < CH / 2 + 10);
// a click: all the cards at once; once they are all up, the card under the pointer is the one
G.paradeClick = function (e) {
  const F = this.parade; if (!F || F.chosen != null) return;
  if (F.t < F.allAt) { F.quick = F.t < F.allAt - 0.4; F.t = F.allAt; F.cards.forEach(c => { c.at = Math.min(c.at, F.t - 0.4); }); S.click && S.click(); return; }
  const p = e && e.clientX != null && this.miniPt ? this.miniPt(e.clientX, e.clientY) : null, i = p ? hit(F, p.x, p.y) : F.hov;
  if (i >= 0) this.paradePick(i);
};
G.paradeHover = function (e) {
  const F = this.parade; if (!F || F.chosen != null || !e || e.clientX == null || !this.miniPt) return; const p = this.miniPt(e.clientX, e.clientY), i = hit(F, p.x, p.y);
  if (i >= 0 && i !== F.hov) { F.hov = i; S.hover && S.hover(); }
};
// keys and pads: ← → move, Enter / Space pick
const oKey = G.handleKey;
G.handleKey = function (ev) {
  const F = this.parade;
  if (F && ev && ev.type === 'keydown') {
    const k = ev.code || ev.key;
    if (/ArrowLeft|KeyA/.test(k)) { F.hov = Math.max(0, F.hov - 1); ev.preventDefault && ev.preventDefault(); return; }
    if (/ArrowRight|KeyD/.test(k)) { F.hov = Math.min(F.cards.length - 1, F.hov + 1); ev.preventDefault && ev.preventDefault(); return; }
    if (/Enter|Space/.test(k)) { if (F.t < F.allAt) this.paradeClick(); else this.paradePick(F.hov); ev.preventDefault && ev.preventDefault(); return; }
    return;
  }
  return oKey ? oKey.apply(this, arguments) : undefined;
};
const oView = G.view;
G.view = function () { const v = oView.call(this); if (this.parade) { v.fxZ = 75; v.coverOn = true; v.coverClick = (e) => this.paradeClick(e); } return v; };
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pointermove', (e) => { const g = M._g; if (g && g.parade) g.paradeHover(e); }, true);
const oBusy = G.baseBusy; G.baseBusy = function () { return !!this.parade || oBusy.apply(this, arguments); };
const oLS = G.longShow; if (oLS) G.longShow = function () { return !!this.parade || oLS.apply(this, arguments); };
const oNG = G.newGame; if (oNG) G.newGame = function () { this.parade = null; return oNG.apply(this, arguments); };
})();
