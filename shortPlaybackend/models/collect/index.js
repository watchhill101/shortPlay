// models/Collect.js
const mongoose = require("mongoose");

const CollectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// 创建复合唯一索引，防止用户重复收藏同一个合集
CollectSchema.index({ user: 1, collection: 1 }, { unique: true });

const Collect = mongoose.model("Collect", CollectSchema);
module.exports = Collect;
