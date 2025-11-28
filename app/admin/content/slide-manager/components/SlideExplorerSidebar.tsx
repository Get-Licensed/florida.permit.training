"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function SlideExplorerSidebar({
  onSelectSlide,
}: {
  onSelectSlide: (slideId: string) => void;
}) {
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [slides, setSlides] = useState<any[]>([]);

  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [openLessons, setOpenLessons] = useState<Record<string, boolean>>({});

  async function loadEverything() {
    const { data: mods } = await supabase
      .from("modules")
      .select("*")
      .order("sort_order");

    const { data: les } = await supabase
      .from("lessons")
      .select("*")
      .order("sort_order");

    const { data: sl } = await supabase
      .from("lesson_slides")
      .select("*")
      .order("order_index");

    setModules(mods || []);
    setLessons(les || []);
    setSlides(sl || []);
  }

  useEffect(() => {
    loadEverything();
  }, []);

  return (
    <div className="space-y-2">

      {modules.map((mod) => {
        const isModOpen = openModules[mod.id] || false;

        return (
          <div key={mod.id}>
            {/* MODULE LABEL */}
            <div
              className="cursor-pointer flex items-center gap-2 font-semibold text-sm py-1"
              onClick={() =>
                setOpenModules((prev) => ({
                  ...prev,
                  [mod.id]: !isModOpen,
                }))
              }
            >
              <span>{isModOpen ? "▼" : "▸"}</span>
              {mod.title}
            </div>

            {/* MODULE CONTENT */}
            {isModOpen && (
              <div className="ml-5 space-y-1">
                {lessons
                  .filter((l) => l.module_id === mod.id)
                  .map((lesson) => {
                    const isLessonOpen = openLessons[lesson.id] || false;

                    return (
                      <div key={lesson.id}>
                        {/* LESSON LABEL */}
                        <div
                          className="cursor-pointer flex items-center gap-2 text-sm text-gray-700"
                          onClick={() =>
                            setOpenLessons((prev) => ({
                              ...prev,
                              [lesson.id]: !isLessonOpen,
                            }))
                          }
                        >
                          <span>{isLessonOpen ? "▼" : "▸"}</span>
                          {lesson.title}
                        </div>

                        {/* LESSON CONTENT */}
                        {isLessonOpen && (
                          <div className="ml-6 space-y-1">
                            {slides
                              .filter((s) => s.lesson_id === lesson.id)
                              .map((s) => (
                                <div
                                  key={s.id}
                                  className="cursor-pointer text-xs text-gray-600 hover:text-[#ca5608]"
                                  onClick={() => onSelectSlide(s.id)}
                                >
                                  Slide #{s.order_index + 1}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
