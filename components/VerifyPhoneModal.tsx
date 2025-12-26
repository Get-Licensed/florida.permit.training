"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";

type Props = {
  userId: string;
  onComplete: () => void;
};

export default function VerifyPhoneModal({ userId, onComplete }: Props) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"enter-phone" | "enter-code">("enter-phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------------------------------
     FORM SUBMIT (ENTER HANDLER)
  --------------------------------------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (step === "enter-phone") {
      await sendCode();
    } else {
      await verifyCode();
    }
  }

  /* ---------------------------------------------------------
     SEND SMS CODE
  --------------------------------------------------------- */
  async function sendCode() {
    setLoading(true);
    setError(null);

    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("Invalid phone number");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/2fa/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalized }),
    });

    const text = await res.text();
    const json = text ? JSON.parse(text) : {};

    if (!res.ok) {
      setError(json.error || "Failed to send code");
      setLoading(false);
      return;
    }

    setStep("enter-code");
    setLoading(false);
  }

async function verifyCode() {
  if (code.length !== 6) {
    setError("Enter the 6-digit code");
    return;
  }

  setLoading(true);
  setError(null);

  const normalized = normalizePhone(phone);

  let res: Response;
  try {
    res = await fetch("/api/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: normalized,
        code,
        user_id: userId,
      }),
    });
  } catch {
    setError("Network error. Please try again.");
    setLoading(false);
    return;
  }

  let json: any = {};
  try {
    const text = await res.text();
    json = text ? JSON.parse(text) : {};
  } catch {
    setError("Invalid server response.");
    setLoading(false);
    return;
  }

  if (!res.ok || !json.success) {
    setError(json.error || "Invalid verification code");
    setLoading(false);
    return;
  }

  await supabase.auth.updateUser({
    data: { session_2fa_verified: true },
  });

  onComplete();
}

function handleClose() {
  // simply close the modal without verifying
  onComplete();
}

/* ---------------------------------------------------------
   UI
--------------------------------------------------------- */
return (
    <div className="fixed inset-0 z-[200] bg-black/30 flex items-center justify-center">
      <div
        className="
        relative  
        flex flex-col
          w-full
          justify-center
          min-h-[min(46vh,450px)]
          max-w-[min(96vw,446px)]
          bg-white/50
          border border-white/70
          rounded-2xl
          p-5 sm:p-8
          shadow-[0_12px_40px_rgba(0,31,64,0.25)]
          backdrop-blur-md
          -translate-y-[60px] sm:-translate-y-[70px] md:-translate-y-[80px]
        "
      >

      <button
        type="button"
        onClick={onComplete}
        aria-label="Close"
        className="
          absolute top-3 right-3
          w-9 h-9
          flex items-center justify-center
          rounded-full
          text-[#001f40]
          hover:bg-[#001f40]/10
          transition
          focus:outline-none
        "
      >
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>


      <h2 className="text-[#001f40] text-[1.45rem] sm:text-[1.65rem] md:text-[1.75rem] font-semibold mb-4 text-center">
        Verify It’s You
      </h2>

      <form onSubmit={handleSubmit} className="w-full">
        {/* ENTER PHONE */}
        {step === "enter-phone" && (
          <>
            <input
              type="tel"
              placeholder="Phone Number"
              className="
                w-full
                bg-white/80
                border border-[#001f40]/30
                px-4 py-2.5
                rounded-xl
                mb-4
                text-[#001f40]
                placeholder:text-[#001f40]/40
                outline-none
                focus:border-[#001f40]
              "
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              maxLength={14}
              autoFocus
            />

            <button
              type="submit"
              disabled={loading}
              className="
                w-full
                bg-[#001f40]
                text-white
                text-[1.35em] sm:text-[1.4em] md:text-[1.45em]
                py-2.5
                rounded-xl
                font-semibold
                transition
                hover:bg-[#001f40]/90
                disabled:opacity-60
              "
            >
              {loading ? "Sending…" : "Send Code"}
            </button>
          </>
        )}

        {/* ENTER CODE */}
        {step === "enter-code" && (
          <>
            <input
              type="text"
              maxLength={6}
              placeholder="• • • • • •"
              inputMode="numeric"
              className="
                w-full
                bg-white/80
                border border-[#001f40]/30
                px-4 py-2.5
                rounded-xl
                mb-4
                text-[#001f40]
                placeholder:text-[#001f40]/40
                text-center
                text-xl
                tracking-widest
                outline-none
                focus:border-[#001f40]
              "
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, ""))
              }
              autoFocus
            />

            <button
              type="submit"
              disabled={loading}
              className="
                w-full
                text-[1.35em] sm:text-[1.4em] md:text-[1.45em]
                bg-[#001f40]
                text-white
                py-2.5
                rounded-xl
                font-semibold
                transition
                hover:bg-[#001f40]/90
                disabled:opacity-60
              "
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
          </>
        )}

        {error && (
          <p className="text-red-600 text-sm mt-4 text-center">
            {error}
          </p>
        )}
      </form>
    </div>
  </div>
);
}
/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */
function normalizePhone(input: string): string | null {
  if (!input) return null;

  const digits = input.replace(/[^\d]/g, "");

  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;

  return null;
}

function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, "").substring(0, 10);
  const len = digits.length;

  if (len === 0) return "";
  if (len < 4) return `(${digits}`;
  if (len < 7) return `(${digits.substring(0, 3)}) ${digits.substring(3)}`;

  return `(${digits.substring(0, 3)}) ${digits.substring(
    3,
    6
  )}-${digits.substring(6)}`;
}
