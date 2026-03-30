<template>
  <div class="panic-page" :class="{ 'flash-mode': flashMode, 'camera-mode': cameraMode }">
    <!-- 正常模式背景 -->
    <div v-if="!cameraMode" class="liquid-bg"></div>
    <div v-if="!cameraMode" class="liquid-orb liquid-orb-1"></div>
    <div v-if="!cameraMode" class="liquid-orb liquid-orb-2"></div>

    <!-- 闪烁模式 -->
    <div v-if="flashMode" class="flash-overlay">
      <div class="timer-display">
        <span class="timer-text">{{ flashCountdown }}秒</span>
      </div>
    </div>

    <!-- 关闭按钮 -->
    <div class="close-btn" @click="closePanic">
      <span>✕</span>
    </div>

    <!-- 主内容区 -->
    <div v-if="!cameraMode" class="content">
      <h1 class="panic-title">紧急求助</h1>
      <p class="panic-subtitle">选择一种干预方式帮助你度过这个时刻</p>

      <!-- 干预选项 -->
      <div class="intervention-options">
        <!-- 视觉冲击模式 -->
        <div class="option-card glass-card" @click="triggerFlash">
          <span class="option-icon">⚡</span>
          <span class="option-title">视觉冲击</span>
          <span class="option-desc">屏幕快速闪烁，打断冲动思维</span>
        </div>

        <!-- 目标提醒模式 -->
        <div class="option-card glass-card" @click="showGoals">
          <span class="option-icon">🎯</span>
          <span class="option-title">目标提醒</span>
          <span class="option-desc">查看你戒色的初心和目标</span>
        </div>

        <!-- 震动模式 -->
        <div class="option-card glass-card" @click="triggerVibrate">
          <span class="option-icon">📳</span>
          <span class="option-title">强力震动</span>
          <span class="option-desc">手机持续震动，打断冲动</span>
        </div>

        <!-- 放松呼吸 -->
        <div class="option-card glass-card" @click="startBreathing">
          <span class="option-icon">🌬️</span>
          <span class="option-title">放松呼吸</span>
          <span class="option-desc">跟着节奏做深呼吸</span>
        </div>

        <!-- 断欲口诀 -->
        <div class="option-card glass-card" @click="startMantra">
          <span class="option-icon">📿</span>
          <span class="option-title">断欲口诀</span>
          <span class="option-desc">默念口诀平息欲念</span>
        </div>
      </div>

      <!-- 鼓励话语 -->
      <div class="encourage-section">
        <p class="encourage-text">{{ currentEncourage }}</p>
      </div>
    </div>

    <!-- 摄像头模式内容 (网页版显示提示) -->
    <div v-if="cameraMode" class="camera-content">
      <div class="camera-overlay">
        <span class="camera-prompt">摄像头模式</span>
        <span class="camera-question">你确定要这样做吗？</span>
        <span class="camera-message">{{ cameraMessage }}</span>
        <span class="camera-hint">（网页版暂不支持摄像头，请使用其他方式）</span>
      </div>
    </div>

    <!-- 目标提醒弹窗 -->
    <div v-if="showGoalsModal" class="modal-overlay" @click="closeGoals">
      <div class="goals-modal glass-card" @click.stop>
        <h2 class="goals-title">你的初心</h2>
        <div class="goals-list">
          <div v-for="(goal, idx) in goals" :key="idx" class="goal-item">
            <span class="goal-icon">{{ goal.icon }}</span>
            <span class="goal-text">{{ goal.text }}</span>
          </div>
        </div>
        <button class="close-goals-btn" @click="closeGoals">我记住了</button>
      </div>
    </div>

    <!-- 震动模式 -->
    <div v-if="vibrateMode" class="vibrate-overlay">
      <span class="vibrate-text">深呼吸...</span>
      <span class="vibrate-hint">放松，深呼吸</span>
    </div>

    <!-- 呼吸练习模式 -->
    <div v-if="breathingMode" class="breathing-overlay">
      <div class="breathing-header">
        <span class="breathing-timer">{{ breathingCountdown }}秒</span>
      </div>
      <div class="breathing-content">
        <div class="breathing-circle" :class="{ 'inhale': isInhaling }"></div>
      </div>
      <span class="breathing-text">{{ breathingText }}</span>
    </div>

    <!-- 断欲口诀模式 -->
    <div v-if="mantraMode" class="mantra-overlay">
      <div class="mantra-header">
        <span class="mantra-timer">{{ mantraCountdown }}秒</span>
      </div>
      <div class="mantra-content">
        <div class="mantra-text" :class="{ 'highlight': currentMantraIndex >= 0 }">
          {{ mantras[currentMantraIndex] }}
        </div>
      </div>
      <div class="mantra-progress">
        <span class="mantra-count">{{ currentMantraIndex + 1 }} / {{ mantras.length }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 状态变量
const flashMode = ref(false)
const cameraMode = ref(false)
const vibrateMode = ref(false)
const breathingMode = ref(false)
const mantraMode = ref(false)
const showGoalsModal = ref(false)
const cameraMessage = ref('')
const isInhaling = ref(false)
const breathingText = ref('准备...')
const flashCountdown = ref(5)
const breathingCountdown = ref(48)

// 断欲口诀相关
const mantraCountdown = ref(30)
const currentMantraIndex = ref(0)
const mantras = [
  '念起即断',
  '念起不随',
  '念起即觉',
  '觉之既无'
]

let flashTimer = null
let flashCountdownTimer = null
let vibrateTimer = null
let breathingTimer = null
let breathingCountdownTimer = null
let mantraTimer = null
let mantraCountdownTimer = null

// 鼓励话语
const encourages = [
  '你可以的！你是最棒的！',
  '坚持就是胜利！',
  '想想你的目标和梦想！',
  '你比冲动更强大！',
  '这一刻的坚持将成就更好的你！',
  '记住你为什么开始！',
  '相信自己能战胜一切！',
  '你已经在正确的道路上了！'
]

const currentEncourage = ref(encourages[Math.floor(Math.random() * encourages.length)])

// 目标列表
const goals = ref([
  { icon: '💪', text: '重获自信' },
  { icon: '🧠', text: '提升专注力' },
  { icon: '💼', text: '更好的工作学习状态' },
  { icon: '❤️', text: '建立健康的人际关系' },
  { icon: '🌟', text: '成为更好的自己' }
])

// 摄像头消息
const cameraMessages = [
  '这是你想要的生活吗？',
  '想想你的家人和朋友。',
  '你值得拥有更好的人生。',
  '坚持就是胜利！',
  '这一刻的选择决定你的未来。',
  '相信自己能行！'
]

// 关闭紧急求助
const closePanic = () => {
  // 停止所有模式
  if (flashTimer) {
    clearTimeout(flashTimer)
    flashMode.value = false
  }
  if (flashCountdownTimer) {
    clearInterval(flashCountdownTimer)
  }
  if (vibrateTimer) {
    clearTimeout(vibrateTimer)
    vibrateMode.value = false
  }
  if (breathingTimer) {
    clearInterval(breathingTimer)
    breathingMode.value = false
  }
  if (breathingCountdownTimer) {
    clearInterval(breathingCountdownTimer)
  }
  if (mantraTimer) {
    clearInterval(mantraTimer)
    mantraMode.value = false
  }
  if (mantraCountdownTimer) {
    clearInterval(mantraCountdownTimer)
  }

  router.back()
}

// 触发摄像头模式 (网页版显示提示)
const triggerCamera = () => {
  cameraMessage.value = cameraMessages[Math.floor(Math.random() * cameraMessages.length)]
  cameraMode.value = true

  // 开启震动
  if (navigator.vibrate) {
    navigator.vibrate(1000)
  }
}

// 触发闪烁模式
const triggerFlash = () => {
  flashMode.value = true
  flashCountdown.value = 5

  // 开启震动
  if (navigator.vibrate) {
    navigator.vibrate([500, 200, 500, 200, 500])
  }

  // 倒计时
  flashCountdownTimer = setInterval(() => {
    flashCountdown.value--
  }, 1000)

  // 5秒后自动停止
  flashTimer = setTimeout(() => {
    clearInterval(flashCountdownTimer)
    flashMode.value = false
  }, 5000)
}

// 显示目标提醒
const showGoals = () => {
  showGoalsModal.value = true
}

// 关闭目标提醒
const closeGoals = () => {
  showGoalsModal.value = false
}

// 触发震动模式
const triggerVibrate = () => {
  vibrateMode.value = true

  // 使用Web Vibration API
  if (navigator.vibrate) {
    navigator.vibrate(3000)
  }

  // 3秒后停止
  vibrateTimer = setTimeout(() => {
    vibrateMode.value = false
  }, 3000)
}

// 放松呼吸练习
const startBreathing = () => {
  breathingMode.value = true
  breathingCountdown.value = 48

  let cycleCount = 0
  const maxCycles = 6

  // 倒计时
  breathingCountdownTimer = setInterval(() => {
    breathingCountdown.value--
  }, 1000)

  const breathe = () => {
    if (cycleCount >= maxCycles) {
      clearInterval(breathingTimer)
      clearInterval(breathingCountdownTimer)
      breathingMode.value = false
      return
    }

    // 吸气
    isInhaling.value = true
    breathingText.value = '吸气...'

    setTimeout(() => {
      // 呼气
      isInhaling.value = false
      breathingText.value = '呼气...'

      cycleCount++
    }, 4000)
  }

  breathe()
  breathingTimer = setInterval(breathe, 8000)
}

// 开始断欲口诀
const startMantra = () => {
  mantraMode.value = true
  mantraCountdown.value = 30
  currentMantraIndex.value = 0

  // 开启震动
  if (navigator.vibrate) {
    navigator.vibrate(500)
  }

  // 倒计时
  mantraCountdownTimer = setInterval(() => {
    mantraCountdown.value--
  }, 1000)

  // 口诀轮播 - 每2.5秒切换一次
  mantraTimer = setInterval(() => {
    currentMantraIndex.value = (currentMantraIndex.value + 1) % mantras.length

    // 每次切换震动提示
    if (navigator.vibrate) {
      navigator.vibrate(200)
    }
  }, 2500)

  // 30秒后自动停止
  setTimeout(() => {
    clearInterval(mantraTimer)
    clearInterval(mantraCountdownTimer)
    mantraMode.value = false
  }, 30000)
}

// 页面卸载时清理
onUnmounted(() => {
  if (flashTimer) {
    clearTimeout(flashTimer)
  }
  if (flashCountdownTimer) {
    clearInterval(flashCountdownTimer)
  }
  if (vibrateTimer) {
    clearTimeout(vibrateTimer)
  }
  if (breathingTimer) {
    clearInterval(breathingTimer)
  }
  if (breathingCountdownTimer) {
    clearInterval(breathingCountdownTimer)
  }
  if (mantraTimer) {
    clearInterval(mantraTimer)
  }
  if (mantraCountdownTimer) {
    clearInterval(mantraCountdownTimer)
  }
})
</script>

<style lang="scss" scoped>
.panic-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow: hidden;
  transition: background 0.1s ease;
  padding-bottom: 80px;

  &.flash-mode {
    background: #FF0000;
  }

  &.camera-mode {
    background: #000000;
  }
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

.close-btn {
  position: fixed;
  top: 60px;
  right: 24px;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  font-size: 18px;
  color: #F8FAFC;
  cursor: pointer;
}

.content {
  position: relative;
  z-index: 5;
  padding: 100px 24px 24px;
}

.panic-title {
  font-size: 28px;
  font-weight: 700;
  color: #F8FAFC;
  display: block;
  text-align: center;
  margin-bottom: 8px;
}

.panic-subtitle {
  font-size: 14px;
  color: #94A3B8;
  display: block;
  text-align: center;
  margin-bottom: 24px;
}

.intervention-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  cursor: pointer;

  &:active {
    transform: scale(0.98);
  }
}

