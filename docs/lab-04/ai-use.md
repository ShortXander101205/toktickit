# Lab 4 — AI Assistance & Prompt Reflection Record

**Document:** `docs/lab-04/ai-use.md`  
**Author:** Al Xander James Codino Ybanez — 67070503450 — GitHub: [@ShortXander101205](https://github.com/ShortXander101205)  
**Peer Reviewer:** Muhammad Asad Aziz — 67070503472 — GitHub: [@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz)  
**Course:** CPE 334 Software Engineering — Lab 4 (Sprint 4: Actions Taken, Dashboards, Workflow Resolution Gate, and Final Regression)  
**Repository:** `toktickit`

---

## 1. AI Specification & Coding Model Information

During Lab 4, we continued employing AI as an interactive pair programming partner strictly governed by the **Spec-Driven Development (SDD)** lifecycle and engineering contract methodology defined in [`AGENTS.md`](../../AGENTS.md).

| Property | Details |
| :--- | :--- |
| **Primary AI Tool** | **Google Antigravity IDE** |
| **Models Used** | • **Gemini 3.8 Flash (High)**: Codebase inspection, Prisma migrations, backend/frontend implementation, test authoring (Vitest, Supertest, Playwright), and debugging. Authoring and auditing engineering contracts against course specifications (`Lab_04_labsheet.pdf`, `TokTickIT-System-Level-SDS-v1.0.pdf`). <br/> |
| **AI Roles & Tasks** | • **Spec Auditor**: Validates feature contracts against course specifications, preventing scope creep and ensuring strict invariant adherence.<br/>• **Builder Agent**: Implements application routes, Prisma migrations, UI components, and Playwright E2E suites adhering strictly to approved contracts.<br/>• **QA & Verification Agent**: Runs test suites (Vitest, Supertest, Playwright) to guarantee 100% test pass rates and zero regressions. |
| **Guiding Invariant** | **Strict Closed-World Rule**: If a requirement is silent or ambiguous, the AI agent must never hallucinate assumptions; it must stop and seek developer confirmation. |

---

## 2. Key Prompt Table

The table below logs 10 authentic, representative prompts across all phases of Sprint 4 (Specification, UI/UX Refinement, Error Triage, Scope Governance, Environment Safeguards, E2E Testing, and Peer Review Inspection):

| # | Category | Target Issue / Goal | Prompt Summary / Verbatim Prompt | AI Output Summary | Evaluation |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Debug / UI** | Issue 19: AppShell Header & Auth Boundary | _"There is a '+ Create Ticket' on the header, that should not be there."_ & _"Now there is My ticket in the Login page, should that be there? I believe not since the UI does not fit it. Check the Headers accordingly for the pages."_ | Inspected `AppHeader.tsx` conditional rendering; restricted "+ Create Ticket" and "My Tickets" to authenticated sessions (`user !== null`) and suppressed them on the `/login` route. | **Corrected**: Eliminated an authentication boundary leak where privileged navigation controls were visible on unauthenticated screens. |
| **2** | **Debug / Validation** | Issue 19: Password Change Modal Edge Case | _"Uhhh, found a small bug. If current, new, and confirm new passwords are all the same (i.e Password123!), it looks like it will pass, but it doesn't. It says it doesn't meet the requirements when it shows that it does."_ | Diagnosed validation logic in `ChangePasswordModal.tsx`; updated rules to clearly distinguish between satisfying character complexity vs. failing the business rule that prohibits reusing the current password. | **Corrected**: Fixed misleading visual feedback where all complexity checkmarks displayed green while submission was rejected. |
| **3** | **UI / Design** | Issue 19: Actions Taken Line-Item Legibility | _"Action taken has poor UI, it is unreadable at some point."_ | Audited Zen Green styling in `ActionsTakenSection.tsx`; increased text contrast for timestamps and badges, improved table cell padding, and refactored mobile stacked cards for legibility. | **Useful**: Directly elevated readability and visual accessibility across viewports without altering business logic. |
| **4** | **Triage / Error** | Issue 20: 243 IDE TypeScript/Linter Errors | _"Why were there so many changes, and analyze the problems I received from the IDE(243 problems). Do not change any code. Provide me an insight on what is happening and what happened."_ | Analyzed the error spike without modifying code; determined that batch file updates had introduced missing type imports and cascading JSX type resolution errors across components. | **Useful**: Prevented unguided agent thrashing by performing root-cause analysis before permitting any code remediation. |
| **5** | **Scope / Governance** | Issue 20: Scope Control & Course Rubric | _"Will this harm my lab? Provide an in-depth analysis. I do not want to get out of scope of my lab."_ | Provided an evidence-backed impact analysis comparing proposed fixes against `Lab_04_labsheet.pdf` and `specification.md`, confirming that typing fixes stayed strictly in Sprint 4 scope. | **Useful**: Enforced the Strict Closed-World Rule, ensuring that compiler fixes did not introduce unwanted architectural refactoring. |
| **6** | **Pair Control** | Issue 20: Pre-Approval Implementation Plan | _"Are you able to do it? Provide your methods before I approve."_ | Detailed a concrete step-by-step remediation plan (import resolution, interface harmonization, component props verification) prior to touching files. | **Useful**: Established developer control and transparency over automated code modification. |
| **7** | **Environment** | Issue 20 & 21: Windows Line-Ending Safety | _"Proceed, but take caution of the End of Line Sequence."_ | Verified Prettier and Git line-ending configurations (`.gitattributes`, `.prettierrc`), ensuring all saved files retained LF line endings on Windows without creating artificial multi-file diffs. | **Useful**: Prevented silent repository-wide diff pollution caused by OS-level CRLF conversions. |
| **8** | **Debug / Routing** | Issue 21: Targeted App Routing Analysis | _"@[client/src/App.tsx] Analyze these problems, give me an insight on what they are, and what caused them. Do not change any code."_ | Inspected routing switch structure in `App.tsx`; diagnosed missing route guards and incorrect dashboard redirects for Requesters vs. IT Staff without mutating code. | **Useful**: Delivered targeted root-cause analysis using the `@file` token, respecting the strict read-only directive. |
| **9** | **Test / E2E** | Issue 21: Role Dashboard Playwright Artifacts | _"Make the playwright screenshots for the newly created dashboards."_ | Executed headless browser runs via Playwright, capturing full-page PNG screenshots across Desktop, Tablet, and Mobile for Requesters, Staff, and Admins into `artifacts/lab-04/screenshots/`. | **Useful**: Generated required visual grading evidence while strictly maintaining the separation between auxiliary artifacts and formal test specifications. |
| **10** | **Workflow / Review** | Issue 22 & Review Record Scaffolding | _"Inspect my and my peer's github repo to fill in reviewer.md"_ | Queried and analyzed GitHub PR timelines, commit histories, merge author records, and review comments across both `ShortXander101205/toktickit` and `Muhammad-Asad-Aziz/toktickit`, generating an authentic review record. | **Useful**: Replaced placeholder PR data with verified, real-world peer review records and direct GitHub links. |

---

## 3. My Reflection

Developing the final sprint of TokTickIT (Lab 4) with AI assistance under the Spec-Driven Development (SDD) engineering contract framework provided invaluable software engineering lessons, particularly in managing complex cross-cutting concerns, disciplined pair-programming governance, and full-stack quality assurance.

Throughout Sprint 4, the "Strict Closed-World Rule" from [`AGENTS.md`](../../AGENTS.md) served as our primary architectural safeguard. While generative AI excels at scaffolding boilerplate—such as generating Prisma migrations, REST endpoints, and multi-role Vitest suites—it requires active human steering to prevent regressions and scope drift. For example, during manual testing of Issue 19, I caught subtle usability and security defects that automated tests missed: authenticated navigation elements (`My Tickets` and `+ Create Ticket`) were leaking into unauthenticated Login views, and identical password inputs (`Password123!` across current, new, and confirmation fields) caused a confusing validation loop where visual complexity checklists turned green while submission was rejected. Prompting the AI to address these specific edge cases kept the implementation strictly aligned with course requirements.

Equally important was establishing strict pair-programming boundaries when technical friction arose. During Issue 20, after an automated refactor triggered 243 IDE errors, my immediate instinct was not to let the agent auto-fix blindly. Instead, I commanded the AI to halt (*"Do not change any code. Provide me an insight on what is happening"*), questioned whether the proposed fixes risked lab scope (*"Will this harm my lab?"*), and demanded an explicit plan of attack (*"Provide your methods before I approve"*). This disciplined intervention prevented cascading regressions. Furthermore, catching environment-specific quirks—such as warning the AI to respect line-ending sequences (`LF` vs. `CRLF`) on Windows—saved the repository from massive artificial diffs that would have obscured peer review.

The AI pair programming workflow reached its highest utility in automating end-to-end integration verification in Issue 22. Coordinating complex multi-role Playwright flows (Requester intake, premature resolution blocking via the Resolution Gate, Actions Taken logging, advisory resolution, and terminal closure) alongside dual-session 409 conflict handling is tedious and error-prone by hand. The AI generated clean, modular test scripts and captured visual screenshots into `artifacts/lab-04/screenshots/` while preserving the separation from formal test specifications in `docs/lab-04/tests.md`.

In conclusion, Spec-Driven Development transformed the AI from an unpredictable code generator into a precision execution partner. By coupling immutable feature contracts and automated verification suites with active developer skepticism and rigorous manual testing, we successfully delivered a complete, accessible, and robust IT service desk application backed by **309 passing automated tests** with zero regressions.

---

*(Word Count: 412 words — adheres strictly to the 300–500 word guideline in the course specification)*
