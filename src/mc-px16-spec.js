// ==== mc-px16-spec.js ====
(function () {
// Unit specs: the per-character "prompt" in data form. Each spec names a rig, a size, the ramps its materials use and the
// features that make the character itself (weapon, headgear, clothes, wings…). Specs are filled in by mc-px16-cast.js.
const M = window.MC, P16 = M.P16;
// default ramps per material slot (a spec overrides any of them)
const BASE_MAT = { skin: 'skin', cloth: 'blue', cloth2: 'navy', pants: 'navy', boot: 'leather', hair: 'wood', hat: 'navy', hood: 'navy', cape: 'crimson', trim: 'gold', metal: 'steel', iron: 'iron', gold: 'gold', leather: 'leather', wood: 'wood', gem: 'arcane', eye: 'ink', visor: 'teal', flame: 'fire', string: 'cream', wing: 'snow', horn: 'bone', plume: 'red', mask: 'bone', bone: 'bone', cream: 'cream', void: 'void', fur: 'wood', fur2: 'leather', shell: 'moss', belly: 'cream', claw: 'bone', leaf: 'green', bark: 'wood', stone: 'iron', glow: 'arcane', ink: 'ink', sleeve: null, tail: 'leather', beak: 'orange', comb: 'red', sclera: 'cream', iris: 'red', glass: 'teal', cloud: 'snow', fruit: 'red', tongue: 'pink', nose: 'pink', blood: 'blood', ghost: 'void' };
// race looks: skin, clothes and magic colour a unit inherits unless its spec says otherwise
const RACE = {
  兽人: { skin: 'orc', cloth: 'leather', cloth2: 'wood', pants: 'wood', hair: 'ink', trim: 'gold', magic: 'holy', head: 'orc' },
  不死: { skin: 'pale', cloth: 'navy', cloth2: 'void', pants: 'void', hair: 'snow', trim: 'frost', magic: 'frost', eye: 'frost', glowEyes: 1 },
  骷髅: { skin: 'bone', cloth: 'void', cloth2: 'shadow', pants: 'void', hair: 'ink', trim: 'teal', magic: 'teal', eye: 'teal', head: 'skull', body: 'ribs' },
  人类: { skin: 'skin', cloth: 'blue', cloth2: 'navy', pants: 'navy', hair: 'wood', trim: 'gold', magic: 'holy' },
  精灵: { skin: 'skin', cloth: 'green', cloth2: 'moss', pants: 'moss', hair: 'gold', trim: 'gold', magic: 'toxic', head: 'elf' },
  僵尸: { skin: 'zombie', cloth: 'crimson', cloth2: 'moss', pants: 'moss', hair: 'ink', trim: 'toxic', magic: 'toxic', head: 'zombie' },
  科技: { skin: 'skin', cloth: 'navy', cloth2: 'iron', pants: 'iron', hair: 'ink', trim: 'teal', magic: 'teal', visor: 'teal' },
  恶魔: { skin: 'red', cloth: 'shadow', cloth2: 'crimson', pants: 'shadow', hair: 'ink', trim: 'orange', magic: 'fire', eye: 'fire', glowEyes: 1, head: 'demon' },
  自然: { skin: 'skinD', cloth: 'moss', cloth2: 'green', pants: 'wood', hair: 'green', trim: 'toxic', magic: 'green' },
  虚空: { skin: 'purple', cloth: 'void', cloth2: 'purple', pants: 'void', hair: 'ink', trim: 'arcane', magic: 'arcane', eye: 'arcane', glowEyes: 1 },
  混沌: { skin: 'crimson', cloth: 'shadow', cloth2: 'red', pants: 'shadow', hair: 'ink', trim: 'blood', magic: 'blood', eye: 'blood', glowEyes: 1 },
  野兽: { skin: 'wood', cloth: 'leather', cloth2: 'moss', pants: 'leather', hair: 'ink', trim: 'orange', magic: 'orange' },
  英雄: { skin: 'skin', cloth: 'crimson', cloth2: 'void', pants: 'void', hair: 'wood', trim: 'gold', magic: 'holy' },
};
P16.RACE = RACE; P16.BASE_MAT = BASE_MAT;
const QS = [1, 1.14, 1.3, 1.5];
// sizes: base height by quality, bosses and giants larger
P16.sizeOf = (d, spec) => Math.round((spec.S0 || 22) * (QS[d ? d.q || 0 : 0] || 1) * (spec.big || 1));
P16.spec = function (key) {
  const done = P16.SPECS['@' + key]; if (done) return done;
  const raw = P16.SPECS[key] || (P16.autoSpec ? P16.autoSpec(key) : null); if (!raw) return null;
  const d = M.DB && M.DB[key], race = raw.race || (d && d.race) || '人类', R = RACE[race] || RACE['人类'];
  const s = Object.assign({ rig: 'hum', head: R.head || 'human', body: R.body, magic: R.magic, glowEyes: R.glowEyes }, raw);
  s.mat = Object.assign({}, BASE_MAT, { skin: R.skin, cloth: R.cloth, cloth2: R.cloth2, pants: R.pants, hair: R.hair, trim: R.trim, eye: R.eye || 'ink', visor: R.visor || 'teal', gem: raw.magic || R.magic }, raw.mat || {});
  if (!s.mat.sleeve) delete s.mat.sleeve;
  if (s.mat.hat === BASE_MAT.hat && raw.mat && raw.mat.cloth2) s.mat.hat = raw.mat.cloth2;
  s.S = raw.S || P16.sizeOf(d, raw);
  return (P16.SPECS['@' + key] = s);
};
})();

;
