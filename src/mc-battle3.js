// ==== mc-battle3.js ====
(function () {
const M = window.MC;
const DB = M.DB, TDB = M.TDB, { Sfx, fmt, pick, HEROES } = M;
const FW = 1920, FH = 720, HERO_POS = { x: 90, y: 400 };
const RX = 75, RS = 125, RM = 195, RL = 330;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.2);
const RCOL = M.RACES, QS = M.QSIZE;
const eng = (s) => (String(s).match(/[A-Z][A-Za-z]+/g) || []).filter(k => DB[k]);
const radOf = (d) => /极小/.test(d) ? RX : /小范围/.test(d) ? RS : /大范围/.test(d) ? RL : RM;
// ───────── trait handlers ─────────
const H = {};
const manaT = (rate) => (b, e, v, dt) => b.mana(e, v[rate] * dt, true);
H.DeadCoin = { death(b, e, k, v) { const g = Math.round(e.maxHp * v[0] * 4 / 100); b.gainBase(g, e, '美味'); b.coins(e.x, e.y - 40, 10); } };
H.TreasureHunt = { init(b, e, v) { e.st.th = Math.random() < v[0] / 100; if (e.st.th) e.icon = '✦'; }, start(b, e) { if (!e.st.th) return; e.icon = null; const g = Math.round(b.cfg.budget * 0.12 + 8); b.gainBase(g, e, '寻宝'); b.coins(e.x, e.y - 50, 16); b.fxp({ k: 'rays', x: e.x, y: e.y - 50, col: '#ffcc33', life: 0.8, r: 120 }); Sfx.coin(); } };
H.Acrobatics = { dealt(b, e, tg, d, v, c) { if (c.auto) b.mana(e, v[0]); }, tick(b, e, v) { e.asDyn += Math.floor(e.mana / v[1]) * v[2] / 100; } };
H.IonicForce = { tick(b, e, v, dt) { b.mana(e, v[0] * dt, true); e.asDyn += Math.floor(e.mana / v[1]) * v[2] / 100; }, noFull: 1 };
H.ManaScaling = { tick(b, e, v) { e.asDyn += Math.floor(e.mana / 10) * v[1] / 100; } };
H.Dominion = { init(b, e, v) { e.def += v[0] / 100; }, tick(b, e, v) { const n = b.allies(e).filter(o => o !== e && dist(o, e) < RX * 1.3 && o.pw >= e.pw).length; e.atkDyn -= n * v[2] / 100; e.defDyn -= n * v[2] / 100; e.st.dn = n; } };
H.Entourage = { tick(b, e, v) { const n = b.allies(e).filter(o => o !== e && dist(o, e) < RS && o.pw > e.pw).length; e.atkDyn += n * v[0] / 100; e.defDyn += n * v[0] / 100; if (n && Math.random() < 0.02) b.link(e, b.allies(e).find(o => o !== e && dist(o, e) < RS && o.pw > e.pw), '#ffcc33'); } };
H.ChainHeal = { tick: manaT(0), full(b, e, v) { let cur = b.lowest(e), done = new Set(), prev = e; for (let i = 0; i <= v[2] && cur; i++) { done.add(cur); b.heal(cur, e.atk * v[1] / 100, '#7fff9a'); b.fxp({ k: 'arc', x1: prev.x, y1: prev.y - 40, x2: cur.x, y2: cur.y - 40, col: '#7fff9a', life: 0.35 }); prev = cur; cur = b.allies(e).filter(o => !done.has(o) && o.hp < o.maxHp && dist(o, prev) < RM * 1.4).sort((a, c) => dist(a, prev) - dist(c, prev))[0]; } Sfx.heal(); } };
H.TreatmentChain = { start(b, e, v) { const t = b.allies(e).sort((a, c) => c.maxHp - a.maxHp)[0]; if (!t) return; const add = v[0] * 0.6; t.maxHp += add; t.hp += add; b.fxp({ k: 'dome', ent: t, col: '#9cff7a', life: 1.2 }); b.float(t.x, t.y - 110, '盖亚之盾 +' + fmt(add), '#9cff7a', 30); b.fxp({ k: 'arc', x1: e.x, y1: e.y - 40, x2: t.x, y2: t.y - 40, col: '#9cff7a', life: 0.5 }); Sfx.heal(); } };
H.ChargeAttackNew = { start(b, e, v) { const tg = b.nearestFoe(e, 2000); if (!tg) return; e.leap = { x0: e.x, y0: e.y, x1: tg.x - 60, y1: tg.y, t0: b.t, dur: 0.5 }; e.stun = 0.55; b.later(0.5, () => { e.x = tg.x - 60; e.y = tg.y; e.leap = null; b.aoe(e, e.x + 30, e.y, RM, e.maxHp * v[0] / 100 * 4, '#ffb060'); b.fxp({ k: 'boom', x: e.x + 30, y: e.y - 10, life: 0.45 }); b.ring(e.x + 30, e.y - 10, 20, RM, '#ffd080', 12, 0.4); b.shake = Math.max(b.shake, 18); Sfx.impact(); b.dust(e.x, e.y, 20); }); Sfx.whoosh(0.4); } };
H.JuniorFisherman = { near(b, e, vic, v) { if (dist(e, vic) < RS * 1.4) b.mana(e, v[0] * 4); }, full(b, e) { b.evolve(e); }, post(b, e, v, u) { if (u && u.battles >= v[1]) b.evolveU(u); }, noAuto: 1 };
H.EliteFisherman = { near(b, e, vic) { if (dist(e, vic) < RS * 1.4) b.mana(e, 5); }, tick(b, e, v) { const n = Math.floor(e.mana / v[0]); const add = n - (e.st.ef || 0); if (add > 0) { e.st.ef = n; e.maxHp += add * v[1]; e.hp += add * v[1]; e.atk += add * v[2]; } }, noFull: 1 };
H.Ambush = { init(b, e) { e.stealth = true; }, pick(b, e) { if (!e.stealth) return null; return b.foes(e).filter(o => o.ranged).sort((a, c) => c.x - a.x)[0] || null; }, atk(b, e, tg, v, c) { if (e.stealth) { e.stealth = false; c.mul *= v[0] / 100; c.skill = true; c.ambush = true; b.fxp({ k: 'xslash', x: tg.x, y: tg.y - 40, col: '#c890ff', life: 0.4 }); b.shake = Math.max(b.shake, 12); Sfx.crit(); b.float(tg.x, tg.y - 120, '伏击！', '#d8a0ff', 40); } } };
H.ShellShock = { tick: manaT(0), full(b, e, v) { const tg = e.target || b.nearestFoe(e, 900); if (!tg) return; b.shell(e, tg, () => { b.aoe(e, tg.x, tg.y, RS, e.atk * v[1] / 100 * 3, '#ffa040', o => { o.slowAS = Math.max(o.slowAS, v[2] / 100 * 3); o.slowT = b.t + v[3]; }); b.fxp({ k: 'boom', x: tg.x, y: tg.y - 20, life: 0.45 }); Sfx.boom(); }); } };
H.ResonanceAura = { aura: { r: RM, col: '#7fff9a', ally: 1, fn(b, e, o, v, dt) { o.au.def += v[1] / 100; o.au.regen = Math.max(o.au.regen, v[0] / 100); } } };
H.MutiHit = { init(b, e, v) { e.combo += v[0]; } };
H.Invigorate = { tick: manaT(0), full(b, e, v) { e.buffs.push({ as: 1, until: b.t + 5, regen: e.atk * v[2] / 100 + 0, col: '#ff6a4a' }); b.fxp({ k: 'rays', x: e.x, y: e.y - 40, col: '#ff6a4a', life: 0.6, r: 110 }); b.float(e.x, e.y - 110, '鼓舞！', '#ff8a6a', 30); Sfx.up(1); } };
H.BurstAttack = { dealt(b, e, tg, d, v, c) { if (!c.echo && tg.alive) b.deal(e, tg, tg.maxHp * v[0] * 12 / 100, { skill: 1, echo: 1, col: '#d890ff', small: 1 }); } };
H.Incubation = { post(b, e, v, u) { if (u && u.battles >= v[0]) b.evolveU(u, 'GiantGodOfWar'); } };
H.ReboundDamage = { hurt(b, e, src, d, v, c) { if (src && src.alive && !c.reflect) { const r = e.maxHp * v[0] / 100 + (v[1] ? d * v[1] / 100 : 0); b.later(0.05, () => b.deal(e, src, r, { skill: 1, reflect: 1, col: '#9cff7a', small: 1 })); if (Math.random() < 0.4) b.fxp({ k: 'thorn', x: e.x, y: e.y - 40, col: '#9cff7a', life: 0.3 }); } return d; } };
H.Eggsplosion = { death(b, e, k, v) { b.aoe(e, e.x, e.y, RS, e.maxHp * v[0] / 100, '#8fe0ff'); b.fxp({ k: 'boom', x: e.x, y: e.y - 30, life: 0.5, col: '#8fe0ff' }); Sfx.boom(); } };
H.DeadSummon = { death(b, e, k, v, T) { const s = eng(T.d)[0]; if (!s) return; for (let i = 0; i < (v[0] || 1); i++) b.later(0.2 + i * 0.12, () => b.summon(s, e.side, e.x + (i - 1) * 40, e.y + (i % 2 ? 30 : -30), 999, e)); } };
H.BoneRegeneration = { tick(b, e, v, dt) { b.regen(e, (e.maxHp - e.hp) * v[0] / 100 * dt, '#e8e0cc'); } };
H.MindWarp = { tick: manaT(0), full(b, e, v) { const t = b.allies(e).filter(o => o !== e).sort((a, c) => c.atk - a.atk)[0]; if (!t) return; t.buffs.push({ as: v[1] / 100, until: b.t + v[2] / 1000, col: '#c890ff' }); b.orb(e, t, '#c890ff'); } };
H.FlamingArrows = { init(b, e) { e.mana = 100; }, dealt(b, e, tg, d, v, c) { if (c.auto && e.mana >= v[1] && tg.alive) { e.mana -= v[1]; b.deal(e, tg, e.atk * v[2] / 100, { skill: 1, col: /Plasma|虚空/.test(e.d.race) ? '#c890ff' : '#ff8a3a' }); b.burst(tg.x, tg.y - 40, e.d.race === '虚空' ? '#c890ff' : '#ff8a3a', 6); } }, noFull: 1, proj: 'fire' };
H.Stoneskin = { hurt(b, e, s, d, v) { if (Math.random() < 0.25) b.burst(e.x, e.y - 40, '#b8b0a8', 3); return d * (1 - v[0] / 100); } };
H.Summon = { tick(b, e, v, dt, T) { if (!/每次攻击/.test(T.d)) b.mana(e, v[0] * dt, true); }, dealt(b, e, tg, d, v, c, T) { if (c.auto && /每次攻击/.test(T.d)) b.mana(e, v[0]); }, full(b, e, v, T) { const s = eng(T.d), n = /召唤2/.test(T.d) ? 2 : 1, life = v[v.length - 1] || 40; b.fxp({ k: 'circle', x: e.x + 70, y: e.y + 6, col: RCOL[e.d.race] || '#c890ff', life: 1.1 }); for (let i = 0; i < n; i++) b.later(0.35 + i * 0.15, () => b.summon(s[0], e.side, e.x + 70, e.y + (i ? 40 : 0), life, e)); Sfx.portal(); } };
H.DimensionalRift = { tick: manaT(0), full(b, e, v, T) { const s = eng(T.d); e.hp = Math.max(1, e.hp - v[1]); b.fxp({ k: 'rift', x: e.x + 80, y: e.y - 40, life: 1.4 }); s.forEach((k, i) => b.later(0.4 + i * 0.2, () => b.summon(k, e.side, e.x + 80, e.y + (i ? 40 : -20), v[v.length - 1] || 60, e))); Sfx.portal(); } };
H.Leech = { aura: { r: RM, col: '#ff4a5a', ally: 1, fn(b, e, o, v) { o.au.leech = Math.max(o.au.leech, v[0] / 100); } } };
H.SkullStew = { tick: manaT(0), full(b, e, v) { const t = b.lowest(e); if (t) { b.heal(t, t.maxHp * v[1] / 100, '#b8ff80'); b.orb(e, t, '#b8ff80'); } } };
H.Fatality = { dealt(b, e, tg, d, v, c) { if (c.auto) { e.atk += v[0]; e.st.fat = (e.st.fat || 0) + v[0]; } }, end(b, e) { if (e.unit && e.st.fat) e.unit.bAtk += Math.round(e.st.fat * 0.15); } };
H.EnergyRegenOnKill = { kill(b, e, vic, v) { b.mana(e, v[0]); b.soul(vic, e); } };
H.Necromancy = { near(b, e, vic, v) { if (dist(e, vic) < RL) { b.mana(e, v[0]); b.soul(vic, e); } } };
H.UnchainedRage = { tick(b, e, v) { if (e.hp < e.maxHp * v[0] / 100) { e.asDyn += v[1] / 100; e.raging = 1; } else e.raging = 0; } };
H.RangedDamageReduction = { hurt(b, e, s, d, v, c) { if (c.ranged) { if (Math.random() < 0.3) b.fxp({ k: 'dome', ent: e, col: '#9fc8ff', life: 0.25 }); return d * (1 - v[0] / 100); } return d; } };
H.ManaBlessing = { tick(b, e, v, dt) { b.mana(e, v[0] * dt, true); e.st.mb = (e.st.mb || 0) + dt; if (e.st.mb >= 1 && e.mana >= v[2]) { e.st.mb = 0; const t = b.allies(e).filter(o => o !== e && o.hasMana && !o.traits.some(x => x.cls === 'ManaBlessing') && o.mana < 100).sort((a, c) => a.mana - c.mana)[0]; if (t) { e.mana -= v[2]; b.mana(t, v[3]); b.orb(e, t, '#6fb8ff'); } } }, noFull: 1 };
H.Blessing = { tick(b, e) { if (e.mana >= 100) { e.mana = 0; e.buffs.push({ as: 0.2, def: 0.2, until: b.t + 5, col: '#ffe08a' }); b.fxp({ k: 'halo', ent: e, col: '#ffe08a', life: 5 }); Sfx.sparkle(); } } };
H.Dartle = { dealt(b, e, tg, d, v, c) { if (!c.auto) return; b.foes(e).filter(o => o !== tg && dist(o, tg) < RS).slice(0, v[0]).forEach(o => b.shootP(e, o, { dmg: e.atk * v[1] / 100, skill: 1, from: tg, style: 'spark', col: RCOL[e.d.race] })); } };
H.Duelist = { dealt(b, e, tg, d, v, c) { if (!c.auto || !tg.alive) return; if (e.st.dt !== tg) { e.st.dt = tg; e.st.ds = 0; } e.st.ds = Math.min(v[1], e.st.ds + 1); tg.stack = { n: e.st.ds, col: '#ff9a6a', until: b.t + 1.5 }; b.deal(e, tg, e.atk * v[0] / 100 * e.st.ds, { skill: 1, col: '#ff9a6a', small: e.st.ds < 5 }); } };
H.SolarFlare = { tick: manaT(0), full(b, e, v) { e.buffs.push({ as: v[1] / 100, until: b.t + v[2], col: '#ffd060' }); b.fxp({ k: 'sun', ent: e, life: v[2] }); Sfx.sparkle(); } };
H.FinalJudgment = { dealt(b, e, tg, d, v, c) { if (!c.auto) return; if (e.st.jd > 0) { e.st.jd--; const r = /中范围/.test(c.T.d) ? RM : RS; b.aoe(e, tg.x, tg.y, r, e.atk * v[4] / 100 * 2, '#fff2a0'); b.ring(tg.x, tg.y - 20, 10, r, '#fff2a0', 6, 0.3); } else b.mana(e, v[0]); }, hurt(b, e, s, d, v) { b.mana(e, v[1]); return d; }, full(b, e, v) { e.st.jd = v[3]; b.fxp({ k: 'pillar', x: e.x, w: 60, col: '#fff2a0', life: 0.7 }); b.float(e.x, e.y - 120, '审判！', '#fff2a0', 34); Sfx.cast(); } };
H.DeadDamageTarget = { death(b, e, k, v) { if (k && k.alive) { b.fxp({ k: 'beam2', x1: e.x, y1: e.y - 40, x2: k.x, y2: k.y - 40, col: '#b8ff60', life: 0.4 }); b.later(0.15, () => { b.deal(e, k, e.atk * v[0] / 100, { skill: 1, col: '#b8ff60' }); b.fxp({ k: 'boom', x: k.x, y: k.y - 30, life: 0.4, col: '#b8ff60' }); }); Sfx.boom(); } } };
H.BossSlayer = { dealt(b, e, tg, d, v, c) { if (c.auto && tg.alive) b.deal(e, tg, e.atk * v[0] / 100, { skill: 1, col: /燃烧/.test(c.T.n) ? '#ff8a3a' : '#ffe08a', small: 1 }); } };
H.SubDefence = { dealt(b, e, tg, d, v, c) { if (!c.auto || !tg.alive) return; const k = c.T.key, D = tg.debuf[k] || (tg.debuf[k] = { v: v[0] / 100, n: 0, until: 0 }); const max = /不叠加/.test(c.T.d) ? 1 : (v[2] || v[3] || 10); D.n = Math.min(max, D.n + 1); D.until = b.t + (v[1] || 3); if (Math.random() < 0.35) b.fxp({ k: 'shard', x: tg.x, y: tg.y - 40, col: '#9fc8ff', life: 0.35 }); } };
H.CellRegrowth = { init(b, e) { e.hp *= 0.6; }, tick(b, e, v, dt) { b.regen(e, (e.maxHp - e.hp) * v[1] / 100 * dt * 3, '#7fff9a'); } };
H.Fragrance = { tick(b, e, v, dt) { e.st.fr = (e.st.fr || 0) + dt; if (e.st.fr >= 1) { e.st.fr = 0; b.foes(e).filter(o => dist(o, e) < RS).forEach(o => b.deal(e, o, e.maxHp * v[0] / 100 + o.maxHp * v[1] / 100, { skill: 1, col: '#c0ff80', small: 1 })); b.fxp({ k: 'gas', x: e.x, y: e.y - 20, r: RS, col: '#b8ff80', life: 1 }); } } };
H.ThickHide = { aura: { r: RM, col: '#c8a070', ally: 1, fn(b, e, o, v) { o.au.def += v[0] / 100; } } };
H.Ejection = { dealt(b, e, tg, d, v, c) { if (!c.auto) return; b.foes(e).filter(o => o !== tg && dist(o, tg) < RS * 1.3).slice(0, v[0] || 1).forEach(o => b.shootP(e, o, { dmg: e.atk, skill: 0, from: tg, style: 'water', col: '#6fe0ff' })); }, proj: 'water' };
H.LightningStrike = { tick: manaT(0), full(b, e, v) { let prev = e, done = new Set(); for (let i = 0; i < v[1]; i++) { const c = b.foes(e).filter(o => !done.has(o)).sort((a, x) => dist(a, prev) - dist(x, prev))[0]; if (!c) break; done.add(c); const p = prev; b.later(i * 0.07, () => { b.fxp({ k: 'arc', x1: p.x, y1: p.y - 40, x2: c.x, y2: c.y - 40, col: '#bfe8ff', life: 0.3, w: 7 }); b.deal(e, c, e.atk * v[2] / 100 + c.maxHp * v[3] / 100, { skill: 1, col: '#bfe8ff' }); }); prev = c; } b.flash = Math.max(b.flash, 0.2); b.flashCol = '#d0e8ff'; Sfx.bolt(1); } };
H.Harden = { init(b, e, v) { if (Math.random() < v[0] / 100) { e.def += v[1] / 100; e.st.hard = 1; } }, start(b, e) { if (e.st.hard) { b.fxp({ k: 'glint', ent: e, life: 0.6 }); b.float(e.x, e.y - 110, '硬化', '#d8e0ea', 28); } } };
H.WaterSpoutNew = { tick: manaT(0), full(b, e, v, T) { const tg = e.target || b.nearestFoe(e, 1200); if (!tg) return; const ast = /小行星/.test(T.n); b.fxp({ k: ast ? 'meteor' : 'spout', x: tg.x, y: tg.y, life: 0.6 }); b.later(0.35, () => { b.deal(e, tg, e.atk * v[1] / 100 + (ast ? e.maxHp * (v[2] || 0) / 100 : 0), { skill: 1, col: ast ? '#ff9a3a' : '#6fe0ff', big: 1 }); b.shake = Math.max(b.shake, 10); if (ast) Sfx.impact(); else Sfx.boom(); }); } };
H.AmplifyMagic = { aura: { r: RM, col: '#6fb8ff', ally: 1, fn(b, e, o, v) { o.au.mreg += v[0] / 100; } } };
H.MoltenShield = { tick: manaT(0), hurt(b, e, s, d, v, c) { if (e.mana >= v[1]) { e.mana -= v[1]; e.shieldFx = b.t; return d * (1 - v[2] / 100); } return d; }, noFull: 1 };
H.EnergyAddSurge = { atk(b, e, tg, v, c) { c.mul *= 1 + (100 - e.mana) / v[0] * v[1] / 100; } };
H.Stimpack = { init(b, e, v) { if (Math.random() < v[0] / 100) { e.asB += v[1] / 100; e.range += v[2] * 0.35; e.st.stim = 1; } }, start(b, e) { if (e.st.stim) { b.float(e.x, e.y - 110, '兴奋剂！', '#9cff7a', 28); b.ring(e.x, e.y - 40, 10, 90, '#9cff7a', 6, 0.4); Sfx.up(0); } } };
H.EnergySurge = { dealt(b, e, tg, d, v, c) { if (c.auto) b.mana(e, v[0]); }, full(b, e, v) { const tg = e.target; if (!tg || !tg.alive) { e.mana = 99; return; } b.fxp({ k: 'beam2', x1: e.x + 20, y1: e.y - 50, x2: tg.x, y2: tg.y - 40, col: '#b0a0ff', life: 0.45, w: 18 }); b.deal(e, tg, e.atk * v[1] / 100, { skill: 1, col: '#c8b0ff', big: 1 }); b.shake = Math.max(b.shake, 8); Sfx.bolt(0); } };
H.Sputtering = { dealt(b, e, tg, d, v, c) { if (!c.auto) return; const r = radOf(c.T.d), col = /飞叶/.test(c.T.n) ? '#b8ff60' : e.d.race === '虚空' ? '#c890ff' : '#ffa040'; b.aoe(e, tg.x, tg.y, r, e.atk * v[0] / 100, col, null, tg); b.ring(tg.x, tg.y - 20, 10, r, col, 5, 0.25); } };
H.PiercingPulse = { tick(b, e, v, dt, T) { e.st.pp = (e.st.pp || 0) + dt; if (e.st.pp < v[0]) return; e.st.pp = 0; const bomb = /投弹/.test(T.n); b.foes(e).filter(o => dist(o, e) < RL * 1.6).sort(() => Math.random() - 0.5).slice(0, v[1]).forEach(o => { if (bomb) { b.fxp({ k: 'bomb', x: o.x, y: o.y, life: 0.4 }); b.later(0.35, () => { b.deal(e, o, e.atk * v[2] / 100, { skill: 1, col: '#ffa040' }); b.fxp({ k: 'boom', x: o.x, y: o.y - 20, life: 0.35 }); }); } else b.shootP(e, o, { dmg: e.atk * v[2] / 100, skill: 1, style: 'bullet', col: '#fff2a0', speed: 2200 }); }); if (!bomb) Sfx.shoot(); } };
H.AerialCommand = { aura: { r: RM, col: '#ff7a5a', ally: 1, fn(b, e, o, v) { o.au.dmg += v[0] / 100; } } };
H.AttackSpeedAura = { aura: { r: RM, col: '#ffe060', ally: 1, fn(b, e, o, v) { o.au.as += v[0] / 100; } } };
H.ExplosiveShells = { kill(b, e, vic, v) { b.aoe(e, vic.x, vic.y, RM, e.atk * v[0] * 4 / 100, '#ffb040'); b.fxp({ k: 'boom', x: vic.x, y: vic.y - 30, life: 0.5 }); b.shake = Math.max(b.shake, 10); Sfx.boom(); } };
H.Tantrum = { init(b, e, v) { if (Math.random() < v[0] / 100) { e.asB += v[1] / 100; e.st.tan = 1; } }, start(b, e) { if (e.st.tan) { b.float(e.x, e.y - 110, '发脾气！', '#ff6a4a', 28); b.burst(e.x, e.y - 60, '#ff6a4a', 10); } } };
H.ShortSelling = { init(b, e, v) { if (Math.random() < v[0] / 100) { e.asB += v[1] / 100; e.st.ss = 1; } }, start(b, e) { if (e.st.ss) b.float(e.x, e.y - 110, '卖空 ↑', '#9cff7a', 28); } };
H.SpiritOffering = { near(b, e, vic, v) { if (dist(e, vic) > RS * 1.4) return; if ((e.unit ? e.unit.lv : 1) >= v[1]) { b.heal(e, e.maxHp * v[4] / 100, '#c890ff'); return; } b.mana(e, v[0]); b.soul(vic, e); }, full(b, e, v) { const u = e.unit; if (!u || u.lv >= v[1]) return; u.lv++; u.bHp += v[2]; u.bAtk += v[3]; e.maxHp += v[2]; e.hp += v[2]; e.atk += v[3]; b.levelUp(e, 'Lv ' + u.lv); } };
H.ArmWithShuriken = { init(b, e, v) { const u = e.unit; if (u) { if (u.boom == null) u.boom = 1; if (Math.random() < 0.2 && u.boom < v[2]) u.boom++; } }, start(b, e, v) { const n = e.unit ? e.unit.boom : 1; for (let i = 0; i < n; i++) b.later(i * 0.15, () => { const s = b.summon('BoomSoldier', e.side, e.x + 30, e.y + (i - n / 2) * 30, 20, e); if (s) s.atk = e.atk * 1.5; }); } };
H.SelfDestructInfantry = { atk(b, e, tg, v, c) { c.cancel = 1; b.aoe(e, e.x, e.y, RX, e.atk * v[0] / 100 + 1, '#ffa040'); b.fxp({ k: 'boom', x: e.x, y: e.y - 20, life: 0.35 }); Sfx.boom(); e.hp = 0; b.kill(e, null); } };
H.SpeedBoost = { death(b, e, k, v) { if (e.st.rev) return; e.st.rev = 1; b.fxp({ k: 'tomb', x: e.x, y: e.y, life: v[0] }); b.later(v[0], () => { e.alive = true; e.hp = e.maxHp; e.asB += v[1] / 100; e.readyAt = b.t; b.fxp({ k: 'pillar', x: e.x, w: 50, col: '#ff9a6a', life: 0.6 }); b.float(e.x, e.y - 120, '复活！', '#ff9a6a', 34); Sfx.up(2); }); return 'keep'; } };
H.WintryTouch = { aura: { r: RL, col: '#bfe8ff', foe: 1, fn(b, e, o, v, dt) { o.au.slow = Math.max(o.au.slow, v[0] / 100 * 5); o.au.frost = 1; if (dt) b.deal(e, o, e.maxHp * v[1] / 100 * dt * 2, { skill: 1, silent: 1 }); } } };
H.NimbleFeet = { init(b, e, v) { e.dodge += v[0] / 100; } };
H.UnyieldingSpirit = { init(b, e, v) { e.dodge += v[0] / 100; }, dodged(b, e, v) { const k = e.unit && e.unit.battles >= 11 ? 2 : 1; e.maxHp += v[1] * k; e.hp += v[1] * k; e.atk += v[2] * k; if (e.unit) { e.unit.bHp += v[1] * k; e.unit.bAtk += v[2] * k; } b.float(e.x + 20, e.y - 90, '+' + v[1] * k, '#7fff9a', 20); } };
H.Blooming = { post(b, e, v, u) { if (!u) return; const k = u.battles >= 11 ? 3 : 1; u.bHp += v[0] * k; u.bAtk += v[1] * k; u.lv++; b.growLog.push(DB[u.type].n + ' 绽放：生命 +' + v[0] * k + '，攻击 +' + v[1] * k); } };
H.LifeBindVow = { tick: manaT(0), full(b, e, v) { const t = b.allies(e).filter(o => o !== e && !o.traits.some(x => x.cls === 'LifeBindVow') && o.hp < o.maxHp).sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0]; if (!t) { e.mana = 90; return; } e.hp = Math.max(1, e.hp - e.atk * v[1] / 100); b.fxp({ k: 'beam2', x1: e.x, y1: e.y - 40, x2: t.x, y2: t.y - 40, col: '#ff7a9a', life: 0.45, w: 10 }); b.heal(t, e.atk * v[2] / 100, '#ff9ab0'); Sfx.heal(); } };
H.IronHail = { tick: manaT(0), full(b, e, v) { const tg = e.target || b.nearestFoe(e, 900); if (!tg) return; const x = tg.x, y = tg.y; b.fxp({ k: 'rain', x, y, life: 0.9 }); [0.25, 0.55].forEach(t => b.later(t, () => { b.aoe(e, x, y, RS, e.atk * v[1] / 100, '#d8e0ea', o => { o.dmgDown = Math.min((o.dmgDown || 0) + v[3] * 10, v[5] * v[3] * 10); o.dmgDownT = b.t + v[4]; }); Sfx.hit(); })); } };
H.ShadowBreeder = { dealt(b, e, tg, d, v, c, T) { if (!c.auto) return; e.st.sb = (e.st.sb || 0) + 1; if (e.st.sb >= v[0]) { e.st.sb = 0; const k = /超级/.test(T.d) ? 'ShadowKnightReplicator' : 'ShadowSwordsmanReplicator'; b.fxp({ k: 'circle', x: e.x - 40, y: e.y + 6, col: '#6a4a9a', life: 0.8 }); b.later(0.2, () => b.summon(k, e.side, e.x - 40, e.y, v[1], e)); } } };
H.Exuberance = { init(b, e, v) { const n = e.unit ? e.unit.battles : 0, p = Math.max(0, v[0] - v[1] * n) / 100; e.atk *= 1 + p; e.def += p; if (p > 0) e.st.ex = p; }, start(b, e) { if (e.st.ex) b.float(e.x, e.y - 110, '繁茂 +' + Math.round(e.st.ex * 100) + '%', '#b8ff80', 26); } };
H.Devotion = { tick(b, e, v, dt) { e.st.dv = (e.st.dv || 0) + dt; if (e.st.dv < 1) return; e.st.dv = 0; const t = pick(b.allies(e).filter(o => dist(o, e) < RS * 1.4 && o.hp < o.maxHp)); if (t) { b.heal(t, (t.maxHp - t.hp) * v[0] / 100, '#fff2a0'); b.orb(e, t, '#fff2a0'); } } };
H.ForbiddenFruit = { dealt(b, e, tg, d, v, c) { if (c.auto) b.mana(e, v[0]); }, hurt(b, e, s, d, v) { b.mana(e, v[1]); return d; }, full(b, e, v) { H.ForbiddenFruit.pop(b, e, v); }, death(b, e, k, v) { H.ForbiddenFruit.pop(b, e, v); }, pop(b, e, v) { const m = e.mana || 100; e.mana = 0; b.aoe(e, e.x, e.y, RM, m * v[2] / 100 * e.maxHp / 100, '#ff5a6a'); b.fxp({ k: 'boom', x: e.x, y: e.y - 30, life: 0.55, col: '#ff5a6a' }); b.ring(e.x, e.y - 20, 20, RM, '#ff5a6a', 10, 0.4); b.shake = Math.max(b.shake, 14); Sfx.boom(); } };
H.SurvivorBounty = { end(b, e, v) { if (!e.alive) return; const g = Math.round(e.maxHp * v[0] * 3 / 100); b.gainBase(g, e, '分红'); b.coins(e.x, e.y - 40, 8); } };
H.GigaBoomstick = { dealt(b, e, tg, d, v, c) { if (!c.auto) return; e.st.gb = (e.st.gb || 0) + 1; if (e.st.charged) { e.st.charged = 0; b.deal(e, tg, e.atk * v[1] / 100, { skill: 1, col: '#ffa040', big: 1 }); b.fxp({ k: 'boom', x: tg.x, y: tg.y - 30, life: 0.4 }); Sfx.boom(); } if (e.st.gb >= v[0]) { e.st.gb = 0; e.st.charged = 1; } }, kill(b, e) { e.st.charged = 1; } };
H.PlasmaDecay = { aura: { r: RM, col: '#b070ff', foe: 1, fn(b, e, o, v, dt) { o.st.pd = (o.st.pd || 0) + (dt || 0); if (o.st.pd >= v[0]) { o.st.pd = 0; o.plasma = Math.min(v[2], (o.plasma || 0) + 1); } } } };
H.Artillery = { atk(b, e, tg, v, c) { c.mul *= 1 + clamp(Math.abs(tg.x - e.x) / Math.max(1, e.range), 0, 1) * v[0] / 100; }, proj: 'boulder' };
H.PoisonTippedPole = { tick(b, e, v, dt) { const t = e.target; if (t && t.alive && dist(t, e) <= e.range + 20) { b.deal(e, t, e.atk * v[0] / 100 * dt, { skill: 1, silent: 1 }); t.poisoned = b.t; } } };
H.Feast = { near(b, e, vic, v) { if (dist(e, vic) < RM) { b.heal(e, e.maxHp * v[0] / 100 * 5, '#ff5a5a'); e.asB += v[1] / 100; } } };
H.Boss = { init(b, e, v) { e.def += v[0] / 100; } };
H.Impale = { dealt(b, e, tg, d, v, c) { if (c.auto) e.st.imp = Math.min(v[1], (e.st.imp || 0) + 1); }, atk(b, e, tg, v, c) { c.mul *= 1 + (e.st.imp || 0) * v[0] / 100; } };
H.RapidFire = { dealt(b, e, tg, d, v, c) { if (c.auto) b.mana(e, 12); }, full(b, e, v) { e.buffs.push({ as: v[0] / 100, until: b.t + v[1], col: '#ffd060' }); b.float(e.x, e.y - 110, '急速射击', '#ffd060', 26); } };
H.BloodRush = { start(b, e, v) { const t = b.allies(e).filter(o => o !== e).sort((a, c) => c.atk - a.atk)[0]; if (t) { t.buffs.push({ as: v[1] / 100, until: b.t + v[2] + 3, col: '#ff4a4a' }); b.orb(e, t, '#ff4a4a'); } } };
H.GhostWalker = { init(b, e) { e.ghost = 1; }, hurt(b, e, s, d, v, c) { return c.auto ? d * (1 - v[0] / 100) : d; } };
H.DeathStare = { dealt(b, e, tg, d, v, c) { if (!c.auto || !tg.alive) return; if (e.st.ds !== tg) { e.st.ds = tg; e.st.dn = 0; } e.st.dn++; b.deal(e, tg, v[0] * 4 * e.st.dn, { skill: 1, col: '#ff5aff', small: 1 }); } };
H.SummonFroggo = { start(b, e) { b.summon('Froggo', e.side, e.x - 40, e.y, 999, e); }, near(b, e) { b.mana(e, 34); }, full(b, e) { b.summon('Froggo', e.side, e.x - 40, e.y, 999, e); } };
H.PotOHoney = { death(b, e, k, v) { const al = b.allies(e).filter(o => o !== e && o.hp < o.maxHp && dist(o, e) < RM * 1.5); if (!al.length) return; const tot = v[0] * (1 + al.length * v[1] / 100); al.forEach(o => b.heal(o, tot / al.length, '#ffcc33')); b.fxp({ k: 'gas', x: e.x, y: e.y - 20, r: RM, col: '#ffcc33', life: 0.8 }); } };
H.LeadershipAura = { aura: { r: RM, col: '#ff5a4a', ally: 1, fn(b, e, o, v) { o.au.dmg += v[0] / 100; o.au.taken = Math.max(o.au.taken, v[1] / 100); } } };
H.Plunder = { kill(b, e) { const g = Math.round(3 + b.w * 2); b.base = Math.max(0, b.base - g); b.float(e.x, e.y - 100, '掠夺 -' + g, '#ff6a5a', 24); b.coins(e.x, e.y - 40, 5); } };
H.SafetyAura = { aura: { r: RM, col: '#9fc8ff', ally: 1, fn(b, e, o, v) { o.au.flat = Math.max(o.au.flat, v[0] * 8); } } };
H.HealingAura = { aura: { r: RM, col: '#7fff9a', ally: 1, fn(b, e, o, v) { o.au.hps = Math.max(o.au.hps, v[0] * 8 * (o.boss ? 2 : 1)); } } };
H.Maul = { dealt(b, e, tg, d, v, c) { if (c.auto && tg.alive) { tg.slowAS = Math.max(tg.slowAS, v[0] / 100); tg.slowT = b.t + 3; } } };
H.RaiseImp = { tick(b, e, v, dt) { e.st.ri = (e.st.ri || 0) + dt; if (e.st.ri > 9) { e.st.ri = 0; b.summon('Imp', e.side, e.x + 40, e.y, 30, e); } } };
H.DiabolicDuo = {};
H.JadeBeast = { start(b, e) { const n = b.run.roster.filter(u => DB[u.type] && DB[u.type].race === '兽人').length; let m = 0; if (n >= 2) m += 0.1; if (n >= 3) m += 0.1; if (m) { b.addMult(m, e.x, e.y - 120, '玉石共鸣'); b.fxp({ k: 'rays', x: e.x, y: e.y - 40, col: '#7fffc0', life: 0.9, r: 140 }); } } };
M.TRAIT_H = H;

