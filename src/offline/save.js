import { normalizeProfile } from './profile.js';

export const SAVE_FILE_LIMIT = 1000000;

export function parseSave(text) {
  return normalizeProfile(JSON.parse(text));
}

export function serializeSave(profile) {
  return JSON.stringify(profile, null, 2);
}
