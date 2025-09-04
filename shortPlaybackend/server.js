// server.js
const http = require('http');
const app = require('./app'); // 导入 Express 应用
const config = require('./config');
const connectDB = require('./config/database');
const { closeRedis } = require('./config/redis');
const initializeSocket = require('./socket');
const { createWebSocketServer } = require('./routes/websocket');
const mongoose = require('mongoose');

// 创建 HTTP 服务器
const server = http.createServer(app);

// 初始化 Socket.IO 并将其附加到 app 对象，以便在其他地方访问
const io = initializeSocket(server);
app.set('io', io);

// 初始化简单的WebSocket服务器（用于uni-app）
const wss = createWebSocketServer(server);
app.set('wss', wss);

const startServer = async () => {
  try {
    // 1. 连接数据库
    await connectDB();
    
    // 2. 启动服务器监听
    server.listen(config.port, () => {
      console.log(`🚀 服务正在以${config.env}模式在 ${config.port}端口运行.`);
    });
  } catch (error) {
    console.error('❌ 服务启动失败:', error);
    process.exit(1);
  }
};

startServer();

// 优雅停机逻辑
const shutdown = (signal) => {
  process.on(signal, async () => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    server.close(async () => {
      console.log('✅ HTTP server closed.');
      
      try {
        // 关闭Redis连接
        await closeRedis();
        
        // 关闭MongoDB连接
        await mongoose.connection.close(false);
        console.log('✅ MongoDB connection closed.');
        
        console.log('✅ All connections closed. Exiting...');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
        process.exit(1);
      }
    });
  });
};

['SIGINT', 'SIGTERM'].forEach(signal => shutdown(signal));