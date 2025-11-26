"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/utils/supabaseClient";
import { requireAuth } from "@/utils/requireAuth";
import TopProgressBar from "@/components/TopProgressBar";

/* ===============================================================
   TYPES
================================================================*/
type ModuleRow = { id: string; title: string; sort_order: number | null };
type LessonRow = { id: string; title: string; module_id: string; sort_order: number | null };
type SlideRow = {
  id: string;
  lesson_id: string;
  image_path: string;
  caption: string;
  display_seconds: number | null;
  order_index: number | null;
};

/* ===============================================================
   PAGE COMPONENT
================================================================*/
export default function CoursePage() {
  const [loading, setLoading] = useState(true);

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [slides, setSlides] = useState<SlideRow[]>([]);

  // Tracking locations inside course
  const [modIdx, setModIdx] = useState(0);
  const [lessonIdx, setLessonIdx] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);

  // Timing + autoplay
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const slideTimerRef = useRef<number | null>(null);

  /* ===============================================================
     AUTH + DATA LOAD
  ===============================================================*/
  useEffect(() => {
    (async () => {
      await requireAuth(null);

      const { data: m } = await supabase.from("modules").select("*").order("sort_order");
      const { data: l } = await supabase.from("lessons").select("*").order("id", { ascending: true });
      const { data: s } = await supabase
        .from("lesson_slides")
        .select("id, lesson_id, image_path, caption, display_seconds, order_index")
        .order("order_index", { ascending: true });

      setModules(m ?? []);
      setLessons(l ?? []);
      setSlides(s ?? []);
      setLoading(false);
    })();
  }, []);

  /* ===============================================================
     DERIVED COURSE STRUCTURE
  ===============================================================*/
  const lessonsInModule = (m: ModuleRow) =>
    lessons.filter(l => l.module_id === m.id).sort((a, b) => (a.id > b.id ? 1 : -1));

  const slidesInLesson = (lesson: LessonRow) =>
    slides
      .filter(s => s.lesson_id === lesson.id)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const module = modules[modIdx];
  const lessonList = module ? lessonsInModule(module) : [];
  const lesson = lessonList[lessonIdx];
  const slideList = lesson ? slidesInLesson(lesson) : [];
  const slide = slideList[slideIdx];

  /* ===============================================================
     AUTOPLAY TIMER
  ===============================================================*/
  useEffect(() => {
    if (!slide) return;

    const seconds = slide.display_seconds ?? 5;
    setTimeLeft(seconds);
    setIsPaused(false);

    if (slideTimerRef.current) window.clearTimeout(slideTimerRef.current);
    slideTimerRef.current = window.setTimeout(() => {
      if (!isPaused) next();
    }, seconds * 1000);

    return () => {
      if (slideTimerRef.current) window.clearTimeout(slideTimerRef.current);
    };
  }, [slideIdx, lessonIdx, modIdx, isPaused]);

  /* ===============================================================
     NAVIGATION: NEXT
  ===============================================================*/
  const next = () => {
    if (!lesson || !slide) return;

    setIsPaused(false);

    // 1) Next slide in same lesson
    if (slideIdx < slideList.length - 1) {
      setSlideIdx(slideIdx + 1);
      return;
    }

    // 2) Next lesson in same module
    if (lessonIdx < lessonList.length - 1) {
      setLessonIdx(lessonIdx + 1);
      setSlideIdx(0);
      return;
    }

    // 3) End of module (stay here for now)
    console.log("Module complete.");
  };

  /* ===============================================================
     NAVIGATION: PREV
  ===============================================================*/
  const prev = () => {
    if (!lesson || !slide) return;
    if (slideIdx > 0) {
      setSlideIdx(slideIdx - 1);
      return;
    }
  };

  const togglePause = () => setIsPaused(!isPaused);

  /* ===============================================================
     RENDER GUARD (NO BLANK SCREEN)
  ===============================================================*/
  if (loading || !module || !lesson || !slide) {
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Loading course...
      </div>
    );
  }

  /* ===============================================================
     UI RENDER
  ===============================================================*/
  return (
    <div className="relative min-h-screen bg-white">

      {/* PROGRESS BAR */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-200 h-2">
        <TopProgressBar percent={50} />
      </div>

      {/* MAIN CONTENT */}
      <main
        className="flex flex-col bg-white relative overflow-hidden"
        style={{ height: "calc(100vh - (64px + 120px))" }}
      >
        <section className="flex flex-col px-8 py-6 overflow-auto flex-1">
          <h2 className="text-xl font-bold text-[#001f40] mb-4">{lesson.title}</h2>

          {/* SLIDE IMAGE + CAPTION */}
          <div className="relative w-full max-w-4xl mx-auto h-[60vh] bg-black rounded-lg overflow-hidden">
            <Image
              src={supabase.storage.from("uploads").getPublicUrl(slide.image_path).data.publicUrl}
              alt=""
              fill
              className="object-contain"
            />

            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-center text-lg font-medium px-4 py-3">
              {slide.caption}
            </div>
          </div>
        </section>

        {/* FOOTER CONTROLS */}
        <footer className="fixed left-0 right-0 border-t shadow-inner bg-white z-40" style={{ bottom: "1px" }}>
          <div className="p-4">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex justify-between items-center select-none">

                <button onClick={prev} className="opacity-90">
                  <img src="/back-arrow.png" className="w-16 sm:w-20" />
                </button>

                <button
                  onClick={togglePause}
                  className="w-full sm:w-[160px] px-5 py-2 rounded font-semibold text-white bg-[#ca5608] hover:bg-[#b24b06]"
                >
                  {isPaused ? "▶️ Resume" : "⏸️ Pause"}
                </button>

                <button onClick={next} className="cursor-pointer">
                  <img src="/forward-arrow.png" className="w-16 sm:w-20" />
                </button>
              </div>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
