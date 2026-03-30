<template>
  <div class="home-page">
    <!-- 背景装饰 -->
    <div class="liquid-bg"></div>
    <div class="liquid-orb liquid-orb-1"></div>
    <div class="liquid-orb liquid-orb-2"></div>
    <div class="liquid-orb liquid-orb-3"></div>

    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="user-info">
        <span class="user-name">你好，战士</span>
        <span class="user-motto">{{ getMotto() }}</span>
      </div>
      <div class="settings-icon" @click="showSettings = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </div>
    </div>

    <!-- 英雄区域：坚持天数 + 正气值环 -->
    <HomeHero
      :streak-days="streakData.days"
      :streak-hours="streakData.hours"
      :streak-minutes="streakData.minutes"
      :energy-percent="energyPercent"
    />

    <!-- 统计概览卡片 -->
    <HomeStats
      :streak-days="streakData.days"
      :panic-count="panicCount"
      :today-checked="todayChecked"
    />

    <!-- 打卡日历 -->
    <HomeCalendar
      :calendar-days="monthCalendarDays"
      :current-month-name="currentMonthName"
      @select-day="selectCalendarDay"
    />

    <!-- 快速操作入口 -->
    <HomeQuickActions
      :router="router"
      @show-journal="showJournal = true"
      @show-stats="showStats = true"
    />

    <!-- 邀请返现卡片 -->
    <HomeInviteCard
      :invite-code="homeInviteCode"
      :total-invited="homeInviteSummary.totalInvited"
      :withdrawable-amount="homeInviteSummary.withdrawableAmount"
      @go-to-profile="goToProfile"
      @go-to-withdraw="goToWithdraw"
      @copy-code="copyHomeInviteCode"
    />

    <!-- Panic 紧急刹车按钮 -->
    <HomePanicCard :router="router" />

    <!-- 里程碑快捷入口 -->
    <div class="milestone-shortcut" @click="showMilestones = true">
      <span class="shortcut-text">查看里程碑进度</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>

    <!-- 底部安全区 -->
    <div class="safe-area-bottom"></div>

    <!-- 合并所有弹层 -->
    <HomeModals
      :show-calendar-day="showCalendarDay"
      :show-milestones="showMilestones"
      :show-journal="showJournal"
      :show-stats="showStats"
      :show-settings="showSettings"
      :show-goals="showGoals"
      :selected-day-title="selectedDayTitle"
      :selected-day-entries="selectedDayEntries"
      :current-streak-days="streakData.days"
      :all-milestones="allMilestones"
      :selected-mood="selectedMood"
      :selected-topic="selectedTopic"
      :journal-text="journalText"
      :editing-entry-id="editingEntryId"
      :grouped-journal-entries="groupedJournalEntries"
      :start-date="startDate"
      :total-time="totalTime"
      :completed-tasks="completedTasks"
      :user-goal="userGoal"
      :current-prompt="currentPrompt"
      :moods="moods"
      :motivations="motivations"
      @close-calendar-day="showCalendarDay = false"
      @close-milestones="showMilestones = false"
      @close-journal="handleCloseJournal"
      @close-stats="showStats = false"
      @close-settings="showSettings = false"
      @close-goals="showGoals = false"
      @select-mood="selectedMood = $event"
      @shuffle-prompt="shufflePrompt"
      @confirm-topic="confirmTopic"
      @clear-topic="clearTopic"
      @update-journal-text="journalText = $event"
      @save-journal="saveJournal"
      @cancel-edit="cancelEdit"
      @edit-entry="editEntry"
      @delete-entry="deleteEntry"
      @reset-streak="resetStreak"
      @start-new-journey="startNewJourney"
      @open-goals="showGoals = true"
      @logout="logout"
      @update-user-goal="userGoal = $event"
      @select-motivation="selectMotivation"
      @save-goals="saveGoals"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getSyncState, refreshDailySyncState, resetDailySyncState, useDailySyncState } from '../composables/useDailySync'

