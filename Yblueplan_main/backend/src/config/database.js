// 数据库配置
// 默认且唯一支持的联调方案：PostgreSQL

console.log('🗄️ 使用 PostgreSQL 数据库');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'blueplan',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 连接测试
pool.on('error', (err) => {
  console.error('PostgreSQL 连接池错误:', err);
});

const query = async (sql, params) => {
  const result = await pool.query(sql, params);
  return result.rows;
};

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback({
      query: async (sql, params) => {
        const res = await client.query(sql, params);
        return res.rows;
      }
    });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  query,
  transaction
};
