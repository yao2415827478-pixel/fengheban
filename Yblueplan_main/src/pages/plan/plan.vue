<template>
  <div class="plan-page">
    <!-- 动态背景 -->
    <div class="liquid-bg"></div>
    <div class="liquid-orb liquid-orb-1"></div>
    <div class="liquid-orb liquid-orb-2"></div>

    <!-- 顶部导航 -->
    <div class="nav-header">
      <div class="back-button" @click="goBack">
        <span>←</span>
      </div>
      <h1 class="nav-title">90天恢复计划</h1>
      <div class="placeholder"></div>
    </div>

    <!-- 进度指示 -->
    <div class="progress-indicator">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressWidth }"></div>
      </div>
      <span class="progress-text">第 {{ currentDay }} / 90 天</span>
    </div>

    <!-- 任务列表 -->
    <div class="task-list">
      <div
        v-for="task in allTasks"
        :key="task.day"
        class="task-item glass-card"
        :class="{ locked: task.day > currentDay, completed: isCompleted(task.day) }"
        @click="selectTask(task)"
      >
        <div class="task-day-badge">
          <span>Day {{ task.day }}</span>
        </div>
        <div class="task-info">
          <span class="task-theme">{{ task.theme }}</span>
          <span class="task-preview">{{ task.task.substring(0, 50) }}...</span>
        </div>
        <div class="task-status">
          <span v-if="isCompleted(task.day)" class="status-completed">✓</span>
          <span v-else-if="task.day > currentDay" class="status-locked">🔒</span>
          <span v-else class="status-current">进行中</span>
        </div>
      </div>
    </div>

    <!-- 任务详情弹窗 -->
    <div v-if="selectedTask" class="modal-overlay" @click="closeModal">
      <div class="task-modal glass-card" @click.stop>
        <div class="modal-header">
          <div class="modal-day-badge">
            <span>第 {{ selectedTask.day }} 天</span>
          </div>
          <h2 class="modal-theme">{{ selectedTask.theme }}</h2>
        </div>

        <div class="modal-content">
          <p class="content-text">{{ selectedTask.task }}</p>

          <!-- 神经科学知识 -->
          <div class="knowledge-section">
            <span class="section-label">🧠 神经科学知识</span>
            <p class="knowledge-text">{{ selectedTask.knowledge }}</p>
          </div>

          <!-- 行动任务 -->
          <div class="action-section">
            <span class="section-label">🎯 今日行动</span>
            <p class="action-text">{{ selectedTask.action }}</p>
          </div>

          <!-- 反思提示 -->
          <div class="reflection-section">
            <span class="section-label">💭 自我反思</span>
            <p class="reflection-text">{{ selectedTask.reflection }}</p>
          </div>
        </div>

        <div class="modal-actions">
          <button
            class="complete-button glass-button"
            :class="{ completed: isCompleted(selectedTask.day) }"
            @click="completeTask(selectedTask.day)"
          >
            {{ isCompleted(selectedTask.day) ? '✅ 已完成' : '完成任务' }}
          </button>
          <button class="close-modal-button" @click="closeModal">
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSyncState, useDailySyncState } from '../../composables/useDailySync'

// 导入统一数据系统
import {
  formatDateKey
} from '../../utils/dateUtils'
import {
  getAllPlanProgress,
  getCalendarStatusByDate,
  getPlanProgressByDate,
  savePlanProgressByDate,
  getAllCalendarStatus,
  checkInDate,
  isLoggedIn,
  useAppCacheState,
  setCachedInviteActivated
} from '../../utils/storage'
import { activateInvite, ensureDailyRecordLoaded, saveDailyRecord, syncAuthenticatedSession } from '../../services/api.js'

// 状态变量
const router = useRouter()
const selectedTask = ref(null)
const taskJustCompleted = ref(false)
const { currentDayIndex, appStartDate } = useDailySyncState()
const { inviteActivated } = useAppCacheState()

const getDateKeyByDay = (day) => {
  if (!appStartDate.value) return null

  const dayDate = new Date(`${appStartDate.value}T00:00:00`)
  dayDate.setDate(dayDate.getDate() + (day - 1))
  return formatDateKey(dayDate)
}

