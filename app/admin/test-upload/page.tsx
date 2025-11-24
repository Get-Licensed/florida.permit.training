"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function TestUpload() {
  const [result, setResult] = useState<any>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const filename = `${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(filename, file);

    setResult({ data, error });
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">Test Upload</h1>
      <input type="file" onChange={handleUpload} className="mb-6" />
      <pre className="bg-gray-100 p-4 rounded text-sm">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
