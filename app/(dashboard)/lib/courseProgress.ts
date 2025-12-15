import { supabase } from "@/utils/supabaseClient";

const COURSE_ID = "FL_PERMIT_TRAINING";
const TOTAL_REQUIRED_SECONDS = 6 * 60 * 60; // 21600

export async function getCourseProgress(userId: string) {
  const { data, error } = await supabase
    .from("course_progress_modules")
    .select(`
      module_index,
      completed,
      total_effective_seconds
    `)
    .eq("user_id", userId)
    .eq("course_id", COURSE_ID)
    .order("module_index", { ascending: true });

  if (error || !data || data.length === 0) {
    return {
      progressPercent: 0,
      timeRemainingHours: 6,
      resumeModuleIndex: 0,
      resumeLessonIndex: 0,
    };
  }

  /* % PROGRESS */
  const totalModules = data.length;
  const completedModules = data.filter(m => m.completed).length;

  const progressPercent = Math.round(
    (completedModules / totalModules) * 100
  );

  /* TIME REMAINING */
  const spentSeconds = data.reduce(
    (sum, m) => sum + (m.total_effective_seconds ?? 0),
    0
  );

  const remainingSeconds = Math.max(
    0,
    TOTAL_REQUIRED_SECONDS - spentSeconds
  );

  /* RESUME LOGIC */
  const next = data.find(m => !m.completed);

  return {
    progressPercent,
    timeRemainingHours: remainingSeconds / 3600,
    resumeModuleIndex: next?.module_index ?? 0,
    resumeLessonIndex: 0,
  };
}
