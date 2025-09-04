// middleware/rateLimiter.js
const RedisHelper = require('../utils/redisHelper');

/**
 * 速率限制中间件
 */
class RateLimiter {
  constructor() {
    this.RATE_LIMIT_PREFIX = 'rate_limit:';
    this.DEFAULT_WINDOW = 60; // 60秒窗口
    this.DEFAULT_MAX_REQUESTS = 100; // 每分钟最多100个请求
  }

  /**
   * 创建速率限制中间件
   * @param {Object} options 配置选项
   */
  createMiddleware(options = {}) {
    const {
      windowMs = this.DEFAULT_WINDOW * 1000,
      max = this.DEFAULT_MAX_REQUESTS,
      keyGenerator = (req) => req.ip,
      skipSuccessfulRequests = false,
      skipFailedRequests = false
    } = options;

    return async (req, res, next) => {
      try {
        const key = this.RATE_LIMIT_PREFIX + keyGenerator(req);
        const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
        const windowKey = `${key}:${windowStart}`;

        // 获取当前窗口的请求数
        let requestCount = await RedisHelper.get(windowKey);
        requestCount = requestCount ? parseInt(requestCount) : 0;

        if (requestCount >= max) {
          return res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: `请求过于频繁，请${windowMs/1000}秒后再试`,
            retryAfter: Math.ceil((windowStart + windowMs - Date.now()) / 1000)
          });
        }

        // 增加请求计数
        await RedisHelper.incr(windowKey);
        await RedisHelper.expire(windowKey, Math.ceil(windowMs / 1000));

        // 添加响应头
        res.set({
          'X-RateLimit-Limit': max,
          'X-RateLimit-Remaining': Math.max(0, max - requestCount - 1),
          'X-RateLimit-Reset': Math.ceil((windowStart + windowMs) / 1000)
        });

        next();
      } catch (error) {
        console.error('速率限制检查失败:', error);
        // 降级处理：如果Redis不可用，允许请求通过
        next();
      }
    };
  }

  /**
   * AI聊天专用速率限制
   */
  createAIChatLimiter() {
    return this.createMiddleware({
      windowMs: 60 * 1000, // 1分钟
      max: 30, // 每分钟最多30条AI消息
      keyGenerator: (req) => {
        // 基于用户ID和IP的复合键
        const userId = req.body.userId || 'anonymous';
        return `ai_chat:${userId}:${req.ip}`;
      }
    });
  }

  /**
   * 会话创建速率限制
   */
  createSessionLimiter() {
    return this.createMiddleware({
      windowMs: 60 * 1000, // 1分钟
      max: 10, // 每分钟最多创建10个会话
      keyGenerator: (req) => {
        const userId = req.body.userId || 'anonymous';
        return `session_create:${userId}:${req.ip}`;
      }
    });
  }
}

/**
 * 服务降级中间件
 */
class ServiceDegradation {
  constructor() {
    this.HEALTH_CHECK_KEY = 'service_health';
    this.ERROR_RATE_KEY = 'error_rate';
    this.RESPONSE_TIME_KEY = 'response_time';
    this.degradationEnabled = false;
    this.thresholds = {
      errorRate: 0.1, // 10%错误率
      responseTime: 10000, // 10秒响应时间
      consecutiveErrors: 5 // 连续5次错误
    };
  }

  /**
   * 健康检查中间件
   */
  healthCheckMiddleware() {
    return async (req, res, next) => {
      try {
        // 记录请求开始时间
        req.startTime = Date.now();
        
        // 继续处理请求
        next();
        
        // 在响应结束后记录指标
        res.on('finish', async () => {
          const responseTime = Date.now() - req.startTime;
          const isError = res.statusCode >= 400;
          
          await this.updateHealthMetrics(responseTime, isError);
          await this.checkDegradationTriggers();
        });
        
      } catch (error) {
        console.error('健康检查中间件错误:', error);
        next();
      }
    };
  }

  /**
   * 更新健康指标
   */
  async updateHealthMetrics(responseTime, isError) {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / 60000) * 60000; // 1分钟窗口
      
      // 更新响应时间
      const responseTimeKey = `${this.RESPONSE_TIME_KEY}:${windowStart}`;
      const responseTimes = await RedisHelper.get(responseTimeKey, true) || [];
      responseTimes.push(responseTime);
      
      // 只保留最近100个响应时间
      if (responseTimes.length > 100) {
        responseTimes.splice(0, responseTimes.length - 100);
      }
      
      await RedisHelper.set(responseTimeKey, responseTimes, 120); // 2分钟过期
      
      // 更新错误率
      if (isError) {
        const errorKey = `${this.ERROR_RATE_KEY}:${windowStart}`;
        await RedisHelper.incr(errorKey);
        await RedisHelper.expire(errorKey, 120);
      }
      
