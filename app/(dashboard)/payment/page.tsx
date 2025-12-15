"use client";

import { useEffect, useState, ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useSearchParams, useRouter } from "next/navigation";
import StripeCheckoutForm from "@/components/StripeCheckoutForm";
import PaymentFAQs from "@/components/PaymentFAQs";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

console.log(
  "Stripe key present:",
  !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

/* ───────── LAYOUT WRAPPER ───────── */
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 py-12 max-w-6xl mx-auto text-[#001f40]">
      {children}
    </div>
  );
}

export default function PaymentPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  /* ───────── HANDLE STRIPE REDIRECT ───────── */
  useEffect(() => {
    if (searchParams.get("redirect_status") === "succeeded") {
      router.replace("/finish-pay");
    }
  }, [searchParams, router]);

  /* ───────── INIT PAYMENT INTENT ───────── */
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/payment/create-intent", {
          method: "POST",
        });

        const json: { clientSecret?: string; error?: string } =
          await res.json();

        if (json.error) {
          if (json.error === "Course already paid") {
            router.replace("/complete");
            return;
          }
          setBackendError(json.error);
        } else if (json.clientSecret) {
          setClientSecret(json.clientSecret);
        } else {
          setBackendError("Payment unavailable.");
        }
      } catch {
        setBackendError("Unable to initialize payment.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  /* ───────── LOADING ───────── */
  if (loading) {
    return (
      <Wrapper>
        <p>Loading payment…</p>
      </Wrapper>
    );
  }

  /* ───────── ERROR ───────── */
  if (!clientSecret || backendError) {
    return (
      <Wrapper>
        <h2 className="text-2xl font-semibold">You have already paid...</h2>
        <p className="mt-2">{backendError}</p>
      </Wrapper>
    );
  }

  /* ───────── PAYMENT UI ───────── */
  return (
    <>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <Wrapper>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* LEFT COLUMN */}
            <div>
              <h1 className="text-2xl font-bold mb-4">
              Florida Permit Training — Payment
            </h1>

              <h2 className="text-[2em] text-[#ca5608] font-bold">
              $59.95
            </h2>

            <p className="text-sm italic mb-3">
              One-time fee
            </p>


            <p className="mb-3">
              You are nearing completion of the Florida Permit Training
              requirements.
            </p>

            <p className="mb-3">
              Once your course and exam are completed, Florida requires an
              electronic submission of your results to the DMV.
            </p>

            <p className="mb-6">
              This one-time administrative payment allows us to securely process
              and submit your completion record on your behalf.
            </p>

            </div>

            {/* RIGHT COLUMN */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
              <StripeCheckoutForm />
            </div>
          </div>
        </Wrapper>
      </Elements>
    </>
  );
}
