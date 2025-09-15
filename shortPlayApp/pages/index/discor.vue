<template>
  <scroll-view id="containerId" scroll-y="" style="height: 100%" @scrolltolower="toLoadMorePlaylet()">
    <view class="maincontainer">
      <view class="content">
        <!-- 搜索框模块 -->
        <view class="search-module">
          <view class="search-container">
            <view class="search-box" @click="goToSearchPage">
              <view class="search-placeholder" :class="{ animating: isPlaceholderAnimating }">
                {{ currentPlaceholder }}
              </view>
            </view>
          </view>
        </view>

        <!-- 功能按钮区域 -->
        <view class="function-module">
          <view class="function-buttons">
            <view
              class="function-btn"
              v-for="(func, index) in functionButtons"
              :key="index"
              @click="onFunctionClick(func)"
            >
              <view class="btn-icon" :class="'icon-' + func.icon"></view>
              <view class="btn-text">{{ func.name }}</view>
            </view>
          </view>
        </view>

        <!-- 搜索结果显示 -->
        <view v-if="searchKeyword && searchResults.length > 0" class="search-results">
          <view class="dfbox">
            <view class="title pt10">🔍 搜索结果 ({{ searchResults.length }})</view>
            <view class="search-tip" @click="clearSearch">清除</view>
          </view>

          <view class="item">
            <view class="playlet" v-for="(item, index) in searchResults" :keys="index" @tap="toPalyletDetail(item)">
              <view class="cover">
                <image
                  :src="item.image"
                  class="goods-img"
                  mode="scaleToFill"
                  @error="onImageError"
                  @load="onImageLoad"
                ></image>
              </view>

              <view class="goods-info flex-1">
                <view class="title">{{ item.title }}</view>
                <view class="brief">{{ item.brief }}</view>
              </view>
            </view>

            <view v-if="searchResults.length % 2 != 0" class="playlet-empty"></view>
          </view>
        </view>

        <!-- 搜索中状态 -->
        <view v-if="isSearching" class="search-loading">
          <view class="loading-text">🔍 搜索中...</view>
        </view>

        <!-- 无搜索结果 -->
        <view v-if="searchKeyword && !isSearching && searchResults.length === 0" class="no-search-results">
          <view class="no-results-text">😔 未找到相关短剧</view>
          <view class="no-results-tip">试试其他关键词吧</view>
        </view>

        <!--短剧推荐列表-->
        <view v-if="!searchKeyword" class="playlet-recommend">
          <!-- 骨架屏 -->
          <view v-if="isInitialLoading && playletRecommends.length === 0" class="skeleton-container">
            <view class="skeleton-item" v-for="n in 6" :key="n">
              <view class="skeleton-image"></view>
              <view class="skeleton-content">
                <view class="skeleton-title"></view>
                <view class="skeleton-brief"></view>
              </view>
            </view>
          </view>

          <!-- 错误状态 -->
          <view v-else-if="loadingError && playletRecommends.length === 0" class="error-container">
            <view class="error-icon">⚠️</view>
            <view class="error-message">{{ loadingError }}</view>
            <view class="error-retry" @click="retryLoadData">重新加载</view>
          </view>

          <view class="item" v-else>
            <view class="playlet" v-for="(item, index) in playletRecommends" :keys="index" @tap="toPalyletDetail(item)">
              <view class="cover">
                <image
                  :src="item.image"
                  class="goods-img"
                  mode="scaleToFill"
                  @error="onImageError"
                  @load="onImageLoad"
                ></image>
              </view>

              <view class="goods-info flex-1">
                <view class="title">{{ item.title }}</view>
                <view class="brief">{{ item.brief }}</view>
              </view>
            </view>

            <view v-if="playletRecommends.length % 2 != 0" class="playlet-empty"></view>
          </view>
        </view>
      </view>

      <!-- tabbar 占位 -->

      <view style="height: (50px + env(safe-area-inset-bottom) / 2); min-height: 100rpx"></view>
    </view>
  </scroll-view>
