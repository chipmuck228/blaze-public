#!/bin/bash
echo "=== 测试 Google OAuth 服务器连接 ==="
echo ""
echo "1. 测试 accounts.google.com:"
curl -I --max-time 5 https://accounts.google.com 2>&1 | head -5
echo ""
echo "2. 测试 oauth2.googleapis.com:"
curl -I --max-time 5 https://oauth2.googleapis.com 2>&1 | head -5
echo ""
echo "=== 测试完成 ==="
