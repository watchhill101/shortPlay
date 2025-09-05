const mongoose = require('mongoose');

const FriendSchema = new mongoose.Schema(
  {
    // 发起好友申请的用户
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // 接收好友申请的用户
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // 好友关系状态
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'blocked'],
      default: 'pending',
      index: true,
    },
    // 申请消息
    requestMessage: {
      type: String,
      default: '我想加你为好友',
      maxlength: 100,
    },
    // 备注名称（申请者对接收者的备注）
    requesterRemark: {
      type: String,
      maxlength: 50,
    },
    // 备注名称（接收者对申请者的备注）
    recipientRemark: {
      type: String,
      maxlength: 50,
    },
    // 成为好友的时间
    acceptedAt: {
      type: Date,
    },
    // 最后互动时间
    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 复合索引：确保同一对用户之间只能有一个好友关系记录
FriendSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// 索引：按状态查询
FriendSchema.index({ status: 1 });

// 索引：查询某用户的所有好友关系
FriendSchema.index({ requester: 1, status: 1 });
FriendSchema.index({ recipient: 1, status: 1 });

// 实例方法：检查是否为好友
FriendSchema.methods.isFriend = function () {
  return this.status === 'accepted';
};

// 静态方法：查找两个用户之间的好友关系
FriendSchema.statics.findRelationship = function (userId1, userId2) {
  return this.findOne({
    $or: [
      { requester: userId1, recipient: userId2 },
      { requester: userId2, recipient: userId1 },
    ],
  });
};

// 静态方法：获取用户的所有好友
FriendSchema.statics.getUserFriends = function (userId, options = {}) {
  const { page = 1, limit = 20, search = '' } = options;
  const skip = (page - 1) * limit;

  const pipeline = [
    {
      $match: {
        $or: [
          { requester: new mongoose.Types.ObjectId(userId), status: 'accepted' },
          { recipient: new mongoose.Types.ObjectId(userId), status: 'accepted' },
        ],
      },
    },
    {
      $lookup: {
        from: 'User',
        localField: 'requester',
        foreignField: '_id',
        as: 'requesterInfo',
      },
    },
    {
      $lookup: {
        from: 'User',
        localField: 'recipient',
        foreignField: '_id',
        as: 'recipientInfo',
      },
    },
    {
      $addFields: {
        friendInfo: {
          $cond: {
            if: { $eq: ['$requester', new mongoose.Types.ObjectId(userId)] },
            then: { $arrayElemAt: ['$recipientInfo', 0] },
            else: { $arrayElemAt: ['$requesterInfo', 0] },
          },
        },
        remarkName: {
          $cond: {
            if: { $eq: ['$requester', new mongoose.Types.ObjectId(userId)] },
            then: '$requesterRemark',
            else: '$recipientRemark',
          },
        },
      },
    },
  ];

  // 如果有搜索条件，添加搜索过滤
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { 'friendInfo.nickname': { $regex: search, $options: 'i' } },
          { remarkName: { $regex: search, $options: 'i' } },
        ],
      },
    });
  }

  // 排序：最近互动的在前
  pipeline.push({
    $sort: { lastInteractionAt: -1 },
  });

  // 分页
  pipeline.push({ $skip: skip }, { $limit: limit });

  // 选择需要的字段
  pipeline.push({
    $project: {
      friendInfo: {
        _id: 1,
        nickname: 1,
        avatar: 1,
        status: 1,
        lastLoginAt: 1,
      },
      remarkName: 1,
      acceptedAt: 1,
      lastInteractionAt: 1,
      status: 1,
    },
  });

  return this.aggregate(pipeline);
};

// 静态方法：获取用户的好友申请
FriendSchema.statics.getFriendRequests = function (userId, type = 'received') {
  const query =
    type === 'received' ? { recipient: userId, status: 'pending' } : { requester: userId, status: 'pending' };

  return this.find(query)
    .populate(type === 'received' ? 'requester' : 'recipient', 'nickname avatar status lastLoginAt')
    .sort({ createdAt: -1 });
};

const Friend = mongoose.model('Friend', FriendSchema, 'Friend');

module.exports = Friend;
