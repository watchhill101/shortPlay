<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import AdminService from '@/service/AdminService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const router = useRouter();
const toast = useToast();

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
            isFinished: collectionForm.isFinished,
            status: selectedCollection.value ? undefined : 'published' // 创建时默认为发布状态
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

// 智能PDF导出功能
const exportToPDF = async () => {
    if (selectedCollections.value.length === 0) {
        toast.add({
            severity: 'warn',
            summary: '警告',
            detail: '请先选择要导出的合集',
            life: 3000
        });
        return;
    }

    try {
        // 智能导出模式：根据选中数量自动切换导出格式
        if (selectedCollections.value.length === 1) {
            // 单合集模式：导出详细信息PDF（包含封面图片和剧集列表）
            await exportSingleCollectionDetail(selectedCollections.value[0]);
        } else {
            // 多合集模式：导出列表格式PDF
            await exportMultipleCollectionsList(selectedCollections.value);
        }
    } catch (error) {
        console.error('导出PDF失败:', error);
        toast.add({
            severity: 'error',
            summary: '错误',
            detail: '导出PDF失败',
            life: 3000
        });
    }
};

// 单合集详情导出 - 分页布局设计
const exportSingleCollectionDetail = async (collection) => {
    const doc = new jsPDF();

    // 第一页：合集基本信息（标题、封面、描述、分类、统计）
    const firstPageHtml = `
        <div style="font-family: 'Microsoft YaHei', 'SimSun', sans-serif; padding: 20px; width: 800px; background: #f8f9fa;">
            <!-- 标题区域 -->
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; font-size: 28px; margin: 0 0 10px 0; font-weight: 600;">${collection.title}</h1>
                <div style="width: 80px; height: 3px; background: #007bff; margin: 0 auto; border-radius: 2px;"></div>
            </div>
            
            <!-- 封面图片区域 -->
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="${collection.coverImage}" style="width: 300px; height: 400px; object-fit: cover; border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); display: block; margin: 0 auto;" />
            </div>
            
            <!-- 基本信息卡片 -->
            <div style="background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px;">
                <h3 style="color: #2c3e50; margin: 0 0 25px 0; font-size: 20px; font-weight: 600; display: flex; align-items: center;">
                    <span style="width: 4px; height: 24px; background: #007bff; margin-right: 12px; border-radius: 2px;"></span>
                    基本信息
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 20px;">
                    <div style="padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 3px solid #1976d2; text-align: center;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">分类</div>
                        <div style="font-size: 16px; font-weight: 600; color: #1976d2;">${collection.classifier?.name || '未分类'}</div>
                    </div>
                    <div style="padding: 15px; background: #e8f5e8; border-radius: 8px; border-left: 3px solid #28a745; text-align: center;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">剧集数</div>
                        <div style="font-size: 16px; font-weight: 600; color: #28a745;">${collection.workCount} 集</div>
                    </div>
                    <div style="padding: 15px; background: ${collection.status === 'published' ? '#e8f5e8' : '#fff3cd'}; border-radius: 8px; border-left: 3px solid ${collection.status === 'published' ? '#28a745' : '#ffc107'}; text-align: center;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">状态</div>
                        <div style="font-size: 16px; font-weight: 600; color: ${collection.status === 'published' ? '#28a745' : '#ffc107'};">${collection.status}</div>
                    </div>
                    <div style="padding: 15px; background: #f3e5f5; border-radius: 8px; border-left: 3px solid #e91e63; text-align: center;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">创建时间</div>
                        <div style="font-size: 16px; font-weight: 600; color: #e91e63;">${new Date(collection.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>
            
            <!-- 内容简介卡片 -->
            <div style="background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h3 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; display: flex; align-items: center;">
                    <span style="width: 4px; height: 24px; background: #ffc107; margin-right: 12px; border-radius: 2px;"></span>
                    内容简介
                </h3>
                <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; border-left: 3px solid #ffc107;">
                    <p style="font-size: 16px; line-height: 1.8; color: #495057; text-align: justify; margin: 0;">${collection.description || '暂无简介'}</p>
                </div>
            </div>
        </div>
    `;

    // 第二页：剧集列表表格
    const secondPageHtml = `
        <div style="font-family: 'Microsoft YaHei', 'SimSun', sans-serif; padding: 30px; max-width: 800px; background: #ffffff;">
            <h2 style="color: #333; text-align: center; margin-bottom: 30px; font-size: 24px;">剧集列表</h2>
            <div id="episodes-table" style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <p style="text-align: center; padding: 40px; color: #666;">正在加载剧集信息...</p>
            </div>
        </div>
    `;

    // 分离式渲染：两页内容分别生成，避免内容挤压
    const firstPageDiv = document.createElement('div');
    const secondPageDiv = document.createElement('div');

    firstPageDiv.innerHTML = firstPageHtml;
    secondPageDiv.innerHTML = secondPageHtml;

    // 设置样式
    [firstPageDiv, secondPageDiv].forEach((div) => {
        div.style.position = 'absolute';
        div.style.left = '-9999px';
        div.style.top = '0';
        div.style.width = '800px';
        document.body.appendChild(div);
    });

    try {
        // 加载剧集信息并生成表格
        const episodesResponse = await AdminService.getWorksByCollection(collection._id, { pageSize: 100 });
        if (episodesResponse.success && episodesResponse.data.length > 0) {
            const episodesTableHtml = `
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #007bff; color: white;">
                            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">集数</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">标题</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">时长</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">状态</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">创建时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${episodesResponse.data
                            .map(
                                (episode, index) => `
                            <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                                <td style="padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold; color: #007bff;">第${episode.episodeNumber}集</td>
                                <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">${episode.title}</td>
                                <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${formatDuration(episode.duration)}</td>
                                <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">
                                    <span style="background: ${episode.status === 'published' ? '#d4edda' : episode.status === 'pending' ? '#fff3cd' : '#f8d7da'}; 
                                        color: ${episode.status === 'published' ? '#155724' : episode.status === 'pending' ? '#856404' : '#721c24'}; 
                                        padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                        ${episode.status}
                                    </span>
                                </td>
                                <td style="padding: 10px; text-align: center; border: 1px solid #ddd; font-size: 12px; color: #666;">
                                    ${new Date(episode.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        `
                            )
                            .join('')}
                    </tbody>
                </table>
            `;

            const episodesTableDiv = secondPageDiv.querySelector('#episodes-table');
            if (episodesTableDiv) {
                episodesTableDiv.innerHTML = episodesTableHtml;
            }
        }

        // 等待DOM更新
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 分别生成图片 - 高质量渲染
        const options = {
            scale: 2, // 2倍分辨率
            useCORS: true, // 跨域支持
            backgroundColor: '#ffffff', // 白色背景
            allowTaint: true // 允许跨域图片
        };

        const firstPageCanvas = await html2canvas(firstPageDiv, options);
        const secondPageCanvas = await html2canvas(secondPageDiv, options);

        // 分别添加到PDF
        const imgWidth = 210;
        const firstPageImgData = firstPageCanvas.toDataURL('image/png');
        const secondPageImgData = secondPageCanvas.toDataURL('image/png');

        const firstPageImgHeight = (firstPageCanvas.height * imgWidth) / firstPageCanvas.width;
        const secondPageImgHeight = (secondPageCanvas.height * imgWidth) / secondPageCanvas.width;

        // 第一页
        doc.addImage(firstPageImgData, 'PNG', 0, 0, imgWidth, firstPageImgHeight);

        // 第二页
        doc.addPage();
        doc.addImage(secondPageImgData, 'PNG', 0, 0, imgWidth, secondPageImgHeight);

        doc.save(`${collection.title}_详情.pdf`);

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: 'PDF导出成功',
            life: 3000
        });
    } finally {
        document.body.removeChild(firstPageDiv);
        document.body.removeChild(secondPageDiv);
    }
};

