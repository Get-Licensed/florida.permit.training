export function canNavigateToModule({
  targetIndex,
  maxCompletedIndex,
  examPassed,
  paymentPaid,
}: {
  targetIndex: number;
  maxCompletedIndex: number;
  examPassed: boolean;
  paymentPaid: boolean;
}) {
  // Modules must be sequential
  if (targetIndex > maxCompletedIndex + 1) return false;

  // Exam and payment are handled OUTSIDE numeric modules
  return true;
}
