import {createBlogMarkdownPlainText} from './blog-markdown.util';

describe('blog Markdown utilities', () => {
  it('removes formatting syntax while preserving readable content', () => {
    expect(createBlogMarkdownPlainText([
      '## Setup',
      '',
      'Use **typed blocks**, run `npm install`, and open [the guide](https://example.com).',
      '',
      '- First item',
      '- Second item',
    ].join('\n'))).toBe('Setup Use typed blocks, run npm install, and open the guide. First item Second item');
  });

  it('keeps fenced code text and excludes raw script or style content', () => {
    expect(createBlogMarkdownPlainText([
      '```ts',
      'const answer = 42;',
      '```',
      '<script>window.bad = true;</script>',
      '<style>body { display: none; }</style>',
    ].join('\n'))).toBe('const answer = 42;');
  });
});
