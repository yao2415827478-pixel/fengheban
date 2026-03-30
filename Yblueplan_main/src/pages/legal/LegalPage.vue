<template>
  <div class="legal-page">
    <div class="liquid-bg"></div>
    <div class="liquid-orb liquid-orb-1"></div>
    <div class="liquid-orb liquid-orb-2"></div>

    <div class="legal-shell">
      <header class="legal-header">
        <button type="button" class="nav-button" aria-label="返回上一页" @click="goBack">
          <span class="nav-icon">‹</span>
        </button>
        <div class="header-copy">
          <h1 class="page-title">{{ document.title }}</h1>
          <p class="page-subtitle">{{ document.appName }}</p>
        </div>
        <div class="nav-placeholder" aria-hidden="true"></div>
      </header>

      <section class="summary-card glass-card">
        <div class="summary-row">
          <span class="summary-label">APP 名称</span>
          <span class="summary-value">{{ document.appName }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">运营主体</span>
          <span class="summary-value">{{ document.operator }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">更新日期</span>
          <span class="summary-value">{{ document.updatedAt }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">生效日期</span>
          <span class="summary-value">{{ document.effectiveAt }}</span>
        </div>
      </section>

      <section class="intro-card glass-card">
        <h2 class="block-title">文档说明</h2>
        <p class="body-copy">{{ document.intro }}</p>
        <div class="contact-stack">
          <span v-for="item in document.contacts" :key="item" class="contact-item">
            {{ item }}
          </span>
        </div>
      </section>

      <section
        v-for="section in document.sections"
        :key="section.title"
        class="legal-section glass-card"
      >
        <h2 class="section-title">{{ section.title }}</h2>

        <p
          v-for="paragraph in section.paragraphs || []"
          :key="paragraph"
          class="body-copy"
        >
          {{ paragraph }}
        </p>

        <ul v-if="section.list?.length" class="bullet-list">
          <li v-for="item in section.list" :key="item" class="bullet-item">
            {{ item }}
          </li>
        </ul>

        <div v-if="section.dataUses?.length" class="info-grid">
          <article v-for="item in section.dataUses" :key="item.title" class="info-card">
            <h3 class="subsection-title">{{ item.title }}</h3>
            <div class="meta-block">
              <span class="meta-label">收集信息</span>
              <p class="meta-copy">{{ item.collectedInfo }}</p>
            </div>
            <div class="meta-block">
              <span class="meta-label">用途</span>
              <p class="meta-copy">{{ item.purpose }}</p>
            </div>
          </article>
        </div>

        <div v-if="section.table" class="table-wrap">
          <table class="permission-table">
            <thead>
              <tr>
                <th v-for="column in section.table.columns" :key="column">{{ column }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in section.table.rows" :key="row[0]">
                <td v-for="cell in row" :key="cell">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="section.subsections?.length" class="subsection-stack">
          <article
            v-for="subsection in section.subsections"
            :key="subsection.title"
            class="subsection-card"
          >
            <h3 class="subsection-title">{{ subsection.title }}</h3>
            <p
              v-for="paragraph in subsection.paragraphs"
              :key="paragraph"
              class="body-copy"
            >
              {{ paragraph }}
            </p>
          </article>
        </div>
      </section>

      <section v-if="document.footerNote" class="footer-card glass-card">
        <h2 class="block-title">上线前提醒</h2>
        <p class="body-copy">{{ document.footerNote }}</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { legalDocuments } from '../../content/legal'
import { isLoggedIn, useAppCacheState } from '../../utils/storage'

const route = useRoute()
const router = useRouter()
const { hasPaidAccess } = useAppCacheState()

const document = computed(() => {
  const legalType = route.meta.legalType
  return legalDocuments[legalType] || legalDocuments.terms
})

const fallbackRoute = computed(() => {
  const from = typeof route.query.from === 'string' ? route.query.from : ''

  if (from === 'login') return '/login'
  if (from === 'payment') return '/payment'
  if (from === 'profile') return '/profile'

  if (!isLoggedIn()) {
    return '/login'
  }

  return hasPaidAccess.value ? '/home' : '/payment'
})

watchEffect(() => {
  window.document.title = `${document.value.title} - 布鲁计划`
})

onMounted(async () => {
  await nextTick()
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'auto'
  })
})

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }

  router.replace(fallbackRoute.value)
}
</script>

<style scoped>
.legal-page {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow-x: hidden;
}

.legal-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: calc(12px + env(safe-area-inset-top)) 16px 48px;
}

.legal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 5;
  margin: 0 -4px 20px;
  padding: 8px 4px 14px;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.nav-button,
.nav-placeholder {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.nav-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.76);
  color: #E2E8F0;
}

.nav-icon {
  font-size: 28px;
  line-height: 1;
  transform: translateX(-1px);
}

.header-copy {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.25;
  color: #F8FAFC;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 12px;
  color: #94A3B8;
}

.summary-card,
.intro-card,
.legal-section,
.footer-card {
  padding: 20px 18px;
}

.summary-card,
.intro-card,
.legal-section {
  margin-bottom: 16px;
}

.summary-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-label {
  font-size: 13px;
  color: #94A3B8;
}

.summary-value {
  flex: 1;
  text-align: right;
  font-size: 14px;
  line-height: 1.6;
  color: #F8FAFC;
}

.block-title,
.section-title {
  font-size: 18px;
  color: #F8FAFC;
  margin-bottom: 14px;
}

.body-copy {
  font-size: 14px;
  line-height: 1.8;
  color: #CBD5E1;
  margin-bottom: 12px;
}

.body-copy:last-child {
  margin-bottom: 0;
}

.contact-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
}

.contact-item {
  font-size: 13px;
  color: #60A5FA;
}

.bullet-list {
  padding-left: 18px;
}

.bullet-item {
  font-size: 14px;
  line-height: 1.8;
  color: #CBD5E1;
  margin-bottom: 8px;
}

.bullet-item:last-child {
  margin-bottom: 0;
}

.info-grid,
.subsection-stack {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.info-card,
.subsection-card {
  padding: 16px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.subsection-title {
  font-size: 15px;
  color: #F8FAFC;
  margin-bottom: 12px;
}

.meta-block + .meta-block {
  margin-top: 12px;
}

.meta-label {
  display: inline-block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #60A5FA;
}

.meta-copy {
  font-size: 14px;
  line-height: 1.7;
  color: #CBD5E1;
}

.table-wrap {
  margin-top: 12px;
  overflow-x: auto;
}

.permission-table {
  width: 100%;
  min-width: 520px;
  border-collapse: collapse;
}

.permission-table th,
.permission-table td {
  padding: 12px;
  text-align: left;
  vertical-align: top;
  border: 1px solid rgba(148, 163, 184, 0.16);
  font-size: 13px;
  line-height: 1.7;
}

.permission-table th {
  color: #F8FAFC;
  background: rgba(59, 130, 246, 0.14);
}

.permission-table td {
  color: #CBD5E1;
  background: rgba(15, 23, 42, 0.52);
}
</style>
