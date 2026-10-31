# Feature Engineering Contract: Issue 18 — Actions Taken Data Model, Migration, Seed Data & Backend APIs

**Feature Identifier:** Issue 18: Actions Taken Data Model, Migration, Seed Data & Backend APIs  
**Target Branch:** `feature/18-actions-taken-foundation`  
**Base Branch:** `lab4-staging`  
**Sprint / Milestone:** TokTickIT Lab 4 (Sprint 4) — Actions Taken, Dashboards, Workflow Resolution Gate, and Final Regression  
**Specification Version:** 1.0.0  
**Status:** APPROVED ENGINEERING CONTRACT  

---

## 1. Feature Goal & Scope

### 1.1 Purpose & Architectural Objectives
This engineering contract establishes the authoritative technical specifications, architectural boundaries, database schema increments, REST API protocols, data validation rules, security authorization matrix, idempotent seed data strategy, and software test specification for **Issue 18: Actions Taken Data Model, Migration, Seed Data & Backend APIs**.

In Sprint 2 and Sprint 3, the TokTickIT platform established core ticket intake, category assignment, attachment soft-deletion, role modeling (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), shared IT staff queue queries, public comments, and internal notes. However, the system currently lacks a structured mechanism to record, track, and audit the discrete technical interventions carried out on a ticket by IT Staff members.

Issue 18 provides the foundational data modeling, non-destructive migration, idempotent seed dataset, and backend REST APIs to enable parent-child work tracking under tickets:
1. **Parent-Child Work Tracking (`ActionTaken` Relational Model):** Establishes a $1:N$ relationship linking each `Ticket` to zero or more discrete `ActionTaken` records, capturing the action timestamp, technical description, result, follow-up flags, conditional follow-up justification, attachment notes, and optimistic concurrency version.
2. **Separation of Ticket Coordination vs. Action Execution (`BR-02`):** Enables a primary Ticket Owner to coordinate the overall ticket while different IT Staff members can perform and record distinct technical actions (e.g., hardware diagnostic, OS re-installation, network cable patching).
3. **Automated Performer Identity (`BR-03`):** Strictly derives performer identity (`performedById`) from the authenticated server-side session (`req.user.id`), preventing client spoofing or unauthorized delegation.
4. **Non-Destructive Database Migration:** Adds the `actions_taken` table, reciprocal foreign keys, composite indexes, and the optimistic concurrency `version` integer to `tickets` without degrading or modifying existing historical records from Labs 1–3.
5. **Idempotent Seed Data Foundation:** Updates `server/prisma/seed.ts` to provision tickets with 0 actions (verifying empty-state handling), 1 action, and multiple actions performed by different IT staff members, with varied follow-up states and attachment notes.
6. **Backend REST APIs (`/api/v1/tickets/:ticketId/actions-taken`):** Implements `POST` (create action), `GET` (chronological list), and `PUT` (edit action with concurrency check) with strict role authorization, resource ownership verification, and validation rules.
7. **Automated Software Test Suite:** Direct test mapping to `server/tests/lab-04/actions-taken.api.test.ts` verifying all CRUD endpoints, role guards, ownership isolation, conditional validation, and concurrency conflicts.

```mermaid
graph TD
    subgraph ClientLayer ["Client Applications (React SPA & API Consumers)"]
        StaffUI["IT Staff / Admin UI"]
        ReqUI["Requester UI (Owned Tickets)"]
        UnauthorizedUI["Requester UI (Unowned Tickets)"]
    end

    subgraph ServerAPILayer ["Server REST API Layer (Express + TypeScript)"]
        ActionsRouter["/api/v1/tickets/:ticketId/actions-taken"]
        AuthMiddleware["authenticate & requirePasswordChanged"]
        RoleGuard["requireRole(['IT_STAFF', 'ADMINISTRATOR'])"]
        OwnershipGuard["Requester Ownership Check (ticket.requesterId === req.user.id)"]
        PerformerEnforcer["Performer Session Extractor (performedById = req.user.id)"]
        Validator["Payload & Conditional Follow-Up Validator"]
        ConcurrencyChecker["Optimistic Concurrency Engine (version check)"]
    end

    subgraph DatabaseLayer ["PostgreSQL Persistence (Prisma ORM)"]
        TicketModel["Ticket (id, ticketNumber, currentStatus, version, ...)"]
        ActionTakenModel["ActionTaken (id, ticketId, performedById, actionDateTime, result, followUpRequired, followUpNote, attachmentNotes, version)"]
        UserModel["User (id, name, email, role, isActive)"]
    end

    StaffUI -->|POST /api/v1/tickets/:id/actions-taken| ActionsRouter
    StaffUI -->|PUT /api/v1/tickets/:id/actions-taken/:actionId| ActionsRouter
    StaffUI -->|GET /api/v1/tickets/:id/actions-taken| ActionsRouter
    ReqUI -->|GET /api/v1/tickets/:id/actions-taken| ActionsRouter
    UnauthorizedUI -->|GET /api/v1/tickets/:id/actions-taken| ActionsRouter
    ReqUI -->|POST or PUT /actions-taken| ActionsRouter

    ActionsRouter --> AuthMiddleware
    AuthMiddleware -->|POST / PUT| RoleGuard
    RoleGuard -->|403 Forbidden if REQUESTER| ReqUI
    RoleGuard -->|Authorized IT Staff / Admin| PerformerEnforcer
    PerformerEnforcer --> Validator --> ConcurrencyChecker --> ActionTakenModel

    AuthMiddleware -->|GET| OwnershipGuard
    OwnershipGuard -->|IT Staff / Admin| ActionTakenModel
    OwnershipGuard -->|Requester (Owned)| ActionTakenModel
    OwnershipGuard -->|Requester (Unowned)| Forbidden403["HTTP 403 Forbidden"]

    ActionTakenModel -->|FK: ticketId CASCADE| TicketModel
    ActionTakenModel -->|FK: performedById RESTRICT| UserModel
```

