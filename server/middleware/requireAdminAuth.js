import { verifyToken } from '../services/tokenService.js';
import { sendJson } from '../utils/http.js';

export function requireAdminAuth(request, response) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  try {
    const payload = verifyToken(token);
    if (payload.role !== 'admin') {
      throw new Error('INVALID_ADMIN_TOKEN');
    }

    request.auth = payload;
    return true;
  } catch {
    sendJson(response, 401, {
      success: false,
      error: {
        code: 'INVALID_ADMIN_TOKEN',
        message: '后台令牌无效',
      },
    });
    return false;
  }
}
