import ImageCard from "./ImageCard";
import { Slide, Caption } from "./types";

export default function ImageTray({
  slides,
  captions,
  selectedSlideId,
  onSelectSlide,
}: {
  slides: Slide[];
  captions: Caption[];
  selectedSlideId: string | null;
  onSelectSlide: (id: string) => void;
}) {

  return (
    <div className="grid grid-cols-3 gap-4 mt-4">
      {slides.map((slide) => {
        const related = captions.filter((c) => c.slide_id === slide.id);

        return (
          <ImageCard
            key={slide.id}
            slide={slide}
            captions={related}
            isSelected={slide.id === selectedSlideId}
            onClick={() => onSelectSlide(slide.id)}
          />
        );
      })}
    </div>
  );
}
