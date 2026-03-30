// API 服务 - 统一后端接口调用层
// 所有后端请求都通过此模块发出

import { API_BASE_URL } from '../config/api'
import {
  clearAuth,
  clearDailyRecordByDate,
  clearPendingOrderId,
  clearPaidStatus,
  deleteJournalByDate,
  getCalendarStatusByDate,
  getJourneyHistoryCache,
  getPaymentContext,
  getPendingOrderId,
  getPlanProgressByDate,
  hasPaid,
  hydrateAppStateFromServer,
  hydrateCloudAppData,
  hydrateDailyRecordFromServer,
  getJournalByDate,
  getToken,
  hydratePaymentAccessFromServer,
  hydrateSurveyStateFromServer,
  hydrateUserProfileFromServer,
  isLoggedIn,
  markAsPaid,
  savePaymentContext,
  setToken,
  setJourneyHistoryCache,
  setUserInfo
} from '../utils/storage'

let appBootstrapPromise = null
let userInfoPromise = null

// ==================== 请求基础层 ====================

/**
 * 统一请求函数
 * @param {string} url - API 路径（如 /api/auth/login）
 * @param {Object} options - { method, body, headers }
 * @returns {Promise<Object>} 后端返回的 JSON
 */
async function request(url, options = {}) {
  const token = getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : null
    })

    if (response.ok) {
      return await response.json()
    }

    // 处理 401 未授权
    if (response.status === 401) {
      console.warn('[API] 登录已过期')
      clearAuth()
      appBootstrapPromise = null

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('blueplan:auth-expired'))
      }
    }

    throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    console.error('[API] 请求失败:', url, error)
    throw error
  }
}

// ==================== 认证接口 ====================

/**
 * 发送短信验证码
 * @param {string} phone - 手机号
 */
export async function sendSmsCode(phone) {
  return request('/api/auth/send-code', {
    method: 'POST',
    body: { phone }
  })
}

/**
 * 登录/注册（验证码登录）
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 */
export async function login(phone, code, surveyId = null) {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: { phone, code, surveyId }
  })

  // 登录成功后保存 token 和用户信息
  if (result.success && result.data) {
    if (result.data.token) {
      setToken(result.data.token)
    }
    if (result.data.user) {
      setUserInfo(result.data.user)
    }
    if (result.data.access) {
      hydratePaymentAccessFromServer(result.data.access)
    }
    if (result.data.survey !== undefined || result.data.hasCompletedSurvey !== undefined) {
      hydrateSurveyStateFromServer(result.data.survey || null)
    }
  }

  return result
}

/**
 * 获取当前登录用户信息
 */
export async function getUserInfoFromServer(options = {}) {
  const { force = false } = options

  if (userInfoPromise && !force) {
    return userInfoPromise
  }

  userInfoPromise = (async () => {
    try {
      const result = await request('/api/auth/user-info')

      if (result.success && result.data) {
        hydrateUserProfileFromServer(result.data)
      }

      return result
    } finally {
      userInfoPromise = null
    }
  })()

  return userInfoPromise
}

export async function syncAuthenticatedSession(options = {}) {
  const { includeBootstrap = true, forceProfile = false } = options

  const [profile, bootstrap] = await Promise.all([
    getUserInfoFromServer({ force: forceProfile }),
    includeBootstrap ? getAppBootstrap() : Promise.resolve(null)
  ])

  return {
    success: !!profile?.success && (!includeBootstrap || !!bootstrap?.success),
    data: {
      profile: profile?.data || null,
      bootstrap: bootstrap?.data || null
    },
    profile,
    bootstrap
  }
}

export async function submitSurveyAssessment(payload) {
  return request('/api/survey/submit', {
    method: 'POST',
    body: payload
  })
}

export async function getSurveyAssessment(surveyId) {
  return request(`/api/survey/${surveyId}`)
}

export async function getAppBootstrap() {
  if (appBootstrapPromise) {
    return appBootstrapPromise
  }

  appBootstrapPromise = (async () => {
    try {
      const result = await request('/api/app/bootstrap')

      if (result.success && result.data) {
        hydrateCloudAppData(result.data)
      }

      return result
    } finally {
      appBootstrapPromise = null
    }
  })()

  return appBootstrapPromise
}

export async function updateAppState(payload) {
  const result = await request('/api/app/state', {
    method: 'PUT',
    body: payload
  })

  if (result.success && result.data) {
    hydrateAppStateFromServer(result.data)
  }

  return result
}

