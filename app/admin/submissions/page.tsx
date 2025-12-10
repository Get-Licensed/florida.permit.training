"use client";

import { useEffect, useState } from "react";

export default function AdminSubmissionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/admin/submissions");
      const json = await res.json();
      if (Array.isArray(json)) setRows(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;

  return (
    <div style={{ padding: "40px" }}>
      <h1 style={{ marginBottom: "20px" }}>DMV Submissions</h1>

      <table
        style={{
          width: "100%",
          background: "#fff",
          borderCollapse: "collapse",
          border: "1px solid #ddd",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#f3f3f3",
              textAlign: "left",
              borderBottom: "1px solid #ddd",
            }}
          >
            <th style={th}>Student</th>
            <th style={th}>Email</th>
            <th style={th}>Exam Passed</th>
            <th style={th}>Completed</th>
            <th style={th}>Paid</th>
            <th style={th}>DMV Submitted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id} style={tr}>
              <td style={td}>{r.profile?.full_name || r.user_id}</td>
              <td style={td}>{r.profile?.email || "-"}</td>
              <td style={td}>{r.exam_passed ? "Yes" : "No"}</td>
              <td style={td}>{fmt(r.completed_at)}</td>
              <td style={td}>{fmt(r.paid_at)}</td>
              <td style={td}>{fmt(r.dmv_submitted_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: "12px", fontWeight: 600 };
const td = { padding: "12px", borderBottom: "1px solid #eee" };
const tr = { background: "#fff" };

function fmt(v?: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleDateString();
}
