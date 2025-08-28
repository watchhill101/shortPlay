// models/User/indexApi.js - 用户认证相关API
const User = require('./index');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const RedisHelper = require('../../utils/redisHelper');

const SMS_CODE_EXPIRATION = 300; // 验证码过期时间（秒），例如 5 分钟

// 辅助函数：生成 JWT
const generateToken = userId => {
  const payload = { user: { id: userId } };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * @desc    用户名密码注册
 * @route   POST /api/auth/register
 */
const register = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      const err = new Error('Username and password are required');
      err.status = 400;
      return next(err);
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      const err = new Error('User already exists');
      err.status = 400;
      return next(err);
    }

    const _user = await User.create({ username, password });

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    next(error); // 将错误传递给全局错误处理器
  }
};

/**
 * @desc    用户名密码登录
 * @route   POST /api/auth/login
 */
const login = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      return next(err);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      return next(err);
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    发送手机短信验证码
 * @route   POST /api/auth/send-sms
 */
const sendSmsCode = async (req, res, next) => {
  const { phone } = req.body;
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Invalid phone number' });
  }

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 生成 6 位随机码
    const redisKey = `sms_code:${phone}`;

    // TODO: 在这里集成第三方短信服务 API 来发送短信
    // 例如： await sendSmsApi(phone, code);
    console.log(`Sending SMS to ${phone} with code: ${code}`); // 用于开发环境模拟

    // 将验证码存入 Redis 并设置过期时间
    const success = await RedisHelper.set(redisKey, code, SMS_CODE_EXPIRATION);

    if (!success) {
      console.warn('⚠️  Failed to store SMS code in Redis, but continuing...');
      // 在Redis不可用时，我们仍然可以继续，但应该通知开发者
    }

    res.status(200).json({ success: true, message: 'SMS code sent successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    使用手机号和验证码登录或注册
 * @route   POST /api/auth/login-phone
 */
const loginWithPhone = async (req, res, next) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ success: false, message: 'Phone and code are required' });
  }

  try {
    const redisKey = `sms_code:${phone}`;
    const storedCode = await RedisHelper.get(redisKey);

    if (!storedCode) {
      return res.status(400).json({
        success: false,
        message: 'Code has expired, is invalid, or Redis is unavailable',
      });
    }

    if (storedCode !== code) {
      return res.status(400).json({ success: false, message: 'Invalid code' });
    }

    // 验证成功，立即删除 code
    await RedisHelper.del(redisKey);

    let user = await User.findOne({ mobilePhoneNumber: phone });

    // 如果用户不存在，则创建新用户
    if (!user) {
      user = await User.create({ mobilePhoneNumber: phone });
    } else {
      // 如果用户已存在，更新最后登录时间
      user.lastLoginAt = Date.now();
      await user.save();
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        nickname: user.nickname,
        avatar: user.avatar,
        mobilePhoneNumber: user.mobilePhoneNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    使用抖音授权码登录或注册
 * @route   POST /api/auth/login-douyin
 */
const loginWithDouyin = async (req, res, next) => {
  const { authCode } = req.body; // 前端通过抖音SDK获取的临时授权码
  if (!authCode) {
    return res.status(400).json({ success: false, message: 'Douyin auth code is required' });
  }

  try {
    // --- 步骤 1: 服务器用 authCode 换取 access_token 和 open_id ---
    // TODO: 向抖音服务器发送请求，需要你的 client_key 和 client_secret
    // const douyinResponse = await axios.post(
    //   'https://open.douyin.com/oauth/access_token/',
    //   { client_key, client_secret, code: authCode, grant_type: 'authorization_code' }
    // );
    // const { open_id, access_token, union_id } = douyinResponse.data.data;

    // --- 步骤 2: (可选) 用 access_token 获取更详细的用户信息 ---
    // const userInfoResponse = await axios.get('https://open.douyin.com/oauth/userinfo/', { params: { access_token, open_id } });
    // const douyinUserInfo = userInfoResponse.data.data;

    // --- 开发模拟数据 ---
    // 在真实开发中，请替换为上面的真实 API 调用
    const douyinUserInfo = {
      open_id: `mock_open_id_${authCode}`,
      union_id: `mock_union_id_${authCode}`,
      nickname: '模拟抖音用户',
      avatar: 'https://p3-pc.douyinpic.com/img/aweme-avatar/tos-cn-avt-0015_123456.jpeg~200x200.jpeg',
      gender: 1,
    };
    // --- 模拟数据结束 ---

    let user = await User.findOne({
      'douyinProfile.openId': douyinUserInfo.open_id,
    });

    // 如果用户不存在，则创建新用户
    if (!user) {
      user = await User.create({
        douyinProfile: {
          openId: douyinUserInfo.open_id,
          unionId: douyinUserInfo.union_id,
          nickname: douyinUserInfo.nickname,
          avatar: douyinUserInfo.avatar,
          gender: douyinUserInfo.gender,
        },
        // Mongoose pre-save 钩子会自动处理 nickname 和 avatar
      });
    } else {
      // 如果用户已存在，更新其抖音信息和最后登录时间
      user.douyinProfile.nickname = douyinUserInfo.nickname;
      user.douyinProfile.avatar = douyinUserInfo.avatar;
      user.nickname = douyinUserInfo.nickname; // 同步更新主昵称
      user.avatar = douyinUserInfo.avatar; // 同步更新主头像
      user.lastLoginAt = Date.now();
      await user.save();
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        nickname: user.nickname,
        avatar: user.avatar,
        douyinProfile: user.douyinProfile,
      },
    });
  } catch (error) {
    // 需要处理抖音API可能返回的错误
    next(error);
  }
};

// 导出所有认证相关函数
module.exports = {
  register,
  login,
  sendSmsCode,
  loginWithPhone,
  loginWithDouyin,
  generateToken, // 导出工具函数，方便其他模块使用
};