export async function saveDailyRecord(dateKey, payload) {
  const result = await request(`/api/app/daily-record/${dateKey}`, {
    method: 'PUT',
    body: payload
  })

  if (result.success && result.data) {
    hydrateDailyRecordFromServer(result.data)
  }

  return result
}

export async function getDailyRecord(dateKey) {
  const result = await request(`/api/app/daily-record/${dateKey}`)

  if (result.success) {
    if (result.data) {
      hydrateDailyRecordFromServer(result.data)
    } else {
      clearDailyRecordByDate(dateKey)
    }
  }

  return result
}

export async function ensureDailyRecordLoaded(dateKey, options = {}) {
  const { force = false } = options

  if (!dateKey) {
    return { success: false, skipped: true }
  }

  const hasLocalRecord = !!(
    getJournalByDate(dateKey) ||
    getPlanProgressByDate(dateKey) ||
    getCalendarStatusByDate(dateKey)
  )

  if (!force && hasLocalRecord) {
    return { success: true, cached: true }
  }

  return getDailyRecord(dateKey)
}

export async function deleteDailyJournal(dateKey) {
  const result = await request(`/api/app/daily-record/${dateKey}/journal`, {
    method: 'DELETE'
  })

  if (result.success && result.data?.deleted) {
    deleteJournalByDate(dateKey)
  }

  return result
}

export async function getJourneyHistory() {
  const result = await request('/api/app/journey-history')

  if (result.success && Array.isArray(result.data)) {
    setJourneyHistoryCache(result.data)
  }

  return result
}

export async function createJourneyHistory(payload) {
  const result = await request('/api/app/journey-history', {
    method: 'POST',
    body: payload
  })

  if (result.success && result.data) {
    const currentJourneys = getJourneyHistoryCache()
    const nextJourneys = [
      result.data,
      ...currentJourneys.filter(item => item?.journeyId !== result.data.journeyId)
    ]
    setJourneyHistoryCache(nextJourneys)
  }

  return result
}

export async function restartJourney(payload) {
  const result = await request('/api/app/journey/restart', {
    method: 'POST',
    body: payload
  })

  if (result.success && result.data) {
    hydrateCloudAppData(result.data)
  }

  return result
}

export async function getWithdrawAccount() {
  return request('/api/app/withdraw-account')
}

export async function saveWithdrawAccount(payload) {
  return request('/api/app/withdraw-account', {
    method: 'PUT',
    body: payload
  })
}

// ==================== 邀请码接口 ====================

/**
 * 验证邀请码
 * @param {string} inviteCode - 邀请码
 */
export async function validateInviteCode(inviteCode) {
  return request('/api/invite/validate', {
    method: 'POST',
    body: { inviteCode }
  })
}

// ==================== 支付接口 ====================

/**
 * 创建支付订单
 * @param {string} phone - 手机号
 * @param {string} inviteCode - 邀请码（可选）
 * @param {string} productType - 商品类型
 * @param {string} channel - 支付渠道 alipay/wechat
 */
export async function createPaymentOrder(phone, inviteCode, productType = 'entry_access', channel = 'alipay') {
  return request('/api/payment/create', {
    method: 'POST',
    body: { phone, inviteCode, productType, channel }
  })
}

/**
 * 查询支付状态
 * @param {string} orderId - 订单ID
 */
export async function getPaymentStatus(orderId) {
  return request(`/api/payment/status?orderId=${orderId}`)
}

export async function syncPaymentAccessState(orderId = null) {
  const localPaid = hasPaid()
  const paymentContext = getPaymentContext()
  const trackedOrderId = orderId || getPendingOrderId() || paymentContext?.orderId

  if (!trackedOrderId) {
    return localPaid
  }

  try {
    const result = await getPaymentStatus(trackedOrderId)
    const serverStatus = result?.data?.status

    if (result.success && serverStatus === 'paid') {
      markAsPaid({
        ...paymentContext,
        orderId: trackedOrderId,
        paidAt: result.data.paidAt || paymentContext?.paidAt || Date.now(),
        syncedWithServer: true
      })
      return true
    }

    if (result.success && serverStatus) {
      clearPaidStatus()
      savePaymentContext({
        ...paymentContext,
        orderId: trackedOrderId,
        status: serverStatus,
        syncedWithServer: true,
        lastCheckedAt: new Date().toISOString()
      })
      return false
    }
  } catch (error) {
    console.warn('[API] 启动阶段同步支付状态失败:', error)
  }

  return localPaid
}

