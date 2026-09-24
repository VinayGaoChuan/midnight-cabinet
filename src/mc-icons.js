// ==== mc-icons.js ====
(function () {
// Pixel icon library (16x16 art px, painted in a 32x32 vector space then pixelised) + the tag system:
// every race / vocation / building style / building function has a name, a colour and an icon.
const M = window.MC;
const IC = {};
const C = (x, col) => { x.fillStyle = col; };
const circ = (x, cx, cy, r, col) => { C(x, col); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
const ell = (x, cx, cy, rx, ry, col, a) => { C(x, col); x.beginPath(); x.ellipse(cx, cy, rx, ry, a || 0, 0, 7); x.fill(); };
const rect = (x, a, b, w, h, col) => { C(x, col); x.fillRect(a, b, w, h); };
const poly = (x, pts, col) => { C(x, col); x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
const line = (x, a, b, c, d, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
const arc = (x, cx, cy, r, a0, a1, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke(); };
const star = (x, cx, cy, r1, r2, n, col, rot) => { const p = []; for (let i = 0; i < n * 2; i++) { const a = (rot || -Math.PI / 2) + i * Math.PI / n, r = i % 2 ? r2 : r1; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } poly(x, p, col); };
const gearI = (x, cx, cy, r, col, hole) => { for (let i = 0; i < 8; i++) { x.save(); x.translate(cx, cy); x.rotate(i * Math.PI / 4); rect(x, -2.5, -r - 3, 5, 6, col); x.restore(); } circ(x, cx, cy, r, col); circ(x, cx, cy, r * 0.42, hole || '#2a2030'); };
const heart = (x, cx, cy, s, col) => { C(x, col); x.beginPath(); x.moveTo(cx, cy + s * 0.9); x.bezierCurveTo(cx - s * 1.4, cy - s * 0.1, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35); x.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.4, cy - s * 0.1, cx, cy + s * 0.9); x.fill(); };
const shieldP = (x, cx, cy, w, h, col) => { poly(x, [[cx - w, cy - h], [cx + w, cy - h], [cx + w, cy + h * 0.1], [cx, cy + h], [cx - w, cy + h * 0.1]], col); };
const sword = (x, col) => { poly(x, [[22, 4], [26, 6], [12, 22], [9, 20]], col || '#dfe6f0'); line(x, 7, 17, 15, 25, 3, '#c8a04a'); line(x, 10, 22, 5, 27, 3.4, '#6a4a2a'); };
const coin = (x, cx, cy, r) => { circ(x, cx, cy, r, '#e8a820'); circ(x, cx - 1, cy - 1, r - 2, '#ffd650'); rect(x, cx - 1.5, cy - r * 0.55, 3, r * 1.1, '#e8a820'); };
// ── races
IC.r_orc = (x) => { circ(x, 16, 17, 11, '#79a453'); rect(x, 9, 13, 5, 3, '#1a1410'); rect(x, 18, 13, 5, 3, '#1a1410'); rect(x, 10, 12, 4, 1.5, '#e04040'); rect(x, 18, 12, 4, 1.5, '#e04040'); poly(x, [[11, 22], [13, 22], [12, 17]], '#f5ecd8'); poly(x, [[19, 22], [21, 22], [20, 17]], '#f5ecd8'); };
IC.r_undead = (x) => { poly(x, [[6, 28], [6, 14], [10, 6], [22, 6], [26, 14], [26, 28], [22, 25], [18, 28], [14, 25], [10, 28]], '#bfe0f0'); circ(x, 12, 15, 2.6, '#1a2030'); circ(x, 20, 15, 2.6, '#1a2030'); ell(x, 16, 21, 2.5, 3, '#1a2030'); };
IC.r_skel = (x) => { circ(x, 16, 13, 10, '#efe7d4'); rect(x, 10, 20, 12, 7, '#efe7d4'); circ(x, 12, 13, 3, '#1a1418'); circ(x, 20, 13, 3, '#1a1418'); poly(x, [[16, 16], [14, 20], [18, 20]], '#1a1418'); for (let i = 0; i < 3; i++) rect(x, 12 + i * 3.4, 23, 1.6, 4, '#1a1418'); };
IC.r_human = (x) => { circ(x, 16, 18, 9, '#f0bf96'); poly(x, [[6, 16], [8, 7], [16, 4], [24, 7], [26, 16], [22, 11], [10, 11]], '#6a3e22'); rect(x, 11, 17, 3, 3, '#1a1418'); rect(x, 18, 17, 3, 3, '#1a1418'); rect(x, 13, 23, 6, 1.6, '#a05a4a'); };
IC.r_elf = (x) => { circ(x, 16, 18, 8.5, '#f6d8b8'); poly(x, [[8, 17], [2, 10], [9, 14]], '#f6d8b8'); poly(x, [[24, 17], [30, 10], [23, 14]], '#f6d8b8'); poly(x, [[7, 15], [10, 6], [16, 4], [22, 6], [25, 15], [20, 10], [12, 10]], '#9ccc6a'); rect(x, 12, 18, 2.5, 3, '#2a5a2a'); rect(x, 18, 18, 2.5, 3, '#2a5a2a'); };
IC.r_zombie = (x) => { rect(x, 4, 25, 24, 4, '#4a3a2a'); poly(x, [[11, 26], [11, 13], [9, 7], [12, 7], [13, 12], [14, 5], [16, 5], [16, 12], [18, 6], [20, 6], [19, 13], [22, 10], [23, 12], [20, 18], [20, 26]], '#93aa74'); rect(x, 12, 18, 7, 1.5, '#56663f'); };
IC.r_tech = (x) => { gearI(x, 16, 16, 9, '#9aa8bc'); circ(x, 16, 16, 3.4, '#4af0ff'); };
IC.r_demon = (x) => { poly(x, [[7, 12], [4, 2], [12, 9]], '#3a1a10'); poly(x, [[25, 12], [28, 2], [20, 9]], '#3a1a10'); circ(x, 16, 18, 10, '#cf5040'); poly(x, [[10, 15], [15, 17], [10, 18]], '#ffd060'); poly(x, [[22, 15], [17, 17], [22, 18]], '#ffd060'); rect(x, 12, 23, 8, 2, '#3a0a0a'); };
IC.r_nature = (x) => { poly(x, [[16, 3], [27, 13], [24, 24], [16, 29], [8, 24], [5, 13]], '#7ac050'); line(x, 16, 7, 16, 29, 2, '#3a6a2a'); line(x, 16, 15, 10, 11, 1.6, '#3a6a2a'); line(x, 16, 20, 22, 15, 1.6, '#3a6a2a'); };
IC.r_void = (x) => { circ(x, 16, 16, 12, '#4a3880'); arc(x, 16, 16, 8, 0.5, 5.2, 3, '#c890ff'); circ(x, 16, 16, 4, '#e8d0ff'); circ(x, 16, 16, 2, '#1a1030'); };
IC.r_chaos = (x) => { star(x, 16, 16, 14, 5, 8, '#d0303a'); circ(x, 16, 16, 4, '#ff9a6a'); };
IC.r_beast = (x) => { ell(x, 16, 21, 7, 6, '#c08a58'); circ(x, 8, 12, 3.5, '#c08a58'); circ(x, 13, 7, 3.5, '#c08a58'); circ(x, 19, 7, 3.5, '#c08a58'); circ(x, 24, 12, 3.5, '#c08a58'); };
IC.r_hero = (x) => { poly(x, [[4, 25], [4, 10], [10, 17], [16, 6], [22, 17], [28, 10], [28, 25]], '#ffcc33'); rect(x, 4, 25, 24, 4, '#d09a20'); circ(x, 16, 20, 2.4, '#d0453c'); circ(x, 9, 21, 1.8, '#6fa8dc'); circ(x, 23, 21, 1.8, '#6fa8dc'); };
// ── vocations
IC.v_vanguard = (x) => { shieldP(x, 16, 16, 11, 13, '#6f9ad8'); shieldP(x, 16, 15, 7, 8.5, '#bfd8ff'); rect(x, 15, 6, 2, 18, '#3a5a8a'); rect(x, 9, 13, 14, 2, '#3a5a8a'); };
IC.v_warrior = (x) => { sword(x); };
IC.v_archer = (x) => { arc(x, 8, 16, 13, -1.25, 1.25, 2.6, '#a8743a'); line(x, 12, 4, 12, 28, 1, '#f5ecd8'); line(x, 6, 16, 28, 16, 2, '#e8dcc4'); poly(x, [[30, 16], [25, 13], [25, 19]], '#dfe6f0'); poly(x, [[6, 16], [3, 13], [3, 19]], '#d0453c'); };
IC.v_mage = (x) => { line(x, 10, 28, 20, 10, 3, '#8a5a3a'); circ(x, 22, 8, 5.5, '#c890ff'); circ(x, 21, 7, 2.5, '#ffffff'); star(x, 9, 9, 4, 1.4, 4, '#e8d0ff'); };
IC.v_priest = (x) => { circ(x, 16, 16, 12, '#fff2a0'); rect(x, 14, 5, 4, 22, '#fffbe8'); rect(x, 8, 11, 16, 4, '#fffbe8'); circ(x, 16, 13, 2, '#ffcc33'); };
IC.v_merchant = (x) => { poly(x, [[9, 12], [23, 12], [27, 27], [5, 27]], '#a07040'); rect(x, 12, 8, 8, 5, '#8a5a30'); coin(x, 16, 20, 5.5); };
// ── building styles
IC.s_core = (x) => { rect(x, 6, 6, 20, 22, '#6a5a70'); rect(x, 9, 9, 14, 19, '#1a1420'); ell(x, 16, 18, 5, 8, '#5fd0c0'); ell(x, 16, 18, 2.5, 4, '#e0fff5'); rect(x, 4, 4, 24, 4, '#caa84a'); };
IC.s_steam = (x) => { gearI(x, 13, 19, 7, '#c7803a'); rect(x, 21, 6, 5, 16, '#8a5a30'); circ(x, 24, 5, 3.5, '#e8dcc4'); circ(x, 27, 2, 2.4, '#e8dcc4'); };
IC.s_magic = (x) => { poly(x, [[16, 2], [24, 12], [16, 30], [8, 12]], '#b86bff'); poly(x, [[16, 2], [24, 12], [16, 14]], '#e0b8ff'); poly(x, [[8, 12], [16, 14], [16, 30]], '#7a3ab0'); };
IC.s_nature = (x) => { rect(x, 14, 18, 4, 11, '#6a4a2a'); circ(x, 16, 12, 9, '#4e9a3a'); circ(x, 11, 15, 5, '#6ab040'); circ(x, 21, 14, 5, '#6ab040'); circ(x, 14, 8, 3, '#9cdc6a'); };
IC.s_water = (x) => { C(x, '#4aa8d0'); x.beginPath(); x.moveTo(16, 3); x.bezierCurveTo(22, 12, 26, 17, 26, 21); x.arc(16, 21, 10, 0, Math.PI); x.bezierCurveTo(6, 17, 10, 12, 16, 3); x.fill(); ell(x, 12, 20, 2, 4, '#bff0ff', -0.4); };
IC.s_fantasy = (x) => { star(x, 16, 16, 14, 6, 4, '#ffcc33'); star(x, 16, 16, 8, 3, 4, '#fff6c0', Math.PI / 4 - Math.PI / 2); };
IC.s_scifi = (x) => { x.save(); x.translate(16, 16); [0, 1.05, 2.1].forEach(a => { x.save(); x.rotate(a); x.strokeStyle = '#4af0ff'; x.lineWidth = 2; x.beginPath(); x.ellipse(0, 0, 13, 5, 0, 0, 7); x.stroke(); x.restore(); }); x.restore(); circ(x, 16, 16, 3.4, '#e0fdff'); };
IC.s_medieval = (x) => { rect(x, 8, 10, 16, 19, '#9a9088'); for (let i = 0; i < 4; i++) rect(x, 7 + i * 5, 5, 3.4, 6, '#9a9088'); rect(x, 13, 20, 6, 9, '#3a2a20'); rect(x, 10, 14, 3, 3, '#1a1418'); rect(x, 19, 14, 3, 3, '#1a1418'); };
IC.s_cartoon = (x) => { ell(x, 16, 12, 9, 10, '#ff7ab0'); ell(x, 13, 9, 2.5, 3.5, '#ffd0e4'); poly(x, [[14, 21], [18, 21], [16, 24]], '#d0507a'); line(x, 16, 24, 14, 30, 1.4, '#e8dcc4'); };
// ── building functions
IC.f_store = (x) => { rect(x, 5, 9, 22, 18, '#a87a44'); rect(x, 5, 9, 22, 3, '#d8a860'); line(x, 7, 13, 25, 25, 2, '#6a4a2a'); line(x, 25, 13, 7, 25, 2, '#6a4a2a'); rect(x, 5, 17, 22, 2, '#6a4a2a'); };
IC.f_power = (x) => { poly(x, [[19, 2], [7, 18], [15, 18], [12, 30], [25, 12], [17, 12]], '#ffd23a'); };
IC.f_forge = (x) => { poly(x, [[4, 16], [26, 16], [26, 20], [20, 21], [22, 27], [9, 27], [11, 21], [4, 19]], '#8a92a0'); line(x, 20, 14, 26, 4, 3, '#8a5a30'); rect(x, 21, 1, 9, 5, '#c8d0dc'); };
IC.f_med = (x) => { rect(x, 12, 4, 8, 24, '#e04848'); rect(x, 4, 12, 24, 8, '#e04848'); rect(x, 13, 5, 3, 22, '#ff9a9a'); };
IC.f_recruit = (x) => { rect(x, 7, 3, 3, 27, '#8a6a3a'); poly(x, [[10, 4], [27, 6], [22, 11], [27, 16], [10, 17]], '#6fa8dc'); star(x, 17, 10, 3.5, 1.4, 5, '#ffffff'); };
IC.f_train = (x) => { rect(x, 6, 14, 20, 4, '#9aa0aa'); rect(x, 3, 8, 5, 16, '#3a3440'); rect(x, 24, 8, 5, 16, '#3a3440'); rect(x, 8, 10, 3, 12, '#5a5460'); rect(x, 21, 10, 3, 12, '#5a5460'); };
IC.f_logi = (x) => { ell(x, 16, 16, 10, 13, '#8a5a30'); rect(x, 6, 8, 20, 2.5, '#5a3a18'); rect(x, 6, 22, 20, 2.5, '#5a3a18'); rect(x, 12, 5, 8, 22, '#a8743a'); };
IC.f_defense = (x) => { rect(x, 9, 11, 14, 18, '#7a7080'); for (let i = 0; i < 3; i++) rect(x, 8 + i * 6, 6, 4, 6, '#7a7080'); poly(x, [[16, 13], [20, 20], [12, 20]], '#d0453c'); rect(x, 15, 20, 2, 6, '#d0453c'); };
IC.f_luck = (x) => { [[16, 9], [23, 16], [16, 23], [9, 16]].forEach(([a, b]) => circ(x, a, b, 6, '#6ac050')); circ(x, 16, 16, 4, '#9cf07a'); line(x, 16, 20, 20, 30, 2, '#3a7a2a'); };
IC.f_misc = (x) => { star(x, 16, 16, 13, 5.5, 5, '#c890ff'); circ(x, 16, 16, 3, '#ffffff'); };
// ── talents / stats
IC.t_sword = (x) => sword(x);
IC.t_command = (x) => { rect(x, 6, 3, 3, 27, '#8a6a3a'); poly(x, [[9, 4], [26, 7], [9, 15]], '#d0453c'); x.save(); x.translate(8, 8); x.scale(0.7, 0.7); sword(x); x.restore(); };
IC.t_crit = (x) => { star(x, 16, 16, 14, 4, 8, '#ff5a4a'); circ(x, 16, 16, 4, '#fff2a0'); };
IC.t_hourglass = (x) => { rect(x, 7, 3, 18, 3, '#8a6a3a'); rect(x, 7, 26, 18, 3, '#8a6a3a'); poly(x, [[9, 6], [23, 6], [17, 16], [23, 26], [9, 26], [15, 16]], '#bfe8ff'); poly(x, [[11, 8], [21, 8], [16, 14]], '#ffcc33'); poly(x, [[16, 18], [21, 25], [11, 25]], '#ffcc33'); };
IC.t_rage = (x) => { poly(x, [[16, 2], [23, 12], [21, 20], [26, 16], [24, 28], [8, 28], [6, 16], [11, 20], [9, 11]], '#ff6a2a'); poly(x, [[16, 10], [20, 18], [18, 27], [12, 27], [11, 19]], '#ffd060'); };
IC.t_flame = (x) => { poly(x, [[16, 2], [25, 16], [22, 28], [10, 28], [7, 16], [12, 10], [13, 18]], '#ff7a2a'); poly(x, [[16, 12], [20, 22], [17, 28], [13, 28], [12, 22]], '#fff2a0'); };
IC.t_claw = (x) => { for (let i = 0; i < 3; i++) poly(x, [[6 + i * 8, 4], [11 + i * 8, 6], [9 + i * 8, 28], [6 + i * 8, 26]], '#e0e0e8'); };
IC.t_heal = (x) => { heart(x, 16, 16, 11, '#e04860'); rect(x, 14, 9, 4, 12, '#ffffff'); rect(x, 10, 13, 12, 4, '#ffffff'); };
IC.t_heart = (x) => { heart(x, 16, 16, 12, '#e04860'); ell(x, 11, 11, 3, 2, '#ff9ab0', -0.6); };
IC.t_shieldHeart = (x) => { shieldP(x, 16, 16, 12, 13, '#6f9ad8'); heart(x, 16, 15, 7, '#e04860'); };
IC.t_plus = (x) => { rect(x, 12, 4, 8, 24, '#7fff9a'); rect(x, 4, 12, 24, 8, '#7fff9a'); };
IC.t_coinShield = (x) => { shieldP(x, 16, 16, 12, 13, '#8a92a0'); coin(x, 16, 15, 6); };
IC.t_chest = (x) => { rect(x, 4, 12, 24, 16, '#8a5a30'); poly(x, [[4, 12], [8, 5], [24, 5], [28, 12]], '#a8743a'); rect(x, 4, 12, 24, 2, '#caa84a'); rect(x, 14, 12, 4, 7, '#ffcc33'); };
IC.t_shield = (x) => { shieldP(x, 16, 16, 12, 13, '#9fc8ff'); shieldP(x, 16, 15, 8, 9, '#dfefff'); };
IC.t_mult = (x) => { line(x, 7, 7, 25, 25, 5, '#ffcc33'); line(x, 25, 7, 7, 25, 5, '#ffcc33'); };
IC.t_coin = (x) => { coin(x, 16, 16, 12); };
IC.t_dice = (x) => { rect(x, 5, 5, 22, 22, '#f5ead4'); rect(x, 5, 23, 22, 4, '#b8a888'); [[10, 10], [22, 10], [16, 16], [10, 22], [22, 22]].forEach(([a, b]) => circ(x, a, b, 2.4, '#1a1418')); };
IC.t_shard = (x) => { poly(x, [[16, 2], [23, 14], [18, 30], [10, 18]], '#b86bff'); poly(x, [[16, 2], [23, 14], [16, 16]], '#f0d8ff'); };
IC.t_orb = (x) => { circ(x, 16, 16, 12, '#6ac040'); circ(x, 12, 12, 4, '#e0ffd0'); };
IC.t_clover = IC.f_luck;
IC.t_sack = (x) => { poly(x, [[10, 11], [22, 11], [27, 27], [5, 27]], '#a8743a'); rect(x, 12, 6, 8, 6, '#8a5a30'); rect(x, 11, 10, 10, 2, '#5a3a18'); poly(x, [[16, 15], [19, 19], [16, 24], [13, 19]], '#ffcc33'); };
IC.t_eye = (x) => { ell(x, 16, 16, 13, 8, '#f5ead4'); circ(x, 16, 16, 6, '#4aa8d0'); circ(x, 16, 16, 3, '#1a1418'); circ(x, 14, 14, 1.4, '#ffffff'); };
IC.t_skill = (x) => { circ(x, 16, 16, 13, '#ffcf4a'); star(x, 16, 16, 10, 4, 4, '#fff6d0'); };
IC.t_cross = IC.f_med;
// ── tiles
IC.l_geo = IC.t_flame;
IC.l_ore = (x) => { poly(x, [[4, 26], [8, 12], [18, 6], [28, 14], [26, 27]], '#6a5a50'); circ(x, 12, 17, 3, '#e0904a'); circ(x, 20, 13, 2.6, '#ffcc33'); circ(x, 19, 21, 2.2, '#e0904a'); };
IC.l_ley = (x) => { arc(x, 16, 16, 11, 0.3, 5.8, 3, '#b86bff'); arc(x, 16, 16, 6, 3.4, 8.8, 3, '#e0b8ff'); circ(x, 16, 16, 2, '#ffffff'); };
IC.l_spring = IC.s_water;
IC.l_ruin = (x) => { rect(x, 8, 8, 7, 20, '#d8c8a0'); rect(x, 6, 5, 11, 4, '#e8dcc4'); poly(x, [[18, 28], [18, 16], [22, 13], [25, 18], [25, 28]], '#c8b890'); rect(x, 4, 27, 24, 3, '#a89870'); };
IC.l_rift = (x) => { poly(x, [[14, 2], [19, 11], [15, 14], [20, 22], [16, 30], [12, 21], [16, 17], [11, 9]], '#9cff7a'); };
IC.l_crystal = (x) => { poly(x, [[10, 28], [7, 12], [12, 4], [16, 12], [15, 28]], '#7fe0ff'); poly(x, [[16, 28], [18, 9], [24, 3], [27, 13], [23, 28]], '#bff4ff'); };
IC.l_fossil = (x) => { line(x, 8, 24, 24, 8, 5, '#e8dcc4'); circ(x, 7, 22, 3.4, '#e8dcc4'); circ(x, 10, 26, 3.4, '#e8dcc4'); circ(x, 22, 6, 3.4, '#e8dcc4'); circ(x, 26, 10, 3.4, '#e8dcc4'); };
// ── misc ui
IC.u_pick = (x) => { arc(x, 16, 20, 14, -2.6, -0.5, 4, '#9aa0aa'); line(x, 16, 7, 16, 29, 3, '#8a5a30'); };
IC.u_hammer = (x) => { line(x, 8, 28, 20, 10, 3.4, '#8a5a30'); rect(x, 15, 3, 14, 8, '#9aa0aa'); };
IC.u_star = (x) => star(x, 16, 16, 14, 6, 5, '#ffcc33');
IC.u_mask = (x) => { poly(x, [[4, 8], [28, 8], [26, 20], [16, 28], [6, 20]], '#f5ead4'); ell(x, 11, 14, 3, 2, '#1a1418'); ell(x, 21, 14, 3, 2, '#1a1418'); arc(x, 16, 18, 5, 0.3, 2.8, 2, '#d0453c'); };

// ── leader classes: the class decides both skills, so the emblem is how a leader is recognised at a glance
IC.c_watchman = (x) => { rect(x, 13, 2, 6, 3, '#5a4a30'); poly(x, [[9, 6], [23, 6], [25, 10], [7, 10]], '#3a3036'); rect(x, 9, 10, 14, 15, '#ffb830'); rect(x, 11, 12, 10, 11, '#fff2a0'); rect(x, 15, 10, 2, 15, '#3a3036'); rect(x, 9, 16, 14, 2, '#3a3036'); poly(x, [[7, 25], [25, 25], [22, 29], [10, 29]], '#3a3036'); };
IC.c_widow = (x) => { x.save(); x.translate(16, 16); x.rotate(-0.3); rect(x, -13, -12, 15, 21, '#2a0c12'); rect(x, -12, -11, 13, 19, '#8a2030'); x.rotate(0.55); rect(x, -3, -13, 16, 22, '#1a1418'); rect(x, -2, -12, 14, 20, '#f5ecd8'); heart(x, 5, -2, 4.6, '#d0303a'); x.restore(); };
IC.c_nun = (x) => { poly(x, [[5, 30], [6, 13], [10, 5], [22, 5], [26, 13], [27, 30]], '#1e1a2a'); ell(x, 16, 15, 7, 8, '#f5ecd8'); circ(x, 16, 16, 5, '#f0c8a0'); rect(x, 13, 15, 2, 2, '#1a1418'); rect(x, 17, 15, 2, 2, '#1a1418'); rect(x, 14.5, 22, 3, 9, '#ffd650'); rect(x, 11.5, 24.5, 9, 3, '#ffd650'); };
IC.c_butcherlord = (x) => { rect(x, 21, 9, 9, 6, '#6a4a2a'); rect(x, 26, 9, 2, 6, '#3a2a1a'); poly(x, [[2, 4], [22, 4], [22, 19], [6, 22], [2, 18]], '#aab4c2'); rect(x, 2, 4, 20, 4, '#e8eef6'); circ(x, 17, 11, 2, '#2a2430'); poly(x, [[4, 21], [13, 20], [12, 27], [10, 24], [8, 29], [6, 24]], '#c0303a'); };
IC.c_clockmaker = (x) => { rect(x, 13, 2, 6, 5, '#caa84a'); circ(x, 16, 18, 12, '#caa84a'); circ(x, 16, 18, 9.5, '#f5ecd8'); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; rect(x, 16 + Math.cos(a) * 7.5 - 1, 18 + Math.sin(a) * 7.5 - 1, 2, 2, '#6a5a3a'); } line(x, 16, 18, 16, 11.5, 2.2, '#1a1418'); line(x, 16, 18, 21, 20, 2.2, '#1a1418'); circ(x, 16, 18, 2, '#d0453c'); };
IC.c_cremator = (x) => { poly(x, [[16, 1], [22, 9], [21, 15], [11, 15], [10, 9]], '#ff7a2a'); poly(x, [[16, 6], [19, 11], [18, 14], [14, 14], [13, 11]], '#fff2a0'); rect(x, 10, 15, 12, 3, '#4a3a44'); poly(x, [[9, 18], [23, 18], [26, 24], [21, 30], [11, 30], [6, 24]], '#6a5a64'); rect(x, 8, 22, 16, 2, '#8a7a84'); };
// ── skills that used to share an icon with the same leader's other skill
IC.t_chant = (x) => { rect(x, 19, 4, 3, 18, '#fff2a0'); poly(x, [[19, 4], [28, 8], [28, 13], [22, 10]], '#fff2a0'); ell(x, 15, 22, 6, 4.2, '#ffd650', -0.4); star(x, 8, 8, 4.5, 1.5, 4, '#ffffff'); star(x, 26, 22, 3.5, 1.2, 4, '#ffffff'); };
IC.t_rewind = (x) => { circ(x, 16, 16, 13, '#9fd8c8'); circ(x, 16, 16, 11, '#1e3a36'); poly(x, [[16, 9], [16, 23], [7, 16]], '#bff8e8'); poly(x, [[25, 9], [25, 23], [16, 16]], '#bff8e8'); };
IC.t_pyre = (x) => { poly(x, [[16, 2], [25, 14], [22, 22], [10, 22], [7, 14]], '#ff5a2a'); poly(x, [[16, 9], [20, 16], [19, 21], [13, 21], [12, 16]], '#ffd650'); line(x, 4, 27, 28, 22, 4, '#6a4a2a'); line(x, 4, 22, 28, 27, 4, '#8a5a3a'); };

// ── rasterise: vector (32x32) -> 16x16 pixel art with outline, cached
const cache = {};
M.IC = IC;
M.iconCanvas = function (key, s) {
  s = Math.max(1, Math.round(s || 2)); const k = key + '|' + s; if (cache[k]) return cache[k];
  const f = IC[key]; if (!f) return null;
  const c = M.pxCanvas(18, 18), x = c.getContext('2d'); x.translate(1, 1); x.scale(0.5, 0.5); f(x);
  M.pixelize(c, { k: 7, cut: 96 });
  return (cache[k] = M.asPx(c, s));
};
M.iconURL = function (key, s) { const c = M.iconCanvas(key, s); return c ? c.toDataURL() + '#x' + (1 / s) + 'p' : ''; };

// ── tags: races, vocations, building styles & functions share one presentation
const RC = M.RACES, VC = M.VOCS;
const RACE_IC = { 兽人: 'r_orc', 不死: 'r_undead', 骷髅: 'r_skel', 人类: 'r_human', 精灵: 'r_elf', 僵尸: 'r_zombie', 科技: 'r_tech', 恶魔: 'r_demon', 自然: 'r_nature', 虚空: 'r_void', 混沌: 'r_chaos', 野兽: 'r_beast', 英雄: 'r_hero' };
const VOC_IC = { 先锋: 'v_vanguard', 战士: 'v_warrior', 射手: 'v_archer', 法师: 'v_mage', 祭司: 'v_priest', 商人: 'v_merchant' };
M.STYLE_COL = { core: '#ffe08a', steam: '#e0904a', magic: '#c890ff', nature: '#9cdc6a', water: '#6fd0ff', fantasy: '#ffcc33', scifi: '#4af0ff', medieval: '#d8c0a0', cartoon: '#ff8ac0' };
M.CAT_COL = { core: '#e8c86a', power: '#ffd23a', forge: '#b8c0cc', med: '#ff6a6a', recruit: '#7fb0ff', train: '#ffa060', store: '#c8a060', defense: '#ff6a5a', luck: '#7fe060', misc: '#d0a0ff' };
M.CAT.core = '仓库';
const STYLE_IC = { core: 's_core', steam: 's_steam', magic: 's_magic', nature: 's_nature', water: 's_water', fantasy: 's_fantasy', scifi: 's_scifi', medieval: 's_medieval', cartoon: 's_cartoon' };
const CAT_IC = { core: 'f_store', power: 'f_power', forge: 'f_forge', med: 'f_med', recruit: 'f_recruit', train: 'f_train', store: 'f_logi', defense: 'f_defense', luck: 'f_luck', misc: 'f_misc' };
const CAT_D = { core: '所有物资、图纸和宝物都放在这里。', power: '产出电力，让耗电建筑能运转。', forge: '用宝物图纸打造宝物。', med: '让受伤的领袖回血。', recruit: '招募新的领袖。', train: '把经验球灌给领袖。', store: '每天产出物资，或提供出征补给。', defense: '基地遭到袭击时向地面开火。', luck: '出征时带来好运。', misc: '各种特殊效果。' };
const STYLE_D = '建筑风格。地格和一些奇观只对特定风格的建筑生效。';
M.TAG = {
  race: (n) => RACE_IC[n] ? { kind: 'race', n, c: RC[n] || '#fff', icon: RACE_IC[n], d: '种族。部分特性、战旗和世界的敌人按种族区分。' } : null,
  voc: (n) => VOC_IC[n] ? { kind: 'voc', n, c: VC[n] || '#fff', icon: VOC_IC[n], d: '职业。决定作战方式和招牌技能，战旗按职业加成。' } : null,
  style: (k) => STYLE_IC[k] ? { kind: 'style', k, n: M.STYLE[k], c: M.STYLE_COL[k], icon: STYLE_IC[k], d: STYLE_D } : null,
  cat: (k) => CAT_IC[k] ? { kind: 'cat', k, n: M.CAT[k], c: M.CAT_COL[k], icon: CAT_IC[k], d: CAT_D[k] } : null,
};
// one sentence in context, the tag's name in its colour (the title row already shows icon + name)
const TAG_LINE = { race: ['该部队属于', '种族'], voc: ['该部队的职业是', ''], style: ['该建筑具有', '风格'], cat: ['该建筑用于', ''] };
M.tagTip = (t) => t && { title: t.n, c: t.c, icon: t.icon, lines: [{ rich: [{ t: TAG_LINE[t.kind][0], c: '#e8dcc4' }, { t: t.n, c: t.c, b: 1 }, { t: TAG_LINE[t.kind][1], c: '#e8dcc4' }] }] };
const byName = { style: {}, cat: {} }; Object.keys(STYLE_IC).forEach(k => { if (k !== 'core') byName.style[M.STYLE[k]] = k; }); Object.keys(CAT_IC).forEach(k => { byName.cat[M.CAT[k]] = k; });
// words recognised inside rich text; ctx 'bld' prefers building meanings for words shared with races (自然)
const WORDS = Object.keys(RACE_IC).filter(n => n !== '英雄').map(n => ['race', n]).concat(Object.keys(VOC_IC).map(n => ['voc', n]), Object.keys(byName.style).map(n => ['style', n]), Object.keys(byName.cat).map(n => ['cat', n])).sort((a, b) => b[1].length - a[1].length);
M.tagWord = function (s, i, ctx) {
  const hits = WORDS.filter(([, w]) => s.startsWith(w, i)); if (!hits.length) return null;
  const pref = ctx === 'bld' ? ['style', 'cat', 'race', 'voc'] : ['race', 'voc', 'style', 'cat'];
  hits.sort((a, b) => b[1].length - a[1].length || pref.indexOf(a[0]) - pref.indexOf(b[0]));
  const [kind, w] = hits[0]; const t = kind === 'race' ? M.TAG.race(w) : kind === 'voc' ? M.TAG.voc(w) : kind === 'style' ? M.TAG.style(byName.style[w]) : M.TAG.cat(byName.cat[w]);
  return t ? { t, len: w.length } : null;
};
// rich text now puts an icon in front of every tag word and colours it
const oldRich = M.rich;
M.rich = function (s, base, ctx) {
  s = String(s || ''); const out = []; let i = 0, buf = '';
  const flush = () => { if (buf) { oldRich(buf, base).forEach(g => out.push(g)); buf = ''; } };
  while (i < s.length) { const h = /[一-鿿]/.test(s[i]) ? M.tagWord(s, i, ctx) : null; if (h) { flush(); out.push({ img: M.iconURL(h.t.icon, 1), t: '' }); out.push({ t: h.t.n, c: h.t.c, b: 1 }); i += h.len; continue; } buf += s[i++]; }
  flush(); return out;
};
// sprites: icon keys resolve through the normal sprite API too
const oldSC = M.spriteCanvas;
M.spriteCanvas = function (key, s, tint) { if (IC[key] && !(M.SP[key])) return M.iconCanvas(key, Math.max(1, Math.round((s || 4) * 0.75))); return oldSC(key, s, tint); };
M.TAG_IC = { RACE_IC, VOC_IC, STYLE_IC, CAT_IC };
})();

;
