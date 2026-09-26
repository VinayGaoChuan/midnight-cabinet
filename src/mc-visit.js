// ==== mc-visit.js ====
(function () {
// Visitors at the town gate (user ruling 2026-09-26: 「局外事件……应该是屏幕中间出现一个小画面，画面里面是个NPC造访我的城市的
// 小动画，然后弹出内容，并且在我选择的时候，小画面都是有动画的，并且根据我的选择，都会有对应响应效果，事件结束，会有一个结束
// 动画。并且事件结果，要统一在事件结束后再触发……而且商店只能买一样东西，买完直接进入结束动画」).
// A calendar event is a visit: a small pixel window opens in the middle of the screen on the town gate at night, the
// visitor steps out of the gate and walks up, the offer and the choices come up under the window (the scene keeps
// moving: torches, stars, the visitor's own props), the choice gets its reaction (happy hop and coins, a sad little rain
// cloud, a spell, digging), the visitor walks back into the gate and the window closes. Only then does the choice take
// effect (what was paid, what was given, a vein changing, a blessing waiting). A click on the dim area speeds it up.
// Visitors: 流浪商人 (one thing only), 占卜师, 勘探队, 瘟疫医生, 丰收的公鸡, and — once there is faith — 朝圣者.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, U = M.UI, P = M.PJ.PAL, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (q) => 1 - Math.pow(1 - q, 3), eback = (q) => { const c = 1.7; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); };
const RM = () => !!(M.PJ && M.PJ.reduced);
const WX = 600, WY = 150, WW = 720, WH = 440, GY = WY + 356, GATE = WX + 160, STAND = WX + 400;   // window; ground line; gate; where the visitor stands
const T_OPEN = 0.4, T_IN = 1.7, T_REACT = 1.35, T_OUT = 1.5, T_CLOSE = 0.35;
const EV = M.DAYEV;

// ───────── the calendar's events become visitors ─────────
if (EV) {
  delete EV.recruit;   // one leader: nothing left to recruit (2026-09-25)
  Object.assign(EV.merchant, { n: '流浪商人', d: '流浪商人来访：只卖一样东西。' });
  Object.assign(EV.star, { n: '占卜师', d: '占卜师来访：三选一，下一次出征的祝福。' });
  Object.assign(EV.ley, { n: '勘探队', d: '勘探队来访：把岩层变成特殊地形。' });
  Object.assign(EV.plague, { n: '疫病', d: '瘟疫医生来访：花物资治好领袖，或者硬扛。' });
  Object.assign(EV.harvest, { n: '丰收', d: '公鸡打鸣：所有挖掘和建造各推进 1 天。' });
  EV.pilgrim = { n: '朝圣者', ic: 'f_faith', c: '#ffe6a0', d: '朝圣者来访：留下信仰值。', w: 3, need: (m) => !!(M.faithOn && M.faithOn(m)) };
}

// who comes, what they carry, what they say
const WHO = {
  merchant: { key: 'Landlord', who: '推着车的商人', prop: 'cart', text: '「路过贵地，好东西只卖一样，挑吧。」' },
  star: { key: 'MoonlightApostle', who: '摇着水晶球的占卜师', prop: 'orb', text: '「下一次出征，我能给你一点运气。」' },
  ley: { key: 'Supervisor', who: '扛着镐的勘探队长', prop: 'pick', text: '「我们在你的城下找到了地脉，挖不挖？」' },
  plague: { key: 'VoodooBeliever', who: '提着药灯的瘟疫医生', prop: 'miasma', text: '「城里闹病了，你的领袖也没躲过。」' },
  harvest: { key: 'Rooster', who: '跳上城头的公鸡', prop: 'dawn', text: '「喔喔——」天还没亮，全城都起来干活了。' },
  pilgrim: { key: 'DesertBeliever', who: '捧着蜡烛的朝圣者', prop: 'candle', text: '「让我在你的神殿前祈祷一夜吧。」' },
};
const rnd = Math.random, pick = (a) => a[Math.floor(rnd() * a.length)];
const CUR = { sup: ['物资', 'supplies', 'msup'], sh: ['灵魂碎片', 'shards', 'msh'] };

// the offer: options { t, sub, react, say, dis, why, apply(g) }
function offer(g, k) {
  const m = g.meta, o = [];
  if (k === 'merchant') {
    (M.dayGoods ? M.dayGoods(g, m) : []).slice(0, 4).forEach(it => { const [ck, v] = it.cost, C = CUR[ck] || CUR.sup, can = m[C[1]] >= v;
      o.push({ t: it.n, sub: v + ' ' + C[0], d: it.d, react: 'happy', say: '成交！', dis: !can, why: C[0] + '不够', apply: () => { m[C[1]] -= v; g.pulse[C[2]] = now(); it.give(); S.buy && S.buy(); } }); });
    o.push({ t: '不买了', sub: '', react: 'sad', say: '下回再来……', apply: () => {} });
  } else if (k === 'star') {
    const B = M.BLESS || []; B.map((b, i) => i).sort(() => rnd() - 0.5).slice(0, 3).forEach(i => o.push({ t: B[i].n, sub: '下一次出征', react: 'magic', say: '星星会记得。', apply: () => { m.bless = i; g.toast('下一次出征：' + B[i].n, EV.star.c); } }));
  } else if (k === 'ley') {
    const one = (n) => () => { let got = 0; for (let i = 0; i < n; i++) { const tk = M.dropTile(), at = M.tileSpot && M.tileSpot(m, tk); if (!at) continue; const [c, r] = at; M.cell(m, c, r).tile = tk; got++; g.homeQueue(g.tileReveal(c, r, tk)); } if (!got) g.toast('勘探队：没有能变的岩层', EV.ley.c); };
    o.push({ t: '开挖', sub: '一格岩层变成特殊地形', react: 'work', say: '开挖！', apply: one(1) });
    o.push({ t: '多挖一处', sub: '80 物资，再变一格', react: 'work', say: '加把劲！', dis: m.supplies < 80, why: '物资不够', apply: () => { m.supplies -= 80; g.pulse.msup = now(); one(2)(); } });
  } else if (k === 'plague') {
    const cost = 40 * Math.max(1, m.heroes.length);
    o.push({ t: '治疗', sub: cost + ' 物资', react: 'magic', say: '药到病除。', dis: m.supplies < cost, why: '物资不够', apply: () => { m.supplies -= cost; g.pulse.msup = now(); g.toast('领袖的病好了', EV.plague.c); } });
    o.push({ t: '硬扛', sub: '领袖失去 30% 生命', react: 'sad', say: '保重……', apply: () => { m.heroes.forEach(h => { h.hp = Math.max(1, Math.round(h.hp - M.heroMaxHp(h, m) * 0.3)); }); g.toast('领袖失去 30% 生命', '#ff8a8a'); } });
  } else if (k === 'harvest') {
    const push = (days) => () => { let n = 0; for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (!x.job) continue; n++; x.job.days -= days; if (x.job.days <= 0) { if (x.job.kind === 'dig') x.dug = true; else if (x.job.kind === 'build') { x.b = x.job.key; x.dug = true; } x.job = null; const p = g.cellPos(c, r); g.fx.rays(p.x, p.y, EV.harvest.c, 1.2, { r: 240 }); if (M.PXR) M.PXR.poke(c + ',' + r, 'built'); } }
      g.toast(n ? '丰收：' + n + ' 项工程推进 ' + days + ' 天' : '丰收：现在没有工程', EV.harvest.c); };
    o.push({ t: '干活', sub: '所有工程推进 1 天', react: 'happy', say: '喔喔喔！', apply: push(1) });
    o.push({ t: '撒一把米', sub: '30 物资，再推进 1 天', react: 'happy', say: '咯咯咯！', dis: m.supplies < 30, why: '物资不够', apply: () => { m.supplies -= 30; g.pulse.msup = now(); push(2)(); } });
  } else if (k === 'pilgrim') {
    o.push({ t: '留他过夜', sub: '信仰值 +8', react: 'magic', say: '愿灯火长明。', apply: () => g.faithGift(8) });
    o.push({ t: '捐一笔香火', sub: '60 物资，信仰值 +24', react: 'happy', say: '功德无量！', dis: m.supplies < 60, why: '物资不够', apply: () => { m.supplies -= 60; g.pulse.msup = now(); g.faithGift(24); } });
  }
  return o;
}
G.faithGift = function (v) { const m = this.meta; if (!M.faithOn || !M.faithOn(m)) return; this.hold('mfa', m.faith || 0); m.faith = (m.faith || 0) + v; for (let j = 0; j < 4; j++) this.fly('f_faith', { x: STAND + (rnd() - 0.5) * 80, y: GY - 120 }, 'mfa', '#ffe6a0', j === 3 ? () => { this.release('mfa'); const p = this.fxPos('mfa'); if (p) this.fx.pop(p.x, p.y + 50, '+' + v, '#ffe6a0', 32, { num: 1 }); } : null, j * 0.08); };

// ───────── the visit ─────────
G.visitStart = function (k) {
  const W = WHO[k]; if (!W) return false;
  this.visit = { k, W, E: EV[k], t: 0, ph: 'open', pt: 0, x: GATE, face: 1, walk: 0, opts: offer(this, k), pick: null, parts: [], seed: rnd() * 100, fast: false };
  S.whoosh && S.whoosh(0.3); S.arrive && S.arrive('event'); this.bump(); return true;
};
const phase = (V, ph) => { V.ph = ph; V.pt = 0; };
G.visitChoose = function (i) {
  const V = this.visit; if (!V || V.ph !== 'wait') return; const o = V.opts[i]; if (!o) return;
  if (o.dis) { this.deny(o.why || '做不到', '#d0453c'); return; }
  V.pick = o; phase(V, 'react'); S.click();
  if (o.react === 'happy') { S.buy ? S.buy() : S.up && S.up(2); for (let j = 0; j < 16; j++) V.parts.push({ k: 'coin', x: V.x, y: GY - 120, vx: (rnd() - 0.5) * 320, vy: -260 - rnd() * 260, t0: V.t }); }
  if (o.react === 'magic') { S.cast && S.cast(); for (let j = 0; j < 22; j++) { const a = j / 22 * Math.PI * 2; V.parts.push({ k: 'spark', x: V.x, y: GY - 80, vx: Math.cos(a) * 220, vy: Math.sin(a) * 140, t0: V.t }); } }
  if (o.react === 'sad') { S.tone && S.tone(220, 0.2, 'sine', 0.05, -80); }
  if (o.react === 'work') { S.impact && S.impact(); }
  this.bump();
};
G.visitTick = function (dt) {
  const V = this.visit; if (!V) return; if (V.fast && V.ph !== 'wait') dt *= 3; V.t += dt; V.pt += dt;
  if (V.ph === 'open' && V.pt >= T_OPEN) phase(V, 'in');
  else if (V.ph === 'in') { const q = cl(V.pt / T_IN, 0, 1), x = GATE + (STAND - GATE) * eo(q); V.walk += Math.abs(x - V.x); V.x = x; V.face = 1; if (q >= 1) { phase(V, 'wait'); V.fast = false; this.bump(); } }
  else if (V.ph === 'react' && V.pt >= T_REACT) phase(V, 'out');
  else if (V.ph === 'out') { const q = cl((V.pt - 0.25) / (T_OUT - 0.25), 0, 1), x = STAND + (GATE - STAND) * q * q; V.walk += Math.abs(x - V.x); V.x = x; V.face = V.pt > 0.2 ? -1 : 1; if (V.pt >= T_OUT) phase(V, 'close'); }
  else if (V.ph === 'close' && V.pt >= T_CLOSE) {
    // the end: only now does the choice take effect
    this.visit = null; const o = V.pick;
    try { if (o && o.apply) o.apply(this); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('visit: ' + (e && e.message)); }
    this.save(); this.bump();
  }
  V.parts = V.parts.filter(p => V.t - p.t0 < 1.2);
};
const oTick = G.tick;
G.tick = function (dt) { const r = oTick.apply(this, arguments); if (this.visit) { if (this.screen !== 'base') this.visit = null; else this.visitTick(Math.min(dt || 0, 0.05)); } return r; };
// the calendar hands its events to the gate
const oDay = G.dayEvent;
G.dayEvent = function (k) {
  const m = this.meta; if (!WHO[k] || !EV[k]) return oDay.apply(this, arguments);
  const ev = (m.evs || []).find(e => e.day === m.day && e.k === k && !e.done); if (ev) ev.done = true; this.save();
  if (k === 'pilgrim' && !(M.faithOn && M.faithOn(m))) return;
  this.visitStart(k);
};
// nothing else happens at the base during a visit (its dim layer takes the clicks; a click there hurries it)
const oBusy = G.guideBusy; if (oBusy) G.guideBusy = function () { return !!this.visit || oBusy.apply(this, arguments); };
const oNG = G.newGame; if (oNG) G.newGame = function () { this.visit = null; return oNG.apply(this, arguments); };

// ───────── the view: the offer under the window ─────────
const oView = G.view;
G.view = function () {
  const v = oView.call(this), V = this.visit;
  v.visitOn = !!V;
  if (V) {
    const talk = V.ph === 'wait' || V.ph === 'react', q = V.ph === 'wait' ? cl(V.pt / 0.3, 0, 1) : V.ph === 'react' ? cl(1 - (V.pt - 0.5) / 0.3, 0, 1) : 0;
    const shade = V.ph === 'open' ? cl(V.pt / T_OPEN, 0, 1) * 0.62 : V.ph === 'close' ? (1 - cl(V.pt / T_CLOSE, 0, 1)) * 0.62 : 0.62;
    v.vs = { shade: shade.toFixed(3), talk: talk && q > 0, op: q.toFixed(3), dy: Math.round((1 - eo(q)) * 30), c: V.E.c, title: V.E.n, who: V.W.who, text: V.W.text,
      skip: () => { if (this.visit && this.visit.ph !== 'wait') this.visit.fast = true; },
      opts: V.opts.map((o, i) => ({ t: o.t, sub: o.sub, op: o.dis ? 0.5 : 1, pj: V.ph !== 'wait' ? (V.pick === o ? 'key gold' : 'key dis') : o.dis ? 'key dis' : i === 0 ? 'key gold' : 'key dark',
        onClick: (e) => { e && e.stopPropagation && e.stopPropagation(); this.visitChoose(i); }, tipOn: o.d ? this.tipFn({ title: o.t, c: V.E.c, d: o.d }) : () => {} })) };
    v.fxZ = 67; v.tipOn = v.tipOn && V.ph === 'wait';
  }
  return v;
};

// ───────── drawing (screen space, on the fx layer, over the dim) ─────────
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function scene(x, V, T) {
  const R = U.R;
  // sky, stars, moon
  const bands = [P.abyss, P.abyss, P.night, P.night, P.indigo];
  const dawn = V.W.prop === 'dawn' && (V.ph === 'react' || V.ph === 'out' || V.ph === 'close');
  bands.forEach((c, i) => R(x, WX, WY + i * 44, WW, 44, dawn && i >= 3 ? (i === 4 ? P.amber : P.wine) : c));
  for (let i = 0; i < 26; i++) { const sx = WX + 20 + hash(i + V.seed) * (WW - 40), sy = WY + 12 + hash(i * 3 + V.seed) * 170, tw = RM() ? 1 : (Math.floor(T * 2 + i) % 5 === 0 ? 0 : 1); if (tw) R(x, sx, sy, i % 7 === 0 ? 6 : 3, i % 7 === 0 ? 6 : 3, i % 3 ? P.lavender : P.cream); }
  R(x, WX + 590, WY + 40, 48, 48, P.cream); R(x, WX + 602, WY + 52, 9, 9, P.silver); R(x, WX + 620, WY + 70, 6, 6, P.silver); R(x, WX + 632, WY + 40, 6, 48, P.silver);
  // far roofs
  for (let i = 0; i < 9; i++) { const rx = WX + i * 84 + (i % 2) * 20, rh = 30 + (i * 37) % 40; R(x, rx, WY + 220 - rh, 70, rh, P.night); R(x, rx + 26, WY + 220 - rh - 18, 18, 18, P.night); }
  // the wall with the gate
  const top = WY + 212, bot = GY - 26;
  R(x, WX, top, WW, bot - top, P.slate);
  for (let r = 0, y = top; y < bot; r++, y += 22) for (let c = -1, xx = WX + (r % 2 ? -24 : 0); xx < WX + WW; c++, xx += 48) { R(x, xx, y, 46, 3, P.steel); R(x, xx + 45, y, 3, 22, P.night); }
  for (let xx = WX; xx < WX + WW; xx += 48) R(x, xx, top - 22, 30, 22, P.slate);
  R(x, WX, top - 3, WW, 3, P.steel);
  // gate arch: dark mouth, stones round it, the raised portcullis
  const gw = 118, gh = 132, gx = GATE - gw / 2, gy = bot - gh;
  R(x, gx - 12, gy - 12, gw + 24, gh + 12, P.steel); R(x, gx, gy, gw, gh, P.abyss);
  for (let i = 0; i < 6; i++) R(x, gx + 6 + i * 20, gy, 6, 34, P.umber); R(x, gx, gy + 32, gw, 6, P.umber);
  // torches either side of the gate
  [gx - 30, gx + gw + 18].forEach((tx, i) => { R(x, tx, gy + 40, 12, 40, P.umber); const fl = RM() ? 0 : Math.floor((T * 11 + i * 3) % 3) - 1;
    M.pxGlow && M.pxGlow(x, tx + 6, gy + 26, 70, P.amber, 0.28); R(x, tx + fl, gy + 14, 12, 24, P.amber); R(x, tx + 3 + fl, gy + 20, 6, 12, P.butter); });
  // the street
  R(x, WX, bot, WW, WY + WH - bot, P.umber);
  for (let r = 0, y = bot + 6; y < WY + WH; r++, y += 16) for (let xx = WX + (r % 2 ? 14 : 0); xx < WX + WW; xx += 30) R(x, xx, y, 24, 10, r % 3 ? P.brown : P.umber), R(x, xx, y, 24, 3, P.tan);
  // a lamp post on the right
  const lx = WX + 610; R(x, lx, GY - 150, 8, 150, P.ink); R(x, lx - 14, GY - 164, 36, 18, P.ink); R(x, lx - 10, GY - 160, 28, 12, P.butter); M.pxGlow && M.pxGlow(x, lx + 4, GY - 154, 90, P.gold, 0.22);
}
function props(x, V, T, nx, ny, H) {
  const R = U.R, k = V.W.prop, react = V.ph === 'react' ? V.pt : -1;
  if (k === 'cart') {   // the cart comes along behind the merchant
    const cx = nx - V.face * 96, wob = V.ph === 'in' || V.ph === 'out' ? Math.round(Math.sin(V.walk / 9)) : 0;
    R(x, cx - 44, ny - 58 + wob, 88, 38, P.brown); R(x, cx - 44, ny - 58 + wob, 88, 5, P.tan); R(x, cx - 48, ny - 90, 96, 12, P.red); for (let i = 0; i < 4; i++) R(x, cx - 48 + i * 24, ny - 90, 12, 12, P.cream);
    R(x, cx - 44, ny - 80, 5, 24, P.umber); R(x, cx + 39, ny - 80, 5, 24, P.umber);
    [[P.gold, -30], [P.teal, -8], [P.violet, 14]].forEach(([c, dx]) => R(x, cx + dx, ny - 72 + wob, 14, 14, c));
    [-28, 28].forEach(dx => { R(x, cx + dx - 12, ny - 24, 24, 24, P.ink); R(x, cx + dx - 6, ny - 18, 12, 12, P.umber); });
  } else if (k === 'orb') {   // a crystal ball floating in front, brighter while it casts
    const ox = nx + V.face * 52, oy = ny - H * 0.62 + Math.round(Math.sin(T * 3) * 4), glow = react >= 0 ? 0.6 : 0.3;
    M.pxGlow && M.pxGlow(x, ox, oy, 60, P.violet, glow); R(x, ox - 15, oy - 15, 30, 30, P.violet); R(x, ox - 9, oy - 9, 12, 12, P.ice); R(x, ox - 12, oy + 15, 24, 6, P.gold);
  } else if (k === 'pick') {   // the surveyor's pick; digging: dust and a violet vein opening in the street
    if (react >= 0) { const q = cl(react / 1.1, 0, 1); for (let i = 0; i < 6; i++) R(x, nx + V.face * 60 + (hash(i) - 0.5) * 60 * q, ny - 8 - hash(i + 9) * 40 * q, 8, 8, P.tan); R(x, nx + V.face * 40, ny - 3, Math.round(80 * q), 6, P.violet); }
  } else if (k === 'miasma') {   // green fumes round the plague doctor; a cure clears them
    const clear = react >= 0 && V.pick && V.pick.react === 'magic' ? cl(react / 0.8, 0, 1) : 0;
    for (let i = 0; i < 7; i++) { const a = T * 0.8 + i, px = nx + Math.cos(a) * 70, py = ny - 50 - ((T * 30 + i * 20) % 90); x.save(); x.globalAlpha *= 0.4 * (1 - clear); R(x, px, py, 16, 16, P.lime); x.restore(); }
  } else if (k === 'candle') {   // the pilgrim's candle; golden motes rising
    const hx = nx + V.face * 24, hy = ny - H * 0.5; R(x, hx - 4, hy - 16, 8, 16, P.cream); const fl = RM() ? 0 : Math.floor((T * 10) % 3) - 1; R(x, hx - 3 + fl, hy - 28, 6, 12, P.amber); M.pxGlow && M.pxGlow(x, hx, hy - 24, 50, P.gold, 0.3);
    for (let i = 0; i < 6; i++) { const q = ((T * 0.5 + i / 6) % 1); R(x, hx + Math.sin(i * 2 + T) * 30, hy - 20 - q * 120, 4, 4, q < 0.8 ? P.butter : P.gold); }
  } else if (k === 'dawn' && react >= 0) {   // the rooster's crow: sun rays over the wall
    const q = cl(react / 0.6, 0, 1); x.save(); x.globalAlpha *= 0.5 * q; for (let i = 0; i < 7; i++) R(x, WX + 40 + i * 100, WY + 170, 12, 60, P.gold); x.restore();
  }
}
function bubble(x, s, bx, by) {
  x.save(); x.font = U.font(26); const w = Math.ceil(x.measureText(s).width) + 30; x.restore();
  const a = Math.round(bx - w / 2), b = Math.round(by - 50); U.box(x, a, b, w, 44, P.cream); U.R(x, bx - 6, b + 44, 12, 9, P.cream); U.text(x, s, bx, b + 23, 26, P.ink, { shadow: false });
}
M.drawVisit = function (x, g) {
  const V = g.visit; if (!V) return; const T = V.t;
  const sc = V.ph === 'open' ? 0.7 + 0.3 * eback(cl(V.pt / T_OPEN, 0, 1)) : V.ph === 'close' ? 1 - 0.3 * eo(cl(V.pt / T_CLOSE, 0, 1)) : 1;
  const al = V.ph === 'close' ? 1 - cl(V.pt / T_CLOSE, 0, 1) : V.ph === 'open' ? cl(V.pt / 0.15, 0, 1) : 1;
  x.save(); x.globalAlpha = al; x.translate(WX + WW / 2, WY + WH / 2); x.scale(sc, sc); x.translate(-(WX + WW / 2), -(WY + WH / 2));
  U.plate(x, WX - 18, WY - 18, WW + 36, WH + 36, { ring: V.E.c });
  x.save(); x.beginPath(); x.rect(WX, WY, WW, WH); x.clip();
  scene(x, V, T);
  // the visitor
  const H = V.W.key === 'Rooster' ? 96 : 150, react = V.ph === 'react' ? V.pt : -1, o = V.pick;
  let st = 'idle', f = Math.floor(T * 2.5), dy = 0;
  if (V.ph === 'in' || (V.ph === 'out' && V.pt > 0.25)) { st = 'walk'; f = Math.floor(V.walk / 14); }
  if (react >= 0 && o) {
    if (o.react === 'happy') dy = -Math.round(Math.abs(Math.sin(react * Math.PI * 2.4)) * 30 * cl(1 - react / 1.2, 0, 1));
    else if (o.react === 'magic') { st = 'cast'; f = Math.floor(react * 6) % 2; }
    else if (o.react === 'work') { st = 'atk'; f = Math.floor(react * 9) % 3; }
    else if (o.react === 'sad') { st = 'hurt'; f = 0; dy = 4; }
  }
  const nx = Math.round(V.x), ny = GY, inGate = V.ph === 'in' ? cl(V.pt / 0.45, 0, 1) : V.ph === 'out' ? cl((T_OUT - V.pt) / 0.4, 0, 1) : 1;
  props(x, V, T, nx, ny, H);
  const im = M.P16 && M.P16.img(V.W.key, st, f, null, H) || M.P16 && M.P16.img(V.W.key, 'idle', 0, null, H);
  x.save(); x.globalAlpha *= 0.45 * inGate; x.fillStyle = P.ink; x.beginPath(); x.ellipse(nx, ny + 2, 34, 8, 0, 0, 7); x.fill(); x.restore();
  if (im) { x.save(); x.globalAlpha *= inGate; x.translate(nx, ny + dy); if (V.face < 0) x.scale(-1, 1); x.drawImage(im, -im.cx, -im.footY); x.restore(); }
  // reactions over the head
  const head = ny - H - 20;
  if (react >= 0 && o) {
    if (o.react === 'sad') { const q = cl(react / 0.3, 0, 1); x.save(); x.globalAlpha *= q; U.R(x, nx - 36, head - 40, 72, 24, P.steel); U.R(x, nx - 24, head - 52, 40, 16, P.steel); for (let i = 0; i < 4; i++) U.R(x, nx - 28 + i * 18, head - 12 + ((react * 120 + i * 17) % 30), 3, 10, P.ice); x.restore(); }
    if (react > 0.15 && react < T_REACT - 0.1 && o.say) bubble(x, o.say, nx, head - (o.react === 'sad' ? 60 : 10));
  } else if (V.ph === 'wait') { const b = Math.floor(T * 2) % 2; U.R(x, nx - 3, head + (b ? 0 : 3), 6, 6, P.gold); }   // waiting for you
  // particles: coins, sparks
  V.parts.forEach(p => { const u = T - p.t0, px = p.x + p.vx * u, py = p.y + p.vy * u + 700 * u * u; if (py > WY + WH) return; x.save(); x.globalAlpha *= cl(1 - u / 1.2, 0, 1);
    if (p.k === 'coin') { U.R(x, px - 6, py - 6, 12, 12, P.gold); U.R(x, px - 3, py - 6, 6, 3, P.butter); } else U.R(x, px - 4, py - 4, 8, 8, u < 0.4 ? P.butter : P.violet); x.restore(); });
  x.restore();
  // the window's name plate
  U.text(x, V.E.n, WX + WW / 2, WY - 18, 34, V.E.c, { outline: true });
  x.restore();
};
const FLP = M.FxLayer.prototype, oD = FLP.draw;
FLP.draw = function (ctx, noClear) { const g = M._g, r = oD.call(this, ctx, noClear); if (g && this === g.fx && g.visit) { ctx.save(); try { ctx.setTransform(1, 0, 0, 1, 0, 0); M.drawVisit(ctx, g); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('visit: ' + e.message); g.visit = null; } ctx.restore(); } return r; };

if (M.GUIDE) M.GUIDE.push({ id: 'visit', cat: '基地', icon: 't_coin', title: '来访者', line: '日历上的事件是一位来访者：在城门口选一样，等他离开后才生效。流浪商人只卖一样东西。', scr: 'base', sel: '[data-g="visit"]' });
})();
