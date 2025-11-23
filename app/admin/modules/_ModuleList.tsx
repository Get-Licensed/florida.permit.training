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

export default function ModuleList({ initialModules }: { initialModules: Module[] }) {
  const [modules, setModules] = useState(initialModules);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // POST reorder
  async function saveOrder(newList: Module[]) {
    setModules(newList);

    await fetch("/admin/modules/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        newList.map((m, i) => ({
          id: m.id,
          sort_order: i + 1,
        }))
      ),
    });
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    const newOrder = arrayMove(modules, oldIndex, newIndex);

    saveOrder(newOrder);
  }

  function handleEdit(id: string) {
    // Navigate to module edit page
    window.location.href = `/admin/modules/${id}`;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <div className="border rounded bg-white divide-y">
          {modules.map((m) => (
            <SortableRow
              key={m.id}
              module={{ id: m.id, title: m.title }}
              onEdit={() => handleEdit(m.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
