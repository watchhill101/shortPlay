#!/bin/bash

# AI聊天系统压力测试运行脚本

echo "🎯 AI聊天系统压力测试套件"
echo "================================"

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

# 检查Python环境（用于Locust）
if ! command -v python3 &> /dev/null; then
    echo "⚠️  Python3 未安装，跳过Locust测试"
    SKIP_LOCUST=true
fi

# 检查JMeter环境
if ! command -v jmeter &> /dev/null; then
    echo "⚠️  JMeter 未安装，跳过JMeter测试"
    SKIP_JMETER=true
fi

# 创建测试结果目录
mkdir -p test-results
mkdir -p monitoring-logs

echo ""
echo "🚀 开始测试..."

# 1. 启动后端服务（如果未运行）
echo "1️⃣  检查后端服务状态..."
if curl -s http://localhost:3000/api/ai/health > /dev/null; then
    echo "✅ 后端服务已运行"
else
    echo "🔄 启动后端服务..."
    cd ..
    npm run dev &
    SERVER_PID=$!
    echo "⏳ 等待服务启动..."
    sleep 10
    cd tests
fi

# 2. 运行Node.js压力测试
echo ""
echo "2️⃣  运行Node.js压力测试..."
node stress-test.js > test-results/nodejs-stress-test-$(date +%Y%m%d_%H%M%S).log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Node.js压力测试完成"
else
    echo "❌ Node.js压力测试失败"
fi

# 3. 启动系统监控
echo ""
echo "3️⃣  启动系统监控..."
node monitor.js &
MONITOR_PID=$!
echo "✅ 系统监控已启动 (PID: $MONITOR_PID)"

# 4. 运行Locust测试
if [ "$SKIP_LOCUST" != "true" ]; then
    echo ""
    echo "4️⃣  运行Locust压力测试..."
    
    # 检查locust是否安装
    if ! pip3 list | grep -q locust; then
        echo "📦 安装Locust..."
        pip3 install locust
    fi
    
    # 运行Locust测试（无界面模式）
    locust -f locust-test.py --host=http://localhost:3000 --headless -u 10 -r 2 -t 2m --html test-results/locust-report-$(date +%Y%m%d_%H%M%S).html
    
    if [ $? -eq 0 ]; then
        echo "✅ Locust压力测试完成"
    else
        echo "❌ Locust压力测试失败"
    fi
else
    echo "⏭️  跳过Locust测试"
fi

# 5. 运行JMeter测试
if [ "$SKIP_JMETER" != "true" ]; then
    echo ""
    echo "5️⃣  运行JMeter压力测试..."
    
    jmeter -n -t jmeter-test-plan.jmx -l test-results/jmeter-results-$(date +%Y%m%d_%H%M%S).jtl -e -o test-results/jmeter-report-$(date +%Y%m%d_%H%M%S)/
    
    if [ $? -eq 0 ]; then
        echo "✅ JMeter压力测试完成"
    else
        echo "❌ JMeter压力测试失败"
    fi
else
    echo "⏭️  跳过JMeter测试"
fi

# 6. 等待监控完成
echo ""
echo "6️⃣  等待监控完成..."
sleep 30

# 停止监控
if [ ! -z "$MONITOR_PID" ]; then
    kill $MONITOR_PID 2>/dev/null
    echo "✅ 系统监控已停止"
fi

# 7. 生成综合报告
echo ""
echo "7️⃣  生成测试报告..."
cat > test-results/test-summary-$(date +%Y%m%d_%H%M%S).md << EOF
# AI聊天系统压力测试报告

## 测试时间
- 开始时间: $(date)
- 测试环境: $(uname -a)

## 测试项目
- ✅ Node.js原生压力测试
$([ "$SKIP_LOCUST" != "true" ] && echo "- ✅ Locust压力测试" || echo "- ⏭️  Locust测试 (跳过)")
$([ "$SKIP_JMETER" != "true" ] && echo "- ✅ JMeter压力测试" || echo "- ⏭️  JMeter测试 (跳过)")
- ✅ 系统性能监控

## 测试结果
详细结果请查看test-results目录下的相关文件。

## 系统信息
- Node.js版本: $(node --version)
- 内存总量: $(free -h | grep Mem | awk '{print $2}' || echo "N/A")
- CPU核心数: $(nproc || echo "N/A")

## 建议
根据测试结果优化系统性能和稳定性。
EOF

echo "✅ 测试报告已生成"

# 8. 清理
echo ""
echo "8️⃣  清理测试环境..."

# 停止后端服务（如果是我们启动的）
if [ ! -z "$SERVER_PID" ]; then
    kill $SERVER_PID 2>/dev/null
    echo "✅ 后端服务已停止"
fi

echo ""
echo "🎉 所有测试完成！"
echo "📁 测试结果保存在: test-results/"
echo "📁 监控日志保存在: monitoring-logs/"
echo ""
echo "查看测试结果:"
echo "  - Node.js测试: test-results/nodejs-stress-test-*.log"
if [ "$SKIP_LOCUST" != "true" ]; then
echo "  - Locust报告: test-results/locust-report-*.html"
fi
if [ "$SKIP_JMETER" != "true" ]; then
echo "  - JMeter报告: test-results/jmeter-report-*/"
fi
echo "  - 系统监控: monitoring-logs/" 