const currentDay = computed(() => {
  const day = Number(currentDayIndex.value || 1)
  return Math.min(Math.max(day, 1), 90)
})

// 计算进度
const progressWidth = computed(() => {
  return `${(currentDay.value / 90) * 100}%`
})

// 使用统一存储系统检查任务是否完成
const isCompleted = (day) => {
  const dateKey = getDateKeyByDay(day)
  if (!dateKey) return false

  const progress = getPlanProgressByDate(dateKey)
  if (Array.isArray(progress?.tasks) && progress.tasks.some(task => task.completed)) {
    return true
  }

  const allStatus = getAllCalendarStatus()
  return allStatus[dateKey]?.checked || false
}

// 90天任务数据
const allTasks = ref([
  {
    day: 1,
    theme: '开始新旅程',
    task: '今天是你戒色的第一天。这是一个全新的开始。闭上眼睛，深呼吸5分钟，感受内心的平静。告诉自己：我值得拥有更好的生活。',
    knowledge: '戒色的第一天，你的大脑开始适应没有额外多巴胺刺激的状态。这是重塑神经通路的开始。',
    action: '花5分钟静坐冥想，专注于呼吸。写下你戒色的三个主要原因。',
    reflection: '今天你感觉如何？是什么让你决定开始这个旅程？'
  },
  {
    day: 2,
    theme: '认识诱因',
    task: '了解自己的诱因是成功的关键。哪些时间、场景或情绪最容易触发你的冲动？提前识别它们。',
    knowledge: '大脑会形成"触发-反应"的神经通路。通过识别诱因，你可以提前准备替代方案。',
    action: '列出最近让你产生冲动的3个场景。为每个场景想一个替代行为。',
    reflection: '你发现自己最大的诱因是什么？你打算如何应对？'
  },
  {
    day: 3,
    theme: '建立新习惯',
    task: '用积极的新习惯替代旧习惯。运动、学习、社交都是很好的选择。',
    knowledge: '习惯形成需要66天。持续的重复会帮助大脑建立新的神经通路。',
    action: '选择一个你感兴趣的活动，如跑步、阅读或学习新技能。今天开始行动。',
    reflection: '今天你尝试了什么新活动？感觉如何？'
  },
  {
    day: 4,
    theme: '身体觉察',
    task: '身体和心理是紧密连接的。运动能促进内啡肽分泌，提升情绪。',
    knowledge: '运动可以增加前额叶皮层的活动，提高自控能力。每次运动后，大脑会进入更平静的状态。',
    action: '进行至少15分钟的中等强度运动，如跑步、游泳或健身。',
    reflection: '运动后你感觉有什么不同？'
  },
  {
    day: 5,
    theme: '情绪管理',
    task: '情绪波动是正常的。学会用健康的方式处理负面情绪，而不是逃避。',
    knowledge: '情绪低落时，大脑会寻求快速的慰藉。了解这一点可以帮助你做出更好的选择。',
    action: '当感到焦虑或沮丧时，尝试深呼吸、冥想或散步。记录下你的感受。',
    reflection: '今天你遇到了什么情绪挑战？你是如何应对的？'
  },
  {
    day: 6,
    theme: '社交支持',
    task: '与支持你的人在一起可以获得正能量。孤独会让我们更容易受到诱惑。',
    knowledge: '社会支持可以降低压力激素皮质醇的水平，提高自控力。',
    action: '与朋友或家人聊天，或者参加一个社交活动。',
    reflection: '谁是你最坚强的后盾？今天你和他们联系了吗？'
  },
  {
    day: 7,
    theme: '一周回顾',
    task: '回顾第一周的成功和挑战。为下一周制定更好的计划。',
    knowledge: '自我反思是持续成长的关键。每周回顾可以帮助你发现问题并改进。',
    action: '写下这一周的收获和挑战。制定下周的3个目标。',
    reflection: '这一周你最大的成就是什么？学到了什么？'
  },
  {
    day: 8,
    theme: '应对无聊',
    task: '无聊时最容易产生冲动。学会用有意义的方式填充时间。',
    knowledge: '无聊是大脑寻找刺激的信号。提前准备一些活动可以避免冲动。',
    action: '创建一个"当我无聊时"的活动清单。今天开始尝试。',
    reflection: '什么时候你最容易感到无聊？你会怎么做？'
  },
  {
    day: 9,
    theme: '睡前仪式',
    task: '睡前的习惯对第二天有很大影响。建立健康的睡前仪式。',
    knowledge: '睡眠不足会削弱前额叶的功能，影响自控力。良好的睡眠是成功的基础。',
    action: '建立睡前30分钟的放松仪式，如阅读、冥想或听音乐。避免使用手机。',
    reflection: '你的睡眠质量如何？有什么需要改进的？'
  },
  {
    day: 10,
    theme: '应对复发',
    task: '如果不小心破戒了，不要自责。重要的是如何重新开始。',
    knowledge: '复发是恢复过程的一部分，不是终点。每次复发都是学习的机会。',
    action: '分析今天破戒的原因。制定避免再次发生的具体计划。',
    reflection: '如果发生了，你会怎么对待自己？'
  },
  {
    day: 11,
    theme: '正念练习',
    task: '正念可以帮助你在冲动来临时保持清醒。',
    knowledge: '正念训练可以增强前额叶对边缘系统的控制。',
    action: '每天进行10分钟的正念冥想。',
    reflection: '正念练习给你带来了什么感受？'
  },
  {
    day: 12,
    theme: '目标设定',
    task: '设定清晰的长期和短期目标可以保持动力。',
    knowledge: '具体的目标更容易实现，也更能激励我们。',
    action: '写下30天、60天、90天的目标。',
    reflection: '90天后你希望成为什么样的人？'
  },
  {
    day: 13,
    theme: '环境管理',
    task: '优化你的生活环境，减少诱惑的出现。',
    knowledge: '环境线索会触发特定的行为。控制环境就是控制行为。',
    action: '清理可能触发你的物品和内容。',
    reflection: '你需要做出什么环境改变？'
  },
  {
    day: 14,
    theme: '两周里程碑',
    task: '恭喜你完成了两周！这是一个重要的里程碑。',
    knowledge: '研究表明，习惯形成通常需要2-4周。你已经走在正确的道路上。',
    action: '庆祝这个里程碑。给自己一个小奖励。',
    reflection: '这两周你感觉有什么变化？'
  },
  {
    day: 15,
    theme: '压力应对',
    task: '学会健康地处理压力，而不是用旧习惯逃避。',
    knowledge: '压力会降低自控力。学会放松技巧很重要。',
    action: '尝试一种新的放松方式，如瑜伽或太极。',
    reflection: '你通常如何应对压力？'
  },
  {
    day: 16,
    theme: '数字排毒',
    task: '减少使用手机和电脑的时间，特别是晚上。',
    knowledge: '屏幕发出的蓝光会影响睡眠质量。',
    action: '设定每天的"屏幕时间"限制。',
    reflection: '你每天花多少时间在屏幕上？'
  },
  {
    day: 17,
    theme: '感恩日记',
    task: '每天写下感恩的事情可以提升幸福感。',
    knowledge: '感恩练习可以改变大脑的消极倾向。',
    action: '写下今天让你感恩的三件事。',
    reflection: '今天你感恩什么？'
  },
  {
    day: 18,
    theme: '自我同情',
    task: '对自己温柔一点。自我批评会降低动力。',
    knowledge: '自我同情与更大的心理弹性相关。',
    action: '对自己说一些鼓励的话。',
    reflection: '你通常如何评价自己？'
  },
  {
    day: 19,
    theme: '早晨仪式',
    task: '建立积极的早晨习惯，为一天奠定基础。',
    knowledge: '早晨的决定会影响全天的选择。',
    action: '创建一个早晨仪式，包括运动和积极的自我对话。',
    reflection: '你的早晨习惯是什么？'
  },
  {
    day: 20,
    theme: '能量管理',
    task: '保持身体能量充足，避免因疲劳而冲动。',
    knowledge: '血糖波动会影响情绪和自控力。',
    action: '保持规律的饮食习惯。',
    reflection: '你的饮食规律吗？'
  }
])

