"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function TestImage() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Get any image_url from slide groups (LIMIT 1)
      const { data, error } = await supabase
        .from("course_slide_groups")
        .select("image_url")
        .order("id", { ascending: true })
        .limit(1)
        .single();

      if (error || !data?.image_url) {
        console.warn(error);
        return;
      }

      // Convert storage path → public URL
      const publicUrl = supabase.storage
        .from("uploads")
        .getPublicUrl(data.image_url).data.publicUrl;

      setUrl(publicUrl);
    })();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      {url ? (
        <img
          src={url}
          className="max-w-[400px] shadow-lg rounded-lg border"
          alt="Loaded from Supabase DB + Storage"
        />
      ) : (
        <p className="text-xl font-semibold text-gray-600">
          Loading image from Supabase…
        </p>
      )}
    </div>
  );
}
