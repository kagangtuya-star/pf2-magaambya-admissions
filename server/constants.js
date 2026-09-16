import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATA_DIR = process.env.MAGIC_DATA_DIR ? path.resolve(process.env.MAGIC_DATA_DIR) : path.join(__dirname, 'data');
export const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
export const EXAM_CONTENT_PATH = path.join(DATA_DIR, 'exam-content.json');
export const SUBMISSIONS_PATH = path.join(DATA_DIR, 'submissions.json');
