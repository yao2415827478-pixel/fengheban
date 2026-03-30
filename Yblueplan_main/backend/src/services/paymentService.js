// 支付服务
const { query, transaction } = require('../config/database');
const { generateOrderId, generateRelationId, yuanToFen, now } = require('../utils/helpers');
const alipayService = require('./alipayService');
const inviteService = require('./inviteService');

class PaymentService {
  getProductMeta(productType) {
    if (productType === 'entry_access') {
      return {
        subject: '布鲁计划永久使用权限',
        body: '布鲁计划一次付费永久使用'
      };
    }

    return {
      subject: '布鲁计划服务',
      body: '布鲁计划应用内支付'
    };
  }

  // 创建支付订单
  async createOrder(phone, inviteCode, productType, channel) {
    if (channel !== 'alipay') {
      throw new Error('当前仅支持支付宝支付');
    }

    // 基础价格（元）
    const originalAmount = 12.9;
    let discountAmount = 0;
    let finalAmount = originalAmount;
    let inviterUserId = null;
    let inviterPhone = null;

    // 如果使用了邀请码，计算优惠
    if (inviteCode) {
      const validation = await inviteService.validateInviteCode(inviteCode, phone);
      if (validation.valid) {
        discountAmount = 2.0;
        finalAmount = originalAmount - discountAmount;
        inviterUserId = validation.inviterId;
        inviterPhone = validation.inviterPhone;
      }
    }

    const orderId = generateOrderId();
    const currentTime = now();
    const productMeta = this.getProductMeta(productType);
    const { orderStr } = alipayService.createAppPayOrder({
      orderId,
      totalAmount: finalAmount,
      subject: productMeta.subject,
      body: productMeta.body
    });

    // 创建订单
    await query(
      `INSERT INTO payment_orders 
       (order_id, phone, product_type, original_amount_fen, discount_amount_fen, final_amount_fen, 
        invite_code, inviter_user_id, channel, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        orderId,
        phone,
        productType,
        yuanToFen(originalAmount),
        yuanToFen(discountAmount),
        yuanToFen(finalAmount),
        inviteCode || null,
        inviterUserId,
        channel,
        'pending',
        currentTime,
        currentTime
      ]
    );

    // 返回支付参数
    return {
      orderId,
      productType,
      originalAmount,
      discountAmount,
      finalAmount,
      inviteCodeApplied: !!inviteCode && discountAmount > 0,
      payParams: {
        channel,
        outTradeNo: orderId,
        orderStr
      }
    };
  }

  // 根据订单ID查找
  async findByOrderId(orderId) {
    const orders = await query(
      'SELECT * FROM payment_orders WHERE order_id = $1 LIMIT 1',
      [orderId]
    );
    return orders[0] || null;
  }

  async attachOrdersToUserByPhone(userId, phone) {
    if (!userId || !phone) return;

    await query(
      `UPDATE payment_orders
       SET user_id = $1, updated_at = $2
       WHERE phone = $3 AND (user_id IS NULL OR user_id = $1)`,
      [userId, now(), phone]
    );
  }

  async getAccessStatus(userId, phone) {
    const conditions = [];
    const params = ['paid'];

    if (userId) {
      params.push(userId);
      conditions.push(`user_id = $${params.length}`);
    }

    if (phone) {
      params.push(phone);
      conditions.push(`phone = $${params.length}`);
    }

    if (conditions.length === 0) {
      return {
        hasPaid: false,
        latestPaidOrderId: null,
        latestPaidAt: null,
        phone: phone || null
      };
    }

    const paidOrders = await query(
      `SELECT order_id, paid_at, phone
       FROM payment_orders
       WHERE status = $1
         AND (${conditions.join(' OR ')})
       ORDER BY paid_at DESC NULLS LAST, updated_at DESC
       LIMIT 1`,
      params
    );

    const latestPaidOrder = paidOrders[0] || null;

    return {
      hasPaid: !!latestPaidOrder,
      latestPaidOrderId: latestPaidOrder?.order_id || null,
      latestPaidAt: latestPaidOrder?.paid_at || null,
      phone: latestPaidOrder?.phone || phone || null
    };
  }

  // 处理支付回调
  async handleNotify(orderId, tradeNo, tradeStatus) {
    if (!orderId) {
      return { success: false, error: 'ORDER_NOT_FOUND', message: '订单不存在' };
    }

    const currentTime = now();

    return transaction(async (db) => {
      const orders = await db.query(
        'SELECT * FROM payment_orders WHERE order_id = $1 LIMIT 1',
        [orderId]
      );
      const order = orders[0] || null;

      if (!order) {
        return { success: false, error: 'ORDER_NOT_FOUND', message: '订单不存在' };
      }

      if (order.status === 'paid') {
        return {
          success: true,
          message: '订单已处理',
          data: {
            orderId: order.order_id,
            status: order.status,
            paidAt: order.paid_at,
            tradeNo: order.trade_no
          }
        };
      }

      if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED' || tradeStatus === 'paid') {
        await db.query(
          `UPDATE payment_orders
           SET status = $1, trade_no = $2, paid_at = $3, updated_at = $4
           WHERE order_id = $5`,
          ['paid', tradeNo || order.trade_no, currentTime, currentTime, orderId]
        );

        if (order.invite_code && order.inviter_user_id) {
          const existingRelations = await db.query(
            'SELECT relation_id FROM invite_relations WHERE order_id = $1 LIMIT 1',
            [orderId]
          );

          if (!existingRelations[0]) {
            const inviterRows = await db.query(
              'SELECT phone FROM users WHERE user_id = $1 LIMIT 1',
              [order.inviter_user_id]
            );
            const inviterPhone = inviterRows[0]?.phone || '';
            const relationId = generateRelationId();

            await db.query(
              `INSERT INTO invite_relations
               (relation_id, inviter_user_id, inviter_phone, invitee_phone, invite_code, order_id, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                relationId,
                order.inviter_user_id,
                inviterPhone,
                order.phone,
                order.invite_code,
                orderId,
                'pending',
                currentTime,
                currentTime
              ]
            );
          }
        }

        return {
          success: true,
          data: {
            orderId,
            status: 'paid',
            paidAt: currentTime,
            tradeNo: tradeNo || order.trade_no
          }
        };
      }

      if (tradeStatus === 'TRADE_CLOSED') {
        await db.query(
          `UPDATE payment_orders
           SET status = $1, trade_no = $2, updated_at = $3
           WHERE order_id = $4`,
          ['failed', tradeNo || order.trade_no, currentTime, orderId]
        );

        return {
          success: true,
          data: {
            orderId,
            status: 'failed',
            tradeNo: tradeNo || order.trade_no
          }
        };
      }

      return {
        success: true,
        data: {
          orderId,
          status: order.status,
          tradeNo: tradeNo || order.trade_no || null
        }
      };
    });
  }

  async syncOrderStatusFromGateway(order) {
    if (!order || order.channel !== 'alipay' || order.status === 'paid') {
      return order;
    }

    const queryResult = await alipayService.queryTrade(order.order_id);
    if (!queryResult.success) {
      return order;
    }

    if (queryResult.tradeStatus === 'TRADE_SUCCESS' || queryResult.tradeStatus === 'TRADE_FINISHED') {
      await this.handleNotify(order.order_id, queryResult.tradeNo, queryResult.tradeStatus);
      return this.findByOrderId(order.order_id);
    }

    if (queryResult.tradeStatus === 'TRADE_CLOSED') {
      await this.handleNotify(order.order_id, queryResult.tradeNo, queryResult.tradeStatus);
      return this.findByOrderId(order.order_id);
    }

    return order;
  }

  // 查询订单状态
  async getStatus(orderId) {
    let order = await this.findByOrderId(orderId);
    
    if (!order) {
      return { success: false, error: 'ORDER_NOT_FOUND', message: '订单不存在' };
    }

    if (order.status !== 'paid' && order.channel === 'alipay') {
      order = await this.syncOrderStatusFromGateway(order);
    }

    return {
      success: true,
      data: {
        orderId: order.order_id,
        status: order.status,
        paidAt: order.paid_at,
        tradeNo: order.trade_no
      }
    };
  }
}

module.exports = new PaymentService();
