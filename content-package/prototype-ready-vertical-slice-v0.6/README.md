# Prototype-Ready Structured Content Package — v0.6

This package applies a plain-language clarity pass to v0.5. It preserves all question IDs, answer labels, routes, semantic state, and seeded/inventory membership.

## Question clarity

- The audit reviewed all 323 user-facing question records.
- 178 questions were difficult for the review persona to understand and were rewritten.
- See `question-clarity-audit.md` for the complete before/after list.
- Use `question_clarity_audit.json` as the machine-readable change set.
- Runtime prompt text comes from `nodes.json`; interpolated prompt text comes from `thread_display_template`. Both are synchronized.

## Default screen rule

The v0.5 five-button contract is unchanged. Load `default_option_sets.json`; do not recompute or truncate starter defaults at runtime. User-added options may exceed five.
