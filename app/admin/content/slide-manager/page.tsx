"use client";

import { useState } from "react";
import CaptionsEditor from "./components/CaptionsEditor";

type TabOption = "preview" | "captions" | "bulk";

export default function SlideManagerPage() {
  const [tab, setTab] = useState<TabOption>("preview");

  const tabClasses = (t: TabOption) =>
    `px-4 py-2 border-b-2 cursor-pointer ${
      tab === t
        ? "border-[#ca5608] text-[#ca5608] font-semibold"
        : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#001f40] mb-6">
        Slide Manager
      </h1>

      {/* TOP TABS */}
      <div className="flex gap-6 border-b mb-6">
        <button
          className={tabClasses("preview")}
          onClick={() => setTab("preview")}
        >
          Preview Course
        </button>

        <button
          className={tabClasses("captions")}
          onClick={() => setTab("captions")}
        >
          Captions Editor
        </button>

        <button
          className={tabClasses("bulk")}
          onClick={() => setTab("bulk")}
        >
          Bulk Import
        </button>
      </div>

      {/* TAB CONTENT – always the same component, different mode */}
      <div>
        <CaptionsEditor activeTab={tab} />
      </div>
    </div>
  );
}
