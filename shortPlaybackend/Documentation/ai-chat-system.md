# AI聊天系统技术文档

## 系统概述

本AI聊天系统具备完整的上下文记忆功能和全面的压力测试方案，采用现代化的架构设计，确保高性能、高可用性和良好的用户体验。

## 核心功能

### 1. 上下文记忆功能

#### 1.1 会话管理机制
- **会话ID生成**: `userId_timestamp_randomString` 格式确保唯一性
- **会话生命周期**: 24小时自动过期，支持手动延长
- **会话状态**: active（活跃）、expired（过期）、archived（归档）

#### 1.2 消息存储策略
- **Redis存储**: 使用Redis作为主要存储，支持高并发读写
- **消息限制**: 每个会话最多存储1000条消息，超出自动清理最旧消息
- **数据结构**: 
  ```json
  {
    "id": "sessionId",
    "userId": "userId", 
    "messages": [
      {
        "id": "messageId",
        "type": "user|ai",
        "content": "消息内容",
        "timestamp": "ISO时间戳"
      }
    ],
    "messageCount": 100,
    "createdAt": "创建时间",
    "updatedAt": "更新时间"
  }
  ```

#### 1.3 上下文窗口
- **默认窗口大小**: 10条最近消息
- **动态调整**: 根据消息长度和复杂度自动调整
- **上下文压缩**: 对超长对话进行智能压缩

### 2. 压力测试方案

#### 2.1 测试工具集成
- **Node.js原生测试**: 自定义测试脚本，支持并发、负载递增、持续测试
- **Locust测试**: Python驱动的Web界面压力测试
- **JMeter测试**: 企业级性能测试工具配置

#### 2.2 测试场景
- **并发用户测试**: 模拟多用户同时使用
- **负载递增测试**: 逐步增加并发数，找到系统瓶颈
- **持续测试**: 长时间稳定负载测试
- **峰值测试**: 短时间高并发冲击测试
- **错误恢复测试**: 异常情况下的系统恢复能力

#### 2.3 性能指标监控
- **响应时间**: 平均、最小、最大、P95、P99
- **吞吐量**: RPS（每秒请求数）
- **错误率**: 失败请求占比
- **资源使用**: CPU、内存、网络IO

### 3. 技术架构

#### 3.1 后端架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│  Rate Limiter   │────│ Circuit Breaker │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Service Monitor │────│  Cache Layer    │────│  Request Queue  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Service    │────│ Session Service │────│  Redis Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### 3.2 前端架构
- **Vue.js组件**: 模块化的聊天界面
- **状态管理**: 本地状态 + Redis会话同步
- **懒加载**: 历史消息按需加载
- **内存管理**: 自动清理过多消息

#### 3.3 WebSocket支持
- **实时通信**: 支持流式AI回复
- **连接管理**: 自动重连和错误处理
- **消息确认**: 确保消息可靠传输

## API接口文档

### 会话管理

#### 创建会话
```
POST /api/ai/session/create
Content-Type: application/json

{
  "userId": "用户ID",
  "sessionData": {
    "title": "会话标题",
    "platform": "平台标识"
  }
}
```

#### 获取用户会话列表
```
GET /api/ai/sessions/:userId
```

#### 获取会话消息（分页）
```
GET /api/ai/session/:sessionId/messages?page=1&pageSize=20
```

#### 删除会话
```
DELETE /api/ai/session/:sessionId
Content-Type: application/json

{
  "userId": "用户ID"
}
```

### AI聊天

#### 带上下文聊天
```
POST /api/ai/chat-with-context
Content-Type: application/json

{
  "sessionId": "会话ID",
  "userId": "用户ID", 
  "message": "用户消息",
  "model": "THUDM/GLM-4-9B-0414",
  "contextSize": 10
}
```

#### 流式聊天（WebSocket）
```javascript
// 连接WebSocket
const socket = io('ws://localhost:3000', {
  auth: { userId: 'your_user_id' }
});

// 发送消息
socket.emit('aiChatWithContext', {
  sessionId: 'session_id',
  message: '用户消息'
});

// 接收回复
socket.on('aiResponse', (data) => {
  console.log('AI回复:', data.content);
});
```

### 系统监控

