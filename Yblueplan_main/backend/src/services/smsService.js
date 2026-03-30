// 短信验证码服务
// SMS_MODE=mock: 开发模式，固定验证码 123456，控制台输出
// SMS_MODE=aliyun: 生产模式，调用阿里云短信 API

const Dysmsapi20170525 = require('@alicloud/dysmsapi20170525');
const OpenApi = require('@alicloud/openapi-client');
const Util = require('@alicloud/tea-util');
const { query } = require('../config/database');
const { now } = require('../utils/helpers');

// 验证码有效期（毫秒）
const CODE_EXPIRE_MS = 5 * 60 * 1000; // 5分钟

// 发送频率限制（毫秒）
const SEND_INTERVAL_MS = 60 * 1000; // 60秒

class SmsService {
  constructor() {
    this.aliyunClient = null;
  }

  /**
   * 发送验证码
   * @param {string} phone - 手机号
   * @returns {Object} { success, message }
   */
  async sendCode(phone) {
    // 频率限制：检查上次发送时间
    const recentCodes = await query(
      'SELECT * FROM sms_codes WHERE phone = $1 AND created_at > $2 ORDER BY created_at DESC LIMIT 1',
      [phone, now() - SEND_INTERVAL_MS]
    );

    if (recentCodes.length > 0) {
      const waitSeconds = Math.ceil((SEND_INTERVAL_MS - (now() - recentCodes[0].created_at)) / 1000);
      return {
        success: false,
        message: `请${waitSeconds}秒后再试`,
        waitSeconds
      };
    }

    // 生成验证码
    const code = this._generateCode();
    const currentTime = now();
    const expiresAt = currentTime + CODE_EXPIRE_MS;

    // 存储验证码
    await query(
      'INSERT INTO sms_codes (phone, code, used, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)',
      [phone, code, false, expiresAt, currentTime]
    );

    // 发送验证码
    const smsMode = process.env.SMS_MODE || 'mock';

    if (smsMode === 'mock') {
      console.log(`📱 [短信模拟] 手机号: ${phone}, 验证码: ${code}`);
      return { success: true, message: '验证码已发送（开发模式）' };
    }

    if (smsMode === 'aliyun') {
      try {
        await this._sendAliyunSms(phone, code);
        return { success: true, message: '验证码已发送' };
      } catch (error) {
        try {
          await query(
            'DELETE FROM sms_codes WHERE phone = $1 AND code = $2 AND created_at = $3',
            [phone, code, currentTime]
          );
        } catch (cleanupError) {
          console.error('短信发送失败后清理验证码记录失败:', cleanupError);
        }
        console.error('阿里云短信发送失败:', error);
        return { success: false, message: '短信发送失败，请稍后再试' };
      }
    }

    return { success: false, message: '短信服务未配置' };
  }

  /**
   * 验证验证码
   * @param {string} phone - 手机号
   * @param {string} code - 验证码
   * @returns {Object} { valid, message }
   */
  async verifyCode(phone, code) {
    // 开发模式下 123456 始终有效
    const smsMode = process.env.SMS_MODE || 'mock';
    if (smsMode === 'mock' && code === '123456') {
      return { valid: true };
    }

    // 查找最近未使用的有效验证码
    const currentTime = now();
    const codes = await query(
      'SELECT * FROM sms_codes WHERE phone = $1 AND code = $2 AND used = $3 AND expires_at > $4 ORDER BY created_at DESC LIMIT 1',
      [phone, code, false, currentTime]
    );

    if (codes.length === 0) {
      return { valid: false, message: '验证码错误或已过期' };
    }

    // 标记为已使用
    await query(
      'UPDATE sms_codes SET used = $1 WHERE id = $2',
      [true, codes[0].id]
    );

    return { valid: true };
  }

  /**
   * 生成6位数字验证码
   */
  _generateCode() {
    const smsMode = process.env.SMS_MODE || 'mock';

    // 开发模式固定返回 123456
    if (smsMode === 'mock') {
      return '123456';
    }

    // 生产模式随机生成
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 调用阿里云短信 API
   * @param {string} phone - 手机号
   * @param {string} code - 验证码
   */
  async _sendAliyunSms(phone, code) {
    const client = this._getAliyunClient();

    const sendSmsRequest = new Dysmsapi20170525.SendSmsRequest({
      phoneNumbers: phone,
      signName: process.env.SMS_SIGN_NAME,
      templateCode: process.env.SMS_TEMPLATE_CODE,
      templateParam: JSON.stringify({ code })
    });

    const runtime = new Util.RuntimeOptions({});
    const response = await client.sendSmsWithOptions(sendSmsRequest, runtime);
    const responseBody = response?.body || response || {};
    const responseCode = responseBody.code || responseBody.Code;

    if (responseCode !== 'OK') {
      throw new Error(responseBody.message || responseBody.Message || '阿里云短信返回失败');
    }

    return {
      bizId: responseBody.bizId || responseBody.BizId || null,
      requestId: responseBody.requestId || responseBody.RequestId || null
    };
  }

  _getAliyunClient() {
    if (this.aliyunClient) {
      return this.aliyunClient;
    }

    const accessKeyId = process.env.SMS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.SMS_ACCESS_KEY_SECRET;
    const signName = process.env.SMS_SIGN_NAME;
    const templateCode = process.env.SMS_TEMPLATE_CODE;

    if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
      throw new Error('阿里云短信配置不完整，请检查 SMS_ACCESS_KEY_ID / SMS_ACCESS_KEY_SECRET / SMS_SIGN_NAME / SMS_TEMPLATE_CODE');
    }

    const config = new OpenApi.Config({
      accessKeyId,
      accessKeySecret
    });
    config.endpoint = 'dysmsapi.aliyuncs.com';

    this.aliyunClient = new Dysmsapi20170525.default(config);
    return this.aliyunClient;
  }
}

module.exports = new SmsService();
