// models/PlayData.js
const mongoose = require("mongoose");

const PlayDataSchema = new mongoose.Schema(
  {
    // 播放数据所属用户

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // 播放数据所属合集

    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
      index: true,
    },
    // 播放数据所属作品

    work: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Work",
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

const PlayData = mongoose.model("PlayData", PlayDataSchema);
module.exports = PlayData;
