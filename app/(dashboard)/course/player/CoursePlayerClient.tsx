// deno-lint-ignore-file

"use client";

import { useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { useEffect, useState, useCallback, useRef } from "react";

/* ------------------------------------------------------
   TYPES
------------------------------------------------------ */
type ModuleRow = {
  id: string;
  title: string;
  sort_order: number;
};

type LessonRow = {
  id: number;
  module_id: string;
  title: string;
  sort_order: number;
};

type SlideRow = {
  id: string;
  lesson_id: number;
  image_path: string | null;
  order_index: number;
};

type CaptionRow = {
  id: string;
  slide_id: string;
  caption: string;
  seconds: number;
  line_index: number;
  published_audio_url_d: string | null;
  published_audio_url_a: string | null;
  published_audio_url_c: string | null;
};

type QuizOptionRow = {
  id: string;
  quiz_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
};

type QuizState = {
  id: string;
  question: string;
  options: QuizOptionRow[];
  selected: string | null;
  submitted: boolean;
};

/* ------------------------------------------------------
   IMAGE RESOLVER
------------------------------------------------------ */
function resolveImage(path: string | null) {
  if (!path) return null;
  return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
}


/* ------------------------------------------------------
   MAIN PLAYER
------------------------------------------------------ */
  const VOICES = [
    {
      code: "en-US-Neural2-D",
      label: "Male Voice D",
      urlKey: "published_audio_url_d",
      hashKey: "caption_hash_d",
    },
    {
      code: "en-US-Neural2-A",
      label: "Male Voice A",
      urlKey: "published_audio_url_a",
      hashKey: "caption_hash_a",
    },
    {
      code: "en-US-Neural2-J",
      label: "Male Voice J",
      urlKey: "published_audio_url_j",
      hashKey: "caption_hash_j",
    },
  ];



  export default function CoursePlayerClient() {
  const searchParams = useSearchParams();
  const initialModuleId = searchParams.get("module_id");

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);

  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);

  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [captions, setCaptions] = useState<Record<string, CaptionRow[]>>({});

  const [promoOpen, setPromoOpen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizState[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);

  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [volume, setVolume] = useState(0.8);
  const [voice, setVoice] = useState("en-US-Neural2-D"); 



/* ------------------------------------------------------
   VOICE URL RESOLVER
------------------------------------------------------ */
   function resolveVoiceUrl(first: CaptionRow | undefined, voice: string) {
      if (!first) return null;

      switch (voice) {
        case "en-US-Neural2-D":
          return first.published_audio_url_d;
        case "en-US-Neural2-A":
          return first.published_audio_url_A;
        case "en-US-Neural2-J":
          return first.published_audio_url_j;
        default:
          return null;
      }
    }


    // load saved voice on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("course_voice");
    if (saved) setVoice(saved);
  }, []);

  // save voice whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("course_voice", voice);
  }, [voice]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [narrationUrl, setNarrationUrl] = useState<string | null>(null);


  /* ------------------------------------------------------
     LOAD MODULES
  ------------------------------------------------------ */
  async function loadModules() {
    const { data } = await supabase
      .from("modules")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) {
      setModules(data);
      const index = initialModuleId
        ? data.findIndex((m) => m.id === initialModuleId)
        : 0;

      setCurrentModuleIndex(Math.max(index, 0));
    }
  }

  /* ------------------------------------------------------
     LOAD LESSONS
  ------------------------------------------------------ */
  async function loadLessons(moduleId: string) {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("sort_order", { ascending: true });

    if (data) {
      setLessons(data);
      setCurrentLessonIndex(0);
    }
  }

  /* ------------------------------------------------------
     LOAD LESSON CONTENT
  ------------------------------------------------------ */
  async function loadLessonContent(lessonId: number) {
    setSlides([]);
    setCaptions({});
    setQuizQuestions([]);
    setSlideIndex(0);
    setQuizIndex(0);

    const { data: slideRows } = await supabase
      .from("lesson_slides")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true });

    setSlides(slideRows || []);

    const slideIds = slideRows?.map((s) => s.id) ?? [];
    const { data: captionRows } = await supabase
      .from("slide_captions")
      .select(`
        id,
        slide_id,
        caption,
        seconds,
        line_index,
        published_audio_url_d,
        published_audio_url_a,
        published_audio_url_c
      `)
      .in("slide_id", slideIds)
      .order("line_index", { ascending: true });


    const grouped: Record<string, CaptionRow[]> = {};
    slideRows?.forEach((s) => {
    grouped[s.id] =
      captionRows?.filter((c) => String(c.slide_id) === String(s.id)) ?? 
      [];
    });
    setCaptions(grouped);

    const { data: quizRows } = await supabase
      .from("quizzes")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true });

    if (quizRows?.length) {
      const quizIds = quizRows.map((q) => q.id);

      const { data: optionRows } = await supabase
        .from("quiz_options")
        .select("*")
        .in("quiz_id", quizIds)
        .order("order_index", { ascending: true });

      const qList: QuizState[] = quizRows.map((q) => ({
        id: q.id,
        question: q.question,
        options: optionRows?.filter((o) => o.quiz_id === q.id) || [],
        selected: null,
        submitted: false,
      }));

      setQuizQuestions(qList);
    }

    setLoading(false);
  }

  /* ------------------------------------------------------
     NAV / QUIZ DERIVED STATE
  ------------------------------------------------------ */
  const totalSlides = slides.length;
  const totalQuiz = quizQuestions.length;
  const isQuizMode = slideIndex === totalSlides && totalQuiz > 0;

  /* ------------------------------------------------------
     LOAD SEQUENCE
  ------------------------------------------------------ */
  useEffect(() => {
    loadModules();
  }, []);

  useEffect(() => {
    if (modules.length) loadLessons(modules[currentModuleIndex].id);
  }, [modules, currentModuleIndex]);

  useEffect(() => {
    if (lessons.length) loadLessonContent(lessons[currentLessonIndex].id);
  }, [lessons, currentLessonIndex]);

