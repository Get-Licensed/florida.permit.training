"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { ReactSortable } from "react-sortablejs";

type Module = { id: string; title: string; sort_order: number };

export default function ModuleTabsSortable({
  onSaved,
  onClose,
}: {
  onSaved: () => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Module[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("modules")
      .select("id, title, sort_order")
      .order("sort_order", { ascending: true });

    setItems(data ?? []);
  }

  async function saveOrder() {
    setSaving(true);

    const ids = items.map((m) => m.id);

    const { error } = await supabase.rpc("reorder_modules", {
      _ids: ids,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      return alert("❌ Failed to save order");
    }

    onSaved();
    onClose();
  }

  return (
    <div>
      <div className="border rounded-md max-h-[350px] overflow-y-auto">
        <ReactSortable list={items} setList={setItems} animation={200}>
          {items.map((m) => (
            <div
              key={m.id}
              className="p-2 border-b bg-white text-sm cursor-move hover:bg-gray-100"
            >
              {`${m.sort_order}. ${m.title}`}
            </div>
          ))}
        </ReactSortable>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-1 border rounded text-sm">
          Cancel
        </button>
        <button
          onClick={saveOrder}
          disabled={saving}
          className="px-4 py-1.5 bg-[#ca5608] text-white rounded text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Order"}
        </button>
      </div>
    </div>
  );
}
