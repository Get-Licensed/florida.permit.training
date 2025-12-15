"use client";

import { useRouter } from "next/navigation";
import TimelineFooterShell from "./TimelineFooterShell";

export default function PermitFooter({
  courseComplete,
  examPassed,
  paid,
}: {
  courseComplete?: boolean;
  examPassed?: boolean;
  paid?: boolean;
}) {
  const router = useRouter();

  /* -----------------------------------------
     EMPTY FOOTER MODE
     ----------------------------------------- */
  if (
    courseComplete === undefined &&
    examPassed === undefined &&
    paid === undefined
  ) {
    return (
      <TimelineFooterShell>
        {/* intentionally empty */}
        <div />
      </TimelineFooterShell>
    );
  }

  /* -----------------------------------------
     NORMAL FOOTER MODE
     ----------------------------------------- */
  return (
    <TimelineFooterShell>
      <div className="grid grid-cols-3 gap-6 w-full items-center">
        {/* COURSE */}
        <FooterBlock
          done={!!courseComplete}
          doneLabel="Back to Course"
          todoLabel="Finish Course"
          onClick={() => router.push("/course")}
        />

        {/* EXAM */}
        <FooterBlock
          done={!!examPassed}
          doneLabel="Exam Passed"
          todoLabel="Take Exam"
          disabled={!courseComplete}
          onClick={() => router.push("/exam")}
        />

        {/* PAYMENT */}
        <FooterBlock
          done={!!paid}
          doneLabel="Payment Complete"
          todoLabel="Payment Required"
          accent
          onClick={() => router.push("/payment")}
        />
      </div>
    </TimelineFooterShell>
  );
}

/* ---------- Reusable block ---------- */

function FooterBlock({
  done,
  doneLabel,
  todoLabel,
  onClick,
  disabled,
  accent,
}: {
  done: boolean;
  doneLabel: string;
  todoLabel: string;
  onClick?: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  if (done) {
    return (
      <div className="flex justify-center">
        <div
          className="
            w-full max-w-[220px] h-12
            flex items-center justify-center gap-2
            rounded-lg font-semibold
            bg-green-100 text-green-800
            border border-green-300
          "
        >
          <Check />
          {doneLabel}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <button
        disabled={disabled}
        onClick={onClick}
        className={`
          w-full max-w-[220px] h-12
          rounded-lg font-semibold transition
          ${
            disabled
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : accent
              ? "bg-[#ca5608] text-white hover:bg-[#b24b06]"
              : "bg-[#001f40] text-white hover:bg-[#00356e]"
          }
        `}
      >
        {todoLabel}
      </button>
    </div>
  );
}

function Check() {
  return (
    <svg
      className="h-5 w-5 text-green-700"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
