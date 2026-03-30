<template>
  <div class="home-panic-card">
    <div class="panic-content">
      <span class="panic-label">需要帮助？</span>
      <div class="panic-button" @click="handlePanicClick">
        <div class="panic-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <span class="panic-text">紧急刹车</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  router: {
    type: Object,
    required: true
  }
})

const handlePanicClick = () => {
  props.router.push('/panic')
}
</script>

<style scoped>
.home-panic-card {
  padding: 16px;
  display: flex;
  justify-content: center;
}

.panic-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.panic-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 12px;
}

.panic-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 24px rgba(239, 68, 68, 0.5);
  animation: pulse 2s ease-in-out infinite;
  cursor: pointer;
  transition: transform 0.2s;
}

.panic-button:active {
  transform: scale(0.95);
}

.panic-icon-wrapper {
  width: 28px;
  height: 28px;
  color: #fff;
  margin-bottom: 4px;
}

.panic-icon-wrapper svg {
  width: 100%;
  height: 100%;
}

.panic-text {
  font-size: 12px;
  color: #fff;
  font-weight: 600;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 32px rgba(239, 68, 68, 0.8);
    transform: scale(1.05);
  }
}
</style>
