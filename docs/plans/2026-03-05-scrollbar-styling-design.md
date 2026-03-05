# Scrollbar Styling Design

## Context

The app currently hides only page-level scrollbars (`html`, `body`) in `src/index.css` to avoid transient root scrollbar flashes.
Scrollable panels inside the app still use the browser default scrollbar, which appears as white/gray in the current dark UI.

## Goal

Introduce a refined, dark-theme-compatible scrollbar style for key in-app scrollable panels so the UI feels intentional and visually consistent.

## Non-goals

- Replacing native scrollbar behavior with a custom JavaScript scrollbar component.
- Global restyling of every scrollable element in the app in a single pass.
- Changing existing layout, spacing, or scrolling logic.

## Design

### 1) Scoped class-based styling

Add a reusable CSS class (`pretty-scrollbar`) in `src/index.css` and apply it only where needed first:

- `src/components/Conversation/ConversationSection.tsx`
- `src/_pages/Debug.tsx`

This keeps risk low and prevents unexpected style changes in unrelated surfaces.

### 2) Thin glassy visual language

Define CSS variables for scrollbar tokens:

- size
- track color
- thumb base color
- thumb hover color
- corner color

Use a rounded, semi-transparent track and a subtle frosted thumb that brightens slightly on hover/active.

### 3) Browser support strategy

Use dual styling paths:

- Chromium/Electron: `::-webkit-scrollbar*` selectors
- Standards fallback: `scrollbar-width` and `scrollbar-color`

This preserves behavior while improving presentation on supported engines.

### 4) Safety and maintainability

- Keep existing `html/body` hidden-scrollbar rules unchanged.
- Keep all new styles under one named class and variables for easy tuning.
- Avoid animations or effects that add GPU/compositing cost.

## Success criteria

- Conversation and Debug scroll areas no longer show default white/gray bars.
- Scrollbar remains thin, visible enough to discover, and consistent with dark UI.
- No regressions in scrolling behavior or layout.
