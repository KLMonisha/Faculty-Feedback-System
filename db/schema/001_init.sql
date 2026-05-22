-- ============================================================
-- Faculty Feedback System — Migration 001: Initial Schema
-- PostgreSQL ≥ 15
-- ============================================================
--
-- PRIVACY INVARIANT
-- Student identity (students table) must NEVER appear alongside
-- response data (responses table) in any single query.
-- The schema enforces this by design:
--   responses → feedback_sessions → students  (two-hop, no shortcut FK)
-- Application code MUST NOT join across both hops in one query.
-- ============================================================

BEGIN;

-- ─── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Custom Types ───────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
        CREATE TYPE question_type AS ENUM ('rating', 'mcq', 'open');
    END IF;
END
$$;

-- ─── 1. Students ────────────────────────────────────────────
-- Stores only a hashed token — no PII, no email, no name.
CREATE TABLE IF NOT EXISTS students (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    hashed_token  TEXT        UNIQUE NOT NULL,
    created_at    TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ─── 2. Feedback Sessions ───────────────────────────────────
-- Links a student to a concern branch. This is the ONLY table
-- that references both a student id and session-level metadata.
CREATE TABLE IF NOT EXISTS feedback_sessions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concern_branch  TEXT        NOT NULL,
    started_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    completed       BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sessions_student_id
    ON feedback_sessions(student_id);

CREATE INDEX IF NOT EXISTS idx_sessions_concern_branch
    ON feedback_sessions(concern_branch);

-- ─── 3. Questions ───────────────────────────────────────────
-- Static catalog of questions grouped by branch.
CREATE TABLE IF NOT EXISTS questions (
    id      TEXT            PRIMARY KEY,
    branch  TEXT            NOT NULL,
    text    TEXT            NOT NULL,
    type    question_type   NOT NULL,
    "order" INT             NOT NULL,

    CONSTRAINT uq_questions_branch_order UNIQUE (branch, "order")
);

CREATE INDEX IF NOT EXISTS idx_questions_branch
    ON questions(branch);

-- ─── 4. Responses ───────────────────────────────────────────
-- Contains answer data linked ONLY to a session, never directly
-- to a student. This is the privacy boundary.
CREATE TABLE IF NOT EXISTS responses (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id    UUID        NOT NULL REFERENCES feedback_sessions(id) ON DELETE CASCADE,
    question_id   TEXT        NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    answer        TEXT        NOT NULL,
    answered_at   TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_responses_session_question UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_responses_session_id
    ON responses(session_id);

-- ─── Privacy-Safe View ──────────────────────────────────────
-- Provides anonymised response data for analytics.
-- Deliberately omits student_id so downstream consumers
-- cannot accidentally join to the students table.
CREATE OR REPLACE VIEW anonymous_responses AS
SELECT
    r.id            AS response_id,
    fs.id           AS session_id,
    fs.concern_branch,
    r.question_id,
    q.text          AS question_text,
    q.type          AS question_type,
    r.answer,
    r.answered_at
FROM responses r
JOIN feedback_sessions fs ON fs.id = r.session_id
JOIN questions q          ON q.id  = r.question_id;

COMMENT ON VIEW anonymous_responses IS
    'Analytics-safe view: intentionally excludes student_id. '
    'Do NOT create alternative views that expose student identity alongside answers.';

COMMIT;
