const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env')
});

async function main() {
  const sqlFilePath = path.resolve(__dirname, '..', 'database.sql');
  const sql = fs.readFileSync(sqlFilePath, 'utf8');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blueplan'
  });

  console.log(`📄 读取建表脚本: ${sqlFilePath}`);
  console.log(`🗄️ 连接数据库: ${client.database}@${client.host}:${client.port}`);

  await client.connect();
  try {
    await client.query(sql);
    console.log('✅ 数据库初始化完成');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('❌ 数据库初始化失败');
  console.error(error);
  process.exit(1);
});
