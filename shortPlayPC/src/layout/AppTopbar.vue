<script setup>
import { useLayout } from '@/layout/composables/layout';
import AppConfigurator from './AppConfigurator.vue';
import red from '@/assets/demo/images/red.png';
import Dialog from 'primevue/dialog';
import { onMounted, ref } from 'vue';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
const dialogVisible = ref(false);
let token = '';

onMounted(() => {
    token = localStorage.getItem('token');
    console.log('当前token:', token);
});

// 处理退出登录
const handleLogout = () => {
    localStorage.removeItem('token');
    token = '';
    dialogVisible.value = false;
    // 可以添加退出成功的提示
    // 可以跳转到登录页面
};

// 处理账户设置
const handleSettings = () => {
    dialogVisible.value = false;
    // 跳转到设置页面或其他操作
};
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/" class="layout-topbar-logo">
                <img :src="red" alt="" width="50" style="border-radius: 50%; opacity: 0.8" />
                <span>红菓后台管理系统</span>
            </router-link>
        </div>
        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" @click="toggleDarkMode">
                    <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
                </button>
                <div class="relative">
                    <button
                        v-styleclass="{
                            selector: '@next',
                            enterFromClass: 'hidden',
                            enterActiveClass: 'animate-scalein',
                            leaveToClass: 'hidden',
                            leaveActiveClass: 'animate-fadeout',
                            hideOnOutsideClick: true
                        }"
                        type="button"
                        class="layout-topbar-action layout-topbar-action-highlight"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <AppConfigurator />
                </div>
            </div>
            <button
                class="layout-topbar-menu-button layout-topbar-action"
                v-styleclass="{
                    selector: '@next',
                    enterFromClass: 'hidden',
                    enterActiveClass: 'animate-scalein',
                    leaveToClass: 'hidden',
                    leaveActiveClass: 'animate-fadeout',
                    hideOnOutsideClick: true
                }"
            >
                <i class="pi pi-ellipsis-v"></i>
            </button>

            <div class="layout-topbar-menu hidden lg:block">
                <div class="layout-topbar-menu-content">
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-calendar"></i>
                        <span>Calendar</span>
                    </button>
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-inbox"></i>
                        <span>Messages</span>
                    </button>
                    <button type="button" class="layout-topbar-action" @click="dialogVisible = true">
                        <i class="pi pi-user"></i>
                        <span>Profile</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 用户信息对话框 -->
        <Dialog v-model:visible="dialogVisible" modal :closable="true" :closeOnEscape="true" class="profile-dialog">
            <template #header>
                <div class="flex items-center justify-between w-full">
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">用户中心</h3>
                </div>
            </template>

            <div class="profile-content">
                <div v-if="!token" class="flex flex-col items-center justify-center h-[200px]">
                    <div class="text-center mb-6">
                        <div class="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="pi pi-user text-3xl text-gray-500 dark:text-gray-400"></i>
                        </div>
                        <h4 class="text-lg font-medium text-gray-700 dark:text-gray-300">请先登录</h4>
                    </div>
                    <button
                        type="button"
                        class="login-button px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                        @click="
                            dialogVisible = false;
                            $router.push('/login');
                        "
                    >
                        登录
                    </button>
                </div>

                <div v-else class="flex flex-col items-center py-4">
                    <div class="w-24 h-24 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-6">
                        <i class="pi pi-user text-4xl text-primary"></i>
                    </div>

                    <div class="user-info w-full mb-6">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-gray-600 dark:text-gray-400">用户ID</span>
                            <span class="text-gray-800 dark:text-gray-200 font-medium truncate max-w-[200px]">
                                {{ token }}
                            </span>
                        </div>

                        <div class="flex items-center justify-between mb-3">
                            <span class="text-gray-600 dark:text-gray-400">用户等级</span>
                            <div class="flex items-center">
                                <span class="text-gray-800 dark:text-gray-200 font-medium">level1</span>
                                <div class="ml-2 w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div class="bg-primary h-2 rounded-full" style="width: 10%"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="w-full flex flex-col gap-3">
                        <button type="button" class="flex items-center justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" @click="handleSettings">
                            <i class="pi pi-cog mr-2 text-gray-600 dark:text-gray-400"></i>
                            <span>账户设置</span>
                        </button>

                        <button type="button" class="logout-button w-full py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors" @click="handleLogout">退出登录</button>
                    </div>
                </div>
            </div>
        </Dialog>
    </div>
</template>

<style scoped>
.profile-dialog {
    width: 400px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.profile-dialog :deep(.p-dialog-header) {
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
}

.profile-dialog :deep(.p-dialog-content) {
    padding: 0;
}

.profile-content {
    padding: 0 1.5rem 1.5rem;
}

.user-info {
    background-color: var(--surface-ground);
    padding: 1rem;
    border-radius: 6px;
}

.login-button,
.logout-button {
    font-weight: 500;
    transition: all 0.2s ease;
    transform: translateY(0);
}

.login-button:hover,
.logout-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@media (max-width: 576px) {
    .profile-dialog {
        width: 90vw;
        margin: 0 auto;
    }
}
</style>