// 导入子组件
import HomeHero from '../components/home/HomeHero.vue'
import HomeStats from '../components/home/HomeStats.vue'
import HomeCalendar from '../components/home/HomeCalendar.vue'
import HomeQuickActions from '../components/home/HomeQuickActions.vue'
import HomeInviteCard from '../components/home/HomeInviteCard.vue'
import HomePanicCard from '../components/home/HomePanicCard.vue'
import HomeModals from '../components/home/HomeModals.vue'

// 导入日期工具
import {
  getTodayKey,
  formatDateKey,
  parseDateKey,
  formatDisplayDate
} from '../utils/dateUtils'

// 导入存储工具
import {
  getAllJournalEntries,
  getJournalByDate,
  saveJournalByDate,
  deleteJournalByDate,
  getAllCalendarStatus,
  getCalendarStatusByDate,
  clearAuth,
  getUserInfo,
  isLoggedIn,
  useAppCacheState,
  setCachedUserGoal,
  getJourneyHistoryCache,
  setJourneyHistoryCache
} from '../utils/storage'

// 导入 API 服务
import {
  getInviteSummary,
  syncAuthenticatedSession,
  restartJourney,
  updateAppState,
  ensureDailyRecordLoaded,
  saveDailyRecord,
  deleteDailyJournal
} from '../services/api'

const router = useRouter()

// ============ 弹层状态 ============
const showSettings = ref(false)
const showMilestones = ref(false)
const showJournal = ref(false)
const showStats = ref(false)
const showGoals = ref(false)

// ============ 日历弹层状态 ============
const showCalendarDay = ref(false)
const selectedDayTitle = ref('')
const selectedDayEntries = ref([])

// ============ 日记弹层状态 ============
const journalText = ref('')
const selectedMood = ref(3)
const editingEntryId = ref(null)
const currentPromptIndex = ref(0)
const selectedTopic = ref('')
const journalEntries = ref([])

// ============ 目标设置状态 ============
const userGoal = ref('')

// ============ 邀请返现状态 ============
const homeInviteCode = ref(getUserInfo()?.inviteCode || '')
const homeInviteSummary = ref({
  totalInvited: 0,
  withdrawableAmount: 0
})

// ============ 同步状态 ============
const { appStartDate } = useDailySyncState()
const startDateKey = computed(() => appStartDate.value || '')

// ============ 正气值计算 ============
const energyPercent = computed(() => {
  // 基于打卡天数计算正气值（简化版，实际可接入更复杂逻辑）
  const days = streakData.value.days
  return Math.min(100, Math.min(100, days * 2))
})

// ============ 今日打卡状态 ============
const todayChecked = computed(() => {
  const todayKey = getTodayKey()
  const status = getCalendarStatusByDate(todayKey)
  return !!status?.checked
})

// ============ Panic 次数（简化计算）============
const panicCount = computed(() => {
  // 这里可以接入主工程的 panic 统计数据
  // 暂时返回 0，后续可从 storage 或 API 获取
  return 0
})

// ============ 引导文案 ============
const getMotto = () => {
  const mottos = [
    '今天继续加油',
    '每一步都重要',
    '坚持就是胜利',
    '相信自己',
    '你很棒',
    '比昨天更好'
  ]
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % mottos.length
  return mottos[dayIndex]
}

// ============ 坚持天数计算 ============
const streakData = computed(() => {
  const activeStartDate = startDateKey.value
  if (!activeStartDate) {
    return { days: 0, hours: 0, minutes: 0 }
  }
  const now = Date.now()
  const startTimestamp = new Date(`${activeStartDate}T00:00:00`).getTime()
  const diff = now - startTimestamp
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return { days, hours, minutes }
})

// ============ 总时长 ============
const totalTime = computed(() => {
  const { days, hours } = streakData.value
  return `${days}d ${hours}h`
})

// ============ 开始日期 ============
const startDate = computed(() => {
  return startDateKey.value ? new Date(`${startDateKey.value}T00:00:00`).getTime() : Date.now()
})

