// deno-lint-ignore-file

"use client";

import { useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { useEffect, useState, useCallback, useRef } from "react";
import React from "react";


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
  published_audio_url_a: string | null;
  published_audio_url_d: string | null;
  published_audio_url_j: string | null;
  published_audio_url_o: string | null;
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
    code: "en-US-Neural2-A",
    label: "John",
    urlKey: "published_audio_url_a",
    hashKey: "caption_hash_a",
  },
  {
    code: "en-US-Neural2-D",
    label: "Paul",   // replaced Chirp-HD-D
    urlKey: "published_audio_url_d",
    hashKey: "caption_hash_d",
  },
  {
    code: "en-US-Neural2-I",
    label: "Ringo",   // replaced Chirp-HD-O
    urlKey: "published_audio_url_o",     // reuse same DB column
    hashKey: "caption_hash_o",
  },
  {
    code: "en-US-Neural2-J",
    label: "George",
    urlKey: "published_audio_url_j",
    hashKey: "caption_hash_j",
  },
];


 export default function CoursePlayer({
  audioRef,
  volume,
  setVolume,
}: {
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  volume?: number;
  setVolume?: (v: number) => void;
}) {



  const searchParams = useSearchParams();
  const initialModuleId = searchParams.get("module_id");

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [resumeLoaded, setResumeLoaded] = useState(false);

  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);

  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [captions, setCaptions] = useState<Record<string, CaptionRow[]>>({});

  const [promoOpen, setPromoOpen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizState[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);

  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [voice, setVoice] = useState<string>("");

  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0); 
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const safeVolume = typeof volume === 'number' ? volume : 1


// FIRST-USER GESTURE → unlock + play
useEffect(() => {
  const unlockAudio = () => {
    const el = audioRef?.current;
    if (!el) return;

    setAudioUnlocked(true);
    setIsPaused(false);

    el.play().catch(() => {});
  };

  window.addEventListener("click", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });

  return () => {
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  };
}, [audioRef]);


/* ------------------------------------------------------
   VOICE URL RESOLVER (UPDATED)
------------------------------------------------------ */
function resolveVoiceUrl(first: CaptionRow | undefined, voice: string) {
  if (!first) return null;

  switch (voice) {
    case "en-US-Neural2-A":
      return first.published_audio_url_a;

    // Neural2-D replaces old Chirp-D but still uses the same DB field
    case "en-US-Neural2-D":
      return first.published_audio_url_d;

    // Neural2-I replaces old Chirp-O but still uses the same DB field
    case "en-US-Neural2-I":
      return first.published_audio_url_o;

    case "en-US-Neural2-J":
      return first.published_audio_url_j;

    default:
      return null;
  }
}

    // volume sync

useEffect(() => {
  if (!audioRef?.current) return;
  if (typeof volume !== "number") return;
  audioRef.current.volume = volume;
}, [volume, audioRef]);


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


  const [currentCaptionIndex, setCurrentCaptionIndex] = useState(0);
  const [canProceed, setCanProceed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

// ------------------------------------------------------
// PROGRESS STATE
// ------------------------------------------------------

const userId = supabase.auth.getUser; // or however you're getting the session later
const COURSE_ID = "FL_PERMIT_TRAINING";
const [user, setUser] = useState<any>(null);
const [requiredSeconds, setRequiredSeconds] = useState<number>(0);
const [slideComplete, setSlideComplete] = useState(false);


useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setUser(data.user);
    console.log("USER LOADED:", data.user);
  });
}, []);


  // local cache of last saved allowed module
  const [savedProgress, setSavedProgress] = useState<number>(0);

  async function loadProgress() {
  if (!user?.id) return;

  const { data } = await supabase
    .from("course_progress_slides")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", COURSE_ID)
    .order("updated_at", { ascending: false })
    .limit(1);

    if (data?.[0]) {
    const p = data[0];
    // store the numeric module_index you save in your progress table
    setSavedProgress(p.module_index ?? 0);
    setSlideIndex(p.slide_index ?? 0);
  }
}

// just load saved progress WHEN WE KNOW USER
useEffect(() => {
  if (!user?.id) return;
  loadProgress();
}, [user?.id]);


