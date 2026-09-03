# TokTickIT — SDD Engineering Contract Workflow for AI Developer Agents

This repository implements the TokTickIT IT Service Desk application for CPE 334 using Spec-Driven Development (SDD) with an explicit engineering contract.

All path references in this document are relative to the root of your workspace: `{WORKSPACE_ROOT}`.

---

## 1. Documentation Directory & SDD Mapping

Below is the complete index of files in this repository, showing how each fits into the Spec-Driven Development (SDD) lifecycle:

| Relative Path | SDD Component / Stage | What the File Does |
| :--- | :--- | :--- |
| **`AGENTS.md`** | **Process Entrypoint & Lifecycle** | Defines the E2E lifecycle, work norms, and agent orchestration. |
| **`docs/reference/TokTickIT-System-Level-SDS-v1.0.pdf`** | **System-Level SDS** (Step 4) | System-wide architecture, Decision Register D-01..D-12, data models, security, and API standards. |
| **`docs/reference/Lab_02_labsheet.pdf`** | **Sprint 2 Requirements** (Step 1-3) | Lab 2 sprint requirements, Zen Green UI specification, attachment rules, and deliverables. |
| **`docs/reference/TokTickIT_GitHub_Workflow_Guide_TH_EN.pdf`** | **Git Workflow Guide** | 6-column Kanban workflow, PR linking, and reviewer merge agreements. |
| **`docs/lab-02/source-evidence.md`** | **Source Evidence Matrix** (Step 6) | Traceability of Specified, Missing, Conflict, and Proposed Decisions. |
| **`docs/lab-02/poc-scope-and-issues.md`** | **Sprint Implementation Plan** (Step 5/6) | The 5 bounded sprint issues, branch mapping, scope, exclusions, ACs, and merge order. |
| **`docs/lab-02/specification.md`** | **Sprint Engineering Specification** (Step 6) | Authoritative Feature SDS, FRs, BRs, data models, API contract, and Definition of Done. |
| **`docs/lab-02/ui-spec.md`** | **UI Design Specification** (Step 6) | Zen Green color tokens, typography, component states, and responsive breakpoints. |
| **`docs/lab-02/api-spec.md`** | **REST API Specification** (Step 6) | Endpoints, DTO schemas, query parameters, error responses, and HTTP status codes. |
| **`docs/lab-02/tests.md`** | **Software Test Specification (STS)** (Step 6/8) | Planned test table, Given-When-Then AC traceability, and visual checklist. |

```mermaid
graph TD
    AGENTS["AGENTS.md (Process Entrypoint & Lifecycle)"]
    
    subgraph References ["docs/reference/ (Course Baseline Specs)"]
        SYS_SDS["TokTickIT-System-Level-SDS-v1.0.pdf (Architecture, Invariants, D-01..D-12)"]
        LAB_SHEET["Lab_02_labsheet.pdf (Sprint 2 Requirements & UI Specs)"]
        GIT_GUIDE["TokTickIT_GitHub_Workflow_Guide_TH_EN.pdf (Git & Kanban Rules)"]
    end

    subgraph Sprint2 ["docs/lab-02/ (Sprint 2 Engineering Contract)"]
        SRC_EVID["source-evidence.md (Traceability Matrix)"]
        POC_SCOPE["poc-scope-and-issues.md (5 Issues & Plan)"]
        SPEC["specification.md (Sprint Feature SDS & Rules)"]
        UI_SPEC["ui-spec.md (Zen Green UI Spec & 20 Decisions)"]
        API_SPEC["api-spec.md (REST API Contracts & DTOs)"]
        TEST_SPEC["tests.md (Software Test Specification)"]
    end

    AGENTS --> References
    AGENTS --> Sprint2
```



---

## 2. The 11-Step SDD & Engineering Contract Lifecycle

Students and agents must follow this structured process strictly.

