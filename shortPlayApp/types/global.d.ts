// 全局类型声明文件
declare global {
  // Vue 3 类型声明
  declare module 'vue' {
    export function ref<T>(value: T): { value: T };
    export function reactive<T>(target: T): T;
    export function onMounted(callback: () => void): void;
    export function onUnmounted(callback: () => void): void;
  }

  // uni-app 类型声明
  declare const uni: {
    request: (options: {
      url: string;
      method?: string;
      data?: any;
      header?: any;
      success?: (res: any) => void;
      fail?: (err: any) => void;
    }) => Promise<{
      statusCode: number;
      data: any;
      header: any;
    }>;
    showToast: (options: { title: string; icon?: 'success' | 'loading' | 'none'; duration?: number }) => void;
    showShareMenu: (options: { withShareTicket?: boolean; menus?: string[] }) => void;
    requireNativePlugin: (name: string) => any;
  };

  // 全局类型声明
  interface Window {
    uni: typeof uni;
  }

  // 声明 uni 为全局变量
  declare const uni: typeof uni;
}

// 导出空对象以满足模块要求
export {};