// 选择任务
const selectTask = async (task) => {
  if (task.day <= currentDay.value) {
    const dateKey = getDateKeyByDay(task.day)

    if (
      isLoggedIn() &&
      dateKey &&
      !getPlanProgressByDate(dateKey) &&
      !getCalendarStatusByDate(dateKey)
    ) {
      try {
        await ensureDailyRecordLoaded(dateKey)
      } catch (error) {
        console.warn('[Plan] 获取单日任务记录失败，继续使用本地缓存:', error)
      }
    }

    selectedTask.value = task
  }
}

// 关闭弹窗
const closeModal = () => {
  selectedTask.value = null
}

const showActionError = (message) => {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message)
  }
}

const ensurePlanSessionLoaded = async () => {
  if (!isLoggedIn()) {
    return
  }

  const syncState = getSyncState()
  if (syncState.hasSynced) {
    return
  }

  try {
    await syncAuthenticatedSession()
  } catch (error) {
    console.warn('[Plan] 初始化会话数据失败，继续使用本地缓存:', error)
  }
}

// 检查是否有任何已完成的任务
const hasAnyCompletedTask = () => {
  const allProgress = getAllPlanProgress()
  const hasProgressCompleted = Object.values(allProgress).some(progress =>
    Array.isArray(progress?.tasks) && progress.tasks.some(task => task.completed)
  )

  if (hasProgressCompleted) {
    return true
  }

  const allStatus = getAllCalendarStatus()
  return Object.values(allStatus).some(s => s?.checked)
}

