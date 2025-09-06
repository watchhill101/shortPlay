// config/index.js - 应用配置
const config = {
  // API配置
  api: {
    // 开发环境
    development: {
      baseURL: 'http://192.168.0.223:3000/api',
      timeout: 10000,
    },
    // 测试环境
    test: {
      baseURL: 'http://test-api.shortplay.com',
      timeout: 10000,
    },
    // 生产环境
    production: {
      baseURL: 'https://api.shortplay.com',
      timeout: 10000,
    },
  },

  // 资源文件基础URL (用于拼接图片等)
  assetBaseURL: '',

  // 当前环境
  env: process.env.NODE_ENV || 'development',
  // 开发模式配置
  development: {
    // 如果后端服务未启动，是否使用模拟数据
    useMockData: true,
    // 是否跳过网络请求错误
    skipNetworkErrors: true,
  },

  // Token配置
  token: {
    // Access Token过期时间（秒）
    accessTokenExpiry: 15 * 60, // 15分钟
    // Refresh Token过期时间（秒）
    refreshTokenExpiry: 7 * 24 * 60 * 60, // 7天
    // Token刷新缓冲时间（秒）
    refreshBufferTime: 2 * 60, // 2分钟
    // 存储前缀
    storagePrefix: 'shortplay_',
  },

  // 短信验证码配置
  sms: {
    // 验证码长度
    codeLength: 6,
    // 验证码过期时间（秒）
    expiry: 5 * 60, // 5分钟
    // 重发间隔（秒）
    resendInterval: 60, // 60秒
  },

  // 抖音登录配置
  douyin: {
    // 开发环境使用模拟数据
    useMockData: true,
    // 抖音AppID（生产环境需要配置）
    appId: 'your_douyin_app_id',
    // 授权scope
    scope: 'user_info',
  },

  // 应用信息
  app: {
    name: '短剧播放',
    version: '1.0.0',
    description: '精彩短剧，随时观看',
  },
};

// 修正 assetBaseURL 的定义，避免在对象初始化时引用自身
const currentApiConfig = config.api[config.env] || config.api.development;
const match = currentApiConfig.baseURL.match(/^(https?:\/\/[^/]+)/);
config.assetBaseURL = match ? match[1] : '';

// 获取当前环境的API配置
export const getApiConfig = () => {
  return config.api[config.env] || config.api.development;
};

// 获取Token配置
export const getTokenConfig = () => {
  return config.token;
};

// 获取短信配置
export const getSmsConfig = () => {
  return config.sms;
};

// 获取抖音配置
export const getDouyinConfig = () => {
  return config.douyin;
};

// 获取应用信息
export const getAppInfo = () => {
  return config.app;
};

// 获取资源基础URL
export const getAssetBaseURL = () => {
  return config.assetBaseURL;
};

export default config;
