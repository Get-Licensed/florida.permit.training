"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useExamProgress } from "./ExamProgressContext";
import HeaderAvatar from "./HeaderAvatar";
console.log("HeaderAvatar is:", HeaderAvatar);
export default function ExamShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const progress = useExamProgress();

  return (
    <main className="min-h-[100dvh] bg-white overflow-hidden">
      {/* ===== FIXED PROGRESS BAR ===== */}
      <div className="fixed top-0 left-0 right-0 z-[80] h-[8px] bg-gray-200 pointer-events-none">
        <div
          className="h-full bg-[#ca5608] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ===== HEADER ===== */}
      <header className="fixed top-[8px] left-0 right-0 z-[70] h-[54px] bg-white border-b overflow-visible">
        <div className="relative h-full flex items-center px-4">
          {/* AVATAR + LOGO (absolute / overflow-safe) */}
          <HeaderAvatar />

          {/* EXIT BUTTON */}
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => router.push("/my-permit")}
              className="
                text-md font-semibold text-[#001f40]
                hover:text-[#ca5608]
                relative -top-[2px]
              "
            >
              Exit Exam
            </button>
          </div>
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <section className="pt-[calc(8px+54px)] h-[calc(100dvh-8px-54px)] overflow-hidden px-6">
        {children}
      </section>
    </main>
  );
}
