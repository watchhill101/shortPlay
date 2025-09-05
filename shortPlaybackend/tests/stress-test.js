// tests/stress-test.js
const axios = require('axios');
const { performance } = require('perf_hooks');

/**
 * AI聊天系统压力测试工具
 */
class ChatStressTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      errors: [],
      responseTimes: [],
    };
  }

  /**
   * 单个AI聊天请求测试
   */
  async singleChatTest(userId, sessionId, message, testId) {
    const startTime = performance.now();

    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/api/ai/chat-with-context`,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          sessionId,
          userId,
          message: `${message} (测试ID: ${testId})`,
          model: 'THUDM/GLM-4-9B-0414',
        },
        timeout: 30000,
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.recordSuccess(responseTime);

      return {
        success: true,
        responseTime,
        response: response.data,
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.recordFailure(error, responseTime);

      return {
        success: false,
        responseTime,
        error: error.message,
      };
    }
  }

  /**
   * 创建会话测试
   */
  async createSessionTest(userId) {
    const startTime = performance.now();

    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/api/ai/session/create`,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          userId,
          sessionData: {
            title: '压力测试会话',
            platform: 'test',
          },
        },
        timeout: 10000,
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      if (response.data.success) {
        return {
          success: true,
          sessionId: response.data.sessionId,
          responseTime,
        };
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        error: error.message,
        responseTime: endTime - startTime,
      };
    }
  }

  /**
   * 并发用户测试
   */
  async concurrentUsersTest(userCount = 10, messagesPerUser = 5) {
    console.log(`🚀 开始并发用户测试: ${userCount}个用户，每用户${messagesPerUser}条消息`);

    const startTime = performance.now();
    const promises = [];

    for (let i = 0; i < userCount; i++) {
      promises.push(this.singleUserTest(`user_${i}`, messagesPerUser));
    }

    const results = await Promise.allSettled(promises);
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const successfulUsers = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    console.log(`✅ 并发测试完成: ${successfulUsers}/${userCount} 用户成功，总耗时: ${totalTime.toFixed(2)}ms`);

    return {
      totalUsers: userCount,
      successfulUsers,
      totalTime,
      results,
    };
  }

  /**
   * 单用户多消息测试
   */
  async singleUserTest(userId, messageCount = 5) {
    try {
      // 创建会话
      const sessionResult = await this.createSessionTest(userId);
      if (!sessionResult.success) {
        throw new Error(`创建会话失败: ${sessionResult.error}`);
      }

      const sessionId = sessionResult.sessionId;
      const messages = [
        '你好，我是新用户',
        '我想了解一下会员服务',
        '视频播放有点卡顿',
        '如何修改个人信息',
        '支付出现问题怎么办',
      ];

      const results = [];

      for (let i = 0; i < messageCount; i++) {
        const message = messages[i % messages.length];
        const result = await this.singleChatTest(userId, sessionId, message, `${userId}_${i}`);
        results.push(result);

        // 模拟用户思考时间
        await this.sleep(Math.random() * 2000 + 500);
      }

      const successfulMessages = results.filter(r => r.success).length;

      return {
        success: true,
        userId,
        sessionId,
        totalMessages: messageCount,
        successfulMessages,
        results,
      };
    } catch (error) {
      return {
        success: false,
        userId,
        error: error.message,
      };
    }
  }

  /**
   * 负载递增测试
   */
  async loadRampTest(startUsers = 1, maxUsers = 20, stepSize = 2, stepDuration = 30000) {
    console.log(`📈 开始负载递增测试: ${startUsers} -> ${maxUsers} 用户，步长: ${stepSize}`);

    const results = [];

    for (let users = startUsers; users <= maxUsers; users += stepSize) {
      console.log(`\n🎯 测试 ${users} 并发用户...`);

      const testResult = await this.concurrentUsersTest(users, 3);
      results.push({
        userCount: users,
        ...testResult,
      });

      // 等待系统恢复
      if (users < maxUsers) {
        console.log(`⏳ 等待 ${stepDuration / 1000}s 后进行下一轮测试...`);
        await this.sleep(stepDuration);
      }
    }

    return results;
  }

  /**
   * 长时间持续测试
   */
  async enduranceTest(duration = 300000, userCount = 5) {
    // 默认5分钟
    console.log(`⏱️  开始持续测试: ${duration / 1000}s，${userCount}个用户`);

    const startTime = Date.now();
    const endTime = startTime + duration;
    const results = [];

    while (Date.now() < endTime) {
      const testResult = await this.concurrentUsersTest(userCount, 2);
      results.push({
        timestamp: new Date().toISOString(),
        ...testResult,
      });

      // 短暂休息
      await this.sleep(5000);

      const elapsed = Date.now() - startTime;
      const remaining = endTime - Date.now();
      console.log(`⏳ 已运行: ${(elapsed / 1000).toFixed(1)}s，剩余: ${(remaining / 1000).toFixed(1)}s`);
    }

    return results;
  }

  /**
   * 内存泄漏测试
   */
  async memoryLeakTest(iterations = 100) {
    console.log(`🧠 开始内存泄漏测试: ${iterations}次迭代`);

    const initialMemory = process.memoryUsage();
    const memorySnapshots = [initialMemory];

    for (let i = 0; i < iterations; i++) {
      await this.singleUserTest(`leak_test_user_${i}`, 10);

      // 每10次迭代记录内存使用情况
      if (i % 10 === 0) {
        const currentMemory = process.memoryUsage();
        memorySnapshots.push(currentMemory);

        const heapUsed = (currentMemory.heapUsed / 1024 / 1024).toFixed(2);
        console.log(`迭代 ${i}: 堆内存使用 ${heapUsed}MB`);
      }

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
    }

    const finalMemory = process.memoryUsage();
    memorySnapshots.push(finalMemory);

    return {
      initialMemory,
      finalMemory,
      memorySnapshots,
      iterations,
    };
  }

  /**
   * 错误恢复测试
   */
  async errorRecoveryTest() {
    console.log('🔧 开始错误恢复测试...');

    const tests = [
      {
        name: '无效会话ID测试',
        test: () => this.singleChatTest('test_user', 'invalid_session_id', '测试消息', 'error_test_1'),
      },
      {
        name: '空消息测试',
        test: async () => {
          const sessionResult = await this.createSessionTest('test_user');
          if (sessionResult.success) {
            return this.singleChatTest('test_user', sessionResult.sessionId, '', 'error_test_2');
          }
          return { success: false, error: '创建会话失败' };
        },
      },
      {
        name: '超长消息测试',
        test: async () => {
          const sessionResult = await this.createSessionTest('test_user');
          if (sessionResult.success) {
            const longMessage = 'A'.repeat(10000); // 10KB消息
            return this.singleChatTest('test_user', sessionResult.sessionId, longMessage, 'error_test_3');
          }
          return { success: false, error: '创建会话失败' };
        },
      },
    ];

    const results = [];

    for (const test of tests) {
      console.log(`测试: ${test.name}`);
      const result = await test.test();
      results.push({
        name: test.name,
        ...result,
      });
    }

    return results;
  }

  /**
   * 记录成功请求
   */
  recordSuccess(responseTime) {
    this.results.totalRequests++;
    this.results.successfulRequests++;
    this.results.responseTimes.push(responseTime);

    this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
    this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
    this.results.averageResponseTime =
      this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;
  }

  /**
   * 记录失败请求
   */
  recordFailure(error, responseTime) {
    this.results.totalRequests++;
    this.results.failedRequests++;
    this.results.responseTimes.push(responseTime);
    this.results.errors.push({
      message: error.message,
      timestamp: new Date().toISOString(),
      responseTime,
    });
  }

  /**
   * 生成测试报告
   */
  generateReport() {
    const successRate = ((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2);
    const p95ResponseTime = this.calculatePercentile(this.results.responseTimes, 95);
    const p99ResponseTime = this.calculatePercentile(this.results.responseTimes, 99);

    return {
      summary: {
        totalRequests: this.results.totalRequests,
        successfulRequests: this.results.successfulRequests,
        failedRequests: this.results.failedRequests,
        successRate: `${successRate}%`,
        averageResponseTime: `${this.results.averageResponseTime.toFixed(2)}ms`,
        minResponseTime: `${this.results.minResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${this.results.maxResponseTime.toFixed(2)}ms`,
        p95ResponseTime: `${p95ResponseTime.toFixed(2)}ms`,
        p99ResponseTime: `${p99ResponseTime.toFixed(2)}ms`,
      },
      errors: this.results.errors,
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * 计算百分位数
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;

    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * 生成性能建议
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.results.averageResponseTime > 5000) {
      recommendations.push('响应时间过长，建议优化AI模型或增加服务器资源');
    }

    if (this.results.failedRequests / this.results.totalRequests > 0.05) {
      recommendations.push('失败率过高，建议检查服务器稳定性和错误处理机制');
    }

    if (this.results.maxResponseTime > 30000) {
      recommendations.push('存在超时请求，建议调整超时设置或优化后端处理');
    }

    if (recommendations.length === 0) {
      recommendations.push('系统性能表现良好');
    }

    return recommendations;
  }

  /**
   * 延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重置测试结果
   */
  reset() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      errors: [],
      responseTimes: [],
    };
  }
}

