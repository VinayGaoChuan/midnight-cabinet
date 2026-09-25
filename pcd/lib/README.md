# 像素人物共享引擎

全部角色共用一份引擎（`pcd.js`）和一份部件库（`parts.js`）；每个角色是 `pcd/chars/<key>.js` 里的一个模块。查看：`pcd/view.html?c=<key>`（按 1–6 播放六个状态，T 看动作表）。自检脚本、查重脚本直接对这个网址用。

范式角色是 `chars/star-wizard.js`，新角色从复制它开始。

## 模块写法

```js
PCD.define('Paladin', (E) => {
  const { defMat, Sprite, begin, part, sp, run, rect, line, brush, ellipse, bake, ease, clamp01, keys, mix, FXI, FXR,
          HY, DUMMY_X, INCOMING, ASTEP, IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR,
          spawn, burst, releaseOrbit, fall, shoot, ring, shake, flash, fx, death, hitDummy, put, blitShape, copySprite, scrX,
          floorGlow, shotFloorGlow, parts } = E;
  // 材质、缓冲、姿势、poseAt、drawHero、bakeHero、特效……
  return { name: '圣骑士', HX: 76, R_EL: FXI.holy, DUR, hero, P, GLOW_MATS, HIT_POINT, EVENTS, deathKit,
           poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot };
});
```

必须返回：`name`、`hero`（Sprite）、`P`（姿势对象，至少含 `gx gy mx flip k1 k2`）、`poseAt(state, t, T)`、`drawHero()`、`bakeHero()`。其余可选。

| 返回项 | 作用 |
|---|---|
| `HX` | 站位（远程 34；近战 76–80） |
| `R_EL` | 本角色元素色阶下标（`FXI.holy` 等），弹道默认拖尾、复活收尾用它 |
| `DUR` | 各状态时长，默认 `DEFAULT_DUR`（待机 2.4、移动 1.6、攻击 0.75、蓄力 1.4、施放 0.5、收招 0.7、受击 0.8、死亡 2.9、复活 1.0） |
| `GLOW_MATS` / `HIT_POINT` | 发光体材质（HD-2D 发光遮罩）/ 受击点（本地坐标） |
| `EVENTS` | 按状态下标的时间点数组，到点调用 `onTime(state, t)` |
| `deathKit` | 用死亡套件时写 `{ mode, at }`，只做记录（导出、动作表说明）；真正触发在 `onTime` 里调用 `death.start` |
| `onEnter(s)` | 进入状态时（技能的施放通常在 `s === CAST`） |
| `impactOn(k, x, y)` | 自己的弹道到达目标时（k < 3） |
| `stepFX(dt, state, stT)` | 每个 1/60 秒：生成本角色的粒子（蓄力汇聚、余烬、脚步尘……） |
| `fxReset()` | 跳帧前清零本角色的特效状态变量 |
| `fxBack` / `fxMid` / `fxFront(f12)` | 画在角色后面 / 假人与角色之间 / 角色前面 |
| `drawShot(k, x, y, d, f12, R)` | 自己的弹道外形，返回 true 表示画过了；否则用默认外形 |
| `hurtFx(s)` | 想换掉引擎默认的受击火花时，返回 true |
| `offField()` | 领袖的场外效果（全场生效的那一半技能）：角色保持待机，在这里起特效、自己计时；查看页按 7 播放，截图脚本自动截 `10_off_*.png` |
| `SHEET` | 自定义动作表取帧时间 |

引擎自动处理：来袭敌弹、受击 / 死亡的命中火花和震屏（可用 `R_HURT` 换火花色阶或 `hurtFx` 接管）、复活、粒子 / 弹道 / 冲击环 / 特效积木 / 死亡碎片的物理与绘制、震屏、天空闪白、假人反应。

## 色板

64 色，全部角色共用（`PCD.PAL`）。材质色阶用名字：`defMat('steel')`、`defMat('crimson', 2)`（第二个参数是暗边宽度），名字见 `RAMP`：crimson gold skin skinDark white bone wood leather boot stone steel iron green moss blue sky purple shadow blood pale sand pink fire poison ink gem glow。也可以直接写 4 个下标。

特效色阶（5 级，亮→暗）用 `FXI.<名字>` 取下标：magic impact enemy dust soul fire holy poison frost shadow blood nature bolt coin water earth steel curse。

缺颜色时补进 `pcd.js` 的 `PAL` 末尾和 `RAMP` / `FX`，写明用途，所有角色都能用。

## 取帧与走位（必须用，不要自己写 `Math.floor(t * 12)`）

- `q12(t)` → 12 fps 的帧时间；`f12of(T)` → 帧号。带容差取整：整帧时间（如 7/12）不会因为浮点误差落回上一帧。
- `gait(tq, fps = 6)` → 步态帧 0–3（0 接触 A · 1 经过 · 2 接触 B · 3 经过）。两个接触帧前后脚的 x 位置要互换。
- `walkDemo(tq, 距离, 方向)` → `{ mx, flip }`：前半段朝方向走、后半段转身走回。远程方向 1；近战站位离假人近，用 −1 先走开。
- 引擎的状态时间按步数算（不累加小数），动作表、验收、导出的帧时间都是 `i / 12`。

## 动作积木

