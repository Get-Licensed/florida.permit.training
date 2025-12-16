export type DerivedCourseStatus =
  | "in_progress"
  | "course_completed_exam_pending"
  | "completed_unpaid"
  | "completed_full";

export function deriveCourseStatus(cs: {
  completed_at: string | null;
  exam_passed: boolean | null;
  paid_at: string | null;
}): DerivedCourseStatus {
  if (!cs.completed_at) return "in_progress";

  if (cs.completed_at && !cs.exam_passed)
    return "course_completed_exam_pending";

  if (cs.completed_at && cs.exam_passed && !cs.paid_at)
    return "completed_unpaid";

  return "completed_full";
}
