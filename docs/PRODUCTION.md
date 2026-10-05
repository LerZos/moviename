# KinoLuma production

This document records the confirmed production topology. It is operational context, not permission to change production.

## Topology

~~~text
kinoluma.online / www
        |
      HTTPS
        |
  VPS: Ubuntu 22.04 LTS
        |
      Nginx
        |
  127.0.0.1:3000
        |
  Next.js 16 standalone
  /var/www/kinoluma/.next/standalone
        |
  kinoluma.service (systemd)
~~~

- Runtime: Node.js 22.
- Application path: /var/www/kinoluma.
- Process manager: systemd.
- Reverse proxy: Nginx.
- Firewall: UFW is enabled.
- TLS: Let's Encrypt.
- Docker is not used.
- Caddy is not used.
- PM2 is not the production process manager.
- The web application and Telegram bot currently run as root.
- kinoluma.service has historically used fuser -k in ExecStartPre to clear port 3000.

## SOURCE OF TRUTH

GitHub main is the current source repository for KinoLuma. Production runtime state must still be verified independently because the current deployment flow is predominantly manual.

The restored production source was synchronized into GitHub before this document was created. Old Vercel configuration and Vercel deployment state are not the production source of truth. The live service is the VPS-hosted Next.js standalone application behind Nginx.

Never store environment values, tokens, passwords, private keys, certificates, IP addresses, or copied runtime state in this document or in Git.

## Web service

The build is configured with output: standalone. The deployed standalone directory is /var/www/kinoluma/.next/standalone, and Nginx proxies the public domains to the Next.js listener on 127.0.0.1:3000.

The primary service is kinoluma.service. systemd owns startup and restart behavior. Production actions must account for Nginx, the service unit, the standalone output, static assets, environment configuration, and the currently deployed revision as one release.

## Telegram bot

The Telegram bot is a separate production component outside the main web repository:

- Executable: /var/www/kinoluma-bot/bot.mjs.
- Service: kinoluma-bot.service.
- Delivery mode: long polling through Telegram getUpdates.
- Persistent runtime state: /var/lib/kinoluma-bot.

The bot is not deployed by the Next.js build and must not be assumed to follow the web repository's Git revision. Its code, unit, environment, logs, state, and backup policy need separate ownership.

## DEPLOY FLOW

The current deployment is predominantly manual. The safe intended relationship is:

~~~text
reviewed commit on GitHub main
  -> identify and record exact commit SHA
  -> build/test that revision
  -> prepare complete standalone release
  -> deploy while preserving server-only environment
  -> controlled systemd restart
  -> verify local listener, Nginx, HTTPS, pages, APIs, and logs
  -> record deployed SHA and outcome
~~~

A deploy should be attributable to one Git commit. Do not edit tracked application source directly on the VPS as a normal release method. Do not treat a successful build or Git push as proof that production changed. There is currently no confirmed fully automated GitHub-to-VPS deployment pipeline.

## ROLLBACK PRINCIPLES

- Record the deployed Git SHA and the previous known-good SHA before a release.
- Keep release artifacts or a reproducible path to rebuild a known-good commit.
- Roll back application code as a coherent release; do not mix files from different builds.
- Preserve server-only environment files and runtime state.
- Treat database migrations separately: confirm backward compatibility and a tested reversal or recovery plan before deployment.
- Verify rollback through the local listener, public HTTPS endpoint, important APIs, and service logs.
- Backups on the same VPS are not sufficient protection against host loss.

This document intentionally does not prescribe destructive shell commands. An incident-specific rollback requires explicit authorization and current-state inspection.

## PRODUCTION SAFETY

Without explicit authorization for the exact action:

- Do not edit or delete files on the VPS.
- Do not deploy, restart, stop, enable, or disable services.
- Do not change Nginx, systemd, UFW, ports, TLS, environment files, ownership, or permissions.
- Do not run database migrations or mutate production data.
- Do not kill processes or clear port 3000.
- Do not copy secrets or runtime state into local files, Git, logs, or chat output.

Prefer read-only checks first. Before an authorized production change, capture current service state, deployed revision, configuration syntax status, disk capacity, and rollback point. Afterward, verify externally visible behavior and relevant logs.

## Known infrastructure risks

- Production permissions are broader than necessary.
- The web application and bot run as root.
- Backups are stored on the same VPS; an external backup has not been confirmed.
- Monitoring is limited.
- fetch failed, upstream errors, and HTTP 502 responses have occurred historically.
- Historical deployments were not consistently tied to a Git commit.
- ExecStartPre using fuser -k can terminate whichever process owns port 3000 and obscures ownership problems.
- The manual deployment flow increases configuration drift and partial-release risk.
- The bot is outside the web repository and has separate persistent state.

Priority improvements are least-privilege service users, external verified backups, commit-addressed releases, health checks and alerting, a documented bot source repository, and replacing unconditional port killing with predictable service ownership.
