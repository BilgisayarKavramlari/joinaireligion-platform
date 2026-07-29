# Privacy and Logging

We log limited platform events for service delivery, quality, safety, fraud prevention, and product reliability. Logging is not a secondary store for user content.

## Data classification

- **Public content:** published educational articles and explicitly public metadata.
- **Operational data:** timestamps, delivery states, aggregate counters, error categories, and hashed identifiers needed to operate or secure the service.
- **Private account data:** profile and onboarding answers, practice schedules, check-ins, support requests, guided-reflection submissions, and AI conversations.
- **Sensitive private writing:** private journal entries and private practice-note text. These fields require the strongest access boundary and must be encrypted before the feature is enabled.

Religious or philosophical worldview data and writing that may reveal health, trauma, or other intimate circumstances must be treated as sensitive personal data even when the user did not label it that way.

## Logging rules

- Do not store raw IP addresses in activity logs. If an IP-derived record is necessary for security, store a salted or keyed hash with a documented rotation and retention period.
- Never put private journal text or private practice-note text in application logs, analytics events, error messages, traces, `AgentRun.input`, `AgentRun.output`, email logs, or support metadata.
- Log identifiers, event names, status, latency, coarse error categories, consent state, and aggregate counts instead of content.
- Do not log authorization headers, cookies, session tokens, API keys, password-reset tokens, encryption keys, or provider payloads that may contain them.
- Redact request bodies before they reach observability providers. Logging an exception must not serialize the sensitive request body.
- Logs that can be linked to a user require a documented purpose, owner, retention period, and least-privilege access rule.

## Agent and administrator access

- Reminder automation may read routine timing, locale, delivery preference, and completion status; it must not read private writing.
- Product-insight agents may receive aggregate counts and durations only. Their inputs must not contain user identity, religious tradition, or private text unless a separately approved use case explicitly requires it.
- Content, SEO, growth, translation, and social-media agents have no access to private journals or private practice notes.
- A journal-assistance agent may receive one entry only after the user explicitly invokes AI for that entry. One invocation does not grant future, batch, or background access.
- Routine administrator views must exclude journal and private-note text. Exceptional access must be narrow, time-limited, logged, and justified by a user support request, a security incident, or a legal obligation.
- Internal endpoints must use purpose-scoped service identity and authorization. Possession of one broad internal key must not imply access to sensitive writing.

## Retention, export, and deletion

- Every stored data category must have a documented retention purpose and period. Private-writing settings should support 30-day, 90-day, 365-day, and keep-until-deleted choices.
- Deletion removes content from active systems through an auditable, idempotent deletion job. Protected backups expire according to the backup-retention schedule; private writing must not be copied into a longer-lived analytics or agent store.
- Billing, fraud-prevention, and legally required records must be separated from private writing and retained only for their independent purpose.
- Export must produce user-readable journal files and structured check-in data without including another user's data, internal secrets, or unrelated operational logs. Export links must be authenticated, short-lived, and single-user scoped.
- Until self-service export or deletion controls exist, verified requests from the registered email address must be handled through the published legal contact path.

## AI processing and derived data

- AI access to private journals is off by default and opt-in per entry. Store the scope and time of the user's choice without copying the entry text into the consent log.
- A guided reflection or AI conversation is processed when the user intentionally submits it for the requested response; the interface must make that processing clear before submission.
- Do not use private writing for advertising, SEO, social publishing, public content generation, or unrelated model/product improvement.
- Do not assign a spiritual, psychological, diagnostic, or personal-worth score to private writing. Completion-only metrics must remain separate from content evaluation.
- Derived summaries are still personal data when they can be linked back to a user. Apply the same retention, export, deletion, and access rules to them.

## Review and incident handling

- Privacy and access-boundary tests are release gates for journal or private-note features.
- Provider changes require a data-flow review covering fields sent, purpose, region, retention, training/use terms, and deletion behavior.
- Suspected exposure of sensitive writing must be treated as a security incident, with access stopped first, evidence preserved without expanding exposure, and notification obligations assessed promptly.
