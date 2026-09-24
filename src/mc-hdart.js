// ==== mc-hdart.js ====
(function () {
const M = window.MC;
// Supersampled canvases keep their logical size in .width/.height (own props) while the bitmap is _k× denser.
// drawImage honours that everywhere, and switches smoothing on so dense art never goes blocky.
(function () {
  const CP = CanvasRenderingContext2D.prototype; if (CP._mcHi) return; CP._mcHi = 1;
  const nd = CP.drawImage;
  CP.drawImage = function (img) {
    const k = img && img._k, a = arguments; if (!k) return nd.apply(this, a);
    const sm = this.imageSmoothingEnabled, q = this.imageSmoothingQuality; this.imageSmoothingEnabled = !img._px; this.imageSmoothingQuality = 'medium';
    try {
      if (a.length === 3) nd.call(this, img, a[1], a[2], img.width, img.height);
      else if (a.length === 5) nd.call(this, img, a[1], a[2], a[3], a[4]);
      else nd.call(this, img, a[1] * k, a[2] * k, a[3] * k, a[4] * k, a[5], a[6], a[7], a[8]);
    } finally { this.imageSmoothingEnabled = sm; this.imageSmoothingQuality = q; }
  };
})();
M.hiRes = function (c, W, H, K) { c._k = K; Object.defineProperty(c, 'width', { value: W, configurable: true }); Object.defineProperty(c, 'height', { value: H, configurable: true }); return c; };
M.hdK = (S) => (S < 40 ? 4 : S < 90 ? 3 : 2);
const RACE = {
  兽人:{ skin:'#79a453', dark:'#3f5a2a', cloth:'#8a5530', acc:'#e8b850', glow:'#ffd070' }, 不死:{ skin:'#a8bccf', dark:'#4a5a6e', cloth:'#34466e', acc:'#7fe0ff', glow:'#8fe8ff' },
  骷髅:{ skin:'#efe7d4', dark:'#9c9480', cloth:'#3b3444', acc:'#b0f0ff', glow:'#9ffff0' }, 人类:{ skin:'#f0bf96', dark:'#9a6a4a', cloth:'#3d5fa8', acc:'#f0d070', glow:'#ffe8a0' },
  精灵:{ skin:'#f6d8b8', dark:'#a8845e', cloth:'#3a8a52', acc:'#b0ff80', glow:'#c0ffa0' }, 僵尸:{ skin:'#93aa74', dark:'#56663f', cloth:'#5a3a3a', acc:'#c8ff60', glow:'#d0ff70' },
  科技:{ skin:'#c2cad6', dark:'#6a7486', cloth:'#26324a', acc:'#4af0ff', glow:'#70f8ff' }, 恶魔:{ skin:'#cf5040', dark:'#6e2018', cloth:'#2c1418', acc:'#ff9a3a', glow:'#ff7a3a' },
  自然:{ skin:'#b0845a', dark:'#6a4a2a', cloth:'#4e7a2e', acc:'#e8ff80', glow:'#d8ff80' }, 虚空:{ skin:'#6a58a0', dark:'#2e2450', cloth:'#1c1634', acc:'#c890ff', glow:'#d0a0ff' },
  混沌:{ skin:'#9a3030', dark:'#3e0c0c', cloth:'#1c0a0a', acc:'#ff5a3a', glow:'#ff5a4a' }, 野兽:{ skin:'#9a7650', dark:'#4e3620', cloth:'#5a3a22', acc:'#ffb858', glow:'#ffbe70' },
  英雄:{ skin:'#f0c8a0', dark:'#8a5a3a', cloth:'#5a2a3a', acc:'#ffd060', glow:'#ffe0a0' },
};
M.RACE_PAL = RACE;
const QS = [1, 1.14, 1.3, 1.5];
M.QSIZE = QS;
function rnd(seed) { let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function kindOf(k) {
  if (/Stone$/.test(k)) return 'egg';
  if (/Tower|Fortress/.test(k)) return 'tower';
  if (/Catapult|Trebuchet|SiegeRam|Robo|bot$|Copter|Whirlybird|Nucleus|Cannoneer/.test(k)) return 'mech';
  if (/Dragon|Drake/.test(k) && !/Turtle/.test(k)) return 'dragon';
  if (/Bat$|Eagle|Wing|Manta/.test(k)) return 'fly';
  if (/Eye|Kraken|Nucleus/.test(k)) return 'eye';
  if (/Spider|Crab|Pincer|Snail|Worm|Turtle|Lizard(Enemy)?$|Porcupine|Mole/.test(k)) return 'bug';
  if (/Chick|Rooster|Turkey|Froggo/.test(k)) return 'bird';
  if (/Wolf|Bear|Boar|Horse|Pig|Dog|Rat|Hound|Leopard|Fang|Dino|Cerberus|Watchdog|Tree$|Snake/.test(k)) return /Tree$/.test(k) ? 'tree' : 'beast';
  return 'hum';
}
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const lg = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
const rg = (c, x, y, r, a, b) => { const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; } return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
M.shade = shade;

function weapon(c, voc, P, S, q, tech) {
  c.save(); c.lineCap = 'round';
  if (voc === '射手') {
    if (tech) { c.fillStyle = '#39424f'; rr(c, S * 0.1, -S * 0.62, S * 0.5, S * 0.12, 3); c.fill(); c.fillStyle = P.acc; c.fillRect(S * 0.52, -S * 0.6, S * 0.08, S * 0.08); c.fillStyle = '#222a34'; c.fillRect(S * 0.14, -S * 0.52, S * 0.1, S * 0.16); }
    else { c.strokeStyle = shade(P.cloth, -0.3); c.lineWidth = S * 0.05; c.beginPath(); c.arc(S * 0.18, -S * 0.56, S * 0.32, -1.2, 1.2); c.stroke(); c.strokeStyle = '#f5ecd8'; c.lineWidth = S * 0.012; c.beginPath(); c.moveTo(S * 0.18 + Math.cos(-1.2) * S * 0.32, -S * 0.56 + Math.sin(-1.2) * S * 0.32); c.lineTo(S * 0.18 + Math.cos(1.2) * S * 0.32, -S * 0.56 + Math.sin(1.2) * S * 0.32); c.stroke(); }
  } else if (voc === '法师' || voc === '祭司') {
    c.strokeStyle = voc === '祭司' ? '#e8d8a8' : '#6a4a2a'; c.lineWidth = S * 0.045; c.beginPath(); c.moveTo(S * 0.3, -S * 0.1); c.lineTo(S * 0.3, -S * 1.02); c.stroke();
    const oc = voc === '祭司' ? '#fff4c0' : P.glow; c.fillStyle = rg(c, S * 0.3, -S * 1.06, S * 0.11, '#ffffff', oc); c.beginPath(); c.arc(S * 0.3, -S * 1.06, S * 0.1, 0, 7); c.fill();
    c.globalCompositeOperation = 'lighter'; c.fillStyle = oc + '55'; c.beginPath(); c.arc(S * 0.3, -S * 1.06, S * 0.2, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over';
  } else if (voc === '先锋') {
    c.fillStyle = lg(c, -S * 0.8, -S * 0.2, shade(P.acc, 0.3), shade(P.acc, -0.4)); c.beginPath(); c.moveTo(S * 0.12, -S * 0.78); c.lineTo(S * 0.44, -S * 0.72); c.lineTo(S * 0.42, -S * 0.36); c.lineTo(S * 0.28, -S * 0.2); c.lineTo(S * 0.14, -S * 0.36); c.closePath(); c.fill();
    c.strokeStyle = shade(P.acc, -0.55); c.lineWidth = S * 0.02; c.stroke(); c.fillStyle = shade(P.cloth, 0.1); c.beginPath(); c.arc(S * 0.28, -S * 0.52, S * 0.06, 0, 7); c.fill();
  } else if (voc === '战士') {
    c.save(); c.translate(S * 0.26, -S * 0.46); c.rotate(-0.5); c.fillStyle = lg(c, -S * 0.7, 0, '#ffffff', '#8a95a3'); c.beginPath(); c.moveTo(-S * 0.045, 0); c.lineTo(-S * 0.045, -S * 0.62); c.lineTo(0, -S * 0.72); c.lineTo(S * 0.045, -S * 0.62); c.lineTo(S * 0.045, 0); c.fill();
    c.fillStyle = P.acc; c.fillRect(-S * 0.12, -S * 0.02, S * 0.24, S * 0.05); c.fillStyle = '#5a3a1a'; c.fillRect(-S * 0.025, 0, S * 0.05, S * 0.14); c.restore();
  } else if (voc === '商人') {
    c.fillStyle = rg(c, S * 0.3, -S * 0.36, S * 0.16, '#e0b870', '#7a5424'); c.beginPath(); c.arc(S * 0.3, -S * 0.34, S * 0.14, 0, 7); c.fill(); c.fillStyle = '#ffcc33'; c.beginPath(); c.arc(S * 0.3, -S * 0.34, S * 0.05, 0, 7); c.fill();
  } else {
    c.strokeStyle = '#f0ece0'; c.lineWidth = S * 0.025; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(S * 0.26, -S * 0.42 + i * S * 0.04); c.lineTo(S * 0.4, -S * 0.46 + i * S * 0.06); c.stroke(); }
  }
  c.restore();
}
function faceDetail(c, race, P, ex, ey, r) {
  const warm = /人类|英雄|精灵/.test(race), glowy = /不死|虚空|恶魔|混沌|僵尸/.test(race);
  c.save(); c.lineCap = 'round';
  c.strokeStyle = shade(P.dark, -0.35); c.lineWidth = r * 0.075; c.beginPath(); c.moveTo(ex - r * 0.12, ey - r * 0.25); c.lineTo(ex + r * 0.13, ey - r * 0.3); c.moveTo(ex - r * 0.54, ey - r * 0.27); c.lineTo(ex - r * 0.32, ey - r * 0.25); c.stroke();
  c.strokeStyle = shade(P.skin, -0.38); c.lineWidth = r * 0.06; c.beginPath(); c.moveTo(ex + r * 0.1, ey + r * 0.06); c.quadraticCurveTo(ex + r * 0.26, ey + r * 0.26, ex + r * 0.06, ey + r * 0.3); c.stroke();
  c.strokeStyle = glowy ? P.glow : shade(P.skin, -0.55); c.lineWidth = r * 0.065; c.beginPath(); c.moveTo(ex - r * 0.3, ey + r * 0.5); c.quadraticCurveTo(ex - r * 0.12, ey + r * 0.58, ex + r * 0.07, ey + r * 0.49); c.stroke();
  if (warm) { c.fillStyle = 'rgba(255,110,110,0.26)'; c.beginPath(); c.ellipse(ex + r * 0.12, ey + r * 0.32, r * 0.13, r * 0.08, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(ex - r * 0.44, ey + r * 0.3, r * 0.1, r * 0.07, 0, 0, 7); c.fill(); }
  c.restore();
}
function head(c, race, P, S, x, y, r, R, q) {
  const skull = race === '骷髅';
  c.fillStyle = rg(c, x, y, r, shade(P.skin, 0.35), shade(P.skin, -0.25)); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  if (!skull && race !== '科技' && race !== '精灵') { c.fillStyle = shade(P.skin, -0.12); c.beginPath(); c.ellipse(x - r * 0.62, y + r * 0.08, r * 0.15, r * 0.21, 0, 0, 7); c.fill(); c.fillStyle = shade(P.skin, -0.4); c.beginPath(); c.ellipse(x - r * 0.62, y + r * 0.1, r * 0.06, r * 0.1, 0, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.45, r * 0.3, r * 0.17, -0.5, 0, 7); c.fill();
  if (race === '精灵') { c.fillStyle = P.skin; c.beginPath(); c.moveTo(x - r * 0.6, y - r * 0.1); c.lineTo(x - r * 1.5, y - r * 0.7); c.lineTo(x - r * 0.7, y + r * 0.3); c.fill(); }
  if (race === '兽人' || race === '野兽') { c.fillStyle = '#f5ecd8'; c.beginPath(); c.moveTo(x + r * 0.35, y + r * 0.45); c.lineTo(x + r * 0.45, y + r * 0.05); c.lineTo(x + r * 0.58, y + r * 0.45); c.fill(); }
  if (race === '恶魔' || race === '混沌') { c.fillStyle = lg(c, y - r * 1.8, y, '#2a1010', '#6a4a3a'); [[-0.5, -1], [0.45, 1]].forEach(([dx, s]) => { c.beginPath(); c.moveTo(x + r * dx - r * 0.2, y - r * 0.7); c.quadraticCurveTo(x + r * dx + s * r * 0.5, y - r * 1.4, x + r * dx + s * r * 0.2, y - r * 1.9); c.lineTo(x + r * dx + r * 0.2, y - r * 0.7); c.fill(); }); }
  if (race === '不死' || race === '虚空') { c.fillStyle = lg(c, y - r * 1.4, y + r, shade(P.cloth, 0.2), shade(P.cloth, -0.4)); c.beginPath(); c.moveTo(x - r * 1.2, y + r * 0.8); c.quadraticCurveTo(x - r * 1.3, y - r * 1.5, x + r * 0.2, y - r * 1.35); c.quadraticCurveTo(x + r * 1.3, y - r * 1.1, x + r * 1.15, y + r * 0.2); c.lineTo(x + r * 0.7, y + r * 0.2); c.quadraticCurveTo(x + r * 0.7, y - r * 0.8, x - r * 0.2, y - r * 0.7); c.quadraticCurveTo(x - r * 0.7, y, x - r * 0.4, y + r * 0.8); c.fill(); }
  if (race === '科技') { c.fillStyle = lg(c, y - r, y + r * 0.2, '#e8eef6', '#6a7486'); c.beginPath(); c.arc(x, y - r * 0.1, r * 1.08, Math.PI, 0); c.lineTo(x + r * 1.08, y + r * 0.2); c.lineTo(x - r * 1.08, y + r * 0.2); c.fill(); c.fillStyle = P.acc; rr(c, x - r * 0.1, y - r * 0.32, r * 1.1, r * 0.34, r * 0.15); c.fill(); }
  if (race === '人类' || race === '英雄') { const hc = shade(R() < 0.5 ? '#4a2e1c' : '#c89a48', -0.1 * R()); c.fillStyle = hc; c.beginPath(); c.arc(x - r * 0.1, y - r * 0.2, r * 1.02, Math.PI * 0.95, Math.PI * 2.05); c.quadraticCurveTo(x + r * 0.6, y - r * 0.5, x - r * 0.9, y + r * 0.3); c.fill();
    c.strokeStyle = shade(hc, 0.38); c.lineWidth = r * 0.07; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i < 4; i++) { const a = Math.PI * (1.1 + i * 0.2), cx0 = x - r * 0.1, cy0 = y - r * 0.2; c.moveTo(cx0 + Math.cos(a) * r * 0.92, cy0 + Math.sin(a) * r * 0.92); c.quadraticCurveTo(cx0 + Math.cos(a + 0.2) * r * 0.6, cy0 + Math.sin(a + 0.2) * r * 0.6, cx0 + Math.cos(a + 0.35) * r * 0.32, cy0 + Math.sin(a + 0.35) * r * 0.32); } c.stroke(); }
  if (race === '自然') { c.fillStyle = '#6ab040'; for (let i = 0; i < 5; i++) { const a = Math.PI + i * Math.PI / 4; c.beginPath(); c.ellipse(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.36, r * 0.16, a, 0, 7); c.fill(); } }
  if (race === '僵尸') { c.strokeStyle = '#3a2a2a'; c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(x - r * 0.6, y - r * 0.5); c.lineTo(x + r * 0.1, y - r * 0.7); c.stroke(); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x - r * 0.45 + i * r * 0.22, y - r * 0.75); c.lineTo(x - r * 0.4 + i * r * 0.22, y - r * 0.45); c.stroke(); } }
  const ex = x + r * 0.42, ey = y - r * 0.05;
  if (race !== '科技') {
    if (skull) { c.fillStyle = '#1a1418'; c.beginPath(); c.ellipse(ex, ey, r * 0.2, r * 0.24, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(ex - r * 0.48, ey, r * 0.18, r * 0.22, 0, 0, 7); c.fill(); c.fillStyle = P.glow; c.beginPath(); c.arc(ex, ey, r * 0.08, 0, 7); c.fill(); c.beginPath(); c.arc(ex - r * 0.48, ey, r * 0.07, 0, 7); c.fill(); }
    else { const glowy = /不死|虚空|恶魔|混沌|僵尸/.test(race); c.fillStyle = glowy ? P.glow : '#1a1418'; c.beginPath(); c.ellipse(ex, ey, r * 0.1, r * 0.14, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(ex - r * 0.4, ey, r * 0.09, r * 0.13, 0, 0, 7); c.fill(); if (!glowy) { c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + r * 0.03, ey - r * 0.05, r * 0.04, 0, 7); c.fill(); } }
    if (!skull) faceDetail(c, race, P, ex, ey, r);
  }
  if (q >= 3) { c.fillStyle = lg(c, y - r * 1.9, y - r * 0.9, '#fff4b0', '#d8a020'); c.beginPath(); c.moveTo(x - r * 0.7, y - r * 0.9); for (let i = 0; i <= 4; i++) c.lineTo(x - r * 0.7 + i * r * 0.35, y - r * (i % 2 ? 1.2 : 1.75)); c.lineTo(x + r * 0.7, y - r * 0.9); c.fill(); }
}
function paintHum(c, D, P, S, R) {
  const q = D.q, bw = S * (0.36 + R() * 0.06 + (D.voc === '先锋' ? 0.06 : 0)), cloth = shade(P.cloth, (R() - 0.5) * 0.3);
  c.lineCap = 'round';
  // legs + boots
  c.strokeStyle = shade(cloth, -0.45); c.lineWidth = S * 0.1; c.beginPath(); c.moveTo(-S * 0.08, -S * 0.36); c.lineTo(-S * 0.12, -S * 0.04); c.moveTo(S * 0.08, -S * 0.36); c.lineTo(S * 0.12, -S * 0.04); c.stroke();
  c.strokeStyle = shade(cloth, -0.22); c.lineWidth = S * 0.028; c.beginPath(); c.moveTo(-S * 0.1, -S * 0.34); c.lineTo(-S * 0.135, -S * 0.08); c.moveTo(S * 0.06, -S * 0.34); c.lineTo(S * 0.095, -S * 0.08); c.stroke();
  c.fillStyle = '#231a18'; rr(c, -S * 0.2, -S * 0.07, S * 0.15, S * 0.07, S * 0.03); c.fill(); rr(c, S * 0.05, -S * 0.07, S * 0.15, S * 0.07, S * 0.03); c.fill();
  c.fillStyle = '#5a463e'; c.fillRect(-S * 0.18, -S * 0.068, S * 0.11, S * 0.013); c.fillRect(S * 0.07, -S * 0.068, S * 0.11, S * 0.013);
  c.fillStyle = '#0e0909'; c.fillRect(-S * 0.2, -S * 0.013, S * 0.15, S * 0.013); c.fillRect(S * 0.05, -S * 0.013, S * 0.15, S * 0.013);
  if (q >= 2) { c.fillStyle = lg(c, -S * 0.78, -S * 0.1, shade(P.acc, -0.2), shade(P.acc, -0.6)); c.beginPath(); c.moveTo(-bw * 0.4, -S * 0.76); c.quadraticCurveTo(-bw * 1.4, -S * 0.4, -bw * 1.2, -S * 0.14); c.lineTo(-bw * 0.2, -S * 0.3); c.fill();
    c.strokeStyle = shade(P.acc, -0.7); c.lineWidth = S * 0.01; c.beginPath(); c.moveTo(-bw * 0.6, -S * 0.62); c.quadraticCurveTo(-bw * 1.05, -S * 0.4, -bw * 0.95, -S * 0.2); c.stroke(); }
  // torso
  const torso = () => { c.beginPath(); c.moveTo(-bw * 0.5, -S * 0.78); c.lineTo(bw * 0.5, -S * 0.78); c.lineTo(bw * 0.62, -S * 0.3); c.lineTo(-bw * 0.62, -S * 0.3); c.closePath(); };
  c.fillStyle = lg(c, -S * 0.8, -S * 0.3, shade(cloth, 0.25), shade(cloth, -0.35)); torso(); c.fill();
  c.save(); torso(); c.clip();
  const hs = c.createLinearGradient(-bw * 0.62, 0, bw * 0.62, 0); hs.addColorStop(0, 'rgba(255,240,220,0.16)'); hs.addColorStop(0.45, 'rgba(0,0,0,0)'); hs.addColorStop(1, 'rgba(0,0,0,0.3)'); c.fillStyle = hs; c.fillRect(-bw, -S * 0.8, bw * 2, S * 0.52);
  c.strokeStyle = shade(cloth, -0.42); c.lineWidth = S * 0.011; c.beginPath(); c.moveTo(-bw * 0.28, -S * 0.62); c.quadraticCurveTo(-bw * 0.34, -S * 0.5, -bw * 0.22, -S * 0.43); c.moveTo(bw * 0.32, -S * 0.66); c.quadraticCurveTo(bw * 0.38, -S * 0.52, bw * 0.3, -S * 0.43); c.stroke();
  c.strokeStyle = shade(cloth, -0.55); c.lineWidth = S * 0.012; c.beginPath(); c.moveTo(S * 0.02, -S * 0.7); c.lineTo(S * 0.02, -S * 0.43); c.stroke();
  c.fillStyle = shade(P.acc, 0.2); for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(S * 0.048, -S * 0.66 + i * S * 0.075, S * 0.012, 0, 7); c.fill(); }
  c.restore();
  c.fillStyle = shade(cloth, 0.32); c.beginPath(); c.moveTo(-bw * 0.36, -S * 0.785); c.lineTo(S * 0.02, -S * 0.69); c.lineTo(bw * 0.36, -S * 0.785); c.lineTo(bw * 0.2, -S * 0.8); c.lineTo(S * 0.02, -S * 0.73); c.lineTo(-bw * 0.2, -S * 0.8); c.closePath(); c.fill();
  if (D.voc === '法师' || D.voc === '祭司') { c.fillStyle = lg(c, -S * 0.5, -S * 0.1, shade(cloth, 0.05), shade(cloth, -0.45)); c.beginPath(); c.moveTo(-bw * 0.6, -S * 0.4); c.lineTo(bw * 0.6, -S * 0.4); c.lineTo(bw * 0.78, -S * 0.08); c.lineTo(-bw * 0.78, -S * 0.08); c.fill();
    c.strokeStyle = shade(cloth, -0.5); c.lineWidth = S * 0.01; c.beginPath(); c.moveTo(-bw * 0.2, -S * 0.38); c.lineTo(-bw * 0.3, -S * 0.1); c.moveTo(bw * 0.25, -S * 0.38); c.lineTo(bw * 0.36, -S * 0.1); c.stroke();
    c.fillStyle = P.acc; c.beginPath(); c.moveTo(-bw * 0.78, -S * 0.08); c.lineTo(bw * 0.78, -S * 0.08); c.lineTo(bw * 0.77, -S * 0.105); c.lineTo(-bw * 0.77, -S * 0.105); c.fill(); }
  if (D.voc === '先锋' || D.voc === '战士') { c.fillStyle = lg(c, -S * 0.82, -S * 0.6, '#e0e6ee', '#7a8494'); c.beginPath(); c.ellipse(-bw * 0.35, -S * 0.74, bw * 0.3, S * 0.07, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(bw * 0.35, -S * 0.74, bw * 0.3, S * 0.07, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-bw * 0.42, -S * 0.765, bw * 0.12, S * 0.017, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(bw * 0.28, -S * 0.765, bw * 0.12, S * 0.017, 0, 0, 7); c.fill();
    c.fillStyle = '#4a5260'; [-0.35, 0.35].forEach(k => { c.beginPath(); c.arc(bw * k, -S * 0.72, S * 0.012, 0, 7); c.fill(); }); }
  // belt + buckle
  c.fillStyle = '#3a2a1e'; c.fillRect(-bw * 0.6, -S * 0.435, bw * 1.2, S * 0.048); c.fillStyle = shade(P.acc, -0.1); c.fillRect(-bw * 0.6, -S * 0.435, bw * 1.2, S * 0.01);
  c.fillStyle = shade(P.acc, 0.25); rr(c, -S * 0.02, -S * 0.447, S * 0.075, S * 0.065, S * 0.012); c.fill(); c.fillStyle = '#2a1e14'; c.fillRect(-S * 0.002, -S * 0.43, S * 0.038, S * 0.032);
  // neck
  c.fillStyle = shade(P.skin, -0.22); c.fillRect(-S * 0.03, -S * 0.82, S * 0.075, S * 0.06);
  // front arm: sleeve, forearm, hand
  const arm = (x0, y0, x1, y1, w0) => { const mx = x0 + (x1 - x0) * 0.55, my = y0 + (y1 - y0) * 0.55; c.strokeStyle = shade(cloth, 0.06); c.lineWidth = w0 * 1.15; c.beginPath(); c.moveTo(x0, y0); c.lineTo(mx, my); c.stroke(); c.strokeStyle = shade(P.skin, -0.12); c.lineWidth = w0 * 0.82; c.beginPath(); c.moveTo(mx, my); c.lineTo(x1, y1); c.stroke(); c.fillStyle = shade(cloth, -0.3); c.beginPath(); c.arc(mx, my, w0 * 0.55, 0, 7); c.fill(); c.fillStyle = rg(c, x1, y1, w0 * 0.6, shade(P.skin, 0.25), shade(P.skin, -0.25)); c.beginPath(); c.arc(x1, y1, w0 * 0.55, 0, 7); c.fill(); };
  // pose: 1 = swing (weapon thrown forward), 2 = cast (weapon raised high)
  const pose = D.pose || 0, hx = pose === 2 ? S * 0.3 : pose === 1 ? S * 0.36 : S * 0.28, hy = pose === 2 ? -S * 0.86 : pose === 1 ? -S * 0.56 : -S * 0.46;
  arm(bw * 0.45, -S * 0.72, hx, hy, S * 0.075);
  head(c, D.race, P, S, S * 0.02, -S * 0.9, S * 0.16, R, q);
  c.save(); c.translate(hx, hy); c.rotate(pose === 2 ? -0.35 : pose === 1 ? 0.75 : 0); c.translate(-S * 0.28, S * 0.46); weapon(c, D.voc, P, S, q, D.race === '科技'); c.restore();
  arm(-bw * 0.45, -S * 0.72, pose === 2 ? -bw * 0.7 : -bw * 0.6, pose === 2 ? -S * 0.84 : -S * 0.46, S * 0.07);
}
function paintBeast(c, D, P, S, R) {
  const k = D.key, big = /Bear|Boar|Dino|Cerberus/.test(k), bw = S * (big ? 0.6 : 0.5), bh = S * (big ? 0.34 : 0.26), by = -S * 0.34, fur = shade(P.skin, (R() - 0.5) * 0.3);
  if (/Wolf|Fang|Dog|Hound|Leopard|Cerberus|Watchdog/.test(k)) { c.strokeStyle = shade(fur, -0.2); c.lineWidth = S * 0.08; c.lineCap = 'round'; c.beginPath(); c.moveTo(-bw * 0.9, by - bh * 0.2); c.quadraticCurveTo(-bw * 1.3, by - bh * 1.2, -bw * 1.5, by - bh * 0.6); c.stroke(); }
  c.fillStyle = shade(fur, -0.4); [[-0.6, 0], [-0.25, 1], [0.35, 0], [0.62, 1]].forEach(([dx, o]) => rr(c, bw * dx - S * 0.05, by, S * 0.1, -by - (o ? S * 0.01 : 0), S * 0.04) || c.fill());
  c.fillStyle = rg(c, 0, by, bw, shade(fur, 0.3), shade(fur, -0.35)); c.beginPath(); c.ellipse(0, by, bw, bh, 0, 0, 7); c.fill();
  if (/Horse/.test(k)) { c.fillStyle = shade(P.acc, -0.2); c.fillRect(-bw * 0.4, by - bh * 0.9, bw * 0.8, bh * 0.35); }
  const hx = bw * 0.95, hy = by - bh * 0.7, hr = S * (big ? 0.2 : 0.16);
  c.fillStyle = rg(c, hx, hy, hr * 1.3, shade(fur, 0.35), shade(fur, -0.3)); c.beginPath(); c.ellipse(hx, hy, hr * 1.1, hr, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(hx + hr * 0.9, hy + hr * 0.3, hr * 0.7, hr * 0.45, 0, 0, 7); c.fill();
  c.fillStyle = shade(fur, -0.3); if (/Bear/.test(k)) { c.beginPath(); c.arc(hx - hr * 0.5, hy - hr * 0.8, hr * 0.35, 0, 7); c.fill(); } else if (!/Boar|Pig|Rat|Horse/.test(k) || /Rat/.test(k)) { c.beginPath(); c.moveTo(hx - hr * 0.6, hy - hr * 0.5); c.lineTo(hx - hr * 0.3, hy - hr * 1.6); c.lineTo(hx + hr * 0.1, hy - hr * 0.6); c.fill(); }
  if (/Boar|Pig/.test(k)) { c.fillStyle = '#f5ecd8'; c.beginPath(); c.moveTo(hx + hr * 1.1, hy + hr * 0.5); c.quadraticCurveTo(hx + hr * 1.6, hy, hx + hr * 1.3, hy - hr * 0.5); c.lineTo(hx + hr * 1.05, hy + hr * 0.2); c.fill(); }
  if (/Cerberus/.test(k)) { [-0.9, 0.9].forEach(o => { c.fillStyle = shade(fur, -0.1); c.beginPath(); c.ellipse(hx - hr * 0.4, hy + o * hr * 0.9, hr * 0.8, hr * 0.7, 0, 0, 7); c.fill(); }); }
  c.fillStyle = P.glow; c.beginPath(); c.arc(hx + hr * 0.35, hy - hr * 0.2, hr * 0.14, 0, 7); c.fill();
  c.fillStyle = '#1a1010'; c.beginPath(); c.arc(hx + hr * 1.55, hy + hr * 0.2, hr * 0.12, 0, 7); c.fill();
  if (D.q >= 2) { c.strokeStyle = P.acc; c.lineWidth = S * 0.03; c.beginPath(); c.ellipse(hx - hr * 0.3, hy + hr * 0.7, hr * 0.8, hr * 0.3, 0.3, 0, Math.PI); c.stroke(); }
}
function paintBug(c, D, P, S, R) {
  const k = D.key, sh = shade(P.skin, (R() - 0.5) * 0.2);
  if (/Snail|Turtle/.test(k)) {
    c.fillStyle = rg(c, S * 0.2, -S * 0.08, S * 0.3, shade(sh, 0.3), shade(sh, -0.3)); c.beginPath(); c.ellipse(S * 0.1, -S * 0.08, S * 0.48, S * 0.1, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(S * 0.44, -S * 0.22, S * 0.1, S * 0.16, 0.3, 0, 7); c.fill();
    c.fillStyle = rg(c, -S * 0.05, -S * 0.34, S * 0.34, shade(P.acc, 0.2), shade(P.acc, -0.5)); c.beginPath(); c.arc(-S * 0.05, -S * 0.32, S * 0.28, 0, 7); c.fill();
    c.strokeStyle = shade(P.acc, -0.6); c.lineWidth = S * 0.03; c.beginPath(); for (let a = 0; a < 12; a += 0.2) { const r = S * 0.02 * a; c.lineTo(-S * 0.05 + Math.cos(a) * r, -S * 0.32 + Math.sin(a) * r); } c.stroke();
    c.fillStyle = '#111'; c.beginPath(); c.arc(S * 0.5, -S * 0.3, S * 0.03, 0, 7); c.fill(); return;
  }
  if (/Worm/.test(k)) { for (let i = 0; i < 5; i++) { const x = -S * 0.4 + i * S * 0.2, y = -S * 0.12 - Math.sin(i * 0.9) * S * 0.08; c.fillStyle = rg(c, x, y, S * 0.16, shade(sh, 0.35), shade(sh, -0.3)); c.beginPath(); c.arc(x, y, S * (0.12 + i * 0.012), 0, 7); c.fill(); } c.fillStyle = P.glow; c.beginPath(); c.arc(S * 0.44, -S * 0.2, S * 0.035, 0, 7); c.fill(); return; }
  const legs = /Spider/.test(k) ? 4 : 3; c.strokeStyle = shade(sh, -0.45); c.lineWidth = S * 0.035; c.lineCap = 'round';
  for (let i = 0; i < legs; i++) { const x = -S * 0.18 + i * S * 0.14; [-1, 1].forEach(s => { c.beginPath(); c.moveTo(x, -S * 0.22); c.quadraticCurveTo(x + s * S * 0.2, -S * 0.44, x + s * S * 0.3, -S * 0.02); c.stroke(); }); }
  c.fillStyle = rg(c, 0, -S * 0.24, S * 0.3, shade(sh, 0.3), shade(sh, -0.35)); c.beginPath(); c.ellipse(-S * 0.12, -S * 0.26, S * 0.28, S * 0.2, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(S * 0.2, -S * 0.24, S * 0.14, S * 0.12, 0, 0, 7); c.fill();
  if (/Crab|Pincer/.test(k)) { c.fillStyle = shade(sh, 0.1); [[S * 0.36, -S * 0.4], [S * 0.4, -S * 0.2]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, S * 0.12, S * 0.07, -0.4, 0, 7); c.fill(); }); }
  if (/Porcupine/.test(k)) { c.strokeStyle = '#e8dcc4'; c.lineWidth = S * 0.02; for (let i = 0; i < 9; i++) { const a = Math.PI + i * 0.35; c.beginPath(); c.moveTo(-S * 0.12 + Math.cos(a) * S * 0.2, -S * 0.26 + Math.sin(a) * S * 0.15); c.lineTo(-S * 0.12 + Math.cos(a) * S * 0.38, -S * 0.26 + Math.sin(a) * S * 0.3); c.stroke(); } }
  c.fillStyle = P.glow; for (let i = 0; i < (/Spider/.test(k) ? 3 : 1); i++) { c.beginPath(); c.arc(S * 0.26 + i * S * 0.03, -S * 0.28 + i * S * 0.03, S * 0.025, 0, 7); c.fill(); }
}
function paintBird(c, D, P, S) { const b = /Froggo/.test(D.key) ? '#6aa84f' : /Turkey/.test(D.key) ? '#8a5a3a' : /Rooster/.test(D.key) ? '#f0e8d8' : '#ffe07a';
  c.fillStyle = '#e0a030'; c.fillRect(-S * 0.08, -S * 0.12, S * 0.04, S * 0.12); c.fillRect(S * 0.04, -S * 0.12, S * 0.04, S * 0.12);
  c.fillStyle = rg(c, 0, -S * 0.3, S * 0.3, shade(b, 0.4), shade(b, -0.3)); c.beginPath(); c.ellipse(0, -S * 0.3, S * 0.26, S * 0.22, 0, 0, 7); c.fill(); c.beginPath(); c.arc(S * 0.18, -S * 0.52, S * 0.14, 0, 7); c.fill();
  c.fillStyle = shade(b, -0.2); c.beginPath(); c.ellipse(-S * 0.06, -S * 0.3, S * 0.14, S * 0.09, -0.3, 0, 7); c.fill();
  c.fillStyle = '#ff9a2a'; c.beginPath(); c.moveTo(S * 0.3, -S * 0.54); c.lineTo(S * 0.42, -S * 0.5); c.lineTo(S * 0.3, -S * 0.46); c.fill();
  if (/Rooster/.test(D.key)) { c.fillStyle = '#e03a3a'; c.beginPath(); c.arc(S * 0.16, -S * 0.68, S * 0.06, 0, 7); c.fill(); }
  c.fillStyle = '#111'; c.beginPath(); c.arc(S * 0.22, -S * 0.56, S * 0.025, 0, 7); c.fill(); }
function paintDragon(c, D, P, S, R) {
  const sc = shade(P.skin, (R() - 0.5) * 0.25), k = D.key, col = /Red/.test(k) ? '#d0453c' : /Black/.test(k) ? '#3a3040' : /Gold/.test(k) ? '#e8b030' : /Blue/.test(k) ? '#4a8ad0' : /Green|Emerald|Poison/.test(k) ? '#4aa860' : /Sky/.test(k) ? '#8ad0f0' : /Magic/.test(k) ? '#9a5ad0' : /Bone/.test(k) ? '#e8e0cc' : sc;
  c.fillStyle = lg(c, -S * 1.1, -S * 0.3, shade(col, 0.1), shade(col, -0.5)); c.beginPath(); c.moveTo(-S * 0.1, -S * 0.5); c.quadraticCurveTo(-S * 0.5, -S * 1.2, -S * 0.9, -S * 0.9); c.lineTo(-S * 0.62, -S * 0.72); c.lineTo(-S * 0.72, -S * 0.5); c.lineTo(-S * 0.4, -S * 0.46); c.closePath(); c.fill();
  c.strokeStyle = shade(col, -0.2); c.lineWidth = S * 0.1; c.lineCap = 'round'; c.beginPath(); c.moveTo(-S * 0.3, -S * 0.28); c.quadraticCurveTo(-S * 0.7, -S * 0.2, -S * 0.8, -S * 0.42); c.stroke();
  c.fillStyle = shade(col, -0.35); rr(c, -S * 0.22, -S * 0.2, S * 0.1, S * 0.2, S * 0.04); c.fill(); rr(c, S * 0.1, -S * 0.2, S * 0.1, S * 0.2, S * 0.04); c.fill();
  c.fillStyle = rg(c, 0, -S * 0.34, S * 0.4, shade(col, 0.35), shade(col, -0.35)); c.beginPath(); c.ellipse(0, -S * 0.34, S * 0.36, S * 0.2, 0, 0, 7); c.fill();
  c.fillStyle = shade(P.acc, 0.2); c.beginPath(); c.ellipse(S * 0.08, -S * 0.26, S * 0.2, S * 0.1, 0, 0, 7); c.fill();
  c.strokeStyle = col; c.lineWidth = S * 0.12; c.beginPath(); c.moveTo(S * 0.22, -S * 0.42); c.quadraticCurveTo(S * 0.34, -S * 0.66, S * 0.44, -S * 0.72); c.stroke();
  c.fillStyle = rg(c, S * 0.5, -S * 0.74, S * 0.16, shade(col, 0.4), shade(col, -0.3)); c.beginPath(); c.ellipse(S * 0.52, -S * 0.74, S * 0.16, S * 0.1, 0.1, 0, 7); c.fill();
  c.fillStyle = '#f5ecd8'; c.beginPath(); c.moveTo(S * 0.46, -S * 0.82); c.lineTo(S * 0.36, -S * 1.0); c.lineTo(S * 0.52, -S * 0.84); c.fill();
  c.fillStyle = P.glow; c.beginPath(); c.arc(S * 0.56, -S * 0.78, S * 0.028, 0, 7); c.fill();
  c.fillStyle = lg(c, -S * 1.1, -S * 0.3, shade(col, 0.3), shade(col, -0.3)); c.beginPath(); c.moveTo(S * 0.05, -S * 0.46); c.quadraticCurveTo(-S * 0.1, -S * 1.25, -S * 0.55, -S * 1.08); c.lineTo(-S * 0.34, -S * 0.9); c.lineTo(-S * 0.4, -S * 0.7); c.lineTo(-S * 0.14, -S * 0.5); c.closePath(); c.fill();
}
function paintFly(c, D, P, S) {
  const col = shade(P.skin, -0.1), y = -S * 0.62;
  c.fillStyle = lg(c, y - S * 0.4, y + S * 0.2, shade(col, 0.2), shade(col, -0.5));
  [-1, 1].forEach(s => { c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(s * S * 0.3, y - S * 0.4, s * S * 0.62, y - S * 0.18); c.lineTo(s * S * 0.5, y); c.lineTo(s * S * 0.58, y + S * 0.1); c.lineTo(s * S * 0.3, y + S * 0.04); c.closePath(); c.fill(); });
  c.fillStyle = rg(c, 0, y, S * 0.2, shade(col, 0.4), shade(col, -0.3)); c.beginPath(); c.ellipse(0, y, S * 0.16, S * 0.2, 0, 0, 7); c.fill();
  if (/Copter|Whirlybird/.test(D.key)) { c.fillStyle = '#c0c8d4'; c.fillRect(-S * 0.5, y - S * 0.3, S, S * 0.03); }
  c.fillStyle = P.glow; c.beginPath(); c.arc(S * 0.07, y - S * 0.05, S * 0.03, 0, 7); c.fill(); c.beginPath(); c.arc(-S * 0.05, y - S * 0.05, S * 0.03, 0, 7); c.fill();
}
function paintEye(c, D, P, S) {
  const k = D.key, col = /Red/.test(k) ? '#c0303a' : /Dark/.test(k) ? '#3a2040' : /Kraken/.test(k) ? '#3a6a8a' : P.skin, y = -S * 0.5;
  if (/Kraken/.test(k)) { c.strokeStyle = shade(col, -0.2); c.lineWidth = S * 0.09; c.lineCap = 'round'; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-S * 0.3 + i * S * 0.12, y + S * 0.2); c.quadraticCurveTo(-S * 0.4 + i * S * 0.16, y + S * 0.4, -S * 0.3 + i * S * 0.14, -S * 0.02); c.stroke(); } }
  else { c.strokeStyle = shade(col, -0.3); c.lineWidth = S * 0.05; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-S * 0.1 + i * S * 0.07, y + S * 0.2); c.quadraticCurveTo(-S * 0.2 + i * S * 0.12, y + S * 0.4, -S * 0.15 + i * S * 0.1, -S * 0.02); c.stroke(); } }
  c.fillStyle = rg(c, 0, y, S * 0.36, shade(col, 0.35), shade(col, -0.45)); c.beginPath(); c.arc(0, y, S * 0.3, 0, 7); c.fill();
  const n = /Four/.test(k) ? 4 : 1; for (let i = 0; i < n; i++) { const ex = n > 1 ? S * (0.02 + (i % 2) * 0.14) : S * 0.08, ey = n > 1 ? y - S * 0.08 + Math.floor(i / 2) * S * 0.14 : y, er = S * (n > 1 ? 0.06 : 0.14);
    c.fillStyle = '#f8f0e0'; c.beginPath(); c.arc(ex, ey, er, 0, 7); c.fill(); c.fillStyle = P.glow; c.beginPath(); c.arc(ex + er * 0.25, ey, er * 0.55, 0, 7); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(ex + er * 0.35, ey, er * 0.25, 0, 7); c.fill(); }
}
function paintMech(c, D, P, S) {
  const k = D.key, metal = '#8a92a0';
  if (/Catapult|Trebuchet/.test(k)) { c.fillStyle = '#6a4a2a'; rr(c, -S * 0.42, -S * 0.3, S * 0.84, S * 0.14, S * 0.03); c.fill(); c.strokeStyle = '#5a3a1a'; c.lineWidth = S * 0.06; c.beginPath(); c.moveTo(-S * 0.1, -S * 0.3); c.lineTo(S * 0.36, -S * 0.9); c.stroke(); c.fillStyle = '#4a4a50'; c.beginPath(); c.arc(S * 0.4, -S * 0.95, S * 0.08, 0, 7); c.fill(); [-0.3, 0.3].forEach(x => { c.fillStyle = '#3a2a1a'; c.beginPath(); c.arc(S * x, -S * 0.1, S * 0.1, 0, 7); c.fill(); c.fillStyle = metal; c.beginPath(); c.arc(S * x, -S * 0.1, S * 0.04, 0, 7); c.fill(); }); return; }
  if (/SiegeRam/.test(k)) { c.fillStyle = lg(c, -S * 0.6, 0, '#7a5a3a', '#3a2a1a'); rr(c, -S * 0.5, -S * 0.56, S * 0.9, S * 0.44, S * 0.06); c.fill(); c.fillStyle = metal; c.beginPath(); c.moveTo(S * 0.4, -S * 0.44); c.lineTo(S * 0.66, -S * 0.34); c.lineTo(S * 0.4, -S * 0.24); c.fill(); [-0.3, 0.2].forEach(x => { c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(S * x, -S * 0.1, S * 0.1, 0, 7); c.fill(); }); return; }
  c.fillStyle = '#2a3040'; rr(c, -S * 0.16, -S * 0.3, S * 0.1, S * 0.3, S * 0.03); c.fill(); rr(c, S * 0.06, -S * 0.3, S * 0.1, S * 0.3, S * 0.03); c.fill();
  c.fillStyle = lg(c, -S * 0.8, -S * 0.3, '#dde4ee', '#5a6474'); rr(c, -S * 0.26, -S * 0.8, S * 0.52, S * 0.5, S * 0.08); c.fill();
  c.fillStyle = '#1a2030'; rr(c, -S * 0.14, -S * 0.72, S * 0.34, S * 0.14, S * 0.04); c.fill(); c.fillStyle = P.acc; c.fillRect(-S * 0.06, -S * 0.68, S * 0.22, S * 0.05);
  c.fillStyle = P.glow; c.beginPath(); c.arc(0, -S * 0.46, S * 0.06, 0, 7); c.fill();
  c.fillStyle = '#4a5260'; rr(c, S * 0.2, -S * 0.6, S * 0.3, S * 0.08, S * 0.03); c.fill();
}
function paintTower(c, D, P, S) {
  const k = D.key, stone = /Fortress/.test(k) ? '#6a8a4a' : '#7a7080';
  c.fillStyle = lg(c, -S * 1.1, 0, shade(stone, 0.3), shade(stone, -0.4)); c.beginPath(); c.moveTo(-S * 0.3, 0); c.lineTo(-S * 0.24, -S * 0.9); c.lineTo(S * 0.24, -S * 0.9); c.lineTo(S * 0.3, 0); c.fill();
  c.fillStyle = shade(stone, -0.2); for (let i = 0; i < 4; i++) c.fillRect(-S * 0.3 + i * S * 0.17, -S * 1.02, S * 0.1, S * 0.14);
  c.fillStyle = '#1a1418'; rr(c, -S * 0.08, -S * 0.7, S * 0.16, S * 0.22, S * 0.08); c.fill();
  c.fillStyle = P.glow; c.beginPath(); c.arc(0, -S * 0.6, S * 0.06, 0, 7); c.fill();
  if (/Fortress/.test(k)) { c.strokeStyle = '#3a7a2a'; c.lineWidth = S * 0.04; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-S * 0.3 + i * S * 0.25, 0); c.quadraticCurveTo(-S * 0.1 + i * S * 0.2, -S * 0.5, -S * 0.25 + i * S * 0.25, -S * 0.9); c.stroke(); } }
}
function paintEgg(c, D, P, S) { c.fillStyle = rg(c, 0, -S * 0.4, S * 0.4, '#bfe8ff', '#2a6aa0'); c.beginPath(); c.ellipse(0, -S * 0.38, S * 0.28, S * 0.36, 0, 0, 7); c.fill(); c.strokeStyle = '#8fe0ff'; c.lineWidth = S * 0.02; c.beginPath(); c.moveTo(-S * 0.2, -S * 0.4); c.lineTo(-S * 0.05, -S * 0.5); c.lineTo(S * 0.05, -S * 0.36); c.lineTo(S * 0.2, -S * 0.46); c.stroke(); }
function paintTree(c, D, P, S) { c.fillStyle = lg(c, -S * 0.6, 0, '#8a6a3a', '#4a3018'); c.beginPath(); c.moveTo(-S * 0.14, 0); c.lineTo(-S * 0.08, -S * 0.6); c.lineTo(S * 0.08, -S * 0.6); c.lineTo(S * 0.14, 0); c.fill(); c.fillStyle = rg(c, 0, -S * 0.82, S * 0.4, '#b8ff80', '#2a6a2a'); c.beginPath(); c.arc(0, -S * 0.82, S * 0.36, 0, 7); c.fill(); c.fillStyle = '#ffe080'; c.beginPath(); c.arc(S * 0.1, -S * 0.7, S * 0.04, 0, 7); c.fill(); c.beginPath(); c.arc(-S * 0.14, -S * 0.9, S * 0.04, 0, 7); c.fill(); }
const PAINT = { hum:paintHum, beast:paintBeast, bug:paintBug, bird:paintBird, dragon:paintDragon, fly:paintFly, eye:paintEye, mech:paintMech, tower:paintTower, egg:paintEgg, tree:paintTree };
const cache = {};
// D: { key, race, voc, q, boss }
M.hdCanvas = function (D, H, tint) {
  const k = D.key + '|' + Math.round(H) + '|' + (tint || '');
  if (cache[k]) return cache[k];
  const S = H, W = Math.ceil(S * 2.4), Ht = Math.ceil(S * 1.5), K = M.hdK(S), BW = W * K, BH = Ht * K, c = document.createElement('canvas'); c.width = BW; c.height = BH;
  const x = c.getContext('2d'); x.setTransform(K, 0, 0, K, 0, 0); x.translate(W / 2, Ht - 4);
  const P = RACE[D.race] || RACE['人类'], R = rnd(D.key);
  (PAINT[D.kind || kindOf(D.key)] || paintHum)(x, D, P, S, R);
  // volume: top-left sheen
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop';
  const g = x.createLinearGradient(0, 0, BW * 0.8, BH); g.addColorStop(0, 'rgba(255,245,220,0.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(10,0,20,0.35)'); x.fillStyle = g; x.fillRect(0, 0, BW, BH);
  if (tint) { x.fillStyle = tint; x.globalAlpha = 0.85; x.fillRect(0, 0, BW, BH); x.globalAlpha = 1; }
  x.globalCompositeOperation = 'source-over';
  // outline
  const o = document.createElement('canvas'); o.width = BW; o.height = BH; const ox = o.getContext('2d');
  const sil = document.createElement('canvas'); sil.width = BW; sil.height = BH; const sx = sil.getContext('2d'); sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#0c0812'; sx.fillRect(0, 0, BW, BH);
  const ow = Math.max(1.1, S * 0.024) * K; [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, 0.7], [0.7, -0.7], [-0.7, 0.7]].forEach(([a, b]) => ox.drawImage(sil, a * ow, b * ow));
  ox.drawImage(c, 0, 0);
  o.footY = Ht - 4; o.cx = W / 2; o.S = S;
  return (cache[k] = M.hiRes(o, W, Ht, K));
};
M.hdKind = kindOf;
M._hd = { PAINT, kindOf, RACE, rnd, shade, rr, lg, rg };
// hero / npc keys used by older code
const HD_ALIAS = { militia:{ race:'人类', voc:'战士' }, watchman:{ race:'英雄', voc:'先锋' }, widow:{ race:'英雄', voc:'商人' }, nun:{ race:'人类', voc:'祭司' }, butcherlord:{ race:'兽人', voc:'战士' }, clockmaker:{ race:'科技', voc:'法师' }, cremator:{ race:'恶魔', voc:'法师' }, old:{ race:'人类', voc:'商人' }, child:{ race:'精灵', voc:'' }, musician:{ race:'不死', voc:'祭司' } };
M.hdDef = function (key) {
  if (M.DB && M.DB[key]) { const d = M.DB[key]; return { key, race: d.race, voc: d.voc, q: d.q, boss: d.type === 'Enemy' && d.g === '不朽' }; }
  if (HD_ALIAS[key]) return Object.assign({ key, q: 1 }, HD_ALIAS[key]);
  return null;
};
// hook sprite functions so all icon/portrait call sites become HD for units/heroes
const oldCanvas = M.spriteCanvas, urls = {};
M.spriteCanvas = function (key, s, tint) {
  const D = M.hdDef(key); if (!D) return oldCanvas(key, s, tint);
  return M.hdCanvas(D, s * 13 * (QS[D.q] || 1) * 0.8, tint);
};
M.spriteURL = function (key, s) { const k = key + '|' + s; if (urls[k]) return urls[k]; const c = M.spriteCanvas(key, s); return (urls[k] = c.toDataURL() + (c._k ? '#x' + c._k + (c._px ? 'p' : '') : '')); };
})();

;