async function saveProgress() {
  // do not save until we know resume has been applied
  if (!user?.id || !resumeLoaded) {
    console.log("skip saveProgress, no user or resume not loaded");
    return;
  }

  try {
    await supabase.from("course_progress").upsert({
      user_id: user.id,
      course_id: COURSE_ID,
      lesson_id: lessons[currentLessonIndex]?.id,
      module_index: currentModuleIndex,
      slide_index: slideIndex,
      elapsed_seconds: Math.floor(elapsedSeconds),
      total_seconds: Math.floor(totalModuleSeconds),
      completed:
        currentModuleIndex === modules.length - 1 &&
        currentLessonIndex === lessons.length - 1 &&
        slideIndex === totalSlides - 1,
    }, { onConflict: "user_id,course_id,lesson_id,module_index" });
  } catch (err) {
    console.error("saveProgress failed", err);
  }
}


// ---- UNLOCK AUTOPLAY ON FIRST USER GESTURE ----
useEffect(() => {
  const unlock = () => {
    setAudioUnlocked(true);

    const el = audioRef?.current;
    if (el) {
      el.play().catch(() => {});
    }
  };

  window.addEventListener("click", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });

  return () => {
    window.removeEventListener("click", unlock);
    window.removeEventListener("touchstart", unlock);
  };
}, [audioRef]);


// === PER-SECOND TIMER ===
useEffect(() => {
  if (!requiredSeconds) return;
  const slide = slides[slideIndex];
  if (!slide) return;
  if (!user?.id) return;

  let elapsed = 0;

  const id = setInterval(() => {
    elapsed += 1;

    fetch("/api/progress/complete-slide", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        module_id: modules[currentModuleIndex]?.id,
        lesson_id: lessons[currentLessonIndex]?.id,
        slide_id: slide.id,
        slide_index: slideIndex,
        required_seconds: requiredSeconds,
        effective_seconds_increment: 1,
      }),
    });

    if (elapsed >= requiredSeconds) {
      setSlideComplete(true);
      clearInterval(id);
    }
  }, 1000);

  return () => clearInterval(id);
}, [requiredSeconds, slideIndex, user?.id, modules, lessons]);

  //-----------------------------------
// TIME-BASED PROGRESS CALCULATIONS
//-----------------------------------
const totalModuleSeconds = (() => {
  let sec = 0;
  for (const slideId in captions) {
    const caps = captions[slideId] || [];
    sec += caps.reduce((a,c)=> a + (c.seconds ?? 0), 0);
  }
  return sec;
})();


const elapsedSeconds = (() => {
  let sec = 0;

  // full slides already completed
  for (let i = 0; i < slideIndex; i++) {
    const slide = slides[i];
    if (!slide) continue;
    const caps = captions[slide.id] || [];
    sec += caps.reduce((s, c) => s + (c.seconds ?? 0), 0);
  }

  // current slide full captions up to currentCaptionIndex
  const slide = slides[slideIndex];
  if (!slide) return sec;

  const caps = captions[slide.id] || [];
  for (let j = 0; j < currentCaptionIndex; j++) {
    sec += (caps[j]?.seconds ?? 0);
  }

  // partial progress inside current caption
  const cur = caps[currentCaptionIndex];
  if (cur) {
    sec += Math.min(audioTime, cur.seconds ?? 0);
  }

  return sec;
})();

/* ---------------------------------------
   COMPUTE MODULE TOTALS
---------------------------------------- */
    const moduleSeconds: Record<string, number> = {};

    modules.forEach((mod) => {
      moduleSeconds[mod.id] = 0;

      const modLessons = lessons.filter((l) => l.module_id === mod.id);

      modLessons.forEach((lesson) => {
        const lessonSlides = slides.filter((s) => s.lesson_id === lesson.id);
        const slideIds = lessonSlides.map((s) => s.id);

        // captions is Record<string, CaptionRow[]>
        const lessonCaptions = slideIds.flatMap((sid) => captions[sid] || []);

        const sum = lessonCaptions.reduce(
          (acc, c) => acc + (Number(c.seconds) || 0),
          0
        );

        moduleSeconds[mod.id] += sum;
      });
    });

    // total for active module
    const currentModule = modules[currentModuleIndex];
    const currentModuleTotal =
      currentModule ? moduleSeconds[currentModule.id] || 0 : 0;


  /* ------------------------------------------------------
     NAV / QUIZ DERIVED STATE
  ------------------------------------------------------ */
const totalSlides = slides.length;
const totalQuiz = quizQuestions.length;
const isQuizMode = slideIndex === totalSlides && totalQuiz > 0;

