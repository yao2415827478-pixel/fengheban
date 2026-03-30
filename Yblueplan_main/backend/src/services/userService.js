// 用户服务
const { query, transaction } = require('../config/database');
const { generateUserId, generateInviteCode, now } = require('../utils/helpers');

class UserService {
  // 根据手机号查找用户
  async findByPhone(phone) {
    const users = await query(
      'SELECT * FROM users WHERE phone = $1 LIMIT 1',
      [phone]
    );
    return users[0] || null;
  }

  // 根据用户ID查找
  async findByUserId(userId) {
    const users = await query(
      'SELECT * FROM users WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    return users[0] || null;
  }

  // 根据邀请码查找
  async findByInviteCode(inviteCode) {
    const users = await query(
      'SELECT * FROM users WHERE invite_code = $1 LIMIT 1',
      [inviteCode]
    );
    return users[0] || null;
  }

  // 创建用户
  async createUser(phone, invitedByUserId = null) {
    const userId = generateUserId();
    const inviteCode = generateInviteCode();
    const currentTime = now();

    await query(
      `INSERT INTO users 
       (user_id, phone, nickname, invite_code, invited_by_user_id, register_time, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, phone, '战士', inviteCode, invitedByUserId, currentTime, currentTime, currentTime]
    );

    return this.findByUserId(userId);
  }

  // 更新用户开始日期
  async updateStartDate(userId, startDate) {
    await query(
      'UPDATE users SET start_date = $1, updated_at = $2 WHERE user_id = $3',
      [startDate, now(), userId]
    );
  }
}

module.exports = new UserService();