.option-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.option-title {
  font-size: 16px;
  font-weight: 600;
  color: #F8FAFC;
  margin-bottom: 4px;
}

.option-desc {
  font-size: 13px;
  color: #94A3B8;
}

.encourage-section {
  margin-top: 24px;
  text-align: center;
  padding: 16px;
}

.encourage-text {
  font-size: 16px;
  font-weight: 600;
  color: #F8FAFC;
  line-height: 1.6;
}

.camera-content {
  position: relative;
  z-index: 5;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-overlay {
  text-align: center;
  padding: 24px;
}

.camera-prompt {
  font-size: 24px;
  font-weight: 700;
  color: #F8FAFC;
  display: block;
  margin-bottom: 12px;
}

.camera-question {
  font-size: 18px;
  color: #EF4444;
  display: block;
  margin-bottom: 16px;
}

.camera-message {
  font-size: 16px;
  color: #94A3B8;
  line-height: 1.8;
  display: block;
}

.camera-hint {
  font-size: 12px;
  color: #64748B;
  display: block;
  margin-top: 20px;
}

.flash-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #FF0000;
  z-index: 2;
  animation: flash 0.2s ease-in-out infinite;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 120px;
}

.timer-display {
  background: rgba(0, 0, 0, 0.5);
  padding: 12px 24px;
  border-radius: 12px;
}

