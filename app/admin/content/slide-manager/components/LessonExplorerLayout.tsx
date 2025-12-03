"use client";

import React from "react";

export default function LessonExplorerLayout({
  sidebar,
  toolSidebar,
  children,
}: {
  sidebar: React.ReactNode;
  toolSidebar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full h-full">

      {/* LEFT COLUMN */}
      <div className="w-[25%] min-w-[220px] border-r p-3 overflow-y-auto space-y-6">

        {/* TOOL PANEL (Preview / Editor / Bulk) */}
        {toolSidebar && (
          <div className="mb-4">
            <h2 className="text-[#001f40] font-bold text-lg">Captions Tools</h2>
            <div className="mt-2">{toolSidebar}</div>
            <div className="border-b my-3" />
          </div>
        )}

        {/* MODULES & LESSONS */}
        {sidebar}
      </div>

      {/* RIGHT COLUMN */}
      <div className="w-[75%] p-6 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
