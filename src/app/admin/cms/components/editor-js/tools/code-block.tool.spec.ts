import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {CmsCodeBlockData, CmsCodeBlockTool} from './code-block.tool';

function createTool(data: CmsCodeBlockData = {}, readOnly = false): CmsCodeBlockTool {
  return new CmsCodeBlockTool({
    data,
    readOnly,
  } as BlockToolConstructorOptions<CmsCodeBlockData>);
}

describe('CmsCodeBlockTool', () => {
  it('saves language metadata and code text', () => {
    const tool = createTool({
      language: 'TypeScript',
      code: 'const answer = 42;',
    });
    const element = tool.render();

    expect(element.textContent).toContain('Code block');
    expect(element.querySelector<HTMLInputElement>('[data-code-language]')?.value).toBe('typescript');
    expect(element.querySelector<HTMLTextAreaElement>('[data-code-text]')?.value).toBe('const answer = 42;');

    element.querySelector<HTMLInputElement>('[data-code-language]')!.value = 'JavaScript!';
    element.querySelector<HTMLTextAreaElement>('[data-code-text]')!.value = 'console.log(answer);';

    expect(tool.save(element)).toEqual({
      language: 'javascript',
      code: 'console.log(answer);',
    });
  });

  it('renders a wrapped live preview of the code block', () => {
    const tool = createTool({
      language: 'typescript',
      code: 'const reallyLongExampleName = "this should be readable inside the editor preview";',
    });
    const element = tool.render();
    const textarea = element.querySelector<HTMLTextAreaElement>('[data-code-text]');
    const languageInput = element.querySelector<HTMLInputElement>('[data-code-language]');
    const preview = element.querySelector<HTMLElement>('[data-code-preview]');
    const previewLanguage = element.querySelector<HTMLElement>('[data-code-preview-language]');
    const previewPre = preview?.querySelector<HTMLPreElement>('pre');
    const previewText = element.querySelector<HTMLElement>('[data-code-preview-text]');

    expect(textarea?.wrap).toBe('soft');
    expect(textarea?.style.whiteSpace).toBe('pre-wrap');
    expect(preview?.textContent).toContain('Rendered preview');
    expect(previewLanguage?.textContent).toBe('TYPESCRIPT');
    expect(previewPre?.style.whiteSpace).toBe('pre-wrap');
    expect(previewPre?.style.overflowWrap).toBe('anywhere');
    expect(previewText?.textContent).toContain('reallyLongExampleName');

    languageInput!.value = 'bash';
    languageInput!.dispatchEvent(new Event('input'));
    textarea!.value = 'npm run build';
    textarea!.dispatchEvent(new Event('input'));

    expect(previewLanguage?.textContent).toBe('BASH');
    expect(previewText?.textContent).toBe('npm run build');
  });

  it('requires non-empty code content', () => {
    const tool = createTool();

    expect(tool.validate({language: 'typescript', code: '  '})).toBeFalse();
    expect(tool.validate({language: 'typescript', code: 'const answer = 42;'})).toBeTrue();
  });

  it('honors read-only mode for editor fields', () => {
    const element = createTool({
      language: 'bash',
      code: 'npm run build',
    }, true).render();

    expect(element.querySelector<HTMLInputElement>('[data-code-language]')?.readOnly).toBeTrue();
    expect(element.querySelector<HTMLTextAreaElement>('[data-code-text]')?.readOnly).toBeTrue();
  });
});
