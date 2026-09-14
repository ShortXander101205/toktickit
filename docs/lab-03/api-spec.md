# TokTickIT Sprint 3 (Lab 3) — REST API Specification

This document defines the authoritative REST API contracts, DTO schemas, query parameters, authorization headers, validation rules, HTTP status codes, and safe error envelopes for **TokTickIT Lab 3 (Sprint 3)**, adhering to **TokTickIT-System-Level-SDS-v1.0.pdf** (API Design Standards, p. 12) and **Lab_03_labsheet.pdf** (§6).

---

## 1. Conventions, Headers & Error Envelopes

### 1.1 General Protocol Standards
* **Protocol:** HTTP/1.1 or HTTP/2 over TLS / JSON payloads (except multipart attachment uploads and binary file streaming).
* **Base URL:** `/api/v1` (with backward compatibility aliases at `/api/*`).
* **Property Casing:** `camelCase` for all JSON request and response fields.
* **Date-Time Format:** ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
* **Session Transport:** Opaque server-side session token transported via `Set-Cookie` (`HttpOnly; Secure; SameSite=Lax`) or `Authorization: Bearer <token>`.

### 1.2 HTTP Status Codes
| Status Code | Description | Standard Usage |
| :--- | :--- | :--- |
| **`200 OK`** | Success | Successful resource retrieval, update, or password change |
| **`201 Created`** | Created | Successful creation of Ticket, User, Comment, or Note |
| **`400 Bad Request`** | Bad Request | Malformed JSON, missing parameters, or safety invariant violations |
| **`401 Unauthorized`**| Unauthenticated | Missing, invalid, or expired session credentials |
| **`403 Forbidden`** | Forbidden | Insufficient role permissions or accessing unauthorized resources |
| **`404 Not Found`** | Not Found | Target resource does not exist (or forbidden resource existence masked) |
| **`409 Conflict`** | Conflict | Duplicate email address, concurrent version mismatch, or last-admin conflict |
| **`422 Unprocessable`**| Business Rule Failure| Validation constraints failed (e.g. password complexity, character limits) |
| **`500 Server Error`**| Server Error | Unexpected internal server error (masked with safe correlation ID) |

### 1.3 Standard Response & Safe Error Envelopes

#### Success Envelope
```json
{
  "success": true,
  "data": { ... }
}
```

#### Safe Error Envelope (Avoiding Existence Leaks)
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid email address or password.",
    "fieldErrors": [],
    "correlationId": "c9a4b87e-324f-4d6d-b8d2-38d1720857bb"
  }
}
```

---

## 2. Authentication & Session Endpoints

### 2.1 User Login
* **Method & Path:** `POST /api/v1/auth/login`
* **Access:** Public (Unauthenticated)
* **Request Body:**
```json
{
  "email": "sarah.johnson@kmutt.ac.th",
  "password": "Password123!"
}
```
* **Validation & Rules:**
  - `email`: Required, valid email format, case-insensitive comparison.
  - `password`: Required string.
  - Rejects inactive accounts (`isActive === false`) with the same safe error as invalid credentials to avoid status/existence leaks.
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 4,
      "email": "sarah.johnson@kmutt.ac.th",
      "name": "Sarah Johnson",
      "role": "REQUESTER",
      "mustChangePassword": true
    }
  }
}
```
* **Response `401 Unauthorized`:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email address or password."
  }
}
```

---

### 2.2 User Logout
* **Method & Path:** `POST /api/v1/auth/logout`
* **Access:** Authenticated (Any role)
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out."
  }
}
```

---