</template>

<script>
import { getCollections, searchCollections } from '@/api/collection.js';
import { getAssetBaseURL } from '@/config/index.js';

export default {
  components: {},

  data() {
    return {
      meUni: uni,

      //搜索功能数据
      searchKeyword: '',
      searchResults: [],
      isSearching: false,

      functionButtons: [
        { id: 'filter', name: '筛选', icon: 'filter' },
        { id: 'ranking', name: '排行榜', icon: 'ranking' },
        { id: 'newplay', name: '新剧', icon: 'play' },
        { id: 'booking', name: '预约', icon: 'bookmark' },
      ],

      //推荐短剧
      playletRecommends: [],

      // 加载状态管理
      loading: false,
      loaded: false,
      isInitialLoading: true, // 首次加载状态
      loadingError: null, // 错误状态

      // 缓存管理
      cacheData: null,
      cacheTimestamp: null,
      cacheExpireTime: 5 * 60 * 1000, // 5分钟缓存过期时间

      // 搜索框轮播
      searchPlaceholders: [], // 轮播的短剧名列表
      currentPlaceholderIndex: 0, // 当前显示的索引
      placeholderTimer: null, // 轮播定时器
      isPlaceholderAnimating: false, // 动画状态
    };
  },

  computed: {
    // 当前显示的搜索占位符
    currentPlaceholder() {
      if (this.searchPlaceholders.length === 0) {
        return '搜索短剧名称、演员、类型...';
      }
      const currentDrama = this.searchPlaceholders[this.currentPlaceholderIndex];
      return `${currentDrama}`;
    },
  },

  created() {
    let me = this;

    // 先加载本地缓存
    me.loadCacheFromStorage();

    // 然后初始化页面数据
    me.initPageData();
  },

  onReady() {},

  async toPullDownRefresh() {
    let me = this;

    if (!me.loading) {
      // 清除缓存，强制刷新
      me.clearCache();
      me.loadingError = null;

      try {
        await me.initPageData();

        uni.showToast({
          title: '刷新成功',
          icon: 'success',
          duration: 1500,
        });
      } catch (error) {
        console.error('下拉刷新失败:', error);
      }
    }

    setTimeout(uni.stopPullDownRefresh, 500);
  },

  beforeUnmount() {
    let me = this;

    // 取消正在进行的请求
    if (me.requestController) {
      try {
        me.requestController.abort();
      } catch (error) {
        console.log('取消请求失败:', error);
      }
    }

    // 清理定时器等资源
    me.requestController = null;
    me.stopPlaceholderRotation();
  },

  onHide() {
    // 页面隐藏时停止轮播
    this.stopPlaceholderRotation();
  },

  onShow() {
    // 页面显示时重新开始轮播
    if (this.searchPlaceholders.length > 1) {
      this.startPlaceholderRotation();
    }
  },

  mounted: function () {
    let me = this;
  },

  methods: {
    async initPageData() {
      let me = this;

      // 检查缓存是否有效
      if (me.isCacheValid()) {
        console.log('📦 使用缓存数据');
        me.playletRecommends = me.cacheData;
        me.isInitialLoading = false;
        me.loaded = true;

        // 初始化搜索框轮播（使用缓存数据）
        me.initSearchPlaceholders(me.cacheData);

        // 如果缓存数据的图片URL可能过期，在后台更新
        me.validateCacheImages();
        return;
      }

      // 清除旧的错误状态
      me.loadingError = null;
      me.retryCount = 0;

      // 开始加载数据
      await me.playletQueryRecommend();
    },

    // 检查缓存是否有效
    isCacheValid() {
      if (!this.cacheData || !this.cacheTimestamp) {
        return false;
      }

      const now = Date.now();
      const isValid = now - this.cacheTimestamp < this.cacheExpireTime;

      if (!isValid) {
        console.log('📦 缓存已过期');
        this.clearCache();
      }

      return isValid;
    },

    // 清除缓存
    clearCache() {
      this.cacheData = null;
      this.cacheTimestamp = null;
      // 同时清除本地存储缓存
      try {
        uni.removeStorageSync('discor_cache_data');
        uni.removeStorageSync('discor_cache_timestamp');
      } catch (error) {
        console.error('清除本地缓存失败:', error);
      }
    },

    // 设置缓存
    setCache(data) {
      this.cacheData = data;
      this.cacheTimestamp = Date.now();

      // 同时保存到本地存储
      try {
        uni.setStorageSync('discor_cache_data', data);
        uni.setStorageSync('discor_cache_timestamp', this.cacheTimestamp);
      } catch (error) {
        console.error('保存本地缓存失败:', error);
      }
    },

    // 从本地存储加载缓存
    loadCacheFromStorage() {
      try {
        const cacheData = uni.getStorageSync('discor_cache_data');
        const cacheTimestamp = uni.getStorageSync('discor_cache_timestamp');

        if (cacheData && cacheTimestamp) {
          this.cacheData = cacheData;
          this.cacheTimestamp = cacheTimestamp;
          console.log('📦 从本地存储加载缓存');
        }
      } catch (error) {
        console.error('加载本地缓存失败:', error);
      }
    },

    // 重试加载数据
    async retryLoadData() {
      this.loadingError = null;
      this.retryCount = 0;
      await this.playletQueryRecommend();
    },

    toSearchGoods() {
      let me = this;
    },

    toLoadMorePlaylet() {
      let me = this;
    },

    //功能按钮点击
    onFunctionClick(func) {
      let me = this;
      console.log('点击功能按钮:', func.name);

      switch (func.id) {
        case 'filter':
          // me.showFilterOptions();
          uni.navigateTo({ url: '/pages/index/filter' });
          break;
        case 'newplay':
          me.goToNewPlays();
          break;
        case 'booking':
          me.goToBooking();
          break;
      }
    },

    // 显示筛选选项
    showFilterOptions() {
      uni.showActionSheet({
        itemList: ['按播放量排序', '按收藏量排序', '按更新时间排序', '按评分排序'],
        success: res => {
          console.log('选择了筛选项:', res.tapIndex);
          switch (res.tapIndex) {
            case 0:
              this.sortByPlayCount();
              break;
            case 1:
              this.sortByCollectCount();
              break;
            case 2:
              this.sortByUpdateTime();
              break;
            case 3:
              this.sortByRating();
              break;
          }
        },
      });
    },

    // 按播放量排序
    sortByPlayCount() {
      this.playletRecommends.sort((a, b) => {
        const aCount = parseInt(a.brief.match(/播放量: (\d+)/) ? a.brief.match(/播放量: (\d+)/)[1] : 0);
        const bCount = parseInt(b.brief.match(/播放量: (\d+)/) ? b.brief.match(/播放量: (\d+)/)[1] : 0);
        return bCount - aCount;
      });
      uni.showToast({ title: '已按播放量排序', icon: 'success' });
    },

    // 按收藏量排序
    sortByCollectCount() {
      this.playletRecommends.sort((a, b) => {
        const aCount = parseInt(a.brief.match(/收藏: (\d+)/) ? a.brief.match(/收藏: (\d+)/)[1] : 0);
        const bCount = parseInt(b.brief.match(/收藏: (\d+)/) ? b.brief.match(/收藏: (\d+)/)[1] : 0);
        return bCount - aCount;
      });
      uni.showToast({ title: '已按收藏量排序', icon: 'success' });
    },

    // 按更新时间排序
    sortByUpdateTime() {
      uni.showToast({ title: '按更新时间排序功能开发中', icon: 'none' });
    },

    // 按评分排序
    sortByRating() {
      uni.showToast({ title: '按评分排序功能开发中', icon: 'none' });
    },

    //跳转到排行榜
    goToRanking() {
      uni.showToast({
        title: '排行榜功能开发中',
        icon: 'none',
      });
    },

    //跳转到新剧
    goToNewPlays() {
      uni.showToast({
        title: '新剧功能开发中',
        icon: 'none',
      });
    },

    //跳转到预约
    goToBooking() {
      uni.showToast({
        title: '预约功能开发中',
        icon: 'none',
      });
    },

    // 获取短剧列表（优化版）
    async playletQueryRecommend() {
      let me = this;

      // 设置加载状态
      me.loading = true;
      me.isInitialLoading = me.playletRecommends.length === 0;
      me.loadingError = null;

      console.log('🔄 开始获取后端短剧数据...');

      try {
        // 使用新的API模块
        const response = await getCollections({
          page: 1, // 可以根据需要添加分页逻辑
          pageSize: 20, // 默认加载20个
        });
        const result = response.data; // uni.request返回的数据在data中

        if (result.success && result.data) {
          // 转换数据格式
          const processedData = me.processApiData(result.data);
          // 更新数据和状态
          me.playletRecommends = processedData;
          me.loaded = true;
          me.isInitialLoading = false;
          // 设置缓存
          me.setCache(processedData);
          // 初始化搜索框轮播
          me.initSearchPlaceholders(processedData);
          console.log('✅ 数据加载成功:', processedData.length, '条');
        } else {
          throw new Error(result.message || '获取数据失败');
        }
      } catch (error) {
        console.error('❌ 数据加载失败:', error);
        me.handleLoadError(error);
      } finally {
        me.loading = false;
      }
    },

    // 处理API数据
    processApiData(rawData) {
      // 使用新的配置函数获取资源基础URL
      const imageBaseUrl = getAssetBaseURL();

      console.log('🖼️ 使用图片基础URL:', imageBaseUrl);

      return rawData.map((item, index) => {
        let imageUrl = item.coverImage ? `${imageBaseUrl}${item.coverImage}` : this.getDefaultImage();

        // 临时修复可以保留，但更好的方式是修复数据源
        if (item.title === '国民奇谈') {
          imageUrl = 'https://videosdata.oss-cn-hongkong.aliyuncs.com/coverImage/guominqitan.jpg';
        }

        // 只打印前2个项目的详细信息，避免日志过多
        if (index < 2) {
          console.log(`🖼️ 处理图片URL [${index + 1}]:`);
          console.log('  - 标题:', item.title);
          console.log('  - 原始coverImage:', item.coverImage);
          console.log('  - imageBaseUrl:', imageBaseUrl);
          console.log('  - 最终URL:', imageUrl);
        }

        return {
          playletId: item._id,
          title: item.title || '未知标题',
          brief: this.generateBrief(item),
          image: imageUrl,
          smallImage: imageUrl,
          // 保留原始数据以备后用
          rawData: item,
        };
      });
    },

    // 生成简介
    generateBrief(item) {
      const type = item.classifier && item.classifier.name ? item.classifier.name : '其他';
      const playCount = this.formatNumber(item.totalPlayCount || 0);
      const collectCount = this.formatNumber(item.collectCount || 0);

      return `${type} · ${playCount}播放 · ${collectCount}收藏`;
    },

    // 格式化数字
    formatNumber(num) {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
      }
      return num.toString();
    },

    // 获取默认图片
    getDefaultImage() {
      return 'https://via.placeholder.com/200x150/cccccc/ffffff?text=暂无图片';
    },

    // 处理加载错误
    handleLoadError(error) {
      this.loadingError = error.message || '加载失败，请重试';
      this.isInitialLoading = false;

      // 如果没有缓存数据，显示空状态
      if (this.playletRecommends.length === 0) {
        console.log('❌ 加载失败且无缓存数据');
      }
    },

    // 延迟函数
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    // 验证缓存图片URL是否有效
    async validateCacheImages() {
      // 检查第一个图片是否能正常加载，如果不能则在后台刷新数据
      if (this.playletRecommends.length > 0) {
        const firstItem = this.playletRecommends[0];
        if (firstItem && firstItem.image && !firstItem.image.includes('placeholder')) {
          // 简单的图片可用性检查
          try {
            // 这里可以添加图片预加载检查
            console.log('📦 缓存图片验证:', firstItem.image);
          } catch (error) {
            console.log('📦 缓存图片可能失效，后台刷新数据');
            // 在后台静默刷新数据
            setTimeout(() => {
              this.playletQueryRecommend();
            }, 1000);
          }
        }
      }
    },

    // 图片加载成功
    onImageLoad(e) {
      const detail = e.detail || {};
      console.log('🖼️ 图片加载成功:', detail.src || 'success');
    },

    // 图片加载失败
    onImageError(e) {
      const detail = e.detail || {};
      console.error('🖼️ 图片加载失败:', detail.errMsg || e.errMsg || 'unknown error');

      // 在uni-app中，我们无法直接修改img的src
      // 图片错误会被默认图片CSS处理
      console.log('🖼️ 图片加载失败，将显示默认样式');
    },

    // 初始化搜索框轮播
    initSearchPlaceholders(playletData) {
      if (!playletData || playletData.length === 0) {
        console.log('🎭 没有数据，跳过搜索框轮播初始化');
        return;
      }

      // 提取短剧名称，取前10个
      this.searchPlaceholders = playletData.slice(0, 10).map(item => item.title);

      console.log('🎭 初始化搜索框轮播:', this.searchPlaceholders.length, '个短剧名');
      console.log('🎭 轮播内容:', this.searchPlaceholders);

      // 重置索引
      this.currentPlaceholderIndex = 0;

      // 开始轮播
      this.startPlaceholderRotation();
    },

    // 开始占位符轮播
    startPlaceholderRotation() {
      // 清除已有的定时器
      this.stopPlaceholderRotation();

      if (this.searchPlaceholders.length <= 1) {
        return;
      }

      // 每3秒切换一次
      this.placeholderTimer = setInterval(() => {
        this.rotatePlaceholder();
      }, 3000);

      console.log('🎭 搜索框轮播已启动');
    },

    // 停止占位符轮播
    stopPlaceholderRotation() {
      if (this.placeholderTimer) {
        clearInterval(this.placeholderTimer);
        this.placeholderTimer = null;
        console.log('🎭 搜索框轮播已停止');
      }
    },

    // 轮播到下一个占位符
    rotatePlaceholder() {
      if (this.searchPlaceholders.length === 0) {
        return;
      }

      // 触发动画
      this.isPlaceholderAnimating = true;

      // 150ms后切换文字，300ms后结束动画
      setTimeout(() => {
        this.currentPlaceholderIndex = (this.currentPlaceholderIndex + 1) % this.searchPlaceholders.length;
        console.log(
          '🎭 轮播切换:',
          this.currentPlaceholderIndex,
          this.searchPlaceholders[this.currentPlaceholderIndex]
        );

        setTimeout(() => {
          this.isPlaceholderAnimating = false;
        }, 150);
      }, 150);
    },

    // 搜索输入处理
    onSearchInput(e) {
      let me = this;
      me.searchKeyword = e.detail.value;

      // 防抖搜索
      clearTimeout(me.searchTimer);
      me.searchTimer = setTimeout(() => {
        if (me.searchKeyword.trim()) {
          me.performSearch();
        } else {
          me.clearSearchResults();
        }
      }, 500);
    },

    // 搜索确认
    onSearchConfirm() {
      let me = this;
      if (me.searchKeyword.trim()) {
        me.performSearch();
      }
    },

    // 执行搜索
    async performSearch() {
      let me = this;
      me.isSearching = true;

      console.log('🔍 开始搜索:', me.searchKeyword);

      try {
        const response = await searchCollections({ keyword: me.searchKeyword });
        const result = response.data;

        console.log(`✅ 搜索API成功`, result);
        if (result && result.success && result.data) {
          me.handleSearchResults(result.data);
        } else {
          // 如果API调用成功但没有数据，可以调用本地搜索作为降级
          me.searchInLocalData();
        }
      } catch (error) {
        console.error('❌ 搜索API失败:', error);
        // API失败时，降级到本地数据搜索
        me.searchInLocalData();
      } finally {
        me.isSearching = false;
      }
    },

    // 在本地数据中搜索（降级方案）
    searchInLocalData() {
      let me = this;
      const keyword = me.searchKeyword.toLowerCase();

      // 在推荐数据中搜索
      const searchResults = me.playletRecommends.filter(
        item => item.title.toLowerCase().includes(keyword) || (item.brief && item.brief.toLowerCase().includes(keyword))
      );

      me.searchResults = searchResults;
      me.isSearching = false;

      console.log('🔍 本地搜索结果:', searchResults);

      uni.showToast({
        title: `找到 ${searchResults.length} 个结果`,
        icon: 'none',
      });
    },

    // 处理搜索结果
    handleSearchResults(results) {
      let me = this;

      // 获取正确的图片基础URL
      const imageBaseUrl = getAssetBaseURL();

      // 转换搜索结果格式
      me.searchResults = results.map(item => {
        const imageUrl = item.coverImage ? `${imageBaseUrl}${item.coverImage}` : this.getDefaultImage();
        console.log('🔍 搜索结果图片URL:', item.title, '→', imageUrl);

        return {
          playletId: item._id,
          title: item.title,
          brief: `共${item.workCount}集 - 播放量: ${item.totalPlayCount} | 收藏: ${item.collectCount}`,
          image: imageUrl,
          smallImage: imageUrl,
        };
      });

      console.log('✅ 搜索结果处理完成:', me.searchResults.length, '条');

      uni.showToast({
        title: `找到 ${me.searchResults.length} 个结果`,
        icon: 'success',
      });
    },

    // 清除搜索
    clearSearch() {
      let me = this;
      me.searchKeyword = '';
      me.clearSearchResults();
    },

    // 清除搜索结果
    clearSearchResults() {
      let me = this;
      me.searchResults = [];
      me.isSearching = false;
    },

    // 跳转到搜索页面
    goToSearchPage() {
      uni.navigateTo({
        url: '/pages/search/index',
      });
    },

    //点击短剧详情

    toPalyletDetail(item) {
      let me = this;

      uni.navigateTo({
        url: '/pages/playlet/detail?playletId=' + item.playletId,
      });
    },
  },
};
</script>