      const totalKey = `total_requests:${windowStart}`;
      await RedisHelper.incr(totalKey);
      await RedisHelper.expire(totalKey, 120);
      
    } catch (error) {
      console.error('更新健康指标失败:', error);
    }
  }

  /**
   * 检查降级触发条件
   */
  async checkDegradationTriggers() {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / 60000) * 60000;
      
      // 检查错误率
      const errorCount = await RedisHelper.get(`${this.ERROR_RATE_KEY}:${windowStart}`) || 0;
      const totalCount = await RedisHelper.get(`total_requests:${windowStart}`) || 0;
      
      if (totalCount > 10) { // 至少有10个请求才计算错误率
        const errorRate = errorCount / totalCount;
        
        if (errorRate > this.thresholds.errorRate) {
          await this.enableDegradation('高错误率', { errorRate, errorCount, totalCount });
          return;
        }
      }
      
      // 检查响应时间
      const responseTimes = await RedisHelper.get(`${this.RESPONSE_TIME_KEY}:${windowStart}`, true) || [];
      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        
        if (avgResponseTime > this.thresholds.responseTime) {
          await this.enableDegradation('响应时间过长', { avgResponseTime });
          return;
        }
      }
      
      // 如果指标正常，禁用降级
      if (this.degradationEnabled) {
        await this.disableDegradation();
      }
      
    } catch (error) {
      console.error('检查降级触发条件失败:', error);
    }
  }

  /**
   * 启用服务降级
   */
  async enableDegradation(reason, metrics = {}) {
    if (!this.degradationEnabled) {
      this.degradationEnabled = true;
      await RedisHelper.set(this.HEALTH_CHECK_KEY, {
        degraded: true,
        reason,
        metrics,
        timestamp: new Date().toISOString()
      }, 300); // 5分钟过期
      
      console.warn(`⚠️  服务降级已启用: ${reason}`, metrics);
    }
  }

  /**
   * 禁用服务降级
   */
  async disableDegradation() {
    if (this.degradationEnabled) {
      this.degradationEnabled = false;
      await RedisHelper.del(this.HEALTH_CHECK_KEY);
      console.log('✅ 服务降级已禁用，系统恢复正常');
    }
  }

  /**
   * 降级处理中间件
   */
  degradationMiddleware() {
    return async (req, res, next) => {
      try {
        // 检查是否需要降级
        const healthStatus = await RedisHelper.get(this.HEALTH_CHECK_KEY, true);
        
        if (healthStatus && healthStatus.degraded) {
          // 对AI聊天请求进行降级处理
          if (req.path.includes('/ai/chat')) {
            return res.json({
              success: true,
              content: '系统当前负载较高，为保证服务质量，暂时使用简化回复。请稍后再试或联系人工客服。',
              degraded: true,
              reason: healthStatus.reason
            });
          }
        }
        
        next();
      } catch (error) {
        console.error('降级处理中间件错误:', error);
        next();
      }
    };
  }

  /**
   * 获取服务健康状态
   */
  async getHealthStatus() {
    try {
      const healthStatus = await RedisHelper.get(this.HEALTH_CHECK_KEY, true);
      return healthStatus || { degraded: false };
    } catch (error) {
      return { degraded: false, error: error.message };
    }
  }
}

/**
 * 缓存中间件
 */
class CacheMiddleware {
  constructor() {
    this.CACHE_PREFIX = 'cache:';
    this.DEFAULT_TTL = 300; // 5分钟默认缓存时间
  }

  /**
   * 创建响应缓存中间件
   */
  createResponseCache(options = {}) {
    const {
      ttl = this.DEFAULT_TTL,
      keyGenerator = (req) => `${req.method}:${req.path}:${JSON.stringify(req.query)}`,
      shouldCache = (req, res) => req.method === 'GET' && res.statusCode === 200
    } = options;

    return async (req, res, next) => {
      try {
        const cacheKey = this.CACHE_PREFIX + keyGenerator(req);
        
        // 尝试从缓存获取
        const cachedResponse = await RedisHelper.get(cacheKey, true);
        if (cachedResponse) {
          res.set(cachedResponse.headers || {});
          return res.status(cachedResponse.statusCode || 200).json(cachedResponse.data);
        }

        // 拦截响应
        const originalSend = res.send;
        const originalJson = res.json;
        
        res.json = function(data) {
          // 检查是否应该缓存
          if (shouldCache(req, res)) {
            const responseData = {
              statusCode: res.statusCode,
              headers: res.getHeaders(),
              data: data
            };
            
            // 异步缓存，不阻塞响应
            RedisHelper.set(cacheKey, responseData, ttl).catch(error => {
              console.error('缓存响应失败:', error);
            });
          }
          
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        console.error('缓存中间件错误:', error);
        next();
      }
    };
  }

  /**
   * 会话消息缓存
   */
  createSessionMessageCache() {
    return this.createResponseCache({
      ttl: 60, // 1分钟缓存
      keyGenerator: (req) => `session_messages:${req.params.sessionId}:${req.query.page || 1}`,
      shouldCache: (req, res) => req.path.includes('/session/') && req.path.includes('/messages')
    });
  }

  /**
   * 清除缓存
   */
  async clearCache(pattern = '*') {
    try {
      const { getRedisClient } = require('../config/redis');
      const client = await getRedisClient();
      
      if (client) {
        const keys = await client.keys(this.CACHE_PREFIX + pattern);
        if (keys.length > 0) {
          await client.del(keys);
          console.log(`清除了 ${keys.length} 个缓存键`);
        }
      }
    } catch (error) {
      console.error('清除缓存失败:', error);
    }
  }
}

/**
 * 请求队列管理
 */
class RequestQueue {
  constructor() {
    this.QUEUE_PREFIX = 'request_queue:';
    this.MAX_QUEUE_SIZE = 1000;
    this.PROCESSING_TIMEOUT = 30000; // 30秒处理超时
  }

