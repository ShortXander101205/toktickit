# TokTickIT Sprint 4 (Lab 4) — REST API Specification

**Document Status**: Official REST API Specification  
**Target Sprint**: TokTickIT Lab 4 (Sprint 4) — Actions Taken, Dashboards, Workflow Resolution Gate, and Final Regression  
**Base Branch**: `lab4-staging`  
**Active Branch**: `feature/17-spec-and-tests`  
**Traceability References**: [SE+Lab+4.pdf](../reference/SE+Lab+4.pdf) (§6), [TokTickIT-System-Level-SDS-v1.0.pdf](../reference/TokTickIT-System-Level-SDS-v1.0.pdf) (§7, p. 12), [specification.md](./specification.md)

---

## 1. Protocol Conventions & Error Envelopes

### 1.1 General Protocol Standards
* **Base URL**: `/api/v1` (with backward-compatible routing at `/api/*`).
* **Content Type**: `application/json; charset=utf-8`.
* **Field Casing**: `camelCase` for JSON request/response payloads.
* **Timestamp Format**: ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
* **Authentication**: Session cookie (`Set-Cookie: toktickit_session=...; HttpOnly; Secure; SameSite=Lax`) or `Authorization: Bearer <token>`.

### 1.2 HTTP Status Codes
| Status Code | Meaning | Usage in Lab 4 |
| :--- | :--- | :--- |
| **`200 OK`** | Success | Successful retrieval of actions taken, dashboards, or resource update |
| **`201 Created`** | Created | Successful creation of an Action Taken record |
| **`400 Bad Request`** | Bad Request | Missing required fields, invalid parameters, or illegal status transitions |
| **`401 Unauthorized`** | Unauthenticated | Missing, expired, or invalid session |
| **`403 Forbidden`** | Forbidden | Insufficient role permissions or accessing non-owned ticket resources |
| **`404 Not Found`** | Not Found | Target ticket or action taken does not exist |
| **`409 Conflict`** | Conflict | **Resolution Gate**: Incomplete actions taken prevent ticket resolution; or concurrent edit detected via optimistic version mismatch |
| **`422 Unprocessable`** | Validation Error | Field constraint violations (e.g., conditional follow-up note missing when follow-up is required) |
| **`500 Server Error`** | Server Error | Unexpected server error masked with safe correlation ID |

### 1.3 Standard Response & Safe Error Envelopes

#### Success Envelope
```json
{
  "success": true,
  "data": { ... }
}
```

#### Safe Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "TICKET_STATE_CONFLICT",
    "message": "Ticket cannot be resolved while actions taken remain incomplete.",
    "fieldErrors": [],
    "correlationId": "f7a8b9c0-1234-4567-89ab-cdef01234567"
  }
}
```

---

## 2. Actions Taken API Endpoints

### 2.1 Record New Action Taken
* **Method & Path**: `POST /api/v1/tickets/:id/actions-taken`
* **Access Control**: Authenticated `IT_STAFF` or `ADMINISTRATOR` only. Requesters receive HTTP `403 Forbidden`.
* **URL Parameters**:
  - `id` (integer, required): Target Ticket ID.
* **Request Body**:
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
* **Validation & Business Rules**:
  - `actionDateTime`: Optional ISO 8601 string; defaults to current server timestamp (`now()`). Cannot be in the future beyond 60s clock skew (`BR-05`).
  - `actionDescription`: Required string, min 5 chars, max 1000 chars (`BR-05`).
  - `result`: Required string, min 2 chars, max 1000 chars (`BR-05`).
  - `followUpRequired`: Boolean, defaults to `false`.
  - `followUpNote`: **Conditional**: If `followUpRequired === true`, must be non-empty string between 5 and 1000 chars. If `false`, must be `null` or omitted (`BR-04`).
  - `attachmentNotes`: Optional string, max 255 chars (`BR-05`).
  - `performedById`: **Auto-populated** from authenticated session (`req.user.id`). Any client-supplied performer field is completely ignored (`BR-03`).
* **Response `201 Created`**:
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
        "id": 2,
        "name": "Michael Chen",
        "role": "IT_STAFF"
      },
      "createdAt": "2026-05-12T14:15:02.120Z",
      "updatedAt": "2026-05-12T14:15:02.120Z"
    }
  }
}
```
* **Error Responses**:
  - `401 Unauthorized`: Unauthenticated.
  - `403 Forbidden`: Authenticated user is `REQUESTER` or inactive staff account (`BR-06`, `BR-07`).
  - `404 Not Found`: Ticket does not exist.
  - `422 Unprocessable Entity`: Validation failure (e.g. `followUpRequired` is true but `followUpNote` is missing).

