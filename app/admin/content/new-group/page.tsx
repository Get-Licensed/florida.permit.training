"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { v4 as uuidv4 } from "uuid";

export default function NewSlideGroupPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [moduleId, setModuleId] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load modules for dropdown
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("modules").select("id,title");
      if (data) setModules(data);
    })();
  }, []);

  async function handleSave() {
    if (!imageFile || !moduleId) {
      alert("Please choose a module and image.");
      return;
    }

    setSaving(true);
    try {
      // 1) Upload Image
      const filename = `${uuidv4()}-${imageFile.name}`;
      const { data: upload, error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filename, imageFile);

      if (uploadError) throw uploadError;
      const imageUrl = upload.path;

      // 2) Create slide group (image + module)
      const { error: insertError } = await supabase
        .from("course_slide_groups")
        .insert([{ module_id: moduleId, image_url: imageUrl }]);

      if (insertError) throw insertError;

      alert("Slide Group Created! Now add captions.");
      window.location.href = `/admin/content/edit-group?module=${moduleId}`;
    } catch (err) {
      console.error("SAVE_ERROR:", err);
      alert("Upload failed. Check console for details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-[#001f40]">New Slide Group</h1>

      {/* MODULE SELECT */}
      <label className="block text-sm font-semibold text-[#001f40]">
        Module
      </label>
      <select
        className="border p-2 rounded w-full cursor-pointer"
        value={moduleId}
        onChange={(e) => setModuleId(e.target.value)}
      >
        <option value="">Select a module...</option>
        {modules.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>

      {/* UPLOAD BUTTON */}
      <div>
        <label className="block text-sm font-semibold text-[#001f40] mb-2">
          Image
        </label>
        <label
          className="px-4 py-2 bg-[#001f40] text-white rounded cursor-pointer inline-block hover:bg-[#003266]"
        >
          Choose Image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setImageFile(file);
              if (file) setPreviewUrl(URL.createObjectURL(file));
            }}
          />
        </label>
      </div>

      {/* PREVIEW */}
      {previewUrl && (
        <img
          src={previewUrl}
          className="max-w-sm mt-4 rounded shadow border"
        />
      )}

      {/* SAVE BUTTON */}
      <button
        disabled={saving}
        onClick={handleSave}
        className="px-6 py-2 bg-[#ca5608] text-white font-semibold rounded hover:bg-[#a34505] cursor-pointer disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Slide Group"}
      </button>
    </div>
  );
}
