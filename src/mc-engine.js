// ==== mc-engine.js ====
(function(){
const {C,SP,spriteDims,spriteCanvas,spriteURL,TAGS,UNITS,BASE_UNITS,SUMMONS,ENEMIES,BOSS_AT,MAX_WAVE,LEGION,FIELDS,TIERS,ITEMS,WHEEL,PERKS,nice,fmt,pick,wpick,hpS,atkS,baseS,defaultMeta,loadMeta,saveMeta,perk,GACHA_COST,gachaPool,gachaPull,GRID,cellXY,unitCap,wouldMerge,canAdd,addUnit,newRun,synergies,makeWave,refreshCost,sellValue,rollShop,cardInfo,rollTier}=window.MC;



const FW = 1920, FH = 720;
// 画布文字一律走 M.UI（mc-pj-ui.js）：像素字 / Silkscreen、墨影、调色板色（docs/design.md §11.5）
const PP = (window.MC.PJ && window.MC.PJ.PAL) || {}, XU = window.MC.UI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ───────── audio ─────────
// M.Sfx：这里只放一个空壳，音效的实现在 mc-audio.js（加载顺序在 mc-fx.js 之后）
const Sfx = { muted: false, lim() { return true; } };

// ───────── battle ─────────
class Battle {
  constructor(run) {
    this.run = run; this.meta = run.meta; this.w = run.wave; this.comp = run.comp;
    this.t = 0; this.ents = []; this.proj = []; this.fx = []; this.pending = [];
    this.shake = 0; this.flash = 0; this.flashCol = '#fff8d8';
    this.syn = synergies(run.roster).lvl;
    this.base = 0;
    this.mult = 1 + run.startMult + 0.1 * perk(this.meta, 'redstring') + (run.legion.fullhouse ? 0.3 : 0);
    this.spawnI = 0; this.over = null; this.overT = 0; this.deadUids = []; this.lastScore = -9; this.chime = 0; this.nid = 1; this.events = [];
    run.roster.forEach(u => this.addAlly(u));
    this.ents.filter(e => e.kind === 'rat').forEach(e => { for (let i = 0; i < [2, 3, 5][e.star - 1]; i++) this.summon('rat', e.x + 20, e.y + (i - 1) * 40); });
    if (this.syn['灵'] >= 2) { for (let i = 0; i < 2; i++) this.summon('wraith', 700, 200 + i * 320); }
  }
  get score() { return Math.round(this.base * this.mult); }
  addAlly(u) {
    const U = UNITS[u.type], sm = [1, 1.8, 3.2][u.star - 1], L = this.run.legion, S = this.syn;
    const iron = U.tags.includes('铁'), beast = U.tags.includes('兽');
    let hpM = 1 + (L.bone ? 0.3 : 0) + (iron && S['铁'] >= 1 ? 0.4 : 0) - (this.run.field === 'kerosene' ? 0.15 : 0);
    let atkM = 1 + (iron && L.steel ? 0.4 : 0);
    let asM = 1 + (L.haste ? 0.2 : 0) + (beast && S['兽'] >= 1 ? 0.3 : 0) + (beast && L.rabies ? 0.3 : 0);
    const p = cellXY(u.cell[0], u.cell[1]);
    const e = this.mk({ side:'A', kind:u.type, sprite:u.type, s:6, x:p.x, y:p.y, hp:U.hp * sm * hpM, atk:(U.atk + u.bonusAtk) * sm * atkM, cd:U.cd / asM, range:U.range, spd:U.spd, ranged:U.ranged, tags:U.tags, star:u.star, uid:u.uid, taunt:u.type === 'grave', unit:u });
    return e;
  }
  mk(o) { const e = Object.assign({ id:this.nid++, alive:true, t:Math.random() * 0.5, flash:0, stun:0, charm:0, shield:0, burn:null, kills:0, hitN:0, tags:[], star:1, timer2:0 }, o); e.maxHp = e.hp; this.ents.push(e); return e; }
  summon(k, x, y) {
    const S = SUMMONS[k], m = (this.syn['灵'] >= 1 ? 1.5 : 1);
    const e = this.mk({ side:'A', kind:k, sprite:S.sprite, s:S.s, x:clamp(x, 40, 1880), y:clamp(y, 60, 690), hp:S.hp * m * hpS(this.w) * 0.6, atk:S.atk * m * atkS(this.w), cd:S.cd, range:S.range, spd:S.spd, ranged:S.ranged, fire:S.fire, summon:true });
    this.ring(e.x, e.y - 20, 10, 70, '#b86bff', 6, 0.4);
    return e;
  }
  spawnEnemy(d) {
    const E = ENEMIES[d.type], w = this.w;
    const hpm = hpS(w) * (this.syn['诅咒'] >= 1 ? 0.85 : 1);
    this.mk({ side:'E', kind:d.type, sprite:E.sprite, s:E.s, x:1980 + Math.random() * 60, y:d.y, hp:E.hp * hpm, atk:E.atk * atkS(w), cd:E.cd, range:E.range, spd:E.spd * (this.run.field === 'wet' ? 0.7 : 1), ranged:E.ranged, base:E.base * baseS(w), mult:E.mult || 0, elite:E.elite, boss:E.boss });
  }
  foes(e) { return this.ents.filter(o => o.alive && o !== e && (e.charm > 0 ? o.side === 'E' && o.charm <= 0 : o.side !== e.side && o.charm <= 0)); }
  pickTarget(e) {
    let list = this.foes(e); if (!list.length) return null;
    if (e.side === 'E' && e.charm <= 0) { const tn = list.filter(o => o.taunt && Math.hypot(o.x - e.x, o.y - e.y) < 650); if (tn.length) list = tn; }
    if (e.kind === 'hound') { const vis = list.filter(o => o.x < 1900); if (vis.length) return vis.reduce((a, b) => (b.hp < a.hp ? b : a)); }
    let best = null, bd = 1e9;
    list.forEach(o => { const d = Math.hypot(o.x - e.x, (o.y - e.y) * 1.3); if (d < bd) { bd = d; best = o; } });
    return best;
  }
  step(dt) {
    if (dt <= 0) return;
    this.t += dt; const T = this.t;
    while (this.spawnI < this.comp.list.length && this.comp.list[this.spawnI].spawn <= T) this.spawnEnemy(this.comp.list[this.spawnI++]);
    if (this.run.field === 'chime') { this.chime += dt; if (this.chime >= 8) { this.chime -= 8; this.addMult(0.2, 960, 120, '钟声'); } }
    for (let i = this.pending.length - 1; i >= 0; i--) if (this.pending[i].t <= T) { const p = this.pending.splice(i, 1)[0]; p.fn(); }
    for (const e of this.ents) {
      if (!e.alive) continue;
      e.flash = Math.max(0, e.flash - dt);
      if (e.burn) { e.burn.t -= dt; if (e.burn.t <= 0) e.burn = null; else { e.hp -= e.burn.dps * dt; if (e.hp <= 0) { this.kill(e, e.burn.src, false); continue; } } }
      if (e.stun > 0) { e.stun -= dt; continue; }
      if (e.charm > 0) e.charm -= dt;
      if (e.kind === 'priest') { e.timer2 += dt; if (e.timer2 >= 3) { e.timer2 = 0; const al = this.ents.filter(o => o.alive && o.side === 'A' && o.hp < o.maxHp); if (al.length) { const o = al.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a)); this.healE(o, o.maxHp * 0.25 * e.star); } } }
      if (e.kind === 'furnace') { e.timer2 += dt; if (e.timer2 >= 1) { e.timer2 = 0; this.ents.forEach(o => { if (o.alive && o.side === 'E' && Math.hypot(o.x - e.x, o.y - e.y) < 170) this.ignite(o, e.atk * 0.5, e); }); this.ring(e.x, e.y - 30, 20, 170, '#ff6a2a', 4, 0.4); } }
      if (!e.target || !e.target.alive || Math.random() < 0.02) e.target = this.pickTarget(e);
      const tg = e.target; if (!tg) continue;
      const dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy);
      if (d > e.range) { const v = e.spd * dt / d; e.x += dx * v; e.y += dy * v * 0.9; e.walk = (e.walk || 0) + dt; }
      else { e.t -= dt; if (e.t <= 0) { e.t = e.cd; this.attack(e, tg); } }
    }
    // separation
    const al = this.ents.filter(e => e.alive);
    for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) {
      const a = al[i], b = al[j]; if (a.side !== b.side) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d < 50) { const push = (50 - d) * 0.5 / d; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; }
    }
    al.forEach(e => { e.y = clamp(e.y, 50, 700); e.x = Math.min(e.x, 2050); });
    for (let i = this.proj.length - 1; i >= 0; i--) {
      const p = this.proj[i];
      if (!p.tgt.alive) { this.proj.splice(i, 1); continue; }
      const tx = p.tgt.x, ty = p.tgt.y - 30, dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), v = 950 * dt;
      p.trail.unshift([p.x, p.y]); if (p.trail.length > 4) p.trail.pop();
      if (d <= v + 8) { this.proj.splice(i, 1); this.hit(p.src, p.tgt, p.dmg, p.crit); }
      else { p.x += dx / d * v; p.y += dy / d * v; }
    }
    this.shake = Math.max(0, this.shake - dt * 60); this.flash = Math.max(0, this.flash - dt * 3);
    this.fx = this.fx.filter(f => T - f.t0 < f.life);
    if (!this.over) {
      const left = this.ents.filter(e => e.alive && e.side === 'E').length + (this.comp.list.length - this.spawnI);
      const allies = this.ents.filter(e => e.alive && e.side === 'A').length;
      if (left === 0) this.end('clear'); else if (allies === 0) this.end('wipe'); else if (T >= 90) this.end('time');
    } else this.overT += dt;
  }
  end(r) { this.over = r; this.overT = 0; }
  attack(e, tg) {
    let d = e.atk, crit = false;
    if (e.side === 'A') {
      if (e.kind === 'dice' && Math.random() < 1 / 6) { d *= 6; crit = true; }
      if (e.kind === 'clock') { e.hitN++; if (e.hitN % 3 === 0) { d *= 4; crit = true; } }
      if (!crit && this.syn['赌'] >= 1 && Math.random() < 0.1) { d *= 2; crit = true; }
    }
    e.lunge = this.t;
    if (e.ranged) {
      const col = e.side === 'E' ? (e.kind === 'dealer' ? '#ffcc33' : '#b0d040') : (e.kind === 'wick' || e.fire || e.kind === 'lantern') ? '#ff9a3c' : e.kind === 'mirror' ? '#cfe0ff' : e.kind === 'doll' ? '#8fc8ff' : e.kind === 'priest' ? '#fff2a0' : '#eeeeee';
      this.proj.push({ x:e.x + (e.side === 'A' ? 24 : -24), y:e.y - 36, tgt:tg, dmg:d, crit, src:e, col, size:crit ? 20 : 14, trail:[] });
      if (e.side === 'A') Sfx.shoot();
    } else {
      this.fx.push({ k:'slash', x:tg.x, y:tg.y - 30, t0:this.t, life:0.14, big:crit });
      this.hit(e, tg, d, crit);
    }
  }
  hit(src, tg, d, crit) {
    if (!tg.alive) return;
    if (tg.side === 'A' && tg.tags.includes('铁') && this.syn['铁'] >= 2) d *= 0.6;
    if (tg.shield > 0) { const a = Math.min(tg.shield, d); tg.shield -= a; d -= a; }
    tg.hp -= d; tg.flash = 0.08; tg.kb = this.t;
    if (crit) { this.float(tg.x, tg.y - 90, '暴击 ' + fmt(d), '#ff5a4a', 34, true); Sfx.crit(); this.shake = Math.max(this.shake, 6); } else Sfx.hit();
    if (src && src.side === 'A' && (src.kind === 'wick' || src.fire)) this.ignite(tg, src.atk * 0.6, src);
    if (tg.hp <= 0) this.kill(tg, src, crit);
  }
  ignite(tg, dps, src) {
    if (!tg.alive || tg.side === 'A') return;
    const m = (this.syn['火'] >= 1 ? 2 : 1) * (this.run.legion.oil ? 1.5 : 1) * (this.run.field === 'kerosene' ? 2 : this.run.field === 'wet' ? 0.5 : 1);
    tg.burn = { dps: dps * m, t: 3, src };
  }
  healE(o, amt) { o.hp = Math.min(o.maxHp, o.hp + amt); for (let i = 0; i < 4; i++) this.fx.push({ k:'plus', x:o.x - 20 + i * 14, y:o.y - 40, t0:this.t + i * 0.05, life:0.8 }); }
  addMult(m, x, y, label) { m = Math.round(m * 100) / 100; this.mult += m; this.float(x, y, (label ? label + ' ' : '') + '积分倍率 +' + m, C.gold, 40); Sfx.mult(); this.lastScore = this.t; }
  kill(e, src, crit) {
    if (!e.alive) return;
    e.alive = false; e.deadT = this.t;
    const h = spriteDims(e.sprite).h * e.s;
    this.burst(e.x, e.y - h / 2, e.side === 'E' ? '#6a1f2b' : '#8fc8ff', 10);
    if (e.side === 'E') {
      let base = e.base * (this.run.legion.greed ? 1.25 : 1);
      if (src && src.kind === 'butcher') base *= 2;
      this.base += base; this.lastScore = this.t;
      this.float(e.x, e.y - h - 10, '+' + fmt(base), C.bone, 26, true);
      let m = e.mult || 0;
      if (m && this.run.legion.bloodpact) m *= 1.5;
      if (src && src.kind === 'mirror' && (e.elite || e.boss)) m += src.star;
      if (crit && this.syn['赌'] >= 2) m += 0.05;
      if (m) this.addMult(m, e.x, e.y - h - 50);
      if (e.boss) { this.shake = 30; this.flash = 0.6; this.flashCol = '#ffffff'; }
      if (e.burn && this.syn['火'] >= 2) this.explode(e.x, e.y - 30, e.maxHp * 0.35, src);
      if (src && src.side === 'A' && src.alive) {
        src.kills++;
        if (src.kind === 'nail') { const b = 2 * src.star; src.atk += b; if (src.unit) src.unit.bonusAtk += 2; }
        if (src.kind === 'lantern' && src.kills % 2 === 0) this.summon('imp', src.x + 30, src.y);
        if (src.tags.includes('兽') && this.syn['兽'] >= 2) this.healE(src, src.maxHp * 0.2);
      }
      if (this.run.field === 'cemetery' && Math.random() < 0.2) this.summon('skel', e.x, e.y);
      Sfx.kill();
    } else if (!e.summon) {
      this.deadUids.push(e.uid);
      this.float(e.x, e.y + 30, '永久阵亡', C.blood, 34);
      this.fx.push({ k:'grave', x:e.x, y:e.y, t0:this.t, life:999 });
      Sfx.die();
      this.ents.filter(o => o.alive && o.kind === 'doll').forEach(o => this.addMult(0.5 * Math.pow(2, o.star - 1), o.x, o.y - 80));
      if (this.syn['诅咒'] >= 2) this.addMult(0.5, e.x, e.y - 120, '诅咒');
      if (this.run.legion.wake) this.addMult(0.3, e.x, e.y - 160, '守灵');
      if (e.kind === 'bride') { this.addMult(2 * e.star, e.x, e.y - 200, '纸新娘'); for (let i = 0; i < 3; i++) this.summon('paper', e.x, e.y - 40 + i * 40); }
    }
  }
  explode(x, y, dmg, src) {
    this.fx.push({ k:'boom', x, y, t0:this.t, life:0.4 }); this.shake = Math.max(this.shake, 10); Sfx.boom();
    this.ents.forEach(o => { if (o.alive && o.side === 'E' && Math.hypot(o.x - x, o.y - y) < 150) this.hit(src, o, dmg, false); });
  }
  float(x, y, text, col, size, num) { this.fx.push({ k:'float', x, y, text, col, size, num, t0:this.t, life:1.1 }); }
  ring(x, y, r0, r1, col, w, life) { this.fx.push({ k:'ring', x, y, r0, r1, col, w, t0:this.t, life }); }
  burst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 220; this.fx.push({ k:'pt', x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 120, col:i % 3 ? col : '#fff', t0:this.t, life:0.6 }); } }
  useItem(key, tier) {
    const T = this.t, hs = hpS(this.w);
    const foes = () => this.ents.filter(e => e.alive && e.side === 'E' && e.x < 1900);
    this.events.push({ key, tier });
    if (key === 'bolt') {
      const n = [2, 5, 8, 12][tier], dmg = [0.6, 0.9, 1.4, 2.2][tier] * 80 * hs, gap = tier === 3 ? 0.16 : 0.12;
      const struck = new Set();
      for (let i = 0; i < n; i++) this.pending.push({ t: T + 0.05 + i * gap, fn: () => {
        let list = foes().filter(e => !struck.has(e.id)); if (!list.length) list = foes(); if (!list.length) return;
        const tg = pick(list); struck.add(tg.id);
        this.fx.push({ k:'bolt', x:tg.x, y:tg.y, tier, seed:Math.random() * 1000, t0:this.t, life:[0.3, 0.38, 0.5, 0.6][tier] });
        this.shake = Math.max(this.shake, [3, 8, 24, 34][tier]); if (tier >= 2) { this.flash = Math.max(this.flash, tier === 3 ? 0.5 : 0.4); this.flashCol = tier === 3 ? '#e0c0ff' : '#fff8d8'; }
        Sfx.bolt(tier);
        const x = tg.x, y = tg.y;
        this.hit(null, tg, dmg, false);
        if (tier === 1) { const o = foes().filter(e => e !== tg).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]; if (o && Math.hypot(o.x - x, o.y - y) < 300) { this.fx.push({ k:'chain', x1:x, y1:y - 30, x2:o.x, y2:o.y - 30, t0:this.t, life:0.3 }); this.hit(null, o, dmg * 0.5, false); } }
        if (tier >= 2) { const r = tier === 3 ? 190 : 130; this.ring(x, y, 20, r, tier === 3 ? '#b86bff' : '#ffcc33', 10, 0.45); foes().forEach(o => { if (o !== tg && Math.hypot(o.x - x, o.y - y) < r) { this.hit(null, o, dmg * (tier === 3 ? 0.6 : 0.4), false); if (tier === 3) o.stun = Math.max(o.stun, 1); } }); }
      } });
    }
    if (key === 'heal') {
      const pct = [0.2, 0.5, 1, 1][tier];
      if (tier === 3 && this.deadUids.length) {
        const uid = this.deadUids.pop(), e = this.ents.find(o => o.uid === uid && !o.alive);
        if (e) { e.alive = true; e.hp = e.maxHp * 0.6; this.fx = this.fx.filter(f => !(f.k === 'grave' && f.x === e.x && f.y === e.y)); this.float(e.x, e.y - 90, '复活！', C.green, 44); this.ring(e.x, e.y - 30, 10, 120, C.green, 8, 0.6); }
      }
      this.ents.forEach(o => { if (o.alive && o.side === 'A') { this.healE(o, o.maxHp * pct); if (tier >= 2) o.shield = o.maxHp * 0.3; } });
      this.flash = 0.25; this.flashCol = '#c0ffc0'; Sfx.heal();
    }
    if (key === 'frame') {
      const list = [['imp'], ['imp', 'imp', 'imp'], ['ghost'], ['ghost', 'ghost', 'imp', 'imp', 'imp']][tier];
      list.forEach((k, i) => this.pending.push({ t: T + i * 0.15, fn: () => { this.summon(k, 500 + Math.random() * 200, 150 + Math.random() * 450); Sfx.up(0); } }));
    }
    if (key === 'bell') {
      const f = foes();
      if (tier === 3) f.forEach(o => { o.charm = 5; o.target = null; }); else f.forEach(o => o.stun = Math.max(o.stun, [1, 2, 3.5][tier]));
      for (let i = 0; i < 3; i++) this.pending.push({ t: T + i * 0.15, fn: () => this.ring(960, 380, 40, 900, tier === 3 ? '#ff80c0' : '#caa84a', 8, 0.7) });
      Sfx.up(1);
    }
    if (key === 'cup') { this.addMult([0.2, 0.5, 1, 2.5][tier], 960, 300, '骰盅'); }
  }

  // ───────── render ─────────
  render(ctx, opts = {}) {
    const T = this.t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sx = this.shake ? (Math.random() - 0.5) * 2 * this.shake : 0, sy = this.shake ? (Math.random() - 0.5) * 2 * this.shake : 0;
    ctx.setTransform(1, 0, 0, 1, sx, sy);
    drawFloor(ctx);
    if (opts.deploy) drawGrid(ctx, opts);
    for (const f of this.fx) if (f.k === 'grave') { const g = spriteCanvas('cross', 6); ctx.drawImage(g, f.x - g.width / 2, f.y - g.height - 4); }
    const list = this.ents.filter(e => e.alive).sort((a, b) => a.y - b.y);
    for (const e of list) drawEnt(ctx, e, T, opts);
    for (const p of this.proj) {
      p.trail.forEach((q, i) => { ctx.globalAlpha = 0.5 - i * 0.1; ctx.fillStyle = p.col; const s = p.size - i * 3; ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s); });
      ctx.globalAlpha = 1; ctx.fillStyle = p.col; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    for (const f of this.fx) drawFx(ctx, f, T);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (opts.slow) { ctx.globalAlpha = 0.55 * opts.slow; ctx.fillStyle = PP.ink; ctx.fillRect(0, 0, FW, FH); ctx.globalAlpha = 1; }
    if (this.flash > 0) { ctx.globalAlpha = clamp(this.flash, 0, 1) * 0.8; ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, FW, FH); ctx.globalAlpha = 1; }
  }
}
let _floor = null;
function drawFloor(ctx) {
  if (!_floor) {
    _floor = document.createElement('canvas'); _floor.width = FW + 80; _floor.height = FH + 80;
    const x = _floor.getContext('2d');
    x.fillStyle = '#18131a'; x.fillRect(0, 0, _floor.width, _floor.height);
    for (let y = 0; y < _floor.height; y += 100) { x.fillStyle = '#0f0c11'; x.fillRect(0, y + 94, _floor.width, 6); for (let k = 0; k < 8; k++) { const px = ((y * 7 + k * 331) % _floor.width); x.fillRect(px, y, 6, 94); } }
    for (let i = 0; i < 260; i++) { x.fillStyle = i % 2 ? '#1d171f' : '#141016'; x.fillRect(Math.floor(rnd(i) * _floor.width / 6) * 6, Math.floor(rnd(i + 99) * _floor.height / 6) * 6, 6, 6); }
    [[900, 500], [1400, 250], [600, 200]].forEach(([cx, cy]) => { x.fillStyle = 'rgba(60,14,18,0.35)'; for (let k = 0; k < 14; k++) x.fillRect(cx + Math.floor((rnd(k + cx) - 0.5) * 20) * 6, cy + Math.floor((rnd(k + cy) - 0.5) * 8) * 6, 12, 12); });
    const g = x.createRadialGradient(FW / 2 + 40, FH / 2 + 40, FH * 0.3, FW / 2 + 40, FH / 2 + 40, FW * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
    x.fillStyle = g; x.fillRect(0, 0, _floor.width, _floor.height);
  }
  ctx.drawImage(_floor, -40, -40);
}
function drawGrid(ctx, opts) {
  for (let c = 0; c < GRID.cols; c++) for (let r = 0; r < GRID.rows; r++) {
    const p = cellXY(c, r);
    const hov = opts.hoverCell && opts.hoverCell[0] === c && opts.hoverCell[1] === r;
    ctx.strokeStyle = hov ? C.candle : 'rgba(244,239,224,0.12)'; ctx.lineWidth = hov ? 5 : 3;
    ctx.strokeRect(p.x - 60, p.y - 100, 120, 110);
  }
  ctx.fillStyle = 'rgba(255,207,74,0.06)'; ctx.fillRect(GRID.x0 - 70, GRID.y0 - 110, GRID.dx * GRID.cols, GRID.dy * GRID.rows);
}
function drawEnt(ctx, e, T, opts) {
  const flipNeed = (e.side === 'A' ? 'R' : 'L') !== (SP[e.sprite].face || 'R');
  let spKey = e.sprite; if (e.kind === 'tv' && Math.floor(T * 10) % 2) spKey = 'tv2';
  const tint = e.flash > 0 ? '#ffffff' : e.stun > 0 ? '#8fa8c0' : e.charm > 0 ? '#ff90c8' : null;
  const img = spriteCanvas(spKey, e.s, tint);
  let x = e.x, y = e.y;
  const walking = e.walk && (T - (e.lastWalkT || 0)) < 0.2;
  const bob = (Math.floor(T * 5 + e.id) % 2) * 3;
  if (e.lunge != null) { const d = T - e.lunge; if (d < 0.15) x += (e.side === 'A' ? 1 : -1) * 18 * Math.sin(d / 0.15 * Math.PI); }
  if (e.kb != null) { const d = T - e.kb; if (d < 0.12) x += (e.side === 'A' ? -1 : 1) * 10 * (1 - d / 0.12); }
  y -= bob;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(e.x - img.width * 0.38, e.y - 6, img.width * 0.76, 12);
  if (opts.selUid && e.uid === opts.selUid) { ctx.strokeStyle = C.candle; ctx.lineWidth = 4; ctx.strokeRect(e.x - img.width / 2 - 8, e.y - img.height - 8, img.width + 16, img.height + 16); }
  if (flipNeed) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(img, -img.width / 2, y - img.height); ctx.restore(); }
  else ctx.drawImage(img, x - img.width / 2, y - img.height);
  if (e.shield > 0) { ctx.strokeStyle = 'rgba(191,247,240,0.8)'; ctx.lineWidth = 4; ctx.strokeRect(x - img.width / 2 - 6, y - img.height - 6, img.width + 12, img.height + 12); }
  if (e.burn) { const f = spriteCanvas(Math.floor(T * 10) % 2 ? 'flame' : 'flame2', 6); ctx.drawImage(f, x - 4, y - img.height - 18); }
  const top = y - img.height - 14;
  if (!opts.deploy || e.side === 'E') {
    const bw = Math.max(44, img.width * 0.7);
    XU.box(ctx, x - bw / 2, top, bw, 6, PP.ink);
    ctx.fillStyle = e.side === 'A' ? (e.summon ? PP.violet : PP.green) : PP.red;
    ctx.fillRect(x - bw / 2, top, bw * clamp(e.hp / e.maxHp, 0, 1), 6);
  }
  if (e.side === 'A' && !e.summon) for (let i = 0; i < e.star; i++) XU.box(ctx, x - e.star * 8 + i * 16 + 2, top - 16, 10, 10, PP.gold);
  // 首领 / 精英名牌：酒红 / 靛蓝硬边小牌、3px 墨框，金字墨影
  if (e.elite || e.boss) { XU.box(ctx, x - 40, top - 44, 80, 32, e.boss ? PP.wine : PP.indigo); XU.R(ctx, x - 40, top - 44, 80, 3, e.boss ? PP.red : PP.dusk); XU.text(ctx, e.boss ? '首领' : '精英', x, top - 28, XU.T.body, PP.gold); }
}
function drawFx(ctx, f, T) {
  const d = T - f.t0; if (d < 0) return; const p = d / f.life;
  if (f.k === 'pt') { const x = f.x + f.vx * d, y = f.y + f.vy * d + 400 * d * d; ctx.globalAlpha = 1 - p; ctx.fillStyle = f.col; ctx.fillRect(Math.round(x / 6) * 6, Math.round(y / 6) * 6, 12, 12); ctx.globalAlpha = 1; }
  else if (f.k === 'float') {
    const sc = d < 0.12 ? 0.6 + 0.7 * (d / 0.12) : 1.3 - 0.3 * clamp((d - 0.12) / 0.2, 0, 1);
    ctx.globalAlpha = p < 0.7 ? 1 : Math.ceil((1 - (p - 0.7) / 0.3) * 4) / 4;
    XU.text(ctx, f.text, f.x, f.y - 70 * eo(p), Math.max(12, Math.round(f.size * sc / 4) * 4), f.col, { num: f.num });   // 像素字 + 墨影，字号按 4px 一阶
    ctx.globalAlpha = 1;
  } else if (f.k === 'slash') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(-0.6); ctx.fillStyle = '#fff'; ctx.globalAlpha = 1 - p; const w = (f.big ? 140 : 90) * (1 - p * 0.5); ctx.fillRect(-w / 2, -4, w, f.big ? 12 : 8); ctx.restore(); ctx.globalAlpha = 1; }
  else if (f.k === 'ring') { ctx.globalAlpha = 1 - p; ctx.strokeStyle = f.col; ctx.lineWidth = f.w; ctx.beginPath(); ctx.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * eo(p), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  else if (f.k === 'boom') { const r = 20 + 150 * eo(p); ctx.globalAlpha = (1 - p) * 0.4; ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffb03a'; ctx.lineWidth = 14 * (1 - p) + 2; ctx.stroke(); ctx.globalAlpha = 1; }
  else if (f.k === 'plus') { ctx.globalAlpha = 1 - p; ctx.fillStyle = '#9ccc6a'; const y = f.y - 60 * p; ctx.fillRect(f.x - 3, y - 9, 6, 18); ctx.fillRect(f.x - 9, y - 3, 18, 6); ctx.globalAlpha = 1; }
  else if (f.k === 'chain') { ctx.globalAlpha = 1 - p; ctx.strokeStyle = C.blue; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); for (let i = 1; i < 6; i++) { const t = i / 6; ctx.lineTo(f.x1 + (f.x2 - f.x1) * t + (Math.random() - 0.5) * 30, f.y1 + (f.y2 - f.y1) * t + (Math.random() - 0.5) * 30); } ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.globalAlpha = 1; }
  else if (f.k === 'bolt') drawBolt(ctx, f.x, f.y, -20, f.seed, f.tier, d, f.life);
}
const BOLTS = [
  { c:'#c07a45', core:'#f3c9a0', w:5, forks:0, jit:18 }, { c:'#8fc8ff', core:'#ffffff', w:10, forks:2, jit:30 },
  { c:'#ffcc33', core:'#fffbe0', w:22, forks:3, jit:40 }, { c:'#b86bff', core:'#ffffff', w:30, forks:4, jit:50 },
];
function drawBolt(ctx, x, y, top, seed, tier, d, life) {
  const b = BOLTS[tier], op = d < 0.06 ? 1 : 1 - (d - 0.06) / (life - 0.06);
  const n = 8, pts = [];
  for (let i = 0; i <= n; i++) pts.push([Math.round((x + (i === 0 || i === n ? 0 : (rnd(seed * 31 + i) - 0.5) * 2 * b.jit)) / 6) * 6, Math.round((top + (y - top) * i / n) / 6) * 6]);
  const line = (P, w, col, a) => { ctx.globalAlpha = op * a; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'miter'; ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); P.slice(1).forEach(q => ctx.lineTo(q[0], q[1])); ctx.stroke(); };
  if (tier >= 2) line(pts, b.w * 3.2, b.c, 0.25);
  for (let k = 0; k < b.forks; k++) { const p = pts[2 + k * 1]; if (!p) continue; const dir = rnd(seed * 7 + k) > 0.5 ? 1 : -1; line([p, [p[0] + dir * 54, p[1] + 42], [p[0] + dir * 78, p[1] + 96]], b.w * 0.45, b.c, 1); }
  line(pts, b.w, b.c, 1); line(pts, Math.max(2, b.w * 0.35), b.core, 1);
  ctx.globalAlpha = op;
  if (tier >= 1) { ctx.fillStyle = b.core; ctx.fillRect(x - b.w * 2, y - b.w, b.w * 4, b.w * 1.6); }
  if (tier >= 2) { const q = eo(d / life); ctx.strokeStyle = b.c; ctx.lineWidth = 10 * op; ctx.beginPath(); ctx.ellipse(x, y, 30 + (tier === 3 ? 260 : 200) * q, 10 + 60 * q, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1;
}

// 开场演出和标题菜单的机台画面在 mc-opening.js
window.MC=Object.assign(window.MC,{FW,Sfx,Battle,drawBolt});
window.MC_READY=true;
})();

;
