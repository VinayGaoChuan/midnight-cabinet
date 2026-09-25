export const meta = {
  name: 'pixel-cast-wave',
  description: 'One wave of the full pixel cast: per race group cast, build upgrade chains from the parts libraries, batch review, fix up to 3 rounds',
  phases: [
    { title: 'Cast', detail: 'one casting director per race group assigns non-overlapping design lanes' },
    { title: 'Build', detail: 'one builder per upgrade chain, modules on the shared engine + parts libraries' },
    { title: 'Review', detail: 'batch reviewers score groups of up to REVIEW_N characters from contact sheets and frames' },
    { title: 'Fix', detail: 'rejected characters go back to a chain builder with the blocking list (max 3 rounds)' },
  ],
}

const SKILL = args.skill || '/Users/yseer/.claude/skills/pixel-character-design'   // 另一台机器上运行时由参数给出
const ROOT = args.root || '/Users/yseer/Code/midnight-cabinet/pcd'
const A = args                       // { wave, groups: [{ id, title, chars: [roster 条目 + batch], chains: [[key...]] }], reviewN }
const INDEX = `${ROOT}/cast-index.json`   // 已通过角色的设定摘要（key、体型、识别特征、武器、配色、元素），每轮结束后追加
const MAX_ROUNDS = 3
const REVIEW_N = A.reviewN || 5

const ENV = `环境：
- 共享引擎 ${ROOT}/lib/pcd.js（只读）、说明 ${ROOT}/lib/README.md；查看页 ${ROOT}/view.html?c=<key>；范式模块 ${ROOT}/chars/star-wizard.js。
- 部件库：人形 ${ROOT}/lib/parts.js（README「部件库」一节，演示 ${ROOT}/chars/_parts-demo.js）；非人形 ${ROOT}/lib/parts-beast.js（说明 ${ROOT}/lib/parts-beast.md，演示 ${ROOT}/chars/_beast-demo.js）。已做好的同类角色模块在 ${ROOT}/chars/ 可以参考写法（不要照搬外形）。
- 技能目录 ${SKILL}：SKILL.md（第 2a 节是模块做法）、references/standard.md、references/fx-design.md。不读 hd2d 相关文件。
- 工具：
  node ${SKILL}/scripts/shoot.mjs "${ROOT}/view.html?c=<key>" <输出目录>     截图 + 自动验收 + 导出（退出码 0 = 通过）
  node ${SKILL}/scripts/frames.mjs <sprite.json> <目录>                        逐帧放大图 + 帧序；--grid 状态:帧；--contact 输出.png 多个 sprite.json
  node ${SKILL}/scripts/compare.mjs <sprite-lite.json> ${SKILL}/assets/reference ${ROOT}/accepted   查重（2 = 撞脸）；--prev 上一轮 这一轮 = 返修回退检查（3 = 有东西消失）
- 不改 ${ROOT}/lib/pcd.js，不改分配给别人的文件，不做任何 git 操作，不读游戏源码 ${ROOT}/../src（形象只从文字资料出发）。
- 部件库本轮冻结：不改 ${ROOT}/lib/parts.js 和 parts-beast.js。缺的通用部件写在自己模块里，函数前加注释「// 候选部件：<名字>」，以后统一收进库。`

const DATA_NOTES = `资料怎么读：部队 / 敌人 / 衍生单位没有主动技能，只有特性 traits（n 名称、d 说明、card 一句话、fx 特效类别）。「技能」状态表现最有触发感的那条特性（被动特性就表现它生效的样子），元素色阶和图案按 fx 类别选。职业 voc 要能从剪影一眼读出来（看 vocDesc）；种族 race 决定外观基调；品质 quality 决定尺寸和华丽程度（普通 < 优质 < 稀有 < 史诗 < 传说 < 神话 < 不朽）；up 是它会升级成的单位，同一条升级线要像同一个个体进化了。敌人没有职业，按描述和特性定位；衍生单位是别的单位召唤 / 生成的，和召唤者要有呼应。`

