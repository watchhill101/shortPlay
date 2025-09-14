<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import AdminService from '@/service/AdminService';

const toast = useToast();
const confirm = useConfirm();

// 数据定义
const collections = ref([]);
const loading = ref(false);
const totalRecords = ref(0);

// 分页
const pagination = reactive({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
});

// 审核对话框
const reviewDialog = ref(false);
const selectedCollection = ref(null);
const episodes = ref([]);
const episodeLoading = ref(false);
const reviewForm = reactive({
    status: '',
    reviewNote: ''
});

// 视频播放相关
const playDialog = ref(false);
const selectedEpisode = ref(null);
const videoPlayer = ref(null);

// 审核状态选项
const reviewStatusOptions = [
    { label: '通过发布', value: 'published' },
    { label: '拒绝归档', value: 'archived' }
];

// 方法定义
const loadPendingCollections = async () => {
    try {
        loading.value = true;

        const params = {
            page: pagination.page,
            pageSize: pagination.pageSize
        };

        const response = await AdminService.getReviewCollections(params);

        if (response.success) {
            collections.value = response.data;
            pagination.total = response.pagination.total;
            pagination.totalPages = response.pagination.totalPages;
            totalRecords.value = response.pagination.total;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '加载待审核内容失败',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const loadEpisodes = async (collectionId) => {
    try {
        episodeLoading.value = true;
        const response = await AdminService.getWorksByCollection(collectionId, { status: 'pending' });
        if (response.success) {
            episodes.value = response.data;
        }
    } catch (error) {
        console.error('加载分集失败:', error);
    } finally {
        episodeLoading.value = false;
    }
};

const openReviewDialog = (collection) => {
    selectedCollection.value = collection;
    reviewForm.status = '';
    reviewForm.reviewNote = '';
    reviewDialog.value = true;
    loadEpisodes(collection._id);
};

const submitReview = async () => {
    if (!reviewForm.status) {
        toast.add({
            severity: 'warn',
            summary: '警告',
            detail: '请选择审核结果',
            life: 3000
        });
        return;
    }

    try {
        await AdminService.reviewCollection(selectedCollection.value._id, reviewForm.status, reviewForm.reviewNote);

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '审核完成',
            life: 3000
        });

        reviewDialog.value = false;
        selectedCollection.value = null;
        loadPendingCollections();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '审核失败',
            life: 3000
        });
    }
};

const quickApprove = (collection) => {
    confirm.require({
        message: `确定要直接通过《${collection.title}》的审核吗？`,
        header: '快速审核确认',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: '确定',
        rejectLabel: '取消',
        accept: async () => {
            try {
                await AdminService.reviewCollection(collection._id, 'published', '快速审核通过');

                toast.add({
                    severity: 'success',
                    summary: '成功',
                    detail: '审核通过',
                    life: 3000
                });

                loadPendingCollections();
            } catch (error) {
                toast.add({
                    severity: 'error',
                    summary: '错误',
                    detail: '审核失败',
                    life: 3000
                });
            }
        }
    });
};

const quickReject = (collection) => {
    confirm.require({
        message: `确定要拒绝《${collection.title}》的审核吗？`,
        header: '快速审核确认',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: '确定',
        rejectLabel: '取消',
        accept: async () => {
            try {
                await AdminService.reviewCollection(collection._id, 'archived', '内容不符合要求');

                toast.add({
                    severity: 'success',
                    summary: '成功',
                    detail: '审核拒绝',
                    life: 3000
                });

                loadPendingCollections();
            } catch (error) {
                toast.add({
                    severity: 'error',
                    summary: '错误',
                    detail: '审核失败',
                    life: 3000
                });
            }
        }
    });
};

const onPageChange = (event) => {
    pagination.page = event.page + 1;
    pagination.pageSize = event.rows;
    loadPendingCollections();
};

const hideReviewDialog = () => {
    reviewDialog.value = false;
    selectedCollection.value = null;
    reviewForm.status = '';
    reviewForm.reviewNote = '';
};

