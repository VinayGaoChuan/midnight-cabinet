# 像素角色全跑：Mac mini 这一半（第 3、4 轮）

你在 Mac mini 上，工作目录是 ~/midnight-cabinet-pcd（午夜机台仓库的 git worktree，分支 pixel-cast）。另一台机器（Yseer 的 MacBook）在跑第 1、2 轮，这里跑第 3、4 轮，两边的种族不重叠。用户明确要求用工作流（use a workflow）完成这件事。

## 要做的

1. 读 pcd/run/full-run.js（工作流脚本）和 pcd/run/wave-3.json（第 3 轮参数：精灵、自然、虚空三组，52 个角色）。
2. 用 Workflow 工具运行第 3 轮：scriptPath = /Users/dongdong/midnight-cabinet-pcd/pcd/run/full-run.js，
   args = wave-3.json 的内容，再加两个字段：
   "root": "/Users/dongdong/midnight-cabinet-pcd/pcd"，"skill": "/Users/dongdong/.claude/skills/pixel-character-design"。
3. 第 3 轮完成后：
   - 把返回结果完整存到 pcd/run/wave-3-result.json；
   - 把通过的角色的设定（plans 里对应的 key、body、build、silhouette 前 3 条、weapon、attackType、mainColors、element，文字截短到 80 字以内）追加进 pcd/cast-index.json；
   - 然后同样方式运行第 4 轮（pcd/run/wave-4.json：野兽敌人、骷髅，46 个），完成后存 pcd/run/wave-4-result.json、同样追加 cast-index.json。
4. 两轮都结束后，在 pcd/run/mini-done.txt 写一段总结：每组通过数 / 总数、没通过的角色和原因、总用时、工作流报告的 token 用量。

## 规则

- 不做任何 git 操作（提交和同步由另一台机器通过 SSH 处理）。
- 不改 pcd/lib/ 下的引擎和部件库，不改游戏源码。
- 不要自己动手做角色：全部交给工作流里的代理。工作流失败或卡住时，把错误写进 pcd/run/mini-error.txt 再决定是否用 resumeFromRunId 续跑。
- 截图脚本会开无头 Chrome；这台机器 16 GB 内存，如果看到内存吃紧导致大量失败，就把失败的组单独重跑。
