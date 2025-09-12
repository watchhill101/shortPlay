<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import AdminService from '@/service/AdminService';

const toast = useToast();
const confirm = useConfirm();

// 数据定义
const classifiers = ref([]);
const loading = ref(false);

// 对话框状态
const classifierDialog = ref(false);
const deleteDialog = ref(false);
const selectedClassifier = ref(null);

// 表单数据
const classifierForm = reactive({
    name: '',
    description: '',
    status: 'active',
    sortOrder: 0
});

const submitted = ref(false);

// 状态选项
const statusOptions = [
    { label: '启用', value: 'active' },
    { label: '禁用', value: 'inactive' }
];

// 计算属性
const statusSeverity = computed(() => {
    return (status) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'inactive':
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
const loadClassifiers = async () => {
    try {
        loading.value = true;

        const response = await AdminService.getClassifiers();

        if (response.success) {
            classifiers.value = response.data.sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '加载分类列表失败',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const openNew = () => {
    resetForm();
    // 设置默认排序：当前分类数量 + 1
    classifierForm.sortOrder = classifiers.value.length + 1;

    submitted.value = false;
    classifierDialog.value = true;
};

const editClassifier = (classifier) => {
    selectedClassifier.value = { ...classifier };
    classifierForm.name = classifier.name;
    classifierForm.description = classifier.description;
    classifierForm.status = classifier.status;
    classifierForm.sortOrder = classifier.sortOrder || 0;

    submitted.value = false;
    classifierDialog.value = true;
};

const confirmDeleteClassifier = (classifier) => {
    selectedClassifier.value = classifier;
    deleteDialog.value = true;
};

const deleteClassifier = async () => {
    try {
        await AdminService.deleteClassifier(selectedClassifier.value._id);

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '分类删除成功',
            life: 3000
        });

        deleteDialog.value = false;
        selectedClassifier.value = null;
        loadClassifiers();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '删除分类失败',
            life: 3000
        });
    }
};

const saveClassifier = async () => {
    submitted.value = true;

    if (!classifierForm.name) {
        return;
    }

    try {
        const data = {
            name: classifierForm.name,
            description: classifierForm.description,
            status: classifierForm.status,
            sortOrder: classifierForm.sortOrder
        };

        if (selectedClassifier.value) {
            // 更新
            await AdminService.updateClassifier(selectedClassifier.value._id, data);

            toast.add({
                severity: 'success',
                summary: '成功',
                detail: '分类更新成功',
                life: 3000
            });
        } else {
            // 创建
            await AdminService.createClassifier(data);

            toast.add({
                severity: 'success',
                summary: '成功',
                detail: '分类创建成功',
                life: 3000
            });
        }

        classifierDialog.value = false;
        resetForm();
        loadClassifiers();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: selectedClassifier.value ? '更新分类失败' : '创建分类失败',
            life: 3000
        });
    }
};

const resetForm = () => {
    selectedClassifier.value = null;
    classifierForm.name = '';
    classifierForm.description = '';
    classifierForm.status = 'active';
    classifierForm.sortOrder = 0;
    submitted.value = false;
};

const hideDialog = () => {
    classifierDialog.value = false;
    resetForm();
};

const moveUp = async (classifier) => {
    const currentIndex = classifiers.value.findIndex((c) => c._id === classifier._id);
    if (currentIndex > 0) {
        const prevClassifier = classifiers.value[currentIndex - 1];
        const tempOrder = classifier.order;

        try {
            // 交换排序
            await AdminService.updateClassifier(classifier._id, {
                ...classifier,
                order: prevClassifier.order
            });
            await AdminService.updateClassifier(prevClassifier._id, {
                ...prevClassifier,
                order: tempOrder
            });

            loadClassifiers();
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: '错误',
                detail: '调整排序失败',
                life: 3000
            });
        }
    }
};

const moveDown = async (classifier) => {
    const currentIndex = classifiers.value.findIndex((c) => c._id === classifier._id);
    if (currentIndex < classifiers.value.length - 1) {
        const nextClassifier = classifiers.value[currentIndex + 1];
        const tempOrder = classifier.order;

        try {
            // 交换排序
            await AdminService.updateClassifier(classifier._id, {
                ...classifier,
                order: nextClassifier.order
            });
            await AdminService.updateClassifier(nextClassifier._id, {
                ...nextClassifier,
                order: tempOrder
            });

            loadClassifiers();
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: '错误',
                detail: '调整排序失败',
                life: 3000
            });
        }
    }
};

const toggleStatus = async (classifier) => {
    try {
        const newStatus = classifier.status === 'active' ? 'inactive' : 'active';
        await AdminService.updateClassifier(classifier._id, {
            ...classifier,
            status: newStatus
        });

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: `分类已${newStatus === 'active' ? '启用' : '禁用'}`,
            life: 3000
        });

        loadClassifiers();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '状态切换失败',
            life: 3000
        });
    }
};

// 生命周期
onMounted(() => {
    loadClassifiers();
});
</script>

