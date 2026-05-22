-- ============================================================
-- Faculty Feedback System — Seed: Questions
-- 12 questions — 3 per branch (clarity, workload, assessment, support)
-- ============================================================

BEGIN;

INSERT INTO questions (id, branch, text, type, "order") VALUES

-- ─── Clarity ────────────────────────────────────────────────
('clarity_01', 'clarity',
 'How clearly does the instructor explain core concepts?',
 'rating', 1),

('clarity_02', 'clarity',
 'Which teaching aid is most effective in this course?',
 'mcq', 2),

('clarity_03', 'clarity',
 'Describe a topic that you found difficult to follow and why.',
 'open', 3),

-- ─── Workload ───────────────────────────────────────────────
('workload_01', 'workload',
 'How manageable is the weekly workload for this course?',
 'rating', 1),

('workload_02', 'workload',
 'Which component contributes the most to your workload?',
 'mcq', 2),

('workload_03', 'workload',
 'What changes would make the workload more balanced?',
 'open', 3),

-- ─── Assessment ─────────────────────────────────────────────
('assessment_01', 'assessment',
 'How fair and transparent is the grading in this course?',
 'rating', 1),

('assessment_02', 'assessment',
 'Which assessment format do you find most useful for learning?',
 'mcq', 2),

('assessment_03', 'assessment',
 'How could the assessment structure be improved?',
 'open', 3),

-- ─── Support ────────────────────────────────────────────────
('support_01', 'support',
 'How accessible is the instructor outside of class hours?',
 'rating', 1),

('support_02', 'support',
 'Which support channel do you use the most?',
 'mcq', 2),

('support_03', 'support',
 'What additional support would help you succeed in this course?',
 'open', 3)

ON CONFLICT (id) DO NOTHING;

COMMIT;
