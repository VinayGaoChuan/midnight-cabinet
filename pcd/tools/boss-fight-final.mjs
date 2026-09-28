import fs from 'node:fs';
export default async ({ ev, shot, wait, log, ROOT }) => {
  const D = process.env.OUT || (ROOT + '/.ai'), tag = process.env.OLD ? 'old' : 'new', S1 = { scale: 0.5 };
  await ev(fs.readFileSync(ROOT + '/tools/bot.js', 'utf8') + ';true');
  await ev(`(async()=>{ const g=__mcg; const p=__bot(60,{}); for(let i=0;i<200;i++){ await new Promise(r=>setTimeout(r,200)); if(g.run&&g.run.map&&g.screen==='world'){ window.__botStop=true; break; } } await p; })()`);
  await ev(`(()=>{ ${process.env.OLD ? 'delete MC.BOSSART.FINAL.FB_demon;' : ''} const g=__mcg, run=g.run; run.region=Object.assign({}, run.region, {tut:false}); const n=run.map.nodes.find(n=>n.type==='boss'); g.beginBattle(Object.assign({}, n, {fb:'FB_demon', final:false})); g.paused=false; })()`);
  const S = `(()=>{ const b=__mcg.battle; const e=b&&b.ents.find(x=>x.fb); if(!e) return 'noe'; const f=e._fg; return 't='+b.t.toFixed(1)+' st='+(e.ai&&e.ai.st)+' ph='+(e.ai&&e.ai.phase)+' hp='+Math.round(e.hp/e.maxHp*100)+'% cast='+(e.casting&&e.casting.bk?e.casting.bk.id:'')+' eng='+(f?f.cur+':'+f.g.state+':'+f.g.stT.toFixed(2):'-')+' p2='+(b.p2?b.p2.t.toFixed(2):''); })()`;
  await wait(900); log(await ev(S)); await shot(D + '/d-' + tag + '-rise.png', S1);
  let got = {};
  for (let i = 0; i < 70 && Object.keys(got).length < 2; i++) {
    await wait(150); const s = await ev(S); if (i % 6 === 0) log(s);
    if (/cast=meteor/.test(s) && !got.c) { got.c = 1; await wait(700); log(await ev(S)); await shot(D + '/d-' + tag + '-charge.png', S1); }
    if (got.c && !/cast=/.test(s) && !got.h) { got.h = 1; await wait(250); log(await ev(S)); await shot(D + '/d-' + tag + '-hit.png', S1); }
  }
  await ev(`(()=>{ const b=__mcg.battle; const e=b.ents.find(x=>x.fb); e.casting=null; if(e.bk){e.bk.ch=null;} e.hp=e.maxHp*0.45; })()`);
  for (let i = 0; i < 30; i++) { await wait(100); const s = await ev(S); if (/p2=0\.[3-9]/.test(s)) { log(s); await shot(D + '/d-' + tag + '-p2a.png', S1); break; } }
  for (let i = 0; i < 30; i++) { await wait(100); const s = await ev(S); if (/p2=(1\.[0-9])/.test(s)) { log(s); await shot(D + '/d-' + tag + '-p2b.png', S1); break; } }
  await wait(2500); log(await ev(S));
  await ev(`(()=>{ const b=__mcg.battle; const e=b.ents.find(x=>x.fb); b.kill(e,null); })()`);
  await wait(500); log(await ev(S)); await shot(D + '/d-' + tag + '-die1.png', S1);
  await wait(900); log(await ev(S)); await shot(D + '/d-' + tag + '-die2.png', S1);
};
