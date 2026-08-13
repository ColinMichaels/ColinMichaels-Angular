import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
  inject,
} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

const SEARCH_HIGHLIGHT_NAME = 'site-search-match';
const ACTIVE_SEARCH_HIGHLIGHT_NAME = 'site-search-active-match';
const SEARCH_HIGHLIGHT_DELAY_MS = 140;
const MAX_SEARCH_QUERY_LENGTH = 160;
const EXCLUDED_SEARCH_CONTENT = [
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'canvas',
  'iframe',
  'input',
  'textarea',
  'select',
  'option',
  '[contenteditable="true"]',
  '[hidden]',
  '[inert]',
  '[aria-hidden="true"]',
  '[data-search-highlight-ignore]',
  '.sr-only',
].join(',');

interface SearchHighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): boolean;
}

interface SearchHighlightWindow extends Window {
  Highlight?: new (...ranges: Range[]) => unknown;
  CSS: typeof CSS & {highlights?: SearchHighlightRegistry};
}

export interface SearchTextMatch {
  start: number;
  end: number;
}

interface SearchHighlightApi {
  createHighlight: new (...ranges: Range[]) => unknown;
  registry: SearchHighlightRegistry;
}

/**
 * Paints search matches with the browser Highlight API so Angular and Editor.js
 * content stays structurally untouched while the shared query changes.
 */
@Directive({
  selector: '[appSearchHighlight]',
  standalone: true,
})
export class SiteSearchHighlightDirective implements AfterViewInit, OnChanges, OnDestroy {
  @Input() appSearchHighlight = '';
  @Input() searchHighlightScrollToFirst = false;
  @Input() searchHighlightScrollSelector = '';
  @Input() searchHighlightContext = '';

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private observer?: MutationObserver;
  private updateTimer?: ReturnType<typeof setTimeout>;
  private initialized = false;
  private lastScrollKey = '';

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initialized = true;
    this.observer = new MutationObserver(() => this.scheduleHighlightUpdate());
    this.observer.observe(this.host.nativeElement, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    this.scheduleHighlightUpdate(0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appSearchHighlight'] || changes['searchHighlightContext']) {
      this.lastScrollKey = '';
    }

    if (this.initialized) {
      this.scheduleHighlightUpdate();
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();

    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.clearHighlights();
  }

  private scheduleHighlightUpdate(delay = SEARCH_HIGHLIGHT_DELAY_MS): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      this.updateTimer = undefined;
      this.applyHighlights();
    }, delay);
  }

  private applyHighlights(): void {
    const api = this.getHighlightApi();

    if (!api) {
      this.host.nativeElement.removeAttribute('data-search-highlight-count');
      return;
    }

    const terms = createSearchHighlightTerms(this.appSearchHighlight);

    if (terms.length === 0) {
      this.clearHighlights(api);
      return;
    }

    const ranges = this.collectMatchingRanges(terms);

    if (ranges.length === 0) {
      this.clearHighlights(api);
      return;
    }

    api.registry.set(SEARCH_HIGHLIGHT_NAME, new api.createHighlight(...ranges));
    this.host.nativeElement.setAttribute('data-search-highlight-count', `${ranges.length}`);

    const activeRange = this.searchHighlightScrollToFirst
      ? this.findFirstScrollableRange(ranges)
      : null;

    if (activeRange) {
      api.registry.set(ACTIVE_SEARCH_HIGHLIGHT_NAME, new api.createHighlight(activeRange));
      this.scrollToRange(activeRange);
    } else {
      api.registry.delete(ACTIVE_SEARCH_HIGHLIGHT_NAME);
    }
  }

  private collectMatchingRanges(terms: readonly string[]): Range[] {
    const document = this.host.nativeElement.ownerDocument;
    const walker = document.createTreeWalker(
      this.host.nativeElement,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: node => this.isSearchableTextNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
      }
    );
    const ranges: Range[] = [];
    let node = walker.nextNode();

    while (node) {
      const text = node.textContent ?? '';

      for (const match of findSearchTextMatches(text, terms)) {
        const range = document.createRange();
        range.setStart(node, match.start);
        range.setEnd(node, match.end);
        ranges.push(range);
      }

      node = walker.nextNode();
    }

    return ranges;
  }

  private isSearchableTextNode(node: Node): boolean {
    const text = node.textContent ?? '';
    const parent = node.parentElement;

    return Boolean(text.trim())
      && Boolean(parent)
      && !parent?.closest(EXCLUDED_SEARCH_CONTENT);
  }

  private findFirstScrollableRange(ranges: readonly Range[]): Range | null {
    const selector = this.searchHighlightScrollSelector.trim();
    const scrollContainer = selector
      ? this.host.nativeElement.querySelector<HTMLElement>(selector)
      : this.host.nativeElement;

    if (!scrollContainer) {
      return null;
    }

    return ranges.find(range => (
      scrollContainer.contains(range.commonAncestorContainer)
      && range.getClientRects().length > 0
    )) ?? null;
  }

  private scrollToRange(range: Range): void {
    const view = this.host.nativeElement.ownerDocument.defaultView;
    const queryKey = createSearchHighlightTerms(this.appSearchHighlight).join('|');
    const scrollKey = `${this.searchHighlightContext}:${queryKey}`;

    if (!view || this.lastScrollKey === scrollKey) {
      return;
    }

    const rect = range.getBoundingClientRect();
    const visibleTop = Math.max(0, view.innerHeight * 0.18);
    const visibleBottom = view.innerHeight * 0.82;

    this.lastScrollKey = scrollKey;

    if (rect.top >= visibleTop && rect.bottom <= visibleBottom) {
      return;
    }

    const prefersReducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targetTop = Math.max(0, view.scrollY + rect.top - view.innerHeight * 0.28);
    view.scrollTo({
      top: targetTop,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }

  private clearHighlights(api = this.getHighlightApi()): void {
    api?.registry.delete(SEARCH_HIGHLIGHT_NAME);
    api?.registry.delete(ACTIVE_SEARCH_HIGHLIGHT_NAME);
    this.host.nativeElement.removeAttribute('data-search-highlight-count');
  }

  private getHighlightApi(): SearchHighlightApi | null {
    const view = this.host.nativeElement.ownerDocument.defaultView as SearchHighlightWindow | null;
    const registry = view?.CSS?.highlights;
    const createHighlight = view?.Highlight;

    return registry && createHighlight
      ? {registry, createHighlight}
      : null;
  }
}

export function createSearchHighlightTerms(query: string): readonly string[] {
  const normalizedQuery = query
    .slice(0, MAX_SEARCH_QUERY_LENGTH)
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return [...new Set([
    normalizedQuery,
    ...normalizedQuery.split(' '),
  ])].sort((left, right) => right.length - left.length);
}

export function findSearchTextMatches(text: string, terms: readonly string[]): readonly SearchTextMatch[] {
  const normalizedText = text.toLocaleLowerCase();
  const normalizedTerms = terms.filter(term => term.length > 0);
  const matches: SearchTextMatch[] = [];
  let cursor = 0;

  while (cursor < normalizedText.length) {
    let nextStart = -1;
    let nextTerm = '';

    for (const term of normalizedTerms) {
      const start = normalizedText.indexOf(term, cursor);

      if (start >= 0 && (nextStart < 0 || start < nextStart || (start === nextStart && term.length > nextTerm.length))) {
        nextStart = start;
        nextTerm = term;
      }
    }

    if (nextStart < 0 || !nextTerm) {
      break;
    }

    matches.push({start: nextStart, end: nextStart + nextTerm.length});
    cursor = nextStart + nextTerm.length;
  }

  return matches;
}
