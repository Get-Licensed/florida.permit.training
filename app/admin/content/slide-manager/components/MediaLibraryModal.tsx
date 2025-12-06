"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { Search } from "lucide-react";

/* ───────────────────────── MEDIA ITEM ───────────────────────── */
function MediaItem({
  file,
  url,
  applying,
  onSelectFinal,
  onView,
}: {
  file: any;
  url: string;
  applying: boolean;
  onSelectFinal: () => void;
  onView: () => void;
}) {
  const [meta, setMeta] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setMeta({ w: img.width, h: img.height });
    img.src = url;
  }, [url]);

  const sizeKB = file.metadata?.size
    ? `${(file.metadata.size / 1024).toFixed(0)} KB`
    : "N/A";

  return (
    <div
      className={`border rounded relative flex flex-col justify-between hover:shadow-lg transition ${
        applying ? "pointer-events-none opacity-50" : ""
      }`}
    >
      {/* ZOOM BUTTON */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onView();
        }}
        className="absolute top-1 left-1 bg-white/70 backdrop-blur-sm p-1 rounded-full hover:bg-gray-200 shadow-sm transition"
      >
        <Search size={12} className="text-[#001f40] opacity-80" />
      </button>

      {/* IMAGE THUMBNAIL */}
      <div className="cursor-pointer w-full aspect-[16/9] bg-gray-100 overflow-hidden rounded-t">
        <img src={url} className="w-full h-full object-cover" />
      </div>

      {/* FILE NAME */}
      <div className="px-2 pt-1 text-[11px] text-center break-all">{file.name}</div>

      {/* DIMENSIONS + SIZE */}
      {meta && (
        <div className="text-[11px] text-gray-600 text-center pb-1">
          {meta.w}×{meta.h} • {sizeKB}
        </div>
      )}

      {/* SELECT BUTTON */}
      <button
        onClick={onSelectFinal}
        className="bg-[#001f40] text-white text-xs py-1 rounded-b hover:bg-[#003266] transition"
      >
        Select
      </button>
    </div>
  );
}

/* ───────────────────────── MODAL ───────────────────────── */
export default function MediaLibraryModal({
  open,
  onClose,
  onSelect,
  applying = false,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  applying?: boolean;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewImage, setViewImage] = useState<string | null>(null);

  /* LOAD FILES */
  async function loadFiles() {
    const { data } = await supabase.storage
      .from("uploads")
      .list("slides", { limit: 5000 });

    if (data) {
      const sorted = data.sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
      setItems(sorted);
    }
  }

  useEffect(() => {
    if (open) loadFiles();
  }, [open]);

  /* UPLOAD */
  async function handleUpload(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const filePath = `slides/${Date.now()}-${file.name}`;
    await supabase.storage.from("uploads").upload(filePath, file);

    await loadFiles();
    setUploading(false);
  }

  /* FILTER SEARCH */
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter((f) => f.name.toLowerCase().includes(s));
  }, [search, items]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[1600] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-[80vw] h-[80vh] p-5 flex flex-col relative overflow-hidden">

        {/* APPLYING OVERLAY */}
        {applying && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-[2000]">
            <div className="h-14 w-14 border-4 border-[#ca5608] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#001f40] mt-3">Applying image…</p>
          </div>
        )}

        {/* FULLSCREEN IMAGE VIEWER */}
        {viewImage && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[3000]"
            onClick={() => setViewImage(null)}
          >
            <img
              src={viewImage}
              className="max-w-[90vw] max-h-[90vh] rounded shadow-xl"
            />
          </div>
        )}

        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-4">

          {/* LEFT SECTION: SEARCH + UPLOAD */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search filenames..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded px-3 py-1 w-60 text-sm"
            />

            <label className="bg-[#001f40] text-white px-3 py-1 rounded cursor-pointer hover:bg-[#003266] text-sm">
              {uploading ? "Uploading…" : "Upload"}
              <input type="file" className="hidden" onChange={handleUpload} />
            </label>
          </div>

          {/* RIGHT SECTION: CLOSE */}
          <button onClick={onClose} className="text-2xl cursor-pointer leading-none">✕</button>
        </div>

        {/* GRID */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {filtered.map((file) => {
              const path = `slides/${file.name}`;
              const url = supabase.storage
                .from("uploads")
                .getPublicUrl(path).data.publicUrl;

              return (
                <MediaItem
                  key={file.name}
                  file={file}
                  url={url}
                  applying={applying}
                  onSelectFinal={() => onSelect(path)}
                  onView={() => setViewImage(url)}
                />
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p className="text-gray-400 text-sm mt-6 text-center">
              No files match your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
