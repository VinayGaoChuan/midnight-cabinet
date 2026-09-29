// ==== mc-ledger.js ====
(function () {
// What a mini-game cost and gave, in numbers that match the counters (QA 2026-09-29: 「弹珠台结算写物资加20，实际从25变53，
// 增加28；是否含加成没有说明」「许愿井花29积分未命中，结算只写剧情，没有明确花费和本次无奖励」— 成功、失败都显示花费与奖励；
// 金额与资源实际变化一致). The counters are read when a game starts and again at its result: the result's last line says what it
// cost and what came in (supplies with their base and the bonus on top), or that nothing came; the games' own 「获得：…」 lists
// give way to it (a unit that completes a merge shrinks the army: not counted as a loss).
const M = window.MC, G = M.Game.prototype, fmt = (v) => (M.fmt ? M.fmt(v) : String(v));
const snap = (g) => { const r = g.run, L = r.loot || {}; return { w: r.wallet || 0, sup: L.supplies || 0, exp: L.exp || 0, sh: L.shards || 0, fa: L.faith || 0, hp: r.hero ? r.hero.hp : 0 }; };

const oStart = G.miniStart;
G.miniStart = function (kind) { const ok = oStart.apply(this, arguments); if (ok && this.mini && this.run) this._led = { kind, s: snap(this), paid: 0, base: 0, named: [] }; return ok; };
const oPay = G.miniPay;
G.miniPay = function (v) { const ok = oPay.apply(this, arguments); if (ok && this._led) this._led.paid += v; return ok; };
// the gifts: supplies at their base (award() adds the run's bonus), and the names of what is not a number (a blueprint, a unit, an item)
const oAw = G.award;
G.award = function (list) {
  const L = this._led, out = oAw.apply(this, arguments);
  if (L) (list || []).forEach((g) => { if (!g) return; if (g.k === 'rsup') L.base += g.v;
    else { const n = g.k === 'bp' ? M.itemInfo && M.itemInfo(g.key).n : g.k === 'unit' ? M.DB[g.type] && M.DB[g.type].n : g.k === 'item' ? M.ITEMS[g.key] && M.ITEMS[g.key].name : null; if (n) L.named.push(n); } });
  return out;
};
const oBuff = G.buffRun;
if (oBuff) G.buffRun = function (k, v, label) { const r = oBuff.apply(this, arguments); if (this._led && label) this._led.named.push(label); return r; };
const oMB = G.miniBattle;
if (oMB) G.miniBattle = function () { this._led = null; return oMB.apply(this, arguments); };

function line(L, n) {
  const s = L.s, out = [], loss = [], gw = n.w - s.w + L.paid, ds = n.sup - s.sup, dh = Math.round(n.hp - s.hp);
  if (gw > 0) out.push('积分 +' + fmt(gw) + (L.paid > 0 ? '（' + (gw >= L.paid ? '净赚 ' + fmt(gw - L.paid) : '净赔 ' + fmt(L.paid - gw)) + '）' : ''));
  if (ds > 0) out.push('物资 +' + ds + (L.base && ds > L.base ? '（基础 ' + L.base + '，加成 +' + (ds - L.base) + '）' : ''));
  if (n.exp > s.exp) out.push('经验 +' + (n.exp - s.exp)); if (n.sh > s.sh) out.push('灵魂碎片 +' + (n.sh - s.sh)); if (n.fa > s.fa) out.push('信仰值 +' + (n.fa - s.fa));
  const cnt = {}; L.named.forEach(k => { cnt[k] = (cnt[k] || 0) + 1; }); Object.keys(cnt).forEach(k => out.push(k + (cnt[k] > 1 ? ' ×' + cnt[k] : '')));
  if (dh > 0) out.push('领袖生命 +' + dh);
  if (gw < 0) loss.push('积分 ' + fmt(gw)); if (ds < 0) loss.push('物资 ' + ds); if (dh < 0) loss.push('领袖生命 ' + dh);
  return [L.paid > 0 ? '花费 ' + fmt(L.paid) + ' 积分' : '', out.length ? '获得：' + out.join('、') : '本次无奖励', loss.length ? '失去：' + loss.join('、') : ''].filter(Boolean).join(' · ') + '。';
}
const strip = (t) => String(t || '').split('\n').filter(l => !/^获得：/.test(l)).join('\n');
const oEv = G.evResult;
G.evResult = function () {
  const L = this._led, r = oEv.apply(this, arguments);
  if (L) { this._led = null; const D = M.MINI && M.MINI[L.kind]; if (this.run && this.modal && (!D || D.ledger !== false)) this.modal.text = strip(this.modal.text) + '\n' + line(L, snap(this)); }
  return r;
};
})();
