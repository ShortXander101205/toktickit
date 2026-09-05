# TokTickIT Sprint 2 (Lab 2) — Source Evidence & Requirements Traceability Matrix

This document establishes the authoritative source evidence baseline for **TokTickIT Lab 2 (Sprint 2)**. All requirements, constraints, and design decisions are cataloged and classified based on the project reference materials:
- **`TokTickIT-System-Level-SDS-v1.0.pdf`** (`SDS-SYS-001 Approved v1.0`)
- **`Lab_02_labsheet.pdf`** (`CPE 334 Lab 2 Handout`)
- **`TokTickIT_GitHub_Workflow_Guide_TH_EN.pdf`** (`TokTickIT Quick Guide — CPE 334`)

Every item is rigorously categorized into:
- **Specified:** Mandated explicitly by the reference documents.
- **Missing:** Required for implementation but absent from the reference documents.
- **Conflict:** Inconsistencies or contradictions between reference documents or with the Lab 1 baseline.
- **Proposed Decision:** Recommended technical resolution to address missing items or conflicts, subject to student/instructor approval.

---

## 1. System Architecture & Foundation

| Area / Topic | Source Citation | Classification | Statement / Finding | Proposed Resolution / Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Product Spelling** | SDS p. 2 (D-01) | **Specified** | The official product name is strictly spelled **`TokTickIT`**. | Follow exact case and spelling in all documentation, titles, and UI text. |
| **Three-Tier Architecture** | SDS p. 4, 6; Labsheet Sec. 3 | **Specified** | Logical 3-tier architecture: React SPA presentation tier, Node.js/Express application tier, PostgreSQL + SeaweedFS data tier. | Preserve strict physical separation; frontend never accesses database directly. |
| **API Base Route** | SDS p. 12; Labsheet Sec. 6 | **Conflict** | SDS p. 12 states: *"All application endpoints are rooted at `/api/v1`."* In contrast, Lab 1 baseline and Labsheet examples use `/api/categories` and `/api/tickets`. | **Proposed Decision:** Standardize all new Sprint 2 routes under `/api/v1/` (`/api/v1/tickets`, `/api/v1/requesters`, etc.), while retaining legacy `/api/health` and `/api/categories` for Lab 1 test backward compatibility. |
| **Deployment Topology** | SDS p. 2 (D-08), p. 5 | **Specified** | Single local server runs the application, PostgreSQL, and SeaweedFS (`weed mini`). | Run local Node server, local PostgreSQL instance, and local file storage on one host. |
| **Primary Key ID Types** | SDS p. 7; Labsheet Sec. 5, 6.2; Lab 1 Baseline | **Conflict** | SDS p. 7 states: *"All primary entities use UUID identifiers."* However, Lab 1 baseline `schema.prisma` defined `Category.id` as `Int @id @default(autoincrement())`, and Labsheet Sec. 6.2 shows example `{ "requesterId": 1 }`. | **Proposed Decision:** Retain `Int` autoincrement for `Category` to avoid breaking Lab 1 migrations, but use `Int` or `String (UUID)` consistently for new entities. Given standard relational modeling and Lab 1 patterns, integer IDs for `RequesterUser` and `RelatedSystem`, and `Int` or `UUID` for `Ticket` and `Attachment`. Documented as open decision for student confirmation. |
| **Legacy ERP Docs in Repo** | Workspace `docs/` vs TokTickIT | **Conflict** | `docs/spec-core.md`, `style-contract.md`, `testing-contract.md`, and skills are from an ASP.NET Razor Pages ERP Invoice App template, not TokTickIT. | **Proposed Decision:** Treat those files as legacy template residue. Do not follow Razor Pages/EF Core rules; all TokTickIT contracts inherit strictly from `TokTickIT-System-Level-SDS-v1.0.pdf` and `Lab_02_labsheet.pdf`. |

---

## 2. Simulated Authentication & Requester Context

