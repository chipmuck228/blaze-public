/**
 * 移动浏览器检测 Hook
 * 用于检测用户是否在移动浏览器中访问网站
 * 
 * 注意：使用 useEffect 延迟检测，避免 SSR hydration mismatch
 */

import { useState, useEffect } from 'react';
import { isMobileBrowser, getMobileBreakpoint, hasTouchSupport } from '@/lib/mobile-detection';

export interface MobileBrowserInfo {
  isMobileBrowser: boolean;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  hasTouch: boolean;
  isReady: boolean;
}

/**
 * 获取移动浏览器信息的 Hook
 * 使用 useEffect 延迟检测，确保服务器端和客户端初始渲染一致
 */
export function useMobileBrowser(): MobileBrowserInfo {
  const [info, setInfo] = useState<MobileBrowserInfo>({
    isMobileBrowser: false,
    breakpoint: 'desktop',
    hasTouch: false,
    isReady: false,
  });

  useEffect(() => {
    const checkMobile = () => {
      setInfo({
        isMobileBrowser: isMobileBrowser(),
        breakpoint: getMobileBreakpoint(),
        hasTouch: hasTouchSupport(),
        isReady: true,
      });
    };

    checkMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return info;
}

