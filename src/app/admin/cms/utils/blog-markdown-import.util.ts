import {BlogContentBlock} from '../../../features/blog/models/blog-post.model';

function createImportedBlockId(index: number): string {
  return `imported-${Date.now().toString(36)}-${index}`;
}

function normalizeMarkdownInline(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function createMarkdownParagraph(lines: readonly string[], index: number): BlogContentBlock {
  return {
    id: createImportedBlockId(index),
    type: 'paragraph',
    data: {
      text: normalizeMarkdownInline(lines.join(' ')),
    },
  };
}

export function createBlogBlocksFromMarkdown(content: string): readonly BlogContentBlock[] {
  const blocks: BlogContentBlock[] = [];
  const paragraphLines: string[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let index = 0;
  let isInCodeFence = false;
  let codeFenceLanguage = '';
  let codeFenceLines: string[] = [];

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push(createMarkdownParagraph(paragraphLines, index));
    paragraphLines.length = 0;
    index += 1;
  };

  const pushBlock = (block: Omit<BlogContentBlock, 'id'>): void => {
    blocks.push({
      ...block,
      id: createImportedBlockId(index),
    });
    index += 1;
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const trimmedLine = line.trim();
    const codeFenceMatch = trimmedLine.match(/^```([a-z0-9_-]*)/i);

    if (codeFenceMatch) {
      if (isInCodeFence) {
        pushBlock({
          type: 'code',
          data: {
            language: codeFenceLanguage,
            code: codeFenceLines.join('\n'),
          },
        });
        isInCodeFence = false;
        codeFenceLanguage = '';
        codeFenceLines = [];
      } else {
        flushParagraph();
        isInCodeFence = true;
        codeFenceLanguage = codeFenceMatch[1] ?? '';
      }

      continue;
    }

    if (isInCodeFence) {
      codeFenceLines.push(line);
      continue;
    }

    if (!trimmedLine) {
      flushParagraph();
      continue;
    }

    const imageMatch = trimmedLine.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
    const unorderedListMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    const orderedListMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
    const quoteMatch = trimmedLine.match(/^>\s+(.+)$/);

    if (imageMatch) {
      flushParagraph();
      pushBlock({
        type: 'image',
        data: {
          url: imageMatch[2],
          alt: imageMatch[1],
          caption: '',
          stretched: true,
          imageLayout: 'fullWidth',
        },
      });
      continue;
    }

    if (headingMatch) {
      flushParagraph();
      pushBlock({
        type: 'header',
        data: {
          text: normalizeMarkdownInline(headingMatch[2]),
          level: headingMatch[1].length >= 3 ? 3 : 2,
        },
      });
      continue;
    }

    if (unorderedListMatch || orderedListMatch) {
      flushParagraph();
      const ordered = Boolean(orderedListMatch);
      const items = [normalizeMarkdownInline((orderedListMatch ?? unorderedListMatch)?.[1] ?? '')];

      while (lines[lineIndex + 1]) {
        const nextLine = lines[lineIndex + 1]?.trim() ?? '';
        const nextMatch = ordered
          ? nextLine.match(/^\d+\.\s+(.+)$/)
          : nextLine.match(/^[-*]\s+(.+)$/);

        if (!nextMatch) {
          break;
        }

        items.push(normalizeMarkdownInline(nextMatch[1]));
        lineIndex += 1;
      }

      pushBlock({
        type: 'list',
        data: {
          ordered,
          items,
        },
      });
      continue;
    }

    if (quoteMatch) {
      flushParagraph();
      pushBlock({
        type: 'quote',
        data: {
          text: normalizeMarkdownInline(quoteMatch[1]),
          caption: '',
        },
      });
      continue;
    }

    if (/^-{3,}$/.test(trimmedLine)) {
      flushParagraph();
      pushBlock({
        type: 'delimiter',
        data: {},
      });
      continue;
    }

    paragraphLines.push(trimmedLine);
  }

  flushParagraph();

  if (isInCodeFence || codeFenceLines.length > 0) {
    pushBlock({
      type: 'code',
      data: {
        language: codeFenceLanguage,
        code: codeFenceLines.join('\n'),
      },
    });
  }

  return blocks;
}
