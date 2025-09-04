# 短剧平台数据模型文档

## 📊 数据库表结构概览

### 🧑‍💼 用户管理模块

#### 1. 用户表 (User)
**集合名**: `User`
**功能**: 存储用户基本信息，支持手机号和抖音登录
**主要字段**:
- `mobilePhoneNumber`: 手机号 (唯一，稀疏索引)
- `douyinProfile`: 抖音用户信息
  - `openId`: 抖音openId (唯一，稀疏索引)
  - `unionId`: 抖音unionId (唯一，稀疏索引)
  - `nickname`: 抖音昵称
  - `avatar`: 抖音头像
  - `gender`: 性别 (0-未知, 1-男, 2-女)
  - `city/province/country`: 地理信息
- `nickname`: 用户昵称 (必填)
- `avatar`: 头像URL
- `status`: 用户状态 (active/inactive/banned)
- `lastLoginAt`: 最后登录时间
**关联关系**: 一对多关联 Collection、Collect、Comment、PlayData、Wallet

#### 2. 钱包表 (Wallet)
**集合名**: `Wallet`
**功能**: 用户钱包系统，管理余额和交易记录
**主要字段**:
- `user`: 关联用户ID (一对一，唯一)
- `balance`: 余额 (Decimal128精确类型)
- `transactions`: 交易记录数组 (内嵌子文档)
  - `type`: 交易类型 (deposit/withdrawal/reward/purchase)
  - `amount`: 交易金额 (Decimal128)
  - `description`: 交易描述
  - `timestamp`: 交易时间
**关联关系**: 一对一关联 User

### 📚 内容管理模块

#### 3. 分类表 (Classifier)
**集合名**: `Classifier`
**功能**: 短剧内容分类管理
**主要字段**:
- `name`: 分类名称 (唯一，必填)
- `description`: 分类描述
- `order`: 排序权重 (数字越小越靠前)
- `status`: 分类状态 (active/inactive)
**关联关系**: 一对多关联 Collection

#### 4. 合集表 (Collection)
**集合名**: `Collection`
**功能**: 短剧合集信息，包含多个作品
**主要字段**:
- `user`: 创建者用户ID (关联User)
- `title`: 合集标题 (必填，有索引)
- `description`: 合集简介 (必填)
- `coverImage`: 封面图URL (必填)
- `classifier`: 关联分类ID (必填，有索引)
- `status`: 状态 (draft/published/archived)
- `tags`: 标签数组
- `isFinished`: 是否完结
- **性能缓存字段**:
  - `workCount`: 作品数量
  - `totalPlayCount`: 总播放量
  - `collectCount`: 收藏次数
**关联关系**: 
- 多对一关联 User (创建者)
- 多对一关联 Classifier
- 一对多关联 Work
- 一对多关联 Collect、Comment、PlayData

#### 5. 作品表 (Work)
**集合名**: `Work`
**功能**: 短剧单集作品信息
**主要字段**:
- `collectionId`: 所属合集ID (必填，有索引)
- `title`: 作品标题 (必填)
- `episodeNumber`: 剧集编号 (必填)
- `videoUrl`: 视频地址 (必填)
- `coverImage`: 单集封面图
- `duration`: 视频时长(秒) (必填)
- `status`: 状态 (draft/published)
- **性能缓存字段**:
  - `playCount`: 播放次数
  - `likeCount`: 点赞次数
  - `commentCount`: 评论次数
**索引**: 复合唯一索引 (collectionId + episodeNumber)
**关联关系**: 
- 多对一关联 Collection
- 一对多关联 PlayData

### 📈 用户行为模块

#### 6. 播放数据表 (PlayData)
**集合名**: `PlayData`
**功能**: 记录用户播放行为数据
**主要字段**:
- `user`: 用户ID (必填，有索引)
- `collection`: 合集ID (必填，有索引)
- `work`: 作品ID (必填，有索引)
- `playDuration`: 播放时长(秒) (必填)
- `isFinished`: 是否播放完成
**时间戳**: 仅记录创建时间
**关联关系**: 多对一关联 User、Collection、Work

#### 7. 收藏表 (Collect)
**集合名**: `Collect`
**功能**: 用户收藏合集记录
**主要字段**:
- `user`: 用户ID (必填)
- `collection`: 合集ID (必填)
**索引**: 复合唯一索引 (user + collection) 防止重复收藏
**时间戳**: 仅记录创建时间
**关联关系**: 多对一关联 User、Collection

#### 8. 评论表 (Comment)
**集合名**: `Comment`
**功能**: 合集评论系统，支持回复
**主要字段**:
- `collection`: 合集ID (必填，有索引)
- `user`: 评论用户ID (必填)
- `userInfo`: 用户信息冗余存储 (性能优化)
  - `nickname`: 用户昵称
  - `avatar`: 用户头像
- `content`: 评论内容 (必填)
- `parentComment`: 父评论ID (支持回复功能)
- `likeCount`: 点赞数
**关联关系**: 多对一关联 Collection、User，支持自关联(回复)

### 🎯 运营管理模块

#### 9. 活动表 (Activity)
**集合名**: `Activity`
**功能**: 平台活动和广告管理
**主要字段**:
- `title`: 活动标题 (必填)
- `description`: 活动描述
- `imageUrl`: 活动图片/Banner (必填)
- `link`: 跳转链接
- `type`: 活动类型 (banner/popup/event)
- `order`: 排序权重
- `status`: 状态 (active/inactive/scheduled)
- `startDate`: 开始时间 (必填)
- `endDate`: 结束时间 (必填)
**关联关系**: 独立表，无外键关联

## 🔗 关系图谱

```
User (用户)
├── 1:1 → Wallet (钱包)
├── 1:N → Collection (合集)
├── 1:N → Collect (收藏)
├── 1:N → Comment (评论)
└── 1:N → PlayData (播放数据)

Classifier (分类)
└── 1:N → Collection (合集)

Collection (合集)
├── N:1 → User (创建者)
├── N:1 → Classifier (分类)
├── 1:N → Work (作品)
├── 1:N → Collect (收藏)
├── 1:N → Comment (评论)
└── 1:N → PlayData (播放数据)

Work (作品)
├── N:1 → Collection (合集)
└── 1:N → PlayData (播放数据)

Activity (活动)
└── [独立表，无关联]
```

## 📋 性能优化策略

### 索引设计
- **用户表**: mobilePhoneNumber, douyinProfile.openId, douyinProfile.unionId (稀疏唯一索引)
- **合集表**: user, title, classifier, status
- **作品表**: collectionId, (collectionId + episodeNumber) 复合唯一索引
- **播放数据**: user, collection, work
- **收藏表**: (user + collection) 复合唯一索引
- **评论表**: collection
- **活动表**: status

### 数据冗余策略
- **合集表**: 缓存 workCount, totalPlayCount, collectCount
- **作品表**: 缓存 playCount, likeCount, commentCount  
- **评论表**: 冗余存储 userInfo (nickname, avatar)

### 数据类型优化
- **金额字段**: 使用 Decimal128 避免浮点数精度问题
- **时间戳**: 根据业务需求选择性启用 updatedAt

## 🚀 扩展建议

1. **缓存层**: Redis缓存热门数据
2. **搜索引擎**: Elasticsearch支持全文搜索
3. **CDN**: 视频和图片资源分发
4. **分库分表**: 大数据量时考虑分片策略
5. **消息队列**: 异步处理统计数据更新