---

### 1.2 In-Scope Capabilities
* **Database Modeling & Schema Increments (`server/prisma/schema.prisma`):**
  - Define `ActionTaken` model with primary key, foreign keys, timestamps, textual results, conditional follow-up note, attachment notes, and `version` integer.
  - Add reciprocal `actionsTaken ActionTaken[]` relation on `Ticket`.
  - Add reciprocal `actionsTaken ActionTaken[] @relation("StaffActionsTaken")` relation on `User`.
  - Add optimistic concurrency `version Int @default(1)` column on `Ticket`.
  - Add performance composite index `@@index([ticketId, actionDateTime])` and `@@index([performedById])` on `ActionTaken`.
  - Add composite indexes on `Ticket` for dashboard performance: `@@index([requesterId, currentStatus, updatedAt])`, `@@index([ownerId, currentStatus, updatedAt])`, and `@@index([currentStatus, itPriority])`.
* **Prisma Migration Execution:**
  - Generate non-destructive migration script preserving 100% of existing rows across `users`, `tickets`, `categories`, `related_systems`, `attachments`, `public_comments`, and `internal_notes`.
  - Provide a safe rollback and recovery strategy.
* **Idempotent Database Seeding (`server/prisma/seed.ts`):**
  - Seed tickets with 0 actions taken (verifying empty state arrays `[]`).
  - Seed tickets with 1 completed action taken.
  - Seed tickets with 2–4 actions taken performed by different IT staff members (`Sompong IT`, `Wichai Support`, `Anong Network`).
  - Seed tickets with `followUpRequired = true` and comprehensive `followUpNote`.
  - Seed attachment note references linking actions to relevant ticket files.
  - Synchronize PostgreSQL primary key sequences post-seeding.
* **Backend REST API Endpoints:**
  - `POST /api/v1/tickets/:ticketId/actions-taken`: Create an action taken record. Restricted to `IT_STAFF` and `ADMINISTRATOR`. Performer auto-derived from session (`req.user.id`).
  - `GET /api/v1/tickets/:ticketId/actions-taken`: Retrieve chronological list of actions for a ticket. Permitted for `IT_STAFF`, `ADMINISTRATOR`, and the ticket's owning `REQUESTER`. Returns `items: []` and `totalCount: 0` for tickets without actions.
  - `PUT /api/v1/tickets/:ticketId/actions-taken/:actionId`: Update an existing action taken record. Restricted to `IT_STAFF` and `ADMINISTRATOR`. Enforces optimistic concurrency (`version` match).
* **Automated Integration Testing:**
  - Dedicated API test suite at `server/tests/lab-04/actions-taken.api.test.ts` verifying all CRUD operations, role boundaries, ownership rules, validation constraints, and concurrency conflicts.

---

### 1.3 Explicit Scope Exclusions (Honoring §4.2 of `SE+Lab+4.pdf`)
To preserve architectural focus and respect course boundaries, the following items are strictly out of scope for Issue 18:
* **No Automated SLA Clocks or Escalation Engines:** No countdown timers, SLA breach alerts, automatic re-assignment, or on-call scheduling engines.
* **No External Notification Gateways:** No outbound email (SMTP), SMS, LINE, webhook, or mobile push notification services.
* **No Inventory, Hardware Asset, or Cost Accounting:** No parts consumption, hardware serial number tracking, inventory decrementing, or service cost billing.
* **No Timesheet or Payroll Tracking:** No hourly labor billing, contractor rate calculation, or payroll timesheet exports.
* **No Multi-Level Approval Workflows:** No managerial sign-offs, financial approvals, or electronic signature hierarchies.
* **No Direct File Upload to Actions Taken:** Files continue to attach strictly to the parent Ticket via the established attachment system (`/api/v1/tickets/:id/attachments`). The `attachmentNotes` field stores descriptive text referencing ticket attachments (e.g., `"battery_diagnostic.png attached in ticket files"`), not binary uploads.
* **No Actions Taken Frontend UI (Deferred to Issue 19):** UI components, modal forms, table views, responsive layouts, and character counters are implemented in Issue 19 (`feature/19-actions-taken-ui`).
* **No Ticket Status Resolution Gate Enforcement (Deferred to Issue 20):** Backend blocking of `PATCH /api/v1/staff/tickets/:id/status` when incomplete actions exist is implemented in Issue 20 (`feature/20-ticket-workflow`).
* **No Dashboard Aggregation Endpoints (Deferred to Issue 21):** Dashboard metric endpoints (`/api/v1/dashboards/requester`, `/api/v1/dashboards/staff`, `/api/v1/dashboards/admin`) are implemented in Issue 21 (`feature/21-role-dashboards`).

