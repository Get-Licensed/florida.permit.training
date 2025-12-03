"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { Pencil, Trash2 } from "lucide-react";

type Module = {
  id: string;
  title: string;
  sort_order: number;
};

export default function ModuleTabs({
  onChange,
  onEdit,
  onDelete,
}: {
  onChange?: (id: string) => void;
  onEdit?: (m: Module) => void;
  onDelete?: (id: string) => void;
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
    onChange?.(m.id);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {modules.map((m) => {
        const isActive = active === m.id;

        return (
          <div
            key={m.id}
            className={`
              flex justify-between items-center py-2 px-3 rounded cursor-pointer 
              text-sm transition border w-fit
              ${
                isActive
                  ? "bg-[#001f40] text-white border-[#001f40]"
                  : "bg-white text-gray-800 hover:bg-gray-100 border-gray-200"
              }
            `}
            onClick={() => select(m)}
          >
            {/* LEFT: Title + Badge */}
            <div className="flex items-center gap-2">
              <span>{m.title}</span>

              {/* Sort Badge */}
              <span
                className={`
                  text-[10px] px-2 py-[1px] rounded-full font-semibold
                  ${
                    isActive
                      ? "bg-white text-[#ca5608]"
                      : "bg-[#ca5608] text-white"
                  }
                `}
              >
                {m.sort_order}
              </span>
            </div>

            {/* RIGHT: Icons */}
            <div className="flex items-center gap-3 ml-4">
              <Pencil
                size={15}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(m);
                }}
                className={`
                  ${
                    isActive
                      ? "text-white opacity-80 hover:opacity-100"
                      : "text-gray-500 hover:text-[#001f40]"
                  }
                `}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
