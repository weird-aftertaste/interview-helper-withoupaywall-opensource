# Rounded App Icon Design

## Context

The app icon assets are generated from `assets/icons/icon.svg` and consumed by packaging targets via:

- `assets/icons/win/icon.ico`
- `assets/icons/mac/icon.icns`
- `assets/icons/png/icon-256x256.png`

The current source icon fills the full canvas with square corners, which appears rigid in app surfaces.

## Goal

Add medium rounded corners (~16%) to the icon silhouette while preserving the existing artwork and colors.

## Non-goals

- Redesigning internal icon artwork.
- Changing app branding colors.
- Altering package configuration paths.

## Design

### 1) Source-of-truth change in SVG

Apply rounding directly in `assets/icons/icon.svg` by clipping all existing paths using a rounded rectangle clip path.

- Use a rounded rectangle that matches the full viewBox size.
- Set corner radius to approximately 16% of the shorter side.
- Keep all icon path data unchanged.

### 2) Regenerate all derived icon assets

Rebuild icon binaries/images from the updated SVG so all platforms share the same rounded silhouette:

- `assets/icons/icon-1024.png`
- `assets/icons/png/icon-256x256.png`
- `assets/icons/win/icon.ico`
- `assets/icons/mac/icon.icns`

### 3) Verify packaging inputs are intact

Confirm file paths referenced by `package.json` remain unchanged and only icon content is updated.

## Success criteria

- Icon corners are visibly rounded at medium strength.
- Windows/macOS/PNG assets are regenerated from the updated SVG.
- Packaging config continues to point to the same asset paths.
