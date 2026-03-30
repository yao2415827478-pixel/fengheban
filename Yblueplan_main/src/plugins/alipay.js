// 支付宝 App 支付插件封装
// 用于在 App 中调用支付宝进行支付

/**
 * 调试日志 - 仅控制台输出，不弹窗
 */
const debugLog = (msg, data) => {
  const logMsg = `[Alipay] ${msg}`
  console.log(logMsg, data || '')
}

/**
 * 获取 Capacitor 实例
 */
const getCapacitor = () => {
  if (typeof window !== 'undefined' && window.Capacitor) {
    return window.Capacitor
  }
  return null
}

/**
 * 检查是否在原生环境中
 */
export const isNativePlatform = () => {
  const cap = getCapacitor()
  return cap ? cap.isNativePlatform() : false
}

/**
 * 获取支付宝插件 - Capacitor 8.x 兼容方式
 */
const getAlipayPlugin = () => {
  const cap = getCapacitor()

  if (!cap) {
    debugLog('❌ window.Capacitor 不存在')
    return null
  }

  debugLog('✅ window.Capacitor 存在', {
    isNative: cap.isNativePlatform(),
    platform: cap.getPlatform?.()
  })

  // Capacitor 8.x 方式: 使用 Plugins 对象直接访问
  if (cap.Plugins) {
    const plugin = cap.Plugins.AlipayPlugin
    if (plugin) {
      debugLog('✅ 找到插件: Capacitor.Plugins.AlipayPlugin')
      return plugin
    }
    // 尝试其他可能名称
    const possibleNames = ['alipayPlugin', 'Alipay', 'alipay']
    for (const name of possibleNames) {
      if (cap.Plugins[name]) {
        debugLog(`✅ 找到插件: Capacitor.Plugins.${name}`)
        return cap.Plugins[name]
      }
    }
    debugLog('❌ Capacitor.Plugins.AlipayPlugin 不存在')
    debugLog('可用插件列表:', Object.keys(cap.Plugins))
  }

  // Capacitor 5+ 方式: 使用 getPlugin()
  if (typeof cap.getPlugin === 'function') {
    try {
      const plugin = cap.getPlugin('AlipayPlugin')
      if (plugin) {
        debugLog('✅ 通过 getPlugin 获取插件成功')
        return plugin
      }
    } catch (e) {
      debugLog('❌ getPlugin 获取失败:', e.message)
    }
  }

  // Capacitor 5+ 方式: 使用 registerPlugin()
  if (typeof cap.registerPlugin === 'function') {
    try {
      const plugin = cap.registerPlugin('AlipayPlugin')
      if (plugin) {
        debugLog('✅ registerPlugin 获取插件成功')
        return plugin
      }
    } catch (e) {
      debugLog('❌ registerPlugin 获取失败:', e.message)
    }
  }

  debugLog('❌ 所有方式都找不到 AlipayPlugin')
  return null
}

/**
 * 支付宝支付
 * @param {string} orderStr - 后端返回的支付宝支付参数字符串
 */
export const alipayPay = async (orderStr) => {
  debugLog('开始支付', { orderStrLength: orderStr?.length })

  if (!isNativePlatform()) {
    debugLog('❌ 非原生环境(Web端)，无法调起支付宝App')
    return {
      success: false,
      error: '网页版不支持调起支付宝App支付，请在安卓真机中使用'
    }
  }

  const AlipayPlugin = getAlipayPlugin()

  if (!AlipayPlugin) {
    debugLog('❌ AlipayPlugin 插件未找到')
    return {
      success: false,
      error: '支付宝插件未加载，请确保已安装AlipayPlugin并执行npx cap sync android'
    }
  }

  if (typeof AlipayPlugin.pay !== 'function') {
    debugLog('❌ pay方法不存在', { methods: Object.keys(AlipayPlugin) })
    return { success: false, error: '支付宝插件pay方法不存在' }
  }

  try {
    debugLog('正在调起支付宝支付...')
    debugLog('调用参数:', { orderStr: orderStr?.substring(0, 100) + '...' })

    const result = await AlipayPlugin.pay({ orderStr })

    debugLog('支付宝返回结果:', result)

    // 解析支付宝SDK返回结果
    const resultStatus = result?.resultStatus || result?.resultCode

    // 9000 = 支付成功
    // 6001 = 用户取消
    // 6002 = 网络错误
    // 4000 = 订单失败
    if (resultStatus === '9000') {
      return {
        success: true,
        message: '支付成功',
        resultCode: resultStatus,
        result: result?.result
      }
    } else if (resultStatus === '6001') {
      return {
        success: false,
        cancelled: true,
        message: '用户取消支付',
        resultCode: resultStatus
      }
    } else if (resultStatus === '6002') {
      return {
        success: false,
        error: '网络连接错误',
        resultCode: resultStatus
      }
    } else if (resultStatus === '4000') {
      return {
        success: false,
        error: '订单支付失败',
        resultCode: resultStatus
      }
    } else {
      return {
        success: false,
        error: result?.message || `支付失败(${resultStatus})`,
        resultCode: resultStatus,
        result: result?.result
      }
    }
  } catch (error) {
    debugLog('❌ 支付异常:', error.message || error)
    return {
      success: false,
      error: error?.message || '支付调用失败'
    }
  }
}

/**
 * 检查支付宝是否安装
 */
export const isAlipayInstalled = async () => {
  if (!isNativePlatform()) return false

  const AlipayPlugin = getAlipayPlugin()
  if (!AlipayPlugin || typeof AlipayPlugin.isAlipayInstalled !== 'function') {
    return false
  }

  try {
    const result = await AlipayPlugin.isAlipayInstalled()
    return result?.installed || false
  } catch (error) {
    debugLog('检查支付宝安装状态失败:', error)
    return false
  }
}

/**
 * 支付宝授权
 */
export const alipayAuth = async (authInfo) => {
  if (!isNativePlatform()) {
    return { success: false, error: '请在App环境中使用' }
  }

  const AlipayPlugin = getAlipayPlugin()
  if (!AlipayPlugin || typeof AlipayPlugin.auth !== 'function') {
    return { success: false, error: '支付宝插件未加载' }
  }

  try {
    const result = await AlipayPlugin.auth({ authInfo })
    return result
  } catch (error) {
    return { success: false, error: error?.message || '授权失败' }
  }
}

export default {
  pay: alipayPay,
  isInstalled: isAlipayInstalled,
  auth: alipayAuth
}
