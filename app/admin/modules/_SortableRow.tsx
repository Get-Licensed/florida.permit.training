"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useState } from "react";

type Module = { id: string; title: string; sort_order?: number };

// -------------------------------------------------------
// SORTABLE ROW — drag handle only (no arrows)
// -------------------------------------------------------
function SortableRow({
  module,
  onEdit,
}: {
  module: Module;
  onEdit?: (module: Module) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: "white",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3"
    >
      {/* Drag + title */}
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical size={18} />
        </button>

        <span
          onClick={() => onEdit && onEdit(module)}
          className="cursor-pointer text-[#001f40] font-medium hover:underline"
        >
          {module.title}
        </span>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// MODULE LIST — only drag-and-drop supported
// -------------------------------------------------------
export default function ModuleList({
  initialModules,
  onEdit,
  onUpdated,
}: {
  initialModules: Module[];
  onEdit?: (module: Module) => void;
  onUpdated?: () => void;
}) {
  const [modules, setModules] = useState(initialModules);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function saveOrder(newList: Module[]) {
    setModules(newList);

    const res = await fetch("/admin/modules/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        newList.map((m, index) => ({
          id: m.id,
          sort_order: index + 1,
        }))
      ),
    });

    if (res.ok && onUpdated) onUpdated();
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newList = arrayMove(modules, oldIndex, newIndex);
    saveOrder(newList);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={modules.map((m) => m.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="border rounded bg-white divide-y">
          {modules.map((m) => (
            <SortableRow key={m.id} module={m} onEdit={onEdit} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
