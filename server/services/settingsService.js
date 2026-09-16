import { SETTINGS_PATH } from '../constants.js';
import { readJsonFile, writeJsonFile } from '../utils/fileStore.js';

export async function getSettings() {
  return readJsonFile(SETTINGS_PATH);
}

export async function getPublicSettings() {
  const settings = await getSettings();
  return {
    submission_enabled: settings.submission_enabled,
    site_title: settings.site_title,
    updated_at: settings.updated_at,
  };
}

export async function updateSettings(nextValues) {
  const current = await getSettings();
  const updated = {
    ...current,
    ...nextValues,
    updated_at: new Date().toISOString(),
  };

  await writeJsonFile(SETTINGS_PATH, updated);
  return updated;
}
