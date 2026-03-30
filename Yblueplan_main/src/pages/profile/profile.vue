<template>
  <div class="profile-page">
    <!-- 动态背景 -->
    <div class="liquid-bg"></div>
    <div class="liquid-orb liquid-orb-1"></div>
    <div class="liquid-orb liquid-orb-2"></div>

    <!-- 顶部导航 -->
    <div class="nav-bar">
      <span class="nav-title">我的</span>
    </div>

    <!-- 用户信息卡片 -->
    <div class="user-card glass-card">
      <div class="user-avatar">
        <span class="avatar-text">🎯</span>
      </div>
      <div class="user-info">
        <span class="user-name">{{ userInfo.nickname }}</span>
        <span class="user-phone">{{ maskedPhone }}</span>
        <span class="user-register">注册于 {{ userInfo.registerTime }}</span>
      </div>
    </div>

    <!-- 我的状态 -->
    <div class="section-card glass-card">
      <span class="section-title">我的状态</span>
      <div class="status-grid">
        <div class="status-item">
          <span class="status-value">{{ myStatus.currentStage }}</span>
          <span class="status-label">当前阶段</span>
        </div>
        <div class="status-item">
          <span class="status-value gradient-text">{{ myStatus.streakDays }}</span>
          <span class="status-label">连续天数</span>
        </div>
        <div class="status-item">
          <span class="status-value">{{ myStatus.startDate }}</span>
          <span class="status-label">开始时间</span>
        </div>
      </div>
    </div>

    <!-- 我的目标 -->
    <div class="section-card glass-card">
      <span class="section-title">我的目标</span>
      <div class="goal-content">
        <span class="goal-name">{{ myGoal.currentGoal }}</span>
        <div class="goal-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: goalProgressPercent + '%' }"></div>
          </div>
          <span class="progress-text">{{ myGoal.currentProgress }} / {{ myGoal.goalDays }} 天</span>
        </div>
      </div>
    </div>

    <!-- 我的激活奖励 -->
    <div v-if="hasActivated" class="section-card glass-card activation-card">
      <span class="section-title">🎉 新手激活奖励</span>
      <div class="activation-content">
        <span class="activation-amount">¥{{ activationBonus }}</span>
        <span class="activation-desc">首次完成任务后到账</span>
      </div>
    </div>

    <!-- 邀请码核心区域 -->
    <div class="invite-card glass-card">
      <div class="invite-header">
        <span class="invite-title">🎁 我的专属邀请码</span>
        <span class="invite-subtitle">好友使用立减2元，你得奖励</span>
      </div>
      <div class="invite-code-box">
        <span class="invite-code">{{ myInviteCode }}</span>
        <button class="copy-btn" @click="copyInviteCode">复制</button>
      </div>
    </div>

    <!-- 邀请收益概览 -->
    <div class="section-card glass-card">
      <span class="section-title">邀请收益</span>
      <div class="reward-grid">
        <div class="reward-item">
          <span class="reward-value">{{ inviteSummary.totalInvited }}</span>
          <span class="reward-label">累计邀请</span>
        </div>
        <div class="reward-item">
          <span class="reward-value pending">¥{{ inviteSummary.pendingReward }}</span>
          <span class="reward-label">待结算</span>
        </div>
        <div class="reward-item">
          <span class="reward-value available">¥{{ inviteSummary.withdrawableAmount }}</span>
          <span class="reward-label">可提现</span>
        </div>
        <div class="reward-item">
          <span class="reward-value">¥{{ inviteSummary.withdrawnAmount }}</span>
          <span class="reward-label">已提现</span>
        </div>
      </div>
    </div>

    <!-- 提现入口 -->
    <div class="withdraw-entry glass-card" @click="goToWithdraw">
      <div class="withdraw-entry-info">
        <span class="withdraw-entry-label">可提现余额</span>
        <span class="withdraw-entry-amount">¥{{ inviteSummary.withdrawableAmount }}</span>
      </div>
      <div class="withdraw-entry-action">
        <span class="withdraw-entry-text">{{ withdrawEntryText }}</span>
        <span class="withdraw-entry-arrow">→</span>
      </div>
    </div>

    <!-- 邀请规则 -->
    <div class="rules-section">
      <div class="rules-header" @click="toggleRules">
        <span class="rules-title">邀请规则</span>
        <span class="rules-toggle">{{ showRules ? '▲' : '▼' }}</span>
      </div>
      <div v-if="showRules" class="rules-content">
        <span class="rule-item">1. 新用户使用你的邀请码，立减2元</span>
        <span class="rule-item">2. 被邀请人完成首次激活后，你获得对应奖励</span>
        <span class="rule-item">3. 第1个邀请：3元，第2个：4元，第3个：5元</span>
        <span class="rule-item">4. 第4个起：每人4元</span>
        <span class="rule-item">5. 满8元可申请提现</span>
      </div>
    </div>

    <!-- 复制成功提示 -->
    <div v-if="showCopyToast" class="toast-message">已复制到剪贴板</div>

    <!-- 退出登录 -->
    <button class="logout-btn" @click="logout">退出登录</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { resetDailySyncState, useDailySyncState } from '../../composables/useDailySync'
