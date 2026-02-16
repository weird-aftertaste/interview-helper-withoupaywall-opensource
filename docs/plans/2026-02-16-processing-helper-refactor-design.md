# ProcessingHelper Refactor Design

## Context

`electron/ProcessingHelper.ts` is currently a large, multi-responsibility class handling:

- provider-specific API requests,
- prompt construction,
- response parsing/normalization,
- error formatting,
- orchestration and event dispatch.

The branch now has stronger safety nets (lint/typecheck/build green plus test harness and IPC tests), so this is a good point to reduce complexity before future behavior changes.

## Goal

Modularize `ProcessingHelper` using a medium-depth split that improves maintainability and testability while preserving all existing runtime behavior and IPC contracts.

## Non-goals

- Rewriting provider logic end-to-end.
- Changing channel/event names or payload contracts.
- Introducing new user-facing functionality.

## Approaches Considered

### 1) Light split

Move only small utility functions to separate files.

Pros:
- Very low risk.

Cons:
- Leaves core complexity and duplication in one large file.

### 2) Medium split (selected)

Extract provider adapters, prompt builders, response parsers, and error helpers while keeping `ProcessingHelper` as orchestrator.

Pros:
- Strong maintainability gain with controlled churn.
- Enables unit testing by concern.
- Preserves public class boundary and existing wiring.

Cons:
- Requires careful migration to avoid subtle behavior drift.

### 3) Deep split

Full strategy-layer redesign with per-provider service classes and expanded orchestration layer.

Pros:
- Best long-term architecture.

Cons:
- Highest churn/risk for this phase.

## Selected Architecture

Keep `ProcessingHelper` as the entry-point orchestrator, and extract internal concerns into `electron/processing/`:

- `types.ts` — shared response and payload types.
- `errors.ts` — provider error normalization + formatting helpers.
- `promptBuilders.ts` — extraction/solution/debug prompt generation.
- `responseParsers.ts` — model response parsing + normalized outputs.
- `providerClients.ts` — provider-specific request wrappers (OpenAI/Gemini/Anthropic).

`ProcessingHelper` remains responsible for:

- queue/view gating,
- cancellation lifecycle,
- event dispatch and state updates,
- high-level orchestration flow.

## Migration Strategy

1. Add pure modules first with tests.
2. Wire `ProcessingHelper` internals to these modules incrementally.
3. Remove redundant in-class logic only after parity checks.
4. Preserve all event/channel payload shapes.

## Verification Strategy

- Run focused tests on extracted modules.
- Run full suite:
  - `npm run test`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`

## Success Criteria

- `ProcessingHelper.ts` is materially smaller and clearer.
- Extracted modules have targeted automated tests.
- Existing behavior and contracts remain unchanged.
- All quality gates stay green.
