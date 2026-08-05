export const POST_READ_COMPLETION_PERCENT = 95;

/**
 * Read points represent a completed article, not a route load. Keep this check
 * server-side so the old route-load client cannot award points without an
 * explicit completion claim. This validates the supported client contract; it
 * is not independent proof that a modified client actually read the article.
 */
export function isQualifiedPostReadProgress(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= POST_READ_COMPLETION_PERCENT
    && value <= 100;
}
