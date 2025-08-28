// socket/index.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');

// Socket.IO 认证中间件
const socketAuthMiddleware = (socket, next) => {
  // 从 handshake 的 auth 对象中获取 token
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: Token not provided'));
  }

  jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
    socket.user = decoded.user; // 将解码后的用户信息附加到 socket 对象
    next();
  });
};

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
    },
  });

  // 全局应用认证中间件
  io.use(socketAuthMiddleware);

  io.on('connection', socket => {
    console.log(`✅ Socket connected: ${socket.id}, UserID: ${socket.user.id}`);

    // 加入以用户ID命名的房间，方便私聊或定向推送
    socket.join(socket.user.id);

    socket.on('sendMessage', data => {
      // 示例：向另一个用户发送消息
      // data = { to: 'otherUserId', message: 'Hello!' }
      io.to(data.to).emit('receiveMessage', {
        from: socket.user.id,
        message: data.message,
      });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initializeSocket;
