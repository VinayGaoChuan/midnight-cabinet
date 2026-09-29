// Chrome for the store tools: $CHROME if set, else where Chrome usually is on this computer (macOS / Windows / Linux)
import fs from 'node:fs';
import path from 'node:path';
export function CHROME_BIN() {
  if (process.env.CHROME) return process.env.CHROME;
  const C = process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    : process.platform === 'win32' ? [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean).map(d => path.join(d, 'Google', 'Chrome', 'Application', 'chrome.exe'))
    : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const hit = C.find(p => fs.existsSync(p));
  if (!hit) throw new Error('没有找到 Chrome：安装 Google Chrome，或设环境变量 CHROME 指向它');
  return hit;
}
