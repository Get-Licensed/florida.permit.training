// PAGE WRAPPER (SERVER COMPONENT)
import { Suspense } from "react";
import CoursePlayerClient from "./CoursePlayerClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <CoursePlayerClient />
    </Suspense>
  );
}
