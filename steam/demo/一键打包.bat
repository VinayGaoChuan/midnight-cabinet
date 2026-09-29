@echo off
chcp 65001 >nul
rem 午夜机台 试玩版 · 一键打包（Windows：双击运行）。用上一级的打包工具，产物在本文件夹的 build\ 和 输出\
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 没有找到 Node.js。请先安装 https://nodejs.org （选 LTS 版本），装好后再双击本文件。
  if not defined MC_NO_PAUSE pause
  exit /b 1
)
node prep.mjs
if errorlevel 1 (
  if not defined MC_NO_PAUSE pause
  exit /b 1
)
set WGP_PROJECT=%CD%
node ..\tools\build.mjs
set CODE=%ERRORLEVEL%
if not defined MC_NO_PAUSE pause
exit /b %CODE%