class B3 extends M.Battle2 {
  constructor(run, cfg) { const o = Object.create(B3.prototype); o.init(run, cfg); return o; }
  init(run, cfg) {
    this.run = run; this.cfg = cfg; this.w = cfg.w; this.mode = cfg.mode; this.mods = run.mods;
    this.t = 0; this.ents = []; this.proj = []; this.fx = []; this.pending = []; this.growLog = [];
    this.shake = 0; this.flash = 0; this.flashCol = '#fff8d8'; this.syn = {};
    this.base = 0; this.mult = Math.round((1 + (run.startMult || 0) + (run.runBuff.mult || 0) + M.legionSum(run, 'mult')) * 10) / 10;
    this.spawnI = 0; this.over = null; this.overT = 0; this.deadUids = []; this.nid = 1; this.kills = 0;
    this.skillT = 0; this.allin = 0; this.rewind = 0; this.rage = 0; this.heroDmgTaken = 0; this.started = false;
    this.ek = (run.region.tut ? 0.75 : 1) * (1 + (run.M.day - 1) * 0.02);
    const Hh = HEROES[run.hero.cls];
    this.hero = this.mk({ side: 'A', kind: 'hero', hd: M.hdDef(Hh.sprite), sz: 1.25, x: HERO_POS.x, y: HERO_POS.y, hp: run.hero.hp, maxHp: M.heroMaxHp(run.hero, run.M), atk: M.heroAtk(run.hero, run.M) * (1 + (run.runBuff.heroAtk || 0)), iv: Hh.cd, range: Hh.range, spd: Hh.spd, ranged: !!Hh.ranged, isHero: true, bench: true, d: { race: '英雄', voc: '', q: 2 } });
    const melee = [], ranged = [], still = [];
    run.roster.forEach(u => { const d = DB[u.type]; if (!d) return; (d.ranged === 2 ? still : d.ranged ? ranged : melee).push(u); });
    let k = 0; const place = (arr, x) => arr.forEach((u, i) => { const n = arr.length; this.addUnit(u, x + (i % 2) * 44, 110 + (i + 0.5) * (540 / n), k++ * 0.13); });
    place(melee, 720); place(ranged, 500); place(still, 330);
    // enemies take the field at the same time, on screen, in formation
    const L = cfg.list, opening = (s) => cfg.mode !== 'hold' || s.spawn < 3, first = L.filter(opening), later = L.filter(s => !opening(s));
    const em = first.filter(s => !s.boss && (DB[s.type] || {}).ranged !== 1), er = first.filter(s => !s.boss && (DB[s.type] || {}).ranged === 1);
    const lay = (arr, x0) => arr.forEach((s, i) => { s.x = x0 + (i % 2) * 70 + Math.random() * 40; s.y = 110 + (i + 0.5) * (540 / arr.length); });
    lay(em, 1180); lay(er, 1480); first.filter(s => s.boss).forEach(s => { s.x = 1560; s.y = 390; });
    first.forEach((s, i) => { s.spawn = 0.35 + i * 0.11; }); const ke = first.length;
    this.entryEnd = 0.4 + Math.max(k, ke) * 0.12 + 0.9;
    // the army takes the field with every skill ready (a full bar); each one fires when its trigger holds
    // (mc-skilltrigger.js), not all at once. The leader only casts when it takes the field or when the player presses the skill button.
    this.ents.filter(e => e.side === 'A' && !e.isHero && this.canSkill(e, true)).forEach(e => { e.mana = 100; });
    this.openEnd = this.entryEnd; this.fightT0 = this.openEnd;
    later.forEach(s => { s.spawn = s.spawn - 1.6 + this.fightT0; s.x = 1250 + Math.random() * 500; });
    L.sort((a, b) => a.spawn - b.spawn);
    if (!run.roster.length) this.later(this.openEnd, () => this.heroEnter());
  }
  get score() { return Math.round(this.base * this.mult); }
  mk(o) { const e = Object.assign({ id: this.nid++, alive: true, t: Math.random() * 0.4, flash: 0, stun: 0, charm: 0, shield: 0, kills: 0, readyAt: 0, mana: 0, def: 0, dodge: 0, asB: 0, asDyn: 0, atkDyn: 0, defDyn: 0, combo: 0, buffs: [], debuf: {}, st: {}, traits: [], slowAS: 0, slowT: 0, au: {}, sz: 1, tags: [], star: 1 }, o); e.maxHp = e.maxHp || e.hp; this.ents.push(e); return e; }
  unitStats(key, side, x, y, o = {}) {
    const d = DB[key], u = o.unit, L = side === 'A' ? M.legionMods(this.run, d) : { hp: 0, atk: 0, as: 0, mana: 0, shield: 0 }, md = side === 'A' ? this.mods : {};
    const ek = side === 'E' ? this.ek * (o.elite ? 1.15 : 1) : 1;
    const hp = (d.hp + (u ? u.bHp : 0)) * (1 + L.hp + (md.unitHp || 0)) * ek * (o.hpMul || 1), atk = (d.atk + (u ? u.bAtk : 0)) * (1 + L.atk + (md.unitAtk || 0) + (this.run.runBuff.unitAtk || 0) * (side === 'A' ? 1 : 0)) * ek * (o.atkMul || 1);
    const boss = !!o.boss || d.g === '不朽';
    const traits = (d.tr || []).filter(t => TDB[t]).map(t => { const T = TDB[t]; return { key: t, n: T.n, d: T.d, v: T.v, cls: T.cls.replace(/^Summon|Trait$/g, '') }; });
    const e = this.mk({ side, key, d, kind: key, hd: { key, race: d.race, voc: d.voc, q: d.q }, sz: (QS[d.q] || 1) * (boss ? 1.45 : o.elite ? 1.15 : 1) * (o.summon ? 0.9 : 1), x, y, hp, maxHp: hp, atk, iv: d.as ? 100 / d.as : 99, range: d.ranged === 1 ? d.rad * 0.46 : 48 + Math.max(0, d.rad - 240) * 0.12, spd: (d.spd || 280) * 0.32, ranged: d.ranged === 1, noAtk: d.ranged === 2 || !d.atk, traits, unit: u, uid: u ? u.uid : null, summon: !!o.summon, life: o.life, boss, elite: !!o.elite, base: side === 'E' ? Math.round((d.cost || 10) * (o.elite ? 1.3 : 1)) : 0, mult: side === 'E' ? (boss ? 0.3 : o.elite ? 0.1 : 0) : 0 });
    e.asB += L.as; e.manaMul = 1 + L.mana; e.hasMana = traits.some(t => /法力/.test(t.d));
    e.pw = M.unitPower(key, u);
    if (L.shield) e.shield = e.maxHp * L.shield;
    if (md.shield) e.shield += e.maxHp * md.shield;
    if (d.voc === '射手' && d.race === '科技') e.pstyle = 'bullet'; else if (d.voc === '射手') e.pstyle = 'arrow'; else if (d.voc === '法师') e.pstyle = 'orb'; else if (d.voc === '祭司') e.pstyle = 'holy'; else if (side === 'E') e.pstyle = 'acid'; else e.pstyle = 'orb';
    traits.forEach(t => { const h = H[t.cls]; if (h && h.proj) e.pstyle = h.proj; });
    this.call(e, 'init');
    return e;
  }
  addUnit(u, x, y, delay) {
    const e = this.unitStats(u.type, 'A', x, y, { unit: u });
    e.entry = { 先锋: 'drop', 战士: 'march', 射手: 'leap', 法师: 'portal', 祭司: 'descend', 商人: 'march' }[e.d.voc] || 'fade';
    e.entryT = 0.4 + delay; e.readyAt = e.entryT + 0.9;
    this.later(e.entryT + (e.entry === 'drop' ? 0.55 : 0.4), () => this.entryLand(e));
    return e;
  }
  entryLand(e) { const c = RCOL[e.d.race] || '#fff'; if (e.entry === 'bossdrop') { this.shake = 30; this.flash = 0.3; this.flashCol = '#ff5a4a'; Sfx.impact(); this.dust(e.x, e.y, 26); this.ring(e.x, e.y - 6, 20, 320, '#ff6a4a', 12, 0.5); this.fxp({ k: 'crack', x: e.x, y: e.y, life: 2.5 }); return; } if (e.entry === 'emerge') { this.dust(e.x, e.y, 10); Sfx.stamp(); return; } if (e.entry === 'rift') { this.ring(e.x, e.y - 40, 10, 90, '#c890ff', 6, 0.4); Sfx.portal(); return; } if (e.entry === 'drop') { this.shake = Math.max(this.shake, 8 + e.d.q * 4); Sfx.stamp(); this.dust(e.x, e.y, 12); this.ring(e.x, e.y - 6, 10, 90 * e.sz, '#d8c8a8', 6, 0.3); } else if (e.entry === 'leap') { this.dust(e.x, e.y, 6); Sfx.hit(); } else if (e.entry === 'portal') { this.ring(e.x, e.y - 40, 10, 100, c, 8, 0.45); Sfx.sparkle(); } else if (e.entry === 'descend') { this.fxp({ k: 'pillar', x: e.x, w: 34, col: '#fff2c0', life: 0.5 }); Sfx.heal(); } else { this.dust(e.x, e.y, 4); Sfx.tick(); } if (e.d.q >= 2) { this.fxp({ k: 'rays', x: e.x, y: e.y - 40 * e.sz, col: M.QUALITY[e.d.q].c, life: 0.7, r: 120 * e.sz }); } }
  spawnEnemy(s) {
    const e = this.unitStats(s.type, 'E', s.x || 1250 + Math.random() * 500, s.y, { elite: s.elite, boss: s.boss });
    const r = e.d.race; e.entry = e.boss ? 'bossdrop' : e.elite ? 'rift' : /不死|骷髅|僵尸|自然/.test(r) ? 'emerge' : /混沌|恶魔|虚空/.test(r) ? 'rift' : 'drop';
    e.entryT = this.t; e.readyAt = this.t + (e.boss ? 1.0 : 0.75);
    if (e.entry === 'rift') this.fxp({ k: 'rift', x: e.x, y: e.y - 40 * e.sz, life: 0.9 });
    if (e.entry === 'emerge') this.dust(e.x, e.y, 8);
    this.later(e.entry === 'bossdrop' ? 0.62 : e.entry === 'drop' ? 0.5 : 0.35, () => this.entryLand(e));
    if (e.boss) { this.float(1500, 150, '首领 · ' + e.d.n, '#ff5a4a', 60); } else if (e.elite) this.float(e.x, 120, '精英 · ' + e.d.n, '#ffb060', 36);
    return e;
  }
  summon(key, side, x, y, life, src) { if (!DB[key]) return null; if (this.ents.filter(e => e.alive && e.summon && e.side === side).length > 14) return null; const lvl = src && src.side === 'E' ? 1 : 1; const e = this.unitStats(key, side, clamp(x, 170, 2000), clamp(y, 60, 690), { summon: 1, life, hpMul: lvl }); e.lifeEnd = this.t + (life || 999); e.readyAt = this.t + 0.3; e.entryT = this.t; e.entry = 'summon'; this.ring(e.x, e.y - 30, 10, 70, RCOL[e.d.race] || '#c890ff', 6, 0.4); this.call(e, 'start'); return e; }
  call(e, hook, x) { let r; for (const t of e.traits) { const h = H[t.cls]; if (!h || !h[hook]) continue; const y = hook === 'tick' ? h.tick(this, e, t.v, x, t) : (hook === 'near' || hook === 'death' || hook === 'kill') ? h[hook](this, e, x, t.v, t) : h[hook](this, e, t.v, t); if (y !== undefined) r = y; } return r; }
  later(dt, fn) { this.pending.push({ t: this.t + dt, fn }); }
  fxp(o) { o.t0 = o.t0 || this.t; this.fx.push(o); return o; }
  active(o) { return o.alive && !o.bench && this.t >= o.readyAt; }
  foes(e) { return this.ents.filter(o => o !== e && this.active(o) && o.side !== e.side && !o.stealth && o.charm <= 0); }
  allies(e) { return this.ents.filter(o => this.active(o) && o.side === e.side && !o.isHero); }
  nearestFoe(e, r) { let best = null, bd = r || 1e9; this.foes(e).forEach(o => { const d = dist(o, e); if (d < bd) { bd = d; best = o; } }); return best; }
  lowest(e) { return this.allies(e).filter(o => o.hp < o.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; }
  mana(e, amt, perSec) { if (!e.alive) return; e.mana = Math.min(100, e.mana + amt * (perSec ? (e.manaMul || 1) * (1 + (e.au.mreg || 0)) : 1)); }
  gainBase(g, e, label) { this.base += g; this.float(e.x, e.y - 90 * e.sz, (label ? label + ' ' : '') + '+' + fmt(g), '#ffcc33', 28, true); }
  coins(x, y, n) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, v = 260 + Math.random() * 260; this.fxp({ k: 'coinup', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.9 + Math.random() * 0.3 }); } Sfx.coin(); }
  dust(x, y, n) { for (let i = 0; i < n; i++) this.fxp({ k: 'dust', x: x + (Math.random() - 0.5) * 50, y, vx: (Math.random() - 0.5) * 220, vy: -40 - Math.random() * 80, life: 0.6 }); }
  orb(a, b2, col) { this.fxp({ k: 'orb', x1: a.x, y1: a.y - 50, x2: b2.x, y2: b2.y - 40, col, life: 0.45 }); this.later(0.45, () => this.ring(b2.x, b2.y - 40, 6, 60, col, 5, 0.3)); }
  link(a, b2, col) { if (b2) this.fxp({ k: 'arc', x1: a.x, y1: a.y - 40, x2: b2.x, y2: b2.y - 40, col, life: 0.2, w: 3 }); }
  soul(from, to) { this.fxp({ k: 'orb', x1: from.x, y1: from.y - 40, x2: to.x, y2: to.y - 50, col: '#c890ff', life: 0.6, soul: 1 }); }
  levelUp(e, txt) { this.fxp({ k: 'rays', x: e.x, y: e.y - 40 * e.sz, col: '#ffcc33', life: 1, r: 150 }); this.float(e.x, e.y - 120 * e.sz, '升级！' + txt, '#ffcc33', 36); Sfx.up(2); }
  heal(o, amt, col) { if (!o.alive || amt <= 0) return; const a = Math.min(amt, o.maxHp - o.hp); o.hp += a; if (a > 1) { this.float(o.x + 16, o.y - 70 * o.sz, '+' + fmt(a), col || '#7fff9a', 22, true); for (let i = 0; i < 3; i++) this.fxp({ k: 'plus', x: o.x - 20 + i * 18, y: o.y - 40, t0: this.t + i * 0.05, life: 0.7 }); } }
  healE(o, amt) { this.heal(o, amt); }
  regen(o, amt, col) { if (!o.alive || amt <= 0) return; o.hp = Math.min(o.maxHp, o.hp + amt); if (Math.random() < 0.03) this.fxp({ k: 'plus', x: o.x + (Math.random() - 0.5) * 30, y: o.y - 40, life: 0.6, col }); }
  ignite(tg, dps, src) { if (!tg.alive || tg.side === 'A') return; tg.burn = { dps, until: this.t + 3, src }; }
  evolve(e) { const to = (e.d.up || '').split(',')[0]; if (!DB[to]) return; this.evolveU(e.unit, to, e); }
  evolveU(u, to, e) { if (!u) return; to = to || (DB[u.type].up || '').split(',')[0]; if (!DB[to]) return; const from = DB[u.type].n; u.type = to; u.lv = 1; u.battles = 0; if (e) { const ne = this.unitStats(to, 'A', e.x, e.y, { unit: u }); ne.hp = ne.maxHp; ne.readyAt = this.t + 0.3; ne.mana = e.mana / 2; e.alive = false; e.evolved = 1; this.fxp({ k: 'pillar', x: e.x, w: 70, col: '#ffcc33', life: 0.9 }); this.fxp({ k: 'rays', x: e.x, y: e.y - 50, col: '#ffcc33', life: 1.2, r: 220 }); this.float(e.x, e.y - 140, '进化！' + DB[to].n, '#ffcc33', 44); this.shake = Math.max(this.shake, 12); Sfx.fanfare(); } else this.growLog.push(from + ' 进化为 ' + DB[to].n); }
  aoe(src, x, y, r, dmg, col, fn, skip) { this.ents.forEach(o => { if (o !== skip && this.active(o) && o.side !== src.side && Math.hypot(o.x - x, (o.y - y) * 1.2) < r) { this.deal(src, o, dmg, { skill: 1, col, small: 1 }); fn && fn(o); } }); }
  shell(e, tg, fn) { this.proj.push({ x: e.x, y: e.y - 60, x0: e.x, y0: e.y - 60, tx: tg.x, ty: tg.y - 20, arc: 1, t0: this.t, dur: 0.6, col: '#ffa040', style: 'boulder', fn, src: e, size: 16, trail: [] }); }
  shootP(e, tg, o) { this.proj.push(Object.assign({ x: (o.from || e).x + (e.side === 'A' ? 24 : -24), y: (o.from || e).y - 40 * e.sz, tgt: tg, src: e, col: o.col || RCOL[e.d.race] || '#fff', size: 12, trail: [], speed: 1150 }, o)); }
  pickTarget(e) {
    const a = this.call(e, 'pick'); if (a) return a;
    let list = this.foes(e); if (!list.length) return null; let best = null, bd = 1e9;
    list.forEach(o => { const d = dist(o, e) + (o.isHero ? 300 : 0); if (d < bd) { bd = d; best = o; } }); return best;
  }
  step(dt) {
    if (dt <= 0) return;
    if (this.hs > 0) { this.hs -= dt; return; }
    if (this.slow > 0) { this.slow -= dt; dt *= 0.2; }
    this.t += dt; const T = this.t; this.opening = T < this.openEnd;
    if (!this.started && T >= this.entryEnd * 0.7) { this.started = true; this.ents.filter(e => e.side === 'A' && !e.isHero).forEach(e => this.call(e, 'start')); }
    while (this.spawnI < this.cfg.list.length && this.cfg.list[this.spawnI].spawn <= T) { const e = this.spawnEnemy(this.cfg.list[this.spawnI++]); this.call(e, 'start'); }
    for (let i = this.pending.length - 1; i >= 0; i--) if (this.pending[i].t <= T) { const p = this.pending.splice(i, 1)[0]; p.fn(); }
    const act = this.ents.filter(e => this.active(e));
    act.forEach(e => { e.au = { def: 0, as: 0, dmg: 0, leech: 0, mreg: 0, taken: 0, flat: 0, hps: 0, regen: 0, slow: 0, frost: 0 }; e.asDyn = 0; e.atkDyn = 0; e.defDyn = 0; });
    act.forEach(e => e.traits.forEach(t => { const h = H[t.cls]; if (!h || !h.aura) return; const A = h.aura; act.forEach(o => { if ((A.ally ? o.side === e.side : o.side !== e.side) && !o.isHero && Math.hypot(o.x - e.x, (o.y - e.y) * 1.2) < A.r) A.fn(this, e, o, t.v, dt); }); }));
    for (const e of act) {
      e.flash = Math.max(0, e.flash - dt);
      if (e.lifeEnd && T > e.lifeEnd) { e.alive = false; this.burst(e.x, e.y - 30, '#8d8496', 6); continue; }
      e.buffs = e.buffs.filter(b => b.until > T);
      Object.keys(e.debuf).forEach(k => { if (e.debuf[k].until < T) delete e.debuf[k]; });
      if (e.slowT < T) e.slowAS = 0; if (e.dmgDownT && e.dmgDownT < T) e.dmgDown = 0;
      if (e.au.regen) this.regen(e, (e.maxHp - e.hp) * e.au.regen * dt, '#7fff9a');
      if (e.au.hps) this.regen(e, e.au.hps * dt, '#7fff9a');
      e.buffs.forEach(b => { if (b.regen) this.regen(e, b.regen * dt); });
      if (e.burn) { if (e.burn.until < T) e.burn = null; else { this.deal(e.burn.src || e, e, e.burn.dps * dt, { skill: 1, silent: 1 }); if (!e.alive) continue; } }
      if (!this.opening) { this.call(e, 'tick', dt); this.sigTick(e, dt); }
      if (!e.alive) continue;
      if (e.casting) { if (T >= e.casting.until) this.fireCast(e); continue; }
      if (!this.opening && this.growthFull(e)) continue;
      if (!this.opening && this.skillCharge(e) >= 100 && this.canSkill(e)) { this.beginCast(e); continue; }
      if (this.opening) continue;
      if (e.stun > 0) { e.stun -= dt; continue; }
      if (e.leap) continue;
      if (e.charm > 0) e.charm -= dt;
      if (e.noAtk) continue;
      if (!e.target || !this.active(e.target) || e.target.stealth || Math.random() < 0.02) e.target = this.pickTarget(e);
      const tg = e.target; if (!tg) continue;
      const dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy);
      const reach = e.range + (tg.sz - 1) * 30;
      if (d > reach) { const v = e.spd * (e.stealth ? 1.8 : 1) * (1 - e.au.slow * 0.5) * dt / d; e.x += dx * v; e.y += dy * v * 0.9; e.walk = (e.walk || 0) + e.spd * dt; }
      else {
        let as = 1 + e.asB + e.asDyn + e.au.as + e.buffs.reduce((a, b) => a + (b.as || 0), 0) - e.slowAS - e.au.slow; if (e.side === 'A' && T < this.rewind) as *= (this.rewindV || 1.6); if (e.isHero && T < this.rage) as *= 1.5;
        e.t -= dt * Math.max(0.2, as); if (e.t <= 0) { e.t = e.iv; this.attack(e, tg); }
      }
    }
    for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) { const a = act[i], b = act[j]; if (a.side !== b.side) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, m = 50 * (a.sz + b.sz) / 2; if (d < m) { const p = (m - d) * 0.5 / d; a.x -= dx * p; a.y -= dy * p; b.x += dx * p; b.y += dy * p; } }
    act.forEach(e => { e.y = clamp(e.y, 60, 700); e.x = clamp(e.x, 170, 2050); });
    for (let i = this.proj.length - 1; i >= 0; i--) {
      const p = this.proj[i];
      if (p.arc) { const q = (T - p.t0) / p.dur; p.trail.unshift([p.x, p.y]); if (p.trail.length > 6) p.trail.pop(); if (q >= 1) { this.proj.splice(i, 1); p.fn && p.fn(); continue; } p.x = p.x0 + (p.tx - p.x0) * q; p.y = p.y0 + (p.ty - p.y0) * q - Math.sin(q * Math.PI) * 220; continue; }
      if (!p.tgt.alive) { this.proj.splice(i, 1); continue; }
      const tx = p.tgt.x, ty = p.tgt.y - 36 * p.tgt.sz, dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), v = p.speed * dt;
      p.trail.unshift([p.x, p.y]); if (p.trail.length > 6) p.trail.pop();
      if (d <= v + 8) { this.proj.splice(i, 1); if (p.dmg != null) this.deal(p.src, p.tgt, p.dmg, { skill: p.skill, col: p.col, ranged: 1, small: 1 }); else this.strike(p.src, p.tgt, true); }
      else { p.x += dx / d * v; p.y += dy / d * v; }
    }
    this.shake = Math.max(0, this.shake - dt * 60); this.flash = Math.max(0, this.flash - dt * 3);
    this.fx = this.fx.filter(f => T - f.t0 < f.life);
    if (!this.over) {
      const armies = this.ents.filter(e => e.alive && e.side === 'A' && !e.isHero).length;
      if (armies === 0 && this.hero.bench && this.hero.alive && T > this.entryEnd) this.heroEnter();
      const left = this.ents.filter(e => e.alive && e.side === 'E').length + (this.cfg.list.length - this.spawnI);
      if (!this.hero.alive) this.end('dead');
      else if (this.mode === 'hold') { if (T >= this.cfg.dur + this.fightT0) { this.finish(); this.end('survived'); this.ents.forEach(e => { if (e.alive && e.side === 'E') { e.alive = false; this.burst(e.x, e.y - 30, '#3a2a4a', 6); } }); } }
      else if (left === 0) { this.finish(); this.end('clear'); }
      else if (T >= 150) this.end('time');
    } else this.overT += dt;
  }
  finish() { this.ents.filter(e => e.side === 'A' && !e.isHero && !e.summon).forEach(e => this.call(e, 'end')); }
  attack(e, tg) {
    e.lunge = this.t;
    const hits = 1 + e.combo;
    for (let i = 0; i < hits; i++) {
      const go = () => { if (!tg.alive || !e.alive) return; if (e.ranged) { this.shootP(e, tg, { style: e.pstyle, size: e.isHero ? 18 : 10 + e.d.q * 3 }); if (i === 0) Sfx.shoot(); } else { this.fxp({ k: 'slash', x: tg.x, y: tg.y - 34 * tg.sz, life: 0.14, big: e.d.q >= 2 || e.isHero, col: RCOL[e.d.race] }); this.strike(e, tg, false); } };
      if (i === 0) go(); else this.later(i * 0.09, go);
    }
  }
  strike(e, tg, ranged) {
    if (!e.alive && !e.isHero) return;
    const c = { auto: 1, mul: 1, ranged };
    for (const t of e.traits) { const h = H[t.cls]; if (h && h.atk) { c.T = t; h.atk(this, e, tg, t.v, c, t); } }
    if (c.cancel) return;
    let d = e.atk * c.mul * (1 + Math.max(-0.7, e.atkDyn)) * (1 + e.au.dmg);
    if (e.isHero && this.t < this.rage) d *= 2;
    let crit = false; const cc = (e.side === 'A' ? (this.mods.crit || 0) : 0); if (Math.random() < cc) { d *= 2; crit = true; }
    const dealt = this.deal(e, tg, d, { auto: !c.skill, skill: c.skill, ranged, crit, big: c.ambush });
    for (const t of e.traits) { const h = H[t.cls]; if (h && h.dealt) { const cx = { auto: !c.skill || c.ambush, ranged, T: t }; h.dealt(this, e, tg, dealt, t.v, cx, t); } }
  }
  deal(src, tg, amt, o = {}) {
    if (!tg.alive || amt <= 0) return 0;
    if (o.auto && tg.dodge && Math.random() < tg.dodge) { this.float(tg.x, tg.y - 80 * tg.sz, '闪避', '#b8f0ff', 24); tg.dodgeFx = this.t; for (const t of tg.traits) { const h = H[t.cls]; if (h && h.dodged) h.dodged(this, tg, t.v); } return 0; }
    let d = amt;
    if (src && src.dmgDown) d = Math.max(d * 0.2, d - src.dmgDown);
    if (src && src.plasma) d *= 1 - src.plasma * 0.02;
    let def = tg.def + tg.defDyn + (tg.au.def || 0) + tg.buffs.reduce((a, b) => a + (b.def || 0), 0);
    Object.values(tg.debuf).forEach(D => def -= D.v * D.n);
    d *= 1 - clamp(def, -0.6, 0.85);
    d *= 1 + (tg.au.taken || 0);
    for (const t of tg.traits) { const h = H[t.cls]; if (h && h.hurt) d = h.hurt(this, tg, src, d, t.v, Object.assign({ T: t }, o), t); }
    if (tg.au.flat) d = Math.max(d * 0.3, d - tg.au.flat);
    if (tg.shield > 0) { const a = Math.min(tg.shield, d); tg.shield -= a; d -= a; if (a > 0 && Math.random() < 0.3) this.fxp({ k: 'dome', ent: tg, col: '#9fe0ff', life: 0.2 }); }
    tg.hp -= d; if (!o.silent) { tg.flash = 0.08; tg.kb = this.t; tg.kbDir = src ? Math.sign(tg.x - src.x) || 1 : 1; }
    if (tg.isHero) this.heroDmgTaken += d;
    if (!o.silent && (o.skill || o.crit || o.big || Math.random() < 0.5)) this.float(tg.x + (Math.random() - 0.5) * 30, tg.y - 70 * tg.sz, fmt(d), o.crit ? '#ff5a4a' : o.col || (o.skill ? '#d890ff' : tg.side === 'A' ? '#ff8a8a' : '#ffffff'), o.big || o.crit ? 40 : o.small ? 20 : 26, true);
    if (!o.silent && !o.small) for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, v = 200 + Math.random() * 260; this.fxp({ k: 'pt', x: tg.x, y: tg.y - 40, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, col: o.col || (tg.side === 'E' ? '#ffd080' : '#8fc8ff'), life: 0.35 }); }
    if (o.crit || o.big) { Sfx.crit(); this.shake = Math.max(this.shake, 8); this.ring(tg.x, tg.y - 40, 10, 110, o.col || '#ffe08a', 7, 0.25); } else if (!o.silent && !o.small) Sfx.hit();
    if (src && src.alive && src.au && src.au.leech && !o.reflect) { const h = d * src.au.leech; src.hp = Math.min(src.maxHp, src.hp + h); if (Math.random() < 0.15) this.fxp({ k: 'orb', x1: tg.x, y1: tg.y - 40, x2: src.x, y2: src.y - 40, col: '#ff4a5a', life: 0.3 }); }
    if (tg.hp <= 0) this.kill(tg, src);
    return d;
  }
  hit(src, tg, d, crit) { this.deal(src, tg, d, { skill: 1, crit }); }
  kill(e, src) {
    if (!e.alive) return; e.alive = false; e.deadT = this.t;
    const keep = this.call(e, 'death', src);
    if (keep === 'keep') return;
    const hgt = 70 * e.sz, col = RCOL[e.d.race] || '#ff9a6a';
    this.burst(e.x, e.y - hgt / 2, col, 14); this.ring(e.x, e.y - hgt / 2, 10, 120 * e.sz, col, 8, 0.3); this.shake = Math.max(this.shake, 3 + e.d.q * 2);
    this.fxp({ k: 'death', x: e.x, y: e.y, hd: e.hd, sz: e.sz, flip: e.side === 'E', life: 0.6 });
    this.ents.forEach(o => { if (o !== e && this.active(o) && o.side !== e.side) this.call(o, 'near', e); });
    if (e.side === 'E') {
      this.kills++;
      const base = Math.max(1, Math.round(e.base * 0.9 * (1 + (this.mods.baseScore || 0) + M.legionSum(this.run, 'base'))));
      this.base += base; this.float(e.x, e.y - hgt - 10, '+' + fmt(base), '#f5ead4', 24, true);
      let m = e.mult; if (m && (e.elite || e.boss)) m += M.legionSum(this.run, 'eliteMult');
      if (this.t < this.allin) m += (this.allinV || 0.1);
      const km = M.legionSum(this.run, 'killMult'); if (km && this.kills % km === 0) m += 0.1;
      if (m) this.addMult(Math.round(m * 10) / 10, e.x, e.y - hgt - 50);
      if (e.boss) { this.shake = 30; this.flash = 0.6; this.flashCol = '#ffffff'; this.slow = 0.8; Sfx.impact(); } else if (e.elite) { this.shake = Math.max(this.shake, 14); this.slow = Math.max(this.slow || 0, 0.25); }
      if (src && src.side === 'A' && src.alive) { src.kills++; if (src.unit) src.unit.kills = (src.unit.kills || 0) + 1; this.call(src, 'kill', e); if (src.isHero && this.mods.killHeal) this.heal(src, src.maxHp * this.mods.killHeal); }
      Sfx.kill();
    } else if (e.isHero) { this.float(e.x, e.y - 120, '领袖倒下了', '#d0453c', 56); this.shake = 30; Sfx.die(); }
    else { if (src && src.alive) this.call(src, 'kill', e); if (!e.summon && !e.evolved) { this.deadUids.push(e.uid); this.float(e.x, e.y + 30, '倒下', '#ff8a8a', 26); } Sfx.die(); }
  }
  explode(x, y, dmg, src) { this.fxp({ k: 'boom', x, y, life: 0.4 }); this.shake = Math.max(this.shake, 10); Sfx.boom(); this.ents.forEach(o => { if (this.active(o) && o.side === 'E' && Math.hypot(o.x - x, o.y - y) < 150) this.deal(src || this.hero, o, dmg, { skill: 1 }); }); }
  addMult(m, x, y, label) { m = Math.round(m * 10) / 10; if (!m) return; this.mult = Math.round((this.mult + m) * 10) / 10; this.float(x, y, (label ? label + ' ' : '') + '倍率 +' + m, '#ffcc33', 40); this.fxp({ k: 'rays', x, y: y + 20, col: '#ffcc33', life: 0.6, r: 90 }); Sfx.mult(); }
  itemEffect(key, tier) {
    const T = this.t, hs = Math.max(200, this.cfg.budget * 2.4) * this.ek;
    const foes = () => this.ents.filter(e => this.active(e) && e.side === 'E' && e.x < 1900);
    if (key === 'bolt') {
      const n = [2, 5, 8, 12][tier], dmg = [0.6, 0.9, 1.4, 2.2][tier] * hs, struck = new Set();
      for (let i = 0; i < n; i++) this.later(0.05 + i * 0.12, () => { let list = foes().filter(e => !struck.has(e.id)); if (!list.length) list = foes(); if (!list.length) return; const tg = pick(list); struck.add(tg.id); this.fxp({ k: 'bolt', x: tg.x, y: tg.y, tier, seed: Math.random() * 1000, life: [0.3, 0.38, 0.5, 0.6][tier] }); this.shake = Math.max(this.shake, [3, 8, 24, 34][tier]); if (tier >= 2) { this.flash = Math.max(this.flash, 0.4); this.flashCol = tier === 3 ? '#e0c0ff' : '#fff8d8'; } Sfx.bolt(tier); this.deal(this.hero, tg, dmg, { skill: 1, col: '#e0e8ff', big: tier >= 2 }); if (tier >= 2) { const r = tier === 3 ? 190 : 130; this.ring(tg.x, tg.y, 20, r, tier === 3 ? '#b86bff' : '#ffcc33', 10, 0.45); this.aoe(this.hero, tg.x, tg.y, r, dmg * 0.5, '#e0e8ff', tier === 3 ? (o => o.stun = Math.max(o.stun, 1)) : null, tg); } });
    }
    if (key === 'heal') { const pct = [0.25, 0.5, 1, 1][tier]; this.ents.forEach(o => { if (o.alive && o.side === 'A' && !o.isHero) { this.heal(o, o.maxHp * pct); if (tier >= 2) o.shield = o.maxHp * 0.3; } }); if (tier === 3) this.ents.filter(o => !o.alive && o.side === 'A' && !o.isHero && !o.summon && !o.evolved).forEach(o => { o.alive = true; o.hp = o.maxHp * 0.6; this.deadUids = this.deadUids.filter(x => x !== o.uid); this.float(o.x, o.y - 90, '复活！', '#7fff9a', 40); this.fxp({ k: 'pillar', x: o.x, w: 50, col: '#b8ffb0', life: 0.7 }); }); this.heal(this.hero, this.hero.maxHp * pct * 0.25); this.flash = 0.25; this.flashCol = '#c0ffc0'; Sfx.heal(); }
    if (key === 'frame') { const list = [['GrayWolf'], ['GrayWolf', 'GrayWolf', 'DireWolf'], ['DireWolf', 'VengefulDragon'], ['BoneDragon', 'DireWolf', 'DireWolf', 'VengefulDragon']][tier]; list.forEach((k, i) => this.later(i * 0.18, () => { const x = 520 + Math.random() * 200, y = 150 + Math.random() * 420; this.fxp({ k: 'circle', x, y: y + 6, col: '#c890ff', life: 0.8 }); this.later(0.25, () => { const s = this.summon(k, 'A', x, y, 60); if (s) { s.maxHp *= 1 + this.w * 0.3; s.hp = s.maxHp; s.atk *= 1 + this.w * 0.3; } }); Sfx.portal(); })); }
    if (key === 'bell') { const f = foes(); if (tier === 3) f.forEach(o => { o.charm = 5; o.target = null; }); else f.forEach(o => o.stun = Math.max(o.stun, [1, 2, 3.5][tier])); for (let i = 0; i < 3; i++) this.later(i * 0.15, () => this.ring(960, 380, 40, 900, tier === 3 ? '#ff80c0' : '#caa84a', 8, 0.7)); Sfx.up(1); }
    if (key === 'cup') this.addMult([0.1, 0.2, 0.3, 0.5][tier], 960, 300, '骰盅');
  }
  render(ctx, opts = {}) {
    const T = this.t;
    const sx = this.shake ? (Math.random() - 0.5) * 2 * this.shake : 0, sy = this.shake ? (Math.random() - 0.5) * 2 * this.shake : 0;
    ctx.setTransform(1, 0, 0, 1, sx, sy); ctx.imageSmoothingEnabled = true;
    M._drawFloor(ctx, this.run.region); M._drawPodium(ctx);
    const list = this.ents.filter(e => (e.alive || (e.st.rev && !e.alive && T - e.deadT < 5 && false)) && (T >= (e.entryT || 0) || e.isHero)).sort((a, b) => a.y - b.y);
    // aura discs under units
    for (const e of list) for (const t of e.traits) { const h = H[t.cls]; if (!h || !h.aura || !this.active(e)) continue; const A = h.aura, pu = 0.5 + 0.5 * Math.sin(T * 3 + e.id); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(e.x, e.y); ctx.scale(1, 0.34); const g = ctx.createRadialGradient(0, 0, A.r * 0.3, 0, 0, A.r); g.addColorStop(0, A.col + '00'); g.addColorStop(0.85, A.col + '30'); g.addColorStop(1, A.col + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, A.r, 0, 7); ctx.fill(); ctx.strokeStyle = A.col; ctx.globalAlpha = 0.25 + 0.2 * pu; ctx.lineWidth = 4; ctx.setLineDash([18, 14]); ctx.lineDashOffset = -T * 40; ctx.beginPath(); ctx.arc(0, 0, A.r * (0.96 + 0.04 * pu), 0, 7); ctx.stroke(); ctx.restore(); }
    for (const f of this.fx) if (f.k === 'circle' || f.k === 'tomb' || f.k === 'cast' || f.k === 'crack') { if (!(M.drawFxPx && M.drawFxPx(ctx, f, T, this))) drawFx3(ctx, f, T, this); }
    for (const e of list) drawEnt3(ctx, e, T, this);
    for (const f of this.fx) if (f.k === 'death') drawFx3(ctx, f, T, this);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const R = this.run.region, lights = [{ x: HERO_POS.x + 20, y: HERO_POS.y - 60, r: 260, c: '#ffcf8a' }];
    for (const e of list) { const c = e.side === 'E' ? (e.boss ? '#ff4a4a' : '#ff9a6a') : (RCOL[e.d.race] || '#ffe6b0'); lights.push({ x: e.x, y: e.y - 40 * e.sz, r: (e.boss ? 340 : 210) * e.sz, c }); }
    for (const p of this.proj) lights.push({ x: p.x, y: p.y, r: 90, c: p.col });
    for (const f of this.fx) { const q = 1 - (T - f.t0) / f.life; if (q <= 0) continue; if (f.k === 'boom') lights.push({ x: f.x, y: f.y, r: 340 * q, c: f.col || '#ff9a3a' }); if (f.k === 'bolt' || f.k === 'arc' || f.k === 'beam2' || f.k === 'meteor' || f.k === 'spout') lights.push({ x: f.x2 || f.x, y: (f.y2 || f.y) - 60, r: 360 * q, c: f.col || '#e0e8ff' }); if (f.k === 'pillar' || f.k === 'rays') lights.push({ x: f.x, y: f.y || 380, r: 280 * q, c: f.col }); }
    const lm = M._bLight(), lx = lm.getContext('2d'); lx.globalCompositeOperation = 'source-over'; if (M.pixelMode) lx.clearRect(0, 0, 480, 180); lx.fillStyle = M.pixelMode ? 'rgba(4,2,10,0.34)' : 'rgba(4,2,10,0.14)'; lx.fillRect(0, 0, 480, 180); lx.globalCompositeOperation = 'destination-out';
    lights.forEach(L => { const r = L.r / 4; if (r <= 0) return; const g = lx.createRadialGradient(L.x / 4, L.y / 4, 0, L.x / 4, L.y / 4, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); lx.fillStyle = g; lx.fillRect(L.x / 4 - r, L.y / 4 - r, r * 2, r * 2); });
    ctx.drawImage(lm, 0, 0, FW, FH);
    lights.forEach(L => { if (L.r > 0 && L.c && L.c.length === 7) M.glow(ctx, L.x, L.y, L.r * 0.5, L.c, 0.14); });
    if (!this.amb) this.amb = new M.Ambient(R.amb || 'motes', FW, FH, 50);
    this.amb.update(1 / 60); this.amb.draw(ctx, 0, 0);
    M.hd2d(ctx, FW, FH, { focus: 0.56, band: 0.3, dofBlur: 1.6, bloom: 0.55, grade: R.grade, gradeA: 0.26, vig: 0.28 });
    ctx.setTransform(1, 0, 0, 1, sx, sy);
    for (const e of list) drawBars(ctx, e, T, this);
    for (const p of this.proj) drawProj(ctx, p, T);
    if (M.P16 && M.P16.drawPool) M.P16.drawPool(ctx, this);
    for (const f of this.fx) { if (f.k === 'circle' || f.k === 'tomb' || f.k === 'death' || f.k === 'cast' || f.k === 'crack') continue; if (!(M.drawFxPx && M.drawFxPx(ctx, f, T, this)) && !drawFx3(ctx, f, T, this)) M._drawFx(ctx, f, T); }
    if (M.drawBattleHudPx) M.drawBattleHudPx(ctx, this, T);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (opts.slow) { ctx.globalAlpha = 0.55 * opts.slow; ctx.fillStyle = '#07050a'; ctx.fillRect(0, 0, FW, FH); ctx.globalAlpha = 1; }
    if (this.flash > 0) { ctx.globalAlpha = clamp(this.flash, 0, 1) * 0.8; ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, FW, FH); ctx.globalAlpha = 1; }
    if (T < 0.6) { ctx.globalAlpha = 1 - T / 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FW, FH); ctx.globalAlpha = 1; }
  }
}
function entOff(e, T) {
  if (e.isHero) { if (e.enterT != null && T < e.enterT + 0.7) { const q = clamp((T - e.enterT) / 0.6, 0, 1); return { x: e.fromX + (e.x - e.fromX) * q - e.x, y: e.fromY + (e.y - e.fromY) * q - e.y - Math.sin(q * Math.PI) * 120, a: 1 }; } return { x: 0, y: 0, a: 1 }; }
  if (e.leap) { const q = clamp((T - e.leap.t0) / e.leap.dur, 0, 1); return { x: e.leap.x0 + (e.leap.x1 - e.leap.x0) * q - e.x, y: e.leap.y0 + (e.leap.y1 - e.leap.y0) * q - e.y - Math.sin(q * Math.PI) * 180, a: 1 }; }
  const q = clamp((T - (e.entryT || 0)) / 0.7, 0, 1); if (q >= 1 && !(e.entry === 'bossdrop' && T - (e.entryT || 0) < 0.62)) return { x: 0, y: 0, a: 1 };
  switch (e.entry) {
    case 'drop': return { x: 0, y: -700 * (1 - q * q), a: 1 };
    case 'leap': return { x: -260 * (1 - q), y: -Math.sin(q * Math.PI) * 160, a: 1 };
    case 'march': return { x: -380 * (1 - eo(q)), y: 0, a: q };
    case 'descend': return { x: 0, y: -220 * (1 - eo(q)), a: q };
    case 'portal': case 'summon': case 'rift': return { x: 0, y: 0, a: q, s: 0.3 + 0.7 * M.ease.eback(q) };
    case 'emerge': return { x: 0, y: 70 * (1 - eo(q)), a: Math.min(1, q * 1.6), clip: 1 };
    case 'bossdrop': { const qq = clamp((T - (e.entryT || 0)) / 0.62, 0, 1); return { x: 0, y: -900 * (1 - qq * qq), a: 1 }; }
    default: return { x: 0, y: 0, a: q };
  }
}
function drawEnt3(ctx, e, T, b) {
  const o = entOff(e, T), H0 = 88 * e.sz;
  const pose = e.casting || (e.castPose != null && T - e.castPose < 0.25) ? 2 : e.lunge != null && T - e.lunge < 0.18 ? 1 : 0;
  // 16-bit sprites (mc-px16-*.js) animate on their own grid; the old painted sprite is the fallback
  const px16 = M.P16 && M.P16.entImg ? M.P16.entImg(e, T) : null;
  const img = px16 || M.hdCanvas(e.hd || { key: 'x', race: '人类', voc: '', q: 0 }, H0, e.flash > 0 ? '#ffffff' : e.raging && Math.floor(T * 8) % 2 ? '#ff4a3a' : null, pose);
  let x = e.x + o.x, y = e.y + o.y;
  if (e.lunge != null && T - e.lunge < 0.16) x += (e.side === 'A' ? 1 : -1) * 16 * Math.sin((T - e.lunge) / 0.16 * Math.PI);
  if (e.kb != null && T - e.kb < 0.12) x += (e.kbDir || 1) * 7 * (1 - (T - e.kb) / 0.12);
  const moving = e.walk && !(e.lunge != null && T - e.lunge < 0.3), bob = px16 ? 0 : moving ? Math.abs(Math.sin(e.walk / 22)) * 6 : Math.sin(T * 2.4 + e.id) * 1.5;
  const sq = !px16 && e.kb != null && T - e.kb < 0.1 ? 0.9 : 1, sc = (o.s || 1);
  if (px16) { x = M.P16.snap(x); y = M.P16.snap(y); }
  ctx.save(); ctx.globalAlpha = (o.a == null ? 1 : o.a) * (e.stealth ? 0.35 + 0.1 * Math.sin(T * 10) : 1) * (e.ghost ? 0.75 : 1);
  const qc = M.QUALITY[e.d.q] ? M.QUALITY[e.d.q].c : '#fff';
  if (px16) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * 0.5; M.P16.ellipse(ctx, e.x + o.x * (o.y ? 0 : 1), e.y, 30 * e.sz, 8 * e.sz, '#0b0610'); ctx.globalAlpha = ga; if (e.d.q >= 2 || e.boss) M.P16.ellipse(ctx, e.x + o.x * (o.y ? 0 : 1), e.y, 36 * e.sz, 11 * e.sz, e.boss ? '#ff4a4a' : qc, true); }
  else { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(e.x + o.x * (o.y ? 0 : 1), e.y, 34 * e.sz, 10 * e.sz, 0, 0, 7); ctx.fill(); }
  if (!px16 && (e.d.q >= 2 || e.boss)) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(e.x, e.y); ctx.scale(1, 0.35); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 60 * e.sz); g.addColorStop(0, (e.boss ? '#ff4a4a' : qc) + '66'); g.addColorStop(1, (e.boss ? '#ff4a4a' : qc) + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 60 * e.sz, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.translate(x, y - bob); ctx.scale(sc * (2 - sq), sc * sq); if (e.side === 'E') ctx.scale(-1, 1);
  if (!px16 && (e.d.q >= 3 || e.boss)) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.35 + 0.15 * Math.sin(T * 3); ctx.filter = 'blur(6px)'; ctx.drawImage(img, -img.cx - 4, -img.footY - 4, img.width + 8, img.height + 8); ctx.filter = 'none'; ctx.restore(); }
  ctx.drawImage(img, -img.cx, -img.footY);
  ctx.restore();
  if (e.shieldFx && T - e.shieldFx < 0.25) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - (T - e.shieldFx) / 0.25; ctx.strokeStyle = '#ffa040'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(e.x, e.y - H0 * 0.5, H0 * 0.55, H0 * 0.65, 0, 0, 7); ctx.stroke(); ctx.restore(); }
  if (e.au.frost) { ctx.fillStyle = '#e8f6ff'; for (let i = 0; i < 2; i++) ctx.fillRect(e.x - 20 + ((T * 40 + i * 30 + e.id * 7) % 40), e.y - H0 + ((T * 50 + i * 17) % H0), 3, 3); }
  if (e.burn || (e.poisoned && T - e.poisoned < 0.3)) { const c = e.burn ? '#ff8a3a' : '#9cff5a'; for (let i = 0; i < 3; i++) { const q = (T * 2 + i / 3 + e.id * 0.1) % 1; ctx.globalAlpha = 1 - q; ctx.fillStyle = c; ctx.fillRect(e.x - 14 + i * 12, e.y - H0 * 0.5 - q * 50, 6, 6); } ctx.globalAlpha = 1; }
}
function drawBars(ctx, e, T, b) {
  if (e.isHero && e.bench) return;
  const o = entOff(e, T); if (o.a < 0.6) return;
  const H0 = 88 * e.sz, w = Math.max(40, 46 * e.sz), x = e.x + o.x, top = e.y + o.y - H0 - 14;
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x - w / 2 - 2, top - 2, w + 4, 9);
  ctx.fillStyle = e.side === 'A' ? (e.isHero ? '#f2c14e' : '#7fe06a') : e.boss ? '#ff3a3a' : '#e0504a'; ctx.fillRect(x - w / 2, top, w * clamp(e.hp / e.maxHp, 0, 1), 5);
  if (e.shield > 0) { ctx.fillStyle = '#bfe8ff'; ctx.fillRect(x - w / 2, top, w * clamp(e.shield / e.maxHp, 0, 1), 2); }
  if (e.hasMana) { const ch = b.skillCharge ? b.skillCharge(e) : e.mana, ready = ch >= 100 && !e.casting && e.alive;
    ctx.fillStyle = ready ? (Math.floor(T * 4) % 2 ? '#fff6c8' : 'rgba(0,0,0,0.75)') : 'rgba(0,0,0,0.75)'; ctx.fillRect(x - w / 2 - 2, top + 7, w + 4, 5);   // a ready skill waiting for its trigger: the bar's frame blinks
    ctx.fillStyle = '#5aa8ff'; ctx.fillRect(x - w / 2, top + 8, w * clamp(ch / 100, 0, 1), 3); }
  if (e.d.q >= 1 && !e.isHero) { ctx.fillStyle = M.QUALITY[e.d.q].c; ctx.beginPath(); ctx.moveTo(x - w / 2 - 10, top + 2); ctx.lineTo(x - w / 2 - 5, top - 3); ctx.lineTo(x - w / 2, top + 2); ctx.lineTo(x - w / 2 - 5, top + 7); ctx.fill(); }
  const tags = []; if (e.stack && e.stack.until > T) tags.push({ t: '×' + e.stack.n, c: e.stack.col }); if (e.icon) tags.push({ t: e.icon, c: '#ffcc33' }); const db = Object.values(e.debuf).reduce((a, d) => a + d.n, 0); if (db) tags.push({ t: '破甲' + db, c: '#9fc8ff' }); if (e.unit && e.unit.lv > 1) tags.push({ t: 'Lv' + e.unit.lv, c: '#ffcc33' }); if (e.buffs.length) tags.push({ t: '▲', c: e.buffs[0].col || '#ffd060' }); if (e.stun > 0) tags.push({ t: '晕', c: '#fff2a0' });
  if (tags.length) { ctx.font = "700 18px 'Noto Serif SC', serif"; ctx.textAlign = 'center'; let tx = x - (tags.length - 1) * 22; tags.forEach(g => { ctx.lineWidth = 4; ctx.strokeStyle = '#0a0610'; ctx.strokeText(g.t, tx, top - 8); ctx.fillStyle = g.c; ctx.fillText(g.t, tx, top - 8); tx += 44; }); }
}
function drawProj(ctx, p, T) {
  const c = p.col && p.col.length === 7 ? p.col : '#ffffff';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  p.trail.forEach((q, i) => { ctx.globalAlpha = 0.45 - i * 0.07; ctx.fillStyle = c; const s = p.size * (1 - i * 0.13); ctx.beginPath(); ctx.arc(q[0], q[1], s / 2, 0, 7); ctx.fill(); });
  ctx.globalAlpha = 1; M.glow(ctx, p.x, p.y, p.size * 3.4, c, 0.6);
  const prev = p.trail[0] || [p.x - 1, p.y], ang = Math.atan2(p.y - prev[1], p.x - prev[0]);
  ctx.translate(p.x, p.y); ctx.rotate(ang);
  if (p.style === 'arrow') { ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(0, -5); ctx.lineTo(0, 5); ctx.fill(); }
  else if (p.style === 'bullet') { ctx.fillStyle = '#fffbe0'; ctx.fillRect(-22, -2, 30, 4); }
  else if (p.style === 'boulder') { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#6a5a4a'; ctx.beginPath(); ctx.arc(0, 0, p.size * 0.8, 0, 7); ctx.fill(); ctx.fillStyle = '#ffb060'; ctx.beginPath(); ctx.arc(-3, -3, p.size * 0.3, 0, 7); ctx.fill(); }
  else if (p.style === 'water') { ctx.fillStyle = '#bff4ff'; ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, 7); ctx.fill(); }
  else if (p.style === 'fire') { ctx.fillStyle = '#fff0a0'; ctx.beginPath(); ctx.arc(0, 0, p.size * 0.5, 0, 7); ctx.fill(); ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.moveTo(-p.size * 2, 0); ctx.lineTo(0, -p.size * 0.6); ctx.lineTo(0, p.size * 0.6); ctx.fill(); }
  else if (p.style === 'spark') { ctx.fillStyle = '#ffffff'; ctx.fillRect(-8, -2, 16, 4); }
  else { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, p.size * 0.45, 0, 7); ctx.fill(); ctx.fillStyle = c; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(0, 0, p.size * 0.8, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawFx3(ctx, f, T, b) {
  const d = T - f.t0; if (d < 0) return true; const p = clamp(d / f.life, 0, 1), a = 1 - p;
  const add = (fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };
  switch (f.k) {
    case 'arc': add(() => { ctx.globalAlpha = a; M.bolt(ctx, f.x1, f.y1, f.x2, f.y2, f.col, f.w || 5, Math.floor(T * 40) + (f.x1 | 0)); }); M.glow(ctx, f.x2, f.y2, 60, f.col, 0.6 * a); return true;
    case 'beam2': add(() => { ctx.globalAlpha = a; ctx.strokeStyle = f.col; ctx.lineWidth = (f.w || 10) * (0.5 + a); ctx.lineCap = 'round'; ctx.shadowColor = f.col; ctx.shadowBlur = 30; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = (f.w || 10) * 0.3; ctx.stroke(); }); M.glow(ctx, f.x2, f.y2, 90, f.col, 0.7 * a); return true;
    case 'orb': { const q = eo(p), x = f.x1 + (f.x2 - f.x1) * q, y = f.y1 + (f.y2 - f.y1) * q - Math.sin(q * Math.PI) * (f.soul ? 90 : 50); M.glow(ctx, x, y, 34, f.col, 0.8); add(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }); return true; }
    case 'dome': { const e = f.ent, h = 88 * e.sz; add(() => { ctx.globalAlpha = a * 0.8; const g = ctx.createRadialGradient(e.x, e.y - h * 0.5, h * 0.2, e.x, e.y - h * 0.5, h * 0.75); g.addColorStop(0, f.col + '00'); g.addColorStop(0.8, f.col + '55'); g.addColorStop(1, f.col + 'cc'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, e.y - h * 0.5, h * 0.6, h * 0.72, 0, 0, 7); ctx.fill(); }); return true; }
    case 'halo': { const e = f.ent; if (!e.alive) return true; add(() => { ctx.globalAlpha = Math.min(1, a * 4) * 0.8; ctx.strokeStyle = f.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(e.x, e.y - 72 * e.sz, 18, 6, 0, 0, 7); ctx.stroke(); }); return true; }
    case 'sun': { const e = f.ent; if (!e.alive) return true; M.glow(ctx, e.x, e.y - 40 * e.sz, 90 + 10 * Math.sin(T * 8), '#ffd060', 0.35 * Math.min(1, a * 4)); return true; }
    case 'glint': { const e = f.ent; add(() => { ctx.globalAlpha = a; ctx.fillStyle = '#fff'; const x = e.x - 30 + p * 60, y = e.y - 60 * e.sz; ctx.translate(x, y); ctx.rotate(0.7); ctx.fillRect(-2, -26, 4, 52); ctx.fillRect(-18, -2, 36, 4); }); return true; }
    case 'circle': add(() => { ctx.globalAlpha = p < 0.2 ? p / 0.2 : a; ctx.translate(f.x, f.y); ctx.scale(1, 0.35); ctx.rotate(T * 2); ctx.strokeStyle = f.col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.stroke(); ctx.beginPath(); for (let i = 0; i <= 5; i++) { const an = i * Math.PI * 0.8; ctx.lineTo(Math.cos(an) * 70, Math.sin(an) * 70); } ctx.stroke(); }); M.glow(ctx, f.x, f.y - 30, 110, f.col, 0.5 * a); return true;
    case 'rift': add(() => { ctx.globalAlpha = p < 0.2 ? p / 0.2 : a; ctx.translate(f.x, f.y); ctx.scale(0.5, 1); const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 80); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#c890ff'); g.addColorStop(1, '#2a0a4a00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 80 * (0.6 + 0.4 * Math.sin(T * 12)), 0, 7); ctx.fill(); }); return true;
    case 'rays': M.glow(ctx, f.x, f.y, f.r || 120, f.col, 0.6 * a); add(() => { ctx.translate(f.x, f.y); ctx.rotate(T); ctx.globalAlpha = a * 0.6; for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.fillStyle = f.col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((f.r || 120) * 1.4, -8); ctx.lineTo((f.r || 120) * 1.4, 8); ctx.fill(); } }); return true;
    case 'xslash': add(() => { ctx.globalAlpha = a; ctx.translate(f.x, f.y); ctx.fillStyle = f.col; ctx.shadowColor = f.col; ctx.shadowBlur = 20; [0.7, -0.7].forEach(r => { ctx.save(); ctx.rotate(r); ctx.fillRect(-90 * eo(p * 2), -5, 180 * eo(p * 2), 10); ctx.restore(); }); }); return true;
    case 'thorn': add(() => { ctx.globalAlpha = a; ctx.fillStyle = f.col; for (let i = 0; i < 6; i++) { const an = i * 1.05; ctx.save(); ctx.translate(f.x + Math.cos(an) * 20 * (1 + p * 2), f.y + Math.sin(an) * 20 * (1 + p * 2)); ctx.rotate(an); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.fill(); ctx.restore(); } }); return true;
    case 'shard': add(() => { ctx.globalAlpha = a; ctx.fillStyle = f.col; for (let i = 0; i < 4; i++) ctx.fillRect(f.x + (i - 1.5) * 12 * (1 + p * 3), f.y + p * 40 - i * 4, 6, 10); }); return true;
    case 'gas': add(() => { ctx.globalAlpha = a * 0.35; const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r); g.addColorStop(0, f.col); g.addColorStop(1, f.col + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.7 + p * 0.3), f.r * 0.45, 0, 0, 7); ctx.fill(); }); return true;
    case 'rain': add(() => { for (let i = 0; i < 12; i++) { const q = clamp(p * 1.6 - i * 0.05, 0, 1); if (q <= 0 || q >= 1) continue; const x = f.x + ((i * 37) % 180) - 90, y = f.y - 420 * (1 - q); ctx.globalAlpha = 1 - q * 0.5; ctx.fillStyle = '#e8eef6'; ctx.fillRect(x - 3, y - 40, 6, 40); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 40, 2, 40); } }); return true;
    case 'meteor': { const q = eo(p * 1.6), x = f.x + 260 * (1 - q), y = f.y - 600 * (1 - q); M.glow(ctx, x, y - 20, 90, '#ff9a3a', 0.9 * a); add(() => { ctx.fillStyle = '#fff0c0'; ctx.beginPath(); ctx.arc(x, y - 20, 18, 0, 7); ctx.fill(); }); return true; }
    case 'spout': add(() => { ctx.globalAlpha = a; const h = 400 * eo(p * 2); const g = ctx.createLinearGradient(f.x - 40, 0, f.x + 40, 0); g.addColorStop(0, '#6fe0ff00'); g.addColorStop(0.5, '#bff4ff'); g.addColorStop(1, '#6fe0ff00'); ctx.fillStyle = g; ctx.fillRect(f.x - 40, f.y - h, 80, h); }); return true;
    case 'bomb': { const y = f.y - 500 * (1 - p); add(() => { ctx.fillStyle = '#ffa040'; ctx.beginPath(); ctx.arc(f.x, y - 20, 8, 0, 7); ctx.fill(); }); return true; }
    case 'coinup': { const x = f.x + f.vx * d, y = f.y + f.vy * d + 900 * d * d, w = Math.abs(Math.cos(d * 12 + f.vx)) * 14 + 3; ctx.globalAlpha = a; ctx.fillStyle = '#ffcc33'; ctx.fillRect(x - w / 2, y - 8, w, 16); ctx.fillStyle = '#fff6c0'; ctx.fillRect(x - w / 4, y - 5, Math.max(1, w / 4), 5); ctx.globalAlpha = 1; M.glow(ctx, x, y, 22, '#ffcc33', 0.4 * a); return true; }
    case 'dust': { const x = f.x + f.vx * d, y = f.y + f.vy * d; ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#b8a890'; ctx.beginPath(); ctx.arc(x, y, 8 + p * 14, 0, 7); ctx.fill(); ctx.globalAlpha = 1; return true; }
    case 'tomb': ctx.fillStyle = '#4a4450'; ctx.fillRect(f.x - 12, f.y - 40, 24, 40); ctx.fillStyle = '#6a6470'; ctx.fillRect(f.x - 16, f.y - 44, 32, 8); return true;
    case 'death': { const img = M.hdCanvas(f.hd, 88 * f.sz, '#ffffff'); ctx.save(); ctx.globalAlpha = a; ctx.translate(f.x, f.y - p * 20); ctx.scale((f.flip ? -1 : 1) * (1 + p * 0.3), 1 - p * 0.6); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(img, -img.cx, -img.footY); ctx.restore(); return true; }
    case 'plus': if (f.col) { ctx.globalAlpha = a; ctx.fillStyle = f.col; ctx.fillRect(f.x - 5, f.y - 60 * p - 1.5, 10, 3); ctx.fillRect(f.x - 1.5, f.y - 60 * p - 5, 3, 10); ctx.globalAlpha = 1; return true; } return false;
    case 'boom': if (f.col) { M.glow(ctx, f.x, f.y, 240 * (1 - p * 0.4), f.col, 0.8 * a); add(() => { ctx.globalAlpha = a; ctx.strokeStyle = f.col; ctx.lineWidth = 12 * a + 2; ctx.beginPath(); ctx.arc(f.x, f.y, 20 + 130 * eo(p), 0, 7); ctx.stroke(); }); return true; } return false;
  }
  return false;
}
M.Battle3 = B3;
})();

;
