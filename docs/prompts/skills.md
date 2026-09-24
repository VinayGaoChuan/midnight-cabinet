# 午夜机台 · 技能 prompt

每个会施放的技能一段：蓄力花样 + 施放花样 + 调色板。游戏里由 `src/mc-px16-fx.js` 的配方表驱动，本文件由 `node tools/gen-prompts.js` 生成。

共 87 个技能。

## 单位技能

### 治疗链（ChainHeal） · 单位技能
持有者：沙漠信徒
> 每秒恢复10%法力值，法力值满后，治疗1个友军生命值（200%攻击力），并弹射到3个附近的友军。
> 画面：翠绿十字光点从脚下升起，满蓄后化作一道治疗链跳向伤得最重的友军

```text
Create a single self-contained HTML file that renders the pixel art skill effect “治疗链” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the green ramp #0a200c #1a4418 #2e7026 #56aa3c #a2e46c and white.

EFFECT
- Visual intent (from the game): 翠绿十字光点从脚下升起，满蓄后化作一道治疗链跳向伤得最重的友军
- CHARGE (~0.5-0.9s): small plus-shaped motes rise from the ground around the caster; the caster raises its hands / weapon and a 1px rim light in green brightens on its silhouette.
- CAST: plus-shaped motes pour over the target and a soft ring rises from it; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #a2e46c → #56aa3c → #2e7026 → #1a4418 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 盖亚之盾（TreatmentChain） · 单位技能
持有者：蛇神使者
> 战斗开始时，为生命值最高的单位增加1500最大生命值，战斗结束后取消。可叠加。
> 画面：大地之灵的绿色护盾在目标身上合拢

```text
Create a single self-contained HTML file that renders the pixel art skill effect “盖亚之盾” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the toxic ramp #1a3a08 #3a7a10 #6ec820 #b8f050 #f4ffc0 and white.

EFFECT
- Visual intent (from the game): 大地之灵的绿色护盾在目标身上合拢
- CHARGE (~0.5-0.9s): small plus-shaped motes rise from the ground around the caster; the caster raises its hands / weapon and a 1px rim light in toxic brightens on its silhouette.
- CAST: a pixel dome closes over the target, flashes and holds; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #f4ffc0 → #b8f050 → #6ec820 → #3a7a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 奔踏（ChargeAttackNew） · 单位技能
持有者：巨型野猪、赤瞳
> 在战斗开始的时候跳向敌人，对中范围内的敌人造成2%自身最大生命值的技能伤害。
> 画面：蹄下扬起橙色尘土，冲撞落地时一圈冲击波

```text
Create a single self-contained HTML file that renders the pixel art skill effect “奔踏” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the orange ramp #301004 #6e2a0c #bc5416 #f08c2c #ffcc68 and white.

EFFECT
- Visual intent (from the game): 蹄下扬起橙色尘土，冲撞落地时一圈冲击波
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in orange brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffcc68 → #f08c2c → #bc5416 → #6e2a0c before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 初级渔夫（JuniorFisherman） · 单位技能
持有者：步卒
> 附近小范围敌人死亡时获得2.5%法力值，法力值满后，或者经历5场战斗后，升级为RedCross，法力值减半保留
> 画面：海蓝水珠向鱼线汇聚，甩出一道水光

```text
Create a single self-contained HTML file that renders the pixel art skill effect “初级渔夫” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the sea ramp #061a2a #0c3a5a #16688e #34a0c4 #8ae0f4 and white.

EFFECT
- Visual intent (from the game): 海蓝水珠向鱼线汇聚，甩出一道水光
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in sea brightens on its silhouette.
- CAST: a straight beam shoots to the target and splashes; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #8ae0f4 → #34a0c4 → #16688e → #0c3a5a before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 商业渔夫（CommercialFisherman） · 单位技能
持有者：赤十字
> 附近小范围敌人死亡时获得1.25%法力值，法力值满后，或者经历5场战斗后，升级为EmperorOfFlame，法力值保留
> 画面：同初级渔夫，水光更粗

```text
Create a single self-contained HTML file that renders the pixel art skill effect “商业渔夫” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the sea ramp #061a2a #0c3a5a #16688e #34a0c4 #8ae0f4 and white.

EFFECT
- Visual intent (from the game): 同初级渔夫，水光更粗
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in sea brightens on its silhouette.
- CAST: a straight beam shoots to the target and splashes; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #8ae0f4 → #34a0c4 → #16688e → #0c3a5a before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 精英渔夫（EliteFisherman） · 单位技能
持有者：炎帝
> 每0.8%法力值，增加20点最大生命值和1的攻击力
> 画面：海水涌起的喷泉包住自身

```text
Create a single self-contained HTML file that renders the pixel art skill effect “精英渔夫” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the sea ramp #061a2a #0c3a5a #16688e #34a0c4 #8ae0f4 and white.

EFFECT
- Visual intent (from the game): 海水涌起的喷泉包住自身
- CHARGE (~0.5-0.9s): a fountain of particles bursts upward and a ring expands; the caster raises its hands / weapon and a 1px rim light in sea brightens on its silhouette.
- CAST: a fountain of particles bursts upward and a ring expands through the allies; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #8ae0f4 → #34a0c4 → #16688e → #0c3a5a before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 伏击（Ambush） · 单位技能
持有者：水战士、不朽蓝魔
> 战斗开始时隐身，偷袭远程目标，造成800%攻击力的技能伤害
> 画面：身影化为暗丝消失，在目标头顶落下一记影刃

```text
Create a single self-contained HTML file that renders the pixel art skill effect “伏击” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the shadow ramp #06040a #120c1a #22182e #3a2c4c #6a5a86 and white.

EFFECT
- Visual intent (from the game): 身影化为暗丝消失，在目标头顶落下一记影刃
- CHARGE (~0.5-0.9s): dark wisps and magic sparks curl inward; the caster raises its hands / weapon and a 1px rim light in shadow brightens on its silhouette.
- CAST: blades rain down onto the target area and stick in the ground; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #6a5a86 → #3a2c4c → #22182e → #120c1a before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 炮弹休克（ShellShock） · 单位技能
持有者：指挥官
> 每秒恢复8%法力值，法力值满后，对目标附近小范围的敌人造成67%攻击力的技能伤害，并使其攻击速度降低5%，持续3秒。
> 画面：炮口冒出火星，炮弹从天而降炸开

```text
Create a single self-contained HTML file that renders the pixel art skill effect “炮弹休克” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the orange ramp #301004 #6e2a0c #bc5416 #f08c2c #ffcc68 and white.

EFFECT
- Visual intent (from the game): 炮口冒出火星，炮弹从天而降炸开
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in orange brightens on its silhouette.
- CAST: a meteor falls from the top-left and explodes into sparks on impact; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffcc68 → #f08c2c → #bc5416 → #6e2a0c before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 共鸣（ResonanceAura） · 单位技能
持有者：棕熊
> 中范围光环，每秒恢复目标2.75%的已损失生命值，并增加10%防御。
> 画面：金色光环向外扩散

