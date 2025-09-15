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
  appId: process.env.ALIPAY_APP_ID,
  gateway: process.env.ALIPAY_GATEWAY,
  notifyUrl: process.env.ALIPAY_NOTIFY_URL,
  signType: process.env.ALIPAY_SIGN_TYPE,
  charset: process.env.ALIPAY_CHARSET,
  merchantPrivateKey: process.env.ALIPAY_MERCHANT_PRIVATE_KEY,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
};

const requiredConfigs = ['appId', 'merchantPrivateKey', 'alipayPublicKey'];
requiredConfigs.forEach(key => {
  if (!config[key]) {
    throw new Error(`缺少必要的支付宝配置: ${key}`);
  }
});

// 处理私钥格式（如果是从多行环境变量读取）
config.merchantPrivateKey = config.merchantPrivateKey.replace(/\\n/g, '\n');
config.alipayPublicKey = config.alipayPublicKey.replace(/\\n/g, '\n');

module.exports = config;
