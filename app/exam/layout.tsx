// app/exam/layout.tsx
import type { ReactNode } from "react";

export default function ExamLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50">
      {children}
    </main>
  );
}