- `keys(tq, track, P, fields)`：关键帧轨道。`track = [[0, K_IDLE], [0.12, K_WIND, 'out'], [0.2, K_STRIKE, 'snap'], [0.45, K_HOLD, 'out'], [0.75, K_IDLE, 'inOut']]`，缓动名：lin out in inOut back snap。
- `mix(P, A, B, q, fields)`：两个姿势之间插值。
- `ease.*`、`clamp01`。

## 特效积木（`fx.*`，layer：0 角色后 · 1 假人与角色之间 · 2 角色前，默认 2）

| 积木 | 参数 | 用在 |
|---|---|---|
| `fx.pillar(x, yTop, yBot, w, ramp, dur, layer)` | 天降光柱，第 1 帧全亮，之后从上往下断开 | 圣光、审判、落雷 |
| `fx.beam(x0, y0, x1, y1, w, ramp, dur, layer)` | 直线光束 | 射线、净化 |
| `fx.bolt(x0, y0, x1, y1, ramp, dur, layer, seed)` | 折线闪电，逐帧抖动 | 雷电、链式 |
| `fx.circle(x, y, rx, ry, ramp, dur, spin, layer)` | 地面法阵（默认 layer 0） | 召唤、蓄力、复活 |
| `fx.dome(x, y, rx, ry, ramp, dur, layer)` | 点阵护盾，按角度逐点亮起 | 守护、护盾 |
| `fx.slash(cx, cy, r, a0, a1, ramp, dur, width, layer)` | 斩击弧（角度 0 朝上、顺时针为正） | 近战、刀锋 |
| `fx.crack(x, y, len, dir, ramp, dur, layer)` | 地裂（默认 layer 0） | 砸地、冲锋落地 |
| `fx.wave(x, y, dir, len, height, ramp, dur, layer)` | 沿地面推进的浪 | 火浪、水浪、地刺 |
| `fx.cloud(x, y, r, ramp, dur, layer)` | 毒雾 / 烟团 | 毒、诅咒、隐身 |
| `fx.link(x0, y0, x1, y1, ramp, dur, layer)` | 虚线连线（默认 layer 1） | 光环、治疗链、锁链 |
| `fx.cross(x, y, len, ramp, dur, layer)` | 十字星芒 | 爆发帧、命中点 |

`ramp` 可以写名字（`'holy'`）或下标。另有：`burst` 外爆、`ring` 冲击环、`releaseOrbit` 蓄力粒子外爆、`fall(x, y, vx, vy, groundY, ramp, sz)` 从天而降落地成尘、`shoot(k, x, y, vx, targetX, ramp, vy)` 弹道、`spawn(K_*, ...)` 单个粒子、`blitShape` + `copySprite` 残影 / 化影。

## 音效钩子（`sfx(事件, 参数)`）

在关键帧上调用，查看页没接音效库时什么也不响（`?sfx=1` 会加载 `lib/sfx.js`），进游戏后接到 `M.Sfx.charFx`。返回项里写 `SFX` 声明：

```js
SFX: { body: 'flesh', how: 'topple', pal: 'arcane', style: 'spiral', w: 0.7 }   // 受击 / 死亡的身体、死亡方式、技能元素、蓄力花样、施放重量；悬浮不落脚的加 hover: 1
```

`pal`（元素音色，SFX 声明和 `impact` 都用）只能取：arcane 奥术 · holy 圣光 · frost 冰 · fire 火 · poison 毒 · nature 自然 · water 水 · earth 土 · shadow 暗影 · blood 血 · metal 金属 · coin 金币 · time 钟表 · bolt 雷电 · curse 诅咒。
`style`（蓄力 / 施放花样）只能取：spiral heal fire frost bolt shield summon poison blade buff shadow beam coin nova meteor。这是和音效库共用的词表，写别的名字验收不通过。不写 `pal` 时引擎按 `R_EL` 换算（magic → arcane、steel → metal……）；用 `fxRamp` 自建元素色阶的角色必须写 `pal`。

| 事件 | 谁发 | 什么时候 | 参数 |
|---|---|---|---|
| `step` | 模块（`stepFX`，步态接触帧） | 脚 / 蹄落地 | `w` 体重 0–1 |
| `swing` | 模块（`onTime`，出手帧） | 攻击挥出 | `kind` slash / smash / thrust / staff / bow / gun / claw / bite / throw，`w` |
| `hit` | 模块（`onTime` 近战命中帧 / `impactOn` 弹道到达） | 攻击接触 | `mat` flesh / metal / stone / wood / magic，`w` |
| `shoot` | 模块（发射弹道时） | 弹道发射 | `proj` arrow / bullet / orb / stone / water / coin / fire …… |
| `charge` | 引擎（进入蓄力） | 技能蓄力开始 | `dur`、`pal`、`style`（取 `SFX`） |
| `release` | 引擎（进入施放） | 施放那一帧 | `pal`、`style`、`w` |
| `impact` | 模块（技能特效落地、冲击环炸开；多段技能每段一次） | 技能命中 | `pal`、`w` |
| `hurt` | 引擎（受击命中） | 受击 | `body` flesh / armor / stone / ghost / beast / machine |
| `death` | 引擎（死亡命中） | 开始死亡 | `how` collapse / shatter / dissolve / explode / topple，`body` |
| `fall` | 模块（`onTime`，倒地那一帧） | 身体落地 | `w` |

