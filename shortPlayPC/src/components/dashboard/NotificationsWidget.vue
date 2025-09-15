<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import ProgressSpinner from 'primevue/progressspinner';
import AdminSocketService from '@/service/AdminSocketService';
const menu = ref(null);
const notifications = ref({
    today: [],
    yesterday: [],
    lastWeek: []
});
const loading = ref(true);
const connectionStatus = ref('disconnected'); // disconnected, connecting, connected

const items = ref([
    { label: '添加通知', icon: 'pi pi-fw pi-plus' },
    { label: '清空通知', icon: 'pi pi-fw pi-trash' }
]);

// 初始化模拟通知数据
function initMockNotifications() {
    // 模拟数据用于展示
    notifications.value = {
        today: [
            {
                id: '1',
                type: 'like',
                user: { name: '张三', avatar: '' },
                target: { type: 'video', title: '爱情公寓第1集' },
                message: '给视频点赞了',
                timestamp: new Date(),
                icon: 'pi pi-heart',
                iconColor: 'text-red-500',
                bgColor: 'bg-red-100 dark:bg-red-400/10'
            },
            {
                id: '2',
                type: 'comment',
                user: { name: '李四', avatar: '' },
                target: { type: 'video', title: '天下第一第2集' },
                message: '发表了评论：这部剧真不错！',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                icon: 'pi pi-comment',
                iconColor: 'text-blue-500',
                bgColor: 'bg-blue-100 dark:bg-blue-400/10'
            }
        ],
        yesterday: [
            {
                id: '3',
                type: 'share',
                user: { name: '王五', avatar: '' },
                target: { type: 'video', title: '大宋提刑官第3集' },
                message: '分享了视频',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                icon: 'pi pi-share-alt',
                iconColor: 'text-green-500',
                bgColor: 'bg-green-100 dark:bg-green-400/10'
            },
            {
                id: '4',
                type: 'collect',
                user: { name: '赵六', avatar: '' },
                target: { type: 'collection', title: '三体' },
                message: '收藏了合集',
                timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000),
                icon: 'pi pi-bookmark',
                iconColor: 'text-yellow-500',
                bgColor: 'bg-yellow-100 dark:bg-yellow-400/10'
            }
        ],
        lastWeek: [
            {
                id: '5',
                type: 'upload',
                user: { name: '管理员', avatar: '' },
                target: { type: 'video', title: '乡村爱情第5集' },
                message: '上传了新视频',
                timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                icon: 'pi pi-upload',
                iconColor: 'text-purple-500',
                bgColor: 'bg-purple-100 dark:bg-purple-400/10'
            },
            {
                id: '6',
                type: 'system',
                user: { name: '系统', avatar: '' },
                target: null,
                message: '平台数据统计已更新',
                timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
                icon: 'pi pi-chart-line',
                iconColor: 'text-cyan-500',
                bgColor: 'bg-cyan-100 dark:bg-cyan-400/10'
            }
        ]
    };
}

// 连接 WebSocket 并监听通知
async function connectSocket() {
    connectionStatus.value = 'connecting';

    try {
        await AdminSocketService.connect();
        connectionStatus.value = 'connected';
        console.log('✅ 已连接到通知服务器');

        // 监听点赞事件
        AdminSocketService.on('likeNotification', handleLikeNotification);
        // 监听评论事件
        AdminSocketService.on('commentNotification', handleCommentNotification);
        // 监听分享事件
        AdminSocketService.on('shareNotification', handleShareNotification);
        // 监听收藏事件
        AdminSocketService.on('collectNotification', handleCollectNotification);
    } catch (error) {
        console.error('❌ 连接通知服务器失败:', error);
        connectionStatus.value = 'disconnected';
    }
}

// 处理点赞通知
function handleLikeNotification(data) {
    const notification = {
        id: Date.now().toString(),
        type: 'like',
        user: data.user,
        target: data.target,
        message: `给视频点赞了`,
        timestamp: new Date(),
        icon: 'pi pi-heart',
        iconColor: 'text-red-500',
        bgColor: 'bg-red-100 dark:bg-red-400/10'
    };

    // 添加到今天的通知列表最前面
    notifications.value.today.unshift(notification);
}

// 处理评论通知
function handleCommentNotification(data) {
    const notification = {
        id: Date.now().toString(),
        type: 'comment',
        user: data.user,
        target: data.target,
        message: `发表了评论：${data.comment}`,
        timestamp: new Date(),
        icon: 'pi pi-comment',
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-400/10'
    };

    notifications.value.today.unshift(notification);
}

