"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

type Slide = {
  id: number;
  image_url: string;
};

type Caption = {
  id: number;
  text: string;
  line_number: number;
};

export default function CoursePlayer() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [index, setIndex] = useState(0);

  const currentSlide = slides[index] ?? null;

  // Fetch slides on load
  useEffect(() => {
    async function loadSlides() {
      const { data, error } = await supabase
        .from("course_slides")
        .select("*")
        .order("id", { ascending: true });

      if (!error && data) setSlides(data);
    }
    loadSlides();
  }, []);

  // Fetch captions when slide changes
  useEffect(() => {
    async function loadCaptions(slideId: number) {
      const { data, error } = await supabase
        .from("course_captions")
        .select("*")
        .eq("slide_id", slideId)
        .order("line_number", { ascending: true });

      if (!error && data) setCaptions(data);
    }

    if (currentSlide?.id) loadCaptions(currentSlide.id);
  }, [currentSlide?.id]);

  function prevSlide() {
    if (index > 0) setIndex((i) => i - 1);
  }
  function nextSlide() {
    if (index < slides.length - 1) setIndex((i) => i + 1);
  }

  return (
    <main className="flex flex-col items-center p-6 text-center">
      <h1 className="text-xl font-bold mb-4 text-[#001f40]">
        Course Slide Viewer (Prototype)
      </h1>

      {/* IMAGE */}
      {currentSlide ? (
        <img
        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${currentSlide.image_url}`}
          className="max-w-lg rounded shadow-lg mb-4"
        />
      ) : (
        <p className="text-gray-500">Loading slide...</p>
      )}

      {/* CAPTION */}
      {captions.length > 0 && (
        <div className="text-lg font-medium text-[#001f40] bg-white px-4 py-2 rounded shadow border w-full max-w-lg">
          {captions[0].text}
        </div>
      )}

      {/* NAVIGATION */}
      <div className="flex space-x-4 mt-6">
        <button
          onClick={prevSlide}
          disabled={index === 0}
          className={`px-5 py-2 rounded font-semibold text-white ${
            index === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#001f40] hover:bg-[#003266] cursor-pointer"
          }`}
        >
          Prev
        </button>

        <button
          onClick={nextSlide}
          disabled={index === slides.length - 1}
          className={`px-5 py-2 rounded font-semibold text-white ${
            index === slides.length - 1
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#ca5608] hover:bg-[#b44c06] cursor-pointer"
          }`}
        >
          Next
        </button>
      </div>
    </main>
  );
}
