"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";

type ModuleRow = {
  id: string;
  title: string;
  sort_order: number;
};

export default function ModuleTabsSortable({
  onChange
}: {
  onChange?: (id: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedModule = searchParams.get("module") || null;

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* ───────── LOAD MODULES ───────── */
  async function loadModules() {
    const { data } = await supabase
      .from("modules")
      .select("id, title, sort_order")
      .order("sort_order", { ascending: true });

    if (data) setModules(data);
    setLoading(false);
  }

  useEffect(() => {
    loadModules();
  }, []);

  /* 🔄 LISTEN for GLOBAL refresh (when module titles change elsewhere) */
  useEffect(() => {
    function refresh() {
      loadModules();
    }
    window.addEventListener("refresh-modules", refresh);
    return () => window.removeEventListener("refresh-modules", refresh);
  }, []);

  /* ───────── SELECT MODULE ───────── */
  function handleSelect(id: string) {
    if (onChange) onChange(id);

    const params = new URLSearchParams(window.location.search);
    params.set("module", id);
    router.replace(`?${params.toString()}`);
  }

  /* ───────── SAVE ORDER ───────── */
  async function saveOrder(newList: ModuleRow[]) {
    setModules(newList);

    const payload = newList.map((m, i) => ({
      id: m.id,
      sort_order: i + 1,
    }));

    await fetch("/admin/modules/reorder", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Notify global listeners
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("refresh-modules"));
    }
  }

  /* ───────── UI ───────── */
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 mb-4">
      {loading && <p className="text-sm text-gray-500">Loading modules...</p>}
      {!loading && modules.length === 0 && (
        <p className="text-sm text-gray-500">No modules created yet.</p>
      )}

      {!loading && (
        <Reorder.Group
          axis="x"
          values={modules}
          onReorder={saveOrder}
          className="flex flex-wrap gap-2 select-none"
        >
          {modules.map((m: ModuleRow, index: number) => {
            const isActive = m.id === selectedModule;
            return (
              <Reorder.Item
                key={m.id}
                value={m}
                drag
                dragElastic={0.12}
                dragMomentum={false}
                className={`
                  relative flex items-center gap-2 px-4 py-1.5 text-sm font-medium 
                  rounded-full transition border cursor-pointer select-none
                  ${
                    isActive
                      ? "bg-[#001f40] border-[#001f40] text-white"
                      : "bg-white text-[#001f40] border-[#001f40] hover:bg-[#001f40] hover:text-white"
                  }
                `}
                onClick={() => handleSelect(m.id)}
              >
                {/* Orange Sort Badge */}
                <span className="absolute -top-1.5 -right-1.5 bg-[#ca5608] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border border-white">
                  {index + 1}
                </span>

                {/* Drag Handle */}
                <GripVertical size={14} className="text-gray-400" />

                {m.title}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      )}
    </div>
  );
}
