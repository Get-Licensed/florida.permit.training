"use client";

import React from "react";

export default function Toast({
  message,
  show,
}: {
  message: string;
  show: boolean;
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-[2000] transition-opacity duration-300 pointer-events-none
        ${show ? "opacity-100" : "opacity-0"}
      `}
    >
      <div className="flex items-center gap-3 bg-white border border-gray-200 shadow-lg px-4 py-3 rounded-md">
        <span className="text-green-600 text-xl">✔</span>
        <span className="text-sm text-gray-800">{message}</span>
      </div>
    </div>
  );
}