```text
Create a single self-contained HTML file that renders the pixel art skill effect “共鸣” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 金色光环向外扩散
- CHARGE (~0.5-0.9s): small plus-shaped motes rise from the ground around the caster; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 超级鼓舞（InvigorateSuper） · 单位技能
持有者：冰雪法师、大法师
> 每秒恢复9%法力值，法力值满后，5秒内增加自身100%攻击速度并每秒恢复自身生命值(149%攻击力)+ 2%已失去的生命值。
> 画面：火星从脚下升起，喷泉般的火焰鼓舞全身

```text
Create a single self-contained HTML file that renders the pixel art skill effect “超级鼓舞” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 火星从脚下升起，喷泉般的火焰鼓舞全身
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: a fountain of particles bursts upward and a ring expands through the allies; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 爆发攻击（BurstAttack） · 单位技能
持有者：冰雪法师
> 每次伤害额外造成目标最大生命值0.03%的技能伤害
> 画面：冰晶爆点

```text
Create a single self-contained HTML file that renders the pixel art skill effect “爆发攻击” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the frost ramp #0e2a4a #2462a0 #4aa6e6 #9ee0ff #ffffff and white.

EFFECT
- Visual intent (from the game): 冰晶爆点
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in frost brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #9ee0ff → #4aa6e6 → #2462a0 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 回声打击（Echostrike） · 单位技能
持有者：大法师
> 每次伤害额外造成目标最大生命值0.09%的技能伤害
> 画面：紫色回声环

```text
Create a single self-contained HTML file that renders the pixel art skill effect “回声打击” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the arcane ramp #2a0e4e #5e28a6 #9c5af0 #d4a4ff #ffffff and white.

EFFECT
- Visual intent (from the game): 紫色回声环
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in arcane brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #d4a4ff → #9c5af0 → #5e28a6 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 蛋炸（Eggsplosion） · 单位技能
持有者：神石
> 死亡时，对小范围敌人造成自身最大生命值4%的技能伤害
> 画面：蛋壳炸裂，蓝色碎片四散

```text
Create a single self-contained HTML file that renders the pixel art skill effect “蛋炸” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the frost ramp #0e2a4a #2462a0 #4aa6e6 #9ee0ff #ffffff and white.

EFFECT
- Visual intent (from the game): 蛋壳炸裂，蓝色碎片四散
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in frost brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #9ee0ff → #4aa6e6 → #2462a0 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 小九头蛇（Hydralings） · 单位技能
持有者：巨人战神
> 死亡时，召唤3只Golem
> 画面：金色法阵中升起魔像

```text
Create a single self-contained HTML file that renders the pixel art skill effect “小九头蛇” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 金色法阵中升起魔像
- CHARGE (~0.5-0.9s): a particle circle draws itself on the ground and a pillar of light rises from it; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: the circle flashes and a pillar of light rises; the summoned unit pops in; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 精神扭曲（MindWarp） · 单位技能
持有者：骸骨法师
> 每秒恢复9%法力值。法力值满后，使攻击力最高的单位的攻击速度提高30%，持续5秒
> 画面：紫色暗丝卷入法杖，再扭曲着爆开

```text
Create a single self-contained HTML file that renders the pixel art skill effect “精神扭曲” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the arcane ramp #2a0e4e #5e28a6 #9c5af0 #d4a4ff #ffffff and white.

EFFECT
- Visual intent (from the game): 紫色暗丝卷入法杖，再扭曲着爆开
- CHARGE (~0.5-0.9s): dark wisps and magic sparks curl inward; the caster raises its hands / weapon and a 1px rim light in arcane brightens on its silhouette.
- CAST: dark wisps lash out to the target and burst; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #d4a4ff → #9c5af0 → #5e28a6 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 火焰箭（FlamingArrows） · 单位技能
持有者：骸骨弓手、歼灭者、巨型歼灭者
> 每次攻击消耗0.5%法力值，造成140%攻击力的额外技能伤害
> 画面：箭头燃起，火线射出

```text
Create a single self-contained HTML file that renders the pixel art skill effect “火焰箭” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 箭头燃起，火线射出
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: a straight beam shoots to the target and splashes; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 召唤猎犬（HoundSummoning） · 单位技能
持有者：召唤师
> 每秒恢复5%法力值，法力值满后，召唤一只GrayWolf，持续40秒
> 画面：地面浮现灰色法阵，灰狼从光柱里跃出

```text
Create a single self-contained HTML file that renders the pixel art skill effect “召唤猎犬” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the iron ramp #120f16 #26222e #3e3a48 #5e5a6a #8a8698 and white.

EFFECT
- Visual intent (from the game): 地面浮现灰色法阵，灰狼从光柱里跃出
- CHARGE (~0.5-0.9s): a particle circle draws itself on the ground and a pillar of light rises from it; the caster raises its hands / weapon and a 1px rim light in iron brightens on its silhouette.
- CAST: the circle flashes and a pillar of light rises; the summoned unit pops in; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #8a8698 → #5e5a6a → #3e3a48 → #26222e before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 召唤地狱犬（Hellhound） · 单位技能
持有者：糖果女孩
> 每秒恢复5%法力值，法力值满后，召唤一只DireWolf，持续40秒
> 画面：血红法阵，地狱犬从火柱里跃出

```text
Create a single self-contained HTML file that renders the pixel art skill effect “召唤地狱犬” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 血红法阵，地狱犬从火柱里跃出
- CHARGE (~0.5-0.9s): a particle circle draws itself on the ground and a pillar of light rises from it; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: the circle flashes and a pillar of light rises; the summoned unit pops in; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 吸血（Leech） · 单位技能
持有者：血骑士
> 中范围光环，提供20%的吸血。
> 画面：血色细丝回流到身上

```text
Create a single self-contained HTML file that renders the pixel art skill effect “吸血” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the blood ramp #300408 #720a14 #c01a24 #ff4a4a #ffc0b0 and white.

EFFECT
- Visual intent (from the game): 血色细丝回流到身上
- CHARGE (~0.5-0.9s): dark wisps and magic sparks curl inward; the caster raises its hands / weapon and a 1px rim light in blood brightens on its silhouette.
- CAST: plus-shaped motes pour over the target and a soft ring rises from it; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffc0b0 → #ff4a4a → #c01a24 → #720a14 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 同类相食（Cannibalism） · 单位技能
持有者：狮锤
> 中范围光环，提供30%的吸血。
> 画面：更浓的血色回流

```text
Create a single self-contained HTML file that renders the pixel art skill effect “同类相食” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the blood ramp #300408 #720a14 #c01a24 #ff4a4a #ffc0b0 and white.

EFFECT
- Visual intent (from the game): 更浓的血色回流
- CHARGE (~0.5-0.9s): dark wisps and magic sparks curl inward; the caster raises its hands / weapon and a 1px rim light in blood brightens on its silhouette.
- CAST: plus-shaped motes pour over the target and a soft ring rises from it; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffc0b0 → #ff4a4a → #c01a24 → #720a14 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 颅骨炖汤（SkullStew） · 单位技能
持有者：狮锤
> 每秒恢复13%法力值，法力值满后，恢复1个友军10%最大生命值
> 画面：锅里冒泡，绿色回复光点飘向友军

