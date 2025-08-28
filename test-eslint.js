// 测试文件：包含一些ESLint会检测的问题
var unused_variable = 123; // 未使用的变量

function testFunction(){  // 缺少空格
  console.log("测试console.log");
  
  let a=1;let b=2; // 缺少空格，一行多个声明
  
  if(a==b){  // 应该使用 === 而不是 ==
    return true
  } // 缺少分号
}
