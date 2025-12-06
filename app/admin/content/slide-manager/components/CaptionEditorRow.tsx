"use client";

import { useState } from "react";
import { Caption } from "./types";

type Props = {
  cap: Caption;
  onSave: (text: string) => void;
  onGenerateAudio: () => Promise<void>;
  onResetAudio: () => void;
};

export default function CaptionEditorRow({
  cap,
  onSave,
  onGenerateAudio,
  onResetAudio,
}: Props) {
  const [value, setValue] = useState(cap.caption || "");
  const [saving, setSaving] = useState(false);

  // SINGLE AUDIO GENERATION PROGRESS
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [singleProgress, setSingleProgress] = useState(0);

  async function handleSave() {
    setSaving(true);
    await onSave(value);
    setSaving(false);
  }

  async function handleGenerateAudio() {
    setIsGeneratingSingle(true);
    setSingleProgress(0);

    // Smooth animation to ~80%
    let p = 0;
    const interval = setInterval(() => {
      p += 7;
      setSingleProgress(p);
      if (p >= 80) clearInterval(interval);
    }, 120);

    await onGenerateAudio();

    clearInterval(interval);
    setSingleProgress(100);

    setTimeout(() => {
      setIsGeneratingSingle(false);
      setSingleProgress(0);
    }, 500);
  }

  return (
    <div className="w-full p-3 border border-gray-300 rounded-lg bg-white">
      {/* TEXTAREA */}
      <textarea
        className="
          w-full
          p-3
          border border-gray-300
          rounded-lg
          bg-white
          shadow-sm
          text-xs
          focus:outline-none
          focus:ring-2
          focus:ring-[#ca5608]
        "
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
      />

      {/* ACTION BAR */}
      <div className="flex justify-end mt-2">
        <div className="flex items-center gap-3">

          {/* GENERATE AUDIO BUTTON WITH PROGRESS BAR */}
          <button
            type="button"
            onClick={handleGenerateAudio}
            disabled={isGeneratingSingle}
            className="
              relative
              px-3 py-1.5
              text-xs
              rounded
              overflow-hidden
              text-white
              cursor-pointer
              w-40
              bg-[#ca5608]
              hover:bg-[#fc7212]
              disabled:opacity-90
              disabled:cursor-not-allowed
            "
          >
            {/* ORANGE PROGRESS LAYER */}
            {isGeneratingSingle && (
              <div
                className="absolute inset-0 bg-[#fc7212] transition-all duration-200"
                style={{ width: `${singleProgress}%` }}
              />
            )}

            {/* LABEL */}
            <span className="relative z-10">
              {isGeneratingSingle ? "Generating…" : "Generate Caption Audio"}
            </span>
          </button>

          {/* RESET CAPTION AUDIO */}
          <button
            type="button"
            onClick={onResetAudio}
            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 cursor-pointer"
          >
            Reset Caption Audio
          </button>

          {/* SAVE */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 bg-[#001f40] text-white text-xs rounded hover:bg-[#003266] disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Caption"}
          </button>

        </div>
      </div>
    </div>
  );
}