/**
 * 模拟支付成功（仅开发环境使用）
 * @param {string} orderId - 订单ID
 */
export async function mockPaymentNotify(orderId) {
  return request('/api/payment/notify', {
    method: 'POST',
    body: {
      outTradeNo: orderId,
      tradeNo: `MOCK_${Date.now()}`,
      tradeStatus: 'TRADE_SUCCESS'
    }
  })
}

// ==================== 邀请关系接口 ====================

/**
 * 绑定邀请关系（登录后调用）
 * @param {string} orderId - 待绑定的订单ID
 */
export async function bindInviteRelation(orderId) {
  return request('/api/invite/bind', {
    method: 'POST',
    body: { orderId }
  })
}

export async function bindPendingInviteRelation(orderId = null) {
  const targetOrderId = orderId || getPendingOrderId() || getPaymentContext()?.orderId
  if (!targetOrderId || !isLoggedIn()) {
    return { success: false, skipped: true }
  }

  const paymentContext = getPaymentContext()
  const contextMatchesOrder = paymentContext?.orderId === targetOrderId

  if (contextMatchesOrder) {
    savePaymentContext({
      ...paymentContext,
      bindStatus: 'processing',
      lastBindAttemptAt: new Date().toISOString()
    })
  }

  try {
    const bindResult = await bindInviteRelation(targetOrderId)
    const bindErrorCode = bindResult.error?.code || ''

    if (bindResult.success || bindErrorCode === 'RELATION_NOT_FOUND') {
      clearPendingOrderId()

      if (contextMatchesOrder) {
        savePaymentContext({
          ...paymentContext,
          inviteRelationBound: bindResult.success,
          inviteRelationBoundAt: bindResult.success ? new Date().toISOString() : null,
          bindStatus: bindResult.success ? 'bound' : 'not_needed',
          lastBindError: null
        })
      }

      return {
        ...bindResult,
        success: true,
        data: {
          ...(bindResult.data || {}),
          orderId: targetOrderId,
          inviteRelationBound: !!bindResult.success,
          bindStatus: bindResult.success ? 'bound' : 'not_needed'
        }
      }
    }

    const bindError = bindResult.error?.message || bindResult.error || '未知原因'

    if (contextMatchesOrder) {
      savePaymentContext({
        ...paymentContext,
        inviteRelationBound: false,
        bindStatus: 'retry_pending',
        lastBindError: bindError,
        lastBindAttemptAt: new Date().toISOString()
      })
    }

    return bindResult
  } catch (error) {
    console.warn('[API] 邀请关系绑定失败，将保留下次重试:', error)

    if (contextMatchesOrder) {
      savePaymentContext({
        ...paymentContext,
        inviteRelationBound: false,
        bindStatus: 'retry_pending',
        lastBindError: error?.message || '绑定失败',
        lastBindAttemptAt: new Date().toISOString()
      })
    }

    return {
      success: false,
      error: {
        message: error?.message || '绑定失败'
      }
    }
  }
}

/**
 * 激活奖励结算（首次完成任务后调用）
 * @param {string} activationType - 激活类型
 */
export async function activateInvite(activationType = 'first_task_complete') {
  const result = await request('/api/invite/activate', {
    method: 'POST',
    body: { activationType }
  })

  if (result.success && result.data?.appState) {
    hydrateAppStateFromServer(result.data.appState)
  }

  return result
}

// ==================== 收益接口 ====================

/**
 * 获取收益概览
 */
export async function getInviteSummary() {
  return request('/api/invite/summary')
}

/**
 * 获取奖励流水
 */
export async function getRewardLedger(page = 1, pageSize = 20) {
  return request(`/api/invite/reward-ledger?page=${page}&pageSize=${pageSize}`)
}

// ==================== 提现接口 ====================

/**
 * 申请提现
 */
export async function applyWithdraw(amount, channel, account, accountName) {
  return request('/api/withdraw/apply', {
    method: 'POST',
    body: { amount, channel, account, accountName }
  })
}

/**
 * 获取提现记录
 */
export async function getWithdrawRecords(page = 1, pageSize = 20) {
  return request(`/api/withdraw/records?page=${page}&pageSize=${pageSize}`)
}
