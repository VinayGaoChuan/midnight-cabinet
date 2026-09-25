# 非人形部件库 `PCD.parts.beast`

代码：`pcd/lib/parts-beast.js`（`view.html` 已加载）。演示：`view.html?c=_beast-demo&v=0..13`（`pcd/chars/_beast-demo.js`），自检输出在 `pcd/convert/_beast-demo/`。

## 一、需求调查：215 个角色里的非人形

按 `roster.json` 的名字、种族、描述、特性判断（技能原文和升级关系作旁证），共 **101 个非人形**，其余 114 个是人形（含长翅膀 / 尾巴的人形，见表后「边界」）。

| 优先级 | 体型 | 数量 | 用哪个骨架 | 角色 key |
|---|---|---|---|---|
| 1 | 四足兽：犬 / 狼 | 14 | `quad` | GrayWolf DireWolf ChaosDireWolf WhiteWolf SnowWolfKing PackLeader BlackSword（描述「嚎狼」）DarkFang（「金色皮毛」「嚎狼」）WhiteFang Watchdog EvilDog ChaosEvilDog OldHound Cerberus（三头，需多画两个头） |
| 1 | 四足兽：熊 | 5 | `quad` | BrownBear PolarBear BlackBear HoneyBear ChaosDireBear（描述写「外壳蛞蝓」，名字是熊，待定） |
| 1 | 四足兽：猪 / 野猪 | 4 | `quad` | BigWildBoar RedEyes FirePig ChaosEvilPig |
| 1 | 四足兽：鼠 | 4 | `quad`（头型 rat） | EvilRat（「用棍子敲」，也可能是站立鼠人）ChaosRat DecayingCorpseRat DecayingChampionRat |
| 1 | 四足兽：豹 / 猫 | 3 | `quad`（头型 cat，花纹 spots） | MoonLeopard MagicLeopard LeopardEmperorSavalon（「用鱼篓」，也可能站立） |
| 1 | 四足兽：马 | 2 | `quad`（头型 horse 自带蓬鬃 + 额鬃、hoof；马具见第五节） | YellowManeHorse SweatBloodHorse |
| 1 | 四足兽：其它 | 3 | `quad` | SafetyMole（鼹鼠）Needler（针刺者，按游戏占位是背刺鼹鼠）ChaosPorcupine（「从背后射出针毛」，ridge 鬃刺） |
| 1 | 爬行四足（低腿长尾） | 4 | `quad`（头型 lizard、tail long） | Lizard GemLizard Dino DragonTurtle（龟壳要另画一个部件） |
| 1 | 半人马（马身 + 人上身） | 2 | `quad` + 人形上身 | Centaur GhostKnight |
| 2 | 龙 | 12 | `quad` + `wing` | EmeraldDragon PoisonDragon BlueDragon RedDragon BlackDragon GoldenDragon MagicDragon GreenDragon SkyDragon VengefulDragon BoneDragon（骨架画法另做）Drake |
| 3 | 多足节肢：蜘蛛 / 蟹 / 蝎 / 虫 | 11 | `bug` | Spider MotherSpider SpiderEmperorAnazos Spiderling（描述「迷你版的污泥」，待定）CrabWarlock Crabomancer Crabling Pincer（单只巨钳）VerdantWormKing（「巨大的赤蝎」）VerdantWormCommander（「尾刺」）VerdantWormSoldier |
| 4 | 机械（三种，互不相同） | 9 | 未做 | 机甲 / 机器人 4：Pulsebot Skybot（飞）Annihilator GigaAnnihilator · 旋翼机 2：GoblinCopter Whirlybird · 攻城器械 3：CrawlingCatapult WanderingTrebuchet SiegeRam |
| 5 | 飞禽 / 飞行生物 | 8 | `fly` | Chick Turkey Rooster（家禽，标「飞行单位」）FlyingEagle Bat（蝙蝠 + 机枪手）VampireBat VoidManta（魔鬼鱼，需扁身体 + 鳍翼）WarpWing（虚空飞行物） |
| 5 | 软体 / 漂浮：眼、章鱼、蜗牛 | 8 | `blob` | Snail GiantSnail Kraken EarthDragonKingGargon（「赤色巨型四爪章鱼」）EarthDragonIron（「从腔处射出魔法墨汁」，同族章鱼）EvilEyeRed EvilEyeDark EvilEyeKingNixon（已有模块） |
| 6 | 塔 / 固定物 | 6 | 未做 | ChargeTower FireGodTower SpiritSummonTower HellSummonTower Stone（神石 / 蛋）Mimic（宝箱怪） |
| 7 | 蛇 / 蠕虫 | 3 | `serpent` | RedWorm SickleWorm（镰刃虫）DancingSnake |
| 7 | 树 / 植物 | 3 | 未做 | LifeTree JadeVineFortress StormFortress |

**已覆盖**：`quad`（41，含半人马的下半身）+ 龙（12）+ `bug`（11）+ `fly`（8）+ `blob`（8）+ `serpent`（3）= 83 个。机械按数量排第 4，但分成机甲、旋翼、攻城三种互不相同的结构，每种只有 2–4 个，单独做骨架不划算；塔、树没有步态，各自画成专属部件更省事。

**边界（按人形处理，必要时借本库部件）**：Brute（蛮兵，四肢着地的猿，已有模块）· Imp、Diabolic（小恶魔，人形 + `B.wing`）· Ronin、MadMonarch、Guard（描述写「飞行单位」，人形 + 翅膀）· VoodooBeliever、VoodooGuard（「飞行单位」「爪子以及甲壳」，也可能是虫，做设定卡时再定）· GiantGodOfWar（名字是巨人，描述写死亡分裂成「小型九头蛇」，也可能是多头蛇）· Golem、Robo（人形魔像 / 机器人）· LizardEnemy、Froggo、EagleBeakedArcher（兽头人身）。

## 二、怎么用（总流程）