// 处理分享通知
function handleShareNotification(data) {
    const notification = {
        id: Date.now().toString(),
        type: 'share',
        user: data.user,
        target: data.target,
        message: `分享了视频`,
        timestamp: new Date(),
        icon: 'pi pi-share-alt',
        iconColor: 'text-green-500',
        bgColor: 'bg-green-100 dark:bg-green-400/10'
    };

    notifications.value.today.unshift(notification);
}

// 处理收藏通知
function handleCollectNotification(data) {
    const notification = {
        id: Date.now().toString(),
        type: 'collect',
        user: data.user,
        target: data.target,
        message: `收藏了合集`,
        timestamp: new Date(),
        icon: 'pi pi-bookmark',
        iconColor: 'text-yellow-500',
        bgColor: 'bg-yellow-100 dark:bg-yellow-400/10'
    };

    notifications.value.today.unshift(notification);
}

// 清空所有通知
function clearAllNotifications() {
    notifications.value = {
        today: [],
        yesterday: [],
        lastWeek: []
    };
}

// 添加模拟通知（用于测试）
function addMockNotification() {
    const mockTypes = ['like', 'comment', 'share', 'collect'];
    const randomType = mockTypes[Math.floor(Math.random() * mockTypes.length)];

    const mockUsers = ['张三', '李四', '王五', '赵六', '孙七'];
    const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];

    const mockVideos = ['爱情公寓第1集', '天下第一第2集', '大宋提刑官第3集', '三体第4集', '乡村爱情第5集'];
    const randomVideo = mockVideos[Math.floor(Math.random() * mockVideos.length)];

    let notification;

    switch (randomType) {
        case 'like':
            notification = {
                id: Date.now().toString(),
                type: 'like',
                user: { name: randomUser, avatar: '' },
                target: { type: 'video', title: randomVideo },
                message: '给视频点赞了',
                timestamp: new Date(),
                icon: 'pi pi-heart',
                iconColor: 'text-red-500',
                bgColor: 'bg-red-100 dark:bg-red-400/10'
            };
            break;
        case 'comment':
            const mockComments = ['这部剧真不错！', '很精彩的内容', '期待更新', '太好看了'];
            const randomComment = mockComments[Math.floor(Math.random() * mockComments.length)];
            notification = {
                id: Date.now().toString(),
                type: 'comment',
                user: { name: randomUser, avatar: '' },
                target: { type: 'video', title: randomVideo },
                message: `发表了评论：${randomComment}`,
                timestamp: new Date(),
                icon: 'pi pi-comment',
                iconColor: 'text-blue-500',
                bgColor: 'bg-blue-100 dark:bg-blue-400/10'
            };
            break;
        case 'share':
            notification = {
                id: Date.now().toString(),
                type: 'share',
                user: { name: randomUser, avatar: '' },
                target: { type: 'video', title: randomVideo },
                message: '分享了视频',
                timestamp: new Date(),
                icon: 'pi pi-share-alt',
                iconColor: 'text-green-500',
                bgColor: 'bg-green-100 dark:bg-green-400/10'
            };
            break;
        case 'collect':
            notification = {
                id: Date.now().toString(),
                type: 'collect',
                user: { name: randomUser, avatar: '' },
                target: { type: 'collection', title: randomVideo.split('第')[0] },
                message: '收藏了合集',
                timestamp: new Date(),
                icon: 'pi pi-bookmark',
                iconColor: 'text-yellow-500',
                bgColor: 'bg-yellow-100 dark:bg-yellow-400/10'
            };
            break;
    }

    notifications.value.today.unshift(notification);
}

// 组件挂载时初始化
onMounted(() => {
    // 初始化模拟数据
    initMockNotifications();

    // 连接 WebSocket
    connectSocket();

    // 模拟数据加载完成
    setTimeout(() => {
        loading.value = false;
    }, 500);
});

// 组件卸载时清理
onUnmounted(() => {
    // 断开 WebSocket 连接
    AdminSocketService.disconnect();
});
</script>