```text
Create a single self-contained HTML file that renders the pixel art skill effect “颅骨炖汤” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the toxic ramp #1a3a08 #3a7a10 #6ec820 #b8f050 #f4ffc0 and white.

EFFECT
- Visual intent (from the game): 锅里冒泡，绿色回复光点飘向友军
- CHARGE (~0.5-0.9s): bubbles and slow drifting clouds; the caster raises its hands / weapon and a 1px rim light in toxic brightens on its silhouette.
- CAST: plus-shaped motes pour over the target and a soft ring rises from it; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #f4ffc0 → #b8f050 → #6ec820 → #3a7a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 召唤巨龙（Dragon） · 单位技能
持有者：死灵法师
> 每秒恢复3%法力值，法力值满后，召唤一只VengefulDragon，持续40秒
> 画面：紫色法阵升起复仇之龙

```text
Create a single self-contained HTML file that renders the pixel art skill effect “召唤巨龙” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the arcane ramp #2a0e4e #5e28a6 #9c5af0 #d4a4ff #ffffff and white.

EFFECT
- Visual intent (from the game): 紫色法阵升起复仇之龙
- CHARGE (~0.5-0.9s): a particle circle draws itself on the ground and a pillar of light rises from it; the caster raises its hands / weapon and a 1px rim light in arcane brightens on its silhouette.
- CAST: the circle flashes and a pillar of light rises; the summoned unit pops in; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #d4a4ff → #9c5af0 → #5e28a6 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 亡灵法术（Necromancy） · 单位技能
持有者：死神
> 附近(大范围)敌人死亡时恢复3%最大法力值
> 画面：青色亡魂卷入

```text
Create a single self-contained HTML file that renders the pixel art skill effect “亡灵法术” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the teal ramp #062226 #0e4a48 #187e74 #36bca6 #98f6e0 and white.

EFFECT
- Visual intent (from the game): 青色亡魂卷入
- CHARGE (~0.5-0.9s): dark wisps and magic sparks curl inward; the caster raises its hands / weapon and a 1px rim light in teal brightens on its silhouette.
- CAST: dark wisps lash out to the target and burst; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #98f6e0 → #36bca6 → #187e74 → #0e4a48 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 召唤死神（Thanatos） · 单位技能
持有者：死神
> 每秒恢复2%法力值，法力值满后，召唤一只BoneDragon，持续40秒
> 画面：青色法阵升起骨龙

```text
Create a single self-contained HTML file that renders the pixel art skill effect “召唤死神” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the teal ramp #062226 #0e4a48 #187e74 #36bca6 #98f6e0 and white.

EFFECT
- Visual intent (from the game): 青色法阵升起骨龙
- CHARGE (~0.5-0.9s): a particle circle draws itself on the ground and a pillar of light rises from it; the caster raises its hands / weapon and a 1px rim light in teal brightens on its silhouette.
- CAST: the circle flashes and a pillar of light rises; the summoned unit pops in; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #98f6e0 → #36bca6 → #187e74 → #0e4a48 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 法力祝福（ManaBlessing） · 单位技能
持有者：黄鬃马
> 每秒恢复9%法力值，每间隔1秒，消耗20%法力值，恢复1个友军18%法力值，不能对拥有相似效果的单位释放
> 画面：金色喷泉

```text
Create a single self-contained HTML file that renders the pixel art skill effect “法力祝福” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 金色喷泉
- CHARGE (~0.5-0.9s): small plus-shaped motes rise from the ground around the caster; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a fountain of particles bursts upward and a ring expands through the allies; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 祝福（Blessing） · 单位技能
持有者：黄鬃马、汗血马
> 法力值满时，消耗全部法力值，提升自身20%攻击速度和防御，持续5秒
> 画面：金色喷泉

```text
Create a single self-contained HTML file that renders the pixel art skill effect “祝福” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 金色喷泉
- CHARGE (~0.5-0.9s): small plus-shaped motes rise from the ground around the caster; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a fountain of particles bursts upward and a ring expands through the allies; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 法力奇迹（ManaMiracle） · 单位技能
持有者：汗血马
> 每秒恢复9%法力值，每间隔1秒，消耗10%法力值，恢复1个友军15%法力值，不能对拥有相似效果的单位释放
> 画面：更大的金色喷泉

```text
Create a single self-contained HTML file that renders the pixel art skill effect “法力奇迹” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 更大的金色喷泉
- CHARGE (~0.5-0.9s): small plus-shaped motes rise from the ground around the caster; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a fountain of particles bursts upward and a ring expands through the allies; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 多重射击（Multishot） · 单位技能
持有者：精英猎手
> 每次攻击会额外攻击目标附近小范围的2个单位，造成100%攻击力的技能伤害。无法对同一个单位造成多次伤害
> 画面：三道金色箭光

```text
Create a single self-contained HTML file that renders the pixel art skill effect “多重射击” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 三道金色箭光
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a straight beam shoots to the target and splashes; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 粒子波（ParticleWave） · 单位技能
持有者：惩戒牧师
> 连续攻击同一个目标时，每次攻击额外造成22%攻击力的技能伤害，最多叠加10次
> 画面：白金粒子波

```text
Create a single self-contained HTML file that renders the pixel art skill effect “粒子波” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 白金粒子波
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a straight beam shoots to the target and splashes; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 太阳耀斑（SolarFlare） · 单位技能
持有者：惩戒牧师
> 每秒恢复8%法力值，法力值满后，增加100%的攻击速度，持续5秒
> 画面：太阳耀斑喷泉

```text
Create a single self-contained HTML file that renders the pixel art skill effect “太阳耀斑” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 太阳耀斑喷泉
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a fountain of particles bursts upward and a ring expands through the allies; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 净化光束（PurificationBeam） · 单位技能
持有者：主教
> 连续攻击同一个目标时，每次攻击造成24%攻击力的额外伤害，最多叠加10次
> 画面：白金净化光束

```text
Create a single self-contained HTML file that renders the pixel art skill effect “净化光束” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 白金净化光束
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a straight beam shoots to the target and splashes; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 超级太阳耀斑（SolarFlareSuper） · 单位技能
持有者：主教
> 每秒恢复10%法力值，法力值满后，增加100%的攻击速度，持续5秒
> 画面：更炽烈的太阳耀斑

```text
Create a single self-contained HTML file that renders the pixel art skill effect “超级太阳耀斑” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 更炽烈的太阳耀斑
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a fountain of particles bursts upward and a ring expands through the allies; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 神盾（Aegis） · 单位技能
持有者：卫队长
> 攻击恢复4%法力值，被攻击恢复0.2%法力值，法力值满后，下面25次攻击，造成小范围(25%攻击力)的技能伤害。
> 画面：金色护盾罩

