import { EXAM_CONTENT_PATH } from '../constants.js';
import { readJsonFile, writeJsonFile } from '../utils/fileStore.js';

export async function getExamContent() {
  return readJsonFile(EXAM_CONTENT_PATH);
}

export async function getPublicExamContent() {
  const content = await getExamContent();

  return {
    page1_riddles: content.page1_riddles.map((item) => {
      const nextItem = { ...item };
      delete nextItem.correct_key;
      return nextItem;
    }),
    page2_exam: content.page2_exam,
    updated_at: content.updated_at,
  };
}

export async function verifyRiddleAnswer(questionId, answerKey) {
  const content = await getExamContent();
  const question = content.page1_riddles.find((item) => item.id === questionId);

  if (!question) {
    return { found: false, correct: false, total: content.page1_riddles.length };
  }

  return {
    found: true,
    correct: question.correct_key === answerKey,
    total: content.page1_riddles.length,
  };
}

export async function buildScoreSnapshot(riddleAnswers = {}) {
  const content = await getExamContent();
  const objectiveTotal = content.page1_riddles.length;
  const objectiveCorrect = content.page1_riddles.filter(
    (item) => riddleAnswers[item.id] === item.correct_key,
  ).length;

  return {
    objective_total: objectiveTotal,
    objective_correct: objectiveCorrect,
  };
}

export async function updateExamContent(nextContent) {
  const updated = {
    ...nextContent,
    updated_at: new Date().toISOString(),
  };

  await writeJsonFile(EXAM_CONTENT_PATH, updated);
  return updated;
}
