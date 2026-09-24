// ==== mc-game-d.js ====
(function () {
const M = window.MC, G = M.Game.prototype;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
Object.assign(G, {
  tipFn(o) { return () => { this.tipData = typeof o === 'function' ? o() : o; M.Sfx.hover(); this.bump(); }; },
  unitTip(type, star) { const U = M.UNITS[type]; return { title: U.name + (star ? ' ' + '★'.repeat(star) : ''), c: '#6fa8dc', kind: U.tags.map(t => '【' + t + '】').join('') + ' · 生命 ' + U.hp + ' · 攻击 ' + U.atk, d: U.desc }; },
  itemTip(key, q) { const I = M.ITEMS[key]; return { title: I.name, c: M.QUALITY[q || 0].c, kind: '支援道具', d: I.desc, lines: I.tiers.map((t, i) => ({ t: M.QUALITY[i].n + '：' + t, c: i >= (q || 0) ? M.QUALITY[i].c : '#5a5460' })) }; },
  relicTip(r) { const R = M.RELICS[r.key]; return { title: R.n, c: M.QUALITY[r.q].c, kind: '', d: R.d, lines: R.lines.map((l, i) => ({ t: M.QUALITY[i].n + '：' + M.statText(l.k, l.v) + (i <= r.q ? '' : '（未达到）'), c: i <= r.q ? M.QUALITY[i].c : '#5a5460' })) }; },
  relicBpTip(key, owned) { const R = M.RELICS[key]; return { title: R.n, c: owned ? '#ffe8b0' : '#8d8496', kind: owned ? '图纸 × ' + owned : '没有图纸', d: R.d, lines: R.lines.map((l, i) => ({ t: M.QUALITY[i].n + '：' + M.statText(l.k, l.v), c: M.QUALITY[i].c })) }; },
  heroTip(h) { const m = this.meta, H = M.HEROES[h.cls]; return { title: 'Lv' + h.lv + ' ' + H.n, c: M.RARITY[h.rarity].c, kind: '生命 ' + Math.round(h.hp) + '/' + M.heroMaxHp(h, m), d: '技能「' + H.skill.n + '」' + M.skillDesc(h) + '，冷却 ' + M.skillNodeCd(h, m) + ' 个节点。', lines: h.points ? [{ t: '有 ' + h.points + ' 个天赋点可用', c: '#f2c14e' }] : [] }; },
  tv(k, real) { const g = this.held[k] != null ? this.held[k] : real; this.twT[k] = g; return Math.round(this.tw[k] == null ? g : this.tw[k]); },
  ps(k) { const p = this.pulse[k]; if (!p) return 1; const t = (now() - p) / 1000; if (t > 0.7) return 1; return 1 + 0.35 * Math.exp(-t * 7) * Math.cos(t * 26); },
  view() {
    const s = this.screen, run = this.run, m = this.meta, v = {};
    const t0 = now();
    v.shx = Math.round(this.fx.sx * 10) / 10; v.shy = Math.round(this.fx.sy * 10) / 10; v.shr = Math.round(this.fx.sr * 1000) / 1000;
    v.isIntro = s === 'intro'; v.isMenu = s === 'menu'; v.isBase = s === 'base' || s === 'raid'; v.isRaid = s === 'raid'; v.isWorld = s === 'world'; v.isBattle = s === 'battle'; v.isShop = s === 'shop'; v.isEnd = s === 'end'; v.isOver = s === 'over';
    v.introWaiting = s === 'intro' && !this.intro.started; v.introPlaying = s === 'intro' && this.intro.started;
    v.menuStart = m.tutDone ? '继续' : '开始游戏'; v.menuSub = m.tutDone ? '第 ' + m.day + ' 天 · ' + m.heroes.length + ' 名领袖' : '从序章开始';
    v.coverOn = !!(this.reel || this.chest);
    const tip = this.tipData; v.tipOn = !!tip && !this.reel && !this.chest;
    if (tip) { const w = 480; v.tip = { title: tip.title, c: tip.c || '#e8dcc4', kind: tip.kind || '', d: tip.d || '', hasD: !!tip.d, hasKind: !!tip.kind, lines: (tip.lines || []).map(l => ({ t: l.t, c: l.c })), x: cl(this.mx + 28, 10, 1920 - w - 10), y: cl(this.my + 28, 10, 1080 - 60 - 90 - (tip.lines || []).length * 34 - (tip.d ? 80 : 0)) }; }
    v.toastOn = !!this.toastData; const ta = this.toastData; v.toast = ta ? { text: ta.text, c: ta.c, y: 120 + Math.round(-40 * Math.max(0, 1 - (t0 - ta.at) / 180)), op: Math.min(1, (t0 - ta.at) / 150) } : {};
    v.coachOn = !!this.coachData && !this.reel && !this.chest && !this.modal; const co = this.coachData;
    if (co) { const q = Math.min(1, (t0 - co.at) / 300); v.coach = { text: co.text, x: cl(co.x - 360, 20, 1180), y: cl(co.y - 60, 110, 940), op: q, dy: Math.round((1 - M.ease.eback(q)) * 30), ringOn: co.tx != null, rx: (co.tx || 0) - 70, ry: (co.ty || 0) - 70, rs: 1 + 0.15 * Math.sin(t0 / 160) }; }
    v.speeds = [1, 2, 3].map(n => ({ n: n + '×', on: this.speed === n, border: this.speed === n ? '#f2c14e' : '#4a3a2a', color: this.speed === n ? '#f2c14e' : '#8d8496', onClick: () => { this.speed = n; M.Sfx.click(); this.bump(); } }));
    // ── base ──
    if (v.isBase) {
      const pw = M.power(m), raidIn = M.nextRaid(m) - m.day;
      v.b = { day: m.day, raidTxt: raidIn === 0 ? '今晚袭击' : raidIn + ' 天后袭击', raidC: raidIn <= 1 ? '#ff5a4a' : '#e8dcc4', pwTxt: pw.used + ' / ' + pw.made, pwC: pw.free <= 0 ? '#ff6a5a' : '#8ff6ff', portal: Math.round(m.portal.hp) + ' / ' + M.portalMax(m),
        res: [{ k: 'msup', img: M.spriteURL('sack', 4), v: this.tv('msup', m.supplies), c: '#e8c86a', n: '物资', d: '挖掘、建造、打造、招募领袖都要用。' }, { k: 'msh', img: M.spriteURL('shard', 4), v: this.tv('msh', m.shards), c: '#d8a0ff', n: '灵魂碎片', d: '建史诗 / 传说建筑、精铸宝物用。' }, { k: 'morb', img: M.spriteURL('orb', 4), v: this.tv('morb', m.orbs), c: '#b8ff9a', n: '经验球', d: '在训练建筑里灌给领袖。' }].map(r => ({ img: r.img, v: r.v, c: r.c, fx: r.k, sc: this.ps(r.k), tipOn: this.tipFn({ title: r.n, c: r.c, d: r.d }) })),
        heroes: m.heroes.map(h => { const mx = M.heroMaxHp(h, m), R = M.RARITY[h.rarity]; return { fx: 'hero-' + h.id, n: M.HEROES[h.cls].n, img: M.spriteURL(M.HEROES[h.cls].sprite, 4), clsIc: M.iconURL('c_' + h.cls, 2), lv: h.lv, rc: R.c, hpW: Math.max(0, h.hp / mx * 100) + '%', hpC: h.hp / mx < 0.35 ? '#ff5a4a' : '#9cff7a', dot: h.points > 0, op: h.status ? 0.5 : 1, sc: this.ps('heroes'), tipOn: this.tipFn(() => this.heroTip(h)), onClick: () => { M.Sfx.click(); this.openHero(h.id); } }; }),
        heroCap: m.heroes.length + ' / ' + M.heroCap(m) };
      v.pwTip = this.tipFn({ title: '电力', c: '#8ff6ff', kind: '已用 ' + pw.used + ' / 产出 ' + pw.made, d: '电不够就建不了新的耗电房间。' });
      v.raidTip = this.tipFn({ title: '基地防守', c: '#ff6a5a', kind: '每 ' + M.RAID_EVERY + ' 天一次 · 下次在第 ' + M.nextRaid(m) + ' 天', d: '所有领袖参与防守，不会永久死亡，但损失的生命不会自动恢复。地下的武器房间会向地面开火，射程受深度限制：每往下一层，就少覆盖一格。传送门被摧毁，游戏结束。' });
      v.pnOn = !!this.panel && s === 'base';
      if (this.panel) Object.assign(v, this.panelView());
    }
    // ── world HUD ──
    if ((s === 'world' || s === 'shop') && run) {
      const h = run.hero, mx = M.heroMaxHp(h, m), H = M.HEROES[h.cls];
      v.w = { heroImg: M.spriteURL(H.sprite, 5), heroName: h.name, lv: h.lv, cls: H.n, rc: M.RARITY[h.rarity].c, hp: this.tv('hp', Math.round(h.hp)) + ' / ' + mx, hpW: Math.max(0, h.hp / mx * 100) + '%', hpC: h.hp / mx < 0.35 ? '#ff5a4a' : '#f2c14e', hpSc: this.ps('hp'),
        wallet: M.fmt(this.tv('wallet', run.wallet)), walSc: this.ps('wallet'), rsup: this.tv('rsup', run.loot.supplies), rsupSc: this.ps('rsup'), rbp: this.tv('rbp', run.loot.bp.length), rbpSc: this.ps('rbp'),
        skill: H.skill.n, skillTxt: run.skillCd > 0 ? '冷却 ' + run.skillCd + ' 节点' : '就绪', skillC: run.skillCd > 0 ? '#8d8496' : '#ffcf4a',
        pips: [...Array(M.skillNodeCd(h, m))].map((_, i) => ({ c: i < M.skillNodeCd(h, m) - run.skillCd ? '#ffcf4a' : '#2a2230' })),
        rosterN: run.roster.length, rosSc: this.ps('roster'), itSc: this.ps('items'),
        roster: run.roster.filter(u => !this.hideU.has(u.uid)).map(u => ({ img: M.spriteURL(u.type, 4), stars: '★'.repeat(u.star), tipOn: this.tipFn(this.unitTip(u.type, u.star)), sel: this.sel === u.uid, border: this.sel === u.uid ? '#f2c14e' : 'transparent', onClick: () => { if (this.screen === 'shop') { this.sel = this.sel === u.uid ? null : u.uid; M.Sfx.click(); this.bump(); } } })),
        items: run.items.map((k, i) => ({ has: !!k && !this.hideI.has(i), img: k ? M.spriteURL(M.ITEMS[k].icon, 5) : '', border: k ? M.QUALITY[run.itemQ[i] || 0].c : '#3a3040', tipOn: this.tipFn(k ? this.itemTip(k, run.itemQ[i]) : { title: '空道具栏', d: '宝箱、商店、事件都能获得支援道具。' }) })),
        region: run.region.n };
      v.skillTip = this.tipFn(() => this.heroTip(h));
      v.bpTip = this.tipFn(() => ({ title: '本局收获', c: '#e0904a', kind: '撤离或通关后带回基地', d: run.loot.bp.length ? '' : '还没有找到图纸。', lines: run.loot.bp.map(k => { const I = M.itemInfo(k); return { t: I.n, c: I.c }; }) }));
    }
    // ── battle ──
    if (s === 'battle' && this.battle) {
      const b = this.battle, cfg = this.cfg, h = run.hero, H = M.HEROES[h.cls], score = b.score, ok = cfg.target ? score >= cfg.target : true, remain = Math.max(0, Math.ceil(cfg.dur + 1.6 - b.t));
      const modeN = { normal: '普通战', score: '积分战', hold: '坚守战', holdScore: '坚守积分战' }[cfg.mode] + (cfg.type === 'elite' ? ' · 精英' : cfg.type === 'boss' ? ' · 首领' : cfg.type === 'extract' ? ' · 撤离' : '');
      const goal = cfg.mode === 'normal' ? '全灭敌人' : cfg.mode === 'score' ? '目标 ' + M.fmt(cfg.target) + ' · 不够扣领袖血' : cfg.mode === 'hold' ? '坚守 ' + remain + ' 秒' : '坚守 ' + remain + ' 秒 · 目标 ' + M.fmt(cfg.target);
      const alive = b.ents.filter(e => e.alive && e.side === 'A' && !e.isHero).length, left = b.ents.filter(e => e.alive && e.side === 'E').length + (cfg.mode === 'normal' || cfg.mode === 'score' ? cfg.list.length - b.spawnI : 0);
      if (this.lastBase != null && b.base > this.lastBase && t0 - (this.pulse.bscore || 0) > 140) this.pulse.bscore = t0; this.lastBase = b.base; const multR = Math.round(b.mult * 100) / 100; if (this.lastMult != null && multR > this.lastMult) this.pulse.mult = t0; this.lastMult = multR;
      const ready = b.canCast(), cd = run.skillCd;
      v.h = { mode: modeN, modeColor: cfg.type === 'boss' || cfg.type === 'elite' ? '#ff6a5a' : cfg.type === 'extract' ? '#5fd0c0' : '#f2c14e', goal, base: M.fmt(this.tv('bbase', b.base)), mult: multR.toFixed(2), multSc: this.ps('mult'), scoreSc: this.ps('bscore'), score: M.fmt(this.tv('bscore', score)),
        scoreLabel: cfg.target ? (ok ? '积分 · 已达标' : '积分') : '积分', scoreColor: ok ? '#9cff7a' : '#f2c14e', bar: cfg.target ? Math.min(100, score / cfg.target * 100) + '%' : '100%', barC: ok ? '#9cff7a' : '#f2c14e',
        heroName: h.name, heroState: b.hero.bench ? '场外指挥' : b.hero.alive ? '亲自上场！' : '倒下', hp: Math.max(0, Math.round(b.hero.hp)) + ' / ' + Math.round(b.hero.maxHp), hpW: Math.max(0, b.hero.hp / b.hero.maxHp * 100) + '%', alive, left,
        items: run.items.map((k, i) => ({ has: !!k, img: k ? M.spriteURL(M.ITEMS[k].icon, 7) : '', border: k ? M.QUALITY[run.itemQ[i] || 0].c : '#3a3040', bg: k ? '#2a1e14' : '#141018', onClick: () => this.useSlot(i), tipOn: this.tipFn(k ? this.itemTip(k, run.itemQ[i]) : { title: '空道具栏' }) })),
        skillName: H.skill.n, skillSub: ready ? M.skillDesc(h) : b.skillUsed ? '本场已使用 · 冷却 ' + cd + ' 节点' : cd > 0 ? '冷却中：还要 ' + cd + ' 个节点' : '准备中……', skillBorder: ready ? '#ffcf4a' : '#3a3040', skillBg: ready ? 'linear-gradient(180deg,#4a3418,#2a1c0e)' : 'linear-gradient(180deg,#1a1520,#100c14)', skillColor: ready ? '#ffe08a' : '#6b6570', skillGlow: ready ? '0 0 ' + Math.round(20 + 14 * Math.sin(t0 / 150)) + 'px rgba(255,200,80,0.7)' : 'none', skillImg: M.spriteURL(H.sprite, 4) };
      // leader on the field: the skill panel folds down and stays folded for the rest of the battle
      const fold = !b.hero.bench; if (fold && !b.foldAt) b.foldAt = t0; const fe = fold ? M.ease.eo(cl((t0 - b.foldAt) / 450, 0, 1)) : 0;
      Object.assign(v.h, { skTop: Math.round(26 + 78 * fe), skH: Math.round(128 - 78 * fe), skOp: (1 - fe).toFixed(3), skOpenOn: fe < 0.5, skFoldOn: fold, skFoldOp: fe.toFixed(3) });
      if (fold) Object.assign(v.h, { skillBorder: '#3a3040', skillBg: 'linear-gradient(180deg,#141018,#0c090f)', skillGlow: 'none', skillColor: '#6b6570' });
      v.skillTip = this.tipFn(() => this.heroTip(h));
      const sy = M.synergies(run.roster); v.syn = Object.keys(M.TAGS).filter(t => sy.cnt[t] > 0).map(t => { const T = M.TAGS[t], l = sy.lvl[t]; return { label: l > 0 ? t + ' ' + sy.cnt[t] + ' · ' + T.desc[l - 1] : t + ' ' + sy.cnt[t] + '/' + T.th[0], color: l > 0 ? T.color : '#8d8496' }; });
      v.pausedOn = this.paused; v.pauseText = this.paused ? '继续' : '暂停';
      v.settleOn = !!this.settle && this.settle.t > 1.2;
      if (this.settle) { const st = this.settle, q = cl((st.t - 1.2) / 0.35, 0, 1), cq = cl((st.t - 1.4) / 0.8, 0, 1);
        v.st = { title: st.title, color: st.col, dy: Math.round((1 - M.ease.eback(q)) * 200), op: q, base: M.fmt(st.base), mult: (Math.round(st.mult * 100) / 100).toFixed(2), score: M.fmt(st.score * M.ease.eo(cq)), hasTarget: !!st.target, target: M.fmt(st.target), targetColor: st.pass ? '#9cff7a' : '#ff6a5a',
          lines: st.lines.slice(0, st.shown).map((l, i) => ({ t: l.t, c: l.c, hasIcon: !!l.icon, icon: l.icon ? M.spriteURL(l.icon, 4) : '', sc: i === st.shown - 1 ? 1 + 0.25 * Math.exp(-(st.t - 1.7 - i * 0.28) * 10) : 1 })),
          btnOn: st.t >= 1.8, btn: st.shown < st.lines.length ? '跳过' : st.final === 'fail' ? '结束' : st.final ? '带着收获回家' : '继续前进' }; }
    }
    // ── shop ──
    if (s === 'shop' && run && !run.shop.units) {
      const ra = this.shopAt ? cl((t0 - this.shopAt) / 400, 0, 1) : 1;
      v.s = { wallet: v.w.wallet, walSc: v.w.walSc, legion: Object.keys(run.legion).map(k => M.LEGION[k].name).join('、') || '无', field: run.field ? M.FIELDS[run.field].name : '无', legSc: this.ps('legion'),
        cards: run.shop.map((c, i) => { const info = M.cardInfo(c); let ok = run.wallet >= c.cost && !c.sold; if (c.kind === 'unit' && !M.canAdd(run, c.type)) ok = false; if (c.kind === 'item' && run.items.indexOf(null) < 0) ok = false; const merge = c.kind === 'unit' && M.wouldMerge(run, c.type); const sq = c.soldAt ? cl((t0 - c.soldAt) / 250, 0, 1) : 1; const dq = cl(ra * 1.6 - i * 0.12, 0, 1);
          return { fx: 'card' + i, cat: info.cat, cc: info.cc, img: M.spriteURL(info.icon, c.kind === 'unit' ? 9 : 11), name: info.name, desc: info.desc, tags: c.kind === 'unit' ? info.tags.map(t => '【' + t + '】').join('') + (merge ? ' · 买下即升星！' : '') : '', tagColor: merge ? '#ffcc33' : '#8d8496', border: c.locked ? '#f2c14e' : merge ? '#ffcc33' : '#4a3a2a', sold: c.sold, stampSc: 1 + 1.5 * (1 - M.ease.eo(sq)), dy: Math.round((1 - M.ease.eback(dq)) * 120), op: dq,
            buyText: '购买 · ' + M.fmt(c.cost), buyBg: ok ? 'linear-gradient(180deg,#ffe08a,#d4982e)' : '#2a2230', buyColor: ok ? '#1a0e08' : '#6b6570', lockText: c.locked ? '已锁' : '锁定', lockColor: c.locked ? '#f2c14e' : '#6b6570', shake: this.pulse['card' + i] && t0 - this.pulse['card' + i] < 300 ? Math.round(Math.sin(t0 / 20) * 8) : 0,
            onBuy: () => this.buy(i), onLock: () => this.lock(i), tipOn: this.tipFn(c.kind === 'unit' ? this.unitTip(c.type) : c.kind === 'item' ? this.itemTip(c.key, 0) : { title: info.name, c: info.cc, kind: info.cat, d: info.desc }) }; }) };
      const u = run.roster.find(x => x.uid === this.sel), rc = M.nice(M.refreshCost(run) * M.priceMul(run));
      v.s.selOn = !!u; v.s.sell = u ? '卖出 ' + M.DB[u.type].n + ' +' + M.fmt(M.sellValue(run, u)) : ''; v.s.refreshText = '刷新 · ' + M.fmt(rc); v.s.refreshBorder = run.wallet >= rc ? '#e8dcc4' : '#3a3040';
      const sy = M.synergies(run.roster); v.syn = Object.keys(M.TAGS).filter(t => sy.cnt[t] > 0).map(t => { const T = M.TAGS[t], l = sy.lvl[t]; return { label: l > 0 ? t + ' ' + sy.cnt[t] + ' · ' + T.desc[l - 1] : t + ' ' + sy.cnt[t] + '/' + T.th[0], color: l > 0 ? T.color : '#8d8496' }; });
    }
    if (s === 'end' && this.endInfo) { const e = this.endInfo, q = cl((t0 - e.at) / 500, 0, 1); v.end = Object.assign({}, e, { sc: 0.6 + 0.4 * M.ease.eback(q), op: q, tiles: e.tiles.map((t, i) => { const tq = cl((t0 - e.at - 500 - i * 150) / 300, 0, 1); return Object.assign({}, t, { op: tq, sc: 0.3 + 0.7 * M.ease.eback(tq) }); }) }); }
    // ── modal ──
    v.modalOn = !!this.modal && !this.reel;
    if (this.modal) { const md = this.modal, q = cl((t0 - (md.at || 0)) / 260, 0, 1);
      // 奇遇有像素插画时用「立绘 + 对话框」版式（设计稿 1d），否则是居中的机箱面板
      const art = md.img && M.PJ && M.PJ.EVART ? M.PJ.EVART[md.img] : null;
      v.md = { title: md.title, titleColor: md.titleColor || '#ffe8b0', text: md.text || '', hasImg: !!art, noImg: !art, art: art ? art + '#x0.2p' : '', hasIcon: !!md.img && !art, img: md.img ? M.spriteURL(md.img, 14) : '', border: md.border || '#8a6a3a', sc: 0.85 + 0.15 * M.ease.eback(q), op: q, glow: md.titleColor || '#ffcc66',
        choices: (md.choices || []).map(c => ({ t: c.t, sub: c.sub || '', hasSub: !!c.sub, ring: c.dis ? '#2b2461' : c.gold ? '#ffcf4a' : c.danger ? '#e8434f' : '#3d3a8c', op: c.dis ? 0.45 : 1, color: c.dis ? '#6a6394' : c.gold ? '#fff3b0' : c.danger ? '#ff9aa8' : '#f4efe0', onClick: () => { if (c.dis) { this.toast('条件不足', '#8d8496'); return; } M.Sfx.click(); c.fn(); this.bump(); } })) }; }
    return v;
  },
});
})();

;
