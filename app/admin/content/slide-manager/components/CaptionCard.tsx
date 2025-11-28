import { Caption, Slide } from "./types";

type Props = {
  caption: Caption;
  selected: boolean;
  onSelect: (id: string) => void;
  slide?: Slide | null;
};

export default function CaptionCard({ caption, selected, onSelect, slide }: Props) {
  return (
    <div
      className={`p-3 border rounded mb-2 cursor-pointer ${
        selected ? "border-orange-600 bg-orange-50" : "border-gray-300"
      }`}
      onClick={() => onSelect(caption.id)}
    >
      <p className="text-sm">{caption.caption}</p>
      {slide && (
        <p className="text-xs text-gray-500 mt-1">
          Linked to slide #{slide.order_index + 1}
        </p>
      )}
    </div>
  );
}
