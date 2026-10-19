@echo off
chcp 936 >nul
title 小沃桌宠 - 开发服务器
cd /d "%~dp0"

echo ============================================
echo   小沃桌宠 / My First DesktopPet
echo ============================================
echo.

if not exist "node_modules\" (
  echo [1/2] 首次运行，正在安装依赖，可能要一两分钟...
  call npm install
  echo.
)

echo [2/2] 正在启动开发服务器，就绪后自动打开浏览器...
echo       关闭这个窗口 = 停止服务器
echo.

call npm run dev -- --open

echo.
echo 服务器已停止。
pause
