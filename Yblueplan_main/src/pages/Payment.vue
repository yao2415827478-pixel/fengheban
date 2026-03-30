<template>
  <div class="payment-page">
    <!-- 动态背景 -->
    <div class="liquid-bg"></div>
    <div class="liquid-orb liquid-orb-1"></div>
    <div class="liquid-orb liquid-orb-2"></div>

    <!-- 主内容 -->
    <div class="content">
      <!-- 标题 -->
      <div class="header-section">
        <h1 class="title">布鲁计划</h1>
        <p class="subtitle">给当下的自己一个改变的机会</p>
      </div>

      <!-- 价值主张 -->
      <div class="value-section">
        <div class="value-card glass-card">
          <div class="value-icon">🌟</div>
          <h3 class="value-title">你值得拥有更好的自己</h3>
          <p class="value-desc">
            每一个戒色成功的人，都曾面对同样的挣扎。<br/>
            现在的你，只差一个决心。
          </p>
        </div>

        <div class="value-card glass-card">
          <div class="value-icon">💪</div>
          <h3 class="value-title">科学的方法，陪你走过90天</h3>
          <p class="value-desc">
            神经科学证实的90天周期，<br/>
            每天一个小目标，让改变自然而然发生。
          </p>
        </div>

        <div class="value-card glass-card">
          <div class="value-icon">🤝</div>
          <h3 class="value-title">你不必独自前行</h3>
          <p class="value-desc">
            当冲动来临时，紧急求助功能就在身边。<br/>
            还有专属客服，为你提供支持。
          </p>
        </div>
      </div>

      <!-- 功能列表 -->
      <div class="features-section">
        <h2 class="section-title">你将获得</h2>
        <div class="feature-list">
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <span class="feature-text">90天科学戒色计划</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <span class="feature-text">每日心理引导</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <span class="feature-text">进度日历追踪</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <span class="feature-text">日记记录系统</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <span class="feature-text">紧急求助功能</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <span class="feature-text">专属客服支持</span>
          </div>
        </div>
      </div>

      <!-- 价格部分 -->
      <div class="price-section">
        <div class="price-card glass-card">
          <div class="price-badge">☕ 一杯咖啡的钱</div>

          <div class="price-breakdown">
            <div class="price-row">
              <span class="price-label">原价</span>
              <span class="price-value original">¥{{ originalPrice }}</span>
            </div>
            <div v-if="discountAmount > 0" class="price-row discount">
              <span class="price-label">邀请码优惠</span>
              <span class="price-value discount-amount">-¥{{ discountAmount }}</span>
            </div>
            <div class="price-row final">
              <span class="price-label">实付金额</span>
              <span class="price-value final-amount">¥{{ finalPrice }}</span>
            </div>
          </div>

          <p class="price-note">一次付费，永久使用</p>

          <!-- 支付方式 - 仅支付宝 -->
          <div class="payment-methods">
            <div
              class="payment-method active"
            >
              <span class="method-icon">💳</span>
              <span class="method-name">支付宝</span>
              <span class="check-icon">✓</span>
            </div>
          </div>

          <div class="contact-section">
            <div class="contact-header">
              <span class="contact-icon">📱</span>
              <span class="contact-title">支付手机号</span>
            </div>

            <input
              v-model="phone"
              class="contact-input"
              type="tel"
              placeholder="请输入登录手机号"
              maxlength="11"
            />
            <p class="contact-hint">支付后请使用同一手机号登录，便于绑定订单与邀请关系</p>
          </div>

          <!-- 支付按钮 -->
          <button
            class="pay-button glass-button"
            :disabled="isProcessing"
            @click="handlePayment"
          >
            {{ isProcessing ? '处理中...' : `立即支付 ¥${finalPrice}` }}
          </button>

          <!-- 邀请码区域 -->
          <div class="invite-section">
            <div class="invite-header">
              <span class="invite-icon">🎁</span>
              <span class="invite-title">新用户礼包</span>
            </div>
            
            <div class="invite-input-wrapper">
              <input
                v-model="inviteCode"
                class="invite-input"
                placeholder="请输入邀请码（选填）"
                :disabled="isInviteCodeUsed"
                maxlength="20"
              />
              <button 
                class="invite-btn"
                :class="{ used: isInviteCodeUsed }"
                :disabled="!canValidate"
                @click="handleValidateInvite"
              >
                {{ validateBtnText }}
              </button>
            </div>
            
            <p v-if="inviteCodeError" class="invite-error">{{ inviteCodeError }}</p>
            <p v-if="isInviteCodeUsed" class="invite-success">✓ 邀请码已生效，立减 2 元</p>
            <p class="invite-hint">仅限首次付费的新用户使用，每个账号仅可使用 1 次邀请码优惠</p>
          </div>

          <p class="payment-notice">
            支付即表示同意
            <button type="button" class="link-text legal-link" @click="openLegalPage('terms')">《用户协议》</button>
            和
            <button type="button" class="link-text legal-link" @click="openLegalPage('privacy')">《隐私政策》</button>
          </p>

          <!-- 临时跳过按钮，部署前删除 -->
          <button class="dev-skip-btn" @click="devSkip">跳过支付</button>
        </div>
      </div>
    </div>

    <!-- 支付结果弹窗 -->
    <div v-if="showResultModal" class="modal-overlay">
      <div class="result-modal glass-card">
        <div v-if="paymentSuccess" class="success-content">
          <span class="success-icon">🎉</span>
          <h2 class="result-title">支付成功</h2>
          <p class="result-message">欢迎加入布鲁计划！</p>
          <button class="confirm-button glass-button" @click="goToLogin">
            开始使用
          </button>
        </div>
        <div v-else-if="paymentPending" class="pending-content">
          <span class="pending-icon">⏳</span>
          <h2 class="result-title">支付确认中</h2>
          <p class="result-message">{{ errorMessage }}</p>
          <button class="confirm-button glass-button" @click="showResultModal = false">
            我知道了
          </button>
        </div>
        <div v-else class="failed-content">
          <span class="failed-icon">😞</span>
          <h2 class="result-title">支付失败</h2>
          <p class="result-message">{{ errorMessage }}</p>
          <button class="confirm-button glass-button" @click="showResultModal = false">
            重试
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  bindPendingInviteRelation,
  validateInviteCode as validateInviteCodeApi
} from '../services/api.js'
import { createPaymentOrder } from '../services/payment.js'
import {
  getPaymentDraft,
  isLoggedIn,
  markAsPaid,
  savePaymentDraft,
  setPendingOrderId
} from '../utils/storage.js'

