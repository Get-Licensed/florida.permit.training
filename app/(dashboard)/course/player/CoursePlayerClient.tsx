"use client";

import { useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { useEffect, useState } from "react";

/* -------------------------------------------------------
   Types
------------------------------------------------------- */
type SlideRow = {
  id: string;
  lesson_id: number;
  image_path: string | null;
  order_index: number;
  caption_ids: string[];
};

type CaptionRow = {
  id: string;
  slide_id: string;
  caption: string;
  seconds: number;
  line_index: number;
};

type LessonRow = {
  id: number;
  module_id: string;
  title: string;
  sort_order: number;
  duration: number;
  thumbnail: string | null;
};

/* -------------------------------------------------------
   Resolve storage URL
------------------------------------------------------- */
function resolveImage(path: string | null) {
  if (!path) return null;
  return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
}

/* -------------------------------------------------------
   MAIN CLIENT COMPONENT
------------------------------------------------------- */
export default function CoursePlayerClient() {
  const searchParams = useSearchParams();
  const moduleId = searchParams.get("module_id");

  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<LessonRow | null>(null);
  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [captions, setCaptions] = useState<Record<string, CaptionRow[]>>({});
  const [idx, setIdx] = useState(0);

  const [volume, setVolume] = useState(0.8);
  const [voice, setVoice] = useState("Jose");
  const [voiceOpen, setVoiceOpen] = useState(false);

  /* -------------------------------------------------------
     LOAD FIRST LESSON
  ------------------------------------------------------- */
  async function loadLessonForModule() {
    if (!moduleId) return;

    setLoading(true);

    const { data: lessonRows } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("sort_order", { ascending: true });

    if (!lessonRows?.length) {
      setLoading(false);
      return;
    }

    const firstLesson = lessonRows[0] as LessonRow;
    setLesson(firstLesson);

    const { data: slideRows } = await supabase
      .from("lesson_slides")
      .select("*")
      .eq("lesson_id", firstLesson.id)
      .order("order_index", { ascending: true });

    setSlides(slideRows || []);
    await loadCaptionGroups(slideRows || []);

    setIdx(0);
    setLoading(false);
  }

  /* -------------------------------------------------------
     LOAD CAPTIONS
  ------------------------------------------------------- */
  async function loadCaptionGroups(slideRows: SlideRow[]) {
    if (!slideRows.length) {
      setCaptions({});
      return;
    }

    const slideIds = slideRows.map((s) => s.id);

    const { data: capRows } = await supabase
      .from("slide_captions")
      .select("*")
      .in("slide_id", slideIds)
      .order("line_index", { ascending: true });

    const group: Record<string, CaptionRow[]> = {};
    slideRows.forEach((s) => {
      group[s.id] = capRows?.filter((c) => c.slide_id === s.id) || [];
    });

    setCaptions(group);
  }

  useEffect(() => {
    loadLessonForModule();
  }, [moduleId]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading…
      </div>
    );

  if (!lesson)
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        No lesson found.
      </div>
    );

  if (!slides.length)
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        No slides found.
      </div>
    );

  const current = slides[idx];
  const img = resolveImage(current.image_path);
  const capGroup = captions[current.id] || [];
  const totalSlides = slides.length;

  const onPrev = () => setIdx((i) => Math.max(0, i - 1));
  const onNext = () => setIdx((i) => Math.min(totalSlides - 1, i + 1));

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */
  return (
    <div className="relative min-h-screen bg-white flex flex-col">

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 h-2 bg-gray-200">
        <div
          className="h-full bg-[#ca5608] transition-all"
          style={{ width: `${((idx + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* Narration UI */}
      <div
        className="absolute top-4 right-4 z-50 rounded-xl p-3 border border-[#001f40]/40 shadow-xl backdrop-blur-md"
        style={{ backgroundColor: "rgba(0, 31, 64, 0.59)" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[11px] font-semibold text-white/90">VOL</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="accent-[#ca5608] w-24 h-1 rounded cursor-pointer"
          />
        </div>

        <button
          onClick={() => setVoiceOpen((v) => !v)}
          className="w-full bg-[#ca5608] text-white text-[11px] font-semibold py-1.5 rounded-lg hover:bg-[#b24b06]"
        >
          Voice: {voice}
        </button>

        {voiceOpen && (
          <div className="mt-2 bg-[#001f40] border border-[#ca5608]/40 rounded-lg shadow-lg overflow-hidden">
            {["John", "Paul", "Ringo", "George"].map((v) => (
              <div
                key={v}
                onClick={() => {
                  setVoice(v);
                  setVoiceOpen(false);
                }}
                className="px-3 py-2 text-white text-sm hover:bg-[#ca5608] cursor-pointer"
              >
                {v}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Image */}
      <div className="flex-1 flex flex-col items-center justify-center pb-[140px] w-full">
        {img ? (
          <img
            draggable={false}
            src={img}
            className="w-[100vw] h-auto object-contain select-none"
          />
        ) : (
          <div className="text-gray-400 italic">No image</div>
        )}
      </div>

      {/* Footer / Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg h-[120px] flex items-center justify-between px-8">
        <button
          onClick={onPrev}
          disabled={idx === 0}
          className={`p-3 ${idx === 0 ? "opacity-30" : "hover:opacity-80"}`}
        >
          <img src="/back-arrow.png" className="w-16" />
        </button>

        <div className="text-center px-4 max-w-2xl text-lg text-[#001f40] whitespace-pre-wrap">
          {capGroup.map((c) => c.caption).join("\n")}
        </div>

        <button
          onClick={onNext}
          disabled={idx === totalSlides - 1}
          className={`p-3 ${
            idx === totalSlides - 1 ? "opacity-30" : "hover:opacity-80"
          }`}
        >
          <img src="/forward-arrow.png" className="w-16" />
        </button>
      </div>

      {/* Timeline */}
      <div className="fixed bottom-[120px] left-0 right-0 px-6 py-4 bg-white">
        <div className="relative w-full h-4 flex items-center">
          <div className="absolute left-0 right-0 h-2 bg-[#001f40] rounded-full opacity-40" />
          <div className="relative w-full h-4 flex items-center">
            {slides.map((s, i) => {
              const done = i < idx;
              const active = i === idx;
              return (
                <div
                  key={s.id}
                  style={{ width: `${100 / totalSlides}%` }}
                  className="relative h-full flex items-center"
                >
                  <div
                    className={`h-2 flex-1 transition-all ${
                      done
                        ? "bg-[#001f40]"
                        : active
                        ? "bg-[#ca5608] shadow-[0_0_6px_#ca5608]"
                        : "bg-[#ca5608]/70"
                    } ${
                      i === 0 ? "rounded-l-full" : ""
                    } ${
                      i === totalSlides - 1 ? "rounded-r-full" : ""
                    }`}
                  ></div>
                  {i < totalSlides - 1 && <div className="w-[2px] h-full bg-white"></div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
