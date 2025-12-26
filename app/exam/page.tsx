"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ExamShell from "./ExamShell";
import { requireAuth } from "@/utils/requireAuth";
import { usePermitStatus } from "@/utils/usePermitStatus";
import { ExamProgressContext } from "./ExamProgressContext";
import { supabase } from "@/utils/supabaseClient";
import CourseTimeline from "@/components/CourseTimeline";
import Loader from "@/components/loader";


type Question = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
};

export default function ExamPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);

  const [authChecked, setAuthChecked] = useState(false);

  const { loading: statusLoading, courseComplete, examPassed, paid } =
    usePermitStatus();

  const [modules, setModules] = useState<any[]>([]);
  const [maxCompletedIndex, setMaxCompletedIndex] = useState(0);

  useEffect(() => {
    async function run() {
      const user = await requireAuth(router);
      if (user) setAuthChecked(true);
    }
    run();
  }, [router]);

  useEffect(() => {
    async function loadProgress() {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data } = await supabase
        .from("course_progress_modules")
        .select("module_index")
        .eq("user_id", user.data.user.id)
        .eq("course_id", "FL_PERMIT_TRAINING")
        .eq("completed", true);

      if (!data?.length) {
        setMaxCompletedIndex(0);
        return;
      }

      const max = Math.max(...data.map((r) => r.module_index ?? 0));
      setMaxCompletedIndex(max);
    }

    loadProgress();
  }, []);

  useEffect(() => {
    supabase
      .from("modules")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setModules(data);
      });
  }, []);

useEffect(() => {
  async function loadQuestions() {
    try {
      const res = await fetch("/api/exam/questions", {
        credentials: "include", // REQUIRED so Supabase SSR sees auth cookie
      });

      if (!res.ok) {
        setError("Unable to load exam questions.");
        setQuestions([]);
        return;
      }

      const json = await res.json();

      if (!json?.questions || !Array.isArray(json.questions)) {
        setError("Invalid exam questions response.");
        setQuestions([]);
        return;
      }

      setQuestions(json.questions);
    } catch {
      setError("Unable to load exam questions.");
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }

  loadQuestions();
}, []);


  const isBooting =
    !authChecked || statusLoading || loadingQuestions;

  useEffect(() => {
    if (!statusLoading && examPassed) router.replace("/my-permit");
  }, [statusLoading, examPassed, router]);

  const total = questions.length;

  const progressPercent =
    started && total > 0
      ? Math.round((Object.keys(answers).length / total) * 100)
      : 0;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      handleEnterAction();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [started, submitting, index, total, answers, questions]);

  function selectAnswer(option: string) {
    setAnswers((p) => ({
      ...p,
      [questions[index].id]: option,
    }));
  }

  async function submitExam() {
    if (Object.keys(answers).length !== total) {
      setError("Please answer all questions.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error);

      router.replace(
        result.passed
          ? "/my-permit"
          : `/exam/failed?score=${result.score ?? 0}`
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEnterAction() {
    if (!started || !courseComplete || submitting) return;
    const current = questions[index];
    if (!current) return;
    const answered = Boolean(answers[current.id]);
    if (index === total - 1 && answered) {
      submitExam();
      return;
    }
    if (answered) setIndex((i) => i + 1);
  }

  function goToModule(i: number) {
    if (i <= maxCompletedIndex) {
      router.push(`/course?module=${i}`);
    }
  }

  return (
    <ExamProgressContext.Provider value={progressPercent}>
      <ExamShell>
        {isBooting ? (
          <Loader />

        ) : (
          <main className="h-full flex items-center justify-center px-6">
            <div className="w-full max-w-3xl">
              {!started ? (
                <div className="text-center space-y-6">
                  <h1 className="text-3xl font-bold text-[#001f40]">
                    Final Exam
                  </h1>

                  <div className="text-[#001f40] leading-7">
                    <p>
                      This exam consists of{" "}
                      <strong>40 multiple-choice questions</strong>.
                    </p>
                    <p>
                      You must score{" "}
                      <strong>80% or higher</strong> to pass.
                    </p>
                    <p>
                      You may retake the exam as many times as needed.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-center">
                    {examPassed ? (
                      <div className="w-[50%] p-3 bg-green-100 text-green-800 rounded-lg text-center font-semibold">
                        Exam Passed
                      </div>
                    ) : (
                      <button
                        disabled={!courseComplete}
                        onClick={() => setStarted(true)}
                        className={`w-[50%] h-12 rounded-xl font-semibold transition ${
                          courseComplete
                            ? "bg-[#001f40] text-white hover:bg-[#00356e]"
                            : "bg-gray-300 text-gray-600 cursor-not-allowed"
                        }`}
                      >
                        {courseComplete
                          ? "Start Exam"
                          : "Exam Available After Completing Course"}
                      </button>
                    )}
                  </div>

                  {!courseComplete && !examPassed && (
                    <div className="mt-3 text-center">
                      <button
                        onClick={() => router.push("/course")}
                        className="
                          text-md
                          text-[#001f40]
                          underline
                          underline-offset-3
                          hover:text-[#00356e]
                          transition
                        "
                      >
                        Return to course
                      </button>
                    </div>
                    )}

                </div>
              ) : (
                questions[index] && (
                  <div className="space-y-8">
                    <div className="text-sm text-[#001f40] text-center opacity-70">
                      Question {index + 1} of {total}
                    </div>

                    <h2 className="text-xl font-semibold text-[#001f40] leading-7">
                      {questions[index].question}
                    </h2>

                    <div className="space-y-3">
                      {(["A", "B", "C"] as const).map((opt) => {
                        const label =
                          opt === "A"
                            ? questions[index].option_a
                            : opt === "B"
                            ? questions[index].option_b
                            : questions[index].option_c;

                        const selected =
                          answers[questions[index].id] === opt;

                        return (
                          <button
                            key={opt}
                            onClick={() => selectAnswer(opt)}
                            className={`w-full text-left p-4 rounded-lg border transition text-[#001f40] ${
                              selected
                                ? "border-[#ca5608] bg-orange-50"
                                : "border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <strong>{opt}.</strong> {label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-between pt-4">
                      <button
                        disabled={index === 0}
                        onClick={() => setIndex((i) => i - 1)}
                        className="px-6 py-2 rounded-xl border border-[#001f40] text-[#001f40] bg-white font-semibold hover:bg-[#001f40]/5 disabled:opacity-40"
                      >
                        Previous
                      </button>

                      {index < total - 1 ? (
                        <button
                          disabled={!answers[questions[index].id]}
                          onClick={() => setIndex((i) => i + 1)}
                          className="px-6 py-2 rounded-xl bg-[#001f40] text-white disabled:opacity-40"
                        >
                          Next
                        </button>
                      ) : (
                        <button
                          disabled={submitting}
                          onClick={submitExam}
                          className="px-6 py-2 rounded-lg bg-[#ca5608] text-white"
                        >
                          {submitting ? "Submitting…" : "Submit Exam"}
                        </button>
                      )}
                    </div>

                    {error && (
                      <div className="text-red-600 font-medium text-center">
                        {error}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </main>
        )}
      </ExamShell>
    </ExamProgressContext.Provider>
  );
}
