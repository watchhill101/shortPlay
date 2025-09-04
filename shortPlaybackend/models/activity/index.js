// models/Activity.js
const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "活动标题不能为空"],
    },
    description: {
      type: String,
    },
    // 活动封面图或 Banner 图
    imageUrl: {
      type: String,
      required: true,
    },
    // 活动跳转链接，可以是内部路由（如 /collection/id）或外部 URL
    link: {
      type: String,
    },
    // 活动类型
    type: {
      type: String,
      enum: ["banner", "popup", "event"],
      required: true,
    },
    // 用于排序
    order: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "scheduled"],
      default: "scheduled",
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const Activity = mongoose.model("Activity", ActivitySchema);
module.exports = Activity;
