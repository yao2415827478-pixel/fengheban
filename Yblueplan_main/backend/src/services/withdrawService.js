// 提现服务
const { query, transaction } = require('../config/database');
const { generateWithdrawId, now } = require('../utils/helpers');

class WithdrawService {
  async findByWithdrawId(withdrawId) {
    const rows = await query(
      'SELECT * FROM withdraw_requests WHERE withdraw_id = $1 LIMIT 1',
      [withdrawId]
    );

    return rows[0] || null;
  }

  async getWithdrawableBalance(userId) {
    const rewardResult = await query(
      `SELECT SUM(amount) as available_reward
       FROM reward_ledger
       WHERE user_id = $1 AND reward_type = $2 AND status = $3`,
      [userId, 'inviter_reward', 'available']
    );

    const withdrawResult = await query(
      `SELECT SUM(amount) as locked_amount
       FROM withdraw_requests
       WHERE user_id = $1 AND status IN ('processing', 'completed', 'approved')`,
      [userId]
    );

    const availableReward = parseFloat(rewardResult[0]?.available_reward) || 0;
    const lockedAmount = parseFloat(withdrawResult[0]?.locked_amount) || 0;

    return Math.max(availableReward - lockedAmount, 0);
  }

  async getRequestList(status = 'processing', page = 1, pageSize = 20) {
    const normalizedPage = Math.max(parseInt(page, 10) || 1, 1);
    const normalizedPageSize = Math.max(parseInt(pageSize, 10) || 20, 1);
    const offset = (normalizedPage - 1) * normalizedPageSize;

    const params = [];
    let whereSql = '';

    if (status && status !== 'all') {
      params.push(status);
      whereSql = `WHERE status = $${params.length}`;
    }

    params.push(normalizedPageSize, offset);
    const limitPlaceholder = `$${params.length - 1}`;
    const offsetPlaceholder = `$${params.length}`;

    const list = await query(
      `SELECT
        withdraw_id,
        user_id,
        user_phone,
        amount,
        channel,
        account,
        account_name,
        status,
        remark,
        transaction_id,
        apply_time,
        process_time
       FROM withdraw_requests
       ${whereSql}
       ORDER BY apply_time DESC
       LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
      params
    );

    const countParams = [];
    let countWhereSql = '';

    if (status && status !== 'all') {
      countParams.push(status);
      countWhereSql = `WHERE status = $1`;
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM withdraw_requests ${countWhereSql}`,
      countParams
    );

    return {
      total: parseInt(countResult[0]?.total, 10) || 0,
      list: list.map(item => ({
        withdrawId: item.withdraw_id,
        userId: item.user_id,
        userPhone: item.user_phone,
        amount: item.amount,
        channel: item.channel,
        account: item.account,
        accountName: item.account_name,
        status: item.status,
        remark: item.remark,
        transactionId: item.transaction_id,
        applyTime: item.apply_time,
        processTime: item.process_time
      }))
    };
  }

  // 申请提现
  async apply(userId, userPhone, amount, channel, account, accountName) {
    // 校验金额
    if (amount < 8) {
      return { 
        success: false, 
        error: 'WITHDRAW_AMOUNT_INVALID', 
        message: '满8元可申请提现' 
      };
    }

    // 查询可提现余额
    const availableBalance = await this.getWithdrawableBalance(userId);

    if (amount > availableBalance) {
      return { 
        success: false, 
        error: 'WITHDRAW_INSUFFICIENT_BALANCE', 
        message: '提现金额超过可提现余额' 
      };
    }

    // 检查提现频率（1分钟内只能申请一次）
    const recentWithdraw = await query(
      'SELECT * FROM withdraw_requests WHERE user_id = $1 AND apply_time > $2 LIMIT 1',
      [userId, now() - 60000]
    );

    if (recentWithdraw.length > 0) {
      return { 
        success: false, 
        error: 'WITHDRAW_TOO_FREQUENT', 
        message: '提现申请过于频繁，请稍后再试' 
      };
    }

    const withdrawId = generateWithdrawId();
    const currentTime = now();

    // 创建提现记录
    await query(
      `INSERT INTO withdraw_requests 
       (withdraw_id, user_id, user_phone, amount, channel, account, account_name, status, apply_time, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        withdrawId,
        userId,
        userPhone,
        amount,
        channel,
        account,
        accountName,
        'processing',
        currentTime,
        currentTime,
        currentTime
      ]
    );

    return {
      success: true,
      withdrawId,
      amount,
      status: 'processing',
      applyTime: currentTime
    };
  }

  // 获取提现记录
  async getRecords(userId, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    
    const list = await query(
      `SELECT 
        withdraw_id,
        amount,
        status,
        apply_time,
        process_time,
        remark
       FROM withdraw_requests 
       WHERE user_id = $1
       ORDER BY apply_time DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM withdraw_requests WHERE user_id = $1',
      [userId]
    );

    return {
      total: parseInt(countResult[0]?.total) || 0,
      list: list.map(item => ({
        withdrawId: item.withdraw_id,
        amount: item.amount,
        status: item.status,
        applyTime: item.apply_time,
        completeTime: item.process_time,
        remark: item.remark
      }))
    };
  }

  async processRequest(withdrawId, nextStatus, remark = '', transactionId = null) {
    const allowedStatuses = ['completed', 'approved', 'failed', 'rejected'];
    if (!allowedStatuses.includes(nextStatus)) {
      return {
        success: false,
        error: 'WITHDRAW_STATUS_INVALID',
        message: '提现处理状态不支持'
      };
    }

    const currentRequest = await this.findByWithdrawId(withdrawId);
    if (!currentRequest) {
      return {
        success: false,
        error: 'WITHDRAW_NOT_FOUND',
        message: '提现申请不存在'
      };
    }

    if (currentRequest.status !== 'processing') {
      return {
        success: false,
        error: 'WITHDRAW_ALREADY_PROCESSED',
        message: '提现申请已处理'
      };
    }

    const currentTime = now();
    await query(
      `UPDATE withdraw_requests
       SET status = $1, remark = $2, transaction_id = $3, process_time = $4, updated_at = $5
       WHERE withdraw_id = $6`,
      [
        nextStatus,
        remark || null,
        transactionId || null,
        currentTime,
        currentTime,
        withdrawId
      ]
    );

    return {
      success: true,
      withdrawId,
      status: nextStatus,
      processTime: currentTime,
      remark: remark || null,
      transactionId: transactionId || null
    };
  }
}

module.exports = new WithdrawService();
