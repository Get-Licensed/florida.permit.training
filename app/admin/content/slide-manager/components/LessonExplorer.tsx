"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { ChevronRight, ChevronDown, BookOpen, RotateCcw } from "lucide-react";

type LessonExplorerProps = {
  selectedLessonId: string | null;
  onSelect: (id: string) => void;
};

export default function LessonExplorer({
  selectedLessonId,
  onSelect,
}: LessonExplorerProps) {
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [captions, setCaptions] = useState<any[]>([]);
  const [slides, setSlides] = useState<any[]>([]);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  /* ---------------------------------------
     LOAD MODULES, LESSONS, SLIDES, CAPTIONS
  ---------------------------------------- */
  async function loadData() {
    const { data: mods } = await supabase
      .from("modules")
      .select("*")
      .order("sort_order");

    const { data: les } = await supabase
      .from("lessons")
      .select("*")
      .order("sort_order");

    const { data: slideRows } = await supabase
      .from("lesson_slides")
      .select("id, lesson_id");

    const { data: caps } = await supabase
      .from("slide_captions")
      .select("id, slide_id, seconds");

    setModules(mods || []);
    setLessons(les || []);
    setSlides(slideRows || []);
    setCaptions(caps || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  /* ---------------------------------------
     HELPER: Format mm:ss
  ---------------------------------------- */
  function formatSeconds(total: number) {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = Math.floor(total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  /* ---------------------------------------
     COMPUTE MODULE TOTALS
  ---------------------------------------- */
  const moduleSeconds: Record<string, number> = {};

  modules.forEach((mod) => {
    moduleSeconds[mod.id] = 0;

    const modLessons = lessons.filter((l) => l.module_id === mod.id);

    modLessons.forEach((lesson) => {
      const lessonSlides = slides.filter((s) => s.lesson_id === lesson.id);
      const slideIds = lessonSlides.map((s) => s.id);

      const lessonCaptions = captions.filter((c) =>
        slideIds.includes(c.slide_id)
      );

      const sum = lessonCaptions.reduce(
        (acc, c) => acc + (c.seconds || 0),
        0
      );

      moduleSeconds[mod.id] += sum;
    });
  });

  /* ---------------------------------------
     ENTIRE COURSE TOTAL TIME
  ---------------------------------------- */
  const entireCourseSeconds = Object.values(moduleSeconds).reduce(
    (sum, sec) => sum + sec,
    0
  );

  /* ---------------------------------------
     EXPAND / COLLAPSE
  ---------------------------------------- */
  const toggle = (moduleId: string) => {
    setOpenModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const openAll = () => {
    const obj: Record<string, boolean> = {};
    modules.forEach((m) => (obj[m.id] = true));
    setOpenModules(obj);
  };

  const closeAll = () => {
    const obj: Record<string, boolean> = {};
    modules.forEach((m) => (obj[m.id] = false));
    setOpenModules(obj);
  };

  const allOpen = modules.every((m) => openModules[m.id]);

  /* ---------------------------------------
     RENDER SIDEBAR
  ---------------------------------------- */
  return (
    <div className="space-y-2 text-sm">

      {/* CONTROL BAR */}
      <div className="flex items-center justify-between mb-2">

        {/* LEFT BUTTON GROUP */}
        <div className="flex items-center gap-2">

          {/* OPEN / CLOSE ALL */}
          <button
            onClick={allOpen ? closeAll : openAll}
            className="
              p-1
              text-sm
              rounded-md
              cursor-pointer
              border border-[#001f40]
              text-[#001f40]
              hover:bg-[#001f40] hover:text-white
            "
          >
            {allOpen ? "Close All" : "Open All"}
          </button>
     
          {/* REFRESH ICON BUTTON */}
          <button
            onClick={async () => {
              await loadData();

              const reset: Record<string, boolean> = {};
              modules.forEach((m) => (reset[m.id] = false));
              setOpenModules(reset);

              if (selectedLessonId) onSelect(selectedLessonId);
            }}
            className="
              p-1
              bg-white
              border border-[#001f40]
              text-[#001f40]
              rounded-md
              cursor-pointer
              hover:bg-[#ca5608] hover:text-white
              flex items-center justify-center
            "
          >
            <RotateCcw size={18} />
          </button>
     
        </div>

        {/* RIGHT — ENTIRE COURSE TOTAL */}
        <div
          className="
            p-1.25
            bg-[#ca5608]
            text-white
            font-bold
            text-m
            rounded-md
            flex items-center justify-center
            min-w-[130px]
            text-center
          "
        >
          Full Course = {formatSeconds(entireCourseSeconds)}
        </div>
      </div>

      {/* TITLE */}
      <h2 className="text-[#001f40] font-bold text-lg">
        Modules & Lessons
      </h2>

      {/* MODULE TREE */}
      {modules.map((m) => {
        const isOpen = openModules[m.id] || false;
        const moduleLessons = lessons.filter((l) => l.module_id === m.id);
        const totalSec = moduleSeconds[m.id] || 0;

        return (
          <div key={m.id}>

            {/* MODULE HEADER */}
            <div
              className="flex items-center justify-between py-1 cursor-pointer select-none"
              onClick={() => toggle(m.id)}
            >
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown size={16} className="text-gray-600" />
                ) : (
                  <ChevronRight size={16} className="text-gray-600" />
                )}
                <span className="font-semibold text-[#001f40]">
                  {m.title}
                </span>
              </div>

              {/* ORANGE BADGE */}
              {totalSec > 0 && (
                <span
                  className="
                    bg-[#ca5608]
                    text-white
                    font-bold
                    text-xs
                    px-2 py-0.5
                    rounded
                  "
                >
                  {formatSeconds(totalSec)}
                </span>
              )}
            </div>

            {/* LESSON LIST */}
            {isOpen && (
              <div className="ml-6 space-y-1 mt-1">
                {moduleLessons.map((l) => {
                  const selected = selectedLessonId === l.id.toString();
                  return (
                    <div
                      key={l.id}
                      onClick={() => onSelect(l.id.toString())}
                      className={`
                        flex items-center text-xs gap-2 px-2 py-1 rounded cursor-pointer
                        ${
                          selected
                            ? "bg-[#ca5608]/10 text-[#ca5608] font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        }
                      `}
                    >
                      <BookOpen size={14} />
                      {l.title}
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
