# TokTickIT Sprint 2 (Lab 2) — UI & Design System Specification

This document defines the authoritative user interface, styling, responsive behavior, component states, and accessibility specifications for **TokTickIT Lab 2 (Sprint 2)**.

All specifications incorporate the approved decisions from the UI Decision Register (**DEC-UI-01 through DEC-UI-20**), strictly adhering to **TokTickIT-System-Level-SDS-v1.0.pdf** and **Lab_02_labsheet.pdf** (Section 7 and Appendix C).

---

## 1. Design System & Theme Tokens

TokTickIT implements KMUTT's official brand identity customized into the **Zen Green** visual language for the Requester ticketing portal.

### 1.1 CSS Color Tokens (`client/src/index.css` or `:root`)

```css
:root {
  /* KMUTT Zen Green Palette */
  --color-primary-green: #006B3C;      /* Header, primary actions, strong emphasis */
  --color-secondary-green: #0B7A46;    /* Active tabs, focus accents, links, hover */
  --color-pale-green: #EAF6EF;         /* Selected items, success surfaces, soft accents */
  --color-page-bg: #F5F7F6;            /* Quiet near-white application background */
  --color-surface-card: #FFFFFF;       /* White cards, tables, panels */

  /* KMUTT Secondary Brand Accents */
  --color-kmutt-orange: #FA4616;       /* Brand badge / active highlight */
  --color-kmutt-yellow: #FFC72C;       /* Focus accent / warning surface */
  --color-kmutt-blue-grey: #7B8189;    /* Borders, icons, decorative elements */
  --color-interactive-orange: #8A2608; /* Dark orange for high-contrast links */

  /* Functional & State Tokens */
  --color-text-primary: #1F2937;       /* Dark charcoal-green (not pure black) */
  --color-text-muted: #5B6573;         /* Secondary labels, helper text, metadata */
  --color-field-bg: #FFFFFF;           /* Editable input background */
  --color-field-border: #D1D5DB;       /* Neutral input border (gray-300) */
  --color-field-readonly-bg: #F5F7F6;  /* Soft gray-green read-only background */
  --color-field-readonly-border: #E5E7EB;

  --color-success: #2E7D32;            /* Completed / success indicators */
  --color-warning: #B26A00;            /* Attention / warning badge text */
  --color-warning-bg: #FFF8E1;         /* Warning surface */
  --color-danger: #B3261E;             /* Destructive actions, validation errors */
  --color-danger-bg: #FDF2F2;          /* Error alert background */

  /* Focus & Elevation */
  --focus-ring: 0 0 0 3px rgba(11, 122, 70, 0.2);
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-modal: 0 10px 25px rgba(0, 0, 0, 0.15);
}
```

---

## 2. Typography & Layout Spacing (DEC-UI-01 to DEC-UI-04)

### 2.1 Font Stack & Scale Hierarchy
* **Font Family:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` (**DEC-UI-01**).
* **Scale & Weight Hierarchy:**
  * **H1 / Screen Title:** `1.5rem` (24px), `font-weight: 700` (bold), line-height: 1.3.
  * **H2 / Section Title:** `1.125rem` (18px), `font-weight: 600` (semi-bold), line-height: 1.4.
  * **Form Field Labels:** `0.875rem` (14px), `font-weight: 600` (semi-bold), `color: var(--color-text-primary)`.
  * **Table Column Headers:** `0.875rem` (14px), `font-weight: 600`, text-transform: none.
  * **Body Text & Table Cells:** `0.875rem` (14px), `font-weight: 400`, line-height: 1.5.
  * **Validation & Metadata:** `0.75rem` (12px), `font-weight: 400` (errors use `font-weight: 500`).

### 2.2 Layout Geometry & Padding
* **Desktop Container:** Max-width `1200px` (`container-xl`), centered with `margin: 0 auto` (**DEC-UI-02**).
* **Page Padding:** `1.5rem` (24px) vertical and horizontal on desktop; `1rem` (16px) on mobile (<768px).
* **Card & Form Padding:** `1.5rem` (24px) inner card padding (**DEC-UI-03**).
* **Field Rhythm:** `1rem` (16px) vertical gap between field rows; `0.375rem` (6px) gap between label and input control.

---

## 3. Component Geometry, Inputs & Tables (DEC-UI-05 to DEC-UI-08)

### 3.1 Form Controls & Fields
* **Input Sizing:** Standard height `38px` across `input[type="text"]`, `select.form-select`, and buttons. Multiline `textarea` has min-height `120px` and is vertically resizable only (`resize: vertical`).
* **Borders & Corners:** `border-radius: 6px` (`rounded-2`), `border: 1px solid var(--color-field-border)` (**DEC-UI-05**).
* **Read-Only Fields:** `background-color: var(--color-field-readonly-bg); border-color: var(--color-field-readonly-border); color: var(--color-text-primary); cursor: not-allowed;`
* **Active Focus State:** Border transitions to `var(--color-secondary-green)` with `box-shadow: var(--focus-ring)` (**DEC-UI-06**).
* **Required Indicator:** Form labels for mandatory fields include `<span class="text-danger ms-1" aria-hidden="true">*</span>`.

### 3.2 Tables & Grids (My Tickets Screen)
* **Table Container:** Wrapped in `.table-responsive` with white card surface, rounded corners (`border-radius: 8px`), and subtle border `1px solid var(--color-field-readonly-border)`.
* **Density:** Table header padding `0.75rem 1rem` (12px $\times$ 16px); Data cell padding `0.875rem 1rem` (14px $\times$ 16px) (**DEC-UI-07**).
* **Row Appearance:** Pure white rows with bottom separator `1px solid #E5E7EB`. Hover state applies soft pale-green tint (`background-color: #F4FAF6`) and `cursor: pointer` (**DEC-UI-08**).
* **Keyboard Row Interaction:** Every row carries `tabIndex={0}`. Focused row displays `outline: 2px solid var(--color-primary-green); outline-offset: -2px;` (**DEC-UI-18**). Pressing `Enter` or `Space` opens the ticket detail view.

