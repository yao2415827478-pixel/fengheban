/**
 * 统一存储层
 * 所有数据存储必须使用此工具，按日期键索引
 * 禁止在各页面单独操作 localStorage
 */

import { ref } from 'vue'
import { STORAGE_KEYS } from './dateUtils'

// ==================== 开发调试开关 ====================

const DEV_BYPASS_KEY = '__blueplan_dev_bypass__'
const AUTH_KEYS_DEV = {
  ...Object.fromEntries(
    Object.entries({
      TOKEN: 'auth_token',
      USER_INFO: 'user_info',
      HAS_PAID: 'has_paid',
      PAYMENT_TIME: 'payment_time',
      PAYMENT_CONTEXT: 'payment_context',
      PENDING_ORDER_ID: 'pending_order_id',
      PHONE: 'user_phone'
    }).map(([k, v]) => [k, `${DEV_BYPASS_KEY}_${v}`])
  )
}

/**
 * 检测是否应该允许开发绕过
 * 规则:
 * 1. 必须启用 VITE_DEV_BYPASS 环境变量
 * 2. 必须检测为开发环境 (localhost/127.0.0.1/10.0.2.2)
 * 3. 生产构建绝对不允许绕过
 */
export function isDevBypassAllowed() {
  // 生产构建禁止任何绕过
  if (!import.meta.env.DEV) {
    return false
  }

  // 检查环境变量配置
  const envBypass = import.meta.env.VITE_DEV_BYPASS
  if (envBypass === 'false' || envBypass === '0' || envBypass === 'no') {
    return false
  }

  // 检查是否为开发环境
  if (typeof window === 'undefined') {
    return false
  }

  const hostname = window.location.hostname
  const isLocalDev = ['localhost', '127.0.0.1', '192.168.', '10.0.2.2'].some(
    host => hostname.includes(host) || hostname.startsWith(host)
  )

  return isLocalDev && (envBypass === 'true' || envBypass === '1' || !envBypass)
}

/**
 * 检查是否启用了开发绕过
 */
export function isDevBypassEnabled() {
  if (!isDevBypassAllowed()) {
    return false
  }

  try {
    const enabled = localStorage.getItem(DEV_BYPASS_KEY)
    return enabled === 'true'
  } catch {
    return false
  }
}

/**
 * 启用开发绕过（仅开发环境有效）
 * @param {Object} userData - 模拟用户数据 { userId, phone, inviteCode }
 */
export function enableDevBypass(userData = {}) {
  if (!isDevBypassAllowed()) {
    console.warn('[Dev Bypass] 生产环境禁止启用开发绕过')
    return false
  }

  try {
    localStorage.setItem(DEV_BYPASS_KEY, 'true')

    // 设置模拟用户数据
    const mockToken = `dev_bypass_token_${Date.now()}`
    localStorage.setItem(AUTH_KEYS_DEV.TOKEN, mockToken)
    localStorage.setItem(AUTH_KEYS_DEV.USER_INFO, JSON.stringify({
      userId: userData.userId || 'dev_user_001',
      phone: userData.phone || '13800138000',
      inviteCode: userData.inviteCode || 'DEVCODE',
      nickname: '开发测试用户',
      ...userData
    }))
    localStorage.setItem(AUTH_KEYS_DEV.HAS_PAID, 'true')
    localStorage.setItem(AUTH_KEYS_DEV.PAYMENT_TIME, Date.now().toString())

    console.log('[Dev Bypass] 开发绕过已启用')
    console.log('[Dev Bypass] Token:', mockToken)
    return true
  } catch (error) {
    console.error('[Dev Bypass] 启用失败:', error)
    return false
  }
}

/**
 * 禁用开发绕过
 */
export function disableDevBypass() {
  try {
    localStorage.removeItem(DEV_BYPASS_KEY)
    Object.values(AUTH_KEYS_DEV).forEach(key => {
      localStorage.removeItem(key)
    })
    console.log('[Dev Bypass] 开发绕过已禁用')
    return true
  } catch (error) {
    console.error('[Dev Bypass] 禁用失败:', error)
    return false
  }
}

/**
 * 获取开发绕过 Token（如果有）
 */
export function getDevBypassToken() {
  if (!isDevBypassEnabled()) {
    return null
  }

  try {
    return localStorage.getItem(AUTH_KEYS_DEV.TOKEN)
  } catch {
    return null
  }
}

/**
 * 获取开发绕过用户信息
 */
export function getDevBypassUserInfo() {
  if (!isDevBypassEnabled()) {
    return null
  }

  try {
    const info = localStorage.getItem(AUTH_KEYS_DEV.USER_INFO)
    return info ? JSON.parse(info) : null
  } catch {
    return null
  }
}

// ==================== 基础存储操作 ====================

/**
 * 获取本地存储值
 * @param {string} key - 存储键名
 * @param {any} defaultValue - 默认值
 * @returns {any}
 */
function getItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue
    return JSON.parse(item)
  } catch (error) {
    console.error(`[Storage] Get item error: ${key}`, error)
    return defaultValue
  }
}

/**
 * 设置本地存储值
 * @param {string} key - 存储键名
 * @param {any} value - 要存储的值
 */
function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`[Storage] Set item error: ${key}`, error)
    return false
  }
}

/**
 * 移除本地存储项
 * @param {string} key - 存储键名
 */
function removeItem(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`[Storage] Remove item error: ${key}`, error)
    return false
  }
}

