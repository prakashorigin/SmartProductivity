# SmartProductivity UI/UX system

This document is the implementation-facing companion to [figma-handoff.md](figma-handoff.md). Use it to make visual changes consistent across public, student, and admin screens.

## Principles

- Make the next useful action obvious. Keep task entry short and reveal optional detail in a secondary step.
- Keep the same visual language across desktop, tablet, and mobile. Do not rely on color alone for status.
- Use clear names and dates, predictable navigation, restrained decoration, and honest product claims.
- Every server-backed page must distinguish loading, empty, success, and error states. Errors should include a recovery action when possible.

## Color tokens

| Token | Light value | Dark value | Use |
| --- | --- | --- | --- |
| `primary.50` | `#eff6ff` | `#172554` | Soft selection surface |
| `primary.100` | `#dbeafe` | `#1e3a8a` | Selected badge |
| `primary.500` | `#3b82f6` | `#60a5fa` | Focus and interactive accent |
| `primary.600` | `#2563eb` | `#3b82f6` | Main action, chart series |
| `primary.700` | `#1d4ed8` | `#60a5fa` | Hover action |
| `accent.50` | `#eef2ff` | `#1e1b4b` | Marketing/admin soft surface |
| `accent.600` | `#4f46e5` | `#818cf8` | Indigo highlights and navigation |
| `success.600` | `#16a34a` | `#4ade80` | Completed/success |
| `warning.600` | `#d97706` | `#fbbf24` | Due/attention |
| `danger.600` | `#dc2626` | `#f87171` | Error/destructive |
| `neutral.0` | `#ffffff` | `#111827` | Primary surface |
| `neutral.50` | `#f9fafb` | `#111827` | Page surface |
| `neutral.100` | `#f3f4f6` | `#1f2937` | Secondary surface |
| `neutral.200` | `#e5e7eb` | `#374151` | Border |
| `neutral.500` | `#6b7280` | `#9ca3af` | Secondary text |
| `neutral.700` | `#374151` | `#e5e7eb` | Body text |
| `neutral.900` | `#111827` | `#f9fafb` | Heading text |

Current React classes map blue utilities to `primary` and indigo utilities to `accent`; retain both token families until the code is normalized. Use semantic status tokens for status, not the primary brand color.

## Typography

Use Inter when bundled/available, then Poppins, then system UI. Keep body copy at 14–16 px with 1.5 line height; captions at 12 px; labels at 13–14 px / 600; buttons at 14 px / 600. Screen H1 is 28–32 px; section H2 20–24 px; card H3 16 px. Marketing display is 56 px desktop, 40 px mobile, weight 700, line-height 1.1. Avoid long all-caps paragraphs.

## Spacing, shape, depth

Use a 4 px base and 8 px rhythm: `4, 8, 12, 16, 24, 32, 40, 48, 64, 80`. Form fields and buttons are 44–48 px tall. Cards use 16–24 px internal padding. Standard radius is 12 px; large marketing containers 24–28 px; pills are fully rounded. Use one low-opacity border and a soft shadow; reserve stronger shadows for overlays and the hero preview.

## Navigation and layout

- App header: 64 px high, sticky, logo at left, search and notifications near the right, theme/account controls last.
- Desktop side navigation: 240 px wide, full-height below the header; active item uses a pale primary surface plus a text/icon cue.
- Content: 32 px page padding on wide desktop; 24 px at tablet; 16 px on mobile. Keep content under 1280 px when the page benefits from a centered reading width.
- Mobile app: replace desktop rail with the fixed five-item bottom navigation and reserve safe-area/inset padding. Keep destructive actions above the bottom bar.
- Admin has its own navigation, clearly labeled and visually related to the user workspace.

## Interaction and accessibility

- All controls need visible focus, keyboard access, a programmatic label, and a disabled/loading state.
- Icon-only buttons need an accessible name. Decorative icons are hidden from assistive technology.
- Use inline validation next to fields and one form-level error summary. Preserve user-entered values after a failed request.
- Target at least 44 × 44 px touch areas. Use text + icon/shape to indicate task status, priority, and errors.
- Respect `prefers-reduced-motion`. Timer completion must be perceivable without sound; sound/notifications stay opt-in.
- Chart values need readable labels and a text summary or table equivalent.

## Responsive behavior

| Range | Layout |
| --- | --- |
| `< 640 px` | 4-column rhythm, 16 px side padding, one-column forms/cards, bottom navigation |
| `640–1023 px` | 8-column rhythm, 20–24 px gutters, 2-column cards when content allows |
| `1024–1439 px` | 12-column workspace grid, persistent navigation, two/three-column data panels |
| `≥ 1440 px` | 12-column grid, 1200–1280 px content max, larger surrounding whitespace |

## Page state checklist

Dashboard, tasks, projects, calendar, analytics, notifications, admin lists, and profile data must provide: initial skeleton/loading state; empty state with the next action; readable retry state on failed API requests; success feedback after mutation; disabled controls while a mutation is pending. Auth forms preserve values and show field/form errors. Timer has idle, running, paused, break, completed, and restored-session states.
