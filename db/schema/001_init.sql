-- ============================================================
-- Faculty Feedback System — Database Schema
-- PostgreSQL ≥ 15
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ──────────────────────────────────────────────────
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'student'
                CHECK (role IN ('student', 'faculty', 'admin')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ─── Courses ────────────────────────────────────────────────
CREATE TABLE courses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(20)  UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    department  VARCHAR(100),
    semester    VARCHAR(20),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Faculty–Course mapping ─────────────────────────────────
CREATE TABLE faculty_courses (
    faculty_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    PRIMARY KEY (faculty_id, course_id)
);

-- ─── Feedback ───────────────────────────────────────────────
CREATE TABLE feedback (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID         REFERENCES users(id) ON DELETE SET NULL,
    faculty_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    feedback_text   TEXT NOT NULL,
    is_anonymous    BOOLEAN NOT NULL DEFAULT TRUE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'analyzed', 'reviewed', 'archived')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_faculty ON feedback(faculty_id);
CREATE INDEX idx_feedback_course  ON feedback(course_id);
CREATE INDEX idx_feedback_status  ON feedback(status);

-- ─── AI Analysis Results ────────────────────────────────────
CREATE TABLE analysis_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id     UUID UNIQUE NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    sentiment       VARCHAR(20) NOT NULL
                    CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
    confidence      DECIMAL(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    summary         TEXT,
    key_themes      JSONB DEFAULT '[]'::jsonb,
    suggestions     JSONB DEFAULT '[]'::jsonb,
    model_version   VARCHAR(50),
    analyzed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analysis_feedback  ON analysis_results(feedback_id);
CREATE INDEX idx_analysis_sentiment ON analysis_results(sentiment);

-- ─── Updated-at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
