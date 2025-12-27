// app/player/layout.tsx
import PlayerHeader from "./_HeaderClient2";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PlayerHeader />
      <div className="bg-black overflow-hidden min-h-screen">
        {children}
      </div>
    </>
  );
}
