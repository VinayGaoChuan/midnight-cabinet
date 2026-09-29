// Injected before the page's own scripts (Page.addScriptToEvaluateOnNewDocument): the page's clock becomes ours, so a recording
// is frame-exact — every captured frame is exactly 1/30 s of game time however long the capture takes.
// · real mode (default): the clock follows the real one, the page runs as usual (booting, the bot fast-forwarding).
// · manual mode: time only moves when the recorder calls __vt.step(ms) — timers, intervals and animation frames fire in order.
// · audio: with __VT_CFG.audioSecs, the game's AudioContext is an OfflineAudioContext whose clock is this one; the recorder renders
//   it at the end, so the recording carries the game's own sound, sample-exact.
(() => {
  if (window.__vt) return;
  const W = window, P = W.performance, CFG = W.__VT_CFG || {};
  const rNow = P.now.bind(P), rRaf = W.requestAnimationFrame.bind(W), dateBase = Date.now() - rNow();
  const V = W.__vt = { t: rNow(), manual: false, off: 0, timers: new Map(), raf: new Map(), seq: 1, rseq: 1, frames: 0, ac: null, acT0: 0 };
  P.now = () => V.t;
  Date.now = () => Math.floor(dateBase + V.t);
  W.setTimeout = function (fn, ms, ...a) { const id = V.seq++; V.timers.set(id, { at: V.t + Math.max(0, +ms || 0), fn, a, iv: 0 }); return id; };
  W.setInterval = function (fn, ms, ...a) { const id = V.seq++, iv = Math.max(4, +ms || 0); V.timers.set(id, { at: V.t + iv, fn, a, iv }); return id; };
  W.clearTimeout = W.clearInterval = function (id) { V.timers.delete(id); };
  W.requestAnimationFrame = function (fn) { const id = V.rseq++; V.raf.set(id, fn); return id; };
  W.cancelAnimationFrame = function (id) { V.raf.delete(id); };
  const runTimers = (to) => {
    for (let guard = 0; guard < 20000; guard++) {
      let best = null, bid = 0;
      for (const [id, tm] of V.timers) if (tm.at <= to && (!best || tm.at < best.at || (tm.at === best.at && id < bid))) { best = tm; bid = id; }
      if (!best) break;
      if (best.at > V.t) V.t = best.at;
      if (best.iv) { best.at += best.iv; if (best.at < V.t) best.at = V.t + best.iv; } else V.timers.delete(bid);
      try { if (typeof best.fn === 'function') best.fn(...best.a); } catch (e) { console.error(e); }
    }
    if (to > V.t) V.t = to;
  };
  const frame = (to) => { runTimers(to); const cbs = [...V.raf.values()]; V.raf.clear(); for (const f of cbs) { try { f(V.t); } catch (e) { console.error(e); } } V.frames++; };
  V.step = (ms) => { frame(V.t + ms); return V.t; };
  V.setManual = (on) => { if (!on && V.manual) V.off = rNow() - V.t; V.manual = !!on; return V.t; };
  const loop = () => { if (!V.manual) { const to = rNow() - V.off; if (to > V.t) frame(to); } rRaf(loop); };
  rRaf(loop);
  // CSS animations run on the compositor's own clock: the recorder slows them to the capture speed (Animation.setPlaybackRate)
  if (CFG.audioSecs) {
    const SR = 48000;
    const Fake = function () {
      if (V.ac) return V.ac;
      const oc = new OfflineAudioContext({ numberOfChannels: 2, length: Math.ceil(SR * CFG.audioSecs), sampleRate: SR });
      V.acT0 = V.t;
      Object.defineProperty(oc, 'currentTime', { get: () => Math.max(0, (V.t - V.acT0) / 1000) });
      Object.defineProperty(oc, 'state', { get: () => 'running' });
      Object.defineProperty(oc, 'baseLatency', { get: () => 0 });
      Object.defineProperty(oc, 'outputLatency', { get: () => 0 });
      oc.resume = () => Promise.resolve(); oc.suspend = () => Promise.resolve(); oc.close = () => Promise.resolve();
      V.ac = oc; return oc;
    };
    W.AudioContext = W.webkitAudioContext = Fake;
    // the recorder calls this at the end: 16-bit stereo WAV, base64
    V.renderWav = async () => {
      const oc = V.ac; if (!oc) return null;
      const buf = await oc.startRendering(), n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1);
      const out = new DataView(new ArrayBuffer(44 + n * 4)); const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
      out.setUint32(24, SR, true); out.setUint32(28, SR * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * 4, true);
      for (let i = 0, o = 44; i < n; i++, o += 4) { out.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true); out.setInt16(o + 2, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
      V.wav = new Uint8Array(out.buffer); return { t0: V.acT0, bytes: V.wav.length };
    };
    // pulled in pieces: one CDP message cannot carry a whole recording
    V.wavPart = (from, len) => { const u8 = V.wav.subarray(from, from + len); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  }
})();
