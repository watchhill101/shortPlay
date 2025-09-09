<script setup>
import { ref } from 'vue';

const items = ref([
    {
        label: '更新',
        icon: 'pi pi-refresh'
    },
    {
        label: '删除',
        icon: 'pi pi-times'
    },
    {
        separator: true
    },
    {
        label: '主页',
        icon: 'pi pi-home'
    }
]);

const loading = ref([false, false, false]);

function load(index) {
    loading.value[index] = true;
    setTimeout(() => (loading.value[index] = false), 1000);
}
</script>

<template>
    <div class="flex flex-col md:flex-row gap-8">
        <div class="md:w-1/2">
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">默认</div>
                <div class="flex flex-wrap gap-2">
                    <Button label="提交"></Button>
                    <Button label="禁用" :disabled="true"></Button>
                    <Button label="链接" class="p-button-link" />
                </div>
            </div>
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">严重性</div>
                <div class="flex flex-wrap gap-2">
                    <Button label="主要" />
                    <Button label="次要" severity="secondary" />
                    <Button label="成功" severity="success" />
                    <Button label="信息" severity="info" />
                    <Button label="警告" severity="warn" />
                    <Button label="帮助" severity="help" />
                    <Button label="危险" severity="danger" />
                    <Button label="对比" severity="contrast" />
                </div>
            </div>
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">文本</div>
                <div class="flex flex-wrap gap-2">
                    <Button label="主要" text />
                    <Button label="次要" severity="secondary" text />
                    <Button label="成功" severity="success" text />
                    <Button label="信息" severity="info" text />
                    <Button label="警告" severity="warn" text />
                    <Button label="帮助" severity="help" text />
                    <Button label="危险" severity="danger" text />
                    <Button label="朴素" plain text />
                </div>
            </div>
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">描边</div>
                <div class="flex flex-wrap gap-2">
                    <Button label="主要" outlined />
                    <Button label="次要" severity="secondary" outlined />
                    <Button label="成功" severity="success" outlined />
                    <Button label="信息" severity="info" outlined />
                    <Button label="警告" severity="warn" outlined />
                    <Button label="帮助" severity="help" outlined />
                    <Button label="危险" severity="danger" outlined />
                    <Button label="对比" severity="contrast" outlined />
                </div>
            </div>
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">按钮组</div>
                <div class="flex flex-wrap gap-2">
                    <ButtonGroup>
                        <Button label="保存" icon="pi pi-check" />
                        <Button label="删除" icon="pi pi-trash" />
                        <Button label="取消" icon="pi pi-times" />
                    </ButtonGroup>
                </div>
            </div>
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">分裂按钮</div>
                <div class="flex flex-wrap gap-2">
                    <SplitButton label="保存" :model="items"></SplitButton>
                    <SplitButton label="保存" :model="items" severity="secondary"></SplitButton>
                    <SplitButton label="保存" :model="items" severity="success"></SplitButton>
                    <SplitButton label="保存" :model="items" severity="info"></SplitButton>
                    <SplitButton label="保存" :model="items" severity="warn"></SplitButton>
                    <SplitButton label="保存" :model="items" severity="help"></SplitButton>
                    <SplitButton label="保存" :model="items" severity="danger"></SplitButton>
                    <SplitButton label="保存" :model="items" severity="contrast"></SplitButton>
                </div>
            </div>
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">模板</div>
                <div class="flex flex-wrap gap-2">
                    <Button type="button">
                        <img alt="logo" src="/demo/images/logo-white.svg" style="width: 1.5rem" />
                    </Button>
                    <Button type="button" outlined severity="success">
                        <img alt="logo" src="/demo/images/logo.svg" style="width: 1.5rem" />
                        <span class="ml-2 text-bold">PrimeVue</span>
                    </Button>
                </div>
            </div>
        </div>
        <div class="md:w-1/2">
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">图标</div>
                <div class="flex flex-wrap gap-2">
                    <Button icon="pi pi-star-fill" class="mr-2 mb-2"></Button>
                    <Button label="书签" icon="pi pi-bookmark" class="mr-2 mb-2"></Button>
                    <Button label="书签" icon="pi pi-bookmark" iconPos="right" class="mr-2 mb-2"></Button>
                </div>
            </div>
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">凸起</div>
                <div class="flex flex-wrap gap-2">
                    <Button label="主要" raised />
                    <Button label="次要" severity="secondary" raised />
                    <Button label="成功" severity="success" raised />
                    <Button label="信息" severity="info" raised />
                    <Button label="警告" severity="warn" raised />
                    <Button label="帮助" severity="help" raised />
                    <Button label="危险" severity="danger" raised />
                    <Button label="对比" severity="contrast" raised />
                </div>
            </div>
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">圆角</div>
                <div class="flex flex-wrap gap-2">
                    <Button label="主要" rounded />
                    <Button label="次要" severity="secondary" rounded />
                    <Button label="成功" severity="success" rounded />
                    <Button label="信息" severity="info" rounded />
                    <Button label="警告" severity="warn" rounded />
                    <Button label="帮助" severity="help" rounded />
                    <Button label="危险" severity="danger" rounded />
                    <Button label="对比" severity="contrast" rounded />
                </div>
            </div>
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">圆角图标</div>
                <div class="flex flex-wrap gap-2">
                    <Button icon="pi pi-check" rounded />
                    <Button icon="pi pi-bookmark" severity="secondary" rounded />
                    <Button icon="pi pi-search" severity="success" rounded />
                    <Button icon="pi pi-user" severity="info" rounded />
                    <Button icon="pi pi-bell" severity="warn" rounded />
                    <Button icon="pi pi-heart" severity="help" rounded />
                    <Button icon="pi pi-times" severity="danger" rounded />
                </div>
            </div>
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">圆角文本</div>
                <div class="flex flex-wrap gap-2">
                    <Button icon="pi pi-check" text raised rounded />
                    <Button icon="pi pi-bookmark" severity="secondary" text raised rounded />
                    <Button icon="pi pi-search" severity="success" text raised rounded />
                    <Button icon="pi pi-user" severity="info" text raised rounded />
                    <Button icon="pi pi-bell" severity="warn" text raised rounded />
                    <Button icon="pi pi-heart" severity="help" text raised rounded />
                    <Button icon="pi pi-times" severity="danger" text raised rounded />
                </div>
            </div>
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">圆角描边</div>
                <div class="flex flex-wrap gap-2">
                    <Button icon="pi pi-check" rounded outlined />
                    <Button icon="pi pi-bookmark" severity="secondary" rounded outlined />
                    <Button icon="pi pi-search" severity="success" rounded outlined />
                    <Button icon="pi pi-user" severity="info" rounded outlined />
                    <Button icon="pi pi-bell" severity="warn" rounded outlined />
                    <Button icon="pi pi-heart" severity="help" rounded outlined />
                    <Button icon="pi pi-times" severity="danger" rounded outlined />
                </div>
            </div>
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-xl">加载中</div>
                <div class="flex flex-wrap gap-2">
                    <Button type="button" class="mr-2 mb-2" label="搜索" icon="pi pi-search" :loading="loading[0]" @click="load(0)" />
                    <Button type="button" class="mr-2 mb-2" label="搜索" icon="pi pi-search" iconPos="right" :loading="loading[1]" @click="load(1)" />
                    <Button type="button" class="mr-2 mb-2" icon="pi pi-search" :loading="loading[2]" @click="load(2)" />
                    <Button type="button" class="mr-2 mb-2" label="搜索" :loading="loading[3]" @click="load(3)" />
                </div>
            </div>
        </div>
    </div>
</template>
