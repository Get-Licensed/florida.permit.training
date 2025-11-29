"use client";

import { useState } from "react";
import { Caption } from "./types";

export default function CaptionEditorRow({
  cap,
  onSave,
}: {
  cap: Caption;
  onSave: (text: string) => void;
}) {
  const [value, setValue] = useState(cap.caption || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(value);
    setSaving(false);
  }

  return (
    <div className="border p-3 rounded bg-gray-50">
      <textarea
        className="w-full p-2 border rounded"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
      />

      <div className="flex justify-end mt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-3 py-1 rounded text-white ${
            saving ? "bg-gray-400 cursor-not-allowed" : "bg-[#ca5608] cursor-pointer"
          }`}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

    </div>
  );
}
