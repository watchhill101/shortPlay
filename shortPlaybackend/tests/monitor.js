// tests/monitor.js
const os = require('os');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

/**
 * 系统性能监控工具
 */
class SystemMonitor {
  constructor(outputDir = './monitoring-logs') {
    this.outputDir = outputDir;
    this.monitoring = false;
    this.intervalId = null;
    this.logFile = null;
    this.startTime = null;
    
    // 确保输出目录存在
    this.ensureOutputDir();
  }

  /**
   * 确保输出目录存在
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 开始监控
   * @param {number} interval 监控间隔（毫秒）
   */
  startMonitoring(interval = 5000) {
    if (this.monitoring) {
      console.log('监控已在运行中');
      return;
    }

    this.monitoring = true;
    this.startTime = Date.now();
    
    // 创建日志文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFileName = `system-monitor-${timestamp}.log`;
    this.logFile = path.join(this.outputDir, logFileName);
    
    // 写入日志头
    const header = [
      '# AI聊天系统性能监控日志',
      `# 开始时间: ${new Date().toISOString()}`,
      `# 监控间隔: ${interval}ms`,
      '# 格式: timestamp,cpu_usage,memory_used_mb,memory_free_mb,load_avg_1m,active_handles,active_requests',
      ''
    ].join('\n');
    
    fs.writeFileSync(this.logFile, header);
    
    console.log(`🔍 开始系统监控，间隔: ${interval}ms`);
    console.log(`📝 日志文件: ${this.logFile}`);
    
    // 立即记录一次
    this.recordMetrics();
    
    // 设置定时监控
    this.intervalId = setInterval(() => {
      this.recordMetrics();
    }, interval);
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (!this.monitoring) {
      console.log('监控未在运行');
      return;
    }

    this.monitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const duration = Date.now() - this.startTime;
    console.log(`✅ 监控已停止，总时长: ${(duration / 1000).toFixed(2)}s`);
    
    // 生成监控报告
    this.generateMonitoringReport();
  }

  /**
   * 记录系统指标
   */
  recordMetrics() {
    try {
      const timestamp = new Date().toISOString();
      const cpuUsage = this.getCPUUsage();
      const memoryInfo = this.getMemoryInfo();
      const loadAvg = os.loadavg()[0]; // 1分钟负载平均值
      const processInfo = this.getProcessInfo();
      
      // 格式化数据
      const logEntry = [
        timestamp,
        cpuUsage.toFixed(2),
        memoryInfo.used.toFixed(2),
        memoryInfo.free.toFixed(2),
        loadAvg.toFixed(2),
        processInfo.activeHandles,
        processInfo.activeRequests
      ].join(',');
      
      // 写入日志文件
      fs.appendFileSync(this.logFile, logEntry + '\n');
      
      // 控制台输出（可选）
      if (process.env.VERBOSE_MONITORING) {
        console.log(`📊 ${timestamp} - CPU: ${cpuUsage.toFixed(1)}%, 内存: ${memoryInfo.used.toFixed(1)}MB, 负载: ${loadAvg.toFixed(2)}`);
      }
      
    } catch (error) {
      console.error('记录系统指标失败:', error);
    }
  }

