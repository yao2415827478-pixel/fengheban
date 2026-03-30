<template>
  <div class="home-quick-actions">
    <div class="action-item glass-card" @click="handlePlanClick">
      <div class="action-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h6" />
        </svg>
      </div>
      <span class="action-text">90天计划</span>
    </div>

    <div class="action-item glass-card" @click="$emit('showJournal')">
      <div class="action-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
      </div>
      <span class="action-text">日记</span>
    </div>

    <div class="action-item glass-card" @click="$emit('showStats')">
      <div class="action-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      </div>
      <span class="action-text">详细统计</span>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['showJournal', 'showStats'])

const props = defineProps({
  router: {
    type: Object,
    required: true
  }
})

const handlePlanClick = () => {
  props.router.push('/plan')
}
</script>

<style scoped>
.home-quick-actions {
  display: flex;
  gap: 12px;
  padding: 0 16px;
  margin-bottom: 16px;
}

.action-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-item:active {
  transform: scale(0.98);
}

.action-icon {
  width: 32px;
  height: 32px;
  margin-bottom: 8px;
  color: #f8fafc;
}

.action-icon svg {
  width: 100%;
  height: 100%;
}

.action-text {
  font-size: 12px;
  color: #f8fafc;
  font-weight: 500;
}
</style>
