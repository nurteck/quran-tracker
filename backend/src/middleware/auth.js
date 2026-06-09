import { verifyAccessToken } from '../utils/jwt.js';
export function requireAuth(req, res, next) {
  const token =
    req.cookies?.access_token ||
    req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub ?? payload.id,
      role: payload.role,
    };
    next();
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}

export { signAccessToken } from '../utils/jwt.js';