写了 `SFX` 的模块，验收会检查：移动有 `step`（`hover` 除外）、攻击有 `swing` 和 `hit` / `shoot`、技能有 `impact`、倒下类死亡有 `fall`。导出的 `sprite.json` 带 `sfx` 时间线（`chain` 状态链、`ct` 链内秒数、`f` 状态内 12 fps 帧号）和 `sfxDecl`；`__pc.sfxTimeline()` 可以直接查看。范式写法见 `chars/star-wizard.js`。

## 更多积木（先查这里，别在模块里自己养粒子池）

- **带物理的粒子** `spawnX(k, x, y, vx, vy, life, ramp, o)`：`k = K_PHYS` 时按 `o.g` 重力、`o.dragX / dragY`（每秒保留比例）、`o.floor`（落地贴住后走完色阶）运动，用于血滴、滴落、溅液；`o.age0` 出生时已走过的寿命比例（从色阶中段开始的烟）；`o.sz 2` 画 2×2。螺旋汇聚类：`o.a / r / w` 螺旋参数，`o.tx / ty` 定点目标，`o.orbitW` 到达后的环绕角速度（负 = 逆时针，默认 8.5），`o.orbitR` 环绕半径（定点汇聚 `K_SPIRAL_PT` 设了它会转成绕定点环绕 `K_ORBIT_PT`），`o.squash` 纵向压扁（默认 0.75）。
- **施放时外爆** `releaseOrbit(vmin, vmax, lmin, lmax, o)`：`o.pts 1` 连定点汇聚的也放出，`o.up` 上抛量，`o.kind` 转成的种类（`K_PHYS` 再给 `o.g / o.floor`），`o.ramp` 换色阶，`o.at [x, y]` 从这个点往上半圆溅出，`o.to [x, y, k]` 飞向目标。`clearOrbit()` 只清不爆。
- **弹道选项** `shoot(k, x, y, vx, tx, ramp, vy, o)`：`o.trail false` 不拖尾，或 `{ every, life: [a, b], back: [a, b], off }`；`o.glow` 地面映光用色阶第几级（-1 不映光）。
- **最上层** 返回项 `fxTop(f12)`：画在冲击环、粒子、弹道之上（刀光、后期扫描线错位）。可读写帧缓冲 `E.fb`（`Uint8Array(128×96)`，色板下标）。
- **夜空压暗** `dim(t)`（和 `flash` 相反）；**有序抖动** `bayer(x, y)`（0–1）；`E.stepN` 当前总步数。
- **地面影子** `groundShadow(x, 半宽, 离地高度)`：飞行 / 漂浮单位画在 `fxBack` 里。
- **贴地截断** `begin(hero, ox, oy, clipY)`：本地 y 大于 `clipY` 的像素不画。
- **远侧暗一级材质** `defMat(r, band, flat, 1)` → `[勾线, 暗, 暗, 基]`。
- **缓存键打包** `const KEY = keyer([['a', -16, 16], ['step', -1, 1], ...])`，`poseAt` 末尾 `KEY(P)` 写好 `P.k1 / P.k2`（范围写的是取整后的整数，越界会在控制台警告）。drawHero 要按状态分支时，在 `poseAt` 里写 `P.st = 状态` 并编进键。
- **复活** 返回项 `REVIVE: { dy 汇聚与收尾高度（默认 -12）, ramp 色阶（默认 soul）, big 1 大冲击环 }`。
- **友军占位**（光环、治疗、增益类技能的对象）：返回项 `ALLIES: true`（一直在）或 `'skill'`（蓄力到收招期间在），`ALLY_X` 可覆盖站位；`allyPoints()` 返回 `[{ x, y, top, mid }]` 挂点（连线、盾印、加血数字）；`allyFx({ dur, outline, tint })` 让他们被光环照亮；`allies(1 / 0 / null)` 手动开关。
- **截图** `__pc.at()` 每次从 simT 0 开始，闪烁相位一致。

## 假人（目标）效果

- `hitDummy(big, dir)`：挨打摇晃（big 1 = 大摇 + 击退）。
- `dummyFx({ dur, tint, slow, sink, stun, outline, fill, fade, sinkEase })`：持续效果。`outline` 色阶 = 剪影外罩一圈描边（定格、冰封），`fill` 色阶 = 第 1 帧整片填色，`fade: false` 不闪烁褪去，`sinkEase: 0` 整段都下沉。`E.dummy` 是假人精灵（只读，要自己描剪影时用）。`tint` 特效色阶名（frost 冰冻、fire 点燃、poison 中毒、curse 诅咒……），按原色明暗映射成单色，最后 30% 闪烁褪去；`slow` 0–1，摇晃变慢（攻速降低、减速）；`sink` 陷进地面的格数；`stun` 1 = 头顶转星（眩晕、停顿）。再次调用会覆盖。

## 烘焙选项（`bake(sprite, o)`）

