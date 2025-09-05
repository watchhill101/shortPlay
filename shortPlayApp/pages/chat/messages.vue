<template>
  <view class="messages-page">
    <messages-list-component />
  </view>
</template>

<script setup>
import MessagesListComponent from '@/components/messagesList.vue';
</script>

<style scoped>
.messages-page {
  height: 100vh;
}
</style>
