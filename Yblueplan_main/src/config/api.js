/**
 * 前端 API 配置
 * 所有后端接口都通过统一的 BASE_URL 访问
 *
 * API 地址优先级:
 * 1. import.meta.env.VITE_API_BASE_URL (显式配置)
 * 2. 生产环境默认: https://blue-plan1.cn
 * 3. 开发环境默认: http://localhost:3001
 */

// 检测是否在原生 App 环境中
const isInCapacitorApp = () => {
  if (typeof window === 'undefined') return false
  return !!(window.Capacitor && window.Capacitor.isNativePlatform())
}

// 检测是否在开发环境
const isDevEnvironment = () => {
  return import.meta.env.DEV ||
    (typeof window !== 'undefined' && ['localhost', '127.0.0.1', '192.168.', '10.0.2.2'].some(
      host => window.location.hostname.includes(host)
    ))
}

// 根据环境自动选择 API 地址
const getDefaultApiUrl = () => {
  // 原生 App 环境 或 生产构建: 使用生产地址
  if (isInCapacitorApp() || !import.meta.env.DEV) {
    return 'https://blue-plan1.cn'
  }
  // 开发环境: 使用本地后端
  return 'http://localhost:3001'
}

// 从环境变量读取，或使用默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getDefaultApiUrl()

// 打印当前 API 配置（仅开发模式）
if (import.meta.env.DEV) {
  console.log(`[API Config] API_BASE_URL: ${API_BASE_URL}`)
  console.log(`[API Config] Is Capacitor: ${isInCapacitorApp()}`)
  console.log(`[API Config] Is Dev: ${import.meta.env.DEV}`)
}

export { API_BASE_URL, isInCapacitorApp, isDevEnvironment }

export default {
  API_BASE_URL,
  isInCapacitorApp,
  isDevEnvironment
}
