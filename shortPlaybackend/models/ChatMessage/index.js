const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    // 发送者
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // 接收者
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // 消息内容
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    // 消息类型
    messageType: {
      type: String,
      enum: ["text", "image", "voice", "video", "file"],
      default: "text",
    },
    // 消息状态
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true,
    },
    // 是否已读
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    // 已读时间
    readAt: {
      type: Date,
    },
    // 消息回复（引用其他消息）
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    // 会话ID（方便查询两人之间的对话）
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 复合索引：优化会话查询
ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });

// 复合索引：查询未读消息
ChatMessageSchema.index({ toUser: 1, isRead: 1 });

// 静态方法：生成会话ID
ChatMessageSchema.statics.generateConversationId = function(userId1, userId2) {
  // 确保会话ID的一致性（不论谁发起对话）
  return [userId1, userId2].sort().join('_');
};

// 静态方法：获取会话消息
ChatMessageSchema.statics.getConversationMessages = function(userId1, userId2, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  const conversationId = this.generateConversationId(userId1, userId2);
  
  return this.find({ conversationId })
    .populate('fromUser', 'nickname avatar')
    .populate('toUser', 'nickname avatar')
    .populate('replyTo', 'content fromUser')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// 静态方法：标记消息为已读
ChatMessageSchema.statics.markAsRead = function(userId1, userId2, userId) {
  const conversationId = this.generateConversationId(userId1, userId2);
  
  return this.updateMany(
    { 
      conversationId, 
      toUser: userId, 
      isRead: false 
    },
    { 
      isRead: true, 
      readAt: new Date(),
      status: 'read'
    }
  );
};

// 静态方法：获取未读消息数
ChatMessageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    toUser: userId,
    isRead: false
  });
};

const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema, "ChatMessage");

module.exports = ChatMessage; 