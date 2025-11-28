"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";

import LessonSelector from "./LessonSelector";
import CaptionList from "./CaptionList";
import ImageTray from "./ImageTray";
import UploadImageButton from "./UploadImageButton";

import { Slide, Caption } from "./types";

export default function CaptionImageMapper() {
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);

  /* Load slides + captions for lesson */
  async function load(lesson: string) {
    const { data: sl } = await supabase
      .from("lesson_slides")
      .select("*")
      .eq("lesson_id", lesson)
      .order("order_index");

    const slideIds = sl?.map((s) => s.id) ?? [];

    const { data: caps } = await supabase
      .from("slide_captions")
      .select("*")
      .in("slide_id", slideIds)
      .order("line_index");

    setSlides((sl || []) as Slide[]);
    setCaptions((caps || []) as Caption[]);

    // auto-select first slide
    if (sl && sl.length > 0) setSelectedSlideId(sl[0].id);
  }

  function handleUpload(newSlide: Slide) {
    setSlides((prev) => [...prev, newSlide]);
    setSelectedSlideId(newSlide.id);
  }

  return (
    <div className="flex gap-6">
      {/* LEFT SIDE — LESSON + CAPTIONS */}
      <div className="w-1/4">
        <LessonSelector
          selectedLessonId={lessonId}
          onSelect={(id) => {
            setLessonId(id);
            load(id);
          }}
        />

        {/* Caption List for selected slide */}
        <CaptionList
          slideId={selectedSlideId}
          captions={captions.filter((c) => c.slide_id === selectedSlideId)}
          onRefresh={() => {
            if (lessonId) load(lessonId);
          }}
        />
      </div>

      {/* RIGHT SIDE — IMAGES */}
      <div className="w-3/4">
        {lessonId && (
          <UploadImageButton lessonId={lessonId} onUpload={handleUpload} />
        )}

        <ImageTray
          slides={slides}
          captions={captions}
          selectedSlideId={selectedSlideId}
          onSelectSlide={(id) => setSelectedSlideId(id)}
        />

      </div>
    </div>
  );
}