```mermaid
graph TD
    A[1. SRS: FR, BR, NFR] --> B[2. Complete Feature Inventory]
    B --> C[3. Requirements-to-Features Traceability]
    C --> D[4. System-Level SDS]
    D --> E[5. Select Sprint Vertical Slice]
    E --> F[6. Feature-Level Contract: SDS/STS]
    F --> G[7. AI Agent Implementation]
    G --> H[8. Test & Human Review]
    H --> I[9. Pull Request & Feature Merge]
    I --> J[10. Sprint Integration & UAT]
    J -- PASS --> K[11. Deploy main to Production]
    J -- FAIL --> L[Create Fix Branch] --> G
```

### Phase 1: Planning & Design (Human / Spec Agent)
1. **SRS (Software Requirements Specification)**: Define Functional Requirements (FR), Business Rules (BR), and Non-Functional Requirements (NFR).
2. **Complete Feature Inventory**: Break the system down into concrete features (e.g., Feature-A, Feature-B, Feature-C).
3. **Requirements-to-Features Traceability**: Map every requirement to its corresponding feature (e.g., `FR-003` $\rightarrow$ `Feature-E`).
4. **System-Level SDS (Software Design Specification)**: Establish the architecture, tech stack, UI/styling standards, API/data conventions, security policies, and deployment pipeline.

### Phase 2: Sprint Scoping (Human-Led)
5. **Select the Sprint Vertical Slice**: Choose a bounded "Feature Bundle" to be implemented during the sprint.
6. **Feature-Level Engineering Contract**: For each feature in the bundle, document its specific **SDS** (UI/API/Data Schema Specs), **Acceptance Criteria**, and **STS** (Software Test Specification).

### Phase 3: Construction & Verification (Single Agent / Sub-Agents)
7. **AI Agent Implementation**: Implement one bounded Issue/feature-card at a time according to the SDS engineering contract.
   - *Agent Role*: The **Builder Agent** consumes the contract files and constructs/modifies code files.
8. **Test and Human Review**: Run the automated test suites, perform manual visual/interaction testing, and inspect Git diffs to correct defects.
   - *Sub-Agent Option*: A specialized **Style Auditor Sub-agent** or **Test Verification Sub-agent** can run in parallel to review the PR delta.
9. **Pull Request and Integration**: Create a feature branch, submit a PR, and merge into the Sprint staging branch (e.g., `sprint-1-staging`).

### Phase 4: Release & Deployment
10. **Sprint Integration, System Testing, and UAT**: Run full end-to-end (E2E) and regression tests on the staging branch.
    - **If PASS**: Create a PR from the staging branch into the `main` branch.
    - **If FAIL**: Create a fix branch off staging, update the SDS/STS if requirements changed, and repeat Steps 7–9.
11. **Per Release Deployment**: Deploy the `main` branch directly to production.

---

## 3. Agent Roles & Multi-Agent Delegation Options

While the workspace runs on a single-instruction template for easy observation, the pipeline is designed to easily plug in sub-agents:

* **Spec Auditor (Sub-Agent)**: Validates that the builder's code strictly honors [spec-core.md](file:///{WORKSPACE_ROOT}/docs/spec-core.md) and the local Feature SDS.
* **Style Auditor (Sub-Agent)**: Loads only [style-contract.md](file:///{WORKSPACE_ROOT}/docs/style-contract.md) and modified UI files to check styling variable compliance.
* **Test Authoring Sub-Agent**: Inspects the Feature SDS & STS to automatically generate or update test files under `/tests/`.

---

## 4. Developer Work Norms

* **Strict Closed-World Rule**: If a specification (SRS/SDS) is silent on a design choice, the agent MUST stop and ask the developer/student instead of fabricating assumptions.
* **Spec & Test-Driven (TDD)**: No feature is complete without a corresponding automated verification test. Automated assertions must trace directly back to the `BR`/`FR` IDs defined in the SRS.
* **Theme & Style Compliance**: Custom actions and controls must inherit theme-specific colors using predefined CSS variables instead of raw Bootstrap utility classes. Avoid the HTML `title` attribute; use `data-tooltip` for custom tooltips.
* **Blur Validation Rule**: Fields with invalid inputs during general data entry must clear/blank out on blur. Form-level validation messages are only triggered upon clicking the explicit Save/Submit button.
