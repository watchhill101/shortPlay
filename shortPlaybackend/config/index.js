// config/index.js
const path = require('path');

// 确定要加载的 .env 文件的路径
const envPath = path.resolve(__dirname, `../.env.${process.env.NODE_ENV || 'development'}`);

// 加载并解析 .env 文件
require('dotenv-expand').expand(require('dotenv').config({ path: envPath }));

const config = {
  env: process.env.NODE_ENV,
  port: process.env.PORT || 3000,
  
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  
  session: {
    secret: process.env.SESSION_SECRET,
  },
  
  redis: {
    url: process.env.REDIS_URL,
  },
  
  cors: {
    // 将 .env 中的字符串白名单转换为数组
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  },
};

module.exports = config;