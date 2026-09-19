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

- **My Comment:** Establishes the engineering contracts, UI design specifications, and software test planning for Lab 3.
- **Partner Response:** Thanks for reviewing.

#### Issue 12: Authentication Foundation, User Migration & Application Shell Navigation

- **My Comment:** npm tests failed on my server.
- **Partner Response:** I have made changes to my migration files, please run them again
- **My Comment:** I ran manual tests across different authentication cases, and everything worked as expected. It passed the review accordingly and it is ready for merging.
- **Partner Response:** Thank you for your patience on reviewing!

#### Issue 13: IT Staff Ticket Queue & List Queries

- **My Comment:** I am having issues with the server, I am unable to reset the database. Therefore, the npm test failed.
- **Partner Response:** I have fixed the issues with prisma migration, please recheck for me
- **My Comment:** The new implementation has fixed the previous issue, and manual testing has been approved. All implementations are done.
- **Partner Response:** Thank you for reviewing!

#### Issue 14: IT Staff Ticket Detail, Operational Controls, Comments & Notes

- **My Comment:** Issue 14 gives IT Staff a detail screen to claim tickets, set priorities, and update statuses. It also adds two comment threads.
- **Partner Response:** Thanks for reviewing, it means a lot!

#### Issue 15: Administrator User Management & Account Safety

- **My Comment:** Issue 15 is complete with admin user management screens, account safety protections, and all tests passing.
- **Partner Response:** Thank you for your testing and review!

#### Issue 16: End-to-End Test Suite, Responsive Polish & Staged Release Verification

- **My Comment:** The final issue looks good.
- **Partner Response:** Thank you for reviewing and working with me for lab 3!
