// deno-lint-ignore-file no-sloppy-imports

"use client";

  import { useState, useEffect } from "react";
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
    const [selectedVoice, _setSelectedVoice] = useState("en-US-Neural2-D");

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

    const [showResetModal, setShowResetModal] = useState(false);
    const [resetting, setResetting] = useState(false);

    const [showGenerateAllModal, setShowGenerateAllModal] = useState(false);
    const [showResetLessonModal, setShowResetLessonModal] = useState(false);
    const [resetCaptionTarget, setResetCaptionTarget] = useState<Caption | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressTotal, setProgressTotal] = useState(0);
  

// whenever user clicks the PREVIEW tab, reload the lesson data
useEffect(() => {
  if (tab === "preview" && selectedLessonId) {
    loadLessonData(selectedLessonId);
  }
}, [tab, selectedLessonId]);


  /* Concurrency-Limited Parallel Generation Utility */
function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const queue = [...items];
  let active = 0;

  const results: R[] = [];

  return new Promise((resolve, reject) => {
    const startNext = () => {
      if (queue.length === 0 && active === 0) {
        resolve(results);
        return;
      }

      while (active < limit && queue.length > 0) {
        const item = queue.shift() as T;
        const index = results.length;
        results.push(undefined as unknown as R);

        active++;

        worker(item)
          .then((res: R) => {
            results[index] = res;
            active--;
            startNext();
          })
        .catch((err: unknown) => reject(err));
      }
    };

    startNext();
  });
}

