# Scrollbar Styling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace default white/gray scrollbars in key in-app panels with a thin glassy scrollbar style consistent with the app's dark interface.

**Architecture:** Implement a scoped CSS class in global stylesheet and apply it only to identified scroll containers first. Use CSS variables for easy tuning and dual browser styling (`::-webkit-scrollbar*` and `scrollbar-width`/`scrollbar-color`) to keep behavior native while improving visuals.

**Tech Stack:** React, TypeScript, Tailwind utility classes, global CSS (`src/index.css`), Electron (Chromium renderer).

---

### Task 1: Add reusable thin glassy scrollbar styles

**Files:**
- Modify: `src/index.css`

**Step 1: Write the failing verification (baseline UI state)**

Run: `npm test`

Expected: Tests pass; confirms baseline is stable before style change.

**Step 2: Add minimal implementation in CSS**

Add to `src/index.css`:
- CSS variables for scrollbar size/colors
- `.pretty-scrollbar` class with:
  - `scrollbar-width: thin`
  - `scrollbar-color` for fallback
  - `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb`, `::-webkit-scrollbar-thumb:hover`, `::-webkit-scrollbar-corner`

Keep `html/body` hidden-scrollbar rules unchanged.

**Step 3: Verify implementation compiles and tests still pass**

Run: `npm test`

Expected: PASS with no test regressions.

**Step 4: Commit checkpoint**

Run:
`git add src/index.css`
`git commit -m "style: add scoped thin glassy scrollbar theme"`

---

### Task 2: Apply style to target scroll containers

**Files:**
- Modify: `src/components/Conversation/ConversationSection.tsx`
- Modify: `src/_pages/Debug.tsx`

**Step 1: Write failing verification (visual baseline)**

Run: `npm run typecheck`

Expected: PASS before JSX class updates.

**Step 2: Minimal implementation in JSX classNames**

Update class names on identified scroll containers to include `pretty-scrollbar`:
- Conversation scroll area div
- Debug analysis scroll area div

Do not alter overflow behavior, sizing logic, or layout classes.

**Step 3: Verify green**

Run:
- `npm run typecheck`
- `npm test`

Expected:
- Typecheck passes
- Tests pass

**Step 4: Commit checkpoint**

Run:
`git add src/components/Conversation/ConversationSection.tsx src/_pages/Debug.tsx`
`git commit -m "style: apply pretty scrollbar to conversation and debug panels"`

---

### Task 3: Final verification and handoff

**Files:**
- Verify-only: files changed above

**Step 1: Full verification**

Run:
- `npm run typecheck`
- `npm test`
- `git status --short`

Expected:
- Typecheck and tests pass
- Only intended files are modified

**Step 2: Optional visual spot-check in app**

Run: `npm run dev`

Expected: Conversation and Debug panel scrollbars render as thin glassy style, no default white/gray bars.

**Step 3: Push branch for review**

Run:
`git push -u myfork feat/pretty-scrollbar`

Expected: Branch available for PR.
