import {htmlToPlainText, parseInertHtmlFragment} from './blog-html.util';

describe('blog HTML utilities', () => {
  it('decodes entities and preserves visible text without live innerHTML parsing', () => {
    expect(htmlToPlainText(document, 'Research &amp; <strong>field notes</strong>'))
      .toBe('Research & field notes');
  });

  it('removes non-content elements from plain-text output', () => {
    expect(htmlToPlainText(document, 'Safe<script>alert(1)</script><style>.bad{}</style> text'))
      .toBe('Safe text');
  });

  it('creates detached fragments for rich-content processing', () => {
    const fragment = parseInertHtmlFragment(document, '<p><strong>Detached</strong> content</p>');

    expect(fragment.querySelector('strong')?.textContent).toBe('Detached');
    expect(fragment.isConnected).toBeFalse();
  });
});
