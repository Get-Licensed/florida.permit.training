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

/* ---------------------------------------------------------
   VERIFY SMS CODE
--------------------------------------------------------- */
async function verifyCode() {
  if (code.length !== 6) {
    setError("Enter the 6-digit code");
    return;
  }

  setLoading(true);
  setError(null);

  const normalized = normalizePhone(phone);

  const res = await fetch("/api/2fa/verify", {
    method: "POST",
    body: JSON.stringify({ phone: normalized, code, user_id: userId }),
  });

  const json = await res.json();

  if (json.success) {
    // ✅ MARK THIS SESSION AS VERIFIED
    await supabase.auth.updateUser({
      data: { session_2fa_verified: true },
    });

    onComplete();
  } else {
    setError("Invalid verification code");
  }

  setLoading(false);
}

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */
  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-[90%] max-w-sm">
        <h2 className="text-lg font-bold text-[#001f40] mb-4">
          Verify Phone
        </h2>

        {/* ENTER PHONE */}
        {step === "enter-phone" && (
          <>
           <input
                type="tel"
                placeholder="Phone Number"
                className="w-full border px-3 py-2 rounded mb-3 text-[#001f40] placeholder:text-gray-400"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                maxLength={14} // (xxx) xxx-xxxx
                />


            <button
              type="button"
              onClick={sendCode}
              disabled={loading}
              className="w-full bg-[#001f40] text-white py-2 rounded"
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
              placeholder="••••••"
              inputMode="numeric"
              className="w-full border px-3 py-2 rounded mb-3 text-[#001f40] placeholder:text-gray-400 text-center text-xl tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <button
              type="button"
              onClick={verifyCode}
              disabled={loading}
              className="w-full bg-[#001f40] text-white py-2 rounded"
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
          </>
        )}

        {error && (
          <p className="text-red-600 text-sm mt-3 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */
function normalizePhone(input: string): string | null {
  if (!input) return null;

  // Remove all non-digits
  const digits = input.replace(/[^\d]/g, "");

  // US +1XXXXXXXXXX
  if (digits.length === 10) {
    return "+1" + digits;
  }

  // Already includes country code
  if (digits.length === 11 && digits.startsWith("1")) {
    return "+" + digits;
  }

  return null;
}

function formatPhone(input: string): string {
  // remove all non-digits
  const digits = input.replace(/\D/g, "").substring(0, 10);

  const len = digits.length;

  if (len === 0) return "";
  if (len < 4) return `(${digits}`;
  if (len < 7) return `(${digits.substring(0, 3)}) ${digits.substring(3)}`;
  
  return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
}
