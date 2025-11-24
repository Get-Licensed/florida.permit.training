"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import ModuleTabs from "./_ModuleTabs";
import { useRouter } from "next/navigation";

export default function ContentPage() {
  const router = useRouter();

  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);

  const [lessons, setLessons] = useState<any[]>([]);
  const [slides, setSlides] = useState<any[]>([]);

  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingSlides, setLoadingSlides] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [modalError, setModalError] = useState("");

  /* ───────── LOAD LESSONS WHEN MODULE SELECTED ───────── */
  useEffect(() => {
    setSelectedLesson(null);
    setSlides([]);
    if (!selectedModule) {
      setLessons([]);
      return;
    }
    loadLessons(selectedModule);
  }, [selectedModule]);

  async function loadLessons(moduleId: string) {
    setLoadingLessons(true);
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("id", { ascending: true });

    if (!error && data) setLessons(data);
    setLoadingLessons(false);
  }

  /* ───────── LOAD SLIDES WHEN LESSON SELECTED ───────── */
  useEffect(() => {
    if (!selectedLesson) {
      setSlides([]);
      return;
    }
    loadSlides(selectedLesson);
  }, [selectedLesson]);

  async function loadSlides(lessonId: number) {
    setLoadingSlides(true);
    const { data, error } = await supabase
      .from("lesson_slides")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("id", { ascending: true });

    if (!error && data) setSlides(data);
    setLoadingSlides(false);
  }

  /* ───────── CREATE NEW LESSON ───────── */
  async function handleCreateLesson() {
    if (!newLessonTitle.trim()) return setModalError("Lesson title required.");
    if (!selectedModule) return setModalError("Select a module first.");

    const { error } = await supabase.from("lessons").insert([
      {
        title: newLessonTitle.trim(),
        duration: 1, // placeholder
        module_id: selectedModule,
      },
    ]);

    if (error) {
      console.error(error);
      return setModalError("Failed to create lesson.");
    }

    setShowModal(false);
    setNewLessonTitle("");
    await loadLessons(selectedModule);
  }

  /* ───────── UI ───────── */
  return (
    <div className="p-6">
      {/* MODULE SELECTOR */}
      <ModuleTabs onChange={(id: string) => setSelectedModule(id)} />

      {/* LESSON LIST PANEL */}
      <div className="bg-white border rounded-lg shadow-sm p-4 mt-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-[#001f40] text-lg">
            {selectedModule ? "Lessons" : "Select a Module"}
          </h2>

          {selectedModule && (
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1 bg-[#ca5608] text-white text-sm rounded hover:bg-[#e66d23]"
              style={{ cursor: "pointer" }}
            >
              + Add Lesson
            </button>
          )}
        </div>

        {/* NO MODULE SELECTED */}
        {!selectedModule && (
          <p className="text-gray-500 text-sm">
            Select a module above to view or add lessons.
          </p>
        )}

        {/* LESSONS */}
        {selectedModule && lessons.length > 0 && (
          <div className="space-y-1">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className={`border-b border-gray-200 py-2 text-sm flex justify-between items-center cursor-pointer ${
                  selectedLesson === lesson.id ? "bg-gray-100" : ""
                }`}
                onClick={() => setSelectedLesson(lesson.id)}
              >
                <span>{lesson.title}</span>
                <span className="text-gray-400 text-xs">{lesson.duration} min</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SLIDES PANEL */}
      {selectedLesson && (
        <div className="bg-white border rounded-lg shadow-sm p-4 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-[#001f40] text-lg">Slides</h2>

            <button
                onClick={() => router.push(`/admin/content/new-slide?lesson=${selectedLesson}`)}
                className="text-sm px-3 py-1.5 rounded bg-[#001f40] text-white hover:bg-[#003266] transition cursor-pointer"
                >
                + Add Slide
                </button>

          </div>

          {/* SLIDE LIST */}
          {loadingSlides && <p>Loading slides...</p>}

          {!loadingSlides && slides.length === 0 && (
            <p className="text-gray-500 text-sm">No slides yet.</p>
          )}

          {!loadingSlides && slides.length > 0 && (
            <div className="space-y-2">
              {slides.map((s) => (
                <div
                  key={s.id}
                  className="border p-2 rounded flex justify-between items-center text-sm"
                >
                  <span>{s.caption}</span>
                  <span className="text-gray-400 text-xs">
                    {s.display_seconds}s
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LESSON MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[350px] shadow-lg">
            <h3 className="text-lg font-semibold text-[#001f40] mb-3">
              New Lesson
            </h3>

            <input
              type="text"
              placeholder="Lesson Title"
              className="w-full border p-2 rounded"
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
            />

            {modalError && (
              <p className="text-red-500 text-sm mt-2">{modalError}</p>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setModalError("");
                }}
                className="px-3 py-1 border rounded text-sm"
                style={{ cursor: "pointer" }}
              >
                Cancel
              </button>

              <button
                onClick={handleCreateLesson}
                className="px-3 py-1 bg-[#001f40] text-white rounded text-sm hover:bg-[#003266]"
                style={{ cursor: "pointer" }}
              >
                Save Lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
