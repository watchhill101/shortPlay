### 概要

视频播放插件性能高、扩展性强、切换流畅，支持MP4视频格式。

无uniapp video 原生组件的层级、遮挡、覆盖问题，适合与不同功能视图组合使用，实现丰富的应用功能。

实测1000个视频列表播放依然流畅，实在不想复制黏贴列表了，就测试这么多个。

本插件通过固定三个swiper-item实现滑动播放视频列表，播放过程重复使用已有的的播放控件，理论支持视频列表大小不限。

因实现机理的问题，播放列表至少要有三个视频以上才可能正常使用，这点请大家务必知晓。

面板提供触发加载更多视频时机，需要确保观看到最后一个视频前完成额外视频列表加载，否则会根据overShadeMode值进行处理，这点请大家务必知晓。

##### 演示视频：

[观看演示视频](https://env-00jxhb2rkow0.normal.cloudstatic.cn/xqx-playlet/xqx-playler_v1.5.6_2.mp4)

##### 使用示例：

（下载demo工程）
注：该demo包括完整的插件使用示例，及插件和其他功能页面结合使用的实现参考。

### 功能介绍&#x20;

面板内置提供播放、短剧介绍、短剧集数选择等常见功能，同时也预留slots扩展，方便结合实际常见扩展需要的功能。

1，提供两种模式的播放面板视图

（1）：推荐模式，panelMode==1，适合推荐类型场景，每个短剧信息独立

（2）：剧集模式，panelMode==2，适合观看一部短剧场景，播放该短剧下所有剧集

2，提供获取每集的视频url模式

（1）：直接模式，从playletDetail的episodesInfo列表获得

（2）：补充模式，提供短剧id和哪一集信息，由使用者提供，用于url要加密的等复杂场景

### props属性

| 属性名称       | 类型   | 默认值 | 支持面板模式       | 说明                                                                                                                                                                   |
| :------------- | :----- | :----- | :----------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| panelMode      | Number | 1      | 推荐模式，剧集模式 | 两种模式的播放面板视图。值1，推荐模式，适合推荐类型场景，每个短剧信息独立；值2，剧集模式，适合观看一部短剧场景，播放该短剧下所有剧集。                                 |
| episodesStart  | Number | 无     | 推荐模式，剧集模式 | 初始播放哪一集，不能超过实际上传的集数                                                                                                                                 |
| episodesMode   | Number | 1      | 推荐模式，剧集模式 | 提供每集的视频url模式。值 1：直接模式，从playletDetail的episodesInfo列表项url属性获得；值 2：补充模式，提供短剧id和哪一集信息，由使用者提供，用于url要加密的等复杂场景 |
| watchHistory   | Number | 1      | 剧集模式           | 保存播放历史模式。0：不保存播放历史；1：保存播放历史，包括短剧id、集数、播放进度，最多保存50个。                                                                       |
| navBarHeight   | Number | 0      | 推荐模式，剧集模式 | 如果是嵌入有导航栏的视图，需要指定底部导航栏的高度以便自动计算视频面板的高度                                                                                           |
| supplyEpisodes | Object | 无     | 推荐模式，剧集模式 | 获取视频地址为补充模式时使用，与episodesMode=2模式配合使用；通过事件方法onSupplyEpisodes 更新提供url                                                                   |
| playletDetail  | Object | 无     | 剧集模式           | 视频信息，包含id，标题，总集数，已上传集数等信息。外部加载完视频信息后，更新此属性即可开始播放。                                                                       |
| episodesList   | Array  | 无     | 推荐模式，剧集模式 | 视频列表，可包含id，标题等，支持通过加额外的视频列表。                                                                                                                 |
| playPanelBack  | Number | 1      | 推荐模式，剧集模式 | 是否显示播放面板左上角返回按钮。0：不显示，2：显示                                                                                                                     |
| overShadeMode  | Number | 1      | 推荐模式，剧集模式 | 视频所有集播放完毕时的处理方式。1: 循环播放视频列表，结束后从第一集开始播放，2: 弹出播放完成遮罩，方便额外功能扩展                                                     |
| overShadeBack  | Number | 1      | 推荐模式，剧集模式 | 是否显示视频所有集播放完毕时遮罩视图左上角的返回按钮。0：不显示，2：显示                                                                                               |

属性： playletDetail 结构说明，剧集模式时候需要

```json
{
  "playletId": 53, //必填：唯一标识一部短剧
  "title": "黑客帝国", //必填：短剧标题
  "favor": 1, //可选：是否已经收藏
  "brief": "通过科幻故事阐述在线/离线、递归、循环、矩阵等关键词，展现了计算机编程的概念。", //必填：短剧简述
  "episodes": 120, //必填：已上传视频的每集信息，如果大小小于totalEpisodes，集数信息会提示“连载中”
  "totalEpisodes": 200 //必填：总共多少集，totalEpisodes 要大于等于episodesInfo列表的长度
}
```

属性： episodesList 结构说明，属性在推荐模式和剧集模式有差别

```json
[{
	"playletId": 53,     //推荐模式时必填：唯一标识一部短剧；剧集模式时不需要，通过playletDetail获得
    "episodes": 1,       //剧集模式时必填：当前哪一集，从1开始；推荐模式时不需要
	"title": "黑客帝国",  //必填：短剧标题
	"favor": 1,          //可选：是否已经收藏
	"brief": "通过科幻故事阐述在线/离线、递归、循环、矩阵等关键词，展现了计算机编程的概念。", //必填：短剧简述
	"covurl": "https://xxx.com/img/4fa62e3d2d.jpg",   //可选：短剧封面，用于视频开始播放时的过渡
    "canPlay": 1, //必填：1：可以播放，0：不可以播放，为0时播放该集触发onEpisodesForbit事件
    "url": "https://xxx.com/5c998e0ec48-1.mp4" //视频地址
    ,{},{}]
}]
```

属性：supplyEpisodes

```json
{
  "playletId": 45, //必填：短剧唯一标识
  "episodes": 1, //必填：为该集提供视频url
  "url": "https://xxx.com/pc/202212/5c998e0ec48-5.mp4" //必填：该集视频url
}
```

### event事件

- onSupplyEpisodes(episodes, episodesItem)

  说明：需要提供哪一集的视频地址，与属性episodesMode=2模式配合使用，该集的canPlay属性必须为1否则不会触发。
  场景：不希望真实的视频地址被获得照成视频泄露，一开始不提供视频地址，播放改集时再生成处理后的视频地址。
  参数：episodes 哪一集,从1开始；episodesItem 数据结构和episodesList列表项信息一致。
  示例：

  ```javascript
  onSupplyEpisodes(episodes, episodesItem) {
  	let me = this;

  	//如果需要进行复杂处理，可以考虑调用服务端接口实时计算获得mixUrl
  	me.supplyEpisodes = { ? };
  }
  ```

- onEpisodesStart(episodes, episodesItem)

  说明：将播放某集时触发，即使canPlay=0改集不能播放时事件也会触发。
  场景：可记录作为当前播放到哪一集信息，用于后面文档介绍的扩展插槽（slot）自定义处理等。
  参数：episodes 哪一集,从1开始；episodesItem 数据结构和episodesList列表项信息一致。
  示例：

  ```javascript
  onEpisodesStart(episodes, episodesItem) {
  	let me = this;

  	me.currentEpisodes = episodesItem;
  }
  ```

- onEpisodesForbit(episodes, episodesItem)

  说明：如果当前集不允许播放canPlay=0触发。
  场景：让用户做任务后才可以观看，或者弹窗购买提示需要购买。
  参数：episodes 哪一集,从1开始；episodesItem 数据结构和episodesList列表项信息一致。
  示例：

  ```javascript
  onEpisodesForbit(episodes, episodesItem) {
  	let me = this;

  	//方式1：处理额外逻辑后将对应集信息的canPay设置 1 表示可以播放了
  	episodesItem.canPlay = 1;

  	//方式2：用户购买视频后重新加载短剧详情
  	me.playletDetail = newPlayletDetail;

  	//调用内置方法，让播放面板从当前集继续开始播放视频
  	me.$refs.playPanelRef.flushVideo();
  }
  ```

- onPalyletDetail(episodes, episodesItem)

  说明：点击短剧标题时触发。
  场景：查看短剧详情。
  参数：episodes 哪一集,从1开始；episodesItem 数据结构和episodesList列表项信息一致。
  示例：

  ```javascript
  onPalyletDetail(episodes, episodesItem) {
  	let me = this;

  }
  ```

- onPlayerEvent(eventData)

  说明：播放器播放视频过程事件通知。
  场景：根据实际确定需要的行为。
  参数：eventData事件关联数据，为提高多个事件监听时代码的简洁性，特意做了数据封装。
  示例：

  ```javascript
  onPlayerEvent(eventData) {
  	let me = this;

  	if(eventData.name == "play"){
  	   eventData.episodes   //当前播放的集数

  	} else if(eventData.name == "pause"){
  	   eventData.episodes   //当前暂停的集数

  	} else if(eventData.name == "ended"){
  	   eventData.episodes   //当前播放结束的集数

  	} else if(eventData.name == "click"){
  	   eventData.episodes   //当前点击的集数

  	} else if(eventData.name == "error"){
  	   eventData.episodes   //当前播放错误的集数
  	   eventData.event      //错误原始信息

  	} else if(eventData.name == "timeupdate"){
  	   eventData.episodes      //当前播放错误的集数
  	   eventData.currentTime   //播放到第几秒
  	   eventData.totalTime     //视频总共时长为几秒
  	   注意：为了避免频繁发送通知以减少开销，程序做了控制，每隔3秒通知一次
  	}
  }
  ```

### 内置方法

- this.$refs.playPanelRef.playVideo();

  说明：播放当前集视频。

- this.$refs.playPanelRef.pauseVideo();

  说明：暂停当前集视频。

- this.$refs.playPanelRef.muteVideo();

  说明：打开视频播放声音。

- this.$refs.playPanelRef.unmuteVideo();

  说明：关闭视频播放声音。

- this.$refs.playPanelRef.flushVideo(episodes);

  说明：刷新视图播放，刷新时从当前播放集数开始重新播放。
  场景：用户做完任务或者购买了短剧后，可以开始观看视频。
  参数：episodes 如果有指定，标识从改集开始播放，最小值1

### 插槽slots

- v-slot:funcs
  可自定义视频面板左侧功能栏

- v-slot:overshade
  可自定义所有集数播放完毕时候的遮罩视图内容，提示用户下一步要怎么做。默认左上角提供返回按钮，可通过overShadeBack=false 属性去除。