.timer-text {
  font-size: 32px;
  font-weight: 700;
  color: #FFFFFF;
}

@keyframes flash {
  0%, 100% { background: #FF0000; }
  50% { background: #000000; }
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
  padding: 24px;
}

.goals-modal {
  width: 100%;
  padding: 24px;
}

.goals-title {
  font-size: 20px;
  font-weight: 700;
  color: #F8FAFC;
  display: block;
  text-align: center;
  margin-bottom: 16px;
}

.goals-list {
  margin-bottom: 16px;
}

.goal-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.goal-icon {
  font-size: 20px;
  margin-right: 10px;
}

.goal-text {
  font-size: 15px;
  color: #F8FAFC;
}

.close-goals-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #3B82F6, #6366F1);
  border: none;
  border-radius: 8px;
  color: #F8FAFC;
  font-size: 16px;
  cursor: pointer;
}

.vibrate-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.vibrate-text {
  font-size: 32px;
  font-weight: 700;
  color: #F8FAFC;
  margin-bottom: 12px;
}

.vibrate-hint {
  font-size: 16px;
  color: #94A3B8;
}

// 呼吸练习样式
.breathing-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 100px;
  z-index: 60;
}

.breathing-header {
  margin-bottom: 40px;
}

.breathing-timer {
  font-size: 28px;
  font-weight: 700;
  color: #F8FAFC;
  background: rgba(59, 130, 246, 0.3);
  padding: 8px 20px;
  border-radius: 12px;
}

