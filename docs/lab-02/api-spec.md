# TokTickIT Sprint 2 (Lab 2) — REST API Specification

This document defines the authoritative REST API contract for **TokTickIT Lab 2 (Sprint 2)**, adhering strictly to **Lab_02_labsheet.pdf** (Section 6) and **TokTickIT-System-Level-SDS-v1.0.pdf** (API Design Standards, p. 12).

---

## 1. Conventions & Error Envelopes

### 1.1 General Standards
* **Protocol:** HTTP/1.1 over JSON (except multipart/form-data for file uploads and binary file streaming for downloads).
* **Base Path:** `/api` (Endpoints are also accessible at `/api/v1` for system specification compatibility).
* **Property Casing:** `camelCase` for JSON keys.
* **Timestamps:** ISO 8601 UTC strings (e.g. `2026-09-03T10:00:00.000Z`).
* **Requester Context Identification:** During Lab 2 simulated authentication, all requester-scoped requests pass the selected requester ID in the HTTP header:
  ```http
  x-requester-id: 1
  ```

### 1.2 HTTP Status Codes

| Status Code | Description | Standard Usage |
| :--- | :--- | :--- |
| **`200 OK`** | Request succeeded | Successful retrieval (`GET`), update, or soft-removal (`DELETE`) |
| **`201 Created`** | Resource created | Successful creation of Ticket or Attachment |
| **`400 Bad Request`** | Invalid input format | Missing required headers, malformed JSON, or parameter errors |
| **`403 Forbidden`** | Access denied | Attempting to access or modify a resource owned by another requester |
| **`404 Not Found`** | Resource not found | Requesting a non-existent ticket, category, or attachment |
| **`410 Gone`** | Resource removed | Attempting to download or preview a soft-removed attachment |
| **`422 Unprocessable`** | Business rule violation | Validation errors (e.g. text length bounds, file size > 5MB, active files > 5) |
| **`500 Server Error`** | Unexpected exception | Internal failure (returns generic safe message and correlation ID) |

### 1.3 Standard Response & Error Envelopes

#### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

#### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted ticket data failed validation constraints.",
    "details": [
      {
        "field": "summary",
        "message": "Summary must be between 5 and 100 characters."
      }
    ]
  }
}
```

---

## 2. Reference Data Endpoints

### 2.1 Retrieve Categories
* **Endpoint:** `GET /api/categories`
* **Purpose:** Retrieve all available ticket categories.
* **Headers:** None required.
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
}
```

---

### 2.2 Retrieve Related Systems
* **Endpoint:** `GET /api/related-systems`
* **Purpose:** Retrieve active systems or platforms affected by tickets.
* **Headers:** None required.
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Email", "description": "KMUTT Outlook and email routing" },
    { "id": 2, "name": "Campus Wi-Fi", "description": "KMUTT-Secure and eduroam connectivity" },
    { "id": 3, "name": "VPN", "description": "Remote campus access VPN" },
    { "id": 4, "name": "LEB2 App", "description": "Learning environment platform" },
    { "id": 5, "name": "Grade Submission App", "description": "Faculty grade processing system" },
    { "id": 6, "name": "Printer", "description": "Networked campus printers" },
    { "id": 7, "name": "Corporate Laptop", "description": "University-issued hardware" }
  ]
}
```

---

### 2.3 Retrieve Development Requesters
* **Endpoint:** `GET /api/development-requesters`
* **Purpose:** Retrieve active development requesters for simulated context selection.
* **Rule:** Strictly filters `where: { isActive: true }`. Inactive requesters are excluded.
* **Headers:** None required.
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "jennifer.anderson@kmutt.ac.th",
      "displayName": "Jennifer Anderson",
      "department": "Computer Engineering"
    },
    {
      "id": 2,
      "email": "michael.brown@kmutt.ac.th",
      "displayName": "Michael Brown",
      "department": "Information Technology"
    },
    {
      "id": 3,
      "email": "david.lee@kmutt.ac.th",
      "displayName": "David Lee",
      "department": "Electrical Engineering"
    },
    {
      "id": 4,
      "email": "sarah.johnson@kmutt.ac.th",
      "displayName": "Sarah Johnson",
      "department": "Science Faculty"
    }
  ]
}
```

