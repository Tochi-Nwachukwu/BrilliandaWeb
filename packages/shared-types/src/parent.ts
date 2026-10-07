import type { ReportCard } from "./admin";
import type { TermRef } from "./teacher";

// API contract for the parent portal (DECISIONS.md F-38). Parents only ever see published terms.

/** One subject in a published term, as the report card shows it. */
export type SubjectResult = {
  subjectName: string;
  teacherName: string | null;
  scores: { component: string; maxScore: number; value: number | null; isAbsent: boolean }[];
  total: number;
  grade: string;
  remark: string;
};

/** A published term for one child. */
export type TermResult = {
  term: TermRef;
  armName: string;
  publishedAt: string;
  average: number;
  position: number;
  of: number;
  subjects: SubjectResult[];
  classTeacherRemark: string | null;
  principalRemark: string | null;
  /** False until the parent has opened it: drives the "New" markers. */
  seen: boolean;
  /**
   * Staff views only: the term closed before every subject was complete (F-43). The average covers
   * the complete subjects and there is no position. Parents never see such a term.
   */
  unfinished?: boolean;
};

/** GET /parent/children */
export type ChildSummary = {
  id: string;
  fullName: string;
  /** This session's arm, e.g. "JSS 2B". */
  armName: string;
  classOrder: number;
  schoolName: string;
  /** The most recent published term, if any. */
  latest: { termId: string; label: string; average: number; position: number; of: number; seen: boolean } | null;
};

/** GET /parent/children/:id/results: every published term, oldest first, and where this term stands. */
export type ChildResults = {
  child: ChildSummary;
  terms: TermResult[];
  /** The term in progress, until its results are published. */
  currentTerm: { term: TermRef; published: false } | null;
};

/** GET /parent/children/:id/report-cards/:termId */
export type ParentReportCard = ReportCard;

/** GET /parent/notices: short notes from the school. */
export type SchoolNotice = { id: string; title: string; body: string; at: string };
