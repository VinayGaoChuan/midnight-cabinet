# 翻译说明（给译者，人或 AI）

游戏用中文写成，其他 30 种语言都是词典：`src/i18n/<语言>.js`，由 `tools/i18n.py pack` 从译稿生成，**不要手改**。流程见 `tools/i18n.py` 开头。

## 每一条怎么译

- **原文是屏幕上的一句（或一个词）**：按原文的意思和语气译，**不要加解释**。原文很短、很直接（设计规则 §11.1b：只说这个东西是什么、做什么，一句话），译文也要短——很多文字挤在按钮、卡片、血条旁边，越长越容易挤不下。能用一个词就不用一句话。
- **占位符原样保留**：`{0}` `{1}` 是数字，`{e0}` `{e1}` 是界面填进去的值（名字、数字、图标）。每个占位符都要出现，一个不多一个不少；位置可以按这门语言的语序挪。
- **标点用这门语言的**：中文的「」译成这门语言的引号（英文 “ ”，德文 „ “，法文 « »，日文保留「」）；中文的顿号、全角冒号换成这门语言的写法。
- **专有名词**：首领、部队、建筑、宝物、奇遇的名字要意译成有味道的名字（「守钟人」→ Bell Keeper，不是 Zhong Shouren）；同一个名字在所有地方用同一个译法（见下面的术语表）。
- **游戏名**：正文里写「午夜机台」的地方译成这门语言的名字（英文 Midnight Cabinet）；标题画面上的「午夜机台」四个字是画出来的标志，不在词典里。
- **单个汉字**、**只有标点的碎片**：原样照抄就行（它们是拼句子时的零件）。
- 不确定的：宁可直译得短，也不要编内容。

## 核心术语（中文 → English；其他语言以英文为参照、按中文原意译，全文统一）

| 中文 | English | 说明 |
|---|---|---|
| 午夜机台 | Midnight Cabinet | 游戏名 / 那台老虎机 |
| 机台 | the Cabinet | 局外的那台机器 |
| 领袖 | Leader | 玩家的化身，只有一个 |
| 部队 | troops / unit | 单支叫 unit |
| 驻军 | Garrison | 留在基地守夜的部队 |
| 出征 | Expedition | 白天去异世界 |
| 撤离 / 撤离点 | Extract / Extraction point | |
| 凯旋 | Homecoming | 回基地时选一支部队带回 |
| 混沌来袭 | Chaos Assault | 每天夜里的守城 |
| 强敌来袭 / 首领来袭 | Elite Assault / Boss Assault | |
| 主基地 | Keep | 地面上被攻打的那座 |
| 基地 | Base | 地下 |
| 基地核心 | Base Core | 三颗心 |
| 传送门 | Portal | |
| 世界碑 / 碑 | World Stele / stele | |
| 首领 / 小首领 / 最终首领 | Boss / Mini-boss / Final Boss | |
| 精英 | Elite | |
| 夜市 | Night Market | |
| 午夜卡包 | Midnight Pack | 抽卡 |
| 积分 | Points | 出征里的钱，回基地清空 |
| 物资 | Supplies | |
| 灵魂碎片 | Soul Shards | |
| 代币 | Tokens | 局外货币 |
| 繁荣度 | Prosperity | |
| 信仰值 | Faith | |
| 图纸 | Blueprint | |
| 宝物 | Relic | |
| 纪念品 | Keepsake | |
| 天赋 | Talent | |
| 奇观 | Wonder | |
| 奇遇 | Encounter | 地图上的小游戏事件 |
| 羁绊 | Bond | 同种族 / 同职业凑数的加成 |
| 进化 / 进化链 | Evolve / Evolution line | 三支合一 |
| 战斗力 | Power | 数字旁的 ★ |
| 难度：普通 / 困难 / 噩梦 / 地狱 | Normal / Hard / Nightmare / Hell | |
| 品质：普通 / 优质 / 稀有 / 史诗 / 传说 / 神话 / 不朽 | Normal / Uncommon / Rare / Epic / Legendary / Mythic / Immortal | 「普通」也是难度名，两处同一个词 |
| 种族：人类 / 亡灵 / 野兽 / 自然 / 深海 / 异界 | Human / Undead / Beast / Nature / Abyssal / Otherworld | |
| 羁绊：纪律 / 不息 / 兽群 / 生长 / 潮涌 / 裂隙 | Discipline / Undying / Pack / Growth / Tide / Rift | |
| 职业：先锋 / 守护者 / 战士 / 圣骑士 / 射手 / 刺客 / 法师 / 牧师 / 祭司 / 召唤师 / 商人 | Vanguard / Guardian / Warrior / Paladin / Archer / Assassin / Mage / Cleric / Priest / Summoner / Merchant | |
| 领袖职业：守夜人 / 赌徒寡妇 / 驱魔修女 / 屠宰场主 / 钟表匠 / 焚尸人 | Nightwatchman / Gambler Widow / Exorcist Nun / Butcher Lord / Clockmaker / Cremator | |
| FEVER / FEVER TIME | FEVER / FEVER TIME | 不译 |
| 遗像 / 遗像墙 | Portrait / Portrait Wall | |
| 零件 / 手办 / 卡带 | Parts / Figurines / Cartridges | 机台里的东西 |
| 雾中小镇 / 精灵之森 / 废弃游乐园 / 沉没港口 / 蒸汽铸造厂 / 深夜医院 / 星舰残骸 / 地狱 / 地下赌场 | Foggy Town / Elven Forest / Abandoned Funfair / Sunken Harbor / Steam Foundry / Midnight Hospital / Starship Wreck / Hell / Underground Casino | 9 章 |
