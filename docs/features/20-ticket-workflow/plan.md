# Feature Implementation Plan — Issue 20: Ticket Status Lifecycle, Concurrency & Resolution Gate

**Branch:** `feature/20-ticket-workflow`  
**Contract Reference:** `docs/features/20-ticket-workflow/contract.md`  
**Sprint Specifications:** `docs/lab-04/specification.md`, `docs/lab-04/ui-spec.md`, `docs/lab-04/api-spec.md`, `docs/lab-04/tests.md`, `docs/lab-04/poc-scope-and-issues.md`  
**Foundation References:** `docs/features/18-actions-taken-foundation/contract.md`, `docs/features/19-actions-taken-ui/contract.md`

---

## 1. Target File Inventory

| File Path | Action | Responsibility |
| :--- | :--- | :--- |
| `server/src/services/ticketWorkflow.service.ts` | **CREATE** | Domain workflow service encapsulating `ALLOWED_STATUS_TRANSITIONS` (`BR-06`), `isTransitionAllowed(from, to)`, `getAllowedNextStatuses(from)`, resolution gate invariant check (`BR-07`), optimistic concurrency token validation (`BR-09`), and advisory requester resolution logic (`BR-08`). |
| `server/src/controllers/ticketWorkflow.controller.ts` | **CREATE** | Express controller handlers for status transition (`PATCH /api/v1/staff/tickets/:id/status` and `PATCH /api/v1/tickets/:id/status`) and requester advisory resolution (`POST /api/v1/tickets/:id/resolve-request`). |
| `server/src/routes/staff.ts` | **MODIFY** | Wire `PATCH /api/v1/staff/tickets/:id/status` to the new workflow validation rules (`BR-06`, `BR-07`, `BR-09`), returning `400 Bad Request` on invalid transitions or missing `ActionTaken` records, and `409 Conflict` on stale `updatedAt` timestamps. |
| `server/src/routes/tickets.ts` | **MODIFY** | Expose `PATCH /api/v1/tickets/:id/status` alias and `POST /api/v1/tickets/:id/resolve-request` (`BR-08`), and enrich `GET /api/v1/tickets/:id` to include `actionsTaken` (ordered chronologically with `performedBy`) and `requesterResolvedAt` alongside `requesterResolutionConfirmedAt`. |
| `client/src/types/index.ts` | **MODIFY** | Add `updatedAt?: string` to `StaffStatusUpdatePayload` and ensure `TicketDetail` includes `requesterResolvedAt?: string \| null`. |
| `client/src/api.ts` | **MODIFY** | Update `updateStaffTicketStatus(ticketId, status, updatedAt?)` to transmit `updatedAt` in the `PATCH` body and expose `confirmRequesterResolution(ticketId)` for `POST /api/v1/tickets/:id/resolve-request`. |
| `client/src/components/ActionsTakenSection.tsx` | **MODIFY** | Invoke `onActionsUpdated(fetchedActions)` upon initial fetch when `initialActions` is omitted so parent components (`StaffTicketDetail.tsx`) always stay synchronized with the latest `ActionTaken` count. |
| `client/src/components/StaffTicketDetail.tsx` | **MODIFY** | Filter status dropdown dynamically to `BR-06` valid next states (`D-11`), render terminal state badge/notice for `CLOSED`/`CANCELLED`, display resolution gate guidance alert when `RESOLVED` is selected with `0` actions (`D-12`, `BR-07`), render non-destructive `409 Conflict` banner with `[Refresh Ticket State]` preserving draft inputs (`D-13`, `BR-09`), and refresh header/sidebar badges and `updatedAt` in place (`D-14`). |
| `server/tests/lab-04/ticket-workflow.api.test.ts` | **CREATE** | Backend Jest + Supertest integration test suite covering `BR-06` transition matrix, `BR-07` resolution gate, `BR-08` requester advisory resolution, and `BR-09` optimistic concurrency (`AC-20.1`–`AC-20.4`). |
| `client/src/tests/lab-04/TicketWorkflow.test.tsx` | **CREATE** | Frontend Vitest + React Testing Library suite verifying dynamic status dropdown filtering, resolution gate warning alert, non-destructive `409 Conflict` banner preserving draft inputs, and in-place badge updates (`AC-20.1`–`AC-20.4`). |

