/**
 * 每日同步组合式函数
 * 处理：应用启动/恢复时检查日期变化、解锁新一天、数据验证
 *
 * 使用方式：
 * const {
 *   isReady,
 *   todayKey,
 *   currentDayIndex,
 *   isNewDayTriggered,
 *   handleAppResume
 * } = useDailySync()
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  getTodayKey,
  getDayIndexFromStart,
  isNewDay as checkIsNewDay,
  STORAGE_KEYS
} from '../utils/dateUtils'
import {
  getUserTimeState,
  updateTimeStateOnSync,
  initUserTimeState,
  migrateLegacyData,
  isLoggedIn
} from '../utils/storage'
import { updateAppState } from '../services/api'

// 全局状态（单例模式，确保整个应用共享同一份状态）
const globalState = {
  isReady: ref(false),
  todayKey: ref(''),
  currentDayIndex: ref(1),
  isNewDayTriggered: ref(false),
  lastActiveDateKey: ref(''),
  appStartDate: ref(''),
  hasSynced: ref(false),
  visibilityHandler: null,
  focusHandler: null
}

export function refreshDailySyncState() {
  const userState = getUserTimeState()
  const todayKey = getTodayKey()

  globalState.todayKey.value = todayKey
  globalState.appStartDate.value = userState.appStartDate || ''
  globalState.lastActiveDateKey.value = userState.lastActiveDateKey || userState.appStartDate || ''
  globalState.currentDayIndex.value = userState.currentDayIndex || 1

  return {
    todayKey: globalState.todayKey.value,
    appStartDate: globalState.appStartDate.value,
    lastActiveDateKey: globalState.lastActiveDateKey.value,
    currentDayIndex: globalState.currentDayIndex.value
  }
}

export function resetDailySyncState() {
  globalState.isReady.value = false
  globalState.todayKey.value = ''
  globalState.currentDayIndex.value = 1
  globalState.isNewDayTriggered.value = false
  globalState.lastActiveDateKey.value = ''
  globalState.appStartDate.value = ''
  globalState.hasSynced.value = false
}

/**
 * 初始化每日同步系统
 * @param {Object} options - 配置选项
 * @param {Function} options.onNewDay - 新一天开始的回调 (dateKey, dayIndex) => void
 * @param {Function} options.onDayUnlock - 解锁新内容的回调 (dayIndex) => void
 * @param {boolean} options.autoStart - 是否自动开始监听，默认true
 * @returns {Object} 同步状态和方法
 */