function getStringItem(key, defaultValue = '') {
  try {
    const item = localStorage.getItem(key)
    return item === null ? defaultValue : item
  } catch (error) {
    console.error(`[Storage] Get string item error: ${key}`, error)
    return defaultValue
  }
}

function setStringItem(key, value) {
  try {
    if (value === null || value === undefined || value === '') {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, String(value))
    }
    return true
  } catch (error) {
    console.error(`[Storage] Set string item error: ${key}`, error)
    return false
  }
}

// ==================== 用户时间状态 ====================

/**
 * 获取用户时间状态
 * @returns {Object} { currentDateKey, appStartDate, lastActiveDateKey, currentDayIndex }
 */
export function getUserTimeState() {
  return {
    currentDateKey: getItem(STORAGE_KEYS.CURRENT_DATE_KEY, null),
    appStartDate: getItem(STORAGE_KEYS.APP_START_DATE, null),
    lastActiveDateKey: getItem(STORAGE_KEYS.LAST_ACTIVE_DATE_KEY, null),
    currentDayIndex: getItem(STORAGE_KEYS.CURRENT_DAY_INDEX, 1)
  }
}

/**
 * 保存用户时间状态
 * @param {Object} state - { currentDateKey, appStartDate, lastActiveDateKey, currentDayIndex }
 */
export function saveUserTimeState(state) {
  if (state.currentDateKey !== undefined) {
    setItem(STORAGE_KEYS.CURRENT_DATE_KEY, state.currentDateKey)
  }
  if (state.appStartDate !== undefined) {
    setItem(STORAGE_KEYS.APP_START_DATE, state.appStartDate)
  }
  if (state.lastActiveDateKey !== undefined) {
    setItem(STORAGE_KEYS.LAST_ACTIVE_DATE_KEY, state.lastActiveDateKey)
  }
  if (state.currentDayIndex !== undefined) {
    setItem(STORAGE_KEYS.CURRENT_DAY_INDEX, state.currentDayIndex)
  }
}

/**
 * 初始化用户时间状态（首次启动）
 * @param {string} startDateKey - 计划开始日期
 */
export function initUserTimeState(startDateKey) {
  const todayKey = getTodayKey()
  const dayIndex = getDayIndexFromStart(startDateKey, todayKey)

  const state = {
    currentDateKey: todayKey,
    appStartDate: startDateKey,
    lastActiveDateKey: todayKey,
    currentDayIndex: dayIndex
  }

  saveUserTimeState(state)
  return state
}

/**
 * 更新每日同步后的时间状态
 * @param {string} newDateKey - 新日期键
 * @param {number} newDayIndex - 新的天数索引
 */
export function updateTimeStateOnSync(newDateKey, newDayIndex) {
  const current = getUserTimeState()

  const newState = {
    currentDateKey: newDateKey,
    lastActiveDateKey: newDateKey,
    currentDayIndex: newDayIndex
  }

  saveUserTimeState(newState)
  return newState
}

// ==================== 日记数据 ====================

/**
 * 获取所有日记数据
 * @returns {Object} 日期键 -> 日记内容 的映射
 */
export function getAllJournalEntries() {
  return getItem(STORAGE_KEYS.JOURNAL_ENTRIES, {})
}

/**
 * 获取指定日期的日记
 * @param {string} dateKey - YYYY-MM-DD
 * @returns {Object|null} 日记对象或null
 */
export function getJournalByDate(dateKey) {
  const allEntries = getAllJournalEntries()
  return allEntries[dateKey] || null
}

/**
 * 保存指定日期的日记
 * @param {string} dateKey - YYYY-MM-DD
 * @param {Object} journalData - { content, mood, tags, createdAt, updatedAt }
 * @returns {boolean} 是否保存成功
 */
export function saveJournalByDate(dateKey, journalData) {
  const allEntries = getAllJournalEntries()

  const entry = {
    ...journalData,
    dateKey,
    updatedAt: new Date().toISOString(),
    // 如果是新创建，设置创建时间
    createdAt: journalData.createdAt || new Date().toISOString()
  }

  allEntries[dateKey] = entry
  return setItem(STORAGE_KEYS.JOURNAL_ENTRIES, allEntries)
}

/**
 * 删除指定日期的日记
 * @param {string} dateKey - YYYY-MM-DD
 * @returns {boolean} 是否删除成功
 */
export function deleteJournalByDate(dateKey) {
  const allEntries = getAllJournalEntries()
  delete allEntries[dateKey]
  return setItem(STORAGE_KEYS.JOURNAL_ENTRIES, allEntries)
}

/**
 * 获取日记日期列表（按日期降序）
 * @returns {string[]} 日期键数组
 */
export function getJournalDateList() {
  const allEntries = getAllJournalEntries()
  return Object.keys(allEntries).sort().reverse()
}

// ==================== 每日任务进度 ====================

/**
 * 获取所有每日任务进度数据
 * @returns {Object} 日期键 -> 任务进度 的映射
 */
export function getAllPlanProgress() {
  return getItem(STORAGE_KEYS.PLAN_PROGRESS, {})
}

/**
 * 获取指定日期的任务进度
 * @param {string} dateKey - YYYY-MM-DD
 * @returns {Object|null} 任务进度对象或null
 */
export function getPlanProgressByDate(dateKey) {
  const allProgress = getAllPlanProgress()
  return allProgress[dateKey] || null
}

