import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  // 忽略文件配置
  {
    ignores: [
      'node_modules/**',
      'unpackage/**',
      'dist/**',
      'build/**',
      '.DS_Store',
      '*.log',
      // 完全忽略第三方库，避免大量错误
      'uni_modules/**',
      // 如果需要检查自己修改的第三方组件，可以单独配置
      '!uni_modules/custom-components/**',
      // 忽略样式文件
      '**/*.css',
      '**/*.scss',
      '**/*.sass',
      '**/*.less',
      '**/*.styl',
      '**/*.stylus',
    ],
  },

  // 自定义第三方组件的宽松规则（如果有的话）
  {
    files: ['uni_modules/custom-components/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/valid-v-for': 'warn',
      'vue/no-unused-vars': 'warn',
      'no-unused-vars': 'warn',
      'no-console': 'warn',
    },
  },

  // 基础 JavaScript 文件配置
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // uni-app 全局变量
        uni: 'readonly',
        plus: 'readonly',
        wx: 'readonly',
        qq: 'readonly',
        swan: 'readonly',
        tt: 'readonly',
        my: 'readonly',
        // 其他全局变量
        weex: 'readonly',
        getCurrentPages: 'readonly',
        getApp: 'readonly',
        App: 'readonly',
        Page: 'readonly',
        Component: 'readonly',
        Behavior: 'readonly',
      },
    },
    rules: {
      // 自定义规则
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // TypeScript 文件配置
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ['**/*.{ts,mts,cts}'],
    languageOptions: {
      ...config.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
        // uni-app 全局变量
        uni: 'readonly',
        plus: 'readonly',
        wx: 'readonly',
        qq: 'readonly',
        swan: 'readonly',
        tt: 'readonly',
        my: 'readonly',
        // 其他全局变量
        weex: 'readonly',
        getCurrentPages: 'readonly',
        getApp: 'readonly',
        App: 'readonly',
        Page: 'readonly',
        Component: 'readonly',
        Behavior: 'readonly',
      },
    },
    rules: {
      ...config.rules,
      // 对于项目自有的 TypeScript 文件保持严格
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  })),

  // TypeScript 类型声明文件的特殊配置
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Vue 文件配置
  ...pluginVue.configs['flat/essential'].map(config => ({
    ...config,
    files: ['**/*.vue'],
    languageOptions: {
      ...config.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
        // uni-app 全局变量
        uni: 'readonly',
        plus: 'readonly',
        wx: 'readonly',
        qq: 'readonly',
        swan: 'readonly',
        tt: 'readonly',
        my: 'readonly',
        // 其他全局变量
        weex: 'readonly',
        getCurrentPages: 'readonly',
        getApp: 'readonly',
        App: 'readonly',
        Page: 'readonly',
        Component: 'readonly',
        Behavior: 'readonly',
      },
      parserOptions: {
        ...config.languageOptions?.parserOptions,
        parser: tseslint.parser,
      },
    },
  })),

  // 页面组件特殊规则配置
  {
    files: ['**/pages/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off', // 页面组件可以使用单词命名
      'vue/valid-v-for': 'warn', // v-for key 问题改为警告
      'vue/no-unused-vars': 'warn', // 未使用变量改为警告
    },
  },

  // Prettier 配置
  eslintPluginPrettierRecommended,
];
