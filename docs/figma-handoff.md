# Figma-ready design handoff

No authenticated Figma integration is connected in this workspace, so no `.fig` file or Figma URL is claimed. This specification gives the page order, frame sizes, components, states, and measurements needed to recreate the UI manually.

## File and page structure

Create a Figma file named **SmartProductivity** with these pages in order:

1. `00 · Cover` — logo, tagline, owner, revision date, links to this handoff and the running implementation.
2. `01 · Foundations` — color, typography, spacing, radius, elevation, grid, icon and accessibility references.
3. `02 · Components` — component set and state/size variants below.
4. `03 · Marketing` — landing and pricing.
5. `04 · Authentication` — login, registration, forgot/reset password, verification result.
6. `05 · Workspace` — dashboard, tasks, projects, Pomodoro, analytics, calendar, notifications, profile/settings.
7. `06 · Admin` — overview, users, tasks, subscriptions, analytics, settings, audit logs.
8. `07 · Prototype flows` — prototype maps listed below.

## Required frames

Use viewport frames `1440 × 1024`, `1024 × 1366`, and `390 × 844` for every high-priority screen. Create wide desktop app frames with fixed top bar and side rail; create tablet and mobile variants for landing, dashboard, tasks, Pomodoro, login/register, and admin tables. Complete secondary screens at all three sizes before handoff. Name a frame `Screen / viewport / theme / state`, for example `Tasks / 390×844 / dark / empty`.

Screen inventory: Landing; Pricing; Login; Register; Forgot Password; Reset Password; Verify Email success/expired; Dashboard; Tasks list/empty/filter/create/edit; Projects list/empty/create; Pomodoro idle/running/paused/completed; Analytics empty/populated; Calendar month/week/day; Notifications empty/unread; Profile/default/email unverified/delete confirmation; Admin Overview; Admin Users; Admin Tasks; Admin Subscriptions; Admin Analytics; Admin Settings; Admin Audit Logs.

## Layout grids and measurements

| Frame | Grid | Margins / gutters |
| --- | --- | --- |
| Desktop `1440×1024` | 12 columns | Content max 1280 px, outer margin 80 px at full width, 24 px gutter |
| Tablet `1024×1366` | 8 columns | 32 px margins, 20 px gutter; 224 px app rail |
| Mobile `390×844` | 4 columns | 16 px side padding, 12 px gutter, 64 px bottom navigation plus safe area |

Use 8 px spacing tokens, with 4/12 px exceptions for compact controls. Workspace header is 64 px high. Desktop side rail is 240 px. App page padding is 32 px desktop, 24 px tablet, 16 px mobile. Dashboard cards use 16 px radius and 20–24 px padding. Inputs/buttons are 44–48 px high. Modal max width is 480 px and has 24 px padding. Table row height is 56–64 px; horizontal scrolling is preferred to shrinking essential data below 12 px.

### Dashboard composition