---

### 2.2 List Actions Taken for Ticket
* **Method & Path**: `GET /api/v1/tickets/:id/actions-taken`
* **Access Control**:
  - `IT_STAFF` & `ADMINISTRATOR`: Permitted for any ticket.
  - `REQUESTER`: Permitted **only** if requester owns the ticket (`ticket.requesterId === req.user.id`). Other requesters receive HTTP `403 Forbidden` (`BR-06`).
* **URL Parameters**:
  - `id` (integer, required): Target Ticket ID.
* **Response `200 OK`**:
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
          "id": 2,
          "name": "Michael Chen",
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
          "id": 3,
          "name": "Sarah Jenkins",
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

---

### 2.3 Update Existing Action Taken
* **Method & Path**: `PUT /api/v1/tickets/:id/actions-taken/:actionId`
* **Access Control**: Authenticated `IT_STAFF` or `ADMINISTRATOR` only (`BR-06`).
* **URL Parameters**:
  - `id` (integer, required): Ticket ID.
  - `actionId` (integer, required): Action Taken ID.
* **Request Body**:
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
* **Validation & Rules**:
  - Identical validation rules as creation (`BR-04`, `BR-05`).
  - `version`: Integer matching current record version (`BR-12`).
  - If database version > client `version`, abort and return HTTP `409 Conflict`.
* **Response `200 OK`**:
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
        "id": 3,
        "name": "Sarah Jenkins",
        "role": "IT_STAFF"
      },
      "createdAt": "2026-05-12T14:15:00.000Z",
      "updatedAt": "2026-05-12T14:40:15.000Z"
    }
  }
}
```
* **Error Responses**:
  - `409 Conflict`: Stale update version conflict (`BR-12`).

---

## 3. Operational Dashboard Endpoints

### 3.1 Requester Dashboard
* **Method & Path**: `GET /api/v1/dashboards/requester`
* **Access Control**: Authenticated `REQUESTER` (strictly scoped to `req.user.id`).
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalOpenTickets": 3,
      "inProgressTickets": 2,
      "waitingForRequesterTickets": 1,
      "recentlyResolvedTickets": 5
    },
    "recentTickets": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-00234",
        "summary": "Laptop battery drains quickly",
        "categoryName": "Hardware",
        "requestedPriority": "HIGH",
        "currentStatus": "IN_PROGRESS",
        "updatedAt": "2026-05-12T09:14:00.000Z"
      },
      {
        "id": 98,
        "ticketNumber": "TKT-2026-00222",
        "summary": "Request software access",
        "categoryName": "Software",
        "requestedPriority": "MEDIUM",
        "currentStatus": "RESOLVED",
        "updatedAt": "2026-05-11T14:30:00.000Z"
      }
    ]
  }
}
```

---