  /**
   * 获取CPU使用率
   */
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    
    return ((total - idle) / total) * 100;
  }

  /**
   * 获取内存信息
   */
  getMemoryInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      total: totalMem / 1024 / 1024, // MB
      used: usedMem / 1024 / 1024,   // MB
      free: freeMem / 1024 / 1024,   // MB
      usage: (usedMem / totalMem) * 100 // 百分比
    };
  }

  /**
   * 获取进程信息
   */
  getProcessInfo() {
    const memUsage = process.memoryUsage();
    
    return {
      pid: process.pid,
      uptime: process.uptime(),
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length,
      heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
      heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
      external: memUsage.external / 1024 / 1024 // MB
    };
  }

  /**
   * 生成监控报告
   */
  generateMonitoringReport() {
    try {
      if (!this.logFile || !fs.existsSync(this.logFile)) {
        console.log('没有找到监控日志文件');
        return;
      }

      const logContent = fs.readFileSync(this.logFile, 'utf8');
      const lines = logContent.split('\n').filter(line => line && !line.startsWith('#'));
      
      if (lines.length === 0) {
        console.log('监控日志为空');
        return;
      }

      const metrics = lines.map(line => {
        const parts = line.split(',');
        return {
          timestamp: parts[0],
          cpuUsage: parseFloat(parts[1]),
          memoryUsed: parseFloat(parts[2]),
          memoryFree: parseFloat(parts[3]),
          loadAvg: parseFloat(parts[4]),
          activeHandles: parseInt(parts[5]),
          activeRequests: parseInt(parts[6])
        };
      });

      const report = this.analyzeMetrics(metrics);
      
      // 保存报告
      const reportFile = this.logFile.replace('.log', '-report.json');
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      console.log('\n📊 监控报告');
      console.log('=' .repeat(50));
      console.log(`监控时长: ${report.summary.duration}s`);
      console.log(`平均CPU使用率: ${report.summary.avgCpuUsage.toFixed(2)}%`);
      console.log(`最大CPU使用率: ${report.summary.maxCpuUsage.toFixed(2)}%`);
      console.log(`平均内存使用: ${report.summary.avgMemoryUsed.toFixed(2)}MB`);
      console.log(`最大内存使用: ${report.summary.maxMemoryUsed.toFixed(2)}MB`);
      console.log(`平均负载: ${report.summary.avgLoadAvg.toFixed(2)}`);
      console.log(`最大活跃句柄: ${report.summary.maxActiveHandles}`);
      console.log(`📄 详细报告: ${reportFile}`);
      
      return report;
    } catch (error) {
      console.error('生成监控报告失败:', error);
      return null;
    }
  }

  /**
   * 分析监控指标
   */
  analyzeMetrics(metrics) {
    if (metrics.length === 0) {
      return { summary: {}, alerts: [], recommendations: [] };
    }

    const firstMetric = metrics[0];
    const lastMetric = metrics[metrics.length - 1];
    const duration = (new Date(lastMetric.timestamp) - new Date(firstMetric.timestamp)) / 1000;

    const cpuUsages = metrics.map(m => m.cpuUsage).filter(cpu => !isNaN(cpu));
    const memoryUsages = metrics.map(m => m.memoryUsed).filter(mem => !isNaN(mem));
    const loadAvgs = metrics.map(m => m.loadAvg).filter(load => !isNaN(load));
    const activeHandles = metrics.map(m => m.activeHandles).filter(h => !isNaN(h));

    const summary = {
      duration: duration.toFixed(2),
      totalSamples: metrics.length,
      avgCpuUsage: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length || 0,
      maxCpuUsage: Math.max(...cpuUsages) || 0,
      minCpuUsage: Math.min(...cpuUsages) || 0,
      avgMemoryUsed: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length || 0,
      maxMemoryUsed: Math.max(...memoryUsages) || 0,
      minMemoryUsed: Math.min(...memoryUsages) || 0,
      avgLoadAvg: loadAvgs.reduce((a, b) => a + b, 0) / loadAvgs.length || 0,
      maxLoadAvg: Math.max(...loadAvgs) || 0,
      maxActiveHandles: Math.max(...activeHandles) || 0
    };

    // 生成警告
    const alerts = [];
    if (summary.maxCpuUsage > 80) {
      alerts.push(`高CPU使用率警告: 最大${summary.maxCpuUsage.toFixed(2)}%`);
    }
    if (summary.maxMemoryUsed > 1000) {
      alerts.push(`高内存使用警告: 最大${summary.maxMemoryUsed.toFixed(2)}MB`);
    }
    if (summary.maxLoadAvg > 2) {
      alerts.push(`高系统负载警告: 最大${summary.maxLoadAvg.toFixed(2)}`);
    }

    // 生成建议
    const recommendations = [];
    if (summary.avgCpuUsage > 60) {
      recommendations.push('考虑优化CPU密集型操作或增加服务器CPU资源');
    }
    if (summary.avgMemoryUsed > 500) {
      recommendations.push('考虑优化内存使用或增加服务器内存');
    }
    if (summary.maxActiveHandles > 1000) {
      recommendations.push('检查是否存在资源泄漏，活跃句柄数过多');
    }

    return {
      summary,
      alerts,
      recommendations,
      rawMetrics: metrics
    };
  }
}

/**
 * Redis性能监控
 */
class RedisMonitor {
  constructor() {
    this.redisHelper = require('../utils/redisHelper');
  }

