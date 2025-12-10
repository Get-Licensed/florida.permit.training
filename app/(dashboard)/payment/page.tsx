// app/(dashboard)/payment/page.tsx

"use client";

import { useEffect, useState } from "react";

export default function PaymentPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/payment/create-intent", {
          method: "POST",
        });
        const json = await res.json();
        if (json.error) {
          setBackendError(json.error);
        }
        setClientSecret(json.clientSecret || null);
      } catch (err: any) {
        setBackendError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) return <p>Loading payment…</p>;

  // Stripe not configured or API error
  if (!clientSecret || backendError) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Payment not available</h2>
        <p>{backendError || "Stripe not yet configured."}</p>
        <p>Please check back later.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Complete Payment</h2>
      <p>Payment system detected, but Stripe keys are placeholder.</p>
      <p>When keys are configured, Stripe Elements will render here.</p>
    </div>
  );
}
