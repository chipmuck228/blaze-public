# AI Chat Setup Guide

## 概述

AI 客服功能已集成到 location 页面。用户可以通过点击 "Contact {Location}" 按钮或右下角的聊天图标打开 AI 客服对话框。

## 环境变量配置

### 必需的环境变量

在 `.env.local` 文件中添加以下环境变量：

```env
# Google Gemini API Key (必需)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_api_key_here

# 代理配置（如果需要，解决连接超时问题）
# HTTP_PROXY=http://127.0.0.1:7890
# HTTPS_PROXY=http://127.0.0.1:7890
# NO_PROXY=localhost,127.0.0.1
```

**注意**: 如果遇到连接超时错误，请参考 `GEMINI_NETWORK_FIX.md` 配置代理。

### 获取 Google Gemini API Key

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey) 或 [Google Cloud Console](https://console.cloud.google.com/)
2. 登录 Google 账户
3. 创建新项目或选择现有项目
4. 启用 **Generative Language API**
5. 进入 **API & Services** → **Credentials**
6. 点击 **Create Credentials** → **API Key**
7. 复制生成的 API Key
8. 将 API Key 添加到 `.env.local` 文件中

**注意**: 为了安全，建议在 Google Cloud Console 中限制 API Key 的使用范围（Application restrictions 和 API restrictions）

### Vercel 部署配置

在 Vercel 项目设置中添加环境变量：

1. 进入 Vercel Dashboard
2. 选择项目
3. 进入 **Settings** → **Environment Variables**
4. 添加 `GOOGLE_GENERATIVE_AI_API_KEY` 环境变量
5. 选择适用的环境（Production, Preview, Development）

## 功能特性

### Phase 1 (MVP) 功能

✅ **基础对话功能**
- 流式消息显示（打字效果）
- 多轮对话支持
- 错误处理和加载状态

✅ **基本信息查询**
- 地址和联系方式
- Location 信息
- Blaze Robotics Academy 组织介绍
- 营业时间（如果可用）

✅ **UI 功能**
- 右下角固定位置的聊天按钮
- 可展开/收起/最小化的对话框
- 响应式设计（移动端适配）
- 自动滚动到最新消息

## 使用方式

### 用户使用

1. **打开对话框**：
   - 点击页面右下角的聊天图标，或
   - 点击 "Contact {Location}" 按钮

2. **发送消息**：
   - 在输入框中输入问题
   - 点击发送按钮或按 Enter 键

3. **查看回答**：
   - AI 回答会以流式方式显示（逐字显示）
   - 支持多轮对话

4. **关闭对话框**：
   - 点击右上角的 X 按钮关闭
   - 点击最小化按钮缩小为图标

### 开发调试

1. **检查 API 响应**：
   - 打开浏览器开发者工具
   - 查看 Network 标签页中的 `/api/ai/chat` 请求
   - 检查响应状态和内容

2. **查看日志**：
   - 服务器端日志会记录错误信息
   - 客户端控制台会显示错误提示

## 测试

### 测试用例

1. **基本信息查询**：
   - "What is the address of this campus?"
   - "How can I contact you?"
   - "What are your business hours?"
   - "Tell me about Blaze Robotics Academy"

2. **边界情况**：
   - 空消息
   - 网络错误
   - API 错误
   - 超长消息

3. **UI 测试**：
   - 对话框展开/收起
   - 最小化/恢复
   - 移动端响应式
   - 滚动行为

## 故障排除

### 常见问题

1. **连接超时错误 (Connect Timeout Error)**：
   - **原因**: 网络环境无法访问 Google Gemini API 服务器
   - **解决方案**:
     - **方案 1**: 使用系统级 VPN（推荐）
       - 确保 VPN 是系统级的，而不是仅浏览器扩展
       - 重启开发服务器
     - **方案 2**: 配置代理
       - 在 `.env.local` 中添加：
         ```env
         HTTP_PROXY=http://127.0.0.1:7890
         HTTPS_PROXY=http://127.0.0.1:7890
         NO_PROXY=localhost,127.0.0.1
         ```
       - 将端口替换为您的实际代理端口（常见：Clash 7890, V2Ray 1080）
       - 重启开发服务器
     - **方案 3**: 检查防火墙设置
       - 确保允许访问 `generativelanguage.googleapis.com`

2. **"Failed to fetch" 错误**：
   - 检查 `GOOGLE_GENERATIVE_AI_API_KEY` 是否正确设置
   - 检查网络连接
   - 检查 API 配额是否用完
   - 确认已启用 Generative Language API

2. **对话框不显示**：
   - 检查浏览器控制台是否有错误
   - 确认组件已正确导入
   - 检查 z-index 是否被其他元素覆盖

3. **AI 回答不准确**：
   - 检查 System Prompt 是否正确构建
   - 检查数据库中的 franchise 和 location 信息
   - 查看 API 响应中的实际 prompt

## 下一步（Phase 2+）

- 课程信息检索（RAG）
- 注册信息查询
- 个性化推荐
- 多语言支持

## 成本估算

基于 MVP 阶段（500 对话/天）：
- **Gemini 1.5 Pro**: 
  - 输入: $1.25/1M tokens
  - 输出: $5.00/1M tokens
  - 假设平均 300 tokens/对话
  - 输入: 500 × 300 × 30 × $1.25/1M = ~$5.6/月
  - 输出: 500 × 300 × 30 × $5.00/1M = ~$22.5/月
  - **总计**: ~$28/月

**注意**: Gemini 提供免费配额（每月 15 RPM 和 1500 RPD），适合初期使用

## 技术支持

如有问题，请检查：
1. 环境变量配置
2. API Key 有效性
3. 网络连接
4. 服务器日志

