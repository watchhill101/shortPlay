#!/usr/bin/env node

/**
 * lint-staged 性能测试脚本
 * 用于测试和监控代码检查的执行时间
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

console.log('🧪 开始 lint-staged 性能测试...\n');

// 测试函数
function testLintStaged() {
  const startTime = performance.now();

  try {
    console.log('📊 执行 lint-staged --verbose...');
    const output = execSync('npx lint-staged --verbose', {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 60000, // 60秒超时
    });

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('✅ lint-staged 执行完成');
    console.log(`⏱️  执行时间: ${duration}秒`);

    // 分析输出
    const lines = output.split('\n');
    const fileCount = lines.filter(line => line.includes('❯')).length;

    console.log(`📁 处理文件数量: ${fileCount}`);

    if (duration < 10) {
      console.log('🎉 性能优秀！(< 10秒)');
    } else if (duration < 30) {
      console.log('⚠️  性能一般 (10-30秒)');
    } else {
      console.log('🐌 性能较差 (> 30秒)，建议进一步优化');
    }
  } catch (error) {
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.error('❌ lint-staged 执行失败');
    console.error(`⏱️  执行时间: ${duration}秒`);
    console.error('错误信息:', error.message);

    if (error.signal === 'SIGTERM') {
      console.error('🕐 执行超时，可能存在性能问题');
    }
  }
}

// 检查当前Git状态
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });

  if (!gitStatus.trim()) {
    console.log('ℹ️  当前没有待提交的文件，创建测试文件...');

    // 创建测试文件
    execSync('echo "// 测试文件" > test-lint-performance.js');
    execSync('git add test-lint-performance.js');

    console.log('📝 已创建测试文件: test-lint-performance.js');
  }

  testLintStaged();

  // 清理测试文件
  try {
    execSync('git reset HEAD test-lint-performance.js 2>/dev/null || true');
    execSync('rm -f test-lint-performance.js 2>/dev/null || true');
    console.log('🧹 已清理测试文件');
  } catch (e) {
    // 忽略清理错误
  }
} catch (error) {
  console.error('❌ Git 操作失败:', error.message);
}

console.log('\n📋 性能优化建议:');
console.log('  • 确保 .lintstagedrc.mjs 使用精确的文件路径匹配');
console.log('  • 避免使用 ** 等宽泛的 glob 模式');
console.log('  • 排除 node_modules、dist、build 等目录');
console.log('  • 定期检查和更新忽略规则');
