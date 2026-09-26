// Design-doc check (dev tool): everything the game contains must be named in docs/design.md.
// Load it in the running game, then: await __designCheck()  →  { ok, missing: { 类别: [名字…] } }
(function () {
  window.__designCheck = async function () {
    const M = window.MC, doc = await (await fetch('docs/design.md?' + Date.now())).text();
    const vals = (o) => (Array.isArray(o) ? o : Object.values(o || {}));
    const lists = {
      建筑: vals(M.BUILDINGS).filter(b => !b.gone).map(b => b.n),
      地格: M.TERRAIN_OFF ? [] : vals(M.TILES).map(t => t.n),   // terrain is off since 2026-09-26
      世界: vals(M.WORLDS).map(w => w.n),
      节点: vals(M.NODE).map(n => n.n),
      奇遇: vals(M.EVENTS).map(e => e.n),
      领袖: vals(M.HEROES).map(h => h.n),
      领袖技能: vals(M.HEROES).map(h => h.skill && h.skill.n),   // one skill per class; the on-field half has no name of its own
      战旗: M.FEVER ? [] : vals(M.LEGION).map(l => l.name),   // banners are gone since 2026-09-26 (FEVER, mc-fever.js)
      'FEVER 效果': vals(M.ITEMS).map(i => i.name),
      宝物: vals(M.RELICS).map(r => r.n),
      纪念品: vals(M.GIFTS).map(g => g.n),
      // the cabinet layer (mc-legacy.js, 2026-09-26): its achievements and cartridges; the old furniture stays switched off
      成就: vals(M.ACH2 || M.ACH).map(a => a.n),
      卡带: vals(M.KITS2 || M.KITS).map(k => (k.n || k.name || '').replace(/卡带$/, '')),
      天赋: Object.values(M.TALENTS || {}).map(t => (typeof t.n === 'function' ? t.n('') : t.n)),
      职业: Object.keys(M.VOC || {}),
      说明卡: (M.GUIDE || []).map(c => c.title),
      场景: Object.values(M.SCENES || {}).reduce((a, l) => a.concat(l), []).map(s => s.n),
      最终首领: Object.keys(M.DB || {}).filter(k => M.DB[k].type === 'Titan').map(k => M.DB[k].n),
    };
    const missing = {};
    Object.keys(lists).forEach(k => { const miss = lists[k].filter(n => n && !doc.includes(String(n).replace(/卡带$/, ''))); if (miss.length) missing[k] = miss; });
    return { ok: !Object.keys(missing).length, missing };
  };
})();
