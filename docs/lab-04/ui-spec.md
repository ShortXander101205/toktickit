# TokTickIT Sprint 4 (Lab 4) — UI & Design System Specification

**Document Status**: Official UI Design Specification  
**Target Sprint**: TokTickIT Lab 4 (Sprint 4) — Actions Taken, Dashboards, Workflow Resolution Gate, and Final Regression  
**Base Branch**: `lab4-staging`  
**Active Branch**: `feature/17-spec-and-tests`  
**Traceability References**: [SE+Lab+4.pdf](../reference/SE+Lab+4.pdf) (§7, §8, §14), [TokTickIT-System-Level-SDS-v1.0.pdf](../reference/TokTickIT-System-Level-SDS-v1.0.pdf) (§8, p. 13-14), [line-item-section.pdf](../ui/line-item-section.pdf)

---

## 1. Design System & Theme Tokens

The application visual identity strictly follows the KMUTT **Zen Green** design language established in Lab 2 and Lab 3, supplemented with accessible secondary accents for operational alerts, workflow states, and data visualization.

### 1.1 CSS Color Tokens (`client/src/index.css` or `:root`)

```css
:root {
  /* KMUTT Zen Green Master Palette */
  --color-primary-green: #006B3C;        /* Brand header, primary action buttons, main headings */
  --color-secondary-green: #0B7A46;      /* Active tabs, interactive links, focused form borders */
  --color-pale-green: #EAF6EF;           /* Subtle card surfaces, selected row highlights, pill backgrounds */
  --color-page-bg: #F5F7F6;              /* Soft, quiet page backdrop */
  --color-surface-card: #FFFFFF;         /* Crisp white container surfaces and modals */

  /* KMUTT Secondary & Operational Accents */
  --color-kmutt-orange: #FA4616;         /* Brand accent, urgent status highlight */
  --color-kmutt-yellow: #FFC72C;         /* Warning surfaces, attention focus */
  --color-kmutt-blue-grey: #7B8189;      /* Subtle borders, secondary icons, metadata */
  --color-interactive-orange: #8A2608;   /* Accessible dark orange for high-contrast links */

  /* Line-Item & Actions Taken Specific Tokens */
  --color-action-item-border: #D1D5DB;   /* Action card / table row border */
  --color-action-item-hover: #F0FDF4;    /* Light green highlight on table row hover */
  --color-action-performer-bg: #E0E7FF;  /* Soft indigo badge for automated performer */
  --color-action-performer-text: #3730A3;/* High-contrast indigo text for performer */
  --color-followup-alert-bg: #FEF3C7;    /* Amber surface when follow-up is required */
  --color-followup-alert-text: #92400E;  /* Amber text for follow-up badge */

  /* Functional Status & Feedback Tokens */
  --color-text-primary: #1F2937;         /* Charcoal body text (14px/400) */
  --color-text-muted: #5B6573;           /* Secondary labels, timestamps, metadata (12px) */
  --color-field-bg: #FFFFFF;             /* Editable field background */
  --color-field-border: #D1D5DB;         /* Input border default */
  --color-field-readonly-bg: #F9FAFB;    /* Read-only background */
  --color-field-error-border: #DC2626;   /* Validation error red border */
  --color-field-error-bg: #FEF2F2;       /* Validation error red background */

  /* Semantic State Badges */
  --color-status-new: #3B82F6;           /* Blue for NEW */
  --color-status-open: #0284C7;          /* Sky blue for OPEN */
  --color-status-inprogress: #D97706;    /* Amber for IN_PROGRESS */
  --color-status-waiting: #8B5CF6;       /* Violet for WAITING_FOR_REQUESTER */
  --color-status-resolved: #16A34A;      /* Emerald for RESOLVED */
  --color-status-closed: #4B5563;        /* Slate for CLOSED */
  --color-status-reopened: #EA580C;      /* Orange for REOPENED */
  --color-status-cancelled: #9CA3AF;     /* Gray for CANCELLED */

  /* Shadows, Outlines & Radius */
  --focus-ring: 0 0 0 3px rgba(11, 122, 70, 0.25);
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-modal: 0 10px 25px rgba(0, 0, 0, 0.15);
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

---

## 2. Layouts & Screen Component Specifications

### 2.1 IT Staff Operational Dashboard (`/staff/dashboard`)

```
+-----------------------------------------------------------------------------------------------+
| [TokTickIT]   Dashboard (Active)   Ticket Queue   + Create Ticket                  [Michael C. v] |
+-----------------------------------------------------------------------------------------------+
|                                                                                               |
|  Welcome back, Michael!                                                 [ Refresh Dashboard ] |
|  Here's what's happening with your queue today.                                               |
|                                                                                               |
|  +---------------+  +---------------+  +---------------+  +---------------+  +---------------+|
|  | New           |  | Open          |  | In Progress   |  | Waiting Req   |  | My Assigned   ||
|  | 14            |  | 23            |  | 18            |  | 7             |  | 16            ||
|  | +2 from y'day |  | -1 from y'day |  | +1 from y'day |  | +0 from y'day |  | +4 from y'day ||
|  +---------------+  +---------------+  +---------------+  +---------------+  +---------------+|
|                                                                                               |
|  +------------------------------------------------------+  +---------------------------------+|
|  | My Recent Tickets                           View All |  | Quick Actions                   ||
|  |------------------------------------------------------|  |---------------------------------||
|  | TKT-2026-00234  Laptop battery drains fast  [In Prog]|  | [+] Create Ticket               ||
|  |                 Updated May 12, 09:14 AM             |  |     Submit a new service ticket ||
|  | TKT-2026-00230  Printer queue offline       [Open]   |  |                                 ||
|  |                 Updated May 10, 02:15 PM             |  | [Q] Search Tickets              ||
|  | TKT-2026-00228  Outlook freezing            [In Prog]|  |     Quick lookup by number/text ||
|  |                 Updated May 8, 05:22 PM              |  |                                 ||
|  | TKT-2026-00215  VPN disconnects randomly    [Resolved|  | [=] My Ticket Queue             ||
|  |                 Updated May 8, 04:15 PM              |  |     View all assigned tickets   ||
|  +------------------------------------------------------+  +---------------------------------+|
+-----------------------------------------------------------------------------------------------+
```

#### Component Specifications:
1. **Welcome Header**:
   - Title: `Welcome back, {User Name}!` (24px/700, `#1F2937`).
   - Subtitle: `Here's what's happening with your queue today.` (14px/400, `#5B6573`).
   - Refresh Action: `Refresh Dashboard` button with SVG sync icon. Triggers re-fetch and displays busy indicator during load.
2. **Operational Metric Cards (Grid of 5 cards)**:
   - Cards: `New`, `Open`, `In Progress`, `Waiting for Requester`, `My Assigned`.
   - Card Display: Large count figure (32px/700), descriptive label (14px/600), trend comparison text (`+2 from yesterday` in 12px/400).
   - Interaction: Clicking any metric card drills down to `/staff/tickets` with that filter pre-applied (e.g., clicking "New" navigates to `/staff/tickets?status=NEW`).
   - Hover state: Elevation rises (`--shadow-modal`), border turns `--color-secondary-green`.
3. **My Recent Tickets (Left Panel, 65% width on desktop)**:
   - Displays up to 5 recently updated tickets assigned to or created by the staff user.
   - Each item includes: Ticket Number (link to detail), Summary, Status badge, and formatted timestamp.
   - Header action: `View All` link navigating to the full ticket queue.
4. **Quick Actions (Right Panel, 35% width on desktop)**:
   - Action cards with icons: `Create Ticket`, `Search Tickets`, `My Queue`.
   - Accessible keyboard-operable cards with large touch targets ($\ge 44\text{px}$).

---

### 2.2 Requester Operational Dashboard (`/dashboard`)

```
+-----------------------------------------------------------------------------------------------+
| [TokTickIT]   Dashboard (Active)   My Tickets   + Create Ticket                   [Jennifer P. v] |
+-----------------------------------------------------------------------------------------------+
|                                                                                               |
|  Welcome, Jennifer!                                                     [ Refresh Dashboard ] |
|  Here's the latest on your support requests.                                                  |
|                                                                                               |
|  +-------------------+  +-------------------+  +-------------------+  +---------------------+ |
|  | My Open Tickets   |  | In Progress       |  | Resolved          |  | Closed              | |
|  | 3                 |  | 2                 |  | 5                 |  | 12                  | |
|  | View all ->       |  | View all ->       |  | View all ->       |  | View all ->         | |
|  +-------------------+  +-------------------+  +-------------------+  +---------------------+ |
|                                                                                               |
|  +------------------------------------------------------+  +---------------------------------+|
|  | My Recent Tickets                           View All |  | Quick Actions                   ||
|  |------------------------------------------------------|  |---------------------------------||
|  | TKT-2026-00234  Laptop battery drains fast  [In Prog]|  | [+] Create Ticket               ||
|  |                 Updated May 12, 09:14 AM             |  |     Submit a new support ticket ||
|  | TKT-2026-00222  Request software access     [Resolved|  |                                 ||
|  |                 Updated May 11, 02:30 PM             |  | [=] View My Tickets             ||
|  | TKT-2026-00213  Need second monitor         [Waiting]|  |     Track your existing requests||
|  |                 Updated May 9, 11:05 AM              |  +---------------------------------+|
|  +------------------------------------------------------+                                     |
+-----------------------------------------------------------------------------------------------+
```

#### Component Specifications:
1. **Welcome Header**:
   - Title: `Welcome, {User Name}!` (24px/700).
   - Subtitle: `Here's the latest on your support requests.` (14px/400).
2. **Requester Metric Cards (Grid of 4 cards)**:
   - Cards: `My Open Tickets`, `In Progress`, `Resolved`, `Closed`.
   - Card Display: Large count figure (32px/700), label (14px/600), and `View all ->` drill-down link.
   - Drill-down: Navigates to `/my-tickets?status={STATUS}`.
   - Scope Protection: Backend strictly ensures only tickets owned by the current requester are returned.
3. **My Recent Tickets**:
   - List of up to 5 recently updated tickets owned by the requester.
   - Displays Ticket Number, Summary, Status badge, and timestamp.
4. **Quick Actions**:
   - Direct shortcuts to `Create Ticket` and `View My Tickets`.

---

### 2.3 Actions Taken Subsystem on Ticket Detail Screen

The Actions Taken subsystem is implemented as a dedicated section/tab on the IT Staff Ticket Detail page, adhering to the course **Line Item UI specification** ([`line-item-section.pdf`](../ui/line-item-section.pdf)).

#### 2.3.1 Actions Taken Section Header & Toolbar
- **Tab/Section Title**: `Actions Taken` with counter badge (e.g., `Actions Taken (3)`).
- **Upper Right Action Button**: `+ Add Action Taken` button with Zen Green styling and tooltip `"Record a technical action taken on this ticket"`. Visible only to `IT_STAFF` and `ADMINISTRATOR`.

#### 2.3.2 Actions Taken Table View (Desktop & Tablet)
```
+-------------------------------------------------------------------------------------------------------------------------+
| Actions Taken (2)                                                                                   [+ Add Action Taken]|
|-------------------------------------------------------------------------------------------------------------------------|
| No. | Date / Time       | Performed By  | Description                   | Result                | Follow-up | Actions   |
|-----|-------------------|---------------|-------------------------------|-----------------------|-----------|-----------|
|  1  | 2026-05-12 10:30  | [Michael C.]  | Ran battery diagnostic test   | Battery health 42%    | [Yes]     | [Edit]    |
|     |                   |               |                               | Needs replacement     | Note: Ord |           |
|  2  | 2026-05-12 14:15  | [Sarah J.]    | Installed replacement battery | Diagnostic passed 100%| [No]      | [Edit]    |
+-------------------------------------------------------------------------------------------------------------------------+
```

- **Row Styling**: Alternating light/dark shades (`#FFFFFF` and `#F9FAFB`).
- **Ordered Item Number (`No.` column)**: Preserves chronological order (1, 2, ...).
- **Performed By (Automated)**: Rendered as a soft indigo badge with user name. Non-editable.
- **Follow-up Badge**:
  - If `Yes`: Amber badge (`#FEF3C7` / `#92400E`) showing `"Follow-up Required"`, with the `followUpNote` displayed in italicized text underneath.
  - If `No`: Subtle muted badge (`#F3F4F6` / `#4B5563`) showing `"None"`.
- **Attachment Notes**: Displayed below the result in smaller muted text if present (e.g., `"See attached: battery_report.pdf"`).
- **Edit Action**: `Edit` button with pencil icon. Opens the Action Taken editor modal.

#### 2.3.3 Actions Taken Create & Edit Modal / Form
When clicking `+ Add Action Taken` or `Edit`, an accessible modal dialog opens:

```
+-------------------------------------------------------------------------------+
|  Record Action Taken                                                      [X] |
|-------------------------------------------------------------------------------|
|                                                                               |
|  * Action Date & Time                      Performed By (Auto)                |
|  [ 2026-05-12T14:15                 [cal] ] [ Michael Chen (IT Staff)       ] |
|                                                                               |
|  * Action Description (min 5 chars)                                           |
|  +-------------------------------------------------------------------------+  |
|  | Ran hardware diagnostic battery test and checked motherboard sensors.   |  |
|  +-------------------------------------------------------------------------+  |
|  68 / 1000 characters                                                         |
|                                                                               |
|  * Result (min 2 chars)                                                       |
|  +-------------------------------------------------------------------------+  |
|  | Battery degradation confirmed at 42%. Replacement cell required.        |  |
|  +-------------------------------------------------------------------------+  |
|  65 / 1000 characters                                                         |
|                                                                               |
|  [x] Follow-Up Required?                                                      |
|                                                                               |
|  * Follow-Up Note (Required when follow-up is checked)                        |
|  +-------------------------------------------------------------------------+  |
|  | Order OEM replacement battery pack and schedule fitting tomorrow.       |  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
|  Attachment Notes (Optional)                                                  |
|  [ battery_report.pdf uploaded in Attachments section                       ] |
|                                                                               |
|-------------------------------------------------------------------------------|
|                                                 [ Cancel ]  [ Save Action ]   |
+-------------------------------------------------------------------------------+
```

#### Form Controls & Interactive Validation:
1. **Required Fields Indicator**: Mandatory fields feature a leading red asterisk (`*`) in `#DC2626`.
2. **Action Date & Time**: Defaults to current local date/time. Validated to prevent future timestamps.
3. **Performed By**: Read-only disabled field with soft creamish/gray background (`#F9FAFB`), displaying current authenticated user's name and role.
4. **Action Description**: Textarea with character counter (5–1000 chars).
5. **Result**: Textarea with character counter (2–1000 chars).
6. **Follow-Up Required Toggle / Checkbox**:
   - When unchecked: `Follow-Up Note` field is hidden or disabled.
   - When checked: `Follow-Up Note` field dynamically expands with a leading red `*`. Submitting with an empty note displays a red border and tooltip error message: *"Follow-up note is required when follow-up is needed"*.
7. **Attachment Notes**: Single-line text input (max 255 chars) indicating which file to look for.
8. **Save & Cancel**:
   - Primary `Save Action` button in Zen Green (`#006B3C`). Shows loading spinner during save.
   - Secondary `Cancel` button dismisses modal without changes.

---

### 2.4 Ticket Status Workflow Controls & Resolution Gate Feedback

Located on the IT Staff Ticket Detail sidebar:

```
+-------------------------------------------------+
| Operational Controls                            |
|-------------------------------------------------|
| Current Status: [ In Progress ]                 |
|                                                 |
| Transition Status To:                           |
| [ Resolved                                  v ] |
|                                                 |
| ( ! ) Resolution Gate Warning:                  |
| Cannot resolve ticket: 1 Action Taken requires  |
| unresolved follow-up. Please complete or update |
| the action before resolving.                    |
|                                                 |
| [ Update Status (Disabled) ]                    |
+-------------------------------------------------+
```

#### Resolution Gate UI Rules:
1. **Permitted Status Filter**: The status dropdown displays **only** legal next statuses from the current status according to the state transition matrix.
2. **Dynamic Incomplete Action Inspection**:
   - If user selects `Resolved` or `Closed` while open/incomplete actions exist, the UI immediately shows an amber warning callout (`--color-warning-bg` and `--color-warning` text) and disables the `Update Status` button.
   - If the backend returns HTTP `409 Conflict` (e.g. via direct API call), the UI presents a safe error banner: *"Ticket cannot be resolved while actions taken remain incomplete."*
3. **Terminal Confirmation Modal**: Transitioning to `Resolved`, `Closed`, or `Cancelled` prompts a confirmation dialog requiring confirmation before sending the request.

---

## 3. Responsive Breakpoints & Zero-Scroll Layouts

The application strictly implements 3 standard responsive breakpoints with **zero horizontal page scroll**:

| Viewport Tier | Width Range | Layout Adaptation Rules |
| :--- | :--- | :--- |
| **Desktop** | $\ge 1200\text{px}$ | • Multi-column grids (5 metric cards on staff dashboard; 4 on requester).<br/>• Full 7-column Actions Taken table with sorting and action buttons.<br/>• Split 65% / 35% two-column Ticket Detail layout. |
| **Tablet** | $768\text{px} - 1024\text{px}$ | • Metric cards wrap into a 2x3 or 2x2 grid with equal spacing.<br/>• Actions Taken table condenses column padding; non-critical metadata folds into expander.<br/>• Ticket Detail stacks sidebar operational controls underneath ticket contents. |
| **Mobile** | $< 768\text{px}$ | • Metric cards stack into 1-column or 2-column cards.<br/>• **Actions Taken Table converts to stacked cards**: Each action renders as a self-contained Zen Green card with date, performer badge, description, result, and follow-up status.<br/>• Full-width touch buttons ($\ge 44\text{px}$ touch targets). Zero horizontal scroll. |

---

## 4. Component Feedback States & Accessibility (WCAG 2.2 AA)

### 4.1 Component Feedback States
1. **Loading State**: Content areas render subtle skeleton placeholders in `#E5E7EB` with CSS pulse animation. Refresh buttons display spinning indicator.
2. **Empty State**:
   - Staff Queue / Dashboard with 0 tickets: Centered icon with text *"No tickets currently require attention."*
   - Actions Taken with 0 records: Informative placeholder *"No actions have been recorded yet. Click '+ Add Action Taken' to log work."*
3. **Validation Errors**: Per [`line-item-section.pdf`](../ui/line-item-section.pdf), invalid input fields display a crisp red border (`#DC2626`) and an attached tooltip-style error badge positioned below the field.
4. **Concurrency Conflict Banner**: When HTTP `409 Conflict` is encountered, a top-level alert banner appears with *"This ticket was modified by another user. Please refresh to load the latest changes."* and a direct `Refresh` button.

### 4.2 Accessibility Checklist (WCAG 2.2 AA)
- [x] **Color Contrast**: All text against background meets or exceeds 4.5:1 ratio (e.g., `#006B3C` on white is 5.2:1; dark orange `#8A2608` is 6.8:1).
- [x] **Non-Color Status Cues**: Every status badge pairs color with a clear text label and distinct icon (e.g., checkmark for Resolved, clock for Waiting).
- [x] **Keyboard Navigation**: All interactive elements (metric drill-downs, action table rows, modals, forms) are reachable and operable via `Tab`, `Space`, `Enter`, and `Escape`.
- [x] **Visible Focus Indicator**: Focus rings use `--focus-ring` (3px outline `#0B7A46` with 25% opacity) on all focused interactive elements.
- [x] **Semantic HTML**: Proper use of `<main>`, `<header>`, `<nav>`, `<section>`, `<table>`, `<button>`, and `<dialog>`.
- [x] **Screen Reader Support**: ARIA attributes `aria-label`, `aria-live="polite"`, `aria-expanded`, and `aria-modal="true"` are applied to all dynamic widgets and dialogs.

