"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { supabase } from "@/utils/supabaseClient";
import StripeCheckoutForm from "@/components/StripeCheckoutForm";
import CourseTimeline from "@/components/CourseTimeline";

/* ───────── STRIPE ───────── */
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

console.log(
  "Stripe key present:",
  !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

/* ───────── TYPES ───────── */
type PaymentError = {
  code?: string;
  message: string;
  detail?: string;
  payment_intent_id?: string;
};

/* ───────── LAYOUT WRAPPER ───────── */
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 py-12 max-w-6xl mx-auto text-[#001f40]">
      {children}
    </div>
  );
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<PaymentError | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<any[]>([]);

  /* ───────── DEEP LINK MODULES ───────── */

function handleGoToModule(i: number) {
  router.push(`/course?module=${i}`);
}

  /* ───────── HANDLE STRIPE REDIRECT ───────── */
  useEffect(() => {
    if (searchParams.get("redirect_status") === "succeeded") {
      router.replace("/finish-pay");
    }
  }, [searchParams, router]);

  /* ───────── LOAD USER ───────── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
    });
  }, [router]);

/* ───────── INIT PAYMENT INTENT ───────── */
useEffect(() => {
  let cancelled = false;

  async function init() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setBackendError({
          code: "NO_SESSION",
          message: "You must be logged in to continue.",
        });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/payment/create-intent", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error === "course_already_paid") {
          router.replace("/complete");
          return;
        }

        if (!cancelled) {
          setBackendError({
            code: json.error ?? "PAYMENT_ERROR",
            message: "Payment unavailable.",
          });
        }
        return;
      }

      if (!json.clientSecret) {
        if (!cancelled) {
          setBackendError({
            code: "NO_CLIENT_SECRET",
            message: "Payment is pending. Please refresh.",
          });
        }
        return;
      }

      if (!cancelled) {
        setClientSecret(json.clientSecret);
      }
    } catch (err) {
      if (!cancelled) {
        setBackendError({
          code: "NETWORK_ERROR",
          message: "Unable to initialize payment.",
          detail: String(err),
        });
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  init();

  return () => {
    cancelled = true;
  };
}, [router]);

/* ───────── MODULES ───────── */

  useEffect(() => {
    supabase
      .from("modules")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setModules(data);
      });
  }, []);

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
        <h2 className="text-2xl font-semibold">
          {backendError?.code === "ALREADY_PAID"
            ? "Payment already completed"
            : backendError?.code === "NO_CLIENT_SECRET"
            ? "Payment in progress"
            : "Payment unavailable"}
        </h2>

        <div className="mt-3 text-sm text-gray-600 space-y-2">
          {backendError?.message && <p>{backendError.message}</p>}

          {backendError?.detail && (
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {backendError.detail}
            </pre>
          )}
        </div>

        {backendError?.payment_intent_id && (
          <p className="mt-4 text-xs text-gray-500">
            Payment Intent:{" "}
            <code>{backendError.payment_intent_id}</code>
          </p>
        )}
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

              <h2 className="text-[2em] text-[#ca5608] font-bold">$59.95</h2>

              <p className="text-sm italic mb-3">One-time fee</p>

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

    {/* COURSE TIMELINE (read-only, payment step) */}
      <CourseTimeline
        modules={modules}
        currentModuleIndex={modules.length + 1}
        maxCompletedIndex={modules.length}
        examPassed={true}
        paymentPaid={false}
        goToModule={handleGoToModule}
      />
    </>
  );
}
