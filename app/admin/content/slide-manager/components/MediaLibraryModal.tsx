"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function MediaLibraryModal({
  open,
  onClose,
  onSelect,
  applying = false,       // NEW: parent passes “is applying”
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  applying?: boolean;     // NEW
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;

    async function load() {
      setLoading(true);

      const { data, error } = await supabase.storage
        .from("uploads")
        .list("slides", {
          limit: 200,
          sortBy: { column: "name", order: "asc" },
        });

      if (!error) setItems(data || []);
      setLoading(false);
    }

    load();
  }, [open]);

  async function handleUpload(e: any) {
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

    if (!error) {
      const { data } = await supabase.storage
        .from("uploads")
        .list("slides", { limit: 200 });

      setItems(data || []);
    }

    setUploading(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] overflow-auto p-4 relative">

        {/* OVERLAY SPINNER WHILE APPLYING */}
        {applying && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <div className="h-12 w-12 border-4 border-[#ca5608] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-[#001f40] mt-3">Applying image…</p>
          </div>
        )}

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Select Media</h2>

          <div className="flex items-center gap-3">
            {/* Upload Button */}
            <label className="bg-[#001f40] text-white px-3 py-1 rounded cursor-pointer hover:bg-[#003266] text-sm">
              {uploading ? "Uploading…" : "Upload New"}
              <input type="file" className="hidden" onChange={handleUpload} />
            </label>

            <button onClick={onClose} className="text-xl">✕</button>
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading…</p>}

        <div className="grid grid-cols-3 gap-4">
          {items.map((file) => {
            const path = `slides/${file.name}`;
            const url = supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;

            return (
              <div
                key={file.name}
                onClick={() => !applying && onSelect(path)}
                className={`cursor-pointer border rounded hover:shadow-md relative ${
                  applying ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <img
                  src={url}
                  className="w-full h-40 object-cover rounded-t"
                />
                <div className="p-2 text-xs text-center break-all">
                  {file.name}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
