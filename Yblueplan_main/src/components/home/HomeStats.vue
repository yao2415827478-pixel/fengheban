<template>
  <div class="home-stats">
    <div class="stats-card glass-card">
      <div class="stat-item">
        <span class="stat-value">{{ panicCount }}</span>
        <span class="stat-label">Panic次数</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">{{ todayProgress }}%</span>
        <span class="stat-label">今日进度</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">{{ streakDays }}</span>
        <span class="stat-label">坚持天数</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  streakDays: {
    type: Number,
    default: 0
  },
  panicCount: {
    type: Number,
    default: 0
  },
  todayChecked: {
    type: Boolean,
    default: false
  }
})

// 今日进度（基于打卡状态）
const todayProgress = computed(() => {
  return props.todayChecked ? 100 : 0
})
</script>

<style scoped>
.home-stats {
  padding: 0 16px;
  margin-bottom: 16px;
}

.stats-card {
  display: flex;
  padding: 20px 16px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 8px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #8b5cf6;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
}
</style>
