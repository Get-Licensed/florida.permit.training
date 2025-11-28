"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import LessonSelector from "./LessonSelector";
import { Caption } from "./types";

export default function CaptionsTab() {
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);

  useEffect(() => {
    if (!lessonId) return;

    async function load() {
      const { data } = await supabase
        .from("captions")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("order_index", { ascending: true });

      setCaptions(data || []);
    }
    load();
  }, [lessonId]);

  async function updateCaptionField(
    id: string,
    field: keyof Caption,
    value: any
  ) {
    setCaptions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );

    await supabase.from("captions").update({ [field]: value }).eq("id", id);
  }

  return (
    <div className="p-4 space-y-4">
      <LessonSelector
        selectedLessonId={lessonId}
        onSelect={setLessonId}
      />

      {lessonId && (
        <div className="space-y-4">
          {captions.map((c) => (
            <div key={c.id} className="border p-3 rounded bg-white">
              <input
                className="border p-2 w-full mb-2"
                value={c.caption}
                onChange={(e) =>
                  updateCaptionField(c.id, "caption", e.target.value)
                }
              />

              <input
                type="number"
                className="border p-2 w-24"
                value={c.seconds}
                onChange={(e) =>
                  updateCaptionField(c.id, "seconds", Number(e.target.value))
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
