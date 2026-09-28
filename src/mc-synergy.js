// ==== mc-synergy.js ====
(function () {
// 羁绊: the races' bonds (user rulings 2026-09-27: 「我想添加羁绊系统，就是类似云顶的那种」, then 「最高级的羁绊能不能加额外加个
// 明显的机制……也给凑羁绊的人，一些满足感」, 「敌人都不吃羁绊」). Counted on the units that fight: how many DIFFERENT lines of a
// race are there (copies and summons don't count). 2 / 3 / 5 lines light the three levels (the army grows from 6 to 10, so
// at 6 the top one means nearly one race, at 8 one full race and a second bond). Only our side has bonds; the garrison has
// them too on the nights (same count). Numbers: docs/design.md §7.3b.
const M = window.MC, G = M.Game.prototype, BP = M.Battle3 && M.Battle3.prototype, DB = M.DB, S = M.Sfx, U = M.UI, P = M.PJ.PAL, Q = M.QUALITY;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
M.SYN_AT = [2, 3, 5];
const SYN = M.SYN = {
  人类: { n: '纪律', top: '号令', ic: 'r_human', lv: [0.03, 0.05, 0.06], d: ['每层士气攻击 +3%', '每层士气攻击 +5%', '每层士气攻击 +6%，其他种族也吃一半'], topD: '士气满 5 层吹号：全队攻击 +20%；之后每 10 秒，人类部队一起冲锋打 150%' },
  亡灵: { n: '不息', top: '亡者大军', ic: 'r_undead', lv: [0.25, 0.45, 0.65], d: ['第一次倒下时带 25% 生命站起', '带 45% 生命站起', '带 65% 生命站起，之后攻击 +25%'], topD: '每死一个敌人，原地爬起一具骷髅兵（12 秒，最多 4 具）' },
  野兽: { n: '兽群', top: '兽王之怒', ic: 'r_beast', lv: [0.15, 0.25, 0.40], sc: [0.05, 0.10, 0.15], d: ['生命 +15%，击杀积分 +5%', '生命 +25%，积分 +10%', '生命 +40%，积分 +15%'], topD: '第一次掉到半血时怒吼震退敌人，狂化 8 秒：体型变大、攻速 +50%、吸血 20%' },
  自然: { n: '生长', top: '世界之树', ic: 'r_nature', lv: [0.01, 0.015, 0.025], hl: [0.10, 0.20, 0.35], d: ['每秒回 1% 生命，治疗 +10%', '每秒回 1.5%，治疗 +20%', '每秒回 2.5%，治疗 +35%'], topD: '我方阵中长出生命树：每 3 秒全队回 5% 生命，自然部队受到伤害 −20%' },
  深海: { n: '潮涌', top: '海啸', ic: 'r_sea', lv: [0.08, 0.12, 0.18], sp: [0, 0.4, 0.7], d: ['攻击吸血 8%', '吸血 12%，每第 4 次普攻溅射 40%', '吸血 18%，溅射 70%'], topD: '每 15 秒一道海浪冲过战场：打所有敌人（深海部队攻击总和），并击退' },
  异界: { n: '裂隙', top: '回响', ic: 'r_rift', lv: [25, 40, 60], sk: [0, 0.15, 0.30], d: ['开战法力 +25', '法力 +40，技能伤害 +15%', '法力 +60，技能伤害 +30%'], topD: '放完技能 30% 几率 0.5 秒后免费再放一次（它的虚影）' },
};
M.synLevel = (n) => (n >= 5 ? 3 : n >= 3 ? 2 : n >= 2 ? 1 : 0);
// how many lines of a race this area's pool holds, and so the highest level the army can reach here (2026-09-28: 「如果某一次选择
// 条数，注定凑不齐5条……那么在羁绊那里面就不要显示出来，也就是能凑出几个，就显示几个」); no pool (the prologue): everything
M.synCap = (run, r) => { const L = run && run.pool && run.pool.lines; if (!L || !L.length) return 99; return L.filter(l => M.RACE_OF[l] === r).length; };
M.synMaxL = (run, r) => M.synLevel(M.synCap(run, r));
// how many different lines of each race in a list of unit types
M.synCount = function (types) { const seen = {}, out = {}; (types || []).forEach(k => { const d = DB[k]; if (!d || !d.line || !SYN[d.race] || seen[d.line]) return; seen[d.line] = 1; out[d.race] = (out[d.race] || 0) + 1; }); return out; };

// ───────── icons: 深海 (a wave) and 异界 (a rift); the six races as tags ─────────
const IC = M.IC;
if (IC) {
  IC.r_sea = (x) => { x.fillStyle = '#1f5f9a'; x.beginPath(); x.arc(16, 16, 12, 0, 7); x.fill(); x.strokeStyle = '#8fd8ff'; x.lineWidth = 3; x.beginPath(); for (let i = 0; i <= 20; i++) { const X = 6 + i, Y = 16 + Math.sin(i / 20 * Math.PI * 2) * 4; if (i) x.lineTo(X, Y); else x.moveTo(X, Y); } x.stroke(); x.fillStyle = '#e8f8ff'; x.beginPath(); x.arc(11, 11, 2.2, 0, 7); x.fill(); };
  IC.r_rift = (x) => { x.fillStyle = '#2a1850'; x.beginPath(); x.ellipse(16, 16, 12, 12, 0, 0, 7); x.fill(); x.fillStyle = '#c890ff'; x.beginPath(); x.moveTo(16, 4); x.lineTo(20, 14); x.lineTo(17, 16); x.lineTo(21, 28); x.lineTo(13, 17); x.lineTo(16, 15); x.lineTo(12, 5); x.closePath(); x.fill(); x.fillStyle = '#f0e0ff'; x.fillRect(15, 13, 2, 4); };
}
const oRaceTag = M.TAG && M.TAG.race;
if (M.TAG) M.TAG.race = (n) => (SYN[n] ? { kind: 'race', n, c: M.RACES[n] || '#fff', icon: SYN[n].ic, d: '同一种族的不同部队一起上场，羁绊越强。' } : oRaceTag ? oRaceTag(n) : null);
// the tag's tip lists the three levels (and the top one's own move)
const oTip = G.tipFor;
G.tipFor = function (key) {
  const m = /^tag-race-(.+)$/.exec(key || ''); if (m && SYN[m[1]]) { const r = m[1], s = SYN[r], n = this.run ? (M.synCount(this.run.roster.map(u => u.type))[r] || 0) : 0, lv = M.synLevel(n);
    const mx = M.synMaxL(this.run, r);   // only what this area's pool can reach
    return { title: r + ' · ' + s.n, c: M.RACES[r], d: '同一种族的不同部队一起上场，羁绊越强。', lines: [0, 1, 2].filter(i => i < mx).map(i => ({ t: M.SYN_AT[i] + ' 条：' + s.d[i], c: lv > i ? M.RACES[r] : '#8d8496' })).concat(mx < 3 ? [] : [{ t: '5 条满级 · ' + s.top + '：' + s.topD, c: lv >= 3 ? '#ffcf4a' : '#8d8496' }]) }; }
  return oTip ? oTip.apply(this, arguments) : null;
};

// ───────── in battle ─────────
if (BP) {
  const ours = (b) => b.ents.filter(e => e.side === 'A' && !e.isHero && !e.summon && e.d && e.d.line);
  const oInit = BP.init;
  BP.init = function (run) {
    const r = oInit.apply(this, arguments), us = ours(this), cnt = M.synCount(us.map(e => e.kind)), lv = {};
    Object.keys(cnt).forEach(k => { const L = M.synLevel(cnt[k]); if (L) lv[k] = L; }); this.syn = lv; this.synCnt = cnt;
    us.forEach(e => { const L = lv[e.d.race]; if (!L) return; const s = SYN[e.d.race], i = L - 1; e._syn = e.d.race; e._synL = L;
      if (e.d.race === '野兽') { const k = 1 + s.lv[i]; e.maxHp *= k; e.hp *= k; }
      if (e.d.race === '深海') e._synLeech = s.lv[i];
      if (e.d.race === '异界') e.mana = Math.min(100, (e.mana || 0) + s.lv[i]);
      if (e.d.race === '自然' && L >= 3) e._synTaken = -0.2; });
    if (lv['野兽']) this.scoreK = (this.scoreK || 0) + SYN['野兽'].sc[lv['野兽'] - 1];
    this.synT = { morale: 0, mNext: 4, charge: 0, tree: 0, wave: 0, bones: 0 };
    return r;
  };
  // attack: the bonds that raise damage (人类's morale, 亡灵 after rising, 异界's skills); 深海's splash; 野兽's rage at half life
  const oDeal = BP.deal;
  BP.deal = function (src, tg, amt, o) {
    o = o || {}; const syn = this.syn || {};
    if (src && src.side === 'A' && amt > 0) {
      let k = 1 + (src._synAtk || 0);
      const hm = syn['人类'] && this.synT ? this.synT.morale * SYN['人类'].lv[syn['人类'] - 1] : 0;
      if (hm) k += src._syn === '人类' ? hm : syn['人类'] >= 3 ? hm * 0.5 : 0;
      if (this.synT && this.synT.horn) k += 0.2;
      if (src._syn === '异界' && this._inCast === src) k += SYN['异界'].sk[src._synL - 1];
      amt *= k;
    }
    if (tg && tg._synTaken) amt *= 1 + tg._synTaken;
    const hp0 = tg && tg.hp, r = oDeal.call(this, src, tg, amt, o);
    // the auras are rebuilt every step, so the bonds' lifesteal is paid here
    if (src && src.alive && src._synLeech && r > 0 && !o.reflect) src.hp = Math.min(src.maxHp, src.hp + r * src._synLeech);
    if (src && src._syn === '深海' && o.auto && src._synL >= 2 && tg) { src._seaN = (src._seaN || 0) + 1; if (src._seaN % 4 === 0) { const f = SYN['深海'].sp[src._synL - 1]; this.ring(tg.x, tg.y - 30, 10, 120, '#5fb8ff', 6, 0.3); this.ents.forEach(o2 => { if (o2 !== tg && this.active(o2) && o2.side !== src.side && Math.hypot(o2.x - tg.x, (o2.y - tg.y) * 1.2) < 120) oDeal.call(this, src, o2, amt * f, { small: 1, col: '#5fb8ff' }); }); } }
    if (tg && tg._syn === '野兽' && tg._synL >= 3 && !tg._rage && tg.alive && hp0 >= tg.maxHp * 0.5 && tg.hp < tg.maxHp * 0.5) {
      tg._rage = this.t + 8; tg.asB += 0.5; tg._synLeech = (tg._synLeech || 0) + 0.2; tg._sz0 = tg.sz; tg.sz *= 1.3;
      this.float(tg.x, tg.y - 110 * tg.sz, '兽王之怒', '#ffb060', 34); this.ring(tg.x, tg.y - 30, 20, 220, '#ffb060', 10, 0.4); this.shake = Math.max(this.shake, 10); S.impact && S.impact();
      this.ents.forEach(o2 => { if (this.active(o2) && o2.side !== tg.side && Math.hypot(o2.x - tg.x, o2.y - tg.y) < 200) { o2.x += 90; o2.kb = this.t; o2.kbDir = 1; } });
    }
    return r;
  };
  // 亡灵: the first fall is not the last; 5 lines: every enemy that falls rises as a bone soldier on our side
  const oKill = BP.kill;
  BP.kill = function (e, src) {
    const syn = this.syn || {};
    if (e && e.alive && e.side === 'A' && e._syn === '亡灵' && !e._undRev && !e.summon && !e.isHero) {
      e._undRev = 1; e.hp = e.maxHp * SYN['亡灵'].lv[e._synL - 1]; if (e._synL >= 3) e._synAtk = (e._synAtk || 0) + 0.25;
      this.float(e.x, e.y - 90 * e.sz, '不息', '#bfe0f0', 30); this.ring(e.x, e.y - 30, 10, 140, '#bfe0f0', 6, 0.4); this.burst && this.burst(e.x, e.y - 40, '#bfe0f0', 12); return;
    }
    const was = e && e.alive; oKill.apply(this, arguments);
    if (was && !e.alive && e.side === 'E' && syn['亡灵'] >= 3) {
      const bones = this.ents.filter(o => o.alive && o._bone).length;
      if (bones < 4 && DB.Archer_T1) { const s = this.summon('Archer_T1', 'A', e.x, e.y, 12, null); if (s) { s._bone = 1; s.maxHp = s.hp = Math.max(40, e.maxHp * 0.3); s.atk = Math.max(4, (e.atk || 10) * 0.3); this.float(e.x, e.y - 60, '亡者大军', '#bfe0f0', 24); } }
    }
  };
  // skills: 异界's echo
  const oCast = BP.beginCast;
  if (oCast) BP.beginCast = function (e) {
    const r = oCast.apply(this, arguments);
    if (e && e._syn === '异界' && e._synL >= 3 && !e._echoing && Math.random() < 0.3) {
      // 0.5 s later (or as soon as the first cast is out) the rift's phantom casts it again, free
      const echo = (n) => { if (!e.alive || this.over) return; if (e.casting) { if (n < 20) this.later(0.2, () => echo(n + 1)); return; }
        const m0 = e.mana; e._echoing = 1; this.float(e.x, e.y - 100 * e.sz, '回响', '#c890ff', 30); this.ring(e.x, e.y - 40, 10, 130, '#c890ff', 6, 0.35); this.burst(e.x, e.y - 40 * e.sz, '#c890ff', 12);
        try { oCast.call(this, e); } finally { e._echoing = 0; e.mana = m0; } };
      this.later(0.5, () => echo(0)); }
    return r;
  };
  // healing: 自然 gives and takes more
  const oHeal = BP.heal;
  BP.heal = function (o, amt, col) { const s = this.syn || {}, L = s['自然']; if (L && o && (o._syn === '自然' || (this._actor && this._actor._syn === '自然'))) amt *= 1 + SYN['自然'].hl[L - 1]; return oHeal.call(this, o, amt, col); };
  // time: 人类's morale and charge, 自然's regrowth and tree, 深海's wave, 野兽's rage running out
  const oStep = BP.step;
  BP.step = function (dt) {
    const r = oStep.apply(this, arguments), s = this.syn, T = this.synT; if (!s || !T || this.over || !(dt > 0)) return r;
    const t = this.t, us = ours(this).filter(e => e.alive);
    if (s['人类']) { if (t >= T.mNext && T.morale < 5) { T.morale++; T.mNext = t + 4; us.filter(e => e._syn === '人类').forEach(e => this.float(e.x, e.y - 90 * e.sz, '士气 ' + T.morale, '#ffd98a', 20)); }
      if (s['人类'] >= 3 && T.morale >= 5) { if (!T.horn) { T.horn = t; this.float(960, 250, '号令！全队攻击 +20%', '#ffd98a', 44); this.shake = Math.max(this.shake, 8); S.fanfare && S.fanfare(); T.charge = t + 1; }
        if (t >= T.charge) { T.charge = t + 10; us.filter(e => e._syn === '人类').forEach(e => { const f = this.nearestFoe(e); if (!f) return; e.x = f.x - 50; e.y = f.y; this.ring(e.x, e.y - 30, 10, 90, '#ffd98a', 5, 0.25); oDeal.call(this, e, f, e.atk * 1.5, { big: 1, col: '#ffd98a' }); }); } } }
    if (s['自然']) { const L = s['自然'], rate = SYN['自然'].lv[L - 1]; us.forEach(e => { const rr = (e._syn === '自然' ? rate : 0) + (L >= 3 ? 0.005 : 0); if (rr && e.hp < e.maxHp) this.regen(e, e.maxHp * rr * dt); });
      if (L >= 3) { if (!T.treeAt) { T.treeAt = t; this.float(300, 250, '世界之树', '#b6f28a', 40); } if (t - (T.tree || 0) >= 3) { T.tree = t; us.forEach(e => { if (e.hp < e.maxHp) oHeal.call(this, e, e.maxHp * 0.05, '#b6f28a'); }); this.ring(300, 440, 20, 360, '#b6f28a', 6, 0.5); } } }
    if (s['深海'] >= 3) { if (!T.wave) T.wave = t + 6; if (t >= T.wave) { T.wave = t + 15; T.waveAt = t; const sum = us.filter(e => e._syn === '深海').reduce((a, e) => a + e.atk, 0); this.float(960, 250, '海啸！', '#5fb8ff', 48); this.shake = Math.max(this.shake, 14); S.boom && S.boom();
      this.ents.forEach(o => { if (this.active(o) && o.side === 'E') { const src = us.find(e => e._syn === '深海'); oDeal.call(this, src || null, o, sum, { big: 1, col: '#5fb8ff' }); o.x = Math.min(1900, o.x + 70); o.kb = t; o.kbDir = 1; } }); } }
    us.forEach(e => { if (e._rage && t >= e._rage) { e._rage = 1e9; e.asB -= 0.5; e._synLeech = Math.max(0, (e._synLeech || 0) - 0.2); if (e._sz0) e.sz = e._sz0; } });
    return r;
  };
  // the tree and the wave, drawn on the field (in the field's own coordinates, shake included)
  const oRender = BP.render;
  BP.render = function (ctx) {
    const r = oRender.apply(this, arguments), T = this.synT, s = this.syn; if (!T || !s) return r;
    ctx.save();
    if (T.treeAt != null) { const g = eo(cl((this.t - T.treeAt) / 1.2, 0, 1)), x = 190, y = 300, B = 8, k = 0.8 * g, pulse = cl(1 - (this.t - (T.tree || 0)) / 0.6, 0, 1);
      // a pixel tree grows behind our back row: trunk, three crowns, fruit that twinkles; it glows when it heals
      if (pulse > 0 && M.glow) M.glow(ctx, x, y - 160 * k, 260, '#b6f28a', 0.5 * pulse);
      const th = Math.round(130 * k); ctx.globalAlpha = 0.95; ctx.fillStyle = '#07060f'; ctx.fillRect(x - 20, y - th, 40, th); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x - 16, y - th, 32, th); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(x - 16, y - th, 8, th);
      const C3 = [[0, -200, 100], [-70, -150, 66], [70, -150, 66]];
      if (k > 0.05) for (let by = -320; by < -70; by += B / 0.8) for (let bx = -150; bx < 150; bx += B / 0.8) { let inn = -1; C3.forEach(([cx, cy, r]) => { const d = Math.hypot(bx - cx, by - cy) / (r * g); if (d < 1) inn = Math.max(inn, 1 - d); }); if (inn < 0) continue;
        const X0 = Math.round((x + bx * 0.8) / B) * B, Y0 = Math.round((y + by * k) / B) * B; ctx.fillStyle = inn < 0.1 ? '#07060f' : inn < 0.3 ? '#2f6a2a' : bx < -10 && by < -190 ? '#b6f28a' : '#5fae44'; ctx.fillRect(X0, Y0, B, B);
        if (inn > 0.35 && ((Math.round(bx) * 7 + Math.round(by) * 13) & 63) < 3) { ctx.fillStyle = Math.sin(this.t * 4 + bx) > 0.3 ? '#fff7a0' : '#ffd060'; ctx.fillRect(X0 + 2, Y0 + 2, 4, 4); } }
      ctx.globalAlpha = 1; }
    // 海啸: a pixel wall of water sweeps left to right, a white crest on its front
    if (T.waveAt != null && this.t - T.waveAt < 1.8) { const q = (this.t - T.waveAt) / 1.8, X = -300 + q * 2700, fade = 1 - cl((q - 0.75) / 0.25, 0, 1), B = 12;
      for (let y = 20; y < 740; y += B) { const w = Math.sin(y / 70 + this.t * 9) * 26 + Math.sin(y / 23) * 8, fx = X + w;
        ctx.globalAlpha = 0.28 * fade; ctx.fillStyle = '#1f6fb8'; ctx.fillRect(Math.round((fx - 420) / B) * B, y, 420, B);
        ctx.globalAlpha = 0.5 * fade; ctx.fillStyle = '#5fb8ff'; ctx.fillRect(Math.round((fx - 120) / B) * B, y, 108, B);
        ctx.globalAlpha = 0.9 * fade; ctx.fillStyle = (y / B) % 3 ? '#e8f8ff' : '#bfe8ff'; ctx.fillRect(Math.round((fx - 12) / B) * B, y, B * 2, B);
        if ((y / B + Math.floor(this.t * 20)) % 5 === 0) { ctx.fillRect(Math.round((fx + 14) / B) * B, y - B, B, B); } }
      ctx.globalAlpha = 1; }
    ctx.restore(); return r;
  };
}

// ───────── on screen: the army bar's bonds, the fight's opening chips, the shop card's +1 ─────────
const synRows = (types, run) => { const c = M.synCount(types); return M.RACE6.filter(r => c[r] && M.synMaxL(run, r) > 0).map(r => { const n = c[r], L = M.synLevel(n), mx = M.synMaxL(run, r), tg = M.tagIc ? M.tagIc('race', r) : null;
  return { r, n, L, img: tg ? tg.img : '', c: M.RACES[r], tip: 'tag-race-' + r, t: r + ' ' + n, pips: M.SYN_AT.slice(0, mx).map((a, i) => ({ c: n >= a ? (i === 2 ? '#ffcf4a' : M.RACES[r]) : '#2b2461' })), op: L ? 1 : 0.55 }; }); };
M.synRows = synRows;
const oBoons = M.boonsOf;
if (oBoons) M.boonsOf = function (run) {
  const out = oBoons.apply(this, arguments); const g = M._g, b = g && g.battle; if (!b || !b.syn) return out;
  Object.keys(b.syn).forEach(r => { const L = b.syn[r], s = SYN[r]; out.unshift({ n: r + ' · ' + (L >= 3 ? s.top : s.n), ic: s.ic, c: L >= 3 ? '#ffcf4a' : M.RACES[r], t: L >= 3 ? s.topD : s.d[L - 1] }); });
  return out.slice(0, 8);
};
const oView = G.view;
G.view = function () {
  const v = oView.call(this), run = this.run;
  if (v.w && run && !run.raid) { const rows = synRows(run.roster.map(u => u.type), run); v.w.synOn = rows.length > 0 && (this.screen === 'world' || this.screen === 'shop'); v.w.syn = rows;
    (v.w.roster || []).forEach((r, i) => { const vis = run.roster.filter(u => !this.hideU.has(u.uid)); const u = (r.uid != null && vis.find(x => x.uid === r.uid)) || vis[i], d = u && DB[u.type]; const tg = d && M.tagIc ? M.tagIc('race', d.race) : null; if (tg) { r.ri = tg; r.hasR = true; } }); }
  if (v.s && run && run.shop && this.screen === 'shop') { const c0 = M.synCount(run.roster.map(u => u.type));
    (v.s.units || []).forEach((su, i) => { const c = run.shop.units[i], d = c && DB[c.type]; if (!d) return; const tg = M.tagIc ? M.tagIc('race', d.race) : null; if (tg) { su.ri = tg; su.hasR = true; }
      const has = run.roster.some(u => DB[u.type] && DB[u.type].line === d.line), n0 = c0[d.race] || 0, n1 = has ? n0 : n0 + 1;
      const up = M.synLevel(n1) > M.synLevel(n0); su.synUp = !c.sold && !has && SYN[d.race] ? d.race + ' ' + n0 + ' → ' + n1 : ''; su.synOn = !!su.synUp; su.synC = M.RACES[d.race] || '#fff'; su.synGlow = up ? '0 0 0 2px ' + su.synC + ',0 0 16px 4px ' + su.synC : '0 0 0 2px ' + su.synC; }); }
  return v;
};

// ───────── the nights: the garrison has its bonds too (same count; the night's fight has no mana or skills, so 异界 there is
// attack: +10% / +15% / +30%, and its echo hits a second time) ─────────
// 2026-09-27: 「守城的时候，是不会触发羁绊效果的」 — the night's fight has no bonds; the code stays behind this switch
M.SYN_NIGHT = false;
const NRB = M.NightRaid;
if (NRB && M.SYN_NIGHT) {
  const DX = () => (M.BASE_GEO ? M.BASE_GEO.DOOR_X : 960);
  M.NightRaid = class extends NRB {
    constructor(meta) {
      super(meta); const gs = this.ents.filter(e => e.side === 'A' && e.gar && DB[e.sprite]), cnt = M.synCount(gs.map(e => e.sprite)), lv = {};
      Object.keys(cnt).forEach(k => { const L = M.synLevel(cnt[k]); if (L) lv[k] = L; }); this.syn = lv; this.synCnt = cnt;
      this.synT = { morale: 0, mNext: 4, charge: 0, tree: 0, wave: 0 };
      gs.forEach(e => { const r = DB[e.sprite].race, L = lv[r]; e.atk0 = e.atk; if (!L) return; const sd = SYN[r], i = L - 1; e._syn = r; e._synL = L;
        if (r === '野兽') { const k = 1 + sd.lv[i]; e.max *= k; e.hp *= k; }
        if (r === '深海') e._synLeech = sd.lv[i];
        if (r === '异界') e._synAtk = [0.1, 0.15, 0.3][i];
        if (r === '自然' && L >= 3) e._synTaken = -0.2; });
    }
    damage(e, d, col, src) {
      const syn = this.syn || {};
      if (e && e.alive && e._synTaken) d *= 1 + e._synTaken;
      if (e && e.alive && e.side === 'A' && e._syn === '亡灵' && !e._undRev && e.hp - d <= 0) { e._undRev = 1; e.hp = e.max * SYN['亡灵'].lv[e._synL - 1]; if (e._synL >= 3) e._synAtk = (e._synAtk || 0) + 0.25; this.float(e.x, e.y - 110, '不息', '#bfe0f0', 28); this.burst(e.x, e.y - 40, '#bfe0f0', 10); return; }
      const alive = e && e.alive, hp0 = e && e.hp, r = super.damage(e, d, col, src);
      if (src && src.alive && src._synLeech && alive) src.hp = Math.min(src.max, src.hp + d * src._synLeech);
      if (src && src._syn === '深海' && src._synL >= 2 && alive) { src._seaN = (src._seaN || 0) + 1; if (src._seaN % 4 === 0) { const f = SYN['深海'].sp[src._synL - 1]; this.ents.forEach(o => { if (o !== e && o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 120) super.damage(o, d * f, '#5fb8ff'); }); } }
      if (src && src._syn === '异界' && src._synL >= 3 && alive && e.alive && Math.random() < 0.3) { this.float(src.x, src.y - 110, '回响', '#c890ff', 24); super.damage(e, d, '#c890ff'); }
      if (e && e.side === 'A' && e._syn === '野兽' && e._synL >= 3 && !e._rage && e.alive && hp0 >= e.max * 0.5 && e.hp < e.max * 0.5) {
        e._rage = this.t + 8; e._cd0 = e.cd; e.cd /= 1.5; e._synLeech = (e._synLeech || 0) + 0.2; e._s0 = e.s; e.s = e.s * 1.3; this.float(e.x, e.y - 130, '兽王之怒', '#ffb060', 30); this.shake = Math.max(this.shake, 10);
        this.ents.forEach(o => { if (o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 200) { o.x += Math.sign(o.x - e.x || 1) * 90; o.stun = Math.max(o.stun || 0, 0.4); } }); }
      if (alive && e && !e.alive && e.side === 'E' && syn['亡灵'] >= 3 && DB.Archer_T1 && this.ents.filter(o => o.alive && o._bone).length < 4) {
        const hp = Math.max(40, e.max * 0.3); this.ents.push({ side: 'A', guard: 1, _bone: 1, _until: this.t + 12, sprite: 'Archer_T1', s: 4, x: e.x, home: e.x, home0: e.x, y: e.y, hp, max: hp, atk: Math.max(4, e.atk * 0.3), atk0: Math.max(4, e.atk * 0.3), cd: 1, range: 320, spd: 170, ranged: true, t: 0.5, alive: true, face: -Math.sign(e.x - DX()) || 1 });
        this.float(e.x, e.y - 90, '亡者大军', '#bfe0f0', 24); }
      return r;
    }
    step(dt) {
      super.step(dt); const s = this.syn, T = this.synT; if (!s || !T || this.over || !(dt > 0)) return; const t = this.t, us = this.ents.filter(e => e.alive && e.side === 'A' && e.gar);
      if (!T.said && t > 0.6 && Object.keys(s).length) { T.said = 1; this.float(DX(), -330, '羁绊 · ' + Object.keys(s).map(r => r + ' ' + this.synCnt[r]).join(' · '), '#ffe08a', 30); }
      const hm = s['人类'] ? T.morale * SYN['人类'].lv[s['人类'] - 1] : 0;
      if (s['人类'] && t >= T.mNext && T.morale < 5) { T.morale++; T.mNext = t + 4; }
      if (s['人类'] >= 3 && T.morale >= 5 && !T.horn) { T.horn = t; T.charge = t + 1; this.float(DX(), -300, '号令！全队攻击 +20%', '#ffd98a', 36); }
      this.ents.forEach(e => { if (!e.alive || e.side !== 'A' || e.atk0 == null) return; let k = 1 + (e._synAtk || 0) + (T.horn ? 0.2 : 0); if (hm) k += e._syn === '人类' ? hm : s['人类'] >= 3 ? hm * 0.5 : 0; e.atk = e.atk0 * k;
        if (e._until && t >= e._until) { e.alive = false; this.burst(e.x, e.y - 30, '#bfe0f0', 6); }
        if (e._rage && t >= e._rage) { e._rage = 1e9; if (e._cd0) e.cd = e._cd0; if (e._s0) e.s = e._s0; e._synLeech = Math.max(0, (e._synLeech || 0) - 0.2); } });
      if (T.horn && t >= T.charge) { T.charge = t + 10; us.filter(e => e._syn === '人类').forEach(e => { let f = null, bd = 1e9; this.ents.forEach(o => { if (o.alive && o.side === 'E' && Math.abs(o.x - e.x) < bd) { bd = Math.abs(o.x - e.x); f = o; } }); if (!f) return; e.x = f.x - Math.sign(f.x - DX() || 1) * 50; this.damage(f, e.atk * 1.5, '#ffd98a', e); }); }
      if (s['自然']) { const L = s['自然'], rt = SYN['自然'].lv[L - 1]; us.forEach(e => { const rr = (e._syn === '自然' ? rt : 0) + (L >= 3 ? 0.005 : 0); if (rr && e.hp < e.max) e.hp = Math.min(e.max, e.hp + e.max * rr * dt); });
        if (L >= 3 && t - (T.tree || 0) >= 3) { T.tree = t; us.forEach(e => { e.hp = Math.min(e.max, e.hp + e.max * 0.05); }); this.float(DX(), -260, '世界之树 +5%', '#b6f28a', 26); } }
      if (s['深海'] >= 3) { if (!T.wave) T.wave = t + 6; if (t >= T.wave) { T.wave = t + 15; const sum = us.filter(e => e._syn === '深海').reduce((a, e) => a + e.atk, 0); this.float(DX(), -300, '海啸！', '#5fb8ff', 40); this.shake = Math.max(this.shake, 14);
        this.ents.forEach(o => { if (o.alive && o.side === 'E') { this.damage(o, sum, '#5fb8ff'); o.x += Math.sign(o.x - DX() || 1) * 70; } }); } }
    }
  };
}

// ───────── a full bond (5 lines) opens the fight with its race's banner slamming down, its own sound ─────────
const RSND = { 人类: ['waveHorn'], 亡灵: ['tomb', 'soul'], 野兽: ['impact', 'charge'], 自然: ['heal', 'sparkle'], 深海: ['whoosh', 'boom'], 异界: ['glitch', 'portal'] };
const now = () => performance.now(), eo = (q) => 1 - Math.pow(1 - q, 3);
const BAN_IN = 0.32, BAN_HOLD = 2.2, BAN_OUT = 0.4;
const oBB = G.beginBattle;
G.beginBattle = function () {
  const r = oBB.apply(this, arguments), b = this.battle, tops = b && b.syn ? Object.keys(b.syn).filter(k => b.syn[k] >= 3) : [];
  this.synBan = tops.length ? { t0: now() + 1600, b, list: tops, s: {} } : null; return r;
};
const icC = {}; const bigIc = (k) => icC[k] || (icC[k] = (M.iconCanvas && M.iconCanvas(k, 6)) || null);
function banner(g, F, T) {
  const n = F.list.length; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  F.list.forEach((r, i) => {
    const s = SYN[r], c = M.RACES[r] || '#fff', W = 330, H = 430, cx = 960 + (i - (n - 1) / 2) * (W + 60);
    const qin = cl(T / BAN_IN, 0, 1), qo = cl((T - BAN_IN - BAN_HOLD) / BAN_OUT, 0, 1), bounce = qin < 1 ? 0 : Math.sin(cl((T - BAN_IN) / 0.25, 0, 1) * Math.PI) * 18;
    const y0 = -H - 40 + (H + 160) * eo(qin) + bounce - qo * (H + 200), x = cx - W / 2;
    // the pole and the cloth: the race's colour with a dark swallowtail
    g.globalAlpha = 1; g.fillStyle = '#07060f'; g.fillRect(x - 24, y0 - 20, W + 48, 22); g.fillStyle = '#caa84a'; g.fillRect(x - 20, y0 - 16, W + 40, 14);
    g.fillStyle = '#07060f'; g.beginPath(); g.moveTo(x - 6, y0); g.lineTo(x + W + 6, y0); g.lineTo(x + W + 6, y0 + H + 6); g.lineTo(cx, y0 + H - 60); g.lineTo(x - 6, y0 + H + 6); g.closePath(); g.fill();
    g.fillStyle = c; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + W, y0); g.lineTo(x + W, y0 + H - 6); g.lineTo(cx, y0 + H - 70); g.lineTo(x, y0 + H - 6); g.closePath(); g.fill();
    g.fillStyle = 'rgba(7,6,15,0.35)'; g.fillRect(x + 16, y0 + 12, W - 32, 196);
    const im = bigIc(s.ic); if (im) { g.imageSmoothingEnabled = false; g.drawImage(im, cx - 80, y0 + 30, 160, 160); }
    U.text(g, r, cx, y0 + 250, 60, '#ffffff', { outline: true }); U.text(g, s.top, cx, y0 + 318, 44, '#ffe08a', { outline: true });
    // the move in one line, under the banner once it has landed
    if (T > BAN_IN + 0.15) { const a = cl((T - BAN_IN - 0.15) / 0.25, 0, 1) * (1 - qo); g.globalAlpha = a; const tw = U.measure(g, s.topD, 22) + 40; U.box(g, cx - tw / 2, y0 + H + 22, tw, 52, P.night); U.text(g, s.topD, cx, y0 + H + 48, 22, P.cream); g.globalAlpha = 1; }
    if (qin >= 1 && T < BAN_IN + 0.3) M.glow && M.glow(g, cx, y0 + H / 2, 380, c, 0.5 * (1 - (T - BAN_IN) / 0.3));
  });
  g.restore();
}
const oTick2 = G.tick;
G.tick = function (dt) {
  const r = oTick2.apply(this, arguments), R = this.screen === 'raid' ? this.raid : null;
  // a night: the garrison's full bonds get their banner too, once
  if (R && R.syn && !R._banDone) { R._banDone = 1; const tops = Object.keys(R.syn).filter(k => R.syn[k] >= 3); if (tops.length) this.synBan = { t0: now() + 1200, b: R, list: tops, s: {} }; }
  const F = this.synBan; if (!F) return r;
  if ((this.screen === 'battle' ? this.battle : this.screen === 'raid' ? this.raid : null) !== F.b) { this.synBan = null; return r; }
  const T = (now() - F.t0) / 1000; if (T < 0) return r;
  if (T >= BAN_IN && !F.s.hit) { F.s.hit = 1; S.stamp && S.stamp(); this.fx && this.fx.kick && this.fx.kick(14); F.list.forEach((rc, i) => (RSND[rc] || []).forEach((k, j) => setTimeout(() => { try { S[k] && S[k](); } catch (e) {} }, 80 + i * 160 + j * 140)));
    const b = F.b; if (b) b.ents.forEach(e => { if (e.alive && e.side === 'A' && F.list.indexOf(e._syn) >= 0) { b.burst(e.x, e.y - 40 * (e.sz || 1), M.RACES[e._syn], 10); if (b.ring) b.ring(e.x, e.y - 30, 10, 110, M.RACES[e._syn], 6, 0.4); } }); }
  if (T > BAN_IN + BAN_HOLD + BAN_OUT) { this.synBan = null; return r; }
  const fc = this.ui && this.ui.cv && this.ui.cv('fx'); if (fc) { try { banner(fc.getContext('2d'), F, T); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('synBan: ' + e.message); this.synBan = null; } }
  return r;
};

