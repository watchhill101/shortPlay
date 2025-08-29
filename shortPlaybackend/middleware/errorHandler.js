// middleware/errorHandler.js
const config = require('../config');

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.status || 500;

  console.error(err.stack); // 在服务器端打印错误堆栈

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server Error',
    // 只在开发环境暴露堆栈信息
    stack: config.env === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
