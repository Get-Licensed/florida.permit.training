"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";

import LessonExplorerLayout from "./LessonExplorerLayout";
import LessonExplorer from "./LessonExplorer";
import CaptionEditorRow from "./CaptionEditorRow";
import MediaLibraryModal from "./MediaLibraryModal";

import { Caption, Slide } from "./types";
import { Trash2, Copy, Plus } from "lucide-react";

const PLACEHOLDER =
  "slides/Placeholder.png";

type TabOption = "preview" | "captions" | "bulk";

export default function CaptionsEditor({ activeTab }: { activeTab: TabOption }) {
  const tab = activeTab;

  /* STATE */
  const [slides, setSlides] = useState<Slide[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);

  const [toast, setToast] = useState<string | null>(null);
  const [animateToast, setAnimateToast] = useState(false);

  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaTargetSlide, setMediaTargetSlide] = useState<Slide | null>(null);
  const [applyingImage, setApplyingImage] = useState(false);

  const [selectedSlides, setSelectedSlides] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Slide | null>(null);
  const [deleting, setDeleting] = useState(false);


  /* TOAST */
  function showToast(msg: string) {
    setToast(msg);
    setAnimateToast(true);
    setTimeout(() => setAnimateToast(false), 1500);
    setTimeout(() => setToast(null), 2000);
  }

  /* LOAD DATA */
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
    setSelectedSlideIndex(0);
  }

  /* CRUD FUNCTIONS */
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

  async function applySelectedMedia(path: string) {
    setApplyingImage(true);

    if (selectedSlides.size > 0) {
      for (const id of selectedSlides) {
        await supabase.from("lesson_slides").update({ image_path: path }).eq("id", id);
      }
      showToast("Updated selected slides");
    } else if (mediaTargetSlide) {
      await supabase
        .from("lesson_slides")
        .update({ image_path: path })
        .eq("id", mediaTargetSlide.id);

      showToast("Image updated");
    }

    if (selectedLessonId) await loadLessonData(selectedLessonId);

    setTimeout(() => {
      setApplyingImage(false);
      setMediaModalOpen(false);
    }, 600);
  }

  function toggleSlideSelection(id: string) {
    const next = new Set(selectedSlides);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedSlides(next);
  }

  /* BULK */
  async function handleBulkImport(text: string) {
    if (!selectedLessonId) return;

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (!lines.length) {
      showToast("Nothing to import");
      return;
    }

    const { data: existingSlides } = await supabase
      .from("lesson_slides")
      .select("order_index")
      .eq("lesson_id", selectedLessonId)
      .order("order_index", { ascending: true });

    let counter =
      existingSlides?.length ? existingSlides[existingSlides.length - 1].order_index : 0;

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

  const currentSlide = slides[selectedSlideIndex] || null;

  function resolveImage(path: string | null) {
    if (!path) return PLACEHOLDER;
    return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
  }

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
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
      {/* TOAST */}
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

      {/* MEDIA MODAL */}
      <MediaLibraryModal
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={applySelectedMedia}
        applying={applyingImage}
      />

      {/* PREVIEW MODE */}
      {tab === "preview" && selectedLessonId && currentSlide && (
        <div className="w-full flex flex-col items-center">

          {/* NAV BUTTONS */}
          <div className="flex justify-center gap-6 mb-6 w-full">
            <button
              onClick={() => setSelectedSlideIndex(Math.max(selectedSlideIndex - 1, 0))}
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

          {/* IMAGE */}
          <img
            src={resolveImage(currentSlide.image_path)}
            alt="Slide"
            className="w-[80%] max-w-4xl h-auto object-contain rounded shadow mb-6"
          />

          {/* CAPTION */}
          <p className="text-xl text-[#001f40] font-medium whitespace-pre-wrap text-center px-6">
            {captions.find((c) => c.slide_id === currentSlide.id)?.caption || ""}
          </p>
        </div>
      )}

      {/* BULK MODE */}
      {tab === "bulk" && <BulkImportPanel onImport={handleBulkImport} />}

      {/* CAPTIONS MODE */}
      {tab === "captions" && (
        <div className="mt-2">
          {/* EMPTY LESSON */}
          {slides.length === 0 && selectedLessonId && (
            <div className="p-8 bg-white border rounded-lg shadow-sm text-center">
              <p className="text-gray-600 mb-4">This lesson has no slides yet.</p>

              <button
                className="px-4 py-2 bg-[#001f40] text-white rounded hover:bg-[#003266]"
                onClick={async () => {
                  const { data: newSlide } = await supabase
                    .from("lesson_slides")
                    .insert({
                      lesson_id: selectedLessonId,
                      image_path: null,
                      order_index: 0,
                    })
                    .select()
                    .single();

                  await supabase.from("slide_captions").insert({
                    slide_id: newSlide.id,
                    caption: "",
                    seconds: 5,
                    line_index: 0,
                  });

                  showToast("First slide created");
                  loadLessonData(selectedLessonId);
                }}
              >
                + Add First Slide
              </button>
            </div>
          )}


{/* ALWAYS VISIBLE BULK BAR */}
<div className="mb-4 p-4 bg-gray-50 border border-gray-300 rounded-xl shadow-sm flex items-center justify-between">

  {/* LEFT SIDE STATUS */}
  <span className="text-sm text-[#001f40] font-medium">
    {selectedSlides.size > 0
      ? `${selectedSlides.size} selected`
      : "Bulk Image Selector"}
  </span>

  {/* RIGHT SIDE ACTIONS */}
  <div className="flex gap-3">

    {/* Select All */}
    <button
      onClick={() => setSelectedSlides(new Set(slides.map((s) => String(s.id))))}
      className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
    >
      Select All
    </button>

    {/* Clear Selection */}
    <button
      onClick={() => setSelectedSlides(new Set())}
      className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
    >
      Clear
    </button>

    {/* Change Image */}
    <button
      onClick={() => selectedSlides.size > 0 && setMediaModalOpen(true)}
      disabled={selectedSlides.size === 0}
      className={`
        px-3 py-1.5 text-sm rounded
        ${selectedSlides.size > 0
          ? "bg-[#001f40] text-white hover:bg-[#003266]"
          : "bg-gray-300 text-gray-500 cursor-not-allowed"}
      `}
    >
      Change Image
    </button>

  </div>
</div>


{/* SLIDE LIST */}
{slides.length > 0 &&
  slides.map((slide) => {
    const cap = captions.find((c) => c.slide_id === slide.id);
    const isSelected = selectedSlides.has(String(slide.id));
    const imageUrl = resolveImage(slide.image_path);

    return (
      <div
        key={slide.id}
        className={`
          relative
          p-4
          bg-white
          border border-gray-300
          rounded-xl
          shadow-sm
          hover:shadow-md
          hover:bg-gray-50
          transition
          mb-5
          flex gap-5
          items-start
          ${isSelected ? "outline outline-2 outline-[#ca5608]" : ""}
        `}
      >
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col items-center w-[220px]">

          <div className="w-full aspect-[16/9] bg-gray-100 rounded overflow-hidden shadow-sm">
            <img src={imageUrl} className="w-full h-full object-cover" />
          </div>

          <button
            onClick={() => {
              setMediaTargetSlide(slide);
              setMediaModalOpen(true);
            }}
            className="mt-3 text-sm bg-[#001f40] text-white px-3 py-1.5 rounded hover:bg-[#003266]"
          >
            Choose Media
          </button>

          <div className="flex gap-9 mt-3 items-center text-sm text-gray-700">
              <label className="flex items-center gap-1 cursor-pointer text-xs">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={isSelected}
                onChange={() => toggleSlideSelection(String(slide.id))}
              />
              Select
            </label>


            <Plus
              size={18}
              className="text-[#ca5608] cursor-pointer hover:text-[#a14505]"
              onClick={() => addSlideAfter(slide)}
            />

            <Copy
              size={16}
              className="text-[#001f40] cursor-pointer hover:text-[#003266]"
              onClick={() => duplicateSlide(slide)}
            />

            <Trash2
              size={16}
              className="text-red-500 cursor-pointer hover:text-red-700"
              onClick={() => {
                setDeleteTarget(slide);
                setShowDeleteModal(true);
              }}
            />

          </div>
        </div>
 
        {/* RIGHT COLUMN */}

        <div className="flex-1">
  
          <div
            className="
              bg-white
              border border-gray-300
              rounded-xl
              shadow-sm
              p-4
              hover:shadow-md
              transition
            "
          >
            {cap && (
              <CaptionEditorRow
                cap={cap}
                onSave={(txt) => saveCaption(cap.id, txt)}
              />
            )}
          </div>
        </div>

      </div>
    );
  })
}
        </div>
      )}


{/* DELETE CONFIRMATION MODAL */}
{showDeleteModal && deleteTarget && (
  <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
    <div className="bg-white rounded-xl p-6 shadow-lg w-[360px] animate-fadeIn">

      <h3 className="text-lg font-semibold text-[#001f40] mb-3">
        Delete Slide?
      </h3>

      <p className="text-sm text-gray-700 mb-5">
        This will permanently delete the slide and its caption. 
        <span className="font-semibold"> This action cannot be undone.</span>
      </p>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            setShowDeleteModal(false);
            setDeleteTarget(null);
          }}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          Cancel
        </button>

        <button
          onClick={async () => {
            if (!deleteTarget) return;
            setDeleting(true);

            await supabase.from("slide_captions").delete().eq("slide_id", deleteTarget.id);
            await supabase.from("lesson_slides").delete().eq("id", deleteTarget.id);

            setDeleting(false);
            setShowDeleteModal(false);
            showToast("Slide deleted");

            if (selectedLessonId) loadLessonData(selectedLessonId);
          }}
          disabled={deleting}
          className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

    </div>
  </div>
)}




    </LessonExplorerLayout>
  );
}

/* ---------------------------------------------------------
   BULK IMPORT PANEL
--------------------------------------------------------- */
function BulkImportPanel({ onImport }: { onImport: (text: string) => void }) {
  const [text, setText] = useState("");

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm max-w-2xl">
      <h3 className="text-lg font-bold text-[#001f40] mb-3">
        Bulk Caption Import
      </h3>

      <p className="text-sm text-gray-600 mb-3">
        Paste multiple lines to create slides.<br />
        Each line becomes a separate slide.<br />
        <i>Rule: Line break = new slide</i>
      </p>

      <textarea
        rows={12}
        className="
          w-full
          p-3
          border border-gray-300
          rounded-lg
          bg-white
          shadow-sm
          focus:outline-none
          focus:ring-2
          focus:ring-[#ca5608]
        "
        placeholder={`Line 1...\nLine 2...\nLine 3...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex justify-end mt-4">
        <button
          onClick={() => onImport(text)}
          className="px-5 py-2 bg-[#ca5608] text-white rounded font-semibold text-sm hover:bg-[#a14505]"
        >
          Import Slides
        </button>
      </div>
    </div>
  );
}