const showContinueInstruction =
  currentModuleIndex === 0 &&
  slideIndex === totalSlides - 1 &&
  !isQuizMode;

  /* ------------------------------------------------------
   LOAD SEQUENCE
------------------------------------------------------ */
useEffect(() => {
  loadModules();
}, []);

// once modules exist, apply resume
useEffect(() => {
  if (!modules.length) return;

  const idx = Math.min(savedProgress, modules.length - 1);

  if (idx >= 0) {
    setCurrentModuleIndex(idx);
  }

  // mark that resume-from-DB has been applied
  setResumeLoaded(true);
}, [modules, savedProgress]);


// load DB progress too
useEffect(() => {
  if (!user?.id) return;
  loadProgress();
}, [user?.id]);

useEffect(() => {
  if (!modules.length) return;
  const mod = modules[currentModuleIndex];
  if (!mod) return;
  loadLessons(mod.id);
}, [modules, currentModuleIndex]);



useEffect(() => {
  if (lessons.length) {
    loadLessonContent(lessons[currentLessonIndex].id);
  }
}, [lessons, currentLessonIndex]);


/* ------------------------------------------------------
   BASE AUTOPLAY (fires when metadata is ready)
------------------------------------------------------ */
useEffect(() => {
  const el = audioRef?.current;
  if (!el) return;

  function safePlay() {
    const a = audioRef?.current;
    if (!a) return;
    if (!isPaused) {
      a.play().catch(() => {});
    }
  }

  el.addEventListener("loadedmetadata", safePlay);
  el.addEventListener("canplaythrough", safePlay);

  return () => {
    const a = audioRef?.current;
    if (!a) return;
    a.removeEventListener("loadedmetadata", safePlay);
    a.removeEventListener("canplaythrough", safePlay);
  };
}, [isPaused, audioRef]);


/* ------------------------------------------------------
   PAUSE / PLAY FUNCTIONS
------------------------------------------------------ */
function handlePause() {
  if (!audioRef?.current) return;
  audioRef.current.pause();
  setIsPaused(true);
}

function handlePlay() {
  if (!audioRef?.current) return;
  audioRef.current.play().catch(() => {});
  setIsPaused(false);
}

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
   LOAD LESSON CONTENT (module-wide captions)
------------------------------------------------------ */
async function loadLessonContent(lessonId: number) {
  setSlides([]);
  setCaptions({});
  setQuizQuestions([]);
  setSlideIndex(0);
  setQuizIndex(0);

  /* get the active module id */
  const activeModuleId = modules[currentModuleIndex]?.id;
  if (!activeModuleId) return;

  /* get ALL lessons in this module */
  const moduleLessons = lessons.filter(
    (l) => l.module_id === activeModuleId
  );

  /* get ALL slides for ALL lessons in this module */
  const { data: moduleSlides } = await supabase
    .from("lesson_slides")
    .select("*")
    .in(
      "lesson_id",
      moduleLessons.map((l) => l.id)
    )
    .order("order_index", { ascending: true });

  setSlides(moduleSlides || []);

  const moduleSlideIds = moduleSlides?.map((s) => s.id) ?? [];

  /* fetch ALL captions for ALL module slides */
  const { data: moduleCaptionRows } = await supabase
    .from("slide_captions")
    .select(`
      id,
      slide_id,
      caption,
      seconds,
      line_index,
      published_audio_url_d,
      published_audio_url_a,
      published_audio_url_j,
      published_audio_url_o
    `)
    .in("slide_id", moduleSlideIds)
    .order("line_index", { ascending: true });

  /* group module captions by slide */
  const grouped: Record<string, CaptionRow[]> = {};
  moduleSlides?.forEach((s) => {
    grouped[s.id] =
      moduleCaptionRows?.filter(
        (c) => String(c.slide_id) === String(s.id)
      ) ?? [];
  });

  setCaptions(grouped);

  /* fetch quiz for the active lesson ONLY (unchanged) */
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
      options:
        optionRows?.filter((o) => o.quiz_id === q.id) || [],
      selected: null,
      submitted: false,
    }));

    setQuizQuestions(qList);
  }

  setLoading(false);
}


    // when a new slide is loaded, clear paused so narration can auto-play
    useEffect(() => {
      if (isQuizMode) return;     // optional: don't auto-unpause when entering quiz
      setIsPaused(false);
    }, [slideIndex, isQuizMode]);

      // RESET caption state on NEW slide
   useEffect(() => {
      setSlideComplete(false);

      setCurrentCaptionIndex(0);
      setCanProceed(false);

        // allow autoplay on new slide (unless quiz)
        if (!isQuizMode) {
          setIsPaused(false);
        }

        console.log("SLIDE RESET >>>", {
          slideIndex,
          clearedCaption: true,
        });
      }, [slideIndex, isQuizMode]);

      // === START-SLIDE PROGRESS ===
      useEffect(() => {
        if (!user?.id) return;
        const slide = slides[slideIndex];
        if (!slide) return;

        // tell backend we viewed this slide
        fetch("/api/progress/start-slide", {
          method: "POST",
          body: JSON.stringify({
            user_id: user.id,
            module_id: modules[currentModuleIndex]?.id,
            lesson_id: lessons[currentLessonIndex]?.id,
            slide_id: slide.id,
            slide_index: slideIndex,
          }),
        });

        // reset complete flag
        setSlideComplete(false);

        // fetch required seconds
        fetch(`/api/progress/required-seconds?slide_id=${slide.id}`)
          .then((r) => r.json())
          .then((r) => {
            const sec = r.required_seconds ?? 0;
            setRequiredSeconds(sec);
          });
      }, [slideIndex, user?.id, modules, lessons]);


      // Safety net ONLY on initial slide load
      useEffect(() => {
        const slide = slides[slideIndex];
        if (!slide) return;

        const caps = captions[slide.id] || [];
        const urls = caps.map(c => resolveVoiceUrl(c, voice)).filter(Boolean);

        if (!urls.length) {
          // no audio for this slide → proceed
          setCanProceed(true);
          setSlideComplete(true);     

          setTimeout(() => {
            if (!isQuizMode && !isPaused) goNext(true);
          }, 300);
        }
      }, [slideIndex]);