```text
Create a single self-contained HTML file that renders the pixel art skill effect “神盾” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 金色护盾罩
- CHARGE (~0.5-0.9s): a ring of particles closes into a dome then expands; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a pixel dome closes over the target, flashes and holds; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 最终审判（FinalJudgment） · 单位技能
持有者：奥法元帅
> 攻击恢复4%法力值，被攻击恢复0.2%法力值，法力值满后，下面25次攻击，造成中范围(25%攻击力)的技能伤害。
> 画面：紫金审判之剑从天坠落

```text
Create a single self-contained HTML file that renders the pixel art skill effect “最终审判” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the arcane ramp #2a0e4e #5e28a6 #9c5af0 #d4a4ff #ffffff and white.

EFFECT
- Visual intent (from the game): 紫金审判之剑从天坠落
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in arcane brightens on its silhouette.
- CAST: a meteor falls from the top-left and explodes into sparks on impact; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #d4a4ff → #9c5af0 → #5e28a6 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 芬芳（Fragrance） · 单位技能
持有者：翡翠龙
> 对附近小范围的敌人造成0.66%*自身最大生命值 + 0.02%目标最大生命值的技能伤害
> 画面：清香的绿雾

```text
Create a single self-contained HTML file that renders the pixel art skill effect “芬芳” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the toxic ramp #1a3a08 #3a7a10 #6ec820 #b8f050 #f4ffc0 and white.

EFFECT
- Visual intent (from the game): 清香的绿雾
- CHARGE (~0.5-0.9s): bubbles and slow drifting clouds; the caster raises its hands / weapon and a 1px rim light in toxic brightens on its silhouette.
- CAST: a toxic cloud puffs over the target with drifting bubbles; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #f4ffc0 → #b8f050 → #6ec820 → #3a7a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 毒气（NoxiousScent） · 单位技能
持有者：毒龙
> 对附近小范围的敌人造成0.74%*自身最大生命值 + 0.07%目标最大生命值的技能伤害
> 画面：浓绿毒雾

```text
Create a single self-contained HTML file that renders the pixel art skill effect “毒气” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the toxic ramp #1a3a08 #3a7a10 #6ec820 #b8f050 #f4ffc0 and white.

EFFECT
- Visual intent (from the game): 浓绿毒雾
- CHARGE (~0.5-0.9s): bubbles and slow drifting clouds; the caster raises its hands / weapon and a 1px rim light in toxic brightens on its silhouette.
- CAST: a toxic cloud puffs over the target with drifting bubbles; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #f4ffc0 → #b8f050 → #6ec820 → #3a7a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 水之弹射（WaterBounce） · 单位技能
持有者：鹰喙弓手、投石弓手、天使弓手
> 每次攻击会额外弹射攻击附近小范围的1个敌人
> 画面：水弹弹射

```text
Create a single self-contained HTML file that renders the pixel art skill effect “水之弹射” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the sea ramp #061a2a #0c3a5a #16688e #34a0c4 #8ae0f4 and white.

EFFECT
- Visual intent (from the game): 水弹弹射
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in sea brightens on its silhouette.
- CAST: a straight beam shoots to the target and splashes; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #8ae0f4 → #34a0c4 → #16688e → #0c3a5a before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 燃烧（Combustion） · 单位技能
持有者：天使弓手
> 每次攻击，造成100%攻击力的额外技能伤害
> 画面：燃烧爆点

```text
Create a single self-contained HTML file that renders the pixel art skill effect “燃烧” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 燃烧爆点
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 闪电打击（LightningStrike） · 单位技能
持有者：蓝龙
> 每秒恢复18%法力值，法力值满后，释放闪电锁链，电击5个敌方单位，对每个敌人造成自身109%的攻击力 + 0.15%目标最大生命值的伤害
> 画面：电弧在龙角间噼啪作响，闪电锁链甩出

```text
Create a single self-contained HTML file that renders the pixel art skill effect “闪电打击” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the frost ramp #0e2a4a #2462a0 #4aa6e6 #9ee0ff #ffffff and white.

EFFECT
- Visual intent (from the game): 电弧在龙角间噼啪作响，闪电锁链甩出
- CHARGE (~0.5-0.9s): a crackling zigzag bolt forks towards the target; the caster raises its hands / weapon and a 1px rim light in frost brightens on its silhouette.
- CAST: a zigzag lightning bolt forks from the focus to the target and jumps on; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #9ee0ff → #4aa6e6 → #2462a0 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 法力爆裂（WaterSpoutNew） · 单位技能
持有者：月光使徒
> 每秒恢复1%的法力值，法力值满后，对单个目标造成662%攻击力的技能伤害
> 画面：蓝色法力爆裂光束

```text
Create a single self-contained HTML file that renders the pixel art skill effect “法力爆裂” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the frost ramp #0e2a4a #2462a0 #4aa6e6 #9ee0ff #ffffff and white.

EFFECT
- Visual intent (from the game): 蓝色法力爆裂光束
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in frost brightens on its silhouette.
- CAST: a straight beam shoots to the target and splashes; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #9ee0ff → #4aa6e6 → #2462a0 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 小行星（Asteroid） · 单位技能
持有者：时间法师
> 每秒恢复3%的法力值，法力值满后，对单个目标造成686%攻击力+ 2%自身最大生命值的技能伤害
> 画面：小行星从天而降

```text
Create a single self-contained HTML file that renders the pixel art skill effect “小行星” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 小行星从天而降
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: a meteor falls from the top-left and explodes into sparks on impact; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 熔岩护盾（MoltenShield） · 单位技能
持有者：赤龙
> 每秒恢复5%法力值。每次受到攻击，消耗12.5%的法力值，吸收60%的伤害。
> 画面：熔岩护盾合拢

```text
Create a single self-contained HTML file that renders the pixel art skill effect “熔岩护盾” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 熔岩护盾合拢
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: a pixel dome closes over the target, flashes and holds; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 棱光护盾（PrismaticShield） · 单位技能
持有者：黑龙
> 每秒恢复5%法力值。每次受到攻击，消耗12.5%的法力值，吸收80%的伤害。
> 画面：棱光护盾合拢

```text
Create a single self-contained HTML file that renders the pixel art skill effect “棱光护盾” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the arcane ramp #2a0e4e #5e28a6 #9c5af0 #d4a4ff #ffffff and white.

EFFECT
- Visual intent (from the game): 棱光护盾合拢
- CHARGE (~0.5-0.9s): a ring of particles closes into a dome then expands; the caster raises its hands / weapon and a 1px rim light in arcane brightens on its silhouette.
- CAST: a pixel dome closes over the target, flashes and holds; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #d4a4ff → #9c5af0 → #5e28a6 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 能量涌动（EnergySurge） · 单位技能
持有者：见习法师、天界法师
> 每次攻击恢复7%法力值，法力值满后，对目标造成800%攻击力的技能伤害
> 画面：青色能量涌动光束

```text
Create a single self-contained HTML file that renders the pixel art skill effect “能量涌动” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the teal ramp #062226 #0e4a48 #187e74 #36bca6 #98f6e0 and white.