/**
 * 运行完整的压力测试套件
 */
async function runFullStressTest() {
  const tester = new ChatStressTester();

  console.log('🎯 开始AI聊天系统压力测试');
  console.log('='.repeat(50));

  try {
    // 1. 基础功能测试
    console.log('\n📋 1. 基础功能测试');
    await tester.singleUserTest('basic_test_user', 3);

    // 2. 并发测试
    console.log('\n⚡ 2. 并发用户测试');
    await tester.concurrentUsersTest(5, 3);

    // 3. 负载递增测试
    console.log('\n📈 3. 负载递增测试');
    await tester.loadRampTest(2, 10, 2, 10000);

    // 4. 错误恢复测试
    console.log('\n🔧 4. 错误恢复测试');
    await tester.errorRecoveryTest();

    // 5. 短期持续测试
    console.log('\n⏱️  5. 持续测试 (60秒)');
    await tester.enduranceTest(60000, 3);
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  }

  // 生成并输出测试报告
  const report = tester.generateReport();
  console.log('\n📊 测试报告');
  console.log('='.repeat(50));
  console.log(JSON.stringify(report, null, 2));

  return report;
}

/**
 * 快速压力测试
 */
async function quickStressTest() {
  const tester = new ChatStressTester();

  console.log('⚡ 快速压力测试');
  console.log('-'.repeat(30));

  // 快速并发测试
  await tester.concurrentUsersTest(3, 2);

  const report = tester.generateReport();
  console.log('\n📊 快速测试报告');
  console.log(JSON.stringify(report.summary, null, 2));

  return report;
}

/**
 * WebSocket压力测试（预留）
 */
class WebSocketStressTester {
  constructor(baseUrl = 'ws://localhost:3000') {
    this.baseUrl = baseUrl;
    this.connections = [];
    this.results = {
      totalConnections: 0,
      successfulConnections: 0,
      failedConnections: 0,
      totalMessages: 0,
      successfulMessages: 0,
      failedMessages: 0,
    };
  }

  // WebSocket测试方法将在后续实现
  async testWebSocketConnections(connectionCount = 10) {
    console.log(`🔌 WebSocket压力测试功能预留 (${connectionCount}个连接)`);
    // TODO: 实现WebSocket压力测试
    return {
      message: 'WebSocket压力测试功能待实现',
      plannedConnections: connectionCount,
    };
  }
}

// 导出测试类和函数
module.exports = {
  ChatStressTester,
  WebSocketStressTester,
  runFullStressTest,
  quickStressTest,
};

// 如果直接运行此文件，执行快速测试
if (require.main === module) {
  quickStressTest()
    .then(() => {
      console.log('✅ 测试完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 测试失败:', error);
      process.exit(1);
    });
}