<style scoped lang="scss">
.maincontainer {
  width: 100%;

  height: 100%;

  min-height: 100vh;

  background-color: #0e0f0fS;
}

.content {
  position: relative;

  border-radius: 30rpx 30rpx 0 0;

  margin-top: 10rpx;

  padding-left: 20rpx;

  padding-right: 20rpx;

  z-index: 1;
}

/* 搜索框模块样式 - iOS风格 */
.search-module {
  background: transparent;
  padding: 50rpx 20rpx 30rpx 20rpx;
  margin-bottom: 25rpx;
  margin-top: 40rpx;
}

.search-container {
  padding: 0;
}

.search-box {
  display: flex;
  align-items: center;
  background: rgba(118, 118, 128, 0.12);
  border-radius: 20rpx;
  padding: 16rpx 20rpx;
  border: none;
  transition: all 0.3s ease;
  backdrop-filter: blur(10rpx);
  cursor: pointer;
}

.search-box:active {
  background: rgba(118, 118, 128, 0.18);
  transform: scale(0.98);
}

.search-icon {
  width: 28rpx;
  height: 28rpx;
  margin-right: 16rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-icon::before {
  content: '';
  width: 20rpx;
  height: 20rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  position: absolute;
  top: 2rpx;
  left: 2rpx;
}

.search-icon::after {
  content: '';
  width: 8rpx;
  height: 3rpx;
  background: rgba(255, 255, 255, 0.6);
  position: absolute;
  bottom: 2rpx;
  right: 2rpx;
  transform: rotate(45deg);
  border-radius: 2rpx;
}

.search-placeholder {
  flex: 1;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
  user-select: none;
  pointer-events: none;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
}

.search-placeholder.animating {
  opacity: 0.3;
  transform: translateY(-5rpx);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.playlet-recommend {
  margin: 30rpx 20rpx 0 20rpx;

  padding: 10rpx 15rpx 20rpx 15rpx;

  border-radius: 20rpx;

  background: #1e1e1e;
}

.playlet-recommend .item {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30rpx;
}

.playlet-recommend .item .playlet-empty {
  display: none;
}

.playlet-recommend .item .playlet {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;
  margin-bottom: 0;
  border-radius: 20rpx;
  background: #2a2a2a;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.2);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;

  .cover {
    width: 100%;
    padding-top: 140%;
    position: relative;
    overflow: hidden;

    .goods-img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 0;
      object-fit: cover;
    }
  }

  .goods-info {
    display: flex;
    flex-direction: column;
    padding: 20rpx;
    margin-top: 0;
    width: 100%;
    flex: 1;
    justify-content: space-between;

    .title {
      width: 100%;
      font-size: 28rpx;
      font-weight: 600;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #ffffff;
      margin-bottom: 10rpx;
    }

    .brief {
      width: 100%;
      font-size: 24rpx;
      text-align: left;
      color: #b0b0b0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.5;
      flex: 1;
    }
  }
}

.playlet-recommend .item .playlet:active {
  transform: translateY(-5rpx);
  box-shadow: 0 12rpx 25rpx rgba(0, 0, 0, 0.3);
}

.dfbox {
  display: flex;

  align-items: center;

  justify-content: space-between;

  width: 100%;

  margin-bottom: 20rpx;

  .title {
    font-size: 38rpx;

    color: #a1a1a1;
  }
}

.xzback {
  width: 30rpx;

  height: 30rpx;

  z-index: 1;
}

.goods-swiper swiper {
  width: 100%;

  height: 400rpx;
}

.swiper-item {
  position: relative;

  height: 100%;

  display: flex;

  justify-content: center;

  .vicon {
    position: absolute;

    width: 50rpx;

    height: 50rpx;

    bottom: 10rpx;

    right: 10rpx;

    color: #000000;

    z-index: 10;
  }

  .goods-banner {
    width: 100%;
  }
}

/* 功能按钮模块样式 */
.function-module {
  background: #1a1a1a;
  padding: 25rpx 0;
  margin: 0 20rpx 15rpx 20rpx;
  border-radius: 20rpx;
}

/* 功能按钮样式 */
.function-buttons {
  display: flex;
  justify-content: space-around;
  padding: 0 20rpx;
}

.function-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 15rpx;
  flex: 1;
  border-radius: 15rpx;
  transition: all 0.3s ease;
}

