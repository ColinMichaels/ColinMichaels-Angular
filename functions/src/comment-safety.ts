export const COMMENT_BODY_MAX_LENGTH = 1200;
export const COMMENT_BODY_UNSAFE_CONTENT_MESSAGE =
  'Comments are plain text only right now. Remove links, email addresses, and HTML before submitting.';

const DISALLOWED_URL_SCHEME_PATTERN = /\b(?:https?|ftp|file|data|javascript|vbscript|mailto):/i;
const MARKDOWN_LINK_PATTERN = /\[[^\]]{1,300}\]\(\s*[^)\s]+/i;
const HTML_OR_ENCODED_TAG_PATTERN = /<\s*\/?\s*[a-zA-Z][^>]*>|<\s*!|<\s*\?|&(?:lt|gt|#0*60|#x0*3c|#0*62|#x0*3e);?/i;
const WWW_HOST_PATTERN = /\bwww\.[^\s<>()]{2,}/i;
const EMAIL_ADDRESS_PATTERN = /\b[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,}\b/i;
const IP_ADDRESS_LINK_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{2,5})?(?:[/?#][^\s<>()]*)?\b/;
const LOCALHOST_LINK_PATTERN = /\blocalhost(?::\d{2,5})?(?:[/?#][^\s<>()]*)?\b/i;
const BARE_DOMAIN_PATTERN =
  /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,24}|xn--[a-z0-9-]{2,59})\b(?:[/?#][^\s<>()]*)?/i;
const OBFUSCATED_DOT_DOMAIN_PATTERN =
  /\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\s+dot\s+)\s*(?:[a-z]{2,24}|xn--[a-z0-9-]{2,59})\b/i;
const BIDIRECTIONAL_CONTROL_CHARACTER_PATTERN = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/;

export type CommentBodyValidationReason = 'empty' | 'too_long' | 'unsafe_content';

export interface CommentBodyValidationResult {
  body: string;
  reason: CommentBodyValidationReason | null;
  valid: boolean;
}

export function normalizePlainTextCommentBody(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return stripUnsafeControlCharacters(value)
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function validatePlainTextCommentBody(
  value: unknown,
  maxLength = COMMENT_BODY_MAX_LENGTH
): CommentBodyValidationResult {
  const body = normalizePlainTextCommentBody(value);

  if (!body) {
    return {body, reason: 'empty', valid: false};
  }

  if (body.length > maxLength) {
    return {body, reason: 'too_long', valid: false};
  }

  if (containsDisallowedCommentContent(body)) {
    return {body, reason: 'unsafe_content', valid: false};
  }

  return {body, reason: null, valid: true};
}

export function containsDisallowedCommentContent(body: string): boolean {
  return DISALLOWED_URL_SCHEME_PATTERN.test(body)
    || MARKDOWN_LINK_PATTERN.test(body)
    || HTML_OR_ENCODED_TAG_PATTERN.test(body)
    || WWW_HOST_PATTERN.test(body)
    || EMAIL_ADDRESS_PATTERN.test(body)
    || IP_ADDRESS_LINK_PATTERN.test(body)
    || LOCALHOST_LINK_PATTERN.test(body)
    || BARE_DOMAIN_PATTERN.test(body)
    || OBFUSCATED_DOT_DOMAIN_PATTERN.test(body);
}

function stripUnsafeControlCharacters(value: string): string {
  let nextValue = '';

  for (const character of value) {
    const code = character.charCodeAt(0);
    const isAllowedWhitespace = code === 9 || code === 10 || code === 13;

    if ((isAllowedWhitespace || code >= 32) && !BIDIRECTIONAL_CONTROL_CHARACTER_PATTERN.test(character)) {
      nextValue += character;
    }
  }

  return nextValue;
}
