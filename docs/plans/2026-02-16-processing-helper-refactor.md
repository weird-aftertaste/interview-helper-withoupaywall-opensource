# ProcessingHelper Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modularize `electron/ProcessingHelper.ts` into testable focused modules while preserving current behavior and event/channel contracts.

**Architecture:** Keep `ProcessingHelper` as the orchestration entry point, but extract reusable pure logic into `electron/processing/` modules for types, error formatting, prompt generation, response parsing, and provider request wrappers. Migrate internals incrementally to avoid behavior drift and verify after each slice.

**Tech Stack:** TypeScript, Electron main process, OpenAI/Anthropic/Gemini API clients, Vitest, npm.

---

### Task 1: Create processing module scaffolding

**Files:**
- Create: `electron/processing/types.ts`
- Create: `electron/processing/errors.ts`
- Create: `electron/processing/promptBuilders.ts`
- Create: `electron/processing/responseParsers.ts`
- Create: `electron/processing/providerClients.ts`

**Step 1: Write the failing test (imports should fail first)**

```ts
import { describe, it, expect } from "vitest"
import { formatProviderError } from "../../electron/processing/errors"

describe("processing module scaffold", () => {
  it("exports processing helpers", () => {
    expect(typeof formatProviderError).toBe("function")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/electron/processing/errors.test.ts`
Expected: FAIL because module/file does not exist yet.

**Step 3: Write minimal implementation**

Add module skeletons with named exports and minimal implementations.

```ts
// electron/processing/errors.ts
export interface ProviderErrorShape {
  status?: number
  message?: string
  response?: { status?: number; data?: { error?: { message?: string } } }
}

export const asProviderError = (error: unknown): ProviderErrorShape =>
  typeof error === "object" && error !== null ? (error as ProviderErrorShape) : {}

export const formatProviderError = (
  provider: "openai" | "gemini" | "anthropic",
  error: unknown,
  context: string
) => {
  const e = asProviderError(error)
  const status = typeof e.status === "number" ? e.status : e.response?.status
  const message = e.message || e.response?.data?.error?.message || "Unknown error"
  const statusPart = status ? ` (status ${status})` : ""
  return `[${provider}] ${context} failed${statusPart}: ${message}`
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/electron/processing/errors.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron/processing/types.ts electron/processing/errors.ts electron/processing/promptBuilders.ts electron/processing/responseParsers.ts electron/processing/providerClients.ts tests/electron/processing/errors.test.ts
git commit -m "refactor: scaffold processing helper modules"
```

---

### Task 2: Extract and test error helpers

**Files:**
- Modify: `electron/processing/errors.ts`
- Test: `tests/electron/processing/errors.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest"
import { asProviderError, formatProviderError } from "../../../electron/processing/errors"

describe("processing errors", () => {
  it("maps non-object unknown error to empty shape", () => {
    expect(asProviderError("boom")).toEqual({})
  })

  it("formats response status and message", () => {
    const error = { response: { status: 429, data: { error: { message: "quota" } } } }
    expect(formatProviderError("openai", error, "Processing screenshots")).toContain("status 429")
    expect(formatProviderError("openai", error, "Processing screenshots")).toContain("quota")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/electron/processing/errors.test.ts`
Expected: FAIL until implementation fully matches expectations.

**Step 3: Write minimal implementation**

Update `errors.ts` to exactly satisfy test expectations and preserve existing message format.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/electron/processing/errors.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron/processing/errors.ts tests/electron/processing/errors.test.ts
git commit -m "test: cover processing error normalization helpers"
```

---

### Task 3: Extract and test prompt builders

**Files:**
- Modify: `electron/processing/promptBuilders.ts`
- Test: `tests/electron/processing/promptBuilders.test.ts`

**Step 1: Write failing tests**

Create tests for extraction/solution/debug prompt builders:
- include conversation context when provided,
- include language and problem statement,
- keep section headers used by debug prompt.

Example assertion:

```ts
expect(buildSolutionPrompt(problemInfo, "python")).toContain("PROBLEM STATEMENT")
expect(buildDebugPrompt(problemInfo, "python")).toContain("### Issues Identified")
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/electron/processing/promptBuilders.test.ts`
Expected: FAIL before implementation exists/aligns.

**Step 3: Write minimal implementation**

Extract prompt string creation from `ProcessingHelper` into pure builder functions preserving original text content.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/electron/processing/promptBuilders.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron/processing/promptBuilders.ts tests/electron/processing/promptBuilders.test.ts
git commit -m "refactor: extract and test processing prompt builders"
```

---

### Task 4: Extract and test response parsers

**Files:**
- Modify: `electron/processing/responseParsers.ts`
- Test: `tests/electron/processing/responseParsers.test.ts`

**Step 1: Write failing tests**

Add tests for:
- markdown-fenced JSON parsing fallback,
- debug content formatting + bullet extraction,
- safe defaults when content is missing.

Example:

```ts
expect(parseProblemInfo("```json\n{\"problem_statement\":\"x\"}\n```")?.problem_statement).toBe("x")
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/electron/processing/responseParsers.test.ts`
Expected: FAIL before parser extraction is complete.

**Step 3: Write minimal implementation**

Move parser/formatter logic from `ProcessingHelper` with unchanged output keys (`code`, `thoughts`, `time_complexity`, `space_complexity`, `debug_analysis`).

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/electron/processing/responseParsers.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron/processing/responseParsers.ts tests/electron/processing/responseParsers.test.ts
git commit -m "refactor: extract and test processing response parsers"
```

---

### Task 5: Wire ProcessingHelper to extracted modules

**Files:**
- Modify: `electron/ProcessingHelper.ts`
- Modify: `electron/processing/types.ts`
- Modify: `electron/processing/providerClients.ts`

**Step 1: Write failing integration-oriented test**

Add a focused test that exercises one extracted path through `ProcessingHelper` (or existing IPC-triggered test) and expects unchanged response shape.

```ts
expect(result).toMatchObject({ success: true })
expect(result.data).toHaveProperty("code")
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/electron/ipcHandlers.test.ts`
Expected: FAIL if wiring/contracts drift during extraction.

**Step 3: Write minimal implementation**

Replace in-class duplicated logic with calls to:
- `formatProviderError/asProviderError` from `errors.ts`,
- prompt builders from `promptBuilders.ts`,
- parser helpers from `responseParsers.ts`,
- provider client wrappers from `providerClients.ts`.

Keep method signatures and return payloads unchanged.

**Step 4: Run test to verify it passes**

Run:
- `npm run test -- tests/electron/ipcHandlers.test.ts`
- `npm run test -- tests/electron/ConversationManager.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add electron/ProcessingHelper.ts electron/processing/types.ts electron/processing/providerClients.ts
git commit -m "refactor: modularize processing helper internals"
```

---

### Task 6: Final verification and cleanup

**Files:**
- Verify-only: all files touched above

**Step 1: Run full tests**

Run: `npm run test`
Expected: PASS.

**Step 2: Run quality/build gates**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected: all PASS.

**Step 3: Final cleanup commit (only if needed)**

```bash
git add .
git commit -m "chore: verify gates after processing helper modular refactor"
```

Only if additional cleanup changes were required.

---

## Notes for execution

- Preserve YAGNI: no new features in this pass.
- Preserve event names and payload keys.
- If any behavior mismatch appears, use `@superpowers:systematic-debugging` before patching.
- Before claiming completion, use `@superpowers:verification-before-completion` and report exact command results.
