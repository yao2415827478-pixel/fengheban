/* ========================================
   布鲁计划 - 主应用逻辑
   ======================================== */

// ========================================
// 数据模型
// ========================================
const AppData = {
    STORAGE_KEY: 'bulu_plan_data',

    defaults: {
        streakDays: 0,
        energyValue: 0,
        checkIns: {}, // { "日期字符串": { mood: "心情", note: "备注", time: "时间戳" } }
        logs: [],
        panicCount: 0,
        moodStats: {},
        isFirstLaunch: true,
        lastCheckIn: null,
        hasUnresolvedPanic: false,
        inviteCode: null,
        referralCount: 0,
        referralEarnings: 0
    },

    init() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            return { ...this.defaults, ...JSON.parse(stored) };
        }
        return { ...this.defaults };
    },

    save(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    reset() {
        localStorage.removeItem(this.STORAGE_KEY);
        return { ...this.defaults };
    }
};

// ========================================
// 应用状态
// ========================================
let appState = AppData.init();
let currentOnboardingSlide = 1;
let panicCountdown = 10;
let panicInterval = null;
let selectedDateForLog = null; // 用于日历点击时记录选中的日期

const panicTips = [
    "深呼吸，你已经坚持了 {days} 天",
    "冲动只是一瞬间，坚持才是永恒",
    "想想你为什么要改变",
    "这一刻的选择，决定你的未来",
    "你比自己想象的更强大",
    "停下来，想一想值得吗",
    "每次坚持都是一次胜利",
    "相信自己，你可以的",
    "这只是一个小考验",
    "坚持下去，光明就在前方",
    "冲动退去后，你会感谢现在的自己",
    "你正在成为更好的自己",
    "一时的冲动，一世的后悔",
    "冷静十秒，思考人生",
    "你的意志力比你以为的更强",
    "每一次克制，都是成长",
    "破戒只需一秒，重建需要数天",
    "现在放弃，前面坚持的天数都白费了",
    "想象成功后的喜悦",
    "你不是一个人在战斗"
];

// 心情emoji映射
const moodEmojis = {
    '无聊': '😒', '压力': '😰',
    '焦虑': '😟', '孤独': '😔', 'Panic': '🛑',
    '开心': '😊', '平静': '😌', '沮丧': '😞'
};

// ========================================
// 引导页逻辑
// ========================================
function initOnboarding() {
    const onboarding = document.getElementById('onboarding');
    const app = document.getElementById('app');
    const nextBtn = document.getElementById('onboardingNext');
    const skipBtn = document.getElementById('onboardingSkip');
    const dots = document.querySelectorAll('.dot');

    if (!appState.isFirstLaunch) {
        onboarding.classList.remove('active');
        onboarding.classList.add('screen');
        app.classList.add('active');
        return;
    }

    nextBtn.addEventListener('click', () => {
        if (currentOnboardingSlide < 3) {
            currentOnboardingSlide++;
            updateOnboardingSlide();
        } else {
            completeOnboarding();
        }
    });

    skipBtn.addEventListener('click', completeOnboarding);

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            currentOnboardingSlide = parseInt(dot.dataset.slide);
            updateOnboardingSlide();
        });
    });
}

function updateOnboardingSlide() {
    const slides = document.querySelectorAll('.onboarding-slide');
    const dots = document.querySelectorAll('.dot');
    const nextBtn = document.getElementById('onboardingNext');

    slides.forEach(slide => {
        slide.classList.remove('active');
        if (parseInt(slide.dataset.slide) === currentOnboardingSlide) {
            slide.classList.add('active');
        }
    });

    dots.forEach(dot => {
        dot.classList.remove('active');
        if (parseInt(dot.dataset.slide) === currentOnboardingSlide) {
            dot.classList.add('active');
        }
    });

    if (currentOnboardingSlide === 3) {
        nextBtn.textContent = '开始使用';
    }
}

function completeOnboarding() {
    appState.isFirstLaunch = false;
    AppData.save(appState);

    const onboarding = document.getElementById('onboarding');
    const app = document.getElementById('app');

    onboarding.classList.remove('active');
    onboarding.classList.add('screen');
    app.classList.add('active');

    showToast('欢迎！数据100%本地保存');
}

