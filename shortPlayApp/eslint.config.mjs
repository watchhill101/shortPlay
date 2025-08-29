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
      // 只忽略第三方库的特定文件类型，保留Vue组件检查
      'uni_modules/**/libs/**/*.js',
      'uni_modules/**/static/**/*',
      'uni_modules/**/*.min.js',
      'uni_modules/**/*.bundle.js',
    ],
  },

  // 第三方uni_modules组件的宽松规则
  {
    files: ['uni_modules/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/valid-v-for': 'off',
      'vue/no-unused-vars': 'off',
      'vue/require-v-for-key': 'off',
      'vue/no-mutating-props': 'off',
      'vue/component-definition-name-casing': 'off',
      'no-unused-vars': 'off',
      'no-console': 'off',
      // 但保留关键的错误检查
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'warn',
      'valid-typeof': 'error',
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
      },
    },
  })),

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
