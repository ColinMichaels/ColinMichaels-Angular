import {ComponentFixture, TestBed} from '@angular/core/testing';

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
    }).compileComponents();

    fixture = TestBed.createComponent(BlogBlockRendererComponent);
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
    expect(heading?.classList).toContain('blog-sticky-section-heading');
    expect(heading?.hasAttribute('data-sticky-active')).toBeTrue();
    expect(heading?.hasAttribute('data-sticky-section-heading')).toBeTrue();
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

    expect(figure?.classList).toContain('sm:float-left');
    expect(figure?.classList).toContain('sm:mr-6');
    expect(image?.classList).toContain('w-full');
    expect(image?.classList).toContain('border');
    expect(figure?.querySelector('figcaption')?.textContent).toContain('Inline image caption');
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
});
