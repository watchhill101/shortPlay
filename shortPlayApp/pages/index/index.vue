<template>
	<view id="containerId">
		<view class="maincontainer" :style="'height: calc(100vh - '+navBarHeight+'px)'">
			<view class="fixhdr">
				<view class="item">
					<block v-for="(tab, index) in panelTabs" :key="index">
						<view class="tabs" @click.stop="toTabClick(index)">
							<view class="nav" :class="tabIndex == index?'cur':''">
								{{tab.name}}
							</view>
							<view :class="tabIndex == index?'cur-line':''"></view>
						</view>
					</block>
				</view>

				<view class="search-box" @click="toSearchGoods">
					<image class="search-icon"></image>
				</view>
			</view>

			<view class="panel">
				<swiper :indicator-dots="false" :autoplay="false" :current="tabIndex" style="height: 100%;"
					@change="onTabChange">
					<swiper-item>
						<Discor :show="tabIndex == 0" />
					</swiper-item>
					<swiper-item>
						<Foryou :show="tabIndex == 1" :fowyouShow="foryouShow" />
					</swiper-item>
				</swiper>
			</view>
		</view>
	</view>
</template>

<script>
	import Discor from './discor.vue';
	import Foryou from './foryou.vue';

	export default {
		components: {
			Discor,
			Foryou
		},

		data() {
			return {
				meUni: uni,

				tabIndex: 0,
				panelTabs: [{
					index: 0,
					name: "发现"
				}, {
					index: 1,
					name: "推荐"
				}],

				foryouShow: false,
				navBarHeight: 0
			}
		},

		onLoad(options) {
			let me = this;

			me.initViewInfo();
			me.initPageData();
		},

		onShow() {
			let me = this;
			if (me.tabIndex == 1) {
				me.foryouShow = true;
			} else {
				me.foryouShow = false;
			}
		},

		onHide() {
			let me = this;
			me.foryouShow = false;
		},

		onReady() {

		},

		onReachBottom() {},

		onPullDownRefresh() {},

		beforeDestroy() {
			let me = this;
		},

		computed: {},

		methods: {
			//根据不同运行环境，计算高度适配
			initViewInfo() {
				let me = this;

				// pages.json 中tabBar 设置了高度
				// #ifdef APP-PLUS
				me.navBarHeight = 0;
				// #endif
				// #ifndef APP-PLUS
				me.navBarHeight = 60;
				// #endif
			},

			initPageData() {
				let me = this;
			},

			toTabClick(index) {
				let me = this;

				me.tabIndex = index;
			},

			onTabChange(e) {
				let me = this;

				me.tabIndex = e.detail.current;
				if (me.tabIndex == 1) {
					me.foryouShow = true;
				} else {
					me.foryouShow = false;
				}
			},

			toSearchGoods() {
				let me = this;
				
				// 跳转到搜索页面
				uni.navigateTo({
					url: '/pages/index/search'
				});
			},

		}
	}
</script>

<style scoped lang="scss">
	.maincontainer {
		width: 100%;
		background-color: #0e0f0f;
	}

	.fixhdr {
		position: fixed;
		z-index: 10;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		width: 100%;
		top: 65rpx;

		.item {
			display: flex;
			flex-direction: row;
			flex-grow: 1;
			justify-content: space-evenly;
		}

		.item .tabs {
			display: flex;
			align-items: center;
			justify-content: space-around;
			flex-direction: column;
			font-weight: bold;

			.nav {
				font-size: 36rpx;
				line-height: 40rpx;
				color: #b0aebb;
				padding: 12rpx 32rpx;
				position: relative;
				mix-blend-mode: multiply;
			}

			.cur {
				color: #fdfbfe;
				font-weight: bold;
			}

			.cur-line {
				width: 48rpx;
				height: 4rpx;
				background-color: #fdfbfe;
			}
		}

		.search-box {
			display: flex;
			justify-content: flex-start;
			align-items: center;
			padding: 6rpx;
			position: absolute;
			right: 30rpx;
		}

		.search-icon {
			width: 44rpx;
			height: 44rpx;
			background: url("../../static/img/search-icon.png") no-repeat;
			background-size: 100% 100%;
		}
	}

	.content {
		position: relative;
		border-radius: 30rpx 30rpx 0 0;
		z-index: 1;
	}

	.panel {
		height: 100vh;
	}

	.panel swiper {
		width: 100%;
	}
</style>