```
const B = E.parts.beast;
const m = B.mats(E, { main: 'pale', mane: 'white' });            // 1. 材质
const o = B.quad.shape({ len: 12, head: 'canine', m });          // 2. 形体（合并默认值，放进 m）
B.quad.reset(P); B.quad.anim.idle(P, tq, f12, DUR[IDLE]);        // 3. 姿势：reset → 通用动作 / 自己的关键帧
const rig = B.quad.rig(P, o);                                    // 4. 挂点（纯函数）
B.key(P, B.quad.KEYS.concat(B.COMMON));                          // 5. 缓存键
begin(hero, P.bx, 0); B.quad.draw(E, rig, P, o);                 // 6. 画（或按顺序逐个调用部件）
```

- 坐标：脚底（身体投影落地点）为原点、面朝右、y ≤ 0 在地面以上；所有画笔都丢掉 y > 0 的像素（不会画进地下）。
- 部件输出只取决于 `(rig, P, o)`：不读写全局状态；材质下标在 `o.m`。`rig(P, o)` 是纯函数，`poseAt` 里算一次（拿挂点设 `P.gx / gy`），`drawHero` 里再算一次也可以。
- **每个部件函数开头自己调用 `E.part()`**（`quad.leg` 每条腿一次、`quad.head` 一次……）。调用之后、下一个 `part()` 之前画的像素都并进这个部件，和它之间没有分界线。要给部件加本角色的细节（毛脚、脸上白斑、颈上血汗珠），就**紧跟着**那个部件画、自己不调 `part()`：`Q.legFeather` 就是先调 `Q.leg` 再接着画毛；黄鬃马的白斑紧跟 `Q.head`，汗血马的血汗珠紧跟 `Q.body`。中间插进别的部件，细节就会归到那个部件，分界线跟着错。
- 姿势字段都是**取整后的整数**，范围见各骨架的 `KEYS`；`B.key` 超出范围直接报错（避免「参数变了画面不变」）。
- `bx`（前冲 / 击退）不进 rig：用 `begin(hero, P.bx, 0)` 平移整张图；焦点 `P.gx = rig.mouth[0] + P.bx`。

## 三、通用

| 名字 | 说明 |
|---|---|
| `B.mats(E, spec)` | `spec.main` 主色阶 → `body`（band 2）`limb`（band 1）`far`（远侧，暗一级 `[勾线, 暗, 暗, 基]`）`ink`；`spec.limb` 给四肢 / 头换一个色阶（`limb far` 用它，躯干仍是 `main`；蜘蛛腿比腹亮、蝙蝠毛身配深色膜翼靠这个拉开）；缺省补 `eye`（金豆眼）`claw`（爪 / 蹄 / 足尖，骨白）`horn` `teeth`（白）`glow`（发光体）`spec`（高光白）。其余键原样生成（色阶名或 4 个下标），`wing bone mane shell feather` 另生成 `*Far`。`eye glow spec iris mark ink` 是平涂材质 |
| `B.key(P, spec)` | 按 `[[字段, 最小, 最大], ...]` 编 `P.k1 / k2`（放不下自动进 k2）；顺便按 `P.dq` 算 `P.dq48` |
| `B.COMMON` | 所有骨架共用的键：`bx -16..31` `flash` `dq48` `ddir` `rim 0–3`，掉落物 `drop 0–2` `dsx -24..24` `dsy 0–15`（`reset` 都清零） |
| `B.dropAt(d, c)` | 掉落物轨迹（纯函数）：死亡内第 `d` 秒 → `[状态 0 还挂着 / 1 飞行中 / 2 落地, 横移, 离地高]`。`c = { at 0.66 脱落时刻, dur 0.25 飞多久, dx 12 横飞格数（负数往后）, hop 5 抛起最高格数 }`，见下面「死亡掉落物」 |
| `B.util` | 贴地画笔 `dot disc oval seg taper poly`、局部 → 世界 `toW(cx, cy, a, u, v)`、`hash`、地面影子 `shadow(E, 屏幕x, 半宽)`（在 `fxBack` 里给飞行 / 漂浮的画） |
| `B.wing(E, x, y, pose, w, m, far)` | 翅膀（一个部件）。`(x, y)` 翼根；`w = { span 翼展, chord 后根距, type 'membrane' 膜翼 \| 'feather' 羽翼, fingers 翼指 / 初级飞羽数 }`；`far = 1` 用暗一级材质。膜翼用 `m.wing m.bone m.claw`，羽翼用 `m.feather`（缺省 `m.wing`） |
| `B.WINGS` | 翼姿 0 收拢 · 1 上扬 · 2 平展（侧看最窄）· 3 下压 · 4 回收（半收）· 5 张开（施放）· 6 垂落（死亡） |
| `B.FLAP` / `B.FLAP_BOB` | 扑翼 4 帧：步态帧 → 翼姿 `[1, 2, 3, 4]`；身体起伏 `[1, 0, -1, 0]` |

每个骨架都有：`DEFAULT`（默认形体）`KEYS`（姿势字段范围）`shape(o)` `reset(P)` `rig(P, o)` 各部件 `draw(E, rig, P, o)`，以及通用动作 `anim.idle / walk / hurt / death`（只写姿势字段，已按标准第 7 节的时间线：受击闪白 1 帧 + 击退 2 格；死亡 0.3 s 失衡 → 倒下（离地 3 → 1 → 0）→ 静止 → 1.6–2.4 s 消散）。`anim.idle` 返回循环内时间 `lp`，模块在 1.6–2.0 s 写自己的待机个性。

**死亡掉落物**（盾、骑手、鞍、背上的货）：每个骨架的 `anim.death` 最后一个参数是掉落物钩子——`quad / bug / serpent` 是 `death(P, d, f12, drop)`，`fly / blob` 是 `death(P, d, f12, alt, drop)`。

