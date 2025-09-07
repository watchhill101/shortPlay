<template>
  <view class="filter-page">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="back-btn" @click="goBack">‹</view>
      <view class="title">筛选</view>
      <view class="reset-btn" @click="resetFilters">重置</view>
    </view>

    <!-- 筛选选项区域 -->
    <view class="filter-options-area">
      <!-- 分类筛选 -->
      <view class="filter-section">
        <scroll-view class="tags-scroll-container" scroll-x="true" :show-scrollbar="false">
          <view class="tags-wrapper">
            <view class="tag" :class="{ active: selectedClassifier === 'all' }" @click="selectClassifier('all')">
              全部背景
            </view>
            <view
              v-for="item in filterOptions.classifiers"
              :key="item._id"
              class="tag"
              :class="{ active: selectedClassifier === item._id }"
              @click="selectClassifier(item._id)"
            >
              {{ item.name }}
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 标签筛选 -->
      <view class="filter-section">
        <scroll-view class="tags-scroll-container" scroll-x="true" :show-scrollbar="false">
          <view class="tags-wrapper">
            <view class="tag" :class="{ active: selectedTags.length === 0 }" @click="resetSelectedTags">全部主题</view>
            <view
              v-for="tag in filterOptions.tags"
              :key="tag"
              class="tag"
              :class="{ active: selectedTags.includes(tag) }"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 上线时间筛选 -->
      <view class="filter-section">
        <scroll-view class="tags-scroll-container" scroll-x="true" :show-scrollbar="false">
          <view class="tags-wrapper">
            <view
              v-for="item in filterOptions.timeOptions"
              :key="item.value"
              class="tag"
              :class="{ active: selectedDateRange === item.value }"
              @click="selectDateRange(item.value)"
            >
              {{ item.label }}
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 排序方式 -->
      <view class="filter-section">
        <scroll-view class="tags-scroll-container" scroll-x="true" :show-scrollbar="false">
          <view class="tags-wrapper">
            <view class="tag" :class="{ active: sortBy === 'default' }" @click="selectSortBy('default')">全部推荐</view>
            <view class="tag" :class="{ active: sortBy === 'createdAt' }" @click="selectSortBy('createdAt')">最新</view>
            <view class="tag" :class="{ active: sortBy === 'totalPlayCount' }" @click="selectSortBy('totalPlayCount')">
              最热
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 分隔线 -->
    <view class="divider"></view>

    <!-- 筛选结果区域 -->
    <scroll-view class="results-container" scroll-y="true" @scrolltolower="loadMoreCollections">
      <view class="results-area">
        <view class="results-grid">
          <!-- 加载状态骨架屏 -->
          <view v-if="isLoading && collections.length === 0" class="skeleton-container">
            <view v-for="n in 6" :key="'skeleton-' + n" class="skeleton-item">
              <view class="skeleton-image"></view>
              <view class="skeleton-title"></view>
              <view class="skeleton-brief"></view>
            </view>
          </view>

          <!-- 无数据状态 -->
          <view v-else-if="!isLoading && collections.length === 0" class="empty-state">
            <view class="empty-icon">📱</view>
            <view class="empty-text">暂无作品</view>
            <view class="empty-tip">试试调整筛选条件</view>
          </view>

          <!-- 合集列表 -->
          <template v-else>
            <view v-for="item in collections" :key="item._id" class="playlet" @click="toPlayletDetail(item)">
              <view class="cover">
                <image :src="item.image" mode="aspectFill" class="goods-img" @error="onImageError"></image>
              </view>
              <view class="goods-info">
                <view class="title">{{ item.title }}</view>
                <view class="brief">{{ item.brief }}</view>
              </view>
            </view>

            <!-- 加载更多的骨架屏 -->
            <view v-if="isLoading && collections.length > 0" class="skeleton-container">
              <view v-for="n in 2" :key="'loading-' + n" class="skeleton-item">
                <view class="skeleton-image"></view>
                <view class="skeleton-title"></view>
                <view class="skeleton-brief"></view>
              </view>
            </view>

            <!-- 没有更多数据提示 -->
            <view v-if="!hasMore && collections.length > 0" class="no-more">
              <view class="no-more-text">— 已显示全部 —</view>
            </view>
          </template>
        </view>
      </view>
    </scroll-view>

    <!-- 确认按钮 -->
    <view class="confirm-btn-container">
      <view class="confirm-btn" @click="applyFilters">查看{{ searchResultCount }}部作品</view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import http from '../../utils/request.js';
import { getAssetBaseURL } from '../../config/index.js';

