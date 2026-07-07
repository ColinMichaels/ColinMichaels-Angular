const assert = require('node:assert/strict');
const test = require('node:test');

const {
  COMMENT_BODY_UNSAFE_CONTENT_MESSAGE,
  normalizePlainTextCommentBody,
  validatePlainTextCommentBody,
} = require('../lib/comment-safety.js');

test('normalizes plain text comments while preserving safe punctuation', () => {
  const result = validatePlainTextCommentBody("  I can't believe this worked;\n\n\nthanks for sharing.  ");

  assert.equal(result.valid, true);
  assert.equal(result.reason, null);
  assert.equal(result.body, "I can't believe this worked;\n\nthanks for sharing.");
});

test('rejects direct URLs, bare domains, and email addresses', () => {
  for (const body of [
    'Read more at https://evil.example/path',
    'Visit www.evil.example now',
    'This is on evil.com',
    'This is on evil.solar',
    'This is on evil dot com',
    'This is on evil[dot]com',
    'This is on xn--e1awd7f.com',
    'Email me at attacker@example.com',
  ]) {
    const result = validatePlainTextCommentBody(body);

    assert.equal(result.valid, false, body);
    assert.equal(result.reason, 'unsafe_content', body);
  }
});

test('rejects HTML, encoded tags, scripts, and markdown links', () => {
  for (const body of [
    '<img src=x onerror=alert(1)>',
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    '&#60script&#62alert(1)&#60/script&#62',
    '[friendly link](javascript:alert(1))',
    'localhost:8080/test',
    '127.0.0.1:5001/path',
  ]) {
    const result = validatePlainTextCommentBody(body);

    assert.equal(result.valid, false, body);
    assert.equal(result.reason, 'unsafe_content', body);
  }
});

test('strips unsafe control characters before validation', () => {
  assert.equal(normalizePlainTextCommentBody('hello\u0000 world'), 'hello world');
  assert.equal(normalizePlainTextCommentBody('abc\u202etxt.exe'), 'abctxt.exe');
});

test('exposes a reader-facing unsafe content message', () => {
  assert.match(COMMENT_BODY_UNSAFE_CONTENT_MESSAGE, /plain text/i);
});
