// deno-lint-ignore-file

"use client";

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useState, useCallback, useRef } from "react";
import CourseTimeline from "@/components/CourseTimeline";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Loader from "@/components/loader";



/* ------------------------------------------------------
   KARAOKE HELPERS  (MOVE THESE OUTSIDE THE COMPONENT)
------------------------------------------------------ */

function tokenizeCaption(text: string): string[] {
  if (!text) return [];

  // Split words but KEEP punctuation attached
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function tokenizeForTiming(text: string): string[] {
  if (!text) return [];

  // separate punctuation *only for timing*
  return text
    .trim()
    .replace(/([.,!?;:])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean);
}

function computeWordTimings(totalSeconds: number, words: string[]) {
  if (!words.length) return [];

  const SPEED = .98;

  const weights = words.map((w) => {
    const isPunct = /[.,!?;:]/.test(w);

    if (isPunct) {
      if (w === ".") return 14; // long pause
      if (w === ",") return 6;  // medium pause
      return 4;                 // other punctuation
    }

    // normal words: weight proportional to length
    return Math.max(2, Math.min(w.length * 1.1, 8));
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const scaledTotal = totalSeconds * SPEED;

  let cursor = 0;

  return weights.map((wt) => {
    const dur = (wt / totalWeight) * scaledTotal;
    const start = cursor;
    cursor += dur;
    return { start, end: cursor };
  });
}

function mapTimingIndexToDisplayIndex(
  timingWords: string[],
  displayWords: string[]
) {
  let dIndex = 0;
  let result: number[] = [];

  for (let i = 0; i < timingWords.length; i++) {
    const tw = timingWords[i];
    const dw = displayWords[dIndex] ?? "";

    // timing word belongs to current display word
    if (dw.startsWith(tw) || dw.includes(tw)) {
      result.push(dIndex);
    }
    // punctuation belongs to displayWords[dIndex]
    else if (/[.,!?;:]/.test(tw)) {
      result.push(dIndex);
      continue; // do not advance dIndex
    }
    // next display word
    else {
      dIndex++;
      result.push(dIndex);
    }
  }

  return result;
}

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
  const deepLinkConsumedRef = useRef(false);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  // track highest DB-completed module
  const [maxCompletedIndex, setMaxCompletedIndex] = useState(0);
  const [progressReady, setProgressReady] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [progressResolved, setProgressResolved] = useState(false);

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
  const [initialHydrationDone, setInitialHydrationDone] = useState(false);

  const [showPlayFlash, setShowPlayFlash] = useState(false);
  const playFlashTimer = useRef<number | null>(null);

  const [courseTotals, setCourseTotals] = useState<{
  totalSeconds: number; }>({ totalSeconds: 0 });
  const [examPassed, setExamPassed] = useState(false);
  const [paymentPaid, setPaymentPaid] = useState(false);


  const [moduleTotals, setModuleTotals] = useState<Record<string, number>>({});
  const COURSE_ID = "FL_PERMIT_TRAINING";
  const TOTAL_REQUIRED_SECONDS = 6 * 60 * 60; // 21600
  
  const voiceLabel =
    VOICES.find(v => v.code === voice)?.label ?? "Unknown";
  
  const searchParams = useSearchParams();
  const router = useRouter();


// -------------------------------------------------------------
// DEBUG: Core gate values (helps detect infinite steering wheel)
// -------------------------------------------------------------
useEffect(() => {
  console.log("GATES:", {
    progressReady,
    contentReady,
    restoredReady,
    initialHydrationDone
  });
  console.log("INDICES:", {
    currentModuleIndex,
    currentLessonIndex,
    slideIndex
  });
}, [progressReady, contentReady, restoredReady, initialHydrationDone,
    currentModuleIndex, currentLessonIndex, slideIndex]);


  useEffect(() => {
    if (progressReady && contentReady && !initialHydrationDone) {
      setInitialHydrationDone(true);
    }
  }, [progressReady, contentReady]);

  const cancelAutoplay = useRef(false);
  const resetAudioElement = useCallback(() => {
  const audio = audioRef.current;
  if (!audio) return;

  audio.pause();
  audio.src = "";
  audio.load();
  audio.currentTime = 0;

  // do NOT touch cancelAutoplay here
}, []);

function preloadAudio(url: string) {
  const a = new Audio();
  a.src = url;
  a.preload = "auto";  // Tells browser to decode early
}

// ------------------------------------------------------
// COURSE COMPLETION
// ------------------------------------------------------
const courseCompletionSentRef = useRef(false);

async function markCourseCompletedOnce() {
  if (courseCompletionSentRef.current) return;
  courseCompletionSentRef.current = true;

  try {
    await fetch("/api/course/complete", {
  method: "POST",
  credentials: "include",
});
  } catch (e) {
    console.error("Failed to mark course complete", e);
  }
}

// ------------------------------------------------------
// AUDIO FADE HELPERS (HTMLAudioElement ONLY)
// ------------------------------------------------------
const fadeFrameRef = useRef<number | null>(null);
const targetVolumeRef = useRef(volume);

const cancelFade = useCallback(() => {
  if (fadeFrameRef.current !== null) {
    cancelAnimationFrame(fadeFrameRef.current);
    fadeFrameRef.current = null;
  }
}, []);

const fadeToVolume = useCallback(
  (audio: HTMLAudioElement, target: number, duration = 140) => {
    cancelFade();

    const start = performance.now();
    const initial = audio.volume;

    const clamp = (v: number) => Math.min(1, Math.max(0, v));

    if (duration <= 0) {
      audio.volume = clamp(target);
      return;
    }

    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);

      const raw = initial + (target - initial) * p;
      audio.volume = clamp(raw);

      if (p < 1) {
        fadeFrameRef.current = requestAnimationFrame(step);
      } else {
        fadeFrameRef.current = null;
      }
    };

    fadeFrameRef.current = requestAnimationFrame(step);
  },
  [cancelFade]
);

// keep ref in sync with slider
useEffect(() => {
  targetVolumeRef.current = volume;
}, [volume]);

// cleanup on unmount
useEffect(() => cancelFade, [cancelFade]);

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
// NEW — for karaoke word highlighting
const [currentWordIndex, setCurrentWordIndex] = useState(0);


const audioRef = useRef<HTMLAudioElement | null>(null);

const hardResetAudio = useCallback(() => {
  cancelFade();

  const audio = audioRef.current;
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;

  // clear buffer completely
  audio.src = "";
  audio.load();

  audio.volume = targetVolumeRef.current;
  audio.oncanplay = null;
}, [cancelFade]);


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


//--------------------------------------------------------------------
// RESUME ON PAUSE - RESETS SOUND
//--------------------------------------------------------------------
const isPausedRef = useRef(false);

useEffect(() => {
  isPausedRef.current = isPaused;
}, [isPaused]);

//--------------------------------------------------------------------
// RESTORE AUTOPLAY AFTER PROGRESS RESTORE
//--------------------------------------------------------------------
useEffect(() => {
  if (restoredReady && contentReady) {
    cancelAutoplay.current = false;
  }
}, [restoredReady, contentReady]);


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

  // -----------------------------------
  // COURSE-LEVEL TOTAL TIME
  // -----------------------------------
  const totalCourseSeconds = (() => {
    let total = 0;

    modules.forEach((mod) => {
      const modLessons = lessons.filter(
        (l) => l.module_id === mod.id
      );

      modLessons.forEach((lesson) => {
        const lessonSlides = slides.filter(
          (s) => s.lesson_id === lesson.id
        );

        lessonSlides.forEach((slide) => {
          const caps = captions[slide.id] || [];
          total += caps.reduce(
            (sum, c) => sum + (c.seconds ?? 0),
            0
          );
        });
      });
    });

    return total;
  })();

  // per-module totals
  useEffect(() => {
  async function loadCourseTotals() {
    const { data: slideRows } = await supabase
      .from("lesson_slides")
      .select("id");

    const slideIds = slideRows?.map(s => s.id) ?? [];

    const { data: caps } = await supabase
      .from("slide_captions")
      .select("seconds")
      .in("slide_id", slideIds);

    const total = (caps ?? []).reduce(
      (sum, c) => sum + (c.seconds ?? 0),
      0
    );

    setCourseTotals({ totalSeconds: total });
  }

  loadCourseTotals();
}, []);

const completedModulesSeconds = modules
  .slice(0, currentModuleIndex)
  .reduce(
    (sum, m) => sum + (moduleTotals[m.id] || 0),
    0
  );

// -----------------------------------
// COURSE-LEVEL ELAPSED TIME (FINAL)
// -----------------------------------
const elapsedCourseSeconds =
  completedModulesSeconds + elapsedSeconds;



useEffect(() => {
  async function loadModuleTotals() {
    const { data: slideRows } = await supabase
      .from("lesson_slides")
      .select("id, lesson_id");

    const { data: lessonRows } = await supabase
      .from("lessons")
      .select("id, module_id");


    const lessonToModule = Object.fromEntries(
    (lessonRows ?? []).map(l => [l.id, l.module_id])
  );

    const { data: caps } = await supabase
      .from("slide_captions")
      .select("slide_id, seconds");

    const slideToLesson = Object.fromEntries(
      (slideRows ?? []).map(s => [s.id, s.lesson_id])
    );


    const totals: Record<string, number> = {};

    caps?.forEach(c => {
      const lessonId = slideToLesson[c.slide_id];
      const moduleId = lessonToModule[lessonId];
      if (!moduleId) return;

      totals[moduleId] = (totals[moduleId] || 0) + (c.seconds ?? 0);
    });

    setModuleTotals(totals);
  }

  loadModuleTotals();
}, []);

  /* ------------------------------------------------------
     checks backend status and redirects
  ------------------------------------------------------ */
 const [terminalStatusLoaded, setTerminalStatusLoaded] = useState(false);

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

    async function loadTerminalStatus() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.warn("No session — skipping terminal status");
    return;
  }

  const res = await fetch("/api/course/status", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    console.error("Failed to load terminal status", res.status);
    return;
  }

  const data = await res.json();

  console.log("COURSE STATUS RESPONSE:", data);

  setExamPassed(data.exam_passed === true);

  setPaymentPaid(
    data.status === "completed_paid" ||
    data.status === "dmv_submitted"
  );
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
    }
  }