.function-btn:active {
  background: rgba(255, 107, 53, 0.1);
  transform: scale(0.95);
}

.btn-icon {
  width: 40rpx;
  height: 40rpx;
  margin-bottom: 8rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 筛选图标 */
.icon-filter::before {
  content: '';
  width: 28rpx;
  height: 3rpx;
  background: #ffffff;
  position: absolute;
  border-radius: 2rpx;
  box-shadow:
    0 -8rpx 0 #ffffff,
    0 8rpx 0 #ffffff;
}

.icon-filter::after {
  content: '';
  width: 6rpx;
  height: 20rpx;
  background: #ffffff;
  position: absolute;
  right: 8rpx;
  border-radius: 3rpx;
}

/* 排行榜图标 */
.icon-ranking::before {
  content: '';
  width: 8rpx;
  height: 12rpx;
  background: #ffffff;
  position: absolute;
  left: 4rpx;
  bottom: 8rpx;
  border-radius: 2rpx;
  box-shadow:
    12rpx 4rpx 0 #ffffff,
    24rpx -4rpx 0 #ffffff;
}

.icon-ranking::after {
  content: '1';
  position: absolute;
  top: -2rpx;
  right: 2rpx;
  font-size: 16rpx;
  color: #ff6b35;
  font-weight: bold;
}

/* 播放图标 */
.icon-play::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 20rpx solid #ffffff;
  border-top: 12rpx solid transparent;
  border-bottom: 12rpx solid transparent;
  margin-left: 4rpx;
}

