---
name: Prompt Crafter
description: Minimalist engineering IDE
colors:
  primary: "#3b82f6"
  neutral-bg: "#f3f4f6"
  surface: "#ffffff"
  surface-hover: "#f9fafb"
  border: "#e5e7eb"
  text-main: "#111827"
  text-muted: "#6b7280"
typography:
  display:
    fontFamily: '"Inter", sans-serif'
    fontWeight: 600
  body:
    fontFamily: '"Inter", sans-serif'
    fontWeight: 400
  label:
    fontFamily: '"JetBrains Mono", monospace'
    fontWeight: 500
rounded:
  md: "0.375rem"
  lg: "0.5rem"
  full: "9999px"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
---

# Design System: Prompt Crafter

## 1. Overview

**Creative North Star: "Utilitarian IDE"**

The interface is a clean, minimal, functional engineering tool. It rejects all "AI wrapper" tropes—no dark mode by default, no mesh gradients, no noise textures, no neon glows, and no bouncing animations. It looks and acts like standard developer tooling (e.g., Figma nodes, Unreal blueprints, or standard web IDEs).

**Key Characteristics:**
- Flat, clean surfaces with crisp 1px borders.
- Light mode default (or neutral dark gray, but not Vantablack).
- System sans-serif fonts for UI, monospace for data.
- Instant, zero-delay interactions. No heavy animations.

## 2. Colors

Clean, high-contrast, accessible.
- **Background:** Light gray (#f3f4f6) or standard dark gray (#1f2937).
- **Surfaces:** Pure white (#ffffff) or elevated dark (#374151).
- **Accents:** Standard blue (#3b82f6) for primary actions. No purple/indigo neon.

## 3. Typography

**Font:** Inter (or system sans-serif) and JetBrains Mono.
- No extreme tracking (letter-spacing).
- Normal font weights (400 for body, 500/600 for headings).

## 4. Elevation & Motion

- **Shadows:** Standard crisp shadows (e.g., `shadow-sm`, `shadow-md`). No massive diffused glows.
- **Motion:** Instant. 100-150ms opacity/color transitions. **ZERO layout or transform transitions on nodes to prevent drag lag.**

## 5. Do's and Don'ts

- **Do** make nodes feel like solid, reliable blocks.
- **Don't** use `transition-all` on draggable elements (it breaks React Flow dragging).
- **Don't** use mesh gradients, noise filters, or heavy "glassmorphism".
- **Don't** use uppercase tracking for every single label. Keep it readable.
