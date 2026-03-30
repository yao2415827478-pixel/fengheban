<template>
  <div class="home-invite-card">
    <div class="invite-section glass-card">
      <div class="invite-header">
        <span class="invite-title">邀请返现</span>
        <span class="invite-action" @click="$emit('goToProfile')">进入中心</span>
      </div>

      <div class="invite-code-area">
        <div class="code-info">
          <span class="code-label">我的邀请码</span>
          <span class="code-value">{{ inviteCode || '暂未生成' }}</span>
        </div>
        <button
          class="copy-btn"
          :disabled="!inviteCode"
          @click.stop="$emit('copyCode')"
        >
          复制
        </button>
      </div>

      <div class="invite-stats">
        <div class="stat-item">
          <span class="stat-value">{{ totalInvited }}</span>
          <span class="stat-label">累计邀请</span>
        </div>
        <div class="stat-item highlight">
          <span class="stat-value available">¥{{ withdrawableAmount }}</span>
          <span class="stat-label">可提现</span>
        </div>
      </div>

      <div class="invite-actions">
        <button class="action-btn primary" @click="$emit('goToProfile')">
          查看收益
        </button>
        <button class="action-btn secondary" @click="$emit('goToWithdraw')">
          去提现
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  inviteCode: {
    type: String,
    default: ''
  },
  totalInvited: {
    type: Number,
    default: 0
  },
  withdrawableAmount: {
    type: Number,
    default: 0
  }
})

defineEmits(['goToProfile', 'goToWithdraw', 'copyCode'])
</script>

<style scoped>
.home-invite-card {
  padding: 0 16px;
  margin-bottom: 16px;
}

.invite-section {
  padding: 16px;
}

.invite-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.invite-title {
  font-size: 16px;
  font-weight: 600;
  color: #f8fafc;
}

.invite-action {
  font-size: 13px;
  color: #3b82f6;
  cursor: pointer;
}

.invite-code-area {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.code-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.code-label {
  font-size: 12px;
  color: #94a3b8;
}

.code-value {
  font-size: 18px;
  font-weight: 700;
  color: #3b82f6;
  letter-spacing: 1px;
}

.copy-btn {
  min-width: 60px;
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.copy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.invite-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  flex: 1;
  padding: 14px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  text-align: center;
}

.stat-item.highlight {
  background: rgba(16, 185, 129, 0.1);
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 4px;
}

.stat-value.available {
  color: #10b981;
}

.stat-label {
  font-size: 12px;
  color: #94a3b8;
}

.invite-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.action-btn {
  height: 40px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  border: none;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
}

.action-btn.secondary {
  border: 1px solid rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}
</style>
