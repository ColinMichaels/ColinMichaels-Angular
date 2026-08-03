import {
  normalizeEditorDocumentForBlogEditor,
  validateEditorDocumentForBlog,
} from './blog-editor-document-validation.util';

describe('blog editor document validation', () => {
  it('accepts supported block schemas without diagnostics', () => {
    const result = validateEditorDocumentForBlog({
      blocks: [
        {id: 'paragraph-1', type: 'paragraph', data: {text: 'Hello'}},
        {
          id: 'list-1',
          type: 'list',
          data: {
            style: 'checklist',
            meta: {},
            items: [{content: 'Ready', meta: {checked: true}, items: []}],
          },
        },
      ],
    });

    expect(result).toEqual({isValid: true, diagnostics: []});
  });

  it('reports raw unsupported types as preserved warnings with block context', () => {
    const result = validateEditorDocumentForBlog({
      blocks: [{id: 'table-1', type: 'table', data: {content: [['A', 'B']]}}],
    });

    expect(result.isValid).toBeTrue();
    expect(result.diagnostics).toEqual([{
      severity: 'warning',
      code: 'preserved-unsupported-block',
      blockIndex: 0,
      blockType: 'table',
      message: 'Block 1 (table) is unsupported and will be preserved in a compatibility envelope.',
    }]);
  });

  it('continues reporting preserved warnings after an unsupported block is wrapped', () => {
    const result = validateEditorDocumentForBlog({
      blocks: [{
        id: 'table-1',
        type: 'unsupported',
        data: {originalType: 'table', originalData: {content: [['A', 'B']]}},
      }],
    });

    expect(result.isValid).toBeTrue();
    expect(result.diagnostics[0]).toEqual(jasmine.objectContaining({
      severity: 'warning',
      blockIndex: 0,
      blockType: 'table',
    }));
  });

  it('rejects malformed known blocks rather than approving lossy normalization', () => {
    const result = validateEditorDocumentForBlog({
      blocks: [
        {id: 'ok', type: 'paragraph', data: {text: 'Safe'}},
        {
          id: 'bad-list',
          type: 'list',
          data: {
            style: 'unordered',
            items: ['Legacy', {content: 'Recursive', meta: {}, items: []}],
          },
        },
        {id: 'bad-paragraph', type: 'paragraph', data: {text: 'Copy', alignment: 'center'}},
      ],
    });

    expect(result.isValid).toBeFalse();
    expect(result.diagnostics).toEqual([
      jasmine.objectContaining({
        severity: 'error',
        code: 'invalid-known-block',
        blockIndex: 1,
        blockType: 'list',
      }),
      jasmine.objectContaining({
        severity: 'error',
        code: 'invalid-known-block',
        blockIndex: 2,
        blockType: 'paragraph',
      }),
    ]);
  });

  it('rejects malformed unsupported envelopes', () => {
    const result = validateEditorDocumentForBlog({
      blocks: [{id: 'unsupported-1', type: 'unsupported', data: {originalType: 'table'}}],
    });

    expect(result.isValid).toBeFalse();
    expect(result.diagnostics[0]).toEqual(jasmine.objectContaining({
      severity: 'error',
      code: 'invalid-known-block',
      blockType: 'unsupported',
    }));
  });

  it('rejects non-object tune metadata instead of dropping it', () => {
    const result = validateEditorDocumentForBlog({
      blocks: [{
        id: 'paragraph-1',
        type: 'paragraph',
        data: {text: 'Safe copy'},
        tunes: ['alignment'],
      }],
    });

    expect(result.isValid).toBeFalse();
    expect(result.diagnostics[0]).toEqual(jasmine.objectContaining({
      severity: 'error',
      code: 'invalid-editor-block',
      blockIndex: 0,
      blockType: 'paragraph',
    }));
  });

  it('warns when the first article heading repeats the post title after inline formatting is removed', () => {
    const result = validateEditorDocumentForBlog({
      blocks: [
        {id: 'intro', type: 'paragraph', data: {text: 'Opening copy'}},
        {id: 'heading', type: 'header', data: {text: 'A <em>Production</em> Heading', level: 2}},
      ],
    }, {postTitle: 'A Production Heading'});

    expect(result.isValid).toBeTrue();
    expect(result.diagnostics).toContain(jasmine.objectContaining({
      severity: 'warning',
      code: 'repeated-post-title-heading',
      blockIndex: 1,
      blockType: 'header',
    }));
  });

  it('warns for navigational Markdown headings but ignores headings inside fenced code', () => {
    const result = validateEditorDocumentForBlog({
      blocks: [
        {id: 'markdown-heading', type: 'markdown', data: {markdown: '## Visible section\n\nBody copy.'}},
        {id: 'markdown-code', type: 'markdown', data: {markdown: '```md\n# Code sample\n```'}},
      ],
    });

    expect(result.isValid).toBeTrue();
    expect(result.diagnostics.filter(diagnostic => diagnostic.code === 'markdown-heading-outside-toc'))
      .toEqual([jasmine.objectContaining({blockIndex: 0, blockType: 'markdown'})]);
  });

  it('accepts bounded list presentation tune data and rejects unsupported values', () => {
    const valid = validateEditorDocumentForBlog({
      blocks: [{
        id: 'steps',
        type: 'list',
        data: {style: 'ordered', items: ['Draft', 'Review']},
        tunes: {listPresentation: {presentation: 'steps'}},
      }],
    });
    const invalid = validateEditorDocumentForBlog({
      blocks: [{
        id: 'timeline',
        type: 'list',
        data: {style: 'ordered', items: ['Draft', 'Review']},
        tunes: {listPresentation: {presentation: 'timeline'}},
      }],
    });
    const invalidStyle = validateEditorDocumentForBlog({
      blocks: [{
        id: 'unordered-steps',
        type: 'list',
        data: {style: 'unordered', items: ['Draft', 'Review']},
        tunes: {listPresentation: {presentation: 'steps'}},
      }],
    });

    expect(valid.isValid).toBeTrue();
    expect(invalid.isValid).toBeFalse();
    expect(invalid.diagnostics[0]).toEqual(jasmine.objectContaining({
      severity: 'error',
      code: 'invalid-known-block',
      blockType: 'list',
    }));
    expect(invalidStyle.isValid).toBeFalse();
    expect(invalidStyle.diagnostics[0]).toEqual(jasmine.objectContaining({
      severity: 'error',
      code: 'invalid-known-block',
      blockType: 'list',
      message: jasmine.stringContaining('only with an ordered list'),
    }));
  });

  it('accepts bounded image sizes and rejects arbitrary sizes or invalid intrinsic dimensions', () => {
    const valid = validateEditorDocumentForBlog({
      blocks: [{
        id: 'wide-image',
        type: 'image',
        data: {
          file: {url: 'https://images.example.com/wide.jpg', width: 2400, height: 1200},
          imageLayout: 'fullWidth',
          imageSize: 'wide',
        },
      }],
    });
    const invalidSize = validateEditorDocumentForBlog({
      blocks: [{
        id: 'pixel-image',
        type: 'image',
        data: {file: {url: 'https://images.example.com/pixel.jpg'}, imageSize: '960px'},
      }],
    });
    const invalidDimensions = validateEditorDocumentForBlog({
      blocks: [{
        id: 'negative-image',
        type: 'image',
        data: {file: {url: 'https://images.example.com/negative.jpg', width: -1, height: 0}},
      }],
    });

    expect(valid.isValid).toBeTrue();
    expect(invalidSize.isValid).toBeFalse();
    expect(invalidSize.diagnostics[0]).toEqual(jasmine.objectContaining({
      code: 'invalid-known-block',
      blockType: 'image',
    }));
    expect(invalidDimensions.isValid).toBeFalse();
    expect(invalidDimensions.diagnostics[0]).toEqual(jasmine.objectContaining({
      code: 'invalid-known-block',
      blockType: 'image',
    }));
  });

  it('normalizes only raw unknown tools and preserves IDs, source data, tunes, and document metadata', () => {
    const document = {
      time: 123,
      version: '2.31.0',
      blocks: [
        {id: 'paragraph-1', type: 'paragraph', data: {text: 'Safe'}},
        {
          id: 'table-1',
          type: 'table',
          data: {content: [['Name', 'Value']], flags: {compact: true}},
          tunes: {alignmentTune: {alignment: 'center'}},
        },
      ],
    };

    const normalized = normalizeEditorDocumentForBlogEditor(document);

    expect(normalized).not.toBe(document);
    expect(normalized.time).toBe(123);
    expect(normalized.version).toBe('2.31.0');
    expect(normalized.blocks[0]).toBe(document.blocks[0]);
    expect(normalized.blocks[1]).toEqual({
      id: 'table-1',
      type: 'unsupported',
      data: {
        originalType: 'table',
        originalData: {content: [['Name', 'Value']], flags: {compact: true}},
        originalTunes: {alignmentTune: {alignment: 'center'}},
      },
    });
    expect(document.blocks[1].type).toBe('table');
  });
});
