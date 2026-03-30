<template>
  <!-- 日历日期详情弹窗 -->
  <div v-if="showCalendarDay" class="modal-overlay" @click="$emit('closeCalendarDay')">
    <div class="modal-content glass-card calendar-day-modal" @click.stop>
      <h3 class="modal-title">{{ selectedDayTitle }}</h3>

      <div v-if="selectedDayEntries.length > 0" class="day-entries">
        <div v-for="entry in selectedDayEntries" :key="entry.id || entry.dateKey" class="day-entry">
          <div v-if="entry.topic" class="entry-topic">
            <span class="topic-badge">主题：{{ entry.topic }}</span>
          </div>
          <div class="entry-time-mood">
            <span class="entry-mood-large">{{ getMoodEmoji(entry.mood) }}</span>
            <span class="entry-time-text">{{ formatEntryTime(entry.createdAt || entry.dateKey) }}</span>
          </div>
          <p class="entry-content">{{ entry.content }}</p>
        </div>
      </div>

      <div v-else class="no-entries">
        <span class="no-entries-emoji">📝</span>
        <p>这一天没有日记记录</p>
      </div>

      <button class="close-btn" @click="$emit('closeCalendarDay')">关闭</button>
    </div>
  </div>

  <!-- 里程碑弹窗 -->
  <div v-if="showMilestones" class="modal-overlay" @click="$emit('closeMilestones')">
    <div class="modal-content glass-card milestones-modal" @click.stop>
      <h3 class="modal-title">里程碑</h3>
      <div class="milestones-list">
        <div
          v-for="m in allMilestones"
          :key="m.days"
          class="milestone-row"
          :class="{ achieved: currentStreakDays >= m.days }"
        >
          <span class="milestone-badge">{{ m.icon }}</span>
          <div class="milestone-info">
            <span class="milestone-name">{{ m.name }}</span>
            <span class="milestone-desc">{{ m.desc }}</span>
          </div>
          <span v-if="currentStreakDays >= m.days" class="milestone-check">完成</span>
          <span v-else class="milestone-progress">{{ Math.min(100, Math.round((currentStreakDays / m.days) * 100)) }}%</span>
        </div>
      </div>
      <button class="close-btn" @click="$emit('closeMilestones')">关闭</button>
    </div>
  </div>

  <!-- 日记弹窗 -->
  <div v-if="showJournal" class="modal-overlay" @click="$emit('closeJournal')">
    <div class="modal-content glass-card journal-modal" @click.stop>
      <h3 class="modal-title">日记</h3>

      <!-- 心情选择 -->
      <div class="mood-section">
        <span class="mood-label">今天心情如何？</span>
        <div class="mood-selector">
          <div
            v-for="mood in moods"
            :key="mood.value"
            class="mood-item"
            :class="{ selected: selectedMood === mood.value }"
            @click="$emit('selectMood', mood.value)"
          >
            <span class="mood-emoji">{{ mood.emoji }}</span>
            <span class="mood-text">{{ mood.label }}</span>
          </div>
        </div>
      </div>

      <!-- 写作提示 -->
      <div class="prompt-section" v-if="!journalText && !selectedTopic">
        <div class="prompt-card">
          <span class="prompt-text">{{ currentPrompt }}</span>
          <div class="prompt-actions">
            <span class="prompt-shuffle" @click.stop="$emit('shufflePrompt')">换一条</span>
            <span class="prompt-confirm" @click.stop="$emit('confirmTopic')">使用此主题</span>
          </div>
        </div>
      </div>

      <!-- 已选主题提示 -->
      <div v-if="selectedTopic" class="topic-selected">
        <span class="topic-label">主题：</span>
        <span class="topic-text">{{ selectedTopic }}</span>
        <span class="topic-clear" @click="$emit('clearTopic')">清除</span>
      </div>

      <div class="journal-input">
        <textarea
          :value="journalText"
          @input="$emit('updateJournalText', $event.target.value)"
          placeholder="写下你的想法..."
          class="journal-textarea"
        ></textarea>
      </div>

      <button class="save-journal-btn glass-button" @click="$emit('saveJournal')">
        {{ editingEntryId ? '更新' : '保存' }}
      </button>

      <button v-if="editingEntryId" class="cancel-edit-btn" @click="$emit('cancelEdit')">
        取消编辑
      </button>

      <!-- 日记列表 -->
      <div class="journal-entries">
        <h4>历史记录</h4>
        <div v-if="groupedJournalEntries.length === 0" class="empty-journal">
          <span class="empty-emoji">📝</span>
          <p>还没有日记记录</p>
          <p class="empty-hint">记录你的第一天日记吧</p>
        </div>

        <div v-for="group in groupedJournalEntries" :key="group.label" class="journal-group">
          <div class="group-header">{{ group.label }}</div>
          <div v-for="entry in group.entries" :key="entry.id || entry.dateKey" class="journal-entry">
            <div v-if="entry.topic" class="entry-topic-inline">
              <span class="topic-label-inline">主题：</span>
              <span class="topic-value-inline">{{ entry.topic }}</span>
            </div>
            <div class="entry-header">
              <span class="entry-mood">{{ getMoodEmoji(entry.mood) }}</span>
              <span class="entry-time">{{ formatRelativeTime(entry.createdAt) }}</span>
              <div class="entry-actions">
                <span class="action-edit" @click="$emit('editEntry', entry)">编辑</span>
                <span class="action-delete" @click="$emit('deleteEntry', entry.dateKey)">删除</span>
              </div>
            </div>
            <p class="entry-text">{{ entry.content }}</p>
          </div>
        </div>
      </div>
      <button class="close-btn" @click="$emit('closeJournal')">关闭</button>
    </div>
  </div>

  <!-- 统计弹窗 -->
  <div v-if="showStats" class="modal-overlay" @click="$emit('closeStats')">
    <div class="modal-content glass-card stats-modal" @click.stop>
      <h3 class="modal-title">统计数据</h3>
      <div class="stats-detail">
        <div class="stat-detail-row">
          <span class="stat-detail-label">当前连续</span>
          <span class="stat-detail-value">{{ currentStreakDays }} 天</span>
        </div>
        <div class="stat-detail-row">
          <span class="stat-detail-label">开始日期</span>
          <span class="stat-detail-value">{{ formatDate(startDate) }}</span>
        </div>
        <div class="stat-detail-row">
          <span class="stat-detail-label">总时长</span>
          <span class="stat-detail-value">{{ totalTime }}</span>
        </div>
        <div class="stat-detail-row">
          <span class="stat-detail-label">完成任务</span>
          <span class="stat-detail-value">{{ completedTasks }}</span>
        </div>
      </div>
      <button class="close-btn" @click="$emit('closeStats')">关闭</button>
    </div>
  </div>

  <!-- 设置弹窗 -->
  <div v-if="showSettings" class="modal-overlay" @click="$emit('closeSettings')">
    <div class="modal-content glass-card settings-modal" @click.stop>
      <h3 class="modal-title">设置</h3>
      <div class="settings-item" @click="$emit('resetStreak')">
        <span class="settings-text">重置连续</span>
        <span class="settings-arrow">></span>
      </div>
      <div class="settings-item" @click="$emit('startNewJourney')">
        <span class="settings-text">新旅程</span>
        <span class="settings-arrow">></span>
      </div>
      <div class="settings-item" @click="$emit('openGoals')">
        <span class="settings-text">设定目标</span>
        <span class="settings-arrow">></span>
      </div>
      <div class="settings-item" @click="$emit('logout')">
        <span class="settings-text">退出登录</span>
        <span class="settings-arrow">></span>
      </div>
      <button class="close-btn" @click="$emit('closeSettings')">关闭</button>
    </div>
  </div>

  <!-- 目标弹窗 -->
  <div v-if="showGoals" class="modal-overlay" @click="$emit('closeGoals')">
    <div class="modal-content glass-card goals-modal" @click.stop>
      <h3 class="modal-title">目标</h3>
      <div class="goal-input-group">
        <label>你的目标</label>
        <input
          :value="userGoal"
          @input="$emit('updateUserGoal', $event.target.value)"
          class="glass-input"
          placeholder="输入你的目标..."
        />
      </div>
      <div class="goal-motivations">
        <h4>动力</h4>
        <div
          v-for="(motivation, idx) in motivations"
          :key="idx"
          class="motivation-item"
          @click="$emit('selectMotivation', motivation)"
        >
          {{ motivation }}
        </div>
      </div>
      <button class="save-goals-btn glass-button" @click="$emit('saveGoals')">保存</button>
      <button class="close-btn" @click="$emit('closeGoals')">关闭</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  showCalendarDay: Boolean,
  showMilestones: Boolean,
  showJournal: Boolean,
  showStats: Boolean,
  showSettings: Boolean,
  showGoals: Boolean,
  selectedDayTitle: String,
  selectedDayEntries: Array,
  currentStreakDays: Number,
  allMilestones: Array,
  selectedMood: Number,
  selectedTopic: String,
  journalText: String,
  editingEntryId: String,
  groupedJournalEntries: Array,
  startDate: [Number, String],
  totalTime: String,
  completedTasks: Number,
  userGoal: String,
  currentPrompt: String,
  moods: Array,
  motivations: Array
})

