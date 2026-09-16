import {validateContent,validateSettings,validateReview} from '../utils/contentValidation.js';
import { getExamContent, updateExamContent } from '../services/examService.js';
import { getSettings, updateSettings } from '../services/settingsService.js';
import {
  getSubmissionById,
  getSubmissionStats,
  listSubmissions,
  updateSubmission,
} from '../services/submissionService.js';
import { signAdminToken } from '../services/tokenService.js';
import { readJsonBody, sendJson } from '../utils/http.js';

export async function createAdminSession(request, response) {
  const body = await readJsonBody(request);
  const settings = await getSettings();

  if (body.passphrase !== (process.env.ADMIN_PASSPHRASE || settings.admin_passphrase)) {
    return sendJson(response, 401, {
      success: false,
      error: {
        code: 'INVALID_ADMIN_PASSPHRASE',
        message: '管理口令错误',
      },
    });
  }

  return sendJson(response, 200, {
    success: true,
    data: {
      admin_token: signAdminToken(),
      expires_in: 28800,
    },
    message: '登录成功',
  });
}

export async function getAdminSettings(_request, response) {
  const settings = await getSettings();
  return sendJson(response, 200, {
    success: true,
    data: {
      unlock_spell: settings.unlock_spell,
      submission_enabled: settings.submission_enabled,
      site_title: settings.site_title,
      updated_at: settings.updated_at,
    },
    message: 'ok',
  });
}

export async function putAdminSettings(request, response) {
  const body = await readJsonBody(request);
  const updated = await updateSettings(validateSettings(body));

  return sendJson(response, 200, {
    success: true,
    data: {
      unlock_spell: updated.unlock_spell,
      submission_enabled: updated.submission_enabled,
      site_title: updated.site_title,
      updated_at: updated.updated_at,
    },
    message: '配置已更新',
  });
}

export async function getAdminExamContent(_request, response) {
  const content = await getExamContent();
  return sendJson(response, 200, {
    success: true,
    data: content,
    message: 'ok',
  });
}

export async function putAdminExamContent(request, response) {
  const body = await readJsonBody(request);
  const updated = await updateExamContent(validateContent(body));

  return sendJson(response, 200, {
    success: true,
    data: {
      updated_at: updated.updated_at,
    },
    message: '题库已更新',
  });
}

export async function getAdminSubmissions(_request, response) {
  const items = await listSubmissions();
  return sendJson(response, 200, {
    success: true,
    data: {
      items: items.map((item) => ({
        id: item.id,
        player_name: item.player_name,
        status: item.status,
        score_snapshot: item.score_snapshot,
        created_at: item.created_at,
      })),
      pagination: {
        page: 1,
        page_size: items.length,
        total: items.length,
      },
    },
    message: 'ok',
  });
}

export async function getAdminSubmissionDetail(_request, response, submissionId) {
  const item = await getSubmissionById(submissionId);

  if (!item) {
    return sendJson(response, 404, {
      success: false,
      error: {
        code: 'SUBMISSION_NOT_FOUND',
        message: '提交记录不存在',
      },
    });
  }

  return sendJson(response, 200, {
    success: true,
    data: item,
    message: 'ok',
  });
}

export async function patchAdminSubmission(request, response, submissionId) {
  const body = await readJsonBody(request);
  const updated = await updateSubmission(submissionId, validateReview(body));

  if (!updated) {
    return sendJson(response, 404, {
      success: false,
      error: {
        code: 'SUBMISSION_NOT_FOUND',
        message: '提交记录不存在',
      },
    });
  }

  return sendJson(response, 200, {
    success: true,
    data: {
      id: updated.id,
      status: updated.status,
      review_note: updated.review_note,
      updated_at: updated.updated_at,
    },
    message: '记录已更新',
  });
}

export async function getAdminStats(_request, response) {
  const stats = await getSubmissionStats();
  return sendJson(response, 200, {
    success: true,
    data: stats,
    message: 'ok',
  });
}