EFFECT
- Visual intent (from the game): 青色能量涌动光束
- CHARGE (~0.5-0.9s): a crackling zigzag bolt forks towards the target; the caster raises its hands / weapon and a 1px rim light in teal brightens on its silhouette.
- CAST: a straight beam shoots to the target and splashes; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #98f6e0 → #36bca6 → #187e74 → #0e4a48 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 火焰占卜（Sputtering） · 单位技能
持有者：火焰法师、脉冲机器人、天空机器人
> 每次攻击，对目标附近中范围的敌人造成50%攻击力的技能伤害
> 画面：火焰占卜的溅射火圈

```text
Create a single self-contained HTML file that renders the pixel art skill effect “火焰占卜” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 火焰占卜的溅射火圈
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 机枪手（MachineGunner） · 单位技能
持有者：机枪蝠
> 每0.5秒对附近大范围内的1个敌人造成50%攻击力的额外技能伤害
> 画面：机枪火线

```text
Create a single self-contained HTML file that renders the pixel art skill effect “机枪手” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the orange ramp #301004 #6e2a0c #bc5416 #f08c2c #ffcc68 and white.

EFFECT
- Visual intent (from the game): 机枪火线
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in orange brightens on its silhouette.
- CAST: a straight beam shoots to the target and splashes; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffcc68 → #f08c2c → #bc5416 → #6e2a0c before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 投弹手（Bombardier） · 单位技能
持有者：吸血蝠
> 每1.5秒对附近大范围内的3个不同敌人造成160%攻击力的额外技能伤害
> 画面：炸弹从空中落下

```text
Create a single self-contained HTML file that renders the pixel art skill effect “投弹手” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the orange ramp #301004 #6e2a0c #bc5416 #f08c2c #ffcc68 and white.

EFFECT
- Visual intent (from the game): 炸弹从空中落下
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in orange brightens on its silhouette.
- CAST: a meteor falls from the top-left and explodes into sparks on impact; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffcc68 → #f08c2c → #bc5416 → #6e2a0c before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 爆炸炮弹（ExplosiveShells） · 单位技能
持有者：金龙、魔龙
> 击杀目标时，对目标附近(中范围)敌人造成11%攻击力的技能伤害
> 画面：炮弹爆炸火圈

```text
Create a single self-contained HTML file that renders the pixel art skill effect “爆炸炮弹” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 炮弹爆炸火圈
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 灵魂献祭（SpiritOffering） · 单位技能
持有者：魂蛛
> 附近小范围敌人死亡时增加20%法力值，法力值满后升1级，最大7级，每级增加290最大生命值和15攻击力，满级后，附近小范围敌人死亡，恢复自身1%最大生命值
> 画面：灵魂献祭的紫色喷泉

```text
Create a single self-contained HTML file that renders the pixel art skill effect “灵魂献祭” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the arcane ramp #2a0e4e #5e28a6 #9c5af0 #d4a4ff #ffffff and white.

EFFECT
- Visual intent (from the game): 灵魂献祭的紫色喷泉
- CHARGE (~0.5-0.9s): dark wisps and magic sparks curl inward; the caster raises its hands / weapon and a 1px rim light in arcane brightens on its silhouette.
- CAST: a fountain of particles bursts upward and a ring expands through the allies; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #d4a4ff → #9c5af0 → #5e28a6 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 次元裂隙（DimensionalRift） · 单位技能
持有者：灵召塔
> 每秒恢复16%法力值，法力值满后，损失400点生命值，召唤1个MoonLeopard和1个Watchdog，持续180秒。
> 画面：紫色次元裂隙法阵

```text
Create a single self-contained HTML file that renders the pixel art skill effect “次元裂隙” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the arcane ramp #2a0e4e #5e28a6 #9c5af0 #d4a4ff #ffffff and white.

EFFECT
- Visual intent (from the game): 紫色次元裂隙法阵
- CHARGE (~0.5-0.9s): a particle circle draws itself on the ground and a pillar of light rises from it; the caster raises its hands / weapon and a 1px rim light in arcane brightens on its silhouette.
- CAST: the circle flashes and a pillar of light rises; the summoned unit pops in; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #d4a4ff → #9c5af0 → #5e28a6 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 超级裂隙（DimensionalChasm） · 单位技能
持有者：地狱召唤塔
> 每秒恢复16%法力值，法力值满后，损失1040点生命值，召唤1个MagicLeopard和1个EvilDog，持续180秒。
> 画面：血红次元裂隙法阵

```text
Create a single self-contained HTML file that renders the pixel art skill effect “超级裂隙” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 血红次元裂隙法阵
- CHARGE (~0.5-0.9s): a particle circle draws itself on the ground and a pillar of light rises from it; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: the circle flashes and a pillar of light rises; the summoned unit pops in; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 飞叶快刀（RazorLeaf） · 单位技能
持有者：野法师
> 每次攻击，对目标附近小范围的敌人造成100%攻击力的技能伤害
> 画面：飞叶从上方旋落

```text
Create a single self-contained HTML file that renders the pixel art skill effect “飞叶快刀” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the green ramp #0a200c #1a4418 #2e7026 #56aa3c #a2e46c and white.

EFFECT
- Visual intent (from the game): 飞叶从上方旋落
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in green brightens on its silhouette.
- CAST: blades rain down onto the target area and stick in the ground; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #a2e46c → #56aa3c → #2e7026 → #1a4418 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 史莱姆繁殖（SlimePropagation） · 单位技能
持有者：野人王
> 每次攻击时恢复3%法力值，法力值满后，召唤2个WildManSpearman，持续40秒
> 画面：史莱姆从绿泡里冒出

```text
Create a single self-contained HTML file that renders the pixel art skill effect “史莱姆繁殖” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the toxic ramp #1a3a08 #3a7a10 #6ec820 #b8f050 #f4ffc0 and white.

EFFECT
- Visual intent (from the game): 史莱姆从绿泡里冒出
- CHARGE (~0.5-0.9s): bubbles and slow drifting clouds; the caster raises its hands / weapon and a 1px rim light in toxic brightens on its silhouette.
- CAST: the circle flashes and a pillar of light rises; the summoned unit pops in; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #f4ffc0 → #b8f050 → #6ec820 → #3a7a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 生命交换（LifeExchange） · 单位技能
持有者：青龙
> 每秒恢复14%法力值。法力值满时，消耗自身生命（243%攻击力），治疗1名友军（270%攻击力）。不会对拥有相似效果的单位释放。
> 画面：生命交换的绿色光点

```text
Create a single self-contained HTML file that renders the pixel art skill effect “生命交换” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the green ramp #0a200c #1a4418 #2e7026 #56aa3c #a2e46c and white.

EFFECT
- Visual intent (from the game): 生命交换的绿色光点
- CHARGE (~0.5-0.9s): small plus-shaped motes rise from the ground around the caster; the caster raises its hands / weapon and a 1px rim light in green brightens on its silhouette.
- CAST: plus-shaped motes pour over the target and a soft ring rises from it; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #a2e46c → #56aa3c → #2e7026 → #1a4418 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 灵魂转移（SoulTransfer） · 单位技能
持有者：天龙
> 每秒恢复18%法力值。法力值满时，消耗自身生命（135%攻击力），治疗1名友军（270%攻击力）。不会对拥有相似效果的单位释放。
> 画面：灵魂转移的蓝色光点