// ───────── the help cards: 羁绊 and the six full bonds ─────────
if (M.GUIDE) M.GUIDE.push(
  { id: 'syn', cat: '羁绊', icon: 'r_human', title: '羁绊', line: '同一种族的不同部队一起上场：2、3、5 条各亮一档，5 条时再多一招。', scr: 'world', sel: '[data-g="syn"]' },
  { id: 'synHuman', cat: '羁绊', icon: 'r_human', title: '人类 · 号令', line: SYN['人类'].topD + '。', scr: 'battle', sel: '[data-g="none"]' },
  { id: 'synUndead', cat: '羁绊', icon: 'r_undead', title: '亡灵 · 亡者大军', line: SYN['亡灵'].topD + '。', scr: 'battle', sel: '[data-g="none"]' },
  { id: 'synBeast', cat: '羁绊', icon: 'r_beast', title: '野兽 · 兽王之怒', line: SYN['野兽'].topD + '。', scr: 'battle', sel: '[data-g="none"]' },
  { id: 'synNature', cat: '羁绊', icon: 'r_nature', title: '自然 · 世界之树', line: SYN['自然'].topD + '。', scr: 'battle', sel: '[data-g="none"]' },
  { id: 'synSea', cat: '羁绊', icon: 'r_sea', title: '深海 · 海啸', line: SYN['深海'].topD + '。', scr: 'battle', sel: '[data-g="none"]' },
  { id: 'synRift', cat: '羁绊', icon: 'r_rift', title: '异界 · 回响', line: SYN['异界'].topD + '。', scr: 'battle', sel: '[data-g="none"]' });
