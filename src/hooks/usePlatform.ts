/**
 * 平台检测 Hook
 * 用于在 React 组件中检测当前运行环境
 * 
 * 注意：使用 useEffect 延迟检测，避免 SSR hydration mismatch
 */

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { isMobileBrowser, getMobileBreakpoint, isIOS, isAndroid, hasTouchSupport } from '@/lib/mobile-detection';

export interface PlatformInfo {
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  platform: string;
  isReady: boolean; // 是否已完成平台检测
  isMobileBrowser: boolean; // 是否为移动浏览器
  breakpoint: 'mobile' | 'tablet' | 'desktop'; // 设备断点
  hasTouch: boolean; // 是否支持触摸
}

/**
 * 获取平台信息的 Hook
 * 使用 useEffect 延迟检测，确保服务器端和客户端初始渲染一致
 */
export function usePlatform(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    isNative: false,
    isIOS: false,
    isAndroid: false,
    isWeb: true, // 默认假设是 Web，避免 SSR mismatch
    platform: 'web',
    isReady: false,
    isMobileBrowser: false,
    breakpoint: 'desktop',
    hasTouch: false,
  });

  useEffect(() => {
    // 仅在客户端执行平台检测
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    
    // 检测移动浏览器（仅在非原生平台时检测）
    const mobileBrowser = !isNative && isMobileBrowser();
    
    setPlatformInfo({
      isNative,
      isIOS: platform === 'ios' || (!isNative && isIOS()),
      isAndroid: platform === 'android' || (!isNative && isAndroid()),
      isWeb: platform === 'web',
      platform,
      isReady: true,
      isMobileBrowser: mobileBrowser,
      breakpoint: getMobileBreakpoint(),
      hasTouch: hasTouchSupport(),
    });
  }, []);

  return platformInfo;
}