/**
 * 保存指定日期的任务进度
 * @param {string} dateKey - YYYY-MM-DD
 * @param {Object} progressData - { tasks: [{id, completed, ...}], dayIndex, ... }
 * @returns {boolean} 是否保存成功
 */
export function savePlanProgressByDate(dateKey, progressData) {
  const allProgress = getAllPlanProgress()

  const entry = {
    ...progressData,
    dateKey,
    updatedAt: new Date().toISOString()
  }

  allProgress[dateKey] = entry
  return setItem(STORAGE_KEYS.PLAN_PROGRESS, allProgress)
}

export function deletePlanProgressByDate(dateKey) {
  const allProgress = getAllPlanProgress()
  if (allProgress[dateKey] === undefined) {
    return true
  }

  delete allProgress[dateKey]
  return setItem(STORAGE_KEYS.PLAN_PROGRESS, allProgress)
}

/**
 * 更新指定日期的单个任务状态
 * @param {string} dateKey - YYYY-MM-DD
 * @param {string} taskId - 任务ID
 * @param {boolean} completed - 是否完成
 * @returns {boolean} 是否保存成功
 */
export function updateTaskCompletion(dateKey, taskId, completed) {
  let progress = getPlanProgressByDate(dateKey)

  if (!progress) {
    progress = { tasks: [], dayIndex: getDayIndexFromStart(getItem(STORAGE_KEYS.APP_START_DATE), dateKey) }
  }

  // 查找或创建任务
  const taskIndex = progress.tasks.findIndex(t => t.id === taskId)
  if (taskIndex >= 0) {
    progress.tasks[taskIndex].completed = completed
    progress.tasks[taskIndex].completedAt = completed ? new Date().toISOString() : null
  } else {
    progress.tasks.push({
      id: taskId,
      completed,
      completedAt: completed ? new Date().toISOString() : null
    })
  }

  return savePlanProgressByDate(dateKey, progress)
}

/**
 * 获取任务进度日期列表（按日期降序）
 * @returns {string[]} 日期键数组
 */
export function getPlanProgressDateList() {
  const allProgress = getAllPlanProgress()
  return Object.keys(allProgress).sort().reverse()
}

// ==================== 日历打卡状态 ====================

/**
 * 获取所有日历打卡状态
 * @returns {Object} 日期键 -> 打卡状态 的映射
 */
export function getAllCalendarStatus() {
  return getItem(STORAGE_KEYS.CALENDAR_STATUS, {})
}

/**
 * 获取指定日期的打卡状态
 * @param {string} dateKey - YYYY-MM-DD
 * @returns {Object|null} 打卡状态对象或null
 */
export function getCalendarStatusByDate(dateKey) {
  const allStatus = getAllCalendarStatus()
  return allStatus[dateKey] || null
}

/**
 * 保存指定日期的打卡状态
 * @param {string} dateKey - YYYY-MM-DD
 * @param {Object} statusData - { checked, checkInTime, checkOutTime, notes }
 * @returns {boolean} 是否保存成功
 */
export function saveCalendarStatusByDate(dateKey, statusData) {
  const allStatus = getAllCalendarStatus()

  const entry = {
    ...statusData,
    dateKey,
    updatedAt: new Date().toISOString()
  }

  allStatus[dateKey] = entry
  return setItem(STORAGE_KEYS.CALENDAR_STATUS, allStatus)
}

export function deleteCalendarStatusByDate(dateKey) {
  const allStatus = getAllCalendarStatus()
  if (allStatus[dateKey] === undefined) {
    return true
  }

  delete allStatus[dateKey]
  return setItem(STORAGE_KEYS.CALENDAR_STATUS, allStatus)
}

/**
 * 标记指定日期为已打卡
 * @param {string} dateKey - YYYY-MM-DD
 * @param {string} checkInTime - 打卡时间（可选，默认当前时间）
 * @returns {boolean}
 */
export function checkInDate(dateKey, checkInTime = null) {
  return saveCalendarStatusByDate(dateKey, {
    checked: true,
    checkInTime: checkInTime || new Date().toISOString()
  })
}

/**
 * 取消指定日期的打卡
 * @param {string} dateKey - YYYY-MM-DD
 * @returns {boolean}
 */
export function uncheckDate(dateKey) {
  return saveCalendarStatusByDate(dateKey, {
    checked: false,
    checkInTime: null
  })
}

/**
 * 获取打卡日期列表
 * @returns {string[]} 已打卡的日期键数组
 */
export function getCheckedDateList() {
  const allStatus = getAllCalendarStatus()
  return Object.keys(allStatus)
    .filter(dateKey => allStatus[dateKey]?.checked)
    .sort()
    .reverse()
}

/**
 * 获取本月打卡统计
 * @param {string} yearMonth - YYYY-MM 格式
 * @returns {Object} { totalDays, checkedDays, checkedDates }
 */
