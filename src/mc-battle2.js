// ==== mc-battle2.js ====
(function () {
const M = window.MC;
const { SP, C, UNITS, SUMMONS, ENEMIES, TIERS, spriteCanvas, spriteDims, synergies, hpS, atkS, baseS, fmt, pick, Sfx, drawBolt, HEROES } = M;
const FW = 1920, FH = 720;
const CNF = "'Noto Serif SC', serif", NUMF = "'Cinzel', 'Noto Serif SC', serif";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const ei = (t) => Math.pow(clamp(t, 0, 1), 3);
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const ENTRY = { nail:'march', wick:'fade', hound:'leap', dice:'spin', doll:'descend', grave:'rise', lantern:'descend', rat:'march', priest:'flash', clock:'spin', furnace:'drop', mirror:'flash', butcher:'leap', bride:'fade' };
const HERO_POS = { x: 90, y: 400 };

class Battle {
  constructor(run, cfg) {
    this.run = run; this.cfg = cfg; this.w = cfg.w; this.mode = cfg.mode; this.mods = run.mods;
    this.t = 0; this.ents = []; this.proj = []; this.fx = []; this.pending = [];
    this.shake = 0; this.flash = 0; this.flashCol = '#fff8d8';
    this.syn = synergies(run.roster).lvl;
    this.base = 0; this.mult = 1 + run.startMult + (run.legion.fullhouse ? 0.3 : 0) + (run.runBuff.mult || 0);
    this.spawnI = 0; this.over = null; this.overT = 0; this.deadUids = []; this.chime = 0; this.nid = 1; this.kills = 0;
    this.skillT = 0; this.allin = 0; this.rewind = 0; this.rage = 0; this.heroDmgTaken = 0;
    const H = HEROES[run.hero.cls];
    this.skillCd = H.skill.cd * Math.max(0.3, 1 + (this.mods.skillCd || 0));
    this.hero = this.mk({ side:'A', kind:'hero', sprite:H.sprite, s:7, x:HERO_POS.x, y:HERO_POS.y, hp:run.hero.hp, atk:M.heroAtk(run.hero, run.M) * (1 + (run.runBuff.heroAtk || 0)), cd:H.cd, range:H.range, spd:H.spd, ranged:H.ranged, isHero:true, bench:true, tags:[] });
    this.hero.maxHp = M.heroMaxHp(run.hero, run.M);
    // formation
    const groups = { melee: [], ranged: [], back: [] };
    run.roster.forEach(u => { const U = UNITS[u.type]; (u.type === 'doll' || u.type === 'priest' ? groups.back : U.ranged ? groups.ranged : groups.melee).push(u); });
    const col = { melee: 680, ranged: 470, back: 300 };
    let k = 0;
    Object.keys(groups).forEach(g => groups[g].forEach((u, i) => {
      const n = groups[g].length, y = 110 + (i + 0.5) * (560 / n) + (g === 'ranged' ? 20 : 0);
      this.addAlly(u, col[g] + (i % 2) * 40, y, k++ * 0.14);
    }));
    this.entryEnd = 0.4 + k * 0.14 + 0.9;
    this.ents.filter(e => e.kind === 'rat').forEach(e => { for (let i = 0; i < [2, 3, 5][e.star - 1]; i++) this.pending.push({ t: e.readyAt + i * 0.1, fn: () => this.summon('rat', e.x + 20, e.y + (i - 1) * 40) }); });
    if (this.syn['灵'] >= 2) for (let i = 0; i < 2; i++) this.pending.push({ t: this.entryEnd + i * 0.2, fn: () => this.summon('wraith', 720, 200 + i * 320) });
    if (!run.roster.length) this.pending.push({ t: 0.6, fn: () => this.heroEnter() });
  }
  get score() { return Math.round(this.base * this.mult); }
  addAlly(u, x, y, delay) {
    const U = UNITS[u.type], sm = [1, 1.8, 3.2][u.star - 1], L = this.run.legion, S = this.syn, md = this.mods, rb = this.run.runBuff;
    const iron = U.tags.includes('铁'), beast = U.tags.includes('兽');
    const hpM = 1 + (L.bone ? 0.3 : 0) + (iron && S['铁'] >= 1 ? 0.4 : 0) - (this.run.field === 'kerosene' ? 0.15 : 0) + (md.unitHp || 0);
    const atkM = 1 + (iron && L.steel ? 0.4 : 0) + (md.unitAtk || 0) + (rb.unitAtk || 0) + (U.tags.includes('火') ? (md.fire || 0) : 0);
    const asM = 1 + (L.haste ? 0.2 : 0) + (beast && S['兽'] >= 1 ? 0.3 : 0) + (beast && L.rabies ? 0.3 : 0) + (beast ? (md.beastAs || 0) : 0);
    const e = this.mk({ side:'A', kind:u.type, sprite:u.type, s:6, x, y, hp:U.hp * sm * hpM, atk:(U.atk + u.bonusAtk) * sm * atkM, cd:U.cd / asM, range:U.range, spd:U.spd, ranged:U.ranged, tags:U.tags, star:u.star, uid:u.uid, taunt:u.type === 'grave', unit:u,
      entry:ENTRY[u.type] || 'fade', entryT:0.4 + delay, readyAt:0.4 + delay + 0.9 });
    if (md.shield) e.shield = e.maxHp * md.shield;
    this.pending.push({ t: e.entryT + (e.entry === 'drop' ? 0.55 : e.entry === 'leap' ? 0.6 : 0.2), fn: () => this.entryLand(e) });
    return e;
  }
  entryLand(e) {
    if (e.entry === 'drop') { this.shake = Math.max(this.shake, 16); Sfx.boom(); this.burst(e.x, e.y, '#6a5a40', 10); }
    else if (e.entry === 'leap') { this.shake = Math.max(this.shake, 6); this.burst(e.x, e.y, '#6a5a40', 6); Sfx.hit(); }
    else if (e.entry === 'rise') { this.burst(e.x, e.y, '#4a3a2a', 12); }
    else if (e.entry === 'flash') { this.ring(e.x, e.y - 40, 10, 110, e.kind === 'mirror' ? '#cfe0ff' : '#fff2a0', 8, 0.4); Sfx.tick(); }
    else if (e.entry === 'fade') this.ring(e.x, e.y - 30, 10, 80, e.kind === 'bride' ? '#efe6da' : '#ff9a3c', 6, 0.4);
    else Sfx.tick();
  }
  mk(o) { const e = Object.assign({ id:this.nid++, alive:true, t:Math.random() * 0.5, flash:0, stun:0, charm:0, shield:0, burn:null, kills:0, hitN:0, tags:[], star:1, timer2:0, readyAt:0 }, o); e.maxHp = e.maxHp || e.hp; this.ents.push(e); return e; }
  summon(k, x, y) {
    const S = SUMMONS[k], m = (this.syn['灵'] >= 1 ? 1.5 : 1);
    const e = this.mk({ side:'A', kind:k, sprite:S.sprite, s:S.s, x:clamp(x, 160, 1880), y:clamp(y, 60, 690), hp:S.hp * m * hpS(this.w) * 0.6, atk:S.atk * m * atkS(this.w), cd:S.cd, range:S.range, spd:S.spd, ranged:S.ranged, fire:S.fire, summon:true, readyAt:this.t + 0.3 });
    this.ring(e.x, e.y - 20, 10, 70, '#b86bff', 6, 0.4);
    return e;
  }
  spawnEnemy(d) {
    const E = ENEMIES[d.type], w = this.w;
    const hpm = hpS(w) * (this.syn['诅咒'] >= 1 ? 0.85 : 1);
    this.mk({ side:'E', kind:d.type, sprite:E.sprite, s:E.s, x:1980 + Math.random() * 60, y:d.y, hp:E.hp * hpm, atk:E.atk * atkS(w), cd:E.cd, range:E.range, spd:E.spd * (this.run.field === 'wet' ? 0.7 : 1), ranged:E.ranged, base:E.base * baseS(w), mult:E.mult || 0, elite:E.elite, boss:E.boss });
  }
  active(o) { return o.alive && !o.bench && this.t >= o.readyAt; }
  foes(e) { return this.ents.filter(o => o !== e && this.active(o) && (e.charm > 0 ? o.side === 'E' && o.charm <= 0 : o.side !== e.side && o.charm <= 0)); }
  pickTarget(e) {
    let list = this.foes(e); if (!list.length) return null;
    if (e.side === 'E' && e.charm <= 0) { const tn = list.filter(o => o.taunt && Math.hypot(o.x - e.x, o.y - e.y) < 650); if (tn.length) list = tn; }
    if (e.kind === 'hound') { const vis = list.filter(o => o.x < 1900); if (vis.length) return vis.reduce((a, b) => (b.hp < a.hp ? b : a)); }
    let best = null, bd = 1e9;
    list.forEach(o => { const d = Math.hypot(o.x - e.x, (o.y - e.y) * 1.3); if (d < bd) { bd = d; best = o; } });
    return best;
  }
  heroEnter() {
    const h = this.hero; if (!h.bench || !h.alive) return;
    h.bench = false; h.enterT = this.t; h.readyAt = this.t + 0.7; h.fromX = h.x; h.fromY = h.y; h.x = 560; h.y = 380;
    this.float(560, 200, '领袖上场！', C.candle, 60);
    this.pending.push({ t: this.t + 0.6, fn: () => { this.shake = 24; this.ring(560, 380, 20, 260, C.candle, 12, 0.5); Sfx.boom(); this.ents.forEach(o => { if (o.alive && o.side === 'E' && Math.hypot(o.x - 560, o.y - 380) < 260) o.stun = Math.max(o.stun, 1); }); } });
    if (this.mods.rage) this.rage = this.t + 6.7;
    // taking the field no longer fires the legion skill; the leader's personal skill (mc-pskill.js) takes over
  }
  // the leader's skill is cast from the sidelines; once the leader takes the field the skill is folded away for this battle
  canCast() { return this.hero.alive && this.hero.bench && !this.over && !this.skillUsed && (this.run.skillCd || 0) <= 0 && this.t > this.entryEnd * 0.5; }
  castAnim(fn, tx, ty, col) {
    const h = this.hero; h.castT = this.t;
    this.ring(h.x, h.y - 50, 10, 90, col || C.candle, 6, 0.35);
    this.pending.push({ t: this.t + 0.35, fn: () => { this.fx.push({ k:'beam', x1:h.x + 20, y1:h.y - 60, x2:tx, y2:ty, col:col || C.candle, t0:this.t, life:0.35 }); fn(); } });
  }
  // free: the opening cast at battle start — no cooldown, not blocked by one
  castSkill(free) {
    if (free ? (!this.hero.alive || this.over) : !this.canCast()) return false;
    const h0 = this.run.hero, cls = h0.cls, v = M.skillVal(h0), H = HEROES[cls];
    if (!free) { this.skillUsed = true; this.run.skillCd = M.skillNodeCd(h0, this.run.M); }
    const col = { watchman:'#ffcf4a', widow:'#ffcc33', nun:'#b8ffb0', butcherlord:'#ff3a3a', clockmaker:'#9fd8c8', cremator:'#ff6a2a' }[cls];
    this.cutin = { at: performance.now(), text: (free ? '上场 · ' : '') + H.skill.n, sub: M.skillDesc(h0), col, sprite: H.sprite };
    this.slow = 0.9; Sfx.cast();
    const h = this.hero; h.castT = this.t;
    for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, r = 160 + Math.random() * 120; this.fx.push({ k:'charge', x:h.x + Math.cos(a) * r, y:h.y - 50 + Math.sin(a) * r, tx:h.x, ty:h.y - 50, col, t0:this.t + Math.random() * 0.15, life:0.4 }); }
    this.ring(h.x, h.y - 50, 180, 10, col, 8, 0.45);
    const foes = () => this.ents.filter(e => this.active(e) && e.side === 'E');
    this.pending.push({ t: this.t + 0.45, fn: () => {
      Sfx.impact(); this.shake = 24; this.flash = 0.55; this.flashCol = col;
      this.fx.push({ k:'beam', x1:h.x + 20, y1:h.y - 60, x2:1200, y2:380, col, t0:this.t, life:0.4 });
      if (cls === 'watchman') { foes().forEach((o, i) => { o.stun = Math.max(o.stun, v); this.fx.push({ k:'pillar', x:o.x, w:70, col:'#fff2a0', t0:this.t + i * 0.03, life:0.7 }); }); for (let i = 0; i < 3; i++) this.ring(1200, 380, 40, 1000, '#ffcf4a', 12, 0.7 + i * 0.15); this.float(1100, 150, '照夜 · 全体停顿', '#fff2a0', 64); }
      if (cls === 'widow') { this.allin = this.t + 8; this.allinV = v; for (let i = 0; i < 60; i++) this.fx.push({ k:'coin', x:200 + Math.random() * 1700, y:-40 - Math.random() * 300, vy:500 + Math.random() * 400, t0:this.t + Math.random() * 0.6, life:1.4 }); this.float(960, 200, '梭哈！击杀倍率 +' + v.toFixed(2), C.gold, 64); }
      if (cls === 'nun') { this.ents.forEach(o => { if (o.alive && o.side === 'A' && !o.bench) { this.healE(o, o.maxHp * v); this.fx.push({ k:'pillar', x:o.x, w:80, col:'#d8ffd0', t0:this.t, life:0.9 }); this.ring(o.x, o.y - 30, 10, 110, '#b8ffb0', 6, 0.6); } }); this.healE(this.hero, this.hero.maxHp * v * 0.25); for (let i = 0; i < 40; i++) this.fx.push({ k:'feather', x:300 + Math.random() * 900, y:-20 - Math.random() * 200, t0:this.t + Math.random() * 0.5, life:1.8, ph:Math.random() * 6 }); Sfx.heal(); }
      if (cls === 'butcherlord') { const al = this.ents.filter(o => this.active(o) && o.side === 'A' && !o.isHero); if (al.length) { const vv = al.reduce((a, b) => (b.hp < a.hp ? b : a)); this.fx.push({ k:'boom', x:vv.x, y:vv.y - 30, t0:this.t, life:0.5 }); this.burst(vv.x, vv.y - 40, '#ff2a2a', 40); this.kill(vv, null, false); this.addMult(v, vv.x, vv.y - 140, '血祭'); this.ring(vv.x, vv.y - 30, 20, 600, '#ff3a3a', 16, 0.6); } else this.float(960, 200, '没有可献祭的部队', C.dim, 40); }
      if (cls === 'clockmaker') { this.rewind = this.t + 6; this.rewindV = 1 + v; this.ents.forEach(o => { if (o.side === 'A') o.t = 0; }); this.fx.push({ k:'clock', x:600, y:360, t0:this.t, life:1.4 }); this.ring(600, 360, 40, 800, '#9fd8c8', 10, 0.7); }
      if (cls === 'cremator') { foes().forEach((o, i) => { this.ignite(o, this.hero.atk * v, this.hero); this.pending.push({ t: this.t + i * 0.05, fn: () => { this.fx.push({ k:'boom', x:o.x, y:o.y - 30, t0:this.t, life:0.45 }); this.burst(o.x, o.y - 40, '#ff8a2a', 10); } }); }); this.float(1100, 150, '火葬', '#ffb03a', 80); }
    } });
    return true;
  }
  step(dt) {
    if (dt <= 0) return;
    if (this.slow > 0) { this.slow -= dt; dt *= 0.2; }
    this.t += dt; const T = this.t;
    if (this.skillT > 0) this.skillT -= dt;
    while (this.spawnI < this.cfg.list.length && this.cfg.list[this.spawnI].spawn <= T) this.spawnEnemy(this.cfg.list[this.spawnI++]);
    if (this.run.field === 'chime') { this.chime += dt; if (this.chime >= 8) { this.chime -= 8; this.addMult(0.2, 960, 120, '钟声'); } }
    for (let i = this.pending.length - 1; i >= 0; i--) if (this.pending[i].t <= T) { const p = this.pending.splice(i, 1)[0]; p.fn(); }
    for (const e of this.ents) {
      if (!this.active(e)) continue;
      e.flash = Math.max(0, e.flash - dt);
      if (e.burn) { e.burn.t -= dt; if (e.burn.t <= 0) e.burn = null; else { e.hp -= e.burn.dps * dt; if (e.hp <= 0) { this.kill(e, e.burn.src, false); continue; } } }
      if (e.stun > 0) { e.stun -= dt; continue; }
      if (e.charm > 0) e.charm -= dt;
      if (e.kind === 'priest') { e.timer2 += dt; if (e.timer2 >= 3) { e.timer2 = 0; const al = this.ents.filter(o => this.active(o) && o.side === 'A' && o.hp < o.maxHp); if (al.length) { const o = al.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a)); this.healE(o, o.maxHp * 0.25 * e.star); } } }
      if (e.kind === 'furnace') { e.timer2 += dt; if (e.timer2 >= 1) { e.timer2 = 0; this.ents.forEach(o => { if (this.active(o) && o.side === 'E' && Math.hypot(o.x - e.x, o.y - e.y) < 170) this.ignite(o, e.atk * 0.5, e); }); this.ring(e.x, e.y - 30, 20, 170, '#ff6a2a', 4, 0.4); } }
      if (!e.target || !this.active(e.target) || Math.random() < 0.02) e.target = this.pickTarget(e);
      const tg = e.target; if (!tg) continue;
      const dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy);
      if (d > e.range) { const v = e.spd * dt / d; e.x += dx * v; e.y += dy * v * 0.9; }
      else { const asB = e.side === 'A' && T < this.rewind ? (this.rewindV || 1.6) : 1; e.t -= dt * asB; if (e.t <= 0) { e.t = e.cd; this.attack(e, tg); } }
    }
    const al = this.ents.filter(e => this.active(e));
    for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) {
      const a = al[i], b = al[j]; if (a.side !== b.side) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d < 50) { const push = (50 - d) * 0.5 / d; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; }
    }
    al.forEach(e => { e.y = clamp(e.y, 50, 700); e.x = clamp(e.x, 170, 2050); });
    for (let i = this.proj.length - 1; i >= 0; i--) {
      const p = this.proj[i];
      if (!p.tgt.alive) { this.proj.splice(i, 1); continue; }
      const tx = p.tgt.x, ty = p.tgt.y - 30, dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), v = 950 * dt;
      p.trail.unshift([p.x, p.y]); if (p.trail.length > 4) p.trail.pop();
      if (d <= v + 8) { this.proj.splice(i, 1); this.hit(p.src, p.tgt, p.dmg, p.crit); }
      else { p.x += dx / d * v; p.y += dy / d * v; }
    }
    this.shake = Math.max(0, this.shake - dt * 60); this.flash = Math.max(0, this.flash - dt * 3);
    this.fx = this.fx.filter(f => f.k === 'grave' || T - f.t0 < f.life);
    if (!this.over) {
      const armies = this.ents.filter(e => e.alive && e.side === 'A' && !e.isHero).length;
      if (armies === 0 && this.hero.bench && this.hero.alive && T > this.entryEnd) this.heroEnter();
      const left = this.ents.filter(e => e.alive && e.side === 'E').length + (this.cfg.list.length - this.spawnI);
      if (!this.hero.alive) this.end('dead');
      else if (this.mode === 'hold' || this.mode === 'holdScore') { if (T >= this.cfg.dur + 1.6) { this.end('survived'); this.ents.forEach(e => { if (e.alive && e.side === 'E') { e.alive = false; this.burst(e.x, e.y - 30, '#3a2a4a', 6); } }); } }
      else if (left === 0) this.end('clear');
      else if (T >= 120) this.end('time');
    } else this.overT += dt;
  }
  end(r) { this.over = r; this.overT = 0; }
  attack(e, tg) {
    let d = e.atk, crit = false;
    if (e.side === 'A') {
      if (e.isHero && this.t < this.rage) d *= 2;
      if (e.kind === 'dice' && Math.random() < 1 / 6) { d *= 6; crit = true; }
      if (e.kind === 'clock') { e.hitN++; if (e.hitN % 3 === 0) { d *= 4; crit = true; } }
      const cc = (this.syn['赌'] >= 1 ? 0.1 : 0) + (this.mods.crit || 0);
      if (!crit && Math.random() < cc) { d *= 2; crit = true; }
    }
    e.lunge = this.t;
    if (e.ranged) {
      const col = e.side === 'E' ? (e.kind === 'dealer' ? '#ffcc33' : '#b0d040') : (e.kind === 'wick' || e.fire || e.kind === 'lantern' || e.kind === 'cremator') ? '#ff9a3c' : e.kind === 'mirror' ? '#cfe0ff' : e.kind === 'doll' ? '#8fc8ff' : e.kind === 'priest' ? '#fff2a0' : e.isHero ? C.candle : '#eeeeee';
      this.proj.push({ x:e.x + (e.side === 'A' ? 24 : -24), y:e.y - 36, tgt:tg, dmg:d, crit, src:e, col, size:crit || e.isHero ? 20 : 14, trail:[] });
      if (e.side === 'A') Sfx.shoot();
    } else {
      this.fx.push({ k:'slash', x:tg.x, y:tg.y - 30, t0:this.t, life:0.14, big:crit || e.isHero });
      this.hit(e, tg, d, crit);
    }
  }
  hit(src, tg, d, crit) {
    if (!tg.alive) return;
    if (tg.side === 'A' && tg.tags.includes('铁') && this.syn['铁'] >= 2) d *= 0.6;
    if (tg.shield > 0) { const a = Math.min(tg.shield, d); tg.shield -= a; d -= a; }
    tg.hp -= d; tg.flash = 0.08; tg.kb = this.t; if (Math.random() < 0.7) { for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, v = 200 + Math.random() * 260; this.fx.push({ k:'pt', x:tg.x, y:tg.y - 40, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 100, col:tg.side === 'E' ? '#ffd080' : '#8fc8ff', t0:this.t, life:0.35 }); } }
    if (tg.isHero) this.heroDmgTaken += d;
    if (crit) { this.float(tg.x, tg.y - 90, '暴击 ' + fmt(d), '#ff5a4a', 40, true); Sfx.crit(); this.shake = Math.max(this.shake, 8); this.ring(tg.x, tg.y - 40, 10, 110, '#ffe08a', 7, 0.25); this.burst(tg.x, tg.y - 40, '#ffe08a', 8); this.slow = Math.max(this.slow || 0, 0.035); } else Sfx.hit();
    if (src && src.side === 'A' && (src.kind === 'wick' || src.fire)) this.ignite(tg, src.atk * 0.6, src);
    if (tg.hp <= 0) this.kill(tg, src, crit);
  }
  ignite(tg, dps, src) {
    if (!tg.alive || tg.side === 'A') return;
    const m = (this.syn['火'] >= 1 ? 2 : 1) * (this.run.legion.oil ? 1.5 : 1) * (this.run.field === 'kerosene' ? 2 : this.run.field === 'wet' ? 0.5 : 1);
    tg.burn = { dps: dps * m, t: 3, src };
  }
  healE(o, amt) { if (!o.alive) return; o.hp = Math.min(o.maxHp, o.hp + amt); for (let i = 0; i < 4; i++) this.fx.push({ k:'plus', x:o.x - 20 + i * 14, y:o.y - 40, t0:this.t + i * 0.05, life:0.8 }); }
  addMult(m, x, y, label) { m = Math.round(m * 100) / 100; this.mult += m; this.float(x, y, (label ? label + ' ' : '') + '倍率 +' + m, C.gold, 40); Sfx.mult(); }
  kill(e, src, crit) {
    if (!e.alive) return;
    e.alive = false; e.deadT = this.t;
    const h = spriteDims(e.sprite).h * e.s;
    this.burst(e.x, e.y - h / 2, e.side === 'E' ? '#6a1f2b' : '#8fc8ff', 16); this.ring(e.x, e.y - h / 2, 10, 130, e.side === 'E' ? '#ff9a6a' : '#8fc8ff', 8, 0.3); this.shake = Math.max(this.shake, 4);
    if (e.side === 'E') {
      this.kills++;
      let base = e.base * (this.run.legion.greed ? 1.25 : 1) * (1 + (this.mods.baseScore || 0));
      if (src && src.kind === 'butcher') base *= 2;
      this.base += base;
      this.float(e.x, e.y - h - 10, '+' + fmt(base), C.bone, 26, true);
      let m = e.mult || 0;
      if (m && this.run.legion.bloodpact) m *= 1.5;
      if (src && src.kind === 'mirror' && (e.elite || e.boss)) m += src.star;
      if (crit && this.syn['赌'] >= 2) m += 0.05;
      if (this.t < this.allin) m += (this.allinV || 0.1);
      if (m) this.addMult(m, e.x, e.y - h - 50);
      if (e.boss) { this.shake = 30; this.flash = 0.6; this.flashCol = '#ffffff'; this.slow = 0.8; Sfx.impact(); } else if (e.elite) { this.shake = Math.max(this.shake, 14); this.slow = Math.max(this.slow || 0, 0.25); }
      if (e.burn && this.syn['火'] >= 2) this.explode(e.x, e.y - 30, e.maxHp * 0.35, src);
      if (src && src.side === 'A' && src.alive) {
        src.kills++;
        if (src.kind === 'nail') { src.atk += 2 * src.star; if (src.unit) src.unit.bonusAtk += 2; }
        if (src.kind === 'lantern' && src.kills % 2 === 0) this.summon('imp', src.x + 30, src.y);
        if (src.tags.includes('兽') && this.syn['兽'] >= 2) this.healE(src, src.maxHp * 0.2);
        if (src.isHero && this.mods.killHeal) this.healE(src, src.maxHp * this.mods.killHeal);
      }
      if ((e.elite || e.boss) && this.mods.eliteHeal) this.healE(this.hero, this.hero.maxHp * this.mods.eliteHeal);
      if (this.run.field === 'cemetery' && Math.random() < 0.2) this.summon('skel', e.x, e.y);
      Sfx.kill();
    } else if (e.isHero) {
      this.float(e.x, e.y - 120, '领袖倒下了', C.blood, 56); this.shake = 30; Sfx.die();
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
    this.ents.forEach(o => { if (this.active(o) && o.side === 'E' && Math.hypot(o.x - x, o.y - y) < 150) this.hit(src, o, dmg, false); });
  }
  float(x, y, text, col, size, num) { this.fx.push({ k:'float', x, y, text, col, size, num, t0:this.t, life:1.1 }); }
  ring(x, y, r0, r1, col, w, life) { this.fx.push({ k:'ring', x, y, r0, r1, col, w, t0:this.t, life }); }
  burst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 220; this.fx.push({ k:'pt', x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 120, col:i % 3 ? col : '#fff', t0:this.t, life:0.6 }); } }
  useItem(key, tier) {
    const col = TIERS[tier].c;
    this.castAnim(() => this.itemEffect(key, tier), key === 'frame' ? 600 : key === 'heal' ? 500 : 1200, 380, col);
  }
  itemEffect(key, tier) {
    const T = this.t, hs = hpS(this.w);
    const foes = () => this.ents.filter(e => this.active(e) && e.side === 'E' && e.x < 1900);
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
      this.ents.forEach(o => { if (o.alive && o.side === 'A' && !o.isHero) { this.healE(o, o.maxHp * pct); if (tier >= 2) o.shield = o.maxHp * 0.3; } });
      this.healE(this.hero, this.hero.maxHp * pct * 0.25);
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
    if (key === 'cup') this.addMult([0.2, 0.5, 1, 2.5][tier], 960, 300, '骰盅');
  }

  render(ctx, opts = {}) {
    const T = this.t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sx = this.shake ? (Math.random() - 0.5) * 2 * this.shake : 0, sy = this.shake ? (Math.random() - 0.5) * 2 * this.shake : 0;
    ctx.setTransform(1, 0, 0, 1, sx, sy);
    drawFloor(ctx, this.run.region);
    drawPodium(ctx);
    for (const f of this.fx) if (f.k === 'grave') { const g = spriteCanvas('cross', 6); ctx.drawImage(g, f.x - g.width / 2, f.y - g.height - 4); }
    const list = this.ents.filter(e => e.alive && (T >= (e.entryT || 0) || e.isHero)).sort((a, b) => a.y - b.y);
    for (const e of list) drawEnt(ctx, e, T, this);
    for (const p of this.proj) {
      p.trail.forEach((q, i) => { ctx.globalAlpha = 0.5 - i * 0.1; ctx.fillStyle = p.col; const s = p.size - i * 3; ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s); });
      ctx.globalAlpha = 1; ctx.fillStyle = p.col; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const R = this.run.region, lights = [{ x: HERO_POS.x + 20, y: HERO_POS.y - 60, r: 260, c: '#ffcf8a' }];
    for (const e of list) { if (e.isHero && !e.bench) lights.push({ x: e.x, y: e.y - 50, r: 240, c: '#ffe6b0' }); else if (e.burn) lights.push({ x: e.x, y: e.y - 40, r: 150, c: '#ff8a3a' }); else if (e.boss) lights.push({ x: e.x, y: e.y - 80, r: 260, c: '#ff4a4a' }); else if (e.side === 'A' && !e.isHero) lights.push({ x: e.x, y: e.y - 40, r: 120, c: R.light || '#ffe0a0' }); }
    for (const p of this.proj) lights.push({ x: p.x, y: p.y, r: 70, c: p.col.length === 7 ? p.col : '#ffffff' });
    for (const f of this.fx) { const d = T - f.t0; if (d < 0) continue; const q = 1 - d / f.life; if (f.k === 'boom') lights.push({ x: f.x, y: f.y, r: 320 * q, c: '#ff9a3a' }); if (f.k === 'bolt') lights.push({ x: f.x, y: f.y - 200, r: 420 * q, c: '#e0e8ff' }); if (f.k === 'pillar') lights.push({ x: f.x, y: 360, r: 260 * q, c: f.col }); if (f.k === 'beam') lights.push({ x: f.x2, y: f.y2, r: 300 * q, c: f.col }); }
    const lm = bLight(), lx = lm.getContext('2d'); lx.globalCompositeOperation = 'source-over'; lx.fillStyle = 'rgba(4,2,10,0.16)'; lx.fillRect(0, 0, 480, 180); lx.globalCompositeOperation = 'destination-out';
    lights.forEach(L => { const r = L.r / 4; if (r <= 0) return; const g = lx.createRadialGradient(L.x / 4, L.y / 4, 0, L.x / 4, L.y / 4, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); lx.fillStyle = g; lx.fillRect(L.x / 4 - r, L.y / 4 - r, r * 2, r * 2); });
    ctx.imageSmoothingEnabled = true; ctx.drawImage(lm, 0, 0, FW, FH);
    lights.forEach(L => { if (L.r > 0 && L.c && L.c.length === 7) M.glow(ctx, L.x, L.y, L.r * 0.5, L.c, 0.18); });
    if (!this.amb) this.amb = new M.Ambient(R.amb || 'motes', FW, FH, 50);
    this.amb.update(1 / 60); this.amb.draw(ctx, 0, 0);
    M.hd2d(ctx, FW, FH, { focus: 0.56, band: 0.26, dofBlur: 1.8, bloom: 0.55, grade: R.grade, gradeA: 0.28, vig: 0.3 });
    ctx.setTransform(1, 0, 0, 1, sx, sy); ctx.imageSmoothingEnabled = false;
    for (const p of this.proj) { M.glow(ctx, p.x, p.y, p.size * 3.2, p.col.length === 7 ? p.col : '#ffffff', 0.55); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - p.size / 4, p.y - p.size / 4, p.size / 2, p.size / 2); ctx.restore(); }
    for (const f of this.fx) drawFx(ctx, f, T);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (opts.slow) { ctx.globalAlpha = 0.55 * opts.slow; ctx.fillStyle = '#07050a'; ctx.fillRect(0, 0, FW, FH); ctx.globalAlpha = 1; }
    if (this.flash > 0) { ctx.globalAlpha = clamp(this.flash, 0, 1) * 0.8; ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, FW, FH); ctx.globalAlpha = 1; }
    if (T < 0.6) { ctx.globalAlpha = 1 - T / 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FW, FH); ctx.globalAlpha = 1; }
  }
}
const floors = {};
let _bl = null; function bLight() { if (!_bl) { _bl = document.createElement('canvas'); _bl.width = 480; _bl.height = 180; } return _bl; }
function drawFloor(ctx, region) {
  const key = region.n;
  if (!floors[key]) {
    const c = document.createElement('canvas'); c.width = FW + 80; c.height = FH + 80;
    const x = c.getContext('2d');
    x.fillStyle = region.tile; x.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < c.height; y += 100) { x.fillStyle = region.bg; x.fillRect(0, y + 94, c.width, 6); for (let k = 0; k < 8; k++) x.fillRect(((y * 7 + k * 331) % c.width), y, 6, 94); }
    for (let i = 0; i < 260; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.25)'; x.fillRect(Math.floor(rnd(i) * c.width / 6) * 6, Math.floor(rnd(i + 99) * c.height / 6) * 6, 6, 6); }
    const wg = x.createLinearGradient(0, 0, 0, 170); wg.addColorStop(0, region.bg); wg.addColorStop(1, region.road || region.tile); x.fillStyle = wg; x.fillRect(0, 0, c.width, 170);
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 164, c.width, 12);
    (region.deco || []).forEach((k, i) => { for (let j = 0; j < 4; j++) { const img = spriteCanvas(k, 5); const xx = ((i * 4 + j) * 157 + 60) % (c.width - 100); x.globalAlpha = 0.7; x.drawImage(img, xx, 168 - img.height); x.globalAlpha = 1; } });
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, 0, 200, c.height);
    const g = x.createRadialGradient(FW / 2 + 40, FH / 2 + 40, FH * 0.3, FW / 2 + 40, FH / 2 + 40, FW * 0.62);
    g.addColorStop(0, 'rgba(255,230,190,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    floors[key] = c;
  }
  ctx.drawImage(floors[key], -40, -40);
}
function drawPodium(ctx) {
  ctx.fillStyle = '#0b090e'; ctx.fillRect(20, HERO_POS.y - 6, 150, 40);
  ctx.fillStyle = '#2a2230'; ctx.fillRect(20, HERO_POS.y - 6, 150, 6);
  ctx.fillStyle = '#e8dcc4'; ctx.fillRect(30, HERO_POS.y - 30, 8, 24); ctx.fillStyle = '#ffb03a'; ctx.fillRect(31, HERO_POS.y - 40, 6, 10);
  ctx.font = `24px ${CNF}`; ctx.textAlign = 'center'; ctx.fillStyle = '#8d8496'; ctx.fillText('指挥位', 95, HERO_POS.y + 64);
}
function entryOffset(e, T) {
  if (e.isHero) {
    if (e.enterT != null && T < e.enterT + 0.7) { const q = clamp((T - e.enterT) / 0.6, 0, 1); return { x: e.fromX + (e.x - e.fromX) * q - e.x, y: e.fromY + (e.y - e.fromY) * q - e.y - Math.sin(q * Math.PI) * 220, a: 1, sc: 1 }; }
    return null;
  }
  if (e.entryT == null || T >= e.readyAt) return null;
  const q = clamp((T - e.entryT) / 0.9, 0, 1);
  switch (e.entry) {
    case 'march': return { x: -600 * (1 - eo(q * 1.2)), y: -(Math.floor(T * 10) % 2) * 6, a: 1 };
    case 'leap': { const p = clamp(q / 0.66, 0, 1); return { x: -500 * (1 - p), y: -Math.sin(p * Math.PI) * 260, a: 1 }; }
    case 'drop': { const p = clamp(q / 0.6, 0, 1); return { x: 0, y: -800 * (1 - ei(p) ), a: 1 }; }
    case 'rise': return { x: 0, y: 0, a: 1, clip: eo(q) };
    case 'spin': return { x: -400 * (1 - eo(q)), y: 0, a: 1, rot: (1 - eo(q)) * 720 };
    case 'descend': return { x: 0, y: -500 * (1 - eo(q)), a: 1, string: true };
    case 'flash': return { x: 0, y: 0, a: q > 0.3 ? 1 : 0, col: q < 0.35, colA: 1 - Math.abs(q - 0.25) / 0.25 };
    default: return { x: 0, y: 0, a: eo(q) };
  }
}
function drawEnt(ctx, e, T, b) {
  const flipNeed = (e.side === 'A' ? 'R' : 'L') !== (SP[e.sprite].face || 'R');
  let spKey = e.sprite; if ((e.kind === 'tv' || e.kind === 'tvmini') && Math.floor(T * 10) % 2) spKey = 'tv2';
  const tint = e.flash > 0 ? '#ffffff' : e.stun > 0 ? '#8fa8c0' : e.charm > 0 ? '#ff90c8' : null;
  const img = spriteCanvas(spKey, e.s, tint);
  let x = e.x, y = e.y, a = 1, rot = 0, clip = 1;
  const off = entryOffset(e, T);
  if (off) {
    x += off.x; y += off.y; a = off.a; rot = off.rot || 0; clip = off.clip == null ? 1 : off.clip;
    if (off.string) { ctx.fillStyle = '#8d8496'; ctx.fillRect(x - 1, 0, 2, y - img.height); }
    if (off.col) { ctx.globalAlpha = clamp(off.colA, 0, 1); ctx.fillStyle = e.kind === 'mirror' ? '#cfe0ff' : '#fff2a0'; ctx.fillRect(x - 30, 0, 60, e.y); ctx.globalAlpha = 1; }
  }
  if (e.lunge != null) { const d = T - e.lunge; if (d < 0.15) x += (e.side === 'A' ? 1 : -1) * 18 * Math.sin(d / 0.15 * Math.PI); }
  if (e.kb != null) { const d = T - e.kb; if (d < 0.12) x += (e.side === 'A' ? -1 : 1) * 10 * (1 - d / 0.12); }
  if (e.castT != null && T - e.castT < 0.5) y -= 14 * Math.sin((T - e.castT) / 0.5 * Math.PI);
  y -= (Math.floor(T * 5 + e.id) % 2) * 3;
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(e.x - img.width * 0.38, e.y - 6, img.width * 0.76, 12);
  if (e.isHero && e.bench) { ctx.globalAlpha = a * (0.25 + 0.15 * Math.sin(T * 3)); ctx.fillStyle = C.candle; ctx.fillRect(x - img.width / 2 - 10, y - img.height - 10, img.width + 20, img.height + 16); ctx.globalAlpha = a; }
  ctx.save(); ctx.translate(x, y);
  if (rot) ctx.rotate(rot * Math.PI / 180);
  if (flipNeed) ctx.scale(-1, 1);
  if (clip < 1) { const h = img.height * clip; ctx.drawImage(img, 0, 0, img.width, h, -img.width / 2, -h, img.width, h); }
  else ctx.drawImage(img, -img.width / 2, -img.height);
  ctx.restore();
  if (e.shield > 0) { ctx.strokeStyle = 'rgba(143,200,255,0.8)'; ctx.lineWidth = 4; ctx.strokeRect(x - img.width / 2 - 6, y - img.height - 6, img.width + 12, img.height + 12); }
  if (e.burn) { const f = spriteCanvas(Math.floor(T * 10) % 2 ? 'flame' : 'flame2', 6); ctx.drawImage(f, x - 4, y - img.height - 18); }
  const top = y - img.height - 14;
  if (!off) {
    const bw = Math.max(44, img.width * 0.7);
    ctx.fillStyle = '#000'; ctx.fillRect(x - bw / 2 - 2, top - 2, bw + 4, e.isHero ? 14 : 10);
    ctx.fillStyle = e.isHero ? C.candle : e.side === 'A' ? (e.summon ? '#b86bff' : '#9ccc6a') : '#d0453c';
    ctx.fillRect(x - bw / 2, top, bw * clamp(e.hp / e.maxHp, 0, 1), e.isHero ? 10 : 6);
  }
  if (e.side === 'A' && !e.summon && !e.isHero) for (let i = 0; i < e.star; i++) { ctx.fillStyle = C.gold; ctx.fillRect(x - e.star * 8 + i * 16 + 2, top - 16, 10, 10); }
  if (e.elite || e.boss) { ctx.font = `26px ${CNF}`; ctx.textAlign = 'center'; ctx.fillStyle = '#1a120a'; ctx.fillRect(x - 40, top - 44, 80, 32); ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.strokeRect(x - 40, top - 44, 80, 32); ctx.fillStyle = C.gold; ctx.fillText(e.boss ? '首领' : '精英', x, top - 19); }
  if (e.isHero) { ctx.font = `24px ${CNF}`; ctx.textAlign = 'center'; ctx.fillStyle = C.candle; ctx.fillText(b.run.hero.name, x, top - 12); }
  ctx.globalAlpha = 1;
}
function drawFx(ctx, f, T) {
  const d = T - f.t0; if (d < 0 || f.k === 'grave') return; const p = d / f.life;
  if (f.k === 'pt') { const x = f.x + f.vx * d, y = f.y + f.vy * d + 400 * d * d, c0 = f.col.length === 7 ? f.col : '#ffffff', c = c0 === '#6a1f2b' ? '#ff5a3a' : c0; M.glow(ctx, x, y, 34 * (1 - p * 0.5), c, 0.45 * (1 - p)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - p; ctx.fillStyle = c; ctx.fillRect(Math.round(x / 6) * 6 - 6, Math.round(y / 6) * 6 - 6, 12, 12); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = (1 - p) * 0.8; ctx.fillRect(Math.round(x / 6) * 6 - 3, Math.round(y / 6) * 6 - 3, 6, 6); ctx.restore(); }
  else if (f.k === 'float') { if (d < 0.25) M.glow(ctx, f.x, f.y - 70 * eo(p) - f.size * 0.3, f.size * 2, f.col.length === 7 ? f.col : '#ffffff', 0.5 * (1 - d / 0.25));
    const sc = d < 0.12 ? 0.6 + 0.7 * (d / 0.12) : 1.3 - 0.3 * clamp((d - 0.12) / 0.2, 0, 1);
    ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    ctx.font = `${Math.round(f.size * sc)}px ${f.num ? NUMF : CNF}`; ctx.textAlign = 'center';
    const y = f.y - 70 * eo(p);
    ctx.fillStyle = '#000'; ctx.fillText(f.text, f.x + 4, y + 4); ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, y);
    ctx.globalAlpha = 1;
  } else if (f.k === 'slash') { M.glow(ctx, f.x, f.y, f.big ? 120 : 70, '#fff2c0', 0.6 * (1 - p)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(f.x, f.y); ctx.rotate(-0.6); ctx.fillStyle = '#fff'; ctx.globalAlpha = 1 - p; const w = (f.big ? 140 : 90) * (1 - p * 0.5); ctx.fillRect(-w / 2, -4, w, f.big ? 12 : 8); ctx.restore(); ctx.globalAlpha = 1; }
  else if (f.k === 'ring') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = f.col; ctx.shadowBlur = 24; ctx.globalAlpha = 1 - p; ctx.strokeStyle = f.col; ctx.lineWidth = f.w; ctx.beginPath(); ctx.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * eo(p), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  else if (f.k === 'boom') { M.glow(ctx, f.x, f.y, 260 * (1 - p * 0.4), '#ff9a3a', 0.8 * (1 - p)); M.glow(ctx, f.x, f.y, 90, '#ffffff', 0.9 * Math.max(0, 1 - p * 3)); const r = 20 + 150 * eo(p); ctx.globalAlpha = (1 - p) * 0.4; ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffb03a'; ctx.lineWidth = 14 * (1 - p) + 2; ctx.stroke(); ctx.globalAlpha = 1; }
  else if (f.k === 'plus') { M.glow(ctx, f.x, f.y - 60 * p, 30, '#9cff7a', 0.5 * (1 - p)); ctx.globalAlpha = 1 - p; ctx.fillStyle = '#9ccc6a'; const y = f.y - 60 * p; ctx.fillRect(f.x - 3, y - 9, 6, 18); ctx.fillRect(f.x - 9, y - 3, 18, 6); ctx.globalAlpha = 1; }
  else if (f.k === 'chain') { ctx.globalAlpha = 1 - p; ctx.strokeStyle = C.blue; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); for (let i = 1; i < 6; i++) { const t = i / 6; ctx.lineTo(f.x1 + (f.x2 - f.x1) * t + (Math.random() - 0.5) * 30, f.y1 + (f.y2 - f.y1) * t + (Math.random() - 0.5) * 30); } ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.globalAlpha = 1; }
  else if (f.k === 'beam') { ctx.globalAlpha = 1 - p; ctx.strokeStyle = f.col; ctx.lineWidth = 18 * (1 - p) + 4; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x1 + (f.x2 - f.x1) * eo(p * 2), f.y1 + (f.y2 - f.y1) * eo(p * 2)); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); ctx.globalAlpha = 1; }
  else if (f.k === 'bolt') drawBolt(ctx, f.x, f.y, -20, f.seed, f.tier, d, f.life);
  else if (f.k === 'pillar') { const a = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(f.x - f.w, 0, f.x + f.w, 0); g.addColorStop(0, f.col + '00'); g.addColorStop(0.5, f.col + 'ff'); g.addColorStop(1, f.col + '00'); ctx.globalAlpha = a * 0.8; ctx.fillStyle = g; ctx.fillRect(f.x - f.w, 0, f.w * 2, FH); ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.fillRect(f.x - 3, 0, 6, FH); ctx.restore(); }
  else if (f.k === 'charge') { M.glow(ctx, f.x + (f.tx - f.x) * eo(p), f.y + (f.ty - f.y) * eo(p), 30, f.col, 0.6); const q = eo(p), x = f.x + (f.tx - f.x) * q, y = f.y + (f.ty - f.y) * q; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - p * 0.5; ctx.fillStyle = f.col; ctx.fillRect(x - 6, y - 6, 12, 12); ctx.restore(); }
  else if (f.k === 'coin') { const y = f.y + f.vy * d; ctx.globalAlpha = p > 0.8 ? (1 - p) / 0.2 : 1; const w = Math.abs(Math.cos(d * 10 + f.x)) * 18 + 3; ctx.fillStyle = '#ffcc33'; ctx.fillRect(f.x - w / 2, y - 9, w, 18); ctx.fillStyle = '#fff6c0'; ctx.fillRect(f.x - w / 4, y - 6, Math.max(1, w / 4), 6); ctx.globalAlpha = 1; }
  else if (f.k === 'feather') { const x = f.x + Math.sin(d * 3 + f.ph) * 40, y = f.y + 260 * d; ctx.save(); ctx.globalAlpha = 1 - p; ctx.translate(x, y); ctx.rotate(Math.sin(d * 3 + f.ph) * 0.8); ctx.fillStyle = '#fffbe8'; ctx.fillRect(-4, -14, 8, 28); ctx.fillStyle = '#d8ffd0'; ctx.fillRect(-1, -14, 2, 28); ctx.restore(); }
  else if (f.k === 'clock') { const a = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8, r = 220 + 60 * eo(p); ctx.save(); ctx.globalAlpha = a * 0.85; ctx.translate(f.x, f.y); ctx.strokeStyle = '#9fd8c8'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate(i * Math.PI / 6); ctx.fillStyle = '#e0fff5'; ctx.fillRect(-4, -r + 12, 8, 26); ctx.restore(); } ctx.rotate(-d * 14); ctx.fillStyle = '#e0fff5'; ctx.fillRect(-5, -r * 0.8, 10, r * 0.8); ctx.rotate(d * 10); ctx.fillRect(-7, -r * 0.5, 14, r * 0.5); ctx.restore(); }
}
M.Battle2 = Battle; M._drawFx = drawFx; M._drawFloor = drawFloor; M._drawPodium = drawPodium; M._bLight = bLight;

})();

;