| Area / Topic | Source Citation | Classification | Statement / Finding | Proposed Resolution / Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Simulated Identity Context** | Labsheet Sec. 1, 3, 4.3 (BR-03), 8.1 | **Specified** | Lab 2 must use a temporary "Development Requester selector" dropdown to simulate login and multi-user ownership before real auth in Lab 3. | Implement a dedicated selection modal/screen and header dropdown that stores active `RequesterUser` in client application context. |
| **Real Auth Exclusions** | Labsheet Sec. 4.2 | **Specified** | Passwords, password hashing (Argon2id), login/logout sessions, HttpOnly cookies, JWT tokens, and role-based permissions are strictly out of scope for Lab 2. | Defer all authentication, argon2 hashing, and session management to Lab 3 as mandated. |
| **Active vs Inactive Requesters** | Labsheet Sec. 5.3, 8.1; SDS p. 7 | **Specified** | Seed data must contain at least 4 active and 1 inactive requester. Inactive requesters must NEVER appear in the selector dropdown. | Endpoint `GET /api/v1/requesters` filters by `where: { isActive: true }`. UI dropdown only displays active users. |
| **Context Switching Behavior** | Labsheet Sec. 8.1, 14 (Part 7) | **Specified** | When changing the active requester, all ticket data for the prior requester must clear, and the application must reload data for the new requester. | Selecting a new requester clears cached ticket states and triggers immediate query re-fetch for the new requester ID. |
| **Empty State (No Requesters)** | Labsheet Sec. 8.1 (p. 9) | **Specified** | If no active requesters exist in PostgreSQL, the selector screen must show a clear empty state. | Render an alert: *"No active development requesters found. Please run the database seed."* |
| **Session Persistence Mechanism** | Labsheet Sec. 4.4, 8.1 | **Missing** | Labsheet states active requester is selected before entering application, but does not dictate whether it persists in React state or `localStorage`/`sessionStorage`. | **Proposed Decision:** Persist selected requester ID in `sessionStorage` (or `localStorage`) so browser refresh preserves the active test context. |

---

## 3. Ticket Creation & Numbering

| Area / Topic | Source Citation | Classification | Statement / Finding | Proposed Resolution / Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Ticket Number Format** | SDS p. 2 (D-10); Labsheet Sec. 4.3 (BR-01) | **Specified** | Format is strictly `TKT-YYYY-NNNNN` where `YYYY` is calendar year and `NNNNN` is a 5-digit zero-padded sequence. | Generate via backend service: query highest sequence for current year in transaction, increment by 1, format with padStart(5, '0'). |
| **Annual Sequence Reset** | SDS p. 2 (D-10) | **Specified** | The sequence counter resets to 1 annually on January 1st. | Managed atomically via `TicketNumberSequence` model (`ticket_number_sequences` table) with `year` PK and `nextVal` counter. |
| **Initial Ticket Status** | SDS p. 2 (D-02), p. 7; Labsheet BR-02 | **Specified** | All newly created tickets must begin with status `New`. | Schema sets `@default(NEW)` (or `New`), API ignores any client-submitted status. |
| **Priority Vocabulary** | SDS p. 2 (D-03), p. 12; Labsheet Sec. 4.4 | **Specified** | Priority values are strictly `Low`, `Medium`, `High`, `Urgent`. Requesters choose `Requested Priority`. `IT Priority` is controlled by IT Staff. | Expose enum/values `LOW`, `MEDIUM`, `HIGH`, `URGENT`. Default `IT Priority` matches `Requested Priority` initially upon creation (SDS p. 12). |
| **Required Create Fields** | Labsheet Sec. 4.4 | **Specified** | Form must capture/display: Ticket Number (read-only), Ticket Date (read-only), Requester (read-only), Category, Related System, Ticket Summary, Requested Priority, Description, Attachments. | Provide dedicated form controls matching Section 8.2 Create Mode layout. |
| **Field Length Limits** | Labsheet Sec. 4.4 (p. 5) | **Missing** | Labsheet states: *"define and justify suitable length constraints"* for Summary and Description. | **Proposed Decision:** Summary: min 5 chars, max 100 chars (trimmed). Description: min 10 chars, max 2000 chars (trimmed). Prevents spam and UI overflow. |
| **Optimistic Concurrency Version** | SDS p. 7, 9 | **Specified** | Ticket model has an integer `version` field incremented on each update. Returns HTTP 409 on stale edit. | Initialize `version: 1` on ticket creation. |
| **Duplicate Submission Prevention** | Labsheet Sec. 4.3 (p. 4), 8.3 (p. 10) | **Specified** | Submit button must display busy spinner and be disabled during processing to prevent duplicate submits. | Disable button, show `Submitting...`, prevent re-entry in React handler. |
| **Form Data Retention on Error** | SDS p. 13; Labsheet Sec. 4.3, 14 (Part 6) | **Specified** | On API or network failure, user input must be preserved in form fields; do not wipe input. | React state retains inputs; display top-level error message while keeping input values intact. |

