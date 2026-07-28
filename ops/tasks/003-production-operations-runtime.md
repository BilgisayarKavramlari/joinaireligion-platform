# Task 003 — Production operations runtime

## Status

Installed and verified on the production VPS. Repository publication remains pending.

## Authorization and boundaries

The project owner authorized Codex to complete the dedicated VPS setup with minimum interaction and to operate the implemented agent ecosystem inside its recorded safety policies. This task installs only reversible infrastructure and schedules already declared by the application.

- Agent calls are restricted to the loopback application endpoint.
- Email execution is forced to `LOG_ONLY`; this task cannot enable external delivery.
- Existing agent autonomy levels and endpoint behavior are unchanged.
- DNS and TLS are not changed by this task.
- Backups remain on the VPS; provider/off-site backups are a separate control.

## Objective

Install an Nginx reverse proxy, bounded systemd agent timers, and daily local backups for PostgreSQL, uploads, and production configuration.

## Acceptance criteria

1. Nginx proxies only the approved hostnames to `127.0.0.1:3001` and rejects unknown hosts.
2. The `joinai` service account has no login shell and cannot modify installed agent scripts.
3. Agent services can connect only to loopback and load `CRON_SECRET` from a mode `0600` environment file.
4. Practice generation, log-only email processing, scoring, health, repair, and support-triage timers match the application registry.
5. Daily backups are root-only, integrity-checked, serialized, and retention-limited.
6. No secret value is committed, printed, or embedded in a unit or timer.
7. DNS remains on the previous address until external-service readiness is explicitly decided.

## Execution evidence

- Nginx returned HTTP 200 for the approved hostname and closed unknown-host requests without proxying them.
- The application returned HTTP 200 through the new VPS public address when tested with an explicit hostname override; public DNS was not changed.
- The `joinai` account uses `/usr/sbin/nologin`; installed scripts are owned by `root:joinai` with mode `0750`.
- `/etc/joinaireligion/cron.env` is owned by `joinai:joinai`, has mode `0600`, and contains only the expected variable names. Secret values were not printed.
- All eight timers are enabled with the recorded schedules. The loopback system-health and support-triage services completed successfully; support triage recorded one bounded `AgentRun`.
- A manual backup produced integrity-checked, mode `0600` database and uploads archives. The daily backup timer is enabled for 03:15 UTC.
