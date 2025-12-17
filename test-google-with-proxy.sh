#!/bin/bash
echo "=== 测试 Google 连接（使用代理） ==="
echo ""
echo "请先设置代理环境变量，例如："
echo "  export HTTP_PROXY=http://127.0.0.1:7890"
echo "  export HTTPS_PROXY=http://127.0.0.1:7890"
echo ""
echo "当前代理设置："
echo "  HTTP_PROXY: ${HTTP_PROXY:-未设置}"
echo "  HTTPS_PROXY: ${HTTPS_PROXY:-未设置}"
echo ""
if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ]; then
  echo "测试连接..."
  curl -I --max-time 10 https://accounts.google.com 2>&1 | head -5
else
  echo "⚠️  未设置代理，跳过测试"
  echo ""
  echo "要测试，请先运行："
  echo "  export HTTP_PROXY=http://your-proxy:port"
  echo "  export HTTPS_PROXY=http://your-proxy:port"
  echo "  ./test-google-with-proxy.sh"
fi
