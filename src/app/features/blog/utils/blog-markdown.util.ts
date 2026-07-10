/**
 * Converts Markdown source into lightweight plain text for secondary systems
 * such as search, reading-time estimates, and CMS metadata suggestions.
 * Public HTML rendering still goes through marked plus Angular sanitization.
 */
export function createBlogMarkdownPlainText(markdown: string | undefined): string {
  if (!markdown) {
    return '';
  }

  return decodeMarkdownEntities(markdown
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/```(?:[^\n]*)\n([\s\S]*?)```/g, ' $1 ')
    .replace(/~~~(?:[^\n]*)\n([\s\S]*?)~~~/g, ' $1 ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' $1 ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, ' $1 ')
    .replace(/`([^`\n]+)`/g, ' $1 ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}(?:[-+*]|\d+\.)\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, ' ')
    .replace(/\*\*|__|~~/g, '')
    .replace(/(^|[\s(])[*_](?=\S)/g, '$1')
    .replace(/[*_](?=$|[\s).,!?:;])/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim());
}

function decodeMarkdownEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}