const router = useRouter()

const openLegalPage = (type) => {
  router.push({
    path: type === 'privacy' ? '/legal/privacy' : '/legal/terms',
    query: {
      from: 'payment'
    }
  })
}

const initialPaymentDraft = getPaymentDraft()

// 状态变量
const selectedMethod = ref(initialPaymentDraft.channel || 'alipay')
const isProcessing = ref(false)
const showResultModal = ref(false)
const paymentSuccess = ref(false)
const paymentPending = ref(false)
const errorMessage = ref('')
const phone = ref(initialPaymentDraft.phone || '')

// ========== 价格与邀请码 ==========
const ORIGINAL_PRICE = 12.9

const originalPrice = ref(ORIGINAL_PRICE)
const discountAmount = ref(initialPaymentDraft.discountAmount || 0)
const inviteCode = ref(initialPaymentDraft.inviteCode || '')
const inviteCodeError = ref('')
const isInviteCodeUsed = ref(!!initialPaymentDraft.isInviteUsed)
const isValidating = ref(false)

// ========== 计算属性 ==========
const finalPrice = computed(() => {
  return (originalPrice.value - discountAmount.value).toFixed(1)
})

const payAmountFen = computed(() => {
  return isInviteCodeUsed.value ? 1090 : 1290
})

const isPhoneValid = computed(() => {
  return /^1[3-9]\d{9}$/.test(phone.value.trim())
})

const canValidate = computed(() => {
  return inviteCode.value.trim().length >= 4 && !isValidating.value && !isInviteCodeUsed.value
})

const validateBtnText = computed(() => {
  if (isInviteCodeUsed.value) return '已生效'
  if (isValidating.value) return '验证中...'
  return '验证'
})

const buildPaymentDraftPayload = (status = 'draft', extra = {}) => {
  return {
    phone: phone.value.trim(),
    inviteCode: inviteCode.value.trim(),
    discountAmount: discountAmount.value,
    finalPayAmount: payAmountFen.value,
    isInviteUsed: isInviteCodeUsed.value,
    channel: selectedMethod.value,
    status,
    ...extra
  }
}

// 临时跳过支付（部署前删除）
const devSkip = async () => {
  const finalOrderId = `dev_skip_${Date.now()}`
  const paidDraft = savePaymentDraft(buildPaymentDraftPayload('paid', { orderId: finalOrderId }))

  markAsPaid({
    ...paidDraft,
    orderId: finalOrderId,
    syncedWithServer: false
  })

  setPendingOrderId(finalOrderId)

  if (isLoggedIn()) {
    await bindPendingInviteRelation(finalOrderId)
    router.push('/home')
    return
  }

  router.push('/login')
}

