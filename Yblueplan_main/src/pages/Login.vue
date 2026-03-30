<template>
  <div class="login-page">
    <!-- 动态背景 -->
    <div class="liquid-bg"></div>
    <div class="liquid-orb liquid-orb-1"></div>
    <div class="liquid-orb liquid-orb-2"></div>

    <!-- 主要内容 -->
    <div class="content">
      <!-- 标题 -->
      <div class="header-section">
        <h1 class="title">欢迎回来</h1>
        <p class="subtitle">登录后开始你的戒色之旅</p>
      </div>

      <!-- 评估结果卡片 -->
      <div class="result-card glass-card">
        <span class="result-label">你的依赖程度评估</span>
        <div class="result-score">
          <span class="score-value gradient-text">{{ surveyScore }}</span>
          <span class="score-unit">分</span>
        </div>
        <span class="result-level">{{ scoreLevel }}</span>
      </div>

      <!-- 登录表单 -->
      <div class="form-section">
        <!-- 手机号输入 -->
        <div class="input-group">
          <label class="input-label">手机号码</label>
          <input
            class="glass-input"
            type="tel"
            v-model="phone"
            placeholder="请输入手机号码"
            maxlength="11"
          />
        </div>

        <!-- 验证码输入 -->
        <div class="input-group">
          <label class="input-label">验证码</label>
          <div class="code-input-row">
            <input
              class="glass-input code-input"
              type="text"
              v-model="code"
              placeholder="请输入验证码"
              maxlength="6"
            />
            <button
              class="code-button"
              :disabled="countdown > 0 || !isPhoneValid"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>

        <!-- 登录按钮 -->
        <button
          class="login-button glass-button"
          @click="handleLogin"
          :disabled="isLoading"
        >
          {{ isLoading ? '登录中...' : '登录' }}
        </button>
      </div>

      <!-- 其他提示 -->
      <div class="notice-section">
        <span class="notice-text">未注册的手机号将自动创建账号</span>
        <span class="notice-text">登录即表示同意</span>
        <button type="button" class="link-text legal-link" @click="openLegalPage('terms')">《用户协议》</button>
        <span class="notice-text">和</span>
        <button type="button" class="link-text legal-link" @click="openLegalPage('privacy')">《隐私政策》</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { sendSmsCode, login, bindPendingInviteRelation, syncAuthenticatedSession } from '../services/api'
import {
  getCachedPaymentPhone,
  setCachedPaymentPhone,
  useAppCacheState
} from '../utils/storage'

const router = useRouter()

const openLegalPage = (type) => {
  router.push({
    path: type === 'privacy' ? '/legal/privacy' : '/legal/terms',
    query: {
      from: 'login'
    }
  })
}

// 状态变量
const phone = ref(getCachedPaymentPhone())
const code = ref('')
const countdown = ref(0)
const isLoading = ref(false)
const errorMsg = ref('')
const { surveyResult } = useAppCacheState()
let countdownTimer = null
let countdownEndTime = null

// 页面可见性变化处理 - 修复后台切换时间静止问题
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && countdownEndTime) {
    const remaining = Math.ceil((countdownEndTime - Date.now()) / 1000)
    if (remaining > 0) {
      countdown.value = remaining
    } else {
      countdown.value = 0
      clearInterval(countdownTimer)
    }
  }
}

document.addEventListener('visibilitychange', handleVisibilityChange)

// 手机号格式验证
const isPhoneValid = computed(() => {
  return /^1[3-9]\d{9}$/.test(phone.value.trim())
})

// 获取评估结果
const surveyScore = computed(() => surveyResult.value?.score || 0)

// 计算评分等级
const scoreLevel = computed(() => {
  const score = surveyScore.value
  if (score < 20) return '轻度依赖 - 状态良好'
  if (score < 40) return '轻度依赖 - 需保持'
  if (score < 60) return '中度依赖 - 建议干预'
  if (score < 80) return '高度依赖 - 需要帮助'
  return '重度依赖 - 建议专业帮助'
})

