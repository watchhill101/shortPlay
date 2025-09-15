// models/Comment.js
const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema(
  {
    // 评论所属的作品
    work: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Work',
      required: true,
      index: true,
    },
    // 评论所属的合集（可选）
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      index: true,
    },
    // 评论的作者
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // --- 数据冗余，提升查询性能 ---
    // 将用户信息做少量冗余存储，避免每次查询评论列表都要 populate 用户表
    userInfo: {
      nickname: String,
      avatar: String,
    },
    content: {
      type: String,
      required: [true, '评论内容不能为空'],
      trim: true,
    },
    // 用于实现评论回复功能
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null, // 如果是顶级评论，此字段为 null
      index: true,
    },
    // 评论状态
    status: {
      type: String,
      enum: ['active', 'deleted', 'hidden'],
      default: 'active',
      index: true,
    },
    // 评论类型
    type: {
      type: String,
      enum: ['normal', 'highlight', 'pinned'],
      default: 'normal',
    },
    // 点赞数
    likeCount: {
      type: Number,
      default: 0,
    },
    // 点赞用户列表
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // 回复数
    replyCount: {
      type: Number,
      default: 0,
    },
    // 回复列表
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 添加索引
CommentSchema.index({ work: 1, status: 1, createdAt: -1 });
CommentSchema.index({ collection: 1, status: 1, createdAt: -1 });
CommentSchema.index({ user: 1, status: 1, createdAt: -1 });
CommentSchema.index({ parentComment: 1, status: 1, createdAt: -1 });

// 添加虚拟字段
CommentSchema.virtual('isDeleted').get(function () {
  return this.status === 'deleted';
});

// 添加中间件
CommentSchema.pre('save', async function (next) {
  if (this.isModified('replies')) {
    this.replyCount = this.replies.length;
  }
  next();
});

// 添加静态方法
CommentSchema.statics.findActiveComments = function (query = {}) {
  return this.find({ ...query, status: 'active' });
};

// 添加实例方法
CommentSchema.methods.softDelete = async function () {
  this.status = 'deleted';
  await this.save();
};

const Comment = mongoose.model('Comment', CommentSchema);
module.exports = Comment;