// ----------------------------------------------------
// Play correct audio whenever the current caption changes
// ----------------------------------------------------
useEffect(() => {
  const audio = audioRef?.current;
  if (!audio) return;

  // do not auto-start on load or while user has paused
  if (isPaused) return;
  if (isQuizMode) return;

  const slide = slides[slideIndex];
  if (!slide) return;

  const caps = captions[slide.id] || [];
  const urls = caps
    .map((c) => resolveVoiceUrl(c, voice))
    .filter(Boolean) as string[];

  if (!urls.length) return;

  const url = urls[currentCaptionIndex];
  if (!url) return;

  // only restart if src changed
  if (audio.src !== url) {
    audio.src = url;
    audio.currentTime = 0;
    audio.load();
  }

  // safe play
  audio.play().catch(() => {});

}, [
  currentCaptionIndex,
  isQuizMode,
  isPaused,
  slides,
  slideIndex,
  captions,
  voice,
]);

useEffect(() => {
  const el = audioRef?.current;
  if (!el) return;
  if (!audioUnlocked) return;

  if (!isPaused) {
    el.play().catch(() => {});
  }
}, [audioUnlocked, isPaused, audioRef]);


/* ------------------------------------------------------
   NAVIGATION
------------------------------------------------------ */
const goNext = useCallback(
  (fromAuto?: boolean) => {

    // Only block USER attempts to jump forward to another module.
    // Do NOT block slide-to-slide inside the same module.
    if (!fromAuto && currentModuleIndex > savedProgress) return;

    // USER navigation must respect timing.
    // Auto (TTS) skips this.
    if (!fromAuto && !isQuizMode && !canProceed) return;

    // ───────────── SLIDE / CAPTION MODE ─────────────
    if (!isQuizMode) {
      if (slideIndex < totalSlides - 1) {
        setSlideIndex((i) => i + 1);
        return;
      }

      if (totalQuiz > 0) {
        setSlideIndex(totalSlides);
        setQuizIndex(0);
        return;
      }

      if (currentLessonIndex < lessons.length - 1) {
        setCurrentLessonIndex(i => i + 1);
        setSlideIndex(0);
        setCurrentCaptionIndex(0);
        setCanProceed(false);
        return;
      }


      if (currentModuleIndex < modules.length - 1) {
        setCurrentModuleIndex((i) => i + 1);
        return;
      }

      return;
    }

    // ───────────── QUIZ MODE ─────────────
    if (quizIndex < totalQuiz - 1) {
      setQuizIndex((i) => i + 1);
      return;
    }

    if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex((i) => i + 1);
      return;
    }

    if (currentModuleIndex < modules.length - 1) {
      setCurrentModuleIndex((i) => i + 1);
      return;
    }
  },
  [
    isQuizMode,
    canProceed,
    savedProgress,
    slideIndex,
    totalSlides,
    totalQuiz,
    quizIndex,
    currentLessonIndex,
    lessons.length,
    currentModuleIndex,
    modules.length,
  ]
);

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

    const progressPercentage = totalModuleSeconds > 0
      ? (elapsedSeconds / totalModuleSeconds) * 100
      : 0;


    // SMOOTHING
    const [smoothProgress, setSmoothProgress] = useState(progressPercentage);

    useEffect(() => {
      let raf: number;
      const tick = () => {
        setSmoothProgress(prev => {
          const diff = progressPercentage - prev;
          return prev + diff * 0.1; // smoothing factor
        });
        raf = requestAnimationFrame(tick);
      };

      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [progressPercentage]);



    if (loading)
      return (
        <div className="flex items-center justify-center min-h-screen">
          Loading…
        </div>
      );

  /* ------------------------------------------------------
     RENDER
  ------------------------------------------------------ */

  return (
    <div className="relative min-h-screen bg-white flex flex-col">

      {/* PROGRESS BAR */}
      <div className="fixed top-0 left-0 right-0 z-40 h-2 bg-gray-200">
        <div
          className="h-full bg-[#ca5608] transition-[width] duration-700 ease-linear"
          style={{ width: `${smoothProgress}%` }}
        />
      </div>

{/* AUDIO CONTROLS (VOICE + VOLUME) */}
<div className="absolute top-0 right-0 z-2 bg-white text-[#001f40] px-4 py-3 flex items-center gap-4 pointer-events-auto">

  <div className="relative">
  <select
    value={voice}
    onChange={(e) => setVoice(e.target.value)}
    className="
      bg-[#001F40] text-white
      text-xs 
      px-2 py-1 
      rounded-md 
      outline-none 
      border border-white/30
      hover:bg-[#002a5f]
    "
  >
    {/* Placeholder */}
    <option value="" disabled>
      Select Voice…
    </option>

    {VOICES.map((v) => (
      <option
        key={v.code}
        value={v.code}
        className="bg-[#001F40] text-white"
      >
        {v.label}
      </option>
    ))}
  </select>
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
      setCanProceed={setCanProceed}
      audioDuration={audioDuration}
    />
  )}

  {/* CLICK-TO-PAUSE OVERLAY */}
{!isQuizMode && (
  <div
    className="absolute inset-0 z-20"
    onClick={() => {
      const a = audioRef?.current;
      if (!a) return;

      if (isPaused || a.paused) {
        handlePlay();
      } else {
        handlePause();
      }
    }}
    style={{ cursor: "default" }}
  />
)}


</div>


  {/* NARRATION AUDIO ELEMENT */}
    <audio
      ref={audioRef}
      preload="auto"
      controls={false}
      onTimeUpdate={(e) => {
        const a = e.currentTarget;
        setAudioTime(a.currentTime);
      }}
      onLoadedMetadata={(e) => {
        const a = e.currentTarget;
        setAudioDuration(a.duration);
      }}
      onEnded={() => {
        console.log("ENDED >>>", {
          slideIndex,
          currentCaptionIndex,
          paused: isPaused,
          isQuizMode,
        });

        if (isQuizMode) return;
        if (isPaused) return;

        const slide = slides[slideIndex];
        if (!slide) return;

        const caps = captions[slide.id] || [];
        const urls = caps
          .map(c => resolveVoiceUrl(c, voice))
          .filter(Boolean) as string[];

        console.log("ENDED URLs:", urls);
        console.log("CAP LIST", caps.map(c => c.caption));



       // no audio on this slide → finish slide
          if (!urls.length) {
            setCanProceed(true);
            setSlideComplete(true);   // <<< add
            setTimeout(() => {
              if (!isQuizMode && !isPaused) goNext(true);
            }, 300);
            return;
          }


        // if NOT last caption → advance caption
        if (currentCaptionIndex < urls.length - 1) {
          console.log("Advancing caption to", currentCaptionIndex + 1);
          setCurrentCaptionIndex(i => i + 1);
          return;
        }

        // last caption of slide
      console.log("Last caption, finishing slide");

      // allow next
      setCanProceed(true);
      setSlideComplete(true);   // <<< add

      // SAVE PROGRESS HERE
      saveProgress();

      // ===== MODULE PROGRESS (search: MODULE-PROGRESS) =====
      fetch("/api/progress/complete-module", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          module_id: modules[currentModuleIndex]?.id,
          slide_index: slideIndex,
          highest_slide_index: slideIndex,
        }),
      }).catch(console.error);

      // ===== SUMMARY (search: SUMMARY-UPDATE) =====
      fetch("/api/progress/update-summary", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          course_id: COURSE_ID,
        }),
      }).catch(console.error);


      // move to next slide
      setTimeout(() => {
        if (!isQuizMode && !isPaused) goNext(true);
      }, 300);

      }}
    />

