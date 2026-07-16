import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SecurityContext,
  inject,
} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

import {parseInertHtmlFragment} from '../../utils/blog-html.util';

export type BlogRichTextMode = 'inline' | 'block' | 'markdown';

@Component({
  selector: 'app-blog-rich-text',
  template: '',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogRichTextComponent implements OnChanges {
  @Input() html = '';
  @Input() mode: BlogRichTextMode = 'inline';

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);

  ngOnChanges(): void {
    const hostElement = this.host.nativeElement;
    const sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, this.html) ?? '';
    const fragment = parseInertHtmlFragment(hostElement.ownerDocument, sanitizedHtml);

    this.removeActiveContent(fragment);
    this.removeExecutableAttributes(fragment);

    if (this.mode === 'markdown') {
      this.normalizeMarkdownHeadings(fragment);
    }

    if (this.mode !== 'inline') {
      this.enhanceImages(fragment);
    }

    this.enhanceAnchors(fragment);
    hostElement.replaceChildren(fragment);
  }

  private removeActiveContent(fragment: DocumentFragment): void {
    fragment
      .querySelectorAll('script, style, iframe, object, embed, link, meta, base, form, input, button, textarea, select')
      .forEach(element => element.remove());
  }

  private removeExecutableAttributes(fragment: DocumentFragment): void {
    fragment.querySelectorAll<HTMLElement>('*').forEach(element => {
      for (const attribute of Array.from(element.attributes)) {
        if (attribute.name.toLowerCase().startsWith('on') || attribute.name.toLowerCase() === 'srcdoc') {
          element.removeAttribute(attribute.name);
        }
      }
    });
  }

  private normalizeMarkdownHeadings(fragment: DocumentFragment): void {
    fragment.querySelectorAll('h1').forEach(heading => {
      const replacement = heading.ownerDocument.createElement('h2');

      while (heading.firstChild) {
        replacement.append(heading.firstChild);
      }

      for (const attribute of Array.from(heading.attributes)) {
        replacement.setAttribute(attribute.name, attribute.value);
      }

      heading.replaceWith(replacement);
    });
  }

  private enhanceImages(fragment: DocumentFragment): void {
    fragment.querySelectorAll('img').forEach(image => {
      const src = image.getAttribute('src')?.trim().toLowerCase() ?? '';

      if (
        src.startsWith('unsafe:') ||
        src.startsWith('javascript:') ||
        src.startsWith('data:') ||
        src.startsWith('vbscript:')
      ) {
        image.removeAttribute('src');
      }

      image.setAttribute('loading', image.getAttribute('loading') ?? 'lazy');
      image.setAttribute('decoding', image.getAttribute('decoding') ?? 'async');
      image.classList.add('blog-image-reveal');
    });
  }

  private enhanceAnchors(fragment: DocumentFragment): void {
    fragment.querySelectorAll('a[href]').forEach(anchor => {
      const href = anchor.getAttribute('href')?.trim() ?? '';
      const normalizedHref = href.toLowerCase();

      anchor.classList.add('blog-inline-link');

      if (
        !href ||
        normalizedHref.startsWith('unsafe:') ||
        normalizedHref.startsWith('javascript:') ||
        normalizedHref.startsWith('data:') ||
        normalizedHref.startsWith('vbscript:')
      ) {
        anchor.removeAttribute('href');
        anchor.removeAttribute('target');
        anchor.removeAttribute('rel');
        return;
      }

      if (href.startsWith('#')) {
        anchor.removeAttribute('target');
        anchor.removeAttribute('rel');
        return;
      }

      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    });
  }
}
