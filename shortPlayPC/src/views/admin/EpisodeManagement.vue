<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue';
import { useToast } from 'primevue/usetoast';
import AdminService from '@/service/AdminService';

const toast = useToast();

// 数据定义
const collections = ref([]);
const episodes = ref([]);
const selectedCollection = ref(null);
const loading = ref(false);
const episodeLoading = ref(false);

// 合集选择器相关
const collectionSelectorVisible = ref(false);
const collectionSearchText = ref('');
const collectionPagination = ref({
    page: 1,
    pageSize: 10,
    total: 0
});

// 分页
const pagination = reactive({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
});

// 对话框状态
const uploadDialog = ref(false);
const editDialog = ref(false);
const deleteDialog = ref(false);
const paymentDialog = ref(false);
const playDialog = ref(false);
const selectedEpisode = ref(null);
const videoPlayer = ref(null);
const selectedEpisodes = ref([]);

// 上传表单
const uploadForm = reactive({
    title: '',
    episodeNumber: null,
    duration: 0,
    videoFile: null,
    coverImageFile: null,
    description: '',
    freePreviewDuration: 0,
    isPaid: false,
    price: 0
});

// 编辑表单
const editForm = reactive({
    title: '',
    episodeNumber: null,
    duration: 0,
    description: '',
    status: 'draft'
});

// 付费设置表单
const paymentForm = reactive({
    isPaid: false,
    price: 0,
    freePreviewDuration: 0
});

const submitted = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);

// 状态选项
const statusOptions = [
    { label: '草稿', value: 'draft' },
    { label: '已发布', value: 'published' }
];

// 筛选参数
const filterParams = reactive({
    status: 'all'
});

// 筛选状态选项
const filterStatusOptions = [
    { label: '全部状态', value: 'all' },

    { label: '已发布', value: 'published' },
    { label: '被拒绝', value: 'rejected' }
];

// 计算属性
const statusSeverity = computed(() => {
    return (status) => {
        switch (status) {
            case 'published':
                return 'success';
            case 'draft':
                return 'warning';
            default:
                return 'info';
        }
    };
});

const statusLabel = computed(() => {
    return (status) => {
        const option = statusOptions.find((opt) => opt.value === status);
        return option ? option.label : status;
    };
});

