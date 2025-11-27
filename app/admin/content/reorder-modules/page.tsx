"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { ReactSortable } from "react-sortablejs";

type Module = {
  id: string;
  title: string;
  sort_order: number;
};

export default function ReorderModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [saving, setSaving] = useState(false);

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
      .upsert(normalized, { onConflict: "id", ignoreDuplicates: false });

    setSaving(false);
    setShowWarning(false);

    if (error) {
      console.error(error);
      return alert("❌ Failed to update order");
    }

    alert("✔ Order updated successfully");
    load();
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
          </tr>
        </thead>

        {/* IMPORTANT: ReactSortable must wrap rows as <tbody> */}
        <ReactSortable
          tag="tbody"
          list={modules}
          setList={onDrag}
          animation={200}
          handle=".drag-handle"
        >
          {modules.map((m) => (
            <tr key={m.id} className="border-t cursor-move">
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
                <span className="drag-handle text-gray-400 hover:text-gray-600 cursor-grab">
                  ⋮⋮
                </span>
                {m.title}
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

      {showWarning && (
        <WarningModal
          saving={saving}
          onClose={() => setShowWarning(false)}
          onConfirm={saveFinal}
        />
      )}
    </div>
  );
}

/* ───────────────────── WARNING MODAL ───────────────────── */
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
          Changing module order will affect the course flow and how students complete lessons.
          Please proceed with caution.
        </p>

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 border rounded text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-3 py-1 bg-[#ca5608] text-white rounded text-sm disabled:opacity-50"
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
