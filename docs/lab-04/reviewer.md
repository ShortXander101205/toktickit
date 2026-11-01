# Lab 4 — Peer Review Record

**Author:** Al Xander James Codino Ybanez — 67070503450 — GitHub: [@ShortXander101205](https://github.com/ShortXander101205)  
**Peer Reviewer:** Muhammad Asad Aziz — 67070503472 — GitHub: [@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz)  
**Repository:** `toktickit`  
**Base / Target Staging Branch:** `lab4-staging`

---

## 1. Pull Requests I Authored (Reviewed by Peer Reviewer)

|  PR #   | Feature Branch                         | Target Branch   | Linked Issue                                                                                     | Reviewer Verdict | Merged By          |
| :-----: | :------------------------------------- | :-------------- | :----------------------------------------------------------------------------------------------- | :--------------: | :----------------- |
| **#41** | `feature/17-spec-and-tests`            | `lab4-staging`  | Issue 17: Sprint 4 Engineering Contract, Specifications & Software Test Planning                 |    `APPROVED`    | Muhammad Asad Aziz |
| **#42** | `feature/18-actions-taken-foundation`  | `lab4-staging`  | Issue 18: Actions Taken Data Model, Migration, Seed & Backend APIs                              |    `APPROVED`    | Muhammad Asad Aziz |
| **#43** | `feature/19-actions-taken-ui`          | `lab4-staging`  | Issue 19: Actions Taken UI, Ticket Detail Integration & Access Control                          |    `APPROVED`    | Muhammad Asad Aziz |
| **#44** | `feature/20-ticket-workflow`           | `lab4-staging`  | Issue 20: Ticket Status Lifecycle, Concurrency & Resolution Gate                                |    `APPROVED`    | Muhammad Asad Aziz |
| **#45** | `feature/21-role-dashboards`           | `lab4-staging`  | Issue 21: Role-Appropriate Dashboards & Queue Drill-Downs                                        |    `APPROVED`    | Muhammad Asad Aziz |
| **#46** | `feature/22-regression-polish-release` | `lab4-staging`  | Issue 22: Final Regression, Accessibility, E2E Polish & Staged Release Verification              |    `APPROVED`    | Muhammad Asad Aziz |

---

## 2. Reviewer Comments Received & Author Responses

### Issue 17: Sprint 4 Engineering Contract, Specifications & Software Test Planning
- **Reviewer Comment:** Reviewed all contract files under `docs/lab-04/` (`specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`, `poc-scope-and-issues.md`). All requirements (FR-01..FR-06, BR-01..BR-14) match the course requirements in `Lab_04_labsheet.pdf` and system SDS. The 5 bounded sprint issues provide clear scope boundaries and merge order.
- **Author Response:** Thank you for verifying the contract documents and baseline test specifications. Proceeding with foundation implementation for Issue 18.

### Issue 18: Actions Taken Data Model, Migration, Seed & Backend APIs
- **Reviewer Comment:** Prisma migration for `ActionTaken` model applies cleanly with optimistic concurrency `version`, auto-performer derivation from JWT session (ignoring client payload spoofing), and ascending chronological retrieval. Tested endpoints with Supertest; all 18 backend tests pass cleanly.
- **Author Response:** Thank you for the review and confirmation of the migration and session derivation rules.

### Issue 19: Actions Taken UI, Ticket Detail Integration & Access Control
- **Reviewer Comment:** Verified frontend implementation in `ActionsTakenSection.tsx`. Modal dialog opens and edits line-items, auto-performer badge displays authenticated user name and role, and conditional follow-up note field toggles dynamically when `followUpRequired` is checked. Verified that Requesters only see read-only views without "+ Add Action" or "Edit" buttons. All 11 component tests pass.
- **Author Response:** Thanks for checking both staff and requester perspectives. Accessibility and keyboard modal dismissal have been verified.

### Issue 20: Ticket Status Lifecycle, Concurrency & Resolution Gate
- **Reviewer Comment:** Verified 8-state transition matrix enforcement. Attempting to resolve a ticket with 0 actions taken is blocked both in the UI and with HTTP 400 Bad Request on the backend. Requester advisory confirmation allows the user to indicate resolution while preserving status until staff review. The non-destructive 409 conflict banner renders with in-place refresh, preserving draft input. All 23 tests pass.
- **Author Response:** Thank you for verifying the resolution gate and concurrency recovery flow.

### Issue 21: Role-Appropriate Dashboards & Queue Drill-Downs
- **Reviewer Comment:** Tested role dashboards across all three roles. Requester dashboard strictly isolates personal tickets and excludes other users' data. IT Staff dashboard displays operational queue metrics with unassigned counts and direct filter drill-downs. Administrator dashboard displays user account statistics alongside operational metrics. Direct RBAC navigation rejection confirmed.
- **Author Response:** Thank you for testing the role metrics and drill-down links.

### Issue 22: Final Regression, Accessibility, E2E Polish & Staged Release Verification
- **Reviewer Comment:** Full regression test pipeline executed: Server tests 100% pass (177/177), Client tests 100% pass (129/129), and Playwright E2E suites pass across all 3 scenarios (`full-lifecycle.spec.ts`, `concurrency.spec.ts`, `dashboards.spec.ts`). Accessibility audit verifies skip links, visible focus rings, and Escape key modal dismissal. Zero horizontal scroll across all breakpoints. All screenshot artifacts properly cataloged under `artifacts/lab-04/screenshots/`. Release verification report `docs/lab-04/release-verification.md` is complete and verified. Ready to merge into `main`.
- **Author Response:** Thank you for the comprehensive peer review across all Lab 4 deliverables. Staged release verified and certified.

---

## 3. Pull Requests I Reviewed (Authored by Peer Reviewer)

|  PR #   | Peer Author        | Peer Feature Branch                    | Reviewer Verdict | Detailed Review Findings                                                                                                                                                                             |
| :-----: | :----------------- | :------------------------------------- | :--------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#41** | Muhammad Asad Aziz | `feature/17-spec-and-tests`            |    `APPROVED`    | Verified Sprint 4 contract documents and test plan against lab sheet and system architecture. Traceability matrix and test IDs are sound.                                                            |
| **#42** | Muhammad Asad Aziz | `feature/18-actions-taken-foundation`  |    `APPROVED`    | Verified Prisma migration for `ActionTaken` model, optimistic concurrency version column, session-derived performer attribution, and backend API routes. All server tests passing.                   |
| **#43** | Muhammad Asad Aziz | `feature/19-actions-taken-ui`          |    `APPROVED`    | Verified Actions Taken line-item table, auto-performer display, conditional follow-up note toggle, and read-only views for Requesters. Verified component tests pass cleanly.                        |
| **#44** | Muhammad Asad Aziz | `feature/20-ticket-workflow`           |    `APPROVED`    | Verified Resolution Gate logic blocking premature resolution, state transition matrix validation, requester advisory resolution flow, and 409 conflict banner handling.                              |
| **#45** | Muhammad Asad Aziz | `feature/21-role-dashboards`           |    `APPROVED`    | Verified Requester data isolation, IT Staff queue metric cards with filter drill-downs, and Admin user account statistics. Supertest and component test suites passing 100%.                         |
| **#46** | Muhammad Asad Aziz | `feature/22-regression-polish-release` |    `APPROVED`    | Verified complete test execution pipeline across server, client, and Playwright E2E suites. Verified WCAG 2.1 AA accessibility checklist, screenshot catalog, and final release verification documentation. |
