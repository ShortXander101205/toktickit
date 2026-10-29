# Feature Engineering Contract: Issue 17 — Sprint 4 Engineering Contract & Software Test Planning

**Feature Identifier:** Issue 17: Sprint 4 Engineering Contract & Software Test Planning  
**Target Branch:** `feature/17-spec-and-tests`  
**Base Branch:** `lab4-staging`  
**Sprint / Milestone:** TokTickIT Lab 4 (Sprint 4) — Actions Taken, Dashboards, Workflow Resolution Gate, and Final Regression  
**Specification Version:** 1.0.0  
**Status:** APPROVED ENGINEERING CONTRACT  

---

## 1. Feature Scope, Purpose & Objectives

### 1.1 Purpose & Objectives
This engineering contract establishes the authoritative technical contract for **Issue 17: Sprint 4 Engineering Contract & Software Test Planning**, initiating the final product increment for the TokTickIT IT Service Desk.

Issue 17 serves as the formal specification, design governance, and test planning gateway for Sprint 4. In accordance with the **Spec-Driven Development (SDD)** lifecycle and the **Strict Closed-World Rule** defined in [`AGENTS.md`](../../../AGENTS.md), Issue 17 ensures that all data models, business rules, REST API contracts, UI wireframes, and test traceability matrices are fully authored, audited, and approved before implementing application code or database mutations in subsequent issues.

Specifically, Issue 17 establishes:
1. **Parent-Child Work Tracking (Actions Taken)**: Formalizes the `ActionTaken` model, linking zero or more actions taken to each ticket, mandating automatic performer identity derivation from the session (`req.user.id`), and enforcing conditional follow-up note validation.
2. **Ticket Status Workflow & Resolution Gate**: Codifies the 8-state ticket status transition matrix, backend resolution gate prohibiting closure when incomplete actions remain, atomic cancellation cascades, and advisory Requester resolution confirmation.
3. **Role-Appropriate Operational Dashboards**: Specifies concise, real-time dashboards for Requesters (strictly scoped to owned tickets), IT Staff (unassigned, personal workload, status/priority breakdown, queue drill-downs), and Administrators (operational metrics + user account counts).
4. **Software Test Planning (STS)**: Constructs a complete test specification linking every Acceptance Criterion (`AC-01` through `AC-16`) to designated test file paths across unit, API integration, UI component, and Playwright browser tiers.
5. **Strict Playwright Visual Verification Safeguard**: Formally separates auxiliary Playwright visual screenshot generation (`artifacts/lab-04/screenshots/`) from automated STS/unit functional test assertions.
6. **Directory Scaffolding & Clean Templates**: Scaffolds test directories and provides clean templates for `reviewer.md` and `ai-use.md`.

---

## 2. Traceability Matrix & Mapped Requirements

| Requirement ID | Specification Description | Contract Document Reference | Audit Verification |
| :--- | :--- | :--- | :---: |
| **FR-01** | Actions Taken Record Management | [`specification.md` §4.1](file:///c:/Users/xande/Documents/Year%203%20Sem%201/CPE%20334/Lab%201/toktickit/docs/lab-04/specification.md#L82-L103) | **VERIFIED** |
| **FR-02** | Ticket Status Workflow & Resolution Gate | [`specification.md` §4.2](file:///c:/Users/xande/Documents/Year%203%20Sem%201/CPE%20334/Lab%201/toktickit/docs/lab-04/specification.md#L104-L113) | **VERIFIED** |
| **FR-03** | IT Staff & Admin Operational Dashboards | [`specification.md` §4.3](file:///c:/Users/xande/Documents/Year%203%20Sem%201/CPE%20334/Lab%201/toktickit/docs/lab-04/specification.md#L114-L123) | **VERIFIED** |
| **FR-04** | Requester Operational Dashboard | [`specification.md` §4.4](file:///c:/Users/xande/Documents/Year%203%20Sem%201/CPE%20334/Lab%201/toktickit/docs/lab-04/specification.md#L124-L130) | **VERIFIED** |
| **FR-05** | Concurrency Control & Stale-Update Handling | [`specification.md` §4.5](file:///c:/Users/xande/Documents/Year%203%20Sem%201/CPE%20334/Lab%201/toktickit/docs/lab-04/specification.md#L131-L135) | **VERIFIED** |
| **FR-06** | System Regression Preservation & Hardening | [`specification.md` §4.6](file:///c:/Users/xande/Documents/Year%203%20Sem%201/CPE%20334/Lab%201/toktickit/docs/lab-04/specification.md#L136-L141) | **VERIFIED** |
| **BR-01..14** | All 14 Mandatory Business Rules | [`specification.md` §5](file:///c:/Users/xande/Documents/Year%203%20Sem%201/CPE%20334/Lab%201/toktickit/docs/lab-04/specification.md#L143-L161) | **VERIFIED** |
| **AC-17.1** | Author authoritative Sprint 4 specification | `docs/lab-04/specification.md` | **VERIFIED** |
| **AC-17.2** | Author authoritative Zen Green UI specification | `docs/lab-04/ui-spec.md` | **VERIFIED** |
| **AC-17.3** | Author authoritative REST API specification | `docs/lab-04/api-spec.md` | **VERIFIED** |
| **AC-17.4** | Complete STS & directory scaffolding | `docs/lab-04/tests.md` & test directories | **VERIFIED** |

---

## 3. Explicit Invariants & Boundary Guards

1. **Closed-World Enforcement**: Out-of-scope capabilities defined in Section 4.2 of `SE+Lab+4.pdf` (automatic SLA clocks, external notification gateways, inventory/cost accounting, timesheet/payroll calculation, multi-level approvals, advanced BI report builders, multi-tenant partitioning) are explicitly barred from Sprint 4 implementations.
2. **Strict Playwright Visual Isolation**: Visual screenshot generation is strictly an auxiliary verification mechanism for developer review and PDF grading submissions (`artifacts/lab-04/screenshots/`). Visual screenshot diffing is never embedded into automated Jest/Vitest or STS test specifications.
3. **Template Scaffolding Integrity**: `docs/lab-04/reviewer.md` and `docs/lab-04/ai-use.md` are maintained as clean, uncluttered templates ready for student records, ensuring authentic reflections and accurate PR review logs.
4. **Zero Premature Code**: No application controllers, database models, React components, or test files are written until Issue 17 is peer-reviewed and merged into `lab4-staging`.