- 传 `B.dropAt` 的参数 `c`：钩子把轨迹写进 `P.drop / dsx / dsy`（已在 `B.COMMON` 里，不用自己加键）。画的时候 `P.drop` 为 0 照常挂在身上；非 0 时在 `(起点 x + P.dsx, 起点 y − P.dsy)` 画掉落物，`P.drop === 2`（落地）换成倒在地上的画法（胸盾传 `flat: 1`）。
- 传函数 `(P, d, f12) => {}`：同时掉好几样东西时用，在里面对每样东西调 `B.dropAt(d, c)`，写进自己的字段并把字段加进缓存键。
- 例子（黄鬃马）：`Q.anim.death(P, d, f12, { at: 0.66, dur: 0.25, dx: 13, hop: 5 })`，`drawHero` 里 `if (P.drop) Q.peytral(E, rig, P, o, { ...SHIELD, at: [8 + P.dsx, P.drop === 2 ? 0 : -SHIELD.r - P.dsy], flat: P.drop === 2 ? 1 : 0 })`。

## 四、四足 `B.quad`（犬狼熊猪鼠豹马、蜥蜴、龙）

**形体 o**（默认是灰狼；长度单位：格）

| 字段 | 默认 | 含义 |
|---|---|---|
| `len` `chest` `rump` | 12 · 4.5 · 4 | 胸臀圆心距（体长）、胸半径、臀半径 |
| `waist` `hump` | 0.3 · 0 | 收腹 0–1、肩峰高（熊 2、野猪 2.5：前重后轻的楔形就靠大肩峰 + 小臀 + 收腹） |
| `leg` `lw` `thigh` | 7 · 2 · 2.2 | 胸底离地（腿长）、腿粗 1–3、后腿大腿半径 |
| `farDx` `stride` `lift` | -2 · 3 · 2 | 远侧腿 x 偏移、半步幅、经过帧抬脚高 |
| `foot` | 'paw' | `paw` 爪垫 · `pad` 熊掌（3 根爪）· `hoof` 蹄 · `claw` 爪 |
| `neck` `neckA` `neckW` | 3 · 0.6 · 2.5 | 颈长、颈角（弧度，+ 抬起；马 1.0）、颈半径 |
| `head` `headA` | 'canine' · 0.15 | 头型：预设名，或 `{ type, ...覆盖 }`；吻部朝向（弧度，+ 朝下；马 0.55–0.7） |
| `tail` `tailLen` `tailA` `tailW` `tailCurl` | 'bushy' · 8 · -0.4 · 2 · 0.5 | 尾型 `bushy` 蓬尾（尖端 `m.tip`）· `thin` 细尾（`tuft` 尾尖簇）· `stub` 短尾 · `horse` 马尾 · `long` 长尾（`tailSpikes` 背刺、`spade` 铲尖）· `none`；根部角从正后方量，+ 上翘 |
| `mane` `maneLen` | 头型决定 · 3 | `none` · `ridge` 背脊鬃刺（猪、龙、豪猪）· `neck` 贴颈鬃（一片压在颈上、带深色纹，深色皮毛上几乎看不见，只适合短鬃浅色的）· `crest` 蓬鬃（= `Q.maneCrest`，立起往后扫的一排鬃束，参数写在 `o.crest`）· `ruff` 颈圈毛（狼）· `lion` 狮鬃。**没写 `mane` 时用头型预设的**：马 = `crest`，其余 = `none` |
| `crest` | null | `mane: 'crest'` 的参数，同第五节 `Q.maneCrest` 的 `c`（`len lean shag withers step mat`） |
| `forelock` | 头型决定 | 额鬃（同第五节 `Q.forelock` 的 `c`，如 `{ len: 2 }`），`draw` 在头之后画；没写时用头型预设的（马 `{ len: 2 }`，其余没有），`null` 关掉 |
| `fur` `pattern` | 1 · null | 背上毛纹；花纹 `spots` `stripes` `scales` |
| `wing` | null | `{ span, chord, type, fingers }`：有翅膀就是龙 |
| `lieLegs` | 1 | 侧躺（`lie 2`）时的腿：1 = 身体翻成肚子朝上、四条腿从上半身僵直伸出轮廓（前腿往前上、后腿往后上、远侧更竖，蹄 / 爪尖用 `claw` 材质），`draw` 把腿挪到最后画；0 = 旧画法，腿收在身下，死亡最终姿只剩一条躯干（两匹马为了保持验收通过的倒地姿显式写了 0） |

**头型预设 `B.HEADS`**：`canine` `bear` `boar`（盘状鼻 + 獠牙 + 垂耳）`horse`（长吻 + 长耳 + 默认蓬鬃和额鬃）`cat` `rat` `dragon`（后掠角 + 双牙）`lizard`。字段：`w h` 颅宽高 · `snout snH tip` 吻长 / 高 / 尖端粗细 · `ear`（`point round long droop none`）`earH` · `nose`（`dot` `disc`）· `teeth` 张嘴露牙数 · `horn`（`back bull short`）`hornLen` · `tusk` · `mane` `forelock`（这种头默认配的鬃 / 额鬃）· `face`（下表）。马的预设是 `w 6 · h 5.5 · snout 5.5 · snH 4 · tip 0.8`（以前的 `w 5 · h 5 · snH 3.5` 太窄，加白斑、笼头、额鬃任何一样，脸都会被分界线压黑）。

**面部细节的最小头**（`HEADS[type].face = [颅宽 w, 颅高 h, 吻高 snH]`，`Q.faceRoom(o)` 返回还差多少，够了返回 `null`）：

| 头型 | 预设 w · h · snH | 能加面部细节的最小 w · h · snH | 预设够不够 |
|---|---|---|---|
| `canine` | 6 · 5 · 3 | 6 · 5 · 3 | 够 |
| `bear` | 7 · 6 · 3.5 | 7 · 6 · 3.5 | 够 |
| `boar` | 6 · 6 · 4 | 6 · 6 · 4 | 够 |
| `horse` | 6 · 5.5 · 4 | 6 · 5.5 · 4 | 够（笼头也够） |
| `cat` | 6 · 5 · 3 | 7 · 6 · 3.5 | 不够，先放大 |
| `rat` | 5 · 4 · 2.5 | 6 · 5 · 3 | 不够，先放大 |
| `dragon` | 6 · 5 · 3 | 6 · 5 · 3 | 够 |
| `lizard` | 5 · 4 · 2.5 | 7 · 5.5 · 3.5 | 不够，先放大 |

