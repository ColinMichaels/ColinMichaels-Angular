import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {CmsMarkdownBlockData, CmsMarkdownBlockTool} from './markdown-block.tool';

function createTool(data: CmsMarkdownBlockData = {}, readOnly = false): CmsMarkdownBlockTool {
  return new CmsMarkdownBlockTool({
    data,
    readOnly,
  } as BlockToolConstructorOptions<CmsMarkdownBlockData>);
}

describe('CmsMarkdownBlockTool', () => {
  it('exposes a Markdown toolbox option and saves the source', () => {
    const tool = createTool({markdown: '## Original heading'});
    const element = tool.render();
    const textarea = element.querySelector<HTMLTextAreaElement>('[data-markdown-text]');

    expect(CmsMarkdownBlockTool.toolbox.title).toBe('Markdown');
    expect(element.textContent).toContain('Markdown block');
    expect(textarea?.value).toBe('## Original heading');

    textarea!.value = '**Updated** Markdown';

    expect(tool.save(element)).toEqual({markdown: '**Updated** Markdown'});
  });

  it('requires non-empty Markdown content', () => {
    const tool = createTool();

    expect(tool.validate({markdown: '  '})).toBeFalse();
    expect(tool.validate({markdown: '- Useful item'})).toBeTrue();
  });

  it('honors read-only mode', () => {
    const element = createTool({markdown: '# Read only'}, true).render();

    expect(element.querySelector<HTMLTextAreaElement>('[data-markdown-text]')?.readOnly).toBeTrue();
  });
});
