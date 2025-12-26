//utils\deriveCourseStatus.ts

export type DerivedCourseStatus =
  | "not_started"              // no course progress, unpaid
  | "in_progress"              // course started, unpaid
  | "paid_incomplete"          // paid before finishing course
  | "course_complete_unpaid"   // course done, exam unlocked, unpaid
  | "course_complete_paid"     // course done, paid, exam unlocked
  | "exam_passed_unpaid"       // exam passed, awaiting payment
  | "exam_passed_paid";        // FINAL terminal state

export type DeriveCourseStatusInput = {
  completed_at: string | null;
  exam_passed: boolean | null;
  paid_at: string | null;
  total_time_seconds?: number | null; // optional, for future hardening
};

/* This function is the SINGLE SOURCE OF TRUTH for course state.
 * No caller should ever set `status` manually.*/

export function deriveCourseStatus(
  cs: DeriveCourseStatusInput
): DerivedCourseStatus {
  const courseComplete = !!cs.completed_at;
  const examPassed = !!cs.exam_passed;
  const paid = !!cs.paid_at;

  // ───────── COURSE NOT COMPLETE ─────────
  if (!courseComplete && !paid) {
    // not started OR in progress (frontend can disambiguate by progress data)
    return "not_started";
  }

  if (!courseComplete && paid) {
    // payment happened early
    return "paid_incomplete";
  }

  // ───────── COURSE COMPLETE ─────────
  if (courseComplete && !examPassed && !paid) {
    return "course_complete_unpaid";
  }

  if (courseComplete && !examPassed && paid) {
    return "course_complete_paid";
  }

  // ───────── EXAM PASSED ─────────
  if (examPassed && !paid) {
    return "exam_passed_unpaid";
  }

  // exam passed + paid
  return "exam_passed_paid";
}
