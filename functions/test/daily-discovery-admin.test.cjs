const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DAILY_DISCOVERY_ADMIN_MAX_PAYLOAD_BYTES,
  createDailyDiscoveryAdminReceiptId,
  getStoredDailyDiscoveryRevision,
  parseAdminDailyDiscoveryDateRequest,
  parseAdminDailyDiscoverySaveRequest,
  planDailyDiscoveryAdminMutation,
  requiresDailyDiscoveryDraftApproval,
} = require('../lib/daily-discovery-admin.js');

function createSaveRequest(overrides = {}) {
  return {
    operation: 'create',
    requestId: 'daily-discovery-request-001',
    approveDraft: true,
    confirmLiveReplacement: false,
    dryRun: false,
    quiz: {schema: 'colinmichaels.daily-discovery-quiz', questions: []},
    ...overrides,
  };
}

test('parses bounded admin date and save requests', () => {
  assert.deepEqual(parseAdminDailyDiscoveryDateRequest({dateKey: '2026-08-10'}), {
    dateKey: '2026-08-10',
  });

  const parsedCreate = parseAdminDailyDiscoverySaveRequest(createSaveRequest());
  const parsedReplace = parseAdminDailyDiscoverySaveRequest(createSaveRequest({
    operation: 'replace',
    expectedRevision: 4,
  }));

  assert.equal(parsedCreate.expectedRevision, null);
  assert.equal(parsedCreate.approveDraft, true);
  assert.equal(parsedCreate.requestFingerprint.length, 64);
  assert.equal(parsedReplace.expectedRevision, 4);
  assert.notEqual(parsedReplace.requestFingerprint, parsedCreate.requestFingerprint);
});

test('rejects malformed requests and oversized quiz payloads', () => {
  assert.throws(
    () => parseAdminDailyDiscoveryDateRequest({dateKey: '2026-02-30'}),
    /valid calendar date/
  );
  assert.throws(
    () => parseAdminDailyDiscoverySaveRequest(createSaveRequest({requestId: 'short'})),
    /requestId/
  );
  assert.throws(
    () => parseAdminDailyDiscoverySaveRequest(createSaveRequest({operation: 'replace'})),
    /expectedRevision/
  );
  assert.throws(
    () => parseAdminDailyDiscoverySaveRequest(createSaveRequest({expectedRevision: 0})),
    /must not include expectedRevision/
  );
  assert.throws(
    () => parseAdminDailyDiscoverySaveRequest(createSaveRequest({dryRun: 'true'})),
    /dryRun must be a boolean/
  );
  assert.throws(
    () => parseAdminDailyDiscoverySaveRequest(createSaveRequest({
      quiz: {content: 'x'.repeat(DAILY_DISCOVERY_ADMIN_MAX_PAYLOAD_BYTES)},
    })),
    /no larger than/
  );
});

test('plans create and future replacement revisions without overwriting accidentally', () => {
  assert.deepEqual(planDailyDiscoveryAdminMutation({
    operation: 'create',
    dateKey: '2026-08-10',
    currentDateKey: '2026-08-09',
    expectedRevision: null,
    existingRevision: null,
    existingQuestionIds: null,
    nextQuestionIds: ['2026-08-10-q1'],
    confirmLiveReplacement: false,
  }), {
    nextRevision: 1,
    liveReplacement: false,
  });

  assert.deepEqual(planDailyDiscoveryAdminMutation({
    operation: 'replace',
    dateKey: '2026-08-11',
    currentDateKey: '2026-08-09',
    expectedRevision: 3,
    existingRevision: 3,
    existingQuestionIds: ['old-q1'],
    nextQuestionIds: ['new-q1', 'new-q2'],
    confirmLiveReplacement: false,
  }), {
    nextRevision: 4,
    liveReplacement: false,
  });
});

test('protects past, existing, missing, stale, and live question sets', () => {
  const base = {
    operation: 'replace',
    dateKey: '2026-08-10',
    currentDateKey: '2026-08-10',
    expectedRevision: 2,
    existingRevision: 2,
    existingQuestionIds: ['2026-08-10-q1', '2026-08-10-q2'],
    nextQuestionIds: ['2026-08-10-q1', '2026-08-10-q2'],
    confirmLiveReplacement: true,
  };

  assert.deepEqual(planDailyDiscoveryAdminMutation(base), {
    nextRevision: 3,
    liveReplacement: true,
  });
  assert.throws(
    () => planDailyDiscoveryAdminMutation({...base, dateKey: '2026-08-09'}),
    /past Eastern date/
  );
  assert.throws(
    () => planDailyDiscoveryAdminMutation({
      ...base,
      operation: 'create',
      expectedRevision: null,
    }),
    /already exists/
  );
  assert.throws(
    () => planDailyDiscoveryAdminMutation({
      ...base,
      existingRevision: null,
      existingQuestionIds: null,
    }),
    /does not exist/
  );
  assert.throws(
    () => planDailyDiscoveryAdminMutation({...base, expectedRevision: 1}),
    /changed after it was loaded/
  );
  assert.throws(
    () => planDailyDiscoveryAdminMutation({...base, confirmLiveReplacement: false}),
    /explicit confirmation/
  );
  assert.throws(
    () => planDailyDiscoveryAdminMutation({...base, nextQuestionIds: ['2026-08-10-new']}),
    /preserve the existing question count and ordered question IDs/
  );
});

test('supports legacy revision zero, draft approval checks, and stable private receipt ids', () => {
  assert.equal(getStoredDailyDiscoveryRevision({status: 'ready'}), 0);
  assert.equal(getStoredDailyDiscoveryRevision({revision: 7}), 7);
  assert.throws(() => getStoredDailyDiscoveryRevision({revision: -1}), /revision is invalid/);

  assert.equal(requiresDailyDiscoveryDraftApproval('ready', 'approved'), false);
  assert.equal(requiresDailyDiscoveryDraftApproval('draft', 'approved'), true);
  assert.equal(requiresDailyDiscoveryDraftApproval('ready', 'manual_review'), true);

  const first = createDailyDiscoveryAdminReceiptId('editor-1', 'daily-discovery-request-001');
  const repeat = createDailyDiscoveryAdminReceiptId('editor-1', 'daily-discovery-request-001');
  const otherActor = createDailyDiscoveryAdminReceiptId('editor-2', 'daily-discovery-request-001');

  assert.equal(first, repeat);
  assert.equal(first.length, 64);
  assert.notEqual(otherActor, first);
});
