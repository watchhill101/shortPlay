const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis').default;

const config = require('./config');
const { getRedisClient, isRedisAvailable } = require('./config/redis');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// --- 核心中间件 ---

// 1. 安全：设置各种 HTTP 头
app.use(helmet());

// 2. CORS：配置跨域资源共享
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

// 3. 日志：根据环境选择不同日志格式
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

// 4. 请求解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
