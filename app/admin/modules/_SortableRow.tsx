"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function SortableRow({
  module,
  onEdit,
}: {
  module: { id: string; title: string };
  onEdit: (id: string) => void;
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

      {/* Edit Button */}
      <button
        onClick={() => onEdit(module.id)}
        className="text-sm px-2 py-1 rounded bg-[#ca5608] text-white hover:bg-[#a54406]"
      >
        Edit
      </button>
    </div>
  );
}
