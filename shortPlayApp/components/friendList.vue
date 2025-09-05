<template>
  <view class="friend-list-component">
    <!-- 搜索框 -->
    <view class="search-section">
      <u-search placeholder="搜索好友" v-model="searchKeyword" @custom="onSearch" @clear="onSearchClear"></u-search>
    </view>
    <!-- 虚拟列表容器 -->
    <scroll-view class="virtual-list-container" scroll-y @scroll="onScroll" :scroll-top="scrollTop">
      <view v-if="loading" class="loading-state">
        <u-loading-icon></u-loading-icon>
      </view>
      <view v-else-if="visibleFriends.length === 0" class="empty-state">
        <u-empty text="暂无好友" icon="/static/img/empty-friends.png"></u-empty>
      </view>
      <view v-else class="virtual-list">
        <view class="virtual-placeholder" :style="{ height: totalHeight + 'px' }"></view>
        <view class="virtual-viewport" :style="{ transform: `translateY(${offsetY}px)` }">
          <view v-for="friend in visibleFriends" :key="friend._id" class="friend-item" @click="goToFriendChat(friend)">
            <view class="friend-avatar">
              <image :src="friend.friendInfo.avatar || '/static/img/default-avatar.png'" class="avatar-img"></image>
            </view>
            <view class="friend-info">
              <view class="friend-name">
                {{ friend.remarkName || friend.friendInfo.nickname }}
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import tokenManager from '@/utils/tokenManager';
import friendService from '@/utils/friendService';

const friendList = ref([]);
const searchKeyword = ref('');
const loading = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);
const pageSize = 20;
const currentUser = ref(null);
const itemHeight = ref(60);
const containerHeight = ref(0);
const scrollTop = ref(0);
const visibleCount = ref(0);
const bufferSize = ref(5);
let searchTimer = null;

const totalHeight = computed(() => friendList.value.length * itemHeight.value);
const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / itemHeight.value);
  return Math.max(0, index - bufferSize.value);
});
const endIndex = computed(() => {
  const index = startIndex.value + visibleCount.value + bufferSize.value * 2;
  return Math.min(friendList.value.length, index);
});
const visibleFriends = computed(() => friendList.value.slice(startIndex.value, endIndex.value));
const offsetY = computed(() => startIndex.value * itemHeight.value);

onMounted(() => {
  currentUser.value = tokenManager.getUserInfo();
  initVirtualList();
  loadFriendList();
});

const initVirtualList = () => {
  const systemInfo = uni.getSystemInfoSync();
  containerHeight.value = systemInfo.windowHeight - 50; // 减去搜索框高度
  visibleCount.value = Math.ceil(containerHeight.value / itemHeight.value);
};

const onScroll = e => {
  scrollTop.value = e.detail.scrollTop;
  if (e.detail.scrollTop + containerHeight.value > totalHeight.value - 200 && hasMore.value && !loading.value) {
    loadMoreFriends();
  }
};

const loadFriendList = async (isRefresh = false) => {
  if (loading.value) return;
  loading.value = true;
  if (isRefresh) {
    currentPage.value = 1;
    friendList.value = [];
    hasMore.value = true;
  }

  try {
    const response = await friendService.getFriendList(currentUser.value.id, {
      page: currentPage.value,
      limit: pageSize,
      search: searchKeyword.value,
    });
    if (response.success) {
      const newFriends = response.data.friends;
      friendList.value = isRefresh ? newFriends : [...friendList.value, ...newFriends];
      hasMore.value = newFriends.length === pageSize;
    }
  } catch (error) {
    console.error('加载好友列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const loadMoreFriends = () => {
  if (hasMore.value) {
    currentPage.value++;
    loadFriendList();
  }
};

const onSearch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadFriendList(true);
  }, 300);
};

const onSearchClear = () => {
  searchKeyword.value = '';
  loadFriendList(true);
};

const goToFriendChat = friend => {
  uni.navigateTo({
    url: `/pages/chat/friendChatClean?friendId=${friend.friendInfo._id}&friendName=${friend.friendInfo.nickname}`,
  });
};
</script>

<style scoped>
.friend-list-component {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.search-section {
  padding: 10px;
  background-color: #fff;
}
.virtual-list-container {
  flex: 1;
  overflow-y: auto;
}
.friend-item {
  display: flex;
  align-items: center;
  padding: 10px;
  height: 60px;
  border-bottom: 1px solid #eee;
}
.avatar-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
}
.friend-name {
  font-size: 16px;
}
.loading-state,
.empty-state {
  padding-top: 50px;
  text-align: center;
}
.virtual-placeholder {
  width: 100%;
  pointer-events: none;
}
.virtual-viewport {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  will-change: transform;
}
</style>
