import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const cohortConfigs = [
  {
    url: new URL(
      '../docs/SEO/AUDITS/2026-08-15/DRONE-FPV-PROSPECTS.json',
      import.meta.url,
    ),
    idPattern: /^fpv-\d{3}$/u,
    label: 'Drone and FPV',
    expected: {
      total: 25,
      ready_after_live_verification: 10,
      relationship_decision_required: 5,
      hold_recheck: 10,
    },
  },
  {
    url: new URL(
      '../docs/SEO/AUDITS/2026-08-15/GADGET-CREATOR-PROSPECTS.json',
      import.meta.url,
    ),
    idPattern: /^gadget-\d{3}$/u,
    label: 'Gadget and creator-tech',
    expected: {
      total: 25,
      ready_after_live_verification: 8,
      relationship_decision_required: 7,
      hold_recheck: 10,
    },
  },
];

const allowedStatuses = new Set([
  'ready_after_live_verification',
  'relationship_decision_required',
  'hold_recheck',
]);
const forbiddenReadyContactTypes = new Set([
  'commercial_product_listing',
  'commercial_support',
  'customer_support',
  'general_support',
  'paid_dofollow_placement',
  'self_publication',
]);
const forcedHoldContactTypes = new Set([
  'commercial_product_listing',
  'paid_dofollow_placement',
  'self_publication',
]);
const forbiddenPitchPatterns = [
  /link exchange/iu,
  /paid link/iu,
  /guaranteed (?:back)?link/iu,
  /exact[- ]match anchor/iu,
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertHttpsUrl(value, label) {
  assert(typeof value === 'string' && value.length > 0, `${label} is required.`);
  const url = new URL(value);
  assert(url.protocol === 'https:', `${label} must use HTTPS: ${value}`);
  assert(url.username === '' && url.password === '', `${label} must not contain credentials.`);
}

async function validateCohort(config) {
  const cohortPath = fileURLToPath(config.url);
  const cohort = JSON.parse(await readFile(config.url, 'utf8'));

  assert(Array.isArray(cohort.prospects), `${config.label}: prospects must be an array.`);
  assert(
    cohort.prospects.length === config.expected.total,
    `${config.label}: expected exactly ${config.expected.total} prospects; found ${cohort.prospects.length}.`,
  );
  assert(
    cohort.outreachState === 'not_started',
    `${config.label}: the cohort must remain not_started until outreach is explicitly authorized.`,
  );

  const ids = new Set();
  const targetUrls = new Set();
  const counts = {
    ready_after_live_verification: 0,
    relationship_decision_required: 0,
    hold_recheck: 0,
  };

  for (const [index, prospect] of cohort.prospects.entries()) {
    const itemLabel = `${config.label} prospects[${index}]`;
    assert(
      typeof prospect.id === 'string' && config.idPattern.test(prospect.id),
      `${itemLabel}.id is invalid.`,
    );
    assert(!ids.has(prospect.id), `${config.label}: duplicate prospect id: ${prospect.id}`);
    ids.add(prospect.id);

    assert(prospect.priority === index + 1, `${prospect.id} priority must match its one-based position.`);
    assert(typeof prospect.name === 'string' && prospect.name.trim().length >= 3, `${prospect.id} needs a name.`);
    assertHttpsUrl(prospect.targetUrl, `${prospect.id}.targetUrl`);
    assertHttpsUrl(prospect.contactUrl, `${prospect.id}.contactUrl`);
    assert(!targetUrls.has(prospect.targetUrl), `${config.label}: duplicate exact target URL: ${prospect.targetUrl}`);
    targetUrls.add(prospect.targetUrl);

    assert(allowedStatuses.has(prospect.status), `${prospect.id} has an unsupported status.`);
    counts[prospect.status] += 1;
    assert(prospect.contactState === 'not_contacted', `${prospect.id} must remain not_contacted.`);
    assert(typeof prospect.fit === 'string' && prospect.fit.trim().length >= 40, `${prospect.id} needs a substantive audience-fit reason.`);
    assert(typeof prospect.firstAsk === 'string' && prospect.firstAsk.trim().length >= 40, `${prospect.id} needs a specific first ask.`);
    assert(typeof prospect.blocker === 'string' && prospect.blocker.trim().length >= 20, `${prospect.id} needs an explicit release gate or blocker.`);
    assert(/^\d{4}-\d{2}-\d{2}$/u.test(prospect.verifiedAt), `${prospect.id}.verifiedAt must be a date.`);

    const pitchText = `${prospect.fit} ${prospect.firstAsk}`;
    for (const pattern of forbiddenPitchPatterns) {
      assert(!pattern.test(pitchText), `${prospect.id} contains prohibited outreach language: ${pattern}`);
    }

    if (prospect.status === 'ready_after_live_verification') {
      assert(
        !forbiddenReadyContactTypes.has(prospect.contactType),
        `${prospect.id} cannot be ready through a support, commercial, paid, or self-publication route.`,
      );
    }

    if (forcedHoldContactTypes.has(prospect.contactType)) {
      assert(
        prospect.status === 'hold_recheck',
        `${prospect.id} must remain on hold because ${prospect.contactType} is not earned authority.`,
      );
    }
  }

  assert(
    counts.ready_after_live_verification === config.expected.ready_after_live_verification,
    `${config.label}: expected ${config.expected.ready_after_live_verification} ready-after-verification prospects.`,
  );
  assert(
    counts.relationship_decision_required === config.expected.relationship_decision_required,
    `${config.label}: expected ${config.expected.relationship_decision_required} relationship or rights decisions.`,
  );
  assert(
    counts.hold_recheck === config.expected.hold_recheck,
    `${config.label}: expected ${config.expected.hold_recheck} hold or recheck prospects.`,
  );
  assert(cohort.summary.total === cohort.prospects.length, `${config.label}: summary.total does not match the cohort.`);
  assert(cohort.summary.readyAfterLiveVerification === counts.ready_after_live_verification, `${config.label}: ready summary count is stale.`);
  assert(cohort.summary.relationshipOrRightsDecisionRequired === counts.relationship_decision_required, `${config.label}: decision summary count is stale.`);
  assert(cohort.summary.holdOrRecheck === counts.hold_recheck, `${config.label}: hold summary count is stale.`);
  assert(cohort.summary.contacted === 0, `${config.label}: no prospect may be recorded as contacted without an authorized external action.`);

  console.log(`Validated ${cohort.prospects.length} exact-page ${config.label} prospects from ${cohortPath}.`);
  console.log(
    `${counts.ready_after_live_verification} ready after live verification; ` +
      `${counts.relationship_decision_required} require a relationship or rights decision; ` +
      `${counts.hold_recheck} remain on hold; 0 contacted.`,
  );

  return {
    total: cohort.prospects.length,
    ready: counts.ready_after_live_verification,
    decision: counts.relationship_decision_required,
    hold: counts.hold_recheck,
  };
}

const results = await Promise.all(cohortConfigs.map(validateCohort));
const totals = results.reduce(
  (sum, result) => ({
    total: sum.total + result.total,
    ready: sum.ready + result.ready,
    decision: sum.decision + result.decision,
    hold: sum.hold + result.hold,
  }),
  {total: 0, ready: 0, decision: 0, hold: 0},
);

console.log(
  `Validated ${totals.total} prospects across ${results.length} cohorts: ` +
    `${totals.ready} ready, ${totals.decision} decision-gated, ${totals.hold} on hold, 0 contacted.`,
);
