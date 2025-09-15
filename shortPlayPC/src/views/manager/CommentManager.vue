<script setup>
import { CommentService } from '@/service/CommentService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Toolbar from 'primevue/toolbar';
import InputText from 'primevue/inputtext';
import InputIcon from 'primevue/inputicon';
import IconField from 'primevue/iconfield';
import Textarea from 'primevue/textarea';
import ProgressSpinner from 'primevue/progressspinner';
const toast = useToast();
const dt = ref();
const comments = ref([]);
const selectedComments = ref();
const deleteCommentDialog = ref(false);
const deleteCommentsDialog = ref(false);
const selectedComment = ref({});
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const notifyDialog = ref(false);
const notifyUserInfo = ref({});
const notifyMessage = ref('');
const loading = ref(true);

onMounted(() => {
    loadComments();
});

// 加载评论数据
async function loadComments() {
    loading.value = true;
    try {
        const params = {
            page: dt.value?.first ? Math.floor(dt.value.first / dt.value.rows) + 1 : 1,
            pageSize: dt.value?.rows || 10
        };

        console.log('加载评论，参数:', params);
        const response = await CommentService.getComments(params);

        if (response && Array.isArray(response.comments)) {
            comments.value = response.comments.map((comment) => {
                // 安全地处理日期，避免 RangeError
                let formattedCreateTime;
                try {
                    if (comment.createTime) {
                        const date = new Date(comment.createTime);
                        // 检查日期是否有效
                        if (!isNaN(date.getTime())) {
                            formattedCreateTime = date.toISOString();
                        } else {
                            console.warn('无效的日期格式:', comment.createTime);
                            formattedCreateTime = new Date().toISOString(); // 使用当前时间作为默认值
                        }
                    } else {
                        console.warn('缺少创建时间字段:', comment);
                        formattedCreateTime = new Date().toISOString(); // 使用当前时间作为默认值
                    }
                } catch (error) {
                    console.error('日期格式化失败:', error, '原始值:', comment.createTime);
                    formattedCreateTime = new Date().toISOString(); // 使用当前时间作为默认值
                }

                return {
                    ...comment,
                    createTime: formattedCreateTime
                };
            });
            console.log('评论数据加载成功:', comments.value);
        } else {
            console.warn('评论数据格式不正确:', response);
            comments.value = [];
        }
    } catch (error) {
        console.error('加载评论失败:', error);
        toast.add({ severity: 'error', summary: '错误', detail: '加载评论失败', life: 3000 });
        comments.value = [];
    } finally {
        loading.value = false;
    }
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(date);
}

// 查看视频
function viewVideo(workId) {
    if (!workId) {
        toast.add({ severity: 'warn', summary: '提示', detail: '无效的视频ID', life: 3000 });
        return;
    }
    toast.add({ severity: 'info', summary: '查看视频', detail: `正在跳转到视频: ${workId}`, life: 3000 });
    // TODO: 实际项目中可以跳转到视频详情页
    // router.push(`/video/${workId}`);
}

// 确认删除单条评论
function confirmDeleteComment(comment) {
    selectedComment.value = comment;
    deleteCommentDialog.value = true;
}

// 删除单条评论
async function deleteComment() {
    try {
        const response = await CommentService.deleteComment(selectedComment.value.id);
        if (response.success) {
            // 从列表中移除被删除的评论
            comments.value = comments.value.filter((val) => val.id !== selectedComment.value.id);
            deleteCommentDialog.value = false;
            selectedComment.value = {};

            // 显示成功消息，包含删除数量
            toast.add({
                severity: 'success',
                summary: '删除成功',
                detail: response.message,
                life: 3000
            });
        } else {
            throw new Error(response.message || '删除失败');
        }
    } catch (error) {
        console.error('删除评论失败:', error);
        toast.add({
            severity: 'error',
            summary: '删除失败',
            detail: error.message || '删除评论失败',
            life: 3000
        });
    }
}

// 确认删除选中评论
function confirmDeleteSelected() {
    deleteCommentsDialog.value = true;
}

