# Lab 2 — Peer Review Record

**Author:** Al Xander James Codino Ybanez — 67070503450 — GitHub: [@ShortXander101205](https://github.com/ShortXander101205)  
**Peer Reviewer:** Muhammad Asad Aziz — 67070503472 — GitHub: [@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz)  
**Repository:** `toktickit`

---

## 1. Pull Requests I Authored (Reviewed by Peer Reviewer)

| PR # | Feature Branch | Target Branch | Linked Issue | Reviewer Verdict | Merged By |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **#17** | `feature/5-spec-and-tests` | `lab2-staging` | Issue 5: Sprint 2 Spec & Test Planning | `APPROVED` | Muhammad Asad Aziz |
| **#18** | `feature/6-data-and-requester` | `lab2-staging` | Issue 6: Data Model, Seed & Requester Context | `APPROVED` | Muhammad Asad Aziz |
| **#19** | `feature/7-create-ticket` | `lab2-staging` | Issue 7: Create Ticket Workflow & Tests | `APPROVED` | Muhammad Asad Aziz |
| **#20** | `feature/8-my-tickets` | `lab2-staging` | Issue 8: My Tickets Screen & Ownership | `APPROVED` | Muhammad Asad Aziz |
| **#21** | `feature/9-ticket-detail-attachments` | `lab2-staging` | Issue 9: Ticket Detail & Attachment Soft Removal | `APPROVED` | Muhammad Asad Aziz |
| **#22** | `feature/10-ui-polish-e2e` | `lab2-staging` | Issue 10: Zen Green Polish & E2E Tests | `APPROVED` | Muhammad Asad Aziz |

### Reviewer Comments Received & Author Responses

#### Issue 5: Sprint 2 Engineering Specification & Test Plan
- **Reviewer Comment:** All seems good with the specifications, but just needed some minor changes to `reviewer.md`.
- **Author Response:** Files have been approved, and the requested minor changes were made to complete Issue 5.

#### Issue 6: Data Model Increment, Seed Data, and Development Requester Context
- **Reviewer Comment:** Everything works fine when running on my computer. All acceptance criteria and seed protocols have been met.
- **Author Response:** Tests were completed, and all database models and seed records worked according to protocols.

#### Issue 7: Create Ticket Workflow (API, Form UI, Validation & Tests)
- **Reviewer Comment:** Everything looks alright. Manual testing shows that I can upload files under 5 MB, larger files are correctly rejected, and errors display properly if the server is offline.
- **Author Response:** Thank you for the confirmation and verifying offline state preservation.

#### Issue 8: My Tickets Screen (List, Filters, Search, Pagination & Ownership)
- **Reviewer Comment:** You quickly resolved the double "+" symbols on the create button, but when viewing in phone mode, the accounts icon near the top right did not shrink. After that fix, everything is fully verified: all tests pass, requester isolation is strictly enforced, search debouncing works, empty/no-results states render gracefully, and the table collapses into stacked cards on mobile. Approved and merged into `lab2-staging`!
- **Author Response:** Fixed the mobile account icon styling in `AppHeader.tsx`. Thanks so much for the thorough review and merge.

#### Issue 9: Requester Ticket Detail & Attachment Lifecycle (View Mode & Soft Removal)
- **Reviewer Comment:** Everything is fully verified and working smoothly. All integration and component tests are passing. Confirmed the detail view remains strictly read-only, 5 MB and format limits are enforced, and the soft-removal modal correctly updates items to grayed-out metadata rows while freeing up the 5-file active quota.
- **Author Response:** I really appreciate the detailed tests and review on soft-deletion and quota bounds.

#### Issue 10: Zen Green UI Polish, Responsive Verification & E2E Testing
- **Reviewer Comment:** Everything looks brilliant. Verified that the frontend matches Zen Green Design System color tokens, all pages adapt down to mobile with zero horizontal overflow, and the Playwright automated E2E test suite runs flawlessly.
- **Author Response:** Wonderful feedback, thanks so much for the review and verification.

---

## 2. Pull Requests I Reviewed for My Partner

| PR # | Partner's Branch | Target Branch | Partner's Issue | My Review Verdict | Merged By |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **#16** | `feature/5-spec-and-tests` | `lab2-staging` | Issue 5: Sprint Spec & Test Contracts | `APPROVED` | Al Xander Ybanez |
| **#17** | `feature/6-data-and-requester` | `lab2-staging` | Issue 6: Schema, Seeding & Requester Context | `APPROVED` | Al Xander Ybanez |
| **#18** | `feature/7-create-ticket` | `lab2-staging` | Issue 7: Create Ticket Form & Sequence Gen | `APPROVED` | Al Xander Ybanez |
| **#19** | `feature/8-my-tickets` | `lab2-staging` | Issue 8: My Tickets List, Filtering & Isolation | `APPROVED` | Al Xander Ybanez |
| **#20** | `feature/9-ticket-detail-attachments` | `lab2-staging` | Issue 9: Ticket Details & Attachment Handling | `APPROVED` | Al Xander Ybanez |
| **#21** | `feature/10-ui-polish-e2e` | `lab2-staging` | Issue 10: Zen Green Theme Polish & E2E Suites | `APPROVED` | Al Xander Ybanez |

### My Review Comments & Partner's Responses

#### Issue 5: Sprint 2 Engineering Specification & Test Plan
- **My Comment:** Everything is approved, only the small changes to the paths are needed.
- **Partner Response:** I have changed my files to no longer use hardwired paths and be relative instead.

#### Issue 6: Data Model Increment, Seed Data, and Development Requester Context
- **My Comment:** Test procedures were done on my computer, and all matched with expected results.
- **Partner Response:** Testing on my side yielded passing results. Criteria has been met.

#### Issue 7: Create Ticket Workflow (API, Form UI, Validation & Tests)
- **My Comment:** Implementations of Issue 7 was done accordingly, the backend validation, UI, and APIs were all covered.
- **Partner Response:** Thank you very much!

#### Issue 8: My Tickets Screen (List, Filters, Search, Pagination & Ownership)
- **My Comment:** This branch completely fulfills Issue 8. The My Tickets page works smoothly, working filters and paginations. It also keeps the tickets made.
- **Partner Response:** Thank you for reviewing.

#### Issue 9: Requester Ticket Detail & Attachment Lifecycle (View Mode & Soft Removal)
- **My Comment:** Issue 9 implementation looks great. Backend isolation and soft-delete lifecycles work as expected, the UI stays strictly read-only, and test coverage is complete.
- **Partner Response:** Thank you for the review, confirmed backend isolation and soft-delete lifecycles work as expected.

#### Issue 10: Zen Green UI Polish, Responsive Verification & E2E Testing
- **My Comment:** The branch cleanly applies the Zen Green theme across desktop, tablet, and mobile viewports, adds a solid end-to-end Playwright test suite for the full user flow, and saves complete screenshot evidence while staying strictly within the project scope.
- **Partner Response:** Thanks for peer reviewing all of this for me, it means a lot.
