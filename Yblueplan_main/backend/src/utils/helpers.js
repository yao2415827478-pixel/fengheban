// 工具函数
const { v4: uuidv4 } = require('uuid');

// 生成唯一ID
function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}${timestamp}${random}`.toUpperCase();
}

// 生成用户ID
function generateUserId() {
  return generateId('U');
}

// 生成订单ID
function generateOrderId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PAY${date}${random}`;
}

// 生成邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BLUE';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 生成关系ID
function generateRelationId() {
  return generateId('REL');
}

// 生成流水ID
function generateLedgerId() {
  return generateId('LED');
}

// 生成提现ID
function generateWithdrawId() {
  return generateId('WD');
}

// 元转分
function yuanToFen(yuan) {
  return Math.round(yuan * 100);
}

// 分转元
function fenToYuan(fen) {
  return (fen / 100).toFixed(2);
}

// 计算邀请人奖励档位
function calculateInviterReward(inviteCount) {
  // 第1个：3元，第2个：4元，第3个：5元，第4个起：4元
  if (inviteCount === 0) return 3;
  if (inviteCount === 1) return 4;
  if (inviteCount === 2) return 5;
  return 4;
}

// 获取当前时间戳
function now() {
  return Date.now();
}

module.exports = {
  generateId,
  generateUserId,
  generateOrderId,
  generateInviteCode,
  generateRelationId,
  generateLedgerId,
  generateWithdrawId,
  yuanToFen,
  fenToYuan,
  calculateInviterReward,
  now
};