---

### 1.4 Mapped Requirements & Business Rules Traceability

| Requirement / Rule ID | Source Document | Description | Implementation Target |
| :--- | :--- | :--- | :--- |
| **FR-01.1** | `docs/lab-04/specification.md` | Parent-child relationship where Ticket contains zero or more Actions Taken | Prisma schema & migrations |
| **FR-01.2** | `docs/lab-04/specification.md` | Endpoint to record technical action taken by IT Staff / Admin | `POST /api/v1/tickets/:ticketId/actions-taken` |
| **FR-01.3** | `docs/lab-04/specification.md` | Performer auto-populated from session (`req.user.id`) | Request handler / middleware |
| **FR-01.4** | `docs/lab-04/specification.md` | Capture timestamp, description, result, follow-up flags, notes | Prisma model & DTO validation |
| **FR-01.5** | `docs/lab-04/specification.md` | Retrieve actions in ascending chronological order | `GET /api/v1/tickets/:ticketId/actions-taken` |
| **FR-01.6** | `docs/lab-04/specification.md` | Endpoint to update existing actions taken | `PUT /api/v1/tickets/:ticketId/actions-taken/:actionId` |
| **FR-01.7** | `docs/lab-04/specification.md` | Requesters read-only for owned tickets; write operations return 403 Forbidden | Authorization guard |
| **FR-05.1** | `docs/lab-04/specification.md` | Optimistic concurrency versioning on tickets and actions | Prisma `version` integer |
| **FR-05.2** | `docs/lab-04/specification.md` | Return HTTP 409 Conflict upon stale version mismatch | PUT handler concurrency check |
| **BR-01** | `docs/lab-04/specification.md` | Strict parent-child relationship (`ticketId` required and immutable) | Prisma schema FK constraint |
| **BR-02** | `docs/lab-04/specification.md` | Separate ticket owner coordination vs individual action performer | Schema relations (`ownerId` vs `performedById`) |
| **BR-03** | `docs/lab-04/specification.md` | Automated performer identity from authenticated session (`req.user.id`) | Server handler ignores client-provided performer |
| **BR-04** | `docs/lab-04/specification.md` | Conditional follow-up note mandatory when `followUpRequired=true` | Request validator |
| **BR-05** | `docs/lab-04/specification.md` | Field validations: description (5–1000), result (2–1000), date not future | Request validator |
| **BR-06** | `docs/lab-04/specification.md` | Role-based authorization: Staff/Admin write, Requester view-only for owned | Authorization guard |
| **BR-07** | `docs/lab-04/specification.md` | Active account invariant for performers (`isActive === true`) | Auth middleware & user lookup |
| **BR-12** | `docs/lab-04/specification.md` | Optimistic concurrency & stale update detection via `version` | PUT handler concurrency check |

---

## 2. Prisma Schema Modifications & Migration Strategy

### 2.1 Prisma Schema Modifications (`server/prisma/schema.prisma`)

#### 1. Define `ActionTaken` Model
```prisma
// ---------------------------------------------------------------------------
// 9. Action Taken (Parent-Child Work Tracking by IT Staff - BR-01..BR-05)
// ---------------------------------------------------------------------------
model ActionTaken {
  id                Int      @id @default(autoincrement())
  ticketId          Int
  performedById     Int
  actionDateTime    DateTime @default(now())
  actionDescription String   @db.Text
  result            String   @db.Text
  followUpRequired  Boolean  @default(false)
  followUpNote      String?  @db.Text
  attachmentNotes   String?  @db.VarChar(255)
  version           Int      @default(1)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  ticket      Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  performedBy User   @relation("StaffActionsTaken", fields: [performedById], references: [id], onDelete: Restrict)

  @@index([ticketId, actionDateTime])
  @@index([performedById])
  @@map("actions_taken")
}
```

#### 2. Update `Ticket` Model
Add reciprocal `actionsTaken` relation, optimistic concurrency `version`, and dashboard composite indexes:
```prisma
model Ticket {
  // Existing fields...
  id                             Int             @id @default(autoincrement())
  ticketNumber                   String          @unique @db.VarChar(32)
  requesterId                    Int
  ownerId                        Int?
  categoryId                     Int
  relatedSystemId                Int
  summary                        String          @db.VarChar(100)
  description                    String          @db.Text
  requestedPriority              Priority        @default(MEDIUM)
  itPriority                     Priority?
  currentStatus                  TicketStatus    @default(NEW)
  requesterResolutionConfirmedAt DateTime?
  version                        Int             @default(1)
  createdAt                      DateTime        @default(now())
  updatedAt                      DateTime        @updatedAt

  // Existing relations...
  requester         User            @relation("RequesterTickets", fields: [requesterId], references: [id], onDelete: Restrict)
  owner             User?           @relation("StaffAssignedTickets", fields: [ownerId], references: [id], onDelete: SetNull)
  category          Category        @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  relatedSystem     RelatedSystem   @relation(fields: [relatedSystemId], references: [id], onDelete: Restrict)
  attachments       Attachment[]
  publicComments    PublicComment[]
  internalNotes     InternalNote[]

  // Sprint 4 Relation: Actions Taken
  actionsTaken      ActionTaken[]

  // Indexes
  @@index([requesterId])
  @@index([ownerId])
  @@index([currentStatus])
  @@index([itPriority])
  @@index([categoryId])
  @@index([createdAt])
  @@index([requesterId, currentStatus, updatedAt])
  @@index([ownerId, currentStatus, updatedAt])
  @@index([currentStatus, itPriority])
  @@map("tickets")
}
```

