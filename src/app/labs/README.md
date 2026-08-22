# Labs

Experimental and playground routes belong here.

Labs can expose intentionally reachable experiments, but they should stay isolated from public website page logic and reusable OS framework infrastructure.

Current route state:

- `/labs` and every nested `/labs/**` path redirect to `/blog` while the Labs index is paused.
- `/background` remains a directly reachable full-screen background experiment.
- The larger reproducible media experiments under the repository-level `labs/` folder are tooling/source packages, not Angular runtime dependencies.
- Preserved experiments should not be deleted or promoted into the public bundle without an explicit product, security, migration, and rollback review.