// ========================================
// 首页逻辑
// ========================================
function initHome() {
    updateHomeDisplay();
    renderCalendar();
    setupCheckInButton();
    setupCalendarClick();
}

function updateHomeDisplay() {
    document.getElementById('streakDays').textContent = appState.streakDays;

    const energyValue = Math.min(100, Math.max(0, appState.energyValue));
    document.getElementById('energyValue').textContent = energyValue;
    document.getElementById('energyPercent').textContent = energyValue + '%';

    const circumference = 2 * Math.PI * 85;
    const offset = circumference - (energyValue / 100) * circumference;
    const progressCircle = document.getElementById('energyProgress');
    progressCircle.style.strokeDashoffset = offset;

    document.getElementById('weeklyPanic').textContent = appState.panicCount;

    // 更新打卡按钮状态
    const checkInBtn = document.getElementById('checkInBtn');
    const today = new Date().toDateString();

    if (appState.checkIns[today] && appState.checkIns[today].isChecked) {
        checkInBtn.classList.add('checked', 'disabled');
        checkInBtn.disabled = true;
        checkInBtn.querySelector('.checkin-text').textContent = '已打卡';
    } else {
        checkInBtn.classList.remove('checked', 'disabled');
        checkInBtn.disabled = false;
        checkInBtn.querySelector('.checkin-text').textContent = '今日坚持';
    }
}

function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarMonth = document.getElementById('calendarMonth');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                        '七月', '八月', '九月', '十月', '十一月', '十二月'];
    calendarMonth.textContent = `${currentYear}年 ${monthNames[currentMonth]}`;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    calendarGrid.innerHTML = '';

    // 添加空白格子
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendarGrid.appendChild(emptyDay);
    }

    // 添加日期格子
    const todayDate = today.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.dataset.day = day;

        const dateStr = new Date(currentYear, currentMonth, day).toDateString();
        dayEl.dataset.date = dateStr;

        // 设置日期数字
        dayEl.textContent = day;

        // 判断是否是今天
        if (day === todayDate) {
            dayEl.classList.add('today');
        }

        // 判断是否有打卡记录
        const checkIn = appState.checkIns[dateStr];
        if (checkIn) {
            // 只有打卡了才显示绿色
            if (checkIn.isChecked) {
                dayEl.classList.add('checked');
            }
            // 如果有心情，显示emoji
            if (checkIn.mood) {
                const emoji = document.createElement('span');
                emoji.className = 'day-emoji';
                emoji.textContent = moodEmojis[checkIn.mood] || '✓';
                dayEl.appendChild(emoji);
            }
        }

        // 判断是否是未来日期
        if (new Date(currentYear, currentMonth, day) > today) {
            dayEl.classList.add('future');
        }

        calendarGrid.appendChild(dayEl);
    }
}

function setupCheckInButton() {
    const checkInBtn = document.getElementById('checkInBtn');

    checkInBtn.addEventListener('click', () => {
        if (!checkInBtn.disabled) {
            performCheckIn();
        }
    });
}

// 设置日历点击事件
function setupCalendarClick() {
    const calendarGrid = document.getElementById('calendarGrid');
    const today = new Date().toDateString();

    calendarGrid.addEventListener('click', (e) => {
        const dayEl = e.target.closest('.calendar-day');
        if (!dayEl || dayEl.classList.contains('future')) return;

        const dateStr = dayEl.dataset.date;
        if (!dateStr) return;

        const checkIn = appState.checkIns[dateStr];

        // 如果有心情记录，显示详情
        if (checkIn && checkIn.mood) {
            showDayLogDetail(dateStr, checkIn);
        } else if (dateStr === today) {
            // 只有今天可以写日记
            selectedDateForLog = dateStr;
            openLogModal(dateStr, true);
        }
        // 过去没有日记的日期不能写日记
    });
}

