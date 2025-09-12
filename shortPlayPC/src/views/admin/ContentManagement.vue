<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import AdminService from '@/service/AdminService';

const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

// 数据定义
const collections = ref([]);
const loading = ref(false);
const totalRecords = ref(0);

// 分页和筛选
const pagination = reactive({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
});

const searchParams = reactive({
    search: '',
    status: 'all',
    classifier: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
});

// 状态选项
const statusOptions = [
    { label: '全部', value: 'all' },
    { label: '草稿', value: 'draft' },
    { label: '已发布', value: 'published' },
    { label: '已归档', value: 'archived' }
];

// 分类列表
const classifiers = ref([]);

// 对话框状态
const collectionDialog = ref(false);
const deleteDialog = ref(false);
const selectedCollections = ref([]);
const selectedCollection = ref(null);

// 表单数据
const collectionForm = reactive({
    title: '',
    description: '',
    classifier: null,
    actors: [],
    tags: [],
    isFinished: false,
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
            case 'archived':
                return 'danger';
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

        const params = {
            page: pagination.page,
            pageSize: pagination.pageSize,
            ...searchParams
        };

        // 移除空值参数
        Object.keys(params).forEach((key) => {
            if (params[key] === null || params[key] === undefined || params[key] === 'all') {
                delete params[key];
            }
        });

        const response = await AdminService.getCollections(params);

        if (response.success) {
            collections.value = response.data;
            if (response.pagination) {
                pagination.total = response.pagination.total;
                pagination.totalPages = response.pagination.totalPages;
                totalRecords.value = response.pagination.total;
            } else {
                // 如果没有分页信息，使用数据长度
                totalRecords.value = response.data.length;
                pagination.total = response.data.length;
            }
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

const loadClassifiers = async () => {
    try {
        const response = await AdminService.getClassifiers();
        if (response.success) {
            classifiers.value = [{ name: '全部分类', _id: 'all' }, ...response.data];
        }
    } catch (error) {
        console.error('加载分类失败:', error);
    }
};

const openNew = () => {
    resetForm();
    submitted.value = false;
    collectionDialog.value = true;
};

const editCollection = (collection) => {
    selectedCollection.value = { ...collection };
    collectionForm.title = collection.title;
    collectionForm.description = collection.description;
    collectionForm.classifier = collection.classifier._id;
    collectionForm.actors = [...collection.actors];
    collectionForm.tags = [...collection.tags];
    collectionForm.isFinished = collection.isFinished;
    collectionForm.coverImageFile = null;

    submitted.value = false;
    collectionDialog.value = true;
};

const confirmDeleteCollection = (collection) => {
    selectedCollection.value = collection;
    deleteDialog.value = true;
};

const deleteCollection = async () => {
    try {
        await AdminService.deleteCollection(selectedCollection.value._id);

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '合集删除成功',
            life: 3000
        });

        deleteDialog.value = false;
        selectedCollection.value = null;
        loadCollections();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '删除合集失败',
            life: 3000
        });
    }
};

const saveCollection = async () => {
    submitted.value = true;

    if (!collectionForm.title || !collectionForm.description || !collectionForm.classifier) {
        return;
    }

    try {
        const data = {
            title: collectionForm.title,
            description: collectionForm.description,
            classifier: collectionForm.classifier,
            actors: collectionForm.actors,
            tags: collectionForm.tags,
            isFinished: collectionForm.isFinished
        };

        if (selectedCollection.value) {
            // 更新
            await AdminService.updateCollection(selectedCollection.value._id, data, collectionForm.coverImageFile);

            toast.add({
                severity: 'success',
                summary: '成功',
                detail: '合集更新成功',
                life: 3000
            });
        } else {
            // 创建
            await AdminService.createCollection(data, collectionForm.coverImageFile);

            toast.add({
                severity: 'success',
                summary: '成功',
                detail: '合集创建成功',
                life: 3000
            });
        }

        collectionDialog.value = false;
        resetForm();
        loadCollections();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: selectedCollection.value ? '更新合集失败' : '创建合集失败',
            life: 3000
        });
    }
};

const resetForm = () => {
    selectedCollection.value = null;
    collectionForm.title = '';
    collectionForm.description = '';
    collectionForm.classifier = null;
    collectionForm.actors = [];
    collectionForm.tags = [];
    collectionForm.isFinished = false;
    collectionForm.coverImageFile = null;
    submitted.value = false;
};