---

## 4. Buttons, Actions & Responsive Navigation (DEC-UI-09 to DEC-UI-12)

### 4.1 Button Hierarchy & Sizing
* **Height:** Uniform `38px` across all action buttons, `border-radius: 6px`, `font-weight: 600` (**DEC-UI-09**).
* **Hover Transition:** `transition: all 0.15s ease-in-out; filter: brightness(0.92);` on hover.
* **Semantic Button Styles:**
  * **Primary Action:** Solid Primary Green (`background-color: #006B3C; color: #FFFFFF; border: none;`). Used for "Submit Ticket", "+ Create Ticket", "Continue".
  * **Secondary / Neutral:** Clean Neutral Outline (`border: 1px solid #D1D5DB; background: #FFFFFF; color: #1F2937;`). Hover: `background: #F3F4F6;`. Used for "Clear Filters", "Cancel", "Back to My Tickets".
  * **Destructive Action:** Danger Outline (`border: 1px solid #B3261E; background: transparent; color: #B3261E;`). Hover: `background: #B3261E; color: #FFFFFF;`. Used for "Remove Attachment".
  * **Disabled Button:** `opacity: 0.65; cursor: not-allowed; pointer-events: none;`.

### 4.2 Application Shell & Navigation
* **App Header:** Dark green surface (`background: var(--color-primary-green); color: #FFFFFF; padding: 0.75rem 1.5rem;`).
  * **Left:** TokTickIT branding with support icon and subtitle "IT Service Desk".
  * **Center:** Nav links ("My Tickets", "+ Create Ticket") with white text and active tab pale-green underline/indicator.
  * **Right:** Simulated Requester pill displaying user icon, active Requester display name, and a "Change" button.
* **Mobile Shell (< 768px):** Header retains brand and requester badge. Navigation links collapse into an accessible hamburger menu toggle button (`navbar-toggler` with `aria-expanded` and `aria-label="Toggle navigation"`) (**DEC-UI-10**).

### 4.3 Mobile Table Representation (< 768px)
* On screens `< 768px`, the 9-column desktop table is hidden via Bootstrap utility classes (`d-none d-md-block`).
* A responsive card list (`d-block d-md-none`) renders individual ticket cards (`card shadow-sm p-3 mb-2.5`) displaying Ticket No, Status badge, Priority badge, Category, and Summary, completely eliminating horizontal scrolling (**DEC-UI-11**).

---

## 5. Validation, Feedback & System States (DEC-UI-13 to DEC-UI-16)

### 5.1 Form Validation & Error Placement
* **Field Errors:** Input border turns Dark Red (`#B3261E`). An inline error message appears immediately below the input with Dark Red text (`color: #B3261E; font-size: 0.75rem; font-weight: 500; margin-top: 4px;`) accompanied by an exclamation circle SVG icon (**DEC-UI-13**).
* **API / Network Failure:** Top alert banner (`alert alert-danger`) is rendered at the top of the form with safe error messaging. **All user-entered form values are preserved in state** and not cleared on failure.

### 5.2 Submitting & Busy States
* When an asynchronous operation (e.g. ticket submission or attachment upload) is in flight:
  * Submit button maintains its exact width to prevent layout shift.
  * Displays an animated spinner (`spinner-border spinner-border-sm me-2`).
  * Text dynamically changes from "Submit Ticket" to "Submitting..." (**DEC-UI-14**).
  * Button is disabled (`disabled`, `cursor: not-allowed`) to prevent duplicate submissions.

### 5.3 Loading Placeholders
* While loading data for My Tickets or Ticket Details, render 3–5 pulsing skeleton rows (`.placeholder-glow` with `.placeholder` bars) matching table column proportions to eliminate cumulative layout shift (CLS) (**DEC-UI-15**).

