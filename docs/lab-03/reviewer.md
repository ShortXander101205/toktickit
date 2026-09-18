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
- **Reviewer Comment:** All authoritative Sprint 3 engineering contract documents and directory scaffolding have been authored and verified against `Lab_03_labsheet.pdf`, `TokTickIT-System-Level-SDS-v1.0.docx`, and our project scope.
- **Author Response:** Thank you for the helpful review.

#### Issue 12: Authentication Foundation, User Migration & Application Shell Navigation
- **Reviewer Comment:** I tried running manually testing this on my computer, but found out that some parts were missing, such as the error messages not displaying once the incorrect passwords were inputted. npm tests on the server would fail with error 400 or similar. I believed this isn't a me problem, as I have correctly reset my database and seeded your data.
  
  Reviewing this code for a second time, Prisma schema migration, server auth endpoints, frontend components, and automated test logs for Issue 12 are verified and all implementation requirements are satisfied. All my manual tests have passed. I saw the login screen, the new password screen, the requester role, and the correct UX.
- **Author Response:** Thanks for running those manual tests and catching those issues earlier. I updated the implementation and test coverage to make sure everything aligned with the requirements. Thank you for the multiple reviews.

#### Issue 13: IT Staff Ticket Queue & List Queries
- **Reviewer Comment:** I have reviewed the code, Prisma schema updates, server endpoints, frontend components, and automated test logs for Issue 13 and verified that all implementation requirements are satisfied. My manual UI tests have all passed.
- **Author Response:** Thank you for the review.

#### Issue 14: IT Staff Ticket Detail, Operational Controls, Comments & Notes
- **Reviewer Comment:** I have reviewed the code, Prisma schema updates, server endpoints, frontend components, and automated test logs for PR [#4](https://github.com/ShortXander101205/toktickit/issues/4) (Issue 14) and verified that all implementation requirements are satisfied. Manual testing have all passed. making comments, changing ticket details, the whole shebang.
- **Author Response:** I have completed the fixes on the implementations and PR. Thank you for reviewing and your guidance.

#### Issue 15: Administrator User Management & Account Safety
- **Reviewer Comment:** I have reviewed the code, I verified that all implementation requirements are satisfied: the `/api/v1/admin/users/*` backend endpoints deliver user search, role filtering, account creation with initial passwords, account updates, and password resets while strictly enforcing business safety rules; direct REST API requests by unauthorized roles (REQUESTER and IT_STAFF) are rejected with 403 Forbidden; the Zen Green User Management dashboard and slideouts render smoothly; and all npm tests pass cleanly following `npx prisma migrate reset --force`. The only minor bug would be the double plus signs on the create button, but other than that, it looks fine.
- **Author Response:** Thanks for the deep review done on my program, I appreciate it a lot!!!!!!

#### Issue 16: End-to-End Test Suite, Responsive Polish & Staged Release Verification
- **Reviewer Comment:** All looks good. Only thing that is left is completing `ai-use.md` and `reviewer.md`.
- **Author Response:** Thank you so much for the review. I will finish up my `ai-use.md` and `reviewer.md` afterwards, I appreciate the comment.

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
