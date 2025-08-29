import js from '@eslint/js';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  // 忽略文件配置
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'public/**',
      '.vscode/**',
      '*.config.js',
      '!eslint.config.mjs',
      '.DS_Store',
      '*.log',
    ],
  },

  // 基础 JavaScript 文件配置
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-debugger': 'error',
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
        ...globals.es2021,
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
        ...globals.es2021,
      },
      parserOptions: {
        ...config.languageOptions?.parserOptions,
        parser: tseslint.parser,
        ecmaVersion: 2021,
        sourceType: 'module',
      },
    },
    rules: {
      ...config.rules,
      // Vue 特定规则优化
      'vue/multi-word-component-names': 'warn',
      'vue/no-unused-vars': 'warn',
      'vue/valid-v-for': 'warn',
      'vue/require-v-for-key': 'error',
      'vue/no-mutating-props': 'error',
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
    },
  })),

  // 页面组件特殊规则 (views目录下可以使用单词命名)
  {
    files: ['**/views/**/*.vue', '**/pages/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },

  // Prettier 配置
  eslintPluginPrettierRecommended,
];
