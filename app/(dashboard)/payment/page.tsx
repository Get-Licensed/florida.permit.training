"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { supabase } from "@/utils/supabaseClient";
import { usePermitStatus } from "@/utils/usePermitStatus";
import StripeCheckoutForm from "@/components/StripeCheckoutForm";
import CourseTimeline from "@/components/CourseTimeline";
import { canNavigateToModule } from "@/utils/courseNavigation";
import Loader from "@/components/loader";



const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

type PaymentError = {
  code?: string;
  message: string;
  detail?: string;
  payment_intent_id?: string;
};

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

  const {
    loading: statusLoading,
    courseComplete,
    examPassed,
    paid,
  } = usePermitStatus();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<PaymentError | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<any[]>([]);
  const [maxCompletedIndex, setMaxCompletedIndex] = useState(0);

  const redirectToComplete =
    !statusLoading && courseComplete && examPassed && paid;

  const redirectToMyPermit =
    !statusLoading && paid && !examPassed;


      useEffect(() => {
  async function loadProgress() {
    const user = await supabase.auth.getUser();
    if (!user.data.user) return;

    const { data } = await supabase
      .from("course_progress_modules")
      .select("module_index, completed")
      .eq("user_id", user.data.user.id)
      .eq("course_id", "FL_PERMIT_TRAINING")
      .eq("completed", true);

    if (!data || !data.length) {
      setMaxCompletedIndex(0);
      return;
    }

    const max = Math.max(...data.map(r => r.module_index ?? 0));
    setMaxCompletedIndex(max);
  }

  loadProgress();
}, []);

  useEffect(() => {
    if (redirectToComplete) {
      router.replace("/permit-complete");
    } else if (redirectToMyPermit) {
      router.replace("/my-permit");
    }
  }, [redirectToComplete, redirectToMyPermit, router]);

  useEffect(() => {
    if (searchParams.get("redirect_status") === "succeeded") {
      router.replace("/finish-pay");
    }
  }, [searchParams, router]);

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
            router.replace("/permit-complete");
            return;
          }

          setBackendError({
            code: json.error ?? "PAYMENT_ERROR",
            message: "Payment unavailable.",
          });
          return;
        }

        if (!json.clientSecret) {
          setBackendError({
            code: "NO_CLIENT_SECRET",
            message: "Payment is pending. Please refresh.",
          });
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
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    supabase
      .from("modules")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setModules(data);
      });
  }, []);

  if (
    loading ||
    statusLoading ||
    redirectToComplete ||
    redirectToMyPermit
  ) {
    return (
     <Loader />
    );
  }

  if (!clientSecret || backendError) {
    return (
      <Wrapper>
        <h2 className="text-2xl font-semibold">Payment unavailable</h2>
        {backendError?.message && <p>{backendError.message}</p>}
      </Wrapper>
    );
  }
const goToModule = (i: number) => {
  if (!modules.length) return;

  const safeIndex = Math.min(
    i,
    maxCompletedIndex,     // restrict to completed only
    modules.length - 1
  );

  router.push(`/course?module=${safeIndex}`);
};


  return (
  <>
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <Wrapper>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h1 className="text-2xl font-bold mb-4">
              Florida Permit Training — Payment
            </h1>
            <h2 className="text-[2em] text-[#ca5608] font-bold">$59.95</h2>
            <p className="text-sm italic mb-3">One-time fee</p>
            <p className="mb-6">
              This one-time administrative payment allows us to securely
              submit your completion record to the DMV.
            </p>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <StripeCheckoutForm />
          </div>
        </div>
      </Wrapper>
    </Elements>

 <CourseTimeline
  modules={modules}
  currentModuleIndex={maxCompletedIndex}   // where they actually are
  maxCompletedIndex={maxCompletedIndex}    // what is actually completed
  currentLessonIndex={0}
  elapsedSeconds={1}
  totalModuleSeconds={1}
  examPassed={examPassed}
  paymentPaid={paid}
  goToModule={goToModule}
/>
  </>
);
}