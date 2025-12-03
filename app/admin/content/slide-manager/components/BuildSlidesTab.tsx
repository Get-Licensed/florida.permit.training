"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";

import LessonExplorerLayout from "./LessonExplorerLayout";
import LessonExplorer from "./LessonExplorer";

/* ---------------------------------------------------------
   CONSTANTS
--------------------------------------------------------- */
const PLACEHOLDER =
  "slides/Placeholder.png";

/* ---------------------------------------------------------
   BuildSlidesTab Component
--------------------------------------------------------- */
export default function BuildSlidesTab() {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [slides, setSlides] = useState<any[]>([]);
  const [captions, setCaptions] = useState<any[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const [bulkText, setBulkText] = useState("");

  /* ---------------------------------------------------------
     Toast (same as CaptionsEditor)
  --------------------------------------------------------- */
  const [toast, setToast] = useState<string | null>(null);
  const [animateToast, setAnimateToast] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setAnimateToast(true);

    setTimeout(() => setAnimateToast(false), 1500);
    setTimeout(() => setToast(null), 2000);
  }

  const currentSlide = slides[selectedSlideIndex] || null;

  /* ---------------------------------------------------------
     Load Slides 
  --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     Load Captions
  --------------------------------------------------------- */
  async function loadCaptions(slideRows: any[]) {
    const ids = slideRows.map((s) => s.id);
    if (!ids.length) {
      setCaptions([]);
      return;
    }

    const { data: capRows } = await supabase
      .from("slide_captions")
      .select("*")
      .in("slide_id", ids)
      .order("line_index", { ascending: true });

    setCaptions(capRows || []);
  }

  useEffect(() => {
    if (selectedLessonId) loadSlides();
  }, [selectedLessonId]);

  /* ---------------------------------------------------------
     Resolve Supabase File
  --------------------------------------------------------- */
  function resolveImage(path: string | null) {
    if (!path) return null;
    return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
  }

  /* ---------------------------------------------------------
     BULK IMPORT
  --------------------------------------------------------- */
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

    let index = lastIndex;

    for (const line of lines) {
      index++;

      const { data: slideRow } = await supabase
        .from("lesson_slides")
        .insert({
          lesson_id: selectedLessonId,
          image_path: null,
          order_index: index,
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

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    <LessonExplorerLayout
      sidebar={
        <LessonExplorer
          selectedLessonId={selectedLessonId}
          onSelect={(id: string) => setSelectedLessonId(id)}
        />
      }
    >
      {/* Toast */}
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

        {!currentSlide && (
          <p className="text-gray-500 text-sm">Select a lesson to begin.</p>
        )}

        {currentSlide && (
          <div className="w-full flex flex-col items-center">

            {/* NAV BUTTONS */}
            <div className="flex justify-center gap-6 mb-6 w-full">
              <button
                onClick={() =>
                  setSelectedSlideIndex(Math.max(selectedSlideIndex - 1, 0))
                }
                className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm font-semibold"
              >
                Prev
              </button>

              <button
                onClick={() =>
                  setSelectedSlideIndex(
                    Math.min(selectedSlideIndex + 1, slides.length - 1)
                  )
                }
                className="px-6 py-2 rounded bg-[#ca5608] text-white text-sm font-semibold hover:bg-[#a14505]"
              >
                Next
              </button>
            </div>

            {/* IMAGE PREVIEW */}
            <div className="w-full flex justify-center mb-6">
              <img
                src={
                  resolveImage(currentSlide.image_path) ||
                  supabase.storage
                    .from("uploads")
                    .getPublicUrl(PLACEHOLDER).data.publicUrl
                }
                className="w-[80%] max-w-4xl h-auto object-contain rounded shadow"
              />
            </div>

            {/* CAPTION */}
            <p className="text-xl text-[#001f40] font-medium mb-8 text-center whitespace-pre-wrap leading-relaxed px-6">
              {captions.find((c) => c.slide_id === currentSlide.id)?.caption || ""}
            </p>

            {/* BULK IMPORT CARD */}
            <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-lg font-bold text-[#001f40] mb-2">
                Bulk Caption Import
              </h3>

              <p className="text-sm text-gray-600 mb-3">
                Paste multiple lines to create slides automatically.
                <br />
                <span className="italic">Rule: Each line = one new slide</span>
              </p>

              <textarea
                rows={10}
                className="w-full border p-3 rounded text-sm"
                placeholder={`Line 1\nLine 2\nLine 3`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => handleBulkImport(bulkText)}
                  className="px-5 py-2 text-sm font-semibold bg-[#ca5608] text-white rounded hover:bg-[#a14505] transition"
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
