<template>
  <view class="friend-list-page">
    <friend-list-component />
  </view>
</template>

<script setup>
import FriendListComponent from '@/pages/messages/friendList.vue';
</script>

<style scoped>
.friend-list-page {
  height: 100vh;
}
</style>
