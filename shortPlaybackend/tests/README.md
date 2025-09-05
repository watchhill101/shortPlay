# AI聊天系统测试套件

## 概述

这是一个完整的AI聊天系统测试套件，包含压力测试、性能监控和WebSocket测试功能。

## 快速开始

### 1. 环境准备

确保已安装以下依赖：

- Node.js 16+
- Redis服务器
- Python 3.7+ (可选，用于Locust测试)
- JMeter 5.0+ (可选，用于JMeter测试)

### 2. 启动后端服务

```bash
cd shortPlaybackend
npm install
npm run dev
```

### 3. 运行测试

#### 快速测试

```bash
cd tests
node stress-test.js
```

#### 完整测试套件

```bash
chmod +x run-tests.sh
./run-tests.sh
```

## 测试工具说明

### 1. Node.js压力测试 (`stress-test.js`)

**功能特性：**

- 并发用户测试
- 负载递增测试
- 持续耐久测试
- 内存泄漏检测
- 错误恢复测试

**使用方法：**

```bash
# 基础测试
node stress-test.js

# 自定义测试
const { ChatStressTester } = require('./stress-test');
const tester = new ChatStressTester();
await tester.concurrentUsersTest(10, 5); // 10个用户，每用户5条消息
```

### 2. 系统监控 (`monitor.js`)

**功能特性：**

- 实时系统资源监控
- Redis性能监控
- 应用性能统计
- 自动生成监控报告

**使用方法：**

```bash
# 启动监控（60秒）
node monitor.js

# 编程方式使用
const { startFullMonitoring } = require('./monitor');
const monitor = await startFullMonitoring(300000); // 5分钟监控
```

### 3. WebSocket测试 (`websocket-client-example.js`)

**功能特性：**

- 实时连接测试
- 流式消息测试
- 并发连接压力测试
- 消息确认机制测试

**使用方法：**

```bash
# WebSocket压力测试
node websocket-client-example.js

# 编程方式使用
const { WebSocketChatClient } = require('./websocket-client-example');
const client = new WebSocketChatClient();
await client.connect();
```

### 4. Locust Web界面测试 (`locust-test.py`)

**功能特性：**

- Web界面压力测试
- 多种用户行为模拟
- 实时性能图表
- 详细测试报告

**使用方法：**

```bash
# 安装依赖
pip3 install locust

# 启动Web界面
locust -f locust-test.py --host=http://localhost:3000

# 无界面模式
locust -f locust-test.py --host=http://localhost:3000 --headless -u 10 -r 2 -t 5m
```

### 5. JMeter测试 (`jmeter-test-plan.jmx`)

**功能特性：**

- 企业级性能测试
- 图形化测试配置
- 详细性能报告
- 断言和验证

**使用方法：**

```bash
# GUI模式
jmeter -t jmeter-test-plan.jmx

# 命令行模式
jmeter -n -t jmeter-test-plan.jmx -l results.jtl -e -o report/
```

## 测试场景

### 1. 基础功能测试

- 会话创建和管理
- 消息发送和接收
- 历史消息加载
- 上下文记忆验证

### 2. 性能压力测试

- **轻度负载**: 5个用户，持续5分钟
- **中度负载**: 20个用户，持续10分钟
- **重度负载**: 50个用户，持续2分钟
- **极限负载**: 100个用户，持续1分钟

### 3. 稳定性测试

- **长期运行**: 10个用户，持续30分钟
- **内存泄漏**: 100次迭代，监控内存使用
- **错误恢复**: 模拟各种异常情况

## 监控指标

### 系统指标

- CPU使用率
- 内存使用量
- 磁盘IO
- 网络IO
- 系统负载

### 应用指标

- 请求响应时间
- 请求成功率
- 错误率统计
- 并发连接数
- 队列长度

### Redis指标

- 连接数
- 内存使用
- 键空间大小
- 命令执行统计

## 测试结果分析

### 性能基准

- **响应时间**: < 3秒 (优秀), < 5秒 (良好), < 10秒 (可接受)
- **成功率**: > 99% (优秀), > 95% (良好), > 90% (可接受)
- **并发能力**: > 50用户 (优秀), > 20用户 (良好), > 10用户 (可接受)

### 报告文件

测试完成后，结果保存在以下位置：

- `test-results/`: 所有测试结果
- `monitoring-logs/`: 系统监控日志
- `*.html`: Locust HTML报告
- `*.jtl`: JMeter结果文件

## 故障排查

### 常见问题

1. **Redis连接失败**

   ```bash
   # 检查Redis服务
   redis-cli ping
   ```

2. **AI API调用失败**

   ```bash
   # 检查环境变量
   echo $SILICONFLOW_API_KEY
   ```

3. **WebSocket连接失败**
   ```bash
   # 检查Socket.IO服务
   curl http://localhost:3000/socket.io/
   ```

### 性能调优建议

1. **高响应时间**
   - 检查AI API响应速度
   - 优化Redis查询
   - 增加服务器资源

2. **高错误率**
   - 检查服务器日志
   - 验证API配置
   - 调整超时设置

3. **内存使用过高**
   - 检查内存泄漏
   - 调整消息缓存大小
   - 优化数据结构

## 扩展测试

### 自定义测试场景

```javascript
// 创建自定义压力测试
const { ChatStressTester } = require('./stress-test');

async function customTest() {
  const tester = new ChatStressTester();

  // 自定义并发测试
  await tester.concurrentUsersTest(15, 8);

  // 自定义负载递增测试
  await tester.loadRampTest(5, 30, 5, 20000);

  // 生成报告
  const report = tester.generateReport();
  console.log(report);
}
```

### 添加新的测试指标

```javascript
// 扩展监控类
class CustomMonitor extends SystemMonitor {
  recordCustomMetric(metricName, value) {
    // 自定义指标记录逻辑
  }
}
```

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 许可证

MIT License

---

更多详细信息请参考 [AI聊天系统技术文档](../Documentation/ai-chat-system.md)