// 删除选中评论
async function deleteSelectedComments() {
    try {
        if (selectedComments.value && selectedComments.value.length > 0) {
            let totalDeleted = 0;
            const results = await Promise.allSettled(selectedComments.value.map((comment) => CommentService.deleteComment(comment.id)));

            // 统计删除结果
            const successResults = results.filter((r) => r.status === 'fulfilled');
            const failedResults = results.filter((r) => r.status === 'rejected');

            // 计算总共删除的评论数（包括回复）
            totalDeleted = successResults.reduce((sum, result) => sum + (result.value.data.deletedCount || 1), 0);

            // 刷新评论列表
            await loadComments();

            // 重置选择状态
            deleteCommentsDialog.value = false;
            selectedComments.value = null;

            // 显示结果
            if (failedResults.length === 0) {
                toast.add({
                    severity: 'success',
                    summary: '删除成功',
                    detail: `成功删除${successResults.length}条评论及其${totalDeleted - successResults.length}条回复`,
                    life: 3000
                });
            } else {
                toast.add({
                    severity: 'warn',
                    summary: '部分成功',
                    detail: `成功${successResults.length}条，失败${failedResults.length}条`,
                    life: 3000
                });
            }
        }
    } catch (error) {
        console.error('批量删除评论失败:', error);
        toast.add({
            severity: 'error',
            summary: '删除失败',
            detail: '批量删除评论失败',
            life: 3000
        });
    }
}

// 通知用户
function notifyUser(comment) {
    notifyUserInfo.value = {
        id: comment.id, // 评论ID作为临时用户ID
        username: comment.username,
        userAvatar: comment.userAvatar
    };
    notifyMessage.value = '';
    notifyDialog.value = true;
}

// 发送通知
async function sendNotification() {
    try {
        if (notifyMessage.value.trim()) {
            const response = await CommentService.notifyRelatedUser(notifyUserInfo.value.id, notifyUserInfo.value.id, notifyMessage.value);

            if (response.success) {
                notifyDialog.value = false;
                notifyUserInfo.value = {};
                notifyMessage.value = '';
                toast.add({ severity: 'success', summary: '成功', detail: response.message, life: 3000 });
            } else {
                throw new Error(response.message || '发送通知失败');
            }
        }
    } catch (error) {
        console.error('发送通知失败:', error);
        toast.add({ severity: 'error', summary: '错误', detail: error.message || '发送通知失败', life: 3000 });
    }
}

// 导出CSV
function exportCSV() {
    dt.value.exportCSV();
}
</script>

