// 路由注册
const express = require('express');
const { success, error, ErrorCodes } = require('../utils/response');
const { authMiddleware, verifyToken } = require('../config/jwt');
const { query } = require('../config/database');

// 服务
const userService = require('../services/userService');
const inviteService = require('../services/inviteService');
const alipayService = require('../services/alipayService');
const paymentService = require('../services/paymentService');
const rewardService = require('../services/rewardService');
const withdrawService = require('../services/withdrawService');
const smsService = require('../services/smsService');
const appDataService = require('../services/appDataService');
const { generateToken } = require('../config/jwt');

const router = express.Router();

const isLocalDevelopmentRequest = (req) => {
  const host = req.headers.host || '';
  const origin = req.headers.origin || '';
  return (
    process.env.NODE_ENV !== 'production' ||
    /localhost|127\.0\.0\.1/.test(host) ||
    /localhost|127\.0\.0\.1/.test(origin)
  );
};

const internalAdminMiddleware = (req, res, next) => {
  const configuredKey = process.env.INTERNAL_ADMIN_KEY;
  const providedKey = req.headers['x-internal-admin-key'];

  if (!configuredKey) {
    return res.status(503).json(error(ErrorCodes.INTERNAL_ERROR, '内部管理密钥未配置'));
  }

  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json(error(ErrorCodes.UNAUTHORIZED, '内部管理鉴权失败'));
  }

  next();
};

// 健康检查
router.get('/health', (req, res) => {
  res.json(success({ status: 'ok', time: Date.now() }));
});

// ==================== 1. 认证接口 ====================