{showContinueInstruction && (
  <div className="fixed bottom-[230px] left-0 right-0 flex justify-center z-40">
    <button
      onClick={() => {
        setAudioUnlocked(true);
  if (!audioRef?.current) return;{
          audioRef.current.play().catch(()=>{});
        }
        handlePlay();
        goNext();
      }}
      className="
        px-12 py-5
        rounded-xl
        bg-[#000]/30
        cursor-pointer
        border-[5px] border-[#fff]
        text-[#fff] font-semibold
        text-xl
        shadow-md
      "
    >
      Continue
    </button>
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
        audioTime={audioTime}
        audioDuration={audioDuration}
        captionText={captionText}
        slideComplete={slideComplete}
        currentModuleTotal={currentModuleTotal}
        elapsedSeconds={elapsedSeconds}
        currentModuleIndex={currentModuleIndex}
        currentLessonIndex={currentLessonIndex}
        modules={modules}
        lessons={lessons}
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

  function QuizView({
    quizQuestions,
    quizIndex,
    setQuizQuestions,
    goNext,
    setCanProceed,
    audioDuration,
  }: any) {

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
              {/* SUBMIT */}
              <button
                onClick={() => {
                  if (!q.selected) return;

                  setCanProceed(true);

                  setQuizQuestions((prev: QuizState[]) => {
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


              {/* SKIP */}
             <button
              onClick={() => {
                setCanProceed(true);

                setQuizQuestions((prev: QuizState[]) => {
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
      audioTime,
      audioDuration,
      captionText,
      slideComplete,
      currentModuleTotal,
      elapsedSeconds,
      currentModuleIndex, 
      currentLessonIndex,
      modules,
      lessons,
    }: any) {


return (
  <div className="fixed bottom-[40px] left-0 right-0 bg-white border-t shadow-inner h-[180px] z-30">
    <div className="h-full max-w-6xl mx-auto px-6 flex items-center justify-center">

      {/* CAPTIONS OR QUIZ TEXT */}
      <div className="text-center mt-18 text-[#001f40] text-sm flex-1">

        {!isQuizMode && captionText ? (
          <p className="text-base leading-[32px] whitespace-pre-wrap text-center text-[#001f40]">
            {captionText}
          </p>
        ) : (
          <>
            {isQuizMode
              ? `Question ${quizIndex + 1} of ${totalQuiz}`
              : `Slide ${slideIndex + 1} of ${totalSlides}  |  ${audioTime.toFixed(1)}s / ${audioDuration.toFixed(1)}s`
            }
          </>
        )}

        {/* SMALL META BELOW */}
        <div className="mt-12 flex flex-col items-center text-[10px] leading-tight opacity-80">

          <div className="flex items-center gap-1 whitespace-nowrap">
            <span> *TEMPORARY </span>
            <span>Slide {slideIndex + 1} of {totalSlides}</span>
            <span>›</span>
            <span>{audioTime.toFixed(1)}s / {audioDuration.toFixed(1)}s</span>
            <span>›</span>
            <span>Module left: {(currentModuleTotal - elapsedSeconds).toFixed(0)}s</span>
            <span>{modules[currentModuleIndex]?.title}</span>
            <span>›</span>
            <span>{lessons[currentLessonIndex]?.title}</span>
            <span> *TEMPORARY </span>

          </div>
        </div>

      </div>

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

  // TODO: read real progress from DB
  const savedProgress = currentModuleIndex;

  return (
    <div
      key={m.id}
      className={`
        relative h-full flex items-center
        ${i <= savedProgress ? "cursor-pointer" : "cursor-not-allowed opacity-60"}
      `}
      style={{ width: `${segmentWidth}%` }}
      onClick={() => {
        if (i <= savedProgress) goToModule(i);      // backward always ok, forward only if unlocked
      }}
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
