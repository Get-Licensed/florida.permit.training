"use client";

import { useState } from "react";

export default function BulkImportPanel({
  lessonId,
  onComplete,
}: {
  lessonId: string;
  onComplete: () => void;
}) {
  const [rawText, setRawText] = useState("");
  const [slides, setSlides] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  function parseSlides(text: string) {
    // Split by *two* newlines = new slide
    const parsed = text
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    setSlides(parsed);
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setRawText(text);
    parseSlides(text);
  }

  async function saveSlides() {
    if (!slides.length) return;
    setIsSaving(true);

    const res = await fetch("/admin/slides/bulk-import", {
      method: "POST",
      body: JSON.stringify({
        lessonId,
        slides,
      }),
    });

    setIsSaving(false);
    if (res.ok) onComplete();
  }

  return (
    <div className="border rounded p-4 bg-white shadow">
      <h2 className="font-semibold text-lg text-[#001f40] mb-3">
        Bulk Import Slides
      </h2>

      <input
        type="file"
        accept=".txt"
        onChange={handleUploadFile}
        className="mb-4"
      />

      <textarea
        value={rawText}
        onChange={(e) => {
          setRawText(e.target.value);
          parseSlides(e.target.value);
        }}
        className="w-full h-40 border p-2 rounded"
        placeholder="Paste slides here (blank line = new slide)..."
      />

      <div className="my-3 text-sm text-gray-600">
        {slides.length} slide(s) detected
      </div>

      <button
        disabled={!slides.length || isSaving}
        onClick={saveSlides}
        className="px-4 py-2 bg-[#001f40] text-white rounded disabled:opacity-50"
      >
        {isSaving ? "Saving..." : "Save Slides"}
      </button>

      {/* Preview */}
      {slides.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium text-[#001f40] mb-2">Preview</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {slides.map((s, i) => (
              <div
                key={i}
                className="border rounded p-2 bg-gray-50 text-sm whitespace-pre-wrap"
              >
                <div className="font-semibold text-xs mb-1 text-[#ca5608]">
                  Slide {i + 1}
                </div>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