defineEmits([
  'closeCalendarDay',
  'closeMilestones',
  'closeJournal',
  'closeStats',
  'closeSettings',
  'closeGoals',
  'selectMood',
  'shufflePrompt',
  'confirmTopic',
  'clearTopic',
  'updateJournalText',
  'saveJournal',
  'cancelEdit',
  'editEntry',
  'deleteEntry',
  'resetStreak',
  'startNewJourney',
  'openGoals',
  'logout',
  'updateUserGoal',
  'selectMotivation',
  'saveGoals'
])

const getMoodEmoji = (mood) => {
  const found = props.moods?.find(m => m.value === mood)
  return found ? found.emoji : '😐'
}

const formatEntryTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(parseInt(timestamp))
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return ''
  const now = Date.now()
  const ts = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime()
  if (isNaN(ts)) return ''
  const diff = now - ts
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  const date = new Date(ts)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(parseInt(timestamp))
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}
</script>

<style scoped>
/* 日历日期详情弹窗 */
.calendar-day-modal {
  max-height: 80vh;
  overflow-y: auto;
}

.day-entries {
  max-height: 400px;
  overflow-y: auto;
}

.day-entry {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.entry-topic {
  margin-bottom: 8px;
}

.topic-badge {
  display: inline-block;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #fff;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.entry-time-mood {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.entry-mood-large {
  font-size: 28px;
}

.entry-time-text {
  font-size: 13px;
  color: #94a3b8;
}

.entry-content {
  font-size: 14px;
  color: #f8fafc;
  line-height: 1.6;
  margin: 0;
}

.no-entries {
  text-align: center;
  padding: 40px 20px;
}

.no-entries-emoji {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.no-entries p {
  color: #94a3b8;
  margin: 0;
}

/* 里程碑弹窗 */
.milestones-list {
  margin-bottom: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.milestone-row {
  display: flex;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  opacity: 0.5;
}

.milestone-row.achieved {
  opacity: 1;
}

.milestone-badge {
  font-size: 28px;
  margin-right: 14px;
  color: #f8fafc;
}

.milestone-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.milestone-name {
  font-size: 15px;
  font-weight: 600;
  color: #f8fafc;
}

.milestone-desc {
  font-size: 12px;
  color: #64748b;
}

.milestone-check {
  font-size: 20px;
  color: #10b981;
}

.milestone-progress {
  font-size: 14px;
  color: #64748b;
}

/* 日记弹窗 */
.journal-modal {
  max-height: 85vh;
  overflow-y: auto;
}

.mood-section {
  margin-bottom: 16px;
}

.mood-label {
  font-size: 14px;
  color: #94a3b8;
  display: block;
  margin-bottom: 10px;
}

.mood-selector {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.mood-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mood-item.selected {
  background: rgba(139, 92, 246, 0.2);
  border-color: #8b5cf6;
  transform: scale(1.05);
}

.mood-emoji {
  font-size: 22px;
  margin-bottom: 4px;
}

.mood-text {
  font-size: 10px;
  color: #94a3b8;
}

.mood-item.selected .mood-text {
  color: #8b5cf6;
}

.prompt-section {
  margin-bottom: 12px;
}

.prompt-card {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  padding: 14px;
  transition: all 0.2s ease;
}

.prompt-text {
  font-size: 14px;
  color: #f8fafc;
  line-height: 1.5;
  display: block;
}

.prompt-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(139, 92, 246, 0.2);
}

.prompt-shuffle {
  font-size: 13px;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.prompt-shuffle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

.prompt-confirm {
  font-size: 13px;
  color: #8b5cf6;
  cursor: pointer;
  padding: 4px 12px;
  background: rgba(139, 92, 246, 0.2);
  border-radius: 4px;
  font-weight: 500;
}

.topic-selected {
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.topic-label {
  font-size: 13px;
  color: #8b5cf6;
  font-weight: 500;
}

.topic-text {
  font-size: 14px;
  color: #f8fafc;
  flex: 1;
}

.topic-clear {
  font-size: 12px;
  color: #ef4444;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
}

.journal-input {
  margin-bottom: 16px;
}

.journal-textarea {
  width: 100%;
  height: 120px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: #f8fafc;
  padding: 14px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
}

.journal-textarea::placeholder {
  color: rgba(248, 250, 252, 0.5);
}

.save-journal-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  margin-bottom: 12px;
}

.cancel-edit-btn {
  width: 100%;
  height: 40px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: #94a3b8;
  font-size: 14px;
  margin-bottom: 12px;
  cursor: pointer;
}

.journal-entries h4 {
  font-size: 15px;
  color: #f8fafc;
  margin-bottom: 12px;
}

.empty-journal {
  text-align: center;
  padding: 30px 20px;
}

.empty-emoji {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-journal p {
  color: #94a3b8;
  margin: 0;
}

.empty-hint {
  font-size: 13px;
  color: #64748b;
  margin-top: 6px !important;
}

.journal-group {
  margin-bottom: 16px;
}

.group-header {
  font-size: 13px;
  color: #8b5cf6;
  font-weight: 600;
  margin-bottom: 10px;
  padding-left: 4px;
}

.journal-entry {
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  margin-bottom: 10px;
}

.entry-topic-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.topic-label-inline {
  color: #8b5cf6;
  font-size: 12px;
  font-weight: 500;
}

.topic-value-inline {
  color: #f8fafc;
  font-size: 13px;
  font-weight: 500;
}

.entry-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.entry-mood {
  font-size: 18px;
  margin-right: 8px;
}

.entry-time {
  font-size: 12px;
  color: #64748b;
  flex: 1;
}

.entry-actions {
  display: flex;
  gap: 12px;
}

.action-edit,
.action-delete {
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.action-edit {
  color: #3b82f6;
}

.action-delete {
  color: #ef4444;
}

.action-edit:hover,
.action-delete:hover {
  background: rgba(255, 255, 255, 0.1);
}

.entry-text {
  font-size: 14px;
  color: #f8fafc;
  line-height: 1.6;
  margin: 0;
}

/* 统计弹窗 */
.stats-detail {
  margin-bottom: 20px;
}

.stat-detail-row {
  display: flex;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-detail-label {
  font-size: 14px;
  color: #94a3b8;
}

.stat-detail-value {
  font-size: 14px;
  color: #f8fafc;
  font-weight: 600;
}

/* 设置弹窗 */
.settings-modal {
  max-height: 85vh;
  overflow-y: auto;
}

.settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
}

.settings-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.settings-text {
  font-size: 15px;
  color: #f8fafc;
}

.settings-arrow {
  font-size: 15px;
  color: #64748b;
}

/* 目标弹窗 */
.goals-modal {
  max-height: 85vh;
  overflow-y: auto;
}

.goal-input-group {
  margin-bottom: 20px;
}

.goal-input-group label {
  font-size: 14px;
  color: #94a3b8;
  display: block;
  margin-bottom: 8px;
}

.glass-input {
  width: 100%;
  height: 44px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: #f8fafc;
  padding: 0 14px;
  font-size: 14px;
}

.glass-input::placeholder {
  color: rgba(248, 250, 252, 0.5);
}

.goal-motivations h4 {
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 10px;
}

.motivation-item {
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #f8fafc;
  cursor: pointer;
  transition: background 0.2s;
}

.motivation-item:hover {
  background: rgba(59, 130, 246, 0.2);
}

.save-goals-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  margin-bottom: 12px;
}

/* 通用按钮样式 */
.close-btn {
  width: 100%;
  height: 44px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: #f8fafc;
  font-size: 15px;
  cursor: pointer;
  margin-top: 12px;
}

.glass-button {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border: none;
  color: #fff;
}
</style>
