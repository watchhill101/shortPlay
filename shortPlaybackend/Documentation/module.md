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

#### 3. 后台用户表 (BackgroundUser)

**集合名**: `BackgroundUser`
**功能**: 后台管理员用户，负责内容创建和管理
**主要字段**:

- `account`: 管理员账号 (唯一，必填)
- `password`: 密码 (必填)
- `roles`: 关联角色数组 (RBAC系统)
- `additionalPermissions`: 额外权限数组 (特殊权限分配)
- `name`: 管理员姓名 (必填)
- `email`: 邮箱地址
- `status`: 账号状态 (active/inactive/locked)
- `lastLoginAt`: 最后登录时间
  现在 hasPermission 方法具备了实际的权限校验能力。当您在路由中间件或其他业务逻辑中调用 await user.hasPermission('SOME_CODE') 时，它会：
  安全地从数据库中查询出该用户的所有有效权限。
  准确地判断该用户是否真的拥有 SOME_CODE 这个权限。
  返回 true 或 false，从而有效地保护您的API接口。
  **关联关系**:
- 一对多关联 Collection
- 多对多关联 Role (RBAC角色)
- 多对多关联 Permission (额外权限)
- 一对多关联 PrimaryNavigation (创建的导航)
- 一对多关联 SecondaryNavigation (创建的导航)

### 🔐 RBAC权限管理模块

#### 4. 权限表 (Permission)

**集合名**: `Permission`
**功能**: 定义系统中的所有权限
**主要字段**:

- `name`: 权限名称 (必填)
- `code`: 权限编码 (唯一，必填，用于程序判断)
- `description`: 权限描述
- `group`: 权限分组 (navigation/content/user/system/data)
- `type`: 权限类型 (menu/button/api/data)
- `resource`: 资源路径 (用于菜单权限)
- `status`: 权限状态 (active/inactive)
  **关联关系**: 多对多关联 Role、BackgroundUser

#### 5. 角色表 (Role)

**集合名**: `Role`
**功能**: 定义系统角色和角色权限
**主要字段**:

- `name`: 角色名称 (必填)
- `code`: 角色编码 (唯一，必填)
- `description`: 角色描述
- `level`: 角色级别 (数字越小权限越高)
- `permissions`: 关联权限数组
- `status`: 角色状态 (active/inactive)
- `isBuiltIn`: 是否为系统内置角色
  **关联关系**: 多对多关联 Permission、BackgroundUser

### 🧭 导航管理模块

#### 6. 一级导航表 (PrimaryNavigation)

**集合名**: `PrimaryNavigation`
**功能**: 系统一级导航菜单，支持权限控制
**主要字段**:

- `title`: 导航标题 (必填)
- `link`: 导航链接 (必填)
- `icon`: 图标
- `permission`: 关联权限 (必填，RBAC控制)
- `order`: 排序权重
- `status`: 状态 (active/inactive)
- `visible`: 是否显示
- `createdBy`: 创建者 (关联BackgroundUser)
  **关联关系**:
- 多对一关联 Permission (权限控制)
- 多对一关联 BackgroundUser (创建者)
- 一对多关联 SecondaryNavigation (子导航)

#### 7. 二级导航表 (SecondaryNavigation)

**集合名**: `SecondaryNavigation`
**功能**: 系统二级导航菜单，支持权限控制和层级关系
**主要字段**:

- `title`: 二级导航标题 (必填)
- `link`: 二级导航链接 (必填)
- `icon`: 图标
- `parentNavigation`: 父级导航 (必填，关联PrimaryNavigation)
- `permission`: 关联权限 (必填，RBAC控制)
- `order`: 排序权重
- `status`: 状态 (active/inactive)
- `visible`: 是否显示
- `createdBy`: 创建者 (关联BackgroundUser)
  **关联关系**:
- 多对一关联 PrimaryNavigation (父级导航)
- 多对一关联 Permission (权限控制)
- 多对一关联 BackgroundUser (创建者)

### 📚 内容管理模块

#### 8. 分类表 (Classifier)

**集合名**: `Classifier`
**功能**: 短剧内容分类管理
**主要字段**:

- `name`: 分类名称 (唯一，必填)
- `description`: 分类描述
- `order`: 排序权重 (数字越小越靠前)
- `status`: 分类状态 (active/inactive)
  **关联关系**: 一对多关联 Collection

#### 9. 合集表 (Collection)

