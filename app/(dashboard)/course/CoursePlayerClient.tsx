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
  published_audio_url_a: string | null;
  published_audio_url_d: string | null;
  published_audio_url_j: string | null;
  published_audio_url_o: string | null;
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
    label: "Paul",
    urlKey: "published_audio_url_d",
    hashKey: "caption_hash_d",
  },
  {
    code: "en-US-Neural2-I",
    label: "Ringo",
    urlKey: "published_audio_url_o",
    hashKey: "caption_hash_o",
  },
  {
    code: "en-US-Neural2-J",
    label: "George",
    urlKey: "published_audio_url_j",
    hashKey: "caption_hash_j",
  },
];

export default function CoursePlayerClient() {
  const didApplyProgress = useRef(false);
  const searchParams = useSearchParams();
  const initialModuleId = searchParams.get("module_id");

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  // track highest DB-completed module
  const [maxCompletedIndex, setMaxCompletedIndex] = useState(0);
  const [progressReady, setProgressReady] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);

  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [captions, setCaptions] = useState<Record<string, CaptionRow[]>>({});

  const [promoOpen, setPromoOpen] = useState(false);

  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [volume, setVolume] = useState(0.8);
  const [voice, setVoice] = useState("en-US-Neural2-D");

  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [restoredReady, setRestoredReady] = useState(false)

  const cancelAutoplay = useRef(false);