// 多合集列表导出 - 表格格式
const exportMultipleCollectionsList = async (collections) => {
    const doc = new jsPDF();

    // 创建HTML内容
    const htmlContent = `
        <div style="font-family: 'Microsoft YaHei', 'SimSun', sans-serif; padding: 20px; max-width: 800px;">
            <h1 style="text-align: center; color: #333; margin-bottom: 30px;">合集列表</h1>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background: #007bff; color: white;">
                        <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">标题</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">分类</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">剧集数</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">状态</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">创建时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${collections
                        .map(
                            (collection, index) => `
                        <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                            <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">${collection.title}</td>
                            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${collection.classifier?.name || '未分类'}</td>
                            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${collection.workCount}</td>
                            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${collection.status}</td>
                            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${new Date(collection.createdAt).toLocaleDateString()}</td>
                        </tr>
                    `
                        )
                        .join('')}
                </tbody>
            </table>
        </div>
    `;

    // 创建临时容器
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '800px';
    document.body.appendChild(tempDiv);

    // 等待DOM更新
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 使用html2canvas渲染HTML为图片
    const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }

    doc.save('合集列表.pdf');

    // 清理临时元素
    document.body.removeChild(tempDiv);

    toast.add({
        severity: 'success',
        summary: '成功',
        detail: 'PDF导出成功',
        life: 3000
    });
};

// 时长格式化函数
const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : `${minutes}:${secs.toString().padStart(2, '0')}`;
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
                    <Button label="导出" icon="pi pi-upload" severity="help" :disabled="selectedCollections.length === 0" @click="exportToPDF" />
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
