"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { Trash2, Edit2, Plus } from "lucide-react";

/* TYPES */
type ModuleRow = {
  id: string;
  title: string;
  sort_order: number;
};

type LessonRow = {
  id: number;
  title: string;
  module_id: string;
  sort_order: number;
};

type QuizRow = {
  id: string;
  lesson_id: number;
  question: string;
};

type QuizOptionRow = {
  id: string;
  quiz_id: string;
  option_text: string;
  is_correct: boolean;
};

export default function QuizCreatorPage() {
  /* ---------------- STATE ---------------- */
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);

  const [options, setOptions] = useState<
    { id: number; text: string; correct: boolean }[]
  >([{ id: 1, text: "", correct: false }]);

  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  /* ---------------- TOAST ---------------- */
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    loadModules();
    loadLessons();
    loadQuizzes();
  }, []);

  async function loadModules() {
    const { data } = await supabase
      .from("modules")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) setModules(data);
  }

  async function loadLessons() {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) setLessons(data);
  }

  async function loadQuizzes() {
    const { data } = await supabase.from("quizzes").select("*");
    if (data) setQuizzes(data);
  }

  async function loadQuizOptions(quizId: string) {
    const { data } = await supabase
      .from("quiz_options")
      .select("*")
      .eq("quiz_id", quizId);

    return data || [];
  }

  /* ---------------- OPTION HANDLERS ---------------- */
  function addOption() {
    setOptions((opts) => [
      ...opts,
      { id: Date.now(), text: "", correct: false },
    ]);
  }

  function updateOption(
    id: number,
    field: "text" | "correct",
    value: string | boolean
  ) {
    setOptions((opts) =>
      opts.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  }

  function deleteOption(id: number) {
    setOptions((opts) => opts.filter((o) => o.id !== id));
  }

  /* ---------------- EDIT EXISTING QUIZ ---------------- */
  async function editQuiz(quiz: QuizRow) {
    setEditingQuizId(quiz.id);
    setSelectedLessonId(quiz.lesson_id);
    setQuestion(quiz.question);

    /* Load options */
    const optRows = await loadQuizOptions(quiz.id);

    setOptions(
      optRows.map((o) => ({
        id: Date.now() + Math.random(),
        text: o.option_text,
        correct: o.is_correct,
      }))
    );
  }

  /* ---------------- DELETE QUIZ ---------------- */
  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);

    await supabase.from("quiz_options").delete().eq("quiz_id", id);
    await supabase.from("quizzes").delete().eq("id", id);

    showToast("Quiz deleted");
    loadQuizzes();
  }

  /* ---------------- SAVE QUIZ ---------------- */
  async function saveQuiz() {
    if (!selectedLessonId) return showToast("Select a lesson");
    if (!question.trim()) return showToast("Enter a question");

    const validOptions = options.filter((o) => o.text.trim() !== "");
    if (validOptions.length < 2)
      return showToast("At least 2 options required");

    setSaving(true);

    let quizId = editingQuizId;

    /* EDIT mode */
    if (editingQuizId) {
      await supabase
        .from("quizzes")
        .update({ question })
        .eq("id", editingQuizId);

      /* Clear old options */
      await supabase
        .from("quiz_options")
        .delete()
        .eq("quiz_id", editingQuizId);
    } else {
      /* CREATE mode */
      const { data: quizRow } = await supabase
        .from("quizzes")
        .insert([
          { lesson_id: selectedLessonId, question, order_index: 1 },
        ])
        .select()
        .single();

      if (!quizRow) {
        setSaving(false);
        return;
      }

      quizId = quizRow.id;
    }

    /* Insert new options */
    const payload = validOptions.map((o, index) => ({
      quiz_id: quizId,
      option_text: o.text,
      is_correct: o.correct,
      order_index: index,
    }));

    await supabase.from("quiz_options").insert(payload);

    /* RESET */
    setSaving(false);
    setEditingQuizId(null);
    setQuestion("");
    setOptions([{ id: 1, text: "", correct: false }]);

    showToast("Saved!");
    loadQuizzes();
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded shadow">
          {toast}
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000]">
          <div className="bg-white p-6 rounded-xl shadow-xl w-[360px] text-center">
            <p className="text-lg font-semibold text-[#001f40] mb-4">
              Delete this quiz?
            </p>

            <div className="flex justify-center gap-4">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