```text
Create a single self-contained HTML file that renders the pixel art skill effect “灵魂转移” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the frost ramp #0e2a4a #2462a0 #4aa6e6 #9ee0ff #ffffff and white.

EFFECT
- Visual intent (from the game): 灵魂转移的蓝色光点
- CHARGE (~0.5-0.9s): small plus-shaped motes rise from the ground around the caster; the caster raises its hands / weapon and a 1px rim light in frost brightens on its silhouette.
- CAST: plus-shaped motes pour over the target and a soft ring rises from it; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #9ee0ff → #4aa6e6 → #2462a0 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 铁之冰雹（IronHail） · 单位技能
持有者：诅咒剑士
> 每秒恢复14%法力值，法力值满后，对目标小范围内的敌人造成80%攻击力x2的技能伤害，同时被击中的单位的伤害降低2，持续5秒，最多叠加10次
> 画面：铁雹从天而降

```text
Create a single self-contained HTML file that renders the pixel art skill effect “铁之冰雹” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the steel ramp #161a26 #323a4e #5a6680 #909cb4 #d4dbe6 and white.

EFFECT
- Visual intent (from the game): 铁雹从天而降
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in steel brightens on its silhouette.
- CAST: blades rain down onto the target area and stick in the ground; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #d4dbe6 → #909cb4 → #5a6680 → #323a4e before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 剑雨（SwordRain） · 单位技能
持有者：苦痛盾卫
> 每秒恢复14%法力值，法力值满后，对目标小范围内的敌人造成80%攻击力x2的技能伤害，同时被击中的单位的伤害降低4，持续5秒，最多叠加10次
> 画面：剑雨从天而降

```text
Create a single self-contained HTML file that renders the pixel art skill effect “剑雨” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the steel ramp #161a26 #323a4e #5a6680 #909cb4 #d4dbe6 and white.

EFFECT
- Visual intent (from the game): 剑雨从天而降
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in steel brightens on its silhouette.
- CAST: blades rain down onto the target area and stick in the ground; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #d4dbe6 → #909cb4 → #5a6680 → #323a4e before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 剑刃风暴（BladeStorm） · 单位技能
持有者：魔王近卫
> 每秒恢复14%法力值，法力值满后，对目标小范围内的敌人造成80%攻击力x2的技能伤害，同时被击中的单位的伤害降低6，持续5秒，最多叠加10次
> 画面：燃着的剑刃风暴

```text
Create a single self-contained HTML file that renders the pixel art skill effect “剑刃风暴” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 燃着的剑刃风暴
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: blades rain down onto the target area and stick in the ground; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 禁果（ForbiddenFruit） · 单位技能
持有者：黑熊
> 每次攻击恢复3%法力值，被攻击恢复0.1%法力值。当该单位死亡或达到最大法力时，消耗全部法力，每1%法力值，对中范围的敌人造成0.3%自身最大生命的伤害
> 画面：禁果的粉色喷泉

```text
Create a single self-contained HTML file that renders the pixel art skill effect “禁果” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the pink ramp #280822 #541442 #90286c #d0469e #ffa2dc and white.

EFFECT
- Visual intent (from the game): 禁果的粉色喷泉
- CHARGE (~0.5-0.9s): small plus-shaped motes rise from the ground around the caster; the caster raises its hands / weapon and a 1px rim light in pink brightens on its silhouette.
- CAST: a fountain of particles bursts upward and a ring expands through the allies; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffa2dc → #d0469e → #90286c → #541442 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 召唤小螃蟹（SummonCrabling） · 单位技能
持有者：蟹术士
> 每秒恢复2.5%法力值，法力值满后，召唤一只Crabling，持续40秒
> 画面：海蓝法阵里爬出小螃蟹

```text
Create a single self-contained HTML file that renders the pixel art skill effect “召唤小螃蟹” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the sea ramp #061a2a #0c3a5a #16688e #34a0c4 #8ae0f4 and white.

EFFECT
- Visual intent (from the game): 海蓝法阵里爬出小螃蟹
- CHARGE (~0.5-0.9s): a particle circle draws itself on the ground and a pillar of light rises from it; the caster raises its hands / weapon and a 1px rim light in sea brightens on its silhouette.
- CAST: the circle flashes and a pillar of light rises; the summoned unit pops in; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #8ae0f4 → #34a0c4 → #16688e → #0c3a5a before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 召唤蟹钳（SummonPincer） · 单位技能
持有者：蟹巫
> 每秒恢复2.5%法力值，法力值满后，召唤一只Pincer，持续40秒
> 画面：海蓝法阵里伸出蟹钳

```text
Create a single self-contained HTML file that renders the pixel art skill effect “召唤蟹钳” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the sea ramp #061a2a #0c3a5a #16688e #34a0c4 #8ae0f4 and white.

EFFECT
- Visual intent (from the game): 海蓝法阵里伸出蟹钳
- CHARGE (~0.5-0.9s): a particle circle draws itself on the ground and a pillar of light rises from it; the caster raises its hands / weapon and a 1px rim light in sea brightens on its silhouette.
- CAST: the circle flashes and a pillar of light rises; the summoned unit pops in; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #8ae0f4 → #34a0c4 → #16688e → #0c3a5a before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 巨型爆能枪（GigaBoomstick） · 单位技能
持有者：旋翼机
> 每3次攻击或每次击杀时，下一次攻击会额外造成175%攻击力的技能伤害
> 画面：巨型爆能光束

```text
Create a single self-contained HTML file that renders the pixel art skill effect “巨型爆能枪” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the orange ramp #301004 #6e2a0c #bc5416 #f08c2c #ffcc68 and white.

EFFECT
- Visual intent (from the game): 巨型爆能光束
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in orange brightens on its silhouette.
- CAST: a straight beam shoots to the target and splashes; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffcc68 → #f08c2c → #bc5416 → #6e2a0c before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 急速射击（RapidFire） · 单位技能
持有者：针刺者
> 攻击恢复魔法。获得50%的攻击速度，持续15秒。自身可叠加。
> 画面：急速射击的火星喷泉

```text
Create a single self-contained HTML file that renders the pixel art skill effect “急速射击” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the orange ramp #301004 #6e2a0c #bc5416 #f08c2c #ffcc68 and white.

EFFECT
- Visual intent (from the game): 急速射击的火星喷泉
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in orange brightens on its silhouette.
- CAST: a fountain of particles bursts upward and a ring expands through the allies; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffcc68 → #f08c2c → #bc5416 → #6e2a0c before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 嗜血（BloodRush） · 单位技能
持有者：萨满
> 直接释放：次数1，使一个盟友的攻击速度提高50%，持续5秒。
> 画面：嗜血红雾

```text
Create a single self-contained HTML file that renders the pixel art skill effect “嗜血” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the blood ramp #300408 #720a14 #c01a24 #ff4a4a #ffc0b0 and white.