/* 书签图标 */
.icon-bookmark::before {
  content: '';
  width: 20rpx;
  height: 28rpx;
  background: #ffffff;
  position: absolute;
  border-radius: 4rpx 4rpx 0 0;
}

.icon-bookmark::after {
  content: '';
  width: 0;
  height: 0;
  border-left: 10rpx solid #0e0f0f;
  border-right: 10rpx solid #0e0f0f;
  border-top: 12rpx solid #0e0f0f;
  position: absolute;
  bottom: 6rpx;
}

.btn-text {
  font-size: 24rpx;
  color: #cccccc;
}

/* 搜索结果样式 */
.search-results {
  margin-top: 30rpx;
  padding: 10rpx 15rpx 20rpx 15rpx;
  border-radius: 10rpx 10rpx 0 0;
  background: #1e1e1e;
}

.search-results .item {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
}

.search-tip {
  font-size: 24rpx;
  color: #ff6b35;
  padding: 10rpx 20rpx;
  background: rgba(255, 107, 53, 0.1);
  border-radius: 20rpx;
  border: 1rpx solid #ff6b35;
}

/* 搜索状态样式 */
.search-loading {
  margin-top: 50rpx;
  text-align: center;
  padding: 60rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.6;
  }
}

.no-search-results {
  margin-top: 50rpx;
  text-align: center;
  padding: 60rpx 0;
}

