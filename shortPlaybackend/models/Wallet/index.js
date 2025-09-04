// models/Wallet.js
const mongoose = require("mongoose");

// 定义交易记录的子文档 Schema
const TransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["deposit", "withdrawal", "reward", "purchase"], // 充值, 提现, 奖励, 消费
    required: true,
  },
  // 使用 Decimal128 类型来精确存储金额，避免浮点数计算误差
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
  },
  description: {
    type: String,
  },
  // 交易发生时间
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const WalletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 确保一个用户只有一个钱包
    },
    balance: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: 0.0,
    },
    // 将交易历史内嵌为子文档数组
    transactions: [TransactionSchema],
  },
  { timestamps: true }
);

const Wallet = mongoose.model("Wallet", WalletSchema);
module.exports = Wallet;
