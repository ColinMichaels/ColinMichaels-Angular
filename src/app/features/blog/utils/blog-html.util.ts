export function parseInertHtmlFragment(documentRef: Document, value: string): DocumentFragment {
  try {
    return documentRef.createRange().createContextualFragment(value);
  } catch {
    const Parser = documentRef.defaultView?.DOMParser;
    const fragment = documentRef.createDocumentFragment();

    if (!Parser) {
      fragment.append(documentRef.createTextNode(value));
      return fragment;
    }

    const parsedDocument = new Parser().parseFromString(value, 'text/html');
    for (const child of Array.from(parsedDocument.body.childNodes)) {
      fragment.append(documentRef.importNode(child, true));
    }

    return fragment;
  }
}

export function htmlToPlainText(documentRef: Document, value: string | undefined): string {
  const fragment = parseInertHtmlFragment(documentRef, value ?? '');
  fragment.querySelectorAll('script, style, template, noscript').forEach(element => element.remove());

  return fragment.textContent?.trim() ?? '';
}
