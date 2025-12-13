"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function FinishPayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const paymentIntent = searchParams.get("payment_intent");
    const redirectStatus = searchParams.get("redirect_status");

    if (!paymentIntent || redirectStatus !== "succeeded") {
      setError("Missing payment confirmation.");
      return;
    }

    fetch("/api/payment/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_intent: paymentIntent }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          router.replace("/complete");
        } else {
          setError("We couldn’t verify your payment. Please contact support.");
        }
      })
      .catch(() => {
        setError("Unable to verify payment. Please try again.");
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="relative bg-white border border-gray-200 shadow-sm rounded-xl p-10 w-full max-w-md text-center">

        {/* Subtle background logo */}
        <img
          src="/logo.png"
          alt=""
          className="absolute inset-0 m-auto opacity-[0.04] w-600 pointer-events-none"
        />

        <h1 className="text-xl font-bold text-[#001f40] mb-4 relative z-10">
          Verifying Payment
        </h1>

        {!error && (
          <div className="flex flex-col items-center gap-4 relative z-10">
            <svg
              className="animate-spin h-6 w-6 text-[#001f40]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-30"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-80"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l-3 3H4z"
              />
            </svg>

            <p className="text-sm text-gray-600">
              Please wait while we confirm your payment.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 mt-4 relative z-10">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