const PLAN_SCHEMA = {
  type: 'object',
  properties: { plans: { type: 'array', items: { type: 'object', properties: {
    key: { type: 'string' }, basis: { type: 'string' }, body: { type: 'string', description: '人形 / 四足 / 飞行 / 漂浮 / 爬行 / 软体 / 其他，用哪个部件库骨架' },
    build: { type: 'string' }, silhouette: { type: 'array', items: { type: 'string' } }, weapon: { type: 'string' }, attackType: { type: 'string' },
    idlePersonality: { type: 'string' }, gait: { type: 'string' }, deathStyle: { type: 'string' }, mainColors: { type: 'string' },
    element: { type: 'string' }, skillDepicted: { type: 'string' }, skillFx: { type: 'string' },
    sound: { type: 'string', description: '音色：一句话的声音签名（主材质 / 元素的声音 + 标志性的一声 + 重量 0–1），组内互不重复' } },
    required: ['key', 'basis', 'body', 'build', 'silhouette', 'weapon', 'attackType', 'idlePersonality', 'gait', 'deathStyle', 'mainColors', 'element', 'skillDepicted', 'skillFx', 'sound'] } } },
  required: ['plans'],
}
const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    chars: { type: 'array', items: { type: 'object', properties: {
      key: { type: 'string' }, autoPass: { type: 'boolean' }, comparePass: { type: 'boolean' }, lines: { type: 'integer' }, summary: { type: 'string' } },
      required: ['key', 'autoPass', 'comparePass', 'lines', 'summary'] } },
    partsAdded: { type: 'array', items: { type: 'string' } },
    feedback: { type: 'string', description: '部件库 / 技能说明里卡住的地方（没有写 无）' },
  },
  required: ['chars', 'partsAdded', 'feedback'],
}
const SCORE_KEYS = ['silhouette', 'detail', 'shading', 'idle', 'move', 'attack', 'skillPose', 'skillFx', 'hurt', 'death', 'fidelity', 'differentiation']
const REVIEW_SCHEMA = {
  type: 'object',
  properties: { chars: { type: 'array', items: { type: 'object', properties: {
    key: { type: 'string' }, autoPass: { type: 'boolean' }, comparePass: { type: 'boolean' },
    scores: { type: 'object', properties: Object.fromEntries(SCORE_KEYS.map((k) => [k, { type: 'integer', minimum: 1, maximum: 5 }])), required: SCORE_KEYS },
    blocking: { type: 'array', items: { type: 'string' } }, suggestions: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } },
    required: ['key', 'autoPass', 'comparePass', 'scores', 'blocking', 'suggestions', 'note'] } } },
  required: ['chars'],
}
const passes = (r) => !!r && r.autoPass && r.comparePass && r.blocking.length === 0 && SCORE_KEYS.every((k) => (r.scores[k] || 0) >= 3)
const batchOf = (g, key) => (g.chars.find((c) => c.key === key) || {}).batch || g.id
const dirOf = (g, key) => `${ROOT}/${batchOf(g, key)}/${key}`
const brief = (g, plans, keys) => {
  const mine = keys.map((k) => ({ data: g.chars.find((c) => c.key === k), lane: plans.find((p) => p.key === k) || {} }))
  const others = plans.filter((p) => !keys.includes(p.key)).map((p) => ({ key: p.key, body: p.body, build: p.build, weapon: p.weapon, attackType: p.attackType, mainColors: p.mainColors, element: p.element }))
  return `本次的角色（资料 + 差异化分配，分配必须遵守）：${JSON.stringify(mine)}
同组其他角色的分配（避免撞车）：${JSON.stringify(others)}
已通过的角色摘要在 ${INDEX}（外形、武器、配色、元素都要和同体型的拉开；查重脚本也会拦）。`
}

async function castGroup(g) {
  const r = await agent(`你是像素角色批次的「选角导演」。读 ${SKILL}/SKILL.md（六个状态、差异化规则、按描述重做已有角色）、${SKILL}/references/fx-design.md，并浏览部件库说明（${ROOT}/lib/README.md「部件库」、${ROOT}/lib/parts-beast.md）知道哪些骨架和部件现成可用。
为「${g.title}」这组 ${g.chars.length} 个角色从资料原文推出设计方向，保证组内互不重复：体型档、识别特征（≥3，其中 ≥2 改变外轮廓）、武器 + 握法 + 攻击类型、待机个性、步态、死亡方式、主材质色阶、技能元素与蓄力×施放×命中组合、音色（声音签名）；同一条升级线（${JSON.stringify(g.chains)}）要像同一个体进化，前后级识别特征一致、后一级更华丽。也要和已通过的角色拉开：先读 ${INDEX}，尤其是同体型、同种族的
${DATA_NOTES}
本组资料：${JSON.stringify(g.chars)}
返回结构化结果。`, { label: `cast:${g.id}`, phase: 'Cast', schema: PLAN_SCHEMA, agentType: 'general-purpose' })
  return (r && r.plans) || []
}

