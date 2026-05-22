# Database Configuration

## PostgreSQL

### Schema Overview

```
students               feedback_sessions          responses
┌──────────────┐       ┌───────────────────┐       ┌─────────────────┐
│ id (PK)      │──┐    │ id (PK)           │──┐    │ id (PK)         │
│ hashed_token │  └──→ │ student_id (FK)   │  └──→ │ session_id (FK) │
│ created_at   │       │ concern_branch    │       │ question_id(FK) │
└──────────────┘       │ started_at        │       │ answer          │
                       │ completed         │       │ answered_at     │
                       └───────────────────┘       └─────────────────┘

questions
┌────────────────┐     anonymous_responses (VIEW)
│ id (PK)        │     ┌──────────────────────────┐
│ branch         │     │ response_id              │
│ text           │     │ session_id               │
│ type (enum)    │     │ concern_branch           │
│ order          │     │ question_id / text / type │
└────────────────┘     │ answer / answered_at     │
                       └──────────────────────────┘
```

### Privacy Invariant

> **Student identity must NEVER appear alongside response data in any single query.**

The schema enforces this by design:
- `responses` → `feedback_sessions` → `students` (two-hop, no shortcut FK)
- The `anonymous_responses` view deliberately omits `student_id`
- Application code **MUST NOT** join across both hops in one query

### Setup

1. Create the database:
   ```bash
   createdb faculty_feedback
   ```

2. Run the schema migration:
   ```bash
   psql -d faculty_feedback -f schema/001_init.sql
   ```

3. Load seed questions (12 questions across 4 branches):
   ```bash
   psql -d faculty_feedback -f schema/seed.sql
   ```

### Tables

| Table | Purpose |
|-------|---------|
| `students` | Hashed tokens only — no PII stored |
| `feedback_sessions` | Links student to a concern branch |
| `responses` | Answer data, linked to session only |
| `questions` | Static question catalog (clarity, workload, assessment, support) |

### Indexes

| Index | Table | Column |
|-------|-------|--------|
| `idx_sessions_student_id` | feedback_sessions | student_id |
| `idx_sessions_concern_branch` | feedback_sessions | concern_branch |
| `idx_questions_branch` | questions | branch |
| `idx_responses_session_id` | responses | session_id |

## Redis

### Setup

Start Redis with the provided config:
```bash
redis-server redis/redis.conf
```

### Usage

Redis is used for:
- Session caching
- Rate limiting
- AI analysis job queue