// 完成任务（含首次激活奖励逻辑）
const completeTask = async (day) => {
  if (!appStartDate.value) {
    console.warn('[Plan] 尚未开始旅程')
    return
  }

  await ensurePlanSessionLoaded()

  // 判断是否为首次完成（激活前检查）
  const isFirstCompletion = !hasAnyCompletedTask() && !inviteActivated.value

  // 计算该天对应的日期键
  const dateKey = getDateKeyByDay(day)
  if (!dateKey) return

  const completedTask = {
    id: `day-${day}`,
    day,
    completed: true,
    completedAt: new Date().toISOString()
  }

  let success = false
  let usedLocalFallback = false

  if (isLoggedIn()) {
    try {
      const result = await saveDailyRecord(dateKey, {
        dayIndex: day,
        checked: true,
        checkInTime: Date.now(),
        tasks: [completedTask]
      })
      success = !!result.success
      if (!success) {
        throw new Error(result.error?.message || '保存失败')
      }
    } catch (error) {
      console.error('[Plan] 保存云端打卡失败:', error)
      showActionError('任务完成同步失败，请稍后重试')
      return
    }
  }

  if (!isLoggedIn() && !success) {
    success = checkInDate(dateKey)
    usedLocalFallback = success
  }

  if (success) {
    if (usedLocalFallback) {
      savePlanProgressByDate(dateKey, {
        dayIndex: day,
        tasks: [completedTask]
      })
    }

    taskJustCompleted.value = true

    // 首次完成任务 → 触发激活奖励结算
    if (isFirstCompletion) {
      if (!isLoggedIn()) {
        setCachedInviteActivated(true)
      } else {
        try {
          const result = await activateInvite('first_task_complete')
          const activateErrorCode = result?.error?.code || ''

          if (result.success || activateErrorCode === 'RELATION_NOT_FOUND') {
            console.log('[Plan] 激活奖励处理完成:', result.data || activateErrorCode)
          } else {
            showActionError(result.error?.message || '激活奖励结算失败，请稍后重试')
          }
        } catch (error) {
          console.error('[Plan] 激活奖励结算失败:', error)
          showActionError('激活奖励结算失败，请稍后重试')
        }
      }
    }

    // 短暂延迟后关闭弹窗
    setTimeout(() => {
      closeModal()
      taskJustCompleted.value = false
    }, 600)
  }
}

