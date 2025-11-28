"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

import LessonExplorerLayout from "./LessonExplorerLayout";
import LessonExplorer from "./LessonExplorer";

import CaptionEditorRow from "./CaptionEditorRow";

import { Caption, Slide } from "./types";

export default function CaptionsEditor() {
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  /* LOAD MODULES + LESSONS */
  useEffect(() => {
    async function load() {
      const { data: m } = await supabase
        .from("modules")
        .select("*")
        .order("sort_order");

      const { data: l } = await supabase
        .from("lessons")
        .select("*")
        .order("sort_order");

      setModules(m || []);
      setLessons(l || []);
    }
    load();
  }, []);

  /* LOAD SLIDES + CAPTIONS FOR LESSON */
  async function loadLessonData(lessonId: string) {
    const { data: sl } = await supabase
      .from("lesson_slides")
      .select("*")
      .eq("lesson_id", Number(lessonId))
      .order("order_index");

    const slideIds = sl?.map((s) => s.id) ?? [];

    const { data: caps } = await supabase
      .from("slide_captions")
      .select("*")
      .in("slide_id", slideIds)
      .order("line_index");

    setSlides(sl || []);
    setCaptions(caps || []);
  }

  /* SAVE CAPTION */
  async function saveCaption(id: string, newText: string) {
    const { error } = await supabase
      .from("slide_captions")
      .update({ caption: newText })
      .eq("id", id);

    if (error) return console.error(error);

    setCaptions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, caption: newText } : c))
    );

    showToast("Saved!");
  }

  /* REPLACE IMAGE */
  async function replaceImage(slide: Slide, file: File) {
    if (!file) return;

    const filePath = `slides/${Date.now()}-${file.name}`;

    const { error: uploadErr } = await supabase.storage
      .from("uploads")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadErr) return console.error(uploadErr);

    const publicUrl =
      supabase.storage.from("uploads").getPublicUrl(filePath).data.publicUrl;

    const { error: updateErr } = await supabase
      .from("lesson_slides")
      .update({ image_path: filePath })
      .eq("id", slide.id);

    if (updateErr) return console.error(updateErr);

    setSlides((prev) =>
      prev.map((s) => (s.id === slide.id ? { ...s, image_path: filePath } : s))
    );

    showToast("Image updated!");
  }

  /* -------------------- RENDER -------------------- */

  return (
    <LessonExplorerLayout
      sidebar={
        <LessonExplorer
          selectedLessonId={selectedLessonId}
          onSelect={(id: string) => {
            setSelectedLessonId(id);
            loadLessonData(id);
          }}
        />
      }
    >
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow">
          {toast}
        </div>
      )}

      {/* No lesson selected */}
      {!selectedLessonId ? (
        <p className="text-gray-500">Select a lesson to edit captions.</p>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Caption Editor</h2>

          {slides.length === 0 && (
            <p className="text-gray-500">This lesson has no slides yet.</p>
          )}

          {slides.map((slide) => {
            const related = captions.filter((c) => c.slide_id === slide.id);

            const thumbnail =
              slide.image_path &&
              supabase.storage.from("uploads").getPublicUrl(slide.image_path)
                .data.publicUrl;

            return (
              <div
                key={slide.id}
                className="p-4 border rounded bg-white mb-6 flex gap-4"
              >
                {/* LEFT - THUMBNAIL */}
                <div className="flex flex-col items-center w-[180px]">
                  <img
                    src={thumbnail || "/placeholder.png"}
                    className="rounded shadow"
                    style={{
                      width: "180px",
                      height: "150px",
                      objectFit: "cover",
                    }}
                  />

                  <label className="mt-2 text-sm bg-blue-600 text-white px-3 py-1 rounded cursor-pointer">
                    Replace Image
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        replaceImage(slide, e.target.files[0])
                      }
                    />
                  </label>
                </div>

                {/* RIGHT - CAPTIONS */}
                <div className="flex-1 space-y-3">
                  <h3 className="font-semibold text-[#001f40]">
                    Slide {slide.order_index ?? ""}
                  </h3>

                  {related.map((cap) => (
                    <CaptionEditorRow
                      key={cap.id}
                      cap={cap}
                      onSave={(newText) => saveCaption(cap.id, newText)}
                    />
                  ))}

                  {related.length === 0 && (
                    <p className="text-gray-500">(no captions)</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </LessonExplorerLayout>
  );
}