### 5.4 Empty vs. No-Results States
* **Empty State (Requester has 0 tickets):** Centered card with inbox icon, headline *"No Support Tickets Yet"*, descriptive text *"You have not submitted any IT support tickets yet."*, and a primary "+ Create Ticket" button (**DEC-UI-16**).
* **No-Results State (Active filters match 0 tickets):** Centered card with filter/search icon, headline *"No matching tickets found"*, descriptive text *"No tickets match your search keyword or selected filters."*, and a secondary "Clear Filters" button (**DEC-UI-16**).

---

## 6. Dialogs, Accessibility & WCAG 2.2 Compliance (DEC-UI-17 to DEC-UI-20)

### 6.1 Modal Dialog Geometry & Accessibility
* **Modal Overlay:** `background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(2px);` centered layout with `max-width: 500px` and `border-radius: 8px` (**DEC-UI-17**).
* **Focus Trapping:** When opened, focus moves immediately to the first interactive input or close button. Tab navigation is trapped within the modal container.
* **Keyboard Escape:** Pressing `Escape` triggers the cancel action and closes the modal. Focus is returned to the invoking trigger button upon modal dismissal (**DEC-UI-17**).

### 6.2 Status & Priority Badges (Non-Color Dependency)
Every status and priority badge pairs theme colors with explicit text labels and semantic SVG micro-icons to satisfy WCAG 2.2 Level AA (**DEC-UI-19**):
* **Pill Geometry:** `border-radius: 12px; padding: 0.25rem 0.65rem; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;`
* **Status Badges:**
  * **New:** Blue surface (`#EBF5FF`), dark blue text (`#1E429F`), clock icon.
  * **Assigned / In Progress:** Yellow surface (`#FEF08A`), dark amber text (`#854D0E`), gear/arrow icon.
  * **Pending Requester:** Orange surface (`#FFEDD5`), dark orange text (`#9A3412`), question icon.
  * **Resolved / Closed:** Pale green surface (`#EAF6EF`), dark green text (`#006B3C`), check-circle icon.
  * **Cancelled:** Gray surface (`#F3F4F6`), dark slate text (`#4B5563`), x-circle icon.
* **Priority Badges:**
  * **Low:** Light gray (`#F3F4F6`), text `#374151`, arrow-down icon.
  * **Medium:** Light amber (`#FEF3C7`), text `#92400E`, dash icon.
  * **High:** Light orange (`#FFEDD5`), text `#C2410C`, arrow-up icon.
  * **Urgent:** Light red (`#FEE2E2`), text `#991B1B`, exclamation-triangle icon.

### 6.3 Attachment Soft-Removal Modal UX
* Displays the target attachment's original filename and formatted file size in a warning callout (**DEC-UI-20**).
* Includes a required `<textarea>` for "Removal Reason" (`rows="3"`, placeholder *"Please explain why this attachment is being removed..."*) with live character counter showing minimum 5 characters.
* "Remove Attachment" destructive button remains disabled until at least 5 non-whitespace characters are entered.

---

## 7. Visual Inspection & Screenshot Checklist

To verify conformance against this specification during Sprint 2 QA:

| Viewport | Inspection Target | Acceptance Standard | Screenshot Path |
| :--- | :--- | :--- | :--- |
| **Desktop ($\ge 992\text{px}$)** | Create Ticket Form | System-generated fields read-only; required red asterisks; submit busy state; safe error preservation. | `artifacts/lab-02/screenshots/create-ticket/desktop-form.png` |
| **Desktop ($\ge 992\text{px}$)** | My Tickets 9-Col Grid | 9 columns visible; search/filters/pagination active; pill badges with icons; pale-green row hover. | `artifacts/lab-02/screenshots/my-tickets/desktop-table.png` |
| **Desktop ($\ge 992\text{px}$)** | Ticket Detail & Attachments | Read-only ticket attributes; attachment list with download; removal modal with reason validation. | `artifacts/lab-02/screenshots/ticket-detail/desktop-detail.png` |
| **Tablet (768–991px)** | Create Ticket & My Tickets | Two-column responsive layout; summary/description full width; table scrolls cleanly without clipping. | `artifacts/lab-02/screenshots/my-tickets/tablet-table.png` |
| **Mobile (< 768px)** | My Tickets Card List | Desktop table converts to stacked ticket cards; no horizontal overflow; touch-friendly buttons. | `artifacts/lab-02/screenshots/my-tickets/mobile-cards.png` |
| **Mobile (< 768px)** | Navigation & Header | Links collapse into accessible hamburger menu; brand and active requester badge remain visible. | `artifacts/lab-02/screenshots/my-tickets/mobile-nav.png` |
| **All Viewports** | Empty & No-Results States | Dedicated card illustrations for 0 tickets and 0 filter matches with clear call-to-action buttons. | `artifacts/lab-02/screenshots/my-tickets/empty-state.png` |
