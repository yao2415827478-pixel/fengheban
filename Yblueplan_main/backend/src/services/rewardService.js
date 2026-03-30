// 奖励服务
const { query, transaction } = require('../config/database');
const { generateLedgerId, calculateInviterReward, now } = require('../utils/helpers');

class RewardService {
  getExecutorQuery(executor = query) {
    return typeof executor === 'function' ? executor : executor.query.bind(executor);
  }

  async createNewcomerReward(relationId, orderId, userId, userPhone, executor = query) {
    const ledgerId = generateLedgerId();
    const transactionId = `TX_NEW_${relationId}_${Date.now()}`;
    const currentTime = now();
    const runQuery = this.getExecutorQuery(executor);

    await runQuery(
      `INSERT INTO reward_ledger 
       (ledger_id, relation_id, order_id, user_id, user_phone, reward_type, amount, status, 
        transaction_id, created_at, available_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        ledgerId,
        relationId,
        orderId,
        userId,
        userPhone,
        'newcomer_bonus',
        2.0,
        'available',
        transactionId,
        currentTime,
        currentTime,
        currentTime
      ]
    );

    return {
      ledgerId,
      rewardType: 'newcomer_bonus',
      amount: 2.0,
      status: 'available',
      transactionId
    };
  }

  async createInviterReward(relationId, orderId, inviterUserId, inviterPhone, inviteCount, executor = query) {
    const rewardAmount = calculateInviterReward(inviteCount);
    const ledgerId = generateLedgerId();
    const transactionId = `TX_INV_${relationId}_${Date.now()}`;
    const currentTime = now();
    const runQuery = this.getExecutorQuery(executor);

    await runQuery(
      `INSERT INTO reward_ledger 
       (ledger_id, relation_id, order_id, user_id, user_phone, reward_type, amount, status, 
        transaction_id, meta_json, created_at, available_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        ledgerId,
        relationId,
        orderId,
        inviterUserId,
        inviterPhone,
        'inviter_reward',
        rewardAmount,
        'available',
        transactionId,
        JSON.stringify({ invite_count: inviteCount + 1, tier: this.getTier(inviteCount) }),
        currentTime,
        currentTime,
        currentTime
      ]
    );

    return {
      ledgerId,
      rewardType: 'inviter_reward',
      amount: rewardAmount,
      status: 'available',
      transactionId
    };
  }

  // 获取奖励档位
  getTier(inviteCount) {
    // 第1个：档位1(3元)，第2个：档位2(4元)，第3个：档位3(5元)，第4个起：档位4(4元)
    if (inviteCount === 0) return 1;
    if (inviteCount === 1) return 2;
    if (inviteCount === 2) return 3;
    return 4;
  }

  async processActivation(inviteeUserId) {
    return transaction(async (connection) => {
      const relations = await connection.query(
        `SELECT *
         FROM invite_relations
         WHERE invitee_user_id = $1
         LIMIT 1
         FOR UPDATE`,
        [inviteeUserId]
      );
      const relation = relations[0] || null;

      if (!relation) {
        return { success: false, error: 'RELATION_NOT_FOUND', message: '邀请关系不存在' };
      }

      const existingRewards = await connection.query(
        'SELECT ledger_id FROM reward_ledger WHERE relation_id = $1 AND reward_type = $2 LIMIT 1',
        [relation.relation_id, 'newcomer_bonus']
      );

      if (existingRewards.length > 0) {
        return {
          success: false,
          error: 'ALREADY_ACTIVATED',
          message: '已激活，无需重复结算',
          idempotent: true
        };
      }

      if (relation.status === 'activated') {
        return {
          success: false,
          error: 'RELATION_ALREADY_ACTIVATED',
          message: '邀请关系已激活，但奖励流水状态异常'
        };
      }

      if (relation.status !== 'bound') {
        return { success: false, error: 'RELATION_NOT_BOUND', message: '邀请关系未绑定' };
      }

      const inviters = await connection.query(
        'SELECT phone FROM users WHERE user_id = $1 LIMIT 1',
        [relation.inviter_user_id]
      );
      const inviterPhone = inviters[0]?.phone || relation.inviter_phone;

      const inviteCountResult = await connection.query(
        'SELECT COUNT(*) as count FROM invite_relations WHERE inviter_user_id = $1 AND status = $2',
        [relation.inviter_user_id, 'activated']
      );
      const inviteCount = parseInt(inviteCountResult[0]?.count, 10) || 0;
      const activatedAt = now();

      const newcomerReward = await this.createNewcomerReward(
        relation.relation_id,
        relation.order_id,
        inviteeUserId,
        relation.invitee_phone,
        connection
      );

      const inviterReward = await this.createInviterReward(
        relation.relation_id,
        relation.order_id,
        relation.inviter_user_id,
        inviterPhone,
        inviteCount,
        connection
      );

      await connection.query(
        'UPDATE invite_relations SET status = $1, activation_type = $2, activated_at = $3, updated_at = $4 WHERE relation_id = $5',
        ['activated', 'first_task_complete', activatedAt, activatedAt, relation.relation_id]
      );

      return {
        success: true,
        relationId: relation.relation_id,
        status: 'activated',
        activatedAt,
        newcomerReward,
        inviterReward
      };
    });
  }

