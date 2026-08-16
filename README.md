# TokTickIT - IT Service Desk

TokTickIT is a full-stack IT Service Desk application built as an end-to-end vertical slice demonstration for CPE 334 (Software Engineering in the Age of AI Coding Agents). The application enables users to verify system status and view IT service request categories stored in a relational PostgreSQL database.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Bootstrap 5
- **Backend**: Node.js, Express, TypeScript
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Testing**: Vitest, React Testing Library, Supertest

---

## Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [PostgreSQL](https://www.postgresql.org/) database server running locally or accessible via network

---

### 2. Environment Variables

Create `.env` files from their respective `.env.example` templates in both `server/` and `client/`.

> **Note:** Never commit `.env` files containing secrets or real credentials to Git. Always keep them in `.gitignore`.

#### Backend (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toktickit?schema=public"
PORT=3000
```
- `DATABASE_URL`: PostgreSQL connection string with your credentials and database name.
- `PORT`: (Optional) Port for the Express server (defaults to `3000`).

#### Frontend (`client/.env`)
Copy `client/.env.example` to `client/.env` (optional if using default port 3000):
```env
VITE_API_URL="http://localhost:3000"
```
- `VITE_API_URL`: Base URL of the backend API.

---

### 3. Installation & Database Setup

1. **Install Server Dependencies & Initialize Database**:
   ```bash
   cd server
   npm install
   npm run prisma:migrate
   npm run prisma:seed
   ```
   - `npm run prisma:migrate`: Runs Prisma migrations to create the database schema.
   - `npm run prisma:seed`: Seeds the 4 IT request categories (`Account and Access`, `Hardware`, `Software`, `Network`) safely with idempotency.

2. **Install Client Dependencies**:
   ```bash
   cd ../client
   npm install
   ```

---

### 4. Running the Application

1. **Start Backend Server**:
   ```bash
   cd server
   npm run dev
   ```
   The backend API will start at `http://localhost:3000`.

2. **Start Frontend Dev Server**:
   ```bash
   cd client
   npm run dev
   ```
   The Vite React application will start at `http://localhost:5173`.

---

## Running Tests

Automated testing covers both backend endpoints (Supertest) and frontend UI components (Vitest + React Testing Library).

### Backend Tests
```bash
cd server
npm test
```
Runs test suites verifying:
- `GET /api/health`: Returns HTTP 200 and `{ status: "ok", service: "TokTickIT API" }`.
- `GET /api/categories`: Returns HTTP 200 and the 4 seeded categories ordered by `id` ascending.

### Frontend Tests
```bash
cd client
npm test
```
Runs test suites verifying:
- Heading and branding render correctly.
- Success state displays `System Status: Online` and dynamically renders the list of categories.
- Error state displays `System Status: Offline` when the backend API is unreachable.

---

## Branch and Pull Request (PR) Rules

This repository follows a strict multi-tier Git branching workflow:

### Branch Model
```
main (protected stable release)
 └── lab1-staging (integration branch)
      ├── feature/1-project-foundation
      ├── feature/2-health-check
      ├── feature/3-category-seed
      └── feature/4-category-list
```

### Development Rules:
1. **Never commit directly to `main` or `lab1-staging`**.
2. **Branch from `lab1-staging`**:
   - Create a feature branch for each issue: `git switch -c feature/<issue-number>-<name>`.
3. **Commit with conventional messages**:
   - Prefix commits with `feat:`, `fix:`, `test:`, `docs:`, or `chore:`.
4. **Open Pull Requests targeting `lab1-staging`**:
   - Always set the base branch to `lab1-staging` (do NOT merge directly to `main`).
   - Link the corresponding GitHub Issue in the PR's right sidebar (`Development` section) and description (`Closes #<issue>`).
5. **Peer Review Gate**:
   - Every PR requires peer review and approval from a collaborator before merging.
   - The **reviewer** (not the author) clicks "Merge pull request" after approving.
6. **Release to `main`**:
   - After all feature PRs are merged into `lab1-staging` and tests pass, open a release PR from `lab1-staging` into `main`.