# 午夜机台 · 角色 prompt

每个角色一段，按「动画像素法师」的 prompt 写法：固定 128×96 逻辑分辨率、整数放大、固定调色板、程序化像素拼装、IDLE→CHARGE→CAST→RECOVER 状态机、池化粒子、1px 轮廓光。
游戏里的实现就是这些描述：`src/mc-px16-cast.js` 是每个角色的数据版 prompt，`src/mc-px16-hum.js` / `mc-px16-rigs.js` 是骨架，`src/mc-px16-fx.js` 是技能特效配方。本文件由 `node tools/gen-prompts.js` 从同一份数据生成，改角色请改数据后重新生成。

共 215 个角色。

## 领袖与民兵

### 守夜人（watchman） · 领袖


```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a night watchman leader (“守夜人”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; moss #263a16 #40582a #627c3e; void #16101f #261c34 #3c3050; gold #6e4210 #b8841e #f0c040; wood #46291a #6e4428 #986436; brass #5a3a14 #946224 #c89640; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~29x28 logical pixels: humanoid, short beard, wearing a cap, a long coat with a centre seam, a cape that sways behind, holding a burning torch, a round shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the torch overhead, the torch flame flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a flat ring of particles expands outward along the floor, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: a quiet street at midnight, deep blue sky, a lamp post, cobble floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the torch flame in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 赌徒寡妇（widow） · 领袖


```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a gambling widow leader (“赌徒寡妇”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; crimson #48081e #7c1030 #b82248; void #16101f #261c34 #3c3050; gold #6e4210 #b8841e #f0c040; shadow #120c1a #22182e #3a2c4c; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~29x28 logical pixels: humanoid, long hair, wearing a veil, a flared dress, holding a folding fan.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the fan overhead, the fan edge flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to gold (#fff2a8 → #f0c040 → #b8841e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: a quiet street at midnight, deep blue sky, a lamp post, cobble floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the fan edge in gold, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 驱魔修女（nun） · 领袖


```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an exorcist nun leader (“驱魔修女”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~29x28 logical pixels: humanoid, wearing a veil, a priest robe with a stole, holding an open spell book.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the hand, strike forward, pull back) -> CHARGE (raise the book overhead, the glyph above the open book flickers, small plus-shaped motes rise from the ground around the caster) -> CAST (bright burst, plus-shaped motes pour over the target and a soft ring rises from it, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: a quiet street at midnight, deep blue sky, a lamp post, cobble floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the glyph above the open book in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 屠宰场主（butcherlord） · 领袖


```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a slaughterhouse lord leader (“屠宰场主”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; crimson #48081e #7c1030 #b82248; void #16101f #261c34 #3c3050; gold #6e4210 #b8841e #f0c040; wood #46291a #6e4428 #986436; steel #323a4e #5a6680 #909cb4; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~32x30 logical pixels: heavy-set humanoid, short beard, a bare chest, belt and trousers, holding an axe.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the axe overhead, the weapon tip flickers, dark wisps and magic sparks curl inward) -> CAST (bright burst, a flat ring of particles expands outward along the floor, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: a quiet street at midnight, deep blue sky, a lamp post, cobble floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 钟表匠（clockmaker） · 领袖


```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a clockmaker leader (“钟表匠”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; wood #46291a #6e4428 #986436; void #16101f #261c34 #3c3050; brass #5a3a14 #946224 #c89640; snow #6e8298 #a8bccc #dce8f0; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~29x28 logical pixels: humanoid, wild hair, wearing brass goggles, a long coat with a centre seam, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a pixel dome closes over the target, flashes and holds, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: a quiet street at midnight, deep blue sky, a lamp post, cobble floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 焚尸人（cremator） · 领袖


```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a cremator leader (“焚尸人”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; fire #c83a10 #f47a1c #ffc040; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~29x28 logical pixels: humanoid, wearing a hood, a long two-shade robe with a trim band, holding a burning torch.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the torch overhead, the torch flame flickers, embers rise from the feet and flicker) -> CAST (bright burst, a fireball flies across the scene and bursts into embers, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: a quiet street at midnight, deep blue sky, a lamp post, cobble floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the torch flame in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 民兵（militia） · 领袖


```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a base militia soldier (“民兵”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; leather #40220f #6a3c1e #94602e; navy #141a3a #222e5e #364a86; gold #6e4210 #b8841e #f0c040; iron #26222e #3e3a48 #5e5a6a; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, wearing an open helmet, a belted tunic, holding a spear.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the spear overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

## 兽人

### 赤蠕虫（RedWorm） · 兽人 · 商人 · 普通
> 十分脆弱的高伤害单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc worm called “red worm” (“赤蠕虫”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): red #5c101a #9a2026 #dc4234; crimson #48081e #7c1030 #b82248; cream #8e8674 #c6bca2 #ece4cc; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~20x18 logical pixels: a segmented worm that humps along.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 镰刃虫（SickleWorm） · 兽人 · 商人 · 普通
> 能让其不防守而去外出寻宝获得额外秘晶。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc worm called “sickle worm” (“镰刃虫”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): red #5c101a #9a2026 #dc4234; orange #6e2a0c #bc5416 #f08c2c; cream #8e8674 #c6bca2 #ece4cc; steel #323a4e #5a6680 #909cb4; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~22x21 logical pixels: a segmented worm that humps along with sickle blades.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 浪人（Ronin） · 兽人 · 射手 · 普通
> 飞行单位。根据移动距离增加攻速。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc ronin (“浪人”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): orc #244a1e #3e722c #68a242; navy #141a3a #222e5e #364a86; wood #46291a #6e4428 #986436; red #5c101a #9a2026 #dc4234; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid with a green-skinned orc face with a tusk, pony hair, wearing a wide straw hat, a belted tunic, bat wings, a trailing scarf, holding a recurve bow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (draw the string to the cheek with an arrow nocked, release (string snaps straight), relax) -> CHARGE (raise the bow overhead, the nocked arrow flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the nocked arrow in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 狂王（MadMonarch） · 兽人 · 射手 · 史诗
> 飞行单位。每次攻击时增加攻击速度。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc mad monarch (“狂王”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): orc #244a1e #3e722c #68a242; crimson #48081e #7c1030 #b82248; wood #46291a #6e4428 #986436; gold #6e4210 #b8841e #f0c040; navy #141a3a #222e5e #364a86; purple #321458 #582a92 #904ecc; steel #323a4e #5a6680 #909cb4; orange #6e2a0c #bc5416 #f08c2c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: heavy-set humanoid with a green-skinned orc face with a tusk, wearing a gold crown, a belted tunic, a cape that sways behind, demon wings, holding a recurve bow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (draw the string to the cheek with an arrow nocked, release (string snaps straight), relax) -> CHARGE (raise the bow overhead, the nocked arrow flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the nocked arrow in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 巨魔（Troll） · 兽人 · 商人 · 普通
> 根据升级路径能选择更适于建造在更强或更弱的友方单位旁。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc troll (“巨魔”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): moss #263a16 #40582a #627c3e; leather #40220f #6a3c1e #94602e; wood #46291a #6e4428 #986436; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: hulking giant humanoid with a green-skinned orc face with a tusk, wild hair, a bare chest, belt and trousers, holding a heavy club.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the club overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 绿魔（GreenDemon） · 兽人 · 先锋 · 史诗
> 强大的单位。附近有更高战斗力的单位时会变弱。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc green demon (“绿魔”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): green #1a4418 #2e7026 #56aa3c; leather #40220f #6a3c1e #94602e; wood #46291a #6e4428 #986436; shadow #120c1a #22182e #3a2c4c; gold #6e4210 #b8841e #f0c040; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~38x36 logical pixels: heavy-set humanoid with a green-skinned orc face with a tusk, wearing curved demon horns, a bare chest, belt and trousers, holding an axe.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the axe overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 黄魔（YellowDemon） · 兽人 · 战士 · 史诗
> 附近建造更高战斗力的单位时会获得加强。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc yellow demon (“黄魔”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): gold #6e4210 #b8841e #f0c040; leather #40220f #6a3c1e #94602e; wood #46291a #6e4428 #986436; crimson #48081e #7c1030 #b82248; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; fire #c83a10 #f47a1c #ffc040; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~38x36 logical pixels: heavy-set humanoid with a green-skinned orc face with a tusk, wearing curved demon horns, a bare chest, belt and trousers, holding a war hammer.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the hammer overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 沙漠信徒（DesertBeliever） · 兽人 · 祭司 · 稀有
> 使用治疗链治疗多个友方单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc desert believer (“沙漠信徒”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): orc #244a1e #3e722c #68a242; cream #8e8674 #c6bca2 #ece4cc; wood #46291a #6e4428 #986436; orange #6e2a0c #bc5416 #f08c2c; steel #323a4e #5a6680 #909cb4; green #1a4418 #2e7026 #56aa3c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid with a green-skinned orc face with a tusk, short beard, wearing a turban with a gem, a long two-shade robe with a trim band, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, small plus-shaped motes rise from the ground around the caster) -> CAST (bright burst, plus-shaped motes pour over the target and a soft ring rises from it, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to green (#a2e46c → #56aa3c → #2e7026) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in green, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 蛇神使者（SnakeGodMessenger） · 兽人 · 祭司 · 传说
> 使用大地之灵祝福友方单位，增加其最大生命值。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc snake god messenger (“蛇神使者”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): green #1a4418 #2e7026 #56aa3c; gold #6e4210 #b8841e #f0c040; wood #46291a #6e4428 #986436; teal #0e4a48 #187e74 #36bca6; steel #323a4e #5a6680 #909cb4; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: humanoid with a scaly lizard head with a snout, a priest robe with a stole, a cape that sways behind, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, small plus-shaped motes rise from the ground around the caster) -> CAST (bright burst, a pixel dome closes over the target, flashes and holds, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 魔盾兵（MagicShieldSoldier） · 兽人 · 先锋 · 史诗
> 重装单位。但是不以攻击力著称。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc magic shield soldier (“魔盾兵”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): orc #244a1e #3e722c #68a242; leather #40220f #6a3c1e #94602e; wood #46291a #6e4428 #986436; gold #6e4210 #b8841e #f0c040; navy #141a3a #222e5e #364a86; iron #26222e #3e3a48 #5e5a6a; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: heavy-set humanoid with a green-skinned orc face with a tusk, wearing an open helmet, plate armour with pauldrons and a belt, holding a one-handed sword, a magic shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the sword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 破魔守卫（AntiMagicGuardian） · 兽人 · 先锋 · 传说
> 究极奥术护甲重装单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc anti magic guardian (“破魔守卫”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): orc #244a1e #3e722c #68a242; leather #40220f #6a3c1e #94602e; wood #46291a #6e4428 #986436; arcane #5e28a6 #9c5af0 #d4a4ff; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: heavy-set humanoid with a green-skinned orc face with a tusk, wearing a great helm with an eye slit, heavy plate armour with big pauldrons, holding a war hammer, a tower shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the hammer overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 巨型野猪（BigWildBoar） · 兽人 · 先锋 · 史诗
> 重装单位。能冲锋进入战场造成溅射伤害

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc boar called “big wild boar” (“巨型野猪”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; orange #6e2a0c #bc5416 #f08c2c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~32x30 logical pixels: a chibi boar with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, tusks.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a flat ring of particles expands outward along the floor, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 赤瞳（RedEyes） · 兽人 · 先锋 · 传说
> 拥有更高的坦度以及更狂躁的冲锋。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an orc boar called “red eyes” (“赤瞳”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): iron #26222e #3e3a48 #5e5a6a; shadow #120c1a #22182e #3a2c4c; red #5c101a #9a2026 #dc4234; crimson #48081e #7c1030 #b82248; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~39x37 logical pixels: a chibi boar with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, tusks, bone spikes along the back, armour plates.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a flat ring of particles expands outward along the floor, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: dusk canyon with a red sky, a few 1px stars, a rock ledge floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

## 不死

### 雏鸡（Chick） · 不死 · 商人 · 普通
> 飞行单位。能升级为两种不同的形态。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead chick called “chick” (“雏鸡”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): gold #6e4210 #b8841e #f0c040; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; orange #6e2a0c #bc5416 #f08c2c; frost #2462a0 #4aa6e6 #9ee0ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~17x16 logical pixels: a round chick with folded wings, beak and thin legs.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 火鸡（Turkey） · 不死 · 商人 · 稀有
> 飞行单位。远程伤害单位。能转换成近战防御形态的恶魔鱼

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead turkey called “turkey” (“火鸡”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): leather #40220f #6a3c1e #94602e; gold #6e4210 #b8841e #f0c040; wood #46291a #6e4428 #986436; orange #6e2a0c #bc5416 #f08c2c; red #5c101a #9a2026 #dc4234; frost #2462a0 #4aa6e6 #9ee0ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~23x22 logical pixels: a round turkey with folded wings, beak and thin legs.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 公鸡（Rooster） · 不死 · 商人 · 稀有
> 飞行单位。近战重装单位。可以适应为塞拉芬。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead rooster called “rooster” (“公鸡”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): cream #8e8674 #c6bca2 #ece4cc; leather #40220f #6a3c1e #94602e; snow #6e8298 #a8bccc #dce8f0; gold #6e4210 #b8841e #f0c040; orange #6e2a0c #bc5416 #f08c2c; green #1a4418 #2e7026 #56aa3c; red #5c101a #9a2026 #dc4234; frost #2462a0 #4aa6e6 #9ee0ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~23x22 logical pixels: a round rooster with folded wings, beak and thin legs.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 步卒（FootSoldier） · 不死 · 战士 · 普通
> 敌人死亡时积攒层数。层数越多最终升级形态越强。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead foot soldier (“步卒”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): pale #2e3e56 #56708c #8ea8c0; navy #141a3a #222e5e #364a86; void #16101f #261c34 #3c3050; frost #2462a0 #4aa6e6 #9ee0ff; iron #26222e #3e3a48 #5e5a6a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, wearing an open helmet, a belted tunic, holding a spear.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the spear overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to sea (#8ae0f4 → #34a0c4 → #16688e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in sea, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 赤十字（RedCross） · 不死 · 战士 · 史诗
> 更加娴熟的渔夫。可以积攒更多的层数。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead red cross (“赤十字”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): pale #2e3e56 #56708c #8ea8c0; navy #141a3a #222e5e #364a86; void #16101f #261c34 #3c3050; red #5c101a #9a2026 #dc4234; snow #6e8298 #a8bccc #dce8f0; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, wearing a great helm with an eye slit, plate armour with pauldrons and a belt, a cape that sways behind, holding a one-handed sword, a kite shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the sword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to sea (#8ae0f4 → #34a0c4 → #16688e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in sea, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 炎帝（EmperorOfFlame） · 不死 · 战士 · 传说
> 层数越多，伤害越高。但是将不再积攒新的层数。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead emperor of flame (“炎帝”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): pale #2e3e56 #56708c #8ea8c0; red #5c101a #9a2026 #dc4234; void #16101f #261c34 #3c3050; gold #6e4210 #b8841e #f0c040; fire #c83a10 #f47a1c #ffc040; navy #141a3a #222e5e #364a86; orange #6e2a0c #bc5416 #f08c2c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: humanoid, wild hair, wearing a gold crown, a long two-shade robe with a trim band, a cape that sways behind, holding a two-handed greatsword.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the greatsword overhead, the weapon tip flickers, a fountain of particles bursts upward and a ring expands) -> CAST (bright burst, a fountain of particles bursts upward and a ring expands through the allies, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to sea (#8ae0f4 → #34a0c4 → #16688e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in sea, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 水战士（WaterWarrior） · 不死 · 战士 · 稀有
> 每波开始时遁地。在五秒后会破土而出，推荐建造于前线。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead water warrior (“水战士”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): pale #2e3e56 #56708c #8ea8c0; navy #141a3a #222e5e #364a86; void #16101f #261c34 #3c3050; frost #2462a0 #4aa6e6 #9ee0ff; sea #0c3a5a #16688e #34a0c4; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid, wearing a plumed helmet, plate armour with pauldrons and a belt, holding a gold trident.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the trident overhead, the weapon tip flickers, dark wisps and magic sparks curl inward) -> CAST (bright burst, blades rain down onto the target area and stick in the ground, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to shadow (#6a5a86 → #3a2c4c → #22182e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in shadow, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 不朽蓝魔（ImmortalBlueDemon） · 不死 · 战士 · 史诗
> 可以造成大量伤害但是十分脆弱。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead immortal blue demon (“不朽蓝魔”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): blue #18265e #2a4aa0 #4884dc; navy #141a3a #222e5e #364a86; void #16101f #261c34 #3c3050; frost #2462a0 #4aa6e6 #9ee0ff; steel #323a4e #5a6680 #909cb4; snow #6e8298 #a8bccc #dce8f0; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: heavy-set humanoid, wearing curved demon horns, a bare chest, belt and trousers, holding an axe.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the axe overhead, the weapon tip flickers, dark wisps and magic sparks curl inward) -> CAST (bright burst, blades rain down onto the target area and stick in the ground, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to shadow (#6a5a86 → #3a2c4c → #22182e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in shadow, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 食人魔（Ogre） · 不死 · 商人 · 稀有
> 格拉尔秘制烤肉让其能以较高的价格出售

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead ogre (“食人魔”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): pale #2e3e56 #56708c #8ea8c0; navy #141a3a #222e5e #364a86; void #16101f #261c34 #3c3050; leather #40220f #6a3c1e #94602e; frost #2462a0 #4aa6e6 #9ee0ff; snow #6e8298 #a8bccc #dce8f0; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~34x32 logical pixels: hulking giant humanoid, a bare chest, belt and trousers, holding a heavy club.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the club overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 指挥官（Commander） · 不死 · 先锋 · 传说
> 重装单位。能重击地面来减速敌人。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead commander (“指挥官”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): pale #2e3e56 #56708c #8ea8c0; navy #141a3a #222e5e #364a86; void #16101f #261c34 #3c3050; frost #2462a0 #4aa6e6 #9ee0ff; snow #6e8298 #a8bccc #dce8f0; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: humanoid, short beard, wearing a plumed helmet, plate armour with pauldrons and a belt, a cape that sways behind, holding a war banner.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the banner overhead, the banner top flickers, embers rise from the feet and flicker) -> CAST (bright burst, a meteor falls from the top-left and explodes into sparks on impact, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the banner top in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 棕熊（BrownBear） · 不死 · 祭司 · 传说
> 光环单位。临近建造的单位获得缓慢生命恢复以及魔法抗性

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead bear called “brown bear” (“棕熊”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~39x37 logical pixels: a chibi bear with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, small plus-shaped motes rise from the ground around the caster) -> CAST (bright burst, a flat ring of particles expands outward along the floor, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 冰雪法师（IceAndSnowMage） · 不死 · 法师 · 史诗
> 能周期性自我治疗并使攻击速度变快。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead ice and snow mage (“冰雪法师”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): pale #2e3e56 #56708c #8ea8c0; snow #6e8298 #a8bccc #dce8f0; void #16101f #261c34 #3c3050; frost #2462a0 #4aa6e6 #9ee0ff; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, wearing a hood, a long two-shade robe with a trim band, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, embers rise from the feet and flicker) -> CAST (bright burst, a fountain of particles bursts upward and a ring expands through the allies, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 大法师（Archmage） · 不死 · 法师 · 传说
> 拥有一定承伤能力的远程输出。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead archmage (“大法师”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): pale #2e3e56 #56708c #8ea8c0; purple #321458 #582a92 #904ecc; void #16101f #261c34 #3c3050; gold #6e4210 #b8841e #f0c040; snow #6e8298 #a8bccc #dce8f0; steel #323a4e #5a6680 #909cb4; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: humanoid, long hair, long beard, wearing a pointed wizard hat with a bend, a long two-shade robe with a trim band, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, embers rise from the feet and flicker) -> CAST (bright burst, a fountain of particles bursts upward and a ring expands through the allies, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 神石（Stone） · 不死 · 战士 · 史诗
> 独特单位。无法移动或攻击，但是能反弹受到的伤害。在两波后进化为九头蛇，或者在被击碎后提前孵化为稍弱的形态。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead egg called “stone” (“神石”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; navy #141a3a #222e5e #364a86; frost #2462a0 #4aa6e6 #9ee0ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~28x26 logical pixels: a huge egg-shaped stone with glowing cracks.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a flat ring of particles expands outward along the floor, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 巨人战神（GiantGodOfWar） · 不死 · 先锋 · 传说
> 每过一波会变强。死亡时会分裂成3个小型九头蛇。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead giant god of war (“巨人战神”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): pale #2e3e56 #56708c #8ea8c0; navy #141a3a #222e5e #364a86; void #16101f #261c34 #3c3050; red #5c101a #9a2026 #dc4234; gold #6e4210 #b8841e #f0c040; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~47x45 logical pixels: hulking giant humanoid, wearing a plumed helmet, heavy plate armour with big pauldrons, a cape that sways behind, holding a two-handed greatsword.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the greatsword overhead, the weapon tip flickers, a particle circle draws itself on the ground and a pillar of light rises from it) -> CAST (bright burst, the circle flashes and a pillar of light rises; the summoned unit pops in, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 魔像（Golem） · 不死 · 先锋 · 史诗
> 九头蛇死亡时召唤小九头蛇。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an undead golem (“魔像”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): iron #26222e #3e3a48 #5e5a6a; navy #141a3a #222e5e #364a86; void #16101f #261c34 #3c3050; frost #2462a0 #4aa6e6 #9ee0ff; snow #6e8298 #a8bccc #dce8f0; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: hulking giant humanoid with a stone head with glowing eyes, a bare chest, belt and trousers, holding bare fists.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the hand, strike forward, pull back) -> CHARGE (raise the fist overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: moonlit graveyard, blue night sky, twinkling 1px stars, a crooked fence and a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

## 骷髅

### 逃兵（Deserter） · 骷髅 · 先锋 · 普通
> 被动恢复生命值。拥有三条升级路线使其可以适应多种情况。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton deserter (“逃兵”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; moss #263a16 #40582a #627c3e; shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; teal #0e4a48 #187e74 #36bca6; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid with a skull head with glowing eye sockets and a row of teeth, an exposed ribcage and bone limbs, holding a dagger.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the dagger overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 骸骨武士（Warrior） · 骷髅 · 先锋 · 稀有
> 唯一一个重装骷髅。生命值越低，生命恢复速度越快。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton warrior (“骸骨武士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; void #16101f #261c34 #3c3050; shadow #120c1a #22182e #3a2c4c; teal #0e4a48 #187e74 #36bca6; navy #141a3a #222e5e #364a86; iron #26222e #3e3a48 #5e5a6a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid with a skull head with glowing eye sockets and a row of teeth, wearing an open helmet, an exposed ribcage and bone limbs, holding a one-handed sword, a round shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the sword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 骸骨法师（Mage） · 骷髅 · 祭司 · 稀有
> 可以为一名友方单位增加大量攻击速度。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton mage (“骸骨法师”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; void #16101f #261c34 #3c3050; shadow #120c1a #22182e #3a2c4c; teal #0e4a48 #187e74 #36bca6; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid with a skull head with glowing eye sockets and a row of teeth, wearing a hood, a long two-shade robe with a trim band, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, dark wisps and magic sparks curl inward) -> CAST (bright burst, dark wisps lash out to the target and burst, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 骸骨弓手（Archer） · 骷髅 · 法师 · 普通
> 远程单位。在被动恢复生命值的基础上可以使用法力值射出燃烧箭造成额外伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton archer (“骸骨弓手”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; moss #263a16 #40582a #627c3e; shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; teal #0e4a48 #187e74 #36bca6; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid with a skull head with glowing eye sockets and a row of teeth, an exposed ribcage and bone limbs, a quiver on the back, holding a recurve bow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (draw the string to the cheek with an arrow nocked, release (string snaps straight), relax) -> CHARGE (raise the bow overhead, the nocked arrow flickers, embers rise from the feet and flicker) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the nocked arrow in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 守卫（Guard） · 骷髅 · 先锋 · 普通
> 飞行单位。受到的伤害减少。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton guard (“守卫”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; void #16101f #261c34 #3c3050; shadow #120c1a #22182e #3a2c4c; teal #0e4a48 #187e74 #36bca6; navy #141a3a #222e5e #364a86; iron #26222e #3e3a48 #5e5a6a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid with a skull head with glowing eye sockets and a row of teeth, wearing an open helmet, an exposed ribcage and bone limbs, holding a spear, a tower shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the spear overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 教堂守卫（ChurchGuard） · 骷髅 · 先锋 · 史诗
> 不再是飞行单位。受到的伤害进一步减少。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton church guard (“教堂守卫”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; void #16101f #261c34 #3c3050; shadow #120c1a #22182e #3a2c4c; gold #6e4210 #b8841e #f0c040; navy #141a3a #222e5e #364a86; snow #6e8298 #a8bccc #dce8f0; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid with a skull head with glowing eye sockets and a row of teeth, wearing a great helm with an eye slit, plate armour with pauldrons and a belt, holding a long pike, a kite shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the pike overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 召唤师（Summoner） · 骷髅 · 法师 · 稀有
> 能召唤混沌猎犬作战。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton summoner (“召唤师”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; purple #321458 #582a92 #904ecc; shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; teal #0e4a48 #187e74 #36bca6; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid with a skull head with glowing eye sockets and a row of teeth, wearing a hood, a long two-shade robe with a trim band, holding an open spell book.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the hand, strike forward, pull back) -> CHARGE (raise the book overhead, the glyph above the open book flickers, a particle circle draws itself on the ground and a pillar of light rises from it) -> CAST (bright burst, the circle flashes and a pillar of light rises; the summoned unit pops in, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to iron (#8a8698 → #5e5a6a → #3e3a48) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the glyph above the open book in iron, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 糖果女孩（CandyGirl） · 骷髅 · 法师 · 史诗
> 能召唤更加凶狠的地狱犬。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton candy girl (“糖果女孩”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; pink #541442 #90286c #d0469e; shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; cream #8e8674 #c6bca2 #ece4cc; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid with a skull head with glowing eye sockets and a row of teeth, bun hair, a flared dress, holding a short wand with a star gem.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the wand overhead, the wand star flickers, a particle circle draws itself on the ground and a pillar of light rises from it) -> CAST (bright burst, the circle flashes and a pillar of light rises; the summoned unit pops in, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the wand star in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 血骑士（BloodKnight） · 骷髅 · 先锋 · 稀有
> 光环单位。临近建造的单位获得吸血和法术吸血。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton blood knight (“血骑士”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; void #16101f #261c34 #3c3050; shadow #120c1a #22182e #3a2c4c; teal #0e4a48 #187e74 #36bca6; navy #141a3a #222e5e #364a86; blood #720a14 #c01a24 #ff4a4a; crimson #48081e #7c1030 #b82248; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid with a skull head with glowing eye sockets and a row of teeth, wearing a horned helmet, plate armour with pauldrons and a belt, a cape that sways behind, holding a one-handed sword.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the sword overhead, the weapon tip flickers, dark wisps and magic sparks curl inward) -> CAST (bright burst, plus-shaped motes pour over the target and a soft ring rises from it, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 狮锤（LionHammer） · 骷髅 · 先锋 · 传说
> 光环单位。拥有一个主动治疗技能且临近建造的单位获得吸血和法术吸血。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton lion hammer (“狮锤”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; void #16101f #261c34 #3c3050; shadow #120c1a #22182e #3a2c4c; orange #6e2a0c #bc5416 #f08c2c; navy #141a3a #222e5e #364a86; gold #6e4210 #b8841e #f0c040; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: heavy-set humanoid with a skull head with glowing eye sockets and a row of teeth, wearing a plumed helmet, heavy plate armour with big pauldrons, holding a war hammer.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the hammer overhead, the weapon tip flickers, dark wisps and magic sparks curl inward) -> CAST (bright burst, plus-shaped motes pour over the target and a soft ring rises from it, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 剑舞者（SwordDancer） · 骷髅 · 商人 · 史诗
> 高伤害但是防御力较低。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton sword dancer (“剑舞者”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; teal #0e4a48 #187e74 #36bca6; shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: slim humanoid with a skull head with glowing eye sockets and a row of teeth, an exposed ribcage and bone limbs, a trailing scarf, holding a slim katana.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the katana overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 幻影舞者（PhantomDancer） · 骷髅 · 战士 · 传说
> 每次攻击时收割敌人的能量都使其的镰刀更加强大。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton phantom dancer (“幻影舞者”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; purple #321458 #582a92 #904ecc; shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; arcane #5e28a6 #9c5af0 #d4a4ff; steel #323a4e #5a6680 #909cb4; pale #2e3e56 #56708c #8ea8c0; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: slim humanoid with a skull head with glowing eye sockets and a row of teeth, an exposed ribcage and bone limbs, a trailing scarf, no legs — the body tapers into floating wisps, holding a slim katana.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, hover height, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the katana overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 死灵法师（Necromancer） · 骷髅 · 法师 · 史诗
> 能召唤亡灵飞龙来吞噬敌人。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton necromancer (“死灵法师”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; toxic #3a7a10 #6ec820 #b8f050; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid with a skull head with glowing eye sockets and a row of teeth, wearing a hood, a long two-shade robe with a trim band, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, a particle circle draws itself on the ground and a pillar of light rises from it) -> CAST (bright burst, the circle flashes and a pillar of light rises; the summoned unit pops in, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 死神（GrimReaper） · 骷髅 · 法师 · 传说
> 召唤一只拥有无可匹敌力量的巨龙。敌方单位死亡时恢复法力值。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton grim reaper (“死神”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; void #16101f #261c34 #3c3050; shadow #120c1a #22182e #3a2c4c; teal #0e4a48 #187e74 #36bca6; navy #141a3a #222e5e #364a86; snow #6e8298 #a8bccc #dce8f0; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~46x44 logical pixels: humanoid with a hollow face with two glowing eyes, wearing a hood, a long two-shade robe with a trim band, no legs — the body tapers into floating wisps, holding a long scythe.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, hover height, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the scythe overhead, the scythe blade flickers, dark wisps and magic sparks curl inward) -> CAST (bright burst, dark wisps lash out to the target and burst, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the scythe blade in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 复仇之龙（VengefulDragon） · 骷髅 · 射手 · 普通
> 击杀敌人时能恢复自身生命值的远程召唤物

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton dragon called “vengeful dragon” (“复仇之龙”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; purple #321458 #582a92 #904ecc; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: a compact dragon hovering with an S-curved neck holding the head high, two big raised membrane wings with arm bones, a curled tail with a spade tip, back spines and horns, visible rib bones.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 骨龙（BoneDragon） · 骷髅 · 射手 · 普通
> 击杀敌人时能恢复自身生命值的远程召唤物

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton dragon called “bone dragon” (“骨龙”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): bone #56503e #948a70 #cfc4a2; iron #26222e #3e3a48 #5e5a6a; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: a compact dragon hovering with an S-curved neck holding the head high, two big raised membrane wings with arm bones, a curled tail with a spade tip, back spines and horns, visible rib bones.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 灰狼（GrayWolf） · 骷髅 · 战士 · 普通
> 高伤害的近战宠物

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton wolf called “gray wolf” (“灰狼”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): iron #26222e #3e3a48 #5e5a6a; steel #323a4e #5a6680 #909cb4; snow #6e8298 #a8bccc #dce8f0; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~23x22 logical pixels: a chibi wolf with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 恐狼（DireWolf） · 骷髅 · 战士 · 普通
> 高伤害近战宠物

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton wolf called “dire wolf” (“恐狼”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): shadow #120c1a #22182e #3a2c4c; iron #26222e #3e3a48 #5e5a6a; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~26x24 logical pixels: a chibi wolf with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 老猎犬（OldHound） · 骷髅 · 战士 · 普通
> 高伤害近战宠物。（小鬼）

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton dog called “old hound” (“老猎犬”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): leather #40220f #6a3c1e #94602e; wood #46291a #6e4428 #986436; cream #8e8674 #c6bca2 #ece4cc; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~21x20 logical pixels: a chibi dog with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 恶魔（Diabolic） · 骷髅 · 射手 · 普通
> 恶魔法术师宠物。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a skeleton diabolic (“恶魔”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): crimson #48081e #7c1030 #b82248; void #16101f #261c34 #3c3050; shadow #120c1a #22182e #3a2c4c; teal #0e4a48 #187e74 #36bca6; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~22x21 logical pixels: short, stocky humanoid with a demon face with fangs, wearing curved demon horns, an exposed ribcage and bone limbs, bat wings, a demon tail, holding a floating orb above the hand.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the hand, strike forward, pull back) -> CHARGE (raise the orb overhead, the orb flickers, a particle circle draws itself on the ground and a pillar of light rises from it) -> CAST (bright burst, the circle flashes and a pillar of light rises; the summoned unit pops in, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: crypt at night, dark teal sky, a moon, tombstone silhouettes on a stone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the orb in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

## 人类

### 维京战士（VikingWarrior） · 人类 · 商人 · 普通
> 廉价的防御型单位

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a human viking warrior (“维京战士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; leather #40220f #6a3c1e #94602e; navy #141a3a #222e5e #364a86; wood #46291a #6e4428 #986436; orange #6e2a0c #bc5416 #f08c2c; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, a braided viking beard, wearing a horned viking helm, a belted tunic, holding an axe, a round shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the axe overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 奴隶主（SlaveLord） · 人类 · 先锋 · 稀有
> 重装单位。低生命值时攻击速度变快。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a human slave lord (“奴隶主”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; blue #18265e #2a4aa0 #4884dc; navy #141a3a #222e5e #364a86; shadow #120c1a #22182e #3a2c4c; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: heavy-set humanoid, wearing a hood, a bare chest, belt and trousers, holding a flail on a chain.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the flail overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 持盾卫士（ShieldDefender） · 人类 · 先锋 · 普通
> 重装单位。受到的远程伤害减少。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a human shield defender (“持盾卫士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; blue #18265e #2a4aa0 #4884dc; navy #141a3a #222e5e #364a86; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, wearing an open helmet, a belted tunic, holding a one-handed sword, a tower shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the sword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 重装战士（HeavilyArmedWarrior） · 人类 · 先锋 · 史诗
> 重装单位。受到的远程伤害减少。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a human heavily armed warrior (“重装战士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; blue #18265e #2a4aa0 #4884dc; navy #141a3a #222e5e #364a86; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: heavy-set humanoid, wearing a great helm with an eye slit, heavy plate armour with big pauldrons, holding a flanged mace, a tower shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the mace overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 黄鬃马（YellowManeHorse） · 人类 · 祭司 · 普通
> 为周围的友方单位恢复法力。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a human horse called “yellow mane horse” (“黄鬃马”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): cream #8e8674 #c6bca2 #ece4cc; wood #46291a #6e4428 #986436; gold #6e4210 #b8841e #f0c040; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~26x24 logical pixels: a chibi horse with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, small plus-shaped motes rise from the ground around the caster) -> CAST (bright burst, a fountain of particles bursts upward and a ring expands through the allies, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 汗血马（SweatBloodHorse） · 人类 · 祭司 · 史诗
> 虔诚的信仰增强了它的恢复能力。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a human horse called “sweat blood horse” (“汗血马”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): crimson #48081e #7c1030 #b82248; red #5c101a #9a2026 #dc4234; orange #6e2a0c #bc5416 #f08c2c; gold #6e4210 #b8841e #f0c040; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: a chibi horse with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, a mane of flickering fire, a saddle.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, small plus-shaped motes rise from the ground around the caster) -> CAST (bright burst, a fountain of particles bursts upward and a ring expands through the allies, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 精英猎手（EliteHunter） · 人类 · 射手 · 稀有
> 每次攻击射出四发箭矢。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a human elite hunter (“精英猎手”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; green #1a4418 #2e7026 #56aa3c; navy #141a3a #222e5e #364a86; leather #40220f #6a3c1e #94602e; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid, wearing a hood, a belted tunic, a quiver on the back, holding a recurve bow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (draw the string to the cheek with an arrow nocked, release (string snaps straight), relax) -> CHARGE (raise the bow overhead, the nocked arrow flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the nocked arrow in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 暗夜射手（NightArcher） · 人类 · 射手 · 传说
> 装备着劲弩，能射出五发箭矢。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a human night archer (“暗夜射手”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; shadow #120c1a #22182e #3a2c4c; navy #141a3a #222e5e #364a86; gold #6e4210 #b8841e #f0c040; void #16101f #261c34 #3c3050; steel #323a4e #5a6680 #909cb4; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: humanoid, wearing a hood, a belted tunic, a cape that sways behind, a quiver on the back, holding a recurve bow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (draw the string to the cheek with an arrow nocked, release (string snaps straight), relax) -> CHARGE (raise the bow overhead, the nocked arrow flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the nocked arrow in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 惩戒牧师（PunishingCleric） · 人类 · 射手 · 史诗
> 远程单位。攻击同一个敌人时伤害会慢慢增加。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a human punishing cleric (“惩戒牧师”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; snow #6e8298 #a8bccc #dce8f0; navy #141a3a #222e5e #364a86; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, wearing a hood, a priest robe with a stole, holding an open spell book.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the hand, strike forward, pull back) -> CHARGE (raise the book overhead, the glyph above the open book flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the glyph above the open book in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 主教（Bishop） · 人类 · 射手 · 传说
> 拥有逐渐提升伤害的远程单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a human bishop (“主教”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; snow #6e8298 #a8bccc #dce8f0; navy #141a3a #222e5e #364a86; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: humanoid, long beard, wearing a tall bishop miter, a priest robe with a stole, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 卫队长（GuardCommander） · 人类 · 法师 · 史诗
> 攻击或受到攻击时获得法力值。拥有的法力值越多越强大。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a human guard commander (“卫队长”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; blue #18265e #2a4aa0 #4884dc; navy #141a3a #222e5e #364a86; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, wearing a plumed helmet, plate armour with pauldrons and a belt, a cape that sways behind, holding a one-handed sword, a kite shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the sword overhead, the weapon tip flickers, a ring of particles closes into a dome then expands) -> CAST (bright burst, a pixel dome closes over the target, flashes and holds, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 奥法元帅（MarshalOrfa） · 人类 · 法师 · 传说
> 即使千年已过，他的圣权仍固。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a human marshal orfa (“奥法元帅”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; blue #18265e #2a4aa0 #4884dc; navy #141a3a #222e5e #364a86; gold #6e4210 #b8841e #f0c040; wood #46291a #6e4428 #986436; arcane #5e28a6 #9c5af0 #d4a4ff; purple #321458 #582a92 #904ecc; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: humanoid, short beard, wearing a gold crown, plate armour with pauldrons and a belt, a cape that sways behind, holding a two-handed greatsword.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the greatsword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a meteor falls from the top-left and explodes into sparks on impact, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: castle courtyard at night, deep blue sky, twinkling 1px stars, moon, flagstone floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

## 精灵

### 巫毒信徒（VoodooBeliever） · 精灵 · 战士 · 普通
> 飞行单位。死亡时会对击杀者施加毒素。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an elf voodoo believer (“巫毒信徒”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; green #1a4418 #2e7026 #56aa3c; moss #263a16 #40582a #627c3e; gold #6e4210 #b8841e #f0c040; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; bone #56503e #948a70 #cfc4a2; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid with a pointed-ear elf face, wearing a tribal mask, an open vest over bare skin, holding a dagger.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the dagger overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: forest clearing at night, green-black sky, fireflies as single pixels, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 巫毒守卫（VoodooGuard） · 精灵 · 战士 · 稀有
> 飞行单位。其爪子以及甲壳都让其战斗力更加强大。毒素浓度也得到了提升。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an elf voodoo guard (“巫毒守卫”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; green #1a4418 #2e7026 #56aa3c; moss #263a16 #40582a #627c3e; gold #6e4210 #b8841e #f0c040; navy #141a3a #222e5e #364a86; wood #46291a #6e4428 #986436; orange #6e2a0c #bc5416 #f08c2c; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid with a pointed-ear elf face, wearing a tribal mask, an open vest over bare skin, holding a spear, a round shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the spear overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: forest clearing at night, green-black sky, fireflies as single pixels, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 游侠（Ranger） · 精灵 · 射手 · 普通
> 远程单位。能增加首领单位受到的伤害

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an elf ranger (“游侠”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; green #1a4418 #2e7026 #56aa3c; moss #263a16 #40582a #627c3e; gold #6e4210 #b8841e #f0c040; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid with a pointed-ear elf face, wearing a hood, a belted tunic, a quiver on the back, holding a recurve bow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (draw the string to the cheek with an arrow nocked, release (string snaps straight), relax) -> CHARGE (raise the bow overhead, the nocked arrow flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: forest clearing at night, green-black sky, fireflies as single pixels, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the nocked arrow in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 死亡射手（DeathShooter） · 精灵 · 祭司 · 史诗
> 与人海战术以及攻速快的单位相性极佳。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an elf death shooter (“死亡射手”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): purple #321458 #582a92 #904ecc; shadow #120c1a #22182e #3a2c4c; moss #263a16 #40582a #627c3e; gold #6e4210 #b8841e #f0c040; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid with a pointed-ear elf face, wearing a hood, a belted tunic, a cape that sways behind, holding a crossbow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (aim, fire with a 2-pixel muzzle flash and recoil, settle) -> CHARGE (raise the crossbow overhead, the bolt flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: forest clearing at night, green-black sky, fireflies as single pixels, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the bolt in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 赤卫（RedGuard） · 精灵 · 先锋 · 稀有
> 波次开始时只有最大值一半的生命，但是能缓慢再生。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an elf red guard (“赤卫”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; green #1a4418 #2e7026 #56aa3c; moss #263a16 #40582a #627c3e; gold #6e4210 #b8841e #f0c040; navy #141a3a #222e5e #364a86; red #5c101a #9a2026 #dc4234; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid with a pointed-ear elf face, wearing a plumed helmet, plate armour with pauldrons and a belt, holding a spear, a kite shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the spear overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: forest clearing at night, green-black sky, fireflies as single pixels, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 圣光骑士（HolyLightKnight） · 精灵 · 先锋 · 史诗
> 飞行单位。成熟体的它伤害以及坦度都得到了提升。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an elf holy light knight (“圣光骑士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; green #1a4418 #2e7026 #56aa3c; moss #263a16 #40582a #627c3e; gold #6e4210 #b8841e #f0c040; snow #6e8298 #a8bccc #dce8f0; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid with a pointed-ear elf face, long hair, plate armour with pauldrons and a belt, a floating gold halo, holding a one-handed sword, a kite shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the sword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: forest clearing at night, green-black sky, fireflies as single pixels, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 翡翠龙（EmeraldDragon） · 精灵 · 祭司 · 稀有
> 拥有能对周围敌人造成慢性伤害的香气

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an elf dragon called “emerald dragon” (“翡翠龙”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): green #1a4418 #2e7026 #56aa3c; moss #263a16 #40582a #627c3e; toxic #3a7a10 #6ec820 #b8f050; teal #0e4a48 #187e74 #36bca6; gold #6e4210 #b8841e #f0c040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~34x32 logical pixels: a compact dragon hovering with an S-curved neck holding the head high, two big raised membrane wings with arm bones, a curled tail with a spade tip, back spines and horns.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, bubbles and slow drifting clouds) -> CAST (bright burst, a toxic cloud puffs over the target with drifting bubbles, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: forest clearing at night, green-black sky, fireflies as single pixels, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 毒龙（PoisonDragon） · 精灵 · 祭司 · 传说
> 进化后的毒性更强了。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an elf dragon called “poison dragon” (“毒龙”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): purple #321458 #582a92 #904ecc; toxic #3a7a10 #6ec820 #b8f050; bone #56503e #948a70 #cfc4a2; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~50x47 logical pixels: a compact dragon hovering with an S-curved neck holding the head high, two big raised membrane wings with arm bones, a curled tail with a spade tip, back spines and horns.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, bubbles and slow drifting clouds) -> CAST (bright burst, a toxic cloud puffs over the target with drifting bubbles, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: forest clearing at night, green-black sky, fireflies as single pixels, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 黑铁卫（BlackIronGuard） · 精灵 · 先锋 · 史诗
> 重装单位。在怀特迈恩周围时更强。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an elf black iron guard (“黑铁卫”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; green #1a4418 #2e7026 #56aa3c; moss #263a16 #40582a #627c3e; toxic #3a7a10 #6ec820 #b8f050; navy #141a3a #222e5e #364a86; iron #26222e #3e3a48 #5e5a6a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: heavy-set humanoid with a pointed-ear elf face, wearing a great helm with an eye slit, heavy plate armour with big pauldrons, holding a flanged mace, a tower shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the mace overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: forest clearing at night, green-black sky, fireflies as single pixels, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 翠盾（VerdantShield） · 精灵 · 先锋 · 传说
> 光环单位。临近建造的单位受到更少的伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an elf verdant shield (“翠盾”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; green #1a4418 #2e7026 #56aa3c; moss #263a16 #40582a #627c3e; gold #6e4210 #b8841e #f0c040; navy #141a3a #222e5e #364a86; toxic #3a7a10 #6ec820 #b8f050; wood #46291a #6e4428 #986436; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: humanoid with a pointed-ear elf face, wearing antlers, plate armour with pauldrons and a belt, holding a one-handed sword, a magic shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the sword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: forest clearing at night, green-black sky, fireflies as single pixels, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 玉藤堡垒（JadeVineFortress） · 精灵 · 先锋 · 史诗
> 重装远程单位。受到攻击时反弹伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an elf crystal called “jade vine fortress” (“玉藤堡垒”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; moss #263a16 #40582a #627c3e; teal #0e4a48 #187e74 #36bca6; green #1a4418 #2e7026 #56aa3c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~51x48 logical pixels: a stone tower with battlements and a glowing window, topped by a floating crystal, vines climbing the walls.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (the top glows, recoils and fires a bolt) -> CHARGE (rear up, head raised, the top of the tower flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: forest clearing at night, green-black sky, fireflies as single pixels, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the top of the tower in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 风暴堡垒（StormFortress） · 精灵 · 先锋 · 传说
> 能同时投掷3个香蕉，荆棘也能反弹更多伤害了。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of an elf storm called “storm fortress” (“风暴堡垒”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; navy #141a3a #222e5e #364a86; frost #2462a0 #4aa6e6 #9ee0ff; snow #6e8298 #a8bccc #dce8f0; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~58x55 logical pixels: a stone tower with battlements and a glowing window, topped by a small storm cloud with lightning, vines climbing the walls.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (the top glows, recoils and fires a bolt) -> CHARGE (rear up, head raised, the top of the tower flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: forest clearing at night, green-black sky, fireflies as single pixels, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the top of the tower in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

## 僵尸

### 蜥蜴（Lizard） · 僵尸 · 射手 · 普通
> 存活时间越长，攻击速度越快。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie lizard called “lizard” (“蜥蜴”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): green #1a4418 #2e7026 #56aa3c; moss #263a16 #40582a #627c3e; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~22x21 logical pixels: a low lizard with a long tail.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 宝石蜥蜴（GemLizard） · 僵尸 · 射手 · 稀有
> 电力充能，全面升级。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie lizard called “gem lizard” (“宝石蜥蜴”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): teal #0e4a48 #187e74 #36bca6; sea #0c3a5a #16688e #34a0c4; cream #8e8674 #c6bca2 #ece4cc; pink #541442 #90286c #d0469e; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: a low lizard with a long tail and gems along its back.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to pink (#ffa2dc → #d0469e → #90286c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in pink, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 鹰喙弓手（EagleBeakedArcher） · 僵尸 · 射手 · 普通
> 拥有弹射攻击。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie eagle beaked archer (“鹰喙弓手”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; moss #263a16 #40582a #627c3e; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid with an eagle head with a hooked beak, a belted tunic, a quiver on the back, holding a recurve bow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (draw the string to the cheek with an arrow nocked, release (string snaps straight), relax) -> CHARGE (raise the bow overhead, the nocked arrow flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to sea (#8ae0f4 → #34a0c4 → #16688e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the nocked arrow in sea, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 投石弓手（CatapultArcher） · 僵尸 · 祭司 · 史诗
> 拥有能使敌人受到更多技能伤害的弹射攻击。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie catapult archer (“投石弓手”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): zombie #34401e #56683a #849a5a; moss #263a16 #40582a #627c3e; toxic #3a7a10 #6ec820 #b8f050; leather #40220f #6a3c1e #94602e; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid with a stitched zombie face, wearing a cap, a belted tunic, a backpack, holding a crossbow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (aim, fire with a 2-pixel muzzle flash and recoil, settle) -> CHARGE (raise the crossbow overhead, the bolt flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to sea (#8ae0f4 → #34a0c4 → #16688e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the bolt in sea, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 天使弓手（AngelArcher） · 僵尸 · 射手 · 史诗
> 拥有能点燃被标记目标的弹射攻击。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie angel archer (“天使弓手”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): pale #2e3e56 #56708c #8ea8c0; snow #6e8298 #a8bccc #dce8f0; moss #263a16 #40582a #627c3e; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid with a stitched zombie face, a long two-shade robe with a trim band, angel wings, a floating gold halo, holding a recurve bow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (draw the string to the cheek with an arrow nocked, release (string snaps straight), relax) -> CHARGE (raise the bow overhead, the nocked arrow flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to sea (#8ae0f4 → #34a0c4 → #16688e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the nocked arrow in sea, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 飞鹰（FlyingEagle） · 僵尸 · 商人 · 普通
> 飞行单位。以阵风攻击敌人。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie eagle called “flying eagle” (“飞鹰”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; gold #6e4210 #b8841e #f0c040; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~22x21 logical pixels: a round eagle in flight with spread wings.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 蓝龙（BlueDragon） · 僵尸 · 法师 · 史诗
> 飞行单位。能周期性电击敌人。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie dragon called “blue dragon” (“蓝龙”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): blue #18265e #2a4aa0 #4884dc; navy #141a3a #222e5e #364a86; frost #2462a0 #4aa6e6 #9ee0ff; snow #6e8298 #a8bccc #dce8f0; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: a compact dragon hovering with an S-curved neck holding the head high, two big raised membrane wings with arm bones, a curled tail with a spade tip, back spines and horns.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, a crackling zigzag bolt forks towards the target) -> CAST (bright burst, a zigzag lightning bolt forks from the focus to the target and jumps on, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 铁甲战士（IroncladWarrior） · 僵尸 · 先锋 · 稀有
> 重装单位。能以下一波之后虚弱一波的代价发动硬化，在下一波中提高伤害抗性。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie ironclad warrior (“铁甲战士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): zombie #34401e #56683a #849a5a; crimson #48081e #7c1030 #b82248; moss #263a16 #40582a #627c3e; toxic #3a7a10 #6ec820 #b8f050; navy #141a3a #222e5e #364a86; iron #26222e #3e3a48 #5e5a6a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid with a stitched zombie face, wearing an open helmet, plate armour with pauldrons and a belt, holding an axe.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the axe overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 钢铁军阀（SteelWarlord） · 僵尸 · 先锋 · 传说
> 使用金属包裹自身进一步提升坦度。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie steel warlord (“钢铁军阀”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): zombie #34401e #56683a #849a5a; crimson #48081e #7c1030 #b82248; moss #263a16 #40582a #627c3e; toxic #3a7a10 #6ec820 #b8f050; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; bone #56503e #948a70 #cfc4a2; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: heavy-set humanoid with a stitched zombie face, wearing a horned helmet, heavy plate armour with big pauldrons, a cape that sways behind, holding a two-handed greatsword.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the greatsword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 月光使徒（MoonlightApostle） · 僵尸 · 法师 · 史诗
> 能周期性对单个目标造成大量伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie moonlight apostle (“月光使徒”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): zombie #34401e #56683a #849a5a; navy #141a3a #222e5e #364a86; moss #263a16 #40582a #627c3e; frost #2462a0 #4aa6e6 #9ee0ff; steel #323a4e #5a6680 #909cb4; snow #6e8298 #a8bccc #dce8f0; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid with a stitched zombie face, wearing a hood, a long two-shade robe with a trim band, holding a floating orb above the hand.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the hand, strike forward, pull back) -> CHARGE (raise the orb overhead, the orb flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the orb in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 时间法师（TimeMage） · 僵尸 · 祭司 · 传说
> 光环单位。临近建造的单位法力恢复加快

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie time mage (“时间法师”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): zombie #34401e #56683a #849a5a; brass #5a3a14 #946224 #c89640; moss #263a16 #40582a #627c3e; gold #6e4210 #b8841e #f0c040; snow #6e8298 #a8bccc #dce8f0; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: humanoid with a stitched zombie face, long beard, wearing brass goggles, a long two-shade robe with a trim band, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a meteor falls from the top-left and explodes into sparks on impact, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 赤龙（RedDragon） · 僵尸 · 先锋 · 史诗
> 使用法力值抵挡受到的伤害，并且根据已失去法力值增加伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie dragon called “red dragon” (“赤龙”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): red #5c101a #9a2026 #dc4234; crimson #48081e #7c1030 #b82248; orange #6e2a0c #bc5416 #f08c2c; gold #6e4210 #b8841e #f0c040; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: a compact dragon hovering with an S-curved neck holding the head high, two big raised membrane wings with arm bones, a curled tail with a spade tip, back spines and horns.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, embers rise from the feet and flicker) -> CAST (bright burst, a pixel dome closes over the target, flashes and holds, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 黑龙（BlackDragon） · 僵尸 · 先锋 · 传说
> 飞行单位。传说中的生物，拥有更强大的法力护盾。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a zombie dragon called “black dragon” (“黑龙”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; purple #321458 #582a92 #904ecc; bone #56503e #948a70 #cfc4a2; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~50x47 logical pixels: a compact dragon hovering with an S-curved neck holding the head high, two big raised membrane wings with arm bones, a curled tail with a spade tip, back spines and horns.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, a ring of particles closes into a dome then expands) -> CAST (bright burst, a pixel dome closes over the target, flashes and holds, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: swamp at night, sickly green haze, moon behind clouds, mud floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

## 科技

### 长枪兵（Pikeman） · 科技 · 先锋 · 普通
> 飞行单位。能用黄金增强其在下一波的战斗力

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech pikeman (“长枪兵”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; iron #26222e #3e3a48 #5e5a6a; teal #0e4a48 #187e74 #36bca6; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, wearing an open helmet, a belted tunic, holding a long pike.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the pike overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 链甲枪兵（ChainmailPikeman） · 科技 · 先锋 · 稀有
> 不再是飞行单位。综合性能更强的战斗装甲

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech chainmail pikeman (“链甲枪兵”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; navy #141a3a #222e5e #364a86; iron #26222e #3e3a48 #5e5a6a; teal #0e4a48 #187e74 #36bca6; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid, wearing an open helmet, plate armour with pauldrons and a belt, holding a long pike.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the pike overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 见习法师（MageApprentice） · 科技 · 法师 · 普通
> 远程单位。拥有两条迥然不同的升级路线

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech mage apprentice (“见习法师”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; blue #18265e #2a4aa0 #4884dc; iron #26222e #3e3a48 #5e5a6a; teal #0e4a48 #187e74 #36bca6; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, wearing a cap, a long two-shade robe with a trim band, holding a short wand with a star gem.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the wand overhead, the wand star flickers, a crackling zigzag bolt forks towards the target) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the wand star in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 天界法师（CelestialMage） · 科技 · 法师 · 史诗
> 超远程狙击单位。每隔几次攻击就会释放闪电弹

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech celestial mage (“天界法师”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; snow #6e8298 #a8bccc #dce8f0; iron #26222e #3e3a48 #5e5a6a; teal #0e4a48 #187e74 #36bca6; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, long hair, a long two-shade robe with a trim band, a floating gold halo, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, a crackling zigzag bolt forks towards the target) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 火焰法师（FlameMage） · 科技 · 射手 · 史诗
> 拥有能造成溅射伤害的火焰喷射器。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech flame mage (“火焰法师”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; red #5c101a #9a2026 #dc4234; iron #26222e #3e3a48 #5e5a6a; orange #6e2a0c #bc5416 #f08c2c; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; crimson #48081e #7c1030 #b82248; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, wearing a hood, a long two-shade robe with a trim band, holding a burning torch.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the torch overhead, the torch flame flickers, embers rise from the feet and flicker) -> CAST (bright burst, a flat ring of particles expands outward along the floor, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the torch flame in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 机枪蝠（Bat） · 科技 · 射手 · 稀有
> 飞行单位。拥有一个随机攻击地面单位的机枪手。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech bat called “bat” (“机枪蝠”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): iron #26222e #3e3a48 #5e5a6a; cream #8e8674 #c6bca2 #ece4cc; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~23x22 logical pixels: a bat with big membrane wings and a gun strapped under it.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 吸血蝠（VampireBat） · 科技 · 祭司 · 史诗
> 飞行光环单位。使临近建造的飞行单位获得伤害增幅。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech bat called “vampire bat” (“吸血蝠”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; cream #8e8674 #c6bca2 #ece4cc; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~28x26 logical pixels: a bat with big membrane wings.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a meteor falls from the top-left and explodes into sparks on impact, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 巫师（Wizard） · 科技 · 祭司 · 稀有
> 光环单位。临近建造的单位获得攻击速度加成。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech wizard (“巫师”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; navy #141a3a #222e5e #364a86; iron #26222e #3e3a48 #5e5a6a; teal #0e4a48 #187e74 #36bca6; snow #6e8298 #a8bccc #dce8f0; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid, wild hair, wearing brass goggles, a long coat with a centre seam, holding a short wand with a star gem.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the wand overhead, the wand star flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the wand star in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 监工（Supervisor） · 科技 · 祭司 · 传说
> 光环单位。使临近建造的单位能获得更多的攻击速度。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech supervisor (“监工”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; shadow #120c1a #22182e #3a2c4c; iron #26222e #3e3a48 #5e5a6a; gold #6e4210 #b8841e #f0c040; steel #323a4e #5a6680 #909cb4; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: humanoid, short beard, wearing a top hat, a long coat with a centre seam, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 角斗士（Gladiator） · 科技 · 战士 · 史诗
> 防御型单位。但是拥有对单个单位逐渐提升伤害的它对首领单位十分有效。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech gladiator (“角斗士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; red #5c101a #9a2026 #dc4234; iron #26222e #3e3a48 #5e5a6a; teal #0e4a48 #187e74 #36bca6; navy #141a3a #222e5e #364a86; brass #5a3a14 #946224 #c89640; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, wearing a plumed helmet, an open vest over bare skin, holding a one-handed sword, a buckler shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the sword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 狂战士（Berserker） · 科技 · 战士 · 传说
> 能量战刃使其拥有逐渐增强的攻击。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech berserker (“狂战士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; navy #141a3a #222e5e #364a86; iron #26222e #3e3a48 #5e5a6a; leather #40220f #6a3c1e #94602e; teal #0e4a48 #187e74 #36bca6; red #5c101a #9a2026 #dc4234; steel #323a4e #5a6680 #909cb4; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: heavy-set humanoid, wild hair, a bare chest, belt and trousers, holding an axe.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the axe overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 金龙（GoldenDragon） · 科技 · 射手 · 史诗
> 击杀敌人时会使他们爆炸。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech dragon called “golden dragon” (“金龙”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): gold #6e4210 #b8841e #f0c040; brass #5a3a14 #946224 #c89640; cream #8e8674 #c6bca2 #ece4cc; orange #6e2a0c #bc5416 #f08c2c; snow #6e8298 #a8bccc #dce8f0; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: a compact dragon hovering with an S-curved neck holding the head high, two big raised membrane wings with arm bones, a curled tail with a spade tip, back spines and horns.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, embers rise from the feet and flicker) -> CAST (bright burst, a flat ring of particles expands outward along the floor, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 魔龙（MagicDragon） · 科技 · 射手 · 传说
> 昂贵的造价带来的是无可匹敌的力量。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech dragon called “magic dragon” (“魔龙”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): purple #321458 #582a92 #904ecc; arcane #5e28a6 #9c5af0 #d4a4ff; pink #541442 #90286c #d0469e; gold #6e4210 #b8841e #f0c040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~50x47 logical pixels: a compact dragon hovering with an S-curved neck holding the head high, two big raised membrane wings with arm bones, a curled tail with a spade tip, back spines and horns.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, embers rise from the feet and flicker) -> CAST (bright burst, a flat ring of particles expands outward along the floor, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 自爆步兵（BoomSoldier） · 科技 · 战士 · 普通
> 自爆步兵

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a tech boom soldier (“自爆步兵”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skin #7a3e28 #b86e48 #e2a070; iron #26222e #3e3a48 #5e5a6a; teal #0e4a48 #187e74 #36bca6; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, wearing brass goggles, a belted tunic, a backpack, holding a floating orb above the hand.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the hand, strike forward, pull back) -> CHARGE (raise the orb overhead, the orb flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: factory rooftop at night, steel-blue sky, blinking antenna lights, metal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the orb in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

## 恶魔

### 沙漠弓手（DesertArcher） · 恶魔 · 射手 · 普通
> 远程单位。能同时攻击三个敌人。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon desert archer (“沙漠弓手”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): red #5c101a #9a2026 #dc4234; orange #6e2a0c #bc5416 #f08c2c; crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; cream #8e8674 #c6bca2 #ece4cc; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid with a demon face with fangs, wearing a bandana with trailing tails, a belted tunic, a quiver on the back, holding a recurve bow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (draw the string to the cheek with an arrow nocked, release (string snaps straight), relax) -> CHARGE (raise the bow overhead, the nocked arrow flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the nocked arrow in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 幻影射手（FantasyShooter） · 恶魔 · 射手 · 稀有
> 崭新的面具为她带来了更加强大的力量

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon fantasy shooter (“幻影射手”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): red #5c101a #9a2026 #dc4234; purple #321458 #582a92 #904ecc; crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; orange #6e2a0c #bc5416 #f08c2c; navy #141a3a #222e5e #364a86; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid with a demon face with fangs, wearing a hood, a belted tunic, a cape that sways behind, holding a recurve bow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (draw the string to the cheek with an arrow nocked, release (string snaps straight), relax) -> CHARGE (raise the bow overhead, the nocked arrow flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the nocked arrow in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 烈焰射手（BlazingShooter） · 恶魔 · 射手 · 史诗
> 脾气十分的古怪。在强弱两种形态间互相切换。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon blazing shooter (“烈焰射手”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): red #5c101a #9a2026 #dc4234; orange #6e2a0c #bc5416 #f08c2c; crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; fire #c83a10 #f47a1c #ffc040; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid with a demon face with fangs, wearing hair made of flickering fire, a belted tunic, a quiver on the back, holding a recurve bow.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (draw the string to the cheek with an arrow nocked, release (string snaps straight), relax) -> CHARGE (raise the bow overhead, the nocked arrow flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the nocked arrow in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 魂蛛（Spider） · 恶魔 · 战士 · 普通
> 能主动发动灵魂祭品来永久提升它的数值。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon spider called “spider” (“魂蛛”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; cream #8e8674 #c6bca2 #ece4cc; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~22x21 logical pixels: a spider with a round abdomen, eight jointed legs and a cluster of glowing eyes.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, dark wisps and magic sparks curl inward) -> CAST (bright burst, a fountain of particles bursts upward and a ring expands through the allies, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 火猪（FirePig） · 恶魔 · 战士 · 普通
> 能使用黄金在下一波中装备手里剑强化其攻击。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon pig called “fire pig” (“火猪”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): red #5c101a #9a2026 #dc4234; orange #6e2a0c #bc5416 #f08c2c; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~21x20 logical pixels: a chibi pig with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, a mane of flickering fire.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 白牙（WhiteFang） · 恶魔 · 战士 · 史诗
> 投掷手里剑的频率提升为之前的三倍。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon wolf called “white fang” (“白牙”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): snow #6e8298 #a8bccc #dce8f0; frost #2462a0 #4aa6e6 #9ee0ff; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~32x30 logical pixels: a chibi wolf with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 先祖战士（AncestorWarrior） · 恶魔 · 先锋 · 稀有
> 能死后复生的单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon ancestor warrior (“先祖战士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): red #5c101a #9a2026 #dc4234; shadow #120c1a #22182e #3a2c4c; crimson #48081e #7c1030 #b82248; orange #6e2a0c #bc5416 #f08c2c; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; gold #6e4210 #b8841e #f0c040; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid with a demon face with fangs, wild hair, wearing a tribal mask, an open vest over bare skin, holding a spear.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the spear overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 灵魂战士（SoulWarrior） · 恶魔 · 先锋 · 传说
> 手持传说之剑，身披赤色甲胄。能死后复生。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon soul warrior (“灵魂战士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): purple #321458 #582a92 #904ecc; shadow #120c1a #22182e #3a2c4c; crimson #48081e #7c1030 #b82248; orange #6e2a0c #bc5416 #f08c2c; arcane #5e28a6 #9c5af0 #d4a4ff; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: humanoid with a demon face with fangs, plate armour with pauldrons and a belt, no legs — the body tapers into floating wisps, holding a two-handed greatsword.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, hover height, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the greatsword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 白狼（WhiteWolf） · 恶魔 · 先锋 · 史诗
> 能冻缓周围单位并且出人意料为防御型的单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon wolf called “white wolf” (“白狼”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): snow #6e8298 #a8bccc #dce8f0; frost #2462a0 #4aa6e6 #9ee0ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: a chibi wolf with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 雪狼王（SnowWolfKing） · 恶魔 · 先锋 · 传说
> 能冻缓周围单位并且出人意料为防御型的单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon wolf called “snow wolf king” (“雪狼王”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): snow #6e8298 #a8bccc #dce8f0; frost #2462a0 #4aa6e6 #9ee0ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: a chibi wolf with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, a small gold crown.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 灵召塔（SpiritSummonTower） · 恶魔 · 法师 · 史诗
> 独特单位。无法移动或攻击，但是能召唤单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon portal called “spirit summon tower” (“灵召塔”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; shadow #120c1a #22182e #3a2c4c; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~51x48 logical pixels: a stone tower with battlements and a glowing window, topped by a swirling portal.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (the top glows, recoils and fires a bolt) -> CHARGE (rear up, head raised, the top of the tower flickers, a particle circle draws itself on the ground and a pillar of light rises from it) -> CAST (bright burst, the circle flashes and a pillar of light rises; the summoned unit pops in, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the top of the tower in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 地狱召唤塔（HellSummonTower） · 恶魔 · 法师 · 传说
> 能召唤更强的召唤物

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon flame called “hell summon tower” (“地狱召唤塔”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; crimson #48081e #7c1030 #b82248; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~62x59 logical pixels: a stone tower with battlements and a glowing window, topped by an eternal flame.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (the top glows, recoils and fires a bolt) -> CHARGE (rear up, head raised, the top of the tower flickers, a particle circle draws itself on the ground and a pillar of light rises from it) -> CAST (bright burst, the circle flashes and a pillar of light rises; the summoned unit pops in, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the top of the tower in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 月豹（MoonLeopard） · 恶魔 · 射手 · 普通
> 灵魂之门的召唤物。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon leopard called “moon leopard” (“月豹”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): snow #6e8298 #a8bccc #dce8f0; frost #2462a0 #4aa6e6 #9ee0ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~23x22 logical pixels: a chibi leopard with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, spots.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 看门犬（Watchdog） · 恶魔 · 战士 · 普通
> 灵魂之门的近战召唤物。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon dog called “watchdog” (“看门犬”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~21x20 logical pixels: a chibi dog with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 魔豹（MagicLeopard） · 恶魔 · 射手 · 普通
> 地狱之门的远程型召唤物。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon leopard called “magic leopard” (“魔豹”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): purple #321458 #582a92 #904ecc; arcane #5e28a6 #9c5af0 #d4a4ff; pink #541442 #90286c #d0469e; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~23x22 logical pixels: a chibi leopard with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, spots.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 邪犬（EvilDog） · 恶魔 · 战士 · 普通
> 地狱之门的近战型召唤物。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a demon dog called “evil dog” (“邪犬”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): red #5c101a #9a2026 #dc4234; crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~21x20 logical pixels: a chibi dog with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: hellish night, ember-red sky, drifting 1px embers, cracked basalt floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

## 自然

### 野法师（WildMage） · 自然 · 战士 · 普通
> 能造成溅射伤害，其真正的力量隐藏于升级之后的形态。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature wild mage (“野法师”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skinD #44221a #6e3a26 #9a5a3a; moss #263a16 #40582a #627c3e; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; toxic #3a7a10 #6ec820 #b8f050; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, wearing antlers, a long two-shade robe with a trim band, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, sparks spiral inward to the focus point) -> CAST (bright burst, blades rain down onto the target area and stick in the ground, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to green (#a2e46c → #56aa3c → #2e7026) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in green, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 炮灰法师（CannonFodderMage） · 自然 · 商人 · 稀有
> 其神秘的球茎在死亡时能产出少量的秘晶。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature cannon fodder mage (“炮灰法师”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skinD #44221a #6e3a26 #9a5a3a; moss #263a16 #40582a #627c3e; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; toxic #3a7a10 #6ec820 #b8f050; leather #40220f #6a3c1e #94602e; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid, wearing a cap, ragged cloth, holding a short wand with a star gem.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the wand overhead, the wand star flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to green (#a2e46c → #56aa3c → #2e7026) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the wand star in green, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 法师英雄（MageHero） · 自然 · 射手 · 史诗
> 全盛形态，在波次中存活能变得更加强大。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature mage hero (“法师英雄”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skinD #44221a #6e3a26 #9a5a3a; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; toxic #3a7a10 #6ec820 #b8f050; gold #6e4210 #b8841e #f0c040; pink #541442 #90286c #d0469e; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, long hair, a long two-shade robe with a trim band, a cape that sways behind, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to pink (#ffa2dc → #d0469e → #90286c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in pink, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 野人祭司（WildManPriest） · 自然 · 战士 · 普通
> 死亡时，留下一个弱化的自己。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature wild man priest (“野人祭司”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skinD #44221a #6e3a26 #9a5a3a; moss #263a16 #40582a #627c3e; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; toxic #3a7a10 #6ec820 #b8f050; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, wearing a tribal mask, a bare chest, belt and trousers, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 野人王（WildManKing） · 自然 · 法师 · 史诗
> 死亡时生成一个史莱姆幼体。如果进行了长时间的战斗，可以多生成一个史莱姆幼体。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature wild man king (“野人王”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skinD #44221a #6e3a26 #9a5a3a; moss #263a16 #40582a #627c3e; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; toxic #3a7a10 #6ec820 #b8f050; navy #141a3a #222e5e #364a86; leather #40220f #6a3c1e #94602e; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~38x36 logical pixels: heavy-set humanoid, long beard, wearing antlers, a bare chest, belt and trousers, a cape that sways behind, holding a heavy club.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the club overhead, the weapon tip flickers, bubbles and slow drifting clouds) -> CAST (bright burst, the circle flashes and a pillar of light rises; the summoned unit pops in, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 青龙（GreenDragon） · 自然 · 祭司 · 稀有
> 以自身的生命力为代价治疗友军。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature dragon called “green dragon” (“青龙”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): teal #0e4a48 #187e74 #36bca6; sea #0c3a5a #16688e #34a0c4; cream #8e8674 #c6bca2 #ece4cc; gold #6e4210 #b8841e #f0c040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~34x32 logical pixels: a floating eastern dragon: a long S-curved serpent body with belly plates, small clawed legs, whiskers and antler horns.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, small plus-shaped motes rise from the ground around the caster) -> CAST (bright burst, plus-shaped motes pour over the target and a soft ring rises from it, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to green (#a2e46c → #56aa3c → #2e7026) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in green, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 天龙（SkyDragon） · 自然 · 祭司 · 史诗
> 拥有着通过多年的虔诚奉献而磨练出的强大能力。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature dragon called “sky dragon” (“天龙”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): frost #2462a0 #4aa6e6 #9ee0ff; blue #18265e #2a4aa0 #4884dc; snow #6e8298 #a8bccc #dce8f0; gold #6e4210 #b8841e #f0c040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: a compact dragon hovering with an S-curved neck holding the head high, two big raised membrane wings with arm bones, a curled tail with a spade tip, back spines and horns.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, small plus-shaped motes rise from the ground around the caster) -> CAST (bright burst, plus-shaped motes pour over the target and a soft ring rises from it, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 诅咒剑士（CursedSwordsman） · 自然 · 祭司 · 稀有
> 重装型单位。间隙性散射出诅咒之剑，造成范围伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature cursed swordsman (“诅咒剑士”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skinD #44221a #6e3a26 #9a5a3a; shadow #120c1a #22182e #3a2c4c; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; toxic #3a7a10 #6ec820 #b8f050; navy #141a3a #222e5e #364a86; purple #321458 #582a92 #904ecc; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid, wearing a hood, a belted tunic, a cape that sways behind, holding a slim katana.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the katana overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, blades rain down onto the target area and stick in the ground, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to steel (#d4dbe6 → #909cb4 → #5a6680) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in steel, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 苦痛盾卫（AgonyShieldDefender） · 自然 · 祭司 · 史诗
> 猩红之刃穿透了她的身躯，带走了逃出的希望。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature agony shield defender (“苦痛盾卫”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skinD #44221a #6e3a26 #9a5a3a; moss #263a16 #40582a #627c3e; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; blood #720a14 #c01a24 #ff4a4a; navy #141a3a #222e5e #364a86; iron #26222e #3e3a48 #5e5a6a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: heavy-set humanoid, wearing a horned helmet, heavy plate armour with big pauldrons, holding a one-handed sword, a tower shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the sword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, blades rain down onto the target area and stick in the ground, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to steel (#d4dbe6 → #909cb4 → #5a6680) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in steel, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 魔王近卫（DemonKingsGuard） · 自然 · 祭司 · 史诗
> 当痛苦无法逃避，唯一的选择就是接纳它

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature demon kings guard (“魔王近卫”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skinD #44221a #6e3a26 #9a5a3a; moss #263a16 #40582a #627c3e; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; fire #c83a10 #f47a1c #ffc040; navy #141a3a #222e5e #364a86; crimson #48081e #7c1030 #b82248; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: heavy-set humanoid, wearing a horned helmet, plate armour with pauldrons and a belt, a cape that sways behind, holding a two-handed greatsword.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the greatsword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, blades rain down onto the target area and stick in the ground, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 充能塔（ChargeTower） · 自然 · 商人 · 史诗
> 无法移动。射程很远。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature crystal called “charge tower” (“充能塔”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; iron #26222e #3e3a48 #5e5a6a; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~51x48 logical pixels: a stone tower with battlements and a glowing window, topped by a floating crystal.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (the top glows, recoils and fires a bolt) -> CHARGE (rear up, head raised, the top of the tower flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the top of the tower in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 火神塔（FireGodTower） · 自然 · 商人 · 传说
> 从零重新设计过的双联装炮在保持了射速的情况下杀伤更强。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature flame called “fire god tower” (“火神塔”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; gold #6e4210 #b8841e #f0c040; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~62x59 logical pixels: a stone tower with battlements and a glowing window, topped by an eternal flame.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (the top glows, recoils and fires a bolt) -> CHARGE (rear up, head raised, the top of the tower flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the top of the tower in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 影剑士（ShadowSwordsman） · 自然 · 战士 · 史诗
> 每次攻击时有几率复制自己。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature shadow swordsman (“影剑士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; arcane #5e28a6 #9c5af0 #d4a4ff; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: slim humanoid, wearing a tribal mask, a belted tunic, a trailing scarf, holding a slim katana.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the katana overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 影骑士（ShadowKnight） · 自然 · 战士 · 传说
> 使用一柄可以斩断现实之织的巨剑

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature shadow knight (“影骑士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skinD #44221a #6e3a26 #9a5a3a; moss #263a16 #40582a #627c3e; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; arcane #5e28a6 #9c5af0 #d4a4ff; navy #141a3a #222e5e #364a86; shadow #120c1a #22182e #3a2c4c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: humanoid, wearing a great helm with an eye slit, plate armour with pauldrons and a belt, a cape that sways behind, holding a two-handed greatsword.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the greatsword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 影骑士分身（ShadowKnightReplicator） · 自然 · 战士 · 普通


```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature shadow knight replicator (“影骑士分身”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skinD #44221a #6e3a26 #9a5a3a; moss #263a16 #40582a #627c3e; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; purple #321458 #582a92 #904ecc; navy #141a3a #222e5e #364a86; shadow #120c1a #22182e #3a2c4c; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, wearing a great helm with an eye slit, plate armour with pauldrons and a belt, holding a two-handed greatsword.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the greatsword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 影剑士分身（ShadowSwordsmanReplicator） · 自然 · 战士 · 普通


```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature shadow swordsman replicator (“影剑士分身”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): void #16101f #261c34 #3c3050; shadow #120c1a #22182e #3a2c4c; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; toxic #3a7a10 #6ec820 #b8f050; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: slim humanoid, wearing a tribal mask, a belted tunic, holding a slim katana.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the katana overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 野人矛兵（WildManSpearman） · 自然 · 战士 · 普通
> 死亡后会生成一个迷你史莱姆。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature wild man spearman (“野人矛兵”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skinD #44221a #6e3a26 #9a5a3a; moss #263a16 #40582a #627c3e; green #1a4418 #2e7026 #56aa3c; wood #46291a #6e4428 #986436; toxic #3a7a10 #6ec820 #b8f050; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, wearing a tribal mask, a bare chest, belt and trousers, holding a spear.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the spear overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to green (#a2e46c → #56aa3c → #2e7026) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in green, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 巨蟹钳（Pincer） · 自然 · 先锋 · 普通
> 肉盾近战宠物。（巨蟹）

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature crab called “pincer” (“巨蟹钳”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): orange #6e2a0c #bc5416 #f08c2c; red #5c101a #9a2026 #dc4234; cream #8e8674 #c6bca2 #ece4cc; sea #0c3a5a #16688e #34a0c4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~21x20 logical pixels: a crab with a round shell, stalk eyes and snapping claws.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to sea (#8ae0f4 → #34a0c4 → #16688e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in sea, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 小螃蟹（Crabling） · 自然 · 先锋 · 普通
> 肉盾近战宠物。（小螃蟹）

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a nature crab called “crabling” (“小螃蟹”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): orange #6e2a0c #bc5416 #f08c2c; red #5c101a #9a2026 #dc4234; cream #8e8674 #c6bca2 #ece4cc; sea #0c3a5a #16688e #34a0c4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~16x15 logical pixels: a crab with a round shell, stalk eyes and snapping claws.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to sea (#8ae0f4 → #34a0c4 → #16688e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: jungle at night, deep green sky, a moon, leafy floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in sea, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

## 虚空

### 黑剑（BlackSword） · 虚空 · 祭司 · 普通
> 最好是成群结队地作战，而不是单打独斗。当多个嚎狼／阳牙攻击同一个目标时，会造成更多的伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void black sword (“黑剑”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): purple #321458 #582a92 #904ecc; void #16101f #261c34 #3c3050; arcane #5e28a6 #9c5af0 #d4a4ff; navy #141a3a #222e5e #364a86; shadow #120c1a #22182e #3a2c4c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, wearing a hood, a belted tunic, holding a two-handed greatsword.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the greatsword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 暗牙（DarkFang） · 虚空 · 祭司 · 史诗
> 它的金色皮毛标志着它是最凶猛的掠食者。当多个嚎狼／阳牙攻击同一个目标时，会造成更多的伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void wolf called “dark fang” (“暗牙”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): void #16101f #261c34 #3c3050; purple #321458 #582a92 #904ecc; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~33x31 logical pixels: a chibi wolf with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, bone spikes along the back.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 北极熊（PolarBear） · 虚空 · 战士 · 稀有
> 建造后获得额外属性，在之后的几波中慢慢失去该加成。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void bear called “polar bear” (“北极熊”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): snow #6e8298 #a8bccc #dce8f0; frost #2462a0 #4aa6e6 #9ee0ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~29x28 logical pixels: a chibi bear with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to frost (#ffffff → #9ee0ff → #4aa6e6) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in frost, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 生命树（LifeTree） · 虚空 · 祭司 · 史诗
> 为建造于其后方的单位恢复生命值。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void tree called “life tree” (“生命树”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; green #1a4418 #2e7026 #56aa3c; pink #541442 #90286c #d0469e; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~47x45 logical pixels: a living tree with a face on the trunk, a round canopy and glowing fruit.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to green (#a2e46c → #56aa3c → #2e7026) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in green, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 黑熊（BlackBear） · 虚空 · 战士 · 史诗
> 死亡时或者满能量时，对所有攻击过它的单位造成爆发伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void bear called “black bear” (“黑熊”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; leather #40220f #6a3c1e #94602e; pink #541442 #90286c #d0469e; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: a chibi bear with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, small plus-shaped motes rise from the ground around the caster) -> CAST (bright burst, a fountain of particles bursts upward and a ring expands through the allies, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to pink (#ffa2dc → #d0469e → #90286c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in pink, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 地主（Landlord） · 虚空 · 商人 · 稀有
> 每波存活后都会获得越来越多的额外积分，但若它死亡，奖励会大幅度下降。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void landlord (“地主”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): purple #321458 #582a92 #904ecc; crimson #48081e #7c1030 #b82248; void #16101f #261c34 #3c3050; gold #6e4210 #b8841e #f0c040; shadow #120c1a #22182e #3a2c4c; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: heavy-set humanoid, short beard, wearing a top hat, a long coat with a centre seam, holding a coin bag.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the hand, strike forward, pull back) -> CHARGE (raise the bag overhead, the coin bag flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the coin bag in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 金手（GoldenHand） · 虚空 · 商人 · 史诗
> 凭借大胆的新投资策略，它有着更大的盈利。。。和亏损潜力。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void golden hand (“金手”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): purple #321458 #582a92 #904ecc; gold #6e4210 #b8841e #f0c040; void #16101f #261c34 #3c3050; cream #8e8674 #c6bca2 #ece4cc; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, wearing a top hat, a long coat with a centre seam, holding a floating orb above the hand.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the hand, strike forward, pull back) -> CHARGE (raise the orb overhead, the orb flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the orb in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 维京海盗（VikingPirate） · 虚空 · 商人 · 普通
> 拥有秘密贮藏，可以以更高的百分比价格出售。属性更低。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void viking pirate (“维京海盗”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): purple #321458 #582a92 #904ecc; navy #141a3a #222e5e #364a86; void #16101f #261c34 #3c3050; red #5c101a #9a2026 #dc4234; orange #6e2a0c #bc5416 #f08c2c; steel #323a4e #5a6680 #909cb4; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, a braided viking beard, wearing a bandana with trailing tails, a belted tunic, holding a one-handed sword.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the sword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 暗影死神（ShadowGrimReaper） · 虚空 · 战士 · 史诗
> 不再拥有秘密贮藏，但是其属性大幅提升。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void shadow grim reaper (“暗影死神”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): purple #321458 #582a92 #904ecc; void #16101f #261c34 #3c3050; arcane #5e28a6 #9c5af0 #d4a4ff; navy #141a3a #222e5e #364a86; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid with a hollow face with two glowing eyes, wearing a hood, a long two-shade robe with a trim band, no legs — the body tapers into floating wisps, holding a long scythe.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, hover height, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the scythe overhead, the scythe blade flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the scythe blade in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 蟹术士（CrabWarlock） · 虚空 · 法师 · 稀有
> 召唤一只小螃蟹来做它的脏活。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void crab called “crab warlock” (“蟹术士”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): orange #6e2a0c #bc5416 #f08c2c; crimson #48081e #7c1030 #b82248; cream #8e8674 #c6bca2 #ece4cc; red #5c101a #9a2026 #dc4234; purple #321458 #582a92 #904ecc; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~26x24 logical pixels: a crab with a round shell, stalk eyes and snapping claws, wearing a wizard hat.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, a particle circle draws itself on the ground and a pillar of light rises from it) -> CAST (bright burst, the circle flashes and a pillar of light rises; the summoned unit pops in, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to sea (#8ae0f4 → #34a0c4 → #16688e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in sea, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 蟹巫（Crabomancer） · 虚空 · 法师 · 传说
> 现在召唤一只致命的蟹钳来战斗。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void crab called “crabomancer” (“蟹巫”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): pink #541442 #90286c #d0469e; purple #321458 #582a92 #904ecc; cream #8e8674 #c6bca2 #ece4cc; navy #141a3a #222e5e #364a86; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~36x35 logical pixels: a crab with a round shell, stalk eyes and snapping claws, wearing a wizard hat.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, a particle circle draws itself on the ground and a pillar of light rises from it) -> CAST (bright burst, the circle flashes and a pillar of light rises; the summoned unit pops in, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to sea (#8ae0f4 → #34a0c4 → #16688e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in sea, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 脉冲机器人（Pulsebot） · 虚空 · 祭司 · 史诗
> 每次攻击都会释放一道冲击波，造成额外的范围伤害，并对敌方防御施加减益效果。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void bot called “pulsebot” (“脉冲机器人”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; steel #323a4e #5a6680 #909cb4; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~28x26 logical pixels: a floating round robot with a glowing visor, an antenna and thruster flames.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, embers rise from the feet and flicker) -> CAST (bright burst, a flat ring of particles expands outward along the floor, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 天空机器人（Skybot） · 虚空 · 祭司 · 传说
> 飞行单位。专为战斗而设计，其力量的增长与其升级后AI的凶猛程度相匹配。现在施加3层减益效果。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void bot called “skybot” (“天空机器人”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; snow #6e8298 #a8bccc #dce8f0; frost #2462a0 #4aa6e6 #9ee0ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~36x35 logical pixels: a floating round robot with a glowing visor, an antenna and thruster flames, small metal wings.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, embers rise from the feet and flicker) -> CAST (bright burst, a flat ring of particles expands outward along the floor, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 哥布林直升机（GoblinCopter） · 虚空 · 商人 · 普通
> 飞行单位。用双联炮攻击敌人。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void copter called “goblin copter” (“哥布林直升机”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; moss #263a16 #40582a #627c3e; orc #244a1e #3e722c #68a242; teal #0e4a48 #187e74 #36bca6; orange #6e2a0c #bc5416 #f08c2c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~22x21 logical pixels: a small helicopter with a glass cockpit, a spinning rotor and a gun, a goblin pilot inside.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 旋翼机（Whirlybird） · 虚空 · 射手 · 稀有
> 飞行单位。抛弃了它那无力的双联炮，换上了一门巨大的火箭发射器。每隔几次攻击就造成额外伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void copter called “whirlybird” (“旋翼机”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; navy #141a3a #222e5e #364a86; frost #2462a0 #4aa6e6 #9ee0ff; orange #6e2a0c #bc5416 #f08c2c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: a small helicopter with a glass cockpit, a spinning rotor and a gun.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, embers rise from the feet and flicker) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 曲速之翼（WarpWing） · 虚空 · 祭司 · 稀有
> 飞行单位。降低其目标的攻击伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void warp called “warp wing” (“曲速之翼”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; purple #321458 #582a92 #904ecc; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~26x24 logical pixels: an arrow-shaped warp craft with engine flames.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 虚空魔鬼鱼（VoidManta） · 虚空 · 祭司 · 传说
> 现在每次弹射都会施加多层等离子衰减。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void manta called “void manta” (“虚空魔鬼鱼”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): void #16101f #261c34 #3c3050; purple #321458 #582a92 #904ecc; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: a flying manta ray with undulating wing edges.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 歼灭者（Annihilator） · 虚空 · 法师 · 史诗
> 维克特拉的独特单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void mechwalker called “annihilator” (“歼灭者”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; iron #26222e #3e3a48 #5e5a6a; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~32x30 logical pixels: a two-legged war machine with a laser gun body.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, embers rise from the feet and flicker) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 巨型歼灭者（GigaAnnihilator） · 虚空 · 法师 · 传说
> 维克特拉的独特单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void mechwalker called “giga annihilator” (“巨型歼灭者”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; steel #323a4e #5a6680 #909cb4; fire #c83a10 #f47a1c #ffc040; red #5c101a #9a2026 #dc4234; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: a two-legged war machine with a heavy cannon body.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, embers rise from the feet and flicker) -> CAST (bright burst, a straight beam shoots to the target and splashes, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 爬行投石车（CrawlingCatapult） · 虚空 · 射手 · 史诗
> 移动极其缓慢。目标越远，造成的伤害就越高。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void catapult called “crawling catapult” (“爬行投石车”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; iron #26222e #3e3a48 #5e5a6a; orange #6e2a0c #bc5416 #f08c2c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: a catapult that walks on wooden legs.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 流浪投石机（WanderingTrebuchet） · 虚空 · 射手 · 传说
> 不知何故，它越是吱吱作响、摇摇欲坠，就越是强大。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a void trebuchet called “wandering trebuchet” (“流浪投石机”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; iron #26222e #3e3a48 #5e5a6a; orange #6e2a0c #bc5416 #f08c2c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~47x45 logical pixels: a trebuchet that walks on wooden legs.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: void rift, violet-black sky with twinkling purple stars, crystal floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

## 混沌

### 混沌屠夫（ChaosButcher） · 混沌 · — · 传说
> 能死后复生的恶魔领主。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos chaos butcher (“混沌屠夫”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; red #5c101a #9a2026 #dc4234; blood #720a14 #c01a24 #ff4a4a; navy #141a3a #222e5e #364a86; iron #26222e #3e3a48 #5e5a6a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~47x45 logical pixels: hulking giant humanoid, wearing a tribal mask, a bare chest, belt and trousers, holding an axe.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (wind the weapon back overhead, swing it down across the body, follow through low) -> CHARGE (raise the axe overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 邪鼠（EvilRat） · 混沌 · — · 普通
> 使用棍子敲击敌人的牙种生物。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos rat called “evil rat” (“邪鼠”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): purple #321458 #582a92 #904ecc; void #16101f #261c34 #3c3050; pink #541442 #90286c #d0469e; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~18x17 logical pixels: a chibi rat with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 蛛母（MotherSpider） · 混沌 · — · 普通
> 在下水道中适应出魔法抗性的单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos spider called “mother spider” (“蛛母”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; cream #8e8674 #c6bca2 #ece4cc; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~26x24 logical pixels: a spider with a round abdomen, eight jointed legs and a cluster of glowing eyes.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 翠蠕虫王（VerdantWormKing） · 混沌 · — · 稀有
> 迷你首领单位。一只巨大的赤蝎。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos worm called “verdant worm king” (“翠蠕虫王”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): green #1a4418 #2e7026 #56aa3c; moss #263a16 #40582a #627c3e; cream #8e8674 #c6bca2 #ece4cc; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~28x26 logical pixels: a segmented worm that humps along, wearing a crown.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 翠蠕虫统领（VerdantWormCommander） · 混沌 · — · 普通
> 使用尖锐的尾刺刺穿敌人。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos worm called “verdant worm commander” (“翠蠕虫统领”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): green #1a4418 #2e7026 #56aa3c; toxic #3a7a10 #6ec820 #b8f050; cream #8e8674 #c6bca2 #ece4cc; bone #56503e #948a70 #cfc4a2; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~22x21 logical pixels: a segmented worm that humps along with sickle blades.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 混沌鼠（ChaosRat） · 混沌 · — · 普通
> 数量较少的强力单位。攻击能暴击。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos rat called “chaos rat” (“混沌鼠”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): red #5c101a #9a2026 #dc4234; shadow #120c1a #22182e #3a2c4c; pink #541442 #90286c #d0469e; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~20x18 logical pixels: a chibi rat with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, bone spikes along the back.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 混沌豪猪（ChaosPorcupine） · 混沌 · — · 稀有
> 远程单位。从背后射出针毛。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos mole called “chaos porcupine” (“混沌豪猪”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): leather #40220f #6a3c1e #94602e; shadow #120c1a #22182e #3a2c4c; cream #8e8674 #c6bca2 #ece4cc; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~26x24 logical pixels: a round mole with digging claws covered in quills.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 铁地龙（EarthDragonIron） · 混沌 · — · 史诗
> 短程单位。从腔处射出魔法墨汁。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos dragon called “earth dragon iron” (“铁地龙”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): iron #26222e #3e3a48 #5e5a6a; steel #323a4e #5a6680 #909cb4; orange #6e2a0c #bc5416 #f08c2c; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~38x36 logical pixels: a compact dragon standing on four legs with an S-curved neck holding the head high, no wings, a curled tail with a spade tip, back spines and horns.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 暗邪眼（EvilEyeDark） · 混沌 · — · 史诗
> 飞行单位。龙之血脉使其拥有魔法抗性。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos eye called “evil eye dark” (“暗邪眼”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): shadow #120c1a #22182e #3a2c4c; void #16101f #261c34 #3c3050; cream #8e8674 #c6bca2 #ece4cc; arcane #5e28a6 #9c5af0 #d4a4ff; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~28x26 logical pixels: a floating eyeball with tentacles.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the iris flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to arcane (#ffffff → #d4a4ff → #9c5af0) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the iris in arcane, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 混沌恐狼（ChaosDireWolf） · 混沌 · — · 稀有
> 拥有利爪的高伤害单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos wolf called “chaos dire wolf” (“混沌恐狼”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): shadow #120c1a #22182e #3a2c4c; crimson #48081e #7c1030 #b82248; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~28x26 logical pixels: a chibi wolf with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, bone spikes along the back.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 邪眼王尼克松（EvilEyeKingNixon） · 混沌 · — · 传说
> 强大的首领单位。击杀单位时恢复生命值并提升伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos eye called “evil eye king nixon” (“邪眼王尼克松”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; cream #8e8674 #c6bca2 #ece4cc; holy #a88220 #f0cc40 #fff098; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~47x45 logical pixels: a floating eyeball with tentacles and bat wings, wearing a crown.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the iris flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the iris in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 豹帝萨瓦隆（LeopardEmperorSavalon） · 混沌 · — · 传说
> 使用鱼篓比大部分人用剑更加娴熟。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos leopard called “leopard emperor savalon” (“豹帝萨瓦隆”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): gold #6e4210 #b8841e #f0c040; wood #46291a #6e4428 #986436; cream #8e8674 #c6bca2 #ece4cc; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: a chibi leopard with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, spots, a small gold crown.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 混沌卫黑卡托斯（ChaosGuardBlackKatos） · 混沌 · — · 传说
> 最终首领。率领着一群军团领主。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos chaos guard black katos (“混沌卫黑卡托斯”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; red #5c101a #9a2026 #dc4234; blood #720a14 #c01a24 #ff4a4a; navy #141a3a #222e5e #364a86; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~50x47 logical pixels: hulking giant humanoid, wearing a horned helmet, heavy plate armour with big pauldrons, a cape that sways behind, holding a two-handed greatsword.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the greatsword overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 混沌邪猪（ChaosEvilPig） · 混沌 · — · 普通
> 中程单位。通过喷射魔法毒素攻击。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos pig called “chaos evil pig” (“混沌邪猪”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; pink #541442 #90286c #d0469e; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~21x20 logical pixels: a chibi pig with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, bone spikes along the back.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 混沌恐熊（ChaosDireBear） · 混沌 · — · 史诗
> 拥有魔法抗性外壳的蛞蝓。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos bear called “chaos dire bear” (“混沌恐熊”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): shadow #120c1a #22182e #3a2c4c; crimson #48081e #7c1030 #b82248; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: a chibi bear with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, bone spikes along the back.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 翠蠕虫兵（VerdantWormSoldier） · 混沌 · — · 普通
> 拥有蜂拥式攻击的习性。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos worm called “verdant worm soldier” (“翠蠕虫兵”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): green #1a4418 #2e7026 #56aa3c; moss #263a16 #40582a #627c3e; cream #8e8674 #c6bca2 #ece4cc; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~20x18 logical pixels: a segmented worm that humps along.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 蛛皇阿纳佐斯（SpiderEmperorAnazos） · 混沌 · — · 传说
> 首领单位。使用头刺穿透敌人。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos spider called “spider emperor anazos” (“蛛皇阿纳佐斯”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): void #16101f #261c34 #3c3050; purple #321458 #582a92 #904ecc; cream #8e8674 #c6bca2 #ece4cc; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: a spider with a round abdomen, eight jointed legs and a cluster of glowing eyes, wearing a crown.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 地龙王加贡（EarthDragonKingGargon） · 混沌 · — · 传说
> 迷你首领单位。一只赤色巨型四爪章鱼。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos dragon called “earth dragon king gargon” (“地龙王加贡”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): leather #40220f #6a3c1e #94602e; iron #26222e #3e3a48 #5e5a6a; wood #46291a #6e4428 #986436; gold #6e4210 #b8841e #f0c040; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~51x48 logical pixels: a compact dragon standing on four legs with an S-curved neck holding the head high, no wings, a curled tail with a spade tip, back spines and horns.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 赤邪眼（EvilEyeRed） · 混沌 · — · 普通
> 飞行单位。虽然爪子不是很尖利，但是被抓了还了还是很疼。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos eye called “evil eye red” (“赤邪眼”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): red #5c101a #9a2026 #dc4234; crimson #48081e #7c1030 #b82248; cream #8e8674 #c6bca2 #ece4cc; holy #a88220 #f0cc40 #fff098; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~20x18 logical pixels: a floating eyeball with tentacles.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the iris flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the iris in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 混沌士兵（ChaosSoldier） · 混沌 · — · 史诗
> 数量稀少但是十分强力的单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos chaos soldier (“混沌士兵”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; red #5c101a #9a2026 #dc4234; blood #720a14 #c01a24 #ff4a4a; navy #141a3a #222e5e #364a86; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, wearing a horned helmet, plate armour with pauldrons and a belt, holding a spear, a round shield on the off arm.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the spear overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 刻耳柏洛斯（Cerberus） · 混沌 · — · 传说
> 中程单位。拥有能穿透护甲的毒液。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos cerberus called “cerberus” (“刻耳柏洛斯”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): iron #26222e #3e3a48 #5e5a6a; shadow #120c1a #22182e #3a2c4c; crimson #48081e #7c1030 #b82248; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~44x41 logical pixels: a chibi cerberus with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, a mane of flickering fire, three heads.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 腐尸鼠（DecayingCorpseRat） · 混沌 · — · 普通
> 壳不是很硬，爪子也不太锋利。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos rat called “decaying corpse rat” (“腐尸鼠”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): zombie #34401e #56683a #849a5a; moss #263a16 #40582a #627c3e; pink #541442 #90286c #d0469e; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~18x17 logical pixels: a chibi rat with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 腐烂鼠王（DecayingChampionRat） · 混沌 · — · 史诗
> 高伤害单位。以群集作战著称。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos rat called “decaying champion rat” (“腐烂鼠王”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): zombie #34401e #56683a #849a5a; moss #263a16 #40582a #627c3e; pink #541442 #90286c #d0469e; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: a chibi rat with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears, bone spikes along the back, a small gold crown.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 混沌邪犬（ChaosEvilDog） · 混沌 · — · 普通
> 它们的外骨骼使拥有远程攻击抗性。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos dog called “chaos evil dog” (“混沌邪犬”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; fire #c83a10 #f47a1c #ffc040; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~21x20 logical pixels: a chibi dog with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 小蜘蛛（Spiderling） · 混沌 · 战士 · 普通
> 迷你版的污泥，在污泥死后生成。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a chaos spider called “spiderling” (“小蜘蛛”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): crimson #48081e #7c1030 #b82248; shadow #120c1a #22182e #3a2c4c; cream #8e8674 #c6bca2 #ece4cc; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~16x15 logical pixels: a spider with a round abdomen, eight jointed legs and a cluster of glowing eyes.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: burning battlefield, blood-red sky, ash flakes, scorched floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

## 野兽

### 克拉肯（Kraken） · 野兽 · — · 传说
> 肉盾。首领单位。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast kraken called “kraken” (“克拉肯”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): sea #0c3a5a #16688e #34a0c4; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~54x52 logical pixels: a kraken head with six curling tentacles.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to sea (#8ae0f4 → #34a0c4 → #16688e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in sea, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 针刺者（Needler） · 野兽 · — · 史诗
> 首屈一指的远程DPS雇佣兵。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast mole called “needler” (“针刺者”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): moss #263a16 #40582a #627c3e; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; bone #56503e #948a70 #cfc4a2; orange #6e2a0c #bc5416 #f08c2c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~28x26 logical pixels: a round mole with digging claws covered in quills.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, a fountain of particles bursts upward and a ring expands through the allies, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 攻城锤（SiegeRam） · 野兽 · — · 史诗
> 受到的远程单位伤害减少。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast ram called “siege ram” (“攻城锤”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; iron #26222e #3e3a48 #5e5a6a; orange #6e2a0c #bc5416 #f08c2c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: a covered battering ram on wheels.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 萨满（Shaman） · 野兽 · — · 史诗
> 提升一个盟友单位的攻击速度。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast shaman (“萨满”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; moss #263a16 #40582a #627c3e; orange #6e2a0c #bc5416 #f08c2c; red #5c101a #9a2026 #dc4234; steel #323a4e #5a6680 #909cb4; gold #6e4210 #b8841e #f0c040; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, long hair, wearing a feathered headband, a long two-shade robe with a trim band, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, dark wisps and magic sparks curl inward) -> CAST (bright burst, a fountain of particles bursts upward and a ring expands through the allies, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 半人马（Centaur） · 野兽 · — · 史诗
> 高伤害输出者。劈砍最多$1个敌人。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast centaur called “centaur” (“半人马”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; moss #263a16 #40582a #627c3e; orange #6e2a0c #bc5416 #f08c2c; steel #323a4e #5a6680 #909cb4; cream #8e8674 #c6bca2 #ece4cc; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~41x39 logical pixels: a centaur: a horse body with a bare-chested humanoid torso, holding axe.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 幽灵骑士（GhostKnight） · 野兽 · — · 史诗
> 受到的所有自动攻击（非技能伤害）伤害减少。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast centaur called “ghost knight” (“幽灵骑士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; moss #263a16 #40582a #627c3e; orange #6e2a0c #bc5416 #f08c2c; navy #141a3a #222e5e #364a86; pale #2e3e56 #56708c #8ea8c0; void #16101f #261c34 #3c3050; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~41x39 logical pixels: a centaur: a horse body with a armoured humanoid torso wearing greathelm, holding lance.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 四眼（FourEyes） · 野兽 · — · 史诗
> 攻击同一目标的次数越多，造成的伤害就越高。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast four eyes (“四眼”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; void #16101f #261c34 #3c3050; moss #263a16 #40582a #627c3e; leather #40220f #6a3c1e #94602e; orange #6e2a0c #bc5416 #f08c2c; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; blood #720a14 #c01a24 #ff4a4a; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, wearing a hood, a long two-shade robe with a trim band, holding a floating orb above the hand.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the hand, strike forward, pull back) -> CHARGE (raise the orb overhead, the orb flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to blood (#ffc0b0 → #ff4a4a → #c01a24) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the orb in blood, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 女巫（Witch） · 野兽 · — · 史诗
> 召唤源源不断的蛙人。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast witch (“女巫”) casting its skill, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): orc #244a1e #3e722c #68a242; purple #321458 #582a92 #904ecc; moss #263a16 #40582a #627c3e; leather #40220f #6a3c1e #94602e; orange #6e2a0c #bc5416 #f08c2c; red #5c101a #9a2026 #dc4234; shadow #120c1a #22182e #3a2c4c; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: humanoid, long hair, wearing a wide-brim witch hat, a flared dress, holding a staff with a gem at the tip.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the staff overhead, the gem at the tip of the staff flickers, a particle circle draws itself on the ground and a pillar of light rises from it) -> CAST (bright burst, the circle flashes and a pillar of light rises; the summoned unit pops in, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the gem at the tip of the staff in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 食人魔（OgreEnemy） · 野兽 · — · 史诗
> 挥舞着巨大的棍棒来敲打敌人。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast ogre enemy (“食人魔”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): orange #6e2a0c #bc5416 #f08c2c; leather #40220f #6a3c1e #94602e; moss #263a16 #40582a #627c3e; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~40x38 logical pixels: hulking giant humanoid, a bare chest, belt and trousers, holding a heavy club.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the club overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 蜜熊（HoneyBear） · 野兽 · — · 史诗
> 死亡时治疗附近的盟友。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast bear called “honey bear” (“蜜熊”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): orange #6e2a0c #bc5416 #f08c2c; wood #46291a #6e4428 #986436; gold #6e4210 #b8841e #f0c040; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~33x31 logical pixels: a chibi bear with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 头狼（PackLeader） · 野兽 · — · 史诗
> 战鼓被动地提升盟友的伤害，但会降低其防御。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast wolf called “pack leader” (“头狼”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): iron #26222e #3e3a48 #5e5a6a; shadow #120c1a #22182e #3a2c4c; snow #6e8298 #a8bccc #dce8f0; orange #6e2a0c #bc5416 #f08c2c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~35x33 logical pixels: a chibi wolf with a short deep body (chest bigger than the hips), a big head held highest, thick legs and pointed ears.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 宝箱怪（Mimic） · 野兽 · — · 史诗
> 造成高额伤害并在击杀时获得积分。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast mimic called “mimic” (“宝箱怪”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; wood #46291a #6e4428 #986436; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~32x30 logical pixels: a treasure chest monster with a toothy lid, a tongue and little legs.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 安全鼹鼠（SafetyMole） · 野兽 · — · 稀有
> 安全第一！被动地减少附近盟友受到的伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast mole called “safety mole” (“安全鼹鼠”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): leather #40220f #6a3c1e #94602e; wood #46291a #6e4428 #986436; cream #8e8674 #c6bca2 #ece4cc; gold #6e4210 #b8841e #f0c040; bone #56503e #948a70 #cfc4a2; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~23x22 logical pixels: a round mole with digging claws and a hard hat.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 幼龙（Drake） · 野兽 · — · 稀有
> 虽然年轻，但其炽热的呼吸造成高额伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast dragon called “drake” (“幼龙”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): orange #6e2a0c #bc5416 #f08c2c; red #5c101a #9a2026 #dc4234; cream #8e8674 #c6bca2 #ece4cc; bone #56503e #948a70 #cfc4a2; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: a compact dragon hovering with an S-curved neck holding the head high, two big raised membrane wings with arm bones, a curled tail with a spade tip, back spines and horns.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 小鬼（Imp） · 野兽 · — · 稀有
> 派遣时额外召唤一个小鬼。造成高额伤害。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast imp (“小鬼”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): red #5c101a #9a2026 #dc4234; leather #40220f #6a3c1e #94602e; moss #263a16 #40582a #627c3e; orange #6e2a0c #bc5416 #f08c2c; navy #141a3a #222e5e #364a86; crimson #48081e #7c1030 #b82248; steel #323a4e #5a6680 #909cb4; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~23x22 logical pixels: short, stocky humanoid with a demon face with fangs, wearing curved demon horns, a belted tunic, bat wings, a demon tail, holding a gold trident.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the trident overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 炮手（Cannoneer） · 野兽 · — · 稀有
> 她的远程大炮威力十足。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast cannoneer (“炮手”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; navy #141a3a #222e5e #364a86; moss #263a16 #40582a #627c3e; leather #40220f #6a3c1e #94602e; orange #6e2a0c #bc5416 #f08c2c; red #5c101a #9a2026 #dc4234; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~30x29 logical pixels: humanoid, short beard, wearing a cap, a belted tunic, holding a shoulder cannon.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (aim, fire with a 2-pixel muzzle flash and recoil, settle) -> CHARGE (raise the cannon overhead, the muzzle flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the muzzle in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 隐士（Hermit） · 野兽 · — · 普通
> 奇怪的种子被动地治疗盟友。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast hermit (“隐士”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; moss #263a16 #40582a #627c3e; leather #40220f #6a3c1e #94602e; orange #6e2a0c #bc5416 #f08c2c; snow #6e8298 #a8bccc #dce8f0; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid, long beard, wearing a hood, a long two-shade robe with a trim band, holding a burning torch.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the staff, thrust it forward so the gem flares) -> CHARGE (raise the torch overhead, the torch flame flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to holy (#ffffff → #fff098 → #f0cc40) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the torch flame in holy, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 恐龙（Dino） · 野兽 · — · 普通
> 不太聪明，但非常肉。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast dino called “dino” (“恐龙”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): green #1a4418 #2e7026 #56aa3c; moss #263a16 #40582a #627c3e; cream #8e8674 #c6bca2 #ece4cc; bone #56503e #948a70 #cfc4a2; orange #6e2a0c #bc5416 #f08c2c; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: an upright dinosaur with a big toothy head and tiny arms.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 恶鬼（Fiend） · 野兽 · — · 普通
> 尽管四肢纤细，但很肉。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast fiend (“恶鬼”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): crimson #48081e #7c1030 #b82248; leather #40220f #6a3c1e #94602e; moss #263a16 #40582a #627c3e; shadow #120c1a #22182e #3a2c4c; orange #6e2a0c #bc5416 #f08c2c; navy #141a3a #222e5e #364a86; steel #323a4e #5a6680 #909cb4; fire #c83a10 #f47a1c #ffc040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: heavy-set humanoid with a demon face with fangs, wearing curved demon horns, a bare chest, belt and trousers, a demon tail, holding claws.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (raise the hand, strike forward, pull back) -> CHARGE (raise the claws overhead, the claw tips flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to fire (#fff6b0 → #ffc040 → #f47a1c) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the claw tips in fire, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 蛮兵（Brute） · 野兽 · — · 普通
> 重击敌人，减慢其攻击速度。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast brute (“蛮兵”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): skinD #44221a #6e3a26 #9a5a3a; leather #40220f #6a3c1e #94602e; moss #263a16 #40582a #627c3e; orange #6e2a0c #bc5416 #f08c2c; red #5c101a #9a2026 #dc4234; steel #323a4e #5a6680 #909cb4; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~29x28 logical pixels: hulking giant humanoid, mohawk hair, a bare chest, belt and trousers, holding a war hammer.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (heave the heavy weapon far back, smash it down with the body leaning in) -> CHARGE (raise the hammer overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to orange (#ffcc68 → #f08c2c → #bc5416) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in orange, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 机器人（Robo） · 野兽 · — · 普通
> 远程。从远处挥舞着迷你火焰喷射器。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast robo (“机器人”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): wood #46291a #6e4428 #986436; leather #40220f #6a3c1e #94602e; moss #263a16 #40582a #627c3e; iron #26222e #3e3a48 #5e5a6a; orange #6e2a0c #bc5416 #f08c2c; steel #323a4e #5a6680 #909cb4; red #5c101a #9a2026 #dc4234; teal #0e4a48 #187e74 #36bca6; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid with a boxy robot head with a glowing visor, plate armour with pauldrons and a belt, holding a pistol.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (aim, fire with a 2-pixel muzzle flash and recoil, settle) -> CHARGE (raise the gun overhead, the muzzle flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the muzzle in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 蜥蜴人（LizardEnemy） · 野兽 · — · 普通
> 远程。从远处向敌人投掷长矛。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast lizard enemy (“蜥蜴人”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): green #1a4418 #2e7026 #56aa3c; leather #40220f #6a3c1e #94602e; moss #263a16 #40582a #627c3e; orange #6e2a0c #bc5416 #f08c2c; steel #323a4e #5a6680 #909cb4; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: humanoid with a scaly lizard head with a snout, an open vest over bare skin, a lizard tail, holding a spear.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the spear overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 龙龟（DragonTurtle） · 野兽 · — · 普通
> 坚硬的外壳使它成为一个很好的肉盾。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast turtle called “dragon turtle” (“龙龟”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): teal #0e4a48 #187e74 #36bca6; sea #0c3a5a #16688e #34a0c4; cream #8e8674 #c6bca2 #ece4cc; moss #263a16 #40582a #627c3e; gold #6e4210 #b8841e #f0c040; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~24x23 logical pixels: a turtle with a domed shell, dragon horns and back spines.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to sea (#8ae0f4 → #34a0c4 → #16688e) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in sea, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 蜗牛（Snail） · 野兽 · — · 普通
> 弱。主要用作收入来源。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast snail called “snail” (“蜗牛”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): pink #541442 #90286c #d0469e; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; orange #6e2a0c #bc5416 #f08c2c; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~20x18 logical pixels: a snail with a spiral shell and eye stalks.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 巨蜗（GiantSnail） · 野兽 · — · 普通
> 近战肉盾（使用军团法术“巨型蜗牛”时可用）。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast snail called “giant snail” (“巨蜗”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): moss #263a16 #40582a #627c3e; leather #40220f #6a3c1e #94602e; cream #8e8674 #c6bca2 #ece4cc; wood #46291a #6e4428 #986436; bone #56503e #948a70 #cfc4a2; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~26x24 logical pixels: a snail with a spiral shell and eye stalks, the shell ringed with spikes.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 蛙人（Froggo） · 野兽 · 射手 · 普通
> 高伤害远程宠物。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast froggo (“蛙人”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): green #1a4418 #2e7026 #56aa3c; leather #40220f #6a3c1e #94602e; moss #263a16 #40582a #627c3e; orange #6e2a0c #bc5416 #f08c2c; steel #323a4e #5a6680 #909cb4; toxic #3a7a10 #6ec820 #b8f050; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~27x25 logical pixels: short, stocky humanoid with a wide frog head with bulging eyes, an open vest over bare skin, holding a spear.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (arm angle, weapon angle, lean, head tilt, leg stride, cloth sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (pull the shaft back, thrust it straight forward, recoil) -> CHARGE (raise the spear overhead, the weapon tip flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to toxic (#f4ffc0 → #b8f050 → #6ec820) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the weapon tip in toxic, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

### 舞蛇（DancingSnake） · 野兽 · 战士 · 普通
> 由巫毒神父召唤。

```text
Create a single self-contained HTML file that renders an animated pixel art sprite of a beast snake called “dancing snake” (“舞蛇”) fighting, using vanilla JavaScript and Canvas 2D. No external assets, libraries, or network requests.

RENDERING
- Draw everything to an offscreen canvas at a fixed logical resolution of 128x96, then blit to a fullscreen display canvas scaled by the largest integer factor that fits the window, centered, with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
- All drawing snaps to integer coordinates on the logical canvas. No sub-pixel positions, anti-aliasing, gradients, or shadowBlur.
- Fixed palette of ~24 hex colors built from these ramps (shadow / base / light): teal #0e4a48 #187e74 #36bca6; gold #6e4210 #b8841e #f0c040; cream #8e8674 #c6bca2 #ece4cc; holy #a88220 #f0cc40 #fff098; ink #150d1e #21172c #2e223c. Every pixel comes from this palette.

CHARACTER
- Build the character procedurally from filled rects and pixel runs, ~22x21 logical pixels: a coiled snake with a raised hooded head.
- Every part is two-shade (base + shadow on the lower-right edge, a light edge on the upper-left, a highlight on metal and gems) inside a darker selective outline.
- Parameterize the pose (body bob, head raise, jaw open, leg stride, tail / wing sway). Animate parameters smoothly, then quantize to the pixel grid each frame so motion reads at an 8-12 fps pixel animation feel even though the loop runs at 60fps.

ANIMATION
- Looping state machine: IDLE (2-frame bob, cloth / tail sway) -> WALK (4-frame stride) -> ATTACK (crouch, lunge forward with the jaw / claws open, then settle back) -> CHARGE (rear up, head raised, the mouth flickers, sparks spiral inward to the focus point) -> CAST (bright burst, the gathered sparks explode outward in a ring and a bolt flies across the scene, 1-2 pixel screen shake) -> RECOVER (settle back) -> HURT (1-frame recoil with a white flash). Ease pose parameters between keyframes.
- Pooled allocation-free particle system: preallocate and reuse. Particles step their palette index from white to teal (#98f6e0 → #36bca6 → #187e74) to dark before despawn. Snap particle positions to the grid when drawing.
- Fixed 60hz timestep update with rAF rendering. Zero object allocation inside the loop.

SCENE
- Minimal background: wild plains at night, dark sky, a big moon, grass floor line. Character silhouette must read clearly.
- Subtle 1px rim light on the character from the mouth in teal, brightening during CHARGE and CAST.

QUALITY BAR
- Crisp pixels at any window size, seamless loop, stable 60fps, readable silhouette. Should look like a polished 16-bit sprite animation, not vector shapes scaled down.
```

