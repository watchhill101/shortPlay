@echo off
chcp 65001 > nul

echo 🎯 AI聊天系统压力测试套件
echo ================================

REM 检查Node.js环境
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装
    pause
    exit /b 1
)

REM 检查Python环境（用于Locust）
python --version > nul 2>&1
if errorlevel 1 (
    echo ⚠️  Python 未安装，跳过Locust测试
    set SKIP_LOCUST=true
)

REM 创建测试结果目录
if not exist test-results mkdir test-results
if not exist monitoring-logs mkdir monitoring-logs

echo.
echo 🚀 开始测试...

REM 1. 检查后端服务状态
echo 1️⃣  检查后端服务状态...
curl -s http://localhost:3000/api/ai/health > nul 2>&1
if errorlevel 1 (
    echo 🔄 需要手动启动后端服务...
    echo 请在另一个终端运行: npm run dev
    echo 等待服务启动后按任意键继续...
    pause > nul
) else (
    echo ✅ 后端服务已运行
)

REM 2. 运行Node.js压力测试
echo.
echo 2️⃣  运行Node.js压力测试...
node stress-test.js > test-results\nodejs-stress-test-%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log 2>&1
if errorlevel 1 (
    echo ❌ Node.js压力测试失败
) else (
    echo ✅ Node.js压力测试完成
)

REM 3. 启动系统监控
echo.
echo 3️⃣  启动系统监控...
start /b node monitor.js
echo ✅ 系统监控已启动

REM 4. 运行Locust测试
if not "%SKIP_LOCUST%"=="true" (
    echo.
    echo 4️⃣  运行Locust压力测试...
    
    REM 检查locust是否安装
    pip list | findstr locust > nul 2>&1
    if errorlevel 1 (
        echo 📦 安装Locust...
        pip install locust
    )
    
    REM 运行Locust测试（无界面模式）
    locust -f locust-test.py --host=http://localhost:3000 --headless -u 10 -r 2 -t 2m --html test-results\locust-report-%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.html
    
    if errorlevel 1 (
        echo ❌ Locust压力测试失败
    ) else (
        echo ✅ Locust压力测试完成
    )
) else (
    echo ⏭️  跳过Locust测试
)

REM 5. 等待监控完成
echo.
echo 5️⃣  等待监控完成...
timeout /t 30 /nobreak > nul

REM 6. 生成测试报告
echo.
echo 6️⃣  生成测试报告...
(
echo # AI聊天系统压力测试报告
echo.
echo ## 测试时间
echo - 开始时间: %date% %time%
echo - 测试环境: Windows
echo.
echo ## 测试项目
echo - ✅ Node.js原生压力测试
if not "%SKIP_LOCUST%"=="true" (
    echo - ✅ Locust压力测试
) else (
    echo - ⏭️  Locust测试 ^(跳过^)
)
echo - ✅ 系统性能监控
echo.
echo ## 测试结果
echo 详细结果请查看test-results目录下的相关文件。
echo.
echo ## 建议
echo 根据测试结果优化系统性能和稳定性。
) > test-results\test-summary-%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.md

echo ✅ 测试报告已生成

echo.
echo 🎉 所有测试完成！
echo 📁 测试结果保存在: test-results\
echo 📁 监控日志保存在: monitoring-logs\
echo.
echo 查看测试结果:
echo   - Node.js测试: test-results\nodejs-stress-test-*.log
if not "%SKIP_LOCUST%"=="true" (
    echo   - Locust报告: test-results\locust-report-*.html
)
echo   - 系统监控: monitoring-logs\

pause 