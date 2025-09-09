<template>
    <div class="card">
        <div class="font-semibold text-2xl mb-4">文档</div>
        <div class="font-semibold text-xl mb-4">快速上手</div>
        <p class="text-lg mb-4">
            Sakai 是一个基于 <a href="https://github.com/vuejs/create-vue" class="font-medium text-primary hover:underline">create-vue</a> 的 Vue 应用程序模板，这是官方推荐的启动 <strong>Vite-powered</strong> Vue 项目的方式。要开始使用，请从 GitHub
            克隆<a href="https://github.com/primefaces/sakai-vue" class="font-medium text-primary hover:underline">仓库</a>并使用 npm 或 yarn 安装依赖项。
        </p>
        <pre class="app-code">
<code>git clone https://github.com/primefaces/sakai-vue
npm install
npm run dev</code></pre>

        <p class="text-lg mb-4">在浏览器中访问 <i class="bg-highlight px-2 py-1 rounded-border not-italic text-base">http://localhost:5173/</i> 以在本地环境中查看应用程序。</p>

        <pre class="app-code"><code>npm run dev</code></pre>

        <div class="font-semibold text-xl mb-4">结构</div>
        <p class="text-lg mb-4">模板包含几个文件夹，演示和布局已分开，以便您可以轻松删除应用程序不需要的内容。</p>
        <ul class="leading-normal list-disc pl-8 text-lg mb-4">
            <li><span class="text-primary font-medium">src/layout</span>: 主布局文件，必须存在。</li>
            <li><span class="text-primary font-medium">src/views</span>: 演示页面，如仪表盘。</li>
            <li><span class="text-primary font-medium">public/demo</span>: 演示中使用的静态资源。</li>
            <li><span class="text-primary font-medium">src/assets/demo</span>: 演示中使用的样式。</li>
            <li><span class="text-primary font-medium">src/assets/layout</span>: 主布局的 SCSS 文件。</li>
        </ul>

        <div class="font-semibold text-xl mb-4">菜单</div>
        <p class="text-lg mb-4">
            主菜单在 <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">src/layout/AppMenu.vue</span> 文件中定义。更新 <i class="bg-highlight px-2 py-1 rounded-border not-italic text-base">model</i> 属性以 定义您自己的菜单项。
        </p>

        <div class="font-semibold text-xl mb-4">布局 Composable</div>
        <p class="text-lg mb-4">
            <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">src/layout/composables/layout.js</span> 是一个管理布局状态更改的 composable，包括深色模式、PrimeVue 主题、菜单模式和状态。如果您
            更改了初始值，如预设或颜色，请确保也在 main.js 的 PrimeVue 配置中应用它们。
        </p>

        <div class="font-semibold text-xl mb-4">Tailwind CSS</div>
        <p class="text-lg mb-4">演示页面是使用 Tailwind CSS 开发的，但核心应用程序外壳主要使用自定义 CSS。</p>

        <div class="font-semibold text-xl mb-4">变量</div>
        <p class="text-lg mb-4">模板中使用的 CSS 变量的值源自 PrimeVue 样式模式预设，请使用 <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">assets/layout/_variables.scss</span> 下的文件根据您的 要求进行自定义。</p>

        <div class="font-semibold text-xl mb-4">将 Sakai-Vue 添加到 Nuxt 项目</div>
        <p class="text-lg mb-4">首先，创建一个 Nuxt 项目。</p>
        <pre class="app-code">
<code>npx nuxi@latest init sakai-nuxt</code></pre>

        <p class="text-lg mb-4">向项目中添加 Prime 相关库。</p>
        <pre class="app-code">
<code>npm install primevue @primevue/themes tailwindcss-primeui primeicons
npm install --save-dev @primevue/nuxt-module</code></pre>

        <p class="text-lg mb-4">将 PrimeVue-Nuxt 模块添加到 <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">nuxt.config.js</span></p>
        <pre class="app-code">
<code>modules: [
    '@primevue/nuxt-module',
]</code></pre>

        <p class="text-lg mb-4">使用官方文档安装 <a href="https://tailwindcss.com/docs/guides/nuxtjs" class="font-medium text-primary hover:underline">Tailwind CSS</a> 与 Nuxt。</p>

        <p class="text-lg mb-4">
            将 <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">tailwindcss-primeui</span> 包作为插件添加到 <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">tailwind.config.js</span>
        </p>
        <pre class="app-code">
<code>plugins: [require('tailwindcss-primeui')]</code></pre>

        <p class="text-lg mb-4">在 <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">nuxt.config.js</span> 中添加 PrimeVue</p>
        <pre class="app-code">
<code>import Aura from '@primevue/themes/aura';

primevue: {
    options: {
        theme: {
            preset: Aura,
            options: {
                darkModeSelector: '.app-dark'
            }
        }
    }
}</code></pre>

        <p class="text-lg mb-4">
            复制 <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">src/assets</span> 文件夹并将其粘贴到 Nuxt 项目的 <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">assets</span> 文件夹中。 然后添加到
            <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">nuxt.config.js</span>
        </p>
        <pre class="app-code">
<code>css: ['~/assets/tailwind.css', '~/assets/styles.scss']</code></pre>

        <p class="text-lg mb-4">更改 <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">app.vue</span></p>
        <pre class="app-code">
<code>&lt;template&gt;
    &lt;NuxtLayout&gt;
        &lt;NuxtPage /&gt;
    &lt;/NuxtLayout&gt;
&lt;/template&gt;</code></pre>

        <p class="text-lg mb-4">创建 <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">layouts/default.vue</span> 并粘贴以下代码：</p>
        <pre class="app-code">
<code>&lt;script setup&gt;
import AppLayout from './AppLayout.vue';
&lt;/script&gt;

&lt;template&gt;
    &lt;AppLayout /&gt;
&lt;/template&gt;</code></pre>

        <p class="text-lg mb-4">
            创建 <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">layouts</span> 文件夹，并将 <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">src/layout</span> 文件夹复制粘贴进去。然后 创建
            <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">composables/use-layout.vue</span> 并用
            <span class="bg-highlight px-2 py-1 rounded-border not-italic text-base">src/layout/composables/layout.js</span> 替换它。然后删除此行：
        </p>
        <pre class="app-code">
<code>import { useLayout } from '@/layout/composables/layout';</code></pre>

        <p class="text-lg mb-4">最后一步，复制以下文件夹：</p>
        <ul class="leading-normal list-disc pl-8 text-lg mb-4">
            <li><span class="text-primary font-medium">public/demo</span> <i class="pi pi-arrow-right !text-sm mr-1"></i> <span class="text-primary font-medium">public</span></li>
            <li><span class="text-primary font-medium">src/components</span> <i class="pi pi-arrow-right !text-sm mr-1"></i> <span class="text-primary font-medium">components</span></li>
            <li><span class="text-primary font-medium">src/service</span> <i class="pi pi-arrow-right !text-sm mr-1"></i> <span class="text-primary font-medium">service</span></li>
            <li><span class="text-primary font-medium">src/views/uikit</span> <i class="pi pi-arrow-right !text-sm mr-1"></i> <span class="text-primary font-medium">pages/uikit</span></li>
            <li><span class="text-primary font-medium">src/views/pages</span> <i class="pi pi-arrow-right !text-sm mr-1"></i> <span class="text-primary font-medium">pages</span></li>
        </ul>
    </div>
</template>

<style lang="scss" scoped>
@media screen and (max-width: 991px) {
    .video-container {
        position: relative;
        width: 100%;
        height: 0;
        padding-bottom: 56.25%;

        iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
    }
}
</style>
