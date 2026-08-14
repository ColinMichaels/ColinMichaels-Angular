import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {BlogBlockRendererComponent} from './blog-block-renderer.component';

function installClipboardSpy(writeText: jasmine.Spy): () => void {
  const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {writeText},
  });

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'clipboard', originalDescriptor);
      return;
    }

    Reflect.deleteProperty(navigator, 'clipboard');
  };
}

describe('BlogBlockRendererComponent', () => {
  let fixture: ComponentFixture<BlogBlockRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogBlockRendererComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogBlockRendererComponent);
  });

  it('does not rebuild every content block when only the active heading changes during scroll', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'section-one',
        type: 'header',
        data: {text: 'Section one', level: 2},
      },
      {
        id: 'body-copy',
        type: 'markdown',
        data: {markdown: '**Rendered once** while the reader scrolls.'},
      },
    ]);
    fixture.detectChanges();
    const renderer = fixture.componentInstance as unknown as { renderedBlocks: readonly unknown[] };
    const initialBlocks = renderer.renderedBlocks;

    fixture.componentRef.setInput('activeHeadingId', 'section-one');
    fixture.detectChanges();

    expect(renderer.renderedBlocks).toBe(initialBlocks);
  });

  it('renders trusted video embeds in an iframe', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'embed-1',
        type: 'embed',
        data: {
          embedUrl: 'https://www.youtube.com/embed/example-id',
          caption: 'Architecture walkthrough',
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('iframe')).not.toBeNull();
    expect(element.querySelector('figcaption')?.textContent).toContain('Architecture walkthrough');
  });

  it('renders YouTube watch URLs as embed iframes', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'embed-watch-url',
        type: 'embed',
        data: {
          url: 'https://www.youtube.com/watch?v=L229QDxDakU',
        },
      },
    ]);
    fixture.detectChanges();

    const iframe = (fixture.nativeElement as HTMLElement).querySelector('iframe');

    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toContain('https://www.youtube.com/embed/L229QDxDakU');
  });

  it('renders an approved Suno song in its responsive player with a direct fallback', () => {
    const songId = '44cd6eab-d6d7-4cb9-bea7-af398776556e';
    fixture.componentRef.setInput('blocks', [
      {
        id: 'suno-1',
        type: 'embed',
        data: {
          provider: 'suno',
          url: `https://suno.com/song/${songId}`,
          embedUrl: `https://suno.com/embed/${songId}`,
          caption: 'Some Memories Never Stop Playing',
          height: 240,
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const iframe = element.querySelector<HTMLIFrameElement>('iframe');
    const fallback = element.querySelector<HTMLAnchorElement>('figure a');

    expect(iframe?.getAttribute('src')).toBe(`https://suno.com/embed/${songId}`);
    expect(iframe?.getAttribute('title')).toBe('Some Memories Never Stop Playing');
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-popups');
    expect(iframe?.getAttribute('allow')).toBe('autoplay; encrypted-media; fullscreen');
    expect(iframe?.style.height).toBe('240px');
    expect(fallback?.getAttribute('href')).toBe(`https://suno.com/song/${songId}`);
    expect(fallback?.textContent).toContain('Listen on Suno');
  });

  it('renders malformed Suno URLs as external links instead of trusted frames', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'suno-invalid',
        type: 'embed',
        data: {
          provider: 'suno',
          url: 'https://suno.com/playlist/not-a-song',
          caption: 'Invalid Suno destination',
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('iframe')).toBeNull();
    expect(element.querySelector('a')?.getAttribute('href')).toBe('https://suno.com/playlist/not-a-song');
  });

  it('renders the approved soundboard in a sandboxed app frame with an external fallback', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'app-embed-1',
        type: 'embed',
        data: {
          provider: 'app',
          embedUrl: 'https://hear-the-hook.captaincolin.chatgpt.site/',
          caption: 'Hear the Hook voice-cloning awareness demo',
          height: 820,
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const iframe = element.querySelector<HTMLIFrameElement>('iframe[data-app-embed-id]');
    const fallback = element.querySelector<HTMLAnchorElement>('figure a');

    expect(iframe?.getAttribute('src')).toBe('https://hear-the-hook.captaincolin.chatgpt.site/soundboard');
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-popups');
    expect(iframe?.getAttribute('allow')).toContain("microphone 'none'");
    expect(iframe?.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(iframe?.style.height).toBe('820px');
    expect(fallback?.getAttribute('href')).toBe('https://hear-the-hook.captaincolin.chatgpt.site/');
    expect(fallback?.textContent).toContain('Open interactive app');
  });

  it('accepts bounded resize messages only from the rendered soundboard frame', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'app-embed-resize',
        type: 'embed',
        data: {
          provider: 'app',
          embedUrl: 'https://hear-the-hook.captaincolin.chatgpt.site/soundboard',
          height: 700,
        },
      },
    ]);
    fixture.detectChanges();

    const iframe = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLIFrameElement>('iframe[data-app-embed-id]')!;

    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://example.com',
      source: iframe.contentWindow,
      data: {type: 'hear-the-hook:resize', height: 1200},
    }));
    fixture.detectChanges();
    expect(iframe.style.height).toBe('700px');

    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://hear-the-hook.captaincolin.chatgpt.site',
      source: iframe.contentWindow,
      data: {type: 'hear-the-hook:resize', height: 9999},
    }));
    fixture.detectChanges();
    expect(iframe.style.height).toBe('2400px');
  });

  it('does not frame other pages on the approved app host', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'app-embed-other-path',
        type: 'embed',
        data: {
          provider: 'app',
          url: 'https://hear-the-hook.captaincolin.chatgpt.site/other',
          caption: 'Unapproved app path',
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('iframe')).toBeNull();
    expect(element.querySelector('a')?.getAttribute('href'))
      .toBe('https://hear-the-hook.captaincolin.chatgpt.site/other');
  });

  it('renders untrusted embeds as outbound links', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'embed-2',
        type: 'embed',
        data: {
          url: 'https://example.com/embed/story',
          caption: 'External story',
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('iframe')).toBeNull();
    expect(element.querySelector('a')?.getAttribute('href')).toBe('https://example.com/embed/story');
  });

  it('renders typography pull quotes with attribution', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'typography-1',
        type: 'typography',
        data: {
          variant: 'pullQuote',
          text: 'A strong editorial line.',
          attribution: 'Field notes',
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('blockquote')?.textContent).toContain('A strong editorial line.');
    expect(element.querySelector('cite')?.textContent).toContain('Field notes');
  });

  it('renders Cat Corner unlock blocks through the shared Gretchen component', () => {
    fixture.componentRef.setInput('blocks', [{
      id: 'cat-corner-unlock-1',
      type: 'catCornerUnlock',
      data: {},
    }]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-testid="cat-corner-unlock-block"]')).not.toBeNull();
    expect(element.querySelector('app-cat-corner-easter-egg')).not.toBeNull();
  });

  it('renders linkable heading anchors', () => {
    fixture.componentRef.setInput('anchorPath', '/blog/test-post');
    fixture.componentRef.setInput('activeHeadingId', 'anchor-heading');
    fixture.componentRef.setInput('blocks', [
      {
        id: 'heading-1',
        type: 'header',
        data: {
          text: 'Anchor Heading',
          level: 2,
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const heading = element.querySelector('h2');
    const link = heading?.querySelector('a');

    expect(heading?.id).toBe('anchor-heading');
    expect(link?.getAttribute('href')).toBe('/blog/test-post#anchor-heading');
    expect(heading?.classList).toContain('clear-both');
    expect(heading?.classList).toContain('blog-sticky-section-heading');
    expect(heading?.hasAttribute('data-sticky-active')).toBeTrue();
    expect(heading?.hasAttribute('data-sticky-section-heading')).toBeTrue();
  });

  it('keeps long inline-formatted headings complete with their backward-compatible anchor', () => {
    fixture.componentRef.setInput('anchorPath', '/blog/long-heading');
    fixture.componentRef.setInput('blocks', [{
      id: 'long-heading',
      type: 'header',
      data: {
        text: 'A <strong>Long Editorial Heading</strong> That Still Wraps Without Losing Its Existing Anchor',
        level: 2,
      },
    }]);
    fixture.detectChanges();

    const heading = (fixture.nativeElement as HTMLElement).querySelector<HTMLHeadingElement>('h2');

    expect(heading?.id).toBe('a-long-editorial-heading-that-still-wraps-without-losing-its-existing-anchor');
    expect(heading?.textContent).toContain('A Long Editorial Heading That Still Wraps Without Losing Its Existing Anchor');
    expect(heading?.querySelector('strong')?.textContent).toBe('Long Editorial Heading');
    expect(heading?.querySelector('a')?.getAttribute('href'))
      .toBe('/blog/long-heading#a-long-editorial-heading-that-still-wraps-without-losing-its-existing-anchor');
  });

  it('expands TLDR headings and adds an accessible top tooltip', () => {
    fixture.componentRef.setInput('anchorPath', '/blog/test-post');
    fixture.componentRef.setInput('blocks', [{
      id: 'summary-heading',
      type: 'header',
      data: {text: 'TLDR', level: 2},
    }]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const heading = element.querySelector('h2');
    const link = heading?.querySelector('a');
    const tooltip = heading?.querySelector<HTMLElement>('[role="tooltip"]');

    expect(heading?.id).toBe('tldr');
    expect(heading?.textContent).toContain('Quick Summary (TL;DR)');
    expect(link?.getAttribute('href')).toBe('/blog/test-post#tldr');
    expect(link?.getAttribute('aria-describedby')).toBe('tldr-description');
    expect(tooltip?.id).toBe('tldr-description');
    expect(tooltip?.textContent).toContain('Too long; didn’t read');
    expect(tooltip?.classList).toContain('blog-quick-summary-tooltip');
  });

  it('clears inline image floats before level-three headings', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'heading-3',
        type: 'header',
        data: {text: 'Subheading after media', level: 3},
      },
    ]);
    fixture.detectChanges();

    const heading = (fixture.nativeElement as HTMLElement).querySelector('h3');

    expect(heading?.classList).toContain('clear-both');
  });

  it('keeps only the active level-two heading sticky', () => {
    fixture.componentRef.setInput('activeHeadingId', 'second-heading');
    fixture.componentRef.setInput('blocks', [
      {
        id: 'heading-1',
        type: 'header',
        data: {text: 'First Heading', level: 2},
      },
      {
        id: 'heading-2',
        type: 'header',
        data: {text: 'Second Heading', level: 2},
      },
    ]);
    fixture.detectChanges();

    const headings = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('h2'));

    expect(headings[0].classList).not.toContain('blog-sticky-section-heading');
    expect(headings[1].classList).toContain('blog-sticky-section-heading');
    expect(headings.filter(heading => heading.hasAttribute('data-sticky-active')).length).toBe(1);

    const flowingStyle = getComputedStyle(headings[0]);
    const stickyStyle = getComputedStyle(headings[1]);

    expect(stickyStyle.fontSize).toBe(flowingStyle.fontSize);
    expect(stickyStyle.lineHeight).toBe(flowingStyle.lineHeight);
    expect(stickyStyle.paddingTop).toBe(flowingStyle.paddingTop);
    expect(stickyStyle.paddingBottom).toBe(flowingStyle.paddingBottom);
  });

  it('retains intentional typography variant classes for Reader scaling', () => {
    fixture.componentRef.setInput('blocks', [
      {id: 'lead', type: 'typography', data: {variant: 'lead', text: 'Lead copy'}},
      {id: 'pull', type: 'typography', data: {variant: 'pullQuote', text: 'Pull quote'}},
      {id: 'aside', type: 'typography', data: {variant: 'aside', text: 'Aside copy'}},
      {id: 'caption', type: 'typography', data: {variant: 'caption', text: 'Caption copy'}},
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.blog-type-lead')?.textContent).toContain('Lead copy');
    expect(element.querySelector('.blog-type-pull-quote-copy')?.textContent).toContain('Pull quote');
    expect(element.querySelector('.blog-type-aside')?.textContent).toContain('Aside copy');
    expect(element.querySelector('.blog-type-caption')?.textContent).toContain('Caption copy');
  });

  it('opens rich text links in a new tab by default', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'paragraph-1',
        type: 'paragraph',
        data: {
          text: 'Read the <a href="https://example.com/story">source note</a>.',
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector<HTMLAnchorElement>('p a');

    expect(link?.getAttribute('href')).toBe('https://example.com/story');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link?.classList).toContain('blog-inline-link');
  });

  it('renders ordered and unordered lists with enhanced marker styling hooks', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'ordered-list',
        type: 'list',
        data: {
          ordered: true,
          items: ['Plan the post structure', 'Draft the examples'],
        },
      },
      {
        id: 'unordered-list',
        type: 'list',
        data: {
          ordered: false,
          items: ['Practical AI tips', 'Reusable prompts'],
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const orderedList = element.querySelector('ol');
    const unorderedList = element.querySelector('ul');

    expect(orderedList?.classList).toContain('blog-list');
    expect(orderedList?.classList).toContain('blog-list-ordered');
    expect(unorderedList?.classList).toContain('blog-list');
    expect(unorderedList?.classList).toContain('blog-list-unordered');
    expect(orderedList?.querySelectorAll('.blog-list-item-ordered').length).toBe(2);
    expect(unorderedList?.querySelectorAll('.blog-list-item-unordered').length).toBe(2);
    expect(orderedList?.hasAttribute('data-list-depth')).toBeFalse();
    expect(unorderedList?.hasAttribute('data-list-depth')).toBeFalse();
    expect(orderedList?.getAttribute('data-list-presentation')).toBe('standard');
    expect(orderedList?.getAttribute('role')).toBe('list');
    expect(unorderedList?.getAttribute('role')).toBe('list');
  });

  it('renders the optional Steps presentation only for ordered lists', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'steps-list',
        type: 'list',
        data: {
          ordered: true,
          listPresentation: 'steps',
          items: ['Draft the article', 'Review the preview'],
        },
      },
      {
        id: 'unordered-steps',
        type: 'list',
        data: {
          ordered: false,
          listPresentation: 'steps',
          items: ['This remains a standard unordered list'],
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const orderedList = element.querySelector<HTMLOListElement>('ol');
    const unorderedList = element.querySelector<HTMLUListElement>('ul');

    expect(orderedList?.classList).toContain('blog-list-steps');
    expect(orderedList?.getAttribute('data-list-presentation')).toBe('steps');
    expect(orderedList?.getAttribute('aria-label')).toBe('Steps');
    expect(orderedList?.querySelectorAll('.blog-list-item-steps').length).toBe(2);
    expect(unorderedList?.classList).not.toContain('blog-list-steps');
    expect(unorderedList?.getAttribute('data-list-presentation')).toBe('standard');
  });

  it('preserves ordered start and counter metadata in semantic and styled output', () => {
    fixture.componentRef.setInput('blocks', [{
      id: 'roman-list',
      type: 'list',
      data: {
        listStyle: 'ordered',
        listMeta: {start: 3, counterType: 'upper-roman'},
        listItems: [{content: 'Third stage', meta: {}, items: []}],
      },
    }]);
    fixture.detectChanges();

    const list = (fixture.nativeElement as HTMLElement).querySelector<HTMLOListElement>('ol');

    expect(list?.start).toBe(3);
    expect(list?.type).toBe('I');
    expect(list?.classList).toContain('blog-list-counter-upper-roman');
    expect(list?.style.getPropertyValue('--blog-list-counter-start')).toBe('2');
  });

  it('renders recursive ordered list items as nested semantic lists', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'nested-ordered-list',
        type: 'list',
        data: {
          listStyle: 'ordered',
          listItems: [
            {
              content: 'Prepare the release',
              meta: {},
              items: [
                {content: 'Confirm the final copy', meta: {}, items: []},
                {content: 'Confirm the artwork', meta: {}, items: []},
              ],
            },
          ],
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const rootList = element.querySelector<HTMLOListElement>('ol.blog-list-ordered:not(.blog-list-nested)');
    const nestedList = rootList?.querySelector<HTMLOListElement>(':scope > li > ol.blog-list-ordered.blog-list-nested');

    expect(rootList?.getAttribute('data-list-depth')).toBe('0');
    expect(nestedList?.getAttribute('data-list-depth')).toBe('1');
    expect(rootList?.querySelectorAll('li.blog-list-item-ordered').length).toBe(3);
    expect(nestedList?.querySelectorAll(':scope > li').length).toBe(2);
    expect(element.textContent).toContain('Confirm the final copy');
  });

  it('renders recursive unordered list items as nested semantic lists', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'nested-unordered-list',
        type: 'list',
        data: {
          listStyle: 'unordered',
          listItems: [
            {
              content: 'Accessibility checks',
              meta: {},
              items: [
                {content: 'Keyboard navigation', meta: {}, items: []},
              ],
            },
          ],
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const rootList = element.querySelector<HTMLUListElement>('ul.blog-list-unordered:not(.blog-list-nested)');
    const nestedList = rootList?.querySelector<HTMLUListElement>(':scope > li > ul.blog-list-unordered.blog-list-nested');

    expect(rootList?.getAttribute('data-list-depth')).toBe('0');
    expect(nestedList?.getAttribute('data-list-depth')).toBe('1');
    expect(rootList?.querySelectorAll('li.blog-list-item-unordered').length).toBe(2);
    expect(nestedList?.querySelectorAll(':scope > li').length).toBe(1);
    expect(element.textContent).toContain('Keyboard navigation');
  });

  it('renders deep bounded nesting and long rich links without flattening content', () => {
    fixture.componentRef.setInput('blocks', [{
      id: 'deep-list',
      type: 'list',
      data: {
        listStyle: 'unordered',
        listItems: [{
          content: 'Level one',
          meta: {},
          items: [{
            content: 'Level two',
            meta: {},
            items: [{
              content: 'Level three',
              meta: {},
              items: [{
                content: 'Read the <a href="https://example.com/a-very-long-production-readiness-reference">production readiness reference</a>',
                meta: {},
                items: [],
              }],
            }],
          }],
        }],
      },
    }]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const deepestList = element.querySelector('[data-list-depth="3"]');
    const link = element.querySelector<HTMLAnchorElement>('a');

    expect(deepestList).not.toBeNull();
    expect(element.querySelectorAll('ul[role="list"]').length).toBe(4);
    expect(link?.textContent).toBe('production readiness reference');
    expect(link?.getAttribute('href')).toBe('https://example.com/a-very-long-production-readiness-reference');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders recursive checklist items with inert checked state', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'nested-checklist',
        type: 'list',
        data: {
          listStyle: 'checklist',
          listItems: [
            {
              content: 'Draft complete',
              meta: {checked: true},
              items: [
                {content: 'Editorial review pending', meta: {checked: false}, items: []},
              ],
            },
          ],
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const rootList = element.querySelector<HTMLUListElement>('ul.blog-list-checklist:not(.blog-list-nested)');
    const nestedList = rootList?.querySelector<HTMLUListElement>(':scope > li > ul.blog-list-checklist.blog-list-nested');
    const checkboxes = Array.from(element.querySelectorAll<HTMLInputElement>('input.blog-list-checkbox'));

    expect(rootList?.getAttribute('data-list-depth')).toBe('0');
    expect(nestedList?.getAttribute('data-list-depth')).toBe('1');
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0].checked).toBeTrue();
    expect(checkboxes[1].checked).toBeFalse();
    expect(checkboxes.every(checkbox => checkbox.disabled)).toBeTrue();
    expect(element.textContent).toContain('Editorial review pending');
  });

  it('omits unsupported block envelopes without exposing their raw data', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'unsupported-private-widget',
        type: 'unsupported',
        data: {
          unsupportedBlock: {
            originalType: 'privateWidget',
            originalData: {
              html: '<img src="https://example.com/tracker.gif">Do not expose this payload',
              accessToken: 'private-token-value',
            },
          },
        },
      },
      {
        id: 'safe-paragraph',
        type: 'paragraph',
        data: {text: 'Public content remains visible.'},
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Public content remains visible.');
    expect(element.textContent).not.toContain('Do not expose this payload');
    expect(element.textContent).not.toContain('private-token-value');
    expect(element.querySelector('img[src*="tracker.gif"]')).toBeNull();
  });

  it('keeps same-page rich text anchors in the current tab', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'paragraph-2',
        type: 'paragraph',
        data: {
          text: 'Jump to <a href="#details">details</a>.',
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector<HTMLAnchorElement>('p a');

    expect(link?.getAttribute('href')).toBe('#details');
    expect(link?.getAttribute('target')).toBeNull();
    expect(link?.getAttribute('rel')).toBeNull();
    expect(link?.classList).toContain('blog-inline-link');
  });

  it('renders soft-wrapped code blocks with language labels and copy feedback', async () => {
    const code = 'const reallyLongExampleName = "this code should soft wrap inside the public blog code block instead of requiring horizontal scrolling";\nconsole.log(reallyLongExampleName);';
    const writeText = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    const restoreClipboard = installClipboardSpy(writeText);

    try {
      fixture.componentRef.setInput('blocks', [
        {
          id: 'code-1',
          type: 'code',
          data: {
            language: 'typescript',
            code,
          },
        },
      ]);
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      const button = element.querySelector<HTMLButtonElement>('[data-testid="blog-code-copy"]');
      const pre = element.querySelector<HTMLPreElement>('pre');
      const codeElement = element.querySelector<HTMLElement>('code');

      expect(element.textContent).toContain('TYPESCRIPT');
      expect(codeElement?.textContent).toBe(code);
      expect(codeElement?.getAttribute('data-language')).toBe('typescript');
      expect(pre?.classList).toContain('whitespace-pre-wrap');
      expect(pre?.classList).toContain('overflow-x-hidden');
      expect(pre?.classList).toContain('break-words');
      expect(codeElement?.classList).toContain('[overflow-wrap:anywhere]');
      expect(button?.textContent).toContain('Copy');
      expect(button?.getAttribute('aria-label')).toBe('Copy typescript code block');

      button?.click();
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      expect(writeText).toHaveBeenCalledOnceWith(code);
      expect(button?.textContent).toContain('Copied');
      expect(button?.getAttribute('aria-label')).toBe('Copied typescript code block');
    } finally {
      restoreClipboard();
    }
  });

  it('renders stat cards and chart values for custom data blocks', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'stats-1',
        type: 'stats',
        data: {
          title: 'Quick Specs',
          stats: [
            {label: 'Horsepower', value: '480 hp', caption: 'GT trim'},
            {label: 'Torque', value: '415 lb-ft'},
          ],
          caption: 'Factory published figures.',
        },
      },
      {
        id: 'chart-1',
        type: 'chart',
        data: {
          title: 'Power by Trim',
          chartType: 'bar',
          unit: 'hp',
          chartPoints: [
            {label: 'EcoBoost', value: 315},
            {label: 'GT', value: 480, note: 'Manual coupe'},
          ],
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Quick Specs');
    expect(element.textContent).toContain('480 hp');
    expect(element.textContent).toContain('Factory published figures.');
    expect(element.textContent).toContain('Power by Trim');
    expect(element.textContent).toContain('315 hp');
    expect(element.textContent).toContain('Manual coupe');
    expect(element.querySelector('[aria-label^="Power by Trim"]')).not.toBeNull();
  });

  it('renders independent lines and a legend for multi-series chart points', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'chart-series-1',
        type: 'chart',
        data: {
          title: 'Title trends',
          chartType: 'line',
          unit: '%',
          chartPoints: [
            {label: '1995–2004', value: 18, series: 'One-word titles'},
            {label: '1995–2004', value: 5.3, series: 'Titles using love'},
            {label: '2015–2024', value: 28.2, series: 'One-word titles'},
            {label: '2015–2024', value: 3, series: 'Titles using love'},
          ],
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const chart = element.querySelector<HTMLElement>('[data-testid="blog-chart"]');
    const canvas = element.querySelector<HTMLCanvasElement>('[data-testid="blog-chart-canvas"]');

    expect(chart?.textContent).toContain('One-word titles');
    expect(chart?.textContent).toContain('Titles using love');
    expect(chart?.querySelectorAll('thead th').length).toBe(3);
    expect(chart?.querySelectorAll('tbody tr').length).toBe(2);
    expect(canvas?.getAttribute('aria-label')).toContain('One-word titles: 1995–2004: 18.00 %');
  });

  it('renders sanitized custom HTML blocks', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'html-1',
        type: 'html',
        data: {
          title: 'Spec Table',
          html: `
            <section>
              <a href="https://example.com/window-sticker">Window sticker</a>
              <img src="/assets/images/backgrounds/day.webp" alt="Factory detail">
              <iframe src="https://example.com/unsafe-app"></iframe>
              <script>window.bad = true;</script>
              <table><tr><th>0-60 mph</th><td>4.2 sec</td></tr></table>
            </section>
          `,
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const customHtml = element.querySelector<HTMLElement>('.blog-custom-html');
    const link = customHtml?.querySelector<HTMLAnchorElement>('a');
    const image = customHtml?.querySelector<HTMLImageElement>('img');

    expect(element.textContent).toContain('Spec Table');
    expect(customHtml?.textContent).toContain('0-60 mph');
    expect(customHtml?.querySelector('script')).toBeNull();
    expect(customHtml?.querySelector('iframe')).toBeNull();
    expect(link?.getAttribute('href')).toBe('https://example.com/window-sticker');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.classList).toContain('blog-inline-link');
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.getAttribute('decoding')).toBe('async');
    expect(image?.classList).toContain('blog-image-reveal');
  });

  it('parses and sanitizes Markdown blocks', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'markdown-1',
        type: 'markdown',
        data: {
          markdown: '# Setup\n\nUse **typed blocks**.\n\n[Unsafe](javascript:alert(1))\n\n<script>window.bad = true;</script>',
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const markdown = element.querySelector<HTMLElement>('.blog-markdown');

    expect(markdown?.querySelector('h2')?.textContent).toBe('Setup');
    expect(markdown?.querySelector('h1')).toBeNull();
    expect(markdown?.querySelector('strong')?.textContent).toBe('typed blocks');
    expect(markdown?.querySelector('a')?.hasAttribute('href')).toBeFalse();
    expect(markdown?.querySelector('script')).toBeNull();
  });

  it('renders typed galleries and keeps their lightbox navigation inside the gallery', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'standalone-before',
        type: 'image',
        data: {url: '/assets/images/backgrounds/night.webp?before=1', alt: 'Standalone before'},
      },
      {
        id: 'gallery-1',
        type: 'gallery',
        data: {
          title: 'Studio details',
          galleryLayout: 'mosaic',
          galleryImages: [
            {url: '/assets/images/backgrounds/day.webp?gallery=1', alt: 'Gallery first'},
            {url: '/assets/images/backgrounds/night.webp?gallery=2', alt: 'Gallery second'},
          ],
        },
      },
      {
        id: 'standalone-after',
        type: 'image',
        data: {url: '/assets/images/backgrounds/day.webp?after=1', alt: 'Standalone after'},
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const gallery = element.querySelector<HTMLElement>('[data-gallery-layout="mosaic"]');
    const galleryButtons = gallery?.querySelectorAll<HTMLButtonElement>('[data-testid="blog-gallery-image-button"]');
    galleryButtons?.[1].click();
    fixture.detectChanges();

    expect(element.querySelector<HTMLElement>('#blog-lightbox-title')?.textContent).toContain('2 / 2');
    expect(element.querySelector<HTMLImageElement>('[data-testid="blog-lightbox-image"]')?.src)
      .toContain('night.webp?gallery=2');

    element.querySelector<HTMLButtonElement>('[data-testid="blog-lightbox-next"]')?.click();
    fixture.detectChanges();

    expect(element.querySelector<HTMLImageElement>('[data-testid="blog-lightbox-image"]')?.src)
      .toContain('day.webp?gallery=1');
    expect(element.querySelector<HTMLElement>('#blog-lightbox-title')?.textContent).toContain('1 / 2');
  });

  it('opens post body images in a lightbox with a download action', () => {
    fixture.componentRef.setInput('fallbackAlt', 'Fallback post title');
    fixture.componentRef.setInput('blocks', [
      {
        id: 'image-1',
        type: 'image',
        data: {
          url: '/assets/images/backgrounds/day.webp',
          alt: 'First detail image',
          caption: 'First <strong>caption</strong>',
        },
      },
      {
        id: 'image-2',
        type: 'image',
        data: {
          url: '/assets/images/backgrounds/night.webp?token=abc',
          alt: 'Second detail image',
          caption: 'Second caption',
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('figure')?.classList).toContain('blog-image-reveal');
    element.querySelector<HTMLButtonElement>('figure button')?.click();
    fixture.detectChanges();

    const dialog = element.querySelector<HTMLElement>('[role="dialog"]');
    const lightboxImage = element.querySelector<HTMLImageElement>('[data-testid="blog-lightbox-image"]');
    const download = element.querySelector<HTMLAnchorElement>('[data-testid="blog-lightbox-download"]');

    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('1 / 2');
    expect(lightboxImage?.getAttribute('src')).toBe('/assets/images/backgrounds/day.webp');
    expect(lightboxImage?.getAttribute('alt')).toBe('First detail image');
    expect(download?.getAttribute('href')).toBe('/assets/images/backgrounds/day.webp');
    expect(download?.getAttribute('download')).toBe('day.webp');
    expect(download?.getAttribute('aria-label')).toBe('Download image: First detail image');
    expect(dialog?.textContent).toContain('First caption');
  });

  it('renders inline image layouts for text wrapping on wider screens', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'image-inline',
        type: 'image',
        data: {
          url: '/assets/images/backgrounds/day.webp',
          alt: 'Inline detail image',
          caption: 'Inline image caption',
          imageLayout: 'inlineStart',
          withBorder: true,
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const figure = element.querySelector('figure');
    const image = figure?.querySelector('img');

    expect(figure?.classList).toContain('blog-image-layout-inlineStart');
    expect(figure?.classList).toContain('blog-image-size-automatic');
    expect(image?.classList).toContain('blog-image-media');
    expect(image?.classList).toContain('border');
    expect(figure?.querySelector('figcaption')?.textContent).toContain('Inline image caption');
  });

  it('renders every bounded image size without arbitrary inline widths', () => {
    fixture.componentRef.setInput('blocks', ['small', 'medium', 'large', 'wide'].map((imageSize, index) => ({
      id: `image-${imageSize}`,
      type: 'image' as const,
      data: {
        url: `/assets/images/backgrounds/${index % 2 === 0 ? 'day' : 'night'}.webp`,
        alt: `${imageSize} image`,
        imageLayout: imageSize === 'wide' ? 'fullWidth' as const : 'contained' as const,
        imageSize: imageSize as 'small' | 'medium' | 'large' | 'wide',
        width: 1600,
        height: index === 0 ? 2400 : 900,
      },
    })));
    fixture.detectChanges();

    const figures = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('figure[data-image-size]'));

    expect(figures.map(figure => figure.dataset['imageSize'])).toEqual(['small', 'medium', 'large', 'wide']);
    expect(figures.every(figure => figure.style.width === '')).toBeTrue();
    expect(figures[3].classList).toContain('blog-image-size-wide');
    expect(figures[3].classList).toContain('blog-image-layout-fullWidth');
    expect(figures[0].querySelector('img')?.getAttribute('width')).toBe('1600');
    expect(figures[0].querySelector('img')?.getAttribute('height')).toBe('2400');
  });

  it('keeps legacy missing size and dimensions valid without emitting invalid attributes', () => {
    fixture.componentRef.setInput('blocks', [{
      id: 'legacy-image',
      type: 'image',
      data: {
        url: '/assets/images/backgrounds/day.webp',
        alt: 'Legacy image',
      },
    }]);
    fixture.detectChanges();

    const figure = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('figure');
    const image = figure?.querySelector('img');

    expect(figure?.dataset['imageSize']).toBe('automatic');
    expect(image?.hasAttribute('width')).toBeFalse();
    expect(image?.hasAttribute('height')).toBeFalse();
  });

  it('replaces a broken body image with an accessible non-interactive fallback', () => {
    fixture.componentRef.setInput('blocks', [{
      id: 'broken-image',
      type: 'image',
      data: {
        url: 'https://images.example.com/missing.jpg',
        alt: 'A missing editorial diagram',
        caption: 'The caption remains available.',
        imageSize: 'medium',
      },
    }]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector('img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const fallback = element.querySelector<HTMLElement>('[data-testid="blog-image-unavailable"]');
    expect(fallback?.textContent).toContain('Image unavailable');
    expect(fallback?.textContent).toContain('A missing editorial diagram');
    expect(element.querySelector('figure button')).toBeNull();
    expect(element.querySelector('figcaption')?.textContent).toContain('The caption remains available.');
  });

  it('navigates image galleries with controls and keyboard shortcuts', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'image-1',
        type: 'image',
        data: {
          url: '/assets/images/backgrounds/day.webp',
          alt: 'First detail image',
        },
      },
      {
        id: 'image-2',
        type: 'image',
        data: {
          url: '/assets/images/backgrounds/night.webp',
          alt: 'Second detail image',
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('figure button')?.click();
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('[data-testid="blog-lightbox-next"]')?.click();
    fixture.detectChanges();

    expect(element.querySelector<HTMLElement>('[role="dialog"]')?.textContent).toContain('2 / 2');
    expect(element.querySelector<HTMLImageElement>('[data-testid="blog-lightbox-image"]')?.getAttribute('src'))
      .toBe('/assets/images/backgrounds/night.webp');

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft'}));
    fixture.detectChanges();

    expect(element.querySelector<HTMLElement>('[role="dialog"]')?.textContent).toContain('1 / 2');
    expect(element.querySelector<HTMLImageElement>('[data-testid="blog-lightbox-image"]')?.getAttribute('src'))
      .toBe('/assets/images/backgrounds/day.webp');
  });

  it('closes the image lightbox with the close control and escape key', () => {
    fixture.componentRef.setInput('blocks', [
      {
        id: 'image-1',
        type: 'image',
        data: {
          url: '/assets/images/backgrounds/day.webp',
          alt: 'First detail image',
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('figure button')?.click();
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).not.toBeNull();

    element.querySelector<HTMLButtonElement>('[data-testid="blog-lightbox-close"]')?.click();
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).toBeNull();

    element.querySelector<HTMLButtonElement>('figure button')?.click();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('traps focus, makes article content inert, locks scrolling, and restores focus on close', fakeAsync(() => {
    const originalOverflow = document.body.style.overflow;
    fixture.componentRef.setInput('blocks', [{
      id: 'accessible-image',
      type: 'image',
      data: {
        url: '/assets/images/backgrounds/day.webp',
        alt: 'Accessible gallery image',
        caption: 'Accessible gallery caption',
      },
    }]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('figure button');
    trigger?.focus();
    trigger?.click();
    fixture.detectChanges();
    tick();

    const content = element.querySelector<HTMLElement>('.blog-content');
    const close = element.querySelector<HTMLButtonElement>('[data-testid="blog-lightbox-close"]');
    const backdrop = element.querySelector<HTMLButtonElement>('[data-testid="blog-lightbox-backdrop"]');

    expect(content?.hasAttribute('inert')).toBeTrue();
    expect(content?.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(close);

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true}));
    expect(document.activeElement).toBe(backdrop);

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    fixture.detectChanges();
    tick();

    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(content?.hasAttribute('inert')).toBeFalse();
    expect(document.body.style.overflow).toBe(originalOverflow);
    expect(document.activeElement).toBe(trigger);
  }));
});
