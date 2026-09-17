# Lab 3 — AI Assistance & Prompt Reflection Record

**Document:** `docs/lab-03/ai-use.md`  
**Author:** Al Xander James Codino Ybanez — 67070503450 — GitHub: [@ShortXander101205](https://github.com/ShortXander101205)  
**Peer Reviewer:** Muhammad Asad Aziz — 67070503472 — GitHub: [@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz)  
**Course:** CPE 334 Software Engineering — Lab 3 (Sprint 3: Users, Roles, IT Staff Ticketing, and Admin Screens)  
**Repository:** `toktickit`

---

## 1. AI Specification & Coding Model Information

During Lab 3, we continued employing AI as an interactive pair programming partner strictly governed by the **Spec-Driven Development (SDD)** lifecycle and engineering contract methodology defined in [`AGENTS.md`](../../AGENTS.md).

| Property | Details |
| :--- | :--- |
| **Primary AI Tool** | **Google Antigravity IDE** |
| **Models Used** | • **Gemini 3.8 Flash (High) / Gemini 2.0 Flash**: Codebase inspection, Prisma migrations, backend/frontend implementation, test authoring (Vitest, Supertest, Playwright), and debugging.<br/>• **Claude 3.5 Sonnet**: Authoring and auditing engineering contracts against course specifications (`Lab_03_labsheet.pdf`, `TokTickIT-System-Level-SDS-v1.0.pdf`). |
| **AI Roles & Tasks** | • **Spec Auditor**: Validates feature contracts against course specifications, preventing scope expansion (e.g., blocking self-registration or external SMTP).<br/>• **Builder Agent**: Implements application routes, Prisma migrations, and UI components adhering strictly to approved contracts.<br/>• **QA & Verification Agent**: Runs test suites (Vitest, Supertest, Playwright) to guarantee 100% test pass rates and zero regressions. |
| **Guiding Invariant** | **Strict Closed-World Rule**: If a requirement is silent or ambiguous, the AI agent must never hallucinate assumptions; it must stop and seek developer confirmation. |

---

## 2. Key Prompt Table

The table below logs 8 representative prompts across all phases of Sprint 3 (Specification, Implementation, Debugging, Testing, and Review), mapped directly to the 60-point grading rubric in Section 14 (Part 4) of `Lab_03_labsheet.pdf`:

| # | Category | Target Issue / Goal | Prompt Summary | AI Output Summary | Evaluation |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Spec** | Issue 11: Sprint 3 Specification & Test Planning | *"Read Lab_03_labsheet.pdf, TokTickIT-System-Level-SDS-v1.0.pdf, and Sprint 2 baseline. Author docs/lab-03/specification.md, tests.md, and poc-scope-and-issues.md defining FR-16..29, BR-09..14, and 5 bounded sprint issues. Do not write application code yet."* | Authored complete Sprint 3 Feature SDS, STS with 27 planned tests, and 5 bounded issues without scope creep. | **Useful**: Established authoritative engineering contracts and prevented out-of-scope feature creep. |
| **2** | **Code** | Issue 12: User Model & JWT Auth Foundation | *"Update Prisma schema with passwordHash, role (REQUESTER, IT_STAFF, ADMINISTRATOR), mustChangePassword, and isActive. Seed 6 standard test accounts with Argon2id. Implement POST /api/v1/auth/login and GET /me with httpOnly JWT cookies."* | Created migration, updated seed script with argon2 hashes, and implemented auth routes with generic 401 error responses. | **Useful**: Delivered secure authentication baseline matching BR-09 without leaking account existence. |
| **3** | **Code** | Issue 12: Forced First-Login Password Rotation | *"Implement POST /api/v1/auth/change-password and client PasswordChangeModal. Enforce 8+ chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char. Add dynamic visual checklist and AppShell redirection guard blocking navigation until changed."* | Created password validation utility, modal with live green/red checklist, and route redirection guard enforcing rotation. | **Useful**: Satisfied FR-18 and BR-10 with clean client-side feedback and robust server-side validation. |
| **4** | **Test** | Issue 13: Staff Queue API & Filtering/Sorting | *"Create Vitest suite staff-tickets.api.test.ts testing GET /api/v1/staff/tickets. Cover search, category/status/priority filters, unassigned-only toggle, SLA urgency sort, IT Staff authorization, and Requester 403 Forbidden blocking."* | Implemented 18 backend tests with Supertest verifying all query combinations, RBAC security guards, and pagination metadata. | **Useful**: Confirmed strict RBAC enforcement (Requester 403 block) before building UI components. |
| **5** | **Code** | Issue 14: IT Staff Operational Controls | *"Implement POST /claim, PATCH /priority, and PATCH /status in staff ticket routes. Enforce status state machine (Draft -> Submitted -> Under Review -> In Progress -> Resolved -> Closed), preventing invalid transitions with 400 Bad Request."* | Built status transition validator, claim shortcut logic, and optimistic UI updates with Zen Green badge feedback. | **Useful**: Accurately mapped the complete lifecycle state machine and blocked illegal status jumps. |
| **6** | **Review** | Issue 14: Comments Thread & Private Internal Notes | *"Audit comments implementation in ticket detail. Ensure isInternal: true notes are styled in amber (#F59E0B), restricted to IT Staff/Admin, and completely omitted from Requester API payloads and DOM to prevent data leaks."* | Inspected routes and serializers; confirmed internal notes are filtered out at the Prisma query level for requesters. | **Useful**: Guaranteed data privacy invariant (AC-06-03), preventing confidential notes from leaking to requesters. |
| **7** | **Debug** | Issue 15: Administrator Safety Invariants (BR-11 & BR-12) | *"Review UserManagement deactivation and demotion logic. Verify BR-11 (prevent admin self-deactivation) and BR-12 (prevent deactivating or demoting the last active admin). Return 400 with specific invariant error messages."* | Identified missing atomic count check in Prisma transaction for BR-12; added transactional count validation and UI button disabling. | **Corrected**: Fixed potential race condition where the last administrator could be demoted via concurrent requests. |
| **8** | **Test** | Issue 16: Playwright E2E Suite & Responsive Polish | *"Author Playwright E2E specs in e2e/lab-03/ covering Auth, Staff Queue, Staff Detail, and User Management across Desktop, Tablet, and Mobile. Capture 35 full-page PNG screenshots in artifacts/lab-03/screenshots/ matching Section 14 rubric."* | Created 3 comprehensive E2E specs, fixed viewport state bleed across steps, and captured all 35 required screenshots with zero overflow. | **Partially Useful**: Required manual fix for viewport retention and dual desktop/mobile table row locator ambiguity. |

---

## 3. My Reflection

Developing TokTickIT Sprint 3 with AI assistance under the Spec-Driven Development (SDD) framework fundamentally transformed my approach to software engineering. In earlier labs, AI tools often functioned as conversational autocomplete engines, frequently proposing conflicting abstractions or out-of-scope features such as self-registration forms and external email services. In Sprint 3, anchoring the AI strictly to our engineering contract files ([`specification.md`](./specification.md), [`ui-spec.md`](./ui-spec.md), and [`api-spec.md`](./api-spec.md)) completely eliminated architectural drift and enforced rigorous boundaries.

The AI pair programming workflow excelled in areas involving repetitive boilerplate, schema synchronization, and comprehensive test authoring. For example, scaffolding the Prisma migration to replace simulated requester headers with persistent `User` records, Argon2id hashing, and enum-backed roles (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`) was handled swiftly and error-free. Similarly, the AI proved remarkably adept at generating extensive Vitest and Supertest suites covering complex parameter matrices—such as staff queue search, status filters, priority filtering, and SLA urgency sorting—ensuring that every acceptance criterion had automated verification before manual testing began.

However, the AI demonstrated noticeable limitations when reasoning about stateful side effects, responsive DOM duplications, and subtle business invariants. During the implementation of Issue 15, when tasked with user deactivation, the AI initially implemented a simple check against the current user ID to satisfy BR-11 (self-deactivation block), but completely overlooked BR-12 (last-admin protection) until explicitly prompted. Furthermore, during the Playwright E2E implementation in Issue 16, the AI struggled with dual-rendered DOM structures where our responsive design simultaneously instantiated both desktop `<table>` rows and mobile cards. This triggered Playwright strict-mode locator violations until I stepped in to specify explicit scoped locators. Another subtle bug emerged in the password rotation flow: the backend route returned only a message string, causing the client `AuthContext` to clear the local user object and unintentionally log the user out. Detecting and rectifying these regressions required human oversight and deep contextual debugging.

Ultimately, Spec-Driven Development proved to be the decisive factor in our success. By establishing immutable specifications, Given-When-Then acceptance criteria, and the Strict Closed-World Rule before generating code, the AI became an exceptionally disciplined execution partner. Rather than debating architectural decisions during implementation, we used the contracts as objective truth, resulting in a cohesive multi-role application backed by 251 passing automated tests and zero regressions.

---

*(Word Count: 382 words — adheres strictly to the 300–500 word guideline in Section 14 Part 4)*
