// 邀请码服务
const { query, transaction } = require('../config/database');
const userService = require('./userService');
const { ErrorCodes } = require('../utils/response');

class InviteService {
  // 验证邀请码
  async validateInviteCode(inviteCode, currentUserPhone = null) {
    if (!inviteCode || inviteCode.length < 6) {
      return {
        valid: false,
        error: ErrorCodes.INVITE_CODE_INVALID,
        message: '邀请码格式错误'
      };
    }

    // 查找邀请码所属用户
    const inviter = await userService.findByInviteCode(inviteCode);
    
    if (!inviter) {
      return {
        valid: false,
        error: ErrorCodes.INVITE_CODE_INVALID,
        message: '邀请码不存在'
      };
    }

    // 检查是否使用自己的邀请码
    if (currentUserPhone && inviter.phone === currentUserPhone) {
      return {
        valid: false,
        error: ErrorCodes.INVITE_CODE_SELF_USE,
        message: '不能使用自己的邀请码'
      };
    }

    // 检查邀请人状态
    if (inviter.status !== 'active') {
      return {
        valid: false,
        error: ErrorCodes.INVITE_CODE_INVALID,
        message: '邀请码已失效'
      };
    }

    return {
      valid: true,
      inviteCode: inviteCode,
      discountAmount: 2.0,
      inviterId: inviter.user_id,
      inviterPhone: inviter.phone,
      inviterMaskedPhone: this.maskPhone(inviter.phone)
    };
  }

  // 创建邀请关系（支付成功后调用）
  async createRelation(orderId, inviterUserId, inviterPhone, inviteePhone, inviteCode) {
    const { generateRelationId, now } = require('../utils/helpers');
    const relationId = generateRelationId();
    const currentTime = now();

    await query(
      `INSERT INTO invite_relations 
       (relation_id, inviter_user_id, inviter_phone, invitee_phone, invite_code, order_id, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [relationId, inviterUserId, inviterPhone, inviteePhone, inviteCode, orderId, 'pending', currentTime, currentTime]
    );

    return relationId;
  }

  // 根据订单查找关系
  async findRelationByOrderId(orderId) {
    const relations = await query(
      'SELECT * FROM invite_relations WHERE order_id = $1 LIMIT 1',
      [orderId]
    );
    return relations[0] || null;
  }

  // 根据被邀请人查找关系
  async findRelationByInvitee(inviteeUserId) {
    const relations = await query(
      'SELECT * FROM invite_relations WHERE invitee_user_id = $1 LIMIT 1',
      [inviteeUserId]
    );
    return relations[0] || null;
  }

  // 绑定邀请关系（登录后调用）
  async bindRelation(orderId, inviteeUserId, inviteePhone) {
    const relation = await this.findRelationByOrderId(orderId);
    
    if (!relation) {
      return { success: false, error: 'RELATION_NOT_FOUND', message: '邀请关系不存在' };
    }

    if (relation.status !== 'pending') {
      return { success: false, error: 'RELATION_ALREADY_BOUND', message: '邀请关系已绑定' };
    }

    if (relation.invitee_phone !== inviteePhone) {
      return { success: false, error: 'PHONE_MISMATCH', message: '手机号与订单不匹配' };
    }

    const { now } = require('../utils/helpers');
    const currentTime = now();

    await query(
      'UPDATE invite_relations SET invitee_user_id = $1, status = $2, bound_at = $3, updated_at = $4 WHERE relation_id = $5',
      [inviteeUserId, 'bound', currentTime, currentTime, relation.relation_id]
    );

    return {
      success: true,
      relationId: relation.relation_id,
      status: 'bound',
      boundAt: currentTime
    };
  }

  // 激活邀请关系（首次完成任务后调用）
  async activateRelation(inviteeUserId, activationType = 'first_task_complete') {
    const relation = await this.findRelationByInvitee(inviteeUserId);
    
    if (!relation) {
      return { success: false, error: 'RELATION_NOT_FOUND', message: '邀请关系不存在' };
    }

    if (relation.status === 'activated') {
      return { success: false, error: 'RELATION_ALREADY_ACTIVATED', message: '已激活，无需重复结算' };
    }

    if (relation.status !== 'bound') {
      return { success: false, error: 'RELATION_NOT_BOUND', message: '邀请关系未绑定' };
    }

    const { now } = require('../utils/helpers');
    const currentTime = now();

    await query(
      'UPDATE invite_relations SET status = $1, activation_type = $2, activated_at = $3, updated_at = $4 WHERE relation_id = $5',
      ['activated', activationType, currentTime, currentTime, relation.relation_id]
    );

    return {
      success: true,
      relationId: relation.relation_id,
      status: 'activated',
      activatedAt: currentTime
    };
  }

  // 获取邀请人的邀请次数
  async getInviteCount(inviterUserId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM invite_relations WHERE inviter_user_id = $1 AND status = $2',
      [inviterUserId, 'activated']
    );
    return parseInt(result[0]?.count) || 0;
  }

  // 手机号脱敏
  maskPhone(phone) {
    if (!phone || phone.length !== 11) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(7);
  }
}

module.exports = new InviteService();
