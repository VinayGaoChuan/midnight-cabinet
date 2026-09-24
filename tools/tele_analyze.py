#!/usr/bin/env python3
"""午夜机台 play-data analyser (telemetry schema v1, see src/mc-tele.js).

Input: any mix of JSON files containing telemetry batches:
  - an in-game export (settings -> 复制数据 / 下载数据): {"batches": [...]}
  - a list of batch documents, or an artifact-store dump ({"documents": [{"id", "data"}]} / [{"id", "data"}])
Batches are found recursively (objects with "sid" and an "ev" list) and de-duplicated by (did, sid, seq).

Usage:
  python3 tools/tele_analyze.py data1.json [data2.json ...] [--out report.md] [--json metrics.json] [--build <id>]
"""
import argparse, json, pathlib, statistics, sys
from collections import Counter, defaultdict


def find_batches(obj, out):
    if isinstance(obj, dict):
        if isinstance(obj.get('ev'), list) and 'sid' in obj:
            out.append(obj); return
        for v in obj.values(): find_batches(v, out)
    elif isinstance(obj, list):
        for v in obj: find_batches(v, out)


def load(paths, build=None):
    raw = []
    for p in paths:
        find_batches(json.loads(pathlib.Path(p).read_text(encoding='utf-8-sig')), raw)
    seen, batches = set(), []
    for b in raw:
        key = (b.get('did'), b.get('sid'), b.get('seq'))
        if key in seen and b.get('seq', 0) >= 0: continue
        seen.add(key); batches.append(b)
    events = []
    for b in batches:
        if build and b.get('build') != build: continue
        for e in b['ev']:
            e = dict(e); e['_sid'] = b.get('sid'); e['_did'] = b.get('did'); e['_build'] = b.get('build'); e['_at'] = b.get('at', 0)
            events.append(e)
    events.sort(key=lambda e: (e['_did'] or '', e['_sid'] or '', e.get('t', 0)))
    return batches, events


def pct(a, b): return '—' if not b else '%d%%' % round(100 * a / b)
def avg(xs): xs = [x for x in xs if x is not None]; return (sum(xs) / len(xs)) if xs else None
def med(xs): xs = [x for x in xs if x is not None]; return statistics.median(xs) if xs else None
def f1(x): return '—' if x is None else ('%.1f' % x if isinstance(x, float) else str(x))
def bucket(day): return '1-3' if day <= 3 else '4-6' if day <= 6 else '7-10' if day <= 10 else '11+'


class Report:
    def __init__(self): self.lines = []; self.flags = []; self.metrics = {}
    def h(self, t): self.lines += ['', '## ' + t, '']
    def p(self, t=''): self.lines.append(t)
    def table(self, head, rows):
        if not rows: self.p('（没有数据）'); return
        self.p('| ' + ' | '.join(head) + ' |'); self.p('|' + '---|' * len(head))
        for r in rows: self.p('| ' + ' | '.join(str(c) for c in r) + ' |')
    def flag(self, level, text): self.flags.append((level, text))


