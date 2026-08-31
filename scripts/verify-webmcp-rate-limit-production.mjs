const SITE_URL = 'https://colinmichaels.com';
const CALLABLE_URL = 'https://us-east1-colinmichaels.cloudfunctions.net/getPublicAgentContent';
const REQUEST_LIMIT = 20;
const FRESH_WINDOW_SECOND = 5;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function millisecondsUntilFreshWindow(now = new Date()) {
  const currentOffset = (now.getUTCSeconds() * 1000) + now.getUTCMilliseconds();
  const targetOffset = FRESH_WINDOW_SECOND * 1000;
  return currentOffset < targetOffset
    ? targetOffset - currentOffset
    : 60_000 - currentOffset + targetOffset;
}

async function waitForFreshMinute(label) {
  const waitMs = millisecondsUntilFreshWindow();
  console.log(`${label}: waiting ${(waitMs / 1000).toFixed(1)}s for a clean UTC minute window.`);
  await delay(waitMs);
}

async function requestTopic() {
  const response = await fetch(CALLABLE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': SITE_URL,
    },
    body: JSON.stringify({data: {operation: 'getTopic', topicSlug: 'drones-fpv'}}),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  return {status: response.status, body};
}

function isValidSuccess(result) {
  const response = result.body?.result ?? result.body?.data;
  return result.status === 200
    && response?.operation === 'getTopic'
    && response?.items?.length === 1
    && response?.items?.[0]?.canonicalUrl === `${SITE_URL}/topics/drones-fpv`
    && response?.policy?.rateLimit === '20 requests per minute';
}

function isExpectedLimit(result) {
  return result.status === 429
    && result.body?.error?.status === 'RESOURCE_EXHAUSTED'
    && typeof result.body?.error?.message === 'string';
}

if (!process.argv.includes('--confirm-production')) {
  console.error(
    'Production verification is opt-in. Re-run with --confirm-production; it performs exactly 22 public calls over two minute windows.',
  );
  process.exit(2);
}

console.log('Verifying the production WebMCP public-content limit without authentication or private data.');
await waitForFreshMinute('Limit test');

for (let requestNumber = 1; requestNumber <= REQUEST_LIMIT; requestNumber += 1) {
  const result = await requestTopic();
  assert(
    isValidSuccess(result),
    `Expected request ${requestNumber} of ${REQUEST_LIMIT} to succeed; received HTTP ${result.status}.`,
  );
}

const limitedResult = await requestTopic();
assert(
  isExpectedLimit(limitedResult),
  `Expected request ${REQUEST_LIMIT + 1} to receive HTTP 429 RESOURCE_EXHAUSTED; received HTTP ${limitedResult.status}.`,
);
console.log(`Pass: requests 1-${REQUEST_LIMIT} succeeded and request ${REQUEST_LIMIT + 1} was rate-limited.`);

await waitForFreshMinute('Reset test');
const resetResult = await requestTopic();
assert(isValidSuccess(resetResult), `Expected the next minute window to reset; received HTTP ${resetResult.status}.`);
console.log('Pass: the next UTC minute window accepted a new request.');
console.log('Production WebMCP rate-limit verification passed (22 total calls, no writes beyond the opaque rate-limit record).');