//--------------------------------------------------------------------
// VOICE URL RESOLVER (UPDATED)
//--------------------------------------------------------------------
function resolveVoiceUrl(first: CaptionRow | undefined, voiceCode: string) {
  if (!first) return null;

  switch (voiceCode) {
    case "en-US-Neural2-A":
      return first.published_audio_url_a;
    case "en-US-Neural2-D":
      return first.published_audio_url_d;
    case "en-US-Neural2-I":
      return first.published_audio_url_o;
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


const [currentCaptionIndex, setCurrentCaptionIndex] = useState(0);
const [canProceed, setCanProceed] = useState(false);
const [isPaused, setIsPaused] = useState(false);

const audioRef = useRef<HTMLAudioElement | null>(null);

function togglePlay() {
  setIsPaused(prev => !prev);
}

//--------------------------------------------------------------------
// UNLOCK AUTOPLAY ON FIRST USER GESTURE
//--------------------------------------------------------------------
useEffect(() => {
  const unlock = () => {
    if (!audioRef.current) return;
    audioRef.current.play().catch(() => {});
    window.removeEventListener("click", unlock);
  };
  window.addEventListener("click", unlock);
  return () => window.removeEventListener("click", unlock);
}, []);

//-----------------------------------
// TIME-BASED PROGRESS CALCULATIONS
//-----------------------------------
const totalModuleSeconds = slides.reduce((sum, slide) => {
  const caps = captions[slide.id] || [];
  return sum + caps.reduce((s, c) => s + (c.seconds ?? 0), 0);
}, 0);

const elapsedSeconds = (() => {
  let sec = 0;

for (let i = 0; i < slideIndex; i++) {
  const slide = slides[i];
  if (!slide) continue;
  const caps = captions[slide.id] || [];
  sec += caps.reduce((s, c) => s + (c.seconds ?? 0), 0);
}


  const slide = slides[slideIndex];
  if (!slide) return sec;

  const caps = captions[slide.id] || [];
  for (let j = 0; j < currentCaptionIndex; j++) {
    sec += (caps[j]?.seconds ?? 0);
  }

  const cur = caps[currentCaptionIndex];
  if (cur) {
    sec += Math.min(audioTime, cur.seconds ?? 0);
  }

  return sec;
})();

  /* ------------------------------------------------------

useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;

  function safePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (!isPaused) {
      a.play().catch(() => {});
    }
  }

  audio.addEventListener("loadedmetadata", safePlay);
  audio.addEventListener("canplaythrough", safePlay);

  return () => {
    audio.removeEventListener("loadedmetadata", safePlay);
    audio.removeEventListener("canplaythrough", safePlay);
  };
}, [isPaused]);
  ------------------------------------------------------ */

  /* ------------------------------------------------------
     checks backend status and redirects
  ------------------------------------------------------ */
    async function refreshStatusAndRedirect() {
      const res = await fetch("/api/course/status");
      const data = await res.json();

      if (data.status === "completed_unpaid") {
        window.location.href = "/finish-pay";
      } else if (
        data.status === "completed_paid" ||
        data.status === "dmv_submitted"
      ) {
        window.location.href = "/finish";
      }
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

// ------------------------
// PROGRESS LOADING + APPLY
// ------------------------
useEffect(() => {
  async function loadProgress() {
    const user = await supabase.auth.getUser();
    if (!user?.data?.user) {
      setProgressReady(true); // nothing to resume
      return;
    }

    const { data: modRows } = await supabase
      .from("course_progress_modules")
      .select("*")
      .eq("user_id", user.data.user.id)
      .eq("course_id", "FL_PERMIT_TRAINING");

    const { data: slideRows } = await supabase
      .from("course_progress_slides")
      .select("*")
      .eq("user_id", user.data.user.id)
      .eq("course_id", "FL_PERMIT_TRAINING");

    applyProgress(modRows ?? [], slideRows ?? []);
  }

  if (modules.length && lessons.length) {
    loadProgress();
  }
}, [modules, lessons]);


function applyProgress(
  modRows: any[] = [],
  slideRows: any[] = []
) {
  if (didApplyProgress.current) {
    // already applied → but wait for restoredReady rather than completing UI now
    setProgressReady(true);
    setRestoredReady(true);
    return;
  }
  didApplyProgress.current = true;

  if (!Array.isArray(modRows) || !Array.isArray(slideRows)) {
    setProgressReady(true);
    setRestoredReady(true);
    return;
  }

  const completedModules = modRows.filter(m => m?.completed);
  const maxCompletedModule = completedModules.length
    ? completedModules.reduce((a, b) =>
        (a?.module_index ?? 0) > (b?.module_index ?? 0) ? a : b
      ).module_index
    : 0;

  setMaxCompletedIndex(maxCompletedModule);

  const highestModule = modRows.length
    ? Math.max(...modRows.map(m => m?.module_index ?? 0))
    : 0;

  const targetModule = Math.max(maxCompletedModule, highestModule);
  setCurrentModuleIndex(targetModule);

  const slidesInModule = slideRows.filter(
    s => (s?.module_index ?? -1) === targetModule
  );

  if (!slidesInModule.length) {
    setProgressReady(true);
    setRestoredReady(true);
    return;
  }

  const last = slidesInModule.reduce((a, b) =>
    (a?.slide_index ?? 0) > (b?.slide_index ?? 0) ? a : b
  );

  setCurrentLessonIndex(last.lesson_index ?? 0);
  setSlideIndex(last.slide_index ?? 0);

  setCanProceed(true);

  // mark BOTH now, but contentReady must wait for loading that slide
  setProgressReady(true);
  setRestoredReady(true);
}

/* ------------------------------------------------------
     LOAD LESSONS (without resetting lesson index)
  ------------------------------------------------------ */
  async function loadLessons(moduleId: string) {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("sort_order", { ascending: true });

    if (!data?.length) {
      setLessons([]);
      return;
    }

    setLessons(data);
    // DO NOT reset currentLessonIndex here
  }

 /* ------------------------------------------------------
   LOAD LESSON CONTENT  (with contentReady gates)
------------------------------------------------------ */
async function loadLessonContent(lessonId: number) {
  // reset content-ready for this lesson load
  setContentReady(false);

  // stop any audio in progress
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.src = "";
  }

  // clear existing content
  setSlides([]);
  setCaptions({});

  // ---- SLIDES ----
  const { data: slideRows } = await supabase
    .from("lesson_slides")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });

  setSlides(slideRows || []);

  // ---- CAPTIONS ----
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
      published_audio_url_j,
      published_audio_url_o
    `)
    .in("slide_id", slideIds)
    .order("line_index", { ascending: true });

  const grouped: Record<string, CaptionRow[]> = {};
  slideRows?.forEach((s) => {
    grouped[s.id] =
      captionRows?.filter((c) => String(c.slide_id) === String(s.id)) ?? [];
  });

  setCaptions(grouped);

// finished loading this lesson’s data
setLoading(false);

// allow UI only when progress + restoration are done
if (restoredReady) {
  setContentReady(true);
}
// finished loading this lesson’s data
setLoading(false);

// allow UI only when progress + restoration are done
if (restoredReady) {
  setContentReady(true);
}
}
// DO NOT reset slideIndex / captionIndex / canProceed here

// DO NOT reset slideIndex / captionIndex / canProceed here


/* ------------------------------------------------------
   NAV / QUIZ STATE
------------------------------------------------------ */
const totalSlides = slides.length;

const isFinalSlideOfModule =
  currentLessonIndex === lessons.length - 1 &&
  slideIndex === totalSlides - 1;

const showContinueInstruction =
  isFinalSlideOfModule &&
  canProceed;


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
  const l = lessons[currentLessonIndex];
  if (!l) return;
  loadLessonContent(l.id);
}, [lessons, currentLessonIndex]);

/* ------------------------------------------------------
   SLIDE RESET (very important)
------------------------------------------------------ */
useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
  audio.src = "";
  setCurrentCaptionIndex(0);
  setCanProceed(false);
}, [slideIndex]);

/* ------------------------------------------------------
   SAFE AUTOPLAY (Slide changed)
------------------------------------------------------ */
useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;
  if (!contentReady) return;

  const slide = slides[slideIndex];
  if (!slide) return;

  const caps = captions[slide.id] || [];
  const urls = caps.map(c => resolveVoiceUrl(c, voice)).filter(Boolean);
  if (!urls.length) {
    setCanProceed(true);
    return;
  }

  const nextUrl = urls[currentCaptionIndex];
  if (!nextUrl) {
    setCanProceed(true);
    return;
  }

  if (audio.src !== nextUrl) {
    audio.src = nextUrl;

    try {
      audio.load();
      audio.currentTime = 0;      // pre-seek so play starts from frame 0
    } catch {}

    // wait for ready state before playing
    audio.oncanplay = () => {
      audio.oncanplay = null;
      if (!isPaused && !cancelAutoplay.current) {
        audio.play().catch(() => {});
      }
    };

    return;   // do not fall through
  }

  // if src already matches, only play if not paused
  if (!isPaused && !cancelAutoplay.current) {
    // small delay prevents cutting first words
    setTimeout(() => {
      audio.play().catch(() => {});
    }, 40);
  }

}, [
  slideIndex,
  currentCaptionIndex,
  captions,
  voice,
  slides,
  contentReady
]);


/* ------------------------------------------------------
   PAUSE
------------------------------------------------------ */
useEffect(() => {
  const a = audioRef.current;
  if (!a) return;
  if (isPaused) a.pause();
}, [isPaused]);

/* ------------------------------------------------------
   RESUME
------------------------------------------------------ */
useEffect(() => {
  const a = audioRef.current;
  if (!a) return;
  if (isPaused) return;

  setTimeout(() => {
    a.play().catch(()=>{});
  }, 50);
}, [isPaused]);


/* ------------------------------------------------------
   PROGRESS UPDATERS (copy/paste exactly)
------------------------------------------------------ */
async function recordSlideComplete(moduleIndex: number, lessonIndex: number, slideIndex: number) {
  const user = await supabase.auth.getUser();
  console.log("recordSlideComplete user:", user?.data?.user);
  if (!user.data.user) return;

  const module = modules[moduleIndex];
  const lesson = lessons[lessonIndex];
  const slide = slides[slideIndex];

  if (!module || !lesson || !slide) return;

await supabase
  .from("course_progress_slides")
  .upsert(
    {
      user_id: user.data.user.id,
      course_id: "FL_PERMIT_TRAINING",
      module_id: module.id,
      lesson_id: lesson.id,
      slide_id: slide.id,
      slide_index: slideIndex,
      lesson_index: lessonIndex,
      completed: true,
    },
    { onConflict: "user_id,course_id,slide_id" }
  )
  .select()
  .throwOnError();
}


/* update module-level progress */
async function updateModuleProgress(moduleIndex: number) {
  const user = await supabase.auth.getUser();
  if (!user.data.user) return;

  const module = modules[moduleIndex];
  if (!module) return;

  // total slides in that module
  const { data: totalSlides } = await supabase
    .from("lesson_slides")
    .select("id")
    .eq("module_id", module.id);

  const { data: completedSlides } = await supabase
    .from("course_progress_slides")
    .select("id")
    .eq("user_id", user.data.user.id)
    .eq("module_id", module.id)
    .eq("completed", true);

  const completed = (completedSlides?.length ?? 0) >= (totalSlides?.length ?? 0);

  // DEBUG THIS BEFORE UPSERT
  console.log("updateModuleProgress payload:", {
    user_id: user.data.user.id,
    course_id: "FL_PERMIT_TRAINING",
    module_id: module.id,
    module_index: moduleIndex,
    highest_slide_index: slides.length - 1,
    completed
  });

await supabase
  .from("course_progress_modules")
  .upsert(
    {
      user_id: user.data.user.id,
      course_id: "FL_PERMIT_TRAINING",
      module_id: module.id,
      module_index: moduleIndex,
      highest_slide_index: slides.length - 1,
      completed,
    },
    { onConflict: "user_id,course_id,module_id" }
  )
  .select()
  .throwOnError();
}
//--------------------------------------------------------------------
// SAFE DISPLAY VALUES FOR CURRENT UI
//--------------------------------------------------------------------
const currentSlide = slides[slideIndex] || null;

const currentImage = currentSlide
  ? resolveImage(currentSlide.image_path)
  : null;

const captionText = currentSlide
  ? (captions[currentSlide.id] || []).map(c => c.caption).join("\n")
  : "";

/* ------------------------------------------------------
   NAVIGATION  (FULL REPLACEMENT)
------------------------------------------------------ */
const goNext = useCallback(async () => {

  const record = async (modI: number, lesI: number, sliI: number) => {
    await recordSlideComplete(modI, lesI, sliI);
    await updateModuleProgress(modI);
  };

  // next slide in same lesson
  if (slideIndex < totalSlides - 1) {
    const nextSlide = slideIndex + 1;
    setSlideIndex(nextSlide);
    record(currentModuleIndex, currentLessonIndex, nextSlide);
    return;
  }

  // next lesson in same module
  if (currentLessonIndex < lessons.length - 1) {
    const nextLesson = currentLessonIndex + 1;
    setCurrentLessonIndex(nextLesson);
    setSlideIndex(0);
    record(currentModuleIndex, nextLesson, 0);
    return;
  }

  // next module
  if (currentModuleIndex < modules.length - 1) {
    const nextModule = currentModuleIndex + 1;
    setCurrentModuleIndex(nextModule);
    setCurrentLessonIndex(0);
    setSlideIndex(0);
    record(nextModule, 0, 0);
    return;
  }

  // end of all modules — no op
}, [
  slideIndex,
  totalSlides,
  currentLessonIndex,
  lessons.length,
  currentModuleIndex,
  modules.length,
]);

//--------------------------------------------------------------------
// PROGRESS BAR SMOOTHING
//--------------------------------------------------------------------
const progressPercentage =
  progressReady && contentReady && totalModuleSeconds > 0
    ? (elapsedSeconds / totalModuleSeconds) * 100
    : 0;



//--------------------------------------------------------------------
// backward navigation  (NO QUIZ)
//--------------------------------------------------------------------
const goPrev = () => {

  // previous slide in same lesson
  if (slideIndex > 0) {
    setSlideIndex(slideIndex - 1);
    return;
  }

  // go to last slide of previous lesson
  if (currentLessonIndex > 0) {
    const newLessonIndex = currentLessonIndex - 1;
    setCurrentLessonIndex(newLessonIndex);
    setSlideIndex(0); // will update after lesson loads
    return;
  }

  // go to previous module (start at lesson 0, slide 0)
  if (currentModuleIndex > 0) {
    const newModuleIndex = currentModuleIndex - 1;
    setCurrentModuleIndex(newModuleIndex);
    setCurrentLessonIndex(0);
    setSlideIndex(0);
    return;
  }
};
//--------------------------------------------------------------------
// jump to module only if user has unlocked it
//--------------------------------------------------------------------
function goToModule(i: number) {
  // block locked modules first
  if (i > maxCompletedIndex + 1) return;

  // hard-reset any current audio
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.src = "";
  }

  // reset navigation state
  setCurrentModuleIndex(i);
  setCurrentLessonIndex(0);
  setSlideIndex(0);
  setCurrentCaptionIndex(0);

  // entering a new module → require narration/timer again
  setCanProceed(false);
  setIsPaused(false);
}

// page loader only BEFORE progress + first content load
if (!progressReady || !contentReady) {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-white">
      <img
        src="/steering-wheel.png"
        className="w-24 h-24 steering-animation"
      />
    </div>
  );
}

  /* ------------------------------------------------------
     RENDER
  ------------------------------------------------------ */

  return (
    <div className="relative min-h-screen bg-white flex flex-col">

      {/* PROGRESS BAR */}
      <div className="fixed top-0 left-0 right-0 z-40 h-2 bg-gray-200">
        <div
          className="h-full bg-[#ca5608] transition-[width] duration-700 ease-linear"
          style={{ width: `${progressPercentage}%` }}
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
<div className="flex items-center gap-2">
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
    className="vol-range w-24 h-1 cursor-pointer appearance-none"
  />

  <style jsx>{`
    .vol-range {
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
    }
    .vol-range::-webkit-slider-runnable-track {
      height: 4px;
      background: #001f40;
      border-radius: 2px;
    }
    .vol-range::-moz-range-track {
      height: 4px;
      background: #001f40;
      border-radius: 2px;
    }
    .vol-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #001f40;
      margin-top: -2px;
    }
    .vol-range::-moz-range-thumb {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #001f40;
    }
  `}</style>
</div>

</div>

  
{/* MAIN -------------------------------------------------- */}
<div
  className="relative flex-1 w-screen h-screen overflow-hidden pt-0 md:pt-10 pb-[160px] z-0"
  onClick={(e) => {
    const tgt = e.target as HTMLElement;
    if (
      tgt.closest("button") ||
      tgt.closest("input") ||
      tgt.closest("select") ||
      tgt.closest("a")
    ) return;

    togglePlay();
  }}
>
  <SlideView currentImage={currentImage} />
</div>



{/* NARRATION AUDIO ELEMENT -------------------------------- */}
<audio
  ref={audioRef}
  autoPlay
  preload="auto"
  controls={false}
  onTimeUpdate={(e) => {
    const t = e.currentTarget.currentTime;
    setAudioTime(t);

    // EARLY UNLOCK FOR FINAL SLIDE OF MODULE
    const slide = slides[slideIndex];
    if (!slide) return;

    const caps = captions[slide.id] || [];
    const cur = caps[currentCaptionIndex];
    if (!cur) return;

    const target = cur.seconds ?? 0;
    const epsilon = 0.25; // unlock ~250ms before metadata end

    if (
      !canProceed &&
      isFinalSlideOfModule &&   // from outer scope
      target > 0 &&
      t >= target - epsilon
    ) {
      setCanProceed(true);
    }
  }}
  onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
  onEnded={async () => {
  if (isPaused) return;

  const slide = slides[slideIndex];
  if (!slide) return;

  const caps = captions[slide.id] || [];
  const urls = caps
    .map((c) => resolveVoiceUrl(c, voice))
    .filter(Boolean) as string[];

  // record this slide as completed no matter what
  await recordSlideComplete(currentModuleIndex, currentLessonIndex, slideIndex);
  await updateModuleProgress(currentModuleIndex);

  // no narration → immediately allow & advance
  if (!urls.length) {
    setCanProceed(true);

    // avoid double-locking on final slide
    if (!isFinalSlideOfModule && !isPaused) {
      goNext();
    }
    return;
  }

  // more captions?
  if (currentCaptionIndex < urls.length - 1) {
    setCurrentCaptionIndex(i => i + 1);
    return;
  }

  // last caption in slide reached
  setCanProceed(true);

  // auto advance only if not final slide
  if (!isFinalSlideOfModule && !isPaused) {
    goNext();
  }
}}

/>

{/* CONTINUE BTN (intro slides) ---------------------------- */}
{showContinueInstruction && (
  <div className="fixed bottom-[250px] left-0 right-0 flex justify-center z-40">
    <button
      onClick={() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = "";     // hard reset source
        }
        setIsPaused(false);               // ensure resumed state is known
        goNext();
      }}

      className="
        px-12 py-5
        rounded-xl
        bg-[#000]/30
        border-[5px] border-[#fff]
        text-[#fff] font-semibold text-xl
        shadow-md
        cursor-pointer
      "
    >
      Continue
    </button>
  </div>
)}

{/* FOOTER NAV --------------------------------------------- */}
<FooterNav
  goPrev={goPrev}
  goNext={goNext}
  slideIndex={slideIndex}
  totalSlides={totalSlides}
  audioTime={audioTime}
  audioDuration={audioDuration}
  captionText={captionText}
  currentModuleIndex={currentModuleIndex}
  currentLessonIndex={currentLessonIndex}
/>

{/* TIMELINE + PROMO ---------------------------------------- */}
<TimelineWithPromo
  modules={modules}
  currentModuleIndex={currentModuleIndex}
  maxCompletedIndex={maxCompletedIndex}
  goToModule={goToModule}
  promoOpen={promoOpen}
  setPromoOpen={setPromoOpen}
  slideIndex={slideIndex}
  totalSlides={totalSlides}
  currentLessonIndex={currentLessonIndex}
  totalModuleSeconds={totalModuleSeconds}
  elapsedSeconds={elapsedSeconds}
/>

</div>
);

}

// safe numeric display used by FooterNav + Timeline
function safeTime(v: any) {
  const n = Number(v);
  return isFinite(n) ? n.toFixed(1) : "0.0";
}



/* ============================================================
   SUBCOMPONENTS
============================================================ */

function SlideView({ currentImage }: { currentImage: string | null }) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    if (!currentImage) return

    const img = new Image()
    img.onload = () => setLoaded(true)
    img.src = currentImage
  }, [currentImage])

  return (
    <div className="absolute inset-0 flex items-start md:items-center justify-center z-10">

      {/* Skeleton shimmer while loading */}
      {!loaded && (
        <div className="w-[100vw] h-[100vh] animate-pulse bg-gradient-to-br from-gray-100 to-gray-200" />
      )}

      {/* Main image */}
      {currentImage && (
        <img
          src={currentImage}
          draggable={false}
          decoding="async"
          loading="eager"
          style={{ opacity: loaded ? 1 : 0 }}
          className="
            w-[100vw]
            h-[100vh]
            object-cover
            object-center
            select-none
            transition-opacity duration-700
          "
        />
      )}

      {/* NA fallback */}
      {!currentImage && (
        <div className="text-gray-400 italic">Loading image…</div>
      )}
    </div>
  )
}


/* -----------------------------------------------------------
   FOOTER NAV  (Module → Lesson → Slide/Question)
----------------------------------------------------------- */
function FooterNav({
  goPrev,
  goNext,
  slideIndex,
  totalSlides,
  audioTime,
  audioDuration,
  captionText,
  currentModuleIndex,
  currentLessonIndex,
}: any) {

  function statusText() {
    const at = Number(audioTime ?? 0).toFixed(1);
    const ad = Number(audioDuration ?? 0).toFixed(1);

    return `Module ${currentModuleIndex + 1} → Lesson ${
      currentLessonIndex + 1
    } | Slide ${slideIndex + 1} of ${totalSlides} | ${at}s / ${ad}s`;
  }

  return (
    <div className="fixed bottom-[40px] left-0 right-0 bg-white border-t shadow-inner h-[180px] z-30">
      <div className="h-full max-w-6xl mx-auto px-6 flex items-start justify-between relative pt-4 text-[#001f40]">

        {captionText && (
          <p
            className="
              text-lg
              leading-[32px]
              whitespace-pre-wrap
              text-center
              text-[#001f40]
              w-full
              px-6
            "
          >
            {captionText}
          </p>
        )}

      </div>
    </div>
  );
}


/* -----------------------------------------------------------
   TIMELINE WITH PROMO  + FIXED METADATA (CoursePlayer version)
----------------------------------------------------------- */
function TimelineWithPromo(props: any) {

  const {
    modules = [],
    currentModuleIndex = 0,
    maxCompletedIndex = 0,
    goToModule = () => {},
    promoOpen = false,
    setPromoOpen = () => {},
    slideIndex = 0,
    totalSlides = 1,
    audioTime = 0,
    audioDuration = 0,
    currentLessonIndex = 0,
    totalModuleSeconds = 0,
    elapsedSeconds = 0,
  } = props;

  const segmentWidth = modules.length > 0 ? 100 / modules.length : 100;

 // build shared info text like FooterNav:
function statusText() {
  const elapsed = safeTime(elapsedSeconds);
  const total   = safeTime(totalModuleSeconds);

  return `Module ${currentModuleIndex + 1} → Lesson ${
    currentLessonIndex + 1
  } | ${elapsed}s / ${total}s`;
}

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white z-40 py-3 border-t shadow-inner">

      {/* *** FIXED META ON THE RIGHT *** */}
      <div className="absolute right-6 bottom-[48px] text-xs md:text-sm text-[#001f40] opacity-80 pointer-events-none">
        {statusText()}
      </div>

      <div className="w-full px-4 md:px-0">
        <div className="md:max-w-6xl md:mx-auto p-4">

          <div className="relative w-full h-6 flex items-center">

            {/* dark rail */}
            <div className="absolute left-0 right-0 h-2 bg-[#001f40] rounded-full" />

            <div className="relative w-full h-6 flex items-center">


          {modules.map((m: ModuleRow, i: number) => {
            const isCompleted = i < currentModuleIndex
            const isActive = i === currentModuleIndex

            // Allow only completed and immediate next
          const isUnlocked = i <= maxCompletedIndex + 1

            const isLast = i === modules.length - 1

            // cursor
            const cursor = isUnlocked ? "cursor-pointer" : "cursor-not-allowed"

            let bg;
            if (isCompleted) {
              bg = "#ca5608"; // completed orange
            } else if (isActive) {
              bg = "#ca5608"; // active (same color or change if desired)
            } else if (isLast) {
              bg = "#001f40"; // keep last special
            } else {
              bg = "#4B1E1E"; // future
            }

    return (
      <div
          key={m.id}
          style={{ width: `${segmentWidth}%` }}
          className={`relative h-full flex items-center justify-center ${cursor}`}
          onClick={() => {
            if (!isUnlocked) return
            goToModule(i)
          }}
        >

      <div
        className={`flex-1 h-2 ${cursor}`}
        style={{
          backgroundColor: bg,
          boxShadow: isActive ? `0 0 6px ${bg}` : "none",
          opacity: isUnlocked ? 1 : 0.4,
          borderTopLeftRadius: i === 0 ? 999 : 0,
          borderBottomLeftRadius: i === 0 ? 999 : 0,
          borderTopRightRadius:    i === modules.length - 1 ? 999 : 0,
          borderBottomRightRadius: i === modules.length - 1 ? 999 : 0,
         }}
      />

      {!isLast && <div className="w-[3px] h-full bg-white" />}
    </div>
  );
})}

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