// 显示当天日志详情
function showDayLogDetail(dateStr, checkIn) {
    const modal = document.getElementById('logDetailModal');
    if (!modal) {
        createLogDetailModal();
    }

    const date = new Date(dateStr);
    const dateStrFormat = `${date.getMonth() + 1}月${date.getDate()}日`;

    // 保存当前日期用于删除
    modal.dataset.currentDate = dateStr;

    document.getElementById('logDetailDate').textContent = dateStrFormat;
    document.getElementById('logDetailMood').textContent = checkIn.mood || '未记录';
    document.getElementById('logDetailEmoji').textContent = moodEmojis[checkIn.mood] || '❓';
    document.getElementById('logDetailNote').textContent = checkIn.note || '无备注';

    document.getElementById('logDetailModal').classList.add('active');
}

// 创建日志详情弹窗
function createLogDetailModal() {
    const modal = document.createElement('div');
    modal.id = 'logDetailModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content glass-card log-detail-modal">
            <h3 class="modal-title" id="logDetailDate">月日</h3>
            <div class="log-detail-content">
                <div class="log-detail-item">
                    <span class="log-detail-label">心情</span>
                    <span class="log-detail-value">
                        <span id="logDetailEmoji">❓</span>
                        <span id="logDetailMood">未记录</span>
                    </span>
                </div>
                <div class="log-detail-item">
                    <span class="log-detail-label">备注</span>
                    <p class="log-detail-note" id="logDetailNote">无备注</p>
                </div>
            </div>
            <div class="modal-actions">
                <button id="deleteLogDetail" class="btn-danger">删除日记</button>
                <button id="closeLogDetail" class="btn-secondary">关闭</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 使用事件委托，确保按钮点击能正确响应
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'closeLogDetail') {
            modal.classList.remove('active');
        } else if (e.target.id === 'deleteLogDetail') {
            const dateStr = modal.dataset.currentDate;
            if (dateStr && confirm('确定要删除这篇日记吗？')) {
                deleteDiaryByDate(dateStr);
                modal.classList.remove('active');
            }
        } else if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// 删除指定日期的日记
function deleteDiaryByDate(dateStr) {
    const checkIn = appState.checkIns[dateStr];
    if (checkIn && checkIn.mood) {
        // 更新心情统计
        const mood = checkIn.mood;
        if (appState.moodStats[mood]) {
            appState.moodStats[mood]--;
            if (appState.moodStats[mood] <= 0) {
                delete appState.moodStats[mood];
            }
        }

        // 移除心情记录
        delete checkIn.mood;
        delete checkIn.note;

        // 如果没有打卡状态了，删除整个记录
        if (!checkIn.isChecked && !checkIn.mood) {
            delete appState.checkIns[dateStr];
        }

        // 从日志列表中删除对应记录
        const logIndex = appState.logs.findIndex(log => log.dateStr === dateStr);
        if (logIndex !== -1) {
            appState.logs.splice(logIndex, 1);
        }

        AppData.save(appState);
        renderCalendar();
        updateLogDisplay();
        showToast('日记已删除');
    }
}

// 打开日志弹窗
function openLogModal(dateStr, isToday) {
    const logModal = document.getElementById('logModal');
    const modalTitle = logModal.querySelector('.modal-title');
    const moodBtns = document.querySelectorAll('.mood-btn');

    // 设置标题
    const date = new Date(dateStr);
    const today = new Date().toDateString();
    if (dateStr === today) {
        modalTitle.textContent = '记录今日心情';
    } else {
        modalTitle.textContent = `${date.getMonth() + 1}月${date.getDate()}日 心情`;
    }

    // 重置选择状态
    moodBtns.forEach(btn => btn.classList.remove('selected'));
    document.querySelector('.log-note').value = '';

    // 如果已有记录，填充数据
    const existingCheckIn = appState.checkIns[dateStr];
    if (existingCheckIn && existingCheckIn.mood) {
        moodBtns.forEach(btn => {
            if (btn.dataset.mood === existingCheckIn.mood) {
                btn.classList.add('selected');
            }
        });
        document.querySelector('.log-note').value = existingCheckIn.note || '';
    }

    logModal.classList.add('active');
}

