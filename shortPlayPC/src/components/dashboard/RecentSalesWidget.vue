<script setup>
import { ref } from 'vue';

const orders = ref([
    {
        orderId: 'SP20240312001',
        userName: '张小明',
        collectionTitle: '都市奇缘',
        amount: 29.9,
        status: 'completed',
        purchaseTime: '2024-03-12 14:30:22'
    },
    {
        orderId: 'SP20240312002',
        userName: '李华',
        collectionTitle: '仙侠奇缘',
        amount: 39.9,
        status: 'completed',
        purchaseTime: '2024-03-12 15:15:33'
    },
    {
        orderId: 'SP20240312003',
        userName: '王芳',
        collectionTitle: '青春校园',
        amount: 19.9,
        status: 'completed',
        purchaseTime: '2024-03-12 16:45:10'
    },
    {
        orderId: 'SP20240312004',
        userName: '刘晓红',
        collectionTitle: '商战传奇',
        amount: 35.9,
        status: 'completed',
        purchaseTime: '2024-03-12 17:20:45'
    }
]);

const formatAmount = (amount) => {
    return `¥${amount.toFixed(2)}`;
};

const getStatusClass = (status) => {
    switch (status) {
        case 'completed':
            return 'bg-green-100 text-green-700';
        case 'pending':
            return 'bg-yellow-100 text-yellow-700';
        case 'failed':
            return 'bg-red-100 text-red-700';
        default:
            return 'bg-gray-100 text-gray-700';
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
</script>

<template>
    <div class="card">
        <div class="flex justify-between mb-4">
            <div>
                <span class="block text-900 font-medium text-xl mb-2">最近订单</span>
                <div class="text-500">用户购买短剧订单记录</div>
            </div>
            <router-link to="/manager/order" class="text-blue-500 hover:text-blue-600 flex items-center">
                查看更多
                <i class="pi pi-arrow-right ml-1"></i>
            </router-link>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full">
                <thead>
                    <tr class="border-b border-gray-200">
                        <th class="text-left py-3 px-3">订单号</th>
                        <th class="text-left py-3 px-3">用户</th>
                        <th class="text-left py-3 px-3">短剧名称</th>
                        <th class="text-right py-3 px-3">金额</th>
                        <th class="text-left py-3 px-3">状态</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="order in orders" :key="order.orderId" class="border-b border-gray-100 hover:bg-gray-50">
                        <td class="py-3 px-3">
                            <span class="text-blue-600 font-medium">{{ order.orderId }}</span>
                        </td>
                        <td class="py-3 px-3">
                            <span class="font-medium">{{ order.userName }}</span>
                        </td>
                        <td class="py-3 px-3">{{ order.collectionTitle }}</td>
                        <td class="py-3 px-3 text-right font-medium">{{ formatAmount(order.amount) }}</td>
                        <td class="py-3 px-3">
                            <span :class="[getStatusClass(order.status), 'px-2 py-1 rounded-full text-sm']">
                                {{ getStatusText(order.status) }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
.card {
    background: var(--surface-card);
    padding: 1.5rem;
    margin-bottom: 1rem;
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
}

th {
    font-weight: 600;
    color: var(--text-900);
}

td {
    color: var(--text-700);
}

.hover\:bg-gray-50:hover {
    background-color: var(--surface-hover);
}
</style>
