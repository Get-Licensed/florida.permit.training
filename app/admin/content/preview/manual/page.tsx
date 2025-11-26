"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function ManualSlidePreview() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<{ caption: string; display_seconds: number }[]>([]);
  const [index, setIndex] = useState(0);

  // Hardcoded: module 1 → first lesson → first slide
  const moduleId = "5ab3bded-ce53-4dba-8d43-a55907ff1294"; // change to your UUID

  useEffect(() => {
    async function loadPreview() {
      /* 1) Load FIRST LESSON for this module */
      const { data: lesson, error: lessonErr } = await supabase
        .from("lessons")
        .select("id")
        .eq("module_id", moduleId)
        .order("id", { ascending: true })
        .limit(1)
        .single();

      if (lessonErr || !lesson) return;

      /* 2) Load FIRST SLIDE GROUP for that lesson */
      const { data: group, error: groupErr } = await supabase
        .from("course_slide_groups")
        .select("id, image_url")
        .eq("lesson_id", lesson.id)
        .limit(1)
        .single();

      if (groupErr || !group) return;

      /* 3) Convert Storage Path → Public URL */
      if (group.image_url) {
        const url = supabase.storage.from("uploads").getPublicUrl(group.image_url).data.publicUrl;
        setImageUrl(url);
      }

      /* 4) Load captions from `lesson_slides` */
      const { data: caps } = await supabase
        .from("lesson_slides")
        .select("caption, display_seconds")
        .eq("group_key", group.id)
        .order("id", { ascending: true });

      setCaptions(caps ?? []);
    }

    loadPreview();
  }, []);

  function next() {
    if (index < captions.length - 1) setIndex(index + 1);
  }

  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  return (
    <div className="flex flex-col bg-white text-[#001f40]" style={{ height: "100vh" }}>
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-gray-200 h-[3px] relative">
          <div
            className="absolute top-0 left-0 h-[3px] bg-[#ca5608]"
            style={{
              width: captions.length > 0 ? `${((index + 1) / captions.length) * 100}%` : "0%",
              transition: "width 0.3s ease"
            }}
          />
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-6 pt-6 pb-[140px]">
        {imageUrl ? (
          <img src={imageUrl} className="max-h-full max-w-full object-contain rounded" alt="Slide" />
        ) : (
          <p className="text-lg">No Image Found</p>
        )}
      </div>

      {/* Caption + Navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 flex flex-col items-center justify-center"
        style={{ height: "140px" }}
      >
        <div className="text-center text-[18px] font-medium px-4 mb-4 min-h-[60px] flex items-center justify-center">
          {captions.length > 0 ? captions[index]?.caption : "No captions found"}
        </div>

        <div className="flex justify-between items-center w-full max-w-xl px-6 pb-2 select-none">
          <button onClick={prev} disabled={index === 0}>
            <img
              src="/back-arrow.png"
              className={`w-12 sm:w-16 object-contain ${index === 0 ? "opacity-30" : ""}`}
            />
          </button>

          <div className="text-sm opacity-70">
            {captions.length > 0 ? `${index + 1} / ${captions.length}` : "0/0"}
          </div>

          <button onClick={next} disabled={index === captions.length - 1}>
            <img
              src="/forward-arrow.png"
              className={`w-12 sm:w-16 object-contain ${
                index === captions.length - 1 ? "opacity-30" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
