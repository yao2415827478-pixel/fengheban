// 支付服务模块
// 用于处理支付宝 App 支付
// 注意：此模块将在支付模块阶段重构，当前仅做存储层统一

import { API_BASE_URL } from '../config/api'
import {
  createPaymentOrder as createBackendPaymentOrder,
  getPaymentStatus,
  mockPaymentNotify
} from './api'

// 导入支付宝插件
import { alipayPay } from '../plugins/alipay'

// 支付方式枚举
export const PaymentMethod = {
  WECHAT: 'wechat',
  ALIPAY: 'alipay'
}

// 支付状态
export const PaymentStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
}

/**
 * 获取 Capacitor 实例（安全方式）
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
const isNativePlatform = () => {
  const cap = getCapacitor()
  return cap ? cap.isNativePlatform() : false
}

const sleep = (ms) => new Promise((resolve) => {
  globalThis.setTimeout(resolve, ms)
})

const canUseDevMock = () => {
  if (import.meta.env.DEV) {
    return true
  }

  if (typeof window === 'undefined') {
    return false
  }

  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

const waitForPaymentConfirmation = async (orderId, options = {}) => {
  const {
    attempts = 15,
    intervalMs = 2000
  } = options

  for (let i = 0; i < attempts; i += 1) {
    const statusResult = await getPaymentStatus(orderId)
    const paymentStatus = statusResult?.data?.status

    if (statusResult.success && paymentStatus === 'paid') {
      return {
        confirmed: true,
        data: statusResult.data
      }
    }

    if (statusResult.success && (paymentStatus === 'failed' || paymentStatus === 'refunded')) {
      return {
        confirmed: false,
        failed: true,
        message: paymentStatus === 'refunded' ? '订单已退款' : '订单未支付成功'
      }
    }

    if (i < attempts - 1) {
      await sleep(intervalMs)
    }
  }

  return {
    confirmed: false,
    pending: true,
    message: '支付已受理，系统仍在确认订单，请稍后重新打开应用查看'
  }
}

/**
 * 创建支付订单
 * @param {string} method - 支付方式 (wechat/alipay)
 * @param {object} orderInfo - 订单信息
 * @param {number} orderInfo.amount - 支付金额(分)
 * @param {string} orderInfo.subject - 商品标题
 * @param {string} orderInfo.description - 商品描述
 * @returns {Promise<object>} 支付结果
 */
export const createPaymentOrder = async (method, orderInfo) => {
  if (method === PaymentMethod.WECHAT) {
    return await createWechatPayOrder(orderInfo)
  } else if (method === PaymentMethod.ALIPAY) {
    return await createAlipayOrder(orderInfo)
  } else {
    throw new Error('不支持的支付方式')
  }
}

/**
 * 创建微信支付订单
 */
const createWechatPayOrder = async (orderInfo) => {
  // 微信支付暂未接入
  console.log('微信支付暂未开放:', orderInfo)
  return {
    success: false,
    message: '微信支付暂未开放，请使用支付宝支付'
  }
}

/**
 * 创建支付宝订单并调起支付
 */
const createAlipayOrder = async (orderInfo) => {
  try {
    const result = await createBackendPaymentOrder(
      orderInfo.phone,
      orderInfo.inviteCode,
      orderInfo.productType,
      PaymentMethod.ALIPAY
    )

    console.log('支付宝订单创建结果:', result)

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error?.message || '创建订单失败'
      }
    }

    const { orderId, payParams } = result.data
    const orderStr = payParams?.orderStr

    if (orderStr && isNativePlatform()) {
      const payResult = await alipayPay(orderStr)

      if (payResult.success) {
        const confirmResult = await waitForPaymentConfirmation(orderId)

        if (confirmResult.confirmed) {
          return {
            success: true,
            orderId,
            paymentSuccess: true,
            message: '支付成功'
          }
        }

        if (confirmResult.failed) {
          return {
            success: false,
            orderId,
            error: confirmResult.message || '支付未完成'
          }
        }

        return {
          orderId,
          success: false,
          pendingConfirmation: true,
          message: confirmResult.message
        }
      }

      if (payResult.message === '用户取消支付' || payResult.cancelled) {
        return {
          success: false,
          cancelled: true,
          message: '用户取消支付'
        }
      }

      return {
        success: false,
        error: payResult.message || payResult.error || '支付失败'
      }
    }

    if (!isNativePlatform()) {
      if (!canUseDevMock()) {
        return {
          success: false,
          orderId,
          error: '请在安卓 App 中完成支付宝支付'
        }
      }

      const notifyResult = await mockPaymentNotify(orderId)
      if (notifyResult.success) {
        return {
          success: true,
          orderId,
          paymentSuccess: true,
          demo: true,
          message: '开发环境模拟支付成功'
        }
      }

      return {
        success: false,
        error: notifyResult.error?.message || '模拟支付失败'
      }
    }

    if (orderStr) {
      return {
        success: false,
        error: '支付环境异常，请重试'
      }
    } else {
      return {
        success: false,
        error: '后端暂未返回支付宝支付参数'
      }
    }
  } catch (error) {
    console.error('创建支付宝订单失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 查询订单状态
 * @param {string} method - 支付方式
 * @param {string} orderId - 订单ID
 * @returns {Promise<object>} 订单状态
 */
export const queryPaymentOrder = async (method, orderId) => {
  if (method === PaymentMethod.WECHAT) {
    return await queryWechatPayOrder(orderId)
  } else if (method === PaymentMethod.ALIPAY) {
    return await queryAlipayOrder(orderId)
  } else {
    throw new Error('不支持的支付方式')
  }
}

/**
 * 查询微信支付订单状态
 */
const queryWechatPayOrder = async (orderId) => {
  return {
    success: false,
    message: '微信支付暂未开放'
  }
}

/**
 * 查询支付宝订单状态
 */
const queryAlipayOrder = async (orderId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payment/status?orderId=${orderId}`)
    return await response.json()
  } catch (error) {
    console.error('查询支付宝订单失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 检查支付是否配置
 */
export const isPaymentConfigured = (method) => {
  if (method === PaymentMethod.ALIPAY) {
    return true // 支付宝已接入
  }
  return false // 微信支付暂未接入
}

export default {
  PaymentMethod,
  PaymentStatus,
  createPaymentOrder,
  queryPaymentOrder,
  isPaymentConfigured,
  isNativePlatform
}