// 保存日志
function saveLog(mood, dateStr) {
    const note = document.querySelector('.log-note').value.trim();
    const today = new Date().toDateString();

    // 获取已有的打卡状态
    const existingCheckIn = appState.checkIns[dateStr] || {};
    const wasChecked = existingCheckIn.isChecked;

    // 检查是否已经写过日记
    const hasExistingDiary = !!existingCheckIn.mood;

    // 如果有旧的日记记录，从心情统计中移除旧的心情
    if (hasExistingDiary) {
        const oldMood = existingCheckIn.mood;
        if (appState.moodStats[oldMood]) {
            appState.moodStats[oldMood]--;
            if (appState.moodStats[oldMood] <= 0) {
                delete appState.moodStats[oldMood];
            }
        }
        // 从日志列表中移除旧记录
        const logIndex = appState.logs.findIndex(log => log.dateStr === dateStr);
        if (logIndex !== -1) {
            appState.logs.splice(logIndex, 1);
        }
    }

    // 保存记录，保留打卡状态
    appState.checkIns[dateStr] = {
        ...existingCheckIn,
        mood: mood,
        note: note,
        time: new Date().toISOString()
    };

    // 添加到日志列表
    const log = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        moodTag: mood,
        note: note || '',
        type: 'manual',
        dateStr: dateStr
    };
    appState.logs.unshift(log);

    // 更新心情统计
    appState.moodStats[mood] = (appState.moodStats[mood] || 0) + 1;

    // 保存
    AppData.save(appState);

    // 更新显示
    renderCalendar();
    updateHomeDisplay();
    updateLogDisplay();

    // 显示提示
    if (hasExistingDiary) {
        showToast('日记已更新');
    } else {
        showToast('日记已保存');
    }
}

function performCheckIn() {
    const today = new Date().toDateString();

    // 检查是否已打卡
    if (appState.checkIns[today] && appState.checkIns[today].isChecked) {
        return;
    }

    // 获取现有的日记数据
    const existingData = appState.checkIns[today] || {};

    // 标记为已打卡，保留日记数据
    appState.checkIns[today] = {
        ...existingData,  // 保留现有的 mood 和 note
        time: new Date().toISOString(),
        isChecked: true
    };

    appState.energyValue = Math.min(100, appState.energyValue + 10);
    appState.streakDays++;
    appState.lastCheckIn = today;

    AppData.save(appState);

    showSuccessModal();
    updateHomeDisplay();
    renderCalendar();
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.add('active');
    createParticles();

    if (navigator.vibrate) {
        navigator.vibrate(100);
    }

    setTimeout(() => {
        modal.classList.remove('active');
    }, 2000);
}

function createParticles() {
    const container = document.getElementById('particles');
    container.innerHTML = '';

    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const angle = (i / 12) * 2 * Math.PI;
        const distance = 80 + Math.random() * 40;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        particle.style.cssText = `
            left: 50%;
            top: 50%;
            --tx: ${tx}px;
            --ty: ${ty}px;
            animation-delay: ${i * 50}ms;
        `;

        container.appendChild(particle);
    }
}

// ========================================
// Panic紧急按钮逻辑
// ========================================
let hasPendingPanic = false;

function initPanic() {
    const panicBtn = document.getElementById('panicBtn');
    const continueBtn = document.getElementById('panicContinue');
    const pendingModal = document.getElementById('pendingPanicModal');
    const confirmPendingBtn = document.getElementById('confirmPendingPanic');
    const cancelPendingBtn = document.getElementById('cancelPendingPanic');

    panicBtn.addEventListener('click', () => {
        triggerPanic();
    });

    continueBtn.addEventListener('click', () => {
        completePanic();
    });

    confirmPendingBtn.addEventListener('click', () => {
        completePendingPanic();
        pendingModal.classList.remove('active');
    });

    cancelPendingBtn.addEventListener('click', () => {
        pendingModal.classList.remove('active');
    });

    pendingModal.addEventListener('click', (e) => {
        if (e.target === pendingModal) {
            pendingModal.classList.remove('active');
        }
    });

    window.addEventListener('beforeunload', () => {
        if (hasPendingPanic) {
            appState.hasUnresolvedPanic = true;
            AppData.save(appState);
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && hasPendingPanic) {
            appState.hasUnresolvedPanic = true;
            AppData.save(appState);
        }
    });
}

