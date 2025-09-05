<template>
  <view class="message-center-page">
    <u-navbar
      :title="tabList[currentTab].name"
      :safeAreaInsetTop="true"
      :placeholder="true"
      bgColor="#ffffff"
    ></u-navbar>
    <u-tabs :list="tabList" @click="handleTabClick" :current="currentTab"></u-tabs>
    <swiper class="swiper-box" :current="currentTab" @change="handleSwiperChange">
      <swiper-item>
        <messages-list-component />
      </swiper-item>
      <swiper-item>
        <friend-list-component />
      </swiper-item>
    </swiper>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import MessagesListComponent from '@/components/messagesList.vue';
import FriendListComponent from '@/components/friendList.vue';
import { onMounted, onUnmounted } from 'vue';

const tabList = ref([{ name: '消息' }, { name: '好友' }]);

const currentTab = ref(0);

const handleTabClick = item => {
  currentTab.value = item.index;
};

const handleSwiperChange = e => {
  currentTab.value = e.detail.current;
};

onMounted(() => {
  uni.$on('switch-to-friends-tab', () => {
    currentTab.value = 1;
  });
});

onUnmounted(() => {
  uni.$off('switch-to-friends-tab');
});
</script>

<style scoped>
.message-center-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.swiper-box {
  flex: 1;
}
</style>