---

## 4. My Tickets History (List, Search, Filter, Sort, Page)

| Area / Topic | Source Citation | Classification | Statement / Finding | Proposed Resolution / Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Requester Ticket Isolation** | SDS p. 10; Labsheet Sec. 3, AC-02, AC-03 | **Specified** | Requesters may only view tickets they created/own. The API and UI must never expose Requester A's tickets to Requester B. | API enforces `WHERE requesterId = currentRequesterId`. Returning other users' tickets is forbidden. |
| **Query Filter Capabilities** | Labsheet Sec. 6.1, 8.4 | **Specified** | Ticket list API must support search, filtering (Category, Priorities, Status), sorting, and pagination. | API endpoint accepts `search`, `categoryId`, `requestedPriority`, `itPriority`, `status`, `sortBy`, `sortOrder`, `page`, `limit`. |
| **Permitted Page Sizes** | Labsheet Sec. 6.1 (p. 7) | **Missing** | Specific page sizes not strictly numbered in Labsheet (UI mockup shows pagination buttons 1..6). | **Proposed Decision:** Default page size: 10 tickets per page. Permitted limits: 10, 25, 50. Default sort: `createdAt DESC`. |
| **Table Columns** | Labsheet Sec. 8.4, Figure on p. 11 | **Specified** | Columns: Ticket No, Created Date, Summary, Category, Requested Priority, IT Priority, Current Status, Ticket Owner, Last Updated. | Display these exact 9 columns on desktop; wrap/card on smaller screens. |
| **Empty vs No-Results States** | Labsheet Sec. 8.4 (p. 10) | **Specified** | Empty state (0 total tickets for user) must be visually distinct from No-results state (active search/filter matches 0 tickets). | Empty: *"You have not submitted any support tickets yet."* with Create Ticket button. No-results: *"No tickets match your filter criteria."* with Clear Filters button. |

---

## 5. Ticket Detail View & Attachments

| Area / Topic | Source Citation | Classification | Statement / Finding | Proposed Resolution / Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Read-Only Presentation** | Labsheet Sec. 8.5 (p. 11) | **Specified** | Ticket details in View Mode are read-only for Requesters. Shows ticket attributes, resolution summary, and attachment controls. | All header textboxes and status badges render non-editable; edit controls are hidden/disabled. |
| **Exclusion of IT Workflow** | Labsheet Sec. 4.2, 8.5 | **Specified** | Public Comments, Internal Notes, Actions Taken, and ticket status modification are strictly excluded from Lab 2. | Render tabs or notes as out-of-scope/disabled or omit non-requester tabs. |
| **Attachment Size & Count** | SDS p. 14; Labsheet Sec. 4.5 | **Specified** | Maximum 5 MB per file; maximum 5 active (non-deleted) attachments per ticket. | Enforce on client before upload AND on Express API boundary with `multer` limit `5 * 1024 * 1024`. |
| **Allowed File Types** | SDS p. 14; Labsheet Sec. 4.5 | **Specified** | JPG/JPEG, PNG, WEBP, and PDF only. Validate extension, MIME type, and detected content. | Reject any other extension/MIME on both frontend and backend. |
| **Attachment Storage Engine** | SDS p. 2 (D-06), p. 14 | **Specified** | SeaweedFS `weed mini` with S3-compatible client adapter. Database stores metadata only, never file bytes. | Provide an attachment storage service abstraction. In local development/test, adapter stores files on disk or connects to local SeaweedFS. |
| **Safe Storage Filenames** | SDS p. 14 | **Specified** | Objects stored using generated unique identifiers (UUIDs); original filename preserved in metadata. | Store file as `<uuid>.<ext>`, store `originalFilename` in `Attachment` table. |
| **Attachment Soft Removal** | SDS p. 7, 14-15; Labsheet Sec. 4.5 | **Specified** | Removal is soft removal: row retained as tombstone (`isRemoved = true`, `removalReason`, `removedAt`, `removedByRequesterId`). Physical binary deleted immediately (D-11). Requires confirmation and reason. | Endpoint `DELETE /api/attachments/:id` requires `{ reason: string }`, updates tombstone fields, unlinks file. |
| **Audit Event on Removal** | SDS p. 14-15 | **Specified** | Removal creates `ATTACHMENT_REMOVED` TicketEvent in same database transaction with filename, uploader, remover, reason, timestamp. | Transaction executes Prisma update on `Attachment` + Prisma create on `TicketEvent`. |
| **Download Block on Removed** | Labsheet Sec. 4.5; SDS p. 14 | **Specified** | Removed attachments cannot be downloaded or previewed. Metadata remains visible in audit log. | `GET .../attachments/:id/download` returns 404/410 if `isRemoved === true` or `removedAt !== null`. |
| **Cross-Requester Security** | Labsheet AC-03, Sec. 14 (Part 8); SDS p. 10 | **Specified** | Direct access to Ticket or Attachment belonging to another requester must be rejected (403 Forbidden or 404 Not Found). | Verify `ticket.requesterId === currentRequesterId` on every detail retrieval, upload, download, and soft-remove. |