const assetBaseURL = getAssetBaseURL();

const filterOptions = reactive({
  classifiers: [],
  tags: [],
  timeOptions: [],
});

// 用户选择的筛选条件
const selectedClassifier = ref('all');
const selectedTags = ref([]);
const selectedDateRange = ref('all');
const sortBy = ref('default');

// 筛选结果相关
const collections = ref([]);
const isLoading = ref(true);
const page = ref(1);
const pageSize = 10;
const hasMore = ref(true);
const searchResultCount = ref(0);

onLoad(() => {
  fetchFilterOptions();
  fetchCollections(true); // 初始加载第一页数据
});

const buildQueryParams = (currentPage, limit) => {
  const params = {
    classifier: selectedClassifier.value,
    tags: selectedTags.value.join(','),
    dateRange: selectedDateRange.value,
    sortBy: sortBy.value === 'default' ? 'createdAt' : sortBy.value,
    page: currentPage,
    pageSize: limit,
  };
  // 清理空参数
  Object.keys(params).forEach(key => {
    if (params[key] === 'all' || params[key] === '' || params[key] === undefined) {
      delete params[key];
    }
  });
  return params;
};

const fetchCollections = async (reset = false) => {
  if (reset) {
    page.value = 1;
    collections.value = [];
    hasMore.value = true;
  }

  isLoading.value = true;

  const params = buildQueryParams(page.value, pageSize);
  console.log('🔄 开始获取合集数据，参数:', params);

  try {
    const response = await http.get('/collection', params);
    console.log('📡 合集数据响应:', response);

    if (response.statusCode === 200 && response.data.success) {
      const newCollections = response.data.data;
      searchResultCount.value = response.data.pagination.total;

      console.log(`✅ 成功获取 ${newCollections.length} 个合集，总数：${searchResultCount.value}`);

      const processedCollections = newCollections.map(item => processCollectionItem(item));

      if (reset) {
        collections.value = processedCollections;
      } else {
        collections.value = [...collections.value, ...processedCollections];
      }

      if (newCollections.length < pageSize) {
        hasMore.value = false;
      }

      page.value++;
      console.log('📊 处理后的合集数量:', collections.value.length);
    } else {
      console.error('❌ 合集数据响应异常:', response);
    }
  } catch (error) {
    console.error('❌ 获取合集数据失败:', error);
    hasMore.value = false;
  } finally {
    isLoading.value = false;
  }
};

const processCollectionItem = item => {
  return {
    ...item,
    brief: generateBrief(item),
    image: item.coverImage ? `${assetBaseURL}${item.coverImage}` : '',
  };
};

const generateBrief = item => {
  const type = item.classifier && item.classifier.name ? item.classifier.name : '其他';
  const playCount = formatNumber(item.totalPlayCount || 0);
  const collectCount = formatNumber(item.collectCount || 0);
  return `${type} · ${playCount}播放 · ${collectCount}收藏`;
};

const formatNumber = num => {
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toString();
};

const loadMoreCollections = () => {
  if (hasMore.value && !isLoading.value) {
    fetchCollections();
  }
};

const fetchFilterOptions = async () => {
  try {
    console.log('Fetching filter options...');
    const response = await http.get('/filter/options');
    if (response.statusCode === 200 && response.data.success) {
      Object.assign(filterOptions, response.data.data);
      console.log('Filter options loaded:', filterOptions);
    }
  } catch (error) {
    console.error('Failed to fetch filter options:', error);
  }
};

const goBack = () => {
  uni.navigateBack();
};

const resetFilters = () => {
  selectedClassifier.value = 'all';
  selectedTags.value = [];
  selectedDateRange.value = 'all';
  sortBy.value = 'default';
  fetchCollections(true);
  uni.showToast({ title: '已重置', icon: 'none' });
};

const selectClassifier = id => {
  selectedClassifier.value = id;
  fetchCollections(true);
};

const resetSelectedTags = () => {
  selectedTags.value = [];
  fetchCollections(true);
};

const toggleTag = tag => {
  const index = selectedTags.value.indexOf(tag);
  if (index > -1) {
    selectedTags.value.splice(index, 1);
  } else {
    selectedTags.value.push(tag);
  }
  fetchCollections(true);
};

const selectDateRange = value => {
  selectedDateRange.value = value;
  fetchCollections(true);
};

const selectSortBy = value => {
  sortBy.value = value;
  fetchCollections(true);
};

const applyFilters = () => {
  uni.showToast({
    title: `已应用筛选`,
    icon: 'none',
  });
};