#### 3. Update `User` Model
Add reciprocal `actionsTaken` relation:
```prisma
model User {
  // Existing fields...
  id                 Int             @id @default(autoincrement())
  email              String          @unique
  passwordHash       String
  name               String
  department         String?
  role               Role            @default(REQUESTER)
  mustChangePassword Boolean         @default(true)
  isActive           Boolean         @default(true)
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  // Existing relations...
  requestedTickets   Ticket[]        @relation("RequesterTickets")
  assignedTickets    Ticket[]        @relation("StaffAssignedTickets")
  removedAttachments Attachment[]    @relation("UserRemovedAttachments")
  publicComments     PublicComment[]
  internalNotes      InternalNote[]

  // Sprint 4 Relation: Performed Actions Taken
  actionsTaken       ActionTaken[]   @relation("StaffActionsTaken")

  @@map("users")
}
```

---

### 2.2 Non-Destructive Migration Strategy

The migration must evolve the database schema without destroying or modifying existing historical data from Labs 1–3:
1. **Additive Schema Mutations Only:**
   - The creation of `actions_taken` is an entirely additive operation (new table).
   - Adding `version` to `tickets` with `DEFAULT 1 NOT NULL` automatically assigns version 1 to all existing historical tickets without data corruption.
   - Adding composite indexes on `tickets` enhances query performance without touching table row data.
2. **Referential Integrity Constraints:**
   - `ticketId REFERENCES tickets(id) ON DELETE CASCADE`: Guarantees actions are cleaned up if a ticket is removed (though production tickets are never hard deleted).
   - `performedById REFERENCES users(id) ON DELETE RESTRICT`: Prohibits hard-deleting a user who has performed actions taken, preserving audit trails and accountability.
3. **Rollback & Disaster Recovery SQL:**
   If a migration rollback is required during development or staging:
   ```sql
   BEGIN;
   DROP TABLE IF EXISTS "actions_taken" CASCADE;
   ALTER TABLE "tickets" DROP COLUMN IF EXISTS "version";
   DROP INDEX IF EXISTS "tickets_requesterId_currentStatus_updatedAt_idx";
   DROP INDEX IF EXISTS "tickets_ownerId_currentStatus_updatedAt_idx";
   DROP INDEX IF EXISTS "tickets_currentStatus_itPriority_idx";
   COMMIT;
   ```

---

## 3. Idempotent Seed Data Strategy (`server/prisma/seed.ts`)

The database seed script must execute idempotently using Prisma upserts and relational checks. The seed dataset must represent realistic campus IT operations covering all major operational scenarios.

### 3.1 Scenario Coverage Matrix in Seed Data

| Scenario | Target Ticket(s) | Status | Actions Taken Count | Performer(s) | Follow-Up Flag & Notes | Attachment Notes |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **Legacy / Empty Actions** | `TKT-2026-00003`, `TKT-2026-00004` | `NEW`, `OPEN` | **0** | None | N/A | None |
| **Single Action Complete** | `TKT-2026-00002` | `IN_PROGRESS` | **1** | `Sompong IT` (ID 6) | `followUpRequired: false`, `followUpNote: null` | `"switch_config_dump.txt"` |
| **Multi-Staff Collaborative Actions** | `TKT-2026-00001` | `IN_PROGRESS` | **3** | Action 1: `Sompong IT` (ID 6)<br/>Action 2: `Wichai Support` (ID 7)<br/>Action 3: `Anong Network` (ID 8) | Action 1: `followUpRequired: true`, note provided<br/>Action 2: `followUpRequired: false`<br/>Action 3: `followUpRequired: false` | `"wifi_survey_floor4.pdf"` |
| **Active Pending Follow-Up** | `TKT-2026-00005` | `WAITING_FOR_REQUESTER` | **2** | `Wichai Support` (ID 7) | Action 2: `followUpRequired: true`, `"Waiting for user to bring laptop to Central IT desk"` | `"diagnostic_screen.png"` |
| **Resolved with Historical Actions** | `TKT-2026-00006`, `TKT-2026-00007` | `RESOLVED`, `CLOSED` | **2** | `Sompong IT` (ID 6) | All actions `followUpRequired: false` | None |

### 3.2 Seeding Implementation Plan
1. **Clean Actions Taken on Seed Rerun:**
   ```typescript
   await prisma.actionTaken.deleteMany();
   ```
2. **Seed Deterministic Actions on Known Tickets:**
   Link actions to created tickets via their unique `ticketNumber` or generated ID.
3. **Synchronize Sequences:**
   Synchronize PostgreSQL sequences for `actions_taken` and `tickets`:
   ```sql
   SELECT setval(pg_get_serial_sequence('actions_taken', 'id'), coalesce(max(id), 1)) FROM actions_taken;
   ```

---

## 4. Access Control & Authorization Matrix

