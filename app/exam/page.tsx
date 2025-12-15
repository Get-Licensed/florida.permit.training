"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ExamShell from "./ExamShell";
import { ExamProgressContext } from "./ExamProgressContext";
// import SteeringWheelLoader from "@/components/SteeringWheelLoader"; // ← use if you have it

type Question = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
};

export default function ExamPage() {
  const router = useRouter();

  /* -------------------- STATE -------------------- */
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  
  const [courseComplete, setCourseComplete] = useState<boolean | null>(null);
  const [examPassed, setExamPassed] = useState<boolean | null>(null);


  /* -------------------- COURSE STATUS -------------------- */
  useEffect(() => {
    async function checkCourseStatus() {
      try {
        const res = await fetch("/api/course/status");
        const data = await res.json();

        setCourseComplete(Boolean(data.completed_at));
        setExamPassed(Boolean(data.exam_passed));
      } catch {
        setCourseComplete(false);
        setExamPassed(false);
      }
    }

    checkCourseStatus();
  }, []);

  /* -------------------- LOAD QUESTIONS -------------------- */
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch("/api/exam/questions");
        if (!res.ok) throw new Error();
        const json = await res.json();
        setQuestions(json.questions || []);
      } catch {
        setError("Unable to load exam questions.");
      } finally {
        setLoadingQuestions(false);
      }
    }
    loadQuestions();
  }, []);

  /* -------------------- DERIVED -------------------- */
   const isBooting =
     courseComplete === null ||
     examPassed === null ||
     loadingQuestions;

  const total = questions.length;

  const progressPercent =
    started && total > 0
      ? Math.round(((index + 1) / total) * 100)
      : 0;

  /* -------------------- ACTIONS -------------------- */
  function selectAnswer(option: string) {
    setAnswers((prev) => ({
      ...prev,
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
      setError(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* -------------------- RENDER -------------------- */
  return (
    <ExamProgressContext.Provider value={progressPercent}>
      <ExamShell>
        {isBooting ? (
          /* ===== BOOT / LOADING (NO FLASH) ===== */
          <div className="h-full flex items-center justify-center bg-white">
            {/* <SteeringWheelLoader /> */}
            <div className="text-[#001f40] font-medium">
              Loading exam…
            </div>
          </div>
        ) : (
          /* ===== EXAM ===== */
          <main className="h-full flex items-center justify-center px-6">
            <div className="w-full max-w-3xl">

              {!started ? (
                /* ===== INTRO ===== */
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
                        ✅ Exam Passed
                      </div>
                    ) : (
                      <button
                        disabled={!courseComplete}
                        onClick={() => courseComplete && setStarted(true)}
                        className={`
                          w-[50%] h-12 rounded-lg font-semibold transition
                          ${
                            courseComplete
                              ? "bg-[#001f40] text-white hover:bg-[#00356e]"
                              : "bg-gray-300 text-gray-600 cursor-not-allowed"
                          }
                        `}
                      >
                        {courseComplete
                          ? "Start Exam"
                          : "Exam Available After Completing Course"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* ===== QUESTION VIEW ===== */
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
                            className={`
                              w-full text-left p-4 rounded-lg border transition
                              text-[#001f40]
                              ${
                                selected
                                  ? "border-[#ca5608] bg-orange-50"
                                  : "border-gray-300 hover:bg-gray-50"
                              }
                            `}
                          >
                            <strong>{opt}.</strong> {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* ===== NAV ===== */}
                    <div className="flex justify-between pt-4">
                      <button
                        disabled={index === 0}
                        onClick={() => setIndex((i) => i - 1)}
                        className="
                          px-6 py-2 rounded-lg
                          border border-[#001f40]
                          text-[#001f40]
                          bg-white
                          font-semibold
                          hover:bg-[#001f40]/5
                          disabled:opacity-40
                        "
                      >
                        Previous
                      </button>

                      {index < total - 1 ? (
                        <button
                          disabled={!answers[questions[index].id]}
                          onClick={() => setIndex((i) => i + 1)}
                          className="px-6 py-2 rounded-lg bg-[#001f40] text-white disabled:opacity-40"
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
