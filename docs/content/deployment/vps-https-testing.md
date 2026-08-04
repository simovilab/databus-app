# VPS HTTPS device testing

The web build ships a manifest + service worker (see
[PWA](../app-behavior/pwa.md)), so it can be installed to a phone's home
screen and tested on real devices over HTTPS with no app-store involvement.
The executable runbook for this lives at
[`deploy/VPS_HTTPS_TESTING.md`](https://github.com/simovilab/databus-app/blob/main/deploy/VPS_HTTPS_TESTING.md)
in the repo root — this page is a summary, not a replacement; follow the
runbook for the actual steps.

## Shape of the setup

- **Reverse proxy**: Traefik, with a Docker-provider for the app container and
  a file provider (`deploy/traefik/dynamic/dynamic.yml`) for the same-origin
  `/api` router. Certs via Let's Encrypt.
- **Domain**: `sslip.io` (`app.<VPS_IP>.sslip.io`) — real Let's Encrypt certs
  with zero DNS ownership required. A real domain can replace this later with
  no code change.
- **Same-origin trick**: the app's `apiClient.getBaseUrl()` resolves relative
  `/api` against `window.location.origin`, so Traefik path-routing `/api →
  orchestrator` on the app host needs **no CORS, no backend edit**.
- **Both repos are real git clones on the VPS**, not ad hoc copies — `databus`
  provides `compose.prod.yml` + build contexts, `databus-app` provides
  `deploy/*`. Shipping a new frontend build is `npm run build` +
  `rsync -av app/dist/ deploy/dist/` (no `--delete`, so the served directory
  never goes empty mid-rsync).

## The one gotcha worth knowing before touching VPS nginx config

Docker binds a **single-file** mount by inode. Tools like `rsync` (and most
editors) write a temp file and rename it over the target, which creates a
**new inode** — this silently breaks single-file mounts (e.g. `nginx.conf`),
leaving the container serving stale config even though `nginx -t` and `nginx
-s reload` both report success. Fix: `docker compose ... up -d
--force-recreate <service>`.

**Directory mounts** (e.g. `dist/`) are immune — rsyncing new files into them
is picked up immediately, no restart needed. This is exactly why shipping a
new build (directory mount) is safe to do casually, while touching
`nginx.conf` or the Traefik config (single-file mounts) is not.

## Known backend blockers hit during bring-up

Fixture/app-label issues and the stuck-`Initialized`-run bug were all found
during VPS bring-up — see
[Databús contract & open asks](../backend-integration/databus-integration.md)
and [Known issues](../backend-integration/known-issues.md).
