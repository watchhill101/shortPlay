const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const path = require('path');
const config = require('./config');
const { getRedisClient, isRedisAvailable } = require('./config/redis');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

// 导入新的中间件
const {
  RateLimiter,
  ServiceDegradation,
  CacheMiddleware,
  RequestQueue,
  CircuitBreaker,
} = require('./middleware/rateLimiter');
const { createMonitoringMiddleware } = require('./tests/monitor');

const app = express();

// 创建中间件实例
const rateLimiter = new RateLimiter();
const serviceDegradation = new ServiceDegradation();
const cacheMiddleware = new CacheMiddleware();
const requestQueue = new RequestQueue();
const circuitBreaker = new CircuitBreaker();
const { middleware: monitoringMiddleware, getStats, reset: resetStats } = createMonitoringMiddleware();

// --- 核心中间件 ---

// 1. 安全：设置各种 HTTP 头
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// 2. 性能监控中间件（放在最前面）
app.use(monitoringMiddleware);

// 3. 服务降级检查
app.use(serviceDegradation.healthCheckMiddleware());
app.use(serviceDegradation.degradationMiddleware());

// 4. 断路器保护（针对AI服务）
app.use(
  '/api/ai',
  circuitBreaker.createMiddleware('ai_service', {
    failureThreshold: 3,
    recoveryTimeout: 30000,
  })
);

// 5. 请求队列管理
app.use('/api/ai/chat', requestQueue.createQueueMiddleware('ai_chat'));

// 6. 速率限制
app.use('/api/ai/chat-with-context', rateLimiter.createAIChatLimiter());
app.use('/api/ai/session/create', rateLimiter.createSessionLimiter());

// 7. 响应缓存
app.use('/api/ai/session/:sessionId/messages', cacheMiddleware.createSessionMessageCache());

// 8. CORS：配置跨域资源共享
// 开发环境下添加日志，查看实际的请求来源和配置
const corsOptions = {
  origin: (origin, callback) => {
    // 开发环境下打印日志，帮助调试
    if (config.env === 'development') {
      console.log('CORS 请求来源:', origin);
      console.log('CORS 配置:', config.cors.origin);
    }

    // 开发环境下简化CORS配置，允许所有来源
    if (config.env === 'development') {
      callback(null, true);
    }
    // 生产环境下严格检查
    else if (config.cors.origin === '*') {
      callback(null, true);
    }
    // 如果请求没有来源（如curl请求）或来源在白名单中，允许访问
    else if (!origin || (Array.isArray(config.cors.origin) && config.cors.origin.includes(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // 允许携带 cookie
};
app.use(cors(corsOptions));

// 启用 CORS (移除了无路径前缀的静态服务，避免拦截其他路由)

// 9. 日志：根据环境选择不同日志格式
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

// 10. 请求解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// 🔴 已修复：移除错误的 /upload 路径配置（目录不存在）
// app.use('/upload', express.static(path.join(__dirname, 'upload'))); // 已注释：目录不存在

// 为视频文件添加特殊的CORS处理
app.use(
  '/uploads/video',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    res.header('Access-Control-Allow-Credentials', 'false'); // 改为false，避免CORS问题
    next();
  },
  express.static(path.join(__dirname, 'uploads/video'))
);

// Serve static files from the 'uploads' directory with CORS headers
app.use(
  '/uploads',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', 'false'); // 改为false，避免CORS问题
    next();
  },
  express.static(path.join(__dirname, 'uploads'))
);
// 5. Session 管理 (使用 Redis 存储)
const setupSession = async () => {
  try {
    if (config.redis.url && (await isRedisAvailable())) {
      const redisClient = await getRedisClient();
      if (redisClient) {
        const redisStore = new RedisStore({ client: redisClient });

        app.use(
          session({
            store: redisStore,
            secret: config.session.secret,
            resave: false,
            saveUninitialized: false,
            cookie: {
              httpOnly: true,
              secure: config.env === 'production', // 生产环境需要 HTTPS
              maxAge: 24 * 60 * 60 * 1000, // 1 day
            },
          })
        );

        console.log('✅ Session store configured with Redis');
        return;
      }
    }

    // Redis不可用时的降级处理 - 使用内存存储
    console.warn('⚠️  Redis not available, using memory session store (not recommended for production)');
    app.use(
      session({
        secret: config.session.secret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: config.env === 'production',
          maxAge: 24 * 60 * 60 * 1000,
        },
      })
    );
  } catch (error) {
    console.error('❌ Session setup failed:', error.message);
    // 继续使用内存存储作为最后的降级选项
    app.use(
      session({
        secret: config.session.secret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: config.env === 'production',
          maxAge: 24 * 60 * 60 * 1000,
        },
      })
    );
  }
};

// 异步设置Session
setupSession();

// --- 路由 ---
app.get('/', (req, res) => res.send('API is running...')); // 健康检查路由

// 系统状态监控端点
app.get('/api/system/status', async (req, res) => {
  try {
    const performanceStats = getStats();
    const queueStatus = await requestQueue.getQueueStatus('ai_chat');
    const circuitStatus = await circuitBreaker.getCircuitStatus('ai_service');
    const healthStatus = await serviceDegradation.getHealthStatus();

    res.json({
      success: true,
      status: 'running',
      timestamp: new Date().toISOString(),
      performance: performanceStats,
      queue: queueStatus,
      circuit: circuitStatus,
      health: healthStatus,
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取系统状态失败',
      message: error.message,
    });
  }
});

// 性能统计重置端点
app.post('/api/system/reset-stats', (req, res) => {
  try {
    resetStats();
    res.json({
      success: true,
      message: '性能统计已重置',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '重置统计失败',
      message: error.message,
    });
  }
});

// 缓存管理端点
app.delete('/api/system/cache', async (req, res) => {
  try {
    const { pattern = '*' } = req.query;
    await cacheMiddleware.clearCache(pattern);
    res.json({
      success: true,
      message: `缓存清除成功，模式: ${pattern}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '清除缓存失败',
      message: error.message,
    });
  }
});

// 🔴 已修复：移除重复的静态文件配置
// 调试日志和静态服务已在上面 126-136 行正确配置
// 重复配置已注释以避免冲突
/*
app.use('/uploads', (req, res, next) => {
  console.log('静态文件请求:', req.url);
  console.log('文件路径:', path.join(__dirname, 'uploads', req.url));
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
*/

// 测试页面
app.get('/test-video', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-video.html'));
});

// 视频代理路由 - 解决跨域问题
app.get('/video-proxy/:filename', (req, res) => {
  const filename = req.params.filename;
  const videoPath = path.join(__dirname, 'uploads', 'video', filename);

  // 设置视频相关的响应头
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=0');

  // 处理Range请求（视频流式播放需要）
  const range = req.headers.range;
  if (range) {
    const stat = require('fs').statSync(videoPath);
    const fileSize = stat.size;
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunksize);

    const stream = require('fs').createReadStream(videoPath, { start, end });
    stream.pipe(res);
  } else {
    res.sendFile(videoPath);
  }
});

app.use('/api', apiRoutes); // 所有 API 路由都以 /api 开头

// 捕获 404
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});
// 全局错误处理器
app.use(errorHandler);

module.exports = app;
