<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import adminService from '@/service/AdminService';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Menu from 'primevue/menu';

const menu = ref(null);
const collections = ref([]);
const loading = ref(true);
const toast = useToast();

const items = ref([
    { label: '添加合集', icon: 'pi pi-fw pi-plus' },
    { label: '移除合集', icon: 'pi pi-fw pi-trash' }
]);

// 模拟数据 - 当API获取失败时使用
const mockCollectionsData = [
    {
        id: 'mock-1',
        title: '都市迷情',
        coverImage: '/demo/cover1.jpg',
        workCount: 24,
        totalPlayCount: 1568000,
        totalLikes: 125600,
        totalCollections: 89400,
        hotPercentage: 98
    },
    {
        id: 'mock-2',
        title: '青春校园',
        coverImage: '/demo/cover2.jpg',
        workCount: 18,
        totalPlayCount: 1234000,
        totalLikes: 98700,
        totalCollections: 76500,
        hotPercentage: 92
    },
    {
        id: 'mock-3',
        title: '古装传奇',
        coverImage: '/demo/cover3.jpg',
        workCount: 36,
        totalPlayCount: 987000,
        totalLikes: 87600,
        totalCollections: 65400,
        hotPercentage: 85
    },
    {
        id: 'mock-4',
        title: '职场风云',
        coverImage: '/demo/cover4.jpg',
        workCount: 12,
        totalPlayCount: 876000,
        totalLikes: 76500,
        totalCollections: 54300,
        hotPercentage: 78
    },
    {
        id: 'mock-5',
        title: '悬疑探案',
        coverImage: '/demo/cover5.jpg',
        workCount: 20,
        totalPlayCount: 765000,
        totalLikes: 65400,
        totalCollections: 43200,
        hotPercentage: 72
    },
    {
        id: 'mock-6',
        title: '家庭伦理',
        coverImage: '/demo/cover6.jpg',
        workCount: 26,
        totalPlayCount: 654000,
        totalLikes: 54300,
        totalCollections: 32100,
        hotPercentage: 68
    },
    {
        id: 'mock-7',
        title: '科幻未来',
        coverImage: '/demo/cover7.jpg',
        workCount: 15,
        totalPlayCount: 543000,
        totalLikes: 43200,
        totalCollections: 21000,
        hotPercentage: 63
    },
    {
        id: 'mock-8',
        title: '奇幻冒险',
        coverImage: '/demo/cover8.jpg',
        workCount: 30,
        totalPlayCount: 432000,
        totalLikes: 32100,
        totalCollections: 10900,
        hotPercentage: 58
    },
    {
        id: 'mock-9',
        title: '历史传记',
        coverImage: '/demo/cover9.jpg',
        workCount: 22,
        totalPlayCount: 321000,
        totalLikes: 21000,
        totalCollections: 9800,
        hotPercentage: 53
    },
    {
        id: 'mock-10',
        title: '浪漫爱情',
        coverImage: '/demo/cover10.jpg',
        workCount: 16,
        totalPlayCount: 210000,
        totalLikes: 10900,
        totalCollections: 8700,
        hotPercentage: 48
    }
];

