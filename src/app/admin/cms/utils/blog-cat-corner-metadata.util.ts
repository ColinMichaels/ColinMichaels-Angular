import {BlogCatCornerSettings} from '../../../features/blog/models/blog-post.model';

export interface CmsCatCornerFormValue {
  enabled: boolean;
  discoveryPost: boolean;
}

export function normalizeCmsCatCornerSettings(
  enabled: boolean,
  discoveryPost: boolean
): BlogCatCornerSettings {
  return {
    enabled,
    discoveryPost: enabled && discoveryPost,
  };
}

export function createCmsCatCornerFormValue(
  settings: BlogCatCornerSettings | undefined
): CmsCatCornerFormValue {
  return normalizeCmsCatCornerSettings(
    settings?.enabled === true,
    settings?.discoveryPost === true
  );
}

export function parseCmsCatCornerSettings(value: unknown): BlogCatCornerSettings | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const settings = value as Record<string, unknown>;

  if (typeof settings['enabled'] !== 'boolean' || typeof settings['discoveryPost'] !== 'boolean') {
    return undefined;
  }

  return normalizeCmsCatCornerSettings(settings['enabled'], settings['discoveryPost']);
}
