import { verifyToken } from '../services/tokenService.js';
import { sendJson } from '../utils/http.js';

export function requireAttemptAuth(request, response) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  try {
    const payload = verifyToken(token);
    if (payload.role !== 'public' || payload.spell_verified !== true) {
      throw new Error('INVALID_ATTEMPT_TOKEN');
    }

    request.auth = payload;
    return true;
  } catch (error) {
    sendJson(response, 401, {
      success: false,
      error: {
        code: error.message === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'INVALID_ATTEMPT_TOKEN',
        message: '验证已过期或无效，请重新开启文书匣。草稿不会清除。',
      },
    });
    return false;
  }
}
