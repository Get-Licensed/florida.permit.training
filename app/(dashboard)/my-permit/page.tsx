"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { requireAuth } from "@/utils/requireAuth";

// Loader Component
function Loader() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white fade-in">
      <img
        src="/steering-wheel.png"
        alt="Loading"
        className="w-20 h-20 steering-animation opacity-80"
      />
    </main>
  );
}

export default function MyPermitPage() {
  const router = useRouter();

  /* -------------------- ALL HOOKS (top, fixed order) -------------------- */
  const [authChecked, setAuthChecked] = useState(false);
  const [paid, setPaid] = useState(false);

  /* -------------------- AUTH CHECK (ALWAYS RUNS, ALWAYS DECLARED) -------------------- */
  useEffect(() => {
    async function run() {
      const user = await requireAuth(router);
      if (user) setAuthChecked(true);
    }
    run();
  }, [router]);

  /* -------------------- PAYMENT FETCH (ALWAYS DECLARED) -------------------- */
  useEffect(() => {
    if (!authChecked) return; // prevents running early, but keeps hook in order

    async function fetchPaymentStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("payments")
        .select("status")
        .eq("user_id", user.id)
        .single();

      if (!error && data?.status === "paid") {
        setPaid(true);
      }
    }

    fetchPaymentStatus();
  }, [authChecked]);

  /* -------------------- CONDITIONAL UI BELOW HOOKS -------------------- */
  if (!authChecked) return <Loader />;

  /* -------------------- RENDER PAGE -------------------- */
  return (
    <main className="min-h-screen bg-white p-8 fade-in">
      <h1 className="text-3xl font-bold text-[#001f40] mb-8 text-center">
        Your Florida Learner’s Permit Progress
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">

        {/* STEP 1 */}
        <div className="p-6 rounded-2xl shadow-md border border-gray-200 bg-[#f9fafb] flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#001f40] mb-3">
              Step 1: Payment & Registration
            </h2>

            <p className="text-gray-700 mb-4">
              Total cost: <strong>$59.95</strong>. This includes full course access and final exam.
            </p>

            {!paid ? (
              <>
                <a
                  href="/payment"
                  className="inline-block bg-[#ca5608] text-white font-semibold px-4 py-2 rounded hover:bg-[#b24b06] transition"
                >
                  Complete Payment
                </a>

                <p className="text-sm mt-3 text-gray-600">
                  Payment required to unlock the exam.
                </p>
              </>
            ) : (
              <div className="p-4 bg-green-100 text-green-800 border border-green-300 rounded-lg font-semibold">
                ✅ Paid — No Action Required
              </div>
            )}
          </div>

          <div className="mt-6 border-t pt-4">
            <a
              href="/profile"
              className="text-[#001f40] font-semibold underline hover:text-[#ca5608]"
            >
              Update your profile information
            </a>
          </div>
        </div>

        {/* STEP 2 */}
        <div className="p-6 rounded-2xl shadow-md border border-gray-200 bg-[#f9fafb] flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#001f40] mb-3">
              Step 2: Complete the Course & Exam
            </h2>

            <p className="text-gray-700 mb-4">
              After payment, unlock the narrated 6-hour course and then take the{" "}
              <strong>40-question exam</strong>.
            </p>

            <p className="text-gray-700 mb-4">
              Required passing score: <strong>80%</strong>. Retakes allowed.
            </p>
          </div>

          <div className="mt-6 border-t pt-4">
            <a
              href="/course/player"
              className="inline-block bg-[#001f40] text-white px-4 py-2 rounded hover:bg-[#00356e] transition"
            >
              Go to Course
            </a>
          </div>
        </div>

        {/* STEP 3 */}
        <div className="p-6 rounded-2xl shadow-md border border-gray-200 bg-[#f9fafb] flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#001f40] mb-3">
              Step 3: Receive Your Permit
            </h2>

            <p className="text-gray-700 mb-4">
              After passing the exam, we mail your official Florida Learner’s Permit —{" "}
              <strong>free of charge</strong>.
            </p>

            <p className="text-sm text-gray-600">
              Estimated delivery: <strong>7–10 business days</strong>.
            </p>
          </div>

          <div className="mt-6 border-t pt-4">
            <a
              href="/support"
              className="text-[#001f40] font-semibold underline hover:text-[#ca5608]"
            >
              Contact Support
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
