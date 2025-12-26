//app\(dashboard)\TimelineFooterShell.tsx
"use client";

export default function TimelineFooterShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/[70%] backdrop-blur-md z-40 shadow-inner min-h-[6rem]">
      <div className="h-full max-w-6xl py-6 mx-auto px-4 md:px-0">
        {children}
      </div>
    </div>
  );
}