// 验证邀请码
const handleValidateInvite = async () => {
  if (!canValidate.value) return

  isValidating.value = true
  inviteCodeError.value = ''

  try {
    const result = await validateInviteCodeApi(inviteCode.value.trim())

    if (result.success && result.data.valid) {
      const discountYuan = typeof result.data.discountAmountYuan === 'number'
        ? result.data.discountAmountYuan
        : (result.data.discountAmountFen || result.data.discountAmount || 0) / 100

      discountAmount.value = discountYuan
      isInviteCodeUsed.value = true
      inviteCode.value = result.data.inviteCode || inviteCode.value.trim()
      savePaymentDraft(buildPaymentDraftPayload('invite_validated'))
    } else {
      discountAmount.value = 0
      isInviteCodeUsed.value = false
      inviteCodeError.value = result.error?.message || '邀请码无效'
      savePaymentDraft(buildPaymentDraftPayload())
    }
  } catch (error) {
    console.error('[Payment] 验证邀请码失败:', error)
    inviteCodeError.value = '验证失败，请重试'
    savePaymentDraft(buildPaymentDraftPayload())
  }

  isValidating.value = false
}

// 处理支付
const handlePayment = async () => {
  if (isProcessing.value) return

  if (!isPhoneValid.value) {
    handlePaymentFailure('请输入正确的手机号', 'draft')
    return
  }

  isProcessing.value = true

  try {
    savePaymentDraft(buildPaymentDraftPayload('creating'))

    const result = await createPaymentOrder(selectedMethod.value, {
      phone: phone.value.trim(),
      inviteCode: isInviteCodeUsed.value ? inviteCode.value.trim() : '',
      productType: 'entry_access',
      amount: payAmountFen.value
    })

    if (result.cancelled) {
      handlePaymentFailure('用户取消支付', 'cancelled')
    } else if (result.success && (result.paymentSuccess || result.demo)) {
      handlePaymentSuccess(result.orderId)
    } else if (result.pendingConfirmation) {
      handlePaymentPending(result.orderId, result.message || '支付结果确认中，请稍后重试')
    } else {
      handlePaymentFailure(result.error || result.message || '创建订单失败')
    }
  } catch (error) {
    console.error('[Payment] 支付错误:', error)
    handlePaymentFailure('支付出错，请重试')
  } finally {
    isProcessing.value = false
  }
}

// 支付成功处理
const handlePaymentSuccess = async (orderId) => {
  const finalOrderId = orderId || 'order_' + Date.now()
  const paidDraft = savePaymentDraft(buildPaymentDraftPayload('paid', { orderId: finalOrderId }))

  markAsPaid({
    ...paidDraft,
    orderId: finalOrderId,
    syncedWithServer: false
  })

  setPendingOrderId(finalOrderId)

  const bindResult = await bindPendingInviteRelation(finalOrderId)
  if (!bindResult.success && !bindResult.skipped) {
    console.warn('[Payment] 支付后邀请关系绑定未完成:', bindResult.error?.message || '未知原因')
  }

  paymentPending.value = false
  paymentSuccess.value = true
  showResultModal.value = true
}

const handlePaymentPending = (orderId, message) => {
  const finalOrderId = orderId || 'order_' + Date.now()
  savePaymentDraft(buildPaymentDraftPayload('processing', { orderId: finalOrderId }))
  setPendingOrderId(finalOrderId)

  errorMessage.value = message
  paymentSuccess.value = false
  paymentPending.value = true
  showResultModal.value = true
}

// 支付失败处理
const handlePaymentFailure = (error, status = 'failed') => {
  savePaymentDraft(buildPaymentDraftPayload(status, {
    lastError: error,
    lastFailedAt: new Date().toISOString()
  }))

  errorMessage.value = error
  paymentSuccess.value = false
  paymentPending.value = false
  showResultModal.value = true
}

// 跳转登录
const goToLogin = () => {
  router.replace(isLoggedIn() ? '/home' : '/login')
}
</script>

<style scoped>
.payment-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow-x: hidden;
  padding-bottom: 40px;
}

.content {
  position: relative;
  z-index: 1;
  padding: 50px 20px 20px;
}

.header-section {
  text-align: center;
  margin-bottom: 28px;
}

.title {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6, #EC4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 15px;
  color: #94A3B8;
}