useEffect(() => {
  if (!audioRef.current) return;

  if (isQuizMode) {
    setNarrationUrl(null);
    return;
  }

  const slide = slides[slideIndex];
  if (!slide) return;

  const caps = captions[slide.id] || [];
  const first = caps[0];

  // ✔ Only declared once
  const baseUrl = resolveVoiceUrl(first, voice);

  if (!baseUrl) {
    setNarrationUrl(null);
    return;
  }

  // ✔ Just use it
  setNarrationUrl(baseUrl);

}, [slideIndex, captions, isQuizMode, voice]);



/* ------------------------------------------------------
     NAVIGATION
  ------------------------------------------------------ */
  const goNext = useCallback(() => {
    if (!isQuizMode) {
      if (slideIndex < totalSlides - 1)
        return setSlideIndex((i) => i + 1);

      if (totalQuiz > 0) {
        setSlideIndex(totalSlides);
        return setQuizIndex(0);
      }

      if (currentLessonIndex < lessons.length - 1)
        return setCurrentLessonIndex((i) => i + 1);

      if (currentModuleIndex < modules.length - 1)
        return setCurrentModuleIndex((i) => i + 1);

      return;
    }

    if (quizIndex < totalQuiz - 1)
      return setQuizIndex((i) => i + 1);

    if (currentLessonIndex < lessons.length - 1)
      return setCurrentLessonIndex((i) => i + 1);

    if (currentModuleIndex < modules.length - 1)
      return setCurrentModuleIndex((i) => i + 1);
  }, [
    isQuizMode,
    slideIndex,
    totalSlides,
    totalQuiz,
    quizIndex,
    currentLessonIndex,
    lessons.length,
    currentModuleIndex,
    modules.length,
  ]);

  const goPrev = () => {
    if (isQuizMode) {
      if (quizIndex > 0) return setQuizIndex((i) => i - 1);
      return setSlideIndex(totalSlides - 1);
    }

    if (slideIndex > 0) return setSlideIndex((i) => i - 1);

    if (currentLessonIndex > 0) {
      const newLessonIndex = currentLessonIndex - 1;
      setCurrentLessonIndex(newLessonIndex);
      setSlideIndex(0);
      setQuizIndex(0);
      return;
    }

    if (currentModuleIndex > 0) {
      const newModuleIndex = currentModuleIndex - 1;
      return setCurrentModuleIndex(newModuleIndex);
    }
  };

  const currentSlide = slides[slideIndex] || null;
  const currentImage = currentSlide ? resolveImage(currentSlide.image_path) : null;

  const captionText = currentSlide
    ? (captions[currentSlide.id] || []).map((c) => c.caption).join("\n")
    : "";

  function goToModule(i: number) {
    if (i < currentModuleIndex) {
      setCurrentModuleIndex(i);
      setCurrentLessonIndex(0);
      setSlideIndex(0);
      setQuizIndex(0);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading…
      </div>
    );

  const progressPercentage = isQuizMode
    ? ((totalSlides + quizIndex + 1) / (totalSlides + totalQuiz)) * 100
    : ((slideIndex + 1) / (totalSlides + totalQuiz)) * 100;

  /* ------------------------------------------------------
     RENDER
  ------------------------------------------------------ */

  return (
    <div className="relative min-h-screen bg-white flex flex-col">

      {/* PROGRESS BAR */}
      <div className="fixed top-0 left-0 right-0 z-40 h-2 bg-gray-200">
        <div
          className="h-full bg-[#ca5608] transition-all"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

  {/* AUDIO CONTROLS (VOICE + VOLUME) */}
  <div className="absolute top-4 right-4 z-50 bg-black/60 text-white rounded-xl px-4 py-3 flex items-center gap-4 pointer-events-auto">
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide opacity-80">Voice</span>
      <select
        value={voice}
        onChange={(e) => setVoice(e.target.value)}
        className="bg-white text-black text-xs px-2 py-1 rounded"
      >
        {VOICES.map((v) => (
          <option key={v.code} value={v.code}>
            {v.label}
          </option>
        ))}
      </select>
    </div>

    <div className="flex items-center gap-2">
      <span className="text-xs opacity-80">Vol</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={(e) => {
          const v = Number(e.target.value);
          setVolume(v);
          if (audioRef.current) audioRef.current.volume = v;
        }}
        className="w-24 accent-[#ca5608]"
      />
    </div>
  </div>



      {/* MAIN */}
      <div className="relative flex-1 w-screen h-screen overflow-hidden pt-0 md:pt-10 pb-[160px] z-0">
        {!isQuizMode ? (
          <SlideView currentImage={currentImage} />
        ) : (
          <QuizView
            quizQuestions={quizQuestions}
            quizIndex={quizIndex}
            setQuizQuestions={setQuizQuestions}
            goNext={goNext}
          />
        )}
      </div>

      {/* NARRATION AUDIO ELEMENT */}
        <audio
          ref={audioRef}
          src={narrationUrl || undefined}
          autoPlay
          preload="auto"
          controls={false}
        />


      {/* CAPTIONS */}
      {!isQuizMode && captionText && (
        <div
          className="
            fixed left-1/2 -translate-x-1/2 
            max-w-4xl w-[80vw]
            bg-black/80 text-white rounded-xl 
            px-6 py-4 shadow-lg z-40
          "
          style={{ bottom: "200px" }}
        >
          <p className="text-[1.25rem] leading-snug whitespace-pre-wrap text-center">
            {captionText}
          </p>
        </div>
      )}

      {/* FOOTER NAV */}
      <FooterNav
        goPrev={goPrev}
        goNext={goNext}
        isQuizMode={isQuizMode}
        quizIndex={quizIndex}
        totalQuiz={totalQuiz}
        slideIndex={slideIndex}
        totalSlides={totalSlides}
      />

      {/* TIMELINE + PROMO */}
      <TimelineWithPromo
        modules={modules}
        currentModuleIndex={currentModuleIndex}
        goToModule={goToModule}
        promoOpen={promoOpen}
        setPromoOpen={setPromoOpen}
      />
    </div>
  );
}

