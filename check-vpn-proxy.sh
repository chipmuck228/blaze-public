#!/bin/bash
echo "=== VPN/代理配置检查 ==="
echo ""
echo "1. 系统环境变量:"
echo "   HTTP_PROXY: ${HTTP_PROXY:-未设置}"
echo "   HTTPS_PROXY: ${HTTPS_PROXY:-未设置}"
echo "   http_proxy: ${http_proxy:-未设置}"
echo "   https_proxy: ${https_proxy:-未设置}"
echo ""
echo "2. 测试 Google 连接（无代理）:"
timeout 5 curl -I https://accounts.google.com 2>&1 | head -3 || echo "   ❌ 连接失败"
echo ""
echo "3. 检查 .env.local 中的代理配置:"
if [ -f .env.local ]; then
  grep -i proxy .env.local || echo "   ❌ 未找到代理配置"
else
  echo "   ❌ .env.local 文件不存在"
fi
echo ""
echo "=== 检查完成 ==="
