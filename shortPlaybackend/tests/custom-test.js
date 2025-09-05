const { ChatStressTester } = require('./stress-test');

/**
 * 自定义压力测试配置
 */
async function customStressTest() {
  const tester = new ChatStressTester();

  console.log('🔥 自定义AI聊天压力测试');
  console.log('='.repeat(50));

  // 测试配置 - 您可以根据需要调整这些参数
  const testConfigs = {
    // 轻度测试
    light: {
      concurrentUsers: 5,
      messagesPerUser: 3,
      testDuration: 60000, // 1分钟
      description: '轻度压力测试 (5用户)',
    },

    // 中等测试
    medium: {
      concurrentUsers: 15,
      messagesPerUser: 5,
      testDuration: 180000, // 3分钟
      description: '中等压力测试 (15用户)',
    },

    // 重度测试
    heavy: {
      concurrentUsers: 30,
      messagesPerUser: 8,
      testDuration: 300000, // 5分钟
      description: '重度压力测试 (30用户)',
    },

    // 极限测试
    extreme: {
      concurrentUsers: 50,
      messagesPerUser: 10,
      testDuration: 600000, // 10分钟
      description: '极限压力测试 (50用户) - 请谨慎使用！',
    },
  };

  // 选择测试级别 - 修改这里来选择不同强度
  const testLevel = 'light'; // 可选: light, medium, heavy, extreme
  const config = testConfigs[testLevel];

  console.log(`\n🎯 执行: ${config.description}`);
  console.log(`👥 并发用户: ${config.concurrentUsers}`);
  console.log(`💬 每用户消息数: ${config.messagesPerUser}`);
  console.log(`⏱️  测试时长: ${config.testDuration / 1000}秒`);
  console.log('-'.repeat(50));

  try {
    // 1. 基础连通性测试
    console.log('\n📡 1. 基础连通性测试');
    const basicTest = await tester.singleUserTest('connectivity_test', 1);
    if (!basicTest.success) {
      throw new Error('基础连通性测试失败，请检查服务器状态');
    }
    console.log('✅ 基础连通性正常');

    // 2. 并发用户测试
    console.log(`\n⚡ 2. 并发用户测试 (${config.concurrentUsers}用户)`);
    const _concurrentResult = await tester.concurrentUsersTest(config.concurrentUsers, config.messagesPerUser);

    // 3. 负载递增测试
    console.log('\n📈 3. 负载递增测试');
    const _rampResult = await tester.loadRampTest(
      Math.floor(config.concurrentUsers / 4), // 起始用户数
      config.concurrentUsers, // 最大用户数
      Math.floor(config.concurrentUsers / 8) || 1, // 步长
      10000 // 每步间隔10秒
    );

    // 4. 错误处理测试
    console.log('\n🔧 4. 错误处理测试');
    const _errorTest = await tester.errorRecoveryTest();

    // 5. 持续稳定性测试
    if (config.testDuration > 60000) {
      console.log(`\n⏱️  5. 持续稳定性测试 (${config.testDuration / 1000}秒)`);
      await tester.enduranceTest(config.testDuration, Math.floor(config.concurrentUsers / 3));
    }
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }

  // 生成详细报告
  const report = tester.generateReport();
  console.log('\n📊 压力测试报告');
  console.log('='.repeat(50));
  console.log('📈 性能指标:');
  console.log(`   总请求数: ${report.summary.totalRequests}`);
  console.log(`   成功率: ${report.summary.successRate}`);
  console.log(`   平均响应时间: ${report.summary.averageResponseTime}`);
  console.log(`   95%响应时间: ${report.summary.p95ResponseTime}`);
  console.log(`   最大响应时间: ${report.summary.maxResponseTime}`);

  console.log('\n🎯 压力承受能力评估:');
  if (parseFloat(report.summary.successRate) >= 95) {
    console.log('✅ 优秀 - 系统在当前压力下表现稳定');
  } else if (parseFloat(report.summary.successRate) >= 85) {
    console.log('⚠️  良好 - 系统基本稳定，但有改进空间');
  } else if (parseFloat(report.summary.successRate) >= 70) {
    console.log('🔶 一般 - 系统在高压力下有不稳定表现');
  } else {
    console.log('❌ 较差 - 系统无法承受当前压力，需要优化');
  }

  console.log('\n💡 优化建议:');
  report.recommendations.forEach(rec => {
    console.log(`   • ${rec}`);
  });

  if (report.errors.length > 0) {
    console.log(`\n🚨 发现 ${report.errors.length} 个错误:`);
    report.errors.slice(0, 5).forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.message} (${error.responseTime.toFixed(2)}ms)`);
    });
    if (report.errors.length > 5) {
      console.log(`   ... 还有 ${report.errors.length - 5} 个错误`);
    }
  }

  // 保存详细报告到文件
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `test-results/custom-stress-test-${testLevel}-${timestamp}.json`;

  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results');
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 详细报告已保存到: ${reportPath}`);

  return report;
}

// 运行测试
if (require.main === module) {
  customStressTest()
    .then(() => {
      console.log('\n🎉 压力测试完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 测试失败:', error);
      process.exit(1);
    });
}

module.exports = { customStressTest };
