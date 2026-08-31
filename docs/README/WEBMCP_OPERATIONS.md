# Public WebMCP Operations Runbook

This runbook owns the production checks for the experimental, read-only WebMCP public-content pilot. The tools remain a progressive browser enhancement and are not a paid API, scraping entitlement, content license, or CMS access path.

## Production contract

- Tools: `search_public_content`, `get_public_article`, and `get_public_topic_guide`.
- Content: published citation metadata and code-defined public topic guides only.
- Limit: 20 requests per UTC minute for one opaque actor/IP-derived identity.
- Privacy: raw IP addresses, user IDs, queries, canonical URLs, topic selections, post bodies, and returned content are not logged by application telemetry.
- Writes: the only write is the server-owned opaque rate-limit record in `publicAgentContentRateLimits`.
- Function App Check: do not enable enforcement for `getPublicAgentContent` until its direct browser transport attaches and verifies an App Check token. Firestore and Storage App Check enforcement do not authorize Function enforcement.

## Release order

1. Run the focused Functions and Angular tests, repository lint, build, and documentation validation under a supported Node runtime.
2. Deploy Functions so the callable behavior and structured telemetry are available.
3. Deploy Hosting so the browser tool descriptors and transport match the Function.
4. Run `npm run verify:webmcp-production` against the exact deployed release.
5. Inspect the structured events and platform request logs before treating the release as operationally verified.
6. Run the production rate-limit verifier only when a temporary 20-request window from the operator's public IP is acceptable.

Rollback removes the Hosting provider/tool declarations and the callable together. The additive TTL policy and opaque rate-limit documents can remain; they contain no content or raw identity values.

## Firestore TTL policy

TTL is operational cleanup rather than part of the rate-limit decision. The same opaque document is reused across minute windows, so delayed deletion does not weaken enforcement.

Verify the current policy:

```sh
gcloud firestore fields ttls list \
  --project=colinmichaels \
  --database='(default)' \
  --collection-group=publicAgentContentRateLimits
```

Enable the policy when it is absent:

```sh
gcloud firestore fields ttls update expiresAtTimestamp \
  --project=colinmichaels \
  --database='(default)' \
  --collection-group=publicAgentContentRateLimits \
  --enable-ttl
```

Google documents that TTL enablement can take ten minutes or more. Re-run the list command until `expiresAtTimestamp` reports an active TTL configuration. Do not substitute another collection or field. See [Manage data retention with TTL policies](https://cloud.google.com/firestore/docs/ttl).

## Structured Function events

Successful, rejected, and unexpected failed handler executions use the `public_agent_content_request` event with only:

- `operation`: `search`, `getArticle`, `getTopic`, or `unknown`;
- `outcome`: `success`, `rejected`, or `failed`;
- `authenticated`: a Boolean, never a UID;
- `durationMs` and successful `itemCount`;
- a bounded callable `errorCode` for rejected or failed executions.

Intentional rate-limit retries do not add application logs because an abusive client could otherwise create unbounded log volume. Cloud Run request logs remain authoritative for HTTP `429` counts.

Use this Cloud Logging query for application events:

```text
resource.type="cloud_run_revision"
resource.labels.service_name="getpublicagentcontent"
jsonPayload.event="public_agent_content_request"
```

Use this query for rate-limit responses:

```text
resource.type="cloud_run_revision"
resource.labels.service_name="getpublicagentcontent"
httpRequest.status=429
```

Use this query for unexpected origin or other forbidden requests:

```text
resource.type="cloud_run_revision"
resource.labels.service_name="getpublicagentcontent"
httpRequest.status=403
```

## Initial alert policy

Start with count-based alerts, review them after seven days of real traffic, and change thresholds from evidence rather than guesses:

| Signal                      | Initial condition                                                           | Response                                                                                                                |
|-----------------------------|-----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| Unexpected handler failures | Any `outcome="failed"` in 5 minutes                                         | Inspect the Function revision, error code, and surrounding platform logs. Roll back if failures began with the release. |
| Rate-limit pressure         | 25 or more HTTP `429` responses in 5 minutes                                | Confirm whether one agent is retrying without backoff; do not raise the public limit automatically.                     |
| Origin rejection            | 5 or more HTTP `403` responses in 5 minutes                                 | Check the request origin and preview-host contract before changing the allowlist.                                       |
| Latency                     | p95 handler `durationMs` above 2,000 ms for 15 minutes                      | Check Firestore latency, cold starts, and summary-query volume. Keep the five-result and 250-summary caps.              |
| Rate-limit document growth  | More than three times the first complete seven-day unique-document baseline | Verify TTL state and traffic sources. Never log or export document IDs as visitor identities.                           |

Every alert needs an owner and notification channel in Google Cloud Monitoring before it is considered active. Saving a Logs Explorer query alone is not an alert.

## Repeatable verification

Run the browser smoke test after Functions and Hosting are both deployed:

```sh
npm run verify:webmcp-production
```

The test injects a standards-shaped `modelContext` capture before Angular starts, verifies exactly three read-only descriptors, executes all three registered callbacks through the deployed browser code, checks the compact response policy, rejects private/body fields, and fails on page console errors. It sends three bounded public requests.

Run the destructive-to-one-minute-window rate-limit check only with explicit production confirmation:

```sh
npm run verify:webmcp-rate-limit -- --confirm-production
```

It waits for a clean UTC minute, verifies requests 1-20, requires request 21 to return HTTP `429 RESOURCE_EXHAUSTED`, waits for the next minute, and verifies access resets. It performs exactly 22 public calls and changes no content; it does update the caller's opaque rate-limit record.

## Release evidence record

For each WebMCP release, record:

- exact deployed commit;
- Functions and Hosting deployment identifiers;
- production smoke-test timestamp and result;
- controlled rate-limit-test timestamp when run;
- TTL policy state;
- alert owner and notification channel;
- relevant five-minute error/rate-limit/origin counts;
- rollback decision and any deliberately deferred follow-up.

Do not describe the pilot as paid-agent ready. A commercial service remains a separate authenticated boundary with API keys, durable plan metering, licensing terms, audit records, and explicit paid-data definitions.
