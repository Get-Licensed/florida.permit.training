import { Slide } from "./types";
import { supabase } from "@/utils/supabaseClient";

export default function UploadImageButton({
  lessonId,
  onUpload,
}: {
  lessonId: string;
  onUpload: (slide: Slide) => void;
}) {
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // filename inside bucket
    const fileName = `slides/${Date.now()}-${file.name}`;

    // Upload to Supabase bucket "uploads"
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return;
    }

    // Generate PUBLIC URL
    const { data: publicUrlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // Insert the slide into lesson_slides table
    const { data: slide, error: slideError } = await supabase
      .from("lesson_slides")
      .insert({
        lesson_id: lessonId,
        image_path: publicUrl,   // <— CORRECT URL SAVED
        caption: "",
        display_seconds: 5,
        order_index: 0,
        module_id: null
      })
      .select()
      .single();

    if (slideError) {
      console.error("DB insert error:", slideError);
      return;
    }

    onUpload(slide);
  }

  return (
    <label className="border px-4 py-2 bg-white rounded cursor-pointer">
      Upload Image
      <input type="file" className="hidden" onChange={handleUpload} />
    </label>
  );
}