export function useDailySync(options = {}) {
  const { onNewDay, onDayUnlock, autoStart = true } = options

  // 计算属性
  const isFirstDay = computed(() => globalState.currentDayIndex.value === 1)
  const isDayUnlocked = computed(() => (day) => day <= globalState.currentDayIndex.value)
  const daysSinceStart = computed(() => {
    if (!globalState.appStartDate.value) {
      return 0
    }

    return Math.max(globalState.currentDayIndex.value - 1, 0)
  })

  const persistTimeState = async (payload) => {
    if (isLoggedIn()) {
      try {
        const result = await updateAppState(payload)
        if (result.success) {
          refreshDailySyncState()
          return true
        }
      } catch (error) {
        console.error('[DailySync] 同步时间状态失败，回退本地状态:', error)
      }
    }

    updateTimeStateOnSync(payload.currentDateKey, payload.currentDayIndex)
    refreshDailySyncState()
    return false
  }

  /**
   * 执行每日同步
   * 检查日期变化，处理新的一天
   * @returns {Promise<{isNewDay: boolean, newDayIndex: number, dateKey: string}>}
   */
  async function performDailySync() {
    const todayKey = getTodayKey()
    const previousDateKey = globalState.lastActiveDateKey.value
    const startDate = globalState.appStartDate.value

    // 更新今日日期键
    globalState.todayKey.value = todayKey

    // 检查是否跨天
    const isNewDay = checkIsNewDay(previousDateKey, todayKey)

    if (isNewDay) {
      console.log('[DailySync] New day detected:', {
        previous: previousDateKey,
        current: todayKey
      })

      // 计算新的天数索引
      const newDayIndex = getDayIndexFromStart(startDate, todayKey)
      const previousDayIndex = globalState.currentDayIndex.value || 1
      const nextState = {
        currentDateKey: todayKey,
        lastActiveDateKey: todayKey,
        currentDayIndex: newDayIndex
      }

      // 登录态优先以服务端回填为准，失败时退回本地更新
      await persistTimeState(nextState)
      globalState.isNewDayTriggered.value = true

      // 触发回调
      if (onNewDay) {
        await onNewDay(todayKey, newDayIndex)
      }

      // 如果解锁了新的一天
      if (newDayIndex > previousDayIndex) {
        if (onDayUnlock) {
          await onDayUnlock(newDayIndex)
        }
      }

      return {
        isNewDay: true,
        newDayIndex,
        dateKey: todayKey
      }
    }

    // 如果没有跨天但索引发生变化（比如修改了系统时间）
    const expectedDayIndex = getDayIndexFromStart(startDate, todayKey)
    if (expectedDayIndex !== globalState.currentDayIndex.value) {
      console.log('[DailySync] Day index changed:', {
        previous: globalState.currentDayIndex.value,
        current: expectedDayIndex
      })

      await persistTimeState({
        currentDateKey: todayKey,
        lastActiveDateKey: todayKey,
        currentDayIndex: expectedDayIndex
      })

      if (onDayUnlock) {
        await onDayUnlock(expectedDayIndex)
      }
    }

    globalState.hasSynced.value = true

    return {
      isNewDay: false,
      newDayIndex: globalState.currentDayIndex.value,
      dateKey: todayKey
    }
  }

  /**
   * 处理应用恢复（从后台返回前台）
   */
  async function handleAppResume() {
    console.log('[DailySync] App resumed')
    await performDailySync()
  }

  /**
   * 处理页面可见性变化
   */
  async function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      await performDailySync()
    }
  }

  /**
   * 处理窗口焦点变化
   */
  async function handleFocusChange() {
    await performDailySync()
  }

  /**
   * 开始监听应用生命周期
   */
  function startListening() {
    // 监听可见性变化
    if (!globalState.visibilityHandler) {
      globalState.visibilityHandler = handleVisibilityChange
      document.addEventListener('visibilitychange', globalState.visibilityHandler)
    }

    // 监听窗口焦点变化（处理最小化后恢复）
    if (!globalState.focusHandler) {
      globalState.focusHandler = handleFocusChange
      window.addEventListener('focus', globalState.focusHandler)
    }
  }

  /**
   * 停止监听
   */
  function stopListening() {
    if (globalState.visibilityHandler) {
      document.removeEventListener('visibilitychange', globalState.visibilityHandler)
      globalState.visibilityHandler = null
    }

    if (globalState.focusHandler) {
      window.removeEventListener('focus', globalState.focusHandler)
      globalState.focusHandler = null
    }
  }

  /**
   * 重置新一天触发标志
   */
  function resetNewDayTrigger() {
    globalState.isNewDayTriggered.value = false
  }

  // 初始化
  onMounted(async () => {
    // 数据迁移（如果需要）
    migrateLegacyData()

    // 获取用户时间状态
    const userState = getUserTimeState()

    // 检查是否首次启动
    if (!userState.appStartDate) {
      console.log('[DailySync] First launch, waiting for initialization')
      globalState.isReady.value = true
      return
    }

    // 设置状态
    refreshDailySyncState()

    // 执行首次同步
    await performDailySync()

    // 标记就绪
    globalState.isReady.value = true

    // 开始监听
    if (autoStart) {
      startListening()
    }
  })

  onUnmounted(() => {
    // 组件卸载时可以选择是否停止监听
    // 通常全局监听应该保持，所以这里不停止
  })

  return {
    // 状态
    isReady: globalState.isReady,
    todayKey: globalState.todayKey,
    currentDayIndex: globalState.currentDayIndex,
    isNewDayTriggered: globalState.isNewDayTriggered,
    lastActiveDateKey: globalState.lastActiveDateKey,
    appStartDate: globalState.appStartDate,
    hasSynced: globalState.hasSynced,

    // 计算属性
    isFirstDay,
    isDayUnlocked,
    daysSinceStart,

    // 方法
    performDailySync,
    handleAppResume,
    resetNewDayTrigger,
    startListening,
    stopListening
  }
}

/**
 * 初始化应用首次启动
 * @param {string} startDateKey - 计划开始日期
 * @returns {Promise<Object>} 初始状态
 */
export async function initializeApp(startDateKey) {
  const todayKey = getTodayKey()
  const dayIndex = getDayIndexFromStart(startDateKey, todayKey)
  const syncPayload = {
    appStartDate: startDateKey,
    currentDateKey: todayKey,
    lastActiveDateKey: todayKey,
    currentDayIndex: dayIndex
  }

  if (isLoggedIn()) {
    try {
      const result = await updateAppState(syncPayload)
      if (result.success) {
        refreshDailySyncState()
        globalState.isReady.value = true
        globalState.hasSynced.value = true

        console.log('[DailySync] App initialized from server:', {
          startDate: startDateKey,
          today: todayKey,
          dayIndex
        })

        return getUserTimeState()
      }
    } catch (error) {
      console.error('[DailySync] 初始化云端状态失败，回退到本地初始化:', error)
    }
  }

  // 本地兜底初始化
  const state = initUserTimeState(startDateKey)

  // 更新全局状态
  refreshDailySyncState()
  globalState.isReady.value = true
  globalState.hasSynced.value = true

  console.log('[DailySync] App initialized locally:', {
    startDate: startDateKey,
    today: todayKey,
    dayIndex
  })

  return state
}

/**
 * 获取当前同步状态（不创建新的响应式依赖）
 * 用于非组件场景
 */
export function getSyncState() {
  return {
    isReady: globalState.isReady.value,
    hasSynced: globalState.hasSynced.value,
    todayKey: globalState.todayKey.value,
    currentDayIndex: globalState.currentDayIndex.value,
    appStartDate: globalState.appStartDate.value,
    lastActiveDateKey: globalState.lastActiveDateKey.value
  }
}

export function useDailySyncState() {
  return {
    isReady: globalState.isReady,
    hasSynced: globalState.hasSynced,
    todayKey: globalState.todayKey,
    currentDayIndex: globalState.currentDayIndex,
    appStartDate: globalState.appStartDate,
    lastActiveDateKey: globalState.lastActiveDateKey
  }
}

export default useDailySync
