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

// ---------------------------------------------------------------------------
// SORTABLE ROW (INLINE VERSION)
// ---------------------------------------------------------------------------
function SortableRow({
  module,
  onEdit,
  onMoveUp,
  onMoveDown,
}: {
  module: Module;
  onEdit?: (module: Module) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
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
      {/* LEFT: DRAG HANDLE + TITLE */}
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

      {/* RIGHT: UP + DOWN */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMoveUp}
          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
        >
          ▲
        </button>

        <button
          onClick={onMoveDown}
          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MODULE LIST
// ---------------------------------------------------------------------------
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

  // Save updated order to server
  async function saveOrder(newList: Module[]) {
    setModules(newList);

    const res = await fetch("/admin/modules/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        newList.map((m, i) => ({
          id: m.id,
          sort_order: i + 1,
        }))
      ),
    });

    if (res.ok && onUpdated) onUpdated();
  }

  // DRAG END
  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);

    const newOrder = arrayMove(modules, oldIndex, newIndex);
    saveOrder(newOrder);
  }

  // MOVE UP/DOWN BUTTON HANDLERS
  function moveUp(id: string) {
    const index = modules.findIndex((m) => m.id === id);
    if (index <= 0) return;

    const newOrder = arrayMove(modules, index, index - 1);
    saveOrder(newOrder);
  }

  function moveDown(id: string) {
    const index = modules.findIndex((m) => m.id === id);
    if (index === -1 || index >= modules.length - 1) return;

    const newOrder = arrayMove(modules, index, index + 1);
    saveOrder(newOrder);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <div className="border rounded bg-white divide-y">
          {modules.map((m) => (
            <SortableRow
              key={m.id}
              module={m}
              onEdit={onEdit}
              onMoveUp={() => moveUp(m.id)}
              onMoveDown={() => moveDown(m.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