### 2.3 Current Authenticated Profile
* **Method & Path:** `GET /api/v1/auth/me`
* **Access:** Authenticated (Any role)
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "email": "sarah.johnson@kmutt.ac.th",
    "name": "Sarah Johnson",
    "role": "REQUESTER",
    "mustChangePassword": false
  }
}
```
* **Response `401 Unauthorized`:** If session is expired or missing.

---

### 2.4 Mandatory Password Change
* **Method & Path:** `POST /api/v1/auth/change-password`
* **Access:** Authenticated (Required when `mustChangePassword === true`)
* **Request Body:**
```json
{
  "currentPassword": "Password123!",
  "newPassword": "SecureZenPass2026!",
  "confirmPassword": "SecureZenPass2026!"
}
```
* **Validation & Rules:**
  - `currentPassword`: Must match authenticated user's current password hash.
  - `newPassword`: Min 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character (`[!@#$%^&*]`).
  - `confirmPassword`: Must match `newPassword` exactly.
  - New password cannot match current password.
  - Sets `mustChangePassword = false` on success.
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully."
  }
}
```
* **Response `422 Unprocessable Entity`:** If complexity rules fail or current password is incorrect.

---

## 3. IT Staff Shared Ticket Queue

### 3.1 List / Query Staff Ticket Queue
* **Method & Path:** `GET /api/v1/staff/tickets`
* **Access:** `IT_STAFF`, `ADMINISTRATOR` (Returns `403 Forbidden` for `REQUESTER`)
* **Query Parameters:**
  - `search` (string, optional): Substring match on `ticketNumber` or `summary`.
  - `status` (string, optional): One of `NEW`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
  - `category` (integer, optional): Category ID filter.
  - `itPriority` (string, optional): One of `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
  - `owner` (string, optional): User ID of assigned owner, or `unassigned`.
  - `sortBy` (string, optional): `createdAt`, `ticketNumber`, `summary`, `itPriority`, `currentStatus` (default `createdAt`).
  - `sortOrder` (string, optional): `asc` or `desc` (default `desc`).
  - `page` (integer, optional): 1-based page index (default 1).
  - `pageSize` (integer, optional): Items per page, allowed: 10, 25, 50 (default 10).
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 42,
        "ticketNumber": "TKT-2026-00042",
        "summary": "LEB2 gradebook sync hangs",
        "category": { "id": 3, "name": "Software", "code": "SW" },
        "requestedPriority": "HIGH",
        "itPriority": "HIGH",
        "currentStatus": "IN_PROGRESS",
        "owner": { "id": 2, "name": "Sompong IT", "email": "sompong.it@kmutt.ac.th" },
        "requester": { "id": 4, "name": "Sarah Johnson", "email": "sarah.johnson@kmutt.ac.th" },
        "createdAt": "2026-09-12T03:15:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 42,
      "page": 1,
      "pageSize": 10,
      "totalPages": 5
    }
  }
}
```

---

## 4. Ticket Detail & Operational Actions

### 4.1 Get Ticket Detail
* **Method & Path:** `GET /api/v1/tickets/:id`
* **Access:**
  - `REQUESTER`: Permitted only if `ticket.requesterId === req.user.id`. Internal notes are strictly stripped.
  - `IT_STAFF` & `ADMINISTRATOR`: Permitted for all tickets. Includes Internal Notes.
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "ticketNumber": "TKT-2026-00042",
    "summary": "LEB2 gradebook sync hangs",
    "description": "When instructors submit grades for course CPE334, the screen freezes at 99%.",
    "requestedPriority": "HIGH",
    "itPriority": "HIGH",
    "currentStatus": "IN_PROGRESS",
    "requesterResolutionConfirmedAt": null,
    "category": { "id": 3, "name": "Software" },
    "relatedSystem": { "id": 4, "name": "LEB2 App" },
    "requester": { "id": 4, "name": "Sarah Johnson", "email": "sarah.johnson@kmutt.ac.th" },
    "owner": { "id": 2, "name": "Sompong IT", "email": "sompong.it@kmutt.ac.th" },
    "attachments": [
      {
        "id": 10,
        "originalFilename": "error_log.pdf",
        "fileSize": 1245180,
        "isRemoved": false
      }
    ],
    "publicComments": [
      {
        "id": 1,
        "author": { "id": 4, "name": "Sarah Johnson", "role": "REQUESTER" },
        "content": "Still failing this morning.",
        "createdAt": "2026-09-12T04:00:00.000Z"
      }
    ],
    "internalNotes": [
      {
        "id": 1,
        "author": { "id": 2, "name": "Sompong IT", "role": "IT_STAFF" },
        "content": "Investigating deadlock on postgres table student_grades.",
        "createdAt": "2026-09-12T04:15:00.000Z"
      }
    ]
  }
}
```

---

### 4.2 Ticket Ownership Assignment
* **Method & Path:** `PATCH /api/v1/staff/tickets/:id/assignment`
* **Access:** `IT_STAFF`, `ADMINISTRATOR`
* **Request Body:**
```json
{
  "ownerId": 2
}
```
*(Pass `ownerId: null` to unassign ticket).*
* **Validation:** Target user must be an active `IT_STAFF` or `ADMINISTRATOR`.
* **Response `200 OK`:** Returns updated ticket with new assigned owner.

---

