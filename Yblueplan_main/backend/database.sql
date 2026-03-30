-- 布鲁计划数据库建表脚本 (PostgreSQL)
-- 执行顺序：按表顺序依次执行

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    nickname VARCHAR(50) DEFAULT '战士',
    invite_code VARCHAR(20) NOT NULL UNIQUE,
    invited_by_user_id VARCHAR(64) DEFAULT NULL,
    register_time BIGINT NOT NULL,
    start_date BIGINT DEFAULT NULL,
    current_goal VARCHAR(255) DEFAULT '完成90天戒色计划',
    goal_days INT DEFAULT 90,
    status VARCHAR(20) DEFAULT 'active',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by_user_id);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.user_id IS '用户唯一ID';
COMMENT ON COLUMN users.phone IS '手机号';
COMMENT ON COLUMN users.nickname IS '昵称';
COMMENT ON COLUMN users.invite_code IS '我的邀请码';
COMMENT ON COLUMN users.invited_by_user_id IS '邀请人用户ID';
COMMENT ON COLUMN users.register_time IS '注册时间戳';
COMMENT ON COLUMN users.start_date IS '戒色开始时间';
COMMENT ON COLUMN users.status IS '状态：active/inactive/banned';

-- 2. 支付订单表
CREATE TABLE IF NOT EXISTS payment_orders (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL UNIQUE,
    user_id VARCHAR(64) DEFAULT NULL,
    phone VARCHAR(20) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    original_amount_fen INT NOT NULL,
    discount_amount_fen INT DEFAULT 0,
    final_amount_fen INT NOT NULL,
    invite_code VARCHAR(20) DEFAULT NULL,
    inviter_user_id VARCHAR(64) DEFAULT NULL,
    channel VARCHAR(20) NOT NULL,
    trade_no VARCHAR(64) DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at BIGINT NOT NULL,
    paid_at BIGINT DEFAULT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON payment_orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_invite_code ON payment_orders(invite_code);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON payment_orders(created_at);

COMMENT ON TABLE payment_orders IS '支付订单表';
COMMENT ON COLUMN payment_orders.original_amount_fen IS '原价（分）：1290=12.9元';
COMMENT ON COLUMN payment_orders.discount_amount_fen IS '优惠金额（分）：200=2元';
COMMENT ON COLUMN payment_orders.final_amount_fen IS '实付金额（分）：1090=10.9元';
COMMENT ON COLUMN payment_orders.status IS '状态：pending/paid/failed/refunded';

-- 3. 邀请关系表
CREATE TABLE IF NOT EXISTS invite_relations (
    id BIGSERIAL PRIMARY KEY,
    relation_id VARCHAR(64) NOT NULL UNIQUE,
    inviter_user_id VARCHAR(64) NOT NULL,
    inviter_phone VARCHAR(20) NOT NULL,
    invitee_user_id VARCHAR(64) DEFAULT NULL,
    invitee_phone VARCHAR(20) NOT NULL,
    invite_code VARCHAR(20) NOT NULL,
    order_id VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    activation_type VARCHAR(50) DEFAULT NULL,
    created_at BIGINT NOT NULL,
    bound_at BIGINT DEFAULT NULL,
    activated_at BIGINT DEFAULT NULL,
    updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_relations_invitee ON invite_relations(invitee_user_id) WHERE invitee_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_relations_order ON invite_relations(order_id);
CREATE INDEX IF NOT EXISTS idx_relations_inviter ON invite_relations(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_relations_invitee_phone ON invite_relations(invitee_phone);
CREATE INDEX IF NOT EXISTS idx_relations_status ON invite_relations(status);
CREATE INDEX IF NOT EXISTS idx_relations_invite_code ON invite_relations(invite_code);

COMMENT ON TABLE invite_relations IS '邀请关系表';
COMMENT ON COLUMN invite_relations.status IS '状态：pending/bound/activated/expired';
COMMENT ON COLUMN invite_relations.activation_type IS '激活类型：first_task_complete';

-- 4. 奖励流水表
CREATE TABLE IF NOT EXISTS reward_ledger (
    id BIGSERIAL PRIMARY KEY,
    ledger_id VARCHAR(64) NOT NULL UNIQUE,
    relation_id VARCHAR(64) DEFAULT NULL,
    order_id VARCHAR(64) DEFAULT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_phone VARCHAR(20) NOT NULL,
    reward_type VARCHAR(30) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(64) DEFAULT NULL UNIQUE,
    remark VARCHAR(255) DEFAULT NULL,
    meta_json JSONB DEFAULT NULL,
    created_at BIGINT NOT NULL,
    available_at BIGINT DEFAULT NULL,
    withdrawn_at BIGINT DEFAULT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON reward_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_reward_type ON reward_ledger(reward_type);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON reward_ledger(status);
CREATE INDEX IF NOT EXISTS idx_ledger_relation_id ON reward_ledger(relation_id);

COMMENT ON TABLE reward_ledger IS '奖励流水表';
COMMENT ON COLUMN reward_ledger.reward_type IS '奖励类型：newcomer_bonus/inviter_reward';
COMMENT ON COLUMN reward_ledger.status IS '状态：pending/available/withdrawn/expired';

-- 5. 提现申请表
CREATE TABLE IF NOT EXISTS withdraw_requests (
    id BIGSERIAL PRIMARY KEY,
    withdraw_id VARCHAR(64) NOT NULL UNIQUE,
    user_id VARCHAR(64) NOT NULL,
    user_phone VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    account VARCHAR(100) NOT NULL,
    account_name VARCHAR(50) DEFAULT NULL,
    status VARCHAR(20) NOT NULL,
    remark VARCHAR(255) DEFAULT NULL,
    transaction_id VARCHAR(64) DEFAULT NULL,
    apply_time BIGINT NOT NULL,
    process_time BIGINT DEFAULT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_withdraw_user_id ON withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_status ON withdraw_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_apply_time ON withdraw_requests(apply_time);

COMMENT ON TABLE withdraw_requests IS '提现申请表';
COMMENT ON COLUMN withdraw_requests.status IS '状态：processing/completed/failed/rejected';

-- 6. 结算事件表（异步处理用）
CREATE TABLE IF NOT EXISTS settlement_events (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    event_type VARCHAR(30) NOT NULL,
    relation_id VARCHAR(64) DEFAULT NULL,
    reward_ledger_id VARCHAR(64) DEFAULT NULL,
    user_id VARCHAR(64) DEFAULT NULL,
    payload_json JSONB DEFAULT NULL,
    status VARCHAR(20) NOT NULL,
    retry_count INT DEFAULT 0,
    result VARCHAR(255) DEFAULT NULL,
    created_at BIGINT NOT NULL,
    processed_at BIGINT DEFAULT NULL,
    next_retry_at BIGINT DEFAULT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_status ON settlement_events(status);
CREATE INDEX IF NOT EXISTS idx_events_next_retry ON settlement_events(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON settlement_events(event_type);

COMMENT ON TABLE settlement_events IS '结算事件表';
COMMENT ON COLUMN settlement_events.event_type IS '事件类型：inviter_reward_settlement';
COMMENT ON COLUMN settlement_events.status IS '状态：pending/processing/completed/failed';

-- 7. 短信验证码表
CREATE TABLE IF NOT EXISTS sms_codes (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_codes(phone);
CREATE INDEX IF NOT EXISTS idx_sms_expires ON sms_codes(expires_at);

COMMENT ON TABLE sms_codes IS '短信验证码表';

-- 8. 用户应用状态表
CREATE TABLE IF NOT EXISTS user_app_states (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    app_start_date_key VARCHAR(10) DEFAULT NULL,
    current_date_key VARCHAR(10) DEFAULT NULL,
    last_active_date_key VARCHAR(10) DEFAULT NULL,
    current_day_index INT DEFAULT 1,
    invite_activated BOOLEAN DEFAULT FALSE,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_app_states_user_id ON user_app_states(user_id);

COMMENT ON TABLE user_app_states IS '用户应用状态表';
COMMENT ON COLUMN user_app_states.app_start_date_key IS '计划开始日期键 YYYY-MM-DD';
COMMENT ON COLUMN user_app_states.current_date_key IS '当前日期键 YYYY-MM-DD';
COMMENT ON COLUMN user_app_states.last_active_date_key IS '最后活跃日期键 YYYY-MM-DD';
COMMENT ON COLUMN user_app_states.current_day_index IS '当前计划第几天';

-- 9. 用户每日记录表
CREATE TABLE IF NOT EXISTS user_daily_records (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    date_key VARCHAR(10) NOT NULL,
    day_index INT DEFAULT NULL,
    checked BOOLEAN DEFAULT FALSE,
    check_in_time BIGINT DEFAULT NULL,
    journal_content TEXT DEFAULT NULL,
    journal_mood INT DEFAULT NULL,
    journal_topic VARCHAR(255) DEFAULT NULL,
    tasks_json JSONB DEFAULT '[]'::jsonb,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    CONSTRAINT uk_user_daily_records UNIQUE (user_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_records_user_id ON user_daily_records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_records_date_key ON user_daily_records(date_key);
CREATE INDEX IF NOT EXISTS idx_user_daily_records_checked ON user_daily_records(checked);

COMMENT ON TABLE user_daily_records IS '用户每日记录表';
COMMENT ON COLUMN user_daily_records.date_key IS '日期键 YYYY-MM-DD';
COMMENT ON COLUMN user_daily_records.checked IS '当日是否完成打卡';
COMMENT ON COLUMN user_daily_records.check_in_time IS '打卡时间戳';
COMMENT ON COLUMN user_daily_records.journal_content IS '日记内容';
COMMENT ON COLUMN user_daily_records.journal_mood IS '日记心情';
COMMENT ON COLUMN user_daily_records.journal_topic IS '日记主题';
COMMENT ON COLUMN user_daily_records.tasks_json IS '任务进度 JSON';

-- 10. 用户旅程历史表
CREATE TABLE IF NOT EXISTS user_journey_histories (
    id BIGSERIAL PRIMARY KEY,
    journey_id VARCHAR(64) NOT NULL UNIQUE,
    user_id VARCHAR(64) NOT NULL,
    start_date_key VARCHAR(10) NOT NULL,
    end_date_key VARCHAR(10) DEFAULT NULL,
    streak_days INT DEFAULT 0,
    ended_reason VARCHAR(30) DEFAULT 'restart',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_journey_histories_user_id ON user_journey_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_histories_start_date ON user_journey_histories(start_date_key);

COMMENT ON TABLE user_journey_histories IS '用户旅程历史表';
COMMENT ON COLUMN user_journey_histories.start_date_key IS '本段旅程开始日期键 YYYY-MM-DD';
COMMENT ON COLUMN user_journey_histories.end_date_key IS '本段旅程结束日期键 YYYY-MM-DD';
COMMENT ON COLUMN user_journey_histories.streak_days IS '本段旅程累计天数';

-- 11. 问卷评估结果表
CREATE TABLE IF NOT EXISTS survey_assessments (
    id BIGSERIAL PRIMARY KEY,
    survey_id VARCHAR(64) NOT NULL UNIQUE,
    user_id VARCHAR(64) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    score INT NOT NULL,
    answers_json JSONB NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_survey_assessments_user_id ON survey_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_assessments_phone ON survey_assessments(phone);

COMMENT ON TABLE survey_assessments IS '问卷评估结果表';
COMMENT ON COLUMN survey_assessments.score IS '评估分数 0-100';
COMMENT ON COLUMN survey_assessments.answers_json IS '问卷答案 JSON';

-- 12. 用户提现账户表
CREATE TABLE IF NOT EXISTS user_withdraw_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    account_type VARCHAR(20) NOT NULL DEFAULT 'alipay',
    account_no VARCHAR(100) NOT NULL,
    account_name VARCHAR(50) NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_withdraw_accounts_user_id ON user_withdraw_accounts(user_id);

COMMENT ON TABLE user_withdraw_accounts IS '用户提现账户表';
COMMENT ON COLUMN user_withdraw_accounts.account_type IS '账户类型 alipay';
COMMENT ON COLUMN user_withdraw_accounts.account_no IS '收款账号';
COMMENT ON COLUMN user_withdraw_accounts.account_name IS '收款人姓名';
