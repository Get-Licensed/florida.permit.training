"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { ChevronRight, ChevronDown, BookOpen } from "lucide-react";

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
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  async function loadData() {
    const { data: mods } = await supabase
      .from("modules")
      .select("*")
      .order("sort_order");

    const { data: les } = await supabase
      .from("lessons")
      .select("*")
      .order("sort_order");

    setModules(mods || []);
    setLessons(les || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const toggle = (moduleId: string) => {
    setOpenModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  return (
    <div className="space-y-3 text-sm">
      <h3 className="text-[#001f40] font-bold text-md">Lessons</h3>

      {modules.map((m) => {
        const isOpen = openModules[m.id] || false;
        const moduleLessons = lessons.filter((l) => l.module_id === m.id);

        return (
          <div key={m.id}>
            {/* MODULE */}
            <div
              className="flex items-center gap-2 py-1 cursor-pointer select-none"
              onClick={() => toggle(m.id)}
            >
              {isOpen ? (
                <ChevronDown size={16} className="text-gray-600" />
              ) : (
                <ChevronRight size={16} className="text-gray-600" />
              )}
              <span className="font-semibold text-[#001f40]">{m.title}</span>
            </div>

            {/* LESSONS */}
            {isOpen && (
              <div className="ml-6 space-y-1 mt-1">
                {moduleLessons.map((l) => {
                  const selected = selectedLessonId === l.id.toString();
                  return (
                    <div
                      key={l.id}
                      onClick={() => onSelect(l.id.toString())}
                      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer
                        ${
                          selected
                            ? "bg-[#ca5608]/10 text-[#ca5608] font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
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