「面部细节」指两类：画进头这个部件的（白斑、花纹、伤疤，紧跟 `Q.head` 画）和单独一个部件压在脸上的（笼头、额鬃、面甲、口套）。后一类会把挨着它的头部像素都压成勾线色，头小了脸就黑成一片。表里的数是逐个尺寸量出来的：头上只加一条横穿颅部的单独部件时，头部像素里基色 + 亮色 ≥ 47% 且 ≥ 18 格；同部件白斑、额鬃之后 ≥ 60%；马另要求加整套笼头后 ≥ 45%、吻部 ≥ 60% 的列还有亮像素。两匹已验收的马（6 · 5.5 · 4 和 6.5 · 6 · 4.4）都在线上，旧的默认马头不够。

**材质**：`body limb far` 必需；可选 `belly`（浅色腹线）`muz`（吻部）`mane` `tip`（尾尖）`nose` `horn` `claw`（蹄 / 爪）`teeth` `eye` `glow`；龙加 `wing bone`；马具的材质见第五节。

**姿势 P**：`gf` 步态帧 -1 站 / 0–3 · `bob` -1..1 · `crouch` 0–4 · `pitch` 前高 + / 前低 -（-3..6，6 = 人立）· `lift` 0–15 · `head` 抬 - / 低 +（-2..3）· `jaw` 0–3 · `eyes` 闭眼 · `ear` 耳贴后 · `tail` -2..2 · `mane` -1..1 · `paw` 抬近侧前爪 0–3 · `reach` 前腿前伸 -2..4 · `wing` 翼姿 0–6 · `lie` 0 站 / 1 塌下 / 2 侧躺 · `glow` 0–3（≥ 1 口里发光，≥ 2 眼发光）· `gem` 马具宝石档 0–4（第五节）。全部在 `B.quad.KEYS` 里、`reset` 全部清零；缓存键写 `B.key(P, Q.KEYS.concat(B.COMMON))` 就够（以前要另加的 `Q.TACK_KEYS` 现在是空数组，留着只为兼容旧写法）。

**步态**：对角两腿一组（A = 近前 + 远后，B = 远前 + 近后）。`gf` 0 接触 A（A 前伸 `stride`、B 后蹬）→ 1 经过（B 抬 `lift` 格、前移 1 格）→ 2 接触 B（互换）→ 3 经过（A 抬起）。前腿抬起时腕往前拱、后腿是 膝前 / 跗后 的狗腿；远侧腿整条暗一级、错开 `farDx` 格。够不着地的脚（人立、跳扑）自动悬空。

**rig 挂点**：`C1`（胸 {x, y, r}）`C2`（臀）`legs[4]`（{front, far, T 腿根, F 脚}，按画的顺序：远后、远前、近后、近前）`NB NT`（颈根 / 颈顶）`head {x, y, a, W, Hh}` `mouth` `eye` `tail`（尾根）`wing`（翼根）`hit`（受击点）`top`（最高点，给特效用）。

**几何只有一份**：躯干外形是 `Q.span(rig, o, x)`（第 x 列的 `[上沿 y, 下沿 y]`），`quad.body` 就是按它逐列填的；头的形状是 `Q.headFrame(rig, o, jaw)`（颅椭圆 `skull`、吻部上下沿 `prof`、张嘴下移 `gap`、头顶 / 下颌 `top bot`），`quad.head` 就是按它栅格化的。马具和角色自己画的脸部细节都用这两个函数，头型、体型改了自动跟着走（第五节）。

**部件与推荐顺序**（`B.quad.draw` 就是这个顺序）：

| 顺序 | 部件 | 说明 |
|---|---|---|
| 1 | `B.wing(E, rig.wing.x + 2, rig.wing.y - 1, P.wing, o.wing, o.m, 1)` | 远翼（龙） |
| 2 | `legs(E, rig, P, o, 1)` / `leg(E, rig, P, o, i)` | 远侧两条腿（每条腿一个部件，函数里自己调 `part()`） |
| 3 | `tail` | 尾（在臀后） |
| 4 | `ridge` | 背脊鬃刺：画在躯干前，只露出伸出背线的部分 |
| 5 | `body` | 躯干 + 颈（一个部件；腹线、毛纹、花纹） |
| 6 | `legs(E, rig, P, o, 0)` | 近侧两条腿（压在躯干上，自动有分界线） |
| 7 | `B.wing(..., 0)` | 近翼 |
| 8 | `mane` | 贴颈鬃 / 蓬鬃（`crest` 交给 `Q.maneCrest`）/ 颈圈毛 / 狮鬃 |
| 9 | `head` | 头（颅 + 吻 + 耳 + 眼 + 眉 + 鼻 + 牙 / 嘴线；张嘴下颚往下开） |
| 10 | `Q.forelock`（`o.forelock` 有值时） | 额鬃（单独部件，压在额头上） |
| 11 | `horn` | 角 / 獠牙（骨白，单独部件） |

侧躺伸腿（`lie 2` 且 `lieLegs 1`）时，第 2、6 步的腿挪到最后（远侧先、近侧后）：肚子朝镜头，腿在最前面。

## 五、四足马具 / 马铠（战马、坐骑、驮兽；挂在 `B.quad` 上）

黄鬃马、汗血马（`chars/YellowManeHorse.js`、`SweatBloodHorse.js`）的身体全部由 `quad` + 这一节的部件拼成，模块只画面部白斑、血汗珠和特效；新的坐骑 / 战马 / 驮兽照它们写。