### 4.3 Update IT Priority
* **Method & Path:** `PATCH /api/v1/staff/tickets/:id/priority`
* **Access:** `IT_STAFF`, `ADMINISTRATOR`
* **Request Body:**
```json
{
  "itPriority": "URGENT"
}
```
* **Validation:** Must be one of `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
* **Response `200 OK`:** Returns updated ticket.

---

### 4.4 Transition Ticket Status
* **Method & Path:** `PATCH /api/v1/staff/tickets/:id/status`
* **Access:** `IT_STAFF`, `ADMINISTRATOR`
* **Request Body:**
```json
{
  "targetStatus": "RESOLVED"
}
```
* **Validation:** Target status must be valid from the current status per the status transition matrix.
* **Response `200 OK`:** Returns updated ticket with new status.
* **Response `422 Unprocessable Entity`:** If transition is not permitted.

---

### 4.5 Requester Problem Resolution Indication
* **Method & Path:** `POST /api/v1/tickets/:id/resolve-request`
* **Access:** `REQUESTER` (Must own the ticket)
* **Request Body:** Empty object `{}`
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "requesterResolutionConfirmedAt": "2026-09-12T05:30:00.000Z",
    "message": "Problem resolution indication recorded."
  }
}
```
* **Rule:** Does NOT change `currentStatus` to `RESOLVED` or `CLOSED`.

---

## 5. Comments & Notes Endpoints

### 5.1 Post Public Comment
* **Method & Path:** `POST /api/v1/tickets/:id/comments`
* **Access:** Requester (owned ticket), IT Staff, Administrator
* **Request Body:**
```json
{
  "content": "Thank you, restarting the app cleared the cache and solved the issue."
}
```
* **Validation:** Trimmed length 1 to 2000 characters.
* **Response `201 Created`:** Returns created comment object with author metadata.

---

### 5.2 Post Internal Note
* **Method & Path:** `POST /api/v1/tickets/:id/notes`
* **Access:** `IT_STAFF`, `ADMINISTRATOR` (`REQUESTER` receives `403 Forbidden`)
* **Request Body:**
```json
{
  "content": "Applied patch to connection pooler max connections config."
}
```
* **Validation:** Trimmed length 1 to 2000 characters.
* **Response `201 Created`:** Returns created note object.

---

## 6. Administrator User Management Endpoints

### 6.1 List Users
* **Method & Path:** `GET /api/v1/admin/users`
* **Access:** `ADMINISTRATOR` only (`403 Forbidden` for other roles)
* **Query Parameters:**
  - `search` (string, optional): Case-insensitive match on name or email.
  - `role` (string, optional): `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`.
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Admin User",
      "email": "admin@kmutt.ac.th",
      "role": "ADMINISTRATOR",
      "isActive": true,
      "createdAt": "2026-08-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Sompong IT",
      "email": "sompong.it@kmutt.ac.th",
      "role": "IT_STAFF",
      "isActive": true,
      "createdAt": "2026-08-01T00:00:00.000Z"
    }
  ]
}
```

---

### 6.2 Create User
* **Method & Path:** `POST /api/v1/admin/users`
* **Access:** `ADMINISTRATOR` only
* **Request Body:**
```json
{
  "name": "Prasert User",
  "email": "prasert.user@kmutt.ac.th",
  "role": "REQUESTER",
  "isActive": true,
  "initialPassword": "InitialPassword123!"
}
```
* **Validation & Rules:**
  - `name`: Required, 2–100 characters.
  - `email`: Required, unique, valid email format.
  - `role`: Exactly one of `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
  - `isActive`: Boolean, default `true`.
  - `initialPassword`: Required, min 8 characters. Sets `mustChangePassword = true`.
* **Response `201 Created`:** Returns created user object (excluding password hash).
* **Response `409 Conflict`:** If email already exists.

---

### 6.3 Update User
* **Method & Path:** `PATCH /api/v1/admin/users/:id`
* **Access:** `ADMINISTRATOR` only
* **Request Body:**
```json
{
  "name": "Prasert Updated",
  "email": "prasert.updated@kmutt.ac.th",
  "role": "IT_STAFF",
  "isActive": false
}
```
* **Safety Rules Enforced:**
  - **Self-Deactivation Prevention**: If target user `:id === req.user.id` and `isActive === false`, return `400 Bad Request` (`CANNOT_DEACTIVATE_SELF`).
  - **Last Administrator Protection**: If target user is an Administrator, `isActive === false` or `role !== ADMINISTRATOR`, and only 1 active Administrator exists in the system, return `400 Bad Request` or `409 Conflict` (`LAST_ADMIN_PROTECTION`).
* **Response `200 OK`:** Returns updated user object.

---

### 6.4 Reset User Initial Password
* **Method & Path:** `POST /api/v1/admin/users/:id/reset-password`
* **Access:** `ADMINISTRATOR` only
* **Request Body:**
```json
{
  "newInitialPassword": "TemporaryReset2026!"
}
```
* **Validation:** Min 8 chars. Updates password hash and sets `mustChangePassword = true`.
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "message": "Initial password reset successfully."
  }
}
```
