// Raid sim (dev tool, 2026-09-27): replays a 混沌来袭 on a saved town, many times, with no drawing. The towns come from the
// growth sim (tools/prog.js with { snaps: 1 }: every raid keeps the meta as the raid found it).
//   __raidSim(metaJSON, n) → { day, town, n, lose, loseP, secs, portal }   (portal: the main base's share left, wins only)
//   __raidTown(meta) → what fights on the surface: walls / towers / guards / shields, and the leader's level
(function () {
  const M = window.MC;
  M.raidTown = window.__raidTown = function (m) { const o = { wall: 0, tower: 0, guard: 0, shield: 0, pros: m.prosLv, day: m.day }; M.eachBuilt(m, (k) => { const r = M.townRole(k); if (r && r !== 'civil') o[r] = (o[r] || 0) + 1; }); return o; };
  window.__raidSim = function (snap, n = 40, opts = {}) {
    const m0 = typeof snap === 'string' ? JSON.parse(snap) : snap; let lose = 0, secs = 0, keep = 0, wins = 0; const oS = M.Sfx, mute = new Proxy({}, { get: () => () => {} });
    M.Sfx = mute;
    try {
      for (let i = 0; i < n; i++) {
        const m = JSON.parse(JSON.stringify(m0)); if (opts.portalFull) m.portal.hp = M.portalMax(m);
        const r = new M.Raid(m); let k = 0; while (!r.over && k++ < 30 * 400) r.step(1 / 30);
        if (r.over === 'lose') lose++; else { wins++; keep += r.portal.hp / r.portal.max; } secs += r.t;
      }
    } finally { M.Sfx = oS; }
    return { day: m0.day, town: M.raidTown(m0), n, lose, loseP: +(lose / n).toFixed(2), secs: Math.round(secs / n), portal: wins ? +(keep / wins).toFixed(2) : 0 };
  };
})();