// 方法定义
const loadCollections = async () => {
    try {
        loading.value = true;
        const response = await AdminService.getCollections({
            pageSize: 100
        });

        if (response.success) {
            collections.value = response.data;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '加载合集列表失败',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const onCollectionChange = () => {
    if (selectedCollection.value) {
        loadEpisodes();
    } else {
        episodes.value = [];
    }
};

const onStatusFilterChange = () => {
    pagination.page = 1;
    loadEpisodes();
};

const loadEpisodes = async () => {
    if (!selectedCollection.value) return;

    try {
        episodeLoading.value = true;

        const params = {
            page: pagination.page,
            pageSize: pagination.pageSize
        };

        // 只有当状态不是 'all' 时才添加状态参数
        if (filterParams.status !== 'all') {
            params.status = filterParams.status;
        }

        const response = await AdminService.getWorksByCollection(selectedCollection.value._id, params);

        if (response.success) {
            episodes.value = response.data;
            pagination.total = response.pagination.total;
            pagination.totalPages = response.pagination.totalPages;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '加载分集列表失败',
            life: 3000
        });
    } finally {
        episodeLoading.value = false;
    }
};

const openUploadDialog = () => {
    if (!selectedCollection.value) {
        toast.add({
            severity: 'warn',
            summary: '警告',
            detail: '请先选择剧集合集',
            life: 3000
        });
        return;
    }

    resetUploadForm();
    getNextEpisodeNumber();
    uploadDialog.value = true;
};

const getNextEpisodeNumber = () => {
    if (episodes.value.length > 0) {
        const maxEpisode = Math.max(...episodes.value.map((e) => e.episodeNumber));
        uploadForm.episodeNumber = maxEpisode + 1;
    } else {
        uploadForm.episodeNumber = 1;
    }
};

const resetUploadForm = () => {
    uploadForm.title = '';
    uploadForm.episodeNumber = null;
    uploadForm.duration = 0;
    uploadForm.videoFile = null;
    uploadForm.coverImageFile = null;
    uploadForm.description = '';
    uploadForm.freePreviewDuration = 0;
    uploadForm.isPaid = false;
    uploadForm.price = 0;
    submitted.value = false;
};

const onVideoSelect = (event) => {
    const file = event.files[0];
    if (file) {
        uploadForm.videoFile = file;

        // 创建视频元素来获取时长
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            uploadForm.duration = Math.round(video.duration);
            window.URL.revokeObjectURL(video.src);
        };

        video.src = URL.createObjectURL(file);
    }
};

const onCoverSelect = (event) => {
    const file = event.files[0];
    if (file) {
        uploadForm.coverImageFile = file;
    }
};

const uploadEpisode = async () => {
    submitted.value = true;

    if (!validateUploadForm()) {
        submitted.value = false;
        return;
    }

    try {
        uploading.value = true;
        uploadProgress.value = 0;

        // 模拟上传进度
        const progressInterval = setInterval(() => {
            if (uploadProgress.value < 90) {
                uploadProgress.value += Math.random() * 10;
            }
        }, 500);

        const data = {
            title: uploadForm.title,
            episodeNumber: uploadForm.episodeNumber,
            duration: uploadForm.duration,
            description: uploadForm.description,
            freePreviewDuration: uploadForm.freePreviewDuration,
            isPaid: uploadForm.isPaid,
            price: uploadForm.isPaid ? uploadForm.price : 0
        };

        await AdminService.createWork(selectedCollection.value._id, data, uploadForm.videoFile, uploadForm.coverImageFile);

        clearInterval(progressInterval);
        uploadProgress.value = 100;

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '分集上传成功',
            life: 3000
        });

        uploadDialog.value = false;
        resetUploadForm();
        loadEpisodes();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '分集上传失败',
            life: 3000
        });
    } finally {
        uploading.value = false;
        submitted.value = false;
        uploadProgress.value = 0;
    }
};

const validateUploadForm = () => {
    if (!uploadForm.title.trim()) {
        toast.add({
            severity: 'warn',
            summary: '警告',
            detail: '请输入分集标题',
            life: 3000
        });
        return false;
    }

    if (!uploadForm.episodeNumber || uploadForm.episodeNumber < 1) {
        toast.add({
            severity: 'warn',
            summary: '警告',
            detail: '请输入有效的集数',
            life: 3000
        });
        return false;
    }

    if (!uploadForm.videoFile) {
        toast.add({
            severity: 'warn',
            summary: '警告',
            detail: '请选择视频文件',
            life: 3000
        });
        return false;
    }

    return true;
};

const editEpisode = (episode) => {
    selectedEpisode.value = episode;
    editForm.title = episode.title;
    editForm.episodeNumber = episode.episodeNumber;
    editForm.duration = episode.duration;
    editForm.description = episode.description || '';
    editForm.status = episode.status;

    editDialog.value = true;
};

const saveEpisode = async () => {
    try {
        const data = {
            title: editForm.title,
            episodeNumber: editForm.episodeNumber,
            duration: editForm.duration,
            description: editForm.description,
            status: editForm.status
        };

        await AdminService.updateWork(selectedEpisode.value._id, data);

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '分集更新成功',
            life: 3000
        });

        editDialog.value = false;
        loadEpisodes();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '分集更新失败',
            life: 3000
        });
    }
};

const openPaymentDialog = (episode) => {
    selectedEpisode.value = episode;
    paymentForm.isPaid = episode.isPaid || false;
    paymentForm.price = episode.price || 0;
    paymentForm.freePreviewDuration = episode.freePreviewDuration || 0;

    paymentDialog.value = true;
};

