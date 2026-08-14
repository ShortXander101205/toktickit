# TokTickIT - IT Service Desk

## Setup Instructions

1. **Install Dependencies**
   Run `npm install` in both the `client` and `server` directories.

2. **Environment Variables**
   Navigate to the `server` directory, copy `.env.example` to `.env`, and update the `DATABASE_URL` with your local PostgreSQL credentials.

3. **Running the App**
   - Start backend: `cd server` then `npm run dev`
   - Start frontend: `cd client` then `npm run dev`

4. **Testing**
   - Backend tests: `cd server` then `npm test`
   - Frontend tests: `cd client` then `npm test`