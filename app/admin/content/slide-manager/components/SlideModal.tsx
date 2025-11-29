"use client";

import { useState, useEffect } from "react";

export default function SlideModal({
  slide,
  lessonId,
  onClose,
  onSaved,
}: {
  slide?: any;
  lessonId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(slide?.content || "");
  const isEditing = !!slide;

  async function save() {
    const route = isEditing
      ? "/admin/slides/update"
      : "/admin/slides/create";

    await fetch(route, {
      method: "POST",
      body: JSON.stringify({
        id: slide?.id,
        lessonId,
        content,
      }),
    });

    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[500px] p-5 rounded shadow-lg">
        <h2 className="text-lg font-bold text-[#001f40] mb-3">
          {isEditing ? "Edit Slide" : "New Slide"}
        </h2>

        <textarea
          className="w-full border rounded p-2 h-40"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="flex justify-end gap-3 mt-4">
          <button className="text-sm underline" onClick={onClose}>
            Cancel
          </button>

          <button
            onClick={save}
            className="px-4 py-2 bg-[#001f40] text-white rounded text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
