import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blazerobotics.academy',
  appName: 'Blaze Robotics Academy',
  webDir: 'out',
  server: {
    // 开发模式：连接到本地开发服务器（Live Reload）
    // 生产模式：注释掉 server 配置，使用打包后的静态文件
    url: 'http://localhost:3000',
    cleartext: true, // 允许 HTTP 连接（仅开发环境）
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;

