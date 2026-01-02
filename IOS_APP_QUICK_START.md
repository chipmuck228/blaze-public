# iOS App 快速开始指南

**版本**: 1.0  
**日期**: 2025-12

---

## 🎉 iOS 项目已成功创建！

iOS 项目已经初始化完成，位于 `ios/` 目录。

---

## 快速开始

### 1. 开发模式（Live Reload）- 推荐

**优势**：
- ✅ 不需要静态导出
- ✅ 可以继续使用所有 API Routes
- ✅ 代码修改自动热重载
- ✅ 快速开发迭代

**步骤**：

```bash
# 终端 1：启动 Next.js 开发服务器
npm run dev

# 终端 2：同步 Capacitor（如果需要）
npx cap sync ios

# 终端 3：打开 Xcode
npx cap open ios
```

**在 Xcode 中**：
1. 选择模拟器（如：iPhone 15 Pro）或连接的真机
2. 点击运行按钮（▶️）或按 `Cmd + R`
3. 应用会自动连接到 `http://localhost:3000`
4. 修改 `src/` 中的代码会自动热重载

**注意事项**：
- ⚠️ 确保 Mac 和 iOS 设备/模拟器在同一网络
- ⚠️ 如果使用真机，可能需要使用 Mac 的 IP 地址而不是 `localhost`
- ⚠️ 如果连接失败，检查防火墙设置

### 2. 配置 iOS 项目签名

**在 Xcode 中**：
1. 选择项目：`ios/App/App.xcodeproj`
2. 选择 Target：`App`
3. 进入 "Signing & Capabilities" 标签
4. 选择 "Automatically manage signing"
5. 选择你的 Team（需要 Apple Developer 账号）
6. Xcode 会自动创建证书和配置文件

**如果没有 Apple Developer 账号**：
- 可以使用个人 Apple ID（免费）
- 功能有限，但可以用于开发和测试
- 无法发布到 App Store

### 3. 修改开发服务器地址（如果需要）

如果 Mac 和 iOS 设备不在同一网络，或需要从其他设备访问：

**方法 1：使用 Mac 的 IP 地址**

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  // ...
  server: {
    url: 'http://192.168.1.100:3000', // 替换为你的 Mac IP 地址
    cleartext: true,
  },
};
```

**查找 Mac IP 地址**：
```bash
# 在终端中运行
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**方法 2：使用 ngrok（推荐用于远程测试）**

```bash
# 安装 ngrok
brew install ngrok

# 启动隧道
ngrok http 3000

# 使用 ngrok 提供的 HTTPS URL 更新 capacitor.config.ts
```

---

## 项目结构

```
blaze/
├── ios/                          # iOS 原生项目
│   ├── App/
│   │   ├── App/                  # 原生 Swift 代码
│   │   │   ├── AppDelegate.swift
│   │   │   └── Info.plist
│   │   ├── App.xcodeproj/        # Xcode 项目文件
│   │   └── public/               # Web 资源（自动同步）
│   └── Podfile                   # CocoaPods 依赖
├── capacitor.config.ts           # Capacitor 配置
├── src/                          # 源代码（Web 和移动端共享）
└── out/                          # 构建输出（静态导出时使用）
```

---

## 常用命令

```bash
# 同步 Web 资源到 iOS 项目
npx cap sync ios

# 打开 Xcode
npx cap open ios

# 复制 Web 资源（不更新原生代码）
npx cap copy ios

# 更新 Capacitor 和插件
npx cap update ios
```

---

## 下一步

### 立即可以做的：
1. ✅ 打开 Xcode：`npx cap open ios`
2. ✅ 配置签名（如果需要）
3. ✅ 运行应用测试 Live Reload

### 接下来要做的：
1. ⏳ 实现移动端首页（根据 `MOBILE_APP_HOME_DESIGN.md`）
2. ⏳ 实现底部导航菜单
3. ⏳ 适配移动端 UI/UX
4. ⏳ 处理 API Routes 迁移（生产环境）

---

## 故障排除

### 问题 1：应用无法连接到开发服务器

**解决方案**：
- 检查 `npm run dev` 是否正在运行
- 检查 Mac 和 iOS 设备是否在同一网络
- 尝试使用 Mac 的 IP 地址而不是 `localhost`
- 检查防火墙设置

### 问题 2：Xcode 构建失败

**解决方案**：
- 运行 `npx cap sync ios` 重新同步
- 在 Xcode 中：Product → Clean Build Folder
- 检查 CocoaPods：`cd ios/App && pod install`

### 问题 3：插件不工作

**解决方案**：
- 运行 `npx cap sync ios` 重新同步
- 检查插件是否正确安装：`npm list @capacitor/xxx`
- 在 Xcode 中重新构建项目

---

## 开发工作流

```
1. 修改 src/ 中的代码
   ↓
2. Next.js 开发服务器自动热重载（Web 端）
   ↓
3. iOS 应用自动刷新（Live Reload）
   ↓
4. 在 Xcode 中查看日志和调试
```

---

**最后更新**: 2025-12