.no-results-text {
  font-size: 32rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.no-results-tip {
  font-size: 24rpx;
  color: #999;
}

/* 骨架屏样式 */
.skeleton-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 20rpx;
}

.skeleton-item {
  display: flex;
  flex-direction: column;
  width: 49%;
  min-height: 550rpx;
  margin-bottom: 30rpx;
  padding: 15rpx;
  background: #2a2a2a;
  border-radius: 15rpx;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-image {
  width: 100%;
  height: 380rpx;
  background: linear-gradient(90deg, #333 25%, #444 50%, #333 75%);
  border-radius: 8rpx;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

.skeleton-content {
  width: 100%;
  margin-top: 15rpx;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.skeleton-title {
  height: 28rpx;
  background: linear-gradient(90deg, #333 25%, #444 50%, #333 75%);
  border-radius: 4rpx;
  width: 80%;
  margin-bottom: 15rpx;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

.skeleton-brief {
  height: 24rpx;
  background: linear-gradient(90deg, #333 25%, #444 50%, #333 75%);
  border-radius: 4rpx;
  width: 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.8;
  }

  50% {
    opacity: 0.6;
  }
}

@keyframes skeleton-shimmer {
  0% {
    background-position: -200rpx 0;
  }

  100% {
    background-position: 200rpx 0;
  }
}

/* 错误状态样式 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
  text-align: center;
}

.error-icon {
  font-size: 100rpx;
  margin-bottom: 30rpx;
}

.error-message {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
  line-height: 1.5;
}

.error-retry {
  background: #ff6b35;
  color: #ffffff;
  padding: 20rpx 40rpx;
  border-radius: 25rpx;
  font-size: 28rpx;
  cursor: pointer;
  transition: all 0.3s ease;
}

.error-retry:active {
  opacity: 0.8;
  transform: scale(0.95);
}

/* 加载状态优化 */
.playlet-recommend {
  min-height: 400rpx;
  position: relative;
}

/* 数据项淡入动画 */
.playlet {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 图片加载优化 */
.goods-img {
  transition: opacity 0.3s ease;
}

.goods-img[src=''],
.goods-img:not([src]) {
  opacity: 0.5;
  background: #333;
}

/* 图片加载失败的默认样式 */
.goods-img {
  background-color: #333;
  background-image: url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23333"/><text x="50" y="50" text-anchor="middle" dominant-baseline="middle" fill="%23666" font-size="12">图片</text></svg>');
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  min-height: 120rpx;
}
</style>
