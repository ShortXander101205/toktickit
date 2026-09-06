**Document:** `docs/lab-02/ai-use.md`  
**Author:** Al Xander James Codino Ybanez — 67070503450 — GitHub: [@ShortXander101205](https://github.com/ShortXander101205)  
**Peer Reviewer:** Muhammad Asad Aziz — 67070503472 — GitHub: [@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz)  
**Course:** CPE 334 Software Engineering — Lab 2 (Sprint 2: Requester MVP)  
**Repository:** `toktickit`

---

## 1. AI Specification & Coding Model Information

During Lab 2, we used AI as an interactive pair programmer following the **Spec-Driven Development (SDD)** process described in [`AGENTS.md`](../../AGENTS.md).

| Property | Details |
| :--- | :--- |
| **Primary AI Tool** | **Google Antigravity IDE** |
| **Models Used** | • **Gemini 3.8 Flash (High) / Gemini 2.0 Flash**: Used for analyzing the codebase, writing code, debugging tests, and checking git diffs.<br/>• **Claude 3.5 Sonnet**: Used for drafting contracts and reviewing specifications against course PDFs. |
| **AI Roles & Tasks** | • **Spec Auditor**: Checked feature contracts against requirements and prevented extra features from being added.<br/>• **Builder**: Wrote code based strictly on approved markdown contracts.<br/>• **QA & Tester**: Created and ran tests (Vitest and Playwright) to verify every change. |
| **Main Rule Enforced** | **Strict Closed-World Rule**: If a requirement was not mentioned in the docs, the AI was not allowed to guess. It had to ask the developer first (e.g., the 20 Zen Green UI questions in [`ui-spec.md`](./ui-spec.md)). |

---

## 2. Key Prompt Table

The table below shows 8 key prompts used across different phases of Lab 2, from initial planning to final end-to-end testing.

| # | Phase | Goal | Prompt Summary | AI Response & Output | Value / What It Solved |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Sprint Kickoff** | Check requirements and baseline before coding. | *"Read Lab_02_labsheet.pdf, TokTickIT-System-Level-SDS-v1.0.pdf, and Lab 1 code. Do not write code yet. Report baseline status, 3-tier rules, feature map, business/security rules (ticket numbers, user filter, attachment limits, soft-delete, isolation), and Zen Green colors. Cite IDs and state PASS or BLOCKED."* | Listed all facts vs. missing details, confirmed requirements, and passed the Evidence Gate. | Created [`source-evidence.md`](./source-evidence.md) and [`poc-scope-and-issues.md`](./poc-scope-and-issues.md), setting clear sprint boundaries. |
| **2** | **UI Design Decisions** | Choose missing UI details by answering questions instead of letting AI guess. | *"Audit the System-Level SDS against UI specs. Separate facts, missing decisions, and recommended defaults. Do not edit files yet. Interview me across 5 categories: Typography, Tables/Inputs, Buttons/Breakpoints, Validation States, and Accessibility. Wait for my answer after each category."* | Asked questions category-by-category and saved my answers as 20 design decisions (`DEC-UI-01` to `DEC-UI-20`). | Created [`ui-spec.md`](./ui-spec.md), making sure all UI styling was agreed upon before coding. |
| **3** | **Contract Drafting** | Draft the feature contract for Issue 7 (Create Ticket Form). | *"Draft docs/features/create-ticket/contract.md for Issue 7. Define form inputs, auto ticket numbers (TKT-YYYY-NNNNN), attachment rules (max 5 files, 5MB, JPG/PNG/WEBP/PDF), saving form input if API fails, and test plan. Do not add IT staff fields or comments."* | Created the full Feature 7 contract with form validation rules, database sequence logic, and error handling. | Produced [`create-ticket/contract.md`](../features/create-ticket/contract.md) matching requirements `FR-04..07` and `BR-01..05`. |
| **4** | **Spec Review & Security** | Review Issue 8 contract for security and edge cases. | *"Review docs/features/my-tickets/contract.md. Check: 1. Requester isolation (use x-requester-id header, ignore ?requesterId= in URL); 2. Search debounce (300ms); 3. Pagination math (page 0, totalPages=0 when totalCount=0); 4. Empty vs. No-Results state."* | Found security loophole where URL query could spoof identity, and fixed pagination math bugs before coding began. | Prevented data leaks between requesters (`BR-08`, `AC-04-02`) and fixed pagination math. |
| **5** | **Implementation & Tests** | Plan implementation and write failing tests for Issue 8 (My Tickets). | *"Read AGENTS.md and Feature 8 contract. Create implementation plan: Express controller for GET /api/tickets, Prisma query (map IT Priority UNASSIGNED to null), search debounce, table vs mobile cards, and test cases for my-tickets.api.test.ts and MyTickets.test.tsx."* | Outlined code changes and wrote failing test suites covering 12 backend test cases and 32 frontend test cases. | Followed Test-Driven Development (TDD) and ensured all acceptance criteria (`AC-04-01` to `AC-04-06`) were tested. |
| **6** | **Soft-Delete & File Rules** | Implement attachment soft-delete and file rules for Issue 9. | *"Draft and verify Feature 9 contract. Make sure DELETE /api/attachments/:id sets isRemoved=true, saves a reason (5+ chars), deletes the file from disk, blocks future downloads (404/410), and does not count removed files toward the 5-file limit."* | Built delete route, disk removal logic, and download blocking. Verified rules with test cases. | Fulfilled `FR-10..15`, `BR-06..08`, and `AC-05-04..06`, proving active vs. removed file limits work. |
| **7** | **Responsive UI Bug Fix** | Fix layout issues on small mobile screens. | *"When viewing the site in phone mode, every UI element correctly shrinks except for the accounts icon near the top right. Provide a fix for this. Ensure layout fits Desktop (>=992px), Tablet (768-991px), and Mobile (<768px cards, touch target >=44px, no horizontal scroll)."* | Found fixed width in `AppHeader.tsx` and updated CSS to make the header flexible on mobile screens. | Satisfied `DEC-UI-09`, `DEC-UI-10`, and fixed mobile layout without horizontal scrollbars. |
| **8** | **E2E Tests & Screenshots** | Run full end-to-end tests and take screenshots across viewports. | *"Write e2e/lab-02/requester-ticket-flow.spec.ts to test: select user, create ticket with attachment, search list, check details, soft-remove attachment with reason, and switch user isolation. Save full-page screenshots for Desktop, Tablet, and Mobile in artifacts/lab-02/screenshots/."* | Created Playwright E2E test script and captured full-page screenshots for all 3 viewports. | Tested full user lifecycle (`AC-10-01` to `AC-10-05`) and generated 9 screenshot proofs for the report. |

---

## 3. My Reflection

Using an AI coding tool with Spec-Driven Development (SDD) changed how I write code. Instead of expecting the AI to build everything from a simple prompt, I treated it like a junior developer that needs clear boundaries. At the beginning of the lab, I noticed that if I did not give strict rules, the AI would try to add extra, unneeded features—like real login screens, passwords, and admin tools that were not part of Lab 2. By writing a contract first and enforcing the closed-world rule (no guessing), I kept the project on track. The AI only built what was approved in the specification, adhered to the Zen Green color scheme, and did not add out-of-scope code.

This experience also showed me why automated testing is necessary. You cannot just ask the AI if the code works and take its word for it. When reviewing code diffs, we found several real bugs: the AI initially allowed users to view other people's tickets by changing the URL parameter, returned `totalPages: 1` instead of `0` when there were no tickets, and counted deleted files toward the 5-attachment limit. Writing automated tests with Vitest and testing the whole user flow with Playwright allowed us to catch and fix these problems right away. In the end, having clear specifications and automated tests gave us confidence that our application worked correctly and securely.
