"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil } from "lucide-react";

export default function SortableRow({
  module,
  onEdit,
}: {
  module: { id: string; title: string };
  onEdit?: (module: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-white p-3 border-b cursor-default"
      {...attributes}
    >
      {/* Drag handle */}
      <div
        className="cursor-grab pr-3 text-gray-400 hover:text-gray-600"
        {...listeners}
      >
        ⋮⋮
      </div>

      {/* Title */}
      <span className="font-medium text-[#001f40] flex-1">
        {module.title}
      </span>

      {/* Edit Pencil */}
      <Pencil
        size={16}
        className="text-gray-500 hover:text-[#001f40] cursor-pointer ml-3"
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.(module);
        }}
      />
    </div>
  );
}
