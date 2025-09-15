<script setup>
import { useLayout } from '@/layout/composables/layout';
import { onMounted, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import Chart from 'primevue/chart';
import ProgressSpinner from 'primevue/progressspinner';
import adminService from '@/service/AdminService';

const { getPrimary, getSurface, isDarkTheme } = useLayout();
const toast = useToast();

const chartData = ref(null);
const chartOptions = ref(null);
const loading = ref(true);

// 模拟数据 - 当API获取失败时使用
const mockCollectionsData = [
    {
        id: 'mock-1',
        title: '装瞎后我把男主钓成翘嘴',
        totalPlayCount: 1568000,
        coverImage: '/demo/cover1.jpg',
        episodes: [
            { id: 'work-1', playCount: 156800 },
            { id: 'work-2', playCount: 245300 },
            { id: 'work-3', playCount: 324100 },
            { id: 'work-4', playCount: 298700 },
            { id: 'work-5', playCount: 215200 },
            { id: 'work-6', playCount: 127900 }
        ]
    },
    {
        id: 'mock-2',
        title: '重生之我爸是全班倒数第一',
        totalPlayCount: 1234000,
        coverImage: '/demo/cover2.jpg',
        episodes: [
            { id: 'work-7', playCount: 123400 },
            { id: 'work-8', playCount: 198700 },
            { id: 'work-9', playCount: 256300 },
            { id: 'work-10', playCount: 289100 },
            { id: 'work-11', playCount: 215600 }
        ]
    },
    {
        id: 'mock-3',
        title: '她靠修仙在现代风生水起',
        totalPlayCount: 987000,
        coverImage: '/demo/cover3.jpg',
        episodes: [
            { id: 'work-12', playCount: 98700 },
            { id: 'work-13', playCount: 156300 },
            { id: 'work-14', playCount: 215600 },
            { id: 'work-15', playCount: 189200 },
            { id: 'work-16', playCount: 145600 },
            { id: 'work-17', playCount: 98700 },
            { id: 'work-18', playCount: 82900 }
        ]
    }
];

// 获取播放量最高的Top3短剧的每集播放量数据
async function fetchTop3CollectionsEpisodesData() {
    loading.value = true;
    try {
        // 获取合集列表
        const response = await adminService.getCollections({
            page: 1,
            pageSize: 20,
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
            setChartData(mockCollectionsData);
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
            setChartData(mockCollectionsData);
            return;
        }

        // 按播放量排序，取Top3
        const top3Collections = collectionsData.sort((a, b) => (b.totalPlayCount || 0) - (a.totalPlayCount || 0)).slice(0, 3);

        // 获取每个合集的作品数据
        const top3CollectionsWithEpisodes = [];
        for (const collection of top3Collections) {
            try {
                // 确保使用正确的ID字段
                const collectionId = collection.id || collection._id;
                if (!collectionId) {
                    console.warn('跳过无效ID的合集:', collection);
                    continue;
                }

                console.log('正在处理合集:', collection);

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

                // 按剧集编号排序
                const sortedWorks = works
                    .map((work) => ({
                        ...work,
                        episodeNumber: parseInt(work.episodeNumber || work.id?.split('-')[1] || '0')
                    }))
                    .sort((a, b) => a.episodeNumber - b.episodeNumber);

                console.log('合集作品数据:', sortedWorks);

                top3CollectionsWithEpisodes.push({
                    ...collection,
                    id: collectionId,
                    episodes: sortedWorks.map((work) => ({
                        id: work.id,
                        episodeNumber: work.episodeNumber,
                        playCount: work.playCount || 0,
                        title: work.title || `第${work.episodeNumber}集`
                    }))
                });
            } catch (error) {
                console.error(`获取合集${collection.id || collection._id}的作品数据失败:`, error);
                continue;
            }
        }

        console.log('带作品数据的Top3合集:', top3CollectionsWithEpisodes);

        // 如果没有获取到数据，使用模拟数据
        if (top3CollectionsWithEpisodes.length === 0) {
            console.log('未获取到实际数据，使用模拟数据');
            setChartData(mockCollectionsData);
        } else {
            // 设置图表数据
            setChartData(top3CollectionsWithEpisodes);
        }
    } catch (error) {
        console.error('获取短剧数据失败:', error);
        console.log('使用模拟数据展示');
        setChartData(mockCollectionsData);

        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '加载短剧数据失败',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function setChartData(collections) {
    const documentStyle = getComputedStyle(document.documentElement);
    const colors = [documentStyle.getPropertyValue('--p-primary-500'), documentStyle.getPropertyValue('--p-cyan-500'), documentStyle.getPropertyValue('--p-purple-500')];

    // 准备图表数据
    const datasets = collections.map((collection, index) => {
        // 确保episodes是数组
        const episodes = Array.isArray(collection.episodes) ? collection.episodes : [];

        return {
            type: 'line',
            label: collection.title || `短剧${index + 1}`,
            data: episodes.map((episode) => episode.playCount || 0),
            borderColor: colors[index],
            backgroundColor: `${colors[index]}30`,
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointBackgroundColor: colors[index],
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: colors[index]
        };
    });

    // 找出最大集数
    const maxEpisodes = Math.max(...collections.map((collection) => (Array.isArray(collection.episodes) ? collection.episodes.length : 0)));

    // 准备x轴标签
    const labels = Array.from({ length: maxEpisodes }, (_, i) => `第${i + 1}集`);

    chartData.value = {
        labels,
        datasets
    };

    console.log('图表数据设置完成:', chartData.value);
}

function setChartOptions() {
    const documentStyle = getComputedStyle(document.documentElement);
    const borderColor = documentStyle.getPropertyValue('--surface-border');
    const textMutedColor = documentStyle.getPropertyValue('--text-color-secondary');

    chartOptions.value = {
        maintainAspectRatio: false,
        aspectRatio: 0.8,
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: textMutedColor
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toLocaleString() + ' 播放量';
                        }
                        return label;
                    },
                    title: function (context) {
                        // 显示当前剧集信息
                        const index = context[0].dataIndex;
                        return `第${index + 1}集`;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: textMutedColor
                },
                grid: {
                    color: borderColor,
                    drawBorder: false
                }
            },
            y: {
                ticks: {
                    color: textMutedColor,
                    callback: function (value) {
                        if (value >= 1000000) {
                            return (value / 1000000).toFixed(1) + 'M';
                        } else if (value >= 1000) {
                            return (value / 1000).toFixed(1) + 'K';
                        }
                        return value;
                    }
                },
                grid: {
                    color: borderColor,
                    drawBorder: false
                }
            }
        }
    };
}

watch([getPrimary, getSurface, isDarkTheme], () => {
    setChartOptions();
});

onMounted(() => {
    setChartOptions();
    fetchTop3CollectionsEpisodesData();
});
</script>

<template>
    <div class="card">
        <div class="font-semibold text-xl mb-4">热门短剧集播放量分析</div>

        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center h-80">
            <ProgressSpinner />
        </div>

        <!-- 图表展示 -->
        <div v-else-if="chartData && chartData.datasets && chartData.datasets.length > 0">
            <Chart type="line" :data="chartData" :options="chartOptions" class="h-80" />
        </div>

        <!-- 无数据状态 -->
        <div v-else class="flex flex-col items-center justify-center h-80 text-muted-color">
            <i class="pi pi-chart-line text-4xl mb-4"></i>
            <span>暂无剧集播放量数据</span>
        </div>
    </div>
</template>
