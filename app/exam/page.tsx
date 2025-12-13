"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [courseComplete, setCourseComplete] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);

  /* -------------------- COURSE STATUS CHECK -------------------- */
  useEffect(() => {
    async function checkCourseStatus() {
      try {
        const res = await fetch("/api/course/status");
        const data = await res.json();

        setCourseComplete(Boolean(data.completed_at));

      } catch {
        setCourseComplete(false);
      } finally {
        setStatusLoaded(true);
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
        setError("Unable to load exam questions");
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
  }, []);

  /* -------------------- ANSWER SELECTION -------------------- */
  function selectAnswer(qid: number, option: string) {
    setAnswers((prev) => ({
      ...prev,
      [qid]: option,
    }));
  }

  /* -------------------- SUBMIT EXAM -------------------- */
  async function submitExam() {
    if (Object.keys(answers).length !== questions.length) {
      setError("Please answer all questions before submitting.");
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

      const text = await res.text();
      const result = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(result?.error || "Exam submission failed");
      }

      if (result?.passed) {
        router.replace("/my-permit");
      } else {
        router.replace(`/dashboard/exam/failed?score=${result?.score ?? 0}`);
      }
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* -------------------- LOADING -------------------- */
  if (loading || !statusLoaded) {
    return <div className="p-6 text-[#001f40]">Loading exam…</div>;
  }

  /* -------------------- RENDER -------------------- */
  return (
    <div className="relative max-w-4xl mx-auto p-6 space-y-8">

      {/* -------- LOCK OVERLAY -------- */}
      {!courseComplete && (
        <div className="absolute inset-0 z-40 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="max-w-md text-center p-6 bg-white rounded-xl shadow border border-gray-200">
            <h2 className="text-xl font-bold text-[#001f40] mb-3">
              Course Not Completed
            </h2>

            <p className="text-gray-700 mb-5">
              You must complete the entire Florida Permit Training course
              before taking the final exam.
            </p>

            <button
              onClick={() => router.push("/course")}
              className="
                w-full
                px-4
                py-3
                rounded-lg
                font-semibold
                bg-[#001f40]
                text-white
                hover:bg-[#00356e]
                transition
              "
            >
              Return to Course
            </button>
          </div>
        </div>
      )}

      {/* -------- PAGE CONTENT (BLURRED WHEN LOCKED) -------- */}
      <div className={courseComplete ? "" : "pointer-events-none blur-sm"}>

        <h1 className="text-2xl font-bold text-[#001f40] mb-2">
          Final Exam
        </h1>

        <div className="space-y-3 text-[#001f40] leading-6 mb-6">
          <p>
            This exam consists of <strong>40 multiple-choice questions</strong>.
            You must score <strong>80% or higher</strong> to pass.
          </p>

          <p>
            Passing the exam is required to complete the Florida Permit Training
            course and become eligible for submission to the Florida DMV.
          </p>

          <p>
            You may retake the exam as many times as needed until a passing
            score is achieved.
          </p>
        </div>

        {/* -------- QUESTIONS -------- */}
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="
              w-full
              p-5
              border border-gray-300
              rounded-lg
              bg-white
              shadow-sm
              mb-6
            "
          >
            <p className="font-medium mb-5 text-[#001f40] text-lg leading-7">
              {idx + 1}. {q.question}
            </p>

            <div className="space-y-2">
              {(["A", "B", "C"] as const).map((opt) => {
                const label =
                  opt === "A"
                    ? q.option_a
                    : opt === "B"
                    ? q.option_b
                    : q.option_c;

                return (
                  <label
                    key={opt}
                    className="
                      flex items-start gap-3
                      p-3
                      border border-gray-200
                      rounded-lg
                      cursor-pointer
                      text-[#001f40]
                      hover:bg-orange-50
                    "
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === opt}
                      onChange={() => selectAnswer(q.id, opt)}
                      className="accent-[#ca5608] w-4 h-4 mt-1"
                    />

                    <span className="leading-6">
                      <strong>{opt}.</strong> {label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {error && (
          <div className="text-red-600 font-medium">
            {error}
          </div>
        )}

        <button
          onClick={submitExam}
          disabled={submitting}
          className="
            w-full
            bg-[#001f40]
            text-white
            px-6
            py-3
            rounded-lg
            shadow-sm
            font-semibold
            cursor-pointer
            disabled:opacity-50
          "
        >
          {submitting ? "Submitting…" : "Submit Exam"}
        </button>
      </div>
    </div>
  );
}
