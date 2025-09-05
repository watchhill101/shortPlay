// 全局类型声明文件

// Vue 3 类型声明 - 修复模块声明
declare module 'vue' {
  export function ref<T>(value: T): { value: T };
  export function reactive<T>(target: T): T;
  export function onMounted(callback: () => void): void;
  export function onUnmounted(callback: () => void): void;
  export function computed<T>(getter: () => T): { value: T };
  export function watch<T>(source: T, callback: (newVal: T, oldVal: T) => void): void;
  export function nextTick(callback?: () => void): Promise<void>;
  export function createApp(rootComponent: any): any;
  export function createSSRApp(rootComponent: any): any;
}

// uni-app 全局类型声明
declare global {
  // uni-app API 类型声明
  const uni: {
    // 网络请求
    request: (options: {
      url: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';
      data?: any;
      header?: Record<string, string>;
      timeout?: number;
      dataType?: string;
      responseType?: string;
      success?: (res: any) => void;
      fail?: (err: any) => void;
      complete?: () => void;
    }) => Promise<{
      statusCode: number;
      data: any;
      header: any;
    }>;

    // 数据存储
    setStorageSync: (key: string, data: any) => void;
    getStorageSync: (key: string) => any;
    removeStorageSync: (key: string) => void;
    clearStorageSync: () => void;

    // 界面交互
    showToast: (options: {
      title: string;
      icon?: 'success' | 'loading' | 'none' | 'error';
      duration?: number;
      mask?: boolean;
    }) => void;
    showModal: (options: {
      title?: string;
      content?: string;
      showCancel?: boolean;
      cancelText?: string;
      confirmText?: string;
      success?: (res: { confirm: boolean; cancel: boolean }) => void;
    }) => void;
    showLoading: (options: { title: string; mask?: boolean }) => void;
    hideLoading: () => void;

    // 路由导航
    navigateTo: (options: { url: string; success?: () => void; fail?: () => void }) => void;
    redirectTo: (options: { url: string; success?: () => void; fail?: () => void }) => void;
    navigateBack: (options?: { delta?: number }) => void;
    switchTab: (options: { url: string; success?: () => void; fail?: () => void }) => void;

    // 系统信息
    getSystemInfoSync: () => {
      platform: string;
      model: string;
      system: string;
      version: string;
      windowWidth: number;
      windowHeight: number;
      statusBarHeight: number;
    };

    // 分享功能
    showShareMenu: (options?: { withShareTicket?: boolean; menus?: string[] }) => void;

    // 插件相关
    requireNativePlugin: (name: string) => any;

    // 拦截器
    addInterceptor: (
      name: string,
      interceptor: {
        invoke?: (args: any) => void;
        success?: (res: any) => void;
        fail?: (err: any) => void;
        complete?: () => void;
      }
    ) => void;
    removeInterceptor: (name: string) => void;

    // 上传下载
    uploadFile: (options: {
      url: string;
      filePath: string;
      name: string;
      formData?: Record<string, any>;
      header?: Record<string, string>;
      success?: (res: any) => void;
      fail?: (err: any) => void;
    }) => void;
  };

  // 全局接口声明
  interface Window {
    uni: typeof uni;
  }
}

// 导出空对象以满足模块要求
export {};
