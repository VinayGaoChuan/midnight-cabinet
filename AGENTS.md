# 午夜机台 · 协作规则（Claude Code 与 Codex 共用）

1. **设计文档**：`docs/design.md` 是唯一的策划文档。任何设计改动（规则、系统、关键数值、新增元素）都要在**同一次提交**里改这份文档；不新建设计文档、不留旧版本。
2. **新增元素**：图标、标签、资源、按钮、数值等新元素，要同时补 `src/mc-guide.js` 的 `CONCEPTS`（初见说明卡）、悬浮说明，和 `docs/design.md` 的对应章节 / 附录。说不清用途的元素不加。
3. **界面文字**：遵守 `docs/design.md` §11，尤其 §11.1b 文案规则：只说眼前这个东西是什么、做什么，一句话；不讲系统规则、不写标题已有的类别、不重复屏幕上已有的信息、不写操作教学。游戏里没有 Ctrl 详情层（已全部删除），信息直接显示或者不显示；部队只显示职业、战斗力和一句话，职业悬浮只说「该职业擅长……」（§7.3）。改完用 `tools/textaudit.js` 量一下。
4. **角色与技能**：改 `src/mc-px16-cast.js` / `src/mc-px16-fx.js` 后运行 `node tools/gen-prompts.js`，重新生成 `docs/prompts/`。
5. **表现效果清单**：`docs/effects.md` 列出所有有表现效果的单元（给打磨的同学用）。加减单位、技能、小游戏、建筑、道具、音效后运行 `node tools/gen-effects.js`；新增全屏演出或动效时手动补进对应小节。
6. **构建与验证**：`python3 tools/mk.py` 生成 `index.html`；浏览器里跑 `tools/bot.js`（`viewErrs` 必须为 0）；加载 `tools/designcheck.js` 后 `await __designCheck()` 必须 `ok: true`。
7. **存档与日志**：存档只在玩家自己的设备上（浏览器 localStorage / Steam 用户数据目录），永远不提交到 git；导出的日志、遥测数据放 `.ai/`。
