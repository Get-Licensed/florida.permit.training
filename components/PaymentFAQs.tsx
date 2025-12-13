"use client";

const FAQS = [
  {
    q: "Why is there an administrative payment?",
    a: "Florida requires a one-time administrative fee to electronically submit your course completion to the DMV."
  },
  {
    q: "What if I already completed the course?",
    a: "That’s fine. Once payment is completed, your existing course record will be submitted automatically."
  },
  {
    q: "Can I come back and pay later?",
    a: "Yes. Your progress is saved and you can return at any time to complete payment."
  },
  {
    q: "Will I receive confirmation?",
    a: "Yes. After payment, you’ll see a confirmation screen and your submission will be processed."
  }
];

export default function PaymentFAQs() {
  return (
    <div className="mt-16 px-6">
      <div className="max-w-6xl mx-auto">

        {/* OUTER CONTAINER */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8">

          <h2 className="text-xl font-bold text-[#001f40] mb-6">
            Frequently Asked Questions
          </h2>

          {/* TWO-COLUMN GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FAQS.map((faq, i) => (
                <div
                key={i}
                tabIndex={0}
                className="
                    bg-white
                    border border-gray-200
                    rounded-lg
                    p-5
                    shadow-sm
                    transition
                    duration-150
                    hover:shadow-md
                    hover:border-gray-300
                "
                >
                <h3 className="font-semibold text-[#001f40] mb-2">
                    {faq.q}
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed">
                    {faq.a}
                </p>
                </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
