import { serveStatic, hasThree } from './utils/static.js';
import { getPublicSettings } from './services/settingsService.js';
import {
  createAdminSession,
  getAdminExamContent,
  getAdminSettings,
  getAdminStats,
  getAdminSubmissionDetail,
  getAdminSubmissions,
  patchAdminSubmission,
  putAdminExamContent,
  putAdminSettings,
} from './controllers/adminController.js';
import { getExam, submitSubmission, unlock, verifyRiddle } from './controllers/publicController.js';
import { requireAdminAuth } from './middleware/requireAdminAuth.js';
import { requireAttemptAuth } from './middleware/requireAttemptAuth.js';
import { sendJson } from './utils/http.js';

export async function routeRequest(request, response) {
  const url = new URL(request.url, 'http://127.0.0.1');
  const { pathname } = url;

  if (request.method === 'GET' && pathname === '/api/public/site') {
    return sendJson(response,200,{success:true,data:{...await getPublicSettings(),three_available:hasThree()}});
  }

  if (request.method === 'POST' && pathname === '/api/public/unlock') {
    return unlock(request, response);
  }

  if (request.method === 'GET' && pathname === '/api/public/exam') {
    if (!requireAttemptAuth(request, response)) {
      return;
    }

    return getExam(request, response);
  }

  if (request.method === 'POST' && pathname === '/api/public/riddles/verify') {
    if (!requireAttemptAuth(request, response)) {
      return;
    }

    return verifyRiddle(request, response);
  }

  if (request.method === 'POST' && pathname === '/api/public/submissions') {
    if (!requireAttemptAuth(request, response)) {
      return;
    }

    return submitSubmission(request, response);
  }

  if (request.method === 'POST' && pathname === '/api/admin/session') {
    return createAdminSession(request, response);
  }

  if (request.method === 'GET' && pathname === '/api/admin/settings') {
    if (!requireAdminAuth(request, response)) {
      return;
    }

    return getAdminSettings(request, response);
  }

  if (request.method === 'PUT' && pathname === '/api/admin/settings') {
    if (!requireAdminAuth(request, response)) {
      return;
    }

    return putAdminSettings(request, response);
  }

  if (request.method === 'GET' && pathname === '/api/admin/exam-content') {
    if (!requireAdminAuth(request, response)) {
      return;
    }

    return getAdminExamContent(request, response);
  }

  if (request.method === 'PUT' && pathname === '/api/admin/exam-content') {
    if (!requireAdminAuth(request, response)) {
      return;
    }

    return putAdminExamContent(request, response);
  }

  if (request.method === 'GET' && pathname === '/api/admin/submissions') {
    if (!requireAdminAuth(request, response)) {
      return;
    }

    return getAdminSubmissions(request, response);
  }

  const submissionMatch = pathname.match(/^\/api\/admin\/submissions\/([^/]+)$/);
  if (submissionMatch) {
    if (!requireAdminAuth(request, response)) {
      return;
    }

    const submissionId = decodeURIComponent(submissionMatch[1]);

    if (request.method === 'GET') {
      return getAdminSubmissionDetail(request, response, submissionId);
    }

    if (request.method === 'PATCH') {
      return patchAdminSubmission(request, response, submissionId);
    }
  }

  if (request.method === 'GET' && pathname === '/api/admin/stats') {
    if (!requireAdminAuth(request, response)) {
      return;
    }

    return getAdminStats(request, response);
  }

  if (!pathname.startsWith('/api/') && await serveStatic(request,response)) return;

  sendJson(response, 404, {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
}
