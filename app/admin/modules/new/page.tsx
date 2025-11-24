"use client";

import { useState, ChangeEvent } from "react";
import Image from "next/image";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";

export default function NewModulePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // WordPress style safe filename
  function safeFilename(filename: string) {
    const name = filename.toLowerCase().replace(/\s+/g, "-");
    return name.replace(/[^a-z0-9.-]/g, "");
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setThumbnail(file);
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    setError("");

    if (!title.trim()) return setError("Title is required.");
    if (!thumbnail) return setError("Thumbnail image is required.");

    setSaving(true);

    try {
      // Create safe filename with timestamp suffix
      const safe = safeFilename(thumbnail.name);
      const finalName = `${Date.now()}-${safe}`;

      // Upload to /uploads/thumbnails/
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(`thumbnails/${finalName}`, thumbnail);

      if (uploadError) throw uploadError;
      const imagePath = uploadData.path;

      // Insert new module
      const { error: insertError } = await supabase.from("modules").insert([
        {
          title,
          description,
          thumbnail_path: imagePath,
        },
      ]);

      if (insertError) throw insertError;

      router.push("/admin/content");
    } catch (err: any) {
      console.error("SAVE ERROR:", err);
      setError(err.message ?? "Failed to save module.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 flex justify-center">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-lg">
        <h1 className="text-xl font-bold mb-4 text-[#001f40]">Add New Module</h1>

        <label className="block text-sm font-medium mb-2 text-[#001f40]">
          Thumbnail (16:9 recommended)
        </label>

        {/* WordPress-style Drop Select */}
        <div
            className="
                border border-dashed border-gray-400 rounded-md
                flex items-center justify-center h-40 bg-gray-50
                cursor-pointer hover:bg-gray-100 transition relative overflow-hidden
            "
            onClick={() => document.getElementById("thumbInput")?.click()}
            >
            {previewUrl ? (
                <Image
                src={previewUrl}
                alt="Preview"
                fill
                className="object-cover rounded-md"
                />
            ) : (
                <span className="text-gray-500">Choose Image...</span>
            )}
            </div>


        <input
          id="thumbInput"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <input
          type="text"
          placeholder="Module Title"
          className="border p-2 w-full rounded mt-4"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Module Description (optional)"
          className="border p-2 w-full rounded mt-3"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="
            bg-[#001f40] text-white w-full py-2 rounded font-semibold mt-4
            hover:bg-[#003266] transition cursor-pointer disabled:opacity-50
          "
        >
          {saving ? "Saving..." : "Save Module"}
        </button>
      </div>
    </div>
  );
}
