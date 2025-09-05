import App from './App';
import uviewPlus from '@/uni_modules/uview-plus';

// #ifndef VUE3
import Vue from 'vue';
import './uni.promisify.adaptor';
Vue.config.productionTip = false;
App.mpType = 'app';
const app = new Vue({
  ...App,
});

// 简化配置，避免uview-plus相关的编译错误
app.use(uviewPlus);
app.$mount();
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue';
export function createApp() {
  const app = createSSRApp(App);

  // 简化配置，避免uview-plus相关的编译错误
  app.use(uviewPlus);

  return {
    app,
  };
}
// #endif