---

## 3. Ticket Endpoints

### 3.1 Create Ticket
* **Endpoint:** `POST /api/tickets`
* **Purpose:** Create a validated ticket for the active Requester.
* **Headers:**
  * `Content-Type: application/json`
  * `x-requester-id: <number>` (Mandatory)
* **Request Body:**
```json
{
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle.",
  "categoryId": 2,
  "relatedSystemId": 7,
  "requestedPriority": "MEDIUM"
}
```
* **Validation Rules:**
  * `summary`: Required string, trimmed length 5–100 characters.
  * `description`: Required string, trimmed length 10–2000 characters.
  * `categoryId`: Required integer, must exist in `Category` table.
  * `relatedSystemId`: Required integer, must exist in `RelatedSystem` table.
  * `requestedPriority`: Required string (`Low`, `Medium`, `High`, `Urgent`).
* **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "ticketNumber": "TKT-2026-00001",
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery is draining much faster than usual even when idle.",
    "categoryId": 2,
    "categoryName": "Hardware",
    "relatedSystemId": 7,
    "relatedSystemName": "Corporate Laptop",
    "requestedPriority": "Medium",
    "itPriority": "Medium",
    "currentStatus": "New",
    "requesterId": 1,
    "requesterName": "Jennifer Anderson",
    "createdAt": "2026-09-03T11:00:00.000Z",
    "updatedAt": "2026-09-03T11:00:00.000Z"
  }
}
```
* **Error Responses:**
  * `400 Bad Request`: Missing `x-requester-id` header.
  * `422 Unprocessable Entity`: Validation failure on field lengths or invalid IDs.

---

### 3.2 List Owned Tickets (Search, Filter, Sort, Pagination)
* **Endpoint:** `GET /api/tickets`
* **Purpose:** Retrieve paginated tickets owned strictly by the active Requester.
* **Headers:**
  * `x-requester-id: <number>` (Mandatory)
* **Query Parameters:**
  * `search` *(string, optional)*: Keyword to search across `ticketNumber`, `summary`, and `description`.
  * `category` *(integer, optional)*: Filter by `categoryId`.
  * `status` *(string, optional)*: Filter by `currentStatus`.
  * `priority` *(string, optional)*: Filter by `requestedPriority`.
  * `sortBy` *(string, optional, default: "createdAt")*: Whitelist: `ticketNumber`, `createdAt`, `updatedAt`, `currentStatus`.
  * `sortOrder` *(string, optional, default: "desc")*: `asc` or `desc`.
  * `page` *(integer, optional, default: 1)*: 1-indexed page number.
  * `pageSize` *(integer, optional, default: 10)*: Number of items per page (allowed: 10, 25, 50).
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ticketNumber": "TKT-2026-00001",
      "summary": "Laptop battery drains quickly",
      "categoryName": "Hardware",
      "requestedPriority": "Medium",
      "itPriority": "Medium",
      "currentStatus": "New",
      "ticketOwner": null,
      "createdAt": "2026-09-03T11:00:00.000Z",
      "updatedAt": "2026-09-03T11:00:00.000Z"
    }
  ],
  "pagination": {
    "totalItems": 1,
    "totalPages": 1,
    "currentPage": 1,
    "pageSize": 10
  }
}
```

---

### 3.3 Get Owned Ticket Detail
* **Endpoint:** `GET /api/tickets/:id`
* **Purpose:** Retrieve complete read-only details of an owned ticket.
* **Headers:**
  * `x-requester-id: <number>` (Mandatory)
