import { Slide, Caption } from "./types";
import { supabase } from "@/utils/supabaseClient";

export default function ImageCard({
  slide,
  captions,
  isSelected,
  onClick,
}: {
  slide: Slide;
  captions: Caption[];
  isSelected: boolean;
  onClick: (id: string) => void;   // FIXED TYPE
}) {
  const publicUrl =
    slide.image_path
      ? supabase.storage
          .from("uploads")
          .getPublicUrl(slide.image_path).data.publicUrl
      : "/placeholder.png";

  return (
    <div
      className={`border rounded p-2 cursor-pointer bg-white ${
        isSelected ? "border-blue-600 shadow-md" : ""
      }`}
      onClick={() => onClick(slide.id)}   // FIXED CALL
    >
      <img
        src={publicUrl}
        className="w-full h-32 object-cover rounded"
        alt=""
      />

      <div className="mt-2 text-xs text-gray-600">
        {captions.length} captions
      </div>
    </div>
  );
}
