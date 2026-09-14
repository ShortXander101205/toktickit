# TokTickIT Sprint 3 (Lab 3) — UI & Design System Specification

This document defines the authoritative user interface, styling, responsive behavior, component states, and accessibility specifications for **TokTickIT Lab 3 (Sprint 3)**.

All specifications extend the KMUTT **Zen Green** visual language established in Lab 2 and incorporate the approved decisions from the Sprint 3 UI Decision Register (**DEC-UI-01 through DEC-UI-20**), strictly adhering to **TokTickIT-System-Level-SDS-v1.0.pdf** and **Lab_03_labsheet.pdf** (§7, §8, and §14).

---

## 1. Design System & Theme Tokens

### 1.1 CSS Color Tokens (`client/src/index.css` or `:root`)

```css
:root {
  /* KMUTT Zen Green Palette */
  --color-primary-green: #006B3C;        /* Header bar, primary buttons, brand titles */
  --color-secondary-green: #0B7A46;      /* Active tabs, focus rings, link hovers */
  --color-pale-green: #EAF6EF;           /* Selected rows, badge surfaces, subtle highlights */
  --color-page-bg: #F5F7F6;              /* Quiet near-white background */
  --color-surface-card: #FFFFFF;         /* White card panels, tables, dialogs */

  /* KMUTT Secondary Brand Accents */
  --color-kmutt-orange: #FA4616;         /* Brand accents, urgent notifications */
  --color-kmutt-yellow: #FFC72C;         /* Focus rings, warning badges */
  --color-kmutt-blue-grey: #7B8189;      /* Borders, subtle icons, divider lines */
  --color-interactive-orange: #8A2608;   /* Accessible dark orange for high-contrast links */

  /* Operational & Confidentiality Accents (Sprint 3) */
  --color-internal-note-border: #D97706; /* Amber border for private Internal Notes */
  --color-internal-note-bg: #FEF3C7;     /* Soft amber surface for Internal Notes */
  --color-internal-note-badge: #92400E;  /* Amber text for Internal Notes badge */

  /* Functional & State Tokens */
  --color-text-primary: #1F2937;         /* High-contrast charcoal text */
  --color-text-muted: #5B6573;           /* Secondary labels, metadata, placeholders */
  --color-field-bg: #FFFFFF;             /* Editable input background */
  --color-field-border: #D1D5DB;         /* Neutral input border */
  --color-field-readonly-bg: #F5F7F6;    /* Shaded read-only input background */
  --color-field-readonly-border: #E5E7EB;

  --color-success: #2E7D32;              /* Success indicators and Resolved/Closed badges */
  --color-warning: #B26A00;              /* Attention, In-Progress status */
  --color-warning-bg: #FFF8E1;           /* Warning callout surface */
  --color-danger: #B3261E;               /* Destructive actions, validation errors */
  --color-danger-bg: #FDF2F2;            /* Error banner background */

  /* Focus, Elevation & Shadows */
  --focus-ring: 0 0 0 3px rgba(11, 122, 70, 0.2);
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-modal: 0 10px 25px rgba(0, 0, 0, 0.15);
}
```

---

## 2. Sprint 3 UI Design Decisions Register (DEC-UI-01 to DEC-UI-20)