### 3.2 IT Staff Operational Dashboard
* **Method & Path**: `GET /api/v1/dashboards/staff`
* **Access Control**: Authenticated `IT_STAFF` or `ADMINISTRATOR`. Requesters receive HTTP `403 Forbidden`.
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "unassignedCount": 14,
      "myAssignedCount": 16,
      "urgentAttentionCount": 4,
      "statusBreakdown": {
        "NEW": 14,
        "OPEN": 23,
        "IN_PROGRESS": 18,
        "WAITING_FOR_REQUESTER": 7,
        "RESOLVED": 35,
        "CLOSED": 82,
        "REOPENED": 2,
        "CANCELLED": 5
      },
      "priorityBreakdown": {
        "LOW": 12,
        "MEDIUM": 28,
        "HIGH": 18,
        "URGENT": 4
      }
    },
    "recentTickets": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-00234",
        "summary": "Laptop battery drains quickly",
        "categoryName": "Hardware",
        "itPriority": "HIGH",
        "currentStatus": "IN_PROGRESS",
        "ownerName": "Michael Chen",
        "updatedAt": "2026-05-12T09:14:00.000Z"
      },
      {
        "id": 95,
        "ticketNumber": "TKT-2026-00230",
        "summary": "Printer queue offline",
        "categoryName": "Network / Printing",
        "itPriority": "MEDIUM",
        "currentStatus": "OPEN",
        "ownerName": null,
        "updatedAt": "2026-05-10T14:15:00.000Z"
      }
    ]
  }
}
```

---

### 3.3 Administrator Operational Dashboard
* **Method & Path**: `GET /api/v1/dashboards/admin`
* **Access Control**: Authenticated `ADMINISTRATOR` only. Requesters and IT Staff receive HTTP `403 Forbidden`.
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "operationalMetrics": {
      "unassignedCount": 14,
      "myAssignedCount": 16,
      "urgentAttentionCount": 4,
      "statusBreakdown": {
        "NEW": 14,
        "OPEN": 23,
        "IN_PROGRESS": 18,
        "WAITING_FOR_REQUESTER": 7,
        "RESOLVED": 35,
        "CLOSED": 82,
        "REOPENED": 2,
        "CANCELLED": 5
      },
      "priorityBreakdown": {
        "LOW": 12,
        "MEDIUM": 28,
        "HIGH": 18,
        "URGENT": 4
      }
    },
    "userMetrics": {
      "totalUsers": 25,
      "activeUsersCount": 23,
      "inactiveUsersCount": 2,
      "usersByRole": {
        "REQUESTER": 16,
        "IT_STAFF": 7,
        "ADMINISTRATOR": 2
      }
    },
    "recentTickets": [ ... ]
  }
}
```

---

## 4. Ticket Status Workflow & Resolution Gate Endpoint

### 4.1 Update Ticket Status
* **Method & Path**: `PATCH /api/v1/staff/tickets/:id/status`
* **Access Control**: Authenticated `IT_STAFF` or `ADMINISTRATOR`.
* **Request Body**:
```json
{
  "status": "RESOLVED",
  "cancellationReason": null,
  "version": 3
}
```
* **Validation & Resolution Gate Enforcement**:
  1. `status`: Must be one of the 8 legal `TicketStatus` enum values.
  2. Legal Transition Check: Must follow the permitted transitions defined in `specification.md` §6. If illegal transition attempted, return `400 Bad Request` with code `INVALID_STATUS_TRANSITION`.
  3. **Resolution Gate Enforcement (`BR-08`)**:
     - If target status is `RESOLVED` or `CLOSED`, backend queries `actions_taken` for this ticket.
     - If ANY action taken has `followUpRequired === true` without a subsequent resolving action or completion note, the backend aborts and returns HTTP `409 Conflict` with code `TICKET_STATE_CONFLICT`.
  4. **Atomic Cancellation Cascade (`BR-09`)**:
     - If target status is `CANCELLED`, `cancellationReason` is required (min 5 chars).
     - The ticket and any open actions taken are updated to cancelled in an atomic Prisma transaction.
  5. **Optimistic Concurrency Check (`BR-12`)**:
     - Checks submitted `version` against current database version. If version does not match, returns HTTP `409 Conflict`.
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "ticket": {
      "id": 101,
      "ticketNumber": "TKT-2026-00234",
      "currentStatus": "RESOLVED",
      "version": 4,
      "updatedAt": "2026-05-12T15:00:00.000Z"
    }
  }
}
```
* **Error Response `409 Conflict` (Resolution Gate Block)**:
```json
{
  "success": false,
  "error": {
    "code": "TICKET_STATE_CONFLICT",
    "message": "Ticket cannot be resolved while actions taken remain incomplete.",
    "fieldErrors": [
      {
        "field": "status",
        "message": "Action Taken #1 requires unresolved follow-up."
      }
    ],
    "correlationId": "8b9e4a32-11c5-4d7a-a621-931b26857e42"
  }
}
```

