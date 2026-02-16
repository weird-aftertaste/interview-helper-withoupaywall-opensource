# Lint-to-Green Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `npm run lint` pass with zero errors while keeping `npm run typecheck` and `npm run build` green.

**Architecture:** Apply a runtime-first cleanup strategy with strict lint rules unchanged. Remove low-risk lint debt first, then tighten IPC/type boundaries, then clean declaration files. Keep changes incremental, behavior-preserving, and commit in small batches.

**Tech Stack:** Electron, React, TypeScript, ESLint, npm.

---

### Task 1: Baseline capture and guardrails

**Files:**
- Verify-only: `package.json`, `eslint.config.mjs`
- Create: `docs/plans/2026-02-16-lint-to-green.md` (this plan)

**Step 1: Write the failing verification command**

```bash
npm run lint
```

**Step 2: Run it to verify it fails**

Run: `npm run lint`
Expected: FAIL with current baseline count (about 90 errors), concentrated in `electron/*.ts` and `src/types/*.d.ts`.

**Step 3: Record baseline for progress tracking**

```bash
npx eslint "src/**/*.{ts,tsx}" "electron/**/*.ts" "shared/**/*.ts"
```

Capture failing files and counts in commit notes or PR description.

**Step 4: Commit plan document**

```bash
git add docs/plans/2026-02-16-lint-to-green.md
git commit -m "docs: add lint-to-green implementation plan"
```

---

### Task 2: Clean preload boundary typing (`electron/preload.ts`)

**Files:**
- Modify: `electron/preload.ts`
- Modify: `src/types/electron.d.ts`

**Step 1: Write the failing test**

```bash
npx eslint electron/preload.ts
```

**Step 2: Run test to verify it fails**

Run: `npx eslint electron/preload.ts`
Expected: FAIL with `@typescript-eslint/no-explicit-any` on listener and IPC method signatures.

**Step 3: Write minimal implementation**

Replace `any` in preload IPC API with explicit boundary-safe types.

```ts
type UnknownRecord = Record<string, unknown>;
type IpcListener<T> = (payload: T) => void;

const onChannel = <T>(channel: string, callback: IpcListener<T>) => {
  const subscription = (_event: IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, subscription);
  return () => ipcRenderer.removeListener(channel, subscription);
};
```

Keep runtime behavior unchanged.

**Step 4: Run verification**

Run:
- `npx eslint electron/preload.ts`
- `npm run typecheck`

Expected: `preload.ts` lint clean and typecheck still pass.

**Step 5: Commit**

```bash
git add electron/preload.ts src/types/electron.d.ts
git commit -m "refactor: tighten preload IPC boundary types"
```

---

### Task 3: Clean main-process IPC and app boundary typing

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/ipcHandlers.ts`

**Step 1: Write the failing test**

```bash
npx eslint electron/main.ts electron/ipcHandlers.ts
```

**Step 2: Run test to verify it fails**

Run: `npx eslint electron/main.ts electron/ipcHandlers.ts`
Expected: FAIL with `no-explicit-any` for handler payloads and event plumbing.

**Step 3: Write minimal implementation**

Define narrow interfaces for known payload shapes and use `unknown` where payloads are dynamic.

```ts
interface SettingsUpdatePayload {
  key: string;
  value: unknown;
}

const parseErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
```

Do not alter handler/channel behavior.

**Step 4: Run verification**

Run:
- `npx eslint electron/main.ts electron/ipcHandlers.ts`
- `npm run typecheck`
- `npm run build`

Expected: Lint reduced for both files; typecheck/build still pass.

**Step 5: Commit**

```bash
git add electron/main.ts electron/ipcHandlers.ts
git commit -m "refactor: replace main and IPC any types with safe boundaries"
```

---

### Task 4: Clean processing pipeline helper typing

**Files:**
- Modify: `electron/ProcessingHelper.ts`

**Step 1: Write the failing test**

```bash
npx eslint electron/ProcessingHelper.ts
```

**Step 2: Run test to verify it fails**

Run: `npx eslint electron/ProcessingHelper.ts`
Expected: FAIL with `no-explicit-any` in provider-error and response-handling branches.

**Step 3: Write minimal implementation**

Introduce shared unknown-safe helpers and response guards.

```ts
type ProviderError = {
  status?: number;
  message?: string;
  response?: { status?: number; data?: { error?: { message?: string } } };
};