// 返回
const goBack = () => {
  router.back()
}

onMounted(async () => {
  await ensurePlanSessionLoaded()
})
</script>

<style lang="scss" scoped>
.plan-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  padding-bottom: 100px;
}

.liquid-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at 20% 20%, #1e1b4b 0%, #000000 50%),
              radial-gradient(ellipse at 80% 80%, #172554 0%, #000000 50%),
              radial-gradient(ellipse at 50% 50%, #0f172a 0%, #000000 100%);
  z-index: -1;
}

.liquid-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 20s ease-in-out infinite;
  z-index: -1;
}

.liquid-orb-1 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #3B82F6, #6366F1);
  top: 10%;
  left: 10%;
}

.liquid-orb-2 {
  width: 250px;
  height: 250px;
  background: linear-gradient(135deg, #8B5CF6, #EC4899);
  top: 60%;
  right: 10%;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -30px) scale(1.05); }
  50% { transform: translate(-20px, 20px) scale(0.95); }
  75% { transform: translate(-30px, -20px) scale(1.02); }
}

.nav-header {
  position: relative;
  z-index: 10;
  padding: 70px 24px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-button {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #F8FAFC;
  cursor: pointer;
}

.nav-title {
  font-size: 18px;
  font-weight: 600;
  color: #F8FAFC;
  margin: 0;
}

.placeholder {
  width: 40px;
}

.progress-indicator {
  padding: 0 24px;
  margin-bottom: 16px;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #8B5CF6);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #94A3B8;
}

.task-list {
  padding: 0 24px;
  padding-bottom: 24px;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 14px;
  margin-bottom: 10px;
  opacity: 1;
  transition: all 0.3s ease;
  cursor: pointer;

  &.locked {
    opacity: 0.4;
  }

  &.completed {
    opacity: 0.8;
    border-color: #10B981;
  }

  &:active {
    transform: scale(0.98);
  }
}

.task-day-badge {
  background: linear-gradient(135deg, #3B82F6, #6366F1);
  padding: 6px 8px;
  border-radius: 6px;
  margin-right: 10px;
  flex-shrink: 0;

  span {
    font-size: 11px;
    font-weight: 600;
    color: #F8FAFC;
  }
}

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.task-theme {
  font-size: 14px;
  font-weight: 600;
  color: #F8FAFC;
  margin-bottom: 4px;
}

.task-preview {
  font-size: 12px;
  color: #94A3B8;
}

.task-status {
  margin-left: 10px;
}

.status-completed {
  color: #10B981;
  font-size: 16px;
}

.status-locked {
  font-size: 14px;
}

.status-current {
  font-size: 11px;
  color: #3B82F6;
}

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
  padding: 16px;
}

.task-modal {
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 20px;
}

.modal-header {
  margin-bottom: 16px;
}

.modal-day-badge {
  display: inline-block;
  background: linear-gradient(135deg, #3B82F6, #6366F1);
  padding: 4px 10px;
  border-radius: 4px;
  margin-bottom: 8px;

  span {
    font-size: 12px;
    font-weight: 600;
    color: #F8FAFC;
  }
}

.modal-theme {
  font-size: 20px;
  font-weight: 700;
  color: #F8FAFC;
  margin: 0;
}

.modal-content {
  margin-bottom: 16px;
}

.content-text {
  font-size: 14px;
  color: #F8FAFC;
  line-height: 1.8;
  display: block;
  margin-bottom: 16px;
}

.knowledge-section,
.action-section,
.reflection-section {
  margin-bottom: 14px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #8B5CF6;
  display: block;
  margin-bottom: 6px;
}

.knowledge-text,
.action-text,
.reflection-text {
  font-size: 13px;
  color: #94A3B8;
  line-height: 1.7;
  margin: 0;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.complete-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  &.completed {
    background: linear-gradient(135deg, #10B981, #059669);
  }
}

.close-modal-button {
  width: 100%;
  height: 40px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #94A3B8;
  font-size: 14px;
  cursor: pointer;
}
</style>
