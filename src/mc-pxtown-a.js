// ==== mc-pxtown-a.js ====
(function () {
// The pixel town's rooms (mc-pxtown-kit.js body + props): each wears on the surface what its room holds underground.
// B (from the kit): mx0 / mx1 / cx / top / rtop (the main block), side [x0, x1] (the yard at stage 0, the wing at 1–2),
// door, tower (stage 2), gy (the street), st, sd (the wing's side), near (the near street: people stand there).
const M = window.MC, PT = M.PXTOWN; if (!PT || !PT.spec || !PT.P) return;
const P = PT.P, K = PT.K, spec = PT.spec;
const mid = (B) => (B.side[0] + B.side[1]) >> 1, far = (B, G) => (B.sd > 0 ? Math.max(G.L - 3, B.mx0 - 8) : Math.min(G.R - 1, B.mx1 + 3));   // the side opposite the wing

// 铁匠铺: the forge (an open hearth under a hood in the yard, then built into the wing), the anvil; an iron stack spitting sparks
spec('smithy', { icon: 'anvil', act: 'hammer', smoke: 'ember', sig(S, sc, G, B) {
  P.forge(S, sc, G, B.side[0] + 1, B.side[1] - 1, B.gy, B.st === 0); P.anvil(S, mid(B) + (B.sd > 0 ? -1 : 1) * 2, B.gy);
  if (B.st >= 1) P.stack(S, sc, G, far(B, G), B.top + 2, B.top - B.rtop + 12 + B.st * 5, { k: 'ember', glow: B.st === 2, rate: 1 + B.st });
  if (B.st === 2) P.rack(S, B.mx1 - 5, B.gy); } });
// 医院: the red cross, glowing; a teal-lit entrance; the glass dome of green light, healing motes rising
spec('hospital', { icon: 'cross', act: 'read', look: 'nurse', chimney: false, sig(S, sc, G, B) {
  P.cross(S, sc, G, B.cx, B.rtop - 5, B.st ? 5 : 4);
  if (B.st >= 1) { const li = sc.light({ x: B.door.x + 3, y: B.gy - 4, z: 10, r: 20, i: 0.8, c: '#6ae0c8', fl: 'screen', tint: 0.5 }); S.lay('back'); S.beg(); S.rect(B.door.x, B.door.y, B.door.w, B.door.h, 'teal', 8, { e: li + 1 }); S.vl(B.door.x + (B.door.w >> 1), B.door.y, B.door.h, 'scifi', 6); S.box(B.door.x - 3, B.door.y - 3, B.door.w + 6, 2, 'scifi', 7, { top: 1 }); S.end(); }
  if (B.st === 2) { P.greenhouse(S, sc, G, B.mx0 + 2, B.rtop + 1, Math.min(14, B.mw >> 1), 5); sc.emit({ k: 'heal', x: B.mx0 + 8, y: B.rtop - 6, rate: 1.2, sp: 5, ang: 0, spread: 0.6, life: 1.6, w: 10 }); }
  else PT.K.crate(S, mid(B) - 3, B.gy); } });
// 蒸汽工坊: a riveted boiler, the flywheel through a round window, iron stacks, a pole of humming bulbs, coils arcing on the roof
spec('generator', { icon: 'bolt', act: 'wrench', look: 'worker', sig(S, sc, G, B) {
  const bw = Math.max(9, B.side[1] - B.side[0]); P.boiler(S, sc, G, B.side[0], B.gy, bw, B.st ? 7 : 5);
  if (B.st >= 1) { P.wheel(S, sc, G, B.cx + (B.sd > 0 ? -1 : 1) * Math.round(B.mw * 0.22), B.gy - Math.round(B.sh * 0.5), 4); P.stack(S, sc, G, far(B, G), B.top + 2, B.top - B.rtop + 14, { rate: 2.5 }); P.pole(S, sc, G, B.sd > 0 ? G.R + 3 : G.L - 3, B.gy, 20, [B.cx, B.top + 3]); }
  if (B.st === 2) P.coils(S, sc, G, [B.mx0 + 3, B.mx1 - 6], B.top - 2, 10); } });
// 训练场: a straw dummy and a target in the yard; a weapons rack; the drill sergeant at the door
spec('training', { icon: 'sword', act: 'guard', look: 'keeper', sig(S, sc, G, B) { P.dummy(S, B.side[0] + 3, B.gy); P.target(S, B.side[1] - 3, B.gy); if (B.st >= 1) P.rack(S, far(B, G) + 3, B.gy); if (B.st === 2) P.shields(S, B.mx0 + 2, B.mx1 - 2, B.top + 4); } });
// 储藏室: crates and sacks piled up; a hoist lifting the next one; at 2 a market stall under stripes
spec('storage', { icon: 'crate', act: 'carry', look: 'farmer', sig(S, sc, G, B) {
  PT.K.crate(S, B.side[0], B.gy); PT.K.sack(S, B.side[0] + 6, B.gy); if (B.side[1] - B.side[0] > 12) PT.K.crate(S, B.side[0] + 3, B.gy - 5);
  if (B.st >= 1) P.crane(S, G, B.sd > 0 ? B.mx1 - 2 : B.mx0 + 1, B.top - 2, 12, -B.sd);
  if (B.st === 2) P.awningStall(S, far(B, G) - 4, B.gy, 9, 'crimson'); } });
// 水培农场: rows of crops, a windmill turning, a greenhouse glowing green
spec('farm', { icon: 'wheat', act: 'work', look: 'farmer', sig(S, sc, G, B) {
  P.crops(S, B.side[0], B.side[1] + 3, B.gy, B.st === 2 ? 'sand' : 'leaf'); if (B.st >= 1) P.windmill(S, G, far(B, G) + 2, B.top + 4, 16 + B.st * 3, 7); if (B.st === 2) P.greenhouse(S, sc, G, B.mx0 + 2, B.gy - B.sh - 1, 10, 6); } });
// 净水池: a stone basin of shining water, a fountain, a water wheel turning at the side
spec('pool', { icon: 'drop', act: 'sweep', look: 'keeper', sig(S, sc, G, B) {
  P.pool(S, sc, G, B.side[0], B.side[1], B.gy); G.fx = { x: mid(B), y: B.gy - 4 }; if (B.st >= 1) P.fountain(S, sc, G, far(B, G) + 3, B.gy, 4); if (B.st === 2) P.waterwheel(S, G, B.sd > 0 ? B.mx1 : B.mx0, B.gy - 1, 6); } });
// 监听室: a dish sweeping the sky, an antenna, a lit console window
spec('lookout', { icon: 'eye', act: 'read', look: 'keeper', chimney: false, sig(S, sc, G, B) { P.dish(S, sc, G, B.cx, B.rtop); G.fx = { x: B.cx, y: B.rtop - 8 }; if (B.st >= 1) P.dish(S, sc, G, mid(B), (B.wtop || B.top) - 5); if (B.st === 2) P.crystal(S, sc, G, far(B, G) + 2, B.gy, 8, 'ice'); } });
// 保险库: the round iron vault door, coins spilling, a gilded clock at 2
spec('vault', { icon: 'coin', act: 'guard', look: 'keeper', sig(S, sc, G, B) { P.vaultdoor(S, mid(B), B.gy - 6, 4); P.coins(S, far(B, G), B.gy, 3 + B.st * 3); G.fx = { x: mid(B), y: B.gy - 8 }; if (B.st === 2) P.clockface(S, sc, G, B.cx, B.top - 6, 3); } });
// 沃尔夫斯堡工厂: a works — stacks spitting sparks, a crane, a cart on rails
spec('wolfsburg', { icon: 'gear', act: 'wrench', look: 'worker', kind: 'forge', sig(S, sc, G, B) {
  P.stack(S, sc, G, far(B, G), B.top + 2, B.top - B.rtop + 14, { k: 'ember', glow: true, rate: 2 }); P.cart(S, G, G.L, G.R, B.gy + 1);
  if (B.st >= 1) { P.stack(S, sc, G, far(B, G) + 6, B.top + 2, B.top - B.rtop + 10, { rate: 2 }); P.crane(S, G, mid(B), (B.wtop || B.top), 10, B.sd); } if (B.st === 2) P.coils(S, sc, G, [B.mx0 + 4, B.mx1 - 7], B.top - 2, 8); } });
// 冥想室: a glowing circle on the ground, a crystal, stones drifting round
spec('meditation', { icon: 'flame', act: 'staff', look: 'mage', sig(S, sc, G, B) { P.circle(S, sc, G, mid(B), B.gy, 6); P.crystal(S, sc, G, far(B, G) + 2, B.gy, 7 + B.st * 3); if (B.st >= 1) P.brazier(S, sc, G, B.door.x - 3, B.gy, 'arcane'); if (B.st === 2) P.orbs(G, B.cx, B.top - 10, Math.round(B.mw * 0.45), 3); G.fx = { x: B.cx, y: B.rtop }; } });
// 军械库: racks of spears, shields on the wall
spec('armory', { icon: 'shield', act: 'hammer', look: 'smith', sig(S, sc, G, B) { P.rack(S, mid(B), B.gy); P.shields(S, B.mx0 + 2, B.mx1 - 2, B.top + 3); if (B.st >= 1) P.anvil(S, far(B, G) + 3, B.gy); if (B.st === 2) P.rack(S, far(B, G) + 8, B.gy); } });
// 矿车站: rails and a cart of ore, the headframe, piles of rock
spec('minecart', { icon: 'pick', act: 'carry', look: 'worker', sig(S, sc, G, B) { P.cart(S, G, G.L - 4, G.R + 4, B.gy + 1); S.lay('back'); S.beg(); S.ell(mid(B) + 0.5, B.gy - 1, 5, 3, 'rock', 5, { dome: 1 }); S.px(mid(B), B.gy - 3, 'gold', 9); S.end(); if (B.st >= 1) P.crane(S, G, far(B, G) + 2, B.gy, 20, B.sd); if (B.st === 2) P.stack(S, sc, G, B.cx, B.top + 2, B.top - B.rtop + 8); } });
// 兵营: tents, a flag, a war drum at 2
spec('barracks', { icon: 'sword', act: 'guard', look: 'keeper', sig(S, sc, G, B) { P.tent(S, B.side[0], B.gy, Math.min(12, B.side[1] - B.side[0] + 2), 8, 'linen'); if (B.st >= 1) P.target(S, far(B, G) + 3, B.gy); if (B.st === 2) P.drum(S, B.door.x - 5, B.gy); } });
// 瞭望塔: a tall lookout with a fire on top
spec('watchtower', { icon: 'eye', act: 'guard', look: 'keeper', sig(S, sc, G, B) { const x = far(B, G) + 2, h = B.gy - B.rtop + 4 + B.st * 4; S.lay('back'); S.beg(); for (let yy = B.gy - h; yy < B.gy; yy += 4) { S.line(x - 3, yy, x + 3, yy + 4, 'wood', 5); S.line(x + 3, yy, x - 3, yy + 4, 'wood', 4); } S.vl(x - 3, B.gy - h, h, 'wood', 6); S.vl(x + 3, B.gy - h, h, 'wood', 4); S.box(x - 5, B.gy - h - 2, 11, 2, 'wood', 6, { top: 1 }); S.end(); P.brazier(S, sc, G, x, B.gy - h - 2); G.fx = { x, y: B.gy - h - 6 }; } });
// 工兵营: kegs of powder, a crane, a lit fuse now and then
spec('sappers', { icon: 'pick', act: 'carry', look: 'worker', kind: 'war', sig(S, sc, G, B) { PT.K.barrel(S, B.side[0], B.gy); PT.K.barrel(S, B.side[0] + 5, B.gy); if (B.side[1] - B.side[0] > 12) PT.K.barrel(S, B.side[0] + 2, B.gy - 6); if (B.st >= 1) P.crane(S, G, far(B, G) + 1, B.gy, 18, B.sd); if (B.st === 2) P.cannon(S, B.cx, B.rtop + 1, B.sd); } });
// 脚手架工坊: scaffold poles, a crane, planks
spec('scaffold', { icon: 'gear', act: 'hammer', look: 'worker', kind: 'forge', sig(S, sc, G, B) { S.lay('back'); S.beg(); for (let x = B.side[0]; x <= B.side[1]; x += 5) S.vl(x, B.gy - 16, 16, 'wood', 6); S.hl(B.side[0] - 1, B.gy - 8, B.side[1] - B.side[0] + 3, 'wood', 7); S.hl(B.side[0] - 1, B.gy - 15, B.side[1] - B.side[0] + 3, 'wood', 7); S.end(); P.crane(S, G, far(B, G) + 1, B.gy, 22, B.sd); if (B.st === 2) P.clockface(S, sc, G, B.cx, B.top - 6, 3); } });
// 神殿 (and the town's faith): columns, a bell in its belfry, braziers, a pillar of light
spec('temple', { icon: 'sun', act: 'staff', look: 'mage', sig(S, sc, G, B) { S.lay('mid'); for (let i = 0; i < 2 + B.st; i++) { const x = B.mx0 + 2 + Math.round(i * (B.mw - 6) / (1 + B.st)); S.beg(); S.cyl(x, B.gy - B.sh + 1, 3, B.sh - 2, 'bone', 8, { rim: 2 }); S.box(x - 1, B.gy - B.sh, 5, 1, 'bone', 9); S.end(); }
  P.bell(S, G, B.cx, B.rtop + 2); if (B.st >= 1) { P.brazier(S, sc, G, B.side[0] + 2, B.gy); P.brazier(S, sc, G, far(B, G) + 2, B.gy); } } });
// 银行: the vault door, coins, a clock on the front
spec('bank', { icon: 'coin', act: 'read', look: 'keeper', sig(S, sc, G, B) { P.vaultdoor(S, mid(B), B.gy - 6, 4); P.coins(S, far(B, G), B.gy, 3 + B.st * 3); P.clockface(S, sc, G, B.cx, B.top - 5, B.st ? 3 : 2); G.fx = { x: B.cx, y: B.top - 6 }; } });
// 修理铺: the anvil, gears, a crane
spec('mender', { icon: 'gear', act: 'wrench', look: 'worker', kind: 'forge', sig(S, sc, G, B) { P.anvil(S, mid(B), B.gy); if (B.st >= 1) P.crane(S, G, far(B, G) + 1, B.gy, 18, B.sd); if (B.st === 2) P.wheel(S, sc, G, B.cx, B.gy - B.sh - 5, 3); } });
// 城垛: a crenellated wall in the yard, merlons along the roof
spec('rampart', { icon: 'shield', act: 'guard', look: 'keeper', roof: 'flat', sig(S, sc, G, B) { S.lay('back'); PT.K.wall(S, B.side[0], B.gy - 10, B.side[1] - B.side[0], 10, ['stone', 5, 'ashlar']); P.merlons(S, B.side[0], B.side[1], B.gy - 10, 'stone', 6, B.st === 2); P.merlons(S, B.mx0, B.mx1, B.top - 3, 'stone', 6, B.st === 2); G.fx = { x: mid(B), y: B.gy - 14 }; if (B.st >= 1) P.brazier(S, sc, G, far(B, G) + 2, B.gy); } });
// 箭塔: a tall stone tower with slits, a ballista on top at 2
spec('arrowtower', { icon: 'arrow', act: 'guard', look: 'keeper', sig(S, sc, G, B) { const x = far(B, G) - 2, h = B.gy - B.rtop + 2; S.lay('back'); PT.K.wall(S, x - 4, B.gy - h, 9, h, ['stone', 6, 'ashlar']); S.beg(); for (let y = B.gy - h + 4; y < B.gy - 6; y += 7) S.rect(x, y, 1, 4, 'ink', 1); S.end(); P.merlons(S, x - 5, x + 6, B.gy - h, 'stone', 7, B.st === 2); P.target(S, mid(B), B.gy); if (B.st === 2) P.ballista(S, G, B.cx, B.rtop + 3, true); } });
// 战鼓台: the great drum, braziers either side
spec('wardrum', { icon: 'drum', act: 'work', look: 'keeper', kind: 'war', sig(S, sc, G, B) { P.drum(S, mid(B), B.gy); G.fx = { x: mid(B), y: B.gy - 8 }; P.brazier(S, sc, G, far(B, G) + 2, B.gy); if (B.st === 2) P.drum(S, B.door.x - 6, B.gy); } });
// 堡垒: merlons, a gate in the yard wall, flags; its own keep
spec('citadel', { icon: 'shield', act: 'guard', look: 'keeper', roof: 'flat', floors: 0, sig(S, sc, G, B) { P.merlons(S, B.mx0, B.mx1, B.top - 3, 'stone', 6, B.st === 2); S.lay('back'); PT.K.wall(S, B.side[0], B.gy - 12, B.side[1] - B.side[0], 12, ['stone', 5, 'ashlar']); S.beg(); S.rect(mid(B) - 2, B.gy - 7, 5, 7, 'ink', 1); S.hl(mid(B) - 2, B.gy - 8, 5, 'stone', 8); S.end(); P.merlons(S, B.side[0], B.side[1], B.gy - 12, 'stone', 6, B.st === 2); PT.K.flag(S, G, far(B, G) + 2, B.gy, 18, 'crimson'); } });
// 营房 (small): a tent, a dummy
spec('barrack', { icon: 'sword', act: 'guard', look: 'keeper', sig(S, sc, G, B) { P.tent(S, B.side[0], B.gy, Math.min(11, B.side[1] - B.side[0] + 2), 7, 'sand'); P.dummy(S, far(B, G) + 3, B.gy); } });
// 征兵厅: banners, a drum, a rack
spec('levyhall', { icon: 'drum', act: 'guard', look: 'keeper', sig(S, sc, G, B) { P.drum(S, mid(B), B.gy); P.rack(S, far(B, G) + 3, B.gy); if (B.st === 2) PT.K.flag(S, G, B.side[1] + 1, B.gy, 20, 'gold'); } });
// 宿舍区: pipes and a stack, crates, a line of washing
spec('quarter', { icon: 'gear', act: 'sweep', look: 'worker', kind: 'war', sig(S, sc, G, B) { PT.K.crate(S, mid(B) - 3, B.gy); S.lay('back'); S.beg(); S.line(B.side[0], B.gy - 12, B.side[1], B.gy - 11, 'ink', 3); for (let x = B.side[0] + 1; x < B.side[1] - 1; x += 3) S.rect(x, B.gy - 11, 2, 3, ['linen', 'tile', 'crimson'][x % 3], 7); S.end(); if (B.st >= 1) P.stack(S, sc, G, far(B, G), B.top + 2, B.top - B.rtop + 8); } });
// (the pilot's 招魂台 is gone from the game: nothing to draw)
})();
