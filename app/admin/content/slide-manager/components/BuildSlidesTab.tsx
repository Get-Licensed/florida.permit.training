"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import LessonExplorerLayout from "./LessonExplorerLayout";
import LessonExplorer from "./LessonExplorer";

/* ----------------------------- TYPES ----------------------------- */
type ModuleRow = {
  id: string;
  title: string;
  sort_order: number;
};

type LessonRow = {
  id: string;
  title: string;
  module_id: string;
  order_index: number;
};

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

/* ============================
   PREVIEW COURSE TAB
   ============================ */
export default function BuildSlidesTab() {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [captions, setCaptions] = useState<CaptionRow[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  /* ---------------- LOAD MODULES + LESSONS ---------------- */
  useEffect(() => {
    async function load() {
      const { data: m } = await supabase
        .from("modules")
        .select("*")
        .order("sort_order");

      const { data: l } = await supabase
        .from("lessons")
        .select("*")
        .order("order_index");

      setModules(m || []);
      setLessons(l || []);
    }
    load();
  }, []);

  /* ---------------- LOAD SLIDES FOR LESSON ---------------- */
  async function loadLesson(lessonId: string) {
    const { data: sl } = await supabase
      .from("lesson_slides")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index");

    setSlides(sl || []);

    const ids = sl?.map((x) => x.id) ?? [];

    if (ids.length > 0) {
      const { data: caps } = await supabase
        .from("slide_captions")
        .select("*")
        .in("slide_id", ids)
        .order("line_index");

      setCaptions(caps || []);
    } else {
      setCaptions([]);
    }

    setCurrentSlideIndex(0);
  }

  /* ---------------- ACTIVE SLIDE & CAPTION ---------------- */
  const activeSlide = useMemo(() => {
    if (slides.length === 0) return null;
    return slides[currentSlideIndex] || null;
  }, [slides, currentSlideIndex]);

  const activeCaption = useMemo(() => {
    if (!activeSlide) return null;
    const list = captions.filter((c) => c.slide_id === activeSlide.id);
    return list[0] || null;
  }, [captions, activeSlide]);

  /* ---------------- NAVIGATION: NEXT ---------------- */
  function goNext() {
    if (!selectedLessonId) return;

    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((i) => i + 1);
      return;
    }

    const lessonIndex = lessons.findIndex(
      (l) => String(l.id) === String(selectedLessonId)
    );

    const nextLesson = lessons[lessonIndex + 1];
    if (nextLesson) {
      setSelectedLessonId(String(nextLesson.id));
      loadLesson(String(nextLesson.id));
      return;
    }

    const activeLesson = lessons.find((l) => String(l.id) === selectedLessonId);
    if (!activeLesson) return;

    const moduleIndex = modules.findIndex((m) => m.id === activeLesson.module_id);
    const nextModule = modules[moduleIndex + 1];

    if (nextModule) {
      const firstLesson = lessons.find((l) => l.module_id === nextModule.id);
      if (firstLesson) {
        setSelectedLessonId(String(firstLesson.id));
        loadLesson(String(firstLesson.id));
      }
      return;
    }

    alert("End of all lessons and modules!");
  }

  /* ---------------- NAVIGATION: PREV ---------------- */
  function goPrev() {
    if (!selectedLessonId) return;

    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((i) => i - 1);
      return;
    }

    const lessonIndex = lessons.findIndex(
      (l) => String(l.id) === String(selectedLessonId)
    );
    const prevLesson = lessons[lessonIndex - 1];

    if (prevLesson) {
      setSelectedLessonId(String(prevLesson.id));
      loadLesson(String(prevLesson.id));

      setTimeout(() => {
        setCurrentSlideIndex(slides.length > 0 ? slides.length - 1 : 0);
      }, 200);

      return;
    }

    const activeLesson = lessons.find((l) => String(l.id) === selectedLessonId);
    if (!activeLesson) return;

    const moduleIndex = modules.findIndex(
      (m) => m.id === activeLesson.module_id
    );

    const prevModule = modules[moduleIndex - 1];
    if (prevModule) {
      const moduleLessons = lessons.filter(
        (l) => l.module_id === prevModule.id
      );

      if (moduleLessons.length > 0) {
        const last = moduleLessons[moduleLessons.length - 1];
        setSelectedLessonId(String(last.id));
        loadLesson(String(last.id));
      }
    }
  }

  /* ---------------- RENDER ---------------- */
return (
  <LessonExplorerLayout
    sidebar={
      <LessonExplorer
        selectedLessonId={selectedLessonId}
        onSelect={(id: string) => {
          setSelectedLessonId(id);
          loadLesson(id);
        }}
      />
    }
  >
    <div className="w-full flex flex-col items-center">
      {!activeSlide ? (
        <p className="text-gray-500">Select a lesson to begin preview.</p>
      ) : (
        <div className="w-full flex flex-col items-center">
          <img
            src={
              activeSlide.image_path
                ? supabase.storage
                    .from("uploads")
                    .getPublicUrl(activeSlide.image_path).data.publicUrl
                : "/placeholder.png"
            }
            alt="Slide"
            className="rounded shadow mb-6 max-w-3xl"
          />

          <p className="text-lg text-center text-[#001f40] mb-6">
            {activeCaption?.caption || "(no caption)"}
          </p>

          <div className="flex gap-4">
            <button className="px-4 py-2 bg-gray-200 rounded" onClick={goPrev}>
              Prev
            </button>

            <button
              className="px-4 py-2 bg-[#ca5608] text-white rounded"
              onClick={goNext}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  </LessonExplorerLayout>
);
}