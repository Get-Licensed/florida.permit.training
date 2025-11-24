"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

/** STUDENT-STYLE CAPTION PREVIEW */
export default function SlidePreview() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<any[]>([]);
  const [index, setIndex] = useState(0);

  const groupId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("group")
      : null;

  useEffect(() => {
    if (!groupId) return;

    (async () => {
      // Load the image from the group
      const { data: group } = await supabase
        .from("course_slide_groups")
        .select("image_url")
        .eq("id", groupId)
        .single();

      if (group?.image_url) {
        const url = supabase.storage.from("uploads").getPublicUrl(group.image_url).data.publicUrl;
        setImageUrl(url);
      }

      // Load captions
      const { data: caps } = await supabase
        .from("course_captions")
        .select("*")
        .eq("slide_group_id", groupId)
        .order("line_number", { ascending: true });

      setCaptions(caps ?? []);
    })();
  }, [groupId]);

  function next() {
    if (index < captions.length - 1) setIndex(index + 1);
  }

  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  return (
    <div
      className="flex flex-col bg-white text-[#001f40]"
      style={{ height: "100vh" }}
    >
      {/* ===== FIXED TOP PROGRESS BAR ===== */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-gray-200 h-[3px] relative">
          <div
            className="absolute top-0 left-0 h-[3px] bg-[#ca5608]"
            style={{
              width: captions.length > 0
                ? `${((index + 1) / captions.length) * 100}%`
                : "0%",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* ===== MAIN IMAGE ===== */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-6 pt-6 pb-[140px]">
        {imageUrl ? (
          <img
            src={imageUrl}
            className="max-h-full max-w-full object-contain rounded"
            alt="Slide"
          />
        ) : (
          <p className="text-lg">Loading image...</p>
        )}
      </div>

      {/* ===== CAPTION + NAVIGATION ===== */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 flex flex-col items-center justify-center"
        style={{ height: "140px" }}
      >
        {/* CAPTION TEXT */}
        <div className="text-center text-[18px] font-medium px-4 mb-4 min-h-[60px] flex items-center justify-center">
          {captions.length > 0 ? captions[index]?.text : "No captions"}
        </div>

        {/* NAVIGATION ARROWS */}
        <div className="flex justify-between items-center w-full max-w-xl px-6 pb-2 select-none">
          <img
            src="/back-arrow.png"
            alt="Previous"
            onClick={prev}
            className={`w-12 sm:w-16 object-contain ${
              index === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
            }`}
            style={{ filter: "grayscale(1) brightness(1.64)" }}
          />
          <div className="text-sm opacity-70">
            {captions.length > 0 ? `${index + 1} / ${captions.length}` : "0/0"}
          </div>
          <img
            src="/forward-arrow.png"
            alt="Next"
            onClick={next}
            className={`w-12 sm:w-16 object-contain ${
              index === captions.length - 1
                ? "opacity-30 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            style={{ filter: "grayscale(1) brightness(1.64)" }}
          />
        </div>
      </div>
    </div>
  );
}
