# Lab 3 — AI Assistance & Prompt Reflection Record

**Document:** `docs/lab-03/ai-use.md`  
**Author:** Al Xander James Codino Ybanez — 67070503450 — GitHub: [@ShortXander101205](https://github.com/ShortXander101205)  
**Peer Reviewer:** Muhammad Asad Aziz — 67070503472 — GitHub: [@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz)  
**Course:** CPE 334 Software Engineering — Lab 3 (Sprint 3: Users, Roles, IT Staff Ticketing, and Admin Screens)  
**Repository:** `toktickit`

---

## 1. AI Specification & Coding Model Information

During Lab 3, we continue employing AI as an interactive pair programming partner strictly governed by the **Spec-Driven Development (SDD)** lifecycle and engineering contract methodology defined in [`AGENTS.md`](../../AGENTS.md).

| Property              | Details                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary AI Tool**   | **Google Antigravity IDE**                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Models Used**       | • **Gemini 3.8 Flash (High) / Gemini 2.0 Flash**: Codebase inspection, test authoring, schema migrations, and backend/frontend development.<br/>• **Claude 3.5 Sonnet**: Authoring and auditing engineering contracts against course specifications.                                                                                                                                                                                                |
| **AI Roles & Tasks**  | • **Spec Auditor**: Validates feature contracts against `Lab_03_labsheet.pdf` and `TokTickIT-System-Level-SDS-v1.0.pdf`, preventing unauthorized scope expansion.<br/>• **Builder Agent**: Implements application routes, Prisma migrations, and UI components adhering strictly to approved contracts.<br/>• **QA & Verification Agent**: Runs test suites (Vitest, Supertest, Playwright) to guarantee 100% test pass rates and zero regressions. |
| **Guiding Invariant** | **Strict Closed-World Rule**: If a requirement is silent or ambiguous, the AI agent must never hallucinate assumptions; it must stop and seek developer confirmation.                                                                                                                                                                                                                                                                               |

---

## 2. Key Prompt Table

The table below logs 6–10 selected key prompts guiding the execution of Sprint 3 from specification to release integration:

|   #   | Phase                                  | Target Issue / Goal                                     | Prompt Summary                                             | AI Response & Output | Value / What It Solved  |
| :---: | :------------------------------------- | :------------------------------------------------------ | :--------------------------------------------------------- | :------------------- | :---------------------- |
| **1** | **Sprint Kickoff & Spec DD**           | Issue 11: Sprint 3 Engineering Contract & Test Planning | _Pending execution on `feature/11-spec-and-tests`._        | _Pending response._  | _Pending verification._ |
| **2** | **Auth Foundation & Data Migration**   | Issue 12: Auth, User Model & Shell Navigation           | _Pending execution on `feature/12-auth-and-shell`._        | _Pending response._  | _Pending verification._ |
| **3** | **First-Login Password Change**        | Issue 12: Password Rules & Redirection Guard            | _Pending execution on `feature/12-auth-and-shell`._        | _Pending response._  | _Pending verification._ |
| **4** | **IT Staff Queue Queries**             | Issue 13: Staff Queue API & Filter UI                   | _Pending execution on `feature/13-staff-ticket-queue`._    | _Pending response._  | _Pending verification._ |
| **5** | **Staff Operational Controls**         | Issue 14: Ticket Ownership, Priority & Status Workflow  | _Pending execution on `feature/14-staff-ticket-detail`._   | _Pending response._  | _Pending verification._ |
| **6** | **Comments vs Private Notes**          | Issue 14: Public Thread & Amber Internal Notes          | _Pending execution on `feature/14-staff-ticket-detail`._   | _Pending response._  | _Pending verification._ |
| **7** | **Administrator Safety Invariants**    | Issue 15: User Management & Safety Invariants           | _Pending execution on `feature/15-admin-user-management`._ | _Pending response._  | _Pending verification._ |
| **8** | **E2E Testing & Release Verification** | Issue 16: Playwright E2E & Responsive Polish            | _Pending execution on `feature/16-e2e-polish-release`._    | _Pending response._  | _Pending verification._ |

---

## 3. My Reflection

_(To be completed upon final release PR verification on `main`)_

During Lab 3, our pair-programming workflow deepened as we tackled multi-role authorization, data model migration from simulated users to real credentials, and administrative safety invariants. Spec-Driven Development (SDD) proved indispensable in preventing scope creep...
