"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

type Props = {
  userId: string;
  onComplete: () => void;
};

type Step = "loading" | "enter-phone" | "enter-code";

export default function VerifyPhoneModal({ userId, onComplete }: Props) {
  const [step, setStep] = useState<Step>("loading");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------------------------------
     INITIAL LOAD — CHECK FOR SAVED PHONE
  --------------------------------------------------------- */
useEffect(() => {
  let mounted = true;

  async function init() {
    const { data, error } = await supabase
      .from("profiles")
      .select("home_phone")
      .eq("id", userId)
      .single();

    if (!mounted) return;

    if (error || !data?.home_phone) {
      setStep("enter-phone");
      return;
    }

    setPhone(data.home_phone);
    setStep("enter-code");
    await sendCode(data.home_phone);
  }

  init();

  return () => {
    mounted = false;
  };
}, [userId]);

  /* ---------------------------------------------------------
     FORM SUBMIT
  --------------------------------------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (step === "enter-phone") {
      const normalized = normalizePhone(phone);
      if (!normalized) {
        setError("Invalid phone number");
        return;
      }

      setPhone(normalized);
      setStep("enter-code");
      await sendCode(normalized);
      return;
    }

    if (step === "enter-code") {
      await verifyCode();
    }
  }

  /* ---------------------------------------------------------
     SEND CODE
  --------------------------------------------------------- */
  async function sendCode(targetPhone: string) {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/2fa/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: targetPhone }),
      });

      if (!res.ok) {
        throw new Error();
      }
    } catch {
      setError("Failed to send verification code");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------------------
     VERIFY CODE
  --------------------------------------------------------- */
async function verifyCode() {
  if (code.length < 4) {
    setError("Enter the verification code");
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        code,
        user_id: userId,
      }),
    });

    const json = await res.json();

    if (!json.success) {
      setError("Invalid verification code");
      return;
    }

    // ✅ SAVE VERIFIED PHONE NUMBER
    await supabase
      .from("profiles")
      .update({ home_phone: phone })
      .eq("id", userId);

    // ✅ MARK SESSION VERIFIED
    await supabase.auth.updateUser({
      data: { session_2fa_verified: true },
    });

    onComplete();
  } catch {
    setError("Verification failed");
  } finally {
    setLoading(false);
  }
}

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */
  if (step === "loading") {
    return (
   <div className="fixed inset-0 z-[200] bg-black/30 flex items-center justify-center">
      <div
        className="
        relative  
          flex flex-col items-center justify-center text-center
          w-full
          min-h-[min(46vh,450px)]
          max-w-[min(96vw,446px)]
          text-[1em] sm:text-[1.2em] md:text-[1.2em]
          bg-white/50
          border border-white/70
          rounded-2xl
          text-lg
          text-[#001f40]
          p-5 sm:p-8
          shadow-[0_12px_40px_rgba(0,31,64,0.25)]
          backdrop-blur-md
          -translate-y-[50px] sm:-translate-y-[70px] md:-translate-y-[80px]
        "
      >
        Checking your account…
        </div>
      </div>
    );
  }

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
          bg-white/70
          border border-white/70
          rounded-2xl
          p-5 sm:p-8
          shadow-[0_12px_40px_rgba(0,31,64,0.25)]
          backdrop-blur-md
          -translate-y-[50px] sm:-translate-y-[70px] md:-translate-y-[80px]
        "
      >        <h2 className="text-center text-[#001f40] text-[1.35em] sm:text-[1.4em] md:text-[1.75em] font-semibold mb-4">
          Verify It’s You
        </h2>

        <form onSubmit={handleSubmit}>
{step === "enter-phone" && (
  <input
    type="tel"
    placeholder="Phone Number"
    className="
      w-full
      mb-4
      px-4
      py-2.5
      rounded-xl
      bg-white/80
      border border-[#001f40]/30
      text-[#001f40]
      placeholder:text-[#001f40]/40
      outline-none
      focus:border-[#001f40]
    "
    value={phone}
    onChange={(e) => setPhone(formatPhone(e.target.value))}
    autoFocus
  />
)}

          {step === "enter-code" && (
            <>
              <p className="text-md text-center mb-3 text-[#001f40]">
                We sent a code to {maskPhone(phone)}
              </p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                className="
                  w-full
                  mb-4
                  px-4
                  py-2.5
                  text-center
                  tracking-widest
                  rounded-xl
                  text-xl
                  bg-white/80
                  border border-[#001f40]/30
                  text-[#001f40]
                  placeholder:text-[#001f40]/40
                  outline-none
                  focus:border-[#001f40]
                "
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, ""))
                }
                autoFocus
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#001f40] text-white py-2.5 rounded-xl font-semibold disabled:opacity-60"
          >
            {loading ? "Please wait…" : step === "enter-phone" ? "Send Code" : "Verify"}
          </button>

          {error && (
            <p className="text-red-600 text-sm mt-4 text-center">{error}</p>
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
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return null;
}

function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7)
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `(${digits.slice(1, 4)}) •••-${digits.slice(-4)}`;
}
