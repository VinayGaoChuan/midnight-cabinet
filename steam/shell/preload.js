'use strict';
// 存档镜像：游戏照常用 localStorage；这里把它同步到 save.json，Steam 云存档同步这个文件。
// 规则：save.json 比本地新（换了电脑、云端有更新）→ 启动时写回 localStorage；之后本地有变动就导出。

const { contextBridge, ipcRenderer } = require('electron');

// 给页面一个导出日志的入口（测试版角标用）
contextBridge.exposeInMainWorld('__wgpNative', { exportLogs: () => ipcRenderer.send('wgp:export-logs') });

const STAMP = '__mc_saved_at';
let lastExported = null;

function snapshot() {
  const items = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key !== STAMP) items[key] = localStorage.getItem(key);
  }
  return items;
}

function restore() {
  const saved = ipcRenderer.sendSync('save:load');
  if (!saved || !saved.items) return;
  const localStamp = Number(localStorage.getItem(STAMP) || 0);
  if (Number(saved.savedAt) <= localStamp) return;
  localStorage.clear();
  for (const [key, value] of Object.entries(saved.items)) localStorage.setItem(key, value);
  localStorage.setItem(STAMP, String(saved.savedAt));
  lastExported = JSON.stringify(saved.items);
}

function flush() {
  try {
    const items = snapshot();
    const json = JSON.stringify(items);
    if (json === lastExported) return;
    const savedAt = Date.now();
    if (ipcRenderer.sendSync('save:store', { savedAt, items })) {
      localStorage.setItem(STAMP, String(savedAt));
      lastExported = json;
    }
  } catch {
    // 存档镜像失败不影响游戏本身（localStorage 仍然有效）
  }
}

try {
  restore();
} catch {
  // 同上
}

setInterval(flush, 10000);
window.addEventListener('mc:flush-save', flush);
window.addEventListener('pagehide', flush);
window.addEventListener('beforeunload', flush);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
