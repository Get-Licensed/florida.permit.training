"use client";

import { useState } from "react";

import CaptionsEditor from "./components/CaptionsEditor";   // NEW
import BuildSlidesTab from "./components/BuildSlidesTab";
import CaptionImageMapper from "./components/CaptionImageMapper";

export default function SlideManagerPage() {
  const [tab, setTab] = useState<"captions" | "slides" | "mapper">("slides");

  const tabClasses = (t: string) =>
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

      {/* Tabs */}
      <div className="flex gap-6 border-b mb-6">
        <button className={tabClasses("slides")} onClick={() => setTab("slides")}>
          Preview Course
        </button>

        <button className={tabClasses("captions")} onClick={() => setTab("captions")}>
          Captions Editor
        </button>

        <button className={tabClasses("mapper")} onClick={() => setTab("mapper")}>
          Image + Caption Mapper
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {tab === "slides" && <BuildSlidesTab />}
        {tab === "captions" && <CaptionsEditor />}    {/* FIXED */}
        {tab === "mapper" && <CaptionImageMapper />}
      </div>
    </div>
  );
}
