# TokTickIT Sprint 3 (Lab 3) — Software Test Specification (STS) & Test Plan

This document establishes the official test plan, acceptance-criterion traceability, and visual verification checklist for **TokTickIT Lab 3 (Sprint 3)**, strictly adhering to **Lab_03_labsheet.pdf** (§10) and **TokTickIT-System-Level-SDS-v1.0.pdf** (Testing Architecture, p. 17).

---

## 1. Test Strategy & Verification Pyramid

Testing follows a rigorous multi-tier verification pyramid to validate security authorization, data integrity, operational workflows, and responsive visual fidelity:

```mermaid
graph TD
    E2E["Browser E2E Tests (Playwright)<br/>Full multi-role workflows: Auth, Staff Queue, Detail, Admin"]
    UI["Frontend Component Tests (Vitest + React Testing Library)<br/>Login, Change Password, Queue filters, Detail tabs, Admin modal"]
    API["API Integration & Auth Tests (Vitest + Supertest)<br/>Auth, Session, RBAC, Queue queries, Comments/Notes, Admin safety"]
    UNIT["Unit Tests (Vitest)<br/>Password validator, hash verification, transition matrix engine"]

    E2E --> UI
    UI --> API
    API --> UNIT
```

* **Unit Tests (Vitest):** Tests password complexity validation, status transition rule evaluations, and query parameter parsing in pure isolation without database dependencies.
* **API Integration & Security Tests (Vitest + Supertest):** Validates Express endpoints, session cookie lifecycles, role-based authorization guards, comment/note visibility partitioning, and administrator safety invariants against PostgreSQL.
* **UI Component Tests (Vitest + RTL):** Verifies interactive UI components, rule checklists, filter form interactions, responsive card conversions, and modal dialog focus states.
* **End-to-End Tests (Playwright):** Full browser walkthroughs across Requester, IT Staff, and Administrator roles on Desktop, Tablet, and Mobile viewports.

---

## 2. Planned Tests Table

