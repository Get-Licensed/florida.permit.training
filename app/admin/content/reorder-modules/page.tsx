"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { ReactSortable } from "react-sortablejs";
import { Trash2 } from "lucide-react";

type Module = {
  id: string;
  title: string;
  sort_order: number;
};

export default function ReorderModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [saving, setSaving] = useState(false);

  // delete modal
  const [deleteModuleId, setDeleteModuleId] = useState<string | null>(null);
  const [deleteModuleTitle, setDeleteModuleTitle] = useState<string>("");

  /* ───────────────────── LOAD MODULES ───────────────────── */
  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("modules")
      .select("id, title, sort_order")
      .order("sort_order", { ascending: true });

    setModules(data ?? []);
  }

  /* ───────────────────── UPDATE ORDER (NUMBER INPUT) ───────────────────── */
  function updateOrder(id: string, value: number | string) {
    const num = parseInt(value as string, 10);
    if (isNaN(num)) return;

    setModules((prev) => {
      const count = prev.length;
      const targetPos = Math.min(Math.max(num, 1), count);
      const currentIndex = prev.findIndex((m) => m.id === id);
      if (currentIndex === -1) return prev;

      const arr = [...prev];
      const [moved] = arr.splice(currentIndex, 1);
      arr.splice(targetPos - 1, 0, moved);

      return arr.map((m, idx) => ({ ...m, sort_order: idx + 1 }));
    });
  }

  /* ───────────────────── DRAG UPDATE ───────────────────── */
  function onDrag(newList: Module[]) {
    setModules(newList.map((m, idx) => ({ ...m, sort_order: idx + 1 })));
  }

  /* ───────────────────── SAFETY ON BLUR ───────────────────── */
  function fixOnBlur(id: string) {
    setModules((prev) => {
      const count = prev.length;
      return prev.map((m) => {
        if (m.id !== id) return m;
        if (m.sort_order < 1) return { ...m, sort_order: 1 };
        if (m.sort_order > count) return { ...m, sort_order: count };
        return m;
      });
    });
  }

  /* ───────────────────── SAVE ORDER TO DB ───────────────────── */
  async function saveFinal() {
    setSaving(true);

    const normalized = modules.map((m, idx) => ({
      id: m.id,
      sort_order: idx + 1,
      title: m.title,
    }));

    const { error } = await supabase
      .from("modules")
      .upsert(normalized, { onConflict: "id" });

    setSaving(false);
    setShowWarning(false);

    if (error) {
      console.error(error);
      return alert("❌ Failed to update order");
    }
    load();
  }

  /* ───────────────────── DELETE MODULE ───────────────────── */
  async function deleteModule() {
    if (!deleteModuleId) return;

    try {
      // Delete slides → lessons → module (cascade chain)
      const { data: lessonRows } = await supabase
        .from("lessons")
        .select("id")
        .eq("module_id", deleteModuleId);

      if (lessonRows?.length) {
        const lessonIds = lessonRows.map((l: any) => l.id);

        await supabase.from("lesson_slides").delete().in("lesson_id", lessonIds);
        await supabase.from("lessons").delete().in("id", lessonIds);
      }

      await supabase.from("modules").delete().eq("id", deleteModuleId);

      setDeleteModuleId(null);
      load();
    } catch (err: any) {
      console.error(err);
      alert("❌ Failed to delete module");
    }
  }

  /* ───────────────────── UI ───────────────────── */
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-[#001f40] mb-4">
        Reorder Modules (Admin Only)
      </h1>

      <table className="w-full border text-sm rounded overflow-hidden">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-2 w-20">Order</th>
            <th className="p-2">Title</th>
            <th className="p-2 w-10"></th>
          </tr>
        </thead>

      <ReactSortable
        tag="tbody"
        list={modules}
        setList={onDrag}
        animation={200}
      >
        {modules.map((m) => (
          <tr
            key={m.id}
            className="border-t cursor-grab hover:bg-gray-100 active:cursor-grabbing"
          >
            <td className="p-2">
              <input
                type="number"
                className="w-16 border px-1 rounded"
                value={m.sort_order}
                onChange={(e) => updateOrder(m.id, e.target.value)}
                onBlur={() => fixOnBlur(m.id)}
              />
            </td>

            <td className="p-2 flex items-center gap-2">
              {/* Drag icon — now cosmetic only */}
              <span className="text-gray-400 hover:text-gray-600">
                ⋮⋮
              </span>

              {m.title}
            </td>

            <td className="p-2 text-right">
              <Trash2
                size={16}
                className="text-red-500 hover:text-red-700 cursor-pointer"
                onClick={() => {
                  setDeleteModuleId(m.id);
                  setDeleteModuleTitle(m.title);
                }}
              />
            </td>
          </tr>
        ))}
      </ReactSortable>
      </table>

      <div className="flex justify-end gap-3 mt-5">
        <button className="px-3 py-1 border rounded" onClick={() => history.back()}>
          Cancel
        </button>
        <button
          className="px-4 py-1.5 bg-[#ca5608] text-white rounded"
          onClick={() => setShowWarning(true)}
        >
          Save Order
        </button>
      </div>

      {/* SAVE WARNING MODAL */}
      {showWarning && (
        <WarningModal
          saving={saving}
          onClose={() => setShowWarning(false)}
          onConfirm={saveFinal}
        />
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteModuleId && (
        <DeleteModuleModal
          title={deleteModuleTitle}
          onClose={() => setDeleteModuleId(null)}
          onConfirm={deleteModule}
        />
      )}
    </div>
  );
}

/* ───────────────────── DELETE MODAL ───────────────────── */
function DeleteModuleModal({
  title,
  onClose,
  onConfirm,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1600]">
      <div className="bg-white p-6 rounded-lg w-[380px] shadow-lg">
        <h3 className="text-lg font-bold text-red-700 mb-3">Delete Module?</h3>

        <p className="text-sm text-gray-800 mb-3">
          Deleting <strong>{title}</strong> will permanently delete:
        </p>

        <ul className="list-disc pl-6 text-sm text-gray-700 mb-3">
          <li>All lessons in this module</li>
          <li>All slides in those lessons</li>
        </ul>

        <p className="text-sm text-red-600 font-semibold">
          This action cannot be undone.
        </p>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1 border rounded text-sm">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-800"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── SAVE WARNING MODAL ───────────────────── */
function WarningModal({
  saving,
  onClose,
  onConfirm,
}: {
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1500]">
      <div className="bg-white p-6 rounded-lg w-[350px] shadow-lg">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Warning!</h3>
        <p className="text-sm text-gray-700 mb-4">
          Changing module order affects course flow. Proceed with caution.
        </p>

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 border rounded text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-3 py-1 bg-[#ca5608] text-white rounded text-sm"
            disabled={saving}
            onClick={onConfirm}
          >
            {saving ? "Saving..." : "Yes, Update Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