| Decision ID | Area | Specification & Approved Standard |
| :--- | :--- | :--- |
| **DEC-UI-01** | **Typography** | Retain system font stack (`system-ui, -apple-system, sans-serif`). Page titles at 24px/700; section headers at 18px/600; form labels at 14px/600; body & cells at 14px/400; metadata/errors at 12px. |
| **DEC-UI-02** | **App Shell Header** | Display authenticated user display name and role badge pill (`Requester`, `IT Staff`, `Administrator`) in top right. Provide dropdown menu with Logout action. Remove all Lab 2 Development Selector controls. |
| **DEC-UI-03** | **Role-Based Nav** | Requesters see "My Tickets", "+ Create Ticket"; IT Staff see "Ticket Queue", "+ Create Ticket"; Administrators see "User Management", "Ticket Queue". |
| **DEC-UI-04** | **Login Layout** | Centered 420px Zen Green card with TokTickIT brand logo, email input, password input with show/hide toggle, and full-width "Sign In" button. |
| **DEC-UI-05** | **Password Change UX** | Mandatory full-page dialog or card preventing navigation. Displays current password, new password, confirmation, and interactive requirement checklist updating dynamically on keystroke. |
| **DEC-UI-06** | **Staff Queue Density** | Table displaying 8 key columns: Ticket Number, Created Date, Summary, Category, Requested Priority, IT Priority, Status, and Owner. No horizontal clipping on desktop. |
| **DEC-UI-07** | **Queue Filters** | Filter bar above queue containing: Text Search (ticket # or summary), Status select, Category select, IT Priority select, Owner select (All, Unassigned, Me), and Clear Filters button. |
| **DEC-UI-08** | **Queue Pagination** | Bottom pagination toolbar showing "Showing X to Y of Z tickets", Previous/Next page buttons, numbered page links, and Page Size dropdown (10, 25, 50). |
| **DEC-UI-09** | **Mobile Queue (<768px)**| Table collapses into stacked Zen Green cards displaying Ticket No, badges (Status, Priority, Role), Summary, and Owner. Zero horizontal scroll. |
| **DEC-UI-10** | **Staff Detail Layout** | Two-column desktop grid: Left column (65%) contains Ticket Information, Attachments, Public Comments, and Internal Notes. Right column (35%) contains Operational Controls card. |
| **DEC-UI-11** | **Operational Controls**| Card containing: Owner Assignment selector (with "Claim Ticket" shortcut), IT Priority dropdown, and Current Status transition dropdown with "Update Status" button. |
| **DEC-UI-12** | **Internal Notes Contrast**| Internal Notes section features a distinct amber border (`#D97706`), soft amber background (`#FEF3C7`), lock icon 🔒, and clear subtitle *"Confidential to IT Staff & Admins — Never shared with Requester"*. |
| **DEC-UI-13** | **Public Comments UX** | Clean conversation thread with author name, role badge, timestamp, and message bubble. Append-only form with 2000-character counter. |
| **DEC-UI-14** | **Requester Resolution**| Requester Ticket Detail includes a distinctive "Problem Appears Resolved" button with confirmation alert. Disabled once clicked or if already resolved. |
| **DEC-UI-15** | **Admin User Table** | Minimalist 5-column table: Full Name, Email Address, Role Badge, Status Badge (`Active` / `Inactive`), and Action ("Edit" button). |
| **DEC-UI-16** | **User Filter Bar** | Search bar (by name or email) and Role filter dropdown (`All Roles`, `Requester`, `IT Staff`, `Administrator`) plus "+ Add User" primary action button. |
| **DEC-UI-17** | **Create/Edit User Modal**| Accessible modal dialog (500px width, focus trap, Escape to dismiss) containing Name, Email, Role selector, Active toggle switch, and Initial Password field. |
| **DEC-UI-18** | **Admin Safety Alerts** | Attempting to toggle active off for self displays inline danger alert: *"You cannot deactivate your own account"*. Attempting to deactivate the last active admin displays: *"Cannot deactivate the last active Administrator"*. |
| **DEC-UI-19** | **Badge Conventions** | Semantic pill badges pairing theme background colors with text labels and SVG micro-icons (WCAG 2.2 non-color-only requirement). |
| **DEC-UI-20** | **Responsive Breakpoints**| Strictly enforces 3 breakpoints: Desktop ($\ge 1200\text{px}$), Tablet ($768\text{px} - 1024\text{px}$), and Mobile ($< 768\text{px}$). |

---

## 3. Wireframes & Screen Component Specifications

### 3.1 Login Screen (`/login`)
```
+-------------------------------------------------------------+
|                                                             |
|                     [ TokTickIT Logo ]                      |
|                   IT Service Desk Portal                    |
|                                                             |
|     +-------------------------------------------------+     |
|     |  Sign In to Your Account                        |     |
|     |                                                 |     |
|     |  Email Address *                                |     |
|     |  [ user@kmutt.ac.th                           ] |     |
|     |                                                 |     |
|     |  Password *                                     |     |
|     |  [ ****************                     [👁] ] |     |
|     |                                                 |     |
|     |  +-------------------------------------------+  |     |
|     |  | [Sign In]                                 |  |     |
|     |  +-------------------------------------------+  |     |
|     |                                                 |     |
|     |  [!] Invalid email or password                  |     |
|     +-------------------------------------------------+     |
|                                                             |
+-------------------------------------------------------------+
```
* **State Behaviors**:
  - Empty field validation triggers on blur or submit.
  - Submit button displays animated spinner (`Signing in...`) and disables to prevent duplicate submissions.
  - Authentication errors display a top alert banner without leaking whether the email exists.

---

### 3.2 Mandatory First-Login Password Change Screen (`/change-password`)
```
+-------------------------------------------------------------+
| [TokTickIT Header]                       [User Pill] [Logout|
+-------------------------------------------------------------+
|                                                             |
|     +-------------------------------------------------+     |
|     |  Password Change Required                       |     |
|     |  You must set a new password before entering    |     |
|     |  the application.                               |     |
|     |                                                 |     |
|     |  Current Password *                             |     |
|     |  [ ****************                           ] |     |
|     |                                                 |     |
|     |  New Password *                                 |     |
|     |  [ ****************                           ] |     |
|     |  Password Requirements:                         |     |
|     |  [✓] At least 8 characters                      |     |
|     |  [✓] At least 1 uppercase letter (A-Z)          |     |
|     |  [✓] At least 1 lowercase letter (a-z)          |     |
|     |  [✓] At least 1 number (0-9)                    |     |
|     |  [✓] At least 1 special character (!@#$%^&*)    |     |
|     |                                                 |     |
|     |  Confirm New Password *                         |     |
|     |  [ ****************                           ] |     |
|     |                                                 |     |
|     |  +-------------------------------------------+  |     |
|     |  | [Update Password & Continue]              |  |     |
|     |  +-------------------------------------------+  |     |
|     +-------------------------------------------------+     |
|                                                             |
+-------------------------------------------------------------+
```
* **State Behaviors**:
  - Application shell navigation links are hidden; only User Pill and Logout are accessible.
  - Requirement checkboxes dynamically switch from neutral gray `[ ]` to green `[✓]` as conditions are met.
  - Password confirmation mismatch triggers an inline error.

---

### 3.3 IT Staff Shared Ticket Queue Screen (`/staff/tickets`)
```
+---------------------------------------------------------------------------------------------------+
| [TokTickIT]  Ticket Queue   + Create Ticket                    [Sompong IT (IT Staff) v] [Logout] |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  IT Staff Ticket Queue                                                                            |
|  Manage, prioritize, and assign incoming service requests                                         |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | [🔍 Search ticket # or summary...] [Status: All v] [Cat: All v] [Priority: All v] [Owner v] |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | Ticket No   | Date       | Summary                | Category | Req. Pri | IT Pri | Status   |  |
|  +-------------+------------+------------------------+----------+----------+--------+----------+  |
|  | TKT-2026-01 | 2026-09-12 | Wi-Fi connection drops | Network  | High     | High   | In Prog. |  |
|  | TKT-2026-02 | 2026-09-12 | LEB2 gradebook sync... | Software | Urgent   | Urgent | New      |  |
|  | TKT-2026-03 | 2026-09-11 | Laptop battery failure | Hardware | Medium   | Low    | Assigned |  |
|  +---------------------------------------------------------------------------------------------+  |
|  Showing 1 to 10 of 42 tickets                     [Page Size: 10 v]  [< Prev] [1] [2] [3] [Next >]|
+---------------------------------------------------------------------------------------------------+
```
* **State Behaviors**:
  - Clicking any table row opens `/staff/tickets/:id`.
  - Search input has a 300ms debounce.
  - Skeletons display while fetching queue data; empty/no-results states display friendly illustrated cards.

---

### 3.4 IT Staff Ticket Detail Screen (`/staff/tickets/:id`)
```
+---------------------------------------------------------------------------------------------------+
| [TokTickIT]  < Back to Ticket Queue                            [Sompong IT (IT Staff) v] [Logout] |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  TKT-2026-00042: LEB2 gradebook synchronization hangs                                             |
|  Created on Sep 12, 2026 by Sarah Johnson (Science Faculty)                                       |
|                                                                                                   |
|  +-----------------------------------------------+ +-------------------------------------------+  |
|  | TICKET INFORMATION                            | | OPERATIONAL CONTROLS                      |  |
|  | Summary: LEB2 gradebook sync hangs            | | Assigned Owner:                           |  |
|  | Description: Detailed problem explanation...  | | [ Sompong IT (IT Staff)             v ]   |  |
|  | Category: Software | System: LEB2 App         | | [ Claim Ticket ]                          |  |
|  | Requested Priority: [High]                    | |                                           |  |
|  |                                               | | IT Priority:                              |  |
|  | ATTACHMENTS (2 Active)                        | | [ Urgent                                v ] |  |
|  | 📄 error_log.pdf (1.2 MB) [Download]          | |                                           |  |
|  | 🖼️ screenshot.png (450 KB) [Download]         | | Workflow Status:                          |  |
|  +-----------------------------------------------+ | [ In Progress                           v ] |  |
|                                                    | | [ Update Status ]                         |  |
|  +-----------------------------------------------+ +-------------------------------------------+  |
|  | 💬 PUBLIC COMMENTS                            |                                                |
|  | Visible to Requester and IT Staff             |                                                |
|  | --------------------------------------------- |                                                |
|  | Sarah Johnson (Requester) - 10:15 AM          |                                                |
|  | Still experiencing the issue after restart.   |                                                |
|  | --------------------------------------------- |                                                |
|  | [ Add public comment (max 2000 chars)...    ] |                                                |
|  | [ Post Comment ]                              |                                                |
|  +-----------------------------------------------+                                                |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | 🔒 INTERNAL NOTES (CONFIDENTIAL)                                                            |  |
|  | Visible ONLY to IT Staff and Administrators — Never shown to Requester                         |  |
|  | ------------------------------------------------------------------------------------------- |  |
|  | Sompong IT (IT Staff) - 10:30 AM                                                            |  |
|  | Database deadlock detected on table student_grades during exam batch commit.                 |  |
|  | ------------------------------------------------------------------------------------------- |  |
|  | [ Write private internal note...                                                          ] |  |
|  | [ Add Internal Note ]                                                                       |  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

### 3.5 Administrator User Management Screen (`/admin/users`)
```
+---------------------------------------------------------------------------------------------------+
| [TokTickIT]  User Management   Ticket Queue                     [Admin User (Admin) v]  [Logout]  |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  User Management                                                                [ + Add User ]    |
|  Manage accounts, roles, credentials, and access states                                            |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | [🔍 Search by name or email...]               [Filter by Role: All Roles v]                 |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | Full Name        | Email Address             | Role          | Status   | Actions           |  |
|  +------------------+---------------------------+---------------+----------+-------------------+  |
|  | Admin User       | admin@kmutt.ac.th         | Administrator | Active   | [ Edit ]          |  |
|  | Sompong IT       | sompong.it@kmutt.ac.th    | IT Staff      | Active   | [ Edit ]          |  |
|  | Sarah Johnson    | sarah.johnson@kmutt.ac.th | Requester     | Active   | [ Edit ]          |  |
|  | Prasert Inactive | prasert.ina@kmutt.ac.th   | Requester     | Inactive | [ Edit ]          |  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Responsive Breakpoints & Viewport Adaptations

TokTickIT strictly supports three primary viewport tiers:

### 4.1 Desktop Viewport ($\ge 1200\text{px}$)
* Centered `1200px` container (`container-xl`).
* Full multi-column data tables with header borders and pale-green row hovers.
* Two-column split layout for Ticket Detail (65% ticket stream / 35% operational rail).

### 4.2 Tablet Viewport ($768\text{px} - 1024\text{px}$)
* Full-width fluid container with `1.5rem` (24px) horizontal padding.
* Ticket Detail operational rail stacks below Ticket Information or wraps cleanly.
* Queue table headers remain visible; less critical columns compact gracefully.

### 4.3 Mobile Viewport ($< 768\text{px}$)
* **Zero Horizontal Overflow**: Every screen is strictly constrained within `100vw` without horizontal scrolling.
* **Card Collapse**: The 8-column Queue table and 5-column User table collapse into vertically stacked responsive Zen Green cards (`card shadow-sm p-3 mb-3`).
* **Header Collapse**: Application navigation collapses into an accessible off-canvas or hamburger menu toggle.
* **Touch Targets**: All interactive elements (buttons, inputs, dropdown items) maintain minimum touch target size of $44\text{px} \times 44\text{px}$.

---

## 5. Visual Inspection & Screenshot Checklist

| Screen / Area | Viewport | Required State / Evidence | Submission Artifact Path |
| :--- | :--- | :--- | :--- |
| **Authentication** | Desktop | Login card with email/password validation and error banner | `artifacts/lab-03/screenshots/authentication/login-desktop.png` |
| **Authentication** | Desktop | Mandatory password change form with live rule checklists | `artifacts/lab-03/screenshots/authentication/change-password-desktop.png` |
| **Staff Queue** | Desktop | Shared queue table with search, filters, pagination, badges | `artifacts/lab-03/screenshots/staff-queue/queue-desktop.png` |
| **Staff Queue** | Mobile | Stacked queue cards with zero horizontal overflow | `artifacts/lab-03/screenshots/staff-queue/queue-mobile.png` |
| **Staff Detail** | Desktop | Split view: controls, Public Comments, and amber Internal Notes | `artifacts/lab-03/screenshots/staff-ticket-detail/detail-desktop.png` |
| **Staff Detail** | Mobile | Stacked view with distinct comments and private notes | `artifacts/lab-03/screenshots/staff-ticket-detail/detail-mobile.png` |
| **User Admin** | Desktop | User list table, search, role filters, and "+ Add User" | `artifacts/lab-03/screenshots/user-management/admin-users-desktop.png` |
| **User Admin** | Desktop | Create/Edit User modal dialog with role selector & active toggle | `artifacts/lab-03/screenshots/user-management/admin-modal-desktop.png` |
| **User Admin** | Desktop | Administrative safety error alert (self-deactivation prevention) | `artifacts/lab-03/screenshots/user-management/admin-safety-alert.png` |
| **User Admin** | Mobile | Stacked responsive user cards with zero horizontal scroll | `artifacts/lab-03/screenshots/user-management/admin-users-mobile.png` |
