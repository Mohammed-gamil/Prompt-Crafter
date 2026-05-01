---
name: Prompt Crafter
description: Vanguard Neural Architecture prompt compiler
colors:
  primary: "#4f46e5"
  primary-light: "#6366f1"
  neutral-bg: "#050505"
  ink-900: "#08080a"
  ink-800: "#0c0c10"
  ink-700: "#121218"
typography:
  display:
    fontFamily: '"Geist", "Inter Variable", sans-serif'
    fontWeight: 900
    letterSpacing: "tighter"
  body:
    fontFamily: '"Geist", "Inter Variable", sans-serif'
    fontWeight: 400
  label:
    fontFamily: '"Geist Mono", "JetBrains Mono", monospace'
    fontWeight: 900
    letterSpacing: "0.2em"
rounded:
  md: "0.375rem"
  full: "9999px"
  2xl: "1rem"
  3xl: "1.5rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "0.5rem 1.5rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-light}"
---

# Design System: Prompt Crafter

## 1. Overview

**Creative North Star: "Vanguard Neural Architecture"**

The interface is an ethereal, high-end engineering laboratory. It utilizes deep OLED blacks (Vantablack), subtle radial mesh gradients, and a microscopic noise texture overlay to break digital flatness. It explicitly rejects the generic "AI wrapper" aesthetic, replacing it with a cinematic, haptic, spatial rhythm.

**Key Characteristics:**
- Deep, physical haptics via "Double-Bezel" (Doppelrand) nested enclosures.
- Cinematic "Floating Island" spatial arrangements.
- Ultra-precise, microscopic typography for technical labels.
- Spring-physics motion choreography.

## 2. Colors

Deep OLED voids punctuated by intense, focused neural accents.

### Primary
- **Neural Indigo** (#4f46e5): Used for primary execution actions and high-focus states.
- **Pulse Violet** (#6366f1): Hover states and active glow indicators.

### Neutral
- **Vantablack Void** (#050505): The absolute edge-to-edge canvas background.
- **Machined Ink** (#08080a): The inner core of floating islands and double-bezel nodes.
- **Glass Shell** (rgba(255,255,255,0.03)): The translucent outer boundary of floating components.

**The Tactical Contrast Rule.** Neutrals must remain strictly desaturated near-blacks. Pure white is reserved for high-emphasis typography.

## 3. Typography

**Display Font:** Geist (with Inter Variable)
**Body Font:** Geist (with Inter Variable)
**Label/Mono Font:** Geist Mono (with JetBrains Mono)

**Character:** Swiss-print precision meets mechanical terminal output.

### Hierarchy
- **Display** (Black, tighter): Used for island headers (e.g., "CRAFTER").
- **Body** (Medium, normal): Used for node descriptions and standard text.
- **Label** (Black, uppercase, 0.2em tracking): Used for microscopic badges, technical ports, and trailing buttons.

**The Micro-Precision Rule.** Technical data and statuses must be rendered in ultra-tracked, uppercase mono to feel like machine output.

## 4. Elevation

Elevation is cinematic and spatial, relying on heavy, diffused shadow volumes and true nested borders rather than flat 1px lines.

### Shadow Vocabulary
- **Island Levitation** (`0 32px 64px -16px rgba(0,0,0,0.6)`): Placed under floating structural islands (Sidebar, TestPanel).
- **Bezel Inset** (`inset 0 1px 1px rgba(255,255,255,0.1)`): Applied to the inner core of double-bezel containers for glass refraction.

**The Double-Bezel Rule.** Premium containers never sit flat. They require an outer translucent shell with a hairline border and an inner opaque core.

## 5. Components

### Buttons
- **Shape:** Perfect pills (rounded-full).
- **Primary:** Neural Indigo background, white text, uppercase tracked labels.
- **Hover / Focus:** Scale down slightly (active:scale-95), hover scale up nested icons, spring transition.

### Cards / Containers (Floating Islands)
- **Corner Style:** Concentric large radii (e.g., 1.5rem outer, 1.25rem inner).
- **Background:** Outer glass shell (bg-white/3) with inner Machined Ink core (bg-ink-900).
- **Shadow Strategy:** Island Levitation for depth, Bezel Inset for material thickness.

### Navigation / Sidebar
- **Style:** Detached from viewport edges, acting as an autonomous control module.

## 6. Do's and Don'ts

### Do:
- **Do** use the Double-Bezel nested architecture for all new modular panels.
- **Do** employ `var(--ease-vanguard)` for all state transitions to maintain heavy, spring-like physical motion.
- **Do** track out uppercase labels extensively (e.g., `tracking-[0.2em]`).

### Don't:
- **Don't** use generic SaaS templates or flat card grids.
- **Don't** apply `border-left` or `border-right` greater than 1px as a colored stripe on cards.
- **Don't** use standard `linear` or `ease-in-out` transitions.
- **Don't** attach sidebars or navbars flush to the screen edges if they can float.
