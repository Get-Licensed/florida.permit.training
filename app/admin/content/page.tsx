"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import ModuleTabsSortable from "./_ModuleTabsSortable";
import { Pencil, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

/* ───────── PAGE START ───────── */
export default function ContentPage() {
  const router = useRouter();

  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);

  const [moduleName, setModuleName] = useState("");
  const [lessonName, setLessonName] = useState("");

  const [lessons, setLessons] = useState<any[]>([]);
  const [slides, setSlides] = useState<any[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);

  /* ───────── MODAL STATES ───────── */
  const [modalError, setModalError] = useState("");

  const [showModalNewModule, setShowModalNewModule] = useState(false);
  const [showModalEditModule, setShowModalEditModule] = useState(false);
  const [showModalDeleteModule, setShowModalDeleteModule] = useState(false);

  const [showModalNewLesson, setShowModalNewLesson] = useState(false);
  const [showModalEditLesson, setShowModalEditLesson] = useState(false);
  const [showModalDeleteLesson, setShowModalDeleteLesson] = useState(false);

  const [showModalNewSlide, setShowModalNewSlide] = useState(false);
  const [showModalDeleteSlide, setShowModalDeleteSlide] = useState(false);

  /* ───────── INPUT STATE ───────── */
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [editModuleTitle, setEditModuleTitle] = useState("");

  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [editLessonTitle, setEditLessonTitle] = useState("");

  const [selectedSlideToDelete, setSelectedSlideToDelete] = useState<number | null>(null);

  /* ───────── LOAD MODULE TITLE ───────── */
  useEffect(() => {
    if (!selectedModule) return setModuleName("");
    loadModuleTitle(selectedModule);
  }, [selectedModule]);

  async function loadModuleTitle(moduleId: string) {
    const { data } = await supabase
      .from("modules")
      .select("title")
      .eq("id", moduleId)
      .single();
    if (data) {
      setModuleName(data.title);
      setEditModuleTitle(data.title);
    }
  }

  /* ───────── LOAD LESSONS ───────── */
  useEffect(() => {
    setSelectedLesson(null);
    setSlides([]);
    if (!selectedModule) return setLessons([]);
    loadLessons(selectedModule);
  }, [selectedModule]);

  async function loadLessons(moduleId: string) {
    setLoadingLessons(true);
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("id", { ascending: true });
    if (data) setLessons(data);
    setLoadingLessons(false);
  }

  /* ───────── LOAD SLIDES ───────── */
  useEffect(() => {
    if (!selectedLesson) {
      setSlides([]);
      setLessonName("");
      return;
    }
    loadSlides(selectedLesson);
    loadLessonTitle(selectedLesson);
  }, [selectedLesson]);

  async function loadSlides(lessonId: number) {
    setLoadingSlides(true);
    const { data } = await supabase
      .from("lesson_slides")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true });
    if (data) setSlides(data);
    setLoadingSlides(false);
  }

  async function loadLessonTitle(lessonId: number) {
    const { data } = await supabase
      .from("lessons")
      .select("title")
      .eq("id", lessonId)
      .single();
    if (data) setLessonName(data.title);
  }

  /* ───────── CREATE MODULE ───────── */
  async function createModule() {
    if (!newModuleTitle.trim()) {
      setModalError("Module title required.");
      return;
    }
    const title = newModuleTitle.trim();
    const { error } = await supabase.from("modules").insert([{ title }]);
    if (error) {
      setModalError("Failed to create module.");
      return;
    }
    setShowModalNewModule(false);
    setNewModuleTitle("");
    setModalError("");
    refreshTabs();
  }

  /* ───────── UPDATE MODULE ───────── */
  async function updateModuleTitle() {
    if (!editModuleTitle.trim() || !selectedModule) return;
    const newTitle = editModuleTitle.trim();
    await supabase.from("modules").update({ title: newTitle }).eq("id", selectedModule);
    setModuleName(newTitle);
    setShowModalEditModule(false);
    refreshTabs();
  }

  /* ───────── DELETE MODULE ───────── */
  async function deleteModule() {
    if (!selectedModule) return;
    // Delete lessons > slides > module
    await supabase.from("lesson_slides").delete().in(
      "lesson_id",
      lessons.map(l => l.id)
    );
    await supabase.from("lessons").delete().eq("module_id", selectedModule);
    await supabase.from("modules").delete().eq("id", selectedModule);

    setSelectedModule(null);
    setSelectedLesson(null);
    setShowModalDeleteModule(false);
    refreshTabs();
  }

  /* ───────── CREATE LESSON ───────── */
  async function handleCreateLesson() {
    if (!newLessonTitle.trim() || !selectedModule) return;
    await supabase.from("lessons").insert([{ module_id: selectedModule, title: newLessonTitle.trim() }]);
    setShowModalNewLesson(false);
    setNewLessonTitle("");
    loadLessons(selectedModule);
  }

  /* ───────── UPDATE LESSON ───────── */
  async function updateLessonTitle() {
    if (!editLessonTitle.trim() || !selectedLesson) return;
    const newTitle = editLessonTitle.trim();
    await supabase.from("lessons").update({ title: newTitle }).eq("id", selectedLesson);
    setLessonName(newTitle);
    setShowModalEditLesson(false);
    loadLessons(selectedModule!);
  }

  /* ───────── DELETE LESSON ───────── */
  async function deleteLesson() {
    if (!selectedLesson) return;
    await supabase.from("lesson_slides").delete().eq("lesson_id", selectedLesson);
    await supabase.from("lessons").delete().eq("id", selectedLesson);
    setShowModalDeleteLesson(false);
    setSelectedLesson(null);
    loadLessons(selectedModule!);
  }

  /* ───────── DELETE SLIDE ───────── */
  async function deleteSlide() {
    if (!selectedSlideToDelete) return;
    await supabase.from("lesson_slides").delete().eq("id", selectedSlideToDelete);
    setShowModalDeleteSlide(false);
    loadSlides(selectedLesson!);
  }

  /* ───────── HELPERS ───────── */
  function refreshTabs() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("refresh-modules"));
    }
  }

  /* ───────── UI ───────── */
  return (
    <div className="p-6">
      {/* MODULE HEADER */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-[#001f40] text-xl">Modules</h2>
        <button
          onClick={() => setShowModalNewModule(true)}
          className="px-3 py-1.5 bg-[#001f40] text-white text-sm rounded hover:bg-[#003266]"
        >
          + Add Module
        </button>
      </div>

      {/* MODULE TABS */}
      <ModuleTabsSortable onChange={(id: string) => setSelectedModule(id)} />

      {/* LESSONS HEADER */}
      <div className="flex justify-between items-center mt-6 mb-2">
        <h2 className="font-bold text-[#001f40] text-xl">
          Lessons {moduleName && `| ${moduleName}`}
        </h2>

        {selectedModule && (
          <button
            onClick={() => setShowModalNewLesson(true)}
            className="px-3 py-1.5 bg-[#001f40] text-white text-sm rounded hover:bg-[#003266]"
          >
            + Add Lesson
          </button>
        )}
      </div>

      {/* LESSONS PANEL */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        {!selectedModule && <p className="text-gray-500 text-sm">Select a module above.</p>}

        {selectedModule && lessons.length > 0 && (
          <div className="space-y-1">
            {lessons.map(lesson => (
              <div
                key={lesson.id}
                className={`border-b flex justify-between items-center py-2 text-sm cursor-pointer ${
                  selectedLesson === lesson.id ? "bg-gray-100" : ""
                }`}
                onClick={() => setSelectedLesson(lesson.id)}
              >
                <span>{lesson.title}</span>

                <div className="flex gap-3">
                  <Pencil
                    size={15}
                    className="text-gray-500 hover:text-[#001f40]"
                    onClick={e => {
                      e.stopPropagation();
                      setEditLessonTitle(lesson.title);
                      setShowModalEditLesson(true);
                    }}
                  />
                  <Trash2
                    size={15}
                    className="text-red-500 hover:text-red-700"
                    onClick={e => {
                      e.stopPropagation();
                      setShowModalDeleteLesson(true);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SLIDES HEADER */}
      {selectedLesson && (
        <div className="flex justify-between items-center mt-6 mb-2">
          <h2 className="font-bold text-[#001f40] text-xl">
            Slides {moduleName && `| ${moduleName}`} | {lessonName}
          </h2>
          <button
            onClick={() => setShowModalNewSlide(true)}
            className="px-3 py-1.5 bg-[#001f40] text-white text-sm rounded hover:bg-[#003266]"
          >
            + Add Slide
          </button>
        </div>
      )}

      {/* SLIDES PANEL */}
      {selectedLesson && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          {loadingSlides && <p>Loading slides...</p>}
          {!loadingSlides && slides.length === 0 && <p className="text-gray-500 text-sm">No slides yet.</p>}

          {!loadingSlides && slides.length > 0 && (
            <div className="space-y-2">
              {slides.map(s => (
                <div
                  key={s.id}
                  className="border p-2 rounded flex justify-between items-center text-sm"
                >
                  <span>{s.caption}</span>
                  <div className="flex gap-3 items-center">
                    <span className="text-gray-400 text-xs">{s.display_seconds}s</span>
                    <Trash2
                      size={15}
                      className="text-red-500 hover:text-red-700 cursor-pointer"
                      onClick={() => {
                        setSelectedSlideToDelete(s.id);
                        setShowModalDeleteSlide(true);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────── MODALS BELOW ───────── */}
      <NewModuleModal
        show={showModalNewModule}
        value={newModuleTitle}
        setValue={setNewModuleTitle}
        error={modalError}
        onClose={() => {
          setShowModalNewModule(false);
          setModalError("");
        }}
        onSave={createModule}
      />

      <Modal
        show={showModalEditModule}
        title="Edit Module Title"
        value={editModuleTitle}
        setValue={setEditModuleTitle}
        onClose={() => setShowModalEditModule(false)}
        onSave={updateModuleTitle}
      />

      <ConfirmModuleDeleteModal
        show={showModalDeleteModule}
        lessons={lessons}
        onClose={() => setShowModalDeleteModule(false)}
        onConfirm={deleteModule}
      />

      {/* LESSON MODALS */}
      <Modal
        show={showModalNewLesson}
        title="New Lesson"
        value={newLessonTitle}
        setValue={setNewLessonTitle}
        onClose={() => setShowModalNewLesson(false)}
        onSave={handleCreateLesson}
      />

      <Modal
        show={showModalEditLesson}
        title="Edit Lesson Title"
        value={editLessonTitle}
        setValue={setEditLessonTitle}
        onClose={() => setShowModalEditLesson(false)}
        onSave={updateLessonTitle}
      />

      <ConfirmLessonDeleteModal
        show={showModalDeleteLesson}
        lesson={lessonName}
        onClose={() => setShowModalDeleteLesson(false)}
        onConfirm={deleteLesson}
      />

      {/* SLIDE MODALS */}
      {selectedLesson && (
      <SlideModal
        show={showModalNewSlide}
        lessonId={selectedLesson}
        onClose={() => setShowModalNewSlide(false)}
        onSaved={() => loadSlides(selectedLesson)}
      />
    )}

      {selectedLesson && (
        <ConfirmSlideDeleteModal
          show={showModalDeleteSlide}
          onClose={() => setShowModalDeleteSlide(false)}
          onConfirm={deleteSlide}
        />
      )}

    </div>
  );
}

/* ───────── REUSABLE SIMPLE TEXT MODAL ───────── */
function Modal({ show, title, value, setValue, onClose, onSave, error }: any) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1200]">
      <div className="bg-white rounded-lg p-6 w-[350px] shadow-lg">
        <h3 className="text-lg font-semibold text-[#001f40] mb-3">{title}</h3>

        <input
          type="text"
          className="w-full border p-2 rounded"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSave()}
        />

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded text-sm cursor-pointer">
            Cancel
          </button>

          <button
            onClick={onSave}
            className="px-3 py-1 bg-[#001f40] text-white rounded text-sm hover:bg-[#003266]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── NEW MODULE MODAL ───────── */
function NewModuleModal({ show, value, setValue, onClose, onSave, error }: any) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1200]">
      <div className="bg-white rounded-lg p-6 w-[350px] shadow-lg">
        <h3 className="text-lg font-semibold text-[#001f40] mb-3">
          New Module
        </h3>

        <input
          type="text"
          placeholder="Module title..."
          className="w-full border p-2 rounded"
          value={value}
          onChange={e => setValue(e.target.value)}
        />

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded text-sm cursor-pointer">
            Cancel
          </button>

          <button
            onClick={onSave}
            className="px-3 py-1 bg-[#001f40] text-white rounded text-sm hover:bg-[#003266]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── DELETE MODULE CONFIRM ───────── */
function ConfirmModuleDeleteModal({ show, lessons, onClose, onConfirm }: any) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1200]">
      <div className="bg-white rounded-lg p-6 w-[420px] shadow-lg">
        <h3 className="text-lg font-bold text-red-700 mb-3">
          Delete Module?
        </h3>

        <p className="text-sm text-gray-700 mb-2">
          This action will delete:
        </p>

        <ul className="text-sm text-gray-700 mb-3 list-disc pl-6">
          <li>{lessons.length} lessons</li>
          <li>All slides under those lessons</li>
        </ul>

        <p className="text-sm text-red-600 font-semibold">
          This cannot be undone.
        </p>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1 border rounded text-sm cursor-pointer">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-800"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── DELETE LESSON CONFIRM ───────── */
function ConfirmLessonDeleteModal({ show, lesson, onClose, onConfirm }: any) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1200]">
      <div className="bg-white rounded-lg p-6 w-[380px] shadow-lg">
        <h3 className="text-lg font-bold text-red-700 mb-3">
          Delete Lesson?
        </h3>

        <p className="text-sm text-gray-800 mb-3">
          Deleting &quot;{lesson}&quot; will also delete all slides in this lesson.
        </p>

        <p className="text-sm text-red-600 font-semibold">
          This cannot be undone.
        </p>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1 border rounded text-sm cursor-pointer">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-800"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── DELETE SLIDE CONFIRM ───────── */
function ConfirmSlideDeleteModal({ show, onClose, onConfirm }: any) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1200]">
      <div className="bg-white rounded-lg p-6 w-[350px] shadow-lg">
        <h3 className="text-lg font-bold text-red-700 mb-3">
          Delete Slide?
        </h3>

        <p className="text-sm text-gray-800 mb-3">
          This will remove this slide. Image file will remain stored.
        </p>

        <p className="text-sm text-red-600 font-semibold">
          This cannot be undone.
        </p>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1 border rounded text-sm cursor-pointer">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-800"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── SLIDE UPLOAD MODAL ───────── */
function SlideModal({ show, lessonId, onClose, onSaved }: any) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [seconds, setSeconds] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!show) return null;

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > 1024 * 1024) {
      setError("File too large. Max 1MB.");
      return;
    }
    setImageFile(file);
    setError("");
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

async function saveSlide() {
  try {
    if (!lessonId) {
      setError("Missing lesson ID.");
      return;
    }
    if (!imageFile || !caption) {
      setError("Image and caption required");
      return;
    }
    setSaving(true);

    const filename = `${uuidv4()}-${imageFile.name}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("uploads")
      .upload(`slides/${filename}`, imageFile);

    if (uploadErr) throw uploadErr;
    const imageUrl = uploadData?.path;

    // Find NEXT slide order
    const { data: existingSlides } = await supabase
      .from("lesson_slides")
      .select("order_index")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrder = existingSlides?.[0]?.order_index + 1 || 1;

    const { error: captionError } = await supabase
      .from("lesson_slides")
      .insert([
        {
          lesson_id: Number(lessonId),
          image_path: imageUrl,
          caption,
          display_seconds: seconds,
          group_key: uuidv4(),
          order_index: nextOrder,
        },
      ]);

    if (captionError) throw captionError;

    onSaved();
    onClose();
  } catch (err) {
    console.error("SAVE SLIDE ERROR:", err);
    setError((err as any)?.message || "Unknown error saving slide.");
  } finally {
    setSaving(false);
  }
}


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1200]">
      <div className="bg-white rounded-lg p-6 w-[380px] shadow-lg">
        <h3 className="text-lg font-semibold text-[#001f40] mb-3">Add Slide</h3>

        <label className="block text-sm font-medium mb-1 text-[#001f40]">
          Slide Image (max 1MB)
        </label>

        <div
          onClick={() => document.getElementById("fileInputSlide")?.click()}
          className="border border-dashed border-gray-400 rounded-md flex items-center justify-center h-40 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
        >
          {previewUrl ? (
            <img src={previewUrl} className="object-cover max-h-full rounded-md" />
          ) : (
            <span className="text-gray-500">Choose Image...</span>
          )}
        </div>
        <input
          id="fileInputSlide"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* CAPTION */}
        <div className="mt-3">
          <label className="block text-sm font-medium mb-1 text-[#001f40]">
            Caption Text
          </label>
          <textarea
            className="border p-2 w-full rounded"
            rows={3}
            placeholder="Enter caption..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />
        </div>

        {/* SECONDS */}
        <div className="mt-3">
          <label className="block text-sm font-medium mb-1 text-[#001f40]">
            Display Duration (seconds)
          </label>
          <input
            type="number"
            min={1}
            value={seconds}
            onChange={e => setSeconds(parseInt(e.target.value))}
            className="border p-2 rounded w-24"
          />
        </div>

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded text-sm cursor-pointer">
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={saveSlide}
            className={`px-6 py-1.5 rounded text-white text-sm font-semibold ${
              saving ? "bg-gray-400" : "bg-[#001f40] hover:bg-[#003266]"
            }`}
          >
            {saving ? "Saving..." : "Save Slide"}
          </button>
        </div>
      </div>
    </div>
  );
}