TokTickIT enforces strict Role-Based Access Control (RBAC) and Resource Ownership checks at the API layer. The UI reflects permissions, but the backend is the authoritative enforcement point.

### 4.1 RBAC & Ownership Rules

| Operation | Path | Role: `REQUESTER` | Role: `IT_STAFF` | Role: `ADMINISTRATOR` | Invariant Enforcement |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Create Action** | `POST /tickets/:id/actions-taken` | **403 Forbidden** | **Allowed** | **Allowed** | Only staff/admin may record work (`BR-06`). Performer auto-populated from session (`req.user.id`) (`BR-03`). |
| **List Actions** | `GET /tickets/:id/actions-taken` | **Allowed (Owned Only)**<br/>*403 Forbidden if unowned* | **Allowed (All Tickets)** | **Allowed (All Tickets)** | Requesters can only inspect actions on their own tickets (`BR-06`, `BR-13`). |
| **Update Action** | `PUT /tickets/:id/actions-taken/:actionId` | **403 Forbidden** | **Allowed** | **Allowed** | Requesters cannot modify actions. Must match current `version` (`BR-12`). |

### 4.2 Security Rules & Edge Cases
1. **Performer Identity Invariant (`BR-03`):**
   - The client request body MUST NOT determine `performedById`.
   - If the client sends `performedById` or `performedBy` in the JSON payload, the backend MUST silently overwrite or discard it, using `req.user.id`.
2. **Active Account Invariant (`BR-07`):**
   - Inactive staff members (`isActive === false`) cannot create or update actions taken. The `authenticate` middleware rejects inactive accounts with HTTP `401 Unauthorized` / `403 Forbidden`.
3. **Cross-Requester Isolation:**
   - If User A (`REQUESTER`) attempts to call `GET /api/v1/tickets/:ticketId/actions-taken` where `ticket.requesterId !== User A.id`, the server must return HTTP `403 Forbidden` (`FORBIDDEN_TICKET_ACCESS`).
4. **Password Change Enforcement:**
   - As established in Lab 3 (`requirePasswordChanged`), any user with `mustChangePassword === true` is blocked from operational actions taken routes with HTTP `403 Forbidden` (`PASSWORD_CHANGE_REQUIRED`).

---

## 5. Data Validation & Payload Rules

### 5.1 Request DTO Schemas & Constraints

#### 1. Create Action Taken DTO (`POST /api/v1/tickets/:id/actions-taken`)
```typescript
export interface CreateActionTakenDto {
  actionDateTime?: string;      // ISO 8601 string; optional; defaults to now(); cannot be in future (>60s)
  actionDescription: string;   // Required; trimmed length 5 to 1000 characters (also accepts alias `description`)
  result: string;              // Required; trimmed length 2 to 1000 characters
  followUpRequired?: boolean;  // Optional; defaults to false
  followUpNote?: string | null;// Required if followUpRequired === true (5 to 1000 chars); null/omitted if false
  attachmentNotes?: string | null; // Optional; max 255 characters
}
```

#### 2. Update Action Taken DTO (`PUT /api/v1/tickets/:id/actions-taken/:actionId`)
```typescript
export interface UpdateActionTakenDto {
  actionDateTime?: string;      // ISO 8601 string; optional
  actionDescription?: string;   // Trimmed length 5 to 1000 characters
  result?: string;              // Trimmed length 2 to 1000 characters
  followUpRequired?: boolean;  // Optional boolean
  followUpNote?: string | null;// Required if followUpRequired === true (5 to 1000 chars); null if false
  attachmentNotes?: string | null; // Optional; max 255 characters
  version: number;             // Required integer; must match database version
}
```

### 5.2 Field-Level Validation Rules

| Field Name | Type | Required? | Constraints & Business Rules | Error Code on Failure |
| :--- | :--- | :---: | :--- | :--- |
| `ticketId` | Integer (URL Param) | **Yes** | Must be positive integer; target ticket must exist in database | `INVALID_TICKET_ID` (400) / `TICKET_NOT_FOUND` (404) |
| `actionId` | Integer (URL Param) | **Yes** (PUT) | Must be positive integer; target action must exist under specified ticket | `INVALID_ACTION_ID` (400) / `ACTION_NOT_FOUND` (404) |
| `actionDateTime` | ISO 8601 String | No | Defaults to server `now()`. If provided, must parse as valid date and cannot exceed `now() + 60 seconds` (`BR-05`). | `INVALID_ACTION_DATE` (422) / `FUTURE_ACTION_DATE` (422) |
| `actionDescription` / `description` | String | **Yes** | Trimmed length between 5 and 1000 characters (`BR-05`). Accepts `actionDescription` or `description`. | `INVALID_DESCRIPTION` (422) |
| `result` | String | **Yes** | Trimmed length between 2 and 1000 characters (`BR-05`). | `INVALID_RESULT` (422) |
| `followUpRequired` | Boolean | No | Defaults to `false`. | `INVALID_FOLLOW_UP_FLAG` (422) |
| `followUpNote` | String / Null | **Conditional** | **If `followUpRequired === true`**: Must be non-empty string between 5 and 1000 characters.<br/>**If `followUpRequired === false`**: Must be `null` or omitted (`BR-04`). | `MISSING_FOLLOW_UP_NOTE` (422) / `INVALID_FOLLOW_UP_NOTE` (422) |
| `attachmentNotes` | String / Null | No | Max length 255 characters (`BR-05`). | `INVALID_ATTACHMENT_NOTES` (422) |
| `version` | Integer | **Yes** (PUT) | Must equal the current `version` column of the target `ActionTaken` record (`BR-12`). | `CONCURRENCY_CONFLICT` (409) |

