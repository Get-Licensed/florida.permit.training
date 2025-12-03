"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { Trash2, Search } from "lucide-react";

/* ------------------------------------------------------------------
   MAIN PAGE
------------------------------------------------------------------ */
export default function MediaLibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fullscreen Image View
  const [viewImage, setViewImage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  /* ---------------- LOAD FILES ---------------- */
  async function loadFiles() {
    setLoading(true);

    const { data, error } = await supabase.storage
      .from("uploads")
      .list("slides", {
        limit: 500,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (!error && data) setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    loadFiles();
  }, []);

  /* ---------------- UPLOAD ---------------- */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const filePath = `slides/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("uploads")
      .upload(filePath, file);

    if (error) {
      console.error(error);
      showToast("Upload failed");
      setUploading(false);
      return;
    }

    showToast("Upload complete");
    await loadFiles();
    setUploading(false);
  }

  /* ---------------- DELETE ---------------- */
  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);

    const filePath = `slides/${deleteTarget}`;

    const { error } = await supabase.storage
      .from("uploads")
      .remove([filePath]);

    if (error) {
      showToast("Error deleting");
      setDeleting(false);
      return;
    }

    setItems((prev) => prev.filter((i) => i.name !== deleteTarget));

    showToast("Deleted");
    setDeleting(false);
    setShowDeleteModal(false);
  }

  /* ---------------- SEARCH FILTER ---------------- */
  const filtered = items.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-3 py-2 rounded shadow z-[9999]">
          {toast}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 z-[9998] flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-lg w-[360px]">

            <h3 className="text-lg font-semibold text-[#001f40] mb-3">
              Delete Image?
            </h3>

            <p className="text-sm text-gray-700 mb-5">
              This will permanently delete the file.
              <br />
              <span className="font-semibold">This action cannot be undone.</span>
            </p>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Fullscreen Viewer */}
      {viewImage && (
        <div
          className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center"
          onClick={() => setViewImage(null)}
        >
          <img
            src={viewImage}
            className="max-w-[90vw] max-h-[90vh] rounded shadow-xl"
          />
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex justify-between items-center mb-6">

        <h1 className="text-2xl font-semibold text-[#001f40]">
          Media Library
        </h1>

        <div className="flex items-center gap-3">

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search..."
            className="border border-gray-300 rounded px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-[#ca5608]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Upload */}
          <label className="bg-[#001f40] text-white px-4 py-2 rounded cursor-pointer hover:bg-[#003266]">
            {uploading ? "Uploading…" : "Upload"}
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>

      {/* MEDIA GRID */}
      {loading ? (
        <p className="text-gray-500">Loading media…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No results.</p>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          {filtered.map((file) => {
            const path = `slides/${file.name}`;

            const url = supabase.storage
              .from("uploads")
              .getPublicUrl(path).data.publicUrl;

            return <MediaCard
              key={file.name}
              file={file}
              url={url}
              onDelete={() => {
                setDeleteTarget(file.name);
                setShowDeleteModal(true);
              }}
              onView={() => setViewImage(url)}
            />;
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   MEDIA CARD COMPONENT
------------------------------------------------------------------ */
function MediaCard({
  file,
  url,
  onDelete,
  onView,
}: {
  file: any;
  url: string;
  onDelete: () => void;
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
      className="
        bg-white border border-gray-300 rounded-xl
        shadow-sm hover:shadow-md transition p-3 relative
        flex flex-col gap-3
      "
    >

      {/* Magnifier Button */}
      <button
        onClick={onView}
        className="
          absolute top-2 left-2 bg-white/70 backdrop-blur-sm 
          p-1 rounded-full hover:bg-gray-200 shadow-sm transition
        "
      >
        <Search size={14} className="text-[#001f40] opacity-80" />
      </button>

      {/* Thumbnail */}
      <div className="w-full h-40 rounded-lg overflow-hidden shadow">
        <img src={url} className="w-full h-full object-cover" />
      </div>

      {/* Filename */}
      <div className="text-sm font-medium break-all">{file.name}</div>

      {/* Metadata */}
      {meta && (
        <div className="text-xs text-gray-600">
          {meta.w}×{meta.h} • {sizeKB}
        </div>
      )}

      {/* Delete Icon */}
      <div className="flex justify-end">
        <Trash2
          size={18}
          className="text-red-600 hover:text-red-700 cursor-pointer"
          onClick={onDelete}
        />
      </div>

    </div>
  );
}
  