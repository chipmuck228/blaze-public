/**
 * 将 src/app/favicon-32x32.png 转为 src/app/favicon.ico
 * 运行: node scripts/png-to-ico.js
 */
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const pngPath = path.join(projectRoot, 'src', 'app', 'favicon-32x32.png');
const icoPath = path.join(projectRoot, 'src', 'app', 'favicon.ico');

async function main() {
  if (!fs.existsSync(pngPath)) {
    console.error('未找到源文件:', pngPath);
    process.exit(1);
  }
  const pngToIco = (await import('png-to-ico')).default;
  const buf = await pngToIco(pngPath);
  fs.writeFileSync(icoPath, buf);
  console.log('已生成:', icoPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
