<template>
  <view class="search-page">
    <!-- 搜索栏 -->
    <view class="search-header">
      <view class="search-container">
        <view class="search-box">
          <view class="search-icon"></view>
          <input
            class="search-input"
            type="text"
            v-model="searchKeyword"
            placeholder="搜索短剧名称、演员、类型..."
            @input="onSearchInput"
            @confirm="onSearchConfirm"
            confirm-type="search"
            focus
          />
          <view v-if="searchKeyword" class="search-clear" @click="clearSearch">✕</view>
        </view>
        <view class="search-btn" @click="performSearchAction">搜索</view>
      </view>
    </view>

    <!-- 搜索类型选择器 -->
    <view v-if="searchKeyword" class="search-type-selector">
      <view class="search-type-item" :class="{ active: searchType === 'all' }" @click="switchSearchType('all')">
        全部
      </view>
      <view class="search-type-item" :class="{ active: searchType === 'title' }" @click="switchSearchType('title')">
        剧名
      </view>
      <view class="search-type-item" :class="{ active: searchType === 'actor' }" @click="switchSearchType('actor')">
        演员
      </view>
      <view
        class="search-type-item"
        :class="{ active: searchType === 'category' }"
        @click="switchSearchType('category')"
      >
        类型
      </view>
    </view>

    <!-- 搜索建议 -->
    <view v-if="showSuggestions" class="search-suggestions">
      <!-- 演员建议 -->
      <view v-if="searchSuggestions.actors.length > 0" class="suggestion -section">
        <view class="suggestion-title">👤 演员</view>
        <view class="suggestion-list">
          <view
            class="suggestion-item"
            v-for="(actor, index) in searchSuggestions.actors"
            :key="'actor-' + index"
            @click="selectSuggestion(actor)"
          >
            <view class="suggestion-name">{{ actor.name }}</view>
            <view class="suggestion-count">{{ actor.count }}部作品</view>
          </view>
        </view>
      </view>

      <!-- 剧名建议 -->
      <view v-if="searchSuggestions.titles.length > 0" class="suggestion-section">
        <view class="suggestion-title">🎬 剧名</view>
        <view class="suggestion-list">
          <view
            class="suggestion-item"
            v-for="(title, index) in searchSuggestions.titles"
            :key="'title-' + index"
            @click="selectSuggestion(title)"
          >
            <view class="suggestion-name">{{ title.name }}</view>
            <view class="suggestion-count">{{ formatPlayCount(title.playCount) }}播放</view>
          </view>
        </view>
      </view>

      <!-- 分类建议 -->
      <view v-if="searchSuggestions.categories.length > 0" class="suggestion-section">
        <view class="suggestion-title">🏷️ 分类</view>
        <view class="suggestion-list">
          <view
            class="suggestion-item"
            v-for="(category, index) in searchSuggestions.categories"
            :key="'category-' + index"
            @click="selectSuggestion(category)"
          >
            <view class="suggestion-name">
              <text v-if="category.icon">{{ category.icon }}</text>
              {{ category.name }}
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索历史 -->
    <view v-if="!searchKeyword && searchHistory.length > 0" class="search-history">
      <view class="section-header">
        <view class="section-title">搜索历史</view>
        <view class="clear-history" @click="clearHistory">清空</view>
      </view>
      <view class="history-tags">
        <view class="history-tag" v-for="(item, index) in searchHistory" :key="index" @click="searchHistoryItem(item)">
          {{ item }}
        </view>
      </view>
    </view>

    <!-- 热门搜索 -->
    <view v-if="!searchKeyword" class="hot-search">
      <view class="section-header">
        <view class="section-title">热门搜索</view>
      </view>
      <view v-if="isLoadingHotSearch" class="loading-placeholder">
        <view class="loading-text">加载中...</view>
      </view>
      <view v-else class="hot-tags">
        <view class="hot-tag" v-for="(item, index) in hotSearchList" :key="index" @click="searchHotItem(item)">
          {{ item.name || item }}
        </view>
      </view>
    </view>

    <!-- 最热短剧 TOP3 -->
    <view v-if="!searchKeyword && hotPlaylets.length > 0" class="hot-playlets">
      <view class="section-header">
        <view class="section-title">🔥 最热短剧 TOP3</view>
      </view>
      <view class="hot-playlets-list">
        <view class="hot-playlet-item" v-for="(item, index) in hotPlaylets" :key="index" @click="toPlayletDetail(item)">
          <view class="item-cover">
            <image :src="item.image" class="cover-img" mode="aspectFill"></image>
            <!-- 排名徽章 -->
            <view class="rank-badge" :class="'rank-' + item.rank">
              {{ item.rank }}
            </view>
          </view>
          <view class="item-info">
            <view class="item-title">{{ item.title }}</view>
            <view class="item-brief">{{ item.brief }}</view>
            <view class="play-count">🔥 {{ formatPlayCount(item.totalPlayCount) }}</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索中状态 -->
    <view v-if="isSearching" class="search-loading">
      <view class="loading-text">🔍 搜索中...</view>
    </view>

    <!-- 搜索结果 -->
    <view v-if="searchKeyword && !isSearching && searchResults.length > 0" class="search-results">
      <view class="section-header">
        <view class="section-title">搜索结果 ({{ searchResults.length }})</view>
      </view>
      <view class="results-list">
        <view class="result-item" v-for="(item, index) in searchResults" :key="index" @click="toPlayletDetail(item)">
          <view class="item-cover">
            <image :src="item.image" class="cover-img" mode="aspectFill"></image>
          </view>
          <view class="item-info">
            <view class="item-title">{{ item.title }}</view>
            <view class="item-brief">{{ item.brief }}</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 无搜索结果 -->
    <view v-if="searchKeyword && !isSearching && searchResults.length === 0" class="no-results">
      <view class="no-results-icon">😔</view>
      <view class="no-results-text">未找到相关短剧</view>
      <view class="no-results-tip">试试其他关键词吧</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      searchKeyword: '',
      searchResults: [],
      isSearching: false,
      searchHistory: [],
      hotSearchList: [], // 从API动态获取
      isLoadingHotSearch: false, // 热门搜索加载状态
      currentClassifierId: null, // 当前选中的分类ID
      // 智能搜索相关
      searchType: 'all', // all, actor, title, category
      searchSuggestions: {
        actors: [],
        titles: [],
        categories: [],
      },
      showSuggestions: false,
      // 最热短剧数据
      hotPlaylets: [],
      isLoadingHot: false,
    };
  },

  onLoad() {
    this.loadSearchHistory();
    this.loadHotSearch(); // 加载热门搜索
    this.loadHotPlaylets();
  },

  methods: {
    // 获取当前可用的API URL
    async getCurrentUrl() {
      try {
        const testUrls = [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://192.168.204.1:3000',
          'http://192.168.149.1:3000',
          'http://172.20.10.4:3000',
        ];

        for (let url of testUrls) {
          try {
            const response = await uni.request({
              url: `${url}/api/health`,
              method: 'GET',
              timeout: 2000,
            });
            if (response.statusCode === 200) {
              return url;
            }
          } catch (error) {
            console.log(`❌ 尝试连接 ${url} 失败:`, error);
          }
        }
        throw new Error('❌ 无法连接到任何API服务器');
      } catch (error) {
        console.error('❌ getCurrentUrl方法执行失败:', error);
        return 'http://localhost:3000'; // 默认回退
      }
    },

    // 加载热门搜索数据
    async loadHotSearch() {
      try {
        this.isLoadingHotSearch = true;
        console.log('🔥 开始加载热门搜索数据...');

        const baseUrl = await this.getCurrentUrl();
        const response = await uni.request({
          url: `${baseUrl}/api/hot-search`, // 获取完整信息，包含ID
          method: 'GET',
          timeout: 5000,
        });

        if (response.statusCode === 200 && response.data.success) {
          this.hotSearchList = response.data.data || [];
          console.log('✅ 热门搜索数据加载成功:', this.hotSearchList);
        } else {
          throw new Error(`API返回错误: ${response.data.message || '未知错误'}`);
        }
      } catch (error) {
        console.error('❌ 加载热门搜索数据失败:', error);
        // 使用默认数据作为备选
        this.hotSearchList = [
          { name: '霸道总裁', _id: null },
          { name: '重生复仇', _id: null },
          { name: '甜宠恋爱', _id: null },
          { name: '穿越古代', _id: null },
          { name: '职场励志', _id: null },
          { name: '家族恩怨', _id: null },
          { name: '校园青春', _id: null },
          { name: '都市情缘', _id: null },
        ];
        console.log('🔄 使用默认热门搜索数据');
      } finally {
        this.isLoadingHotSearch = false;
      }
    },

    // 搜索输入处理
    onSearchInput(e) {
      let me = this;
      me.searchKeyword = e.detail.value;

      // 防抖搜索建议
      clearTimeout(me.suggestionTimer);
      clearTimeout(me.searchTimer);

      if (me.searchKeyword.trim()) {
        // 获取搜索建议
        me.suggestionTimer = setTimeout(() => {
          me.getSearchSuggestions();
        }, 300);

        // 执行搜索
        me.searchTimer = setTimeout(() => {
          me.performSmartSearch();
        }, 800);
      } else {
        me.clearSearchResults();
        me.showSuggestions = false;
      }
    },

    // 搜索确认
    onSearchConfirm() {
      let me = this;
      if (me.searchKeyword.trim()) {
        me.performSmartSearch();
        me.addToHistory(me.searchKeyword);
        me.showSuggestions = false;
      }
    },

    // 获取搜索建议
    async getSearchSuggestions() {
      if (!this.searchKeyword.trim()) {
        this.showSuggestions = false;
        return;
      }

      try {
        const baseUrl = await this.getCurrentUrl();
        const response = await uni.request({
          url: `${baseUrl}/api/smart-search/suggestions`,
          method: 'GET',
          data: {
            keyword: this.searchKeyword.trim(),
            limit: 3,
          },
          timeout: 5000,
        });

        if (response.statusCode === 200 && response.data.success) {
          this.searchSuggestions = response.data.data;
          this.showSuggestions = true;
          console.log('✅ 搜索建议获取成功:', this.searchSuggestions);
        }
      } catch (error) {
        console.error('❌ 获取搜索建议失败:', error);
        this.showSuggestions = false;
      }
    },

    // 智能搜索
    async performSmartSearch() {
      try {
        this.isSearching = true;
        this.showSuggestions = false;
        console.log('🔍 开始智能搜索:', this.searchKeyword, '类型:', this.searchType);

        const baseUrl = await this.getCurrentUrl();
        const response = await uni.request({
          url: `${baseUrl}/api/smart-search`,
          method: 'POST',
          data: {
            keyword: this.searchKeyword.trim(),
            searchType: this.searchType,
            page: 1,
            pageSize: 20,
            filters: {
              classifier: this.currentClassifierId,
            },
          },
          timeout: 10000,
        });

        if (response.statusCode === 200 && response.data.success) {
          const results = response.data.data || [];
          // 处理搜索结果，转换为前端需要的格式
          this.searchResults = results.map(item => ({
            playletId: item._id,
            title: item.title,
            brief: this.generateSearchBrief(item),
            image: `${baseUrl}${item.coverImage}`,
            smallImage: `${baseUrl}${item.coverImage}`,
            matchedFields: item.matchedFields || [],
            actors: item.actors || [],
            category: item.classifier ? item.classifier.name : '',
            categoryIcon: item.classifier ? item.classifier.icon : '',
            playCount: item.totalPlayCount || 0,
            collectCount: item.collectCount || 0,
            workCount: item.workCount || 0,
          }));

          console.log('✅ 智能搜索成功，找到', this.searchResults.length, '个结果');
          console.log('📊 搜索信息:', response.data.searchInfo);
        } else {
          throw new Error(`智能搜索失败: ${response.data.message || '未知错误'}`);
        }
      } catch (error) {
        console.error('❌ 智能搜索失败:', error);
        this.searchFailed();
      } finally {
        this.isSearching = false;
      }
    },

    // 生成搜索结果简介
    generateSearchBrief(item) {
      let brief = `共${item.workCount || 0}集`;

      if (item.actors && item.actors.length > 0) {
        brief += ` | 主演: ${item.actors.slice(0, 2).join('、')}`;
        if (item.actors.length > 2) {
          brief += '等';
        }
      }

      if (item.classifier && item.classifier.name) {
        brief += ` | ${item.classifier.name}`;
      }

      brief += ` | 播放量: ${this.formatPlayCount(item.totalPlayCount || 0)}`;

      return brief;
    },

    // 执行搜索
    async performSearch() {
      try {
        this.isSearching = true;
        console.log('🔍 开始搜索:', this.searchKeyword);

        const baseUrl = await this.getCurrentUrl();
        const response = await uni.request({
          url: `${baseUrl}/api/collections/search`,
          method: 'GET',
          data: {
            keyword: this.searchKeyword,
            page: 1,
            pageSize: 20,
          },
          timeout: 10000,
        });

        if (response.statusCode === 200 && response.data.success) {
          const results = response.data.data || [];
          // 处理搜索结果，转换为前端需要的格式
          this.searchResults = results.map(item => ({
            playletId: item._id,
            title: item.title,
            brief: `共${item.workCount || 0}集 - 播放量: ${this.formatPlayCount(item.totalPlayCount || 0)} | 收藏: ${item.collectCount || 0}`,
            image: `${baseUrl}${item.coverImage}`,
            smallImage: `${baseUrl}${item.coverImage}`,
          }));
          console.log('✅ 搜索成功，找到', this.searchResults.length, '个结果');
        } else {
          throw new Error(`搜索失败: ${response.data.message || '未知错误'}`);
        }
      } catch (error) {
        console.error('❌ 搜索失败:', error);
        this.searchFailed();
      } finally {
        this.isSearching = false;
      }
    },

    // 按分类搜索
    async performCategorySearch(classifierId) {
      try {
        this.isSearching = true;
        console.log('🏷️ 开始按分类搜索:', classifierId);

        const baseUrl = await this.getCurrentUrl();
        const response = await uni.request({
          url: `${baseUrl}/api/collections`,
          method: 'GET',
          data: {
            classifier: classifierId,
            page: 1,
            pageSize: 20,
            status: 'published',
          },
          timeout: 10000,
        });

        if (response.statusCode === 200 && response.data.success) {
          const results = response.data.data || [];
          // 处理搜索结果，转换为前端需要的格式
          this.searchResults = results.map(item => ({
            playletId: item._id,
            title: item.title,
            brief: `共${item.workCount || 0}集 - 播放量: ${this.formatPlayCount(item.totalPlayCount || 0)} | 收藏: ${item.collectCount || 0}`,
            image: `${baseUrl}${item.coverImage}`,
            smallImage: `${baseUrl}${item.coverImage}`,
          }));
          console.log('✅ 分类搜索成功，找到', this.searchResults.length, '个结果');
        } else {
          throw new Error(`分类搜索失败: ${response.data.message || '未知错误'}`);
        }
      } catch (error) {
        console.error('❌ 分类搜索失败:', error);
        this.searchFailed();
      } finally {
        this.isSearching = false;
      }
    },

    // 搜索失败
    searchFailed() {
      let me = this;
      me.searchResults = [];
      me.isSearching = false;

      uni.showToast({
        title: '搜索失败，请重试',
        icon: 'none',
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

    // 搜索历史项目
    searchHistoryItem(keyword) {
      let me = this;
      me.searchKeyword = keyword;
      me.performSearch();
    },

    // 搜索热门项目
    searchHotItem(item) {
      let me = this;
      // 如果是对象，使用name作为显示，_id作为搜索参数
      if (typeof item === 'object' && item.name) {
        me.searchKeyword = item.name;
        me.currentClassifierId = item._id; // 保存分类ID用于搜索
        me.searchType = 'category'; // 设置为分类搜索
        me.performSmartSearch();
        me.addToHistory(item.name);
      } else {
        // 兼容旧格式
        me.searchKeyword = item;
        me.currentClassifierId = null;
        me.searchType = 'all';
        me.performSmartSearch();
        me.addToHistory(item);
      }
    },

    // 选择搜索建议
    selectSuggestion(suggestion) {
      this.searchKeyword = suggestion.name;
      this.showSuggestions = false;

      // 根据建议类型设置搜索类型
      switch (suggestion.type) {
        case 'actor':
          this.searchType = 'actor';
          break;
        case 'title':
          this.searchType = 'title';
          break;
        case 'category':
          this.searchType = 'category';
          break;
        default:
          this.searchType = 'all';
      }

      this.performSmartSearch();
      this.addToHistory(suggestion.name);
    },

    // 切换搜索类型
    switchSearchType(type) {
      this.searchType = type;
      if (this.searchKeyword.trim()) {
        this.performSmartSearch();
      }
    },

    // 添加到搜索历史
    addToHistory(keyword) {
      let me = this;
      if (!keyword.trim()) return;

      // 移除重复项
      me.searchHistory = me.searchHistory.filter(item => item !== keyword);
      // 添加到开头
      me.searchHistory.unshift(keyword);
      // 限制历史记录数量
      if (me.searchHistory.length > 10) {
        me.searchHistory = me.searchHistory.slice(0, 10);
      }

      // 保存到本地存储
      uni.setStorageSync('searchHistory', me.searchHistory);
    },

    // 加载搜索历史
    loadSearchHistory() {
      let me = this;
      try {
        const history = uni.getStorageSync('searchHistory');
        if (history && Array.isArray(history)) {
          me.searchHistory = history;
        }
      } catch (error) {
        console.error('加载搜索历史失败:', error);
      }
    },

    // 清空搜索历史
    clearHistory() {
      let me = this;
      uni.showModal({
        title: '提示',
        content: '确定要清空搜索历史吗？',
        success: res => {
          if (res.confirm) {
            me.searchHistory = [];
            uni.removeStorageSync('searchHistory');
          }
        },
      });
    },

    // 跳转到短剧详情
    toPlayletDetail(item) {
      uni.navigateTo({
        url: `/pages/playlet/detail?playletId=${item.playletId}`,
      });
    },

    // 返回上一页
    goBack() {
      uni.navigateBack();
    },

    // 执行搜索操作
    performSearchAction() {
      if (this.searchKeyword.trim()) {
        // 如果有搜索关键词，执行搜索
        this.onSearchConfirm();
      } else {
        // 如果没有搜索关键词，返回上一页
        this.goBack();
      }
    },

    // 加载最热短剧
    async loadHotPlaylets() {
      try {
        this.isLoadingHot = true;
        console.log('🔄 开始获取最热短剧数据...');

        const baseUrl = await this.getCurrentUrl();
        const response = await uni.request({
          url: `${baseUrl}/api/collections`,
          method: 'GET',
          data: {
            page: 1,
            pageSize: 20,
            status: 'published',
          },
          timeout: 10000,
        });

        if (
          response.statusCode === 200 &&
          response.data.success &&
          response.data.data &&
          response.data.data.length > 0
        ) {
          this.processHotPlaylets(response.data.data, baseUrl);
          console.log('✅ 最热短剧数据加载成功');
        } else {
          throw new Error('合集数据格式错误或无数据');
        }
      } catch (error) {
        console.error('❌ 加载最热短剧数据失败:', error);
        this.useDefaultHotPlaylets();
      } finally {
        this.isLoadingHot = false;
      }
    },

    // 处理最热短剧数据
    processHotPlaylets(collections, baseUrl) {
      let me = this;

      // 按总播放量排序，取前3名
      const sortedCollections = collections
        .sort((a, b) => (b.totalPlayCount || 0) - (a.totalPlayCount || 0))
        .slice(0, 3);

      console.log('🔥 最热前3名合集:', sortedCollections);

      // 转换为前端需要的格式
      me.hotPlaylets = sortedCollections.map((item, index) => ({
        playletId: item._id,
        title: item.title,
        totalPlayCount: item.totalPlayCount || 0,
        brief: `共${item.workCount || 0}集 - 播放量: ${me.formatPlayCount(item.totalPlayCount)} | 收藏: ${item.collectCount || 0}`,
        image: `${baseUrl}${item.coverImage}`,
        smallImage: `${baseUrl}${item.coverImage}`,
        rank: index + 1, // 排名：1、2、3
      }));

      console.log('✅ 最热短剧数据处理完成:', me.hotPlaylets);
    },

    // 使用默认最热短剧数据
    useDefaultHotPlaylets() {
      let me = this;
      me.hotPlaylets = [
        {
          playletId: 'default-1',
          title: '默认短剧1',
          totalPlayCount: 10000,
          brief: '共20集 - 播放量: 1.0万 | 收藏: 500',
          image: 'https://via.placeholder.com/200x150/ff6b35/ffffff?text=热门1',
          smallImage: 'https://via.placeholder.com/200x150/ff6b35/ffffff?text=热门1',
          rank: 1,
        },
        {
          playletId: 'default-2',
          title: '默认短剧2',
          totalPlayCount: 8000,
          brief: '共15集 - 播放量: 8.0K | 收藏: 300',
          image: 'https://via.placeholder.com/200x150/ff6b35/ffffff?text=热门2',
          smallImage: 'https://via.placeholder.com/200x150/ff6b35/ffffff?text=热门2',
          rank: 2,
        },
        {
          playletId: 'default-3',
          title: '默认短剧3',
          totalPlayCount: 6000,
          brief: '共12集 - 播放量: 6.0K | 收藏: 200',
          image: 'https://via.placeholder.com/200x150/ff6b35/ffffff?text=热门3',
          smallImage: 'https://via.placeholder.com/200x150/ff6b35/ffffff?text=热门3',
          rank: 3,
        },
      ];
      me.isLoadingHot = false;
    },

    // 格式化播放量显示
    formatPlayCount(count) {
      if (!count) return '0';

      if (count >= 100000000) {
        return (count / 100000000).toFixed(1) + '亿';
      } else if (count >= 10000) {
        return (count / 10000).toFixed(1) + '万';
      } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
      }
      return count.toString();
    },
  },
};
</script>

<style scoped lang="scss">
.search-page {
  background: #0e0f0f;
  min-height: 100vh;
  padding-top: var(--status-bar-height);
}

/* 搜索头部 */
.search-header {
  background: #1a1a1a;
  padding: 30rpx 0 20rpx 0;
  border-bottom: 1rpx solid #2a2a2a;
}

.search-container {
  display: flex;
  align-items: center;
  padding: 0 20rpx;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(118, 118, 128, 0.12);
  border-radius: 20rpx;
  padding: 16rpx 20rpx;
  margin-right: 20rpx;
}

.search-icon {
  width: 28rpx;
  height: 28rpx;
  margin-right: 16rpx;
  position: relative;
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

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #ffffff;
  background: transparent;
  border: none;
  outline: none;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.search-clear {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  padding: 8rpx;
  margin-left: 15rpx;
  border-radius: 50%;
  background: rgba(118, 118, 128, 0.3);
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-btn {
  font-size: 28rpx;
  color: #ffffff;
  background: #ff6b35;
  padding: 16rpx 24rpx;
  border-radius: 20rpx;
  white-space: nowrap;
  cursor: pointer;
  font-weight: 500;
}

.search-btn:active {
  opacity: 0.8;
  background: #e55a2b;
}

/* 通用区块样式 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 20rpx 20rpx 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
}

.clear-history {
  font-size: 24rpx;
  color: #999;
  padding: 10rpx 20rpx;
}

/* 搜索历史 */
.search-history {
  background: #1a1a1a;
  margin: 30rpx 20rpx 0 20rpx;
  border-radius: 20rpx;
}

.history-tags {
  padding: 0 20rpx 30rpx 20rpx;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140rpx, 1fr));
  gap: 20rpx 15rpx;
  justify-items: stretch;
}

.history-tag {
  background: rgba(118, 118, 128, 0.2);
  color: #ffffff;
  font-size: 26rpx;
  padding: 12rpx 16rpx;
  border-radius: 30rpx;
  transition: all 0.3s ease;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.history-tag:active {
  background: rgba(255, 107, 53, 0.3);
}

/* 最热短剧 */
.hot-playlets {
  background: #1a1a1a;
  margin: 20rpx 20rpx 0 20rpx;
  border-radius: 20rpx;
}

.hot-playlets-list {
  padding: 0 20rpx 30rpx 20rpx;
}

.hot-playlet-item {
  display: flex;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #2a2a2a;
}

.hot-playlet-item:last-child {
  border-bottom: none;
}

.item-cover {
  width: 120rpx;
  height: 160rpx;
  margin-right: 20rpx;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
}

.cover-img {
  width: 100%;
  height: 100%;
}

/* 排名徽章样式 */
.rank-badge {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: bold;
  color: #ffffff;
  z-index: 2;
}

.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffa500);
  box-shadow: 0 4rpx 8rpx rgba(255, 215, 0, 0.4);
}

