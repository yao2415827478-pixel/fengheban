const { query, transaction } = require('../config/database');
const { generateId, now } = require('../utils/helpers');

class AppDataService {
  mapJourneyHistoryRecord(record) {
    if (!record) {
      return null;
    }

    return {
      journeyId: record.journey_id,
      startDateKey: record.start_date_key,
      endDateKey: record.end_date_key,
      streakDays: record.streak_days || 0,
      endedReason: record.ended_reason || 'restart',
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }

  mapSurveyAssessment(record) {
    if (!record) {
      return null;
    }

    return {
      surveyId: record.survey_id,
      userId: record.user_id,
      phone: record.phone,
      score: record.score,
      answers: Array.isArray(record.answers_json) ? record.answers_json : (record.answers_json || []),
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }

  mapPublicSurveyAssessment(record) {
    if (!record) {
      return null;
    }

    return {
      surveyId: record.survey_id,
      score: record.score,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }

  async getLatestSurveyAssessment({ userId = null, phone = null } = {}) {
    let record = null;

    if (userId) {
      [record] = await query(
        `SELECT *
         FROM survey_assessments
         WHERE user_id = $1
         ORDER BY updated_at DESC, created_at DESC
         LIMIT 1`,
        [userId]
      );
    }

    if (!record && phone) {
      [record] = await query(
        `SELECT *
         FROM survey_assessments
         WHERE phone = $1
         ORDER BY updated_at DESC, created_at DESC
         LIMIT 1`,
        [phone]
      );
    }

    return this.mapSurveyAssessment(record);
  }

  async getState(userId) {
    const [user] = await query(
      'SELECT user_id, phone, current_goal, goal_days FROM users WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    const [[appState], latestSurvey] = await Promise.all([
      query(
        'SELECT * FROM user_app_states WHERE user_id = $1 LIMIT 1',
        [userId]
      ),
      this.getLatestSurveyAssessment({
        userId,
        phone: user?.phone || null
      })
    ]);

    return {
      userId,
      currentGoal: user?.current_goal || '完成90天戒色计划',
      goalDays: user?.goal_days || 90,
      appStartDate: appState?.app_start_date_key || null,
      currentDateKey: appState?.current_date_key || null,
      lastActiveDateKey: appState?.last_active_date_key || null,
      currentDayIndex: appState?.current_day_index || 1,
      inviteActivated: !!appState?.invite_activated,
      latestSurvey
    };
  }

  async saveState(userId, payload) {
    const currentTime = now();
    const currentState = await this.getState(userId);
    const nextState = {
      ...currentState,
      ...payload
    };

    await transaction(async (connection) => {
      if (payload.currentGoal !== undefined || payload.goalDays !== undefined) {
        await connection.query(
          `UPDATE users
           SET current_goal = $1, goal_days = $2, updated_at = $3
           WHERE user_id = $4`,
          [
            nextState.currentGoal,
            nextState.goalDays,
            currentTime,
            userId
          ]
        );
      }

      await connection.query(
        `INSERT INTO user_app_states
         (user_id, app_start_date_key, current_date_key, last_active_date_key, current_day_index, invite_activated, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id) DO UPDATE SET
           app_start_date_key = EXCLUDED.app_start_date_key,
           current_date_key = EXCLUDED.current_date_key,
           last_active_date_key = EXCLUDED.last_active_date_key,
           current_day_index = EXCLUDED.current_day_index,
           invite_activated = EXCLUDED.invite_activated,
           updated_at = EXCLUDED.updated_at`,
        [
          userId,
          nextState.appStartDate,
          nextState.currentDateKey,
          nextState.lastActiveDateKey,
          nextState.currentDayIndex,
          nextState.inviteActivated,
          currentTime,
          currentTime
        ]
      );
    });

    return this.getState(userId);
  }

  async getDailyRecords(userId) {
    const records = await query(
      `SELECT *
       FROM user_daily_records
       WHERE user_id = $1
       ORDER BY date_key DESC`,
      [userId]
    );

    return records.map((record) => ({
      dateKey: record.date_key,
      dayIndex: record.day_index,
      checked: !!record.checked,
      checkInTime: record.check_in_time,
      journalContent: record.journal_content,
      journalMood: record.journal_mood,
      journalTopic: record.journal_topic,
      tasks: Array.isArray(record.tasks_json) ? record.tasks_json : (record.tasks_json || []),
      createdAt: record.created_at,
      updatedAt: record.updated_at
    }));
  }

  async getDailyRecord(userId, dateKey) {
    const [record] = await query(
      'SELECT * FROM user_daily_records WHERE user_id = $1 AND date_key = $2 LIMIT 1',
      [userId, dateKey]
    );

    if (!record) {
      return null;
    }

    return {
      dateKey: record.date_key,
      dayIndex: record.day_index,
      checked: !!record.checked,
      checkInTime: record.check_in_time,
      journalContent: record.journal_content,
      journalMood: record.journal_mood,
      journalTopic: record.journal_topic,
      tasks: Array.isArray(record.tasks_json) ? record.tasks_json : (record.tasks_json || []),
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }

  async saveDailyRecord(userId, dateKey, payload) {
    const currentTime = now();
    const existing = await this.getDailyRecord(userId, dateKey);
    const nextRecord = {
      dateKey,
      dayIndex: payload.dayIndex !== undefined ? payload.dayIndex : existing?.dayIndex || null,
      checked: payload.checked !== undefined ? !!payload.checked : !!existing?.checked,
      checkInTime: payload.checkInTime !== undefined
        ? payload.checkInTime
        : (existing?.checkInTime || null),
      journalContent: payload.journalContent !== undefined
        ? payload.journalContent
        : (existing?.journalContent || null),
      journalMood: payload.journalMood !== undefined
        ? payload.journalMood
        : (existing?.journalMood || null),
      journalTopic: payload.journalTopic !== undefined
        ? payload.journalTopic
        : (existing?.journalTopic || null),
      tasks: payload.tasks !== undefined
        ? payload.tasks
        : (existing?.tasks || [])
    };

    await query(
      `INSERT INTO user_daily_records
       (user_id, date_key, day_index, checked, check_in_time, journal_content, journal_mood, journal_topic, tasks_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id, date_key) DO UPDATE SET
         day_index = EXCLUDED.day_index,
         checked = EXCLUDED.checked,
         check_in_time = EXCLUDED.check_in_time,
         journal_content = EXCLUDED.journal_content,
         journal_mood = EXCLUDED.journal_mood,
         journal_topic = EXCLUDED.journal_topic,
         tasks_json = EXCLUDED.tasks_json,
         updated_at = EXCLUDED.updated_at`,
      [
        userId,
        dateKey,
        nextRecord.dayIndex,
        nextRecord.checked,
        nextRecord.checkInTime,
        nextRecord.journalContent,
        nextRecord.journalMood,
        nextRecord.journalTopic,
        JSON.stringify(nextRecord.tasks || []),
        existing?.createdAt || currentTime,
        currentTime
      ]
    );

    return this.getDailyRecord(userId, dateKey);
  }

  async deleteJournal(userId, dateKey) {
    const existing = await this.getDailyRecord(userId, dateKey);
    if (!existing) {
      return { deleted: false };
    }

    const hasTasks = Array.isArray(existing.tasks) && existing.tasks.length > 0;
    const shouldDeleteRow = !existing.checked && !hasTasks;

    if (shouldDeleteRow) {
      await query(
        'DELETE FROM user_daily_records WHERE user_id = $1 AND date_key = $2',
        [userId, dateKey]
      );
      return { deleted: true };
    }

    await this.saveDailyRecord(userId, dateKey, {
      journalContent: null,
      journalMood: null,
      journalTopic: null
    });

    return { deleted: true };
  }

  async getBootstrap(userId) {
    const [state, dailyRecords, journeyHistories] = await Promise.all([
      this.getState(userId),
      this.getDailyRecords(userId),
      this.getJourneyHistories(userId)
    ]);

    return {
      state,
      dailyRecords,
      journeyHistories
    };
  }

  async getJourneyHistories(userId) {
    const records = await query(
      `SELECT *
       FROM user_journey_histories
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return records.map((record) => this.mapJourneyHistoryRecord(record));
  }

  async createJourneyHistory(userId, payload) {
    const currentTime = now();
    const journeyId = generateId('JR');

    await query(
      `INSERT INTO user_journey_histories
       (journey_id, user_id, start_date_key, end_date_key, streak_days, ended_reason, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        journeyId,
        userId,
        payload.startDateKey,
        payload.endDateKey || null,
        payload.streakDays || 0,
        payload.endedReason || 'restart',
        currentTime,
        currentTime
      ]
    );

    return {
      journeyId,
      startDateKey: payload.startDateKey,
      endDateKey: payload.endDateKey || null,
      streakDays: payload.streakDays || 0,
      endedReason: payload.endedReason || 'restart',
      createdAt: currentTime,
      updatedAt: currentTime
    };
  }

  async restartJourney(userId, payload = {}) {
    const currentTime = now();
    const nextStartDateKey = payload.startDateKey;

    if (!nextStartDateKey) {
      throw new Error('缺少新的旅程开始日期');
    }

    await transaction(async (connection) => {
      if (payload.archiveCurrentJourney && payload.currentJourney?.startDateKey) {
        const journeyId = generateId('JR');

        await connection.query(
          `INSERT INTO user_journey_histories
           (journey_id, user_id, start_date_key, end_date_key, streak_days, ended_reason, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            journeyId,
            userId,
            payload.currentJourney.startDateKey,
            payload.currentJourney.endDateKey || null,
            payload.currentJourney.streakDays || 0,
            payload.currentJourney.endedReason || 'restart',
            currentTime,
            currentTime
          ]
        );
      }

      const [currentUserState] = await connection.query(
        'SELECT * FROM user_app_states WHERE user_id = $1 LIMIT 1',
        [userId]
      );

      await connection.query(
        `INSERT INTO user_app_states
         (user_id, app_start_date_key, current_date_key, last_active_date_key, current_day_index, invite_activated, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id) DO UPDATE SET
           app_start_date_key = EXCLUDED.app_start_date_key,
           current_date_key = EXCLUDED.current_date_key,
           last_active_date_key = EXCLUDED.last_active_date_key,
           current_day_index = EXCLUDED.current_day_index,
           invite_activated = EXCLUDED.invite_activated,
           updated_at = EXCLUDED.updated_at`,
        [
          userId,
          nextStartDateKey,
          nextStartDateKey,
          nextStartDateKey,
          1,
          currentUserState?.invite_activated || false,
          currentUserState?.created_at || currentTime,
          currentTime
        ]
      );
    });

    return this.getBootstrap(userId);
  }

  async submitSurveyAssessment(payload) {
    const currentTime = now();
    const surveyId = generateId('SV');

    await query(
      `INSERT INTO survey_assessments
       (survey_id, user_id, phone, score, answers_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        surveyId,
        payload.userId || null,
        payload.phone || null,
        payload.score,
        JSON.stringify(payload.answers || []),
        currentTime,
        currentTime
      ]
    );

    return {
      surveyId,
      userId: payload.userId || null,
      phone: payload.phone || null,
      score: payload.score,
      answers: payload.answers || [],
      createdAt: currentTime,
      updatedAt: currentTime
    };
  }

  async getSurveyAssessment(surveyId) {
    const [record] = await query(
      'SELECT * FROM survey_assessments WHERE survey_id = $1 LIMIT 1',
      [surveyId]
    );

    return this.mapSurveyAssessment(record);
  }

  async getWithdrawAccount(userId) {
    const [record] = await query(
      'SELECT * FROM user_withdraw_accounts WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (!record) {
      return null;
    }

    return {
      accountType: record.account_type,
      accountNo: record.account_no,
      accountName: record.account_name,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }

  async saveWithdrawAccount(userId, payload) {
    const currentTime = now();
    const current = await this.getWithdrawAccount(userId);

    await query(
      `INSERT INTO user_withdraw_accounts
       (user_id, account_type, account_no, account_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         account_type = EXCLUDED.account_type,
         account_no = EXCLUDED.account_no,
         account_name = EXCLUDED.account_name,
         updated_at = EXCLUDED.updated_at`,
      [
        userId,
        payload.accountType || 'alipay',
        payload.accountNo,
        payload.accountName,
        current?.createdAt || currentTime,
        currentTime
      ]
    );

    return this.getWithdrawAccount(userId);
  }
}

module.exports = new AppDataService();
