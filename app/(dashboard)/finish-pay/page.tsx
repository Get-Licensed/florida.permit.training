// app/(dashboard)/finish-pay/page.tsx

export default function FinishPayPage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Course & Exam Complete</h1>
      <p>
        You have successfully completed the Florida Permit Training course and
        passed the final exam.
      </p>

      <p>
        To submit your completion to the Florida DMV, a one-time administrative
        payment is required.
      </p>

      <a href="/payment" style={{ color: "blue", textDecoration: "underline" }}>
        Complete Payment
      </a>
    </div>
  );
}
