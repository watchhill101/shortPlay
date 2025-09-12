<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import AdminService from '@/service/AdminService';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

// 获取合集ID
const collectionId = computed(() => route.params.id);

// 数据定义
const collection = ref(null);
const works = ref([]);
const loading = ref(false);
const totalRecords = ref(0);

// 分页
const pagination = reactive({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
});

const searchParams = reactive({
    status: 'all'
});

// 状态选项
const statusOptions = [
    { label: '全部', value: 'all' },
    { label: '草稿', value: 'draft' },
    { label: '已发布', value: 'published' }
];

// 对话框状态
const workDialog = ref(false);
const deleteDialog = ref(false);
const selectedWorks = ref([]);
const selectedWork = ref(null);

// 表单数据
const workForm = reactive({
    title: '',
    episodeNumber: null,
    duration: null,
    status: 'draft',
    videoFile: null,
    coverImageFile: null
});

const submitted = ref(false);

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
const loadCollection = async () => {
    try {
        const response = await AdminService.getCollection(collectionId.value);
        if (response.success) {
            collection.value = response.data;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '加载合集信息失败',
            life: 3000
        });
    }
};

const loadWorks = async () => {
    try {
        loading.value = true;

        const params = {
            page: pagination.page,
            pageSize: pagination.pageSize,
            ...searchParams
        };

        // 移除空值参数
        Object.keys(params).forEach((key) => {
            if (!params[key] || params[key] === 'all') {
                delete params[key];
            }
        });

        const response = await AdminService.getWorks(collectionId.value, params);

        if (response.success) {
            works.value = response.data;
            pagination.total = response.pagination.total;
            pagination.totalPages = response.pagination.totalPages;
            totalRecords.value = response.pagination.total;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '加载作品列表失败',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const openNew = () => {
    resetForm();
    // 自动设置下一个剧集编号
    if (works.value.length > 0) {
        const maxEpisode = Math.max(...works.value.map((w) => w.episodeNumber));
        workForm.episodeNumber = maxEpisode + 1;
    } else {
        workForm.episodeNumber = 1;
    }
    submitted.value = false;
    workDialog.value = true;
};

const editWork = (work) => {
    selectedWork.value = { ...work };
    workForm.title = work.title;
    workForm.episodeNumber = work.episodeNumber;
    workForm.duration = work.duration;
    workForm.status = work.status;
    workForm.videoFile = null;
    workForm.coverImageFile = null;

    submitted.value = false;
    workDialog.value = true;
};

const confirmDeleteWork = (work) => {
    selectedWork.value = work;
    deleteDialog.value = true;
};

const deleteWork = async () => {
    try {
        await AdminService.deleteWork(selectedWork.value._id);

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '作品删除成功',
            life: 3000
        });

        deleteDialog.value = false;
        selectedWork.value = null;
        loadWorks();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '删除作品失败',
            life: 3000
        });
    }
};

const saveWork = async () => {
    submitted.value = true;

    if (!workForm.title || !workForm.episodeNumber || !workForm.duration) {
        return;
    }

    try {
        const data = {
            title: workForm.title,
            episodeNumber: workForm.episodeNumber,
            duration: workForm.duration,
            status: workForm.status
        };

        if (selectedWork.value) {
            // 更新
            await AdminService.updateWork(selectedWork.value._id, data, workForm.videoFile, workForm.coverImageFile);

            toast.add({
                severity: 'success',
                summary: '成功',
                detail: '作品更新成功',
                life: 3000
            });
        } else {
            // 创建
            await AdminService.createWork(collectionId.value, data, workForm.videoFile, workForm.coverImageFile);

            toast.add({
                severity: 'success',
                summary: '成功',
                detail: '作品创建成功',
                life: 3000
            });
        }

        workDialog.value = false;
        resetForm();
        loadWorks();
        // 重新加载合集信息以更新作品数量
        loadCollection();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: selectedWork.value ? '更新作品失败' : '创建作品失败',
            life: 3000
        });
    }
};

const resetForm = () => {
    selectedWork.value = null;
    workForm.title = '';
    workForm.episodeNumber = null;
    workForm.duration = null;
    workForm.status = 'draft';
    workForm.videoFile = null;
    workForm.coverImageFile = null;
    submitted.value = false;
};

const hideDialog = () => {
    workDialog.value = false;
    resetForm();
};