---

## 2. Phase 1: Status Transition Matrix & Validation Rules (`BR-06`)

### 2.1 Authoritative Status Transition Matrix (`server/src/services/ticketWorkflow.service.ts`)
Define the strict state transition map `ALLOWED_STATUS_TRANSITIONS` enforcing `BR-06`:

```typescript
export const ALLOWED_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: [],
  REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};
```

### 2.2 Transition Validation Rules
1. **Valid Target Status Enum Check**:
   - Verify incoming `status` (or `currentStatus`) is one of the 8 canonical `TicketStatus` values (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
   - If invalid or missing, return HTTP `400 Bad Request` with `code: "VALIDATION_ERROR"`.
2. **Matrix Path Enforcement (`BR-06`)**:
   - Check whether `targetStatus` is in `ALLOWED_STATUS_TRANSITIONS[ticket.currentStatus]`.
   - Terminal states (`CLOSED` and `CANCELLED`) have empty transition arrays `[]` and reject all outgoing transitions.
   - Any disallowed transition (e.g., `NEW` → `RESOLVED`, `NEW` → `CLOSED`, `RESOLVED` → `IN_PROGRESS`, `CLOSED` → `REOPENED`, `CANCELLED` → `OPEN`) returns HTTP `400 Bad Request`:
     ```json
     {
       "error": {
         "code": "INVALID_STATUS_TRANSITION",
         "message": "Invalid status transition from NEW to CLOSED."
       }
     }
     ```

---

## 3. Phase 2: Resolution Gate & Concurrency Control (`BR-07`, `BR-08`, `BR-09`)

### 3.1 Resolution Gate Invariant Enforcement (`BR-07`)
1. When `targetStatus === "RESOLVED"` and the transition from `ticket.currentStatus` to `RESOLVED` is permitted by `BR-06`:
   - Query `await prisma.actionTaken.count({ where: { ticketId } })`.
   - If `actionCount < 1`, abort the status transition and return HTTP `400 Bad Request`:
     ```json
     {
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "Cannot resolve ticket without at least one recorded Action Taken."
       }
     }
     ```
2. If `actionCount >= 1`:
   - Proceed with updating `currentStatus: "RESOLVED"` and setting `resolvedAt = ticket.resolvedAt ?? now`.

### 3.2 Optimistic Concurrency Control (`BR-09`)
1. **Timestamp Token Comparison**:
   - Extract `updatedAt` from the request body (`req.body.updatedAt`).
   - If `updatedAt` is provided and cannot be parsed as a valid ISO-8601 date (`Number.isNaN(new Date(updatedAt).getTime())`), return HTTP `400 Bad Request`.
   - Compare `new Date(updatedAt).getTime() !== ticket.updatedAt.getTime()`.
   - On mismatch, abort the update and return HTTP `409 Conflict`:
     ```json
     {
       "error": {
         "code": "CONFLICT",
         "message": "Ticket was modified by another user. Please refresh and try again."
       }
     }
     ```
   - On success, Prisma automatically increments `ticket.updatedAt` and returns the fresh ISO-8601 `updatedAt` timestamp in the HTTP `200 OK` response payload.

### 3.3 Requester Advisory Resolution (`BR-08`)
1. **Endpoint Support (`POST /api/v1/tickets/:id/resolve-request` & `POST /api/v1/tickets/:id/confirm-resolution`)**:
   - Authenticate caller (`USER_REQUESTER` or ticket owner).
   - Verify ticket is not in terminal state (`CLOSED` or `CANCELLED`).
   - Update `requesterResolutionConfirmedAt: new Date()` in the database **without mutating `currentStatus` or `resolvedAt`**.
   - Return HTTP `200 OK` including both `requesterResolvedAt` and `requesterResolutionConfirmedAt` ISO timestamps alongside the unchanged `currentStatus`.

---

## 4. Phase 3: Frontend Workflow Controls & UX (`StaffTicketDetail.tsx`)

### 4.1 Dynamic Status Dropdown Filtering (`BR-06`, `D-11`)
1. Define client-side `ALLOWED_NEXT_STATUSES` matching `BR-06`:
   - `NEW` → `["OPEN", "IN_PROGRESS", "CANCELLED"]`
   - `OPEN` → `["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]`
   - `IN_PROGRESS` → `["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]`
   - `WAITING_FOR_REQUESTER` → `["IN_PROGRESS", "RESOLVED", "CANCELLED"]`
   - `RESOLVED` → `["CLOSED", "REOPENED"]`
   - `CLOSED` → `[]`
   - `REOPENED` → `["IN_PROGRESS", "RESOLVED", "CANCELLED"]`
   - `CANCELLED` → `[]`
2. In `StaffTicketDetail.tsx`:
   - Populate `#staff-status-select` (`data-testid="status-select"`) with the current status option (`{STATUS} (Current)`) plus only the allowed next statuses from `ALLOWED_NEXT_STATUSES[ticket.currentStatus]`.
   - When `ticket.currentStatus` is terminal (`CLOSED` or `CANCELLED`), disable `#staff-status-select` and the Update Status button, and render a subtle terminal state notice (`data-testid="terminal-status-notice"`).

### 4.2 Resolution Gate Blocker Alert (`BR-07`, `D-12`)
1. Maintain `actionsCount` state in `StaffTicketDetail.tsx`, initialized from `ticket.actionsTaken?.length ?? 0` and kept in sync via `ActionsTakenSection`'s `onActionsUpdated` callback.
2. When the staff user selects `RESOLVED` in `#staff-status-select` while `actionsCount === 0`:
   - Render an inline guidance alert (`role="alert"`, `data-testid="resolution-gate-alert"`) directly beneath the status controls:
     `"Cannot resolve ticket without at least one recorded Action Taken. Please log an action in the Actions Taken section first."`
   - If the user attempts to submit or if the backend returns `400 Bad Request` with the resolution gate error, display the alert and keep the current status unchanged.
   - As soon as an `ActionTaken` record is logged via `ActionsTakenSection`, `actionsCount` becomes `>= 1`, clearing the blocker alert automatically.

### 4.3 Non-Destructive `409 Conflict` Banner (`BR-09`, `D-13`)
1. Pass `ticket.updatedAt` in `updateStaffTicketStatus(ticket.id, selectedStatus, ticket.updatedAt)`.
2. If the backend returns HTTP `409 Conflict`:
   - Set `statusConflict` state to `true` and render a dedicated alert banner (`role="alert"`, `data-testid="status-conflict-banner"`):
     `"Conflict (409): This ticket was updated by another session. Refresh ticket state to load the latest changes."`
   - Include an explicit `[Refresh Ticket State]` action button (`data-testid="refresh-ticket-state-btn"`) inside the banner.
   - **Non-Destructive Guarantee**: Do **not** clear `publicCommentText`, `internalNoteText`, or any unsaved form state in `ActionsTakenSection` when `409 Conflict` occurs or when `[Refresh Ticket State]` re-fetches `ticket` metadata.

### 4.4 In-Place Header & Sidebar Badge Refresh (`D-14`)
1. Upon `200 OK` from `PATCH /api/v1/staff/tickets/:id/status`:
   - Update `ticket.currentStatus`, `ticket.updatedAt`, `ticket.resolvedAt`, and `ticket.closedAt` in component state without `window.location.reload()`.
   - Synchronize `selectedStatus` to the new `currentStatus` and clear any `statusConflict` or `statusUpdateError` alerts.

---

## 5. Phase 4: Automated Testing & Playwright Verification

### 5.1 Backend API Integration Tests (`server/tests/lab-04/ticket-workflow.api.test.ts`)
Implement Jest + Supertest tests tracing to `AC-20.1` through `AC-20.4`:
1. **`BR-06` Legal Status Transitions (`AC-20.1`)**:
   - Verify permitted transitions across the lifecycle:
     - `NEW` → `OPEN`, `NEW` → `IN_PROGRESS`, `NEW` → `CANCELLED`
     - `OPEN` → `IN_PROGRESS`, `OPEN` → `WAITING_FOR_REQUESTER`, `OPEN` → `CANCELLED`
     - `IN_PROGRESS` → `WAITING_FOR_REQUESTER`, `IN_PROGRESS` → `CANCELLED`
     - `WAITING_FOR_REQUESTER` → `IN_PROGRESS`, `WAITING_FOR_REQUESTER` → `CANCELLED`
     - `RESOLVED` → `REOPENED`, `REOPENED` → `IN_PROGRESS`, `REOPENED` → `RESOLVED` (with action), `RESOLVED` → `CLOSED`
2. **`BR-06` Invalid & Terminal Transitions (`AC-20.1`)**:
   - Verify disallowed jumps (`NEW` → `RESOLVED`, `NEW` → `CLOSED`, `OPEN` → `CLOSED`, `RESOLVED` → `IN_PROGRESS`) return `400 Bad Request`.
   - Verify terminal statuses (`CLOSED` → `REOPENED`, `CLOSED` → `OPEN`, `CANCELLED` → `OPEN`, `CANCELLED` → `REOPENED`) return `400 Bad Request`.
3. **`BR-07` Resolution Gate Invariant (`AC-20.2`)**:
   - Verify transitioning `IN_PROGRESS` → `RESOLVED` (or `OPEN` → `RESOLVED`) on a ticket with `0` `ActionTaken` records fails with `400 Bad Request` and message `"Cannot resolve ticket without at least one recorded Action Taken."`.
   - Verify that after creating 1 `ActionTaken` record on the ticket, transitioning `IN_PROGRESS` → `RESOLVED` succeeds with `200 OK` and sets `resolvedAt`.
4. **`BR-08` Requester Advisory Resolution (`AC-20.3`)**:
   - Verify `POST /api/v1/tickets/:id/resolve-request` by a Requester sets `requesterResolvedAt` (`requesterResolutionConfirmedAt`) to a non-null timestamp while `currentStatus` remains `IN_PROGRESS` (unchanged).
5. **`BR-09` Optimistic Concurrency Control (`AC-20.4`)**:
   - Simulate two concurrent staff readers holding the same `updatedAt` timestamp `T1`.
   - First `PATCH` with `updatedAt: T1` succeeds (`200 OK`) and advances `updatedAt` to `T2`.
   - Second `PATCH` with stale `updatedAt: T1` fails with `409 Conflict`.

### 5.2 Frontend Component Tests (`client/src/tests/lab-04/TicketWorkflow.test.tsx`)
Implement Vitest + React Testing Library tests tracing to `AC-20.1` through `AC-20.4`:
1. **`BR-06` Dropdown Option Filtering (`AC-20.1`)**:
   - Verify that when `currentStatus` is `NEW`, only `OPEN`, `IN_PROGRESS`, and `CANCELLED` are offered as target transitions.
   - Verify that when `currentStatus` is `RESOLVED`, only `CLOSED` and `REOPENED` are offered.
   - Verify that when `currentStatus` is `CLOSED` or `CANCELLED`, the status dropdown is disabled and displays the terminal status notice.
2. **`BR-07` Resolution Gate Warning & Unlock (`AC-20.2`)**:
   - Verify selecting `RESOLVED` when `actionsTaken` is empty displays `data-testid="resolution-gate-alert"` (`"Cannot resolve ticket without at least one recorded Action Taken"`).
   - Verify that when `actionsTaken` has at least 1 entry, selecting `RESOLVED` and submitting transitions the badge to `RESOLVED` in place without page reload.
3. **`BR-09` Non-Destructive `409 Conflict` Handling (`AC-20.4`)**:
   - Type draft text into the public reply / internal note textarea, trigger a status update that rejects with `409 Conflict`, and assert:
     - `data-testid="status-conflict-banner"` is rendered with `[Refresh Ticket State]`.
     - The draft textarea value remains completely intact.
     - Clicking `[Refresh Ticket State]` reloads the latest ticket status and `updatedAt` while still preserving the draft textarea value.

### 5.3 Auxiliary Playwright Visual Verification Safeguard
- After all backend and frontend automated test suites pass, capture auxiliary Playwright visual verification screenshots (`workflow-resolution-gate-alert.png`, `workflow-409-conflict-banner.png`, `workflow-resolved-state.png`) strictly to:
  `artifacts/lab-04/screenshots/actions-taken/`
- **Strict Boundary Rule**: Do **not** add, modify, or mix Playwright visual verification checks into `docs/lab-04/tests.md` or existing STS/unit test files.

