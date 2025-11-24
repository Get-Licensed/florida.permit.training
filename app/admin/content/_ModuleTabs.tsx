"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

type ModuleRow = {
  id: string;
  title: string;
  sort_order: number | null;
};

export default function ModuleTabs({
  onChange,
}: {
  onChange?: (id: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedModule = searchParams.get("module") || null;

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch modules on load
  useEffect(() => {
    async function loadModules() {
      const { data, error } = await supabase
        .from("modules")
        .select("id, title, sort_order")
        .order("sort_order", { ascending: true });

      if (!error && data) setModules(data);
      setLoading(false);
    }
    loadModules();
  }, []);

  // Click handler
  function handleSelect(id: string) {
    // Notify parent page
    if (onChange) onChange(id);

    const params = new URLSearchParams(window.location.search);
    params.set("module", id);
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="mb-4">
      <h2 className="font-semibold mb-2 text-[#001f40]">Modules</h2>

      <div
        className="
          flex flex-wrap gap-2 p-2
          bg-white border border-gray-200 rounded-lg
          min-h-[52px]
        "
      >
        {loading && (
          <p className="text-sm text-gray-500">Loading modules...</p>
        )}

        {!loading && modules.length === 0 && (
          <p className="text-sm text-gray-500">No modules created yet.</p>
        )}

        {modules.map((m) => {
          const isActive = m.id === selectedModule;
          return (
            <button
              key={m.id}
              onClick={() => handleSelect(m.id)}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-full transition
                border border-[#001f40]
                ${
                  isActive
                    ? "bg-[#001f40] text-white"
                    : "bg-white text-[#001f40] hover:bg-[#001f40] hover:text-white"
                }
              `}
              style={{ cursor: "pointer" }}
            >
              {m.title}
            </button>
          );
        })}
      </div>

      {/* ADD NEW MODULE LINK */}
      <div className="mt-2 text-right">
        <a
          href="/admin/modules/new"
          className="text-sm px-3 py-1 rounded bg-[#001f40] text-white hover:bg-[#003266] transition"
          style={{ cursor: "pointer" }}
        >
          + Add Module
        </a>
      </div>
    </div>
  );
}