* **Security Check:** Verifies `ticket.requesterId === parseInt(header['x-requester-id'])`.
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "ticketNumber": "TKT-2026-00001",
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery is draining much faster than usual even when idle.",
    "categoryId": 2,
    "categoryName": "Hardware",
    "relatedSystemId": 7,
    "relatedSystemName": "Corporate Laptop",
    "requestedPriority": "Medium",
    "itPriority": "Medium",
    "currentStatus": "New",
    "requesterId": 1,
    "requesterName": "Jennifer Anderson",
    "ticketOwner": null,
    "resolutionSummary": null,
    "createdAt": "2026-09-03T11:00:00.000Z",
    "updatedAt": "2026-09-03T11:00:00.000Z",
    "attachments": [
      {
        "id": 1,
        "originalFilename": "battery_report.pdf",
        "mimeType": "application/pdf",
        "fileSize": 1048576,
        "isRemoved": false,
        "createdAt": "2026-09-03T11:05:00.000Z"
      }
    ],
    "removedAttachments": []
  }
}
```
* **Error Responses:**
  * `403 Forbidden` or `404 Not Found`: Ticket belongs to a different requester.
  * `404 Not Found`: Ticket ID does not exist.

---

## 4. Attachment Endpoints

### 4.1 Upload Attachment
* **Endpoint:** `POST /api/tickets/:id/attachments`
* **Purpose:** Upload a supporting document/image to an owned ticket.
* **Content-Type:** `multipart/form-data`
* **Headers:**
  * `x-requester-id: <number>` (Mandatory)
* **Form Data:**
  * `file`: Binary file stream.
* **Validation Invariants:**
  * Parent ticket must belong to `x-requester-id`.
  * Max size: $5\text{ MB}$ ($5,242,880$ bytes).
  * Allowed types: `image/jpeg` (.jpg, .jpeg), `image/png` (.png), `image/webp` (.webp), `application/pdf` (.pdf).
  * Max active attachments: Must not exceed 5 active (non-deleted) attachments on the ticket.
* **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "ticketId": 1,
    "originalFilename": "battery_report.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1048576,
    "createdAt": "2026-09-03T11:05:00.000Z"
  }
}
```
* **Error Responses:**
  * `422 Unprocessable Entity`: File exceeds 5 MB or active attachment count exceeds 5.
  * `415 Unsupported Media Type`: File format/MIME is not JPG, PNG, WEBP, or PDF.
  * `403 Forbidden`: Requester does not own the parent ticket.

---

### 4.2 Download Active Attachment
* **Endpoint:** `GET /api/attachments/:id/download`
* **Purpose:** Stream active attachment file to the authorized ticket owner.
* **Headers:**
  * `x-requester-id: <number>` (Mandatory)
* **Security & Invariants:**
  * Parent ticket must belong to `x-requester-id`.
  * If `attachment.isRemoved === true` or `attachment.removedAt !== null` (soft-removed), download is strictly blocked.
* **Response `200 OK`:**
  * **Headers:**
    * `Content-Type: <attachment.mimeType>`
    * `Content-Disposition: attachment; filename="<originalFilename>"`
    * `Content-Length: <fileSize>`
  * **Body:** Raw binary byte stream.
* **Error Responses:**
  * `410 Gone`: Attachment has been soft-removed.
  * `403 Forbidden`: Requester does not own the parent ticket.
  * `404 Not Found`: Attachment ID does not exist.

---

### 4.3 Soft-Remove Attachment
* **Endpoint:** `DELETE /api/attachments/:id`
* **Purpose:** Soft-remove an attachment while retaining audit metadata and blocking future downloads.
* **Headers:**
  * `Content-Type: application/json`
  * `x-requester-id: <number>` (Mandatory)
* **Request Body:**
```json
{
  "reason": "Uploaded incorrect system diagnostics file"
}
```
* **Validation Rules:**
  * `reason`: Required string, trimmed length $\ge 5$ characters.
  * Requester must own the parent ticket.
* **Transactional Execution:**
  1. Sets `isRemoved = true`, `removedAt = now()`, `removalReason = reason`, and `removedByRequesterId = requesterId` on `Attachment`.
  2. Deletes binary file from storage immediately.
* **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Attachment removed successfully",
  "data": {
    "id": 1,
    "removedAt": "2026-09-03T11:15:00.000Z",
    "isRemoved": true,
    "removalReason": "Uploaded incorrect system diagnostics file"
  }
}
```
* **Error Responses:**
  * `422 Unprocessable Entity`: Reason is missing or shorter than 5 characters.
  * `403 Forbidden`: User is not the owner/uploader.
  * `404 Not Found`: Attachment does not exist.
