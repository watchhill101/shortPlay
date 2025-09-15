<script setup>
import { ref } from 'vue';
import { FilterMatchMode } from '@primevue/core/api';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputIcon from 'primevue/inputicon';
import IconField from 'primevue/iconfield';

const dt = ref();
const selectedOrders = ref();
const orders = ref([
    {
        orderId: 'SP20240312001',
        userName: '张小明',
        collectionTitle: '都市奇缘',
        episodeCount: 24,
        purchasedEpisodes: '1-12',
        amount: 29.9,
        status: 'completed',
        purchaseTime: '2024-03-12 14:30:22'
    },
    {
        orderId: 'SP20240312002',
        userName: '李华',
        collectionTitle: '仙侠奇缘',
        episodeCount: 36,
        purchasedEpisodes: '1-36',
        amount: 39.9,
        status: 'completed',
        purchaseTime: '2024-03-12 15:15:33'
    },
    {
        orderId: 'SP20240312003',
        userName: '王芳',
        collectionTitle: '青春校园',
        episodeCount: 18,
        purchasedEpisodes: '1-9',
        amount: 19.9,
        status: 'pending',
        purchaseTime: '2024-03-12 16:45:10'
    },
    {
        orderId: 'SP20240312004',
        userName: '刘晓红',
        collectionTitle: '商战传奇',
        episodeCount: 30,
        purchasedEpisodes: '1-30',
        amount: 35.9,
        status: 'completed',
        purchaseTime: '2024-03-12 17:20:45'
    }
]);

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const formatAmount = (amount) => {
    return `¥${amount.toFixed(2)}`;
};

const getStatusClass = (status) => {
    switch (status) {
        case 'completed':
            return 'bg-green-100 text-green-600';
        case 'pending':
            return 'bg-orange-100 text-orange-600';
        case 'failed':
            return 'bg-red-100 text-red-600';
        default:
            return 'bg-gray-100 text-gray-600';
    }
};

const getStatusText = (status) => {
    const statusMap = {
        completed: '已完成',
        pending: '待支付',
        failed: '已取消'
    };
    return statusMap[status] || status;
};

const exportCSV = () => {
    dt.value.exportCSV();
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(date);
};
</script>

<template>
    <div class="card">
        <Toolbar class="mb-6">
            <template #end>
                <Button label="导出" icon="pi pi-upload" severity="secondary" @click="exportCSV" />
            </template>
        </Toolbar>

        <DataTable
            ref="dt"
            :value="orders"
            :selection="selectedOrders"
            @update:selection="selectedOrders = $event"
            dataKey="orderId"
            :paginator="true"
            :rows="10"
            :filters="filters"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            :rowsPerPageOptions="[5, 10, 25]"
            currentPageReportTemplate="显示 {first} 到 {last} 条，共 {totalRecords} 条订单"
            responsiveLayout="scroll"
        >
            <template #header>
                <div class="flex flex-wrap gap-2 items-center justify-between">
                    <h4 class="m-0">订单管理</h4>
                    <IconField>
                        <InputIcon>
                            <i class="pi pi-search" />
                        </InputIcon>
                        <InputText v-model="filters['global'].value" placeholder="搜索订单号、用户名或短剧名称..." />
                    </IconField>
                </div>
            </template>

            <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
            <Column field="orderId" header="订单号" sortable style="min-width: 12rem">
                <template #body="slotProps">
                    <span class="font-medium text-blue-600">{{ slotProps.data.orderId }}</span>
                </template>
            </Column>
            <Column field="userName" header="用户" sortable style="min-width: 10rem"></Column>
            <Column field="collectionTitle" header="短剧名称" sortable style="min-width: 12rem"></Column>
            <Column field="purchasedEpisodes" header="购买集数" style="min-width: 12rem">
                <template #body="slotProps">
                    <span>{{ slotProps.data.purchasedEpisodes }}</span>
                    <span class="text-gray-500"> (共{{ slotProps.data.episodeCount }}集)</span>
                </template>
            </Column>
            <Column field="amount" header="金额" sortable style="min-width: 8rem" align="right">
                <template #body="slotProps">
                    <span class="text-red-600 font-medium">{{ formatAmount(slotProps.data.amount) }}</span>
                </template>
            </Column>
            <Column field="status" header="状态" sortable style="min-width: 8rem">
                <template #body="slotProps">
                    <span :class="['px-3 py-1 rounded-full text-sm', getStatusClass(slotProps.data.status)]">
                        {{ getStatusText(slotProps.data.status) }}
                    </span>
                </template>
            </Column>
            <Column field="purchaseTime" header="购买时间" sortable style="min-width: 12rem">
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.purchaseTime) }}
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<style scoped>
.card {
    background: var(--surface-card);
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
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

/* 调整搜索框样式 */
:deep(.p-input-icon-left) {
    width: 300px;
}

:deep(.p-input-icon-left i) {
    color: #64748b;
}

:deep(.p-inputtext) {
    padding-left: 2.5rem;
}

/* 调整分页器样式 */
:deep(.p-paginator) {
    background-color: transparent;
    padding: 1rem 0;
}

/* 调整表格行样式 */
:deep(.p-datatable-tbody > tr) {
    transition: background-color 0.2s;
}

:deep(.p-datatable-tbody > tr:hover) {
    background-color: #f8fafc;
}
</style>