**约定**

- 签名同 `quad` 的部件：`(E, rig, P, o, c)`，`c` 是这个马具的参数对象（`c` 为空就什么也不画）。每个都自己调用 `E.part()`（顶饰羽另起一个部件）。
- 材质按**键名**从 `o.m` 里取：在 `B.mats` 的 spec 里多写几个键（`cloth trim plate rim boss strap emb gem glow plume plumeTip white …`），参数里写键名（如 `face: 'plate'`）。大块的布（毡衣、长马衣）建议之后改成 band 2：`m.cloth = E.defMat(E.RAMP.steel, 2)`。
- 读 P：`P.mane`（布料下摆、鬃、羽、额鬃跟着摆）、`P.gem`（宝石档，已在 `quad.KEYS / reset` 里）、`rig.lie`（侧躺时笼头、额鬃不画，毛脚只画腿，顶饰羽顺着地面往后倒）。
- 宝石 / 盾心是发光体：模块在 `poseAt` 里用 `Q.peytralAt(rig, o, c)` 算焦点 `P.gx / gy`，并把 `m.glow m.gem` 放进 `GLOW_MATS`、`RIM.skip`。

**几何（和 `quad.body / quad.head` 同一份）**

| 函数 | 作用 |
|---|---|
| `Q.span(rig, o, x)` | 躯干第 x 列 `[上沿 y, 下沿 y]`（不在躯干上返回 `null`）；含收腹、肩峰、侧躺压扁。背毯、肚带、胸带都贴着它画 |
| `Q.headFrame(rig, o, jaw)` | 头部局部坐标（u 沿吻部朝向、v 垂直向下，原点在颅心）：`at(u, v) → [x, y]` · `top(u) / bot(u)` 头顶 / 吻背、下颌 / 吻底的 v · `skull(u, v)` 在颅内 · `prof(u)` 吻部 `[上沿, 下沿, 嘴线]` · `gap(u)` 张嘴下移 · `uT` 吻尖 · `u0` 吻根 · `uc` 下颚铰点 · `W Hh` 颅半宽 / 半高 · `vc` 吻中线。`jaw` 缺省 0（按闭嘴算下沿）。例：白斑 `F.at(u, F.top(u) + 1)`（吻背往下 1 格） |
| `Q.scanHead(F, ext, fn)` | 按头部局部坐标扫一遍像素：`fn(x, y, u, v)`（面甲就是这么填的） |
| `Q.faceRoom(o)` | 头够不够大加面部细节（第四节的表）：够 → `null`，不够 → `[还差的 w, h, snH]` |

**部件**

| 部件 | 参数 `c`（括号里是缺省值） | 画在 |
|---|---|---|
| `Q.blanket` 背毯 / 鞍褥 / 绗缝毡衣 / 长马衣 | `a`（0.05）`b`（0.85）沿 臀心 0 → 胸心 1 的起止（可超出 0–1）· `drop`（5）从背线往下垂几格（超过腹线就是长马衣）· `thick`（1）盖在背上的厚度 · `mat`（'cloth'）· `trim`（'trim'，下摆和两端镶边；`null` 不镶）· `hem` 下摆 `straight` 平 · `scallop` 波浪 · `dag` 尖齿 · `fringe` 流苏 · `quilt` 0 / 1 菱格绗缝 · `emblem` 徽记（`Q.EMBLEMS` 的名字）+ `emb`（徽记材质键，缺省 trim）+ `embX`（0.5，横向位置）· `roll`（0）后端铺盖卷半径 + `rollMat`（'strap'）· `girth` 肚带位置 0–1（`null` 没有；材质 `strapMat`，缺省 'strap'）。下摆随 `P.mane` 甩 | 近侧腿之后 |
| `Q.peytral` 胸盾 / 胸前挂盾 | `shape` `round` 圆盾（`r` 4）· `heater` 鸢尾盾（`w` 7 · `h` 9）· `fx`（0.55）盾心在胸圆心前 `fx × 胸半径` · `dx dy`（0 · 1）微调 · `face`（'plate'）盾面 · `rim`（'rim'）盾边 · `boss` 0 / 1 盾心 3×3 铆钉（'boss'）· `gem` 0 / 1 盾心十字宝石（读 `P.gem`）· `emblem emb` 徽记 · `strap` 0 / 1 胸带（盾上沿斜拉到鬐甲，材质 `strapMat`）· `at [x, y]` 直接给盾心（掉落时用，不跟胸走）· `flat` 0 / 1 倒在地上画成扁的一条 | 背毯之后、鬃之前 |
| `Q.peytralAt(rig, o, c)` | 同一套参数 → 盾心 `[x, y]`（宝石、轮廓光、特效挂点） | — |
| `Q.bridle` 笼头 | `mat`（'strap'）皮带 · `ring`（'rim'）衔环 · `nose`（2.2）鼻带离吻尖几格。鼻带 + 颊带 + 额带 + 衔环；侧躺不画 | 头之后 |
| `Q.chamfron` 面甲 | `from`（-0.4）护额从 `u = from × W` 开始 · `nose`（1.5）离吻尖留几格 · `thick`（1.5）· `mat`（'plate'）· `trim`（'trim'，下沿镶边；`null` 不镶）· `gem` 0 / 1 额心宝石 1 格（读 `P.gem`）· `spike`（0）额前独角刺长（'horn'）· `plume`（0）顶饰羽长（材质 `plumeMat` 缺省 'plume'，羽尖 'plumeTip'）+ `strands`（3）羽数。眼孔自动留出；顶饰羽随 `P.mane` 摆、是单独部件 | 头、笼头、额鬃之后 |
| `Q.legFeather(E, rig, P, o, i, c)` / `Q.legsFeather(E, rig, P, o, far, c)` | 带毛脚的腿（挽马、牦牛），**替代** `quad.leg / legs`：`len`（2）毛高 · `mat`（'mane'，远侧自动用 `maneFar`）。先调 `quad.leg`（它开头自己调 `part()`），毛紧跟着画、不再调 `part()`，所以毛和腿是同一个部件、没有分界线；侧躺只画腿 | 替代腿的位置 |
| `Q.maneCrest` 蓬鬃 / 飘鬃 | `len`（4）鬃束长 · `lean`（0.5；0 = 垂直颈线立起，1 = 完全往后扫成飘鬃）· `shag`（1.5）长短参差 · `withers`（1）鬃一直长到鬐甲后几格 · `step`（1.2）鬃束间距 · `mat`（'mane'）。尖端亮色、隔一束一道暗纹，随 `P.mane` 摆。**马的默认鬃**：`o.mane` 没写时 `quad.draw` 用它（参数 `o.crest`） | 躯干后、头前 |
| `Q.forelock` 额鬃 | `len`（3）· `mat`（'mane'）。从两耳之间往前盖到额头，末端随 `P.mane` 摆；侧躺不画。马的预设带 `{ len: 2 }` | 头之后 |
| `Q.gem(E, x, y, lv, m, small)` | 十字 5 格宝石（`small` 1 = 只画中心 1 格）；`lv` 0 暗 · 1 亮 · 2 很亮 · 3 爆闪 · 4 熄灭（通常传 `P.gem`）；材质 `m.gem`（4 级）+ `m.glow`（平涂亮芯） | 所在部件里 |
| `Q.EMBLEMS` | 5×5 徽记：`shoe` 马蹄铁 · `cross` 十字 · `ring` 环 · `sun` 日轮（`blanket / peytral` 的 `emblem`） | — |
| `Q.TACK_KEYS` | 空数组。`gem` 已并进 `quad.KEYS` / `reset`，旧模块里的 `concat(Q.TACK_KEYS)` 可以删掉 | — |

