// JWT 认证配置
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'blueplan-default-secret-key';
const JWT_EXPIRES_IN = '7d'; // 7 天过期

/**
 * 生成 JWT Token
 * @param {Object} payload - { userId, phone }
 * @returns {string}
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 验证 JWT Token
 * @param {string} token
 * @returns {Object|null}
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * JWT 认证中间件
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '请先登录' }
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: '登录已过期，请重新登录' }
    });
  }

  req.user = decoded;
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware
};
