import fs from 'node:fs';
export default async ({ ev, shot, wait, log, ROOT }) => {
  const D = process.env.OUT || (ROOT + '/.ai'), tg = (process.env.MB || 'Centaur') + '-' + (process.env.OLD ? 'old-' : '');
  await ev(fs.readFileSync(ROOT + '/tools/bot.js', 'utf8') + ';true');
  await ev(`(async()=>{ const g=__mcg; const p=__bot(60,{}); for(let i=0;i<200;i++){ await new Promise(r=>setTimeout(r,200)); if(g.run&&g.run.map&&g.screen==='world'){ window.__botStop=true; break; } } await p; })()`);
  await ev(`(()=>{ const g=__mcg, M=MC, run=g.run; ${process.env.OLD ? 'MC.BOSSART.OFF["' + (process.env.MB || 'Centaur') + '"]=1;' : ''} run.region=Object.assign({}, run.region, {tut:false}); const n=run.map.nodes.find(n=>n.type==='boss'); const o=M.miniOf; M.miniOf=()=>({k:'${process.env.MB || 'Centaur'}',n:'x'}); try { g.beginBattle(Object.assign({}, n, {fb:null, final:false})); } finally { M.miniOf=o; } g.storyFx=null; g.paused=false; })()`); await wait(300); await ev(`(()=>{ __mcg.storyFx=null; })()`);
  const S = `(()=>{ const b=__mcg.battle; const e=b&&b.ents.find(x=>x.boss||x.mbAi); if(!e) return 'noe'; return 't='+b.t.toFixed(1)+' hp='+Math.round(e.hp)+'/'+Math.round(e.maxHp)+' alive='+e.alive+' ph='+(e.bk&&e.bk.phase)+' pa='+(e._pa?e._pa.kind+':'+e._pa.move+':'+e._pa.g.state:'')+' key='+e.hd.key+' px='+e.pxBig; })()`;
  await ev(`(()=>{ window.__L=[]; const B=MC.Battle3.prototype, ob=B.bkBegin; if(!B._lg){ B._lg=1; B.bkBegin=function(e,id,P){ __L.push(id); return ob.apply(this,arguments); }; } })()`); await wait(2500);
  for (let i = 0, got = 0; i < 60; i++) { await wait(150); const s = await ev(S); if (!got && /pa=skill:[a-zA-Z]+:(charge|cast)/.test(s) && !/roar|undefined/.test(s)) { got = 1; log(s); await shot(D + '/cent-' + tg + 'fight.png', { scale: 0.5 }); } if (i === 59 || (got && i > 30)) { log(s + ' moves=' + await ev('__L.join()')); break; } }   // a move charging or going off
  await ev(`(()=>{ const b=__mcg.battle; const e=b.ents.find(x=>x.boss||x.mbAi); e.casting=null; e.bk.ch=null; e.bk.dash=null; e.hp=e.maxHp*0.45; })()`);
  for (let i = 0; i < 8; i++) { await wait(120); const s = await ev(S); log(s); if (/roar/.test(s)) { await wait(250); await shot(D + '/cent-' + tg + 'roar.png', { scale: 0.5 }); break; } }
  await wait(1500);
  await ev(`(()=>{ const b=__mcg.battle; const e=b.ents.find(x=>x.boss||x.mbAi); b.kill(e,null); })()`);
  await wait(300); log(await ev(S)); await shot(D + '/cent-' + tg + 'die1.png', { scale: 0.5 });
  await wait(600); log(await ev(S)); await shot(D + '/cent-' + tg + 'die2.png', { scale: 0.5 });
};