const hideDialog = () => {
    collectionDialog.value = false;
    resetForm();
};

const onPageChange = (event) => {
    pagination.page = event.page + 1;
    pagination.pageSize = event.rows;
    loadCollections();
};

const onSearch = () => {
    pagination.page = 1;
    loadCollections();
};

const onReset = () => {
    searchParams.search = '';
    searchParams.status = 'all';
    searchParams.classifier = '';
    searchParams.sortBy = 'createdAt';
    searchParams.sortOrder = 'desc';
    pagination.page = 1;
    loadCollections();
};

const onFileSelect = (event) => {
    collectionForm.coverImageFile = event.files[0];
};

const viewWorks = (collection) => {
    router.push(`/admin/collections/${collection._id}/works`);
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
    loadCollections();
    loadClassifiers();
});
</script>

<template>
    <div class="content-management">
        <div class="card">
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="新建合集" icon="pi pi-plus" severity="success" class="mr-2" @click="openNew" />
                    <Button label="删除" icon="pi pi-trash" severity="danger" :disabled="!selectedCollections || !selectedCollections.length" />
                </template>

                <template #end>
                    <Button label="导出" icon="pi pi-upload" severity="help" />
                </template>
            </Toolbar>

            <!-- 搜索栏 -->
            <div class="p-6 bg-surface-50 border-round mb-6">
                <div class="grid">
                    <div class="col-12 md:col-4">
                        <label for="search" class="block text-900 font-medium mb-2">搜索关键词</label>
                        <InputText id="search" v-model="searchParams.search" placeholder="搜索标题或描述" class="w-full" />
                    </div>
                    <div class="col-12 md:col-3">
                        <label for="status" class="block text-900 font-medium mb-2">状态</label>
                        <Dropdown id="status" v-model="searchParams.status" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="选择状态" class="w-full" />
                    </div>
                    <div class="col-12 md:col-3">
                        <label for="classifier" class="block text-900 font-medium mb-2">分类</label>
                        <Dropdown id="classifier" v-model="searchParams.classifier" :options="classifiers" optionLabel="name" optionValue="_id" placeholder="选择分类" class="w-full" />
                    </div>
                    <div class="col-12 md:col-2 flex align-items-end gap-2">
                        <Button label="搜索" icon="pi pi-search" @click="onSearch" class="w-full" />
                        <Button label="重置" icon="pi pi-refresh" severity="secondary" @click="onReset" class="w-full" />
                    </div>
                </div>
            </div>

            <!-- 数据表格 -->
            <DataTable
                ref="dt"
                v-model:selection="selectedCollections"
                :value="collections"
                dataKey="_id"
                :loading="loading"
                :paginator="true"
                :rows="pagination.pageSize"
                :totalRecords="totalRecords"
                :lazy="true"
                @page="onPageChange"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25, 50]"
                currentPageReportTemplate="显示第 {first} 到 {last} 条，共 {totalRecords} 条记录"
                responsiveLayout="scroll"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
                        <h4 class="m-0">内容管理</h4>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>

                <Column field="coverImage" header="封面" style="width: 100px">
                    <template #body="slotProps">
                        <Image :src="slotProps.data.coverImage" alt="Cover" width="60" height="80" preview />
                    </template>
                </Column>

                <Column field="title" header="标题" sortable style="min-width: 200px">
                    <template #body="slotProps">
                        <div>
                            <div class="font-bold">{{ slotProps.data.title }}</div>
                            <div class="text-sm text-600 mt-1">{{ slotProps.data.description?.substring(0, 50) }}...</div>
                        </div>
                    </template>
                </Column>

                <Column field="classifier.name" header="分类" sortable style="min-width: 120px">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.classifier?.name" severity="info" />
                    </template>
                </Column>

                <Column field="workCount" header="剧集数" sortable style="min-width: 100px">
                    <template #body="slotProps">
                        <Badge :value="slotProps.data.workCount" severity="primary" />
                    </template>
                </Column>

                <Column field="status" header="状态" sortable style="min-width: 120px">
                    <template #body="slotProps">
                        <Tag :value="statusLabel(slotProps.data.status)" :severity="statusSeverity(slotProps.data.status)" />
                    </template>
                </Column>

                <Column field="isFinished" header="完结状态" style="min-width: 120px">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.isFinished ? '已完结' : '连载中'" :severity="slotProps.data.isFinished ? 'success' : 'warning'" />
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
                            <Button icon="pi pi-eye" severity="info" size="small" @click="viewWorks(slotProps.data)" v-tooltip.top="'查看剧集'" />
                            <Button icon="pi pi-pencil" severity="success" size="small" @click="editCollection(slotProps.data)" v-tooltip.top="'编辑'" />
                            <Button icon="pi pi-trash" severity="danger" size="small" @click="confirmDeleteCollection(slotProps.data)" v-tooltip.top="'删除'" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- 合集编辑对话框 -->
        <Dialog v-model:visible="collectionDialog" :style="{ width: '800px' }" header="合集信息" :modal="true">
            <div class="grid">
                <div class="col-12">
                    <label for="title" class="block text-900 font-medium mb-2">标题 *</label>
                    <InputText id="title" v-model.trim="collectionForm.title" required autofocus :class="{ 'p-invalid': submitted && !collectionForm.title }" class="w-full" placeholder="请输入合集标题" />
                    <small v-if="submitted && !collectionForm.title" class="p-error">标题不能为空</small>
                </div>

                <div class="col-12">
                    <label for="description" class="block text-900 font-medium mb-2">简介 *</label>
                    <Textarea id="description" v-model="collectionForm.description" required rows="3" :class="{ 'p-invalid': submitted && !collectionForm.description }" class="w-full" placeholder="请输入合集简介" />
                    <small v-if="submitted && !collectionForm.description" class="p-error">简介不能为空</small>
                </div>

                <div class="col-12 md:col-6">
                    <label for="classifier" class="block text-900 font-medium mb-2">分类 *</label>
                    <Dropdown id="classifier" v-model="collectionForm.classifier" :options="classifiers" optionLabel="name" optionValue="_id" placeholder="选择分类" :class="{ 'p-invalid': submitted && !collectionForm.classifier }" class="w-full" />
                    <small v-if="submitted && !collectionForm.classifier" class="p-error">请选择分类</small>
                </div>

                <div class="col-12 md:col-6">
                    <label for="isFinished" class="block text-900 font-medium mb-2">完结状态</label>
                    <div class="flex align-items-center mt-3">
                        <Checkbox id="isFinished" v-model="collectionForm.isFinished" binary />
                        <label for="isFinished" class="ml-2">已完结</label>
                    </div>
                </div>

                <div class="col-12">
                    <label for="actors" class="block text-900 font-medium mb-2">主演</label>
                    <Chips id="actors" v-model="collectionForm.actors" placeholder="输入主演姓名后按回车添加" class="w-full" />
                </div>

                <div class="col-12">
                    <label for="tags" class="block text-900 font-medium mb-2">标签</label>
                    <Chips id="tags" v-model="collectionForm.tags" placeholder="输入标签后按回车添加" class="w-full" />
                </div>

                <div class="col-12">
                    <label for="coverImage" class="block text-900 font-medium mb-2">封面图片</label>
                    <FileUpload mode="basic" name="coverImage" accept="image/*" :maxFileSize="5000000" chooseLabel="选择图片" @select="onFileSelect" class="w-full" />
                    <small class="text-600">支持 JPG、PNG 格式，文件大小不超过 5MB</small>
                </div>
            </div>

            <template #footer>
                <Button label="取消" icon="pi pi-times" severity="secondary" @click="hideDialog" />
                <Button label="保存" icon="pi pi-check" @click="saveCollection" />
            </template>
        </Dialog>

        <!-- 删除确认对话框 -->
        <Dialog v-model:visible="deleteDialog" :style="{ width: '450px' }" header="确认删除" :modal="true">
            <div class="confirmation-content">
                <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
                <span v-if="selectedCollection"
                    >您确定要删除合集 <b>{{ selectedCollection.title }}</b> 吗？</span
                >
            </div>
            <template #footer>
                <Button label="取消" icon="pi pi-times" severity="secondary" @click="deleteDialog = false" />
                <Button label="删除" icon="pi pi-check" severity="danger" @click="deleteCollection" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.content-management {
    padding: 1rem;
}

.confirmation-content {
    display: flex;
    align-items: center;
}
</style>