function triggerPanic() {
    const modal = document.getElementById('panicModal');
    const capturing = document.getElementById('panicCapturing');
    const result = document.getElementById('panicResult');
    const tip = document.getElementById('panicTip');

    modal.classList.add('active');
    capturing.style.display = 'flex';
    result.classList.add('hidden');

    if (navigator.vibrate) {
        navigator.vibrate(2000);
    }

    hasPendingPanic = true;

    setTimeout(() => {
        capturing.style.display = 'none';
        result.classList.remove('hidden');
        startBreathingExercise();
        startCountdown();

        const randomTip = panicTips[Math.floor(Math.random() * panicTips.length)];
        tip.innerHTML = randomTip.replace('{days}', `<strong>${appState.streakDays}</strong>`);
    }, 2000);
}

function startBreathingExercise() {
    const breathText = document.getElementById('breathText');
    let isInhale = true;

    const breathe = () => {
        breathText.textContent = isInhale ? '吸气...' : '呼气...';
        isInhale = !isInhale;
    };

    breathe();
    setInterval(breathe, 4000);
}

function startCountdown() {
    const countdownEl = document.getElementById('panicCountdown');
    panicCountdown = 10;
    countdownEl.textContent = panicCountdown;

    panicInterval = setInterval(() => {
        panicCountdown--;
        countdownEl.textContent = panicCountdown;
        if (panicCountdown <= 0) {
            clearInterval(panicInterval);
        }
    }, 1000);
}

function completePanic() {
    const modal = document.getElementById('panicModal');
    const capturing = document.getElementById('panicCapturing');
    const result = document.getElementById('panicResult');

    hasPendingPanic = false;
    appState.hasUnresolvedPanic = false;
    appState.panicCount++;
    appState.energyValue = Math.min(100, appState.energyValue + 5);

    const log = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        moodTag: 'Panic',
        note: 'Panic成功化解',
        type: 'panic'
    };
    appState.logs.unshift(log);
    appState.moodStats['Panic'] = (appState.moodStats['Panic'] || 0) + 1;

    AppData.save(appState);

    modal.classList.remove('active');
    capturing.style.display = 'flex';
    result.classList.add('hidden');
    document.getElementById('breathText').textContent = '吸气...';

    updateHomeDisplay();
    updateLogDisplay();
    showToast('Panic成功！正气值+5');
}

function completePendingPanic() {
    hasPendingPanic = false;
    appState.panicCount++;
    appState.energyValue = Math.min(100, appState.energyValue + 3);

    const log = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        moodTag: 'Panic',
        note: '上次Panic延迟记录',
        type: 'panic'
    };
    appState.logs.unshift(log);
    appState.moodStats['Panic'] = (appState.moodStats['Panic'] || 0) + 1;

    AppData.save(appState);
    updateHomeDisplay();
    updateLogDisplay();
    showToast('已记录，正气值+3');
}

// ========================================
// 日志模块
// ========================================
function initLog() {
    const addLogBtn = document.getElementById('addLogBtn');
    const logModal = document.getElementById('logModal');
    const saveBtn = document.getElementById('saveLog');
    const cancelBtn = document.getElementById('cancelLog');
    const moodBtns = document.querySelectorAll('.mood-btn');

    let selectedMood = null;

    addLogBtn.addEventListener('click', () => {
        selectedDateForLog = new Date().toDateString();
        openLogModal(selectedDateForLog, true);
    });

    cancelBtn.addEventListener('click', () => {
        logModal.classList.remove('active');
    });

    moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            moodBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedMood = btn.dataset.mood;

            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        });
    });

    saveBtn.addEventListener('click', () => {
        const selected = document.querySelector('.mood-btn.selected');
        if (selected) {
            const mood = selected.dataset.mood;
            const existingCheckIn = appState.checkIns[selectedDateForLog];

            // 检查是否已有日记
            if (existingCheckIn && existingCheckIn.mood) {
                if (confirm('今天已经写过日记了，如果你想要保存的话，你将覆盖上一篇内容')) {
                    saveLog(mood, selectedDateForLog);
                    logModal.classList.remove('active');
                }
            } else {
                saveLog(mood, selectedDateForLog);
                logModal.classList.remove('active');
            }
        } else {
            showToast('请选择心情标签');
        }
    });

    logModal.addEventListener('click', (e) => {
        if (e.target === logModal) {
            logModal.classList.remove('active');
        }
    });

    updateLogDisplay();
}

