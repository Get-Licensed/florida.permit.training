"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { v4 as uuidv4 } from "uuid";

export default function NewSlidePage() {
  const router = useRouter();
  const params = useSearchParams();
  const lessonId = params.get("lesson");

  const [modules, setModules] = useState<any[]>([]);
  const [moduleId, setModuleId] = useState<string>("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [caption, setCaption] = useState("");
  const [seconds, setSeconds] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ───────── LOAD MODULES ───────── */
  useEffect(() => {
    async function loadModules() {
      const { data } = await supabase
        .from("modules")
        .select("id, title")
        .order("sort_order", { ascending: true });

      setModules(data || []);
    }
    loadModules();
  }, []);

  /* ───────── HANDLE FILE UPLOAD ───────── */
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;

    if (file && file.size > 1024 * 1024) {
      setError("Max file size is 1MB.");
      return;
    }

    setImageFile(file);
    setError("");

    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  /* ───────── SAVE SLIDE + GROUP + CAPTION ───────── */
  async function handleSave() {
    if (!lessonId) return alert("Error: No lesson selected.");
    if (!moduleId) return setError("Please choose a module.");
    if (!imageFile) return setError("Please upload an image.");
    if (!caption.trim()) return setError("Caption required.");

    setSaving(true);
    setError("");

    try {
      /* 1) Upload image */
      const filename = `${uuidv4()}-${imageFile.name}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("uploads")
        .upload(filename, imageFile);
      if (uploadErr) throw uploadErr;

      const imageUrl = uploadData?.path;

      /* 2) Create slide group tied to lesson */
      const { data: group, error: groupError } = await supabase
        .from("course_slide_groups")
        .insert([
          {
            lesson_id: lessonId,
            module_id: moduleId,
            image_url: imageUrl,
            sort_order: 1,
          },
        ])
        .select()
        .single();

      if (groupError) throw groupError;

      /* 3) Create first caption under that group */
      const { error: captionError } = await supabase
        .from("lesson_slides")
        .insert([
          {
            lesson_id: lessonId,
            module_id: moduleId,
            group_key: group.id,
            caption: caption.trim(),
            display_seconds: seconds,
            order_index: 1,
          },
        ]);

      if (captionError) throw captionError;

      alert("Slide created!");
      router.push(`/admin/content?module=${moduleId}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to save slide.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto space-y-6 bg-white shadow rounded-lg">
      <h1 className="text-2xl font-bold text-[#001f40]">Create New Slide</h1>

      {/* MODULE SELECT */}
      <div>
        <label className="block text-sm font-medium mb-1 text-[#001f40]">
          Module
        </label>
        <select
          className="border rounded px-3 py-2 w-full cursor-pointer"
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
        >
          <option value="">Select module...</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>

      {/* IMAGE UPLOAD */}
      <div>
        <label className="block text-sm font-medium mb-1 text-[#001f40]">
          Slide Image (max 1MB)
        </label>

        <div
          onClick={() => document.getElementById("fileInput")?.click()}
          className="border border-dashed border-gray-400 rounded-md flex items-center justify-center h-40 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="object-cover max-h-full rounded-md" />
          ) : (
            <span className="text-gray-500">Choose Image...</span>
          )}
        </div>

        <input
          id="fileInput"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* CAPTION */}
      <div>
        <label className="block text-sm font-medium mb-1 text-[#001f40]">
          Caption Text
        </label>
        <textarea
          className="border p-2 w-full rounded"
          rows={3}
          placeholder="Enter caption text..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </div>

      {/* SECONDS */}
      <div>
        <label className="block text-sm font-medium mb-1 text-[#001f40]">
          Display Duration (seconds)
        </label>
        <input
          type="number"
          min={1}
          value={seconds}
          onChange={(e) => setSeconds(parseInt(e.target.value))}
          className="border p-2 rounded w-24"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* SAVE BUTTON */}
      <button
        disabled={saving}
        onClick={handleSave}
        className={`px-6 py-2 rounded text-white w-full font-semibold mt-3 ${
          saving ? "bg-gray-400 cursor-not-allowed" : "bg-[#001f40] hover:bg-[#003266] cursor-pointer"
        }`}
      >
        {saving ? "Saving..." : "Save Slide"}
      </button>
    </div>
  );
}