// ============ 完成任务数 ============
const completedTasks = computed(() => {
  if (!startDateKey.value) return 0
  const todayKey = getTodayKey()
  const allStatus = getAllCalendarStatus()
  let count = 0
  const startDateVal = parseDateKey(startDateKey.value)
  const today = parseDateKey(todayKey)
  for (let d = new Date(startDateVal); d <= today; d.setDate(d.getDate() + 1)) {
    const dateKey = formatDateKey(d)
    if (allStatus[dateKey]?.checked) {
      count++
    }
  }
  return count
})

// ============ 日历数据 ============
const journalMoodMap = computed(() => {
  const allEntries = getAllJournalEntries()
  const map = {}
  Object.entries(allEntries).forEach(([dateKey, entry]) => {
    if (!map[dateKey] && entry.mood) {
      map[dateKey] = entry.mood
    }
  })
  return map
})

const currentMonthName = computed(() => {
  const today = new Date()
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  return `${today.getFullYear()}年 ${monthNames[today.getMonth()]}`
})

const monthCalendarDays = computed(() => {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDateVal = startDateKey.value ? new Date(`${startDateKey.value}T00:00:00`).getTime() : Date.now()
  const allStatus = getAllCalendarStatus()
  const days = []

  // 添加上月末尾的空白日期
  const firstDayWeekday = firstDay.getDay()
  if (firstDayWeekday > 0) {
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      days.push({
        dayNum: prevMonthLastDay - i,
        isOtherMonth: true,
        date: '',
        isToday: false,
        isFuture: false,
        mood: null,
        completed: false
      })
    }
  }

  // 添加当月日期
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i)
    const dateKey = formatDateKey(date)
    const isToday = date.toDateString() === today.toDateString()
    const isFuture = date > today
    const daySinceStart = Math.floor((today.getTime() - startDateVal) / (1000 * 60 * 60 * 24))
    const dayNumber = daySinceStart - (today.getDate() - i) + 1
    const completed = allStatus[dateKey]?.checked && dayNumber > 0 && !isFuture
    const mood = journalMoodMap.value[dateKey]
    days.push({
      dayNum: i,
      date: dateKey,
      isOtherMonth: false,
      isToday,
      isFuture,
      mood: mood ? getMoodEmoji(mood) : null,
      completed
    })
  }

  // 添加下月开头的空白日期
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      dayNum: i,
      isOtherMonth: true,
      date: '',
      isToday: false,
      isFuture: false,
      mood: null,
      completed: false
    })
  }

  return days
})

// ============ 里程碑数据 ============
const allMilestones = ref([
  { days: 1, icon: '1', name: '第1天', desc: '开启新旅程' },
  { days: 3, icon: '3', name: '第3天', desc: '初步习惯' },
  { days: 7, icon: '7', name: '第7天', desc: '习惯形成中' },
  { days: 14, icon: '14', name: '第14天', desc: '神经变化' },
  { days: 21, icon: '21', name: '第21天', desc: '21天习惯' },
  { days: 30, icon: '30', name: '第30天', desc: '里程碑' },
  { days: 45, icon: '45', name: '第45天', desc: '持续进步' },
  { days: 60, icon: '60', name: '第60天', desc: '重大突破' },
  { days: 75, icon: '75', name: '第75天', desc: '即将成功' },
  { days: 90, icon: '90', name: '第90天', desc: '完成目标' }
])

// ============ 心情选项 ============
const moods = [
  { value: 1, emoji: '😢', label: '很差' },
  { value: 2, emoji: '😔', label: '不好' },
  { value: 3, emoji: '😐', label: '一般' },
  { value: 4, emoji: '😊', label: '不错' },
  { value: 5, emoji: '😄', label: '很好' }
]

const getMoodEmoji = (mood) => {
  const found = moods.find(m => m.value === mood)
  return found ? found.emoji : '😐'
}

