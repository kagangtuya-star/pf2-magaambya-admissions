import crypto from 'node:crypto';
import { getExamContent, getPublicExamContent } from '../services/examService.js';
import { getSettings } from '../services/settingsService.js';
import { createSubmission } from '../services/submissionService.js';
import { signAttemptToken } from '../services/tokenService.js';
import { sendJson, readJsonBody } from '../utils/http.js';
import { isNonEmptyString } from '../utils/validators.js';

export async function unlock(request, response) {
  const body = await readJsonBody(request);
  const settings = await getSettings();
  const inputSpell = typeof body.spell === 'string' ? body.spell.trim().toLowerCase() : '';
  const expectedSpell = settings.unlock_spell.trim().toLowerCase();

  if (inputSpell !== expectedSpell) {
    return sendJson(response, 401, {
      success: false,
      error: {
        code: 'INVALID_PUBLIC_SPELL',
        message: '咒语错误',
      },
    });
  }

  const attemptId = `att_${crypto.randomUUID()}`;
  const content = await getExamContent();
  const attemptToken = signAttemptToken({ attemptId, contentVersion:content.updated_at });

  return sendJson(response, 200, {
    success: true,
    data: {
      passed: true,
      attempt_token: attemptToken,
      expires_in: 7200,
    },
    message: '封印已解构',
  });
}

function stale(request,response,content){
  if(request.auth?.content_version && request.auth.content_version!==content.updated_at){
    sendJson(response,409,{success:false,error:{code:'EXAM_CHANGED',message:'主持人已更新题笺，请重新验证口令后继续。你的本地草稿仍然保留。'}});return true;
  }
  return false;
}
export async function getExam(request, response) {
  const data = await getPublicExamContent();
  if(stale(request,response,data))return;
  return sendJson(response, 200, {
    success: true,
    data,
    message: 'ok',
  });
}

export async function verifyRiddle(request, response) {
  const body = await readJsonBody(request);
  const content = await getExamContent();
  if(stale(request,response,content))return;
  const question = content.page1_riddles.find(q=>q.id===body.question_id);
  const result = {found:!!question,correct:question?.correct_key===body.answer_key,total:content.page1_riddles.length};

  if (!result.found) {
    return sendJson(response, 404, {
      success: false,
      error: {
        code: 'RIDDLE_NOT_FOUND',
        message: '封印题不存在',
      },
    });
  }

  if (!result.correct) {
    return sendJson(response, 422, {
      success: false,
      error: {
        code: 'RIDDLE_ANSWER_INCORRECT',
        message: '答案错误',
      },
    });
  }

  return sendJson(response, 200, {
    success: true,
    data: {
      correct: true,
      question_id: body.question_id,
      progress: {
        answered: 1,
        total: result.total,
      },
    },
    message: '封印符文已点亮',
  });
}

export async function submitSubmission(request, response) {
  const body = await readJsonBody(request);
  const settings = await getSettings();

  if (settings.submission_enabled !== true) {
    return sendJson(response, 403, {
      success: false,
      error: {
        code: 'SUBMISSION_CLOSED',
        message: '当前暂不接受提交',
      },
    });
  }

  if (!isNonEmptyString(body.player_name) || body.player_name.trim().length > 80 || typeof body.exam_answers !== 'object' || body.exam_answers === null || Array.isArray(body.exam_answers)) {
    return sendJson(response, 400, {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: '提交参数不完整',
      },
    });
  }

  const content = await getExamContent();
  if(stale(request,response,content))return;
  const riddles = body.riddle_answers && typeof body.riddle_answers === 'object' && !Array.isArray(body.riddle_answers) ? body.riddle_answers : {};
  if (content.page1_riddles.some(q => riddles[q.id] !== q.correct_key)) {
    return sendJson(response, 422, {success:false,error:{code:'RIDDLES_INCOMPLETE',message:'请先完成全部封印题。'}});
  }
  const answers = {};
  for (const q of content.page2_exam.flatMap(g => g.questions)) {
    const value = body.exam_answers[q.id];
    if ((q.required !== false && (typeof value !== 'string' || !value.trim())) || (value != null && (typeof value !== 'string' || value.length > 10000))) {
      return sendJson(response, 422, {success:false,error:{code:'ANSWERS_INCOMPLETE',message:'必答题尚未完成，或单题超过 10000 字。'}});
    }
    answers[q.id] = value || '';
  }
  if (!content.page2_exam.length) return sendJson(response, 422, {success:false,error:{code:'EMPTY_EXAM',message:'问答材料尚未发布。'}});
  const scoreSnapshot = {objective_total:content.page1_riddles.length,objective_correct:content.page1_riddles.length};
  const saved = await createSubmission({
    player_name: body.player_name.trim(),
    attempt_id: request.auth.attempt_id,
    spell_verified: true,
    riddle_answers: Object.fromEntries(content.page1_riddles.map(q => [q.id,riddles[q.id]])),
    exam_answers: answers,
    content_snapshot: content.page2_exam,
    content_version: content.updated_at,
    score_snapshot: scoreSnapshot,
  });

  return sendJson(response, 201, {
    success: true,
    data: {
      submission_id: saved.id,
      status: saved.status,
      created_at: saved.created_at,
      player_name: saved.player_name,
      exam_answers: saved.exam_answers,
    },
    message: '注入魔力成功，答案已被记录',
  });
}
