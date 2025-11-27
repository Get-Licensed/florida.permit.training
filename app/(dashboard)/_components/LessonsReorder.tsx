"use client";

import { useEffect, useState } from "react";
import { ReactSortable } from "react-sortablejs";
import { supabase } from "@/utils/supabaseClient";

type LessonItem = {
  id: number;
  title: string;
  sort_order: number;
};

export default function LessonsReorder({
  moduleId,
  onClose,
  onSaved,
}: {
  moduleId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<LessonItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data, error } = await supabase
      .from("lessons")
      .select("id, title, sort_order")
      .eq("module_id", moduleId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setItems((data as LessonItem[]) ?? []);
  }

  async function saveOrder() {
    setSaving(true);

    const orderedIds = items.map((l) => Number(l.id));

    const { error } = await supabase.rpc("reorder_lessons", {
      _module: moduleId,
      _ids: orderedIds,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Failed to reorder lessons.");
    } else {
      onSaved();  // reload lesson list in parent
      onClose();  // close modal
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1500]">
      <div className="bg-white rounded-lg p-6 w-[420px] shadow-lg">
        <h3 className="text-lg font-bold text-[#001f40] mb-4">
          Reorder Lessons
        </h3>

        <div className="border rounded-md max-h-[350px] overflow-y-auto">
          <ReactSortable
            list={items}
            setList={setItems}
            animation={200}
            ghostClass="bg-yellow-100"
            chosenClass="bg-gray-200"
            dragClass="opacity-50"
          >
            {items.map((l) => (
              <div
                key={l.id}
                className="p-2 border-b last:border-none bg-white cursor-move hover:bg-gray-100 text-sm"
              >
                {l.title}
              </div>
            ))}
          </ReactSortable>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded text-sm"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={saveOrder}
            className="px-4 py-1.5 bg-[#ca5608] text-white rounded text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
