const mongoose = require('mongoose');

const CallRecordSchema = new mongoose.Schema(
  {
    // 通话参与者
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        joinedAt: {
          type: Date,
          required: true,
        },
        leftAt: {
          type: Date,
          required: true,
        },
      },
    ],

    // 通话类型
    callType: {
      type: String,
      enum: ['audio', 'video'],
      required: true,
      index: true,
    },

    // 通话状态
    status: {
      type: String,
      enum: ['initiated', 'connected', 'ended', 'cancelled', 'failed'],
      default: 'initiated',
      index: true,
    },

    // 通话时长（秒）
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 通话发起者
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // 通话质量信息
    quality: {
      avgBitrate: {
        type: Number,
        min: 0,
      },
      packetLoss: {
        type: Number,
        min: 0,
        max: 100,
      },
      connectionType: {
        type: String,
        enum: ['wifi', '4g', '5g', '3g', 'unknown'],
      },
      networkDelay: {
        type: Number,
        min: 0,
      },
    },

    // 通话结束原因
    endReason: {
      type: String,
      enum: [
        'USER_ENDED',
        'USER_REJECTED',
        'USER_BUSY',
        'TIMEOUT',
        'NETWORK_ERROR',
        'SERVER_ERROR',
        'USER_DISCONNECTED',
      ],
      default: 'USER_ENDED',
    },

    // 通话ID（用于关联实时通话会话）
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 复合索引：优化查询
CallRecordSchema.index({ 'participants.user': 1, createdAt: -1 });
CallRecordSchema.index({ initiator: 1, createdAt: -1 });
CallRecordSchema.index({ status: 1, callType: 1 });

// 静态方法：获取用户通话记录
CallRecordSchema.statics.getUserCallHistory = function (userId, options = {}) {
  const { page = 1, limit = 20, callType, status } = options;
  const skip = (page - 1) * limit;

  const query = {
    'participants.user': userId,
  };

  if (callType) {
    query.callType = callType;
  }

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('participants.user', 'nickname avatar')
    .populate('initiator', 'nickname avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// 静态方法：获取通话统计
CallRecordSchema.statics.getCallStats = function (userId, dateRange = {}) {
  const { startDate, endDate } = dateRange;
  const matchQuery = {
    'participants.user': mongoose.Types.ObjectId(userId),
  };

  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        videoCalls: {
          $sum: { $cond: [{ $eq: ['$callType', 'video'] }, 1, 0] },
        },
        audioCalls: {
          $sum: { $cond: [{ $eq: ['$callType', 'audio'] }, 1, 0] },
        },
        successfulCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'ended'] }, 1, 0] },
        },
        avgDuration: { $avg: '$duration' },
      },
    },
  ]);
};

// 实例方法：获取通话的另一方用户
CallRecordSchema.methods.getOtherParticipant = function (currentUserId) {
  return this.participants.find(p => p.user.toString() !== currentUserId.toString());
};

// 实例方法：检查用户是否参与了此通话
CallRecordSchema.methods.hasParticipant = function (userId) {
  return this.participants.some(p => p.user.toString() === userId.toString());
};

// 虚拟字段：格式化时长
CallRecordSchema.virtual('formattedDuration').get(function () {
  if (this.duration < 60) {
    return `${this.duration}秒`;
  } else if (this.duration < 3600) {
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}分${seconds}秒`;
  } else {
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    return `${hours}小时${minutes}分钟`;
  }
});

// 虚拟字段：通话成功率
CallRecordSchema.virtual('isSuccessful').get(function () {
  return this.status === 'ended' && this.duration > 0;
});

const CallRecord = mongoose.model('CallRecord', CallRecordSchema, 'CallRecord');

module.exports = CallRecord;