EFFECT
- Visual intent (from the game): 嗜血红雾
- CHARGE (~0.5-0.9s): dark wisps and magic sparks curl inward; the caster raises its hands / weapon and a 1px rim light in blood brightens on its silhouette.
- CAST: a fountain of particles bursts upward and a ring expands through the allies; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffc0b0 → #ff4a4a → #c01a24 → #720a14 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 召唤蛙人（SummonFroggo） · 单位技能
持有者：女巫
> 附近敌方单位死亡时恢复1点法力值。召唤一只蛙人。
> 画面：绿色法阵里跳出蛙人

```text
Create a single self-contained HTML file that renders the pixel art skill effect “召唤蛙人” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the toxic ramp #1a3a08 #3a7a10 #6ec820 #b8f050 #f4ffc0 and white.

EFFECT
- Visual intent (from the game): 绿色法阵里跳出蛙人
- CHARGE (~0.5-0.9s): a particle circle draws itself on the ground and a pillar of light rises from it; the caster raises its hands / weapon and a 1px rim light in toxic brightens on its silhouette.
- CAST: the circle flashes and a pillar of light rises; the summoned unit pops in; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #f4ffc0 → #b8f050 → #6ec820 → #3a7a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 召唤小鬼（RaiseImp） · 单位技能
持有者：恶魔
> 召唤一只小鬼（魔法/奥术）。
> 画面：火红法阵里跳出小鬼

```text
Create a single self-contained HTML file that renders the pixel art skill effect “召唤小鬼” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 火红法阵里跳出小鬼
- CHARGE (~0.5-0.9s): a particle circle draws itself on the ground and a pillar of light rises from it; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: the circle flashes and a pillar of light rises; the summoned unit pops in; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

## 招牌技能

### 冲锋盾击（charge） · 招牌技能
持有者：招牌技能（按职业分配给没有法力技能的单位）

> 画面：盾面蓄满蓝光，撞击时一圈冲击波

```text
Create a single self-contained HTML file that renders the pixel art skill effect “冲锋盾击” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the frost ramp #0e2a4a #2462a0 #4aa6e6 #9ee0ff #ffffff and white.

EFFECT
- Visual intent (from the game): 盾面蓄满蓝光，撞击时一圈冲击波
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in frost brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #9ee0ff → #4aa6e6 → #2462a0 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 旋风斩（whirl） · 招牌技能
持有者：招牌技能（按职业分配给没有法力技能的单位）

> 画面：橙色旋风斩的环形刀光

```text
Create a single self-contained HTML file that renders the pixel art skill effect “旋风斩” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the orange ramp #301004 #6e2a0c #bc5416 #f08c2c #ffcc68 and white.

EFFECT
- Visual intent (from the game): 橙色旋风斩的环形刀光
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in orange brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffcc68 → #f08c2c → #bc5416 → #6e2a0c before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 箭雨（volley） · 招牌技能
持有者：招牌技能（按职业分配给没有法力技能的单位）

> 画面：金色箭雨落在目标区域

```text
Create a single self-contained HTML file that renders the pixel art skill effect “箭雨” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 金色箭雨落在目标区域
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: blades rain down onto the target area and stick in the ground; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 陨石术（fireball） · 招牌技能
持有者：招牌技能（按职业分配给没有法力技能的单位）

> 画面：陨石从天而降炸出火花

```text
Create a single self-contained HTML file that renders the pixel art skill effect “陨石术” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 陨石从天而降炸出火花
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: a meteor falls from the top-left and explodes into sparks on impact; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 霜冻新星（frost） · 招牌技能
持有者：招牌技能（按职业分配给没有法力技能的单位）

> 画面：霜冻新星：冰晶向外炸开

```text
Create a single self-contained HTML file that renders the pixel art skill effect “霜冻新星” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the frost ramp #0e2a4a #2462a0 #4aa6e6 #9ee0ff #ffffff and white.

EFFECT
- Visual intent (from the game): 霜冻新星：冰晶向外炸开
- CHARGE (~0.5-0.9s): ice shards orbit the focus; the caster raises its hands / weapon and a 1px rim light in frost brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #9ee0ff → #4aa6e6 → #2462a0 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 闪电链（chain） · 招牌技能
持有者：招牌技能（按职业分配给没有法力技能的单位）

> 画面：闪电链跳跃

```text
Create a single self-contained HTML file that renders the pixel art skill effect “闪电链” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the frost ramp #0e2a4a #2462a0 #4aa6e6 #9ee0ff #ffffff and white.

EFFECT
- Visual intent (from the game): 闪电链跳跃
- CHARGE (~0.5-0.9s): a crackling zigzag bolt forks towards the target; the caster raises its hands / weapon and a 1px rim light in frost brightens on its silhouette.
- CAST: a zigzag lightning bolt forks from the focus to the target and jumps on; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #9ee0ff → #4aa6e6 → #2462a0 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 圣光审判（holy） · 招牌技能
持有者：招牌技能（按职业分配给没有法力技能的单位）

> 画面：圣光之柱从天而降

```text
Create a single self-contained HTML file that renders the pixel art skill effect “圣光审判” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 圣光之柱从天而降
- CHARGE (~0.5-0.9s): small plus-shaped motes rise from the ground around the caster; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a meteor falls from the top-left and explodes into sparks on impact; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 金币风暴（gold） · 招牌技能
持有者：招牌技能（按职业分配给没有法力技能的单位）

> 画面：金币风暴四散

```text
Create a single self-contained HTML file that renders the pixel art skill effect “金币风暴” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the gold ramp #301a06 #6e4210 #b8841e #f0c040 #fff2a8 and white.

EFFECT
- Visual intent (from the game): 金币风暴四散
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in gold brightens on its silhouette.
- CAST: gold coins burst up, spin and rain down; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff2a8 → #f0c040 → #b8841e → #6e4210 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 猛扑（maul） · 招牌技能
持有者：招牌技能（按职业分配给没有法力技能的单位）

> 画面：猛扑落地的血色冲击

```text
Create a single self-contained HTML file that renders the pixel art skill effect “猛扑” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the blood ramp #300408 #720a14 #c01a24 #ff4a4a #ffc0b0 and white.

EFFECT
- Visual intent (from the game): 猛扑落地的血色冲击
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in blood brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffc0b0 → #ff4a4a → #c01a24 → #720a14 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

## 领袖技能

### 照夜（L:watchman） · 军团技能（领袖在场外点击释放）
持有者：守夜人

> 画面：灯笼光芒暴涨，所有敌人被照得停顿

```text
Create a single self-contained HTML file that renders the pixel art skill effect “照夜” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 灯笼光芒暴涨，所有敌人被照得停顿
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 梭哈（L:widow） · 军团技能（领袖在场外点击释放）
持有者：赌徒寡妇

> 画面：梭哈：金币从天上倾泻