// ============ 写作提示 ============
const writingPrompts = [
  '今天是什么触发了你的冲动？',
  '列出三件你感激的事情',
  '今天你的能量水平与昨天相比如何？',
  '你明天的主要目标是什么？',
  '今天你克服了什么困难？',
  '有什么事情让你感到自豪？',
  '描述一下今天让你微笑的事情',
  '今天你学到了什么？',
  '有什么事情你想要改变吗？',
  '你对明天有什么期望？',
  '今天你最感激身边的谁？',
  '描述一下你现在的感受',
  '今天遇到的最大挑战是什么？',
  '你觉得自己今天表现如何？',
  '有什么事情让你感到平静？'
]

const currentPrompt = computed(() => writingPrompts[currentPromptIndex.value])

const shufflePrompt = () => {
  currentPromptIndex.value = (currentPromptIndex.value + 1) % writingPrompts.length
}

// ============ 动机选项 ============
const motivations = [
  '为了自信',
  '为了更好的生活',
  '为了家人',
  '为了自我提升',
  '为了梦想',
  '为了健康'
]

// ============ 日记分组 ============
const groupedJournalEntries = computed(() => {
  const entries = journalEntries.value
  const groups = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const todayEntries = []
  const yesterdayEntries = []
  const olderEntries = []

  entries.forEach(entry => {
    const entryDate = new Date(entry.createdAt)
    entryDate.setHours(0, 0, 0, 0)
    if (entryDate.getTime() === today.getTime()) {
      todayEntries.push(entry)
    } else if (entryDate.getTime() === yesterday.getTime()) {
      yesterdayEntries.push(entry)
    } else {
      olderEntries.push(entry)
    }
  })

  if (todayEntries.length > 0) groups.push({ label: '今天', entries: todayEntries })
  if (yesterdayEntries.length > 0) groups.push({ label: '昨天', entries: yesterdayEntries })
  if (olderEntries.length > 0) groups.push({ label: '更早', entries: olderEntries })
  return groups
})

// ============ 加载日记数据 ============
const loadJournalEntries = () => {
  const allEntries = getAllJournalEntries()
  const entriesArray = Object.values(allEntries).sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  )
  journalEntries.value = entriesArray
}

// ============ 日历日期选择 ============
const selectCalendarDay = async (day) => {
  if (!day.date || day.isFuture || day.isOtherMonth) return
  if (isLoggedIn()) {
    try {
      await ensureDailyRecordLoaded(day.date)
    } catch (error) {
      console.warn('[Home] 获取单日云端记录失败，继续使用本地缓存:', error)
    }
  }
  const dayEntry = getJournalByDate(day.date)
  selectedDayEntries.value = dayEntry ? [dayEntry] : []
  selectedDayTitle.value = formatDisplayDate(day.date)
  showCalendarDay.value = true
}

// ============ 日记操作 ============
const confirmTopic = () => {
  selectedTopic.value = currentPrompt.value
}

const clearTopic = () => {
  selectedTopic.value = ''
}

const editEntry = (entry) => {
  editingEntryId.value = entry.dateKey
  journalText.value = entry.content
  selectedMood.value = entry.mood || 3
  selectedTopic.value = entry.topic || ''
}

const cancelEdit = () => {
  editingEntryId.value = null
  journalText.value = ''
  selectedMood.value = 3
  selectedTopic.value = ''
}

const handleCloseJournal = () => {
  showJournal.value = false
  journalText.value = ''
  selectedMood.value = 3
  editingEntryId.value = null
  currentPromptIndex.value = 0
  selectedTopic.value = ''
}

const showActionError = (message) => {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message)
  }
}

const deleteEntry = async (id) => {
  if (confirm('确定要删除这条日记吗？')) {
    if (id) {
      if (isLoggedIn()) {
        try {
          const result = await deleteDailyJournal(id)
          if (!result.success) {
            throw new Error(result.error?.message || '删除失败')
          }
        } catch (error) {
          console.error('[Home] 删除云端日记失败:', error)
          showActionError('删除失败，请稍后重试')
          return
        }
      } else {
        deleteJournalByDate(id)
      }
    }
    loadJournalEntries()
  }
}