.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #999999);
  box-shadow: 0 4rpx 8rpx rgba(192, 192, 192, 0.4);
}

.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #8b4513);
  box-shadow: 0 4rpx 8rpx rgba(205, 127, 50, 0.4);
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.4;
  margin-bottom: 8rpx;
}

.item-brief {
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
  margin-bottom: 8rpx;
}

.play-count {
  font-size: 24rpx;
  color: #ff6b35;
  font-weight: 500;
}

/* 热门搜索 */
.hot-search {
  background: #1a1a1a;
  margin: 30rpx 20rpx 0 20rpx;
  border-radius: 20rpx;
}

.hot-tags {
  padding: 0 20rpx 30rpx 20rpx;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140rpx, 1fr));
  gap: 20rpx 15rpx;
  justify-items: stretch;
}

.hot-tag {
  background: rgba(255, 107, 53, 0.1);
  color: #ff6b35;
  font-size: 26rpx;
  padding: 12rpx 16rpx;
  border-radius: 30rpx;
  border: 1rpx solid rgba(255, 107, 53, 0.3);
  transition: all 0.3s ease;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.hot-tag:active {
  background: rgba(255, 107, 53, 0.2);
}

/* 搜索状态 */
.search-loading {
  text-align: center;
  padding: 100rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-placeholder {
  padding: 20rpx;
  text-align: center;
}

.loading-placeholder .loading-text {
  font-size: 24rpx;
  color: #666;
}

/* 搜索类型选择器 */
.search-type-selector {
  padding: 20rpx;
  background: #1a1a1a;
  margin: 0 20rpx;
  border-radius: 15rpx;
  display: flex;
  justify-content: space-around;
}

.search-type-item {
  padding: 12rpx 24rpx;
  border-radius: 20rpx;
  font-size: 26rpx;
  color: #999;
  background: transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.search-type-item.active {
  background: #ff6b35;
  color: #ffffff;
}

.search-type-item:active {
  opacity: 0.7;
}

/* 搜索建议 */
.search-suggestions {
  background: #1a1a1a;
  margin: 20rpx;
  border-radius: 15rpx;
  padding: 20rpx;
  max-height: 400rpx;
  overflow-y: auto;
}

.suggestion-section {
  margin-bottom: 30rpx;
}

.suggestion-section:last-child {
  margin-bottom: 0;
}

.suggestion-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 15rpx;
  padding-bottom: 10rpx;
  border-bottom: 1rpx solid #333;
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15rpx 20rpx;
  background: rgba(118, 118, 128, 0.1);
  border-radius: 10rpx;
  transition: all 0.3s ease;
  cursor: pointer;
}

.suggestion-item:active {
  background: rgba(255, 107, 53, 0.2);
}

.suggestion-name {
  font-size: 26rpx;
  color: #ffffff;
  flex: 1;
}

.suggestion-count {
  font-size: 22rpx;
  color: #999;
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

/* 搜索结果 */
.search-results {
  background: #1a1a1a;
  margin: 20rpx 20rpx 0 20rpx;
  border-radius: 20rpx;
}

.results-list {
  padding: 0 20rpx 30rpx 20rpx;
}

.result-item {
  display: flex;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #2a2a2a;
}

.result-item:last-child {
  border-bottom: none;
}

.item-cover {
  width: 120rpx;
  height: 160rpx;
  margin-right: 20rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.4;
  margin-bottom: 10rpx;
}

.item-brief {
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
}

/* 无结果 */
.no-results {
  text-align: center;
  padding: 100rpx 0;
}

.no-results-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.no-results-text {
  font-size: 32rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.no-results-tip {
  font-size: 24rpx;
  color: #999;
}
</style>
