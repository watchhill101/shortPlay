<template>
    <div
        id="hero"
        class="flex flex-col pt-6 px-6 lg:px-20 overflow-hidden"
        style="background: linear-gradient(0deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.2)), radial-gradient(77.36% 256.97% at 77.36% 57.52%, rgb(238, 239, 175) 0%, rgb(195, 227, 250) 100%); clip-path: ellipse(150% 87% at 93% 13%)"
    >
        <div class="mx-6 md:mx-20 mt-0 md:mt-6">
            <h1 class="text-6xl font-bold text-gray-900 leading-tight"><span class="font-light block">构建您的专属</span> Vue 应用</h1>
            <p class="font-normal text-2xl leading-normal md:mt-4 text-gray-700">基于 PrimeVue 组件库，释放您的创造力，构建优雅且高性能的用户界面。</p>
            <Button label="立即开始" as="router-link" to="/" rounded class="!text-xl mt-8 !px-4"></Button>
        </div>
        <div class="flex justify-center md:justify-end">
            <img src="/demo/images/landing/screen-1.png" alt="英雄图片" class="w-9/12 md:w-auto" />
        </div>
    </div>
</template>