<template>
    <div class="card">
        <div class="flex items-center justify-between mb-6">
            <div class="font-semibold text-xl">通知中心</div>
            <div class="flex items-center gap-2">
                <!-- 连接状态指示器 -->
                <div class="flex items-center gap-1">
                    <span :class="['inline-block w-2 h-2 rounded-full', connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500']"></span>
                    <span class="text-xs text-muted-color">
                        {{ connectionStatus === 'connected' ? '已连接' : connectionStatus === 'connecting' ? '连接中' : '未连接' }}
                    </span>
                </div>

                <Button icon="pi pi-ellipsis-v" class="p-button-text p-button-plain p-button-rounded" @click="$refs.menu.toggle($event)"></Button>
                <Menu ref="menu" popup :model="items" class="!min-w-40">
                    <template #item="slotProps">
                        <div @click="slotProps.item.label === '添加通知' ? addMockNotification() : clearAllNotifications()" class="cursor-pointer">
                            <i :class="slotProps.item.icon" class="mr-2"></i>
                            <span>{{ slotProps.item.label }}</span>
                        </div>
                    </template>
                </Menu>
            </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center py-10">
            <ProgressSpinner />
        </div>

        <!-- 通知内容 -->
        <div v-else>
            <!-- 今天的通知 -->
            <div v-if="notifications.today.length > 0">
                <span class="block text-muted-color font-medium mb-4">今天</span>
                <ul class="p-0 mx-0 mt-0 mb-6 list-none">
                    <li v-for="notification in notifications.today" :key="notification.id" class="flex items-center py-2 border-b border-surface">
                        <div :class="['w-12 h-12 flex items-center justify-center rounded-full mr-4 shrink-0', notification.bgColor]">
                            <i :class="[notification.icon, notification.iconColor, '!text-xl']"></i>
                        </div>
                        <span class="text-surface-900 dark:text-surface-0 leading-normal">
                            <span v-if="notification.user" class="font-medium">{{ notification.user.name }}</span>
                            <span v-else>{{ notification.type === 'system' ? '系统' : '未知用户' }}</span>
                            <span class="text-surface-700 dark:text-surface-100 ml-1">{{ notification.message }}</span>
                            <span v-if="notification.target" class="text-primary font-bold ml-1">{{ notification.target.title }}</span>
                        </span>
                    </li>
                </ul>
            </div>

            <!-- 昨天的通知 -->
            <div v-if="notifications.yesterday.length > 0">
                <span class="block text-muted-color font-medium mb-4">昨天</span>
                <ul class="p-0 mx-0 mt-0 mb-6 list-none">
                    <li v-for="notification in notifications.yesterday" :key="notification.id" class="flex items-center py-2 border-b border-surface">
                        <div :class="['w-12 h-12 flex items-center justify-center rounded-full mr-4 shrink-0', notification.bgColor]">
                            <i :class="[notification.icon, notification.iconColor, '!text-xl']"></i>
                        </div>
                        <span class="text-surface-900 dark:text-surface-0 leading-normal">
                            <span v-if="notification.user" class="font-medium">{{ notification.user.name }}</span>
                            <span v-else>{{ notification.type === 'system' ? '系统' : '未知用户' }}</span>
                            <span class="text-surface-700 dark:text-surface-100 ml-1">{{ notification.message }}</span>
                            <span v-if="notification.target" class="text-primary font-bold ml-1">{{ notification.target.title }}</span>
                        </span>
                    </li>
                </ul>
            </div>

            <!-- 上周的通知 -->
            <div v-if="notifications.lastWeek.length > 0">
                <span class="block text-muted-color font-medium mb-4">上周</span>
                <ul class="p-0 mx-0 mt-0 list-none">
                    <li v-for="notification in notifications.lastWeek" :key="notification.id" class="flex items-center py-2 border-b border-surface">
                        <div :class="['w-12 h-12 flex items-center justify-center rounded-full mr-4 shrink-0', notification.bgColor]">
                            <i :class="[notification.icon, notification.iconColor, '!text-xl']"></i>
                        </div>
                        <span class="text-surface-900 dark:text-surface-0 leading-normal">
                            <span v-if="notification.user" class="font-medium">{{ notification.user.name }}</span>
                            <span v-else>{{ notification.type === 'system' ? '系统' : '未知用户' }}</span>
                            <span class="text-surface-700 dark:text-surface-100 ml-1">{{ notification.message }}</span>
                            <span v-if="notification.target" class="text-primary font-bold ml-1">{{ notification.target.title }}</span>
                        </span>
                    </li>
                </ul>
            </div>

            <!-- 无通知状态 -->
            <div v-if="notifications.today.length === 0 && notifications.yesterday.length === 0 && notifications.lastWeek.length === 0" class="flex flex-col items-center justify-center py-10 text-muted-color">
                <i class="pi pi-bell-slash text-4xl mb-4"></i>
                <span>暂无通知消息</span>
            </div>
        </div>
    </div>
</template>
