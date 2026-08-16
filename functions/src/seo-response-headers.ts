export const SEO_RESPONSE_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy-Report-Only': "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://firebasestorage.googleapis.com https://storage.googleapis.com; font-src 'self' data:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://firebasestorage.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com; frame-src 'self' https://colinmichaels.firebaseapp.com https://www.googletagmanager.com https://www.youtube.com https://suno.com https://hear-the-hook.captaincolin.chatgpt.site; media-src 'self' https://firebasestorage.googleapis.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self' https://forms.gle https://docs.google.com",
} as const;

interface SeoResponseHeaderTarget {
  setHeader(name: string, value: string): unknown;
}

export function applySeoResponseSecurityHeaders(response: SeoResponseHeaderTarget): void {
  for (const [name, value] of Object.entries(SEO_RESPONSE_SECURITY_HEADERS)) {
    response.setHeader(name, value);
  }
}