**推荐顺序**（两匹马的 `drawHero`）：远侧腿 `legsFeather(…, 1)` → 尾 → 躯干 `body`（+ 紧跟着画的血汗珠）→ 近侧腿 `legsFeather(…, 0)` → 背毯 / 马衣 `blanket` → 胸盾 `peytral`（没掉落时）→ 蓬鬃 `maneCrest` → 头 `head`（+ 紧跟着画的白斑）→ 额鬃 `forelock` →（笼头 `bridle`）→ 面甲 `chamfron`（+ 顶饰羽）→ 掉落中 / 落地的胸盾 `peytral({ at, flat })`。

**死亡**：盾用第三节的掉落物钩子 —— `Q.anim.death(P, d, f12, { at: 0.66, dur: 0.25, dx: 13, hop: 5 })`，`P.drop` 非 0 时不画挂在胸前的盾、改在 `at: [起点 + P.dsx, …]` 画，`P.drop === 2` 时 `flat: 1`；宝石档在死亡里逐帧闪到 4（熄灭）。

## 六、飞行 `B.fly`（飞禽、蝙蝠）

**形体**：`alt` 身体离地高（12）· `rx ry` 身体半径 · `head` `bird | bat` · `hr` 头半径 · `beak beakH hook` 喙长 / 高 / 钩 · `crest` `null | comb（鸡冠 + 肉垂，m.crest）| tuft（羽簇）` · `earH` 蝠耳高 · `tail` `fan | fork | none`、`tailLen` · `wing { span, chord, type, fingers }` · `legLen` `talon`。
**材质**：`body limb far`；可选 `head`（头色，如白头鹰）`belly`（胸腹）`feather`（羽翼、尾羽）`wing bone`（膜翼）`beak` `leg` `crest` `inner`（蝠内耳）`nose`。
**姿势**：`gf` 扑翼帧 -1..3（≥ 0 时翼姿由 `B.FLAP` 决定）· `wing` 0–6（`gf = -1` 时用）· `bob` -2..2 · `lift` 0–31（`lie 1` 时 = 离地高度，坠落用）· `pitch` 俯冲 + / 仰 -（-2..3，身体整体转）· `head` · `jaw` 张喙 0–2 · `eyes` · `tail` · `legs` 0 收 / 1 垂 / 2 前抓 · `lie` 0 飞 / 1 坠落 / 2 落地 · `glow`。
**rig**：`C {x, y, a}` `head {x, y, r}` `wing`（翼根）`tail` `legs` `mouth` `eye` `hit` `top`。
**顺序**（`draw`）：远翼（错开 2.5, -1.5）→ 尾 `tail` → 腿 `legs` → 身体 `body` → 近翼 → 头 `head`（头在翼根前，扑翼时不被挡住）。
**读得出身体**：膜翼（`m.wing`）和身体（`main`）用明暗、冷暖都拉开的两个色阶（吸血蝠：浅棕毛身 + 浅色胸腹 `belly` + 深酒红膜翼），`wing.chord` 别太大（翼根贴背太长会把身体盖住，蝙蝠 3）。
**移动**：不落地；4 帧扑翼（上扬 → 平展 → 下压 → 回收）+ 身体起伏，`fxBack` 里用 `B.util.shadow` 画地面影子。

## 七、多足 `B.bug`（蜘蛛、蟹、蝎、甲虫）