| Test ID | Level | Requirement / AC | What It Tests | Expected Result | Automated Test File Path | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | API | FR-01, BR-01, AC-01 | Valid user login & session creation | HTTP 200 OK; returns user profile and sets session cookie | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **API-02** | API | FR-01, BR-01, AC-02 | Invalid password / inactive account | HTTP 401 Unauthorized; safe error envelope without existence leak | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **API-03** | API | FR-02, BR-02, AC-03 | Password change enforcement | Blocks operational endpoints until password is changed | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **API-04** | API | FR-01, AC-05 | Logout session invalidation | HTTP 200 OK; clears cookie; subsequent requests return 401 | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **API-05** | API | FR-01, BR-03, AC-04 | Session-derived Requester ownership | Ticket creation uses `req.user.id`; client requesterId ignored | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| **API-06** | API | FR-03, BR-06, AC-06 | Shared queue pagination & fields | HTTP 200 OK; returns paginated tickets with owner & priority | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| **API-07** | API | FR-03, AC-07 | Shared queue search & filtering | HTTP 200 OK; correctly filters by search, category, status, owner | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| **API-08** | API | FR-03, BR-06, AC-08 | Requester forbidden from queue | HTTP 403 Forbidden when Requester accesses `/staff/tickets` | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| **API-09** | API | FR-04, AC-09 | Ticket ownership assignment | HTTP 200 OK; updates `ownerId` to active IT Staff/Admin | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-10** | API | FR-04, BR-07, AC-10 | IT Priority update | HTTP 200 OK; updates `itPriority`; rejects invalid values | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-11** | API | FR-04, AC-10 | Status workflow transitions | Enforces status transition matrix; rejects invalid next status | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-12** | API | FR-05, BR-04, AC-11 | Public Comments posting & view | HTTP 201 Created; visible to Requester, Staff, and Admin | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| **API-13** | API | FR-05, BR-04, AC-12 | Internal Notes confidentiality | Notes stripped from Requester payload; Requester post returns 403 | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| **API-14** | API | FR-04, BR-05, AC-13 | Requester resolution indication | HTTP 200 OK; sets timestamp; does NOT set status to Resolved | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-15** | API | FR-06, BR-09, AC-14 | Admin user creation & conflicts | HTTP 201 Created with single role; duplicate email returns 409 | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-16** | API | FR-06, BR-11, AC-15 | Admin self-deactivation prevention | HTTP 400 Bad Request if admin attempts to deactivate own account | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-17** | API | FR-06, BR-12, AC-15 | Last active admin protection | HTTP 400/409 if deactivating the last active administrator | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-18** | API | FR-06, AC-14 | Non-admin forbidden from admin API | HTTP 403 Forbidden for Requester or IT Staff calling admin routes | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **UI-01** | UI | FR-01, AC-01, AC-02 | Login form rendering & validation | Inputs, error banner, busy spinner, safe rejection display | `client/src/tests/lab-03/Login.test.tsx` | Planned |
| **UI-02** | UI | FR-02, AC-03 | Mandatory Password Change UI | Interactive checklist ticks, confirmation validation, submits change | `client/src/tests/lab-03/ChangePassword.test.tsx` | Planned |
| **UI-03** | UI | FR-03, AC-06, AC-07 | Staff Ticket Queue table & filters | Table rendering, search debounce, filter controls, pagination bar | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| **UI-04** | UI | FR-04, AC-09, AC-10 | Staff Ticket Detail controls | Claim button, priority selector, status transition dropdown | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| **UI-05** | UI | FR-05, BR-04, AC-11, AC-12 | Comments thread & Notes styling | Public thread vs amber/lock confidential internal notes styling | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| **UI-06** | UI | FR-06, AC-14, AC-15 | Admin User Management table & modal | User table rendering, add user modal, edit modal, safety alerts | `client/src/tests/lab-03/UserManagement.test.tsx` | Planned |
| **E2E-01** | E2E | FR-01, FR-02, AC-01, AC-03 | Authentication & first login E2E | Login with initial password, forced change, entry into shell | `e2e/lab-03/authentication.spec.ts` | Planned |
| **E2E-02** | E2E | FR-03, FR-04, FR-05, AC-06..13 | Staff ticket workflow E2E | Staff queue search, claim ticket, update priority, post notes | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| **E2E-03** | E2E | FR-06, BR-11, BR-12, AC-14, AC-15 | Administrator management E2E | Create user, edit user, verify safety blocks on self-deactivate | `e2e/lab-03/user-administration.spec.ts` | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

