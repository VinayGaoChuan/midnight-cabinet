// ==== mc-i18n.js ====
(function () {
// Languages (2026-09-28: 「这个游戏需要支持steam上支持的所有语言……要把这个做到完整版和demo中。要有语言切换功能」): the 31 languages
// Steam fully supports (partner.steamgames.com/doc/store/localization/languages). The game is written in Chinese; every other
// language is a dictionary (src/i18n/<code>.js: window.MC_I18N[code] = { 中文: 译文 }) applied where text reaches the screen —
// React children and props (the UI template), canvas fillText / strokeText / measureText — so no source file has to change its
// strings. A key is the Chinese text with its numbers as {0} {1}…; a string with no key of its own is cut at its punctuation
// and separators (「下一个首领：鼠王」 → 「下一个首领」「：」「鼠王」) and the pieces translated one by one.
// Default: the saved choice; else Steam's language for the game (desktop build); else the browser's; else English.
const M = window.MC, W = window;
const LANGS = [
  ['zh-CN', '简体中文', 'schinese'], ['zh-TW', '繁體中文', 'tchinese'], ['en', 'English', 'english'], ['ja', '日本語', 'japanese'], ['ko', '한국어', 'koreana'],
  ['ru', 'Русский', 'russian'], ['fr', 'Français', 'french'], ['de', 'Deutsch', 'german'], ['es', 'Español (España)', 'spanish'], ['es-419', 'Español (Latinoamérica)', 'latam'],
  ['pt', 'Português (Portugal)', 'portuguese'], ['pt-BR', 'Português (Brasil)', 'brazilian'], ['it', 'Italiano', 'italian'], ['pl', 'Polski', 'polish'], ['tr', 'Türkçe', 'turkish'],
  ['uk', 'Українська', 'ukrainian'], ['cs', 'Čeština', 'czech'], ['hu', 'Magyar', 'hungarian'], ['ro', 'Română', 'romanian'], ['nl', 'Nederlands', 'dutch'],
  ['sv', 'Svenska', 'swedish'], ['da', 'Dansk', 'danish'], ['no', 'Norsk', 'norwegian'], ['fi', 'Suomi', 'finnish'], ['el', 'Ελληνικά', 'greek'],
  ['bg', 'Български', 'bulgarian'], ['th', 'ไทย', 'thai'], ['vi', 'Tiếng Việt', 'vietnamese'], ['id', 'Bahasa Indonesia', 'indonesian'], ['ms', 'Bahasa Melayu', 'malay'],
  ['ar', 'العربية', 'arabic'],
];
const SKEY = 'midnight-cabinet-settings-v1';
const CJK = /[㐀-鿿豈-﫿]/, ARAB = /[؀-ۿ]/;
const I = M.I18N = { LANGS, lang: 'zh-CN', on: false, dict: {}, miss: new Map(), harvest: false };
const CACHE = new Map();
// the languages that keep Chinese-style punctuation; the others get their own
const CJKP = { 'zh-TW': 1, ja: 1 };

// ───────── which language ─────────
function fromTag(t) {
  t = String(t || '').toLowerCase().replace('_', '-'); if (!t) return null;
  if (/^zh-(tw|hk|mo|hant)/.test(t)) return 'zh-TW'; if (t.startsWith('zh')) return 'zh-CN';
  if (t === 'pt-br') return 'pt-BR'; if (t.startsWith('pt')) return 'pt';
  if (t.startsWith('es')) return t === 'es' || t === 'es-es' ? 'es' : 'es-419';
  if (/^(nb|nn|no)\b/.test(t)) return 'no';
  const b = t.split('-')[0], hit = LANGS.find(l => l[0] === b); return hit ? hit[0] : null;
}
function fromSteam(api) { const hit = LANGS.find(l => l[2] === String(api || '').toLowerCase()); return hit ? hit[0] : null; }
function saved() { try { const s = JSON.parse(localStorage.getItem(SKEY) || '{}'); return s && LANGS.some(l => l[0] === s.lang) ? s.lang : null; } catch (e) { return null; } }
function detect() { const c = detect0(); return c === 'zh-CN' || (W.MC_I18N && W.MC_I18N[c]) ? c : W.MC_I18N && W.MC_I18N.en ? 'en' : 'zh-CN'; }
function detect0() {
  const sv = saved(); if (sv) return sv;
  try { const nat = W.__wgpNative; const st = nat && nat.steamLanguage && nat.steamLanguage(); const c = fromSteam(st); if (c) return c; } catch (e) {}
  for (const t of (navigator.languages || [navigator.language])) { const c = fromTag(t); if (c) return c; }
  return 'en';
}

// ───────── the dictionary ─────────
const NUM = /\d+(?:[.,]\d+)*/g;
const tmpl = (s) => { const v = []; const k = s.replace(NUM, (m) => { v.push(m); return '{' + (v.length - 1) + '}'; }); return [k, v]; };
const fill = (t, v) => t.replace(/\{(\d+)\}/g, (m, i) => (v[+i] != null ? v[+i] : m));
// name templates: a key with {n} is a sentence around a name that is a key of its own (「{n}图纸」→「{n} Blueprint」): the name is
// translated by itself and put where the language wants it
let NT = null;
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function nameTpls() {
  NT = [];
  for (const k in I.dict) if (k.indexOf('{n}') >= 0) {
    const parts = k.split(/(\{n\}|\{\d+\})/), order = [];
    const re = parts.map(p => { if (p === '{n}') { order.push('n'); return '(.+?)'; } const m = p.match(/^\{(\d+)\}$/); if (m) { order.push(+m[1]); return '(\\d+(?:[.,]\\d+)*)'; } return esc(p); }).join('');
    NT.push([new RegExp('^' + re + '$'), k, order]);
  }
}
function look(s, deep) {
  const D = I.dict; let r = D[s]; if (r != null) return r;
  if (/\d/.test(s)) { const [k, v] = tmpl(s); r = D[k]; if (r != null) return fill(r, v); }
  if (deep !== false) {
    if (!NT) nameTpls();
    for (const [re, k, order] of NT) {
      const m = s.match(re); if (!m) continue;
      let name = null; const v = [];
      order.forEach((o, i) => { if (o === 'n') name = m[i + 1]; else v[o] = m[i + 1]; });
      const nt = name != null ? look(name.trim(), false) : null; if (nt == null) continue;
      return fill(D[k].replace('{n}', nt), v);
    }
  }
  return null;
}
// separators a composed string is cut at when it has no key of its own
const SEP = /(\n|\s*[·•｜|／/→←↑↓×]\s*|[：:，,、；;。！!？?…～~]+\s*|[（）()「」『』【】《》〈〉“”"]\s*|\s{2,})/;
const PUN = { '，': ', ', '。': '. ', '：': ': ', '、': ', ', '；': '; ', '！': '! ', '？': '? ', '（': ' (', '）': ') ', '「': '“', '」': '”', '『': '“', '』': '”', '【': '[', '】': ']', '《': '“', '》': '”', '〈': '‹', '〉': '›', '～': '~' };
function punct(p) { if (CJKP[I.lang]) return p; return p.replace(/[，。：、；！？（）「」『』【】《》〈〉～]/g, (c) => PUN[c]); }
let QUIET = false;
function note(s, force) { if ((!I.harvest && !I.on) || (QUIET && !force)) return; const [k] = tmpl(s.trim()); if (!k || !CJK.test(k)) return; const n = I.miss.get(k) || 0; I.miss.set(k, n + 1); }
// text marked with U+2063 (invisible) is never translated: a language's own name in the language list
const KEEP = '\u2063';
function tr(s) {
  if (typeof s !== 'string' || !CJK.test(s) || s.charCodeAt(0) === 0x2063) return s;
  if (I.harvest) note(s);
  if (!I.on) return s;
  const c = CACHE.get(s); if (c !== undefined) return c;
  const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0], core = s.trim();
  let r = core.length > 1 || I.dict[core] != null ? look(core) : core;
  if (r == null) {
    const parts = core.split(SEP);
    r = parts.map((p, i) => {
      if (i % 2) return punct(p);
      if (!CJK.test(p)) return p;
      const q = p.trim(); if (q.length < 2 && I.dict[q] == null) return p;
      let t = look(q);
      // still nothing: Chinese puts a space between a name and what it does (「守夜人 带着收获回到了基地」) — the words one by one
      if (t == null && /\s/.test(q)) { const ws = q.split(/(\s+)/), out = ws.map(w => (!CJK.test(w) ? w : look(w.trim()))); if (out.every(x => x != null)) t = out.join(''); }
      if (t == null) { note(q); return p; }
      return p.replace(q, t);
    }).join('');
    if (!CJKP[I.lang]) r = r.replace(/ {2,}/g, ' ').replace(/ ([,.:;!?)\]”])/g, '$1').trim();
    if (CJK.test(r)) note(core, true);   // still Chinese somewhere: the whole string is what a translator needs
  }
  if (I.lang === 'en') r = one(r);
  r = lead + r + tail; CACHE.set(s, r); return r;
}
// English after a number: one of a thing is singular (the dictionary writes the plural: 「{0} 天」→「{0} days」)
const ONE = /(^|[^\d.,])1 (day|night|unit|second|stop|point|blueprint|relic|level|time|heart|leader|wave|cell|plot|room|chest|minute|kill|bottle|battle|stack|lamp|run|shard|orb|encounter|tier|building|wonder|achievement|cartridge|figurine|item|card|pack|visitor|project|guard|monk|soldier|wraith|imp|bolt|strike|chain|coin|token|talent point|support item|Soul Shard|EXP orb)s\b/g;
const one = (t) => (t.indexOf('1 ') < 0 ? t : t.replace(ONE, (m, a, w) => a + '1 ' + w).replace(/(^|[^\d.,])1 enemies\b/g, (m, a) => a + '1 enemy'));
M.tr = tr;
M.trOn = () => I.on;
// word-aware line breaking for translated text (the game's own wrappers break Chinese between any two characters)
M.trWrap = function (ctx, s, max) {
  const t = tr(String(s)); if (!I.on || CJK.test(t) || /[\u3040-\u30ff\uac00-\ud7a3\u0e00-\u0e7f]/.test(t) && !/\s/.test(t)) return null;
  const out = []; let line = '';
  for (const para of t.split('\n')) {
    for (const w of para.split(/(\s+)/)) { if (!w) continue; const cand = line + w; if (line && /\S/.test(w) && ctx.measureText(cand.trimEnd()).width > max) { out.push(line.trimEnd()); line = w.trimStart(); } else line = cand; }
    out.push(line.trimEnd()); line = '';
  }
  return out.filter((l, i) => l || i < out.length - 1);
};

// ───────── the screen: React (the UI template) ─────────
function hookReact(R) {
  if (!R || R.__i18n) return; R.__i18n = 1;
  const o = R.createElement;
  R.createElement = function (type, props) {
    if (!I.on && !I.harvest) return o.apply(this, arguments);
    const args = Array.prototype.slice.call(arguments);
    if (I.on && typeof type === 'string' && args.slice(2).some(k => typeof k === 'string' ? CJK.test(k) : Array.isArray(k) && k.some(x => typeof x === 'string' && CJK.test(x)))) args[1] = Object.assign({}, props || {}, { 'data-tr': '1' });
    if (props && typeof props.title === 'string' && CJK.test(props.title)) args[1] = Object.assign({}, props, { title: tr(props.title) });
    // the template hands some children over as one array: the same rules apply inside it
    if (args.length === 3 && Array.isArray(args[2]) && args[2].length > 1) { const a = args[2]; if (a.every(k => k == null || typeof k !== 'object') && a.some(k => typeof k === 'string' && CJK.test(k))) return o.apply(this, args.slice(0, 2).concat([tr(a.map(k => (k == null || typeof k === 'boolean' ? '' : String(k))).join(''))])); if (a.some(k => typeof k === 'string' && CJK.test(k))) args[2] = a.map(k => (typeof k === 'string' ? tr(k) : k)); }
    const kids = args.slice(2);
    // the template wraps every value in its own element: 「设备：」<span>…</span>「 · 当前操作：」<span>…</span> is one sentence, keyed
    // 「设备：{e0} · 当前操作：{e1}」 — its translation puts the elements back where that language wants them
    if (kids.length > 1 && kids.some(k => typeof k === 'string' && CJK.test(k)) && kids.some(k => k && typeof k === 'object' && k.$$typeof)) {
      const els = []; let key = '';
      for (const k of kids) { if (k && typeof k === 'object' && k.$$typeof) { key += '{e' + els.length + '}'; els.push(k); } else if (k != null && typeof k !== 'boolean' && typeof k !== 'object') key += String(k); else if (k != null && typeof k === 'object') { key = null; break; } }
      if (key) {
        const kk = key.trim();
        if (I.harvest) note(kk, true);
        const r = I.on ? look(kk) : null;
        if (r != null) {
          const out = []; r.split(/(\{e\d+\})/).forEach(p => { const m = p.match(/^\{e(\d+)\}$/); if (m) { if (els[+m[1]]) out.push(els[+m[1]]); } else if (p) out.push(p); });
          return o.apply(this, args.slice(0, 2).concat(out));
        }
        QUIET = true; try { for (let i = 2; i < args.length; i++) if (typeof args[i] === 'string' && CJK.test(args[i])) args[i] = tr(args[i]); } finally { QUIET = false; }
        return o.apply(this, args);
      }
    }
    if (kids.length) {
      const prim = kids.every(k => k == null || typeof k !== 'object');
      if (prim && kids.length > 1 && kids.some(k => typeof k === 'string' && CJK.test(k))) {
        // 「已玩 」{n}「 局」: the text around the values is one sentence — translate it whole
        const s = kids.map(k => (k == null || typeof k === 'boolean' ? '' : String(k))).join('');
        return o.apply(this, args.slice(0, 2).concat([tr(s)]));
      }
      for (let i = 2; i < args.length; i++) if (typeof args[i] === 'string' && CJK.test(args[i])) args[i] = tr(args[i]);
    }
    return o.apply(this, args);
  };
}
(function waitReact() { if (W.React) hookReact(W.React); else setTimeout(waitReact, 20); })();

// ───────── the screen: canvas ─────────
// a translation much wider than the Chinese it replaces is drawn smaller, so it keeps to about the room the Chinese had
const CP = CanvasRenderingContext2D.prototype, oF = CP.fillText, oS = CP.strokeText, oM = CP.measureText;
const FIT = new Map();
function fitFont(ctx, src, dst) {
  const f = ctx.font, key = f + '\u0001' + src; let k = FIT.get(key);
  if (k === undefined) {
    const w0 = oM.call(ctx, src).width, w1 = oM.call(ctx, dst).width, room = w0 * (src.length <= 4 ? 1.8 : 1.35);
    k = w1 > room && w1 > 0 ? Math.max(0.6, room / w1) : 1; FIT.set(key, k); if (FIT.size > 20000) FIT.clear();
  }
  if (k === 1) return null;
  return f.replace(/(\d+(?:\.\d+)?)px/, (m, n) => (Math.round(+n * k * 2) / 2) + 'px');
}
function draw(fn) {
  return function (t, x, y, mw) {
    if ((I.on || I.harvest) && typeof t === 'string' && CJK.test(t)) {
      const r = tr(t);
      if (r !== t) {
        const nf = fitFont(this, t, r), of = this.font, od = this.direction;
        if (nf) this.font = nf; if (ARAB.test(r)) this.direction = 'rtl';
        const out = mw === undefined ? fn.call(this, r, x, y) : fn.call(this, r, x, y, mw);
        if (nf) this.font = of; if (ARAB.test(r)) this.direction = od;
        return out;
      }
    }
    return mw === undefined ? fn.call(this, t, x, y) : fn.call(this, t, x, y, mw);
  };
}
CP.fillText = draw(oF); CP.strokeText = draw(oS);
CP.measureText = function (t) {
  if (I.on && typeof t === 'string' && CJK.test(t)) { const r = tr(t); if (r !== t) { const nf = fitFont(this, t, r); if (!nf) return oM.call(this, r); const of = this.font; this.font = nf; const m = oM.call(this, r); this.font = of; return m; } }
  return oM.call(this, t);
};

// ───────── the screen: text the template does not own (a few panels write DOM directly) ─────────
function sweep(root) {
  if (!I.on) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = tw.nextNode())) { const pe = n.parentElement; if (pe && (pe.tagName === 'SCRIPT' || pe.tagName === 'STYLE' || pe.closest('script,style'))) continue; const v = n.nodeValue; if (v && CJK.test(v)) { const r = tr(v); if (r !== v) n.nodeValue = r; } }
}
(function rtlCss() { if (!document.head) return setTimeout(rtlCss, 20); const st = document.createElement('style'); st.textContent = 'html.mc-rtl body * { unicode-bidi: plaintext; }'; document.head.appendChild(st); })();
let mo = null;
function watchDom() {
  if (mo || !W.MutationObserver || !document.body) return;
  mo = new MutationObserver((recs) => { if (!I.on) return; for (const r of recs) { if (r.type === 'characterData') { const pe = r.target.parentElement; if (pe && (pe.tagName === 'SCRIPT' || pe.tagName === 'STYLE')) continue; const v = r.target.nodeValue; if (v && CJK.test(v)) { const t = tr(v); if (t !== v) r.target.nodeValue = t; } } else r.addedNodes.forEach(n => { if (n.nodeType === 3) { if (n.parentElement && (n.parentElement.tagName === 'SCRIPT' || n.parentElement.tagName === 'STYLE')) return; const v = n.nodeValue; if (v && CJK.test(v)) { const t = tr(v); if (t !== v) n.nodeValue = t; } } else if (n.nodeType === 1 && n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE') sweep(n); }); } });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
}

// ───────── a translation longer than its box: the text gets smaller, down to 60 % (every 250 ms, only elements we translated) ─────────
let fitAt = 0;
function fitDom() {
  if (!I.on || !document.body) return;
  document.querySelectorAll('[data-tr]').forEach(el => {
    if (!el.isConnected || !el.offsetParent && el.style.position !== 'fixed') return;
    const cs = getComputedStyle(el); if (cs.display === 'inline' || !el.clientWidth) return;   // an inline span has no box of its own
    const base = +(el.dataset.fs0 || parseFloat(cs.fontSize)); if (!base) return;
    if (!el.dataset.fs0) el.dataset.fs0 = base;
    const cur = parseFloat(el.style.fontSize) || base;
    const over = Math.max(el.scrollWidth / Math.max(1, el.clientWidth), cs.whiteSpace === 'nowrap' ? 1 : el.scrollHeight / Math.max(1, el.clientHeight));
    if (over > 1.02) { const n = Math.max(base * 0.6, Math.floor(cur / over)); if (n < cur) el.style.fontSize = n + 'px'; }
    else if (cur < base && over < 0.9) el.style.fontSize = Math.min(base, cur + 1) + 'px';
  });
}
(function fitLoop() { const t = performance.now(); if (t - fitAt > 250) { fitAt = t; try { fitDom(); } catch (e) {} } requestAnimationFrame(fitLoop); })();

// ───────── switching ─────────
I.set = function (code, persist) {
  if (!LANGS.some(l => l[0] === code)) code = 'en';
  I.lang = code; I.dict = code === 'zh-CN' ? {} : (W.MC_I18N && W.MC_I18N[code]) || {}; I.on = code !== 'zh-CN' && Object.keys(I.dict).length > 0;
  CACHE.clear(); FIT.clear(); NT = null;
  const html = document.documentElement; html.lang = code; html.classList.toggle('mc-rtl', code === 'ar');
  if (persist) { try { const s = JSON.parse(localStorage.getItem(SKEY) || '{}') || {}; s.lang = code; localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} if (M.settings) M.settings.lang = code; }
  if (I.on) { watchDom(); if (document.body) sweep(document.body); }
  const g = M._g || W.__mcg; if (g && g.bump) g.bump();
  return code;
};
I.name = (code) => (LANGS.find(l => l[0] === code) || [])[1] || code;
I.keep = (s) => KEEP + s;
// the languages that can be chosen: Chinese and every language with a dictionary
I.ready = () => LANGS.filter(l => l[0] === 'zh-CN' || (W.MC_I18N && W.MC_I18N[l[0]] && Object.keys(W.MC_I18N[l[0]]).length));
// the settings keep the choice (M.loadSettings rebuilds its object from known fields: keep this one too)
const oLS = M.loadSettings;
if (oLS) M.loadSettings = function () { const s = oLS.apply(this, arguments); const sv = saved(); if (sv) s.lang = sv; return s; };
if (M.settings) { const sv = saved(); if (sv) M.settings.lang = sv; }
I.set(detect(), false);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => I.set(I.lang, false)); else setTimeout(() => I.set(I.lang, false), 0);

// harvest (tools): every Chinese string that reached the screen, as its key; window.__i18nDump() returns them
W.__i18nHarvest = (on) => { I.harvest = on !== false; return I.harvest; };
W.__i18nDump = () => [...I.miss.entries()].sort((a, b) => b[1] - a[1]);
W.__i18nSet = (code) => I.set(code, false);
})();