`o.rim` 0–3 轮廓光档，`o.rx / o.ry` 光源位置，`o.rimR[]` 各档半径，`o.rimRamp` 色阶，`o.flash` 闪白，`o.dq` 消散量；
`o.skip` 不吃轮廓光的材质（下标 → 1：木杆、握发光体的手、面纱、脸）；`o.rimAll` 1 = 发光体在剪影内部（独眼、胸口核心），半径内的外沿都打光。

## 死亡套件（`death.start(mode, opts)`）

在 `onTime` 里、命中之后调用；调用前先把当前帧画好烤好（`poseAt(DEATH, t) → drawHero → bakeHero`），之后 `poseAt` 里让 `P.dq = 1` 隐藏精灵，由引擎画碎片。

| mode | 效果 | 常用 opts |
|---|---|---|
| `parts` | 按部件散架：帽 / 盔、武器、盾、手臂各自飞出，躯干塌下 | `power` `push` `fadeAt` |
| `chunks` | 切成不规则小块炸开，落地弹跳成堆 | `chunk`（3–5）`power` `fromX/fromY`（冲击点，本地坐标） |
| `burst` | 碎块飞得更远（配闪白、震屏） | 同上 |
| `melt` | 按列塌成一滩后消散 | `fadeAt` |
| `ash` | 从头顶开始化成粒子飘走 | `ramp` |

碎片只用角色自己的像素，只按 90° 翻滚，落在地面线上，`fadeAt` 秒后按抖动消散。返回项里写 `deathKit: { mode, at }` 记下来。

## 部件库（`parts`）

人形角色的身体用 `parts.js` 的共享部件拼，角色模块只写本角色独有的部件、姿势和技能。演示：`view.html?c=_parts-demo&v=0`…`14`（15 个完全由部件拼出的人）。非人形骨架在 `parts-beast.js`（`parts.beast`）。

**约定**

- 每个部件是 `parts.<名字>(E, rig, P, o)`：自己调用 `E.part()`，返回后续部件要用的挂点。坐标以脚底为原点、面朝右、y 向上为负，不画进地面以下。
- 部件的输出只取决于 `(rig, P, o)`，不读写模块外的可变状态。缓存键 `k1 / k2` 只要编进部件读的 P 字段（下面每个部件都写了），就不会出现「参数变了画面不变」。
- **drawHero 要按状态分支**（死亡时武器滑落、技能里换握法）时，在 `poseAt` 开头写 `P.st = 状态`，并把 `['st', 0, 8]` 编进缓存键；drawHero 只读 `P.st`。不要在模块里另存一个「当前状态」变量——残影、死亡套件、导出会在别的状态里调用 `poseAt → drawHero`，那个变量和 P 对不上，缓存键也不会变。
- `rig = parts.rig(P, 体型)` 既是骨架，也是落笔变换：`P.lying = 1` 时整具身体按 90° 转成仰倒（头在左）或前扑（头在右），部件照常画，明暗在烘焙时按新朝向重算。掉在地上的帽子、武器传 `o.at`（精灵本地坐标），武器再加 `o.free: 1`，它们就不跟身体转。
- 倒地时背在背上的东西跟着身体走：`pack` 的箭袋 / 布袋 / 木箱随身体转；背盾（`pack` 的 shield，或 `targe` / `shield` 加 `back: 1`）画成侧看的一条（3 格厚、内沿贴背、盾心往外鼓 1 格），前扑时压在背上、仰倒时压在身下，不会像一块立在身上的圆板；锁链 `chain` 的缠绕段随身体转，垂下的那段照样朝地面垂、落地堆开。
- 材质都是 `defMat` 的下标。`parts.mats(E, { 名字: 色阶 })` 一次建好，同时给出 `名字D`（暗一级）。远侧腿和后臂用 D，一眼看出哪只在前。小块的材质（披肩、毛领、护腕）用 band 1；band 2 只给大面积布料，小块用了会整块发暗。
- 左右手：设定里的右手是靠镜头的前手（`P.hx / hy / a`，`side: 'F'`），左手是后手（`P.bhx / bhy / ba`，`side: 'B'`）。
- 细的斜放道具（剑、匕首、矛、枪、弩、牌、箭）方向吸附到 0 / 1:2 / 45° / 2:1 / 90°，画成逐行错位的平行四边形。宽的武器头（`HEADS`：斧、锤、戟、铲、剁刀）只按 90° 换朝向，中心放在真实角度上，柄用直线插进套口。

**推荐的部件顺序（从后往前）**

披风 `cape` / 围巾尾 `scarf tail` → 背负物 `pack` → 后手武器（反握、双持）→ 后臂 `arm B`（握武器时 `grip: 'none'`）→ 腿 `legs` → 躯干 `torso` → 围裙 `apron` / 挂件 `pendant` / 腰间提灯 → 兜帽后层 `hood back` →（戴盔 / 帽时：头发 `hair`）→ 头 `head` → 八字胡 / 山羊胡 `beard`（紧跟 head，并进脸里）→（不戴盔帽时：头发 `hair`）→ 长须 / 络腮 `beard` → 披肩 `mantle` → 帽 / 盔 / 冠 / 头巾 / 兜帽前层 → 围巾绕颈 `scarf wrap` → 武器 → 后手 `hand B`（压在武器柄上）→ 前臂 `arm F` → 盾 `shield` / `targe` / 书 `book` / 提灯 `lantern`。