const asProviderError = (error: unknown): ProviderError =>
  (typeof error === "object" && error !== null ? (error as ProviderError) : {});
```

Use these in existing error-format paths only.

**Step 4: Run verification**

Run:
- `npx eslint electron/ProcessingHelper.ts`
- `npm run typecheck`

Expected: `ProcessingHelper.ts` lint errors removed; typecheck passes.

**Step 5: Commit**

```bash
git add electron/ProcessingHelper.ts
git commit -m "refactor: harden processing helper typing and error narrowing"
```

---

### Task 5: Clean remaining electron provider helpers

**Files:**
- Modify: `electron/AnswerAssistant.ts`
- Modify: `electron/TranscriptionHelper.ts`
- Modify: `electron/ConfigHelper.ts`

**Step 1: Write the failing test**

```bash
npx eslint electron/AnswerAssistant.ts electron/TranscriptionHelper.ts electron/ConfigHelper.ts
```

**Step 2: Run test to verify it fails**

Run: `npx eslint electron/AnswerAssistant.ts electron/TranscriptionHelper.ts electron/ConfigHelper.ts`
Expected: FAIL with `no-explicit-any` in provider error formatting and config parsing.

**Step 3: Write minimal implementation**

Standardize a small unknown-safe provider error shape and reuse it.

```ts
interface ProviderLikeError {
  status?: number;
  message?: string;
  response?: { status?: number; data?: { error?: { message?: string } } };
}
```

Replace broad `any` with this interface or `unknown` + guards.

**Step 4: Run verification**

Run:
- `npx eslint electron/AnswerAssistant.ts electron/TranscriptionHelper.ts electron/ConfigHelper.ts`
- `npm run typecheck`

Expected: Target files lint clean; typecheck remains green.

**Step 5: Commit**

```bash
git add electron/AnswerAssistant.ts electron/TranscriptionHelper.ts electron/ConfigHelper.ts
git commit -m "refactor: unify provider error typing across electron helpers"
```

---

### Task 6: Clean declaration and renderer boundary files

**Files:**
- Modify: `src/env.d.ts`
- Modify: `src/types/electron.d.ts`
- Modify: `src/types/global.d.ts`
- Modify: `src/types/solutions.ts`

**Step 1: Write the failing test**

```bash
npx eslint src/env.d.ts src/types/electron.d.ts src/types/global.d.ts src/types/solutions.ts
```

**Step 2: Run test to verify it fails**

Run: `npx eslint src/env.d.ts src/types/electron.d.ts src/types/global.d.ts src/types/solutions.ts`
Expected: FAIL with declaration-level `no-explicit-any` and unused type issues.

**Step 3: Write minimal implementation**

Use declaration-safe boundary types:

```ts
type JsonLike = string | number | boolean | null | JsonLike[] | { [k: string]: JsonLike };
type UnknownFn = (...args: unknown[]) => unknown;
```

Replace `any` with `unknown`, generic function signatures, or specific payload interfaces where known.

**Step 4: Run verification**

Run:
- `npx eslint src/env.d.ts src/types/electron.d.ts src/types/global.d.ts src/types/solutions.ts`
- `npm run typecheck`

Expected: Declaration files lint clean and typecheck remains green.

**Step 5: Commit**

```bash
git add src/env.d.ts src/types/electron.d.ts src/types/global.d.ts src/types/solutions.ts
git commit -m "refactor: remove any from renderer and declaration type boundaries"
```

---

### Task 7: Full verification and release-ready branch state

**Files:**
- Verify-only: all modified files above

**Step 1: Run full failing-to-passing check**

```bash
npm run lint
```

**Step 2: Verify green quality gates**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected:
- Lint passes with zero errors.
- Typecheck passes.
- Build passes.

**Step 3: Manual runtime smoke**

Run: `stealth-run.bat`
Expected: app launches and core flows remain usable (screenshots, processing, settings, conversation controls).

**Step 4: Push branch updates**

```bash
git push
```

Expected: branch `chore/stability-pass-1` updated on `myfork`.

**Step 5: Optional PR update**

If PR exists, update description with:
- before/after lint counts
- confirmation that typecheck/build remained green
- smoke test notes

---

## Notes for execution

- Keep changes DRY and YAGNI. Do not refactor beyond what lint and boundary safety require.
- If a lint fix introduces uncertain behavior, use `@superpowers:systematic-debugging` before further edits.
- Before claiming completion, use `@superpowers:verification-before-completion` and report exact command outputs.
