// Design-doc check (dev tool): everything the game contains must be named in docs/design.md.
// Load it in the running game, then: await __designCheck()  →  { ok, missing: { 类别: [名字…] } }
(function () {
  window.__designCheck = async function () {
    const M = window.MC, doc = await (await fetch('docs/design.md?' + Date.now())).text();
    const vals = (o) => (Array.isArray(o) ? o : Object.values(o || {}));
    const lists = {
      建筑: vals(M.BUILDINGS).filter(b => !b.gone).map(b => b.n),
      地格: vals(M.TILES).map(t => t.n),
      世界: vals(M.WORLDS).map(w => w.n),
      节点: vals(M.NODE).map(n => n.n),
      奇遇: vals(M.EVENTS).map(e => e.n),
      领袖: vals(M.HEROES).map(h => h.n),
      领袖技能: vals(M.HEROES).map(h => h.skill && h.skill.n),   // one skill per class; the on-field half has no name of its own
      战旗: vals(M.LEGION).map(l => l.name),
      道具: vals(M.ITEMS).map(i => i.name),
      宝物: vals(M.RELICS).map(r => r.n),
      纪念品: vals(M.GIFTS).map(g => g.n),
      家具: vals(M.FURN).map(f => (f.names || [])[0]),
      成就: vals(M.ACH).map(a => a.n),
      卡带: vals(M.KITS).map(k => k.n || k.name),
      天赋: Object.values(M.TALENTS || {}).map(t => (typeof t.n === 'function' ? t.n('') : t.n)),
      职业: Object.keys(M.VOC || {}),
      说明卡: (M.GUIDE || []).map(c => c.title),
    };
    const missing = {};
    Object.keys(lists).forEach(k => { const miss = lists[k].filter(n => n && !doc.includes(String(n).replace(/卡带$/, ''))); if (miss.length) missing[k] = miss; });
    return { ok: !Object.keys(missing).length, missing };
  };
})();
