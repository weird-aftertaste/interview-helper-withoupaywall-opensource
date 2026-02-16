# Tests Safety Net Design

## Context

The branch now has green lint, typecheck, and build. The next highest-leverage enhancement is adding a reliable test safety net before larger refactors (especially around Electron and processing flows).

Current constraints:

- `npm test` is currently a placeholder that always exits successfully.
- There is no maintained test harness in active app paths.
- We need low-risk, high-signal tests that run quickly in CI.

## Goal

Introduce a minimal automated test foundation and cover core deterministic behaviors so future refactors are safer.

## Non-goals

- Full Electron integration/e2e coverage.
- UI snapshot testing.
- Large architecture changes tied to test work.

## Approaches Considered

### 1) Vitest unit harness (recommended)

Use Vitest with Node environment for fast TypeScript tests focused on deterministic logic modules.

Pros:

- Fast setup in Vite + TS projects.
- Minimal ceremony and low runtime overhead.
- Good fit for pure/shared logic and manager classes.

Cons:

- Does not directly cover Electron window lifecycle integration.

### 2) Node built-in test runner only

Use `node:test` + TypeScript transpilation workflow.

Pros:

- No major test framework dependency.

Cons:

- More custom setup friction for TypeScript.
- Less ergonomic assertions/mocking than Vitest.

### 3) E2E-first with Playwright/Electron harness

Start with end-to-end tests.

Pros:

- Broad confidence across real behavior.

Cons:

- Highest setup and maintenance cost.
- Slower feedback loops; overkill for immediate stabilization.

## Selected Design

Use Vitest unit harness with focused tests in deterministic modules first.

### Scope

1. Add Vitest configuration and scripts.
2. Add tests for `sanitizeModelSelection` and model defaults in `shared/aiModels.ts`.
3. Add tests for `ConversationManager` behavior in `electron/ConversationManager.ts`:
   - message validation/normalization,
   - speaker toggle/set behavior,
   - conversation history formatting,
   - message update behavior,
   - clear/reset behavior.

### Why this scope

- High signal with low mocking complexity.
- Covers recently important boundaries: model selection and conversation state flow.
- Creates a pattern for expanding tests into IPC and processing helpers later.

## Verification Strategy

- `npm run test` must pass.
- Existing gates must stay green:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`

## Success Criteria

- Test harness is installed and documented in scripts.
- New tests run in CI-friendly non-watch mode.
- At least two core modules have meaningful regression tests.
- No regressions in existing lint/type/build gates.