// 发送验证码
const sendCode = async () => {
  if (!phone.value.trim() || !isPhoneValid.value) {
    errorMsg.value = '请输入正确的手机号码'
    return
  }

  errorMsg.value = ''

  // 开始倒计时
  countdownEndTime = Date.now() + 60000
  countdown.value = 60

  countdownTimer = setInterval(() => {
    const remaining = Math.ceil((countdownEndTime - Date.now()) / 1000)
    countdown.value = remaining > 0 ? remaining : 0
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownEndTime = null
    }
  }, 1000)

  try {
    const result = await sendSmsCode(phone.value.trim())
    if (result.success) {
      console.log('[Login] 验证码已发送')
      // 开发模式下提示固定验证码
      if (result.data?.message?.includes('开发模式')) {
        code.value = '123456'
      }
    } else {
      errorMsg.value = result.error?.message || '发送失败，请稍后重试'
    }
  } catch (error) {
    console.error('[Login] 发送验证码失败:', error)
    errorMsg.value = '网络错误，请稍后重试'
  }
}

// 处理登录
const handleLogin = async () => {
  if (!phone.value.trim() || !isPhoneValid.value) {
    errorMsg.value = '请输入正确的手机号码'
    return
  }

  if (!code.value || code.value.length < 4) {
    errorMsg.value = '请输入验证码'
    return
  }

  errorMsg.value = ''
  isLoading.value = true

  try {
    setCachedPaymentPhone(phone.value.trim())
    const result = await login(phone.value.trim(), code.value, surveyResult.value?.surveyId || null)

    if (result.success && result.data) {
      console.log('[Login] 登录成功:', result.data.user?.userId)

      const bindResult = await bindPendingInviteRelation()
      if (bindResult.success && !bindResult.skipped) {
        console.log('[Login] 邀请关系绑定处理完成:', bindResult.data?.bindStatus || 'bound')
      } else if (!bindResult.success && !bindResult.skipped) {
        console.warn('[Login] 邀请关系绑定未完成:', bindResult.error?.message || '未知原因')
      }

      const hasPaidAccess = !!result.data.access?.hasPaid
      if (hasPaidAccess) {
        try {
          await syncAuthenticatedSession()
        } catch (syncError) {
          console.warn('[Login] 登录后同步会话数据失败:', syncError)
        }
      }
      router.push(hasPaidAccess ? '/home' : '/payment')
    } else {
      errorMsg.value = result.error?.message || '登录失败，请检查验证码'
    }
  } catch (error) {
    console.error('[Login] 登录失败:', error)
    errorMsg.value = '网络错误，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 清理定时器
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow: hidden;
}

.content {
  position: relative;
  z-index: 1;
  padding: 80px 24px 32px;
}

.header-section {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  font-size: 32px;
  font-weight: 700;
  color: #F8FAFC;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 16px;
  color: #94A3B8;
}

.result-card {
  padding: 24px;
  text-align: center;
  margin-bottom: 32px;
}

.result-label {
  font-size: 14px;
  color: #94A3B8;
  display: block;
  margin-bottom: 10px;
}

.result-score {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 8px;
}

.score-value {
  font-size: 42px;
  font-weight: 700;
}

.score-unit {
  font-size: 16px;
  color: #94A3B8;
  margin-left: 4px;
}

.result-level {
  font-size: 15px;
  color: #8B5CF6;
}

.form-section {
  margin-bottom: 32px;
}

.input-group {
  margin-bottom: 20px;
}

.input-label {
  font-size: 14px;
  color: #94A3B8;
  display: block;
  margin-bottom: 8px;
}

.code-input-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.code-input {
  flex: 1;
}

.code-button {
  width: 120px;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 12px;
  color: #3B82F6;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.code-button:disabled {
  opacity: 0.5;
}

.login-button {
  width: 100%;
  height: 56px;
  font-size: 18px;
  margin-top: 12px;
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  color: #EF4444;
  font-size: 14px;
  text-align: center;
  margin-bottom: 12px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
}

.notice-section {
  text-align: center;
}

.notice-text {
  font-size: 13px;
  color: #64748B;
  display: inline;
}

.link-text {
  font-size: 13px;
  color: #3B82F6;
  display: inline;
}

.legal-link {
  padding: 0;
  background: transparent;
  border: none;
}
</style>
