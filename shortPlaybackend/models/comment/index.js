// models/Comment.js
const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
      index: true,
    },
    // 评论的作者
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // --- 数据冗余，提升查询性能 ---
    // 将用户信息做少量冗余存储，避免每次查询评论列表都要 populate 用户表
    userInfo: {
      nickname: String,
      avatar: String,
    },
    content: {
      type: String,
      required: [true, "评论内容不能为空"],
      trim: true,
    },
    // 用于实现评论回复功能
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null, // 如果是顶级评论，此字段为 null
    },
    likeCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comment", CommentSchema);
module.exports = Comment;