**集合名**: `Collection`
**功能**: 短剧合集信息，包含多个作品
**主要字段**:

- `backgroundUser`: 关联后台管理员用户ID (关联BackgroundUser)
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
- 多对一关联 BackgroundUser (后台管理员)
- 多对一关联 Classifier
- 一对多关联 Work
- 一对多关联 Collect、Comment、PlayData

#### 10. 作品表 (Work)

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

#### 11. 播放数据表 (PlayData)

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

#### 12. 收藏表 (Collect)

**集合名**: `Collect`
**功能**: 用户收藏合集记录
**主要字段**:

- `user`: 用户ID (必填)
- `collection`: 合集ID (必填)
  **索引**: 复合唯一索引 (user + collection) 防止重复收藏
  **时间戳**: 仅记录创建时间
  **关联关系**: 多对一关联 User、Collection

#### 13. 评论表 (Comment)

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

#### 14. 活动表 (Activity)

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

```mermaid
User (前端用户)
├── 1:1 → Wallet (钱包)
├── 1:N → Collect (收藏)
├── 1:N → Comment (评论)
└── 1:N → PlayData (播放数据)

BackgroundUser (后台管理员)
├── N:M → Role (角色) [RBAC]
├── N:M → Permission (额外权限) [RBAC]
├── 1:N → Collection (合集)
├── 1:N → PrimaryNavigation (一级导航)
└── 1:N → SecondaryNavigation (二级导航)

Role (角色) [RBAC]
├── N:M → BackgroundUser (后台用户)
└── N:M → Permission (权限)

Permission (权限) [RBAC]
├── N:M → Role (角色)
├── N:M → BackgroundUser (额外权限)
├── 1:N → PrimaryNavigation (导航权限)
└── 1:N → SecondaryNavigation (导航权限)

PrimaryNavigation (一级导航)
├── N:1 → Permission (权限控制)
├── N:1 → BackgroundUser (创建者)
└── 1:N → SecondaryNavigation (子导航)

SecondaryNavigation (二级导航)
├── N:1 → PrimaryNavigation (父导航)
├── N:1 → Permission (权限控制)
└── N:1 → BackgroundUser (创建者)

Classifier (分类)
└── 1:N → Collection (合集)

Collection (合集)
├── N:1 → BackgroundUser (后台管理员用户)
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
- **后台用户表**: account, status
- **权限表**: code, (group + type), status
- **角色表**: code, level, status
- **一级导航表**: permission, (status + visible), order
- **二级导航表**: (parentNavigation + order), permission, (status + visible)
- **分类表**: status, order
- **合集表**: backgroundUser, title, classifier, status
- **作品表**: collectionId, status, (collectionId + episodeNumber) 复合唯一索引
- **播放数据**: user, collection, work
- **收藏表**: (user + collection) 复合唯一索引
- **评论表**: collection
- **活动表**: status, (startDate + endDate)

### 数据冗余策略

- **合集表**: 缓存 workCount, totalPlayCount, collectCount
- **作品表**: 缓存 playCount, likeCount, commentCount
- **评论表**: 冗余存储 userInfo (nickname, avatar)

### 数据类型优化

- **金额字段**: 使用 Decimal128 避免浮点数精度问题
- **时间戳**: 根据业务需求选择性启用 updatedAt

## 🔐 RBAC权限系统使用

### 初始化系统

```javascript
const { initRBACSystem } = require('./models/rbac-init');
await initRBACSystem();
```

### 默认角色说明

- **超级管理员** (SUPER_ADMIN): 拥有所有权限
- **内容管理员** (CONTENT_MANAGER): 负责内容和导航管理
- **数据分析员** (DATA_ANALYST): 负责数据统计分析
- **审核员** (MODERATOR): 负责内容审核

### 权限验证示例

```javascript
// 检查用户是否有特定权限
const user = await BackgroundUser.findById(userId).populate('roles');
const hasPermission = await user.hasPermission('CONTENT_MANAGEMENT');

// 获取用户所有权限
const permissions = await user.getAllPermissions();
```

## 🚀 扩展建议

1. **缓存层**: Redis缓存热门数据和权限信息
2. **搜索引擎**: Elasticsearch支持全文搜索
3. **CDN**: 视频和图片资源分发
4. **分库分表**: 大数据量时考虑分片策略
5. **消息队列**: 异步处理统计数据更新
6. **权限缓存**: Redis缓存用户权限以提升验证性能
7. **审计日志**: 记录所有权限相关操作