function updateLogDisplay() {
    const logList = document.getElementById('logList');
    const totalPanic = document.getElementById('totalPanic');
    const topTrigger = document.getElementById('topTrigger');

    totalPanic.textContent = appState.panicCount;

    const stats = appState.moodStats;
    let maxCount = 0;
    let topMood = '--';

    for (const [mood, count] of Object.entries(stats)) {
        if (mood !== 'Panic' && count > maxCount) {
            maxCount = count;
            topMood = mood;
        }
    }

    topTrigger.textContent = topMood;

    if (appState.logs.length === 0) {
        logList.innerHTML = `
            <div class="empty-state glass-card">
                <svg viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="40" r="35" stroke="rgba(139,92,246,0.3)" stroke-width="2" stroke-dasharray="5 5"/>
                    <path d="M40 25V40L50 50" stroke="rgba(139,92,246,0.5)" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p>暂无日志记录</p>
                <span>点击日历或打卡来记录心情</span>
            </div>
        `;
        return;
    }

    logList.innerHTML = appState.logs.slice(0, 20).map(log => {
        const date = new Date(log.timestamp);
        const dateStr = `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

        return `
            <div class="log-item glass-card" data-log-id="${log.id}">
                <div class="log-item-header">
                    <span class="log-date">${dateStr}</span>
                    <span class="log-mood">
                        <span>${moodEmojis[log.moodTag] || '❓'}</span>
                        ${log.moodTag}
                    </span>
                </div>
                ${log.note ? `<p class="log-note-preview">${log.note}</p>` : ''}
                <button class="log-delete-btn" onclick="deleteLog(${log.id})">删除</button>
            </div>
        `;
    }).join('');
}

// 删除日志
function deleteLog(logId) {
    if (!confirm('确定要删除这条日记吗？')) return;

    const logIndex = appState.logs.findIndex(log => log.id === logId);
    if (logIndex === -1) return;

    const log = appState.logs[logIndex];

    // 从checkIns中移除对应的心情记录
    const dateStr = log.dateStr;
    if (dateStr && appState.checkIns[dateStr]) {
        delete appState.checkIns[dateStr].mood;
        delete appState.checkIns[dateStr].note;
    }

    // 更新心情统计
    if (log.moodTag && appState.moodStats[log.moodTag]) {
        appState.moodStats[log.moodTag]--;
        if (appState.moodStats[log.moodTag] <= 0) {
            delete appState.moodStats[log.moodTag];
        }
    }

    // 从日志列表中移除
    appState.logs.splice(logIndex, 1);

    AppData.save(appState);
    renderCalendar();
    updateLogDisplay();
    showToast('日记已删除');
}

// ========================================
// 设置模块
// ========================================
function initSettings() {
    const resetBtn = document.getElementById('resetDataBtn');

    resetBtn.addEventListener('click', () => {
        if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
            appState = AppData.reset();
            updateHomeDisplay();
            renderCalendar();
            updateLogDisplay();
            showToast('所有数据已清除');
        }
    });

    // 初始化提现金额显示
    updateWithdrawAmount();
}

// 更新提现金额显示
function updateWithdrawAmount() {
    const amountEl = document.getElementById('withdrawAmount');
    if (amountEl) {
        amountEl.textContent = appState.referralEarnings.toFixed(1);
    }
}

// 生成12位邀请码
function generateInviteCode() {
    if (!appState.inviteCode) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        appState.inviteCode = code;
        AppData.save(appState);
    }
    return appState.inviteCode;
}

// 显示拉新返利弹窗
function showReferralModal() {
    const code = generateInviteCode();

    let modal = document.getElementById('referralModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'referralModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content glass-card referral-modal">
                <h3 class="modal-title">拉新返利</h3>
                <div class="referral-info">
                    <p class="referral-rule">每邀请1位新用户可获得返利：</p>
                    <ul class="referral-list">
                        <li>第1位好友：3元</li>
                        <li>第2位好友：4元</li>
                        <li>第5位好友：4元</li>
                        <li>之后每增加1位：4元</li>
                    </ul>
                    <p class="referral-tip">满8元可提现</p>
                </div>
                <div class="referral-code-box">
                    <p class="referral-code-label">您的邀请码</p>
                    <p class="referral-code" id="inviteCodeDisplay">${code}</p>
                    <button class="btn-copy" onclick="copyInviteCode()">复制邀请码</button>
                </div>
                <p class="referral-stats">已邀请好友：<span id="referralCount">${appState.referralCount}</span> 位</p>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="closeReferralModal()">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('inviteCodeDisplay').textContent = code;
    document.getElementById('referralCount').textContent = appState.referralCount;
    modal.classList.add('active');

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeReferralModal();
        }
    });
}

// 复制邀请码
function copyInviteCode() {
    const code = document.getElementById('inviteCodeDisplay').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('邀请码已复制');
    }).catch(() => {
        showToast('复制失败，请手动复制');
    });
}

// 关闭拉新返利弹窗
function closeReferralModal() {
    const modal = document.getElementById('referralModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// 显示提现弹窗
function showWithdrawModal() {
    let modal = document.getElementById('withdrawModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'withdrawModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content glass-card withdraw-modal">
                <h3 class="modal-title">提现</h3>
                <div class="withdraw-amount">
                    <p class="withdraw-label">当前可提现金额</p>
                    <p class="withdraw-value"><span id="withdrawValue">${appState.referralEarnings.toFixed(1)}</span> 元</p>
                </div>
                <p class="withdraw-tip">最低提现金额：8元</p>
                <div class="modal-actions">
                    <button id="confirmWithdraw" class="btn-primary">申请提现</button>
                    <button class="btn-secondary" onclick="closeWithdrawModal()">取消</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('confirmWithdraw').addEventListener('click', () => {
            if (appState.referralEarnings >= 8) {
                // 这里应该调用实际的提现API
                showToast('提现申请已提交，请等待审核');
                appState.referralEarnings = 0;
                AppData.save(appState);
                updateWithdrawAmount();
                closeWithdrawModal();
            } else {
                showToast('余额不足8元，无法提现');
            }
        });
    }

    document.getElementById('withdrawValue').textContent = appState.referralEarnings.toFixed(1);
    modal.classList.add('active');

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeWithdrawModal();
        }
    });
}

// 关闭提现弹窗
function closeWithdrawModal() {
    const modal = document.getElementById('withdrawModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ========================================
// 底部导航
// ========================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.dataset.tab;

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// ========================================
// Toast提示
// ========================================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ========================================
// 检查跨天
// ========================================
function checkDayChange() {
    const today = new Date().toDateString();
    const lastCheckIn = appState.lastCheckIn;

    if (lastCheckIn && lastCheckIn !== today) {
        const lastDate = new Date(lastCheckIn);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            appState.streakDays = 0;
            appState.energyValue = Math.max(0, appState.energyValue - 20);
            AppData.save(appState);
        }
    }
}

// ========================================
// 初始化应用
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    checkDayChange();
    checkPendingPanic();
    initOnboarding();
    initHome();
    initPanic();
    initLog();
    initSettings();
    initNavigation();

    // 初始化日志详情弹窗
    createLogDetailModal();

    console.log('布鲁计划已启动');
});

function checkPendingPanic() {
    if (appState.hasUnresolvedPanic) {
        setTimeout(() => {
            const pendingModal = document.getElementById('pendingPanicModal');
            if (pendingModal) {
                pendingModal.classList.add('active');
            }
        }, 500);
    }
}

window.AppData = AppData;
window.getState = () => appState;