def analyse(batches, events):
    R = Report(); by = defaultdict(list)
    for e in events: by[e['k']].append(e)
    sessions = {e['_sid'] for e in events}; devices = {e['_did'] for e in events}
    play = defaultdict(int)
    for e in events: play[e['_sid']] = max(play[e['_sid']], e.get('t', 0))
    R.p('# 午夜机台 · 玩法数据分析')
    R.h('数据概况')
    R.table(['项目', '数值'], [['设备', len(devices)], ['会话', len(sessions)], ['批次', len(batches)], ['事件', len(events)],
        ['总游玩时长', '%d 分钟' % round(sum(play.values()) / 60000)], ['版本', ', '.join('%s(%d)' % kv for kv in Counter(e['_build'] for e in events).most_common())]])
    R.metrics['events'] = len(events)
    R.p(); R.p('事件分布：' + '，'.join('%s %d' % kv for kv in Counter(e['k'] for e in events).most_common()))

    # ── games ──
    R.h('一局（从投币到基地爆炸 / 传送门崩塌）')
    go = by['game_over']
    if go:
        days = [e['day'] for e in go]; toks = [e.get('tokens') or 0 for e in go]
        R.table(['指标', '数值'], [['结束的局数', len(go)], ['存活天数 中位 / 平均 / 最长', '%s / %s / %s' % (f1(med(days)), f1(avg(days)), max(days))], ['每局代币 平均', f1(avg(toks))],
            ['结束原因', '，'.join('%s %s' % (('基地爆炸' if k == 'core' else '传送门崩塌' if k == 'portal' else k), pct(v, len(go))) for k, v in Counter(e['reason'] for e in go).items())]])
        R.metrics['game_days_median'] = med(days); R.metrics['tokens_per_game'] = avg(toks)
        if med(days) is not None and med(days) < 6: R.flag('警告', '一局的存活天数中位数只有 %s 天：前期死亡太快，局外成长还没起作用就结束了。' % f1(med(days)))
        if avg(toks):
            first3 = 50 + 60 + 70
            R.p(); R.p('按平均每局 %s 代币计算：买到前三件家具（%d 代币）大约要 %.1f 局。' % (f1(avg(toks)), first3, first3 / avg(toks)))
            if first3 / avg(toks) > 4: R.flag('建议', '局外成长偏慢：买前三件家具要 %.1f 局，建议提高代币收益或降低首批家具价格。' % (first3 / avg(toks)))
    else: R.p('还没有结束的局。')

    # ── runs ──
    R.h('出征')
    re_ = [e for e in by['run_end'] if not e.get('tut')]
    if re_:
        rows = []
        for w, lst in sorted(defaultdict(list, {w: [e for e in re_ if e.get('world') == w] for w in {e.get('world') for e in re_}}).items(), key=lambda kv: -len(kv[1])):
            fails = sum(1 for e in lst if e['kind'] == 'fail')
            rows.append([w, len(lst), pct(sum(1 for e in lst if e['kind'] == 'extract'), len(lst)), pct(sum(1 for e in lst if e['kind'] == 'clear'), len(lst)), pct(fails, len(lst)), f1(avg([e['loot']['sup'] for e in lst])), f1(avg([len(e['loot']['bp']) for e in lst]))])
        R.table(['世界', '次数', '撤离', '通关', '领袖阵亡', '带回物资', '带回图纸'], rows)
        death = sum(1 for e in re_ if e['kind'] == 'fail') / len(re_)
        R.metrics['run_death_rate'] = death; R.metrics['bp_per_run'] = avg([len(e['loot']['bp']) for e in re_ if e['kind'] != 'fail'])
        dr = defaultdict(list)
        for e in re_: dr[bucket(e.get('day', 1))].append(e['kind'] == 'fail')
        R.p(); R.p('领袖阵亡率按天数：' + '，'.join('第 %s 天 %s（%d 次）' % (b, pct(sum(v), len(v)), len(v)) for b, v in sorted(dr.items())))
        if death > 0.35: R.flag('警告', '出征的领袖阵亡率 %s，高于 35%%：出征太危险。' % pct(death, 1))
        if R.metrics['bp_per_run'] is not None and R.metrics['bp_per_run'] < 1: R.flag('警告', '成功出征平均只带回 %.2f 张图纸，低于 1 张。' % R.metrics['bp_per_run'])
    else: R.p('还没有完成的出征。')

    # ── battles ──
    R.h('战斗')
    be = [e for e in by['battle_end'] if e.get('node')]
    if be:
        rows = []
        for nt in ['normal', 'hold', 'elite', 'boss', 'extract']:
            lst = [e for e in be if e['node'] == nt]
            if not lst: continue
            rows.append([nt, len(lst), pct(sum(e['win'] for e in lst), len(lst)), f1(avg([e['dur'] for e in lst])), pct(sum(e['hero']['entered'] for e in lst), len(lst)),
                         f1(avg([(e['hero']['hp0'] or 0) - (e['hero']['hp1'] or 0) for e in lst])), f1(avg([e['allies']['alive'] / max(1, e['allies']['n']) for e in lst]))])
        R.table(['节点', '场数', '胜率', '时长(秒)', '领袖被迫上场', '领袖掉血(比例)', '部队存活率'], rows)
        wr = {nt: avg([e['win'] for e in be if e['node'] == nt]) for nt in ['normal', 'elite', 'boss']}
        R.metrics['win_rate'] = wr
        early = [e['win'] for e in be if e['node'] in ('normal', 'hold') and e.get('day', 1) <= 5]
        if early and avg(early) < 0.85: R.flag('警告', '前 5 天普通战胜率只有 %s（低于 85%%）：前期太难，这正是“后面全是死”的起点。' % pct(sum(early), len(early)))
        if wr.get('elite') is not None and wr['elite'] < 0.6: R.flag('警告', '精英战胜率 %s，低于 60%%。' % pct(wr['elite'], 1))
        if wr.get('elite') is not None and wr['elite'] > 0.97 and len([e for e in be if e['node'] == 'elite']) >= 10: R.flag('建议', '精英战胜率 %s，几乎没有威胁。' % pct(wr['elite'], 1))
        if wr.get('boss') is not None and wr['boss'] < 0.5: R.flag('警告', '首领战胜率 %s，低于 50%%。' % pct(wr['boss'], 1))
        # difficulty curve
        cur = defaultdict(list)
        for e in be: cur[bucket(e.get('day', 1))].append(e['win'])
        R.p(); R.p('胜率按天数：' + '，'.join('第 %s 天 %s（%d 场）' % (b, pct(sum(v), len(v)), len(v)) for b, v in sorted(cur.items())))
        # strength vs enemy budget
        starts = {(e['_sid'], e.get('day'), e.get('node')): e for e in by['battle_start']}
        pairs = []
        for e in be:
            s = starts.get((e['_sid'], e.get('day'), e.get('node')))
            if s and s.get('s0'):
                power = sum(((u[1] or 0) + 1) * (u[2] or 1) for u in s.get('roster', []))
                pairs.append((power / s['s0'] * 100, e['win']))
        if len(pairs) >= 8:
            pairs.sort(); q = len(pairs) // 4 or 1
            R.p('部队强度 / 敌人预算 四分位的胜率：' + '，'.join('Q%d %s' % (i + 1, pct(sum(w for _, w in pairs[i * q:(i + 1) * q]), len(pairs[i * q:(i + 1) * q]))) for i in range(4)))
        # units
        dmg, kills, seen = Counter(), Counter(), Counter()
        for e in be:
            for k, d, kl in e.get('top', []): dmg[k] += d; kills[k] += kl; seen[k] += 1
        R.p(); R.p('**输出最高的部队**（出现在战斗前 8 名里的累计）')
        R.table(['部队', '上榜次数', '场均伤害', '场均击杀'], [[k, seen[k], round(dmg[k] / seen[k]), f1(kills[k] / seen[k])] for k, _ in dmg.most_common(15)])
        sk = len(by['hero_skill']); R.p(); R.p('领袖主动技能：%d 次 / %d 场战斗（%s）。' % (sk, len(be), pct(sk, len(be))))
        R.p('场均施法：我方 %s，敌方 %s；场均使用道具 %s 个。' % (f1(avg([e['casts'].get('A', 0) for e in be])), f1(avg([e['casts'].get('E', 0) for e in be])), f1(avg([e.get('items', 0) for e in be]))))
    else: R.p('还没有战斗记录。')

    # ── economy ──
    R.h('经济与图纸')
    days = by['day']
    if days:
        dd = defaultdict(list)
        for e in days: dd[e['day']].append(e)
        R.table(['天', '样本', '物资', '灵魂碎片', '经验球', '已建房间', '库存图纸', '电力 已用/产出'], [[d, len(v), round(avg([x['sup'] for x in v])), round(avg([x['sh'] for x in v])), round(avg([x['orb'] for x in v])), f1(avg([len(x['rooms']) for x in v])), f1(avg([x['bpInv'] for x in v])), '%s/%s' % (f1(avg([x['pw']['used'] for x in v])), f1(avg([x['pw']['made'] for x in v])))] for d, v in sorted(dd.items())[:15]])
        late = [e for e in days if e['day'] >= 6]
        if late and avg([e['bpInv'] for e in late]) > 6: R.flag('建议', '第 6 天后仓库里平均积压 %s 张图纸没建：可能是建造太贵、电力不够或房间不够。' % f1(avg([e['bpInv'] for e in late])))
    src = Counter()
    for e in be:
        for k in e.get('bp', []): src['战斗·' + e['node']] += 1
    for e in by['chest']:
        for it in e.get('items', []):
            if it and it[0] == 'bp': src['宝箱'] += 1
    for e in by['mini_end']:
        for g in e.get('gains', []) or []:
            if g and g[0] == 'bp': src['奇遇·' + e.get('kind', '?')] += 1
    if src: R.p(); R.p('图纸来源：' + '，'.join('%s %d' % kv for kv in src.most_common()))
    b_ = Counter(e['key'] for e in by['build'])
    if b_: R.p('建造次数：' + '，'.join('%s %d' % kv for kv in b_.most_common(20)))
    cr = Counter(e.get('q') for e in by['craft'])
    if cr: R.p('打造品质：' + '，'.join('%s %d' % (['普通', '稀有', '史诗', '传说'][k] if isinstance(k, int) and 0 <= k < 4 else k, v) for k, v in sorted(cr.items(), key=lambda kv: str(kv[0]))))
    hn = Counter(e.get('r') for e in by['hero_new'])
    if hn: R.p('新领袖品质：' + '，'.join('%s %d' % (['普通', '稀有', '史诗', '传说'][k] if isinstance(k, int) and 0 <= k < 4 else k, v) for k, v in sorted(hn.items(), key=lambda kv: str(kv[0]))))

    # ── shop ──
    R.h('夜市')
    shops = by['shop']
    if shops:
        offered, bought = Counter(), Counter()
        for e in shops:
            for t, c in e.get('units', []): offered[t] += 1
        for e in by['buy']: bought[e.get('key')] += 1
        left = [e['wallet'] for e in by['shop_leave']]
        R.table(['指标', '数值'], [['进店次数', len(shops)], ['平均刷新', f1(len(by['shop_refresh']) / len(shops))], ['离店时剩余积分 中位', f1(med(left))], ['卖出部队', len(by['sell'])]])
        R.p(); R.p('**买得最多**：' + '，'.join('%s %d' % kv for kv in bought.most_common(12)))
        rate = [(t, bought[t] / offered[t]) for t in offered if offered[t] >= 5]
        if rate:
            rate.sort(key=lambda x: x[1])
            R.p('**几乎没人买**（出现 ≥5 次）：' + '，'.join('%s %s' % (t, pct(r, 1)) for t, r in rate[:8]))
        costs = [c for e in shops for _, c in e.get('units', [])]
        if left and costs and med(left) > 2 * med(costs): R.flag('建议', '离开夜市时剩余积分中位数 %s，是部队中位价格的两倍多：积分过剩，夜市不够有吸引力。' % f1(med(left)))

    # ── mini games ──
    R.h('奇遇小游戏')
    me = by['mini_end']
    if me:
        rows = []
        for k, lst in sorted(defaultdict(list, {k: [e for e in me if e.get('kind') == k] for k in {e.get('kind') for e in me}}).items(), key=lambda kv: -len(kv[1])):
            rows.append([k, len(lst), f1(avg([e.get('dur') for e in lst])), f1(avg([e.get('spent') for e in lst])), f1(avg([e.get('dWallet') for e in lst])), pct(sum(1 for e in lst if e.get('battle')), len(lst)), pct(sum(1 for e in lst if e.get('gains')), len(lst))])
        R.table(['小游戏', '次数', '时长(秒)', '花费积分', '积分净变化', '转入战斗', '有奖励'], rows)
        long_ = [r[0] for r in rows if r[2] != '—' and float(r[2]) > 60]
        if long_: R.flag('建议', '这些小游戏平均超过 60 秒，节奏偏长：' + '、'.join(long_))

    # ── base & raids ──
    R.h('基地与袭击')
    rs = by['raid_end']
    if rs:
        R.table(['指标', '数值'], [['袭击次数', len(rs)], ['守住', pct(sum(1 for e in rs if e['res'] == 'win'), len(rs))], ['传送门剩余耐久 平均', f1(avg([e['portal'] for e in rs]))]])
        if avg([e['res'] == 'win' for e in rs]) < 0.7: R.flag('警告', '袭击守住率 %s，低于 70%%。' % pct(sum(1 for e in rs if e['res'] == 'win'), len(rs)))
    # terrain: which veins get dug toward and occupied, and whether the fitting room goes on them
    QN = ['普通', '稀有', '史诗', '传说']
    dg = by['dig']
    if dg:
        rows_ = Counter(e.get('row') for e in dg if e.get('row') is not None)
        hit = [e for e in dg if e.get('tile')]
        R.p('挖掘 %d 次，按层：%s；挖到特殊地格 %d 次（%s）。' % (len(dg), '，'.join('第%d层 %d' % (r + 1, v) for r, v in sorted(rows_.items())), len(hit), '，'.join('%s %d' % (QN[q] if isinstance(q, int) and 0 <= q < 4 else q, v) for q, v in sorted(Counter(e.get('tq') for e in hit).items(), key=lambda kv: str(kv[0])))))
    bt = [e for e in by['build'] if e.get('tile')]
    if bt:
        R.p('建在地格上的房间 %d 个，其中契合 %s；地格：%s。' % (len(bt), pct(sum(1 for e in bt if e.get('fit')), len(bt)), '，'.join('%s %d' % kv for kv in Counter(e['tile'] for e in bt).most_common(12))))
    last_day = {}
    for e in by['day']: last_day[e['_sid']] = e
    occ = [len(e.get('tiles') or []) for e in last_day.values() if 'tiles' in e]
    if occ:
        R.p('每局最后一天占领的地格数：平均 %s，中位 %s。' % (f1(avg(occ)), f1(med(occ))))
        if len(occ) >= 5 and med(occ) < 1: R.flag('建议', '多数局一块特殊地格都没占（中位 %s）：地格吸引力或可达性不够。' % f1(med(occ)))
    fu = [(e['k'], e['lv'], e.get('g')) for e in by['furn']]
    if fu: R.p('家具购买顺序：' + ' → '.join('%s Lv%d' % (k, lv) for k, lv, _ in fu[:30]))

    # ── UX ──
    R.h('操作与体验')
    tl, ts = len(by['talent']), len(by['talent_short'])
    R.p('学天赋 %d 次，按住时间不够就松手 %d 次。' % (tl, ts))
    if tl + ts >= 5 and ts / max(1, tl) > 0.5: R.flag('建议', '天赋“按住学习”的误操作仍然偏多（每学一次平均 %.1f 次短按），提示需要更醒目。' % (ts / max(1, tl)))
    fps = [e['fps'] for e in by['perf']]
    if fps:
        R.p('帧率 中位 %s，低于 45 帧的采样 %s。' % (f1(med(fps)), pct(sum(1 for x in fps if x < 45), len(fps))))
        if med(fps) < 45: R.flag('警告', '帧率中位数 %s，低于 45：有性能问题。' % f1(med(fps)))
    errs = Counter(e['msg'] for e in by['error'])
    if errs:
        R.p(); R.p('**运行时错误**'); R.table(['次数', '错误'], [[v, k.replace('|', '/')[:160]] for k, v in errs.most_common(10)])
        R.flag('警告', '有 %d 种运行时错误，共 %d 次。' % (len(errs), sum(errs.values())))
    scr = Counter(e['to'] for e in by['screen'])
    if scr: R.p('界面切换：' + '，'.join('%s %d' % kv for kv in scr.most_common()))

    # ── flags ──
    R.lines[1:1] = ['', '## 结论速览', ''] + (['- **%s**：%s' % f for f in sorted(R.flags, key=lambda f: 0 if f[0] == '警告' else 1)] or ['- 没有发现明显问题（样本越多结论越可靠）。']) + ['', '样本量提醒：每项结论后面的场数 / 次数就是样本量，少于 20 的只作参考。']
    R.metrics['flags'] = R.flags
    return R


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('files', nargs='+'); ap.add_argument('--out'); ap.add_argument('--json'); ap.add_argument('--build')
    a = ap.parse_args()
    batches, events = load(a.files, a.build)
    if not events: print('没有找到任何遥测事件。'); sys.exit(1)
    R = analyse(batches, events); text = '\n'.join(R.lines) + '\n'
    if a.out: pathlib.Path(a.out).write_text(text, encoding='utf-8'); print('报告已写入', a.out)
    else: sys.stdout.write(text)
    if a.json: pathlib.Path(a.json).write_text(json.dumps(R.metrics, ensure_ascii=False, indent=1, default=str), encoding='utf-8')


if __name__ == '__main__':
    main()