import { getInviteSummary, syncAuthenticatedSession } from '../../services/api.js'
import {
  clearAuth,
  getPhone,
  getUserInfo,
  useAppCacheState
} from '../../utils/storage.js'

const router = useRouter()
const { currentDayIndex, appStartDate } = useDailySyncState()
const {
  currentGoal: cachedGoal,
  goalDays: cachedGoalDays,
  inviteActivated: cachedInviteActivated
} = useAppCacheState()

// ========== 1. 用户基础信息 ==========
const userInfo = ref({
  nickname: '战士',
  phone: '',
  registerTime: ''
})

const maskedPhone = computed(() => {
  const phone = userInfo.value.phone
  if (!phone || phone.length !== 11) return ''
  return phone.slice(0, 3) + '****' + phone.slice(7)
})

// ========== 2. 我的状态（从本地存储计算）==========
const myStatus = ref({
  currentStage: '第一阶段：建立意识',
  streakDays: 0,
  startDate: ''
})

// ========== 3. 我的目标 ==========
const myGoal = ref({
  currentGoal: '完成90天戒色计划',
  goalDays: 90,
  currentProgress: 0
})

const goalProgressPercent = computed(() => {
  return Math.min((myGoal.value.currentProgress / myGoal.value.goalDays) * 100, 100)
})

// ========== 4. 邀请码（从后端用户信息获取）==========
const myInviteCode = ref('')

// ========== 5. 邀请收益数据 ==========
const inviteSummary = ref({
  totalInvited: 0,
  pendingReward: 0,
  withdrawableAmount: 0,
  withdrawnAmount: 0
})

const formatDisplayDate = (value, fallback = '') => {
  if (!value) return fallback

  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const timestamp = Number(value)
    const date = new Date(timestamp)
    return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString('zh-CN')
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? new Date(`${value}T00:00:00`)
    : new Date(value)

  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString('zh-CN')
}

const resolveStageText = (currentDayIndex = 1) => {
  const streakDays = Math.max(Number(currentDayIndex || 1) - 1, 0)

  if (streakDays < 3) return '第一阶段：建立意识'
  if (streakDays < 7) return '第二阶段：建立习惯'
  if (streakDays < 30) return '第三阶段：巩固成果'
  if (streakDays < 60) return '第四阶段：深度恢复'
  return '第五阶段：重获新生'
}