const onPageChange = (event) => {
    pagination.page = event.page + 1;
    pagination.pageSize = event.rows;
    loadWorks();
};

const onSearch = () => {
    pagination.page = 1;
    loadWorks();
};

const onVideoSelect = (event) => {
    workForm.videoFile = event.files[0];
};

const onCoverSelect = (event) => {
    workForm.coverImageFile = event.files[0];
};

const goBack = () => {
    router.push('/admin/content-management');
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

// 生命周期
onMounted(() => {
    loadCollection();
    loadWorks();
});
</script>

<template>
    <div class="works-management">
        <div class="card">
            <!-- 面包屑导航 -->
            <div class="flex align-items-center justify-content-between mb-4">
                <div class="flex align-items-center">
                    <Button icon="pi pi-arrow-left" severity="secondary" text @click="goBack" class="mr-2" />
                    <div>
                        <h3 class="m-0">{{ collection?.title }} - 剧集管理</h3>
                        <p class="text-600 m-0 mt-1">{{ collection?.description }}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <Tag :value="`${collection?.workCount || 0} 个剧集`" severity="info" />
                    <Tag :value="collection?.isFinished ? '已完结' : '连载中'" :severity="collection?.isFinished ? 'success' : 'warning'" />
                </div>
            </div>

            <Toolbar class="mb-6">
                <template #start>
                    <Button label="新增剧集" icon="pi pi-plus" severity="success" class="mr-2" @click="openNew" />
                    <Button label="批量删除" icon="pi pi-trash" severity="danger" :disabled="!selectedWorks || !selectedWorks.length" />
                </template>

                <template #end>
                    <div class="flex gap-2 align-items-center">
                        <label for="statusFilter" class="text-900">状态筛选:</label>
                        <Dropdown id="statusFilter" v-model="searchParams.status" :options="statusOptions" optionLabel="label" optionValue="value" @change="onSearch" class="w-10rem" />
                    </div>
                </template>
            </Toolbar>

            <!-- 数据表格 -->
            <DataTable
                ref="dt"
                v-model:selection="selectedWorks"
                :value="works"
                dataKey="_id"
                :loading="loading"
                :paginator="true"
                :rows="pagination.pageSize"
                :totalRecords="totalRecords"
                :lazy="true"
                @page="onPageChange"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[10, 20, 50]"
                currentPageReportTemplate="显示第 {first} 到 {last} 条，共 {totalRecords} 条记录"
                responsiveLayout="scroll"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
                        <h4 class="m-0">剧集列表</h4>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>

                <Column field="episodeNumber" header="集数" sortable style="width: 80px">
                    <template #body="slotProps">
                        <Badge :value="`第${slotProps.data.episodeNumber}集`" severity="primary" />
                    </template>
                </Column>

                <Column field="coverImage" header="封面" style="width: 100px">
                    <template #body="slotProps">
                        <div v-if="slotProps.data.coverImage">
                            <Image :src="slotProps.data.coverImage" alt="Cover" width="60" height="80" preview />
                        </div>
                        <div v-else class="flex align-items-center justify-content-center w-4rem h-4rem bg-surface-200 border-round">
                            <i class="pi pi-image text-surface-600"></i>
                        </div>
                    </template>
                </Column>

                <Column field="title" header="标题" sortable style="min-width: 200px">
                    <template #body="slotProps">
                        <div class="font-bold">{{ slotProps.data.title }}</div>
                    </template>
                </Column>

                <Column field="duration" header="时长" sortable style="min-width: 100px">
                    <template #body="slotProps">
                        {{ formatDuration(slotProps.data.duration) }}
                    </template>
                </Column>

                <Column field="status" header="状态" sortable style="min-width: 120px">
                    <template #body="slotProps">
                        <Tag :value="statusLabel(slotProps.data.status)" :severity="statusSeverity(slotProps.data.status)" />
                    </template>
                </Column>

                <Column field="playCount" header="播放量" sortable style="min-width: 100px">
                    <template #body="slotProps">
                        <Badge :value="slotProps.data.playCount || 0" severity="info" />
                    </template>
                </Column>

                <Column field="likeCount" header="点赞数" sortable style="min-width: 100px">
                    <template #body="slotProps">
                        <Badge :value="slotProps.data.likeCount || 0" severity="success" />
                    </template>
                </Column>

                <Column field="createdAt" header="创建时间" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        {{ new Date(slotProps.data.createdAt).toLocaleDateString('zh-CN') }}
                    </template>
                </Column>

                <Column :exportable="false" style="min-width: 120px">
                    <template #body="slotProps">
                        <div class="flex gap-2">
                            <Button icon="pi pi-play" severity="info" size="small" v-tooltip.top="'预览'" />
                            <Button icon="pi pi-pencil" severity="success" size="small" @click="editWork(slotProps.data)" v-tooltip.top="'编辑'" />
                            <Button icon="pi pi-trash" severity="danger" size="small" @click="confirmDeleteWork(slotProps.data)" v-tooltip.top="'删除'" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- 作品编辑对话框 -->
        <Dialog v-model:visible="workDialog" :style="{ width: '700px' }" header="剧集信息" :modal="true">
            <div class="grid">
                <div class="col-12">
                    <label for="title" class="block text-900 font-medium mb-2">标题 *</label>
                    <InputText id="title" v-model.trim="workForm.title" required autofocus :class="{ 'p-invalid': submitted && !workForm.title }" class="w-full" placeholder="请输入剧集标题" />
                    <small v-if="submitted && !workForm.title" class="p-error">标题不能为空</small>
                </div>

                <div class="col-12 md:col-4">
                    <label for="episodeNumber" class="block text-900 font-medium mb-2">集数 *</label>
                    <InputNumber id="episodeNumber" v-model="workForm.episodeNumber" mode="decimal" :min="1" :class="{ 'p-invalid': submitted && !workForm.episodeNumber }" class="w-full" placeholder="集数" />
                    <small v-if="submitted && !workForm.episodeNumber" class="p-error">请输入集数</small>
                </div>

                <div class="col-12 md:col-4">
                    <label for="duration" class="block text-900 font-medium mb-2">时长(秒) *</label>
                    <InputNumber id="duration" v-model="workForm.duration" mode="decimal" :min="1" :class="{ 'p-invalid': submitted && !workForm.duration }" class="w-full" placeholder="视频时长" />
                    <small v-if="submitted && !workForm.duration" class="p-error">请输入时长</small>
                </div>

                <div class="col-12 md:col-4">
                    <label for="status" class="block text-900 font-medium mb-2">状态</label>
                    <Dropdown id="status" v-model="workForm.status" :options="statusOptions.filter((s) => s.value !== 'all')" optionLabel="label" optionValue="value" class="w-full" />
                </div>

                <div class="col-12">
                    <label for="video" class="block text-900 font-medium mb-2">视频文件</label>
                    <FileUpload mode="basic" name="video" accept="video/*" :maxFileSize="500000000" chooseLabel="选择视频" @select="onVideoSelect" class="w-full" />
                    <small class="text-600">支持 MP4、AVI、MOV 等格式，文件大小不超过 500MB</small>
                </div>

                <div class="col-12">
                    <label for="coverImage" class="block text-900 font-medium mb-2">封面图片</label>
                    <FileUpload mode="basic" name="coverImage" accept="image/*" :maxFileSize="5000000" chooseLabel="选择封面" @select="onCoverSelect" class="w-full" />
                    <small class="text-600">支持 JPG、PNG 格式，文件大小不超过 5MB（不上传将使用合集封面）</small>
                </div>
            </div>

            <template #footer>
                <Button label="取消" icon="pi pi-times" severity="secondary" @click="hideDialog" />
                <Button label="保存" icon="pi pi-check" @click="saveWork" />
            </template>
        </Dialog>

        <!-- 删除确认对话框 -->
        <Dialog v-model:visible="deleteDialog" :style="{ width: '450px' }" header="确认删除" :modal="true">
            <div class="confirmation-content">
                <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
                <span v-if="selectedWork"
                    >您确定要删除剧集 <b>第{{ selectedWork.episodeNumber }}集 - {{ selectedWork.title }}</b> 吗？</span
                >
            </div>
            <template #footer>
                <Button label="取消" icon="pi pi-times" severity="secondary" @click="deleteDialog = false" />
                <Button label="删除" icon="pi pi-check" severity="danger" @click="deleteWork" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.works-management {
    padding: 1rem;
}

.confirmation-content {
    display: flex;
    align-items: center;
}
</style>
