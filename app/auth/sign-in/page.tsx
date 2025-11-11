"use client";

import Image from "next/image";
import { supabase } from "@/utils/supabaseClient";

const handleGoogleSignIn = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;

    // Wait for session to be available
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      await fetch("https://yslhlomlsomknyxwtbtb.functions.supabase.co/sync-profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    }
  } catch (err) {
    console.error("Google Sign-In Error:", err);
  }
};

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-[40%_60%] md:h-[80vh]">

        {/* Left: Logo */}
        <section className="flex justify-center md:justify-end items-start md:items-center p-6">
          <Image
            src="/logo.png"
            alt="Florida Permit Training"
            width={260}
            height={100}
            priority
            className="h-auto w-auto"
          />
        </section>

        {/* Right: Sign-In Section */}
        <section className="flex flex-col items-center md:items-start justify-center w-full gap-6 p-6">

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="flex items-center border border-[#001f40] bg-white text-[#001f40] text-[24px] font-bold px-4 py-2 rounded"
          >
            <Image
              src="/Google-Icon.png"
              alt="Google Icon"
              width={24}
              height={24}
              className="mr-3"
            />
            Sign in with Google
          </button>

          {/* Google Account Link */}
          <p className="text-[14px] text-[#001f40] text-center md:text-left">
            Don’t have a Google account?{" "}
            <a
              href="https://accounts.google.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ca5608] underline"
            >
              Create one
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}