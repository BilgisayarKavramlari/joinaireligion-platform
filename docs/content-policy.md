# Content Policy (Safety Baseline)

## Platform Scope

Join AI Religion is fictional and educational. It provides symbolic reflection prompts and journaling support.

## Non-Authority Disclaimer

The platform is not:

- A religious authority
- Medical advice or diagnosis
- Psychological or psychiatric treatment
- Crisis intervention service

## Assistant Behavior Principles

- Use language like "consider", "reflect", "you may want to".
- Avoid absolute directives, prophecy framing, or claims of certainty.
- Encourage seeking licensed professionals for medical/mental-health concerns.
- Refuse harmful, violent, or self-harm instructions.
- Refuse hate, harassment, or discriminatory content.

## Data & Privacy Baseline

- Collect only required user data.
- Avoid storing sensitive free-form text unless needed and disclosed.
- Audit AI usage and outbound email attempts via logs.
- Treat private journals, private practice notes, routine schedules, and check-ins as private account data, not content inventory.
- Do not copy private writing into public-content, SEO, growth, translation, or social-media workflows.
- Do not quote, paraphrase, translate, publish, or use a private entry as an idea source without a separate, explicit user publishing action.

## Private Journals and Practice Notes

- AI access to a private journal is off by default and opt-in for one selected entry at a time.
- One AI invocation does not authorize batch, background, future, or cross-entry access.
- Reminder agents may use schedule and delivery metadata but never private note text.
- Product-insight agents may use aggregate counts and durations but not identifiable journal text.
- Administrators must not receive routine access to journal or private-note text. Any exceptional support, security, or legal access must be narrow, time-limited, and logged.
- Private writing must not be scored for spiritual depth, faith, psychological condition, morality, personal worth, or conformity to a tradition.
- Completion and streak mechanics, if used, must evaluate the user's chosen action only and remain separable from the meaning or quality of what they wrote.
- Private journaling is not continuously monitored and must not be represented as therapy, diagnosis, medical care, or a crisis-monitoring service.
- Personal-plan and private-note descriptive fields are encrypted at application level. Content, social, growth, SEO, and routine administrator queries do not include these tables or plaintext fields.
- Private-note retention is user-selected: keep until deletion, 30 days, 90 days, or one year. The default is keep until the user deletes it; expired notes are removed when that user next opens the notes surface.

## AI-Assisted Reflection

- Before a user submits text for AI processing, state what will be sent and what response the user requested.
- Use only the minimum text and profile context needed for that request. Sensitive onboarding answers and earlier private entries are excluded unless the user separately chooses them for the current request.
- AI output must be optional, non-authoritative, and phrased as reflection rather than diagnosis, prophecy, religious command, or certainty.
- Do not infer or persist a diagnosis, crisis status, religious conversion intent, political belief, sexual orientation, or other sensitive profile from private writing.
- If a user explicitly asks for help involving immediate danger, provide a safe handoff to appropriate human or emergency resources without implying that the platform monitors the journal continuously.
- Reflection Companion does not retain submitted question or generated answer text. `AiDialogue.userPrompt` uses the constant placeholder `[not retained]`, `assistantResponse` remains null, and only text-free operational fields may be aggregated.
- Lesson mode may use only a lesson belonging to the signed-in user. Lesson reference text is treated as untrusted data, never as system or developer instruction.
- Life Reflection is limited to values, assumptions, options, trade-offs, and small reversible steps. It must not make a decision for the user.
- Free and paid responses use the same accuracy, safety, moderation, and non-authority policy. Paid access may increase bounded sessions, context, and modes, never truth or safety.

## Moderation and prompt-injection boundary

- Input passes deterministic prompt-injection and crisis checks before any paid generation call.
- A database-backed reservation enforces verified-account, account-day, session-day, turn, daily keyed-network, global daily, and burst limits before generation.
- Provider input and output moderation fail closed. The model receives no tools, no private profile or journal access, no provider application-state conversation, bounded input/output, and a hashed safety identifier. The consent/privacy copy must still disclose the provider's possible default abuse-monitoring retention.
- Output must match a strict JSON schema and pass deterministic post-generation authority, dependency, delusion, treatment, secrecy, isolation, and instruction-disclosure checks.
- A blocked or malformed output is replaced with a fixed non-authoritative safety response; it is never passed to a downstream agent.
- Crisis handoffs are not persisted as a user-linked profile. Reporting receives only an unlinked aggregate redirect count, and provider moderation category names are discarded after the request.

## Personalization and Prompt Safety

- Reflective guidance must remain non-coercive and non-authoritarian.
- No prophetic certainty language or manipulative pressure tactics.
- Prompt or answer text is not logged. Privacy-minimized dialogue metadata and aggregate usefulness results are used for safety and quality improvement.

- Authentication and onboarding UIs must clearly reiterate educational/fictional scope and non-authority disclaimer.
