"use client";

import dynamic from "next/dynamic";   // correct import

export const dynamicParams = false;   // optional, but avoids conflict

const TimelineHomeClient = dynamic(
  () => import("./TimelineHomeClient"),   // must match filename
  { ssr: false }
);

export default function Page() {
  return <TimelineHomeClient />;
}
