/**
 * 统一日期工具函数
 * 所有日期操作必须使用此工具，禁止在各页面单独计算
 */

// ==================== 常量定义 ====================

// 日期格式模板
export const DATE_FORMAT = 'YYYY-MM-DD'

// 本地存储键名
export const STORAGE_KEYS = {
  // 用户时间状态
  CURRENT_DATE_KEY: 'currentDateKey',           // 当前日期键 "2026-03-12"
  APP_START_DATE: 'appStartDate',              // 用户开始90天计划的日期
  LAST_ACTIVE_DATE_KEY: 'lastActiveDateKey',  // 上次活跃日期
  CURRENT_DAY_INDEX: 'currentDayIndex',         // 当前处于第几天

  // 日记数据
  JOURNAL_ENTRIES: 'journalEntries',           // 日记数据对象

  // 每日任务数据
  PLAN_PROGRESS: 'planProgress',               // 每日任务进度

  // 日历状态
  CALENDAR_STATUS: 'calendarStatus',           // 日历打卡状态

  // 全局配置
  PLAN_CONFIG: 'planConfig'                   // 计划配置
}

// ==================== 核心日期函数 ====================

/**
 * 获取今天的日期键 YYYY-MM-DD
 * 使用本地时区，每天0点切换
 * @returns {string} 例如 "2026-03-12"
 */
export function getTodayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @returns {string} 例如 "2026-03-12"
 */
export function formatDateKey(date) {
  if (!date) return getTodayKey()

  let d
  if (date instanceof Date) {
    d = date
  } else if (typeof date === 'number') {
    d = new Date(date)
  } else {
    d = new Date(date)
  }

  // 检查是否有效
  if (isNaN(d.getTime())) {
    return getTodayKey()
  }

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 解析日期键为Date对象
 * @param {string} dateKey - YYYY-MM-DD 格式日期键
 * @returns {Date}
 */
export function parseDateKey(dateKey) {
  if (!dateKey) return new Date()
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * 计算两个日期之间的天数差
 * @param {string} startKey - 开始日期 YYYY-MM-DD
 * @param {string} endKey - 结束日期 YYYY-MM-DD
 * @returns {number} 天数差
 */
export function getDaysBetween(startKey, endKey) {
  const start = parseDateKey(startKey)
  const end = parseDateKey(endKey)

  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()

  return Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24))
}

/**
 * 根据计划开始日期计算今天是第几天
 * @param {string} startDateKey - 计划开始日期 YYYY-MM-DD
 * @param {string} todayKey - 今天的日期键（可选，默认当前时间）
 * @returns {number} 第几天（从1开始）
 */
export function getDayIndexFromStart(startDateKey, todayKey = null) {
  if (!startDateKey) return 1

  const today = todayKey || getTodayKey()

  // 如果今天在开始日期之前，返回1
  if (today < startDateKey) return 1

  const days = getDaysBetween(startDateKey, today)
  return days + 1 // 第1天算1，不是0
}

/**
 * 判断是否跨天
 * @param {string} lastActiveDateKey - 上次活跃日期
 * @param {string} todayKey - 今天的日期键
 * @returns {boolean}
 */
export function isNewDay(lastActiveDateKey, todayKey) {
  if (!lastActiveDateKey) return true
  return lastActiveDateKey !== todayKey
}

/**
 * 判断是否为今天
 * @param {string} dateKey - 要检查的日期键
 * @returns {boolean}
 */
export function isToday(dateKey) {
  return dateKey === getTodayKey()
}

/**
 * 判断是否为过去的日期
 * @param {string} dateKey - 要检查的日期键
 * @returns {boolean}
 */
export function isPastDate(dateKey) {
  return dateKey < getTodayKey()
}

/**
 * 判断是否为未来的日期
 * @param {string} dateKey - 要检查的日期键
 * @returns {boolean}
 */
export function isFutureDate(dateKey) {
  return dateKey > getTodayKey()
}

/**
 * 获取已解锁的天数（根据开始日期和今天）
 * @param {string} startDateKey - 计划开始日期
 * @returns {number} 已解锁的天数
 */
export function getUnlockedPlanDays(startDateKey) {
  if (!startDateKey) return 1
  return getDayIndexFromStart(startDateKey)
}

/**
 * 获取今天的0点时间戳
 * @returns {number}
 */
export function getTodayStartTimestamp() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

/**
 * 格式化显示日期（用于UI显示）
 * @param {string} dateKey - YYYY-MM-DD 格式
 * @returns {string} 例如 "3月12日"
 */
export function formatDisplayDate(dateKey) {
  if (!dateKey) return ''

  const date = parseDateKey(dateKey)
  const month = date.getMonth() + 1
  const day = date.getDate()

  // 特殊处理今天和昨天
  const today = getTodayKey()
  if (dateKey === today) return '今天'

  const yesterday = getYesterdayKey()
  if (dateKey === yesterday) return '昨天'

  return `${month}月${day}日`
}

/**
 * 获取昨天的日期键
 * @returns {string}
 */
export function getYesterdayKey() {
  const now = new Date()
  now.setDate(now.getDate() - 1)
  return formatDateKey(now)
}

/**
 * 获取明天的日期键
 * @returns {string}
 */
export function getTomorrowKey() {
  const now = new Date()
  now.setDate(now.getDate() + 1)
  return formatDateKey(now)
}

/**
 * 检查日期键是否有效
 * @param {string} dateKey
 * @returns {boolean}
 */
export function isValidDateKey(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') return false
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateKey)) return false

  const date = parseDateKey(dateKey)
  return !isNaN(date.getTime())
}

/**
 * 获取指定天数范围内的所有日期键
 * @param {string} startKey - 开始日期
 * @param {number} days - 天数
 * @returns {string[]} 日期键数组
 */
export function getDateKeysInRange(startKey, days) {
  const keys = []
  const start = parseDateKey(startKey)

  for (let i = 0; i < days; i++) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    keys.push(formatDateKey(date))
  }

  return keys
}

export default {
  DATE_FORMAT,
  STORAGE_KEYS,
  getTodayKey,
  formatDateKey,
  parseDateKey,
  getDaysBetween,
  getDayIndexFromStart,
  isNewDay,
  isToday,
  isPastDate,
  isFutureDate,
  getUnlockedPlanDays,
  getTodayStartTimestamp,
  formatDisplayDate,
  getYesterdayKey,
  getTomorrowKey,
  isValidDateKey,
  getDateKeysInRange
}
