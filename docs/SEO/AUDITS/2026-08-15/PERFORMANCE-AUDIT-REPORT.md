# Homepage Performance Audit

Audit date: August 15, 2026  
Page: `https://colinmichaels.com/`  
Change under test: stable homepage identity and asynchronous hero geometry

## Result

The audited mobile layout-shift regression is resolved in the local release candidate.

| Check | Audited live baseline | Local release candidate | CWV threshold |
| --- | ---: | ---: | ---: |
| Mobile CLS, 390×844 | `0.189` | `0.0031` | good: `≤0.10` |
| Desktop CLS, 1440×1000 | not captured in the baseline | `0.0097` | good: `≤0.10` |

The mobile result is approximately 98% lower than the repeated live baseline. That comparison identifies a strong regression fix, not a promise that field CLS will match the local number.

## Cause and Remediation

The live homepage initially rendered a short loading state. When the asynchronous featured article resolved, the hero gained a much taller image, copy region, and Daily Discovery rail. The latest-writing section moved from roughly `y=584` to `y=1102`, producing CLS `0.189`.

The local release candidate now:

- renders the evergreen creator promise before asynchronous post data;
- preserves one stable H1 and uses an H2 for the rotating featured article;
- gives the loading story the same responsive media/copy grid as the resolved story;
- mounts Daily Discovery from first paint and reserves its narrow-screen height;
- exposes gadget, FPV, YouTube, and About paths within the first mobile viewport.

## Method

- Browser: Chromium 151 through the project’s local `live-local` Angular configuration.
- Fresh origin: `http://127.0.0.1:4202/` to avoid stale service-worker state.
- Mobile viewport: 390×844; measured client width 386 after the scrollbar.
- Desktop viewport: 1440×1000; measured client width 1436 after the scrollbar.
- Observation: six seconds after a clean reload, then buffered `layout-shift` entries read through `PerformanceObserver`; entries with recent input were excluded.
- Both checks used live local data resolution rather than a static fixture.

Additional rendered checks passed:

- exactly one H1: **Cool gadgets, useful tech, and internet finds**;
- featured article title is an H2 and story navigation updates its visible title and position;
- all four identity/discovery actions are visible by `y=443` on mobile;
- Daily Discovery begins at `y=1411`, inside the second 844px mobile viewport;
- no horizontal overflow on mobile or desktop;
- no blocking signup overlay was introduced.

## Evidence Limits

No overall performance score is assigned because this check did not run Lighthouse and did not measure LCP or a lab blocking-time proxy. INP cannot be inferred from these results.

The external field-performance source was rate-limited during the parent audit. Field LCP, INP, and CLS are therefore unverified. Production verification requires deployment of the exact reviewed commit, a fresh rendered check, and sufficient real-user data. Field CWV remains the authority.

## Remaining Performance Actions

1. After deployment, repeat the same mobile trace on the public URL and compare the shift sources.
2. Retrieve CrUX/PageSpeed field data when available; report missing traffic or quota limits explicitly.
3. Run a full mobile/desktop Lighthouse pass to establish LCP, TBT, and performance-score baselines.
4. Keep the stable identity block and loading geometry in homepage regression coverage whenever the hero or Daily Discovery layout changes.
