<template>
  <div class="withdraw-page">
    <!-- 动态背景 -->
    <div class="liquid-bg"></div>
    <div class="liquid-orb liquid-orb-1"></div>
    <div class="liquid-orb liquid-orb-2"></div>

    <!-- 顶部导航 -->
    <div class="nav-bar">
      <span class="nav-back" @click="goBack">←</span>
      <span class="nav-title">提现申请</span>
      <div class="nav-placeholder"></div>
    </div>

    <!-- 余额卡片 -->
    <div class="balance-card glass-card">
      <span class="balance-label">可提现余额</span>
      <span class="balance-amount">¥{{ withdrawableAmount }}</span>
      <span v-if="withdrawableAmount < 8" class="balance-hint">满8元可申请提现</span>
    </div>

    <!-- 提现表单 -->
    <div v-if="canWithdraw" class="form-section">
      <!-- 收款账号 -->
      <div class="input-card glass-card">
        <span class="input-label">收款方式</span>
        <div class="method-row">
          <span class="method-icon">💳</span>
          <span class="method-name">支付宝</span>
          <span class="method-check">✓</span>
        </div>
      </div>

      <div class="input-card glass-card">
        <span class="input-label">支付宝账号</span>
        <input
          class="form-input"
          v-model="alipayAccount"
          placeholder="请输入支付宝账号（手机号或邮箱）"
        />
      </div>

      <div class="input-card glass-card">
        <span class="input-label">真实姓名</span>
        <input
          class="form-input"
          v-model="accountName"
          placeholder="请输入支付宝实名认证的姓名"
        />
      </div>

      <!-- 提现金额 -->
      <div class="input-card glass-card">
        <div class="input-header">
          <span class="input-label">提现金额</span>
          <span class="input-all" @click="fillAllAmount">全部提现</span>
        </div>
        <div class="amount-input-wrapper">
          <span class="amount-symbol">¥</span>
          <input
            class="amount-input"
            type="number"
            step="0.01"
            v-model="withdrawAmount"
            placeholder="请输入提现金额"
          />
        </div>
        <span class="amount-hint">可提现 ¥{{ withdrawableAmount }}</span>
      </div>

      <!-- 提现按钮 -->
      <button
        class="submit-btn"
        :disabled="!isValidForm || isSubmitting"
        @click="submitWithdraw"
      >
        {{ isSubmitting ? '提交中...' : '申请提现' }}
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="withdrawRecords.length === 0" class="empty-card glass-card">
      <span class="empty-icon">📋</span>
      <span class="empty-title">暂无提现记录</span>
      <span class="empty-desc">第一次申请后会显示在这里</span>
    </div>

    <!-- 提现记录 -->
    <div v-else class="records-card glass-card">
      <span class="records-title">提现记录</span>
      <div
        v-for="record in withdrawRecords"
        :key="record.withdrawId"
        class="record-item"
      >
        <div class="record-info">
          <span class="record-amount">-¥{{ record.amount }}</span>
          <span class="record-time">{{ formatTime(record.applyTime) }}</span>
        </div>
        <span class="record-status" :class="record.status">
          {{ statusText(record.status) }}
        </span>
      </div>
    </div>

    <!-- 说明 -->
    <div class="notice-section">
      <span class="notice-title">提现说明</span>
      <span class="notice-item">1. 满8元可申请提现</span>
      <span class="notice-item">2. 提现申请将在1-3个工作日内处理</span>
      <span class="notice-item">3. 提现金额将转入您的支付宝账户</span>
      <span class="notice-item">4. 请确认支付宝账号和姓名与实名认证一致</span>
    </div>

    <!-- Toast -->
    <div v-if="toastMsg" class="toast-message">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getInviteSummary,
  applyWithdraw,
  getWithdrawRecords,
  getWithdrawAccount,
  saveWithdrawAccount
} from '../../services/api.js'

const router = useRouter()

// 数据
const withdrawableAmount = ref(0)
const withdrawAmount = ref('')
const alipayAccount = ref('')
const accountName = ref('')
const withdrawRecords = ref([])
const isSubmitting = ref(false)
const toastMsg = ref('')

// 显示 toast
const showToast = (msg, duration = 2000) => {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, duration)
}

// 计算属性
const canWithdraw = computed(() => withdrawableAmount.value >= 8)

const isValidForm = computed(() => {
  const amount = parseFloat(withdrawAmount.value)
  return (
    amount >= 8 &&
    amount <= withdrawableAmount.value &&
    alipayAccount.value.trim().length >= 5 &&
    accountName.value.trim().length >= 2
  )
})

// 加载数据
const loadData = async () => {
  try {
    const [summaryResult, recordsResult, accountResult] = await Promise.all([
      getInviteSummary(),
      getWithdrawRecords(),
      getWithdrawAccount()
    ])

    if (summaryResult.success) {
      withdrawableAmount.value = summaryResult.data.withdrawableAmount || 0
    }

    if (recordsResult.success) {
      withdrawRecords.value = recordsResult.data.list || []
    }

    if (accountResult.success && accountResult.data) {
      alipayAccount.value = accountResult.data.accountNo || ''
      accountName.value = accountResult.data.accountName || ''
    }
  } catch (error) {
    console.error('[Withdraw] 加载数据失败:', error)
  }
}