**形体**：`n` 每侧腿数（4）· `rx ry` 头胸半径 · `under` 离地 · `abd { rx, ry, dx, dy } | null` 腹 · `head { rx, ry } | null` · `span` 脚展 · `knee` 膝比背高（负数 = 膝低于背，蟹、蝎）· `farDx` `stride` `lift` `lw` · `claws { len, size } | null` 螯 · `tail { n, seg, r } | null` 蝎尾 · `eyes` 眼数 · `stalks` 眼柄高 · `fangs` 螯肢 · `mark` 腹部花纹 `hourglass | bands | spots` · `hair` 腿毛 · `legsFront` 近侧腿画在身体前（1；0 = 腿都在身体后面：蟹、蝎的腿从壳下伸出，蜘蛛也用 0，身体才是干净的一整块）· `fan` 中间几条腿往外推（0 = 脚距均匀；1 = 中腿也伸到约 ±0.55 脚展，每条腿在剪影里都是一道拱，不会挤成一排竖线）· `kneeOut` 膝在 腿根 → 脚 之间的位置（0.45）。
**1 倍大小读得出蜘蛛**（演示 v7）：腿画在身体后（`legsFront 0`）、腿比腹亮一级（`B.mats` 的 `limb`）、`fan 1` + 低膝（`knee 3`）+ 远侧腿错开 2 格，腹部是一整块带花纹的圆，腿是前后两组拱。
**材质**：`body limb far claw`；可选 `shell`（螯）`mark` `glow`（眼 / 毒囊亮）`eye`。
**姿势**：`gf` · `bob` · `crouch` 0–3 · `pitch` 前抬 0–3 · `lift` · `claw` 螯张开 / 举起 0–3 · `tail` 蝎尾 0 竖起 / 1 后拉 / 2–4 前刺 · `jaw` 螯肢 0–2 · `glow` · `lie` 0 / 1 腿软摊开 / 2 翻倒腿蜷起。
**步态**：交替三角（本库按侧视简化为 A = 近侧 0、2 号 + 远侧 1、3 号，B = 其余），接触帧两组前后互换、经过帧抬起一组。
**rig**：`T`（头胸）`A`（腹）`Hd`（头）`legs[]`（{far, i, B 根, K 膝, F 足}）`claw {B, E, H}` `tail {pts, a}` `mouth` `eye` `hit` `top`。
**顺序**（`draw`）：远螯 `claw(…, 1)` → 远侧腿 `legs(…, 1)` →（`legsFront 0`：近侧腿，每条腿一个部件）→ 身体 `body`（腹 + 花纹 → 头胸 → 头 + 眼群 / 眼柄 + 螯肢）→ 蝎尾 `tail` →（`legsFront 1`：近侧腿）→ 近螯 `claw(…, 0)`。

## 八、软体 / 漂浮 `B.blob`（漂浮眼、幽魂、章鱼、史莱姆、蜗牛）

**形体**：`r` 半径 · `alt` 悬浮高（0 = 贴地）· `shape` `orb` 球 | `dome` 贴地圆顶 | `slug` 蛞蝓 / 蜗牛 · `eye { n: 1 | 2, r } | null` · `tent { n, len } | null` 触须 · `wisp` 幽魂尾长 · `shell` 螺壳半径 · `mouth` `null | teeth | smile` · `spikes` 顶刺数 · `drip` 底边滴液 · `stalk` 眼柄高（蜗牛）。
**材质**：`body limb far spec`；可选 `sclera`（巩膜，缺省用 teeth）`iris`（虹膜）`glow` `shell` `horn`（顶刺）`teeth`。
**姿势**：`gf` · `bob` -2..2 · `sq` 压扁 + / 拉高 -（-2..2）· `lift` 0–31（`lie 1` 时 = 离地高）· `ix iy` 看的方向 -3..3 · `lid` 眼睑 0–4 · `pup` 瞳孔 0 细 / 1 圆 / 2 放大 · `jaw` · `tph` 触须相位 0–7 · `tmode` 触须形态 0 垂 / 1 后拖 / 2 卷 / 3 前伸 / 4 摊地 / 5 张开 · `lie` 0 / 1 下坠 / 2 摊成一滩 · `glow`。
**移动**：漂浮的上下飘 `[0, -1, -2, -1]` + 触须后拖；贴地的 `anim.walk(P, tq, true)` 压扁 / 拉高交替，蛞蝓足沿波纹随 `gf` 前移。
**rig**：`C {x, y, rx, ry}` `head`（蛞蝓）`eye` `tents[]` `shell` `mouth` `hit` `top`。
**顺序**（`draw`）：背侧触须 `tents(…, 0)` → 幽魂尾 `wisp` → 身体 `body` → 螺壳 `shell`（死亡时留下空壳）→ 眼 `eye` → 嘴 `mouth` → 前侧触须 `tents(…, 1)`。

## 九、蛇 / 蠕虫 `B.serpent`

**形体**：`n` 贴地身长 · `r rTail` 身体 / 尾尖半径 · `arch waves` 拱起高、波数 · `rise` 前段竖起高 · `neck` 颈前伸 · `head` `snake | worm` · `hl hh` 头长 / 高 · `hood` 兜帽宽 · `bands` 环节间距（蠕虫）· `belly` · `scales` 背鳞纹 · `spikes` 背刺。
**材质**：`body limb far`；可选 `belly` `mark`（背纹 / 兜帽纹）`tongue`（信子）`teeth` `glow`。
**姿势**：`gf` 波相 -1..3 · `bob` · `rise` 竖起增减 -8..6 · `strike` 头前刺 0–6 · `jaw` 0–3 · `tongue` 吐信 0–2 · `eyes` · `hood` 0–2 · `lie` 0 / 1 瘫软 / 2 贴地摊直 · `glow`。
**移动**：身体拱峰随 `gf` 往前移（爬行 / 蠕动的「步态」），前段起伏。
**rig**：`pts`（脊点 [x, y, r] × n）`head {x, y, a}` `neckTop` `mouth` `eye` `hit` `top`。
**顺序**（`draw`）：身体 `body`（一个部件：腹、鳞纹 / 环节、背刺）→ 兜帽 `hood` → 头 `head`（蛇：楔形头 + 眼 + 张嘴 + 信子；蠕虫：圆口 + 一圈牙）。

## 十、完整拼装例子（最小四足模块）

