/**
 * 平台检测工具函数
 * 用于检测当前运行环境（Web、iOS、Android）
 */

import { Capacitor } from '@capacitor/core';

/**
 * 检测是否为原生平台（iOS 或 Android）
 */
export const isNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * 检测是否为 iOS 平台
 */
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * 检测是否为 Android 平台
 */
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * 检测是否为 Web 平台
 */
export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

/**
 * 获取当前平台名称
 */
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

