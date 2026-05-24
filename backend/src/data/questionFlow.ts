// ─── Question Flow Configuration ────────────────────────────
// Defines the adaptive question graph for all 4 concern branches.
// Each question includes transition rules that determine the next
// question based on the student's answer rating.

export interface QuestionFlowItem {
  id: string;
  text: string;
  type: "rating" | "mcq" | "open";
  options?: string[];
  transitions: {
    low?: string | null;      // answer rating 1-2
    medium?: string | null;   // answer rating 3
    high?: string | null;     // answer rating 4-5
    default?: string | null;  // fallback for mcq/open types
  };
}

// ─── CLARITY BRANCH ─────────────────────────────────────────
const CLARITY_QUESTIONS: QuestionFlowItem[] = [
  {
    id: "clarity_rating_01",
    text: "How clearly does the faculty explain new concepts?",
    type: "rating",
    transitions: {
      low: "clarity_mcq_01",
      medium: "clarity_rating_02",
      high: "clarity_open_01",
    },
  },
  {
    id: "clarity_mcq_01",
    text: "Which area needs the most improvement?",
    type: "mcq",
    options: ["Lecture pacing", "Use of examples", "Technical terminology", "Slide quality"],
    transitions: {
      default: "clarity_rating_02",
    },
  },
  {
    id: "clarity_rating_02",
    text: "How effective are the examples used in lectures?",
    type: "rating",
    transitions: {
      low: "clarity_open_01",
      medium: "clarity_mcq_02",
      high: "clarity_mcq_02",
    },
  },
  {
    id: "clarity_mcq_02",
    text: "How often do you feel lost during a lecture?",
    type: "mcq",
    options: ["Never", "Occasionally", "Frequently", "Almost always"],
    transitions: {
      default: "clarity_open_01",
    },
  },
  {
    id: "clarity_open_01",
    text: "What one change would most improve lecture clarity?",
    type: "open",
    transitions: {
      default: "clarity_rating_03",
    },
  },
  {
    id: "clarity_rating_03",
    text: "How useful are the course materials outside of class?",
    type: "rating",
    transitions: {
      low: "clarity_open_02",
      medium: "clarity_mcq_03",
      high: "clarity_mcq_03",
    },
  },
  {
    id: "clarity_mcq_03",
    text: "Which resource do you find most helpful?",
    type: "mcq",
    options: ["Slides", "Recorded lectures", "Textbook", "Office hours"],
    transitions: {
      default: "clarity_open_02",
    },
  },
  {
    id: "clarity_open_02",
    text: "Any additional comments on teaching clarity?",
    type: "open",
    transitions: {
      default: null,
    },
  },
];

// ─── WORKLOAD BRANCH ────────────────────────────────────────
const WORKLOAD_QUESTIONS: QuestionFlowItem[] = [
  {
    id: "workload_rating_01",
    text: "How evenly is the workload distributed across the semester?",
    type: "rating",
    transitions: {
      low: "workload_mcq_01",
      medium: "workload_rating_02",
      high: "workload_open_01",
    },
  },
  {
    id: "workload_mcq_01",
    text: "Which task takes the most unexpected time?",
    type: "mcq",
    options: ["Assignments", "Lab work", "Reading", "Project work"],
    transitions: {
      default: "workload_rating_02",
    },
  },
  {
    id: "workload_rating_02",
    text: "How clearly are assignment expectations and submission guidelines communicated?",
    type: "rating",
    transitions: {
      low: "workload_open_01",
      medium: "workload_mcq_02",
      high: "workload_mcq_02",
    },
  },
  {
    id: "workload_mcq_02",
    text: "How often do deadlines cluster together?",
    type: "mcq",
    options: ["Rarely", "Sometimes", "Often", "Almost every week"],
    transitions: {
      default: "workload_open_01",
    },
  },
  {
    id: "workload_open_01",
    text: "What specific workload issue impacts you most?",
    type: "open",
    transitions: {
      default: "workload_rating_03",
    },
  },
  {
    id: "workload_rating_03",
    text: "How clearly are assignment expectations communicated?",
    type: "rating",
    transitions: {
      low: "workload_open_02",
      medium: "workload_mcq_03",
      high: "workload_mcq_03",
    },
  },
  {
    id: "workload_mcq_03",
    text: "Would you prefer assignments to be:",
    type: "mcq",
    options: ["Fewer but larger", "More but smaller", "Current balance is fine", "More flexibility"],
    transitions: {
      default: "workload_open_02",
    },
  },
  {
    id: "workload_open_02",
    text: "Any additional comments on workload?",
    type: "open",
    transitions: {
      default: null,
    },
  },
];

