"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function HeaderAvatar() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadAvatar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setReady(true); // no avatar case
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", session.user.id)
        .single();

      if (!data?.avatar_url) {
        setReady(true); // no avatar stored
        return;
      }

      const url = `${data.avatar_url}?t=${Date.now()}`;

      // 🔒 HARD GATE: preload avatar
      const img = new Image();
      img.onload = () => {
        setAvatarUrl(url);
        setReady(true);
      };
      img.src = url;
    }

    loadAvatar();
  }, []);

  // 🚫 Render NOTHING until avatar decision is complete
  if (!ready) return null;

  return (
    <div
      className="
        absolute left-3 top-0
        h-20 w-20
        translate-y-[16px]
        z-[40]
        pointer-events-none
      "
    >
      {/* BASE LOGO */}
      <img
        src="/logo.png"
        alt="Florida Permit Training"
        className="h-20 w-20 block"
        style={{
          filter: `
            drop-shadow(0 0 1px white)
            drop-shadow(0 0 1px white)
            drop-shadow(0 0 1px white)
            drop-shadow(0 0 1px white)
          `,
        }}
      />

      {/* AVATAR OVERLAY */}
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt="Profile photo"
          className="
            absolute
            top-[4%] left-[48%]
            w-[46%] h-[44%]
            object-cover
            border border-[#001f40]
            rounded-[5px]
            bg-white
          "
        />
      )}
    </div>
  );
}
