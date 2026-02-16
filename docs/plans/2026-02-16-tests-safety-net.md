# Tests Safety Net Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a maintainable automated test baseline that validates core deterministic behavior and can be expanded safely.

**Architecture:** Introduce Vitest in Node environment and target pure or low-dependency modules first. Start with `shared/aiModels.ts` and `electron/ConversationManager.ts` to establish a repeatable testing pattern. Keep behavior unchanged and use tests as regression guards.

**Tech Stack:** TypeScript, Vitest, Vite, npm.

---

### Task 1: Add test runner foundation

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Step 1: Write the failing test command**

```bash
npm run test
```

**Step 2: Run command to verify baseline is placeholder**

Run: `npm run test`
Expected: placeholder output (`No tests defined...`).

**Step 3: Write minimal implementation**

- Add `vitest` as dev dependency.
- Replace `test` script with non-watch CI mode.
- Add a watch variant.
- Add `vitest.config.ts` with Node environment and test include pattern (`tests/**/*.test.ts`).

Example script shape:

```json
{
  "scripts": {
    "test": "vitest run --config vitest.config.ts",
    "test:watch": "vitest --config vitest.config.ts"
  }
}
```

**Step 4: Run test command to verify harness works**

Run: `npm run test`
Expected: test runner starts and reports no test files (or passes if files already exist).

**Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add vitest test runner foundation"
```

---

### Task 2: Add regression tests for model sanitization

**Files:**
- Test: `tests/shared/aiModels.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  ALLOWED_MODELS,
  DEFAULT_MODELS,
  sanitizeModelSelection,
} from "../../shared/aiModels";

describe("sanitizeModelSelection", () => {
  it("returns provided model when allowed", () => {
    const model = ALLOWED_MODELS.openai[0];
    expect(sanitizeModelSelection(model, "openai", "solutionModel")).toBe(model);
  });

  it("falls back to provider default when invalid", () => {
    expect(sanitizeModelSelection("invalid", "gemini", "debuggingModel")).toBe(
      DEFAULT_MODELS.gemini.debuggingModel
    );
  });

  it("warns when model is invalid", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    sanitizeModelSelection("invalid", "anthropic", "answerModel");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

**Step 2: Run targeted tests to confirm behavior**

Run: `npm run test -- tests/shared/aiModels.test.ts`
Expected: PASS.

**Step 3: Minimal implementation**

No production code changes unless a test reveals incorrect behavior.

**Step 4: Run full tests**

Run: `npm run test`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/shared/aiModels.test.ts
git commit -m "test: cover model sanitization fallback behavior"
```

---

### Task 3: Add regression tests for conversation state manager

**Files:**
- Test: `tests/electron/ConversationManager.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { ConversationManager } from "../../electron/ConversationManager";

describe("ConversationManager", () => {
  it("trims and stores a message for current speaker", () => {
    const manager = new ConversationManager();
    const message = manager.addMessage("  hello  ");
    expect(message.text).toBe("hello");
    expect(message.speaker).toBe("interviewee");
  });

  it("throws on empty message", () => {
    const manager = new ConversationManager();
    expect(() => manager.addMessage("   ")).toThrow("Message text cannot be empty");
  });

  it("toggles speaker and resets after clear", () => {
    const manager = new ConversationManager();
    manager.toggleSpeaker();
    expect(manager.getCurrentSpeaker()).toBe("interviewer");
    manager.clearConversation();
    expect(manager.getCurrentSpeaker()).toBe("interviewee");
  });

  it("updates an existing message and marks it edited", () => {
    const manager = new ConversationManager();
    const created = manager.addMessage("hello");
    const updated = manager.updateMessage(created.id, " updated ");
    expect(updated).toBe(true);
    expect(manager.getMessages()[0]?.text).toBe("updated");
    expect(manager.getMessages()[0]?.edited).toBe(true);
  });
});
```

**Step 2: Run targeted tests**

Run: `npm run test -- tests/electron/ConversationManager.test.ts`
Expected: PASS.

**Step 3: Minimal implementation**

No production code changes unless uncovered behavior requires bugfix.

**Step 4: Run full tests**

Run: `npm run test`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/electron/ConversationManager.test.ts
git commit -m "test: add conversation manager regression coverage"
```

---

### Task 4: Full verification gates

**Files:**
- Verify-only: all modified files

**Step 1: Run tests**

Run: `npm run test`
Expected: PASS.

**Step 2: Run quality and build gates**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected: all pass.

**Step 3: Commit any final adjustments**

```bash
git add .
git commit -m "chore: verify quality gates after adding tests"
```

(Only if additional small changes are needed.)

---

## Notes for execution

- Keep all changes DRY and YAGNI.
- Avoid coupling tests to implementation details where possible.
- If a test exposes a bug, use `@superpowers:systematic-debugging` before fixing.
- Before claiming completion, use `@superpowers:verification-before-completion` and report actual command results.
