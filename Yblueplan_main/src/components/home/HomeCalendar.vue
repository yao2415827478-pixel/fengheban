<template>
  <div class="home-calendar">
    <div class="calendar-section glass-card">
      <div class="calendar-header">
        <span class="calendar-title">打卡日历</span>
        <span class="calendar-month">{{ currentMonthName }}</span>
      </div>

      <!-- 星期头部 -->
      <div class="calendar-weekdays">
        <span v-for="day in weekdays" :key="day">{{ day }}</span>
      </div>

      <!-- 日历网格 -->
      <div class="calendar-grid">
        <div
          v-for="day in calendarDays"
          :key="day.date"
          class="calendar-day"
          :class="{
            'checked': day.completed,
            'today': day.isToday,
            'future': day.isFuture,
            'other-month': day.isOtherMonth
          }"
          @click="handleDayClick(day)"
        >
          <span class="day-number">{{ day.dayNum }}</span>
          <span v-if="day.mood" class="day-mood">{{ day.mood }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  calendarDays: {
    type: Array,
    default: () => []
  },
  currentMonthName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['selectDay'])

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const handleDayClick = (day) => {
  if (day.date && !day.isFuture && !day.isOtherMonth) {
    emit('selectDay', day)
  }
}
</script>

<style scoped>
.home-calendar {
  padding: 0 16px;
  margin-bottom: 16px;
}

.calendar-section {
  padding: 16px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.calendar-title {
  font-size: 16px;
  font-weight: 600;
  color: #f8fafc;
}

.calendar-month {
  font-size: 13px;
  color: #94a3b8;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 8px;
  text-align: center;
}

.calendar-weekdays span {
  font-size: 11px;
  color: #64748b;
  padding: 6px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  padding: 2px;
}

.calendar-day:active {
  transform: scale(0.95);
}

.calendar-day.checked {
  background: linear-gradient(135deg, #22c55e, #84cc16);
}

.calendar-day.today {
  border: 2px solid #8b5cf6;
  background: rgba(139, 92, 246, 0.15);
}

.calendar-day.today.checked {
  background: linear-gradient(135deg, #22c55e, #84cc16);
}

.calendar-day.future {
  opacity: 0.3;
  cursor: not-allowed;
}

.calendar-day.other-month {
  opacity: 0.2;
}

.day-number {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.calendar-day.checked .day-number {
  color: #fff;
}

.calendar-day.today .day-number {
  color: #8b5cf6;
  font-weight: 600;
}

.calendar-day.today.checked .day-number {
  color: #fff;
}

.day-mood {
  font-size: 10px;
  line-height: 1;
  margin-top: 1px;
}
</style>
