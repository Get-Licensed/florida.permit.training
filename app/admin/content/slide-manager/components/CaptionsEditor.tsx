"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

import LessonExplorerLayout from "./LessonExplorerLayout";
import LessonExplorer from "./LessonExplorer";
import CaptionEditorRow from "./CaptionEditorRow";
import MediaLibraryModal from "./MediaLibraryModal";

import { Caption, Slide } from "./types";
import { Trash2, Copy, Plus } from "lucide-react";

const PLACEHOLDER =
  "https://yslhlomlsomknyxwtbtb.supabase.co/storage/v1/object/public/uploads/slides/Placeholder.png";

type TabOption = "captions" | "bulk" | "mapper";

export default function CaptionsEditor() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [animateToast, setAnimateToast] = useState(false);

  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaTargetSlide, setMediaTargetSlide] = useState<Slide | null>(null);

  const [applyingImage, setApplyingImage] = useState(false);

  const [selectedSlides, setSelectedSlides] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<TabOption>("captions");

  function showToast(msg: string) {
    setToast(msg);
    setAnimateToast(true);
    setTimeout(() => setAnimateToast(false), 1500);
    setTimeout(() => setToast(null), 2000);
  }

  async function loadLessonData(lessonId: string) {
    const { data: slideRows } = await supabase
      .from("lesson_slides")
      .select("*")
      .eq("lesson_id", Number(lessonId))
      .order("order_index", { ascending: true });

    const slideIds = slideRows?.map((s) => s.id) || [];

    const { data: capRows } = await supabase
      .from("slide_captions")
      .select("*")
      .in("slide_id", slideIds)
      .order("line_index", { ascending: true });

    setSlides(slideRows || []);
    setCaptions(capRows || []);
    setSelectedSlides(new Set());
  }

  async function saveCaption(id: string, newText: string) {
    await supabase.from("slide_captions").update({ caption: newText }).eq("id", id);

    setCaptions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, caption: newText } : c))
    );

    showToast("Saved!");
  }

  async function deleteSlide(slide: Slide) {
    if (!window.confirm("Delete this slide?")) return;

    await supabase.from("slide_captions").delete().eq("slide_id", slide.id);
    await supabase.from("lesson_slides").delete().eq("id", slide.id);

    showToast("Slide deleted");
    if (selectedLessonId) loadLessonData(selectedLessonId);
  }

  async function addSlideAfter(slide: Slide) {
    if (!selectedLessonId) return;

    const newOrder = slide.order_index + 1;

    const toShift = slides.filter((s) => s.order_index > slide.order_index);
    for (const s of toShift) {
      await supabase
        .from("lesson_slides")
        .update({ order_index: s.order_index + 1 })
        .eq("id", s.id);
    }

    const { data: inserted } = await supabase
      .from("lesson_slides")
      .insert({
        lesson_id: selectedLessonId,
        image_path: null,
        order_index: newOrder,
      })
      .select()
      .single();

    await supabase.from("slide_captions").insert({
      slide_id: inserted.id,
      caption: "",
      seconds: 5,
      line_index: 0,
    });

    showToast("Slide added");
    loadLessonData(selectedLessonId);
  }

  async function duplicateSlide(slide: Slide) {
    if (!selectedLessonId) return;

    const newOrder = slide.order_index + 1;

    const toShift = slides.filter((s) => s.order_index > slide.order_index);
    for (const s of toShift) {
      await supabase
        .from("lesson_slides")
        .update({ order_index: s.order_index + 1 })
        .eq("id", s.id);
    }

    const { data: newSlide } = await supabase
      .from("lesson_slides")
      .insert({
        lesson_id: selectedLessonId,
        image_path: slide.image_path,
        order_index: newOrder,
      })
      .select()
      .single();

    const originalCap = captions.find((c) => c.slide_id === slide.id);

    await supabase.from("slide_captions").insert({
      slide_id: newSlide.id,
      caption: originalCap?.caption || "",
      seconds: originalCap?.seconds || 5,
      line_index: 0,
    });

    showToast("Slide duplicated");
    loadLessonData(selectedLessonId);
  }

  // ---------------------------------------------------------------------------
  // APPLY SELECTED MEDIA (NOW WITH LOADING SPINNER INSIDE MODAL)
  // ---------------------------------------------------------------------------
  async function applySelectedMedia(path: string) {
    setApplyingImage(true);

    // MULTI-SELECT MODE
    if (selectedSlides.size > 0) {
      for (const slideId of selectedSlides) {
        await supabase
          .from("lesson_slides")
          .update({ image_path: path })
          .eq("id", slideId);
      }

      showToast("Updated selected slides");
    }

    // SINGLE MODE
    if (selectedSlides.size === 0 && mediaTargetSlide) {
      await supabase
        .from("lesson_slides")
        .update({ image_path: path })
        .eq("id", mediaTargetSlide.id);

      showToast("Image updated");
    }

    // reload and close
    if (selectedLessonId) await loadLessonData(selectedLessonId);

    setTimeout(() => {
      setApplyingImage(false);
      setMediaModalOpen(false);
    }, 600);
  }

  function toggleSlideSelection(id: string) {
    const newSet = new Set(selectedSlides);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSlides(newSet);
  }

  function selectAllSlides() {
    setSelectedSlides(new Set(slides.map((s) => String(s.id))));
  }

  function clearSelection() {
    setSelectedSlides(new Set());
  }

  async function handleBulkImport(text: string) {
    if (!selectedLessonId) return;

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length);

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

    showToast("Bulk import added");
    loadLessonData(selectedLessonId);
  }

  return (
    <LessonExplorerLayout
      sidebar={
        <LessonExplorer
          selectedLessonId={selectedLessonId}
          onSelect={(id) => {
            setSelectedLessonId(id);
            loadLessonData(id);
          }}
        />
      }
    >
      {/* Toast */}
      {toast && (
        <div
          className={`
            fixed bottom-6 right-6 z-[99999]
            bg-green-600 text-white px-4 py-2 rounded shadow
            transition-all duration-300
            ${animateToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
          `}
        >
          {toast}
        </div>
      )}

      {/* Media Modal */}
      <MediaLibraryModal
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={applySelectedMedia}
        applying={applyingImage}   // NEW SPINNER FLAG
      />

      {/* Tabs */}
      <div className="flex gap-6 border-b mb-6 pb-2 text-sm">
        <button
          className={`${
            tab === "captions" ? "text-[#ca5608] border-b-2 border-[#ca5608]" : "text-gray-500"
          } pb-1`}
          onClick={() => setTab("captions")}
        >
          Captions Editor
        </button>
        <button
          className={`${
            tab === "bulk" ? "text-[#ca5608] border-b-2 border-[#ca5608]" : "text-gray-500"
          } pb-1`}
          onClick={() => setTab("bulk")}
        >
          Bulk Caption Import
        </button>
        <button
          className={`${
            tab === "mapper" ? "text-[#ca5608] border-b-2 border-[#ca5608]" : "text-gray-500"
          } pb-1`}
          onClick={() => setTab("mapper")}
        >
          Image + Caption Mapper
        </button>
      </div>

      {/* CAPTIONS EDITOR MODE */}
      {tab === "captions" && slides.length > 0 && (
        <div className="flex items-center gap-4 mb-6 bg-[#f9f9f9] px-4 py-3 border rounded">
          <button
            onClick={() => setMediaModalOpen(true)}
            className="px-4 py-2 bg-[#001f40] text-white rounded hover:bg-[#003266]"
          >
            Apply Image to Selected Slides
          </button>

          <button
            onClick={selectAllSlides}
            className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Select All
          </button>

          <button
            onClick={clearSelection}
            className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Clear
          </button>

          <span className="text-xs text-gray-600">{selectedSlides.size} selected</span>
        </div>
      )}

      {/* MAIN CONTENT */}
      {tab === "bulk" && <BulkImportPanel onImport={handleBulkImport} />}

      {tab === "mapper" && <div className="p-6 text-gray-500">Mapper panel coming soon…</div>}

      {tab === "captions" && (
        <div>
          {slides.map((slide) => {
            const cap = captions.find((c) => c.slide_id === slide.id);
            const isSelected = selectedSlides.has(String(slide.id));

            const { data } = slide.image_path
              ? supabase.storage.from("uploads").getPublicUrl(slide.image_path)
              : { data: { publicUrl: PLACEHOLDER } };

            const thumbnail = slide.image_path ? data.publicUrl : PLACEHOLDER;

            return (
              <div
                key={slide.id}
                className={`relative p-4 border rounded bg-white mb-6 flex gap-4 ${
                  isSelected ? "outline outline-2 outline-[#ca5608]" : ""
                }`}
              >
                {/* ACTION BAR */}
                <div className="absolute top-2 right-2 flex gap-4 items-center">
                  <Plus
                    size={20}
                    className="text-[#ca5608] cursor-pointer hover:text-[#a14505]"
                    onClick={() => addSlideAfter(slide)}
                  />

                  <Copy
                    size={18}
                    className="text-[#001f40] cursor-pointer hover:text-[#003266]"
                    onClick={() => duplicateSlide(slide)}
                  />

                  <Trash2
                    size={18}
                    className="text-red-500 cursor-pointer hover:text-red-700"
                    onClick={() => deleteSlide(slide)}
                  />

                  <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer"
                      checked={isSelected}
                      onChange={() => toggleSlideSelection(String(slide.id))}
                    />
                    Select
                  </label>
                </div>

                {/* IMAGE */}
                <div className="flex flex-col items-center w-[260px]">
                  <div className="w-full aspect-[16/9] bg-gray-100 rounded overflow-hidden">
                    <img
                      src={thumbnail}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setMediaTargetSlide(slide);
                      setMediaModalOpen(true);
                    }}
                    className="mt-2 text-sm bg-[#001f40] text-white px-3 py-1 rounded hover:bg-[#003266]"
                  >
                    Choose Media
                  </button>
                </div>

                {/* CAPTION */}
                <div className="flex-1">
                  <h3 className="font-semibold text-[#001f40] mb-2">
                    Slide {slide.order_index}
                  </h3>

                  {cap && (
                    <CaptionEditorRow
                      cap={cap}
                      onSave={(txt) => saveCaption(cap.id, txt)}
                    />
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

// BULK IMPORT PANEL
function BulkImportPanel({ onImport }: { onImport: (text: string) => void }) {
  const [text, setText] = useState("");

  return (
    <div className="p-4 bg-white border rounded shadow-sm">
      <h3 className="text-lg font-semibold text-[#001f40] mb-3">Bulk Caption Import</h3>

      <p className="text-sm text-gray-600 mb-3">
        Select a Module and Lesson. <br />
        Paste multiple lines — each line becomes a slide.
      </p>

      <textarea
        rows={12}
        className="w-full border p-3 rounded"
        placeholder={`Line 1...\nLine 2...\nLine 3...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex justify-end mt-4">
        <button
          onClick={() => onImport(text)}
          className="px-4 py-2 bg-[#ca5608] text-white rounded hover:bg-[#a14505] active:scale-[0.97]"
        >
          Import Slides
        </button>
      </div>
    </div>
  );
}