// ------------------------
// PROGRESS LOADING + APPLY
// ------------------------
useEffect(() => {
  // Wait until modules are loaded
  if (!modules.length) return;

  // Apply progress exactly once
  if (didApplyProgress.current) return;

  loadProgress();
}, [modules]);

async function loadProgress() {
  const user = await supabase.auth.getUser();

  if (!user?.data?.user) {
    applyProgress([], []);
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

function applyProgress(
  modRows: any[] = [],
  slideRows: any[] = []
) {

  // ----------------------------------
  // SINGLE ENTRY GUARD (ONLY PLACE)
  // ----------------------------------
  if (didApplyProgress.current) return;
  didApplyProgress.current = true;

  console.log("APPLY_PROGRESS INPUT:", {
    modCount: modRows.length,
    slideCount: slideRows.length,
  });

  // ----------------------------------
  // BASIC SANITY
  // ----------------------------------
  if (!Array.isArray(modRows) || !Array.isArray(slideRows)) {
    unlockProgressGates();
    return;
  }

// ----------------------------------
// URL DEEP-LINK
// ----------------------------------
const rawParam = searchParams.get("module");

let urlIndex: number | null = null;

if (rawParam !== null) {
  const parsed = Number(rawParam);
  if (Number.isInteger(parsed)) {
    urlIndex = parsed;
  }
}

// ----------------------------------
// MODULE COMPLETION (DB)
// ----------------------------------
const completedModules = modRows.filter(m => m?.completed);

const maxCompletedModuleIndex = completedModules.length
  ? Math.max(...completedModules.map(m => m.module_index ?? 0))
  : 0;

setMaxCompletedIndex(maxCompletedModuleIndex);

// ----------------------------------
// FINAL MODULE DECISION (SINGLE SOURCE OF TRUTH)
// ----------------------------------
let finalModuleIndex = maxCompletedModuleIndex;

if (urlIndex !== null) {
  finalModuleIndex = Math.min(urlIndex, maxCompletedModuleIndex);
}

console.log("📍 FINAL MODULE INDEX:", finalModuleIndex);

setCurrentModuleIndex(finalModuleIndex);


// ----------------------------------
// SLIDE POSITION WITHIN *FINAL* MODULE
// ----------------------------------
const slidesInModule = slideRows.filter(
  s => (s?.module_index ?? -1) === finalModuleIndex
);

if (!slidesInModule.length) {
  setCurrentLessonIndex(0);
  setSlideIndex(0);
  unlockProgressGates();
  return;
}

const last = slidesInModule.reduce((a, b) =>
  (a.slide_index ?? 0) > (b.slide_index ?? 0) ? a : b
);

setCurrentLessonIndex(last.lesson_index ?? 0);
setSlideIndex(last.slide_index ?? 0);

unlockProgressGates();

}

// ----------------------------------
// CENTRALIZED GATE UNLOCK
// ----------------------------------
function unlockProgressGates() {
  setProgressReady(true);
  setRestoredReady(true);
  setProgressResolved(true);
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
  console.log("LOAD_LESSON_CONTENT: start", { lessonId });

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

  console.log("LESSON CONTENT LOADED:", {
    lessonId,
    slidesLoaded: slideRows?.length ?? 0,
    captionsLoaded: captionRows?.length ?? 0,
    restoredReady,
    contentReadyPending: true
  });

  // ------------------------------------------------------
  // PATCH: Unlock autoplay for *fresh module loads* 
  // (restoredReady = false means NEW USER or NEW MODULE)
  // ------------------------------------------------------
  if (!restoredReady) {
    console.log("FRESH MODULE LOAD → enabling contentReady immediately");
    setContentReady(true);
  }

  // finished loading lesson data
  setLoading(false);

  // ------------------------------------------------------
  // If restoring from saved progress, wait and then unlock.
  // ------------------------------------------------------
  if (restoredReady) {
    console.log("RESTORED PROGRESS → enabling contentReady");
    setContentReady(true);
  }
}

/* ------------------------------------------------------
   NAV STATE
------------------------------------------------------ */
const totalSlides = slides.length;

const isFinalSlideOfModule =
  currentLessonIndex === (lessons?.length ?? 0) - 1 &&
  slideIndex === totalSlides - 1;

const showContinueInstruction =
  isFinalSlideOfModule &&
  canProceed;

const isFinalCourseSlide =
  isFinalSlideOfModule &&
  currentModuleIndex === (modules?.length ?? 0) - 1;

/* ------------------------------------------------------
   LOAD SEQUENCE
------------------------------------------------------ */
useEffect(() => {
  loadModules();
}, []);

useEffect(() => {
  loadTerminalStatus();
}, []);


useEffect(() => {
  if (!progressResolved) return;
  const module = modules[currentModuleIndex];
  if (!module) return;
  loadLessons(module.id);
}, [modules, currentModuleIndex, progressResolved]);

useEffect(() => {
  if (!progressResolved) return;
  const l = lessons[currentLessonIndex];
  if (!l) return;
  loadLessonContent(l.id);
}, [lessons, currentLessonIndex, progressResolved]);

useEffect(() => {
  // If restoredReady turned true AFTER lesson content loaded,
  // we must unlock contentReady manually.
  if (restoredReady && slides.length > 0 && Object.keys(captions).length > 0) {
    console.log("LATE RESTORE → Unlocking contentReady now");
    setContentReady(true);
  }
}, [restoredReady, slides, captions]);

/* ------------------------------------------------------
   SLIDE RESET (very important)
------------------------------------------------------ */
useEffect(() => {
  // 🚫 terminal state — do not reset anything
  if (isFinalCourseSlide) return;

  resetAudioElement();
  setCurrentCaptionIndex(0);
  setCanProceed(false);
}, [slideIndex, isFinalCourseSlide, resetAudioElement]);

useEffect(() => {
  const audio = audioRef.current;
  if (!audio || !contentReady) return;

  const slide = slides[slideIndex];
  if (!slide) return;

  const caps = captions[slide.id] || [];
  const urls = caps.map(c => resolveVoiceUrl(c, voice)).filter(Boolean);

if (!urls.length) {
  if (!isFinalSlideOfModule) {
    setCanProceed(true);
  }
  return;
}


  const nextUrl = urls[currentCaptionIndex];
  if (!nextUrl) {
    if (!isFinalSlideOfModule) {
      setCanProceed(true);
    }
    return;
  }

  // preload next caption
  if (currentCaptionIndex + 1 < urls.length) {
    preloadAudio(urls[currentCaptionIndex + 1]!);
  }

  if (cancelAutoplay.current) return;

  // SRC CHANGE
  if (audio.src !== nextUrl) {
    cancelFade();

    audio.pause();
    audio.currentTime = 0;
    audio.src = nextUrl;

    audio.volume = 0; // HARD SILENCE BEFORE PLAY

    audio.oncanplaythrough = () => {
      audio.oncanplaythrough = null;

      // If user paused during transition, do NOT start silent playback
      if (isPausedRef.current || cancelAutoplay.current) {
        audio.volume = targetVolumeRef.current;
        return;
      }

      audio
        .play()
        .then(() => fadeToVolume(audio, targetVolumeRef.current))
        .catch(() => {});
    };

    audio.load();
    return;
  }

  // SAME SRC → RESUME
  if (!isPaused && !cancelAutoplay.current) {
    audio
      .play()
      .then(() => fadeToVolume(audio, targetVolumeRef.current, 120))
      .catch(() => {});
  }
}, [
  slideIndex,
  currentCaptionIndex,
  captions,
  voice,
  slides,
  contentReady,
  isPaused,
  isFinalSlideOfModule,
  fadeToVolume,
  cancelFade
]);

/* ------------------------------------------------------
   PAUSE
------------------------------------------------------ */
useEffect(() => {
  const a = audioRef.current;
  if (!a) return;

  if (isPaused) {
    cancelAutoplay.current = true; // stop any in-flight transition play
    cancelFade();                  // stop fade animations
    a.pause();

    // If we paused while volume was forced to 0 for a transition,
    // restore it so resume can't be silent.
    if (a.volume === 0) a.volume = targetVolumeRef.current;
  }
}, [isPaused, cancelFade]);


/* ------------------------------------------------------
   AUTO-PAUSE WHEN PAGE IS NOT ACTIVE
------------------------------------------------------ */
useEffect(() => {
  function handleVisibility() {
    if (document.hidden) {
      setIsPaused(true);
    }
  }

  function handleBlur() {
    setIsPaused(true);
  }

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("blur", handleBlur);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("blur", handleBlur);
  };
}, []);

/* ------------------------------------------------------
   RESUME
------------------------------------------------------ */
useEffect(() => {
  const a = audioRef.current;
  if (!a) return;
  if (isPaused) return;

  cancelAutoplay.current = false;

  // If we were stuck at 0 volume, bring it back with a fade.
  if (a.volume === 0) a.volume = 0.001;

  setTimeout(() => {
    a.play()
      .then(() => fadeToVolume(a, targetVolumeRef.current, 120))
      .catch(() => {});
  }, 50);
}, [isPaused, fadeToVolume]);


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
   NAVIGATION  (FULL REPLACEMENT — FINAL SAFE VERSION)
------------------------------------------------------ */
const goNext = useCallback(async () => {

  // 🚨 FINAL COURSE TERMINAL STATE (ABSOLUTE STOP)
  if (isFinalCourseSlide) {
    await markCourseCompletedOnce();

    // HARD EXIT — prevents ANY restore / reset logic
    window.location.href = "/my-permit";
    return;
  }

  const record = async (modI: number, lesI: number, sliI: number) => {
    await recordSlideComplete(modI, lesI, sliI);
    await updateModuleProgress(modI);
  };

  // ▶️ NEXT SLIDE (same lesson)
  if (slideIndex < totalSlides - 1) {
    const nextSlide = slideIndex + 1;
    setSlideIndex(nextSlide);
    record(currentModuleIndex, currentLessonIndex, nextSlide);
    return;
  }

  // ▶️ NEXT LESSON (same module)
  if (currentLessonIndex < lessons.length - 1) {
    const nextLesson = currentLessonIndex + 1;
    setCurrentLessonIndex(nextLesson);
    setSlideIndex(0);
    record(currentModuleIndex, nextLesson, 0);
    return;
  }

// ▶ NEXT MODULE
if (currentModuleIndex < modules.length - 1) {
  const nextModule = currentModuleIndex + 1;

  resetAudioElement();
  cancelAutoplay.current = false;

  setSlides([]);
  setCaptions({});
  setCurrentCaptionIndex(0);
  setCurrentWordIndex(0);

  setContentReady(false);
  setRestoredReady(false);

  // UI fix starts here
  setMaxCompletedIndex(nextModule);    // optimistic state update

  setCurrentModuleIndex(nextModule);
  setCurrentLessonIndex(0);
  setSlideIndex(0);

  record(nextModule, 0, 0);
  return;
}

  // 🚫 NO FALLTHROUGH — terminal paths handled above
}, [
  isFinalCourseSlide,
  slideIndex,
  totalSlides,
  currentLessonIndex,
  currentModuleIndex,
  lessons?.length ?? 0,
  modules?.length ?? 0,
]);

//--------------------------------------------------------------------
// PROGRESS BAR SMOOTHING
//--------------------------------------------------------------------

const courseFinished =
  isFinalCourseSlide && canProceed;

const progressPercentage =
  courseFinished
    ? 100
    : progressReady && contentReady && totalModuleSeconds > 0
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
// jump to module only if user has unlocked it (GUARDED)
//--------------------------------------------------------------------
function goToModule(i: number) {

  // ✅ Always allow current module
  if (i === currentModuleIndex) {
    // fall through to existing reload logic below
  }
  // ✅ Allow completed modules
  else if (i <= maxCompletedIndex) {
    // allowed
  }
  // ✅ Allow next unlocked module
  else if (i === maxCompletedIndex + 1) {
    // allowed
  }
  // 🚫 Everything else blocked
  else {
    return;
  }

  // ------------------------------
  // SAME MODULE CLICK → HARD RELOAD
  // ------------------------------
  if (i === currentModuleIndex) {
    console.log("HARD MODULE RELOAD");

    resetAudioElement();
    cancelAutoplay.current = false;

    setContentReady(false);
    setRestoredReady(true);

    setCurrentLessonIndex(0);
    setSlideIndex(0);
    setCurrentCaptionIndex(0);
    setCanProceed(false);
    setIsPaused(false);

    loadLessons(modules[i].id)
      .then(() => loadLessonContent(lessons[0]?.id));

    return;
  }

  // ------------------------------
  // REAL MODULE SWITCH
  // ------------------------------
  resetAudioElement();
  cancelAutoplay.current = false;

  setContentReady(false);
  setRestoredReady(false);

  setCurrentModuleIndex(i);
  setCurrentLessonIndex(0);
  setSlideIndex(0);
  setCurrentCaptionIndex(0);

  setCanProceed(false);
  setIsPaused(false);

  router.push(`/course?module=${i}`);
}


// Show steering wheel ONLY during very first load
if (!initialHydrationDone) {
  if (!progressReady || !contentReady) {
    return (
     <Loader />
    );
  }
}

// AFTER initial hydration → do NOT block the UI with the loader

function togglePlay() {
  cancelAutoplay.current = false;

  setIsPaused(prev => {
    const next = !prev;

    // Paused → Playing transition
    if (prev && !next) {
      setShowPlayFlash(true);

      if (playFlashTimer.current) {
        clearTimeout(playFlashTimer.current);
      }

      playFlashTimer.current = window.setTimeout(() => {
        setShowPlayFlash(false);
      }, 450); // YouTube-like flash duration
    }

    return next;
  });
}


console.log("LOADER BLOCKED:", {
  progressReady,
  contentReady,
  restoredReady,
  initialHydrationDone
});

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

  {/* ▶️ PLAY / PAUSE OVERLAY */}
  <div
  className={`
    absolute left-0 right-0 z-20
    flex items-center justify-center
    transition-opacity duration-300
    ${isPaused ? "opacity-100" : "opacity-0 pointer-events-none"}
  `}
  style={{
    top: "8px",                 // progress bar
    bottom: "300px",             // footer + timeline + buffer
  }}
>

   <button
  onClick={(e) => {
    e.stopPropagation();
    togglePlay();
  }}
  className="
    w-20 h-20
    rounded-full
    bg-black/50
    flex items-center justify-center
    backdrop-blur-sm
    hover:bg-black/50
    transition
  "
>
{isPaused ? (
  /* ▶ PLAY — visible when paused */
  <svg
    viewBox="0 0 24 24"
    className="w-18 h-20 fill-white"
    style={{ transform: "translateX(-1.5px)" }}
  >
    <path d="
      M8.5 5
      a1.5 1.5 0 0 0-1.5 1.5
      v11
      a1.5 1.5 0 0 0 1.5 1.5
      L21.5 12
      Z
    " />
  </svg>
) : (
  /* ❚❚ PAUSE — visible when playing */
  <svg
    viewBox="0 0 24 24"
    className="w-15 h-15 fill-white"
    style={{ transform: "translateX(-2.5px)" }}
  >
    <path d="
      M6.8 5.5
      a1.1 1.1 0 0 1 1.1-1.1
      h2.2
      a1.1 1.1 0 0 1 1.1 1.1
      v13
      a1.1 1.1 0 0 1-1.1 1.1
      h-2.2
      a1.1 1.1 0 0 1-1.1-1.1
      z

      M14.9 5.5
      a1.1 1.1 0 0 1 1.1-1.1
      h2.2
      a1.1 1.1 0 0 1 1.1 1.1
      v13
      a1.1 1.1 0 0 1-1.1 1.1
      h-2.2
      a1.1 1.1 0 0 1-1.1-1.1
      z
    " />
  </svg>
)}
</button>
  </div>
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

    /* ---------- KARAOKE WORD TRACKING ---------- */
    const slideK = slides[slideIndex];
    if (slideK) {
      const capsK = captions[slideK.id] || [];
      const activeLine = capsK[currentCaptionIndex];

      if (activeLine) {
        const displayWords = tokenizeCaption(activeLine.caption);
        const timingWords  = tokenizeForTiming(activeLine.caption);

        const timings = computeWordTimings(activeLine.seconds ?? 0, timingWords);
        const map = mapTimingIndexToDisplayIndex(timingWords, displayWords);

        const lead = 0.08;
        const shifted = t + lead;

        let wi = timings.findIndex(w => shifted < w.end);
        if (wi === -1) wi = timings.length - 1;

        setCurrentWordIndex(map[wi]);
      }
    }

 /* ---------- EARLY UNLOCK (NON-FINAL COURSE SLIDES ONLY) ---------- */
const slide = slides[slideIndex];
const caps = slide ? captions[slide.id] || [] : [];
const cur = caps[currentCaptionIndex];

// 🚫 NEVER early-unlock the final slide of a module
if (
  cur &&
  !canProceed &&
  !isFinalSlideOfModule && 
  (cur.seconds ?? 0) > 0 &&
  t >= (cur.seconds ?? 0) - 0.75
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

    // Always record progress
    await recordSlideComplete(
      currentModuleIndex,
      currentLessonIndex,
      slideIndex
    );
    await updateModuleProgress(currentModuleIndex);

    // Advance caption if there are more
    if (currentCaptionIndex < urls.length - 1) {
      setCurrentCaptionIndex((i) => i + 1);
      return;
    }

    // Final caption of this slide reached
    setCanProceed(true);

    // 🔥 FINAL COURSE TERMINAL — GUARANTEED COMPLETION
    if (isFinalCourseSlide) {
      console.log("🔥 FINAL COURSE SLIDE — COMPLETING COURSE");

      await markCourseCompletedOnce();

      // allow DB write to flush before redirect
      setTimeout(() => {
        window.location.href = "/my-permit";
      }, 300);

      return;
    }

    // No narration edge-case (still allow continue)
    if (!urls.length) {
      if (!isFinalSlideOfModule) {
        setCanProceed(true);
      }
      return;
    }

    // Auto-advance normally
    if (!isFinalSlideOfModule && !isPaused) {
      goNext();
    }
  }}

  />