---

## 6. Backend REST API Specifications

### 6.1 Record New Action Taken
* **Method & Path:** `POST /api/v1/tickets/:ticketId/actions-taken`
* **Access Control:** Authenticated `IT_STAFF` or `ADMINISTRATOR` only. Requesters rejected with HTTP `403 Forbidden`.
* **Request Headers:**
  - `Content-Type: application/json`
  - `Cookie: toktickit_session=<token>` or `Authorization: Bearer <token>`
* **URL Parameter:** `ticketId` (integer)
* **Sample Request Body:**
  ```json
  {
    "actionDateTime": "2026-05-12T14:15:00.000Z",
    "actionDescription": "Ran hardware battery diagnostics and verified motherboard power sensors.",
    "result": "Battery cell degradation confirmed at 42%. Replacement unit required.",
    "followUpRequired": true,
    "followUpNote": "Order OEM replacement battery and schedule maintenance window.",
    "attachmentNotes": "battery_diagnostic.png attached in ticket files."
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "actionTaken": {
        "id": 1,
        "ticketId": 101,
        "actionDateTime": "2026-05-12T14:15:00.000Z",
        "actionDescription": "Ran hardware battery diagnostics and verified motherboard power sensors.",
        "result": "Battery cell degradation confirmed at 42%. Replacement unit required.",
        "followUpRequired": true,
        "followUpNote": "Order OEM replacement battery and schedule maintenance window.",
        "attachmentNotes": "battery_diagnostic.png attached in ticket files.",
        "version": 1,
        "performedBy": {
          "id": 6,
          "name": "Sompong IT",
          "role": "IT_STAFF"
        },
        "createdAt": "2026-05-12T14:15:02.120Z",
        "updatedAt": "2026-05-12T14:15:02.120Z"
      }
    }
  }
  ```
* **Error Responses:**
  - `400 Bad Request`: Invalid `ticketId` URL parameter.
  - `401 Unauthorized`: Unauthenticated.
  - `403 Forbidden`: User is `REQUESTER` (`FORBIDDEN_ACTION_TAKEN_WRITE`) or inactive account.
  - `404 Not Found`: Ticket not found.
  - `422 Unprocessable Entity`: Validation failure (e.g., missing description, missing follow-up note when `followUpRequired=true`).

---

### 6.2 List Actions Taken for Ticket
* **Method & Path:** `GET /api/v1/tickets/:ticketId/actions-taken`
* **Access Control:**
  - `IT_STAFF` & `ADMINISTRATOR`: Permitted for any ticket.
  - `REQUESTER`: Permitted **only** if requester owns the ticket (`ticket.requesterId === req.user.id`). Other requesters receive HTTP `403 Forbidden`.
