<template>
  <div class="welcome-page">
    <!-- 动态背景 -->
    <div class="liquid-bg"></div>
    <div class="liquid-orb liquid-orb-1"></div>
    <div class="liquid-orb liquid-orb-2"></div>
    <div class="liquid-orb liquid-orb-3"></div>

    <!-- 主要内容 -->
    <div class="content">
      <!-- Logo区域 -->
      <div class="logo-section">
        <div class="logo-container">
          <span class="logo-icon">🧠</span>
        </div>
        <h1 class="app-name gradient-text">布鲁计划</h1>
        <p class="app-tagline">科学戒色，重塑人生</p>
      </div>

      <!-- 功能介绍 -->
      <div class="features-section">
        <div class="feature-item glass-card">
          <span class="feature-icon">📊</span>
          <div class="feature-text">
            <h3 class="feature-title">智能评估</h3>
            <p class="feature-desc">AI驱动的个性化依赖程度分析</p>
          </div>
        </div>

        <div class="feature-item glass-card">
          <span class="feature-icon">📅</span>
          <div class="feature-text">
            <h3 class="feature-title">90天计划</h3>
            <p class="feature-desc">基于神经科学的科学恢复方案</p>
          </div>
        </div>

        <div class="feature-item glass-card">
          <span class="feature-icon">🆘</span>
          <div class="feature-text">
            <h3 class="feature-title">紧急求助</h3>
            <p class="feature-desc">一键触发即时干预机制</p>
          </div>
        </div>

        <div class="feature-item glass-card">
          <span class="feature-icon">📈</span>
          <div class="feature-text">
            <h3 class="feature-title">进度追踪</h3>
            <p class="feature-desc">实时记录戒色天数与里程碑</p>
          </div>
        </div>
      </div>

      <!-- 开始按钮 -->
      <div class="action-section">
        <button class="start-button glass-button" @click="startAssessment">
          开始评估
        </button>
        <p class="notice">完成评估后即可登录</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const startAssessment = () => {
  router.push('/survey')
}
</script>

<style scoped>
.welcome-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow: hidden;
  background: #000000;
}

.content {
  position: relative;
  z-index: 1;
  padding: 60px 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  box-sizing: border-box;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
}

.logo-container {
  width: 90px;
  height: 90px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
}

.logo-icon {
  font-size: 40px;
}

.app-name {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6, #EC4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.app-tagline {
  font-size: 14px;
  color: #94A3B8;
  letter-spacing: 1px;
}

.features-section {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
}

.feature-icon {
  font-size: 24px;
  margin-right: 12px;
  flex-shrink: 0;
}

.feature-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.feature-title {
  font-size: 15px;
  font-weight: 600;
  color: #F8FAFC;
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 12px;
  color: #94A3B8;
}

.action-section {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: auto;
  padding-bottom: 40px;
}

.start-button {
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: 600;
  color: #F8FAFC;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(99, 102, 241, 0.9));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.start-button:active {
  transform: scale(0.95);
  opacity: 0.9;
}

.notice {
  font-size: 12px;
  color: #64748B;
}

/* 动态背景 */
.liquid-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at 20% 20%, #1e1b4b 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, #172554 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, #0f172a 0%, #000000 100%);
  z-index: 0;
}

.liquid-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 20s ease-in-out infinite;
  z-index: 0;
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
  animation-delay: -7s;
}

.liquid-orb-3 {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #06B6D4, #3B82F6);
  bottom: 20%;
  left: 30%;
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(30px, -30px) scale(1.05);
  }
  50% {
    transform: translate(-20px, 20px) scale(0.95);
  }
  75% {
    transform: translate(-30px, -20px) scale(1.02);
  }
}
</style>