/* ------------------------------------------------------
   SUBCOMPONENTS
------------------------------------------------------ */
function SlideView({ currentImage }: { currentImage: string | null }) {
  return (
  <div className="absolute inset-0 flex items-start md:items-center justify-center z-10">
      {currentImage ? (
        <img
          src={currentImage}
          draggable={false}
          className="
            w-[100vw]
            h-[100vh]
            object-cover
            object-center
            select-none
          "
        />
      ) : (
        <div className="text-gray-400 italic">No image</div>
      )}
    </div>
  );
}

function QuizView({ quizQuestions, quizIndex, setQuizQuestions, goNext }: any) {
  const q = quizQuestions[quizIndex];

  return (
    <div className="absolute inset-0 flex items-start justify-center pt-24 px-6 overflow-y-auto">
      <div className="w-full max-w-2xl">
        <h2 className="text-xl font-bold text-[#001f40] text-center mb-6">
          {q.question}
        </h2>

        <div className="flex flex-col gap-3 mb-6">
          {q.options.map((opt: any) => {
            const isSelected = q.selected === opt.id;
            let bg = "bg-white border";

            if (q.submitted) {
              if (opt.is_correct) bg = "bg-green-100 border-green-600";
              else if (isSelected) bg = "bg-red-100 border-red-600";
            } else if (isSelected) {
              bg = "bg-[#ca5608]/20 border-[#ca5608]";
            }

            return (
              <div
                key={opt.id}
                onClick={() => {
                  if (!q.submitted) {
                    setQuizQuestions((prev: any) => {
                      const updated = [...prev];
                      updated[quizIndex].selected = opt.id;
                      return updated;
                    });
                  }
                }}
                className={`${bg} p-3 rounded-lg cursor-pointer text-[#001f40]`}
              >
                {opt.option_text}
              </div>
            );
          })}
        </div>

        {!q.submitted ? (
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                if (!q.selected) return;
                setQuizQuestions((prev: any) => {
                  const updated = [...prev];
                  updated[quizIndex].submitted = true;
                  return updated;
                });
              }}
              disabled={!q.selected}
              className={`px-5 py-2 rounded text-white ${
                q.selected ? "bg-[#ca5608]" : "bg-gray-400"
              }`}
            >
              Submit
            </button>

            <button
              onClick={() => {
                setQuizQuestions((prev: any) => {
                  const updated = [...prev];
                  updated[quizIndex].submitted = true;
                  return updated;
                });
              }}
              className="px-5 py-2 rounded border border-gray-400 text-gray-600"
            >
              Skip
            </button>
          </div>
        ) : (
          <div className="flex justify-center mt-6">
            <button
              onClick={goNext}
              className="px-6 py-2 bg-[#ca5608] text-white rounded-lg"
            >
              Next Question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FooterNav({
  goPrev,
  goNext,
  isQuizMode,
  quizIndex,
  totalQuiz,
  slideIndex,
  totalSlides,
}: any) {
  return (
    <div className="fixed bottom-[40px] left-0 right-0 bg-white border-t shadow-inner h-[120px] z-30">
      <div className="h-full max-w-6xl mx-auto px-6 flex items-center justify-between">
        <button onClick={goPrev} className="p-2 hover:opacity-80">
          <img src="/back-arrow.png" className="w-16" />
        </button>

        <div className="text-center text-[#001f40] text-sm">
          {isQuizMode
            ? `Question ${quizIndex + 1} of ${totalQuiz}`
            : `Slide ${slideIndex + 1} of ${totalSlides}`}
        </div>

        <button onClick={goNext} className="p-2 hover:opacity-80">
          <img src="/forward-arrow.png" className="w-16" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------
   TIMELINE WITH PROMO (Version A – CLEAN + FIXED)
------------------------------------------------------ */
function TimelineWithPromo({
  modules,
  currentModuleIndex,
  goToModule,
  promoOpen,
  setPromoOpen,
}: {
  modules: ModuleRow[];
  currentModuleIndex: number;
  goToModule: (i: number) => void;
  promoOpen: boolean;
  setPromoOpen: (v: boolean) => void;
}) {
  const segmentWidth = 100 / (modules.length + 1);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white z-40 py-3 border-t shadow-inner">

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="relative flex w-full h-4 items-center">

          {/* MODULE SEGMENTS */}
          {modules.map((m, i) => {
            const completed = i < currentModuleIndex;
            const active = i === currentModuleIndex;

            return (
              <div
                key={m.id}
                className="relative h-full flex items-center"
                style={{ width: `${segmentWidth}%` }}
                onClick={() => completed && goToModule(i)}
              >
                <div
                  className={`
                    h-2 flex-1 transition-all
                    ${
                      active
                        ? "bg-[#ca5608] shadow-[0_0_6px_#ca5608]"
                        : completed
                        ? "bg-[#ca5608]"
                        : "bg-[#001f40]/80"
                    }
                    ${i === 0 ? "rounded-l-full" : ""}
                  `}
                />
                <div className="w-[2px] h-full bg-white" />
              </div>
            );
          })}

          {/* FINAL PROMO SEGMENT (ONLY ONE) */}
          <div
            className="relative h-full flex items-center cursor-pointer hover:opacity-100"
            style={{ width: `${segmentWidth}%` }}
            onMouseEnter={() => setPromoOpen(true)}
            onMouseLeave={() => setPromoOpen(false)}
            onClick={() => setPromoOpen(!promoOpen)}
          >
            {/* ORANGE BAR */}
            <div className="h-2 flex-1 bg-[#ca5608] rounded-r-full shadow-[0_0_6px_#ca5608]" />

{promoOpen && (
  <div
    className="
      absolute 
      /* MOBILE: popup further from bottom */
      bottom-[120px] 
      md:bottom-[40px] 
      left-1/2 -translate-x-1/2 
      z-50 pointer-events-none
    "
  >
    {/* CONTENT BOX */}
    <div
      className="
        relative bg-[#001f40] text-white rounded-xl shadow-xl
        p-6 
        w-[90vw]          /* MOBILE full width minus padding */
        max-w-[360px]     /* DESKTOP limit width */
        mx-auto           /* ensure mobile center */
        text-center border border-white/20 
        pointer-events-auto
      "
      style={{
        isolation: "isolate",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
      }}
    >
      {/* CLOSE BUTTON MOBILE ONLY */}
      <button
        onClick={() => setPromoOpen(false)}
        className="absolute top-3 right-3 text-white hover:text-gray-300 md:hidden"
      >
        ✕
      </button>

      {/* STEP 1 */}
      <p className="text-[12px] italic opacity-100 mb-1">(No cost)</p>
      <h3 className="font-bold text-[15px] leading-tight mb-2">6 hour course</h3>
      <hr className="border-white/30 my-3" />

      {/* STEP 2 */}
      <p className="text-[12px] italic opacity-100 mb-1">(No cost)</p>
      <h3 className="font-bold text-[15px] leading-tight mb-2">Pass 40 question final</h3>
      <hr className="border-white/30 my-3" />

      {/* STEP 3 */}
      <h3 className="text-[12px] font-semibold leading-tight mb-1">Pay $59.95</h3>
      <p className="text-[12px] opacity-100 mb-3 leading-snug">
        Electronically submit your test<br />results to the DMV
      </p>
      <hr className="border-white/30 my-3" />

      {/* STEP 4 */}
      <p className="text-[12px] opacity-100 leading-snug">
        Set DMV appointment! Bring: 2 forms of proof of Residency,
        Social Security card, Birth certificate & a smile for the camera!
        <br />
        <span className="font-semibold">$48 Payable to the FL DMV</span>
      </p>
    </div>

    {/* ARROW — LOWER ON MOBILE */}
    <div
      className="
        absolute 
        w-0 h-0 
        border-l-8 border-r-8 border-t-8 border-transparent
      "
      style={{
        borderTopColor: "#001f40",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: window.innerWidth < 768 ? "-16px" : "-7px",
      }}
    />
  </div>
)}
          </div>
        </div>
      </div>
    </div>
  );
}