持盾角色是「后手武器 → …… → 前臂 → 盾」。弓箭手是「弓 → 后手（搭箭）」。遮挡变化时（直刺时武器改到前臂之后）直接在 draw 里换顺序。

**头小的时候（头高 6–7 格）**：头盔 / 帽、胡须、头发各是一个部件时，每个部件都在脸上压一圈分界线，脸几乎全变成勾线色。

- 最小头高：盔 / 帽 + 单独成部件的胡须（`full` `long` `braids`）+ 头发三样都要露在脸周围，头至少 8 格（`head: 8`）；6–7 格的头最多叠两样。
- 戴盔 / 帽的角色把 `hair` 画在 `head` 之前：头顶被盔盖住，只露出脑后和垂下来的长发，分界线压在头发上，不压在脸上。不戴盔帽的短发还是画在 head 之后（画在前面会只剩一圈勾线色）。
- 八字胡、山羊胡用默认的 `join`（并进脸的部件）；角盔的护鼻条只到眼睛那一行，鼻尖露在外面，脸太小时用 `nasal: 0` 关掉。
- **例外**：侧视时前手（盾臂、握武器的前臂）横在胸前，会挡住下巴下面垂到胸口的胡子。编辫胡 `braids`、长须 `beard long` 这类身份特征画在前臂之后、盾之前（维京战士、奴隶主就是这样），和上面的推荐顺序不同。

**轮廓光**：`rimAll: 1`（发光体在剪影内部，比如盔缝里的眼）时，半径内的外沿不看朝向全打光。大精灵开到 rim 3 会整圈外沿变成火边：用 `rimR` 把各档半径限在发光体附近（奴隶主是 `[0, 11, 15, 18]`），伸出轮廓的角、武器柄、锁链的材质放进 `skip` 表。

### 骨架 `parts.rig(P, o)`

`o.body` 选体型档，再用数值字段覆盖。体型改的是比例，不是整体缩放。

| 体型档 | leg | torso | head / headW | sw | arm | lw | 其他 |
|---|---|---|---|---|---|---|---|
| `standard` 标准 | 9 | 8 | 6 / 6 | 4 | 9 | 3 | |
| `slim` 瘦高 | 10 | 8 | 6 / 5 | 3 | 9 | 2 | limb 0.9 |
| `tall` 高个 | 11 | 10 | 6 / 6 | 4 | 11 | 3 | |
| `heroic` 英武 | 10 | 10 | 6 / 6 | 5 | 10 | 3 | limb 1.2 |
| `stocky` 矮壮 | 6 | 9 | 6 / 6 | 5 | 8 | 3 | belly 1, limb 1.2 |
| `fat` 肥胖 | 7 | 10 | 6 / 6 | 5 | 9 | 3 | belly 3, limb 1.3 |
| `giant` 巨型 | 12 | 13 | 7 / 7 | 6 | 13 | 4 | limb 1.5 |
| `hunched` 佝偻 | 8 | 8 | 6 / 6 | 4 | 9 | 2 | hunch 3 |
| `child` 孩童 | 5 | 6 | 6 / 6 | 3 | 6 | 2 | |

数值字段：`leg` 胯高 · `torso` 胯到肩 · `head / headW` 头高 / 宽（头身比）· `sw` 躯干半厚（侧面看的前后宽，相当于肩宽）· `arm` 臂长 · `lw` 腿粗 · `stride` 步幅 · `limb` 袖粗倍数 · `belly` 肚子前凸 · `hunch` 驼背（肩和头前移，背上鼓包）· `neck` 脖子 · `waist` 收腰 · `headX` 头前后偏移 · `lift` 经过帧抬脚高度（默认 2）· `fall: 'back' | 'front'` 倒地方向。

读 P：`lean`（-1..2，只推上半身）`crouch`（0..7，≥ 4 单膝跪）`bob` `step`（-1..1）`wup`（0..2）`walk` `head`（-1..1 转头）`lying` `lift`。

返回（都是本地坐标）：

| 字段 | 含义 |
|---|---|
| `yHip` `yWaist` `yS` | 胯行（腿从下一行开始）、腰带行、肩行 |
| `sFx sFy` / `sBx sBy` | 前肩 / 后肩 |
| `hx hy` `hx0 hx1 htop ey` `hw hh` | 头中线列、下巴行、头左右列、头顶行、眼睛行、头宽高 |
| `hipFx hipBx` | 前 / 后胯 |
| `footFx footFup footBx footBup` `contact` | 两只脚的 x 和抬起格数；接触帧 contact = 1（扬尘由调用方做） |
| `legFx legBx` | 近侧 / 远侧腿从哪个胯位出腿（接触 B 互换，其余等于 `hipFx / hipBx`；自己画腿时用它） |
| `kneel` `lie` `cr` `lean` `hunch` `belly` `sw` `arm` `limb` `lw` `b` | 姿势和体型（`b` = 合并后的体型字段） |
| `rot ox oy` | 倒地变换（`rot` 1 = 前扑、3 = 仰倒） |

步态内置在 rig 里（`parts.gait` 写 `step wup`）：

