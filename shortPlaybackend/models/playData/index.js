// models/PlayData.js
const mongoose = require('mongoose');

const PlayDataSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      required: true,
      index: true,
    },
    work: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Work',
      required: true,
      index: true,
    },
    // 用户本次播放时长（秒）
    playDuration: {
      type: Number,
      required: true,
    },
    // 是否播放完成
    isFinished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
); // 我们只关心播放行为的创建时间

const PlayData = mongoose.model('PlayData', PlayDataSchema);
module.exports = PlayData;
