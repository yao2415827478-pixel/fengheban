const crypto = require('crypto');
const dayjs = require('dayjs');

const DEFAULT_GATEWAY = 'https://openapi.alipay.com/gateway.do';
const APP_PAY_METHOD = 'alipay.trade.app.pay';
const QUERY_METHOD = 'alipay.trade.query';
const SIGN_TYPE = 'RSA2';
const CHARSET = 'utf-8';
const VERSION = '1.0';

function wrapPem(rawKey, label) {
  if (!rawKey) return '';

  const normalized = String(rawKey)
    .trim()
    .replace(/\\n/g, '\n');

  if (normalized.includes('BEGIN')) {
    return normalized;
  }

  const chunks = normalized.match(/.{1,64}/g) || [];
  return [
    `-----BEGIN ${label}-----`,
    ...chunks,
    `-----END ${label}-----`
  ].join('\n');
}

function buildSignContent(params = {}, options = {}) {
  const { excludeSignType = false } = options;
  return Object.keys(params)
    .filter((key) => (
      params[key] !== undefined &&
      params[key] !== null &&
      params[key] !== '' &&
      key !== 'sign' &&
      (!excludeSignType || key !== 'sign_type')
    ))
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
}

class AlipayService {
  getConfig() {
    return {
      appId: process.env.ALIPAY_APP_ID || '',
      gateway: process.env.ALIPAY_GATEWAY || DEFAULT_GATEWAY,
      notifyUrl: process.env.ALIPAY_NOTIFY_URL || '',
      returnUrl: process.env.ALIPAY_RETURN_URL || '',
      privateKey: wrapPem(process.env.ALIPAY_PRIVATE_KEY || '', 'PRIVATE KEY'),
      alipayPublicKey: wrapPem(process.env.ALIPAY_ALIPAY_PUBLIC_KEY || process.env.ALIPAY_PUBLIC_KEY || '', 'PUBLIC KEY')
    };
  }

  ensureConfigured() {
    const config = this.getConfig();
    const missing = [];

    if (!config.appId) missing.push('ALIPAY_APP_ID');
    if (!config.privateKey) missing.push('ALIPAY_PRIVATE_KEY');
    if (!config.alipayPublicKey) missing.push('ALIPAY_ALIPAY_PUBLIC_KEY');
    if (!config.notifyUrl) missing.push('ALIPAY_NOTIFY_URL');

    if (missing.length > 0) {
      const error = new Error(`支付宝配置缺失: ${missing.join(', ')}`);
      error.code = 'ALIPAY_CONFIG_MISSING';
      throw error;
    }

    return config;
  }

  buildCommonParams(method, bizContent = {}, extraParams = {}) {
    const config = this.ensureConfigured();

    const params = {
      app_id: config.appId,
      method,
      charset: CHARSET,
      sign_type: SIGN_TYPE,
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      version: VERSION,
      biz_content: JSON.stringify(bizContent),
      ...extraParams
    };

    if (method === APP_PAY_METHOD && config.notifyUrl) {
      params.notify_url = config.notifyUrl;
    }

    if (method === APP_PAY_METHOD && config.returnUrl) {
      params.return_url = config.returnUrl;
    }

    return params;
  }

  sign(params = {}) {
    const { privateKey } = this.ensureConfigured();
    const signContent = buildSignContent(params);
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signContent, 'utf8');
    signer.end();

    return signer.sign(privateKey, 'base64');
  }

  verify(params = {}, signature = '') {
    if (!signature) return false;

    const { alipayPublicKey } = this.ensureConfigured();
    const signContent = buildSignContent(params, { excludeSignType: true });
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signContent, 'utf8');
    verifier.end();

    return verifier.verify(alipayPublicKey, signature, 'base64');
  }

  buildSignedQuery(params = {}) {
    const sign = this.sign(params);
    return new URLSearchParams({
      ...params,
      sign
    }).toString();
  }

  createAppPayOrder({ orderId, totalAmount, subject, body = '' }) {
    const params = this.buildCommonParams(APP_PAY_METHOD, {
      out_trade_no: orderId,
      total_amount: Number(totalAmount).toFixed(2),
      subject,
      body,
      product_code: 'QUICK_MSECURITY_PAY',
      timeout_express: '30m'
    });

    return {
      orderStr: this.buildSignedQuery(params),
      params
    };
  }

  verifyNotifyPayload(payload = {}) {
    const normalizedPayload = { ...payload };
    const signature = normalizedPayload.sign || '';
    delete normalizedPayload.sign;

    return {
      valid: this.verify(normalizedPayload, signature),
      signature,
      payload: normalizedPayload
    };
  }

  async queryTrade(orderId) {
    const config = this.ensureConfigured();
    const params = this.buildCommonParams(QUERY_METHOD, {
      out_trade_no: orderId
    });

    const body = this.buildSignedQuery(params);
    const response = await fetch(config.gateway, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      body
    });

    const data = await response.json();
    const payload = data.alipay_trade_query_response || {};

    if (!response.ok) {
      return {
        success: false,
        error: `支付宝网关请求失败: HTTP ${response.status}`,
        raw: data
      };
    }

    if (payload.code !== '10000') {
      return {
        success: false,
        error: payload.sub_msg || payload.msg || '支付宝查单失败',
        code: payload.code || null,
        raw: data
      };
    }

    return {
      success: true,
      tradeStatus: payload.trade_status || '',
      tradeNo: payload.trade_no || '',
      totalAmount: payload.total_amount || '',
      buyerPayAmount: payload.buyer_pay_amount || '',
      raw: data
    };
  }
}

module.exports = new AlipayService();
