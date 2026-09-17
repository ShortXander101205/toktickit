# Lab 3 — Peer Review Record

**Author:** Al Xander James Codino Ybanez — 67070503450 — GitHub: [@ShortXander101205](https://github.com/ShortXander101205)  
**Peer Reviewer:** Muhammad Asad Aziz — 67070503472 — GitHub: [@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz)  
**Repository:** `toktickit`  
**Base / Target Staging Branch:** `lab3-staging`

---

## 1. Pull Requests I Authored (Reviewed by Peer Reviewer)

|  PR #   | Feature Branch                     | Target Branch  | Linked Issue                                                    | Reviewer Verdict | Merged By          |
| :-----: | :--------------------------------- | :------------- | :-------------------------------------------------------------- | :--------------: | :----------------- |
| **#32** | `feature/11-spec-and-tests`        | `lab3-staging` | Issue 11: Sprint 3 Engineering Contract & Test Planning         |    `APPROVED`    | Muhammad Asad Aziz |
| **#33** | `feature/12-auth-and-shell`        | `lab3-staging` | Issue 12: Authentication Foundation, User Migration & App Shell |    `APPROVED`    | Muhammad Asad Aziz |
| **#34** | `feature/13-staff-ticket-queue`    | `lab3-staging` | Issue 13: IT Staff Ticket Queue & Query System                  |    `APPROVED`    | Muhammad Asad Aziz |
| **#38** | `feature/14-staff-ticket-detail`   | `lab3-staging` | Issue 14: IT Staff Ticket Detail, Workflow & Notes              |    `APPROVED`    | Muhammad Asad Aziz |
| **#39** | `feature/15-admin-user-management` | `lab3-staging` | Issue 15: Administrator User Management & Account Safety        |    `APPROVED`    | Muhammad Asad Aziz |
| **#40** | `feature/16-e2e-polish-release`    | `lab3-staging` | Issue 16: E2E Test Suite, Responsive Polish & Release           |    `APPROVED`    | Muhammad Asad Aziz |

### Reviewer Comments Received & Author Responses

#### Issue 11: Sprint 3 Engineering Contract & Software Test Planning
- **Reviewer Comment:** Engineering contract files under `docs/features/11-spec-and-tests/` and test specifications in `docs/lab-03/tests.md` are very thorough and fully align with `Lab_03_labsheet.pdf` and SDS v1.0. Seed data in `prisma/seed.ts` seeds 11 accounts and 64 tickets with deterministic IDs. Please make sure the password validation rules in `tests.md` explicitly list all 6 complexity checks.
- **Author Response:** Updated `tests.md` to itemize all 6 password complexity rules (min 8 chars, uppercase, lowercase, digit, special character, and confirmation match). Thanks for catching that!

#### Issue 12: Authentication Foundation, User Migration & Application Shell Navigation
- **Reviewer Comment:** Authentication endpoints (`/login`, `/logout`, `/me`, `/change-password`), cookie-based sessions, and the responsive AppHeader look great. Tested invalid credentials and inactive accounts—both safely return 401 without leaking account existence. The mandatory password change view correctly intercepts users with `mustChangePassword: true` and blocks normal workspace tabs. All 21 Vitest tests pass. Approved!
- **Author Response:** Thank you for testing the anti-enumeration defense and forced password rotation intercept!

#### Issue 13: IT Staff Ticket Queue & List Queries
- **Reviewer Comment:** IT Staff Ticket Queue implementation is comprehensive. The 300ms debounce on the search input works smoothly, and multi-criteria filters for status, category, priority, and owner work simultaneously with pagination. Confirmed that Requesters attempting to call `/api/v1/staff/tickets` receive HTTP 403 Forbidden. The desktop table collapses into stacked cards on mobile with zero horizontal overflow.
- **Author Response:** Thanks for verifying the role-based 403 authorization guard and mobile card collapse.

#### Issue 14: IT Staff Ticket Detail, Operational Controls, Comments & Notes
- **Reviewer Comment:** Staff Ticket Detail features are fully verified. Claiming tickets sets the owner to the active staff member, IT Priority adjustments update the badge dynamically, and the Status Transition Matrix correctly prevents illegal status jumps. Crucially, I verified the confidentiality boundary: Public comments are visible to both Requester and Staff, while the amber Confidential Internal Notes section (with 🔒 lock icon) is completely absent from the Requester view and stripped from network responses. Also verified the "Problem Appears Resolved" button records the requester confirmation timestamp without closing the ticket prematurely.
- **Author Response:** Appreciate the careful audit of the internal notes confidentiality boundary and requester resolution indication rules!

#### Issue 15: Administrator User Management & Account Safety
- **Reviewer Comment:** User management is robust. Admin can search and filter the roster, create new users with single roles, and edit user details. Tested the two critical administrative safety invariants: an admin cannot deactivate their own account (BR-11), and deactivating the last active administrator is strictly blocked (BR-12). Also verified that resetting a user's initial password sets `mustChangePassword: true` so they are forced to rotate credentials upon next login.
- **Author Response:** Thanks for thoroughly testing the BR-11 and BR-12 safety invariants and temporary credential provisioning.

#### Issue 16: End-to-End Test Suite, Responsive Polish & Staged Release Verification
- **Reviewer Comment:** End-to-end verification and responsive polish look fantastic. All 3 Playwright test suites (`authentication.spec.ts`, `staff-ticket-flow.spec.ts`, and `user-administration.spec.ts`) pass cleanly on Chromium, full-page screenshot artifacts across Desktop, Tablet, and Mobile are saved in `artifacts/lab-03/screenshots/`, and automated assertions confirm zero horizontal scroll across all breakpoints. All 251 test cases pass across the workspace with 100% AC traceability. Staging is ready for production merge!
- **Author Response:** Thank you so much for the thorough review, guidance, and verification throughout Sprint 3!

---

## 2. Pull Requests I Reviewed for My Partner

|  PR #   | Partner's Branch                   | Target Branch  | Partner's Issue                                                 | My Review Verdict | Merged By        |
| :-----: | :--------------------------------- | :------------- | :-------------------------------------------------------------- | :---------------: | :--------------- |
| **#31** | `feature/11-spec-and-tests`        | `lab3-staging` | Issue 11: Sprint 3 Engineering Contract & Test Planning         |    `APPROVED`     | Al Xander Ybanez |
| **#32** | `feature/12-auth-and-shell`        | `lab3-staging` | Issue 12: Authentication Foundation, User Migration & App Shell |    `APPROVED`     | Al Xander Ybanez |
| **#33** | `feature/13-staff-ticket-queue`    | `lab3-staging` | Issue 13: IT Staff Ticket Queue & Query System                  |    `APPROVED`     | Al Xander Ybanez |
| **#35** | `feature/14-staff-ticket-detail`   | `lab3-staging` | Issue 14: IT Staff Ticket Detail, Workflow & Notes              |    `APPROVED`     | Al Xander Ybanez |
| **#36** | `feature/15-admin-user-management` | `lab3-staging` | Issue 15: Administrator User Management & Account Safety        |    `APPROVED`     | Al Xander Ybanez |
| **#37** | `feature/16-e2e-polish-release`    | `lab3-staging` | Issue 16: E2E Test Suite, Responsive Polish & Release           |    `APPROVED`     | Al Xander Ybanez |

### My Review Comments & Partner's Responses

#### Issue 11: Sprint 3 Engineering Contract & Software Test Planning
- **My Comment:** Specifications and test tables in `docs/lab-03/` match the course requirements and SDS v1.0. The seed script populates 11 users and 64 tickets idempotently. All clear to proceed.
- **Partner Response:** Thank you for reviewing the contract and seed specifications!

#### Issue 12: Authentication Foundation, User Migration & Application Shell Navigation
- **My Comment:** Verified authentication workflows. Passwords validate against all 6 complexity criteria, sessions are managed securely via HttpOnly cookies, and the header renders appropriate role pills with Zen Green styling.
- **Partner Response:** Thank you! All feedback incorporated and verified against unit tests.

#### Issue 13: IT Staff Ticket Queue & List Queries
- **My Comment:** The ticket queue search, category filter, and status filter interact smoothly without jitter. Pagination toolbar handles page shifts accurately, and Requesters are blocked with 403 Forbidden. Approved!
- **Partner Response:** Thanks for checking the queue query parameters and role guards.

#### Issue 14: IT Staff Ticket Detail, Operational Controls, Comments & Notes
- **My Comment:** Confirmed that ticket ownership claim, priority updates, and status transitions adhere to the SDS transition matrix. Checked that internal notes have distinct amber styling and are omitted from non-staff responses.
- **Partner Response:** Appreciate the verification of the status state machine and note privacy rules.

#### Issue 15: Administrator User Management & Account Safety
- **My Comment:** Validated user roster interactions and safety invariants. Both BR-11 (self-deactivation block) and BR-12 (last active admin protection) prevent lockout scenarios. Password reset properly flags the target account.
- **Partner Response:** Thank you for testing the administrative edge cases and safety alerts.

#### Issue 16: End-to-End Test Suite, Responsive Polish & Staged Release Verification
- **My Comment:** All Playwright E2E browser tests pass across all roles and viewports. No horizontal scroll detected on mobile devices, touch targets comply with 44px minimums, and screenshot deliverables are fully generated.
- **Partner Response:** Thank you for the detailed peer review and release verification!