<p className="text-sm text-gray-700 mb-6">
  Quizzes appear at the end of each lesson in the student course player.  
  You may create multiple quizzes per lesson, and each quiz can contain any number of answer options.  
  Use the panel on the right to create or edit a quiz. Existing quizzes are listed in the left column — select any quiz there to edit or delete it.
</p>

      {/* TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-4 gap-8">

        {/* LEFT COLUMN — 25% */}
        <div className="col-span-1">
          <h2 className="text-lg font-semibold text-[#001f40] mb-3">
            Existing Quizzes
          </h2>

          <div className="space-y-4">
            {modules.map((mod) => {
              const modLessons = lessons.filter((l) => l.module_id === mod.id);
              const modQuizzes = quizzes.filter((q) =>
                modLessons.some((l) => l.id === q.lesson_id)
              );

              if (modQuizzes.length === 0) return null;

              return (
                <div
                  key={mod.id}
                  className="border border-gray-300 rounded-xl bg-white shadow-sm p-4"
                >
                  <h3 className="text-md font-semibold text-[#001f40] mb-2">
                    {mod.title}
                  </h3>

                  {modLessons.map((les) => {
                    const lesQuizzes = quizzes.filter(
                      (q) => q.lesson_id === les.id
                    );
                    if (lesQuizzes.length === 0) return null;

                    return (
                      <div key={les.id} className="mb-2 pl-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          {les.title}
                        </p>

                        {lesQuizzes.map((quiz) => (
                          <div
                            key={quiz.id}
                            className="flex justify-between items-center text-sm border rounded p-2 mb-1 bg-gray-50 hover:bg-gray-100 transition"
                          >
                            <span>{quiz.question}</span>

                            <div className="flex gap-3">
                              <Edit2
                                size={16}
                                className="text-[#001f40] cursor-pointer hover:text-[#003266]"
                                onClick={() => editQuiz(quiz)}
                              />
                              <Trash2
                                size={16}
                                className="text-red-600 cursor-pointer hover:text-red-800"
                                onClick={() => setDeleteTarget(quiz.id)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN — 75% */}
        <div className="col-span-3">
          <div className="bg-white border border-gray-300 rounded-xl shadow-sm p-6">

            <h2 className="text-xl font-semibold text-[#001f40] mb-4">
              {editingQuizId ? "Edit Quiz" : "Create New Quiz"}
            </h2>

            {/* SELECT LESSON */}
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Select Lesson
            </label>

            <select
              value={selectedLessonId ?? ""}
              onChange={(e) => setSelectedLessonId(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 shadow-sm focus:ring-2 focus:ring-[#ca5608]"
            >
              <option value="">Choose a lesson…</option>

              {modules.map((mod) => (
                <optgroup key={mod.id} label={mod.title}>
                  {lessons
                    .filter((l) => l.module_id === mod.id)
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>

            {/* QUESTION */}
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Question
            </label>

            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 shadow-sm focus:ring-2 focus:ring-[#ca5608]"
              placeholder="Enter quiz question"
            />

            {/* OPTIONS */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-700">Options</span>
                <button
                  onClick={addOption}
                  className="px-3 py-1 bg-[#001f40] text-white rounded-lg text-sm hover:bg-[#003266]"
                >
                  + Add Option
                </button>
              </div>

              {options.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-center gap-3 mb-3 border border-gray-300 rounded-lg p-3 shadow-sm bg-white"
                >
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) =>
                      updateOption(opt.id, "text", e.target.value)
                    }
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-[#ca5608]"
                    placeholder="Option text"
                  />

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={opt.correct}
                      onChange={(e) =>
                        updateOption(opt.id, "correct", e.target.checked)
                      }
                    />
                    Correct
                  </label>

                  {options.length > 1 && (
                    <button
                      onClick={() => deleteOption(opt.id)}
                      className="text-red-600 text-sm hover:text-red-800"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* SAVE BUTTON */}
            <button
              onClick={saveQuiz}
              disabled={saving}
              className={`w-full py-3 rounded-lg text-white font-semibold ${
                saving
                  ? "bg-gray-400"
                  : "bg-[#ca5608] hover:bg-[#b24b06]"
              }`}
            >
              {saving ? "Saving…" : editingQuizId ? "Update Quiz" : "Save Quiz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
