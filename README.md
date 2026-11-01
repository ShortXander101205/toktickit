# TokTickIT — IT Service Desk Application

![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-309%20Passing-brightgreen?style=flat-square)

TokTickIT is a full-stack IT Service Desk web application engineered under the **Spec-Driven Development (SDD)** lifecycle for CPE 334 (Software Engineering in the Age of AI Coding Agents) at King Mongkut's University of Technology Thonburi (KMUTT).

The platform provides multi-role ticket lifecycle tracking, chronological technical audit trails (Actions Taken), state machine enforcement with backend resolution gates, and role-appropriate operational dashboards for Requesters, IT Staff, and Administrators.

---

## Table of Contents

- [Architecture & Tech Stack](#architecture--tech-stack)
- [Core Features & Role Matrix](#core-features--role-matrix)
- [Prerequisites & Setup](#prerequisites--setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Seeded Demo Accounts](#seeded-demo-accounts)
- [Running Tests](#running-tests)
- [Branching & Git Workflow](#branching--git-workflow)
- [Documentation & Engineering Contracts](#documentation--engineering-contracts)

---

## Architecture & Tech Stack

TokTickIT is constructed as a vertical slice across four interconnected layers:

```mermaid
graph LR
    subgraph Frontend ["Client Tier (Vite + React 18)"]
        UI["Zen Green UI / Bootstrap 5<br/>Role Dashboards, Detail Views, Modals"]
    end

    subgraph Backend ["Server Tier (Node.js + Express)"]
        API["REST API Endpoints<br/>Auth JWT, RBAC Guards, Workflow Engine"]
    end

    subgraph Data ["Data Tier (Prisma + PostgreSQL)"]
        ORM["Prisma ORM<br/>Migrations, Schema Relations, Seeding"]
        DB[("PostgreSQL Database<br/>Users, Tickets, Actions, Notes")]
    end

    UI -->|HTTP / JSON REST API| API
    API -->|Prisma Client| ORM
    ORM -->|SQL over TCP| DB
```

- **Frontend**: React 18, TypeScript, Vite, Bootstrap 5, Zen Green Design System (`#006B3C`, `#0B7A46`, `#EAF6EF`, `#F5F7F6`).
- **Backend**: Node.js, Express, TypeScript, Argon2id & bcryptjs password hashing, HTTP-only JWT cookies.
- **Database & ORM**: PostgreSQL, Prisma ORM (relational migrations, foreign key constraints, composite indexes).
- **Testing**: Vitest (Unit & Component), Supertest (Integration & API), Playwright (Multi-Role End-to-End).

---

## Core Features & Role Matrix

TokTickIT provides distinct interfaces and capabilities tailored to three authenticated roles:

| Capability / Module | Requester | IT Staff | Administrator |
| :--- | :---: | :---: | :---: |
| **Personal Dashboard** (Personal open, waiting, resolved counts) | Yes | — | — |
| **Operational Queue Dashboard** (Unassigned, priority, SLA counts) | — | Yes | Yes |
| **User Management & Password Resets** (Account safety invariants) | — | — | Yes |
| **Submit Support Ticket** (Categories, descriptions, attachments) | Yes | Yes | Yes |
| **Ticket Queue & Filters** (Status, priority, category, unassigned) | Own Only | Yes | Yes |
| **Actions Taken Audit Log** (Chronological technical interventions) | Read-only | Add / Edit | Add / Edit |
| **Status Transition Engine** (8-state machine & Resolution Gate) | Advisory | Full Control | Full Control |
| **Internal Work Notes** (Private amber-styled notes) | Hidden | Yes | Yes |

---

## Prerequisites & Setup

Ensure the following tools are installed on your machine:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14.0 or higher (running locally or accessible via network)

### 1. Clone the Repository

```bash
git clone https://github.com/ShortXander101205/toktickit.git
cd toktickit
```

### 2. Configure Environment Variables

Create `.env` files from their respective `.env.example` templates in both `server/` and `client/`:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Review [Environment Variables](#environment-variables) below to verify database credentials and port mappings.

### 3. Server Setup & Database Initialization

Install server dependencies, apply database migrations, and seed initial demo data:

```bash
cd server
npm install
npm run prisma:migrate
npm run prisma:seed
cd ..
```

> **What this does:**
> - `npm run prisma:migrate`: Applies Prisma migrations creating all tables (`User`, `Ticket`, `ActionTaken`, `Attachment`, `Comment`, `Category`).
> - `npm run prisma:seed`: Populates standard IT categories, multi-role test users, sample tickets, and actions taken with idempotency.

### 4. Client Setup

Install frontend dependencies:

```bash
cd client
npm install
cd ..
```

---

## Environment Variables

> **Security Rule:** Never commit real `.env` files, credentials, or API keys to Git. Keep them in `.gitignore`.

### Server Configuration (`server/.env`)

| Variable | Description | Default Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public` |
| `PORT` | Express server HTTP listen port | `3000` |
| `JWT_SECRET` | Secret key for signing session tokens | `your-secure-jwt-secret-key-here` |

### Client Configuration (`client/.env`)

| Variable | Description | Default Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of the backend REST API | `http://localhost:3000` |

---

## Running the Application

Open two terminal windows to run both servers concurrently:

### Terminal 1: Backend Server

```bash
cd server
npm run dev
```

The Express API server starts at `http://localhost:3000`.

### Terminal 2: Frontend Client

```bash
cd client
npm run dev
```

The Vite React application starts at `http://localhost:5173`.

---

## Seeded Demo Accounts

All seeded test accounts use the default password: `Password123!`

| Role | Name | Email | Default View |
| :--- | :--- | :--- | :--- |
| **Requester** | Jennifer Anderson | `jennifer.anderson@kmutt.ac.th` | `/dashboard` (Requester Dashboard) |
| **Requester** | Michael Brown | `michael.brown@kmutt.ac.th` | `/dashboard` (Requester Dashboard) |
| **IT Staff** | Sompong IT | `sompong.it@kmutt.ac.th` | `/staff/dashboard` (Staff Queue) |
| **IT Staff** | Wichai Support | `wichai.sup@kmutt.ac.th` | `/staff/dashboard` (Staff Queue) |
| **Administrator** | System Administrator | `admin@kmutt.ac.th` | `/staff/dashboard` & `/admin/users` |

---

## Running Tests

Automated testing covers unit, integration, UI component, and end-to-end tiers with **309 total tests passing (100% pass rate)**.

### Run All Unit & Integration Tests (Root)

```bash
npm test
```

Executes test suites across both `server/` and `client/` consecutively.

### Backend API & Service Tests

```bash
cd server
npm test
```

Verifies authentication, role-based access control, ticket lifecycle state machine, Actions Taken REST APIs, optimistic concurrency versioning, and operational dashboard aggregations (177 tests).

### Frontend UI Component Tests

```bash
cd client
npm test
```

Verifies React component rendering, form validation, modal dialogues, Zen Green responsive breakpoints, and role-based action controls (129 tests).

### Playwright End-to-End Tests

```bash
npm run test:e2e
```

Executes multi-role browser scenarios verifying:
1. **Scenario 1 (Full Lifecycle & Resolution Gate)**: Requester ticket creation &rarr; Staff claim &rarr; premature resolution blocking with HTTP 400 &rarr; Action Taken logging &rarr; resolution &rarr; requester advisory confirmation &rarr; final closure.
2. **Scenario 2 (Optimistic Concurrency & 409 Conflict)**: Simultaneous edits with stale tokens, asserting non-destructive 409 conflict banners and draft preservation.
3. **Scenario 3 (Role Dashboards & Drill-Downs)**: Data isolation, queue card navigation, and administrator user metrics.

---

## Branching & Git Workflow

This repository adheres to the multi-tier engineering contract and Git workflow established in Lecture 1 and `AGENTS.md`:

```
main (stable production releases)
 └── lab4-staging (active sprint integration branch)
      ├── feature/17-spec-and-tests
      ├── feature/18-actions-taken-foundation
      ├── feature/19-actions-taken-ui
      ├── feature/20-ticket-workflow
      ├── feature/21-role-dashboards
      └── feature/22-regression-polish-release
```

### Development Rules:

1. **Isolation on Feature Branches**:
   - Feature branches are cut from the staging branch: `git switch -c feature/<issue-number>-<name>`.
   - Never commit directly to `main` or the staging branch.

2. **Conventional Commits**:
   - Use structured prefixes: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, or `chore:`.

3. **Pull Request Protocol**:
   - Open PRs targeting the sprint staging branch (`lab4-staging`), not `main`.
   - Explicitly link the corresponding issue in the description (e.g., `Closes #41`).

4. **Peer Review Gate**:
   - Every feature PR requires verification and approval from the designated peer reviewer before merging.
   - The reviewer merges the approved PR; the author does not merge their own work.

5. **Definition of Done (DoD)**:
   - A feature is done when: acceptance criteria are satisfied + tests are written and passing + code is peer-reviewed + branch is merged + evidence is documented.

---

## Documentation & Engineering Contracts

All authoritative specifications and sprint contracts are maintained under `docs/`:

- [`AGENTS.md`](./AGENTS.md): Process entrypoint, SDD lifecycle, and agent orchestration.
- [`docs/lab-04/specification.md`](./docs/lab-04/specification.md): Sprint 4 functional requirements, business rules, and acceptance criteria.
- [`docs/lab-04/ui-spec.md`](./docs/lab-04/ui-spec.md): Zen Green design tokens, wireframes, component states, and responsive breakpoints.
- [`docs/lab-04/api-spec.md`](./docs/lab-04/api-spec.md): REST API contracts, DTO schemas, and HTTP status codes.
- [`docs/lab-04/tests.md`](./docs/lab-04/tests.md): Software Test Specification (STS) and requirement-to-test traceability matrix.
- [`docs/lab-04/release-verification.md`](./docs/lab-04/release-verification.md): Full-stack test execution report and WCAG 2.1 AA accessibility audit.
- [`docs/lab-04/reviewer.md`](./docs/lab-04/reviewer.md): Peer review records, PR links, and reviewer comments.
- [`docs/lab-04/ai-use.md`](./docs/lab-04/ai-use.md): AI pair programming prompt log and reflection.