// 获取热门剧集Top10
async function fetchHotCollections() {
    loading.value = true;
    try {
        // 调用AdminService获取合集数据，与ContentManagement.vue保持一致
        const response = await adminService.getCollections({
            page: 1,
            pageSize: 20, // 获取足够的数量以便筛选Top10
            sortBy: 'totalPlayCount',
            sortOrder: 'desc'
        });

        console.log('API响应数据:', response);

        let collectionsData = [];
        if (response.success) {
            collectionsData = response.data;
        } else if (Array.isArray(response)) {
            collectionsData = response;
        } else if (response.data && Array.isArray(response.data)) {
            collectionsData = response.data;
        } else {
            console.log('未获取到合集数据，使用模拟数据');
            collections.value = mockCollectionsData;
            return;
        }

        // 过滤掉没有有效ID的数据
        collectionsData = collectionsData.filter((collection) => {
            const hasValidId = collection && (collection.id || collection._id);
            if (!hasValidId) {
                console.warn('发现无效ID的合集数据:', collection);
            }
            return hasValidId;
        });

        console.log('处理后的合集数据:', collectionsData);

        // 如果没有数据，使用模拟数据
        if (!collectionsData || collectionsData.length === 0) {
            console.log('合集数据为空，使用模拟数据');
            collections.value = mockCollectionsData;
            return;
        }

        // 获取每个合集的所有作品数据，包括点赞收藏等信息
        const collectionsWithWorksData = [];
        for (const collection of collectionsData) {
            try {
                console.log('正在处理合集:', collection);
                // 确保使用正确的ID字段
                const collectionId = collection.id || collection._id;
                if (!collectionId) {
                    console.warn('跳过无效ID的合集:', collection);
                    continue;
                }

                // 获取合集下的所有作品
                const worksResponse = await adminService.getWorksByCollection(collectionId);
                let works = [];
                if (worksResponse.success) {
                    works = worksResponse.data;
                } else if (Array.isArray(worksResponse)) {
                    works = worksResponse;
                } else if (worksResponse.data && Array.isArray(worksResponse.data)) {
                    works = worksResponse.data;
                }

                // 过滤掉无效的作品数据
                works = works.filter((work) => work && typeof work === 'object');
                console.log('合集作品数据:', works);

                // 计算合集的总点赞数和总收藏数
                const totalLikes = works.reduce((sum, work) => sum + (work.likeCount || 0), 0);
                const totalCollections = works.reduce((sum, work) => sum + (work.collectCount || 0), 0);

                collectionsWithWorksData.push({
                    ...collection,
                    id: collectionId, // 统一使用处理后的ID
                    totalLikes,
                    totalCollections,
                    workCount: works.length
                });
            } catch (error) {
                console.error(`获取合集${collection.id || collection._id}的作品数据失败:`, error);
                // 使用原始合集数据，不包含点赞收藏信息
                collectionsWithWorksData.push({
                    ...collection,
                    id: collection.id || collection._id, // 统一使用处理后的ID
                    totalLikes: 0,
                    totalCollections: 0,
                    workCount: collection.workCount || 0
                });
            }
        }

        console.log('带作品数据的合集列表:', collectionsWithWorksData);

        // 按总热度排序（综合播放量、点赞数、收藏数），取Top10
        const hotCollections = collectionsWithWorksData
            .sort((a, b) => {
                // 综合热度计算公式：播放量(60%) + 点赞数(20%) + 收藏数(20%)
                const scoreA = (a.totalPlayCount || 0) * 0.6 + (a.totalLikes || 0) * 0.2 + (a.totalCollections || 0) * 0.2;
                const scoreB = (b.totalPlayCount || 0) * 0.6 + (b.totalLikes || 0) * 0.2 + (b.totalCollections || 0) * 0.2;
                return scoreB - scoreA;
            })
            .slice(0, 10)
            .map((collection, index) => ({
                ...collection,
                hotPercentage: Math.max(100 - index * 5, 30) // 计算热度百分比，确保最低30%
            }));

        console.log('最终的Top10热门剧集:', hotCollections);

        collections.value = hotCollections;
    } catch (error) {
        console.error('获取热门剧集失败:', error);
        // 使用模拟数据作为后备
        console.log('发生错误，使用模拟数据展示');
        collections.value = mockCollectionsData;

        // 显示错误提示
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '加载热门剧集数据失败',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

// 获取随机颜色类名
function getRandomColorClass() {
    const colors = ['orange', 'cyan', 'pink', 'green', 'purple', 'teal', 'blue', 'indigo'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 获取随机本地图片
function getRandomLocalImage() {
    const images = [
        new URL('@/assets/demo/images/1.gif', import.meta.url).href,
        new URL('@/assets/demo/images/2.gif', import.meta.url).href,
        new URL('@/assets/demo/images/3.gif', import.meta.url).href,
        new URL('@/assets/demo/images/4.gif', import.meta.url).href,
        new URL('@/assets/demo/images/5.gif', import.meta.url).href,
        new URL('@/assets/demo/images/6.gif', import.meta.url).href,
        new URL('@/assets/demo/images/7.gif', import.meta.url).href,
        new URL('@/assets/demo/images/8.gif', import.meta.url).href,
        new URL('@/assets/demo/images/9.gif', import.meta.url).href,
        new URL('@/assets/demo/images/10.gif', import.meta.url).href
    ];
    return images[Math.floor(Math.random() * images.length)];
}

onMounted(() => {
    fetchHotCollections();
});
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-6">
            <div class="font-semibold text-xl">热门剧集</div>
            <div>
                <Button icon="pi pi-ellipsis-v" class="p-button-text p-button-plain p-button-rounded" :disabled="loading" @click="$refs.menu.toggle($event)"></Button>
                <Menu ref="menu" popup :model="items" class="!min-w-40"></Menu>
            </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center py-10">
            <ProgressSpinner />
        </div>

        <!-- 剧集列表 -->
        <ul v-else-if="collections.length > 0" class="list-none p-0 m-0">
            <li v-for="(collection, index) in collections" :key="collection.id" class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div class="flex items-center gap-3">
                    <!-- 排名 -->
                    <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">
                        {{ index + 1 }}
                    </div>

                    <!-- 封面图 -->
                    <div class="w-10 h-10 rounded overflow-hidden shrink-0">
                        <img :src="collection.coverImage || getRandomLocalImage()" :alt="collection.title" class="w-full h-full object-cover" width="50" @error="$event.target.src = getRandomLocalImage()" />
                    </div>

                    <!-- 剧集信息 -->
                    <div>
                        <span class="text-surface-900 dark:text-surface-0 font-medium mr-2 mb-1 md:mb-0">
                            {{ collection.title }}
                        </span>
                        <div class="mt-1 text-muted-color">{{ collection.workCount }}集 · {{ collection.totalPlayCount?.toLocaleString() || 0 }}播放</div>
                        <!-- 新增点赞和收藏信息 -->
                        <div class="mt-1 text-xs text-muted-color">
                            👍 {{ collection.totalLikes?.toLocaleString() || 0 }} · ⭐
                            {{ collection.totalCollections?.toLocaleString() || 0 }}
                        </div>
                    </div>
                </div>

                <!-- 热度进度条 -->
                <div class="mt-2 md:mt-0 ml-0 md:ml-20 flex items-center">
                    <div class="bg-surface-300 dark:bg-surface-500 rounded-border overflow-hidden w-40 lg:w-24" style="height: 8px">
                        <div :class="`bg-${getRandomColorClass()}-500 h-full`" :style="{ width: `${collection.hotPercentage}%` }"></div>
                    </div>
                    <span :class="`text-${getRandomColorClass()}-500 ml-4 font-medium`"> {{ collection.hotPercentage }}% </span>
                </div>
            </li>
        </ul>

        <!-- 无数据状态 -->
        <div v-else class="flex flex-col items-center justify-center py-10 text-muted-color">
            <i class="pi pi-film text-4xl mb-4"></i>
            <span>暂无热门剧集数据</span>
        </div>
    </div>
</template>