| 步态帧 | 近侧脚 `footFx` | 远侧脚 `footBx` |
|---|---|---|
| 0 接触 A（step 1） | `hipFx + stride`（在前） | `hipBx − stride`（在后） |
| 1 经过（wup 2） | `hipFx + 1` 踩地 | `hipBx + 1`，抬起 `lift` 格、膝盖前顶；在近侧腿后面整只露出来 |
| 2 接触 B（step −1） | `hipBx − stride`（在后） | `hipFx + stride`（在前）——接触 A 的镜像，跨度相同；两条腿也互换出腿的胯位（`legFx = hipBx`、`legBx = hipFx`），和接触 A 一样是 A 字形，不在胯下交叉，短腿也分得开 |
| 3 经过（wup 1） | `hipFx + 1`，抬起 `lift` 格 | `hipBx + 1` 踩地 |

### 工具

| 函数 | 作用 |
|---|---|
| `parts.mats(E, spec)` | 建材质：`{ 名字: 'steel' \| [4 个下标或 #hex] \| { r, band, flat } }` → `{ 名字, 名字D }` |
| `parts.gait(P, f)` | 4 帧步态（`f = E.gait(tq)`）：写 `walk step wup bob sway beard` |
| `parts.keyer([[字段, 最小, 最大, 倍数?], …])` | 生成缓存键函数（混合进制，乘积超过 2^53 直接报错）；角度写 `['a', -32, 32, 1 / ASTEP]`，状态写 `['st', 0, 8]` |
| `parts.edges(rig, y)` | 躯干第 y 行的后沿 / 前沿 `[L, R]`（前倾、驼背、肚子都算进去） |
| `parts.toSprite(frame, x, y)` | 部件本地坐标 → 精灵本地坐标（倒地时放特效挂点） |
| `parts.along(P, o, k)` / `parts.onShaft(P, o, d)` | 吸附武器第 k 步 / 直柄上距握点 d 格的点：双手武器放后手用 |
| `parts.<武器>.focus(P, o)` | 和画的时候同一套几何算发光体 / 武器尖，在 poseAt 里算 `P.gx / gy` |
| `parts.px / run / rect / line / brush / sweep`、`parts.bar / cell / snapDir` | 带变换的落笔、吸附直条（角色自己的部件也能用，倒地时一样跟着转） |

### 身体部件

| 部件 | 参数 o | 读 P | 返回 |
|---|---|---|---|
| `legs` 腿脚 | `style`: boot 高靴 · shoe 矮鞋 · greave 胫甲（膝甲外凸）· bare 赤足 · sandal 凉鞋；`mat matD` 裤 / 腿，`boot bootD`，`w` 腿粗，`bootH` 靴高 | （rig） | `{ fx, bx, fUp, bUp, contact }` |
| `torso` 躯干服装 | `style`: robe 长袍 · habit 修女袍 · dress 长裙（细腰 + 裙撑 + 蕾丝下摆）· coat 大衣（前襟、开衩、口袋）· tunic / leather 皮甲（缝线、系带）· plate 板甲（中脊、胸腹分界、甲片 + 铆钉、护颈）· vest 背心 + 衬衫 · bare 赤膊（胸肌、腹肌、肚脐）；`mat trim belt buckle collar emblem`（+ `emblemStyle`: cross · dot · hourglass · bar · diamond）`buttons shirt tabard strap strap2 studs cloth tassel hem flare flareF` | `sway bend beard` | `{ hem, belt, rows, chest, front, back }` |
| `apron` 围裙 | `mat strap stain hem pocket` | `sway` | `{ hem }` |
| `pendant` 腰间挂件 | `style`: pouch · keys · flask · book · tools；`mat trim x y` | `beard` | — |
| `mantle` 短披肩 | `style`: plain 锯齿下摆 · fur 毛皮（主体平涂，每 3 列一撮竖毛束，束间的缝往上 2 行；下摆锯齿：长尖 2 格 + 短尖 1 格）；`mat`（band 1）`clasp len` | `sway bend` | — |
| `cape` 披风 | `style`: plain · tattered 破边（3 格缺口）；`mat`（建议 band 2）`trim len`（long · short · 行号）`flare clasp` | `sway bend` | `{ bot, back }` |
| `scarf` 围巾 | `layer`: tail 两条飘带（最后面）· wrap 绕颈；`mat len` | `beard sway` | — |
| `pack` 背负物 | `style`: quiver 箭袋 · sack 布袋 · box 木箱 · shield 背盾（`shape` + 盾的参数，round = `targe`；自动带 `back: 1`）；`mat trim fletch` | （rig） | — |
| `arm` 手臂 | `side` F / B，`at from`，`sleeve`: tight · loose · bell 喇叭袖 · puff · bare · plate（肘甲）；`mat cuff cuffStyle`（band · bracer · lace 白哭袖 · fur）`hand grip`（fist 2×2 · big 3×3 · none）`pauldron pStyle`（round · spike · fur）`trim elbow`。手在臂长之外时（双手武器的后手握在前胸、`sw` 大的宽肩）肩点沿手臂方向前移，手臂最长 = 臂长，肩甲留在原肩上 | `hx hy` 或 `bhx bhy` | `{ hx, hy, ex, ey, wx, wy }` |
| `hand` 单独的手 | `side at hand grip` | 同上 | `{ hx, hy }` |
| `head` 头与脸 | `mat face`（round · square · long · gaunt）`age`（young · old · rugged）`eye eyeStyle`（dot · narrow · wide + `white` · glow）`brow browStyle`（1 · 2）`nose`（small · big · long · hook · none）`mouth`（line · wide · none）`lips ear`（dot · pointy · none）`blush stubble bald shade veil wimple` | `eyes beard` | `{ x0, x1, top, bot, ey, eye }` |
| `hair` 头发 | `style`: short · long · ponytail · bun · spiky · fringe 秃顶一圈；`mat tie len`。戴盔帽时画在 head 之前 | `beard` | — |
| `beard` 胡须 | `style`: long · full（自己的部件）· goatee · mustache（默认并进脸的部件）；`mat len join` | `beard` | — |
| `braids` 编辫胡 | 八字胡 + 下巴一团 + 1–2 条辫子（辫纹逐行亮暗、每 3 行一个辫环、辫梢会摆，后面那条暗一级）；`mat ring`（辫环材质）`n`（1 · 2）`len lip`（0 = 不画八字胡）。自己的部件；侧视持盾 / 前手在胸前时画在前臂之后 | `beard` | `{ tips }` |
| `chain` 锁链 | 横环（亮 + 暗 2 格）和竖环（1 格）逐行交替；`mat at len`（垂下格数）`wrap: [x0, y0, x1, y1]`（先沿这段缠绕，缠前臂 / 腰）`cuff`（末端张开的镣铐材质）`swing free`。垂下的那段朝屏幕下方垂，落地沿地面堆开；站着时挂点 + len + 镣铐 3 行的最低点别低于 y −4（贴地会读成多一只脚） | `beard sway` | `{ end }`（精灵本地坐标） |