const applyProfileState = (source = null) => {
  const localUser = getUserInfo() || {}
  const serverUser = source || {}
  const currentPhone = serverUser.phone || localUser.phone || getPhone() || ''
  const goalDays = Number(serverUser.goalDays || cachedGoalDays.value || 90)
  const nextCurrentDayIndex = Number(serverUser.currentDayIndex || currentDayIndex.value || 1)
  const inviteActivated = serverUser.inviteActivated !== undefined
    ? !!serverUser.inviteActivated
    : cachedInviteActivated.value
  const registerTime = serverUser.registerTime || localUser.registerTime || ''
  const nextAppStartDate = serverUser.appStartDate || appStartDate.value || ''
  const currentGoal = serverUser.currentGoal || cachedGoal.value || '完成90天戒色计划'

  userInfo.value = {
    nickname: serverUser.nickname || localUser.nickname || '战士',
    phone: currentPhone,
    registerTime: formatDisplayDate(registerTime, '')
  }

  myInviteCode.value = serverUser.inviteCode || localUser.inviteCode || ''
  myGoal.value.currentGoal = currentGoal
  myGoal.value.goalDays = goalDays
  myGoal.value.currentProgress = Math.min(nextCurrentDayIndex, goalDays)

  myStatus.value = {
    currentStage: resolveStageText(nextCurrentDayIndex),
    streakDays: Math.max(nextCurrentDayIndex - 1, 0),
    startDate: formatDisplayDate(nextAppStartDate, '')
  }

  hasActivated.value = inviteActivated
  activationBonus.value = inviteActivated ? 2 : 0
}

watch([cachedGoal, cachedGoalDays, cachedInviteActivated, currentDayIndex, appStartDate], () => {
  applyProfileState()
}, { immediate: true })

const loadInviteSummary = async () => {
  try {
    const result = await getInviteSummary()
    if (result.success) {
      inviteSummary.value = {
        totalInvited: result.data.totalInvited || 0,
        pendingReward: result.data.pendingReward || 0,
        withdrawableAmount: result.data.withdrawableAmount || 0,
        withdrawnAmount: result.data.withdrawnAmount || 0
      }

      if (result.data.myInviteCode) {
        myInviteCode.value = result.data.myInviteCode
      }

      const rewardAmount = Number(result.data.activationBonus || 0)
      if (rewardAmount > 0) {
        activationBonus.value = rewardAmount
        hasActivated.value = true
      }
    }
  } catch (error) {
    console.error('[Profile] 加载邀请收益失败:', error)
  }
}

// ========== 6. 激活奖励 ==========
const activationBonus = ref(0)
const hasActivated = ref(false)

// ========== 7. 提现 ==========
const withdrawEntryText = computed(() => {
  if (inviteSummary.value.withdrawableAmount >= 8) {
    return '申请提现'
  }
  return '满8元可提现'
})

const goToWithdraw = () => {
  router.push('/withdraw')
}

// ========== 8. 邀请规则 ==========
const showRules = ref(false)
const toggleRules = () => {
  showRules.value = !showRules.value
}

// ========== 9. 复制邀请码 ==========
const showCopyToast = ref(false)

const copyInviteCode = async () => {
  try {
    await navigator.clipboard.writeText(myInviteCode.value)
    showCopyToast.value = true
    setTimeout(() => { showCopyToast.value = false }, 2000)
  } catch (e) {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = myInviteCode.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    showCopyToast.value = true
    setTimeout(() => { showCopyToast.value = false }, 2000)
  }
}

// ========== 10. 退出登录 ==========
const logout = () => {
  if (confirm('确定要退出登录吗？')) {
    clearAuth()
    resetDailySyncState()
    router.replace('/login')
  }
}