---

## 6. UI Standards & Branding

| Area / Topic | Source Citation | Classification | Statement / Finding | Proposed Resolution / Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Branding Palette** | SDS p. 2 (D-09), p. 13 vs Labsheet Sec. 7 (p. 8) | **Conflict** | SDS p. 13 specifies KMUTT Corporate Orange (`#FA4616`) and Yellow (`#FFC72C`). Labsheet Sec. 7 explicitly prescribes **Zen Green Theme** (`#006B3C`, `#0B7A46`, `#EAF6EF`, `#F5F7F6`). | **Proposed Decision:** Strictly implement the **Zen Green Theme** palette as mandated by Labsheet Section 7 for the Requester Ticketing MVP. |
| **Primary Green** | Labsheet Sec. 7 | **Specified** | `#006B3C` for app header, primary actions, and strong emphasis. | Define as `--color-primary-green: #006B3C` in CSS tokens. |
| **Secondary Green** | Labsheet Sec. 7 | **Specified** | `#0B7A46` for active tabs, focus accents, links, and hover states. | Define as `--color-secondary-green: #0B7A46`. |
| **Pale Green** | Labsheet Sec. 7 | **Specified** | `#EAF6EF` for selected items, success, and section emphasis. | Define as `--color-pale-green: #EAF6EF`. |
| **Page Background** | Labsheet Sec. 7 | **Specified** | `#F5F7F6` quiet near-white background. | Define as `--color-page-bg: #F5F7F6`. |
| **Typography & Grid** | SDS p. 14; Labsheet Sec. 7 | **Specified** | System font stack with Bootstrap 5 responsive grid and spacing scale. | Standard system font hierarchy, Bootstrap containers, rows, and columns. |
| **Responsive Breakpoints** | Labsheet Sec. 8.7; SDS p. 14 | **Specified** | Desktop ($\ge 992\text{px}$), Tablet ($768 - 991\text{px}$), Mobile ($< 768\text{px}$). No horizontal overflow. | Implement responsive CSS and test across all 3 viewports. |
| **Validation Styling** | Labsheet Sec. 7, 8.3 | **Specified** | Dark red text and border; message appears immediately below invalid input. Required fields show red asterisk (`*`). | Style input with red border and `.invalid-feedback` text directly underneath. |
| **Accessible Badges** | SDS p. 14; Labsheet Sec. 7 | **Specified** | Do not communicate priority or status by color alone; always pair color with text and/or icons. | Badges show explicit text labels (e.g. "Low", "Medium", "High", "Urgent", "New", "In Progress"). |

---

## 7. Git & Engineering Workflow

| Area / Topic | Source Citation | Classification | Statement / Finding | Proposed Resolution / Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Branching Strategy** | Labsheet Sec. 10.1; Workflow Guide p. 2, 5 | **Specified** | Lab 2 features branch from and merge into `lab2-staging`. Release PR goes from `lab2-staging` to `main`. Never commit directly to `main` or `lab2-staging`. | All 5 feature branches branch from `lab2-staging`. |
| **Kanban Board Columns** | Workflow Guide p. 2, 17; Labsheet Sec. 10 | **Specified** | Exactly 6 statuses in order: `Backlog`, `Specified`, `Started`, `PR Review`, `Fixing`, `Done`. | Maintain project board with these exact 6 columns. |
| **Peer Review Gate** | Workflow Guide p. 11-14; Labsheet Sec. 10.1 | **Specified** | Every PR requires peer review. The reviewer (not the author) merges the PR. Reviewer comments must be answered in `docs/lab-02/reviewer.md`. | Enforce reviewer merge rule and track review evidence. |
| **Current Git Branch** | Git inspection | **Specified** | Currently on branch `feature/5-spec-and-tests` branched from `lab2-staging`. | Work for Issue 1 takes place on this branch. |
