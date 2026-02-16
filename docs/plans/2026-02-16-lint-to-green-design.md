# Lint-to-Green Design

## Context

The stability pass improved build and typecheck reliability, but lint still fails with a concentrated set of issues.
Current state on branch `chore/stability-pass-1`:

- `npm run typecheck` passes.
- `npm run build` passes.
- `npm run lint` fails with 90 errors, mostly `@typescript-eslint/no-explicit-any` plus a few remaining boundary typing issues.

The codebase is functional in manual smoke runs (`stealth-run.bat`), so this effort should improve maintainability without destabilizing behavior.

## Goal

Reach lint clean (`npm run lint` with zero errors) using incremental, low-risk refactors that preserve current app behavior.

## Non-goals

- Large architecture rewrites.
- Product behavior changes.
- Rule relaxations as the primary strategy.

## Approaches Considered

### 1) Runtime-first cleanup (recommended)

Fix runtime files first (`src`, `electron`, `shared`), then clean declaration files (`.d.ts`) at the boundary.

Pros:
- Reduces risk by improving executable code first.
- Keeps regressions visible with typecheck/build after each slice.
- Avoids papering over typing debt.

Cons:
- Requires more small, focused changes.

### 2) Policy-first cleanup

Temporarily relax lint for declaration files, clean runtime files, then re-enable strict rules.

Pros:
- Faster short-term lint count reduction.

Cons:
- Adds temporary policy churn.
- Risks postponed debt and unclear ownership.

### 3) Big-bang cleanup

Fix all remaining lint errors in one large pass.

Pros:
- Potentially shortest wall-clock path if no regressions.

Cons:
- High review risk.
- Harder to isolate regressions.

## Selected Design

Use runtime-first cleanup with strict lint rules unchanged.

### Phase A: Quick wins

- Remove unused imports, locals, and dead code in runtime files.
- Replace TSX `require` patterns and obvious `no-undef` edge cases.
- Run `npm run lint` after each focused batch to track error reduction.

### Phase B: Runtime `any` elimination

- Replace `any` with `unknown` at boundaries.
- Add minimal type guards and small interfaces for event payloads and callback contracts.
- Keep logic unchanged; only typing and safety-narrowing edits.

### Phase C: IPC/preload boundary typing

- Tighten handler and listener signatures in `electron/preload.ts` and related renderer-facing types.
- Ensure channel payload shapes are explicit and compatible.

### Phase D: Declaration file cleanup

- Update `src/env.d.ts`, `src/types/electron.d.ts`, and related declaration files to remove remaining `any` usage.
- Prefer `unknown` and generic callback signatures where concrete runtime types are not guaranteed.

## Verification Strategy

- `npm run lint` after each phase and major sub-batch.
- `npm run typecheck` at least after runtime cleanup and at final state.
- `npm run build` at least after runtime cleanup and at final state.
- Manual smoke via `stealth-run.bat` after major slices if runtime-facing changes are made.

## Delivery Strategy

- Commit 1: runtime/source lint cleanup.
- Commit 2: declaration/boundary lint cleanup.
- Commit 3 (optional): final polish if needed.

## Success Criteria

- `npm run lint` passes with zero errors.
- `npm run typecheck` remains passing.
- `npm run build` remains passing.
- No regressions in basic manual app flows.
