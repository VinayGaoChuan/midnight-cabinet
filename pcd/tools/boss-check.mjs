import fs from 'node:fs';
export default async ({ ev, log, ROOT }) => {
  for (const t of ['bot.js', 'designcheck.js']) await ev(fs.readFileSync(ROOT + '/tools/' + t, 'utf8') + ';true');
  const r = await ev(`(async()=>{ const r = await __bot(${process.env.SECS || 120}, {}); return JSON.stringify({viewErrs:r.viewErrs, battles:r.battles, steps:r.steps, screen:r.screen, log:(r.log||[]).filter(x=>/VIEW|ERR|EXC/.test(x)).slice(0,5)}); })()`, 400000);
  log('bot', String(r).slice(0, 600));
  log('design', String(await ev(`(async()=>JSON.stringify(await __designCheck()))()`)).slice(0, 800));
};
