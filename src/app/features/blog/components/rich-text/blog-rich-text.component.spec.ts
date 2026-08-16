import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BlogRichTextComponent} from './blog-rich-text.component';

describe('BlogRichTextComponent', () => {
  let fixture: ComponentFixture<BlogRichTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [BlogRichTextComponent]}).compileComponents();
    fixture = TestBed.createComponent(BlogRichTextComponent);
  });

  it('renders sanitized formatting and hardens outbound links', () => {
    fixture.componentRef.setInput('html', '<strong>Formatted</strong> <a href="https://example.com">source</a>');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector('a');

    expect(element.querySelector('strong')?.textContent).toBe('Formatted');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link?.classList).toContain('blog-inline-link');
  });

  it('removes executable content and unsafe links', () => {
    fixture.componentRef.setInput('html', '<script>window.bad=true</script><a href="javascript:alert(1)" onclick="alert(2)">Unsafe</a>');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector('a');

    expect(element.querySelector('script')).toBeNull();
    expect(link?.hasAttribute('href')).toBeFalse();
    expect(link?.hasAttribute('onclick')).toBeFalse();
  });

  it('normalizes Markdown headings and enhances content images', () => {
    fixture.componentRef.setInput('mode', 'markdown');
    fixture.componentRef.setInput('html', '<h1>Setup</h1><img src="/assets/example.webp" alt="Example">');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const image = element.querySelector('img');

    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('h2')?.textContent).toBe('Setup');
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.getAttribute('decoding')).toBe('async');
    expect(image?.classList).toContain('blog-image-reveal');
  });

  it('turns a bare HTTP source into a hardened link without swallowing punctuation', () => {
    fixture.componentRef.setInput('html', '<p>Read (https://example.com/reports/source.pdf).</p>');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const paragraph = element.querySelector('p');
    const link = paragraph?.querySelector('a');

    expect(link?.textContent).toBe('https://example.com/reports/source.pdf');
    expect(link?.getAttribute('href')).toBe('https://example.com/reports/source.pdf');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link?.classList).toContain('blog-inline-link');
    expect(paragraph?.textContent).toBe('Read (https://example.com/reports/source.pdf).');
  });

  it('does not create nested links or linkify code samples', () => {
    fixture.componentRef.setInput(
      'html',
      '<p><a href="https://example.com/already-linked">Existing source</a> <code>https://example.com/code</code> https://example.com/plain</p>'
    );
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const links = element.querySelectorAll('a');

    expect(links.length).toBe(2);
    expect(links[0].textContent).toBe('Existing source');
    expect(links[1].textContent).toBe('https://example.com/plain');
    expect(element.querySelector('code a')).toBeNull();
  });
});
