"use client";

import React from "react";

export default function LessonExplorerLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full h-full">
        <div className="w-[20%] min-w-[220px] border-r p-3 overflow-y-auto">
        {sidebar}
      </div>
      <div className="w-[80%] p-6 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