#### 获取系统状态
```
GET /api/system/status
```

#### 重置性能统计
```
POST /api/system/reset-stats
```

#### 清除缓存
```
DELETE /api/system/cache?pattern=*
```

## 性能优化策略

### 1. 缓存策略

#### 1.1 多级缓存
- **L1缓存**: 应用内存缓存（快速访问）
- **L2缓存**: Redis缓存（共享存储）
- **L3缓存**: CDN缓存（静态资源）

#### 1.2 缓存淘汰
- **LRU策略**: 最近最少使用的数据优先淘汰
- **TTL过期**: 设置合理的过期时间
- **主动清理**: 定期清理过期数据

### 2. 数据压缩

#### 2.1 消息压缩
```javascript
// 压缩前
{
  "type": "user",
  "content": "消息内容", 
  "time": "12:34",
  "id": "123456"
}

// 压缩后
{
  "t": "user",
  "c": "消息内容",
  "tm": "12:34", 
  "id": "123456"
}
```

#### 2.2 传输压缩
- **Gzip压缩**: HTTP响应自动压缩
- **WebSocket压缩**: 实时消息压缩传输

### 3. 懒加载机制

#### 3.1 消息懒加载
- **分页加载**: 每页20条消息
- **上拉刷新**: 自动加载更多历史消息
- **虚拟滚动**: 大量消息时的性能优化

#### 3.2 批量处理
- **消息批处理**: 10条消息为一批
- **延迟渲染**: 分批渲染避免UI卡顿

## 服务保障机制

### 1. 速率限制
- **AI聊天限制**: 每分钟30条消息
- **会话创建限制**: 每分钟10个会话
- **基于用户+IP**: 防止恶意刷量

### 2. 断路器模式
- **失败阈值**: 连续5次失败触发断路
- **恢复时间**: 60秒后尝试恢复
- **半开状态**: 逐步恢复服务

### 3. 服务降级
- **错误率监控**: 超过10%错误率触发降级
- **响应时间监控**: 超过10秒响应时间降级
- **降级策略**: 返回预设简化回复

### 4. 请求队列
- **队列大小**: 最多1000个待处理请求
- **超时处理**: 30秒处理超时
- **负载保护**: 超出队列容量拒绝请求

## 压力测试使用指南

### 1. 快速测试
```bash
# 进入测试目录
cd shortPlaybackend/tests

# 运行快速测试
node stress-test.js
```

### 2. 完整测试套件
```bash
# 给脚本执行权限
chmod +x run-tests.sh

# 运行完整测试
./run-tests.sh
```

### 3. Locust Web界面测试
```bash
# 安装Locust
pip3 install locust

# 启动Web界面
locust -f locust-test.py --host=http://localhost:3000

# 打开浏览器访问 http://localhost:8089
```

### 4. JMeter测试
```bash
# 命令行模式
jmeter -n -t jmeter-test-plan.jmx -l results.jtl -e -o report/

# GUI模式
jmeter -t jmeter-test-plan.jmx
```

## 监控和告警

### 1. 实时监控
- **系统资源**: CPU、内存、磁盘、网络
- **应用指标**: 响应时间、错误率、吞吐量
- **Redis指标**: 连接数、内存使用、键空间

### 2. 告警机制
- **CPU使用率 > 80%**: 高CPU使用警告
- **内存使用 > 1GB**: 高内存使用警告
- **错误率 > 10%**: 高错误率警告
- **响应时间 > 10s**: 响应时间过长警告

### 3. 日志管理
- **结构化日志**: JSON格式便于分析
- **日志分级**: ERROR、WARN、INFO、DEBUG
- **日志轮转**: 按日期和大小轮转

## 部署建议

### 1. 生产环境配置
```javascript
// 环境变量
NODE_ENV=production
REDIS_URL=redis://your-redis-server:6379
SILICONFLOW_API_KEY=your-api-key

// PM2配置
{
  "apps": [{
    "name": "ai-chat-api",
    "script": "server.js",
    "instances": "max",
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production"
    }
  }]
}
```

### 2. 容器化部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 3. 负载均衡
- **Nginx配置**: 反向代理和负载均衡
- **健康检查**: 定期检查服务状态
- **故障转移**: 自动切换到备用服务

