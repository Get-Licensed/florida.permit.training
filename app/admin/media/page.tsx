"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function MediaLibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function loadFiles() {
    setLoading(true);

    const { data, error } = await supabase.storage
      .from("uploads")
      .list("slides", {
        limit: 500,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.error("Error loading files:", error);
    } else {
      setItems(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadFiles();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const filePath = `slides/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("uploads")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Error uploading:", error);
      showToast("Error uploading file");
      setUploading(false);
      return;
    }

    showToast("Upload complete");
    await loadFiles();
    setUploading(false);
  }

  async function handleDelete(name: string) {
    const confirmed = window.confirm("Delete this image?");
    if (!confirmed) return;

    const filePath = `slides/${name}`;

    const { data, error } = await supabase.storage
      .from("uploads")
      .remove([filePath]);

    if (error) {
      console.error("Error deleting file:", error);
      showToast("Error deleting file");
      return;
    }

    // Optimistically update UI
    setItems((prev) => prev.filter((item) => item.name !== name));
    showToast("Deleted");
  }

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-3 py-2 rounded shadow">
          {toast}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[#001f40]">
          Media Library
        </h1>

        <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
          {uploading ? "Uploading…" : "Upload Image"}
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading media…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No media found.</p>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          {items.map((file) => {
            const path = `slides/${file.name}`;
            const url =
              supabase.storage.from("uploads").getPublicUrl(path).data
                .publicUrl;

            return (
              <div
                key={file.name}
                className="border rounded shadow-sm bg-white"
              >
                <img
                  src={url}
                  className="w-full h-40 object-cover rounded-t"
                />

                <div className="p-3 text-sm flex flex-col gap-2">
                  <div className="font-medium break-all">{file.name}</div>

                  <button
                    onClick={() => handleDelete(file.name)}
                    className="text-red-600 text-xs underline text-left"
                  >
                    Delete
                  </button>

                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 text-xs underline"
                  >
                    Open
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