export function getMonthCheckStats(yearMonth) {
  const allStatus = getAllCalendarStatus()

  // 获取该月所有日期
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  const checkedDates = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${yearMonth}-${String(day).padStart(2, '0')}`
    if (allStatus[dateKey]?.checked) {
      checkedDates.push(dateKey)
    }
  }

  return {
    totalDays: daysInMonth,
    checkedDays: checkedDates.length,
    checkedDates
  }
}

// ==================== 计划配置 ====================

/**
 * 获取计划配置
 * @returns {Object|null}
 */
export function getPlanConfig() {
  return getItem(STORAGE_KEYS.PLAN_CONFIG, null)
}

/**
 * 保存计划配置
 * @param {Object} config
 * @returns {boolean}
 */
export function savePlanConfig(config) {
  return setItem(STORAGE_KEYS.PLAN_CONFIG, config)
}

export function hydrateCloudAppData(payload = {}) {
  const state = payload.state || {}
  const dailyRecords = Array.isArray(payload.dailyRecords) ? payload.dailyRecords : []

  hydrateAppStateFromServer(state)

  const journalEntries = {}
  const calendarStatus = {}
  const planProgress = {}

  dailyRecords.forEach((record) => {
    const dateKey = record.dateKey
    if (!dateKey) return

    if (record.journalContent || record.journalMood || record.journalTopic) {
      journalEntries[dateKey] = {
        dateKey,
        content: record.journalContent || '',
        mood: record.journalMood || null,
        topic: record.journalTopic || '',
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: record.updatedAt || new Date().toISOString()
      }
    }

    calendarStatus[dateKey] = {
      dateKey,
      checked: !!record.checked,
      checkInTime: record.checkInTime
        ? new Date(record.checkInTime).toISOString()
        : null,
      updatedAt: record.updatedAt || new Date().toISOString()
    }

    planProgress[dateKey] = {
      dateKey,
      dayIndex: record.dayIndex || null,
      tasks: Array.isArray(record.tasks) ? record.tasks : [],
      updatedAt: record.updatedAt || new Date().toISOString()
    }
  })

  setItem(STORAGE_KEYS.JOURNAL_ENTRIES, journalEntries)
  setItem(STORAGE_KEYS.CALENDAR_STATUS, calendarStatus)
  setItem(STORAGE_KEYS.PLAN_PROGRESS, planProgress)
  setJourneyHistoryCache(payload.journeyHistories || [])
}

export function hydrateAppStateFromServer(state = {}) {
  saveUserTimeState({
    currentDateKey: state.currentDateKey || null,
    appStartDate: state.appStartDate || null,
    lastActiveDateKey: state.lastActiveDateKey || null,
    currentDayIndex: state.currentDayIndex || 1
  })

  try {
    setCachedUserGoal(state.currentGoal || '')
    setCachedGoalDays(state.goalDays || 90)

    if (state.appStartDate) {
      const startTimestamp = new Date(`${state.appStartDate}T00:00:00`).getTime()
      localStorage.setItem(APP_CACHE_KEYS.START_DATE_TS, startTimestamp.toString())
    } else {
      localStorage.removeItem(APP_CACHE_KEYS.START_DATE_TS)
    }

    if (state.inviteActivated !== undefined) {
      setCachedInviteActivated(state.inviteActivated)
    }

    if (state.latestSurvey !== undefined) {
      hydrateSurveyStateFromServer(state.latestSurvey)
    }
  } catch (error) {
    console.error('[Storage] hydrateAppStateFromServer error:', error)
  }

  return state
}

// ==================== 数据迁移与清理 ====================

/**
 * 迁移旧格式数据到新格式
 * 旧格式: { "journal_2026-03-12": "content" }
 * 新格式: { "2026-03-12": { content: "content", ... } }
 */
export function migrateLegacyData() {
  // 检查是否有旧格式的日记数据
  const legacyJournalKeys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('journal_')) {
      legacyJournalKeys.push(key)
    }
  }

  if (legacyJournalKeys.length > 0) {
    const newJournalData = getAllJournalEntries()

    legacyJournalKeys.forEach(legacyKey => {
      const dateKey = legacyKey.replace('journal_', '')
      const oldContent = localStorage.getItem(legacyKey)

      if (oldContent) {
        newJournalData[dateKey] = {
          content: oldContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        localStorage.removeItem(legacyKey)
      }
    })

    setItem(STORAGE_KEYS.JOURNAL_ENTRIES, newJournalData)
    console.log('[Storage] Migrated legacy journal data:', legacyJournalKeys.length)
  }
}

/**
 * 清理无效的日期数据
 * 移除超过90天的旧数据（可选）
 * @param {number} maxDays - 最大保留天数，默认180天
 */
export function cleanupOldData(maxDays = 180) {
  const today = getTodayKey()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxDays)
  const cutoffKey = formatDateKey(cutoffDate)

  // 清理日记
  const journalEntries = getAllJournalEntries()
  let cleanedCount = 0

  Object.keys(journalEntries).forEach(dateKey => {
    if (dateKey < cutoffKey) {
      delete journalEntries[dateKey]
      cleanedCount++
    }
  })

  if (cleanedCount > 0) {
    setItem(STORAGE_KEYS.JOURNAL_ENTRIES, journalEntries)
    console.log(`[Storage] Cleaned ${cleanedCount} old journal entries`)
  }

  return cleanedCount
}

// ==================== 认证与用户数据 ====================

const AUTH_KEYS = {
  TOKEN: 'auth_token',
  USER_INFO: 'auth_userInfo',
  PHONE: 'auth_phone',
  PAYMENT_CONTEXT: 'paymentContext',
  HAS_PAID: 'hasPaid',
  PAYMENT_TIME: 'paymentTime',
  PENDING_ORDER_ID: 'pendingOrderId',
  PENDING_INVITE_CODE: 'pendingInviteCode',
}

const APP_CACHE_KEYS = {
  APP_VERSION: 'appVersion',
  USER_GOAL: 'userGoal',
  GOAL_DAYS: 'goalDays',
  START_DATE_TS: 'startDate',
  INVITE_ACTIVATED: 'invite_activated',
  JOURNEYS: 'journeys',
  SURVEY_RESULT: 'surveyResult',
  SURVEY_COMPLETED: 'hasCompletedSurvey',
  PAYMENT_PHONE: 'paymentPhone'
}

const normalizeGoalDays = (value) => {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 90
}

const normalizeSurveyResult = (result = null) => {
  if (!result) {
    return null
  }

  return {
    ...result,
    surveyId: result.surveyId || null,
    score: Number(result.score || 0),
    answers: Array.isArray(result.answers) ? result.answers : [],
    timestamp: result.timestamp || result.updatedAt || result.createdAt || Date.now(),
    createdAt: result.createdAt || null,
    updatedAt: result.updatedAt || null,
    completed: result.completed !== undefined
      ? !!result.completed
      : getStringItem(APP_CACHE_KEYS.SURVEY_COMPLETED, 'false') === 'true'
  }
}

const appCacheState = {
  currentGoal: ref(getStringItem(APP_CACHE_KEYS.USER_GOAL, '')),
  goalDays: ref(normalizeGoalDays(getStringItem(APP_CACHE_KEYS.GOAL_DAYS, '90'))),
  inviteActivated: ref(getStringItem(APP_CACHE_KEYS.INVITE_ACTIVATED, 'false') === 'true'),
  surveyResult: ref(normalizeSurveyResult(getItem(APP_CACHE_KEYS.SURVEY_RESULT, null))),
  hasPaidAccess: ref(getStringItem(AUTH_KEYS.HAS_PAID, 'false') === 'true'),
  latestPaidOrderId: ref(getItem(AUTH_KEYS.PAYMENT_CONTEXT, null)?.orderId || null),
  latestPaidAt: ref(Number(getStringItem(AUTH_KEYS.PAYMENT_TIME, '0')) || null)
}

export function useAppCacheState() {
  return {
    currentGoal: appCacheState.currentGoal,
    goalDays: appCacheState.goalDays,
    inviteActivated: appCacheState.inviteActivated,
    surveyResult: appCacheState.surveyResult,
    hasPaidAccess: appCacheState.hasPaidAccess,
    latestPaidOrderId: appCacheState.latestPaidOrderId,
    latestPaidAt: appCacheState.latestPaidAt
  }
}

/**
 * 获取认证 token
 * @returns {string|null}
 */
export function getToken() {
  try {
    return localStorage.getItem(AUTH_KEYS.TOKEN) || null
  } catch {
    return null
  }
}

/**
 * 保存认证 token
 * @param {string} token
 */
export function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(AUTH_KEYS.TOKEN, token)
    } else {
      localStorage.removeItem(AUTH_KEYS.TOKEN)
    }
  } catch (e) {
    console.error('[Storage] setToken error:', e)
  }
}

/**
 * 获取用户信息
 * @returns {Object|null}
 */
export function getUserInfo() {
  return getItem(AUTH_KEYS.USER_INFO, null)
}

/**
 * 保存用户信息
 * @param {Object} user - { userId, phone, nickname, inviteCode, ... }
 */
export function setUserInfo(user) {
  setItem(AUTH_KEYS.USER_INFO, user)
  if (user?.phone) {
    try { localStorage.setItem(AUTH_KEYS.PHONE, user.phone) } catch {}
  }
}

/**
 * 获取手机号
 * @returns {string|null}
 */
export function getPhone() {
  try {
    return localStorage.getItem(AUTH_KEYS.PHONE) || null
  } catch {
    return null
  }
}

/**
 * 清除认证数据（退出登录）
 */
export function clearAuth() {
  try {
    const keysToClear = [
      AUTH_KEYS.TOKEN,
      AUTH_KEYS.USER_INFO,
      AUTH_KEYS.PHONE,
      AUTH_KEYS.PAYMENT_CONTEXT,
      AUTH_KEYS.HAS_PAID,
      AUTH_KEYS.PAYMENT_TIME,
      AUTH_KEYS.PENDING_ORDER_ID,
      AUTH_KEYS.PENDING_INVITE_CODE,
      STORAGE_KEYS.CURRENT_DATE_KEY,
      STORAGE_KEYS.APP_START_DATE,
      STORAGE_KEYS.LAST_ACTIVE_DATE_KEY,
      STORAGE_KEYS.CURRENT_DAY_INDEX,
      STORAGE_KEYS.JOURNAL_ENTRIES,
      STORAGE_KEYS.PLAN_PROGRESS,
      STORAGE_KEYS.CALENDAR_STATUS,
      STORAGE_KEYS.PLAN_CONFIG,
      APP_CACHE_KEYS.USER_GOAL,
      APP_CACHE_KEYS.GOAL_DAYS,
      APP_CACHE_KEYS.START_DATE_TS,
      APP_CACHE_KEYS.INVITE_ACTIVATED,
      APP_CACHE_KEYS.JOURNEYS,
      APP_CACHE_KEYS.PAYMENT_PHONE
    ]

    keysToClear.forEach((key) => {
      localStorage.removeItem(key)
    })

    appCacheState.currentGoal.value = ''
    appCacheState.goalDays.value = 90
    appCacheState.inviteActivated.value = false
    appCacheState.surveyResult.value = null
    appCacheState.hasPaidAccess.value = false
    appCacheState.latestPaidOrderId.value = null
    appCacheState.latestPaidAt.value = null
  } catch (e) {
    console.error('[Storage] clearAuth error:', e)
  }
}

/**
 * 判断是否已登录
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!getToken()
}

// ==================== 支付上下文 ====================

/**
 * 保存支付上下文（支付前保存，登录后用于绑定邀请关系）
 */
export function savePaymentContext(context) {
  const currentContext = getPaymentContext() || {}
  const nextContext = {
    ...currentContext,
    ...(context || {}),
    updatedAt: new Date().toISOString()
  }
  setItem(AUTH_KEYS.PAYMENT_CONTEXT, nextContext)
  appCacheState.latestPaidOrderId.value = nextContext.orderId || null
}

/**
 * 获取支付上下文
 */
export function getPaymentContext() {
  return getItem(AUTH_KEYS.PAYMENT_CONTEXT, null)
}

/**
 * 清除支付上下文
 */
export function clearPaymentContext() {
  removeItem(AUTH_KEYS.PAYMENT_CONTEXT)
  appCacheState.latestPaidOrderId.value = null
}

/**
 * 保存待绑定的订单ID
 */
export function setPendingOrderId(orderId) {
  try { localStorage.setItem(AUTH_KEYS.PENDING_ORDER_ID, orderId) } catch {}
}

/**
 * 获取待绑定的订单ID
 */
export function getPendingOrderId() {
  try { return localStorage.getItem(AUTH_KEYS.PENDING_ORDER_ID) || null } catch { return null }
}

/**
 * 清除待绑定的订单ID
 */
export function clearPendingOrderId() {
  try { localStorage.removeItem(AUTH_KEYS.PENDING_ORDER_ID) } catch {}
}

/**
 * 标记已支付
 */
export function markAsPaid(payload = {}) {
  const paidAt = payload.paidAt || Date.now()

  try {
    localStorage.setItem(AUTH_KEYS.HAS_PAID, 'true')
    localStorage.setItem(AUTH_KEYS.PAYMENT_TIME, paidAt.toString())
  } catch {}

  appCacheState.hasPaidAccess.value = true
  appCacheState.latestPaidAt.value = paidAt

  const currentContext = getPaymentContext() || {}
  if (payload.orderId || currentContext.orderId) {
    savePaymentContext({
      ...currentContext,
      ...payload,
      status: 'paid',
      paidAt
    })
  }
}

export function clearPaidStatus() {
  try {
    localStorage.removeItem(AUTH_KEYS.HAS_PAID)
    localStorage.removeItem(AUTH_KEYS.PAYMENT_TIME)
    appCacheState.hasPaidAccess.value = false
    appCacheState.latestPaidAt.value = null
  } catch (error) {
    console.error('[Storage] clearPaidStatus error:', error)
  }
}

/**
 * 判断是否已支付
 */
export function hasPaid() {
  return !!appCacheState.hasPaidAccess.value
}

export function hydratePaymentAccessFromServer(access = {}) {
  const hasPaidAccess = !!access.hasPaid
  const currentContext = getPaymentContext() || {}

  if (hasPaidAccess) {
    markAsPaid({
      ...currentContext,
      orderId: access.latestPaidOrderId || access.orderId || currentContext.orderId,
      phone: access.phone || currentContext.phone || getCachedPaymentPhone(),
      paidAt: access.latestPaidAt || access.paidAt || currentContext.paidAt || Date.now(),
      syncedWithServer: true,
      lastCheckedAt: new Date().toISOString()
    })
    return true
  }

  clearPaidStatus()
  savePaymentContext({
    ...currentContext,
    phone: access.phone || currentContext.phone || getCachedPaymentPhone(),
    status: 'unpaid',
    syncedWithServer: true,
    lastCheckedAt: new Date().toISOString()
  })
  return false
}

export function getAppVersion() {
  return getStringItem(APP_CACHE_KEYS.APP_VERSION, '')
}

export function setAppVersion(version) {
  return setStringItem(APP_CACHE_KEYS.APP_VERSION, version)
}

export function getCachedUserGoal() {
  return appCacheState.currentGoal.value || ''
}

export function setCachedUserGoal(goal) {
  try {
    const nextGoal = goal || ''
    if (goal) {
      localStorage.setItem(APP_CACHE_KEYS.USER_GOAL, goal)
    } else {
      localStorage.removeItem(APP_CACHE_KEYS.USER_GOAL)
    }
    appCacheState.currentGoal.value = nextGoal
  } catch (error) {
    console.error('[Storage] setCachedUserGoal error:', error)
  }
}

export function getCachedGoalDays() {
  return normalizeGoalDays(appCacheState.goalDays.value)
}

export function setCachedGoalDays(goalDays) {
  try {
    const value = normalizeGoalDays(goalDays)
    if (Number.isFinite(value) && value > 0) {
      localStorage.setItem(APP_CACHE_KEYS.GOAL_DAYS, value.toString())
    } else {
      localStorage.removeItem(APP_CACHE_KEYS.GOAL_DAYS)
    }
    appCacheState.goalDays.value = value
  } catch (error) {
    console.error('[Storage] setCachedGoalDays error:', error)
  }
}

export function getCachedInviteActivated() {
  return !!appCacheState.inviteActivated.value
}

export function setCachedInviteActivated(value) {
  try {
    localStorage.setItem(APP_CACHE_KEYS.INVITE_ACTIVATED, value ? 'true' : 'false')
    appCacheState.inviteActivated.value = !!value
  } catch (error) {
    console.error('[Storage] setCachedInviteActivated error:', error)
  }
}

export function getJourneyHistoryCache() {
  return getItem(APP_CACHE_KEYS.JOURNEYS, [])
}

export function setJourneyHistoryCache(journeys) {
  return setItem(APP_CACHE_KEYS.JOURNEYS, journeys || [])
}

export function getSurveyResultCache() {
  return appCacheState.surveyResult.value
}

export function setSurveyResultCache(result) {
  if (!result) {
    removeItem(APP_CACHE_KEYS.SURVEY_RESULT)
    removeItem(APP_CACHE_KEYS.SURVEY_COMPLETED)
    appCacheState.surveyResult.value = null
    return true
  }

  const nextResult = normalizeSurveyResult({
    ...result,
    completed: result.completed !== undefined ? !!result.completed : true
  })

  const saved = setItem(APP_CACHE_KEYS.SURVEY_RESULT, nextResult)
  if (saved) {
    try {
      localStorage.setItem(APP_CACHE_KEYS.SURVEY_COMPLETED, nextResult.completed ? 'true' : 'false')
      appCacheState.surveyResult.value = nextResult
    } catch (error) {
      console.error('[Storage] setSurveyResultCache completion flag error:', error)
    }
  }

  return saved
}

export function hasCompletedSurveyCache() {
  if (appCacheState.surveyResult.value) {
    return !!appCacheState.surveyResult.value.completed
  }

  return getStringItem(APP_CACHE_KEYS.SURVEY_COMPLETED, 'false') === 'true'
}

export function markSurveyCompleted() {
  try {
    localStorage.setItem(APP_CACHE_KEYS.SURVEY_COMPLETED, 'true')
    if (appCacheState.surveyResult.value) {
      appCacheState.surveyResult.value = {
        ...appCacheState.surveyResult.value,
        completed: true
      }
    }
  } catch (error) {
    console.error('[Storage] markSurveyCompleted error:', error)
  }
}

export function hydrateSurveyStateFromServer(survey = null) {
  if (!survey) {
    setSurveyResultCache(null)
    return null
  }

  const normalizedSurvey = {
    surveyId: survey.surveyId || null,
    score: Number(survey.score || 0),
    answers: Array.isArray(survey.answers) ? survey.answers : [],
    timestamp: survey.updatedAt || survey.createdAt || Date.now(),
    createdAt: survey.createdAt || null,
    updatedAt: survey.updatedAt || null,
    completed: true
  }

  setSurveyResultCache(normalizedSurvey)
  return normalizedSurvey
}

export function hydrateDailyRecordFromServer(record = null) {
  if (!record?.dateKey) {
    return null
  }

  const dateKey = record.dateKey

  if (record.journalContent || record.journalMood || record.journalTopic) {
    saveJournalByDate(dateKey, {
      content: record.journalContent || '',
      mood: record.journalMood || null,
      topic: record.journalTopic || '',
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt || new Date().toISOString()
    })
  } else {
    deleteJournalByDate(dateKey)
  }

  saveCalendarStatusByDate(dateKey, {
    checked: !!record.checked,
    checkInTime: record.checkInTime ? new Date(record.checkInTime).toISOString() : null
  })

  savePlanProgressByDate(dateKey, {
    dayIndex: record.dayIndex || null,
    tasks: Array.isArray(record.tasks) ? record.tasks : []
  })

  return record
}

export function clearDailyRecordByDate(dateKey) {
  if (!dateKey) {
    return false
  }

  deleteJournalByDate(dateKey)
  deleteCalendarStatusByDate(dateKey)
  deletePlanProgressByDate(dateKey)
  return true
}

export function getCachedPaymentPhone() {
  try {
    return localStorage.getItem(APP_CACHE_KEYS.PAYMENT_PHONE) || ''
  } catch {
    return ''
  }
}

export function setCachedPaymentPhone(phone) {
  try {
    if (phone) {
      localStorage.setItem(APP_CACHE_KEYS.PAYMENT_PHONE, phone)
    } else {
      localStorage.removeItem(APP_CACHE_KEYS.PAYMENT_PHONE)
    }
  } catch (error) {
    console.error('[Storage] setCachedPaymentPhone error:', error)
  }
}

export function getPaymentDraft() {
  const paymentContext = getPaymentContext() || {}
  const discountAmount = Number(paymentContext.discountAmount || 0)
  const finalPayAmount = Number(paymentContext.finalPayAmount || 0)

  return {
    phone: paymentContext.phone || getCachedPaymentPhone() || '',
    inviteCode: paymentContext.inviteCode || '',
    discountAmount: Number.isFinite(discountAmount) && discountAmount > 0 ? discountAmount : 0,
    finalPayAmount: Number.isFinite(finalPayAmount) && finalPayAmount > 0 ? finalPayAmount : 0,
    isInviteUsed: !!paymentContext.isInviteUsed,
    channel: paymentContext.channel || 'alipay',
    status: paymentContext.status || 'draft',
    orderId: paymentContext.orderId || null,
    syncedWithServer: !!paymentContext.syncedWithServer
  }
}

export function savePaymentDraft(payload = {}) {
  const nextDraft = {
    ...(getPaymentContext() || {}),
    ...(payload || {})
  }

  if (payload.phone !== undefined) {
    nextDraft.phone = String(payload.phone || '').trim()
    setCachedPaymentPhone(nextDraft.phone)
  }

  if (payload.discountAmount !== undefined) {
    const discountAmount = Number(payload.discountAmount)
    nextDraft.discountAmount = Number.isFinite(discountAmount) && discountAmount > 0 ? discountAmount : 0
  }

  if (payload.finalPayAmount !== undefined) {
    const finalPayAmount = Number(payload.finalPayAmount)
    nextDraft.finalPayAmount = Number.isFinite(finalPayAmount) && finalPayAmount > 0 ? finalPayAmount : 0
  }

  if (payload.isInviteUsed !== undefined) {
    nextDraft.isInviteUsed = !!payload.isInviteUsed
  }

  if (!nextDraft.channel) {
    nextDraft.channel = 'alipay'
  }

  if (!nextDraft.status) {
    nextDraft.status = 'draft'
  }

  savePaymentContext(nextDraft)
  return nextDraft
}

export function hydrateUserProfileFromServer(profile = {}) {
  const currentUserInfo = getUserInfo() || {}
  const nextUserInfo = {
    ...currentUserInfo,
    ...(profile.userId !== undefined ? { userId: profile.userId } : {}),
    ...(profile.phone !== undefined ? { phone: profile.phone } : {}),
    ...(profile.nickname !== undefined ? { nickname: profile.nickname } : {}),
    ...(profile.inviteCode !== undefined ? { inviteCode: profile.inviteCode } : {}),
    ...(profile.registerTime !== undefined ? { registerTime: profile.registerTime } : {}),
    ...(profile.startDate !== undefined ? { startDate: profile.startDate } : {})
  }

  setUserInfo(nextUserInfo)
  saveUserTimeState({
    currentDateKey: profile.currentDateKey,
    appStartDate: profile.appStartDate,
    lastActiveDateKey: profile.lastActiveDateKey,
    currentDayIndex: profile.currentDayIndex
  })

  if (profile.currentGoal !== undefined) {
    setCachedUserGoal(profile.currentGoal || '')
  }

  if (profile.goalDays !== undefined) {
    setCachedGoalDays(profile.goalDays)
  }

  if (profile.inviteActivated !== undefined) {
    setCachedInviteActivated(profile.inviteActivated)
  }

  if (profile.hasPaid !== undefined) {
    hydratePaymentAccessFromServer({
      hasPaid: profile.hasPaid,
      latestPaidOrderId: profile.latestPaidOrderId,
      latestPaidAt: profile.latestPaidAt,
      phone: profile.phone
    })
  }

  if (profile.latestSurvey !== undefined || profile.hasCompletedSurvey !== undefined) {
    hydrateSurveyStateFromServer(profile.latestSurvey || null)
  }

  return nextUserInfo
}

// ==================== 导出函数 ====================

import { getTodayKey, getDayIndexFromStart, formatDateKey } from './dateUtils'

export { AUTH_KEYS }

export default {
  // 基础操作
  getItem,
  setItem,
  removeItem,

  // 认证
  getToken,
  setToken,
  getUserInfo,
  setUserInfo,
  getPhone,
  clearAuth,
  isLoggedIn,

  // 支付上下文
  savePaymentContext,
  getPaymentContext,
  clearPaymentContext,
  setPendingOrderId,
  getPendingOrderId,
  clearPendingOrderId,
  markAsPaid,
  clearPaidStatus,
  hydratePaymentAccessFromServer,
  hasPaid,
  getAppVersion,
  setAppVersion,
  getCachedUserGoal,
  setCachedUserGoal,
  getCachedGoalDays,
  setCachedGoalDays,
  getCachedInviteActivated,
  setCachedInviteActivated,
  useAppCacheState,
  getJourneyHistoryCache,
  setJourneyHistoryCache,
  getSurveyResultCache,
  setSurveyResultCache,
  hasCompletedSurveyCache,
  markSurveyCompleted,
  hydrateSurveyStateFromServer,
  clearDailyRecordByDate,
  getCachedPaymentPhone,
  setCachedPaymentPhone,
  getPaymentDraft,
  savePaymentDraft,
  hydrateUserProfileFromServer,

  // 用户时间状态
  getUserTimeState,
  saveUserTimeState,
  initUserTimeState,
  updateTimeStateOnSync,

  // 日记
  getAllJournalEntries,
  getJournalByDate,
  saveJournalByDate,
  deleteJournalByDate,
  getJournalDateList,

  // 任务进度
  getAllPlanProgress,
  getPlanProgressByDate,
  savePlanProgressByDate,
  deletePlanProgressByDate,
  updateTaskCompletion,
  getPlanProgressDateList,

  // 日历打卡
  getAllCalendarStatus,
  getCalendarStatusByDate,
  saveCalendarStatusByDate,
  deleteCalendarStatusByDate,
  checkInDate,
  uncheckDate,
  getCheckedDateList,
  getMonthCheckStats,

  // 计划配置
  getPlanConfig,
  savePlanConfig,
  hydrateCloudAppData,
  hydrateAppStateFromServer,
  hydrateDailyRecordFromServer,

  // 数据迁移
  migrateLegacyData,
  cleanupOldData
}
