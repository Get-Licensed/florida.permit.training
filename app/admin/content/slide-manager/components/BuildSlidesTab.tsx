"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";

import LessonExplorerLayout from "./LessonExplorerLayout";
import LessonExplorer from "./LessonExplorer";

// ---------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------
const PLACEHOLDER =
  "https://yslhlomlsomknyxwtbtb.supabase.co/storage/v1/object/public/uploads/slides/Placeholder.png";

// ---------------------------------------------------------
// BuildSlidesTab Component
// ---------------------------------------------------------
export default function BuildSlidesTab() {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [slides, setSlides] = useState<any[]>([]);
  const [captions, setCaptions] = useState<any[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Bulk import text
  const [bulkText, setBulkText] = useState("");

  // ---------------------------------------------------------
  // Toast State (MATCHING CaptionsEditor)
  // ---------------------------------------------------------
  const [toast, setToast] = useState<string | null>(null);
  const [animateToast, setAnimateToast] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setAnimateToast(true);

    setTimeout(() => setAnimateToast(false), 1500);
    setTimeout(() => setToast(null), 2000);
  }

  const currentSlide = slides[selectedSlideIndex] || null;

  // ---------------------------------------------------------
  // LOAD SLIDES
  // ---------------------------------------------------------
  async function loadSlides() {
    if (!selectedLessonId) return;
    setLoading(true);

    const { data: slideRows } = await supabase
      .from("lesson_slides")
      .select("*")
      .eq("lesson_id", selectedLessonId)
      .order("order_index", { ascending: true });

    setSlides(slideRows || []);
    setSelectedSlideIndex(0);

    await loadCaptions(slideRows || []);
    setLoading(false);
  }

  // ---------------------------------------------------------
  // LOAD CAPTIONS
  // ---------------------------------------------------------
  async function loadCaptions(slideRows: any[]) {
    const slideIds = slideRows.map((s) => s.id);

    if (slideIds.length === 0) {
      setCaptions([]);
      return;
    }

    const { data: capRows } = await supabase
      .from("slide_captions")
      .select("*")
      .in("slide_id", slideIds)
      .order("line_index", { ascending: true });

    setCaptions(capRows || []);
  }

  useEffect(() => {
    if (selectedLessonId) loadSlides();
  }, [selectedLessonId]);

  // ---------------------------------------------------------
  // Resolve Supabase Storage URL
  // ---------------------------------------------------------
  function resolveImage(path: string | null) {
    if (!path) return null;

    const { data } = supabase.storage.from("uploads").getPublicUrl(path);
    return data?.publicUrl ?? null;
  }

  // ---------------------------------------------------------
  // BULK IMPORT (APPEND)
  // ---------------------------------------------------------
  async function handleBulkImport(text: string) {
    if (!selectedLessonId) return;

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (!lines.length) {
      showToast("Nothing to import");
      return;
    }

    const { data: existingSlides } = await supabase
      .from("lesson_slides")
      .select("order_index")
      .eq("lesson_id", selectedLessonId)
      .order("order_index", { ascending: true });

    let lastIndex =
      existingSlides?.length ? existingSlides[existingSlides.length - 1].order_index : 0;

    let counter = lastIndex;

    for (const line of lines) {
      counter++;

      const { data: slideRow } = await supabase
        .from("lesson_slides")
        .insert({
          lesson_id: selectedLessonId,
          image_path: null,
          order_index: counter,
        })
        .select()
        .single();

      if (!slideRow) continue;

      await supabase.from("slide_captions").insert({
        slide_id: slideRow.id,
        caption: line,
        seconds: 5,
        line_index: 0,
      });
    }

    showToast("Slides added");
    setBulkText("");
    loadSlides();
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return (
    <LessonExplorerLayout
      sidebar={
        <LessonExplorer
          selectedLessonId={selectedLessonId}
          onSelect={(id: string) => setSelectedLessonId(id)}
        />
      }
    >
      {/* Toast Notification (MATCHING CaptionsEditor) */}
      {toast && (
        <div
          className={`
            fixed bottom-6 right-6 
            z-[99999] 
            bg-green-600 text-white 
            px-4 py-2 rounded shadow 
            transition-all duration-300 
            ${animateToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
          `}
        >
          {toast}
        </div>
      )}

      <div className="p-6 w-full">
        {currentSlide && (
          <div className="w-full flex flex-col items-center">

            {/* IMAGE PREVIEW */}
            {(() => {
              const resolved =
                resolveImage(currentSlide.image_path) ||
                supabase.storage
                  .from("uploads")
                  .getPublicUrl("slides/Placeholder.png").data.publicUrl;

              return (
                <img
                  src={resolved}
                  alt="Slide"
                  className="w-[80%] max-w-4xl h-auto object-contain rounded mb-6 shadow"
                />
              );
            })()}

            {/* CAPTION PREVIEW */}
            <p className="text-xl text-[#001f40] mb-6 whitespace-pre-wrap text-center leading-relaxed px-6">
              {captions.find((c) => c.slide_id === currentSlide.id)?.caption || ""}
            </p>

            {/* NAVIGATION BUTTONS */}
            <div className="flex gap-6 mt-4">
              <button
                onClick={() =>
                  setSelectedSlideIndex(Math.max(selectedSlideIndex - 1, 0))
                }
                className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300 text-lg cursor-pointer"
              >
                Prev
              </button>

              <button
                onClick={() =>
                  setSelectedSlideIndex(
                    Math.min(selectedSlideIndex + 1, slides.length - 1)
                  )
                }
                className="px-6 py-2 rounded bg-[#ca5608] text-white text-lg cursor-pointer hover:bg-[#a14505]"
              >
                Next
              </button>
            </div>

            {/* BULK CAPTION IMPORT */}
            <div className="mt-10 w-full max-w-2xl bg-white border rounded p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-[#001f40] mb-3">
                Bulk Caption Import
              </h3>

              <textarea
                rows={10}
                placeholder={`Line 1\nLine 2\nLine 3`}
                className="w-full border p-3 rounded"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => handleBulkImport(bulkText)}
                  className="relative z-10 px-4 py-2 bg-[#ca5608] text-white rounded cursor-pointer hover:bg-[#a14505] transition active:scale-[0.97]"
                >
                  Import Captions
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </LessonExplorerLayout>
  );
}