const saveJournal = async () => {
  if (!journalText.value.trim()) return
  const todayKey = getTodayKey()
  const draftPayload = editingEntryId.value
    ? {
        ...getJournalByDate(todayKey),
        content: journalText.value.trim(),
        mood: selectedMood.value,
        topic: selectedTopic.value || getJournalByDate(todayKey)?.topic,
        editedAt: Date.now()
      }
    : {
        content: journalText.value.trim(),
        mood: selectedMood.value,
        topic: selectedTopic.value,
        createdAt: new Date().toISOString()
      }

  if (isLoggedIn()) {
    try {
      const result = await saveDailyRecord(todayKey, {
        journalContent: draftPayload.content,
        journalMood: draftPayload.mood,
        journalTopic: draftPayload.topic
      })
      if (!result.success) {
        throw new Error(result.error?.message || '保存失败')
      }
    } catch (error) {
      console.error('[Home] 保存云端日记失败:', error)
      showActionError('日记保存失败，请稍后重试')
      return
    }
  } else {
    saveJournalByDate(todayKey, draftPayload)
  }

  editingEntryId.value = null
  loadJournalEntries()
  journalText.value = ''
  selectedMood.value = 3
  selectedTopic.value = ''
}

// ============ 目标设置 ============
const selectMotivation = (motivation) => {
  userGoal.value = motivation
}

const saveGoals = async () => {
  if (userGoal.value.trim()) {
    if (isLoggedIn()) {
      try {
        const result = await updateAppState({
          currentGoal: userGoal.value.trim()
        })
        if (!result.success) {
          throw new Error(result.error?.message || '保存失败')
        }
      } catch (error) {
        console.error('[Home] 保存目标失败:', error)
        showActionError('目标保存失败，请稍后重试')
        return
      }
    } else {
      setCachedUserGoal(userGoal.value.trim())
    }
  }
  showGoals.value = false
}

// ============ 重置与新旅程 ============
const resetStreak = async () => {
  if (confirm('Reset streak?')) {
    const todayKey = getTodayKey()
    if (isLoggedIn()) {
      try {
        const result = await restartJourney({
          startDateKey: todayKey,
          archiveCurrentJourney: false
        })
        if (!result.success) {
          throw new Error(result.error?.message || '重置失败')
        }
      } catch (error) {
        console.error('[Home] 重置旅程状态失败:', error)
        showActionError('重置失败，请稍后重试')
        return
      }
    } else {
      // 未登录的重置逻辑
      const { initUserTimeState } = await import('../utils/storage')
      initUserTimeState(todayKey)
    }
    refreshDailySyncState()
    showSettings.value = false
  }
}

const startNewJourney = async () => {
  if (confirm('Start new journey?')) {
    const currentJourney = {
      startDateKey: startDateKey.value,
      endDateKey: getTodayKey(),
      streakDays: streakData.value.days,
      endedReason: 'restart',
      createdAt: Date.now()
    }
    const todayKey = getTodayKey()
    if (isLoggedIn()) {
      try {
        const result = await restartJourney({
          startDateKey: todayKey,
          archiveCurrentJourney: !!currentJourney.startDateKey,
          currentJourney: currentJourney.startDateKey ? currentJourney : null
        })
        if (!result.success) {
          throw new Error(result.error?.message || '保存失败')
        }
      } catch (error) {
        console.error('[Home] 保存旅程历史失败:', error)
        showActionError('开启新旅程失败，请稍后重试')
        return
      }
    }
    if (!isLoggedIn()) {
      const nextJourneys = [currentJourney, ...getJourneyHistoryCache()]
      setJourneyHistoryCache(nextJourneys)
      const { initUserTimeState } = await import('../utils/storage')
      initUserTimeState(todayKey)
    }
    refreshDailySyncState()
    showSettings.value = false
  }
}

// ============ 退出登录 ============
const logout = () => {
  if (confirm('Logout?')) {
    clearAuth()
    resetDailySyncState()
    router.replace('/login')
  }
}