const savePaymentSettings = async () => {
    try {
        const data = {
            isPaid: paymentForm.isPaid,
            price: paymentForm.isPaid ? paymentForm.price : 0,
            freePreviewDuration: paymentForm.freePreviewDuration
        };

        await AdminService.updateWork(selectedEpisode.value._id, data);

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '付费设置更新成功',
            life: 3000
        });

        paymentDialog.value = false;
        loadEpisodes();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '付费设置更新失败',
            life: 3000
        });
    }
};

const confirmDeleteEpisode = (episode) => {
    selectedEpisode.value = episode;
    deleteDialog.value = true;
};

const deleteEpisode = async () => {
    try {
        await AdminService.deleteWork(selectedEpisode.value._id);

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '分集删除成功',
            life: 3000
        });

        deleteDialog.value = false;
        selectedEpisode.value = null;
        loadEpisodes();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '删除分集失败',
            life: 3000
        });
    }
};

const onPageChange = (event) => {
    pagination.page = event.page + 1;
    pagination.pageSize = event.rows;
    loadEpisodes();
};

const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 播放相关方法
const playEpisode = (episode) => {
    selectedEpisode.value = episode;
    playDialog.value = true;

    // 延迟设置视频源，确保DOM更新完成
    nextTick(() => {
        console.log('准备播放视频:', episode.title);
        const videoUrl = getVideoUrl(episode.videoUrl);
        console.log('视频URL:', videoUrl);

        if (videoPlayer.value) {
            // 清除之前的源
            videoPlayer.value.innerHTML = '';

            // 创建新的source元素
            const source = document.createElement('source');
            source.src = videoUrl;
            source.type = 'video/mp4';

            // 添加到video元素
            videoPlayer.value.appendChild(source);

            // 重新加载视频
            videoPlayer.value.load();

            console.log('视频源已设置:', videoUrl);
        }
    });
};

