<template>
  <div class="product-page">
    <div class="liquid-bg"></div>
    <div class="liquid-orb liquid-orb-1"></div>
    <div class="liquid-orb liquid-orb-2"></div>
    <div class="liquid-orb liquid-orb-3"></div>

    <!-- Header -->
    <div class="product-header">
      <h1 class="product-title">布鲁计划</h1>
      <p class="product-subtitle">科学戒色，重获新生</p>
    </div>

    <!-- Assessment Result Summary -->
    <div class="result-summary glass-card">
      <div class="summary-badge">
        <span class="badge-icon">AI</span>
        <div class="badge-info">
          <span class="badge-label">您的评估结果</span>
          <span class="badge-score">依赖程度 {{ surveyScore }}分</span>
        </div>
      </div>
    </div>

    <!-- Product Features -->
    <div class="features-section">
      <h2 class="section-title">核心功能</h2>

      <div class="feature-card glass-card">
        <div class="feature-icon">D</div>
        <div class="feature-content">
          <h3 class="feature-title">每日打卡追踪</h3>
          <p class="feature-desc">精确记录戒色天数，实时显示坚持时长，科学的里程碑体系激励你不断前行</p>
        </div>
      </div>

      <div class="feature-card glass-card">
        <div class="feature-icon">P</div>
        <div class="feature-content">
          <h3 class="feature-title">90天神经科学计划</h3>
          <p class="feature-desc">基于神经科学原理设计的90天恢复方案，每天都有具体的任务和目标</p>
        </div>
      </div>

      <div class="feature-card glass-card">
        <div class="feature-icon">E</div>
        <div class="feature-content">
          <h3 class="feature-title">紧急求助功能</h3>
          <p class="feature-desc">一键触发紧急求助，摄像头提醒、屏幕闪烁、强力震动，帮助你度过冲动高峰期</p>
        </div>
      </div>

      <div class="feature-card glass-card">
        <div class="feature-icon">J</div>
        <div class="feature-content">
          <h3 class="feature-title">日记与反思</h3>
          <p class="feature-desc">记录每天的心路历程，反思进步与挫折，培养积极的生活习惯</p>
        </div>
      </div>

      <div class="feature-card glass-card">
        <div class="feature-icon">S</div>
        <div class="feature-content">
          <h3 class="feature-title">详细数据统计</h3>
          <p class="feature-desc">全方位的数据分析，了解自己的进步曲线，保持动力和信心</p>
        </div>
      </div>
    </div>

    <!-- Why Choose Us -->
    <div class="why-section">
      <h2 class="section-title">为什么选择我们</h2>

      <div class="why-item">
        <span class="why-number">01</span>
        <div class="why-content">
          <h3>科学方法</h3>
          <p>基于神经科学研究，结合认知行为疗法</p>
        </div>
      </div>

      <div class="why-item">
        <span class="why-number">02</span>
        <div class="why-content">
          <h3>隐私保护</h3>
          <p>核心数据统一持久化，兼顾隐私保护与多端一致性</p>
        </div>
      </div>

      <div class="why-item">
        <span class="why-number">03</span>
        <div class="why-content">
          <h3>永久免费</h3>
          <p>一次付费，永久使用，无任何隐形消费</p>
        </div>
      </div>
    </div>

    <!-- Bottom Action -->
    <div class="bottom-action">
      <div class="action-hint">
        花12.9元，开启你的戒色之旅
      </div>
      <button class="join-button glass-button" @click="goToPayment">
        立即加入计划
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSurveyAssessment, syncAuthenticatedSession } from '../services/api'
import { isLoggedIn, useAppCacheState } from '../utils/storage'

const router = useRouter()
const route = useRoute()
const surveyScore = ref(0)
const { surveyResult } = useAppCacheState()
const cachedSurveyScore = computed(() => surveyResult.value?.score || 0)

onMounted(async () => {
  const surveyId = route.query.surveyId

  if (cachedSurveyScore.value) {
    surveyScore.value = cachedSurveyScore.value
  }

  if (surveyId) {
    try {
      const result = await getSurveyAssessment(surveyId)
      if (result.success && result.data) {
        surveyScore.value = result.data.score || 0
        return
      }
    } catch (error) {
      console.error('[ProductIntro] 获取问卷结果失败:', error)
    }
  }

  if (!cachedSurveyScore.value && isLoggedIn()) {
    try {
      await syncAuthenticatedSession({ includeBootstrap: false })
      if (cachedSurveyScore.value) {
        surveyScore.value = cachedSurveyScore.value
      }
    } catch (error) {
      console.error('[ProductIntro] 同步登录态问卷结果失败:', error)
    }
  }
})

// 跳转到支付页面
const goToPayment = () => {
  router.push('/payment')
}


</script>

<style scoped>
.product-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow-x: hidden;
  padding: 60px 20px 120px;
}

.product-header {
  text-align: center;
  margin-bottom: 32px;
}

.product-title {
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6, #EC4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.product-subtitle {
  font-size: 16px;
  color: #94A3B8;
}

.result-summary {
  padding: 16px 20px;
  margin-bottom: 32px;
}

.summary-badge {
  display: flex;
  align-items: center;
  gap: 12px;
}

.badge-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: white;
}

.badge-info {
  display: flex;
  flex-direction: column;
}

.badge-label {
  font-size: 12px;
  color: #94A3B8;
}

.badge-score {
  font-size: 16px;
  font-weight: 600;
  color: #F8FAFC;
}

.features-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #F8FAFC;
  margin-bottom: 20px;
  padding-left: 4px;
}

.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.feature-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #8B5CF6;
  flex-shrink: 0;
}

.feature-content {
  flex: 1;
}

.feature-title {
  font-size: 16px;
  font-weight: 600;
  color: #F8FAFC;
  margin-bottom: 6px;
}

.feature-desc {
  font-size: 14px;
  color: #94A3B8;
  line-height: 1.6;
}

.why-section {
  margin-bottom: 40px;
}

.why-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.why-number {
  font-size: 24px;
  font-weight: 700;
  color: #8B5CF6;
  opacity: 0.6;
}

.why-content h3 {
  font-size: 15px;
  font-weight: 600;
  color: #F8FAFC;
  margin-bottom: 4px;
}

.why-content p {
  font-size: 13px;
  color: #94A3B8;
}

.bottom-action {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  padding: 20px 24px calc(20px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(0, 0, 0, 0.95) 60%, transparent);
  z-index: 50;
}

.action-hint {
  text-align: center;
  font-size: 14px;
  color: #94A3B8;
  margin-bottom: 12px;
}

.join-button {
  width: 100%;
  height: 54px;
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  border: none;
  border-radius: 16px;
}
</style>
