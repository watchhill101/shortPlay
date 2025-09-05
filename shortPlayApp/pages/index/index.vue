<template>
  <view id="containerId">
    <view class="maincontainer" :style="'height: calc(100vh - ' + navBarHeight + 'px)'">
      <view class="fixhdr">
        <view class="item">
          <block v-for="(tab, index) in panelTabs" :key="index">
            <view class="tabs" @click.stop="toTabClick(index)">
              <view class="nav" :class="tabIndex == index ? 'cur' : ''">
                {{ tab.name }}
              </view>
              <view :class="tabIndex == index ? 'cur-line' : ''"></view>
            </view>
          </block>
        </view>

        <view class="search-box" @click="toSearchGoods">
          <image class="search-icon" src="../../static/img/search-icon.png"></image>
        </view>
      </view>

      <view class="panel">
        <swiper
          :indicator-dots="false"
          :autoplay="false"
          :current="tabIndex"
          style="height: 100%"
          @change="onTabChange"
        >
          <swiper-item>
            <Discor :show="tabIndex == 0" />
          </swiper-item>
          <swiper-item>
            <Foryou :show="tabIndex == 1" :fowyouShow="foryouShow" />
          </swiper-item>
        </swiper>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { onLoad, onShow, onHide } from '@dcloudio/uni-app';
import Discor from './discor.vue';
import Foryou from './foryou.vue';

// --- state ---
const tabIndex = ref(0);
const panelTabs = reactive([
  { index: 0, name: '发现' },
  { index: 1, name: '推荐' },
]);
const foryouShow = ref(false);
const navBarHeight = ref(0);

// --- methods ---
const initViewInfo = () => {
  // pages.json 中tabBar 设置了高度
  // #ifdef APP-PLUS
  navBarHeight.value = 0;
  // #endif
  // #ifndef APP-PLUS
  navBarHeight.value = 60;
  // #endif
};

const toTabClick = index => {
  tabIndex.value = index;
};

const onTabChange = e => {
  tabIndex.value = e.detail.current;
  foryouShow.value = tabIndex.value === 1;
};

const toSearchGoods = () => {
  uni.navigateTo({
    url: '/pages/index/search',
  });
};

// --- lifecycle hooks ---
onLoad(() => {
  initViewInfo();
});

onShow(() => {
  foryouShow.value = tabIndex.value === 1;
});

onHide(() => {
  foryouShow.value = false;
});
</script>

<style scoped lang="scss">
/* Styles remain the same */
.maincontainer {
  width: 100%;
  background-color: #0e0f0f;
}

.fixhdr {
  position: fixed;
  z-index: 10;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  top: 65rpx;

  .item {
    display: flex;
    flex-direction: row;
    flex-grow: 1;
    justify-content: space-evenly;
  }

  .item .tabs {
    display: flex;
    align-items: center;
    justify-content: space-around;
    flex-direction: column;
    font-weight: bold;

    .nav {
      font-size: 36rpx;
      line-height: 40rpx;
      color: #b0aebb;
      padding: 12rpx 32rpx;
      position: relative;
      mix-blend-mode: multiply;
    }

    .cur {
      color: #fdfbfe;
      font-weight: bold;
    }

    .cur-line {
      width: 48rpx;
      height: 4rpx;
      background-color: #fdfbfe;
    }
  }

  .search-box {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 6rpx;
    position: absolute;
    right: 30rpx;
  }

  .search-icon {
    width: 44rpx;
    height: 44rpx;
    background: url('../../static/img/search-icon.png') no-repeat;
    background-size: 100% 100%;
  }
}

.content {
  position: relative;
  border-radius: 30rpx 30rpx 0 0;
  z-index: 1;
}

.panel {
  height: 100vh;
}

.panel swiper {
  width: 100%;
}
</style>