function buildChain(g, plans, keys, fix) {
  const out = keys.map((k) => `${ROOT}/chars/${k}.js、${dirOf(g, k)}/design.md、${dirOf(g, k)}/shots`).join('；')
  const task = fix
    ? `这些角色第 ${fix.round} 轮验收没有通过，按验收意见返修（现有文件在原位，验收截图在各自的 review-${fix.round}/）。
逐条要改的阻断问题：${JSON.stringify(fix.items)}
改完每个角色都跑 node ${SKILL}/scripts/compare.mjs --prev <该角色目录>/review-${fix.round}/sprite.json <该角色目录>/shots/sprite.json（角色目录：${keys.map((k) => dirOf(g, k)).join('、')}），确认消失的区域都是有意改的；在 design.md 末尾追加「第 ${fix.round} 轮修改记录」。`
    : `做这 ${keys.length} 个角色（${keys.join('、')}；有升级关系的按资料里的 up 字段），六个状态（待机、移动、攻击、技能、受击、死亡）和对应技能特效都要做完。两张设定卡写进各自的 design.md（开头一行「依据：」引用资料原文），非交互运行，不要等人确认。`
  return agent(`你是像素角色制作者，用技能「像素人物设计」的模块做法（SKILL.md 第 2a 节）。${task}
${brief(g, plans, keys)}
${DATA_NOTES}
音效：返回项写 SFX 声明（pal 和 style 只能用 README「音效钩子」里的词表），并在关键帧上调用 E.sfx（步态接触帧 step、出手帧 swing、接触帧 hit、发弹道 shoot、技能特效落地 impact、倒地 fall），参数按分配里的「音色」选；设定卡里写「音色」一行。见 ${ROOT}/lib/README.md「音效钩子」和 star-wizard.js。
做法：身体尽量用部件库拼（人形 parts.js / 非人形 parts-beast.js）；库里没有的部件写在自己模块里（通用的加「// 候选部件」注释）。技能动作和特效按特性描述自己设计。
自检 2–3 轮就收：shoot.mjs 退出码 0；compare.mjs 退出码 0；frames.mjs 看帧序（移动 gaitEvery2 前 4 个编号各不相同，剪影行看得出换脚 / 换腿）；对照 standard.md 第 10 节清单看截图。
产出：${out}。只写这些文件。
${ENV}
返回结构化结果。`, { label: `${fix ? 'fix' : 'build'}:${keys[0]}${fix ? '#' + fix.round : ''}`, phase: fix ? 'Fix' : 'Build', schema: BUILD_SCHEMA, agentType: 'general-purpose' })
}