// 视频播放相关方法
const playEpisode = (episode) => {
    selectedEpisode.value = episode;
    playDialog.value = true;
};

const closePlayDialog = () => {
    playDialog.value = false;
    selectedEpisode.value = null;
    if (videoPlayer.value) {
        videoPlayer.value.pause();
        videoPlayer.value.currentTime = 0;
    }
};

const getVideoUrl = (videoUrl) => {
    if (!videoUrl) return '';

    console.log('原始视频URL:', videoUrl);

    // 如果已经是完整URL，直接返回
    if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
        console.log('使用完整URL:', videoUrl);
        return videoUrl;
    }

    // 如果是相对路径，使用代理路由，通过Vite代理避免跨域问题
    if (videoUrl.startsWith('/uploads/video/')) {
        const filename = videoUrl.split('/').pop();
        const proxyUrl = `/video-proxy/${filename}`;
        console.log('使用代理URL:', proxyUrl);
        return proxyUrl;
    }

    // 其他情况，直接返回相对路径
    console.log('使用相对路径:', videoUrl);
    return videoUrl;
};

const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
};

// 视频事件处理
const onVideoLoadStart = () => {
    console.log('视频开始加载');
};

const onVideoCanPlay = () => {
    console.log('视频可以播放');
};

const onVideoError = (event) => {
    console.error('视频播放错误:', event);
    toast.add({
        severity: 'error',
        summary: '播放错误',
        detail: '视频加载失败，请检查文件是否存在',
        life: 3000
    });
};

// 生命周期
onMounted(() => {
    loadPendingCollections();
});
</script>