// ============ 邀请返现 ============
const refreshInviteCenterData = async () => {
  const cachedUserInfo = getUserInfo() || {}
  if (cachedUserInfo.inviteCode) {
    homeInviteCode.value = cachedUserInfo.inviteCode
  }
  if (!isLoggedIn()) return
  try {
    const result = await getInviteSummary()
    if (result.success && result.data) {
      homeInviteSummary.value = {
        totalInvited: result.data.totalInvited || 0,
        withdrawableAmount: result.data.withdrawableAmount || 0
      }
      if (result.data.myInviteCode) {
        homeInviteCode.value = result.data.myInviteCode
      }
    }
  } catch (error) {
    console.error('[Home] 加载邀请返现信息失败:', error)
  }
}

const goToProfile = () => {
  router.push('/profile')
}

const goToWithdraw = () => {
  router.push('/withdraw')
}

const copyHomeInviteCode = async () => {
  if (!homeInviteCode.value) return
  try {
    await navigator.clipboard.writeText(homeInviteCode.value)
  } catch (error) {
    const textarea = document.createElement('textarea')
    textarea.value = homeInviteCode.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert('邀请码已复制')
  }
}

// ============ 生命周期 ============
onMounted(async () => {
  const syncState = getSyncState()
  if (isLoggedIn() && !syncState.hasSynced) {
    try {
      await syncAuthenticatedSession()
    } catch (error) {
      console.error('[Home] 拉取云端数据失败:', error)
    }
  }
  await refreshInviteCenterData()
  loadJournalEntries()
  streakData.value
})

// 监听日记弹窗打开，重置表单
watch(showJournal, (newVal) => {
  if (newVal) {
    journalText.value = ''
    selectedMood.value = 3
    editingEntryId.value = null
    currentPromptIndex.value = 0
    selectedTopic.value = ''
  }
})

// 监听目标缓存变化
watch(() => useAppCacheState().currentGoal.value, (goal) => {
  if (!showGoals.value) {
    userGoal.value = goal || ''
  }
}, { immediate: true })
</script>

<style scoped>
/* 首页全屏容器 - 突破父容器限制 */
.home-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #0a0a1a 0%, #1a1035 50%, #0d0d24 100%);
  -webkit-overflow-scrolling: touch;
}

/* 隐藏父容器溢出 */
:global(.app-container) .home-page {
  position: fixed;
}

/* 背景装饰 */
.liquid-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.liquid-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
  animation: float 8s ease-in-out infinite;
}

.liquid-orb-1 {
  width: 200px;
  height: 200px;
  background: rgba(139, 92, 246, 0.3);
  top: 10%;
  right: -50px;
  animation-delay: 0s;
}

.liquid-orb-2 {
  width: 150px;
  height: 150px;
  background: rgba(59, 130, 246, 0.25);
  bottom: 30%;
  left: -30px;
  animation-delay: -3s;
}

.liquid-orb-3 {
  width: 180px;
  height: 180px;
  background: rgba(236, 72, 153, 0.15);
  bottom: 10%;
  right: 10%;
  animation-delay: -5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}

/* 顶部状态栏 */
.status-bar {
  position: relative;
  z-index: 10;
  padding: 60px 20px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: none;
  width: 100%;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 22px;
  font-weight: 700;
  color: #f8fafc;
}

.user-motto {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 4px;
}

.settings-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-icon:hover {
  background: rgba(255, 255, 255, 0.15);
}

.settings-icon svg {
  width: 20px;
  height: 20px;
  color: #f8fafc;
}

/* 里程碑快捷入口 */
.milestone-shortcut {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  margin: 8px 16px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.milestone-shortcut:hover {
  background: rgba(139, 92, 246, 0.15);
}

.shortcut-text {
  font-size: 13px;
  color: #8b5cf6;
}

.milestone-shortcut svg {
  width: 16px;
  height: 16px;
  color: #8b5cf6;
}

/* 安全区 */
.safe-area-bottom {
  height: env(safe-area-inset-bottom);
}

/* 通用玻璃卡片效果 */
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

/* 模态框通用样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}

.modal-content {
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #f8fafc;
  display: block;
  margin-bottom: 20px;
  text-align: center;
}
</style>