  /**
   * 队列中间件
   */
  createQueueMiddleware(queueName = 'default') {
    return async (req, res, next) => {
      try {
        const queueKey = this.QUEUE_PREFIX + queueName;
        const queueSize = await RedisHelper.llen(queueKey);
        
        if (queueSize >= this.MAX_QUEUE_SIZE) {
          return res.status(503).json({
            success: false,
            error: 'Service Unavailable',
            message: '服务器当前负载过高，请稍后再试',
            queueSize
          });
        }

        // 将请求加入队列
        const requestId = Date.now().toString();
        await RedisHelper.lpush(queueKey, requestId);
        
        // 设置请求ID
        req.requestId = requestId;
        
        next();
        
        // 请求处理完成后从队列移除
        res.on('finish', async () => {
          try {
            await RedisHelper.rpop(queueKey);
          } catch (error) {
            console.error('从队列移除请求失败:', error);
          }
        });
        
      } catch (error) {
        console.error('队列中间件错误:', error);
        next();
      }
    };
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus(queueName = 'default') {
    try {
      const queueKey = this.QUEUE_PREFIX + queueName;
      const queueSize = await RedisHelper.llen(queueKey);
      
      return {
        queueName,
        currentSize: queueSize,
        maxSize: this.MAX_QUEUE_SIZE,
        utilizationRate: (queueSize / this.MAX_QUEUE_SIZE * 100).toFixed(2) + '%'
      };
    } catch (error) {
      return {
        queueName,
        error: error.message
      };
    }
  }
}

/**
 * 断路器模式
 */
class CircuitBreaker {
  constructor() {
    this.CIRCUIT_PREFIX = 'circuit:';
    this.states = {
      CLOSED: 'closed',     // 正常状态
      OPEN: 'open',         // 断路状态
      HALF_OPEN: 'half_open' // 半开状态
    };
    this.defaultConfig = {
      failureThreshold: 5,    // 失败阈值
      recoveryTimeout: 60000, // 恢复超时时间
      monitoringPeriod: 60000 // 监控周期
    };
  }

  /**
   * 创建断路器中间件
   */
  createMiddleware(serviceName, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    return async (req, res, next) => {
      try {
        const circuitKey = this.CIRCUIT_PREFIX + serviceName;
        const circuit = await RedisHelper.get(circuitKey, true) || {
          state: this.states.CLOSED,
          failureCount: 0,
          lastFailureTime: null
        };

        // 检查断路器状态
        if (circuit.state === this.states.OPEN) {
          const now = Date.now();
          const timeSinceFailure = now - (circuit.lastFailureTime || 0);
          
          if (timeSinceFailure < finalConfig.recoveryTimeout) {
            // 断路器仍然打开
            return res.status(503).json({
              success: false,
              error: 'Service Circuit Open',
              message: '服务暂时不可用，请稍后再试',
              retryAfter: Math.ceil((finalConfig.recoveryTimeout - timeSinceFailure) / 1000)
            });
          } else {
            // 转为半开状态
            circuit.state = this.states.HALF_OPEN;
            await RedisHelper.set(circuitKey, circuit, 300);
          }
        }

        // 记录请求结果
        res.on('finish', async () => {
          const isSuccess = res.statusCode < 400;
          
          if (isSuccess) {
            // 成功请求：重置失败计数
            if (circuit.state === this.states.HALF_OPEN) {
              circuit.state = this.states.CLOSED;
            }
            circuit.failureCount = 0;
          } else {
            // 失败请求：增加失败计数
            circuit.failureCount++;
            circuit.lastFailureTime = Date.now();
            
            if (circuit.failureCount >= finalConfig.failureThreshold) {
              circuit.state = this.states.OPEN;
              console.warn(`⚠️  断路器打开: ${serviceName}，失败次数: ${circuit.failureCount}`);
            }
          }
          
          await RedisHelper.set(circuitKey, circuit, 300);
        });

        next();
      } catch (error) {
        console.error('断路器中间件错误:', error);
        next();
      }
    };
  }

  /**
   * 获取断路器状态
   */
  async getCircuitStatus(serviceName) {
    try {
      const circuitKey = this.CIRCUIT_PREFIX + serviceName;
      return await RedisHelper.get(circuitKey, true) || {
        state: this.states.CLOSED,
        failureCount: 0,
        lastFailureTime: null
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}

module.exports = {
  RateLimiter,
  ServiceDegradation,
  CacheMiddleware,
  RequestQueue,
  CircuitBreaker
}; 