// ==== mc-siege.js ====
(function () {
// 混沌来袭 fought by the town (user ruling 2026-09-26). The leader no longer fights: it stands on the roof of the main base
// and commands. Monsters come in from beyond both ends of the town and walk to the main base, stopping to break the
// first building in their way — so the walls take the first blows, then whatever stands behind them. Towers shoot from
// their tops with their own weapon: bolts, shells with splash, chain lightning, slowing arcane orbs, the colossus's fist,
// Zeus's lightning (the room underneath flashes when its tower fires). Barracks send soldiers who hold the ground just
// outside the outermost wall. The main base has two crossbows on its wings of its own. A building brought down lies in
// ruins after the raid and its room does nothing until repaired. The main base falling still ends the game.
// 2026-09-27: only the fighting buildings take part (the city behind is background, monsters walk past it). 防御罩 lays
// a dome over the middle of the town that takes the hits meant for anything under it until it breaks, and comes back
// after a while; 守望古树 blocks like a wall, grows its wounds back and its roots slow whatever hits it.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, U = M.UI, P = M.PJ.PAL, B_ = M.BUILDINGS, DB = M.DB, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), RM = () => !!M.PJ.reduced, fmt = M.fmt;
const GEO = M.BASE_GEO, DOOR_X = GEO.DOOR_X, MB = M.MAIN_BASE;
const GUARD_KEY = { kotoku: 'ShieldDefender', terracotta: 'Pikeman', bb_jailer: 'AncestorWarrior' };   // 地狱之门's jailers
// the main base's own crossbows: they grow with the days so a new town is never helpless
M.MB_BOW = { dmg: 50, cd: 1.1, range: 760, perDay: 0.08 };
M.SIEGE_K = { bldAtk: 1 };   // how hard monsters hit buildings (tuned with tools / .ai sims)
// how strong a raid's monsters are by the day (life and attack ×), on top of the budget that grows with the days
// (user ruling 2026-09-27: 「局外的失败概率应该是50%……你来定」; calibrated with tools/raidsim.js on the growth sims' towns)
M.RAID_CURVE = [[5, 4.4], [10, 1.7], [15, 2.1], [20, 3.0], [30, 3.6]];   // 2026-09-27: on the growth sims' towns (walls, towers, 加固) about 6% / 15% / 18% / 30% of these raids are lost
M.raidK = (day) => { const C = M.RAID_CURVE; if (day <= C[0][0]) return C[0][1]; for (let i = 1; i < C.length; i++) if (day <= C[i][0]) { const [d0, k0] = C[i - 1], [d1, k1] = C[i]; return k0 + (k1 - k0) * (day - d0) / (d1 - d0); } return C[C.length - 1][1]; };
M.DOME = { R: 560, pool: 900, perDay: 0.1, regen: 0.12, wait: 4, down: 8 };   // 防御罩: reach, shield, its growth a day, regrowth a second (share), quiet time, time broken
M.ELDER = { regen: 0.02, quiet: 3, roots: 0.35 };   // 守望古树: life back a second (share) once unhurt for `quiet` seconds, attackers' slowdown
M.RAID_SHOT = 170;   // how close a shooting monster comes to a building before it shoots (so the towers reach it)

const Base = M.Raid;
M.Raid = class extends Base {
  constructor(meta) {
    super(meta);
    const L = M.townLayout(meta), d = meta.day, bmS = M.baseMods(meta);
    this.L = L; this.ents = []; this.turrets = []; this.fire = {}; this.bld = {}; this.towers = []; this.ruined = []; this.domes = [];
    this.sum = { fell: [] };   // what the raid did, for the reckoning when the main base falls
    L.items.forEach(o => {
      if (o.site || o.ruin || o.demo || !o.fight) return;
      const x = M.cell(meta, o.c, o.r), fl = M.fortLv ? M.fortLv(meta, o.c, o.r) : 0, F = M.FORT, mul = (M.dirMul ? M.dirMul(meta, o.key) : 1), hp = Math.round(M.townHp(o.key) * mul * (1 + (bmS.defHp || 0)) * (1 + F.hp * fl)), hit = mul * (1 + F.dmg * fl);   // 加固 (fl): life and damage
      const b = { k: o.k, c: o.c, r: o.r, key: o.key, role: o.role, x: o.tx, y: o.ty, w: o.w * (o.sc || 1), h: o.h * (o.sc || 1), side: o.side, hp, max: hp, t: Math.random() * 0.6, elder: !!o.B.elder };
      this.bld[o.k] = b;
      if (o.role === 'shield') { const D = M.DOME, pool = Math.round(D.pool * (1 + d * D.perDay) * mul * (1 + F.hp * fl)); this.domes.push({ b, x: o.tx, R: D.R, pool, max: pool, hitT: -9, down: 0 }); }
      if (o.role === 'tower') { const w = M.weaponStats(meta, o.c, o.r); if (w) { w.dmg *= 1 + F.dmg * fl; b.w0 = w; b.range = M.towerRange(w); this.towers.push(b); } }
      if (o.role === 'guard') {
        const n = (o.B.fx && o.B.fx.defArmy) || 2, sp = GUARD_KEY[o.key] || 'ShieldDefender', D = DB[sp] || {};
        for (let i = 0; i < n; i++) { const gx = L.guard[o.side < 0 ? 'L' : 'R'] + o.side * (i * 46), hp = (D.hp || 300) * (1.4 + d * 0.12) * mul * (1 + F.hp * fl), atk = (D.atk || 30) * (1.3 + d * 0.08) * hit;
          this.ents.push({ side: 'A', guard: 1, sprite: sp, s: 4, x: gx, home: gx, y: -22 - (i % 3) * 10, hp, max: hp, atk, cd: 100 / (D.as || 100), range: D.ranged === 1 ? 300 : 70, spd: 150, ranged: D.ranged === 1, t: Math.random() * 0.5, alive: true, face: o.side }); }
      }
    });
    // the main base's two crossbows
    const bw = M.MB_BOW; this.mbBows = [-1, 1].map(s => ({ x: DOOR_X + s * (MB.w / 2 - 40), y: MB.top - 30, side: s, t: Math.random(), dmg: bw.dmg * (1 + d * bw.perDay), cd: bw.cd / (1 + (bmS.bowRate || 0)), range: bw.range }));   // 巨像残骸: bowRate
    this.bell = bmS.raidStun || 0;   // 午夜钟楼: the first wave stands still while the bell rings
    this.edgeL = L.edge.L; this.edgeR = L.edge.R;
  }
  spawn(s) {
    super.spawn(s); const e = this.ents[this.ents.length - 1]; if (!e || e.side !== 'E') return;
    const k = M.raidK(this.meta.day); e.hp *= k; e.max *= k; e.atk *= k;
    e.x = s.side < 0 ? this.edgeL - 520 - Math.random() * 80 : this.edgeR + 520 + Math.random() * 80; e.face = -s.side;
    if (this.bell && (this.t || 0) < 12) { e.stun = Math.max(e.stun || 0, this.bell); if (!this.bellRung) { this.bellRung = 1; this.float(DOOR_X, -420, '午夜钟声', '#dfe8ff', 40); S.bell ? S.bell() : S.impact && S.impact(); } }
  }
  // the building an enemy at x walking in direction dir runs into (the nearest standing one ahead, within reach)
  blocker(e, dir, reach) {
    let best = null, bd = 1e9;
    Object.values(this.bld).forEach(b => { if (b.hp <= 0) return; const edge = b.x - dir * b.w / 2, gap = (edge - e.x) * dir; if (gap < -b.w) return; if (gap <= reach && gap < bd) { bd = gap; best = b; } });
    return best;
  }
  // a dome over x takes the hit first; what it cannot hold goes through
  absorb(x, dmg) {
    for (const D of this.domes) { if (D.b.hp <= 0 || D.pool <= 0 || Math.abs(x - D.x) > D.R) continue; const a = Math.min(D.pool, dmg); D.pool -= a; D.hitT = this.t; dmg -= a;
      if (D.pool <= 0) { D.down = this.t; this.shake = Math.max(this.shake, 12); S.shatter ? S.shatter() : S.boom && S.boom(); this.float(D.x, -D.R * 0.62 - 40, '护罩破了', '#8ff6ff', 34); for (let i = 0; i < 24; i++) { const an = Math.PI * (i / 23), v = 200 + Math.random() * 300; this.fx.push({ k: 'pt', x: D.x + Math.cos(an) * D.R, y: -Math.sin(an) * D.R * 0.62, vx: Math.cos(an) * v, vy: -Math.sin(an) * v, col: i % 2 ? '#8ff6ff' : '#ffffff', t0: this.t, life: 0.8 }); } }
      if (dmg <= 0) return 0; }
    return dmg;
  }
  damage(e, d, col) { this.hurtT = this.t; return super.damage(e, d, col); }
  hitPortal(dmg) { this.hurtT = this.t; dmg = this.absorb(DOOR_X, dmg); if (dmg <= 0) return; this.portal.hp -= dmg; this.portal.hit = this.t; this.shake = Math.max(this.shake, 6); this.float(this.portal.x + (Math.random() - 0.5) * 80, -260, '-' + fmt(dmg), '#ff6a6a', 30); }
  hitBld(b, dmg, col) {
    if (b.hp <= 0) return; this.hurtT = this.t; b.hitT = this.t; dmg = this.absorb(b.x, dmg); if (dmg <= 0) return; b.hp -= dmg; this.float(b.x + (Math.random() - 0.5) * b.w * 0.5, b.y - b.h - 20, '-' + fmt(dmg), col || '#ff8a6a', 26);
    if (b.hp <= 0) { b.hp = 0; this.ruined.push(b); this.sum.fell.push(B_[b.key].n); this.shake = Math.max(this.shake, 16); S.boom && S.boom(); this.fx.push({ k: 'collapse', x: b.x, w: b.w, h: b.h, t0: this.t, life: 1.2 }); for (let i = 0; i < 18; i++) { const a = -Math.PI * Math.random(), v = 200 + Math.random() * 400; this.fx.push({ k: 'pt', x: b.x + (Math.random() - 0.5) * b.w, y: b.y - b.h * Math.random(), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, col: i % 3 ? '#6a6058' : '#c98f5a', t0: this.t, life: 0.9 }); } this.float(b.x, b.y - b.h - 60, B_[b.key].n + ' 倒塌', '#ff5a4a', 34); }
  }
  step(dt) {
    if (this.over) { this.overT += dt; return; }
    this.t += dt; const T = this.t;
    while (this.spawnI < this.list.length && this.list[this.spawnI].t <= T) this.spawn(this.list[this.spawnI++]);
    const foes = this.ents.filter(e => e.alive && e.side === 'E'), allies = this.ents.filter(e => e.alive && e.side === 'A');
    // the dome grows back after a quiet while, and comes back whole some time after it broke; the old tree heals
    this.domes.forEach(D => { if (D.b.hp <= 0) { D.pool = 0; return; } const Dm = M.DOME; if (D.pool <= 0) { if (T - D.down > Dm.down) { D.pool = D.max * 0.5; D.hitT = T; this.float(D.x, -D.R * 0.62 - 40, '护罩恢复', '#8ff6ff', 30); } } else if (T - D.hitT > Dm.wait) D.pool = Math.min(D.max, D.pool + D.max * Dm.regen * dt); });
    Object.values(this.bld).forEach(b => { if (b.elder && b.hp > 0 && b.hp < b.max && T - (b.hitT || -9) > M.ELDER.quiet) b.hp = Math.min(b.max, b.hp + b.max * M.ELDER.regen * dt); });
    for (const e of this.ents) {
      if (!e.alive) continue;
      if (e.slow > 0) e.slow -= dt;
      if (e.stun > 0) { e.stun -= dt; continue; }
      const sp = e.spd * (e.slow > 0 ? 0.5 : 1) * dt;
      if (e.side === 'A') {
        // guards: fight what comes within reach of their spot, else stand there
        let tg = null, bd = 360; foes.forEach(o => { const d = Math.abs(o.x - e.x); if (Math.abs(o.x - e.home) < 440 && d < bd) { bd = d; tg = o; } });
        const tx = tg ? tg.x : e.home, d = Math.abs(tx - e.x), reach = tg ? e.range : 4;
        if (d > reach) { e.x += Math.sign(tx - e.x) * Math.min(sp, d - reach + 1); e.face = Math.sign(tx - e.x) || e.face; e.walk = (e.walk || 0) + sp; }
        else if (tg) { e.t -= dt; e.face = Math.sign(tg.x - e.x) || e.face; if (e.t <= 0) { e.t = e.cd; e.lunge = T; if (e.ranged) this.proj.push({ x: e.x, y: e.y - 40, tg, tx: tg.x, dmg: e.atk, col: '#ffe08a', src: e }); else { this.damage(tg, e.atk, '#fff'); this.fx.push({ k: 'slash', x: tg.x, y: tg.y - 40, t0: T, life: 0.14 }); S.hit(); } } }
        continue;
      }
      // monsters: a guard in the way first, then the first building ahead, then the main base
      const dir = Math.sign(DOOR_X - e.x) || 1, reach = e.range;
      let tg = null, bd = 1e9; allies.forEach(o => { const gap = (o.x - e.x) * dir; if (gap > -30 && gap < bd && gap <= reach + 40) { bd = gap; tg = o; } });
      const bb = tg ? null : this.blocker(e, dir, e.ranged ? Math.min(reach, M.RAID_SHOT) : reach), atBase = !tg && !bb && Math.abs(DOOR_X - e.x) <= MB.w / 2 + 20;
      if (tg || bb || atBase) {
        e.t -= dt; e.face = dir; if (e.t > 0) continue; e.t = e.cd * (bb && bb.elder ? 1 + M.ELDER.roots : 1); e.lunge = T;   // the old tree's roots hold its attackers
        const dmg = e.atk * (tg ? 1 : M.SIEGE_K.bldAtk);
        if (e.ranged) this.proj.push({ x: e.x, y: e.y - 40, tg: tg || null, bb: bb || null, tx: tg ? tg.x : bb ? bb.x : DOOR_X, dmg, col: '#b0d040', src: e });
        else if (tg) { this.damage(tg, dmg, '#ff6a6a'); this.fx.push({ k: 'slash', x: tg.x, y: tg.y - 40, t0: T, life: 0.14 }); S.hit(); }
        else if (bb) { this.hitBld(bb, dmg); this.fx.push({ k: 'slash', x: e.x + dir * 40, y: -60, t0: T, life: 0.14 }); S.hit(); }
        else { this.hitPortal(dmg); S.hit(); }
        if (e.boss) this.shake = Math.max(this.shake, 9);
      } else { e.x += dir * sp; e.face = dir; e.walk = (e.walk || 0) + sp; }
    }
    // projectiles (guards, monsters): to a unit, a building, or the main base
    for (let i = this.proj.length - 1; i >= 0; i--) {
      const p = this.proj[i]; if (p.k) continue; const tx = p.tg ? p.tg.x : p.bb ? p.bb.x : p.tx, ty = p.tg ? p.tg.y - 40 : p.bb ? p.bb.y - p.bb.h * 0.5 : -130;
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), v = 900 * dt;
      if (d <= v + 6 || (p.tg && !p.tg.alive) || (p.bb && p.bb.hp <= 0)) { this.proj.splice(i, 1); if (p.tg && p.tg.alive) this.damage(p.tg, p.dmg, p.src.side === 'E' ? '#ff6a6a' : '#fff'); else if (p.bb && p.bb.hp > 0) this.hitBld(p.bb, p.dmg); else if (!p.tg && !p.bb) this.hitPortal(p.dmg); }
      else { p.x += dx / d * v; p.y += dy / d * v; }
    }
    // towers and the main base's crossbows: the monster nearest the main base inside the reach
    const pick = (x, R) => this.ents.filter(o => o.alive && o.side === 'E' && Math.abs(o.x - x) <= R).sort((a, b) => Math.abs(a.x - DOOR_X) - Math.abs(b.x - DOOR_X))[0];
    this.towers.forEach(b => { if (b.hp <= 0) return; b.t -= dt; if (b.t > 0) return; const tg = pick(b.x, b.range); if (!tg) return; b.t = b.w0.cd; b.fireT = T; this.fire[b.c + ',' + b.r] = M.__bvT || 0; this.shoot(b, tg); });
    this.mbBows.forEach(w => { w.t -= dt; if (w.t > 0) return; const tg = pick(w.x, w.range); if (!tg) return; w.t = w.cd; w.fireT = T; this.proj.push({ k: 'bolt', x: w.x, y: w.y, tg, dmg: w.dmg, col: '#ffe08a', speed: 1500 }); S.shoot && S.shoot(); });
    // tower shots in flight
    for (let i = this.proj.length - 1; i >= 0; i--) {
      const p = this.proj[i]; if (!p.k) continue;
      if (p.k === 'shell') { const q = (T - p.t0) / p.dur; if (q >= 1) { this.proj.splice(i, 1); this.splash(p.tx, p.dmg, p.r, '#ffcc33'); continue; } p.x = p.x0 + (p.tx - p.x0) * q; p.y = p.y0 + (-30 - p.y0) * q - Math.sin(q * Math.PI) * 180; continue; }
      const tx = p.tg.x, ty = p.tg.y - 40, dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), v = (p.speed || 1100) * dt;
      if (!p.tg.alive) { this.proj.splice(i, 1); continue; }
      if (d <= v + 8) { this.proj.splice(i, 1); this.damage(p.tg, p.dmg, p.col); if (p.slow) p.tg.slow = Math.max(p.tg.slow || 0, 2); if (p.xs) this.splash(p.tg.x, p.dmg * 0.5, p.xs, '#ffcc33', p.tg); if (p.xc) this.chain(p.tg, p.dmg * 0.5, p.xc); }
      else { p.x += dx / d * v; p.y += dy / d * v; }
    }
    this.shake = Math.max(0, this.shake - dt * 50);
    this.fx = this.fx.filter(f => T - f.t0 < f.life);
    if (this.portal.hp <= 0) { this.portal.hp = 0; this.over = 'lose'; this.overT = 0; this.sum.t = T; }
    else if (this.spawnI >= this.list.length && T - (this.hurtT || 0) > 20) { this.ents.forEach(e => { if (e.alive && e.side === 'E') { e.alive = false; this.float(e.x, e.y - 90, '退走了', '#a9a3c9', 26); } }); this.over = 'win'; this.overT = 0; }
    else if (this.spawnI >= this.list.length && !this.ents.some(e => e.alive && e.side === 'E')) { this.over = 'win'; this.overT = 0; }
  }
  splash(x, dmg, r, col, skip) { this.fx.push({ k: 'boom', x, y: -30, r, t0: this.t, life: 0.45 }); this.ents.forEach(o => { if (o !== skip && o.alive && o.side === 'E' && Math.abs(o.x - x) < r) this.damage(o, dmg * (Math.abs(o.x - x) < r * 0.4 ? 1 : 0.6), col); }); this.shake = Math.max(this.shake, 8); S.boom && S.boom(); }
  chain(from, dmg, n) { let cur = from; const hit = new Set([from]); for (let i = 0; i < n; i++) { const nx = this.ents.filter(o => o.alive && o.side === 'E' && !hit.has(o) && Math.abs(o.x - cur.x) < 260).sort((a, b) => Math.abs(a.x - cur.x) - Math.abs(b.x - cur.x))[0]; if (!nx) break; hit.add(nx); this.fx.push({ k: 'chain', x1: cur.x, y1: cur.y - 40, x2: nx.x, y2: nx.y - 40, t0: this.t, life: 0.25 }); this.damage(nx, dmg * Math.pow(0.8, i), '#8ff6ff'); cur = nx; } }
  shoot(b, tg) {
    const w = b.w0, k = w.kind, x0 = b.x, y0 = ((M.TOWER_TOP || {})[k] || -150) + b.y;
    const xs = w.xSplash || 0, xc = w.xChain || 0;
    if (k === 'shell') { this.proj.push({ k: 'shell', x: x0, y: y0, x0, y0, tx: tg.x, t0: this.t, dur: 0.7, dmg: w.dmg, r: w.splash || 110, col: '#ffa040' }); this.fx.push({ k: 'muzzle', x: x0 + b.side * 40, y: y0, t0: this.t, life: 0.3 }); S.boom && S.boom(); }
    else if (k === 'chain') { this.fx.push({ k: 'chain', x1: x0, y1: y0, x2: tg.x, y2: tg.y - 40, t0: this.t, life: 0.25 }); this.damage(tg, w.dmg, '#8ff6ff'); this.chain(tg, w.dmg, (w.chain || 3) - 1 + xc); S.shoot && S.shoot(); }
    else if (k === 'zeus') { this.fx.push({ k: 'sky', x: tg.x, t0: this.t, life: 0.35 }); this.damage(tg, w.dmg, '#e0f0ff'); this.chain(tg, w.dmg, (w.chain || 4) - 1 + xc); this.shake = Math.max(this.shake, 10); S.boom && S.boom(); }
    else if (k === 'colossus') { this.fx.push({ k: 'fist', x: tg.x, t0: this.t, life: 0.5, sx: x0, sy: y0 }); this.splash(tg.x, w.dmg, w.splash || 140, '#8fe0ff'); this.shake = Math.max(this.shake, 16); }
    else this.proj.push({ k: k === 'arcane' ? 'orb' : 'bolt', x: x0, y: y0, tg, dmg: w.dmg, col: k === 'arcane' ? '#d8a0ff' : '#ffe08a', slow: k === 'arcane' || w.xSlow, xs, xc, speed: k === 'arcane' ? 800 : 1400 });
    if (w.xSlow && k !== 'arcane') this.ents.forEach(o => { if (o.alive && o.side === 'E' && Math.abs(o.x - tg.x) < (xs || w.splash || 60)) o.slow = Math.max(o.slow || 0, 2); });
  }
  draw(ctx, lights) {
    const T = this.t;
    if (this.portal.hit && T - this.portal.hit < 0.15) { ctx.fillStyle = 'rgba(232,67,79,0.35)'; ctx.fillRect(DOOR_X - MB.w / 2, MB.top, MB.w, -MB.top); }
    // the main base's crossbows
    this.mbBows.forEach(w => { const u = w.fireT != null ? T - w.fireT : 9; ctx.fillStyle = P.ink; ctx.fillRect(w.x - 26, w.y - 12, 52, 20); ctx.fillStyle = P.brown; ctx.fillRect(w.x - 23, w.y - 9, 46, 14); ctx.fillStyle = P.tan; ctx.fillRect(w.x + w.side * (10 + (u < 0.15 ? -8 : 0)), w.y - 20, w.side * 30, 6); });
    // units (guards and monsters) use the old painter; buildings are drawn by the town (mc-town.js) with this.bld
    const oldProj = this.proj; this.proj = oldProj.filter(p => !p.k);
    super.draw(ctx, lights);
    this.proj = oldProj;
    oldProj.forEach(p => { if (!p.k) return;
      if (p.k === 'shell') { ctx.fillStyle = P.ink; ctx.fillRect(p.x - 11, p.y - 11, 22, 22); ctx.fillStyle = '#3a3440'; ctx.fillRect(p.x - 8, p.y - 8, 16, 16); lights.push({ x: p.x, y: p.y, r: 60, c: '#ffa040', f: 1 }); }
      else if (p.k === 'orb') { ctx.fillStyle = P.ink; ctx.fillRect(p.x - 12, p.y - 12, 24, 24); ctx.fillStyle = p.col; ctx.fillRect(p.x - 9, p.y - 9, 18, 18); ctx.fillStyle = P.white; ctx.fillRect(p.x - 4, p.y - 4, 8, 8); lights.push({ x: p.x, y: p.y, r: 120, c: p.col, f: 1 }); }
      else { const a = Math.atan2(p.tg.y - 40 - p.y, p.tg.x - p.x); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.fillStyle = P.ink; ctx.fillRect(-20, -4, 40, 8); ctx.fillStyle = p.col; ctx.fillRect(-18, -2, 36, 4); ctx.restore(); }
    });
    this.fx.forEach(f => {
      const d = T - f.t0, q = d / f.life;
      if (f.k === 'collapse') { ctx.save(); ctx.globalAlpha = (1 - q) * 0.7; ctx.fillStyle = '#8a8078'; for (let i = 0; i < 6; i++) { const s = 30 + q * 80; ctx.fillRect(f.x + (i - 2.5) * f.w * 0.25 - s / 2, -20 - q * 60 - (i % 2) * 20 - s / 2, s, s); } ctx.restore(); lights.push({ x: f.x, y: -60, r: 260, c: '#ffa040', f: 1 - q }); }
      if (f.k === 'fist') { ctx.save(); ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#8fe0ff'; ctx.lineWidth = 12 * (1 - q) + 3; ctx.beginPath(); ctx.ellipse(f.x, -12, 40 + q * 180, 10 + q * 30, 0, 0, 7); ctx.stroke(); ctx.fillStyle = '#b87333'; if (q < 0.4) { const y = -300 + q / 0.4 * 280; ctx.fillRect(f.x - 30, y - 40, 60, 60); } ctx.restore(); lights.push({ x: f.x, y: -40, r: 300, c: '#8fe0ff', f: 1 - q }); }
    });
    // the domes: a hex-lined shell over the middle of the town, brighter when hit, flickering out when broken
    this.domes.forEach(D => { if (D.b.hp <= 0) return; const q = D.pool / D.max, hit = T - D.hitT < 0.15, gone = D.pool <= 0; if (gone && Math.floor(T * 10) % 3) return;
      const a = gone ? 0.12 : 0.1 + 0.2 * q + (hit ? 0.3 : 0), ry = D.R * 0.62; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#4af0ff'; ctx.beginPath(); ctx.ellipse(D.x, 0, D.R, ry, 0, Math.PI, 0); ctx.fill();
      ctx.globalAlpha = Math.min(1, a * 2.4); ctx.strokeStyle = hit ? '#ffffff' : '#8ff6ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(D.x, 0, D.R, ry, 0, Math.PI, 0); ctx.stroke();
      ctx.lineWidth = 2; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.ellipse(D.x, 0, D.R * i / 6, ry, 0, Math.PI, 0); ctx.stroke(); } for (let j = 1; j < 4; j++) { const yy = -ry * j / 4, xx = D.R * Math.sqrt(1 - (j / 4) * (j / 4)); ctx.beginPath(); ctx.moveTo(D.x - xx, yy); ctx.lineTo(D.x + xx, yy); ctx.stroke(); }
      ctx.restore(); lights.push({ x: D.x, y: -ry * 0.5, r: D.R * 0.9, c: '#4af0ff', f: 0.3 + 0.4 * q }); });
    // building life bars, only once hurt (the dome shows its shield on its generator)
    Object.values(this.bld).forEach(b => { if (b.hp <= 0 || b.hp >= b.max) return; const w = Math.max(60, b.w * 0.8), y = b.y - b.h - 30; if (U) U.bar(ctx, b.x - w / 2, y, w, 8, b.hp / b.max, { col: b.role === 'wall' ? P.silver : P.gold }); });
    this.domes.forEach(D => { if (D.b.hp <= 0 || D.pool >= D.max) return; const w = 120, y = D.b.y - D.b.h - 48; if (U) U.bar(ctx, D.x - w / 2, y, w, 8, D.pool / D.max, { col: '#4af0ff' }); });
  }
  drawHud(ctx, bv) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const left = this.total - this.spawnI + this.ents.filter(e => e.alive && e.side === 'E').length, towers = this.towers.filter(b => b.hp > 0).length;
    const stat = '剩余敌人 ' + left + '　·　主基地 ' + Math.max(0, Math.round(this.portal.hp)) + '/' + this.portal.max + '　·　防御塔 ' + towers;
    U.plate(ctx, 560, 110, 800, 110, { ring: P.red });
    const glow = RM() ? 1 : 0.5 + 0.5 * Math.cos(this.t * 2 * Math.PI);
    [606, 1296].forEach(lx => { U.box(ctx, lx, 139, 18, 18, P.wine); ctx.save(); ctx.globalAlpha *= glow; U.box(ctx, lx, 139, 18, 18, P.red); ctx.restore(); });
    U.text(ctx, '混沌来袭 · 守住主基地', 960, 148, U.T.title, P.red, { outline: true });
    U.text(ctx, stat, 960, 194, U.T.body, P.cream);
  }
};
// ───────── 加固 (2026-09-27): supplies make a fighting building stronger, three times over ─────────
// With the raids harder (about half the cities fall), what supplies are left after building goes into the fighting line:
// each level gives life +40% and damage +25% (the dome's shield, the barracks' soldiers alike); the cost doubles.
M.FORT = { max: 3, hp: 0.4, dmg: 0.25, cost: [1.5, 3, 6] };
M.fortLv = (m, c, r) => { const x = M.cell(m, c, r); return x && x.b && M.townFights(x.b) ? Math.min(M.FORT.max, x.fort | 0) : 0; };
M.fortCost = (key, lv) => Math.round(((B_[key] && B_[key].cost) || 100) * M.FORT.cost[Math.min(lv, M.FORT.cost.length - 1)]);
M.canFort = (m, c, r) => { const x = M.cell(m, c, r); return !!(x && x.b && M.townFights(x.b) && !x.job && !x.ruin && (x.fort | 0) < M.FORT.max); };
M.fortUp = function (m, c, r) { if (!M.canFort(m, c, r)) return false; const x = M.cell(m, c, r), cost = M.fortCost(x.b, x.fort | 0); if (m.supplies < cost) return false; m.supplies -= cost; x.fort = (x.fort | 0) + 1; return true; };
const ROMAN = ['', 'I', 'II', 'III'];
const oPV = G.panelView;
G.panelView = function () {
  const v = oPV.apply(this, arguments), p = this.panel, m = this.meta, pn = v && v.pn; if (!pn || !p || p.kind !== 'room' || !p.key || !M.townFights(p.key)) return v;
  const lv = M.fortLv(m, p.c, p.r), F = M.FORT, can = M.canFort(m, p.c, p.r), cost = lv < F.max ? M.fortCost(p.key, lv) : 0, ok = can && m.supplies >= cost;
  Object.assign(pn, { fortOn: true, fortTxt: '加固 ' + (lv ? ROMAN[lv] : '无') + ' · 生命 +' + Math.round(F.hp * lv * 100) + '%，伤害 +' + Math.round(F.dmg * lv * 100) + '%', fortCan: can, fortBtn: '加固到 ' + ROMAN[lv + 1] + ' · ' + cost + ' 物资', fortOp: ok ? 1 : 0.45,
    onFort: () => { if (!ok) { this.toast('物资不足', '#ff8a8a'); return; } if (M.fortUp(m, p.c, p.r)) { S.build && S.build(); this.save(); if (this.town) this.townSync(true); const T = this.town && this.town.vis[p.c + ',' + p.r]; if (T) T.fortT = T.riseT = null, T.fortFx = this.town.t; this.toast(B_[p.key].n + ' 加固到 ' + ROMAN[lv + 1], '#ffe08a'); this.bump(); } } });
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) { if (key === 'p-fort') return { title: '加固', c: '#ffcf4a', d: '每一级：生命 +40%，伤害 +25%，最多三级。' }; return oTip.apply(this, arguments); };
// (the 加固 card went with the fighting buildings, 2026-09-26: mc-night.js)
// ───────── 守住的把握 (2026-09-27): the raid ahead, played out in the background ─────────
// Before a 混沌来袭 the timeline says how the town would fare today: the coming raid is played out a few times with no
// drawing and no sound, a slice each frame while the base is idle, again whenever the town changes (a building, 加固, a
// ruin, a direction). Pressure you can see coming: build, reinforce, or take the risk.
const ODDS = { n: 6, ms: 4 };
const od = { sig: '', done: 0, lose: 0, run: null, k: 0, at: 0 };
const oddsSig = (m) => { let s = M.nextRaid(m) + '|' + (m.raids || 0) + '|' + Math.round((m.portal.hp || 0) / 100) + '|' + JSON.stringify(m.dirs || {}); for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (x.b && M.townFights(x.b)) s += ';' + c + r + x.b + (x.fort | 0) + (x.ruin ? 'r' : '') + (x.job ? 'j' : ''); } return s; };
M.raidOdds = function (m) { return od.m === m && od.done >= ODDS.n ? od.lose / od.done : null; };
function oddsStep(g) {
  const m = g.meta; if (!m || !m.base || !m.portal) return; const t = now(); if (t - od.at > 500) { od.at = t; const sig = oddsSig(m); if (sig !== od.sig || od.m !== m) Object.assign(od, { sig, m, done: 0, lose: 0, run: null }); }
  if (od.done >= ODDS.n) return;
  const quiet = M.Sfx.muted; M.Sfx.muted = true;
  try {
    if (!od.run) { const c = JSON.parse(JSON.stringify(m)), day = M.nextRaid(m), mx = M.portalMax(c); c.day = day; c.portal.hp = Math.min(mx, c.portal.hp + mx * 0.15 * Math.max(0, day - m.day)); od.run = new M.Raid(c); od.k = 0; }
    const R = od.run, t0 = now(); while (!R.over && od.k < 30 * 300 && now() - t0 < ODDS.ms) { for (let i = 0; i < 20 && !R.over; i++) { R.step(1 / 30); od.k++; } }
    if (R.over || od.k >= 30 * 300) { od.done++; if (R.over === 'lose') od.lose++; od.run = null; }
  } catch (e) { od.done = ODDS.n; od.run = null; } finally { M.Sfx.muted = quiet; }
}
const oTickO = G.tick;
G.tick = function (dt) { const r = oTickO.apply(this, arguments); if (this.screen === 'base' && !this.raid && !(this.baseBusy && this.baseBusy()) && !this.dirPick && !this.visit) oddsStep(this); return r; };
M.raidOddsLine = function (m) {
  const p = M.raidOdds(m); if (p == null) return { t: '守住的把握：推演中……', c: '#a9a3c9' };
  return p <= 0.1 ? { t: '守住的把握：很大', c: '#9cff7a' } : p <= 0.35 ? { t: '守住的把握：较大', c: '#d8f0a0' } : p <= 0.65 ? { t: '守住的把握：一半一半', c: '#ffcf4a' } : p <= 0.9 ? { t: '守住的把握：很小', c: '#ff8a6a' } : { t: '守住的把握：几乎没有', c: '#ff5a4a' };
};
const oViewO = G.view;
G.view = function () { const v = oViewO.call(this), m = this.meta; if (v.b && m && v.raidTip && this.screen === 'base') v.raidTip = this.tipFn(() => ({ title: '混沌来袭', c: '#ff6a5a', d: '第 ' + M.nextRaid(m) + ' 天夜里，怪物攻打主基地。', lines: [M.raidOddsLine(m)] })); return v; };
M.RaidTown = M.Raid;
// the reckoning when the game ends there: how long the town held and what fell (user ruling 2026-09-27: 输了之后会进行反思)
const oGO = G.gameOver;
if (oGO) G.gameOver = function (reason) { const sum = reason === 'portal' ? this.overSum : null; this.overSum = null; const r = oGO.apply(this, arguments); if (sum && this.modal && this.modal.over) this.modal.text += '\n' + sum; return r; };
// a defence blueprint (wall, tower or barracks), mostly common: the raid reward leans this way so a town can arm itself
// a boss building only comes from its own boss (mc-scenes.js): the plain blueprint pools let them slip out (2026-09-27 drop count)
const oDropB = M.dropBp;
// …and a one-of-a-kind building is not dropped twice on the same trip (2026-09-27: two 水培农场 on one trip)
const onTrip = (k) => { const g = M._g, bp = g && g.run && g.run.loot && g.run.loot.bp; return !!bp && bp.includes(k) && M.bUnique(k.slice(4)); };
M.dropBp = function () { for (let i = 0; i < 12; i++) { const k = oDropB.apply(this, arguments); if (!(k && k.startsWith('bbp:') && B_[k.slice(4)] && (B_[k.slice(4)].boss || onTrip(k)))) return k; } return M.defBp(); };
M.defBp = function () { const ks = Object.keys(B_).filter(k => !B_[k].fixed && !B_[k].gone && !B_[k].boss && ['wall', 'tower', 'guard', 'shield'].includes(M.townRole(k))); return 'bbp:' + M.wpick(ks, k => [6, 2, 1, 0.4][B_[k].q || 0]); };
// the camera takes in the whole town, the ground low on the screen
const BVP = M.BaseView.prototype;
BVP.raidCam = function () { const span = (M.townSpan || 1400) + 1200, z = cl(1920 / span, 0.45, 0.95); this.sel = null; this.free = null; this.tx = DOOR_X; this.tz = z; this.ty = -290 / z + 60; };
// the director frames the whole town and everything alive, the ground low on the screen (the towers and their rooms
// both show); when it is over it settles on the main base
G.raidDirector = function (dt) {
  const r = this.raid, bv = this.bv; if (!r || r.done) { this._rc = null; return; }
  let x0 = (r.edgeL != null ? r.edgeL : DOOR_X - 700) - 180, x1 = (r.edgeR != null ? r.edgeR : DOOR_X + 700) + 180;
  r.ents.forEach(e => { if (e.alive) { x0 = Math.min(x0, e.x - 140); x1 = Math.max(x1, e.x + 140); } });
  const z = cl(1920 / (x1 - x0), 0.42, 1.0), T = r.over ? { x: DOOR_X, y: -150, z: 0.9 } : { x: (x0 + x1) / 2, y: -170 / z + 30, z };
  const c = this._rc || (this._rc = { x: bv.x, y: bv.y, z: bv.z }), k = 1 - Math.exp(-dt * 2.2);
  c.x += (T.x - c.x) * k; c.y += (T.y - c.y) * k; c.z += (T.z - c.z) * k;
  bv.tx = c.x; bv.ty = c.y; bv.tz = c.z; bv.sel = null; bv.free = null;
};
// after the raid: what fell is in ruins (its room stops working until repaired)
const oRE = G.raidEnd;
G.raidEnd = function () {
  const r = this.raid, m = this.meta;
  if (r && r.over === 'lose' && !r.done) { const s = r.sum || {}, fell = [...new Set(s.fell || [])]; this.overSum = '守了 ' + Math.round(s.t || r.t) + ' 秒 · 击退 ' + r.kills + ' / ' + r.total + (fell.length ? ' · 倒下：' + fell.slice(0, 4).join('、') + (fell.length > 4 ? ' 等 ' + fell.length + ' 座' : '') : ' · 没有一座防御建筑挡住它们'); }
  if (r && r.ruined && !r.done) { r.ruinedN = []; r.ruined.forEach(b => { const x = M.cell(m, b.c, b.r); if (x && x.b === b.key && !x.ruin) { x.ruin = true; r.ruinedN.push(B_[b.key].n); } }); }
  const res = oRE.apply(this, arguments);
  if (this.town) this.townSync(true);
  return res;
};
})();

;