  /**
   * 获取Redis性能指标
   */
  async getRedisMetrics() {
    try {
      const { getRedisClient } = require('../config/redis');
      const client = await getRedisClient();
      
      if (!client) {
        return {
          connected: false,
          error: 'Redis客户端不可用'
        };
      }

      // 获取Redis信息
      const info = await client.info();
      const memory = await client.info('memory');
      const stats = await client.info('stats');
      
      return {
        connected: true,
        memory: this.parseRedisInfo(memory),
        stats: this.parseRedisInfo(stats),
        keyspace: await this.getKeyspaceInfo(client)
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * 解析Redis INFO命令输出
   */
  parseRedisInfo(infoStr) {
    const result = {};
    const lines = infoStr.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(value) ? value : parseFloat(value);
      }
    }
    
    return result;
  }

  /**
   * 获取Redis键空间信息
   */
  async getKeyspaceInfo(client) {
    try {
      // 获取会话相关的键数量
      const sessionKeys = await client.keys('chat:session:*');
      const userSessionKeys = await client.keys('chat:user_sessions:*');
      
      return {
        totalSessionKeys: sessionKeys.length,
        totalUserSessionKeys: userSessionKeys.length,
        totalChatKeys: sessionKeys.length + userSessionKeys.length
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}

/**
 * 应用性能监控
 */
class AppPerformanceMonitor {
  constructor() {
    this.metrics = {
      requestCounts: {},
      responseTimes: {},
      errorCounts: {},
      activeConnections: 0
    };
  }

  /**
   * 记录请求
   */
  recordRequest(endpoint, responseTime, success = true) {
    // 请求计数
    this.metrics.requestCounts[endpoint] = (this.metrics.requestCounts[endpoint] || 0) + 1;
    
    // 响应时间
    if (!this.metrics.responseTimes[endpoint]) {
      this.metrics.responseTimes[endpoint] = [];
    }
    this.metrics.responseTimes[endpoint].push(responseTime);
    
    // 错误计数
    if (!success) {
      this.metrics.errorCounts[endpoint] = (this.metrics.errorCounts[endpoint] || 0) + 1;
    }
  }

  /**
   * 获取性能统计
   */
  getStats() {
    const stats = {};
    
    for (const endpoint in this.metrics.requestCounts) {
      const responseTimes = this.metrics.responseTimes[endpoint] || [];
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;
      
      stats[endpoint] = {
        requestCount: this.metrics.requestCounts[endpoint],
        errorCount: this.metrics.errorCounts[endpoint] || 0,
        avgResponseTime: avgResponseTime.toFixed(2),
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes).toFixed(2) : 0,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes).toFixed(2) : 0,
        errorRate: ((this.metrics.errorCounts[endpoint] || 0) / this.metrics.requestCounts[endpoint] * 100).toFixed(2) + '%'
      };
    }
    
    return stats;
  }

  /**
   * 重置统计
   */
  reset() {
    this.metrics = {
      requestCounts: {},
      responseTimes: {},
      errorCounts: {},
      activeConnections: 0
    };
  }
}

/**
 * 监控中间件工厂
 */
function createMonitoringMiddleware() {
  const appMonitor = new AppPerformanceMonitor();
  
  return {
    // Express中间件
    middleware: (req, res, next) => {
      const startTime = performance.now();
      
      // 监听响应结束
      res.on('finish', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        const success = res.statusCode < 400;
        
        appMonitor.recordRequest(req.path, responseTime, success);
      });
      
      next();
    },
    
    // 获取统计信息
    getStats: () => appMonitor.getStats(),
    
    // 重置统计
    reset: () => appMonitor.reset()
  };
}

/**
 * 启动完整监控
 */
async function startFullMonitoring(duration = 300000) { // 默认5分钟
  const systemMonitor = new SystemMonitor();
  const redisMonitor = new RedisMonitor();
  
  console.log(`🔍 开始完整系统监控，时长: ${duration/1000}s`);
  
  // 开始系统监控
  systemMonitor.startMonitoring(2000); // 每2秒记录一次
  
  // 定期记录Redis指标
  const redisLogFile = path.join(systemMonitor.outputDir, `redis-metrics-${Date.now()}.json`);
  const redisMetrics = [];
  
  const redisInterval = setInterval(async () => {
    const metrics = await redisMonitor.getRedisMetrics();
    metrics.timestamp = new Date().toISOString();
    redisMetrics.push(metrics);
  }, 5000); // 每5秒记录Redis指标
  
  // 设置监控结束
  setTimeout(() => {
    systemMonitor.stopMonitoring();
    clearInterval(redisInterval);
    
    // 保存Redis指标
    fs.writeFileSync(redisLogFile, JSON.stringify(redisMetrics, null, 2));
    console.log(`📄 Redis监控日志: ${redisLogFile}`);
    
    console.log('✅ 完整监控结束');
  }, duration);
  
  return {
    systemMonitor,
    redisMonitor,
    stop: () => {
      systemMonitor.stopMonitoring();
      clearInterval(redisInterval);
    }
  };
}

module.exports = {
  SystemMonitor,
  RedisMonitor,
  AppPerformanceMonitor,
  createMonitoringMiddleware,
  startFullMonitoring
};

// 如果直接运行此文件，启动监控
if (require.main === module) {
  startFullMonitoring(60000).then(() => { // 1分钟监控
    console.log('监控启动完成');
  }).catch(error => {
    console.error('启动监控失败:', error);
  });
} 