.breathing-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.breathing-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  transition: transform 4s ease-in-out;
}

.breathing-circle.inhale {
  transform: scale(1.4);
}

.breathing-text {
  font-size: 24px;
  font-weight: 600;
  color: #F8FAFC;
  margin-top: 30px;
}

// 断欲口诀样式
.mantra-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 100px;
  z-index: 70;
}

.mantra-header {
  margin-bottom: 40px;
}

.mantra-timer {
  font-size: 28px;
  font-weight: 700;
  color: #F8FAFC;
  background: rgba(139, 92, 246, 0.3);
  padding: 8px 20px;
  border-radius: 12px;
}

.mantra-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.mantra-text {
  font-size: 36px;
  font-weight: 700;
  color: #F8FAFC;
  text-align: center;
  padding: 30px 40px;
  background: rgba(139, 92, 246, 0.15);
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  transition: all 0.3s ease;
  animation: mantraGlow 2.5s ease-in-out infinite;
}

.mantra-text.highlight {
  border-color: #8B5CF6;
  box-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
}

@keyframes mantraGlow {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 40px rgba(139, 92, 246, 0.6);
  }
}

.mantra-progress {
  margin-top: 30px;
}

.mantra-count {
  font-size: 16px;
  color: #94A3B8;
}
</style>
