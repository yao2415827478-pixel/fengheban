const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env')
});
const express = require('express');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;
const configuredAllowedOrigins = (process.env.APP_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  'http://localhost',
  'https://localhost',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://127.0.0.1',
  'capacitor://localhost',
  'ionic://localhost',
  'https://blue-plan1.cn',
  'https://www.blue-plan1.cn',
  ...configuredAllowedOrigins
]);

// 中间件
// CORS - 开发环境允许前端 dev server 跨域访问
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use(routes);

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  });
});

function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`🚀 布鲁计划后端服务已启动`);
    console.log(`📡 监听端口: ${port}`);
    console.log(`🔗 API地址: http://localhost:${port}`);
    console.log(`💚 健康检查: http://localhost:${port}/health`);
    console.log('🔧 数据库模式: PostgreSQL');
    console.log(`📱 短信模式: ${process.env.SMS_MODE || 'mock'}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer
};
