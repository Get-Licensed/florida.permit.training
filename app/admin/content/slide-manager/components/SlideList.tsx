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
import { useState, useEffect } from "react";
import SortableSlideRow from "./SortableSlideRow";

export default function SlideList({
  slides,
  lessonId,
  onUpdated,
  onSelect,
}: {
  slides: any[];
  lessonId: string;
  onUpdated: () => void;
  onSelect?: (index: number) => void; // ← ADDED HERE
}) {
  const [items, setItems] = useState(slides);

  useEffect(() => setItems(slides), [slides]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function saveOrder(newList: any[]) {
    setItems(newList);

    await fetch("/admin/slides/reorder", {
      method: "POST",
      body: JSON.stringify({
        lessonId,
        orderedIds: newList.map((s) => s.id),
      }),
    });

    onUpdated();
  }

  function handleDragEnd(e: any) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const newList = arrayMove(items, oldIndex, newIndex);
    saveOrder(newList);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((slide, idx) => (
            <div
              key={slide.id}
              onClick={() => onSelect?.(idx)} // ← ADDED CLICK SELECT
            >
              <SortableSlideRow slide={slide} />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
