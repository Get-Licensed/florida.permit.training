"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* page title */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#001f40] flex items-center gap-2">
          <HelpCircle size={26} className="text-[#001f40]" />
          Support Center
        </h1>
      </div>

      {/* two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* FAQs */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">

          <h2 className="text-lg font-bold text-[#001f40] mb-4">Frequently Asked Questions</h2>

          <FAQItem
            question="How long does course approval take?"
            answer="Typically within 24 hours of registration and verification."
          />

          <FAQItem
            question="Can I pause and resume lessons?"
            answer="Yes. Your progress is saved automatically as you complete slides."
          />

          <FAQItem
            question="Where can I download my certificate?"
            answer="After your course completion, certificates appear in your dashboard."
          />

          <FAQItem
            question="Who do I contact for billing problems?"
            answer="Submit a support ticket using the form on the right."
          />
        </div>

        {/* support ticket form */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
          <h2 className="text-lg font-bold text-[#001f40] mb-4">Submit a Support Ticket</h2>

          <form className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Full Name"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />

            <input
              type="email"
              placeholder="Email Address"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />

            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option>General Question</option>
              <option>Billing</option>
              <option>Technical Issue</option>
              <option>Course Completion</option>
            </select>

            <textarea
              placeholder="Describe the issue..."
              rows={6}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />

            <button
              type="submit"
              className="bg-[#ca5608] text-white py-2 rounded-md text-sm font-semibold hover:bg-[#b24b06] transition"
            >
              Submit Ticket
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}


/* accordion item */
function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center text-left"
      >
        <span className="text-sm font-semibold text-[#001f40]">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#001f40] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <p className="text-sm text-gray-600 mt-2">
          {answer}
        </p>
      )}
    </div>
  );
}