```js
PCD.define('GrayWolf', (E) => {
  const { Sprite, begin, bake, q12, f12of, walkDemo, FXI, FXR, IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, INCOMING, DEFAULT_DUR, ease, clamp01 } = E;
  const B = E.parts.beast, Q = B.quad;
  const m = B.mats(E, { main: [27, 28, 59, 60], mane: [28, 59, 60, 17], tip: 'pale', eye: [0, 0, 22, 21] });
  const o = Q.shape({ len: 12, chest: 4.5, rump: 3.8, leg: 7, neck: 3, neckA: 0.55, head: 'canine', tail: 'bushy', tailW: 4, tailA: -0.9, mane: 'ruff', maneLen: 1, m });
  const DUR = DEFAULT_DUR.slice(), EL = FXR[FXI.frost], hero = new Sprite(104, 70, 52, 64), P = {}; Q.reset(P);
  const HIT_POINT = Q.rig(P, o).hit;                                                   // 站姿的受击点
  const SPEC = Q.KEYS.concat(B.COMMON), RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  let rig;
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T); Q.reset(P);
    if (st === IDLE) { const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); if (lp >= 1.6 && lp < 2) { P.head = -1; P.ear = 1; } }   // 待机个性：抬头竖耳
    else if (st === MOVE) { Q.anim.walk(P, tq); const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) { if (tq >= 2 / 12 && tq < 0.25) { P.bx = 5; P.reach = 2; P.jaw = 3; } else if (tq < 2 / 12) { P.crouch = 1; P.head = 1; } }   // 本角色独有：扑咬
    else if (st === HURT) { if (tq >= INCOMING) Q.anim.hurt(P, tq - INCOMING); }
    else if (st === DEATH) { if (tq >= INCOMING) Q.anim.death(P, tq - INCOMING, f12); }
    // CHARGE / CAST / RECOVER：本角色的技能姿势（见 _beast-demo.js 的 pose.chg / pose.cast）
    rig = Q.rig(P, o); P.gx = Math.round(rig.mouth[0]) + P.bx; P.gy = Math.round(rig.mouth[1]); B.key(P, SPEC);
  }
  function drawHero() { begin(hero, P.bx, 0); Q.draw(E, rig, P, o); }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }
  return { name: '灰狼', HX: 70, R_EL: FXI.frost, DUR, hero, P, HIT_POINT, poseAt, drawHero, bakeHero };
});
```

要换部件顺序（例如某只兽的鬃毛盖住头）就不用 `Q.draw`，照第四节的表逐个调用（马具照第五节）；缺部件（龟壳、三个头、机枪手）在模块里自己画一个 `part()`，通用的再补进本库。

## 十一、演示 `_beast-demo`（`view.html?c=_beast-demo&v=N`）

| v | 生物 | 骨架 | 要点 | 攻击 / 技能 |
|---|---|---|---|---|
| 0 | 灰狼 | quad | canine、蓬尾、颈圈毛 | 扑咬 / 仰头长嚎（寒霜冲击环 + 减速） |
| 1 | 棕熊 | quad | bear、肩峰、熊掌、短尾 | 人立挥掌 / 人立猛砸（地裂 + 地浪 + 眩晕） |
| 2 | 獠牙野猪 | quad | boar（收尖的吻、矮一点的头）、前重后轻的楔形（大肩峰、小臀、收腹、低头）、背脊鬃刺、蹄、卷尾 | 低头顶 / 刨地冲撞（跑步冲 18 格） |
| 3 | 汗血马 | quad | 默认马头（蓬鬃 + 额鬃）、长腿、马尾、蹄 | 前踢 / 人立踏地（圣光地浪 + 光柱） |
| 4 | 赤龙 | quad + wing | dragon、膜翼、鳞纹、长尾背刺铲尖 | 火弹 / 吐息（光束 + 火流） |
| 5 | 雷鹰 | fly | 羽翼、白头、钩喙、羽簇、扇尾 | 俯冲抓击 / 张翼扑风（三道风弹） |
| 6 | 吸血蝠 | fly | 浅棕毛身 + 浅色胸腹 + 深酒红膜翼、大尖耳、獠牙 | 扑咬 / 尖啸（声波环 + 吸血） |
| 7 | 魂蛛 | bug | 腿画在身体后、腿比腹亮、腿成前后两组拱（`fan`）、腹部花纹、眼群、螯肢 | 咬 / 吐网（网弹 + 网线 + 减速） |
| 8 | 钳蟹 | bug | 宽壳、眼柄、大螯、腿在壳下 | 夹 / 吐泡 |
| 9 | 毒尾蝎 | bug | 螯、分节蝎尾 + 毒囊 | 尾刺 / 毒刺（毒雾 + 中毒） |
| 10 | 深渊之眼 | blob | 漂浮球、大眼、触须、顶刺 | 凝视光束 / 诅咒光束 |
| 11 | 酸液蜗牛 | blob | slug、螺壳、眼柄 | 吐酸 / 酸液地浪（死亡留空壳） |
| 12 | 眼镜蛇 | serpent | 竖起、兜帽、信子 | 前刺咬 / 吐毒 |
| 13 | 赤蠕虫 | serpent | worm、环节、圆口牙圈 | 前扑咬 / 竖起砸地（地裂 + 下陷） |

四足变体（0–4）的死亡最终姿是侧躺伸腿（`lieLegs 1`）。

自检：每个 v 都用 `shoot.mjs` 输出到 `convert/_beast-demo/v<N>`（退出码 0）；`frames.mjs --contact convert/_beast-demo/contact.png …` 看关键帧；`compare.mjs --all convert/_beast-demo` 查变体之间不撞脸。

## 十二、还没做的

- 机械三种（机甲步行、旋翼、攻城器械）、塔 / 固定物、树：结构互不相同、每种 2–6 个，建议先各做一个模块，重复出现的部件（轮子、旋翼、炮管、塔身）再抽进本库。
- 半人马：`quad` 下半身 + `parts.js` 的人形上半身（颈位置 `rig.NB` 当腰）；刻耳柏洛斯的三个头：`head` 部件按不同 `rig.head` 偏移调三次。
- VoidManta 这类扁身体的「鳍翼」可以在 `B.wing` 加一个 `type: 'fin'`；骨龙需要骨架画法的躯干。
