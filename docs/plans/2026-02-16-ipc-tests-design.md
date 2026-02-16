# IPC Handler Tests Design

## Context

The branch now has:

- green lint/typecheck/build,
- a working Vitest harness,
- baseline regression tests for model selection and conversation state manager.

The next highest-risk area is Electron IPC handler behavior. This boundary controls many app-critical actions and is prone to regressions when refactoring main-process logic.

## Goal

Add deterministic regression tests for IPC handler registration and behavior, focusing on high-risk channels and error handling paths.

## Non-goals

- Full Electron integration/e2e tests.
- Refactoring IPC architecture while adding tests.
- UI-level behavior tests in renderer for this phase.

## Approaches Considered

### 1) Unit tests around `registerIpcHandlers` (recommended)

Mock Electron primitives and inject fake dependencies, then invoke registered handlers directly.

Pros:

- Fast and deterministic.
- Tight scope around IPC contract behavior.
- Easy to diagnose failures.

Cons:

- Does not validate full runtime wiring.

### 2) Semi-integration main-process tests

Boot larger portions of main process and assert side effects.

Pros:

- More realistic behavior checks.

Cons:

- Slower and more brittle.
- More setup complexity.

### 3) E2E-driven coverage

Test IPC indirectly via full app automation.

Pros:

- High end-user confidence.

Cons:

- Highest setup/maintenance cost.
- Poor failure locality for IPC specifics.

## Selected Design

Use direct unit-style tests for `registerIpcHandlers` with mocked Electron and injected deps.

### Test architecture

- Add `tests/electron/ipcHandlers.test.ts`.
- Mock `electron` module:
  - capture channel handlers from `ipcMain.handle`,
  - spy on `shell.openExternal`.
- Build a helper to invoke captured handlers by channel.
- Build reusable dependency fixture implementing `IIpcHandlerDeps` with `vi.fn()` stubs.

### Coverage scope

Focus on these channel groups:

1. Screenshot and processing channels
   - `get-screenshots`, `delete-screenshot`, `delete-last-screenshot`
   - `process-screenshots`, `debug-screenshots`, `reset-view`, movement channels

2. Conversation channels
   - `add-conversation-message`, `toggle-speaker`, `get-conversation`
   - `clear-conversation`, `update-conversation-message`

3. Link and config-adjacent channels
   - `open-link`, `open-external-url` alias behavior
   - selected config channels with success/failure return contracts

4. Error path normalization
   - verify `unknown` errors return safe fallback strings consistently.

## Verification Strategy

- `npm run test -- tests/electron/ipcHandlers.test.ts`
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Delivery Strategy

- Commit 1: IPC test harness + first high-risk channel group.
- Commit 2: additional channels + error-path coverage.
- Commit 3 (optional): any production bugfixes revealed by tests.

## Success Criteria

- Deterministic IPC test suite exists and runs fast.
- Core handler families have regression coverage.
- Quality gates remain green.
