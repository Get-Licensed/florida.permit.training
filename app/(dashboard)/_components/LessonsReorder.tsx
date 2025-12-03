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
      onSaved();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1500]">
      <div className="bg-white rounded-lg p-6 w-[420px] shadow-lg">

        <h3 className="text-lg font-bold text-[#001f40] mb-4">
          Reorder Lessons
        </h3>
        <p className="text-sm text-gray-700 mb-4">
  <span className="font-semibold text-red-700">Warning:</span> Changing the
  order of lessons will modify the sequence in which students progress
  through this module. This affects pacing and course navigation.
  <br /><br />
  <span className="font-semibold">Important:</span> Your changes are not
  applied until you click <em>Save Order</em> below. Leaving or closing this
  screen without saving will discard all changes.
</p>

        {/* LIST CONTAINER */}
        <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-[350px]">

          <ReactSortable
            list={items}
            setList={setItems}
            animation={200}
            ghostClass="sortable-ghost"
            chosenClass="sortable-chosen"
            dragClass="opacity-40"
          >
            {items.map((l) => (
              <div
                key={l.id}
                className="
                  flex justify-between items-center
                  py-2 px-3
                  border-b last:border-none
                  text-sm
                  bg-white
                  hover:bg-gray-100
                  cursor-move
                "
              >
                <span>{l.title}</span>

                {/* drag handle symbol */}
                <span className="text-gray-400 select-none">⋮⋮</span>
              </div>
            ))}
          </ReactSortable>
        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={saveOrder}
            className="px-4 py-1.5 bg-[#ca5608] text-white rounded text-sm disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
