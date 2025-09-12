<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
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
const reviewForm = reactive({
    status: '',
    reviewNote: ''
});

// 审核状态选项
const reviewStatusOptions = [
    { label: '通过发布', value: 'published' },
    { label: '拒绝归档', value: 'archived' }
];

// 计算属性
const statusSeverity = computed(() => {
    return (status) => {
        switch (status) {
            case 'published':
                return 'success';
            case 'draft':
                return 'warning';
            case 'archived':
                return 'danger';
            default:
                return 'info';
        }
    };
});

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

const openReviewDialog = (collection) => {
    selectedCollection.value = collection;
    reviewForm.status = '';
    reviewForm.reviewNote = '';
    reviewDialog.value = true;
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
    </div>
</template>

<style scoped>
.content-review {
    padding: 1rem;
}
</style>
