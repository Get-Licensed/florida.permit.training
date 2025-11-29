"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function SortableSlideRow({ slide }: { slide: any }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: slide.id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-white border rounded px-3 py-2 shadow-sm hover:bg-gray-50"
    >
      {/* drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-400 pr-3"
      >
        ⋮⋮
      </div>

      {/* slide preview */}
      <div className="flex-1 text-sm text-[#001f40] line-clamp-1">
        {slide.content}
      </div>

      {/* edit/delete */}
      <div className="flex gap-2 ml-3">
        <button
          className="text-[#ca5608] underline text-xs"
          onClick={() => alert(`TODO: open slide edit modal for ${slide.id}`)}
        >
          Edit
        </button>
        <button
          className="text-red-600 underline text-xs"
          onClick={() => alert(`TODO: delete slide ${slide.id}`)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
