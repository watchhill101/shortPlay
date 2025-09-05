import js from '@eslint/js';
import globals from 'globals';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  // 忽略文件配置
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.DS_Store',
      '*.log',
      // 忽略样式文件
      '**/*.css',
      '**/*.scss',
      '**/*.sass',
      '**/*.less',
      '**/*.styl',
      '**/*.stylus',
    ],
  },

  // ES Module 文件配置 (如 .mjs 文件)
  {
    files: ['**/*.{mjs}'],
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      sourceType: 'module',
      ecmaVersion: 2021,
    },
  },

  // CommonJS 文件配置 (如 .js 文件)
  {
    files: ['**/*.{js,cjs}'],
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      sourceType: 'commonjs',
      ecmaVersion: 2021,
    },
    rules: {
      // Node.js 特定规则
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off', // 后端项目允许使用console
      'no-debugger': 'error',

      // 代码风格规则
      indent: ['error', 2],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-before-function-paren': ['error', 'never'],
      'keyword-spacing': 'error',
      'space-infix-ops': 'error',
      'eol-last': 'error',
      'no-trailing-spaces': 'error',
    },
  },

  // JSON 文件配置
  {
    files: ['**/*.json'],
    plugins: { json },
    language: 'json/json',
    rules: {
      'json/no-empty-keys': 'warn', // package-lock.json 问题降级为警告
    },
  },

  // package-lock.json 特殊配置 - 忽略空键警告
  {
    files: ['**/package-lock.json'],
    plugins: { json },
    language: 'json/json',
    rules: {
      'json/no-empty-keys': 'off', // package-lock.json 中的空键是正常的
    },
  },

  // Markdown 文件配置
  {
    files: ['**/*.md'],
    plugins: { markdown },
    language: 'markdown/gfm',
    rules: {
      'markdown/fenced-code-language': 'warn', // 代码块语言标识改为警告
    },
  },

  // Prettier 配置
  eslintPluginPrettierRecommended,
];
