// shortPlaybackend测试文件
function testFunction() {
  console.log('后端允许console.log');
  const a = 1;
  const b = 2;
  if (a === b) {
    return true;
  }
  return false;
}

module.exports = { testFunction };
