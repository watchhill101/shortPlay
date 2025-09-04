// middleware/auth.js
const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  console.log('认证中间件 - Authorization header:', authHeader);
  console.log('认证中间件 - 提取的token:', token ? token.substring(0, 20) + '...' : 'null');

  if (!token) {
    console.log('认证失败: 没有token');
    const err = new Error("Not authorized, no token");
    err.status = 401;
    return next(err);
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    console.log('JWT解码成功:', { userId: decoded.user.id });

    // 将用户信息（不含密码）附加到请求对象上
    req.user = await User.findById(decoded.user.id).select("-password");

    if (!req.user) {
      console.log('认证失败: 用户不存在');
      const err = new Error("Not authorized, user not found");
      err.status = 401;
      return next(err);
    }
    
    console.log('认证成功:', { userId: req.user._id, nickname: req.user.nickname });
    next();
  } catch (error) {
    console.log('认证失败: JWT验证失败', error.message);
    const err = new Error("Not authorized, token failed");
    err.status = 401;
    next(err);
  }
};

module.exports = protect;
