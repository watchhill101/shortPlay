### 概要

该demo适用于短剧视频类App实现参考，方便大家在这基础上进行快速开发应用。

无uniapp video 原生组件的层级、遮挡、覆盖问题，适合与不同功能视图组合使用，实现丰富的应用功能。

视频插件使用xqx-player，[插件链接点击这里](https://ext.dcloud.net.cn/plugin?id=20373)

### _注意：demo和视频插件均基于uniapp实现，而非uniapp x，这点请大家务必注意，避免因兼容问题照成不可用而损失_

### 主要功能供包括：

1. 提供导航页面骨架，包括主页、追剧、我的。
2. 实现了首页的发现和推荐页面滑动切换功能。
3. 实现视频流上下滑动播放功能，并和其他功能页面的结合。

注意：demo中使用的播放器面板为 xqx-player 插件，已经完成适配，可以搜索插件市场查看详情。如果希望改为自己的播放器实现，需要自行完成适配工作。

### 主要页面介绍

1. pages/index/index.vue 首页，竖向横向滚动展示内容，左右滑动切换内容页面
2. pages/index/discor.vue 短剧发现组件页面
3. pages/index/foryou.vue 短剧推荐组件页面，集成视频插件xqx-player，演示插件推荐模式的使用
4. pages/playlet/detail.vue 短剧详情参考页面
5. pages/playlet/episodes.vue 剧集播放页面，集成视频插件xqx-player，演示插件剧集模式的使用

### 演示视频
[观看演示视频](https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/xqx-playler_v1.5.6_2.mp4)