<template>
    <div class="content-review">
        <div class="card">
            <div class="flex align-items-center justify-content-between mb-4">
                <div>
                    <h3 class="m-0">内容审核</h3>
                    <p class="text-600 m-0 mt-1">审核待发布的剧集内容</p>
                </div>
                <div class="flex gap-2">
                    <Tag :value="`${totalRecords} 条待审核`" severity="warning" />
                    <Button label="刷新" icon="pi pi-refresh" severity="secondary" @click="loadPendingCollections" />
                </div>
            </div>

            <!-- 数据表格 -->
            <DataTable
                :value="collections"
                :loading="loading"
                :paginator="true"
                :rows="pagination.pageSize"
                :totalRecords="totalRecords"
                :lazy="true"
                @page="onPageChange"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="显示第 {first} 到 {last} 条，共 {totalRecords} 条记录"
                responsiveLayout="scroll"
                class="p-datatable-gridlines"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
                        <h4 class="m-0">待审核列表</h4>
                    </div>
                </template>

                <template #empty>
                    <div class="text-center py-6">
                        <i class="pi pi-check-circle text-6xl text-surface-400 mb-3"></i>
                        <p class="text-surface-600 text-xl">暂无待审核内容</p>
                    </div>
                </template>

                <Column field="coverImage" header="封面" style="width: 100px">
                    <template #body="slotProps">
                        <Image :src="slotProps.data.coverImage" alt="Cover" width="60" height="80" preview />
                    </template>
                </Column>

                <Column field="title" header="标题" style="min-width: 200px">
                    <template #body="slotProps">
                        <div>
                            <div class="font-bold text-lg">{{ slotProps.data.title }}</div>
                            <div class="text-sm text-600 mt-1 line-height-3">
                                {{ slotProps.data.description }}
                            </div>
                        </div>
                    </template>
                </Column>

                <Column field="classifier.name" header="分类" style="min-width: 120px">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.classifier?.name" severity="info" />
                    </template>
                </Column>

                <Column field="backgroundUser.account" header="提交用户" style="min-width: 120px">
                    <template #body="slotProps">
                        <div class="flex align-items-center gap-2">
                            <Avatar icon="pi pi-user" size="small" />
                            <span>{{ slotProps.data.backgroundUser?.account }}</span>
                        </div>
                    </template>
                </Column>

                <Column field="workCount" header="剧集数" style="min-width: 100px">
                    <template #body="slotProps">
                        <Badge :value="slotProps.data.workCount" severity="primary" />
                    </template>
                </Column>

                <Column field="actors" header="主演" style="min-width: 150px">
                    <template #body="slotProps">
                        <div v-if="slotProps.data.actors && slotProps.data.actors.length">
                            <Tag v-for="actor in slotProps.data.actors.slice(0, 2)" :key="actor" :value="actor" severity="secondary" class="mr-1" />
                            <span v-if="slotProps.data.actors.length > 2" class="text-600"> +{{ slotProps.data.actors.length - 2 }} </span>
                        </div>
                        <span v-else class="text-500">无</span>
                    </template>
                </Column>

                <Column field="createdAt" header="提交时间" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <div>
                            <div>{{ new Date(slotProps.data.createdAt).toLocaleDateString('zh-CN') }}</div>
                            <div class="text-sm text-600">{{ new Date(slotProps.data.createdAt).toLocaleTimeString('zh-CN') }}</div>
                        </div>
                    </template>
                </Column>

                <Column :exportable="false" style="min-width: 200px">
                    <template #body="slotProps">
                        <div class="flex gap-2">
                            <Button label="详细审核" icon="pi pi-eye" severity="info" size="small" @click="openReviewDialog(slotProps.data)" />
                            <Button icon="pi pi-check" severity="success" size="small" @click="quickApprove(slotProps.data)" v-tooltip.top="'快速通过'" />
                            <Button icon="pi pi-times" severity="danger" size="small" @click="quickReject(slotProps.data)" v-tooltip.top="'快速拒绝'" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- 审核对话框 -->
        <Dialog v-model:visible="reviewDialog" :style="{ width: '800px' }" header="内容审核" :modal="true">
            <div v-if="selectedCollection" class="grid">
                <!-- 内容预览 -->
                <div class="col-12">
                    <h4>内容预览</h4>
                    <div class="grid">
                        <div class="col-12 md:col-4">
                            <Image :src="selectedCollection.coverImage" alt="Cover" width="200" height="260" preview />
                        </div>
                        <div class="col-12 md:col-8">
                            <div class="mb-3">
                                <label class="block text-900 font-medium mb-2">标题</label>
                                <p class="text-xl font-bold">{{ selectedCollection.title }}</p>
                            </div>
                            <div class="mb-3">
                                <label class="block text-900 font-medium mb-2">简介</label>
                                <p class="line-height-3">{{ selectedCollection.description }}</p>
                            </div>
                            <div class="grid">
                                <div class="col-6">
                                    <label class="block text-900 font-medium mb-2">分类</label>
                                    <Tag :value="selectedCollection.classifier?.name" severity="info" />
                                </div>
                                <div class="col-6">
                                    <label class="block text-900 font-medium mb-2">剧集数</label>
                                    <Badge :value="selectedCollection.workCount" severity="primary" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 主演信息 -->
                <div class="col-12" v-if="selectedCollection.actors && selectedCollection.actors.length">
                    <label class="block text-900 font-medium mb-2">主演</label>
                    <div class="flex flex-wrap gap-2">
                        <Tag v-for="actor in selectedCollection.actors" :key="actor" :value="actor" severity="secondary" />
                    </div>
                </div>

                <!-- 标签信息 -->
                <div class="col-12" v-if="selectedCollection.tags && selectedCollection.tags.length">
                    <label class="block text-900 font-medium mb-2">标签</label>
                    <div class="flex flex-wrap gap-2">
                        <Tag v-for="tag in selectedCollection.tags" :key="tag" :value="tag" severity="success" />
                    </div>
                </div>

                <!-- 待审核分集列表 -->
                <div class="col-12">
                    <Divider />
                    <h4>待审核分集</h4>
                    <div v-if="episodeLoading" class="text-center p-4">
                        <ProgressSpinner />
                    </div>
                    <div v-else-if="episodes.length === 0" class="text-center p-4 text-500">暂无待审核分集</div>
                    <div v-else class="grid">
                        <div v-for="episode in episodes" :key="episode._id" class="col-12 md:col-6">
                            <Card class="mb-3">
                                <template #content>
                                    <div class="flex align-items-center">
                                        <div class="flex-1">
                                            <h5 class="mb-2">{{ episode.title }}</h5>
                                            <p class="text-sm text-500 mb-2">第{{ episode.episodeNumber }}集</p>
                                            <p class="text-sm text-500 mb-2">时长: {{ formatDuration(episode.duration) }}</p>
                                            <Button label="播放视频" icon="pi pi-play" size="small" severity="secondary" @click="playEpisode(episode)" />
                                        </div>
                                        <div class="ml-3">
                                            <Tag value="待审核" severity="warning" />
                                        </div>
                                    </div>
                                </template>
                            </Card>
                        </div>
                    </div>
                </div>

                <!-- 审核表单 -->
                <div class="col-12">
                    <Divider />
                    <h4>审核决定</h4>
                </div>

                <div class="col-12 md:col-6">
                    <label for="reviewStatus" class="block text-900 font-medium mb-2">审核结果 *</label>
                    <Dropdown id="reviewStatus" v-model="reviewForm.status" :options="reviewStatusOptions" optionLabel="label" optionValue="value" placeholder="选择审核结果" class="w-full" />
                </div>

                <div class="col-12">
                    <label for="reviewNote" class="block text-900 font-medium mb-2">审核意见</label>
                    <Textarea id="reviewNote" v-model="reviewForm.reviewNote" rows="3" class="w-full" placeholder="请输入审核意见（选填）" />
                </div>
            </div>

            <template #footer>
                <Button label="取消" icon="pi pi-times" severity="secondary" @click="hideReviewDialog" />
                <Button label="提交审核" icon="pi pi-check" @click="submitReview" />
            </template>
        </Dialog>

        <!-- 视频播放对话框 -->
        <Dialog v-model:visible="playDialog" :style="{ width: '900px' }" header="视频播放" :modal="true" :closable="true" @hide="closePlayDialog">
            <div v-if="selectedEpisode" class="video-player-container">
                <div class="video-info mb-4">
                    <h4 class="m-0 mb-2">{{ selectedEpisode.title }}</h4>
                    <div class="flex gap-3 text-sm text-600">
                        <span>第{{ selectedEpisode.episodeNumber }}集</span>
                        <span>时长: {{ formatDuration(selectedEpisode.duration) }}</span>
                        <span>播放量: {{ selectedEpisode.playCount || 0 }}</span>
                    </div>
                </div>

                <div class="video-wrapper">
                    <video :key="selectedEpisode._id" controls preload="metadata" class="w-full border-round" style="max-height: 500px" @loadstart="onVideoLoadStart" @canplay="onVideoCanPlay" @error="onVideoError" ref="videoPlayer">
                        <source :src="getVideoUrl(selectedEpisode.videoUrl)" type="video/mp4" />
                        您的浏览器不支持视频播放
                    </video>
                </div>

                <div v-if="selectedEpisode.description" class="mt-4">
                    <h5>分集简介</h5>
                    <p class="text-600 line-height-3">{{ selectedEpisode.description }}</p>
                </div>
            </div>

            <template #footer>
                <Button label="关闭" icon="pi pi-times" severity="secondary" @click="closePlayDialog" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.content-review {
    padding: 1rem;
}

/* 视频播放器样式 */
.video-player-container {
    max-width: 100%;
}

.video-wrapper {
    position: relative;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
}

.video-wrapper video {
    width: 100%;
    height: auto;
    display: block;
}

.video-info h4 {
    color: #1f2937;
}

.video-info .text-600 {
    color: #6b7280;
}
</style>