- Keep the 64 px top bar fixed; place 240 px rail below it.
- Main greeting occupies the first 56–72 px. Add 32 px below the greeting before metric cards.
- Metric strip is five equal columns on large desktop (Today's Tasks, Completed, Study Time, Productivity, Streak); collapse to three then two then one column as available width requires.
- Weekly chart spans 7 of 12 columns; deadlines/recent activity spans 5. Today's tasks follow in a full-width section.
- At mobile, stack the metric cards, chart, and tasks. Keep quick actions visible near the greeting and ensure the bottom nav never covers the final card.

### Tasks composition

- Desktop toolbar: title/count at left, search, status/priority/project filters, sort, then primary `New task` action.
- List/board switch sits beside sort. Use task rows/cards with title, due date, project, priority/status, estimate, and row menu.
- Create/edit modal uses a two-column details area on desktop and one column on mobile. Keep title first; place destructive delete in a separate danger zone.
- Empty filters offer `Clear filters`; first-run empty state offers `Create your first task`.

### Pomodoro composition

- Center timer module max width 720 px; place mode tabs above it, timer digits at 88 px desktop / 64 px mobile, controls below.
- Task picker, custom duration and focus options form a 360 px side panel on desktop, below timer on mobile.
- Running, paused, break, session complete, restored state, and notification permission states need separate variants.

### Analytics composition

- Put date range and export action in the screen toolbar.
- Summary metrics use a four-column strip. Weekly study-time chart and task completion chart use equal two-column panels; project and priority distributions follow.
- Empty charts use a concise explanation and link to add a task/start focus. Supply a visible table or summarized values in the accessibility variant.

### Admin composition

- Use the same neutral and primary tokens with a distinct `Platform administration` label and an admin rail.
- Admin overview uses eight metric cards: users, active users, new users, total tasks, completed tasks, focus hours, active subscriptions, monthly recurring revenue.
- Tables contain search, filters, sort affordance, pagination, selection/bulk action area when supported, and row actions with a confirmation state for destructive actions.
- At 390 px, keep filters stacked, use horizontally scrollable tables with sticky first column, and use full-width confirmation dialogs.

## Variables / tokens

Create Figma variable collections `Color / Light`, `Color / Dark`, `Spacing`, `Radius`, and `Elevation`. Use the exact values in [ui-ux.md](ui-ux.md). Key implementation matches: `primary.600 #2563EB` ↔ Tailwind `blue-600`; `accent.600 #4F46E5` ↔ `indigo-600`; success `#16A34A`; warning `#D97706`; danger `#DC2626`; surface `#FFFFFF / #111827`; background `#F9FAFB / #111827`; border `#E5E7EB / #374151`. Add semantic text and muted surface variants; never use white text on a pale accent.

Typography styles: Display 56/62 bold; H1 32/40 semibold; H2 24/32 semibold; H3 18/26 semibold; body large 16/24 regular; body 14/21 regular; body small 13/19 regular; caption 12/16; label/button 14/20 semibold. Inter → Poppins → system UI.

## Reusable components and variants

Build components with Auto Layout, constraints, and named properties. Use variants instead of separate copies.

| Component | Variants/properties |
| --- | --- |
| Button | Primary / Secondary / Tertiary / Destructive; sm/md/lg; default/hover/focus/pressed/disabled/loading; leading/trailing icon |
| Field | Text/email/password/search/textarea; default/focus/filled/error/disabled; label/helper/error; password visible/hidden |
| Select | default/open/selected/error/disabled; single and searchable |
| Checkbox/radio/switch | unchecked/checked/indeterminate or on/off; focus/disabled |
| Card | default/interactive/selected/disabled; compact/regular; light/dark |
| Badge | neutral/primary/success/warning/danger; sm/md; icon optional |
| Task item | list/board; todo/in-progress/completed; low/medium/high/urgent; due/overdue; selected |
| Modal/dialog | default/destructive/confirmation; compact/regular; open/closing |
| Tabs | selected/unselected; horizontal/scrollable |
| Toast/alert | success/info/warning/error; dismissible; loading |
| Table | default/loading/empty/error; sortable header; selected row; responsive overflow |
| Pagination | first/middle/last/disabled |
| Navigation item | inactive/active/hover/focus; icon-only/with label |
| Chart panel | populated/loading/empty/error; light/dark; accessible data summary |
| Timer | focus/short break/long break; idle/running/paused/complete/restored |

## Required states and accessibility handoff

Make visible focus rings, keyboard order, label-to-input association, icon-only button names, disabled/loading feedback, inline errors, and destructive confirmation. Verify text contrast at WCAG AA; target 4.5:1 for regular text and 3:1 for large text/meaningful controls. Do not communicate status using hue alone. Include reduced-motion variants and a text equivalent for charts.

## Prototype maps

**Authentication:** Landing → Register → Dashboard; Landing → Login → Dashboard; Login → Forgot Password → Reset Password → Login; Register/Profile → Verification email state → Verified result.

**Task:** Dashboard quick add → task create → task detail/edit → mark complete → completion feedback; Tasks filters → clear filters → result list.

**Focus:** Pomodoro idle → choose task/mode → running → pause/resume → complete → session history/notification.

**Subscription:** Pricing → choose plan → hosted Stripe Checkout placeholder frame → success/cancel return state → profile billing link.

**Admin:** Login as admin → overview → users/task/subscription table → filter/paginate → action confirmation → updated row; superadmin → role change/audit log.

## Figma-to-code map

| Figma component/frame | Runtime implementation |
| --- | --- |
| Marketing / landing | `frontend/src/pages/Landing.jsx` |
| Workspace shell / header / rail | `frontend/src/components/Layout.jsx`, `Navbar.jsx`, `Sidebar.jsx` |
| Admin shell | `frontend/src/components/AdminLayout.jsx` |
| Task card / forms | `frontend/src/components/TaskCard.jsx`, `frontend/src/pages/Tasks.jsx` |
| Timer | `frontend/src/components/PomodoroTimer.jsx` |
| Login/register/password reset | `frontend/src/pages/Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx` |
| Analytics | `frontend/src/pages/Analytics.jsx` and `frontend/src/pages/AdminWorkspace.jsx` |
| Theme tokens | `frontend/src/index.css` plus Tailwind utility classes |

## Manual build checklist

1. Create the pages, variable collections, and text styles above.
2. Build button, field, badge, task, modal, table, navigation, chart, and timer component sets first.
3. Compose the desktop screens from components, then use Auto Layout and constraints to make tablet/mobile variants.
4. Add dark variants by assigning dark variables; do not invert a flattened screenshot.
5. Add all loading/empty/error/confirmation variants and connect prototype flows.
6. Compare against the React implementation at the exact viewport sizes and record intentional deviations in the handoff page.
