# Payment, session, and credit foundation

## Owner request

On 2026-07-28 the project owner asked the agents to review and implement:

- USD and TRY payment presentation,
- a reliable post-checkout confirmation experience,
- consistent authenticated navigation after email verification,
- safe one-time credit purchases,
- and a later private notes/practice-tracking experience.

The owner explicitly requested minimum human interaction and authorized the agents to implement the product ideas they accepted. Live pricing remains a separate business value to be confirmed before credit sales are enabled.

## Prisma schema change approval

Approved in the owner's 2026-07-28 request. The first migration is strictly additive:

- nullable subscription reconciliation fields,
- webhook audit fields,
- credit balance, purchase, and append-only ledger tables,
- no destructive statements, renames, backfills, or data deletion.

A verified production backup is required immediately before `prisma migrate deploy`. Credit sales remain disabled until the Stripe package, USD/TRY prices, legal copy, webhook fulfillment tests, and refund/dispute behavior are verified.

## Release boundaries

### Release 0

- canonical client session state,
- email-verification navigation refresh,
- persistent and accessible verification success state,
- ownership-checked Stripe Checkout return status,
- fail-closed subscription reconciliation,
- explicit USD/TRY Checkout selection,
- centralized Seeker/Initiate entitlement resolution.

### Release 1

- additive credit wallet and ledger foundation deployed dark,
- no live credit sales until a package price is configured and explicitly enabled,
- no journal text stored or sent to an agent.

### Later privacy-gated release

- private routine/check-in and journal features only after encryption, privacy disclosure, export, delete, retention, admin redaction, and zero background-agent access are verified.

## Safety invariants

- A success URL never grants membership or credits.
- Only verified Stripe state plus idempotent server-side persistence grants an entitlement.
- Unknown Stripe subscription states grant no paid capability.
- Social, content, SEO, and growth agents never receive private notes or journal text.
- Production migrations are preceded by backup and followed by migration status, health, and live route checks.