// -------------------------------------------------------------
// HASH GENERATOR (used to detect unchanged captions)
// -------------------------------------------------------------
async function computeHash(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* -------------------------------------------------------------
   SINGLE-CAPTION AUDIO GENERATION
------------------------------------------------------------- */
async function generateAudio(caption: Caption) {
  try {
    if (!caption.caption?.trim()) return;

    const hash = await computeHash(caption.caption);

    const body = {
      captionId: caption.id,
      text: caption.caption,
      hash,
      voice: selectedVoice,
    };

    const { data, error } = await supabase.functions.invoke(
      "tts-generate-caption",
      { body }
    );

    if (error) {
      console.error("TTS error (single):", error);
      showToast("Audio generation failed");
      return;
    }

    console.log("Generated audio:", data);

    if (selectedLessonId) {
    // Allow Postgres + Storage to commit
    await new Promise((r) => setTimeout(r, 300));
    await loadLessonData(selectedLessonId);
  }

    showToast("Audio generated");
  } catch (err) {
    console.error("TTS error:", err);
    showToast("Audio generation failed");
  }
}

/* -------------------------------------------------------------
   BATCH AUDIO GENERATION
------------------------------------------------------------- */
async function generateAllAudio() {
  try {
    if (!captions.length) return;

    setIsGenerating(true);
    setProgress(0);
    setProgressTotal(captions.length);

    let completed = 0;

    await runWithConcurrencyLimit(
      captions,
      3,
      async (cap) => {
        if (!cap.caption?.trim()) {
          completed++;
          setProgress(completed);
          return null;
        }

        const hash =
          cap.forcedHash
            ? cap.forcedHash
            : await computeHash(cap.caption);

        const body = {
          captionId: cap.id,
          text: cap.caption,
          hash,
          voice: selectedVoice,
        };

        const { error } = await supabase.functions.invoke(
          "tts-generate-caption",
          { body }
        );

        completed++;
        setProgress(completed);

        if (error) {
          console.error("TTS error for caption", cap.id, error);
          return null;
        }

        if (cap.forcedHash) {
          setCaptions((prev) =>
            prev.map((c) =>
              c.id === cap.id ? { ...c, forcedHash: undefined } : c
            )
          );
        }

        return true;
      }
    );

    if (selectedLessonId) {
      await new Promise((r) => setTimeout(r, 300));
      await loadLessonData(selectedLessonId);
    }

    showToast("All audio generated");
  } catch (err) {
    console.error("Batch TTS error:", err);
    showToast("Batch audio failed");
  } finally {
    setIsGenerating(false);
  }
}



  /* -------------------------------------
                   TOAST 
  --------------------------------------*/
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
      if (!globalThis.confirm("Delete this slide?")) return;

      await supabase.from("slide_captions").delete().eq("slide_id", slide.id);
      await supabase.from("lesson_slides").delete().eq("id", slide.id);

      showToast("Slide deleted");
      if (selectedLessonId) loadLessonData(selectedLessonId);
    }

    async function addSlideAfter(slide: Slide) {
      if (!selectedLessonId) return;

      const newOrder = slide.order_index + 1;

      // Shift slides after this one
      const toShift = slides.filter((s) => s.order_index > slide.order_index);
      for (const s of toShift) {
        await supabase
          .from("lesson_slides")
          .update({ order_index: s.order_index + 1 })
          .eq("id", s.id);
      }

      // Insert new slide
      const { data: inserted } = await supabase
        .from("lesson_slides")
        .insert({
          lesson_id: selectedLessonId,
          image_path: null,
          order_index: newOrder,
        })
        .select()
        .single();

      if (!inserted) return;

      // Insert default caption for new slide
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

  // Shift slides after this one
  const toShift = slides.filter((s) => s.order_index > slide.order_index);
  for (const s of toShift) {
    await supabase
      .from("lesson_slides")
      .update({ order_index: s.order_index + 1 })
      .eq("id", s.id);
  }

  // Create new slide
  const { data: newSlide } = await supabase
    .from("lesson_slides")
    .insert({
      lesson_id: selectedLessonId,
      image_path: slide.image_path,
      order_index: newOrder,
    })
    .select()
    .single();

  if (!newSlide) return;

  // Fetch all captions belonging to the original slide
  const originalCaps = captions.filter((c) => c.slide_id === slide.id);

  // Duplicate captions
  for (const c of originalCaps) {
    await supabase.from("slide_captions").insert({
      slide_id: newSlide.id,
      caption: c.caption,
      seconds: c.seconds,
      line_index: c.line_index,
    });
  }

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

    function toggleSlideSelection(id: string | number) {
      const key = String(id);
      const next = new Set(selectedSlides);
      next.has(key) ? next.delete(key) : next.add(key);
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
    /* -------------------------------------------------------------
      RESET AUDIO FOR LESSON (DB ONLY)
    ------------------------------------------------------------- */
    async function resetLessonAudio() {
      if (!selectedLessonId) return;
      setResetting(true);

      // Clear URLs + Hashes for D/A/C voices
      await supabase
        .from("slide_captions")
          .update({
              published_audio_url_a: null,
              published_audio_url_d: null,
              published_audio_url_o: null,
              published_audio_url_j: null,
              caption_hash_a: null,
              caption_hash_d: null,
              caption_hash_o: null,
              caption_hash_j: null,
              seconds: null

            })
        .in(
          "slide_id",
          slides.map((s) => s.id)
        );

      setResetting(false);
      setShowResetModal(false);
      showToast("Audio reset for this lesson");
      loadLessonData(selectedLessonId);
    }

    /* -------------------------------------------------------------
      RESET AUDIO FOR CAPTION
    ------------------------------------------------------------- */

async function resetCaptionAudio(cap: Caption) {
  if (!cap) return;

  // 1. Generate a brand new hash
  const newHash = crypto.randomUUID();

  // 2. Reset all URLs, reset existing hashes, reset seconds
  await supabase
    .from("slide_captions")
    .update({
      published_audio_url_a: null,
      published_audio_url_d: null,
      published_audio_url_o: null,
      published_audio_url_j: null,

      caption_hash_a: null,
      caption_hash_d: null,
      caption_hash_o: null,
      caption_hash_j: null,

      seconds: null
    })
    .eq("id", cap.id);

  // 3. Update UI so that the NEXT Generate call uses NEW HASH
  setCaptions(prev =>
    prev.map(c =>
      c.id === cap.id
        ? { ...c, forcedHash: newHash } // <-- store the new hash in UI state
        : c
    )
  );

  showToast("Caption audio reset");

  // 4. Reload data if needed
  if (selectedLessonId) {
    await loadLessonData(selectedLessonId);
  }
}

    /* -------------------------------------------------------------
      COUNT TIME FOR LESSONS
    ------------------------------------------------------------- */

function formatSeconds(total: number) {
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = Math.floor(total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const totalLessonSeconds = captions.reduce(
  (sum, c) => sum + (c.seconds || 0),
  0
);

/* -------------------------------------------------------------
  SPINNER
 ------------------------------------------------------------- */

      function Spinner() {
        return (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        );
      }

/* -------------------------------------------------------------
  SAVE and DELETE SLIDES IN BULK
 ------------------------------------------------------------- */

      async function saveAllSlides() {
  if (!slides.length) return;

  // Save slides (image_path + order_index)
  for (const s of slides) {
    await supabase
      .from("lesson_slides")
      .update({
        image_path: s.image_path,
        order_index: s.order_index,
      })
      .eq("id", s.id);
  }

  // Save captions
  for (const c of captions) {
    await supabase
      .from("slide_captions")
      .update({
        caption: c.caption,
        seconds: c.seconds,
        line_index: c.line_index,
      })
      .eq("id", c.id);
  }

  showToast("All slides saved");
}

async function deleteSelectedSlides() {
  if (selectedSlides.size === 0) return;

  if (
    !globalThis.confirm(
      `Delete ${selectedSlides.size} selected slides?\nThis cannot be undone.`
    )
  )
    return;

  const ids = Array.from(selectedSlides);

  // 1. Delete slides (CASCADE deletes captions + audio)
  await supabase
    .from("lesson_slides")
    .delete()
    .in("id", ids);

  // 2. Reload remaining slides
  if (selectedLessonId) {
    const { data: remaining } = await supabase
      .from("lesson_slides")
      .select("*")
      .eq("lesson_id", Number(selectedLessonId))
      .order("order_index", { ascending: true });

    // 3. Reindex order_index cleanly
    if (remaining) {
      let index = 0;
      for (const s of remaining) {
        await supabase
          .from("lesson_slides")
          .update({ order_index: index++ })
          .eq("id", s.id);
      }
    }

    await loadLessonData(selectedLessonId);
  }

  setSelectedSlides(new Set());
  showToast("Selected slides deleted");
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
<h2 className="text-lg font-semibold items-center">**CURRENTLY DE-BUGGING THIS FEATURE**</h2>
            {/* NAV BUTTONS */}
            <div className="flex justify-center gap-6 mb-6 w-full">
              <button type="button"
                onClick={() => setSelectedSlideIndex(Math.max(selectedSlideIndex - 1, 0))}
                className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm font-semibold cursor-pointer"
              >
                Prev
              </button>

              <button type="button"
                onClick={() =>
                  setSelectedSlideIndex(
                    Math.min(selectedSlideIndex + 1, slides.length - 1)
                  )
                }
                className="px-6 py-2 rounded bg-[#ca5608] text-white text-sm font-semibold hover:bg-[#a14505] cursor-pointer"
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

                <button type="button"
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
        </div> 
      )}

  {/* BULK SECTION (Audio + Image + Lesson Total) */}
{tab === "captions" && captions.length > 0 && (
  <div className="mb-6 flex gap-4 items-stretch">

    {/* LEFT SIDE — LESSON TOTAL (fixed width, spans both rows) */}
    <div className="w-[180px] min-w-[180px] bg-white border border-gray-300 rounded-xl shadow-sm
                    flex flex-col items-center justify-center p-4">

      {/* TIME CIRCLE */}
      <div className="w-20 h-20 bg-[#ca5608] text-white rounded-full 
                      flex items-center justify-center text-xl font-semibold shadow">
        {formatSeconds(totalLessonSeconds)}
      </div>

      <div className="mt-3 text-[#001f40] text-sm font-medium text-center">
        Lesson Total
      </div>
    </div>

    {/* RIGHT SIDE — TWO STACKED BULK BARS */}
    <div className="flex-1 flex flex-col gap-4">

      {/* ──────────────────────────────
           BULK AUDIO EDITOR (unchanged)
         ────────────────────────────── */}
      <div
        className="
          p-4 bg-gray-50 border border-gray-300 rounded-xl shadow-sm
          flex items-center justify-between
        "
      >
        <span className="text-sm text-[#001f40] font-bold">Bulk Audio Editor</span>

        <div className="flex gap-3">
   
      {/* GENERATE ALL AUDIO */}
        <button
          type="button"
          disabled={isGenerating}
          onClick={() => setShowGenerateAllModal(true)}
          className={`
            relative px-3 py-1.5 text-white text-xs w-60 rounded cursor-pointer overflow-hidden
            ${
              isGenerating
                ? "bg-[#a14505] opacity-90 cursor-not-allowed"
                : "bg-[#ca5608] hover:bg-[#fc7212]"
            }
          `}
        >
          {isGenerating && (
            <div
              className="absolute inset-0 bg-[#fc7212] transition-all duration-300"
              style={{ width: `${(progress / progressTotal) * 100}%` }}
            />
          )}

          <span className="relative z-10 flex items-center justify-center gap-2">
            {isGenerating && (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-30"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-80"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l-3 3H4z"
                />
              </svg>
            )}

            {isGenerating
              ? `Generating ${progress}/${progressTotal}…`
              : "Generate Audio for All Lesson Captions"}
          </span>
        </button>


          {/* RESET LESSON AUDIO */}
          <button
            type="button"
            onClick={() => setShowResetLessonModal(true)}
            className="
              px-3 py-1.5 bg-red-600 text-white text-xs rounded cursor-pointer hover:bg-red-700
            "
          >
            Reset Lesson Audio
          </button>
        </div>
      </div>

      {/* ──────────────────────────────
           BULK IMAGE SELECTOR
         ────────────────────────────── */}
      <div className="p-4 bg-gray-50 border border-gray-300 rounded-xl shadow-sm 
                      flex items-center justify-between">

        <span className="text-sm text-[#001f40] font-bold">
          {selectedSlides.size > 0
            ? `${selectedSlides.size} selected`
            : "Bulk Slide Tools"}
        </span>


        <div className="flex gap-3">
         <button
            type="button"
            onClick={() =>
              setSelectedSlides(new Set(slides.map((s) => String(s.id))))
            }
            className="px-3 py-1.5 text-xs bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
          >
            Select All
          </button>

      {/* CLEAR SELECTION SLIDES */}
          <button
            type="button"
            onClick={() => setSelectedSlides(new Set())}
            className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded cursor-pointer hover:bg-gray-5  00"
          >
            Clear Selection
          </button>
     
      {/* DELETE ALL SLIDES */}
          <button
            type="button"
            onClick={deleteSelectedSlides}
            disabled={selectedSlides.size === 0}
            className={`
              px-3 py-1.5 text-xs rounded
              ${
                selectedSlides.size > 0
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }
            `}
          >
            Delete Selected Slides
          </button>
  
          <button
            type="button"
            onClick={() => selectedSlides.size > 0 && setMediaModalOpen(true)}
            disabled={selectedSlides.size === 0}
            className={`
              px-3 py-1.5 text-xs rounded
              ${
                selectedSlides.size > 0
                  ? "bg-[#001f40] text-white hover:bg-[#003266]"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }
            `}
          >
            Update Images
          </button>
      
             {/* SAVE ALL SLIDES */}
          <button
            type="button"
            onClick={saveAllSlides}
            className="px-3 py-1.5 text-xs bg-[#001f40] text-white rounded hover:bg-[#003266]"
          >
            Save All Slides
          </button> 
        </div>
      </div>
    </div>
  </div>
)}

{/* SLIDE LIST — ONLY IN CAPTIONS TAB */}
{tab === "captions" && slides.length > 0 && (
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

          <div className="flex gap-9 mt-3 items-center text-sm text-gray-700">
            <label className="flex items-center gap-1 cursor-pointer text-xs">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={isSelected}
                onChange={() => toggleSlideSelection(slide.id)}
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

          <button
            type="button"
            onClick={() => {
              setMediaTargetSlide(slide);
              setMediaModalOpen(true);
            }}
            className="mt-3 text-xs bg-[#001f40] text-white px-3 py-1.5 rounded hover:bg-[#003266] cursor-pointer"
          >
            Choose Media
          </button>

        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-1">
          <div className="bg-white border border-gray-300 rounded-xl shadow-sm p-4 hover:shadow-md transition">

            {cap && (
              <div className="flex flex-col gap-3">

                <CaptionEditorRow
                  cap={cap}
                  onSave={(txt) => saveCaption(cap.id, txt)}
                  onGenerateAudio={() => generateAudio(cap)}
                  onResetAudio={() => resetCaptionAudio(cap)}
                />

                  {/* AUDIO SECTION */}
                  {(() => {
                    let url = null;

                    if (selectedVoice === "en-US-Neural2-A") url = cap.published_audio_url_a;
                    else if (selectedVoice === "en-US-Neural2-D") url = cap.published_audio_url_d;
                    else if (selectedVoice === "en-US-Neural2-I") url = cap.published_audio_url_o;
                    else if (selectedVoice === "en-US-Neural2-J") url = cap.published_audio_url_j;

                    return url ? (
                      <div className="flex items-center gap-4 mt-3">

                        {/* TIME CIRCLE */}
                        <div className="
                          w-12 h-12 
                          bg-[#ca5608] 
                          text-white 
                          rounded-full 
                          flex items-center justify-center
                          text-sm font-semibold
                        ">
                          {cap.seconds ?? 0}s
                        </div>

                        {/* AUDIO PLAYER WITHOUT TIME DISPLAY */}
                        <audio
                          controls
                          src={url + `?t=${cap.seconds}` /* forces refresh safely */}
                          className="flex-1 h-10 rounded border-gray-300 bg-white"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2 italic">
                        No audio available for this caption.
                      </p>
                    );
                  })()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  })
)}

      
{/* RESET CAPTION AUDIO MODAL */}
{resetCaptionTarget && (
  <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
    <div className="bg-white rounded-xl p-6 shadow-lg w-[360px] animate-fadeIn">

      <h3 className="text-lg font-semibold text-[#001f40] mb-3">
        Reset Caption Audio?
      </h3>

      <p className="text-sm text-gray-700 mb-5">
        This will delete the generated audio for this caption.
        <br />
        <strong>This action cannot be undone.</strong>
      </p>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setResetCaptionTarget(null)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={async () => {
            await resetCaptionAudio(resetCaptionTarget);
            setResetCaptionTarget(null);
          }}
          className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 cursor-pointer"
        >
          Reset Audio
        </button>
      </div>

    </div>
  </div>
)}


      {/* RESET ALL LESSON AUDIO MODAL */}
      {showResetLessonModal && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-lg w-[360px] animate-fadeIn">

            <h3 className="text-lg font-semibold text-[#001f40] mb-3">
              Warning!
            </h3>

            <p className="text-sm text-gray-700 mb-5">
              This will permanently delete the caption audio for 
              <strong> ALL CAPTIONS in this lesson.</strong>
              <br /><br />
              This action <strong>cannot be undone</strong> and will affect the live course.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetLessonModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowResetLessonModal(false);
                  await resetLessonAudio();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 cursor-pointer"
              >
                Reset Audio
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GENERATE ALL LESSON AUDIO MODAL */}
      {showGenerateAllModal && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-lg w-[360px] animate-fadeIn">

            <h3 className="text-lg font-semibold text-[#001f40] mb-3">
              Warning!
            </h3>

            <p className="text-sm text-gray-700 mb-5">
              This will only update audio for the captions that currently 
              <strong> do not have audio generated.</strong>
              <br /><br />
              To reset audio in bulk for <strong>all captions</strong> in this lesson,  
              use the <strong>Reset All Lesson Audio</strong> button instead.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowGenerateAllModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowGenerateAllModal(false);
                  await generateAllAudio();
                }}
                className="px-4 py-2 bg-[#ca5608] text-white rounded text-sm hover:bg-[#a14505] cursor-pointer"
              >
                Generate
              </button>
            </div>

          </div>
        </div>
      )}


    {/* RESET AUDIO MODAL */}
    {showResetModal && (
      <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 shadow-lg w-[360px] animate-fadeIn">
          <h3 className="text-lg font-semibold text-[#001f40] mb-3">
            Reset Lesson Audio?
          </h3>

          <p className="text-sm text-gray-700 mb-5">
            This will remove <strong>all generated audio</strong> and hashes 
            for every caption in this lesson.  
            <br />
            <span className="font-semibold">
              This cannot be undone and will affect the live course.
            </span>
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={resetLessonAudio}
              disabled={resetting}
              className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              {resetting ? "Resetting..." : "Reset Audio"}
            </button>
          </div>
        </div>
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
          <button type="button"
            onClick={() => {
              setShowDeleteModal(false);
              setDeleteTarget(null);
            }}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm cursor-pointer"
          >
            Cancel
          </button>

          <button type="button"
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
            className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 cursor-pointer"
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
          Create slides with captions in bulk. Paste text where each line creates a separate slide with caption.<br />
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
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex justify-end mt-4">
          <button type="button"
            onClick={() => onImport(text)}
            className="px-5 py-2 bg-[#ca5608] text-white rounded font-semibold text-sm hover:bg-[#a14505] cursor-pointer"
          >
            Import Slides
          </button>
        </div>
      </div>
    );
  }