Every Acceptance Criterion defined in [docs/lab-03/specification.md](file:///c:/Users/xande/Documents/Year%203%20Sem%201/CPE%20334/Lab%201/toktickit/docs/lab-03/specification.md) maps directly to planned test suites:

| Acceptance Criterion | Requirement Description | Planned Test IDs | Test Level | Automated Test File Path |
| :---: | :--- | :--- | :--- | :--- |
| **AC-01** | Valid user authentication & session issuance | `API-01`, `UI-01`, `E2E-01` | API, UI, E2E | `server/tests/lab-03/auth.api.test.ts` |
| **AC-02** | Inactive account & invalid password safe rejection | `API-02`, `UI-01`, `E2E-01` | API, UI, E2E | `server/tests/lab-03/auth.api.test.ts` |
| **AC-03** | Mandatory first-login password change | `API-03`, `UI-02`, `E2E-01` | API, UI, E2E | `client/src/tests/lab-03/ChangePassword.test.tsx` |
| **AC-04** | Session-derived Requester ownership isolation | `API-05`, `E2E-01` | API, E2E | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-05** | Logout session invalidation | `API-04`, `E2E-01` | API, E2E | `server/tests/lab-03/auth.api.test.ts` |
| **AC-06** | IT Staff shared queue retrieval & pagination | `API-06`, `UI-03`, `E2E-02` | API, UI, E2E | `server/tests/lab-03/staff-queue.api.test.ts` |
| **AC-07** | Staff queue multi-criteria search, filter, and sort | `API-07`, `UI-03`, `E2E-02` | API, UI, E2E | `server/tests/lab-03/staff-queue.api.test.ts` |
| **AC-08** | Requester forbidden from Staff queue (`403`) | `API-08`, `E2E-02` | API, E2E | `server/tests/lab-03/staff-queue.api.test.ts` |
| **AC-09** | Staff ticket ownership claim & reassignment | `API-09`, `UI-04`, `E2E-02` | API, UI, E2E | `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| **AC-10** | IT Priority & permitted status transitions | `API-10`, `API-11`, `UI-04` | API, UI | `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| **AC-11** | Public comment posting & multi-role visibility | `API-12`, `UI-05`, `E2E-02` | API, UI, E2E | `server/tests/lab-03/comments-notes.api.test.ts` |
| **AC-12** | Internal Notes confidentiality & Requester block | `API-13`, `UI-05`, `E2E-02` | API, UI, E2E | `server/tests/lab-03/comments-notes.api.test.ts` |
| **AC-13** | Requester "Problem Appears Resolved" indication | `API-14`, `E2E-02` | API, E2E | `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| **AC-14** | Admin user creation, unique email & role policy | `API-15`, `API-18`, `UI-06` | API, UI | `server/tests/lab-03/users-admin.api.test.ts` |
| **AC-15** | Admin safety rules (self & last admin protection) | `API-16`, `API-17`, `UI-06`, `E2E-03` | API, UI, E2E | `server/tests/lab-03/users-admin.api.test.ts` |

---

## 4. Responsive & Visual Verification Checklist

| Viewport Category | Width | Verification Target | Verification Standard | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop** | $\ge 1200\text{px}$ | Staff Ticket Queue | 8 columns displayed cleanly with pale-green hover | Zero text clipping; filters fully aligned |
| **Desktop** | $\ge 1200\text{px}$ | Staff Ticket Detail | 2-column split (ticket info vs. operational rail) | Clear distinction between comments & amber notes |
| **Desktop** | $\ge 1200\text{px}$ | Admin User Management | User table with Name, Email, Role, Status, Edit button | Modal opens centered with trapped focus |
| **Tablet** | $768 - 1024\text{px}$ | All Screen Layouts | Fluid layouts; operational controls wrap gracefully | Clean vertical stacking; zero clipping |
| **Mobile** | $< 768\text{px}$ | Staff Ticket Queue | Table collapses into stacked Zen Green cards | Zero horizontal scroll; all badges legible |
| **Mobile** | $< 768\text{px}$ | Admin User List | Table collapses into stacked user cards with action buttons | Touch targets $\ge 44\text{px}$; no horizontal scroll |
| **Mobile** | $< 768\text{px}$ | App Header Navigation | Navigation collapses into accessible toggle menu | Brand and authenticated user pill remain clear |
| **All Viewports** | All | Theme Tokens | Zen Green `#006B3C`, `#0B7A46`, `#EAF6EF`, `#F5F7F6` | Palette verified across all screens |
| **All Viewports** | All | Status & Role Badges | Colors paired with explicit text and SVG micro-icons | WCAG 2.2 Level AA non-color-only compliance |

---

## 5. Test Execution Commands

### 5.1 Backend Tests (Server API & Security)
```powershell
cd server
npm test
```
*Executes all Vitest unit, Supertest integration, and RBAC authorization test suites under `server/tests/lab-03/`.*

### 5.2 Frontend Tests (Client UI Components)
```powershell
cd client
npm test
```
*Executes Vitest + React Testing Library suites under `client/src/tests/lab-03/`.*

### 5.3 Browser End-to-End Tests (Playwright)
```powershell
npx playwright test e2e/lab-03/
```
*Executes full multi-role end-to-end user workflows across Chromium, Firefox, and WebKit viewports.*
