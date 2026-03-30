<template>
  <div class="survey-page">
    <!-- 动态背景 -->
    <div class="liquid-bg"></div>
    <div class="liquid-orb liquid-orb-1"></div>
    <div class="liquid-orb liquid-orb-2"></div>

    <!-- 问卷内容容器 - 限制宽度为设计稿尺寸 -->
    <div class="survey-content">
      <!-- 顶部进度 -->
      <div class="progress-header">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressWidth + '%' }"></div>
        </div>
        <span class="progress-text">{{ currentIndex + 1 }} / {{ questions.length }}</span>
      </div>

      <!-- 问卷内容 -->
      <div class="question-container">
        <div class="question-card glass-card">
          <span class="question-number">问题 {{ currentIndex + 1 }}</span>
          <h2 class="question-text">{{ currentQuestion.text }}</h2>

          <!-- 选项列表 -->
          <div class="options-list">
            <div
              v-for="(option, idx) in currentQuestion.options"
              :key="idx"
              class="option-item"
              :class="{ selected: answers[currentIndex] === option.score }"
              @click="selectOption(option.score)"
            >
              <div class="option-indicator">
                <div v-if="answers[currentIndex] === option.score" class="option-checked"></div>
              </div>
              <span class="option-text">{{ option.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="action-bar">
        <button
          v-if="currentIndex > 0"
          class="nav-button prev-button"
          @click="prevQuestion"
        >
          上一题
        </button>
        <button
          class="nav-button next-button glass-button"
          :disabled="answers[currentIndex] === null"
          @click="nextQuestion"
        >
          {{ currentIndex === questions.length - 1 ? '查看结果' : '下一题' }}
        </button>
      </div>
    </div>

    <!-- 结果弹窗 -->
    <div v-if="showResult" class="result-overlay">
      <div class="result-modal glass-card">
        <h2 class="result-title">评估结果</h2>

        <!-- 依赖程度评分 -->
        <div class="score-section">
          <div class="score-circle">
            <span class="score-value gradient-text">{{ dependencyScore }}</span>
            <span class="score-label">依赖程度</span>
          </div>
          <div class="score-level">
            <span class="level-text">{{ getScoreLevel() }}</span>
            <span class="level-desc">{{ getScoreDescription() }}</span>
          </div>
        </div>

        <!-- 建议 -->
        <div class="suggestion-section">
          <h3 class="suggestion-title">个性化建议</h3>
          <p class="suggestion-text">{{ suggestion }}</p>
        </div>

        <!-- 按钮 -->
        <button class="result-button glass-button" @click="goToProductIntro">
          查看产品介绍
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { submitSurveyAssessment } from '../services/api'
import { setSurveyResultCache } from '../utils/storage'

const router = useRouter()

// 问卷问题
const questions = ref([
  {
    text: '你多久会遇到一次强烈的冲动？',
    options: [
      { text: '很少，几乎没有', score: 1 },
      { text: '偶尔，每周1-2次', score: 2 },
      { text: '经常，每周3-5次', score: 3 },
      { text: '很频繁，每天都有', score: 4 },
      { text: '极度频繁，一天多次', score: 5 }
    ]
  },
  {
    text: '当冲动来临时，你通常能控制自己吗？',
    options: [
      { text: '完全能控制', score: 1 },
      { text: '大部分时候能', score: 2 },
      { text: '有时能，有时不能', score: 3 },
      { text: '很少能控制', score: 4 },
      { text: '完全无法控制', score: 5 }
    ]
  },
  {
    text: '你平均多久会破戒一次？',
    options: [
      { text: '从未破戒', score: 1 },
      { text: '每月不到1次', score: 2 },
      { text: '每月1-3次', score: 3 },
      { text: '每周1-3次', score: 4 },
      { text: '几乎每天', score: 5 }
    ]
  },
  {
    text: '破戒后你通常有什么感受？',
    options: [
      { text: '轻微自责，能很快调整', score: 1 },
      { text: '有些后悔和沮丧', score: 2 },
      { text: '强烈的自责和愧疚', score: 3 },
      { text: '极度的自我厌恶', score: 4 },
      { text: '麻木，无所谓', score: 5 }
    ]
  },
  {
    text: '这个问题对你的生活影响有多大？',
    options: [
      { text: '几乎没有影响', score: 1 },
      { text: '轻微影响', score: 2 },
      { text: '中等影响', score: 3 },
      { text: '严重影响', score: 4 },
      { text: '完全失控', score: 5 }
    ]
  },
  {
    text: '你尝试过戒色吗？',
    options: [
      { text: '从未想过', score: 1 },
      { text: '想过但没行动', score: 2 },
      { text: '尝试过但失败了', score: 3 },
      { text: '多次尝试，有成功有失败', score: 4 },
      { text: '一直在努力戒色', score: 5 }
    ]
  },
  {
    text: '你破戒的主要诱因是什么？',
    options: [
      { text: '压力和情绪', score: 3 },
      { text: '无聊和孤独', score: 3 },
      { text: '接触了相关内容', score: 4 },
      { text: '没有特定诱因', score: 2 },
      { text: '习惯性行为', score: 5 }
    ]
  },
  {
    text: '你的社交生活受影响了吗？',
    options: [
      { text: '完全没有', score: 1 },
      { text: '轻微影响', score: 2 },
      { text: '中等影响', score: 3 },
      { text: '很大影响', score: 4 },
      { text: '完全封闭自己', score: 5 }
    ]
  },
  {
    text: '你的工作/学习效率受影响了吗？',
    options: [
      { text: '完全没有', score: 1 },
      { text: '轻微影响', score: 2 },
      { text: '中等影响', score: 3 },
      { text: '很大影响', score: 4 },
      { text: '完全无法正常工作学习', score: 5 }
    ]
  },
  {
    text: '你对戒色有多大决心？',
    options: [
      { text: '非常坚定', score: 1 },
      { text: '比较坚定', score: 2 },
      { text: '一般', score: 3 },
      { text: '有些动摇', score: 4 },
      { text: '不确定', score: 5 }
    ]
  }
])

// 状态变量
const currentIndex = ref(0)
const answers = ref(new Array(questions.value.length).fill(null))
const showResult = ref(false)
const dependencyScore = ref(0)
const surveyId = ref('')

// 计算属性
const progressWidth = computed(() => {
  return ((currentIndex.value + 1) / questions.value.length) * 100
})

const currentQuestion = computed(() => {
  return questions.value[currentIndex.value]
})

// 选择选项
const selectOption = (score) => {
  answers.value[currentIndex.value] = score
}

// 下一题
const nextQuestion = async () => {
  if (currentIndex.value === questions.value.length - 1) {
    await calculateResult()
  } else {
    currentIndex.value++
  }
}

// 上一题
const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

// 计算结果
const calculateResult = async () => {
  let totalScore = 0
  let answeredCount = 0

  answers.value.forEach(score => {
    if (score !== null) {
      totalScore += score
      answeredCount++
    }
  })

  // 转换为0-100分
  const maxScore = answeredCount * 5
  dependencyScore.value = Math.round((totalScore / maxScore) * 100)

  const resultPayload = {
    score: dependencyScore.value,
    answers: answers.value,
    timestamp: Date.now(),
    completed: true
  }

  try {
    const result = await submitSurveyAssessment({
      score: resultPayload.score,
      answers: resultPayload.answers
    })
    if (result.success && result.data?.surveyId) {
      surveyId.value = result.data.surveyId
      resultPayload.surveyId = result.data.surveyId
    }
  } catch (error) {
    console.error('[Survey] 提交问卷结果失败:', error)
  }

  setSurveyResultCache(resultPayload)

  showResult.value = true
}

// 获取评分等级
const getScoreLevel = () => {
  const score = dependencyScore.value
  if (score < 20) return '轻度依赖'
  if (score < 40) return '轻度依赖'
  if (score < 60) return '中度依赖'
  if (score < 80) return '高度依赖'
  return '重度依赖'
}

// 获取评分描述
const getScoreDescription = () => {
  const score = dependencyScore.value
  if (score < 20) return '你的状态很好，只需要保持即可'
  if (score < 40) return '你有轻微的依赖倾向，建议开始90天计划'
  if (score < 60) return '你处于中度依赖状态，需要认真对待'
  if (score < 80) return '你的依赖程度较高，需要系统性的帮助'
  return '你的情况比较严重，建议寻求专业帮助'
}

// 建议
const suggestion = computed(() => {
  const score = dependencyScore.value
  if (score < 20) {
    return '你的状态非常好！建议从30天计划开始，保持当前良好的生活习惯，坚持每日冥想和运动。如果出现特殊情况，可以使用紧急求助功能。'
  }
  if (score < 40) {
    return '你有一定的依赖倾向，建议从60天计划开始。每天完成计划任务，保持积极的生活态度。如果遇到困难，记得使用紧急求助按钮。'
  }
  if (score < 70) {
    return '你的依赖程度中等，建议从90天计划开始。神经科学的恢复需要时间，请保持耐心。每天完成计划任务，必要时使用紧急求助功能。'
  }
  return '你的情况需要认真对待。建议从90天计划开始，并考虑寻求专业帮助。记住，你不是一个人，我们一起努力。每日坚持使用紧急求助功能，它会在关键时刻帮助你。'
})

// 前往产品介绍页
const goToProductIntro = () => {
  router.push({
    path: '/product-intro',
    query: surveyId.value ? { surveyId: surveyId.value } : {}
  })
}


</script>

<style scoped>
.survey-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow: hidden;
  /* 关键：添加 flex 布局确保子元素居中生效 */
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 内容容器 - 限制宽度为设计稿尺寸 360px，居中显示 */
.survey-content {
  width: 100%;
  max-width: 360px;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  padding: 0 16px;
  box-sizing: border-box;
}

/* 顶部进度条 - 限制最大宽度 */
.progress-header {
  width: 100%;
  max-width: 360px;
  padding: 80px 0 20px;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #8B5CF6);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #94A3B8;
}

/* 问题容器 */
.question-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  width: 100%;
  max-width: 360px;
}

/* 问题卡片 - 固定宽度确保一致性 */
.question-card {
  width: 100%;
  min-width: 320px;
  max-width: 360px;
  padding: 24px;
  box-sizing: border-box;
}

.question-number {
  font-size: 14px;
  color: #8B5CF6;
  font-weight: 600;
  margin-bottom: 10px;
  display: block;
}

.question-text {
  font-size: 18px;
  font-weight: 600;
  color: #F8FAFC;
  line-height: 1.5;
  margin-bottom: 20px;
  /* 固定宽度，防止随文字长度变化 */
  width: 100%;
  min-height: 54px;
}

/* 选项列表 */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 14px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.option-item.selected {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3B82F6;
}

.option-item:active {
  transform: scale(0.98);
}

.option-indicator {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.option-checked {
  width: 12px;
  height: 12px;
  background: #3B82F6;
  border-radius: 50%;
}

.option-text {
  font-size: 14px;
  color: #F8FAFC;
  flex: 1;
  line-height: 1.4;
}

/* 底部按钮栏 - 限制宽度 */
.action-bar {
  width: 100%;
  max-width: 360px;
  padding: 20px 0 calc(32px + env(safe-area-inset-bottom));
  display: flex;
  gap: 12px;
  box-sizing: border-box;
}

.nav-button {
  flex: 1;
  height: 52px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #F8FAFC;
  cursor: pointer;
}

.nav-button.next-button {
  background: linear-gradient(135deg, #3B82F6, #6366F1);
  border: none;
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 结果弹窗 */
.result-overlay {
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
  max-width: 360px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px;
  box-sizing: border-box;
}

.result-title {
  font-size: 24px;
  font-weight: 700;
  color: #F8FAFC;
  display: block;
  text-align: center;
  margin-bottom: 24px;
}

.score-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

.score-circle {
  width: 110px;
  height: 110px;
  background: rgba(59, 130, 246, 0.1);
  border: 3px solid #3B82F6;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.score-value {
  font-size: 36px;
  font-weight: 700;
}

.score-label {
  font-size: 13px;
  color: #94A3B8;
}

.score-level {
  text-align: center;
}

.level-text {
  font-size: 18px;
  font-weight: 600;
  color: #F8FAFC;
  display: block;
  margin-bottom: 4px;
}

.level-desc {
  font-size: 14px;
  color: #94A3B8;
}

.suggestion-section {
  margin-bottom: 24px;
}

.suggestion-title {
  font-size: 16px;
  font-weight: 600;
  color: #F8FAFC;
  display: block;
  margin-bottom: 10px;
}

.suggestion-text {
  font-size: 14px;
  color: #94A3B8;
  line-height: 1.8;
}

.result-button {
  width: 100%;
  height: 52px;
  font-size: 17px;
}
</style>