## 故障排查

### 1. 常见问题

#### Redis连接失败
```bash
# 检查Redis服务状态
redis-cli ping

# 查看连接配置
echo $REDIS_URL
```

#### AI API调用失败
```bash
# 检查API密钥
echo $SILICONFLOW_API_KEY

# 测试API连接
curl -H "Authorization: Bearer $SILICONFLOW_API_KEY" \
     https://api.siliconflow.cn/v1/models
```

#### 内存泄漏
```bash
# 查看进程内存使用
ps aux | grep node

# 生成内存快照
node --expose-gc --inspect server.js
```

### 2. 性能调优

#### 2.1 数据库优化
- **连接池**: 合理设置Redis连接池大小
- **索引优化**: 为查询频繁的字段建立索引
- **数据压缩**: 启用Redis数据压缩

#### 2.2 应用优化
- **代码分割**: 按功能模块分割代码
- **异步处理**: 使用异步操作避免阻塞
- **内存管理**: 及时释放不用的对象

#### 2.3 网络优化
- **HTTP/2**: 启用HTTP/2协议
- **Keep-Alive**: 保持连接复用
- **压缩传输**: 启用Gzip压缩

## 扩展功能

### 1. 多模态支持
- **语音消息**: 语音转文字功能
- **图片消息**: 图片识别和描述
- **文件消息**: 文档解析和问答

### 2. 智能推荐
- **上下文分析**: 基于对话历史推荐相关问题
- **用户画像**: 分析用户偏好提供个性化服务
- **热门问题**: 统计和推荐常见问题

### 3. 管理后台
- **会话管理**: 查看和管理所有用户会话
- **性能监控**: 实时监控系统性能指标
- **用户分析**: 用户行为和使用统计

## 安全考虑

### 1. 数据安全
- **敏感信息过滤**: 自动检测和过滤敏感信息
- **数据加密**: 对存储的消息进行加密
- **访问控制**: 基于角色的访问权限控制

### 2. 接口安全
- **身份认证**: JWT令牌验证
- **权限校验**: 细粒度的权限控制
- **防护机制**: 防SQL注入、XSS攻击

### 3. 隐私保护
- **数据匿名化**: 对用户数据进行匿名化处理
- **数据清理**: 定期清理过期的用户数据
- **合规性**: 符合GDPR、个人信息保护法等法规

## 运维指南

### 1. 监控告警
```bash
# 查看系统状态
curl http://localhost:3000/api/system/status

# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log
```

### 2. 备份恢复
```bash
# Redis数据备份
redis-cli BGSAVE

# 恢复Redis数据
redis-cli --rdb dump.rdb
```

### 3. 性能调优
```bash
# 查看进程状态
pm2 status

# 重启服务
pm2 restart ai-chat-api

# 查看监控面板
pm2 monit
```

## 测试报告示例

### 性能测试结果
```json
{
  "summary": {
    "totalRequests": 1000,
    "successfulRequests": 985,
    "failedRequests": 15,
    "successRate": "98.50%",
    "averageResponseTime": "2341.25ms",
    "maxResponseTime": "8765.43ms",
    "p95ResponseTime": "4521.67ms"
  },
  "recommendations": [
    "系统性能表现良好",
    "建议优化长响应时间的请求"
  ]
}
```

### 系统监控报告
```json
{
  "summary": {
    "duration": "300.00s",
    "avgCpuUsage": "45.23%",
    "maxCpuUsage": "78.91%", 
    "avgMemoryUsed": "256.78MB",
    "maxMemoryUsed": "412.34MB",
    "avgLoadAvg": "1.23"
  },
  "alerts": [],
  "recommendations": [
    "系统资源使用正常"
  ]
}
```

## 版本更新日志

### v1.0.0 (当前版本)
- ✅ 基础AI聊天功能
- ✅ 上下文记忆机制
- ✅ 压力测试套件
- ✅ 性能监控系统
- ✅ 服务保障机制

### 计划功能 (v1.1.0)
- 🔄 WebSocket完整实现
- 🔄 多模态消息支持
- 🔄 管理后台界面
- 🔄 高级分析功能

## 联系和支持

如有技术问题或改进建议，请联系开发团队。

---
*文档最后更新: 2024年* 