// 全部提现
const fillAllAmount = () => {
  withdrawAmount.value = String(withdrawableAmount.value)
}

// 提交提现
const submitWithdraw = async () => {
  if (!isValidForm.value || isSubmitting.value) return

  const amount = parseFloat(withdrawAmount.value)
  isSubmitting.value = true

  try {
    await saveWithdrawAccount({
      accountType: 'alipay',
      accountNo: alipayAccount.value.trim(),
      accountName: accountName.value.trim()
    })

    const result = await applyWithdraw(
      amount,
      'alipay',
      alipayAccount.value.trim(),
      accountName.value.trim()
    )

    if (result.success) {
      showToast('提现申请已提交，请耐心等待审核')
      withdrawAmount.value = ''
      await loadData()
    } else {
      showToast(result.error?.message || '申请失败')
    }
  } catch (error) {
    showToast('申请失败，请重试')
  } finally {
    isSubmitting.value = false
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const d = new Date(typeof timestamp === 'number' ? timestamp : parseInt(timestamp))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 状态文案
const statusText = (status) => {
  const map = {
    processing: '审核中',
    completed: '已到账',
    approved: '已到账',
    failed: '已拒绝',
    rejected: '已拒绝'
  }
  return map[status] || status
}

// 初始化
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.withdraw-page {
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

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 40px 16px 10px;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-back {
  font-size: 18px;
  color: #F8FAFC;
  width: 30px;
  cursor: pointer;
}

.nav-title {
  font-size: 18px;
  font-weight: 600;
  color: #F8FAFC;
  flex: 1;
  text-align: center;
}

.nav-placeholder { width: 30px; }

.balance-card {
  padding: 24px;
  text-align: center;
  margin-bottom: 16px;
}

.balance-label {
  font-size: 14px;
  color: #94A3B8;
  display: block;
  margin-bottom: 8px;
}

.balance-amount {
  font-size: 36px;
  font-weight: 700;
  color: #10B981;
  display: block;
  margin-bottom: 8px;
}

.balance-hint {
  font-size: 12px;
  color: #F59E0B;
}

/* 表单区域 */
.form-section {
  position: relative;
  z-index: 1;
}

.input-card {
  padding: 16px;
  margin-bottom: 12px;
}

.input-label {
  font-size: 14px;
  color: #94A3B8;
  display: block;
  margin-bottom: 10px;
}

.method-row {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
}

.method-icon {
  font-size: 18px;
  margin-right: 10px;
}

.method-name {
  flex: 1;
  font-size: 15px;
  color: #F8FAFC;
  font-weight: 500;
}

.method-check {
  color: #3B82F6;
  font-weight: 700;
}

.form-input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #F8FAFC;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: #64748B;
}

.form-input:focus {
  border-color: #3B82F6;
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.input-all {
  font-size: 13px;
  color: #3B82F6;
  cursor: pointer;
}

.amount-input-wrapper {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.amount-symbol {
  font-size: 24px;
  color: #F8FAFC;
  margin-right: 8px;
}

.amount-input {
  flex: 1;
  font-size: 24px;
  color: #F8FAFC;
  background: transparent;
  border: none;
  outline: none;
}

.amount-input::placeholder { color: #64748B; }

.amount-hint {
  font-size: 12px;
  color: #64748B;
}

.submit-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #10B981, #059669);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  cursor: pointer;
}

.submit-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: #64748B;
  cursor: not-allowed;
}

.empty-card {
  padding: 32px 16px;
  text-align: center;
  margin-bottom: 16px;
}

.empty-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 14px;
  color: #F8FAFC;
  display: block;
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 12px;
  color: #64748B;
}

.records-card {
  padding: 16px;
  margin-bottom: 16px;
}

.records-title {
  font-size: 14px;
  font-weight: 600;
  color: #F8FAFC;
  display: block;
  margin-bottom: 12px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.record-item:last-child { border-bottom: none; }

.record-amount {
  font-size: 14px;
  color: #F8FAFC;
  display: block;
  margin-bottom: 4px;
}

.record-time {
  font-size: 11px;
  color: #64748B;
}

.record-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.record-status.processing {
  color: #F59E0B;
  background: rgba(245, 158, 11, 0.1);
}

.record-status.completed,
.record-status.approved {
  color: #10B981;
  background: rgba(16, 185, 129, 0.1);
}

.record-status.failed,
.record-status.rejected {
  color: #EF4444;
  background: rgba(239, 68, 68, 0.1);
}

.notice-section {
  padding: 0 8px;
}

.notice-title {
  font-size: 14px;
  font-weight: 600;
  color: #F8FAFC;
  display: block;
  margin-bottom: 8px;
}

.notice-item {
  font-size: 12px;
  color: #64748B;
  display: block;
  margin-bottom: 6px;
  line-height: 1.6;
}

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
</style>