{/* CONTINUE BTN (intro slides) ---------------------------- */}
<div
  className={`
    fixed bottom-[250px] left-0 right-0
    flex justify-center z-40
    transition-all duration-500 ease-out
    ${showContinueInstruction
      ? "opacity-100 translate-y-0 pointer-events-auto"
      : "opacity-0 translate-y-4 pointer-events-none"}
  `}
>
  <button
    onClick={() => {
      resetAudioElement();
      setIsPaused(false);
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
  captions={captions}
  slides={slides}
  currentCaptionIndex={currentCaptionIndex}
  currentWordIndex={currentWordIndex}
/>

{/* COURSE TIMELINE ---------------------------------------- */}
 <CourseTimeline
  modules={modules}
  currentModuleIndex={currentModuleIndex}
  maxCompletedIndex={maxCompletedIndex}
  goToModule={goToModule}
  currentLessonIndex={currentLessonIndex}
  totalModuleSeconds={totalModuleSeconds}
  elapsedSeconds={elapsedSeconds}
  examPassed={examPassed}
  paymentPaid={paymentPaid}
/>


{/* MINI YOUTUBE-STYLE CONTROLS + META (PILL STYLE) -------- */}
<div className="fixed bottom-[12px] left-0 right-0 z-40 pointer-events-auto">
  <div className="md:max-w-6xl md:mx-auto px-4">
    <div className="flex items-center gap-4 text-[#001f40]">

      {/* PLAY / PAUSE — PILL */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        className="
          h-10 px-4
          flex items-center justify-center
          rounded-full
          border border-[#001f40]/30
          hover:bg-[#001f40]/5
          transition
        "
      >
        {isPaused ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#001f40]">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#001f40]">
            <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
          </svg>
        )}
      </button>

      {/* VOLUME — ICON + SLIDER */}
      <div
        className="
          h-10 px-4
          flex items-center gap-3
          rounded-full
          border border-[#001f40]/30
        "
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#001f40]">
          <path d="M5 9v6h4l5 4V5L9 9H5z" />
        </svg>

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
      </div>

     {/* TIME — COURSE-LEVEL */}
      <div
        className="
          h-10 px-4
          flex items-center
          rounded-full
          border border-[#001f40]/30
          text-sm
          tabular-nums
          opacity-80
          whitespace-nowrap
        "
      >
        {formatTime(elapsedCourseSeconds)} / {formatTime(courseTotals.totalSeconds)}
      </div>


      {/* MODULE META — FIXED WIDTH PILL */}
      <div
        className="
          h-10 w-[220px]
          px-4
          flex items-center
          rounded-full
          border border-[#001f40]/30
          bg-[#001f40]/5
          text-sm
          font-medium
          whitespace-nowrap
          overflow-hidden
          text-ellipsis
        "
        title={modules[currentModuleIndex]?.title}
      >
        {modules[currentModuleIndex]?.title ??
          `Module ${currentModuleIndex + 1}`}
      </div>

      {/* VOICE SELECT — PILL */}
<div className="relative">
  <select
  value={voice}
  onChange={(e) => setVoice(e.target.value)}
  className="
    h-10 pl-8 pr-10
    rounded-full
    bg-[#001f40]
    text-xs
    outline-none
    border border-[#001f40]
    hover:bg-[#002a5f]
    cursor-pointer
    appearance-none

    text-transparent
    [text-shadow:0_0_0_transparent]
    [-webkit-text-fill-color:transparent]
  "
>

    {VOICES.map((v) => (
     <option
  key={v.code}
  value={v.code}
  className="text-white bg-[#001f40]"
>
  {v.label}
</option>

    ))}
  </select>

  {/* visible label */}
  <div className="pointer-events-none absolute inset-0 flex items-center pl-4 text-white text-xs font-medium">
    | CC | {voiceLabel}
  </div>

  {/* caret */}
  <svg
    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 fill-white opacity-80"
    viewBox="0 0 24 24"
  >
    <path d="M7 10l5 5 5-5z" />
  </svg>
</div>
      </div>

    </div>
  </div>
</div>
  );
}

// safe numeric display used by FooterNav + Timeline
function safeTime(v: any) {
  const n = Number(v);
  return isFinite(n) ? n.toFixed(1) : "0.0";
}

function formatTime(seconds: number) {
  if (!isFinite(seconds)) return "0:00";

  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  return `${m}:${String(sec).padStart(2, "0")}`;
}


/* ============================================================
   SUBCOMPONENTS
============================================================ */

function SlideView({ currentImage }: { currentImage: string | null }) {
  const [loaded, setLoaded] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    setLoaded(false);
    setResolvedSrc(null);

    if (!currentImage) return;

    const img = new Image();
    img.onload = () => {
      setResolvedSrc(currentImage);
      setLoaded(true);
    };
    img.src = currentImage;
  }, [currentImage]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
      {/* SKELETON / PLACEHOLDER */}
      <div
        className={`
          absolute inset-0
          transition-opacity duration-300
          ${loaded ? "opacity-0" : "opacity-100"}
        `}
        style={{
          background:
            "linear-gradient(to bottom, #909090ff 0%, #ffffffff 45%, #ffffff 100%)",
        }}
      />

      {/* IMAGE — rendered ONLY after load */}
      {resolvedSrc && (
        <img
          src={resolvedSrc}
          draggable={false}
          decoding="async"
          className="
            absolute inset-0
            w-full h-full
            object-cover object-center
            transition-opacity duration-500
            opacity-100
          "
        />
      )}
    </div>
  );
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
  captions,
  slides,
  currentCaptionIndex,
  currentWordIndex
}: any) {

  function statusText() {
    const at = Number(audioTime ?? 0).toFixed(1);
    const ad = Number(audioDuration ?? 0).toFixed(1);

    return `Module ${currentModuleIndex + 1} → Lesson ${
      currentLessonIndex + 1
    } | Slide ${slideIndex + 1} of ${totalSlides} | ${at}s / ${ad}s`;
  }

  const currentSlide = slides?.[slideIndex] || null;

  return (
    <div className="fixed bottom-[40px] left-0 right-0 bg-white border-t shadow-inner h-[180px] z-30">
      <div className="h-full max-w-6xl mx-auto px-6 flex items-start justify-between relative pt-4 text-[#001f40]">

        {/* KARAOKE CAPTIONS */}
        <KaraokeCaption
          captions={captions}
          currentSlide={currentSlide}
          currentWordIndex={currentWordIndex}
        />

      </div>
    </div>
  );
}

const TERMINAL_SEGMENTS = [
  {
    id: "exam",
    label: "Final Exam",
    href: "/exam",
  },
  {
    id: "payment",
    label: "Pay & Submit to FLHSMV.gov",
    href: "/payment",
  },
];


/* -----------------------------------------------------------
   KARAOKE CAPTION RENDERER
----------------------------------------------------------- */
function KaraokeCaption({
  captions,
  currentSlide,
  currentWordIndex
}: any) {

  if (!currentSlide) return null;

  const fullText = (captions[currentSlide.id] || [])
    .map((c: any) => c.caption.trim())
    .join(" ")
    .replace(/\s+/g, " ");

  const words = tokenizeCaption(fullText);

  return (
    <div
      className="
        text-xl leading-[32px]
        whitespace-normal
        text-center
        text-[#001f40]
        w-full px-5 mx-auto
      "
      style={{
        minWidth: 0,          
        maxWidth: "100%",
        overflow: "visible",
        wordBreak: "normal",
        overflowWrap: "break-word",
        hyphens: "none"
      }}
    >
      {words.map((word: string, wi: number) => (
<span
  key={wi}
  style={{ display: "inline" }}
  className={wi === currentWordIndex ? "text-[#ca5608]" : "opacity-80"}
>
  {word + " "}
</span>
      ))}
    </div>
  );
}
