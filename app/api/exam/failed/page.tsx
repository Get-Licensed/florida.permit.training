"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ExamFailedPage() {
  const router = useRouter();
  const params = useSearchParams();
  const score = params.get("score");

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/exam");
    }, 5000);

    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full bg-white border border-gray-300 rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-xl font-semibold text-[#001f40] mb-3">
          Exam Not Passed
        </h1>

        {score && (
          <p className="text-[#001f40] mb-4">
            Your score: <strong>{score}%</strong>
            <br />
            A score of 80% is required to pass.
          </p>
        )}

        <p className="text-sm text-gray-600">
          You’ll be redirected back to the exam to try again.
        </p>
      </div>
    </div>
  );
}
