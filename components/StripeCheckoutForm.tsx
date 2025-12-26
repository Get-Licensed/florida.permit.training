"use client";

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";

export default function StripeCheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/finish-pay`,
      },
    });

    if (result.error) {
      setError(result.error.message || "Payment failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <PaymentElement />

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        disabled={!stripe || loading}
        className="
        w-full bg-[#ca5608] text-white 
        text-[1.35em] sm:text-[1.4em] md:text-[1.45em]
        font-semibold
        px-5 sm:px-6 py-2.5 sm:py-3
        rounded-xl
        cursor-pointer
        py-3 rounded font-medium disabled:opacity-60
        "
      >
        {loading ? "Processing…" : "Pay & Submit"}
      </button>
    </form>
  );
}
