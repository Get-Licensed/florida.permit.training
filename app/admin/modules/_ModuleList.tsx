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
} from "@dnd-kit/sortable";
import SortableRow from "./_SortableRow";
import { useState } from "react";

type Module = { id: string; title: string; sort_order?: number };

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
  // Update local UI immediately (good UX)
  setModules(newList);

  // Send update request and WAIT for DB
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

  // If endpoint succeeds → call parent refresh
  if (res.ok && onUpdated) {
    onUpdated();
  }
}

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);

    const newOrder = arrayMove(modules, oldIndex, newIndex);
    saveOrder(newOrder);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <div className="border rounded bg-white divide-y">
          {modules.map((m) => (
            <SortableRow key={m.id} module={m} onEdit={onEdit} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
