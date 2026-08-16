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

const PLAIN_HTTP_URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;
const TRAILING_URL_PUNCTUATION = new Set(['.', ',', ';', ':', '!', '?']);
const URL_BRACKET_PAIRS: Readonly<Record<string, string>> = {
  ')': '(',
  ']': '[',
  '}': '{',
};

function splitPlainHttpUrl(value: string): { url: string; trailingText: string } {
  let urlEnd = value.length;

  while (urlEnd > 0) {
    const finalCharacter = value[urlEnd - 1];

    if (TRAILING_URL_PUNCTUATION.has(finalCharacter)) {
      urlEnd -= 1;
      continue;
    }

    const openingBracket = URL_BRACKET_PAIRS[finalCharacter];

    if (openingBracket) {
      const candidate = value.slice(0, urlEnd);
      const openingCount = candidate.split(openingBracket).length - 1;
      const closingCount = candidate.split(finalCharacter).length - 1;

      if (closingCount > openingCount) {
        urlEnd -= 1;
        continue;
      }
    }

    break;
  }

  return {
    url: value.slice(0, urlEnd),
    trailingText: value.slice(urlEnd),
  };
}

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

    this.linkifyPlainHttpUrls(fragment);
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

  private linkifyPlainHttpUrls(fragment: DocumentFragment): void {
    const hostElement = this.host.nativeElement;

    // Heading links render rich text inside an existing anchor. Avoid creating
    // invalid nested anchors in that context.
    if (hostElement.closest('a')) {
      return;
    }

    const ownerDocument = hostElement.ownerDocument;
    const showText = ownerDocument.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
    const walker = ownerDocument.createTreeWalker(fragment, showText);
    const textNodes: Text[] = [];
    let currentNode = walker.nextNode();

    while (currentNode) {
      textNodes.push(currentNode as Text);
      currentNode = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const parentElement = textNode.parentElement;

      if (!parentElement || parentElement.closest('a, code, pre, kbd, samp')) {
        continue;
      }

      PLAIN_HTTP_URL_PATTERN.lastIndex = 0;
      const matches = Array.from(textNode.data.matchAll(PLAIN_HTTP_URL_PATTERN));

      if (matches.length === 0) {
        continue;
      }

      const replacement = ownerDocument.createDocumentFragment();
      let cursor = 0;

      for (const match of matches) {
        const matchIndex = match.index ?? 0;
        const matchedText = match[0];
        const {url, trailingText} = splitPlainHttpUrl(matchedText);

        replacement.append(textNode.data.slice(cursor, matchIndex));

        if (url) {
          const anchor = ownerDocument.createElement('a');
          anchor.href = url;
          anchor.textContent = url;
          replacement.append(anchor);
        } else {
          replacement.append(matchedText);
        }

        replacement.append(trailingText);
        cursor = matchIndex + matchedText.length;
      }

      replacement.append(textNode.data.slice(cursor));
      textNode.replaceWith(replacement);
    }
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
