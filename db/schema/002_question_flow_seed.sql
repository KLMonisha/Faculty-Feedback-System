-- ============================================================
-- Faculty Feedback System — Migration 002: Adaptive Question Flow Seed
-- Adds the 32 question IDs used by the adaptive question engine
-- (questionFlow.ts) into the questions table so FK constraints
-- on the responses table are satisfied.
-- ============================================================

BEGIN;

INSERT INTO questions (id, branch, text, type, "order") VALUES

-- ─── Clarity (adaptive flow) ────────────────────────────────
('clarity_rating_01', 'clarity',
 'How clearly does the faculty explain new concepts?',
 'rating', 10),

('clarity_mcq_01', 'clarity',
 'Which area needs the most improvement?',
 'mcq', 11),

('clarity_rating_02', 'clarity',
 'How effective are the examples used in lectures?',
 'rating', 12),

('clarity_mcq_02', 'clarity',
 'How often do you feel lost during a lecture?',
 'mcq', 13),

('clarity_open_01', 'clarity',
 'What one change would most improve lecture clarity?',
 'open', 14),

('clarity_rating_03', 'clarity',
 'How useful are the course materials outside of class?',
 'rating', 15),

('clarity_mcq_03', 'clarity',
 'Which resource do you find most helpful?',
 'mcq', 16),

('clarity_open_02', 'clarity',
 'Any additional comments on teaching clarity?',
 'open', 17),

-- ─── Workload (adaptive flow) ───────────────────────────────
('workload_rating_01', 'workload',
 'How manageable is the weekly workload?',
 'rating', 10),

('workload_mcq_01', 'workload',
 'Which task takes the most unexpected time?',
 'mcq', 11),

('workload_rating_02', 'workload',
 'How reasonable are assignment deadlines?',
 'rating', 12),

('workload_mcq_02', 'workload',
 'How often do deadlines cluster together?',
 'mcq', 13),

('workload_open_01', 'workload',
 'What specific workload issue impacts you most?',
 'open', 14),

('workload_rating_03', 'workload',
 'How clearly are assignment expectations communicated?',
 'rating', 15),

('workload_mcq_03', 'workload',
 'Would you prefer assignments to be:',
 'mcq', 16),

('workload_open_02', 'workload',
 'Any additional comments on workload?',
 'open', 17),

-- ─── Assessment (adaptive flow) ─────────────────────────────
('assessment_rating_01', 'assessment',
 'How fair are the grading criteria?',
 'rating', 10),

('assessment_mcq_01', 'assessment',
 'Where is grading least transparent?',
 'mcq', 11),

('assessment_rating_02', 'assessment',
 'How useful is the feedback you receive on submitted work?',
 'rating', 12),

('assessment_mcq_02', 'assessment',
 'How quickly is graded work typically returned?',
 'mcq', 13),

('assessment_open_01', 'assessment',
 'What would make assessments feel fairer?',
 'open', 14),

('assessment_rating_03', 'assessment',
 'How well do assessments reflect what was taught in class?',
 'rating', 15),

('assessment_mcq_03', 'assessment',
 'Which assessment type do you find most fair?',
 'mcq', 16),

('assessment_open_02', 'assessment',
 'Any additional comments on assessment?',
 'open', 17),

-- ─── Support (adaptive flow) ────────────────────────────────
('support_rating_01', 'support',
 'How accessible is the faculty outside of class?',
 'rating', 10),

('support_mcq_01', 'support',
 'What is the biggest barrier to getting help?',
 'mcq', 11),

('support_rating_02', 'support',
 'How supported do you feel when you are struggling with content?',
 'rating', 12),

('support_mcq_02', 'support',
 'Which support channel works best for you?',
 'mcq', 13),

('support_open_01', 'support',
 'Describe a time you needed support and what happened.',
 'open', 14),

('support_rating_03', 'support',
 'How well does the faculty respond to student concerns in class?',
 'rating', 15),

('support_mcq_03', 'support',
 'How would you prefer urgent queries to be handled?',
 'mcq', 16),

('support_open_02', 'support',
 'Any additional comments on faculty support?',
 'open', 17)

ON CONFLICT (id) DO NOTHING;

COMMIT;
