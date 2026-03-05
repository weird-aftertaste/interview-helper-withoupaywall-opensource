# Rounded App Icon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply medium (~16%) rounded corners to the app icon source and regenerate all platform icon artifacts from that source.

**Architecture:** Keep `assets/icons/icon.svg` as the single source of truth. Add a rounded clip path to the SVG container so all existing artwork remains intact while the silhouette changes. Regenerate PNG/ICO/ICNS outputs from the updated SVG so packaging references remain unchanged.

**Tech Stack:** SVG, ImageMagick (`magick`), Electron Builder icon assets, npm scripts.

---

### Task 1: Baseline verification in isolated workspace

**Files:**
- Verify-only: `assets/icons/icon.svg`, `package.json`

**Step 1: Verify worktree and baseline tests**

Run: `npm test`

Expected: PASS baseline (33 tests) before icon changes.

**Step 2: Verify icon output paths used by packaging**

Run: `npm run package-win -- --help` (or inspect `package.json` build icon entries)

Expected: icon paths remain:
- `assets/icons/win/icon.ico`
- `assets/icons/mac/icon.icns`
- `assets/icons/png/icon-256x256.png`

---

### Task 2: Update source SVG with medium rounded corners

**Files:**
- Modify: `assets/icons/icon.svg`

**Step 1: Implement minimal source change**

Wrap existing paths in a clipped group:

```svg
<defs>
  <clipPath id="rounded-corners">
    <rect width="244" height="235" rx="38" ry="38" />
  </clipPath>
</defs>
<g clip-path="url(#rounded-corners)">
  <!-- existing paths unchanged -->
</g>
```

**Step 2: Verify SVG remains valid**

Run: `magick identify assets/icons/icon.svg`

Expected: command succeeds and reports SVG image metadata.

---

### Task 3: Regenerate all derived icon assets

**Files:**
- Modify: `assets/icons/icon-1024.png`
- Modify: `assets/icons/png/icon-256x256.png`
- Modify: `assets/icons/win/icon.ico`
- Modify: `assets/icons/mac/icon.icns`

**Step 1: Regenerate 1024 PNG and 256 PNG**

Run:
- `magick assets/icons/icon.svg -background none -resize 1024x1024 assets/icons/icon-1024.png`
- `magick assets/icons/icon.svg -background none -resize 256x256 assets/icons/png/icon-256x256.png`

Expected: PNG files overwritten with rounded-corner silhouette.

**Step 2: Regenerate ICO and ICNS**

Run:
- `magick assets/icons/icon.svg -background none -define icon:auto-resize=256,128,64,48,32,16 assets/icons/win/icon.ico`
- `magick assets/icons/icon.svg -background none -resize 1024x1024 assets/icons/mac/icon.icns`

Expected: ICO/ICNS files overwritten successfully.

---

### Task 4: Verify outputs and handoff

**Files:**
- Verify-only: changed icon files above

**Step 1: Verify changed files are exactly expected**

Run: `git status --short`

Expected: only `assets/icons/*` files and plan docs changed.

**Step 2: Optional package verification**

Run: `npm run package-win`

Expected: package build completes with updated icon assets.

**Step 3: Commit checkpoint (if requested)**

Run:
- `git add assets/icons/icon.svg assets/icons/icon-1024.png assets/icons/png/icon-256x256.png assets/icons/win/icon.ico assets/icons/mac/icon.icns docs/plans/2026-03-05-icon-rounded-corners-design.md docs/plans/2026-03-05-icon-rounded-corners.md`
- `git commit -m "style(icons): round app icon corners and regenerate assets"`