// ─── ASSESSMENT BRANCH ──────────────────────────────────────
const ASSESSMENT_QUESTIONS: QuestionFlowItem[] = [
  {
    id: "assessment_rating_01",
    text: "How fair are the grading criteria?",
    type: "rating",
    transitions: {
      low: "assessment_mcq_01",
      medium: "assessment_rating_02",
      high: "assessment_open_01",
    },
  },
  {
    id: "assessment_mcq_01",
    text: "Where is grading least transparent?",
    type: "mcq",
    options: ["Project rubrics", "Exam marking", "Assignment feedback", "Participation scores"],
    transitions: {
      default: "assessment_rating_02",
    },
  },
  {
    id: "assessment_rating_02",
    text: "How useful is the feedback you receive on submitted work?",
    type: "rating",
    transitions: {
      low: "assessment_open_01",
      medium: "assessment_mcq_02",
      high: "assessment_mcq_02",
    },
  },
  {
    id: "assessment_mcq_02",
    text: "How quickly is graded work typically returned?",
    type: "mcq",
    options: ["Within a week", "1-2 weeks", "3-4 weeks", "More than a month"],
    transitions: {
      default: "assessment_open_01",
    },
  },
  {
    id: "assessment_open_01",
    text: "What would make assessments feel fairer?",
    type: "open",
    transitions: {
      default: "assessment_rating_03",
    },
  },
  {
    id: "assessment_rating_03",
    text: "How well do assessments reflect what was taught in class?",
    type: "rating",
    transitions: {
      low: "assessment_open_02",
      medium: "assessment_mcq_03",
      high: "assessment_mcq_03",
    },
  },
  {
    id: "assessment_mcq_03",
    text: "Which assessment type do you find most fair?",
    type: "mcq",
    options: ["Written exams", "Assignments", "Projects", "Presentations"],
    transitions: {
      default: "assessment_open_02",
    },
  },
  {
    id: "assessment_open_02",
    text: "Any additional comments on assessment?",
    type: "open",
    transitions: {
      default: null,
    },
  },
];

// ─── SUPPORT BRANCH ─────────────────────────────────────────
const SUPPORT_QUESTIONS: QuestionFlowItem[] = [
  {
    id: "support_rating_01",
    text: "How easy is it to reach the faculty when you need help outside class?",
    type: "rating",
    transitions: {
      low: "support_mcq_01",
      medium: "support_rating_02",
      high: "support_open_01",
    },
  },
  {
    id: "support_mcq_01",
    text: "What is the biggest barrier to getting help?",
    type: "mcq",
    options: ["Office hours are full", "Hard to reach by email", "Response takes too long", "Unclear where to go"],
    transitions: {
      default: "support_rating_02",
    },
  },
  {
    id: "support_rating_02",
    text: "When you do get help, how effective and satisfying is the response you receive?",
    type: "rating",
    transitions: {
      low: "support_open_01",
      medium: "support_mcq_02",
      high: "support_mcq_02",
    },
  },
  {
    id: "support_mcq_02",
    text: "Which support channel works best for you?",
    type: "mcq",
    options: ["Office hours", "Email", "Online forum", "Peer study groups"],
    transitions: {
      default: "support_open_01",
    },
  },
  {
    id: "support_open_01",
    text: "Describe a time you needed support and what happened.",
    type: "open",
    transitions: {
      default: "support_rating_03",
    },
  },
  {
    id: "support_rating_03",
    text: "How well does the faculty respond to student concerns in class?",
    type: "rating",
    transitions: {
      low: "support_open_02",
      medium: "support_mcq_03",
      high: "support_mcq_03",
    },
  },
  {
    id: "support_mcq_03",
    text: "How would you prefer urgent queries to be handled?",
    type: "mcq",
    options: ["Dedicated Q&A slots", "Anonymous question box", "Email within 24h", "Peer mentors"],
    transitions: {
      default: "support_open_02",
    },
  },
  {
    id: "support_open_02",
    text: "Any additional comments on faculty support?",
    type: "open",
    transitions: {
      default: null,
    },
  },
];

// ─── Combined question flow map ─────────────────────────────
// Flat map of ALL questions keyed by question ID for O(1) lookup.
export const QUESTION_FLOW: Record<string, QuestionFlowItem> = {};

// Branch-grouped list for filtering by branch
export const BRANCH_QUESTIONS: Record<string, QuestionFlowItem[]> = {
  clarity: CLARITY_QUESTIONS,
  workload: WORKLOAD_QUESTIONS,
  assessment: ASSESSMENT_QUESTIONS,
  support: SUPPORT_QUESTIONS,
};

// Populate flat map
for (const branch of Object.values(BRANCH_QUESTIONS)) {
  for (const q of branch) {
    QUESTION_FLOW[q.id] = q;
  }
}