<template>
    <div class="category-management">
        <div class="card">
            <div class="flex align-items-center justify-content-between mb-4">
                <div>
                    <h3 class="m-0">分类管理</h3>
                    <p class="text-600 m-0 mt-1">管理剧集分类和标签</p>
                </div>
            </div>

            <Toolbar class="mb-6">
                <template #start>
                    <Button label="新建分类" icon="pi pi-plus" severity="success" @click="openNew" />
                </template>

                <template #end>
                    <Button label="刷新" icon="pi pi-refresh" severity="secondary" @click="loadClassifiers" />
                </template>
            </Toolbar>

            <!-- 数据表格 -->
            <DataTable :value="classifiers" :loading="loading" responsiveLayout="scroll" class="p-datatable-gridlines">
                <template #header>
                    <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
                        <h4 class="m-0">分类列表</h4>
                        <span class="text-600">共 {{ classifiers.length }} 个分类</span>
                    </div>
                </template>

                <template #empty>
                    <div class="text-center py-6">
                        <i class="pi pi-folder-open text-6xl text-surface-400 mb-3"></i>
                        <p class="text-surface-600 text-xl">暂无分类数据</p>
                    </div>
                </template>

                <Column field="name" header="分类名称" style="min-width: 200px">
                    <template #body="slotProps">
                        <div class="font-bold text-lg">{{ slotProps.data.name }}</div>
                    </template>
                </Column>

                <Column field="description" header="分类描述" style="min-width: 250px">
                    <template #body="slotProps">
                        <div class="text-sm text-600">
                            {{ slotProps.data.description || '暂无描述' }}
                        </div>
                    </template>
                </Column>

                <Column field="status" header="状态" style="min-width: 120px">
                    <template #body="slotProps">
                        <Tag :value="statusLabel(slotProps.data.status)" :severity="statusSeverity(slotProps.data.status)" />
                    </template>
                </Column>

                <Column field="collectionCount" header="使用次数" style="min-width: 120px">
                    <template #body="slotProps">
                        <Badge :value="slotProps.data.collectionCount || 0" severity="primary" />
                    </template>
                </Column>

                <Column field="createdAt" header="创建时间" style="min-width: 150px">
                    <template #body="slotProps">
                        <div>
                            <div>{{ new Date(slotProps.data.createdAt).toLocaleDateString('zh-CN') }}</div>
                            <div class="text-sm text-600">{{ new Date(slotProps.data.createdAt).toLocaleTimeString('zh-CN') }}</div>
                        </div>
                    </template>
                </Column>

                <Column :exportable="false" style="min-width: 180px">
                    <template #body="slotProps">
                        <div class="flex gap-2">
                            <Button
                                :icon="slotProps.data.status === 'active' ? 'pi pi-eye-slash' : 'pi pi-eye'"
                                :severity="slotProps.data.status === 'active' ? 'warning' : 'success'"
                                size="small"
                                @click="toggleStatus(slotProps.data)"
                                :v-tooltip.top="slotProps.data.status === 'active' ? '禁用' : '启用'"
                            />
                            <Button icon="pi pi-pencil" severity="info" size="small" @click="editClassifier(slotProps.data)" v-tooltip.top="'编辑'" />
                            <Button icon="pi pi-trash" severity="danger" size="small" @click="confirmDeleteClassifier(slotProps.data)" v-tooltip.top="'删除'" :disabled="(slotProps.data.collectionCount || 0) > 0" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- 分类编辑对话框 -->
        <Dialog v-model:visible="classifierDialog" :style="{ width: '600px' }" header="分类信息" :modal="true">
            <div class="grid">
                <div class="col-12">
                    <label for="name" class="block text-900 font-medium mb-2">分类名称 *</label>
                    <InputText id="name" v-model.trim="classifierForm.name" required autofocus :class="{ 'p-invalid': submitted && !classifierForm.name }" class="w-full" placeholder="请输入分类名称" />
                    <small v-if="submitted && !classifierForm.name" class="p-error">分类名称不能为空</small>
                </div>

                <div class="col-12">
                    <label for="description" class="block text-900 font-medium mb-2">分类描述</label>
                    <Textarea id="description" v-model="classifierForm.description" rows="3" class="w-full" placeholder="请输入分类描述（选填）" />
                </div>

                <div class="col-12 md:col-6">
                    <label for="status" class="block text-900 font-medium mb-2">状态</label>
                    <Dropdown id="status" v-model="classifierForm.status" :options="statusOptions" optionLabel="label" optionValue="value" class="w-full" />
                </div>

                <div class="col-12 md:col-6">
                    <label for="order" class="block text-900 font-medium mb-2">排序</label>
                    <InputNumber id="order" v-model="classifierForm.order" mode="decimal" :min="0" class="w-full" placeholder="排序值" />
                    <small class="text-600">数字越小排序越靠前</small>
                </div>
            </div>

            <template #footer>
                <Button label="取消" icon="pi pi-times" severity="secondary" @click="hideDialog" />
                <Button label="保存" icon="pi pi-check" @click="saveClassifier" />
            </template>
        </Dialog>

        <!-- 删除确认对话框 -->
        <Dialog v-model:visible="deleteDialog" :style="{ width: '450px' }" header="确认删除" :modal="true">
            <div class="confirmation-content">
                <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
                <span v-if="selectedClassifier">
                    您确定要删除分类 <b>{{ selectedClassifier.name }}</b> 吗？
                    <br />
                    <small class="text-600">删除后无法恢复，请谨慎操作。</small>
                </span>
            </div>
            <template #footer>
                <Button label="取消" icon="pi pi-times" severity="secondary" @click="deleteDialog = false" />
                <Button label="删除" icon="pi pi-check" severity="danger" @click="deleteClassifier" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.category-management {
    padding: 1rem;
}

.confirmation-content {
    display: flex;
    align-items: flex-start;
}
</style>
