"use client";

import { useState } from "react";

export default function BulkSlidesModal({
  lessonId,
  onClose,
  onImported,
}: {
  lessonId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [rawText, setRawText] = useState("");
  const [slides, setSlides] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function parse(text: string) {
    const arr = text
      .split(/\n\s*\n/)
      .map((x) => x.trim())
      .filter(Boolean);

    setSlides(arr);
  }

  async function save() {
    if (!slides.length) return;

    setSaving(true);

    await fetch("/admin/slides/bulk-import", {
      method: "POST",
      body: JSON.stringify({ lessonId, slides }),
    });

    setSaving(false);
    onImported();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-[600px] p-6 rounded shadow-xl">
        <h2 className="text-xl font-semibold text-[#001f40] mb-4">
          Bulk Import Slides
        </h2>

        <textarea
          className="w-full h-48 border rounded p-2 mb-3"
          placeholder="Paste slides here. Blank line = new slide."
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            parse(e.target.value);
          }}
        />

        <p className="text-sm text-gray-600 mb-4">
          {slides.length} slide(s) detected
        </p>

        <div className="flex justify-end gap-3">
          <button className="text-sm underline" onClick={onClose}>
            Cancel
          </button>

          <button
            disabled={!slides.length || saving}
            onClick={save}
            className="px-4 py-2 bg-[#ca5608] text-white rounded disabled:opacity-50"
          >
            {saving ? "Saving..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