const closePlayDialog = () => {
    // 停止视频播放
    if (videoPlayer.value) {
        videoPlayer.value.pause();
        videoPlayer.value.currentTime = 0;
    }

    playDialog.value = false;
    selectedEpisode.value = null;
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

// 处理封面图片URL
const getCoverImageUrl = (coverImage) => {
    if (!coverImage) return '';

    // 如果已经是完整URL，直接返回
    if (coverImage.startsWith('http://') || coverImage.startsWith('https://')) {
        return coverImage;
    }

    // 如果是相对路径，直接返回，通过Vite代理处理
    return coverImage;
};

// 图片加载错误处理
const onImageError = (event) => {
    console.error('图片加载失败:', event.target.src);
    // 可以设置默认图片或隐藏图片
    event.target.style.display = 'none';
};

// 视频播放事件处理
const onVideoLoadStart = () => {
    console.log('视频开始加载');
};

const onVideoCanPlay = () => {
    console.log('视频可以播放');
};

const onVideoError = (event) => {
    console.error('视频加载失败:', event);
    console.error('视频元素:', event.target);
    console.error('视频源:', event.target.src);
    console.error('错误详情:', event.target.error);

    let errorMessage = '视频加载失败';
    if (event.target.error) {
        switch (event.target.error.code) {
            case 1:
                errorMessage = '视频加载被中止';
                break;
            case 2:
                errorMessage = '网络错误导致视频下载失败';
                break;
            case 3:
                errorMessage = '视频解码错误';
                break;
            case 4:
                errorMessage = '不支持的视频格式';
                break;
            default:
                errorMessage = `视频加载失败 (错误代码: ${event.target.error.code})`;
        }
    }

    toast.add({
        severity: 'error',
        summary: '播放错误',
        detail: errorMessage,
        life: 5000
    });
};

// 合集选择器方法
const openCollectionSelector = () => {
    collectionSelectorVisible.value = true;
    loadCollectionsForSelector();
};

const closeCollectionSelector = () => {
    collectionSelectorVisible.value = false;
    collectionSearchText.value = '';
};

const selectCollectionFromSelector = (collection) => {
    selectedCollection.value = collection;
    closeCollectionSelector();
    onCollectionChange();
};

const loadCollectionsForSelector = async () => {
    try {
        loading.value = true;
        const params = {
            page: collectionPagination.value.page,
            pageSize: collectionPagination.value.pageSize,
            search: collectionSearchText.value
        };

        const response = await AdminService.getCollections(params);
        if (response.success) {
            collections.value = response.data;
            collectionPagination.value.total = response.pagination.total;
        }
    } catch (error) {
        console.error('加载合集失败:', error);
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '加载合集失败',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const onCollectionSearch = () => {
    collectionPagination.value.page = 1;
    loadCollectionsForSelector();
};

const onCollectionPageChange = (event) => {
    collectionPagination.value.page = event.page + 1;
    collectionPagination.value.pageSize = event.rows;
    loadCollectionsForSelector();
};

// 生命周期
onMounted(() => {
    loadCollections();
});
</script>

<template>
    <div class="episode-management">
        <div class="card">
            <div class="flex align-items-center justify-content-between mb-4">
                <div>
                    <h3 class="m-0">分集管理</h3>
                    <p class="text-600 m-0 mt-1">管理剧集合集的分集，包括上传视频、设置付费节点、排序与状态</p>
                </div>
            </div>

            <!-- 选择合集 -->
            <div class="card bg-primary-50 border-primary-200 mb-4">
                <div class="flex align-items-center justify-content-between">
                    <div class="flex-1">
                        <h4 class="text-primary-700 mb-3">
                            <i class="pi pi-video mr-2"></i>
                            选择剧集合集
                        </h4>
                        <div class="flex gap-2">
                            <InputText :value="selectedCollection ? selectedCollection.title : ''" placeholder="请选择要管理分集的剧集合集" readonly class="flex-1" />
                            <Button icon="pi pi-search" @click="openCollectionSelector" severity="secondary" v-tooltip.top="'搜索合集'" />
                        </div>
                    </div>
                    <div class="ml-4">
                        <Button label="上传新分集" icon="pi pi-plus" severity="success" @click="openUploadDialog" :disabled="!selectedCollection" />
                    </div>
                </div>

                <div v-if="selectedCollection" class="mt-3 p-3 bg-surface-0 border-round">
                    <div class="flex">
                        <img :src="getCoverImageUrl(selectedCollection.coverImage)" :alt="selectedCollection.title" class="w-4rem h-5rem border-round mr-3" style="object-fit: cover; max-width: 4rem; max-height: 5rem" @error="onImageError" />
                        <div class="flex-1">
                            <h5 class="m-0 mb-2">{{ selectedCollection.title }}</h5>
                            <p class="text-600 text-sm line-height-3">{{ selectedCollection.description }}</p>
                            <div class="flex gap-2 mt-2">
                                <Tag :value="`${selectedCollection.workCount} 个分集`" severity="info" />
                                <Tag :value="selectedCollection.isFinished ? '已完结' : '连载中'" :severity="selectedCollection.isFinished ? 'success' : 'warning'" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 分集列表 -->
            <div v-if="selectedCollection">
                <DataTable
                    v-model:selection="selectedEpisodes"
                    :value="episodes"
                    dataKey="_id"
                    :loading="episodeLoading"
                    :paginator="true"
                    :rows="pagination.pageSize"
                    :totalRecords="pagination.total"
                    :lazy="true"
                    @page="onPageChange"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    :rowsPerPageOptions="[10, 20, 50]"
                    currentPageReportTemplate="显示第 {first} 到 {last} 条，共 {totalRecords} 条记录"
                    responsiveLayout="scroll"
                    class="p-datatable-gridlines"
                >
                    <template #header>
                        <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
                            <h4 class="m-0">分集列表</h4>
                            <div class="flex gap-2 align-items-center">
                                <Dropdown v-model="filterParams.status" :options="filterStatusOptions" optionLabel="label" optionValue="value" placeholder="筛选状态" @change="onStatusFilterChange" style="min-width: 120px" />
                                <Button label="批量删除" icon="pi pi-trash" severity="danger" :disabled="!selectedEpisodes.length" />
                            </div>
                        </div>
                    </template>

                    <template #empty>
                        <div class="text-center py-6">
                            <i class="pi pi-video text-6xl text-surface-400 mb-3"></i>
                            <p class="text-surface-600 text-xl">暂无分集数据</p>
                            <Button label="上传第一个分集" icon="pi pi-plus" @click="openUploadDialog" />
                        </div>
                    </template>

                    <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>

                    <Column field="episodeNumber" header="集数" sortable style="width: 80px">
                        <template #body="slotProps">
                            <Badge :value="`第${slotProps.data.episodeNumber}集`" severity="primary" />
                        </template>
                    </Column>

                    <Column field="coverImage" header="封面" style="width: 60px">
                        <template #body="slotProps">
                            <div v-if="slotProps.data.coverImage">
                                <Image :src="getCoverImageUrl(slotProps.data.coverImage)" alt="Cover" width="40" height="50" preview class="border-round" />
                            </div>
                            <div v-else class="flex align-items-center justify-content-center w-3rem h-3rem bg-surface-200 border-round">
                                <i class="pi pi-image text-surface-600 text-lg"></i>
                            </div>
                        </template>
                    </Column>

                    <Column header="播放" style="width: 80px">
                        <template #body="slotProps">
                            <Button icon="pi pi-play" severity="success" size="small" @click="playEpisode(slotProps.data)" v-tooltip.top="'播放视频'" />
                        </template>
                    </Column>

                    <Column field="title" header="标题" sortable style="min-width: 200px">
                        <template #body="slotProps">
                            <div>
                                <div class="font-bold">{{ slotProps.data.title }}</div>
                                <div v-if="slotProps.data.description" class="text-sm text-600 mt-1">{{ slotProps.data.description?.substring(0, 50) }}...</div>
                            </div>
                        </template>
                    </Column>

                    <Column field="duration" header="时长" sortable style="min-width: 100px">
                        <template #body="slotProps">
                            {{ formatDuration(slotProps.data.duration) }}
                        </template>
                    </Column>

                    <Column field="status" header="状态" sortable style="min-width: 200px">
                        <template #body="slotProps">
                            <div class="flex flex-column gap-1">
                                <Tag :value="statusLabel(slotProps.data.status)" :severity="statusSeverity(slotProps.data.status)" />
                                <div v-if="slotProps.data.status === 'rejected' && slotProps.data.reviewNote" class="text-xs text-red-500">
                                    <div class="font-semibold">拒绝原因:</div>
                                    <div class="text-red-400">{{ slotProps.data.reviewNote }}</div>
                                    <div v-if="slotProps.data.reviewedAt" class="text-gray-500">
                                        {{ new Date(slotProps.data.reviewedAt).toLocaleDateString() }}
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <Column field="isPaid" header="付费设置" style="min-width: 120px">
                        <template #body="slotProps">
                            <div v-if="slotProps.data.isPaid">
                                <Tag value="付费" severity="warning" />
                                <div class="text-sm text-600">¥{{ slotProps.data.price }}</div>
                            </div>
                            <Tag v-else value="免费" severity="success" />
                        </template>
                    </Column>

                    <Column field="playCount" header="播放量" sortable style="min-width: 100px">
                        <template #body="slotProps">
                            <Badge :value="slotProps.data.playCount || 0" severity="info" />
                        </template>
                    </Column>

                    <Column :exportable="false" style="min-width: 150px">
                        <template #body="slotProps">
                            <div class="flex gap-2">
                                <Button v-if="slotProps.data.status !== 'rejected'" icon="pi pi-pencil" severity="info" size="small" @click="editEpisode(slotProps.data)" v-tooltip.top="'编辑分集'" />
                                <Button v-if="slotProps.data.status !== 'rejected'" icon="pi pi-dollar" severity="warning" size="small" @click="openPaymentDialog(slotProps.data)" v-tooltip.top="'付费设置'" />
                                <Button
                                    icon="pi pi-trash"
                                    :severity="slotProps.data.status === 'rejected' ? 'danger' : 'danger'"
                                    size="small"
                                    @click="confirmDeleteEpisode(slotProps.data)"
                                    v-tooltip.top="slotProps.data.status === 'rejected' ? '删除被拒分集' : '删除分集'"
                                />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </div>

            <div v-else class="text-center py-8">
                <i class="pi pi-video text-6xl text-surface-400 mb-3"></i>
                <p class="text-surface-600 text-xl">请先选择一个剧集合集</p>
            </div>
        </div>

        <!-- 上传分集对话框 -->
        <Dialog v-model:visible="uploadDialog" :style="{ width: '900px' }" header="上传新分集" :modal="true">
            <div class="grid">
                <div class="col-12 md:col-6">
                    <label for="title" class="block text-900 font-medium mb-2">分集标题 *</label>
                    <InputText id="title" v-model.trim="uploadForm.title" placeholder="请输入分集标题" class="w-full" :class="{ 'p-invalid': submitted && !uploadForm.title }" />
                    <small v-if="submitted && !uploadForm.title" class="p-error">标题不能为空</small>
                </div>

                <div class="col-12 md:col-3">
                    <label for="episodeNumber" class="block text-900 font-medium mb-2">集数 *</label>
                    <InputNumber id="episodeNumber" v-model="uploadForm.episodeNumber" mode="decimal" :min="1" placeholder="第几集" class="w-full" />
                </div>

                <div class="col-12 md:col-3">
                    <label for="duration" class="block text-900 font-medium mb-2">时长(秒)</label>
                    <InputNumber id="duration" v-model="uploadForm.duration" mode="decimal" :min="0" placeholder="自动获取" class="w-full" :disabled="true" />
                </div>

                <div class="col-12">
                    <label for="description" class="block text-900 font-medium mb-2">分集简介</label>
                    <Textarea id="description" v-model="uploadForm.description" rows="2" placeholder="请输入分集简介（选填）" class="w-full" />
                </div>

                <div class="col-12 md:col-6">
                    <label class="block text-900 font-medium mb-2">视频文件 *</label>
                    <FileUpload mode="basic" name="video" accept="video/*" :maxFileSize="500000000" chooseLabel="选择视频文件" @select="onVideoSelect" class="w-full" />
                    <small class="text-600">支持 MP4、AVI、MOV 等格式，最大 500MB</small>

                    <div v-if="uploadForm.videoFile" class="mt-2 p-2 bg-green-50 border-green-200 border-1 border-round">
                        <div class="text-sm font-medium text-green-700">{{ uploadForm.videoFile.name }}</div>
                        <div class="text-sm text-green-600">
                            {{ formatFileSize(uploadForm.videoFile.size) }}
                            <span v-if="uploadForm.duration > 0"> | {{ formatDuration(uploadForm.duration) }}</span>
                        </div>
                    </div>
                </div>

                <div class="col-12 md:col-6">
                    <label class="block text-900 font-medium mb-2">封面图片</label>
                    <FileUpload mode="basic" name="coverImage" accept="image/*" :maxFileSize="5000000" chooseLabel="选择封面图片" @select="onCoverSelect" class="w-full" />
                    <small class="text-600">支持 JPG、PNG 格式，最大 5MB</small>

                    <div v-if="uploadForm.coverImageFile" class="mt-2 p-2 bg-blue-50 border-blue-200 border-1 border-round">
                        <div class="text-sm font-medium text-blue-700">{{ uploadForm.coverImageFile.name }}</div>
                        <div class="text-sm text-blue-600">{{ formatFileSize(uploadForm.coverImageFile.size) }}</div>
                    </div>
                </div>

                <!-- 付费设置 -->
                <div class="col-12">
                    <Divider />
                    <h5>付费设置</h5>
                </div>

                <div class="col-12 md:col-4">
                    <div class="flex align-items-center">
                        <Checkbox id="isPaid" v-model="uploadForm.isPaid" binary />
                        <label for="isPaid" class="ml-2 font-medium">设为付费分集</label>
                    </div>
                </div>

                <div class="col-12 md:col-4" v-if="uploadForm.isPaid">
                    <label for="price" class="block text-900 font-medium mb-2">价格(元) *</label>
                    <InputNumber id="price" v-model="uploadForm.price" mode="currency" currency="CNY" locale="zh-CN" :min="0" placeholder="0.00" class="w-full" />
                </div>

                <div class="col-12 md:col-4">
                    <label for="freePreview" class="block text-900 font-medium mb-2">免费预览时长(秒)</label>
                    <InputNumber id="freePreview" v-model="uploadForm.freePreviewDuration" mode="decimal" :min="0" placeholder="0" class="w-full" />
                </div>

                <!-- 上传进度 -->
                <div v-if="uploading" class="col-12">
                    <Divider />
                    <div class="text-center">
                        <ProgressBar :value="uploadProgress" class="mb-3" />
                        <p class="text-600">正在上传... {{ Math.round(uploadProgress) }}%</p>
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="取消" icon="pi pi-times" severity="secondary" @click="uploadDialog = false" :disabled="uploading" />
                <Button label="上传分集" icon="pi pi-upload" @click="uploadEpisode" :loading="uploading" />
            </template>
        </Dialog>

        <!-- 编辑分集对话框 -->
        <Dialog v-model:visible="editDialog" :style="{ width: '600px' }" header="编辑分集信息" :modal="true">
            <div class="grid">
                <div class="col-12">
                    <label for="editTitle" class="block text-900 font-medium mb-2">分集标题 *</label>
                    <InputText id="editTitle" v-model.trim="editForm.title" placeholder="请输入分集标题" class="w-full" />
                </div>

                <div class="col-12 md:col-4">
                    <label for="editEpisodeNumber" class="block text-900 font-medium mb-2">集数 *</label>
                    <InputNumber id="editEpisodeNumber" v-model="editForm.episodeNumber" mode="decimal" :min="1" class="w-full" />
                </div>

                <div class="col-12 md:col-4">
                    <label for="editDuration" class="block text-900 font-medium mb-2">时长(秒)</label>
                    <InputNumber id="editDuration" v-model="editForm.duration" mode="decimal" :min="0" class="w-full" />
                </div>

                <div class="col-12 md:col-4">
                    <label for="editStatus" class="block text-900 font-medium mb-2">状态</label>
                    <Dropdown id="editStatus" v-model="editForm.status" :options="statusOptions" optionLabel="label" optionValue="value" class="w-full" />
                </div>

                <div class="col-12">
                    <label for="editDescription" class="block text-900 font-medium mb-2">分集简介</label>
                    <Textarea id="editDescription" v-model="editForm.description" rows="3" placeholder="请输入分集简介（选填）" class="w-full" />
                </div>
            </div>

            <template #footer>
                <Button label="取消" icon="pi pi-times" severity="secondary" @click="editDialog = false" />
                <Button label="保存" icon="pi pi-check" @click="saveEpisode" />
            </template>
        </Dialog>

        <!-- 付费设置对话框 -->
        <Dialog v-model:visible="paymentDialog" :style="{ width: '500px' }" header="付费设置" :modal="true">
            <div class="grid">
                <div class="col-12">
                    <div class="flex align-items-center mb-3">
                        <Checkbox id="paymentIsPaid" v-model="paymentForm.isPaid" binary />
                        <label for="paymentIsPaid" class="ml-2 font-medium">设为付费分集</label>
                    </div>
                </div>

                <div class="col-12" v-if="paymentForm.isPaid">
                    <label for="paymentPrice" class="block text-900 font-medium mb-2">价格(元) *</label>
                    <InputNumber id="paymentPrice" v-model="paymentForm.price" mode="currency" currency="CNY" locale="zh-CN" :min="0" placeholder="0.00" class="w-full" />
                </div>

                <div class="col-12">
                    <label for="paymentFreePreview" class="block text-900 font-medium mb-2">免费预览时长(秒)</label>
                    <InputNumber id="paymentFreePreview" v-model="paymentForm.freePreviewDuration" mode="decimal" :min="0" placeholder="0" class="w-full" />
                    <small class="text-600">0表示不提供免费预览</small>
                </div>
            </div>

            <template #footer>
                <Button label="取消" icon="pi pi-times" severity="secondary" @click="paymentDialog = false" />
                <Button label="保存" icon="pi pi-check" @click="savePaymentSettings" />
            </template>
        </Dialog>

        <!-- 播放对话框 -->
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

        <!-- 删除确认对话框 -->
        <Dialog v-model:visible="deleteDialog" :style="{ width: '450px' }" header="确认删除" :modal="true">
            <div class="confirmation-content">
                <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
                <span v-if="selectedEpisode">
                    您确定要删除分集 <b>第{{ selectedEpisode.episodeNumber }}集 - {{ selectedEpisode.title }}</b> 吗？
                </span>
            </div>
            <template #footer>
                <Button label="取消" icon="pi pi-times" severity="secondary" @click="deleteDialog = false" />
                <Button label="删除" icon="pi pi-check" severity="danger" @click="deleteEpisode" />
            </template>
        </Dialog>

        <!-- 合集选择器对话框 -->
        <Dialog v-model:visible="collectionSelectorVisible" :style="{ width: '800px' }" header="选择剧集合集" :modal="true" :closable="true" @hide="closeCollectionSelector">
            <div class="mb-4">
                <div class="flex gap-2">
                    <InputText v-model="collectionSearchText" placeholder="搜索合集标题..." class="flex-1" @keyup.enter="onCollectionSearch" />
                    <Button icon="pi pi-search" @click="onCollectionSearch" severity="primary" />
                </div>
            </div>

            <DataTable
                :value="collections"
                :loading="loading"
                :paginator="true"
                :rows="collectionPagination.pageSize"
                :totalRecords="collectionPagination.total"
                @page="onCollectionPageChange"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 20]"
                currentPageReportTemplate="显示第 {first} 到 {last} 条，共 {totalRecords} 条记录"
                responsiveLayout="scroll"
                selectionMode="single"
                v-model:selection="selectedCollection"
            >
                <Column field="title" header="合集标题" sortable>
                    <template #body="slotProps">
                        <div class="font-bold">{{ slotProps.data.title }}</div>
                    </template>
                </Column>

                <Column field="description" header="简介" style="max-width: 200px">
                    <template #body="slotProps">
                        <div class="text-sm text-600 line-height-2" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                            {{ slotProps.data.description }}
                        </div>
                    </template>
                </Column>

                <Column field="workCount" header="分集数" style="width: 80px">
                    <template #body="slotProps">
                        <Badge :value="`${slotProps.data.workCount}集`" severity="info" />
                    </template>
                </Column>

                <Column field="status" header="状态" style="width: 100px">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.isFinished ? '已完结' : '连载中'" :severity="slotProps.data.isFinished ? 'success' : 'warning'" />
                    </template>
                </Column>

                <Column header="操作" style="width: 100px">
                    <template #body="slotProps">
                        <Button icon="pi pi-check" severity="success" size="small" @click="selectCollectionFromSelector(slotProps.data)" v-tooltip.top="'选择此合集'" />
                    </template>
                </Column>
            </DataTable>

            <template #footer>
                <Button label="取消" icon="pi pi-times" severity="secondary" @click="closeCollectionSelector" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.episode-management {
    padding: 1rem;
}

.confirmation-content {
    display: flex;
    align-items: center;
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