<template>
    <div>
        <div class="card">
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="删除选中" icon="pi pi-trash" severity="danger" @click="confirmDeleteSelected" :disabled="!selectedComments || !selectedComments.length || loading" />
                </template>

                <template #end>
                    <Button label="导出" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" :disabled="loading" />
                </template>
            </Toolbar>

            <!-- 加载状态 -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-8">
                <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="3" />
                <span class="mt-4 text-gray-600">正在加载评论数据...</span>
            </div>

            <!-- 数据表格 -->
            <DataTable
                v-else
                ref="dt"
                v-model:selection="selectedComments"
                :value="comments"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="显示 {first} 到 {last} 条，共 {totalRecords} 条评论"
                :loading="loading"
                loadingIcon="pi pi-spinner"
            >
                <!-- 表格头部搜索 -->
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">评论管理</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="搜索评论内容、用户名或视频标题..." :disabled="loading" />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                <Column field="username" header="用户名" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        <div class="flex items-center">
                            {{ slotProps.data.username }}
                        </div>
                    </template>
                </Column>
                <!-- 视频标题列 -->
                <Column field="videoTitle" header="视频标题" sortable style="min-width: 16rem">
                    <template #body="slotProps">
                        <div class="flex flex-col gap-1">
                            <div class="flex items-center gap-2">
                                <span class="text-blue-600 hover:underline cursor-pointer" @click="viewVideo(slotProps.data.workId)">
                                    {{ slotProps.data.workInfo.collectionTitle }}
                                </span>
                                <span class="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded"> 第{{ slotProps.data.workInfo.episodeNumber }}集 </span>
                            </div>
                        </div>
                    </template>
                </Column>
                <Column field="createTime" header="评论时间" sortable style="min-width: 12rem">
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.createTime) }}
                    </template>
                </Column>
                <Column field="content" header="评论内容" style="min-width: 10rem">
                    <template #body="slotProps">
                        <div class="whitespace-pre-wrap break-words max-w-[400px]">{{ slotProps.data.content }}</div>
                    </template>
                </Column>
                <Column field="likeCount" header="点赞数" sortable style="min-width: 6rem" align="center"></Column>
                <Column field="replyCount" header="回复数" sortable style="min-width: 6rem" align="center"></Column>
                <Column :exportable="false" style="min-width: 12rem" align="center">
                    <template #body="slotProps">
                        <Button icon="pi pi-comment" outlined rounded class="mr-2" @click="notifyUser(slotProps.data)" tooltip="通知用户" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteComment(slotProps.data)" tooltip="删除评论" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- 空状态提示 -->
        <div v-if="!loading && (!comments || comments.length === 0)" class="flex flex-col items-center justify-center py-8 text-gray-500">
            <i class="pi pi-comments text-4xl mb-4"></i>
            <span>暂无评论数据</span>
        </div>

        <!-- 删除确认对话框 -->
        <Dialog v-model:visible="deleteCommentDialog" :style="{ width: '450px' }" header="确认删除" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl text-orange-500" />
                <div class="space-y-2">
                    <p>您确定要删除这条评论吗？</p>
                    <p class="text-sm text-gray-500">该评论下的所有回复也将被删除</p>
                </div>
            </div>
            <template #footer>
                <Button label="取消" icon="pi pi-times" text @click="deleteCommentDialog = false" />
                <Button label="确定" icon="pi pi-check" severity="danger" @click="deleteComment" />
            </template>
        </Dialog>

        <!-- 批量删除确认对话框 -->
        <Dialog v-model:visible="deleteCommentsDialog" :style="{ width: '450px' }" header="确认删除" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl text-orange-500" />
                <div class="space-y-2">
                    <p>您确定要删除选中的 {{ selectedComments ? selectedComments.length : 0 }} 条评论吗？</p>
                    <p class="text-sm text-gray-500">这些评论下的所有回复也将被删除</p>
                </div>
            </div>
            <template #footer>
                <Button label="取消" icon="pi pi-times" text @click="deleteCommentsDialog = false" />
                <Button label="确定" icon="pi pi-check" severity="danger" @click="deleteSelectedComments" />
            </template>
        </Dialog>

        <!-- 通知用户对话框 -->
        <Dialog v-model:visible="notifyDialog" :style="{ width: '450px' }" header="通知用户" :modal="true">
            <div class="space-y-4">
                <div>
                    <label class="block font-bold mb-2">用户名</label>
                    <div class="flex items-center">
                        <span>{{ notifyUserInfo.username }}</span>
                    </div>
                </div>
                <div>
                    <label for="notifyMessage" class="block font-bold mb-2">通知内容</label>
                    <Textarea id="notifyMessage" v-model="notifyMessage" rows="4" cols="30" placeholder="请输入通知内容..." fluid />
                </div>
            </div>
            <template #footer>
                <Button label="取消" icon="pi pi-times" text @click="notifyDialog = false" />
                <Button label="发送" icon="pi pi-check" @click="sendNotification" :disabled="!notifyMessage.trim()" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.card {
    margin-bottom: 2rem;
    min-height: 400px;
    /* 添加最小高度，避免加载时页面抖动 */
}

/* 调整表格样式 */
:deep(.p-datatable-header) {
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
}

:deep(.p-datatable-footer) {
    background-color: #f8fafc;
    border-top: 1px solid #e2e8f0;
}

/* 调整按钮样式 */
:deep(.p-button) {
    font-size: 0.875rem;
}

/* 调整对话框样式 */
:deep(.p-dialog-header) {
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
}

:deep(.p-dialog-footer) {
    background-color: #f8fafc;
    border-top: 1px solid #e2e8f0;
}

/* 加载动画样式 */
:deep(.p-progress-spinner) {
    animation: spinner 1s linear infinite;
}

@keyframes spinner {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>