// POST /api/auth/send-code - 发送短信验证码
router.post('/api/auth/send-code', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^1\d{10}$/.test(phone)) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供正确的手机号'));
    }

    const result = await smsService.sendCode(phone);

    if (!result.success) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, result.message));
    }

    res.json(success({ message: result.message }));
  } catch (err) {
    console.error('发送验证码失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

// POST /api/auth/login - 登录/注册
router.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, code, surveyId } = req.body;

    if (!phone || !code) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供手机号和验证码'));
    }

    // 验证验证码
    const verification = await smsService.verifyCode(phone, code);
    if (!verification.valid) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, verification.message || '验证码错误'));
    }

    // 查找或创建用户
    let user = await userService.findByPhone(phone);
    const isNewUser = !user;

    if (isNewUser) {
      user = await userService.createUser(phone);
    }

    await paymentService.attachOrdersToUserByPhone(user.user_id, user.phone);
    const access = await paymentService.getAccessStatus(user.user_id, user.phone);

    if (surveyId) {
      const surveyRecord = await appDataService.getSurveyAssessment(surveyId);
      if (surveyRecord && !surveyRecord.userId) {
        await query(
          `UPDATE survey_assessments
           SET user_id = $1, phone = $2, updated_at = $3
           WHERE survey_id = $4`,
          [user.user_id, user.phone, Date.now(), surveyId]
        );
      }
    }

    const survey = await appDataService.getLatestSurveyAssessment({
      userId: user.user_id,
      phone: user.phone
    });

    // 生成 JWT
    const token = generateToken({
      userId: user.user_id,
      phone: user.phone
    });

    res.json(success({
      token,
      user: {
        userId: user.user_id,
        phone: user.phone,
        nickname: user.nickname,
        inviteCode: user.invite_code,
        registerTime: user.register_time
      },
      access,
      survey,
      hasCompletedSurvey: !!survey,
      isNewUser
    }));
  } catch (err) {
    console.error('登录失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.post('/api/survey/submit', async (req, res) => {
  try {
    const { score, answers, phone, userId } = req.body;

    if (typeof score !== 'number' || !Array.isArray(answers) || answers.length === 0) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供完整的问卷结果'));
    }

    const result = await appDataService.submitSurveyAssessment({
      score,
      answers,
      phone,
      userId
    });

    res.json(success(result));
  } catch (err) {
    console.error('提交问卷结果失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.get('/api/survey/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const result = await appDataService.getSurveyAssessment(surveyId);

    if (!result) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '问卷结果不存在'));
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const requester = token ? verifyToken(token) : null;
    const canViewFullResult = !!requester && (
      (result.userId && requester.userId === result.userId) ||
      (result.phone && requester.phone === result.phone)
    );

    res.json(success(
      canViewFullResult ? result : appDataService.mapPublicSurveyAssessment({
        survey_id: result.surveyId,
        score: result.score,
        created_at: result.createdAt,
        updated_at: result.updatedAt
      })
    ));
  } catch (err) {
    console.error('获取问卷结果失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

// GET /api/auth/user-info - 获取当前用户信息
router.get('/api/auth/user-info', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await userService.findByUserId(userId);
    const appState = await appDataService.getState(userId);
    const access = await paymentService.getAccessStatus(userId, user?.phone);

    if (!user) {
      return res.json(error(ErrorCodes.UNAUTHORIZED, '用户不存在'));
    }

    res.json(success({
      userId: user.user_id,
      phone: user.phone,
      nickname: user.nickname,
      inviteCode: user.invite_code,
      registerTime: user.register_time,
      startDate: user.start_date,
      appStartDate: appState.appStartDate,
      currentDateKey: appState.currentDateKey,
      lastActiveDateKey: appState.lastActiveDateKey,
      currentDayIndex: appState.currentDayIndex,
      currentGoal: appState.currentGoal,
      goalDays: appState.goalDays,
      inviteActivated: appState.inviteActivated,
      hasPaid: access.hasPaid,
      latestPaidOrderId: access.latestPaidOrderId,
      latestPaidAt: access.latestPaidAt,
      hasCompletedSurvey: !!appState.latestSurvey,
      latestSurvey: appState.latestSurvey
    }));
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.get('/api/app/bootstrap', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await appDataService.getBootstrap(userId);
    res.json(success(result));
  } catch (err) {
    console.error('获取应用初始化数据失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.put('/api/app/state', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      appStartDate,
      currentDateKey,
      lastActiveDateKey,
      currentDayIndex,
      currentGoal,
      goalDays,
      inviteActivated
    } = req.body;

    const result = await appDataService.saveState(userId, {
      appStartDate,
      currentDateKey,
      lastActiveDateKey,
      currentDayIndex,
      currentGoal,
      goalDays,
      inviteActivated
    });

    res.json(success(result));
  } catch (err) {
    console.error('保存应用状态失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.put('/api/app/daily-record/:dateKey', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { dateKey } = req.params;

    if (!dateKey) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供日期'));
    }

    const result = await appDataService.saveDailyRecord(userId, dateKey, req.body || {});
    res.json(success(result));
  } catch (err) {
    console.error('保存每日记录失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.get('/api/app/daily-record/:dateKey', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { dateKey } = req.params;

    if (!dateKey) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供日期'));
    }

    const result = await appDataService.getDailyRecord(userId, dateKey);
    res.json(success(result));
  } catch (err) {
    console.error('获取每日记录失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.delete('/api/app/daily-record/:dateKey/journal', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { dateKey } = req.params;

    if (!dateKey) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供日期'));
    }

    const result = await appDataService.deleteJournal(userId, dateKey);
    res.json(success(result));
  } catch (err) {
    console.error('删除日记失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.get('/api/app/journey-history', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await appDataService.getJourneyHistories(userId);
    res.json(success(result));
  } catch (err) {
    console.error('获取旅程历史失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.post('/api/app/journey-history', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { startDateKey, endDateKey, streakDays, endedReason } = req.body;

    if (!startDateKey) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供旅程开始日期'));
    }

    const result = await appDataService.createJourneyHistory(userId, {
      startDateKey,
      endDateKey,
      streakDays,
      endedReason
    });

    res.json(success(result));
  } catch (err) {
    console.error('保存旅程历史失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.post('/api/app/journey/restart', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { startDateKey, archiveCurrentJourney, currentJourney } = req.body || {};

    if (!startDateKey) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供新的旅程开始日期'));
    }

    const result = await appDataService.restartJourney(userId, {
      startDateKey,
      archiveCurrentJourney: !!archiveCurrentJourney,
      currentJourney: currentJourney || null
    });

    res.json(success(result));
  } catch (err) {
    console.error('重启旅程失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.get('/api/app/withdraw-account', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await appDataService.getWithdrawAccount(userId);
    res.json(success(result));
  } catch (err) {
    console.error('获取提现账户失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.put('/api/app/withdraw-account', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { accountType, accountNo, accountName } = req.body;

    if (!accountNo || !accountName) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供完整的提现账户信息'));
    }

    const result = await appDataService.saveWithdrawAccount(userId, {
      accountType,
      accountNo,
      accountName
    });

    res.json(success(result));
  } catch (err) {
    console.error('保存提现账户失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

// ==================== 2. 邀请码接口 ====================

// POST /api/invite/validate - 验证邀请码
router.post('/api/invite/validate', async (req, res) => {
  try {
    const { inviteCode } = req.body;
    
    if (!inviteCode) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供邀请码'));
    }

    const result = await inviteService.validateInviteCode(inviteCode);
    
    if (!result.valid) {
      return res.json(error(result.error, result.message));
    }

    res.json(success({
      valid: true,
      inviteCode: result.inviteCode,
      discountAmount: Math.round((result.discountAmount || 0) * 100),
      discountAmountFen: Math.round((result.discountAmount || 0) * 100),
      discountAmountYuan: result.discountAmount || 0,
      inviterMaskedPhone: result.inviterMaskedPhone
    }));
  } catch (err) {
    console.error('验证邀请码失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

// ==================== 3. 支付接口 ====================

// POST /api/payment/create - 创建支付订单
router.post('/api/payment/create', async (req, res) => {
  try {
    const { phone, inviteCode, productType, channel } = req.body;

    if (!phone || !productType || !channel) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '缺少必要参数'));
    }

    const result = await paymentService.createOrder(phone, inviteCode, productType, channel);
    res.json(success(result));
  } catch (err) {
    console.error('创建订单失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, err.message || '服务器错误'));
  }
});

// POST /api/payment/notify - 支付回调（给支付平台调用）
router.post('/api/payment/notify', async (req, res) => {
  try {
    if (!isLocalDevelopmentRequest(req)) {
      return res.status(403).json(error(ErrorCodes.UNAUTHORIZED, '仅限本地开发环境使用'));
    }

    const { outTradeNo, tradeNo, tradeStatus } = req.body;

    if (!outTradeNo || !tradeNo) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '缺少必要参数'));
    }

    // TODO: 支付模块阶段实现真实签名校验

    if (tradeStatus === 'TRADE_SUCCESS') {
      const result = await paymentService.handleNotify(outTradeNo, tradeNo, 'paid');
      if (!result.success) {
        return res.json(error(result.error, result.message));
      }
    }

    res.json(success({ success: true }));
  } catch (err) {
    console.error('支付回调处理失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

// POST /alipay-notify - 支付宝异步通知
router.post('/alipay-notify', async (req, res) => {
  try {
    const verifyResult = alipayService.verifyNotifyPayload(req.body || {});

    if (!verifyResult.valid) {
      console.warn('[Alipay] 回调验签失败');
      return res.type('text/plain').send('failure');
    }

    const notifyData = verifyResult.payload;
    const outTradeNo = notifyData.out_trade_no || notifyData.outTradeNo;
    const tradeNo = notifyData.trade_no || notifyData.tradeNo;
    const tradeStatus = notifyData.trade_status || notifyData.tradeStatus;

    if (!outTradeNo || !tradeNo) {
      return res.type('text/plain').send('failure');
    }

    const result = await paymentService.handleNotify(outTradeNo, tradeNo, tradeStatus);
    if (!result.success) {
      return res.type('text/plain').send('failure');
    }

    return res.type('text/plain').send('success');
  } catch (err) {
    console.error('支付宝回调处理失败:', err);
    return res.type('text/plain').send('failure');
  }
});

router.get('/alipay-return', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>支付结果返回中</title>
    <style>
      body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#0f172a; color:#e2e8f0; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
      .card { max-width: 320px; padding: 24px; border-radius: 16px; background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(148, 163, 184, 0.2); text-align:center; }
      h1 { font-size: 20px; margin: 0 0 12px; }
      p { margin: 0; line-height: 1.6; color: #94a3b8; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>支付结果返回中</h1>
      <p>如果没有自动回到应用，请重新打开布鲁计划查看支付状态。</p>
    </div>
  </body>
</html>`);
});

// GET /api/payment/status - 查询订单状态
router.get('/api/payment/status', async (req, res) => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供订单ID'));
    }

    const result = await paymentService.getStatus(orderId);
    res.json(result);
  } catch (err) {
    console.error('查询订单状态失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, err.message || '服务器错误'));
  }
});

// ==================== 4. 邀请绑定接口 ====================

// POST /api/invite/bind - 绑定邀请关系
router.post('/api/invite/bind', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;
    const { userId, phone } = req.user;

    if (!orderId) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供订单ID'));
    }

    const result = await inviteService.bindRelation(orderId, userId, phone);
    
    if (!result.success) {
      return res.json(error(result.error, result.message));
    }

    res.json(success({
      relationId: result.relationId,
      status: result.status,
      boundAt: result.boundAt
    }));
  } catch (err) {
    console.error('绑定邀请关系失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

// ==================== 5. 首次激活接口 ====================

// POST /api/invite/activate - 首次激活奖励结算
router.post('/api/invite/activate', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await rewardService.processActivation(userId);
    
    if (!result.success) {
      if (result.idempotent) {
        const appState = await appDataService.saveState(userId, {
          inviteActivated: true
        });

        return res.json(success({
          status: 'activated',
          idempotent: true,
          message: '已激活，无需重复结算',
          appState
        }));
      }
      return res.json(error(result.error, result.message));
    }

    const appState = await appDataService.saveState(userId, {
      inviteActivated: true
    });

    res.json(success({
      relationId: result.relationId,
      status: result.status,
      activatedAt: result.activatedAt,
      newcomerReward: result.newcomerReward,
      inviterReward: result.inviterReward,
      appState
    }));
  } catch (err) {
    console.error('激活奖励结算失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

// ==================== 6. 收益查询接口 ====================

// GET /api/invite/summary - 获取收益概览
router.get('/api/invite/summary', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const summary = await rewardService.getSummary(userId);
    res.json(success(summary));
  } catch (err) {
    console.error('获取收益概览失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

// GET /api/invite/reward-ledger - 获取奖励流水
router.get('/api/invite/reward-ledger', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, pageSize = 20 } = req.query;
    const result = await rewardService.getLedger(userId, parseInt(page), parseInt(pageSize));
    res.json(success(result));
  } catch (err) {
    console.error('获取奖励流水失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

// ==================== 7. 提现接口 ====================

// POST /api/withdraw/apply - 申请提现
router.post('/api/withdraw/apply', authMiddleware, async (req, res) => {
  try {
    const { amount, channel, account, accountName } = req.body;
    const { userId, phone } = req.user;

    if (!amount || !channel || !account) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '缺少必要参数'));
    }

    const result = await withdrawService.apply(
      userId,
      phone,
      parseFloat(amount),
      channel,
      account,
      accountName
    );

    if (!result.success) {
      return res.json(error(result.error, result.message));
    }

    res.json(success({
      withdrawId: result.withdrawId,
      amount: result.amount,
      status: result.status,
      applyTime: result.applyTime
    }));
  } catch (err) {
    console.error('申请提现失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

// GET /api/withdraw/records - 获取提现记录
router.get('/api/withdraw/records', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, pageSize = 20 } = req.query;
    const result = await withdrawService.getRecords(userId, parseInt(page), parseInt(pageSize));
    res.json(success(result));
  } catch (err) {
    console.error('获取提现记录失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

// ==================== 8. 内部运营接口 ====================

router.get('/api/internal/withdraw/requests', internalAdminMiddleware, async (req, res) => {
  try {
    const { status = 'processing', page = 1, pageSize = 20 } = req.query;
    const result = await withdrawService.getRequestList(status, page, pageSize);
    res.json(success(result));
  } catch (err) {
    console.error('获取内部提现列表失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

router.post('/api/internal/withdraw/process', internalAdminMiddleware, async (req, res) => {
  try {
    const { withdrawId, status, remark, transactionId } = req.body;

    if (!withdrawId || !status) {
      return res.json(error(ErrorCodes.INVALID_PARAMS, '请提供提现单号和处理状态'));
    }

    const result = await withdrawService.processRequest(
      withdrawId,
      status,
      remark,
      transactionId
    );

    if (!result.success) {
      return res.json(error(result.error, result.message));
    }

    res.json(success(result));
  } catch (err) {
    console.error('处理提现申请失败:', err);
    res.json(error(ErrorCodes.INTERNAL_ERROR, '服务器错误'));
  }
});

module.exports = router;