脸的几条画法（踩过的坑）：浅色小块（眉、白包脸带、面纱、小胡子）和压在上面的部件之间要留 1 行，或者画进脸的同一个部件（`veil`、`wimple`、`beard mustache / goatee`）。头发头顶那一行只盖到眉毛后面 3 格。头小的时候见上面「头小的时候」。

### 头饰（`o.at` + `o.rot` = 掉在地上）

| 部件 | 参数 o | 读 P |
|---|---|---|
| `hat` 帽 | `style`: wide 宽檐平顶 · pointed 尖帽（后倾、折角帽尖）· top 礼帽 · tricorn 三角帽；`mat band badge` | `bend head` |
| `hood` 兜帽 | `style`: hood 圆兜帽（鸟喙前檐）· cowl 尖顶僧帽 · wimple 修女黑头巾（白带子用 head 的 `wimple`）；`mat layer`（back → head → front） | `bend` |
| `helm` 头盔 | `style`: great 平顶桶盔（面罩缝 + 1 格眼光 + T 形面饰）· kettle 宽边铁帽 · horned 角盔 · nasal 护鼻尖盔；`mat trim eye crest`（盔缨单独一个部件）；`nasal: 0` 关掉护鼻条（horned / nasal，默认画到眼睛那一行）；horned 的角就是 `parts.horns`（先画、根部压在盔帽下）：`horn` 角材质、`hornSize` 3–9（默认 4）、`hornCurve`（默认 crescent）、`hornBand`、`horns: 0` 不画角——要大角调 `hornSize`，不要再叠一个 `parts.horns` | `eyes beard head` |
| `horns` 角 | 单独的一对角（配 great / kettle / nasal 盔、光头）：`mat band size`（3–9，默认 6）`curve`: up 牛角外张上翘 · crescent 月牙（外弯、尖端往里勾）· back 后掠 · ram 羊角盘卷；`y` 角根行（头饰坐标，默认 2）。远侧角暗一级，返回 `{ tipF, tipB }` | `head` |
| `crown` 王冠 | `mat gem grand` | `glint` |
| `turban` 缠头巾 | `mat gem plume` | `beard` |
| `veil` 面纱 | 就是 `head` 加 `veil` 材质（面纱和脸必须同一个部件，否则分界线会把整张脸压黑） | `eyes beard` |

### 武器与道具

公共参数：`hand` F / B 选哪只手（默认 F），`at a` 覆盖握点和角度（角度 0 朝上、顺时针为正），`free: 1` 掉在地上不跟身体转，`glowLv` 覆盖发光档（默认 `P.gem`：0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭）。发光体嵌在武器里时和武器同一个部件，伸出武器之外（杖顶宝石）时单独一个部件。