```text
Create a single self-contained HTML file that renders the pixel art skill effect “梭哈” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the gold ramp #301a06 #6e4210 #b8841e #f0c040 #fff2a8 and white.

EFFECT
- Visual intent (from the game): 梭哈：金币从天上倾泻
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in gold brightens on its silhouette.
- CAST: gold coins burst up, spin and rain down; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff2a8 → #f0c040 → #b8841e → #6e4210 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 圣咏（L:nun） · 军团技能（领袖在场外点击释放）
持有者：驱魔修女

> 画面：圣咏：白羽与金色光点落在全队身上

```text
Create a single self-contained HTML file that renders the pixel art skill effect “圣咏” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 圣咏：白羽与金色光点落在全队身上
- CHARGE (~0.5-0.9s): small plus-shaped motes rise from the ground around the caster; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: plus-shaped motes pour over the target and a soft ring rises from it; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 血祭（L:butcherlord） · 军团技能（领袖在场外点击释放）
持有者：屠宰场主

> 画面：血祭：血雾炸开

```text
Create a single self-contained HTML file that renders the pixel art skill effect “血祭” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the blood ramp #300408 #720a14 #c01a24 #ff4a4a #ffc0b0 and white.

EFFECT
- Visual intent (from the game): 血祭：血雾炸开
- CHARGE (~0.5-0.9s): dark wisps and magic sparks curl inward; the caster raises its hands / weapon and a 1px rim light in blood brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffc0b0 → #ff4a4a → #c01a24 → #720a14 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 倒带（L:clockmaker） · 军团技能（领袖在场外点击释放）
持有者：钟表匠

> 画面：倒带：青色表盘光环

```text
Create a single self-contained HTML file that renders the pixel art skill effect “倒带” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the teal ramp #062226 #0e4a48 #187e74 #36bca6 #98f6e0 and white.

EFFECT
- Visual intent (from the game): 倒带：青色表盘光环
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in teal brightens on its silhouette.
- CAST: a pixel dome closes over the target, flashes and holds; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #98f6e0 → #36bca6 → #187e74 → #0e4a48 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 火葬（L:cremator） · 军团技能（领袖在场外点击释放）
持有者：焚尸人

> 画面：火葬：所有敌人脚下起火

```text
Create a single self-contained HTML file that renders the pixel art skill effect “火葬” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 火葬：所有敌人脚下起火
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: a fireball flies across the scene and bursts into embers; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 灯盾猛击（P:watchman） · 个人技能（领袖上场后自动释放）
持有者：守夜人

> 画面：灯盾猛击：金色冲击波

```text
Create a single self-contained HTML file that renders the pixel art skill effect “灯盾猛击” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 灯盾猛击：金色冲击波
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 致命一掷（P:widow） · 个人技能（领袖上场后自动释放）
持有者：赌徒寡妇

> 画面：致命一掷：金色牌光

```text
Create a single self-contained HTML file that renders the pixel art skill effect “致命一掷” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the gold ramp #301a06 #6e4210 #b8841e #f0c040 #fff2a8 and white.

EFFECT
- Visual intent (from the game): 致命一掷：金色牌光
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in gold brightens on its silhouette.
- CAST: a straight beam shoots to the target and splashes; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff2a8 → #f0c040 → #b8841e → #6e4210 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 圣光祷言（P:nun） · 个人技能（领袖上场后自动释放）
持有者：驱魔修女

> 画面：圣光祷言：全队光点

```text
Create a single self-contained HTML file that renders the pixel art skill effect “圣光祷言” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the holy ramp #4a3a10 #a88220 #f0cc40 #fff098 #ffffff and white.

EFFECT
- Visual intent (from the game): 圣光祷言：全队光点
- CHARGE (~0.5-0.9s): small plus-shaped motes rise from the ground around the caster; the caster raises its hands / weapon and a 1px rim light in holy brightens on its silhouette.
- CAST: plus-shaped motes pour over the target and a soft ring rises from it; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffffff → #fff098 → #f0cc40 → #a88220 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 剁骨旋风（P:butcherlord） · 个人技能（领袖上场后自动释放）
持有者：屠宰场主

> 画面：剁骨旋风：血色环斩

```text
Create a single self-contained HTML file that renders the pixel art skill effect “剁骨旋风” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the blood ramp #300408 #720a14 #c01a24 #ff4a4a #ffc0b0 and white.

EFFECT
- Visual intent (from the game): 剁骨旋风：血色环斩
- CHARGE (~0.5-0.9s): dark wisps and magic sparks curl inward; the caster raises its hands / weapon and a 1px rim light in blood brightens on its silhouette.
- CAST: a flat ring of particles expands outward along the floor; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #ffc0b0 → #ff4a4a → #c01a24 → #720a14 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 停摆（P:clockmaker） · 个人技能（领袖上场后自动释放）
持有者：钟表匠

> 画面：停摆：青色表盘

```text
Create a single self-contained HTML file that renders the pixel art skill effect “停摆” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the teal ramp #062226 #0e4a48 #187e74 #36bca6 #98f6e0 and white.

EFFECT
- Visual intent (from the game): 停摆：青色表盘
- CHARGE (~0.5-0.9s): sparks spiral inward to the focus point; the caster raises its hands / weapon and a 1px rim light in teal brightens on its silhouette.
- CAST: a pixel dome closes over the target, flashes and holds; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #98f6e0 → #36bca6 → #187e74 → #0e4a48 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

### 焚身（P:cremator） · 个人技能（领袖上场后自动释放）
持有者：焚尸人

> 画面：焚身：火浪

```text
Create a single self-contained HTML file that renders the pixel art skill effect “焚身” from 午夜机台, cast by a small pixel caster at the left of the scene onto a dummy target at the right, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit scaled by the largest integer factor that fits the window, centered, imageSmoothingEnabled = false, CSS image-rendering: pixelated.
- Integer coordinates only; no anti-aliasing, gradients or shadowBlur. Fixed palette: ink #0b0610 #150d1e #21172c plus the fire ramp #5a1406 #c83a10 #f47a1c #ffc040 #fff6b0 and white.

EFFECT
- Visual intent (from the game): 焚身：火浪
- CHARGE (~0.5-0.9s): embers rise from the feet and flicker; the caster raises its hands / weapon and a 1px rim light in fire brightens on its silhouette.
- CAST: a fireball flies across the scene and bursts into embers; bright burst at the focus point, 1-2 pixel screen shake, the target flashes white for one frame.
- RECOVER: particles fade out; the caster settles back to idle.
- Pooled allocation-free particles (preallocate ~512, reuse). Each particle steps its palette index white → #fff6b0 → #ffc040 → #f47a1c → #c83a10 before despawn; draw them snapped to the grid, 1-3 px squares.
- Loop the whole sequence seamlessly: IDLE -> CHARGE -> CAST -> RECOVER. Fixed 60hz timestep, rAF rendering, zero allocation in the loop; pose parameters quantized so it reads at 8-12 fps.

QUALITY BAR
- Crisp pixels at any window size, stable 60fps. Should look like a polished 16-bit skill animation, not vector shapes scaled down.
```

