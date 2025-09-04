<template>
  <view class="messages-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-left" @click="goBack">
          <u-icon name="arrow-left" color="#000000" :size="20"></u-icon>
        </view>
        <view class="navbar-title">我的消息</view>
        <view class="navbar-right">
          <u-icon name="plus" color="#000000" :size="20" @click="addNewChat"></u-icon>
        </view>
      </view>
    </view>

    <!-- 虚拟列表容器 -->
    <view class="virtual-list-container" @scroll="onScroll" :scroll-top="scrollTop">
      <view v-if="loading" class="loading-state">
        <view class="loading-spinner">
          <view class="spinner-ring"></view>
        </view>
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="messageList.length === 0" class="empty-state">
        <view class="empty-icon">
          <view class="empty-message">
            <view class="message-bubble">
              <view class="bubble-dot"></view>
              <view class="bubble-dot"></view>
              <view class="bubble-dot"></view>
            </view>
          </view>
        </view>
        <view class="empty-text">暂无消息</view>
        <view class="empty-desc">快去和好友聊天吧</view>
        <view class="add-chat-btn" @click="addNewChat">
          <text class="btn-text">开始聊天</text>
        </view>
      </view>
      
      <!-- 虚拟列表实现 -->
      <view v-else class="virtual-list">
        <!-- 占位容器，用于撑开滚动高度 -->
        <view class="virtual-placeholder" :style="{ height: totalHeight + 'rpx' }"></view>
        
        <!-- 可视区域容器 -->
        <view class="virtual-viewport" :style="{ transform: `translateY(${offsetY}rpx)` }">
          <view 
            v-for="item in visibleMessages" 
            :key="item.id"
            class="message-item"
            @click="openChat(item)"
          >
            <view class="message-content">
              <!-- 头像区域 -->
              <view class="avatar-container">
                <image 
                  :src="item.avatar" 
                  class="avatar"
                  mode="aspectFill"
                />
                <!-- 未读消息提示 -->
                <view v-if="item.unreadCount > 0" class="unread-badge">
                  <text class="unread-count">{{ item.unreadCount }}</text>
                </view>
              </view>

              <!-- 消息信息 -->
              <view class="message-info">
                <view class="message-header">
                  <text class="nickname">{{ item.nickname }}</text>
                  <text class="time">{{ item.time }}</text>
                </view>
                <view class="message-preview">
                  <text class="preview-text">{{ item.lastMessage }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import authService from '@/utils/authService'

export default {
  name: 'Messages',
  data() {
    return {
      messageList: [],
      loading: false,
      currentUser: null,
      
      // 虚拟列表相关
      itemHeight: 150, // 每个消息项的高度(rpx)
      containerHeight: 0, // 容器高度
      scrollTop: 0, // 滚动位置
      visibleCount: 0, // 可视区域显示的项目数量
      bufferSize: 3 // 缓冲区大小
    }
  },
  computed: {
    // 总高度
    totalHeight() {
      return this.messageList.length * this.itemHeight;
    },
    
    // 开始索引
    startIndex() {
      const index = Math.floor(this.scrollTop / this.itemHeight);
      return Math.max(0, index - this.bufferSize);
    },
    
    // 结束索引
    endIndex() {
      const index = this.startIndex + this.visibleCount + this.bufferSize * 2;
      return Math.min(this.messageList.length, index);
    },
    
    // 可视区域的消息列表
    visibleMessages() {
      return this.messageList.slice(this.startIndex, this.endIndex);
    },
    
    // 偏移量
    offsetY() {
      return this.startIndex * this.itemHeight;
    }
  },
  onLoad() {
    this.currentUser = authService.getCurrentUser();
    this.initVirtualList();
    this.loadConversations();
  },
  onShow() {
    // 页面显示时刷新消息列表
    this.loadConversations();
  },
  onPullDownRefresh() {
    this.refreshData();
  },
  methods: {
    // 初始化虚拟列表
    initVirtualList() {
      // 获取系统信息计算容器高度
      const systemInfo = uni.getSystemInfoSync();
      // 减去导航栏高度，大约120rpx
      this.containerHeight = (systemInfo.windowHeight * 750 / systemInfo.windowWidth) - 120;
      // 计算可视区域能显示的项目数量
      this.visibleCount = Math.ceil(this.containerHeight / this.itemHeight) + 1;
    },
    
    // 滚动事件处理
    onScroll(e) {
      this.scrollTop = e.detail.scrollTop;
    },
    
    // 刷新数据
    refreshData() {
      this.scrollTop = 0; // 重置滚动位置
      this.loadConversations();
      uni.stopPullDownRefresh();
    },

    // 加载聊天会话列表 - 连接真实数据库
    async loadConversations() {
      if (!this.currentUser) {
        uni.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      this.loading = true;
      try {
        const response = await uni.request({
          url: 'http://localhost:3000/api/chat/conversations',
          method: 'GET',
          data: {
            userId: this.currentUser.id
          },
          header: {
            'Authorization': `Bearer ${authService.getToken()}`
          }
        });

        if (response.data && response.data.success) {
          // 格式化会话数据为消息列表格式
          this.messageList = response.data.data.conversations.map(conv => ({
            id: conv.friendId,
            friendId: conv.friendId,
            nickname: conv.friendInfo.nickname,
            avatar: conv.friendInfo.avatar || '/static/img/default-avatar.png',
            lastMessage: conv.lastMessage ? 
              (conv.lastMessage.fromSelf ? `我: ${conv.lastMessage.content}` : conv.lastMessage.content) : 
              '暂无消息',
            time: this.formatTime(conv.lastMessage?.timestamp),
            unreadCount: conv.unreadCount,
            lastInteractionAt: conv.lastInteractionAt
          }));

          console.log(`加载了 ${this.messageList.length} 个聊天会话`);
        } else {
          throw new Error(response.data?.message || '加载失败');
        }
      } catch (error) {
        console.error('加载聊天会话失败:', error);
        
        // 如果后端连接失败，显示提示
        if (this.messageList.length === 0) {
          uni.showToast({
            title: '暂无聊天记录',
            icon: 'none'
          });
        }
      } finally {
        this.loading = false;
      }
    },

    // 返回上一页
    goBack() {
      uni.navigateBack()
    },

    // 添加新聊天 - 跳转到好友列表
    addNewChat() {
      uni.navigateTo({
        url: '/pages/mine/friendList'
      });
    },

    // 打开聊天页面 - 跳转到真实聊天页面
    openChat(item) {
      // 清除未读数（本地显示）
      item.unreadCount = 0;
      
      // 跳转到好友聊天页面
      uni.navigateTo({
        url: `/pages/mine/friendChatClean?friendId=${item.friendId}&friendName=${encodeURIComponent(item.nickname)}&friendAvatar=${encodeURIComponent(item.avatar)}`
      });
    },

    // 格式化时间显示
    formatTime(timestamp) {
      if (!timestamp) return '';
      
      try {
        const time = new Date(timestamp);
        const now = new Date();
        const diff = now - time;
        
        if (diff < 60000) { // 1分钟内
          return '刚刚';
        } else if (diff < 3600000) { // 1小时内
          return `${Math.floor(diff / 60000)}分钟前`;
        } else if (time.toDateString() === now.toDateString()) { // 今天
          return time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 86400000) { // 昨天
          return '昨天';
        } else {
          return time.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
        }
      } catch (error) {
        return '';
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.messages-page {
  height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
}

// 自定义导航栏
.custom-navbar {
  background: #ffffff;
  padding-top: var(--status-bar-height);
  border-bottom: 1px solid #f0f0f0;
  
  .navbar-content {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 15px;
    
    .navbar-left,
    .navbar-right {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      transition: background-color 0.3s;
      
      &:active {
        background-color: rgba(0, 0, 0, 0.1);
      }
    }
    
    .navbar-title {
      color: #000000;
      font-size: 18px;
      font-weight: 600;
    }
  }
}

// 虚拟列表容器
.virtual-list-container {
  flex: 1;
  overflow-y: auto;
  background-color: #ffffff;
}

// 加载状态
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
  
  .loading-spinner {
    width: 60rpx;
    height: 60rpx;
    margin-bottom: 20rpx;
    
    .spinner-ring {
      width: 100%;
      height: 100%;
      border: 4rpx solid #f3f3f3;
      border-top: 4rpx solid #007AFF;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }
  
  .loading-text {
    color: #666666;
    font-size: 28rpx;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 60rpx;
  
  .empty-icon {
    margin-bottom: 40rpx;
    
    .empty-message {
      width: 120rpx;
      height: 120rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .message-bubble {
        width: 80rpx;
        height: 50rpx;
        background-color: #f0f0f0;
        border-radius: 20rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8rpx;
        
        .bubble-dot {
          width: 8rpx;
          height: 8rpx;
          background-color: #cccccc;
          border-radius: 50%;
          animation: bubble-pulse 1.5s ease-in-out infinite;
          
          &:nth-child(2) {
            animation-delay: 0.3s;
          }
          
          &:nth-child(3) {
            animation-delay: 0.6s;
          }
        }
      }
    }
  }
  
  .empty-text {
    font-size: 32rpx;
    color: #333333;
    margin-bottom: 16rpx;
    font-weight: 500;
  }
  
  .empty-desc {
    font-size: 28rpx;
    color: #999999;
    margin-bottom: 60rpx;
  }
  
  .add-chat-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 24rpx 60rpx;
    border-radius: 50rpx;
    
    .btn-text {
      font-size: 28rpx;
      font-weight: 500;
    }
  }
}

@keyframes bubble-pulse {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  30% {
    opacity: 1;
    transform: scale(1.2);
  }
}

// 虚拟列表
.virtual-list {
  position: relative;
  
  .virtual-placeholder {
    width: 100%;
  }
  
  .virtual-viewport {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }
}

// 消息项
.message-item {
  border-bottom: 1px solid #f5f5f5;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:active {
    background-color: #f8f8f8;
  }
}

.message-content {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  position: relative;
  height: 75px; // 固定高度，对应itemHeight: 150rpx
}

// 头像容器
.avatar-container {
  margin-right: 12px;
  position: relative;
  
  .avatar {
    width: 50px;
    height: 50px;
    border-radius: 25px;
    background-color: #f0f0f0;
  }
}

// 消息信息
.message-info {
  flex: 1;
  min-width: 0;
  
  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    
    .nickname {
      font-size: 16px;
      font-weight: 500;
      color: #333333;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .time {
      font-size: 12px;
      color: #999999;
      margin-left: 10px;
      flex-shrink: 0;
    }
  }
  
  .message-preview {
    .preview-text {
      font-size: 14px;
      color: #666666;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

// 未读消息提示
.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #ff4757;
  border-radius: 10px;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border: 2px solid #ffffff;
  
  .unread-count {
    color: #ffffff;
    font-size: 12px;
    font-weight: 500;
    padding: 0 6px;
  }
}
</style>