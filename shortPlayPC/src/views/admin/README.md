# 短剧PC端后台管理 - 内容管理模块

## 功能概述

内容管理模块是短剧平台的核心管理功能，提供完整的剧集内容管理、审核和分类管理能力。

## 主要功能

### 📺 剧集管理 (`/admin/content-management`)
- **合集管理**: 创建、编辑、删除剧集合集
- **剧集信息**: 标题、简介、封面、分类、主演、标签等
- **状态管理**: 草稿、已发布、已归档
- **搜索筛选**: 按标题、状态、分类等条件筛选
- **批量操作**: 支持批量删除等操作

### 🎬 分集管理 (`/admin/collections/:id/works`)
- **剧集列表**: 查看某个合集下的所有剧集
- **添加剧集**: 上传视频文件、设置封面、集数等信息
- **编辑剧集**: 修改剧集信息、更新视频文件
- **状态管理**: 草稿、已发布状态切换
- **播放统计**: 查看播放量、点赞数等数据

### ✅ 内容审核 (`/admin/content-review`)
- **待审核列表**: 查看所有待审核的合集
- **详细审核**: 查看完整内容信息进行审核
- **快速操作**: 一键通过或拒绝审核
- **审核记录**: 记录审核意见和审核人

### 🏷️ 分类管理 (`/admin/category-management`)
- **分类维护**: 创建、编辑、删除内容分类
- **排序管理**: 调整分类显示顺序
- **状态控制**: 启用/禁用分类
- **使用统计**: 查看分类被使用的次数

## 技术实现

### 后端API
- 基于 Express.js 框架
- 使用 MongoDB 数据库存储
- 支持文件上传 (multer)
- RESTful API 设计
- JWT 认证保护

### 前端组件
- Vue 3 + Composition API
- PrimeVue UI组件库
- 响应式设计
- 文件上传支持
- 实时数据更新

### 数据结构

#### 合集 (Collection)
```javascript
{
  title: String,           // 合集标题
  description: String,     // 合集简介
  coverImage: String,      // 封面图片URL
  classifier: ObjectId,    // 分类ID
  actors: [String],        // 主演列表
  tags: [String],         // 标签列表
  status: String,         // 状态: draft/published/archived
  isFinished: Boolean,    // 是否完结
  workCount: Number,      // 剧集数量
  totalPlayCount: Number, // 总播放量
  collectCount: Number    // 收藏数量
}
```

#### 剧集 (Work)
```javascript
{
  collectionId: ObjectId, // 所属合集ID
  title: String,          // 剧集标题
  episodeNumber: Number,  // 集数
  videoUrl: String,       // 视频文件URL
  coverImage: String,     // 封面图片URL
  duration: Number,       // 视频时长(秒)
  status: String,         // 状态: draft/published
  playCount: Number,      // 播放量
  likeCount: Number,      // 点赞数
  commentCount: Number    // 评论数
}
```

#### 分类 (Classifier)
```javascript
{
  name: String,           // 分类名称
  description: String,    // 分类描述
  status: String,         // 状态: active/inactive
  order: Number           // 排序值
}
```

## 使用方法

### 1. 创建新合集
1. 进入"剧集管理"页面
2. 点击"新建合集"按钮
3. 填写合集信息：标题、简介、分类等
4. 上传封面图片
5. 设置主演和标签
6. 保存合集

### 2. 添加剧集
1. 在合集列表中点击"查看剧集"按钮
2. 点击"新增剧集"按钮
3. 填写剧集信息：标题、集数、时长
4. 上传视频文件和封面图片
5. 设置发布状态
6. 保存剧集

### 3. 内容审核
1. 进入"内容审核"页面
2. 查看待审核内容列表
3. 点击"详细审核"查看完整信息
4. 选择审核结果：通过发布或拒绝归档
5. 填写审核意见（可选）
6. 提交审核结果

### 4. 分类管理
1. 进入"分类/标签管理"页面
2. 点击"新建分类"创建新分类
3. 设置分类名称、描述、排序
4. 使用上下箭头调整分类排序
5. 启用/禁用分类状态

## 权限说明

- 所有内容管理功能需要管理员权限
- API接口使用JWT令牌验证身份
- 前端路由需要认证中间件保护

## 文件上传

### 支持格式
- **视频文件**: MP4, AVI, MOV等常见格式
- **图片文件**: JPG, PNG格式

### 文件大小限制
- **视频文件**: 最大500MB
- **图片文件**: 最大5MB

### 存储路径
- **视频文件**: `/uploads/video/`
- **封面图片**: `/uploads/coverImage/`

## 注意事项

1. **删除限制**: 有剧集的合集不能删除，需先删除所有剧集
2. **分类限制**: 被使用的分类不能删除
3. **文件管理**: 删除内容时需要手动清理对应的文件
4. **审核流程**: 内容需要审核通过才能发布给用户
5. **数据备份**: 重要操作前建议备份数据

## 扩展功能

未来可以考虑添加的功能：
- 批量导入剧集
- 视频转码和压缩
- 内容推荐算法配置
- 数据统计和分析
- 定时发布功能
- 内容版权管理
