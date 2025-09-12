// socket/videoCall.js - 视频通话信令服务
const CallRecord = require('../models/CallRecord/index');

// 内存中存储活跃通话会话（生产环境建议用Redis）
const activeCalls = new Map();

const handleVideoCallEvents = (socket, io) => {
  console.log(`📞 用户 ${socket.user.id} 加载视频通话功能`);

  // 发起通话邀请
  socket.on('call:invite', async data => {
    try {
      const { targetUserId, callType = 'video', callId, roomId } = data;

      console.log(`📱 ${socket.user.id} 发起${callType}通话给 ${targetUserId}`);

      // 检查目标用户是否在线
      const targetUserSockets = [...io.sockets.sockets.values()].filter(s => s.user && s.user.id === targetUserId);

      if (targetUserSockets.length === 0) {
        socket.emit('call:failed', {
          reason: 'USER_OFFLINE',
          message: '对方当前不在线',
        });
        return;
      }

      // 检查目标用户是否已在通话中
      const isTargetBusy = Array.from(activeCalls.values()).some(call => call.participants.includes(targetUserId));

      if (isTargetBusy) {
        socket.emit('call:failed', {
          reason: 'USER_BUSY',
          message: '对方正在通话中',
        });
        return;
      }

      // 获取发起者信息
      const User = require('../models/User/index');
      const caller = await User.findById(socket.user.id).select('nickname avatar');

      // 创建通话会话
      const callSession = {
        callId,
        type: callType,
        participants: [socket.user.id, targetUserId],
        initiator: socket.user.id,
        status: 'ringing',
        roomId: roomId,
        createdAt: Date.now(),
        caller: {
          id: socket.user.id,
          nickname: caller.nickname,
          avatar: caller.avatar,
        },
      };

      activeCalls.set(callId, callSession);

      // 向目标用户发送通话邀请
      targetUserSockets.forEach(targetSocket => {
        targetSocket.emit('call:incoming', {
          callId,
          callType,
          from: socket.user.id,
          caller: callSession.caller,
          roomId: roomId,
          timestamp: Date.now(),
        });
      });

      // 确认邀请已发送
      socket.emit('call:invited', {
        callId,
        targetUserId,
        callType,
        timestamp: Date.now(),
      });

      // 30秒后自动取消
      setTimeout(() => {
        if (activeCalls.has(callId) && activeCalls.get(callId).status === 'ringing') {
          activeCalls.delete(callId);
          socket.emit('call:timeout', { callId });
          targetUserSockets.forEach(targetSocket => {
            targetSocket.emit('call:cancelled', { callId, reason: 'TIMEOUT' });
          });
        }
      }, 30000);
    } catch (error) {
      console.error('处理通话邀请失败:', error);
      socket.emit('call:failed', {
        reason: 'SERVER_ERROR',
        message: '发起通话失败',
      });
    }
  });

  // 接受通话
  socket.on('call:accept', async data => {
    try {
      const { callId } = data;
      const callSession = activeCalls.get(callId);

      if (!callSession) {
        socket.emit('call:failed', {
          reason: 'CALL_NOT_FOUND',
          message: '通话已结束或不存在',
        });
        return;
      }

      // 更新通话状态
      callSession.status = 'connected';
      callSession.connectedAt = Date.now();

      // 通知双方通话已连接
      const participants = callSession.participants;
      participants.forEach(userId => {
        const userSockets = [...io.sockets.sockets.values()].filter(s => s.user && s.user.id === userId);

        userSockets.forEach(userSocket => {
          userSocket.emit('call:connected', {
            callId,
            participants,
            startTime: callSession.connectedAt,
            callType: callSession.type,
          });
        });
      });

      console.log(`✅ 通话连接成功: ${callId}`);
    } catch (error) {
      console.error('接受通话失败:', error);
      socket.emit('call:failed', {
        reason: 'SERVER_ERROR',
        message: '接受通话失败',
      });
    }
  });

  // 拒绝通话
  socket.on('call:reject', async data => {
    try {
      const { callId, reason = 'REJECTED' } = data;
      const callSession = activeCalls.get(callId);

      if (callSession) {
        activeCalls.delete(callId);

        // 通知发起者
        const initiatorSockets = [...io.sockets.sockets.values()].filter(
          s => s.user && s.user.id === callSession.initiator
        );

        initiatorSockets.forEach(initiatorSocket => {
          initiatorSocket.emit('call:rejected', {
            callId,
            reason,
            rejectedBy: socket.user.id,
            timestamp: Date.now(),
          });
        });

        console.log(`❌ 通话被拒绝: ${callId}`);
      }
    } catch (error) {
      console.error('拒绝通话失败:', error);
    }
  });

  // 结束通话
  socket.on('call:end', async data => {
    try {
      const { callId, reason = 'USER_ENDED' } = data;
      const callSession = activeCalls.get(callId);

      if (callSession) {
        const duration = callSession.connectedAt ? Math.floor((Date.now() - callSession.connectedAt) / 1000) : 0;

        // 保存通话记录（如果有数据库模型）
        try {
          await CallRecord.create({
            participants: callSession.participants.map(userId => ({
              user: userId,
              joinedAt: new Date(callSession.connectedAt || callSession.createdAt),
              leftAt: new Date(),
            })),
            callType: callSession.type,
            status: callSession.status === 'connected' ? 'ended' : 'cancelled',
            duration: duration,
            initiator: callSession.initiator,
            endReason: reason,
            callId: callSession.callId,
          });
        } catch (dbError) {
          console.error('保存通话记录失败:', dbError);
        }

        // 通知所有参与者
        callSession.participants.forEach(userId => {
          const userSockets = [...io.sockets.sockets.values()].filter(s => s.user && s.user.id === userId);

          userSockets.forEach(userSocket => {
            userSocket.emit('call:ended', {
              callId,
              reason,
              duration,
              endedBy: socket.user.id,
              timestamp: Date.now(),
            });
          });
        });

        activeCalls.delete(callId);
        console.log(`📞 通话结束: ${callId}, 时长: ${duration}秒`);
      }
    } catch (error) {
      console.error('结束通话失败:', error);
    }
  });

  // 通话质量报告（可选）
  socket.on('call:quality', data => {
    const { callId, quality } = data;
    const callSession = activeCalls.get(callId);

    if (callSession) {
      callSession.quality = callSession.quality || {};
      callSession.quality[socket.user.id] = {
        ...quality,
        reportedAt: Date.now(),
      };
    }
  });

  // 断开连接时清理
  socket.on('disconnect', () => {
    // 查找用户参与的活跃通话
    const userCalls = Array.from(activeCalls.entries()).filter(([_, call]) =>
      call.participants.includes(socket.user.id)
    );

    userCalls.forEach(([callId, callSession]) => {
      // 通知其他参与者用户已离开
      callSession.participants
        .filter(userId => userId !== socket.user.id)
        .forEach(userId => {
          const userSockets = [...io.sockets.sockets.values()].filter(s => s.user && s.user.id === userId);

          userSockets.forEach(userSocket => {
            userSocket.emit('call:ended', {
              callId,
              reason: 'USER_DISCONNECTED',
              endedBy: socket.user.id,
              timestamp: Date.now(),
            });
          });
        });

      activeCalls.delete(callId);
    });
  });
};

// 获取活跃通话统计（管理用）
const getActiveCallsStats = () => {
  return {
    totalActiveCalls: activeCalls.size,
    callsByType: Array.from(activeCalls.values()).reduce((acc, call) => {
      acc[call.type] = (acc[call.type] || 0) + 1;
      return acc;
    }, {}),
    callsByStatus: Array.from(activeCalls.values()).reduce((acc, call) => {
      acc[call.status] = (acc[call.status] || 0) + 1;
      return acc;
    }, {}),
  };
};

module.exports = {
  handleVideoCallEvents,
  getActiveCallsStats,
};
