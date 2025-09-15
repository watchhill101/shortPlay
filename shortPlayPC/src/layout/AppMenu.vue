<script setup>
import { ref } from 'vue';

import AppMenuItem from './AppMenuItem.vue';

const model = ref([
    {
        label: 'Home',
        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/' }]
    },
    // {
    //     label: 'UI Components',
    //     items: [
    //         { label: 'Form Layout', icon: 'pi pi-fw pi-id-card', to: '/uikit/formlayout' },
    //         { label: 'Input', icon: 'pi pi-fw pi-check-square', to: '/uikit/input' },
    //         { label: 'Button', icon: 'pi pi-fw pi-mobile', to: '/uikit/button', class: 'rotated-icon' },
    //         { label: 'Table', icon: 'pi pi-fw pi-table', to: '/uikit/table' },
    //         { label: 'List', icon: 'pi pi-fw pi-list', to: '/uikit/list' },
    //         { label: 'Tree', icon: 'pi pi-fw pi-share-alt', to: '/uikit/tree' },
    //         { label: 'Panel', icon: 'pi pi-fw pi-tablet', to: '/uikit/panel' },
    //         { label: 'Overlay', icon: 'pi pi-fw pi-clone', to: '/uikit/overlay' },
    //         { label: 'Media', icon: 'pi pi-fw pi-image', to: '/uikit/media' },
    //         { label: 'Menu', icon: 'pi pi-fw pi-bars', to: '/uikit/menu' },
    //         { label: 'Message', icon: 'pi pi-fw pi-comment', to: '/uikit/message' },
    //         { label: 'File', icon: 'pi pi-fw pi-file', to: '/uikit/file' },
    //         { label: 'Chart', icon: 'pi pi-fw pi-chart-bar', to: '/uikit/charts' },
    //         { label: 'Timeline', icon: 'pi pi-fw pi-calendar', to: '/uikit/timeline' },
    //         { label: 'Misc', icon: 'pi pi-fw pi-circle', to: '/uikit/misc' }
    //     ]
    // },
    {
        label: 'Pages',
        icon: 'pi pi-fw pi-briefcase',
        to: '/pages',
        items: [
            {
                label: 'Landing',
                icon: 'pi pi-fw pi-globe',
                to: '/landing'
            },
            {
                label: 'Auth',
                icon: 'pi pi-fw pi-user',
                items: [
                    {
                        label: 'Login',
                        icon: 'pi pi-fw pi-sign-in',
                        to: '/auth/login'
                    },
                    {
                        label: 'Error',
                        icon: 'pi pi-fw pi-times-circle',
                        to: '/auth/error'
                    },
                    {
                        label: 'Access Denied',
                        icon: 'pi pi-fw pi-lock',
                        to: '/auth/access'
                    }
                ]
            },
            {
                label: 'Crud',
                icon: 'pi pi-fw pi-pencil',
                to: '/pages/crud'
            },
            {
                label: 'Not Found',
                icon: 'pi pi-fw pi-exclamation-circle',
                to: '/pages/notfound'
            },
            {
                label: 'Empty',
                icon: 'pi pi-fw pi-circle-off',
                to: '/pages/empty'
            }
        ]
    },

    {
        label: '用户管理中心',
        items: [
            {
                label: '用户管理',
                icon: 'pi pi-fw pi-user',
                items: [
                    {
                        label: '红菓用户管理',
                        icon: 'pi pi-fw pi-user'
                    },
                    {
                        label: '后台用户管理',
                        icon: 'pi pi-fw pi-user'
                    }
                ]
            }
        ]
    },
    {
        label: '内容管理中心',
        items: [
            {
                label: '内容管理',
                icon: 'pi pi-fw pi-file',
                items: [
                    {
                        label: '剧集管理',
                        icon: 'pi pi-fw pi-video',
                        to: '/admin/content-management'
                    },
                    {
                        label: '分集管理',
                        icon: 'pi pi-fw pi-circle',
                        to: '/admin/episode-management'
                    },
                    {
                        label: '内容审核',
                        icon: 'pi pi-fw pi-check-circle',
                        to: '/admin/content-review'
                    },
                    {
                        label: '分类/标签管理',
                        icon: 'pi pi-fw pi-tags',
                        to: '/admin/category-management'
                    },
                    {
                        label: '评论管理',
                        icon: 'pi pi-fw pi-file',
                        to: '/manager/comment'
                    }
                ]
            }
        ]
    },
    {
        label: '财务管理中心',
        items: [
            {
                label: '财务管理',
                icon: 'pi pi-fw pi-list',
                items: [
                    {
                        label: '订单管理',
                        icon: 'pi pi-fw pi-wallet',
                        to: '/manager/order'
                    }
                ]
            }
        ]
    },
    {
        label: '系统设置',
        items: [
            {
                label: '系统权限',
                icon: 'pi pi-fw pi-list',
                items: [
                    {
                        label: '权限管理',
                        icon: 'pi pi-fw pi-user'
                    },
                    {
                        label: '角色管理',
                        icon: 'pi pi-fw pi-user'
                    }
                ]
            }
        ]
    },
    {
        label: '内容管理中心',
        items: [
            {
                label: '剧集管理',
                icon: 'pi pi-fw pi-video',
                to: '/admin/content-management'
            },
            {
                label: '分集管理',
                icon: 'pi pi-fw pi-play-circle',
                to: '/admin/episode-management'
            },
            {
                label: '内容审核',
                icon: 'pi pi-fw pi-check-circle',
                to: '/admin/content-review'
            },
            {
                label: '分类/标签管理',
                icon: 'pi pi-fw pi-tags',
                to: '/admin/category-management'
            }
        ]
    }
]);
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
