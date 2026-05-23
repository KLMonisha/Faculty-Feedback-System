# 🎓 Faculty Feedback System

A full-stack application for collecting, analyzing, and visualizing faculty feedback using AI-powered sentiment analysis.

## Architecture

```
faculty-feedback-system/
├── frontend/       → React + TypeScript + Tailwind CSS (Vite)
├── backend/        → Node.js + Express REST API
├── ai-service/     → Python + FastAPI (AI/NLP processing)
├── db/             → PostgreSQL schema & Redis configuration
├── .env.example    → Required environment variables
└── package.json    → Root scripts (concurrently)
```

## Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **PostgreSQL** ≥ 15
- **Redis** ≥ 7

## Quick Start

### 1. Clone & configure

```bash
git clone <repo-url>
cd faculty-feedback-system
cp .env.example .env    # fill in real values
```

### 2. Install all dependencies

```bash
npm run install:all
```

### 3. Set up the database

```bash
createdb faculty_feedback
psql -U postgres -d faculty_feedback -f db/schema/001_init.sql
psql -U postgres -d faculty_feedback -f db/schema/seed.sql
```

### 4. Run all services

```bash
npm run dev
```

| Service      | URL                     |
| ------------ | ----------------------- |
| Frontend     | http://localhost:5173    |
| Backend API  | http://localhost:3001    |
| AI Service   | http://localhost:8000    |

## Environment Variables

| Variable       | Description                           |
| -------------- | ------------------------------------- |
| `POSTGRES_URL` | PostgreSQL connection string          |
| `REDIS_URL`    | Redis connection string               |
| `GROQ_API_KEY` | Groq API key (console.groq.com)       |
| `JWT_SECRET`   | Secret for JWT token signing          |
| `PORT`         | Backend server port (default 3001)    |

## Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start all services concurrently      |
| `npm run dev:frontend` | Start only the frontend            |
| `npm run dev:backend`  | Start only the backend             |
| `npm run dev:ai`       | Start only the AI service          |
| `npm run install:all`  | Install deps for all services      |
| `npm run build:frontend` | Production build of frontend    |

## License

MIT
