import { Suspense } from "react";
import FailedClient from "./FailedClient";

export const dynamic = "force-dynamic";

export default function ExamFailedPage() {
  return (
    <Suspense fallback={null}>
      <FailedClient />
    </Suspense>
  );
}
