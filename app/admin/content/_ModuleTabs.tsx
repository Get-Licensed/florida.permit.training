"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { Pencil } from "lucide-react";

type Module = {
  id: string;
  title: string;
  sort_order: number;
};

export default function ModuleTabs({
  onChange,
  onEdit,
}: {
  onChange?: (id: string) => void;
  onEdit?: (m: Module) => void;
}) {
  const [modules, setModules] = useState<Module[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    load();
    window.addEventListener("refresh-modules", load);
    return () => window.removeEventListener("refresh-modules", load);
  }, []);

  async function load() {
    const { data } = await supabase
      .from("modules")
      .select("id, title, sort_order")
      .order("sort_order", { ascending: true });

    setModules(data ?? []);
  }

  function select(m: Module) {
    setActive(m.id);
    onChange && onChange(m.id);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {modules.map((m) => {
        const isActive = active === m.id;

        return (
          <div
            key={m.id}
            className={`px-3 py-1 rounded cursor-pointer text-sm border flex items-center gap-2
            ${isActive ? "bg-[#001f40] text-white" : "bg-white text-[#001f40] hover:bg-gray-100"}`}
            onClick={() => select(m)}
          >
            <span>{m.title}</span>

            {/* Sort Badge */}
            <span
              className={`text-[10px] px-2 py-[1px] rounded-full font-semibold
              ${isActive ? "bg-white text-[#ca5608]" : "bg-[#ca5608] text-white"}`}
            >
              {m.sort_order}
            </span>

            <Pencil
              size={13}
              onClick={(e) => {
                e.stopPropagation();
                onEdit && onEdit(m);
              }}
              className={`opacity-80 hover:opacity-100
                ${isActive ? "text-white" : "text-[#001f40]"}`}
            />
          </div>
        );
      })}
    </div>
  );
}