| 部件 | 参数 o | 返回（`.focus` 同几何） |
|---|---|---|
| `sword` / `dagger` / `knife` | `style`: long · broad（血槽）· great · rapier · saber（后三分之一弯）· dagger · knife；`metal trim wood edge glow len w guard` | `{ tip, guard, mid, di }`（focus = 刃中段 / 匕首尖） |
| `axe` `hammer` `halberd` `shovel` `cleaver` | `head`（HEADS：axe 胡子斧 5×6——上半实心、刃口沿柄往下垂成胡子，胡子和柄之间留空 · battle 月牙大斧 7×10——只在中间 3 行连柄，两只月牙尖往回勾，背后留 3 格空，剪影里也看得出凹口 · double 双刃 · hammer · maul · mace · halberd · trident · cleaver · shovel · pick · crook）`metal wood trim edge glow len back mirror` | `{ head, butt, q, socket }`（两个部件：柄 → 头） |
| `spear` 矛 | `style`: leaf · spike · wing；`wood metal trim tassel len back` | `{ tip, socket, di }` |
| `staff` 杖 | `style`: gem 杖爪抓宝石 · orb 宝珠 · crook 弯钩 · plain 两端包铁；`wood trim gem glow len back` | `{ gem, tip }` |
| `bow` 弓 | `wood string arrow head fletch len pull nock rot`（`pull` 默认 `P.pull` 0–3，弦拉到后手） | `{ tip, nock }`（弓 + 箭两个部件） |
| `crossbow` 弩 | `wood metal string bolt head loaded` | `{ tip, di }` |
| `gun` 火枪 | `style`: musket · blunder 喇叭口 · pistol；`wood metal trim len`（握点 = 扳机，后手放 `parts.along(P, o, 4)`） | `{ muzzle, di }` |
| `shield` 盾 | `style`: kite · heater · round（交给 `targe` 画：`r` 默认 4，emblemStyle 换成 targe 的图案，boss 用纹章材质做盾心）· tower · buckler；`face rim emblem emblemStyle`（cross · boss · bend · quarter · chevron · none）`at rot clip back` | `{ center, top, bot }` |
| `targe` 大圆木盾 | 维京 / 蛮族 / 海盗的圆盾：`r` 半径 3–8（默认 6）`face face2`（两种漆）`rim boss`（盾心 3×3 铁包，总是画）`pattern`: quarter 四分 · wedge 八瓣 · band 横带 · cross 十字 · bend 斜带 · chevron 人字 · none；`plank`（0 = 不画竖木板缝）`rune`（盾心符文，flat，按 `P.gem` 5 档亮）`glowLv at rot clip free back`。铁边框铆钉 r ≥ 5 时 8 颗、否则 4 颗；一个部件 | `{ center, top, bot, r }`（focus = 盾心） |
| `lantern` 提灯 | `metal glass glow rot`（挂在握点下面，5 档灯火） | `{ focus }` |
| `book` 书 | `open cover page trim glow rot` | `{ focus }` |
| `card` 牌 | `n`（1–5 张牌扇）`spread card trim pip lit len` | `{ tips }` |

### 拼装例子

```js
PCD.define('Knight', (E) => {
  const { parts, Sprite, bake, q12, f12of, ASTEP, DEATH } = E;
  const BODY = { body: 'heroic', fall: 'front' };
  const M = parts.mats(E, { plate: 'steel', tab: 'blue', gold: 'gold', cape: { r: 'blue', band: 2 }, plume: 'white', wood: 'wood',
    eye: { r: [5, 5, 5, 5], flat: 1 }, glow: { r: [51, 5, 21, 21], flat: 1 } });
  const SWORD = { style: 'long', hand: 'B', metal: M.plate, trim: M.gold, wood: M.wood, glow: M.glow, len: 11 };
  const hero = new Sprite(68, 62, 28, 56);
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['ba', -32, 32, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8]]);
  function poseAt(st, t, T) {
    P.st = st;                                                   // drawHero 按状态分支时读它（已编进 KEY2）
    // …按状态写 P（移动用 parts.gait(P, E.gait(q12(t)))），取整之后：
    const f = parts.sword.focus(P, SWORD); P.gx = f[0] + P.bx; P.gy = f[1] - P.lift;
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY);
    parts.cape(E, R, P, { mat: M.cape, trim: M.gold });
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.plateD, pauldron: M.plateD, grip: 'none' });
    parts.legs(E, R, P, { style: 'greave', mat: M.plate, matD: M.plateD });
    parts.torso(E, R, P, { style: 'plate', mat: M.plate, tabard: M.tab, emblem: M.gold, belt: M.wood, buckle: M.gold });
    parts.helm(E, R, P, { style: 'great', mat: M.plate, trim: M.gold, eye: M.eye, crest: M.plume });
    if (R.lie) parts.sword(E, R, P, { ...SWORD, free: 1, at: [20 + P.hatX, -1 - P.hatY], a: Math.PI / 2 });
    else { parts.sword(E, R, P, SWORD); parts.hand(E, R, P, { side: 'B', hand: M.plate, grip: 'big' }); }
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.plate, pauldron: M.plate, trim: M.gold, hand: M.plate, grip: 'none' });
    if (!R.lie) parts.shield(E, R, P, { style: 'kite', face: M.tab, rim: M.plate, emblem: M.gold });
  }
  // bakeHero、特效、返回项照 star-wizard 写
});
```

`chars/_parts-demo.js` 是完整的可运行版本：15 个变体各自只写材质表和 `draw()`，姿势时间线（9 种握法类型的关键帧）、缓存键、倒地 / 跪倒 / 死亡套件、特效共用一套框架。`chars/VikingWarrior.js`（targe、braids、horned 角盔、胡子斧、`P.st`）和 `chars/SlaveLord.js`（horns、chain、fur 披肩、月牙大斧、背在背上的 targe）是用到本批新部件的正式角色。

缺部件就补进 `parts.js`：写清参数和读的 P 字段，画法遵守标准，输出只取决于 `(rig, P, o)`，并在这一节的表里补一行。
