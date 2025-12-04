"use client";

import { useState } from "react";
import { Caption } from "./types";

type Props = {
  cap: Caption;
  onSave: (text: string) => void;
  onGenerateAudio: () => void;
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

  async function handleSave() {
    setSaving(true);
    await onSave(value);
    setSaving(false);
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

        {/* GENERATE AUDIO */}
          <button
            type="button"
            onClick={onGenerateAudio}
            className="px-3 py-1.5 bg-[#ca5608] text-white text-xs rounded hover:bg-[#a14505] cursor-pointer"
          >
            Generate Caption Audio
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