* **URL Parameter:** `ticketId` (integer)
* **Success Response (`200 OK` - With Actions):**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": 1,
          "ticketId": 101,
          "actionDateTime": "2026-05-12T10:30:00.000Z",
          "actionDescription": "Inspected power management logs and initiated battery test.",
          "result": "Battery cycle count exceeds 1200 cycles.",
          "followUpRequired": true,
          "followUpNote": "Procure replacement battery.",
          "attachmentNotes": null,
          "version": 1,
          "performedBy": {
            "id": 6,
            "name": "Sompong IT",
            "role": "IT_STAFF"
          },
          "createdAt": "2026-05-12T10:30:05.000Z",
          "updatedAt": "2026-05-12T10:30:05.000Z"
        },
        {
          "id": 2,
          "ticketId": 101,
          "actionDateTime": "2026-05-12T14:15:00.000Z",
          "actionDescription": "Installed replacement OEM battery pack.",
          "result": "System holds charge normally, battery health 100%.",
          "followUpRequired": false,
          "followUpNote": null,
          "attachmentNotes": "battery_diagnostic.png",
          "version": 1,
          "performedBy": {
            "id": 7,
            "name": "Wichai Support",
            "role": "IT_STAFF"
          },
          "createdAt": "2026-05-12T14:15:00.000Z",
          "updatedAt": "2026-05-12T14:15:00.000Z"
        }
      ],
      "totalCount": 2
    }
  }
  ```
* **Success Response (`200 OK` - Empty List / Legacy Ticket):**
  ```json
  {
    "success": true,
    "data": {
      "items": [],
      "totalCount": 0
    }
  }
  ```
* **Error Responses:**
  - `400 Bad Request`: Invalid `ticketId`.
  - `401 Unauthorized`: Unauthenticated.
  - `403 Forbidden`: Authenticated Requester does not own the target ticket (`FORBIDDEN_TICKET_ACCESS`).
  - `404 Not Found`: Ticket does not exist.

---

### 6.3 Update Existing Action Taken
* **Method & Path:** `PUT /api/v1/tickets/:ticketId/actions-taken/:actionId`
* **Access Control:** Authenticated `IT_STAFF` or `ADMINISTRATOR` only. Requesters receive HTTP `403 Forbidden`.
* **URL Parameters:** `ticketId` (integer), `actionId` (integer)
* **Sample Request Body:**
  ```json
  {
    "actionDateTime": "2026-05-12T14:15:00.000Z",
    "actionDescription": "Installed replacement OEM battery pack and verified calibration.",
    "result": "System holds charge normally, calibration cycle passed 100%.",
    "followUpRequired": false,
    "followUpNote": null,
    "attachmentNotes": "battery_diagnostic.png",
    "version": 1
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "actionTaken": {
        "id": 2,
        "ticketId": 101,
        "actionDateTime": "2026-05-12T14:15:00.000Z",
        "actionDescription": "Installed replacement OEM battery pack and verified calibration.",
        "result": "System holds charge normally, calibration cycle passed 100%.",
        "followUpRequired": false,
        "followUpNote": null,
        "attachmentNotes": "battery_diagnostic.png",
        "version": 2,
        "performedBy": {
          "id": 7,
          "name": "Wichai Support",
          "role": "IT_STAFF"
        },
        "createdAt": "2026-05-12T14:15:00.000Z",
        "updatedAt": "2026-05-12T14:40:15.000Z"
      }
    }
  }
  ```
* **Concurrency Conflict Response (`409 Conflict`):**
  ```json
  {
    "success": false,
    "error": {
      "code": "CONCURRENCY_CONFLICT",
      "message": "Action Taken has been modified by another user. Please refresh and try again.",
      "currentVersion": 2
    }
  }
  ```
* **Error Responses:**
  - `400 Bad Request`: Missing version or invalid URL IDs.
  - `401 Unauthorized`: Unauthenticated.
  - `403 Forbidden`: Requester user or inactive account.
  - `404 Not Found`: Ticket or action taken record not found.
  - `409 Conflict`: `version` mismatch.
  - `422 Unprocessable Entity`: Field validation failure.

---

## 7. Software Test Specification (STS) Mapping

All backend API testing for Issue 18 is mapped to `server/tests/lab-04/actions-taken.api.test.ts`. Tests must execute under Vitest + Supertest against a clean test database.

| Planned Test Case | Test Description & Invariant | Requirement / Rule Traceability | Expected Result |
| :--- | :--- | :--- | :--- |
| **API-18.01** | Create Action Taken as `IT_STAFF` with valid fields | `FR-01.2`, `BR-01`, `AC-18.1` | HTTP `201 Created`, record stored with auto-generated ID, `version: 1` |
| **API-18.02** | Create Action Taken as `ADMINISTRATOR` | `FR-01.2`, `BR-06`, `AC-18.1` | HTTP `201 Created`, valid persistence |
| **API-18.03** | Auto-populate `performedById` from authenticated session | `FR-01.3`, `BR-03`, `AC-18.1` | `performedById` matches `req.user.id`, client payload spoofing ignored |
| **API-18.04** | Reject Action Taken creation by `REQUESTER` | `FR-01.7`, `BR-06`, `AC-18.2` | HTTP `403 Forbidden`, `code: "FORBIDDEN_ACTION_TAKEN_WRITE"` |
| **API-18.05** | Validate conditional follow-up note (`followUpRequired=true`) | `BR-04`, `AC-18.3` | HTTP `422 Unprocessable Entity` if note is missing or whitespace-only |
| **API-18.06** | Clear `followUpNote` when `followUpRequired=false` | `BR-04` | Stored `followUpNote` is set to `null` even if client passed text |
| **API-18.07** | Reject description shorter than 5 characters or empty | `BR-05` | HTTP `422 Unprocessable Entity` |
| **API-18.08** | Reject result shorter than 2 characters or empty | `BR-05` | HTTP `422 Unprocessable Entity` |
| **API-18.09** | Reject future action dates exceeding 60s skew tolerance | `BR-05` | HTTP `422 Unprocessable Entity` |
| **API-18.10** | Retrieve chronological list of actions for ticket (`GET`) | `FR-01.5`, `AC-18.1` | HTTP `200 OK`, items sorted ascending by `actionDateTime` |
| **API-18.11** | Safe empty array handling for legacy tickets without actions | `FR-01.1`, `AC-18.4` | HTTP `200 OK`, `items: []`, `totalCount: 0` |
| **API-18.12** | Requester view-only retrieval for owned ticket | `FR-01.7`, `AC-18.2` | HTTP `200 OK` for owned ticket |
| **API-18.13** | Block Requester retrieval for unowned ticket | `FR-01.7`, `AC-18.2` | HTTP `403 Forbidden`, `code: "FORBIDDEN_TICKET_ACCESS"` |
| **API-18.14** | Edit Action Taken (`PUT`) with valid payload and version | `FR-01.6`, `AC-18.5` | HTTP `200 OK`, fields updated, `version` incremented to 2 |
| **API-18.15** | Optimistic concurrency conflict rejection on stale version | `FR-05.2`, `BR-12`, `AC-18.5` | HTTP `409 Conflict`, `code: "CONCURRENCY_CONFLICT"` |
| **API-18.16** | Reject edit attempt by `REQUESTER` | `FR-01.7`, `BR-06`, `AC-18.2` | HTTP `403 Forbidden` |
| **API-18.17** | Reject action creation by inactive user account | `BR-07` | HTTP `401 Unauthorized` / `403 Forbidden` |

---

## 8. Acceptance Criteria (AC-18.1 to AC-18.5)

### AC-18.1: Successful Action Taken Creation by IT Staff / Administrator
- **Given** an authenticated user with role `IT_STAFF` or `ADMINISTRATOR`,
- **When** submitting a valid JSON payload containing `actionDescription` (min 5 chars), `result` (min 2 chars), and optional `actionDateTime` to `POST /api/v1/tickets/:ticketId/actions-taken`,
- **Then** the server persists the record, automatically sets `performedById` to the authenticated user's ID (`req.user.id`), sets `version` to 1, and responds with HTTP `201 Created` returning the serialized `actionTaken` object.

### AC-18.2: Role & Ownership Authorization Enforcement
- **Given** an authenticated user with role `REQUESTER`,
- **When** the user attempts to create (`POST`) or edit (`PUT`) an action taken on any ticket,
- **Then** the server rejects the request with HTTP `403 Forbidden` and error code `FORBIDDEN_ACTION_TAKEN_WRITE`;
- **Furthermore, when** the requester calls `GET /api/v1/tickets/:ticketId/actions-taken` for a ticket where `ticket.requesterId !== req.user.id`,
- **Then** the server rejects the request with HTTP `403 Forbidden` and error code `FORBIDDEN_TICKET_ACCESS`.

### AC-18.3: Conditional Follow-Up Note Validation
- **Given** an authorized IT Staff or Administrator user submitting `POST` or `PUT` to `/api/v1/tickets/:ticketId/actions-taken`,
- **When** `followUpRequired` is set to `true` and `followUpNote` is missing, `null`, empty string, or whitespace-only (trimmed length < 5),
- **Then** the server rejects the mutation with HTTP `422 Unprocessable Entity` (or HTTP `400 Bad Request`) with error code `MISSING_FOLLOW_UP_NOTE` detailing that a follow-up justification note is required.

### AC-18.4: Safe Empty Array Handling for Legacy Tickets
- **Given** an accessible ticket with zero associated actions taken (such as tickets migrated from Labs 1–3),
- **When** an authorized user calls `GET /api/v1/tickets/:ticketId/actions-taken`,
- **Then** the server responds with HTTP `200 OK` returning `{ success: true, data: { items: [], totalCount: 0 } }` without runtime null-pointer exceptions or schema errors.

### AC-18.5: Optimistic Concurrency & Edit Handling
- **Given** an existing `ActionTaken` record with version $V$,
- **When** an authorized user submits an update via `PUT /api/v1/tickets/:ticketId/actions-taken/:actionId` with `version: V`,
- **Then** the record updates successfully, increments its version to $V+1$, and returns HTTP `200 OK`;
- **When** a user submits an update with a mismatched or stale version $V' \ne V$,
- **Then** the update is aborted and the server responds with HTTP `409 Conflict` and error code `CONCURRENCY_CONFLICT`.

---

## 9. Visual Verification & Playwright Auxiliary Safeguard

> [!IMPORTANT]
> **Strict Playwright Visual Isolation Rule**:
> Playwright visual verification is strictly an auxiliary developer aid and submission evidence mechanism. Screenshots captured during browser journeys are stored exclusively under `artifacts/lab-04/screenshots/actions-taken/`.
> Under no circumstances shall Playwright screenshot assertions or visual snapshot comparisons be added, altered, or mixed into `docs/lab-04/tests.md`, unit tests, or the primary Software Test Specification (STS). All automated regression gates rely on deterministic code assertions.

---

## 10. Issue 18 Definition of Done (DoD) Checklist

- [ ] **Contract Approved:** `docs/features/18-actions-taken-foundation/contract.md` authored, reviewed, and finalized.
- [ ] **Prisma Schema Updated:** `ActionTaken` model, relations on `User` and `Ticket`, `version` fields, and composite indexes added to `server/prisma/schema.prisma`.
- [ ] **Migration Created & Applied:** Clean, non-destructive migration script generated in `server/prisma/migrations/` preserving all existing data.
- [ ] **Idempotent Seeding Verified:** `server/prisma/seed.ts` updated with 0, 1, and multi-action scenarios across different IT staff members, follow-up flags, and attachment notes; runs repeatedly without duplicate errors.
- [ ] **REST Endpoints Implemented:** `POST`, `GET`, and `PUT` under `/api/v1/tickets/:ticketId/actions-taken` fully functional in Express router.
- [ ] **RBAC & Ownership Enforced:** Requesters restricted to view-only on owned tickets; 403 Forbidden returned on write or unowned view attempts.
- [ ] **Performer Invariant Enforced:** Performer ID strictly derived from session (`req.user.id`).
- [ ] **Conditional Validation Enforced:** Follow-up note strictly required if and only if `followUpRequired === true`.
- [ ] **Concurrency Control Verified:** Version increments on edit; returns HTTP 409 Conflict on stale update.
- [ ] **Automated Tests Passing:** 100% pass rate in `server/tests/lab-04/actions-taken.api.test.ts`.
- [ ] **Zero Regressions:** All existing tests across Labs 1–3 continue to pass cleanly.