// a new area can bring a bond level within reach (more lines of a race, or a new race): said in the middle of the screen, once the
// area's story has been told — 「XXX N层羁绊已解锁」, a new race 「新种族 XXX · N层羁绊解锁」 (2026-09-28)
const maxAll = (run) => { const o = {}; M.RACE6.forEach(r => { o[r] = M.synMaxL(run, r); }); return o; };
const oArrS = G.arrive;
G.arrive = function (n) {
  const run = this.run, had = run && run.pool && run.pool.lines && run.pool.lines.length ? maxAll(run) : null, area0 = run && run.pool ? run.pool.area : null;
  const r = oArrS.apply(this, arguments);
  if (had && this.run === run && run.pool && run.pool.area !== area0) {
    const now2 = maxAll(run);
    M.RACE6.forEach(rc => { if (now2[rc] > had[rc] && SYN[rc]) (this._synNotes = this._synNotes || []).push({ r: rc, L: now2[rc], fresh: had[rc] === 0 }); });
  }
  return r;
};
const oTickS = G.tick;
G.tick = function (dt) {
  const r = oTickS.apply(this, arguments), q = this._synNotes;
  if (q && q.length && this.screen === 'world' && !this.storyFx && !(this.storyQ && this.storyQ.length) && !this.modal && !this.mini && performance.now() > (this._synNoteAt || 0)) {
    const o = q.shift(), s = SYN[o.r]; this._synNoteAt = performance.now() + 2400;
    this.banner && this.banner({ kind: 'win', text: (o.fresh ? '新种族 ' : '') + o.r + ' ' + o.L + '层羁绊' + (o.fresh ? '解锁' : '已解锁'), col: M.RACES[o.r] || '#ffcf4a', col2: '#1a1640', sub: o.L >= 3 ? s.top + '：' + s.topD : s.d[o.L - 1], life: 2.2, y: 440 });
    S.up && S.up(2); this.fx && this.fx.rays && this.fx.rays(960, 440, M.RACES[o.r] || '#ffcf4a', 1.2, { r: 360 });
  }
  if (!this.run && this._synNotes) this._synNotes = null;
  return r;
};
})();