  // 获取用户奖励汇总
  async getSummary(userId) {
    const withdrawStats = await query(
      `SELECT
        SUM(CASE WHEN status = 'processing' THEN amount ELSE 0 END) as processing_amount,
        SUM(CASE WHEN status IN ('processing', 'completed', 'approved') THEN amount ELSE 0 END) as locked_amount,
        SUM(CASE WHEN status IN ('completed', 'approved') THEN amount ELSE 0 END) as withdrawn_amount
       FROM withdraw_requests
       WHERE user_id = $1`,
      [userId]
    );

    const withdrawState = withdrawStats[0] || {};
    const lockedWithdrawAmount = parseFloat(withdrawState.locked_amount) || 0;
    const withdrawnAmount = parseFloat(withdrawState.withdrawn_amount) || 0;

    // 获取用户基本信息
    const users = await query(
      'SELECT invite_code FROM users WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    const myInviteCode = users[0]?.invite_code || '';

    // 获取激活奖励
    const activationRewards = await query(
      `SELECT amount FROM reward_ledger 
       WHERE user_id = $1 AND reward_type = $2 AND status = $3`,
      [userId, 'newcomer_bonus', 'available']
    );
    const activationBonus = activationRewards[0]?.amount || 0;

    // 获取邀请统计
    const inviteStats = await query(
      `SELECT 
        COUNT(*) as total_invited,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_reward,
        SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END) as available_reward,
        SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END) as withdrawn_reward
       FROM reward_ledger 
       WHERE user_id = $1 AND reward_type = $2`,
      [userId, 'inviter_reward']
    );

    const stats = inviteStats[0] || {};

    // 获取待结算事件
    const pendingEvents = await query(
      `SELECT 
        ledger_id as event_id,
        reward_type as type,
        amount,
        meta_json,
        created_at
       FROM reward_ledger 
       WHERE user_id = $1 AND reward_type = $2 AND status = $3
       ORDER BY created_at DESC`,
      [userId, 'inviter_reward', 'pending']
    );

    return {
      myInviteCode,
      activationBonus,
      totalInvited: parseInt(stats.total_invited) || 0,
      pendingReward: parseFloat(stats.pending_reward) || 0,
      withdrawableAmount: Math.max((parseFloat(stats.available_reward) || 0) - lockedWithdrawAmount, 0),
      withdrawnAmount,
      pendingSettlementEvents: pendingEvents.map(event => ({
        eventId: event.event_id,
        type: event.type,
        amount: event.amount,
        status: 'pending',
        createdAt: event.created_at,
        meta: typeof event.meta_json === 'string' ? JSON.parse(event.meta_json) : (event.meta_json || {})
      }))
    };
  }

  // 获取奖励流水
  async getLedger(userId, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    
    const list = await query(
      `SELECT 
        ledger_id,
        reward_type,
        amount,
        status,
        created_at,
        available_at,
        withdrawn_at
       FROM reward_ledger 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM reward_ledger WHERE user_id = $1',
      [userId]
    );

    return {
      total: parseInt(countResult[0]?.total) || 0,
      list: list.map(item => ({
        ledgerId: item.ledger_id,
        rewardType: item.reward_type,
        amount: item.amount,
        status: item.status,
        createdAt: item.created_at,
        availableAt: item.available_at,
        withdrawnAt: item.withdrawn_at
      }))
    };
  }
}

module.exports = new RewardService();
