/**
 * 开发调试工具
 * 仅在开发环境可用，生产环境自动禁用
 *
 * 使用方法:
 * 1. 在浏览器控制台输入 enableDevBypass() 启用绕过
 * 2. 在浏览器控制台输入 disableDevBypass() 禁用绕过
 * 3. 输入 isDevBypassEnabled() 检查状态
 */

import {
  isDevBypassAllowed,
  isDevBypassEnabled,
  enableDevBypass,
  disableDevBypass,
  getDevBypassToken,
  getDevBypassUserInfo
} from './storage'

// 仅在开发模式且允许绕过时注册全局函数
if (typeof window !== 'undefined') {
  if (isDevBypassAllowed()) {
    window.enableDevBypass = (userData) => {
      return enableDevBypass(userData)
    }

    window.disableDevBypass = () => {
      return disableDevBypass()
    }

    window.isDevBypassEnabled = () => {
      return isDevBypassEnabled()
    }

    window.getDevBypassInfo = () => {
      return {
        enabled: isDevBypassEnabled(),
        token: getDevBypassToken(),
        userInfo: getDevBypassUserInfo()
      }
    }

    console.log('%c[Dev Debug] 开发调试工具已就绪', 'color: #10B981; font-weight: bold')
    console.log('%c使用方法:', 'color: #3B82F6')
    console.log('%c  enableDevBypass() - 启用绕过（跳过登录/支付）', 'color: #64748B')
    console.log('%c  disableDevBypass() - 禁用绕过', 'color: #64748B')
    console.log('%c  isDevBypassEnabled() - 检查状态', 'color: #64748B')
    console.log('%c  getDevBypassInfo() - 查看绕过详情', 'color: #64748B')
  } else {
    console.log('%c[Dev Debug] 当前环境不允许开发绕过（生产构建或未启用 VITE_DEV_BYPASS）', 'color: #EF4444')
  }
}

export {
  isDevBypassAllowed,
  isDevBypassEnabled,
  enableDevBypass,
  disableDevBypass,
  getDevBypassToken,
  getDevBypassUserInfo
}