/* 价值主张 */
.value-section {
  margin-bottom: 24px;
}

.value-card {
  padding: 20px;
  margin-bottom: 12px;
  text-align: center;
}

.value-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.value-title {
  font-size: 17px;
  font-weight: 600;
  color: #F8FAFC;
  margin-bottom: 8px;
}

.value-desc {
  font-size: 14px;
  color: #94A3B8;
  line-height: 1.6;
}

/* 功能列表 */
.features-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #F8FAFC;
  margin-bottom: 16px;
  text-align: center;
}

.feature-list {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 8px 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.feature-item:last-child {
  border-bottom: none;
}

.feature-icon {
  color: #10B981;
  margin-right: 12px;
  font-size: 14px;
}

.feature-text {
  font-size: 14px;
  color: #E2E8F0;
}

/* 价格部分 */
.price-section {
  margin-top: 20px;
}

.price-card {
  padding: 24px 20px;
  text-align: center;
}

.price-badge {
  display: inline-block;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3B82F6;
  font-size: 14px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 20px;
  margin-bottom: 16px;
}

.price-note {
  font-size: 13px;
  color: #64748B;
  display: block;
  margin-top: 4px;
}

.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.contact-section {
  margin-bottom: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.contact-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.contact-icon {
  font-size: 18px;
}

.contact-title {
  font-size: 14px;
  font-weight: 600;
  color: #F8FAFC;
}

.contact-input {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #F8FAFC;
  font-size: 15px;
}

.contact-input::placeholder {
  color: #64748B;
}

.contact-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #64748B;
  line-height: 1.5;
}

.payment-method {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.payment-method.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3B82F6;
}

.method-icon {
  font-size: 20px;
  margin-right: 12px;
}

.method-name {
  flex: 1;
  font-size: 15px;
  color: #F8FAFC;
  font-weight: 500;
}

.check-icon {
  color: #3B82F6;
  font-size: 16px;
  font-weight: 700;
}

.pay-button {
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.payment-notice {
  font-size: 12px;
  color: #64748B;
}

.link-text {
  color: #3B82F6;
}

.legal-link {
  padding: 0;
  background: transparent;
  border: none;
  font-size: inherit;
}

/* 弹窗样式 */
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

.result-modal {
  width: 100%;
  padding: 36px 24px;
  text-align: center;
}

.success-icon,
.failed-icon {
  font-size: 56px;
  display: block;
  margin-bottom: 16px;
}

.result-title {
  font-size: 22px;
  font-weight: 700;
  color: #F8FAFC;
  margin-bottom: 10px;
}

.result-message {
  font-size: 15px;
  color: #94A3B8;
  margin-bottom: 24px;
}

.confirm-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
}

/* 价格明细 */
.price-breakdown {
  margin: 16px 0;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.price-row.discount {
  color: #10B981;
}

.price-row.final {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.price-label {
  font-size: 14px;
  color: #94A3B8;
}

.price-value {
  font-size: 15px;
  color: #E2E8F0;
}

.price-value.original {
  text-decoration: line-through;
  color: #64748B;
}

.price-value.discount-amount {
  color: #10B981;
}

.price-value.final-amount {
  font-size: 20px;
  font-weight: 700;
  color: #3B82F6;
}

/* 邀请码区域 */
.invite-section {
  margin-top: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.invite-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.invite-icon {
  font-size: 20px;
}

.invite-title {
  font-size: 15px;
  font-weight: 600;
  color: #F8FAFC;
}

.invite-input-wrapper {
  display: flex;
  gap: 12px;
}

.invite-input {
  flex: 1;
  height: 44px;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #F8FAFC;
  font-size: 15px;
}

.invite-input::placeholder {
  color: #64748B;
}

.invite-input:disabled {
  opacity: 0.6;
}

.invite-btn {
  min-width: 72px;
  height: 44px;
  padding: 0 20px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: opacity 0.2s;
}

.invite-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.invite-btn.used {
  background: #10B981;
}

.invite-error {
  margin-top: 10px;
  font-size: 13px;
  color: #EF4444;
}

.invite-success {
  margin-top: 10px;
  font-size: 13px;
  color: #10B981;
}

.invite-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #64748B;
}

.dev-skip-btn {
  width: 100%;
  margin-top: 20px;
  padding: 12px;
  background: rgba(245, 158, 11, 0.2);
  border: 1px dashed #F59E0B;
  border-radius: 10px;
  color: #F59E0B;
  font-size: 14px;
  cursor: pointer;
}
</style>
