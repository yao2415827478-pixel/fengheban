<template>
  <div class="home-hero">
    <!-- 坚持天数大字展示 -->
    <div class="streak-display">
      <div class="streak-number">
        <span class="number-value">{{ streakDays }}</span>
        <span class="number-label">天</span>
      </div>
      <p class="streak-text">{{ streakTime }}</p>
    </div>

    <!-- 正气值能量环 -->
    <div class="energy-ring-container">
      <svg class="energy-ring" viewBox="0 0 200 200">
        <circle
          class="ring-bg"
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          stroke-width="12"
        />
        <circle
          class="ring-progress"
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="url(#energyGradient)"
          stroke-width="12"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="progressOffset"
          transform="rotate(-90 100 100)"
        />
        <defs>
          <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#22c55e" />
            <stop offset="100%" stop-color="#84cc16" />
          </linearGradient>
        </defs>
      </svg>
      <div class="energy-center">
        <span class="energy-percent">{{ energyPercent }}%</span>
        <span class="energy-label">正气值</span>
      </div>
    </div>

    <!-- 引导文案 -->
    <p class="hero-motto">{{ currentMotto }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  streakDays: {
    type: Number,
    default: 0
  },
  streakHours: {
    type: Number,
    default: 0
  },
  streakMinutes: {
    type: Number,
    default: 0
  },
  energyPercent: {
    type: Number,
    default: 0
  }
})

// 坚持时间文本
const streakTime = computed(() => {
  const { streakHours, streakMinutes } = props
  if (streakHours > 0) {
    return `已坚持 ${streakHours} 小时 ${streakMinutes} 分钟`
  }
  return `已坚持 ${streakMinutes} 分钟`
})

// 能量环计算
const circumference = 2 * Math.PI * 85 // r = 85
const progressOffset = computed(() => {
  const progress = Math.min(100, Math.max(0, props.energyPercent))
  return circumference - (progress / 100) * circumference
})

// 引导文案
const mottos = [
  '今天继续加油',
  '每一步都重要',
  '坚持就是胜利',
  '相信自己',
  '你很棒',
  '比昨天更好'
]
const currentMotto = computed(() => {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % mottos.length
  return mottos[dayIndex]
})
</script>

<style scoped>
.home-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 24px 32px;
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.15) 0%, transparent 100%);
}

/* 坚持天数大字 */
.streak-display {
  text-align: center;
  margin-bottom: 24px;
}

.streak-number {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.number-value {
  font-size: 72px;
  font-weight: 800;
  background: linear-gradient(135deg, #22c55e 0%, #84cc16 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.number-label {
  font-size: 24px;
  color: #94a3b8;
  font-weight: 500;
}

.streak-text {
  font-size: 14px;
  color: #64748b;
  margin-top: 8px;
}

/* 正气值能量环 */
.energy-ring-container {
  position: relative;
  width: 160px;
  height: 160px;
  margin-bottom: 20px;
}

.energy-ring {
  width: 100%;
  height: 100%;
}

.ring-progress {
  transition: stroke-dashoffset 1s ease;
}

.energy-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.energy-percent {
  font-size: 32px;
  font-weight: 800;
  color: #22c55e;
}

.energy-label {
  font-size: 12px;
  color: #64748b;
}

/* 引导文案 */
.hero-motto {
  font-size: 14px;
  color: #94a3b8;
  text-align: center;
}
</style>