const toPlayletDetail = item => {
  uni.navigateTo({
    url: '/pages/playlet/detail?playletId=' + item._id,
  });
};

const onImageError = e => {
  console.log('图片加载失败:', e);
};
</script>

<style scoped lang="scss">
.filter-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #0e0f0f;
  color: #fff;
  overflow: hidden;
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  padding-top: var(--status-bar-height);
  background-color: #1a1a1a;
  .back-btn {
    font-size: 40rpx;
    width: 100rpx;
  }
  .title {
    font-size: 32rpx;
    font-weight: 600;
  }
  .reset-btn {
    font-size: 28rpx;
    color: #999;
    width: 100rpx;
    text-align: right;
  }
}

.filter-options-area {
  padding: 20rpx;
  background-color: #0e0f0f;
  border-bottom: 1rpx solid #2a2a2a;
}

.filter-section {
  margin-bottom: 40rpx;
  .section-title {
    font-size: 30rpx;
    font-weight: 500;
    margin-bottom: 20rpx;
    color: #e0e0e0;
  }
}

.tags-scroll-container {
  width: 100%;
  white-space: nowrap;
}

.tags-wrapper {
  display: inline-flex;
  gap: 20rpx;
  padding-right: 20rpx; /* 保证最后一个标签不被截断 */
}

.tag {
  padding: 12rpx 24rpx;
  background-color: transparent;
  border-radius: 30rpx;
  font-size: 26rpx;
  transition: all 0.2s ease;
  border: 1rpx solid transparent;
  color: #e0e0e0;

  &.active {
    background-color: rgba(255, 107, 53, 0.15);
    color: #ff6b35;
    border-color: transparent;
    font-weight: 500;
  }
}

.divider {
  height: 20rpx;
  background-color: #0e0f0f;
  border-top: 1rpx solid #2a2a2a;
  border-bottom: 1rpx solid #2a2a2a;
}

.results-area {
  padding: 30rpx 20rpx;
}

.results-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.playlet {
  display: flex;
  flex-direction: column;
  width: 49%;
  margin-bottom: 30rpx;
  border-radius: 12rpx;
  background: #1e1e1e;
  padding: 15rpx;
  min-height: 500rpx;

  .cover {
    width: 100%;
    height: 380rpx;
    position: relative;
    .goods-img {
      width: 100%;
      height: 100%;
      border-radius: 8rpx;
      background-color: #333;
    }
  }
  .goods-info {
    display: flex;
    flex-direction: column;
    margin-top: 15rpx;
    width: 100%;
    flex: 1;
    .title {
      width: 100%;
      font-size: 28rpx;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #ffffff;
      margin-bottom: 10rpx;
    }
    .brief {
      width: 100%;
      font-size: 24rpx;
      color: #b0b0b0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.empty-state {
  padding: 100rpx 0;
  text-align: center;
  color: #666;
  font-size: 28rpx;
}

.skeleton-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.skeleton-item {
  display: flex;
  flex-direction: column;
  width: 49%;
  margin-bottom: 30rpx;
  border-radius: 12rpx;
  background: #1e1e1e;
  padding: 15rpx;
  min-height: 500rpx;
}

.skeleton-image {
  width: 100%;
  height: 380rpx;
  border-radius: 8rpx;
  background: #2a2a2a;
}

.skeleton-title {
  margin-top: 15rpx;
  height: 28rpx;
  width: 80%;
  background: #2a2a2a;
  border-radius: 4rpx;
  margin-bottom: 10rpx;
}

.skeleton-brief {
  height: 24rpx;
  width: 100%;
  background: #2a2a2a;
  border-radius: 4rpx;
}

.confirm-btn-container {
  padding: 20rpx;
  background-color: #1a1a1a;
  border-top: 1rpx solid #333;
}

.confirm-btn {
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background-color: #ff6b35;
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.results-container {
  flex: 1;
  background-color: #0e0f0f;
}

.divider {
  height: 20rpx;
  background-color: #0e0f0f;
  border-top: 1rpx solid #2a2a2a;
  border-bottom: 1rpx solid #2a2a2a;
}

.results-area {
  padding: 30rpx 20rpx;
}

.results-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.empty-state {
  width: 100%;
  padding: 100rpx 0;
  text-align: center;
  color: #666;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.empty-tip {
  font-size: 24rpx;
  color: #999;
}

.no-more {
  width: 100%;
  text-align: center;
  padding: 40rpx 0;
}

.no-more-text {
  font-size: 24rpx;
  color: #666;
}
</style>
