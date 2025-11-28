"use client";

import { Caption } from "./types";
import { supabase } from "@/utils/supabaseClient";
import { useState } from "react";

export default function CaptionList({
  slideId,
  captions,
  onRefresh,
}: {
  slideId: string | null;
  captions: Caption[];
  onRefresh: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editSeconds, setEditSeconds] = useState(5);

  if (!slideId) {
    return <p className="text-gray-500 text-sm">(select a slide)</p>;
  }

  async function startEdit(c: Caption) {
    setEditingId(c.id);
    setEditText(c.caption);
    setEditSeconds(c.seconds);
  }

  async function saveEdit() {
    if (!editingId) return;

    await supabase
      .from("slide_captions")
      .update({
        caption: editText,
        seconds: editSeconds,
      })
      .eq("id", editingId);

    setEditingId(null);
    onRefresh();
  }

  async function deleteCaption(id: string) {
    await supabase.from("slide_captions").delete().eq("id", id);
    onRefresh();
  }

  return (
    <div className="mt-4 space-y-3">
      <h3 className="font-semibold text-[#001f40] text-sm mb-2">
        Captions for this Slide
      </h3>

      {captions.length === 0 && (
        <p className="text-gray-500 text-xs">(no captions)</p>
      )}

      {captions.map((c) =>
        editingId === c.id ? (
          <div key={c.id} className="border p-2 rounded bg-gray-50">
            <textarea
              className="w-full border p-1 rounded text-xs"
              rows={2}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <input
              type="number"
              min={1}
              className="border p-1 rounded mt-1 w-20 text-xs"
              value={editSeconds}
              onChange={(e) => setEditSeconds(parseInt(e.target.value))}
            />

            <div className="flex gap-2 mt-2">
              <button
                onClick={saveEdit}
                className="px-2 py-1 bg-[#001f40] text-white rounded text-xs"
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="px-2 py-1 border rounded text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            key={c.id}
            className="border p-2 rounded flex justify-between items-center text-xs"
          >
            <div>
              <p>{c.caption}</p>
              <span className="text-gray-500">{c.seconds}s</span>
            </div>

            <div className="flex gap-2">
              <button
                className="text-[#001f40]"
                onClick={() => startEdit(c)}
              >
                Edit
              </button>
              <button
                className="text-red-600"
                onClick={() => deleteCaption(c.id)}
              >
                Delete
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