function reviewSet(g, plans, keys, round, history) {
  const rv = (k) => `${dirOf(g, k)}/review-${round}`
  return agent(`你是严格的像素角色验收员（按批审核），只负责判定，不修改角色和部件库文件（review 目录除外）。
依据：${SKILL}/SKILL.md 的「六个状态」「差异化规则」「按描述重做已有角色」，${SKILL}/references/standard.md 第 2、4、5、7 节与第 10 节验收清单，${SKILL}/references/fx-design.md。
${brief(g, plans, keys)}
${DATA_NOTES}
步骤：
1. 对每个角色独立重跑（review 目录：${keys.map((k) => rv(k)).join('、')}）：node ${SKILL}/scripts/shoot.mjs "${ROOT}/view.html?c=<key>" <review 目录>（记退出码，读 audit.json、log.txt）；node ${SKILL}/scripts/compare.mjs <review 目录>/sprite-lite.json ${SKILL}/assets/reference ${ROOT}/accepted（记退出码和最接近的角色）；node ${SKILL}/scripts/frames.mjs <review 目录>/sprite.json <review 目录>/frames。
2. 按批对比表：node ${SKILL}/scripts/frames.mjs --contact ${ROOT}/${batchOf(g, keys[0])}/contact-${keys[0]}-r${round}.png ${keys.map((k) => rv(k) + '/sprite.json').join(' ')}。先看总表判断剪影、职业可读性、升级线一致性、组内区分度，再逐个看 frames_*.png 和关键截图，设定卡在各自的 design.md。
   audit.json 里「音效：」开头的问题算自动检查不通过；抽看 sprite.json 的 sfx 时间线，step / swing / hit / fall 要落在对应的动作帧上。
3. 每个角色 12 个维度各打 1–5 分（3 = 刚好达标）：silhouette、detail、shading、idle、move、attack、skillPose、skillFx、hurt、death、fidelity、differentiation。阻断问题写成能直接照着改的指令（哪个状态、哪一帧、哪个部件、改成什么）；不确定时从严。
4. 通过规则：自动检查通过、查重通过、没有阻断问题、12 项都 ≥ 3。只有通过的，把 review-${round}/sprite-lite.json 复制到 ${ROOT}/accepted/<key>/sprite-lite.json。
${history ? '之前几轮的验收记录（确认这些问题真的改好了）：' + JSON.stringify(history) : ''}
${ENV}
返回结构化结果。`, { label: `review:${keys[0]}+${keys.length - 1}#${round}`, phase: 'Review', schema: REVIEW_SCHEMA, agentType: 'general-purpose' })
}

// 把升级线打包成不超过 REVIEW_N 个角色的审核组（同一条线不拆开）
const packs = (chains) => { const out = []; let cur = []; for (const c of chains) { if (cur.length && cur.length + c.length > REVIEW_N) { out.push(cur); cur = []; } cur = cur.concat(c); } if (cur.length) out.push(cur); return out }

async function runGroup(g) {
  const plans = await castGroup(g)
  log(`${g.title}：分配完成 ${plans.length} 个`)
  const chainOf = (k) => g.chains.find((c) => c.includes(k))
  // 单个角色的线（敌人大多如此）两两合给一个制作者，省掉重复读资料的开销
  const units = []; let single = null
  for (const c of g.chains) { if (c.length > 1) units.push(c); else if (single) { units.push(single.concat(c)); single = null } else single = c }
  if (single) units.push(single)
  const built = await parallel(units.map((c) => () => buildChain(g, plans, c, null)))
  const results = {}
  await parallel(packs(g.chains).map((pack) => async () => {
    let keys = pack, round = 0; const history = {}
    while (keys.length && round < MAX_ROUNDS) {
      round++
      const rv = await reviewSet(g, plans, keys, round, round > 1 ? keys.map((k) => ({ key: k, rounds: history[k] })) : null)
      const got = (rv && rv.chars) || []
      for (const k of keys) { const r = got.find((x) => x.key === k); results[k] = { key: k, pass: passes(r), rounds: round, review: r || null }; (history[k] = history[k] || []).push(r ? { blocking: r.blocking, low: SCORE_KEYS.filter((s) => (r.scores[s] || 0) < 3) } : { blocking: ['验收员没有返回这个角色的结果'] }) }
      const failed = keys.filter((k) => !results[k].pass)
      if (!failed.length || round >= MAX_ROUNDS) break
      // 按升级线分组返修：同一条线的失败角色交给同一个代理
      const byChain = {}; for (const k of failed) { const c = chainOf(k) || [k]; (byChain[c[0]] = byChain[c[0]] || []).push(k) }
      await parallel(Object.values(byChain).map((ks) => () => buildChain(g, plans, ks, { round, items: ks.map((k) => ({ key: k, blocking: (results[k].review || {}).blocking || [], low: history[k][history[k].length - 1].low, suggestions: (results[k].review || {}).suggestions || [] })) })))
      keys = failed
    }
  }))
  const list = g.chars.map((c) => results[c.key] || { key: c.key, pass: false, rounds: 0 })
  log(`${g.title}：通过 ${list.filter((r) => r.pass).length} / ${list.length}`)
  return { id: g.id, title: g.title, plans, built, results: list }
}

phase('Cast')
const groups = await parallel(A.groups.map((g) => () => runGroup(g)))
return { wave: A.wave, groups }
