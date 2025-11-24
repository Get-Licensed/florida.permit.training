"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function EditGroupPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [captions, setCaptions] = useState<any[]>([]);

  const [newText, setNewText] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const module = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("module")
    : null;

  // Load slide groups for this module
  useEffect(() => {
    if (!module) return;
    (async () => {
      const { data } = await supabase
        .from("course_slide_groups")
        .select("*")
        .eq("module_id", module)
        .order("created_at", { ascending: true });

      if (data) setGroups(data);
    })();
  }, [module]);

  // Load captions when group changes
  useEffect(() => {
    if (!groupId) return;
    loadCaptions();
  }, [groupId]);

  async function loadCaptions() {
    const { data } = await supabase
      .from("course_captions")
      .select("*")
      .eq("slide_group_id", groupId)
      .order("line_number", { ascending: true });

    if (data) setCaptions(data);
  }

  /** ─── ADD CAPTION ─────────────────────────────────── */
  async function addCaption() {
    if (!newText.trim() || !groupId) return;

    const nextLine = captions.length + 1;

    await supabase.from("course_captions").insert([
      { slide_group_id: groupId, text: newText.trim(), line_number: nextLine },
    ]);

    setNewText("");
    loadCaptions();
  }

  /** ─── EDIT CAPTION ─────────────────────────────────── */
  function startEdit(index: number) {
    setEditingIndex(index);
    setEditText(captions[index].text);
  }

  async function saveEdit(index: number) {
    const caption = captions[index];

    await supabase
      .from("course_captions")
      .update({ text: editText })
      .eq("id", caption.id);

    setEditingIndex(null);
    setEditText("");
    loadCaptions();
  }

  /** ─── DELETE CAPTION ───────────────────────────────── */
  async function deleteCaption(id: string) {
    if (!confirm("Delete this caption?")) return;

    await supabase.from("course_captions").delete().eq("id", id);

    // Reorder after delete
    const { data } = await supabase
      .from("course_captions")
      .select("*")
      .eq("slide_group_id", groupId)
      .order("line_number", { ascending: true });

    if (data) {
      await Promise.all(
        data.map((c: any, i: number) =>
          supabase
            .from("course_captions")
            .update({ line_number: i + 1 })
            .eq("id", c.id)
        )
      );
    }

    loadCaptions();
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-[#001f40]">Edit Slide Captions</h1>

      {/* Slide Group Picker */}
      <div>
        <label className="block text-sm font-semibold text-[#001f40] mb-1">
          Slide Group (Image)
        </label>

        <select
          className="border p-2 rounded w-full cursor-pointer"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
        >
          <option value="">Select a slide group...</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              Group #{g.sort_order ?? "(unnumbered)"} – {g.id.slice(0, 6)}
            </option>
          ))}
        </select>
      </div>

      {/* Caption List */}
      {groupId && (
        <>
          <h2 className="text-lg font-semibold text-[#001f40]">Captions</h2>

          <div className="border rounded bg-white divide-y">
            {captions.length === 0 && (
              <p className="p-3 text-gray-500 text-sm">No captions yet.</p>
            )}

            {captions.map((c, i) => (
              <div key={c.id} className="p-3 flex justify-between items-start">
                {/* Text or Edit Field */}
                {editingIndex === i ? (
                  <input
                    className="border p-1 rounded flex-1 mr-2"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                ) : (
                  <p className="text-sm flex-1 mr-2">
                    {i + 1}. {c.text}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {editingIndex === i ? (
                    <button
                      onClick={() => saveEdit(i)}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs cursor-pointer"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(i)}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs cursor-pointer"
                    >
                      Edit
                    </button>
                  )}

                  <button
                    onClick={() => deleteCaption(c.id)}
                    className="px-2 py-1 bg-red-600 text-white rounded text-xs cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Caption */}
          <div className="mt-4 flex gap-2">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="border p-2 rounded flex-1"
              placeholder="Enter caption text..."
            />
            <button
              onClick={addCaption}
              className="px-4 py-2 bg-[#ca5608] text-white rounded hover:bg-[#a34505] cursor-pointer"
            >
              Add
            </button>
          </div>
        </>
      )}
    </div>
  );
}