// ========== 初始化 ==========
onMounted(async () => {
  try {
    const session = await syncAuthenticatedSession({ includeBootstrap: false })
    const serverResult = session.profile
    if (serverResult.success && serverResult.data) {
      applyProfileState(serverResult.data)
    }
  } catch (e) {
    console.error('[Profile] 获取用户信息失败:', e)
  }

  loadInviteSummary()
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 70px 16px 24px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  position: relative;
  z-index: 1;
}

.gradient-text {
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 40px 16px 10px;
  z-index: 10;
  text-align: center;
}

.nav-title {
  font-size: 18px;
  font-weight: 600;
  color: #F8FAFC;
}

/* 用户卡片 */
.user-card {
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
}

.user-avatar {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.avatar-text { font-size: 24px; }

.user-info { flex: 1; }

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #F8FAFC;
  display: block;
  margin-bottom: 4px;
}

.user-phone {
  font-size: 13px;
  color: #94A3B8;
  display: block;
  margin-bottom: 2px;
}

.user-register {
  font-size: 11px;
  color: #64748B;
}

/* 通用卡片 */
.section-card {
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #F8FAFC;
  display: block;
  margin-bottom: 12px;
}

/* 状态网格 */
.status-grid {
  display: flex;
  justify-content: space-between;
}

.status-item { flex: 1; text-align: center; }

.status-value {
  font-size: 13px;
  color: #F8FAFC;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.status-label {
  font-size: 11px;
  color: #94A3B8;
}

/* 目标 */
.goal-name {
  font-size: 14px;
  color: #F8FAFC;
  display: block;
  margin-bottom: 8px;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #8B5CF6);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: #94A3B8;
}

/* 邀请码卡片 */
.invite-card {
  padding: 16px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.invite-header { margin-bottom: 12px; }

.invite-title {
  font-size: 14px;
  font-weight: 600;
  color: #F8FAFC;
  display: block;
  margin-bottom: 4px;
}

.invite-subtitle {
  font-size: 12px;
  color: #94A3B8;
}

.invite-code-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 12px 16px;
}

.invite-code {
  font-size: 20px;
  font-weight: 700;
  color: #3B82F6;
  letter-spacing: 2px;
}

.copy-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

/* 收益网格 */
.reward-grid {
  display: flex;
  justify-content: space-between;
}

.reward-item { flex: 1; text-align: center; }

.reward-value {
  font-size: 16px;
  font-weight: 700;
  color: #F8FAFC;
  display: block;
  margin-bottom: 4px;
}

.reward-value.pending { color: #F59E0B; }
.reward-value.available { color: #10B981; }

.reward-label {
  font-size: 11px;
  color: #94A3B8;
}

/* 提现入口 */
.withdraw-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
}

.withdraw-entry-label {
  font-size: 12px;
  color: #94A3B8;
  display: block;
  margin-bottom: 4px;
}

.withdraw-entry-amount {
  font-size: 20px;
  font-weight: 700;
  color: #10B981;
}

.withdraw-entry-action {
  display: flex;
  align-items: center;
  gap: 4px;
}

.withdraw-entry-text {
  font-size: 14px;
  color: #3B82F6;
}

.withdraw-entry-arrow {
  font-size: 14px;
  color: #3B82F6;
}

/* 规则 */
.rules-section { margin-bottom: 12px; }

.rules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  cursor: pointer;
}

.rules-title {
  font-size: 14px;
  color: #F8FAFC;
}

.rules-toggle {
  font-size: 12px;
  color: #64748B;
}

.rules-content {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0 0 8px 8px;
  margin-top: -4px;
}

.rule-item {
  font-size: 12px;
  color: #94A3B8;
  display: block;
  margin-bottom: 6px;
  line-height: 1.6;
}

/* Toast 提示 */
.toast-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 999;
  pointer-events: none;
}

/* 退出登录 */
.logout-btn {
  width: 100%;
  height: 48px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #EF4444;
  font-size: 15px;
  margin-top: 12px;
  cursor: pointer;
}

/* 激活奖励卡片 */
.activation-card {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2));
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.activation-content {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.activation-amount {
  font-size: 24px;
  font-weight: 700;
  color: #10B981;
}

.activation-desc {
  font-size: 12px;
  color: #94A3B8;
}
</style>
