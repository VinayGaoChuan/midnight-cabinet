// ==== mc-game-e.js ====
(function () {
const M = window.MC, G = M.Game.prototype;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const stars = (n) => '◆'.repeat(Math.max(1, Math.min(6, Math.round(n)))) + '◇'.repeat(Math.max(0, 6 - Math.round(n)));
Object.assign(G, {
  panelView() {
    const p = this.panel, m = this.meta, q = cl((now() - p.at) / 280, 0, 1);
    const pn = { dx: Math.round((1 - M.ease.eback(q)) * 90), op: q, isRoom: false, isBuild: false, isDig: false, isJob: false, isLoadout: false, isHero: false, title: '', sub: '', titleColor: '#ffe8b0' };
    const v = { pn };
    if (p.kind === 'room') {
      const B = M.BUILDINGS[p.key], x = M.cell(m, p.c, p.r), pw = M.roomPw(m, p.c, p.r, p.key);
      Object.assign(pn, { isRoom: true, title: B.n, titleColor: B.q ? M.QUALITY[B.q].c : '#ffe8b0', sub: (B.q ? '奇观 · ' : '') + M.QUALITY[B.q].n + ' · ' + M.STYLE[B.style] + ' · ' + M.CAT[B.cat], d: B.d, thumb: M.roomThumb(p.key),
        chips: [{ t: pw >= 0 ? '电力 +' + pw : '耗电 ' + (-pw), c: pw >= 0 ? '#9cff7a' : '#ff9a6a' }].concat(x.tile ? [{ t: '地格 · ' + M.TILES[x.tile].n, c: M.TILES[x.tile].c }] : []).concat(B.weapon ? [{ t: '射程 ' + M.weaponStats(m, p.c, p.r).range + ' · 伤害 ' + Math.round(M.weaponStats(m, p.c, p.r).dmg), c: '#ff8a8a' }] : []),
        tileTxt: x.tile ? M.TILES[x.tile].n + '：' + M.TILES[x.tile].d : '', hasTile: !!x.tile,
        isCore: p.key === 'core', isForge: !!B.forge, isRecruit: !!B.recruit, isTrain: !!B.train, isMed: B.cat === 'med', isWeapon: !!B.weapon });
      if (pn.isCore || pn.isForge || pn.isRecruit) pn.d = '';
      pn.hasD = !!pn.d;
      if (B.weapon) { const rc = M.weaponReach(m, p.c, p.r); pn.reachTxt = rc ? '覆盖地面第 ' + (rc.c0 + 1) + '–' + (rc.c1 + 1) + ' 列。' : '太深了，打不到地面。'; }
      if (pn.isCore) pn.inv = M.invList(m).map(it => ({ img: M.spriteURL(it.icon, 5), count: it.count > 1 || it.key === 'supplies' || it.key === 'shards' || it.key === 'orbs' ? M.fmt(it.count) : '', border: it.q != null ? M.QUALITY[it.q].c : it.c, tipOn: this.tipFn(it.rid ? this.relicTip(m.relics.find(r => r.id === it.rid)) : { title: it.n, c: it.c, kind: it.kind + (it.sub ? ' · ' + it.sub : ''), d: it.d }) }));
      if (pn.isCore) pn.invN = pn.inv.length + ' 种';
      if (pn.isForge) { const cost = this.craftCost(); pn.forgeCost = '打造：' + cost + ' 物资 + 1 张图纸' + (B.forge.qUp ? '，品质 +' + B.forge.qUp : '') + (B.forge.twice ? '，' + Math.round(B.forge.twice * 100) + '% 双倍' : '');
        pn.forge = Object.keys(M.RELICS).map(k => ({ k, own: m.inv['rbp:' + k] || 0 })).filter(o => o.own).map(({ k, own }) => { const R = M.RELICS[k], can = own && m.supplies >= cost; return { img: M.spriteURL(R.icon, 5), n: R.n, sub: own ? '图纸 × ' + own : '没有图纸', op: own ? 1 : 0.35, border: can ? '#c8a060' : '#2a2230', color: can ? '#ffe8b0' : '#8d8496', onClick: () => { M.Sfx.click(); this.craft(k, p.c, p.r); }, tipOn: this.tipFn(this.relicBpTip(k, own)) }; }); }
      if (pn.isRecruit) { pn.recBtn = '招魂 · 100 碎片'; pn.recOk = m.shards >= 100 && m.heroes.length < M.heroCap(m); }
      const heroRow = (h, extra) => { const mx = M.heroMaxHp(h, m); return Object.assign({ fx: 'hero-' + h.id, img: M.spriteURL(M.HEROES[h.cls].sprite, 4), n: h.name + ' · Lv ' + h.lv, c: M.RARITY[h.rarity].c, hpW: Math.max(0, h.hp / mx * 100) + '%', hpC: h.hp / mx < 0.35 ? '#ff5a4a' : '#9cff7a', hp: Math.round(h.hp) + ' / ' + mx, expW: Math.min(100, h.exp / M.expNeed(h.lv) * 100) + '%', tipOn: this.tipFn(() => this.heroTip(h)) }, extra); };
      if (pn.isTrain) { const mul = 1 + (M.baseMods(m).orbMul || 0); pn.trainTxt = '经验球 ' + m.orbs; pn.heroes = m.heroes.map(h => heroRow(h, { btn: '灌注', btnOn: m.orbs > 0, onClick: () => { M.Sfx.click(); this.train(h.id, p.c, p.r); } })); }
      if (pn.isMed) { const rate = M.hospitalRate(m); pn.medTxt = '急救：40 物资，立刻回复 30% 生命。'; pn.heroes = m.heroes.map(h => heroRow(h, { btn: '急救', btnOn: h.hp < M.heroMaxHp(h, m), onClick: () => { M.Sfx.click(); this.quickHeal(h.id); } })); }
    }
    if (p.kind === 'build') {
      const x = M.cell(m, p.c, p.r), opts = M.buildOptions(m, p.c, p.r), pw = M.power(m);
      Object.assign(pn, { isBuild: true, title: '空房间', sub: '⚡ 剩余 ' + pw.free, hasTile: !!x.tile, tileTxt: x.tile ? M.TILES[x.tile].n + '：' + M.TILES[x.tile].d : '', empty: !opts.length,
        opts: opts.map(o => { const tb = Object.keys(o.tile).length; return { thumb: M.roomThumb(o.key), n: o.B.n + (o.count > 1 ? ' ×' + o.count : ''), c: o.B.q ? M.QUALITY[o.B.q].c : '#ffe8b0', meta: o.cost + ' 物资 · ' + o.days + ' 天 · ' + (o.pw >= 0 ? '电力 +' + o.pw : '耗电 ' + (-o.pw)), why: o.why, hasWhy: !!o.why, bonus: tb ? '★ 地格加成' : '', op: o.why ? 0.5 : 1, border: o.why ? '#2a2230' : o.B.q ? M.QUALITY[o.B.q].c : '#8a6a3a', onClick: () => { M.Sfx.click(); this.doBuild(p.c, p.r, o.key); }, tipOn: this.tipFn(() => { const t = this.bldTip(o.key, p.c, p.r); return t; }) }; }) });
    }
    if (p.kind === 'dig') { const x = M.cell(m, p.c, p.r), cost = M.digCost(m); Object.assign(pn, { isDig: true, title: '岩层', sub: '', hasTile: !!x.tile, tileTxt: x.tile ? '特殊地格「' + M.TILES[x.tile].n + '」：' + M.TILES[x.tile].d : '', tileC: x.tile ? M.TILES[x.tile].c : '#8d8496', digBtn: '挖掘 · ' + cost + ' 物资 · ' + (M.digDays ? M.digDays(m, p.c, p.r) : 1) + ' 天', digOk: m.supplies >= cost }); }
    if (p.kind === 'job') { const x = M.cell(m, p.c, p.r), j = x.job; if (!j) { this.panel = null; return v; } Object.assign(pn, { isJob: true, title: j.kind === 'dig' ? '挖掘中' : M.BUILDINGS[j.key].n, sub: '还需 ' + j.days + ' 天', jobW: Math.round((1 - j.days / j.total) * 100) + '%' }); }
    if (p.kind === 'loadout') {
      const W = M.WORLDS[p.world], h = m.heroes.find(x => x.id === p.hero), slots = M.relicSlots(h, m);
      Object.assign(pn, { isLoadout: true, title: W.n, titleColor: W.light, sub: '', slotTxt: p.relics.length + ' / ' + slots,
        heroes: m.heroes.map(x => { const mx = M.heroMaxHp(x, m), ok = !x.status && x.hp > 0; return { img: M.spriteURL(M.HEROES[x.cls].sprite, 5), n: M.HEROES[x.cls].n, sub: 'Lv ' + x.lv, c: M.RARITY[x.rarity].c, border: x.id === p.hero ? '#f2c14e' : '#3a3040', bg: x.id === p.hero ? 'linear-gradient(180deg,#3a2c18,#1a140c)' : '#15111a', op: ok ? 1 : 0.4, hpW: Math.max(0, x.hp / mx * 100) + '%', hpC: x.hp / mx < 0.35 ? '#ff5a4a' : '#9cff7a', onClick: () => this.pickHero(x.id), tipOn: this.tipFn(() => this.heroTip(x)) }; }),
        relics: m.relics.map(r => { const on = p.relics.includes(r.id); return { img: M.spriteURL(M.RELICS[r.key].icon, 5), border: on ? '#f2c14e' : M.QUALITY[r.q].c, bg: on ? '#3a2c18' : '#15111a', mark: on ? '✓' : '', sc: on ? 1.08 : 1, onClick: () => this.toggleRelic(r.id), tipOn: this.tipFn(this.relicTip(r)) }; }), noRelic: !m.relics.length,
        goTxt: '穿过传送门' });
    }
    if (p.kind === 'hero') {
      const h = m.heroes.find(x => x.id === p.id); if (!h) { this.panel = null; return v; }
      const H = M.HEROES[h.cls], R = M.RARITY[h.rarity], mx = M.heroMaxHp(h, m);
      Object.assign(pn, { isHero: true, title: H.n, titleColor: R.c, sub: R.n + ' · Lv ' + h.lv + ' · 经验 ' + h.exp + '/' + M.expNeed(h.lv) + ' · 天赋点 ' + h.points, img: M.spriteURL(H.sprite, 10),
        stats: [{ k: '生命', v: Math.round(h.hp) + ' / ' + mx }, { k: '攻击', v: Math.round(M.heroAtk(h, m)) }, { k: '宝物格', v: M.relicSlots(h, m) }, { k: '出征', v: h.runs + ' 次' }],
        skill: '「' + H.skill.n + '」' + M.skillDesc(h), skillCd: '冷却 ' + M.skillNodeCd(h, m) + ' 个节点 · 每场战斗最多 1 次 · 效果随等级提升',
        tree: Object.keys(h.tree).map(b => ({ n: M.BRANCH[b].n, c: M.BRANCH[b].c, prog: h.taken[b] + '/' + h.tree[b].length, nodes: h.tree[b].map((t, i) => { const taken = i < h.taken[b], next = i === h.taken[b] && h.points > 0; return { fx: 'tal-' + b + '-' + i, n: t.n + (t.big ? ' ×2' : ''), d: t.d, border: taken ? M.BRANCH[b].c : next ? '#e8dcc4' : '#2a2230', bg: taken ? '#231a2a' : 'transparent', color: taken ? M.BRANCH[b].c : next ? '#e8dcc4' : '#6b6570', cursor: next ? 'pointer' : 'default', glow: next ? '0 0 16px rgba(255,230,160,0.5)' : 'none', onClick: () => { if (next) this.takeTalent(h.id, b); } }; }) })) });
    }
    return v;
  },
});
})();

;
