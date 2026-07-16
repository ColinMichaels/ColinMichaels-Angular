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
});
