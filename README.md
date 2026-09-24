# 午夜机台

像素风地下基地 Roguelite，整个游戏打包成一个 HTML 文件，浏览器直接打开就能玩。

- 在线游玩：https://vinaygaochuan.github.io/midnight-cabinet/
- 本地游玩：下载 `index.html`，双击打开。

## 目录结构

| 路径 | 内容 |
|---|---|
| `index.html` | 构建产物（GitHub Pages 直接发布它，不要手改） |
| `src/*.js` | 游戏源码，按 `src/_order.txt` 的顺序拼接成一个脚本 |
| `src/template.html` | 界面模板（DOM 结构和数据绑定） |
| `src/mimg.js` | `<m-img>` 自定义元素（像素图显示） |
| `tools/mk.py` | 构建：拼接源码 → Node 语法检查 → 打包进 `index.html` |
| `tools/build.py` | 打包器：把脚本和模板压进单文件 bundle |
| `tools/shell.html` | 打包外壳（内含 React 等运行时资源，不要手改） |
| `tools/bot.js` | 自动游玩回归机器人 |
| `tools/sim.js` | 战斗模拟辅助 |
| `tools/upload.py` | 本地截图接收服务（调试用，截图存到 `.ai/shots/`） |
| `tools/tele_analyze.py` | 玩法数据分析：读入采集数据，输出难度 / 经济 / 体验报告 |
| `tools/artifact.py` | 把 `index.html` 转成 Claude Artifact 页面（数据自动上传版） |

## 开发流程

需要 Python 3.8+ 和 Node.js 16+（Node 只用来做语法检查）。

```bash
python3 tools/mk.py            # 生成 index.html
python3 -m http.server 8000    # 本地起服务，打开 http://localhost:8000/
```

改完 `src/` 后重新运行 `tools/mk.py`，把 `src/` 和新的 `index.html` 一起提交。推送到 `main` 后，GitHub Pages 大约 1 分钟后更新在线版本。
`index.html` 是生成文件，合并冲突时不要手工合并它：先合并 `src/`，再重新构建一次即可。

## 代码结构

每个模块是一个立即执行函数，通过全局对象 `window.MC`（代码里叫 `M`）共享数据，通过 `M.Game.prototype`（代码里叫 `G`）挂游戏方法。
后面的模块经常“包装”前面的函数（先保存旧函数，再定义新函数并在里面调用旧函数），所以 `_order.txt` 的顺序就是功能叠加的顺序，调整顺序要小心。

| 模块 | 负责 |
|---|---|
| `mc-data.js` `mc-data2.js` `mc-data3.js` | 数据表：英雄、天赋、建筑、世界、品质、存档结构 |
| `mc-db.js` `mc-units.js` | 部队与特性数据库、部队提示、战旗 |
| `mc-hdart.js` `mc-pixel.js` `mc-hidpi.js` | 矢量精灵、像素化管线（PX=2，逻辑画布 1920×1080）、高分屏 |
| `mc-icons.js` | 图标库与标签系统（种族 / 职业 / 建筑风格 / 建筑功能） |
| `mc-engine.js` `mc-fx.js` | 引擎基础、音效、特效层、后期 |
| `mc-battle2.js` `mc-battle3.js` `mc-battle4.js` | 战斗模拟、技能、施法演出、平衡参数 `M.BAL` |
| `mc-world2.js` | 出征地图生成与行走 |
| `mc-base.js` `mc-rooms.js` | 基地渲染、48 种建筑插画 |
| `mc-game-a.js` … `mc-game-m.js` | 游戏流程与界面（a 主循环，b 基地操作，c 出征 / 事件 / 商店，d 视图，e 面板，之后是逐轮叠加的功能层：提示、输入、标签、天赋树、回城仪式、日期仪式、自动运镜） |
| `mc-mini-a.js` … `mc-mini-d.js` | 28 个事件小游戏（框架在 `mc-mini-a.js`） |
| `mc-meta-a.js` `mc-meta-b.js` | 局外：存档、家具、成就、基地核心、图纸规则、房间场景 |
| `mc-names.js` `mc-bp.js` | 统一命名「名字（品质）」、建筑信息三段式；图纸有效性判断 |
| `mc-terrain.js` | 特殊地格：22 种、四档品质、越深越稀有；任何房间都生效的效果 + 契合房间的额外能力；深层地脉挖到旁边才勘明 |
| `mc-tele.js` | 玩法数据采集 |

界面模板语法：`{{表达式}}` 绑定视图数据，`<sc-if value>` 条件渲染，`<sc-for list as>` 列表，`sc-camel-on-click` 等绑定事件，`data-tip` 自动悬浮提示，`data-fx` 标记飞行动画落点。

## 约定

- 界面文字用中文。
- 新美术统一走像素管线：在 1920×1080 逻辑坐标里画，按半分辨率渲染后放大。
- 存档键：`midnight-cabinet-meta-v3`（一局）、`midnight-cabinet-profile-v1`（局外）、`midnight-cabinet-settings-v1`（设置）。存档结构不兼容时换新键名。

## 测试

在浏览器控制台里：

```js
const s = document.createElement('script'); s.src = 'tools/bot.js'; document.head.appendChild(s);
// 加载后运行 90 秒自动游玩，返回战斗、事件、结算、报错统计
await __bot(90)
```

运行时错误会收集在 `window.__mcErrs`。

## 玩法数据采集

`src/mc-tele.js` 在游戏里自动记录玩法事件（只有玩法数据，不含个人信息），分批保存：

| 运行环境 | 数据去向 |
|---|---|
| Claude Artifact 版（`tools/artifact.py` 生成，发布时声明 `db` 能力） | 自动上传到 Artifact 的共享数据库，集合名 `tele`，一批一个文档 |
| GitHub Pages / 本地文件 | 保存在浏览器本地；设置面板 →「数据采集」→ 复制数据 / 下载数据 |
| 任意环境，设置了 `localStorage['mc-tele-endpoint']` | 额外 POST 到这个地址 |

每个事件都带 `k`（类型）、`t`（会话内毫秒）、`day`、`g`（第几局）、`s`（当前界面），批次带 `build`（源码内容哈希，`tools/mk.py` 自动注入）、`did`（匿名设备号）、`sid`（会话号）。
主要事件：`session` `game_start` `game_over` `day` `run_start` `run_end` `node` `battle_start` `battle_end` `shop` `buy` `mini_start` `mini_end` `chest` `build` `craft` `hero_new` `talent` `raid_start` `raid_end` `furn` `ach` `error` `perf`。

分析：

```bash
python3 tools/tele_analyze.py 数据1.json 数据2.json --out report.md --json metrics.json
```

输入可以是游戏导出的文件、批次数组，或 Artifact 数据库的导出；重复的批次会自动去重。加 `--build <id>` 只看某个版本。
报告开头的「结论速览」会自动标出偏离设计目标的地方（例如前 5 天普通战胜率低于 85%、出征阵亡率高于 35%、每次出征带回图纸少于 1 张）。
