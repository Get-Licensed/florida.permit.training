"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function MyPermitPage() {
  const [paid, setPaid] = useState(false);

  // Simulate fetching payment status from DB
  useEffect(() => {
    const fetchPaymentStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Example: Check payment record
      const { data, error } = await supabase
        .from("payments")
        .select("status")
        .eq("user_id", user.id)
        .single();

      if (!error && data?.status === "paid") {
        setPaid(true);
      }
    };

    fetchPaymentStatus();
  }, []);

  return (
    <main className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold text-[#001f40] mb-8 text-center">
        Your Florida Learner’s Permit Progress
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* SECTION 1: PAYMENT */}
        <div className="p-6 rounded-2xl shadow-md border border-gray-200 flex flex-col justify-between bg-[#f9fafb]">
          <div>
            <h2 className="text-xl font-bold text-[#001f40] mb-3">
              Step 1: Payment & Registration
            </h2>
            <p className="text-gray-700 mb-4">
              The total cost for the official Florida Online Permit Training Course is{" "}
              <strong>$59.95</strong>. This covers your course materials and final
              exam access.
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
                  Payment required before accessing the final exam.
                </p>
              </>
            ) : (
              <div className="p-4 bg-green-100 text-green-800 rounded-lg border border-green-300 font-semibold">
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

        {/* SECTION 2: COURSE COMPLETION */}
        <div className="p-6 rounded-2xl shadow-md border border-gray-200 flex flex-col justify-between bg-[#f9fafb]">
          <div>
            <h2 className="text-xl font-bold text-[#001f40] mb-3">
              Step 2: Complete the Course & Exam
            </h2>
            <p className="text-gray-700 mb-4">
              Once payment is confirmed, you’ll unlock the 6-hour online course with
              narrated lessons. After completion, you can take the{" "}
              <strong>40-question final exam</strong> online at your own pace.
            </p>
            <p className="text-gray-700 mb-4">
              You must score at least <strong>80%</strong> to pass. You can retake
              the exam if necessary. Please ensure your full name and date of birth
              match your legal records.
            </p>
          </div>

          <div className="mt-6 border-t pt-4">
            <a
              href="/course"
              className="inline-block bg-[#001f40] text-white px-4 py-2 rounded hover:bg-[#00356e] transition"
            >
              Go to Course
            </a>
          </div>
        </div>

        {/* SECTION 3: PERMIT DELIVERY */}
        <div className="p-6 rounded-2xl shadow-md border border-gray-200 flex flex-col justify-between bg-[#f9fafb]">
          <div>
            <h2 className="text-xl font-bold text-[#001f40] mb-3">
              Step 3: Receive Your Permit
            </h2>
            <p className="text-gray-700 mb-4">
              After you successfully pass the final exam, we’ll process and mail
              your official Florida Learner’s Permit directly to the address listed
              in your profile — <strong>at no additional cost</strong>.
            </p>

            <div className="text-sm text-gray-600 mt-3">
              📦 Estimated delivery: <strong>7–10 business days</strong> after exam
              completion.
            </div>
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
