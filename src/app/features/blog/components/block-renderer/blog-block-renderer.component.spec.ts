import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BlogBlockRendererComponent} from './blog-block-renderer.component';

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
});
