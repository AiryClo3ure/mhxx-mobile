@echo off
title MHXX 图鉴 - 本地服务器
echo ========================================
echo    MHXX 图鉴 - 手机版
echo ========================================
echo.
echo 正在启动本地服务器...
echo.
cd /d "%~dp0"
python -m http.server 8080
if %errorlevel% neq 0 (
    echo Python未找到，尝试使用其他方式...
    echo 请安装Python或手动使用其他HTTP服务器。
    pause
)
